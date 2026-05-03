import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../lib/supabase'

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
const fmt  = n => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n || 0)
const fmtD = n => { const v = parseFloat(n || 0); return `${v % 1 === 0 ? v.toFixed(0) : v.toFixed(1)} MD` }
const fmtH = n => `${parseFloat(n || 0).toFixed(1)}h`
const nv   = v => parseFloat(v || 0)

function diffMins(timeIn, timeOut) {
  if (!timeIn || !timeOut) return 0
  const [ih, im] = timeIn.split(':').map(Number)
  const [oh, om] = timeOut.split(':').map(Number)
  return Math.max(0, (oh * 60 + om) - (ih * 60 + im))
}

function crewSizeOf(crew) {
  if (!crew) return 3
  const n = ['crew_chief_id', 'journeyman_id', 'laborer_1_id', 'laborer_2_id', 'laborer_3_id']
    .filter(k => crew[k]).length
  return n > 0 ? n : 3
}

function DeltaBadge({ est, act, currency = false, inverse = false }) {
  if (est == null || act == null) return null
  const delta = act - est
  const pct   = est !== 0 ? (delta / Math.abs(est)) * 100 : null
  const over  = inverse ? delta < 0 : delta > 0
  const color = delta === 0 ? 'text-gray-400' : over ? 'text-red-600' : 'text-green-600'
  const arrow = delta === 0 ? '—' : delta > 0 ? '▲' : '▼'
  return (
    <span className={`text-[11px] font-semibold ${color}`}>
      {arrow} {currency ? fmt(Math.abs(delta)) : fmtD(Math.abs(delta))}
      {pct != null && <span className="ml-0.5 font-normal opacity-70">({Math.abs(pct).toFixed(0)}%)</span>}
    </span>
  )
}

function KpiCard({ label, est, act, currency = false, inverse = false, sub }) {
  const delta = act - est
  const over  = inverse ? delta < 0 : delta > 0
  const deltaColor = delta === 0 ? 'text-gray-400'
    : over ? 'text-red-600 bg-red-50' : 'text-green-700 bg-green-50'
  const display = v => currency ? fmt(v) : fmtD(v)
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col gap-1">
      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">{label}</span>
      <div className="flex items-start justify-between gap-2 mt-1">
        <div>
          <p className="text-[10px] text-gray-400">Estimated</p>
          <p className="text-lg font-bold text-gray-800">{display(est)}</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-gray-400">Actual</p>
          <p className="text-lg font-bold text-gray-900">{display(act)}</p>
          {delta !== 0 && (
            <div className={`inline-block text-[11px] font-semibold px-2 py-0.5 rounded mt-1 ${deltaColor}`}>
              {delta > 0 ? '▲' : '▼'} {display(Math.abs(delta))} {over ? '(over)' : '(under)'}
            </div>
          )}
        </div>
      </div>
      {sub && <p className="text-[10px] text-gray-400 mt-0.5">{sub}</p>}
    </div>
  )
}

function GpCard({ estGP, actGP, estPct, actPct }) {
  const delta = actGP - estGP
  const color = actGP > estGP ? 'text-green-700' : actGP < estGP ? 'text-red-600' : 'text-gray-500'
  const trend = actGP > estGP ? '📈' : actGP < estGP ? '📉' : '➡️'
  return (
    <div className="bg-white rounded-xl border-2 border-green-700 p-4 flex flex-col gap-1">
      <span className="text-[10px] font-bold text-green-700 uppercase tracking-wide">Gross Profit {trend}</span>
      <div className="flex items-start justify-between gap-2 mt-1">
        <div>
          <p className="text-[10px] text-gray-400">Estimated</p>
          <p className="text-lg font-bold text-gray-800">{fmt(estGP)}</p>
          <p className="text-[10px] text-gray-400">{estPct.toFixed(1)}% margin</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-gray-400">Actual</p>
          <p className={`text-lg font-bold ${color}`}>{fmt(actGP)}</p>
          <p className="text-[10px] text-gray-400">{actPct.toFixed(1)}% margin</p>
          {delta !== 0 && (
            <div className={`inline-block text-[11px] font-semibold px-2 py-0.5 rounded mt-1 ${delta > 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
              {delta > 0 ? '▲' : '▼'} {fmt(Math.abs(delta))} {delta > 0 ? 'above' : 'below'}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Module breakdown table — one row per work order
// ─────────────────────────────────────────────────────────────────────────────
function ModuleTable({ workOrders, scheduleItems, crewMap, laborRate }) {
  const siByWO = useMemo(() => {
    const m = {}
    for (const item of scheduleItems) {
      for (const woId of (item.work_order_ids || [])) {
        if (!m[woId]) m[woId] = []
        m[woId].push(item)
      }
    }
    return m
  }, [scheduleItems])

  const rows = workOrders.map(wo => {
    const items  = siByWO[wo.id] || []
    const actMD  = items.reduce((s, it) => s + nv(it.work_days) * crewSizeOf(crewMap[it.crew_id]), 0)
    const estMD  = nv(wo.man_days)
    const estMat = nv(wo.material_cost) + nv(wo.sub_cost)
    const estLab = nv(wo.labor_cost)
    const actLab = actMD * laborRate
    const crew   = wo.scheduled_crew_id ? crewMap[wo.scheduled_crew_id] : null
    return { wo, estMD, actMD, estMat, estLab, actLab, crew }
  })

  const totEstMD  = rows.reduce((s, r) => s + r.estMD, 0)
  const totActMD  = rows.reduce((s, r) => s + r.actMD, 0)
  const totEstMat = rows.reduce((s, r) => s + r.estMat, 0)
  const totEstLab = rows.reduce((s, r) => s + r.estLab, 0)
  const totActLab = rows.reduce((s, r) => s + r.actLab, 0)

  const thCls = 'px-3 py-2 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wide'
  const tdCls = 'px-3 py-2 text-sm text-gray-700'

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-4 py-2.5 border-b border-gray-100 bg-gray-50">
        <span className="text-xs font-bold text-gray-700 uppercase tracking-wide">Module Breakdown</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[700px]">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className={thCls}>Module</th>
              <th className={thCls}>Crew Type</th>
              <th className={`${thCls} text-right`}>Est MD</th>
              <th className={`${thCls} text-right`}>Sched MD</th>
              <th className={`${thCls} text-right`}>Δ MD</th>
              <th className={`${thCls} text-right`}>Est Labor</th>
              <th className={`${thCls} text-right`}>Act Labor</th>
              <th className={`${thCls} text-right`}>Est Mat</th>
              <th className={thCls}>Assigned Crew</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {rows.map(({ wo, estMD, actMD, estMat, estLab, actLab, crew }) => {
              const mdDelta = actMD - estMD
              return (
                <tr key={wo.id} className="hover:bg-gray-50">
                  <td className={tdCls}>
                    <span className="font-semibold text-gray-900">{wo.module_type}</span>
                    {wo.project_name && <span className="text-gray-400 text-xs ml-1">· {wo.project_name}</span>}
                    {wo.is_subcontractor && <span className="ml-1 text-[9px] font-bold bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">SUB</span>}
                  </td>
                  <td className={tdCls}>
                    <span className="text-xs bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded font-medium">
                      {wo.crew_type || '—'}
                    </span>
                  </td>
                  <td className={`${tdCls} text-right font-mono`}>{estMD > 0 ? fmtD(estMD) : '—'}</td>
                  <td className={`${tdCls} text-right font-mono ${actMD > 0 ? 'text-blue-700 font-semibold' : 'text-gray-400'}`}>
                    {actMD > 0 ? fmtD(actMD) : '—'}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {(estMD > 0 || actMD > 0) && (
                      <span className={`text-[11px] font-semibold ${mdDelta === 0 ? 'text-gray-400' : mdDelta > 0 ? 'text-red-500' : 'text-green-600'}`}>
                        {mdDelta > 0 ? '+' : ''}{fmtD(mdDelta)}
                      </span>
                    )}
                  </td>
                  <td className={`${tdCls} text-right`}>{estLab > 0 ? fmt(estLab) : '—'}</td>
                  <td className={`${tdCls} text-right ${actLab > 0 ? 'font-semibold text-blue-700' : 'text-gray-400'}`}>
                    {actLab > 0 ? fmt(actLab) : '—'}
                  </td>
                  <td className={`${tdCls} text-right`}>{estMat > 0 ? fmt(estMat) : '—'}</td>
                  <td className="px-3 py-2">
                    {crew ? (
                      <span className="text-[10px] font-bold bg-green-100 text-green-800 px-1.5 py-0.5 rounded">
                        👷 Crew {crew.label}
                      </span>
                    ) : wo.scheduled_crew_id ? (
                      <span className="text-[10px] text-gray-400">Loading…</span>
                    ) : (
                      <span className="text-[10px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">⚠ Unassigned</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
          <tfoot className="bg-gray-50 border-t-2 border-gray-200 font-semibold">
            <tr>
              <td className="px-3 py-2 text-sm font-bold text-gray-800" colSpan={2}>Totals</td>
              <td className="px-3 py-2 text-sm text-right font-mono">{fmtD(totEstMD)}</td>
              <td className="px-3 py-2 text-sm text-right font-mono text-blue-700">{totActMD > 0 ? fmtD(totActMD) : '—'}</td>
              <td className="px-3 py-2 text-right">
                <DeltaBadge est={totEstMD} act={totActMD} inverse />
              </td>
              <td className="px-3 py-2 text-sm text-right">{fmt(totEstLab)}</td>
              <td className="px-3 py-2 text-sm text-right text-blue-700">{totActLab > 0 ? fmt(totActLab) : '—'}</td>
              <td className="px-3 py-2 text-sm text-right">{fmt(totEstMat)}</td>
              <td />
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
  const totalPayrollMins = timeEntries.reduce((s, e) => s + diffMins(e.time_in, e.time_out), 0)
  const totalPayrollHrs  = totalPayrollMins / 60
  const standardHrs      = scheduledManDays * 8
  const overtimeHrs      = Math.max(0, totalPayrollHrs - standardHrs)
  const overtimeMD       = overtimeHrs / 8

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-4 py-2.5 bg-gray-50 border-b border-gray-100"
        onClick={() => setOpen(v => !v)}
      >
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-gray-700 uppercase tracking-wide">Payroll Records</span>
          <span className="text-[10px] font-semibold bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
            {fmtH(totalPayrollHrs)} total
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
                <th className="px-3 py-2 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wide">Date</th>
                <th className="px-3 py-2 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wide">Employee</th>
                <th className="px-3 py-2 text-right text-[10px] font-bold text-gray-500 uppercase tracking-wide">Time In</th>
                <th className="px-3 py-2 text-right text-[10px] font-bold text-gray-500 uppercase tracking-wide">Time Out</th>
                <th className="px-3 py-2 text-right text-[10px] font-bold text-gray-500 uppercase tracking-wide">Hours</th>
                <th className="px-3 py-2 text-right text-[10px] font-bold text-gray-500 uppercase tracking-wide">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {Object.entries(byDate).sort(([a], [b]) => a.localeCompare(b)).flatMap(([date, entries]) => {
                const dateTotalMins = entries.reduce((s, e) => s + diffMins(e.time_in, e.time_out), 0)
                const dateStdMins   = 8 * 60 * entries.length // standard 8h per person
                const dateOT        = Math.max(0, dateTotalMins - dateStdMins)
                return entries.map((e, i) => {
                  const mins = diffMins(e.time_in, e.time_out)
                  const isOT = i === 0 && dateOT > 0
                  return (
                    <tr key={e.id} className={`hover:bg-gray-50 ${isOT ? 'bg-red-50/30' : ''}`}>
                      <td className="px-3 py-2 text-sm text-gray-700">
                        {i === 0 ? (
                          <span className="font-semibold">
                            {new Date(date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', weekday: 'short' })}
                          </span>
                        ) : ''}
                      </td>
                      <td className="px-3 py-2 text-sm text-gray-700">{e.employee_name}</td>
                      <td className="px-3 py-2 text-sm text-right font-mono text-gray-600">{e.time_in || '—'}</td>
                      <td className="px-3 py-2 text-sm text-right font-mono text-gray-600">{e.time_out || '—'}</td>
                      <td className="px-3 py-2 text-sm text-right font-mono">
                        {e.time_out ? fmtH(mins / 60) : <span className="text-amber-500 text-xs">Active</span>}
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
                <td colSpan={4} className="px-3 py-2 text-xs font-bold text-gray-700">Total Payroll Hours</td>
                <td className="px-3 py-2 text-sm font-bold text-right font-mono text-blue-700">{fmtH(totalPayrollHrs)}</td>
                <td className="px-3 py-2 text-right">
                  {overtimeHrs > 0.1 && (
                    <span className="text-[10px] font-bold text-red-600">+{fmtD(overtimeMD)} OT</span>
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

  const totalBills    = bills.reduce((s, b) => s + nv(b.total), 0)
  const totalInvoiced = invoices.reduce((s, i) => s + nv(i.total), 0)
  const totalCollected= invoices.reduce((s, i) => s + nv(i.amount_paid), 0)

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-4 py-2.5 bg-gray-50 border-b border-gray-100"
        onClick={() => setOpen(v => !v)}
      >
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-gray-700 uppercase tracking-wide">Accounting Records</span>
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
                      <th key={h} className={`px-3 py-2 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wide ${h === 'Total' || h === 'Paid' ? 'text-right' : ''}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {bills.map(b => (
                    <tr key={b.id} className="hover:bg-gray-50">
                      <td className="px-3 py-2 text-sm text-gray-600">{b.date}</td>
                      <td className="px-3 py-2 text-sm font-medium text-gray-800">{b.vendor_name}</td>
                      <td className="px-3 py-2 text-sm text-gray-500">{b.number || '—'}</td>
                      <td className="px-3 py-2 text-sm text-right font-semibold">{fmt(b.total)}</td>
                      <td className="px-3 py-2 text-sm text-right text-green-700">{fmt(b.amount_paid)}</td>
                      <td className="px-3 py-2">
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded capitalize ${
                          b.status === 'paid' ? 'bg-green-100 text-green-700'
                          : b.status === 'open' ? 'bg-yellow-50 text-yellow-700'
                          : 'bg-gray-100 text-gray-600'
                        }`}>{b.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t border-gray-200 bg-gray-50 font-semibold">
                  <tr>
                    <td colSpan={3} className="px-3 py-2 text-sm text-gray-700">Total Bills</td>
                    <td className="px-3 py-2 text-sm text-right">{fmt(totalBills)}</td>
                    <td className="px-3 py-2 text-sm text-right text-green-700">{fmt(bills.reduce((s,b)=>s+nv(b.amount_paid),0))}</td>
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
                      <th key={h} className={`px-3 py-2 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wide ${h === 'Total' || h === 'Collected' ? 'text-right' : ''}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {invoices.map(inv => (
                    <tr key={inv.id} className="hover:bg-gray-50">
                      <td className="px-3 py-2 text-sm text-gray-600">{inv.date}</td>
                      <td className="px-3 py-2 text-sm font-medium text-gray-800">{inv.client_name}</td>
                      <td className="px-3 py-2 text-sm text-gray-500">{inv.number || '—'}</td>
                      <td className="px-3 py-2 text-sm text-right font-semibold">{fmt(inv.total)}</td>
                      <td className="px-3 py-2 text-sm text-right text-green-700">{fmt(inv.amount_paid)}</td>
                      <td className="px-3 py-2">
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded capitalize ${
                          inv.status === 'paid' ? 'bg-green-100 text-green-700'
                          : inv.status === 'sent' ? 'bg-blue-50 text-blue-700'
                          : 'bg-gray-100 text-gray-600'
                        }`}>{inv.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t border-gray-200 bg-gray-50 font-semibold">
                  <tr>
                    <td colSpan={3} className="px-3 py-2 text-sm text-gray-700">Total Invoiced</td>
                    <td className="px-3 py-2 text-sm text-right">{fmt(totalInvoiced)}</td>
                    <td className="px-3 py-2 text-sm text-right text-green-700">{fmt(totalCollected)}</td>
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
function CrewSection({ crewLabel, crewColor, workOrders, scheduleItems, crewMap, laborRate, isUnassigned }) {
  const [open, setOpen] = useState(true)

  const siByWO = useMemo(() => {
    const m = {}
    for (const item of scheduleItems) {
      for (const woId of (item.work_order_ids || [])) {
        if (!m[woId]) m[woId] = []
        m[woId].push(item)
      }
    }
    return m
  }, [scheduleItems])

  const rows = workOrders.map(wo => {
    const items  = siByWO[wo.id] || []
    const actMD  = items.reduce((s, it) => s + nv(it.work_days) * crewSizeOf(crewMap[it.crew_id]), 0)
    const estMD  = nv(wo.man_days)
    const estMat = nv(wo.material_cost) + nv(wo.sub_cost)
    const estLab = nv(wo.labor_cost)
    const actLab = actMD * laborRate
    return { wo, estMD, actMD, estMat, estLab, actLab }
  })

  const totEstMD  = rows.reduce((s, r) => s + r.estMD, 0)
  const totActMD  = rows.reduce((s, r) => s + r.actMD, 0)
  const totEstLab = rows.reduce((s, r) => s + r.estLab, 0)
  const totActLab = rows.reduce((s, r) => s + r.actLab, 0)
  const totEstMat = rows.reduce((s, r) => s + r.estMat, 0)
  const mdDelta   = totActMD - totEstMD
  const labDelta  = totActLab - totEstLab

  const headerColor = isUnassigned ? 'border-amber-500 bg-amber-50' : 'border-green-700 bg-green-50'
  const labelColor  = isUnassigned ? 'text-amber-700' : 'text-green-800'

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
              {totActMD > 0 && <span className="text-blue-700"> · Sched {fmtD(totActMD)}</span>}
            </span>
          )}
          {mdDelta !== 0 && totActMD > 0 && (
            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${mdDelta > 0 ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-700'}`}>
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
                  {['Module', 'Crew Type', 'Est MD', 'Sched MD', 'Δ MD', 'Est Labor', 'Act Labor', 'Est Mat'].map(h => (
                    <th key={h} className={`px-3 py-2 text-[10px] font-bold text-gray-500 uppercase tracking-wide ${['Est MD','Sched MD','Δ MD','Est Labor','Act Labor','Est Mat'].includes(h) ? 'text-right' : 'text-left'}`}>{h}</th>
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
                        {wo.project_name && <span className="text-gray-400 text-xs ml-1">· {wo.project_name}</span>}
                      </td>
                      <td className="px-3 py-2">
                        <span className="text-xs bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded font-medium">{wo.crew_type || '—'}</span>
                      </td>
                      <td className="px-3 py-2 text-sm text-right font-mono">{estMD > 0 ? fmtD(estMD) : '—'}</td>
                      <td className={`px-3 py-2 text-sm text-right font-mono ${actMD > 0 ? 'text-blue-700 font-semibold' : 'text-gray-400'}`}>{actMD > 0 ? fmtD(actMD) : '—'}</td>
                      <td className="px-3 py-2 text-right">
                        {(estMD > 0 || actMD > 0) && (
                          <span className={`text-[11px] font-semibold ${mdD === 0 ? 'text-gray-400' : mdD > 0 ? 'text-red-500' : 'text-green-600'}`}>
                            {mdD > 0 ? '+' : ''}{fmtD(mdD)}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-sm text-right">{estLab > 0 ? fmt(estLab) : '—'}</td>
                      <td className={`px-3 py-2 text-sm text-right ${actLab > 0 ? 'text-blue-700 font-semibold' : 'text-gray-400'}`}>{actLab > 0 ? fmt(actLab) : '—'}</td>
                      <td className="px-3 py-2 text-sm text-right">{estMat > 0 ? fmt(estMat) : '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot className="bg-gray-50 border-t-2 border-gray-200 font-semibold">
                <tr>
                  <td colSpan={2} className="px-3 py-2 text-sm font-bold text-gray-800">Crew Total</td>
                  <td className="px-3 py-2 text-sm text-right font-mono">{fmtD(totEstMD)}</td>
                  <td className="px-3 py-2 text-sm text-right font-mono text-blue-700">{totActMD > 0 ? fmtD(totActMD) : '—'}</td>
                  <td className="px-3 py-2 text-right">
                    {totActMD > 0 && <DeltaBadge est={totEstMD} act={totActMD} inverse />}
                  </td>
                  <td className="px-3 py-2 text-sm text-right">{fmt(totEstLab)}</td>
                  <td className={`px-3 py-2 text-sm text-right ${totActLab > 0 ? 'text-blue-700' : 'text-gray-400'}`}>{totActLab > 0 ? fmt(totActLab) : '—'}</td>
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
                  <p className="text-[10px] text-gray-400 uppercase tracking-wide">Act Labor Cost</p>
                  <p className="text-sm font-bold text-blue-700">{fmt(totActLab)}</p>
                </div>
              )}
              {totActLab > 0 && (
                <div>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wide">Labor Δ</p>
                  <p className={`text-sm font-bold ${labDelta === 0 ? 'text-gray-400' : labDelta > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {labDelta > 0 ? '+' : ''}{fmt(labDelta)}
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
  const [tab,           setTab]           = useState('overall')
  const [workOrders,    setWorkOrders]    = useState([])
  const [scheduleItems, setScheduleItems] = useState([])
  const [timeEntries,   setTimeEntries]   = useState([])
  const [bills,         setBills]         = useState([])
  const [invoices,      setInvoices]      = useState([])
  const [crewMap,       setCrewMap]       = useState({})
  const [laborRate,     setLaborRate]     = useState(400)
  const [loading,       setLoading]       = useState(true)

  useEffect(() => {
    if (job?.id) fetchAll()
  }, [job?.id])

  async function fetchAll() {
    setLoading(true)
    const [woRes, siRes, teRes, billRes, invRes, crewRes, settingsRes] = await Promise.all([
      supabase.from('work_orders').select('*').eq('job_id', job.id).order('module_type'),
      supabase.from('schedule_items').select('*').eq('job_id', job.id).order('start_date'),
      supabase.from('time_entries').select('*').eq('job_id', job.id).order('date').order('time_in'),
      supabase.from('acct_bills').select('*').eq('job_id', job.id).order('date', { ascending: false }),
      supabase.from('acct_invoices').select('*').eq('job_id', job.id).order('date', { ascending: false }),
      supabase.from('crews').select('*').order('label'),
      supabase.from('company_settings').select('labor_rate_per_man_day').maybeSingle(),
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
    setLoading(false)
  }

  // ─── Derived calculations ──────────────────────────────────────────────────
  const calcs = useMemo(() => {
    // ESTIMATED (from work_orders)
    const crewWOs = workOrders.filter(w => !w.is_subcontractor)
    const subWOs  = workOrders.filter(w =>  w.is_subcontractor)

    const estManDays     = crewWOs.reduce((s, w) => s + nv(w.man_days), 0)
    const estLaborCost   = crewWOs.reduce((s, w) => s + nv(w.labor_cost), 0)
    const estMaterialCost= crewWOs.reduce((s, w) => s + nv(w.material_cost), 0)
    const estSubCost     = subWOs.reduce((s, w)  => s + nv(w.sub_cost), 0)
    const estRevenue     = nv(job?.total_price || job?.contract_price) ||
                           workOrders.reduce((s, w) => s + nv(w.total_price), 0)
    const estTotalCost   = estLaborCost + estMaterialCost + estSubCost
    const estGP          = estRevenue - estTotalCost
    const estGPPct       = estRevenue > 0 ? (estGP / estRevenue) * 100 : 0

    // ACTUAL — scheduled man days (from schedule_items × crew sizes)
    const scheduledManDays = scheduleItems.reduce((s, it) => {
      return s + nv(it.work_days) * crewSizeOf(crewMap[it.crew_id])
    }, 0)

    // ACTUAL — payroll hours (from time_entries)
    const payrollMins    = timeEntries.reduce((s, e) => s + diffMins(e.time_in, e.time_out), 0)
    const payrollHours   = payrollMins / 60
    const standardHours  = scheduledManDays * 8
    const overtimeHours  = Math.max(0, payrollHours - standardHours)
    const overtimeManDays= overtimeHours / 8
    const actManDays     = scheduledManDays + overtimeManDays

    // ACTUAL — costs
    const actMaterialCost= bills.reduce((s, b) => s + nv(b.total), 0)
    const actLaborCost   = actManDays * laborRate
    const actRevenue     = invoices.length > 0
      ? invoices.reduce((s, i) => s + nv(i.amount_paid), 0)
      : estRevenue  // fall back to contract price if no invoices yet
    const actSubCost     = 0 // sub costs tracked through bills
    const actTotalCost   = actLaborCost + actMaterialCost + actSubCost
    const actGP          = actRevenue - actTotalCost
    const actGPPct       = actRevenue > 0 ? (actGP / actRevenue) * 100 : 0

    return {
      estManDays, estLaborCost, estMaterialCost, estSubCost, estRevenue, estTotalCost, estGP, estGPPct,
      scheduledManDays, payrollHours, overtimeHours, overtimeManDays, actManDays,
      actMaterialCost, actLaborCost, actRevenue, actTotalCost, actGP, actGPPct,
    }
  }, [workOrders, scheduleItems, timeEntries, bills, invoices, crewMap, laborRate, job])

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
        <p className="text-xs text-gray-400">Add work orders, schedule items, and time entries to see the comparison.</p>
      </div>
    )
  }

  const c = calcs

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-base font-bold text-gray-900">Job Comparison</h2>
          <p className="text-xs text-gray-400">Estimated vs Actual — {job?.name || job?.client_name}</p>
        </div>
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {[{ key: 'overall', label: '📊 Overall' }, { key: 'by-crew', label: '👷 By Crew' }].map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                tab === t.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── OVERALL TAB ── */}
      {tab === 'overall' && (
        <div className="space-y-4">
          {/* KPI cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <KpiCard
              label="Man Days"
              est={c.estManDays}
              act={c.actManDays}
              inverse
              sub={c.overtimeManDays > 0.1 ? `Incl. ${c.overtimeManDays.toFixed(1)} MD overtime` : c.scheduledManDays > 0 ? `${c.scheduledManDays.toFixed(1)} scheduled` : undefined}
            />
            <KpiCard
              label="Labor Cost"
              est={c.estLaborCost}
              act={c.actLaborCost}
              currency
              inverse
              sub={`@ ${fmt(laborRate)}/MD`}
            />
            <KpiCard
              label="Material Cost"
              est={c.estMaterialCost}
              act={c.actMaterialCost}
              currency
              inverse
              sub={bills.length > 0 ? `${bills.length} bill${bills.length !== 1 ? 's' : ''} recorded` : 'No bills recorded yet'}
            />
            <GpCard
              estGP={c.estGP}
              actGP={c.actGP}
              estPct={c.estGPPct}
              actPct={c.actGPPct}
            />
          </div>

          {/* Payroll hours info row */}
          {c.payrollHours > 0 && (
            <div className="flex flex-wrap gap-3 px-4 py-2.5 bg-blue-50 rounded-xl border border-blue-100 text-sm">
              <span className="text-blue-700 font-semibold">⏱ Payroll:</span>
              <span className="text-gray-700">{c.payrollHours.toFixed(1)}h clocked</span>
              <span className="text-gray-400">·</span>
              <span className="text-gray-700">{(c.scheduledManDays * 8).toFixed(0)}h standard</span>
              {c.overtimeHours > 0.1 && (
                <>
                  <span className="text-gray-400">·</span>
                  <span className="text-red-600 font-semibold">+{c.overtimeHours.toFixed(1)}h overtime ({c.overtimeManDays.toFixed(2)} MD added)</span>
                </>
              )}
            </div>
          )}

          {/* Module table */}
          {workOrders.length > 0 && (
            <ModuleTable
              workOrders={workOrders}
              scheduleItems={scheduleItems}
              crewMap={crewMap}
              laborRate={laborRate}
            />
          )}

          {/* Payroll detail */}
          <PayrollPanel
            timeEntries={timeEntries}
            scheduledManDays={c.scheduledManDays}
          />

          {/* Accounting panel */}
          <AccountingPanel bills={bills} invoices={invoices} />
        </div>
      )}

      {/* ── BY CREW TAB ── */}
      {tab === 'by-crew' && (
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
                  scheduleItems={scheduleItems}
                  crewMap={crewMap}
                  laborRate={laborRate}
                />
              )
            })}

          {crewGroups['__unassigned__']?.length > 0 && (
            <CrewSection
              key="__unassigned__"
              crewLabel="Unassigned"
              workOrders={crewGroups['__unassigned__']}
              scheduleItems={scheduleItems}
              crewMap={crewMap}
              laborRate={laborRate}
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
  )
}
