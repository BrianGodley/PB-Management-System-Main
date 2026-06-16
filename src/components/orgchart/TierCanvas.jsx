// SVG canvas — tier-snap layout, three node kinds, orthogonal edges,
// drag-and-drop, edit-mode lock.
//
// In view mode (editable=false):
//   • nodes are not draggable; mousedown does nothing special
//   • clicks still register selection but no menu/action is triggered
//   • cursor stays as default
//
// In edit mode (editable=true):
//   • full drag + click selection + onNodeClick(nodeId, screenRect)
//     where screenRect is the node's bounding rect in viewport pixels
//     so the parent can position a contextual menu next to it

import { useEffect, useRef, useState } from 'react'
import { layoutTiers, CANVAS_PAD_X, NODE_GAP } from './layout.js'
import EdgeLayer from './EdgeLayer.jsx'
import { CustomNode, PositionNode, ContainerNode } from './NodeRenderers.jsx'

const DRAG_THRESHOLD = 4

export default function TierCanvas({
  nodes,
  edges,
  nodeTypes,
  resolveNodeHolder,
  selectedNodeId,
  selectedEdgeId,
  onNodeClick,
  onNodeEditIconClick,
  onNodeDoubleClick,
  onEdgeClick,
  onBackgroundClick,
  onNodeDropped,
  onEdgeBusChange,
  rowSpacing = {},
  colSpacing = {},
  redNodeIds = [],
  zoom = 1,
  editable = true,
}) {
  const svgRef = useRef(null)
  const wrapRef = useRef(null)
  const [drag, setDrag] = useState(null)
  const [containerSize, setContainerSize] = useState({ w: 0, h: 0 })

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

  const { laidOut, tiers, width, height } = layoutTiers(nodes, rowSpacing, colSpacing)
  const typeById = new Map((nodeTypes || []).map(t => [t.id, t]))

  const minW = containerSize.w ? containerSize.w / zoom : 800
  const minH = containerSize.h ? containerSize.h / zoom : 400
  const vw = Math.max(width, minW)
  const vh = Math.max(height, minH)
  // Small hardcoded left margin so the leftmost item never sits flush against
  // the edge. (The right margin already varies with content width; the left
  // start can otherwise go to 0 once an item is dragged left.)
  const LEFT_MARGIN = 14

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

  function nodeScreenRect(nodeId) {
    const svg = svgRef.current
    const box = laidOut.get(nodeId)
    if (!svg || !box) return null
    const ctm = svg.getScreenCTM()
    if (!ctm) return null
    const tl = svg.createSVGPoint()
    tl.x = box.x
    tl.y = box.y
    const br = svg.createSVGPoint()
    br.x = box.x + box.width
    br.y = box.y + box.height
    const a = tl.matrixTransform(ctm)
    const b = br.matrixTransform(ctm)
    return { left: a.x, top: a.y, right: b.x, bottom: b.y, width: b.x - a.x, height: b.y - a.y }
  }

  // Edit affordance: in edit mode, a small pencil button sits in each node's
  // lower-right corner. Clicking it opens the item's edit menu (instead of the
  // info modal that a plain click on the body shows). stopPropagation keeps it
  // from starting a drag or triggering the body click.
  function renderEditIcon(box, nodeId) {
    if (!editable || !onNodeEditIconClick) return null
    const ix = box.x + box.width - 17
    const iy = box.y + box.height - 17
    return (
      <g
        style={{ cursor: 'pointer' }}
        onMouseDown={e => {
          e.stopPropagation()
          e.preventDefault()
          onNodeEditIconClick(nodeId, nodeScreenRect(nodeId))
        }}
        onClick={e => e.stopPropagation()}
      >
        <rect x={ix} y={iy} width={15} height={15} rx={4} fill="#ffffff" stroke="#94a3b8" strokeWidth={1} />
        <text x={ix + 7.5} y={iy + 11} textAnchor="middle" fontSize="10" fill="#475569" pointerEvents="none">
          ✎
        </text>
      </g>
    )
  }

  function handleNodeMouseDown(e, nodeId) {
    if (e.button !== 0) return
    if (!editable) {
      // In view mode, treat click directly as selection, no drag tracking.
      onNodeClick?.(nodeId, nodeScreenRect(nodeId))
      e.stopPropagation()
      return
    }
    const { x, y } = toSvgCoords(e.clientX, e.clientY)
    setDrag({ nodeId, startX: x, startY: y, dx: 0, dy: 0, dragging: false })
    e.stopPropagation()
    e.preventDefault()
  }

  function handleSvgMouseMove(e) {
    if (!editable || !drag) return
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
    if (yCenter < tiers[0].y) return tiers[0].tier - 1
    return tiers[tiers.length - 1].tier + 1
  }

  // Only true row-mates count as siblings — exclude attached junior areas
  // (sub-items) and assistants, which share a tier but aren't in the row.
  const isRowMate = n => !n.parent_container_id && n.kind !== 'assistant'

  function findDropSlot(targetTier, xCenter, draggedId) {
    const siblingBoxes = nodes
      .filter(n => n.id !== draggedId && isRowMate(n) && (n.tier ?? 0) === targetTier)
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

  function naturalXForSlot(tier, tierOrder, draggedId) {
    const sibs = nodes
      .filter(n => n.id !== draggedId && isRowMate(n) && (n.tier ?? 0) === tier)
      .sort((a, b) => (a.tier_order ?? 0) - (b.tier_order ?? 0))
    let x = CANVAS_PAD_X
    for (let i = 0; i < tierOrder && i < sibs.length; i++) {
      x += (sibs[i].width || 110) + NODE_GAP
    }
    return x
  }

  function handleSvgMouseUp() {
    if (!editable || !drag) return
    if (!drag.dragging) {
      onNodeClick?.(drag.nodeId, nodeScreenRect(drag.nodeId))
      setDrag(null)
      return
    }
    const node = nodes.find(n => n.id === drag.nodeId)
    const box = laidOut.get(drag.nodeId)
    if (node && box && onNodeDropped) {
      const MIN_LEFT = 4 // never let an item's left edge cross the margin
      if (node.kind === 'assistant') {
        // Assistants aren't part of a tier row — their position is
        // anchor-relative. Dragging only nudges their horizontal offset.
        const base = box.x - (node.x_offset || 0)
        let newXOffset = Math.round((node.x_offset || 0) + drag.dx)
        if (base + newXOffset < MIN_LEFT) newXOffset = Math.round(MIN_LEFT - base)
        onNodeDropped(drag.nodeId, node.tier ?? 0, 0, newXOffset)
      } else {
        // Items are locked to their level: dragging only changes left/right
        // order within the same tier, never the tier itself. Clamp so the
        // item can't be dropped off the left edge (where it can't be reached).
        const dropLeftX = Math.max(MIN_LEFT, box.x + drag.dx)
        const newTier = node.tier ?? 0
        const dropCenterX = dropLeftX + box.width / 2
        const newTierOrder = findDropSlot(newTier, dropCenterX, drag.nodeId)
        const natural = naturalXForSlot(newTier, newTierOrder, drag.nodeId)
        const newXOffset = Math.round(dropLeftX - natural)
        onNodeDropped(drag.nodeId, newTier, newTierOrder, newXOffset)
      }
    }
    setDrag(null)
  }

  const laidOutForRender =
    drag && drag.dragging
      ? (() => {
          const cloned = new Map(laidOut)
          const original = laidOut.get(drag.nodeId)
          if (original) {
            cloned.set(drag.nodeId, {
              ...original,
              x: original.x + drag.dx,
              // Y is locked — items move left/right only, never up/down.
              y: original.y,
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
        width={(vw + LEFT_MARGIN) * zoom}
        height={vh * zoom}
        viewBox={`${-LEFT_MARGIN} 0 ${vw + LEFT_MARGIN} ${vh}`}
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
          editable={editable}
          onEdgeBusChange={onEdgeBusChange}
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
          const wrapStyle = {
            cursor: editable ? 'grab' : 'pointer',
            opacity: isDragging ? 0.85 : 1,
          }
          if (n.kind === 'container') {
            const ph = resolveNodeHolder ? resolveNodeHolder(n) : null
            const resolveCp = x => {
              const xh = (resolveNodeHolder ? resolveNodeHolder(x) : null) || {}
              return { title: xh.positionTitle || x.label || '', name: xh.displayName || '' }
            }
            const contained = nodes
              .filter(x => x.parent_container_id === n.id && x.kind === 'position' && !x.senior_node_id)
              .map(m => ({
                ...resolveCp(m),
                juniors: nodes.filter(x => x.senior_node_id === m.id).map(resolveCp),
              }))
            return (
              <g key={n.id} data-node-id={n.id} style={wrapStyle} onMouseDown={onMouseDown} onDoubleClick={() => editable && onNodeDoubleClick && onNodeDoubleClick(n.id)}>
                <ContainerNode
                  node={n}
                  box={box}
                  selected={selected}
                  onClick={onClick}
                  positionTitle={ph?.positionTitle}
                  displayName={ph?.displayName}
                  containedPositions={contained}
                />
                {renderEditIcon(box, n.id)}
              </g>
            )
          }
          if (n.kind === 'position') {
            const ph = (resolveNodeHolder ? resolveNodeHolder(n) : null) || {}
            return (
              <g key={n.id} data-node-id={n.id} style={wrapStyle} onMouseDown={onMouseDown} onDoubleClick={() => editable && onNodeDoubleClick && onNodeDoubleClick(n.id)}>
                <PositionNode
                  node={n}
                  box={box}
                  color={typeById.get(n.type_id)?.color || '#3A5038'}
                  selected={selected}
                  onClick={onClick}
                  positionTitle={ph.positionTitle}
                  displayName={ph.displayName}
                />
                {renderEditIcon(box, n.id)}
              </g>
            )
          }
          return (
            <g key={n.id} data-node-id={n.id} style={wrapStyle} onMouseDown={onMouseDown} onDoubleClick={() => editable && onNodeDoubleClick && onNodeDoubleClick(n.id)}>
              <CustomNode
                node={n}
                box={box}
                color={typeById.get(n.type_id)?.color || '#64748B'}
                selected={selected}
                onClick={onClick}
              />
              {renderEditIcon(box, n.id)}
            </g>
          )
        })}
        {/* Red highlight overlay for change-mode source/target items. */}
        {(redNodeIds || []).map(id => {
          const b = laidOut.get(id)
          if (!b) return null
          return (
            <rect
              key={`red-${id}`}
              x={b.x - 3}
              y={b.y - 3}
              width={b.width + 6}
              height={b.height + 6}
              rx={10}
              fill="none"
              stroke="#dc2626"
              strokeWidth={2.5}
              strokeDasharray="6 4"
              pointerEvents="none"
            />
          )
        })}
      </svg>
    </div>
  )
}
