// Shared TRENCHING math — Utilities is the canonical ("King") source; every module
// with a Trenching section (Fire Pit, and any future one) imports these so the calc
// can never drift from Utilities. Pure (no React / supabase) → unit-testable with
// `node --test`. Rate is HOURS per Cu Ft; hrs = cf × rate, cf = LF × (W/12) × (D/12).
export const n = v => {
  const x = typeof v === 'number' ? v : parseFloat(v)
  return Number.isFinite(x) ? x : 0
}

// method → the labor_rates row (category 'Utilities') holding its hrs-per-Cu-Ft rate.
export const TRENCH_LABOR_RATE_NAME = {
  Trench: 'Utilities Trench Excavation',
  Hand: 'Utilities Hand Excavation',
}

// One trench row → { cf, hrs }. Zero unless LF, width and depth are all > 0.
export function trenchRowHrs(row, mp = {}) {
  const lf = n(row?.lf),
    w = n(row?.width),
    d = n(row?.depth)
  if (!(lf > 0 && w > 0 && d > 0)) return { cf: 0, hrs: 0 }
  const cf = lf * (w / 12) * (d / 12)
  return { cf, hrs: cf * n(mp[TRENCH_LABOR_RATE_NAME[row.equipment]]) }
}

// Sum trench hours across rows.
export function trenchHours(rows, mp = {}) {
  return (rows || []).reduce((s, r) => s + trenchRowHrs(r, mp).hrs, 0)
}
