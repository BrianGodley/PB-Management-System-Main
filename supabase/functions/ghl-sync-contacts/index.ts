// supabase/functions/ghl-sync-contacts/index.ts
//
// Pulls GoHighLevel contacts into PBS.
//
// Behaviour:
//   • Pulls contacts whose dateUpdated is newer than the saved
//     ghl_sync_state.inbound_synced_at (full pull on the first run).
//   • Pages through GHL's /contacts/ list endpoint with limit=100.
//   • Upserts into public.contacts using a deduplication ladder so we
//     don't pile duplicates on top of existing imports:
//        1. exact match on ghl_contact_id
//        2. exact match on email   (PBS contact must have no GHL link yet)
//        3. exact match on phone   (digits-only, last 10 digits — same)
//        4. exact match on (last_name + first_name + zip), all lowercased
//        5. otherwise insert new
//     Each rung is only tried if the previous didn't match. Steps 2-4
//     also stamp the matched PBS row with the GHL id so future syncs
//     skip straight to step 1.
//   • Advances ghl_sync_state.inbound_synced_at to the newest dateUpdated
//     it saw, and appends a row to ghl_sync_log.
//
// Auth: must be a signed-in admin (per profiles.role).
//
// Request body (POST JSON):
//   {
//     full?:    boolean,   // ignore saved high-water-mark, pull everything
//     dry_run?: boolean,   // count matches by category, write nothing
//   }
//
// Dry-run response includes:
//   {
//     ok: true,
//     dry_run: true,
//     would_update_by_ghl_id: N,
//     would_update_by_email:  N,
//     would_update_by_phone:  N,
//     would_update_by_name_zip: N,
//     would_insert: N,
//     samples: [ { reason, ghl: {...}, pbs: {...} | null }, ... up to 25 ]
//   }

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
//
// PBS contacts.first_name and last_name are NOT NULL, so we coalesce to
// empty strings rather than null. If a GHL contact carries neither a
// first_name nor a last_name (a company-only contact, very common for
// vendors and HOAs in GHL), we drop the company name into last_name so
// the row has something readable. The original company_name still gets
// preserved in its own column.
function toPbsContact(c: GhlContact) {
  let firstName = (c.firstName || '').trim()
  let lastName  = (c.lastName  || '').trim()
  if (!firstName && !lastName) {
    // Last-resort fallbacks: contactName (full name from GHL) or companyName.
    const fallback = (c.contactName || c.companyName || '').trim()
    if (fallback.includes(' ')) {
      const parts = fallback.split(/\s+/)
      firstName = parts.slice(0, -1).join(' ')
      lastName  = parts[parts.length - 1]
    } else {
      lastName = fallback // even an empty string keeps the column non-null
    }
  }

  return {
    ghl_contact_id: c.id,
    ghl_synced_at:  new Date().toISOString(),
    first_name:     firstName,                 // never null
    last_name:      lastName,                  // never null
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
    const dryRun   = !!reqBody.dry_run

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

    // Helpers + accumulator for the dedup ladder.
    const digitsOnly = (s: string) => (s || '').replace(/\D/g, '')
    // GHL's startAfterId pagination is inclusive in some responses, so the
    // last record of one page can show up as the first record of the next.
    // Track ids we've already processed in this run so we never double-count.
    const seenGhlIds = new Set<string>()
    const counts = {
      would_update_by_ghl_id:   0,
      would_update_by_email:    0,
      would_update_by_phone:    0,
      would_update_by_name_zip: 0,
      would_insert:             0,
    }
    const samples: Array<{ reason: string; ghl: any; pbs: any | null }> = []
    const collectSample = (reason: string, ghl: any, pbs: any | null) => {
      if (samples.length < 25) {
        samples.push({
          reason,
          ghl: { id: ghl.id, firstName: ghl.firstName, lastName: ghl.lastName, email: ghl.email, phone: ghl.phone },
          pbs: pbs ? { id: pbs.id, first_name: pbs.first_name, last_name: pbs.last_name } : null,
        })
      }
    }

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
        // Skip records we've already touched in this run (pagination overlap).
        if (seenGhlIds.has(c.id)) continue
        seenGhlIds.add(c.id)

        if (c.dateUpdated && (!newestSeen || c.dateUpdated > newestSeen)) {
          newestSeen = c.dateUpdated
        }

        const row = toPbsContact(c)
        const phoneDigits = digitsOnly(row.phone || '').slice(-10)  // last 10 digits, or ''
        const namePart    = `${(row.last_name||'').toLowerCase().trim()}|${(row.first_name||'').toLowerCase().trim()}`
        const zipPart     = (row.zip || '').replace(/\s/g, '').toLowerCase()
        const hasNameZip  = namePart !== '|' && zipPart !== ''

        // ── 1. Match on ghl_contact_id (already linked) ──────────────
        const { data: byGhl } = await sb.from('contacts')
          .select('id')
          .eq('ghl_contact_id', row.ghl_contact_id)
          .maybeSingle()
        if (byGhl?.id) {
          counts.would_update_by_ghl_id += 1
          collectSample('ghl_id', c, { id: byGhl.id })
          if (!dryRun) {
            const { error: uErr } = await sb.from('contacts').update(row).eq('id', byGhl.id)
            if (uErr) throw new Error('Update by ghl_id failed: ' + uErr.message)
          }
          recordsSynced += 1
          continue
        }

        // ── 2. Match on email (if PBS contact has no GHL link yet) ───
        if (row.email) {
          const { data: byEmail } = await sb.from('contacts')
            .select('id, first_name, last_name')
            .eq('email', row.email)
            .is('ghl_contact_id', null)
            .maybeSingle()
          if (byEmail?.id) {
            counts.would_update_by_email += 1
            collectSample('email', c, byEmail)
            if (!dryRun) {
              const { error: u2 } = await sb.from('contacts').update(row).eq('id', byEmail.id)
              if (u2) throw new Error('Update by email failed: ' + u2.message)
            }
            recordsSynced += 1
            continue
          }
        }

        // ── 3. Match on phone (last 10 digits, no GHL link yet) ──────
        if (phoneDigits.length >= 7) {  // require something beyond an area code
          // Postgres-side: compare regexp_replace(phone,'\D','','g') ENDS WITH our digits.
          // We approximate with a LIKE that targets the last 10 chars after stripping
          // by pulling candidates and re-checking in JS — simpler than a LIKE on a
          // computed column, and PBS only has ~5k contacts so the overhead is fine.
          const { data: phoneCands } = await sb.from('contacts')
            .select('id, first_name, last_name, phone, cell, ghl_contact_id')
            .or(`phone.ilike.%${phoneDigits.slice(-7)}%,cell.ilike.%${phoneDigits.slice(-7)}%`)
            .is('ghl_contact_id', null)
            .limit(50)
          const phoneHit = (phoneCands || []).find(p => {
            const pp = digitsOnly(p.phone || '').slice(-10)
            const cc = digitsOnly(p.cell  || '').slice(-10)
            return pp && pp === phoneDigits || cc && cc === phoneDigits
          })
          if (phoneHit?.id) {
            counts.would_update_by_phone += 1
            collectSample('phone', c, phoneHit)
            if (!dryRun) {
              const { error: u3 } = await sb.from('contacts').update(row).eq('id', phoneHit.id)
              if (u3) throw new Error('Update by phone failed: ' + u3.message)
            }
            recordsSynced += 1
            continue
          }
        }

        // ── 4. Match on name + zip (case-insensitive) ────────────────
        if (hasNameZip) {
          const { data: nzCands } = await sb.from('contacts')
            .select('id, first_name, last_name, zip, ghl_contact_id')
            .ilike('last_name', row.last_name || '')
            .ilike('first_name', row.first_name || '')
            .eq('zip', row.zip || '')
            .is('ghl_contact_id', null)
            .limit(5)
          const nzHit = (nzCands || [])[0]
          if (nzHit?.id) {
            counts.would_update_by_name_zip += 1
            collectSample('name_zip', c, nzHit)
            if (!dryRun) {
              const { error: u4 } = await sb.from('contacts').update(row).eq('id', nzHit.id)
              if (u4) throw new Error('Update by name+zip failed: ' + u4.message)
            }
            recordsSynced += 1
            continue
          }
        }

        // ── 5. No match — insert new ─────────────────────────────────
        counts.would_insert += 1
        collectSample('insert', c, null)
        if (!dryRun) {
          const { error: iErr } = await sb.from('contacts').insert(row)
          if (iErr) throw new Error('Insert failed: ' + iErr.message)
        }
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
    logMessage = logMessage || (
      dryRun
        ? `Dry run: ${counts.would_insert} would insert, ${counts.would_update_by_ghl_id + counts.would_update_by_email + counts.would_update_by_phone + counts.would_update_by_name_zip} would update.`
        : `Pulled ${recordsSynced} contact${recordsSynced === 1 ? '' : 's'}.`
    )

    if (dryRun) {
      // Don't touch sync state on dry runs — just return the preview.
      return json(200, {
        ok:      true,
        dry_run: true,
        ...counts,
        samples,
        pages,
      })
    }

    // Real run: update sync state on success.
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
      ...counts,
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
