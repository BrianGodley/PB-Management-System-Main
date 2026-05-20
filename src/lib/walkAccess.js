// src/lib/walkAccess.js
// ─────────────────────────────────────────────────────────────────────────────
// Walk-Access (Truck → Work Area) labor penalty.
//
// Two calculation styles, both crew-size INDEPENDENT (the same man-hours of
// walking apply whether a 3, 4, or 5-person crew is on site):
//
//   1) calcWalkAccessLabor — used by Irrigation, Walls, and every other
//      module EXCEPT the bobcat demo modules.
//
//        addedHours = (laborSubtotalHrs / 8) × (distanceLF × 2) / paceLfPerMin
//
//      Interpretation: every 8 labor-hours of work generates roughly one
//      round-trip's worth of walking at `pace` ft/min between the truck and
//      the work area.
//
//   2) calcWalkAccessTrips — used by SkidSteerDemo and MiniSkidSteerDemo.
//      Penalty scales with bobcat trip count. A baseline distance
//      (BobcatTravel = 15 LF) is already included in the hauling rate so
//      we subtract it.
//
//        addedHours = max(0, distanceLF − baselineLF) × trips × 2 / (pace × 60)
//
//      Matches Excel: =(F6 - BobcatTravel) * N4 * 2 * (1/60/60)
//
// Both helpers return added hours (not days, not dollars). The caller adds
// the returned value to its labor-subtotal so it flows through to manDays,
// crew labor, burden, GP, commission, and price like any other hours bucket.
// ─────────────────────────────────────────────────────────────────────────────
import { supabase } from './supabase'

// Historical hardcoded defaults — used when the column is missing or the row
// can't be read. 60 ft/min ≈ 1 ft/sec walking pace.
export const DEFAULT_WALK_ACCESS_PACE_LF_PER_MIN = 60
export const DEFAULT_BOBCAT_BASELINE_LF          = 15  // Excel BobcatTravel

const num = v => {
  const n = parseFloat(v)
  return Number.isFinite(n) ? n : 0
}

/**
 * Labor-based walk-access penalty (Irrigation / Walls / etc.).
 *   addedHours = (laborSubtotalHrs / 8) × (distanceLF × 2) / paceLfPerMin
 *
 * @param {number} laborSubtotalHrs — total labor hours BEFORE walk-access is added
 * @param {number} distanceLF       — average distance truck → work area (linear feet)
 * @param {object} [opts]
 * @param {number} [opts.paceLfPerMin=60]
 * @returns {number} added hours (≥ 0)
 */
export function calcWalkAccessLabor(laborSubtotalHrs, distanceLF, opts = {}) {
  const hrs  = num(laborSubtotalHrs)
  const lf   = num(distanceLF)
  const pace = num(opts.paceLfPerMin) || DEFAULT_WALK_ACCESS_PACE_LF_PER_MIN
  if (hrs <= 0 || lf <= 0 || pace <= 0) return 0
  const tripsPerJob = hrs / 8                       // one round-trip per man-day of labor
  const roundTripFt = lf * 2
  return tripsPerJob * roundTripFt / pace
}

/**
 * Trip-based walk-access penalty (Skid Steer / Mini Skid Steer Demo).
 *   addedHours = max(0, distanceLF − baselineLF) × trips × 2 / (pace × 60)
 *
 * @param {number} trips         — number of bobcat shuttle trips
 * @param {number} distanceLF    — average distance truck → work area
 * @param {object} [opts]
 * @param {number} [opts.baselineLF=15]   — distance already included in hauling rate
 * @param {number} [opts.paceLfPerMin=60]
 * @returns {number} added hours (≥ 0)
 */
export function calcWalkAccessTrips(trips, distanceLF, opts = {}) {
  const t    = num(trips)
  const lf   = num(distanceLF)
  const base = num(opts.baselineLF) || DEFAULT_BOBCAT_BASELINE_LF
  const pace = num(opts.paceLfPerMin) || DEFAULT_WALK_ACCESS_PACE_LF_PER_MIN
  if (t <= 0 || lf <= 0 || pace <= 0) return 0
  const effectiveLF = Math.max(0, lf - base)
  if (effectiveLF <= 0) return 0
  return effectiveLF * t * 2 / pace / 60
}

/**
 * fetchWalkAccessSettings()
 * Returns { paceLfPerMin } from company_settings, falling back to the
 * historical default if the column/row isn't present yet.
 */
export async function fetchWalkAccessSettings() {
  try {
    const { data } = await supabase
      .from('company_settings')
      .select('walk_access_pace_lf_per_min')
      .maybeSingle()
    const pace = parseFloat(data?.walk_access_pace_lf_per_min)
    return {
      paceLfPerMin: Number.isFinite(pace) && pace > 0 ? pace : DEFAULT_WALK_ACCESS_PACE_LF_PER_MIN,
    }
  } catch {
    return { paceLfPerMin: DEFAULT_WALK_ACCESS_PACE_LF_PER_MIN }
  }
}
