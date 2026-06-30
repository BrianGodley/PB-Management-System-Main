// src/extensions/formulas/lib/condition.js
//
// Condition/trend engine — ported from legacy Softcake FormulasViewUtil.
// Pure, dependency-free. Classifies a statistic's recent trend into a condition.
//
// Conditions (slugs). Note: the classifier never *outputs* 'power' (legacy only
// references it in the invert map); it's selectable manually but not auto-derived.
export const CONDITIONS = ['non_existence', 'danger', 'emergency', 'normal', 'affluence']

// Legacy invertCondition() map (for "upside_down" stats where lower is better).
const INVERT = {
  danger: 'affluence',
  emergency: 'normal',
  affluence: 'danger',
  power: 'non_existence',
  normal: 'emergency',
  non_existence: 'affluence',
}

// Exact legacy thresholds. Inputs: window max/low and the two half-averages.
// Returns a condition slug, or null where legacy leaves it undefined (rare gaps,
// e.g. a > 100% jump). Callers should render null as "—".
export function classify(maxValue, lowValue, current, baseline) {
  if (maxValue === 0 && lowValue === 0) return 'non_existence'
  const graphRange = maxValue - lowValue
  const weekRange = current - baseline
  const pct = graphRange !== 0 ? (weekRange / graphRange) * 100 : null
  if (pct !== null && pct > 1.09 && pct <= 28) return 'normal'
  if (pct !== null && pct > 28 && pct <= 100) return 'affluence'
  if ((pct !== null && pct <= -65 && pct >= -100) || current === 0) return 'non_existence'
  if (pct !== null && pct <= -13.32 && pct > -64.99 && current !== 0) return 'danger'
  if (
    (current === baseline && current !== 0) ||
    (pct !== null && pct <= 1.09 && pct > -13.32 && current !== 0)
  )
    return 'emergency'
  return null
}

// Flip a condition for "upside_down" stats (lower is better). Legacy invert map.
export function invert(slug) {
  return INVERT[slug] ?? slug
}

// Build window half-averages from a chronological (oldest->newest) numeric series.
// mode: 'static' (most recent 7 periods) | 'dynamic' (all points). The two halves
// share the middle point when the window length is odd — this matches the legacy
// engine exactly for the common n>=7 static case (4-and-4 with a shared midpoint).
export function computeWindow(series, mode = 'static') {
  const data = (series || []).filter(v => typeof v === 'number' && !Number.isNaN(v))
  const n = data.length
  if (n < 2) return null
  const window = mode === 'dynamic' ? data : data.slice(Math.max(0, n - 7))
  const w = window.length
  const half = Math.ceil(w / 2)
  const firstHalf = window.slice(0, half)
  const secondHalf = window.slice(w - half)
  const avg = a => a.reduce((s, x) => s + x, 0) / a.length
  return {
    baseline: avg(firstHalf),
    current: avg(secondHalf),
    maxValue: Math.max(...window),
    lowValue: Math.min(...window),
    window,
  }
}

// Top-level helper: a chronological series + options -> condition result.
// Returns { slug, baseline, current, pct, window } or null if < 2 data points.
export function computeCondition(series, { mode = 'static', upsideDown = false } = {}) {
  const win = computeWindow(series, mode)
  if (!win) return null
  let slug = classify(win.maxValue, win.lowValue, win.current, win.baseline)
  if (slug && upsideDown) slug = invert(slug)
  const range = win.maxValue - win.lowValue
  const pct = range !== 0 ? ((win.current - win.baseline) / range) * 100 : null
  return { slug, baseline: win.baseline, current: win.current, pct, window: win.window }
}

// Display metadata for the standard conditions (badge color + label).
export const CONDITION_META = {
  non_existence: { label: 'Non-Existence', color: '#dc2626', bg: '#fef2f2' },
  danger: { label: 'Danger', color: '#dc2626', bg: '#fef2f2' },
  emergency: { label: 'Emergency', color: '#d97706', bg: '#fffbeb' },
  normal: { label: 'Normal', color: '#16a34a', bg: '#f0fdf4' },
  affluence: { label: 'Affluence', color: '#15803d', bg: '#f0fdf4' },
  power: { label: 'Power', color: '#15803d', bg: '#f0fdf4' },
}
