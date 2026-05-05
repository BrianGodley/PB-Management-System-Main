// src/pages/Design.jsx
//
// Phase 1 of the Design / CAD-takeoff feature: project list + create.
// Subsequent phases hang off design_projects.id:
//   • Phase 2 — file upload + multi-page viewer
//   • Phase 3 — scale calibration
//   • Phase 4 — drawing tools (linear / area / count)
//   • Phase 5 — takeoff aggregation report

import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

const FG = '#3A5038'

export default function Design() {
  const { user } = useAuth()

  const [projects,    setProjects]    = useState([])
  const [clients,     setClients]     = useState([])  // for the optional client picker
  const [loading,     setLoading]     = useState(true)
  const [search,      setSearch]      = useState('')
  const [showNew,     setShowNew]     = useState(false)
  // Top-level tabs on the Design index page. The existing project list is
  // the "Take Offs" tab; the first two are placeholders for now.
  const [activeTab,   setActiveTab]   = useState('cad') // 'cad' | 'selections' | 'takeoffs'

  // New-project form
  const [newName,    setNewName]    = useState('')
  const [newClient,  setNewClient]  = useState('')
  const [newNotes,   setNewNotes]   = useState('')
  const [creating,   setCreating]   = useState(false)
  const [createErr,  setCreateErr]  = useState('')

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true)
    const [{ data: projData }, { data: cliData }] = await Promise.all([
      supabase
        .from('design_projects')
        .select('id, name, notes, status, created_at, updated_at, client_id, clients(name)')
        .eq('status', 'active')
        .order('created_at', { ascending: false }),
      supabase
        .from('clients')
        .select('id, name, first_name, last_name')
        .order('name'),
    ])
    setProjects(projData || [])
    setClients(cliData || [])
    setLoading(false)
  }

  async function handleCreate(e) {
    e?.preventDefault?.()
    setCreateErr('')
    const name = newName.trim()
    if (!name) { setCreateErr('Project name is required.'); return }
    setCreating(true)
    const { error } = await supabase.from('design_projects').insert({
      name,
      client_id:  newClient || null,
      notes:      newNotes.trim() || null,
      created_by: user?.id || null,
    })
    setCreating(false)
    if (error) {
      setCreateErr(error.message + (
        error.message.toLowerCase().includes('design_projects')
          ? ' — make sure you ran supabase-design-projects.sql in Supabase.'
          : ''
      ))
      return
    }
    setNewName(''); setNewClient(''); setNewNotes('')
    setShowNew(false)
    fetchAll()
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return projects
    return projects.filter(p =>
      p.name.toLowerCase().includes(q) ||
      (p.clients?.name || '').toLowerCase().includes(q)
    )
  }, [projects, search])

  const TABS = [
    { id: 'cad',        label: 'CAD Assist Drawing' },
    { id: 'selections', label: 'Selections' },
    { id: 'takeoffs',   label: 'Take Offs' },
  ]

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Page title */}
      <h1 className="text-2xl font-bold text-gray-900 mb-4">📐 Design</h1>

      {/* Tab bar */}
      <div className="flex border-b border-gray-200 mb-6">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              activeTab === t.id
                ? 'border-green-700 text-green-800'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* CAD Assist Drawing — placeholder */}
      {activeTab === 'cad' && (
        <div className="bg-white border border-gray-200 rounded-2xl p-10 text-center max-w-2xl mx-auto">
          <p className="text-4xl mb-2">🛠️</p>
          <h2 className="text-base font-semibold text-gray-800 mb-1">CAD Assist Drawing</h2>
          <p className="text-sm text-gray-500">Coming soon — AI-assisted drawing tools will live here.</p>
        </div>
      )}

      {/* Selections — placeholder */}
      {activeTab === 'selections' && (
        <div className="bg-white border border-gray-200 rounded-2xl p-10 text-center max-w-2xl mx-auto">
          <p className="text-4xl mb-2">🎨</p>
          <h2 className="text-base font-semibold text-gray-800 mb-1">Selections</h2>
          <p className="text-sm text-gray-500">Coming soon — track plant, hardscape, and material selections per project.</p>
        </div>
      )}

      {/* Take Offs — the existing project list */}
      {activeTab === 'takeoffs' && (
      <>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
          {projects.length} project{projects.length === 1 ? '' : 's'}
        </span>
        <div className="ml-auto flex items-center gap-2">
          <input
            type="text"
            placeholder="Search projects…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-700/30 focus:border-green-700 w-64"
          />
          <button
            onClick={() => setShowNew(true)}
            className="text-sm font-bold text-white px-4 py-1.5 rounded-lg"
            style={{ backgroundColor: FG }}
          >
            + New Project
          </button>
        </div>
      </div>

      {/* Phase notice */}
      <div className="mb-6 p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
        🚧 <strong>Phase 1 of 5.</strong> Project list is live. File upload, viewer, scale calibration,
        drawing tools, and takeoff reports are coming in subsequent updates.
      </div>

      {/* Body */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-700"></div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 text-center py-16 text-gray-400">
          <p className="text-5xl mb-3">📐</p>
          {search ? (
            <p className="text-sm">No projects match your search.</p>
          ) : (
            <>
              <p className="text-base font-medium text-gray-600">No design projects yet.</p>
              <p className="text-sm mt-1">Click <strong>+ New Project</strong> above to start your first takeoff.</p>
            </>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr className="text-xs uppercase tracking-wide text-gray-500">
                <th className="text-left px-6 py-3 font-semibold">Project</th>
                <th className="text-left px-4 py-3 font-semibold">Client</th>
                <th className="text-left px-4 py-3 font-semibold">Created</th>
                <th className="text-left px-4 py-3 font-semibold">Notes</th>
                <th className="px-4 py-3 w-20"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(p => (
                <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-3 font-medium text-gray-900">
                    <Link to={`/design/${p.id}`} className="text-green-700 hover:underline">
                      {p.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{p.clients?.name || '—'}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                    {p.created_at ? new Date(p.created_at).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs truncate max-w-md">{p.notes || '—'}</td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      to={`/design/${p.id}`}
                      className="text-xs px-3 py-1.5 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors"
                    >
                      Open
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      </>
      )}

      {/* New Project modal */}
      {showNew && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          onClick={() => setShowNew(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div
              className="flex items-center justify-between px-6 py-4 border-b border-gray-200"
              style={{ backgroundColor: FG }}
            >
              <h2 className="text-base font-bold text-white">New Design Project</h2>
              <button
                onClick={() => setShowNew(false)}
                className="text-white/70 hover:text-white text-xl leading-none px-2"
              >✕</button>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Project Name <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="123 Main St — Front Yard"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-700/30 focus:border-green-700"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Client (optional)</label>
                <select
                  value={newClient}
                  onChange={e => setNewClient(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-700/30 focus:border-green-700 bg-white"
                >
                  <option value="">— No client —</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name || [c.last_name, c.first_name].filter(Boolean).join(', ')}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Notes (optional)</label>
                <textarea
                  value={newNotes}
                  onChange={e => setNewNotes(e.target.value)}
                  rows={3}
                  placeholder="Anything that'll help you find this later…"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-700/30 focus:border-green-700 resize-none"
                />
              </div>
              {createErr && (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-xs">
                  {createErr}
                </div>
              )}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNew(false)}
                  className="px-4 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating || !newName.trim()}
                  className="px-5 py-2 rounded-lg text-sm font-bold text-white disabled:opacity-50"
                  style={{ backgroundColor: FG }}
                >
                  {creating ? 'Creating…' : 'Create Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
