// src/components/files/GoogleDriveBrowser.jsx
//
// Read-only Google Drive browser embedded in the Documents module. Uses Google
// Identity Services (GIS) to obtain a short-lived OAuth access token in the
// browser, then talks to the Drive v3 REST API directly (no backend). The user
// sees My Drive + every Shared Drive, and can drill through folders and open
// files in Google.
//
// ── Setup (one-time, in Google Cloud Console) ───────────────────────────────
//   1. Create / pick a project → enable the "Google Drive API".
//   2. OAuth consent screen → External (or Internal for Workspace) → add the
//      scope  https://www.googleapis.com/auth/drive.readonly  and add yourself
//      as a Test user while it's in Testing.
//   3. Credentials → Create OAuth client ID → "Web application".
//      Authorized JavaScript origins:  http://localhost:5173  and your deployed
//      app origin (e.g. https://app.picturebuild.com).
//   4. Copy the Client ID into an env var  VITE_GOOGLE_CLIENT_ID  (Vercel +
//      local .env). Redeploy.
import { useEffect, useState, useCallback } from 'react'

// Client IDs are public (they're exposed in the OAuth flow), so a hard-coded
// fallback is fine; VITE_GOOGLE_CLIENT_ID overrides it if set.
const CLIENT_ID =
  import.meta.env.VITE_GOOGLE_CLIENT_ID ||
  '630031384686-5o6a8upbj6ar9rb06qr49crfsdvrfphr.apps.googleusercontent.com'
const SCOPE = 'https://www.googleapis.com/auth/drive.readonly'
const FOLDER_MIME = 'application/vnd.google-apps.folder'
const FILE_FIELDS =
  'files(id,name,mimeType,iconLink,webViewLink,modifiedTime,size),nextPageToken'

const fmtDate = d =>
  d ? new Date(d).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: '2-digit' }) : ''
const fmtSize = n => {
  if (n == null || n === '') return ''
  const k = 1024
  const u = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(Number(n)) / Math.log(k))
  return `${(Number(n) / Math.pow(k, i)).toFixed(i ? 1 : 0)} ${u[i] || 'B'}`
}

// Inject the Google Identity Services script once.
function useGisScript() {
  const [ready, setReady] = useState(!!window.google?.accounts?.oauth2)
  useEffect(() => {
    if (window.google?.accounts?.oauth2) {
      setReady(true)
      return
    }
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
  const [drives, setDrives] = useState([]) // [{id, name}] — My Drive + shared drives
  const [activeDrive, setActiveDrive] = useState(null) // {id, name} (id 'root' = My Drive)
  const [stack, setStack] = useState([]) // breadcrumb: [{id, name}]
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Build the GIS token client once the script is ready.
  useEffect(() => {
    if (!gisReady || !CLIENT_ID || tokenClient) return
    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPE,
      callback: resp => {
        if (resp?.access_token) {
          setToken(resp.access_token)
          setError('')
        } else {
          setError('Google sign-in was cancelled or failed.')
        }
      },
    })
    setTokenClient(client)
  }, [gisReady, tokenClient])

  const connect = () => {
    setError('')
    tokenClient?.requestAccessToken({ prompt: token ? '' : 'consent' })
  }

  // Authed Drive API GET; re-prompts for a token on 401.
  const driveGet = useCallback(
    async path => {
      const res = await fetch(`https://www.googleapis.com/drive/v3/${path}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.status === 401) {
        setToken(null)
        throw new Error('Session expired — click Connect to reauthorize.')
      }
      if (!res.ok) throw new Error(`Drive API error ${res.status}`)
      return res.json()
    },
    [token]
  )

  // Once we have a token, load the list of drives (My Drive + shared drives).
  useEffect(() => {
    if (!token) return
    let cancelled = false
    ;(async () => {
      try {
        const data = await driveGet('drives?pageSize=100&fields=drives(id,name)')
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
  }, [token, driveGet])

  // Load the contents of the current folder.
  const current = stack[stack.length - 1]
  useEffect(() => {
    if (!token || !current) return
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError('')
      try {
        const sharedDriveId = activeDrive && activeDrive.id !== 'root' ? activeDrive.id : null
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
        const data = await driveGet(`files?${params.toString()}`)
        if (!cancelled) setItems(data.files || [])
      } catch (e) {
        if (!cancelled) setError(e.message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [token, current, activeDrive, driveGet])

  function openDrive(d) {
    setActiveDrive(d)
    setStack([d.id === 'root' ? { id: 'root', name: 'My Drive' } : d])
  }
  function openFolder(f) {
    setStack(s => [...s, { id: f.id, name: f.name }])
  }
  function goCrumb(i) {
    setStack(s => s.slice(0, i + 1))
  }

  // ── Render ──────────────────────────────────────────────────────────────
  if (!CLIENT_ID) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800">
        <p className="font-semibold mb-1">Google Drive isn’t configured yet.</p>
        <p>
          Add your Google OAuth Client ID as <code>VITE_GOOGLE_CLIENT_ID</code> (Vercel + local
          .env) and redeploy. Setup steps are in the comment at the top of{' '}
          <code>GoogleDriveBrowser.jsx</code>.
        </p>
      </div>
    )
  }

  if (!token) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-4xl mb-3">📁</p>
        <p className="text-sm font-medium text-gray-600 mb-1">Connect your Google Drive</p>
        <p className="text-xs text-gray-400 max-w-xs mb-5">
          Browse all your drives, folders and files. Read-only — nothing is changed in your Drive.
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
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide px-2 py-1">
          Drives
        </p>
        {drives.map(d => (
          <button
            key={d.id}
            onClick={() => openDrive(d)}
            className={`w-full text-left text-sm px-2 py-1.5 rounded-lg truncate ${
              activeDrive?.id === d.id ? 'bg-green-50 text-green-800 font-semibold' : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            {d.id === 'root' ? '🏠 ' : '👥 '}
            {d.name}
          </button>
        ))}
      </div>

      {/* Folder/file panel */}
      <div className="flex-1 min-w-0 flex flex-col bg-white border border-gray-200 rounded-xl overflow-hidden">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1 flex-wrap px-4 py-2.5 border-b border-gray-100 text-sm flex-shrink-0">
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
          <button
            onClick={connect}
            className="ml-auto text-xs text-gray-400 hover:text-gray-600"
            title="Reauthorize / refresh access"
          >
            ↻ Refresh
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto">
          {error && <p className="px-4 py-3 text-xs text-red-500">{error}</p>}
          {loading ? (
            <div className="flex justify-center py-16">
              <div className="h-7 w-7 animate-spin rounded-full border-b-2 border-green-700" />
            </div>
          ) : items.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-gray-400">This folder is empty.</p>
          ) : (
            <ul className="divide-y divide-gray-50">
              {items.map(f => {
                const isFolder = f.mimeType === FOLDER_MIME
                return (
                  <li key={f.id}>
                    <button
                      onClick={() =>
                        isFolder ? openFolder(f) : f.webViewLink && window.open(f.webViewLink, '_blank')
                      }
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-gray-50"
                    >
                      {f.iconLink ? (
                        <img src={f.iconLink} alt="" className="w-4 h-4 flex-shrink-0" />
                      ) : (
                        <span className="w-4 text-center flex-shrink-0">{isFolder ? '📁' : '📄'}</span>
                      )}
                      <span className="flex-1 min-w-0 truncate text-sm text-gray-800">{f.name}</span>
                      <span className="text-xs text-gray-400 flex-shrink-0 hidden sm:block">
                        {isFolder ? '' : fmtSize(f.size)}
                      </span>
                      <span className="text-xs text-gray-400 flex-shrink-0 w-16 text-right">
                        {fmtDate(f.modifiedTime)}
                      </span>
                    </button>
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
