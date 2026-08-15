import WorkTypeChooser from './WorkTypeChooser'
import CrewTypeBar from './CrewTypeBar'
import ModuleHeaderSlot from './ModuleHeaderSlot'
import { useState, useEffect, useCallback, useContext } from 'react'
import { SubTabContext, subSectionTitle } from './subTabContext'
import { supabase } from '../../lib/supabase'
import GpmdBar from './GpmdBar'
import { fetchSalesTaxRate } from '../../lib/companyDefaults'
import { calcWalkAccessLabor } from '../../lib/walkAccess'
import { useMaterialCatalog, resolveMaterialPrice, catalogOptions } from '../../lib/materialCatalog'

// ─────────────────────────────────────────────────────────────────────────────
// Finishes Module — Flatwork, Wall Caps, Wall Finishes
//
// Each of the three sections is an add/remove ROW table with a Vendor column +
// an Item (type) column. The Item dropdown is ALWAYS the section's fixed type
// list — the type drives the pricing/labor FORMULA. The Vendor only changes
// where the MATERIAL price comes from (Standard named-rate fallback vs. a vendor's
// material_rates row). Every coverage / geometry / labor formula is preserved
// exactly from the original calc — the Vendor selection feeds a different
// material $ into the same math.
//
// In-House and Subcontractor are independent calculators (makeTab / ihTab /
// subTab). The Sub tab prices each row at a flat $/unit with NO labor hours and
// routes the itemized cost into subCost (GpmdBar's 'sub' variant).
// ─────────────────────────────────────────────────────────────────────────────

const FINISHES_CATEGORY = 'Finishes'

// Identity-only: each entry carries just the DB rate name (`db`). Every price /
// labor coefficient is read LIVE from the rate map — no hardcoded fallbacks. A
// missing rate resolves to 0 (guaranteed present via the fallbacks-seed SQL).
const FINISHES_RATES = {
  // ── Flatwork material costs ────────────────────────────────────────────────
  flatTile: { db: 'Finishes Tile Flatwork' }, // $/SF
  flatBrick: { db: 'Finishes Brick Flatwork' }, // $/brick
  flatFlagstone: { db: 'Finishes Flagstone Flatwork' }, // $/ton
  flatPorcelain: { db: 'Finishes Porcelain Flatwork' }, // $/SF

  // ── Wall Caps material costs ───────────────────────────────────────────────
  capFlagstone: { db: 'Finishes Cap Flagstone' }, // $/ton
  capPrecast: { db: 'Finishes Cap Precast' }, // $/piece
  capBullnose: { db: 'Finishes Cap Bullnose Brick' }, // $/LF
  concreteTruck: { db: 'Finishes Concrete Truck' }, // $/CY (for PIP cap)

  // ── Wall Finishes material costs ───────────────────────────────────────────
  sandStucco: { db: 'Sand Stucco - Finishes' }, // $/SF
  smoothStucco: { db: 'Smooth Stucco - Finishes' }, // $/SF
  ledgerstone: { db: 'Ledgerstone - Finishes' }, // $/SF
  stackedStone: { db: 'Stacked Stone - Finishes' }, // $/SF
  tile: { db: 'Tile - Finishes' }, // $/SF
  realFlagstone: { db: 'Real Flagstone - Finishes' }, // $/ton
  realStone: { db: 'Real Stone - Finishes' }, // $/ton

  // ── Labor rates ────────────────────────────────────────────────────────────
  flatTileLab: { db: 'Finishes Tile Flatwork Labor Rate' }, // hrs/SF
  flatBrickLab: { db: 'Finishes Brick Flatwork Labor Rate' }, // hrs/SF
  flatFlagstoneLab: { db: 'Finishes Flagstone Flatwork Labor Rate' }, // hrs/SF
  flatPorcelainLab: { db: 'Finishes Porcelain Flatwork Labor Rate' }, // hrs/SF
  sandStuccoLab: { db: 'Sand Stucco - Finishes Labor Rate' }, // SF/day
  smoothStuccoLab: { db: 'Smooth Stucco - Finishes Labor Rate' }, // SF/day
  ledgerstoneLab: { db: 'Ledgerstone - Finishes Labor Rate' }, // SF/day
  stackedStoneLab: { db: 'Stacked Stone - Finishes Labor Rate' }, // SF/day
  tileLab: { db: 'Tile - Finishes Labor Rate' }, // hrs/SF
  flagstoneLab: { db: 'Real Flagstone - Finishes Labor Rate' }, // hrs/SF
  realStoneLab: { db: 'Real Stone - Finishes Labor Rate' }, // hrs/SF

  // ── Cap labor coefficients ─────────────────────────────────────────────────
  capFlagstoneLab: { db: 'Finishes Cap Flagstone Labor Rate' }, // hrs/LF
  capPrecastLab: { db: 'Finishes Cap Precast Labor Rate' }, // hrs/ea
  capPipLab: { db: 'Finishes Cap PIP Concrete Labor Rate' }, // hrs/LF
  capBullnoseLab: { db: 'Finishes Cap Bullnose Labor Rate' }, // hrs/LF

  // ── Consumable material costs ──────────────────────────────────────────────
  stoneScrews: { db: 'Finishes Stone Screws' }, // $/SF
  tileAdhesive: { db: 'Finishes Tile Adhesive/Grout' }, // $/SF
}

const DEFAULTS = {
  laborRatePerHour: 35,
  laborBurdenPct: 0.29,
  gpmd: 425,
}

const n = v => parseFloat(v) || 0
const r2 = x => Math.round(((x || 0) + Number.EPSILON) * 100) / 100

// ── Fixed per-section type lists (the Item dropdown; NOT from the DB) ─────────
const FLAT_TYPES = ['Tile', 'Brick', 'Flagstone', 'Porcelain']
const CAP_TYPES = ['None', 'Flagstone', 'Precast', 'PIP Concrete', 'Bullnose Brick']
const WALL_FINISH_TYPES = [
  'Sand Stucco',
  'Smooth Stucco',
  'Ledgerstone',
  'Stacked Stone',
  'Tile',
  'Real Flagstone',
  'Real Stone',
]

// Per-type rate metadata: which FINISHES_RATES material + labor key each type
// uses, its display unit, and whether it carries an editable $/ton override.
const FLAT_META = {
  Tile: { matKey: 'flatTile', labKey: 'flatTileLab', matUnit: 'Sq Ft', labUnit: 'hrs per Sq Ft' },
  Brick: { matKey: 'flatBrick', labKey: 'flatBrickLab', matUnit: 'brick', labUnit: 'hrs per Sq Ft' },
  Flagstone: {
    matKey: 'flatFlagstone',
    labKey: 'flatFlagstoneLab',
    matUnit: 'Tons',
    labUnit: 'hrs per Sq Ft',
    override: true,
  },
  Porcelain: { matKey: 'flatPorcelain', labKey: 'flatPorcelainLab', matUnit: 'Sq Ft', labUnit: 'hrs per Sq Ft' },
}
const WALL_META = {
  'Sand Stucco': { matKey: 'sandStucco', labKey: 'sandStuccoLab', matUnit: 'Sq Ft', labUnit: 'Sq Ft per day' },
  'Smooth Stucco': { matKey: 'smoothStucco', labKey: 'smoothStuccoLab', matUnit: 'Sq Ft', labUnit: 'Sq Ft per day' },
  Ledgerstone: { matKey: 'ledgerstone', labKey: 'ledgerstoneLab', matUnit: 'Sq Ft', labUnit: 'Sq Ft per day' },
  'Stacked Stone': { matKey: 'stackedStone', labKey: 'stackedStoneLab', matUnit: 'Sq Ft', labUnit: 'Sq Ft per day' },
  Tile: { matKey: 'tile', labKey: 'tileLab', matUnit: 'Sq Ft', labUnit: 'hrs per Sq Ft' },
  'Real Flagstone': {
    matKey: 'realFlagstone',
    labKey: 'flagstoneLab',
    matUnit: 'Tons',
    labUnit: 'hrs per Sq Ft',
    override: true,
  },
  'Real Stone': {
    matKey: 'realStone',
    labKey: 'realStoneLab',
    matUnit: 'Tons',
    labUnit: 'hrs per Sq Ft',
    override: true,
  },
}
const CAP_META = {
  Flagstone: { matKey: 'capFlagstone', matUnit: 'Tons' },
  Precast: { matKey: 'capPrecast', matUnit: 'Each' },
  'PIP Concrete': { matKey: 'concreteTruck', matUnit: 'Cu Yd' },
  'Bullnose Brick': { matKey: 'capBullnose', matUnit: 'Ln Ft' },
}

// ── Vendor-first Type pickers (mirror ArtificialTurfModule.baseMatOptions) ─────
// Each picker's built-in Type list stays the source of truth for LABOR + geometry
// (compute switches on row.type). The Vendor selection changes only WHICH catalog
// Items appear in the Type dropdown and where the MATERIAL $ resolves from:
//   Standard/unset → the picker's built-in Type list (unchanged legacy behavior).
//   Real vendor    → only that vendor's catalog Items, INTERSECTED with this
//                    picker's built-in set (so shared 'Finish Material' can't
//                    cross-show wall items under Flatwork or vice-versa).
// Two pickers (Flatwork + Wall Finishes) read the SAME sub-category 'Finish
// Material'; each keeps only its own Items via its type→Item map — no data split.
const FINISH_SUBCAT = { flat: 'Finish Material', cap: 'Cap', wall: 'Finish Material' }

// built-in Type → catalog Item name (per picker). Only types with a catalog Item
// are listed; 'None' / 'PIP Concrete' have no catalog Item (built-ins only).
const FLAT_ITEM_BY_TYPE = {
  Tile: 'Tile Flatwork',
  Brick: 'Brick Flatwork',
  Flagstone: 'Flagstone Flatwork',
  Porcelain: 'Porcelain Flatwork',
}
const CAP_ITEM_BY_TYPE = {
  Flagstone: 'Flagstone',
  Precast: 'Precast',
  'Bullnose Brick': 'Bullnose Brick',
}
const WALL_ITEM_BY_TYPE = {
  'Sand Stucco': 'Sand Stucco - Finishes',
  'Smooth Stucco': 'Smooth Stucco - Finishes',
  Ledgerstone: 'Ledgerstone - Finishes',
  'Stacked Stone': 'Stacked Stone - Finishes',
  Tile: 'Tile - Finishes',
  'Real Flagstone': 'Real Flagstone - Finishes',
  'Real Stone': 'Real Stone - Finishes',
}

// FINISHES_RATES matKey → catalog Item name, for the vendor-aware price lookup.
// (Wall items: Item name == the FINISHES_RATES db name. Cap/Flatwork: they differ,
// so the vendor price must resolve on the catalog Item name, not the db name.)
const FINISH_CAT_ITEM = {
  // Wall Caps (sub_category 'Cap')
  capFlagstone: 'Flagstone',
  capPrecast: 'Precast',
  capBullnose: 'Bullnose Brick',
  // Flatwork (sub_category 'Finish Material', FLAT set)
  flatTile: 'Tile Flatwork',
  flatBrick: 'Brick Flatwork',
  flatFlagstone: 'Flagstone Flatwork',
  flatPorcelain: 'Porcelain Flatwork',
  // Wall Finishes (sub_category 'Finish Material', WALL set)
  sandStucco: 'Sand Stucco - Finishes',
  smoothStucco: 'Smooth Stucco - Finishes',
  ledgerstone: 'Ledgerstone - Finishes',
  stackedStone: 'Stacked Stone - Finishes',
  tile: 'Tile - Finishes',
  realFlagstone: 'Real Flagstone - Finishes',
  realStone: 'Real Stone - Finishes',
  // concreteTruck (PIP cap), stoneScrews, tileAdhesive: no catalog Item → Standard only
}

const _isStd = v => !v || v === 'Standard'

// Vendor-first Type options for one picker. Standard/unset → the built-in Type
// list unchanged. Real vendor → the vendor's 'null-vendor'-scoped catalog Items
// INTERSECTED with this picker's built-in set (each mapped back to its built-in
// Type so the option VALUE round-trips row.type and labor/geometry keep working).
// `alwaysBuiltIn` types (None / PIP Concrete) stay selectable regardless of vendor.
function finishTypeOptions(materialRows, subcat, builtInTypes, itemByType, vendorSel, alwaysBuiltIn = []) {
  // Catalog-only, vendor-first: Standard/unset → the null-vendor (Standard) catalog
  // Items; a real vendor → that vendor's Items. Each carried Item is intersected
  // with this picker's built-in set (via itemByType) so the option VALUE round-trips
  // row.type and labor/geometry keep working. The built-in Type list is NOT a
  // wholesale option source anymore; only `alwaysBuiltIn` sentinels (None / PIP
  // Concrete) — non-material choices, not catalog items — stay regardless of catalog.
  const isStd = _isStd(vendorSel) || vendorSel === 'auto'
  const carried = new Set(
    catalogOptions(materialRows, subcat, isStd ? 'Standard' : vendorSel, {
      standardRows: 'null-vendor',
      stripPrefix: true,
      category: FINISHES_CATEGORY,
    }).map(o => o.label)
  )
  const opts = []
  builtInTypes.forEach(t => {
    if (alwaysBuiltIn.includes(t)) {
      opts.push({ value: t, label: t })
      return
    }
    const item = itemByType[t]
    if (item && carried.has(item)) opts.push({ value: t, label: item })
  })
  return opts
}

// Vendor-aware material price for a FINISHES_RATES key: a real vendor's catalog
// Item price when that vendor carries the mapped Item; otherwise the existing
// name-keyed Standard price (mp[db] → hard fallback). Standard is byte-for-byte
// unchanged from the old resolveMaterialPrice(db, 'Standard', …) path.
function finishMatPriceV(matKey, vendor, materialRows, mp) {
  const spec = FINISHES_RATES[matKey]
  const item = FINISH_CAT_ITEM[matKey]
  if (vendor && vendor !== 'Standard' && item) {
    const vp = resolveMaterialPrice(item, vendor, materialRows, {}, NaN)
    if (Number.isFinite(vp)) return vp
  }
  return n(mp?.[spec.db])
}

// ── Vendor-catalog material price ─────────────────────────────────────────────
// The ONLY thing the Vendor selection changes: the material $ source.
// If a real vendor is selected AND a material_rates row exists whose name===dbName
// and vendor_id===vendorId, use that row's unit_cost. Otherwise fall back to the
// Standard price (name-keyed materialPrices[dbName]) and finally the hard fallback.
// Uses the shared resolver (src/lib/materialCatalog.js) — same vendor→Standard→
// fallback order, so Finishes numbers are byte-for-byte unchanged.
const finishMatPrice = resolveMaterialPrice

// ── Per-row calculators — identical formulas to the original calcFinishes, just
//    fed the vendor-resolved material price. Each returns { mat, hrs, subUnit,
//    subEach, subMat, tons, unit }. subUnit is the flat $/unit default used on
//    the Sub tab; subMat = quantity × the (editable) flat price. ───────────────
function computeFlatRow(row, mp, materialRows) {
  const sf = n(row.sf)
  const v = row.vendor
  const price = k => finishMatPriceV(k, v, materialRows, mp)
  const lab = k => n(mp?.[FINISHES_RATES[k].db])
  let mat = 0,
    hrs = 0,
    subUnit = 0,
    tons = 0
  switch (row.type) {
    case 'Tile':
      mat = sf * price('flatTile')
      hrs = sf > 0 ? sf * lab('flatTileLab') : 0
      subUnit = price('flatTile')
      break
    case 'Brick':
      mat = sf * 2 * price('flatBrick')
      hrs = sf > 0 ? sf * lab('flatBrickLab') : 0
      subUnit = 2 * price('flatBrick')
      break
    case 'Flagstone': {
      const rate = n(row.rateIn) || price('flatFlagstone')
      mat = sf > 0 ? (sf / 80) * rate : 0
      hrs = sf > 0 ? sf * lab('flatFlagstoneLab') : 0
      subUnit = rate / 80
      tons = sf / 80
      break
    }
    case 'Porcelain':
      mat = sf * price('flatPorcelain')
      hrs = sf > 0 ? sf * lab('flatPorcelainLab') : 0
      subUnit = price('flatPorcelain')
      break
    default:
      break
  }
  const subEach = row.subEach !== '' && row.subEach != null ? n(row.subEach) : subUnit
  return { mat, hrs, subUnit, subEach, subMat: sf * subEach, tons, unit: 'SF' }
}

function computeCapRow(row, mp, materialRows) {
  const lf = n(row.lf),
    widthIn = n(row.widthIn),
    qty = n(row.qty)
  const v = row.vendor
  const price = k => finishMatPriceV(k, v, materialRows, mp)
  const lab = k => n(mp?.[FINISHES_RATES[k].db])
  let mat = 0,
    hrs = 0,
    subUnit = 0,
    subQty = 0,
    unit = 'LF'
  switch (row.type) {
    case 'Flagstone':
      mat = (((widthIn / 12) * lf * 0.0833 * 100) / 2000) * price('capFlagstone')
      hrs = lf * lab('capFlagstoneLab')
      subUnit = (((widthIn / 12) * 0.0833 * 100) / 2000) * price('capFlagstone')
      subQty = lf
      break
    case 'Precast':
      mat = qty * price('capPrecast')
      hrs = qty * lab('capPrecastLab')
      subUnit = price('capPrecast')
      subQty = qty
      unit = 'Qty'
      break
    case 'PIP Concrete':
      mat = ((lf * (widthIn / 12) * 0.333) / 27) * price('concreteTruck')
      hrs = lf * lab('capPipLab')
      subUnit = (((widthIn / 12) * 0.333) / 27) * price('concreteTruck')
      subQty = lf
      break
    case 'Bullnose Brick':
      mat = lf * price('capBullnose')
      hrs = lf * lab('capBullnoseLab')
      subUnit = price('capBullnose')
      subQty = lf
      break
    default:
      break
  }
  const subEach = row.subEach !== '' && row.subEach != null ? n(row.subEach) : subUnit
  return { mat, hrs, subUnit, subEach, subMat: subQty * subEach, unit, lf, qty, widthIn }
}

function computeWallRow(row, mp, materialRows) {
  const sf = n(row.sf)
  const v = row.vendor
  const price = k => finishMatPriceV(k, v, materialRows, mp)
  const lab = k => n(mp?.[FINISHES_RATES[k].db])
  let mat = 0,
    hrs = 0,
    subUnit = 0,
    tons = 0
  switch (row.type) {
    case 'Sand Stucco':
      hrs = sf > 0 ? (sf / lab('sandStuccoLab')) * 8 : 0
      mat = sf * price('sandStucco')
      subUnit = price('sandStucco')
      break
    case 'Smooth Stucco':
      hrs = sf > 0 ? (sf / lab('smoothStuccoLab')) * 8 : 0
      mat = sf * price('smoothStucco')
      subUnit = price('smoothStucco')
      break
    case 'Ledgerstone':
      hrs = sf > 0 ? (sf / lab('ledgerstoneLab')) * 8 : 0
      mat = sf > 0 ? sf * price('ledgerstone') * 1.1 + sf * lab('stoneScrews') : 0
      subUnit = price('ledgerstone') * 1.1 + lab('stoneScrews') // screws $/SF
      break
    case 'Stacked Stone':
      hrs = sf > 0 ? (sf / lab('stackedStoneLab')) * 8 : 0
      mat = sf > 0 ? sf * price('stackedStone') * 1.1 + sf * lab('stoneScrews') : 0
      subUnit = price('stackedStone') * 1.1 + lab('stoneScrews')
      break
    case 'Tile':
      hrs = sf > 0 ? sf * lab('tileLab') : 0
      mat = sf > 0 ? sf * price('tile') + sf * lab('tileAdhesive') : 0 // adhesive/grout $ per Sq Ft
      subUnit = price('tile') + lab('tileAdhesive')
      break
    case 'Real Flagstone': {
      const rate = n(row.rateIn) || price('realFlagstone')
      hrs = sf > 0 ? sf * lab('flagstoneLab') : 0
      mat = sf > 0 ? (sf / 80) * rate : 0
      subUnit = rate / 80
      tons = sf / 80
      break
    }
    case 'Real Stone': {
      const rate = n(row.rateIn) || price('realStone')
      hrs = sf > 0 ? sf * lab('realStoneLab') : 0
      mat = sf > 0 ? (sf / 70) * rate : 0
      subUnit = rate / 70
      tons = sf / 70
      break
    }
    default:
      break
  }
  const subEach = row.subEach !== '' && row.subEach != null ? n(row.subEach) : subUnit
  return { mat, hrs, subUnit, subEach, subMat: sf * subEach, tons, unit: 'SF' }
}

// ── Calculation engine ────────────────────────────────────────────────────────
// In-House: coverage/geometry material + labor hours (all preserved exactly).
// Sub: flat $/unit per row, NO labor hours, routed into subCost.
function calcFinishes(
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

  const flat = (flatworkRows || []).map(row => computeFlatRow(row, mp, materialRows))
  const caps = (capRows || []).map(row => computeCapRow(row, mp, materialRows))
  const walls = (wallFinishRows || []).map(row => computeWallRow(row, mp, materialRows))
  const sum = (arr, k) => arr.reduce((a, x) => a + (x[k] || 0), 0)

  // ── Manual ──────────────────────────────────────────────────────────────
  let manHrs = 0,
    manMat = 0,
    manSub = 0
  ;(manualRows || []).forEach(r => {
    manHrs += n(r.hours)
    manMat += n(r.materials)
    manSub += n(r.subCost)
  })

  // ── In-House totals ───────────────────────────────────────────────────────
  const baseHrs = sum(flat, 'hrs') + sum(caps, 'hrs') + sum(walls, 'hrs') + manHrs
  const diffMod = 1 + n(difficulty) / 100
  const _preWalkHrs = baseHrs * diffMod + n(hoursAdj)
  const walkHrs = calcWalkAccessLabor(_preWalkHrs, state.distanceLF, { paceLfPerMin: _pace })
  const totalHrsIH = _preWalkHrs + walkHrs

  const totalMatIH = sum(flat, 'mat') + sum(caps, 'mat') + sum(walls, 'mat') + manMat
  const totalSubMat = sum(flat, 'subMat') + sum(caps, 'subMat') + sum(walls, 'subMat')

  const subMarkup = n(state.subGpMarkupRate)
  let gp,
    subCost,
    subGp,
    commission,
    price,
    totalHrs,
    manDays,
    totalMat,
    laborCost,
    burden
  if (isSubTab) {
    // Sub tab: flat per-unit pricing, NO labor hours. The itemized flat cost IS
    // the subcontractor cost; profit is the markup (Sub GP).
    totalHrs = 0
    manDays = 0
    laborCost = 0
    burden = 0
    // In-house materials are 0 on the Sub tab — sub materials live in subCost
    // (shown under "Subs"), so they don't double-appear or pull tax in-house.
    totalMat = 0
    gp = 0
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

  return {
    walkHrs,
    totalHrs,
    manDays,
    totalMat,
    laborCost,
    burden,
    gp,
    subGp,
    commission,
    subCost,
    price,
    flat,
    caps,
    walls,
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
const blankFlatRow = () => ({ vendor: 'Standard', type: '', sf: '', rateIn: '', subEach: '' })
const blankCapRow = () => ({ vendor: 'Standard', type: '', widthIn: '', lf: '', qty: '', subEach: '' })
const blankWallRow = () => ({ vendor: 'Standard', type: '', sf: '', rateIn: '', subEach: '' })

const DEFAULT_FLAT_ROWS = () => [blankFlatRow(), blankFlatRow()]
const DEFAULT_CAP_ROWS = () => [blankCapRow(), blankCapRow()]
const DEFAULT_WALL_ROWS = () => [blankWallRow(), blankWallRow()]

const DEFAULT_MANUAL_ROWS = [{ label: '', hours: '', materials: '', subCost: '' }]

// Per-tab input record. In-House and Sub each hold their own independent copy so
// the two tabs are separate calculators. Legacy flat saves (no *Rows arrays)
// fall back to fresh defaults so nothing crashes.
function makeTab(src = {}) {
  return {
    difficulty: src.difficulty ?? '',
    hoursAdj: src.hoursAdj ?? '',
    distanceLF: src.distanceLF ?? '',
    flatworkRows: src.flatworkRows ? src.flatworkRows.map(r => ({ ...r })) : DEFAULT_FLAT_ROWS(),
    capRows: src.capRows ? src.capRows.map(r => ({ ...r })) : DEFAULT_CAP_ROWS(),
    wallFinishRows: src.wallFinishRows
      ? src.wallFinishRows.map(r => ({ ...r }))
      : DEFAULT_WALL_ROWS(),
    manualRows: src.manualRows ? src.manualRows.map(r => ({ ...r })) : DEFAULT_MANUAL_ROWS.map(r => ({ ...r })),
  }
}

// ── Main component ────────────────────────────────────────────────────────────
export default function FinishesModule({ onSave, onBack, saving, initialData }) {
  const [laborRatePerHour, setLaborRatePerHour] = useState(
    initialData?.laborRatePerHour ?? null
  )
  const [laborBurdenPct, setLaborBurdenPct] = useState(
    initialData?.laborBurdenPct ?? null
  )
  const [gpmd, setGpmd] = useState(initialData?.gpmd ?? null)
  const [subGpMarkupRate, setSubGpMarkupRate] = useState(initialData?.subGpMarkupRate ?? null)
  const [commissionRate, setCommissionRate] = useState(initialData?.commissionRate ?? null)

  // Free-text notes for this module — Sam writes auto-generated
  // takeoffs here via create_estimate_from_takeoff, and the user can
  // overwrite / append their own.
  const [notes, setNotes] = useState(initialData?.notes ?? '')
  const [walkAccess, setWalkAccess] = useState(
    initialData?.walkAccess ?? {
      paceLfPerMin: null,
    }
  )

  // Shared material catalog — Finishes material + labor rates, rows, vendors,
  // and the canonical resolver. (Replaces the old per-module fetch + copy.)
  const {
    priceMap: materialPrices,
    materialRows,
    vendors,
    vendorNames,
    loading: pricesLoading,
    refresh: refreshAllRates,
    vendorOptionsForCategory,
  } = useMaterialCatalog(FINISHES_CATEGORY, {
    materialPrices: initialData?.materialPrices,
    materialRows: initialData?.materialRows,
  })

  useEffect(() => {
    if (!initialData?.laborRatePerHour) {
      supabase
        .from('company_settings')
        .select(
          'labor_rate_per_hour, labor_burden_pct, walk_access_pace_lf_per_min, estimate_gpmd_default, sub_gp_markup_rate, commission_rate'
        )
        .single()
        .then(({ data }) => {
          if (!data) return
          if (data.labor_rate_per_hour != null)
            setLaborRatePerHour(parseFloat(data.labor_rate_per_hour))
          if (data.labor_burden_pct != null) setLaborBurdenPct(parseFloat(data.labor_burden_pct))
          if (data.estimate_gpmd_default != null) setGpmd(parseFloat(data.estimate_gpmd_default))
          if (data.sub_gp_markup_rate != null)
            setSubGpMarkupRate(parseFloat(data.sub_gp_markup_rate))
          if (data.commission_rate != null) setCommissionRate(parseFloat(data.commission_rate))
          if (data.walk_access_pace_lf_per_min != null) {
            const _wpace = parseFloat(data.walk_access_pace_lf_per_min)
            setWalkAccess({
              paceLfPerMin: Number.isFinite(_wpace) && _wpace > 0 ? _wpace : null,
            })
          }
        })
    }
  }, [initialData?.laborRatePerHour])

  // ── State ──────────────────────────────────────────────────────────────
  const [crewType, setCrewType] = useState(initialData?.crewType ?? 'Masonry')
  const [subType, setSubType] = useState(initialData?.subType ?? 'In-House')
  // Independent In-House vs Sub input records — each tab is its own calculator.
  const [ihTab, setIhTab] = useState(() => makeTab(initialData?.ihData || initialData))
  const [subTab, setSubTab] = useState(() => makeTab(initialData?.subData || {}))
  const isSub = subType === 'Subcontractor'
  const cur = isSub ? subTab : ihTab
  const setCur = isSub ? setSubTab : setIhTab
  const setField = k => v =>
    setCur(prev => ({ ...prev, [k]: typeof v === 'function' ? v(prev[k]) : v }))

  // Derived active-tab accessors.
  const difficulty = cur.difficulty
  const setDifficulty = setField('difficulty')
  const hoursAdj = cur.hoursAdj
  const setHoursAdj = setField('hoursAdj')
  const distanceLF = cur.distanceLF
  const setDistanceLF = setField('distanceLF')
  const flatworkRows = cur.flatworkRows
  const setFlatworkRows = setField('flatworkRows')
  const capRows = cur.capRows
  const setCapRows = setField('capRows')
  const wallFinishRows = cur.wallFinishRows
  const setWallFinishRows = setField('wallFinishRows')
  const manualRows = cur.manualRows
  const setManualRows = setField('manualRows')

  // ── Sales tax — applied to totalMat across every module so the bid
  //    reflects supplier-invoiced material cost. ────────────────────────────
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
  const state = { crewType, subType, subGpMarkupRate, commissionRate, ...cur }
  const calcRaw = calcFinishes(
    state,
    laborRatePerHour,
    materialPrices,
    gpmd,
    walkAccess,
    laborBurdenPct,
    materialRows
  )
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

  const p = db => materialPrices[db] ?? undefined
  const finishMat = (matKey, vendor) =>
    finishMatPriceV(matKey, vendor, materialRows, materialPrices)

  // ── Vendor / row helpers ──────────────────────────────────────────────────
  const vendorOptions = vendorOptionsForCategory(FINISHES_CATEGORY)

  function updateManual(i, field, val) {
    setManualRows(rows => rows.map((r, idx) => (idx === i ? { ...r, [field]: val } : r)))
  }

  // patch one row; when recompute, refresh the Sub flat default off the new inputs.
  function patchRow(setRows, i, patch, compute, recompute) {
    setRows(rows =>
      rows.map((r, idx) => {
        if (idx !== i) return r
        const next = { ...r, ...patch }
        if (recompute && isSub) next.subEach = String(r2(compute(next, materialPrices, materialRows).subUnit))
        return next
      })
    )
  }
  const addRow = (setRows, blank) => setRows(rows => [...rows, blank()])
  const removeRow = (setRows, i) =>
    setRows(rows => (rows.length > 1 ? rows.filter((_, idx) => idx !== i) : rows))

  function handleSave() {
    onSave({
      notes,
      man_days: parseFloat(calc.manDays.toFixed(2)),
      // In-house materials only; on the Sub tab the materials live in subCost,
      // so keep this 0 to avoid double-counting them as In-House Materials.
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
        materialPrices,
        materialRows,
        vendorNames,
        calc,
      },
    })
  }

  const fmt2 = v =>
    `$${n(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  // ── Rate cell (material price + edit popovers + optional $/ton override) ────
  function rateCell(row, meta, setRows, i, compute) {
    if (!meta || !meta.matKey) return <span className="text-xs text-gray-300">—</span>
    return (
      <div className="flex items-center justify-center gap-1 flex-wrap">
        {meta.override ? (
          <div className="relative w-24">
            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">$</span>
            <input
              type="number"
              step="any"
              className="input text-sm py-1.5 pl-5 w-full"
              placeholder={finishMat(meta.matKey, row.vendor).toString()}
              value={row.rateIn ?? ''}
              onChange={e => patchRow(setRows, i, { rateIn: e.target.value }, compute, true)}
            />
          </div>
        ) : (
          <span className="text-xs text-gray-400">
            ${finishMat(meta.matKey, row.vendor).toFixed(2)}/{meta.matUnit}
          </span>
        )}
      </div>
    )
  }

  // ── SF-based section renderer (Flatwork + Wall Finishes) ───────────────────
  function renderSfSection(title, rows, setRows, TYPES, META, compute, blank, subcat, itemByType, placeholder = 'Select material') {
    return (
      <div>
        <SectionHeader title={title} />
        <div className="overflow-x-auto">
          <table className="w-full text-sm table-fixed">
            <colgroup>
              <col className="w-1/3" />
              <col className="w-1/3" />
              <col className="w-1/3" />
            </colgroup>
            <thead>
              <tr className="text-xs text-gray-500 border-b border-gray-200">
                <th className="text-center pb-1 pr-2 font-medium">Vendor</th>
                <th className="text-center pb-1 pr-2 font-medium">Item</th>
                <th className="text-center pb-1 pr-2 font-medium">Sq Ft</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => {
                const c = compute(row, materialPrices, materialRows)
                const meta = META[row.type] || {}
                // Vendor-first Type list (mirrors ArtificialTurf baseMatOptions):
                // Standard → the built-in TYPES; a real vendor → only its catalog
                // Items intersected with this picker's set. Keep the stored type
                // visible even if the vendor doesn't carry it (round-trips row.type).
                const typeOpts = finishTypeOptions(materialRows, subcat, TYPES, itemByType, row.vendor)
                if (row.type && !typeOpts.some(o => o.value === row.type))
                  typeOpts.unshift({ value: row.type, label: row.type })
                return (
                  <tr key={i} className="border-b border-gray-100">
                    <td className="py-1.5 pr-2">
                      <select
                        className="input text-sm py-1 w-full"
                        value={row.vendor || 'Standard'}
                        onChange={e =>
                          patchRow(setRows, i, { vendor: e.target.value }, compute, true)
                        }
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
                        value={row.type || ''}
                        onChange={e =>
                          patchRow(setRows, i, { type: e.target.value }, compute, true)
                        }
                      >
                        {!row.type && <option value="">{placeholder}</option>}
                        {typeOpts.map(o => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-1.5">
                      <div className="flex items-center gap-1">
                        <NumInput
                          value={row.sf}
                          onChange={v => patchRow(setRows, i, { sf: v }, compute, false)}
                          className="w-full text-center"
                        />
                        {rows.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeRow(setRows, i)}
                            className="text-gray-300 hover:text-red-500 text-xs px-1"
                            title="Remove row"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <button
            type="button"
            onClick={() => addRow(setRows, blank)}
            className="mt-2 text-xs text-green-700 hover:text-green-900 font-medium"
          >
            + Add row
          </button>
        </div>
      </div>
    )
  }

  // ── Wall Caps section renderer ─────────────────────────────────────────────
  function renderCapSection() {
    return (
      <div>
        <SectionHeader title="Wall Caps" />
        <div className="overflow-x-auto">
          <table className="w-full text-sm table-fixed">
            <colgroup>
              <col className="w-1/4" />
              <col className="w-1/4" />
              <col className="w-1/4" />
              <col className="w-1/4" />
            </colgroup>
            <thead>
              <tr className="text-xs text-gray-500 border-b border-gray-200">
                <th className="text-center pb-1 pr-2 font-medium">Vendor</th>
                <th className="text-center pb-1 pr-2 font-medium">Item</th>
                <th className="text-center pb-1 pr-2 font-medium">Width (in)</th>
                <th className="text-center pb-1 pr-2 font-medium">LF / Qty</th>
              </tr>
            </thead>
            <tbody>
              {capRows.map((row, i) => {
                const c = computeCapRow(row, materialPrices, materialRows)
                const meta = CAP_META[row.type] || {}
                const isActive = !!row.type && row.type !== 'None'
                // Vendor-first Type list. Standard → CAP_TYPES; a real vendor → its
                // 'Cap' catalog Items (Flagstone/Precast/Bullnose Brick) intersected
                // with CAP_TYPES, PLUS the always-available built-ins None + PIP
                // Concrete (no catalog Item). Stored type stays visible.
                const typeOpts = finishTypeOptions(
                  materialRows,
                  FINISH_SUBCAT.cap,
                  CAP_TYPES,
                  CAP_ITEM_BY_TYPE,
                  row.vendor,
                  ['None', 'PIP Concrete']
                )
                if (row.type && !typeOpts.some(o => o.value === row.type))
                  typeOpts.unshift({ value: row.type, label: row.type })
                return (
                  <tr key={i} className="border-b border-gray-100">
                    <td className="py-1.5 pr-2">
                      <select
                        className="input text-sm py-1 w-full"
                        value={row.vendor || 'Standard'}
                        onChange={e =>
                          patchRow(setCapRows, i, { vendor: e.target.value }, computeCapRow, true)
                        }
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
                        value={row.type || ''}
                        onChange={e =>
                          patchRow(setCapRows, i, { type: e.target.value }, computeCapRow, true)
                        }
                      >
                        {!row.type && <option value="">Select cap</option>}
                        {typeOpts.map(o => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-1.5 pr-2">
                      {row.type !== 'Precast' && (
                        <NumInput
                          value={row.widthIn}
                          onChange={v => patchRow(setCapRows, i, { widthIn: v }, computeCapRow, true)}
                          className="w-full text-center"
                          placeholder="4"
                        />
                      )}
                    </td>
                    <td className="py-1.5">
                      <div className="flex items-center gap-1">
                        <NumInput
                          value={row.type === 'Precast' ? row.qty : row.lf}
                          onChange={v =>
                            patchRow(
                              setCapRows,
                              i,
                              row.type === 'Precast' ? { qty: v } : { lf: v },
                              computeCapRow,
                              false
                            )
                          }
                          className="w-full text-center"
                          placeholder="0"
                        />
                        {capRows.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeRow(setCapRows, i)}
                            className="text-gray-300 hover:text-red-500 text-xs px-1"
                            title="Remove row"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <button
            type="button"
            onClick={() => addRow(setCapRows, blankCapRow)}
            className="mt-2 text-xs text-green-700 hover:text-green-900 font-medium"
          >
            + Add row
          </button>
        </div>
      </div>
    )
  }

  // ── Grouped rate list for the "View Rates" popup (CrewTypeBar). Every labor
  //    coefficient that used to have an inline RateEditPopover in this module now
  //    lives here (material prices are edited in Master Material Rates).
  const _rv = k => n(p(FINISHES_RATES[k].db))
  const _laborItem = (k, unitLabel) => ({
    label: FINISHES_RATES[k].db,
    table: 'labor_rates',
    name: FINISHES_RATES[k].db,
    category: FINISHES_CATEGORY,
    mode: 'coefficient',
    unitLabel,
    value: _rv(k),
  })
  // Material rows for a FINISHES_RATES key (matched by NAME, same as the
  // estimator's finishMatPrice resolver). One row per vendor (Standard first),
  // each editable straight to material_price — mirrors Walls / Utilities. When no
  // catalog product carries the name yet, a single name-keyed Standard row is
  // shown (still material_price, so material_rates stays out of it).
  const _matRows = (k, unit) => {
    const dbName = FINISHES_RATES[k].db
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
          category: FINISHES_CATEGORY,
          unitLabel: r0.unit || unit,
          mode: 'currency',
          value: n(r0.unit_cost),
        }))
    }
    return [
      {
        label: `Standard — ${dbName}`,
        table: 'material_price',
        name: dbName,
        category: FINISHES_CATEGORY,
        unitLabel: unit,
        mode: 'currency',
        value: n(materialPrices[dbName]),
      },
    ]
  }
  const finishesRateList = [
    {
      group: 'Flatwork Finish',
      items: [
        _laborItem('flatTileLab', 'hrs/SF'),
        _laborItem('flatBrickLab', 'hrs/SF'),
        _laborItem('flatFlagstoneLab', 'hrs/SF'),
        _laborItem('flatPorcelainLab', 'hrs/SF'),
        ..._matRows('flatTile', 'SF'),
        ..._matRows('flatBrick', 'brick'),
        ..._matRows('flatFlagstone', 'ton'),
        ..._matRows('flatPorcelain', 'SF'),
      ],
    },
    {
      group: 'Wall Caps',
      items: [
        _laborItem('capFlagstoneLab', 'hrs/LF'),
        _laborItem('capPrecastLab', 'hrs/ea'),
        _laborItem('capPipLab', 'hrs/LF'),
        _laborItem('capBullnoseLab', 'hrs/LF'),
        ..._matRows('capFlagstone', 'ton'),
        ..._matRows('capPrecast', 'ea'),
        ..._matRows('concreteTruck', 'CY'),
        ..._matRows('capBullnose', 'LF'),
      ],
    },
    {
      group: 'Wall Finishes',
      items: [
        _laborItem('sandStuccoLab', 'SF/day'),
        _laborItem('smoothStuccoLab', 'SF/day'),
        _laborItem('ledgerstoneLab', 'SF/day'),
        _laborItem('stackedStoneLab', 'SF/day'),
        _laborItem('tileLab', 'hrs/SF'),
        _laborItem('flagstoneLab', 'hrs/SF'),
        _laborItem('realStoneLab', 'hrs/SF'),
        ..._matRows('sandStucco', 'SF'),
        ..._matRows('smoothStucco', 'SF'),
        ..._matRows('ledgerstone', 'SF'),
        ..._matRows('stackedStone', 'SF'),
        ..._matRows('tile', 'SF'),
        ..._matRows('realFlagstone', 'ton'),
        ..._matRows('realStone', 'ton'),
        // Consumables folded into wall-finish material cost (per-SF).
        ..._matRows('stoneScrews', 'SF'),
        ..._matRows('tileAdhesive', 'SF'),
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
            title="Finishes"
            moduleType="Finishes"
            rates={finishesRateList}
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
          Loading material prices from Master Rates…
        </div>
      )}

      {/* Settings — Job Site Conditions is In-House only (hidden on Sub tab) */}
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

      {/* ── Flatwork Finish ── */}
      {renderSfSection(
        'Flatwork Finish',
        flatworkRows,
        setFlatworkRows,
        FLAT_TYPES,
        FLAT_META,
        computeFlatRow,
        blankFlatRow,
        FINISH_SUBCAT.flat,
        FLAT_ITEM_BY_TYPE,
        'Select material'
      )}

      {/* ── Wall Caps ── */}
      {renderCapSection()}

      {/* ── Wall Finishes ── */}
      {renderSfSection(
        'Wall Finishes',
        wallFinishRows,
        setWallFinishRows,
        WALL_FINISH_TYPES,
        WALL_META,
        computeWallRow,
        blankWallRow,
        FINISH_SUBCAT.wall,
        WALL_ITEM_BY_TYPE,
        'Select finish'
      )}

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
            onClick={() => setManualRows(rows => [...rows, { label: '', hours: '', materials: '', subCost: '' }])}
            className="mt-2 text-xs text-green-700 hover:text-green-900 font-medium"
          >
            + Add manual entry
          </button>
        </div>
      </div>

      {/* Actions */}
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
