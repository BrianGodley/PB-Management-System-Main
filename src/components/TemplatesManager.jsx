import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

const AUTO_TRIGGER_LABELS = {
  sold_bid: 'Sold Bid → Job',
}

// ── Main TemplatesManager ─────────────────────────────────────────────────────
export default function TemplatesManager() {
  const { user } = useAuth()
  const [templates, setTemplates] = useState([])
  const [loading,   setLoading]   = useState(true)
  const [modal,     setModal]     = useState(null) // null | 'new' | template object (edit)

  useEffect(() => { fetchTemplates() }, [])

  async function fetchTemplates() {
    setLoading(true)
    const { data } = await supabase
      .from('job_templates')
      .select('*, template_folders(*)')
      .order('name')
    if (data) setTemplates(data.map(t => ({
      ...t,
      template_folders: (t.template_folders || []).sort((a, b) => a.sort_order - b.sort_order)
    })))
    setLoading(false)
  }

  async function handleDelete(id) {
    if (!confirm('Delete this template? This will not affect jobs already created from it.')) return
    await supabase.from('job_templates').delete().eq('id', id)
    setTemplates(prev => prev.filter(t => t.id !== id))
  }

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-bold text-gray-800">Job Templates</h2>
          <p className="text-xs text-gray-500 mt-0.5">Templates define folder structures and settings applied when a new job is created.</p>
        </div>
        <button
          onClick={() => setModal('new')}
          className="text-sm px-3 py-1.5 rounded-lg bg-green-700 text-white font-medium hover:bg-green-800 transition-colors"
        >+ New Template</button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-10">
          <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-green-700" />
        </div>
      ) : templates.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-gray-400">
          <p className="text-3xl mb-2">📋</p>
          <p className="text-sm font-medium text-gray-500">No templates yet</p>
          <p className="text-xs mt-1">Create a template to define folder structures for new jobs</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Template Name</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Project Manager</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Consultant</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Auto Trigger</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Folders</th>
                <th className="w-20" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {templates.map(t => (
                <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-semibold text-gray-900">{t.name}</td>
                  <td className="px-4 py-3 text-gray-600">{t.project_manager || <span className="text-gray-300 italic">—</span>}</td>
                  <td className="px-4 py-3 text-gray-600">{t.consultant || <span className="text-gray-300 italic">—</span>}</td>
                  <td className="px-4 py-3">
                    {t.auto_trigger
                      ? <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">{AUTO_TRIGGER_LABELS[t.auto_trigger] || t.auto_trigger}</span>
                      : <span className="text-gray-300 text-xs">None</span>}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">{t.template_folders?.length || 0} folder{t.template_folders?.length !== 1 ? 's' : ''}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 justify-end">
                      <button onClick={() => setModal(t)} className="text-xs text-blue-600 hover:text-blue-800 font-medium">Edit</button>
                      <button onClick={() => handleDelete(t.id)} className="text-xs text-red-400 hover:text-red-600">Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <TemplateModal
          template={modal === 'new' ? null : modal}
          userId={user?.id}
          onSave={() => { fetchTemplates(); setModal(null) }}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}

// ── Template Create / Edit Modal ──────────────────────────────────────────────
function TemplateModal({ template, userId, onSave, onClose }) {
  const isEdit = !!template
  const [form, setForm] = useState({
    name:            template?.name            || '',
    project_manager: template?.project_manager || '',
    consultant:      template?.consultant      || '',
    auto_trigger:    template?.auto_trigger    || '',
    notes:           template?.notes           || '',
  })
  const [folders,  setFolders]  = useState(
    (template?.template_folders || []).map(f => ({ ...f, _key: f.id }))
  )
  const [newFolder, setNewFolder] = useState('')
  const [saving,    setSaving]    = useState(false)

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  function addFolder() {
    const name = newFolder.trim()
    if (!name) return
    setFolders(prev => [...prev, { _key: `new-${Date.now()}`, folder_name: name, sort_order: prev.length }])
    setNewFolder('')
  }

  function removeFolder(key) {
    setFolders(prev => prev.filter(f => f._key !== key))
  }

  function moveFolder(key, dir) {
    setFolders(prev => {
      const idx = prev.findIndex(f => f._key === key)
      if (idx < 0) return prev
      const next = [...prev]
      const swap = idx + dir
      if (swap < 0 || swap >= next.length) return prev
      ;[next[idx], next[swap]] = [next[swap], next[idx]]
      return next.map((f, i) => ({ ...f, sort_order: i }))
    })
  }

  async function handleSave() {
    if (!form.name.trim()) return
    setSaving(true)

    if (isEdit) {
      // Update template
      await supabase.from('job_templates').update({
        name:            form.name.trim(),
        project_manager: form.project_manager.trim() || null,
        consultant:      form.consultant.trim()      || null,
        auto_trigger:    form.auto_trigger           || null,
        notes:           form.notes.trim()           || null,
        updated_at:      new Date().toISOString(),
      }).eq('id', template.id)

      // Delete all existing folders and re-insert (simplest sync strategy)
      await supabase.from('template_folders').delete().eq('template_id', template.id)
      if (folders.length) {
        await supabase.from('template_folders').insert(
          folders.map((f, i) => ({
            template_id: template.id,
            folder_name: f.folder_name,
            sort_order:  i,
          }))
        )
      }
    } else {
      // Insert new template
      const { data } = await supabase.from('job_templates').insert({
        name:            form.name.trim(),
        project_manager: form.project_manager.trim() || null,
        consultant:      form.consultant.trim()      || null,
        auto_trigger:    form.auto_trigger           || null,
        notes:           form.notes.trim()           || null,
        created_by:      userId,
      }).select().single()

      if (data && folders.length) {
        await supabase.from('template_folders').insert(
          folders.map((f, i) => ({
            template_id: data.id,
            folder_name: f.folder_name,
            sort_order:  i,
          }))
        )
      }
    }

    setSaving(false)
    onSave()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden flex flex-col"
        style={{ maxHeight: '90vh' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-green-700 px-6 py-4 flex-shrink-0">
          <h2 className="text-white font-bold text-lg">{isEdit ? 'Edit Template' : 'New Job Template'}</h2>
        </div>

        {/* Body */}
        <div className="px-6 py-5 overflow-y-auto space-y-4">

          {/* Name */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Template Name <span className="text-red-400">*</span></label>
            <input
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              value={form.name}
              onChange={e => set('name', e.target.value)}
              placeholder="e.g. Standard Install, Design-Build, Maintenance"
              autoFocus
            />
          </div>

          {/* PM + Consultant */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Project Manager</label>
              <input
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                value={form.project_manager}
                onChange={e => set('project_manager', e.target.value)}
                placeholder="Name"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Consultant</label>
              <input
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                value={form.consultant}
                onChange={e => set('consultant', e.target.value)}
                placeholder="Name"
              />
            </div>
          </div>

          {/* Auto Trigger */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Auto Trigger</label>
            <select
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
              value={form.auto_trigger}
              onChange={e => set('auto_trigger', e.target.value)}
            >
              <option value="">None — apply manually</option>
              <option value="sold_bid">Sold Bid → Job (auto-apply when bid is marked sold)</option>
            </select>
            {form.auto_trigger === 'sold_bid' && (
              <p className="text-xs text-green-700 mt-1">
                ✅ When a bid is marked as Sold, this template's folders will be automatically created on the new job.
              </p>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Notes</label>
            <textarea
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
              rows={2}
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              placeholder="Optional description…"
            />
          </div>

          {/* Folders */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-2">Folders <span className="text-gray-400 font-normal">(created on every job using this template)</span></label>

            {folders.length > 0 && (
              <div className="border border-gray-200 rounded-lg overflow-hidden mb-2">
                {folders.map((f, i) => (
                  <div key={f._key} className="flex items-center gap-2 px-3 py-2 border-b border-gray-100 last:border-b-0 bg-white hover:bg-gray-50">
                    <span className="text-gray-300 text-xs select-none w-4 text-center">{i + 1}</span>
                    <span className="flex-1 text-sm text-gray-800">📁 {f.folder_name}</span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => moveFolder(f._key, -1)}
                        disabled={i === 0}
                        className="text-gray-300 hover:text-gray-600 disabled:opacity-20 text-xs px-1"
                        title="Move up"
                      >▲</button>
                      <button
                        onClick={() => moveFolder(f._key, 1)}
                        disabled={i === folders.length - 1}
                        className="text-gray-300 hover:text-gray-600 disabled:opacity-20 text-xs px-1"
                        title="Move down"
                      >▼</button>
                      <button
                        onClick={() => removeFolder(f._key)}
                        className="text-red-300 hover:text-red-600 text-xs px-1 ml-1"
                        title="Remove folder"
                      >✕</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Add folder input */}
            <div className="flex gap-2">
              <input
                className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                value={newFolder}
                onChange={e => setNewFolder(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addFolder() } }}
                placeholder="Add folder name…"
              />
              <button
                onClick={addFolder}
                disabled={!newFolder.trim()}
                className="px-3 py-1.5 rounded-lg bg-green-700 text-white text-sm font-medium hover:bg-green-800 disabled:opacity-40 transition-colors"
              >+ Add</button>
            </div>
            <p className="text-xs text-gray-400 mt-1">Press Enter or click Add. Drag ▲▼ to reorder.</p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 pb-5 flex gap-3 flex-shrink-0 border-t border-gray-100 pt-4">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-semibold border border-gray-300 text-gray-600 hover:bg-gray-50">Cancel</button>
          <button
            onClick={handleSave}
            disabled={saving || !form.name.trim()}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white bg-green-700 hover:bg-green-800 disabled:opacity-50"
          >{saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Template'}</button>
        </div>
      </div>
    </div>
  )
}
