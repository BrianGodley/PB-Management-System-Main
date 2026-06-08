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
import { ContainerNode, PositionNode, CustomNode } from './NodeRenderers.jsx'

const FG = '#16491b'

// Force every title to render horizontally regardless of the node's saved
// orientation, by clearing the per-field `vertical` flags. Used in the area
// info modal so the expanded view always reads left-to-right.
function horizontalize(node) {
  const ts = { ...(node.text_styles || {}) }
  for (const k of Object.keys(ts)) {
    if (ts[k] && ts[k].vertical) ts[k] = { ...ts[k], vertical: false }
  }
  return { ...node, text_styles: ts }
}

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

// Render a single org-chart node (area / position / assistant) into SVG at the
// given box, exactly as it appears on the chart — but with horizontal text.
function ChartNode({ node, box, resolveNodeHolder, onClick }) {
  const n = horizontalize(node)
  const ph = (resolveNodeHolder ? resolveNodeHolder(n) : null) || {}
  if (n.kind === 'container') {
    return (
      <ContainerNode
        node={n}
        box={box}
        selected={false}
        onClick={onClick}
        positionTitle={ph.positionTitle}
        displayName={ph.displayName}
      />
    )
  }
  if (n.kind === 'position' || n.kind === 'assistant') {
    return (
      <PositionNode
        node={n}
        box={box}
        color="#3A5038"
        selected={false}
        onClick={onClick}
        positionTitle={ph.positionTitle}
        displayName={ph.displayName}
      />
    )
  }
  return <CustomNode node={n} box={box} selected={false} onClick={onClick} />
}

// Rough width (in SVG units) needed to fit a string on one line at a given
// font size. ContainerNode wraps text once it no longer fits its box, so we
// size each box generously (factor 0.62 vs the renderer's 0.57) to guarantee
// titles stay on one line — no wrapping, no truncation.
function textWidth(str, size) {
  return String(str || '').length * size * 0.62
}

function neededWidth(node, resolveNodeHolder) {
  const fs = node.font_sizes || {}
  const ph = (resolveNodeHolder ? resolveNodeHolder(node) : null) || {}
  let widest
  if (node.kind === 'container') {
    widest = Math.max(
      textWidth(node.label, fs.label || 12),
      textWidth(node.heading, fs.heading || 14),
      textWidth(ph.positionTitle, fs.title || 10),
      textWidth(ph.displayName, fs.name || 10),
      60,
    )
  } else {
    widest = Math.max(
      textWidth(ph.positionTitle || node.label, fs.title || 12),
      textWidth(ph.displayName, fs.name || 10),
      70,
    )
  }
  return Math.ceil(widest + 20)
}

// ── Area view ────────────────────────────────────────────────────────────────
// Shows the area exactly like the org chart (just larger), with its attached
// junior items butted up beneath it. Each box is sized wide enough that its
// horizontal text fits on one line (no wrap / no truncation), and the whole
// thing is rendered at a comfortable scale (scrolling if it's very wide).
// Clicking a junior drills into it.
function AreaView({ node, nodes, resolveNodeHolder, onDrill }) {
  const juniors = (nodes || []).filter(n => n.parent_container_id === node.id)

  const PAD = 24
  const SCALE = 2.2 // render the SVG units this many CSS px each → large & crisp

  const areaNeeded = neededWidth(node, resolveNodeHolder)
  let juniorWidths = juniors.map(j => neededWidth(j, resolveNodeHolder))
  const juniorsTotal = juniorWidths.reduce((a, b) => a + b, 0)

  // Area width is the widest of: its saved width, its own text need, or the
  // combined width its juniors need. When the area is wider than the juniors
  // need, expand each junior proportionally so they still span it edge-to-edge.
  let areaW = Math.max(node.width || 210, areaNeeded, juniorsTotal)
  if (juniors.length && juniorsTotal > 0 && juniorsTotal < areaW) {
    const k = areaW / juniorsTotal
    juniorWidths = juniorWidths.map(w => w * k)
  } else if (juniors.length) {
    areaW = Math.max(areaW, juniorsTotal)
  }

  const areaH = Math.max(node.height || 90, 70)
  const areaX = PAD
  const areaY = PAD

  let contentH = areaH
  let juniorBoxes = []
  if (juniors.length) {
    const rowH = Math.max(
      juniors.reduce((m, j) => Math.max(m, j.height || 90), 0),
      70,
    )
    let x = areaX
    juniorBoxes = juniors.map((j, i) => {
      const box = { x, y: areaY + areaH, width: juniorWidths[i], height: rowH }
      x += juniorWidths[i]
      return { node: j, box }
    })
    contentH = areaH + rowH
  }

  const vbW = areaW + PAD * 2
  const vbH = contentH + PAD * 2

  return (
    <div className="space-y-3">
      <div className="overflow-auto" style={{ maxHeight: '66vh' }}>
        <svg
          viewBox={`0 0 ${vbW} ${vbH}`}
          width={Math.round(vbW * SCALE)}
          height={Math.round(vbH * SCALE)}
          style={{ display: 'block', background: '#F8FAFC', borderRadius: 12, margin: '0 auto' }}
          preserveAspectRatio="xMidYMin meet"
        >
          <ChartNode
            node={node}
            box={{ x: areaX, y: areaY, width: areaW, height: areaH }}
            resolveNodeHolder={resolveNodeHolder}
            onClick={() => {}}
          />
          {juniorBoxes.map(jb => (
            <g key={jb.node.id} style={{ cursor: 'pointer' }} onClick={() => onDrill(jb.node)}>
              <ChartNode
                node={jb.node}
                box={jb.box}
                resolveNodeHolder={resolveNodeHolder}
                onClick={() => onDrill(jb.node)}
              />
            </g>
          ))}
        </svg>
      </div>
      {juniors.length > 0 && (
        <p className="text-[11px] text-slate-400 text-center">
          Click a junior item to open its expanded view.
        </p>
      )}
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
        className={`bg-white rounded-2xl shadow-2xl w-full max-h-[92vh] flex flex-col overflow-hidden ${
          isArea ? 'max-w-4xl' : 'max-w-lg'
        }`}
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
