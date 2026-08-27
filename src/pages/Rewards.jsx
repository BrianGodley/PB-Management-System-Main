import { useState, useEffect, useMemo, useCallback } from 'react'
import { supabase } from '../lib/supabase'

// ── Rewards ──────────────────────────────────────────────────────────────
// Points program for employees. Left column = every active employee with their
// photo + running points total (large & bold). Click a name to load their
// points account on the right. The right pane is mostly placeholder for now —
// automatic preset factors (e.g. crews coming in under hours) and points games
// are scaffolded in the schema (reward_rules / reward_games) but wired later.

function initials(e) {
  return `${e?.first_name?.[0] || ''}${e?.last_name?.[0] || ''}`.toUpperCase()
}
function fullName(e) {
  if (!e) return ''
  return `${e.last_name || ''}, ${e.first_name || ''}`.replace(/^, |, $/g, '').trim()
}
function fmtDate(d) {
  if (!d) return ''
  return new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

function Avatar({ emp, size = 'w-10 h-10', text = 'text-sm' }) {
  return (
    <div
      className={`${size} rounded-full overflow-hidden bg-green-100 flex items-center justify-center flex-shrink-0`}
    >
      {emp?.avatar_url ? (
        <img src={emp.avatar_url} alt="" className="w-full h-full object-cover" />
      ) : (
        <span className={`${text} font-bold text-green-700`}>{initials(emp)}</span>
      )}
    </div>
  )
}

export default function Rewards() {
  const [employees, setEmployees] = useState([])
  const [totals, setTotals] = useState({}) // { employee_id: points }
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState(null)
  const [ledger, setLedger] = useState([])
  const [ledgerLoading, setLedgerLoading] = useState(false)
  const [userId, setUserId] = useState(null)
  const [showAdd, setShowAdd] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    const [{ data: emps }, { data: txns }] = await Promise.all([
      supabase
        .from('employees')
        .select('id, first_name, last_name, nickname, avatar_url, job_title, department, status')
        .eq('status', 'active')
        .order('last_name'),
      supabase.from('reward_transactions').select('employee_id, points'),
    ])
    const sums = {}
    ;(txns || []).forEach(t => {
      sums[t.employee_id] = (sums[t.employee_id] || 0) + (t.points || 0)
    })
    setEmployees(emps || [])
    setTotals(sums)
    setLoading(false)
  }, [])

  useEffect(() => {
    loadData()
    supabase.auth.getUser().then(({ data }) => setUserId(data?.user?.id || null))
  }, [loadData])

  const loadLedger = useCallback(async empId => {
    if (!empId) return setLedger([])
    setLedgerLoading(true)
    const { data } = await supabase
      .from('reward_transactions')
      .select('*')
      .eq('employee_id', empId)
      .order('created_at', { ascending: false })
      .limit(50)
    setLedger(data || [])
    setLedgerLoading(false)
  }, [])

  useEffect(() => {
    loadLedger(selectedId)
  }, [selectedId, loadLedger])

  const selected = useMemo(
    () => employees.find(e => e.id === selectedId) || null,
    [employees, selectedId]
  )

  const rankedTotal = useMemo(() => {
    const vals = Object.values(totals)
    return { max: vals.length ? Math.max(...vals, 0) : 0 }
  }, [totals])

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-2">
        <span className="text-2xl">🏆</span>
        <div>
          <h1 className="text-lg font-bold text-gray-900 leading-tight">Rewards</h1>
          <p className="text-xs text-gray-500">Employee points program</p>
        </div>
      </div>

      <div className="flex-1 flex min-h-0">
        {/* ── Left column: employees + points total ─────────────────── */}
        <div className="w-1/5 min-w-[220px] border-r border-gray-200 bg-white flex flex-col min-h-0">
          <div className="px-3 py-2 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center justify-between">
            <span>Employees</span>
            <span className="text-gray-400 normal-case font-normal">{employees.length}</span>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-sm text-gray-400">Loading…</div>
            ) : employees.length === 0 ? (
              <div className="p-4 text-sm text-gray-400">No active employees.</div>
            ) : (
              employees.map(emp => {
                const pts = totals[emp.id] || 0
                const active = emp.id === selectedId
                return (
                  <button
                    key={emp.id}
                    onClick={() => setSelectedId(emp.id)}
                    className={`w-full text-left flex items-center gap-3 px-3 py-2 border-b border-gray-50 transition-colors ${
                      active ? 'bg-green-50' : 'hover:bg-gray-50'
                    }`}
                  >
                    <Avatar emp={emp} />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium text-gray-900 truncate">
                        {fullName(emp)}
                      </span>
                      {emp.job_title && (
                        <span className="block text-[11px] text-gray-400 truncate">
                          {emp.job_title}
                        </span>
                      )}
                    </span>
                    <span
                      className={`text-xl font-extrabold tabular-nums ${
                        pts > 0 ? 'text-green-700' : 'text-gray-300'
                      }`}
                    >
                      {pts}
                    </span>
                  </button>
                )
              })
            )}
          </div>
        </div>

        {/* ── Right: working space ──────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto bg-gray-50 p-4 min-h-0">
          {!selected ? (
            <div className="h-full flex flex-col items-center justify-center text-center gap-4">
              <div className="text-5xl">🏆</div>
              <div>
                <p className="text-gray-700 font-medium">Select an employee</p>
                <p className="text-sm text-gray-400">
                  Pick a name on the left to view their points account.
                </p>
              </div>
              <PlaceholderCard
                title="Points Games"
                body="Create and run team points games here. Coming soon."
                icon="🎮"
              />
            </div>
          ) : (
            <div className="max-w-3xl mx-auto space-y-4">
              {/* Selected employee header */}
              <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-4">
                <Avatar emp={selected} size="w-16 h-16" text="text-xl" />
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg font-bold text-gray-900 truncate">
                    {selected.first_name} {selected.last_name}
                  </h2>
                  <p className="text-sm text-gray-400 truncate">
                    {[selected.job_title, selected.department].filter(Boolean).join(' · ') ||
                      'Team member'}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-extrabold text-green-700 tabular-nums leading-none">
                    {totals[selected.id] || 0}
                  </div>
                  <div className="text-[11px] uppercase tracking-wide text-gray-400 mt-1">
                    points
                  </div>
                </div>
                <button
                  onClick={() => setShowAdd(true)}
                  className="ml-2 px-3 py-2 rounded-lg bg-green-700 text-white text-sm font-medium hover:bg-green-800"
                >
                  + Add Points
                </button>
              </div>

              {/* Points activity / ledger */}
              <div className="bg-white rounded-xl border border-gray-200">
                <div className="px-4 py-2 border-b border-gray-100 text-sm font-semibold text-gray-700">
                  Points Activity
                </div>
                {ledgerLoading ? (
                  <div className="p-4 text-sm text-gray-400">Loading…</div>
                ) : ledger.length === 0 ? (
                  <div className="p-6 text-sm text-gray-400 text-center">
                    No points activity yet. Use “Add Points” to record a one-time reward.
                  </div>
                ) : (
                  <ul className="divide-y divide-gray-50">
                    {ledger.map(t => (
                      <li key={t.id} className="px-4 py-2 flex items-center gap-3">
                        <span
                          className={`text-base font-bold tabular-nums w-14 text-right ${
                            t.points >= 0 ? 'text-green-700' : 'text-red-600'
                          }`}
                        >
                          {t.points >= 0 ? '+' : ''}
                          {t.points}
                        </span>
                        <span className="flex-1 min-w-0">
                          <span className="block text-sm text-gray-800 truncate">
                            {t.reason || 'Points adjustment'}
                          </span>
                          {t.note && (
                            <span className="block text-xs text-gray-400 truncate">{t.note}</span>
                          )}
                        </span>
                        <span className="text-xs text-gray-400 flex-shrink-0">
                          {fmtDate(t.created_at)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Placeholders for the pieces coming later */}
              <PlaceholderCard
                title="Automatic Rewards"
                body="Preset factors award points automatically — including crews coming in under hours on a project. Coming soon."
                icon="⚙️"
              />
              <PlaceholderCard
                title="Points Games"
                body="Create and run team points games here. Coming soon."
                icon="🎮"
              />
            </div>
          )}
        </div>
      </div>

      {showAdd && selected && (
        <AddPointsModal
          employee={selected}
          userId={userId}
          onClose={() => setShowAdd(false)}
          onSaved={async () => {
            setShowAdd(false)
            await loadData()
            await loadLedger(selectedId)
          }}
        />
      )}
    </div>
  )
}

function PlaceholderCard({ title, body, icon }) {
  return (
    <div className="bg-white rounded-xl border border-dashed border-gray-300 p-4 flex items-start gap-3 w-full max-w-md">
      <span className="text-2xl">{icon}</span>
      <div>
        <p className="font-semibold text-gray-700">{title}</p>
        <p className="text-sm text-gray-400">{body}</p>
      </div>
    </div>
  )
}

// One-time reward addition (or deduction with a negative number).
function AddPointsModal({ employee, userId, onClose, onSaved }) {
  const [points, setPoints] = useState('')
  const [reason, setReason] = useState('')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function save() {
    const n = parseInt(points, 10)
    if (!n) return setError('Enter a non-zero point amount.')
    if (!reason.trim()) return setError('Enter a reason.')
    setSaving(true)
    setError('')
    const { error: err } = await supabase.from('reward_transactions').insert({
      employee_id: employee.id,
      points: n,
      reason: reason.trim(),
      note: note.trim() || null,
      source: 'manual',
      created_by: userId,
    })
    setSaving(false)
    if (err) return setError(err.message)
    onSaved()
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-sm p-5"
        onClick={e => e.stopPropagation()}
      >
        <h3 className="text-lg font-bold text-gray-900 mb-1">Add Points</h3>
        <p className="text-sm text-gray-400 mb-4">
          {employee.first_name} {employee.last_name}
        </p>
        <label className="block text-xs font-medium text-gray-500 mb-1">Points</label>
        <input
          type="number"
          value={points}
          onChange={e => setPoints(e.target.value)}
          placeholder="e.g. 50 (use -50 to deduct)"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mb-3"
          autoFocus
        />
        <label className="block text-xs font-medium text-gray-500 mb-1">Reason</label>
        <input
          type="text"
          value={reason}
          onChange={e => setReason(e.target.value)}
          placeholder="e.g. Came in under hours on Smith job"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mb-3"
        />
        <label className="block text-xs font-medium text-gray-500 mb-1">Note (optional)</label>
        <textarea
          value={note}
          onChange={e => setNote(e.target.value)}
          rows={2}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mb-3"
        />
        {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="px-4 py-2 rounded-lg bg-green-700 text-white text-sm font-medium hover:bg-green-800 disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}
