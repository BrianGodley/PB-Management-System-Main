// ─────────────────────────────────────────────────────────────────────────────
// Crew report — one crew's work across every job, over a chosen date range.
//
// Everything here is scoped to the crew, not the job: a job's estimate row shows
// only the modules THAT crew was assigned, and its actuals only the hours that
// crew clocked. A job worked by three crews appears three times across three
// reports, each carrying its own slice.
//
// Figures come from lib/jobProfit, the same engine behind the Tracking tab, so a
// crew's numbers here and a job's numbers there are two views of one
// calculation rather than two calculations that happen to agree.
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { resolveRates, splitHours, completionAsOf } from '../../lib/jobProfit'

const HOURS_PER_MAN_DAY = 8
const money = v =>
  Number.isFinite(v)
    ? v.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
    : '—'
const money2 = v => (Number.isFinite(v) ? `$${v.toFixed(2)}` : '—')
const num = (v, d = 1) => (Number.isFinite(v) ? v.toFixed(d) : '—')
const nv = v => {
  const n = parseFloat(v)
  return Number.isFinite(n) ? n : 0
}
const iso = d => d.toISOString().slice(0, 10)
const usDate = s => {
  const [y, m, d] = String(s).slice(0, 10).split('-')
  return `${Number(m)}/${Number(d)}/${y}`
}

// Preset windows, in days back from today.
const RANGES = [
  { key: '1w', label: '1 week', days: 7 },
  { key: '3w', label: '3 weeks', days: 21 },
  { key: '1m', label: '1 month', days: 30 },
  { key: '3m', label: '3 months', days: 91 },
  { key: '6m', label: '6 months', days: 182 },
  { key: '12m', label: '12 months', days: 365 },
]

async function fetchAllIn(table, column, ids, select) {
  const out = []
  for (let i = 0; i < ids.length; i += 150) {
    const slice = ids.slice(i, i + 150)
    for (let from = 0; ; from += 1000) {
      const { data } = await supabase
        .from(table)
        .select(select)
        .in(column, slice)
        .range(from, from + 999)
      if (!data?.length) break
      out.push(...data)
      if (data.length < 1000) break
    }
  }
  return out
}

export default function CrewReport() {
  const [crews, setCrews] = useState([])
  const [crewId, setCrewId] = useState('')
  const [settings, setSettings] = useState(null)
  const [rangeKey, setRangeKey] = useState('3m')
  const [customOpen, setCustomOpen] = useState(false)
  const [includeCurrent, setIncludeCurrent] = useState(true)
  const [from, setFrom] = useState(iso(new Date(Date.now() - 91 * 864e5)))
  const [to, setTo] = useState(iso(new Date()))
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    ;(async () => {
      const [crewRes, setRes] = await Promise.all([
        supabase.from('crews').select('*').order('label'),
        supabase.from('company_settings').select('*').maybeSingle(),
      ])
      setCrews(crewRes.data || [])
      setSettings(setRes.data || null)
      if (crewRes.data?.length) setCrewId(crewRes.data[0].id)
    })()
  }, [])

  function applyPreset(r) {
    setRangeKey(r.key)
    setFrom(iso(new Date(Date.now() - r.days * 864e5)))
    setTo(iso(new Date()))
    setCustomOpen(false)
  }

  const rates = useMemo(() => resolveRates(settings), [settings])
  const crew = useMemo(() => crews.find(c => c.id === crewId), [crews, crewId])
  const members = useMemo(
    () =>
      crew
        ? [
            crew.crew_chief_id,
            crew.journeyman_id,
            crew.laborer_1_id,
            crew.laborer_2_id,
            crew.laborer_3_id,
          ].filter(Boolean)
        : [],
    [crew]
  )

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!crew || !members.length) {
        setData(null)
        return
      }
      setLoading(true)

      // Start from the CREW's own shifts in the window. That is the only set
      // that defines "jobs this crew worked" — a work order assigned but never
      // clocked into is not work done.
      const entries = (await fetchAllIn('time_entries', 'employee_id', members, '*')).filter(
        e => e.date >= from && e.date <= to && e.job_id
      )
      if (cancelled) return

      const jobIds = [...new Set(entries.map(e => e.job_id))]
      if (!jobIds.length) {
        setData({ jobs: [], entries: [] })
        setLoading(false)
        return
      }

      const [jobs, workOrders, comps] = await Promise.all([
        fetchAllIn('jobs', 'id', jobIds, 'id, name, client_name, estimate_id'),
        fetchAllIn('work_orders', 'job_id', jobIds, '*'),
        fetchAllIn('module_completion', 'job_id', jobIds, '*'),
      ])
      if (cancelled) return

      const estimateIds = [...new Set(jobs.map(j => j.estimate_id).filter(Boolean))]
      const projects = estimateIds.length
        ? await fetchAllIn(
            'estimate_projects',
            'estimate_id',
            estimateIds,
            'estimate_id, estimate_modules ( * )'
          )
        : []
      if (cancelled) return

      const modulesByEstimate = new Map()
      for (const p of projects) {
        const list = modulesByEstimate.get(p.estimate_id) || []
        list.push(...(p.estimate_modules || []))
        modulesByEstimate.set(p.estimate_id, list)
      }

      const rows = jobs
        .map(j => {
          // The modules THIS crew was assigned on this job.
          const mine = workOrders.filter(w => w.job_id === j.id && w.scheduled_crew_id === crew.id)
          const mineIds = new Set(mine.map(w => w.estimate_module_id))
          const modules = (modulesByEstimate.get(j.estimate_id) || []).filter(m =>
            mineIds.has(m.id)
          )
          const jobEntries = entries.filter(e => e.job_id === j.id)
          const hours = splitHours(jobEntries)
          const cp = completionAsOf(comps.filter(c => c.job_id === j.id))

          const estMD = modules.reduce((s, m) => s + nv(m.man_days), 0)
          const estLabor = modules.reduce((s, m) => s + nv(m.labor_cost), 0)
          const estGP = modules.reduce((s, m) => s + nv(m.gross_profit), 0)
          const earned = modules.reduce((s, m) => s + (cp.get(m.id) || 0) * nv(m.gross_profit), 0)
          const elcToDate = modules.reduce(
            (s, m) =>
              s + (cp.get(m.id) || 0) * nv(m.man_days) * HOURS_PER_MAN_DAY * rates.hourlyRate,
            0
          )
          const actLabor =
            hours.standard * rates.hourlyRate +
            hours.overtime * rates.hourlyRate * rates.otMultiplier
          // Same shape as the engine: earned work, less what it cost extra.
          const actGP = earned - (actLabor - elcToDate)

          // A job is "current" until every module the crew owns reads 100%.
          // That distinction is what makes the summary comparable: an
          // unfinished job's actuals cover part of the work while its estimate
          // covers all of it, so the two columns are measuring different
          // amounts and the difference between them means nothing.
          const complete = modules.length > 0 && modules.every(m => (cp.get(m.id) || 0) >= 0.9995)
          const completion =
            estMD > 0
              ? modules.reduce((s, m) => s + (cp.get(m.id) || 0) * nv(m.man_days), 0) / estMD
              : 0

          return {
            id: j.id,
            name: j.name || j.client_name || '—',
            moduleNames: modules.map(m => m.module_name || m.module_type),
            estMD,
            actMD: hours.total / HOURS_PER_MAN_DAY,
            standard: hours.standard,
            overtime: hours.overtime,
            estLabor,
            actLabor,
            estGP,
            actGP,
            complete,
            completion,
          }
        })
        .filter(r => r.actMD > 0 || r.estMD > 0)
        .sort((a, b) => a.name.localeCompare(b.name))

      setData({ jobs: rows })
      setLoading(false)
    }
    if (rates) load()
    return () => {
      cancelled = true
    }
  }, [crew, members, from, to, rates])

  // Dropping the current jobs leaves only module sets that ran to 100%, where
  // estimated and actual cover the same work and the variance is real.
  const rows = useMemo(() => {
    const all = data?.jobs || []
    return includeCurrent ? all : all.filter(r => r.complete)
  }, [data, includeCurrent])
  const currentCount = useMemo(() => (data?.jobs || []).filter(r => !r.complete).length, [data])

  const totals = useMemo(() => {
    const t = rows.reduce(
      (a, r) => ({
        estMD: a.estMD + r.estMD,
        actMD: a.actMD + r.actMD,
        standard: a.standard + r.standard,
        overtime: a.overtime + r.overtime,
        estLabor: a.estLabor + r.estLabor,
        actLabor: a.actLabor + r.actLabor,
        estGP: a.estGP + r.estGP,
        actGP: a.actGP + r.actGP,
      }),
      { estMD: 0, actMD: 0, standard: 0, overtime: 0, estLabor: 0, actLabor: 0, estGP: 0, actGP: 0 }
    )
    return {
      ...t,
      estHours: t.estMD * HOURS_PER_MAN_DAY,
      actHours: t.standard + t.overtime,
      estGlpmd: t.estMD > 0 ? t.estGP / t.estMD : null,
      actGlpmd: t.actMD > 0 ? t.actGP / t.actMD : null,
    }
  }, [rows])

  if (!rates) {
    return (
      <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        Labour rates are not set, so crew costs cannot be calculated. Set the crew rate and overtime
        multiplier in HR → Labor Rates.
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* ── Crew picker and range ─────────────────────────────────────────── */}
      <div className="flex items-center gap-3 flex-wrap mb-4 flex-shrink-0">
        <select
          value={crewId}
          onChange={e => setCrewId(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-green-500"
        >
          {crews.map(c => (
            <option key={c.id} value={c.id}>
              Crew {c.label}
            </option>
          ))}
        </select>

        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {RANGES.map(r => (
            <button
              key={r.key}
              onClick={() => applyPreset(r)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                rangeKey === r.key
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>

        {/* The range itself is the button — clicking it opens the two dates. */}
        <button
          onClick={() => setCustomOpen(o => !o)}
          className={`px-3 py-2 rounded-lg border text-sm tabular-nums ${
            rangeKey === 'custom'
              ? 'border-green-600 bg-green-50 text-green-800 font-semibold'
              : 'border-gray-300 text-gray-600 hover:bg-gray-50'
          }`}
        >
          {usDate(from)} – {usDate(to)} <span className="text-gray-400 ml-1">▾</span>
        </button>

        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setIncludeCurrent(true)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              includeCurrent
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            All jobs
          </button>
          <button
            onClick={() => setIncludeCurrent(false)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              !includeCurrent
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Completed only
            {currentCount > 0 && (
              <span className="ml-1.5 text-xs text-gray-400">−{currentCount}</span>
            )}
          </button>
        </div>
      </div>

      {customOpen && (
        <div className="mb-4 flex items-end gap-3 flex-wrap rounded-xl border border-gray-200 bg-white px-4 py-3 flex-shrink-0">
          <div>
            <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">From</label>
            <input
              type="date"
              value={from}
              max={to}
              onChange={e => {
                setFrom(e.target.value)
                setRangeKey('custom')
              }}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">To</label>
            <input
              type="date"
              value={to}
              min={from}
              max={iso(new Date())}
              onChange={e => {
                setTo(e.target.value)
                setRangeKey('custom')
              }}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <button
            onClick={() => setCustomOpen(false)}
            className="px-3 py-2 rounded-lg bg-green-700 text-white text-sm font-medium hover:bg-green-800"
          >
            Done
          </button>
        </div>
      )}

      {/* ── Summary ──────────────────────────────────────────────────────── */}
      {/* One card per pair, so a figure and the thing it is measured against sit
          together. Man days are not shown: at eight hours to the day they are
          the hours column restated, and two ways of saying one thing is what
          makes a summary hard to read. */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3 mb-4 flex-shrink-0">
        <PairCard
          leftLabel="Estimated Hours"
          left={num(totals.estHours, 0)}
          rightLabel="Actual Hours"
          right={num(totals.actHours, 0)}
          compare={[totals.actHours, totals.estHours, true]}
        />
        <PairCard
          leftLabel="Standard Hours"
          left={num(totals.standard, 0)}
          rightLabel="Overtime Hours"
          right={num(totals.overtime, 0)}
          rightTone={totals.overtime > 0 ? 'text-red-600' : 'text-gray-900'}
        />
        <PairCard
          leftLabel="Estimated Labor Cost"
          left={money(totals.estLabor)}
          rightLabel="Actual Labor Cost"
          right={money(totals.actLabor)}
          compare={[totals.actLabor, totals.estLabor, true]}
        />
        <PairCard
          leftLabel="Estimated Gross Profit"
          left={money(totals.estGP)}
          rightLabel="Actual Gross Profit"
          right={money(totals.actGP)}
          compare={[totals.actGP, totals.estGP, false]}
        />
        <PairCard
          leftLabel="Estimated GLPMD"
          left={money2(totals.estGlpmd)}
          rightLabel="Actual GLPMD"
          right={money2(totals.actGlpmd)}
          compare={[totals.actGlpmd, totals.estGlpmd, false]}
        />
      </div>

      {/* ── Job by job ───────────────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 overflow-auto rounded-xl border border-gray-200 bg-white">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-700"></div>
          </div>
        ) : !rows.length ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-3xl mb-2">👷</p>
            <p className="text-sm">
              {data?.jobs?.length
                ? `Crew ${crew?.label} finished no jobs in this range — every one is still current.`
                : `Crew ${crew?.label} clocked no hours in this range.`}
            </p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="sticky top-0 bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-3 py-2.5 text-left text-sm font-bold text-gray-600">Job</th>
                <th className="px-3 py-2.5 text-center text-sm font-bold text-gray-600">
                  Estimated Man Days
                </th>
                <th className="px-3 py-2.5 text-center text-sm font-bold text-gray-600">
                  Actual Man Days
                </th>
                <th className="px-3 py-2.5 text-center text-sm font-bold text-gray-600">
                  Estimated Labor
                </th>
                <th className="px-3 py-2.5 text-center text-sm font-bold text-gray-600">
                  Actual Labor
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map(r => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2.5 text-base text-left">
                    <span className="font-semibold text-gray-900">{r.name}</span>
                    {!r.complete && (
                      <span className="ml-2 align-middle rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
                        current · {Math.round(r.completion * 100)}%
                      </span>
                    )}
                    <span className="block text-xs text-gray-400">
                      {r.moduleNames.length ? r.moduleNames.join(' · ') : 'no modules assigned'}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-base text-center font-mono">{num(r.estMD)}</td>
                  <td
                    className={`px-3 py-2.5 text-base text-center font-mono font-semibold ${
                      r.estMD && r.actMD > r.estMD ? 'text-red-600' : 'text-blue-700'
                    }`}
                  >
                    {num(r.actMD)}
                  </td>
                  <td className="px-3 py-2.5 text-base text-center">{money(r.estLabor)}</td>
                  <td
                    className={`px-3 py-2.5 text-base text-center font-semibold ${
                      r.estLabor && r.actLabor > r.estLabor ? 'text-red-600' : 'text-blue-700'
                    }`}
                  >
                    {money(r.actLabor)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="sticky bottom-0 bg-gray-50 border-t-2 border-gray-200">
              <tr>
                <td className="px-3 py-2.5 text-base font-bold text-gray-800">
                  {rows.length} job{rows.length === 1 ? '' : 's'}
                </td>
                <td className="px-3 py-2.5 text-base text-center font-mono font-bold">
                  {num(totals.estMD)}
                </td>
                <td className="px-3 py-2.5 text-base text-center font-mono font-bold text-blue-700">
                  {num(totals.actMD)}
                </td>
                <td className="px-3 py-2.5 text-base text-center font-bold">
                  {money(totals.estLabor)}
                </td>
                <td className="px-3 py-2.5 text-base text-center font-bold text-blue-700">
                  {money(totals.actLabor)}
                </td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>
    </div>
  )
}

// A card holds one estimated/actual pair. `compare` is [actual, estimate,
// inverse] — inverse marks a figure where spending LESS is the good outcome.
function PairCard({ leftLabel, left, rightLabel, right, rightTone, compare }) {
  let tone = rightTone || 'text-gray-900'
  if (!rightTone && compare) {
    const [act, est, inverse] = compare
    if (Number.isFinite(act) && Number.isFinite(est) && est !== 0) {
      const bad = inverse ? act > est : act < est
      tone = Math.abs(act - est) < 0.005 ? 'text-gray-900' : bad ? 'text-red-600' : 'text-green-700'
    }
  }
  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 text-center flex-1">
          <p className="text-[11px] font-bold text-gray-500 truncate">{leftLabel}</p>
          <p className="text-2xl font-bold tabular-nums text-gray-900">{left}</p>
        </div>
        <div className="w-px self-stretch bg-gray-100" />
        <div className="min-w-0 text-center flex-1">
          <p className="text-[11px] font-bold text-gray-500 truncate">{rightLabel}</p>
          <p className={`text-2xl font-bold tabular-nums ${tone}`}>{right}</p>
        </div>
      </div>
    </div>
  )
}
