import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ── Load provider credentials from company_settings ───────────────────────────
async function loadSmsConfig() {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )
  const { data, error } = await supabase
    .from('company_settings')
    .select('sms_config')
    .maybeSingle()
  if (error) throw new Error('Failed to load sms_config: ' + error.message)
  return data?.sms_config || null
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
    mode: 'SMS',
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
    // Return the full raw response so we can see exactly what's wrong
    const msg = data?.message || data?.error || data?.errors?.[0]?.message || `SimpleTexting error ${res.status}`
    return { success: false, error: msg, raw: data }
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
    const { to, message } = await req.json()
    const toNumber = to.startsWith('+') ? to : '+1' + to.replace(/\D/g, '')

    const smsConfig = await loadSmsConfig()
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




