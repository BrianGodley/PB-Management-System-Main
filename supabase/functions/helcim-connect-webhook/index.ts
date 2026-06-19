// supabase/functions/helcim-connect-webhook/index.ts
//
// Receives Helcim's "connected account registration" webhook. When a tenant
// completes merchant signup through your partner registration URL (tagged with
// the registration_ref we generated), Helcim posts the approved merchant's
// api-token here; we store it against the tenant so the app can process that
// tenant's client payments.
//
// SECRETS:  SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (auto),
//           HELCIM_WEBHOOK_SECRET (optional shared secret to verify the call)
//
// NOTE: confirm the exact webhook field names + signature header against your
// Helcim partner dashboard once enrolled — the extraction below is intentionally
// tolerant of common shapes.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*' }
const json = (s: number, b: unknown) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, 'content-type': 'application/json' } })

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json(405, { error: 'POST only' })

  // Optional shared-secret check (set HELCIM_WEBHOOK_SECRET + configure Helcim to send it).
  const expected = Deno.env.get('HELCIM_WEBHOOK_SECRET') || ''
  if (expected) {
    const got = req.headers.get('x-webhook-secret') || req.headers.get('webhook-secret') || ''
    if (got !== expected) return json(401, { error: 'bad secret' })
  }

  const body = await req.json().catch(() => ({}))

  // Tolerant field extraction — adjust to Helcim's actual payload after enrolling.
  const ref =
    body.reference || body.registration_ref || body.partnerReference || body.idempotencyKey || body.ref
  const apiToken = body.apiToken || body.api_token || body.merchantApiToken || body.token
  const accountId =
    body.accountId || body.account_id || body.merchantId || body.merchant_id || body.accountNumber
  const statusRaw = String(body.status || '').toLowerCase()
  const approved = statusRaw === 'approved' || body.approved === true || !!apiToken

  if (!ref) return json(400, { error: 'missing registration reference' })

  const sb = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } }
  )

  if (approved && apiToken) {
    const { error } = await sb
      .from('tenant_payment_connections')
      .update({
        status: 'connected',
        helcim_api_token: apiToken,
        helcim_account_id: accountId ?? null,
        connected_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('registration_ref', ref)
    if (error) return json(500, { error: error.message })
    return json(200, { ok: true, status: 'connected' })
  }

  // Not approved (or no token yet) — mark failed/pending so the UI can reflect it.
  await sb
    .from('tenant_payment_connections')
    .update({ status: approved ? 'pending' : 'failed', updated_at: new Date().toISOString() })
    .eq('registration_ref', ref)
  return json(200, { ok: true, status: approved ? 'pending' : 'failed' })
})
