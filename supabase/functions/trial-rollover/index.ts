// supabase/functions/trial-rollover/index.ts
//
// Scheduled job: convert ended free trials into paid subscriptions.
// Run it daily (Supabase Cron / pg_cron + pg_net, or any external scheduler)
// with the header  x-cron-secret: <CRON_SECRET>.
//
// For each tenant whose trial has ended (status='trialing', trial_ends_at < now,
// not canceled):
//   • If a card is vaulted (helcim_customer_id) AND the plan has a Helcim payment
//     plan (plans.helcim_plan_id): create the recurring subscription → mark the
//     tenant active and charge begins.
//   • Otherwise: mark billing_status='past_due' (trial lapsed, no usable card) —
//     we DON'T delete anything; Admin → Subscription will prompt them to add a
//     card. Data is retained.
//
// NOTE: unattended charging requires a real vaulted card from signup (the
// HelcimPay "verify" step in helcim-subscribe). Until signup vaults a live card,
// most trials will fall to 'past_due' here rather than charging — that's correct
// and safe, not a bug.
//
// Deploy: supabase functions deploy trial-rollover --no-verify-jwt
// SECRETS: CRON_SECRET, ANTHROPIC unused; HELCIM_API_TOKEN, SUPABASE_* (auto).

import { createClient } from 'npm:@supabase/supabase-js@2'

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*' }
const json = (s: number, b: unknown) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, 'content-type': 'application/json' } })

const HELCIM = 'https://api.helcim.com/v2'

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json(405, { error: 'POST only' })

  // Shared-secret gate so only the scheduler can trigger billing.
  const expected = Deno.env.get('CRON_SECRET') || ''
  if (!expected || req.headers.get('x-cron-secret') !== expected) {
    return json(401, { error: 'unauthorized' })
  }

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } }
  )
  const apiToken = Deno.env.get('HELCIM_API_TOKEN') || ''

  // Trials that have ended and aren't already converted/canceled.
  const { data: due, error } = await admin
    .from('tenants')
    .select('id, name, plan_id, helcim_customer_id, helcim_subscription_id')
    .eq('status', 'trialing')
    .lt('trial_ends_at', new Date().toISOString())
  if (error) return json(500, { error: error.message })

  const result = { converted: 0, past_due: 0, errors: [] as string[] }

  for (const tn of due || []) {
    try {
      if (tn.helcim_subscription_id) {
        // Already has a live sub (e.g. webhook beat us here) → just mark active.
        await admin.from('tenants').update({ status: 'active', billing_status: 'active' }).eq('id', tn.id)
        result.converted++
        continue
      }

      const { data: plan } = await admin
        .from('plans').select('helcim_plan_id, price_monthly').eq('id', tn.plan_id).maybeSingle()

      const canCharge = apiToken && tn.helcim_customer_id && plan?.helcim_plan_id
      if (!canCharge) {
        await admin.from('tenants').update({ billing_status: 'past_due' }).eq('id', tn.id)
        result.past_due++
        continue
      }

      // Add-on total for recurringAmount.
      const { data: tps } = await admin.from('tenant_packages').select('package_id').eq('tenant_id', tn.id)
      let pkgTotal = 0
      if (tps?.length) {
        const { data: pks } = await admin.from('packages').select('price_monthly').in('id', tps.map(r => r.package_id))
        pkgTotal = (pks || []).reduce((s, p) => s + (Number(p.price_monthly) || 0), 0)
      }
      const recurringAmount = Number(((Number(plan!.price_monthly) || 0) + pkgTotal).toFixed(2))

      const subRes = await fetch(`${HELCIM}/subscriptions`, {
        method: 'POST',
        headers: { accept: 'application/json', 'api-token': apiToken, 'content-type': 'application/json' },
        body: JSON.stringify({
          subscriptions: [
            {
              customerCode: tn.helcim_customer_id,
              paymentPlanId: isNaN(Number(plan!.helcim_plan_id)) ? undefined : Number(plan!.helcim_plan_id),
              paymentPlanCode: isNaN(Number(plan!.helcim_plan_id)) ? plan!.helcim_plan_id : undefined,
              recurringAmount,
              dateActivated: new Date().toISOString().slice(0, 10),
              reference: tn.id,
            },
          ],
        }),
      })
      const subData = await subRes.json().catch(() => null)
      if (!subRes.ok) {
        await admin.from('tenants').update({ billing_status: 'past_due' }).eq('id', tn.id)
        result.past_due++
        result.errors.push(`${tn.name}: helcim ${subRes.status}`)
        continue
      }
      const row = Array.isArray(subData) ? subData[0] : subData?.data?.[0] || subData
      const subscriptionId = row?.id || row?.subscriptionId || 'pending'
      await admin.from('tenants').update({
        helcim_subscription_id: String(subscriptionId),
        status: 'active',
        billing_status: 'active',
        current_period_end: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString(),
        updated_at: new Date().toISOString(),
      }).eq('id', tn.id)
      result.converted++
    } catch (e) {
      result.errors.push(`${tn.name}: ${String((e as Error)?.message || e)}`)
    }
  }

  return json(200, { ok: true, ...result })
})
