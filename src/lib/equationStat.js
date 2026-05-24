// ─────────────────────────────────────────────────────────────────────────────
// equationStat — resolve a statistic to its { period_date, value } time-series.
//
// Basic / auto / secondary stats store their own rows in `statistic_values`.
// EQUATION stats (statistics.stat_category === 'equation') store NO rows of
// their own — their values are computed on the fly by folding their component
// stats per period, per `statistics.equation_parts` ([{ stat_id, operator }]).
//
// This mirrors resolveEquationToMap() in src/pages/Statistics.jsx so the
// dashboard mini-graphs render equation stats the same way the Stats module does.
// ─────────────────────────────────────────────────────────────────────────────
import { supabase } from './supabase'

const PAGE_SIZE = 1000

// Paginated fetch of one stat's stored values → Map<period_date, number>.
// (PostgREST caps a single request at ~1000 rows; page through .range().)
async function fetchStoredMap(statId) {
  const map = new Map()
  let from = 0
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { data, error } = await supabase
      .from('statistic_values')
      .select('period_date, value')
      .eq('statistic_id', statId)
      .order('period_date')
      .range(from, from + PAGE_SIZE - 1)
    if (error || !data || data.length === 0) break
    for (const r of data) {
      if (r.period_date != null && r.value != null) map.set(r.period_date, Number(r.value))
    }
    if (data.length < PAGE_SIZE) break
    from += PAGE_SIZE
  }
  return map
}

// Resolve any stat to a Map<period_date, number>. Recurses for nested equations.
async function resolveStatMap(stat, allStats, depth = 0) {
  if (!stat || depth > 10) return new Map()

  // Non-equation stats just read their own stored rows.
  if (stat.stat_category !== 'equation') {
    return fetchStoredMap(stat.id)
  }

  // Equation: fold component stats per period. equation_parts stat_ids are
  // stored as strings in JSONB — normalise to Number().
  const parts = Array.isArray(stat.equation_parts) ? stat.equation_parts : []
  const compIds = [
    ...new Set(parts.map(p => (p.stat_id ? Number(p.stat_id) : null)).filter(Boolean)),
  ]
  if (compIds.length === 0) return new Map()

  const compMaps = {}
  for (const id of compIds) {
    const comp = (allStats || []).find(s => Number(s.id) === id)
    compMaps[id] = comp ? await resolveStatMap(comp, allStats, depth + 1) : new Map()
  }

  // Union of every component's periods; fold the parts left-to-right per period.
  // A component missing a value for a period contributes 0.
  const allPeriods = new Set()
  for (const id of compIds) {
    for (const period of compMaps[id].keys()) allPeriods.add(period)
  }
  const result = new Map()
  for (const period of [...allPeriods].sort()) {
    let val = null
    for (const part of parts) {
      if (!part.stat_id) continue
      const pv = compMaps[Number(part.stat_id)]?.get(period) ?? 0
      if (val === null) val = pv
      else if (part.operator === '+') val += pv
      else if (part.operator === '-') val -= pv
      else if (part.operator === '*') val *= pv
      else if (part.operator === '/') val = pv !== 0 ? val / pv : val
    }
    if (val !== null) result.set(period, val)
  }
  return result
}

// Public — resolve a stat to a sorted [{ period_date, value }] array.
// `allStats` is the full statistics list, needed to resolve equation components.
export async function resolveStatSeries(stat, allStats) {
  const map = await resolveStatMap(stat, allStats)
  return [...map.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([period_date, value]) => ({ period_date, value }))
}
