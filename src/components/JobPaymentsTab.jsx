// src/components/JobPaymentsTab.jsx
//
// Payments sub-tab of the job Finance tab. Lists rows from job_invoice_payments
// — payments received against the job's invoices.
//
// When `job` is null it shows payments across every job (all-jobs view) and
// adds a Job column.
import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { fetchAllPaginated } from '../lib/fetchAll'

const money = v => {
  const n = Number(v)
  return Number.isFinite(n) ? n.toLocaleString('en-US', { style: 'currency', currency: 'USD' }) : '—'
}
const dateStr = v => {
  if (!v) return '—'
  const d = new Date(v)
  return isNaN(d.getTime())
    ? '—'
    : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function JobPaymentsTab({ job }) {
  const allJobs = !job?.id
  const [rows, setRows] = useState(null)
  const [jobNames, setJobNames] = useState({})
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setRows(null)
    setError('')
    let data, e
    if (allJobs) {
      // All-jobs view — paginate past Supabase's 1k server-side cap.
      ;({ data, error: e } = await fetchAllPaginated(() =>
        supabase
          .from('job_invoice_payments')
          .select('*, job_invoices(invoice_number, title)')
          .order('payment_date', { ascending: false, nullsFirst: false })
      ))
    } else {
      ;({ data, error: e } = await supabase
        .from('job_invoice_payments')
        .select('*, job_invoices(invoice_number, title)')
        .eq('job_id', job.id)
        .order('payment_date', { ascending: false, nullsFirst: false }))
    }
    if (e) setError(e.message)
    const list = data || []
    setRows(list)
    if (allJobs) {
      const ids = [...new Set(list.map(p => p.job_id).filter(Boolean))]
      if (ids.length) {
        const { data: jb } = await supabase
          .from('jobs')
          .select('id, name, client_name')
          .in('id', ids)
        setJobNames(
          Object.fromEntries((jb || []).map(j => [j.id, j.name || j.client_name || '—']))
        )
      } else {
        setJobNames({})
      }
    }
  }, [allJobs, job?.id])

  useEffect(() => {
    load()
  }, [load])

  if (rows === null)
    return <div className="px-5 py-8 text-center text-sm text-gray-400">Loading payments…</div>

  const total = rows.reduce((s, p) => s + (Number(p.amount) || 0), 0)

  return (
    <div className="space-y-4 px-5 py-4">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
          {error}
        </div>
      )}
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-gray-900">
          {allJobs ? 'All Payments Received' : 'Payments Received'}
        </p>
        <p className="text-sm text-gray-600">
          {rows.length} payment{rows.length === 1 ? '' : 's'} ·{' '}
          <span className="font-bold text-gray-900">{money(total)}</span>
        </p>
      </div>

      {rows.length === 0 ? (
        <p className="py-8 text-center text-sm text-gray-400">
          {allJobs ? 'No payments recorded yet.' : 'No payments recorded for this job.'}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                {allJobs && <th className="px-3 py-2">Job</th>}
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">Invoice</th>
                <th className="px-3 py-2">Method</th>
                <th className="px-3 py-2">Status</th>
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
  )
}
