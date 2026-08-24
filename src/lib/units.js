// ─────────────────────────────────────────────────────────────────────────────
// Standardized display-unit formatting. Canonical scheme (Brian, 2026-08-13):
//   square feet  → Sq Ft      linear feet → Ln Ft
//   each         → Each       cubic yard  → Cu Yd
//   cubic foot   → Cu Ft      ton(s)      → Tons
//   a "/" or "-" that means "per" → the word "per" (e.g. SF/hr → Sq Ft per hr).
//
// USE THIS for any user-visible unit string (View Rates, Master rate tables,
// column headers, breakdown text). It is idempotent, so calling it on an
// already-normalized value is safe. Do NOT run it on rate KEY names (lookup keys).
// ─────────────────────────────────────────────────────────────────────────────
// Preset unit options offered in the Master Rates add/edit modals (materials +
// misc rates). Rendered as a pick-list; custom values are still allowed (misc rates
// use things like 'Per Visit' / 'Per Bag'). Brian's canonical set (2026-08-24).
export const UNIT_PRESETS = [
  'Per Each',
  'Per Ton',
  'Per Cu Yd',
  'Per Sq Ft',
  'Per Ln Ft',
  'Per Cu Ft',
]

function normSegment(seg) {
  let s = seg
  // digit-glued forms first (100sf, 400SF, 10cy) — no word boundary before the unit.
  s = s.replace(/(\d)\s*sf\b/gi, '$1 Sq Ft')
  s = s.replace(/(\d)\s*lf\b/gi, '$1 Ln Ft')
  s = s.replace(/(\d)\s*cy\b/gi, '$1 Cu Yd')
  s = s.replace(/(\d)\s*cf\b/gi, '$1 Cu Ft')
  s = s.replace(/\b(square\s*feet|sq\s*feet|sq\s*ft|sf)\b/gi, 'Sq Ft')
  s = s.replace(/\b(linear\s*feet|lin(?:ear)?\s*feet|ln\s*feet|linear\s*f|ln\s*ft|lf)\b/gi, 'Ln Ft')
  s = s.replace(/\b(cubic\s*yards?|cu\s*yd|cub\s*yard|c\s*yard|cubic\s*y|cy)\b/gi, 'Cu Yd')
  s = s.replace(/\b(cubic\s*feet|cubic\s*foot|cu\s*ft|cf)\b/gi, 'Cu Ft')
  s = s.replace(/\b(each|ea)\b/gi, 'Each')
  s = s.replace(/\b(tons?)\b/gi, 'Tons')
  return s.trim()
}

export function formatUnit(raw) {
  if (raw == null) return raw
  const str = String(raw)
  if (!str.trim()) return str
  // Split on '/' and '-' (both mean "per"), normalize each segment, rejoin with "per".
  return str
    .split(/\s*[/-]\s*/)
    .map(normSegment)
    .join(' per ')
}

export default formatUnit
