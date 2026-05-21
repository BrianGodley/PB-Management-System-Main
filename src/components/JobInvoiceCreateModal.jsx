// src/components/JobInvoiceCreateModal.jsx
//
// Modal for creating a new invoice on a job. Opened from the +Invoice menu.
// Two modes: progress (percentage-of-completion off the sold bid's modules)
// and manual (ad-hoc title + amount + due date).
//
// The invoice number / Invoice ID is auto-assigned per client by a database
// trigger, so this modal never sends invoice_number — it just shows
// "(auto assigned)". A client-visible Description and file attachments can be
// added; attachments are staged here and uploaded once the invoice row exists.
import { Fragment, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { uploadInvoiceFile, fileSizeLabel } from '../lib/invoiceFiles'

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

export default function JobInvoiceCreateModal({ job, mode: initialMode, onClose, onCreated }) {
  const [mode, setMode] = useState(initialMode === 'manual' ? 'manual' : 'progress')
  const [loading, setLoading] = useState(true)
  const [modules, setModules] = useState([]) // {id, project_name, module_name, amount, prior_pct}
  const [pct, setPct] = useState({}) // module_id -> new % (string)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [confirmOpen, setConfirmOpen] = useState(false)
  // shared fields
  const [description, setDescription] = useState('')
  const [files, setFiles] = useState([]) // staged File objects
  const fileInputRef = useRef(null)
  // manual invoice fields
  const [mTitle, setMTitle] = useState('')
  const [mAmount, setMAmount] = useState('')
  const [mDue, setMDue] = useState('')

  async function load() {
    setLoading(true)
    setError('')
    const { data: bids } = await supabase
      .from('bids')
      .select('id, estimate_id, status, created_at')
      .eq('linked_job_id', job.id)
      .eq('record_type', 'bid')
      .order('created_at', { ascending: false })
    const bid =
      (bids || []).find(b => b.status === 'sold' && b.estimate_id) ||
      (bids || []).find(b => b.estimate_id) ||
      null

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

    // prior % invoiced per module
    const { data: invs } = await supabase
      .from('job_invoices')
      .select('id, status, job_invoice_lines(module_id, this_pct)')
      .eq('job_id', job.id)
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
    setPct(Object.fromEntries(mods.map(m => [m.id, String(m.prior_pct)])))
    setLoading(false)
  }

  useEffect(() => {
    if (job?.id) load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [job?.id])

  // ── derived billing math ──────────────────────────────────────────────────
  const lines = modules.map(m => {
    const newPct = Math.min(100, Math.max(0, num(pct[m.id])))
    const deltaPct = Math.max(0, newPct - m.prior_pct)
    return { ...m, newPct, deltaPct, dueAmount: (m.amount * deltaPct) / 100 }
  })
  const invoiceTotal = lines.reduce((s, l) => s + l.dueAmount, 0)
  const byProject = {}
  for (const l of lines) (byProject[l.project_name] = byProject[l.project_name] || []).push(l)

  function addFiles(e) {
    const picked = Array.from(e.target.files || [])
    if (picked.length) setFiles(prev => [...prev, ...picked])
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // Uploads every staged file against the freshly-created invoice.
  async function uploadStaged(invoiceId) {
    if (files.length === 0) return null
    const { data: u } = await supabase.auth.getUser()
    let failed = 0
    for (const f of files) {
      const { error: e } = await uploadInvoiceFile(invoiceId, job.id, f, u?.user?.id)
      if (e) failed++
    }
    return failed ? `${failed} attachment(s) failed to upload` : null
  }

  async function createProgressInvoice() {
    setConfirmOpen(false)
    setBusy(true)
    setError('')
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
        title: `Progress billing — ${dateStr(new Date())}`,
        description: description.trim() || null,
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
    if (e2) {
      setBusy(false)
      setError(`Invoice created but lines failed: ${e2.message}`)
      return
    }
    const upWarn = await uploadStaged(inv.id)
    setBusy(false)
    onCreated?.(
      `Invoice ${inv.invoice_number || ''} created for ${money(invoiceTotal)}.` +
        (upWarn ? ` (${upWarn})` : '')
    )
  }

  async function createManualInvoice() {
    if (!mTitle.trim() || num(mAmount) <= 0) {
      setError('Enter a title and an amount for the manual invoice.')
      return
    }
    setBusy(true)
    setError('')
    const { data: user } = await supabase.auth.getUser()
    const { data: inv, error: e } = await supabase
      .from('job_invoices')
      .insert({
        job_id: job.id,
        title: mTitle.trim(),
        description: description.trim() || null,
        amount: num(mAmount),
        due_date: mDue || null,
        status: 'draft',
        is_manual: true,
        created_by: user?.user?.id || null,
      })
      .select()
      .single()
    if (e) {
      setBusy(false)
      setError(e.message)
      return
    }
    const upWarn = await uploadStaged(inv.id)
    setBusy(false)
    onCreated?.(
      `Invoice ${inv.invoice_number || ''} created for ${money(num(mAmount))}.` +
        (upWarn ? ` (${upWarn})` : '')
    )
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onMouseDown={e => e.target === e.currentTarget && onClose()}
    >
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        {/* header */}
        <div className="flex items-start justify-between border-b border-gray-200 px-5 py-4">
          <div>
            <h2 className="text-base font-bold text-gray-900">New Invoice</h2>
            <p className="text-xs text-gray-500">{job?.name || job?.client_name}</p>
          </div>
          <button onClick={onClose} className="text-gray-300 hover:text-gray-500">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* mode toggle */}
        <div className="flex gap-2 border-b border-gray-100 px-5 py-3">
          <button
            onClick={() => setMode('progress')}
            className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${
              mode === 'progress'
                ? 'bg-green-700 text-white'
                : 'border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            Progress Invoice
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

        {/* body */}
        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
              {error}
            </div>
          )}

          {/* Invoice ID — auto-assigned per client by the database */}
          <div className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Invoice ID
            </span>
            <span className="text-sm font-medium italic text-gray-400">(auto assigned)</span>
          </div>

          {mode === 'progress' &&
            (loading ? (
              <div className="py-8 text-center text-sm text-gray-400">Loading modules…</div>
            ) : modules.length === 0 ? (
              <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-8 text-center text-sm text-gray-500">
                No sold bid with estimate modules was found for this job. Switch to{' '}
                <button
                  onClick={() => setMode('manual')}
                  className="font-semibold text-green-700 underline"
                >
                  Manual Invoice
                </button>{' '}
                to bill an ad-hoc amount.
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
                      <Fragment key={proj}>
                        <tr className="bg-gray-100">
                          <td
                            colSpan={5}
                            className="px-3 py-1.5 text-xs font-semibold text-gray-600"
                          >
                            {proj}
                          </td>
                        </tr>
                        {projLines.map(l => (
                          <tr key={l.id} className="border-b border-gray-100">
                            <td className="px-3 py-2 text-gray-800">{l.module_name}</td>
                            <td className="px-3 py-2 text-right text-gray-600">
                              {money(l.amount)}
                            </td>
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
                      </Fragment>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-50">
                      <td
                        colSpan={4}
                        className="px-3 py-2.5 text-right text-sm font-semibold text-gray-600"
                      >
                        New Invoice Total
                      </td>
                      <td className="px-3 py-2.5 text-right text-base font-bold text-gray-900">
                        {money(invoiceTotal)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            ))}

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
            </div>
          )}

          {/* Description — visible to the client in their portal */}
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
              Description <span className="font-normal normal-case text-gray-400">(the client sees this)</span>
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
              placeholder="What this invoice covers — shown to the client on their invoice."
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-green-600 focus:outline-none"
            />
          </div>

          {/* Attachments */}
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
              Attachments
            </label>
            <div className="space-y-2 rounded-xl border border-gray-200 p-3">
              {files.length === 0 && (
                <p className="text-xs text-gray-400">
                  No files attached. The client can download anything you add here.
                </p>
              )}
              {files.map((f, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-1.5"
                >
                  <span className="truncate text-sm text-gray-700">
                    {f.name}{' '}
                    <span className="text-xs text-gray-400">{fileSizeLabel(f.size)}</span>
                  </span>
                  <button
                    onClick={() => setFiles(prev => prev.filter((_, j) => j !== i))}
                    className="ml-3 text-xs font-semibold text-red-500 hover:text-red-700"
                  >
                    Remove
                  </button>
                </div>
              ))}
              <input ref={fileInputRef} type="file" multiple onChange={addFiles} className="hidden" />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50"
              >
                + Add file
              </button>
            </div>
          </div>
        </div>

        {/* footer */}
        <div className="flex justify-end gap-2 border-t border-gray-200 px-5 py-3">
          <button
            onClick={onClose}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
          >
            Cancel
          </button>
          {mode === 'progress' ? (
            <button
              onClick={() => setConfirmOpen(true)}
              disabled={busy || loading || invoiceTotal <= 0}
              className="rounded-lg bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-800 disabled:opacity-50"
            >
              {busy ? 'Creating…' : 'Create Invoice'}
            </button>
          ) : (
            <button
              onClick={createManualInvoice}
              disabled={busy}
              className="rounded-lg bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-800 disabled:opacity-50"
            >
              {busy ? 'Creating…' : 'Create Manual Invoice'}
            </button>
          )}
        </div>
      </div>

      {/* create-invoice confirmation */}
      {confirmOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 px-4"
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
