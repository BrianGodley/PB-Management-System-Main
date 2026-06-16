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
  const [subTab, setSubTab] = useState('contracts')
  const [mainTab, setMainTab] = useState('files')

  // The E-Documents area (sub-tab bar + content). Reused at top-level (under
  // the E-Documents tab) and embedded in an opportunity.
  const eDocsContent = (
    <>
      <div className="flex items-center gap-1 border-b border-gray-200 mb-4">
        {[
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
      {subTab === 'contracts' && (
        <ContractsTab clientId={clientId} userId={user?.id} embedded={embedded} />
      )}
      {subTab === 'templates' && <TemplatesTab userId={user?.id} />}
      {subTab === 'new' && (
        <NewDocumentTab clientId={clientId} userId={user?.id} onCreated={() => setSubTab('contracts')} />
      )}
    </>
  )

  // Embedded in an opportunity: just the E-Documents area (no file manager).
  if (embedded) return <div>{eDocsContent}</div>

  // Top-level Documents page: white tab bar with the file managers + E-Documents.
  const MAIN_TABS = [
    ['files', '📁 Files'],
    ['photos', '🖼️ Photos'],
    ['videos', '🎞️ Videos'],
    ['edocuments', '✍️ E-Documents'],
  ]
  return (
    <div className="p-4 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-3">Documents</h1>
      <div className="bg-white border border-gray-200 rounded-t-lg flex gap-0 -mb-px overflow-x-auto">
        {MAIN_TABS.map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setMainTab(key)}
            className={`flex items-center gap-1.5 px-5 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
              mainTab === key
                ? 'border-green-700 text-green-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="bg-white border border-gray-200 rounded-b-lg rounded-tr-lg p-4">
        {mainTab === 'files' && <FileManager root="files" />}
        {mainTab === 'photos' && <FileManager root="photos" accept="image/*" />}
        {mainTab === 'videos' && <FileManager root="videos" accept="video/*" />}
        {mainTab === 'edocuments' && eDocsContent}
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

// ── New Document ──────────────────────────────────────────────────────────────
function NewDocumentTab({ clientId, userId, onCreated }) {
  const [templates, setTemplates] = useState([])
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    supabase
      .from('edoc_templates')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .then(({ data }) => setTemplates(data || []))
  }, [])

  async function createDoc({ template }) {
    setCreating(true)
    try {
      const { error } = await supabase.from('edoc_documents').insert({
        template_id: template?.id || null,
        client_id: clientId || null,
        name: template ? template.name : 'Untitled Document',
        status: 'draft',
        pdf_path: template?.pdf_path || null,
        page_count: template?.page_count || 1,
        fields: template?.fields || [],
        created_by: userId || null,
      })
      if (error) throw error
      alert('Draft created. The document editor & send flow arrives in the next phase.')
      onCreated?.()
    } catch (err) {
      alert('Create failed: ' + (err.message || 'unknown error'))
    } finally {
      setCreating(false)
    }
  }

  return (
    <div>
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
