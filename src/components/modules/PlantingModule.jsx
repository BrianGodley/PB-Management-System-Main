import WorkTypeChooser from './WorkTypeChooser'
import CrewTypeBar from './CrewTypeBar'
import ModuleHeaderSlot from './ModuleHeaderSlot'
import { useState, useEffect, useCallback, useContext } from 'react'
import { SubTabContext, subSectionTitle } from './subTabContext'
import { supabase } from '../../lib/supabase'
import GpmdBar from './GpmdBar'
import RateEditPopover from '../RateEditPopover'
import { fetchSalesTaxRate } from '../../lib/companyDefaults'
import { calcWalkAccessLabor, DEFAULT_WALK_ACCESS_PACE_LF_PER_MIN } from '../../lib/walkAccess'
import { resolveMaterialPrice, catalogOptions, fetchModuleCatalog, fetchStandardRateMap } from '../../lib/materialCatalog'

// ─────────────────────────────────────────────────────────────────────────────
// Planting Module
// Material prices  → material_rates  (category = 'Planting')  keyed by name
// Labor rates      → labor_rates     (category = 'Planting')  keyed by name
//   Plant types:   rate = plants per man-day
//   Till - Soil Move Rate:           rate = CY/hour
//   Till - Tilling Rate:             rate = sqft/hour
//   Till - Amend Rate:               rate = sqft/hour
//   Tree Stakes - Install Rate:      rate = stakes/day
//   Root Barrier - Install Rate:     rate = min/LF
//   Gopher Basket - Install Rate:    rate = min/basket
//   Mesh Flat - Install Rate:        rate = min/sqft
//   Jute Fabric - Install Rate:      rate = min/sqft
//
// Vendor + Item catalog SELECTION
//   Every material section (Small Plants, Large Plants, Planting Add-Ons) is an
//   add/remove ROW table with a Vendor column + an Item column. The Item drives
//   the pricing/labor FORMULA (per-plant/day, per-size, install rate) exactly as
//   before; the Vendor ONLY changes where the MATERIAL unit price comes from
//   (Standard named-rate fallback vs. a vendor's material_rates row). Vendor 'Standard'
//   resolves to the original math, so In-House numbers never move.
//
//   In-House and Subcontractor are independent calculators (makeTab / ihTab /
//   subTab). The Sub tab prices each row at a flat $/unit with NO labor hours and
//   routes the itemized cost into subCost (GpmdBar's 'sub' variant).
// ─────────────────────────────────────────────────────────────────────────────

const PLANTING_CATEGORY = 'Planting'

// Plant-type catalogs — identity ONLY (which Items are "small" vs "large"). Every
// per-hour install rate (labor_rates) and unit price (material / misc_rates) is
// read live from the DB — no hardcoded rate fallbacks. Missing values are
// guaranteed by supabase-planting-fallbacks-seed.sql.
const SMALL_PLANT_TYPES = [
  'Flats of Groundcover',
  'Flats of 4" pots',
  '4" pots standard',
  '4" pots succulents',
  '6" pots standard',
  '6" pots succulents',
  '1 gallon standard',
  '1 gallon premium',
  '1 gallon succulents',
  '3 gallon standard',
  '5 gallon standard',
  '5 gallon premium',
  '5 gallon succulents',
  '5 gallon bamboo',
  '5 gallon palm',
]
const LARGE_PLANT_TYPES = [
  '15 gallon standard',
  '15 gallon premium',
  '15 gallon succulents',
  '15 gallon fruit',
  '15 gallon palms',
  '24" box standard',
  '24" box premium',
  '24" box fruit',
  '24" box palm',
  '36" box standard',
  '36" box premium',
  '36" box fruit',
  '36" box palm',
  '48" box standard',
  '48" box premium',
  '48" box fruit',
  '48" box palm',
]
// Kept as objects so Object.keys() + identity comparisons (defaultsMap ===
// SMALL_PLANT_DEFAULTS) still work; values are intentionally empty (identity only).
const SMALL_PLANT_DEFAULTS = Object.fromEntries(SMALL_PLANT_TYPES.map(k => [k, {}]))
const LARGE_PLANT_DEFAULTS = Object.fromEntries(LARGE_PLANT_TYPES.map(k => [k, {}]))

// ── Planting Add-On item catalog (the Item dropdown; NOT from the DB) ──────────
// Each add-on Item carries its own labor formula + material/labor DB names. The
// labor formula is byte-for-byte identical to the original per-item math:
//   mode 'perDay' → hrs = qty / rate         (rate = units/HOUR, guarded > 0)
//   mode 'perMin' → hrs = (qty * rate) / 60  (rate = minutes/unit)
const ADDON_META = {
  'Tree Stake': {
    matKey: 'Tree Stake',
    labKey: 'Tree Stakes - Install Rate',
    mode: 'perDay',
    unit: 'ea',
    labUnit: 'Each per hour',
  },
  'Root Barrier 12"': {
    matKey: 'Root Barrier 12in',
    labKey: 'Root Barrier - Install Rate',
    mode: 'perDay',
    unit: 'LF',
    labUnit: 'Ln Ft per hour',
  },
  'Root Barrier 24"': {
    matKey: 'Root Barrier 24in',
    labKey: 'Root Barrier - Install Rate',
    mode: 'perDay',
    unit: 'LF',
    labUnit: 'Ln Ft per hour',
  },
  'Gopher Basket 1 gal': {
    matKey: 'Gopher Basket 1 Gal',
    labKey: 'Gopher Basket - Install Rate',
    mode: 'perDay',
    unit: 'ea',
    labUnit: 'Each per hour',
  },
  'Gopher Basket 5 gal': {
    matKey: 'Gopher Basket 5 Gal',
    labKey: 'Gopher Basket - Install Rate',
    mode: 'perDay',
    unit: 'ea',
    labUnit: 'Each per hour',
  },
  'Gopher Basket 15 gal': {
    matKey: 'Gopher Basket 15 Gal',
    labKey: 'Gopher Basket - Install Rate',
    mode: 'perDay',
    unit: 'ea',
    labUnit: 'Each per hour',
  },
  'Mesh Flat': {
    matKey: 'Mesh Flat',
    labKey: 'Mesh Flat - Install Rate',
    mode: 'perDay',
    unit: 'SF',
    labUnit: 'Sq Ft per hour',
  },
  'Jute Fabric': {
    matKey: 'Jute Fabric',
    labKey: 'Jute Fabric - Install Rate',
    mode: 'perDay',
    unit: 'SF',
    labUnit: 'Sq Ft per hour',
  },
}
const ADDON_TYPES = Object.keys(ADDON_META)

// Company/estimate financial settings (labor rate, burden %, GPMD, commission,
// sub GP markup) are sourced live from company_settings — no hardcoded defaults.

const n = v => parseFloat(v) || 0
const r2 = x => Math.round(((x || 0) + Number.EPSILON) * 100) / 100

// ── Helpers ───────────────────────────────────────────────────────────────────
// All rates read live from the DB (labor_rates / material / misc_rates) — no
// hardcoded fallbacks. Seeds guarantee the values exist.
function lr(laborRates, key) {
  return n(laborRates[key])
}
function mp(materialPrices, key) {
  return n(materialPrices[key])
}

function getSmallPerDay(laborRates, type) {
  return n(laborRates[type])
}
function getLargePerDay(laborRates, type) {
  return n(laborRates[type])
}

// ── Vendor-catalog material price ─────────────────────────────────────────────
// The ONLY thing the Vendor selection changes: the material $ source. When a
// real vendor is selected AND a material_rates row exists (name===dbName &&
// vendor_id===vendorId) use that row's unit_cost; otherwise fall back to the
// Standard price (name-keyed mp[dbName]) then the hard fallback. Vendor 'Standard'
// resolves to exactly the original math, so In-House numbers never move.
// Shared resolver (src/lib/materialCatalog.js) — same vendor→Standard→fallback
// order. Planting keeps its own separate material/labor maps (plant names can
// key both), so it doesn't use the merged useMaterialCatalog hook.
const plantMatPrice = resolveMaterialPrice

// Catalog sub-categories that back the three Type pickers. 'Plants' holds BOTH
// Small and Large plant Items — each picker intersects it with its own built-in
// set (SMALL_PLANT_DEFAULTS / LARGE_PLANT_DEFAULTS) so the sub-category is never
// split. Add-Ons live under 'Amendments'.
const PLANTS_SUBCAT = 'Plants'
const ADDONS_SUBCAT = 'Amendments'

// ── Vendor-first Type picker options ─────────────────────────────────────────
// Mirrors ArtificialTurfModule.baseMatOptions / UtilitiesModule.mergedUtilTypes.
// The Type list is now driven by the material catalog, scoped to the picker's
// sub-category and INTERSECTED with that picker's built-in set:
//   • Standard / unset / auto → the null-vendor catalog Items for the set, or —
//     when the catalog carries none yet — the full built-in list (never empties)
//   • a real vendor → ONLY that vendor's Items in the set (nothing if they carry
//     none of them)
// Each option keeps `value` = the BUILT-IN key so labor / per-day math and the
// stored row.type keep keying on the built-in (backward-compat with old saves).
// `itemNameFor(key)` returns the catalog Item name a built-in maps to — identity
// for Small/Large Plants (Item name === key) and ADDON_META.matKey for Add-Ons
// (e.g. key 'Root Barrier 12"' ↔ Item 'Root Barrier 12in').
function plantTypeOptions(materialRows, subcat, builtInKeys, vendorSel, itemNameFor = k => k) {
  const isStd = !vendorSel || vendorSel === 'Standard' || vendorSel === 'auto'
  const catRows = catalogOptions(materialRows, subcat, isStd ? 'Standard' : vendorSel, {
    standardRows: 'null-vendor',
    stripPrefix: true,
    category: PLANTING_CATEGORY,
  })
  // Options come ONLY from the catalog (single source of truth). Built-in keys no
  // longer seed the option list; they only intersect the catalog to keep each
  // option's `value` on the built-in key (labor / per-day math backward-compat).
  const out = []
  for (const k of builtInKeys) {
    const want = itemNameFor(k)
    const hit = catRows.find(o => o.label === want || o.row.name === want)
    if (hit) out.push({ value: k, label: k, builtIn: k, dbName: hit.row.name })
  }
  return out
}

// ── Per-row calculators ───────────────────────────────────────────────────────
// Plant row: In-House material = qty × the row's (editable, vendor-defaulted)
// unit price — IDENTICAL to the original `qty * n(r.price)`, including the
// perDay > 0 guard that skips both hrs and material when the labor rate is 0.
function computePlantRow(row, perDay) {
  // Unselected plant row contributes nothing (no crash, no fallback-to-first).
  if (!row.type) return { qty: n(row.qty), hrs: 0, mat: 0, subUnit: 0, subEach: 0, subMat: 0 }
  const qty = n(row.qty)
  let hrs = 0,
    mat = 0
  if (qty > 0 && perDay > 0) {
    hrs = qty / perDay // perDay is now a per-HOUR rate
    mat = qty * n(row.price)
  }
  const subUnit = n(row.price)
  const subEach = row.subEach !== '' && row.subEach != null ? n(row.subEach) : subUnit
  const subMat = qty > 0 ? qty * subEach : 0
  return { qty, hrs, mat, subUnit, subEach, subMat }
}

// Add-on row: labor formula identical to the original per-item math; material is
// vendor-resolved (Standard = original mp() price).
function computeAddonRow(row, laborRates, materialPrices, materialRows) {
  // Unselected add-on row contributes nothing (no crash, no fallback-to-first).
  if (!row.type)
    return { qty: n(row.qty), hrs: 0, mat: 0, subUnit: 0, subEach: 0, subMat: 0, rate: 0, unitPrice: 0, unit: '' }
  const meta = ADDON_META[row.type] || {}
  const qty = n(row.qty)
  const rate = lr(laborRates, meta.labKey)
  let hrs = 0
  if (meta.mode === 'perDay') hrs = rate > 0 ? qty / rate : 0 // rate is now per-HOUR
  else if (meta.mode === 'perMin') hrs = (qty * rate) / 60
  const unitPrice = plantMatPrice(meta.matKey, row.vendor, materialRows, materialPrices)
  const mat = qty * unitPrice
  const subUnit = unitPrice
  const subEach = row.subEach !== '' && row.subEach != null ? n(row.subEach) : subUnit
  const subMat = qty * subEach
  return { qty, hrs, mat, subUnit, subEach, subMat, rate, unitPrice, unit: meta.unit }
}

// ── Calc ──────────────────────────────────────────────────────────────────────
// In-House: every formula preserved byte-for-byte from the original calc.
// Sub: flat $/unit per row, NO labor hours, itemized cost routed into subCost.
function calcPlanting(
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
  const soilMoveRate = lr(laborRates, 'Till - Soil Move Rate')
  const tillingRate = lr(laborRates, 'Till - Tilling Rate')
  const amendRate = lr(laborRates, 'Till - Amend Rate')
  // Till rates are now per-HOUR productivity (CY/hr, SF/hr), so hours come out
  // directly — no man-days → ×8 step.
  const tillHrs =
    sqft > 0 && soilMoveRate > 0 && tillingRate > 0 && amendRate > 0
      ? soilCY / soilMoveRate + sqft / tillingRate + sqft / amendRate
      : 0

  // Small plants
  const smalls = (smallPlantRows || []).map(r =>
    computePlantRow(r, getSmallPerDay(laborRates, r.type))
  )
  const smallHrs = smalls.reduce((a, x) => a + x.hrs, 0)
  const smallMat = smalls.reduce((a, x) => a + x.mat, 0)
  const smallSubMat = smalls.reduce((a, x) => a + x.subMat, 0)

  // Large plants
  const larges = (largePlantRows || []).map(r =>
    computePlantRow(r, getLargePerDay(laborRates, r.type))
  )
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
  let manHrs = 0,
    manMat = 0,
    manSub = 0
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
  // Back-compat: older saves stored manDays; convert to hours (×8).
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
  let totalHrs,
    manDays,
    totalMat,
    laborCost,
    burden,
    gp,
    subGp,
    subCost,
    commission,
    price,
    walkHrs
  if (isSubTab) {
    // Sub tab: flat per-unit material only, NO labor hours. The itemized flat
    // cost IS the subcontractor cost; profit is the markup (Sub GP). Crane
    // hiring + manual sub costs are subcontractor costs regardless of tab.
    walkHrs = 0
    totalHrs = 0
    manDays = 0
    laborCost = 0
    burden = 0
    // In-house materials are 0 on the Sub tab — the sub materials live entirely
    // in subCost. (Keeping them in totalMat made them show as "In-House
    // Materials" and pulled sales tax onto the in-house side.)
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
    totalHrs,
    manDays,
    totalMat,
    laborCost,
    burden,
    subCost,
    gp,
    subGp,
    commission,
    price,
    walkHrs,
    tillHrs,
    smallHrs,
    largeHrs,
    addonHrs,
    diffHrs,
    yardCheckHrs,
    yardCheckMat,
    smalls,
    larges,
    addonResults,
  }
}

// ── Sub-components ────────────────────────────────────────────────────────────
function SectionHeader({ title }) {
  const isSub = useContext(SubTabContext)
  return (
    <div className="bg-gray-100 rounded-lg px-4 py-2.5 border border-gray-200 mb-2">
      <h3 className="text-xs font-bold text-gray-600 uppercase tracking-wider">{subSectionTitle(title, isSub)}</h3>
    </div>
  )
}

function NumInput({ value, onChange, placeholder = '0', className = '' }) {
  return (
    <input
      type="number"
      step="any"
      className={`input text-sm py-1.5 ${className}`}
      placeholder={placeholder}
      value={value}
      onChange={e => onChange(e.target.value)}
    />
  )
}

// ── Default rows / factories ──────────────────────────────────────────────────
function newSmallRow(type = '', materialPrices = {}, materialRows = []) {
  if (!type) return { vendor: 'Standard', type: '', qty: '', price: '', subEach: '' }
  return { vendor: 'Standard', type, qty: '', price: plantMatPrice(type, 'Standard', materialRows, materialPrices), subEach: '' }
}
function newLargeRow(type = '', materialPrices = {}, materialRows = []) {
  if (!type) return { vendor: 'Standard', type: '', qty: '', price: '', subEach: '' }
  return { vendor: 'Standard', type, qty: '', price: plantMatPrice(type, 'Standard', materialRows, materialPrices), subEach: '' }
}
const blankAddonRow = () => ({ vendor: 'Standard', type: '', qty: '', subEach: '' })

const DEFAULT_SMALL_ROWS = () =>
  Array.from({ length: 4 }, () => ({
    vendor: 'Standard',
    type: '',
    qty: '',
    price: '',
    subEach: '',
  }))
const DEFAULT_LARGE_ROWS = () =>
  Array.from({ length: 4 }, () => ({
    vendor: 'Standard',
    type: '',
    qty: '',
    price: '',
    subEach: '',
  }))
const DEFAULT_ADDON_ROWS = () => [blankAddonRow()]

const OTHER_ADDON_DEFAULTS = {
  craneCost: '',
  addonHours: '',
  addonMaterials: '',
  deliveryCharges: '',
}

const DEFAULT_MANUAL_ROWS = [{ label: '', hours: '', materials: '', subCost: '' }]

// Migrate the legacy fixed `addons` object into the new Vendor+Item row model.
// Only non-zero legacy items become rows, in the SAME order the original calc
// summed them — so a legacy save's In-House add-on totals stay byte-for-byte
// identical (adding zero-qty items changes nothing).
function migrateAddonRows(a = {}) {
  const rows = []
  const push = (type, field) => {
    if (n(a[field]) > 0) rows.push({ vendor: 'Standard', type, qty: a[field], subEach: '' })
  }
  push('Tree Stake', 'treeStakes')
  push('Root Barrier 12"', 'rootBarrier12')
  push('Root Barrier 24"', 'rootBarrier24')
  push('Gopher Basket 1 gal', 'gopherBaskets1')
  push('Gopher Basket 5 gal', 'gopherBaskets5')
  push('Gopher Basket 15 gal', 'gopherBaskets15')
  push('Mesh Flat', 'meshFlat')
  push('Jute Fabric', 'juteFabric')
  return rows.length ? rows : DEFAULT_ADDON_ROWS()
}

// Per-tab input record. In-House and Sub each hold their own independent copy so
// the two tabs are separate calculators. Legacy flat saves (fields at the top
// level, `addons` object) are migrated into In-House rows so nothing is lost.
function makeTab(src = {}) {
  const legacyAddons = src.addons || {}
  return {
    tillSqft: src.tillSqft ?? '',
    difficulty: src.difficulty ?? '',
    hoursAdj: src.hoursAdj ?? '',
    distanceLF: src.distanceLF ?? '',
    smallPlantRows: src.smallPlantRows
      ? src.smallPlantRows.map(r => ({ vendor: 'Standard', subEach: '', ...r }))
      : DEFAULT_SMALL_ROWS(),
    largePlantRows: src.largePlantRows
      ? src.largePlantRows.map(r => ({ vendor: 'Standard', subEach: '', ...r }))
      : DEFAULT_LARGE_ROWS(),
    addonRows: src.addonRows
      ? src.addonRows.map(r => ({ vendor: 'Standard', subEach: '', ...r }))
      : migrateAddonRows(legacyAddons),
    otherAddons: src.otherAddons
      ? { ...OTHER_ADDON_DEFAULTS, ...src.otherAddons }
      : {
          craneCost: legacyAddons.craneCost ?? '',
          addonHours: legacyAddons.addonHours ?? '',
          addonMaterials: legacyAddons.addonMaterials ?? '',
          deliveryCharges: legacyAddons.deliveryCharges ?? '',
        },
    manualRows: src.manualRows
      ? src.manualRows.map(r => ({ ...r }))
      : DEFAULT_MANUAL_ROWS.map(r => ({ ...r })),
    yardCheck: src.yardCheck ? { ...src.yardCheck } : { enabled: false, hours: '3', pct: '2' },
  }
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function PlantingModule({ onSave, onBack, saving, initialData }) {
  const [laborRatePerHour, setLaborRatePerHour] = useState(
    initialData?.laborRatePerHour ?? null
  )
  const [laborBurdenPct, setLaborBurdenPct] = useState(
    initialData?.laborBurdenPct ?? null
  )
  const [gpmd, setGpmd] = useState(initialData?.gpmd ?? null)
  const [commissionRate, setCommissionRate] = useState(initialData?.commissionRate ?? null)
  const [subGpMarkupRate, setSubGpMarkupRate] = useState(initialData?.subGpMarkupRate ?? null)

  // Free-text notes for this module — Sam writes auto-generated
  // takeoffs here via create_estimate_from_takeoff, and the user can
  // overwrite / append their own.
  const [notes, setNotes] = useState(initialData?.notes ?? '')
  const [walkAccess, setWalkAccess] = useState(
    initialData?.walkAccess ?? {
      paceLfPerMin: DEFAULT_WALK_ACCESS_PACE_LF_PER_MIN,
    }
  )
  // materialPrices: { 'Plant / Material Name': unit_cost, ... } (Standard fallback)
  const [materialPrices, setMaterialPrices] = useState(initialData?.materialPrices ?? {})
  // laborRates: { 'Plant Name or Rate Key': rate_value, ... }
  const [laborRates, setLaborRates] = useState(initialData?.laborRates ?? {})
  // Full Planting material_rates catalog (id/name/vendor_id/unit/unit_cost) used
  // to resolve a vendor's material price. Plus the vendor list for the pickers.
  const [materialRows, setMaterialRows] = useState(initialData?.materialRows || [])
  const [vendors, setVendors] = useState([])
  const [pricesLoading, setPricesLoading] = useState(!initialData?.materialPrices)

  // Re-fetch Planting master-rate maps + vendor catalog. Called once on mount and
  // again after any RateEditPopover save so the calc reflects edits immediately.
  const refreshAllRates = useCallback(async () => {
    // material_rates retired: Standard/base prices from the new model
    // (fetchStandardRateMap, name-keyed); vendor catalog rows from
    // material + material_price. Planting resolves by name, not subcategory.
    const [matMap, labRes, rows, venRes] = await Promise.all([
      fetchStandardRateMap([PLANTING_CATEGORY]),
      supabase.from('labor_rates').select('name, rate').eq('category', PLANTING_CATEGORY),
      fetchModuleCatalog([PLANTING_CATEGORY]),
      supabase
        .from('subs_vendors')
        .select('id, company_name')
        .eq('type', 'vendor')
        .order('company_name'),
    ])
    setMaterialPrices(matMap)
    if (labRes.data) {
      const l = {}
      labRes.data.forEach(r => {
        l[r.name] = parseFloat(r.rate) || 0
      })
      setLaborRates(l)
    }
    setMaterialRows(rows || [])
    setVendors(
      (venRes.data || []).map(v => ({
        id: v.id,
        name: v.company_name,
      }))
    )
  }, [])

  useEffect(() => {
    supabase
      .from('company_settings')
      .select('labor_rate_per_hour, labor_burden_pct, walk_access_pace_lf_per_min, estimate_gpmd_default, commission_rate, sub_gp_markup_rate')
      .single()
      .then(({ data }) => {
        if (!data) return
        if (!initialData?.laborRatePerHour && data.labor_rate_per_hour != null)
          setLaborRatePerHour(parseFloat(data.labor_rate_per_hour))
        if (!initialData?.laborBurdenPct && data.labor_burden_pct != null)
          setLaborBurdenPct(parseFloat(data.labor_burden_pct))
        if (initialData?.gpmd == null && data.estimate_gpmd_default != null)
          setGpmd(parseFloat(data.estimate_gpmd_default))
        if (initialData?.commissionRate == null && data.commission_rate != null)
          setCommissionRate(parseFloat(data.commission_rate))
        if (initialData?.subGpMarkupRate == null && data.sub_gp_markup_rate != null)
          setSubGpMarkupRate(parseFloat(data.sub_gp_markup_rate))
        if (!initialData?.walkAccess && data.walk_access_pace_lf_per_min != null) {
          const _wpace = parseFloat(data.walk_access_pace_lf_per_min)
          setWalkAccess({
            paceLfPerMin:
              Number.isFinite(_wpace) && _wpace > 0
                ? _wpace
                : DEFAULT_WALK_ACCESS_PACE_LF_PER_MIN,
          })
        }
      })
    // Always refresh so the vendor list + material catalog load, even when
    // editing a saved estimate (which already carries a materialPrices map).
    refreshAllRates().then(() => setPricesLoading(false))
  }, [refreshAllRates])

  // ── Shared (not per-tab) selections ─────────────────────────────────────────
  const [crewType, setCrewType] = useState(initialData?.crewType ?? 'Landscape')
  const [subType, setSubType] = useState(initialData?.subType ?? 'In-House')

  // Independent In-House vs Sub input records — each tab is its own calculator.
  const [ihTab, setIhTab] = useState(() => makeTab(initialData?.ihData || initialData))
  const [subTab, setSubTab] = useState(() => makeTab(initialData?.subData || {}))
  const isSub = subType === 'Subcontractor'
  const cur = isSub ? subTab : ihTab
  const setCur = isSub ? setSubTab : setIhTab
  const setField = k => v => setCur(p => ({ ...p, [k]: typeof v === 'function' ? v(p[k]) : v }))

  // Derived active-tab accessors.
  const tillSqft = cur.tillSqft
  const setTillSqft = setField('tillSqft')
  const difficulty = cur.difficulty
  const setDifficulty = setField('difficulty')
  const hoursAdj = cur.hoursAdj
  const setHoursAdj = setField('hoursAdj')
  const distanceLF = cur.distanceLF
  const setDistanceLF = setField('distanceLF')
  const smallPlantRows = cur.smallPlantRows
  const setSmallPlantRows = setField('smallPlantRows')
  const largePlantRows = cur.largePlantRows
  const setLargePlantRows = setField('largePlantRows')
  const addonRows = cur.addonRows
  const setAddonRows = setField('addonRows')
  const otherAddons = cur.otherAddons
  const setOtherAddons = setField('otherAddons')
  const manualRows = cur.manualRows
  const setManualRows = setField('manualRows')
  const yardCheck = cur.yardCheck
  const setYardCheck = setField('yardCheck')

  // ── Sales tax — applied to totalMat across every module so the bid
  //    reflects supplier-invoiced material cost. Sourced from
  //    company_settings.sales_tax_rate via fetchSalesTaxRate(). Default
  //    0 (no tax) until the admin sets it in Opportunities → Settings.
  const [salesTaxRate, setSalesTaxRate] = useState(0)
  useEffect(() => {
    let alive = true
    fetchSalesTaxRate().then(r => {
      if (alive) setSalesTaxRate(r)
    })
    return () => {
      alive = false
    }
  }, [])

  // Active tab drives the calc — the other tab stays untouched.
  const state = { crewType, subType, subGpMarkupRate, ...cur }
  const calcRaw = calcPlanting(
    state,
    laborRatePerHour,
    gpmd,
    materialPrices,
    laborRates,
    walkAccess,
    laborBurdenPct,
    materialRows,
    commissionRate
  )
  // Apply company sales tax to the module's total material cost so the
  // estimate price matches what suppliers actually invoice. Stored
  // material_cost (saved with the module) ends up tax-inclusive too,
  // so bid totals add up to GpmdBar's displayed price.
  const _salesTaxAmt = (calcRaw.totalMat || 0) * (salesTaxRate || 0)
  const calc =
    _salesTaxAmt > 0
      ? {
          ...calcRaw,
          totalMat: (calcRaw.totalMat || 0) + _salesTaxAmt,
          price: (calcRaw.price || 0) + _salesTaxAmt,
          salesTax: _salesTaxAmt,
        }
      : calcRaw

  // ── Vendor helpers ──────────────────────────────────────────────────────────
  const vendorsForCategory = cat => vendors.filter(v => materialRows.some(r => r.vendor_id === v.id))
  const vendorOptions = [
    { value: 'Standard', label: 'Standard' },
    ...vendorsForCategory(PLANTING_CATEGORY).map(v => ({ value: v.id, label: v.name })),
  ]

  // ── Row helpers ─────────────────────────────────────────────────────────────
  // Plant row update. Changing Vendor or Item resets the unit price to the
  // vendor-resolved default (Standard = original master-rate / catalog price), and
  // (on the Sub tab) refreshes the flat $/unit default.
  function plantUpdate(setRows, defaultsMap, i, field, val) {
    setRows(rows =>
      rows.map((r, idx) => {
        if (idx !== i) return r
        if (field === 'type' || field === 'vendor') {
          const next = { ...r, [field]: val }
          const price = plantMatPrice(next.type, next.vendor, materialRows, materialPrices)
          next.price = price
          if (isSub) next.subEach = String(r2(price))
          return next
        }
        return { ...r, [field]: val }
      })
    )
  }
  // Add-on row update. Changing Vendor or Item refreshes the Sub flat default.
  function addonUpdate(i, field, val) {
    setAddonRows(rows =>
      rows.map((r, idx) => {
        if (idx !== i) return r
        const next = { ...r, [field]: val }
        if ((field === 'type' || field === 'vendor') && isSub)
          next.subEach = String(r2(computeAddonRow(next, laborRates, materialPrices, materialRows).subUnit))
        return next
      })
    )
  }
  function updateManual(i, field, val) {
    setManualRows(rows => rows.map((r, idx) => (idx === i ? { ...r, [field]: val } : r)))
  }
  const removeRow = (setRows, i) =>
    setRows(rows => (rows.length > 1 ? rows.filter((_, idx) => idx !== i) : rows))

  function handleSave() {
    onSave({
      notes,
      man_days: parseFloat(calc.manDays.toFixed(2)),
      // material_cost is the IN-HOUSE materials column the estimate aggregates.
      // On the Sub tab the materials belong to subCost (a subcontractor lump),
      // so in-house materials must be 0 — otherwise they'd be double-counted as
      // In-House Materials AND Sub Cost. The module's own summary still shows the
      // sub materials from data.calc.totalMat.
      material_cost: isSub ? 0 : parseFloat(calc.totalMat.toFixed(2)),
      data: {
        ...state,
        ihData: ihTab,
        subData: subTab,
        subType,
        subGpMarkupRate,
        commissionRate,
        walkAccess,
        laborRatePerHour,
        laborBurdenPct,
        gpmd,
        materialPrices, // snapshot so summary always reflects save-time prices
        laborRates, // snapshot so summary always reflects save-time rates
        materialRows, // vendor-resolved catalog snapshot for the summary
        vendorNames: Object.fromEntries(vendors.map(v => [v.id, v.name])),
        calc,
      },
    })
  }

  const fmt2 = v =>
    `$${n(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  // ── Plant section renderer (Small Plants / Large Plants) ────────────────────
  function renderPlantSection(title, rows, setRows, defaultsMap, TYPES, perDayFn, addLabel, subcat) {
    return (
      <div>
        <SectionHeader title={title} />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 border-b border-gray-200">
                <th className="text-center pb-1 pr-2 font-medium w-40">Vendor</th>
                <th className="text-center pb-1 pr-2 font-medium">Plant Type</th>
                <th className="text-center pb-1 pr-2 font-medium w-20">Qty</th>
                {!isSub && <th className="text-center pb-1 pr-2 font-medium w-28">Price/Ea</th>}
                {!isSub && (
                  <th className="text-center pb-1 pr-2 font-medium text-gray-400">Plants/Day</th>
                )}
                <th className="text-center pb-1 pr-2 font-medium text-gray-400 w-24">
                  {isSub ? 'Flat $/unit' : 'Est. Hrs'}
                </th>
                <th className="text-center pb-1 pr-2 font-medium text-gray-400 w-24">Material $</th>
                <th className="w-6" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => {
                const perDay = perDayFn(laborRates, row.type)
                const c = computePlantRow(row, perDay)
                // Vendor-first Type list (mirrors Turf's baseMatOptions): the
                // selected vendor's 'Plants' Items intersected with THIS picker's
                // built-in set. Standard/unset → the full built-in list. `value`
                // stays the built-in key so labor/per-day + stored row.type hold.
                const typeOpts = plantTypeOptions(materialRows, subcat, TYPES, row.vendor)
                const selType =
                  typeOpts.find(o => o.value === row.type || o.dbName === row.type) ||
                  { value: row.type, label: row.type }
                const masterPrice = n(materialPrices[row.type])
                const isStandard = !row.vendor || row.vendor === 'Standard'
                return (
                  <tr key={i} className="border-b border-gray-100">
                    <td className="py-1.5 pr-2">
                      <select
                        className="input text-sm py-1 w-full"
                        value={row.vendor || 'Standard'}
                        onChange={e => plantUpdate(setRows, defaultsMap, i, 'vendor', e.target.value)}
                      >
                        {vendorOptions.map(o => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-1.5 pr-2">
                      <select
                        className="input text-sm py-1 w-full"
                        value={row.type ? (selType?.value ?? row.type) : ''}
                        onChange={e => plantUpdate(setRows, defaultsMap, i, 'type', e.target.value)}
                      >
                        {!row.type && <option value="">Select plant</option>}
                        {row.type &&
                          !typeOpts.some(o => o.value === row.type || o.dbName === row.type) && (
                            <option value={row.type}>{row.type}</option>
                          )}
                        {typeOpts.map(o => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-1.5 pr-2">
                      <NumInput
                        value={row.qty}
                        onChange={v => plantUpdate(setRows, defaultsMap, i, 'qty', v)}
                        className="text-center"
                      />
                    </td>
                    {!isSub && (
                      <td className="py-1.5 pr-2">
                        <div className="flex items-center gap-1">
                          <div className="relative flex-1">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">
                              $
                            </span>
                            <input
                              type="number"
                              step="any"
                              className="input text-sm py-1.5 pl-5 w-full"
                              value={row.price}
                              onChange={e => plantUpdate(setRows, defaultsMap, i, 'price', e.target.value)}
                            />
                          </div>
                        </div>
                      </td>
                    )}
                    {!isSub && (
                      <td className="py-1.5 text-center text-gray-400 text-xs">
                        <span className="inline-flex items-center justify-center gap-1">
                          {perDay < 1 ? perDay.toFixed(2) : perDay.toLocaleString()}
                        </span>
                      </td>
                    )}
                    <td className="py-1.5 text-center text-xs pr-2">
                      {isSub ? (
                        <input
                          type="number"
                          step="any"
                          className="input text-sm py-1 w-full text-center"
                          placeholder={r2(c.subUnit).toString()}
                          value={row.subEach ?? ''}
                          onChange={e => plantUpdate(setRows, defaultsMap, i, 'subEach', e.target.value)}
                        />
                      ) : (
                        <span className="text-gray-600 block text-center">{c.hrs > 0 ? c.hrs.toFixed(2) : '—'}</span>
                      )}
                    </td>
                    <td className="py-1.5 text-center text-xs text-gray-600">
                      {(isSub ? c.subMat : c.mat) > 0 ? fmt2(isSub ? c.subMat : c.mat) : '—'}
                    </td>
                    <td className="py-1.5 text-right">
                      <button
                        type="button"
                        onClick={() => removeRow(setRows, i)}
                        className="text-gray-300 hover:text-red-500 text-xs px-1"
                        title="Remove row"
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <button
          type="button"
          className="mt-2 text-xs text-green-700 hover:text-green-900 font-medium"
          onClick={() =>
            setRows(rows => [
              ...rows,
              defaultsMap === SMALL_PLANT_DEFAULTS
                ? newSmallRow('', materialPrices, materialRows)
                : newLargeRow('', materialPrices, materialRows),
            ])
          }
        >
          {addLabel}
        </button>
      </div>
    )
  }

  // ── Planting Add-Ons section renderer ───────────────────────────────────────
  function renderAddonSection() {
    return (
      <div>
        <SectionHeader title="Planting Add-Ons" />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 border-b border-gray-200">
                <th className="text-center pb-1 pr-2 font-medium w-40">Vendor</th>
                <th className="text-center pb-1 pr-2 font-medium">Item</th>
                <th className="text-center pb-1 pr-2 font-medium w-20">Qty</th>
                {!isSub && <th className="text-center pb-1 pr-2 font-medium">Rate</th>}
                <th className="text-center pb-1 pr-2 font-medium text-gray-400 w-24">
                  {isSub ? 'Flat $/unit' : 'Est. Hrs'}
                </th>
                <th className="text-center pb-1 pr-2 font-medium text-gray-400 w-24">Material $</th>
                <th className="w-6" />
              </tr>
            </thead>
            <tbody>
              {addonRows.map((row, i) => {
                const meta = ADDON_META[row.type] || {}
                const c = computeAddonRow(row, laborRates, materialPrices, materialRows)
                const isStandard = !row.vendor || row.vendor === 'Standard'
                const houseMat = mp(materialPrices, meta.matKey)
                // Vendor-first Type list: the selected vendor's 'Amendments' Items
                // intersected with ADDON_TYPES, matched by each item's matKey (the
                // catalog Item name — '12"' key ↔ '12in' Item). `value` stays the
                // ADDON_META key so meta lookups + matKey pricing are unchanged.
                const typeOpts = plantTypeOptions(
                  materialRows,
                  ADDONS_SUBCAT,
                  ADDON_TYPES,
                  row.vendor,
                  k => ADDON_META[k]?.matKey || k
                )
                const selType =
                  typeOpts.find(o => o.value === row.type) ||
                  { value: row.type, label: row.type }
                return (
                  <tr key={i} className="border-b border-gray-100">
                    <td className="py-1.5 pr-2">
                      <select
                        className="input text-sm py-1 w-full"
                        value={row.vendor || 'Standard'}
                        onChange={e => addonUpdate(i, 'vendor', e.target.value)}
                      >
                        {vendorOptions.map(o => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-1.5 pr-2">
                      <select
                        className="input text-sm py-1 w-full"
                        value={row.type ? (selType?.value ?? row.type) : ''}
                        onChange={e => addonUpdate(i, 'type', e.target.value)}
                      >
                        {!row.type && <option value="">Select add-on</option>}
                        {row.type && !typeOpts.some(o => o.value === row.type) && (
                          <option value={row.type}>{row.type}</option>
                        )}
                        {typeOpts.map(o => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-1.5 pr-2">
                      <NumInput value={row.qty} onChange={v => addonUpdate(i, 'qty', v)} className="text-center" />
                    </td>
                    {!isSub && (
                      <td className="py-1.5 pr-2 text-center">
                        <div className="flex items-center justify-center gap-1 flex-wrap text-xs text-gray-400">
                          <span>
                            ${c.unitPrice.toFixed(2)}/{meta.unit}
                          </span>
                        </div>
                      </td>
                    )}
                    <td className="py-1.5 text-center text-xs pr-2">
                      {isSub ? (
                        <input
                          type="number"
                          step="any"
                          className="input text-sm py-1 w-full text-center"
                          placeholder={r2(c.subUnit).toString()}
                          value={row.subEach ?? ''}
                          onChange={e => addonUpdate(i, 'subEach', e.target.value)}
                        />
                      ) : (
                        <span className="text-gray-600 block text-center">{c.hrs > 0 ? c.hrs.toFixed(2) : '—'}</span>
                      )}
                    </td>
                    <td className="py-1.5 text-center text-xs text-gray-600">
                      {(isSub ? c.subMat : c.mat) > 0 ? fmt2(isSub ? c.subMat : c.mat) : '—'}
                    </td>
                    <td className="py-1.5 text-right">
                      <button
                        type="button"
                        onClick={() => removeRow(setAddonRows, i)}
                        className="text-gray-300 hover:text-red-500 text-xs px-1"
                        title="Remove row"
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <button
          type="button"
          className="mt-2 text-xs text-green-700 hover:text-green-900 font-medium"
          onClick={() => setAddonRows(rows => [...rows, blankAddonRow()])}
        >
          + Add Row
        </button>

        {/* Other Add-Ons — crane (sub cost) + flat manual / delivery. */}
        <div className="space-y-2 mt-4">
          <div className="flex items-center gap-3">
            <label className="text-sm text-gray-700 w-52 shrink-0">Crane (hiring cost $)</label>
            <div className="relative w-36">
              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">
                $
              </span>
              <NumInput
                value={otherAddons.craneCost}
                onChange={v => setOtherAddons(p => ({ ...p, craneCost: v }))}
                className="pl-5"
              />
            </div>
            <span className="text-xs text-gray-400">Sub cost</span>
          </div>

          {!isSub && (
            <>
              <div className="flex items-center gap-3">
                <label className="text-sm text-gray-700 w-52 shrink-0">Manual Add-On (hrs)</label>
                <NumInput
                  value={otherAddons.addonHours}
                  onChange={v => setOtherAddons(p => ({ ...p, addonHours: v }))}
                  className="w-36"
                />
                <div className="relative w-36">
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">
                    $
                  </span>
                  <NumInput
                    value={otherAddons.addonMaterials}
                    onChange={v => setOtherAddons(p => ({ ...p, addonMaterials: v }))}
                    className="pl-5"
                    placeholder="Mat $"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3">
                <label className="text-sm text-gray-700 w-52 shrink-0">Delivery Charges ($)</label>
                <div className="relative w-36">
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">
                    $
                  </span>
                  <NumInput
                    value={otherAddons.deliveryCharges}
                    onChange={v => setOtherAddons(p => ({ ...p, deliveryCharges: v }))}
                    className="pl-5"
                  />
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    )
  }

  // ── Grouped rate list for the "View Rates" popup (CrewTypeBar). Each section
  //    lists its LABOR rates first, then every MATERIAL rate (one row per vendor,
  //    Standard first) sourced from the module's material catalog — mirrors the
  //    Walls / Utilities View Rates. Planting resolves materials by name.
  const vendorNames = Object.fromEntries((vendors || []).map(v => [v.id, v.name]))
  // Material rows for a catalog item (matched by name). One row per vendor
  // (Standard first), each editable straight to material_price.
  const matRows = (dbName, unit, fallback) => {
    const rows = (materialRows || []).filter(r0 => r0.name === dbName)
    if (rows.length) {
      return rows
        .filter(r0 => r0.vendor_id == null || vendorNames[r0.vendor_id])
        .sort((a, b) => {
          const va = a.vendor_id == null ? '' : vendorNames[a.vendor_id] || '~'
          const vb = b.vendor_id == null ? '' : vendorNames[b.vendor_id] || '~'
          return va.localeCompare(vb)
        })
        .map(r0 => ({
          label: `${r0.vendor_id ? vendorNames[r0.vendor_id] || 'Vendor' : 'Standard'} — ${r0.name}`,
          table: 'material_price',
          materialId: r0.id,
          vendorId: r0.vendor_id || undefined,
          category: 'Planting',
          unitLabel: r0.unit || unit,
          mode: 'currency',
          value: n(r0.unit_cost),
        }))
    }
    return [
      { label: `Standard — ${dbName}`, table: 'material_price', name: dbName, category: 'Planting', unitLabel: unit, mode: 'currency', value: fallback },
    ]
  }
  const plantingRateList = [
    {
      group: 'Small Plants',
      items: [
        ...Object.keys(SMALL_PLANT_DEFAULTS).map(type => ({
          label: type,
          table: 'labor_rates',
          name: type,
          category: 'Planting',
          mode: 'coefficient',
          unitLabel: 'per hour',
          value: getSmallPerDay(laborRates, type),
        })),
        ...Object.keys(SMALL_PLANT_DEFAULTS).flatMap(type =>
          matRows(type, 'ea', materialPrices[type])
        ),
      ],
    },
    {
      group: 'Large Plants / Trees',
      items: [
        ...Object.keys(LARGE_PLANT_DEFAULTS).map(type => ({
          label: type,
          table: 'labor_rates',
          name: type,
          category: 'Planting',
          mode: 'coefficient',
          unitLabel: 'per hour',
          value: getLargePerDay(laborRates, type),
        })),
        ...Object.keys(LARGE_PLANT_DEFAULTS).flatMap(type =>
          matRows(type, 'ea', materialPrices[type])
        ),
      ],
    },
    {
      group: 'Planting Add-Ons',
      items: [
        ...[
          { key: 'Tree Stakes - Install Rate', unit: 'stakes/day' },
          { key: 'Root Barrier - Install Rate', unit: 'min/LF' },
          { key: 'Gopher Basket - Install Rate', unit: 'min/basket' },
          { key: 'Mesh Flat - Install Rate', unit: 'min/SF' },
          { key: 'Jute Fabric - Install Rate', unit: 'min/SF' },
        ].map(({ key, unit }) => ({
          label: key,
          table: 'labor_rates',
          name: key,
          category: 'Planting',
          mode: 'coefficient',
          unitLabel: unit,
          value: lr(laborRates, key),
        })),
        ...ADDON_TYPES.flatMap(t => {
          const meta = ADDON_META[t] || {}
          return matRows(meta.matKey, meta.unit || 'ea', materialPrices[meta.matKey])
        }),
      ],
    },
  ]

  return (
    <SubTabContext.Provider value={isSub}>
    <div className="space-y-5">
      {/* ── Frozen header: GPMD bar + Crew Type / View Rates bar ── */}
      <div className="sticky top-0 z-20 -mx-6 bg-white shadow-md">
        <div className="px-6 pt-1 pb-1 bg-gray-900">
          <GpmdBar
            variant={isSub ? 'sub' : 'inhouse'}
            sticky
            totalMat={calc.totalMat}
            totalHrs={calc.totalHrs}
            manDays={calc.manDays}
            laborCost={calc.laborCost}
            laborRatePerHour={laborRatePerHour}
            burden={calc.burden}
            gp={calc.gp}
            commission={calc.commission}
            subCost={calc.subCost}
            gpmd={gpmd}
            price={calc.price}
            subMarkupRate={subGpMarkupRate}
          />
        </div>
        <div className="px-6 py-2">
          <CrewTypeBar
            crewType={crewType}
            onCrewTypeChange={setCrewType}
            title="Planting"
            moduleType="Planting"
            rates={plantingRateList}
            refreshAllRates={refreshAllRates}
            showInlineToggle={false}
          />
        </div>
      </div>

      <ModuleHeaderSlot>
        <WorkTypeChooser value={subType || 'In-House'} onChange={setSubType} compact />
      </ModuleHeaderSlot>

      {pricesLoading && (
        <div className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2">
          Loading rates from Master Rates…
        </div>
      )}

      {/* Settings — In-House tab only */}
      {!isSub && (
        <>
          <SectionHeader title="Job Site Conditions" />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <p className="text-xs text-gray-500 mb-0.5">Difficulty (%)</p>
              <NumInput value={difficulty} onChange={setDifficulty} placeholder="0" />
            </div>
            <div>
              <p
                className="text-xs text-gray-500 mb-0.5"
                title="Average Distance from Truck to Work Area"
              >
                Truck → Work Area (Avg LF)
              </p>
              <NumInput value={distanceLF} onChange={setDistanceLF} placeholder="0" />
              {calc.walkHrs > 0 && (
                <p className="text-[10px] text-gray-500 italic lowercase mt-0.5">
                  +{calc.walkHrs.toFixed(2)} hrs walk-access
                </p>
              )}
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-0.5">Hours Adj (±hrs)</p>
              <NumInput value={hoursAdj} onChange={setHoursAdj} placeholder="0" />
            </div>
          </div>
        </>
      )}

      {/* ── Small Plants ── */}
      {renderPlantSection(
        'Small Plants',
        smallPlantRows,
        setSmallPlantRows,
        SMALL_PLANT_DEFAULTS,
        Object.keys(SMALL_PLANT_DEFAULTS),
        getSmallPerDay,
        '+ Add Row',
        PLANTS_SUBCAT
      )}

      {/* ── Large Plants / Trees ── */}
      {renderPlantSection(
        'Large Plants / Trees',
        largePlantRows,
        setLargePlantRows,
        LARGE_PLANT_DEFAULTS,
        Object.keys(LARGE_PLANT_DEFAULTS),
        getLargePerDay,
        '+ Add Row',
        PLANTS_SUBCAT
      )}

      {/* ── Planting Add-Ons ── */}
      {renderAddonSection()}

      {/* ── Manual Entry ── */}
      <div>
        <SectionHeader title="Manual Entry" />
        <div className="overflow-x-auto">
          <table className="w-full text-sm table-fixed">
            <colgroup>
              {isSub ? (
                <>
                  <col className="w-1/2" />
                  <col className="w-1/2" />
                </>
              ) : (
                <>
                  <col className="w-1/3" />
                  <col className="w-1/3" />
                  <col className="w-1/3" />
                </>
              )}
            </colgroup>
            <thead>
              <tr className="text-xs text-gray-500 border-b border-gray-200">
                <th className="text-center pb-1 pr-2 font-medium">Description</th>
                {isSub ? (
                  <th className="text-center pb-1 font-medium">Cost $</th>
                ) : (
                  <>
                    <th className="text-center pb-1 pr-2 font-medium">Hours</th>
                    <th className="text-center pb-1 font-medium">Materials $</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {manualRows.map((row, i) => (
                <tr key={i} className="border-b border-gray-100">
                  <td className="py-1 pr-2">
                    <input
                      className="input text-sm py-1 w-full"
                      value={row.label}
                      onChange={e => updateManual(i, 'label', e.target.value)}
                    />
                  </td>
                  {isSub ? (
                    <td className="py-1">
                      <div className="flex items-center gap-1">
                        <NumInput value={row.subCost} onChange={v => updateManual(i, 'subCost', v)} className="text-center flex-1" />
                        {manualRows.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setManualRows(rows => rows.filter((_, idx) => idx !== i))}
                            className="text-gray-300 hover:text-red-500 text-sm px-1"
                            title="Remove line"
                          >
                            ×
                          </button>
                        )}
                      </div>
                    </td>
                  ) : (
                    <>
                      <td className="py-1 pr-2">
                        <NumInput value={row.hours} onChange={v => updateManual(i, 'hours', v)} className="text-center" />
                      </td>
                      <td className="py-1">
                        <div className="flex items-center gap-1">
                          <NumInput
                            value={row.materials}
                            onChange={v => updateManual(i, 'materials', v)}
                            className="text-center flex-1"
                          />
                          {manualRows.length > 1 && (
                            <button
                              type="button"
                              onClick={() => setManualRows(rows => rows.filter((_, idx) => idx !== i))}
                              className="text-gray-300 hover:text-red-500 text-sm px-1"
                              title="Remove line"
                            >
                              ×
                            </button>
                          )}
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          <button
            type="button"
            onClick={() =>
              setManualRows(rows => [...rows, { label: '', hours: '', materials: '', subCost: '' }])
            }
            className="mt-2 text-xs px-2 py-1 rounded bg-slate-100 text-slate-700 hover:bg-slate-200"
          >
            + Add manual entry
          </button>
        </div>
      </div>

      {/* ── Yard Checks (optional) — In-House only ── */}
      {!isSub && (
        <>
          <SectionHeader title="Yard Checks (optional)" />
          <div className="bg-white border border-gray-200 rounded-lg p-4 -mt-1">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <input
                type="checkbox"
                checked={!!yardCheck.enabled}
                onChange={e => setYardCheck(y => ({ ...y, enabled: e.target.checked }))}
                className="accent-green-700"
              />
              Include yard checks (return visits for watering / health checks)
            </label>
            {yardCheck.enabled && (
              <div className="grid grid-cols-2 gap-4 mt-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Hours</label>
                  <NumInput
                    value={yardCheck.hours ?? ''}
                    onChange={v => setYardCheck(y => ({ ...y, hours: v }))}
                    placeholder="3"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    % of plant material
                  </label>
                  <NumInput
                    value={yardCheck.pct}
                    onChange={v => setYardCheck(y => ({ ...y, pct: v }))}
                    placeholder="2"
                  />
                </div>
                <p className="col-span-2 text-xs text-gray-400">
                  Adds {calc.yardCheckHrs?.toFixed(1) || 0} hrs and $
                  {Math.round(calc.yardCheckMat || 0).toLocaleString()} material. Defaults: 3 hrs +
                  2% of plant material.
                </p>
              </div>
            )}
          </div>
        </>
      )}

      <div className="flex gap-3 pt-2">
        <button onClick={onBack} className="btn-secondary flex-1">
          ← Back
        </button>
        <button onClick={handleSave} disabled={saving} className="btn-primary flex-1">
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>
    </div>
    </SubTabContext.Provider>
  )
}
