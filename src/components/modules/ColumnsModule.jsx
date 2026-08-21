import WorkTypeChooser from './WorkTypeChooser'
import CrewTypeBar from './CrewTypeBar'
import { computeColumnFinishRow } from './columnsCalc'
import ModuleHeaderSlot from './ModuleHeaderSlot'
import { useState, useEffect, useContext } from 'react'
import { SubTabContext, subSectionTitle } from './subTabContext'
import { supabase } from '../../lib/supabase'
import GpmdBar from './GpmdBar'
import { fetchSalesTaxRate } from '../../lib/companyDefaults'
import { calcWalkAccessLabor } from '../../lib/walkAccess'
import { useMaterialCatalog, resolveMaterialPrice, catalogOptions } from '../../lib/materialCatalog'
import { groutCyPerBlock } from '../../lib/cmuGrout'

// ─────────────────────────────────────────────────────────────────────────────
// Columns Module — 4 column TYPES (CMU / Poured In Place / Modular / Brick),
// mirroring WallsModule. Each type has its OWN array of column rows (Add Column),
// its own vendor-first Type picker, and its own material-quantity math adapted to
// a vertical column footprint. In-House / Sub tabs stay independent (SubTabContext).
// ─────────────────────────────────────────────────────────────────────────────

// dbName = name in the catalog (Standard) / labor_rates. Hardcoded values are
// LABOR fallbacks (allowed) or catalog-material fallbacks Brian OK'd (CMU block,
// grout concrete, rebar). New material lines (modular block, brick, mix, forms,
// mortar) resolve ONLY from the catalog — no hardcoded $ fallback.
// SHARED finish source — material dbName AND laborDbName both point at the Finishes
// module's own records (material '<Type> - Finishes' under category 'Finishes' /
// sub 'Finish Material'; labor '<Type> - Finishes Labor Rate'). One product + one
// price + one labor rate drives Finishes, Fire Pit, Walls, Outdoor Kitchen, Columns.
// Set it in Master Rates → flows everywhere. Sub (subDbName) stays Columns-specific.
const FINISH_TYPES = {
  'Sand Stucco': {
    unit: 'SF',
    dbName: 'Sand Stucco - Finishes',
    laborDbName: 'Sand Stucco - Finishes Labor Rate',
    subDbName: 'Sand Stucco - Sub SF',
  },
  'Smooth Stucco': {
    unit: 'SF',
    dbName: 'Smooth Stucco - Finishes',
    laborDbName: 'Smooth Stucco - Finishes Labor Rate',
    subDbName: 'Smooth Stucco - Sub SF',
  },
  'Ledgerstone Veneer Panels': {
    unit: 'SF',
    dbName: 'Ledgerstone - Finishes',
    laborDbName: 'Ledgerstone - Finishes Labor Rate',
    subDbName: 'Ledgerstone Veneer Panels - Sub SF',
  },
  'Stacked Stone Veneer': {
    unit: 'SF',
    dbName: 'Stacked Stone - Finishes',
    laborDbName: 'Stacked Stone - Finishes Labor Rate',
    subDbName: 'Stacked Stone Veneer - Sub SF',
  },
  Tile: {
    unit: 'SF',
    dbName: 'Tile - Finishes',
    laborDbName: 'Tile - Finishes Labor Rate',
    subDbName: 'Tile - Columns - Sub SF',
  },
  'Real Flagstone, Flat': {
    unit: 'SF',
    dbName: 'Real Flagstone - Finishes',
    laborDbName: 'Real Flagstone - Finishes Labor Rate',
    subDbName: 'Real Flagstone Flat - Sub SF',
  },
  'Real Stone': {
    unit: 'SF',
    dbName: 'Real Stone - Finishes',
    laborDbName: 'Real Stone - Finishes Labor Rate',
    subDbName: 'Real Stone - Columns - Sub SF',
  },
}

const BLOCK_RATES = {
  blockMatCost: { dbName: 'CMU Block' }, // $/block (CMU fallback when no block picked)
  rebarMatCost: { dbName: 'Rebar' }, // $/LF (Basic Materials)
  faceBlockMat: { dbName: 'Face Block' },
  // Labor rates (fallbacks OK)
  installLaborHrs: { dbName: 'CMU Install Labor' }, // hrs per block
  excavateLaborHrs: { dbName: 'Excavate Footing Labor' }, // hrs per column
  pourLaborHrs: { dbName: 'Pour Footing Labor' }, // hrs per column
  fillLaborHrs: { dbName: 'Fill Labor' }, // hrs per block
}

// New per-type LABOR coefficients (fallbacks OK). Brick laying mirrors Walls'
// brickLayLab (1.75 hr/SF); PIP form + pour mirror ConcreteModule-style rates.
// Brick lay + PIP form are SHARED with the Walls module (same operation, one
// rate each). Pour stays Columns-specific. (Columns already loads WALLS_CATEGORY.)
const BRICK_LAY = { dbName: 'Wall Brick Lay Labor' } // hrs / SF of brick face (shared w/ Walls)
const PIP_FORM_LAB = { dbName: 'Wall PIP Install Labor' } // hrs / SF of form (shared w/ Walls PIP)
const PIP_POUR_LAB = { dbName: 'Column Pour Labor' } // hrs / CY poured

// Catalog NAMES for optional (catalog-only) materials — $0 until seeded so no
// hardcoded material price ever beats the catalog.
const MORTAR_NAME = 'Mortar'
const FORM_LUMBER_NAME = 'Column Form Lumber'

// User-selectable rebar size (canonical Basic Materials rows 'Rebar #3'…'Rebar #8').
const REBAR_SIZES = ['#3', '#4', '#5', '#6', '#8']

// Column-type sub-tabs (mirror WallsModule wallType). NO Timber for Columns.
const COL_TYPE_TABS = [
  { key: 'CMU', label: 'CMU Block' },
  { key: 'PIP', label: 'Poured In Place' },
  { key: 'Modular', label: 'Modular' },
  { key: 'Brick', label: 'Brick' },
]

// Per-type Type-picker catalog sub-categories (vendor-first, id-linked — same
// products the matching Walls / Concrete tabs use). Loaded into the module's
// catalog via the extra categories on useMaterialCatalog below.
//  - CMU columns share the Walls 'Wall Block' dimensioned block products.
//  - Modular / Brick share the exact Walls Modular / Brick sub-categories.
//  - PIP pours a 'Concrete Mix' product (Concrete Install), priced per CY.
const CMU_BLOCK_SUBCAT = 'Wall Block'
const MODULAR_SUBCAT = 'Modular Wall'
const BRICK_SUBCAT = 'Brick'
const CONC_MIX_SUBCAT = 'Concrete Mix'
// Which row field stores the Type selection per column type.
const TYPE_FIELD = { CMU: 'blockType', Modular: 'blockType', Brick: 'brickType', PIP: 'mixType' }
const TYPE_LABEL = { CMU: 'Block Type', Modular: 'Block Type', Brick: 'Brick Type', PIP: 'Concrete Mix' }

const DEFAULTS = {
  laborRatePerHour: 35,
  laborBurdenPct: 0.29,
  gpmd: 425,
}

const n = v => parseFloat(v) || 0

const COLUMNS_CATEGORY = 'Columns'
const BASIC_CATEGORY = 'Basic Materials'
// Extra categories loaded so the Modular / Brick / CMU-block / Concrete-mix
// pickers resolve their products (they live under Walls / Concrete).
const WALLS_CATEGORY = 'Walls'
const CONCRETE_CATEGORY = 'Concrete'
// Grout fill priced at the concrete ready-mix rate (shared Basic Materials).
const GROUT_CONCRETE = { dbName: 'Concrete - Ready Mix (Truck)' } // $/CY

const colMatPrice = resolveMaterialPrice

// Catalog sub-category the Column Finishes live under (Category 'Columns').
const COLUMN_FINISH_SUBCAT = 'Column Finish'
function columnFinishOptions(materialRows, vendorSel = 'Standard') {
  const isStd = !vendorSel || vendorSel === 'Standard' || vendorSel === 'auto'
  // SHARED source: read the Finishes module's own records (category 'Finishes',
  // sub 'Finish Material', named '<Type> - Finishes'), not a Columns-specific list.
  const catRows = catalogOptions(materialRows, 'Finish Material', isStd ? 'Standard' : vendorSel, {
    standardRows: 'null-vendor',
    stripPrefix: true,
    category: 'Finishes',
  })
  if (!catRows.length) return []
  return catRows
    .map(o => {
      const typeKey = Object.keys(FINISH_TYPES).find(
        k => FINISH_TYPES[k].dbName === o.row.name || k === o.label
      )
      return {
        value: typeKey || o.row.name,
        label: o.label,
        typeKey,
        dbName: o.row.name,
        fromMaster: !typeKey,
      }
    })
    // The shared 'Finish Material' sub also holds flatwork/cap records; Columns only
    // offers the 7 wall finishes, so keep only rows that map to a FINISH_TYPES key.
    .filter(o => o.typeKey)
}

// ── Column geometry ───────────────────────────────────────────────────────────
// Existing CMU geometry (8" module) — kept so a single CMU column with the same
// inputs prices out byte-for-byte as before.
function columnGeometry(heightIn, widthIn) {
  return columnGeometryDims(heightIn, widthIn, 8, 8)
}
// Generalized column geometry: courses/blocksWide from the block's dims. A column
// is a SOLID stack → blocksPerCourse = blocksWide². Defaults (8×8) === legacy CMU.
function columnGeometryDims(heightIn, widthIn, blockWIn = 8, blockHIn = 8) {
  const bw = n(blockWIn) || 8
  const bh = n(blockHIn) || 8
  const courses = Math.ceil(n(heightIn) / bh)
  const blocksWide = Math.ceil(n(widthIn) / bw)
  const blocksPerCourse = blocksWide * blocksWide
  const totalBlocks = courses * blocksPerCourse
  const rebarLF = (n(heightIn) / 12) * (blocksWide > 1 ? 4 : 1)
  const footingArea = Math.pow(n(widthIn) / 12 + 1, 2)
  return { courses, blocksWide, blocksPerCourse, totalBlocks, rebarLF, footingArea }
}

// Resolve a picked catalog product row by id (any vendor).
function catalogRowById(materialRows, id) {
  return (materialRows || []).find(r => r.id === id) || null
}
// Block dims from a catalog row's calc_meta (fallback to legacy cols / default).
function blockDims(row, def = { w: 8, h: 8, l: 16 }) {
  const cm = row && row.calc_meta ? row.calc_meta : {}
  return {
    w: n(cm.block_w_in) || n(row && row.block_w_in) || def.w,
    h: n(cm.block_h_in) || n(row && row.block_h_in) || def.h,
    l: n(cm.block_l_in) || n(row && row.block_l_in) || def.l,
  }
}
function rebarNameFor(size) {
  return 'Rebar ' + (size || '#4')
}
// Vendor options (Standard + vendors carrying a product) for a sub-category.
function subcatVendorOptions(materialRows, subcat, vendorNames = {}) {
  const rows = (materialRows || []).filter(r => r.sub_category === subcat)
  const ids = [...new Set(rows.filter(r => r.vendor_id).map(r => r.vendor_id))]
  const out = ids
    .map(id => ({ value: id, label: vendorNames[id] || 'Vendor' }))
    .sort((a, b) => a.label.localeCompare(b.label))
  out.unshift({ value: 'Standard', label: 'Standard' })
  return out
}
// Product options for a sub-category filtered by the chosen vendor (vendor-first).
function subcatProductOptions(materialRows, subcat, vendorSel) {
  const isStd = !vendorSel || vendorSel === 'Standard'
  return (materialRows || [])
    .filter(r => r.sub_category === subcat && (isStd ? r.vendor_id == null : r.vendor_id === vendorSel))
    .map(r => ({ value: r.id, label: r.name, row: r }))
}
function labelWithDims(row) {
  const d = blockDims(row, { w: 0, h: 0, l: 0 })
  return d.w ? `${row.name} — ${d.w}×${d.h}×${d.l}` : row.name
}

// ── Per-column-row calculators (pure; shared shape used by module + summary) ──
function pxHelpers(materialPrices, materialRows) {
  const mp = db => n(materialPrices[db])
  const matP = (db, _fb, v) => colMatPrice(db, v, materialRows, materialPrices)
  return { mp, matP }
}
const rowHasGeo = c => n(c.qty) > 0 && n(c.heightIn) > 0 && n(c.widthIn) > 0

// CMU column: blocks + grout fill + rebar (+ footing dig/pour labor). Block price
// = picked catalog row, else the 'CMU Block' rate (preserves legacy CMU $).
function calcCmuCol(c, materialPrices, materialRows) {
  const { mp, matP } = pxHelpers(materialPrices, materialRows)
  if (!rowHasGeo(c)) return { mat: 0, hrs: 0 }
  const picked = catalogRowById(materialRows, c.blockType)
  const dims = picked ? blockDims(picked) : { w: 8, h: 8, l: 16 }
  const geo = columnGeometryDims(c.heightIn, c.widthIn, dims.w, dims.h)
  const totalBlocks = geo.totalBlocks * n(c.qty)
  const totalRebar = geo.rebarLF * n(c.qty)
  const blockPrice = picked
    ? n(picked.unit_cost)
    : matP(BLOCK_RATES.blockMatCost.dbName, BLOCK_RATES.blockMatCost.fallback, c.vendor)
  const groutCY = totalBlocks * groutCyPerBlock(dims.w, dims.h)
  const mat =
    totalBlocks * blockPrice +
    groutCY * matP(GROUT_CONCRETE.dbName, GROUT_CONCRETE.fallback, c.vendor) +
    totalRebar * matP(rebarNameFor(c.rebarSize), BLOCK_RATES.rebarMatCost.fallback, c.vendor)
  const hrs =
    n(c.qty) * mp(BLOCK_RATES.excavateLaborHrs.dbName, BLOCK_RATES.excavateLaborHrs.fallback) +
    n(c.qty) * mp(BLOCK_RATES.pourLaborHrs.dbName, BLOCK_RATES.pourLaborHrs.fallback) +
    totalBlocks * mp(BLOCK_RATES.installLaborHrs.dbName, BLOCK_RATES.installLaborHrs.fallback) +
    totalBlocks * mp(BLOCK_RATES.fillLaborHrs.dbName, BLOCK_RATES.fillLaborHrs.fallback)
  return { mat, hrs, totalBlocks, groutCY, totalRebar, courses: geo.courses, blocksPerCourse: geo.blocksPerCourse }
}

// Modular column: block dims from the 'Modular Wall' row → solid stack × price.
// No grout / no fill labor (mirrors Walls modular). Catalog-only block $ ($0 if
// unpriced/unpicked).
function calcModularCol(c, materialPrices, materialRows) {
  const { mp, matP } = pxHelpers(materialPrices, materialRows)
  if (!rowHasGeo(c)) return { mat: 0, hrs: 0 }
  const picked = catalogRowById(materialRows, c.blockType)
  const dims = picked ? blockDims(picked) : { w: 8, h: 8, l: 16 }
  const geo = columnGeometryDims(c.heightIn, c.widthIn, dims.w, dims.h)
  const totalBlocks = geo.totalBlocks * n(c.qty)
  const totalRebar = geo.rebarLF * n(c.qty)
  const blockPrice = picked ? n(picked.unit_cost) : 0
  const mat =
    totalBlocks * blockPrice +
    totalRebar * matP(rebarNameFor(c.rebarSize), BLOCK_RATES.rebarMatCost.fallback, c.vendor)
  const hrs =
    n(c.qty) * mp(BLOCK_RATES.excavateLaborHrs.dbName, BLOCK_RATES.excavateLaborHrs.fallback) +
    n(c.qty) * mp(BLOCK_RATES.pourLaborHrs.dbName, BLOCK_RATES.pourLaborHrs.fallback) +
    totalBlocks * mp(BLOCK_RATES.installLaborHrs.dbName, BLOCK_RATES.installLaborHrs.fallback)
  return { mat, hrs, totalBlocks, totalRebar, courses: geo.courses, blocksPerCourse: geo.blocksPerCourse }
}

// Brick column: bricks = face sqft (4 sides × height) × bricks-per-sqft (calc_meta
// per_sqft, default 7 — includes mortar joint spacing, same as Walls brick). Brick
// $ + optional 'Mortar' catalog line + rebar. Laying labor = face sqft × BRICK_LAY.
function calcBrickCol(c, materialPrices, materialRows) {
  const { mp, matP } = pxHelpers(materialPrices, materialRows)
  if (!rowHasGeo(c)) return { mat: 0, hrs: 0 }
  const picked = catalogRowById(materialRows, c.brickType)
  const perSqft = n(picked && picked.calc_meta && picked.calc_meta.per_sqft) || 7
  const brickPrice = picked ? n(picked.unit_cost) : 0
  const faceSqft = 4 * (n(c.widthIn) / 12) * (n(c.heightIn) / 12) * n(c.qty)
  const bricks = faceSqft * perSqft
  const totalRebar = columnGeometryDims(c.heightIn, c.widthIn).rebarLF * n(c.qty)
  const mat =
    bricks * brickPrice +
    faceSqft * matP(MORTAR_NAME, 0, c.vendor) +
    totalRebar * matP(rebarNameFor(c.rebarSize), BLOCK_RATES.rebarMatCost.fallback, c.vendor)
  const hrs =
    n(c.qty) * mp(BLOCK_RATES.excavateLaborHrs.dbName, BLOCK_RATES.excavateLaborHrs.fallback) +
    n(c.qty) * mp(BLOCK_RATES.pourLaborHrs.dbName, BLOCK_RATES.pourLaborHrs.fallback) +
    faceSqft * mp(BRICK_LAY.dbName, BRICK_LAY.fallback)
  return { mat, hrs, bricks, faceSqft, totalRebar }
}

// PIP column: poured volume = footprint (w²) × height → CY × mix price. + forms
// (4 faces × form $/SF) + rebar (+ footing dig/pour labor). Mix $ = picked
// 'Concrete Mix' row, else the shared ready-mix concrete rate.
function calcPipCol(c, materialPrices, materialRows) {
  const { mp, matP } = pxHelpers(materialPrices, materialRows)
  if (!rowHasGeo(c)) return { mat: 0, hrs: 0 }
  const picked = catalogRowById(materialRows, c.mixType)
  const mixPrice = picked ? n(picked.unit_cost) : matP(GROUT_CONCRETE.dbName, GROUT_CONCRETE.fallback, c.vendor)
  const footprintSF = Math.pow(n(c.widthIn) / 12, 2)
  const pourCF = footprintSF * (n(c.heightIn) / 12)
  const totalCY = (pourCF / 27) * n(c.qty)
  const formSF = 4 * (n(c.widthIn) / 12) * (n(c.heightIn) / 12) * n(c.qty)
  const totalRebar = columnGeometryDims(c.heightIn, c.widthIn).rebarLF * n(c.qty)
  const mat =
    totalCY * mixPrice +
    formSF * matP(FORM_LUMBER_NAME, 0, c.vendor) +
    totalRebar * matP(rebarNameFor(c.rebarSize), BLOCK_RATES.rebarMatCost.fallback, c.vendor)
  const hrs =
    n(c.qty) * mp(BLOCK_RATES.excavateLaborHrs.dbName, BLOCK_RATES.excavateLaborHrs.fallback) +
    n(c.qty) * mp(BLOCK_RATES.pourLaborHrs.dbName, BLOCK_RATES.pourLaborHrs.fallback) +
    totalCY * mp(PIP_POUR_LAB.dbName, PIP_POUR_LAB.fallback) +
    formSF * mp(PIP_FORM_LAB.dbName, PIP_FORM_LAB.fallback)
  return { mat, hrs, totalCY, formSF, totalRebar }
}

// Exported so ColumnsSummary can reuse the SAME per-column math (single source of
// truth) instead of recomputing with a stale model.
export const ROW_CALC = { CMU: calcCmuCol, PIP: calcPipCol, Modular: calcModularCol, Brick: calcBrickCol }

// ── Main calc ─────────────────────────────────────────────────────────────────
function calcColumns(
  state,
  laborRatePerHour = DEFAULTS.laborRatePerHour,
  materialPrices = {},
  gpmd = DEFAULTS.gpmd,
  walkAccess = null,
  laborBurdenPct = DEFAULTS.laborBurdenPct,
  materialRows = []
) {
  const _pace = n(walkAccess && walkAccess.paceLfPerMin)
  const { difficulty, hoursAdj, cmuCols, pipCols, modularCols, brickCols, finishRows, manualRows } = state
  const isSub = state.subType === 'Subcontractor'
  const { mp, matP } = pxHelpers(materialPrices, materialRows)

  // ── Installation — ALL column types contribute simultaneously (mirrors
  //    WallsModule: switching the visible tab never drops the other types). ──
  let installHrs = 0,
    installMat = 0
  ;(cmuCols || []).forEach(c => {
    const r = calcCmuCol(c, materialPrices, materialRows)
    installMat += r.mat
    installHrs += r.hrs
  })
  ;(pipCols || []).forEach(c => {
    const r = calcPipCol(c, materialPrices, materialRows)
    installMat += r.mat
    installHrs += r.hrs
  })
  ;(modularCols || []).forEach(c => {
    const r = calcModularCol(c, materialPrices, materialRows)
    installMat += r.mat
    installHrs += r.hrs
  })
  ;(brickCols || []).forEach(c => {
    const r = calcBrickCol(c, materialPrices, materialRows)
    installMat += r.mat
    installHrs += r.hrs
  })

  // Finishes (PIP tab only in the UI, but tab-level so they always price).
  let finishHrs = 0,
    finishMat = 0
  ;(finishRows || []).forEach(r => {
    if (!r.type) return
    const opts = columnFinishOptions(materialRows, r.vendor)
    const opt =
      opts.find(
        o => o.value === r.type || o.typeKey === r.type || o.dbName === r.type || o.label === r.type
      ) || opts[0]
    const rate = FINISH_TYPES[(opt && opt.typeKey) || r.type] || FINISH_TYPES[r.type]
    if (!rate || !n(r.qty)) return
    const priceDbName = (opt && opt.dbName) || rate.dbName
    // Shared finish math lives in the pure, unit-tested columnsCalc.js. All finishes
    // are $/Sq Ft now (shared Finishes records), so there is no ton branch.
    const matUnit = matP(priceDbName, rate.costPerSF, r.vendor)
    const laborRate = mp(rate.laborDbName, rate.laborHrsPerSF)
    const subUnit = matP(rate.subDbName, rate.subFallback || 0, r.vendor)
    const fr = computeColumnFinishRow(r, { matUnit, laborRate, subUnit, isSub })
    finishMat += fr.mat
    finishHrs += fr.hrs
  })

  // Manual
  let manHrs = 0,
    manMat = 0,
    manSub = 0
  ;(manualRows || []).forEach(r => {
    manHrs += n(r.hours)
    manMat += n(r.materials)
    manSub += n(r.subCost)
  })

  const baseHrs = installHrs + finishHrs + manHrs
  const diffMod = 1 + n(difficulty) / 100
  const _preWalkHrs = baseHrs * diffMod + n(hoursAdj)
  const walkHrs = calcWalkAccessLabor(_preWalkHrs, state.distanceLF, { paceLfPerMin: _pace })
  const totalHrs = _preWalkHrs + walkHrs
  const manDays = totalHrs / 8
  const totalMat = installMat + finishMat + manMat
  const laborCost = totalHrs * laborRatePerHour
  const burden = laborCost * n(laborBurdenPct)

  let gp, subCost, subGp, commission, price
  if (isSub) {
    gp = 0
    subCost = totalMat + laborCost + burden + manSub
    subGp = subCost * n(state.subGpMarkupRate)
    commission = subGp * n(state.commissionRate)
    price = subCost + subGp + commission
  } else {
    gp = manDays * gpmd
    subGp = 0
    commission = gp * n(state.commissionRate)
    subCost = manSub
    price = totalMat + laborCost + burden + gp + commission + subCost
  }

  return {
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
    walkHrs,
    installHrs,
    installMat,
    finishHrs,
    finishMat,
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

// One column row (Vendor | Type | Qty | Height | Width | Rebar) + live cost hint.
function ColEntry({ type, row, idx, total, onChange, onRemove, vendorOptions, typeOptions, typeLabel, rowCalc }) {
  const set = f => v => onChange(idx, f, v)
  const tf = TYPE_FIELD[type]
  const sel = row[tf] || ''
  const hint = rowCalc && (rowCalc.mat > 0 || rowCalc.hrs > 0)
  return (
    <div className="border border-gray-200 rounded-xl p-3 mb-3 bg-white">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-black uppercase tracking-wide">Column {idx + 1}</span>
        {total > 1 && (
          <button
            onClick={() => onRemove(idx)}
            className="text-xs text-red-400 hover:text-red-600 px-2 py-0.5 rounded border border-red-100 hover:border-red-300 transition-colors"
          >
            Remove
          </button>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="col-span-2">
          <label className="block text-xs text-gray-500 mb-1">Vendor</label>
          <select
            className="input text-sm py-1.5 w-full"
            value={row.vendor || 'Standard'}
            onChange={e => set('vendor')(e.target.value)}
          >
            {vendorOptions.map(o => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div className="col-span-2">
          <label className="block text-xs text-gray-500 mb-1">{typeLabel}</label>
          <select
            className="input text-sm py-1.5 w-full"
            value={sel}
            onChange={e => set(tf)(e.target.value)}
          >
            <option value="">{typeOptions.length ? 'Select…' : 'No products — add in Master Rates'}</option>
            {sel && !typeOptions.some(o => o.value === sel) && <option value={sel}>{sel}</option>}
            {typeOptions.map(o => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Quantity</label>
          <NumInput value={row.qty} onChange={set('qty')} placeholder="0" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Height (in)</label>
          <NumInput value={row.heightIn} onChange={set('heightIn')} placeholder="0" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Width (in)</label>
          <NumInput value={row.widthIn} onChange={set('widthIn')} placeholder="0" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Rebar Size</label>
          <select
            className="input text-sm py-1.5 w-full"
            value={row.rebarSize || '#4'}
            onChange={e => set('rebarSize')(e.target.value)}
          >
            {REBAR_SIZES.map(s => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>
      {hint && (
        <div className="mt-2 text-[11px] text-gray-500 flex flex-wrap gap-x-4 gap-y-0.5">
          <span>
            Material: <strong>${rowCalc.mat.toFixed(2)}</strong>
          </span>
          <span>
            Labor: <strong>{rowCalc.hrs.toFixed(2)} hrs</strong>
          </span>
          {rowCalc.totalBlocks ? (
            <span>
              Blocks: <strong>{rowCalc.totalBlocks}</strong>
            </span>
          ) : null}
          {rowCalc.totalCY ? (
            <span>
              Concrete: <strong>{rowCalc.totalCY.toFixed(2)} Cu Yd</strong>
            </span>
          ) : null}
          {rowCalc.bricks ? (
            <span>
              Bricks: <strong>{Math.round(rowCalc.bricks)}</strong>
            </span>
          ) : null}
        </div>
      )}
    </div>
  )
}

// ── Defaults ──────────────────────────────────────────────────────────────────
const DEFAULT_FINISH_ROWS = [{ type: '', qty: '', vendor: 'Standard' }]
const DEFAULT_MANUAL_ROWS = [{ label: '', hours: '', materials: '', subCost: '' }]
const blankCmuCol = () => ({ vendor: 'Standard', blockType: '', qty: '', heightIn: '', widthIn: '', rebarSize: '#4' })
const blankPipCol = () => ({ vendor: 'Standard', mixType: '', qty: '', heightIn: '', widthIn: '', rebarSize: '#4' })
const blankModularCol = () => ({ vendor: 'Standard', blockType: '', qty: '', heightIn: '', widthIn: '', rebarSize: '#4' })
const blankBrickCol = () => ({ vendor: 'Standard', brickType: '', qty: '', heightIn: '', widthIn: '', rebarSize: '#4' })
const BLANK_FOR = { CMU: blankCmuCol, PIP: blankPipCol, Modular: blankModularCol, Brick: blankBrickCol }

// ── Main Component ────────────────────────────────────────────────────────────
export default function ColumnsModule({ onSave, onBack, saving, initialData }) {
  const [laborRatePerHour, setLaborRatePerHour] = useState(
    initialData?.laborRatePerHour ?? null
  )
  const [laborBurdenPct, setLaborBurdenPct] = useState(
    initialData?.laborBurdenPct ?? null
  )
  const [gpmd, setGpmd] = useState(initialData?.gpmd ?? null)
  const [subGpMarkupRate, setSubGpMarkupRate] = useState(initialData?.subGpMarkupRate ?? null)
  const [commissionRate, setCommissionRate] = useState(initialData?.commissionRate ?? null)

  const [notes, setNotes] = useState(initialData?.notes ?? '')
  const [walkAccess, setWalkAccess] = useState(
    initialData?.walkAccess ?? {
      paceLfPerMin: null,
    }
  )
  const {
    priceMap: materialPrices,
    materialRows,
    vendorNames,
    loading: pricesLoading,
    refresh: refreshAllRates,
    vendorOptionsForCategory,
  } = useMaterialCatalog([COLUMNS_CATEGORY, BASIC_CATEGORY, WALLS_CATEGORY, CONCRETE_CATEGORY, 'Finishes'], {
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

  const [crewType, setCrewType] = useState(initialData?.crewType ?? 'Masonry')
  const [subType, setSubType] = useState(initialData?.subType ?? 'In-House')
  const isSub = subType === 'Subcontractor'

  // ── Per-tab independence — In-House / Sub keep their own takeoff inputs. Each
  //    tab now carries a per-TYPE array of column rows (mirrors WallsModule). ──
  const makeTab = (src = {}) => {
    // Legacy single-CMU estimate migration: old bids stored tab-level qty/height/
    // width/installVendor/rebarSize → fold onto cmuCols[0] so totals don't move.
    const legacyCmu =
      !src.cmuCols && (src.qty != null || src.heightIn != null || src.widthIn != null)
        ? [
            {
              vendor: src.installVendor ?? 'Standard',
              blockType: '',
              qty: src.qty ?? '',
              heightIn: src.heightIn ?? '',
              widthIn: src.widthIn ?? '',
              rebarSize: src.rebarSize ?? '#4',
            },
          ]
        : null
    return {
      difficulty: src.difficulty ?? '',
      hoursAdj: src.hoursAdj ?? '',
      colType: src.colType ?? 'CMU',
      distanceLF: src.distanceLF ?? '',
      cmuCols: src.cmuCols ? src.cmuCols.map(r => ({ ...blankCmuCol(), ...r })) : legacyCmu || [blankCmuCol()],
      pipCols: src.pipCols ? src.pipCols.map(r => ({ ...blankPipCol(), ...r })) : [blankPipCol()],
      modularCols: src.modularCols ? src.modularCols.map(r => ({ ...blankModularCol(), ...r })) : [blankModularCol()],
      brickCols: src.brickCols ? src.brickCols.map(r => ({ ...blankBrickCol(), ...r })) : [blankBrickCol()],
      finishRows: src.finishRows
        ? src.finishRows.map(r => ({ vendor: 'Standard', ...r }))
        : DEFAULT_FINISH_ROWS.map(r => ({ ...r })),
      manualRows: src.manualRows ? src.manualRows.map(r => ({ ...r })) : DEFAULT_MANUAL_ROWS.map(r => ({ ...r })),
    }
  }
  const [ihTab, setIhTab] = useState(() => makeTab(initialData?.ihData ?? initialData))
  const [subTab, setSubTab] = useState(() => makeTab(initialData?.subData))
  const cur = isSub ? subTab : ihTab
  const setCur = isSub ? setSubTab : setIhTab
  const setField = k => v => setCur(p => ({ ...p, [k]: typeof v === 'function' ? v(p[k]) : v }))

  const colType = cur.colType ?? 'CMU'
  const setColType = setField('colType')
  const difficulty = cur.difficulty
  const setDifficulty = setField('difficulty')
  const hoursAdj = cur.hoursAdj
  const setHoursAdj = setField('hoursAdj')
  const distanceLF = cur.distanceLF
  const setDistanceLF = setField('distanceLF')
  const cmuCols = cur.cmuCols
  const setCmuCols = setField('cmuCols')
  const pipCols = cur.pipCols
  const setPipCols = setField('pipCols')
  const modularCols = cur.modularCols
  const setModularCols = setField('modularCols')
  const brickCols = cur.brickCols
  const setBrickCols = setField('brickCols')
  const finishRows = cur.finishRows
  const setFinishRows = setField('finishRows')
  const manualRows = cur.manualRows
  const setManualRows = setField('manualRows')

  // ── Sales tax ──
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

  // Vendor pickers.
  const vendorOptions = vendorOptionsForCategory(COLUMNS_CATEGORY)
  // CMU block vendors come from the SHARED 'Wall Block' sub-category (same products the
  // CMU type picker lists), so block vendors like Angelus surface here just like Walls —
  // not the Columns-category list, which would drop them.
  const cmuVendorOptions = subcatVendorOptions(materialRows, CMU_BLOCK_SUBCAT, vendorNames)
  const modularVendorOptions = subcatVendorOptions(materialRows, MODULAR_SUBCAT, vendorNames)
  const brickVendorOptions = subcatVendorOptions(materialRows, BRICK_SUBCAT, vendorNames)
  const concMixVendorOptions = subcatVendorOptions(materialRows, CONC_MIX_SUBCAT, vendorNames)
  const colMat = (dbName, vendorId) =>
    colMatPrice(dbName, vendorId, materialRows, materialPrices)

  const calcRaw = calcColumns(
    {
      difficulty,
      hoursAdj,
      colType,
      cmuCols,
      pipCols,
      modularCols,
      brickCols,
      finishRows,
      manualRows,
      distanceLF,
      subType,
      subGpMarkupRate,
      commissionRate,
    },
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

  // Per-type row count for the tab-bar badges.
  const colTypeCount = key => {
    const arr = { CMU: cmuCols, PIP: pipCols, Modular: modularCols, Brick: brickCols }[key] || []
    return arr.filter(rowHasGeo).length
  }

  // Per-type Installation config (arrays + handlers + vendor/type option sources).
  const TYPE_CFG = {
    CMU: {
      arr: cmuCols,
      setter: setCmuCols,
      blank: blankCmuCol,
      vendorOptions: cmuVendorOptions,
      typeOptions: v => subcatProductOptions(materialRows, CMU_BLOCK_SUBCAT, v).map(o => ({ value: o.value, label: labelWithDims(o.row) })),
    },
    PIP: {
      arr: pipCols,
      setter: setPipCols,
      blank: blankPipCol,
      vendorOptions: concMixVendorOptions,
      typeOptions: v => subcatProductOptions(materialRows, CONC_MIX_SUBCAT, v).map(o => ({ value: o.value, label: o.label })),
    },
    Modular: {
      arr: modularCols,
      setter: setModularCols,
      blank: blankModularCol,
      vendorOptions: modularVendorOptions,
      typeOptions: v => subcatProductOptions(materialRows, MODULAR_SUBCAT, v).map(o => ({ value: o.value, label: labelWithDims(o.row) })),
    },
    Brick: {
      arr: brickCols,
      setter: setBrickCols,
      blank: blankBrickCol,
      vendorOptions: brickVendorOptions,
      typeOptions: v => subcatProductOptions(materialRows, BRICK_SUBCAT, v).map(o => ({ value: o.value, label: o.label })),
    },
  }
  const activeCfg = TYPE_CFG[colType]
  const updateColFor = setter => (i, field, val) =>
    setter(rows => rows.map((r, idx) => (idx === i ? { ...r, [field]: val } : r)))
  const removeColFor = setter => i => setter(rows => rows.filter((_, idx) => idx !== i))

  function updateFinish(i, field, val) {
    setFinishRows(rows => rows.map((r, idx) => (idx === i ? { ...r, [field]: val } : r)))
  }
  function updateManual(i, field, val) {
    setManualRows(rows => rows.map((r, idx) => (idx === i ? { ...r, [field]: val } : r)))
  }

  function handleSave() {
    onSave({
      notes,
      man_days: parseFloat(calc.manDays.toFixed(2)),
      material_cost: parseFloat(calc.totalMat.toFixed(2)),
      data: {
        difficulty,
        hoursAdj,
        colType,
        distanceLF,
        cmuCols,
        pipCols,
        modularCols,
        brickCols,
        finishRows,
        manualRows,
        crewType,
        subType,
        subGpMarkupRate,
        commissionRate,
        laborRatePerHour,
        laborBurdenPct,
        gpmd,
        materialPrices,
        materialRows,
        vendorNames,
        ihData: ihTab,
        subData: subTab,
        calc,
      },
    })
  }

  // ── Grouped rate list for the "View Rates" popup (CrewTypeBar). ──
  const _colMatRows = (dbName, unit, fallback, category = COLUMNS_CATEGORY) => {
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
          category: r0.category || category,
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
        category,
        unitLabel: unit,
        mode: 'currency',
        value: n(materialPrices[dbName]),
      },
    ]
  }
  const _laborItem = (rate, unitLabel) => ({
    label: rate.dbName,
    table: 'labor_rates',
    name: rate.dbName,
    category: COLUMNS_CATEGORY,
    mode: 'coefficient',
    unitLabel,
    value: n(materialPrices[rate.dbName]),
  })

  return (
    <SubTabContext.Provider value={isSub}>
      <div className="space-y-5">
        {/* ── Frozen header: GPMD bar + Crew Type / View Rates + Column-Type bar ── */}
        <div className="sticky top-0 z-20 -mx-6 bg-white shadow-md">
          <div className="px-6 pt-1 pb-1 bg-gray-900">
            <GpmdBar
              variant={subType === 'Subcontractor' ? 'sub' : 'inhouse'}
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
              title="Columns"
              moduleType="Columns"
              refreshAllRates={refreshAllRates}
              showInlineToggle={false}
            />
          </div>
          {/* ── Frozen Column-Type sub-tab bar (mirrors WallsModule wallType). ── */}
          <div className="px-6 pb-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Column Type</p>
            <div className="flex gap-2">
              {COL_TYPE_TABS.map(t => (
                <button
                  key={t.key}
                  onClick={() => setColType(t.key)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                    colType === t.key
                      ? 'bg-green-700 text-white border-green-700'
                      : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {t.label}
                  {colTypeCount(t.key) > 0 ? ` (${colTypeCount(t.key)})` : ''}
                </button>
              ))}
            </div>
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
        {subType !== 'Subcontractor' && (
          <>
            <SectionHeader title="Job Site Conditions" />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <p className="text-xs text-gray-500 mb-0.5">Difficulty (%)</p>
                <NumInput value={difficulty} onChange={setDifficulty} placeholder="0" />
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-0.5" title="Average Distance from Truck to Work Area">
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

        {/* ── Installation — per-type column rows (Add Column) ── */}
        <div>
          <SectionHeader title="Installation" />
          {activeCfg.arr.map((row, i) => (
            <ColEntry
              key={i}
              type={colType}
              row={row}
              idx={i}
              total={activeCfg.arr.length}
              onChange={updateColFor(activeCfg.setter)}
              onRemove={removeColFor(activeCfg.setter)}
              vendorOptions={activeCfg.vendorOptions}
              typeOptions={activeCfg.typeOptions(row.vendor)}
              typeLabel={TYPE_LABEL[colType]}
              rowCalc={ROW_CALC[colType](row, materialPrices, materialRows)}
            />
          ))}
          <button
            type="button"
            className="mt-1 text-xs text-green-700 hover:text-green-900 font-medium"
            onClick={() => activeCfg.setter(rows => [...rows, activeCfg.blank()])}
          >
            + Add Column
          </button>
        </div>

        {/* ── Finishes — shown on ALL column tabs (mirrors Walls: every wall type
              can take a finish). Finish rows are tab-level and always price. ── */}
        {(
          <div>
            <SectionHeader title="Finishes" />
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-gray-500 border-b border-gray-200">
                    <th className="text-center pb-1 pr-2 font-medium w-36">Vendor</th>
                    <th className="text-center pb-1 pr-2 font-medium">Finish Type</th>
                    <th className="text-center pb-1 pr-2 font-medium">Qty</th>
                    <th className="text-center pb-1 pr-2 font-medium text-gray-400">Unit</th>
                    <th className="text-center pb-1 pr-2 font-medium text-gray-400">$/Unit</th>
                    <th className="text-center pb-1 font-medium text-gray-400">Material $</th>
                  </tr>
                </thead>
                <tbody>
                  {finishRows.map((row, i) => {
                    const finishOpts = columnFinishOptions(materialRows, row.vendor)
                    const selOpt =
                      finishOpts.find(
                        o =>
                          o.value === row.type ||
                          o.typeKey === row.type ||
                          o.dbName === row.type ||
                          o.label === row.type
                      ) || finishOpts[0]
                    const rate = FINISH_TYPES[(selOpt && selOpt.typeKey) ?? row.type] ?? FINISH_TYPES[row.type]
                    const isTon = rate?.unit === 'ton'
                    const defCost = isTon ? rate?.costPerTon : rate?.costPerSF
                    const priceDbName = (selOpt && selOpt.dbName) || rate?.dbName
                    const cost = isSub
                      ? colMat(rate?.subDbName, row.vendor, rate?.subFallback ?? 0)
                      : colMat(priceDbName, row.vendor, defCost ?? 0)
                    const unitLabel = isSub ? 'SF' : rate?.unit ?? 'SF'
                    const mat = n(row.qty) * cost
                    return (
                      <tr key={i} className="border-b border-gray-100">
                        <td className="py-1 pr-2">
                          <select
                            className="input text-sm py-1 w-full"
                            value={row.vendor || 'Standard'}
                            onChange={e => updateFinish(i, 'vendor', e.target.value)}
                          >
                            {vendorOptions.map(o => (
                              <option key={o.value} value={o.value}>
                                {o.label}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="py-1 pr-2">
                          <div className="flex items-center gap-1">
                            <select
                              className="input text-sm py-1 flex-1 min-w-0"
                              value={row.type || ''}
                              onChange={e => updateFinish(i, 'type', e.target.value)}
                            >
                              {!row.type && <option value="">Select finish</option>}
                              {row.type && !finishOpts.some(o => o.value === row.type) && (
                                <option value={row.type}>{row.type}</option>
                              )}
                              {finishOpts.map(o => (
                                <option key={o.value} value={o.value}>
                                  {o.label}
                                </option>
                              ))}
                            </select>
                          </div>
                        </td>
                        <td className="py-1 pr-2">
                          <NumInput value={row.qty} onChange={v => updateFinish(i, 'qty', v)} className="text-center" />
                        </td>
                        <td className="py-1 pr-2 text-xs text-gray-400 text-center">{unitLabel}</td>
                        <td className="py-1 text-center text-gray-400 text-xs pr-2">
                          <span className="inline-flex items-center justify-center gap-1">${cost.toFixed(2)}</span>
                        </td>
                        <td className="py-1 text-center text-gray-600 text-xs">
                          {mat > 0 ? `$${mat.toFixed(2)}` : '—'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              <button
                type="button"
                className="mt-1 text-xs text-green-700 hover:text-green-900 font-medium"
                onClick={() => setFinishRows(r => [...r, { type: '', qty: '', vendor: 'Standard' }])}
              >
                + Add row
              </button>
            </div>
          </div>
        )}

        {/* ── Manual Entry — every type ── */}
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
                            <NumInput value={row.materials} onChange={v => updateManual(i, 'materials', v)} className="text-center flex-1" />
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
              className="mt-2 text-xs px-2 py-1 rounded bg-slate-100 text-slate-700 hover:bg-slate-200"
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
