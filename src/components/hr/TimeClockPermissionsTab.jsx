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
  const [weekStart, setWeekStart] = useState(0) // 0=Sunday
  const [settingsId, setSettingsId] = useState(null)
  const [tab, setTab] = useState('weekly') // weekly | multiple | auto-deduct
  const [autoDeduct, setAutoDeduct] = useState({ enabled: false, minutes: 30, perHours: 6 })

  useEffect(() => {
    let alive = true
    ;(async () => {
      const [{ data: permRows }, { data: crews }, { data: cs }] = await Promise.all([
        supabase.from('time_clock_permissions').select('*'),
        supabase.from('crews').select('crew_chief_id'),
        supabase
          .from('company_settings')
          .select('id, payroll_week_start, auto_deduct_enabled, auto_deduct_minutes, auto_deduct_per_hours')
          .maybeSingle(),
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
      if (cs) {
        setSettingsId(cs.id || null)
        if (cs.payroll_week_start != null) setWeekStart(cs.payroll_week_start)
        setAutoDeduct({
          enabled: !!cs.auto_deduct_enabled,
          minutes: cs.auto_deduct_minutes ?? 30,
          perHours: cs.auto_deduct_per_hours ?? 6,
        })
      }
      setLoading(false)
    })()
    return () => {
      alive = false
    }
  }, [])

  const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  async function saveWeekStart(day) {
    setWeekStart(day)
    if (settingsId) {
      await supabase
        .from('company_settings')
        .update({ payroll_week_start: day })
        .eq('id', settingsId)
    } else {
      const { data } = await supabase
        .from('company_settings')
        .insert({ payroll_week_start: day })
        .select('id')
        .single()
      if (data) setSettingsId(data.id)
    }
  }

  async function saveAutoDeduct(next) {
    setAutoDeduct(next)
    const payload = {
      auto_deduct_enabled: next.enabled,
      auto_deduct_minutes: parseFloat(next.minutes) || 0,
      auto_deduct_per_hours: parseFloat(next.perHours) || 0,
    }
    if (settingsId) {
      await supabase.from('company_settings').update(payload).eq('id', settingsId)
    } else {
      const { data } = await supabase.from('company_settings').insert(payload).select('id').single()
      if (data) setSettingsId(data.id)
    }
  }

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
      {/* Sub-tab bar */}
      <div className="flex gap-1 border-b border-gray-200 mb-4 overflow-x-auto">
        {[
          ['weekly', '📅 Weekly Period'],
          ['multiple', '👥 Multiple Clock In'],
          ['auto-deduct', '➖ Auto Deduction'],
        ].map(([k, l]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px whitespace-nowrap transition-colors ${
              tab === k ? 'border-green-700 text-green-700' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {l}
          </button>
        ))}
      </div>

      {/* ── Weekly Period ── */}
      {tab === 'weekly' && (
        <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-3 flex-wrap">
          <div>
            <p className="text-sm font-semibold text-gray-800">Weekly time-clock period</p>
            <p className="text-xs text-gray-400">The week the “Weekly Total” is measured against.</p>
          </div>
          <label className="ml-auto text-sm text-gray-600 flex items-center gap-2">
            Week starts on
            <select
              value={weekStart}
              onChange={e => saveWeekStart(Number(e.target.value))}
              className="input text-sm py-1.5"
            >
              {WEEKDAYS.map((d, i) => (
                <option key={d} value={i}>
                  {d}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}

      {/* ── Auto Deduction ── */}
      {tab === 'auto-deduct' && (
        <div className="max-w-xl">
          <p className="text-sm text-gray-600 mb-1">
            Automatically deduct unpaid break time from each employee’s total clock-in hours.
          </p>
          <p className="text-xs text-gray-400 mb-4">Applied every day to the day’s total.</p>
          <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={autoDeduct.enabled}
                onChange={e => saveAutoDeduct({ ...autoDeduct, enabled: e.target.checked })}
                className="w-4 h-4 accent-green-700"
              />
              <span className="text-sm font-semibold text-gray-800">Enable daily auto-deduction</span>
            </label>
            <div
              className={`flex items-center flex-wrap gap-2 text-sm ${autoDeduct.enabled ? '' : 'opacity-50 pointer-events-none'}`}
            >
              <span className="text-gray-600">Deduct</span>
              <input
                type="number" step="1" min="0"
                value={autoDeduct.minutes}
                onChange={e => setAutoDeduct(a => ({ ...a, minutes: e.target.value }))}
                onBlur={() => saveAutoDeduct(autoDeduct)}
                className="input w-20 text-sm py-1.5"
              />
              <span className="text-gray-600">minutes for every</span>
              <input
                type="number" step="0.5" min="0"
                value={autoDeduct.perHours}
                onChange={e => setAutoDeduct(a => ({ ...a, perHours: e.target.value }))}
                onBlur={() => saveAutoDeduct(autoDeduct)}
                className="input w-20 text-sm py-1.5"
              />
              <span className="text-gray-600">hours worked.</span>
            </div>
            <p className="text-xs text-gray-400">
              Example: 30 minutes for every 6 hours → an 8-hour day nets 7.5 hours; a 12-hour day nets 11 hours.
            </p>
          </div>
        </div>
      )}

      {/* ── Multiple Clock In ── */}
      {tab === 'multiple' && (
      <div>
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
      )}
    </div>
  )
}
