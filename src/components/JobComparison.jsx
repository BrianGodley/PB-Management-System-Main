import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import {
  resolveRates,
  jobProfitAsOf,
  attributeHoursByModule,
  splitHours,
  dailySeries,
  weekDates,
} from '../lib/jobProfit'
import ModuleCompletionGrid, { WeekPicker, weekBounds } from './ModuleCompletionGrid'

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
const fmt = n =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(n || 0)
const fmtD = n => {
  const v = parseFloat(n || 0)
  return `${v % 1 === 0 ? v.toFixed(0) : v.toFixed(1)} MD`
}
const fmtH = n => `${parseFloat(n || 0).toFixed(1)}h`
const nv = v => parseFloat(v || 0)

function diffMins(timeIn, timeOut) {
  if (!timeIn || !timeOut) return 0
  const [ih, im] = timeIn.split(':').map(Number)
  const [oh, om] = timeOut.split(':').map(Number)
  return Math.max(0, oh * 60 + om - (ih * 60 + im))
}

function crewSizeOf(crew) {
  if (!crew) return 3
  const n = [
    'crew_chief_id',
    'journeyman_id',
    'laborer_1_id',
    'laborer_2_id',
    'laborer_3_id',
  ].filter(k => crew[k]).length
  return n > 0 ? n : 3
}

function DeltaBadge({ est, act, currency = false, inverse = false }) {
  if (est == null || act == null) return null
  const delta = act - est
  const pct = est !== 0 ? (delta / Math.abs(est)) * 100 : null
  // `inverse` marks a metric where spending LESS is the good outcome — man days,
  // labour cost. The test was the wrong way round, so a job that came in seven
  // man days UNDER estimate was painted red, and one that ran over was green.
  const bad = inverse ? delta > 0 : delta < 0
  const color = delta === 0 ? 'text-gray-400' : bad ? 'text-red-600' : 'text-green-600'
  const arrow = delta === 0 ? '—' : delta > 0 ? '▲' : '▼'
  return (
    <span className={`text-[11px] font-semibold ${color}`}>
      {arrow} {currency ? fmt(Math.abs(delta)) : fmtD(Math.abs(delta))}
      {pct != null && (
        <span className="ml-0.5 font-normal opacity-70">({Math.abs(pct).toFixed(0)}%)</span>
      )}
    </span>
  )
}

// ─── Summary bar ─────────────────────────────────────────────────────────────
// Three encapsulated groups on a dark ground, matching the estimator's GPMD bar
// so the two screens read as one system: In House Labor (blue), Subcontractors
// (orange), Materials (amber). Materials sits apart because it is the one
// vertical that cannot be known until the bills land.
//
// On black, the tones shift a step lighter than they would on white —
// green-400 and red-400 rather than -700 and -600 — or the values go muddy.

// A metric with one value — used where estimated and actual are the same thing.
function Single({
  label,
  value,
  currency = false,
  unknown = false,
  unknownNote,
  tone = 'text-white',
}) {
  return (
    <div className="flex-1 min-w-0 px-3 py-1.5">
      <p className="text-[10px] font-bold text-gray-300 text-center truncate">{label}</p>
      {unknown ? (
        <p
          className="text-xs font-bold text-gray-500 text-center leading-tight mt-0.5"
          title={unknownNote}
        >
          not yet
          <br />
          known
        </p>
      ) : (
        <p className={`text-sm font-bold tabular-nums text-center truncate ${tone}`}>
          {currency ? fmt(value) : fmtD(value)}
        </p>
      )}
    </div>
  )
}

// `cards` splits the group into separate tiles instead of columns divided
// inside one long bar. Four estimated/actual pairs read better as four objects
// than as eight figures behind hairlines — the card edge does the grouping that
// spacing alone was struggling to do.
// A single value the user can type into. Click to edit, Enter or blur to save,
// Escape to abandon — the same interaction as the estimator's markup boxes.
function EditableSingle({ label, value, onSave, tone = 'text-white', hint }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const start = () => {
    setDraft(value ? String(value) : '')
    setEditing(true)
  }
  const commit = () => {
    const raw = draft.trim()
    // Empty clears the adjustment rather than storing NaN.
    const next = raw === '' ? 0 : parseFloat(raw)
    setEditing(false)
    if (Number.isFinite(next) && next !== value) onSave(next)
  }
  return (
    <div className="flex-1 min-w-0 px-3 py-1.5">
      <p className="text-[10px] font-bold text-gray-300 text-center truncate">{label}</p>
      {editing ? (
        <input
          autoFocus
          type="number"
          step="0.01"
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={e => {
            if (e.key === 'Enter') commit()
            if (e.key === 'Escape') setEditing(false)
          }}
          className="w-full bg-gray-800 border border-orange-400 rounded text-orange-200 text-sm font-bold text-center tabular-nums outline-none px-1"
        />
      ) : (
        <p
          onClick={start}
          title={hint}
          className={`text-sm font-bold tabular-nums text-center truncate cursor-pointer hover:text-orange-300 transition-colors ${tone}`}
        >
          {value ? `${value > 0 ? '+' : ''}${fmt(value)}` : '—'}
          <span className="text-orange-500 text-[10px] ml-1">✎</span>
        </p>
      )}
    </div>
  )
}

const RATE_NOTE = 'Set the crew rate and overtime multiplier in HR → Labor Rates.'

// Colour an actual against what is DUE at this completion. `inverse` marks a
// figure where spending LESS is the good outcome (man days, cost); profit and
// the produced rate are the other way round.
function toneFor(actual, expected, inverse) {
  if (actual == null || expected == null) return 'text-white'
  const delta = actual - expected
  if (Math.abs(delta) < 0.005) return 'text-white'
  const bad = inverse ? delta > 0 : delta < 0
  return bad ? 'text-red-400' : 'text-green-400'
}

function Group({ title, accent, grow, children }) {
  return (
    <div className={`min-w-0 flex flex-col ${grow}`}>
      <p
        className={`text-[10px] font-bold uppercase tracking-wider mb-1 px-1 text-center truncate ${accent.text}`}
      >
        {title}
      </p>
      <div
        className={`flex-1 flex items-stretch divide-x divide-white/10 rounded-lg border bg-gray-900 py-1 px-1 ${accent.border}`}
      >
        {children}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Module breakdown table — one row per work order
// ─────────────────────────────────────────────────────────────────────────────
// `profitRows` come from lib/jobProfit — per module, the hours actually clocked
// against it and what they cost at the burdened crew rate. This table used to
// derive actuals from the SCHEDULE instead (work_days x crew size) priced at
// labor_rate_per_man_day, which disagreed with the summary bar on both counts:
// on Test Tester1 that read 39.0 scheduled MD at $317.36 = $12,377 against the
// bar's 30.4 clocked MD at $253.20 = $7,707. Scheduled days are still shown —
// they are a real and different fact — but ACTUAL now means clocked, everywhere.
function ModuleTable({ workOrders, crewMap, profitRows }) {
  const byModule = useMemo(() => {
    const m = new Map()
    for (const r of profitRows || []) m.set(r.id, r)
    return m
  }, [profitRows])

  const rows = workOrders.map(wo => {
    const estMD = nv(wo.man_days)
    const estMat = nv(wo.material_cost) + nv(wo.sub_cost)
    const estLab = nv(wo.labor_cost)
    // null, not zero, when the work order chain could not resolve this module's
    // hours — an unknown is not the same as nothing worked.
    const pr = byModule.get(wo.estimate_module_id)
    const actMD = pr?.actualManDays ?? null
    const actLab = pr?.rlc ?? null
    const crew = wo.scheduled_crew_id ? crewMap[wo.scheduled_crew_id] : null
    return { wo, estMD, actMD, estMat, estLab, actLab, crew }
  })

  const totEstMD = rows.reduce((s, r) => s + r.estMD, 0)
  const totActMD = rows.reduce((s, r) => s + (r.actMD || 0), 0)
  const totEstMat = rows.reduce((s, r) => s + r.estMat, 0)
  const totEstLab = rows.reduce((s, r) => s + r.estLab, 0)
  const totActLab = rows.reduce((s, r) => s + (r.actLab || 0), 0)

  // A reference table people read across, so it carries a size up from the
  // 10px/14px the denser panels use.
  const thCls = 'px-3 py-2.5 text-left text-xs font-bold text-gray-600 uppercase tracking-wide'
  const tdCls = 'px-3 py-2.5 text-base text-gray-700'

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-4 py-2.5 border-b border-gray-100 bg-gray-50">
        <span className="text-xs font-bold text-gray-700 uppercase tracking-wide">
          Module Breakdown
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[700px]">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className={thCls}>Module</th>
              <th className={thCls}>Assigned Crew</th>
              <th className={thCls}>Crew Type</th>
              <th className={`${thCls} text-right`}>Estimated Man Days</th>
              <th className={`${thCls} text-right`}>Actual Man Days</th>
              <th className={`${thCls} text-right`}>Difference</th>
              <th className={`${thCls} text-right`}>Estimated Labor</th>
              <th className={`${thCls} text-right`}>Actual Labor</th>
              <th className={`${thCls} text-right`}>Estimated Materials</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {rows.map(({ wo, estMD, actMD, estMat, estLab, actLab, crew }) => {
              const mdDelta = actMD == null ? null : actMD - estMD
              return (
                <tr key={wo.id} className="hover:bg-gray-50">
                  <td className={tdCls}>
                    <span className="font-semibold text-gray-900">{wo.module_type}</span>
                    {wo.project_name && (
                      <span className="text-gray-400 text-xs ml-1">· {wo.project_name}</span>
                    )}
                    {wo.is_subcontractor && (
                      <span className="ml-1 text-[9px] font-bold bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                        SUB
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    {crew ? (
                      <span className="text-sm font-bold bg-green-100 text-green-800 px-2.5 py-1 rounded-md whitespace-nowrap">
                        👷 Crew {crew.label}
                      </span>
                    ) : wo.scheduled_crew_id ? (
                      <span className="text-sm text-gray-400">Loading…</span>
                    ) : (
                      <span className="text-sm font-semibold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-md whitespace-nowrap">
                        ⚠ Unassigned
                      </span>
                    )}
                  </td>
                  <td className={tdCls}>
                    <span className="text-sm bg-purple-50 text-purple-700 px-2.5 py-1 rounded-md font-medium whitespace-nowrap">
                      {wo.crew_type || '—'}
                    </span>
                  </td>
                  <td className={`${tdCls} text-right font-mono`}>
                    {estMD > 0 ? fmtD(estMD) : '—'}
                  </td>
                  <td
                    className={`${tdCls} text-right font-mono ${actMD ? 'text-blue-700 font-semibold' : 'text-gray-400'}`}
                  >
                    {actMD == null ? '—' : fmtD(actMD)}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {mdDelta != null && (estMD > 0 || actMD > 0) && (
                      <span
                        className={`text-[11px] font-semibold ${Math.abs(mdDelta) < 0.05 ? 'text-gray-400' : mdDelta > 0 ? 'text-red-500' : 'text-green-600'}`}
                      >
                        {mdDelta > 0 ? '+' : ''}
                        {fmtD(mdDelta)}
                      </span>
                    )}
                  </td>
                  <td className={`${tdCls} text-right`}>{estLab > 0 ? fmt(estLab) : '—'}</td>
                  <td
                    className={`${tdCls} text-right ${actLab ? 'font-semibold text-blue-700' : 'text-gray-400'}`}
                  >
                    {actLab == null ? '—' : fmt(actLab)}
                  </td>
                  <td className={`${tdCls} text-right`}>{estMat > 0 ? fmt(estMat) : '—'}</td>
                </tr>
              )
            })}
          </tbody>
          <tfoot className="bg-gray-50 border-t-2 border-gray-200 font-semibold">
            <tr>
              <td className="px-3 py-2 text-base font-bold text-gray-800" colSpan={3}>
                Totals
              </td>
              <td className="px-3 py-2 text-base text-right font-mono">{fmtD(totEstMD)}</td>
              <td className="px-3 py-2 text-base text-right font-mono text-blue-700">
                {totActMD > 0 ? fmtD(totActMD) : '—'}
              </td>
              <td className="px-3 py-2 text-right">
                <DeltaBadge est={totEstMD} act={totActMD} inverse />
              </td>
              <td className="px-3 py-2 text-base text-right">{fmt(totEstLab)}</td>
              <td className="px-3 py-2 text-base text-right text-blue-700">
                {totActLab > 0 ? fmt(totActLab) : '—'}
              </td>
              <td className="px-3 py-2 text-base text-right">{fmt(totEstMat)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Payroll detail panel
// ─────────────────────────────────────────────────────────────────────────────
function PayrollPanel({ timeEntries, scheduledManDays }) {
  const [open, setOpen] = useState(true)
  if (timeEntries.length === 0) return null

  const byDate = {}
  for (const e of timeEntries) {
    if (!byDate[e.date]) byDate[e.date] = []
    byDate[e.date].push(e)
  }
  // Through the engine, so this panel, the summary bar and the breakdown table
  // all report the same hours. Its own arithmetic diverged twice: diffMins
  // ignores bt_break_time and the bt_hours_regular/overtime fields that imported
  // rows carry instead of clock times, and overtime was measured against
  // SCHEDULED man days rather than per person per day — a crew of three working
  // one eight-hour day showed 24h against an 8h standard and reported 16h of
  // overtime that never happened.
  const hours = splitHours(timeEntries)
  const totalPayrollHrs = hours.total
  const standardHrs = hours.standard
  const overtimeHrs = hours.overtime
  const overtimeMD = overtimeHrs / 8
  const totalMD = totalPayrollHrs / 8

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-4 py-2.5 bg-gray-50 border-b border-gray-100"
        onClick={() => setOpen(v => !v)}
      >
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-gray-700 uppercase tracking-wide">
            Payroll Records
          </span>
          <span className="text-[10px] font-semibold bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
            {fmtH(totalPayrollHrs)} total · {fmtD(totalMD)} MD
          </span>
          {overtimeHrs > 0.1 && (
            <span className="text-[10px] font-semibold bg-red-50 text-red-600 px-2 py-0.5 rounded">
              ⚠ {fmtH(overtimeHrs)} overtime → +{fmtD(overtimeMD)}
            </span>
          )}
        </div>
        <span className="text-gray-400 text-sm">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[500px]">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-3 py-2 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wide">
                  Date
                </th>
                <th className="px-3 py-2 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wide">
                  Employee
                </th>
                <th className="px-3 py-2 text-right text-[10px] font-bold text-gray-500 uppercase tracking-wide">
                  Time In
                </th>
                <th className="px-3 py-2 text-right text-[10px] font-bold text-gray-500 uppercase tracking-wide">
                  Time Out
                </th>
                <th className="px-3 py-2 text-right text-[10px] font-bold text-gray-500 uppercase tracking-wide">
                  Hours
                </th>
                <th className="px-3 py-2 text-right text-[10px] font-bold text-gray-500 uppercase tracking-wide">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {Object.entries(byDate)
                .sort(([a], [b]) => a.localeCompare(b))
                .flatMap(([date, entries]) => {
                  const dateTotalMins = entries.reduce(
                    (s, e) => s + diffMins(e.time_in, e.time_out),
                    0
                  )
                  const dateStdMins = 8 * 60 * entries.length // standard 8h per person
                  const dateOT = Math.max(0, dateTotalMins - dateStdMins)
                  return entries.map((e, i) => {
                    const mins = diffMins(e.time_in, e.time_out)
                    const isOT = i === 0 && dateOT > 0
                    return (
                      <tr key={e.id} className={`hover:bg-gray-50 ${isOT ? 'bg-red-50/30' : ''}`}>
                        <td className="px-3 py-2 text-sm text-gray-700">
                          {i === 0 ? (
                            <span className="font-semibold">
                              {new Date(date + 'T00:00:00').toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                weekday: 'short',
                              })}
                            </span>
                          ) : (
                            ''
                          )}
                        </td>
                        <td className="px-3 py-2 text-sm text-gray-700">{e.employee_name}</td>
                        <td className="px-3 py-2 text-sm text-right font-mono text-gray-600">
                          {e.time_in || '—'}
                        </td>
                        <td className="px-3 py-2 text-sm text-right font-mono text-gray-600">
                          {e.time_out || '—'}
                        </td>
                        <td className="px-3 py-2 text-sm text-right font-mono">
                          {e.time_out ? (
                            fmtH(mins / 60)
                          ) : (
                            <span className="text-amber-500 text-xs">Active</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {i === 0 && dateOT > 0 && (
                            <span className="text-[10px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded">
                              +{fmtH(dateOT / 60)} OT
                            </span>
                          )}
                        </td>
                      </tr>
                    )
                  })
                })}
            </tbody>
            <tfoot className="bg-gray-50 border-t border-gray-200">
              <tr>
                <td colSpan={4} className="px-3 py-2 text-xs font-bold text-gray-700">
                  Total Payroll Hours
                </td>
                <td className="px-3 py-2 text-sm font-bold text-right font-mono text-blue-700">
                  {fmtH(totalPayrollHrs)}
                </td>
                <td className="px-3 py-2 text-right">
                  {overtimeHrs > 0.1 && (
                    <span className="text-[10px] font-bold text-red-600">
                      +{fmtD(overtimeMD)} OT
                    </span>
                  )}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Bills & Invoices panel
// ─────────────────────────────────────────────────────────────────────────────
function AccountingPanel({ bills, invoices }) {
  const [open, setOpen] = useState(true)
  if (bills.length === 0 && invoices.length === 0) return null

  const totalBills = bills.reduce((s, b) => s + nv(b.total), 0)
  const totalInvoiced = invoices.reduce((s, i) => s + nv(i.total), 0)
  const totalCollected = invoices.reduce((s, i) => s + nv(i.amount_paid), 0)

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-4 py-2.5 bg-gray-50 border-b border-gray-100"
        onClick={() => setOpen(v => !v)}
      >
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-gray-700 uppercase tracking-wide">
            Accounting Records
          </span>
          {bills.length > 0 && (
            <span className="text-[10px] font-semibold bg-orange-50 text-orange-700 px-2 py-0.5 rounded">
              {bills.length} bill{bills.length !== 1 ? 's' : ''} · {fmt(totalBills)}
            </span>
          )}
          {invoices.length > 0 && (
            <span className="text-[10px] font-semibold bg-green-50 text-green-700 px-2 py-0.5 rounded">
              {fmt(totalCollected)} collected / {fmt(totalInvoiced)} invoiced
            </span>
          )}
        </div>
        <span className="text-gray-400 text-sm">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="divide-y divide-gray-100">
          {bills.length > 0 && (
            <div>
              <p className="px-4 py-2 text-[10px] font-bold text-gray-500 uppercase tracking-wide bg-gray-50">
                Bills / Purchase Orders (Material Costs)
              </p>
              <table className="w-full">
                <thead className="border-b border-gray-100">
                  <tr>
                    {['Date', 'Vendor', 'Bill #', 'Total', 'Paid', 'Status'].map(h => (
                      <th
                        key={h}
                        className={`px-3 py-2 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wide ${h === 'Total' || h === 'Paid' ? 'text-right' : ''}`}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {bills.map(b => (
                    <tr key={b.id} className="hover:bg-gray-50">
                      <td className="px-3 py-2 text-sm text-gray-600">{b.date}</td>
                      <td className="px-3 py-2 text-sm font-medium text-gray-800">
                        {b.vendor_name}
                      </td>
                      <td className="px-3 py-2 text-sm text-gray-500">{b.number || '—'}</td>
                      <td className="px-3 py-2 text-sm text-right font-semibold">{fmt(b.total)}</td>
                      <td className="px-3 py-2 text-sm text-right text-green-700">
                        {fmt(b.amount_paid)}
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded capitalize ${
                            b.status === 'paid'
                              ? 'bg-green-100 text-green-700'
                              : b.status === 'open'
                                ? 'bg-yellow-50 text-yellow-700'
                                : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {b.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t border-gray-200 bg-gray-50 font-semibold">
                  <tr>
                    <td colSpan={3} className="px-3 py-2 text-sm text-gray-700">
                      Total Bills
                    </td>
                    <td className="px-3 py-2 text-sm text-right">{fmt(totalBills)}</td>
                    <td className="px-3 py-2 text-sm text-right text-green-700">
                      {fmt(bills.reduce((s, b) => s + nv(b.amount_paid), 0))}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          {invoices.length > 0 && (
            <div>
              <p className="px-4 py-2 text-[10px] font-bold text-gray-500 uppercase tracking-wide bg-gray-50">
                Invoices (Revenue)
              </p>
              <table className="w-full">
                <thead className="border-b border-gray-100">
                  <tr>
                    {['Date', 'Client', 'Invoice #', 'Total', 'Collected', 'Status'].map(h => (
                      <th
                        key={h}
                        className={`px-3 py-2 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wide ${h === 'Total' || h === 'Collected' ? 'text-right' : ''}`}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {invoices.map(inv => (
                    <tr key={inv.id} className="hover:bg-gray-50">
                      <td className="px-3 py-2 text-sm text-gray-600">{inv.date}</td>
                      <td className="px-3 py-2 text-sm font-medium text-gray-800">
                        {inv.client_name}
                      </td>
                      <td className="px-3 py-2 text-sm text-gray-500">{inv.number || '—'}</td>
                      <td className="px-3 py-2 text-sm text-right font-semibold">
                        {fmt(inv.total)}
                      </td>
                      <td className="px-3 py-2 text-sm text-right text-green-700">
                        {fmt(inv.amount_paid)}
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded capitalize ${
                            inv.status === 'paid'
                              ? 'bg-green-100 text-green-700'
                              : inv.status === 'sent'
                                ? 'bg-blue-50 text-blue-700'
                                : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {inv.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t border-gray-200 bg-gray-50 font-semibold">
                  <tr>
                    <td colSpan={3} className="px-3 py-2 text-sm text-gray-700">
                      Total Invoiced
                    </td>
                    <td className="px-3 py-2 text-sm text-right">{fmt(totalInvoiced)}</td>
                    <td className="px-3 py-2 text-sm text-right text-green-700">
                      {fmt(totalCollected)}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// By-Crew section
// ─────────────────────────────────────────────────────────────────────────────
// Actuals come from the engine here too — this panel derived them from the
// schedule at labor_rate_per_man_day, which disagreed with the summary bar and
// the breakdown table on both the man-day count and the rate.
function CrewSection({ crewLabel, workOrders, profitRows, isUnassigned }) {
  const [open, setOpen] = useState(true)

  const byModule = useMemo(() => {
    const m = new Map()
    for (const r of profitRows || []) m.set(r.id, r)
    return m
  }, [profitRows])

  const rows = workOrders.map(wo => {
    const pr = byModule.get(wo.estimate_module_id)
    const actMD = pr?.actualManDays ?? 0
    const estMD = nv(wo.man_days)
    const estMat = nv(wo.material_cost) + nv(wo.sub_cost)
    const estLab = nv(wo.labor_cost)
    const actLab = pr?.rlc ?? 0
    return { wo, estMD, actMD, estMat, estLab, actLab }
  })

  const totEstMD = rows.reduce((s, r) => s + r.estMD, 0)
  const totActMD = rows.reduce((s, r) => s + r.actMD, 0)
  const totEstLab = rows.reduce((s, r) => s + r.estLab, 0)
  const totActLab = rows.reduce((s, r) => s + r.actLab, 0)
  const totEstMat = rows.reduce((s, r) => s + r.estMat, 0)
  const mdDelta = totActMD - totEstMD
  const labDelta = totActLab - totEstLab

  const headerColor = isUnassigned ? 'border-amber-500 bg-amber-50' : 'border-green-700 bg-green-50'
  const labelColor = isUnassigned ? 'text-amber-700' : 'text-green-800'

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <button
        className={`w-full flex items-center justify-between px-4 py-2.5 border-b-2 ${headerColor}`}
        onClick={() => setOpen(v => !v)}
      >
        <div className="flex items-center gap-3">
          <span className={`text-sm font-bold ${labelColor}`}>
            {isUnassigned ? '⚠ Unassigned' : `👷 Crew ${crewLabel}`}
          </span>
          <span className="text-[10px] text-gray-500">
            {workOrders.length} module{workOrders.length !== 1 ? 's' : ''}
          </span>
          {totEstMD > 0 && (
            <span className="text-[10px] font-semibold bg-white/60 text-gray-700 px-2 py-0.5 rounded">
              Est {fmtD(totEstMD)}
              {totActMD > 0 && <span className="text-blue-700"> · Act {fmtD(totActMD)}</span>}
            </span>
          )}
          {mdDelta !== 0 && totActMD > 0 && (
            <span
              className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${mdDelta > 0 ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-700'}`}
            >
              {mdDelta > 0 ? '▲' : '▼'} {fmtD(Math.abs(mdDelta))}
            </span>
          )}
        </div>
        <span className="text-gray-400">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px]">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {[
                    'Module',
                    'Crew Type',
                    'Est MD',
                    'Act MD',
                    'Δ MD',
                    'Est Labor',
                    'Act Labor',
                    'Est Mat',
                  ].map(h => (
                    <th
                      key={h}
                      className={`px-3 py-2 text-[10px] font-bold text-gray-500 uppercase tracking-wide ${['Est MD', 'Act MD', 'Δ MD', 'Est Labor', 'Act Labor', 'Est Mat'].includes(h) ? 'text-right' : 'text-left'}`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {rows.map(({ wo, estMD, actMD, estMat, estLab, actLab }) => {
                  const mdD = actMD - estMD
                  return (
                    <tr key={wo.id} className="hover:bg-gray-50">
                      <td className="px-3 py-2 text-sm">
                        <span className="font-semibold text-gray-900">{wo.module_type}</span>
                        {wo.project_name && (
                          <span className="text-gray-400 text-xs ml-1">· {wo.project_name}</span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <span className="text-xs bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded font-medium">
                          {wo.crew_type || '—'}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-sm text-right font-mono">
                        {estMD > 0 ? fmtD(estMD) : '—'}
                      </td>
                      <td
                        className={`px-3 py-2 text-sm text-right font-mono ${actMD > 0 ? 'text-blue-700 font-semibold' : 'text-gray-400'}`}
                      >
                        {actMD > 0 ? fmtD(actMD) : '—'}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {(estMD > 0 || actMD > 0) && (
                          <span
                            className={`text-[11px] font-semibold ${mdD === 0 ? 'text-gray-400' : mdD > 0 ? 'text-red-500' : 'text-green-600'}`}
                          >
                            {mdD > 0 ? '+' : ''}
                            {fmtD(mdD)}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-sm text-right">
                        {estLab > 0 ? fmt(estLab) : '—'}
                      </td>
                      <td
                        className={`px-3 py-2 text-sm text-right ${actLab > 0 ? 'text-blue-700 font-semibold' : 'text-gray-400'}`}
                      >
                        {actLab > 0 ? fmt(actLab) : '—'}
                      </td>
                      <td className="px-3 py-2 text-sm text-right">
                        {estMat > 0 ? fmt(estMat) : '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot className="bg-gray-50 border-t-2 border-gray-200 font-semibold">
                <tr>
                  <td colSpan={2} className="px-3 py-2 text-sm font-bold text-gray-800">
                    Crew Total
                  </td>
                  <td className="px-3 py-2 text-sm text-right font-mono">{fmtD(totEstMD)}</td>
                  <td className="px-3 py-2 text-sm text-right font-mono text-blue-700">
                    {totActMD > 0 ? fmtD(totActMD) : '—'}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {totActMD > 0 && <DeltaBadge est={totEstMD} act={totActMD} inverse />}
                  </td>
                  <td className="px-3 py-2 text-sm text-right">{fmt(totEstLab)}</td>
                  <td
                    className={`px-3 py-2 text-sm text-right ${totActLab > 0 ? 'text-blue-700' : 'text-gray-400'}`}
                  >
                    {totActLab > 0 ? fmt(totActLab) : '—'}
                  </td>
                  <td className="px-3 py-2 text-sm text-right">{fmt(totEstMat)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* GP mini-card for this crew */}
          {totEstMD > 0 && (
            <div className="px-4 py-3 border-t border-gray-100 bg-gray-50 flex flex-wrap gap-4">
              <div>
                <p className="text-[10px] text-gray-400 uppercase tracking-wide">Est Labor Cost</p>
                <p className="text-sm font-bold text-gray-800">{fmt(totEstLab)}</p>
              </div>
              {totActLab > 0 && (
                <div>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wide">
                    Act Labor Cost
                  </p>
                  <p className="text-sm font-bold text-blue-700">{fmt(totActLab)}</p>
                </div>
              )}
              {totActLab > 0 && (
                <div>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wide">Labor Δ</p>
                  <p
                    className={`text-sm font-bold ${labDelta === 0 ? 'text-gray-400' : labDelta > 0 ? 'text-red-600' : 'text-green-600'}`}
                  >
                    {labDelta > 0 ? '+' : ''}
                    {fmt(labDelta)}
                  </p>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────
export default function JobComparison({ job }) {
  // Four sections instead of the old Overall / By Crew pair. Progress is the
  // working surface; the rest are reference. weekOf lives here rather than in
  // the grid so the picker can share a row with the section toggles and stay
  // put when another section is showing.
  const jobStart = job?.sold_date || job?.projected_start || job?.actual_start || job?.created_at
  const [section, setSection] = useState('progress')
  const [weekOf, setWeekOf] = useState(new Date().toISOString().slice(0, 10))
  const [workOrders, setWorkOrders] = useState([])
  const [scheduleItems, setScheduleItems] = useState([])
  const [timeEntries, setTimeEntries] = useState([])
  const [bills, setBills] = useState([])
  const [invoices, setInvoices] = useState([])
  const [crewMap, setCrewMap] = useState({})
  const [laborRate, setLaborRate] = useState(400)
  // Gross profit produced needs the estimate baseline, the PM's completion
  // readings, and the burdened hourly rate — none of which this page read before.
  const [estModules, setEstModules] = useState([])
  const [completions, setCompletions] = useState([])
  const [settings, setSettings] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (job?.id) fetchAll()
  }, [job?.id])

  async function fetchAll() {
    setLoading(true)
    const [woRes, siRes, teRes, billRes, invRes, crewRes, settingsRes, projRes, compRes] =
      await Promise.all([
        supabase.from('work_orders').select('*').eq('job_id', job.id).order('module_type'),
        supabase.from('schedule_items').select('*').eq('job_id', job.id).order('start_date'),
        supabase
          .from('time_entries')
          .select('*')
          .eq('job_id', job.id)
          .order('date')
          .order('time_in'),
        supabase
          .from('acct_bills')
          .select('*')
          .eq('job_id', job.id)
          .order('date', { ascending: false }),
        supabase
          .from('acct_invoices')
          .select('*')
          .eq('job_id', job.id)
          .order('date', { ascending: false }),
        supabase.from('crews').select('*').order('label'),
        supabase.from('company_settings').select('*').maybeSingle(),
        job.estimate_id
          ? supabase
              .from('estimate_projects')
              .select('id, project_name, material_gp_markup_rate, estimate_modules ( * )')
              .eq('estimate_id', job.estimate_id)
          : Promise.resolve({ data: [] }),
        supabase.from('module_completion').select('*').eq('job_id', job.id),
      ])

    setWorkOrders(woRes.data || [])
    setScheduleItems(siRes.data || [])
    setTimeEntries(teRes.data || [])
    setBills(billRes.data || [])
    setInvoices(invRes.data || [])
    setCrewMap(Object.fromEntries((crewRes.data || []).map(c => [c.id, c])))
    if (settingsRes.data?.labor_rate_per_man_day) {
      setLaborRate(parseFloat(settingsRes.data.labor_rate_per_man_day) || 400)
    }
    setSettings(settingsRes.data || null)
    const flatModules = []
    for (const p of projRes.data || []) {
      for (const m of p.estimate_modules || []) {
        flatModules.push({
          ...m,
          project_name: p.project_name,
          material_gp_markup_rate: p.material_gp_markup_rate,
        })
      }
    }
    setEstModules(flatModules)
    setCompletions(compRes.data || [])
    setLoading(false)
  }

  // ─── Derived calculations ──────────────────────────────────────────────────
  const calcs = useMemo(() => {
    // ESTIMATED (from work_orders)
    const crewWOs = workOrders.filter(w => !w.is_subcontractor)
    const subWOs = workOrders.filter(w => w.is_subcontractor)

    const estManDays = crewWOs.reduce((s, w) => s + nv(w.man_days), 0)
    const estLaborCost = crewWOs.reduce((s, w) => s + nv(w.labor_cost), 0)
    const estMaterialCost = crewWOs.reduce((s, w) => s + nv(w.material_cost), 0)
    const estSubCost = subWOs.reduce((s, w) => s + nv(w.sub_cost), 0)
    const estRevenue =
      nv(job?.total_price || job?.contract_price) ||
      workOrders.reduce((s, w) => s + nv(w.total_price), 0)
    const estTotalCost = estLaborCost + estMaterialCost + estSubCost
    const estGP = estRevenue - estTotalCost
    const estGPPct = estRevenue > 0 ? (estGP / estRevenue) * 100 : 0

    // ACTUAL — scheduled man days (from schedule_items × crew sizes)
    const scheduledManDays = scheduleItems.reduce((s, it) => {
      return s + nv(it.work_days) * crewSizeOf(crewMap[it.crew_id])
    }, 0)

    // ACTUAL — payroll hours (from time_entries)
    // Same engine call as the panel and the bar — see PayrollPanel for why this
    // is not computed locally.
    const clocked = splitHours(timeEntries)
    const payrollHours = clocked.total
    const standardHours = clocked.standard
    const overtimeHours = clocked.overtime
    const overtimeManDays = overtimeHours / 8
    const actManDays = scheduledManDays + overtimeManDays

    // ACTUAL — costs
    const actMaterialCost = bills.reduce((s, b) => s + nv(b.total), 0)
    const actLaborCost = actManDays * laborRate
    const actRevenue =
      invoices.length > 0 ? invoices.reduce((s, i) => s + nv(i.amount_paid), 0) : estRevenue // fall back to contract price if no invoices yet

    return {
      estManDays,
      estLaborCost,
      estMaterialCost,
      estSubCost,
      estRevenue,
      estTotalCost,
      estGP,
      estGPPct,
      scheduledManDays,
      payrollHours,
      standardHours,
      overtimeHours,
      overtimeManDays,
      actManDays,
      actMaterialCost,
      actLaborCost,
      actRevenue,
    }
  }, [workOrders, scheduleItems, timeEntries, bills, invoices, crewMap, laborRate, job])

  // ─── Gross profit produced ────────────────────────────────────────────────
  // Deliberately NOT revenue − cost. That formula booked the entire unspent
  // material budget as profit whenever bills had not landed yet, which on a
  // typical job overstated gross profit by tens of thousands. Profit is now
  // what the finished work is worth, less what it cost extra to get there:
  //   GLPA = (CP × GLPE) − (RLC − CP × ELC_total)
  // computed by the same engine the unit tests cover.
  const rates = useMemo(() => resolveRates(settings), [settings])
  const attribution = useMemo(
    () =>
      attributeHoursByModule({
        timeEntries,
        scheduleItems,
        workOrders,
        crews: Object.values(crewMap),
      }),
    [timeEntries, scheduleItems, workOrders, crewMap]
  )
  const profit = useMemo(
    () =>
      rates
        ? jobProfitAsOf({
            modules: estModules,
            completions,
            timeEntries,
            rates,
            attribution,
          })
        : null,
    [estModules, completions, timeEntries, rates, attribution]
  )
  // Profit banked at the end of each day of the shown week, from the same engine
  // as the summary bar. The grid used to compute this itself as completion x
  // estimate, which is what the work is WORTH — the bar reports what was
  // PRODUCED, that figure less the labour cost variance. On Test Tester1 the two
  // differed by exactly the $1,763 the crew came in under budget.
  const weekSeries = useMemo(
    () =>
      rates
        ? dailySeries({
            modules: estModules,
            completions,
            timeEntries,
            rates,
            dates: weekDates(weekOf),
          })
        : [],
    [estModules, completions, timeEntries, rates, weekOf]
  )

  // A sub revising their own quote, outside of any change order. Positive means
  // the sub now costs MORE, which comes straight off subcontractor gross profit
  // — the sale price does not move, so the difference is profit either way.
  const subCostChange = nv(job?.sub_cost_change)
  async function saveSubCostChange(next) {
    const { error } = await supabase.from('jobs').update({ sub_cost_change: next }).eq('id', job.id)
    if (!error) {
      job.sub_cost_change = next // the row is owned by the parent list
      fetchAll()
    }
  }

  const materialGp = useMemo(
    () =>
      estModules.reduce((sum, m) => sum + nv(m.material_cost) * nv(m.material_gp_markup_rate), 0),
    [estModules]
  )
  const glpmde = useMemo(() => {
    const emd = estModules.reduce((s, m) => s + nv(m.man_days), 0)
    return profit && emd > 0 ? profit.glpeTotal / emd : null
  }, [estModules, profit])

  // ─── By-crew grouping ──────────────────────────────────────────────────────
  const crewGroups = useMemo(() => {
    const groups = {}
    for (const wo of workOrders) {
      const key = wo.scheduled_crew_id || '__unassigned__'
      if (!groups[key]) groups[key] = []
      groups[key].push(wo)
    }
    return groups
  }, [workOrders])

  // ──────────────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-700" />
      </div>
    )
  }

  if (workOrders.length === 0 && scheduleItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center text-gray-400">
        <p className="text-4xl mb-3">📊</p>
        <p className="text-sm font-medium text-gray-600 mb-1">No data yet for this job</p>
        <p className="text-xs text-gray-400">
          Add work orders, schedule items, and time entries to see the comparison.
        </p>
      </div>
    )
  }

  const c = calcs

  return (
    <div className="flex flex-col h-full">
      {/* The summary bar is always on; the four sections below it swap. */}
      {/* Frozen: the summary bar and the section chooser stay put while the
          section below them scrolls. */}
      <div className="flex-shrink-0 space-y-3 mt-4">
        {/* Summary bar — estimated and actual as separate cards, so a
                column heading says what the figure IS and the card says which
                side of the comparison it sits on. */}
        <div className="flex flex-col lg:flex-row gap-3 items-stretch">
          <Group
            title="In House Labor Estimated"
            grow="lg:flex-[8_1_0%]"
            accent={{ text: 'text-blue-700', border: 'border-blue-400/70' }}
          >
            <Single label="Man Days" value={c.estManDays} />
            <Single label="Labor Cost" value={c.estLaborCost} currency />
            <Single
              label="Gross Profit"
              value={profit ? profit.glpeTotal : 0}
              currency
              unknown={!profit}
              unknownNote={RATE_NOTE}
            />
            <Single
              label="GLPMD"
              value={glpmde || 0}
              currency
              unknown={glpmde == null}
              unknownNote="No estimated man days on this job."
            />
          </Group>

          <Group
            title="In House Labor Actual"
            grow="lg:flex-[8_1_0%]"
            accent={{ text: 'text-blue-700', border: 'border-blue-400/70' }}
          >
            {/* Each actual is coloured against what is DUE at the job's
                    current completion, not against the whole estimate — a job
                    half done has spent half its budget by design. */}
            <Single
              label="Man Days"
              value={profit ? profit.actualManDays : c.actManDays}
              tone={toneFor(
                profit ? profit.actualManDays : c.actManDays,
                profit ? c.estManDays * profit.jobCompletion : null,
                true
              )}
            />
            <Single
              label="Labor Cost"
              value={profit ? profit.rlc : c.actLaborCost}
              currency
              unknown={!profit}
              unknownNote={RATE_NOTE}
              tone={toneFor(profit?.rlc, profit?.elcToDate, true)}
            />
            <Single
              label="Gross Profit"
              value={profit ? profit.glpa : 0}
              currency
              unknown={!profit}
              unknownNote={RATE_NOTE}
              tone={toneFor(profit?.glpa, profit?.earned, false)}
            />
            <Single
              label="GLPMD"
              value={profit?.glpmda || 0}
              currency
              unknown={!profit || profit.glpmda == null}
              unknownNote="No hours clocked yet, so there is no produced rate to show."
              tone={toneFor(profit?.glpmda, glpmde, false)}
            />
          </Group>

          <Group
            title="Subcontractors"
            grow="lg:flex-[5_1_0%]"
            accent={{ text: 'text-orange-600', border: 'border-orange-400/70' }}
          >
            <EditableSingle
              label="Cost Change +/-"
              value={subCostChange}
              onSave={saveSubCostChange}
              tone={
                subCostChange > 0
                  ? 'text-red-400'
                  : subCostChange < 0
                    ? 'text-green-400'
                    : 'text-gray-500'
              }
              hint="The sub revised their quote outside of a change order. Positive costs more and reduces gross profit."
            />
            {/* EARNED to date, not the contracted total — every other figure on
                this page counts what has actually been produced, and a job whose
                sub-carrying modules are untouched has earned none of it. Test
                Active1 read $1,186 here against $0 in the progress grid. */}
            <Single
              label="Gross Profit"
              value={(profit ? profit.subEarned : 0) - subCostChange}
              currency
              tone="text-green-400"
            />
          </Group>

          <Group
            title="Materials"
            grow="lg:flex-[7_1_0%]"
            accent={{ text: 'text-amber-600', border: 'border-amber-400/70' }}
          >
            <Single label="Estimated Cost" value={c.estMaterialCost} currency />
            <Single
              label="Actual Cost"
              value={c.actMaterialCost}
              currency
              unknown={bills.length === 0}
              unknownNote="No vendor bills or card charges are linked to this job yet."
            />
            <Single
              label="Gross Profit"
              value={materialGp}
              currency
              tone={materialGp > 0 ? 'text-green-400' : 'text-gray-500'}
            />
          </Group>
        </div>

        {/* One row: the week chooser where it is useful, the section chooser
              always. The picker only governs Progress, so it is hidden for the
              reference sections rather than sitting there doing nothing. */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="min-h-[34px] flex items-center">
            {section === 'progress' ? (
              <WeekPicker
                weekOf={weekOf}
                setWeekOf={setWeekOf}
                jobStartDate={jobStart}
                completions={completions}
              />
            ) : null}
          </div>
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            {[
              { key: 'progress', label: '📈 Progress' },
              { key: 'crew', label: '👷 Crew' },
              { key: 'payroll', label: '⏱ Payroll' },
              { key: 'breakdown', label: '📋 Breakdown' },
            ].map(t => (
              <button
                key={t.key}
                onClick={() => setSection(t.key)}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  section === t.key
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* The scrolling half — one section at a time. */}
      <div className="flex-1 min-h-0 overflow-y-auto space-y-4 mt-3 pb-4">
        {/* ── PROGRESS — the PM's daily completion entry, the one human input
              the profit figures above depend on. The timeclock says what was
              spent; only a person can say what was finished. */}
        {section === 'progress' && (
          <ModuleCompletionGrid
            jobId={job.id}
            modules={estModules}
            completions={completions}
            rows={profit?.rows || []}
            onChange={setCompletions}
            weekOf={weekOf}
            series={weekSeries}
            jobStartDate={jobStart}
          />
        )}

        {/* ── PAYROLL ── */}
        {section === 'payroll' && c.payrollHours > 0 && (
          <div className="flex flex-wrap gap-3 px-4 py-2.5 bg-blue-50 rounded-xl border border-blue-100 text-sm">
            <span className="text-blue-700 font-semibold">⏱ Payroll:</span>
            <span className="text-gray-700">
              {c.payrollHours.toFixed(1)}h clocked · {(c.payrollHours / 8).toFixed(2)} MD
            </span>
            <span className="text-gray-400">·</span>
            {/* "standard" is the non-overtime half of what was CLOCKED. It used
                to show scheduled hours, which is a different quantity entirely. */}
            <span className="text-gray-700">{c.standardHours.toFixed(1)}h standard</span>
            {c.overtimeHours > 0.1 && (
              <>
                <span className="text-gray-400">·</span>
                <span className="text-red-600 font-semibold">
                  +{c.overtimeHours.toFixed(1)}h overtime ({c.overtimeManDays.toFixed(2)} MD added)
                </span>
              </>
            )}
          </div>
        )}

        {section === 'payroll' && (
          <PayrollPanel timeEntries={timeEntries} scheduledManDays={c.scheduledManDays} />
        )}

        {/* ── BREAKDOWN — the module table and the accounting detail ── */}
        {section === 'breakdown' && workOrders.length > 0 && (
          <ModuleTable
            workOrders={workOrders}
            crewMap={crewMap}
            profitRows={profit?.rows || []}
          />
        )}
        {section === 'breakdown' && <AccountingPanel bills={bills} invoices={invoices} />}

        {/* ── CREW ── */}
        {section === 'crew' && (
          <div className="space-y-3">
            {Object.entries(crewGroups)
              .filter(([key]) => key !== '__unassigned__')
              .map(([crewId, wos]) => {
                const crew = crewMap[crewId]
                return (
                  <CrewSection
                    key={crewId}
                    crewLabel={crew?.label || crewId.slice(0, 8)}
                    crewColor={crew?.color}
                    workOrders={wos}
                    profitRows={profit?.rows || []}
                  />
                )
              })}

            {crewGroups['__unassigned__']?.length > 0 && (
              <CrewSection
                key="__unassigned__"
                crewLabel="Unassigned"
                workOrders={crewGroups['__unassigned__']}
                profitRows={profit?.rows || []}
                isUnassigned
              />
            )}

            {Object.keys(crewGroups).length === 0 && (
              <div className="text-center py-12 text-gray-400">
                <p className="text-3xl mb-2">👷</p>
                <p className="text-sm">No work orders with crew assignments yet.</p>
                <p className="text-xs mt-1">Assign crews via the Schedule tab.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
