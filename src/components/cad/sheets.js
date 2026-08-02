// src/components/cad/sheets.js
//
// Plan-set sheet model + PDF plotting for the CAD editor. A "sheet" lays out the
// model geometry inside a paper size with a title block, at a chosen scale. The
// same layout math drives both the on-screen preview (SVG) and the PDF plot
// (vector, via jsPDF), so what you see composes exactly what you plot.
//
// All layout numbers are in INCHES (paper space). The model lives in world units
// (feet by default); sheet.view.scale = paper inches per world unit.

import { jsPDF } from 'jspdf'

// Portrait dimensions (w × h) in inches. Orientation swaps them.
export const PAPER_SIZES = {
  LETTER:  { label: 'Letter (8.5×11)',  w: 8.5,  h: 11 },
  LEGAL:   { label: 'Legal (8.5×14)',   w: 8.5,  h: 14 },
  TABLOID: { label: 'Tabloid / ANSI B (11×17)', w: 11, h: 17 },
  ARCH_C:  { label: 'ARCH C (18×24)',   w: 18,   h: 24 },
  ARCH_D:  { label: 'ARCH D (24×36)',   w: 24,   h: 36 },
  ARCH_E:  { label: 'ARCH E (36×48)',   w: 36,   h: 48 },
  ANSI_D:  { label: 'ANSI D (22×34)',   w: 22,   h: 34 },
}

// Scale presets → paper inches per 1 world foot. Assumes world unit = ft.
export const SCALE_PRESETS = [
  { label: '3/32" = 1\'', inPerFt: 3 / 32 },
  { label: '1/8" = 1\'',  inPerFt: 1 / 8 },
  { label: '3/16" = 1\'', inPerFt: 3 / 16 },
  { label: '1/4" = 1\'',  inPerFt: 1 / 4 },
  { label: '3/8" = 1\'',  inPerFt: 3 / 8 },
  { label: '1/2" = 1\'',  inPerFt: 1 / 2 },
  { label: '3/4" = 1\'',  inPerFt: 3 / 4 },
  { label: '1" = 1\'',    inPerFt: 1 },
  { label: '1" = 10\'',   inPerFt: 1 / 10 },
  { label: '1" = 20\'',   inPerFt: 1 / 20 },
  { label: '1" = 30\'',   inPerFt: 1 / 30 },
  { label: '1" = 40\'',   inPerFt: 1 / 40 },
  { label: '1" = 50\'',   inPerFt: 1 / 50 },
  { label: '1" = 100\'',  inPerFt: 1 / 100 },
]

export const MARGIN = 0.5 // inches

export function newSheet(n = 1, sizeKey = 'ARCH_D') {
  return {
    id: (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : 's-' + Math.random().toString(36).slice(2),
    number: `A-${String(n).padStart(2, '0')}`,
    name: 'Plan',
    size: sizeKey,
    orientation: 'landscape',
    view: { cx: 0, cy: 0, scale: 1 / 4 }, // scale = paper in / world unit
    titleBlock: {
      project: '', client: '', address: '',
      drawnBy: '', date: new Date().toISOString().slice(0, 10),
      revision: '', notes: '',
    },
  }
}

// Page {w,h} in inches for a sheet (accounts for orientation).
export function pageDims(sheet) {
  const s = PAPER_SIZES[sheet?.size] || PAPER_SIZES.ARCH_D
  return sheet?.orientation === 'portrait' ? { w: s.w, h: s.h } : { w: s.h, h: s.w }
}

// Full layout in inches: border, title-block box, and the drawing area.
export function sheetLayout(sheet) {
  const { w, h } = pageDims(sheet)
  const m = MARGIN
  const tbW = Math.min(2.6, w * 0.3)
  const border = { x: m, y: m, w: w - 2 * m, h: h - 2 * m }
  const tb = { x: w - m - tbW, y: m, w: tbW, h: h - 2 * m }
  const gap = 0.12
  const area = { x: m, y: m, w: (w - 2 * m - tbW - gap), h: h - 2 * m }
  return { page: { w, h }, margin: m, border, tb, area }
}

// world point → paper inches, given the sheet view (center + scale).
export function worldToPaper(sheet, layout, p) {
  const s = sheet?.view?.scale || 0.0001
  const cx = sheet?.view?.cx || 0
  const cy = sheet?.view?.cy || 0
  const acx = layout.area.x + layout.area.w / 2
  const acy = layout.area.y + layout.area.h / 2
  return { x: acx + (p.x - cx) * s, y: acy + (p.y - cy) * s }
}

// Bounding box of all entity geometry in world units (null if empty).
export function entitiesBBox(entities) {
  let minx = Infinity, miny = Infinity, maxx = -Infinity, maxy = -Infinity
  const add = (x, y) => { if (x < minx) minx = x; if (y < miny) miny = y; if (x > maxx) maxx = x; if (y > maxy) maxy = y }
  for (const e of entities || []) {
    const pr = e.props || {}
    const pad = e.type === 'circle' ? (pr.radius || 0) : e.type === 'block' ? (pr.size || 2) / 2 : 0
    for (const pt of e.points || []) { add(pt.x - pad, pt.y - pad); add(pt.x + pad, pt.y + pad) }
  }
  if (minx === Infinity) return null
  return { minx, miny, maxx, maxy }
}

// Auto center + scale so the model fills the drawing area (~92%).
export function fitView(entities, sheet) {
  const layout = sheetLayout(sheet)
  const bb = entitiesBBox(entities)
  if (!bb) return { cx: 0, cy: 0, scale: layout.area.w / 50 }
  const bw = Math.max(bb.maxx - bb.minx, 0.001)
  const bh = Math.max(bb.maxy - bb.miny, 0.001)
  const s = Math.min(layout.area.w / bw, layout.area.h / bh) * 0.92
  return { cx: (bb.minx + bb.maxx) / 2, cy: (bb.miny + bb.maxy) / 2, scale: s }
}

// Human label for the current numeric scale (nearest preset, else raw).
export function scaleLabel(scale) {
  for (const p of SCALE_PRESETS) if (Math.abs(p.inPerFt - scale) < 1e-6) return p.label
  return `${(scale).toFixed(4)} in/unit`
}

function hexToRgb(hex) {
  if (!hex) return [17, 24, 39]
  const h = hex.replace('#', '')
  const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16)
  return [r, g, b].map(v => (Number.isNaN(v) ? 17 : v))
}

// Draw one sheet's geometry + title block onto a jsPDF page (unit = 'in').
function drawSheet(doc, sheet, { layers = [], entities = [], drawingName = '' }) {
  const layout = sheetLayout(sheet)
  const layerColor = id => (layers.find(l => l.id === id)?.color) || '#111827'
  const W2P = p => worldToPaper(sheet, layout, p)

  // ── geometry ──
  doc.setLineWidth(0.008)
  for (const e of entities) {
    const color = e.props?.stroke || layerColor(e.layer)
    const [r, g, b] = hexToRgb(color)
    doc.setDrawColor(r, g, b)
    doc.setTextColor(r, g, b)
    const P = (e.points || []).map(W2P)
    switch (e.type) {
      case 'line':
        if (P.length >= 2) doc.line(P[0].x, P[0].y, P[1].x, P[1].y)
        break
      case 'polyline':
        for (let i = 0; i < P.length - 1; i++) doc.line(P[i].x, P[i].y, P[i + 1].x, P[i + 1].y)
        break
      case 'rect':
      case 'polygon':
        for (let i = 0; i < P.length; i++) {
          const a = P[i], c = P[(i + 1) % P.length]
          doc.line(a.x, a.y, c.x, c.y)
        }
        break
      case 'circle': {
        if (!P[0]) break
        const rr = (e.props?.radius || 0) * (sheet.view.scale || 0)
        if (rr > 0) doc.circle(P[0].x, P[0].y, rr)
        break
      }
      case 'text': {
        if (!P[0]) break
        const ptSize = Math.max(4, (e.props?.fontSize || 1) * (sheet.view.scale || 0) * 72)
        doc.setFontSize(Math.min(ptSize, 48))
        doc.text(String(e.props?.text || ''), P[0].x, P[0].y)
        break
      }
      case 'block': {
        if (!P[0]) break
        const rr = ((e.props?.size || 2) / 2) * (sheet.view.scale || 0)
        if (rr > 0) doc.circle(P[0].x, P[0].y, rr)
        const ptSize = Math.max(4, (e.props?.size || 2) * 0.35 * (sheet.view.scale || 0) * 72)
        doc.setFontSize(Math.min(ptSize, 36))
        doc.text(String(e.props?.label || ''), P[0].x, P[0].y + rr + 0.06)
        break
      }
      default:
        break
    }
  }

  // ── border + title block (drawn last so they sit on top) ──
  doc.setDrawColor(17, 24, 39)
  doc.setLineWidth(0.02)
  doc.rect(layout.border.x, layout.border.y, layout.border.w, layout.border.h)
  const tb = layout.tb
  doc.setLineWidth(0.015)
  doc.rect(tb.x, tb.y, tb.w, tb.h)

  const tbFields = sheet.titleBlock || {}
  const lines = [
    ['PROJECT', tbFields.project || drawingName || '—'],
    ['CLIENT', tbFields.client || '—'],
    ['ADDRESS', tbFields.address || '—'],
    ['SHEET', `${sheet.name || ''}`.trim() || '—'],
    ['SHEET NO.', sheet.number || '—'],
    ['SCALE', scaleLabel(sheet.view?.scale || 0)],
    ['DATE', tbFields.date || '—'],
    ['DRAWN BY', tbFields.drawnBy || '—'],
    ['REVISION', tbFields.revision || '—'],
  ]
  let ty = tb.y + 0.35
  const tx = tb.x + 0.15
  doc.setTextColor(17, 24, 39)
  for (const [k, v] of lines) {
    doc.setFontSize(6.5)
    doc.setTextColor(120, 120, 120)
    doc.text(k, tx, ty)
    doc.setFontSize(9)
    doc.setTextColor(17, 24, 39)
    doc.text(String(v).slice(0, 34), tx, ty + 0.17)
    doc.line(tb.x, ty + 0.32, tb.x + tb.w, ty + 0.32)
    ty += 0.55
  }
  if (tbFields.notes) {
    doc.setFontSize(6.5); doc.setTextColor(120, 120, 120)
    doc.text('NOTES', tx, ty)
    doc.setFontSize(8); doc.setTextColor(17, 24, 39)
    const wrapped = doc.splitTextToSize(String(tbFields.notes), tb.w - 0.3)
    doc.text(wrapped, tx, ty + 0.16)
  }
}

// Build a jsPDF doc for the given sheets. Returns the doc (caller calls .save()).
export function plotSheetsToPdf(model, sheetList) {
  const sheets = (sheetList && sheetList.length) ? sheetList : []
  if (!sheets.length) return null
  let doc = null
  sheets.forEach((sheet, idx) => {
    const { w, h } = pageDims(sheet)
    const orient = w >= h ? 'landscape' : 'portrait'
    if (idx === 0) {
      doc = new jsPDF({ unit: 'in', format: [w, h], orientation: orient })
    } else {
      doc.addPage([w, h], orient)
    }
    drawSheet(doc, sheet, model)
  })
  return doc
}
