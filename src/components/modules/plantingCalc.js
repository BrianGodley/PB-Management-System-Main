// Pure Planting calc — extracted from PlantingModule.jsx so the math is unit-testable
// without React/Supabase. Logic identical. calcWalkAccessLabor (lib/walkAccess) and the
// catalog resolvers resolveMaterialPrice/catalogItemFor (lib/materialCatalog) both
// transitively import supabase, so their pure bodies are inlined here and kept in sync.
import { LAB } from '../../lib/laborRefs.js'
import { MAT } from '../../lib/materialRefs.js'
const n = v => parseFloat(v) || 0
const num = v => { const x = typeof v === 'number' ? v : parseFloat(v); return Number.isFinite(x) ? x : 0 }
const DEFAULT_WALK_ACCESS_PACE_LF_PER_MIN = 60
const isStandardSel = v => !v || v === 'Standard'

function calcWalkAccessLabor(laborSubtotalHrs, distanceLF, opts = {}) {
  const hrs = n(laborSubtotalHrs); const lf = n(distanceLF)
  const pace = n(opts.paceLfPerMin) || DEFAULT_WALK_ACCESS_PACE_LF_PER_MIN
  if (hrs <= 0 || lf <= 0 || pace <= 0) return 0
  return ((hrs / 8) * (lf * 2)) / pace
}
// Vendor→Standard→fallback material price (mirrors lib/materialCatalog.resolveMaterialPrice).
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
// Catalog option/item resolvers (pure bodies mirror lib/materialCatalog).
function catalogOptions(materialRows, subcategory, vendorSel, { standardRows = 'exclude', stripPrefix = false, category = null } = {}) {
  const isStandard = isStandardSel(vendorSel) || vendorSel === 'Custom'
  if (isStandard && standardRows === 'exclude') return []
  const prefix = `${subcategory} - `
  return (materialRows || [])
    .filter(r => r.sub_category === subcategory && (!category || r.category === category) && (isStandard ? r.vendor_id == null : r.vendor_id === vendorSel))
    .map(r => {
      const label = stripPrefix && r.name && r.name.startsWith(prefix) ? r.name.slice(prefix.length) : r.name
      return { id: r.id, value: r.id, ref_key: r.ref_key || null, label, stored: label, row: r }
    })
}
function catalogItemFor(materialRows, subcategory, vendorSel, key, opts = {}) {
  const { fallbackFirst = true, ...rest } = opts
  const options = catalogOptions(materialRows, subcategory, vendorSel, rest)
  if (!options.length) return null
  if (!key) return fallbackFirst ? options[0].row : null
  // Immutable pointers first: material ref_key (MAT-NNN-slug) or id, then legacy label/name.
  const byRef = options.find(o => o.ref_key && o.ref_key === key)
  if (byRef) return byRef.row
  const byId = options.find(o => o.id === key)
  if (byId) return byId.row
  const byLabel = options.find(o => o.stored === key || o.label === key)
  if (byLabel) return byLabel.row
  return fallbackFirst ? options[0].row : null
}

// ── Module const/helper block (carried verbatim) ─────────────────────────────
const PLANTING_CATEGORY = 'Planting'
const PLANTS_SUBCAT = 'Plants'
const plantMatPrice = resolveMaterialPrice
const lr = (laborRates, key) => n(laborRates[key])

// Resolve a plant row's install labor (hrs per plant). Resolves the picked plant
// material (row.type may be the material ref_key, id, or legacy name — catalogItemFor
// handles all three) and reads its Default Labor pointer (calc_meta.labor_rate, a
// labor ref_key or legacy name — laborRates is dual-keyed). Shared by the calc AND
// the module's live display so both always agree. Returns 0 when unset (the calc
// surfaces that separately via laborUnset — never a hidden fallback).
export function plantInstallPerDay(row, materialRows, laborRates) {
  const it = catalogItemFor(materialRows, PLANTS_SUBCAT, row?.vendor, row?.type, {
    standardRows: 'null-vendor',
    stripPrefix: true,
    category: PLANTING_CATEGORY,
    fallbackFirst: false,
  })
  return n(laborRates?.[it?.calc_meta?.labor_rate || null])
}

// Planting Add-On item catalog (the Item dropdown; NOT from the DB). Each add-on
// carries its own labor formula + material/labor DB names. Exported so the
// coverage manifest + module share one source. mode 'perDay' → hrs = qty×rate
// (hours/unit, guarded); 'perMin' → hrs = (qty×rate)/60 (minutes/unit).
// matRef = the add-on material's frozen ref_key (M7): the Standard price reads by
// ref_key (rename-safe) first, matKey name as fallback.
export const ADDON_META = {
  'Tree Stake': { matKey: 'Tree Stake', matRef: MAT.TREE_STAKE, labKey: 'Tree Stakes - Install Rate', mode: 'perDay', unit: 'ea', labUnit: 'hrs per Each' },
  'Root Barrier 12"': { matKey: 'Root Barrier 12in', matRef: MAT.ROOT_BARRIER_12, labKey: 'Root Barrier - Install Rate', mode: 'perDay', unit: 'LF', labUnit: 'hrs per Ln Ft' },
  'Root Barrier 24"': { matKey: 'Root Barrier 24in', matRef: MAT.ROOT_BARRIER_24, labKey: 'Root Barrier - Install Rate', mode: 'perDay', unit: 'LF', labUnit: 'hrs per Ln Ft' },
  'Gopher Basket 1 gal': { matKey: 'Gopher Basket 1 Gal', matRef: MAT.GOPHER_BASKET_1, labKey: 'Gopher Basket - Install Rate', mode: 'perDay', unit: 'ea', labUnit: 'hrs per Each' },
  'Gopher Basket 5 gal': { matKey: 'Gopher Basket 5 Gal', matRef: MAT.GOPHER_BASKET_5, labKey: 'Gopher Basket - Install Rate', mode: 'perDay', unit: 'ea', labUnit: 'hrs per Each' },
  'Gopher Basket 15 gal': { matKey: 'Gopher Basket 15 Gal', matRef: MAT.GOPHER_BASKET_15, labKey: 'Gopher Basket - Install Rate', mode: 'perDay', unit: 'ea', labUnit: 'hrs per Each' },
  'Mesh Flat': { matKey: 'Mesh Flat', matRef: MAT.MESH_FLAT, labKey: 'Mesh Flat - Install Rate', mode: 'perDay', unit: 'SF', labUnit: 'hrs per Sq Ft' },
  'Jute Fabric': { matKey: 'Jute Fabric', matRef: MAT.JUTE_FABRIC, labKey: 'Jute Fabric - Install Rate', mode: 'perDay', unit: 'SF', labUnit: 'hrs per Sq Ft' },
}

// ── Per-row calculators ──────────────────────────────────────────────────────
// Plant row: In-House material = qty × the row's (editable, vendor-defaulted) unit
// price. Hours and material are INDEPENDENT — an unset labor rate never zeroes the
// material (and vice-versa); unpriced labor surfaces via the banner instead.
export function computePlantRow(row, perDay) {
  if (!row.type) return { qty: n(row.qty), hrs: 0, mat: 0, subUnit: 0, subEach: 0, subMat: 0 }
  const qty = n(row.qty)
  // Hours and material resolve INDEPENDENTLY. An unset labor rate (perDay 0) must
  // NOT zero the material, and an unpriced plant must NOT zero the labor — each is
  // guarded on its own value. Unpriced labor still surfaces via the module's
  // unpriced banner (plantPerDay pushes to laborUnset); this only stops one missing
  // rate from silently zeroing the other.
  const hrs = qty > 0 && perDay > 0 ? qty * perDay : 0 // perDay is hours per plant
  const mat = qty > 0 ? qty * n(row.price) : 0
  const subUnit = n(row.price)
  const subEach = row.subEach !== '' && row.subEach != null ? n(row.subEach) : subUnit
  const subMat = qty > 0 ? qty * subEach : 0
  return { qty, hrs, mat, subUnit, subEach, subMat }
}

// Add-on row: labor formula identical to the original per-item math; material is
// vendor-resolved (Standard = original mp() price).
export function computeAddonRow(row, laborRates, materialPrices, materialRows) {
  if (!row.type)
    return { qty: n(row.qty), hrs: 0, mat: 0, subUnit: 0, subEach: 0, subMat: 0, rate: 0, unitPrice: 0, unit: '' }
  const meta = ADDON_META[row.type] || {}
  const qty = n(row.qty)
  const rate = lr(laborRates, meta.labKey)
  let hrs = 0
  if (meta.mode === 'perDay') hrs = qty * rate // rate is hours per unit
  else if (meta.mode === 'perMin') hrs = (qty * rate) / 60
  const unitPrice = plantMatPrice(meta.matRef || meta.matKey, row.vendor, materialRows, materialPrices)
  const mat = qty * unitPrice
  const subUnit = unitPrice
  const subEach = row.subEach !== '' && row.subEach != null ? n(row.subEach) : subUnit
  const subMat = qty * subEach
  return { qty, hrs, mat, subUnit, subEach, subMat, rate, unitPrice, unit: meta.unit }
}

// ── Calc ─────────────────────────────────────────────────────────────────────
// In-House: every formula preserved byte-for-byte from the original calc.
// Sub: flat $/unit per row, NO labor hours, itemized cost routed into subCost.
export function calcPlanting(
  state,
  laborRatePerHour,
  gpmd,
  materialPrices,
  laborRates,
  walkAccess = null,
  laborBurdenPct,
  materialRows = [],
  commissionRate
) {
  const _pace = parseFloat(walkAccess?.paceLfPerMin) || DEFAULT_WALK_ACCESS_PACE_LF_PER_MIN
  const {
    tillSqft,
    difficulty,
    hoursAdj,
    smallPlantRows,
    largePlantRows,
    addonRows,
    otherAddons = {},
    manualRows,
  } = state
  const isSubTab = state.subType === 'Subcontractor'

  // Till and Amend
  const sqft = n(tillSqft)
  const soilCY = (sqft * 0.167) / 27
  const soilMoveRate = lr(laborRates, LAB.TILL_SOIL_MOVE)
  const tillingRate = lr(laborRates, LAB.TILL_TILLING)
  const amendRate = lr(laborRates, LAB.TILL_AMEND)
  // Till rates are hours per unit (hrs/CY, hrs/SF), so hours = measure × rate.
  const tillHrs =
    sqft > 0 && soilMoveRate > 0 && tillingRate > 0 && amendRate > 0
      ? soilCY * soilMoveRate + sqft * tillingRate + sqft * amendRate
      : 0

  // Items whose picked plant has no labor rate set (calc_meta.labor_rate unset or
  // resolves to 0). Surfaced as a prompt so the user fixes it — never a fallback.
  const laborUnset = []
  const plantPerDay = r => {
    const it = catalogItemFor(materialRows, PLANTS_SUBCAT, r.vendor, r.type, {
      standardRows: 'null-vendor',
      stripPrefix: true,
      category: PLANTING_CATEGORY,
      fallbackFirst: false,
    })
    const laborName = it?.calc_meta?.labor_rate || null
    const perDay = plantInstallPerDay(r, materialRows, laborRates)
    if (r.type && n(r.qty) > 0 && perDay <= 0) laborUnset.push({ kind: 'labor', name: laborName, label: r.type, category: 'Planting', unit: null })
    return perDay
  }

  // Small plants
  const smalls = (smallPlantRows || []).map(r => computePlantRow(r, plantPerDay(r)))
  const smallHrs = smalls.reduce((a, x) => a + x.hrs, 0)
  const smallMat = smalls.reduce((a, x) => a + x.mat, 0)
  const smallSubMat = smalls.reduce((a, x) => a + x.subMat, 0)

  // Large plants
  const larges = (largePlantRows || []).map(r => computePlantRow(r, plantPerDay(r)))
  const largeHrs = larges.reduce((a, x) => a + x.hrs, 0)
  const largeMat = larges.reduce((a, x) => a + x.mat, 0)
  const largeSubMat = larges.reduce((a, x) => a + x.subMat, 0)

  const plantHrs = tillHrs + smallHrs + largeHrs

  // Add-on labor (all times in hours)
  const addonResults = (addonRows || []).map(r =>
    computeAddonRow(r, laborRates, materialPrices, materialRows)
  )
  let addonHrs = addonResults.reduce((a, x) => a + x.hrs, 0)
  let addonMat = addonResults.reduce((a, x) => a + x.mat, 0)
  const addonSubMat = addonResults.reduce((a, x) => a + x.subMat, 0)

  const craneSub = n(otherAddons.craneCost)
  addonHrs += n(otherAddons.addonHours)
  addonMat += n(otherAddons.addonMaterials)
  addonMat += n(otherAddons.deliveryCharges)

  // Difficulty
  const diffPct = n(difficulty) / 100
  const diffHrs = (plantHrs + addonHrs) * diffPct

  // Manual entry
  let manHrs = 0, manMat = 0, manSub = 0
  ;(manualRows || []).forEach(r => {
    manHrs += n(r.hours)
    manMat += n(r.materials)
    manSub += n(r.subCost)
  })

  // Optional yard checks — return visits for watering/health checks during the
  // establishment period. Default 3 hrs + 2% of plant material; both editable.
  // Not scaled by difficulty or walk access.
  const yc = state.yardCheck || {}
  const ycOn = !!yc.enabled
  const ycHrs =
    yc.hours === '' || yc.hours == null
      ? yc.manDays != null && yc.manDays !== ''
        ? n(yc.manDays) * 8
        : 3
      : n(yc.hours)
  const ycPct = yc.pct === '' || yc.pct == null ? 2 : n(yc.pct)
  const yardCheckHrs = ycOn ? ycHrs : 0
  const yardCheckMat = ycOn ? (smallMat + largeMat) * (ycPct / 100) : 0

  const _preWalkHrs = plantHrs + addonHrs + diffHrs + manHrs + (parseFloat(hoursAdj) || 0)
  const walkHrsIH = calcWalkAccessLabor(_preWalkHrs, state.distanceLF, { paceLfPerMin: _pace })
  const totalHrsIH = _preWalkHrs + walkHrsIH + yardCheckHrs
  const totalMatIH = smallMat + largeMat + addonMat + manMat + yardCheckMat
  const totalSubMat = smallSubMat + largeSubMat + addonSubMat

  const subMarkup = n(state.subGpMarkupRate)
  let totalHrs, manDays, totalMat, laborCost, burden, gp, subGp, subCost, commission, price, walkHrs
  if (isSubTab) {
    walkHrs = 0
    totalHrs = 0
    manDays = 0
    laborCost = 0
    burden = 0
    totalMat = 0
    gp = 0
    subCost = totalSubMat + manSub + craneSub
    subGp = subCost * subMarkup
    commission = subGp * n(commissionRate)
    price = subCost + subGp + commission
  } else {
    walkHrs = walkHrsIH
    totalHrs = totalHrsIH
    manDays = totalHrs / 8
    totalMat = totalMatIH
    laborCost = totalHrs * n(laborRatePerHour)
    burden = laborCost * n(laborBurdenPct)
    subCost = craneSub + manSub
    gp = manDays * n(gpmd)
    subGp = 0
    commission = gp * n(commissionRate)
    price = totalMat + laborCost + burden + gp + commission + subCost
  }

  return {
    totalHrs, manDays, totalMat, laborCost, burden, subCost, gp, subGp, commission, price,
    walkHrs, tillHrs, smallHrs, largeHrs, addonHrs, diffHrs, yardCheckHrs, yardCheckMat,
    smalls, larges, addonResults,
    laborUnset: isSubTab
      ? []
      : (() => {
          const seen = new Set()
          return laborUnset.filter(u => {
            const k = u && (u.name || u.label)
            if (!k || seen.has(k)) return false
            seen.add(k)
            return true
          })
        })(),
  }
}
