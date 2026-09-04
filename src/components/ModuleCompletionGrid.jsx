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
// M/D/YYYY and M/D, split from the ISO string rather than parsed into a Date —
// `new Date('2026-08-30')` is UTC midnight and renders as the 29th west of
// Greenwich, which would silently shift every column heading by a day.
const usDate = iso => {
  const [y, m, d] = String(iso).slice(0, 10).split('-')
  return `${Number(m)}/${Number(d)}/${y}`
}
const usShort = iso => {
  const [, m, d] = String(iso).slice(0, 10).split('-')
  return `${Number(m)}/${Number(d)}`
}
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

  // The other end: nobody can report work that has not happened. The current
  // week is the ceiling, so a reading can never be post-dated into next month.
  const ceilingWeek = useMemo(() => weekDates(today())[0], [])
  const atCeiling = week[0] >= ceilingWeek
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
    // Clamp at both ends rather than ignoring the click, so a jump from further
    // out still lands on the boundary week instead of appearing to do nothing.
    if (floorWeek && weekDates(next)[0] < floorWeek) return setWeekOf(floorWeek)
    if (weekDates(next)[0] > ceilingWeek) return setWeekOf(ceilingWeek)
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
      <div className="relative flex items-center gap-3 px-4 py-2.5 border-b border-gray-100 flex-wrap">
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
          {/* Fixed width: the range is 19–22 characters depending on the month
              and day digits, and letting it size to content shifted the Next
              button sideways every time the week changed. Sized for the widest
              case (12/28/2026 – 1/3/2027) and centred, so the buttons hold
              still and the dates sit apart inside the gap. */}
          {/* Clicking the range opens the browser's own date picker, so jumping
              back a few months does not mean clicking Prev twenty times. A
              transparent date input sits over the text: the picker is native
              (month and year dropdowns, keyboard support, correct locale) and
              the text underneath stays exactly as designed.
              min/max pin it to the same window the arrows obey, and onChange
              clamps as well — a browser that ignores min/max would otherwise
              land the grid outside its own bounds. */}
          <span className="relative w-48 shrink-0 text-center text-xs text-gray-600 tabular-nums whitespace-nowrap rounded hover:bg-gray-50 hover:text-gray-900 transition-colors">
            {usDate(week[0])} – {usDate(week[6])}
            <input
              type="date"
              aria-label="Jump to a week"
              title="Pick any date to jump to that week"
              value={weekOf}
              min={floorWeek || undefined}
              max={today()}
              // Chrome only opens the picker when the click lands on the
              // calendar indicator, and ours is invisible — so the click has to
              // ask for it. showPicker() throws if the browser lacks it or the
              // call is not user-activated; either way the input still works
              // through the keyboard, so failing quietly is correct.
              onClick={e => {
                try {
                  e.currentTarget.showPicker()
                } catch {
                  /* older browser — the field is still focusable and typable */
                }
              }}
              onChange={e => {
                const picked = e.target.value
                if (!picked) return
                if (floorWeek && weekDates(picked)[0] < floorWeek) return setWeekOf(floorWeek)
                if (weekDates(picked)[0] > ceilingWeek) return setWeekOf(ceilingWeek)
                setWeekOf(picked)
              }}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
          </span>
          <button
            type="button"
            onClick={() => shift(7)}
            disabled={atCeiling}
            title={atCeiling ? 'This is the current week — work cannot be reported before it happens.' : undefined}
            className="text-xs px-2.5 py-1.5 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
          >
            Next ›
          </button>
        </div>
        {/* Absolutely centred on the ROW, not on the space left over beside the
            controls — flex-1 text-center pushed it right of the day columns by
            however wide the buttons happened to be. */}
        <p className="absolute left-1/2 -translate-x-1/2 text-base font-semibold text-gray-700 pointer-events-none">
          {atCeiling ? 'Current Week' : atFloor ? 'Job Sold This Week' : 'Previous Week'}
        </p>
      </div>

      {error && <p className="px-4 py-2 text-xs text-red-600 bg-red-50">{error}</p>}

      <div className="overflow-x-auto thin-scroll">
        <table className="w-full text-sm min-w-[820px]">
          <thead>
            <tr className="text-left text-[10px] text-black uppercase tracking-wide border-b border-gray-100">
              <th className="py-2 px-4 font-bold">Module</th>
              {week.map((d, i) => (
                <th key={d} className="py-2 px-1 text-center font-bold text-[20px] leading-tight">
                  {DAY_NAMES[i]}
                  <span className="block text-[18px] text-black font-normal leading-tight">
                    {usShort(d)}
                  </span>
                </th>
              ))}
              <th className="py-2 px-4 text-center font-bold">Total GP Earned</th>
              <th className="py-2 px-4 text-center font-bold">Complete</th>
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
                    // Even inside the current week, Thursday cannot be reported
                    // on Tuesday. Existing readings still render, so nothing is
                    // hidden — the cell just stops accepting new ones.
                    const isFuture = d > today()
                    return (
                      <td key={d} className="py-1 px-1 text-center">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          defaultValue={cellValue(m.id, d)}
                          key={`${key}|${cellValue(m.id, d)}`}
                          onBlur={e => save(m.id, d, e.target.value)}
                          disabled={saving === key || isFuture}
                          title={isFuture ? 'This day has not happened yet.' : undefined}
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
                  <td className="py-2 px-4 text-center tabular-nums font-semibold text-green-700">
                    {row ? fmt(row.earnedLaborGp + (row.earnedSubGp || 0)) : '—'}
                  </td>
                  <td className="py-2 px-4 text-center">
                    <span
                      className={`text-sm font-bold ${
                        row && row.completionPct >= 1 ? 'text-green-700' : 'text-gray-400'
                      }`}
                    >
                      {row && row.completionPct >= 1 ? 'Yes' : 'No'}
                    </span>
                  </td>
                </tr>
              )
            })}
            {/* Job total — every module's cumulative reading weighted by its
                estimated profit. Modules run in sequence and sometimes overlap;
                this is the line that shows the job as a whole marching to 100%. */}
            <tr className="bg-gray-50 border-t-2 border-gray-200">
              <td className="py-2 px-4 font-bold text-gray-700">
                Total Job Gross Profit Earned
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
              <td className="py-2 px-4 text-center tabular-nums font-bold text-green-700">
                {fmt(
                  (rows || []).reduce(
                    (sum, r) => sum + r.earnedLaborGp + (r.earnedSubGp || 0),
                    0
                  )
                )}
              </td>
              <td className="py-2 px-4 text-center">
                <span
                  className={`text-sm font-bold ${
                    jobCumAt(week[6]) >= 99.995 ? 'text-green-700' : 'text-gray-400'
                  }`}
                >
                  {jobCumAt(week[6]) >= 99.995 ? 'Yes' : 'No'}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
