// Pure Irrigation calc — extracted from IrrigationModule.jsx so the math is unit-testable
// without React/Supabase. Logic identical. resolveMaterialPrice + calcWalkAccessLabor
// (whose libs import supabase) are inlined here, kept in sync with lib/materialCatalog +
// lib/walkAccess. The module's own TIMER_TYPES / RATE_DEFAULTS / computeTimerRow are
// carried below.
import { LAB } from '../../lib/laborRefs.js'
import { makeModuleRates } from '../../lib/moduleRates.js'
const n = v => parseFloat(v) || 0
const num = v => { const x = typeof v === 'number' ? v : parseFloat(v); return Number.isFinite(x) ? x : 0 }
const DEFAULT_WALK_ACCESS_PACE_LF_PER_MIN = 60
const isStandardSel = v => !v || v === 'Standard'
function resolveMaterialPrice(name, vendorId, materialRows, priceMap, fallback = 0) {
  if (vendorId && !isStandardSel(vendorId)) {
    const row = (materialRows || []).find(r => r.name === name && r.vendor_id === vendorId)
    if (row && row.unit_cost != null && row.unit_cost !== '') return num(row.unit_cost)
  }
  const mp = priceMap?.[name]
  return mp != null ? mp : fallback
}
function calcWalkAccessLabor(laborSubtotalHrs, distanceLF, opts = {}) {
  const hrs = n(laborSubtotalHrs); const lf = n(distanceLF)
  const pace = n(opts.paceLfPerMin) || DEFAULT_WALK_ACCESS_PACE_LF_PER_MIN
  if (hrs <= 0 || lf <= 0 || pace <= 0) return 0
  return ((hrs / 8) * (lf * 2)) / pace
}
// Zone helpers come from lib/irrigationZones (pure — no supabase), so import directly.
import { makeBomPrice, computeZoneRow, zoneMeta, ZONE_TYPES } from '../../lib/irrigationZones.js'
// ── Module const/helper block (TIMER_TYPES, RATE_DEFAULTS, computeTimerRow, etc.) ──
const IRRIGATION_CATEGORY = 'Irrigation'

// ── Zone definitions ──────────────────────────────────────────────────────────
// Zone assemblies (labels, per-zone Trench/Hand labor keys, bill-of-materials) live
// in src/lib/irrigationZones.js so the estimator and the summary share one source.

// ── Timer definitions ─────────────────────────────────────────────────────────
export const TIMER_TYPES = [
  { key: 'timer4', label: '4 Station', matKey: 'Timer - 4 Station' },
  { key: 'timer6', label: '6 Station', matKey: 'Timer - 6 Station' },
  { key: 'timer9', label: '9 Station', matKey: 'Timer - 9 Station' },
  { key: 'timer12', label: '12 Station', matKey: 'Timer - 12 Station' },
  { key: 'timer15', label: '15 Station', matKey: 'Timer - 15 Station' },
  { key: 'timer18', label: '18 Station', matKey: 'Timer - 18 Station' },
  {
    key: 'timerICC8',
    label: 'Hunter ICC 8 Station',
    matKey: 'Timer - Hunter ICC 8 Station',
  },
  {
    key: 'timerAdd8',
    label: 'Additional 8 Station Module',
    matKey: 'Timer - Additional 8 Station Module',
  },
]

const TIMER_BY_KEY = Object.fromEntries(TIMER_TYPES.map(t => [t.key, t]))
const timerMeta = key => TIMER_BY_KEY[key] || TIMER_TYPES[0]
const TIMER_OPTIONS = TIMER_TYPES.map(t => ({ value: t.key, label: t.label }))

// ── Estimate-config defaults ──────────────────────────────────────────────────
// Only company/estimate-config defaults live here. Per-zone / per-timer labor
// coefficients and material prices are read live from the rate tables — no
// hardcoded rate fallbacks. Missing rates are guaranteed by
// supabase-irrigation-fallbacks-seed.sql.
const RATE_DEFAULTS = {
  salesTax: 0.095, // 9.5% — company_settings key 'sales_tax_rate'
}

// Commission, sub GP markup, GPMD, labor rate + burden % are sourced live from
// company_settings — no hardcoded code defaults.

// ── Calculation engine ────────────────────────────────────────────────────────
const r2 = x => Math.round(((x || 0) + Number.EPSILON) * 100) / 100

// ── Vendor-catalog material price ─────────────────────────────────────────────
// The ONLY thing the Vendor selection changes: the material $ source. When a real
// vendor is selected AND a material_rates row exists (name===dbName &&
// vendor_id===vendorId) use that row's unit_cost; otherwise fall back to the Standard
// price (name-keyed materialPrices[dbName]) then the hard fallback. Vendor 'Standard'
// resolves to exactly the original math, so In-House numbers never move.
// Shared resolver (src/lib/materialCatalog.js) — same vendor→Standard→fallback
// order. Irrigation keeps separate material/labor maps, so it doesn't use the
// merged useMaterialCatalog hook.
const irrMatPrice = resolveMaterialPrice

// ── Per-row calculators ───────────────────────────────────────────────────────
// computeZoneRow (zone assembly: per-zone labor hours + live BOM) is imported from
// src/lib/irrigationZones.js. Timer rows stay module-local below.

// Timer row: In-House labor + material identical to the original per-timer math —
//   hrs = qty × timerHrs ;  mat = qty × material unit price
function computeTimerRow(row, timerHrs, materialPrices, materialRows) {
  // Unselected timer row contributes nothing (no crash, no fallback-to-first).
  if (!row.type)
    return { t: timerMeta(row.type), qty: n(row.qty), hrs: 0, unitPrice: 0, mat: 0, subEach: 0, subMat: 0 }
  const t = timerMeta(row.type)
  const qty = n(row.qty)
  const hrs = qty * timerHrs
  const unitPrice = irrMatPrice(t.matKey, row.vendor, materialRows, materialPrices)
  const mat = qty * unitPrice
  const subEach = row.subEach !== '' && row.subEach != null ? n(row.subEach) : unitPrice
  const subMat = qty * subEach
  return { t, qty, hrs, unitPrice, mat, subEach, subMat }
}

// In-House: every formula preserved byte-for-byte from the original calc.
// Sub: flat $/unit per row, NO labor hours, itemized cost routed into subCost.

export function calcIrrigation(
  state,
  laborRatePerHour,
  materialPrices,
  laborRates,
  salesTax,
  gpmd,
  walkAccess = null,
  laborBurdenPct,
  materialRows = [],
  commissionRate
) {
  const mp = materialPrices || {}
  const lr = laborRates || {}
  const lrph = n(laborRatePerHour)
  const diff = 1 + n(state.difficulty) / 100
  const hrsAdj = n(state.hoursAdj)
  const tax = n(salesTax) || RATE_DEFAULTS.salesTax
  const pace = n(walkAccess?.paceLfPerMin) || DEFAULT_WALK_ACCESS_PACE_LF_PER_MIN
  const isSub = state.subType === 'Subcontractor'

  // Unified rate reader — records labor rates that resolve to unset/0 so an unset
  // rate surfaces in the fix-it banner (value-identical to n(lr[...])). Labor is only
  // routed through R at point-of-use, guarded by qty, so UNUSED sections never flag.
  const R = makeModuleRates({ material: mp, labor: lr, sub: {}, misc: mp, materialRows })

  // Per-zone labor (hrs/zone) lives on each ZONE_TYPE (irrigationZones.js) and is
  // resolved by ref_key inside computeZoneRow. Timer install labor is hrs/each.
  // Read via R.labor only when a timer row is actually in use (In-House), so an unset
  // timer rate surfaces only then; value is identical to n(lr[LAB.IRR_TIMER_INSTALL]).
  const anyTimerInUse = !isSub && (state.timerRows || []).some(t => t.type && n(t.qty) > 0)
  const timerHrs = anyTimerInUse
    ? R.labor(LAB.IRR_TIMER_INSTALL, { category: 'Irrigation', unit: 'Hrs per Each', label: 'Timer Install' })
    : n(lr[LAB.IRR_TIMER_INSTALL])

  // Live BOM pricing: Standard preferred, else any vendor line (Home-Depot-only items).
  const bomPrice = makeBomPrice(materialRows, mp)

  // ── Zone labor + material (pre-tax) ─────────────────────────────────────
  let zoneHrs = 0,
    zoneMat = 0,
    zoneSubMat = 0
  const zoneMissing = new Set()
  const zoneCalc = (state.zoneRows || []).map(row => {
    const c = computeZoneRow(row, lr, bomPrice)
    zoneHrs += c.hrs
    zoneMat += c.mat
    zoneSubMat += c.subMat
    ;(c.missing || []).forEach(m => zoneMissing.add(m))
    // Record the per-zone labor rate for unpriced surfacing — value-identical to the
    // rate computeZoneRow already applied (c.rate); only recorded when the zone is
    // actually in use (In-House, qty > 0) so UNUSED zones never flag.
    if (!isSub && row && row.type && n(row.qty) > 0) {
      const z = zoneMeta(row.type)
      const mode = row.mode === 'Trench' && !z.laborTrench ? 'Hand' : row.mode || z.defaultMode
      const laborKey = mode === 'Trench' ? z.laborTrench : z.laborHand
      R.labor(laborKey, { category: 'Irrigation', unit: 'Hrs per Zone', label: `${z.label} — ${mode}` })
    }
    return c
  })

  // ── Timer labor + material (pre-tax) ────────────────────────────────────
  let timerLaborHrs = 0,
    timerMat = 0,
    timerSubMat = 0
  const timerCalc = (state.timerRows || []).map(row => {
    const c = computeTimerRow(row, timerHrs, mp, materialRows)
    timerLaborHrs += c.hrs
    timerMat += c.mat
    timerSubMat += c.subMat
    return c
  })

  // ── Manual entry ─────────────────────────────────────────────────────────
  const manualFiltered = (state.manualRows || []).filter(
    r => n(r.hours) > 0 || n(r.materials) > 0 || n(r.subCost) > 0
  )
  const manualHrs = manualFiltered.reduce((s, r) => s + n(r.hours), 0)
  const manualMat = manualFiltered.reduce((s, r) => s + n(r.materials), 0)
  const manualSub = manualFiltered.reduce((s, r) => s + n(r.subCost), 0)

  const subMarkup = n(state.subGpMarkupRate)

  // ── Unpriced MATERIAL surfacing (In-House only) ─────────────────────────────
  // Zone BOM lines with no resolvable price (zoneMissing) + any selected timer whose
  // material resolves to $0. Name-based entries (write back via saveStandardNamedRate).
  // The Sub tab prices flat per-unit, not off the catalog, so it never flags. NO-FALLBACK.
  const matUnset = isSub
    ? []
    : (() => {
        const seen = new Set()
        const out = []
        const add = (name, label) => {
          const k = name || label
          if (!k || seen.has(k)) return
          seen.add(k)
          out.push({ name, label: label || name, category: 'Irrigation', unit: null })
        }
        zoneMissing.forEach(nm => add(nm, nm))
        timerCalc.forEach((c, i) => {
          const row = (state.timerRows || [])[i]
          if (row && row.type && n(row.qty) > 0 && c.unitPrice <= 0) add(c.t?.matKey, c.t?.label || c.t?.matKey)
        })
        return out
      })()

  // Merge unpriced LABOR (recorded above via R.labor at point-of-use, guarded by qty)
  // into the same fix-it list the banner renders. Labor entries carry kind:'labor' so
  // the modal saves them via saveLaborRate. Sub tab reads no labor → empty.
  const allUnset = [...matUnset, ...R.unpricedList]

  if (isSub) {
    // Sub tab: flat per-unit material only, NO labor hours. The itemized flat cost
    // (+ any manual Sub Cost) IS the subcontractor cost; profit is the markup.
    const subMatTotal = zoneSubMat + timerSubMat
    const totalMat = subMatTotal
    const subCost = subMatTotal + manualSub
    const subGp = subCost * subMarkup
    const commission = subGp * n(commissionRate)
    const price = subCost + subGp + commission
    return {
      totalHrs: 0,
      manDays: 0,
      laborCost: 0,
      burden: 0,
      rawMat: subMatTotal,
      totalMat,
      subCost,
      gp: 0,
      subGp,
      commission,
      price,
      zoneCalc,
      timerCalc,
      zoneHrs: 0,
      timerLaborHrs: 0,
      manualHrs: 0,
      walkHrs: 0,
      timerHrs,
      salesTax: tax,
      matUnset: allUnset,
    }
  }

  // ── In-House totals (byte-for-byte identical to the original calc) ──────────
  const rawHrs = zoneHrs + timerLaborHrs + manualHrs
  // Walk-access penalty is calculated against the difficulty-adjusted labor
  // (i.e. how big the job actually is once site complexity is applied), then
  // added on. Mirrors Excel: O25 uses O24 (labor subtotal after item-level
  // adjustments) and the result flows into O26 = labor + drive.
  const adjLaborHrs = rawHrs * diff + hrsAdj
  const walkHrs = calcWalkAccessLabor(adjLaborHrs, state.distanceLF, { paceLfPerMin: pace })
  const totalHrs = adjLaborHrs + walkHrs
  const rawMat = zoneMat + timerMat + manualMat
  const totalMat = rawMat * (1 + tax) // Excel: =P24+(P24*SalesTax)
  const subCost = manualSub

  const manDays = totalHrs / 8
  const laborCost = totalHrs * lrph
  const burden = laborCost * n(laborBurdenPct)
  const gp = manDays * n(gpmd)
  const commission = gp * n(commissionRate)
  const price = laborCost + burden + totalMat + gp + commission + subCost

  return {
    totalHrs,
    manDays,
    laborCost,
    burden,
    rawMat,
    totalMat,
    subCost,
    gp,
    subGp: 0,
    commission,
    price,
    zoneCalc,
    timerCalc,
    zoneHrs,
    timerLaborHrs,
    manualHrs,
    walkHrs,
    timerHrs,
    salesTax: tax,
    matUnset: allUnset,
  }
}
