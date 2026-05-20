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

// ── Schedule ─────────────────────────────────────────────────────────────────
function ScheduleView() {
  const [rows, setRows] = useState(null)
  useEffect(() => {
    supabase.rpc('portal_schedule').then(({ data }) => setRows(data || []))
  }, [])
  if (rows === null) return <Loading />
  if (rows.length === 0) return <Empty label="No schedule items yet." />
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
          <tr>
            <th className="px-4 py-2.5">Item</th>
            <th className="px-4 py-2.5">Start</th>
            <th className="px-4 py-2.5">End</th>
            <th className="px-4 py-2.5">Crew</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map(s => (
            <tr key={s.id}>
              <td className="px-4 py-2.5 text-gray-800">{pick(s, 'title', 'name') || '—'}</td>
              <td className="px-4 py-2.5 text-gray-600">{dateStr(pick(s, 'start_date'))}</td>
              <td className="px-4 py-2.5 text-gray-600">{dateStr(pick(s, 'end_date'))}</td>
              <td className="px-4 py-2.5 text-gray-600">{pick(s, 'crew_type', 'crew_id') || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── Daily Logs ───────────────────────────────────────────────────────────────
function DailyLogsView() {
  const [rows, setRows] = useState(null)
  useEffect(() => {
    supabase.rpc('portal_daily_logs').then(({ data }) => setRows(data || []))
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
    supabase.rpc('portal_change_orders').then(({ data }) => setRows(data || []))
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
    supabase.rpc('portal_invoices').then(({ data }) => setRows(data || []))
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
                  <td className="px-4 py-2.5 text-gray-600">{dateStr(pick(inv, 'created_at'))}</td>
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
function PaymentModal({ invoice, job, client, onClose }) {
  const [method, setMethod] = useState(null) // 'card' | 'ach'
  const clientName =
    pick(client, 'name') ||
    [pick(client, 'first_name'), pick(client, 'last_name')].filter(Boolean).join(' ') ||
    pick(client, 'company_name') ||
    '—'
  const balance = money(
    pick(invoice, 'balance_due', 'balance', 'amount_due', 'total', 'amount')
  )
  const info = [
    ['Project', pick(job, 'name', 'client_name')],
    ['Bid', pick(invoice, 'bid_name', 'project_name')],
    ['Invoice', pick(invoice, 'title', 'name', 'memo')],
    ['Invoice #', pick(invoice, 'invoice_number', 'number', 'id')],
    ['Client', clientName],
    ['Invoice Date', dateStr(pick(invoice, 'created_at'))],
    ['Due Date', dateStr(pick(invoice, 'due_date'))],
  ]
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onMouseDown={e => e.target === e.currentTarget && onClose()}
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

        <div className="space-y-4 px-5 py-4">
          {/* Invoice summary */}
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
            {info.map(([label, val]) => (
              <div key={label} className="flex justify-between py-0.5 text-xs">
                <span className="text-gray-400">{label}</span>
                <span className="font-medium text-gray-700">{val || '—'}</span>
              </div>
            ))}
            <div className="mt-2 flex justify-between border-t border-gray-200 pt-2">
              <span className="text-sm font-semibold text-gray-600">Balance Due</span>
              <span className="text-sm font-bold text-gray-900">{balance}</span>
            </div>
          </div>

          {/* Method choice */}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
              Payment Method
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setMethod('card')}
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

          {method && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-3 text-xs text-amber-700">
              Secure {method === 'card' ? 'credit card' : 'bank transfer'} payment through Helcim is
              being connected. Once live, this opens Helcim&apos;s secure checkout so your payment
              details are entered directly with the processor.
            </div>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <button
              onClick={onClose}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
            >
              Close
            </button>
            <button
              disabled={!method}
              className="rounded-lg bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-800 disabled:opacity-50"
            >
              Continue to Payment
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Shell ────────────────────────────────────────────────────────────────────
const ALL_TABS = [
  { key: 'info', label: 'Client Information', perm: null },
  { key: 'schedule', label: 'Schedule', perm: 'perm_schedule' },
  { key: 'logs', label: 'Daily Logs', perm: 'perm_daily_logs' },
  { key: 'cos', label: 'Change Orders', perm: 'perm_change_orders' },
  { key: 'invoices', label: 'Invoices', perm: 'perm_invoices' },
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
      const { data: p } = await supabase
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
        supabase.rpc('portal_client_info'),
        supabase.rpc('portal_jobs'),
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
      </main>
    </div>
  )
}
