// Pure Weed Abatement calc — extracted from WeedAbatementModule.jsx so the math is
// unit-testable without React/Supabase. Logic identical, with ONE bug fix carried in:
// the In-House return exposed `flatPer1k`/`hillPer1k`, which were never declared (the
// coefficients are `flatRate`/`hillRate`) — an undefined-variable ReferenceError in the
// strict-mode ESM In-House path. Fixed to expose the real DB-sourced coefficients.
// No supabase-tainted imports — the calc reads everything off its args (state.rates,
// which the module loads from labor_rates + misc_rates, category 'Weed Abatement').
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
      price: subCost + subGp + commission,
    }
  }

  const travelHrs = travelPerVisit * visits
  // Flat/Hillside rates are hours per Sq Ft: hrs = area × rate × visits.
  const flatHrs = flatSF * flatRate * visits
  const hillHrs = hillSF * hillRate * visits
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
  }
}
