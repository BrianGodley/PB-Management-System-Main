// src/components/JobPaymentsTab.jsx
//
// Payments sub-tab of the job Finance tab. Read-only, PAGINATED list of
// job_invoice_payments — payments received against the job's invoices.
//
// The all-jobs view (job == null) lists payments across every job with a Job
// column. Paginated server-side (.range) so the view never renders thousands
// of rows; grand totals come from the finance_payment_totals aggregate RPC.
import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const PAGE_SIZE = 100

const num = v => {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}
const money = v => num(v).toLocaleString('en-US', { style: 'currency', currency: 'USD' })
const dateStr = v => {
  if (!v) return '—'
  const d = new Date(v)
  return isNaN(d.getTime())
    ? '—'
    : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function JobPaymentsTab({ job, refreshKey = 0 }) {
  const allJobs = !job?.id
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState([])
  const [jobNames, setJobNames] = useState({})
  const [count, setCount] = useState(0)
  const [page, setPage] = useState(0)
  const [total, setTotal] = useState(null)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  // Debounce the search box so we don't fire a query on every keystroke.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(t)
  }, [search])

  useEffect(() => {
    setPage(0)
  }, [job?.id, refreshKey, debouncedSearch])

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    const from = page * PAGE_SIZE
    let q = supabase
      .from('job_invoice_payments')
      .select('*, job_invoices(invoice_number, title)', { count: 'exact' })
      .order('payment_date', { ascending: false, nullsFirst: false })
    if (!allJobs) q = q.eq('job_id', job.id)

    // Search — payment method / status / source, plus job name in all-jobs.
    const term = debouncedSearch.trim().replace(/[%,()*]/g, ' ').trim()
    if (term) {
      const ors = [
        `method.ilike.*${term}*`,
        `status.ilike.*${term}*`,
        `source.ilike.*${term}*`,
      ]
      if (allJobs) {
        const { data: jb } = await supabase
          .from('jobs')
          .select('id')
          .or(`name.ilike.*${term}*,client_name.ilike.*${term}*`)
          .limit(300)
        const jids = (jb || []).map(j => j.id)
        if (jids.length) ors.push(`job_id.in.(${jids.join(',')})`)
      }
      q = q.or(ors.join(','))
    }

    q = q.range(from, from + PAGE_SIZE - 1)
    const { data, error: e, count: c } = await q
    if (e) {
      setError(e.message)
      setRows([])
      setLoading(false)
      return
    }
    const list = data || []
    setRows(list)
    setCount(c || 0)
    if (allJobs) {
      const ids = [...new Set(list.map(p => p.job_id).filter(Boolean))]
      if (ids.length) {
        const { data: jb } = await supabase
          .from('jobs')
          .select('id, name, client_name')
          .in('id', ids)
        setJobNames(prev => ({
          ...prev,
          ...Object.fromEntries((jb || []).map(j => [j.id, j.name || j.client_name || '—'])),
        }))
      }
    }
    setLoading(false)
  }, [allJobs, job?.id, page, debouncedSearch])

  useEffect(() => {
    load()
  }, [load, refreshKey])

  // Grand total — one server-side aggregate. Best-effort: falls back to the
  // count alone if the RPC isn't deployed yet.
  useEffect(() => {
    let cancelled = false
    setTotal(null)
    supabase
      .rpc('finance_payment_totals', { p_job_id: allJobs ? null : job.id })
      .then(({ data, error: e }) => {
        if (cancelled || e || !data) return
        const row = Array.isArray(data) ? data[0] : data
        if (row) setTotal(num(row.total_paid))
      })
    return () => {
      cancelled = true
    }
  }, [allJobs, job?.id])

  const pageCount = Math.max(1, Math.ceil(count / PAGE_SIZE))

  return (
    <div className="flex h-full flex-col">
      {/* Constant summary header + search */}
      <div className="flex-shrink-0 space-y-2 px-5 pb-2 pt-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-gray-900">
            {allJobs ? 'All Payments Received' : 'Payments Received'}
          </p>
          <p className="text-sm text-gray-600">
            {count.toLocaleString()} payment{count === 1 ? '' : 's'}
            {total !== null && (
              <>
                {' · '}
                <span className="font-bold text-gray-900">{money(total)}</span>
              </>
            )}
          </p>
        </div>
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by method, status, source, or job…"
          className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:border-green-600 focus:outline-none"
        />
      </div>

      {error && (
        <div className="mx-5 mb-2 flex-shrink-0 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
          {error}
        </div>
      )}

      {/* Scrolling table region */}
      <div className="min-h-0 flex-1 flex flex-col px-5 pb-4">
        {loading ? (
          <div className="py-8 text-center text-sm text-gray-400">Loading payments…</div>
        ) : rows.length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-400">
            {debouncedSearch.trim()
              ? 'No payments match your search.'
              : allJobs
                ? 'No payments recorded yet.'
                : 'No payments recorded for this job.'}
          </p>
        ) : (
          <div className="flex-1 min-h-0 overflow-auto rounded-xl border border-gray-200 bg-white">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10 border-b border-gray-200 bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  {allJobs && <th className="px-3 py-2">Job</th>}
                  <th className="px-3 py-2">Date</th>
                  <th className="px-3 py-2">Invoice</th>
                  <th className="px-3 py-2">Method</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Source</th>
                  <th className="px-3 py-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map(p => (
                  <tr key={p.id}>
                    {allJobs && (
                      <td className="px-3 py-2 text-gray-700">{jobNames[p.job_id] || '—'}</td>
                    )}
                    <td className="px-3 py-2 text-gray-600">{dateStr(p.payment_date)}</td>
                    <td className="px-3 py-2 text-gray-800">
                      {p.job_invoices?.invoice_number || '—'}
                    </td>
                    <td className="px-3 py-2 text-gray-600">{p.method || '—'}</td>
                    <td className="px-3 py-2 text-gray-600">{p.status || '—'}</td>
                    <td className="px-3 py-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          p.source === 'portal'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {p.source === 'portal' ? 'Portal' : 'Direct'}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right font-medium text-gray-900">
                      {money(p.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Constant pagination footer */}
      {count > PAGE_SIZE && (
        <div className="flex flex-shrink-0 items-center justify-between border-t border-gray-200 px-5 py-2">
          <p className="text-xs text-gray-500">
            Page {page + 1} of {pageCount} · showing{' '}
            {(page * PAGE_SIZE + 1).toLocaleString()}–
            {Math.min((page + 1) * PAGE_SIZE, count).toLocaleString()}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0 || loading}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-40"
            >
              ‹ Prev
            </button>
            <button
              onClick={() => setPage(p => Math.min(pageCount - 1, p + 1))}
              disabled={page >= pageCount - 1 || loading}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-40"
            >
              Next ›
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
