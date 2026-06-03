// SVG canvas that lays out tiers, renders nodes, and draws straight-arrow
// edges. Receives raw node + edge data + node-type lookups; everything
// is pure given those inputs.
//
// Click handling:
//   - clicking the canvas background clears selection
//   - clicking a node calls onNodeClick(id)
//   - clicking an edge calls onEdgeClick(id)
//
// Position resolution is delegated upstream: pass a Map of
// position_id → { displayName, positionTitle } via `positionHolders`.

import { layoutTiers } from './layout.js'
import EdgeLayer from './EdgeLayer.jsx'
import { CustomNode, PositionNode, ContainerNode } from './NodeRenderers.jsx'

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
  zoom = 1,
}) {
  const { laidOut, width, height } = layoutTiers(nodes)
  const typeById = new Map((nodeTypes || []).map(t => [t.id, t]))

  // Containers should render BEHIND everything else; sort them first.
  const ordered = [...nodes].sort((a, b) => {
    const ak = a.kind === 'container' ? 0 : 1
    const bk = b.kind === 'container' ? 0 : 1
    return ak - bk
  })

  // viewBox stays at the natural layout size; pixel width/height get
  // multiplied by zoom so the SVG renders larger or smaller. Parent's
  // overflow:auto provides pan/scroll when zoomed in past the viewport.
  const vw = Math.max(width, 800)
  const vh = Math.max(height, 400)

  return (
    <svg
      width={vw * zoom}
      height={vh * zoom}
      viewBox={`0 0 ${vw} ${vh}`}
      preserveAspectRatio="xMidYMin meet"
      style={{ background: '#F8FAFC', display: 'block' }}
      onClick={e => {
        if (e.target.tagName === 'svg') onBackgroundClick?.()
      }}
    >
      {/* Edges first, so nodes sit on top */}
      <EdgeLayer
        edges={edges}
        nodes={nodes}
        laidOut={laidOut}
        selectedEdgeId={selectedEdgeId}
        onEdgeClick={onEdgeClick}
      />
      {/* Nodes */}
      {ordered.map(n => {
        const box = laidOut.get(n.id)
        if (!box) return null
        const selected = n.id === selectedNodeId
        const onClick = e => {
          e.stopPropagation()
          onNodeClick?.(n.id)
        }
        if (n.kind === 'container') {
          return (
            <ContainerNode
              key={n.id}
              node={n}
              box={box}
              selected={selected}
              onClick={onClick}
            />
          )
        }
        if (n.kind === 'position') {
          const ph = positionHolders?.get(n.position_id) || {}
          return (
            <PositionNode
              key={n.id}
              node={n}
              box={box}
              color={typeById.get(n.type_id)?.color || '#3A5038'}
              selected={selected}
              onClick={onClick}
              positionTitle={ph.positionTitle}
              displayName={ph.displayName}
            />
          )
        }
        return (
          <CustomNode
            key={n.id}
            node={n}
            box={box}
            color={typeById.get(n.type_id)?.color || '#64748B'}
            selected={selected}
            onClick={onClick}
          />
        )
      })}
    </svg>
  )
}
