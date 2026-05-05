// supabase/functions/ghl-sync-contacts/index.ts
//
// Pulls GoHighLevel contacts into PBS.
//
// Behaviour:
//   • Pulls contacts whose dateUpdated is newer than the saved
//     ghl_sync_state.inbound_synced_at (full pull on the first run).
//   • Pages through GHL's /contacts/ list endpoint with limit=100.
//   • Upserts into public.contacts, matching first by ghl_contact_id and
//     falling back to email when an existing PBS contact has the same
//     email but no GHL link yet (so re-running a first sync doesn't
//     create duplicates of contacts the user already has).
//   • Advances ghl_sync_state.inbound_synced_at to the newest dateUpdated
//     it saw, and appends a row to ghl_sync_log.
//
// Auth: must be a signed-in admin (per profiles.role).
//
// Request body: empty POST is fine. Optional `{ "full": true }` forces a
// full re-sync by ignoring the saved high-water-mark.

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const GHL_BASE_URL    = 'https://services.leadconnectorhq.com'
const GHL_API_VERSION = '2021-07-28'
const PAGE_LIMIT      = 100   // GHL's max for /contacts/

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

function adminClient() {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )
}

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
  const { data: profile, error: pErr } = await sb
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()
  if (pErr) throw new Error('Failed to load profile: ' + pErr.message)
  const role = profile?.role
  if (role !== 'admin' && role !== 'super_admin') {
    throw new Error('Admin role required.')
  }
  return { userId: user.id }
}

// ── GHL API helpers ────────────────────────────────────────────────────────

interface GhlContact {
  id: string
  locationId?: string
  contactName?: string
  firstName?: string
  lastName?: string
  companyName?: string
  email?: string
  phone?: string
  address1?: string
  address?: string  // older API
  city?: string
  state?: string
  postalCode?: string
  source?: string
  type?: string
  tags?: string[]
  dateAdded?: string
  dateUpdated?: string
  customFields?: unknown[]
}

interface GhlPagedResponse {
  contacts?: GhlContact[]
  meta?: {
    total?:     number
    nextPageUrl?: string | null
    startAfter?: number
    startAfterId?: string | null
    currentPage?: number
    nextPage?: number | null
    prevPage?: number | null
  }
}

// One page from GHL.
async function fetchContactsPage(args: {
  token:   string
  locationId: string
  startAfterId?: string | null
  startAfter?:   number
}): Promise<GhlPagedResponse> {
  const url = new URL(`${GHL_BASE_URL}/contacts/`)
  url.searchParams.set('locationId', args.locationId)
  url.searchParams.set('limit',      String(PAGE_LIMIT))
  if (args.startAfterId) url.searchParams.set('startAfterId', args.startAfterId)
  if (args.startAfter)   url.searchParams.set('startAfter',   String(args.startAfter))

  const res = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${args.token}`,
      Version:       GHL_API_VERSION,
      Accept:        'application/json',
    },
  })

  let body: unknown = null
  try { body = await res.json() } catch { /* */ }
  if (!res.ok) {
    const msg = (body as any)?.message || (body as any)?.error || `GHL ${res.status}`
    throw new Error(msg)
  }
  return body as GhlPagedResponse
}

// Map a GHL contact onto the PBS contacts schema.
function toPbsContact(c: GhlContact) {
  return {
    ghl_contact_id: c.id,
    ghl_synced_at:  new Date().toISOString(),
    first_name:     c.firstName || null,
    last_name:      c.lastName  || null,
    company_name:   c.companyName || null,
    email:          c.email      || null,
    phone:          c.phone      || null,
    street_address: c.address1 || c.address || null,
    city:           c.city       || null,
    state:          c.state      || null,
    zip:            c.postalCode || null,
    source:         c.source     || null,
    tags:           Array.isArray(c.tags) && c.tags.length ? c.tags : null,
    // GHL contact's own audit timestamps — useful for conflict resolution later.
    updated_at:     c.dateUpdated || new Date().toISOString(),
  }
}

// ── Main handler ───────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST')   return json(405, { error: 'Method not allowed' })

  const sb = adminClient()
  let inboundSyncedAt: string | null = null
  let recordsSynced  = 0
  let logMessage     = ''

  try {
    await requireAdmin(req)

    const reqBody = await req.json().catch(() => ({}))
    const fullSync = !!reqBody.full

    // Load the saved connection.
    const { data: conn, error: cErr } = await sb.from('ghl_connections')
      .select('access_token, location_id, contacts_enabled')
      .eq('singleton', true)
      .maybeSingle()
    if (cErr) throw new Error('Failed to load connection: ' + cErr.message)
    if (!conn) throw new Error('No GHL connection saved. Configure it in Admin → Integrations.')
    if (!conn.contacts_enabled) {
      return json(200, { ok: true, skipped: true, reason: 'Contacts sync disabled in connection settings.' })
    }

    // Load the high-water-mark.
    const { data: state } = await sb.from('ghl_sync_state')
      .select('inbound_synced_at')
      .eq('object_type', 'contacts')
      .maybeSingle()
    const sinceIso = (!fullSync && state?.inbound_synced_at) ? state.inbound_synced_at : null

    // Mark the row as running.
    await sb.from('ghl_sync_state')
      .update({ last_run_at: new Date().toISOString(), last_run_status: 'running', last_run_message: '' })
      .eq('object_type', 'contacts')

    // Page through GHL contacts. We stream results into upserts so we don't
    // have to hold the whole list in memory.
    let cursor: { startAfterId?: string | null; startAfter?: number } = {}
    let newestSeen: string | null = null
    let pages = 0
    while (true) {
      pages += 1
      if (pages > 200) {
        logMessage = 'Aborted after 200 pages — possible loop.'
        break
      }
      const page = await fetchContactsPage({
        token:        conn.access_token,
        locationId:   conn.location_id,
        startAfterId: cursor.startAfterId,
        startAfter:   cursor.startAfter,
      })
      const list = page.contacts || []
      if (list.length === 0) break

      // Filter to only contacts updated after the high-water-mark.
      const fresh = sinceIso
        ? list.filter(c => c.dateUpdated && c.dateUpdated > sinceIso)
        : list

      for (const c of fresh) {
        if (c.dateUpdated && (!newestSeen || c.dateUpdated > newestSeen)) {
          newestSeen = c.dateUpdated
        }

        const row = toPbsContact(c)

        // Try the explicit ghl_contact_id match first.
        const { data: existingByGhl } = await sb.from('contacts')
          .select('id')
          .eq('ghl_contact_id', row.ghl_contact_id)
          .maybeSingle()

        if (existingByGhl?.id) {
          const { error: uErr } = await sb.from('contacts').update(row).eq('id', existingByGhl.id)
          if (uErr) throw new Error('Update by ghl_id failed: ' + uErr.message)
          recordsSynced += 1
          continue
        }

        // Fallback: a PBS contact with the same email but no GHL link yet.
        if (row.email) {
          const { data: existingByEmail } = await sb.from('contacts')
            .select('id, ghl_contact_id')
            .eq('email', row.email)
            .is('ghl_contact_id', null)
            .maybeSingle()
          if (existingByEmail?.id) {
            const { error: u2Err } = await sb.from('contacts').update(row).eq('id', existingByEmail.id)
            if (u2Err) throw new Error('Update by email failed: ' + u2Err.message)
            recordsSynced += 1
            continue
          }
        }

        // No match — insert new.
        const { error: iErr } = await sb.from('contacts').insert(row)
        if (iErr) throw new Error('Insert failed: ' + iErr.message)
        recordsSynced += 1
      }

      // Stop when we got fewer than a full page; GHL is done.
      if (list.length < PAGE_LIMIT) break

      // Advance the cursor. GHL returns nextPageUrl in meta; the simplest
      // portable approach is to use startAfterId of the last record.
      const lastId = list[list.length - 1]?.id
      if (!lastId || lastId === cursor.startAfterId) break
      cursor = { startAfterId: lastId }
    }

    inboundSyncedAt = newestSeen || (state?.inbound_synced_at ?? null)
    logMessage = logMessage || `Pulled ${recordsSynced} contact${recordsSynced === 1 ? '' : 's'}.`

    // Update sync state on success.
    await sb.from('ghl_sync_state').update({
      inbound_synced_at:    inboundSyncedAt,
      last_run_at:          new Date().toISOString(),
      last_run_status:      'ok',
      last_run_message:     logMessage,
      inbound_count_total:  (state ? undefined : 0), // leave alone if state already exists
    }).eq('object_type', 'contacts')

    // Bump the running total (separate update so we don't overwrite with NULL).
    await sb.rpc('add_to_ghl_inbound_count', { p_object_type: 'contacts', p_n: recordsSynced })
      .catch(() => { /* RPC is optional; ignore if not present */ })

    await sb.from('ghl_sync_log').insert({
      object_type:    'contacts',
      direction:      'inbound',
      status:         'ok',
      records_synced: recordsSynced,
      message:        logMessage,
    })

    return json(200, {
      ok:               true,
      records_synced:   recordsSynced,
      inbound_synced_at: inboundSyncedAt,
      pages,
    })
  } catch (e) {
    const msg = (e as Error)?.message || 'Unknown error'
    // Best-effort: write a failure to log + state.
    try {
      await sb.from('ghl_sync_state').update({
        last_run_at:      new Date().toISOString(),
        last_run_status:  'error',
        last_run_message: msg,
      }).eq('object_type', 'contacts')
      await sb.from('ghl_sync_log').insert({
        object_type:    'contacts',
        direction:      'inbound',
        status:         'error',
        records_synced: recordsSynced,
        message:        msg,
        error_payload:  { error: msg },
      })
    } catch { /* */ }

    const status = /signed in|Authorization|Admin role/i.test(msg) ? 401 : 500
    return json(status, { ok: false, error: msg })
  }
})
