// src/portal/PortalShell.jsx
//
// The authenticated client portal (/client-portal). Confirms the visitor is an
// active portal user, then renders a header + a permission-driven tab bar.
// Each tab pulls its data through a security-definer portal_* RPC that is
// scoped to this client and gated by the matching permission flag.
//
// The first tab is a Dashboard: client data on the left, with Project
// Financials, Daily Logs and Schedule stacked on the right (each section only
// shows when the matching permission is granted).
import { Fragment, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import PortalCODetailModal from './PortalCODetailModal'

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

// ── Project Financials (dashboard card) ──────────────────────────────────────
// Rolls the client's invoices + payments into three headline numbers.
function ProjectFinancialsCard() {
  const [data, setData] = useState(null)
  useEffect(() => {
    Promise.all([
      supabase.rpc('portal_invoices', rpcArgs()),
      supabase.rpc('portal_payments', rpcArgs()),
    ]).then(([inv, pay]) => {
      const invoices = inv.data || []
      const payments = pay.data || []
      const invoiced = invoices.reduce(
        (s, i) => s + (Number(pick(i, 'amount', 'total')) || 0),
        0
      )
      const paid = payments.reduce((s, p) => s + (Number(p.amount) || 0), 0)
      setData({ invoiced, paid, balance: invoiced - paid, count: invoices.length })
    })
  }, [])
  const tiles = [
    ['Total Invoiced', data ? money(data.invoiced) : '—', false],
    ['Total Paid', data ? money(data.paid) : '—', false],
    ['Balance Due', data ? money(data.balance) : '—', true],
  ]
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
        Project Financials
      </p>
      <div className="grid grid-cols-3 gap-3">
        {tiles.map(([label, val, accent]) => (
          <div key={label} className={`rounded-lg p-3 ${accent ? 'bg-green-50' : 'bg-gray-50'}`}>
            <p className="text-xs text-gray-400">{label}</p>
            <p
              className={`mt-1 text-lg font-bold ${accent ? 'text-green-700' : 'text-gray-900'}`}
            >
              {val}
            </p>
          </div>
        ))}
      </div>
      {data && (
        <p className="mt-3 text-xs text-gray-400">
          {data.count} invoice{data.count === 1 ? '' : 's'} on file.
        </p>
      )}
    </div>
  )
}

// ── Dashboard ────────────────────────────────────────────────────────────────
function DashboardView({ client, jobs, portal }) {
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
  const showFinancials = !!portal?.perm_invoices
  const showLogs = !!portal?.perm_daily_logs
  const showSchedule = !!portal?.perm_schedule

  return (
    <div className="grid gap-5 lg:grid-cols-[300px_1fr]">
      {/* Left — client data */}
      <aside className="space-y-5">
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
            Your Information
          </p>
          <div className="space-y-3">
            {rows.map(([label, val]) => (
              <div key={label}>
                <p className="text-xs text-gray-400">{label}</p>
                <p className="text-sm text-gray-800">{val || '—'}</p>
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
                  <span className="text-sm text-gray-800">
                    {pick(j, 'name', 'client_name') || 'Project'}
                  </span>
                  <span className="text-xs capitalize text-gray-400">
                    {pick(j, 'status') || ''}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </aside>

      {/* Right — financials, logs, schedule */}
      <div className="space-y-6">
        {showFinancials && <ProjectFinancialsCard />}

        {showLogs && (
          <section>
            <h2 className="mb-2 text-sm font-bold text-gray-800">Recent Daily Logs</h2>
            <DailyLogsView limit={3} />
          </section>
        )}

        {showSchedule && (
          <section>
            <h2 className="mb-2 text-sm font-bold text-gray-800">Schedule</h2>
            <ScheduleView />
          </section>
        )}

        {!showFinancials && !showLogs && !showSchedule && (
          <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-400">
            Welcome to your project portal.
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
// Daily-log photos live in the public `daily-log-photos` storage bucket. The
// portal_daily_log_photos RPC returns the photo rows for this client's logs,
// scoped exactly like portal_daily_logs; we group them by log_id below.
function dailyLogPhotoUrl(path) {
  return supabase.storage.from('daily-log-photos').getPublicUrl(path).data.publicUrl
}

function DailyLogsView({ limit }) {
  const [rows, setRows] = useState(null)
  const [photosByLog, setPhotosByLog] = useState({})
  useEffect(() => {
    supabase.rpc('portal_daily_logs', rpcArgs()).then(({ data }) => setRows(data || []))
    supabase.rpc('portal_daily_log_photos', rpcArgs()).then(({ data }) => {
      const by = {}
      for (const p of data || []) {
        const logId = pick(p, 'log_id')
        if (logId && pick(p, 'storage_path')) (by[logId] = by[logId] || []).push(p)
      }
      setPhotosByLog(by)
    })
  }, [])
  if (rows === null) return <Loading />
  if (rows.length === 0) return <Empty label="No daily logs yet." />
  const shown = limit ? rows.slice(0, limit) : rows
  return (
    <div className="space-y-3">
      {shown.map(d => {
        const photos = photosByLog[d.id] || []
        return (
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
            {photos.length > 0 && (
              <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
                {photos.map(p => {
                  const url = dailyLogPhotoUrl(pick(p, 'storage_path'))
                  return (
                    <a
                      key={p.id}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block aspect-square overflow-hidden rounded-lg border border-gray-200 bg-gray-50"
                    >
                      <img
                        src={url}
                        alt={pick(p, 'file_name') || 'Daily log photo'}
                        loading="lazy"
                        className="h-full w-full object-cover transition hover:opacity-90"
                      />
                    </a>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
      {limit && rows.length > limit && (
        <p className="text-center text-xs text-gray-400">
          Showing {limit} of {rows.length} — open the Daily Logs tab to see them all.
        </p>
      )}
    </div>
  )
}

// ── Change Orders ────────────────────────────────────────────────────────────
const CO_STATUS_LABEL = {
  pending: { label: 'Pending', cls: 'bg-gray-100 text-gray-600' },
  presented: { label: 'Awaiting your review', cls: 'bg-amber-100 text-amber-700' },
  sold: { label: 'Approved', cls: 'bg-green-100 text-green-700' },
  lost: { label: 'Declined', cls: 'bg-red-100 text-red-600' },
}
function coStatus(s) {
  return CO_STATUS_LABEL[String(s || 'pending').toLowerCase()] || CO_STATUS_LABEL.pending
}

function ChangeOrdersView() {
  const [rows, setRows] = useState(null)
  const [active, setActive] = useState(null)

  function load() {
    supabase.rpc('portal_change_orders', rpcArgs()).then(({ data }) => setRows(data || []))
  }
  useEffect(() => {
    load()
  }, [])

  if (rows === null) return <Loading />
  if (rows.length === 0) return <Empty label="No change orders yet." />
  return (
    <>
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
            {rows.map(b => {
              const st = coStatus(b.status)
              return (
                <tr
                  key={b.id}
                  onClick={() => setActive(b)}
                  className="cursor-pointer hover:bg-gray-50 transition-colors"
                >
                  <td className="px-4 py-2.5 text-gray-500">
                    {b.custom_co_id ? `#${b.custom_co_id}` : '—'}
                  </td>
                  <td className="px-4 py-2.5 font-medium text-green-700 hover:underline">
                    {pick(b, 'co_name') || '—'}
                  </td>
                  <td className="px-4 py-2.5 text-gray-800 font-semibold">
                    {money(pick(b, 'bid_amount'))}
                  </td>
                  <td className="px-4 py-2.5">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${st.cls}`}
                    >
                      {st.label}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-gray-500">
                    {dateStr(pick(b, 'date_submitted', 'created_at'))}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {active && (
        <PortalCODetailModal
          co={active}
          onClose={() => setActive(null)}
          onActioned={load}
        />
      )}
    </>
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

// ── Invoice comment modal ────────────────────────────────────────────────────
function InvoiceCommentModal({ invoice, onClose }) {
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  async function submit() {
    if (!text.trim()) {
      setError('Please enter a comment first.')
      return
    }
    setBusy(true)
    setError('')
    const { data, error: e } = await supabase.functions.invoke('invoice-comment', {
      body: { invoice_id: invoice.id, comment: text.trim() },
    })
    setBusy(false)
    if (e || data?.error) {
      setError(data?.error || e?.message || 'Could not send your comment — please try again.')
      return
    }
    setDone(true)
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 px-4"
      onMouseDown={e => e.target === e.currentTarget && !busy && onClose()}
    >
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-xl">
        <div className="flex items-center gap-2 bg-[#3A5038] px-5 py-4">
          <span className="text-xl">💬</span>
          <div>
            <p className="text-sm font-bold text-white">Invoice Comment</p>
            <p className="text-xs text-white/70">
              {pick(invoice, 'invoice_number', 'number', 'id') || ''}
            </p>
          </div>
        </div>
        {done ? (
          <div className="space-y-3 px-5 py-8 text-center">
            <p className="text-3xl">✅</p>
            <p className="text-base font-semibold text-gray-900">Comment sent</p>
            <p className="text-sm text-gray-600">
              Your contractor's team has been notified and will follow up with you.
            </p>
            <button
              onClick={onClose}
              className="mt-2 rounded-lg bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-800"
            >
              Done
            </button>
          </div>
        ) : (
          <div className="space-y-3 px-5 py-4">
            <p className="text-sm text-gray-600">
              Have a question or note about this invoice? Send it to your contractor's team —
              they'll get an email and it's saved to your project log.
            </p>
            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
                {error}
              </div>
            )}
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              rows={4}
              placeholder="Type your comment…"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-green-600 focus:outline-none"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={onClose}
                disabled={busy}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={submit}
                disabled={busy}
                className="rounded-lg bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-800 disabled:opacity-50"
              >
                {busy ? 'Sending…' : 'Send Comment'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function InvoicesView({ jobs, client, clientId }) {
  const [rows, setRows] = useState(null)
  const [payInv, setPayInv] = useState(null)
  const [commentInv, setCommentInv] = useState(null)
  const [atts, setAtts] = useState({}) // invoice_id -> [attachment]
  const [expanded, setExpanded] = useState(null) // open invoice id
  useEffect(() => {
    supabase.rpc('portal_invoices', rpcArgs()).then(({ data }) => setRows(data || []))
    supabase.rpc('portal_invoice_attachments', rpcArgs()).then(({ data }) => {
      const by = {}
      for (const a of data || []) (by[a.invoice_id] = by[a.invoice_id] || []).push(a)
      setAtts(by)
    })
  }, [])
  const jobsById = Object.fromEntries(jobs.map(j => [j.id, j]))
  if (rows === null) return <Loading />
  if (rows.length === 0) return <Empty label="No invoices yet." />

  async function openFile(a) {
    const { data } = await supabase.storage
      .from('job-files')
      .createSignedUrl(a.storage_path, 300)
    if (data?.signedUrl) window.open(data.signedUrl, '_blank', 'noopener')
  }

  return (
    <>
      <p className="mb-2 text-xs text-gray-400">
        Tap an invoice to see its description and download any attachments.
      </p>
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-4 py-2.5">Invoice #</th>
              <th className="px-4 py-2.5">Created</th>
              <th className="px-4 py-2.5">Title</th>
              <th className="px-4 py-2.5">Balance Due</th>
              <th className="px-4 py-2.5">Date Due</th>
              <th className="px-4 py-2.5">Status</th>
              <th className="px-4 py-2.5">Comments</th>
              <th className="px-4 py-2.5 text-right">&nbsp;</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map(inv => {
              const st = invoiceStatus(inv)
              const fileList = atts[inv.id] || []
              const desc = pick(inv, 'description')
              const hasDetail = !!desc || fileList.length > 0
              const isOpen = expanded === inv.id
              return (
                <Fragment key={inv.id}>
                  <tr
                    className={hasDetail ? 'cursor-pointer hover:bg-gray-50' : ''}
                    onClick={() => hasDetail && setExpanded(isOpen ? null : inv.id)}
                  >
                    <td className="px-4 py-2.5 font-medium text-gray-800">
                      {hasDetail && (
                        <span className="mr-1 text-gray-400">{isOpen ? '▾' : '▸'}</span>
                      )}
                      {pick(inv, 'invoice_number', 'number', 'id') || '—'}
                    </td>
                    <td className="px-4 py-2.5 text-gray-600">
                      {dateStr(pick(inv, 'invoice_date', 'created_at'))}
                    </td>
                    <td className="px-4 py-2.5 text-gray-800">
                      {pick(inv, 'title', 'name', 'memo') || '—'}
                      {fileList.length > 0 && (
                        <span className="ml-1 text-xs text-gray-400">
                          ({fileList.length} file{fileList.length === 1 ? '' : 's'})
                        </span>
                      )}
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
                    <td className="px-4 py-2.5">
                      <button
                        onClick={e => {
                          e.stopPropagation()
                          setCommentInv(inv)
                        }}
                        className="rounded-lg border border-gray-200 px-2.5 py-1 text-xs font-semibold text-gray-600 hover:bg-gray-50"
                      >
                        💬 Comment
                      </button>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      {st.payable && (
                        <button
                          onClick={e => {
                            e.stopPropagation()
                            setPayInv(inv)
                          }}
                          className="rounded-lg bg-green-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-800"
                        >
                          Pay
                        </button>
                      )}
                    </td>
                  </tr>
                  {isOpen && hasDetail && (
                    <tr className="bg-gray-50">
                      <td colSpan={8} className="px-4 py-3">
                        {desc && (
                          <div className="mb-3">
                            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
                              Description
                            </p>
                            <p className="whitespace-pre-wrap text-sm text-gray-700">{desc}</p>
                          </div>
                        )}
                        {fileList.length > 0 && (
                          <div>
                            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
                              Attachments
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {fileList.map(a => (
                                <button
                                  key={a.id}
                                  onClick={() => openFile(a)}
                                  className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-green-700 hover:bg-green-50"
                                >
                                  ⬇ {a.file_name}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </Fragment>
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
          clientId={clientId}
          onClose={() => setPayInv(null)}
        />
      )}
      {commentInv && (
        <InvoiceCommentModal invoice={commentInv} onClose={() => setCommentInv(null)} />
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

function PaymentModal({ invoice, job, client, clientId, onClose }) {
  const [saved, setSaved] = useState(null) // saved methods | null while loading
  const [choice, setChoice] = useState(null) // a saved method id, or 'new'
  const [newMethod, setNewMethod] = useState(null) // 'card' | 'ach'
  const [saveNew, setSaveNew] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (!clientId) {
      setSaved([])
      setChoice('new')
      return
    }
    supabase
      .from('client_payment_methods')
      .select('*')
      .eq('client_id', clientId)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        const list = data || []
        setSaved(list)
        setChoice(list.length ? list.find(m => m.is_default)?.id || list[0].id : 'new')
      })
  }, [clientId])

  const clientName =
    pick(client, 'name') ||
    [pick(client, 'first_name'), pick(client, 'last_name')].filter(Boolean).join(' ') ||
    pick(client, 'company_name') ||
    '—'
  const balance = money(pick(invoice, 'balance_due', 'balance', 'amount_due', 'total', 'amount'))
  const info = [
    ['Project', pick(job, 'name', 'client_name')],
    ['Invoice', pick(invoice, 'title', 'name', 'memo')],
    ['Invoice #', pick(invoice, 'invoice_number', 'number', 'id')],
    ['Client', clientName],
    ['Due Date', dateStr(pick(invoice, 'due_date'))],
  ]
  const methodLabel = m =>
    `${m.brand || (m.method_type === 'bank' ? 'Bank account' : 'Card')} •••• ${m.last4 || '----'}`

  // Pay with an already-saved (vaulted) method — charged server-side.
  async function payWithSaved() {
    setBusy(true)
    setError('')
    const { data, error: e } = await supabase.functions.invoke('helcim-charge-saved', {
      body: { invoice_id: invoice.id, payment_method_id: choice },
    })
    setBusy(false)
    if (e || data?.error || !data?.ok) {
      setError(data?.error || e?.message || 'The payment could not be completed.')
      return
    }
    setDone(true)
  }

  // Pay with a new card / bank account through Helcim's secure modal.
  async function startNewPayment() {
    setBusy(true)
    setError('')
    try {
      const { data, error: fe } = await supabase.functions.invoke('helcim-checkout', {
        body: { invoice_id: invoice.id, method: newMethod, save: saveNew },
      })
      if (fe || !data?.checkoutToken)
        throw new Error(data?.error || fe?.message || 'Could not start the payment.')
      const { checkoutToken, amount, customerCode } = data
      await loadHelcimPay()

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
          let d = null
          try {
            const parsed = JSON.parse(event.data.eventMessage)
            d = parsed?.data?.data || parsed?.data || parsed
          } catch {
            d = null
          }
          const txnId = d?.transactionId || d?.id || null
          const { data: rec, error: re } = await supabase.rpc('portal_record_payment', {
            p_invoice_id: invoice.id,
            p_amount: amount,
            p_transaction_id: txnId ? String(txnId) : null,
            p_method: newMethod === 'ach' ? 'Bank Transfer' : 'Credit Card',
          })
          // Vault the method in our DB if the client opted in. The token comes
          // back in the HelcimPay success payload — it is a non-sensitive
          // reference, never the raw card / account number.
          if (saveNew && clientId && d) {
            const token = d.cardToken || d.bankAccountToken || d.achToken || null
            if (token) {
              const digits = String(d.cardNumber || d.bankAccountNumber || '').replace(/\D/g, '')
              await supabase.from('client_payment_methods').insert({
                client_id: clientId,
                helcim_customer_code: customerCode || null,
                helcim_card_token: token,
                method_type: newMethod === 'ach' ? 'bank' : 'card',
                brand: d.cardType || d.bankName || null,
                last4: digits ? digits.slice(-4) : null,
                exp: d.cardExpiry || d.expiryDate || null,
              })
            }
          }
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
      window.appendHelcimPayIframe(checkoutToken)
    } catch (e) {
      setBusy(false)
      setError(String(e?.message || e))
    }
  }

  const usingSaved = choice && choice !== 'new'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onMouseDown={e => e.target === e.currentTarget && !busy && onClose()}
    >
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-xl">
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

            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
                {error}
              </div>
            )}

            {saved === null ? (
              <p className="py-4 text-center text-sm text-gray-400">Loading payment methods…</p>
            ) : (
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Payment Method
                </p>
                {saved.map(m => (
                  <button
                    key={m.id}
                    onClick={() => setChoice(m.id)}
                    className={`flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors ${
                      choice === m.id
                        ? 'border-green-600 bg-green-50'
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <span className="text-lg">{m.method_type === 'bank' ? '🏦' : '💳'}</span>
                    <span className="flex-1 font-medium text-gray-800">{methodLabel(m)}</span>
                    {m.is_default && <span className="text-xs text-gray-400">Default</span>}
                  </button>
                ))}
                <button
                  onClick={() => setChoice('new')}
                  className={`flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors ${
                    choice === 'new'
                      ? 'border-green-600 bg-green-50'
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <span className="text-lg font-bold text-gray-400">+</span>
                  <span className="flex-1 font-medium text-gray-800">
                    {saved.length ? 'Use a new card or bank account' : 'Enter a card or bank account'}
                  </span>
                </button>
              </div>
            )}

            {choice === 'new' && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setNewMethod('card')}
                    disabled={busy}
                    className={`rounded-lg border px-3 py-2.5 text-sm font-semibold transition-colors ${
                      newMethod === 'card'
                        ? 'border-green-600 bg-green-50 text-green-700'
                        : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    Credit Card
                  </button>
                  <button
                    onClick={() => setNewMethod('ach')}
                    disabled={busy}
                    className={`rounded-lg border px-3 py-2.5 text-sm font-semibold transition-colors ${
                      newMethod === 'ach'
                        ? 'border-green-600 bg-green-50 text-green-700'
                        : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    Bank Transfer (ACH)
                  </button>
                </div>
                <label className="flex items-center gap-2 text-sm text-gray-600">
                  <input
                    type="checkbox"
                    checked={saveNew}
                    onChange={e => setSaveNew(e.target.checked)}
                    className="accent-green-700"
                  />
                  Save this {newMethod === 'ach' ? 'bank account' : 'card'} for next time
                </label>
                <p className="text-xs text-gray-400">
                  Payment details are entered in Helcim's secure window — they never touch this
                  site.
                </p>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <button
                onClick={onClose}
                disabled={busy}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              {usingSaved ? (
                <button
                  onClick={payWithSaved}
                  disabled={busy}
                  className="rounded-lg bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-800 disabled:opacity-50"
                >
                  {busy ? 'Processing…' : `Pay ${balance}`}
                </button>
              ) : (
                <button
                  onClick={startNewPayment}
                  disabled={!newMethod || busy}
                  className="rounded-lg bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-800 disabled:opacity-50"
                >
                  {busy ? 'Opening secure checkout…' : 'Continue to Payment'}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Payment Methods (saved cards / bank accounts) ────────────────────────────
function PaymentMethodsView({ clientId }) {
  const [rows, setRows] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!clientId) {
      setRows([])
      return
    }
    let cancelled = false
    supabase
      .from('client_payment_methods')
      .select('*')
      .eq('client_id', clientId)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false })
      .then(({ data, error: e }) => {
        if (cancelled) return
        if (e) setError(e.message)
        setRows(data || [])
      })
    return () => {
      cancelled = true
    }
  }, [clientId])

  async function remove(m) {
    if (!window.confirm('Remove this saved payment method?')) return
    const { error: e } = await supabase.from('client_payment_methods').delete().eq('id', m.id)
    if (e) {
      setError(e.message)
      return
    }
    setRows(prev => (prev || []).filter(x => x.id !== m.id))
  }

  async function makeDefault(m) {
    await supabase
      .from('client_payment_methods')
      .update({ is_default: false })
      .eq('client_id', clientId)
    await supabase.from('client_payment_methods').update({ is_default: true }).eq('id', m.id)
    setRows(prev => (prev || []).map(x => ({ ...x, is_default: x.id === m.id })))
  }

  if (rows === null) return <Loading />

  return (
    <div className="space-y-3">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
          {error}
        </div>
      )}
      <p className="text-sm text-gray-500">
        Cards and bank accounts you've saved. Pick one at checkout to pay without re-entering
        your details.
      </p>
      {rows.length === 0 ? (
        <Empty label="No saved payment methods yet — tick “Save this for next time” when you pay an invoice." />
      ) : (
        <div className="space-y-2">
          {rows.map(m => (
            <div
              key={m.id}
              className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-4"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{m.method_type === 'bank' ? '🏦' : '💳'}</span>
                <div>
                  <p className="text-sm font-semibold text-gray-800">
                    {m.brand || (m.method_type === 'bank' ? 'Bank account' : 'Card')} ••••{' '}
                    {m.last4 || '----'}
                    {m.is_default && (
                      <span className="ml-2 rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">
                        Default
                      </span>
                    )}
                  </p>
                  {m.exp && <p className="text-xs text-gray-400">Expires {m.exp}</p>}
                </div>
              </div>
              <div className="flex gap-2">
                {!m.is_default && (
                  <button
                    onClick={() => makeDefault(m)}
                    className="rounded-lg border border-gray-200 px-2.5 py-1 text-xs font-semibold text-gray-600 hover:bg-gray-50"
                  >
                    Set default
                  </button>
                )}
                <button
                  onClick={() => remove(m)}
                  className="rounded-lg border border-red-200 px-2.5 py-1 text-xs font-semibold text-red-600 hover:bg-red-50"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
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
              <td className="px-4 py-2.5 text-gray-600">{pick(p, 'method') || '—'}</td>
              <td className="px-4 py-2.5 text-gray-600">{pick(p, 'status') || '—'}</td>
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
  { key: 'info', label: 'Dashboard', perm: null },
  { key: 'schedule', label: 'Schedule', perm: 'perm_schedule' },
  { key: 'logs', label: 'Daily Logs', perm: 'perm_daily_logs' },
  { key: 'cos', label: 'Change Orders', perm: 'perm_change_orders' },
  { key: 'invoices', label: 'Invoices', perm: 'perm_invoices' },
  { key: 'payments', label: 'Payments', perm: 'perm_invoices' },
  { key: 'methods', label: 'Payment Methods', perm: 'perm_invoices' },
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
        <div className="mx-auto flex w-[90%] items-center justify-between px-5 py-3">
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
      </header>

      {/* Tab bar — large full-width rectangle buttons across the top */}
      <nav className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex w-[90%] flex-wrap gap-2 px-5 py-3">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`min-w-[120px] flex-1 rounded-xl border px-3 py-3 text-sm font-semibold transition-colors ${
                activeTab === t.key
                  ? 'border-green-700 bg-green-700 text-white shadow-sm'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </nav>

      {/* Content */}
      <main className="mx-auto w-[90%] px-5 py-6">
        {activeTab === 'info' && (
          <DashboardView client={client} jobs={jobs} portal={portal} />
        )}
        {activeTab === 'schedule' && <ScheduleView />}
        {activeTab === 'logs' && <DailyLogsView />}
        {activeTab === 'cos' && <ChangeOrdersView />}
        {activeTab === 'invoices' && (
          <InvoicesView jobs={jobs} client={client} clientId={portal?.client_id} />
        )}
        {activeTab === 'payments' && <PaymentsView />}
        {activeTab === 'methods' && <PaymentMethodsView clientId={portal?.client_id} />}
      </main>
    </div>
  )
}
