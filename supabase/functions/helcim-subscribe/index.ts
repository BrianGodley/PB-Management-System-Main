// supabase/functions/helcim-subscribe/index.ts
//
// Converts the CURRENT tenant from a beta/trial into a paying SoftCake
// subscription, on SoftCake's OWN Helcim account (HELCIM_API_TOKEN) — this is
// SoftCake billing the tenant, not the tenant billing its customers.
//
// Two actions (admin/owner only — runs with the caller's JWT):
//   { action: 'init' }
//       → ensures a Helcim customer for the tenant, opens a HelcimPay "verify"
//         session to vault a real card, returns { checkoutToken, customerCode }.
//   { action: 'subscribe', customerCode, card?: {brand,last4,exp} }
//       → creates the recurring subscription on the plan's helcim_plan_id and
//         writes helcim_subscription_id + billing_status='active' + card onto the
//         tenant. The helcim-subscription-webhook later confirms/keeps it in sync.
//
// PREREQUISITES:
//   • HELCIM_API_TOKEN secret (SoftCake account).
//   • Each plan you sell has a Helcim Payment Plan; store its id/code in
//     public.plans.helcim_plan_id. (Add-on packages can reuse one plan or get
//     their own — extend below if you bill packages as separate subscriptions.)
//
// Verify-JWT may stay ON for this function (it's called from the authenticated
// app), so no config.toml change is needed.

import { createClient } from 'npm:@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, 'content-type': 'application/json' } })

const HELCIM = 'https://api.helcim.com/v2'
const hHeaders = (token: string) => ({
  accept: 'application/json',
  'api-token': token,
  'content-type': 'application/json',
})

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405)

  const apiToken = Deno.env.get('HELCIM_API_TOKEN')
  if (!apiToken) return json({ error: 'Helcim is not configured (HELCIM_API_TOKEN missing).' }, 500)

  // Identify the caller + tenant from their JWT.
  const authHeader = req.headers.get('Authorization') || ''
  const asUser = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  })
  const { data: u } = await asUser.auth.getUser()
  const uid = u?.user?.id
  if (!uid) return json({ error: 'Not authenticated' }, 401)

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false },
  })

  const { data: profile } = await admin
    .from('profiles').select('tenant_id, role, email').eq('id', uid).maybeSingle()
  const tenantId = profile?.tenant_id
  if (!tenantId) return json({ error: 'No tenant for this user' }, 400)
  if (!['owner', 'admin', 'super_admin'].includes(String(profile?.role)))
    return json({ error: 'Only an owner/admin can activate billing.' }, 403)

  const { data: tenant } = await admin
    .from('tenants')
    .select('id, name, plan_id, helcim_customer_id, helcim_subscription_id')
    .eq('id', tenantId).maybeSingle()
  if (!tenant) return json({ error: 'Tenant not found' }, 404)
  if (tenant.helcim_subscription_id) return json({ error: 'Billing is already active for this account.' }, 400)

  const { data: plan } = await admin
    .from('plans').select('id, name, price_monthly, helcim_plan_id').eq('id', tenant.plan_id).maybeSingle()

  // Recurring amount = plan + active package prices.
  const { data: tps } = await admin
    .from('tenant_packages').select('package_id').eq('tenant_id', tenantId)
  const pkgIds = (tps || []).map(r => r.package_id)
  let pkgTotal = 0
  if (pkgIds.length) {
    const { data: pks } = await admin.from('packages').select('price_monthly').in('id', pkgIds)
    pkgTotal = (pks || []).reduce((s, p) => s + (Number(p.price_monthly) || 0), 0)
  }
  const recurringAmount = Number(((Number(plan?.price_monthly) || 0) + pkgTotal).toFixed(2))

  const body = await req.json().catch(() => ({} as Record<string, unknown>))
  const action = body.action || 'init'

  // Ensure a Helcim customer exists for this tenant.
  async function ensureCustomer(): Promise<string | null> {
    if (tenant.helcim_customer_id) return tenant.helcim_customer_id
    const res = await fetch(`${HELCIM}/customers`, {
      method: 'POST',
      headers: hHeaders(apiToken),
      body: JSON.stringify({ contactName: tenant.name || 'SoftCake Customer', email: profile?.email || undefined }),
    })
    const data = await res.json().catch(() => null)
    const code = data?.customerCode || data?.customer?.customerCode || null
    if (code) await admin.from('tenants').update({ helcim_customer_id: code }).eq('id', tenantId)
    return code
  }

  // ── INIT: open a HelcimPay verify session to vault a card ───────────────────
  if (action === 'init') {
    const customerCode = await ensureCustomer()
    if (!customerCode) return json({ error: 'Could not create a Helcim customer.' }, 502)

    const initRes = await fetch(`${HELCIM}/helcim-pay/initialize`, {
      method: 'POST',
      headers: hHeaders(apiToken),
      body: JSON.stringify({
        paymentType: 'verify', // vault the card without charging now
        currency: 'USD',
        paymentMethod: 'cc',
        customerCode,
      }),
    })
    const initData = await initRes.json().catch(() => null)
    if (!initRes.ok || !initData?.checkoutToken) {
      const detail = initData?.errors || initData?.message || `HTTP ${initRes.status}`
      return json({ error: `Helcim initialize failed: ${JSON.stringify(detail)}` }, 502)
    }
    return json({ checkoutToken: initData.checkoutToken, customerCode, amount: recurringAmount })
  }

  // ── SUBSCRIBE: create the recurring subscription, mark tenant paying ────────
  if (action === 'subscribe') {
    if (!plan?.helcim_plan_id) {
      return json({
        error:
          `No Helcim payment plan is configured for "${plan?.name || tenant.plan_id}". ` +
          `Create a Payment Plan in Helcim and store its id in plans.helcim_plan_id, then retry.`,
      }, 400)
    }
    const customerCode = body.customerCode || (await ensureCustomer())
    if (!customerCode) return json({ error: 'Missing Helcim customer.' }, 400)

    // Create the subscription. Field names follow Helcim's Recurring API; confirm
    // against your dashboard. We tag the tenant id as the reference so the
    // webhook can always map events back.
    const subRes = await fetch(`${HELCIM}/subscriptions`, {
      method: 'POST',
      headers: hHeaders(apiToken),
      body: JSON.stringify({
        subscriptions: [
          {
            customerCode,
            paymentPlanId: isNaN(Number(plan.helcim_plan_id)) ? undefined : Number(plan.helcim_plan_id),
            paymentPlanCode: isNaN(Number(plan.helcim_plan_id)) ? plan.helcim_plan_id : undefined,
            recurringAmount,
            dateActivated: new Date().toISOString().slice(0, 10),
            reference: tenantId,
          },
        ],
      }),
    })
    const subData = await subRes.json().catch(() => null)
    if (!subRes.ok) {
      const detail = subData?.errors || subData?.message || `HTTP ${subRes.status}`
      return json({ error: `Helcim subscription failed: ${JSON.stringify(detail)}` }, 502)
    }
    // Parse the new subscription id tolerantly.
    const row = Array.isArray(subData) ? subData[0] : subData?.data?.[0] || subData?.subscriptions?.[0] || subData
    const subscriptionId = row?.id || row?.subscriptionId || row?.subscription?.id || null

    const card = (body.card || {}) as Record<string, string>
    const update: Record<string, unknown> = {
      helcim_customer_id: customerCode,
      helcim_subscription_id: subscriptionId ? String(subscriptionId) : 'pending',
      billing_status: 'active',
      status: 'active',
      current_period_end: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString(),
      updated_at: new Date().toISOString(),
    }
    if (card.brand) update.card_brand = card.brand
    if (card.last4) update.card_last4 = String(card.last4).slice(-4)
    if (card.exp) update.card_exp = card.exp

    const { error: upErr } = await admin.from('tenants').update(update).eq('id', tenantId)
    if (upErr) return json({ error: upErr.message }, 500)

    // Log the first charge in the billing history (best-effort).
    await admin.from('billing_payments').insert({
      tenant_id: tenantId,
      description: pkgTotal > 0 ? `${plan?.name || 'Subscription'} + add-ons` : (plan?.name || 'Subscription'),
      amount: recurringAmount,
      method: 'card',
      card_brand: card.brand || null,
      card_last4: card.last4 ? String(card.last4).slice(-4) : null,
      status: 'paid',
      helcim_transaction_id: subscriptionId ? String(subscriptionId) : null,
    }).then(() => {}, () => {})

    return json({ ok: true, subscription_id: subscriptionId, recurringAmount })
  }

  return json({ error: 'Unknown action' }, 400)
})
