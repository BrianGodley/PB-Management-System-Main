import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt  = n => Number(n || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD' })
const fmtN = n => Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const today = () => new Date().toISOString().slice(0, 10)
const addDays = (ds, n) => { const d = new Date(ds + 'T00:00:00'); d.setDate(d.getDate() + n); return d.toISOString().slice(0,10) }
const fmtDate = ds => ds ? new Date(ds + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'
const isOverdue = (dueDate, status) => dueDate && status !== 'paid' && status !== 'void' && new Date(dueDate + 'T00:00:00') < new Date()

const STATUS_COLORS = {
  draft:   'bg-gray-100 text-gray-600',
  sent:    'bg-blue-100 text-blue-700',
  open:    'bg-blue-100 text-blue-700',
  paid:    'bg-green-100 text-green-700',
  overdue: 'bg-red-100 text-red-700',
  void:    'bg-gray-100 text-gray-400',
}

const TYPE_COLORS = {
  asset:     { bg: 'bg-blue-50',   text: 'text-blue-700',   label: 'Asset'     },
  liability: { bg: 'bg-red-50',    text: 'text-red-700',    label: 'Liability' },
  equity:    { bg: 'bg-purple-50', text: 'text-purple-700', label: 'Equity'    },
  income:    { bg: 'bg-green-50',  text: 'text-green-700',  label: 'Income'    },
  cogs:      { bg: 'bg-orange-50', text: 'text-orange-700', label: 'COGS'      },
  expense:   { bg: 'bg-yellow-50', text: 'text-yellow-700', label: 'Expense'   },
}

const ACCOUNT_TYPES = ['asset','liability','equity','income','cogs','expense']
const PAYMENT_METHODS = ['Check','ACH','Credit Card','Cash','Wire Transfer','Zelle','Other']

// ── Reusable ModalOverlay ─────────────────────────────────────────────────────
function Modal({ children, onClose, wide = false }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className={`bg-white rounded-2xl shadow-2xl w-full flex flex-col ${wide ? 'max-w-4xl' : 'max-w-lg'}`}
        style={{ maxHeight: '92vh' }}>
        {children}
      </div>
    </div>
  )
}

// ── Confirm dialog ────────────────────────────────────────────────────────────
function useConfirm() {
  const [state, setState] = useState(null)
  const confirm = (msg) => new Promise(resolve => setState({ msg, resolve }))
  const dialog = state ? (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6">
        <p className="text-sm text-gray-700 mb-5">{state.msg}</p>
        <div className="flex gap-2 justify-end">
          <button onClick={() => { state.resolve(false); setState(null) }}
            className="px-4 py-2 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">Cancel</button>
          <button onClick={() => { state.resolve(true); setState(null) }}
            className="px-4 py-2 text-sm rounded-lg bg-red-600 text-white hover:bg-red-700">Confirm</button>
        </div>
      </div>
    </div>
  ) : null
  return { confirm, dialog }
}

// ═════════════════════════════════════════════════════════════════════════════
// DASHBOARD TAB
// ═════════════════════════════════════════════════════════════════════════════
function DashboardTab({ invoices, bills, bankAccounts, accounts, onNavigate }) {
  const totalCash = bankAccounts.filter(b => b.type !== 'credit_card').reduce((s, b) => s + Number(b.current_balance), 0)
  const totalAR   = invoices.filter(i => i.status !== 'paid' && i.status !== 'void').reduce((s, i) => s + Number(i.balance_due), 0)
  const totalAP   = bills.filter(b => b.status !== 'paid' && b.status !== 'void').reduce((s, b) => s + Number(b.balance_due), 0)
  const overdueInv = invoices.filter(i => isOverdue(i.due_date, i.status))
  const overdueBills = bills.filter(b => isOverdue(b.due_date, b.status))

  const now = new Date()
  const monthStart = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-01`

  const metrics = [
    { label: 'Total Cash',            value: fmt(totalCash),   sub: `${bankAccounts.length} account${bankAccounts.length !== 1 ? 's' : ''}`, color: 'text-blue-700',  bg: 'bg-blue-50',  tab: 'banking'  },
    { label: 'Outstanding Invoices',  value: fmt(totalAR),     sub: `${invoices.filter(i=>i.status!=='paid'&&i.status!=='void').length} open`, color: 'text-green-700', bg: 'bg-green-50', tab: 'invoices' },
    { label: 'Outstanding Bills',     value: fmt(totalAP),     sub: `${bills.filter(b=>b.status!=='paid'&&b.status!=='void').length} open`,   color: 'text-red-700',   bg: 'bg-red-50',   tab: 'bills'    },
    { label: 'Overdue Invoices',      value: overdueInv.length, sub: fmt(overdueInv.reduce((s,i)=>s+Number(i.balance_due),0)), color: 'text-orange-700', bg: 'bg-orange-50', tab: 'invoices' },
  ]

  const recentInv = [...invoices].sort((a,b) => b.created_at > a.created_at ? 1 : -1).slice(0, 5)
  const recentBills = [...bills].sort((a,b) => b.created_at > a.created_at ? 1 : -1).slice(0, 5)

  return (
    <div className="space-y-6">
      {/* Metric cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map(m => (
          <button key={m.label} onClick={() => onNavigate(m.tab)}
            className={`${m.bg} rounded-xl p-4 text-left hover:opacity-80 transition-opacity`}>
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
            <button onClick={() => onNavigate('invoices')} className="text-xs text-green-700 hover:underline">View all</button>
          </div>
          <div className="divide-y divide-gray-50">
            {recentInv.length === 0 && <p className="text-xs text-gray-400 px-4 py-6 text-center">No invoices yet</p>}
            {recentInv.map(inv => (
              <div key={inv.id} className="flex items-center justify-between px-4 py-2.5">
                <div>
                  <p className="text-sm font-medium text-gray-800">{inv.client_name || '—'}</p>
                  <p className="text-xs text-gray-400">#{inv.number} · {fmtDate(inv.date)}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-800">{fmt(inv.total)}</p>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${STATUS_COLORS[isOverdue(inv.due_date,inv.status)?'overdue':inv.status] || STATUS_COLORS.draft}`}>
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
            <button onClick={() => onNavigate('bills')} className="text-xs text-green-700 hover:underline">View all</button>
          </div>
          <div className="divide-y divide-gray-50">
            {recentBills.length === 0 && <p className="text-xs text-gray-400 px-4 py-6 text-center">No bills yet</p>}
            {recentBills.map(bill => (
              <div key={bill.id} className="flex items-center justify-between px-4 py-2.5">
                <div>
                  <p className="text-sm font-medium text-gray-800">{bill.vendor_name || '—'}</p>
                  <p className="text-xs text-gray-400">#{bill.number || '—'} · {fmtDate(bill.date)}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-800">{fmt(bill.total)}</p>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${STATUS_COLORS[isOverdue(bill.due_date,bill.status)?'overdue':bill.status] || STATUS_COLORS.open}`}>
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
            <button onClick={() => onNavigate('banking')} className="text-xs text-green-700 hover:underline">Manage</button>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-gray-100">
            {bankAccounts.map(acct => (
              <div key={acct.id} className="px-4 py-3">
                <p className="text-xs text-gray-500 font-medium">{acct.name}</p>
                <p className={`text-lg font-bold mt-0.5 ${Number(acct.current_balance) < 0 ? 'text-red-600' : 'text-gray-800'}`}>
                  {fmt(acct.current_balance)}
                </p>
                <p className="text-[10px] text-gray-400 capitalize">{acct.type.replace('_',' ')}</p>
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
function LineEditor({ lines, onChange, accounts, incomeAccounts }) {
  function updateLine(idx, field, val) {
    const updated = lines.map((l, i) => {
      if (i !== idx) return l
      const next = { ...l, [field]: val }
      if (field === 'quantity' || field === 'unit_price') {
        next.amount = (parseFloat(next.quantity)||0) * (parseFloat(next.unit_price)||0)
      }
      return next
    })
    onChange(updated)
  }
  function addLine() { onChange([...lines, { description: '', quantity: 1, unit_price: '', amount: 0, account_id: '' }]) }
  function removeLine(idx) { onChange(lines.filter((_,i) => i !== idx)) }

  return (
    <div>
      <div className="grid grid-cols-12 gap-1 mb-1 px-1">
        <span className="col-span-5 text-[10px] font-semibold text-gray-400 uppercase">Description</span>
        <span className="col-span-2 text-[10px] font-semibold text-gray-400 uppercase text-right">Qty</span>
        <span className="col-span-2 text-[10px] font-semibold text-gray-400 uppercase text-right">Rate</span>
        <span className="col-span-2 text-[10px] font-semibold text-gray-400 uppercase text-right">Amount</span>
        <span className="col-span-1" />
      </div>
      {lines.map((line, idx) => (
        <div key={idx} className="grid grid-cols-12 gap-1 mb-1 items-center">
          <input className="col-span-5 input text-xs py-1" placeholder="Item description"
            value={line.description} onChange={e => updateLine(idx, 'description', e.target.value)} />
          <input className="col-span-2 input text-xs py-1 text-right" type="number" min="0" placeholder="1"
            value={line.quantity} onChange={e => updateLine(idx, 'quantity', e.target.value)} />
          <input className="col-span-2 input text-xs py-1 text-right" type="number" min="0" step="0.01" placeholder="0.00"
            value={line.unit_price} onChange={e => updateLine(idx, 'unit_price', e.target.value)} />
          <div className="col-span-2 text-right text-xs font-semibold text-gray-700 pr-1">{fmtN(line.amount)}</div>
          <button onClick={() => removeLine(idx)} className="col-span-1 text-gray-300 hover:text-red-400 text-center">×</button>
        </div>
      ))}
      <button onClick={addLine} className="mt-2 text-xs text-green-700 hover:underline font-medium">+ Add line</button>
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// INVOICES TAB
// ═════════════════════════════════════════════════════════════════════════════
function InvoicesTab({ invoices, clients, jobs, accounts, onRefresh }) {
  const { confirm, dialog } = useConfirm()
  const [filter, setFilter] = useState('all')
  const [modal,  setModal]  = useState(null) // null | 'new' | invoice obj
  const [payModal, setPayModal] = useState(null)

  const incomeAccts = accounts.filter(a => a.type === 'income')
  const arAcct = accounts.find(a => a.subtype === 'receivable')

  const filtered = invoices.filter(inv => {
    const status = isOverdue(inv.due_date, inv.status) ? 'overdue' : inv.status
    return filter === 'all' || status === filter
  })

  const FILTERS = [
    { key: 'all',     label: 'All'     },
    { key: 'draft',   label: 'Draft'   },
    { key: 'sent',    label: 'Sent'    },
    { key: 'overdue', label: 'Overdue' },
    { key: 'paid',    label: 'Paid'    },
  ]

  async function saveInvoice(data, lines) {
    const subtotal = lines.reduce((s, l) => s + Number(l.amount||0), 0)
    const tax_amount = subtotal * Number(data.tax_rate||0)
    const total = subtotal + tax_amount
    const payload = { ...data, subtotal, tax_amount, total, balance_due: total - Number(data.amount_paid||0) }

    if (modal?.id) {
      await supabase.from('acct_invoices').update(payload).eq('id', modal.id)
      await supabase.from('acct_invoice_lines').delete().eq('invoice_id', modal.id)
      const lineRows = lines.map((l,i) => ({ ...l, invoice_id: modal.id, sort_order: i }))
      if (lineRows.length) await supabase.from('acct_invoice_lines').insert(lineRows)
    } else {
      const num = `INV-${Date.now().toString().slice(-6)}`
      const { data: inv } = await supabase.from('acct_invoices').insert({ ...payload, number: num }).select().single()
      if (inv) {
        const lineRows = lines.map((l,i) => ({ ...l, invoice_id: inv.id, sort_order: i }))
        if (lineRows.length) await supabase.from('acct_invoice_lines').insert(lineRows)
      }
    }
    setModal(null); onRefresh()
  }

  async function markSent(id) {
    await supabase.from('acct_invoices').update({ status: 'sent' }).eq('id', id)
    onRefresh()
  }

  async function recordPayment(inv, payData) {
    const newPaid = Number(inv.amount_paid||0) + Number(payData.amount)
    const newBal  = Number(inv.total) - newPaid
    const status  = newBal <= 0.005 ? 'paid' : 'sent'
    await supabase.from('acct_invoices').update({ amount_paid: newPaid, balance_due: Math.max(0, newBal), status }).eq('id', inv.id)
    await supabase.from('acct_payments').insert({ type: 'customer', date: payData.date, amount: payData.amount, payment_method: payData.method, reference: payData.ref, invoice_id: inv.id })
    setPayModal(null); onRefresh()
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
            <button key={f.key} onClick={() => setFilter(f.key)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${filter === f.key ? 'bg-green-700 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              {f.label}
            </button>
          ))}
        </div>
        <button onClick={() => setModal('new')} className="btn-primary text-sm px-4 py-2">+ New Invoice</button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              {['#','Client','Date','Due Date','Total','Balance Due','Status',''].map(h => (
                <th key={h} className="text-left text-xs font-semibold text-gray-400 px-4 py-2.5">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.length === 0 && (
              <tr><td colSpan={8} className="text-center text-gray-400 text-sm py-10">No invoices found.</td></tr>
            )}
            {filtered.map(inv => {
              const status = isOverdue(inv.due_date, inv.status) ? 'overdue' : inv.status
              return (
                <tr key={inv.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-2.5 font-mono text-xs text-gray-500">{inv.number}</td>
                  <td className="px-4 py-2.5 font-medium text-gray-800">{inv.client_name || '—'}</td>
                  <td className="px-4 py-2.5 text-gray-500 text-xs">{fmtDate(inv.date)}</td>
                  <td className="px-4 py-2.5 text-gray-500 text-xs">{fmtDate(inv.due_date)}</td>
                  <td className="px-4 py-2.5 font-semibold text-gray-800">{fmt(inv.total)}</td>
                  <td className="px-4 py-2.5 font-semibold text-gray-800">{fmt(inv.balance_due)}</td>
                  <td className="px-4 py-2.5">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold capitalize ${STATUS_COLORS[status] || STATUS_COLORS.draft}`}>{status}</span>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex gap-1">
                      {inv.status === 'draft' && (
                        <button onClick={() => markSent(inv.id)} className="text-xs text-blue-600 hover:underline">Send</button>
                      )}
                      {['sent','overdue'].includes(status) && Number(inv.balance_due) > 0 && (
                        <button onClick={() => setPayModal(inv)} className="text-xs text-green-700 hover:underline ml-1">Pay</button>
                      )}
                      <button onClick={() => setModal(inv)} className="text-xs text-gray-400 hover:text-gray-700 ml-1">Edit</button>
                      <button onClick={() => deleteInvoice(inv.id)} className="text-xs text-red-400 hover:text-red-600 ml-1">Del</button>
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

function InvoiceModal({ invoice, clients, jobs, accounts, onSave, onClose }) {
  const [form, setForm] = useState({
    client_name: invoice?.client_name || '',
    client_id:   invoice?.client_id   || '',
    job_id:      invoice?.job_id      || '',
    date:        invoice?.date        || today(),
    due_date:    invoice?.due_date    || addDays(today(), 30),
    tax_rate:    invoice?.tax_rate    || 0,
    notes:       invoice?.notes       || '',
    status:      invoice?.status      || 'draft',
    amount_paid: invoice?.amount_paid || 0,
  })
  const [lines, setLines] = useState([{ description: '', quantity: 1, unit_price: '', amount: 0, account_id: '' }])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (invoice?.id) {
      supabase.from('acct_invoice_lines').select('*').eq('invoice_id', invoice.id).order('sort_order')
        .then(({ data }) => { if (data?.length) setLines(data) })
    }
  }, [invoice?.id])

  const subtotal   = lines.reduce((s, l) => s + Number(l.amount||0), 0)
  const tax_amount = subtotal * Number(form.tax_rate||0)
  const total      = subtotal + tax_amount

  async function handleSave() {
    setLoading(true)
    await onSave(form, lines)
    setLoading(false)
  }

  return (
    <Modal onClose={onClose} wide>
      <div className="px-6 pt-5 pb-4 border-b border-gray-100 flex-shrink-0 flex items-center justify-between">
        <h3 className="text-base font-bold text-gray-800">{invoice ? `Edit Invoice ${invoice.number}` : 'New Invoice'}</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
        </button>
      </div>
      <div className="overflow-y-auto flex-1 px-6 py-5 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Client Name</label>
            <input className="input text-sm w-full" value={form.client_name}
              onChange={e => setForm(p => ({ ...p, client_name: e.target.value }))} placeholder="Client name" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Job (optional)</label>
            <select className="input text-sm w-full" value={form.job_id} onChange={e => setForm(p => ({ ...p, job_id: e.target.value }))}>
              <option value="">— None —</option>
              {jobs.map(j => <option key={j.id} value={j.id}>{j.name || j.client_name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Invoice Date</label>
            <input type="date" className="input text-sm w-full" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Due Date</label>
            <input type="date" className="input text-sm w-full" value={form.due_date} onChange={e => setForm(p => ({ ...p, due_date: e.target.value }))} />
          </div>
        </div>

        <div className="border-t border-gray-100 pt-4">
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Line Items</h4>
          <LineEditor lines={lines} onChange={setLines} accounts={accounts} />
        </div>

        <div className="flex justify-end">
          <div className="w-56 space-y-1 text-sm">
            <div className="flex justify-between text-gray-500"><span>Subtotal</span><span>{fmt(subtotal)}</span></div>
            <div className="flex justify-between items-center text-gray-500">
              <span>Tax</span>
              <div className="flex items-center gap-1">
                <input type="number" min="0" max="1" step="0.001" className="input text-xs py-0.5 w-16 text-right"
                  value={form.tax_rate} onChange={e => setForm(p => ({ ...p, tax_rate: e.target.value }))} />
                <span className="text-xs">%</span>
                <span className="text-xs">{fmt(tax_amount)}</span>
              </div>
            </div>
            <div className="flex justify-between font-bold text-gray-800 border-t border-gray-100 pt-1"><span>Total</span><span>{fmt(total)}</span></div>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
          <textarea className="input text-sm w-full resize-none" rows={2} value={form.notes}
            onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="Optional notes…" />
        </div>
      </div>
      <div className="px-6 pb-5 pt-3 border-t border-gray-100 flex justify-end gap-2 flex-shrink-0">
        <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">Cancel</button>
        <button onClick={handleSave} disabled={loading} className="btn-primary text-sm px-5 py-2 disabled:opacity-50">
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
            <input type="date" className="input text-sm w-full" value={form.date} onChange={e => setForm(p=>({...p,date:e.target.value}))} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Amount</label>
            <input type="number" min="0" step="0.01" className="input text-sm w-full" value={form.amount} onChange={e => setForm(p=>({...p,amount:e.target.value}))} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Method</label>
            <select className="input text-sm w-full" value={form.method} onChange={e => setForm(p=>({...p,method:e.target.value}))}>
              {PAYMENT_METHODS.map(m => <option key={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Reference #</label>
            <input className="input text-sm w-full" value={form.ref} onChange={e => setForm(p=>({...p,ref:e.target.value}))} placeholder="Check #, etc." />
          </div>
        </div>
      </div>
      <div className="px-6 pb-5 flex justify-end gap-2 flex-shrink-0">
        <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">Cancel</button>
        <button onClick={() => onSave(form)} className="btn-primary text-sm px-5 py-2">Record Payment</button>
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
  const [modal,  setModal]  = useState(null)
  const [payModal, setPayModal] = useState(null)

  const filtered = bills.filter(b => {
    const status = isOverdue(b.due_date, b.status) ? 'overdue' : b.status
    return filter === 'all' || status === filter
  })

  async function saveBill(data, lines) {
    const subtotal = lines.reduce((s, l) => s + Number(l.amount||0), 0)
    const total = subtotal + Number(data.tax_amount||0)
    const payload = { ...data, subtotal, total, balance_due: total - Number(data.amount_paid||0), job_id: data.job_id || null }
    if (modal?.id) {
      await supabase.from('acct_bills').update(payload).eq('id', modal.id)
      await supabase.from('acct_bill_lines').delete().eq('bill_id', modal.id)
      const rows = lines.map((l,i) => ({ ...l, bill_id: modal.id, sort_order: i }))
      if (rows.length) await supabase.from('acct_bill_lines').insert(rows)
    } else {
      const { data: bill } = await supabase.from('acct_bills').insert(payload).select().single()
      if (bill) {
        const rows = lines.map((l,i) => ({ ...l, bill_id: bill.id, sort_order: i }))
        if (rows.length) await supabase.from('acct_bill_lines').insert(rows)
      }
    }
    setModal(null); onRefresh()
  }

  async function recordPayment(bill, pd) {
    const newPaid = Number(bill.amount_paid||0) + Number(pd.amount)
    const newBal  = Number(bill.total) - newPaid
    const status  = newBal <= 0.005 ? 'paid' : 'open'
    await supabase.from('acct_bills').update({ amount_paid: newPaid, balance_due: Math.max(0, newBal), status }).eq('id', bill.id)
    await supabase.from('acct_payments').insert({ type: 'vendor', date: pd.date, amount: pd.amount, payment_method: pd.method, reference: pd.ref, bill_id: bill.id })
    setPayModal(null); onRefresh()
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
          {['all','open','overdue','paid'].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg capitalize transition-colors ${filter === f ? 'bg-green-700 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{f}</button>
          ))}
        </div>
        <button onClick={() => setModal('new')} className="btn-primary text-sm px-4 py-2">+ New Bill</button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              {['Vendor','Bill #','Date','Due Date','Total','Balance Due','Status',''].map(h => (
                <th key={h} className="text-left text-xs font-semibold text-gray-400 px-4 py-2.5">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.length === 0 && <tr><td colSpan={8} className="text-center text-gray-400 text-sm py-10">No bills found.</td></tr>}
            {filtered.map(bill => {
              const status = isOverdue(bill.due_date, bill.status) ? 'overdue' : bill.status
              return (
                <tr key={bill.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2.5 font-medium text-gray-800">{bill.vendor_name || '—'}</td>
                  <td className="px-4 py-2.5 font-mono text-xs text-gray-500">{bill.number || '—'}</td>
                  <td className="px-4 py-2.5 text-xs text-gray-500">{fmtDate(bill.date)}</td>
                  <td className="px-4 py-2.5 text-xs text-gray-500">{fmtDate(bill.due_date)}</td>
                  <td className="px-4 py-2.5 font-semibold text-gray-800">{fmt(bill.total)}</td>
                  <td className="px-4 py-2.5 font-semibold text-gray-800">{fmt(bill.balance_due)}</td>
                  <td className="px-4 py-2.5">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold capitalize ${STATUS_COLORS[status] || STATUS_COLORS.open}`}>{status}</span>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex gap-1">
                      {['open','overdue'].includes(status) && Number(bill.balance_due) > 0 && (
                        <button onClick={() => setPayModal(bill)} className="text-xs text-green-700 hover:underline">Pay</button>
                      )}
                      <button onClick={() => setModal(bill)} className="text-xs text-gray-400 hover:text-gray-700 ml-1">Edit</button>
                      <button onClick={() => deleteBill(bill.id)} className="text-xs text-red-400 hover:text-red-600 ml-1">Del</button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {modal && (
        <BillModal bill={modal === 'new' ? null : modal} vendors={vendors} accounts={accounts} jobs={jobs}
          onSave={saveBill} onClose={() => setModal(null)} />
      )}
      {payModal && (
        <PaymentModal title={`Pay Bill — ${payModal.vendor_name}`} maxAmount={payModal.balance_due}
          onSave={pd => recordPayment(payModal, pd)} onClose={() => setPayModal(null)} />
      )}
    </div>
  )
}

function BillModal({ bill, vendors, accounts, jobs, onSave, onClose }) {
  const [form, setForm] = useState({
    vendor_name: bill?.vendor_name || '',
    vendor_id:   bill?.vendor_id   || '',
    job_id:      bill?.job_id      || '',
    number:      bill?.number      || '',
    date:        bill?.date        || today(),
    due_date:    bill?.due_date    || addDays(today(), 30),
    tax_amount:  bill?.tax_amount  || 0,
    notes:       bill?.notes       || '',
    status:      bill?.status      || 'open',
    amount_paid: bill?.amount_paid || 0,
  })
  const [lines, setLines] = useState([{ description: '', quantity: 1, unit_price: '', amount: 0, account_id: '' }])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (bill?.id) {
      supabase.from('acct_bill_lines').select('*').eq('bill_id', bill.id).order('sort_order')
        .then(({ data }) => { if (data?.length) setLines(data) })
    }
  }, [bill?.id])

  const subtotal = lines.reduce((s,l) => s + Number(l.amount||0), 0)
  const total = subtotal + Number(form.tax_amount||0)

  return (
    <Modal onClose={onClose} wide>
      <div className="px-6 pt-5 pb-4 border-b border-gray-100 flex-shrink-0 flex items-center justify-between">
        <h3 className="text-base font-bold text-gray-800">{bill ? 'Edit Bill' : 'New Bill'}</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
        </button>
      </div>
      <div className="overflow-y-auto flex-1 px-6 py-5 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Vendor</label>
            <input className="input text-sm w-full" value={form.vendor_name}
              onChange={e => setForm(p => ({ ...p, vendor_name: e.target.value }))} placeholder="Vendor name" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Bill #</label>
            <input className="input text-sm w-full" value={form.number}
              onChange={e => setForm(p => ({ ...p, number: e.target.value }))} placeholder="Vendor invoice #" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Bill Date</label>
            <input type="date" className="input text-sm w-full" value={form.date} onChange={e => setForm(p=>({...p,date:e.target.value}))} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Due Date</label>
            <input type="date" className="input text-sm w-full" value={form.due_date} onChange={e => setForm(p=>({...p,due_date:e.target.value}))} />
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-medium text-gray-600 mb-1">Job (optional)</label>
            <select className="input text-sm w-full" value={form.job_id} onChange={e => setForm(p=>({...p,job_id:e.target.value}))}>
              <option value="">— No job assigned —</option>
              {(jobs || []).map(j => (
                <option key={j.id} value={j.id}>{j.name || j.client_name}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="border-t border-gray-100 pt-4">
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Line Items</h4>
          <LineEditor lines={lines} onChange={setLines} accounts={accounts} />
        </div>
        <div className="flex justify-end">
          <div className="w-48 space-y-1 text-sm">
            <div className="flex justify-between text-gray-500"><span>Subtotal</span><span>{fmt(subtotal)}</span></div>
            <div className="flex justify-between items-center text-gray-500">
              <span>Tax</span>
              <input type="number" min="0" step="0.01" className="input text-xs py-0.5 w-24 text-right"
                value={form.tax_amount} onChange={e => setForm(p=>({...p,tax_amount:e.target.value}))} />
            </div>
            <div className="flex justify-between font-bold text-gray-800 border-t border-gray-100 pt-1"><span>Total</span><span>{fmt(total)}</span></div>
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
          <textarea className="input text-sm w-full resize-none" rows={2} value={form.notes}
            onChange={e => setForm(p=>({...p,notes:e.target.value}))} placeholder="Optional notes…" />
        </div>
      </div>
      <div className="px-6 pb-5 pt-3 border-t border-gray-100 flex justify-end gap-2 flex-shrink-0">
        <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">Cancel</button>
        <button onClick={async () => { setLoading(true); await onSave(form, lines); setLoading(false) }}
          disabled={loading} className="btn-primary text-sm px-5 py-2 disabled:opacity-50">
          {loading ? 'Saving…' : 'Save Bill'}
        </button>
      </div>
    </Modal>
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
  const [txModal, setTxModal]   = useState(false)
  const [loading, setLoading]   = useState(false)

  useEffect(() => {
    if (selectedAcct) fetchTxns(selectedAcct)
  }, [selectedAcct])

  async function fetchTxns(acctId) {
    setLoading(true)
    const { data } = await supabase.from('acct_bank_transactions').select('*')
      .eq('bank_account_id', acctId).order('date', { ascending: false })
    if (data) setTransactions(data)
    setLoading(false)
  }

  async function saveAccount(data) {
    if (acctModal?.id) {
      await supabase.from('acct_bank_accounts').update(data).eq('id', acctModal.id)
    } else {
      await supabase.from('acct_bank_accounts').insert(data)
    }
    setAcctModal(null); onRefresh()
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
      await supabase.from('acct_bank_accounts').update({ current_balance: Number(acct.current_balance) + delta }).eq('id', selectedAcct)
    }
    setTxModal(false); onRefresh(); fetchTxns(selectedAcct)
  }

  async function toggleReconcile(txn) {
    await supabase.from('acct_bank_transactions').update({ is_reconciled: !txn.is_reconciled }).eq('id', txn.id)
    fetchTxns(selectedAcct)
  }

  async function deleteTxn(id) {
    const ok = await confirm('Delete this transaction?')
    if (!ok) return
    await supabase.from('acct_bank_transactions').delete().eq('id', id)
    fetchTxns(selectedAcct)
  }

  const expenseAccts = accounts.filter(a => ['expense','cogs'].includes(a.type))

  return (
    <div>
      {dialog}
      <div className="flex items-start gap-6">
        {/* Account list */}
        <div className="w-64 flex-shrink-0">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-gray-700">Accounts</h3>
            <button onClick={() => setAcctModal('new')} className="text-xs text-green-700 hover:underline font-medium">+ Add</button>
          </div>
          <div className="space-y-2">
            {bankAccounts.length === 0 && <p className="text-xs text-gray-400 italic text-center py-4">No bank accounts yet.</p>}
            {bankAccounts.map(acct => (
              <div key={acct.id}
                onClick={() => setSelectedAcct(acct.id)}
                className={`p-3 rounded-xl border cursor-pointer transition-colors ${selectedAcct === acct.id ? 'border-green-300 bg-green-50' : 'border-gray-200 bg-white hover:bg-gray-50'}`}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{acct.name}</p>
                    <p className="text-xs text-gray-400 capitalize mt-0.5">{acct.type.replace('_',' ')}{acct.institution ? ` · ${acct.institution}` : ''}</p>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={e => { e.stopPropagation(); setAcctModal(acct) }} className="text-gray-300 hover:text-gray-600 p-0.5">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 012.828 0l.172.172a2 2 0 010 2.828L12 16H9v-3z"/></svg>
                    </button>
                    <button onClick={e => { e.stopPropagation(); deleteAccount(acct.id) }} className="text-gray-300 hover:text-red-500 p-0.5">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
                    </button>
                  </div>
                </div>
                <p className={`text-base font-bold mt-1 ${Number(acct.current_balance) < 0 ? 'text-red-600' : 'text-gray-800'}`}>{fmt(acct.current_balance)}</p>
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
                <button onClick={() => setTxModal(true)} className="btn-primary text-sm px-3 py-1.5">+ Add Transaction</button>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50">
                      {['Date','Description','Type','Amount','Reconciled',''].map(h => (
                        <th key={h} className="text-left text-xs font-semibold text-gray-400 px-4 py-2.5">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {loading && <tr><td colSpan={6} className="text-center text-gray-400 py-8">Loading…</td></tr>}
                    {!loading && transactions.length === 0 && <tr><td colSpan={6} className="text-center text-gray-400 py-8">No transactions yet.</td></tr>}
                    {transactions.map(tx => (
                      <tr key={tx.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2.5 text-xs text-gray-500">{fmtDate(tx.date)}</td>
                        <td className="px-4 py-2.5 text-gray-800">{tx.description || '—'}</td>
                        <td className="px-4 py-2.5 text-xs capitalize text-gray-500">{tx.type}</td>
                        <td className={`px-4 py-2.5 font-semibold ${tx.type === 'deposit' ? 'text-green-700' : 'text-red-600'}`}>
                          {tx.type === 'deposit' ? '+' : '-'}{fmt(Math.abs(tx.amount))}
                        </td>
                        <td className="px-4 py-2.5">
                          <button onClick={() => toggleReconcile(tx)}
                            className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${tx.is_reconciled ? 'bg-green-600 border-green-600 text-white' : 'border-gray-300'}`}>
                            {tx.is_reconciled && <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7"/></svg>}
                          </button>
                        </td>
                        <td className="px-4 py-2.5">
                          <button onClick={() => deleteTxn(tx.id)} className="text-gray-300 hover:text-red-500 text-xs">Del</button>
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

      {acctModal && <BankAccountModal account={acctModal === 'new' ? null : acctModal} onSave={saveAccount} onClose={() => setAcctModal(null)} />}
      {txModal && <TransactionModal onSave={saveTxn} onClose={() => setTxModal(false)} accounts={expenseAccts} />}
    </div>
  )
}

function BankAccountModal({ account, onSave, onClose }) {
  const [form, setForm] = useState({
    name: account?.name || '', type: account?.type || 'checking',
    institution: account?.institution || '', account_number_last4: account?.account_number_last4 || '',
    current_balance: account?.current_balance || 0,
  })
  return (
    <Modal onClose={onClose}>
      <div className="px-6 pt-5 pb-4 border-b border-gray-100 flex-shrink-0">
        <h3 className="text-sm font-bold text-gray-800">{account ? 'Edit Account' : 'Add Bank Account'}</h3>
      </div>
      <div className="px-6 py-5 space-y-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Account Name</label>
          <input className="input text-sm w-full" value={form.name} onChange={e => setForm(p=>({...p,name:e.target.value}))} placeholder="e.g. Main Checking" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Type</label>
            <select className="input text-sm w-full" value={form.type} onChange={e => setForm(p=>({...p,type:e.target.value}))}>
              {['checking','savings','credit_card','loan','other'].map(t => <option key={t} value={t} className="capitalize">{t.replace('_',' ')}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Last 4 digits</label>
            <input className="input text-sm w-full" maxLength={4} value={form.account_number_last4}
              onChange={e => setForm(p=>({...p,account_number_last4:e.target.value}))} placeholder="1234" />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Bank / Institution</label>
          <input className="input text-sm w-full" value={form.institution} onChange={e => setForm(p=>({...p,institution:e.target.value}))} placeholder="Bank name" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Current Balance</label>
          <input type="number" step="0.01" className="input text-sm w-full" value={form.current_balance}
            onChange={e => setForm(p=>({...p,current_balance:e.target.value}))} />
        </div>
      </div>
      <div className="px-6 pb-5 flex justify-end gap-2 flex-shrink-0">
        <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">Cancel</button>
        <button onClick={() => onSave(form)} className="btn-primary text-sm px-5 py-2">Save</button>
      </div>
    </Modal>
  )
}

function TransactionModal({ onSave, onClose, accounts }) {
  const [form, setForm] = useState({ date: today(), description: '', amount: '', type: 'withdrawal', category_id: '' })
  return (
    <Modal onClose={onClose}>
      <div className="px-6 pt-5 pb-4 border-b border-gray-100 flex-shrink-0">
        <h3 className="text-sm font-bold text-gray-800">Add Transaction</h3>
      </div>
      <div className="px-6 py-5 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Date</label>
            <input type="date" className="input text-sm w-full" value={form.date} onChange={e => setForm(p=>({...p,date:e.target.value}))} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Type</label>
            <select className="input text-sm w-full" value={form.type} onChange={e => setForm(p=>({...p,type:e.target.value}))}>
              <option value="deposit">Deposit</option>
              <option value="withdrawal">Withdrawal</option>
              <option value="transfer">Transfer</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
          <input className="input text-sm w-full" value={form.description} onChange={e => setForm(p=>({...p,description:e.target.value}))} placeholder="Transaction description" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Amount</label>
          <input type="number" min="0" step="0.01" className="input text-sm w-full" value={form.amount} onChange={e => setForm(p=>({...p,amount:e.target.value}))} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Category (optional)</label>
          <select className="input text-sm w-full" value={form.category_id} onChange={e => setForm(p=>({...p,category_id:e.target.value}))}>
            <option value="">— Uncategorized —</option>
            {accounts.map(a => <option key={a.id} value={a.id}>{a.number} {a.name}</option>)}
          </select>
        </div>
      </div>
      <div className="px-6 pb-5 flex justify-end gap-2 flex-shrink-0">
        <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">Cancel</button>
        <button onClick={() => onSave(form)} disabled={!form.amount} className="btn-primary text-sm px-5 py-2 disabled:opacity-50">Save</button>
      </div>
    </Modal>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// CHART OF ACCOUNTS TAB
// ═════════════════════════════════════════════════════════════════════════════
function ChartOfAccountsTab({ accounts, onRefresh }) {
  const { confirm, dialog } = useConfirm()
  const [modal, setModal] = useState(null)

  const grouped = ACCOUNT_TYPES.reduce((obj, type) => {
    obj[type] = accounts.filter(a => a.type === type).sort((a,b) => a.sort_order - b.sort_order)
    return obj
  }, {})

  async function saveAccount(data) {
    if (modal?.id) {
      await supabase.from('acct_accounts').update(data).eq('id', modal.id)
    } else {
      await supabase.from('acct_accounts').insert(data)
    }
    setModal(null); onRefresh()
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
      <div className="flex justify-end mb-4">
        <button onClick={() => setModal('new')} className="btn-primary text-sm px-4 py-2">+ New Account</button>
      </div>

      <div className="space-y-4">
        {ACCOUNT_TYPES.map(type => {
          const tc = TYPE_COLORS[type]
          const typeAccts = grouped[type] || []
          return (
            <div key={type} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className={`px-4 py-2.5 flex items-center gap-2 border-b border-gray-100 ${tc.bg}`}>
                <span className={`text-xs font-bold uppercase tracking-wide ${tc.text}`}>{tc.label}</span>
                <span className={`text-[10px] font-semibold ${tc.text} opacity-60`}>{typeAccts.length} account{typeAccts.length !== 1 ? 's' : ''}</span>
              </div>
              {typeAccts.length === 0 ? (
                <p className="text-xs text-gray-400 px-4 py-4 italic">No {tc.label.toLowerCase()} accounts.</p>
              ) : (
                <table className="w-full text-sm">
                  <tbody className="divide-y divide-gray-50">
                    {typeAccts.map(acct => (
                      <tr key={acct.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2.5 font-mono text-xs text-gray-400 w-16">{acct.number}</td>
                        <td className="px-4 py-2.5 font-medium text-gray-800">{acct.name}</td>
                        <td className="px-4 py-2.5 text-xs text-gray-400">{acct.subtype || '—'}</td>
                        <td className="px-4 py-2.5 text-xs text-gray-400">{acct.description || ''}</td>
                        <td className="px-4 py-2.5 text-right">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${acct.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
                            {acct.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          <div className="flex justify-end gap-2">
                            <button onClick={() => setModal(acct)} className="text-xs text-gray-400 hover:text-gray-700">Edit</button>
                            <button onClick={() => deleteAccount(acct.id)} className="text-xs text-red-400 hover:text-red-600">Del</button>
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
        <AccountModal account={modal === 'new' ? null : modal} onSave={saveAccount} onClose={() => setModal(null)} />
      )}
    </div>
  )
}

function AccountModal({ account, onSave, onClose }) {
  const [form, setForm] = useState({
    number: account?.number || '', name: account?.name || '',
    type: account?.type || 'expense', subtype: account?.subtype || '',
    description: account?.description || '', is_active: account?.is_active ?? true,
  })
  return (
    <Modal onClose={onClose}>
      <div className="px-6 pt-5 pb-4 border-b border-gray-100 flex-shrink-0">
        <h3 className="text-sm font-bold text-gray-800">{account ? 'Edit Account' : 'New Account'}</h3>
      </div>
      <div className="px-6 py-5 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Account #</label>
            <input className="input text-sm w-full" value={form.number} onChange={e => setForm(p=>({...p,number:e.target.value}))} placeholder="e.g. 6010" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Type</label>
            <select className="input text-sm w-full" value={form.type} onChange={e => setForm(p=>({...p,type:e.target.value}))}>
              {ACCOUNT_TYPES.map(t => <option key={t} value={t}>{TYPE_COLORS[t].label}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Account Name</label>
          <input className="input text-sm w-full" value={form.name} onChange={e => setForm(p=>({...p,name:e.target.value}))} placeholder="Account name" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Subtype</label>
          <input className="input text-sm w-full" value={form.subtype} onChange={e => setForm(p=>({...p,subtype:e.target.value}))} placeholder="e.g. bank, receivable, payroll" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
          <input className="input text-sm w-full" value={form.description} onChange={e => setForm(p=>({...p,description:e.target.value}))} />
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
          <input type="checkbox" checked={form.is_active} onChange={e => setForm(p=>({...p,is_active:e.target.checked}))} />
          Active
        </label>
      </div>
      <div className="px-6 pb-5 flex justify-end gap-2 flex-shrink-0">
        <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">Cancel</button>
        <button onClick={() => onSave(form)} disabled={!form.name} className="btn-primary text-sm px-5 py-2 disabled:opacity-50">Save</button>
      </div>
    </Modal>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// REPORTS TAB
// ═════════════════════════════════════════════════════════════════════════════
function ReportsTab({ invoices, bills, accounts, bankAccounts }) {
  const now = new Date()
  const [report,    setReport]    = useState('pl')
  const [dateFrom,  setDateFrom]  = useState(`${now.getFullYear()}-01-01`)
  const [dateTo,    setDateTo]    = useState(today())

  // P&L: use invoice payments (revenue) and bills (expenses) within date range
  const paidInvoices = invoices.filter(i => i.status === 'paid' && i.date >= dateFrom && i.date <= dateTo)
  const paidBills    = bills.filter(b => b.status === 'paid' && b.date >= dateFrom && b.date <= dateTo)

  const totalRevenue = paidInvoices.reduce((s, i) => s + Number(i.total), 0)
  const totalCOGS    = 0 // would need journal entries for full COGS
  const totalExpenses = paidBills.reduce((s, b) => s + Number(b.total), 0)
  const grossProfit  = totalRevenue - totalCOGS
  const netIncome    = grossProfit - totalExpenses

  // Balance sheet
  const totalAssets = bankAccounts.filter(b => b.type !== 'credit_card').reduce((s, b) => s + Number(b.current_balance), 0)
  const totalAR     = invoices.filter(i => i.status !== 'paid' && i.status !== 'void').reduce((s, i) => s + Number(i.balance_due), 0)
  const totalLiab   = bankAccounts.filter(b => b.type === 'credit_card').reduce((s, b) => s + Math.abs(Number(b.current_balance)), 0)
  const totalAP     = bills.filter(b => b.status !== 'paid' && b.status !== 'void').reduce((s, b) => s + Number(b.balance_due), 0)

  // AR Aging
  const agingBuckets = { current: [], '1-30': [], '31-60': [], '61-90': [], '90+': [] }
  const today_ = new Date()
  invoices.filter(i => i.status !== 'paid' && i.status !== 'void' && Number(i.balance_due) > 0).forEach(inv => {
    if (!inv.due_date) { agingBuckets.current.push(inv); return }
    const days = Math.floor((today_ - new Date(inv.due_date + 'T00:00:00')) / 86400000)
    if (days <= 0) agingBuckets.current.push(inv)
    else if (days <= 30) agingBuckets['1-30'].push(inv)
    else if (days <= 60) agingBuckets['31-60'].push(inv)
    else if (days <= 90) agingBuckets['61-90'].push(inv)
    else agingBuckets['90+'].push(inv)
  })

  const Section = ({ label, amount, indent = false, bold = false, border = false }) => (
    <div className={`flex justify-between py-1.5 px-4 text-sm ${indent ? 'pl-8' : ''} ${bold ? 'font-bold' : ''} ${border ? 'border-t border-gray-200 mt-1' : ''}`}>
      <span className={bold ? 'text-gray-800' : 'text-gray-600'}>{label}</span>
      <span className={`${bold ? 'text-gray-800' : 'text-gray-700'} ${Number(amount) < 0 ? 'text-red-600' : ''}`}>{fmt(amount)}</span>
    </div>
  )

  return (
    <div>
      <div className="flex gap-1 mb-5 flex-wrap">
        {[
          { key: 'pl',    label: 'Profit & Loss'  },
          { key: 'bs',    label: 'Balance Sheet'  },
          { key: 'ar',    label: 'AR Aging'        },
          { key: 'ap',    label: 'AP Aging'        },
        ].map(r => (
          <button key={r.key} onClick={() => setReport(r.key)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${report === r.key ? 'bg-green-700 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            {r.label}
          </button>
        ))}

        {(report === 'pl') && (
          <div className="flex items-center gap-2 ml-4">
            <input type="date" className="input text-xs py-1.5" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
            <span className="text-xs text-gray-400">to</span>
            <input type="date" className="input text-xs py-1.5" value={dateTo} onChange={e => setDateTo(e.target.value)} />
          </div>
        )}
      </div>

      {report === 'pl' && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden max-w-lg">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
            <p className="text-sm font-bold text-gray-800">Profit & Loss</p>
            <p className="text-xs text-gray-400">{fmtDate(dateFrom)} — {fmtDate(dateTo)}</p>
          </div>
          <div className="py-2">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide px-4 py-1.5">Income</p>
            <Section label="Landscaping Revenue" amount={totalRevenue} indent />
            <Section label="Total Income" amount={totalRevenue} bold border />
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide px-4 py-1.5 mt-3">Cost of Goods Sold</p>
            <Section label="Total COGS" amount={totalCOGS} bold border />
            <Section label="Gross Profit" amount={grossProfit} bold border />
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide px-4 py-1.5 mt-3">Expenses</p>
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
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wide px-4 py-1.5">Current Assets</p>
              {bankAccounts.filter(b => b.type !== 'credit_card').map(b => (
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
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wide px-4 py-1.5">Liabilities</p>
              <Section label="Accounts Payable" amount={totalAP} indent />
              {bankAccounts.filter(b => b.type === 'credit_card').map(b => (
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
            <p className="text-sm font-bold text-gray-800">{report === 'ar' ? 'Accounts Receivable Aging' : 'Accounts Payable Aging'}</p>
          </div>
          {report === 'ar' && (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  {['Client','Invoice #','Due Date','Current','1-30 days','31-60 days','61-90 days','90+ days','Total'].map(h => (
                    <th key={h} className="text-left text-xs font-semibold text-gray-400 px-4 py-2.5">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {invoices.filter(i => i.status !== 'paid' && i.status !== 'void' && Number(i.balance_due) > 0).map(inv => {
                  const days = inv.due_date ? Math.floor((today_ - new Date(inv.due_date + 'T00:00:00')) / 86400000) : 0
                  const bal = Number(inv.balance_due)
                  return (
                    <tr key={inv.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2.5 font-medium text-gray-800">{inv.client_name || '—'}</td>
                      <td className="px-4 py-2.5 font-mono text-xs text-gray-400">{inv.number}</td>
                      <td className="px-4 py-2.5 text-xs text-gray-500">{fmtDate(inv.due_date)}</td>
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
                  {['Vendor','Bill #','Due Date','Balance'].map(h => (
                    <th key={h} className="text-left text-xs font-semibold text-gray-400 px-4 py-2.5">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {bills.filter(b => b.status !== 'paid' && b.status !== 'void' && Number(b.balance_due) > 0).map(bill => (
                  <tr key={bill.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5 font-medium text-gray-800">{bill.vendor_name || '—'}</td>
                    <td className="px-4 py-2.5 font-mono text-xs text-gray-400">{bill.number || '—'}</td>
                    <td className="px-4 py-2.5 text-xs text-gray-500">{fmtDate(bill.due_date)}</td>
                    <td className="px-4 py-2.5 font-semibold text-gray-800">{fmt(bill.balance_due)}</td>
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
  { key: 'dashboard', label: 'Dashboard'        },
  { key: 'invoices',  label: 'Invoices'          },
  { key: 'bills',     label: 'Bills & Expenses'  },
  { key: 'banking',   label: 'Banking'           },
  { key: 'accounts',  label: 'Chart of Accounts' },
  { key: 'reports',   label: 'Reports'           },
]

export default function Accounting() {
  const [tab,          setTab]         = useState('dashboard')
  const [invoices,     setInvoices]    = useState([])
  const [bills,        setBills]       = useState([])
  const [accounts,     setAccounts]    = useState([])
  const [bankAccounts, setBankAccounts]= useState([])
  const [clients,      setClients]     = useState([])
  const [jobs,         setJobs]        = useState([])
  const [vendors,      setVendors]     = useState([])
  const [loading,      setLoading]     = useState(true)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    const [invRes, billRes, acctRes, bankRes, clientRes, jobRes, vendorRes] = await Promise.all([
      supabase.from('acct_invoices').select('*').order('date', { ascending: false }),
      supabase.from('acct_bills').select('*').order('date', { ascending: false }),
      supabase.from('acct_accounts').select('*').eq('is_active', true).order('sort_order'),
      supabase.from('acct_bank_accounts').select('*').eq('is_active', true).order('name'),
      supabase.from('clients').select('id, name, client_name').order('name'),
      supabase.from('jobs').select('id, name, client_name').order('created_at', { ascending: false }),
      supabase.from('subs_vendors').select('id, company_name').eq('type', 'sub').order('company_name'),
    ])
    if (invRes.data)    setInvoices(invRes.data)
    if (billRes.data)   setBills(billRes.data)
    if (acctRes.data)   setAccounts(acctRes.data)
    if (bankRes.data)   setBankAccounts(bankRes.data)
    if (clientRes.data) setClients(clientRes.data)
    if (jobRes.data)    setJobs(jobRes.data)
    if (vendorRes.data) setVendors(vendorRes.data)
    setLoading(false)
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-700" />
    </div>
  )

  return (
    <div className="flex flex-col h-full">
      {/* Tab bar */}
      <div className="flex border-b border-gray-200 mb-6 overflow-x-auto flex-shrink-0">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors flex-shrink-0 ${
              tab === t.key
                ? 'border-green-700 text-green-700 bg-green-50'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto">
        {tab === 'dashboard' && (
          <DashboardTab invoices={invoices} bills={bills} bankAccounts={bankAccounts} accounts={accounts} onNavigate={setTab} />
        )}
        {tab === 'invoices' && (
          <InvoicesTab invoices={invoices} clients={clients} jobs={jobs} accounts={accounts} onRefresh={fetchAll} />
        )}
        {tab === 'bills' && (
          <BillsTab bills={bills} vendors={vendors} accounts={accounts} jobs={jobs} onRefresh={fetchAll} />
        )}
        {tab === 'banking' && (
          <BankingTab bankAccounts={bankAccounts} accounts={accounts} onRefresh={fetchAll} />
        )}
        {tab === 'accounts' && (
          <ChartOfAccountsTab accounts={accounts} onRefresh={fetchAll} />
        )}
        {tab === 'reports' && (
          <ReportsTab invoices={invoices} bills={bills} accounts={accounts} bankAccounts={bankAccounts} />
        )}
      </div>
    </div>
  )
}
