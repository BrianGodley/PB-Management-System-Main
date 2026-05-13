// supabase/functions/geocode-address/index.ts
//
// Lightweight wrapper that geocodes a single address and returns the
// lat/lon/formatted address. Used by the Admin > Start Locations UI
// when adding a new starting point — no DB writes, no rate-limit dance.
//
// Body: { address: string }
// Returns: { lat, lon, formatted_address }
//
// Auth: requires Bearer token. Env: GOOGLE_MAPS_API_KEY.

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const apiKey = Deno.env.get('GOOGLE_MAPS_API_KEY')
    if (!apiKey) return json(500, { error: 'GOOGLE_MAPS_API_KEY is not configured.' })

    const auth = req.headers.get('Authorization') || ''
    if (!auth.startsWith('Bearer ')) return json(401, { error: 'Missing Authorization header.' })

    const body = await req.json().catch(() => ({})) as any
    const address: string = (body?.address || '').toString().trim()
    if (!address) return json(400, { error: 'address is required' })

    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`
    const res = await fetch(url)
    if (!res.ok) return json(500, { error: `Google HTTP ${res.status}` })
    const data = await res.json()
    if (data.status !== 'OK' || !data.results?.length) {
      return json(404, { error: 'No result: ' + data.status + (data.error_message ? ' — ' + data.error_message : '') })
    }
    const r = data.results[0]
    return json(200, {
      lat:                r.geometry.location.lat,
      lon:                r.geometry.location.lng,
      formatted_address:  r.formatted_address,
    })
  } catch (e) {
    return json(500, { error: e instanceof Error ? e.message : String(e) })
  }
})
