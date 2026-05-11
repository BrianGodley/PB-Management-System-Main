// supabase/functions/ghl-sync-contacts/index.ts
//
// Pulls GoHighLevel contacts into PBS.
//
// Behaviour:
//   • Pulls contacts whose dateUpdated is newer than the saved
//     ghl_sync_state.inbound_synced_at (full pull on the first run).
//   • Pages through GHL's POST /contacts/search endpoint with limit=100.
//   • Upserts into public.contacts using a deduplication ladder:
//        1. exact match on ghl_contact_id
//        2. exact match on email   (PBS contact must have no GHL link yet)
//        3. exact match on phone   (digits-only, last 10 digits — same)
//        4. exact match on (last_name + first_name + zip), all lowercased
//        5. otherwise insert new
//     Each rung is only tried if the previous didn't match. Steps 2-4
//     also stamp the matched PBS row with the GHL id so future syncs
//     skip straight to step 1.
//   • Fetches GHL custom field definitions once per run so known fieldKeys
//     can be extracted into dedicated PBS columns.
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

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const GHL_BASE_URL    = 'https://services.leadconnectorhq.com'
const GHL_API_VERSION = '2021-07-28'
const PAGE_LIMIT      = 100   // GHL's max for /contacts/search

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

// ── GHL API type definitions ───────────────────────────────────────────────

interface GhlDndChannelSetting {
  status?: 'active' | 'inactive'
  message?: string
  code?: string
}

interface GhlContact {
  id:           string
  locationId?:  string
  // Name fields — search endpoint may return combined `name` instead of split fields
  name?:        string   // combined full name (returned by search endpoint)
  contactName?: string   // alias GHL uses in some versions
  firstName?:   string
  lastName?:    string
  companyName?: string
  email?:       string
  phone?:       string
  address1?:    string
  address?:     string  // older API fallback
  city?:        string
  state?:       string
  postalCode?:  string
  country?:     string
  timezone?:    string
  website?:     string
  source?:      string
  type?:        string  // contact type: "lead" | "customer" | etc.
  tags?:        string[]
  dateAdded?:   string
  dateUpdated?: string
  // assignedTo can be a plain id string or an object depending on GHL version
  assignedTo?:  string | { id?: string; name?: string }
  // DND
  dnd?:         boolean
  dndSettings?: {
    Call?:      GhlDndChannelSetting
    Email?:     GhlDndChannelSetting
    SMS?:       GhlDndChannelSetting
    WhatsApp?:  GhlDndChannelSetting
    GMB?:       GhlDndChannelSetting
    FB?:        GhlDndChannelSetting
  }
  // Custom fields returned as [{id, fieldValue}]
  customFields?: Array<{ id: string; fieldValue: unknown }>
}

interface GhlPagedResponse {
  contacts?: GhlContact[]
  meta?: {
    total?:        number
    nextPageUrl?:  string | null
    startAfter?:   number
    startAfterId?: string | null
    currentPage?:  number
    nextPage?:     number | null
    prevPage?:     number | null
  }
}

// GHL custom field definition from GET /locations/{id}/customFields
interface GhlCustomFieldDef {
  id:        string
  name:      string
  fieldKey?: string  // e.g. "contact.how_did_you_hear_about_us"
  dataType?: string
}

// ── GHL API helpers ────────────────────────────────────────────────────────

// Fetch one page of contacts via the v2 search endpoint.
// POST /contacts/search returns a real `total` in meta so we can accurately
// detect when pagination is done.
async function fetchContactsPage(args: {
  token:      string
  locationId: string
  page:       number
  sinceIso?:  string | null
}): Promise<GhlPagedResponse> {
  const body: Record<string, unknown> = {
    locationId: args.locationId,
    page:       args.page,
    pageLimit:  PAGE_LIMIT,
    sort: [{ field: 'dateUpdated', direction: 'asc' }],
  }
  if (args.sinceIso) {
    body.filters = [
      { field: 'dateUpdated', operator: 'gte', value: args.sinceIso },
    ]
  }

  const res = await fetch(`${GHL_BASE_URL}/contacts/search`, {
    method: 'POST',
    headers: {
      Authorization:  `Bearer ${args.token}`,
      Version:        GHL_API_VERSION,
      Accept:         'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  let resp: unknown = null
  try { resp = await res.json() } catch { /* */ }
  if (!res.ok) {
    const msg = (resp as any)?.message || (resp as any)?.error || `GHL ${res.status}`
    throw new Error(msg)
  }
  return resp as GhlPagedResponse
}

// Fetch all custom field definitions for the location so we can map
// fieldKey → fieldId lookups.  Returns { map, error }.
// Failure is non-fatal — the sync continues with standard fields only.
// Common failure reason: the PIT does not have "Locations" scope granted
// in the GHL sub-account settings.
async function fetchCustomFieldDefs(
  token: string,
  locationId: string,
): Promise<{ map: Map<string, string>; error: string | null }> {
  try {
    const res = await fetch(
      `${GHL_BASE_URL}/locations/${locationId}/customFields`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Version:       GHL_API_VERSION,
          Accept:        'application/json',
        },
      },
    )
    if (!res.ok) {
      let errText = `HTTP ${res.status}`
      try { const b: any = await res.json(); errText = b?.message || b?.error || errText } catch { /* */ }
      return {
        map:   new Map(),
        error: `Could not load custom field definitions (${errText}). ` +
               `Grant "Locations" scope to your Private Integration Token in GHL → Settings → Integrations.`,
      }
    }
    const data: any = await res.json()
    const defs: GhlCustomFieldDef[] = data?.customFields || data?.fields || []
    const map = new Map<string, string>()
    for (const d of defs) {
      if (d.fieldKey) map.set(d.fieldKey, d.id)
      if (d.name) map.set(d.name.toLowerCase().trim(), d.id)
    }
    return { map, error: null }
  } catch (e: any) {
    return { map: new Map(), error: e?.message || 'Unknown error fetching custom fields.' }
  }
}

// Extract a single custom field value by its fieldKey.
// e.g. extractCustomField(c.customFields, fieldKeyToId, 'contact.how_did_you_hear_about_us')
function extractCustomField(
  customFields: GhlContact['customFields'],
  fieldKeyToId: Map<string, string>,
  fieldKey: string,
): string | null {
  if (!Array.isArray(customFields) || !customFields.length) return null
  const id = fieldKeyToId.get(fieldKey)
  if (!id) return null
  const entry = customFields.find(f => f.id === id)
  if (!entry) return null
  const v = entry.fieldValue
  if (v == null) return null
  if (Array.isArray(v)) return v.join(', ')
  return String(v).trim() || null
}

// Map a GHL contact onto the PBS contacts schema.
//
// PBS contacts.first_name and last_name are NOT NULL, so we coalesce to
// empty strings rather than null. If a GHL contact carries neither a
// first_name nor a last_name (a company-only contact, very common for
// vendors and HOAs in GHL), we drop the company name into last_name so
// the row has something readable.
function toPbsContact(
  c: GhlContact,
  fieldKeyToId: Map<string, string>,
) {
  // ── Name normalisation ──────────────────────────────────────────────────
  // The search endpoint may return a combined `name` field instead of
  // separate firstName / lastName. Fall through several options.
  let firstName = (c.firstName || '').trim()
  let lastName  = (c.lastName  || '').trim()
  if (!firstName && !lastName) {
    // Try combined name sources: `name`, `contactName`, then `companyName`.
    const fallback = (c.name || c.contactName || c.companyName || '').trim()
    if (fallback.includes(' ')) {
      const parts = fallback.split(/\s+/)
      firstName = parts.slice(0, -1).join(' ')
      lastName  = parts[parts.length - 1]
    } else {
      lastName = fallback
    }
  }

  // ── DND — overall flag + per-channel flags from dndSettings ────────────
  const dnd      = !!c.dnd
  const dndPhone = c.dndSettings?.Call?.status  === 'active' ? true : (dnd || false)
  const dndEmail = c.dndSettings?.Email?.status === 'active' ? true : (dnd || false)
  const dndSms   = c.dndSettings?.SMS?.status   === 'active' ? true : (dnd || false)

  // ── assignedTo — GHL may return a string id or {id, name} object ───────
  let ghlAssignedTo: string | null = null
  if (c.assignedTo) {
    if (typeof c.assignedTo === 'string') {
      ghlAssignedTo = c.assignedTo || null
    } else if (typeof c.assignedTo === 'object') {
      // Prefer the name if available so it's human-readable in the DB.
      ghlAssignedTo = (c.assignedTo as any).name || (c.assignedTo as any).id || null
    }
  }

  // ── Custom fields ───────────────────────────────────────────────────────
  // Store the full array as JSONB for queryability, then extract known keys
  // into dedicated columns.
  const rawCustomFields = Array.isArray(c.customFields) && c.customFields.length
    ? c.customFields
    : null

  const howDidYouHear = extractCustomField(
    c.customFields, fieldKeyToId, 'contact.how_did_you_hear_about_us',
  )

  return {
    // Identity / linkage
    ghl_contact_id:    c.id,
    ghl_synced_at:     new Date().toISOString(),

    // Name
    first_name:        firstName,   // never null (NOT NULL column)
    last_name:         lastName,    // never null (NOT NULL column)

    // Contact info
    company_name:      c.companyName || null,
    email:             c.email       || null,
    phone:             c.phone       || null,

    // Address
    street_address:    c.address1 || c.address || null,
    city:              c.city       || null,
    state:             c.state      || null,
    zip:               c.postalCode || null,
    country:           c.country    || null,

    // Contact metadata
    contact_type:      c.type       || null,  // "lead" | "customer" | etc.
    source:            c.source     || null,
    tags:              Array.isArray(c.tags) && c.tags.length ? c.tags : null,
    website:           c.website    || null,
    timezone:          c.timezone   || null,

    // DND
    dnd:               dnd,
    dnd_phone:         dndPhone,
    dnd_email:         dndEmail,
    dnd_sms:           dndSms,

    // Assignment
    ghl_assigned_to:   ghlAssignedTo,

    // Known custom fields extracted into dedicated columns
    how_did_you_hear:  howDidYouHear,

    // Full custom fields blob for anything else
    ghl_custom_fields: rawCustomFields,

    // GHL audit timestamps
    updated_at:        c.dateUpdated || new Date().toISOString(),
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

    const reqBody  = await req.json().catch(() => ({}))
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

    // Fetch custom field definitions so we can map known field keys to ids.
    const { map: fieldKeyToId, error: cfError } = await fetchCustomFieldDefs(conn.access_token, conn.location_id)

    // Helpers + accumulator for the dedup ladder.
    const digitsOnly = (s: string) => (s || '').replace(/\D/g, '')
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

    const MAX_RECORDS_PER_INVOCATION = 500
    const MAX_WALL_BUDGET_MS         = 100_000   // 100s, leaves headroom for 150s limit
    const startedAt = Date.now()
    let newestSeen: string | null = null
    let pages = 0
    let reportedTotal: number | null = null
    let processedCount = 0

    while (true) {
      pages += 1
      if (pages > 200) {
        logMessage = 'Aborted after 200 pages — possible loop.'
        break
      }
      const page = await fetchContactsPage({
        token:      conn.access_token,
        locationId: conn.location_id,
        page:       pages,
        sinceIso,
      })
      const list = page.contacts || []
      if (page.meta?.total != null) reportedTotal = page.meta.total

      try {
        await sb.from('ghl_sync_log').insert({
          object_type:    'contacts',
          direction:      'inbound',
          status:         'ok',
          records_synced: list.length,
          message:        `page ${pages}: got ${list.length}, total reported ${reportedTotal ?? 'n/a'}`,
        })
      } catch { /* log is best-effort */ }

      if (list.length === 0) break

      const fresh = sinceIso
        ? list.filter(c => c.dateUpdated && c.dateUpdated > sinceIso)
        : list

      for (const c of fresh) {
        if (seenGhlIds.has(c.id)) continue
        seenGhlIds.add(c.id)

        if (c.dateUpdated && (!newestSeen || c.dateUpdated > newestSeen)) {
          newestSeen = c.dateUpdated
        }

        const row = toPbsContact(c, fieldKeyToId)
        const phoneDigits = digitsOnly(row.phone || '').slice(-10)
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

        // ── 2. Match on email (PBS contact has no GHL link yet) ───────
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

        // ── 3. Match on phone (last 10 digits, no GHL link yet) ───────
        if (phoneDigits.length >= 7) {
          const { data: phoneCands } = await sb.from('contacts')
            .select('id, first_name, last_name, phone, cell, ghl_contact_id')
            .or(`phone.ilike.%${phoneDigits.slice(-7)}%,cell.ilike.%${phoneDigits.slice(-7)}%`)
            .is('ghl_contact_id', null)
            .limit(50)
          const phoneHit = (phoneCands || []).find(p => {
            const pp = digitsOnly(p.phone || '').slice(-10)
            const cc = digitsOnly(p.cell  || '').slice(-10)
            return (pp && pp === phoneDigits) || (cc && cc === phoneDigits)
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

        // ── 4. Match on name + zip (case-insensitive) ─────────────────
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

        // ── 5. No match — insert new ──────────────────────────────────
        counts.would_insert += 1
        collectSample('insert', c, null)
        if (!dryRun) {
          const { error: iErr } = await sb.from('contacts').insert(row)
          if (iErr) throw new Error('Insert failed: ' + iErr.message)
        }
        recordsSynced += 1
      }

      processedCount += list.length
      if (list.length < PAGE_LIMIT) break
      if (reportedTotal != null && processedCount >= reportedTotal) break
      if (processedCount >= MAX_RECORDS_PER_INVOCATION) break
      if (Date.now() - startedAt > MAX_WALL_BUDGET_MS) break
    }

    inboundSyncedAt = newestSeen || (state?.inbound_synced_at ?? null)
    logMessage = logMessage || (
      dryRun
        ? `Dry run: ${counts.would_insert} would insert, ${counts.would_update_by_ghl_id + counts.would_update_by_email + counts.would_update_by_phone + counts.would_update_by_name_zip} would update.`
        : `Pulled ${recordsSynced} contact${recordsSynced === 1 ? '' : 's'}.`
    )

    if (dryRun) {
      const remaining = (reportedTotal != null)
        ? Math.max(0, reportedTotal - processedCount)
        : 0
      return json(200, {
        ok:      true,
        dry_run: true,
        ...counts,
        samples,
        pages,
        remaining,
        total_eligible:         reportedTotal,
        custom_fields_mapped:   fieldKeyToId.size,
        custom_fields_error:    cfError || undefined,
      })
    }

    // Real run: update sync state on success.
    await sb.from('ghl_sync_state').update({
      inbound_synced_at:    inboundSyncedAt,
      last_run_at:          new Date().toISOString(),
      last_run_status:      'ok',
      last_run_message:     logMessage,
    }).eq('object_type', 'contacts')

    try {
      await sb.rpc('add_to_ghl_inbound_count', { p_object_type: 'contacts', p_n: recordsSynced })
    } catch { /* RPC is optional; ignore if not present */ }

    await sb.from('ghl_sync_log').insert({
      object_type:    'contacts',
      direction:      'inbound',
      status:         'ok',
      records_synced: recordsSynced,
      message:        logMessage,
    })

    const remaining = (reportedTotal != null)
      ? Math.max(0, reportedTotal - processedCount)
      : 0
    return json(200, {
      ok:                     true,
      records_synced:         recordsSynced,
      inbound_synced_at:      inboundSyncedAt,
      pages,
      remaining,
      total_eligible:         reportedTotal,
      custom_fields_mapped:   fieldKeyToId.size,
      custom_fields_error:    cfError || undefined,
      ...counts,
    })
  } catch (e) {
    const msg = (e as Error)?.message || 'Unknown error'
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
