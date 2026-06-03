// Straight-arrow edge renderer. Edges are guaranteed by normalizeEdge
// to be 'down' or 'across' — never up. Down arrows go bottom-center →
// top-center, across arrows go right-edge → left-edge.

import { edgeAnchors, normalizeEdge } from './layout.js'

export default function EdgeLayer({ edges, nodes, laidOut, selectedEdgeId, onEdgeClick }) {
  const byId = new Map(nodes.map(n => [n.id, n]))
  return (
    <g>
      {/* Arrowhead marker, declared once */}
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
        const { x1, y1, x2, y2 } = edgeAnchors(srcBox, tgtBox, direction)
        const isSelected = e.id === selectedEdgeId
        return (
          <g key={e.id} onClick={() => onEdgeClick?.(e.id)} style={{ cursor: 'pointer' }}>
            {/* invisible thick line for easy clicking */}
            <line
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="transparent"
              strokeWidth={14}
            />
            <line
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke={isSelected ? '#2563EB' : '#475569'}
              strokeWidth={isSelected ? 2.5 : 1.75}
              markerEnd="url(#orgchart-arrowhead)"
            />
            {e.label && (
              <text
                x={(x1 + x2) / 2}
                y={(y1 + y2) / 2 - 4}
                textAnchor="middle"
                fontSize="11"
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
