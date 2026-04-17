import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const RESEND_API_KEY    = Deno.env.get('RESEND_API_KEY')
    const RESEND_FROM_EMAIL = Deno.env.get('RESEND_FROM_EMAIL') ?? 'noreply@picturebuild.com'

    if (!RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY secret is not set.')
    }

    const { to, subject, html, text } = await req.json()

    if (!to || !subject) {
      throw new Error('Missing required fields: to, subject')
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `PictureBuild <${RESEND_FROM_EMAIL}>`,
        to: Array.isArray(to) ? to : [to],
        subject,
        html: html ?? text ?? '',
        text: text ?? '',
      }),
    })

    const data = await res.json()

    if (!res.ok) {
      throw new Error(data?.message ?? 'Resend API error')
    }

    return new Response(JSON.stringify({ success: true, id: data.id }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
