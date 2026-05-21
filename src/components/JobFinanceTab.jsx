// src/components/JobFinanceTab.jsx
//
// Invoices sub-tab of the job Finance tab. Read-only list of job_invoices.
// Invoice creation now lives in JobInvoiceCreateModal, opened from the
// +Invoice menu on JobFinancePanel.
//
// When `job` is null the table shows invoices across every job (all-jobs view)
// and adds a Job column. `refreshKey` is bumped by the panel after a new
// invoice is created so the list reloads.
import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { fetchAllPaginated } from '../lib/fetchAll'

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
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    let data, e
    if (allJobs) {
      // All-jobs view — paginate past Supabase's 1k server-side cap.
      ;({ data, error: e } = await fetchAllPaginated(() =>
        supabase.from('job_invoices').select('*').order('created_at', { ascending: false })
      ))
    } else {
      ;({ data, error: e } = await supabase
        .from('job_invoices')
        .select('*')
        .eq('job_id', job.id)
        .order('created_at', { ascending: false }))
    }
    if (e) {
      setError(e.message)
      setInvoices([])
      setLoading(false)
      return
    }
    const invs = data || []
    setInvoices(invs)
    // Resolve job names for the all-jobs Job column.
    if (allJobs) {
      const ids = [...new Set(invs.map(i => i.job_id).filter(Boolean))]
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
    setLoading(false)
  }, [allJobs, job?.id])

  useEffect(() => {
    load()
  }, [load, refreshKey])

  async function setInvoiceStatus(inv, status) {
    setError('')
    const { error: e } = await supabase.from('job_invoices').update({ status }).eq('id', inv.id)
    if (e) {
      setError(e.message)
      return
    }
    load()
  }

  if (loading)
    return <div className="px-5 py-8 text-center text-sm text-gray-400">Loading invoices…</div>

  const total = invoices.reduce((s, i) => s + num(i.amount), 0)
  const paid = invoices.reduce((s, i) => s + num(i.amount_paid), 0)

  return (
    <div className="space-y-4 px-5 py-4">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
          {error}
        </div>
      )}

      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-gray-900">
          {allJobs ? 'All Invoices' : 'Invoices'}
        </p>
        <p className="text-sm text-gray-600">
          {invoices.length} invoice{invoices.length === 1 ? '' : 's'} ·{' '}
          <span className="font-bold text-gray-900">{money(total)}</span>{' '}
          <span className="text-gray-400">({money(paid)} paid)</span>
        </p>
      </div>

      {invoices.length === 0 ? (
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
                    <td className="px-3 py-2 font-medium text-gray-800">{inv.invoice_number}</td>
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
  )
}
