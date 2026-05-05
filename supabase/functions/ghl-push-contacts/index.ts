// supabase/functions/ghl-push-contacts/index.ts
//
// Pushes PBS contacts UP to GoHighLevel.
//
// Behaviour:
//   • Selects PBS contacts that need pushing:
//        - ghl_contact_id IS NULL              (new — never been to GHL)
//        - OR updated_at > ghl_synced_at       (modified locally since last push)
//   • Processes BATCH_SIZE rows per invocation. Edge Functions have ~150s
//     wall time; 200 rows × ~250ms/req with rate-limit pacing comfortably
//     fits. The response includes `remaining` so the UI can call again
//     until 0.
//   • Uses GHL's POST /contacts/upsert which natively dedupes on email +
//     phone server-side. So even if a PBS contact happens to already
//     exist in GHL (manual entry, prior sync), GHL won't create a dup;
//     we just stamp the returned id back on the PBS row.
//   • Updates ghl_sync_state.outbound_synced_at + appends a sync_log row.
//
// Auth: signed-in admin only.
//
// Request body (POST JSON):
//   {
//     dry_run?: boolean,    // count by category, write nothing
//     limit?:   number,     // override default batch size (max 500)
//   }

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const GHL_BASE_URL    = 'https://services.leadconnectorhq.com'
const GHL_API_VERSION = '2021-07-28'
const DEFAULT_BATCH   = 200    // contacts per invocation
const MAX_BATCH       = 500    // hard ceiling so we don't blow the timeout
const PER_REQ_DELAY_MS = 120   // ~8 req/sec; well under GHL's 10 rps limit

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
    .select('role').eq('id', user.id).maybeSingle()
  if (pErr) throw new Error('Failed to load profile: ' + pErr.message)
  const role = profile?.role
  if (role !== 'admin' && role !== 'super_admin') throw new Error('Admin role required.')
  return { userId: user.id }
}

// Build the GHL upsert payload from a PBS contacts row.
function toGhlPayload(c: any, locationId: string) {
  const payload: Record<string, unknown> = {
    locationId,
    firstName:   c.first_name || undefined,
    lastName:    c.last_name  || undefined,
    name:        [c.first_name, c.last_name].filter(Boolean).join(' ').trim() || undefined,
    companyName: c.company_name || undefined,
    email:       c.email      || undefined,
    phone:       c.phone || c.cell || undefined,
    address1:    c.street_address || undefined,
    city:        c.city  || undefined,
    state:       c.state || undefined,
    postalCode:  c.zip   || undefined,
    source:      c.source || undefined,
  }
  if (Array.isArray(c.tags) && c.tags.length) payload.tags = c.tags
  // Drop undefined keys so we don't send them.
  for (const k of Object.keys(payload)) {
    if (payload[k] === undefined || payload[k] === '') delete payload[k]
  }
  return payload
}

async function ghlUpsert(token: string, payload: Record<string, unknown>): Promise<{
  id: string
  isNew: boolean
}> {
  const res = await fetch(`${GHL_BASE_URL}/contacts/upsert`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      Version:       GHL_API_VERSION,
      Accept:        'application/json',
      'Content-Type':'application/json',
    },
    body: JSON.stringify(payload),
  })
  let body: any = null
  try { body = await res.json() } catch { /* */ }
  if (!res.ok) {
    const msg = body?.message || body?.error || `GHL ${res.status}`
    const err: any = new Error(msg)
    err.status = res.status
    err.payload = body
    throw err
  }
  // GHL response shape varies slightly across versions. Be defensive.
  const id    = body?.contact?.id || body?.id
  const isNew = !!(body?.new ?? body?.isNew ?? body?.created)
  if (!id) throw new Error('GHL upsert response missing contact id.')
  return { id, isNew }
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST')   return json(405, { error: 'Method not allowed' })

  const sb = adminClient()
  let pushedCount = 0
  let createdCount = 0
  let updatedCount = 0
  let errorCount   = 0
  const errors: Array<{ pbs_id: string; message: string }> = []

  try {
    await requireAdmin(req)

    const reqBody = await req.json().catch(() => ({}))
    const dryRun  = !!reqBody.dry_run
    const limit   = Math.min(Number(reqBody.limit) || DEFAULT_BATCH, MAX_BATCH)

    const { data: conn, error: cErr } = await sb.from('ghl_connections')
      .select('access_token, location_id, contacts_enabled')
      .eq('singleton', true)
      .maybeSingle()
    if (cErr)  throw new Error('Failed to load connection: ' + cErr.message)
    if (!conn) throw new Error('No GHL connection saved. Configure it in Admin → Integrations.')
    if (!conn.contacts_enabled) {
      return json(200, { ok: true, skipped: true, reason: 'Contacts sync disabled.' })
    }

    // Mark running.
    if (!dryRun) {
      await sb.from('ghl_sync_state')
        .update({ last_run_at: new Date().toISOString(), last_run_status: 'running', last_run_message: '' })
        .eq('object_type', 'contacts')
    }

    // Find pushable rows. We don't try to compare updated_at > ghl_synced_at
    // in SQL because Postgres NULL semantics make it awkward; instead pull
    // (a) all rows with no GHL link and (b) all rows whose ghl_synced_at is
    // older than updated_at, and union them in JS. With 5k contacts the
    // round-trip is trivial.
    const [{ data: noLink, error: nErr }, { data: stale, error: sErr }] = await Promise.all([
      sb.from('contacts')
        .select('id, first_name, last_name, company_name, email, phone, cell, street_address, city, state, zip, source, tags, updated_at, ghl_synced_at, ghl_contact_id')
        .is('ghl_contact_id', null)
        .order('id', { ascending: true })
        .limit(limit),
      sb.from('contacts')
        .select('id, first_name, last_name, company_name, email, phone, cell, street_address, city, state, zip, source, tags, updated_at, ghl_synced_at, ghl_contact_id')
        .not('ghl_contact_id', 'is', null)
        // Postgres treats `updated_at > ghl_synced_at` as NULL when ghl_synced_at is null,
        // and we already excluded those above. The remaining rows are eligible.
        .gt('updated_at', 'ghl_synced_at')   // textual comparison; both timestamptz
        .order('updated_at', { ascending: true })
        .limit(limit),
    ])
    if (nErr) throw new Error('Failed to load no-link rows: ' + nErr.message)
    if (sErr) throw new Error('Failed to load stale rows: '   + sErr.message)

    // Combine + de-dupe by id; cap at limit. New rows first so initial
    // bulk push works through your backlog before chasing tiny edits.
    const seen = new Set<string>()
    const queue: any[] = []
    for (const r of [...(noLink || []), ...(stale || [])]) {
      if (seen.has(r.id)) continue
      seen.add(r.id)
      queue.push(r)
      if (queue.length >= limit) break
    }

    // For an accurate `remaining`, count everything that *would* push
    // beyond what fits in this batch.
    const [{ count: noLinkTotal }, { count: staleTotal }] = await Promise.all([
      sb.from('contacts').select('id', { count: 'exact', head: true }).is('ghl_contact_id', null),
      sb.from('contacts').select('id', { count: 'exact', head: true })
        .not('ghl_contact_id', 'is', null).gt('updated_at', 'ghl_synced_at'),
    ])
    const totalEligible = (noLinkTotal || 0) + (staleTotal || 0)

    if (dryRun) {
      // Sample up to 25 rows from the head of the queue.
      const samples = queue.slice(0, 25).map(r => ({
        pbs_id:  r.id,
        kind:    r.ghl_contact_id ? 'update' : 'create',
        first_name: r.first_name, last_name: r.last_name, email: r.email,
      }))
      return json(200, {
        ok:                  true,
        dry_run:             true,
        would_create:        (noLinkTotal || 0),
        would_update:        (staleTotal || 0),
        total_eligible:      totalEligible,
        next_batch_size:     queue.length,
        samples,
      })
    }

    // Real run: walk the queue, upsert each, stamp the id back.
    const nowIso = new Date().toISOString()
    for (const r of queue) {
      try {
        const payload = toGhlPayload(r, conn.location_id)
        const { id, isNew } = await ghlUpsert(conn.access_token, payload)
        await sb.from('contacts')
          .update({ ghl_contact_id: id, ghl_synced_at: nowIso })
          .eq('id', r.id)
        pushedCount += 1
        if (isNew) createdCount += 1; else updatedCount += 1
        if (PER_REQ_DELAY_MS > 0) await sleep(PER_REQ_DELAY_MS)
      } catch (e: any) {
        errorCount += 1
        errors.push({ pbs_id: r.id, message: e?.message || 'unknown' })
        // Don't bail — log and keep going. Network blips on row N shouldn't
        // tank rows N+1..N+200.
      }
    }

    const remaining = Math.max(0, totalEligible - pushedCount)
    const message = `Pushed ${pushedCount} (${createdCount} new, ${updatedCount} updated). ` +
                    (remaining > 0 ? `${remaining} remaining.` : 'Done.') +
                    (errorCount > 0 ? ` ${errorCount} errors.` : '')

    await sb.from('ghl_sync_state').update({
      outbound_synced_at: nowIso,
      last_run_at:        nowIso,
      last_run_status:    errorCount ? 'error' : 'ok',
      last_run_message:   message,
    }).eq('object_type', 'contacts')

    await sb.from('ghl_sync_log').insert({
      object_type:    'contacts',
      direction:      'outbound',
      status:         errorCount ? 'error' : 'ok',
      records_synced: pushedCount,
      message,
      error_payload:  errors.length ? { errors: errors.slice(0, 50) } : null,
    })

    return json(200, {
      ok:               true,
      pushed:           pushedCount,
      created:          createdCount,
      updated:          updatedCount,
      errors:           errorCount,
      first_errors:     errors.slice(0, 10),
      remaining,
      total_eligible:   totalEligible,
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
        direction:      'outbound',
        status:         'error',
        records_synced: pushedCount,
        message:        msg,
        error_payload:  { error: msg },
      })
    } catch { /* */ }
    const status = /signed in|Authorization|Admin role/i.test(msg) ? 401 : 500
    return json(status, { ok: false, error: msg })
  }
})
