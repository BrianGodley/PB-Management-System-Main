// src/components/JobInvoiceDetailModal.jsx
//
// Invoice detail / edit / delete modal. Opened by clicking an invoice number
// in the Finance tables (or via a deep-link from the all-jobs view).
//
// Staff can edit the title, client-visible description, amount, due date and
// status, manage attachments, and delete the invoice. Delete is blocked when
// payments have been recorded — void it instead so the payment history stays
// intact.
import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import {
  listInvoiceFiles,
  uploadInvoiceFile,
  deleteInvoiceFile,
  invoiceFileUrl,
  fileSizeLabel,
} from '../lib/invoiceFiles'

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
const STATUSES = ['draft', 'sent', 'paid', 'void']

export default function JobInvoiceDetailModal({ invoiceId, onClose, onChanged }) {
  const [loading, setLoading] = useState(true)
  const [inv, setInv] = useState(null)
  const [lines, setLines] = useState([])
  const [attachments, setAttachments] = useState([])
  const [payCount, setPayCount] = useState(0)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  // edit fields
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [status, setStatus] = useState('draft')
  const fileInputRef = useRef(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    const { data, error: e } = await supabase
      .from('job_invoices')
      .select('*, job_invoice_lines(*)')
      .eq('id', invoiceId)
      .maybeSingle()
    if (e || !data) {
      setError(e?.message || 'Invoice not found.')
      setLoading(false)
      return
    }
    setInv(data)
    setLines(data.job_invoice_lines || [])
    setTitle(data.title || '')
    setDescription(data.description || '')
    setAmount(data.amount != null ? String(data.amount) : '')
    setDueDate(data.due_date || '')
    setStatus(data.status || 'draft')
    const { count } = await supabase
      .from('job_invoice_payments')
      .select('id', { count: 'exact', head: true })
      .eq('invoice_id', invoiceId)
    setPayCount(count || 0)
    const { data: atts } = await listInvoiceFiles(invoiceId)
    setAttachments(atts)
    setLoading(false)
  }, [invoiceId])

  useEffect(() => {
    if (invoiceId) load()
  }, [invoiceId, load])

  async function save() {
    setBusy(true)
    setError('')
    const { error: e } = await supabase
      .from('job_invoices')
      .update({
        title: title.trim() || null,
        description: description.trim() || null,
        amount: num(amount),
        due_date: dueDate || null,
        status,
      })
      .eq('id', invoiceId)
    setBusy(false)
    if (e) {
      setError(e.message)
      return
    }
    onChanged?.(`Invoice ${inv?.invoice_number || ''} updated.`)
  }

  async function handleDelete() {
    setBusy(true)
    setError('')
    // Remove attachments from Storage + their job_files rows.
    for (const a of attachments) {
      await deleteInvoiceFile(a)
    }
    await supabase.from('job_invoice_lines').delete().eq('invoice_id', invoiceId)
    const { error: e } = await supabase.from('job_invoices').delete().eq('id', invoiceId)
    setBusy(false)
    if (e) {
      setError(e.message)
      setConfirmDelete(false)
      return
    }
    onChanged?.(`Invoice ${inv?.invoice_number || ''} deleted.`)
  }

  async function addFiles(e) {
    const picked = Array.from(e.target.files || [])
    if (fileInputRef.current) fileInputRef.current.value = ''
    if (!picked.length) return
    setBusy(true)
    setError('')
    const { data: u } = await supabase.auth.getUser()
    for (const f of picked) {
      const { error: ue } = await uploadInvoiceFile(invoiceId, inv.job_id, f, u?.user?.id)
      if (ue) setError(`Upload failed: ${ue.message}`)
    }
    const { data: atts } = await listInvoiceFiles(invoiceId)
    setAttachments(atts)
    setBusy(false)
  }

  async function removeAttachment(a) {
    if (!confirm(`Remove "${a.file_name}"?`)) return
    setBusy(true)
    await deleteInvoiceFile(a)
    setAttachments(prev => prev.filter(x => x.id !== a.id))
    setBusy(false)
  }

  async function openAttachment(a) {
    const url = await invoiceFileUrl(a.storage_path)
    if (url) window.open(url, '_blank', 'noopener')
    else setError('Could not open that file.')
  }

  const paid = num(inv?.amount_paid)
  const hasPayments = payCount > 0 || paid > 0
  const balance = num(inv?.amount) - paid

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onMouseDown={e => e.target === e.currentTarget && !busy && onClose()}
    >
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        {/* header */}
        <div className="flex items-start justify-between border-b border-gray-200 px-5 py-4">
          <div>
            <h2 className="text-base font-bold text-gray-900">
              Invoice {inv?.invoice_number || ''}
            </h2>
            <p className="text-xs text-gray-500">
              Invoice ID: {inv?.invoice_number || '—'}
              {inv && (
                <>
                  {' · '}
                  {money(inv.amount)} · {money(paid)} paid · {money(balance)} balance
                </>
              )}
            </p>
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

        {/* body */}
        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
              {error}
            </div>
          )}

          {loading ? (
            <div className="py-10 text-center text-sm text-gray-400">Loading invoice…</div>
          ) : !inv ? (
            <div className="py-10 text-center text-sm text-gray-400">Invoice not found.</div>
          ) : (
            <>
              <div>
                <label className="mb-1 block text-xs text-gray-400">Title</label>
                <input
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-green-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs text-gray-400">
                  Description <span className="text-gray-300">(the client sees this)</span>
                </label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  rows={3}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-green-600 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="mb-1 block text-xs text-gray-400">Amount</label>
                  <input
                    type="number"
                    min="0"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-green-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-gray-400">Due Date</label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={e => setDueDate(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-green-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-gray-400">Status</label>
                  <select
                    value={status}
                    onChange={e => setStatus(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm capitalize focus:border-green-600 focus:outline-none"
                  >
                    {STATUSES.map(s => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {lines.length > 0 && (
                <div>
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Module Lines
                  </p>
                  <div className="overflow-hidden rounded-xl border border-gray-200">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                        <tr>
                          <th className="px-3 py-2">Module</th>
                          <th className="px-3 py-2 text-right">% Billed</th>
                          <th className="px-3 py-2 text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {lines.map(l => (
                          <tr key={l.id}>
                            <td className="px-3 py-2 text-gray-700">
                              {l.module_name}
                              <span className="text-gray-400"> · {l.project_name}</span>
                            </td>
                            <td className="px-3 py-2 text-right text-gray-600">
                              {num(l.this_pct).toFixed(1)}%
                            </td>
                            <td className="px-3 py-2 text-right font-medium text-gray-900">
                              {money(l.line_amount)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Attachments */}
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Attachments
                </p>
                <div className="space-y-2 rounded-xl border border-gray-200 p-3">
                  {attachments.length === 0 && (
                    <p className="text-xs text-gray-400">
                      No attachments. Files you add here can be downloaded by the client.
                    </p>
                  )}
                  {attachments.map(a => (
                    <div
                      key={a.id}
                      className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-1.5"
                    >
                      <button
                        onClick={() => openAttachment(a)}
                        className="truncate text-left text-sm font-medium text-green-700 hover:underline"
                      >
                        {a.file_name}{' '}
                        <span className="text-xs font-normal text-gray-400">
                          {fileSizeLabel(a.file_size)}
                        </span>
                      </button>
                      <button
                        onClick={() => removeAttachment(a)}
                        disabled={busy}
                        className="ml-3 text-xs font-semibold text-red-500 hover:text-red-700 disabled:opacity-40"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    onChange={addFiles}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={busy}
                    className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-40"
                  >
                    + Add file
                  </button>
                </div>
              </div>

              <p className="text-xs text-gray-400">Created {dateStr(inv.created_at)}</p>
            </>
          )}
        </div>

        {/* footer */}
        {!loading && inv && (
          <div className="flex items-center justify-between border-t border-gray-200 px-5 py-3">
            <button
              onClick={() => setConfirmDelete(true)}
              disabled={busy}
              className="rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-40"
            >
              Delete
            </button>
            <div className="flex gap-2">
              <button
                onClick={onClose}
                disabled={busy}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                onClick={save}
                disabled={busy}
                className="rounded-lg bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-800 disabled:opacity-50"
              >
                {busy ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* delete confirmation */}
      {confirmDelete && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 px-4"
          onMouseDown={e => e.target === e.currentTarget && setConfirmDelete(false)}
        >
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
            {hasPayments ? (
              <>
                <p className="text-sm font-semibold text-gray-900">Can't delete this invoice</p>
                <p className="mt-1 text-sm text-gray-600">
                  This invoice has payments recorded against it. Set its status to{' '}
                  <span className="font-semibold">void</span> instead so the payment history
                  stays intact.
                </p>
                <div className="mt-4 flex justify-end">
                  <button
                    onClick={() => setConfirmDelete(false)}
                    className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
                  >
                    OK
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm font-semibold text-gray-900">Delete this invoice?</p>
                <p className="mt-1 text-sm text-gray-600">
                  Invoice {inv?.invoice_number} and its {lines.length} line(s) and{' '}
                  {attachments.length} attachment(s) will be permanently removed. This can't be
                  undone.
                </p>
                <div className="mt-4 flex justify-end gap-2">
                  <button
                    onClick={() => setConfirmDelete(false)}
                    className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={busy}
                    className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                  >
                    {busy ? 'Deleting…' : 'Delete Invoice'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
