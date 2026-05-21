// src/components/JobPaymentsTab.jsx
//
// Payments sub-tab of the job Finance tab. Lists rows from job_invoice_payments
// for this job — payments received against the job's invoices.
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

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
  const [rows, setRows] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!job?.id) {
      setRows([])
      return
    }
    let cancelled = false
    ;(async () => {
      const { data, error: e } = await supabase
        .from('job_invoice_payments')
        .select('*, job_invoices(invoice_number, title)')
        .eq('job_id', job.id)
        .order('payment_date', { ascending: false, nullsFirst: false })
      if (cancelled) return
      if (e) setError(e.message)
      setRows(data || [])
    })()
    return () => {
      cancelled = true
    }
  }, [job?.id])

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
        <p className="text-sm font-semibold text-gray-900">Payments Received</p>
        <p className="text-sm text-gray-600">
          {rows.length} payment{rows.length === 1 ? '' : 's'} ·{' '}
          <span className="font-bold text-gray-900">{money(total)}</span>
        </p>
      </div>

      {rows.length === 0 ? (
        <p className="py-8 text-center text-sm text-gray-400">
          No payments recorded for this job.
        </p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
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
