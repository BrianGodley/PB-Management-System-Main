// src/components/cad/dxf.js
//
// Dependency-free DXF read/write for the CAD editor. Handles the entity subset
// the editor uses so drawings round-trip with AutoCAD/SketchUp/Rhino/Revit etc.
//
// Coordinate note: DXF is Y-up, the editor's canvas is Y-down. We negate Y on
// the way out and back in, so geometry keeps its orientation in other software.
//
// Unit note: DXF has no intrinsic unit — we assume the drawing's world unit IS
// the DXF unit (feet by default) and write $INSUNITS accordingly.
//
// Supported on EXPORT: line, polyline (open LWPOLYLINE), rect/polygon (closed
//   LWPOLYLINE), circle, text, block (→ marker CIRCLE + label TEXT).
// Supported on IMPORT: LINE, LWPOLYLINE, POLYLINE/VERTEX, CIRCLE, TEXT, MTEXT,
//   INSERT (→ text label), plus LAYER table (name + color). ARC/SPLINE/etc. are
//   skipped (reported in `skipped`).

// ── tiny helpers ────────────────────────────────────────────────────────────
const num = v => {
  const n = Math.round((Number(v) || 0) * 1e6) / 1e6
  return Object.is(n, -0) ? 0 : n
}
const uid = () =>
  (typeof crypto !== 'undefined' && crypto.randomUUID)
    ? crypto.randomUUID()
    : 'e-' + Math.random().toString(36).slice(2) + Date.now().toString(36)

// AutoCAD Color Index → hex (the classic first 9 + a gray). Good enough for
// layer color fidelity; unknown indices fall back to near-black.
const ACI = {
  1: '#ff0000', 2: '#ffff00', 3: '#00ff00', 4: '#00ffff', 5: '#0000ff',
  6: '#ff00ff', 7: '#111827', 8: '#808080', 9: '#c0c0c0', 250: '#333333',
}
function aciToHex(code) {
  const c = parseInt(code, 10)
  return ACI[c] || '#111827'
}
// hex → nearest ACI from the small palette above (for the 62 group code).
function hexToAci(hex) {
  if (!hex) return 7
  const h = hex.replace('#', '')
  const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16)
  if ([r, g, b].some(Number.isNaN)) return 7
  let best = 7, bestD = Infinity
  for (const [code, chex] of Object.entries(ACI)) {
    const hh = chex.replace('#', '')
    const rr = parseInt(hh.slice(0, 2), 16), gg = parseInt(hh.slice(2, 4), 16), bb = parseInt(hh.slice(4, 6), 16)
    const d = (r - rr) ** 2 + (g - gg) ** 2 + (b - bb) ** 2
    if (d < bestD) { bestD = d; best = parseInt(code, 10) }
  }
  return best
}
function hexToRgbInt(hex) {
  if (!hex) return null
  const h = hex.replace('#', '')
  const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16)
  if ([r, g, b].some(Number.isNaN)) return null
  return (r << 16) | (g << 8) | b
}
function unitToInsunits(unit) {
  if (unit === 'in') return 1
  if (unit === 'm') return 6
  return 2 // ft
}

// ── EXPORT ──────────────────────────────────────────────────────────────────
// doc = { unit, layers:[{id,name,color,locked}], entities:[...] }
export function entitiesToDxf(doc) {
  const layers = doc?.layers || []
  const entities = doc?.entities || []
  const unit = doc?.unit || 'ft'
  const out = []
  const put = (code, val) => { out.push(String(code)); out.push(String(val)) }
  const fy = y => num(-y) // flip Y (editor is Y-down, DXF is Y-up)
  const layerName = id => {
    const l = layers.find(x => x.id === id)
    return (l && l.name) ? l.name : '0'
  }

  // HEADER
  put(0, 'SECTION'); put(2, 'HEADER')
  put(9, '$ACADVER'); put(1, 'AC1009')
  put(9, '$INSUNITS'); put(70, unitToInsunits(unit))
  put(0, 'ENDSEC')

  // TABLES → LAYER
  put(0, 'SECTION'); put(2, 'TABLES')
  put(0, 'TABLE'); put(2, 'LAYER'); put(70, Math.max(1, layers.length))
  if (!layers.length) { put(0, 'LAYER'); put(2, '0'); put(70, 0); put(62, 7); put(6, 'CONTINUOUS') }
  for (const ly of layers) {
    put(0, 'LAYER')
    put(2, ly.name || '0')
    put(70, ly.locked ? 4 : 0)
    put(62, hexToAci(ly.color))
    put(6, 'CONTINUOUS')
  }
  put(0, 'ENDTAB'); put(0, 'ENDSEC')

  // ENTITIES
  put(0, 'SECTION'); put(2, 'ENTITIES')
  const lwpoly = (pts, closed, ln) => {
    if (!pts || pts.length < 2) return
    put(0, 'LWPOLYLINE'); put(8, ln); put(90, pts.length); put(70, closed ? 1 : 0)
    for (const p of pts) { put(10, num(p.x)); put(20, fy(p.y)) }
  }
  for (const e of entities) {
    const ln = layerName(e.layer)
    const P = e.points || []
    const col = e.props?.stroke || e.props?.color
    const rgb = hexToRgbInt(col)
    const withColor = () => { if (rgb != null) put(420, rgb) }
    switch (e.type) {
      case 'line': {
        if (P.length < 2) break
        put(0, 'LINE'); put(8, ln)
        put(10, num(P[0].x)); put(20, fy(P[0].y)); put(30, 0)
        put(11, num(P[1].x)); put(21, fy(P[1].y)); put(31, 0)
        withColor()
        break
      }
      case 'polyline': lwpoly(P, false, ln); withColor(); break
      case 'rect':
      case 'polygon': lwpoly(P, true, ln); withColor(); break
      case 'circle': {
        if (!P[0]) break
        put(0, 'CIRCLE'); put(8, ln)
        put(10, num(P[0].x)); put(20, fy(P[0].y)); put(30, 0)
        put(40, num(e.props?.radius || 0))
        withColor()
        break
      }
      case 'text': {
        if (!P[0]) break
        put(0, 'TEXT'); put(8, ln)
        put(10, num(P[0].x)); put(20, fy(P[0].y)); put(30, 0)
        put(40, num(e.props?.fontSize || 1))
        put(1, (e.props?.text || '').toString())
        withColor()
        break
      }
      case 'block': {
        if (!P[0]) break
        const size = e.props?.size || 2
        // marker circle
        put(0, 'CIRCLE'); put(8, ln)
        put(10, num(P[0].x)); put(20, fy(P[0].y)); put(30, 0)
        put(40, num(size / 2))
        // label below the marker
        put(0, 'TEXT'); put(8, ln)
        put(10, num(P[0].x)); put(20, fy(P[0].y - size * 0.7)); put(30, 0)
        put(40, num(size * 0.35))
        put(1, (e.props?.label || '').toString())
        break
      }
      default:
        break
    }
  }
  put(0, 'ENDSEC')
  put(0, 'EOF')
  return out.join('\r\n')
}

// ── IMPORT ──────────────────────────────────────────────────────────────────
// Returns { layers, entities, skipped } in the editor's schema. Coordinates are
// un-flipped back to Y-down. Layers are created from the LAYER table and from
// any layer names referenced by entities.
export function parseDxf(text) {
  const raw = String(text || '').split(/\r\n|\r|\n/)
  // Build (code, value) pairs — code on one line, value on the next.
  const pairs = []
  for (let i = 0; i + 1 < raw.length; i += 2) {
    const code = parseInt(raw[i].trim(), 10)
    if (Number.isNaN(code)) { i -= 1; continue } // resync on stray line
    pairs.push([code, raw[i + 1]])
  }

  const fy = y => num(-y) // un-flip

  // Layer registry: name → {id,name,color,visible,locked}
  const layerByName = new Map()
  const ensureLayer = (name, color) => {
    const nm = (name && String(name).trim()) || '0'
    if (!layerByName.has(nm)) {
      layerByName.set(nm, {
        id: uid(), name: nm, color: color || '#111827', visible: true, locked: false,
      })
    } else if (color) {
      const l = layerByName.get(nm)
      if (l.color === '#111827') l.color = color
    }
    return layerByName.get(nm)
  }

  const entities = []
  const skipped = {}
  const bump = t => { skipped[t] = (skipped[t] || 0) + 1 }

  // Walk sections. We care about TABLES(LAYER) and ENTITIES.
  let i = 0
  const n = pairs.length
  const isPair = (idx, code, val) => idx < n && pairs[idx][0] === code && (val === undefined || pairs[idx][1].trim() === val)

  while (i < n) {
    const [code, val] = pairs[i]
    if (code === 0 && val.trim() === 'SECTION') {
      const secName = (pairs[i + 1] && pairs[i + 1][0] === 2) ? pairs[i + 1][1].trim() : ''
      i += 2
      if (secName === 'TABLES') {
        // Parse LAYER entries: each starts with (0,'LAYER'); grab 2=name, 62=color
        while (i < n && !(pairs[i][0] === 0 && pairs[i][1].trim() === 'ENDSEC')) {
          if (pairs[i][0] === 0 && pairs[i][1].trim() === 'LAYER') {
            i += 1
            let name = '0', color = null
            while (i < n && pairs[i][0] !== 0) {
              const [c, v] = pairs[i]
              if (c === 2) name = v.trim()
              else if (c === 62) color = aciToHex(v)
              else if (c === 420) {
                const rgb = parseInt(v, 10)
                if (!Number.isNaN(rgb)) color = '#' + (rgb & 0xffffff).toString(16).padStart(6, '0')
              }
              i += 1
            }
            ensureLayer(name, color)
          } else i += 1
        }
      } else if (secName === 'ENTITIES') {
        i = parseEntities(pairs, i, n, entities, ensureLayer, fy, bump)
      } else {
        // skip to ENDSEC
        while (i < n && !(pairs[i][0] === 0 && pairs[i][1].trim() === 'ENDSEC')) i += 1
      }
    } else i += 1
  }

  // Ensure at least one layer exists.
  if (!layerByName.size) ensureLayer('0', '#111827')
  const layers = [...layerByName.values()]
  return { layers, entities, skipped }
}

// Parse the ENTITIES section starting at index `i` (pointing at first entity or
// ENDSEC). Returns the index just after ENDSEC.
function parseEntities(pairs, i, n, entities, ensureLayer, fy, bump) {
  const readEntity = start => {
    // start points at a (0, TYPE) pair. Collect group codes until next 0.
    const type = pairs[start][1].trim()
    let j = start + 1
    const g = {}          // last value per code
    const xs = [], ys = [] // repeated 10/20 (LWPOLYLINE verts)
    while (j < n && pairs[j][0] !== 0) {
      const [c, v] = pairs[j]
      if (c === 10) xs.push(Number(v))
      else if (c === 20) ys.push(Number(v))
      else g[c] = v
      j += 1
    }
    return { type, g, xs, ys, next: j }
  }

  while (i < n && !(pairs[i][0] === 0 && pairs[i][1].trim() === 'ENDSEC')) {
    if (pairs[i][0] !== 0) { i += 1; continue }
    const type = pairs[i][1].trim()

    if (type === 'LINE') {
      const { g, xs, ys, next } = readEntity(i)
      const layer = ensureLayer(g[8], null).id
      // LINE uses 10/20 (start) and 11/21 (end); readEntity lumps 10/20 into xs/ys
      const x0 = xs[0], y0 = ys[0], x1 = Number(g[11]), y1 = Number(g[21])
      if ([x0, y0, x1, y1].every(v => !Number.isNaN(v))) {
        entities.push({ id: idFor(), type: 'line', layer, points: [{ x: num(x0), y: fy(y0) }, { x: num(x1), y: fy(y1) }], props: colorProps(g) })
      }
      i = next
    } else if (type === 'LWPOLYLINE') {
      const { g, xs, ys, next } = readEntity(i)
      const layer = ensureLayer(g[8], null).id
      const closed = (parseInt(g[70], 10) & 1) === 1
      const pts = []
      for (let k = 0; k < xs.length; k++) if (!Number.isNaN(xs[k]) && !Number.isNaN(ys[k])) pts.push({ x: num(xs[k]), y: fy(ys[k]) })
      if (pts.length >= 2) entities.push({ id: idFor(), type: closed ? 'polygon' : 'polyline', layer, points: pts, props: colorProps(g) })
      i = next
    } else if (type === 'POLYLINE') {
      // Old-style: header, then VERTEX entities until SEQEND.
      const { g, next } = readEntity(i)
      const layer = ensureLayer(g[8], null).id
      const closed = (parseInt(g[70], 10) & 1) === 1
      let j = next
      const pts = []
      while (j < n && pairs[j][0] === 0 && pairs[j][1].trim() === 'VERTEX') {
        const v = readEntity(j)
        const x = v.xs[0], y = v.ys[0]
        if (!Number.isNaN(x) && !Number.isNaN(y)) pts.push({ x: num(x), y: fy(y) })
        j = v.next
      }
      // skip SEQEND
      if (j < n && pairs[j][0] === 0 && pairs[j][1].trim() === 'SEQEND') { const s = readEntity(j); j = s.next }
      if (pts.length >= 2) entities.push({ id: idFor(), type: closed ? 'polygon' : 'polyline', layer, points: pts, props: colorProps(g) })
      i = j
    } else if (type === 'CIRCLE') {
      const { g, xs, ys, next } = readEntity(i)
      const layer = ensureLayer(g[8], null).id
      const x = xs[0], y = ys[0], r = Number(g[40])
      if (![x, y, r].some(Number.isNaN)) entities.push({ id: idFor(), type: 'circle', layer, points: [{ x: num(x), y: fy(y) }], props: { radius: num(r), ...colorProps(g) } })
      i = next
    } else if (type === 'TEXT' || type === 'MTEXT') {
      const { g, xs, ys, next } = readEntity(i)
      const layer = ensureLayer(g[8], null).id
      const x = xs[0], y = ys[0]
      const str = (g[1] != null ? g[1] : (g[3] != null ? g[3] : '')).toString()
      const h = Number(g[40]) || 1
      if (![x, y].some(Number.isNaN)) entities.push({ id: idFor(), type: 'text', layer, points: [{ x: num(x), y: fy(y) }], props: { text: str, fontSize: num(h), ...colorProps(g) } })
      i = next
    } else if (type === 'INSERT') {
      // Block reference — represent as a text label at the insert point.
      const { g, xs, ys, next } = readEntity(i)
      const layer = ensureLayer(g[8], null).id
      const x = xs[0], y = ys[0]
      const name = (g[2] || 'BLOCK').toString()
      if (![x, y].some(Number.isNaN)) entities.push({ id: idFor(), type: 'text', layer, points: [{ x: num(x), y: fy(y) }], props: { text: name, fontSize: 1 } })
      i = next
    } else {
      // Unsupported entity (ARC, SPLINE, HATCH, POINT, DIMENSION, …) — skip it.
      const { next } = readEntity(i)
      if (type && type !== 'ENDSEC') bump(type)
      i = next
    }
  }
  return i
}

function colorProps(g) {
  const p = {}
  if (g[420] != null) {
    const rgb = parseInt(g[420], 10)
    if (!Number.isNaN(rgb)) p.stroke = '#' + (rgb & 0xffffff).toString(16).padStart(6, '0')
  } else if (g[62] != null) {
    p.stroke = aciToHex(g[62])
  }
  return p
}

// Local id generator (kept separate so parseEntities stays pure-ish).
function idFor() {
  return (typeof crypto !== 'undefined' && crypto.randomUUID)
    ? crypto.randomUUID()
    : 'e-' + Math.random().toString(36).slice(2) + Date.now().toString(36)
}
