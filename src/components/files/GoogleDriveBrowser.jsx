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
  const [token, setToken] = useState(null)
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
  const fileRef = useRef(null)

  useEffect(() => {
    if (!gisReady || !CLIENT_ID || tokenClient) return
    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPE,
      callback: resp => {
        if (resp?.access_token) {
          setToken(resp.access_token)
          setError('')
        } else setError('Google sign-in was cancelled or failed.')
      },
    })
    setTokenClient(client)
  }, [gisReady, tokenClient])

  const connect = () => {
    setError('')
    tokenClient?.requestAccessToken({ prompt: token ? '' : 'consent' })
  }

  // Authed Drive API request. Re-prompts for a token on 401.
  const driveApi = useCallback(
    async (path, opts = {}, base = 'https://www.googleapis.com/drive/v3/') => {
      const res = await fetch(`${base}${path}`, {
        ...opts,
        headers: { Authorization: `Bearer ${token}`, ...(opts.headers || {}) },
      })
      if (res.status === 401) {
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
      <div className="w-48 flex-shrink-0 bg-white border border-gray-200 rounded-xl p-2 overflow-y-auto">
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
                      onClick={() =>
                        isFolder ? openFolder(f) : f.webViewLink && window.open(f.webViewLink, '_blank')
                      }
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
    </div>
  )
}
