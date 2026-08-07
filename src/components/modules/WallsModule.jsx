import WorkTypeChooser from './WorkTypeChooser'
import { useState, useEffect, useCallback, useContext } from 'react'
import { SubTabContext, subSectionTitle } from './subTabContext'
import { supabase } from '../../lib/supabase'
import GpmdBar from './GpmdBar'
import ModuleNotesField from './ModuleNotesField'
import RateEditPopover from '../RateEditPopover'
import { fetchSalesTaxRate } from '../../lib/companyDefaults'
import { calcWalkAccessLabor, DEFAULT_WALK_ACCESS_PACE_LF_PER_MIN } from '../../lib/walkAccess'
import { groutCyPerBlock as cmuGroutCyPerBlock } from '../../lib/cmuGrout'
import {
  useNewMaterialCatalog,
  resolveMaterialPrice,
  catalogOptions,
  catalogItemFor,
} from '../../lib/materialCatalog'

const WALLS_CATEGORY = 'Walls'
// Shared cross-module basics (rebar, concrete, grout pump) live here so vendor
// price changes propagate into Walls too.
const BASIC_CATEGORY = 'Basic Materials'

// ─────────────────────────────────────────────────────────────────────────────
// Walls Module — CMU Block | Poured In Place | Timber/Lumber
// CMU and PIP support multiple wall entries that sum into module totals.
// ─────────────────────────────────────────────────────────────────────────────

// ── CMU Block Type catalog ──────────────────────────────────────────────────
// Mirrors the "CmuBlockPrices" table on the Master Rates & Calcs sheet of the
// legacy Estimator Master workbook. The Excel wall sheet uses a single
// dropdown (cell E8) keyed by NAME, then VLOOKUPs the W/H/L (in inches),
// SPEC (blocks per spec-mix bag — not used by the PBS calc yet, kept for
// future parity) and unit price. We keep the same column shape here so any
// future migration to a DB-backed master rate table is mechanical.
//
// Grout cubic-yards per block is derived per block type from W/H/L exactly
// like the Excel formula: cells (L-2) × H × (W-2) inches³ → cubic yards.
const CMU_BLOCK_TYPES = [
  { name: '8x8x16 (GREY)', w: 8, h: 8, l: 16, spec: 24, price: 2.59 },
  { name: '8x8x16 SPLITFACE', w: 8, h: 8, l: 16, spec: 24, price: 5.19 },
  { name: '8x8x16 (COLOR)', w: 8, h: 8, l: 16, spec: 24, price: 6.19 },
  { name: '8x6x16 SLUMP (GREY)', w: 8, h: 6, l: 16, spec: 20, price: 4.09 },
  { name: '8x6x16 SLUMP (COLOR)', w: 8, h: 6, l: 16, spec: 20, price: 4.59 },
  { name: '12x8x16 (GREY)', w: 12, h: 8, l: 16, spec: 16, price: 5.39 },
  { name: '12x8x16 SPLITFACE', w: 12, h: 8, l: 16, spec: 16, price: 7.59 },
  { name: '12x8x16 (COLOR)', w: 12, h: 8, l: 16, spec: 16, price: 6.39 },
  { name: '12x6x16 SLUMP (COLOR)', w: 12, h: 6, l: 16, spec: 14, price: 8.6 },
  { name: '12x6x16 SLUMP (GREY)', w: 12, h: 6, l: 16, spec: 14, price: 7.89 },
  { name: '6x8x16 (GREY)', w: 6, h: 8, l: 16, spec: 28, price: 2.13 },
  { name: '6x8x16 SPLITFACE', w: 6, h: 8, l: 16, spec: 28, price: 4.59 },
  { name: '6x8x16 (COLOR)', w: 6, h: 8, l: 16, spec: 28, price: 2.59 },
  { name: '6x6x16 SLUMP (COLOR)', w: 6, h: 6, l: 16, spec: 26, price: 3.0 },
  { name: '6x6x16 SLUMP (GREY)', w: 6, h: 6, l: 16, spec: 26, price: 3.01 },
]
const DEFAULT_BLOCK_NAME = '8x8x16 (GREY)'
function blockByName(name) {
  return CMU_BLOCK_TYPES.find(b => b.name === name) || CMU_BLOCK_TYPES[0]
}
// Master-rates row name for a given block type. If an admin overrides the
// price via RateEditPopover the row is stored under this name in the
// material_rates table (category='Walls'). When no override exists, the
// calc falls back to the catalog's default price.
function wallBlockRateName(name) {
  return `Wall Block ${name}`
}
function groutCyPerBlock(b) {
  // Standardized grout fill: fixed cu-ft per block by size (0.5 for 8" wide,
  // 0.4 for 6" wide), ÷ 27 → CY. Shared across all CMU modules via cmuGrout.js.
  return cmuGroutCyPerBlock(b.w, b.h)
}

const WALL_RATES = {
  greyBlock: { db: 'Wall Grey Block', fb: 2.59 },
  bondbeamBlock: { db: 'Wall Bondbeam Block', fb: 2.59 },
  // Basics resolve from the shared "Basic Materials" catalog so vendor price
  // changes propagate. Fallbacks equal the seeded values → price-preserving.
  rebar: { db: 'Rebar', fb: 1.388 }, // $/LF (Basic Materials)
  concreteHand: { db: 'Concrete - Hand Mix', fb: 92.0 }, // $/CY (Basic Materials)
  concreteTruck: { db: 'Concrete - Ready Mix (Truck)', fb: 185.0 }, // $/CY (Basic Materials)
  groutPumpSetup: { db: 'Grout Pump - Setup', fb: 402.5 }, // Basic Materials
  groutPumpPerYd: { db: 'Grout Pump - Per CY', fb: 9.2 }, // Basic Materials
  digLab: { db: 'Wall Dig Footing Labor Rate', fb: 4.0 },
  rebarLab: { db: 'Wall Set Rebar Labor Rate', fb: 35.0 },
  blockLab: { db: 'Wall Set Block Labor Rate', fb: 10.4 },
  handGroutLab: { db: 'Wall Hand Grout Labor Rate', fb: 5.5 },
  pumpGroutLab: { db: 'Wall Pump Grout Labor Rate', fb: 81.0 },
  setupCleanLab: { db: 'Wall Setup Clean Labor Rate', fb: 30.0 },
  sandStucco: { db: 'Sand Stucco - Wall', fb: 0.0 },
  smoothStucco: { db: 'Smooth Stucco - Wall', fb: 0.0 },
  ledgerstone: { db: 'Ledgerstone - Wall', fb: 10.0 },
  stackedStone: { db: 'Stacked Stone - Wall', fb: 10.0 },
  tile: { db: 'Tile - Wall', fb: 6.5 },
  flagstone: { db: 'Real Flagstone - Wall', fb: 400.0 },
  realStone: { db: 'Real Stone - Wall', fb: 400.0 },
  sandStuccoLab: { db: 'Sand Stucco - Wall Labor Rate', fb: 92 },
  smoothStuccoLab: { db: 'Smooth Stucco - Wall Labor Rate', fb: 65 },
  ledgerstoneLab: { db: 'Ledgerstone - Wall Labor Rate', fb: 24 },
  stackedStoneLab: { db: 'Stacked Stone - Wall Labor Rate', fb: 24 },
  tileLab: { db: 'Tile - Wall Labor Rate', fb: 0.2867 },
  flagstoneLab: { db: 'Real Flagstone - Wall Labor Rate', fb: 0.4487 },
  realStoneLab: { db: 'Real Stone - Wall Labor Rate', fb: 0.8954 },
  capFlagstone: { db: 'Wall Cap Flagstone', fb: 500.0 },
  capPrecast: { db: 'Wall Cap Precast', fb: 50.0 },
  capBullnose: { db: 'Wall Cap Bullnose Brick', fb: 5.0 },
  wpPrimerMembrane: { db: 'Wall WP Primer Membrane', fb: 1.8 },
  wp3CoatRollOn: { db: 'Wall WP 3 Coat Roll On', fb: 1.2 },
  wpThoroseal: { db: 'Wall WP Thoroseal Roll On', fb: 1.5 },
  wpDimpleMembrane: { db: 'Wall WP Dimple Membrane', fb: 2.1 },
}

const DEFAULTS = { laborRatePerHour: 35, laborBurdenPct: 0.29, gpmd: 425, commissionRate: 0.12 }
const n = v => parseFloat(v) || 0
const r2 = x => Math.round(((x || 0) + Number.EPSILON) * 100) / 100

// Default entries. Each structural wall entry carries its OWN waterproofing
// rows (wpRows) — waterproofing is now specified per wall, not once per tab.
const DEFAULT_CMU = () => ({
  blockType: DEFAULT_BLOCK_NAME,
  vendor: 'House',
  lf: '',
  heightIn: '',
  footingWIn: '12',
  footingDIn: '12',
  rebarSpIn: '16',
  horizBars: '2',
  bondBeams: '1',
  pctGrouted: '100',
  pctCurved: '0',
  subEach: '',
  wpRows: [blankWpRow()],
})
const DEFAULT_PIP = () => ({
  vendor: 'House',
  lf: '',
  heightIn: '',
  footingWIn: '12',
  footingDIn: '12',
  horizBars: '2',
  subEach: '',
  wpRows: [blankWpRow()],
})
// Modular block wall — duplicates the CMU fields EXCEPT rebar spacing, horiz
// bars, bond-beam courses and % grouted solid (modular block isn't grouted or
// reinforced the same way). Prices out via calcOneModular, which reuses the
// CMU block+footing math with those inputs forced to zero.
const DEFAULT_MODULAR = () => ({
  blockType: DEFAULT_BLOCK_NAME,
  vendor: 'House',
  lf: '',
  heightIn: '',
  footingWIn: '12',
  footingDIn: '12',
  pctCurved: '0',
  subEach: '',
  wpRows: [blankWpRow()],
})
// Brick wall — same structure/pricing model as Modular (block + footing, no
// grout/rebar), just a different wall category.
const DEFAULT_BRICK = () => ({
  blockType: DEFAULT_BLOCK_NAME,
  vendor: 'House',
  lf: '',
  heightIn: '',
  footingWIn: '12',
  footingDIn: '12',
  pctCurved: '0',
  subEach: '',
  wpRows: [blankWpRow()],
})

// ── Fixed per-section type lists (the Item dropdown; NOT from the DB) ─────────
// Only the Vendor changes the material price; the Item (type) drives the
// pricing/labor FORMULA, which stays byte-for-byte identical to the original.
const WALL_FINISH_TYPES = [
  'Sand Stucco',
  'Smooth Stucco',
  'Ledgerstone',
  'Stacked Stone',
  'Tile',
  'Real Flagstone',
  'Real Stone',
]
const WALL_FINISH_META = {
  'Sand Stucco': { matKey: 'sandStucco', labKey: 'sandStuccoLab', matUnit: 'SF', labUnit: 'SF/day' },
  'Smooth Stucco': {
    matKey: 'smoothStucco',
    labKey: 'smoothStuccoLab',
    matUnit: 'SF',
    labUnit: 'SF/day',
  },
  Ledgerstone: { matKey: 'ledgerstone', labKey: 'ledgerstoneLab', matUnit: 'SF', labUnit: 'SF/day' },
  'Stacked Stone': {
    matKey: 'stackedStone',
    labKey: 'stackedStoneLab',
    matUnit: 'SF',
    labUnit: 'SF/day',
  },
  Tile: { matKey: 'tile', labKey: 'tileLab', matUnit: 'SF', labUnit: 'hrs/SF' },
  'Real Flagstone': { matKey: 'flagstone', labKey: 'flagstoneLab', matUnit: 'ton', labUnit: 'hrs/SF' },
  'Real Stone': { matKey: 'realStone', labKey: 'realStoneLab', matUnit: 'ton', labUnit: 'hrs/SF' },
}

const WP_TYPES = [
  'None',
  'Primer & Membrane',
  '3 Coats Roll On',
  'Thoroseal & Roll On',
  'Dimple Membrane',
]
const WP_KEY = {
  'Primer & Membrane': 'wpPrimerMembrane',
  '3 Coats Roll On': 'wp3CoatRollOn',
  'Thoroseal & Roll On': 'wpThoroseal',
  'Dimple Membrane': 'wpDimpleMembrane',
}

const blankWallFinishRow = () => ({ vendor: 'House', type: 'Sand Stucco', sf: '', rateIn: '', subEach: '' })
const blankCapRow = () => ({ vendor: 'House', type: 'None', widthIn: '', lf: '', qty: '', subEach: '' })
const blankWpRow = () => ({ vendor: 'House', type: 'None', sf: '', subEach: '' })

// ── Vendor-catalog material price ─────────────────────────────────────────────
// The ONLY thing the Vendor selection changes: the material $ source. When a
// real vendor is selected AND a material_rates row exists (name===dbName &&
// vendor_id===vendorId) use that row's unit_cost; otherwise fall back to the
// House price (name-keyed mp[dbName]) then the hard fallback. Vendor 'House'
// resolves to exactly the original math, so In-House numbers never move.
// Shared resolver (src/lib/materialCatalog.js) — same vendor→House→fallback order.
const wallMatPrice = resolveMaterialPrice

// ── Per-row Wall Finish calculator — identical formulas to the original
//    calcWalls finish math; only the material price source is vendor-resolved.
//    Returns { mat, hrs } for In-House and { subUnit, subEach, subMat } for Sub.
function computeWallFinishRow(row, mp, materialRows) {
  const sf = n(row.sf)
  const v = row.vendor
  const price = k => wallMatPrice(WALL_RATES[k].db, v, materialRows, mp, WALL_RATES[k].fb)
  const lab = k => mp?.[WALL_RATES[k].db] ?? WALL_RATES[k].fb
  // Override-or-price helper. Empty / 0 / NaN override → the vendor/House price.
  const ovr = (input, k) => {
    const x = parseFloat(input)
    return Number.isFinite(x) && x > 0 ? x : price(k)
  }
  let mat = 0,
    hrs = 0,
    subUnit = 0,
    tons = 0
  switch (row.type) {
    case 'Sand Stucco': {
      const rate = ovr(row.rateIn, 'sandStucco')
      hrs = sf > 0 ? (sf / lab('sandStuccoLab')) * 8 : 0
      mat = sf * rate
      subUnit = rate
      break
    }
    case 'Smooth Stucco': {
      const rate = ovr(row.rateIn, 'smoothStucco')
      hrs = sf > 0 ? (sf / lab('smoothStuccoLab')) * 8 : 0
      mat = sf * rate
      subUnit = rate
      break
    }
    case 'Ledgerstone': {
      const rate = ovr(row.rateIn, 'ledgerstone')
      hrs = sf > 0 ? (sf / lab('ledgerstoneLab')) * 8 : 0
      mat = sf > 0 ? sf * rate * 1.1 + (sf / 5) * 2 : 0
      subUnit = rate * 1.1 + 0.4
      break
    }
    case 'Stacked Stone': {
      const rate = ovr(row.rateIn, 'stackedStone')
      hrs = sf > 0 ? (sf / lab('stackedStoneLab')) * 8 : 0
      mat = sf > 0 ? sf * rate * 1.1 + (sf / 5) * 2 : 0
      subUnit = rate * 1.1 + 0.4
      break
    }
    case 'Tile': {
      const rate = ovr(row.rateIn, 'tile')
      hrs = sf > 0 ? sf * lab('tileLab') : 0
      mat = sf > 0 ? sf * rate + sf : 0
      subUnit = rate + 1
      break
    }
    case 'Real Flagstone': {
      const rate = n(row.rateIn) || price('flagstone')
      hrs = sf > 0 ? sf * lab('flagstoneLab') : 0
      mat = sf > 0 ? (sf / 80) * rate + sf * 1.5 : 0
      subUnit = rate / 80 + 1.5
      tons = sf / 80
      break
    }
    case 'Real Stone': {
      const rate = n(row.rateIn) || price('realStone')
      hrs = sf > 0 ? sf * lab('realStoneLab') : 0
      mat = sf > 0 ? (sf / 70) * rate + sf * 2 : 0
      subUnit = rate / 70 + 2
      tons = sf / 70
      break
    }
    default:
      break
  }
  const subEach = row.subEach !== '' && row.subEach != null ? n(row.subEach) : subUnit
  return { mat, hrs, subUnit, subEach, subMat: sf * subEach, tons, unit: 'SF', qty: sf }
}

// ── Per-row Wall Cap calculator — identical to the original cap math (incl. the
//    Precast width factor); material price is vendor-resolved.
function computeCapRow(row, mp, materialRows) {
  const lf = n(row.lf),
    widthIn = n(row.widthIn),
    qty = n(row.qty)
  const v = row.vendor
  const price = k => wallMatPrice(WALL_RATES[k].db, v, materialRows, mp, WALL_RATES[k].fb)
  let mat = 0,
    hrs = 0,
    subUnit = 0,
    subQty = 0,
    unit = 'LF',
    dispQty = lf
  switch (row.type) {
    case 'Flagstone':
      mat = (((widthIn / 12) * lf * 0.0833 * 100) / 2000) * price('capFlagstone')
      hrs = lf * 0.25
      subUnit = (((widthIn / 12) * 0.0833 * 100) / 2000) * price('capFlagstone')
      subQty = lf
      break
    case 'Precast': {
      const widthFactor = (widthIn || 8) / 8
      mat = qty * price('capPrecast') * widthFactor
      hrs = qty * 0.2
      subUnit = price('capPrecast') * widthFactor
      subQty = qty
      unit = 'ea'
      dispQty = qty
      break
    }
    case 'PIP Concrete':
      mat = ((lf * (widthIn / 12) * 0.333) / 27) * price('concreteTruck')
      hrs = lf * 0.15
      subUnit = (((widthIn / 12) * 0.333) / 27) * price('concreteTruck')
      subQty = lf
      break
    case 'Bullnose Brick':
      mat = lf * price('capBullnose')
      hrs = lf * 0.08
      subUnit = price('capBullnose')
      subQty = lf
      break
    default:
      break
  }
  const subEach = row.subEach !== '' && row.subEach != null ? n(row.subEach) : subUnit
  return { mat, hrs, subUnit, subEach, subMat: subQty * subEach, unit, qty: dispQty, widthIn }
}

// ── Per-row Waterproofing calculator — identical to the original wp math;
//    material price is vendor-resolved.
function computeWpRow(row, mp, materialRows) {
  const sf = n(row?.sf)
  const k = WP_KEY[row?.type]
  let mat = 0,
    hrs = 0,
    subUnit = 0
  if (sf > 0 && k) {
    const pr = wallMatPrice(WALL_RATES[k].db, row.vendor, materialRows, mp, WALL_RATES[k].fb)
    mat = sf * pr
    hrs = sf / 200
    subUnit = pr
  }
  const subEach = row.subEach !== '' && row.subEach != null ? n(row.subEach) : subUnit
  return { mat, hrs, subUnit, subEach, subMat: sf * subEach, unit: 'SF', qty: sf }
}

// Sum a wall entry's own waterproofing rows into { wpHrs, wpMat, wpSubMat }.
function computeWallWpTotals(wall, mp, materialRows) {
  const rows = Array.isArray(wall?.wpRows) ? wall.wpRows : []
  return rows.reduce(
    (a, row) => {
      const c = computeWpRow(row, mp, materialRows)
      return { wpHrs: a.wpHrs + c.hrs, wpMat: a.wpMat + c.mat, wpSubMat: a.wpSubMat + c.subMat }
    },
    { wpHrs: 0, wpMat: 0, wpSubMat: 0 }
  )
}

// ── Modular master-list wall products ──────────────────────────────────────
// Each module's material selector is driven by a sub_category "marker": rows in
// material_rates (category='Walls') tagged sub_category='Modular Wall' show up in
// the Modular tab's Wall Type picker automatically — populate the master list and
// they appear here, no code change. Dimensions (block_w/h/l_in, inches) drive the
// block-count math; unit_cost is the per-unit price.
const MODULAR_SUBCAT = 'Modular Wall'
const MODULAR_CAT_OPTS = { houseRows: 'null-vendor', stripPrefix: true }
const MODULAR_FALLBACK = { name: 'Modular Block 8x8x16', w: 8, h: 8, l: 16, price: 3.5 }
// Resolve the selected master-list wall product → { name, w, h, l, price }.
// vendorSel picks the vendor's row (or the Unspecified/null-vendor row); a
// missing/legacy key falls back to the first product under that marker.
function resolveMasterBlock(wall, materialRows, subcat) {
  // Show every product assigned to this sub-category regardless of vendor
  // (Modular Wall items are vendor-priced, so a Standard-only filter is empty).
  const inSub = (materialRows || []).filter(r => r.sub_category === subcat)
  const row = inSub.find(r => r.id === wall.blockType) || inSub[0]
  if (!row) return MODULAR_FALLBACK
  // Block dims now live in the product's calc_meta (new model); fall back to the
  // legacy columns for safety, then to the module defaults.
  const cm = row.calc_meta || {}
  return {
    name: row.name,
    w: n(cm.block_w_in) || n(row.block_w_in) || MODULAR_FALLBACK.w,
    h: n(cm.block_h_in) || n(row.block_h_in) || MODULAR_FALLBACK.h,
    l: n(cm.block_l_in) || n(row.block_l_in) || MODULAR_FALLBACK.l,
    price: n(row.unit_cost),
  }
}

// ── Per-wall calculators ──────────────────────────────────────────────────────
function calcOneCMU(wall, footingPump, groutPump, r, mp = {}, materialRows = [], blockOverride = null) {
  const {
    blockType,
    lf,
    heightIn,
    footingWIn,
    footingDIn,
    rebarSpIn,
    horizBars,
    bondBeams,
    pctGrouted,
    pctCurved,
  } = wall
  if (!n(lf) || !n(heightIn)) {
    // Structural inputs blank — still bill any waterproofing entered on the wall.
    const wp0 = computeWallWpTotals(wall, mp, materialRows)
    return { hrs: 0, mat: 0, subUnit: 0, subEach: 0, subMat: 0, ...wp0, detail: null }
  }

  // Vendor only swaps where each MATERIAL unit price comes from; labor rates
  // (r) and all geometry stay exactly as before. Vendor 'House' resolves to
  // the original master-rate / catalog prices, so In-House math is unchanged.
  const v = wall.vendor
  const pm = key => wallMatPrice(WALL_RATES[key].db, v, materialRows, mp, WALL_RATES[key].fb)

  // Selected block type drives both DIMENSIONS (how many blocks per course /
  // per wall height) and PRICE (grey block unit cost). Price prefers a
  // vendor row, then a master_rates override (set via the Edit Rates popover),
  // and falls back to the catalog default. Falls back to the default 8x8x16
  // grey block if blockType is missing (legacy walls).
  const b = blockOverride || blockByName(blockType)
  const blockPrice = blockOverride
    ? n(blockOverride.price)
    : wallMatPrice(wallBlockRateName(b.name), v, materialRows, mp, b.price)
  const blocksPerCourse = Math.ceil((n(lf) * 12) / b.l)
  const totalCourses = Math.ceil(n(heightIn) / b.h)
  const bbCourses = Math.min(n(bondBeams), totalCourses)
  const regCourses = Math.max(0, totalCourses - bbCourses)
  const rawBlocks = blocksPerCourse * totalCourses
  const orderGreyBlock = Math.ceil(blocksPerCourse * regCourses * 1.1)
  const orderBBBlock = Math.ceil(blocksPerCourse * bbCourses * 1.1)

  const footingCF = (n(footingWIn) / 12) * (n(footingDIn) / 12) * n(lf)
  const footingCY = footingCF / 27
  const groutCY = rawBlocks * groutCyPerBlock(b) * (n(pctGrouted) / 100)
  const groutCF = groutCY * 27

  const vertRebars = n(rebarSpIn) > 0 ? Math.ceil((n(lf) * 12) / n(rebarSpIn)) : 0
  const vertRebarLF = (vertRebars * (n(heightIn) + n(footingDIn))) / 12
  const horizRebarLF = (n(horizBars) + bbCourses) * n(lf)
  const totalRebarLF = vertRebarLF + horizRebarLF

  const groutRate = groutPump === 'Yes' ? r('pumpGroutLab') : r('handGroutLab')
  const structBase =
    (footingCF > 0 ? footingCF / r('digLab') : 0) +
    (totalRebarLF > 0 ? totalRebarLF / r('rebarLab') : 0) +
    (footingCY > 0 ? footingCY / 0.2037 : 0) +
    (rawBlocks > 0 ? rawBlocks / r('blockLab') : 0) +
    (groutCF > 0 ? groutCF / groutRate : 0) +
    n(lf) / r('setupCleanLab')
  const curveAdd = structBase * (n(pctCurved) / 100) * 0.5
  const hrs = structBase + curveAdd

  const footConcrPrc = footingPump === 'Yes' ? pm('concreteTruck') : pm('concreteHand')
  const groutConcrPrc = groutPump === 'Yes' ? pm('concreteTruck') : pm('concreteHand')
  // Grey block price comes from the selected block type's catalog entry
  // (mirroring the Excel VLOOKUP into the CmuBlockPrices table). Bond-beam
  // block stays on the flat master rate — there's only one BB SKU.
  const mat =
    orderGreyBlock * blockPrice +
    orderBBBlock * pm('bondbeamBlock') +
    totalRebarLF * pm('rebar') +
    footingCY * footConcrPrc +
    (footingPump === 'Yes' ? pm('groutPumpSetup') : 0) +
    groutCY * groutConcrPrc +
    (groutPump === 'Yes' && groutCY > 0 ? pm('groutPumpSetup') + groutCY * pm('groutPumpPerYd') : 0)

  // Sub-tab flat pricing: default $/LF = In-House material ÷ LF; the estimator
  // can override per-wall. No labor is billed on the Sub tab.
  const subUnit = n(lf) > 0 ? mat / n(lf) : 0
  const subEach = wall.subEach !== '' && wall.subEach != null ? n(wall.subEach) : subUnit
  const subMat = n(lf) * subEach

  const wp = computeWallWpTotals(wall, mp, materialRows)

  return {
    hrs,
    mat,
    subUnit,
    subEach,
    subMat,
    ...wp,
    detail: { orderGreyBlock, orderBBBlock, footingCY, groutCY, totalRebarLF, curveAdd, subUnit },
  }
}

// ── Modular block wall — reuses the CMU block + footing math with rebar,
//    horizontal bars, bond beams and grouting all forced to zero (modular
//    block isn't grouted/reinforced). Only the footing pump applies. ──────────
// subcat present → resolve the wall product from the master list (Modular tab);
// omitted → legacy CMU block catalog (Brick tab, unchanged).
function calcOneModular(wall, footingPump, r, mp = {}, materialRows = [], subcat = null) {
  const modWall = { ...wall, rebarSpIn: '0', horizBars: '0', bondBeams: '0', pctGrouted: '0' }
  const override = subcat ? resolveMasterBlock(wall, materialRows, subcat) : null
  return calcOneCMU(modWall, footingPump, 'No', r, mp, materialRows, override)
}

function calcOnePIP(wall, r, mp = {}, materialRows = []) {
  const { lf, heightIn, footingWIn, footingDIn, horizBars } = wall
  if (!n(lf) || !n(heightIn)) {
    const wp0 = computeWallWpTotals(wall, mp, materialRows)
    return { hrs: 0, mat: 0, concCY: 0, subUnit: 0, subEach: 0, subMat: 0, ...wp0 }
  }
  const v = wall.vendor
  const pm = key => wallMatPrice(WALL_RATES[key].db, v, materialRows, mp, WALL_RATES[key].fb)
  // Wall stem (existing formula)
  const addlCourses = Math.max(0, Math.ceil((n(heightIn) - 6) / 6))
  const wallHrs = n(lf) * (1.0833 + addlCourses * 1.6167)
  const wallConcCY = n(lf) * (0.2833 + addlCourses * 0.3667)

  // Footing — same dig + rebar + pour coefficients as the CMU calc so PIP
  // footings price out consistently. Optional: if the user leaves footing
  // fields blank, the footing contribution is just 0 and the wall behaves
  // exactly like the previous (footing-less) version.
  const fW = n(footingWIn),
    fD = n(footingDIn),
    hb = n(horizBars)
  const footingCF = fW > 0 && fD > 0 ? n(lf) * (fW / 12) * (fD / 12) : 0
  const footingCY = footingCF / 27
  const horizRebarLF = hb * n(lf)
  const footingHrs =
    (footingCF > 0 ? footingCF / r('digLab') : 0) +
    (horizRebarLF > 0 ? horizRebarLF / r('rebarLab') : 0) +
    (footingCY > 0 ? footingCY / 0.2037 : 0)
  const footingMat = footingCY * pm('concreteTruck') + horizRebarLF * pm('rebar')

  const hrs = wallHrs + footingHrs
  const concCY = wallConcCY + footingCY
  const mat = wallConcCY * pm('concreteTruck') + footingMat
  // Sub-tab flat pricing: default $/LF = In-House material ÷ LF; overridable.
  const subUnit = n(lf) > 0 ? mat / n(lf) : 0
  const subEach = wall.subEach !== '' && wall.subEach != null ? n(wall.subEach) : subUnit
  const subMat = n(lf) * subEach
  const wp = computeWallWpTotals(wall, mp, materialRows)
  return { hrs, mat, concCY, footingCY, horizRebarLF, subUnit, subEach, subMat, ...wp }
}

// ── Main calc ─────────────────────────────────────────────────────────────────
function calcWalls(
  state,
  lrph = DEFAULTS.laborRatePerHour,
  mp = {},
  gpmd = DEFAULTS.gpmd,
  walkAccess = null,
  laborBurdenPct = DEFAULTS.laborBurdenPct,
  materialRows = []
) {
  const r = key => mp[WALL_RATES[key].db] ?? WALL_RATES[key].fb
  const _pace = n(walkAccess?.paceLfPerMin) || DEFAULT_WALK_ACCESS_PACE_LF_PER_MIN

  let structuralHrs = 0,
    structuralMat = 0,
    structuralSubMat = 0
  let cmuDetails = [],
    pipDetails = [],
    modularDetails = [],
    brickDetails = []
  // Waterproofing now lives per-wall; accumulate each wall's wp into the wp
  // bucket (kept separate so the summary's Waterproofing line still works).
  let wallWpHrs = 0,
    wallWpMat = 0,
    wallWpSubMat = 0
  const addWp = res => {
    wallWpHrs += res.wpHrs || 0
    wallWpMat += res.wpMat || 0
    wallWpSubMat += res.wpSubMat || 0
  }

  // ALL wall types contribute simultaneously — switching the visible tab
  // no longer drops the other types from the calc. Each section is its
  // own array and gets summed below. Vendor only changes the material $;
  // In-House labor / geometry is unchanged.
  ;(state.cmuWalls || []).forEach(wall => {
    const res = calcOneCMU(wall, state.cmuFootingPump, state.cmuGroutPump, r, mp, materialRows)
    structuralHrs += res.hrs
    structuralMat += res.mat
    structuralSubMat += res.subMat
    addWp(res)
    cmuDetails.push(res.detail)
  })
  ;(state.pipWalls || []).forEach(wall => {
    const res = calcOnePIP(wall, r, mp, materialRows)
    structuralHrs += res.hrs
    structuralMat += res.mat
    structuralSubMat += res.subMat
    addWp(res)
    pipDetails.push({ ...res, lf: wall.lf, heightIn: wall.heightIn })
  })
  ;(state.modularWalls || []).forEach(wall => {
    const res = calcOneModular(wall, state.modularFootingPump, r, mp, materialRows, MODULAR_SUBCAT)
    structuralHrs += res.hrs
    structuralMat += res.mat
    structuralSubMat += res.subMat
    addWp(res)
    modularDetails.push(res.detail)
  })
  ;(state.brickWalls || []).forEach(wall => {
    const res = calcOneModular(wall, state.brickFootingPump, r, mp, materialRows)
    structuralHrs += res.hrs
    structuralMat += res.mat
    structuralSubMat += res.subMat
    addWp(res)
    brickDetails.push(res.detail)
  })

  if (n(state.timberLF) > 0 || n(state.timberPosts) > 0) {
    const addlCourses = Math.max(0, Math.ceil((n(state.timberHeightIn) - 8) / 8))
    const postQty = n(state.timberPosts)
    structuralHrs += n(state.timberLF) * (0.4417 + addlCourses * 0.8) + postQty * 0.4667
    const timberMat = n(state.timberLF) * (0.2917 + addlCourses * 0.55) * 50 + postQty * 100
    structuralMat += timberMat
    // Sub flat: default $/LF = In-House timber material ÷ LF (folding posts in);
    // overridable via timberSubEach. Posts-only (no LF) bills the material flat.
    const tSubUnit = n(state.timberLF) > 0 ? timberMat / n(state.timberLF) : 0
    const tSubEach =
      state.timberSubEach !== '' && state.timberSubEach != null ? n(state.timberSubEach) : tSubUnit
    structuralSubMat += n(state.timberLF) > 0 ? n(state.timberLF) * tSubEach : timberMat
  }

  // ── Wall Finishes — per-row (Vendor + Item). Formula per type is identical
  //    to the original calc; the material price is vendor-resolved. ──────────
  const finishRows = (state.wallFinishRows || []).map(row =>
    computeWallFinishRow(row, mp, materialRows)
  )
  const finishHrs = finishRows.reduce((a, x) => a + (x.hrs || 0), 0)
  const finishMat = finishRows.reduce((a, x) => a + (x.mat || 0), 0)
  const finishSubMat = finishRows.reduce((a, x) => a + (x.subMat || 0), 0)

  // ── Caps — per-row (Vendor + Item), identical math incl. Precast width. ────
  const capResults = (state.capRows || []).map(row => computeCapRow(row, mp, materialRows))
  const capHrs = capResults.reduce((a, x) => a + (x.hrs || 0), 0)
  const capMat = capResults.reduce((a, x) => a + (x.mat || 0), 0)
  const capSubMat = capResults.reduce((a, x) => a + (x.subMat || 0), 0)

  // ── Waterproofing — now specified PER WALL. Each wall entry's wpRows were
  //    summed above into wallWp*. (Legacy tab-level wpRows are migrated onto
  //    the first CMU wall by makeTab, so totals stay consistent.) ────────────
  const wpHrs = wallWpHrs
  const wpMat = wallWpMat
  const wpSubMat = wallWpSubMat

  // Manual
  let manHrs = 0,
    manMat = 0,
    manSub = 0
  ;(state.manualRows || []).forEach(row => {
    manHrs += n(row.hours)
    manMat += n(row.materials)
    manSub += n(row.subCost)
  })

  // ── In-House totals (unchanged formulas) ─────────────────────────────────
  const baseHrs = structuralHrs + finishHrs + capHrs + wpHrs + manHrs
  const diffMod = 1 + n(state.difficulty) / 100
  const _adjHrs = baseHrs * diffMod + n(state.hoursAdj)
  const walkHrsIH = calcWalkAccessLabor(_adjHrs, state.distanceLF, { paceLfPerMin: _pace })
  const totalHrsIH = _adjHrs + walkHrsIH
  const totalMatIH = structuralMat + finishMat + capMat + wpMat + manMat
  const totalSubMat = structuralSubMat + finishSubMat + capSubMat + wpSubMat

  const isSubTab = state.subType === 'Subcontractor'
  const subMarkup = n(state.subGpMarkupRate) || 0.2
  let gp,
    subCost,
    subGp,
    commission,
    price,
    totalHrs,
    manDays,
    totalMat,
    laborCost,
    burden,
    walkHrs
  if (isSubTab) {
    // Sub tab: flat per-unit material only, NO labor hours. The itemized flat
    // cost IS the subcontractor cost; profit is the markup (Sub GP).
    walkHrs = 0
    totalHrs = 0
    manDays = 0
    laborCost = 0
    burden = 0
    // In-house materials are 0 on the Sub tab — sub materials live in subCost.
    totalMat = 0
    gp = 0
    subCost = totalSubMat + manSub
    subGp = subCost * subMarkup
    commission = subGp * DEFAULTS.commissionRate
    price = subCost + subGp + commission
  } else {
    walkHrs = walkHrsIH
    totalHrs = totalHrsIH
    manDays = totalHrs / 8
    totalMat = totalMatIH
    laborCost = totalHrs * lrph
    burden = laborCost * (n(laborBurdenPct) || DEFAULTS.laborBurdenPct)
    gp = manDays * gpmd
    subCost = manSub
    subGp = 0
    commission = gp * DEFAULTS.commissionRate
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
    structuralHrs,
    finishHrs,
    capHrs,
    wpHrs,
    structuralMat,
    finishMat,
    capMat,
    wpMat,
    cmuDetails,
    pipDetails,
    modularDetails,
    brickDetails,
    finishRows,
    capResults,
  }
}

// ── Sub-components ────────────────────────────────────────────────────────────
function SectionHeader({ title }) {
  const isSub = useContext(SubTabContext)
  return (
    <div className="bg-gray-50 rounded-lg px-4 py-2.5 border border-gray-200 mb-2">
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

function LabeledRow({ label, children }) {
  return (
    <div className="flex items-center gap-3 py-1.5 border-b border-gray-100">
      <span className="text-xs text-gray-700 w-52 shrink-0">{label}</span>
      {children}
    </div>
  )
}

const DEFAULT_MANUAL_ROWS = [
  { label: 'Misc 1', hours: '', materials: '', subCost: '' },
  { label: 'Misc 2', hours: '', materials: '', subCost: '' },
  { label: 'Misc 3', hours: '', materials: '', subCost: '' },
]
const DEFAULT_CAP_ROWS = [blankCapRow(), blankCapRow()]
const CAP_TYPES = ['None', 'Flagstone', 'Precast', 'PIP Concrete', 'Bullnose Brick']

// ── Per-tab input record ──────────────────────────────────────────────────────
// In-House and Sub each hold their own independent copy so the two tabs are
// separate calculators. Backward-compat: legacy single-entry / flat fields are
// migrated into the array forms below.
// Ensure a wall entry has its own waterproofing rows (default one blank row).
function initWallWp(w = {}) {
  if (Array.isArray(w.wpRows) && w.wpRows.length)
    return w.wpRows.map(r => ({ vendor: 'House', subEach: '', ...r }))
  return [blankWpRow()]
}
function initCmuWalls(src = {}) {
  if (src.cmuWalls)
    return src.cmuWalls.map(w => ({
      blockType: DEFAULT_BLOCK_NAME,
      vendor: 'House',
      subEach: '',
      ...w,
      wpRows: initWallWp(w),
    }))
  if (src.cmuLF !== undefined)
    return [
      {
        blockType: DEFAULT_BLOCK_NAME,
        vendor: 'House',
        lf: src.cmuLF,
        heightIn: src.cmuHeightIn,
        footingWIn: src.cmuFootingWIn ?? '12',
        footingDIn: src.cmuFootingDIn ?? '12',
        rebarSpIn: src.cmuRebarSpIn ?? '16',
        horizBars: src.cmuHorizBars ?? '2',
        bondBeams: src.cmuBondBeams ?? '1',
        pctGrouted: src.cmuPctGrouted ?? '100',
        pctCurved: src.cmuPctCurved ?? '0',
        subEach: '',
        wpRows: [blankWpRow()],
      },
    ]
  return [DEFAULT_CMU()]
}
function initPipWalls(src = {}) {
  if (src.pipWalls)
    return src.pipWalls.map(w => ({ vendor: 'House', subEach: '', ...w, wpRows: initWallWp(w) }))
  if (src.pipLF !== undefined)
    return [
      { vendor: 'House', lf: src.pipLF, heightIn: src.pipHeightIn, subEach: '', wpRows: [blankWpRow()] },
    ]
  return [DEFAULT_PIP()]
}
function initModularWalls(src = {}) {
  if (src.modularWalls)
    return src.modularWalls.map(w => ({
      blockType: DEFAULT_BLOCK_NAME,
      vendor: 'House',
      subEach: '',
      ...w,
      wpRows: initWallWp(w),
    }))
  return [DEFAULT_MODULAR()]
}
function initBrickWalls(src = {}) {
  if (src.brickWalls)
    return src.brickWalls.map(w => ({
      blockType: DEFAULT_BLOCK_NAME,
      vendor: 'House',
      subEach: '',
      ...w,
      wpRows: initWallWp(w),
    }))
  return [DEFAULT_BRICK()]
}
function initWpRows(src = {}) {
  if (Array.isArray(src.wpRows) && src.wpRows.length)
    return src.wpRows.map(w => ({ vendor: 'House', subEach: '', ...w }))
  if (src.wpType || src.wpSF)
    return [{ vendor: 'House', type: src.wpType || 'None', sf: src.wpSF || '', subEach: '' }]
  return [blankWpRow()]
}
// Migrate the legacy fixed finish fields (sandStuccoSF / …RateIn) into the new
// row model. Each legacy finish that has SF or an override rate becomes a
// House-vendor row so its In-House numbers stay byte-for-byte identical.
function initWallFinishRows(src = {}) {
  if (Array.isArray(src.wallFinishRows) && src.wallFinishRows.length)
    return src.wallFinishRows.map(r => ({ ...r }))
  const rows = []
  const push = (type, sfKey, rateKey) => {
    if (n(src[sfKey]) > 0 || (src[rateKey] != null && src[rateKey] !== ''))
      rows.push({
        vendor: 'House',
        type,
        sf: src[sfKey] ?? '',
        rateIn: src[rateKey] ?? '',
        subEach: '',
      })
  }
  push('Sand Stucco', 'sandStuccoSF', 'sandStuccoRateIn')
  push('Smooth Stucco', 'smoothStuccoSF', 'smoothStuccoRateIn')
  push('Ledgerstone', 'ledgerstoneSF', 'ledgerstoneRateIn')
  push('Stacked Stone', 'stackedStoneSF', 'stackedStoneRateIn')
  push('Tile', 'tileSF', 'tileRateIn')
  push('Real Flagstone', 'flagstoneSF', 'flagstoneRateIn')
  push('Real Stone', 'realStoneSF', 'realStoneRateIn')
  return rows.length ? rows : [blankWallFinishRow(), { ...blankWallFinishRow(), type: 'Ledgerstone' }]
}
function makeTab(src = {}) {
  const cmuWalls = initCmuWalls(src)
  // Legacy estimates stored a single tab-level waterproofing set (wpRows /
  // wpType / wpSF) that rendered inside the CMU section. Waterproofing is now
  // per wall, so fold any legacy tab-level entries onto the first CMU wall —
  // this keeps old estimates' totals byte-for-byte identical.
  if (!src.cmuWalls) {
    const legacyWp = initWpRows(src).filter(w => w.type && w.type !== 'None')
    if (legacyWp.length && cmuWalls[0]) {
      const existing = (cmuWalls[0].wpRows || []).filter(w => w.type && w.type !== 'None')
      const merged = [...existing, ...legacyWp]
      cmuWalls[0].wpRows = merged.length ? merged : [blankWpRow()]
    }
  }
  return {
    difficulty: src.difficulty ?? '',
    hoursAdj: src.hoursAdj ?? '',
    wallType: src.wallType ?? 'CMU',
    distanceLF: src.distanceLF ?? '',
    cmuWalls,
    cmuFootingPump: src.cmuFootingPump ?? 'No',
    cmuGroutPump: src.cmuGroutPump ?? 'No',
    pipWalls: initPipWalls(src),
    modularWalls: initModularWalls(src),
    modularFootingPump: src.modularFootingPump ?? 'No',
    brickWalls: initBrickWalls(src),
    brickFootingPump: src.brickFootingPump ?? 'No',
    timberLF: src.timberLF ?? '',
    timberHeightIn: src.timberHeightIn ?? '',
    timberType: src.timberType ?? 'Railroad Treated',
    timberPosts: src.timberPosts ?? '',
    timberSubEach: src.timberSubEach ?? '',
    wallFinishRows: initWallFinishRows(src),
    capRows: src.capRows ? src.capRows.map(r => ({ vendor: 'House', subEach: '', ...r })) : DEFAULT_CAP_ROWS.map(r => ({ ...r })),
    manualRows: src.manualRows ?? DEFAULT_MANUAL_ROWS.map(r => ({ ...r })),
  }
}

// ── Per-wall Waterproofing sub-section ────────────────────────────────────────
// Renders inside every wall entry (CMU / PIP / Modular). Edits the wall's own
// wpRows via the supplied handlers. "None" rows contribute nothing.
function WallWaterproofing({
  wpRows,
  vendorOptions,
  materialPrices,
  materialRows,
  isSub,
  refreshAllRates,
  onWpUpdate,
  onWpAdd,
  onWpRemove,
}) {
  const rows = Array.isArray(wpRows) && wpRows.length ? wpRows : [blankWpRow()]
  const rr = key => materialPrices?.[WALL_RATES[key].db] ?? WALL_RATES[key].fb
  return (
    <div className="mt-3 border-t border-gray-100 pt-2">
      <label className="block text-xs text-gray-500 mb-1 font-medium">Waterproofing</label>
      <div className="space-y-2">
        {rows.map((row, i) => {
          const wpKey = WP_KEY[row.type]
          const wpc = computeWpRow(row, materialPrices, materialRows)
          return (
            <div key={i} className="flex items-center gap-2 flex-wrap">
              <select
                className="input text-sm py-1.5 w-40"
                value={row.vendor || 'House'}
                onChange={e => onWpUpdate(i, 'vendor', e.target.value)}
              >
                {vendorOptions.map(o => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              <select
                className="input text-sm py-1.5 flex-1 min-w-[10rem]"
                value={row.type}
                onChange={e => onWpUpdate(i, 'type', e.target.value)}
              >
                <option>None</option>
                <option>Primer &amp; Membrane</option>
                <option>3 Coats Roll On</option>
                <option>Thoroseal &amp; Roll On</option>
                <option>Dimple Membrane</option>
              </select>
              {row.type !== 'None' && (
                <NumInput
                  value={row.sf}
                  onChange={v => onWpUpdate(i, 'sf', v)}
                  placeholder="0"
                  className="w-28"
                />
              )}
              {row.type !== 'None' && <span className="text-xs text-gray-400 shrink-0">SF</span>}
              {row.type !== 'None' && wpKey && (
                <span className="inline-flex items-center gap-1 text-xs text-gray-400">
                  ${wallMatPrice(WALL_RATES[wpKey].db, row.vendor, materialRows, materialPrices, WALL_RATES[wpKey].fb).toFixed(2)}/SF
                  <RateEditPopover
                    table="material_rates"
                    name={WALL_RATES[wpKey].db}
                    category="Walls"
                    unitLabel="SF"
                    currentValue={rr(wpKey)}
                    onSaved={refreshAllRates}
                  />
                </span>
              )}
              {isSub && row.type !== 'None' && (
                <div className="relative w-24">
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">
                    $
                  </span>
                  <input
                    type="number"
                    step="any"
                    className="input text-sm py-1.5 pl-5 w-full"
                    placeholder={r2(wpc.subUnit).toString()}
                    value={row.subEach ?? ''}
                    onChange={e => onWpUpdate(i, 'subEach', e.target.value)}
                  />
                </div>
              )}
              {rows.length > 1 && (
                <button
                  type="button"
                  onClick={() => onWpRemove(i)}
                  className="text-xs text-red-400 hover:text-red-600 px-2 py-0.5 rounded border border-red-100 hover:border-red-300"
                >
                  Remove
                </button>
              )}
            </div>
          )
        })}
        <button
          type="button"
          onClick={onWpAdd}
          className="w-full py-1.5 rounded-lg border border-dashed border-green-400 text-green-700 text-xs font-medium hover:bg-green-50 transition-colors"
        >
          + Add another waterproofing line
        </button>
      </div>
    </div>
  )
}

// ── CMU Wall Entry ────────────────────────────────────────────────────────────
function CmuWallEntry({
  wall,
  idx,
  total,
  onChange,
  onRemove,
  detail,
  materialPrices,
  materialRows,
  vendorOptions,
  isSub,
  refreshAllRates,
  onWpUpdate,
  onWpAdd,
  onWpRemove,
}) {
  const set = field => val => onChange(idx, field, val)
  const hasData = n(wall.lf) > 0 && n(wall.heightIn) > 0
  return (
    <div className="border border-gray-200 rounded-xl p-3 mb-3 bg-white">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
          Wall {idx + 1}
        </span>
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
        {/* Vendor — the ONLY thing that changes where the material $ comes
            from. "House" = the original master-rate / catalog pricing. */}
        <div className="col-span-2">
          <label className="block text-xs text-gray-500 mb-1">Vendor</label>
          <select
            className="input text-sm py-1.5 w-full"
            value={wall.vendor || 'House'}
            onChange={e => set('vendor')(e.target.value)}
          >
            {(vendorOptions || [{ value: 'House', label: 'Standard' }]).map(o => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        {/* Block Type — drives dimensions (W/H/L) AND the per-block price.
            Mirrors cell E8 of the legacy Estimator Master's Walls sheet. */}
        <div className="col-span-2">
          <label className="block text-xs text-gray-500 mb-1">Block Type</label>
          <select
            className="input text-sm py-1.5 w-full"
            value={wall.blockType || ''}
            onChange={e => set('blockType')(e.target.value)}
          >
            {CMU_BLOCK_TYPES.map(b => (
              <option key={b.name} value={b.name}>
                {b.name} — {b.w}×{b.h}×{b.l}
              </option>
            ))}
          </select>
          {/* Resolved block price + Edit Rates icon. Reflects the selected
              vendor (House falls back to the master_rates override, then the
              catalog default). The Edit Rates popover edits the House rate. */}
          {(() => {
            const b = blockByName(wall.blockType)
            const price = wallMatPrice(
              wallBlockRateName(b.name),
              wall.vendor,
              materialRows,
              materialPrices,
              b.price
            )
            const housePrice = materialPrices?.[wallBlockRateName(b.name)] ?? b.price
            return (
              <div className="mt-1 flex items-center gap-1 text-[11px] text-gray-500">
                <span>
                  Price: <strong className="text-gray-800">${price.toFixed(2)}</strong>/ea
                </span>
                <RateEditPopover
                  table="material_rates"
                  name={wallBlockRateName(b.name)}
                  category="Walls"
                  unitLabel="ea"
                  currentValue={housePrice}
                  onSaved={refreshAllRates}
                />
              </div>
            )
          })()}
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Linear Feet</label>
          <NumInput value={wall.lf} onChange={set('lf')} placeholder="0" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Wall Height (in)</label>
          <NumInput value={wall.heightIn} onChange={set('heightIn')} placeholder="48" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Footing Width (in)</label>
          <NumInput value={wall.footingWIn} onChange={set('footingWIn')} placeholder="12" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Footing Depth (in)</label>
          <NumInput value={wall.footingDIn} onChange={set('footingDIn')} placeholder="12" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Rebar Spacing (in)</label>
          <NumInput value={wall.rebarSpIn} onChange={set('rebarSpIn')} placeholder="16" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Horiz. Bars in Footing</label>
          <NumInput value={wall.horizBars} onChange={set('horizBars')} placeholder="2" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Bond Beam Courses</label>
          <NumInput value={wall.bondBeams} onChange={set('bondBeams')} placeholder="1" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">% Grouted Solid</label>
          <div className="relative">
            <NumInput value={wall.pctGrouted} onChange={set('pctGrouted')} placeholder="100" />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
              %
            </span>
          </div>
        </div>
        <div className="col-span-2 sm:col-span-1">
          <label className="block text-xs text-gray-500 mb-1">% of Wall Curved</label>
          <div className="relative">
            <NumInput value={wall.pctCurved} onChange={set('pctCurved')} placeholder="0" />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
              %
            </span>
          </div>
        </div>
      </div>
      {hasData && detail && (
        <div className="mt-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-1.5 text-xs text-gray-600 flex flex-wrap gap-3">
          <span>
            Grey: <strong>{detail.orderGreyBlock}</strong>
          </span>
          <span>
            BB: <strong>{detail.orderBBBlock}</strong>
          </span>
          <span>
            Footing: <strong>{detail.footingCY.toFixed(3)} CY</strong>
          </span>
          <span>
            Grout: <strong>{detail.groutCY.toFixed(3)} CY</strong>
          </span>
          <span>
            Rebar: <strong>{Math.round(detail.totalRebarLF)} LF</strong>
          </span>
          {detail.curveAdd > 0 && (
            <span>
              Curve: <strong>+{detail.curveAdd.toFixed(2)} hrs</strong>
            </span>
          )}
        </div>
      )}
      {isSub && (
        <div className="mt-2 flex items-center gap-2 flex-wrap">
          <span className="text-xs text-gray-500">Sub flat $/LF</span>
          <div className="relative w-28">
            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">$</span>
            <input
              type="number"
              step="any"
              className="input text-sm py-1.5 pl-5 w-full"
              placeholder={detail ? (detail.subUnit || 0).toFixed(2) : '0.00'}
              value={wall.subEach ?? ''}
              onChange={e => set('subEach')(e.target.value)}
            />
          </div>
          <span className="text-[11px] text-gray-400">
            default = material ÷ LF · no labor billed on Sub
          </span>
        </div>
      )}
      <WallWaterproofing
        wpRows={wall.wpRows}
        vendorOptions={vendorOptions}
        materialPrices={materialPrices}
        materialRows={materialRows}
        isSub={isSub}
        refreshAllRates={refreshAllRates}
        onWpUpdate={onWpUpdate}
        onWpAdd={onWpAdd}
        onWpRemove={onWpRemove}
      />
    </div>
  )
}

// ── PIP Wall Entry ────────────────────────────────────────────────────────────
function PipWallEntry({
  wall,
  idx,
  total,
  onChange,
  onRemove,
  detail,
  vendorOptions,
  isSub,
  materialPrices,
  materialRows,
  refreshAllRates,
  onWpUpdate,
  onWpAdd,
  onWpRemove,
}) {
  const set = field => val => onChange(idx, field, val)
  const hasData = n(wall.lf) > 0 && n(wall.heightIn) > 0
  return (
    <div className="border border-gray-200 rounded-xl p-3 mb-3 bg-white">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
          Wall {idx + 1}
        </span>
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
            value={wall.vendor || 'House'}
            onChange={e => set('vendor')(e.target.value)}
          >
            {(vendorOptions || [{ value: 'House', label: 'Standard' }]).map(o => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Linear Feet</label>
          <NumInput value={wall.lf} onChange={set('lf')} placeholder="0" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Wall Height (in)</label>
          <NumInput value={wall.heightIn} onChange={set('heightIn')} placeholder="48" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Footing Width (in)</label>
          <NumInput value={wall.footingWIn} onChange={set('footingWIn')} placeholder="12" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Footing Depth (in)</label>
          <NumInput value={wall.footingDIn} onChange={set('footingDIn')} placeholder="12" />
        </div>
        <div className="col-span-2 sm:col-span-1">
          <label className="block text-xs text-gray-500 mb-1">Horiz. Bars in Footing</label>
          <NumInput value={wall.horizBars} onChange={set('horizBars')} placeholder="2" />
        </div>
      </div>
      {hasData && detail && (
        <div className="mt-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-1.5 text-xs text-gray-600 flex flex-wrap gap-4">
          <span>
            Concrete: <strong>{detail.concCY.toFixed(2)} CY</strong>
          </span>
          {detail.footingCY > 0 && (
            <span>
              Footing: <strong>{detail.footingCY.toFixed(3)} CY</strong>
            </span>
          )}
          {detail.horizRebarLF > 0 && (
            <span>
              Footing rebar: <strong>{Math.round(detail.horizRebarLF)} LF</strong>
            </span>
          )}
          <span>
            Labor: <strong>{detail.hrs.toFixed(2)} hrs</strong>
          </span>
        </div>
      )}
      {isSub && (
        <div className="mt-2 flex items-center gap-2 flex-wrap">
          <span className="text-xs text-gray-500">Sub flat $/LF</span>
          <div className="relative w-28">
            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">$</span>
            <input
              type="number"
              step="any"
              className="input text-sm py-1.5 pl-5 w-full"
              placeholder={detail ? (detail.subUnit || 0).toFixed(2) : '0.00'}
              value={wall.subEach ?? ''}
              onChange={e => set('subEach')(e.target.value)}
            />
          </div>
          <span className="text-[11px] text-gray-400">
            default = material ÷ LF · no labor billed on Sub
          </span>
        </div>
      )}
      <WallWaterproofing
        wpRows={wall.wpRows}
        vendorOptions={vendorOptions}
        materialPrices={materialPrices}
        materialRows={materialRows}
        isSub={isSub}
        refreshAllRates={refreshAllRates}
        onWpUpdate={onWpUpdate}
        onWpAdd={onWpAdd}
        onWpRemove={onWpRemove}
      />
    </div>
  )
}

// ── Modular Wall Entry ────────────────────────────────────────────────────────
// Same fields as a CMU wall MINUS rebar spacing, horiz bars, bond-beam courses
// and % grouted solid. Titled "Wall Installation N".
function ModularWallEntry({
  wall,
  idx,
  total,
  onChange,
  onRemove,
  detail,
  materialPrices,
  materialRows,
  vendorOptions,
  isSub,
  refreshAllRates,
  onWpUpdate,
  onWpAdd,
  onWpRemove,
  // Modular tab passes { label:'Wall Type', subcat:'Modular Wall', master:true }
  // to source options from the master list. Brick omits it → legacy CMU catalog.
  typeSource = { label: 'Block Type', master: false },
}) {
  const set = field => val => onChange(idx, field, val)
  return (
    <div className="border border-gray-200 rounded-xl p-3 mb-3 bg-white">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
          Wall Installation {idx + 1}
        </span>
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
            value={wall.vendor || 'House'}
            onChange={e => set('vendor')(e.target.value)}
          >
            {(vendorOptions || [{ value: 'House', label: 'Standard' }]).map(o => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div className="col-span-2">
          <label className="block text-xs text-gray-500 mb-1">{typeSource.label}</label>
          {typeSource.master
            ? (() => {
                // Options + price come live from the master list (marker =
                // sub_category). Add a product in Master Rates and it appears here.
                // Every Modular Wall product (any vendor) is selectable here.
                const opts = (materialRows || [])
                  .filter(r => r.sub_category === typeSource.subcat)
                  .map(r => ({ id: r.id, label: r.name, row: r }))
                const selRow =
                  (materialRows || []).find(r => r.id === wall.blockType) || opts[0]?.row
                const price = n(selRow?.unit_cost)
                return (
                  <>
                    <select
                      className="input text-sm py-1.5 w-full"
                      value={selRow?.id ?? ''}
                      onChange={e => set('blockType')(e.target.value)}
                    >
                      {opts.length === 0 && (
                        <option value="">No products — add one in Master Rates</option>
                      )}
                      {opts.map(o => (
                        <option key={o.id} value={o.id}>
                          {o.label}
                          {n(o.row?.calc_meta?.block_w_in) || n(o.row?.block_w_in)
                            ? ` — ${n(o.row.calc_meta?.block_w_in) || n(o.row.block_w_in)}×${n(o.row.calc_meta?.block_h_in) || n(o.row.block_h_in)}×${n(o.row.calc_meta?.block_l_in) || n(o.row.block_l_in)}`
                            : ''}
                        </option>
                      ))}
                    </select>
                    {selRow && (
                      <div className="mt-1 flex items-center gap-1 text-[11px] text-gray-500">
                        <span>
                          Price: <strong className="text-gray-800">${price.toFixed(2)}</strong>/ea
                        </span>
                        <RateEditPopover
                          table="material_rates"
                          name={selRow.name}
                          category="Walls"
                          unitLabel="ea"
                          currentValue={price}
                          onSaved={refreshAllRates}
                        />
                      </div>
                    )}
                  </>
                )
              })()
            : (() => {
                const b = blockByName(wall.blockType)
                const price = wallMatPrice(
                  wallBlockRateName(b.name),
                  wall.vendor,
                  materialRows,
                  materialPrices,
                  b.price
                )
                const housePrice = materialPrices?.[wallBlockRateName(b.name)] ?? b.price
                return (
                  <>
                    <select
                      className="input text-sm py-1.5 w-full"
                      value={wall.blockType || ''}
                      onChange={e => set('blockType')(e.target.value)}
                    >
                      {CMU_BLOCK_TYPES.map(bt => (
                        <option key={bt.name} value={bt.name}>
                          {bt.name} — {bt.w}×{bt.h}×{bt.l}
                        </option>
                      ))}
                    </select>
                    <div className="mt-1 flex items-center gap-1 text-[11px] text-gray-500">
                      <span>
                        Price: <strong className="text-gray-800">${price.toFixed(2)}</strong>/ea
                      </span>
                      <RateEditPopover
                        table="material_rates"
                        name={wallBlockRateName(b.name)}
                        category="Walls"
                        unitLabel="ea"
                        currentValue={housePrice}
                        onSaved={refreshAllRates}
                      />
                    </div>
                  </>
                )
              })()}
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Linear Feet</label>
          <NumInput value={wall.lf} onChange={set('lf')} placeholder="0" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Wall Height (in)</label>
          <NumInput value={wall.heightIn} onChange={set('heightIn')} placeholder="48" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Footing Width (in)</label>
          <NumInput value={wall.footingWIn} onChange={set('footingWIn')} placeholder="12" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Footing Depth (in)</label>
          <NumInput value={wall.footingDIn} onChange={set('footingDIn')} placeholder="12" />
        </div>
        <div className="col-span-2 sm:col-span-1">
          <label className="block text-xs text-gray-500 mb-1">% of Wall Curved</label>
          <div className="relative">
            <NumInput value={wall.pctCurved} onChange={set('pctCurved')} placeholder="0" />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">%</span>
          </div>
        </div>
      </div>
      {detail && (n(wall.lf) > 0 && n(wall.heightIn) > 0) && (
        <div className="mt-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-1.5 text-xs text-gray-600 flex flex-wrap gap-3">
          <span>
            Block: <strong>{detail.orderGreyBlock}</strong>
          </span>
          <span>
            Footing: <strong>{detail.footingCY.toFixed(3)} CY</strong>
          </span>
          {detail.curveAdd > 0 && (
            <span>
              Curve: <strong>+{detail.curveAdd.toFixed(2)} hrs</strong>
            </span>
          )}
        </div>
      )}
      {isSub && (
        <div className="mt-2 flex items-center gap-2 flex-wrap">
          <span className="text-xs text-gray-500">Sub flat $/LF</span>
          <div className="relative w-28">
            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">$</span>
            <input
              type="number"
              step="any"
              className="input text-sm py-1.5 pl-5 w-full"
              placeholder={detail ? (detail.subUnit || 0).toFixed(2) : '0.00'}
              value={wall.subEach ?? ''}
              onChange={e => set('subEach')(e.target.value)}
            />
          </div>
          <span className="text-[11px] text-gray-400">
            default = material ÷ LF · no labor billed on Sub
          </span>
        </div>
      )}
      <WallWaterproofing
        wpRows={wall.wpRows}
        vendorOptions={vendorOptions}
        materialPrices={materialPrices}
        materialRows={materialRows}
        isSub={isSub}
        refreshAllRates={refreshAllRates}
        onWpUpdate={onWpUpdate}
        onWpAdd={onWpAdd}
        onWpRemove={onWpRemove}
      />
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────
export default function WallsModule({ onSave, onBack, saving, initialData }) {
  const [laborRatePerHour, setLaborRatePerHour] = useState(
    initialData?.laborRatePerHour ?? DEFAULTS.laborRatePerHour
  )
  const [laborBurdenPct, setLaborBurdenPct] = useState(
    initialData?.laborBurdenPct ?? DEFAULTS.laborBurdenPct
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
  // Shared material catalog — Walls + Basic Materials rates, rows, vendors, and
  // the canonical resolver. (Replaces the old per-module fetch + wallMatPrice.)
  const {
    priceMap: materialPrices,
    materialRows,
    vendors,
    vendorNames,
    loading: pricesLoading,
    refresh: refreshAllRates,
    vendorOptionsForCategory,
  } = useNewMaterialCatalog([WALLS_CATEGORY, BASIC_CATEGORY], {
    materialPrices: initialData?.materialPrices,
    materialRows: initialData?.materialRows,
  })

  useEffect(() => {
    if (!initialData?.laborRatePerHour) {
      supabase
        .from('company_settings')
        .select('labor_rate_per_hour, labor_burden_pct, walk_access_pace_lf_per_min')
        .maybeSingle()
        .then(({ data }) => {
          if (!data) return
          if (data.labor_rate_per_hour != null)
            setLaborRatePerHour(parseFloat(data.labor_rate_per_hour) || DEFAULTS.laborRatePerHour)
          if (data.labor_burden_pct != null) setLaborBurdenPct(parseFloat(data.labor_burden_pct))
          if (data.walk_access_pace_lf_per_min != null) {
            const _wpace = parseFloat(data.walk_access_pace_lf_per_min)
            setWalkAccess({
              paceLfPerMin:
                Number.isFinite(_wpace) && _wpace > 0
                  ? _wpace
                  : DEFAULT_WALK_ACCESS_PACE_LF_PER_MIN,
            })
          }
        })
    }
  }, [initialData?.laborRatePerHour])

  const gpmd = initialData?.gpmd ?? DEFAULTS.gpmd
  const subGpMarkupRate = initialData?.subGpMarkupRate ?? 0.2

  // ── Shared (not per-tab) selections ─────────────────────────────────────────
  const [crewType, setCrewType] = useState(initialData?.crewType ?? 'Masonry')
  const [subType, setSubType] = useState(initialData?.subType ?? 'In-House')

  // Independent In-House vs Sub input records — each tab is its own calculator.
  const [ihTab, setIhTab] = useState(() => makeTab(initialData?.ihData || initialData))
  const [subTab, setSubTab] = useState(() => makeTab(initialData?.subData || {}))
  const isSub = subType === 'Subcontractor'
  const cur = isSub ? subTab : ihTab
  const setCur = isSub ? setSubTab : setIhTab
  // A single setter factory: accepts a value (scalar fields) or an updater fn (row arrays).
  const setField = k => v => setCur(p => ({ ...p, [k]: typeof v === 'function' ? v(p[k]) : v }))

  // Derived active-tab field accessors — render bindings below stay unchanged.
  const difficulty = cur.difficulty
  const setDifficulty = setField('difficulty')
  const hoursAdj = cur.hoursAdj
  const setHoursAdj = setField('hoursAdj')
  const wallType = cur.wallType
  const setWallType = setField('wallType')
  const distanceLF = cur.distanceLF
  const setDistanceLF = setField('distanceLF')
  const cmuWalls = cur.cmuWalls
  const setCmuWalls = setField('cmuWalls')
  const cmuFootingPump = cur.cmuFootingPump
  const setCmuFootingPump = setField('cmuFootingPump')
  const cmuGroutPump = cur.cmuGroutPump
  const setCmuGroutPump = setField('cmuGroutPump')
  const pipWalls = cur.pipWalls
  const setPipWalls = setField('pipWalls')
  const modularWalls = cur.modularWalls
  const setModularWalls = setField('modularWalls')
  const modularFootingPump = cur.modularFootingPump
  const setModularFootingPump = setField('modularFootingPump')
  const brickWalls = cur.brickWalls
  const setBrickWalls = setField('brickWalls')
  const brickFootingPump = cur.brickFootingPump
  const setBrickFootingPump = setField('brickFootingPump')
  const timberLF = cur.timberLF
  const setTimberLF = setField('timberLF')
  const timberHeightIn = cur.timberHeightIn
  const setTimberHeightIn = setField('timberHeightIn')
  const timberType = cur.timberType
  const setTimberType = setField('timberType')
  const timberPosts = cur.timberPosts
  const setTimberPosts = setField('timberPosts')
  const timberSubEach = cur.timberSubEach
  const setTimberSubEach = setField('timberSubEach')
  const wallFinishRows = cur.wallFinishRows
  const setWallFinishRows = setField('wallFinishRows')
  const capRows = cur.capRows
  const setCapRows = setField('capRows')
  const manualRows = cur.manualRows
  const setManualRows = setField('manualRows')

  // Per-wall waterproofing helpers. Given a wall-array setter and a wall index,
  // they mutate that wall's own wpRows without touching sibling walls.
  const makeWpHandlers = (setWalls, wallIdx) => ({
    onWpUpdate: (wpIdx, field, val) =>
      setWalls(ws =>
        ws.map((w, i) =>
          i === wallIdx
            ? {
                ...w,
                wpRows: (w.wpRows || [blankWpRow()]).map((r, j) =>
                  j === wpIdx ? { ...r, [field]: val } : r
                ),
              }
            : w
        )
      ),
    onWpAdd: () =>
      setWalls(ws =>
        ws.map((w, i) =>
          i === wallIdx ? { ...w, wpRows: [...(w.wpRows || []), blankWpRow()] } : w
        )
      ),
    onWpRemove: wpIdx =>
      setWalls(ws =>
        ws.map((w, i) =>
          i === wallIdx
            ? {
                ...w,
                wpRows:
                  (w.wpRows || []).length > 1
                    ? w.wpRows.filter((_, j) => j !== wpIdx)
                    : w.wpRows,
              }
            : w
        )
      ),
  })

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

  // ── Array helpers ─────────────────────────────────────────────────────────
  function updateCmuWall(idx, field, val) {
    setCmuWalls(ws => ws.map((w, i) => (i === idx ? { ...w, [field]: val } : w)))
  }
  function addCmuWall() {
    setCmuWalls(ws => [...ws, DEFAULT_CMU()])
  }
  function removeCmuWall(idx) {
    setCmuWalls(ws => ws.filter((_, i) => i !== idx))
  }

  function updatePipWall(idx, field, val) {
    setPipWalls(ws => ws.map((w, i) => (i === idx ? { ...w, [field]: val } : w)))
  }
  function addPipWall() {
    setPipWalls(ws => [...ws, DEFAULT_PIP()])
  }
  function removePipWall(idx) {
    setPipWalls(ws => ws.filter((_, i) => i !== idx))
  }

  function updateModularWall(idx, field, val) {
    setModularWalls(ws => ws.map((w, i) => (i === idx ? { ...w, [field]: val } : w)))
  }
  function addModularWall() {
    setModularWalls(ws => [...ws, DEFAULT_MODULAR()])
  }
  function removeModularWall(idx) {
    setModularWalls(ws => ws.filter((_, i) => i !== idx))
  }

  function updateBrickWall(idx, field, val) {
    setBrickWalls(ws => ws.map((w, i) => (i === idx ? { ...w, [field]: val } : w)))
  }
  function addBrickWall() {
    setBrickWalls(ws => [...ws, DEFAULT_BRICK()])
  }
  function removeBrickWall(idx) {
    setBrickWalls(ws => ws.filter((_, i) => i !== idx))
  }

  function updateManual(i, field, val) {
    setManualRows(rows => rows.map((row, idx) => (idx === i ? { ...row, [field]: val } : row)))
  }

  // Generic row add / remove / patch (mirrors the Finishes conversion). On the
  // Sub tab, when inputs that drive the flat default change we refresh subEach.
  const addRow = (setRows, blank) => setRows(rows => [...rows, blank()])
  const removeRow = (setRows, i) =>
    setRows(rows => (rows.length > 1 ? rows.filter((_, idx) => idx !== i) : rows))
  function patchRow(setRows, i, patch, compute, recompute) {
    setRows(rows =>
      rows.map((row, idx) => {
        if (idx !== i) return row
        const next = { ...row, ...patch }
        if (recompute && isSub)
          next.subEach = String(r2(compute(next, materialPrices, materialRows).subUnit))
        return next
      })
    )
  }

  const r = key => materialPrices[WALL_RATES[key].db] ?? WALL_RATES[key].fb

  // ── Vendor helpers ──────────────────────────────────────────────────────────
  const vendorOptions = vendorOptionsForCategory(WALLS_CATEGORY)

  // The calc runs against the ACTIVE tab only — entering data on one tab never
  // affects the other. Shared selections (crew/sub type) are merged on top.
  const state = { crewType, subType, subGpMarkupRate, ...cur }
  const calcRaw = calcWalls(
    state,
    laborRatePerHour,
    materialPrices,
    gpmd,
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
        laborRatePerHour,
        laborBurdenPct,
        gpmd,
        materialPrices,
        materialRows,
        vendorNames,
        walkAccess,
        calc,
      },
    })
  }

  const fmt2 = v =>
    `$${n(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  const p = db => materialPrices[db] ?? undefined

  // ── Wall Finishes — Vendor + Item add/remove ROW table. The Item drives the
  //    formula (unchanged); the Vendor + $/unit override drive only the
  //    material price. Sub tab shows a flat $/unit that routes into subCost. ──
  function renderWallFinishSection() {
    const rows = wallFinishRows
    const setRows = setWallFinishRows
    return (
      <div>
        <SectionHeader title="Wall Finishes" />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 border-b border-gray-200">
                <th className="text-left pb-1 pr-2 font-medium w-40">Vendor</th>
                <th className="text-left pb-1 pr-2 font-medium w-36">Item</th>
                <th className="text-left pb-1 pr-2 font-medium w-24">SF</th>
                <th className="text-left pb-1 pr-2 font-medium">Rate</th>
                <th className="text-right pb-1 pr-2 font-medium text-gray-400 w-24">
                  {isSub ? 'Flat $/unit' : 'Labor hrs'}
                </th>
                <th className="text-right pb-1 pr-2 font-medium text-gray-400 w-24">Material $</th>
                <th className="w-6" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => {
                const c = computeWallFinishRow(row, materialPrices, materialRows)
                const meta = WALL_FINISH_META[row.type] || {}
                return (
                  <tr key={i} className="border-b border-gray-100">
                    <td className="py-1.5 pr-2">
                      <select
                        className="input text-sm py-1 w-full"
                        value={row.vendor || 'House'}
                        onChange={e =>
                          patchRow(setRows, i, { vendor: e.target.value }, computeWallFinishRow, true)
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
                        value={row.type}
                        onChange={e =>
                          patchRow(setRows, i, { type: e.target.value }, computeWallFinishRow, true)
                        }
                      >
                        {WALL_FINISH_TYPES.map(t => (
                          <option key={t}>{t}</option>
                        ))}
                      </select>
                    </td>
                    <td className="py-1.5 pr-2">
                      <NumInput
                        value={row.sf}
                        onChange={v => patchRow(setRows, i, { sf: v }, computeWallFinishRow, false)}
                        className="w-24"
                      />
                    </td>
                    <td className="py-1.5 pr-2">
                      {/* Per-estimate $/unit override (empty → vendor/House
                          price). Plus Edit-Rates popovers for House master. */}
                      <div className="flex items-center gap-1">
                        <div className="relative w-24">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">
                            $
                          </span>
                          <input
                            type="number"
                            step="any"
                            className="input text-sm py-1.5 pl-5 w-full"
                            placeholder={meta.matKey ? r(meta.matKey).toFixed(2) : '0'}
                            value={row.rateIn ?? ''}
                            onChange={e =>
                              patchRow(setRows, i, { rateIn: e.target.value }, computeWallFinishRow, true)
                            }
                          />
                        </div>
                        {meta.matKey && (
                          <RateEditPopover
                            table="material_rates"
                            name={WALL_RATES[meta.matKey].db}
                            category="Walls"
                            unitLabel={meta.matUnit}
                            currentValue={p(WALL_RATES[meta.matKey].db) ?? WALL_RATES[meta.matKey].fb}
                            onSaved={refreshAllRates}
                          />
                        )}
                        {meta.labKey && (
                          <RateEditPopover
                            table="labor_rates"
                            name={WALL_RATES[meta.labKey].db}
                            category="Walls"
                            mode="coefficient"
                            unitLabel={meta.labUnit || 'rate'}
                            currentValue={p(WALL_RATES[meta.labKey].db) ?? WALL_RATES[meta.labKey].fb}
                            onSaved={refreshAllRates}
                          />
                        )}
                      </div>
                    </td>
                    <td className="py-1.5 text-right text-xs pr-2">
                      {isSub ? (
                        <input
                          type="number"
                          step="any"
                          className="input text-sm py-1 w-24 text-right"
                          placeholder={r2(c.subUnit).toString()}
                          value={row.subEach ?? ''}
                          onChange={e =>
                            patchRow(setRows, i, { subEach: e.target.value }, computeWallFinishRow, false)
                          }
                        />
                      ) : (
                        <span className="text-gray-400">{c.hrs > 0 ? c.hrs.toFixed(2) : '—'}</span>
                      )}
                    </td>
                    <td className="py-1.5 text-right text-xs text-gray-600">
                      {(isSub ? c.subMat : c.mat) > 0 ? (
                        <div className="text-right">
                          <div>{fmt2(isSub ? c.subMat : c.mat)}</div>
                          {!isSub && c.tons > 0 && (
                            <div className="text-gray-400">{c.tons.toFixed(2)} tons</div>
                          )}
                        </div>
                      ) : (
                        '—'
                      )}
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
          <button
            type="button"
            onClick={() => addRow(setRows, blankWallFinishRow)}
            className="mt-2 text-xs px-2 py-1 rounded bg-slate-100 text-slate-700 hover:bg-slate-200"
          >
            + Add row
          </button>
        </div>
      </div>
    )
  }

  // ── Wall Caps — Vendor + Item add/remove ROW table. ─────────────────────────
  function renderCapSection() {
    return (
      <div>
        <SectionHeader title="Wall Caps" />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 border-b border-gray-200">
                <th className="text-left pb-1 pr-2 font-medium w-40">Vendor</th>
                <th className="text-left pb-1 pr-2 font-medium w-36">Item</th>
                <th className="text-left pb-1 pr-2 font-medium w-20">Width (in)</th>
                <th className="text-left pb-1 pr-2 font-medium w-24">LF / Qty</th>
                <th className="text-left pb-1 pr-2 font-medium">Rate</th>
                <th className="text-right pb-1 pr-2 font-medium text-gray-400 w-24">
                  {isSub ? 'Flat $/unit' : 'Labor hrs'}
                </th>
                <th className="text-right pb-1 pr-2 font-medium text-gray-400 w-24">Material $</th>
                <th className="w-6" />
              </tr>
            </thead>
            <tbody>
              {capRows.map((row, i) => {
                const c = computeCapRow(row, materialPrices, materialRows)
                const capMatKey = {
                  Flagstone: 'capFlagstone',
                  Precast: 'capPrecast',
                  'PIP Concrete': 'concreteTruck',
                  'Bullnose Brick': 'capBullnose',
                }[row.type]
                const capUnit = {
                  Flagstone: 'ton',
                  Precast: 'ea',
                  'PIP Concrete': 'CY',
                  'Bullnose Brick': 'LF',
                }[row.type]
                const isActive = row.type !== 'None'
                return (
                  <tr key={i} className="border-b border-gray-100">
                    <td className="py-1.5 pr-2">
                      <select
                        className="input text-sm py-1 w-full"
                        value={row.vendor || 'House'}
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
                        value={row.type}
                        onChange={e =>
                          patchRow(setCapRows, i, { type: e.target.value }, computeCapRow, true)
                        }
                      >
                        {CAP_TYPES.map(t => (
                          <option key={t}>{t}</option>
                        ))}
                      </select>
                    </td>
                    <td className="py-1.5 pr-2">
                      {isActive && row.type !== 'Precast' && (
                        <NumInput
                          value={row.widthIn}
                          onChange={v => patchRow(setCapRows, i, { widthIn: v }, computeCapRow, true)}
                          className="w-20"
                          placeholder="4"
                        />
                      )}
                      {isActive && row.type === 'Precast' && (
                        <NumInput
                          value={row.widthIn}
                          onChange={v => patchRow(setCapRows, i, { widthIn: v }, computeCapRow, true)}
                          className="w-20"
                          placeholder="8"
                        />
                      )}
                    </td>
                    <td className="py-1.5 pr-2">
                      {isActive && (
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
                          className="w-20"
                          placeholder="0"
                        />
                      )}
                    </td>
                    <td className="py-1.5 pr-2">
                      {isActive && capMatKey ? (
                        <span className="inline-flex items-center gap-1 text-xs text-gray-400">
                          ${wallMatPrice(WALL_RATES[capMatKey].db, row.vendor, materialRows, materialPrices, WALL_RATES[capMatKey].fb).toFixed(2)}/{capUnit}
                          <RateEditPopover
                            table="material_rates"
                            name={WALL_RATES[capMatKey].db}
                            category="Walls"
                            unitLabel={capUnit}
                            currentValue={p(WALL_RATES[capMatKey].db) ?? WALL_RATES[capMatKey].fb}
                            onSaved={refreshAllRates}
                          />
                        </span>
                      ) : (
                        <span className="text-xs text-gray-300">—</span>
                      )}
                    </td>
                    <td className="py-1.5 text-right text-xs pr-2">
                      {!isActive ? (
                        <span className="text-gray-300">—</span>
                      ) : isSub ? (
                        <input
                          type="number"
                          step="any"
                          className="input text-sm py-1 w-24 text-right"
                          placeholder={r2(c.subUnit).toString()}
                          value={row.subEach ?? ''}
                          onChange={e =>
                            patchRow(setCapRows, i, { subEach: e.target.value }, computeCapRow, false)
                          }
                        />
                      ) : (
                        <span className="text-gray-400">{c.hrs > 0 ? c.hrs.toFixed(2) : '—'}</span>
                      )}
                    </td>
                    <td className="py-1.5 text-right text-xs text-gray-600">
                      {(isSub ? c.subMat : c.mat) > 0 ? fmt2(isSub ? c.subMat : c.mat) : '—'}
                    </td>
                    <td className="py-1.5 text-right">
                      <button
                        type="button"
                        onClick={() => removeRow(setCapRows, i)}
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
          <button
            type="button"
            onClick={() => addRow(setCapRows, blankCapRow)}
            className="mt-2 text-xs px-2 py-1 rounded bg-slate-100 text-slate-700 hover:bg-slate-200"
          >
            + Add row
          </button>
        </div>
      </div>
    )
  }

  return (
    <SubTabContext.Provider value={isSub}>
    <div className="space-y-5">
      {/* ── Sticky GPMD bar ── */}
      <div className="sticky top-0 z-20 -mx-6 px-6 pt-1 pb-1 bg-gray-900 shadow-lg">
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

      {/* Notes — pinned in its own sticky container just below the
          GPMD bar. Plain white textarea, no card chrome. */}
      <div className="sticky top-[56px] z-10 -mx-6 px-6 pt-2 pb-2 mt-2 bg-transparent">
        <ModuleNotesField value={notes} onChange={setNotes} />
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

      {/* Wall Type */}
      <div>
        <SectionHeader title="Wall Type" />
        <div className="flex gap-2">
          {[
            {
              key: 'CMU',
              label: 'CMU Block',
              count: cmuWalls.filter(w => n(w.lf) > 0 || n(w.heightIn) > 0).length,
            },
            {
              key: 'PIP',
              label: 'Poured In Place',
              count: pipWalls.filter(w => n(w.lf) > 0 || n(w.heightIn) > 0).length,
            },
            {
              key: 'Modular',
              label: 'Modular',
              count: modularWalls.filter(w => n(w.lf) > 0 || n(w.heightIn) > 0).length,
            },
            {
              key: 'Brick',
              label: 'Brick',
              count: brickWalls.filter(w => n(w.lf) > 0 || n(w.heightIn) > 0).length,
            },
            {
              key: 'Timber',
              label: 'Timber / Lumber',
              count: n(timberLF) > 0 || n(timberPosts) > 0 ? 1 : 0,
            },
          ].map(t => (
            <button
              key={t.key}
              onClick={() => setWallType(t.key)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                wallType === t.key
                  ? 'bg-green-700 text-white border-green-700'
                  : 'border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {t.label}
              {t.count > 0 ? ` (${t.count})` : ''}
            </button>
          ))}
        </div>
        {/* Reassurance line — explains the new behavior so users coming
            from the old toggle don't worry about data loss. */}
        <p className="text-[11px] text-gray-500 mt-1">
          Switching tabs only changes what you see — every wall type's entries continue to
          contribute to the totals.
        </p>
      </div>

      {pricesLoading && (
        <div className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2">
          Loading material prices from Master Rates…
        </div>
      )}

      {/* Settings — In-House tab only */}
      {subType !== 'Subcontractor' && (
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

      {/* ── CMU Block Walls ── */}
      {wallType === 'CMU' && (
        <div>
          <SectionHeader title="CMU Block Walls" />

          {/* Inline CMU rate reference — labor + material — all editable */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 mb-2 text-[11px] text-gray-500">
            <p className="font-semibold uppercase tracking-wide text-gray-400 mb-1">
              CMU Rates (click any to edit)
            </p>
            <div className="flex flex-wrap gap-x-3 gap-y-1">
              <span className="inline-flex items-center gap-1">
                Grey block ${r('greyBlock')}/ea
                <RateEditPopover
                  table="material_rates"
                  name={WALL_RATES.greyBlock.db}
                  category="Walls"
                  unitLabel="ea"
                  currentValue={r('greyBlock')}
                  onSaved={refreshAllRates}
                />
              </span>
              <span className="inline-flex items-center gap-1">
                Bondbeam ${r('bondbeamBlock')}/ea
                <RateEditPopover
                  table="material_rates"
                  name={WALL_RATES.bondbeamBlock.db}
                  category="Walls"
                  unitLabel="ea"
                  currentValue={r('bondbeamBlock')}
                  onSaved={refreshAllRates}
                />
              </span>
              <span className="inline-flex items-center gap-1">
                Rebar ${r('rebar')}/LF
                <RateEditPopover
                  table="material_rates"
                  name={WALL_RATES.rebar.db}
                  category="Basic Materials"
                  unitLabel="LF"
                  currentValue={r('rebar')}
                  onSaved={refreshAllRates}
                />
              </span>
              <span className="inline-flex items-center gap-1">
                Conc hand ${r('concreteHand')}/CY
                <RateEditPopover
                  table="material_rates"
                  name={WALL_RATES.concreteHand.db}
                  category="Basic Materials"
                  unitLabel="CY"
                  currentValue={r('concreteHand')}
                  onSaved={refreshAllRates}
                />
              </span>
              <span className="inline-flex items-center gap-1">
                Conc truck ${r('concreteTruck')}/CY
                <RateEditPopover
                  table="material_rates"
                  name={WALL_RATES.concreteTruck.db}
                  category="Basic Materials"
                  unitLabel="CY"
                  currentValue={r('concreteTruck')}
                  onSaved={refreshAllRates}
                />
              </span>
              <span className="inline-flex items-center gap-1">
                Grout pump setup ${r('groutPumpSetup')}
                <RateEditPopover
                  table="material_rates"
                  name={WALL_RATES.groutPumpSetup.db}
                  category="Basic Materials"
                  unitLabel="flat"
                  currentValue={r('groutPumpSetup')}
                  onSaved={refreshAllRates}
                />
              </span>
              <span className="inline-flex items-center gap-1">
                Grout pump ${r('groutPumpPerYd')}/CY
                <RateEditPopover
                  table="material_rates"
                  name={WALL_RATES.groutPumpPerYd.db}
                  category="Basic Materials"
                  unitLabel="CY"
                  currentValue={r('groutPumpPerYd')}
                  onSaved={refreshAllRates}
                />
              </span>
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1">
              <span className="inline-flex items-center gap-1">
                Dig {r('digLab')} CF/hr
                <RateEditPopover
                  table="labor_rates"
                  name={WALL_RATES.digLab.db}
                  category="Walls"
                  mode="coefficient"
                  unitLabel="CF/hr"
                  currentValue={r('digLab')}
                  onSaved={refreshAllRates}
                />
              </span>
              <span className="inline-flex items-center gap-1">
                Rebar {r('rebarLab')} LF/hr
                <RateEditPopover
                  table="labor_rates"
                  name={WALL_RATES.rebarLab.db}
                  category="Walls"
                  mode="coefficient"
                  unitLabel="LF/hr"
                  currentValue={r('rebarLab')}
                  onSaved={refreshAllRates}
                />
              </span>
              <span className="inline-flex items-center gap-1">
                Block {r('blockLab')} blk/hr
                <RateEditPopover
                  table="labor_rates"
                  name={WALL_RATES.blockLab.db}
                  category="Walls"
                  mode="coefficient"
                  unitLabel="blk/hr"
                  currentValue={r('blockLab')}
                  onSaved={refreshAllRates}
                />
              </span>
              <span className="inline-flex items-center gap-1">
                Hand grout {r('handGroutLab')} CF/hr
                <RateEditPopover
                  table="labor_rates"
                  name={WALL_RATES.handGroutLab.db}
                  category="Walls"
                  mode="coefficient"
                  unitLabel="CF/hr"
                  currentValue={r('handGroutLab')}
                  onSaved={refreshAllRates}
                />
              </span>
              <span className="inline-flex items-center gap-1">
                Pump grout {r('pumpGroutLab')} CF/hr
                <RateEditPopover
                  table="labor_rates"
                  name={WALL_RATES.pumpGroutLab.db}
                  category="Walls"
                  mode="coefficient"
                  unitLabel="CF/hr"
                  currentValue={r('pumpGroutLab')}
                  onSaved={refreshAllRates}
                />
              </span>
              <span className="inline-flex items-center gap-1">
                Setup/clean {r('setupCleanLab')} LF/hr
                <RateEditPopover
                  table="labor_rates"
                  name={WALL_RATES.setupCleanLab.db}
                  category="Walls"
                  mode="coefficient"
                  unitLabel="LF/hr"
                  currentValue={r('setupCleanLab')}
                  onSaved={refreshAllRates}
                />
              </span>
            </div>
          </div>

          {cmuWalls.map((wall, idx) => (
            <CmuWallEntry
              key={idx}
              wall={wall}
              idx={idx}
              total={cmuWalls.length}
              onChange={updateCmuWall}
              onRemove={removeCmuWall}
              detail={calc.cmuDetails[idx] || null}
              materialPrices={materialPrices}
              materialRows={materialRows}
              vendorOptions={vendorOptions}
              isSub={isSub}
              refreshAllRates={refreshAllRates}
              {...makeWpHandlers(setCmuWalls, idx)}
            />
          ))}

          <button
            onClick={addCmuWall}
            className="w-full py-2 rounded-lg border border-dashed border-green-400 text-green-700 text-sm font-medium hover:bg-green-50 transition-colors mb-3"
          >
            + Add Another CMU Wall
          </button>

          {/* Module-level pump options */}
          <div className="border border-gray-200 rounded-xl p-3 bg-gray-50 space-y-0 mb-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Pump Options (all walls)
            </p>
            <LabeledRow label="Pump for Pouring Footing?">
              <select
                className="input text-sm py-1.5 w-24"
                value={cmuFootingPump}
                onChange={e => setCmuFootingPump(e.target.value)}
              >
                <option>No</option>
                <option>Yes</option>
              </select>
            </LabeledRow>
            <LabeledRow label="Pump for Grouting Block?">
              <select
                className="input text-sm py-1.5 w-24"
                value={cmuGroutPump}
                onChange={e => setCmuGroutPump(e.target.value)}
              >
                <option>No</option>
                <option>Yes</option>
              </select>
            </LabeledRow>
          </div>
          {/* Waterproofing is now specified per wall — see each Wall entry above. */}
        </div>
      )}

      {/* ── PIP Walls ── */}
      {wallType === 'PIP' && (
        <div>
          <SectionHeader title="Poured In Place Walls" />

          <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 mb-2 text-[11px] text-gray-500">
            <p className="font-semibold uppercase tracking-wide text-gray-400 mb-1">
              PIP Rates (click to edit)
            </p>
            <div className="flex flex-wrap gap-x-3 gap-y-1">
              <span className="inline-flex items-center gap-1">
                Concrete truck ${r('concreteTruck')}/CY
                <RateEditPopover
                  table="material_rates"
                  name={WALL_RATES.concreteTruck.db}
                  category="Basic Materials"
                  unitLabel="CY"
                  currentValue={r('concreteTruck')}
                  onSaved={refreshAllRates}
                />
              </span>
              <span className="inline-flex items-center gap-1">
                Dig {r('digLab')} CF/hr
                <RateEditPopover
                  table="labor_rates"
                  name={WALL_RATES.digLab.db}
                  category="Walls"
                  mode="coefficient"
                  unitLabel="CF/hr"
                  currentValue={r('digLab')}
                  onSaved={refreshAllRates}
                />
              </span>
              <span className="inline-flex items-center gap-1">
                Rebar {r('rebarLab')} LF/hr
                <RateEditPopover
                  table="labor_rates"
                  name={WALL_RATES.rebarLab.db}
                  category="Walls"
                  mode="coefficient"
                  unitLabel="LF/hr"
                  currentValue={r('rebarLab')}
                  onSaved={refreshAllRates}
                />
              </span>
            </div>
          </div>

          {pipWalls.map((wall, idx) => (
            <PipWallEntry
              key={idx}
              wall={wall}
              idx={idx}
              total={pipWalls.length}
              onChange={updatePipWall}
              onRemove={removePipWall}
              detail={calc.pipDetails[idx] || null}
              vendorOptions={vendorOptions}
              isSub={isSub}
              materialPrices={materialPrices}
              materialRows={materialRows}
              refreshAllRates={refreshAllRates}
              {...makeWpHandlers(setPipWalls, idx)}
            />
          ))}

          <button
            onClick={addPipWall}
            className="w-full py-2 rounded-lg border border-dashed border-green-400 text-green-700 text-sm font-medium hover:bg-green-50 transition-colors"
          >
            + Add Another PIP Wall
          </button>
        </div>
      )}

      {/* ── Modular Block Walls ── */}
      {wallType === 'Modular' && (
        <div>
          <SectionHeader title="Modular Block Walls" />

          {modularWalls.map((wall, idx) => (
            <ModularWallEntry
              key={idx}
              wall={wall}
              idx={idx}
              total={modularWalls.length}
              onChange={updateModularWall}
              onRemove={removeModularWall}
              detail={calc.modularDetails[idx] || null}
              materialPrices={materialPrices}
              materialRows={materialRows}
              vendorOptions={vendorOptions}
              isSub={isSub}
              refreshAllRates={refreshAllRates}
              typeSource={{ label: 'Wall Type', subcat: MODULAR_SUBCAT, master: true }}
              {...makeWpHandlers(setModularWalls, idx)}
            />
          ))}

          <button
            onClick={addModularWall}
            className="w-full py-2 rounded-lg border border-dashed border-green-400 text-green-700 text-sm font-medium hover:bg-green-50 transition-colors mb-3"
          >
            + Add Another Modular Wall
          </button>

          {/* Module-level pump options — footing only (no grouting for modular). */}
          <div className="border border-gray-200 rounded-xl p-3 bg-gray-50 space-y-0 mb-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Pump Options (all walls)
            </p>
            <LabeledRow label="Pump for Pouring Footing?">
              <select
                className="input text-sm py-1.5 w-24"
                value={modularFootingPump}
                onChange={e => setModularFootingPump(e.target.value)}
              >
                <option>No</option>
                <option>Yes</option>
              </select>
            </LabeledRow>
          </div>
          {/* Waterproofing + wall caps: waterproofing is per wall above; caps
              are shown in the shared Wall Caps section below. */}
        </div>
      )}

      {/* ── Brick Walls ── */}
      {wallType === 'Brick' && (
        <div>
          <SectionHeader title="Brick Walls" />

          {brickWalls.map((wall, idx) => (
            <ModularWallEntry
              key={idx}
              wall={wall}
              idx={idx}
              total={brickWalls.length}
              onChange={updateBrickWall}
              onRemove={removeBrickWall}
              detail={calc.brickDetails[idx] || null}
              materialPrices={materialPrices}
              materialRows={materialRows}
              vendorOptions={vendorOptions}
              isSub={isSub}
              refreshAllRates={refreshAllRates}
              {...makeWpHandlers(setBrickWalls, idx)}
            />
          ))}

          <button
            onClick={addBrickWall}
            className="w-full py-2 rounded-lg border border-dashed border-green-400 text-green-700 text-sm font-medium hover:bg-green-50 transition-colors mb-3"
          >
            + Add Another Brick Wall
          </button>

          {/* Module-level pump options — footing only. */}
          <div className="border border-gray-200 rounded-xl p-3 bg-gray-50 space-y-0 mb-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Pump Options (all walls)
            </p>
            <LabeledRow label="Pump for Pouring Footing?">
              <select
                className="input text-sm py-1.5 w-24"
                value={brickFootingPump}
                onChange={e => setBrickFootingPump(e.target.value)}
              >
                <option>No</option>
                <option>Yes</option>
              </select>
            </LabeledRow>
          </div>
        </div>
      )}

      {/* ── Timber Wall (single) ── */}
      {wallType === 'Timber' && (
        <div>
          <SectionHeader title="Timber / Lumber Wall" />
          <div className="mb-3">
            <label className="block text-xs text-gray-500 mb-1">Timber Type</label>
            <select
              className="input text-sm py-1.5 w-full"
              value={timberType}
              onChange={e => setTimberType(e.target.value)}
            >
              <option>Railroad Treated</option>
              <option>Douglas Fir 6×6</option>
              <option>Cedar 6×6</option>
              <option>Redwood 6×6</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Linear Feet of Wall</label>
              <NumInput value={timberLF} onChange={setTimberLF} placeholder="0" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Wall Finish Height (in)</label>
              <NumInput value={timberHeightIn} onChange={setTimberHeightIn} placeholder="24" />
            </div>
          </div>
          <div className="mt-2">
            <label className="block text-xs text-gray-500 mb-1">
              Pile-Driven Steel Posts (qty)
            </label>
            <div className="flex items-center gap-2">
              <NumInput
                value={timberPosts}
                onChange={setTimberPosts}
                placeholder="0"
                className="w-28"
              />
              <span className="text-xs text-gray-400">$100 mat + 0.47 hr each</span>
            </div>
          </div>
          {isSub && (
            <div className="mt-3 flex items-center gap-2 flex-wrap">
              <span className="text-xs text-gray-500">Sub flat $/LF</span>
              <div className="relative w-28">
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">
                  $
                </span>
                <input
                  type="number"
                  step="any"
                  className="input text-sm py-1.5 pl-5 w-full"
                  placeholder="0.00"
                  value={timberSubEach ?? ''}
                  onChange={e => setTimberSubEach(e.target.value)}
                />
              </div>
              <span className="text-[11px] text-gray-400">
                default = material ÷ LF · no labor billed on Sub
              </span>
            </div>
          )}
        </div>
      )}

      {/* ── Wall Finishes ── (hidden on the Modular / Brick tabs) */}
      {wallType !== 'Modular' && wallType !== 'Brick' && renderWallFinishSection()}

      {/* ── Wall Caps ── */}
      {renderCapSection()}

      {/* ── Manual Entry ── */}
      <div>
        <SectionHeader title="Manual Entry" />
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
                  <NumInput value={row.materials} onChange={v => updateManual(i, 'materials', v)} />
                </td>
                <td className="py-1">
                  {' '}
                  <NumInput value={row.subCost} onChange={v => updateManual(i, 'subCost', v)} />
                </td>
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
