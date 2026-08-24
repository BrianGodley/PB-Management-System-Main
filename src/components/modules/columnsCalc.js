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
//
// Unpriced-labor surfacing (purely additive): when an `R` reader (makeModuleRates)
// plus the finish `laborName` are injected, the in-house labor rate is read through
// R.labor at its point of use — guarded by qty>0 AND the in-house branch — so an
// unset finish labor rate becomes a visible fix-it prompt. R.labor returns the SAME
// number as the injected `laborRate` (same map), so the math is unchanged. On the Sub
// tab labor is never read (it's folded into the sub cost), so nothing surfaces there.
export function computeColumnFinishRow(
  row,
  { matUnit, laborRate, subUnit = 0, isSub = false, R = null, laborName = null, laborMeta = {} }
) {
  const qty = num(row && row.qty)
  if (qty <= 0) return { mat: 0, hrs: 0 }
  if (isSub) return { mat: qty * num(subUnit), hrs: 0 }
  const rate = R && laborName ? R.labor(laborName, laborMeta) : num(laborRate)
  return { mat: qty * num(matUnit), hrs: qty * rate }
}
