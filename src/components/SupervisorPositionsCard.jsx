// src/components/SupervisorPositionsCard.jsx
//
// Pick which HR positions count as "Job Supervisors" for the Schedule
// Assistant supervisor optimizer. Saved to
//   company_settings.supervisor_position_ids   (jsonb array of position ids)
//
// When the optimizer runs, it pulls every active employee whose job_title
// matches one of the selected positions' titles. If nothing is configured,
// the function falls back to a substring match on "supervisor".

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function SupervisorPositionsCard() {
  const [positions,    setPositions]    = useState([])
  const [selectedIds,  setSelectedIds]  = useState(() => new Set())
  const [employeeCounts, setEmployeeCounts] = useState({}) // position_title (lowercase) → count
  const [loading,      setLoading]      = useState(true)
  const [saving,       setSaving]       = useState(false)
  const [savedMsg,     setSavedMsg]     = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const [posRes, settingsRes, empRes] = await Promise.all([
      supabase.from('positions').select('id, title').order('title'),
      supabase.from('company_settings').select('supervisor_position_ids').maybeSingle(),
      supabase.from('employees').select('job_title').eq('status', 'active'),
    ])
    setPositions(posRes.data || [])
    const ids = Array.isArray(settingsRes.data?.supervisor_position_ids) ? settingsRes.data.supervisor_position_ids : []
    setSelectedIds(new Set(ids.map(Number)))

    // Count active employees in each position title (case-insensitive)
    const counts = {}
    for (const e of empRes.data || []) {
      const t = (e.job_title || '').trim().toLowerCase()
      if (!t) continue
      counts[t] = (counts[t] || 0) + 1
    }
    setEmployeeCounts(counts)
    setLoading(false)
  }

  function toggle(id) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  async function save() {
    setSaving(true); setSavedMsg('')
    const ids = [...selectedIds]
    const { error } = await supabase.from('company_settings')
      .update({ supervisor_position_ids: ids })
      .not('id', 'is', null)
    setSaving(false)
    if (error) { setSavedMsg('Error: ' + error.message); return }
    setSavedMsg('✓ Saved')
    setTimeout(() => setSavedMsg(''), 2000)
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h3 className="font-semibold text-gray-800 mb-1">👥 Job Supervisor Positions</h3>
      <p className="text-sm text-gray-500 mb-4">
        Pick which HR positions count as supervisors for the Schedule Assistant optimizer.
        The optimizer will cluster open jobs across active employees holding any of these positions.
      </p>

      {loading ? (
        <div className="flex justify-center py-6"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-700" /></div>
      ) : (
        <>
          <div className="border border-gray-200 rounded-lg max-h-72 overflow-y-auto mb-4">
            {positions.length === 0 ? (
              <p className="text-xs text-gray-400 italic text-center py-6 px-3">
                No positions defined. Add positions in HR → Positions first.
              </p>
            ) : positions.map(p => {
              const checked = selectedIds.has(p.id)
              const count = employeeCounts[(p.title || '').trim().toLowerCase()] || 0
              return (
                <label key={p.id} className={`flex items-center gap-2 px-3 py-2 text-sm border-b border-gray-100 last:border-b-0 cursor-pointer hover:bg-gray-50 ${!checked ? 'opacity-60' : ''}`}>
                  <input type="checkbox" checked={checked} onChange={() => toggle(p.id)}
                    className="accent-indigo-600 flex-shrink-0" />
                  <span className="flex-1 text-gray-800 font-medium">{p.title}</span>
                  <span className="text-[11px] text-gray-400">
                    {count > 0 ? `${count} active employee${count === 1 ? '' : 's'}` : 'no employees'}
                  </span>
                </label>
              )
            })}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={save}
              disabled={saving}
              className="text-sm px-4 py-2 rounded-lg bg-green-700 text-white font-semibold hover:bg-green-800 disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save selection'}
            </button>
            <span className="text-xs text-gray-500">
              {selectedIds.size === 0
                ? 'No positions selected — optimizer will fall back to anyone with "supervisor" in their title.'
                : `${selectedIds.size} position${selectedIds.size === 1 ? '' : 's'} selected.`}
            </span>
            {savedMsg && <span className={`text-xs font-semibold ${savedMsg.startsWith('Error') ? 'text-red-600' : 'text-green-700'}`}>{savedMsg}</span>}
          </div>
        </>
      )}
    </div>
  )
}
