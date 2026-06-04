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

  // ── 3. Top-level tier layout (skip sub-items) ────────────────────────
  const topLevel = adjusted.filter(n => !n.parent_container_id)
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
    cursorY += tierH + TIER_GAP
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

  return {
    laidOut,
    tiers,
    width: maxWidth + CANVAS_PAD_X,
    height: cursorY,
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
