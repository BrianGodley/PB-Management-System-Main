import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../contexts/AuthContext'

// Documents Library — category-driven document store (formerly "Read Items").
// Backed by lms_read_items (+ category). Files live in the lms-documents bucket.
// The checksheet builder pulls these in via the existing "read" step.
export default function DocumentsLibraryManager() {
  const { user } = useAuth()
  const [cats, setCats] = useState([])
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ title: '', description: '', category: 'General' })
  const [file, setFile] = useState(null)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef()

  const load = useCallback(async () => {
    setLoading(true)
    const [c, d] = await Promise.all([
      supabase.from('lms_categories').select('*').order('sort_order').order('name'),
      supabase.from('lms_read_items').select('*').order('created_at', { ascending: false }),
    ])
    setCats(c.data || [])
    setItems(d.data || [])
    setLoading(false)
  }, [])
  useEffect(() => { load() }, [load])

  const openAdd = () => {
    setEditing(null)
    setForm({ title: '', description: '', category: filter !== 'all' ? filter : (cats[0]?.name || 'General') })
    setFile(null)
    setShowModal(true)
  }
  const openEdit = it => {
    setEditing(it)
    setForm({ title: it.title, description: it.description || '', category: it.category || 'General' })
    setFile(null)
    setShowModal(true)
  }

  const save = async () => {
    if (!form.title.trim()) return
    setSaving(true)
    let doc_url = editing?.doc_url || null
    let file_name = editing?.file_name || null
    let mime_type = editing?.mime_type || null
    let size_bytes = editing?.size_bytes || null
    if (file) {
      setUploading(true)
      const path = `documents/${Date.now()}_${file.name.replace(/[^\w.\-]+/g, '_')}`
      const { error: upErr } = await supabase.storage
        .from('lms-documents').upload(path, file, { contentType: file.type, upsert: false })
      if (!upErr) {
        doc_url = supabase.storage.from('lms-documents').getPublicUrl(path).data.publicUrl
        file_name = file.name; mime_type = file.type; size_bytes = file.size
      }
      setUploading(false)
    }
    const payload = {
      title: form.title.trim(), description: form.description.trim() || null,
      category: form.category || 'General', doc_url, file_name, mime_type, size_bytes,
    }
    if (editing) {
      await supabase.from('lms_read_items').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', editing.id)
    } else {
      await supabase.from('lms_read_items').insert({ ...payload, created_by_email: user?.email })
    }
    setSaving(false); setShowModal(false); load()
  }

  const del = async it => {
    if (!confirm(`Delete "${it.title}"?`)) return
    if (it.doc_url) {
      const p = it.doc_url.split('/lms-documents/')[1]
      if (p) await supabase.storage.from('lms-documents').remove([decodeURIComponent(p)]).catch(() => {})
    }
    await supabase.from('lms_read_items').delete().eq('id', it.id)
    load()
  }

  const shown = filter === 'all' ? items : items.filter(i => (i.category || 'General') === filter)

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-gray-800">Documents Library</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Category-driven documents employees read in a checksheet step.
          </p>
        </div>
        <button onClick={openAdd} className="px-3 py-1.5 bg-green-700 text-white text-sm rounded-lg hover:bg-green-800">
          + Add Document
        </button>
      </div>

      <div className="flex flex-wrap gap-1.5 mb-4">
        <Pill active={filter === 'all'} onClick={() => setFilter('all')}>All</Pill>
        {cats.map(c => (
          <Pill key={c.id} active={filter === c.name} onClick={() => setFilter(c.name)}>{c.name}</Pill>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-gray-400 py-4">Loading…</p>
      ) : shown.length === 0 ? (
        <div className="text-center py-10 text-gray-400">
          <div className="text-4xl mb-2">📄</div>
          <p className="text-sm">No documents here yet.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map(it => (
            <div key={it.id} className="border border-gray-200 rounded-xl overflow-hidden bg-white hover:shadow-md transition-shadow">
              <div className="h-20 bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center text-3xl">📄</div>
              <div className="p-4">
                <span className="inline-block text-[10px] font-semibold uppercase tracking-wide text-green-700 bg-green-50 rounded px-2 py-0.5 mb-1.5">
                  {it.category || 'General'}
                </span>
                <p className="font-medium text-gray-900 truncate">{it.title}</p>
                {it.description && <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{it.description}</p>}
                <div className="flex items-center justify-between mt-3">
                  {it.doc_url
                    ? <a href={it.doc_url} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline truncate max-w-[55%]">{it.file_name || 'View'}</a>
                    : <span className="text-xs text-gray-300">No file</span>}
                  <div className="flex gap-3 flex-shrink-0">
                    <button onClick={() => openEdit(it)} className="text-xs text-gray-500 hover:text-gray-800">Edit</button>
                    <button onClick={() => del(it)} className="text-xs text-red-500 hover:text-red-700">Delete</button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 space-y-4">
            <h3 className="font-bold text-gray-900 text-lg">{editing ? 'Edit Document' : 'New Document'}</h3>
            <Field label="Title *">
              <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-green-500" />
            </Field>
            <Field label="Category">
              <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-green-500">
                {cats.length === 0 && <option value="General">General</option>}
                {cats.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
              </select>
            </Field>
            <Field label="Description">
              <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-green-500 resize-none" />
            </Field>
            <Field label="Document File">
              {editing?.doc_url && !file && (
                <p className="text-xs text-gray-500 mb-2">Current: <a href={editing.doc_url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">{editing.file_name || 'View file'}</a></p>
              )}
              <div onClick={() => fileRef.current?.click()}
                className="flex flex-col items-center justify-center h-24 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-green-400 hover:bg-green-50 transition-colors">
                {file ? <div className="text-center"><p className="text-xl mb-0.5">📎</p><p className="text-xs font-medium text-gray-700">{file.name}</p><p className="text-xs text-gray-400">Click to change</p></div>
                      : <div className="text-center text-gray-400"><p className="text-2xl mb-0.5">📄</p><p className="text-xs">Click to upload (PDF, DOC, XLS, PPT, image)</p></div>}
              </div>
              <input ref={fileRef} type="file" className="sr-only" onChange={e => setFile(e.target.files?.[0] || null)} />
            </Field>
            <div className="flex gap-3 pt-2">
              <button onClick={save} disabled={saving || uploading || !form.title.trim()}
                className="flex-1 py-2.5 bg-green-700 text-white rounded-xl font-medium hover:bg-green-800 disabled:opacity-50">
                {uploading ? 'Uploading…' : saving ? 'Saving…' : 'Save'}
              </button>
              <button onClick={() => setShowModal(false)} className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Pill({ active, onClick, children }) {
  return (
    <button onClick={onClick}
      className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${active ? 'bg-green-700 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
      {children}
    </button>
  )
}
function Field({ label, children }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {children}
    </div>
  )
}
