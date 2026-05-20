// src/lib/walkAccess.js
// ─────────────────────────────────────────────────────────────────────────────
// Walk-Access (Truck → Work Area) labor penalty.
//
// Two calc styles, both crew-size INDEPENDENT (same man-hours of walking apply
// whether the crew is 3, 4, or 5):
//
//   1) calcWalkAccessLabor — used by Irrigation, Walls, and every other
//      module EXCEPT the bobcat demo modules.
//
//        addedHours = (laborSubtotalHrs / 8) × (distanceLF × 2) / paceLfPerMin
//
//      Reads: every 8 labor-hours of work generates roughly one round-trip's
//      worth of walking between the truck and the work area at `pace` ft/min.
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
// Both helpers return added hours. The caller adds them to its labor subtotal
// so they flow through to manDays / labor / burden / GP / commission / price
// like any other hours bucket. Each module keeps full control of its own
// rate / GP logic; walk-access just adds extra hours upstream.
// ─────────────────────────────────────────────────────────────────────────────
import { supabase } from './supabase'

export const DEFAULT_WALK_ACCESS_PACE_LF_PER_MIN = 60
export const DEFAULT_BOBCAT_BASELINE_LF = 15 // Excel BobcatTravel

const num = v => {
  const n = parseFloat(v)
  return Number.isFinite(n) ? n : 0
}

/**
 * Labor-based walk-access penalty.
 *   addedHours = (laborSubtotalHrs / 8) × (distanceLF × 2) / paceLfPerMin
 */
export function calcWalkAccessLabor(laborSubtotalHrs, distanceLF, opts = {}) {
  const hrs = num(laborSubtotalHrs)
  const lf = num(distanceLF)
  const pace = num(opts.paceLfPerMin) || DEFAULT_WALK_ACCESS_PACE_LF_PER_MIN
  if (hrs <= 0 || lf <= 0 || pace <= 0) return 0
  const tripsPerJob = hrs / 8
  const roundTripFt = lf * 2
  return (tripsPerJob * roundTripFt) / pace
}

/**
 * Trip-based walk-access penalty (Skid Steer / Mini Skid Steer Demo).
 *   addedHours = max(0, distanceLF − baselineLF) × trips × 2 / (pace × 60)
 */
export function calcWalkAccessTrips(trips, distanceLF, opts = {}) {
  const t = num(trips)
  const lf = num(distanceLF)
  const base = num(opts.baselineLF) || DEFAULT_BOBCAT_BASELINE_LF
  const pace = num(opts.paceLfPerMin) || DEFAULT_WALK_ACCESS_PACE_LF_PER_MIN
  if (t <= 0 || lf <= 0 || pace <= 0) return 0
  const effectiveLF = Math.max(0, lf - base)
  if (effectiveLF <= 0) return 0
  return (effectiveLF * t * 2) / pace / 60
}

/**
 * fetchWalkAccessSettings()
 * Returns { paceLfPerMin } from company_settings, falling back to defaults.
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
