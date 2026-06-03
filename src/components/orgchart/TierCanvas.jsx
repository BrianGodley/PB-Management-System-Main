// SVG canvas that lays out tiers, renders nodes, draws orthogonal edges,
// and supports drag-and-drop to move a node between tiers and reorder
// within a tier.
//
// Drag UX:
//   • mouse-down on a node → start tracking (not yet a drag)
//   • move > 4px → becomes a drag; ghost the node at the mouse position
//   • mouse-up:
//       - no drag yet → fire onNodeClick (selection)
//       - drag complete → compute drop tier (from Y) + drop slot
//                         (from X relative to siblings), call
//                         onNodeDropped(nodeId, newTier, newTierOrder)
//
// All coord math runs in SVG user-space via getScreenCTM().inverse().

import { useEffect, useRef, useState } from 'react'
import { layoutTiers, CANVAS_PAD_X, NODE_GAP } from './layout.js'
import EdgeLayer from './EdgeLayer.jsx'
import { CustomNode, PositionNode, ContainerNode } from './NodeRenderers.jsx'

const DRAG_THRESHOLD = 4

export default function TierCanvas({
  nodes,
  edges,
  nodeTypes,
  positionHolders,
  selectedNodeId,
  selectedEdgeId,
  onNodeClick,
  onEdgeClick,
  onBackgroundClick,
  onNodeDropped,
  zoom = 1,
}) {
  const svgRef = useRef(null)
  const wrapRef = useRef(null)
  const [drag, setDrag] = useState(null)
  // drag = { nodeId, startX, startY, dx, dy, dragging }
  const [containerSize, setContainerSize] = useState({ w: 0, h: 0 })

  // Watch the parent container so the SVG can always extend to its
  // outer right/bottom edges — that way dragging a node toward the
  // viewport border doesn't run out of canvas.
  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const ro = new ResizeObserver(entries => {
      for (const entry of entries) {
        const cr = entry.contentRect
        setContainerSize({ w: cr.width, h: cr.height })
      }
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const { laidOut, tiers, width, height } = layoutTiers(nodes)
  const typeById = new Map((nodeTypes || []).map(t => [t.id, t]))

  // Coordinate space (viewBox) covers the larger of the layout size or
  // the container size scaled by the inverse of zoom (so at zoom=1 the
  // canvas always reaches the right/bottom of its container).
  const minW = containerSize.w ? containerSize.w / zoom : 800
  const minH = containerSize.h ? containerSize.h / zoom : 400
  const vw = Math.max(width, minW)
  const vh = Math.max(height, minH)

  function toSvgCoords(clientX, clientY) {
    const svg = svgRef.current
    if (!svg) return { x: 0, y: 0 }
    const pt = svg.createSVGPoint()
    pt.x = clientX
    pt.y = clientY
    const m = svg.getScreenCTM()
    if (!m) return { x: 0, y: 0 }
    return pt.matrixTransform(m.inverse())
  }

  function handleNodeMouseDown(e, nodeId) {
    if (e.button !== 0) return
    const { x, y } = toSvgCoords(e.clientX, e.clientY)
    setDrag({ nodeId, startX: x, startY: y, dx: 0, dy: 0, dragging: false })
    e.stopPropagation()
    e.preventDefault()
  }

  function handleSvgMouseMove(e) {
    if (!drag) return
    const { x, y } = toSvgCoords(e.clientX, e.clientY)
    const dx = x - drag.startX
    const dy = y - drag.startY
    const dragging = drag.dragging || Math.hypot(dx, dy) > DRAG_THRESHOLD
    setDrag({ ...drag, dx, dy, dragging })
  }

  function findDropTier(yCenter) {
    if (!tiers.length) return 0
    for (const t of tiers) {
      if (yCenter >= t.y && yCenter <= t.y + t.h) return t.tier
    }
    // Above the topmost tier → become a new senior tier
    if (yCenter < tiers[0].y) return tiers[0].tier - 1
    // Below the bottom tier
    return tiers[tiers.length - 1].tier + 1
  }

  function findDropSlot(targetTier, xCenter, draggedId) {
    const siblingBoxes = nodes
      .filter(n => n.id !== draggedId && (n.tier ?? 0) === targetTier)
      .map(n => laidOut.get(n.id))
      .filter(Boolean)
      .sort((a, b) => a.x - b.x)
    let slot = 0
    for (const s of siblingBoxes) {
      if (xCenter > s.x + s.width / 2) slot++
      else break
    }
    return slot
  }

  // Natural X (no x_offset) the dragged node would have if it lived at
  // slot `tierOrder` in `tier` once everyone else's tier_order is
  // renumbered around it. Used to convert drop pixel position into a
  // persistent x_offset.
  function naturalXForSlot(tier, tierOrder, draggedId) {
    const sibs = nodes
      .filter(n => n.id !== draggedId && (n.tier ?? 0) === tier)
      .sort((a, b) => (a.tier_order ?? 0) - (b.tier_order ?? 0))
    let x = CANVAS_PAD_X
    for (let i = 0; i < tierOrder && i < sibs.length; i++) {
      x += (sibs[i].width || 110) + NODE_GAP
    }
    return x
  }

  function handleSvgMouseUp() {
    if (!drag) return
    if (!drag.dragging) {
      onNodeClick?.(drag.nodeId)
      setDrag(null)
      return
    }
    const node = nodes.find(n => n.id === drag.nodeId)
    const box = laidOut.get(drag.nodeId)
    if (node && box && onNodeDropped) {
      // Drop position of the node's TOP-LEFT corner (so x_offset math
      // is a straight subtraction with the natural slot start).
      const dropLeftX = box.x + drag.dx
      const dropCenterY = box.y + drag.dy + box.height / 2
      const newTier = findDropTier(dropCenterY)
      const dropCenterX = dropLeftX + box.width / 2
      const newTierOrder = findDropSlot(newTier, dropCenterX, drag.nodeId)
      const natural = naturalXForSlot(newTier, newTierOrder, drag.nodeId)
      const newXOffset = Math.round(dropLeftX - natural)
      onNodeDropped(drag.nodeId, newTier, newTierOrder, newXOffset)
    }
    setDrag(null)
  }

  // For rendering, splice the dragged node's MOVED position into laidOut
  // so the EdgeLayer sees up-to-date endpoints and arrows follow live.
  const laidOutForRender =
    drag && drag.dragging
      ? (() => {
          const cloned = new Map(laidOut)
          const original = laidOut.get(drag.nodeId)
          if (original) {
            cloned.set(drag.nodeId, {
              ...original,
              x: original.x + drag.dx,
              y: original.y + drag.dy,
            })
          }
          return cloned
        })()
      : laidOut

  const ordered = [...nodes].sort((a, b) => {
    const ak = a.kind === 'container' ? 0 : 1
    const bk = b.kind === 'container' ? 0 : 1
    return ak - bk
  })

  return (
    <div ref={wrapRef} style={{ width: '100%', height: '100%' }}>
      <svg
        ref={svgRef}
        width={vw * zoom}
        height={vh * zoom}
        viewBox={`0 0 ${vw} ${vh}`}
      preserveAspectRatio="xMidYMin meet"
      style={{ background: '#F8FAFC', display: 'block', userSelect: 'none' }}
      onMouseMove={handleSvgMouseMove}
      onMouseUp={handleSvgMouseUp}
      onMouseLeave={() => setDrag(null)}
      onClick={e => {
        if (e.target.tagName === 'svg') onBackgroundClick?.()
      }}
    >
      <EdgeLayer
        edges={edges}
        nodes={nodes}
        laidOut={laidOutForRender}
        selectedEdgeId={selectedEdgeId}
        onEdgeClick={onEdgeClick}
      />
      {ordered.map(n => {
        let box = laidOut.get(n.id)
        if (!box) return null
        const isDragging = drag && drag.dragging && drag.nodeId === n.id
        if (isDragging) {
          box = { ...box, x: box.x + drag.dx, y: box.y + drag.dy }
        }
        const selected = n.id === selectedNodeId
        const onMouseDown = e => handleNodeMouseDown(e, n.id)
        const onClick = e => e.stopPropagation()
        const wrapStyle = { cursor: 'grab', opacity: isDragging ? 0.85 : 1 }
        if (n.kind === 'container') {
          return (
            <g key={n.id} style={wrapStyle} onMouseDown={onMouseDown}>
              <ContainerNode node={n} box={box} selected={selected} onClick={onClick} />
            </g>
          )
        }
        if (n.kind === 'position') {
          const ph = positionHolders?.get(n.position_id) || {}
          return (
            <g key={n.id} style={wrapStyle} onMouseDown={onMouseDown}>
              <PositionNode
                node={n}
                box={box}
                color={typeById.get(n.type_id)?.color || '#3A5038'}
                selected={selected}
                onClick={onClick}
                positionTitle={ph.positionTitle}
                displayName={ph.displayName}
              />
            </g>
          )
        }
        return (
          <g key={n.id} style={wrapStyle} onMouseDown={onMouseDown}>
            <CustomNode
              node={n}
              box={box}
              color={typeById.get(n.type_id)?.color || '#64748B'}
              selected={selected}
              onClick={onClick}
            />
          </g>
        )
      })}
      </svg>
    </div>
  )
}
