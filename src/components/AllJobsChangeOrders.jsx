// src/components/AllJobsChangeOrders.jsx
//
// All-Jobs view for the Jobs > Change Orders tab. Shown when "All Jobs" is
// selected instead of the per-job JobChangeOrdersPanel. Lists every change
// order across the jobs matching the sidebar Open/Closed filter (read-only —
// CO editing stays in the per-job panel). Click a job to open it.
import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../lib/supabase'

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

const dateStr = v => {
  if (!v) return '—'
  const d = new Date(v)
  return isNaN(d.getTime())
    ? '—'
    : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

const CO_STATUS = {
  pending: { label: 'Pending', cls: 'bg-gray-100 text-gray-600' },
  presented: { label: 'Sent', cls: 'bg-amber-100 text-amber-700' },
  sold: { label: 'Approved', cls: 'bg-green-100 text-green-700' },
  lost: { label: 'Declined', cls: 'bg-red-100 text-red-600' },
}

export default function AllJobsChangeOrders({ jobs = [], statusFilter = 'open', onSelectJob }) {
  const [cos, setCos] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    ;(async () => {
      setLoading(true)
      const { data } = await supabase
        .from('bids')
        .select('id, linked_job_id, custom_co_id, co_name, co_type, status, bid_amount, date_submitted')
        .eq('record_type', 'change_order')
      if (alive) {
        setCos(data || [])
        setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [])

  const { rows, total } = useMemo(() => {
    const allowed = new Set(
      jobs
        .filter(j => (statusFilter === 'closed' ? !isJobOpen(j) : isJobOpen(j)))
        .map(j => j.id)
    )
    const nameById = {}
    for (const j of jobs) nameById[j.id] = j.name || j.client_name || '—'
    const list = cos
      .filter(c => allowed.has(c.linked_job_id))
      .map(c => ({ ...c, jobName: nameById[c.linked_job_id] || '—' }))
      .sort(
        (a, b) =>
          a.jobName.localeCompare(b.jobName) ||
          new Date(b.date_submitted || 0) - new Date(a.date_submitted || 0)
      )
    const sum = list.reduce((n, c) => n + (Number(c.bid_amount) || 0), 0)
    return { rows: list, total: sum }
  }, [jobs, statusFilter, cos])

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-green-700" />
      </div>
    )
  }

  return (
    <div className="p-4">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-lg font-bold text-gray-900">Change Orders — All Jobs</h2>
        <span className="text-xs text-gray-400">
          {rows.length} CO{rows.length === 1 ? '' : 's'} ·{' '}
          {statusFilter === 'closed' ? 'closed' : 'open'} jobs
        </span>
      </div>

      {rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <p className="mb-2 text-4xl">🔄</p>
          <p className="text-sm">
            No change orders on any {statusFilter === 'closed' ? 'closed' : 'open'} job.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-2.5">Job</th>
                <th className="px-4 py-2.5">CO #</th>
                <th className="px-4 py-2.5">Name</th>
                <th className="px-4 py-2.5 text-right">Amount</th>
                <th className="px-4 py-2.5">Status</th>
                <th className="px-4 py-2.5">Submitted</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map(c => {
                const st = CO_STATUS[c.status] || CO_STATUS.pending
                return (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5">
                      <button
                        type="button"
                        onClick={() => onSelectJob?.(c.linked_job_id)}
                        className="text-left font-medium text-green-700 hover:underline"
                      >
                        {c.jobName}
                      </button>
                    </td>
                    <td className="px-4 py-2.5 text-gray-500">{c.custom_co_id || '—'}</td>
                    <td className="px-4 py-2.5 text-gray-800">
                      {c.co_name || c.co_type || '—'}
                    </td>
                    <td className="px-4 py-2.5 text-right text-gray-700">
                      {money(c.bid_amount)}
                    </td>
                    <td className="px-4 py-2.5">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${st.cls}`}
                      >
                        {st.label}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-gray-500">{dateStr(c.date_submitted)}</td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50 font-bold text-gray-900">
                <td className="px-4 py-2.5" colSpan={3}>
                  Total
                </td>
                <td className="px-4 py-2.5 text-right">{money(total)}</td>
                <td className="px-4 py-2.5" colSpan={2}></td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  )
}
