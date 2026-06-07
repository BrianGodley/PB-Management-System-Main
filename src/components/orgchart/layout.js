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
export function layoutTiers(nodes, rowSpacing = {}, colSpacing = {}) {
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

  // ── 2. Containers keep their own size ────────────────────────────────
  // Junior ("attached") areas now render as a row of columns directly
  // BELOW the container (butted against its bottom edge), so the container
  // is no longer grown to enclose them.
  const adjusted = nodes

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
  // The 'top' override is the gap from the canvas top down to Row 1.
  let cursorY = Number.isFinite(rowSpacing?.top) ? rowSpacing.top : CANVAS_PAD_Y
  let maxWidth = 0

  // A tier that anchors an assistant gets its own ASSISTANT BAND between it
  // and the next row. The gap below such a tier is split into three parts:
  //   senior → assistant   (rowSpacing[`${t}_a`], default TIER_GAP/2)
  //   the assistant band   (tallest assistant on that tier)
  //   assistant → next row (rowSpacing[`${t}_b`], default TIER_GAP/2)
  // Plain rows just use rowSpacing[t] (or the default TIER_GAP).
  const assistantBandHByTier = new Map() // tier -> tallest assistant height
  for (const n of nodes) {
    if (n.kind !== 'assistant' || !n.attached_to_node_id) continue
    const anchorNode = nodes.find(x => x.id === n.attached_to_node_id)
    const at = Number.isInteger(anchorNode?.tier) ? anchorNode.tier : 0
    assistantBandHByTier.set(at, Math.max(assistantBandHByTier.get(at) || 0, n.height || 40))
  }
  const HALF = TIER_GAP / 2
  const gapByTier = new Map()
  const gapAboveByTier = new Map() // senior → assistant gap, for assistant tiers
  for (const t of tierKeys) {
    if (assistantBandHByTier.has(t)) {
      const above = Number.isFinite(rowSpacing?.[`${t}_a`]) ? rowSpacing[`${t}_a`] : HALF
      const below = Number.isFinite(rowSpacing?.[`${t}_b`]) ? rowSpacing[`${t}_b`] : HALF
      gapAboveByTier.set(t, above)
      gapByTier.set(t, above + assistantBandHByTier.get(t) + below)
    } else {
      const override = rowSpacing?.[t]
      gapByTier.set(t, Number.isFinite(override) ? override : TIER_GAP)
    }
  }

  // Reserve room for any junior-area column band that renders below a
  // container, so the next row clears it.
  for (const [containerId, kids] of childrenByContainer.entries()) {
    const container = nodes.find(x => x.id === containerId)
    if (!container) continue
    const ct = Number.isInteger(container.tier) ? container.tier : 0
    if (!gapByTier.has(ct)) continue
    const childMaxH = kids.reduce((m, c) => Math.max(m, c.height || 40), 40)
    gapByTier.set(ct, gapByTier.get(ct) + childMaxH + CHILD_COL_GAP)
  }

  for (const t of tierKeys) {
    const tierNodes = byTier.get(t)
    const tierH = tierNodes.reduce((max, n) => Math.max(max, n.height || 64), 0)
    // Column spacing config per row: { gap, auto } (a bare number = auto).
    // Auto rows continuously space items left→right by `gap`, anchored on the
    // leftmost item (which keeps its own x_offset so it can be dragged). The
    // rest follow and ignore their own x_offset. Non-auto rows are manual.
    const cfg = colSpacing?.[t]
    const gapVal = typeof cfg === 'number' ? cfg : cfg?.gap
    const auto = Number.isFinite(gapVal) && (typeof cfg === 'number' ? true : !!cfg?.auto)
    const colGap = auto ? gapVal : NODE_GAP
    let cursorX = CANVAS_PAD_X
    tierNodes.forEach((n, i) => {
      const w = n.width || 180
      const off = Number.isFinite(n.x_offset) ? n.x_offset : 0
      let x
      if (auto) {
        if (i === 0) cursorX += off // leftmost item keeps its position
        x = cursorX
      } else {
        x = cursorX + off
      }
      laidOut.set(n.id, { id: n.id, x, y: cursorY, width: w, height: tierH })
      cursorX += w + colGap
    })
    const tierWidth = cursorX - NODE_GAP
    maxWidth = Math.max(maxWidth, tierWidth)
    tiers.push({ tier: t, y: cursorY, h: tierH, nodes: tierNodes })
    cursorY += tierH + (gapByTier.get(t) ?? TIER_GAP)
  }

  // ── 4. Lay out junior areas as columns BELOW their container ─────────
  // They butt directly against the container's bottom edge and split the
  // container's full width equally (skinnier as more are added).
  for (const [containerId, kids] of childrenByContainer.entries()) {
    const cBox = laidOut.get(containerId)
    if (!cBox) continue
    const n = kids.length
    // Columns butt together with no horizontal gap, splitting the full width.
    const colW = cBox.width / n
    const childMaxH = kids.reduce((m, c) => Math.max(m, c.height || 40), 40)
    const colTop = cBox.y + cBox.height // directly under the container
    for (let i = 0; i < n; i++) {
      const child = kids[i]
      laidOut.set(child.id, {
        id: child.id,
        x: cBox.x + i * colW,
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
    // Centre the assistant within its own band: anchor bottom + the
    // senior→assistant gap + half the band height.
    const above = gapAboveByTier.get(anchorTier) ?? TIER_GAP / 2
    const bandH = assistantBandHByTier.get(anchorTier) ?? (n.height || 40)
    const yMid = anchor.y + anchor.height + above + bandH / 2
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
