// src/lib/walkAccess.js
// ─────────────────────────────────────────────────────────────────────────────
// Walk-Access (Truck → Work Area) labor penalty.
//
// Two calculation styles, mirroring the Excel master estimator:
//
//   1) calcWalkAccessLabor(labelled "labor-based") — used by Irrigation, Walls,
//      and every other module EXCEPT the bobcat demo modules.
//
//        addedHours = (laborSubtotalHrs / (crewSize × 8)) × (distanceLF × 2) / pace
//
//      i.e. crew-days of work × round-trip walking time. Matches Excel:
//        =LaborSubtotal / (S4 * 8) * G4 * 2 / 60     (S4 = crew, G4 = LF)
//
//   2) calcWalkAccessTrips(labelled "trip-based") — used by SkidSteerDemo and
//      MiniSkidSteerDemo. Penalty scales with bobcat trip count rather than
//      labor hours, and a baseline distance (BobcatTravel, default 15 LF) is
//      already included in the hauling rate so we subtract it.
//
//        addedHours = max(0, distanceLF − baselineLF) × trips × 2 / (pace × 60)
//
//      Matches Excel:
//        =(F6 - BobcatTravel) * N4 * 2 * (1/60/60)   (60 ft/min pace, /60 → hrs)
//
// Both helpers return added hours (not days, not dollars). The caller adds
// the returned value to its labor-subtotal so it flows through to manDays,
// crew labor, burden, GP, commission, and price exactly like any other
// hours bucket.
// ─────────────────────────────────────────────────────────────────────────────
import { supabase } from './supabase'

// Historical hardcoded defaults — used when the column is missing or the row
// can't be read. Matches Excel master estimator conventions (60 ft/min walking
// pace, 3-man crew as the new PBS default).
export const DEFAULT_WALK_ACCESS_PACE_LF_PER_MIN = 60
export const DEFAULT_WALK_ACCESS_CREW_SIZE       = 3
export const DEFAULT_BOBCAT_BASELINE_LF          = 15  // Excel BobcatTravel

const num = v => {
  const n = parseFloat(v)
  return Number.isFinite(n) ? n : 0
}

/**
 * Labor-based walk-access penalty.
 *   addedHours = (laborSubtotalHrs / (crewSize × 8)) × (distanceLF × 2) / pace
 *
 * @param {number} laborSubtotalHrs — total labor hours BEFORE walk-access is added
 * @param {number} distanceLF       — average distance truck → work area (linear feet)
 * @param {object} [opts]
 * @param {number} [opts.crewSize=3]
 * @param {number} [opts.paceLfPerMin=60]
 * @returns {number} added hours (≥ 0)
 */
export function calcWalkAccessLabor(laborSubtotalHrs, distanceLF, opts = {}) {
  const hrs   = num(laborSubtotalHrs)
  const lf    = num(distanceLF)
  const crew  = num(opts.crewSize)    || DEFAULT_WALK_ACCESS_CREW_SIZE
  const pace  = num(opts.paceLfPerMin) || DEFAULT_WALK_ACCESS_PACE_LF_PER_MIN
  if (hrs <= 0 || lf <= 0 || crew <= 0 || pace <= 0) return 0
  const crewDays   = hrs / (crew * 8)
  const roundTripFt = lf * 2
  return crewDays * roundTripFt / pace
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
 * Returns { paceLfPerMin, crewSize } from company_settings, falling back
 * to historical defaults if the columns/row aren't present yet.
 */
export async function fetchWalkAccessSettings() {
  try {
    const { data } = await supabase
      .from('company_settings')
      .select('walk_access_pace_lf_per_min, walk_access_crew_size')
      .maybeSingle()
    const pace = parseFloat(data?.walk_access_pace_lf_per_min)
    const crew = parseFloat(data?.walk_access_crew_size)
    return {
      paceLfPerMin: Number.isFinite(pace) && pace > 0 ? pace : DEFAULT_WALK_ACCESS_PACE_LF_PER_MIN,
      crewSize:     Number.isFinite(crew) && crew > 0 ? crew : DEFAULT_WALK_ACCESS_CREW_SIZE,
    }
  } catch {
    return {
      paceLfPerMin: DEFAULT_WALK_ACCESS_PACE_LF_PER_MIN,
      crewSize:     DEFAULT_WALK_ACCESS_CREW_SIZE,
    }
  }
}
