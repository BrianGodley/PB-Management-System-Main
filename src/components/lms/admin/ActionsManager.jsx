import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../contexts/AuthContext'

export default function ActionsManager() {
  const { user } = useAuth()
  const [actions, setActions] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ title: '', instructions: '' })
  const [saving, setSaving] = useState(false)

  const load = async () => {
    setLoading(true)
    const { data } = await supabase.from('lms_actions').select('*').order('created_at', { ascending: false })
    setActions(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const openAdd = () => {
    setEditing(null)
    setForm({ title: '', instructions: '' })
    setShowModal(true)
  }

  const openEdit = (action) => {
    setEditing(action)
    setForm({ title: action.title, instructions: action.instructions || '' })
    setShowModal(true)
  }

  const save = async () => {
    if (!form.title.trim()) return
    setSaving(true)
    if (editing) {
      await supabase.from('lms_actions').update({ ...form }).eq('id', editing.id)
    } else {
      await supabase.from('lms_actions').insert({ ...form, created_by_email: user?.email })
    }
    setSaving(false)
    setShowModal(false)
    load()
  }

  const del = async (id) => {
    if (!confirm('Delete this action?')) return
    await supabase.from('lms_actions').delete().eq('id', id)
    load()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-gray-800">Actions</h3>
          <p className="text-xs text-gray-500 mt-0.5">Real-world tasks the employee must perform and confirm completing.</p>
        </div>
        <button onClick={openAdd} className="px-3 py-1.5 bg-green-700 text-white text-sm rounded-lg hover:bg-green-800">
          + Add Action
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-gray-400 py-4">Loading…</p>
      ) : actions.length === 0 ? (
        <div className="text-center py-10 text-gray-400">
          <div className="text-4xl mb-2">⚡</div>
          <p className="text-sm">No actions yet.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left py-2 px-3 text-xs font-medium text-gray-500">Title</th>
                <th className="text-left py-2 px-3 text-xs font-medium text-gray-500">Instructions</th>
                <th className="text-left py-2 px-3 text-xs font-medium text-gray-500">Created By</th>
                <th className="py-2 px-3"></th>
              </tr>
            </thead>
            <tbody>
              {actions.map(action => (
                <tr key={action.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-2 px-3 font-medium text-gray-900">{action.title}</td>
                  <td className="py-2 px-3 text-gray-500 max-w-sm truncate">{action.instructions || '—'}</td>
                  <td className="py-2 px-3 text-gray-400 text-xs">{action.created_by_email || '—'}</td>
                  <td className="py-2 px-3">
                    <div className="flex gap-3">
                      <button onClick={() => openEdit(action)} className="text-xs text-blue-600 hover:underline">Edit</button>
                      <button onClick={() => del(action.id)} className="text-xs text-red-500 hover:underline">Delete</button>
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
            <h3 className="font-bold text-gray-900 text-lg">{editing ? 'Edit Action' : 'New Action'}</h3>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
              <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="e.g. Practice measuring grade with a level"
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-green-500" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Instructions</label>
              <textarea value={form.instructions} onChange={e => setForm(f => ({ ...f, instructions: e.target.value }))} rows={5}
                placeholder="Describe exactly what the employee must do to complete this action…"
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-green-500 resize-none" />
            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={save} disabled={saving || !form.title.trim()}
                className="flex-1 py-2.5 bg-green-700 text-white rounded-xl font-medium hover:bg-green-800 disabled:opacity-50">
                {saving ? 'Saving…' : 'Save'}
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
