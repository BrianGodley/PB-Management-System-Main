// supabase/functions/geocode-jobs/index.ts
//
// Bulk geocodes job addresses via the Google Maps Geocoding API.
// Caches lat/lon back on the job row so each address is only ever
// geocoded once (or until its address changes).
//
// Auth: requires a logged-in user (any authenticated user can trigger
// a geocoding pass; admins/super_admins typically would).
//
// Body (all optional):
//   { job_ids?: string[],     // explicit list to (re)geocode
//     limit?:   number,       // cap how many we process this call (default 200)
//     force?:   boolean }     // re-geocode rows already marked 'ok'
//
// Without job_ids, processes all rows with geocode_status='pending'
// up to `limit`. Returns counts + a per-row outcome summary.
//
// Env vars required:
//   SUPABASE_URL                  (auto-injected)
//   SUPABASE_SERVICE_ROLE_KEY     (auto-injected)
//   GOOGLE_MAPS_API_KEY           (set via: supabase secrets set GOOGLE_MAPS_API_KEY=...)

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })

// Compose a Google-friendly address string from the job row fields.
function composeAddress(j: any): string {
  const parts = [
    j.job_address?.trim(),
    j.job_city?.trim(),
    j.job_state?.trim(),
    j.job_zip?.trim(),
  ].filter(Boolean)
  return parts.join(', ')
}

// Concurrency for parallel geocoding. Google's free QPS is ~50/sec; running
// 10 in parallel keeps us comfortably under that and finishes 500-row batches
// in ~15s instead of ~65s sequentially. Bump higher only if you've raised
// your Google quota.
const CONCURRENCY = 10

async function geocodeOne(address: string, key: string) {
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${key}`
  const res = await fetch(url)
  if (!res.ok) return { status: 'error', message: `HTTP ${res.status}` }
  const data = await res.json()
  if (data.status === 'OK' && data.results?.length) {
    const loc = data.results[0].geometry.location
    return { status: 'ok', lat: loc.lat, lon: loc.lng, formatted: data.results[0].formatted_address }
  }
  if (data.status === 'ZERO_RESULTS') return { status: 'not_found' }
  return { status: 'error', message: data.status + (data.error_message ? ': ' + data.error_message : '') }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const apiKey = Deno.env.get('GOOGLE_MAPS_API_KEY')
    if (!apiKey) return json(500, { error: 'GOOGLE_MAPS_API_KEY is not configured on the edge function.' })

    // Require a bearer token so we know SOMEONE called this; we still run with
    // service role to be able to update any job row regardless of RLS.
    const authHeader = req.headers.get('Authorization') || ''
    if (!authHeader.startsWith('Bearer ')) return json(401, { error: 'Missing Authorization header.' })

    const body = await req.json().catch(() => ({})) as any
    const explicitIds: string[] | undefined = Array.isArray(body?.job_ids) ? body.job_ids : undefined
    const limit  = Math.max(1, Math.min(parseInt(body?.limit ?? 200), 500))
    const force  = body?.force === true

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // Pull the rows to process
    let q = admin.from('jobs')
      .select('id, job_address, job_city, job_state, job_zip, geocode_status')
      .order('created_at', { ascending: true })
      .limit(limit)
    if (explicitIds && explicitIds.length) {
      q = q.in('id', explicitIds)
    } else if (!force) {
      q = q.in('geocode_status', ['pending'])
    }
    const { data: rows, error: fetchErr } = await q
    if (fetchErr) return json(500, { error: 'Failed to fetch jobs: ' + fetchErr.message })

    const counts = { processed: 0, ok: 0, not_found: 0, error: 0, skipped_empty_address: 0 }
    const errors: Array<{ job_id: string; reason: string }> = []

    // Process one job: geocode it (or skip), persist the result. Returns
    // void so we can fire many of these in parallel via Promise.all without
    // worrying about rejections taking the whole batch down.
    async function processJob(job: any) {
      counts.processed += 1
      const addr = composeAddress(job)
      const now = new Date().toISOString()

      if (!addr) {
        await admin.from('jobs').update({
          geocode_status: 'skipped', geocoded_at: now,
        }).eq('id', job.id)
        counts.skipped_empty_address += 1
        return
      }

      try {
        const result = await geocodeOne(addr, apiKey)
        if (result.status === 'ok') {
          await admin.from('jobs').update({
            lat: result.lat, lon: result.lon,
            geocode_status: 'ok', geocoded_at: now,
          }).eq('id', job.id)
          counts.ok += 1
        } else if (result.status === 'not_found') {
          await admin.from('jobs').update({
            geocode_status: 'not_found', geocoded_at: now,
          }).eq('id', job.id)
          counts.not_found += 1
        } else {
          await admin.from('jobs').update({
            geocode_status: 'error', geocoded_at: now,
          }).eq('id', job.id)
          counts.error += 1
          errors.push({ job_id: job.id, reason: (result as any).message || 'unknown' })
        }
      } catch (e) {
        await admin.from('jobs').update({
          geocode_status: 'error', geocoded_at: now,
        }).eq('id', job.id)
        counts.error += 1
        errors.push({ job_id: job.id, reason: e instanceof Error ? e.message : String(e) })
      }
    }

    // Run jobs in CONCURRENCY-sized parallel chunks
    const all = rows || []
    for (let i = 0; i < all.length; i += CONCURRENCY) {
      await Promise.all(all.slice(i, i + CONCURRENCY).map(processJob))
    }

    return json(200, { ok: true, counts, errors })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return json(500, { error: msg })
  }
})
