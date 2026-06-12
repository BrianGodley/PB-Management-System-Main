// src/components/AllJobsChangeOrders.jsx
//
// All-Jobs view for the Jobs > Change Orders tab. Shown when "All Jobs" is
// selected instead of the per-job JobChangeOrdersPanel. Lists every change
// order across the jobs matching the sidebar Open/Closed filter (read-only —
// CO editing stays in the per-job panel). Click a job to open it.
import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { fetchAllPaginated } from '../lib/fetchAll'

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
  unreleased: { label: 'Unreleased', cls: 'bg-gray-100 text-gray-500' },
  pending: { label: 'Pending', cls: 'bg-yellow-100 text-yellow-700' },
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
      // Paginated — the bids table can hold more change orders than the
      // PostgREST 1,000-row cap, which previously truncated this list and
      // made some jobs show fewer COs here than in their own CO panel.
      const { data } = await fetchAllPaginated(() =>
        supabase
          .from('bids')
          .select(
            'id, linked_job_id, custom_co_id, co_name, co_type, co_method, status, bid_amount, date_submitted'
          )
          .eq('record_type', 'change_order')
          .order('id', { ascending: true })
      )
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
    <div className="flex flex-col h-full">
      <div className="mb-3 flex items-baseline justify-between flex-shrink-0">
        <h2 className="text-sm font-semibold text-gray-700">Change Orders</h2>
        <span className="text-xs text-gray-400 mr-6">
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
        <div className="flex-1 min-h-0 overflow-auto rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500 border-b border-gray-200">
              <tr>
                <th className="px-4 py-2.5">Job</th>
                <th className="px-4 py-2.5">CO #</th>
                <th className="px-4 py-2.5">Name</th>
                <th className="px-4 py-2.5">Type</th>
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
                    <td className="px-4 py-2.5">
                      <button
                        type="button"
                        onClick={() => onSelectJob?.(c.linked_job_id)}
                        className="text-left font-semibold text-blue-600 hover:underline"
                      >
                        {c.co_name || c.co_type || '—'}
                      </button>
                    </td>
                    <td className="px-4 py-2.5">
                      {c.co_method === 'manual' ? (
                        <span className="rounded-full px-2 py-0.5 text-xs font-semibold bg-blue-50 text-blue-700">
                          Manual
                        </span>
                      ) : (
                        <span className="rounded-full px-2 py-0.5 text-xs font-semibold bg-indigo-50 text-indigo-700">
                          Estimator
                        </span>
                      )}
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
                <td className="px-4 py-2.5" colSpan={4}>
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
