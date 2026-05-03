import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

const AUTO_TRIGGER_LABELS = {
  sold_bid: 'Sold Bid → Job',
}

// ── Generic list helpers factory ──────────────────────────────────────────────
function makeListHelpers(setList) {
  return {
    add(nameField, value, keyPrefix = '') {
      const trimmed = value.trim()
      if (!trimmed) return
      setList(prev => [...prev, { _key: `${keyPrefix}new-${Date.now()}`, [nameField]: trimmed, sort_order: prev.length }])
    },
    remove(key) {
      setList(prev => prev.filter(x => x._key !== key))
    },
    move(key, dir) {
      setList(prev => {
        const idx = prev.findIndex(x => x._key === key)
        if (idx < 0) return prev
        const next = [...prev]
        const swap = idx + dir
        if (swap < 0 || swap >= next.length) return prev
        ;[next[idx], next[swap]] = [next[swap], next[idx]]
        return next.map((x, i) => ({ ...x, sort_order: i }))
      })
    },
  }
}

// ── Reusable folder list section ──────────────────────────────────────────────
function FolderSection({ icon, label, folders, helpers, newName, setNewName }) {
  function handleAdd() {
    helpers.add('folder_name', newName, icon)
    setNewName('')
  }
  return (
    <div>
      <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 mb-2">
        <span>{icon}</span> {label}
      </label>
      {folders.length > 0 && (
        <div className="border border-gray-200 rounded-lg overflow-hidden mb-2">
          {folders.map((f, i) => (
            <div key={f._key} className="flex items-center gap-2 px-3 py-2 border-b border-gray-100 last:border-b-0 bg-white hover:bg-gray-50">
              <span className="text-gray-300 text-xs select-none w-4 text-center">{i + 1}</span>
              <span className="flex-1 text-sm text-gray-800">📁 {f.folder_name}</span>
              <div className="flex items-center gap-1">
                <button onClick={() => helpers.move(f._key, -1)} disabled={i === 0}
                  className="text-gray-300 hover:text-gray-600 disabled:opacity-20 text-xs px-1" title="Move up">▲</button>
                <button onClick={() => helpers.move(f._key, 1)} disabled={i === folders.length - 1}
                  className="text-gray-300 hover:text-gray-600 disabled:opacity-20 text-xs px-1" title="Move down">▼</button>
                <button onClick={() => helpers.remove(f._key)}
                  className="text-red-300 hover:text-red-600 text-xs px-1 ml-1">✕</button>
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <input
          className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          value={newName}
          onChange={e => setNewName(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAdd() } }}
          placeholder="Add folder name…"
        />
        <button onClick={handleAdd} disabled={!newName.trim()}
          className="px-3 py-1.5 rounded-lg bg-green-700 text-white text-sm font-medium hover:bg-green-800 disabled:opacity-40 transition-colors">
          + Add
        </button>
      </div>
    </div>
  )
}

// ── Reusable task list section ────────────────────────────────────────────────
function TaskSection({ tasks, helpers, newName, setNewName }) {
  function handleAdd() {
    helpers.add('task_name', newName, 'task')
    setNewName('')
  }
  return (
    <div>
      <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 mb-2">
        <span>✅</span> Tasks
      </label>
      {tasks.length > 0 && (
        <div className="border border-gray-200 rounded-lg overflow-hidden mb-2">
          {tasks.map((t, i) => (
            <div key={t._key} className="flex items-center gap-2 px-3 py-2 border-b border-gray-100 last:border-b-0 bg-white hover:bg-gray-50">
              <span className="text-gray-300 text-xs select-none w-4 text-center">{i + 1}</span>
              <span className="flex-1 text-sm text-gray-800">{t.task_name}</span>
              <div className="flex items-center gap-1">
                <button onClick={() => helpers.move(t._key, -1)} disabled={i === 0}
                  className="text-gray-300 hover:text-gray-600 disabled:opacity-20 text-xs px-1">▲</button>
                <button onClick={() => helpers.move(t._key, 1)} disabled={i === tasks.length - 1}
                  className="text-gray-300 hover:text-gray-600 disabled:opacity-20 text-xs px-1">▼</button>
                <button onClick={() => helpers.remove(t._key)}
                  className="text-red-300 hover:text-red-600 text-xs px-1 ml-1">✕</button>
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <input
          className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          value={newName}
          onChange={e => setNewName(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAdd() } }}
          placeholder="Add task name…"
        />
        <button onClick={handleAdd} disabled={!newName.trim()}
          className="px-3 py-1.5 rounded-lg bg-green-700 text-white text-sm font-medium hover:bg-green-800 disabled:opacity-40 transition-colors">
          + Add
        </button>
      </div>
    </div>
  )
}

// ── Main TemplatesManager ─────────────────────────────────────────────────────
export default function TemplatesManager() {
  const { user } = useAuth()
  const [templates, setTemplates] = useState([])
  const [loading,   setLoading]   = useState(true)
  const [modal,     setModal]     = useState(null)

  useEffect(() => { fetchTemplates() }, [])

  async function fetchTemplates() {
    setLoading(true)

    // Try with template_tasks; fall back without it if the table doesn't exist yet
    let { data, error } = await supabase
      .from('job_templates')
      .select('*, template_folders(*), template_tasks(*)')
      .order('name')

    if (error || !data) {
      const res = await supabase
        .from('job_templates')
        .select('*, template_folders(*)')
        .order('name')
      data = (res.data || []).map(t => ({ ...t, template_tasks: [] }))
    }

    setTemplates((data || []).map(t => ({
      ...t,
      template_folders: (t.template_folders || []).sort((a, b) => a.sort_order - b.sort_order),
      template_tasks:   (t.template_tasks   || []).sort((a, b) => a.sort_order - b.sort_order),
    })))
    setLoading(false)
  }

  async function handleDelete(id) {
    if (!confirm('Delete this template? This will not affect jobs already created from it.')) return
    await supabase.from('job_templates').delete().eq('id', id)
    setTemplates(prev => prev.filter(t => t.id !== id))
  }

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-bold text-gray-800">Job Templates</h2>
          <p className="text-xs text-gray-500 mt-0.5">Templates define document folders, photo/video folders, and tasks applied when a new job is created.</p>
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
          <p className="text-xs mt-1">Create a template to define folder structures and tasks for new jobs</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Template</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Auto Trigger</th>
                <th className="px-4 py-2.5 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">📄 Doc</th>
                <th className="px-4 py-2.5 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">📸 Photo</th>
                <th className="px-4 py-2.5 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">✅ Tasks</th>
                <th className="w-20" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {templates.map(t => {
                const docCount   = (t.template_folders || []).filter(f => f.folder_type !== 'photo_video').length
                const photoCount = (t.template_folders || []).filter(f => f.folder_type === 'photo_video').length
                const taskCount  = (t.template_tasks  || []).length
                return (
                  <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-gray-900">{t.name}</p>
                      {(t.project_manager || t.consultant) && (
                        <p className="text-xs text-gray-400 mt-0.5">
                          {[t.project_manager && `PM: ${t.project_manager}`, t.consultant && `Cons: ${t.consultant}`].filter(Boolean).join(' · ')}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {t.auto_trigger
                        ? <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">{AUTO_TRIGGER_LABELS[t.auto_trigger] || t.auto_trigger}</span>
                        : <span className="text-gray-300 text-xs">None</span>}
                    </td>
                    <td className="px-4 py-3 text-center text-xs text-gray-600">{docCount   || <span className="text-gray-300">—</span>}</td>
                    <td className="px-4 py-3 text-center text-xs text-gray-600">{photoCount || <span className="text-gray-300">—</span>}</td>
                    <td className="px-4 py-3 text-center text-xs text-gray-600">{taskCount  || <span className="text-gray-300">—</span>}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 justify-end">
                        <button onClick={() => setModal(t)} className="text-xs text-blue-600 hover:text-blue-800 font-medium">Edit</button>
                        <button onClick={() => handleDelete(t.id)} className="text-xs text-red-400 hover:text-red-600">Delete</button>
                      </div>
                    </td>
                  </tr>
                )
              })}
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

  const existingFolders = template?.template_folders || []
  const [docFolders,   setDocFolders]   = useState(
    existingFolders.filter(f => f.folder_type !== 'photo_video').map(f => ({ ...f, _key: f.id }))
  )
  const [photoFolders, setPhotoFolders] = useState(
    existingFolders.filter(f => f.folder_type === 'photo_video').map(f => ({ ...f, _key: f.id }))
  )
  const [tasks, setTasks] = useState(
    (template?.template_tasks || []).sort((a, b) => a.sort_order - b.sort_order).map(t => ({ ...t, _key: t.id }))
  )

  const [newDocFolder,   setNewDocFolder]   = useState('')
  const [newPhotoFolder, setNewPhotoFolder] = useState('')
  const [newTask,        setNewTask]        = useState('')
  const [saving,         setSaving]         = useState(false)

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))
  const docH   = makeListHelpers(setDocFolders)
  const photoH = makeListHelpers(setPhotoFolders)
  const taskH  = makeListHelpers(setTasks)

  async function handleSave() {
    if (!form.name.trim()) return
    setSaving(true)

    const templateData = {
      name:            form.name.trim(),
      project_manager: form.project_manager.trim() || null,
      consultant:      form.consultant.trim()      || null,
      auto_trigger:    form.auto_trigger           || null,
      notes:           form.notes.trim()           || null,
    }

    let templateId = template?.id

    if (isEdit) {
      const { error } = await supabase
        .from('job_templates')
        .update({ ...templateData, updated_at: new Date().toISOString() })
        .eq('id', templateId)
      if (error) { alert('Error updating template: ' + error.message); setSaving(false); return }
    } else {
      const { data, error } = await supabase
        .from('job_templates')
        .insert({ ...templateData, created_by: userId })
        .select()
        .single()
      if (error || !data?.id) { alert('Error creating template: ' + (error?.message || 'Unknown error')); setSaving(false); return }
      templateId = data.id
    }

    // Sync folders (delete all, re-insert with folder_type)
    await supabase.from('template_folders').delete().eq('template_id', templateId)
    const allFolders = [
      ...docFolders.map((f, i)   => ({ template_id: templateId, folder_name: f.folder_name, folder_type: 'document',   sort_order: i })),
      ...photoFolders.map((f, i) => ({ template_id: templateId, folder_name: f.folder_name, folder_type: 'photo_video', sort_order: i })),
    ]
    if (allFolders.length) {
      const { error: folderErr } = await supabase.from('template_folders').insert(allFolders)
      if (folderErr) console.warn('Folder insert error (run supabase-update-73.sql?):', folderErr.message)
    }

    // Sync tasks — requires supabase-update-73.sql; skip gracefully if table missing
    try {
      await supabase.from('template_tasks').delete().eq('template_id', templateId)
      if (tasks.length) {
        await supabase.from('template_tasks').insert(
          tasks.map((t, i) => ({ template_id: templateId, task_name: t.task_name, sort_order: i }))
        )
      }
    } catch (taskErr) {
      console.warn('template_tasks not available (run supabase-update-73.sql?):', taskErr)
    }

    setSaving(false)
    onSave()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden flex flex-col"
        style={{ maxHeight: '92vh' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-green-700 px-6 py-4 flex-shrink-0">
          <h2 className="text-white font-bold text-lg">{isEdit ? 'Edit Template' : 'New Job Template'}</h2>
        </div>

        {/* Body */}
        <div className="px-6 py-5 overflow-y-auto space-y-5">

          {/* Name */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Template Name <span className="text-red-400">*</span></label>
            <input
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              value={form.name} onChange={e => set('name', e.target.value)}
              placeholder="e.g. Standard Install, Design-Build, Maintenance" autoFocus
            />
          </div>

          {/* PM + Consultant */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Project Manager</label>
              <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                value={form.project_manager} onChange={e => set('project_manager', e.target.value)} placeholder="Name" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Consultant</label>
              <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                value={form.consultant} onChange={e => set('consultant', e.target.value)} placeholder="Name" />
            </div>
          </div>

          {/* Auto Trigger */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Auto Trigger</label>
            <select
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
              value={form.auto_trigger} onChange={e => set('auto_trigger', e.target.value)}
            >
              <option value="">None — apply manually</option>
              <option value="sold_bid">Sold Bid → Job (auto-apply when bid is marked sold)</option>
            </select>
            {form.auto_trigger === 'sold_bid' && (
              <p className="text-xs text-green-700 mt-1">✅ Folders and tasks will be created automatically when a bid is marked Sold.</p>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Notes</label>
            <textarea className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
              rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Optional description…" />
          </div>

          <div className="border-t border-gray-100 pt-1">
            <p className="text-[11px] text-gray-400 mb-4">Items below are created on every job that uses this template.</p>

            {/* Document Folders */}
            <div className="space-y-5">
              <FolderSection
                icon="📄" label="Document Folders"
                folders={docFolders} helpers={docH}
                newName={newDocFolder} setNewName={setNewDocFolder}
              />

              {/* Photo / Video Folders */}
              <FolderSection
                icon="📸" label="Photo / Video Folders"
                folders={photoFolders} helpers={photoH}
                newName={newPhotoFolder} setNewName={setNewPhotoFolder}
              />

              {/* Tasks */}
              <TaskSection
                tasks={tasks} helpers={taskH}
                newName={newTask} setNewName={setNewTask}
              />
            </div>
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
