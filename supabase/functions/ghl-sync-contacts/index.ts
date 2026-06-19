// supabase/functions/ghl-sync-contacts/index.ts
//
// Pulls GoHighLevel contacts into PBS.
//
// Two modes:
//
//   BULK mode  (inbound_synced_at is null, or full:true passed)
//     Sorts by dateAdded ASC via GET /contacts — stable across the full
//     record set so every contact is fetched regardless of dateUpdated.
//     Paginates via a numeric `page` cursor the UI passes back on each
//     loop call.  Does NOT update inbound_synced_at until the very last
//     page so a partial run can resume safely.
//
//   INCREMENTAL mode  (inbound_synced_at is set)
//     Sorts by dateUpdated DESC — newest contacts on page 1.  Stops
//     processing as soon as it sees a record at-or-before the watermark,
//     so only the delta since the last run is touched.  Updates the
//     watermark to the newest dateUpdated seen.
//
// Deduplication ladder (same in both modes):
//   1. ghl_contact_id match (already linked) → update
//   2. email match, no GHL link yet          → link + update
//   3. phone match (last 10 digits)           → link + update
//   4. name + zip match                       → link + update
//   5. no match                               → insert
//
// Auth: signed-in admin only.
//
// Request body:
//   { full?: boolean, dry_run?: boolean, start_page?: number }
//
// Response includes `next_page` when more records remain (bulk mode only).
// The UI passes start_page = next_page on the next call to resume.

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'npm:@supabase/supabase-js@2'

const GHL_BASE_URL    = 'https://services.leadconnectorhq.com'
const GHL_API_VERSION = '2021-07-28'
const PAGE_LIMIT      = 100

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
    .from('profiles').select('role').eq('id', user.id).maybeSingle()
  if (pErr) throw new Error('Failed to load profile: ' + pErr.message)
  const role = profile?.role
  if (role !== 'admin' && role !== 'super_admin') throw new Error('Admin role required.')
  return { userId: user.id }
}

// ── GHL types ──────────────────────────────────────────────────────────────

interface GhlDndChannelSetting {
  status?: 'active' | 'inactive'
  message?: string
  code?: string
}

interface GhlContact {
  id:           string
  locationId?:  string
  name?:        string        // combined full name (search endpoint)
  contactName?: string
  firstName?:   string
  lastName?:    string
  companyName?: string
  email?:       string
  phone?:       string
  address1?:    string
  address?:     string
  city?:        string
  state?:       string
  postalCode?:  string
  country?:     string
  timezone?:    string
  website?:     string
  source?:      string
  type?:        string
  tags?:        string[]
  dateAdded?:        string
  dateUpdated?:      string
  dateOfBirth?:      string
  lastActivityDate?: string
  assignedTo?:       string | { id?: string; name?: string }
  additionalEmails?: string[]
  // GHL returns additionalPhones as strings or {type,phoneNumber} objects
  additionalPhones?: Array<string | { type?: string; phoneNumber?: string; number?: string }>
  dnd?:              boolean
  dndSettings?: {
    Call?:     GhlDndChannelSetting
    Email?:    GhlDndChannelSetting
    SMS?:      GhlDndChannelSetting
    WhatsApp?: GhlDndChannelSetting
    GMB?:      GhlDndChannelSetting
    FB?:       GhlDndChannelSetting
  }
  customFields?: Array<{ id: string; fieldValue: unknown }>
}

interface GhlPagedResponse {
  contacts?: GhlContact[]
  meta?: {
    total?:        number
    currentPage?:  number
    nextPage?:     number | null
    prevPage?:     number | null
  }
}

interface GhlCustomFieldDef {
  id:        string
  name:      string
  fieldKey?: string
  dataType?: string
}

// ── API helpers ────────────────────────────────────────────────────────────

async function fetchContactsPage(args: {
  token:      string
  locationId: string
  page:       number
  bulk:       boolean   // true → sort by dateAdded ASC; false → sort by dateUpdated DESC
}): Promise<GhlPagedResponse> {
  // Use the GET /contacts endpoint — simpler and more reliable than POST /contacts/search.
  // GHL only accepts sortBy = 'date_added' | 'date_updated', ascending only (no sortOrder param).
  const sortBy = args.bulk ? 'date_added' : 'date_updated'
  const params = new URLSearchParams({
    locationId: args.locationId,
    page:       String(args.page),
    limit:      String(PAGE_LIMIT),
    sortBy,
  })
  const res = await fetch(`${GHL_BASE_URL}/contacts?${params}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${args.token}`,
      Version:       GHL_API_VERSION,
      Accept:        'application/json',
    },
  })
  let resp: unknown = null
  try { resp = await res.json() } catch { /* */ }
  if (!res.ok) {
    const msg = (resp as any)?.message || (resp as any)?.error || `GHL ${res.status}`
    throw new Error(msg)
  }
  // GET /contacts wraps results in { contacts: [...], meta: {...} } — same shape as search.
  return resp as GhlPagedResponse
}

// Fetches all users for the location and returns a userId → name map.
// Used to resolve assignedTo IDs to human-readable names.
async function fetchLocationUsers(
  token: string,
  locationId: string,
): Promise<Map<string, string>> {
  // Try two GHL endpoints — which one works depends on token scopes.
  const endpoints = [
    `${GHL_BASE_URL}/users?locationId=${locationId}`,
    `${GHL_BASE_URL}/locations/${locationId}/users`,
  ]
  for (const url of endpoints) {
    try {
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}`, Version: GHL_API_VERSION, Accept: 'application/json' },
      })
      if (!res.ok) continue
      const data: any = await res.json()
      const users: any[] = data?.users || data?.members || []
      if (!users.length) continue
      const map = new Map<string, string>()
      for (const u of users) {
        if (u.id && (u.name || u.firstName)) {
          const name = u.name || [u.firstName, u.lastName].filter(Boolean).join(' ')
          map.set(u.id, name)
        }
      }
      if (map.size > 0) return map
    } catch { /* try next */ }
  }
  return new Map()
}

async function fetchCustomFieldDefs(
  token: string,
  locationId: string,
): Promise<{ map: Map<string, string>; error: string | null }> {
  try {
    const res = await fetch(
      `${GHL_BASE_URL}/locations/${locationId}/customFields`,
      { headers: { Authorization: `Bearer ${token}`, Version: GHL_API_VERSION, Accept: 'application/json' } },
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
      if (d.name)     map.set(d.name.toLowerCase().trim(), d.id)
    }
    return { map, error: null }
  } catch (e: any) {
    return { map: new Map(), error: e?.message || 'Unknown error fetching custom fields.' }
  }
}

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

// Try multiple name/key variants and return the first match.
function extractCustomFieldByNames(
  customFields: GhlContact['customFields'],
  fieldKeyToId: Map<string, string>,
  ...names: string[]
): string | null {
  for (const name of names) {
    const val = extractCustomField(customFields, fieldKeyToId, name)
    if (val !== null) return val
  }
  return null
}

function toPbsContact(
  c: GhlContact,
  fieldKeyToId: Map<string, string>,
  userIdToName: Map<string, string>,
) {
  // Name — search endpoint may return combined `name` instead of split fields
  let firstName = (c.firstName || '').trim()
  let lastName  = (c.lastName  || '').trim()
  if (!firstName && !lastName) {
    const fallback = (c.name || c.contactName || c.companyName || '').trim()
    if (fallback.includes(' ')) {
      const parts = fallback.split(/\s+/)
      firstName = parts.slice(0, -1).join(' ')
      lastName  = parts[parts.length - 1]
    } else {
      lastName = fallback
    }
  }

  const dnd      = !!c.dnd
  const dndPhone = c.dndSettings?.Call?.status  === 'active' || dnd
  const dndEmail = c.dndSettings?.Email?.status === 'active' || dnd
  const dndSms   = c.dndSettings?.SMS?.status   === 'active' || dnd

  let ghlAssignedTo: string | null = null
  if (c.assignedTo) {
    if (typeof c.assignedTo === 'string') {
      // Resolve user ID → name; if map lookup fails store null (not the raw ID).
      ghlAssignedTo = userIdToName.get(c.assignedTo) || null
    } else {
      const obj = c.assignedTo as any
      ghlAssignedTo = obj.name || userIdToName.get(obj.id) || null
    }
  }

  const rawCustomFields = Array.isArray(c.customFields) && c.customFields.length
    ? c.customFields : null

  // Additional emails — GHL returns as string[]
  const additionalEmails = Array.isArray(c.additionalEmails) && c.additionalEmails.length
    ? c.additionalEmails.filter(e => typeof e === 'string' && e.trim()).map(e => (e as string).trim())
    : null

  // Additional phones — GHL returns as string[] OR {type, phoneNumber/number}[]
  const additionalPhones = Array.isArray(c.additionalPhones) && c.additionalPhones.length
    ? c.additionalPhones
        .map(p => typeof p === 'string' ? p.trim() : ((p as any).phoneNumber || (p as any).number || '').trim())
        .filter(Boolean)
    : null

  // Resolve consultation_type — must be 'Design' | 'Estimate' | null
  const rawConsultation = extractCustomFieldByNames(
    c.customFields, fieldKeyToId,
    'design or estimate consultation?',
    'design or estimate consultation',
    'consultation type',
  )
  let consultationType: string | null = null
  if (rawConsultation) {
    const lc = rawConsultation.toLowerCase()
    if (lc.includes('design'))   consultationType = 'Design'
    else if (lc.includes('estimate')) consultationType = 'Estimate'
  }

  return {
    ghl_contact_id:    c.id,
    ghl_synced_at:     new Date().toISOString(),
    // created_at is only meaningful on INSERT — callers strip it from UPDATE payloads.
    ...(c.dateAdded ? { created_at: c.dateAdded } : {}),
    first_name:        firstName,
    last_name:         lastName,
    company_name:      c.companyName || null,
    email:             c.email       || null,
    phone:             c.phone       || null,
    street_address:    c.address1 || c.address || null,
    city:              c.city       || null,
    state:             c.state      || null,
    zip:               c.postalCode || null,
    country:           c.country    || null,
    contact_type:      c.type       || null,
    source:            c.source     || null,
    tags:              Array.isArray(c.tags) && c.tags.length ? c.tags : null,
    website:           c.website    || null,
    timezone:          c.timezone   || null,
    dnd,
    dnd_phone:         dndPhone,
    dnd_email:         dndEmail,
    dnd_sms:           dndSms,
    date_of_birth:     c.dateOfBirth       || null,
    last_activity_at:  c.lastActivityDate  || null,
    ghl_assigned_to:   ghlAssignedTo,
    how_did_you_hear:  extractCustomFieldByNames(
      c.customFields, fieldKeyToId,
      'contact.how_did_you_hear_about_us',
      'how did you hear about us?',
      'how did you hear about us',
      'how_did_you_hear_about_us',
    ),
    campaign:          extractCustomFieldByNames(
      c.customFields, fieldKeyToId,
      'campaign',
      'campaign name',
      'marketing campaign',
    ),
    call_center_notes: extractCustomFieldByNames(
      c.customFields, fieldKeyToId,
      'call center notes',
      'call_center_notes',
    ),
    consultation_type: consultationType,
    interest_1:        extractCustomFieldByNames(
      c.customFields, fieldKeyToId,
      "i'm interested in #1",
      'i am interested in #1',
      "interested in #1",
      'interest 1',
    ),
    interest_2:        extractCustomFieldByNames(
      c.customFields, fieldKeyToId,
      "i'm interested in #2",
      'i am interested in #2',
      "interested in #2",
      'interest 2',
    ),
    interest_3:        extractCustomFieldByNames(
      c.customFields, fieldKeyToId,
      "i'm interested in (check all that apply)",
      'i am interested in (check all that apply)',
      "interested in (check all that apply)",
      'interest 3',
      'interested in',
    ),
    additional_emails: additionalEmails,
    additional_phones: additionalPhones,
    ghl_custom_fields: rawCustomFields,
    updated_at:        c.dateUpdated || new Date().toISOString(),
  }
}

// ── Main handler ───────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST')   return json(405, { error: 'Method not allowed' })

  const sb = adminClient()
  let recordsSynced = 0

  try {
    await requireAdmin(req)

    const reqBody   = await req.json().catch(() => ({}))
    const fullSync  = !!reqBody.full
    const dryRun    = !!reqBody.dry_run
    // start_page is passed by the UI on subsequent loop calls (bulk mode).
    const startPage = Math.max(1, parseInt(reqBody.start_page) || 1)

    const { data: conn, error: cErr } = await sb.from('ghl_connections')
      .select('access_token, location_id, contacts_enabled, tenant_id')
      .eq('singleton', true).maybeSingle()
    if (cErr) throw new Error('Failed to load connection: ' + cErr.message)
    if (!conn) throw new Error('No GHL connection saved. Configure it in Admin → Integrations.')
    // GHL is a single connection (one tenant's). Service-role bypasses RLS, so
    // scope every contacts read/write to this connection's tenant.
    const tenantId = conn.tenant_id
    if (!conn.contacts_enabled) {
      return json(200, { ok: true, skipped: true, reason: 'Contacts sync disabled.' })
    }

    const { data: state } = await sb.from('ghl_sync_state')
      .select('inbound_synced_at').eq('object_type', 'contacts').maybeSingle()

    // BULK mode when: no high-water-mark yet, full:true requested, or UI is
    // resuming a bulk run (start_page > 1).
    const sinceIso = state?.inbound_synced_at || null
    const bulkMode = fullSync || !sinceIso || startPage > 1

    const [{ map: fieldKeyToId, error: cfError }, userIdToName] = await Promise.all([
      fetchCustomFieldDefs(conn.access_token, conn.location_id),
      fetchLocationUsers(conn.access_token, conn.location_id),
    ])

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
      if (samples.length < 25) samples.push({
        reason,
        ghl: { id: ghl.id, name: ghl.name, firstName: ghl.firstName, lastName: ghl.lastName,
               contactName: ghl.contactName, companyName: ghl.companyName,
               email: ghl.email, phone: ghl.phone },
        pbs: pbs ? { id: pbs.id, first_name: pbs.first_name, last_name: pbs.last_name } : null,
      })
    }

    if (!dryRun) {
      await sb.from('ghl_sync_state')
        .update({ last_run_at: new Date().toISOString(), last_run_status: 'running', last_run_message: '' })
        .eq('object_type', 'contacts')
    }

    // Per-invocation budget — stay well inside Supabase's 150s wall time.
    // Each contact needs ~3-5 DB round-trips for dedup, so ~200ms each.
    const MAX_CONTACTS_PER_INVOCATION = 400
    const MAX_WALL_BUDGET_MS          = 95_000
    const startedAt = Date.now()

    let newestSeen: string | null = null
    let page = startPage
    let processedContacts = 0
    let lastPageWasFull   = true   // assume more until we see a short page

    while (true) {
      if (page > startPage + 100) { break }  // safety: max 100 pages per invocation

      const ghlPage = await fetchContactsPage({
        token:      conn.access_token,
        locationId: conn.location_id,
        page,
        bulk:       bulkMode,
      })
      const list = ghlPage.contacts || []

      // Log each page for debugging.
      try {
        await sb.from('ghl_sync_log').insert({
          tenant_id:      tenantId,
          object_type:    'contacts',
          direction:      'inbound',
          status:         'ok',
          records_synced: list.length,
          message:        `page ${page} (${bulkMode ? 'bulk' : 'incremental'}): got ${list.length}`,
        })
      } catch { /* best-effort */ }

      lastPageWasFull = list.length >= PAGE_LIMIT
      if (list.length === 0) break

      for (const c of list) {
        // In incremental mode GHL sorts date_updated ASC (oldest first), so we
        // skip contacts at-or-before the watermark and process the rest.
        if (!bulkMode && sinceIso && c.dateUpdated && c.dateUpdated <= sinceIso) {
          continue
        }

        if (seenGhlIds.has(c.id)) continue
        seenGhlIds.add(c.id)

        if (c.dateUpdated && (!newestSeen || c.dateUpdated > newestSeen)) {
          newestSeen = c.dateUpdated
        }

        const row = toPbsContact(c, fieldKeyToId, userIdToName)
        const phoneDigits = digitsOnly(row.phone || '').slice(-10)
        const namePart    = `${(row.last_name||'').toLowerCase().trim()}|${(row.first_name||'').toLowerCase().trim()}`
        const zipPart     = (row.zip || '').replace(/\s/g, '').toLowerCase()
        const hasNameZip  = namePart !== '|' && zipPart !== ''

        // 1. ghl_contact_id
        const { data: byGhl } = await sb.from('contacts')
          .select('id').eq('tenant_id', tenantId).eq('ghl_contact_id', row.ghl_contact_id).maybeSingle()
        // Strip created_at from all UPDATE payloads — it should only be set on INSERT.
        const { created_at: _ca, ...updateRow } = row as any

        if (byGhl?.id) {
          counts.would_update_by_ghl_id += 1
          collectSample('ghl_id', c, { id: byGhl.id })
          if (!dryRun) {
            const { error: uErr } = await sb.from('contacts').update(updateRow).eq('id', byGhl.id)
            if (uErr) throw new Error('Update by ghl_id failed: ' + uErr.message)
          }
          recordsSynced += 1; continue
        }

        // 2. email
        if (row.email) {
          const { data: byEmail } = await sb.from('contacts')
            .select('id, first_name, last_name').eq('tenant_id', tenantId).eq('email', row.email).is('ghl_contact_id', null).maybeSingle()
          if (byEmail?.id) {
            counts.would_update_by_email += 1
            collectSample('email', c, byEmail)
            if (!dryRun) {
              const { error: u2 } = await sb.from('contacts').update(updateRow).eq('id', byEmail.id)
              if (u2) throw new Error('Update by email failed: ' + u2.message)
            }
            recordsSynced += 1; continue
          }
        }

        // 3. phone
        if (phoneDigits.length >= 7) {
          const { data: phoneCands } = await sb.from('contacts')
            .select('id, first_name, last_name, phone, cell, ghl_contact_id')
            .eq('tenant_id', tenantId)
            .or(`phone.ilike.%${phoneDigits.slice(-7)}%,cell.ilike.%${phoneDigits.slice(-7)}%`)
            .is('ghl_contact_id', null).limit(50)
          const phoneHit = (phoneCands || []).find(p => {
            const pp = digitsOnly(p.phone || '').slice(-10)
            const cc = digitsOnly(p.cell  || '').slice(-10)
            return (pp && pp === phoneDigits) || (cc && cc === phoneDigits)
          })
          if (phoneHit?.id) {
            counts.would_update_by_phone += 1
            collectSample('phone', c, phoneHit)
            if (!dryRun) {
              const { error: u3 } = await sb.from('contacts').update(updateRow).eq('id', phoneHit.id)
              if (u3) throw new Error('Update by phone failed: ' + u3.message)
            }
            recordsSynced += 1; continue
          }
        }

        // 4. name + zip
        if (hasNameZip) {
          const { data: nzCands } = await sb.from('contacts')
            .select('id, first_name, last_name, zip, ghl_contact_id')
            .eq('tenant_id', tenantId)
            .ilike('last_name', row.last_name || '').ilike('first_name', row.first_name || '')
            .eq('zip', row.zip || '').is('ghl_contact_id', null).limit(5)
          const nzHit = (nzCands || [])[0]
          if (nzHit?.id) {
            counts.would_update_by_name_zip += 1
            collectSample('name_zip', c, nzHit)
            if (!dryRun) {
              const { error: u4 } = await sb.from('contacts').update(updateRow).eq('id', nzHit.id)
              if (u4) throw new Error('Update by name+zip failed: ' + u4.message)
            }
            recordsSynced += 1; continue
          }
        }

        // 5. insert
        counts.would_insert += 1
        collectSample('insert', c, null)
        if (!dryRun) {
          const { error: iErr } = await sb.from('contacts').insert({ ...row, tenant_id: tenantId })
          if (iErr) throw new Error('Insert failed: ' + iErr.message)
        }
        recordsSynced += 1
      }

      processedContacts += list.length
      page += 1

      if (!lastPageWasFull) break                               // natural end
      if (processedContacts >= MAX_CONTACTS_PER_INVOCATION) break  // per-invocation cap
      if (Date.now() - startedAt > MAX_WALL_BUDGET_MS) break       // wall-time guard
    }

    // Are there more records?  In bulk mode, more exist when the last page
    // was full AND we hit a budget cap (not a watermark or natural end).
    const budgetHit = processedContacts >= MAX_CONTACTS_PER_INVOCATION
                   || Date.now() - startedAt > MAX_WALL_BUDGET_MS
    const moreExist = bulkMode && lastPageWasFull && budgetHit
    const nextPage  = moreExist ? page : null

    const logMsg = dryRun
      ? `Dry run: ${counts.would_insert} insert, ${counts.would_update_by_ghl_id + counts.would_update_by_email + counts.would_update_by_phone + counts.would_update_by_name_zip} update.`
      : `Pulled ${recordsSynced} (pages ${startPage}–${page - 1}, ${bulkMode ? 'bulk' : 'incremental'}).${nextPage ? ` Next page: ${nextPage}.` : ' Done.'}`

    if (dryRun) {
      return json(200, {
        ok: true, dry_run: true,
        ...counts, samples,
        bulk_mode: bulkMode,
        next_page: nextPage,
        custom_fields_mapped: fieldKeyToId.size,
        custom_fields_error:  cfError || undefined,
      })
    }

    // Update sync state.
    // In bulk mode we only set inbound_synced_at on the final page so that
    // a crash mid-run doesn't set a watermark that skips unprocessed contacts.
    const newWatermark = !nextPage
      ? (newestSeen || sinceIso || new Date().toISOString())
      : sinceIso   // leave unchanged during a multi-invocation bulk run

    await sb.from('ghl_sync_state').update({
      inbound_synced_at: newWatermark,
      last_run_at:       new Date().toISOString(),
      last_run_status:   'ok',
      last_run_message:  logMsg,
    }).eq('object_type', 'contacts')

    try {
      await sb.rpc('add_to_ghl_inbound_count', { p_object_type: 'contacts', p_n: recordsSynced })
    } catch { /* optional RPC */ }

    await sb.from('ghl_sync_log').insert({
      tenant_id:      tenantId,
      object_type:    'contacts',
      direction:      'inbound',
      status:         'ok',
      records_synced: recordsSynced,
      message:        logMsg,
    })

    return json(200, {
      ok:                   true,
      records_synced:       recordsSynced,
      inbound_synced_at:    newWatermark,
      bulk_mode:            bulkMode,
      next_page:            nextPage,
      // `remaining` kept for UI compatibility — non-zero signals the loop to continue
      remaining:            nextPage ? 1 : 0,
      custom_fields_mapped: fieldKeyToId.size,
      custom_fields_error:  cfError || undefined,
      ...counts,
    })
  } catch (e) {
    const msg = (e as Error)?.message || 'Unknown error'
    try {
      await sb.from('ghl_sync_state').update({
        last_run_at: new Date().toISOString(), last_run_status: 'error', last_run_message: msg,
      }).eq('object_type', 'contacts')
      await sb.from('ghl_sync_log').insert({
        object_type: 'contacts', direction: 'inbound', status: 'error',
        records_synced: recordsSynced, message: msg, error_payload: { error: msg },
      })
    } catch { /* */ }
    const status = /signed in|Authorization|Admin role/i.test(msg) ? 401 : 500
    return json(status, { ok: false, error: msg })
  }
})
