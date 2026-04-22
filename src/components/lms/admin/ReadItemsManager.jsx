import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../contexts/AuthContext'

export default function ReadItemsManager() {
  const { user } = useAuth()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ title: '', description: '' })
  const [file, setFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const fileRef = useRef()

  const load = async () => {
    setLoading(true)
    const { data } = await supabase.from('lms_read_items').select('*').order('created_at', { ascending: false })
    setItems(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const openAdd = () => {
    setEditing(null)
    setForm({ title: '', description: '' })
    setFile(null)
    setShowModal(true)
  }

  const openEdit = (item) => {
    setEditing(item)
    setForm({ title: item.title, description: item.description || '' })
    setFile(null)
    setShowModal(true)
  }

  const save = async () => {
    if (!form.title.trim()) return
    setSaving(true)
    let doc_url = editing?.doc_url || null
    let file_name = editing?.file_name || null

    if (file) {
      setUploading(true)
      const path = `read-items/${Date.now()}_${file.name}`
      const { error: upErr } = await supabase.storage.from('lms-documents').upload(path, file, { upsert: false })
      if (!upErr) {
        const { data: { publicUrl } } = supabase.storage.from('lms-documents').getPublicUrl(path)
        doc_url = publicUrl
        file_name = file.name
      }
      setUploading(false)
    }

    if (editing) {
      await supabase.from('lms_read_items').update({ ...form, doc_url, file_name }).eq('id', editing.id)
    } else {
      await supabase.from('lms_read_items').insert({ ...form, doc_url, file_name, created_by_email: user?.email })
    }
    setSaving(false)
    setShowModal(false)
    load()
  }

  const del = async (id) => {
    if (!confirm('Delete this read item?')) return
    await supabase.from('lms_read_items').delete().eq('id', id)
    load()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-gray-800">Read Items</h3>
          <p className="text-xs text-gray-500 mt-0.5">Upload documents that employees will read as part of a checksheet step.</p>
        </div>
        <button onClick={openAdd} className="px-3 py-1.5 bg-green-700 text-white text-sm rounded-lg hover:bg-green-800">
          + Add Read Item
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-gray-400 py-4">Loading…</p>
      ) : items.length === 0 ? (
        <div className="text-center py-10 text-gray-400">
          <div className="text-4xl mb-2">📄</div>
          <p className="text-sm">No read items yet. Add one to get started.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left py-2 px-3 text-xs font-medium text-gray-500">Title</th>
                <th className="text-left py-2 px-3 text-xs font-medium text-gray-500">Description</th>
                <th className="text-left py-2 px-3 text-xs font-medium text-gray-500">File</th>
                <th className="text-left py-2 px-3 text-xs font-medium text-gray-500">Created By</th>
                <th className="py-2 px-3"></th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-2 px-3 font-medium text-gray-900">{item.title}</td>
                  <td className="py-2 px-3 text-gray-500 max-w-xs truncate">{item.description || '—'}</td>
                  <td className="py-2 px-3">
                    {item.doc_url
                      ? <a href={item.doc_url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline text-xs">{item.file_name || 'View'}</a>
                      : <span className="text-gray-300 text-xs">No file</span>}
                  </td>
                  <td className="py-2 px-3 text-gray-400 text-xs">{item.created_by_email || '—'}</td>
                  <td className="py-2 px-3">
                    <div className="flex gap-3">
                      <button onClick={() => openEdit(item)} className="text-xs text-blue-600 hover:underline">Edit</button>
                      <button onClick={() => del(item.id)} className="text-xs text-red-500 hover:underline">Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 space-y-4">
            <h3 className="font-bold text-gray-900 text-lg">{editing ? 'Edit Read Item' : 'New Read Item'}</h3>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
              <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-green-500" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-green-500 resize-none" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Document File</label>
              {editing?.doc_url && !file && (
                <p className="text-xs text-gray-500 mb-2">Current: <a href={editing.doc_url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">{editing.file_name || 'View file'}</a></p>
              )}
              <div
                onClick={() => fileRef.current?.click()}
                className="flex flex-col items-center justify-center h-24 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-green-400 hover:bg-green-50 transition-colors"
              >
                {file ? (
                  <div className="text-center">
                    <p className="text-xl mb-0.5">📎</p>
                    <p className="text-xs font-medium text-gray-700">{file.name}</p>
                    <p className="text-xs text-gray-400">Click to change</p>
                  </div>
                ) : (
                  <div className="text-center text-gray-400">
                    <p className="text-2xl mb-0.5">📄</p>
                    <p className="text-xs">Click to upload (PDF, DOC, DOCX, etc.)</p>
                  </div>
                )}
              </div>
              <input ref={fileRef} type="file" className="sr-only" onChange={e => setFile(e.target.files?.[0] || null)} />
            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={save} disabled={saving || uploading || !form.title.trim()}
                className="flex-1 py-2.5 bg-green-700 text-white rounded-xl font-medium hover:bg-green-800 disabled:opacity-50">
                {uploading ? 'Uploading…' : saving ? 'Saving…' : 'Save'}
              </button>
              <button onClick={() => setShowModal(false)} className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
