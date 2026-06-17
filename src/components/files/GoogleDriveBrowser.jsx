// src/components/files/GoogleDriveBrowser.jsx
//
// Full read/write Google Drive manager embedded in the Documents module. Uses
// Google Identity Services (GIS) to get a browser OAuth access token, then
// talks to the Drive v3 REST API directly (no backend). Supports: browse My
// Drive + Shared Drives, drill into folders, search, upload files, create
// folders, rename, delete (to Trash), download, and import a Drive file into
// the app's own Files storage.
//
// ── Setup (one-time, Google Cloud Console) ──────────────────────────────────
//   1. Enable the "Google Drive API".
//   2. OAuth consent screen → Internal.
//   3. Credentials → OAuth client ID → Web application. Add your app origin(s)
//      to "Authorized JavaScript origins".
//   4. Put the Client ID in VITE_GOOGLE_CLIENT_ID (or the fallback below).
import { useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '../../lib/supabase'

// Client IDs are public (exposed in the OAuth flow), so a hard-coded fallback
// is fine; VITE_GOOGLE_CLIENT_ID overrides it if set.
const CLIENT_ID =
  import.meta.env.VITE_GOOGLE_CLIENT_ID ||
  '630031384686-5o6a8upbj6ar9rb06qr49crfsdvrfphr.apps.googleusercontent.com'
// Full access so we can create/upload/rename/delete (Internal app = no Google
// verification needed).
const SCOPE = 'https://www.googleapis.com/auth/drive'
const FOLDER_MIME = 'application/vnd.google-apps.folder'
const FILE_FIELDS =
  'files(id,name,mimeType,iconLink,webViewLink,modifiedTime,size),nextPageToken'

// App Files storage (mirrors FileManager defaults) for "import to PBS".
const PBS_BUCKET = 'company-files'
const PBS_ROOT = 'files'

const fmtDate = d =>
  d ? new Date(d).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: '2-digit' }) : ''
const fmtSize = n => {
  if (n == null || n === '') return ''
  const k = 1024
  const u = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(Number(n)) / Math.log(k))
  return `${(Number(n) / Math.pow(k, i)).toFixed(i ? 1 : 0)} ${u[i] || 'B'}`
}

// Embeddable preview URL for the in-app viewer. Google-native types use their
// docs.google.com /preview; everything else (PDF, Office Word/Excel, images)
// uses the Drive file /preview, which Google renders inline.
function previewUrl(f) {
  const m = f.mimeType || ''
  if (m === 'application/vnd.google-apps.spreadsheet')
    return `https://docs.google.com/spreadsheets/d/${f.id}/preview`
  if (m === 'application/vnd.google-apps.document')
    return `https://docs.google.com/document/d/${f.id}/preview`
  if (m === 'application/vnd.google-apps.presentation')
    return `https://docs.google.com/presentation/d/${f.id}/preview`
  return `https://drive.google.com/file/d/${f.id}/preview`
}

// Persist the short-lived access token (with expiry) so flipping tabs doesn't
// force a fresh sign-in every time. Tokens last ~1h; we reuse until expiry.
const TOKEN_KEY = 'gdrive:token'
function readStoredToken() {
  try {
    const v = JSON.parse(localStorage.getItem(TOKEN_KEY) || 'null')
    if (v && v.access_token && v.expiry && v.expiry > Date.now() + 30000) return v.access_token
  } catch {
    /* ignore */
  }
  return null
}
function storeToken(access_token, expires_in) {
  try {
    localStorage.setItem(
      TOKEN_KEY,
      JSON.stringify({ access_token, expiry: Date.now() + (Number(expires_in) || 3600) * 1000 })
    )
  } catch {
    /* ignore */
  }
}
function clearStoredToken() {
  try {
    localStorage.removeItem(TOKEN_KEY)
  } catch {
    /* ignore */
  }
}

function useGisScript() {
  const [ready, setReady] = useState(!!window.google?.accounts?.oauth2)
  useEffect(() => {
    if (window.google?.accounts?.oauth2) return setReady(true)
    const existing = document.getElementById('gis-script')
    if (existing) {
      existing.addEventListener('load', () => setReady(true))
      return
    }
    const s = document.createElement('script')
    s.id = 'gis-script'
    s.src = 'https://accounts.google.com/gsi/client'
    s.async = true
    s.defer = true
    s.onload = () => setReady(true)
    document.head.appendChild(s)
  }, [])
  return ready
}

export default function GoogleDriveBrowser() {
  const gisReady = useGisScript()
  const [token, setToken] = useState(() => readStoredToken())
  const [tokenClient, setTokenClient] = useState(null)
  const [drives, setDrives] = useState([])
  const [activeDrive, setActiveDrive] = useState(null)
  const [stack, setStack] = useState([])
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [viewFile, setViewFile] = useState(null) // file open in the in-app viewer
  const [pbsPicker, setPbsPicker] = useState(false) // PBS → Drive upload picker
  const [pbsPath, setPbsPath] = useState([]) // folders under the PBS Files root
  const [pbsEntries, setPbsEntries] = useState([])
  const [pbsLoading, setPbsLoading] = useState(false)
  const [mirror, setMirror] = useState('') // progress text while copying all → PBS
  const fileRef = useRef(null)
  // Always-current token (so a long mirror run reads the latest after refresh).
  const tokenRef = useRef(token)
  useEffect(() => { tokenRef.current = token }, [token])
  const refreshResolverRef = useRef(null) // resolves a pending silent token refresh

  useEffect(() => {
    if (!gisReady || !CLIENT_ID || tokenClient) return
    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPE,
      callback: resp => {
        if (resp?.access_token) {
          storeToken(resp.access_token, resp.expires_in)
          tokenRef.current = resp.access_token
          setToken(resp.access_token)
          setError('')
          if (refreshResolverRef.current) {
            refreshResolverRef.current(resp.access_token)
            refreshResolverRef.current = null
          }
        } else {
          setError('Google sign-in was cancelled or failed.')
          if (refreshResolverRef.current) {
            refreshResolverRef.current(null)
            refreshResolverRef.current = null
          }
        }
      },
    })
    setTokenClient(client)
  }, [gisReady, tokenClient])

  const connect = () => {
    setError('')
    // Empty prompt reuses the existing grant silently when possible (no repeat
    // consent screen); Google only prompts if access was never granted.
    tokenClient?.requestAccessToken({ prompt: '' })
  }

  // Authed Drive API request. Re-prompts for a token on 401.
  const driveApi = useCallback(
    async (path, opts = {}, base = 'https://www.googleapis.com/drive/v3/') => {
      const res = await fetch(`${base}${path}`, {
        ...opts,
        headers: { Authorization: `Bearer ${token}`, ...(opts.headers || {}) },
      })
      if (res.status === 401) {
        clearStoredToken()
        setToken(null)
        throw new Error('Session expired — click Connect to reauthorize.')
      }
      if (!res.ok) {
        let msg = `Drive API error ${res.status}`
        try {
          const j = await res.json()
          msg = j.error?.message || msg
        } catch {
          /* ignore */
        }
        throw new Error(msg)
      }
      return res
    },
    [token]
  )
  const driveJson = useCallback(async (path, opts) => (await driveApi(path, opts)).json(), [driveApi])

  // Load drives once we have a token.
  useEffect(() => {
    if (!token) return
    let cancelled = false
    ;(async () => {
      try {
        const data = await driveJson('drives?pageSize=100&fields=drives(id,name)')
        if (cancelled) return
        const list = [{ id: 'root', name: 'My Drive' }, ...(data.drives || [])]
        setDrives(list)
        setActiveDrive(list[0])
        setStack([list[0]])
      } catch (e) {
        if (!cancelled) setError(e.message)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [token, driveJson])

  const current = stack[stack.length - 1]
  const sharedDriveId = activeDrive && activeDrive.id !== 'root' ? activeDrive.id : null

  const loadFolder = useCallback(async () => {
    if (!token || !current) return
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams({
        q: `'${current.id}' in parents and trashed=false`,
        fields: FILE_FIELDS,
        orderBy: 'folder,name',
        pageSize: '500',
        supportsAllDrives: 'true',
        includeItemsFromAllDrives: 'true',
      })
      if (sharedDriveId) {
        params.set('corpora', 'drive')
        params.set('driveId', sharedDriveId)
      }
      const data = await driveJson(`files?${params.toString()}`)
      setItems(data.files || [])
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [token, current, sharedDriveId, driveJson])

  useEffect(() => {
    if (!searching) loadFolder()
  }, [loadFolder, searching])

  // ── Mutations ─────────────────────────────────────────────────────────────
  async function createFolder() {
    const name = window.prompt('New folder name:')
    if (!name?.trim()) return
    setBusy('Creating folder…')
    try {
      await driveJson('files?supportsAllDrives=true', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), mimeType: FOLDER_MIME, parents: [current.id] }),
      })
      await loadFolder()
    } catch (e) {
      alert('Could not create folder: ' + e.message)
    } finally {
      setBusy('')
    }
  }

  async function uploadFiles(e) {
    const files = Array.from(e.target.files || [])
    if (!files.length) return
    setBusy(`Uploading ${files.length} file${files.length > 1 ? 's' : ''}…`)
    try {
      for (const f of files) {
        // 1) create metadata, 2) PATCH the bytes (avoids multipart in a string).
        const meta = await driveJson('files?supportsAllDrives=true', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: f.name, parents: [current.id] }),
        })
        await driveApi(
          `files/${meta.id}?uploadType=media&supportsAllDrives=true`,
          { method: 'PATCH', headers: { 'Content-Type': f.type || 'application/octet-stream' }, body: f },
          'https://www.googleapis.com/upload/drive/v3/'
        )
      }
      await loadFolder()
    } catch (err) {
      alert('Upload failed: ' + err.message)
    } finally {
      setBusy('')
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  async function renameItem(f) {
    const name = window.prompt('Rename to:', f.name)
    if (!name?.trim() || name.trim() === f.name) return
    setBusy('Renaming…')
    try {
      await driveJson(`files/${f.id}?supportsAllDrives=true`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      })
      await refresh()
    } catch (e) {
      alert('Rename failed: ' + e.message)
    } finally {
      setBusy('')
    }
  }

  async function deleteItem(f) {
    if (!window.confirm(`Move "${f.name}" to Google Drive Trash?`)) return
    setBusy('Deleting…')
    try {
      await driveJson(`files/${f.id}?supportsAllDrives=true`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trashed: true }),
      })
      await refresh()
    } catch (e) {
      alert('Delete failed: ' + e.message)
    } finally {
      setBusy('')
    }
  }

  // Returns a Blob for a Drive file (exports Google-native docs to PDF).
  async function fetchBlob(f) {
    const isNative = f.mimeType?.startsWith('application/vnd.google-apps')
    const path = isNative
      ? `files/${f.id}/export?mimeType=application/pdf&supportsAllDrives=true`
      : `files/${f.id}?alt=media&supportsAllDrives=true`
    const res = await driveApi(path)
    return { blob: await res.blob(), isNative }
  }

  async function downloadItem(f) {
    setBusy('Downloading…')
    try {
      const { blob, isNative } = await fetchBlob(f)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = isNative ? `${f.name}.pdf` : f.name
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      alert('Download failed: ' + e.message)
    } finally {
      setBusy('')
    }
  }

  async function importToPbs(f) {
    setBusy('Importing to PBS Files…')
    try {
      const { blob, isNative } = await fetchBlob(f)
      const name = isNative ? `${f.name}.pdf` : f.name
      const { error: upErr } = await supabase.storage
        .from(PBS_BUCKET)
        .upload(`${PBS_ROOT}/${name}`, blob, { upsert: true, contentType: blob.type || undefined })
      if (upErr) throw upErr
      alert(`Imported "${name}" into PBS → Documents → Files.`)
    } catch (e) {
      alert('Import failed: ' + e.message)
    } finally {
      setBusy('')
    }
  }

  // ── Copy ALL Shared Drives → PBS Drives (folders + files, same names) ───────
  // Silently request a fresh access token; resolves with the new token (or null).
  function refreshToken() {
    return new Promise(resolve => {
      refreshResolverRef.current = resolve
      try {
        tokenClient?.requestAccessToken({ prompt: '' })
      } catch {
        refreshResolverRef.current = null
        resolve(null)
      }
      // Safety net so a stuck prompt can't hang the run forever.
      setTimeout(() => {
        if (refreshResolverRef.current === resolve) {
          refreshResolverRef.current = null
          resolve(tokenRef.current || null)
        }
      }, 15000)
    })
  }
  // Resilient Drive fetch: reads the latest token, refreshes on 401, retries
  // transient errors/timeouts with backoff.
  async function gFetch(path, opts = {}, base = 'https://www.googleapis.com/drive/v3/') {
    let lastErr
    for (let attempt = 0; attempt < 4; attempt++) {
      const ctrl = new AbortController()
      const timer = setTimeout(() => ctrl.abort(), 60000)
      try {
        const res = await fetch(`${base}${path}`, {
          ...opts,
          signal: ctrl.signal,
          headers: { Authorization: `Bearer ${tokenRef.current}`, ...(opts.headers || {}) },
        })
        clearTimeout(timer)
        if (res.status === 401) {
          const t = await refreshToken()
          if (!t) throw new Error('Session expired — click Connect to reauthorize.')
          continue
        }
        if (res.status === 429 || res.status >= 500) {
          await new Promise(r => setTimeout(r, 1000 * (attempt + 1)))
          continue
        }
        if (!res.ok) throw new Error(`Drive API error ${res.status}`)
        return res
      } catch (e) {
        clearTimeout(timer)
        lastErr = e
        if (/Session expired/.test(e.message)) throw e
        await new Promise(r => setTimeout(r, 1000 * (attempt + 1)))
      }
    }
    throw lastErr || new Error('Drive request failed')
  }
  const gJson = async path => (await gFetch(path)).json()
  async function gBlob(f) {
    const isNative = f.mimeType?.startsWith('application/vnd.google-apps')
    const path = isNative
      ? `files/${f.id}/export?mimeType=application/pdf&supportsAllDrives=true`
      : `files/${f.id}?alt=media&supportsAllDrives=true`
    const res = await gFetch(path)
    return { blob: await res.blob(), isNative }
  }

  // Find an existing PBS drive by name, or create one; returns its id.
  async function ensurePbsDrive(name) {
    const { data: existing } = await supabase.from('pbs_drives').select('id').eq('name', name).limit(1)
    if (existing && existing[0]) return existing[0].id
    const { data, error } = await supabase.from('pbs_drives').insert({ name }).select('id').single()
    if (error) throw error
    return data.id
  }
  // All children of a Drive folder (handles paging).
  async function listAllChildren(parentId, driveId) {
    const out = []
    let pageToken = ''
    do {
      const params = new URLSearchParams({
        q: `'${parentId}' in parents and trashed=false`,
        fields: FILE_FIELDS,
        pageSize: '500',
        supportsAllDrives: 'true',
        includeItemsFromAllDrives: 'true',
        corpora: 'drive',
        driveId,
      })
      if (pageToken) params.set('pageToken', pageToken)
      const data = await gJson(`files?${params.toString()}`)
      out.push(...(data.files || []))
      pageToken = data.nextPageToken || ''
    } while (pageToken)
    return out
  }
  // Names already present in a PBS folder (so re-runs skip what's done).
  async function listPbsNames(pbsId, relPath) {
    const prefix = `drives/${pbsId}${relPath ? '/' + relPath : ''}`
    const { data } = await supabase.storage.from(PBS_BUCKET).list(prefix, { limit: 1000 })
    return new Set((data || []).map(e => e.name))
  }
  // Recursively mirror a Drive folder into drives/<pbsId>/<relPath> storage.
  async function mirrorFolder(parentId, driveId, pbsId, relPath, stats) {
    if (relPath) {
      await supabase.storage
        .from(PBS_BUCKET)
        .upload(`drives/${pbsId}/${relPath}/.keep`, new Blob([''], { type: 'text/plain' }), { upsert: true })
        .catch(() => {})
    }
    const children = await listAllChildren(parentId, driveId)
    const existing = await listPbsNames(pbsId, relPath)
    for (const c of children) {
      if (c.mimeType === FOLDER_MIME) {
        await mirrorFolder(c.id, driveId, pbsId, relPath ? `${relPath}/${c.name}` : c.name, stats)
      } else {
        const fname = c.mimeType?.startsWith('application/vnd.google-apps') ? `${c.name}.pdf` : c.name
        if (existing.has(fname)) {
          stats.skipped++
          continue
        }
        try {
          const { blob } = await gBlob(c)
          const path = `drives/${pbsId}/${relPath ? relPath + '/' : ''}${fname}`
          const { error } = await supabase.storage
            .from(PBS_BUCKET)
            .upload(path, blob, { upsert: true, contentType: blob.type || undefined })
          if (error) throw error
          stats.files++
          setMirror(`Copying… ${stats.files} new, ${stats.skipped} skipped (${c.name})`)
        } catch (e) {
          if (/Session expired/.test(e.message || '')) throw e
          stats.errors++
        }
      }
    }
  }
  async function copyAllToPbs() {
    if (!token) return
    if (
      !window.confirm(
        'Copy ALL Shared Drives (folders + files) into PBS Drives with the same names? Large drives can take a while. ' +
          'You can re-run anytime — it skips files already copied.'
      )
    )
      return
    setMirror('Loading Shared Drives…')
    try {
      const data = await gJson('drives?pageSize=100&fields=drives(id,name)')
      const shared = data.drives || []
      if (!shared.length) {
        setMirror('')
        alert('No Shared Drives found on your Google account.')
        return
      }
      const stats = { files: 0, skipped: 0, errors: 0 }
      for (const d of shared) {
        setMirror(`Drive “${d.name}”…`)
        const pbsId = await ensurePbsDrive(d.name)
        await mirrorFolder(d.id, d.id, pbsId, '', stats)
      }
      setMirror('')
      alert(
        `Done — ${stats.files} file(s) copied, ${stats.skipped} already present, across ${shared.length} Shared Drive(s)` +
          (stats.errors ? `; ${stats.errors} skipped due to errors (re-run to retry).` : '.')
      )
    } catch (e) {
      setMirror('')
      if (/Session expired/.test(e.message || '')) {
        alert('Google session expired and could not refresh. Click Connect, then run Copy all → PBS again — it resumes where it left off.')
      } else {
        alert('Copy failed: ' + (e.message || 'unknown error'))
      }
    }
  }

  // Upload a Blob into the CURRENT Drive folder (create metadata → PATCH bytes).
  async function uploadBlobToDrive(name, blob) {
    const meta = await driveJson('files?supportsAllDrives=true', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, parents: [current.id] }),
    })
    await driveApi(
      `files/${meta.id}?uploadType=media&supportsAllDrives=true`,
      { method: 'PATCH', headers: { 'Content-Type': blob.type || 'application/octet-stream' }, body: blob },
      'https://www.googleapis.com/upload/drive/v3/'
    )
  }

  // ── PBS Files → Drive ───────────────────────────────────────────────────────
  const loadPbs = useCallback(async () => {
    setPbsLoading(true)
    const prefix = [PBS_ROOT, ...pbsPath].join('/')
    const { data } = await supabase.storage.from(PBS_BUCKET).list(prefix, {
      limit: 1000,
      sortBy: { column: 'name', order: 'asc' },
    })
    const list = (data || [])
      .filter(e => e.name !== '.keep')
      .map(e => ({ name: e.name, isFolder: e.id == null, size: e.metadata?.size }))
      .sort((a, b) => (a.isFolder !== b.isFolder ? (a.isFolder ? -1 : 1) : a.name.localeCompare(b.name)))
    setPbsEntries(list)
    setPbsLoading(false)
  }, [pbsPath])

  useEffect(() => {
    if (pbsPicker) loadPbs()
  }, [pbsPicker, loadPbs])

  async function sendPbsFileToDrive(entry) {
    setBusy(`Uploading "${entry.name}" to Drive…`)
    try {
      const path = [PBS_ROOT, ...pbsPath, entry.name].join('/')
      const { data, error: dlErr } = await supabase.storage.from(PBS_BUCKET).download(path)
      if (dlErr || !data) throw dlErr || new Error('Could not read the PBS file.')
      await uploadBlobToDrive(entry.name, data)
      setPbsPicker(false)
      setPbsPath([])
      await loadFolder()
      alert(`Uploaded "${entry.name}" to ${current.name} in Google Drive.`)
    } catch (e) {
      alert('Upload to Drive failed: ' + (e.message || 'unknown error'))
    } finally {
      setBusy('')
    }
  }

  // ── Search (across all drives) ─────────────────────────────────────────────
  async function runSearch(e) {
    e?.preventDefault?.()
    const q = query.trim()
    if (!q) {
      setSearching(false)
      loadFolder()
      return
    }
    setSearching(true)
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams({
        q: `name contains '${q.replace(/'/g, "\\'")}' and trashed=false`,
        fields: FILE_FIELDS,
        pageSize: '200',
        supportsAllDrives: 'true',
        includeItemsFromAllDrives: 'true',
        corpora: 'allDrives',
      })
      const data = await driveJson(`files?${params.toString()}`)
      setItems(data.files || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }
  function clearSearch() {
    setQuery('')
    setSearching(false)
    loadFolder()
  }

  const refresh = () => (searching ? runSearch() : loadFolder())

  function openDrive(d) {
    clearSearch()
    setActiveDrive(d)
    setStack([d.id === 'root' ? { id: 'root', name: 'My Drive' } : d])
  }
  const openFolder = f => {
    setSearching(false)
    setQuery('')
    setStack(s => [...s, { id: f.id, name: f.name }])
  }
  const goCrumb = i => {
    setSearching(false)
    setStack(s => s.slice(0, i + 1))
  }

  // ── Render ──────────────────────────────────────────────────────────────
  if (!token) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-4xl mb-3">📁</p>
        <p className="text-sm font-medium text-gray-600 mb-1">Connect your Google Drive</p>
        <p className="text-xs text-gray-400 max-w-xs mb-5">
          Browse, upload, organize and import files from all your drives.
        </p>
        <button
          onClick={connect}
          disabled={!tokenClient}
          className="btn-primary text-sm px-5 py-2 rounded-lg disabled:opacity-50"
        >
          🔗 Connect Google Drive
        </button>
        {error && <p className="text-xs text-red-500 mt-3">{error}</p>}
      </div>
    )
  }

  return (
    <div className="flex gap-3 h-full min-h-0">
      {/* Drives rail */}
      <div className="w-[216px] flex-shrink-0 bg-white border border-gray-200 rounded-xl p-2 overflow-y-auto">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide px-2 py-1">Drives</p>
        {drives.map(d => (
          <button
            key={d.id}
            onClick={() => openDrive(d)}
            className={`w-full text-left text-sm px-2 py-1.5 rounded-lg truncate ${
              activeDrive?.id === d.id && !searching
                ? 'bg-green-50 text-green-800 font-semibold'
                : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            {d.id === 'root' ? '🏠 ' : '👥 '}
            {d.name}
          </button>
        ))}
      </div>

      {/* Main panel */}
      <div className="flex-1 min-w-0 flex flex-col bg-white border border-gray-200 rounded-xl overflow-hidden">
        {/* Toolbar */}
        <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-100 flex-shrink-0 flex-wrap">
          <form onSubmit={runSearch} className="flex items-center gap-1 flex-1 min-w-[160px]">
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search all of Drive…"
              className="input text-sm flex-1 min-w-0"
            />
            {searching && (
              <button type="button" onClick={clearSearch} className="text-xs text-gray-400 hover:text-gray-600 px-1">
                ✕
              </button>
            )}
          </form>
          <button
            onClick={createFolder}
            disabled={!!busy || searching}
            className="text-xs px-3 py-1.5 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-50"
          >
            ＋ New Folder
          </button>
          <label
            className={`text-xs px-3 py-1.5 rounded-lg font-medium cursor-pointer ${
              busy || searching ? 'bg-gray-200 text-gray-400' : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            ⬆ Upload
            <input ref={fileRef} type="file" multiple className="hidden" onChange={uploadFiles} disabled={!!busy || searching} />
          </label>
          <button
            onClick={() => {
              setPbsPath([])
              setPbsPicker(true)
            }}
            disabled={!!busy || searching}
            className="text-xs px-3 py-1.5 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-50"
            title="Upload a file from PBS Files into this Drive folder"
          >
            📤 From PBS
          </button>
          <button
            onClick={copyAllToPbs}
            disabled={!!busy || !!mirror || searching}
            className="text-xs px-3 py-1.5 rounded-lg border border-green-300 text-green-700 hover:bg-green-50 disabled:opacity-50"
            title="Copy every Shared Drive (folders + files) into PBS Drives with the same names"
          >
            {mirror ? mirror : '⧉ Copy all → PBS'}
          </button>
        </div>

        {/* Breadcrumb */}
        {!searching && (
          <div className="flex items-center gap-1 flex-wrap px-4 py-2 border-b border-gray-100 text-sm flex-shrink-0">
            {stack.map((c, i) => (
              <span key={c.id} className="flex items-center gap-1">
                {i > 0 && <span className="text-gray-300">/</span>}
                <button
                  onClick={() => goCrumb(i)}
                  className={`hover:underline ${i === stack.length - 1 ? 'font-semibold text-gray-800' : 'text-green-700'}`}
                >
                  {c.name}
                </button>
              </span>
            ))}
          </div>
        )}

        {busy && <p className="px-4 py-1.5 text-xs text-blue-600 flex-shrink-0">{busy}</p>}

        <div className="flex-1 min-h-0 overflow-y-auto">
          {error && <p className="px-4 py-3 text-xs text-red-500">{error}</p>}
          {loading ? (
            <div className="flex justify-center py-16">
              <div className="h-7 w-7 animate-spin rounded-full border-b-2 border-green-700" />
            </div>
          ) : items.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-gray-400">
              {searching ? 'No files match.' : 'This folder is empty.'}
            </p>
          ) : (
            <ul className="divide-y divide-gray-50">
              {items.map(f => {
                const isFolder = f.mimeType === FOLDER_MIME
                return (
                  <li key={f.id} className="group flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50">
                    <button
                      onClick={() => (isFolder ? openFolder(f) : setViewFile(f))}
                      className="flex items-center gap-3 flex-1 min-w-0 text-left"
                    >
                      {f.iconLink ? (
                        <img src={f.iconLink} alt="" className="w-4 h-4 flex-shrink-0" />
                      ) : (
                        <span className="w-4 text-center flex-shrink-0">{isFolder ? '📁' : '📄'}</span>
                      )}
                      <span className="flex-1 min-w-0 truncate text-sm text-gray-800">{f.name}</span>
                      <span className="text-xs text-gray-400 flex-shrink-0 hidden md:block w-16 text-right">
                        {isFolder ? '' : fmtSize(f.size)}
                      </span>
                      <span className="text-xs text-gray-400 flex-shrink-0 w-14 text-right">
                        {fmtDate(f.modifiedTime)}
                      </span>
                    </button>
                    {/* Row actions */}
                    <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => renameItem(f)} title="Rename" className="p-1 text-gray-400 hover:text-gray-700">✏️</button>
                      {!isFolder && (
                        <>
                          <button onClick={() => downloadItem(f)} title="Download" className="p-1 text-gray-400 hover:text-gray-700">⬇️</button>
                          <button onClick={() => importToPbs(f)} title="Import into PBS Files" className="p-1 text-gray-400 hover:text-green-700">📥</button>
                        </>
                      )}
                      <button onClick={() => deleteItem(f)} title="Delete (to Trash)" className="p-1 text-gray-400 hover:text-red-600">🗑️</button>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>

      {/* In-app viewer — embeds the Drive/Docs preview. Editing opens Google. */}
      {viewFile && (
        <div
          className="fixed inset-0 z-[80] bg-black/60 flex items-center justify-center p-3"
          onMouseDown={e => {
            if (e.target === e.currentTarget) setViewFile(null)
          }}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-[96vw] h-[96vh] flex flex-col overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-2.5 border-b border-gray-100 flex-shrink-0">
              {viewFile.iconLink ? (
                <img src={viewFile.iconLink} alt="" className="w-4 h-4" />
              ) : (
                <span>📄</span>
              )}
              <span className="font-semibold text-gray-800 text-sm truncate flex-1 min-w-0">
                {viewFile.name}
              </span>
              {viewFile.webViewLink && (
                <a
                  href={viewFile.webViewLink}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs px-3 py-1.5 rounded-lg bg-green-700 text-white font-semibold hover:bg-green-800"
                >
                  ✏️ Open in Google to edit ↗
                </a>
              )}
              <button
                onClick={() => setViewFile(null)}
                className="w-8 h-8 rounded-full text-gray-400 hover:bg-gray-100 flex items-center justify-center text-lg"
              >
                ✕
              </button>
            </div>
            <iframe
              title={viewFile.name}
              src={previewUrl(viewFile)}
              className="flex-1 w-full border-0"
              allow="autoplay"
            />
          </div>
        </div>
      )}

      {/* PBS → Drive picker — choose a PBS file to upload into the current
          Drive folder. */}
      {pbsPicker && (
        <div
          className="fixed inset-0 z-[80] bg-black/40 flex items-center justify-center p-4"
          onMouseDown={e => {
            if (e.target === e.currentTarget) setPbsPicker(false)
          }}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 flex-shrink-0">
              <div className="min-w-0">
                <h2 className="text-base font-bold text-gray-900">Upload from PBS Files</h2>
                <p className="text-xs text-gray-400 truncate">
                  → into “{current?.name}” in Google Drive
                </p>
              </div>
              <button onClick={() => setPbsPicker(false)} className="text-gray-300 hover:text-gray-500 text-xl leading-none">
                ✕
              </button>
            </div>
            {/* PBS breadcrumb */}
            <div className="flex items-center gap-1 flex-wrap px-4 py-2 border-b border-gray-100 text-sm flex-shrink-0">
              <button
                onClick={() => setPbsPath([])}
                className={`hover:underline ${pbsPath.length === 0 ? 'font-semibold text-gray-800' : 'text-green-700'}`}
              >
                Files
              </button>
              {pbsPath.map((seg, i) => (
                <span key={i} className="flex items-center gap-1">
                  <span className="text-gray-300">/</span>
                  <button
                    onClick={() => setPbsPath(p => p.slice(0, i + 1))}
                    className={`hover:underline ${i === pbsPath.length - 1 ? 'font-semibold text-gray-800' : 'text-green-700'}`}
                  >
                    {seg}
                  </button>
                </span>
              ))}
            </div>
            <div className="flex-1 overflow-y-auto">
              {pbsLoading ? (
                <div className="flex justify-center py-10">
                  <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-green-700" />
                </div>
              ) : pbsEntries.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-gray-400">This folder is empty.</p>
              ) : (
                <ul className="divide-y divide-gray-50">
                  {pbsEntries.map(e => (
                    <li key={e.name}>
                      <button
                        onClick={() =>
                          e.isFolder ? setPbsPath(p => [...p, e.name]) : sendPbsFileToDrive(e)
                        }
                        disabled={!!busy}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-green-50 disabled:opacity-50"
                      >
                        <span className="w-4 text-center flex-shrink-0">{e.isFolder ? '📁' : '📄'}</span>
                        <span className="flex-1 min-w-0 truncate text-sm text-gray-800">{e.name}</span>
                        {!e.isFolder && (
                          <span className="text-xs text-green-700 flex-shrink-0">Upload ↗</span>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
