// Orthogonal-arrow edge renderer. Down-edges route bottom-center → vertical →
// horizontal "bus" → vertical → top-center. In edit mode the horizontal bus
// can be dragged vertically; it snaps to other buses / node edges that line up
// and can be dragged back out of alignment. The offset is stored per edge
// (org_edges.bus_offset) as a delta from the default mid-gap position.

import { useState, useEffect, useRef } from 'react'
import { normalizeEdge } from './layout.js'

const SNAP = 6 // px tolerance for snapping the bus onto a matching line

function clientToSvgY(svg, clientX, clientY) {
  const pt = svg.createSVGPoint()
  pt.x = clientX
  pt.y = clientY
  return pt.matrixTransform(svg.getScreenCTM().inverse()).y
}

// Geometry for one edge. For down-edges with a horizontal segment we also
// return the bus coordinates so it can be drawn, dragged and snapped.
function geom(srcBox, tgtBox, direction, minBusY, busOffset) {
  if (direction === 'across') {
    const [a, b] = srcBox.x <= tgtBox.x ? [srcBox, tgtBox] : [tgtBox, srcBox]
    const x1 = a.x + a.width
    const y1 = a.y + a.height / 2
    const x2 = b.x
    return { d: `M ${x1} ${y1} L ${x2} ${y1}`, endX: x2, endY: y1, busY: null }
  }
  const sx = srcBox.x + srcBox.width / 2
  const y1 = srcBox.y + srcBox.height
  const tx = tgtBox.x + tgtBox.width / 2
  const y2 = tgtBox.y
  if (Math.abs(sx - tx) < 0.5) {
    return { d: `M ${sx} ${y1} L ${tx} ${y2}`, endX: tx, endY: y2, busY: null }
  }
  let baseMid = (y1 + y2) / 2
  if (Number.isFinite(minBusY) && minBusY > baseMid) baseMid = Math.min(minBusY, y2 - 6)
  let busY = baseMid + (busOffset || 0)
  busY = Math.min(Math.max(busY, y1 + 8), y2 - 8)
  return {
    d: pathFor(sx, tx, y1, y2, busY),
    endX: tx,
    endY: y2,
    busY,
    baseMid,
    sx,
    tx,
    y1,
    y2,
    busX1: Math.min(sx, tx),
    busX2: Math.max(sx, tx),
  }
}

function pathFor(sx, tx, y1, y2, busY) {
  return `M ${sx} ${y1} L ${sx} ${busY} L ${tx} ${busY} L ${tx} ${y2}`
}

export default function EdgeLayer({
  edges,
  nodes,
  laidOut,
  selectedEdgeId,
  onEdgeClick,
  editable = false,
  onEdgeBusChange,
}) {
  const byId = new Map(nodes.map(n => [n.id, n]))
  const [busDrag, setBusDrag] = useState(null) // { edgeId, busY }
  const dragRef = useRef(null)

  // Bottom edge of the assistant attached to each anchor — used to route the
  // senior→junior bus below the assistant band by default.
  const assistantBottomByAnchor = new Map()
  for (const n of nodes) {
    if (n.kind !== 'assistant' || !n.attached_to_node_id) continue
    const ab = laidOut.get(n.id)
    if (!ab) continue
    const cur = assistantBottomByAnchor.get(n.attached_to_node_id) || 0
    assistantBottomByAnchor.set(n.attached_to_node_id, Math.max(cur, ab.y + ab.height))
  }

  // Assistant connectors: short dashed line from each assistant to its anchor.
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

  // Precompute geometry for every edge.
  const items = edges
    .map(e => {
      const rawSrc = byId.get(e.source_id)
      const rawTgt = byId.get(e.target_id)
      if (!rawSrc || !rawTgt) return null
      const { src, tgt, direction } = normalizeEdge(rawSrc, rawTgt)
      const srcBox = laidOut.get(src.id)
      const tgtBox = laidOut.get(tgt.id)
      if (!srcBox || !tgtBox) return null
      const aBottom = assistantBottomByAnchor.get(src.id)
      const minBusY = aBottom != null ? aBottom + 10 : undefined
      const g = geom(srcBox, tgtBox, direction, minBusY, e.bus_offset || 0)
      return { e, g }
    })
    .filter(Boolean)

  // Snap targets: every other bus Y plus every node's top and bottom edge.
  function snapTargets(exceptEdgeId) {
    const ys = []
    for (const { e, g } of items) if (g.busY != null && e.id !== exceptEdgeId) ys.push(g.busY)
    for (const b of laidOut.values()) {
      ys.push(b.y)
      ys.push(b.y + b.height)
    }
    return ys
  }

  useEffect(() => {
    if (!busDrag) return
    const onMove = ev => {
      const d = dragRef.current
      if (!d) return
      const svgY = clientToSvgY(d.svg, ev.clientX, ev.clientY)
      let y = d.origBusY + (svgY - d.startSvgY)
      // Snap to the nearest matching line within tolerance.
      let best = null
      let bestDist = SNAP
      for (const ty of d.snapYs) {
        const dist = Math.abs(y - ty)
        if (dist <= bestDist) {
          bestDist = dist
          best = ty
        }
      }
      if (best != null) y = best
      y = Math.min(Math.max(y, d.y1 + 8), d.y2 - 8)
      d.busY = y
      setBusDrag(s => (s ? { ...s, busY: y } : s))
    }
    const onUp = () => {
      const d = dragRef.current
      if (d) {
        if (Math.abs(d.busY - d.origBusY) < 2) {
          // Barely moved → treat as a click and select the edge instead.
          onEdgeClick?.(d.edgeId)
        } else if (onEdgeBusChange) {
          onEdgeBusChange(d.edgeId, Math.round(d.busY - d.baseMid))
        }
      }
      dragRef.current = null
      setBusDrag(null)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [busDrag?.edgeId])

  function startBusDrag(ev, e, g) {
    const svg = ev.currentTarget.ownerSVGElement
    if (!svg) return
    ev.stopPropagation()
    ev.preventDefault()
    const startSvgY = clientToSvgY(svg, ev.clientX, ev.clientY)
    dragRef.current = {
      svg,
      edgeId: e.id,
      startSvgY,
      origBusY: g.busY,
      baseMid: g.baseMid,
      y1: g.y1,
      y2: g.y2,
      busY: g.busY,
      snapYs: snapTargets(e.id),
    }
    setBusDrag({ edgeId: e.id, busY: g.busY })
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
      {items.map(({ e, g }) => {
        const isSelected = e.id === selectedEdgeId
        const dragging = busDrag?.edgeId === e.id
        const busY = dragging ? busDrag.busY : g.busY
        const d = g.busY != null ? pathFor(g.sx, g.tx, g.y1, g.y2, busY) : g.d
        return (
          <g key={e.id}>
            <path
              d={d}
              stroke="transparent"
              strokeWidth={14}
              fill="none"
              onClick={() => onEdgeClick?.(e.id)}
              style={{ cursor: 'pointer' }}
            />
            <path
              d={d}
              stroke={dragging ? '#2563EB' : isSelected ? '#2563EB' : '#475569'}
              strokeWidth={isSelected || dragging ? 2.5 : 1.75}
              fill="none"
              markerEnd="url(#orgchart-arrowhead)"
              style={{ pointerEvents: 'none' }}
            />
            {/* Draggable handle over the horizontal bus (edit mode only). */}
            {editable && g.busY != null && (
              <line
                x1={g.busX1}
                x2={g.busX2}
                y1={busY}
                y2={busY}
                stroke="transparent"
                strokeWidth={12}
                style={{ cursor: 'ns-resize' }}
                onMouseDown={ev => startBusDrag(ev, e, g)}
              />
            )}
            {e.label && (
              <text
                x={g.endX}
                y={g.endY - 6}
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
