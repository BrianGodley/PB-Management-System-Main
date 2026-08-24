// Pure Weed Abatement calc — extracted from WeedAbatementModule.jsx so the math is
// unit-testable without React/Supabase. Logic identical, with ONE bug fix carried in:
// the In-House return exposed `flatPer1k`/`hillPer1k`, which were never declared (the
// coefficients are `flatRate`/`hillRate`) — an undefined-variable ReferenceError in the
// strict-mode ESM In-House path. Fixed to expose the real DB-sourced coefficients.
// No supabase-tainted imports — the calc reads everything off its args (state.rates,
// which the module loads from labor_rates + misc_rates, category 'Weed Abatement').
import { makeModuleRates } from '../../lib/moduleRates.js'
const n = v => parseFloat(v) || 0

// In-House labor / material coefficient names (category 'Weed Abatement'). Every value
// is read live from the price list — no hardcoded fallbacks (a missing row ⇒ 0).
export const WEED_RATE_NAMES = {
  travelHrsPerVisit: 'Weed Abatement - Travel hr/visit', // flat hrs/visit
  flatHrsPer1k: 'Weed Abatement - Flat', // hrs per Sq Ft
  hillHrsPer1k: 'Weed Abatement - Hillside', // hrs per Sq Ft
  materialPer1k: 'Weed Abatement - Material $/1k SF',
}

export function calcWeed(state, laborRatePerHour, gpmd, laborBurdenPct, commissionRate) {
  const isSub = state.subType === 'Subcontractor'
  const mode = state.mode || 'flat'
  const visits = state.visits === '' || state.visits == null ? 1 : n(state.visits)
  // Only the areas relevant to the chosen mode contribute.
  const flatSF = mode === 'hillside' ? 0 : n(state.flatSF)
  const hillSF = mode === 'flat' ? 0 : n(state.hillSF)
  const subMarkup = n(state.subGpMarkupRate)

  // Price-list coefficients (labor hrs + material $/1k SF), read live from state.rates
  // (the DB values). A missing row contributes 0 — no fallback.
  const rt = state.rates || {}
  const travelPerVisit = n(rt.travelHrsPerVisit)
  const flatRate = n(rt.flatHrsPer1k) // hrs per Sq Ft
  const hillRate = n(rt.hillHrsPer1k) // hrs per Sq Ft
  const materialPer1k = n(rt.materialPer1k)

  // Shared rate reader — labor reads route through R.labor so an unset labor rate
  // surfaces in the fix-it banner (additive; R.labor returns the SAME number as the
  // n(rt[shortKey]) reads above, so no math change). state.rates is keyed by SHORT
  // ids; the reader's labor map is re-keyed to the real labor_rates NAMES so an
  // unpriced item writes back to the correct row (the DB name in WEED_RATE_NAMES).
  const R = makeModuleRates({
    material: {},
    sub: {},
    misc: {},
    materialRows: [],
    labor: {
      [WEED_RATE_NAMES.travelHrsPerVisit]: rt.travelHrsPerVisit,
      [WEED_RATE_NAMES.flatHrsPer1k]: rt.flatHrsPer1k,
      [WEED_RATE_NAMES.hillHrsPer1k]: rt.hillHrsPer1k,
    },
  })

  if (isSub) {
    // Sub tab: STRICT price per square foot — no labor hours. subCost is purely
    // $/SF × area × visits, plus an optional flat add.
    const subArea = flatSF + hillSF
    const subRatePerSF = n(state.subRatePerSF)
    const subCost = subArea * subRatePerSF * visits + n(state.subFlat)
    const subGp = subCost * subMarkup
    const commission = subGp * n(commissionRate)
    return {
      isSub: true, mode, visits, flatSF, hillSF,
      travelHrs: 0, flatHrs: 0, hillHrs: 0, laborHrs: 0, totalHrs: 0, manDays: 0,
      totalMat: 0, laborCost: 0, burden: 0, gp: 0,
      subArea, subRatePerSF, subFlat: n(state.subFlat),
      subCost, subGp, commission,
      // Sub tab produces no in-house labor hours, so R.labor is never called here
      // and nothing surfaces (labor must not surface on the flat Sub tab).
      unpriced: R.unpricedList,
      price: subCost + subGp + commission,
    }
  }

  // Labor read via R.labor at point-of-use (guarded by the real quantity it
  // multiplies) so an unset rate surfaces only when that section is actually used.
  // Value is identical to the prior n(rt[key]) reads.
  const travelHrs =
    visits > 0
      ? visits * R.labor(WEED_RATE_NAMES.travelHrsPerVisit, { category: 'Weed Abatement', unit: 'Hrs per Visit', label: 'Travel' })
      : 0
  // Flat/Hillside rates are hours per Sq Ft: hrs = area × rate × visits.
  const flatHrs =
    flatSF > 0
      ? flatSF * visits * R.labor(WEED_RATE_NAMES.flatHrsPer1k, { category: 'Weed Abatement', unit: 'Hrs per Sq Ft', label: 'Flat Area' })
      : 0
  const hillHrs =
    hillSF > 0
      ? hillSF * visits * R.labor(WEED_RATE_NAMES.hillHrsPer1k, { category: 'Weed Abatement', unit: 'Hrs per Sq Ft', label: 'Hillside' })
      : 0
  const laborHrs = flatHrs + hillHrs
  const totalHrs = travelHrs + laborHrs
  const manDays = totalHrs / 8

  const totalMat = ((flatSF + hillSF) / 1000) * materialPer1k * visits

  const lrph = n(laborRatePerHour)
  const laborCost = totalHrs * lrph
  const burden = laborCost * n(laborBurdenPct)
  const gp = manDays * n(gpmd)
  const commission = gp * n(commissionRate)
  const subCost = 0
  const price = laborCost + burden + totalMat + gp + commission

  return {
    isSub: false, mode, visits, flatSF, hillSF,
    travelHrs, flatHrs, hillHrs, laborHrs, totalHrs, manDays,
    // Expose the live DB coefficients (fixes the old undefined flatPer1k/hillPer1k).
    travelPerVisit, flatRate, hillRate, materialPer1k,
    totalMat, laborCost, burden, gp, commission, subCost, subGp: 0, price,
    // Unset in-house labor rates (travel/flat/hillside) that were actually used.
    unpriced: R.unpricedList,
  }
}
