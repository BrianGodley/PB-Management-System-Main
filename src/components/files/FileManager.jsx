// src/components/files/FileManager.jsx
// A Google-Drive-style file manager over a Supabase storage bucket. Browses a
// fixed `root` prefix (so the Documents page can have separate Files / Photos /
// Videos tabs over one bucket). List view with Name / Last Modified / Size /
// Access, breadcrumb drill-down, Upload + New Folder.
//
// Supabase storage has no real empty folders, so "New Folder" drops a hidden
// `.keep` placeholder; we filter those out of the listing.
import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import FileViewerModal from './FileViewerModal'

const KEEP = '.keep'

function humanSize(bytes) {
  if (bytes == null) return '—'
  const n = Number(bytes)
  if (!n) return '—'
  const u = ['B', 'KB', 'MB', 'GB', 'TB']
  let i = 0
  let v = n
  while (v >= 1024 && i < u.length - 1) {
    v /= 1024
    i++
  }
  return `${v.toFixed(v < 10 && i > 0 ? 1 : 0)} ${u[i]}`
}

function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function iconFor(entry) {
  if (entry.isFolder) return '📁'
  const ext = (entry.name.split('.').pop() || '').toLowerCase()
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'heic', 'svg'].includes(ext)) return '🖼️'
  if (['mp4', 'mov', 'avi', 'mkv', 'webm', 'm4v'].includes(ext)) return '🎞️'
  if (['pdf'].includes(ext)) return '📕'
  if (['doc', 'docx'].includes(ext)) return '📘'
  if (['xls', 'xlsx', 'csv'].includes(ext)) return '📗'
  if (['zip', 'rar', '7z'].includes(ext)) return '🗜️'
  return '📄'
}

export default function FileManager({ bucket = 'company-files', root = 'files', accept, canEdit = true, rootLabel }) {
  const [path, setPath] = useState([]) // segments under root
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [openFile, setOpenFile] = useState(null) // file name being viewed/edited
  const fileRef = useRef(null)
  // Every tenant gets its OWN namespace inside the shared bucket so one
  // company never sees another's files/folders.
  const [tenantId, setTenantId] = useState(undefined) // undefined = loading, null = none
  useEffect(() => {
    supabase.rpc('my_tenant_id').then(({ data }) => setTenantId(data || null))
  }, [])

  const prefix = tenantId ? [tenantId, root, ...path].join('/') : null

  const load = useCallback(async () => {
    if (!prefix) { setEntries([]); setLoading(tenantId === undefined); return }
    setLoading(true)
    const { data, error } = await supabase.storage.from(bucket).list(prefix, {
      limit: 1000,
      sortBy: { column: 'name', order: 'asc' },
    })
    if (error) {
      setEntries([])
      setLoading(false)
      return
    }
    const list = (data || [])
      .filter(e => e.name !== KEEP)
      .map(e => ({
        name: e.name,
        isFolder: e.id == null, // storage marks folders with a null id
        size: e.metadata?.size,
        updatedAt: e.updated_at || e.created_at,
      }))
    // Folders first, then files; each alphanumeric.
    list.sort((a, b) => {
      if (a.isFolder !== b.isFolder) return a.isFolder ? -1 : 1
      return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
    })
    setEntries(list)
    setLoading(false)
  }, [bucket, prefix, tenantId])

  useEffect(() => {
    load()
  }, [load])

  function publicUrl(name) {
    return supabase.storage.from(bucket).getPublicUrl(`${prefix}/${name}`).data.publicUrl
  }

  async function handleUpload(e) {
    const files = Array.from(e.target.files || [])
    if (!files.length || !prefix) return
    setBusy(true)
    try {
      for (const f of files) {
        const { error } = await supabase.storage.from(bucket).upload(`${prefix}/${f.name}`, f, {
          upsert: true,
          contentType: f.type || undefined,
        })
        if (error) throw error
      }
      await load()
    } catch (err) {
      alert('Upload failed: ' + (err.message || 'unknown error'))
    } finally {
      setBusy(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  async function newFolder() {
    if (!prefix) return
    const name = window.prompt('New folder name:')
    if (!name) return
    const clean = name.trim().replace(/[/\\]+/g, '-')
    if (!clean) return
    setBusy(true)
    const { error } = await supabase.storage
      .from(bucket)
      .upload(`${prefix}/${clean}/${KEEP}`, new Blob([''], { type: 'text/plain' }))
    setBusy(false)
    if (error) {
      alert('Could not create folder: ' + error.message)
      return
    }
    load()
  }

  async function removeEntry(entry) {
    if (
      !window.confirm(
        entry.isFolder
          ? `Delete folder "${entry.name}" and everything in it?`
          : `Delete "${entry.name}"?`
      )
    )
      return
    setBusy(true)
    try {
      if (entry.isFolder) {
        await removeFolderRecursive(`${prefix}/${entry.name}`)
      } else {
        const { error } = await supabase.storage.from(bucket).remove([`${prefix}/${entry.name}`])
        if (error) throw error
      }
      await load()
    } catch (err) {
      alert('Delete failed: ' + (err.message || 'unknown error'))
    } finally {
      setBusy(false)
    }
  }

  // Recursively collect + remove every object beneath a folder prefix.
  async function removeFolderRecursive(folderPrefix) {
    const { data } = await supabase.storage.from(bucket).list(folderPrefix, { limit: 1000 })
    const paths = []
    for (const e of data || []) {
      if (e.id == null) {
        await removeFolderRecursive(`${folderPrefix}/${e.name}`)
      } else {
        paths.push(`${folderPrefix}/${e.name}`)
      }
    }
    if (paths.length) await supabase.storage.from(bucket).remove(paths)
  }

  function copyLink(name) {
    navigator.clipboard?.writeText(publicUrl(name))
    alert('Link copied to clipboard.')
  }

  return (
    <div>
      {/* Toolbar: breadcrumb + actions */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <div className="flex items-center gap-1 text-sm text-gray-600 flex-1 min-w-0 flex-wrap">
          <button
            onClick={() => setPath([])}
            className={`hover:text-gray-900 ${path.length === 0 ? 'font-semibold text-gray-900' : ''}`}
          >
            🏠 {rootLabel || root.charAt(0).toUpperCase() + root.slice(1)}
          </button>
          {path.map((seg, i) => (
            <span key={i} className="flex items-center gap-1">
              <span className="text-gray-300">/</span>
              <button
                onClick={() => setPath(path.slice(0, i + 1))}
                className={`hover:text-gray-900 ${i === path.length - 1 ? 'font-semibold text-gray-900' : ''}`}
              >
                {seg}
              </button>
            </span>
          ))}
        </div>
        <input ref={fileRef} type="file" multiple accept={accept} onChange={handleUpload} className="hidden" />
        {canEdit && (
          <>
            <button
              onClick={newFolder}
              disabled={busy}
              className="text-xs px-3 py-1.5 rounded-lg border border-gray-300 text-gray-700 font-semibold hover:bg-gray-50 disabled:opacity-50"
            >
              ＋ New Folder
            </button>
            <button
              onClick={() => fileRef.current?.click()}
              disabled={busy}
              className="text-xs px-3 py-1.5 rounded-lg bg-green-700 text-white font-semibold hover:bg-green-800 disabled:opacity-50"
            >
              {busy ? 'Working…' : '⬆ Upload'}
            </button>
          </>
        )}
      </div>

      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 uppercase tracking-wide text-xs">
              <th className="px-4 py-2 text-left font-semibold">Name</th>
              <th className="px-3 py-2 text-left font-semibold w-48">Last Modified</th>
              <th className="px-3 py-2 text-right font-semibold w-24">Size</th>
              <th className="px-3 py-2 text-left font-semibold w-40">Access</th>
              <th className="px-3 py-2 w-px"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                  Loading…
                </td>
              </tr>
            ) : entries.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                  This folder is empty. Upload files or create a folder.
                </td>
              </tr>
            ) : (
              entries.map(entry => (
                <tr key={entry.name} className="hover:bg-gray-50">
                  <td className="px-4 py-2">
                    <button
                      onClick={() =>
                        entry.isFolder
                          ? setPath([...path, entry.name])
                          : setOpenFile(entry.name)
                      }
                      className="flex items-center gap-2 text-left font-medium text-gray-800 hover:text-green-700"
                    >
                      <span>{iconFor(entry)}</span>
                      <span className="truncate">{entry.name}</span>
                    </button>
                  </td>
                  <td className="px-3 py-2 text-gray-500">{entry.isFolder ? '—' : fmtDate(entry.updatedAt)}</td>
                  <td className="px-3 py-2 text-right text-gray-500">
                    {entry.isFolder ? '—' : humanSize(entry.size)}
                  </td>
                  <td className="px-3 py-2 text-gray-500">
                    {entry.isFolder ? (
                      '—'
                    ) : (
                      <button onClick={() => copyLink(entry.name)} className="text-xs text-green-700 hover:underline">
                        🔗 Anyone with link
                      </button>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {canEdit && (
                      <button
                        onClick={() => removeEntry(entry)}
                        className="text-gray-300 hover:text-red-500 text-sm"
                        title="Delete"
                      >
                        🗑
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {openFile && (
        <FileViewerModal
          bucket={bucket}
          prefix={prefix}
          name={openFile}
          onClose={() => setOpenFile(null)}
          onSaved={load}
        />
      )}
    </div>
  )
}
