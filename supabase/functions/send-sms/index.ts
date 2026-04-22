import { serve } from "https://deno.land/std@0.177.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const TWILIO_ACCOUNT_SID  = Deno.env.get('TWILIO_ACCOUNT_SID')
    const TWILIO_AUTH_TOKEN   = Deno.env.get('TWILIO_AUTH_TOKEN')
    const TWILIO_PHONE_NUMBER = Deno.env.get('TWILIO_PHONE_NUMBER')

    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
      console.error('Missing Twilio secrets')
      return new Response(JSON.stringify({ error: 'Missing Twilio secrets' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const { to, message } = await req.json()
    const toNumber = to.startsWith('+') ? to : '+1' + to.replace(/\D/g, '')

    console.log('Sending SMS to:', toNumber, 'from:', TWILIO_PHONE_NUMBER)

    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`)}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({ From: TWILIO_PHONE_NUMBER, To: toNumber, Body: message }),
      }
    )

    const data = await res.json()
    console.log('Twilio response status:', res.status)
    console.log('Twilio response:', JSON.stringify(data))

    // Return Twilio's message status and any error details so the UI can surface them
    const twilioError = !res.ok ? (data?.message || data?.code || `Twilio error ${res.status}`) : null
    if (twilioError) console.error('Twilio error:', twilioError, 'code:', data?.code)

    return new Response(JSON.stringify({
      success:  res.ok,
      sid:      data?.sid   || null,
      status:   data?.status || null,   // e.g. "queued", "failed", "undelivered"
      error:    twilioError,
      code:     data?.code  || null,    // Twilio error code, e.g. 21608 = trial restriction
    }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (err) {
    console.error('Error:', err.message)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
