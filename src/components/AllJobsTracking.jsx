// src/components/AllJobsTracking.jsx
//
// All-Jobs view for the Jobs > Tracking tab. Shown when "All Jobs" is selected
// instead of the per-job JobComparison.
//
// Every row carries the same figures as the black summary bar on a single job —
// man days, labour cost, gross profit and GLPMD, estimated against actual — so
// the list and the detail view can never disagree. They come from the same
// lib/jobProfit engine, called once per job.
//
// The last column is the job's completion, each module's percentage weighted by
// its ESTIMATED MAN DAYS: a module carrying ten days moves the number twice as
// far as one carrying five. Where every module on a job shares a GPMD this is
// identical to the profit weighting the per-job grid uses, since GLPE is just
// man days × GPMD.
import { useMemo, useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { resolveRates, jobProfitAsOf, completionAsOf } from '../lib/jobProfit'

function isJobOpen(j) {
  const s = j?.status || 'active'
  return s === 'active' || s === 'on_hold'
}

const money = v => {
  const n = Number(v)
  return Number.isFinite(n)
    ? n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
    : '—'
}
const md = v => (Number.isFinite(v) ? v.toFixed(1) : '—')
const nv = v => {
  const n = parseFloat(v)
  return Number.isFinite(n) ? n : 0
}

// Chunked so a long `in` list cannot blow the URL length, and PAGED because
// PostgREST returns at most 1,000 rows per request — the active jobs alone carry
// 10,612 time entries, so an unpaged fetch silently returned the first tenth and
// left most jobs looking like nobody had ever clocked into them.
const PAGE = 1000
async function fetchIn(table, column, ids, select) {
  const out = []
  for (let i = 0; i < ids.length; i += 150) {
    const slice = ids.slice(i, i + 150)
    for (let from = 0; ; from += PAGE) {
      const { data } = await supabase
        .from(table)
        .select(select)
        .in(column, slice)
        .range(from, from + PAGE - 1)
      if (!data?.length) break
      out.push(...data)
      if (data.length < PAGE) break
    }
  }
  return out
}

const NO_STAGE = '__none__'
// The saved view is one person's preference about what to look at, not shared
// company data — so it is keyed by user id and never leaves their browser. Two
// people on the same machine keep separate views.
const viewKey = userId => `pb.tracking.allJobs.stageFilter:${userId || 'anon'}`

function loadSavedView(userId) {
  try {
    const raw = localStorage.getItem(viewKey(userId))
    return raw ? new Set(JSON.parse(raw)) : new Set()
  } catch {
    return new Set()
  }
}

export default function AllJobsTracking({
  jobs = [],
  stages = [],
  statusFilter = 'open',
  onSelectJob,
}) {
  const { user } = useAuth()
  const userId = user?.id
  const [settings, setSettings] = useState(null)
  const [modulesByJob, setModulesByJob] = useState(new Map())
  const [compByJob, setCompByJob] = useState(new Map())
  const [timeByJob, setTimeByJob] = useState(new Map())
  const [loading, setLoading] = useState(true)
  // Stages the user has switched OFF. Empty means everything is included, so a
  // stage added to the pipeline later shows up without anyone re-picking it.
  const [excludedStages, setExcludedStages] = useState(() => loadSavedView(userId))
  const [stageOpen, setStageOpen] = useState(false)
  useEffect(() => {
    setExcludedStages(loadSavedView(userId))
  }, [userId])
  const [savedFlash, setSavedFlash] = useState(false)
  const stageRef = useRef(null)

  // Click anywhere outside the panel to close it.
  useEffect(() => {
    if (!stageOpen) return
    const onDown = e => {
      if (stageRef.current && !stageRef.current.contains(e.target)) setStageOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [stageOpen])

  function saveView() {
    try {
      localStorage.setItem(viewKey(userId), JSON.stringify([...excludedStages]))
      setSavedFlash(true)
      setTimeout(() => setSavedFlash(false), 1800)
    } catch {
      // Private browsing or a full store — the filter still applies, it just
      // will not survive a reload, so say nothing rather than block the user.
    }
  }

  const visible = useMemo(
    () => jobs.filter(j => (statusFilter === 'closed' ? !isJobOpen(j) : isJobOpen(j))),
    [jobs, statusFilter]
  )

  // Chips are counted off the status-filtered set, not the stage-filtered one,
  // so the numbers hold steady while stages are toggled on and off.
  const stageCounts = useMemo(() => {
    const m = new Map()
    for (const j of visible) {
      const k = j.stage_id || NO_STAGE
      m.set(k, (m.get(k) || 0) + 1)
    }
    return m
  }, [visible])

  const stageChips = useMemo(() => {
    const list = stages
      .filter(st => stageCounts.has(st.id))
      .map(st => ({ id: st.id, name: st.name, count: stageCounts.get(st.id) }))
    if (stageCounts.has(NO_STAGE)) {
      list.push({ id: NO_STAGE, name: 'Unassigned', count: stageCounts.get(NO_STAGE) })
    }
    return list
  }, [stages, stageCounts])

  const inStage = useMemo(
    () => visible.filter(j => !excludedStages.has(j.stage_id || NO_STAGE)),
    [visible, excludedStages]
  )

  const stageSummary = useMemo(() => {
    const on = stageChips.filter(c => !excludedStages.has(c.id))
    if (on.length === stageChips.length) return 'All stages'
    if (on.length === 0) return 'No stages'
    if (on.length === 1) return on[0].name
    return `${on.length} of ${stageChips.length} stages`
  }, [stageChips, excludedStages])

  function toggleStage(id) {
    setExcludedStages(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!visible.length) {
        setLoading(false)
        return
      }
      setLoading(true)
      const jobIds = visible.map(j => j.id)
      const estimateIds = [...new Set(visible.map(j => j.estimate_id).filter(Boolean))]

      const [settingsRes, projects, comps] = await Promise.all([
        supabase.from('company_settings').select('*').maybeSingle(),
        estimateIds.length
          ? fetchIn(
              'estimate_projects',
              'estimate_id',
              estimateIds,
              'estimate_id, estimate_modules ( * )'
            )
          : [],
        fetchIn('module_completion', 'job_id', jobIds, '*'),
      ])
      if (cancelled) return

      // Hours are only fetched for jobs a PM has actually reported on. Without a
      // completion reading the engine has nothing earned to set against the cost,
      // so it would report the whole wage bill as negative profit — true
      // arithmetic, meaningless for 201 legacy jobs nobody ever tracked. Those
      // rows show their estimate and an em dash, not a fabricated loss.
      const tracked = [...new Set(comps.map(c => c.job_id))]
      const entries = tracked.length ? await fetchIn('time_entries', 'job_id', tracked, '*') : []
      if (cancelled) return

      // estimate_id → modules, then map each job through its own estimate.
      const byEstimate = new Map()
      for (const p of projects) {
        const list = byEstimate.get(p.estimate_id) || []
        list.push(...(p.estimate_modules || []))
        byEstimate.set(p.estimate_id, list)
      }
      const mods = new Map()
      for (const j of visible) mods.set(j.id, byEstimate.get(j.estimate_id) || [])

      const group = (rows, key) => {
        const m = new Map()
        for (const r of rows) {
          const list = m.get(r[key]) || []
          list.push(r)
          m.set(r[key], list)
        }
        return m
      }

      setSettings(settingsRes.data || null)
      setModulesByJob(mods)
      setCompByJob(group(comps, 'job_id'))
      setTimeByJob(group(entries, 'job_id'))
      setLoading(false)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [visible])

  const rates = useMemo(() => resolveRates(settings), [settings])

  const rows = useMemo(() => {
    return inStage
      .map(j => {
        const modules = modulesByJob.get(j.id) || []
        const completions = compByJob.get(j.id) || []
        const timeEntries = timeByJob.get(j.id) || []
        const estMD = modules.reduce((s, m) => s + nv(m.man_days), 0)

        // Completion weighted by estimated man days.
        const cp = completionAsOf(completions)
        const pctComplete =
          estMD > 0
            ? modules.reduce((s, m) => s + (cp.get(m.id) || 0) * nv(m.man_days), 0) / estMD
            : 0

        const isTracked = completions.length > 0
        const p =
          rates && isTracked ? jobProfitAsOf({ modules, completions, timeEntries, rates }) : null
        const estLabor = modules.reduce((s, m) => s + nv(m.labor_cost), 0)
        return {
          id: j.id,
          name: j.name || j.client_name || '—',
          modules: modules.length,
          isTracked,
          estMD,
          actMD: p ? p.actualManDays : 0,
          estLabor,
          actLabor: p ? p.rlc : 0,
          estGP: p ? p.glpeTotal : 0,
          actGP: p ? p.glpa : 0,
          estGlpmd: estMD > 0 && p ? p.glpeTotal / estMD : null,
          actGlpmd: p ? p.glpmda : null,
          subGP: p ? p.subEarned : 0,
          pctComplete,
        }
      })
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [inStage, modulesByJob, compByJob, timeByJob, rates])

  const trackedRows = rows.filter(r => r.isTracked)
  const totals = trackedRows.reduce(
    (a, r) => ({
      estMD: a.estMD + r.estMD,
      actMD: a.actMD + r.actMD,
      estLabor: a.estLabor + r.estLabor,
      actLabor: a.actLabor + r.actLabor,
      estGP: a.estGP + r.estGP,
      actGP: a.actGP + r.actGP,
      subGP: a.subGP + r.subGP,
    }),
    { estMD: 0, actMD: 0, estLabor: 0, actLabor: 0, estGP: 0, actGP: 0, subGP: 0 }
  )
  // Weighted by man days again, so one big job counts for more than one small.
  const totalPct =
    totals.estMD > 0
      ? trackedRows.reduce((s, r) => s + r.pctComplete * r.estMD, 0) / totals.estMD
      : 0

  const th = 'px-3 py-2.5 text-center text-sm font-bold text-gray-900 tracking-wide'
  const td = 'px-3 py-2.5 text-base text-center text-gray-700'
  // The totals bar is the line people read first, so it sits a size above the
  // rows it sums.
  const tf = 'px-3 py-3 text-lg text-center text-gray-800'
  // Spending less is the good outcome for days and cost; more is better for profit.
  const tone = (act, est, inverse) => {
    if (!est) return 'text-gray-400'
    const bad = inverse ? act > est : act < est
    return Math.abs(act - est) < 0.005 ? 'text-gray-700' : bad ? 'text-red-600' : 'text-green-700'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-700"></div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {!rates && (
        <div className="mb-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm text-amber-800">
          Labour rates are not set, so actuals cannot be calculated. Set the crew rate and overtime
          multiplier in HR → Labor Rates.
        </div>
      )}

      {stageChips.length > 1 && (
        <div className="mb-3 flex items-center gap-2" ref={stageRef}>
          <div className="relative">
            <button
              onClick={() => setStageOpen(o => !o)}
              className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              <span className="text-gray-500">Stage</span>
              <span>{stageSummary}</span>
              <span className="text-gray-400">▾</span>
            </button>

            {stageOpen && (
              <div className="absolute left-0 z-20 mt-1 w-72 rounded-xl border border-gray-200 bg-white shadow-lg">
                <div className="flex items-center justify-between border-b border-gray-100 px-3 py-2">
                  <span className="text-xs font-bold uppercase tracking-wide text-gray-400">
                    Include stages
                  </span>
                  <span className="flex gap-2">
                    <button
                      onClick={() => setExcludedStages(new Set())}
                      className="text-xs font-semibold text-green-700 hover:underline"
                    >
                      All
                    </button>
                    <button
                      onClick={() => setExcludedStages(new Set(stageChips.map(c => c.id)))}
                      className="text-xs font-semibold text-gray-500 hover:underline"
                    >
                      None
                    </button>
                  </span>
                </div>

                <div className="max-h-80 overflow-auto py-1">
                  {stageChips.map(c => {
                    const on = !excludedStages.has(c.id)
                    return (
                      <button
                        key={c.id}
                        onClick={() => toggleStage(c.id)}
                        className="flex w-full items-center gap-2.5 px-3 py-1.5 text-left hover:bg-gray-50"
                      >
                        <span
                          className={`flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full border-2 ${
                            on ? 'border-green-600' : 'border-gray-300'
                          }`}
                        >
                          {on && <span className="h-2 w-2 rounded-full bg-green-600" />}
                        </span>
                        <span
                          className={`flex-1 text-sm ${on ? 'font-semibold text-gray-800' : 'text-gray-400'}`}
                        >
                          {c.name}
                        </span>
                        <span className="text-xs tabular-nums text-gray-400">{c.count}</span>
                      </button>
                    )
                  })}
                </div>

                <div className="border-t border-gray-100 px-3 py-2">
                  <button
                    onClick={saveView}
                    className="w-full rounded-lg bg-green-700 px-3 py-1.5 text-sm font-semibold text-white hover:bg-green-800"
                  >
                    Save view
                  </button>
                </div>
              </div>
            )}
          </div>

          {savedFlash && (
            <span className="text-sm font-semibold text-green-700">
              Saved — this is your default
            </span>
          )}
        </div>
      )}

      {rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <p className="mb-2 text-4xl">📊</p>
          <p className="text-sm">
            {visible.length
              ? 'No jobs in the selected stages.'
              : `No ${statusFilter === 'closed' ? 'closed' : 'open'} jobs.`}
          </p>
        </div>
      ) : (
        <div className="flex-1 min-h-0 overflow-auto rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-gray-50 border-b border-gray-200">
              <tr>
                <th className={`${th} text-left`}>Job</th>
                <th className={th}>Estimated Man Days</th>
                <th className={th}>Actual Man Days</th>
                <th className={th}>Estimated Labor</th>
                <th className={th}>Actual Labor</th>
                <th className={th}>Estimated Gross Profit</th>
                <th className={th}>Actual Gross Profit</th>
                <th className={th}>Estimated GLPMD</th>
                <th className={th}>Actual GLPMD</th>
                <th className={th}>Sub Gross Profit</th>
                <th className={th}>Completion %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map(r => (
                <tr
                  key={r.id}
                  onClick={() => onSelectJob?.(r.id)}
                  className="hover:bg-green-50/60 cursor-pointer"
                >
                  <td className={`${td} text-left`}>
                    <span className="font-semibold text-gray-900">{r.name}</span>
                    <span className="block text-xs text-gray-400">
                      {r.modules} module{r.modules === 1 ? '' : 's'}
                    </span>
                  </td>
                  <td className={`${td} font-mono`}>{md(r.estMD)}</td>
                  <td className={`${td} font-mono ${tone(r.actMD, r.estMD, true)}`}>
                    {r.actMD > 0 ? md(r.actMD) : '—'}
                  </td>
                  <td className={td}>{money(r.estLabor)}</td>
                  <td className={`${td} ${tone(r.actLabor, r.estLabor, true)}`}>
                    {r.actLabor > 0 ? money(r.actLabor) : '—'}
                  </td>
                  <td className={td}>{money(r.estGP)}</td>
                  <td className={`${td} ${tone(r.actGP, r.estGP * r.pctComplete, false)}`}>
                    {r.isTracked ? money(r.actGP) : '—'}
                  </td>
                  <td className={td}>{r.estGlpmd == null ? '—' : money(r.estGlpmd)}</td>
                  <td className={`${td} ${tone(r.actGlpmd || 0, r.estGlpmd || 0, false)}`}>
                    {r.actGlpmd == null ? '—' : money(r.actGlpmd)}
                  </td>
                  <td className={td}>{money(r.subGP)}</td>
                  <td className={td}>
                    {r.isTracked ? (
                      <span
                        className={`font-bold ${
                          r.pctComplete >= 0.999
                            ? 'text-green-700'
                            : r.pctComplete === 0
                              ? 'text-gray-300'
                              : 'text-gray-800'
                        }`}
                      >
                        {Math.round(r.pctComplete * 100)}%
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">not tracked</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="sticky bottom-0 bg-gray-50 border-t-2 border-gray-200 font-semibold">
              <tr>
                <td className={`${tf} text-left font-bold text-gray-900`}>
                  {trackedRows.length} tracked
                  <span className="block text-sm font-normal text-gray-500">
                    of {rows.length} job{rows.length === 1 ? '' : 's'}
                  </span>
                </td>
                <td className={`${tf} font-mono font-bold`}>{md(totals.estMD)}</td>
                <td
                  className={`${tf} font-mono font-bold ${tone(totals.actMD, totals.estMD, true)}`}
                >
                  {md(totals.actMD)}
                </td>
                <td className={`${tf} font-bold`}>{money(totals.estLabor)}</td>
                <td className={`${tf} font-bold ${tone(totals.actLabor, totals.estLabor, true)}`}>
                  {money(totals.actLabor)}
                </td>
                <td className={`${tf} font-bold`}>{money(totals.estGP)}</td>
                <td className={`${tf} font-bold`}>{money(totals.actGP)}</td>
                <td className={`${tf} font-bold`}>
                  {totals.estMD > 0 ? money(totals.estGP / totals.estMD) : '—'}
                </td>
                <td className={`${tf} font-bold`}>
                  {totals.actMD > 0 ? money(totals.actGP / totals.actMD) : '—'}
                </td>
                <td className={`${tf} font-bold`}>{money(totals.subGP)}</td>
                <td className={`${tf} font-bold text-gray-800`}>{Math.round(totalPct * 100)}%</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  )
}
