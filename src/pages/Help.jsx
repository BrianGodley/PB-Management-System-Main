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
import { useEffect, useState } from 'react'
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
  { key: 'tickets', label: 'Support Tickets', icon: '🎫' },
  { key: 'docs', label: 'Docs', icon: '📘' },
  { key: 'videos', label: 'Videos', icon: '🎬' },
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

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <span>🛟</span> Help &amp; Support
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Track your submitted requests and find help resources.
        </p>
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
      {tab === 'docs' && (
        <ComingSoon
          icon="📘"
          label="Documentation"
          copy="Step-by-step guides for every PBS module will live here."
        />
      )}
      {tab === 'videos' && (
        <ComingSoon
          icon="🎬"
          label="Training Videos"
          copy="Short walkthrough videos for common PBS workflows are on the way."
        />
      )}
    </div>
  )
}

// ── Support Tickets tab ──────────────────────────────────────────────────────
function SupportTickets() {
  const { user } = useAuth()
  const [tickets, setTickets] = useState([])
  const [userMap, setUserMap] = useState({}) // user_id → { full_name, email }
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all') // 'all' | 'new' | 'pending' | 'completed'
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
    { key: 'all', label: `All (${counts.all})` },
    { key: 'new', label: `New (${counts.new})` },
    { key: 'pending', label: `Pending (${counts.pending})` },
    { key: 'completed', label: `Completed (${counts.completed})` },
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
                <th className="px-3 py-2 text-left font-semibold w-28">Submitted</th>
                {isAdmin && scope === 'all' && (
                  <th className="px-3 py-2 text-left font-semibold w-40">Reporter</th>
                )}
                <th className="px-3 py-2 text-left font-semibold w-28">Category</th>
                <th className="px-3 py-2 text-left font-semibold">Title</th>
                <th className="px-3 py-2 text-left font-semibold w-24">Priority</th>
                <th className="px-3 py-2 text-left font-semibold w-32">Status</th>
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
        <td className="px-3 py-2 text-xs">
          <span className={PRIORITY_STYLE[r.priority] || PRIORITY_STYLE.medium}>{r.priority}</span>
        </td>
        <td className="px-3 py-2">
          <span
            className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold uppercase ${BUCKET_BADGE_STYLE[bucket]}`}
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
