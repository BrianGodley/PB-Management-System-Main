// src/pages/EDocuments.jsx
// E-Documents — a PandaDoc/DocuSign-style template + e-signature hub.
//
// Renders in two contexts:
//   • Top-level (route /edocuments)  → clientId = null, shows ALL clients'
//     documents with a Mine/All filter.
//   • Embedded in an opportunity (ClientDetail) → clientId set, scopes the
//     contracts list to that client.
//
// Sub-tabs: Created Contracts (default) · Templates · + New Document.
//
// THIS PHASE = foundation/scaffold. The PDF field-placement builder and the
// tokenized public signer page are the next phases; their entry points here
// (Edit template, open document, send) are wired as clearly-labelled stubs.
import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import EDocFieldEditor from '../components/edoc/EDocFieldEditor'
import EDocDocumentModal from '../components/edoc/EDocDocumentModal'
import FileManager from '../components/files/FileManager'
import GoogleDriveBrowser from '../components/files/GoogleDriveBrowser'
import PbsDrive from '../components/files/PbsDrive'

const STORAGE_BUCKET = 'edocuments'

const STATUS_STYLES = {
  draft: { label: 'Draft', cls: 'bg-gray-100 text-gray-600 border-gray-200' },
  sent: { label: 'Sent', cls: 'bg-blue-50 text-blue-700 border-blue-200' },
  viewed: { label: 'Viewed', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  completed: { label: 'Completed', cls: 'bg-green-50 text-green-700 border-green-200' },
  paid: { label: 'Paid', cls: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
  declined: { label: 'Declined', cls: 'bg-red-50 text-red-600 border-red-200' },
  voided: { label: 'Voided', cls: 'bg-gray-100 text-gray-400 border-gray-200' },
}

function StatusBadge({ status }) {
  const s = STATUS_STYLES[status] || STATUS_STYLES.draft
  return (
    <span className={`inline-block text-[11px] font-semibold border rounded-full px-2 py-0.5 ${s.cls}`}>
      {s.label}
    </span>
  )
}

const fmtDate = d =>
  d
    ? new Date(d).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: '2-digit' })
    : ''
const fmtMoney = n =>
  n != null && n !== '' ? `$${Number(n).toLocaleString(undefined, { maximumFractionDigits: 0 })}` : ''

export default function EDocuments({ clientId = null, embedded = false }) {
  const { user } = useAuth()
  const [subTab, setSubTab] = useState(embedded ? 'contracts' : 'dashboard')
  const [mainTab, setMainTab] = useState('edocuments')

  // Friendly first name for the New Document dashboard greeting.
  const firstName = (() => {
    const raw = user?.user_metadata?.full_name || user?.email || ''
    const base = raw.includes('@') ? raw.split('@')[0] : raw
    const first = (base.split(/[ .]/)[0] || 'there').trim()
    return first ? first.charAt(0).toUpperCase() + first.slice(1) : 'there'
  })()

  // The E-Documents area (sub-tab bar + content). Reused at top-level (under
  // the E-Documents tab) and embedded in an opportunity.
  const eDocsContent = (
    <>
      <div className="flex items-center justify-center gap-1 border-b border-gray-200 mb-4">
        {[
          ...(embedded ? [] : [['dashboard', 'Dashboard']]),
          ['contracts', 'Created Contracts'],
          ['templates', 'Templates'],
          ['new', '+ New Document'],
        ].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setSubTab(key)}
            className={`px-4 py-2 text-sm font-semibold border-b-2 -mb-px transition-colors ${
              subTab === key
                ? 'border-green-600 text-green-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      {subTab === 'dashboard' && <DashboardTab userId={user?.id} userName={firstName} />}
      {subTab === 'contracts' && (
        <ContractsTab clientId={clientId} userId={user?.id} embedded={embedded} />
      )}
      {subTab === 'templates' && <TemplatesTab userId={user?.id} />}
      {subTab === 'new' && (
        <NewDocumentTab
          clientId={clientId}
          userId={user?.id}
          userName={firstName}
          onCreated={() => setSubTab('contracts')}
        />
      )}
    </>
  )

  // Embedded in an opportunity: just the E-Documents area (no file manager).
  if (embedded) return <div>{eDocsContent}</div>

  // Top-level Documents page: white tab bar with the file managers + E-Documents.
  const MAIN_TABS = [
    ['edocuments', '✍️ E-Documents'],
    ['files', '🗂️ PBS Drive'],
    ['gdrive', '🔵 Google Drive'],
    ['photos', '🖼️ Photos'],
    ['videos', '🎞️ Videos'],
  ]
  return (
    <div className="h-full flex flex-col">
      {/* Tab bar */}
      <div className="bg-white border-b border-gray-200 flex justify-center gap-0 flex-shrink-0 overflow-x-auto rounded-xl">
        {MAIN_TABS.map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setMainTab(key)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
              mainTab === key
                ? 'border-green-700 text-green-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-y-auto mt-4">
        {mainTab === 'files' && <PbsDrive />}
        {mainTab === 'photos' && <FileManager root="photos" accept="image/*" />}
        {mainTab === 'videos' && <FileManager root="videos" accept="video/*" />}
        {mainTab === 'gdrive' && <GoogleDriveBrowser />}
        {mainTab === 'edocuments' && eDocsContent}
      </div>
    </div>
  )
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
const DASH_STAGES = [
  { id: 'drafts', label: 'Drafts', match: s => s === 'draft' },
  { id: 'waiting', label: 'Waiting for others', match: s => s === 'sent' || s === 'viewed' },
  { id: 'finalized', label: 'Finalized', match: s => s === 'completed' || s === 'paid' },
  { id: 'rejected', label: 'Rejected', match: s => s === 'declined' || s === 'voided' },
]

function StageTiles({ docs }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {DASH_STAGES.map(st => {
        const n = docs.filter(d => st.match(d.status)).length
        return (
          <div
            key={st.id}
            className="rounded-xl px-4 py-3 bg-white/80 backdrop-blur-sm border border-white/70 shadow-sm"
          >
            <p className="text-3xl font-bold text-gray-900 leading-none">{n}</p>
            <p className="text-xs text-gray-600 mt-1">{st.label}</p>
          </div>
        )
      })}
    </div>
  )
}

function DashboardTab({ userId, userName }) {
  const [docs, setDocs] = useState([])
  const [avatarUrl, setAvatarUrl] = useState(null)

  useEffect(() => {
    supabase
      .from('edoc_documents')
      .select('id, status, created_by')
      .then(({ data }) => setDocs(data || []))
  }, [])
  useEffect(() => {
    if (!userId) return
    supabase
      .from('profiles')
      .select('avatar_url')
      .eq('id', userId)
      .single()
      .then(({ data }) => setAvatarUrl(data?.avatar_url || null))
  }, [userId])

  const myDocs = docs.filter(d => d.created_by === userId)

  return (
    <div>
      {/* You — ~2.5in tall, aurora-colored background */}
      <div
        className="relative rounded-2xl overflow-hidden border border-emerald-100 mb-5"
        style={{
          height: '2.5in',
          backgroundColor: '#0b1120',
          backgroundImage:
            'radial-gradient(at 18% 22%, #6ee7b7 0px, transparent 55%), ' +
            'radial-gradient(at 78% 8%, #22d3ee 0px, transparent 50%), ' +
            'radial-gradient(at 5% 78%, #3b82f6 0px, transparent 55%), ' +
            'radial-gradient(at 88% 92%, #a78bfa 0px, transparent 55%), ' +
            'radial-gradient(at 55% 50%, #34d399 0px, transparent 60%)',
        }}
      >
        <div className="absolute top-4 left-4 flex items-center gap-3">
          <div className="w-12 h-12 rounded-full overflow-hidden bg-green-800 text-white flex items-center justify-center font-bold ring-2 ring-white/80">
            {avatarUrl ? (
              <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              (userName?.[0] || 'U').toUpperCase()
            )}
          </div>
          <h3 className="text-lg font-bold text-white drop-shadow">You</h3>
        </div>
        <div className="absolute inset-x-4 bottom-4">
          <StageTiles docs={myDocs} />
        </div>
      </div>

      {/* Team — matches the You height (2.5in), aurora-colored background */}
      <div
        className="relative rounded-2xl overflow-hidden border border-violet-100"
        style={{
          height: '2.5in',
          backgroundColor: '#0b1120',
          backgroundImage:
            'radial-gradient(at 22% 18%, #818cf8 0px, transparent 55%), ' +
            'radial-gradient(at 82% 12%, #c084fc 0px, transparent 50%), ' +
            'radial-gradient(at 8% 82%, #22d3ee 0px, transparent 55%), ' +
            'radial-gradient(at 90% 88%, #34d399 0px, transparent 55%), ' +
            'radial-gradient(at 50% 55%, #6366f1 0px, transparent 60%)',
        }}
      >
        <div className="absolute top-4 left-4">
          <h3 className="text-lg font-bold text-white drop-shadow">Team</h3>
        </div>
        <div className="absolute inset-x-4 bottom-4">
          <StageTiles docs={docs} />
        </div>
      </div>
    </div>
  )
}

// ── Created Contracts ─────────────────────────────────────────────────────────
function ContractsTab({ clientId, userId, embedded }) {
  const [docs, setDocs] = useState([])
  const [loading, setLoading] = useState(true)
  const [scope, setScope] = useState('all') // 'mine' | 'all'
  const [statusFilter, setStatusFilter] = useState('all')
  const [openDoc, setOpenDoc] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    let q = supabase
      .from('edoc_documents')
      .select('*, clients ( name )')
      .order('created_at', { ascending: false })
    if (clientId) q = q.eq('client_id', clientId)
    if (scope === 'mine' && userId) q = q.eq('created_by', userId)
    if (statusFilter !== 'all') q = q.eq('status', statusFilter)
    const { data } = await q
    setDocs(data || [])
    setLoading(false)
  }, [clientId, scope, statusFilter, userId])

  useEffect(() => {
    load()
  }, [load])

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-3">
        {!clientId && (
          <div className="inline-flex rounded-lg border border-gray-300 overflow-hidden text-xs font-semibold">
            <button
              onClick={() => setScope('mine')}
              className={`px-3 py-1.5 ${scope === 'mine' ? 'bg-green-700 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
            >
              Mine
            </button>
            <button
              onClick={() => setScope('all')}
              className={`px-3 py-1.5 ${scope === 'all' ? 'bg-green-700 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
            >
              All
            </button>
          </div>
        )}
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="input text-xs py-1.5 w-40"
        >
          <option value="all">All statuses</option>
          {Object.entries(STATUS_STYLES).map(([k, v]) => (
            <option key={k} value={k}>
              {v.label}
            </option>
          ))}
        </select>
        <button onClick={load} className="text-xs text-gray-500 hover:text-gray-700 ml-auto">
          ↻ Refresh
        </button>
      </div>

      {loading ? (
        <p className="text-center text-sm text-gray-400 py-8">Loading…</p>
      ) : docs.length === 0 ? (
        <p className="text-center text-sm text-gray-400 py-8">No contracts yet.</p>
      ) : (
        <div className="overflow-x-auto border border-gray-200 rounded-xl">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 uppercase tracking-wide text-xs">
                <th className="px-4 py-2 text-left font-semibold">Document</th>
                {!clientId && <th className="px-3 py-2 text-left font-semibold">Client</th>}
                <th className="px-3 py-2 text-left font-semibold">Status</th>
                <th className="px-3 py-2 text-right font-semibold">Amount</th>
                <th className="px-3 py-2 text-left font-semibold">By</th>
                <th className="px-3 py-2 text-left font-semibold">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {docs.map(d => (
                <tr
                  key={d.id}
                  onClick={() => setOpenDoc(d)}
                  className="hover:bg-gray-50 cursor-pointer"
                >
                  <td className="px-4 py-2 font-medium text-gray-800">{d.name}</td>
                  {!clientId && (
                    <td className="px-3 py-2 text-gray-600">{d.clients?.name || '—'}</td>
                  )}
                  <td className="px-3 py-2">
                    <StatusBadge status={d.status} />
                  </td>
                  <td className="px-3 py-2 text-right text-gray-700">{fmtMoney(d.amount)}</td>
                  <td className="px-3 py-2 text-gray-500">
                    {d.created_by === userId ? 'You' : '—'}
                  </td>
                  <td className="px-3 py-2 text-gray-500">{fmtDate(d.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {openDoc && (
        <EDocDocumentModal
          doc={openDoc}
          onClose={() => setOpenDoc(null)}
          onChanged={() => {
            setOpenDoc(null)
            load()
          }}
        />
      )}
    </div>
  )
}

// ── Templates ───────────────────────────────────────────────────────────────
function TemplatesTab({ userId }) {
  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [editing, setEditing] = useState(null) // template being field-edited
  const fileRef = useRef(null)

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('edoc_templates')
      .select('*')
      .order('created_at', { ascending: false })
    setTemplates(data || [])
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function handleUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.type !== 'application/pdf') {
      alert('Please choose a PDF file.')
      return
    }
    setUploading(true)
    try {
      const path = `templates/${crypto.randomUUID()}.pdf`
      const { error: upErr } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(path, file, { contentType: 'application/pdf' })
      if (upErr) throw upErr
      const niceName = file.name.replace(/\.pdf$/i, '')
      const { error: insErr } = await supabase.from('edoc_templates').insert({
        name: niceName,
        pdf_path: path,
        created_by: userId || null,
      })
      if (insErr) throw insErr
      await load()
    } catch (err) {
      alert('Upload failed: ' + (err.message || 'unknown error'))
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  async function handleDelete(t) {
    if (!window.confirm(`Delete template "${t.name}"? This cannot be undone.`)) return
    if (t.pdf_path) {
      await supabase.storage.from(STORAGE_BUCKET).remove([t.pdf_path])
    }
    const { error } = await supabase.from('edoc_templates').delete().eq('id', t.id)
    if (error) {
      alert('Delete failed: ' + error.message)
      return
    }
    load()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-gray-500">
          Upload a PDF, then place fillable fields on it (field editor — next phase).
        </p>
        <div>
          <input
            ref={fileRef}
            type="file"
            accept="application/pdf"
            onChange={handleUpload}
            className="hidden"
          />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="text-xs px-3 py-1.5 rounded-lg bg-green-700 text-white font-semibold hover:bg-green-800 disabled:opacity-50"
          >
            {uploading ? 'Uploading…' : '⬆ Upload PDF Template'}
          </button>
        </div>
      </div>

      {loading ? (
        <p className="text-center text-sm text-gray-400 py-8">Loading…</p>
      ) : templates.length === 0 ? (
        <p className="text-center text-sm text-gray-400 py-8">
          No templates yet. Upload your Home Improvement Contract to get started.
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {templates.map(t => (
            <div key={t.id} className="border border-gray-200 rounded-xl p-4 bg-white">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold text-gray-800 truncate">📄 {t.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {(t.fields?.length || 0)} field{(t.fields?.length || 0) !== 1 ? 's' : ''} ·{' '}
                    {fmtDate(t.created_at)}
                  </p>
                </div>
              </div>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => setEditing(t)}
                  className="flex-1 text-xs border border-gray-300 rounded-lg py-1.5 text-gray-700 hover:bg-gray-50 font-medium"
                >
                  ✎ Edit Fields
                </button>
                <button
                  onClick={() => handleDelete(t)}
                  className="text-xs border border-red-200 text-red-500 rounded-lg py-1.5 px-3 hover:bg-red-50"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <EDocFieldEditor
          template={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null)
            load()
          }}
        />
      )}
    </div>
  )
}

// ── New Document (dashboard) ──────────────────────────────────────────────────
// Opens to a status dashboard (drafts / waiting / finalized / rejected) with a
// search bar and a big "Create document" empty state. "Create" / "+ Document"
// switch to the Blank / from-Template chooser.
const NEW_DOC_CATS = [
  { id: 'drafts', label: 'Your drafts', match: s => s === 'draft' },
  { id: 'waiting', label: 'Waiting for others', match: s => s === 'sent' || s === 'viewed' },
  { id: 'finalized', label: 'Finalized', match: s => s === 'completed' || s === 'paid' },
  { id: 'rejected', label: 'Rejected', match: s => s === 'declined' || s === 'voided' },
]

function NewDocumentTab({ clientId, userId, userName, onCreated }) {
  const [view, setView] = useState('dashboard') // 'dashboard' | 'create'
  const [templates, setTemplates] = useState([])
  const [docs, setDocs] = useState([])
  const [creating, setCreating] = useState(false)
  const [statusTab, setStatusTab] = useState('drafts')
  const [search, setSearch] = useState('')
  const [openDoc, setOpenDoc] = useState(null)

  const loadDocs = useCallback(async () => {
    let q = supabase
      .from('edoc_documents')
      .select('*, clients ( name )')
      .order('created_at', { ascending: false })
    if (clientId) q = q.eq('client_id', clientId)
    const { data } = await q
    setDocs(data || [])
  }, [clientId])

  useEffect(() => {
    loadDocs()
  }, [loadDocs])
  useEffect(() => {
    supabase
      .from('edoc_templates')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .then(({ data }) => setTemplates(data || []))
  }, [])

  const counts = Object.fromEntries(
    NEW_DOC_CATS.map(c => [c.id, docs.filter(d => c.match(d.status)).length])
  )
  const activeCat = NEW_DOC_CATS.find(c => c.id === statusTab) || NEW_DOC_CATS[0]
  const visible = docs
    .filter(d => activeCat.match(d.status))
    .filter(d => !search || (d.name || '').toLowerCase().includes(search.toLowerCase()))

  async function createDoc({ template }) {
    setCreating(true)
    try {
      const { data, error } = await supabase
        .from('edoc_documents')
        .insert({
          template_id: template?.id || null,
          client_id: clientId || null,
          name: template ? template.name : 'Untitled Document',
          status: 'draft',
          pdf_path: template?.pdf_path || null,
          page_count: template?.page_count || 1,
          fields: template?.fields || [],
          created_by: userId || null,
        })
        .select('*, clients ( name )')
        .single()
      if (error) throw error
      await loadDocs()
      setView('dashboard')
      setStatusTab('drafts')
      setOpenDoc(data) // jump straight into prepare / send
    } catch (err) {
      alert('Create failed: ' + (err.message || 'unknown error'))
    } finally {
      setCreating(false)
    }
  }

  // ── Create chooser ──
  if (view === 'create') {
    return (
      <div>
        <button
          onClick={() => setView('dashboard')}
          className="text-sm text-gray-500 hover:text-gray-700 mb-3"
        >
          ← Back
        </button>
        <p className="text-sm text-gray-500 mb-3">Start a new document to send for signature.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <button
            disabled={creating}
            onClick={() => createDoc({ template: null })}
            className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-green-400 hover:bg-green-50 transition-colors disabled:opacity-50"
          >
            <div className="text-2xl mb-1">＋</div>
            <p className="font-semibold text-gray-700">Blank Document</p>
            <p className="text-xs text-gray-400 mt-0.5">Upload a PDF and add fields</p>
          </button>
          {templates.map(t => (
            <button
              key={t.id}
              disabled={creating}
              onClick={() => createDoc({ template: t })}
              className="border border-gray-200 rounded-xl p-6 text-left hover:border-green-400 hover:bg-green-50 transition-colors disabled:opacity-50"
            >
              <div className="text-2xl mb-1">📄</div>
              <p className="font-semibold text-gray-700 truncate">{t.name}</p>
              <p className="text-xs text-gray-400 mt-0.5">From template</p>
            </button>
          ))}
        </div>
      </div>
    )
  }

  // ── Dashboard ──
  return (
    <div>
      {/* Search */}
      <div className="relative mb-5">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search documents"
          className="w-full bg-gray-50 border border-gray-200 rounded-lg pl-9 pr-9 py-2.5 text-sm focus:outline-none focus:border-green-500"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        )}
      </div>

      {/* Greeting + Document button */}
      <div className="flex items-center justify-between gap-3 mb-3">
        <h2 className="text-xl font-bold text-gray-900">Your documents</h2>
        <button
          onClick={() => setView('create')}
          className="inline-flex items-center gap-1.5 bg-green-700 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-green-800"
        >
          ＋ Document
        </button>
      </div>

      {/* Status strip */}
      <div className="flex items-stretch gap-0 border-b border-gray-200 overflow-x-auto mb-6">
        {NEW_DOC_CATS.map(c => (
          <button
            key={c.id}
            onClick={() => setStatusTab(c.id)}
            className={`px-5 py-2.5 text-left border-b-2 whitespace-nowrap transition-colors ${
              statusTab === c.id
                ? 'border-green-700 bg-green-50/40'
                : 'border-transparent hover:bg-gray-50'
            }`}
          >
            <p
              className={`text-sm font-semibold ${
                statusTab === c.id ? 'text-green-800' : 'text-gray-700'
              }`}
            >
              {c.label}
            </p>
            <p className="text-xs text-gray-400">
              {counts[c.id]} doc{counts[c.id] === 1 ? '' : 's'}
            </p>
          </button>
        ))}
      </div>

      {/* Content */}
      {visible.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <button
            onClick={() => setView('create')}
            className="w-28 h-28 rounded-2xl bg-green-50 border border-green-100 flex items-center justify-center text-5xl text-gray-400 hover:bg-green-100 transition-colors mb-4"
          >
            ＋
          </button>
          <p className="font-bold text-gray-800">Start here — or pick up where you left off</p>
          <p className="text-sm text-gray-500 mt-1 max-w-sm">
            Create your first document, or return here to continue with any unsent documents.
          </p>
          <button
            onClick={() => setView('create')}
            className="mt-5 inline-flex items-center gap-1.5 border border-green-600 text-green-700 text-sm font-semibold px-5 py-2.5 rounded-lg hover:bg-green-50"
          >
            ＋ Create document
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto border border-gray-200 rounded-xl">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 uppercase tracking-wide text-xs">
                <th className="px-4 py-2 text-left font-semibold">Document</th>
                {!clientId && <th className="px-3 py-2 text-left font-semibold">Client</th>}
                <th className="px-3 py-2 text-left font-semibold">Status</th>
                <th className="px-3 py-2 text-left font-semibold">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {visible.map(d => (
                <tr
                  key={d.id}
                  onClick={() => setOpenDoc(d)}
                  className="hover:bg-gray-50 cursor-pointer"
                >
                  <td className="px-4 py-2 font-medium text-gray-800">{d.name}</td>
                  {!clientId && (
                    <td className="px-3 py-2 text-gray-600">{d.clients?.name || '—'}</td>
                  )}
                  <td className="px-3 py-2">
                    <StatusBadge status={d.status} />
                  </td>
                  <td className="px-3 py-2 text-gray-500">{fmtDate(d.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {openDoc && (
        <EDocDocumentModal
          doc={openDoc}
          onClose={() => setOpenDoc(null)}
          onChanged={() => {
            setOpenDoc(null)
            loadDocs()
          }}
        />
      )}
    </div>
  )
}
