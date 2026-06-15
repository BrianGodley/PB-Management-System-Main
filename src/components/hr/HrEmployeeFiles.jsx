// ─────────────────────────────────────────────────────────────────────────────
// HrEmployeeFiles — HR > Files tab.
//
// Pick an employee, then browse/manage their personal file system: nested
// folders + uploaded files (employee_files table, hr-files storage bucket).
// New hires are seeded with the New Employee template folders (see
// AddEmployeeModal). Files open in the shared DocViewerModal (PDF/images
// inline, Word via the Office Online viewer, download fallback).
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import DocViewerModal from '../DocViewerModal'

function fmtSize(bytes) {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1048576).toFixed(1)} MB`
}

export default function HrEmployeeFiles({ employees = [] }) {
  const { user } = useAuth()
  const active = useMemo(
    () =>
      [...employees]
        .filter(e => e.status === 'active')
        .sort((a, b) => `${a.last_name} ${a.first_name}`.localeCompare(`${b.last_name} ${b.first_name}`)),
    [employees]
  )

  const [empId, setEmpId] = useState('')
  const [empSearch, setEmpSearch] = useState('')
  const [rows, setRows] = useState([]) // all employee_files for the selected employee
  const [loading, setLoading] = useState(false)
  const [folderId, setFolderId] = useState(null) // current folder (null = root)
  const [busy, setBusy] = useState(false)
  const [doc, setDoc] = useState(null) // { name, url } for the viewer

  useEffect(() => {
    setFolderId(null)
    if (empId) load()
    else setRows([])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [empId])

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('employee_files')
      .select('*')
      .eq('employee_id', empId)
      .order('is_folder', { ascending: false })
      .order('name', { ascending: true })
    setRows(data || [])
    setLoading(false)
  }

  const byId = useMemo(() => Object.fromEntries(rows.map(r => [r.id, r])), [rows])
  const current = rows.filter(r => (r.parent_id || null) === (folderId || null))
  const folders = current.filter(r => r.is_folder)
  const files = current.filter(r => !r.is_folder)

  // Breadcrumb chain from root to the current folder.
  const chain = useMemo(() => {
    const out = []
    let id = folderId
    while (id && byId[id]) {
      out.unshift(byId[id])
      id = byId[id].parent_id
    }
    return out
  }, [folderId, byId])

  async function addFolder() {
    const name = window.prompt('New folder name:')
    if (!name || !name.trim()) return
    const { error } = await supabase.from('employee_files').insert({
      employee_id: empId,
      parent_id: folderId,
      is_folder: true,
      name: name.trim(),
      uploaded_by: user?.id || null,
    })
    if (error) alert('Could not create folder: ' + error.message)
    else load()
  }

  async function handleUpload(e) {
    const f = e.target.files?.[0]
    if (!f || !empId) return
    setBusy(true)
    const path = `employees/${empId}/${Date.now()}-${f.name}`
    const { error: upErr } = await supabase.storage.from('hr-files').upload(path, f)
    if (upErr) {
      alert('Upload failed: ' + upErr.message)
    } else {
      await supabase.from('employee_files').insert({
        employee_id: empId,
        parent_id: folderId,
        is_folder: false,
        name: f.name,
        storage_path: path,
        file_type: f.type,
        file_size: f.size,
        uploaded_by: user?.id || null,
      })
      load()
    }
    setBusy(false)
    e.target.value = ''
  }

  function openFile(r) {
    if (!r.storage_path) return
    const { data } = supabase.storage.from('hr-files').getPublicUrl(r.storage_path)
    setDoc({ name: r.name, url: data?.publicUrl || null })
  }

  async function remove(r) {
    if (r.is_folder) {
      if (!window.confirm(`Delete folder "${r.name}" and everything inside it?`)) return
      // Collect this folder + all descendants so their storage objects are
      // removed (DB rows cascade via the FK, but storage isn't covered).
      const all = [r]
      const collect = pid => {
        rows.filter(x => x.parent_id === pid).forEach(c => {
          all.push(c)
          collect(c.id)
        })
      }
      collect(r.id)
      const paths = all.filter(x => x.storage_path).map(x => x.storage_path)
      if (paths.length) await supabase.storage.from('hr-files').remove(paths)
      await supabase.from('employee_files').delete().eq('id', r.id) // cascade removes children
    } else {
      if (!window.confirm(`Delete "${r.name}"?`)) return
      if (r.storage_path) await supabase.storage.from('hr-files').remove([r.storage_path])
      await supabase.from('employee_files').delete().eq('id', r.id)
    }
    load()
  }

  const empMatches = empSearch.trim()
    ? active.filter(e =>
        `${e.first_name} ${e.last_name} ${e.job_title || ''}`
          .toLowerCase()
          .includes(empSearch.trim().toLowerCase())
      )
    : active

  const selectedEmp = active.find(e => e.id === empId)

  return (
    <div className="max-w-4xl">
      {/* Employee picker */}
      <div className="mb-4">
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
          Employee
        </label>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={empSearch}
            onChange={e => setEmpSearch(e.target.value)}
            placeholder="Search employees…"
            className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500"
          />
          <select
            value={empId}
            onChange={e => setEmpId(e.target.value)}
            className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500"
          >
            <option value="">Select an employee…</option>
            {empMatches.map(e => (
              <option key={e.id} value={e.id}>
                {e.last_name}, {e.first_name}
                {e.job_title ? ` — ${e.job_title}` : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      {!empId ? (
        <div className="bg-white border border-gray-200 rounded-xl p-10 text-center text-gray-400">
          <p className="text-3xl mb-2">📁</p>
          <p className="font-medium">Select an employee to view their files</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          {/* Toolbar: breadcrumb + actions */}
          <div className="flex items-center justify-between gap-3 px-4 py-2.5 border-b border-gray-100 bg-gray-50 flex-wrap">
            <div className="flex items-center gap-1 text-sm text-gray-600 min-w-0 flex-wrap">
              <button
                onClick={() => setFolderId(null)}
                className="font-semibold text-green-700 hover:underline"
              >
                {selectedEmp ? `${selectedEmp.first_name}'s Files` : 'Files'}
              </button>
              {chain.map(c => (
                <span key={c.id} className="flex items-center gap-1 min-w-0">
                  <span className="text-gray-300">/</span>
                  <button
                    onClick={() => setFolderId(c.id)}
                    className="hover:underline truncate max-w-[140px]"
                  >
                    {c.name}
                  </button>
                </span>
              ))}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={addFolder}
                className="px-3 py-1.5 text-xs font-semibold border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-100"
              >
                📁 New Folder
              </button>
              <label
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg text-white cursor-pointer ${
                  busy ? 'bg-green-400' : 'bg-green-700 hover:bg-green-800'
                }`}
              >
                {busy ? 'Uploading…' : '⬆ Upload'}
                <input type="file" className="hidden" onChange={handleUpload} disabled={busy} />
              </label>
            </div>
          </div>

          {/* Listing */}
          {loading ? (
            <div className="py-12 text-center text-sm text-gray-400">Loading…</div>
          ) : folders.length === 0 && files.length === 0 ? (
            <div className="py-12 text-center text-sm text-gray-400">
              This folder is empty. Use “New Folder” or “Upload”.
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {folders.map(f => (
                <li key={f.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 group">
                  <button
                    onClick={() => setFolderId(f.id)}
                    className="flex items-center gap-2 flex-1 min-w-0 text-left"
                  >
                    <span className="text-lg">📁</span>
                    <span className="text-sm font-medium text-gray-800 truncate">{f.name}</span>
                  </button>
                  <button
                    onClick={() => remove(f)}
                    className="text-gray-300 hover:text-red-500 text-xs opacity-0 group-hover:opacity-100"
                    title="Delete folder"
                  >
                    🗑
                  </button>
                </li>
              ))}
              {files.map(f => (
                <li key={f.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 group">
                  <button
                    onClick={() => openFile(f)}
                    className="flex items-center gap-2 flex-1 min-w-0 text-left"
                  >
                    <span className="text-lg">📄</span>
                    <span className="text-sm text-blue-700 hover:underline truncate">{f.name}</span>
                    {f.file_size ? (
                      <span className="text-[11px] text-gray-400 flex-shrink-0">
                        {fmtSize(f.file_size)}
                      </span>
                    ) : null}
                  </button>
                  <button
                    onClick={() => remove(f)}
                    className="text-gray-300 hover:text-red-500 text-xs opacity-0 group-hover:opacity-100"
                    title="Delete file"
                  >
                    🗑
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {doc && <DocViewerModal name={doc.name} url={doc.url} onClose={() => setDoc(null)} />}
    </div>
  )
}
