// supabase/functions/ghl-test-connection/index.ts
//
// Verifies a GoHighLevel Private Integration Token (PIT) + location_id
// pair by hitting GHL's /locations/{id} endpoint. On success, upserts
// the singleton row in ghl_connections so the rest of the system can
// use it. On failure, returns the GHL error untouched so the Admin UI
// can surface a useful message.
//
// Caller flow:
//   1. Admin pastes token + location_id into Admin → Integrations.
//   2. Admin clicks "Test Connection".
//   3. UI POSTs { access_token, location_id, save? } to this function.
//      `save: true` (default) writes the row on success;
//      `save: false` is a dry-run that only verifies.
//
// Auth: must be signed in AND be an admin (per profiles.role). We verify
// the user via JWT first, then explicitly check admin status before
// touching ghl_connections.

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const GHL_BASE_URL  = 'https://services.leadconnectorhq.com'
const GHL_API_VERSION = '2021-07-28'

const corsHeaders = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const json = (status: number, payload: unknown) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })

// Service-role client (bypasses RLS) — only used for the connection upsert
// after we've verified the caller is an admin.
function adminClient() {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )
}

// Resolve the calling user from the incoming JWT, and confirm they're an
// admin. Throws on auth failure or non-admin.
async function requireAdmin(req: Request): Promise<{ userId: string }> {
  const auth = req.headers.get('Authorization') || ''
  const jwt  = auth.replace(/^Bearer\s+/i, '')
  if (!jwt) throw new Error('Missing Authorization header.')

  const sb = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: `Bearer ${jwt}` } } },
  )

  const { data: { user }, error } = await sb.auth.getUser()
  if (error || !user) throw new Error('Not signed in.')

  // Use the user-scoped client so RLS still enforces "you can only see
  // your own profile". If the row exists and role is admin, we're good.
  const { data: profile, error: pErr } = await sb
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()
  if (pErr) throw new Error('Failed to load profile: ' + pErr.message)
  const role = profile?.role
  if (role !== 'admin' && role !== 'super_admin') {
    throw new Error('Admin role required to manage GHL connections.')
  }
  return { userId: user.id }
}

// Probe GHL: GET /locations/{id}. Returns the parsed body on success,
// or throws an Error containing the GHL response payload on failure.
async function probeGhl(token: string, locationId: string): Promise<{
  id: string
  name?: string
  companyId?: string
}> {
  const res = await fetch(`${GHL_BASE_URL}/locations/${locationId}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      Version:       GHL_API_VERSION,
      Accept:        'application/json',
    },
  })

  let body: unknown = null
  try { body = await res.json() } catch { /* non-json error body */ }

  if (!res.ok) {
    const msg = (body as any)?.message
      || (body as any)?.error
      || `GHL responded ${res.status}`
    throw new Error(msg)
  }

  // GHL wraps the location under either { location: {...} } or returns it
  // at the top level depending on endpoint version. Handle both.
  const loc = (body as any)?.location ?? body
  if (!loc?.id) throw new Error('GHL response did not include a location id.')
  return { id: loc.id, name: loc.name, companyId: loc.companyId }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST')   return json(405, { error: 'Method not allowed' })

  try {
    const { userId } = await requireAdmin(req)

    const { access_token, location_id, save = true } = await req.json().catch(() => ({}))
    if (!access_token || typeof access_token !== 'string') {
      return json(400, { error: 'access_token is required.' })
    }
    if (!location_id || typeof location_id !== 'string') {
      return json(400, { error: 'location_id is required.' })
    }

    // Probe GHL with the pasted credentials.
    let probe
    try {
      probe = await probeGhl(access_token.trim(), location_id.trim())
    } catch (e) {
      return json(200, {
        ok:      false,
        message: (e as Error).message,
      })
    }

    // Probe succeeded. If save=false, return the location preview without
    // touching the table — useful for "Test only" buttons.
    if (!save) {
      return json(200, {
        ok: true,
        location: probe,
        saved:    false,
      })
    }

    // Upsert the singleton connection row. We delete first so we don't
    // need to worry about whether the column constraints / on-conflict
    // play nicely with the singleton index.
    const sb = adminClient()
    const { error: delErr } = await sb.from('ghl_connections').delete().eq('singleton', true)
    if (delErr) {
      return json(500, { ok: false, message: 'Failed to clear old connection: ' + delErr.message })
    }

    const { data: inserted, error: insErr } = await sb
      .from('ghl_connections')
      .insert({
        access_token: access_token.trim(),
        location_id:  location_id.trim(),
        company_id:   probe.companyId || null,
        created_by:   userId,
      })
      .select('id, location_id, company_id, created_at')
      .single()

    if (insErr) {
      return json(500, { ok: false, message: 'Failed to save connection: ' + insErr.message })
    }

    return json(200, {
      ok:        true,
      saved:     true,
      location:  probe,
      connection: inserted,
    })
  } catch (e) {
    const msg = (e as Error)?.message || 'Unknown error'
    // 401 for auth failures, 500 for everything else.
    const status = /signed in|Authorization|Admin role/i.test(msg) ? 401 : 500
    return json(status, { error: msg })
  }
})
