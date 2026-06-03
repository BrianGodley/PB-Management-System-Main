// Tier-snap layout engine — pure functions, no React, no Supabase.
// Given a list of node records (with tier + tier_order + width + height),
// returns the rendered x/y/h for each one so the canvas can draw them.
//
// Rules:
//   • Tiers stack vertically with a fixed gap.
//   • Inside a tier, nodes flow left-to-right by tier_order.
//   • Every node in a tier renders at the MAX height of that tier so
//     siblings stay horizontally justified.
//   • A tier's vertical Y is the cumulative height of every tier above
//     it plus the inter-tier gaps.

export const TIER_GAP = 80     // px between tier rows
export const NODE_GAP = 32     // px between siblings in a tier
export const CANVAS_PAD_X = 80 // left padding before tier 0
export const CANVAS_PAD_Y = 60 // top padding before tier 0

/**
 * @typedef {Object} RawNode
 * @property {string} id
 * @property {number} tier
 * @property {number} tier_order
 * @property {number} width
 * @property {number} height
 * @property {string} [kind]      // 'custom' | 'position' | 'container'
 */

/**
 * @typedef {Object} LaidOutNode
 * @property {string} id
 * @property {number} x
 * @property {number} y
 * @property {number} width
 * @property {number} height      // unified height for the tier
 */

/**
 * @param {RawNode[]} nodes
 * @returns {{ laidOut: Map<string, LaidOutNode>, tiers: { tier: number, y: number, h: number, nodes: RawNode[] }[], width: number, height: number }}
 */
export function layoutTiers(nodes) {
  // Group by tier
  const byTier = new Map()
  for (const n of nodes) {
    const t = Number.isInteger(n.tier) ? n.tier : 0
    if (!byTier.has(t)) byTier.set(t, [])
    byTier.get(t).push(n)
  }

  // Sort each tier by tier_order, then by id for stable ordering
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
      laidOut.set(n.id, {
        id: n.id,
        x: cursorX,
        y: cursorY,
        width: w,
        height: tierH,
      })
      cursorX += w + NODE_GAP
    }
    const tierWidth = cursorX - NODE_GAP // last NODE_GAP wasn't really added
    maxWidth = Math.max(maxWidth, tierWidth)
    tiers.push({ tier: t, y: cursorY, h: tierH, nodes: tierNodes })
    cursorY += tierH + TIER_GAP
  }

  return {
    laidOut,
    tiers,
    width: maxWidth + CANVAS_PAD_X,
    height: cursorY,
  }
}

/**
 * Validate + normalize an edge. Per the user's rule, arrows only go down
 * (parent → child) or across (sibling → sibling). If src is below tgt
 * we silently flip them.
 *
 * @param {RawNode} src
 * @param {RawNode} tgt
 * @returns {{ src: RawNode, tgt: RawNode, direction: 'down' | 'across' | 'invalid' }}
 */
export function normalizeEdge(src, tgt) {
  const st = Number.isInteger(src.tier) ? src.tier : 0
  const tt = Number.isInteger(tgt.tier) ? tgt.tier : 0
  if (st === tt) return { src, tgt, direction: 'across' }
  if (st < tt) return { src, tgt, direction: 'down' }
  return { src: tgt, tgt: src, direction: 'down' } // flipped
}

/**
 * Anchor points where an edge enters / exits a laid-out node.
 *
 * down  → bottom-center of src,  top-center of tgt
 * across→ right-edge   of src,  left-edge   of tgt   (after src/tgt are
 *         sorted so src is the leftward one)
 */
export function edgeAnchors(srcLayout, tgtLayout, direction) {
  if (direction === 'down') {
    return {
      x1: srcLayout.x + srcLayout.width / 2,
      y1: srcLayout.y + srcLayout.height,
      x2: tgtLayout.x + tgtLayout.width / 2,
      y2: tgtLayout.y,
    }
  }
  // across — order by x so the arrow always points left → right
  const [a, b] = srcLayout.x <= tgtLayout.x ? [srcLayout, tgtLayout] : [tgtLayout, srcLayout]
  return {
    x1: a.x + a.width,
    y1: a.y + a.height / 2,
    x2: b.x,
    y2: b.y + b.height / 2,
  }
}
