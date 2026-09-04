// ─────────────────────────────────────────────────────────────────────────────
// Job Tracker — gross profit produced, and the PM's daily completion entry.
//
// This page previously read the legacy projects → modules → actual_entries
// tables, which hold zero modules and zero entries in production; it rendered an
// empty shell. It now reads the real estimate model through jobs.estimate_id and
// is the surface where a project manager enters percent complete per module per
// day — the one human input the whole profit calculation depends on.
//
// All arithmetic lives in lib/jobProfit.js so the cross-job PM grid can reuse it.
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import JobTabs from '../components/JobTabs'
import { useAuth } from '../contexts/AuthContext'
import {
  resolveRates,
  jobProfitAsOf,
  dailySeries,
  attributeHoursByModule,
  weekDates,
} from '../lib/jobProfit'

const fmt = v => `$${Math.round(v || 0).toLocaleString()}`
const fmt2 = v =>
  `$${(v || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const pct = v => `${Math.round((v || 0) * 100)}%`
const today = () => new Date().toISOString().slice(0, 10)
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export default function JobTracker() {
  const { id } = useParams()
  const { user } = useAuth()
  const [job, setJob] = useState(null)
  const [settings, setSettings] = useState(null)
  const [modules, setModules] = useState([])
  const [completions, setCompletions] = useState([])
  const [timeEntries, setTimeEntries] = useState([])
  const [crews, setCrews] = useState([])
  const [scheduleItems, setScheduleItems] = useState([])
  const [workOrders, setWorkOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [weekOf, setWeekOf] = useState(today())
  const [saving, setSaving] = useState(null) // `${moduleId}|${date}` while in flight
  const [error, setError] = useState('')

  useEffect(() => {
    if (!id) {
      setLoading(false)
      return
    }
    fetchData()
  }, [id])

  async function fetchData() {
    setLoading(true)
    const [settingsRes, jobRes] = await Promise.all([
      supabase.from('company_settings').select('*').single(),
      supabase.from('jobs').select('*').eq('id', id).single(),
    ])
    setSettings(settingsRes.data || null)
    if (!jobRes.data) {
      setLoading(false)
      return
    }
    setJob(jobRes.data)

    // The estimate is the baseline every figure measures against, so a job with
    // no estimate has nothing to track rather than a zeroed-out tracker.
    const modsPromise = jobRes.data.estimate_id
      ? supabase
          .from('estimate_projects')
          .select('id, project_name, estimate_modules ( * )')
          .eq('estimate_id', jobRes.data.estimate_id)
      : Promise.resolve({ data: [] })

    const [projRes, compRes, timeRes, crewRes, schedRes, woRes] = await Promise.all([
      modsPromise,
      supabase.from('module_completion').select('*').eq('job_id', id),
      supabase.from('time_entries').select('*').eq('job_id', id),
      supabase.from('crews').select('*'),
      supabase.from('schedule_items').select('*').eq('job_id', id),
      supabase.from('work_orders').select('id, estimate_module_id').eq('job_id', id),
    ])

    const flat = []
    for (const p of projRes.data || []) {
      for (const m of p.estimate_modules || []) flat.push({ ...m, project_name: p.project_name })
    }
    setModules(flat)
    setCompletions(compRes.data || [])
    setTimeEntries(timeRes.data || [])
    setCrews(crewRes.data || [])
    setScheduleItems(schedRes.data || [])
    setWorkOrders(woRes.data || [])
    setLoading(false)
  }

  const rates = useMemo(() => resolveRates(settings), [settings])

  const attribution = useMemo(
    () => attributeHoursByModule({ timeEntries, scheduleItems, workOrders, crews }),
    [timeEntries, scheduleItems, workOrders, crews]
  )

  const snap = useMemo(
    () =>
      rates ? jobProfitAsOf({ modules, completions, timeEntries, rates, attribution }) : null,
    [modules, completions, timeEntries, rates, attribution]
  )

  const week = useMemo(() => weekDates(weekOf), [weekOf])

  // Produced-per-day across the displayed week. Each day is the difference
  // between two running totals, so a restated percentage recomputes the series
  // rather than contradicting it.
  const series = useMemo(
    () => (rates ? dailySeries({ modules, completions, timeEntries, rates, dates: week }) : []),
    [modules, completions, timeEntries, rates, week]
  )

  // Latest reading per module per date, for pre-filling the grid.
  const cellValue = (moduleId, date) => {
    const row = completions.find(c => c.estimate_module_id === moduleId && c.entry_date === date)
    return row ? String(row.completion_pct) : ''
  }

  async function saveCompletion(moduleId, date, raw) {
    const trimmed = String(raw ?? '').trim()
    const key = `${moduleId}|${date}`
    setError('')

    // Clearing a cell removes the reading rather than storing a zero — 0% and
    // "not assessed that day" are different states.
    if (trimmed === '') {
      const existing = completions.find(
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
      setCompletions(prev => prev.filter(c => c.id !== existing.id))
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
          job_id: id,
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
    setCompletions(prev => [
      ...prev.filter(c => !(c.estimate_module_id === moduleId && c.entry_date === date)),
      data,
    ])
  }

  function shiftWeek(days) {
    const d = new Date(`${weekOf}T00:00:00`)
    d.setDate(d.getDate() + days)
    setWeekOf(d.toISOString().slice(0, 10))
  }

  if (loading)
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-700"></div>
      </div>
    )
  if (!job) return <div className="card text-center py-12 text-gray-500">Job not found.</div>

  const glpmde = snap && snap.glpeTotal > 0 && totalEmd(modules) > 0
    ? snap.glpeTotal / totalEmd(modules)
    : null

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center gap-2 mb-4 text-sm">
        <Link to="/" className="text-gray-400 hover:text-gray-600">
          Jobs
        </Link>
        <span className="text-gray-300">/</span>
        <Link to={`/jobs/${id}`} className="text-gray-400 hover:text-gray-600 truncate max-w-[160px]">
          {job.client_name}
        </Link>
        <span className="text-gray-300">/</span>
        <span className="text-gray-700 font-medium">Tracker</span>
      </div>

      <h1 className="text-2xl font-bold text-gray-900 mb-1">Job Tracker</h1>
      <p className="text-gray-500 text-sm mb-4">
        {job.client_name}
        {job.job_address ? ` — ${job.job_address}` : ''}
      </p>

      {/* Same strip as the job page, so Tracker reads as a peer of Projects and
          Change Orders rather than a detour with only a breadcrumb back. */}
      <JobTabs jobId={id} active="tracker" />

      {/* No-fallback rule: an unset rate stops the calculation and says so,
          rather than resolving to a constant and reporting invented profit. */}
      {!rates && (
        <div className="card mb-5 border-amber-300 bg-amber-50">
          <p className="font-semibold text-amber-900 mb-1">Labour rates are not set</p>
          <p className="text-sm text-amber-800">
            Gross profit cannot be calculated until{' '}
            <strong>Average Hourly Crew Rate</strong> and <strong>Overtime Multiplier</strong> are
            set in Company Settings. No default is assumed — a guessed rate would report profit
            this job cannot support.
          </p>
        </div>
      )}

      {!job.estimate_id && (
        <div className="card mb-5 border-amber-300 bg-amber-50">
          <p className="text-sm text-amber-800">
            This job has no linked estimate, so there is no baseline to measure against.
          </p>
        </div>
      )}

      {error && (
        <div className="card mb-4 border-red-300 bg-red-50">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {snap && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-5">
            <Stat label="Gross Profit Produced" value={fmt(snap.totalGpProduced)} tone="green" big />
            <Stat label="Labour GP (GLPA)" value={fmt(snap.glpa)} sub={`of ${fmt(snap.glpeTotal)} est.`} />
            <Stat label="Sub GP" value={fmt(snap.subEarned)} sub={`of ${fmt(snap.subTotal)} est.`} />
            <Stat
              label="GLPMDA"
              value={snap.glpmda == null ? '—' : fmt2(snap.glpmda)}
              sub={glpmde ? `vs ${fmt(glpmde)} est.` : null}
              tone={snap.glpmda != null && glpmde && snap.glpmda < glpmde ? 'red' : 'green'}
            />
            <Stat label="Complete" value={pct(snap.jobCompletion)} sub={`${snap.actualManDays.toFixed(2)} MD used`} />
          </div>

          <div className="card mb-5">
            <p className="font-semibold text-gray-800 mb-2">Labour cost against budget</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <Line label="Hours (std / OT)" value={`${snap.hours.standard.toFixed(1)} / ${snap.hours.overtime.toFixed(1)}`} />
              <Line label="Running labour cost" value={fmt(snap.rlc)} />
              <Line label="Budget at this completion" value={fmt(snap.elcToDate)} />
              <Line
                label="Variance"
                value={`${snap.costVariance > 0 ? '+' : ''}${fmt(snap.costVariance)}`}
                tone={snap.costVariance > 0 ? 'red' : 'green'}
              />
            </div>
            {snap.laborDataMissing && (
              <p className="text-xs text-amber-700 mt-3">
                <strong>No hours clocked against this job.</strong> Completion has been entered, so
                earned profit is shown — but the cost side is unknown, and no favourable variance
                is being booked for the unspent budget.
              </p>
            )}
            {!snap.laborDataMissing && snap.laborCoverage > 0 && snap.laborCoverage < 0.6 && (
              <p className="text-xs text-amber-700 mt-3">
                Only {Math.round(snap.laborCoverage * 100)}% of the labour this completion implies
                has been clocked. The variance below reads favourable mostly because hours are
                missing, not because the job is running cheap.
              </p>
            )}
            {attribution.coverage.ratio < 1 && (
              <p className="text-xs text-gray-500 mt-3">
                {Math.round(attribution.coverage.ratio * 100)}% of hours resolve to a specific
                module through the work order. The rest are counted at job level only — module
                columns show earned profit without a cost variance.
              </p>
            )}
          </div>
        </>
      )}

      {/* ── Weekly completion entry ─────────────────────────────────────────── */}
      <div className="card mb-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="font-semibold text-gray-800">Completion by day</p>
            <p className="text-xs text-gray-500">
              Cumulative percent complete per module. Entering 20% after 10% means 10% was produced
              that day.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" className="btn-secondary text-sm px-3 py-1" onClick={() => shiftWeek(-7)}>
              ‹ Prev
            </button>
            <span className="text-sm text-gray-600 tabular-nums">{week[0]} – {week[6]}</span>
            <button type="button" className="btn-secondary text-sm px-3 py-1" onClick={() => shiftWeek(7)}>
              Next ›
            </button>
          </div>
        </div>

        {modules.length === 0 ? (
          <p className="text-sm text-gray-500 py-4 text-center">
            No estimate modules on this job.
          </p>
        ) : (
          <div className="overflow-x-auto thin-scroll">
            <table className="w-full text-sm min-w-[720px]">
              <thead>
                <tr className="text-left text-xs text-gray-500 border-b border-gray-200">
                  <th className="py-2 pr-3 font-medium">Module</th>
                  {week.map((d, i) => (
                    <th key={d} className="py-2 px-1 text-center font-medium">
                      {DAY_NAMES[i]}
                      <span className="block text-[10px] text-gray-400">{d.slice(5)}</span>
                    </th>
                  ))}
                  <th className="py-2 pl-3 text-right font-medium">Earned</th>
                </tr>
              </thead>
              <tbody>
                {(snap?.rows || modules.map(m => ({ id: m.id, name: m.module_name || m.module_type }))).map(row => (
                  <tr key={row.id} className="border-b border-gray-100 last:border-0">
                    <td className="py-2 pr-3">
                      <span className="font-medium text-gray-800">{row.name}</span>
                      {row.emd != null && (
                        <span className="block text-[11px] text-gray-400">
                          {row.emd} MD · {fmt(row.glpe)} est.
                        </span>
                      )}
                    </td>
                    {week.map(d => {
                      const key = `${row.id}|${d}`
                      return (
                        <td key={d} className="py-1 px-1 text-center">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            defaultValue={cellValue(row.id, d)}
                            onBlur={e => saveCompletion(row.id, d, e.target.value)}
                            disabled={saving === key}
                            className="w-14 text-center border border-gray-300 rounded px-1 py-1 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50"
                            placeholder="—"
                          />
                        </td>
                      )
                    })}
                    <td className="py-2 pl-3 text-right tabular-nums font-semibold text-green-700">
                      {row.earnedLaborGp != null ? fmt(row.earnedLaborGp + (row.earnedSubGp || 0)) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Produced per day ────────────────────────────────────────────────── */}
      {series.length > 0 && (
        <div className="card">
          <p className="font-semibold text-gray-800 mb-1">Gross profit produced this week</p>
          <p className="text-xs text-gray-500 mb-3">
            Each day is the change in the running total. A negative day means hours were burned
            without completion moving — cost with no earned profit.
          </p>
          <div className="overflow-x-auto thin-scroll">
            <table className="w-full text-sm min-w-[560px]">
              <thead>
                <tr className="text-left text-xs text-gray-500 border-b border-gray-200">
                  <th className="py-2 pr-3 font-medium">Day</th>
                  <th className="py-2 px-3 text-right font-medium">Labour</th>
                  <th className="py-2 px-3 text-right font-medium">Sub</th>
                  <th className="py-2 px-3 text-right font-medium">Produced</th>
                  <th className="py-2 pl-3 text-right font-medium">Running total</th>
                </tr>
              </thead>
              <tbody>
                {series.map((d, i) => (
                  <tr key={d.date} className="border-b border-gray-100 last:border-0">
                    <td className="py-2 pr-3 text-gray-700">
                      {DAY_NAMES[i]} <span className="text-gray-400 text-xs">{d.date.slice(5)}</span>
                    </td>
                    <td className="py-2 px-3 text-right tabular-nums">{fmt(d.laborProducedToday)}</td>
                    <td className="py-2 px-3 text-right tabular-nums">{fmt(d.subProducedToday)}</td>
                    <td
                      className={`py-2 px-3 text-right tabular-nums font-semibold ${
                        d.producedToday < 0 ? 'text-red-600' : 'text-green-700'
                      }`}
                    >
                      {fmt(d.producedToday)}
                    </td>
                    <td className="py-2 pl-3 text-right tabular-nums text-gray-600">{fmt(d.totalGp)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

function totalEmd(modules) {
  return (modules || []).reduce((s, m) => s + (parseFloat(m.man_days) || 0), 0)
}

function Stat({ label, value, sub, tone, big }) {
  const color =
    tone === 'green' ? 'text-green-700' : tone === 'red' ? 'text-red-600' : 'text-gray-900'
  return (
    <div className="card">
      <p className="text-[11px] uppercase tracking-wide text-gray-500 mb-1">{label}</p>
      <p className={`font-bold tabular-nums ${big ? 'text-xl' : 'text-lg'} ${color}`}>{value}</p>
      {sub && <p className="text-[11px] text-gray-400 mt-0.5">{sub}</p>}
    </div>
  )
}

function Line({ label, value, tone }) {
  const color = tone === 'green' ? 'text-green-700' : tone === 'red' ? 'text-red-600' : 'text-gray-800'
  return (
    <div>
      <p className="text-[11px] text-gray-500">{label}</p>
      <p className={`font-semibold tabular-nums ${color}`}>{value}</p>
    </div>
  )
}
