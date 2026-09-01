import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from "npm:@supabase/supabase-js@2"
import { guardRecipients } from '../_shared/deliveryGuard.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ── Load provider credentials from company_settings ───────────────────────────
// company_settings holds ONE ROW PER TENANT, so an unfiltered .maybeSingle()
// errors with "multiple rows returned" the moment a second tenant exists — which
// is why SMS silently stopped working. Filter by the caller's tenant when one is
// given, and fall back to the sole row only when the table really does hold one.
async function loadSmsConfig(tenantId?: string | null) {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  if (tenantId) {
    const { data, error } = await supabase
      .from('company_settings')
      .select('sms_config')
      .eq('tenant_id', tenantId)
      .maybeSingle()
    if (error) throw new Error('Failed to load sms_config: ' + error.message)
    return data?.sms_config || null
  }

  // No tenant supplied: only safe if exactly one row exists. Anything else is
  // ambiguous, and guessing which tenant's provider to bill is worse than failing.
  const { data, error } = await supabase.from('company_settings').select('sms_config, tenant_id')
  if (error) throw new Error('Failed to load sms_config: ' + error.message)
  if (!data || data.length === 0) return null
  if (data.length > 1) {
    throw new Error(
      `sms_config is ambiguous: ${data.length} tenants configured but no tenant_id was supplied. ` +
      `Pass tenant_id in the request body.`
    )
  }
  return data[0]?.sms_config || null
}

// ── SimpleTexting ─────────────────────────────────────────────────────────────
// Normalize to 10-digit US number (strip country code if present)
function stPhone(num: string): string {
  const digits = num.replace(/\D/g, '')
  if (digits.length === 11 && digits.startsWith('1')) return digits.slice(1)
  return digits
}

async function sendViaSimpleTexting(creds: Record<string, string>, toNumber: string, message: string) {
  const { api_key, from_number } = creds
  if (!api_key || !from_number) throw new Error('SimpleTexting requires api_key and from_number')

  const body = {
    contactPhone: stPhone(toNumber),
    accountPhone: stPhone(from_number),
    mode: 'MMS_PREFERRED',
    text: message,
  }

  console.log('SimpleTexting request body:', JSON.stringify(body))

  const res = await fetch('https://api-app2.simpletexting.com/v2/api/messages', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${api_key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  const data = await res.json()
  console.log('SimpleTexting response status:', res.status)
  console.log('SimpleTexting response:', JSON.stringify(data))

  if (!res.ok) {
    const msg = data?.message || data?.error || data?.errors?.[0]?.message || `SimpleTexting error ${res.status}`
    return { success: false, error: msg, raw: data, sent: body }
  }
  return { success: true, id: data?.id || null, status: data?.status || 'sent', raw: data }
}

// ── Twilio ────────────────────────────────────────────────────────────────────
async function sendViaTwilio(creds: Record<string, string>, toNumber: string, message: string) {
  const { account_sid, auth_token, from_number } = creds
  if (!account_sid || !auth_token || !from_number) throw new Error('Twilio requires account_sid, auth_token, and from_number')

  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${account_sid}/Messages.json`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(`${account_sid}:${auth_token}`)}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ From: from_number, To: toNumber, Body: message }),
    }
  )

  const data = await res.json()
  console.log('Twilio response status:', res.status)
  console.log('Twilio response:', JSON.stringify(data))

  if (!res.ok) {
    return { success: false, error: data?.message || `Twilio error ${res.status}`, code: data?.code, raw: data }
  }
  return { success: true, id: data?.sid || null, status: data?.status || null, raw: data }
}

// ── Telnyx ────────────────────────────────────────────────────────────────────
async function sendViaTelnyx(creds: Record<string, string>, toNumber: string, message: string) {
  const { api_key, from_number } = creds
  if (!api_key || !from_number) throw new Error('Telnyx requires api_key and from_number')

  const res = await fetch('https://api.telnyx.com/v2/messages', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${api_key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: from_number, to: toNumber, text: message }),
  })

  const data = await res.json()
  if (!res.ok) return { success: false, error: data?.errors?.[0]?.detail || `Telnyx error ${res.status}`, raw: data }
  return { success: true, id: data?.data?.id || null, status: data?.data?.to?.[0]?.status || null, raw: data }
}

// ── Vonage ────────────────────────────────────────────────────────────────────
async function sendViaVonage(creds: Record<string, string>, toNumber: string, message: string) {
  const { api_key, api_secret, from_number } = creds
  if (!api_key || !api_secret || !from_number) throw new Error('Vonage requires api_key, api_secret, and from_number')

  const to = toNumber.replace(/^\+/, '')
  const res = await fetch('https://rest.nexmo.com/sms/json', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ api_key, api_secret, from: from_number, to, text: message }),
  })

  const data = await res.json()
  const msg = data?.messages?.[0]
  if (msg?.status !== '0') return { success: false, error: msg?.['error-text'] || 'Vonage error', raw: data }
  return { success: true, id: msg?.['message-id'] || null, status: 'sent', raw: data }
}

// ── MessageBird ───────────────────────────────────────────────────────────────
async function sendViaMessageBird(creds: Record<string, string>, toNumber: string, message: string) {
  const { api_key, from_number } = creds
  if (!api_key || !from_number) throw new Error('MessageBird requires api_key and from_number')

  const to = toNumber.replace(/^\+/, '')
  const res = await fetch('https://rest.messagebird.com/messages', {
    method: 'POST',
    headers: {
      'Authorization': `AccessKey ${api_key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ originator: from_number, recipients: [to], body: message }),
  })

  const data = await res.json()
  if (!res.ok) return { success: false, error: data?.errors?.[0]?.description || `MessageBird error ${res.status}`, raw: data }
  return { success: true, id: data?.id || null, status: 'sent', raw: data }
}

// ── Phone normalization ───────────────────────────────────────────────────────
// Accepts any stored format — "1 (555) 123-4567", "(555) 123-4567",
// "5551234567", "+15551234567" — and returns clean E.164 (+1AAANNNNNNN).
// Every provider below either takes E.164 directly or strips it down further
// (e.g. SimpleTexting's stPhone), so normalizing once here is enough.
function toE164(raw: string): string {
  const s = String(raw ?? '').trim()
  if (s.startsWith('+')) return s                       // already E.164
  const d = s.replace(/\D/g, '')
  if (d.length === 11 && d.startsWith('1')) return '+' + d   // 1 + 10-digit US
  if (d.length === 10) return '+1' + d                       // bare 10-digit US
  if (d.length > 11) return '+' + d                          // already has a country code
  return '+1' + d                                            // fallback: assume US
}

// ── Router ────────────────────────────────────────────────────────────────────
const PROVIDERS: Record<string, (creds: Record<string, string>, to: string, msg: string) => Promise<Record<string, unknown>>> = {
  simpletexting: sendViaSimpleTexting,
  twilio:        sendViaTwilio,
  telnyx:        sendViaTelnyx,
  vonage:        sendViaVonage,
  messagebird:   sendViaMessageBird,
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const payload = await req.json()
    // `body` is accepted as an alias: two change-order components send that key
    // instead of `message`, which silently produced empty texts.
    const { to, tenant_id } = payload
    const message = payload.message ?? payload.body
    const toNumber = toE164(to)
    if (!message) {
      return new Response(JSON.stringify({ success: false, error: 'Missing message (or body)' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Outside production, deliver only to explicitly allowlisted numbers.
    // Staging holds real client phone numbers; this is what stops a test from
    // texting them. No effect in production.
    const guard = guardRecipients(toNumber)
    if (guard.gated && guard.allowed.length === 0) {
      console.log(`SMS BLOCKED (non-production): ${toNumber}`)
      return new Response(JSON.stringify({
        success: false, blocked: true, environment: 'non-production',
        wouldHaveSentTo: toNumber, error: guard.reason,
      }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const smsConfig = await loadSmsConfig(tenant_id)
    const activeProvider = smsConfig?.active_provider || 'twilio'
    const creds: Record<string, string> = smsConfig?.providers?.[activeProvider] || {}

    console.log(`Sending SMS via ${activeProvider} to ${toNumber}`)

    const sender = PROVIDERS[activeProvider]
    if (!sender) {
      return new Response(JSON.stringify({ success: false, error: `Unknown provider: ${activeProvider}` }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const result = await sender(creds, toNumber, message)

    return new Response(JSON.stringify({ provider: activeProvider, ...result }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (err) {
    console.error('Error:', err.message)
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})




