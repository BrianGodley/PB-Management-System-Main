// supabase/functions/helcim-subscription-webhook/index.ts
//
// Receives Helcim Recurring/Subscription webhooks for SoftCake's OWN billing of
// a tenant (i.e. the tenant's SoftCake subscription — not the tenant charging
// their customers; that's helcim-connect-webhook). On each event we update the
// tenant's billing state + card-on-file, which is what Settings → Billing shows.
//
// Writing helcim_subscription_id flips the app's `has_live_billing` true, so the
// "Test card (beta)" badge disappears and the real card is displayed.
//
// SECRETS:  SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (auto),
//           HELCIM_WEBHOOK_SECRET (optional shared secret to verify the call)
//
// NOTE: confirm exact Helcim field names + signature header in your Helcim
// dashboard once enrolled — extraction below is intentionally tolerant. When you
// create the subscription, pass the tenant id as the reference so we can map the
// event back to a tenant even before helcim_customer_id is stored.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*' }
const json = (s: number, b: unknown) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, 'content-type': 'application/json' } })

// Map Helcim's many possible status spellings → our billing_status vocabulary.
function mapStatus(raw: string): string | null {
  const s = (raw || '').toLowerCase()
  if (!s) return null
  if (['active', 'paid', 'completed', 'approved', 'current'].includes(s)) return 'active'
  if (['trialing', 'trial'].includes(s)) return 'trialing'
  if (['past_due', 'pastdue', 'overdue', 'failed', 'declined', 'unpaid'].includes(s)) return 'past_due'
  if (['canceled', 'cancelled', 'inactive', 'expired', 'terminated'].includes(s)) return 'canceled'
  return s
}

// Pick the first defined value from a list of possible field names.
function pick(obj: Record<string, unknown>, ...keys: string[]) {
  for (const k of keys) {
    const v = obj?.[k]
    if (v !== undefined && v !== null && v !== '') return v
  }
  return undefined
}

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json(405, { error: 'POST only' })

  // Optional shared-secret check (set HELCIM_WEBHOOK_SECRET + configure Helcim to send it).
  const expected = Deno.env.get('HELCIM_WEBHOOK_SECRET') || ''
  if (expected) {
    const got =
      req.headers.get('x-webhook-secret') ||
      req.headers.get('webhook-secret') ||
      req.headers.get('x-helcim-signature') ||
      ''
    if (got !== expected) return json(401, { error: 'bad secret' })
  }

  const body = (await req.json().catch(() => ({}))) as Record<string, any>
  // Some providers wrap the payload in { data: {...} } or { subscription: {...} }.
  const d: Record<string, any> = body.data || body.subscription || body.object || body

  // Identifiers (tolerant of shapes).
  const reference = pick(d, 'reference', 'idempotencyKey', 'partnerReference', 'ref', 'tenantId', 'tenant_id')
  const subscriptionId = pick(d, 'subscriptionId', 'subscription_id', 'id', 'recurringId', 'recurring_id')
  const customerId = pick(d, 'customerId', 'customer_id', 'customerCode', 'customer_code')

  // Billing status + period.
  const billingStatus = mapStatus(String(pick(d, 'status', 'subscriptionStatus', 'state') ?? ''))
  const periodEndRaw = pick(
    d, 'currentPeriodEnd', 'current_period_end', 'nextBillingDate', 'next_billing_date',
    'periodEnd', 'renewsAt', 'renews_at'
  )
  let currentPeriodEnd: string | null = null
  if (periodEndRaw) {
    const dt = new Date(periodEndRaw as string)
    if (!isNaN(dt.getTime())) currentPeriodEnd = dt.toISOString()
  }

  // Card on file (Helcim card object can be nested).
  const card: Record<string, any> = d.card || d.cardData || d.paymentMethod || {}
  const cardBrand = pick(card, 'brand', 'cardType', 'card_type', 'type') ?? pick(d, 'cardType', 'card_brand')
  const cardLast4 =
    pick(card, 'last4', 'cardLast4', 'card_last4', 'lastFour', 'last_four') ??
    pick(d, 'cardLast4', 'card_last4')
  const expMonth = pick(card, 'expMonth', 'exp_month', 'expiryMonth', 'cardExpiryMonth')
  const expYear = pick(card, 'expYear', 'exp_year', 'expiryYear', 'cardExpiryYear')
  let cardExp: string | null = null
  if (expMonth && expYear) {
    const mm = String(expMonth).padStart(2, '0')
    const yyyy = String(expYear).length === 2 ? `20${expYear}` : String(expYear)
    cardExp = `${mm}/${yyyy}`
  } else {
    const e = pick(card, 'expiry', 'exp', 'cardExpiry')
    if (e) cardExp = String(e)
  }

  if (!reference && !subscriptionId && !customerId) {
    return json(400, { error: 'no tenant identifier (reference/subscriptionId/customerId) in payload' })
  }

  const sb = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } }
  )

  // Resolve the tenant: prefer explicit reference (tenant id), then existing
  // subscription id, then customer id.
  let tenantId: string | null = null
  if (reference) {
    const { data } = await sb.from('tenants').select('id').eq('id', reference).maybeSingle()
    if (data) tenantId = data.id
  }
  if (!tenantId && subscriptionId) {
    const { data } = await sb
      .from('tenants').select('id').eq('helcim_subscription_id', subscriptionId).maybeSingle()
    if (data) tenantId = data.id
  }
  if (!tenantId && customerId) {
    const { data } = await sb
      .from('tenants').select('id').eq('helcim_customer_id', customerId).maybeSingle()
    if (data) tenantId = data.id
  }
  if (!tenantId) return json(404, { error: 'no matching tenant for this event' })

  // Build the update — only set fields we actually received.
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (subscriptionId) update.helcim_subscription_id = subscriptionId
  if (customerId) update.helcim_customer_id = customerId
  if (billingStatus) {
    update.billing_status = billingStatus
    // Keep access-gating status in sync for the clear cases.
    if (billingStatus === 'active') update.status = 'active'
    else if (billingStatus === 'canceled') update.status = 'canceled'
  }
  if (currentPeriodEnd) update.current_period_end = currentPeriodEnd
  if (cardBrand) update.card_brand = String(cardBrand)
  if (cardLast4) update.card_last4 = String(cardLast4).slice(-4)
  if (cardExp) update.card_exp = cardExp

  const { error } = await sb.from('tenants').update(update).eq('id', tenantId)
  if (error) return json(500, { error: error.message })

  return json(200, { ok: true, tenant_id: tenantId, billing_status: billingStatus ?? null })
})
