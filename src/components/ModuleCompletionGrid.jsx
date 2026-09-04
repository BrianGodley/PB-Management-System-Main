import { useState, useMemo, useEffect } from 'react'
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

export default function ModuleCompletionGrid({
  jobId,
  modules,
  completions,
  rows,
  onChange,
  jobStartDate = null,
}) {
  const { user } = useAuth()
  const [weekOf, setWeekOf] = useState(today())
  // A job sold in the future (or a clock skew) would otherwise open on a week
  // before the floor and immediately disable the button the user needs.
  useEffect(() => {
    if (!jobStartDate) return
    const floor = weekDates(String(jobStartDate).slice(0, 10))[0]
    if (weekDates(weekOf)[0] < floor) setWeekOf(floor)
  }, [jobStartDate])
  const [saving, setSaving] = useState(null)
  const [error, setError] = useState('')

  const week = useMemo(() => weekDates(weekOf), [weekOf])

  // A job cannot have progress before it existed, so the week containing the
  // sold date is the floor — there is nothing to report in the weeks before it
  // and letting the navigator run backwards forever only wastes clicks.
  const floorWeek = useMemo(
    () => (jobStartDate ? weekDates(String(jobStartDate).slice(0, 10))[0] : null),
    [jobStartDate]
  )
  const atFloor = floorWeek != null && week[0] <= floorWeek
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

  // The cumulative reading in force on `date` — the latest entry on or before
  // it, which is NOT the same as the cell's own value: a module worked Monday
  // and idle Tuesday still stands at Monday's percentage on Tuesday.
  const cumAt = (moduleId, date) => {
    let best = null
    for (const c of completions || []) {
      if (c.estimate_module_id !== moduleId || c.entry_date > date) continue
      if (!best || c.entry_date > best.entry_date) best = c
    }
    return best ? parseFloat(best.completion_pct) || 0 : 0
  }
  const prevDay = date => {
    const d = new Date(`${date}T00:00:00`)
    d.setDate(d.getDate() - 1)
    return d.toISOString().slice(0, 10)
  }
  // The day's gain for one module, and for the job as a whole. The job figure is
  // weighted by each module's estimated profit, so finishing a big module moves
  // the number more than finishing a small one — the same weighting the profit
  // engine uses, which is why the row lands on 100% exactly when the job does.
  const gain = (moduleId, date) => cumAt(moduleId, date) - cumAt(moduleId, prevDay(date))
  const glpeTotal = (modules || []).reduce((sum, m) => sum + (parseFloat(m.gross_profit) || 0), 0)
  const jobCumAt = date =>
    glpeTotal > 0
      ? (modules || []).reduce(
          (sum, m) => sum + cumAt(m.id, date) * (parseFloat(m.gross_profit) || 0),
          0
        ) / glpeTotal
      : 0

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
    const next = d.toISOString().slice(0, 10)
    // Clamp rather than ignore, so a click at the boundary still lands on the
    // first week instead of appearing to do nothing.
    if (floorWeek && weekDates(next)[0] < floorWeek) return setWeekOf(floorWeek)
    setWeekOf(next)
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
            disabled={atFloor}
            title={atFloor ? 'This is the week the job was sold — there is nothing before it.' : undefined}
            className="text-xs px-2.5 py-1.5 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
          >
            ‹ Prev
          </button>
          <span className="text-xs text-gray-600 tabular-nums whitespace-nowrap">
            {week[0]} – {week[6]}
            {atFloor && (
              <span className="block text-[10px] text-gray-400 text-center">job sold this week</span>
            )}
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
                        {/* The day's gain, so the sequence reads as progress
                            rather than a column of unrelated percentages. */}
                        {cellValue(m.id, d) !== '' && (
                          <span
                            className={`block text-[10px] tabular-nums mt-0.5 ${
                              gain(m.id, d) > 0
                                ? 'text-green-600'
                                : gain(m.id, d) < 0
                                  ? 'text-red-500'
                                  : 'text-gray-300'
                            }`}
                          >
                            {gain(m.id, d) > 0 ? '+' : ''}
                            {Math.round(gain(m.id, d))}%
                          </span>
                        )}
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
            {/* Job total — every module's cumulative reading weighted by its
                estimated profit. Modules run in sequence and sometimes overlap;
                this is the line that shows the job as a whole marching to 100%. */}
            <tr className="bg-gray-50 border-t-2 border-gray-200">
              <td className="py-2 px-4 font-bold text-gray-700">
                Job total
                <span className="block text-[11px] font-normal text-gray-400">
                  weighted by estimated profit
                </span>
              </td>
              {week.map(d => {
                const cum = jobCumAt(d)
                const delta = cum - jobCumAt(prevDay(d))
                return (
                  <td key={d} className="py-2 px-1 text-center">
                    <span className="block text-sm font-bold tabular-nums text-gray-800">
                      {Math.round(cum)}%
                    </span>
                    <span
                      className={`block text-[10px] tabular-nums ${
                        delta > 0 ? 'text-green-600' : 'text-gray-300'
                      }`}
                    >
                      {delta > 0 ? `+${delta.toFixed(1)}%` : '—'}
                    </span>
                  </td>
                )
              })}
              <td className="py-2 px-4 text-right tabular-nums font-bold text-gray-800">
                {Math.round(jobCumAt(week[6]))}%
              </td>
              <td className="py-2 px-4 text-right tabular-nums font-bold text-green-700">
                {fmt(
                  (rows || []).reduce(
                    (sum, r) => sum + r.earnedLaborGp + (r.earnedSubGp || 0),
                    0
                  )
                )}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
