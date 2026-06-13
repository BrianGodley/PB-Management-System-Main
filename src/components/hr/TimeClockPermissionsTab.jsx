// src/components/hr/TimeClockPermissionsTab.jsx
//
// HR > Settings > Time Clock. Per-employee permissions for the multi
// clock-in feature: "Manager" (clock in anyone) and "Crew Chief" (clock in
// their crew + other chiefs). Anyone who is a crew_chief on a master crew is
// auto-on for Crew Chief; admins can override either toggle here.

import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../lib/supabase'

export default function TimeClockPermissionsTab({ employees = [] }) {
  const [perms, setPerms] = useState({}) // employee_id -> { manager, crew_chief }
  const [chiefIds, setChiefIds] = useState(new Set()) // employees who are crew chiefs
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState(null)
  const [query, setQuery] = useState('')

  useEffect(() => {
    let alive = true
    ;(async () => {
      const [{ data: permRows }, { data: crews }] = await Promise.all([
        supabase.from('time_clock_permissions').select('*'),
        supabase.from('crews').select('crew_chief_id'),
      ])
      if (!alive) return
      const p = {}
      for (const r of permRows || []) {
        p[r.employee_id] = {
          manager: !!r.clock_in_multiple_manager,
          crew_chief: !!r.clock_in_multiple_crew_chief,
        }
      }
      setPerms(p)
      setChiefIds(new Set((crews || []).map(c => c.crew_chief_id).filter(Boolean)))
      setLoading(false)
    })()
    return () => {
      alive = false
    }
  }, [])

  const activeEmps = useMemo(
    () =>
      employees
        .filter(e => e.status !== 'archived')
        .sort((a, b) =>
          `${a.last_name} ${a.first_name}`.localeCompare(`${b.last_name} ${b.first_name}`)
        ),
    [employees]
  )
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return activeEmps
    return activeEmps.filter(e =>
      `${e.first_name} ${e.last_name}`.toLowerCase().includes(q)
    )
  }, [activeEmps, query])

  // Effective value: explicit permission row wins; otherwise crew chiefs are on.
  function effective(empId, field) {
    const row = perms[empId]
    if (row && row[field] !== undefined) return row[field]
    if (field === 'crew_chief') return chiefIds.has(empId)
    return false
  }

  async function toggle(empId, field) {
    const current = effective(empId, field)
    const next = {
      manager: effective(empId, 'manager'),
      crew_chief: effective(empId, 'crew_chief'),
      [field]: !current,
    }
    setPerms(p => ({ ...p, [empId]: next }))
    setSavingId(empId)
    await supabase.from('time_clock_permissions').upsert(
      {
        employee_id: empId,
        clock_in_multiple_manager: next.manager,
        clock_in_multiple_crew_chief: next.crew_chief,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'employee_id' }
    )
    setSavingId(null)
  }

  if (loading) {
    return <p className="py-10 text-center text-sm text-gray-400">Loading…</p>
  }

  return (
    <div className="max-w-3xl">
      <p className="text-sm text-gray-600 mb-1">
        Control who can clock in multiple employees at once.
      </p>
      <p className="text-xs text-gray-400 mb-4">
        Crew chiefs (assigned on a master crew) are enabled automatically — you can override
        either setting below.
      </p>

      <input
        type="text"
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="Search employees…"
        className="input text-sm w-full max-w-xs mb-3"
      />

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-4 py-2.5">Employee</th>
              <th className="px-4 py-2.5 text-center">Manager</th>
              <th className="px-4 py-2.5 text-center">Crew Chief</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map(e => {
              const isChief = chiefIds.has(e.id)
              return (
                <tr key={e.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2.5">
                    <span className="font-medium text-gray-800">
                      {e.last_name}, {e.first_name}
                    </span>
                    {isChief && (
                      <span className="ml-2 text-[10px] font-semibold uppercase text-indigo-600">
                        Crew Chief
                      </span>
                    )}
                    {savingId === e.id && (
                      <span className="ml-2 text-[10px] text-gray-400">saving…</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    <input
                      type="checkbox"
                      checked={effective(e.id, 'manager')}
                      onChange={() => toggle(e.id, 'manager')}
                      className="w-4 h-4 accent-green-700 cursor-pointer"
                    />
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    <input
                      type="checkbox"
                      checked={effective(e.id, 'crew_chief')}
                      onChange={() => toggle(e.id, 'crew_chief')}
                      className="w-4 h-4 accent-green-700 cursor-pointer"
                    />
                  </td>
                </tr>
              )
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-gray-400">
                  No employees found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
