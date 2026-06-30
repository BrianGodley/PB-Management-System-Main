// supabase/functions/extension-subscribe/index.ts
//
// Subscribes the CURRENT tenant to a paid platform EXTENSION (e.g. 'formulas')
// on SoftCake's own Helcim account, and toggles public.tenant_extensions so the
// app unlocks it. Modeled on helcim-subscribe.
//
// Body (owner/admin only; runs with caller's JWT):
//   { action:'init', extensionId }
//       -> ensure Helcim customer, open a HelcimPay session to vault a card,
//          returns { checkoutToken, customerCode, amount }.
//   { action:'subscribe', extensionId, customerCode, card?:{brand,last4,exp} }
//       -> create the recurring subscription on ext_plans.helcim_plan_id, then
//          set tenant_extensions(extensionId)=active (+ current_period_end).
//   { action:'cancel', extensionId }
//       -> mark tenant_extensions(extensionId)=canceled (Helcim cancel optional).
//
// PREREQUISITES:
//   * HELCIM_API_TOKEN secret (SoftCake account).
//   * Create a Helcim Payment Plan for the add-on and store its id in
//     public.ext_plans.helcim_plan_id (and a price in price_monthly).
import { createClient } from 'npm:@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, 'content-type': 'application/json' } })

const HELCIM = 'https://api.helcim.com/v2'
const hHeaders = (token: string) => ({ accept: 'application/json', 'api-token': token, 'content-type': 'application/json' })

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405)

  const apiToken = Deno.env.get('HELCIM_API_TOKEN')
  if (!apiToken) return json({ error: 'Helcim is not configured (HELCIM_API_TOKEN missing).' }, 500)

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
    return json({ error: 'Only an owner/admin can manage extensions.' }, 403)

  const body = await req.json().catch(() => ({}))
  const extensionId = String(body.extensionId || '')
  const action = body.action || 'init'
  if (!extensionId) return json({ error: 'extensionId required' }, 400)

  const { data: extPlan } = await admin
    .from('ext_plans').select('extension_id, name, price_monthly, helcim_plan_id, active').eq('extension_id', extensionId).maybeSingle()
  if (!extPlan || !extPlan.active) return json({ error: `Extension "${extensionId}" is not available for purchase.` }, 404)

  const { data: tenant } = await admin
    .from('tenants').select('id, name, helcim_customer_id').eq('id', tenantId).maybeSingle()
  if (!tenant) return json({ error: 'Tenant not found' }, 404)

  const amount = Number((Number(extPlan.price_monthly) || 0).toFixed(2))

  // ── CANCEL ────────────────────────────────────────────────────────────────
  if (action === 'cancel') {
    await admin.from('tenant_extensions').update({ status: 'canceled' })
      .eq('tenant_id', tenantId).eq('extension_id', extensionId)
    return json({ ok: true, status: 'canceled' })
  }

  // Ensure a Helcim customer exists for this tenant.
  async function ensureCustomer(): Promise<string | null> {
    if (tenant.helcim_customer_id) return tenant.helcim_customer_id
    const res = await fetch(`${HELCIM}/customers`, {
      method: 'POST', headers: hHeaders(apiToken),
      body: JSON.stringify({ contactName: tenant.name || 'SoftCake Customer', email: profile?.email || undefined }),
    })
    const d = await res.json().catch(() => ({}))
    const code = d?.customerCode || d?.customer?.customerCode || null
    if (code) await admin.from('tenants').update({ helcim_customer_id: code }).eq('id', tenantId)
    return code
  }

  // ── INIT: open a HelcimPay session to vault a card ─────────────────────────
  if (action === 'init') {
    const customerCode = await ensureCustomer()
    const initRes = await fetch(`${HELCIM}/helcim-pay/initialize`, {
      method: 'POST', headers: hHeaders(apiToken),
      body: JSON.stringify({
        paymentType: 'verify',
        amount,
        currency: 'USD',
        customerCode: customerCode || undefined,
      }),
    })
    const initData = await initRes.json().catch(() => ({}))
    if (!initData?.checkoutToken) return json({ error: `Helcim init failed: ${JSON.stringify(initData)}` }, 502)
    return json({ checkoutToken: initData.checkoutToken, customerCode, amount })
  }

  // ── SUBSCRIBE: create the recurring subscription + unlock the extension ─────
  if (action === 'subscribe') {
    if (!extPlan.helcim_plan_id) {
      return json({
        error: `No Helcim payment plan is configured for "${extPlan.name}". ` +
          `Create a Payment Plan in Helcim and store its id in ext_plans.helcim_plan_id, then retry.`,
      }, 400)
    }
    const customerCode = body.customerCode || (await ensureCustomer())
    const subRes = await fetch(`${HELCIM}/subscriptions`, {
      method: 'POST', headers: hHeaders(apiToken),
      body: JSON.stringify({
        subscriptions: [
          {
            customerCode,
            paymentPlanId: isNaN(Number(extPlan.helcim_plan_id)) ? undefined : Number(extPlan.helcim_plan_id),
            paymentPlanCode: isNaN(Number(extPlan.helcim_plan_id)) ? extPlan.helcim_plan_id : undefined,
            recurringAmount: amount,
            reference: `${tenantId}:${extensionId}`,
          },
        ],
      }),
    })
    const subData = await subRes.json().catch(() => ({}))
    if (!subRes.ok) return json({ error: `Helcim subscription failed: ${JSON.stringify(subData)}` }, 502)

    // Unlock the extension. One month forward as the current period end.
    const periodEnd = new Date()
    periodEnd.setMonth(periodEnd.getMonth() + 1)
    await admin.from('tenant_extensions').upsert(
      {
        tenant_id: tenantId,
        extension_id: extensionId,
        status: 'active',
        current_period_end: periodEnd.toISOString(),
      },
      { onConflict: 'tenant_id,extension_id' }
    )
    return json({ ok: true, status: 'active' })
  }

  return json({ error: `Unknown action "${action}"` }, 400)
})
