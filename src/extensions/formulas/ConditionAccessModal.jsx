// src/extensions/formulas/ConditionAccessModal.jsx
//
// Manage which users may view/use a RESTRICTED condition (e.g. the lower
// conditions: Liability, Doubt, Enemy, Treason, Confusion). Mirrors the
// statistic-shares pattern: lists everyone who can log in and toggles a grant
// row in ext_formulas_condition_access for this condition.
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'

export default function ConditionAccessModal({ conditionId, conditionName, onClose }) {
  const [people, setPeople] = useState([])   // [{ id, name, email }]
  const [granted, setGranted] = useState(new Set())
  const [original, setOriginal] = useState(new Set())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState(null)
  const [search, setSearch] = useState('')

  useEffect(() => {
    let cancel = false
    ;(async () => {
      try {
        const [{ data: profs }, { data: emps }, { data: access }] = await Promise.all([
          supabase.from('profiles').select('id, email, full_name').order('full_name'),
          supabase.from('employees').select('first_name, last_name, email, user_id, status').not('user_id', 'is', null),
          supabase.from('ext_formulas_condition_access').select('user_id').eq('condition_id', conditionId),
        ])
        if (cancel) return
        const empByUser = {}
        for (const e of emps || []) {
          if (!e.user_id) continue
          if (!empByUser[e.user_id] || e.status !== 'archived') empByUser[e.user_id] = e
        }
        const list = (profs || []).map(p => {
          const e = empByUser[p.id]
          const name = e ? `${e.first_name || ''} ${e.last_name || ''}`.trim() : (p.full_name || '')
          return { id: p.id, name: name || p.email || 'User', email: p.email || '' }
        })
        const g = new Set((access || []).map(a => a.user_id))
        setPeople(list)
        setGranted(new Set(g))
        setOriginal(new Set(g))
      } catch (e) {
        setErr(e.message || String(e))
      }
      setLoading(false)
    })()
    return () => { cancel = true }
  }, [conditionId])

  const toggle = id => setGranted(prev => {
    const next = new Set(prev)
    next.has(id) ? next.delete(id) : next.add(id)
    return next
  })

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return people
    return people.filter(p => p.name.toLowerCase().includes(q) || p.email.toLowerCase().includes(q))
  }, [people, search])

  async function save() {
    setSaving(true)
    setErr(null)
    try {
      const toAdd = [...granted].filter(id => !original.has(id))
      const toRemove = [...original].filter(id => !granted.has(id))
      if (toAdd.length) {
        const rows = toAdd.map(user_id => ({ condition_id: conditionId, user_id }))
        const { error } = await supabase.from('ext_formulas_condition_access').insert(rows)
        if (error) throw error
      }
      for (const user_id of toRemove) {
        const { error } = await supabase.from('ext_formulas_condition_access').delete().eq('condition_id', conditionId).eq('user_id', user_id)
        if (error) throw error
      }
      setSaving(false)
      onClose?.(true)
    } catch (e) {
      setErr(e.message || String(e))
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40" onClick={() => onClose?.(false)}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-base font-bold text-gray-900">Who can view “{conditionName}”</h2>
          <p className="text-xs text-gray-400 mt-0.5">Only the users you grant can see or use this restricted condition.</p>
        </div>
        <div className="px-5 py-3 border-b border-gray-100">
          <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="Search people…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex-1 overflow-auto px-5 py-2">
          {loading ? (
            <p className="text-sm text-gray-400 py-6">Loading…</p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-gray-400 py-6">No people found.</p>
          ) : (
            filtered.map(p => (
              <label key={p.id} className="flex items-center gap-3 py-2 border-b border-gray-50 cursor-pointer">
                <input type="checkbox" checked={granted.has(p.id)} onChange={() => toggle(p.id)} className="w-4 h-4 rounded accent-green-600" />
                <div className="min-w-0">
                  <div className="text-sm font-medium text-gray-800 truncate">{p.name}</div>
                  {p.email && <div className="text-xs text-gray-400 truncate">{p.email}</div>}
                </div>
              </label>
            ))
          )}
        </div>
        {err && <p className="px-5 text-sm text-red-600">{err}</p>}
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-gray-100">
          <button onClick={() => onClose?.(false)} className="text-sm px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
          <button onClick={save} disabled={saving} className="bg-green-700 text-white font-semibold px-5 py-2 rounded-lg hover:bg-green-800 text-sm disabled:opacity-50">
            {saving ? 'Saving…' : 'Save access'}
          </button>
        </div>
      </div>
    </div>
  )
}
