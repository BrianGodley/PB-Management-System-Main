// src/components/JobFinanceTab.jsx
//
// Invoices sub-tab of the job Finance tab. Read-only, PAGINATED list of
// job_invoices. Invoice creation lives in JobInvoiceCreateModal.
//
// Why paginated: the all-jobs view (job == null) can cover thousands of
// invoices. Fetching + rendering them all froze the browser. Now each page
// pulls only PAGE_SIZE rows server-side (.range) and grand totals come from a
// single server-side aggregate RPC (finance_invoice_totals) so the header
// stays accurate without dragging every row into the browser.
//
// Layout: a constant summary header + a constant pagination footer with a
// scrolling table region between them.
import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const PAGE_SIZE = 100

const num = v => {
  const n = parseFloat(v)
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

const STATUS_CLS = {
  draft: 'bg-gray-100 text-gray-600',
  sent: 'bg-blue-100 text-blue-700',
  paid: 'bg-green-100 text-green-700',
  void: 'bg-red-100 text-red-600',
}

export default function JobFinanceTab({ job, refreshKey = 0 }) {
  const allJobs = !job?.id
  const [loading, setLoading] = useState(true)
  const [invoices, setInvoices] = useState([])
  const [jobNames, setJobNames] = useState({})
  const [count, setCount] = useState(0)
  const [page, setPage] = useState(0)
  const [totals, setTotals] = useState(null) // { invoiced, paid } | null
  const [error, setError] = useState('')

  // Jump back to page 1 whenever the job changes or a new invoice is created.
  useEffect(() => {
    setPage(0)
  }, [job?.id, refreshKey])

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    const from = page * PAGE_SIZE
    let q = supabase
      .from('job_invoices')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, from + PAGE_SIZE - 1)
    if (!allJobs) q = q.eq('job_id', job.id)
    const { data, error: e, count: c } = await q
    if (e) {
      setError(e.message)
      setInvoices([])
      setLoading(false)
      return
    }
    const invs = data || []
    setInvoices(invs)
    setCount(c || 0)
    // Resolve job names only for the rows actually on this page.
    if (allJobs) {
      const ids = [...new Set(invs.map(i => i.job_id).filter(Boolean))]
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
  }, [allJobs, job?.id, page])

  useEffect(() => {
    load()
  }, [load])

  // Grand totals — one server-side aggregate so the header is accurate without
  // pulling every invoice. Best-effort: if the RPC isn't deployed yet, the
  // header just shows the count.
  useEffect(() => {
    let cancelled = false
    setTotals(null)
    supabase
      .rpc('finance_invoice_totals', { p_job_id: allJobs ? null : job.id })
      .then(({ data, error: e }) => {
        if (cancelled || e || !data) return
        const row = Array.isArray(data) ? data[0] : data
        if (row) setTotals({ invoiced: num(row.total_amount), paid: num(row.total_paid) })
      })
    return () => {
      cancelled = true
    }
  }, [allJobs, job?.id, refreshKey])

  async function setInvoiceStatus(inv, status) {
    setError('')
    const { error: e } = await supabase.from('job_invoices').update({ status }).eq('id', inv.id)
    if (e) {
      setError(e.message)
      return
    }
    load()
  }

  const pageCount = Math.max(1, Math.ceil(count / PAGE_SIZE))

  return (
    <div className="flex h-full flex-col">
      {/* Constant summary header */}
      <div className="flex flex-shrink-0 items-center justify-between px-5 pb-2 pt-4">
        <p className="text-sm font-semibold text-gray-900">
          {allJobs ? 'All Invoices' : 'Invoices'}
        </p>
        <p className="text-sm text-gray-600">
          {count.toLocaleString()} invoice{count === 1 ? '' : 's'}
          {totals && (
            <>
              {' · '}
              <span className="font-bold text-gray-900">{money(totals.invoiced)}</span>{' '}
              <span className="text-gray-400">({money(totals.paid)} paid)</span>
            </>
          )}
        </p>
      </div>

      {error && (
        <div className="mx-5 mb-2 flex-shrink-0 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
          {error}
        </div>
      )}

      {/* Scrolling table region */}
      <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-4">
        {loading ? (
          <div className="py-8 text-center text-sm text-gray-400">Loading invoices…</div>
        ) : invoices.length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-400">
            {allJobs ? 'No invoices recorded yet.' : 'No invoices for this job yet.'}
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  {allJobs && <th className="px-3 py-2">Job</th>}
                  <th className="px-3 py-2">Invoice #</th>
                  <th className="px-3 py-2">Title</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2 text-right">Amount</th>
                  <th className="px-3 py-2 text-right">Paid</th>
                  <th className="px-3 py-2 text-right">Balance Due</th>
                  <th className="px-3 py-2">Due Date</th>
                  <th className="px-3 py-2">Date Paid</th>
                  <th className="px-3 py-2 text-right">&nbsp;</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {invoices.map(inv => {
                  const bal = num(inv.amount) - num(inv.amount_paid)
                  return (
                    <tr key={inv.id}>
                      {allJobs && (
                        <td className="px-3 py-2 text-gray-700">{jobNames[inv.job_id] || '—'}</td>
                      )}
                      <td className="px-3 py-2 font-medium text-gray-800">
                        {inv.invoice_number}
                      </td>
                      <td className="px-3 py-2 text-gray-600">{inv.title}</td>
                      <td className="px-3 py-2">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                            STATUS_CLS[inv.status] || STATUS_CLS.draft
                          }`}
                        >
                          {inv.status}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right text-gray-800">{money(inv.amount)}</td>
                      <td className="px-3 py-2 text-right text-gray-600">
                        {money(inv.amount_paid)}
                      </td>
                      <td className="px-3 py-2 text-right font-medium text-gray-900">
                        {money(bal)}
                      </td>
                      <td className="px-3 py-2 text-gray-500">{dateStr(inv.due_date)}</td>
                      <td className="px-3 py-2 text-gray-500">{dateStr(inv.paid_date)}</td>
                      <td className="px-3 py-2 text-right">
                        {inv.status === 'draft' && (
                          <button
                            onClick={() => setInvoiceStatus(inv, 'sent')}
                            className="rounded-lg border border-blue-200 px-2.5 py-1 text-xs font-semibold text-blue-600 hover:bg-blue-50"
                          >
                            Send to Client
                          </button>
                        )}
                        {inv.status === 'sent' && (
                          <button
                            onClick={() => setInvoiceStatus(inv, 'paid')}
                            className="rounded-lg border border-green-200 px-2.5 py-1 text-xs font-semibold text-green-700 hover:bg-green-50"
                          >
                            Mark Paid
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
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
