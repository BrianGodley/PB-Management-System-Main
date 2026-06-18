// supabase/functions/drive-sync/index.ts
//
// Hands-off, server-side Google Drive -> PBS sync. No browser required.
//
// HOW IT WORKS
//  - Authenticates as a Google **service account** with domain-wide delegation,
//    impersonating GDRIVE_IMPERSONATE so it can read every Shared Drive that
//    user can see (scope: drive.readonly).
//  - Mirrors each Shared Drive into a matching pbs_drives row + storage under
//    drives/<pbsId>/...  (same layout as the in-app "Copy all -> PBS" tool).
//  - Resumable: folders to visit live in drive_sync_queue; files are tracked in
//    drive_sync_files (manifest) so re-runs SKIP unchanged files and RE-COPY
//    changed ones (compares Drive modifiedTime).
//  - Beats the function time limit by working for a time budget, then
//    self-invoking ({continue:true}) until the queue drains.
//
// SECRETS (supabase secrets set ...)
//   GDRIVE_SA_KEY        full service-account JSON (one line)
//   GDRIVE_IMPERSONATE   e.g. brian@picturebuild.com
// Auto-provided by the platform: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const BUCKET = 'company-files'
const FOLDER_MIME = 'application/vnd.google-apps.folder'
const FILE_FIELDS =
  'files(id,name,mimeType,modifiedTime,size),nextPageToken'
const TIME_BUDGET_MS = 110_000 // stop near this, then self-chain
const SCOPE = 'https://www.googleapis.com/auth/drive.readonly'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const IMPERSONATE = Deno.env.get('GDRIVE_IMPERSONATE') || ''

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
}
const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

// ── Service-account JWT -> access token (with user impersonation) ────────────
function bytesToB64(bytes: Uint8Array) {
  let bin = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) bin += String.fromCharCode(...bytes.subarray(i, i + chunk))
  return btoa(bin)
}
const b64url = (s: string) => s.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
function pemToPkcs8(pem: string) {
  const b64 = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\s+/g, '')
  const bin = atob(b64)
  const buf = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i)
  return buf.buffer
}
async function getAccessToken(sa: any) {
  const now = Math.floor(Date.now() / 1000)
  const header = b64url(btoa(JSON.stringify({ alg: 'RS256', typ: 'JWT' })))
  const claims = b64url(
    btoa(
      JSON.stringify({
        iss: sa.client_email,
        sub: IMPERSONATE || undefined,
        scope: SCOPE,
        aud: 'https://oauth2.googleapis.com/token',
        iat: now,
        exp: now + 3600,
      })
    )
  )
  const unsigned = `${header}.${claims}`
  const key = await crypto.subtle.importKey(
    'pkcs8',
    pemToPkcs8(sa.private_key),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const sig = new Uint8Array(
    await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(unsigned))
  )
  const jwt = `${unsigned}.${b64url(bytesToB64(sig))}`
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  })
  const j = await res.json()
  if (!j.access_token) throw new Error('Google token error: ' + JSON.stringify(j))
  return j.access_token as string
}

// ── Drive REST helpers ───────────────────────────────────────────────────────
async function gfetch(token: string, path: string) {
  for (let attempt = 0; attempt < 4; attempt++) {
    const res = await fetch(`https://www.googleapis.com/drive/v3/${path}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (res.status === 429 || res.status >= 500) {
      await new Promise(r => setTimeout(r, 1000 * (attempt + 1)))
      continue
    }
    return res
  }
  throw new Error('Drive request failed after retries: ' + path)
}
async function listSharedDrives(token: string) {
  const out: any[] = []
  let pageToken = ''
  do {
    const p = new URLSearchParams({ pageSize: '100', fields: 'drives(id,name),nextPageToken' })
    if (pageToken) p.set('pageToken', pageToken)
    const r = await gfetch(token, `drives?${p.toString()}`)
    const j = await r.json()
    out.push(...(j.drives || []))
    pageToken = j.nextPageToken || ''
  } while (pageToken)
  return out
}
async function listChildren(token: string, parentId: string, driveId: string) {
  const out: any[] = []
  let pageToken = ''
  do {
    const p = new URLSearchParams({
      q: `'${parentId}' in parents and trashed=false`,
      fields: FILE_FIELDS,
      pageSize: '500',
      supportsAllDrives: 'true',
      includeItemsFromAllDrives: 'true',
      corpora: 'drive',
      driveId,
    })
    if (pageToken) p.set('pageToken', pageToken)
    const r = await gfetch(token, `files?${p.toString()}`)
    const j = await r.json()
    out.push(...(j.files || []))
    pageToken = j.nextPageToken || ''
  } while (pageToken)
  return out
}

// ── Main ──────────────────────────────────────────────────────────────────────
Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  const sb = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } })

  let body: any = {}
  try {
    body = await req.json()
  } catch {
    /* cron sends a body; manual hits may not */
  }

  // Service-account key
  let sa: any
  try {
    sa = JSON.parse(Deno.env.get('GDRIVE_SA_KEY') || '')
  } catch {
    return json(500, { error: 'GDRIVE_SA_KEY is not set or not valid JSON.' })
  }

  // Resolve / create the job.
  let jobId: number
  if (body.continue && body.jobId) {
    jobId = body.jobId
  } else {
    // Don't start a second run on top of a live one.
    const { data: live } = await sb
      .from('drive_sync_jobs')
      .select('id,status,updated_at')
      .eq('status', 'running')
      .gt('updated_at', new Date(Date.now() - 5 * 60_000).toISOString())
      .limit(1)
    if (live && live.length) return json(200, { ok: true, note: 'Sync already running', jobId: live[0].id })

    const { data: jb, error: jErr } = await sb
      .from('drive_sync_jobs')
      .insert({ status: 'running', message: 'Starting…', started_at: new Date().toISOString() })
      .select('id')
      .single()
    if (jErr) return json(500, { error: 'Could not create job: ' + jErr.message })
    jobId = jb.id

    // Seed the queue with every Shared Drive root.
    try {
      const token = await getAccessToken(sa)
      const drives = await listSharedDrives(token)
      if (!drives.length) {
        await sb.from('drive_sync_jobs').update({ status: 'done', message: 'No Shared Drives found.', finished_at: new Date().toISOString() }).eq('id', jobId)
        return json(200, { ok: true, note: 'No Shared Drives found', jobId })
      }
      for (const d of drives) {
        // find or create matching PBS drive
        const { data: ex } = await sb.from('pbs_drives').select('id').eq('name', d.name).limit(1)
        let pbsId = ex && ex[0] ? ex[0].id : null
        if (!pbsId) {
          const { data: nd, error: e2 } = await sb.from('pbs_drives').insert({ name: d.name }).select('id').single()
          if (e2) throw e2
          pbsId = nd.id
        }
        await sb
          .from('drive_sync_queue')
          .insert({ job_id: jobId, drive_id: d.id, parent_id: d.id, pbs_id: String(pbsId), rel_path: '' })
          .then(() => {}, () => {}) // ignore unique conflicts
      }
    } catch (e) {
      await sb.from('drive_sync_jobs').update({ status: 'error', message: String(e), finished_at: new Date().toISOString() }).eq('id', jobId)
      return json(500, { error: 'Seed failed: ' + String(e) })
    }
  }

  // Mint a fresh token for this pass.
  let token: string
  try {
    token = await getAccessToken(sa)
  } catch (e) {
    await sb.from('drive_sync_jobs').update({ status: 'error', message: String(e), updated_at: new Date().toISOString() }).eq('id', jobId)
    return json(500, { error: String(e) })
  }

  const start = Date.now()
  let copied = 0,
    skipped = 0,
    errors = 0,
    timedOut = false

  while (Date.now() - start < TIME_BUDGET_MS) {
    const { data: items } = await sb
      .from('drive_sync_queue')
      .select('*')
      .eq('job_id', jobId)
      .eq('status', 'pending')
      .order('id')
      .limit(1)
    if (!items || !items.length) break
    const item = items[0]

    let children: any[]
    try {
      children = await listChildren(token, item.parent_id, item.drive_id)
    } catch {
      errors++
      await sb.from('drive_sync_queue').update({ status: 'done' }).eq('id', item.id)
      continue
    }

    let folderTimedOut = false
    for (const c of children) {
      if (Date.now() - start > TIME_BUDGET_MS) {
        folderTimedOut = true
        timedOut = true
        break
      }
      if (c.mimeType === FOLDER_MIME) {
        const childPath = item.rel_path ? `${item.rel_path}/${c.name}` : c.name
        await sb
          .from('drive_sync_queue')
          .insert({ job_id: jobId, drive_id: item.drive_id, parent_id: c.id, pbs_id: item.pbs_id, rel_path: childPath })
          .then(() => {}, () => {}) // ignore unique conflict on resume
        continue
      }
      // File
      const isNative = (c.mimeType || '').startsWith('application/vnd.google-apps')
      const fname = isNative ? `${c.name}.pdf` : c.name
      const pbsPath = `drives/${item.pbs_id}/${item.rel_path ? item.rel_path + '/' : ''}${fname}`

      const { data: man } = await sb.from('drive_sync_files').select('modified_time').eq('file_id', c.id).maybeSingle()
      if (
        man &&
        man.modified_time &&
        c.modifiedTime &&
        new Date(man.modified_time).getTime() === new Date(c.modifiedTime).getTime()
      ) {
        skipped++
        continue
      }
      try {
        const dl = isNative
          ? `https://www.googleapis.com/drive/v3/files/${c.id}/export?mimeType=application/pdf&supportsAllDrives=true`
          : `https://www.googleapis.com/drive/v3/files/${c.id}?alt=media&supportsAllDrives=true`
        const r = await fetch(dl, { headers: { Authorization: `Bearer ${token}` } })
        if (!r.ok) {
          errors++
          continue
        }
        const buf = new Uint8Array(await r.arrayBuffer())
        const { error: upErr } = await sb.storage
          .from(BUCKET)
          .upload(pbsPath, buf, { upsert: true, contentType: r.headers.get('content-type') || undefined })
        if (upErr) {
          errors++
          continue
        }
        await sb.from('drive_sync_files').upsert({
          file_id: c.id,
          modified_time: c.modifiedTime,
          name: fname,
          pbs_path: pbsPath,
          synced_at: new Date().toISOString(),
        })
        copied++
      } catch {
        errors++
      }
    }

    if (folderTimedOut) break // leave item pending; resume re-lists (manifest skips done files)
    await sb.from('drive_sync_queue').update({ status: 'done' }).eq('id', item.id)
  }

  // Persist this pass's counters.
  await sb.rpc('bump_drive_sync', { p_job: jobId, p_copied: copied, p_skipped: skipped, p_errors: errors })

  // Anything left?
  const { count } = await sb
    .from('drive_sync_queue')
    .select('id', { count: 'exact', head: true })
    .eq('job_id', jobId)
    .eq('status', 'pending')

  if ((count || 0) > 0) {
    await sb.from('drive_sync_jobs').update({ message: `Working… (${count} folders left)`, updated_at: new Date().toISOString() }).eq('id', jobId)
    // Self-chain: fire the next pass and return.
    fetch(`${SUPABASE_URL}/functions/v1/drive-sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SERVICE_ROLE}` },
      body: JSON.stringify({ continue: true, jobId }),
    }).catch(() => {})
    return json(200, { ok: true, jobId, continuing: true, copied, skipped, errors, remaining: count })
  }

  // Done — clean up this job's queue rows.
  await sb.from('drive_sync_queue').delete().eq('job_id', jobId)
  const { data: final } = await sb.from('drive_sync_jobs').select('files_copied,files_skipped,errors').eq('id', jobId).single()
  await sb
    .from('drive_sync_jobs')
    .update({
      status: 'done',
      finished_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      message: `Done — ${final?.files_copied ?? 0} copied, ${final?.files_skipped ?? 0} unchanged, ${final?.errors ?? 0} errors.`,
    })
    .eq('id', jobId)

  return json(200, { ok: true, jobId, done: true })
})
