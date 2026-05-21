// src/components/JobPaymentEntryModal.jsx
//
// Staff "+ Payment" modal — records a payment taken outside the client portal
// (in-person credit card, bank transfer, or check). Styled after Helcim's
// hosted checkout: a details form on the left, a payment summary card on the
// right. Recorded payments are tagged source 'direct' (vs. 'portal').
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const num = v => {
  const n = parseFloat(v)
  return Number.isFinite(n) ? n : 0
}
const money = v => num(v).toLocaleString('en-US', { style: 'currency', currency: 'USD' })

const METHOD_LABEL = { card: 'Credit Card', bank: 'Bank Transfer', check: 'Check' }
const REF_LABEL = {
  card: 'Card last 4 / auth #',
  bank: 'Reference #',
  check: 'Check #',
}

export default function JobPaymentEntryModal({ job, onClose, onSaved }) {
  const [invoices, setInvoices] = useState(null)
  const [invoiceId, setInvoiceId] = useState('')
  const [method, setMethod] = useState('card')
  const [amount, setAmount] = useState('')
  const [reference, setReference] = useState('')
  const [payDate, setPayDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  useEffect(() => {
    supabase
      .from('job_invoices')
      .select('id, invoice_number, title, amount, amount_paid, status')
      .eq('job_id', job.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        const list = (data || []).filter(i => i.status !== 'void')
        setInvoices(list)
        const open = list.find(i => num(i.amount) - num(i.amount_paid) > 0.005) || list[0]
        if (open) {
          setInvoiceId(open.id)
          setAmount((num(open.amount) - num(open.amount_paid)).toFixed(2))
        }
      })
  }, [job.id])

  function pickInvoice(id) {
    setInvoiceId(id)
    const inv = (invoices || []).find(i => i.id === id)
    if (inv) setAmount((num(inv.amount) - num(inv.amount_paid)).toFixed(2))
  }

  async function save() {
    if (!invoiceId) {
      setError('Pick an invoice to apply this payment to.')
      return
    }
    if (num(amount) <= 0) {
      setError('Enter a payment amount.')
      return
    }
    setBusy(true)
    setError('')
    const { error: e1 } = await supabase.from('job_invoice_payments').insert({
      job_id: job.id,
      invoice_id: invoiceId,
      amount: num(amount),
      method: METHOD_LABEL[method],
      status: 'completed',
      payment_date: payDate || new Date().toISOString().slice(0, 10),
      source: 'direct',
      transaction_id: reference.trim() || null,
    })
    if (e1) {
      setBusy(false)
      setError(e1.message)
      return
    }
    // Recompute the invoice balance.
    const { data: pays } = await supabase
      .from('job_invoice_payments')
      .select('amount')
      .eq('invoice_id', invoiceId)
    const paid = (pays || []).reduce((s, p) => s + num(p.amount), 0)
    const inv = (invoices || []).find(i => i.id === invoiceId)
    const fullyPaid = inv && paid >= num(inv.amount) - 0.005
    await supabase
      .from('job_invoices')
      .update({
        amount_paid: paid,
        ...(fullyPaid ? { status: 'paid', paid_date: payDate } : {}),
      })
      .eq('id', invoiceId)
    setBusy(false)
    setDone(true)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onMouseDown={e => e.target === e.currentTarget && !busy && onClose()}
    >
      <div className="w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl">
        {/* header */}
        <div className="flex items-center gap-3 border-b border-gray-200 px-5 py-3">
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-gray-500 hover:bg-gray-100"
            title="Close"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
          </button>
          <h2 className="text-base font-semibold text-gray-900">Record Payment</h2>
          <span className="ml-auto text-xs text-gray-400">{job?.name || job?.client_name}</span>
        </div>

        {done ? (
          <div className="space-y-3 px-5 py-12 text-center">
            <p className="text-4xl">✅</p>
            <p className="text-base font-semibold text-gray-900">Payment recorded</p>
            <p className="text-sm text-gray-600">
              {money(num(amount))} via {METHOD_LABEL[method]} has been applied to the invoice.
            </p>
            <button
              onClick={onSaved}
              className="mt-2 rounded-lg bg-green-700 px-5 py-2 text-sm font-semibold text-white hover:bg-green-800"
            >
              Done
            </button>
          </div>
        ) : (
          <div className="grid md:grid-cols-[1fr_300px]">
            {/* left — payment details */}
            <div className="space-y-4 p-5">
              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
                  {error}
                </div>
              )}

              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Apply to Invoice
                </p>
                {invoices === null ? (
                  <p className="text-sm text-gray-400">Loading invoices…</p>
                ) : invoices.length === 0 ? (
                  <p className="text-sm text-gray-400">This job has no invoices yet.</p>
                ) : (
                  <select
                    value={invoiceId}
                    onChange={e => pickInvoice(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-green-600 focus:outline-none"
                  >
                    <option value="">— Select an invoice —</option>
                    {invoices.map(i => {
                      const bal = num(i.amount) - num(i.amount_paid)
                      return (
                        <option key={i.id} value={i.id}>
                          {i.invoice_number || 'Invoice'} — {i.title || 'Untitled'} · balance{' '}
                          {money(bal)}
                        </option>
                      )
                    })}
                  </select>
                )}
              </div>

              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Payment Method
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {['card', 'bank', 'check'].map(m => (
                    <button
                      key={m}
                      onClick={() => setMethod(m)}
                      className={`rounded-lg border px-2 py-2.5 text-sm font-semibold transition-colors ${
                        method === m
                          ? 'border-green-600 bg-green-50 text-green-700'
                          : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {METHOD_LABEL[m]}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Amount
                  </p>
                  <div className="flex items-center rounded-lg border border-gray-200 focus-within:border-green-600">
                    <span className="pl-3 text-sm text-gray-400">$</span>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={amount}
                      onChange={e => setAmount(e.target.value.replace(/[^0-9.]/g, ''))}
                      placeholder="0.00"
                      className="w-full rounded-lg border-0 bg-transparent px-2 py-2 text-sm focus:outline-none"
                    />
                  </div>
                </div>
                <div>
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Payment Date
                  </p>
                  <input
                    type="date"
                    value={payDate}
                    onChange={e => setPayDate(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-green-600 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
                  {REF_LABEL[method]}{' '}
                  <span className="font-normal normal-case text-gray-400">(optional)</span>
                </p>
                <input
                  value={reference}
                  onChange={e => setReference(e.target.value)}
                  placeholder={method === 'check' ? 'e.g. 1042' : 'Reference'}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-green-600 focus:outline-none"
                />
              </div>
            </div>

            {/* right — summary card */}
            <div className="border-t border-gray-100 bg-gray-50 p-5 md:border-l md:border-t-0">
              <div className="rounded-2xl border border-gray-200 bg-white p-5 text-center shadow-sm">
                <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-green-100 to-emerald-50 text-2xl">
                  🌿
                </div>
                <p className="text-sm font-semibold text-gray-800">Picture Build System</p>
                <p className="text-xs text-gray-400">Record a payment</p>
                <div className="my-4 rounded-xl border border-gray-200 py-3">
                  <p className="text-xs text-gray-400">Payment amount (USD)</p>
                  <p className="text-2xl font-bold text-gray-900">{money(num(amount))}</p>
                </div>
                <button
                  onClick={save}
                  disabled={busy || invoices === null}
                  className="w-full rounded-lg bg-green-700 py-2.5 text-sm font-semibold text-white hover:bg-green-800 disabled:opacity-50"
                >
                  {busy ? 'Recording…' : `Record ${money(num(amount))}`}
                </button>
                <p className="mt-2 text-[11px] text-gray-400">
                  Recorded as a <span className="font-semibold">Direct</span> payment.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
