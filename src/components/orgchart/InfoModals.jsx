// Read-only "info" modals for org-chart items. A plain click on any item (in
// either edit or view mode) opens this modal.
//
//  • Position / assistant items  → holder name + a mini table of the stats
//    assigned to that position, each with an auto-generated "Ask Sam" synopsis.
//  • Area (container) items       → an expanded view of the area plus its
//    junior items. Clicking a junior drills into it (recursively) so you can
//    walk an area → its juniors → their juniors.
//
// The component keeps a navigation stack so drill-down/back works inside one
// modal without spawning a window per level.

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

const FG = '#16491b'

// ── Sam synopsis ─────────────────────────────────────────────────────────────
// Calls the same agent-chat Edge Function SamChat uses, with a fresh (no
// conversation_id) one-shot prompt asking for a short read on the stat.
async function askSamSynopsis(stat, recentValues) {
  const {
    data: { session },
  } = await supabase.auth.getSession()
  const jwt = session?.access_token
  if (!jwt) throw new Error('Not signed in.')

  const valsText = (recentValues || [])
    .map(v => `${v.period_date}: ${v.value}`)
    .join('; ')
  const message =
    `In ONE or two short sentences, give a plain-language read on how this ` +
    `business statistic is doing and its recent trend. Be concise, no preamble.\n` +
    `Statistic: "${stat.name}" (type ${stat.stat_type || 'numeric'}, tracked ${stat.tracking || 'monthly'}).\n` +
    `Recent values (newest first): ${valsText || 'none recorded yet'}.`

  const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/agent-chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${jwt}` },
    body: JSON.stringify({ message, attachments: [] }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`)
  return data.reply || '(no synopsis)'
}

// ── Position view ────────────────────────────────────────────────────────────
function PositionView({ node, resolveNodeHolder }) {
  const ph = (resolveNodeHolder ? resolveNodeHolder(node) : null) || {}
  const positionTitle = ph.positionTitle || node.label || '(no position)'
  const displayName = ph.displayName || 'Held from Above'

  const [stats, setStats] = useState([])
  const [loading, setLoading] = useState(true)
  const [synopses, setSynopses] = useState({}) // statId -> { text, loading, error }

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      const pid = node.position_id
      if (!pid) {
        if (!cancelled) {
          setStats([])
          setLoading(false)
        }
        return
      }
      const { data: statRows } = await supabase
        .from('statistics')
        .select('*')
        .eq('owner_position_id', pid)
        .eq('archived', false)
      const list = statRows || []
      if (cancelled) return
      setStats(list)
      setLoading(false)

      // Auto-generate a Sam synopsis for each stat on open.
      list.forEach(async stat => {
        setSynopses(s => ({ ...s, [stat.id]: { loading: true } }))
        try {
          const { data: vals } = await supabase
            .from('statistic_values')
            .select('period_date, value')
            .eq('statistic_id', stat.id)
            .order('period_date', { ascending: false })
            .limit(6)
          const text = await askSamSynopsis(stat, vals || [])
          if (!cancelled) setSynopses(s => ({ ...s, [stat.id]: { text } }))
        } catch (e) {
          if (!cancelled)
            setSynopses(s => ({ ...s, [stat.id]: { error: e.message || 'Sam unavailable' } }))
        }
      })
    })()
    return () => {
      cancelled = true
    }
  }, [node.id, node.position_id])

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
        <p className="text-xs uppercase tracking-wide text-slate-400 font-semibold">Position</p>
        <p className="text-lg font-bold text-slate-800">{positionTitle}</p>
        <p className="text-xs uppercase tracking-wide text-slate-400 font-semibold mt-2">
          Assigned Employee
        </p>
        <p className="text-sm font-medium text-slate-700">{displayName}</p>
      </div>

      <div>
        <p className="text-sm font-bold text-slate-700 mb-2">
          Stats assigned to this position
        </p>
        {loading ? (
          <p className="text-sm text-slate-400">Loading stats…</p>
        ) : stats.length === 0 ? (
          <p className="text-sm text-slate-400 italic">
            No statistics are assigned to this position.
          </p>
        ) : (
          <div className="space-y-2">
            {stats.map(stat => {
              const syn = synopses[stat.id] || {}
              return (
                <div key={stat.id} className="rounded-lg border border-slate-200 px-3 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-slate-800">{stat.name}</span>
                    <span className="text-[10px] uppercase tracking-wide text-slate-400">
                      {stat.stat_type || ''} · {stat.tracking || ''}
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-slate-600">
                    <span className="font-semibold" style={{ color: FG }}>
                      🤖 Sam:{' '}
                    </span>
                    {syn.loading ? (
                      <span className="text-slate-400 italic">thinking…</span>
                    ) : syn.error ? (
                      <span className="text-amber-600 italic">{syn.error}</span>
                    ) : (
                      <span>{syn.text}</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Area view ────────────────────────────────────────────────────────────────
function AreaView({ node, nodes, resolveNodeHolder, onDrill }) {
  const juniors = (nodes || []).filter(n => n.parent_container_id === node.id)
  const ph = (resolveNodeHolder ? resolveNodeHolder(node) : null) || {}

  return (
    <div className="space-y-4">
      <div
        className="rounded-xl border-2 px-4 py-3"
        style={{ borderColor: node.bg_color && node.bg_color !== 'none' ? node.bg_color : '#cbd5e1' }}
      >
        <p className="text-xs uppercase tracking-wide text-slate-400 font-semibold">Area</p>
        <p className="text-lg font-bold text-slate-800">{node.label || '(unnamed area)'}</p>
        {node.heading ? <p className="text-sm text-slate-600">{node.heading}</p> : null}
        {ph.positionTitle ? (
          <p className="text-xs text-slate-500 mt-1">
            In charge: <span className="font-medium">{ph.positionTitle}</span>
            {ph.displayName ? ` — ${ph.displayName}` : ''}
          </p>
        ) : null}
      </div>

      <div>
        <p className="text-sm font-bold text-slate-700 mb-2">
          Junior items ({juniors.length})
        </p>
        {juniors.length === 0 ? (
          <p className="text-sm text-slate-400 italic">This area has no junior items.</p>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {juniors.map(j => {
              const jph = (resolveNodeHolder ? resolveNodeHolder(j) : null) || {}
              const isArea = j.kind === 'container'
              return (
                <button
                  key={j.id}
                  type="button"
                  onClick={() => onDrill(j)}
                  className="text-left rounded-lg border border-slate-200 px-3 py-2 hover:border-slate-400 hover:bg-slate-50 transition-colors"
                >
                  <span className="text-[10px] uppercase tracking-wide text-slate-400 font-semibold">
                    {isArea ? 'Area' : j.kind === 'assistant' ? 'Assistant' : 'Position'}
                  </span>
                  <p className="text-sm font-semibold text-slate-800 truncate">
                    {isArea ? j.label || '(unnamed)' : jph.positionTitle || j.label || '(no position)'}
                  </p>
                  {!isArea && jph.displayName ? (
                    <p className="text-xs text-slate-500 truncate">{jph.displayName}</p>
                  ) : null}
                  <p className="text-[11px] mt-1" style={{ color: FG }}>
                    Open →
                  </p>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Wrapper with drill-down stack ────────────────────────────────────────────
export default function ItemInfoModal({ node, nodes, resolveNodeHolder, onClose }) {
  const [stack, setStack] = useState([node])
  useEffect(() => {
    setStack([node])
  }, [node])

  const current = stack[stack.length - 1]
  if (!current) return null
  const isArea = current.kind === 'container'

  const title = isArea ? 'Area Details' : 'Position Details'
  const goBack = () => setStack(s => (s.length > 1 ? s.slice(0, -1) : s))

  return (
    <div className="fixed inset-0 z-[60] bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[88vh] flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div
          className="flex items-center justify-between px-5 py-3 border-b border-slate-100 flex-shrink-0"
          style={{ backgroundColor: FG }}
        >
          <div className="flex items-center gap-2">
            {stack.length > 1 && (
              <button
                onClick={goBack}
                className="text-white/80 hover:text-white text-sm font-semibold"
                title="Back"
              >
                ← Back
              </button>
            )}
            <h2 className="text-base font-bold text-white">{title}</h2>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white text-xl leading-none">
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {isArea ? (
            <AreaView
              node={current}
              nodes={nodes}
              resolveNodeHolder={resolveNodeHolder}
              onDrill={j => setStack(s => [...s, j])}
            />
          ) : (
            <PositionView node={current} resolveNodeHolder={resolveNodeHolder} />
          )}
        </div>
      </div>
    </div>
  )
}
