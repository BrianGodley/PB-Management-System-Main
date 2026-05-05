// src/components/StatSharesModal.jsx
//
// "Shared Permissions" modal for statistics. Lists every employee that has a
// linked auth account (i.e. could log in and use the app), and lets the
// stat's owner toggle View / Edit access per user. Saves diffs against the
// statistic_shares table (created by supabase-statistic-shares.sql).
//
// Permission semantics:
//   - View  ⇒ a row in statistic_shares with permission='view'
//   - Edit  ⇒ a row in statistic_shares with permission='edit'
//   - none  ⇒ no row (default; user can't see the stat)
//
// Edit implies View — toggling Edit on auto-promotes a 'view' row to 'edit',
// or creates a new 'edit' row if none existed. Toggling Edit off downgrades
// to 'view' rather than removing the share entirely (less surprising).
//
// Usage:
//   <StatSharesModal
//     statId={selectedStat.id}
//     statName={selectedStat.name}
//     onClose={() => setShowShares(false)}
//   />
//
// The owner doesn't appear in the list (they implicitly have full access).

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

const FG = '#3A5038'

export default function StatSharesModal({ statId, statName, ownerUserId, onClose, initialShares, onLocalSave }) {
  const { user } = useAuth()

  const [employees,  setEmployees]  = useState([]) // [{id, name, email, user_id}]
  const [shares,     setShares]     = useState({}) // user_id -> 'view'|'edit'
  const [original,   setOriginal]   = useState({}) // snapshot for change detection
  const [loading,    setLoading]    = useState(true)
  const [saving,     setSaving]     = useState(false)
  const [error,      setError]      = useState('')
  const [search,     setSearch]     = useState('')
  // Owner discovered from the DB (or seeded from the prop). The DB lookup is
  // the source of truth — it avoids a long-standing footgun where the parent
  // didn't have the stat's real owner and accidentally fell back to the
  // current user, which then hid the current user from the share list.
  const [resolvedOwnerId, setResolvedOwnerId] = useState(ownerUserId || null)

  // ── Load employees with auth accounts + existing shares ───────────────────
  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        // Always need the employee list for both modes
        const { data: empData, error: empErr } = await supabase
          .from('employees')
          .select('id, first_name, last_name, email, user_id, status')
          .not('user_id', 'is', null)
          .order('last_name', { ascending: true })
        if (empErr) throw empErr

        // DB mode (we have a statId) → fetch existing share rows + the
        // stat's authoritative owner_user_id.
        // Local mode (no statId — new-stat creation) → seed from initialShares
        // and skip the DB reads entirely.
        let sharesMap = {}
        if (statId) {
          const [{ data: shareData, error: shareErr }, { data: statRow, error: statErr }] = await Promise.all([
            supabase
              .from('statistic_shares')
              .select('user_id, permission')
              .eq('statistic_id', statId),
            supabase
              .from('statistics')
              .select('owner_user_id')
              .eq('id', statId)
              .maybeSingle(),
          ])
          if (shareErr) throw shareErr
          if (statErr) throw statErr
          for (const row of (shareData || [])) {
            sharesMap[row.user_id] = row.permission
          }
          if (statRow?.owner_user_id) setResolvedOwnerId(statRow.owner_user_id)
        } else {
          sharesMap = { ...(initialShares || {}) }
        }

        if (cancelled) return

        const list = (empData || [])
          .filter(e => e.status !== 'archived')
          .map(e => ({
            id:      e.id,
            user_id: e.user_id,
            name:    [e.first_name, e.last_name].filter(Boolean).join(' ') || e.email || '—',
            email:   e.email || '',
          }))

        // Make sure the signed-in user is always pickable, even when they:
        //   - have no employees row at all (e.g. admins onboarded outside HR)
        //   - have an employees row that's archived
        //   - have an employees row whose user_id wasn't linked to auth
        // Without this they can't grant themselves view/edit access on stats
        // they don't own.
        if (user?.id && !list.some(e => e.user_id === user.id)) {
          // Try to enrich with the user's actual name by querying employees
          // again without the user_id-null / archived filters, matching by
          // user_id or email. Falls back to email if nothing found.
          let displayName = user.user_metadata?.full_name || ''
          let matchedEmp = null
          try {
            const orFilter = `user_id.eq.${user.id}` + (user.email ? `,email.eq.${user.email}` : '')
            const { data: meData } = await supabase
              .from('employees')
              .select('first_name, last_name, email, user_id')
              .or(orFilter)
              .limit(1)
            matchedEmp = meData?.[0] || null
          } catch { /* swallow — fall back below */ }
          if (matchedEmp) {
            const full = [matchedEmp.first_name, matchedEmp.last_name].filter(Boolean).join(' ')
            if (full) displayName = full
          }
          if (!displayName) displayName = user.email || 'Me'
          list.unshift({
            id:      `self-${user.id}`,
            user_id: user.id,
            name:    displayName,
            email:   user.email || matchedEmp?.email || '',
          })
        }

        setEmployees(list)
        setShares(sharesMap)
        setOriginal(sharesMap)
        setLoading(false)
      } catch (err) {
        if (!cancelled) {
          setError(err?.message || 'Failed to load shares.')
          setLoading(false)
        }
      }
    }
    load()
    return () => { cancelled = true }
  }, [statId])

  // ── Toggle helpers ───────────────────────────────────────────────────────
  function setView(userId, on) {
    setShares(prev => {
      const next = { ...prev }
      if (on) {
        // If already has edit, leave it (edit implies view); else set to view
        if (next[userId] !== 'edit') next[userId] = 'view'
      } else {
        // Removing view also removes edit (no permission at all)
        delete next[userId]
      }
      return next
    })
  }

  function setEdit(userId, on) {
    setShares(prev => {
      const next = { ...prev }
      if (on) {
        next[userId] = 'edit'
      } else {
        // Downgrade to view rather than remove entirely
        if (next[userId] === 'edit') next[userId] = 'view'
      }
      return next
    })
  }

  // ── Save (compute diff vs original, then insert/update/delete) ────────────
  async function handleSave() {
    setSaving(true)
    setError('')

    // Local mode (no statId yet — used while creating a new stat). The form
    // will write the shares to the DB itself after the stat is inserted.
    if (!statId) {
      try {
        onLocalSave?.({ ...shares })
        setOriginal(shares)
        onClose?.()
      } catch (err) {
        setError(err?.message || 'Save failed.')
        setSaving(false)
      }
      return
    }

    // DB mode — diff and persist directly.
    try {
      const toUpsert = []
      const toDelete = []

      const allUserIds = new Set([...Object.keys(shares), ...Object.keys(original)])
      for (const uid of allUserIds) {
        const before = original[uid]
        const after  = shares[uid]
        if (before === after) continue
        if (!after && before) {
          toDelete.push(uid)
        } else if (after) {
          toUpsert.push({
            statistic_id: statId,
            user_id:      uid,
            permission:   after,
            created_by:   user?.id || null,
          })
        }
      }

      if (toDelete.length) {
        const { error: delErr } = await supabase
          .from('statistic_shares')
          .delete()
          .eq('statistic_id', statId)
          .in('user_id', toDelete)
        if (delErr) throw delErr
      }

      if (toUpsert.length) {
        const { error: upErr } = await supabase
          .from('statistic_shares')
          .upsert(toUpsert, { onConflict: 'statistic_id,user_id' })
        if (upErr) throw upErr
      }

      setOriginal(shares)
      onClose?.()
    } catch (err) {
      setError(err?.message || 'Save failed.')
      setSaving(false)
    }
  }

  // ── Filtered + dirty state ───────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return employees
    return employees.filter(e =>
      e.name.toLowerCase().includes(q) ||
      e.email.toLowerCase().includes(q)
    )
  }, [employees, search])

  const dirty = useMemo(() => {
    const allUserIds = new Set([...Object.keys(shares), ...Object.keys(original)])
    for (const uid of allUserIds) {
      if (shares[uid] !== original[uid]) return true
    }
    return false
  }, [shares, original])

  // Owner is implicit — exclude them so we don't show a meaningless row.
  // Use the DB-resolved owner first; fall back to the prop only when the DB
  // lookup hasn't completed yet (or in local-mode for a not-yet-saved stat).
  const visibleEmployees = useMemo(
    () => filtered.filter(e => e.user_id !== (resolvedOwnerId || ownerUserId)),
    [filtered, resolvedOwnerId, ownerUserId]
  )

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 border-b border-gray-200 flex-shrink-0"
          style={{ backgroundColor: FG }}
        >
          <div className="min-w-0">
            <h2 className="text-base font-bold text-white truncate">Shared Permissions</h2>
            <p className="text-xs text-green-200 mt-0.5 truncate">{statName || '—'}</p>
          </div>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white text-xl leading-none px-2"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Search + body */}
        <div className="flex-1 overflow-hidden flex flex-col">
          <div className="px-6 py-3 border-b border-gray-100 flex-shrink-0 bg-gray-50">
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search employees…"
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-700/30 focus:border-green-700"
            />
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading && (
              <div className="text-center py-12 text-gray-500 text-sm">Loading employees…</div>
            )}

            {error && !loading && (
              <div className="m-6 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
                <span className="font-semibold">Error:</span> {error}
              </div>
            )}

            {!loading && !error && (
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-gray-50 border-b border-gray-200 z-10">
                  <tr className="text-xs uppercase tracking-wide text-gray-500">
                    <th className="text-left px-6 py-2 font-semibold">Employee</th>
                    <th className="text-center px-3 py-2 font-semibold w-24">View</th>
                    <th className="text-center px-3 py-2 font-semibold w-24">Edit</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleEmployees.length === 0 && (
                    <tr><td colSpan={3} className="text-center py-12 text-gray-400 text-sm">
                      {search ? 'No employees match your search.' : 'No employees with linked accounts to share with.'}
                    </td></tr>
                  )}
                  {visibleEmployees.map(emp => {
                    const perm = shares[emp.user_id]
                    const hasView = perm === 'view' || perm === 'edit'
                    const hasEdit = perm === 'edit'
                    return (
                      <tr key={emp.user_id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-2.5">
                          <p className="font-medium text-gray-800">{emp.name}</p>
                          {emp.email && <p className="text-xs text-gray-400">{emp.email}</p>}
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          <input
                            type="checkbox"
                            checked={hasView}
                            onChange={e => setView(emp.user_id, e.target.checked)}
                            className="w-4 h-4 rounded accent-green-700 cursor-pointer"
                          />
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          <input
                            type="checkbox"
                            checked={hasEdit}
                            onChange={e => setEdit(emp.user_id, e.target.checked)}
                            className="w-4 h-4 rounded accent-green-700 cursor-pointer"
                          />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-gray-200 bg-gray-50 flex-shrink-0">
          <p className="text-xs text-gray-500">
            Edit implies View. The stat's owner always has full access.
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="text-xs px-3 py-1.5 rounded-lg border border-gray-300 text-gray-600 hover:bg-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!dirty || saving || loading}
              className="text-xs px-4 py-1.5 rounded-lg bg-green-700 text-white hover:bg-green-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-semibold"
            >
              {saving ? 'Saving…' : 'Save Permissions'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
