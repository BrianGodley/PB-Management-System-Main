import WorkTypeChooser from './WorkTypeChooser'
import { useState, useEffect, useCallback, useContext } from 'react'
import { SubTabContext, subSectionTitle } from './subTabContext'
import { supabase } from '../../lib/supabase'
import GpmdBar from './GpmdBar'
import RateEditPopover from '../RateEditPopover'
import { fetchSalesTaxRate } from '../../lib/companyDefaults'
import { calcWalkAccessLabor, DEFAULT_WALK_ACCESS_PACE_LF_PER_MIN } from '../../lib/walkAccess'
import { resolveMaterialPrice, fetchModuleCatalog, fetchStandardRateMap } from '../../lib/materialCatalog'

// ─────────────────────────────────────────────────────────────────────────────
// Planting Module
// Material prices  → material_rates  (category = 'Planting')  keyed by name
// Labor rates      → labor_rates     (category = 'Planting')  keyed by name
//   Plant types:   rate = plants per man-day
//   Till - Soil Move Rate:           rate = CY/day
//   Till - Tilling Rate:             rate = sqft/day
//   Till - Amend Rate:               rate = sqft/day
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
//   (House named-rate fallback vs. a vendor's material_rates row). Vendor 'House'
//   resolves to the original math, so In-House numbers never move.
//
//   In-House and Subcontractor are independent calculators (makeTab / ihTab /
//   subTab). The Sub tab prices each row at a flat $/unit with NO labor hours and
//   routes the itemized cost into subCost (GpmdBar's 'sub' variant).
// ─────────────────────────────────────────────────────────────────────────────

const PLANTING_CATEGORY = 'Planting'

// Hardcoded fallbacks (used when DB row not present yet)
const SMALL_PLANT_DEFAULTS = {
  'Flats of Groundcover': { perDay: 25, price: 18.0 },
  'Flats of 4" pots': { perDay: 20, price: 20.0 },
  '4" pots standard': { perDay: 280, price: 0.0 },
  '4" pots succulents': { perDay: 280, price: 7.0 },
  '6" pots standard': { perDay: 180, price: 0.0 },
  '6" pots succulents': { perDay: 180, price: 12.0 },
  '1 gallon standard': { perDay: 70, price: 6.5 },
  '1 gallon premium': { perDay: 70, price: 8.0 },
  '1 gallon succulents': { perDay: 70, price: 18.0 },
  '3 gallon standard': { perDay: 70, price: 7.0 },
  '5 gallon standard': { perDay: 40, price: 17.0 },
  '5 gallon premium': { perDay: 40, price: 35.0 },
  '5 gallon succulents': { perDay: 40, price: 39.0 },
  '5 gallon bamboo': { perDay: 40, price: 40.0 },
  '5 gallon palm': { perDay: 40, price: 50.0 },
}

const LARGE_PLANT_DEFAULTS = {
  '15 gallon standard': { perDay: 15, price: 52.0 },
  '15 gallon premium': { perDay: 15, price: 90.0 },
  '15 gallon succulents': { perDay: 15, price: 225.0 },
  '15 gallon fruit': { perDay: 15, price: 145.0 },
  '15 gallon palms': { perDay: 15, price: 175.0 },
  '24" box standard': { perDay: 4, price: 185.0 },
  '24" box premium': { perDay: 4, price: 250.0 },
  '24" box fruit': { perDay: 4, price: 0.0 },
  '24" box palm': { perDay: 4, price: 0.0 },
  '36" box standard': { perDay: 0.75, price: 450.0 },
  '36" box premium': { perDay: 0.75, price: 600.0 },
  '36" box fruit': { perDay: 0.75, price: 0.0 },
  '36" box palm': { perDay: 0.75, price: 0.0 },
  '48" box standard': { perDay: 0.3, price: 800.0 },
  '48" box premium': { perDay: 0.3, price: 0.0 },
  '48" box fruit': { perDay: 0.3, price: 0.0 },
  '48" box palm': { perDay: 0.3, price: 0.0 },
}

// Fallback labor rate defaults for add-ons and till
const LABOR_DEFAULTS = {
  'Till - Soil Move Rate': 39, // CY/day
  'Till - Tilling Rate': 3600, // sqft/day
  'Till - Amend Rate': 900, // sqft/day
  'Tree Stakes - Install Rate': 24, // stakes/day
  'Root Barrier - Install Rate': 20, // min/LF
  'Gopher Basket - Install Rate': 2, // min/basket
  'Mesh Flat - Install Rate': 0.7, // min/sqft
  'Jute Fabric - Install Rate': 1.1, // min/sqft
}

// Add-on material fallback prices
const ADDON_MAT_DEFAULTS = {
  'Tree Stake': 8.5,
  'Root Barrier 12in': 5.0,
  'Root Barrier 24in': 7.0,
  'Gopher Basket 1 Gal': 3.42,
  'Gopher Basket 5 Gal': 7.78,
  'Gopher Basket 15 Gal': 10.5,
  'Mesh Flat': 1.0,
  'Jute Fabric': 0.4,
}

// ── Planting Add-On item catalog (the Item dropdown; NOT from the DB) ──────────
// Each add-on Item carries its own labor formula + material/labor DB names. The
// labor formula is byte-for-byte identical to the original per-item math:
//   mode 'perDay' → hrs = (qty / rate) * 8   (rate = units/day, guarded > 0)
//   mode 'perMin' → hrs = (qty * rate) / 60  (rate = minutes/unit)
const ADDON_META = {
  'Tree Stake': {
    matKey: 'Tree Stake',
    labKey: 'Tree Stakes - Install Rate',
    mode: 'perDay',
    unit: 'ea',
    labUnit: 'stakes/day',
  },
  'Root Barrier 12"': {
    matKey: 'Root Barrier 12in',
    labKey: 'Root Barrier - Install Rate',
    mode: 'perMin',
    unit: 'LF',
    labUnit: 'min/LF',
  },
  'Root Barrier 24"': {
    matKey: 'Root Barrier 24in',
    labKey: 'Root Barrier - Install Rate',
    mode: 'perMin',
    unit: 'LF',
    labUnit: 'min/LF',
  },
  'Gopher Basket 1 gal': {
    matKey: 'Gopher Basket 1 Gal',
    labKey: 'Gopher Basket - Install Rate',
    mode: 'perMin',
    unit: 'ea',
    labUnit: 'min/ea',
  },
  'Gopher Basket 5 gal': {
    matKey: 'Gopher Basket 5 Gal',
    labKey: 'Gopher Basket - Install Rate',
    mode: 'perMin',
    unit: 'ea',
    labUnit: 'min/ea',
  },
  'Gopher Basket 15 gal': {
    matKey: 'Gopher Basket 15 Gal',
    labKey: 'Gopher Basket - Install Rate',
    mode: 'perMin',
    unit: 'ea',
    labUnit: 'min/ea',
  },
  'Mesh Flat': {
    matKey: 'Mesh Flat',
    labKey: 'Mesh Flat - Install Rate',
    mode: 'perMin',
    unit: 'SF',
    labUnit: 'min/SF',
  },
  'Jute Fabric': {
    matKey: 'Jute Fabric',
    labKey: 'Jute Fabric - Install Rate',
    mode: 'perMin',
    unit: 'SF',
    labUnit: 'min/SF',
  },
}
const ADDON_TYPES = Object.keys(ADDON_META)

const WORKER_DEFAULTS = {
  laborRatePerHour: 35,
  laborBurdenPct: 0.29,
  gpmd: 425,
  commissionRate: 0.12,
}

const n = v => parseFloat(v) || 0
const r2 = x => Math.round(((x || 0) + Number.EPSILON) * 100) / 100

// ── Helpers ───────────────────────────────────────────────────────────────────
function lr(laborRates, key) {
  return laborRates[key] ?? LABOR_DEFAULTS[key] ?? 0
}
function mp(materialPrices, key) {
  return materialPrices[key] ?? ADDON_MAT_DEFAULTS[key] ?? 0
}

function getSmallPerDay(laborRates, type) {
  return laborRates[type] ?? SMALL_PLANT_DEFAULTS[type]?.perDay ?? 25
}
function getLargePerDay(laborRates, type) {
  return laborRates[type] ?? LARGE_PLANT_DEFAULTS[type]?.perDay ?? 15
}

// ── Vendor-catalog material price ─────────────────────────────────────────────
// The ONLY thing the Vendor selection changes: the material $ source. When a
// real vendor is selected AND a material_rates row exists (name===dbName &&
// vendor_id===vendorId) use that row's unit_cost; otherwise fall back to the
// House price (name-keyed mp[dbName]) then the hard fallback. Vendor 'House'
// resolves to exactly the original math, so In-House numbers never move.
// Shared resolver (src/lib/materialCatalog.js) — same vendor→House→fallback
// order. Planting keeps its own separate material/labor maps (plant names can
// key both), so it doesn't use the merged useMaterialCatalog hook.
const plantMatPrice = resolveMaterialPrice

// ── Per-row calculators ───────────────────────────────────────────────────────
// Plant row: In-House material = qty × the row's (editable, vendor-defaulted)
// unit price — IDENTICAL to the original `qty * n(r.price)`, including the
// perDay > 0 guard that skips both hrs and material when the labor rate is 0.
function computePlantRow(row, perDay) {
  const qty = n(row.qty)
  let hrs = 0,
    mat = 0
  if (qty > 0 && perDay > 0) {
    hrs = (qty / perDay) * 8
    mat = qty * n(row.price)
  }
  const subUnit = n(row.price)
  const subEach = row.subEach !== '' && row.subEach != null ? n(row.subEach) : subUnit
  const subMat = qty > 0 ? qty * subEach : 0
  return { qty, hrs, mat, subUnit, subEach, subMat }
}

// Add-on row: labor formula identical to the original per-item math; material is
// vendor-resolved (House = original mp() price).
function computeAddonRow(row, laborRates, materialPrices, materialRows) {
  const meta = ADDON_META[row.type] || {}
  const qty = n(row.qty)
  const rate = lr(laborRates, meta.labKey)
  let hrs = 0
  if (meta.mode === 'perDay') hrs = rate > 0 ? (qty / rate) * 8 : 0
  else if (meta.mode === 'perMin') hrs = (qty * rate) / 60
  const unitPrice = plantMatPrice(
    meta.matKey,
    row.vendor,
    materialRows,
    materialPrices,
    ADDON_MAT_DEFAULTS[meta.matKey] ?? 0
  )
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
  laborBurdenPct = WORKER_DEFAULTS.laborBurdenPct,
  materialRows = []
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
  const tillManDays =
    sqft > 0 && soilMoveRate > 0 && tillingRate > 0 && amendRate > 0
      ? soilCY / soilMoveRate + sqft / tillingRate + sqft / amendRate
      : 0
  const tillHrs = tillManDays * 8

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

  const subMarkup = n(state.subGpMarkupRate) || 0.2
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
    commission = subGp * WORKER_DEFAULTS.commissionRate
    price = subCost + subGp + commission
  } else {
    walkHrs = walkHrsIH
    totalHrs = totalHrsIH
    manDays = totalHrs / 8
    totalMat = totalMatIH
    laborCost = totalHrs * laborRatePerHour
    burden = laborCost * (n(laborBurdenPct) || WORKER_DEFAULTS.laborBurdenPct)
    subCost = craneSub + manSub
    gp = manDays * gpmd
    subGp = 0
    commission = gp * WORKER_DEFAULTS.commissionRate
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
function newSmallRow(type = 'Flats of Groundcover', materialPrices = {}, materialRows = []) {
  const fb = SMALL_PLANT_DEFAULTS[type]?.price ?? 0
  return { vendor: 'House', type, qty: '', price: plantMatPrice(type, 'House', materialRows, materialPrices, fb), subEach: '' }
}
function newLargeRow(type = '15 gallon standard', materialPrices = {}, materialRows = []) {
  const fb = LARGE_PLANT_DEFAULTS[type]?.price ?? 0
  return { vendor: 'House', type, qty: '', price: plantMatPrice(type, 'House', materialRows, materialPrices, fb), subEach: '' }
}
const blankAddonRow = () => ({ vendor: 'House', type: 'Tree Stake', qty: '', subEach: '' })

const DEFAULT_SMALL_ROWS = () =>
  Array.from({ length: 4 }, () => ({
    vendor: 'House',
    type: 'Flats of Groundcover',
    qty: '',
    price: SMALL_PLANT_DEFAULTS['Flats of Groundcover'].price,
    subEach: '',
  }))
const DEFAULT_LARGE_ROWS = () =>
  Array.from({ length: 4 }, () => ({
    vendor: 'House',
    type: '15 gallon standard',
    qty: '',
    price: LARGE_PLANT_DEFAULTS['15 gallon standard'].price,
    subEach: '',
  }))
const DEFAULT_ADDON_ROWS = () => [blankAddonRow()]

const OTHER_ADDON_DEFAULTS = {
  craneCost: '',
  addonHours: '',
  addonMaterials: '',
  deliveryCharges: '',
}

const DEFAULT_MANUAL_ROWS = [
  { label: 'Misc 1', hours: '', materials: '', subCost: '' },
  { label: 'Misc 2', hours: '', materials: '', subCost: '' },
  { label: 'Misc 3', hours: '', materials: '', subCost: '' },
]

// Migrate the legacy fixed `addons` object into the new Vendor+Item row model.
// Only non-zero legacy items become rows, in the SAME order the original calc
// summed them — so a legacy save's In-House add-on totals stay byte-for-byte
// identical (adding zero-qty items changes nothing).
function migrateAddonRows(a = {}) {
  const rows = []
  const push = (type, field) => {
    if (n(a[field]) > 0) rows.push({ vendor: 'House', type, qty: a[field], subEach: '' })
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
      ? src.smallPlantRows.map(r => ({ vendor: 'House', subEach: '', ...r }))
      : DEFAULT_SMALL_ROWS(),
    largePlantRows: src.largePlantRows
      ? src.largePlantRows.map(r => ({ vendor: 'House', subEach: '', ...r }))
      : DEFAULT_LARGE_ROWS(),
    addonRows: src.addonRows
      ? src.addonRows.map(r => ({ vendor: 'House', subEach: '', ...r }))
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
    initialData?.laborRatePerHour ?? WORKER_DEFAULTS.laborRatePerHour
  )
  const [laborBurdenPct, setLaborBurdenPct] = useState(
    initialData?.laborBurdenPct ?? WORKER_DEFAULTS.laborBurdenPct
  )

  // Free-text notes for this module — Sam writes auto-generated
  // takeoffs here via create_estimate_from_takeoff, and the user can
  // overwrite / append their own.
  const [notes, setNotes] = useState(initialData?.notes ?? '')
  const [walkAccess, setWalkAccess] = useState(
    initialData?.walkAccess ?? {
      paceLfPerMin: DEFAULT_WALK_ACCESS_PACE_LF_PER_MIN,
    }
  )
  // materialPrices: { 'Plant / Material Name': unit_cost, ... } (House fallback)
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
    // material_rates retired: House/base prices from the new model
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
    setMaterialRows(catRes.data || [])
    setVendors(
      (venRes.data || []).map(v => ({
        id: v.id,
        name: v.company_name,
      }))
    )
  }, [])

  useEffect(() => {
    if (!initialData?.laborRatePerHour) {
      supabase
        .from('company_settings')
        .select('labor_rate_per_hour, labor_burden_pct, walk_access_pace_lf_per_min')
        .single()
        .then(({ data }) => {
          if (data) {
            setLaborRatePerHour(
              parseFloat(data.labor_rate_per_hour) || WORKER_DEFAULTS.laborRatePerHour
            )
            if (data.labor_burden_pct != null)
              setLaborBurdenPct(parseFloat(data.labor_burden_pct))
            if (data.walk_access_pace_lf_per_min != null) {
              const _wpace = parseFloat(data.walk_access_pace_lf_per_min)
              setWalkAccess({
                paceLfPerMin:
                  Number.isFinite(_wpace) && _wpace > 0
                    ? _wpace
                    : DEFAULT_WALK_ACCESS_PACE_LF_PER_MIN,
              })
            }
          }
        })
    }
    // Always refresh so the vendor list + material catalog load, even when
    // editing a saved estimate (which already carries a materialPrices map).
    refreshAllRates().then(() => setPricesLoading(false))
  }, [refreshAllRates])

  const gpmd = initialData?.gpmd ?? WORKER_DEFAULTS.gpmd
  const subGpMarkupRate = initialData?.subGpMarkupRate ?? 0.2

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
    materialRows
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
    { value: 'House', label: 'Standard' },
    ...vendorsForCategory(PLANTING_CATEGORY).map(v => ({ value: v.id, label: v.name })),
  ]

  // ── Row helpers ─────────────────────────────────────────────────────────────
  // Plant row update. Changing Vendor or Item resets the unit price to the
  // vendor-resolved default (House = original master-rate / catalog price), and
  // (on the Sub tab) refreshes the flat $/unit default.
  function plantUpdate(setRows, defaultsMap, i, field, val) {
    setRows(rows =>
      rows.map((r, idx) => {
        if (idx !== i) return r
        if (field === 'type' || field === 'vendor') {
          const next = { ...r, [field]: val }
          const fb = defaultsMap[next.type]?.price ?? 0
          const price = plantMatPrice(next.type, next.vendor, materialRows, materialPrices, fb)
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
  function renderPlantSection(title, rows, setRows, defaultsMap, TYPES, perDayFn, addLabel) {
    return (
      <div>
        <SectionHeader title={title} />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 border-b border-gray-200">
                <th className="text-left pb-1 pr-2 font-medium w-40">Vendor</th>
                <th className="text-left pb-1 pr-2 font-medium">Plant Type</th>
                <th className="text-left pb-1 pr-2 font-medium w-20">Qty</th>
                {!isSub && <th className="text-left pb-1 pr-2 font-medium w-28">Price/Ea</th>}
                {!isSub && (
                  <th className="text-right pb-1 pr-2 font-medium text-gray-400">Plants/Day</th>
                )}
                <th className="text-right pb-1 pr-2 font-medium text-gray-400 w-24">
                  {isSub ? 'Flat $/unit' : 'Est. Hrs'}
                </th>
                <th className="text-right pb-1 pr-2 font-medium text-gray-400 w-24">Material $</th>
                <th className="w-6" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => {
                const perDay = perDayFn(laborRates, row.type)
                const c = computePlantRow(row, perDay)
                const masterPrice =
                  materialPrices[row.type] ?? defaultsMap[row.type]?.price ?? 0
                const isHouse = !row.vendor || row.vendor === 'House'
                return (
                  <tr key={i} className="border-b border-gray-100">
                    <td className="py-1.5 pr-2">
                      <select
                        className="input text-sm py-1 w-full"
                        value={row.vendor || 'House'}
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
                        value={row.type}
                        onChange={e => plantUpdate(setRows, defaultsMap, i, 'type', e.target.value)}
                      >
                        {TYPES.map(t => (
                          <option key={t}>{t}</option>
                        ))}
                      </select>
                    </td>
                    <td className="py-1.5 pr-2">
                      <NumInput
                        value={row.qty}
                        onChange={v => plantUpdate(setRows, defaultsMap, i, 'qty', v)}
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
                          {isHouse && (
                            <RateEditPopover
                              table="material_rates"
                              name={row.type}
                              category="Planting"
                              unitLabel="ea"
                              currentValue={masterPrice}
                              onSaved={refreshAllRates}
                            />
                          )}
                        </div>
                      </td>
                    )}
                    {!isSub && (
                      <td className="py-1.5 text-right text-gray-400 text-xs">
                        <span className="inline-flex items-center justify-end gap-1">
                          {perDay < 1 ? perDay.toFixed(2) : perDay.toLocaleString()}
                          <RateEditPopover
                            table="labor_rates"
                            name={row.type}
                            category="Planting"
                            mode="coefficient"
                            unitLabel="per day"
                            currentValue={perDay}
                            onSaved={refreshAllRates}
                          />
                        </span>
                      </td>
                    )}
                    <td className="py-1.5 text-right text-xs pr-2">
                      {isSub ? (
                        <input
                          type="number"
                          step="any"
                          className="input text-sm py-1 w-24 text-right"
                          placeholder={r2(c.subUnit).toString()}
                          value={row.subEach ?? ''}
                          onChange={e => plantUpdate(setRows, defaultsMap, i, 'subEach', e.target.value)}
                        />
                      ) : (
                        <span className="text-gray-600">{c.hrs > 0 ? c.hrs.toFixed(2) : '—'}</span>
                      )}
                    </td>
                    <td className="py-1.5 text-right text-xs text-gray-600">
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
                ? newSmallRow('Flats of Groundcover', materialPrices, materialRows)
                : newLargeRow('15 gallon standard', materialPrices, materialRows),
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
                <th className="text-left pb-1 pr-2 font-medium w-40">Vendor</th>
                <th className="text-left pb-1 pr-2 font-medium">Item</th>
                <th className="text-left pb-1 pr-2 font-medium w-20">Qty</th>
                {!isSub && <th className="text-left pb-1 pr-2 font-medium">Rate</th>}
                <th className="text-right pb-1 pr-2 font-medium text-gray-400 w-24">
                  {isSub ? 'Flat $/unit' : 'Est. Hrs'}
                </th>
                <th className="text-right pb-1 pr-2 font-medium text-gray-400 w-24">Material $</th>
                <th className="w-6" />
              </tr>
            </thead>
            <tbody>
              {addonRows.map((row, i) => {
                const meta = ADDON_META[row.type] || {}
                const c = computeAddonRow(row, laborRates, materialPrices, materialRows)
                const isHouse = !row.vendor || row.vendor === 'House'
                const houseMat = mp(materialPrices, meta.matKey)
                return (
                  <tr key={i} className="border-b border-gray-100">
                    <td className="py-1.5 pr-2">
                      <select
                        className="input text-sm py-1 w-full"
                        value={row.vendor || 'House'}
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
                        value={row.type}
                        onChange={e => addonUpdate(i, 'type', e.target.value)}
                      >
                        {ADDON_TYPES.map(t => (
                          <option key={t}>{t}</option>
                        ))}
                      </select>
                    </td>
                    <td className="py-1.5 pr-2">
                      <NumInput value={row.qty} onChange={v => addonUpdate(i, 'qty', v)} />
                    </td>
                    {!isSub && (
                      <td className="py-1.5 pr-2">
                        <div className="flex items-center gap-1 flex-wrap text-xs text-gray-400">
                          <span>
                            ${c.unitPrice.toFixed(2)}/{meta.unit}
                          </span>
                          {isHouse && (
                            <RateEditPopover
                              table="material_rates"
                              name={meta.matKey}
                              category="Planting"
                              unitLabel={meta.unit}
                              currentValue={houseMat}
                              onSaved={refreshAllRates}
                            />
                          )}
                          {isHouse && meta.labKey && (
                            <RateEditPopover
                              table="labor_rates"
                              name={meta.labKey}
                              category="Planting"
                              mode="coefficient"
                              unitLabel={meta.labUnit || 'rate'}
                              currentValue={lr(laborRates, meta.labKey)}
                              onSaved={refreshAllRates}
                            />
                          )}
                        </div>
                      </td>
                    )}
                    <td className="py-1.5 text-right text-xs pr-2">
                      {isSub ? (
                        <input
                          type="number"
                          step="any"
                          className="input text-sm py-1 w-24 text-right"
                          placeholder={r2(c.subUnit).toString()}
                          value={row.subEach ?? ''}
                          onChange={e => addonUpdate(i, 'subEach', e.target.value)}
                        />
                      ) : (
                        <span className="text-gray-600">{c.hrs > 0 ? c.hrs.toFixed(2) : '—'}</span>
                      )}
                    </td>
                    <td className="py-1.5 text-right text-xs text-gray-600">
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

  return (
    <SubTabContext.Provider value={isSub}>
    <div className="space-y-5">
      {/* ── Sticky GPMD bar ── */}
      <div className="sticky top-0 z-20 -mx-6 px-6 pt-1 pb-1 bg-gray-900 shadow-lg">
        {/* GPMD summary bar */}
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


      <WorkTypeChooser value={subType || 'In-House'} onChange={setSubType} />

      {/* Crew Type */}
      <div className="flex items-center gap-3 bg-gray-50 rounded-lg px-4 py-2.5 border border-gray-200">
        <label className="text-sm font-medium text-gray-700 whitespace-nowrap">Crew Type</label>
        <select
          value={crewType}
          onChange={e => setCrewType(e.target.value)}
          className="input text-sm py-1 w-36"
        >
          <option value="Demo">Demo</option>
          <option value="Landscape">Landscape</option>
          <option value="Masonry">Masonry</option>
          <option value="Paver">Paver</option>
          <option value="Specialty">Specialty</option>
        </select>
      </div>

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

      {/* Till & Amend Soil — In-House only (labor, no material) */}
      {!isSub && (
        <>
          <SectionHeader title="Till & Amend Soil" />
          <div>
            <div className="flex items-center flex-wrap gap-2 text-xs text-gray-400 mb-1">
              <span>{lr(laborRates, 'Till - Soil Move Rate')} CY/d</span>
              <RateEditPopover
                table="labor_rates"
                name="Till - Soil Move Rate"
                category="Planting"
                mode="coefficient"
                unitLabel="CY/day"
                currentValue={lr(laborRates, 'Till - Soil Move Rate')}
                onSaved={refreshAllRates}
              />
              <span>· {lr(laborRates, 'Till - Tilling Rate')} SF/d</span>
              <RateEditPopover
                table="labor_rates"
                name="Till - Tilling Rate"
                category="Planting"
                mode="coefficient"
                unitLabel="SF/day"
                currentValue={lr(laborRates, 'Till - Tilling Rate')}
                onSaved={refreshAllRates}
              />
              <span>· {lr(laborRates, 'Till - Amend Rate')} SF/d</span>
              <RateEditPopover
                table="labor_rates"
                name="Till - Amend Rate"
                category="Planting"
                mode="coefficient"
                unitLabel="SF/day"
                currentValue={lr(laborRates, 'Till - Amend Rate')}
                onSaved={refreshAllRates}
              />
            </div>
            <p className="text-xs text-gray-500 mb-0.5">Sqft</p>
            <NumInput value={tillSqft} onChange={setTillSqft} placeholder="0" />
            {n(tillSqft) > 0 && (
              <p className="text-xs text-gray-400 mt-1">{calc.tillHrs.toFixed(2)} hrs estimated</p>
            )}
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
        '+ Add Row'
      )}

      {/* ── Large Plants / Trees ── */}
      {renderPlantSection(
        'Large Plants / Trees',
        largePlantRows,
        setLargePlantRows,
        LARGE_PLANT_DEFAULTS,
        Object.keys(LARGE_PLANT_DEFAULTS),
        getLargePerDay,
        '+ Add Row'
      )}

      {/* ── Planting Add-Ons ── */}
      {renderAddonSection()}

      {/* ── Manual Entry ── */}
      <div>
        <SectionHeader title="Manual Entry" />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 border-b border-gray-200">
                <th className="text-left pb-1 pr-2 font-medium">Description</th>
                <th className="text-left pb-1 pr-2 font-medium">Hours</th>
                <th className="text-left pb-1 pr-2 font-medium">Materials $</th>
                <th className="text-left pb-1 font-medium">Sub Cost $</th>
              </tr>
            </thead>
            <tbody>
              {manualRows.map((row, i) => (
                <tr key={i} className="border-b border-gray-100">
                  <td className="py-1 pr-2">
                    <input
                      className="input text-sm py-1"
                      value={row.label}
                      onChange={e => updateManual(i, 'label', e.target.value)}
                    />
                  </td>
                  <td className="py-1 pr-2">
                    <NumInput value={row.hours} onChange={v => updateManual(i, 'hours', v)} />
                  </td>
                  <td className="py-1 pr-2">
                    <NumInput
                      value={row.materials}
                      onChange={v => updateManual(i, 'materials', v)}
                    />
                  </td>
                  <td className="py-1">
                    <NumInput value={row.subCost} onChange={v => updateManual(i, 'subCost', v)} />
                  </td>
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
          {saving ? 'Saving...' : 'Add Module'}
        </button>
      </div>
    </div>
    </SubTabContext.Provider>
  )
}
