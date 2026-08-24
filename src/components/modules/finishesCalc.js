// Pure Finishes calc — extracted from FinishesModule.jsx so the math is unit-testable
// without React/Supabase. Logic identical. calcWalkAccessLabor (lib/walkAccess) and
// resolveMaterialPrice (lib/materialCatalog) both transitively import supabase, so their
// pure bodies are inlined here and kept in sync. The module keeps its own constant copies
// for JSX; this file owns the copies the calc consumes (FINISHES_RATES / FINISH_CAT_ITEM).
import { makeModuleRates } from '../../lib/moduleRates.js'
const n = v => parseFloat(v) || 0
const num = v => { const x = typeof v === 'number' ? v : parseFloat(v); return Number.isFinite(x) ? x : 0 }
const isStandardSel = v => !v || v === 'Standard'

function calcWalkAccessLabor(laborSubtotalHrs, distanceLF, opts = {}) {
  const hrs = n(laborSubtotalHrs); const lf = n(distanceLF)
  const pace = n(opts.paceLfPerMin) || 60
  if (hrs <= 0 || lf <= 0 || pace <= 0) return 0
  return ((hrs / 8) * (lf * 2)) / pace
}
// Vendor→Standard→fallback material price (mirrors lib/materialCatalog.resolveMaterialPrice).
function resolveMaterialPrice(name, vendorId, materialRows, priceMap, fallback = 0) {
  if (vendorId && !isStandardSel(vendorId)) {
    const row = (materialRows || []).find(r => r.name === name && r.vendor_id === vendorId)
    if (row && row.unit_cost != null && row.unit_cost !== '') return num(row.unit_cost)
  }
  const p = priceMap?.[name]
  return p != null ? p : fallback
}

export const DEFAULTS = { laborRatePerHour: 35, laborBurdenPct: 0.29, gpmd: 425 }

// Identity-only: each entry carries the DB rate name (`db`). Price/labor coefficients are
// read LIVE from the rate map — no hardcoded fallbacks (a missing rate ⇒ 0).
export const FINISHES_RATES = {
  flatTile: { db: 'Finishes Tile Flatwork' },
  flatBrick: { db: 'Finishes Brick Flatwork' },
  flatFlagstone: { db: 'Finishes Flagstone Flatwork' },
  flatPorcelain: { db: 'Finishes Porcelain Flatwork' },
  capFlagstone: { db: 'Finishes Cap Flagstone' },
  capPrecast: { db: 'Finishes Cap Precast' },
  capBullnose: { db: 'Finishes Cap Bullnose Brick' },
  concreteTruck: { db: 'Finishes Concrete Truck' },
  sandStucco: { db: 'Sand Stucco - Finishes' },
  smoothStucco: { db: 'Smooth Stucco - Finishes' },
  ledgerstone: { db: 'Ledgerstone - Finishes' },
  stackedStone: { db: 'Stacked Stone - Finishes' },
  tile: { db: 'Tile - Finishes' },
  realFlagstone: { db: 'Real Flagstone - Finishes' },
  realStone: { db: 'Real Stone - Finishes' },
  flatTileLab: { db: 'Finishes Tile Flatwork Labor Rate' },
  flatBrickLab: { db: 'Finishes Brick Flatwork Labor Rate' },
  flatFlagstoneLab: { db: 'Finishes Flagstone Flatwork Labor Rate' },
  flatPorcelainLab: { db: 'Finishes Porcelain Flatwork Labor Rate' },
  sandStuccoLab: { db: 'Sand Stucco - Finishes Labor Rate' },
  smoothStuccoLab: { db: 'Smooth Stucco - Finishes Labor Rate' },
  ledgerstoneLab: { db: 'Ledgerstone - Finishes Labor Rate' },
  stackedStoneLab: { db: 'Stacked Stone - Finishes Labor Rate' },
  tileLab: { db: 'Tile - Finishes Labor Rate' },
  flagstoneLab: { db: 'Real Flagstone - Finishes Labor Rate' },
  realStoneLab: { db: 'Real Stone - Finishes Labor Rate' },
  capFlagstoneLab: { db: 'Finishes Cap Flagstone Labor Rate' },
  capPrecastLab: { db: 'Finishes Cap Precast Labor Rate' },
  capPipLab: { db: 'Finishes Cap PIP Concrete Labor Rate' },
  capBullnoseLab: { db: 'Finishes Cap Bullnose Labor Rate' },
  stoneScrews: { db: 'Finishes Stone Screws' },
  tileAdhesive: { db: 'Finishes Tile Adhesive/Grout' },
}

// FINISHES_RATES matKey → catalog Item name, for the vendor-aware price lookup.
export const FINISH_CAT_ITEM = {
  capFlagstone: 'Flagstone',
  capPrecast: 'Precast',
  capBullnose: 'Bullnose Brick',
  flatTile: 'Tile Flatwork',
  flatBrick: 'Brick Flatwork',
  flatFlagstone: 'Flagstone Flatwork',
  flatPorcelain: 'Porcelain Flatwork',
  sandStucco: 'Sand Stucco - Finishes',
  smoothStucco: 'Smooth Stucco - Finishes',
  ledgerstone: 'Ledgerstone - Finishes',
  stackedStone: 'Stacked Stone - Finishes',
  tile: 'Tile - Finishes',
  realFlagstone: 'Real Flagstone - Finishes',
  realStone: 'Real Stone - Finishes',
}

// Vendor-aware material price for a FINISHES_RATES key: a real vendor's catalog Item price
// when that vendor carries the mapped Item; otherwise the name-keyed Standard price.
function finishMatPriceV(matKey, vendor, materialRows, mp) {
  const spec = FINISHES_RATES[matKey]
  const item = FINISH_CAT_ITEM[matKey]
  if (vendor && vendor !== 'Standard' && item) {
    const vp = resolveMaterialPrice(item, vendor, materialRows, {}, NaN)
    if (Number.isFinite(vp)) return vp
  }
  return n(mp?.[spec.db])
}

// ── Per-row calculators — identical formulas to the original, fed the vendor-resolved
//    material price. subUnit = flat $/unit default for the Sub tab. ─────────────────
export function computeFlatRow(row, mp, materialRows, R = null, isSub = false) {
  const sf = n(row.sf)
  const v = row.vendor
  const price = k => finishMatPriceV(k, v, materialRows, mp)
  const lab = k => n(mp?.[FINISHES_RATES[k].db])
  // labH: labor-hrs read routed through R (records an unset rate for the fix-it banner)
  // only on the in-house path with a real quantity. Value-identical to lab() — R reads
  // the same map — so no math change; Sub-tab labor never surfaces.
  const labH = (k, qty, label) =>
    R && !isSub && n(qty) > 0
      ? R.labor(FINISHES_RATES[k].db, { category: 'Finishes', unit: 'Hrs per Sq Ft', label })
      : n(mp?.[FINISHES_RATES[k].db])
  let mat = 0, hrs = 0, subUnit = 0, tons = 0
  switch (row.type) {
    case 'Tile':
      mat = sf * price('flatTile'); hrs = sf > 0 ? sf * labH('flatTileLab', sf, 'Tile Flatwork') : 0; subUnit = price('flatTile'); break
    case 'Brick':
      mat = sf * 2 * price('flatBrick'); hrs = sf > 0 ? sf * labH('flatBrickLab', sf, 'Brick Flatwork') : 0; subUnit = 2 * price('flatBrick'); break
    case 'Flagstone': {
      const rate = n(row.rateIn) || price('flatFlagstone')
      mat = sf > 0 ? sf * rate : 0; hrs = sf > 0 ? sf * labH('flatFlagstoneLab', sf, 'Flagstone Flatwork') : 0; subUnit = rate; break
    }
    case 'Porcelain':
      mat = sf * price('flatPorcelain'); hrs = sf > 0 ? sf * labH('flatPorcelainLab', sf, 'Porcelain Flatwork') : 0; subUnit = price('flatPorcelain'); break
    default: break
  }
  const subEach = row.subEach !== '' && row.subEach != null ? n(row.subEach) : subUnit
  return { mat, hrs, subUnit, subEach, subMat: sf * subEach, tons, unit: 'SF' }
}

export function computeCapRow(row, mp, materialRows, R = null, isSub = false) {
  const lf = n(row.lf), widthIn = n(row.widthIn), qty = n(row.qty)
  const v = row.vendor
  const price = k => finishMatPriceV(k, v, materialRows, mp)
  // labor-hrs read routed through R (in-house only, guarded by qty) so an unset cap
  // labor rate surfaces in the fix-it banner; value-identical to a plain map read.
  const labH = (k, q, label, unit) =>
    R && !isSub && n(q) > 0
      ? R.labor(FINISHES_RATES[k].db, { category: 'Finishes', unit, label })
      : n(mp?.[FINISHES_RATES[k].db])
  let mat = 0, hrs = 0, subUnit = 0, subQty = 0, unit = 'LF'
  switch (row.type) {
    case 'Flagstone':
      mat = lf * price('capFlagstone'); hrs = lf * labH('capFlagstoneLab', lf, 'Cap Flagstone', 'Hrs per Ln Ft'); subUnit = price('capFlagstone'); subQty = lf; break
    case 'Precast':
      mat = qty * price('capPrecast'); hrs = qty * labH('capPrecastLab', qty, 'Cap Precast', 'Hrs per Each'); subUnit = price('capPrecast'); subQty = qty; unit = 'Qty'; break
    case 'PIP Concrete':
      mat = ((lf * (widthIn / 12) * 0.333) / 27) * price('concreteTruck'); hrs = lf * labH('capPipLab', lf, 'Cap PIP Concrete', 'Hrs per Ln Ft')
      subUnit = (((widthIn / 12) * 0.333) / 27) * price('concreteTruck'); subQty = lf; break
    case 'Bullnose Brick':
      mat = lf * price('capBullnose'); hrs = lf * labH('capBullnoseLab', lf, 'Cap Bullnose Brick', 'Hrs per Ln Ft'); subUnit = price('capBullnose'); subQty = lf; break
    default: break
  }
  const subEach = row.subEach !== '' && row.subEach != null ? n(row.subEach) : subUnit
  return { mat, hrs, subUnit, subEach, subMat: subQty * subEach, unit, lf, qty, widthIn }
}

export function computeWallRow(row, mp, materialRows, R = null, isSub = false) {
  const sf = n(row.sf)
  const v = row.vendor
  const price = k => finishMatPriceV(k, v, materialRows, mp)
  // lab: plain map read — used for MATERIAL consumables (stone screws, tile adhesive).
  const lab = k => n(mp?.[FINISHES_RATES[k].db])
  // labH: labor-hrs read routed through R (in-house only, guarded by sf) so an unset
  // wall-finish labor rate surfaces in the fix-it banner; value-identical to lab().
  const labH = (k, qty, label) =>
    R && !isSub && n(qty) > 0
      ? R.labor(FINISHES_RATES[k].db, { category: 'Finishes', unit: 'Hrs per Sq Ft', label })
      : n(mp?.[FINISHES_RATES[k].db])
  let mat = 0, hrs = 0, subUnit = 0, tons = 0
  switch (row.type) {
    case 'Sand Stucco':
      hrs = sf > 0 ? sf * labH('sandStuccoLab', sf, 'Sand Stucco') : 0; mat = sf * price('sandStucco'); subUnit = price('sandStucco'); break
    case 'Smooth Stucco':
      hrs = sf > 0 ? sf * labH('smoothStuccoLab', sf, 'Smooth Stucco') : 0; mat = sf * price('smoothStucco'); subUnit = price('smoothStucco'); break
    case 'Ledgerstone':
      hrs = sf > 0 ? sf * labH('ledgerstoneLab', sf, 'Ledgerstone') : 0
      mat = sf > 0 ? sf * price('ledgerstone') * 1.1 + sf * lab('stoneScrews') : 0
      subUnit = price('ledgerstone') * 1.1 + lab('stoneScrews'); break
    case 'Stacked Stone':
      hrs = sf > 0 ? sf * labH('stackedStoneLab', sf, 'Stacked Stone') : 0
      mat = sf > 0 ? sf * price('stackedStone') * 1.1 + sf * lab('stoneScrews') : 0
      subUnit = price('stackedStone') * 1.1 + lab('stoneScrews'); break
    case 'Tile':
      hrs = sf > 0 ? sf * labH('tileLab', sf, 'Tile') : 0
      mat = sf > 0 ? sf * price('tile') + sf * lab('tileAdhesive') : 0
      subUnit = price('tile') + lab('tileAdhesive'); break
    case 'Real Flagstone': {
      const rate = n(row.rateIn) || price('realFlagstone')
      hrs = sf > 0 ? sf * labH('flagstoneLab', sf, 'Real Flagstone') : 0; mat = sf > 0 ? sf * rate : 0; subUnit = rate; break
    }
    case 'Real Stone': {
      const rate = n(row.rateIn) || price('realStone')
      hrs = sf > 0 ? sf * labH('realStoneLab', sf, 'Real Stone') : 0; mat = sf > 0 ? sf * rate : 0; subUnit = rate; break
    }
    default: break
  }
  const subEach = row.subEach !== '' && row.subEach != null ? n(row.subEach) : subUnit
  return { mat, hrs, subUnit, subEach, subMat: sf * subEach, tons, unit: 'SF' }
}

// ── Calculation engine ────────────────────────────────────────────────────────
// In-House: coverage/geometry material + labor hours (all preserved exactly).
// Sub: flat $/unit per row, NO labor hours, routed into subCost.
export function calcFinishes(
  state,
  lrph = DEFAULTS.laborRatePerHour,
  mp = {},
  gpmd = DEFAULTS.gpmd,
  walkAccess = null,
  laborBurdenPct = DEFAULTS.laborBurdenPct,
  materialRows = []
) {
  const _pace = n(walkAccess?.paceLfPerMin)
  const { difficulty, hoursAdj, flatworkRows, capRows, wallFinishRows, manualRows } = state
  const isSubTab = state.subType === 'Subcontractor'

  // ONE rate reader for this calc pass. Finishes' labor rates live in the same `mp`
  // map, so route labor through it; an unset in-house labor rate is recorded on
  // R.unpriced and surfaced in the fix-it banner. Value-identical to a plain map read.
  const R = makeModuleRates({ material: mp, labor: mp, sub: mp, misc: mp, materialRows })

  const flat = (flatworkRows || []).map(row => computeFlatRow(row, mp, materialRows, R, isSubTab))
  const caps = (capRows || []).map(row => computeCapRow(row, mp, materialRows, R, isSubTab))
  const walls = (wallFinishRows || []).map(row => computeWallRow(row, mp, materialRows, R, isSubTab))
  const sum = (arr, k) => arr.reduce((a, x) => a + (x[k] || 0), 0)

  let manHrs = 0, manMat = 0, manSub = 0
  ;(manualRows || []).forEach(r => {
    manHrs += n(r.hours); manMat += n(r.materials); manSub += n(r.subCost)
  })

  const baseHrs = sum(flat, 'hrs') + sum(caps, 'hrs') + sum(walls, 'hrs') + manHrs
  const diffMod = 1 + n(difficulty) / 100
  const _preWalkHrs = baseHrs * diffMod + n(hoursAdj)
  const walkHrs = calcWalkAccessLabor(_preWalkHrs, state.distanceLF, { paceLfPerMin: _pace })
  const totalHrsIH = _preWalkHrs + walkHrs

  const totalMatIH = sum(flat, 'mat') + sum(caps, 'mat') + sum(walls, 'mat') + manMat
  const totalSubMat = sum(flat, 'subMat') + sum(caps, 'subMat') + sum(walls, 'subMat')

  const subMarkup = n(state.subGpMarkupRate)
  let gp, subCost, subGp, commission, price, totalHrs, manDays, totalMat, laborCost, burden
  if (isSubTab) {
    totalHrs = 0; manDays = 0; laborCost = 0; burden = 0; totalMat = 0; gp = 0
    subCost = totalSubMat + manSub
    subGp = subCost * subMarkup
    commission = subGp * n(state.commissionRate)
    price = subCost + subGp + commission
  } else {
    totalHrs = totalHrsIH
    manDays = totalHrs / 8
    totalMat = totalMatIH
    laborCost = totalHrs * lrph
    burden = laborCost * n(laborBurdenPct)
    gp = manDays * gpmd
    subCost = manSub
    subGp = 0
    commission = gp * n(state.commissionRate)
    price = totalMat + laborCost + burden + gp + commission + subCost
  }

  return { unpriced: R.unpricedList, walkHrs, totalHrs, manDays, totalMat, laborCost, burden, gp, subGp, commission, subCost, price, flat, caps, walls }
}
