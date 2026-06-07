// Orthogonal-arrow edge renderer. All edges are either:
//   • 'down'   — parent to child. Routed bottom-center → vertical →
//                horizontal across at midpoint → vertical → top-center
//                of target. Pure vertical if both nodes share x.
//   • 'across' — sibling to sibling. Strict horizontal: right-edge to
//                left-edge at the shared tier baseline.
// No diagonals anywhere.

import { normalizeEdge } from './layout.js'

function buildPath(srcBox, tgtBox, direction, minBusY) {
  if (direction === 'across') {
    const [a, b] = srcBox.x <= tgtBox.x ? [srcBox, tgtBox] : [tgtBox, srcBox]
    const x1 = a.x + a.width
    const y1 = a.y + a.height / 2
    const x2 = b.x
    return { d: `M ${x1} ${y1} L ${x2} ${y1}`, endX: x2, endY: y1 }
  }
  const x1 = srcBox.x + srcBox.width / 2
  const y1 = srcBox.y + srcBox.height
  const x2 = tgtBox.x + tgtBox.width / 2
  const y2 = tgtBox.y
  if (Math.abs(x1 - x2) < 0.5) {
    return { d: `M ${x1} ${y1} L ${x2} ${y2}`, endX: x2, endY: y2 }
  }
  // The horizontal "bus" sits at the gap midpoint, but when the source row
  // has an assistant we push it below the assistant band so the assistant's
  // own connector doesn't land on this line.
  let midY = (y1 + y2) / 2
  if (Number.isFinite(minBusY) && minBusY > midY) midY = Math.min(minBusY, y2 - 6)
  return {
    d: `M ${x1} ${y1} L ${x1} ${midY} L ${x2} ${midY} L ${x2} ${y2}`,
    endX: x2,
    endY: y2,
  }
}

export default function EdgeLayer({ edges, nodes, laidOut, selectedEdgeId, onEdgeClick }) {
  const byId = new Map(nodes.map(n => [n.id, n]))
  // Bottom edge of the assistant attached to each anchor — used to route the
  // senior→junior bus below the assistant band.
  const assistantBottomByAnchor = new Map()
  for (const n of nodes) {
    if (n.kind !== 'assistant' || !n.attached_to_node_id) continue
    const ab = laidOut.get(n.id)
    if (!ab) continue
    const cur = assistantBottomByAnchor.get(n.attached_to_node_id) || 0
    assistantBottomByAnchor.set(n.attached_to_node_id, Math.max(cur, ab.y + ab.height))
  }
  // Collect assistant connectors: short horizontal line from each
  // assistant's inner edge to its anchor's center X at the assistant's Y.
  const assistantLines = []
  for (const n of nodes) {
    if (n.kind !== 'assistant' || !n.attached_to_node_id) continue
    const aBox = laidOut.get(n.id)
    const anchor = laidOut.get(n.attached_to_node_id)
    if (!aBox || !anchor) continue
    const anchorX = anchor.x + anchor.width / 2
    const lineY = aBox.y + aBox.height / 2
    const side = n.attachment_side || 'right'
    const fromX = side === 'left' ? aBox.x + aBox.width : aBox.x
    assistantLines.push({ id: n.id, x1: fromX, y1: lineY, x2: anchorX, y2: lineY })
  }
  return (
    <g>
      <defs>
        <marker
          id="orgchart-arrowhead"
          viewBox="0 -5 10 10"
          refX="9"
          refY="0"
          markerWidth="6"
          markerHeight="6"
          orient="auto"
        >
          <path d="M0,-4L10,0L0,4Z" fill="#475569" />
        </marker>
      </defs>
      {edges.map(e => {
        const rawSrc = byId.get(e.source_id)
        const rawTgt = byId.get(e.target_id)
        if (!rawSrc || !rawTgt) return null
        const { src, tgt, direction } = normalizeEdge(rawSrc, rawTgt)
        const srcBox = laidOut.get(src.id)
        const tgtBox = laidOut.get(tgt.id)
        if (!srcBox || !tgtBox) return null
        const aBottom = assistantBottomByAnchor.get(src.id)
        const minBusY = aBottom != null ? aBottom + 10 : undefined
        const { d, endX, endY } = buildPath(srcBox, tgtBox, direction, minBusY)
        const isSelected = e.id === selectedEdgeId
        return (
          <g key={e.id} onClick={() => onEdgeClick?.(e.id)} style={{ cursor: 'pointer' }}>
            <path d={d} stroke="transparent" strokeWidth={14} fill="none" />
            <path
              d={d}
              stroke={isSelected ? '#2563EB' : '#475569'}
              strokeWidth={isSelected ? 2.5 : 1.75}
              fill="none"
              markerEnd="url(#orgchart-arrowhead)"
            />
            {e.label && (
              <text
                x={endX}
                y={endY - 6}
                textAnchor="middle"
                fontSize="9"
                fill="#334155"
                style={{ pointerEvents: 'none' }}
              >
                {e.label}
              </text>
            )}
          </g>
        )
      })}
      {assistantLines.map(l => (
        <line
          key={`asst-${l.id}`}
          x1={l.x1}
          y1={l.y1}
          x2={l.x2}
          y2={l.y2}
          stroke="#475569"
          strokeWidth={1.75}
          strokeDasharray="4 3"
          fill="none"
        />
      ))}
    </g>
  )
}
