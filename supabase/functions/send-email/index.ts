import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const respond = (payload: object) =>
  new Response(JSON.stringify(payload), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })

// ── Load provider credentials from company_settings ───────────────────────────
async function loadEmailConfig() {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )
  const { data, error } = await supabase
    .from('company_settings')
    .select('email_config')
    .maybeSingle()
  if (error) throw new Error('Failed to load email_config: ' + error.message)
  return data?.email_config || null
}

// ── Resend ────────────────────────────────────────────────────────────────────
async function sendViaResend(creds: Record<string, string>, to: string | string[], subject: string, html: string, text: string) {
  const { api_key, from_email } = creds
  if (!api_key) throw new Error('Resend requires api_key')
  const from = from_email ? `Picture Build System <${from_email}>` : 'Picture Build System <noreply@picturebuild.com>'

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${api_key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to: Array.isArray(to) ? to : [to], subject, html: html ?? text ?? '', text: text ?? '' }),
  })
  const data = await res.json()
  console.log('Resend response:', res.status, JSON.stringify(data))
  if (!res.ok) return { success: false, error: data?.message ?? data?.name ?? `Resend error ${res.status}` }
  return { success: true, id: data.id }
}

// ── SendGrid ──────────────────────────────────────────────────────────────────
async function sendViaSendGrid(creds: Record<string, string>, to: string | string[], subject: string, html: string, text: string) {
  const { api_key, from_email } = creds
  if (!api_key || !from_email) throw new Error('SendGrid requires api_key and from_email')

  const toArr = (Array.isArray(to) ? to : [to]).map(email => ({ email }))
  const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${api_key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: { email: from_email, name: 'Picture Build System' },
      personalizations: [{ to: toArr }],
      subject,
      content: [{ type: 'text/html', value: html ?? text ?? '' }],
    }),
  })
  console.log('SendGrid response:', res.status)
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    return { success: false, error: data?.errors?.[0]?.message ?? `SendGrid error ${res.status}` }
  }
  return { success: true, id: res.headers.get('x-message-id') || null }
}

// ── Mailgun ───────────────────────────────────────────────────────────────────
async function sendViaMailgun(creds: Record<string, string>, to: string | string[], subject: string, html: string, text: string) {
  const { api_key, domain, from_email } = creds
  if (!api_key || !domain || !from_email) throw new Error('Mailgun requires api_key, domain, and from_email')

  const toStr = Array.isArray(to) ? to.join(',') : to
  const body = new URLSearchParams({
    from: `Picture Build System <${from_email}>`,
    to: toStr,
    subject,
    html: html ?? text ?? '',
  })
  const res = await fetch(`https://api.mailgun.net/v3/${domain}/messages`, {
    method: 'POST',
    headers: { 'Authorization': `Basic ${btoa(`api:${api_key}`)}` },
    body,
  })
  const data = await res.json()
  console.log('Mailgun response:', res.status, JSON.stringify(data))
  if (!res.ok) return { success: false, error: data?.message ?? `Mailgun error ${res.status}` }
  return { success: true, id: data.id || null }
}

// ── Postmark ──────────────────────────────────────────────────────────────────
async function sendViaPostmark(creds: Record<string, string>, to: string | string[], subject: string, html: string, text: string) {
  const { server_token, from_email } = creds
  if (!server_token || !from_email) throw new Error('Postmark requires server_token and from_email')

  const toStr = Array.isArray(to) ? to.join(',') : to
  const res = await fetch('https://api.postmarkapp.com/email', {
    method: 'POST',
    headers: {
      'X-Postmark-Server-Token': server_token,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      From: `Picture Build System <${from_email}>`,
      To: toStr,
      Subject: subject,
      HtmlBody: html ?? text ?? '',
      TextBody: text ?? '',
      MessageStream: 'outbound',
    }),
  })
  const data = await res.json()
  console.log('Postmark response:', res.status, JSON.stringify(data))
  if (!res.ok) return { success: false, error: data?.Message ?? `Postmark error ${res.status}` }
  return { success: true, id: data.MessageID || null }
}

// ── SMTP (via smtp2go as relay or direct) — basic nodemailer-style ─────────────
// Note: Deno edge functions can't open raw TCP sockets, so we use smtp2go's HTTP API
// as a fallback. For true generic SMTP, users should pick a provider above.
async function sendViaSMTP(creds: Record<string, string>, to: string | string[], subject: string, html: string, _text: string) {
  const { host, port, username, password, from_email } = creds
  if (!host || !username || !password || !from_email) throw new Error('SMTP requires host, username, password, and from_email')

  // Use smtp2go HTTP API if host is smtp2go, otherwise inform user
  if (host.includes('smtp2go')) {
    const toArr = Array.isArray(to) ? to : [to]
    const res = await fetch('https://api.smtp2go.com/v3/email/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: password,
        to: toArr,
        sender: `Picture Build System <${from_email}>`,
        subject,
        html_body: html,
      }),
    })
    const data = await res.json()
    if (!res.ok || data?.data?.succeeded !== 1) return { success: false, error: data?.data?.failures?.[0] ?? 'SMTP error' }
    return { success: true, id: data?.data?.email_id || null }
  }

  return { success: false, error: `Raw SMTP (${host}:${port}) is not supported in edge functions. Use Resend, SendGrid, Mailgun, or Postmark instead.` }
}

// ── Router ────────────────────────────────────────────────────────────────────
type Sender = (creds: Record<string, string>, to: string | string[], subject: string, html: string, text: string) => Promise<Record<string, unknown>>

const PROVIDERS: Record<string, Sender> = {
  resend:    sendViaResend,
  sendgrid:  sendViaSendGrid,
  mailgun:   sendViaMailgun,
  postmark:  sendViaPostmark,
  smtp:      sendViaSMTP,
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { to, subject, html, text } = await req.json()
    if (!to || !subject) return respond({ success: false, error: 'Missing required fields: to, subject' })

    // Load provider config from DB; fall back to env var for zero-config Resend
    const emailConfig = await loadEmailConfig().catch(() => null)
    const activeProvider = emailConfig?.active_provider || 'resend'
    let creds: Record<string, string> = emailConfig?.providers?.[activeProvider] || {}

    // Legacy fallback: if no DB config yet, read from env vars (Resend only)
    if (activeProvider === 'resend' && !creds.api_key) {
      creds = {
        api_key:    Deno.env.get('RESEND_API_KEY') || '',
        from_email: Deno.env.get('RESEND_FROM_EMAIL') || 'noreply@picturebuild.com',
      }
    }

    console.log(`Sending email via ${activeProvider} to ${to}`)

    const sender = PROVIDERS[activeProvider]
    if (!sender) return respond({ success: false, error: `Unknown provider: ${activeProvider}` })

    const result = await sender(creds, to, subject, html ?? '', text ?? '')
    return respond({ provider: activeProvider, ...result })

  } catch (err) {
    console.error('Error:', err.message)
    return respond({ success: false, error: err.message })
  }
})
