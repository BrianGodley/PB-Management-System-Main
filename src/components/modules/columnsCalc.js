// Pure, React-free Columns finish math — extracted from ColumnsModule so it can be
// unit-tested with `node --test` (no React / supabase / vite imports). The module
// (and ColumnsSummary) resolve the vendor/standard material unit, the shared labor
// rate, and the sub unit — all $/Sq Ft now, since finishes are shared with the
// Finishes module — then inject them here. This is the single source of truth for a
// column finish row's dollars + hours.
//
// NO-FALLBACK: an unpriced unit resolves to 0 (the module surfaces the fix-it
// prompt); the caller must inject a real DB value, never a hidden constant.
export const num = v => parseFloat(v) || 0

// One finish row → { mat, hrs }.
//   In-House: mat = qty × $/SF material, hrs = qty × hrs/SF labor
//   Sub:      mat = qty × sub $/SF,      hrs = 0 (labor is in the sub cost)
export function computeColumnFinishRow(row, { matUnit, laborRate, subUnit = 0, isSub = false }) {
  const qty = num(row && row.qty)
  if (qty <= 0) return { mat: 0, hrs: 0 }
  if (isSub) return { mat: qty * num(subUnit), hrs: 0 }
  return { mat: qty * num(matUnit), hrs: qty * num(laborRate) }
}
