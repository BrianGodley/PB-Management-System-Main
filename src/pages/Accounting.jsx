import { useState, useEffect, Fragment } from 'react'
import { supabase } from '../lib/supabase'
import { fetchAllPaginated } from '../lib/fetchAll'
import { useCachedData } from '../lib/useCachedData'

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt = n => Number(n || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD' })
const fmtN = n =>
  Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const today = () => new Date().toISOString().slice(0, 10)
const addDays = (ds, n) => {
  const d = new Date(ds + 'T00:00:00')
  d.setDate(d.getDate() + n)
  return d.toISOString().slice(0, 10)
}
const fmtDate = ds =>
  ds
    ? new Date(ds + 'T00:00:00').toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : '—'
const isOverdue = (dueDate, status) =>
  dueDate && status !== 'paid' && status !== 'void' && new Date(dueDate + 'T00:00:00') < new Date()

const STATUS_COLORS = {
  draft: 'bg-gray-100 text-gray-600',
  sent: 'bg-blue-100 text-blue-700',
  open: 'bg-blue-100 text-blue-700',
  paid: 'bg-green-100 text-green-700',
  overdue: 'bg-red-100 text-red-700',
  void: 'bg-gray-100 text-gray-400',
}

const TYPE_COLORS = {
  asset: { bg: 'bg-blue-50', text: 'text-blue-700', label: 'Asset' },
  liability: { bg: 'bg-red-50', text: 'text-red-700', label: 'Liability' },
  equity: { bg: 'bg-purple-50', text: 'text-purple-700', label: 'Equity' },
  income: { bg: 'bg-green-50', text: 'text-green-700', label: 'Income' },
  cogs: { bg: 'bg-orange-50', text: 'text-orange-700', label: 'COGS' },
  expense: { bg: 'bg-yellow-50', text: 'text-yellow-700', label: 'Expense' },
}

const ACCOUNT_TYPES = ['asset', 'liability', 'equity', 'income', 'cogs', 'expense']
const PAYMENT_METHODS = ['Check', 'ACH', 'Credit Card', 'Cash', 'Wire Transfer', 'Zelle', 'Other']

// ── Reusable ModalOverlay ─────────────────────────────────────────────────────
function Modal({ children, onClose, wide = false }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onMouseDown={e => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className={`bg-white rounded-2xl shadow-2xl w-full flex flex-col ${wide ? 'max-w-4xl' : 'max-w-lg'}`}
        style={{ maxHeight: '92vh' }}
      >
        {children}
      </div>
    </div>
  )
}

// ── Confirm dialog ────────────────────────────────────────────────────────────
function useConfirm() {
  const [state, setState] = useState(null)
  const confirm = msg => new Promise(resolve => setState({ msg, resolve }))
  const dialog = state ? (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6">
        <p className="text-sm text-gray-700 mb-5">{state.msg}</p>
        <div className="flex gap-2 justify-end">
          <button
            onClick={() => {
              state.resolve(false)
              setState(null)
            }}
            className="px-4 py-2 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              state.resolve(true)
              setState(null)
            }}
            className="px-4 py-2 text-sm rounded-lg bg-red-600 text-white hover:bg-red-700"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  ) : null
  return { confirm, dialog }
}

// ═════════════════════════════════════════════════════════════════════════════
// DASHBOARD TAB
// ═════════════════════════════════════════════════════════════════════════════
function DashboardTab({ invoices, bills, bankAccounts, onNavigate }) {
  const totalCash = bankAccounts
    .filter(b => b.type !== 'credit_card')
    .reduce((s, b) => s + Number(b.current_balance), 0)
  const totalAR = invoices
    .filter(i => i.status !== 'paid' && i.status !== 'void')
    .reduce((s, i) => s + Number(i.balance_due), 0)
  const totalAP = bills
    .filter(b => b.status !== 'paid' && b.status !== 'void')
    .reduce((s, b) => s + Number(b.balance_due), 0)
  const overdueInv = invoices.filter(i => isOverdue(i.due_date, i.status))

  const metrics = [
    {
      label: 'Total Cash',
      value: fmt(totalCash),
      sub: `${bankAccounts.length} account${bankAccounts.length !== 1 ? 's' : ''}`,
      color: 'text-blue-700',
      bg: 'bg-blue-50',
      tab: 'banking',
    },
    {
      label: 'Outstanding Invoices',
      value: fmt(totalAR),
      sub: `${invoices.filter(i => i.status !== 'paid' && i.status !== 'void').length} open`,
      color: 'text-green-700',
      bg: 'bg-green-50',
      tab: 'invoices',
    },
    {
      label: 'Outstanding Bills',
      value: fmt(totalAP),
      sub: `${bills.filter(b => b.status !== 'paid' && b.status !== 'void').length} open`,
      color: 'text-red-700',
      bg: 'bg-red-50',
      tab: 'bills',
    },
    {
      label: 'Overdue Invoices',
      value: overdueInv.length,
      sub: fmt(overdueInv.reduce((s, i) => s + Number(i.balance_due), 0)),
      color: 'text-orange-700',
      bg: 'bg-orange-50',
      tab: 'invoices',
    },
  ]

  const recentInv = [...invoices].sort((a, b) => (b.created_at > a.created_at ? 1 : -1)).slice(0, 5)
  const recentBills = [...bills].sort((a, b) => (b.created_at > a.created_at ? 1 : -1)).slice(0, 5)

  return (
    <div className="space-y-6">
      {/* Metric cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map(m => (
          <button
            key={m.label}
            onClick={() => onNavigate(m.tab)}
            className={`${m.bg} rounded-xl p-4 text-left hover:opacity-80 transition-opacity`}
          >
            <p className="text-xs font-medium text-gray-500 mb-1">{m.label}</p>
            <p className={`text-2xl font-bold ${m.color}`}>{m.value}</p>
            <p className="text-xs text-gray-400 mt-1">{m.sub}</p>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent invoices */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-800">Recent Invoices</h3>
            <button
              onClick={() => onNavigate('invoices')}
              className="text-xs text-green-700 hover:underline"
            >
              View all
            </button>
          </div>
          <div className="divide-y divide-gray-50">
            {recentInv.length === 0 && (
              <p className="text-xs text-gray-400 px-4 py-6 text-center">No invoices yet</p>
            )}
            {recentInv.map(inv => (
              <div key={inv.id} className="flex items-center justify-between px-4 py-2.5">
                <div>
                  <p className="text-sm font-medium text-gray-800">{inv.client_name || '—'}</p>
                  <p className="text-xs text-gray-400">
                    #{inv.number} · {fmtDate(inv.date)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-800">{fmt(inv.total)}</p>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${STATUS_COLORS[isOverdue(inv.due_date, inv.status) ? 'overdue' : inv.status] || STATUS_COLORS.draft}`}
                  >
                    {isOverdue(inv.due_date, inv.status) ? 'Overdue' : inv.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent bills */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-800">Recent Bills</h3>
            <button
              onClick={() => onNavigate('bills')}
              className="text-xs text-green-700 hover:underline"
            >
              View all
            </button>
          </div>
          <div className="divide-y divide-gray-50">
            {recentBills.length === 0 && (
              <p className="text-xs text-gray-400 px-4 py-6 text-center">No bills yet</p>
            )}
            {recentBills.map(bill => (
              <div key={bill.id} className="flex items-center justify-between px-4 py-2.5">
                <div>
                  <p className="text-sm font-medium text-gray-800">{bill.vendor_name || '—'}</p>
                  <p className="text-xs text-gray-400">
                    #{bill.number || '—'} · {fmtDate(bill.date)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-800">{fmt(bill.total)}</p>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${STATUS_COLORS[isOverdue(bill.due_date, bill.status) ? 'overdue' : bill.status] || STATUS_COLORS.open}`}
                  >
                    {isOverdue(bill.due_date, bill.status) ? 'Overdue' : bill.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bank account balances */}
      {bankAccounts.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-800">Bank Accounts</h3>
            <button
              onClick={() => onNavigate('banking')}
              className="text-xs text-green-700 hover:underline"
            >
              Manage
            </button>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-gray-100">
            {bankAccounts.map(acct => (
              <div key={acct.id} className="px-4 py-3">
                <p className="text-xs text-gray-500 font-medium">{acct.name}</p>
                <p
                  className={`text-lg font-bold mt-0.5 ${Number(acct.current_balance) < 0 ? 'text-red-600' : 'text-gray-800'}`}
                >
                  {fmt(acct.current_balance)}
                </p>
                <p className="text-[10px] text-gray-400 capitalize">
                  {acct.type.replace('_', ' ')}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// INVOICE LINE EDITOR
// ═════════════════════════════════════════════════════════════════════════════
function LineEditor({ lines, onChange }) {
  function updateLine(idx, field, val) {
    const updated = lines.map((l, i) => {
      if (i !== idx) return l
      const next = { ...l, [field]: val }
      if (field === 'quantity' || field === 'unit_price') {
        next.amount = (parseFloat(next.quantity) || 0) * (parseFloat(next.unit_price) || 0)
      }
      return next
    })
    onChange(updated)
  }
  function addLine() {
    onChange([
      ...lines,
      { description: '', quantity: 1, unit_price: '', amount: 0, account_id: '' },
    ])
  }
  function removeLine(idx) {
    onChange(lines.filter((_, i) => i !== idx))
  }

  return (
    <div>
      <div className="grid grid-cols-12 gap-1 mb-1 px-1">
        <span className="col-span-5 text-[10px] font-semibold text-gray-400 uppercase">
          Description
        </span>
        <span className="col-span-2 text-[10px] font-semibold text-gray-400 uppercase text-right">
          Qty
        </span>
        <span className="col-span-2 text-[10px] font-semibold text-gray-400 uppercase text-right">
          Rate
        </span>
        <span className="col-span-2 text-[10px] font-semibold text-gray-400 uppercase text-right">
          Amount
        </span>
        <span className="col-span-1" />
      </div>
      {lines.map((line, idx) => (
        <div key={idx} className="grid grid-cols-12 gap-1 mb-1 items-center">
          <input
            className="col-span-5 input text-xs py-1"
            placeholder="Item description"
            value={line.description}
            onChange={e => updateLine(idx, 'description', e.target.value)}
          />
          <input
            className="col-span-2 input text-xs py-1 text-right"
            type="number"
            min="0"
            placeholder="1"
            value={line.quantity}
            onChange={e => updateLine(idx, 'quantity', e.target.value)}
          />
          <input
            className="col-span-2 input text-xs py-1 text-right"
            type="number"
            min="0"
            step="0.01"
            placeholder="0.00"
            value={line.unit_price}
            onChange={e => updateLine(idx, 'unit_price', e.target.value)}
          />
          <div className="col-span-2 text-right text-xs font-semibold text-gray-700 pr-1">
            {fmtN(line.amount)}
          </div>
          <button
            onClick={() => removeLine(idx)}
            className="col-span-1 text-gray-300 hover:text-red-400 text-center"
          >
            ×
          </button>
        </div>
      ))}
      <button onClick={addLine} className="mt-2 text-xs text-green-700 hover:underline font-medium">
        + Add line
      </button>
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// INVOICES TAB
// ═════════════════════════════════════════════════════════════════════════════
function InvoicesTab({ invoices, clients, jobs, accounts, onRefresh }) {
  const { confirm, dialog } = useConfirm()
  const [filter, setFilter] = useState('all')
  const [modal, setModal] = useState(null) // null | 'new' | invoice obj
  const [payModal, setPayModal] = useState(null)

  const filtered = invoices.filter(inv => {
    const status = isOverdue(inv.due_date, inv.status) ? 'overdue' : inv.status
    return filter === 'all' || status === filter
  })

  const FILTERS = [
    { key: 'all', label: 'All' },
    { key: 'draft', label: 'Draft' },
    { key: 'sent', label: 'Sent' },
    { key: 'overdue', label: 'Overdue' },
    { key: 'paid', label: 'Paid' },
  ]

  async function saveInvoice(data, lines) {
    const subtotal = lines.reduce((s, l) => s + Number(l.amount || 0), 0)
    const tax_amount = subtotal * Number(data.tax_rate || 0)
    const total = subtotal + tax_amount
    const payload = {
      ...data,
      subtotal,
      tax_amount,
      total,
      balance_due: total - Number(data.amount_paid || 0),
    }

    if (modal?.id) {
      await supabase.from('acct_invoices').update(payload).eq('id', modal.id)
      await supabase.from('acct_invoice_lines').delete().eq('invoice_id', modal.id)
      const lineRows = lines.map((l, i) => ({ ...l, invoice_id: modal.id, sort_order: i }))
      if (lineRows.length) await supabase.from('acct_invoice_lines').insert(lineRows)
    } else {
      const num = `INV-${Date.now().toString().slice(-6)}`
      const { data: inv } = await supabase
        .from('acct_invoices')
        .insert({ ...payload, number: num })
        .select()
        .single()
      if (inv) {
        const lineRows = lines.map((l, i) => ({ ...l, invoice_id: inv.id, sort_order: i }))
        if (lineRows.length) await supabase.from('acct_invoice_lines').insert(lineRows)
      }
    }
    setModal(null)
    onRefresh()
  }

  async function markSent(id) {
    await supabase.from('acct_invoices').update({ status: 'sent' }).eq('id', id)
    onRefresh()
  }

  async function recordPayment(inv, payData) {
    const newPaid = Number(inv.amount_paid || 0) + Number(payData.amount)
    const newBal = Number(inv.total) - newPaid
    const status = newBal <= 0.005 ? 'paid' : 'sent'
    await supabase
      .from('acct_invoices')
      .update({ amount_paid: newPaid, balance_due: Math.max(0, newBal), status })
      .eq('id', inv.id)
    await supabase.from('acct_payments').insert({
      type: 'customer',
      date: payData.date,
      amount: payData.amount,
      payment_method: payData.method,
      reference: payData.ref,
      invoice_id: inv.id,
    })
    setPayModal(null)
    onRefresh()
  }

  async function deleteInvoice(id) {
    const ok = await confirm('Delete this invoice? This cannot be undone.')
    if (!ok) return
    await supabase.from('acct_invoice_lines').delete().eq('invoice_id', id)
    await supabase.from('acct_invoices').delete().eq('id', id)
    onRefresh()
  }

  return (
    <div>
      {dialog}
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-1">
          {FILTERS.map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${filter === f.key ? 'bg-green-700 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <button onClick={() => setModal('new')} className="btn-primary text-sm px-4 py-2">
          + New Invoice
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              {['#', 'Client', 'Date', 'Due Date', 'Total', 'Balance Due', 'Status', ''].map(h => (
                <th key={h} className="text-left text-xs font-semibold text-gray-400 px-4 py-2.5">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="text-center text-gray-400 text-sm py-10">
                  No invoices found.
                </td>
              </tr>
            )}
            {filtered.map(inv => {
              const status = isOverdue(inv.due_date, inv.status) ? 'overdue' : inv.status
              return (
                <tr key={inv.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-2.5 font-mono text-xs text-gray-500">{inv.number}</td>
                  <td className="px-4 py-2.5 font-medium text-gray-800">
                    {inv.client_name || '—'}
                  </td>
                  <td className="px-4 py-2.5 text-gray-500 text-xs">{fmtDate(inv.date)}</td>
                  <td className="px-4 py-2.5 text-gray-500 text-xs">{fmtDate(inv.due_date)}</td>
                  <td className="px-4 py-2.5 font-semibold text-gray-800">{fmt(inv.total)}</td>
                  <td className="px-4 py-2.5 font-semibold text-gray-800">
                    {fmt(inv.balance_due)}
                  </td>
                  <td className="px-4 py-2.5">
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-semibold capitalize ${STATUS_COLORS[status] || STATUS_COLORS.draft}`}
                    >
                      {status}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex gap-1">
                      {inv.status === 'draft' && (
                        <button
                          onClick={() => markSent(inv.id)}
                          className="text-xs text-blue-600 hover:underline"
                        >
                          Send
                        </button>
                      )}
                      {['sent', 'overdue'].includes(status) && Number(inv.balance_due) > 0 && (
                        <button
                          onClick={() => setPayModal(inv)}
                          className="text-xs text-green-700 hover:underline ml-1"
                        >
                          Pay
                        </button>
                      )}
                      <button
                        onClick={() => setModal(inv)}
                        className="text-xs text-gray-400 hover:text-gray-700 ml-1"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deleteInvoice(inv.id)}
                        className="text-xs text-red-400 hover:text-red-600 ml-1"
                      >
                        Del
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Invoice Modal */}
      {modal && (
        <InvoiceModal
          invoice={modal === 'new' ? null : modal}
          clients={clients}
          jobs={jobs}
          accounts={accounts}
          onSave={saveInvoice}
          onClose={() => setModal(null)}
        />
      )}

      {/* Payment Modal */}
      {payModal && (
        <PaymentModal
          title={`Record Payment — ${payModal.client_name}`}
          maxAmount={payModal.balance_due}
          onSave={pd => recordPayment(payModal, pd)}
          onClose={() => setPayModal(null)}
        />
      )}
    </div>
  )
}

function InvoiceModal({ invoice, jobs, accounts, onSave, onClose }) {
  const [form, setForm] = useState({
    client_name: invoice?.client_name || '',
    client_id: invoice?.client_id || '',
    job_id: invoice?.job_id || '',
    date: invoice?.date || today(),
    due_date: invoice?.due_date || addDays(today(), 30),
    tax_rate: invoice?.tax_rate || 0,
    notes: invoice?.notes || '',
    status: invoice?.status || 'draft',
    amount_paid: invoice?.amount_paid || 0,
  })
  const [lines, setLines] = useState([
    { description: '', quantity: 1, unit_price: '', amount: 0, account_id: '' },
  ])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (invoice?.id) {
      supabase
        .from('acct_invoice_lines')
        .select('*')
        .eq('invoice_id', invoice.id)
        .order('sort_order')
        .then(({ data }) => {
          if (data?.length) setLines(data)
        })
    }
  }, [invoice?.id])

  const subtotal = lines.reduce((s, l) => s + Number(l.amount || 0), 0)
  const tax_amount = subtotal * Number(form.tax_rate || 0)
  const total = subtotal + tax_amount

  async function handleSave() {
    setLoading(true)
    await onSave(form, lines)
    setLoading(false)
  }

  return (
    <Modal onClose={onClose} wide>
      <div className="px-6 pt-5 pb-4 border-b border-gray-100 flex-shrink-0 flex items-center justify-between">
        <h3 className="text-base font-bold text-gray-800">
          {invoice ? `Edit Invoice ${invoice.number}` : 'New Invoice'}
        </h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
      <div className="overflow-y-auto flex-1 px-6 py-5 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Opportunity Name</label>
            <input
              className="input text-sm w-full"
              value={form.client_name}
              onChange={e => setForm(p => ({ ...p, client_name: e.target.value }))}
              placeholder="Opportunity name"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Job (optional)</label>
            <select
              className="input text-sm w-full"
              value={form.job_id}
              onChange={e => setForm(p => ({ ...p, job_id: e.target.value }))}
            >
              <option value="">— None —</option>
              {jobs.map(j => (
                <option key={j.id} value={j.id}>
                  {j.name || j.client_name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Invoice Date</label>
            <input
              type="date"
              className="input text-sm w-full"
              value={form.date}
              onChange={e => setForm(p => ({ ...p, date: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Due Date</label>
            <input
              type="date"
              className="input text-sm w-full"
              value={form.due_date}
              onChange={e => setForm(p => ({ ...p, due_date: e.target.value }))}
            />
          </div>
        </div>

        <div className="border-t border-gray-100 pt-4">
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Line Items
          </h4>
          <LineEditor lines={lines} onChange={setLines} accounts={accounts} />
        </div>

        <div className="flex justify-end">
          <div className="w-56 space-y-1 text-sm">
            <div className="flex justify-between text-gray-500">
              <span>Subtotal</span>
              <span>{fmt(subtotal)}</span>
            </div>
            <div className="flex justify-between items-center text-gray-500">
              <span>Tax</span>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min="0"
                  max="1"
                  step="0.001"
                  className="input text-xs py-0.5 w-16 text-right"
                  value={form.tax_rate}
                  onChange={e => setForm(p => ({ ...p, tax_rate: e.target.value }))}
                />
                <span className="text-xs">%</span>
                <span className="text-xs">{fmt(tax_amount)}</span>
              </div>
            </div>
            <div className="flex justify-between font-bold text-gray-800 border-t border-gray-100 pt-1">
              <span>Total</span>
              <span>{fmt(total)}</span>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
          <textarea
            className="input text-sm w-full resize-none"
            rows={2}
            value={form.notes}
            onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
            placeholder="Optional notes…"
          />
        </div>
      </div>
      <div className="px-6 pb-5 pt-3 border-t border-gray-100 flex justify-end gap-2 flex-shrink-0">
        <button
          onClick={onClose}
          className="px-4 py-2 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={loading}
          className="btn-primary text-sm px-5 py-2 disabled:opacity-50"
        >
          {loading ? 'Saving…' : 'Save Invoice'}
        </button>
      </div>
    </Modal>
  )
}

function PaymentModal({ title, maxAmount, onSave, onClose }) {
  const [form, setForm] = useState({ date: today(), amount: maxAmount, method: 'Check', ref: '' })
  return (
    <Modal onClose={onClose}>
      <div className="px-6 pt-5 pb-4 border-b border-gray-100 flex-shrink-0">
        <h3 className="text-sm font-bold text-gray-800">{title}</h3>
      </div>
      <div className="px-6 py-5 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Date</label>
            <input
              type="date"
              className="input text-sm w-full"
              value={form.date}
              onChange={e => setForm(p => ({ ...p, date: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Amount</label>
            <input
              type="number"
              min="0"
              step="0.01"
              className="input text-sm w-full"
              value={form.amount}
              onChange={e => setForm(p => ({ ...p, amount: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Method</label>
            <select
              className="input text-sm w-full"
              value={form.method}
              onChange={e => setForm(p => ({ ...p, method: e.target.value }))}
            >
              {PAYMENT_METHODS.map(m => (
                <option key={m}>{m}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Reference #</label>
            <input
              className="input text-sm w-full"
              value={form.ref}
              onChange={e => setForm(p => ({ ...p, ref: e.target.value }))}
              placeholder="Check #, etc."
            />
          </div>
        </div>
      </div>
      <div className="px-6 pb-5 flex justify-end gap-2 flex-shrink-0">
        <button
          onClick={onClose}
          className="px-4 py-2 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
        >
          Cancel
        </button>
        <button onClick={() => onSave(form)} className="btn-primary text-sm px-5 py-2">
          Record Payment
        </button>
      </div>
    </Modal>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// BILLS TAB
// ═════════════════════════════════════════════════════════════════════════════
function BillsTab({ bills, vendors, accounts, jobs, onRefresh }) {
  const { confirm, dialog } = useConfirm()
  const [filter, setFilter] = useState('all')
  const [modal, setModal] = useState(null)
  const [payModal, setPayModal] = useState(null)

  const filtered = bills.filter(b => {
    const status = isOverdue(b.due_date, b.status) ? 'overdue' : b.status
    return filter === 'all' || status === filter
  })

  async function saveBill(data, lines) {
    const subtotal = lines.reduce((s, l) => s + Number(l.amount || 0), 0)
    const total = subtotal + Number(data.tax_amount || 0)
    const payload = {
      ...data,
      subtotal,
      total,
      balance_due: total - Number(data.amount_paid || 0),
      job_id: data.job_id || null,
    }
    if (modal?.id) {
      await supabase.from('acct_bills').update(payload).eq('id', modal.id)
      await supabase.from('acct_bill_lines').delete().eq('bill_id', modal.id)
      const rows = lines.map((l, i) => ({ ...l, bill_id: modal.id, sort_order: i }))
      if (rows.length) await supabase.from('acct_bill_lines').insert(rows)
    } else {
      const { data: bill } = await supabase.from('acct_bills').insert(payload).select().single()
      if (bill) {
        const rows = lines.map((l, i) => ({ ...l, bill_id: bill.id, sort_order: i }))
        if (rows.length) await supabase.from('acct_bill_lines').insert(rows)
      }
    }
    setModal(null)
    onRefresh()
  }

  async function recordPayment(bill, pd) {
    const newPaid = Number(bill.amount_paid || 0) + Number(pd.amount)
    const newBal = Number(bill.total) - newPaid
    const status = newBal <= 0.005 ? 'paid' : 'open'
    await supabase
      .from('acct_bills')
      .update({ amount_paid: newPaid, balance_due: Math.max(0, newBal), status })
      .eq('id', bill.id)
    await supabase.from('acct_payments').insert({
      type: 'vendor',
      date: pd.date,
      amount: pd.amount,
      payment_method: pd.method,
      reference: pd.ref,
      bill_id: bill.id,
    })
    setPayModal(null)
    onRefresh()
  }

  async function deleteBill(id) {
    const ok = await confirm('Delete this bill?')
    if (!ok) return
    await supabase.from('acct_bill_lines').delete().eq('bill_id', id)
    await supabase.from('acct_bills').delete().eq('id', id)
    onRefresh()
  }

  return (
    <div>
      {dialog}
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-1">
          {['all', 'open', 'overdue', 'paid'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg capitalize transition-colors ${filter === f ? 'bg-green-700 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              {f}
            </button>
          ))}
        </div>
        <button onClick={() => setModal('new')} className="btn-primary text-sm px-4 py-2">
          + New Bill
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              {['Vendor', 'Bill #', 'Date', 'Due Date', 'Total', 'Balance Due', 'Status', ''].map(
                h => (
                  <th key={h} className="text-left text-xs font-semibold text-gray-400 px-4 py-2.5">
                    {h}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="text-center text-gray-400 text-sm py-10">
                  No bills found.
                </td>
              </tr>
            )}
            {filtered.map(bill => {
              const status = isOverdue(bill.due_date, bill.status) ? 'overdue' : bill.status
              return (
                <tr key={bill.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2.5 font-medium text-gray-800">
                    {bill.vendor_name || '—'}
                  </td>
                  <td className="px-4 py-2.5 font-mono text-xs text-gray-500">
                    {bill.number || '—'}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-gray-500">{fmtDate(bill.date)}</td>
                  <td className="px-4 py-2.5 text-xs text-gray-500">{fmtDate(bill.due_date)}</td>
                  <td className="px-4 py-2.5 font-semibold text-gray-800">{fmt(bill.total)}</td>
                  <td className="px-4 py-2.5 font-semibold text-gray-800">
                    {fmt(bill.balance_due)}
                  </td>
                  <td className="px-4 py-2.5">
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-semibold capitalize ${STATUS_COLORS[status] || STATUS_COLORS.open}`}
                    >
                      {status}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex gap-1">
                      {['open', 'overdue'].includes(status) && Number(bill.balance_due) > 0 && (
                        <button
                          onClick={() => setPayModal(bill)}
                          className="text-xs text-green-700 hover:underline"
                        >
                          Pay
                        </button>
                      )}
                      <button
                        onClick={() => setModal(bill)}
                        className="text-xs text-gray-400 hover:text-gray-700 ml-1"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deleteBill(bill.id)}
                        className="text-xs text-red-400 hover:text-red-600 ml-1"
                      >
                        Del
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {modal && (
        <BillModal
          bill={modal === 'new' ? null : modal}
          vendors={vendors}
          accounts={accounts}
          jobs={jobs}
          onSave={saveBill}
          onClose={() => setModal(null)}
        />
      )}
      {payModal && (
        <PaymentModal
          title={`Pay Bill — ${payModal.vendor_name}`}
          maxAmount={payModal.balance_due}
          onSave={pd => recordPayment(payModal, pd)}
          onClose={() => setPayModal(null)}
        />
      )}
    </div>
  )
}

function BillModal({ bill, accounts, jobs, onSave, onClose }) {
  const [form, setForm] = useState({
    vendor_name: bill?.vendor_name || '',
    vendor_id: bill?.vendor_id || '',
    job_id: bill?.job_id || '',
    number: bill?.number || '',
    date: bill?.date || today(),
    due_date: bill?.due_date || addDays(today(), 30),
    tax_amount: bill?.tax_amount || 0,
    notes: bill?.notes || '',
    status: bill?.status || 'open',
    amount_paid: bill?.amount_paid || 0,
  })
  const [lines, setLines] = useState([
    { description: '', quantity: 1, unit_price: '', amount: 0, account_id: '' },
  ])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (bill?.id) {
      supabase
        .from('acct_bill_lines')
        .select('*')
        .eq('bill_id', bill.id)
        .order('sort_order')
        .then(({ data }) => {
          if (data?.length) setLines(data)
        })
    }
  }, [bill?.id])

  const subtotal = lines.reduce((s, l) => s + Number(l.amount || 0), 0)
  const total = subtotal + Number(form.tax_amount || 0)

  return (
    <Modal onClose={onClose} wide>
      <div className="px-6 pt-5 pb-4 border-b border-gray-100 flex-shrink-0 flex items-center justify-between">
        <h3 className="text-base font-bold text-gray-800">{bill ? 'Edit Bill' : 'New Bill'}</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
      <div className="overflow-y-auto flex-1 px-6 py-5 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Vendor</label>
            <input
              className="input text-sm w-full"
              value={form.vendor_name}
              onChange={e => setForm(p => ({ ...p, vendor_name: e.target.value }))}
              placeholder="Vendor name"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Bill #</label>
            <input
              className="input text-sm w-full"
              value={form.number}
              onChange={e => setForm(p => ({ ...p, number: e.target.value }))}
              placeholder="Vendor invoice #"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Bill Date</label>
            <input
              type="date"
              className="input text-sm w-full"
              value={form.date}
              onChange={e => setForm(p => ({ ...p, date: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Due Date</label>
            <input
              type="date"
              className="input text-sm w-full"
              value={form.due_date}
              onChange={e => setForm(p => ({ ...p, due_date: e.target.value }))}
            />
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-medium text-gray-600 mb-1">Job (optional)</label>
            <select
              className="input text-sm w-full"
              value={form.job_id}
              onChange={e => setForm(p => ({ ...p, job_id: e.target.value }))}
            >
              <option value="">— No job assigned —</option>
              {(jobs || []).map(j => (
                <option key={j.id} value={j.id}>
                  {j.name || j.client_name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="border-t border-gray-100 pt-4">
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Line Items
          </h4>
          <LineEditor lines={lines} onChange={setLines} accounts={accounts} />
        </div>
        <div className="flex justify-end">
          <div className="w-48 space-y-1 text-sm">
            <div className="flex justify-between text-gray-500">
              <span>Subtotal</span>
              <span>{fmt(subtotal)}</span>
            </div>
            <div className="flex justify-between items-center text-gray-500">
              <span>Tax</span>
              <input
                type="number"
                min="0"
                step="0.01"
                className="input text-xs py-0.5 w-24 text-right"
                value={form.tax_amount}
                onChange={e => setForm(p => ({ ...p, tax_amount: e.target.value }))}
              />
            </div>
            <div className="flex justify-between font-bold text-gray-800 border-t border-gray-100 pt-1">
              <span>Total</span>
              <span>{fmt(total)}</span>
            </div>
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
          <textarea
            className="input text-sm w-full resize-none"
            rows={2}
            value={form.notes}
            onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
            placeholder="Optional notes…"
          />
        </div>
      </div>
      <div className="px-6 pb-5 pt-3 border-t border-gray-100 flex justify-end gap-2 flex-shrink-0">
        <button
          onClick={onClose}
          className="px-4 py-2 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          onClick={async () => {
            setLoading(true)
            await onSave(form, lines)
            setLoading(false)
          }}
          disabled={loading}
          className="btn-primary text-sm px-5 py-2 disabled:opacity-50"
        >
          {loading ? 'Saving…' : 'Save Bill'}
        </button>
      </div>
    </Modal>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// CHECKS / CREDIT CARDS TABS
//
// Both tabs are paginated read-only views over QB-imported transactions.
// Their data lives in different tables (acct_checks/acct_check_lines vs.
// acct_credit_card_charges/acct_credit_card_charge_lines) but the UI
// shape is identical — date filter, payee search, paginated header list,
// expand-row to see line items with job links. Driven by a single
// AcctTransactionsTab component configured by props.
//
// Why read-only: these rows are owned by the QB sync. Editing them in PBS
// would be silently overwritten on the next pull and would risk confusion
// about which record (PBS or QB) is canonical. To change a check or CC
// charge, the user edits it in QuickBooks; the next sync reflects it.
// ═════════════════════════════════════════════════════════════════════════════

function ChecksTab() {
  return (
    <AcctTransactionsTab
      headerTable="acct_checks"
      lineTable="acct_check_lines"
      lineFkColumn="check_id"
      accountColumn="bank_account_name"
      accountHeader="Bank Account"
      emptyLabel="No checks found in this date range."
      refLabel="Check #"
    />
  )
}

function CreditCardsTab() {
  return (
    <AcctTransactionsTab
      headerTable="acct_credit_card_charges"
      lineTable="acct_credit_card_charge_lines"
      lineFkColumn="charge_id"
      accountColumn="credit_card_account_name"
      accountHeader="Credit Card"
      emptyLabel="No credit card charges found in this date range."
      refLabel="Ref #"
    />
  )
}

function AcctTransactionsTab({
  headerTable,     // 'acct_checks' | 'acct_credit_card_charges'
  lineTable,       // 'acct_check_lines' | 'acct_credit_card_charge_lines'
  lineFkColumn,    // 'check_id' | 'charge_id'
  accountColumn,   // 'bank_account_name' | 'credit_card_account_name'
  accountHeader,   // 'Bank Account' | 'Credit Card'
  emptyLabel,
  refLabel,
}) {
  const PAGE_SIZE = 50

  const [page, setPage]               = useState(1)
  const [rows, setRows]               = useState([])
  const [totalCount, setTotalCount]   = useState(0)
  const [loading, setLoading]         = useState(false)
  const [dateFrom, setDateFrom]       = useState(addDays(today(), -90))
  const [dateTo, setDateTo]           = useState(today())
  const [searchInput, setSearchInput] = useState('')
  const [searchTerm, setSearchTerm]   = useState('')      // applied search; submit via button or Enter
  const [expandedId, setExpandedId]   = useState(null)
  const [expandedLines, setExpandedLines] = useState({})  // { rowId: line[] | undefined }

  // Fetch a page whenever the page index or any applied filter changes.
  // searchTerm (not searchInput) is in the dep array so typing doesn't
  // hammer the DB — the user submits via Enter or the Apply button.
  useEffect(() => {
    let cancelled = false
    async function fetchPage() {
      setLoading(true)
      const from = (page - 1) * PAGE_SIZE
      const to   = from + PAGE_SIZE - 1

      let q = supabase
        .from(headerTable)
        .select('*', { count: 'exact' })
        .gte('date', dateFrom)
        .lte('date', dateTo)
        .order('date', { ascending: false })
        .range(from, to)

      if (searchTerm.trim()) {
        q = q.ilike('payee_name', `%${searchTerm.trim()}%`)
      }

      const { data, count, error } = await q
      if (cancelled) return
      if (error) {
        console.error(`${headerTable} fetch failed:`, error)
      } else {
        setRows(data || [])
        setTotalCount(count || 0)
      }
      setLoading(false)
    }
    fetchPage()
    return () => { cancelled = true }
  }, [headerTable, page, dateFrom, dateTo, searchTerm])

  // Reset to page 1 whenever a filter changes (otherwise you can end up
  // on an empty late page after narrowing the range).
  useEffect(() => { setPage(1) }, [dateFrom, dateTo, searchTerm, headerTable])

  function applySearch() {
    setSearchTerm(searchInput)
  }

  async function toggleExpand(rowId) {
    if (expandedId === rowId) {
      setExpandedId(null)
      return
    }
    setExpandedId(rowId)
    // Lazy-load lines the first time a row is expanded; cache thereafter.
    if (!expandedLines[rowId]) {
      const { data, error } = await supabase
        .from(lineTable)
        .select('*, job:jobs(id, client_name, job_address)')
        .eq(lineFkColumn, rowId)
        .order('sort_order')
      if (error) {
        console.error(`${lineTable} fetch failed:`, error)
      }
      setExpandedLines(prev => ({ ...prev, [rowId]: data || [] }))
    }
  }

  const totalPages   = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))
  const safePage     = Math.min(page, totalPages)
  const visibleTotal = rows.reduce((s, r) => s + Number(r.total || 0), 0)

  return (
    <div>
      {/* Filter bar */}
      <div className="flex flex-wrap items-end gap-3 mb-4 p-3 bg-white rounded-xl border border-gray-200">
        <div>
          <label className="block text-[10px] font-semibold text-gray-400 uppercase mb-1">From</label>
          <input
            type="date"
            className="input text-sm"
            value={dateFrom}
            onChange={e => setDateFrom(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-[10px] font-semibold text-gray-400 uppercase mb-1">To</label>
          <input
            type="date"
            className="input text-sm"
            value={dateTo}
            onChange={e => setDateTo(e.target.value)}
          />
        </div>
        <div className="flex-1 min-w-[200px]">
          <label className="block text-[10px] font-semibold text-gray-400 uppercase mb-1">Search Payee</label>
          <input
            type="text"
            className="input text-sm w-full"
            placeholder="Name contains…"
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') applySearch() }}
          />
        </div>
        <button onClick={applySearch} className="btn-secondary text-xs px-4 py-2">
          Apply
        </button>
        <div className="ml-auto text-right">
          <p className="text-[10px] text-gray-400 uppercase font-semibold">Page Total</p>
          <p className="text-lg font-bold text-gray-800">{fmt(visibleTotal)}</p>
        </div>
      </div>

      {/* Header table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="w-8 px-3 py-2.5" />
              <th className="text-left text-xs font-semibold text-gray-400 px-4 py-2.5">Date</th>
              <th className="text-left text-xs font-semibold text-gray-400 px-4 py-2.5">{refLabel}</th>
              <th className="text-left text-xs font-semibold text-gray-400 px-4 py-2.5">Payee</th>
              <th className="text-left text-xs font-semibold text-gray-400 px-4 py-2.5">{accountHeader}</th>
              <th className="text-left text-xs font-semibold text-gray-400 px-4 py-2.5">Memo</th>
              <th className="text-right text-xs font-semibold text-gray-400 px-4 py-2.5">Total</th>
              <th className="text-center text-xs font-semibold text-gray-400 px-4 py-2.5">Source</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading && (
              <tr><td colSpan={8} className="text-center text-gray-400 text-sm py-10">Loading…</td></tr>
            )}
            {!loading && rows.length === 0 && (
              <tr><td colSpan={8} className="text-center text-gray-400 text-sm py-10">{emptyLabel}</td></tr>
            )}
            {!loading && rows.map(row => (
              <Fragment key={row.id}>
                <tr
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => toggleExpand(row.id)}
                >
                  <td className="px-3 py-2.5 text-gray-400 text-xs select-none">
                    {expandedId === row.id ? '▾' : '▸'}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-gray-500">{fmtDate(row.date)}</td>
                  <td className="px-4 py-2.5 font-mono text-xs text-gray-500">{row.ref_number || '—'}</td>
                  <td className="px-4 py-2.5 font-medium text-gray-800">{row.payee_name || '—'}</td>
                  <td className="px-4 py-2.5 text-xs text-gray-500 max-w-[160px] truncate">
                    {row[accountColumn] || '—'}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-gray-500 max-w-[260px] truncate">
                    {row.memo || ''}
                  </td>
                  <td className="px-4 py-2.5 text-right font-semibold text-gray-800">
                    {fmt(row.total)}
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded font-semibold uppercase ${
                        row.source === 'qb'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {row.source}
                    </span>
                  </td>
                </tr>
                {expandedId === row.id && (
                  <tr>
                    <td colSpan={8} className="bg-gray-50 px-12 py-3">
                      <AcctTxnLineList lines={expandedLines[row.id]} />
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalCount > PAGE_SIZE && (
        <div className="flex items-center gap-3 mt-3 text-xs text-gray-500">
          <button
            onClick={() => setPage(Math.max(1, safePage - 1))}
            disabled={safePage === 1}
            className="px-2.5 py-1 rounded border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            ‹ Prev
          </button>
          <span>
            Page {safePage.toLocaleString()} of {totalPages.toLocaleString()} ·{' '}
            {totalCount.toLocaleString()} total
          </span>
          <button
            onClick={() => setPage(Math.min(totalPages, safePage + 1))}
            disabled={safePage >= totalPages}
            className="px-2.5 py-1 rounded border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Next ›
          </button>
        </div>
      )}
    </div>
  )
}

// Expanded-row line table for Checks / CC Charges. Shows item/account,
// description, the linked PBS job (if matched) or the raw QB customer
// (amber, indicates a tagged-but-unmatched line), qty, and amount.
function AcctTxnLineList({ lines }) {
  if (lines === undefined) {
    return <div className="text-xs text-gray-400 py-2">Loading lines…</div>
  }
  if (lines.length === 0) {
    return <div className="text-xs text-gray-400 py-2">No line items on this transaction.</div>
  }
  return (
    <table className="w-full text-xs">
      <thead>
        <tr className="text-gray-400 text-[10px] uppercase font-semibold">
          <th className="text-left px-2 py-1">Type</th>
          <th className="text-left px-2 py-1">Item / Account</th>
          <th className="text-left px-2 py-1">Description</th>
          <th className="text-left px-2 py-1">Job</th>
          <th className="text-right px-2 py-1">Qty</th>
          <th className="text-right px-2 py-1">Amount</th>
        </tr>
      </thead>
      <tbody>
        {lines.map(l => (
          <tr key={l.id} className="border-t border-gray-200">
            <td className="px-2 py-1">
              <span
                className={`text-[9px] px-1.5 py-0.5 rounded font-semibold uppercase ${
                  l.line_type === 'item'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                {l.line_type || '—'}
              </span>
            </td>
            <td className="px-2 py-1">{l.item_name || l.qb_account_name || '—'}</td>
            <td className="px-2 py-1 text-gray-500 max-w-[260px] truncate">
              {l.description || ''}
            </td>
            <td className="px-2 py-1 max-w-[220px] truncate">
              {l.job ? (
                <span className="text-green-700 font-medium" title={l.job.job_address || ''}>
                  {l.job.client_name}
                </span>
              ) : l.qb_customer_full_name ? (
                <span
                  className="text-amber-600"
                  title="QB customer not auto-matched to a PBS job"
                >
                  {l.qb_customer_full_name}
                </span>
              ) : (
                <span className="text-gray-300">—</span>
              )}
            </td>
            <td className="px-2 py-1 text-right">{l.quantity ?? ''}</td>
            <td className="px-2 py-1 text-right font-semibold">{fmt(l.amount)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// BANKING TAB
// ═════════════════════════════════════════════════════════════════════════════
function BankingTab({ bankAccounts, accounts, onRefresh }) {
  const { confirm, dialog } = useConfirm()
  const [selectedAcct, setSelectedAcct] = useState(null)
  const [transactions, setTransactions] = useState([])
  const [acctModal, setAcctModal] = useState(null)
  const [txModal, setTxModal] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (selectedAcct) fetchTxns(selectedAcct)
  }, [selectedAcct])

  async function fetchTxns(acctId) {
    setLoading(true)
    const { data } = await supabase
      .from('acct_bank_transactions')
      .select('*')
      .eq('bank_account_id', acctId)
      .order('date', { ascending: false })
    if (data) setTransactions(data)
    setLoading(false)
  }

  async function saveAccount(data) {
    if (acctModal?.id) {
      await supabase.from('acct_bank_accounts').update(data).eq('id', acctModal.id)
    } else {
      await supabase.from('acct_bank_accounts').insert(data)
    }
    setAcctModal(null)
    onRefresh()
  }

  async function deleteAccount(id) {
    const ok = await confirm('Delete this bank account and all its transactions?')
    if (!ok) return
    await supabase.from('acct_bank_transactions').delete().eq('bank_account_id', id)
    await supabase.from('acct_bank_accounts').delete().eq('id', id)
    if (selectedAcct === id) setSelectedAcct(null)
    onRefresh()
  }

  async function saveTxn(data) {
    await supabase.from('acct_bank_transactions').insert({ ...data, bank_account_id: selectedAcct })
    // Update running balance
    const acct = bankAccounts.find(a => a.id === selectedAcct)
    if (acct) {
      const delta = data.type === 'deposit' ? Number(data.amount) : -Number(data.amount)
      await supabase
        .from('acct_bank_accounts')
        .update({ current_balance: Number(acct.current_balance) + delta })
        .eq('id', selectedAcct)
    }
    setTxModal(false)
    onRefresh()
    fetchTxns(selectedAcct)
  }

  async function toggleReconcile(txn) {
    await supabase
      .from('acct_bank_transactions')
      .update({ is_reconciled: !txn.is_reconciled })
      .eq('id', txn.id)
    fetchTxns(selectedAcct)
  }

  async function deleteTxn(id) {
    const ok = await confirm('Delete this transaction?')
    if (!ok) return
    await supabase.from('acct_bank_transactions').delete().eq('id', id)
    fetchTxns(selectedAcct)
  }

  const expenseAccts = accounts.filter(a => ['expense', 'cogs'].includes(a.type))

  return (
    <div>
      {dialog}
      <div className="flex items-start gap-6">
        {/* Account list */}
        <div className="w-64 flex-shrink-0">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-gray-700">Accounts</h3>
            <button
              onClick={() => setAcctModal('new')}
              className="text-xs text-green-700 hover:underline font-medium"
            >
              + Add
            </button>
          </div>
          <div className="space-y-2">
            {bankAccounts.length === 0 && (
              <p className="text-xs text-gray-400 italic text-center py-4">No bank accounts yet.</p>
            )}
            {bankAccounts.map(acct => (
              <div
                key={acct.id}
                onClick={() => setSelectedAcct(acct.id)}
                className={`p-3 rounded-xl border cursor-pointer transition-colors ${selectedAcct === acct.id ? 'border-green-300 bg-green-50' : 'border-gray-200 bg-white hover:bg-gray-50'}`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{acct.name}</p>
                    <p className="text-xs text-gray-400 capitalize mt-0.5">
                      {acct.type.replace('_', ' ')}
                      {acct.institution ? ` · ${acct.institution}` : ''}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={e => {
                        e.stopPropagation()
                        setAcctModal(acct)
                      }}
                      className="text-gray-300 hover:text-gray-600 p-0.5"
                    >
                      <svg
                        className="w-3 h-3"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 012.828 0l.172.172a2 2 0 010 2.828L12 16H9v-3z"
                        />
                      </svg>
                    </button>
                    <button
                      onClick={e => {
                        e.stopPropagation()
                        deleteAccount(acct.id)
                      }}
                      className="text-gray-300 hover:text-red-500 p-0.5"
                    >
                      <svg
                        className="w-3 h-3"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
                <p
                  className={`text-base font-bold mt-1 ${Number(acct.current_balance) < 0 ? 'text-red-600' : 'text-gray-800'}`}
                >
                  {fmt(acct.current_balance)}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Transaction list */}
        <div className="flex-1 min-w-0">
          {!selectedAcct ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
              <p className="text-3xl mb-3">🏦</p>
              <p className="text-sm">Select an account to view transactions</p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-gray-700">
                  {bankAccounts.find(a => a.id === selectedAcct)?.name} — Transactions
                </h3>
                <button
                  onClick={() => setTxModal(true)}
                  className="btn-primary text-sm px-3 py-1.5"
                >
                  + Add Transaction
                </button>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50">
                      {['Date', 'Description', 'Type', 'Amount', 'Reconciled', ''].map(h => (
                        <th
                          key={h}
                          className="text-left text-xs font-semibold text-gray-400 px-4 py-2.5"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {loading && (
                      <tr>
                        <td colSpan={6} className="text-center text-gray-400 py-8">
                          Loading…
                        </td>
                      </tr>
                    )}
                    {!loading && transactions.length === 0 && (
                      <tr>
                        <td colSpan={6} className="text-center text-gray-400 py-8">
                          No transactions yet.
                        </td>
                      </tr>
                    )}
                    {transactions.map(tx => (
                      <tr key={tx.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2.5 text-xs text-gray-500">{fmtDate(tx.date)}</td>
                        <td className="px-4 py-2.5 text-gray-800">{tx.description || '—'}</td>
                        <td className="px-4 py-2.5 text-xs capitalize text-gray-500">{tx.type}</td>
                        <td
                          className={`px-4 py-2.5 font-semibold ${tx.type === 'deposit' ? 'text-green-700' : 'text-red-600'}`}
                        >
                          {tx.type === 'deposit' ? '+' : '-'}
                          {fmt(Math.abs(tx.amount))}
                        </td>
                        <td className="px-4 py-2.5">
                          <button
                            onClick={() => toggleReconcile(tx)}
                            className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${tx.is_reconciled ? 'bg-green-600 border-green-600 text-white' : 'border-gray-300'}`}
                          >
                            {tx.is_reconciled && (
                              <svg
                                className="w-3 h-3"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={3}
                                  d="M5 13l4 4L19 7"
                                />
                              </svg>
                            )}
                          </button>
                        </td>
                        <td className="px-4 py-2.5">
                          <button
                            onClick={() => deleteTxn(tx.id)}
                            className="text-gray-300 hover:text-red-500 text-xs"
                          >
                            Del
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>

      {acctModal && (
        <BankAccountModal
          account={acctModal === 'new' ? null : acctModal}
          onSave={saveAccount}
          onClose={() => setAcctModal(null)}
        />
      )}
      {txModal && (
        <TransactionModal
          onSave={saveTxn}
          onClose={() => setTxModal(false)}
          accounts={expenseAccts}
        />
      )}
    </div>
  )
}

function BankAccountModal({ account, onSave, onClose }) {
  const [form, setForm] = useState({
    name: account?.name || '',
    type: account?.type || 'checking',
    institution: account?.institution || '',
    account_number_last4: account?.account_number_last4 || '',
    current_balance: account?.current_balance || 0,
  })
  return (
    <Modal onClose={onClose}>
      <div className="px-6 pt-5 pb-4 border-b border-gray-100 flex-shrink-0">
        <h3 className="text-sm font-bold text-gray-800">
          {account ? 'Edit Account' : 'Add Bank Account'}
        </h3>
      </div>
      <div className="px-6 py-5 space-y-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Account Name</label>
          <input
            className="input text-sm w-full"
            value={form.name}
            onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
            placeholder="e.g. Main Checking"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Type</label>
            <select
              className="input text-sm w-full"
              value={form.type}
              onChange={e => setForm(p => ({ ...p, type: e.target.value }))}
            >
              {['checking', 'savings', 'credit_card', 'loan', 'other'].map(t => (
                <option key={t} value={t} className="capitalize">
                  {t.replace('_', ' ')}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Last 4 digits</label>
            <input
              className="input text-sm w-full"
              maxLength={4}
              value={form.account_number_last4}
              onChange={e => setForm(p => ({ ...p, account_number_last4: e.target.value }))}
              placeholder="1234"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Bank / Institution</label>
          <input
            className="input text-sm w-full"
            value={form.institution}
            onChange={e => setForm(p => ({ ...p, institution: e.target.value }))}
            placeholder="Bank name"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Current Balance</label>
          <input
            type="number"
            step="0.01"
            className="input text-sm w-full"
            value={form.current_balance}
            onChange={e => setForm(p => ({ ...p, current_balance: e.target.value }))}
          />
        </div>
      </div>
      <div className="px-6 pb-5 flex justify-end gap-2 flex-shrink-0">
        <button
          onClick={onClose}
          className="px-4 py-2 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
        >
          Cancel
        </button>
        <button onClick={() => onSave(form)} className="btn-primary text-sm px-5 py-2">
          Save
        </button>
      </div>
    </Modal>
  )
}

function TransactionModal({ onSave, onClose, accounts }) {
  const [form, setForm] = useState({
    date: today(),
    description: '',
    amount: '',
    type: 'withdrawal',
    category_id: '',
  })
  return (
    <Modal onClose={onClose}>
      <div className="px-6 pt-5 pb-4 border-b border-gray-100 flex-shrink-0">
        <h3 className="text-sm font-bold text-gray-800">Add Transaction</h3>
      </div>
      <div className="px-6 py-5 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Date</label>
            <input
              type="date"
              className="input text-sm w-full"
              value={form.date}
              onChange={e => setForm(p => ({ ...p, date: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Type</label>
            <select
              className="input text-sm w-full"
              value={form.type}
              onChange={e => setForm(p => ({ ...p, type: e.target.value }))}
            >
              <option value="deposit">Deposit</option>
              <option value="withdrawal">Withdrawal</option>
              <option value="transfer">Transfer</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
          <input
            className="input text-sm w-full"
            value={form.description}
            onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
            placeholder="Transaction description"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Amount</label>
          <input
            type="number"
            min="0"
            step="0.01"
            className="input text-sm w-full"
            value={form.amount}
            onChange={e => setForm(p => ({ ...p, amount: e.target.value }))}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Category (optional)
          </label>
          <select
            className="input text-sm w-full"
            value={form.category_id}
            onChange={e => setForm(p => ({ ...p, category_id: e.target.value }))}
          >
            <option value="">— Uncategorized —</option>
            {accounts.map(a => (
              <option key={a.id} value={a.id}>
                {a.number} {a.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="px-6 pb-5 flex justify-end gap-2 flex-shrink-0">
        <button
          onClick={onClose}
          className="px-4 py-2 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          onClick={() => onSave(form)}
          disabled={!form.amount}
          className="btn-primary text-sm px-5 py-2 disabled:opacity-50"
        >
          Save
        </button>
      </div>
    </Modal>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// CHART OF ACCOUNTS TAB
// ═════════════════════════════════════════════════════════════════════════════
// RegistersTab — QuickBooks-style register per account.
//
// Two cascading filter dropdowns: Account Type (one of the 14 QB types)
// narrows the Account Name dropdown to accounts of that type. Selecting
// an account loads its register from v_acct_account_register and paints
// it in the table below.
//
// The view's "amount" is shown as-is — we don't try to compute a running
// balance because we may not have complete historical data from QB. The
// columns mirror QB's: Date / Type / Ref / Payee / Memo / Amount.
// ═════════════════════════════════════════════════════════════════════════════
// QB column shape per account-subtype. Determines which amount column an
// inflow lands in vs an outflow, and what each is labelled.
//   leftLabel / rightLabel  → the two header labels
//   numLabel                → "Number" (Bank) vs "Ref" (others)
//   sign                    → +1 if `amount` adds to balance, -1 if subtracts
//                             (Bank: checks subtract; CC: charges add liability)
//   side                    → which column the amount renders in ('left'|'right')
function registerColsFor(subtype) {
  if (subtype === 'Bank') {
    return { numLabel: 'NUMBER', leftLabel: 'PAYMENT', rightLabel: 'DEPOSIT', sign: -1, side: 'left' }
  }
  if (subtype === 'Credit Card') {
    return { numLabel: 'REF', leftLabel: 'CHARGE', rightLabel: 'PAYMENT', sign: +1, side: 'left' }
  }
  if (subtype === 'Accounts Receivable') {
    return { numLabel: 'NUMBER', leftLabel: 'INVOICED', rightLabel: 'RECEIVED', sign: +1, side: 'left' }
  }
  if (subtype === 'Accounts Payable') {
    return { numLabel: 'NUMBER', leftLabel: 'BILLED', rightLabel: 'PAID', sign: +1, side: 'left' }
  }
  // Income / Expense / Equity / Other Assets / Other Liabilities — single column.
  return { numLabel: 'REF', leftLabel: 'AMOUNT', rightLabel: '', sign: +1, side: 'left' }
}

// Short MM/DD/YYYY date for register rows — QB style. (The existing
// fmtDate above renders "May 25, 2026" which is too wide here.)
function fmtRegDate(d) {
  if (!d) return '—'
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })
}

function RegistersTab({ accounts }) {
  const [filterType, setFilterType] = useState('')   // one of the 14 subtypes
  const [filterAcct, setFilterAcct] = useState('')   // selected account id

  const [rows, setRows]       = useState([])
  const [loading, setLoading] = useState(false)
  const [truncated, setTruncated] = useState(false)

  // Cap the per-account fetch to keep client-side balance calc snappy.
  // 5k rows = a substantial register; if an account exceeds it we tell
  // the user and only show the most recent slice.
  const MAX_ROWS = 5000

  // Accounts filtered to the selected type — drives the second dropdown.
  const accountsForType = filterType
    ? accounts
        .filter(a => (a.subtype || '').trim() === filterType)
        .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
    : []

  useEffect(() => {
    setFilterAcct('')
    setRows([])
    setTruncated(false)
  }, [filterType])

  // Pull the register for the selected account. We grab up to MAX_ROWS,
  // sort oldest-to-newest to compute a running balance, then flip the
  // array for newest-first display.
  useEffect(() => {
    if (!filterAcct) return
    let cancelled = false
    ;(async () => {
      setLoading(true)
      const { data, count, error } = await supabase
        .from('v_acct_account_register')
        .select('*', { count: 'exact' })
        .eq('account_id', filterAcct)
        .order('txn_date', { ascending: false, nullsFirst: false })
        .limit(MAX_ROWS)
      if (cancelled) return
      if (error) {
        console.error('register fetch failed:', error)
        setRows([])
        setTruncated(false)
      } else {
        setRows(data || [])
        setTruncated((count ?? 0) > (data?.length ?? 0))
      }
      setLoading(false)
    })()
    return () => { cancelled = true }
  }, [filterAcct])

  const selectedAcct = accounts.find(a => a.id === filterAcct)
  const cols = registerColsFor(selectedAcct?.subtype)

  // Compute running balance oldest → newest. We loaded newest-first so we
  // re-sort to ASC, accumulate, then flip back for display.
  const displayRows = (() => {
    if (!rows.length) return []
    const oldestFirst = [...rows].sort((a, b) =>
      (a.txn_date || '').localeCompare(b.txn_date || '')
      || String(a.source_id).localeCompare(String(b.source_id))
    )
    let running = 0
    for (const r of oldestFirst) {
      running += cols.sign * Number(r.amount || 0)
      r._balance = running
    }
    return oldestFirst.reverse()
  })()

  const grandTotal = rows.reduce((s, r) => s + Number(r.amount || 0), 0)

  return (
    <div>
      {/* Single card — green header always visible, holds the two filter
          dropdowns on the left and the active-account info on the right.
          Body below the header is either the register table or the
          empty-state hint. */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {/* Green header bar — filters live HERE now, no separate row above */}
        <div className="px-4 py-2.5 bg-green-700 text-white">
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={filterType}
              onChange={e => setFilterType(e.target.value)}
              className="text-sm bg-green-800 text-white border border-green-500/50 rounded px-2 py-1 min-w-[200px] focus:outline-none focus:ring-2 focus:ring-white/40"
              aria-label="Account type"
            >
              <option value="">Select account type…</option>
              {COA_SECTIONS.map(s => (
                <option key={s.subtype} value={s.subtype}>{s.subtype}</option>
              ))}
            </select>

            <select
              value={filterAcct}
              onChange={e => setFilterAcct(e.target.value)}
              disabled={!filterType}
              className="text-sm bg-green-800 text-white border border-green-500/50 rounded px-2 py-1 min-w-[260px] disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-white/40"
              aria-label="Account name"
            >
              <option value="">
                {!filterType
                  ? 'Pick a type first'
                  : accountsForType.length === 0
                    ? 'No accounts in this type'
                    : '— Select account —'}
              </option>
              {accountsForType.map(a => (
                <option key={a.id} value={a.id}>
                  {a.number ? `${a.number} · ${a.name}` : a.name}
                </option>
              ))}
            </select>

            {/* Right side: account info when selected, hint otherwise */}
            {selectedAcct ? (
              <div className="ml-auto text-right min-w-0">
                <p className="text-sm font-bold truncate">
                  {selectedAcct.number ? `${selectedAcct.number} · ` : ''}{selectedAcct.name}
                </p>
                <p className="text-[11px] text-green-100">
                  {selectedAcct.subtype || '—'} · {rows.length.toLocaleString()}{truncated ? '+' : ''} transactions · {fmt(grandTotal)}
                </p>
              </div>
            ) : (
              <span className="ml-auto text-[11px] text-green-100 italic whitespace-nowrap">
                Select an account to view its register
              </span>
            )}
          </div>

          {truncated && (
            <div className="mt-2 text-[11px] bg-yellow-200 text-yellow-900 px-2 py-0.5 rounded inline-block">
              Showing most recent {MAX_ROWS.toLocaleString()} — narrow further to see older
            </div>
          )}
        </div>

        {/* Body: empty state when no account; otherwise the register table. */}
        {!selectedAcct ? (
          <div className="text-center py-16">
            <p className="text-4xl mb-3">📒</p>
            <p className="text-lg font-semibold text-gray-700">No account selected</p>
            <p className="text-sm text-gray-500 mt-1 max-w-md mx-auto">
              Use the type and account dropdowns in the green header above to pick a register.
            </p>
          </div>
        ) : (
          <>
          {/* Register table — QB-style two-row layout per transaction.
              Outer container is the scroll viewport (max 75vh tall) so
              the sticky header has something to stick to. Both header
              rows get position:sticky so they stay frozen above the body
              while the user scrolls a long register. */}
          <div className="overflow-auto" style={{ maxHeight: '75vh' }}>
            <table className="w-full text-sm border-collapse" style={{ tableLayout: 'fixed' }}>
              <colgroup>
                <col style={{ width: '95px'  }} /> {/* Date */}
                <col style={{ width: '95px'  }} /> {/* Number/Ref */}
                <col />                             {/* Payee / Account / Memo (flex) */}
                <col style={{ width: '110px' }} /> {/* Left amount (Payment/Charge) */}
                <col style={{ width: '34px'  }} /> {/* ✓ */}
                <col style={{ width: '110px' }} /> {/* Right amount (Deposit/Payment) */}
                <col style={{ width: '120px' }} /> {/* Balance */}
              </colgroup>
              <thead>
                {/* Top header row — sticky at top: 0 */}
                <tr className="border-b border-gray-300 text-[10px] font-bold uppercase tracking-wide text-gray-600">
                  <th style={{ position: 'sticky', top: 0, zIndex: 20, backgroundColor: '#F3F4F6' }} className="px-2 py-1.5 text-left">DATE</th>
                  <th style={{ position: 'sticky', top: 0, zIndex: 20, backgroundColor: '#F3F4F6' }} className="px-2 py-1.5 text-left">{cols.numLabel}</th>
                  <th style={{ position: 'sticky', top: 0, zIndex: 20, backgroundColor: '#F3F4F6' }} className="px-2 py-1.5 text-left">PAYEE</th>
                  <th style={{ position: 'sticky', top: 0, zIndex: 20, backgroundColor: '#F3F4F6' }} className="px-2 py-1.5 text-right">{cols.leftLabel}</th>
                  <th style={{ position: 'sticky', top: 0, zIndex: 20, backgroundColor: '#F3F4F6' }} className="px-1 py-1.5 text-center">✓</th>
                  <th style={{ position: 'sticky', top: 0, zIndex: 20, backgroundColor: '#F3F4F6' }} className="px-2 py-1.5 text-right">{cols.rightLabel || ''}</th>
                  <th style={{ position: 'sticky', top: 0, zIndex: 20, backgroundColor: '#F3F4F6' }} className="px-2 py-1.5 text-right">BALANCE</th>
                </tr>
                {/* Sub-header row — sticky at top: 28px (height of row above) */}
                <tr className="border-b border-gray-300 text-[9px] font-semibold uppercase tracking-wide text-gray-400">
                  <th style={{ position: 'sticky', top: 28, zIndex: 19, backgroundColor: '#F9FAFB' }} className="px-2 py-1 text-left"></th>
                  <th style={{ position: 'sticky', top: 28, zIndex: 19, backgroundColor: '#F9FAFB' }} className="px-2 py-1 text-left">TYPE</th>
                  <th style={{ position: 'sticky', top: 28, zIndex: 19, backgroundColor: '#F9FAFB' }} className="px-2 py-1 text-left">ACCOUNT / MEMO</th>
                  <th style={{ position: 'sticky', top: 28, zIndex: 19, backgroundColor: '#F9FAFB' }} className="px-1 py-1"></th>
                  <th style={{ position: 'sticky', top: 28, zIndex: 19, backgroundColor: '#F9FAFB' }} className="px-1 py-1"></th>
                  <th style={{ position: 'sticky', top: 28, zIndex: 19, backgroundColor: '#F9FAFB' }} className="px-1 py-1"></th>
                  <th style={{ position: 'sticky', top: 28, zIndex: 19, backgroundColor: '#F9FAFB' }} className="px-1 py-1"></th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr><td colSpan={7} className="px-3 py-10 text-center text-gray-400">Loading register…</td></tr>
                )}
                {!loading && displayRows.length === 0 && (
                  <tr><td colSpan={7} className="px-3 py-10 text-center text-gray-400">
                    No transactions hit this account yet.
                  </td></tr>
                )}
                {!loading && displayRows.map((r, idx) => {
                  // Every transaction is the SAME split pattern: row 1
                  // white (main data), row 2 mint-green (Type / Account /
                  // Memo). The white-top establishes where each new
                  // transaction starts visually. Inline style so
                  // Tailwind's JIT can't drop the colour.
                  const topStyle    = { backgroundColor: '#FFFFFF' }
                  const bottomStyle = { backgroundColor: '#DCFCE7' }
                  const amountCell = fmt(r.amount)
                  const subAccountAndMemo = [r.offset_party, r.memo].filter(Boolean).join('  ·  ')
                  return (
                    <Fragment key={`${r.source_type}-${r.source_id}-${idx}`}>
                      {/* Row 1 of transaction — main data (WHITE) */}
                      <tr style={topStyle}>
                        <td style={topStyle} className="px-2 py-1.5 text-xs text-gray-700 whitespace-nowrap align-top">{fmtRegDate(r.txn_date)}</td>
                        <td style={topStyle} className="px-2 py-1.5 font-mono text-xs text-gray-700 truncate align-top">{r.ref || ''}</td>
                        <td style={topStyle} className="px-2 py-1.5 text-gray-900 truncate align-top" title={r.payee || ''}>{r.payee || ''}</td>
                        <td style={topStyle} className="px-2 py-1.5 text-right font-mono text-gray-900 align-top whitespace-nowrap">
                          {cols.side === 'left' ? amountCell : ''}
                        </td>
                        <td style={topStyle} className="px-1 py-1.5 text-center text-gray-400 align-top">
                          {/* Cleared/reconciled — we don't track it yet */}
                        </td>
                        <td style={topStyle} className="px-2 py-1.5 text-right font-mono text-gray-900 align-top whitespace-nowrap">
                          {cols.side === 'right' ? amountCell : ''}
                        </td>
                        <td style={topStyle} className="px-2 py-1.5 text-right font-mono font-semibold text-gray-800 align-top whitespace-nowrap">
                          {fmt(r._balance)}
                        </td>
                      </tr>
                      {/* Row 2 of transaction — secondary data, each
                          field stays in the SAME column as its primary:
                          Type lives under Number/Ref; Account & Memo
                          live under Payee. Amount / ✓ / Balance columns
                          stay empty on row 2 so the right-hand columns
                          line up cleanly with row 1. */}
                      <tr style={bottomStyle} className="border-b border-gray-200">
                        <td style={bottomStyle} className="px-2 pb-1.5 pt-0"></td>
                        <td style={bottomStyle} className="px-2 pb-1.5 pt-0">
                          <span className={`inline-block text-[9px] px-1.5 py-0.5 rounded font-semibold uppercase ${typeStyle(r.txn_type)}`}>
                            {r.txn_type}
                          </span>
                        </td>
                        <td style={bottomStyle} className="px-2 pb-1.5 pt-0 text-xs text-gray-500 truncate" title={subAccountAndMemo}>
                          {subAccountAndMemo || <span className="text-gray-300">—</span>}
                        </td>
                        <td style={bottomStyle} className="px-2 pb-1.5 pt-0"></td>
                        <td style={bottomStyle} className="px-1 pb-1.5 pt-0"></td>
                        <td style={bottomStyle} className="px-2 pb-1.5 pt-0"></td>
                        <td style={bottomStyle} className="px-2 pb-1.5 pt-0"></td>
                      </tr>
                    </Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
          </>
        )}
      </div>
    </div>
  )
}

function typeStyle(code) {
  switch (code) {
    case 'CHK':  return 'bg-blue-100 text-blue-700'
    case 'CC':   return 'bg-purple-100 text-purple-700'
    case 'BILL': return 'bg-amber-100 text-amber-700'
    case 'IR':   return 'bg-gray-100 text-gray-700'
    case 'INV':  return 'bg-green-100 text-green-700'
    default:     return 'bg-gray-100 text-gray-600'
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// Chart of Accounts is grouped by QB account TYPE (14 sections) rather than
// rolled-up into the 6 high-level PBS types. The `subtype` column is what
// the qbwc Account sync stores; for manual rows without a subtype we fall
// back to a sensible default per the `type` column.
const COA_SECTIONS = [
  { subtype: 'Bank',                    type: 'asset',     bg: 'bg-blue-50',    text: 'text-blue-800' },
  { subtype: 'Accounts Receivable',     type: 'asset',     bg: 'bg-blue-50',    text: 'text-blue-800' },
  { subtype: 'Other Current Asset',     type: 'asset',     bg: 'bg-blue-50',    text: 'text-blue-800' },
  { subtype: 'Fixed Asset',             type: 'asset',     bg: 'bg-blue-50',    text: 'text-blue-800' },
  { subtype: 'Other Asset',             type: 'asset',     bg: 'bg-blue-50',    text: 'text-blue-800' },
  { subtype: 'Accounts Payable',        type: 'liability', bg: 'bg-red-50',     text: 'text-red-800' },
  { subtype: 'Credit Card',             type: 'liability', bg: 'bg-red-50',     text: 'text-red-800' },
  { subtype: 'Other Current Liability', type: 'liability', bg: 'bg-red-50',     text: 'text-red-800' },
  { subtype: 'Long-Term Liability',     type: 'liability', bg: 'bg-red-50',     text: 'text-red-800' },
  { subtype: 'Equity',                  type: 'equity',    bg: 'bg-purple-50',  text: 'text-purple-800' },
  { subtype: 'Income',                  type: 'income',    bg: 'bg-green-50',   text: 'text-green-800' },
  { subtype: 'Cost of Goods Sold',      type: 'cogs',      bg: 'bg-orange-50',  text: 'text-orange-800' },
  { subtype: 'Expense',                 type: 'expense',   bg: 'bg-yellow-50',  text: 'text-yellow-800' },
  { subtype: 'Other Expense',           type: 'expense',   bg: 'bg-yellow-50',  text: 'text-yellow-800' },
]

function ChartOfAccountsTab({ accounts, onRefresh }) {
  const { confirm, dialog } = useConfirm()
  const [modal, setModal] = useState(null)
  // Per-account transaction count, fetched from v_acct_account_txn_counts.
  // Empty object renders 0 until the fetch resolves — no spinner needed.
  const [txnCounts, setTxnCounts] = useState({})

  useEffect(() => {
    let cancelled = false
    supabase
      .from('v_acct_account_txn_counts')
      .select('account_id, txn_count')
      .then(({ data }) => {
        if (cancelled || !data) return
        const map = {}
        for (const r of data) map[r.account_id] = r.txn_count
        setTxnCounts(map)
      })
    return () => { cancelled = true }
  }, [accounts])

  // Bucket each account into one of the 14 sections by subtype. Accounts
  // whose subtype isn't one of the 14 are simply dropped from this view —
  // there is no Uncategorised section.
  const buckets = {}
  for (const s of COA_SECTIONS) buckets[s.subtype] = []
  for (const a of accounts) {
    const sub = (a.subtype || '').trim()
    if (sub && buckets[sub]) buckets[sub].push(a)
  }
  for (const sub of Object.keys(buckets)) {
    buckets[sub].sort(
      (a, b) =>
        (a.sort_order - b.sort_order) ||
        (a.number || '').localeCompare(b.number || '') ||
        (a.name   || '').localeCompare(b.name   || '')
    )
  }

  async function saveAccount(data) {
    if (modal?.id) {
      await supabase.from('acct_accounts').update(data).eq('id', modal.id)
    } else {
      await supabase.from('acct_accounts').insert(data)
    }
    setModal(null)
    onRefresh()
  }

  async function deleteAccount(id) {
    const ok = await confirm('Delete this account? This cannot be undone.')
    if (!ok) return
    await supabase.from('acct_accounts').delete().eq('id', id)
    onRefresh()
  }

  return (
    <div>
      {dialog}
      <div className="flex justify-end mb-4 pr-6">
        <button onClick={() => setModal('new')} className="btn-primary text-sm px-4 py-2">
          + New Account
        </button>
      </div>

      <div className="space-y-4">
        {COA_SECTIONS.map(section => {
          const typeAccts = buckets[section.subtype] || []
          return (
            <div key={section.subtype} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div
                className={`px-4 py-2.5 flex items-center gap-2 border-b border-gray-100 ${section.bg}`}
              >
                <span className={`text-xs font-bold uppercase tracking-wide ${section.text}`}>
                  {section.subtype}
                </span>
                <span className={`text-[10px] font-semibold ${section.text} opacity-60`}>
                  {typeAccts.length} account{typeAccts.length !== 1 ? 's' : ''}
                </span>
              </div>
              {typeAccts.length === 0 ? (
                <p className="text-xs text-gray-400 px-4 py-4 italic">
                  No {section.subtype.toLowerCase()} accounts.
                </p>
              ) : (
                <table className="w-full text-sm" style={{ tableLayout: 'fixed' }}>
                  {/* Fixed column widths so the Status badge and Edit/Del
                      buttons line up vertically across every section.
                      Right-hand columns are sized ~50% wider; Name and
                      Description are tightened so the right side has room. */}
                  <colgroup>
                    <col style={{ width: '90px'  }} />    {/* # */}
                    <col style={{ width: '240px' }} />    {/* Name */}
                    <col style={{ width: '280px' }} />    {/* Description */}
                    <col style={{ width: '135px' }} />    {/* Txns */}
                    <col style={{ width: '150px' }} />    {/* Status */}
                    <col style={{ width: '135px' }} />    {/* Actions */}
                  </colgroup>
                  <tbody className="divide-y divide-gray-50">
                    {typeAccts.map(acct => (
                      <tr key={acct.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2.5 font-mono text-xs text-gray-400 truncate">
                          {acct.number}
                        </td>
                        <td className="px-4 py-2.5 font-medium text-gray-800 truncate" title={acct.name}>
                          {acct.name}
                        </td>
                        <td className="px-4 py-2.5 text-xs text-gray-400 truncate" title={acct.description || ''}>
                          {acct.description || ''}
                        </td>
                        <td className="px-4 py-2.5 text-xs text-gray-600 text-right font-mono">
                          {(txnCounts[acct.id] || 0).toLocaleString()}
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          <span
                            className={`inline-block text-[10px] px-1.5 py-0.5 rounded-full ${acct.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}
                          >
                            {acct.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          {/* Icons, moved ~1/4 inch (24px) in from the
                              right edge with pr-6, and spaced ~1/8 inch
                              (12px) apart with gap-5. */}
                          <div className="flex justify-end items-center gap-5 pr-6">
                            <button
                              onClick={() => setModal(acct)}
                              title="Edit account"
                              aria-label="Edit account"
                              className="text-gray-400 hover:text-gray-700"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                  d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 012.828 0l.172.172a2 2 0 010 2.828L12 16H9v-3z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => deleteAccount(acct.id)}
                              title="Delete account"
                              aria-label="Delete account"
                              className="text-red-400 hover:text-red-600"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )
        })}

      </div>

      {modal && (
        <AccountModal
          account={modal === 'new' ? null : modal}
          onSave={saveAccount}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}

function AccountModal({ account, onSave, onClose }) {
  const [form, setForm] = useState({
    number: account?.number || '',
    name: account?.name || '',
    type: account?.type || 'expense',
    subtype: account?.subtype || '',
    description: account?.description || '',
    is_active: account?.is_active ?? true,
  })
  return (
    <Modal onClose={onClose}>
      <div className="px-6 pt-5 pb-4 border-b border-gray-100 flex-shrink-0">
        <h3 className="text-sm font-bold text-gray-800">
          {account ? 'Edit Account' : 'New Account'}
        </h3>
      </div>
      <div className="px-6 py-5 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Account #</label>
            <input
              className="input text-sm w-full"
              value={form.number}
              onChange={e => setForm(p => ({ ...p, number: e.target.value }))}
              placeholder="e.g. 6010"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Type</label>
            <select
              className="input text-sm w-full"
              value={form.type}
              onChange={e => setForm(p => ({ ...p, type: e.target.value }))}
            >
              {ACCOUNT_TYPES.map(t => (
                <option key={t} value={t}>
                  {TYPE_COLORS[t].label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Account Name</label>
          <input
            className="input text-sm w-full"
            value={form.name}
            onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
            placeholder="Account name"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Subtype</label>
          <input
            className="input text-sm w-full"
            value={form.subtype}
            onChange={e => setForm(p => ({ ...p, subtype: e.target.value }))}
            placeholder="e.g. bank, receivable, payroll"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
          <input
            className="input text-sm w-full"
            value={form.description}
            onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
          <input
            type="checkbox"
            checked={form.is_active}
            onChange={e => setForm(p => ({ ...p, is_active: e.target.checked }))}
          />
          Active
        </label>
      </div>
      <div className="px-6 pb-5 flex justify-end gap-2 flex-shrink-0">
        <button
          onClick={onClose}
          className="px-4 py-2 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          onClick={() => onSave(form)}
          disabled={!form.name}
          className="btn-primary text-sm px-5 py-2 disabled:opacity-50"
        >
          Save
        </button>
      </div>
    </Modal>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// REPORTS TAB
// ═════════════════════════════════════════════════════════════════════════════
function ReportsTab({ invoices, bills, bankAccounts }) {
  const now = new Date()
  const [report, setReport] = useState('pl')
  const [dateFrom, setDateFrom] = useState(`${now.getFullYear()}-01-01`)
  const [dateTo, setDateTo] = useState(today())

  // P&L: use invoice payments (revenue) and bills (expenses) within date range
  const paidInvoices = invoices.filter(
    i => i.status === 'paid' && i.date >= dateFrom && i.date <= dateTo
  )
  const paidBills = bills.filter(b => b.status === 'paid' && b.date >= dateFrom && b.date <= dateTo)

  const totalRevenue = paidInvoices.reduce((s, i) => s + Number(i.total), 0)
  const totalCOGS = 0 // would need journal entries for full COGS
  const totalExpenses = paidBills.reduce((s, b) => s + Number(b.total), 0)
  const grossProfit = totalRevenue - totalCOGS
  const netIncome = grossProfit - totalExpenses

  // Balance sheet
  const totalAssets = bankAccounts
    .filter(b => b.type !== 'credit_card')
    .reduce((s, b) => s + Number(b.current_balance), 0)
  const totalAR = invoices
    .filter(i => i.status !== 'paid' && i.status !== 'void')
    .reduce((s, i) => s + Number(i.balance_due), 0)
  const totalLiab = bankAccounts
    .filter(b => b.type === 'credit_card')
    .reduce((s, b) => s + Math.abs(Number(b.current_balance)), 0)
  const totalAP = bills
    .filter(b => b.status !== 'paid' && b.status !== 'void')
    .reduce((s, b) => s + Number(b.balance_due), 0)

  // AR Aging
  const agingBuckets = { current: [], '1-30': [], '31-60': [], '61-90': [], '90+': [] }
  const today_ = new Date()
  invoices
    .filter(i => i.status !== 'paid' && i.status !== 'void' && Number(i.balance_due) > 0)
    .forEach(inv => {
      if (!inv.due_date) {
        agingBuckets.current.push(inv)
        return
      }
      const days = Math.floor((today_ - new Date(inv.due_date + 'T00:00:00')) / 86400000)
      if (days <= 0) agingBuckets.current.push(inv)
      else if (days <= 30) agingBuckets['1-30'].push(inv)
      else if (days <= 60) agingBuckets['31-60'].push(inv)
      else if (days <= 90) agingBuckets['61-90'].push(inv)
      else agingBuckets['90+'].push(inv)
    })

  const Section = ({ label, amount, indent = false, bold = false, border = false }) => (
    <div
      className={`flex justify-between py-1.5 px-4 text-sm ${indent ? 'pl-8' : ''} ${bold ? 'font-bold' : ''} ${border ? 'border-t border-gray-200 mt-1' : ''}`}
    >
      <span className={bold ? 'text-gray-800' : 'text-gray-600'}>{label}</span>
      <span
        className={`${bold ? 'text-gray-800' : 'text-gray-700'} ${Number(amount) < 0 ? 'text-red-600' : ''}`}
      >
        {fmt(amount)}
      </span>
    </div>
  )

  return (
    <div>
      <div className="flex gap-1 mb-5 flex-wrap">
        {[
          { key: 'pl', label: 'Profit & Loss' },
          { key: 'bs', label: 'Balance Sheet' },
          { key: 'ar', label: 'AR Aging' },
          { key: 'ap', label: 'AP Aging' },
        ].map(r => (
          <button
            key={r.key}
            onClick={() => setReport(r.key)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${report === r.key ? 'bg-green-700 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            {r.label}
          </button>
        ))}

        {report === 'pl' && (
          <div className="flex items-center gap-2 ml-4">
            <input
              type="date"
              className="input text-xs py-1.5"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
            />
            <span className="text-xs text-gray-400">to</span>
            <input
              type="date"
              className="input text-xs py-1.5"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
            />
          </div>
        )}
      </div>

      {report === 'pl' && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden max-w-lg">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
            <p className="text-sm font-bold text-gray-800">Profit & Loss</p>
            <p className="text-xs text-gray-400">
              {fmtDate(dateFrom)} — {fmtDate(dateTo)}
            </p>
          </div>
          <div className="py-2">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide px-4 py-1.5">
              Income
            </p>
            <Section label="Landscaping Revenue" amount={totalRevenue} indent />
            <Section label="Total Income" amount={totalRevenue} bold border />
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide px-4 py-1.5 mt-3">
              Cost of Goods Sold
            </p>
            <Section label="Total COGS" amount={totalCOGS} bold border />
            <Section label="Gross Profit" amount={grossProfit} bold border />
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide px-4 py-1.5 mt-3">
              Expenses
            </p>
            <Section label="Vendor Bills & Expenses" amount={totalExpenses} indent />
            <Section label="Total Expenses" amount={totalExpenses} bold border />
            <Section label="Net Income" amount={netIncome} bold border />
          </div>
        </div>
      )}

      {report === 'bs' && (
        <div className="grid grid-cols-2 gap-6 max-w-2xl">
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 bg-blue-50 border-b border-gray-100">
              <p className="text-sm font-bold text-blue-700">Assets</p>
            </div>
            <div className="py-2">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wide px-4 py-1.5">
                Current Assets
              </p>
              {bankAccounts
                .filter(b => b.type !== 'credit_card')
                .map(b => (
                  <Section key={b.id} label={b.name} amount={b.current_balance} indent />
                ))}
              <Section label="Accounts Receivable" amount={totalAR} indent />
              <Section label="Total Assets" amount={totalAssets + totalAR} bold border />
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 bg-red-50 border-b border-gray-100">
              <p className="text-sm font-bold text-red-700">Liabilities & Equity</p>
            </div>
            <div className="py-2">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wide px-4 py-1.5">
                Liabilities
              </p>
              <Section label="Accounts Payable" amount={totalAP} indent />
              {bankAccounts
                .filter(b => b.type === 'credit_card')
                .map(b => (
                  <Section key={b.id} label={b.name} amount={Math.abs(b.current_balance)} indent />
                ))}
              <Section label="Total Liabilities" amount={totalLiab + totalAP} bold border />
            </div>
          </div>
        </div>
      )}

      {(report === 'ar' || report === 'ap') && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
            <p className="text-sm font-bold text-gray-800">
              {report === 'ar' ? 'Accounts Receivable Aging' : 'Accounts Payable Aging'}
            </p>
          </div>
          {report === 'ar' && (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  {[
                    'Client',
                    'Invoice #',
                    'Due Date',
                    'Current',
                    '1-30 days',
                    '31-60 days',
                    '61-90 days',
                    '90+ days',
                    'Total',
                  ].map(h => (
                    <th
                      key={h}
                      className="text-left text-xs font-semibold text-gray-400 px-4 py-2.5"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {invoices
                  .filter(
                    i => i.status !== 'paid' && i.status !== 'void' && Number(i.balance_due) > 0
                  )
                  .map(inv => {
                    const days = inv.due_date
                      ? Math.floor((today_ - new Date(inv.due_date + 'T00:00:00')) / 86400000)
                      : 0
                    const bal = Number(inv.balance_due)
                    return (
                      <tr key={inv.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2.5 font-medium text-gray-800">
                          {inv.client_name || '—'}
                        </td>
                        <td className="px-4 py-2.5 font-mono text-xs text-gray-400">
                          {inv.number}
                        </td>
                        <td className="px-4 py-2.5 text-xs text-gray-500">
                          {fmtDate(inv.due_date)}
                        </td>
                        <td className="px-4 py-2.5">{days <= 0 ? fmt(bal) : '—'}</td>
                        <td className="px-4 py-2.5">{days > 0 && days <= 30 ? fmt(bal) : '—'}</td>
                        <td className="px-4 py-2.5">{days > 30 && days <= 60 ? fmt(bal) : '—'}</td>
                        <td className="px-4 py-2.5">{days > 60 && days <= 90 ? fmt(bal) : '—'}</td>
                        <td className="px-4 py-2.5 text-red-600">{days > 90 ? fmt(bal) : '—'}</td>
                        <td className="px-4 py-2.5 font-semibold text-gray-800">{fmt(bal)}</td>
                      </tr>
                    )
                  })}
              </tbody>
            </table>
          )}
          {report === 'ap' && (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  {['Vendor', 'Bill #', 'Due Date', 'Balance'].map(h => (
                    <th
                      key={h}
                      className="text-left text-xs font-semibold text-gray-400 px-4 py-2.5"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {bills
                  .filter(
                    b => b.status !== 'paid' && b.status !== 'void' && Number(b.balance_due) > 0
                  )
                  .map(bill => (
                    <tr key={bill.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2.5 font-medium text-gray-800">
                        {bill.vendor_name || '—'}
                      </td>
                      <td className="px-4 py-2.5 font-mono text-xs text-gray-400">
                        {bill.number || '—'}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-gray-500">
                        {fmtDate(bill.due_date)}
                      </td>
                      <td className="px-4 py-2.5 font-semibold text-gray-800">
                        {fmt(bill.balance_due)}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// MAIN ACCOUNTING PAGE
// ═════════════════════════════════════════════════════════════════════════════
const TABS = [
  { key: 'dashboard', label: '📊 Dashboard' },
  { key: 'invoices',  label: '📄 Invoices' },
  { key: 'bills',     label: '💳 Bills & Expenses' },
  { key: 'checks',    label: '🧾 Checks' },
  { key: 'cc',        label: '💳 Credit Cards' },
  { key: 'banking',   label: '🏦 Banking' },
  { key: 'accounts',  label: '📒 Chart of Accounts' },
  { key: 'registers', label: '📓 Registers' },
  { key: 'reports',   label: '📈 Reports' },
]

// ── Data fetch ────────────────────────────────────────────────────────────────
// Cached by useCachedData('accounting:all', …) so revisiting Accounting renders
// instantly from cache and refreshes in the background.
async function fetchAccountingData() {
  const [invRes, billRes, acctRes, bankRes, clientRes, jobRes, vendorRes] = await Promise.all([
    supabase.from('acct_invoices').select('*').order('date', { ascending: false }),
    supabase.from('acct_bills').select('*').order('date', { ascending: false }),
    supabase.from('acct_accounts').select('*').eq('is_active', true).order('sort_order'),
    supabase.from('acct_bank_accounts').select('*').eq('is_active', true).order('name'),
    // Server max-rows is 1k; paginate to get all 1.6k+ clients and 2k+ jobs.
    fetchAllPaginated(() =>
      supabase.from('clients').select('id, name').order('name')
    ),
    fetchAllPaginated(() =>
      supabase
        .from('jobs')
        .select('id, name, client_name')
        .order('created_at', { ascending: false })
    ),
    supabase
      .from('subs_vendors')
      .select('id, company_name')
      .eq('type', 'sub')
      .order('company_name'),
  ])
  const coreErr = invRes.error || billRes.error || acctRes.error || bankRes.error
  if (coreErr) throw coreErr
  return {
    invoices: invRes.data || [],
    bills: billRes.data || [],
    accounts: acctRes.data || [],
    bankAccounts: bankRes.data || [],
    clients: clientRes.data || [],
    jobs: jobRes.data || [],
    vendors: vendorRes.data || [],
  }
}

export default function Accounting() {
  const [tab, setTab] = useState('dashboard')

  // Cached data — instant on revisit; refresh() forces a refetch after writes.
  const { data: acctData, loading, refresh } = useCachedData('accounting:all', fetchAccountingData)
  const invoices = acctData?.invoices ?? []
  const bills = acctData?.bills ?? []
  const accounts = acctData?.accounts ?? []
  const bankAccounts = acctData?.bankAccounts ?? []
  const clients = acctData?.clients ?? []
  const jobs = acctData?.jobs ?? []
  const vendors = acctData?.vendors ?? []

  if (loading)
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-700" />
      </div>
    )

  return (
    <div className="flex flex-col h-full">
      {/* Page header */}
      <div className="flex items-center justify-between mb-4 flex-shrink-0 gap-3">
        <h1 className="text-xl font-bold text-gray-900">Accounting</h1>
      </div>

      {/* Tab bar */}
      <div className="bg-white border-b border-gray-200 flex gap-0 flex-shrink-0">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
              tab === t.key
                ? 'border-green-700 text-green-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto pt-4">
        {tab === 'dashboard' && (
          <DashboardTab
            invoices={invoices}
            bills={bills}
            bankAccounts={bankAccounts}
            accounts={accounts}
            onNavigate={setTab}
          />
        )}
        {tab === 'invoices' && (
          <InvoicesTab
            invoices={invoices}
            clients={clients}
            jobs={jobs}
            accounts={accounts}
            onRefresh={refresh}
          />
        )}
        {tab === 'bills' && (
          <BillsTab
            bills={bills}
            vendors={vendors}
            accounts={accounts}
            jobs={jobs}
            onRefresh={refresh}
          />
        )}
        {tab === 'checks' && <ChecksTab />}
        {tab === 'cc'     && <CreditCardsTab />}
        {tab === 'banking' && (
          <BankingTab bankAccounts={bankAccounts} accounts={accounts} onRefresh={refresh} />
        )}
        {tab === 'accounts'  && <ChartOfAccountsTab accounts={accounts} onRefresh={refresh} />}
        {tab === 'registers' && <RegistersTab accounts={accounts} />}
        {tab === 'reports' && (
          <ReportsTab
            invoices={invoices}
            bills={bills}
            accounts={accounts}
            bankAccounts={bankAccounts}
          />
        )}
      </div>
    </div>
  )
}
