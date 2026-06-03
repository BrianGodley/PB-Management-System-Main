// Orthogonal-arrow edge renderer. All edges are either:
//   • 'down'   — parent to child. Routed bottom-center → vertical →
//                horizontal across at midpoint → vertical → top-center
//                of target. Pure vertical if both nodes share x.
//   • 'across' — sibling to sibling. Strict horizontal: right-edge to
//                left-edge at the shared tier baseline.
// No diagonals anywhere.

import { normalizeEdge } from './layout.js'

function buildPath(srcBox, tgtBox, direction) {
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
  const midY = (y1 + y2) / 2
  return {
    d: `M ${x1} ${y1} L ${x1} ${midY} L ${x2} ${midY} L ${x2} ${y2}`,
    endX: x2,
    endY: y2,
  }
}

export default function EdgeLayer({ edges, nodes, laidOut, selectedEdgeId, onEdgeClick }) {
  const byId = new Map(nodes.map(n => [n.id, n]))
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
        const { d, endX, endY } = buildPath(srcBox, tgtBox, direction)
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
    </g>
  )
}
