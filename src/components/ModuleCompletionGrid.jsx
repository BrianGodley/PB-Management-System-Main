import { useState, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { weekDates } from '../lib/jobProfit'

// ─────────────────────────────────────────────────────────────────────────────
// The project manager's daily completion entry.
//
// One row per estimate module, seven columns Sunday to Saturday. The PM types a
// CUMULATIVE percent complete for the modules worked that day; the day's
// production is the difference from the previous reading, so entering 20 after
// 10 means 10% was produced. It normally rises, and may fall when a mistake is
// found — a correction updates that day's reading rather than adding a second.
//
// This is the one human input the whole profit calculation depends on: the
// timeclock says what was spent, only a person can say what was finished.
// ─────────────────────────────────────────────────────────────────────────────
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const today = () => new Date().toISOString().slice(0, 10)
const fmt = v => `$${Math.round(v || 0).toLocaleString()}`

export default function ModuleCompletionGrid({ jobId, modules, completions, rows, onChange }) {
  const { user } = useAuth()
  const [weekOf, setWeekOf] = useState(today())
  const [saving, setSaving] = useState(null)
  const [error, setError] = useState('')

  const week = useMemo(() => weekDates(weekOf), [weekOf])
  const earned = useMemo(() => {
    const m = new Map()
    for (const r of rows || []) m.set(r.id, r)
    return m
  }, [rows])

  // Jump straight to where the readings actually are — a job that ran last
  // month opens on an empty current week otherwise, which reads as "broken".
  const dataWeeks = useMemo(() => {
    const dates = [...new Set((completions || []).map(c => c.entry_date))].sort()
    return { first: dates[0], last: dates[dates.length - 1] }
  }, [completions])

  const cellValue = (moduleId, date) => {
    const row = (completions || []).find(
      c => c.estimate_module_id === moduleId && c.entry_date === date
    )
    return row ? String(row.completion_pct) : ''
  }

  async function save(moduleId, date, raw) {
    const trimmed = String(raw ?? '').trim()
    const key = `${moduleId}|${date}`
    setError('')

    // Clearing a cell removes the reading. 0% and "not assessed that day" are
    // different states, and storing a zero for the second would report the
    // module as having gone backwards.
    if (trimmed === '') {
      const existing = (completions || []).find(
        c => c.estimate_module_id === moduleId && c.entry_date === date
      )
      if (!existing) return
      setSaving(key)
      const { error: delErr } = await supabase
        .from('module_completion')
        .delete()
        .eq('id', existing.id)
      setSaving(null)
      if (delErr) return setError(delErr.message)
      onChange((completions || []).filter(c => c.id !== existing.id))
      return
    }

    const value = parseFloat(trimmed)
    if (!Number.isFinite(value) || value < 0 || value > 100) {
      setError('Completion must be between 0 and 100.')
      return
    }
    setSaving(key)
    const { data, error: upErr } = await supabase
      .from('module_completion')
      .upsert(
        {
          job_id: jobId,
          estimate_module_id: moduleId,
          entry_date: date,
          completion_pct: value,
          created_by: user?.id,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'estimate_module_id,entry_date' }
      )
      .select()
      .single()
    setSaving(null)
    if (upErr) return setError(upErr.message)
    onChange([
      ...(completions || []).filter(
        c => !(c.estimate_module_id === moduleId && c.entry_date === date)
      ),
      data,
    ])
  }

  function shift(days) {
    const d = new Date(`${weekOf}T00:00:00`)
    d.setDate(d.getDate() + days)
    setWeekOf(d.toISOString().slice(0, 10))
  }

  if (!modules?.length) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 px-4 py-6 text-center text-sm text-gray-500">
        This job has no linked estimate modules, so there is nothing to report completion against.
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-gray-100 flex-wrap">
        <div>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">
            Completion by day
          </p>
          <p className="text-xs text-gray-500 mt-0.5">
            Cumulative percent complete per module. Entering 20 after 10 means 10% was produced
            that day.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {dataWeeks.first && (
            <button
              type="button"
              onClick={() => setWeekOf(dataWeeks.first)}
              className="text-xs px-2.5 py-1.5 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50"
            >
              Jump to first entry
            </button>
          )}
          <button
            type="button"
            onClick={() => shift(-7)}
            className="text-xs px-2.5 py-1.5 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50"
          >
            ‹ Prev
          </button>
          <span className="text-xs text-gray-600 tabular-nums whitespace-nowrap">
            {week[0]} – {week[6]}
          </span>
          <button
            type="button"
            onClick={() => shift(7)}
            className="text-xs px-2.5 py-1.5 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50"
          >
            Next ›
          </button>
        </div>
      </div>

      {error && <p className="px-4 py-2 text-xs text-red-600 bg-red-50">{error}</p>}

      <div className="overflow-x-auto thin-scroll">
        <table className="w-full text-sm min-w-[820px]">
          <thead>
            <tr className="text-left text-[10px] text-gray-400 uppercase tracking-wide border-b border-gray-100">
              <th className="py-2 px-4 font-bold">Module</th>
              {week.map((d, i) => (
                <th key={d} className="py-2 px-1 text-center font-bold">
                  {DAY_NAMES[i]}
                  <span className="block text-[9px] text-gray-300 font-normal">{d.slice(5)}</span>
                </th>
              ))}
              <th className="py-2 px-4 text-right font-bold">Complete</th>
              <th className="py-2 px-4 text-right font-bold">GP earned</th>
            </tr>
          </thead>
          <tbody>
            {modules.map(m => {
              const row = earned.get(m.id)
              return (
                <tr key={m.id} className="border-b border-gray-50 last:border-0">
                  <td className="py-2 px-4">
                    <span className="font-medium text-gray-800">
                      {m.module_name || m.module_type}
                    </span>
                    <span className="text-gray-400 text-xs ml-1.5">{m.project_name}</span>
                    <span className="block text-[11px] text-gray-400">
                      {parseFloat(m.man_days || 0)} MD · {fmt(m.gross_profit)} est.
                    </span>
                  </td>
                  {week.map(d => {
                    const key = `${m.id}|${d}`
                    return (
                      <td key={d} className="py-1 px-1 text-center">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          defaultValue={cellValue(m.id, d)}
                          key={`${key}|${cellValue(m.id, d)}`}
                          onBlur={e => save(m.id, d, e.target.value)}
                          disabled={saving === key}
                          placeholder="—"
                          className="w-14 text-center border border-gray-300 rounded px-1 py-1 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50"
                        />
                      </td>
                    )
                  })}
                  <td className="py-2 px-4 text-right tabular-nums text-gray-700">
                    {row ? `${Math.round(row.completionPct * 100)}%` : '—'}
                  </td>
                  <td className="py-2 px-4 text-right tabular-nums font-semibold text-green-700">
                    {row ? fmt(row.earnedLaborGp + (row.earnedSubGp || 0)) : '—'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
