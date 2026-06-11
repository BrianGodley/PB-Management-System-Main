import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../../lib/supabase'

// Manages the shared LMS category list (lms_categories) used by the Video and
// Documents libraries and seeded from the checksheet lists. Admin only.
export default function CategoriesManager() {
  const [cats, setCats] = useState([])
  const [loading, setLoading] = useState(true)
  const [newName, setNewName] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('lms_categories')
      .select('*')
      .order('sort_order')
      .order('name')
    setCats(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const add = async () => {
    const name = newName.trim()
    if (!name) return
    setBusy(true); setErr('')
    const { error } = await supabase.from('lms_categories').insert({ name, sort_order: 100 })
    setBusy(false)
    if (error) { setErr(error.message.includes('duplicate') ? 'That category already exists.' : error.message); return }
    setNewName('')
    load()
  }

  const rename = async cat => {
    const name = prompt('Rename category', cat.name)
    if (!name || !name.trim() || name.trim() === cat.name) return
    const { error } = await supabase.from('lms_categories').update({ name: name.trim() }).eq('id', cat.id)
    if (error) { alert(error.message); return }
    load()
  }

  const del = async cat => {
    if (!confirm(`Delete category "${cat.name}"? Library items already tagged with it keep the text label, but it won't appear in the dropdowns.`)) return
    const { error } = await supabase.from('lms_categories').delete().eq('id', cat.id)
    if (error) { alert(error.message); return }
    load()
  }

  return (
    <div>
      <div className="mb-4">
        <h3 className="font-semibold text-gray-800">Categories</h3>
        <p className="text-xs text-gray-500 mt-0.5">
          Shared categories for the Video Library, Documents Library and checksheets.
        </p>
      </div>

      <div className="flex gap-2 mb-5 max-w-md">
        <input
          value={newName}
          onChange={e => setNewName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && add()}
          placeholder="New category name…"
          className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-green-500"
        />
        <button
          onClick={add}
          disabled={busy || !newName.trim()}
          className="px-4 py-2.5 bg-green-700 text-white text-sm rounded-xl font-medium hover:bg-green-800 disabled:opacity-50"
        >
          + Add
        </button>
      </div>
      {err && <p className="text-xs text-red-600 mb-3">{err}</p>}

      {loading ? (
        <p className="text-sm text-gray-400 py-4">Loading…</p>
      ) : cats.length === 0 ? (
        <p className="text-sm text-gray-400 py-4">No categories yet.</p>
      ) : (
        <ul className="divide-y divide-gray-100 border border-gray-200 rounded-xl overflow-hidden max-w-md">
          {cats.map(c => (
            <li key={c.id} className="flex items-center justify-between px-4 py-2.5 hover:bg-gray-50">
              <span className="text-sm text-gray-800">{c.name}</span>
              <div className="flex gap-3">
                <button onClick={() => rename(c)} className="text-xs text-gray-500 hover:text-gray-800">Rename</button>
                <button onClick={() => del(c)} className="text-xs text-red-500 hover:text-red-700">Delete</button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
