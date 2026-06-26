// ─────────────────────────────────────────────────────────────────────────────
// Help.jsx — user-facing Support module.
//
// Three tabs:
//   1. Support Tickets — lives on the `feature_requests` table. Anyone can
//      file a new ticket from here ("+ New Ticket"); admins can also move
//      tickets through the workflow: New → Pending → Completed.
//      Filter chips: All / New / Pending / Completed.
//      Status mapping (DB ↔ UI):
//        new                        → "New"
//        triaged, in_progress       → "Pending"
//        done, declined             → "Completed"
//      When status flips to in_progress or done the reporter is emailed
//      automatically (see sendFeedbackStatusEmail in lib/notify.js).
//   2. Docs   — placeholder, "Coming soon".
//   3. Videos — placeholder, "Coming soon".
// ─────────────────────────────────────────────────────────────────────────────
import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { sendFeedbackStatusEmail } from '../lib/notify'

const FG = '#3A5038'

// ── Status bucketing ─────────────────────────────────────────────────────────
// The DB has 5 statuses (new, triaged, in_progress, done, declined) but the
// product surface only exposes 3 (New / Pending / Completed). These helpers
// keep that mapping in one place.
const BUCKETS = {
  new: ['new'],
  pending: ['triaged', 'in_progress'],
  completed: ['done', 'declined'],
}
function bucketOf(status) {
  for (const [b, list] of Object.entries(BUCKETS)) {
    if (list.includes(status)) return b
  }
  return 'new'
}
// DB value to set when the user clicks a "Move to X" button.
const BUCKET_TO_DB = {
  new: 'new',
  pending: 'in_progress',
  completed: 'done',
}
const BUCKET_LABEL = { new: 'New', pending: 'Pending', completed: 'Completed' }
const BUCKET_BADGE_STYLE = {
  new: 'bg-yellow-50 text-yellow-800 border-yellow-200',
  pending: 'bg-purple-50 text-purple-800 border-purple-200',
  completed: 'bg-green-50  text-green-800  border-green-200',
}

const CATEGORY_STYLE = {
  feature: 'bg-blue-50   text-blue-800   border-blue-200',
  bug: 'bg-red-50    text-red-800    border-red-200',
  enhancement: 'bg-purple-50 text-purple-800 border-purple-200',
  other: 'bg-gray-50   text-gray-700   border-gray-200',
}
const PRIORITY_STYLE = {
  low: 'text-gray-500',
  medium: 'text-gray-700',
  high: 'text-red-700 font-bold',
}

const TABS = [
  { key: 'tickets', label: 'Support Tickets',      icon: '🎫' },
  { key: 'docs',    label: 'Manage Support Docs',  icon: '📘' },
  { key: 'videos',  label: 'Manage Support Videos', icon: '🎬' },
]

// ── Note parsing/serializing ────────────────────────────────────────────────
// `feature_requests.admin_notes` is stored as a single text blob. We treat it
// as a numbered list, where each note starts with "N. " at the beginning of
// a line. The number on disk is just a label — when we serialize we always
// renumber sequentially from 1, so reordering / deletion can never produce
// duplicate numbers.
//
// Legacy notes (no numeric prefix) are treated as a single note #1, so older
// rows show up correctly without any data migration.
function parseNotes(text) {
  const raw = (text || '').trim()
  if (!raw) return []
  // Match: line-start, digits + dot + whitespace, then capture everything
  // up to the next "N. " at line-start (or end of string).
  const re = /^(\d+)\.\s+([\s\S]*?)(?=\n\d+\.\s+|$)/gm
  const out = []
  let m
  while ((m = re.exec(raw))) {
    const t = m[2].trim()
    if (t) out.push(t)
  }
  // Fallback for unnumbered legacy notes — treat whole blob as one note.
  if (out.length === 0) out.push(raw)
  return out
}

function serializeNotes(notes) {
  return notes
    .map(t => (t || '').trim())
    .filter(Boolean)
    .map((t, i) => `${i + 1}. ${t}`)
    .join('\n')
}

export default function Help() {
  const [tab, setTab] = useState('tickets')
  const [stats, setStats] = useState({ handled: 0, avgDays: null })
  // The Help Desk (triage) is only available in the support tenant (Picture
  // Build). null = still checking, false = not allowed, true = allowed.
  const [isSupport, setIsSupport] = useState(null)

  useEffect(() => {
    supabase
      .from('tenants')
      .select('is_support_tenant')
      .maybeSingle()
      .then(({ data }) => setIsSupport(!!data?.is_support_tenant))
  }, [])

  // Top-of-page stat boxes — tickets handled (closed status) and avg
  // completion time. Computed across ALL tickets, not just the current
  // user's; this page is admin-facing in practice.
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const { data, error } = await supabase
          .from('feature_requests')
          .select('status, created_at, updated_at')
          .in('status', ['done', 'declined'])
          .limit(2000)
        if (cancelled || error) return
        const rows = data || []
        const handled = rows.length
        if (handled === 0) {
          setStats({ handled: 0, avgDays: null })
          return
        }
        let totalMs = 0, counted = 0
        for (const r of rows) {
          if (r.created_at && r.updated_at) {
            const ms = new Date(r.updated_at).getTime() - new Date(r.created_at).getTime()
            if (ms > 0) { totalMs += ms; counted += 1 }
          }
        }
        const avgDays = counted > 0 ? (totalMs / counted) / (1000 * 60 * 60 * 24) : null
        setStats({ handled, avgDays })
      } catch (e) {
        if (!cancelled) console.warn('Help Desk stats failed:', e)
      }
    })()
    return () => { cancelled = true }
  }, [])

  if (isSupport === false)
    return (
      <div className="w-full max-w-lg mx-auto mt-16 text-center">
        <p className="text-5xl mb-4">🛟</p>
        <h1 className="text-xl font-bold text-gray-800">Help Desk isn't available here</h1>
        <p className="text-sm text-gray-500 mt-2">
          Need a hand? Use <b>Help → Report Issue</b> from the top bar to send a ticket to our support team —
          we'll take it from there.
        </p>
      </div>
    )

  return (
    <div className="w-full">
      {/* Header */}
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <span>🛟</span> Help Desk
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Triage tickets, manage help docs and training videos.
        </p>
      </div>

      {/* Stat boxes — matches the Bids layout pattern. */}
      <div className="grid grid-cols-2 gap-2 sm:gap-3 mb-6 mt-4">
        <div className="card text-center px-2 py-3 sm:px-4 sm:py-4 min-w-0">
          <p className="text-[10px] sm:text-xs text-gray-500 mb-1 truncate">Tickets Handled</p>
          <p className="font-bold text-gray-900 text-sm sm:text-lg leading-tight">
            {stats.handled.toLocaleString()}
          </p>
        </div>
        <div className="card text-center px-2 py-3 sm:px-4 sm:py-4 min-w-0">
          <p className="text-[10px] sm:text-xs text-gray-500 mb-1 truncate">Avg Time to Complete</p>
          <p className="font-bold text-green-700 text-sm sm:text-lg leading-tight">
            {stats.avgDays == null
              ? '—'
              : stats.avgDays < 1
                ? `${(stats.avgDays * 24).toFixed(1)} hr`
                : `${stats.avgDays.toFixed(1)} days`}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-5">
        <div className="flex gap-1">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
                tab === t.key
                  ? 'border-green-700 text-green-800'
                  : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
            >
              <span className="mr-1.5">{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {tab === 'tickets' && <SupportTickets />}
      {tab === 'docs'    && <ManageResourcesTab kind="docs" />}
      {tab === 'videos'  && <ManageResourcesTab kind="videos" />}
    </div>
  )
}

// ── Support Tickets tab ──────────────────────────────────────────────────────
function SupportTickets() {
  const { user } = useAuth()
  const [tickets, setTickets] = useState([])
  const [userMap, setUserMap] = useState({}) // user_id → { full_name, email }
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('new') // 'new' | 'pending' | 'completed' | 'all'
  const [scope, setScope] = useState('all') // 'mine' | 'all'  (admins only)
  const [expanded, setExpanded] = useState(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [showNew, setShowNew] = useState(false)

  // Status-change/note modal. When set, opens StatusChangeModal.
  //   { ticket, targetBucket }    → admin clicked Move-to-X (status will change)
  //   { ticket, targetBucket: null } → admin clicked "Add Note" (no status change)
  const [pendingChange, setPendingChange] = useState(null)

  // Detect admin role so we know whether to show the All/Mine toggle, the
  // Reporter column, and the status-change buttons in the expanded row.
  useEffect(() => {
    if (!user?.id) return
    let alive = true
    ;(async () => {
      try {
        const { data } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .maybeSingle()
        const role = data?.role || ''
        if (alive) setIsAdmin(role === 'admin' || role === 'super_admin')
      } catch {
        /* fail-closed → non-admin view */
      }
    })()
    return () => {
      alive = false
    }
  }, [user?.id])

  useEffect(() => {
    if (!user?.id) return
    fetchTickets()
  }, [user?.id, isAdmin, scope])

  async function fetchTickets() {
    setLoading(true)
    try {
      let q = supabase
        .from('feature_requests')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500)
      if (!isAdmin || scope === 'mine') {
        q = q.eq('user_id', user.id)
      }
      const { data } = await q
      const rows = data || []
      setTickets(rows)

      const ids = [...new Set(rows.map(r => r.user_id).filter(Boolean))]
      if (ids.length) {
        const { data: profs } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', ids)
        setUserMap(Object.fromEntries((profs || []).map(p => [p.id, p])))
      } else {
        setUserMap({})
      }
    } catch (err) {
      console.warn('[Help] fetchTickets failed', err)
      setTickets([])
    }
    setLoading(false)
  }

  // ── Status workflow (admin) ────────────────────────────────────────────────
  // Status changes always go through StatusChangeModal so the admin can add
  // numbered notes before committing. Direct flips (without the modal) would
  // be too easy to do by accident and would skip the email-with-notes flow.
  function requestMove(row, targetBucket) {
    // No-op if they clicked the bucket they're already in.
    if (bucketOf(row.status) === targetBucket) return
    setPendingChange({ ticket: row, targetBucket })
  }

  function requestAddNote(row) {
    setPendingChange({ ticket: row, targetBucket: null })
  }

  // Commits both the appended notes AND (optionally) the new status. Called
  // from StatusChangeModal.onSaved with the already-serialized admin_notes
  // text plus optional targetBucket. Sends the notification email only when
  // status actually changed to pending or completed.
  async function commitChange({ admin_notes, targetBucket }) {
    if (!pendingChange) return
    const row = pendingChange.ticket
    const updates = { admin_notes }
    const newDbStatus = targetBucket ? BUCKET_TO_DB[targetBucket] : null
    if (newDbStatus) updates.status = newDbStatus

    // Optimistic UI
    setTickets(prev => prev.map(r => (r.id === row.id ? { ...r, ...updates } : r)))

    try {
      await supabase.from('feature_requests').update(updates).eq('id', row.id)
    } catch (err) {
      console.warn('[Help] ticket update failed', err)
      // Roll back optimistic update so UI matches DB.
      setTickets(prev => prev.map(r => (r.id === row.id ? row : r)))
      return
    }

    // Email only on a real bucket transition to pending or completed.
    if (
      newDbStatus &&
      ['pending', 'completed'].includes(targetBucket) &&
      bucketOf(row.status) !== targetBucket
    ) {
      try {
        let toEmail = userMap[row.user_id]?.email
        if (!toEmail && row.user_id) {
          const { data: prof } = await supabase
            .from('profiles')
            .select('email')
            .eq('id', row.user_id)
            .maybeSingle()
          toEmail = prof?.email
        }
        if (toEmail) {
          await sendFeedbackStatusEmail({
            to: toEmail,
            title: row.title || 'your request',
            status: newDbStatus,
            notes: admin_notes || '',
            helpUrl: `${window.location.origin}/help`,
          })
        }
      } catch (err) {
        console.warn('[Help] status email failed', err)
      }
    }

    setPendingChange(null)
  }

  async function handleCreated() {
    setShowNew(false)
    await fetchTickets()
  }

  const visible = tickets.filter(r => {
    if (filter === 'all') return true
    return bucketOf(r.status) === filter
  })

  const counts = {
    all: tickets.length,
    new: tickets.filter(r => bucketOf(r.status) === 'new').length,
    pending: tickets.filter(r => bucketOf(r.status) === 'pending').length,
    completed: tickets.filter(r => bucketOf(r.status) === 'completed').length,
  }

  const FILTERS = [
    { key: 'new',       label: `New (${counts.new})` },
    { key: 'pending',   label: `Pending (${counts.pending})` },
    { key: 'completed', label: `Completed (${counts.completed})` },
    { key: 'all',       label: `All (${counts.all})` },
  ]

  return (
    <div>
      {/* Filter chips + new ticket */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        {FILTERS.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors ${
              filter === f.key
                ? 'bg-green-700 text-white border-green-700'
                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
            }`}
          >
            {f.label}
          </button>
        ))}

        {/* Admin-only scope toggle */}
        {isAdmin && (
          <div className="flex items-center gap-1 ml-2 pl-3 border-l border-gray-200">
            <span className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold mr-1">
              View
            </span>
            {[
              { key: 'all', label: 'All users' },
              { key: 'mine', label: 'Mine only' },
            ].map(s => (
              <button
                key={s.key}
                onClick={() => setScope(s.key)}
                className={`text-xs font-semibold px-2.5 py-1 rounded-md border transition-colors ${
                  scope === s.key
                    ? 'bg-gray-800 text-white border-gray-800'
                    : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        )}

        <div className="flex-1" />
        <button
          onClick={fetchTickets}
          className="text-xs text-gray-500 hover:text-gray-800 px-2 py-1"
        >
          ↻ Refresh
        </button>
        <button
          onClick={() => setShowNew(true)}
          style={{ backgroundColor: FG }}
          className="text-xs font-semibold text-white px-3 py-1.5 rounded-lg hover:opacity-90 transition-opacity"
        >
          + New Ticket
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-700" />
        </div>
      ) : visible.length === 0 ? (
        <EmptyState filter={filter} onNew={() => setShowNew(true)} />
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500">
                <th className="px-3 py-2 text-left font-semibold w-28 whitespace-nowrap">Submitted</th>
                {isAdmin && scope === 'all' && (
                  <th className="px-3 py-2 text-left font-semibold w-40 whitespace-nowrap">Reporter</th>
                )}
                <th className="px-3 py-2 text-left font-semibold w-28 whitespace-nowrap">Category</th>
                <th className="px-3 py-2 text-left font-semibold">Title</th>
                <th className="px-3 py-2 text-left font-semibold w-28 whitespace-nowrap">Priority</th>
                <th className="px-4 py-2 text-left font-semibold w-40 whitespace-nowrap">Status</th>
                <th className="px-3 py-2 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {visible.map(r => {
                const dateStr = new Date(r.created_at).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: '2-digit',
                })
                const isOpen = expanded === r.id
                const reporter = userMap[r.user_id]
                const reporterName =
                  reporter?.full_name ||
                  reporter?.email ||
                  (r.user_id ? r.user_id.slice(0, 8) : '—')
                return (
                  <SupportRow
                    key={r.id}
                    row={r}
                    dateStr={dateStr}
                    isAdmin={isAdmin}
                    showReporter={isAdmin && scope === 'all'}
                    reporterName={reporterName}
                    reporterEmail={reporter?.email}
                    isOpen={isOpen}
                    onToggle={() => setExpanded(isOpen ? null : r.id)}
                    onRequestMove={requestMove}
                    onRequestAddNote={requestAddNote}
                  />
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-gray-400 mt-3">
        Tip: tickets can also be logged automatically when you ask Sam to file a feature request or
        bug report. You'll get an email when something you reported moves to Pending or Completed.
      </p>

      {showNew && (
        <NewTicketModal
          onClose={() => setShowNew(false)}
          onCreated={handleCreated}
          userId={user?.id}
        />
      )}

      {pendingChange && (
        <StatusChangeModal
          ticket={pendingChange.ticket}
          targetBucket={pendingChange.targetBucket}
          onClose={() => setPendingChange(null)}
          onSaved={commitChange}
        />
      )}
    </div>
  )
}

// ── Single ticket row + expandable detail ────────────────────────────────────
function SupportRow({
  row,
  dateStr,
  isAdmin,
  showReporter,
  reporterName,
  reporterEmail,
  isOpen,
  onToggle,
  onRequestMove,
  onRequestAddNote,
}) {
  const r = row
  const bucket = bucketOf(r.status)
  const colSpan = showReporter ? 7 : 6
  return (
    <>
      <tr
        className={`border-b border-gray-100 hover:bg-gray-50/70 cursor-pointer ${isOpen ? 'bg-gray-50' : ''}`}
        onClick={onToggle}
      >
        <td className="px-3 py-2 text-xs text-gray-500">{dateStr}</td>
        {showReporter && (
          <td className="px-3 py-2 text-xs text-gray-700 truncate" title={reporterEmail || ''}>
            {reporterName}
          </td>
        )}
        <td className="px-3 py-2">
          <span
            className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold uppercase ${CATEGORY_STYLE[r.category] || CATEGORY_STYLE.other}`}
          >
            {r.category}
          </span>
        </td>
        <td className="px-3 py-2 text-sm font-medium text-gray-800 truncate">{r.title}</td>
        <td className="px-3 py-2 text-xs whitespace-nowrap">
          <span className={PRIORITY_STYLE[r.priority] || PRIORITY_STYLE.medium}>{r.priority}</span>
        </td>
        <td className="px-4 py-2 whitespace-nowrap">
          <span
            className={`inline-block text-[10px] px-2 py-0.5 rounded-full border font-semibold uppercase whitespace-nowrap ${BUCKET_BADGE_STYLE[bucket]}`}
          >
            {BUCKET_LABEL[bucket]}
          </span>
        </td>
        <td className="px-3 py-2 text-center text-gray-300">
          <span className="text-xs">{isOpen ? '▴' : '▾'}</span>
        </td>
      </tr>
      {isOpen && (
        <tr className="bg-gray-50 border-b border-gray-200">
          <td colSpan={colSpan} className="px-6 py-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                  Description
                </p>
                <p className="text-sm text-gray-800 whitespace-pre-wrap bg-white border border-gray-200 rounded-lg p-3">
                  {r.body || <span className="text-gray-400 italic">No description provided.</span>}
                </p>

                {/* Attachments — auto-copied from the Sam conversation that
                    led to this ticket. Lazy-loaded the first time the row
                    is expanded so the index page stays fast. */}
                <TicketAttachments featureRequestId={r.id} />

                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mt-4 mb-1">
                  Notes from the team
                </p>
                {(() => {
                  const list = parseNotes(r.admin_notes)
                  if (list.length === 0) {
                    return (
                      <p className="text-sm text-gray-400 italic bg-white border border-dashed border-gray-200 rounded-lg p-3">
                        No notes yet. The team will add notes here when they update the status.
                      </p>
                    )
                  }
                  return (
                    <div className="bg-white border border-gray-200 rounded-lg p-3 space-y-2">
                      {list.map((n, i) => (
                        <div key={i} className="text-sm text-gray-800 flex gap-2">
                          <span className="font-semibold text-gray-500 flex-shrink-0">
                            {i + 1}.
                          </span>
                          <span className="whitespace-pre-wrap">{n}</span>
                        </div>
                      ))}
                    </div>
                  )
                })()}
              </div>

              <div className="space-y-3">
                <DetailLine label="Status" value={BUCKET_LABEL[bucket]} />
                <DetailLine label="Priority" value={r.priority} />
                <DetailLine label="Category" value={r.category} />
                <DetailLine
                  label="Source"
                  value={r.source === 'sam' ? 'Logged via Sam' : 'Manual'}
                />
                <DetailLine label="Submitted" value={new Date(r.created_at).toLocaleString()} />
                {r.updated_at && r.updated_at !== r.created_at && (
                  <DetailLine label="Last update" value={new Date(r.updated_at).toLocaleString()} />
                )}

                {/* Admin status workflow buttons. Clicking opens
                    StatusChangeModal where the admin can add numbered notes
                    before committing. Save → status + notes + email. */}
                {isAdmin && (
                  <div className="pt-3 mt-2 border-t border-gray-200">
                    <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-2">
                      Move to
                    </p>
                    <div className="flex gap-1.5 flex-wrap" onClick={e => e.stopPropagation()}>
                      {['new', 'pending', 'completed'].map(b => {
                        const active = bucket === b
                        return (
                          <button
                            key={b}
                            disabled={active}
                            onClick={() => onRequestMove(r, b)}
                            className={`text-xs font-semibold px-2.5 py-1 rounded-md border transition-colors ${
                              active
                                ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-default'
                                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
                            }`}
                          >
                            {BUCKET_LABEL[b]}
                          </button>
                        )
                      })}
                    </div>
                    {/* Always-available note button for the current status. */}
                    <div className="mt-2" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={() => onRequestAddNote(r)}
                        className="text-xs font-semibold text-green-800 hover:text-green-900 hover:underline"
                      >
                        + Add note (no status change)
                      </button>
                    </div>
                    <p className="text-[10px] text-gray-400 mt-2 leading-snug">
                      Moving to Pending or Completed emails the reporter with the latest notes.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

function DetailLine({ label, value }) {
  return (
    <div className="text-xs">
      <span className="text-gray-500 font-semibold uppercase tracking-wide">{label}: </span>
      <span className="text-gray-800">{value}</span>
    </div>
  )
}

// ── Ticket attachments — files auto-copied from the Sam chat ─────────────
// One fetch per expand. Files live in the private sam-attachments bucket;
// we mint 1-hour signed URLs so the admin can preview images inline and
// click to download docs. RLS allows admins to read every file in that
// bucket; non-admins only see their own.
function TicketAttachments({ featureRequestId }) {
  const [atts, setAtts] = useState(null) // null = loading, [] = empty, [...] = data
  const [err, setErr] = useState('')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const { data, error } = await supabase
          .from('feature_request_attachments')
          .select('id, storage_path, file_name, mime_type, size_bytes, kind, created_at')
          .eq('feature_request_id', featureRequestId)
          .order('created_at', { ascending: true })
        if (cancelled) return
        if (error) {
          setErr(error.message)
          setAtts([])
          return
        }
        if (!data || data.length === 0) {
          setAtts([])
          return
        }
        // Sign each path so we can preview/download without exposing the bucket.
        const signed = await Promise.all(
          data.map(async a => {
            const { data: s } = await supabase
              .storage
              .from('sam-attachments')
              .createSignedUrl(a.storage_path, 3600)
            return { ...a, signed_url: s?.signedUrl || null }
          })
        )
        if (!cancelled) setAtts(signed)
      } catch (e) {
        if (!cancelled) {
          setErr(e?.message || String(e))
          setAtts([])
        }
      }
    })()
    return () => { cancelled = true }
  }, [featureRequestId])

  if (atts == null) {
    return (
      <p className="text-xs text-gray-400 mt-4">Loading attachments…</p>
    )
  }
  if (atts.length === 0 && !err) return null

  return (
    <>
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mt-4 mb-1">
        Attachments ({atts.length})
      </p>
      <div className="bg-white border border-gray-200 rounded-lg p-3 flex flex-wrap gap-2">
        {err && (
          <p className="text-xs text-red-600 w-full">{err}</p>
        )}
        {atts.map(a => <TicketAttachmentTile key={a.id} att={a} />)}
      </div>
    </>
  )
}

function TicketAttachmentTile({ att }) {
  const sizeStr =
    att.size_bytes < 1024 ? `${att.size_bytes} B`
    : att.size_bytes < 1024 * 1024 ? `${(att.size_bytes / 1024).toFixed(0)} KB`
    : `${(att.size_bytes / 1024 / 1024).toFixed(1)} MB`

  if (att.kind === 'image' && att.signed_url) {
    return (
      <a
        href={att.signed_url}
        target="_blank"
        rel="noopener noreferrer"
        className="block"
        title={`${att.file_name} (${sizeStr})`}
      >
        <img
          src={att.signed_url}
          alt={att.file_name}
          className="w-24 h-24 rounded-lg object-cover border border-gray-200 hover:border-green-600 transition-colors"
        />
      </a>
    )
  }
  return (
    <a
      href={att.signed_url || '#'}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-2 border border-gray-200 rounded-lg px-2.5 py-1.5 hover:bg-gray-50 hover:border-green-600 transition-colors"
      title={`${att.file_name} (${sizeStr})`}
    >
      <span className="w-10 h-10 rounded bg-gray-100 flex items-center justify-center text-[10px] font-bold text-gray-500 flex-shrink-0">
        {att.kind === 'pdf' ? 'PDF' : att.kind === 'office' ? 'DOC' : 'FILE'}
      </span>
      <div className="min-w-0 max-w-[180px]">
        <p className="text-xs text-gray-800 truncate">{att.file_name}</p>
        <p className="text-[10px] text-gray-400">{sizeStr} · click to open</p>
      </div>
    </a>
  )
}

function EmptyState({ filter, onNew }) {
  const msg =
    filter === 'new'
      ? 'No new tickets right now.'
      : filter === 'pending'
        ? 'Nothing is in progress at the moment.'
        : filter === 'completed'
          ? 'No tickets have been completed yet.'
          : 'There are no tickets to show.'
  return (
    <div className="text-center py-16 text-gray-400 bg-white border border-gray-200 rounded-xl">
      <p className="text-4xl mb-3">📭</p>
      <p className="text-sm font-medium text-gray-500">{msg}</p>
      <p className="text-xs mt-1 max-w-md mx-auto mb-4">
        File one yourself with the New Ticket button, or ask Sam to log a feature request or bug
        report.
      </p>
      <button
        onClick={onNew}
        style={{ backgroundColor: FG }}
        className="text-xs font-semibold text-white px-3 py-1.5 rounded-lg hover:opacity-90 transition-opacity"
      >
        + New Ticket
      </button>
    </div>
  )
}

// ── New Ticket modal ─────────────────────────────────────────────────────────
// Lets any signed-in user file a ticket directly without going through Sam.
// Inserts to feature_requests with source='manual' and status='new'.
function NewTicketModal({ onClose, onCreated, userId }) {
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [category, setCategory] = useState('feature')
  const [priority, setPriority] = useState('medium')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function submit() {
    setError('')
    const t = title.trim()
    const b = body.trim()
    if (!t) {
      setError('Please enter a title.')
      return
    }
    if (!b) {
      setError('Please describe the request or issue.')
      return
    }

    setSaving(true)
    const { error: err } = await supabase.from('feature_requests').insert({
      user_id: userId,
      title: t,
      body: b,
      category,
      priority,
      status: 'new',
      source: 'manual',
    })
    setSaving(false)
    if (err) {
      setError(err.message || 'Save failed.')
      return
    }
    onCreated?.()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg border border-gray-200 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <span>🎫</span> New Support Ticket
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 text-xl leading-none"
          >
            ×
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              autoFocus
              placeholder="Short summary"
              className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">
                Category
              </label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value)}
                className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="feature">Feature</option>
                <option value="bug">Bug</option>
                <option value="enhancement">Enhancement</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">
                Priority
              </label>
              <select
                value={priority}
                onChange={e => setPriority(e.target.value)}
                className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">
              Description
            </label>
            <textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              rows={5}
              placeholder="What's happening? What did you expect? Steps to reproduce if it's a bug…"
              className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          {error && (
            <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </div>
          )}
        </div>

        <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-end gap-2 bg-gray-50">
          <button
            onClick={onClose}
            className="text-xs font-semibold text-gray-600 px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-white"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={saving}
            style={{ backgroundColor: FG }}
            className="text-xs font-semibold text-white px-3 py-1.5 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {saving ? 'Submitting…' : 'Submit Ticket'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── StatusChangeModal ────────────────────────────────────────────────────────
// Opened when the admin clicks a "Move to X" button OR the "Add Note" link
// on an expanded ticket row. Shows the existing numbered notes (read-only),
// lets the admin queue any number of new notes, and on Save commits the
// merged note list along with the (optional) status change. The Email is
// sent by the parent's commitChange handler — not from inside the modal.
//
// Props:
//   ticket        — the row being edited
//   targetBucket  — 'new' | 'pending' | 'completed' | null  (null = note-only)
//   onClose       — close the modal without saving
//   onSaved       — called with { admin_notes, targetBucket } on Save
function StatusChangeModal({ ticket, targetBucket, onClose, onSaved }) {
  // Snapshot existing notes once — they don't change while the modal is open.
  const existing = parseNotes(ticket?.admin_notes || '')

  // Queue of new notes being added in this session. Each entry is plain text.
  const [queued, setQueued] = useState([])
  const [draft, setDraft] = useState('')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  // "Add to list" — pushes the current draft onto queued and clears the
  // textarea so the admin can type the next note. If the draft is empty,
  // does nothing (no empty notes).
  function pushDraft() {
    const t = draft.trim()
    if (!t) return
    setQueued(prev => [...prev, t])
    setDraft('')
    if (err) setErr('')
  }

  function removeQueued(i) {
    setQueued(prev => prev.filter((_, idx) => idx !== i))
  }

  async function save() {
    setErr('')
    // Auto-flush a non-empty draft so the admin doesn't have to remember to
    // hit the + button before Save.
    const finalQueued = [...queued]
    const trimDraft = draft.trim()
    if (trimDraft) finalQueued.push(trimDraft)

    // When moving status, allow saving with zero new notes (status change
    // alone is valid). When in note-only mode, require at least one new note
    // — otherwise the modal is a no-op.
    if (!targetBucket && finalQueued.length === 0) {
      setErr('Add at least one note before saving.')
      return
    }

    const merged = [...existing, ...finalQueued]
    const admin_notes = serializeNotes(merged)

    setSaving(true)
    try {
      await onSaved({ admin_notes, targetBucket })
    } catch (e) {
      setErr(e?.message || 'Save failed.')
      setSaving(false)
    }
  }

  const headerLabel = targetBucket ? `Move to ${BUCKET_LABEL[targetBucket]}` : 'Add Note'
  const saveLabel = saving
    ? 'Saving…'
    : targetBucket && ['pending', 'completed'].includes(targetBucket)
      ? 'Save & Email Reporter'
      : 'Save'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-xl border border-gray-200 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <span>📝</span> {headerLabel}
          </h3>
          <p className="text-xs text-gray-500 mt-1 truncate">{ticket.title}</p>
        </div>

        <div className="px-5 py-4 space-y-4 max-h-[60vh] overflow-y-auto">
          {/* Existing notes (read-only) */}
          {existing.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Existing notes
              </p>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 space-y-1.5">
                {existing.map((t, i) => (
                  <div key={i} className="text-sm text-gray-700 flex gap-2">
                    <span className="font-semibold text-gray-500 flex-shrink-0">{i + 1}.</span>
                    <span className="whitespace-pre-wrap">{t}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Queued new notes (with remove buttons) */}
          {queued.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-green-700 uppercase tracking-wide mb-2">
                New notes (queued — will save)
              </p>
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 space-y-1.5">
                {queued.map((t, i) => (
                  <div key={i} className="text-sm text-gray-800 flex items-start gap-2">
                    <span className="font-semibold text-green-700 flex-shrink-0">
                      {existing.length + i + 1}.
                    </span>
                    <span className="whitespace-pre-wrap flex-1">{t}</span>
                    <button
                      onClick={() => removeQueued(i)}
                      className="text-xs text-gray-400 hover:text-red-600 flex-shrink-0"
                      title="Remove this note"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Draft input */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">
              {targetBucket ? 'Add a note (optional)' : 'Add a note'}
              <span className="text-gray-400 normal-case font-normal ml-1">
                — will be #{existing.length + queued.length + 1}
              </span>
            </label>
            <textarea
              value={draft}
              onChange={e => {
                setDraft(e.target.value)
                if (err) setErr('')
              }}
              rows={3}
              autoFocus
              placeholder={
                targetBucket
                  ? 'Optional note for the reporter (will be included in the email)…'
                  : "What's the update?"
              }
              className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            <div className="mt-1 flex justify-end">
              <button
                onClick={pushDraft}
                disabled={!draft.trim()}
                className="text-xs font-semibold text-green-800 hover:text-green-900 disabled:text-gray-300 disabled:cursor-not-allowed"
              >
                + Add another note
              </button>
            </div>
          </div>

          {targetBucket && ['pending', 'completed'].includes(targetBucket) && (
            <div className="text-xs text-amber-900 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 leading-snug">
              When you save, the ticket status changes to{' '}
              <strong>{BUCKET_LABEL[targetBucket]}</strong> and the reporter is emailed with the
              full notes list.
            </div>
          )}

          {err && (
            <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {err}
            </div>
          )}
        </div>

        <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-end gap-2 bg-gray-50">
          <button
            onClick={onClose}
            className="text-xs font-semibold text-gray-600 px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-white"
          >
            Cancel
          </button>
          <button
            onClick={save}
            disabled={saving}
            style={{ backgroundColor: FG }}
            className="text-xs font-semibold text-white px-3 py-1.5 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {saveLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// ManageResourcesTab — admin UI for help_doc_categories / help_videos etc.
//
// Single component drives both "Manage Support Docs" and "Manage Support
// Videos" via the `kind` prop. The DB tables are parallel:
//   docs:   help_doc_categories,   help_docs   (storage path under docs/)
//   videos: help_video_categories, help_videos (storage path under videos/)
// Both live in the `help-resources` bucket. Admins can:
//   • Create / rename / delete categories
//   • Upload files into a category with a friendly title + description
//   • Reorder, edit metadata, delete items
//   • Read-only badge for non-admins (gate via profiles.role check)
// ─────────────────────────────────────────────────────────────────────────
function ManageResourcesTab({ kind }) {
  const { user } = useAuth()
  const [isAdmin, setIsAdmin] = useState(false)
  const [categories, setCategories] = useState([])
  const [items, setItems]           = useState([]) // all items for visible cats
  const [loading, setLoading]       = useState(true)
  const [newCatName, setNewCatName] = useState('')
  const [uploadFor, setUploadFor]   = useState(null) // category id or null
  const [editItem, setEditItem]     = useState(null) // {id,title,description} or null

  const CONFIG = kind === 'videos'
    ? {
        categoriesTable: 'help_video_categories',
        itemsTable:      'help_videos',
        kindLabel:       'video',
        kindLabelPlural: 'videos',
        pathPrefix:      'videos',
        acceptMime:      'video/mp4,video/quicktime,video/webm,video/x-m4v,.mp4,.mov,.webm,.m4v',
        helpText:        'MP4, MOV, WebM (up to 500 MB each).',
      }
    : {
        categoriesTable: 'help_doc_categories',
        itemsTable:      'help_docs',
        kindLabel:       'doc',
        kindLabelPlural: 'docs',
        pathPrefix:      'docs',
        acceptMime:
          'application/pdf,application/msword,' +
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document,' +
          'application/vnd.ms-excel,' +
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,' +
          'application/vnd.ms-powerpoint,' +
          'application/vnd.openxmlformats-officedocument.presentationml.presentation,' +
          'image/jpeg,image/png,image/webp,' +
          '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.png,.webp',
        helpText:        'PDF, Word, Excel, PowerPoint, or images (up to 500 MB each).',
      }

  useEffect(() => {
    if (!user?.id) return
    let alive = true
    ;(async () => {
      const { data } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
      if (alive) setIsAdmin(['admin','super_admin'].includes(data?.role))
    })()
    return () => { alive = false }
  }, [user?.id])

  const load = useCallback(async () => {
    setLoading(true)
    const { data: cats } = await supabase
      .from(CONFIG.categoriesTable).select('*').order('sort_order').order('name')
    const { data: rows } = await supabase
      .from(CONFIG.itemsTable).select('*').order('sort_order').order('created_at')
    setCategories(cats || [])
    setItems(rows || [])
    setLoading(false)
  }, [CONFIG.categoriesTable, CONFIG.itemsTable])

  useEffect(() => { load() }, [load])

  async function addCategory() {
    const name = newCatName.trim()
    if (!name) return
    const sort_order = (categories[categories.length - 1]?.sort_order ?? -1) + 1
    const { error } = await supabase.from(CONFIG.categoriesTable).insert({ name, sort_order })
    if (error) { alert('Could not add category: ' + error.message); return }
    setNewCatName('')
    load()
  }

  async function renameCategory(cat) {
    const name = prompt('Rename category', cat.name)
    if (!name || name === cat.name) return
    const { error } = await supabase.from(CONFIG.categoriesTable).update({ name: name.trim() }).eq('id', cat.id)
    if (error) { alert(error.message); return }
    load()
  }

  async function deleteCategory(cat) {
    const itemCount = items.filter(i => i.category_id === cat.id).length
    if (!confirm(`Delete category "${cat.name}"? ${itemCount ? `${itemCount} item(s) inside will become uncategorised.` : ''}`)) return
    const { error } = await supabase.from(CONFIG.categoriesTable).delete().eq('id', cat.id)
    if (error) { alert(error.message); return }
    load()
  }

  async function deleteItem(it) {
    if (!confirm(`Delete "${it.title}"? This removes the file from storage.`)) return
    // Best-effort storage cleanup — RLS allows admins to delete.
    await supabase.storage.from('help-resources').remove([it.storage_path]).catch(() => {})
    const { error } = await supabase.from(CONFIG.itemsTable).delete().eq('id', it.id)
    if (error) { alert(error.message); return }
    load()
  }

  if (!isAdmin) {
    return (
      <div className="text-center py-12 bg-white border border-gray-200 rounded-xl">
        <p className="text-4xl mb-3">🔒</p>
        <p className="text-sm text-gray-500">
          Managing {CONFIG.kindLabelPlural} is restricted to admins.
        </p>
      </div>
    )
  }

  const itemsByCat = {}
  for (const it of items) {
    const k = it.category_id || 'uncat'
    if (!itemsByCat[k]) itemsByCat[k] = []
    itemsByCat[k].push(it)
  }

  return (
    <div className="space-y-4">
      {/* Add-category row */}
      <div className="flex gap-2">
        <input
          type="text"
          value={newCatName}
          onChange={e => setNewCatName(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') addCategory() }}
          placeholder="New category name…"
          className="flex-1 text-sm border border-gray-300 rounded-lg px-3 py-2"
        />
        <button
          onClick={addCategory}
          disabled={!newCatName.trim()}
          className="px-4 py-2 text-sm font-semibold rounded-lg bg-green-700 text-white hover:bg-green-800 disabled:opacity-40"
        >
          + Add Category
        </button>
      </div>

      {loading && <p className="text-sm text-gray-400 text-center py-6">Loading…</p>}

      {!loading && categories.length === 0 && !items.length && (
        <div className="text-center py-12 bg-white border border-dashed border-gray-300 rounded-xl">
          <p className="text-sm text-gray-500">
            No categories yet — add one above to get started.
          </p>
        </div>
      )}

      {/* Categories + items */}
      {categories.map(cat => (
        <div key={cat.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border-b border-gray-200">
            <p className="font-semibold text-gray-800">{cat.name}</p>
            <div className="flex gap-2 items-center">
              <button onClick={() => setUploadFor(cat.id)} className="text-xs font-semibold text-green-700 hover:underline">
                + Upload {CONFIG.kindLabel}
              </button>
              <button onClick={() => renameCategory(cat)} className="text-xs text-gray-500 hover:text-gray-800">Rename</button>
              <button onClick={() => deleteCategory(cat)} className="text-xs text-red-500 hover:text-red-700">Delete</button>
            </div>
          </div>
          {(itemsByCat[cat.id] || []).length === 0 ? (
            <p className="text-xs text-gray-400 px-4 py-3 italic">No {CONFIG.kindLabelPlural} in this category yet.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {itemsByCat[cat.id].map(it => (
                <ResourceRow
                  key={it.id}
                  item={it}
                  kind={kind}
                  onEdit={() => setEditItem(it)}
                  onDelete={() => deleteItem(it)}
                />
              ))}
            </ul>
          )}
        </div>
      ))}

      {/* Uncategorised bucket — only shown when there's at least one orphan */}
      {(itemsByCat['uncat'] || []).length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border-b border-gray-200">
            <p className="font-semibold text-gray-500 italic">Uncategorised</p>
            <button onClick={() => setUploadFor(null)} className="text-xs font-semibold text-green-700 hover:underline">
              + Upload {CONFIG.kindLabel}
            </button>
          </div>
          <ul className="divide-y divide-gray-100">
            {itemsByCat['uncat'].map(it => (
              <ResourceRow
                key={it.id}
                item={it}
                kind={kind}
                onEdit={() => setEditItem(it)}
                onDelete={() => deleteItem(it)}
              />
            ))}
          </ul>
        </div>
      )}

      {uploadFor !== undefined && uploadFor !== null && (
        <ResourceUploadModal
          categoryId={uploadFor}
          kind={kind}
          config={CONFIG}
          onClose={() => setUploadFor(null)}
          onCreated={() => { setUploadFor(null); load() }}
          user={user}
        />
      )}
      {editItem && (
        <ResourceEditModal
          item={editItem}
          config={CONFIG}
          categories={categories}
          onClose={() => setEditItem(null)}
          onSaved={() => { setEditItem(null); load() }}
        />
      )}
    </div>
  )
}

function ResourceRow({ item, kind, onEdit, onDelete }) {
  const sizeMb = (item.size_bytes / 1024 / 1024).toFixed(1)
  return (
    <li className="px-4 py-3 flex items-center gap-3 hover:bg-gray-50">
      <span className="w-9 h-9 rounded bg-gray-100 flex items-center justify-center text-[10px] font-bold text-gray-500 flex-shrink-0">
        {kind === 'videos' ? 'VIDEO' : 'FILE'}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800 truncate">{item.title}</p>
        {item.description && (
          <p className="text-xs text-gray-500 truncate">{item.description}</p>
        )}
        <p className="text-[10px] text-gray-400">{item.file_name} · {sizeMb} MB</p>
      </div>
      <button onClick={onEdit} className="text-xs text-gray-500 hover:text-gray-800">Edit</button>
      <button onClick={onDelete} className="text-xs text-red-500 hover:text-red-700">Delete</button>
    </li>
  )
}

// Upload a new doc / video into a specific category (or uncategorised).
function ResourceUploadModal({ categoryId, kind, config, onClose, onCreated, user }) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [file, setFile] = useState(null)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  async function save() {
    if (!title.trim() || !file) {
      setErr('Title and file are both required.')
      return
    }
    setSaving(true); setErr('')
    try {
      const safeName = file.name.replace(/[^\w.\-]+/g, '_').slice(0, 120)
      const id = crypto.randomUUID()
      const path = `${config.pathPrefix}/${id}_${safeName}`
      const { error: upErr } = await supabase.storage
        .from('help-resources')
        .upload(path, file, { contentType: file.type, upsert: false })
      if (upErr) throw new Error(upErr.message)
      const { error: insErr } = await supabase.from(config.itemsTable).insert({
        category_id:  categoryId,
        title:        title.trim().slice(0, 200),
        description:  description.trim().slice(0, 1000) || null,
        storage_path: path,
        file_name:    file.name,
        mime_type:    file.type,
        size_bytes:   file.size,
        uploaded_by:  user.id,
      })
      if (insErr) throw new Error(insErr.message)
      onCreated()
    } catch (e) {
      setErr(e?.message || 'Upload failed.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg border border-gray-200" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-800">Upload {config.kindLabel}</h3>
          <button onClick={onClose} className="text-gray-400 text-xl leading-none">×</button>
        </div>
        <div className="px-5 py-4 space-y-3">
          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">Title</label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)} maxLength={200}
              className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2" autoFocus />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">Description (optional)</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} maxLength={1000}
              className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 resize-y" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">File</label>
            <input type="file" accept={config.acceptMime} onChange={e => setFile(e.target.files?.[0] || null)} className="text-sm" />
            <p className="text-[11px] text-gray-400 mt-1">{config.helpText}</p>
          </div>
          {err && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-2 py-1.5">{err}</p>}
        </div>
        <div className="px-5 py-4 border-t border-gray-100 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">Cancel</button>
          <button onClick={save} disabled={saving || !title.trim() || !file}
            className="px-5 py-2 text-sm rounded-lg bg-green-700 text-white font-semibold hover:bg-green-800 disabled:opacity-50">
            {saving ? 'Uploading…' : 'Upload'}
          </button>
        </div>
      </div>
    </div>
  )
}

// Edit metadata (title / description / category) of an existing item.
// File itself is not replaced — delete + re-upload if a new file is needed.
function ResourceEditModal({ item, config, categories, onClose, onSaved }) {
  const [title, setTitle] = useState(item.title || '')
  const [description, setDescription] = useState(item.description || '')
  const [categoryId, setCategoryId] = useState(item.category_id || '')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  async function save() {
    if (!title.trim()) { setErr('Title is required.'); return }
    setSaving(true); setErr('')
    try {
      const { error } = await supabase.from(config.itemsTable).update({
        title:        title.trim().slice(0, 200),
        description:  description.trim().slice(0, 1000) || null,
        category_id:  categoryId || null,
        updated_at:   new Date().toISOString(),
      }).eq('id', item.id)
      if (error) throw new Error(error.message)
      onSaved()
    } catch (e) { setErr(e?.message || 'Save failed.') } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg border border-gray-200" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-800">Edit {config.kindLabel}</h3>
          <button onClick={onClose} className="text-gray-400 text-xl leading-none">×</button>
        </div>
        <div className="px-5 py-4 space-y-3">
          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">Title</label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)} maxLength={200}
              className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2" autoFocus />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">Description</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} maxLength={1000}
              className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 resize-y" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">Category</label>
            <select value={categoryId} onChange={e => setCategoryId(e.target.value)}
              className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2">
              <option value="">— Uncategorised —</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <p className="text-[11px] text-gray-400">
            To replace the file itself, delete this item and upload a new one.
          </p>
          {err && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-2 py-1.5">{err}</p>}
        </div>
        <div className="px-5 py-4 border-t border-gray-100 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">Cancel</button>
          <button onClick={save} disabled={saving || !title.trim()}
            className="px-5 py-2 text-sm rounded-lg bg-green-700 text-white font-semibold hover:bg-green-800 disabled:opacity-50">
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Docs / Videos placeholders ───────────────────────────────────────────────
function ComingSoon({ icon, label, copy }) {
  return (
    <div className="text-center py-20 bg-white border border-dashed border-gray-300 rounded-xl">
      <p className="text-5xl mb-3">{icon}</p>
      <p className="text-lg font-semibold text-gray-700">{label}</p>
      <p className="text-sm text-gray-500 mt-1 max-w-md mx-auto">{copy}</p>
      <p className="text-xs text-gray-400 mt-4 italic">Coming soon</p>
    </div>
  )
}
