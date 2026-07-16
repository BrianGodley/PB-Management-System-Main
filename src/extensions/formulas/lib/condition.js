// src/extensions/formulas/lib/condition.js
//
// Condition/trend engine — ported from legacy Softcake FormulasViewUtil, "clean"
// variant (no legacy zero-padding of short series). Pure, dependency-free.
//
// Three trend views, mirroring the legacy one/six/twelve-week conditions:
//   one-week    : newest period vs the prior period
//   six-week    : most recent 7 periods, older half vs newer half (4/4)
//   twelve-week : most recent 13 periods, older half vs newer half (7/7)
// All use the same classifier thresholds.
//
// The classifier never *outputs* 'power' (legacy only references it in the
// invert map); it's selectable manually but not auto-derived.
export const CONDITIONS = ['non_existence', 'danger', 'emergency', 'normal', 'affluence']

const INVERT = {
  danger: 'affluence',
  emergency: 'normal',
  affluence: 'danger',
  power: 'non_existence',
  normal: 'emergency',
  non_existence: 'affluence',
}

// Exact legacy thresholds. Returns a condition slug, or null where legacy leaves
// it undefined (rare gaps, e.g. a > 100% jump). Render null as "—".
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

export function invert(slug) {
  return INVERT[slug] ?? slug
}

const isNum = v => typeof v === 'number' && !Number.isNaN(v)
const avg = a => a.reduce((s, x) => s + x, 0) / a.length

// Half-averages over the most recent `size` periods (or all when size is falsy).
// The two halves share the middle point when the window length is odd.
export function windowStats(series, size) {
  const data = (series || []).filter(isNum)
  const n = data.length
  if (n < 2) return null
  const w = size ? data.slice(Math.max(0, n - size)) : data
  const L = w.length
  const half = Math.ceil(L / 2)
  return {
    baseline: avg(w.slice(0, half)),
    current: avg(w.slice(L - half)),
    maxValue: Math.max(...w),
    lowValue: Math.min(...w),
    window: w,
  }
}

// Generic sized-window condition. size = 7 (six-week), 13 (twelve-week), or
// null/undefined (all periods, "dynamic").
export function computeConditionSized(series, size, { upsideDown = false } = {}) {
  const ws = windowStats(series, size)
  if (!ws) return null
  let slug = classify(ws.maxValue, ws.lowValue, ws.current, ws.baseline)
  if (slug && upsideDown) slug = invert(slug)
  const range = ws.maxValue - ws.lowValue
  const pct = range !== 0 ? ((ws.current - ws.baseline) / range) * 100 : null
  return { slug, baseline: ws.baseline, current: ws.current, pct, window: ws.window }
}

// One-week trend: newest period vs the prior period; range over recent context.
export function computeOneWeek(series, { upsideDown = false } = {}) {
  const data = (series || []).filter(isNum)
  const n = data.length
  if (n < 2) return null
  const ctx = data.slice(Math.max(0, n - 13))
  const current = data[n - 1]
  const baseline = data[n - 2]
  let slug = classify(Math.max(...ctx), Math.min(...ctx), current, baseline)
  if (slug && upsideDown) slug = invert(slug)
  const range = Math.max(...ctx) - Math.min(...ctx)
  const pct = range !== 0 ? ((current - baseline) / range) * 100 : null
  return { slug, baseline, current, pct, window: ctx }
}

// Backward-compatible: 'static' = six-week (7), 'dynamic' = all periods.
export function computeWindow(series, mode = 'static') {
  return windowStats(series, mode === 'dynamic' ? null : 7)
}
export function computeCondition(series, { mode = 'static', upsideDown = false } = {}) {
  return computeConditionSized(series, mode === 'dynamic' ? null : 7, { upsideDown })
}

// All three trend views at once.
export function computeTrends(series, { upsideDown = false } = {}) {
  return {
    one_week: computeOneWeek(series, { upsideDown }),
    six_week: computeConditionSized(series, 7, { upsideDown }),
    twelve_week: computeConditionSized(series, 13, { upsideDown }),
  }
}

// Display metadata for the standard conditions (badge color + label).
export const CONDITION_META = {
  non_existence: { label: 'Non-Existence', color: '#dc2626', bg: '#fef2f2' },
  danger: { label: 'Danger', color: '#dc2626', bg: '#fef2f2' },
  emergency: { label: 'Emergency', color: '#d97706', bg: '#fffbeb' },
  normal: { label: 'Normal', color: '#16a34a', bg: '#f0fdf4' },
  affluence: { label: 'Affluence', color: '#15803d', bg: '#f0fdf4' },
  power: { label: 'Power', color: '#15803d', bg: '#f0fdf4' },
  // Lower conditions (below Non-Existence) — manually selectable only.
  liability: { label: 'Liability', color: '#b91c1c', bg: '#fef2f2' },
  doubt: { label: 'Doubt', color: '#b45309', bg: '#fffbeb' },
  enemy: { label: 'Enemy', color: '#991b1b', bg: '#fef2f2' },
  treason: { label: 'Treason', color: '#7f1d1d', bg: '#fef2f2' },
  confusion: { label: 'Confusion', color: '#6b7280', bg: '#f3f4f6' },
}

export const TREND_LABELS = {
  one_week: '1-week',
  six_week: '6-week',
  twelve_week: '12-week',
}
