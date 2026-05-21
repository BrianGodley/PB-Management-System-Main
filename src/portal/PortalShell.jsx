// src/portal/PortalShell.jsx
//
// The authenticated client portal (/client-portal). Confirms the visitor is an
// active portal user, then renders a header + a permission-driven tab bar.
// Each tab pulls its data through a security-definer portal_* RPC that is
// scoped to this client and gated by the matching permission flag.
//
// Phase 1: read-only Client Information / Schedule / Daily Logs / Change
// Orders, plus an Invoices table. The payment modal UI is in place; live
// Helcim card/ACH processing is wired in a later phase.
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

// ── helpers ──────────────────────────────────────────────────────────────────
const pick = (o, ...keys) => {
  for (const k of keys) {
    const v = o?.[k]
    if (v !== null && v !== undefined && v !== '') return v
  }
  return null
}
const money = v => {
  const n = Number(v)
  return Number.isFinite(n) && v !== null && v !== ''
    ? n.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
    : '—'
}
const dateStr = v => {
  if (!v) return '—'
  const d = new Date(v)
  return isNaN(d.getTime())
    ? '—'
    : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function Loading({ label }) {
  return <p className="py-10 text-center text-sm text-gray-400">{label || 'Loading…'}</p>
}
function Empty({ label }) {
  return <p className="py-10 text-center text-sm text-gray-400">{label}</p>
}

// Staff preview: /client-portal?preview=<clientId> renders the portal for that
// client. The portal_* RPCs take an optional p_client_id only staff may use.
function previewClientId() {
  return new URLSearchParams(window.location.search).get('preview') || null
}
function rpcArgs() {
  const p = previewClientId()
  return p ? { p_client_id: p } : {}
}

// ── Client Information ───────────────────────────────────────────────────────
function ClientInfoView({ client, jobs }) {
  const name =
    pick(client, 'name') ||
    [pick(client, 'first_name'), pick(client, 'last_name')].filter(Boolean).join(' ') ||
    pick(client, 'company_name') ||
    '—'
  const rows = [
    ['Name', name],
    ['Company', pick(client, 'company_name')],
    ['Email', pick(client, 'email')],
    ['Phone', pick(client, 'phone')],
    [
      'Address',
      [pick(client, 'street'), pick(client, 'city'), pick(client, 'state'), pick(client, 'zip')]
        .filter(Boolean)
        .join(', '),
    ],
  ]
  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
          Your Information
        </p>
        <div className="space-y-2">
          {rows.map(([label, val]) => (
            <div key={label} className="grid grid-cols-3 gap-2">
              <span className="text-xs text-gray-400">{label}</span>
              <span className="col-span-2 text-sm text-gray-800">{val || '—'}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
          Your Projects
        </p>
        {jobs.length === 0 ? (
          <p className="text-sm text-gray-400">No projects on file.</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {jobs.map(j => (
              <div key={j.id} className="flex items-center justify-between py-2">
                <span className="text-sm text-gray-800">{pick(j, 'name', 'client_name') || 'Project'}</span>
                <span className="text-xs text-gray-400">{pick(j, 'status') || ''}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Schedule (read-only month calendar board) ────────────────────────────────
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function dayKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate()
  ).padStart(2, '0')}`
}
function parseDay(v) {
  if (!v) return null
  const d = new Date(v)
  return isNaN(d.getTime()) ? null : new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

function ScheduleView() {
  const [rows, setRows] = useState(null)
  const [month, setMonth] = useState(() => {
    const n = new Date()
    return new Date(n.getFullYear(), n.getMonth(), 1)
  })
  useEffect(() => {
    supabase.rpc('portal_schedule', rpcArgs()).then(({ data }) => setRows(data || []))
  }, [])
  if (rows === null) return <Loading />

  // 6-week (42-day) grid covering the displayed month.
  const first = new Date(month.getFullYear(), month.getMonth(), 1)
  const gridStart = new Date(first)
  gridStart.setDate(1 - first.getDay())
  const days = []
  for (let i = 0; i < 42; i++) {
    const d = new Date(gridStart)
    d.setDate(gridStart.getDate() + i)
    days.push(d)
  }

  // Index schedule items onto every day their start..end range covers.
  const itemsByDay = {}
  for (const s of rows) {
    const start = parseDay(pick(s, 'start_date'))
    if (!start) continue
    const end = parseDay(pick(s, 'end_date')) || start
    const cur = new Date(start)
    let guard = 0
    while (cur <= end && guard < 400) {
      const k = dayKey(cur)
      ;(itemsByDay[k] = itemsByDay[k] || []).push(s)
      cur.setDate(cur.getDate() + 1)
      guard++
    }
  }

  const monthLabel = month.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  const shift = n => setMonth(new Date(month.getFullYear(), month.getMonth() + n, 1))
  const todayKey = dayKey(new Date())

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <button
          onClick={() => shift(-1)}
          className="rounded-lg px-3 py-1 text-lg text-gray-500 hover:bg-gray-100"
        >
          ‹
        </button>
        <p className="text-sm font-semibold text-gray-800">{monthLabel}</p>
        <button
          onClick={() => shift(1)}
          className="rounded-lg px-3 py-1 text-lg text-gray-500 hover:bg-gray-100"
        >
          ›
        </button>
      </div>
      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-lg bg-gray-200">
        {WEEKDAYS.map(w => (
          <div key={w} className="bg-gray-50 py-1.5 text-center text-xs font-semibold text-gray-500">
            {w}
          </div>
        ))}
        {days.map(d => {
          const k = dayKey(d)
          const inMonth = d.getMonth() === month.getMonth()
          const items = itemsByDay[k] || []
          return (
            <div
              key={k}
              className={`min-h-[78px] p-1 ${inMonth ? 'bg-white' : 'bg-gray-50'}`}
            >
              <div
                className={`text-xs ${
                  k === todayKey
                    ? 'font-bold text-green-700'
                    : inMonth
                      ? 'text-gray-500'
                      : 'text-gray-300'
                }`}
              >
                {d.getDate()}
              </div>
              <div className="mt-0.5 space-y-0.5">
                {items.slice(0, 3).map((s, i) => (
                  <div
                    key={i}
                    title={pick(s, 'title', 'name') || ''}
                    className="truncate rounded bg-green-100 px-1 py-0.5 text-[10px] text-green-800"
                  >
                    {pick(s, 'title', 'name') || 'Scheduled'}
                  </div>
                ))}
                {items.length > 3 && (
                  <div className="text-[10px] text-gray-400">+{items.length - 3} more</div>
                )}
              </div>
            </div>
          )
        })}
      </div>
      {rows.length === 0 && (
        <p className="mt-3 text-center text-xs text-gray-400">No schedule items yet.</p>
      )}
    </div>
  )
}

// ── Daily Logs ───────────────────────────────────────────────────────────────
function DailyLogsView() {
  const [rows, setRows] = useState(null)
  useEffect(() => {
    supabase.rpc('portal_daily_logs', rpcArgs()).then(({ data }) => setRows(data || []))
  }, [])
  if (rows === null) return <Loading />
  if (rows.length === 0) return <Empty label="No daily logs yet." />
  return (
    <div className="space-y-3">
      {rows.map(d => (
        <div key={d.id} className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="mb-1 flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-800">
              {dateStr(pick(d, 'log_date', 'created_at'))}
            </span>
            <span className="text-xs text-gray-400">
              {[pick(d, 'author'), pick(d, 'weather')].filter(Boolean).join(' · ')}
            </span>
          </div>
          <p className="whitespace-pre-wrap text-sm text-gray-600">
            {pick(d, 'notes', 'description') || '—'}
          </p>
        </div>
      ))}
    </div>
  )
}

// ── Change Orders ────────────────────────────────────────────────────────────
function ChangeOrdersView() {
  const [rows, setRows] = useState(null)
  useEffect(() => {
    supabase.rpc('portal_change_orders', rpcArgs()).then(({ data }) => setRows(data || []))
  }, [])
  if (rows === null) return <Loading />
  if (rows.length === 0) return <Empty label="No change orders yet." />
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
          <tr>
            <th className="px-4 py-2.5">CO #</th>
            <th className="px-4 py-2.5">Title</th>
            <th className="px-4 py-2.5">Amount</th>
            <th className="px-4 py-2.5">Status</th>
            <th className="px-4 py-2.5">Date</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map(b => (
            <tr key={b.id}>
              <td className="px-4 py-2.5 text-gray-800">{pick(b, 'custom_co_id', 'id') || '—'}</td>
              <td className="px-4 py-2.5 text-gray-800">{pick(b, 'title', 'name', 'project_name') || '—'}</td>
              <td className="px-4 py-2.5 text-gray-600">{money(pick(b, 'bid_amount', 'amount'))}</td>
              <td className="px-4 py-2.5 text-gray-600 capitalize">{pick(b, 'status') || '—'}</td>
              <td className="px-4 py-2.5 text-gray-600">{dateStr(pick(b, 'created_at'))}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── Invoices ─────────────────────────────────────────────────────────────────
function invoiceStatus(inv) {
  const paid = String(pick(inv, 'status') || '').toLowerCase()
  if (paid === 'paid') return { label: 'Paid', cls: 'bg-gray-100 text-gray-500', payable: false }
  const due = pick(inv, 'due_date')
  if (!due) return { label: 'Not due', cls: 'bg-blue-50 text-blue-600', payable: true }
  const d = new Date(due)
  d.setHours(0, 0, 0, 0)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  if (d.getTime() > today.getTime())
    return { label: 'Not due', cls: 'bg-blue-50 text-blue-600', payable: true }
  if (d.getTime() === today.getTime())
    return { label: 'Currently due', cls: 'bg-amber-100 text-amber-700', payable: true }
  return { label: 'Past due', cls: 'bg-red-100 text-red-700', payable: true }
}

function InvoicesView({ jobs, client }) {
  const [rows, setRows] = useState(null)
  const [payInv, setPayInv] = useState(null)
  useEffect(() => {
    supabase.rpc('portal_invoices', rpcArgs()).then(({ data }) => setRows(data || []))
  }, [])
  const jobsById = Object.fromEntries(jobs.map(j => [j.id, j]))
  if (rows === null) return <Loading />
  if (rows.length === 0) return <Empty label="No invoices yet." />
  return (
    <>
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-4 py-2.5">Invoice #</th>
              <th className="px-4 py-2.5">Created</th>
              <th className="px-4 py-2.5">Title</th>
              <th className="px-4 py-2.5">Balance Due</th>
              <th className="px-4 py-2.5">Date Due</th>
              <th className="px-4 py-2.5">Status</th>
              <th className="px-4 py-2.5 text-right">&nbsp;</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map(inv => {
              const st = invoiceStatus(inv)
              return (
                <tr key={inv.id}>
                  <td className="px-4 py-2.5 font-medium text-gray-800">
                    {pick(inv, 'invoice_number', 'number', 'id') || '—'}
                  </td>
                  <td className="px-4 py-2.5 text-gray-600">{dateStr(pick(inv, 'invoice_date', 'created_at'))}</td>
                  <td className="px-4 py-2.5 text-gray-800">
                    {pick(inv, 'title', 'name', 'memo', 'description') || '—'}
                  </td>
                  <td className="px-4 py-2.5 text-gray-800">
                    {money(pick(inv, 'balance_due', 'balance', 'amount_due', 'total', 'amount'))}
                  </td>
                  <td className="px-4 py-2.5 text-gray-600">{dateStr(pick(inv, 'due_date'))}</td>
                  <td className="px-4 py-2.5">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${st.cls}`}>
                      {st.label}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    {st.payable && (
                      <button
                        onClick={() => setPayInv(inv)}
                        className="rounded-lg bg-green-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-800"
                      >
                        Pay
                      </button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {payInv && (
        <PaymentModal
          invoice={payInv}
          job={jobsById[payInv.job_id]}
          client={client}
          onClose={() => setPayInv(null)}
        />
      )}
    </>
  )
}

// ── Payment modal ────────────────────────────────────────────────────────────
// Loads Helcim's hosted HelcimPay.js script once.
function loadHelcimPay() {
  return new Promise((resolve, reject) => {
    if (window.appendHelcimPayIframe) return resolve()
    let s = document.getElementById('helcim-pay-js')
    if (!s) {
      s = document.createElement('script')
      s.id = 'helcim-pay-js'
      s.src = 'https://secure.helcim.app/helcim-pay/services/start.js'
      document.head.appendChild(s)
    }
    s.addEventListener('load', () => resolve())
    s.addEventListener('error', () => reject(new Error('Could not load the secure payment form.')))
  })
}

function PaymentModal({ invoice, job, client, onClose }) {
  const [method, setMethod] = useState(null) // 'card' | 'ach'
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  const clientName =
    pick(client, 'name') ||
    [pick(client, 'first_name'), pick(client, 'last_name')].filter(Boolean).join(' ') ||
    pick(client, 'company_name') ||
    '\u2014'
  const balance = money(pick(invoice, 'balance_due', 'balance', 'amount_due', 'total', 'amount'))
  const info = [
    ['Project', pick(job, 'name', 'client_name')],
    ['Invoice', pick(invoice, 'title', 'name', 'memo')],
    ['Invoice #', pick(invoice, 'invoice_number', 'number', 'id')],
    ['Client', clientName],
    ['Invoice Date', dateStr(pick(invoice, 'invoice_date', 'created_at'))],
    ['Due Date', dateStr(pick(invoice, 'due_date'))],
  ]

  async function startPayment() {
    setBusy(true)
    setError('')
    try {
      // 1) Initialize the checkout server-side (amount is authoritative there).
      const { data, error: fe } = await supabase.functions.invoke('helcim-checkout', {
        body: { invoice_id: invoice.id },
      })
      if (fe || !data?.checkoutToken) {
        throw new Error(data?.error || fe?.message || 'Could not start the payment.')
      }
      const { checkoutToken, amount } = data

      // 2) Load HelcimPay.js.
      await loadHelcimPay()

      // 3) Listen for the hosted-checkout result.
      const handler = async event => {
        if (!event.data || event.data.eventName !== `helcim-pay-js-${checkoutToken}`) return
        if (event.data.eventStatus === 'ABORTED') {
          window.removeEventListener('message', handler)
          window.removeHelcimPayIframe?.()
          setBusy(false)
          return
        }
        if (event.data.eventStatus === 'SUCCESS') {
          window.removeEventListener('message', handler)
          let txnId = null
          try {
            const parsed = JSON.parse(event.data.eventMessage)
            const d = parsed?.data?.data || parsed?.data || parsed
            txnId = d?.transactionId || d?.id || null
          } catch {
            /* leave txnId null */
          }
          const { data: rec, error: re } = await supabase.rpc('portal_record_payment', {
            p_invoice_id: invoice.id,
            p_amount: amount,
            p_transaction_id: txnId ? String(txnId) : null,
            p_method: method === 'ach' ? 'Bank Transfer' : 'Credit Card',
          })
          window.removeHelcimPayIframe?.()
          setBusy(false)
          if (re || rec !== 'recorded') {
            setError(
              'Your payment went through, but recording it in the portal failed — please contact us so we can reconcile it.'
            )
            return
          }
          setDone(true)
        }
      }
      window.addEventListener('message', handler)

      // 4) Open Helcim's secure modal.
      window.appendHelcimPayIframe(checkoutToken)
    } catch (e) {
      setBusy(false)
      setError(String(e?.message || e))
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onMouseDown={e => e.target === e.currentTarget && !busy && onClose()}
    >
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-xl">
        {/* Company header */}
        <div className="flex items-center gap-2 bg-[#3A5038] px-5 py-4">
          <span className="text-2xl">🌿</span>
          <div>
            <p className="text-sm font-bold text-white">Picture Build System</p>
            <p className="text-xs text-white/70">Invoice Payment</p>
          </div>
        </div>

        {done ? (
          <div className="space-y-3 px-5 py-8 text-center">
            <p className="text-3xl">✅</p>
            <p className="text-base font-semibold text-gray-900">Payment received</p>
            <p className="text-sm text-gray-600">
              Thank you — your payment of {balance} has been recorded. It will show in your
              Payments tab.
            </p>
            <button
              onClick={onClose}
              className="mt-2 rounded-lg bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-800"
            >
              Done
            </button>
          </div>
        ) : (
          <div className="space-y-4 px-5 py-4">
            {/* Invoice summary */}
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
              {info.map(([label, val]) => (
                <div key={label} className="flex justify-between py-0.5 text-xs">
                  <span className="text-gray-400">{label}</span>
                  <span className="font-medium text-gray-700">{val || '\u2014'}</span>
                </div>
              ))}
              <div className="mt-2 flex justify-between border-t border-gray-200 pt-2">
                <span className="text-sm font-semibold text-gray-600">Balance Due</span>
                <span className="text-sm font-bold text-gray-900">{balance}</span>
              </div>
            </div>

            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
                {error}
              </div>
            )}

            {/* Method choice */}
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                Payment Method
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setMethod('card')}
                  disabled={busy}
                  className={`rounded-lg border px-3 py-2.5 text-sm font-semibold transition-colors ${
                    method === 'card'
                      ? 'border-green-600 bg-green-50 text-green-700'
                      : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  Credit Card
                </button>
                <button
                  onClick={() => setMethod('ach')}
                  disabled={busy}
                  className={`rounded-lg border px-3 py-2.5 text-sm font-semibold transition-colors ${
                    method === 'ach'
                      ? 'border-green-600 bg-green-50 text-green-700'
                      : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  Bank Transfer (ACH)
                </button>
              </div>
            </div>

            <p className="text-xs text-gray-400">
              Payment details are entered in Helcim's secure window — they never touch this site.
            </p>

            <div className="flex justify-end gap-2 pt-1">
              <button
                onClick={onClose}
                disabled={busy}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={startPayment}
                disabled={!method || busy}
                className="rounded-lg bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-800 disabled:opacity-50"
              >
                {busy ? 'Opening secure checkout…' : 'Continue to Payment'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Payments (read-only) ─────────────────────────────────────────────────────
function PaymentsView() {
  const [rows, setRows] = useState(null)
  useEffect(() => {
    supabase.rpc('portal_payments', rpcArgs()).then(({ data }) => setRows(data || []))
  }, [])
  if (rows === null) return <Loading />
  if (rows.length === 0) return <Empty label="No payments recorded yet." />
  const total = rows.reduce((s, p) => s + (Number(p.amount) || 0), 0)
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
          <tr>
            <th className="px-4 py-2.5">Date</th>
            <th className="px-4 py-2.5">Method</th>
            <th className="px-4 py-2.5">Status</th>
            <th className="px-4 py-2.5 text-right">Amount</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map(p => (
            <tr key={p.id}>
              <td className="px-4 py-2.5 text-gray-600">{dateStr(pick(p, 'payment_date'))}</td>
              <td className="px-4 py-2.5 text-gray-600">{pick(p, 'method') || '\u2014'}</td>
              <td className="px-4 py-2.5 text-gray-600">{pick(p, 'status') || '\u2014'}</td>
              <td className="px-4 py-2.5 text-right font-medium text-gray-900">
                {money(pick(p, 'amount'))}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="bg-gray-50">
            <td colSpan={3} className="px-4 py-2.5 text-right text-sm font-semibold text-gray-600">
              Total Paid
            </td>
            <td className="px-4 py-2.5 text-right text-base font-bold text-gray-900">
              {money(total)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}

// ── Shell ────────────────────────────────────────────────────
const ALL_TABS = [
  { key: 'info', label: 'Client Information', perm: null },
  { key: 'schedule', label: 'Schedule', perm: 'perm_schedule' },
  { key: 'logs', label: 'Daily Logs', perm: 'perm_daily_logs' },
  { key: 'cos', label: 'Change Orders', perm: 'perm_change_orders' },
  { key: 'invoices', label: 'Invoices', perm: 'perm_invoices' },
  { key: 'payments', label: 'Payments', perm: 'perm_invoices' },
]

export default function PortalShell() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [portal, setPortal] = useState(null)
  const [client, setClient] = useState(null)
  const [jobs, setJobs] = useState([])
  const [tab, setTab] = useState('info')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session) {
        navigate('/client-portal/login')
        return
      }
      const pv = previewClientId()
      const { data: p } = pv
        ? await supabase.from('client_portals').select('*').eq('client_id', pv).maybeSingle()
        : await supabase
            .from('client_portals')
            .select('*')
            .eq('auth_user_id', session.user.id)
            .eq('status', 'active')
            .maybeSingle()
      if (cancelled) return
      if (!p) {
        navigate('/client-portal/login')
        return
      }
      const [{ data: c }, { data: js }] = await Promise.all([
        supabase.rpc('portal_client_info', rpcArgs()),
        supabase.rpc('portal_jobs', rpcArgs()),
      ])
      if (cancelled) return
      setPortal(p)
      setClient(c || null)
      setJobs(js || [])
      setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [navigate])

  async function signOut() {
    await supabase.auth.signOut()
    navigate('/client-portal/login')
  }

  if (loading)
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100">
        <p className="text-sm text-gray-400">Loading your portal…</p>
      </div>
    )

  const tabs = ALL_TABS.filter(t => !t.perm || portal?.[t.perm])
  const activeTab = tabs.some(t => t.key === tab) ? tab : tabs[0]?.key

  return (
    <div className="min-h-screen bg-gray-100">
      {previewClientId() && (
        <div className="bg-amber-400 px-4 py-1.5 text-center text-xs font-semibold text-amber-900">
          Staff preview — this is the client's view of their portal
        </div>
      )}
      {/* Header */}
      <header className="bg-[#3A5038]">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🌿</span>
            <div>
              <p className="text-sm font-bold text-white">Picture Build System</p>
              <p className="text-xs text-white/70">Client Portal</p>
            </div>
          </div>
          <button
            onClick={signOut}
            className="rounded-lg border border-white/30 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/10"
          >
            Sign Out
          </button>
        </div>
        {/* Tab bar — across the middle */}
        <div className="mx-auto flex max-w-5xl gap-1 px-3">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`rounded-t-lg px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === t.key
                  ? 'bg-gray-100 text-gray-900'
                  : 'text-white/80 hover:bg-white/10'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-5xl px-5 py-6">
        {activeTab === 'info' && <ClientInfoView client={client} jobs={jobs} />}
        {activeTab === 'schedule' && <ScheduleView />}
        {activeTab === 'logs' && <DailyLogsView />}
        {activeTab === 'cos' && <ChangeOrdersView />}
        {activeTab === 'invoices' && <InvoicesView jobs={jobs} client={client} />}
        {activeTab === 'payments' && <PaymentsView />}
      </main>
    </div>
  )
}
