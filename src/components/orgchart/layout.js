// Tier-snap layout engine — pure functions, no React, no Supabase.
//
// Two flows compose:
//   1) TOP-LEVEL TIER LAYOUT
//      All nodes without parent_container_id stack vertically by tier
//      and flow left→right within each tier by tier_order.
//   2) CONTAINER COLUMN LAYOUT
//      Nodes whose parent_container_id matches an implicit container
//      become sub-items rendered as equal-width columns inside that
//      container. The container auto-grows to fit them.

export const TIER_GAP = 80
export const NODE_GAP = 32
export const CANVAS_PAD_X = 80
export const CANVAS_PAD_Y = 60

// Container internal layout constants
const CONTAINER_HEADER = 38     // headroom for heading + title
const CONTAINER_BOTTOM_PAD = 12
const CONTAINER_SIDE_PAD = 14
const CHILD_COL_GAP = 10
const MIN_CHILD_COL = 110       // each child column never narrower than this

/**
 * @param {RawNode[]} nodes
 * @returns {{ laidOut: Map<string, LaidOutNode>,
 *             tiers: { tier: number, y: number, h: number, nodes: RawNode[] }[],
 *             width: number, height: number }}
 */
export function layoutTiers(nodes) {
  // ── 1. Group sub-items by their container ────────────────────────────
  const childrenByContainer = new Map()
  for (const n of nodes) {
    if (!n.parent_container_id) continue
    if (!childrenByContainer.has(n.parent_container_id)) {
      childrenByContainer.set(n.parent_container_id, [])
    }
    childrenByContainer.get(n.parent_container_id).push(n)
  }
  for (const arr of childrenByContainer.values()) {
    arr.sort((a, b) => {
      const ao = Number.isInteger(a.tier_order) ? a.tier_order : 0
      const bo = Number.isInteger(b.tier_order) ? b.tier_order : 0
      if (ao !== bo) return ao - bo
      return String(a.id).localeCompare(String(b.id))
    })
  }

  // ── 2. Pre-size containers based on their children ───────────────────
  // We mutate copies, not the originals. Implicit containers with
  // children grow to fit the children as columns.
  const adjusted = nodes.map(n => {
    if (n.parent_container_id) return n // sub-items get sized later
    if (n.kind !== 'container') return n
    const kids = childrenByContainer.get(n.id) || []
    if (kids.length === 0) return n
    const childCount = kids.length
    const childMaxH = kids.reduce((m, c) => Math.max(m, c.height || 40), 40)
    const innerW = childCount * MIN_CHILD_COL + (childCount - 1) * CHILD_COL_GAP
    const fitW = innerW + CONTAINER_SIDE_PAD * 2
    const fitH = CONTAINER_HEADER + childMaxH + CONTAINER_BOTTOM_PAD
    return {
      ...n,
      width: Math.max(n.width || 180, fitW),
      height: Math.max(n.height || 90, fitH),
    }
  })

  // ── 3. Top-level tier layout (skip sub-items + assistants) ───────────
  const topLevel = adjusted.filter(
    n => !n.parent_container_id && n.kind !== 'assistant',
  )
  const byTier = new Map()
  for (const n of topLevel) {
    const t = Number.isInteger(n.tier) ? n.tier : 0
    if (!byTier.has(t)) byTier.set(t, [])
    byTier.get(t).push(n)
  }
  for (const arr of byTier.values()) {
    arr.sort((a, b) => {
      const ao = Number.isInteger(a.tier_order) ? a.tier_order : 0
      const bo = Number.isInteger(b.tier_order) ? b.tier_order : 0
      if (ao !== bo) return ao - bo
      return String(a.id).localeCompare(String(b.id))
    })
  }

  const tierKeys = [...byTier.keys()].sort((a, b) => a - b)
  const laidOut = new Map()
  const tiers = []
  let cursorY = CANVAS_PAD_Y
  let maxWidth = 0

  // Tiers that have an assistant attached to one of their nodes get a
  // DOUBLED gap below them, so the assistant gets its own level (band)
  // between tiers — sitting beside the connector lines rather than on
  // top of them. The junior connector lines lengthen to span the bigger
  // gap automatically (their tier is pushed further down).
  const assistantAnchorIds = new Set(
    nodes
      .filter(n => n.kind === 'assistant' && n.attached_to_node_id)
      .map(n => n.attached_to_node_id),
  )
  const gapByTier = new Map()
  for (const t of tierKeys) {
    const hasAssistant = byTier.get(t).some(node => assistantAnchorIds.has(node.id))
    gapByTier.set(t, hasAssistant ? TIER_GAP * 2 : TIER_GAP)
  }

  for (const t of tierKeys) {
    const tierNodes = byTier.get(t)
    const tierH = tierNodes.reduce((max, n) => Math.max(max, n.height || 64), 0)
    let cursorX = CANVAS_PAD_X
    for (const n of tierNodes) {
      const w = n.width || 180
      const xOff = Number.isFinite(n.x_offset) ? n.x_offset : 0
      laidOut.set(n.id, {
        id: n.id,
        x: cursorX + xOff,
        y: cursorY,
        width: w,
        height: tierH,
      })
      cursorX += w + NODE_GAP
    }
    const tierWidth = cursorX - NODE_GAP
    maxWidth = Math.max(maxWidth, tierWidth)
    tiers.push({ tier: t, y: cursorY, h: tierH, nodes: tierNodes })
    cursorY += tierH + (gapByTier.get(t) ?? TIER_GAP)
  }

  // ── 4. Lay out sub-items inside each container ───────────────────────
  // Children stretch to fill their container's inner width equally.
  for (const [containerId, kids] of childrenByContainer.entries()) {
    const cBox = laidOut.get(containerId)
    if (!cBox) continue
    const n = kids.length
    const innerW = cBox.width - CONTAINER_SIDE_PAD * 2
    const colW = (innerW - (n - 1) * CHILD_COL_GAP) / n
    const childMaxH = kids.reduce((m, c) => Math.max(m, c.height || 40), 40)
    const colTop = cBox.y + CONTAINER_HEADER
    for (let i = 0; i < n; i++) {
      const child = kids[i]
      laidOut.set(child.id, {
        id: child.id,
        x: cBox.x + CONTAINER_SIDE_PAD + i * (colW + CHILD_COL_GAP),
        y: colTop,
        width: colW,
        height: childMaxH,
      })
    }
  }

  // ── 5. Lay out assistants beside their anchor's down-edge ───────────
  // An assistant sits to the left or right of the vertical line that
  // drops from its anchor (the senior item) at the midpoint of the
  // inter-tier gap. EdgeLayer draws the short horizontal connector.
  const ASSIST_GAP = 30
  for (const n of nodes) {
    if (n.kind !== 'assistant') continue
    if (!n.attached_to_node_id) continue
    const anchor = laidOut.get(n.attached_to_node_id)
    if (!anchor) continue
    const w = n.width || 110
    const h = n.height || 40
    const side = n.attachment_side || 'right'
    // Vertical midpoint of the gap below the anchor's tier. When the
    // anchor's tier carries an assistant that gap is doubled, so the
    // assistant lands on its own level, clear of the connector lines.
    const anchorNode = nodes.find(x => x.id === n.attached_to_node_id)
    const anchorTier = Number.isInteger(anchorNode?.tier) ? anchorNode.tier : 0
    const anchorGap = gapByTier.get(anchorTier) ?? TIER_GAP
    const yMid = anchor.y + anchor.height + anchorGap / 2
    const x =
      side === 'left'
        ? anchor.x - ASSIST_GAP - w
        : anchor.x + anchor.width + ASSIST_GAP
    const xOff = Number.isFinite(n.x_offset) ? n.x_offset : 0
    laidOut.set(n.id, {
      id: n.id,
      x: x + xOff,
      y: yMid - h / 2,
      width: w,
      height: h,
    })
  }

  // Canvas extent = the furthest right/bottom edge of any laid-out item,
  // including x_offset (items dragged right) and assistants that stick out
  // past the natural tier width. This way the working area grows to fit
  // anything moved off to the right or bottom, and — because those
  // positions are saved — it stays grown after a reload. The parent
  // scroll container then shows scroll bars whenever this exceeds the
  // viewport at the current zoom.
  let contentRight = 0
  let contentBottom = 0
  for (const box of laidOut.values()) {
    contentRight = Math.max(contentRight, box.x + box.width)
    contentBottom = Math.max(contentBottom, box.y + box.height)
  }

  return {
    laidOut,
    tiers,
    width: Math.max(maxWidth, contentRight) + CANVAS_PAD_X,
    height: contentBottom + CANVAS_PAD_Y,
  }
}

export function normalizeEdge(src, tgt) {
  const st = Number.isInteger(src.tier) ? src.tier : 0
  const tt = Number.isInteger(tgt.tier) ? tgt.tier : 0
  if (st === tt) return { src, tgt, direction: 'across' }
  if (st < tt) return { src, tgt, direction: 'down' }
  return { src: tgt, tgt: src, direction: 'down' }
}

export function edgeAnchors(srcLayout, tgtLayout, direction) {
  if (direction === 'down') {
    return {
      x1: srcLayout.x + srcLayout.width / 2,
      y1: srcLayout.y + srcLayout.height,
      x2: tgtLayout.x + tgtLayout.width / 2,
      y2: tgtLayout.y,
    }
  }
  const [a, b] = srcLayout.x <= tgtLayout.x ? [srcLayout, tgtLayout] : [tgtLayout, srcLayout]
  return {
    x1: a.x + a.width,
    y1: a.y + a.height / 2,
    x2: b.x,
    y2: b.y + b.height / 2,
  }
}
