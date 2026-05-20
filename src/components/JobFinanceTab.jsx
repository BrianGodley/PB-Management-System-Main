// src/components/JobFinanceTab.jsx
//
// "Finance" tab inside JobInfoModal — percentage-of-completion invoicing.
//
// Pulls the job's sold bid → estimate → projects → modules. Each module is a
// billable line at its total_price. Staff enter a cumulative "% complete" per
// module; the tab shows the % already invoiced and bills only the delta. The
// running total becomes a new draft invoice (job_invoices + job_invoice_lines).
// A manual path skips the module math for an ad-hoc invoice.
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const num = v => {
  const n = parseFloat(v)
  return Number.isFinite(n) ? n : 0
}
const money = v =>
  num(v).toLocaleString('en-US', { style: 'currency', currency: 'USD' })
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

export default function JobFinanceTab({ job }) {
  const [loading, setLoading] = useState(true)
  const [modules, setModules] = useState([]) // {id, project_name, module_name, amount, prior_pct}
  const [invoices, setInvoices] = useState([])
  const [pct, setPct] = useState({}) // module_id -> new % (string)
  const [mode, setMode] = useState('progress') // 'progress' | 'manual'
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [msg, setMsg] = useState('')
  const [confirmOpen, setConfirmOpen] = useState(false)
  // manual invoice fields
  const [mTitle, setMTitle] = useState('')
  const [mAmount, setMAmount] = useState('')
  const [mDue, setMDue] = useState('')

  async function load() {
    setLoading(true)
    setError('')
    // 1) the job's most recent contract bid (prefer a sold one)
    const { data: bids } = await supabase
      .from('bids')
      .select('id, estimate_id, status, created_at')
      .eq('linked_job_id', job.id)
      .eq('record_type', 'bid')
      .order('created_at', { ascending: false })
    const bid = (bids || []).find(b => b.status === 'sold' && b.estimate_id) ||
      (bids || []).find(b => b.estimate_id) || null

    // 2) modules from that estimate, grouped by project
    let mods = []
    if (bid?.estimate_id) {
      const { data: projects } = await supabase
        .from('estimate_projects')
        .select('*, estimate_modules(*)')
        .eq('estimate_id', bid.estimate_id)
      for (const p of projects || []) {
        for (const m of p.estimate_modules || []) {
          mods.push({
            id: m.id,
            project_name: p.project_name || 'Project',
            module_name: m.module_name || m.module_type || 'Module',
            amount: num(m.total_price),
            prior_pct: 0,
          })
        }
      }
    }

    // 3) existing invoices + lines → prior % invoiced per module
    const { data: invs } = await supabase
      .from('job_invoices')
      .select('*, job_invoice_lines(*)')
      .eq('job_id', job.id)
      .order('created_at', { ascending: false })
    const priorByModule = {}
    for (const inv of invs || []) {
      if (inv.status === 'void') continue
      for (const ln of inv.job_invoice_lines || []) {
        if (!ln.module_id) continue
        priorByModule[ln.module_id] = (priorByModule[ln.module_id] || 0) + num(ln.this_pct)
      }
    }
    mods = mods.map(m => ({ ...m, prior_pct: priorByModule[m.id] || 0 }))

    setModules(mods)
    setInvoices(invs || [])
    setPct(Object.fromEntries(mods.map(m => [m.id, String(m.prior_pct)])))
    setLoading(false)
  }

  useEffect(() => {
    if (job?.id) load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [job?.id])

  // ── derived billing math ────────────────────────────────────────────────────
  const lines = modules.map(m => {
    const newPct = Math.min(100, Math.max(0, num(pct[m.id])))
    const deltaPct = Math.max(0, newPct - m.prior_pct)
    return { ...m, newPct, deltaPct, dueAmount: (m.amount * deltaPct) / 100 }
  })
  const invoiceTotal = lines.reduce((s, l) => s + l.dueAmount, 0)
  const byProject = {}
  for (const l of lines) (byProject[l.project_name] = byProject[l.project_name] || []).push(l)

  async function createProgressInvoice() {
    setConfirmOpen(false)
    setBusy(true)
    setError('')
    setMsg('')
    const billed = lines.filter(l => l.dueAmount > 0.0001)
    if (billed.length === 0) {
      setBusy(false)
      setError('Nothing to bill — raise a module % above what was already invoiced.')
      return
    }
    const { data: user } = await supabase.auth.getUser()
    const { data: inv, error: e1 } = await supabase
      .from('job_invoices')
      .insert({
        job_id: job.id,
        invoice_number: `INV-${String(invoices.length + 1).padStart(4, '0')}`,
        title: `Progress billing — ${dateStr(new Date())}`,
        amount: invoiceTotal,
        status: 'draft',
        is_manual: false,
        created_by: user?.user?.id || null,
      })
      .select()
      .single()
    if (e1) {
      setBusy(false)
      setError(e1.message)
      return
    }
    const lineRows = billed.map((l, i) => ({
      invoice_id: inv.id,
      module_id: l.id,
      project_name: l.project_name,
      module_name: l.module_name,
      module_amount: l.amount,
      prior_pct: l.prior_pct,
      this_pct: l.deltaPct,
      line_amount: l.dueAmount,
      sort_order: i,
    }))
    const { error: e2 } = await supabase.from('job_invoice_lines').insert(lineRows)
    setBusy(false)
    if (e2) {
      setError(`Invoice created but lines failed: ${e2.message}`)
      return
    }
    setMsg(`Draft invoice ${inv.invoice_number} created for ${money(invoiceTotal)}.`)
    load()
  }

  async function createManualInvoice() {
    if (!mTitle.trim() || num(mAmount) <= 0) {
      setError('Enter a title and an amount for the manual invoice.')
      return
    }
    setBusy(true)
    setError('')
    setMsg('')
    const { data: user } = await supabase.auth.getUser()
    const { data: inv, error: e } = await supabase
      .from('job_invoices')
      .insert({
        job_id: job.id,
        invoice_number: `INV-${String(invoices.length + 1).padStart(4, '0')}`,
        title: mTitle.trim(),
        amount: num(mAmount),
        due_date: mDue || null,
        status: 'draft',
        is_manual: true,
        created_by: user?.user?.id || null,
      })
      .select()
      .single()
    setBusy(false)
    if (e) {
      setError(e.message)
      return
    }
    setMTitle('')
    setMAmount('')
    setMDue('')
    setMsg(`Draft invoice ${inv.invoice_number} created for ${money(num(mAmount))}.`)
    load()
  }

  async function setInvoiceStatus(inv, status) {
    setError('')
    const { error: e } = await supabase
      .from('job_invoices')
      .update({ status })
      .eq('id', inv.id)
    if (e) {
      setError(e.message)
      return
    }
    load()
  }

  if (loading)
    return <div className="px-5 py-8 text-center text-sm text-gray-400">Loading invoicing…</div>

  return (
    <div className="space-y-5 px-5 py-4">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
          {error}
        </div>
      )}
      {msg && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-700">
          {msg}
        </div>
      )}

      {/* Mode toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => setMode('progress')}
          className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${
            mode === 'progress'
              ? 'bg-green-700 text-white'
              : 'border border-gray-200 text-gray-600 hover:bg-gray-50'
          }`}
        >
          Progress Billing
        </button>
        <button
          onClick={() => setMode('manual')}
          className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${
            mode === 'manual'
              ? 'bg-green-700 text-white'
              : 'border border-gray-200 text-gray-600 hover:bg-gray-50'
          }`}
        >
          Manual Invoice
        </button>
      </div>

      {/* Progress billing */}
      {mode === 'progress' &&
        (modules.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-6 text-center text-sm text-gray-500">
            No sold bid with estimate modules found for this job. Use a Manual Invoice instead.
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-gray-200">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-3 py-2">Module</th>
                  <th className="px-3 py-2 text-right">Value</th>
                  <th className="px-3 py-2 text-right">Invoiced</th>
                  <th className="px-3 py-2 text-right">% Complete</th>
                  <th className="px-3 py-2 text-right">Amount Due</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(byProject).map(([proj, projLines]) => (
                  <>
                    <tr key={`h-${proj}`} className="bg-gray-100">
                      <td colSpan={5} className="px-3 py-1.5 text-xs font-semibold text-gray-600">
                        {proj}
                      </td>
                    </tr>
                    {projLines.map(l => (
                      <tr key={l.id} className="border-b border-gray-100">
                        <td className="px-3 py-2 text-gray-800">{l.module_name}</td>
                        <td className="px-3 py-2 text-right text-gray-600">{money(l.amount)}</td>
                        <td className="px-3 py-2 text-right text-gray-400">
                          {l.prior_pct.toFixed(1)}%
                        </td>
                        <td className="px-3 py-2 text-right">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={pct[l.id] ?? ''}
                            onChange={e => setPct(p => ({ ...p, [l.id]: e.target.value }))}
                            className="w-20 rounded border border-gray-200 px-2 py-1 text-right text-sm focus:border-green-600 focus:outline-none"
                          />
                        </td>
                        <td className="px-3 py-2 text-right font-medium text-gray-900">
                          {money(l.dueAmount)}
                        </td>
                      </tr>
                    ))}
                  </>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50">
                  <td colSpan={4} className="px-3 py-2.5 text-right text-sm font-semibold text-gray-600">
                    New Invoice Total
                  </td>
                  <td className="px-3 py-2.5 text-right text-base font-bold text-gray-900">
                    {money(invoiceTotal)}
                  </td>
                </tr>
              </tfoot>
            </table>
            <div className="flex justify-end border-t border-gray-200 bg-white px-3 py-2.5">
              <button
                onClick={() => setConfirmOpen(true)}
                disabled={busy || invoiceTotal <= 0}
                className="rounded-lg bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-800 disabled:opacity-50"
              >
                Create Invoice
              </button>
            </div>
          </div>
        ))}

      {/* Manual invoice */}
      {mode === 'manual' && (
        <div className="space-y-3 rounded-xl border border-gray-200 p-4">
          <div>
            <label className="mb-1 block text-xs text-gray-400">Invoice Title</label>
            <input
              value={mTitle}
              onChange={e => setMTitle(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-green-600 focus:outline-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs text-gray-400">Amount</label>
              <input
                type="number"
                min="0"
                value={mAmount}
                onChange={e => setMAmount(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-green-600 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-400">Due Date</label>
              <input
                type="date"
                value={mDue}
                onChange={e => setMDue(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-green-600 focus:outline-none"
              />
            </div>
          </div>
          <div className="flex justify-end">
            <button
              onClick={createManualInvoice}
              disabled={busy}
              className="rounded-lg bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-800 disabled:opacity-50"
            >
              Create Manual Invoice
            </button>
          </div>
        </div>
      )}

      {/* Existing invoices */}
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
          Invoices
        </p>
        {invoices.length === 0 ? (
          <p className="text-sm text-gray-400">No invoices yet.</p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-gray-200">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-3 py-2">Invoice #</th>
                  <th className="px-3 py-2">Title</th>
                  <th className="px-3 py-2">Created</th>
                  <th className="px-3 py-2 text-right">Amount</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2 text-right">&nbsp;</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {invoices.map(inv => (
                  <tr key={inv.id}>
                    <td className="px-3 py-2 font-medium text-gray-800">{inv.invoice_number}</td>
                    <td className="px-3 py-2 text-gray-600">{inv.title}</td>
                    <td className="px-3 py-2 text-gray-500">{dateStr(inv.created_at)}</td>
                    <td className="px-3 py-2 text-right text-gray-800">{money(inv.amount)}</td>
                    <td className="px-3 py-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                          STATUS_CLS[inv.status] || STATUS_CLS.draft
                        }`}
                      >
                        {inv.status}
                      </span>
                    </td>
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
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create-invoice confirmation */}
      {confirmOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          onMouseDown={e => e.target === e.currentTarget && setConfirmOpen(false)}
        >
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
            <p className="text-sm font-semibold text-gray-900">Create this invoice?</p>
            <p className="mt-1 text-sm text-gray-600">
              A new draft invoice for <span className="font-bold">{money(invoiceTotal)}</span> will
              be created from {lines.filter(l => l.dueAmount > 0.0001).length} module line(s). It
              stays a draft until you send it to the client.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setConfirmOpen(false)}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={createProgressInvoice}
                className="rounded-lg bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-800"
              >
                Create Invoice
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
