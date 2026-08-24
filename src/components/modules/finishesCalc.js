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
// `key` is the immutable material ref_key (MAT-NNN-slug); id/name still resolve so a
// legacy save keeps working. Matching by ref_key makes the vendor price survive a
// catalog rename (the description is editable; the ref_key is frozen).
function resolveMaterialPrice(key, vendorId, materialRows, priceMap, fallback = 0) {
  if (vendorId && !isStandardSel(vendorId)) {
    const row = (materialRows || []).find(
      r => (r.ref_key === key || r.id === key || r.name === key) && r.vendor_id === vendorId
    )
    if (row && row.unit_cost != null && row.unit_cost !== '') return num(row.unit_cost)
  }
  const p = priceMap?.[key]
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

// FINISHES_RATES matKey → catalog Item frozen ref_key (MAT-NNN-slug), for the
// vendor-aware price lookup. Keyed by ref_key (not the editable description) so a
// rename in Master Material Rates never breaks the vendor price. All rows are the
// Finishes-category records (MAT-093..107); same-named Walls/Pool items are excluded
// by construction — the ref_key resolves exactly one row.
export const FINISH_CAT_ITEM = {
  capFlagstone: 'MAT-094-flagstone',
  capPrecast: 'MAT-095-precast',
  capBullnose: 'MAT-093-bullnose-brick',
  flatTile: 'MAT-107-tile-flatwork',
  flatBrick: 'MAT-096-brick-flatwork',
  flatFlagstone: 'MAT-098-flagstone-flatwork',
  flatPorcelain: 'MAT-100-porcelain-flatwork',
  sandStucco: 'MAT-103-sand-stucco-finishes',
  smoothStucco: 'MAT-104-smooth-stucco-finishes',
  ledgerstone: 'MAT-099-ledgerstone-finishes',
  stackedStone: 'MAT-105-stacked-stone-finishes',
  tile: 'MAT-106-tile-finishes',
  realFlagstone: 'MAT-101-real-flagstone-finishes',
  realStone: 'MAT-102-real-stone-finishes',
}

// ── Shared finish/cap TYPE label → frozen ref_key ────────────────────────────
// Built-in wall-finish and cap pickers (Walls / Fire Pit / Outdoor Kitchen) store
// a fixed TYPE label ('Sand Stucco', 'Real Flagstone', 'Flagstone' cap, …). All
// three price a real vendor's OVERRIDE by matching that label against the shared
// Finishes-category record's editable description — so renaming the record breaks
// the override. These maps let a module resolve the label → the record's IMMUTABLE
// ref_key and match by ref_key first (rename-safe), falling back to the label.
// Multiple label spellings per finish (module-specific: 'Ledgerstone' vs
// 'Ledgerstone Veneer', 'Stacked Stone' vs 'Stacked Stone Veneer') all point at the
// one shared record. Caps with no material record (PIP Concrete = poured in place)
// are intentionally absent → null → the caller keeps its name/label match.
export const FINISH_TYPE_REFKEY = {
  'Sand Stucco': FINISH_CAT_ITEM.sandStucco,
  'Smooth Stucco': FINISH_CAT_ITEM.smoothStucco,
  Ledgerstone: FINISH_CAT_ITEM.ledgerstone,
  'Ledgerstone Veneer': FINISH_CAT_ITEM.ledgerstone,
  'Stacked Stone': FINISH_CAT_ITEM.stackedStone,
  'Stacked Stone Veneer': FINISH_CAT_ITEM.stackedStone,
  Tile: FINISH_CAT_ITEM.tile,
  'Real Flagstone': FINISH_CAT_ITEM.realFlagstone,
  'Real Stone': FINISH_CAT_ITEM.realStone,
}
export const CAP_TYPE_REFKEY = {
  Flagstone: FINISH_CAT_ITEM.capFlagstone,
  Precast: FINISH_CAT_ITEM.capPrecast,
  'Bullnose Brick': FINISH_CAT_ITEM.capBullnose,
}

// Shared finish RECORD NAME ('<Type> - Finishes') → frozen ref_key. Columns / Fire
// Pit / Outdoor Kitchen read a built-in finish's Standard price by this name; this
// lets them read by ref_key instead (rename-safe) with a name fallback. (M7)
export const FINISH_NAME_REFKEY = {
  'Sand Stucco - Finishes': FINISH_CAT_ITEM.sandStucco,
  'Smooth Stucco - Finishes': FINISH_CAT_ITEM.smoothStucco,
  'Ledgerstone - Finishes': FINISH_CAT_ITEM.ledgerstone,
  'Stacked Stone - Finishes': FINISH_CAT_ITEM.stackedStone,
  'Tile - Finishes': FINISH_CAT_ITEM.tile,
  'Real Flagstone - Finishes': FINISH_CAT_ITEM.realFlagstone,
  'Real Stone - Finishes': FINISH_CAT_ITEM.realStone,
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
  // Standard price: read by the material's FROZEN ref_key first (the rate map is
  // dual-keyed by ref_key + name, so this is value-identical today) and fall back to
  // the DB name only for a material with no ref_key map (e.g. concreteTruck). Once
  // the map stops name-keying materials, the ref_key read is what keeps this working —
  // and a renamed catalog record no longer zeroes the Standard price. (M7)
  if (item && mp?.[item] != null) return n(mp[item])
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
