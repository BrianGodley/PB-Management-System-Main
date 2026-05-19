// ─────────────────────────────────────────────────────────────────────────────
// Help.jsx — user-facing Support module.
//
// Three tabs:
//   1. Support Tickets — lives on the `feature_requests` table. Lists the
//      current user's submitted feature requests / bug reports (mostly logged
//      via Ask Sam). Read-only here; admins triage them in Admin > Feedback
//      Inbox. When an admin moves a ticket to "In Progress" or "Done", a
//      status email is sent and the row updates here too.
//   2. Docs   — placeholder, "Coming soon".
//   3. Videos — placeholder, "Coming soon".
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

const FG = '#3A5038'

// Visual styles mirror the Admin Feedback Inbox so users see the same badges
// admins do — keeps the system feeling cohesive.
const CATEGORY_STYLE = {
  feature:     'bg-blue-50   text-blue-800   border-blue-200',
  bug:         'bg-red-50    text-red-800    border-red-200',
  enhancement: 'bg-purple-50 text-purple-800 border-purple-200',
  other:       'bg-gray-50   text-gray-700   border-gray-200',
}
const STATUS_STYLE = {
  new:         'bg-yellow-50 text-yellow-800 border-yellow-200',
  triaged:     'bg-blue-50   text-blue-800   border-blue-200',
  in_progress: 'bg-purple-50 text-purple-800 border-purple-200',
  done:        'bg-green-50  text-green-800  border-green-200',
  declined:    'bg-gray-100  text-gray-600   border-gray-300',
}
const PRIORITY_STYLE = {
  low:    'text-gray-500',
  medium: 'text-gray-700',
  high:   'text-red-700 font-bold',
}

const STATUS_LABEL = {
  new:         'New',
  triaged:     'Triaged',
  in_progress: 'In Progress',
  done:        'Done',
  declined:    'Declined',
}

const TABS = [
  { key: 'tickets', label: 'Support Tickets', icon: '🎫' },
  { key: 'docs',    label: 'Docs',            icon: '📘' },
  { key: 'videos',  label: 'Videos',          icon: '🎬' },
]

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
              <span className="mr-1.5">{t.icon}</span>{t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {tab === 'tickets' && <SupportTickets />}
      {tab === 'docs'    && <ComingSoon icon="📘" label="Documentation"
        copy="Step-by-step guides for every PBS module will live here." />}
      {tab === 'videos'  && <ComingSoon icon="🎬" label="Training Videos"
        copy="Short walkthrough videos for common PBS workflows are on the way." />}
    </div>
  )
}

// ── Support Tickets tab ──────────────────────────────────────────────────────
function SupportTickets() {
  const { user } = useAuth()
  const [tickets,  setTickets]  = useState([])
  const [userMap,  setUserMap]  = useState({})   // user_id → { full_name, email }
  const [loading,  setLoading]  = useState(true)
  const [filter,   setFilter]   = useState('open')   // 'open' | 'all' | 'done'
  const [scope,    setScope]    = useState('all')    // 'mine' | 'all'  (admins only)
  const [expanded, setExpanded] = useState(null)
  const [isAdmin,  setIsAdmin]  = useState(false)

  // Detect admin role so we know whether to show the All / Mine toggle and
  // the Reporter column.
  useEffect(() => {
    if (!user?.id) return
    let alive = true
    ;(async () => {
      try {
        const { data } = await supabase.from('profiles')
          .select('role').eq('id', user.id).maybeSingle()
        const role = data?.role || ''
        if (alive) setIsAdmin(role === 'admin' || role === 'super_admin')
      } catch { /* fail-closed → non-admin view */ }
    })()
    return () => { alive = false }
  }, [user?.id])

  useEffect(() => {
    if (!user?.id) return
    fetchTickets()
  }, [user?.id, isAdmin, scope])

  async function fetchTickets() {
    setLoading(true)
    try {
      // Admins viewing "all" get every row (RLS allows it). Non-admins, and
      // admins who chose "mine", get just their own.
      let q = supabase.from('feature_requests').select('*')
        .order('created_at', { ascending: false }).limit(500)
      if (!isAdmin || scope === 'mine') {
        q = q.eq('user_id', user.id)
      }
      const { data } = await q
      const rows = data || []
      setTickets(rows)

      // Hydrate reporter names for the table (only matters when viewing all).
      const ids = [...new Set(rows.map(r => r.user_id).filter(Boolean))]
      if (ids.length) {
        const { data: profs } = await supabase.from('profiles')
          .select('id, full_name, email').in('id', ids)
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

  const visible = tickets.filter(r => {
    if (filter === 'open') return !['done', 'declined'].includes(r.status)
    if (filter === 'done') return ['done', 'declined'].includes(r.status)
    return true
  })

  const counts = {
    open: tickets.filter(r => !['done','declined'].includes(r.status)).length,
    all:  tickets.length,
    done: tickets.filter(r => ['done','declined'].includes(r.status)).length,
  }

  return (
    <div>
      {/* Filter chips */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        {[
          { key: 'open', label: `Open (${counts.open})` },
          { key: 'all',  label: `All (${counts.all})` },
          { key: 'done', label: `Resolved (${counts.done})` },
        ].map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors ${
              filter === f.key
                ? 'bg-green-700 text-white border-green-700'
                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
            }`}>
            {f.label}
          </button>
        ))}

        {/* Admin-only scope toggle: see everyone's tickets or just yours. */}
        {isAdmin && (
          <div className="flex items-center gap-1 ml-2 pl-3 border-l border-gray-200">
            <span className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold mr-1">View</span>
            {[
              { key: 'all',  label: 'All users' },
              { key: 'mine', label: 'Mine only' },
            ].map(s => (
              <button key={s.key} onClick={() => setScope(s.key)}
                className={`text-xs font-semibold px-2.5 py-1 rounded-md border transition-colors ${
                  scope === s.key
                    ? 'bg-gray-800 text-white border-gray-800'
                    : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                }`}>
                {s.label}
              </button>
            ))}
          </div>
        )}

        <div className="flex-1" />
        <button onClick={fetchTickets} className="text-xs text-gray-500 hover:text-gray-800 px-2 py-1">↻ Refresh</button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-700" />
        </div>
      ) : visible.length === 0 ? (
        <EmptyState filter={filter} />
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
                  month: 'short', day: 'numeric', year: '2-digit',
                })
                const isOpen = expanded === r.id
                const reporter = userMap[r.user_id]
                const reporterName = reporter?.full_name || reporter?.email
                  || (r.user_id ? r.user_id.slice(0, 8) : '—')
                return (
                  <SupportRow
                    key={r.id}
                    row={r}
                    dateStr={dateStr}
                    showReporter={isAdmin && scope === 'all'}
                    reporterName={reporterName}
                    reporterEmail={reporter?.email}
                    isOpen={isOpen}
                    onToggle={() => setExpanded(isOpen ? null : r.id)}
                  />
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-gray-400 mt-3">
        Tip: most tickets are logged automatically when you ask Sam to file a feature request or bug report. You'll get an email when something you reported moves to In Progress or Done.
      </p>
    </div>
  )
}

function SupportRow({ row, dateStr, showReporter, reporterName, reporterEmail, isOpen, onToggle }) {
  const r = row
  // 6 base columns + 1 if Reporter is visible.
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
          <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold uppercase ${CATEGORY_STYLE[r.category] || CATEGORY_STYLE.other}`}>
            {r.category}
          </span>
        </td>
        <td className="px-3 py-2 text-sm font-medium text-gray-800 truncate">{r.title}</td>
        <td className="px-3 py-2 text-xs">
          <span className={PRIORITY_STYLE[r.priority] || PRIORITY_STYLE.medium}>{r.priority}</span>
        </td>
        <td className="px-3 py-2">
          <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold uppercase ${STATUS_STYLE[r.status] || STATUS_STYLE.new}`}>
            {STATUS_LABEL[r.status] || r.status}
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
                  What you submitted
                </p>
                <p className="text-sm text-gray-800 whitespace-pre-wrap bg-white border border-gray-200 rounded-lg p-3">
                  {r.body || <span className="text-gray-400 italic">No description provided.</span>}
                </p>

                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mt-4 mb-1">
                  Notes from the team
                </p>
                {r.admin_notes ? (
                  <p className="text-sm text-gray-800 whitespace-pre-wrap bg-white border border-gray-200 rounded-lg p-3">
                    {r.admin_notes}
                  </p>
                ) : (
                  <p className="text-sm text-gray-400 italic bg-white border border-dashed border-gray-200 rounded-lg p-3">
                    No notes yet. The team will add notes here when they update the status.
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <DetailLine label="Status"   value={STATUS_LABEL[r.status] || r.status} />
                <DetailLine label="Priority" value={r.priority} />
                <DetailLine label="Category" value={r.category} />
                <DetailLine label="Source"   value={r.source === 'sam' ? 'Logged via Sam' : 'Manual'} />
                <DetailLine label="Submitted" value={new Date(r.created_at).toLocaleString()} />
                {r.updated_at && r.updated_at !== r.created_at && (
                  <DetailLine label="Last update" value={new Date(r.updated_at).toLocaleString()} />
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

function EmptyState({ filter }) {
  const msg =
    filter === 'open' ? "You don't have any open requests right now." :
    filter === 'done' ? "You don't have any resolved requests yet." :
    "You haven't submitted any requests yet."
  return (
    <div className="text-center py-16 text-gray-400 bg-white border border-gray-200 rounded-xl">
      <p className="text-4xl mb-3">📭</p>
      <p className="text-sm font-medium text-gray-500">{msg}</p>
      <p className="text-xs mt-1 max-w-md mx-auto">
        Ask Sam to "file a feature request" or "log a bug" and your ticket will show up here.
      </p>
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
