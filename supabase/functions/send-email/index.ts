import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Always return HTTP 200 so supabase.functions.invoke / fetch callers can read
// the response body and surface the real error to the UI.
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const respond = (payload: object) =>
    new Response(JSON.stringify(payload), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  try {
    const RESEND_API_KEY    = Deno.env.get('RESEND_API_KEY')
    const RESEND_FROM_EMAIL = Deno.env.get('RESEND_FROM_EMAIL') ?? 'noreply@picturebuild.com'

    if (!RESEND_API_KEY) {
      console.error('Missing RESEND_API_KEY secret')
      return respond({ success: false, error: 'RESEND_API_KEY secret is not set.' })
    }

    const { to, subject, html, text } = await req.json()

    if (!to || !subject) {
      return respond({ success: false, error: 'Missing required fields: to, subject' })
    }

    console.log('Sending email to:', to, 'from:', RESEND_FROM_EMAIL)

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `Picture Build System <${RESEND_FROM_EMAIL}>`,
        to: Array.isArray(to) ? to : [to],
        subject,
        html: html ?? text ?? '',
        text: text ?? '',
      }),
    })

    const data = await res.json()
    console.log('Resend response status:', res.status)
    console.log('Resend response:', JSON.stringify(data))

    if (!res.ok) {
      return respond({ success: false, error: data?.message ?? data?.name ?? `Resend error ${res.status}`, resend: data })
    }

    return respond({ success: true, id: data.id })

  } catch (err) {
    console.error('Error:', err.message)
    return respond({ success: false, error: err.message })
  }
})
