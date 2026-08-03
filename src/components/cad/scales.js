// src/components/cad/scales.js
//
// The one canonical list of drawing/takeoff scales, shared by the CAD editor
// (working/display scale), the takeoff readouts, and the plan-set plotter
// (sheets.js). Architectural scales are "fraction of an inch = 1 foot";
// engineering scales are "1 inch = N feet". `inPerFt` = paper inches per world
// foot (the world unit is feet), which is all the geometry math needs.

export const SCALE_PRESETS = [
  // ── Architectural (X" = 1'-0") ──
  { label: '1/64" = 1\'', inPerFt: 1 / 64, kind: 'arch' },
  { label: '1/32" = 1\'', inPerFt: 1 / 32, kind: 'arch' },
  { label: '1/16" = 1\'', inPerFt: 1 / 16, kind: 'arch' },
  { label: '3/32" = 1\'', inPerFt: 3 / 32, kind: 'arch' },
  { label: '1/8" = 1\'',  inPerFt: 1 / 8,  kind: 'arch' },
  { label: '3/16" = 1\'', inPerFt: 3 / 16, kind: 'arch' },
  { label: '1/4" = 1\'',  inPerFt: 1 / 4,  kind: 'arch' },
  { label: '3/8" = 1\'',  inPerFt: 3 / 8,  kind: 'arch' },
  { label: '1/2" = 1\'',  inPerFt: 1 / 2,  kind: 'arch' },
  { label: '3/4" = 1\'',  inPerFt: 3 / 4,  kind: 'arch' },
  { label: '1" = 1\'',    inPerFt: 1,      kind: 'arch' },
  // ── Engineering (1" = N') ──
  { label: '1" = 5\'',   inPerFt: 1 / 5,   kind: 'eng' },
  { label: '1" = 10\'',  inPerFt: 1 / 10,  kind: 'eng' },
  { label: '1" = 20\'',  inPerFt: 1 / 20,  kind: 'eng' },
  { label: '1" = 30\'',  inPerFt: 1 / 30,  kind: 'eng' },
  { label: '1" = 40\'',  inPerFt: 1 / 40,  kind: 'eng' },
  { label: '1" = 50\'',  inPerFt: 1 / 50,  kind: 'eng' },
  { label: '1" = 60\'',  inPerFt: 1 / 60,  kind: 'eng' },
]

// Nominal CSS pixels per inch (browsers treat 1 CSS inch as 96 px). Used to
// turn a named scale into an on-screen zoom so "1/4in = 1ft" actually looks
// like quarter-inch scale on a typical monitor.
export const SCREEN_DPI = 96

// Named scale → editor zoom (pixels per world foot).
export function scaleToZoom(inPerFt, dpi = SCREEN_DPI) {
  return (inPerFt || 0) * dpi
}

// Editor zoom (px/ft) → the nearest named scale's inPerFt (for display).
export function zoomToInPerFt(zoom, dpi = SCREEN_DPI) {
  return (zoom || 0) / dpi
}

// Human label for a numeric inPerFt (nearest preset, else a raw ratio).
export function scaleLabel(inPerFt) {
  for (const p of SCALE_PRESETS) if (Math.abs(p.inPerFt - inPerFt) < 1e-9) return p.label
  if (!inPerFt) return '—'
  // Fall back to an engineering-style label: 1" = (1/inPerFt) ft
  const ftPerIn = 1 / inPerFt
  if (ftPerIn >= 1) return `1" = ${(Math.round(ftPerIn * 10) / 10)}'`
  return `${(Math.round(inPerFt * 1000) / 1000)}" = 1'`
}

// Nearest preset inPerFt to an arbitrary zoom — handy for snapping a wheel-zoom
// back onto a named scale.
export function nearestScale(inPerFt) {
  let best = SCALE_PRESETS[0], bestD = Infinity
  for (const p of SCALE_PRESETS) {
    const d = Math.abs(Math.log(p.inPerFt) - Math.log(inPerFt || 1e-6))
    if (d < bestD) { bestD = d; best = p }
  }
  return best
}
