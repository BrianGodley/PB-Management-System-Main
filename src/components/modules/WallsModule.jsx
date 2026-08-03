import WorkTypeChooser from './WorkTypeChooser'
import { useState, useEffect, useCallback, useContext } from 'react'
import { SubTabContext, subSectionTitle } from './subTabContext'
import { supabase } from '../../lib/supabase'
import GpmdBar from './GpmdBar'
import ModuleNotesField from './ModuleNotesField'
import RateEditPopover from '../RateEditPopover'
import { fetchSalesTaxRate } from '../../lib/companyDefaults'
import { calcWalkAccessLabor, DEFAULT_WALK_ACCESS_PACE_LF_PER_MIN } from '../../lib/walkAccess'

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
  // Same formula as the Excel ((L-2) × H × (W-2)) in³ → yd³
  return ((b.l - 2) * b.h * (b.w - 2)) / 1728 / 27
}

const WALL_RATES = {
  greyBlock: { db: 'Wall Grey Block', fb: 2.59 },
  bondbeamBlock: { db: 'Wall Bondbeam Block', fb: 2.59 },
  rebar: { db: 'Wall Rebar', fb: 1.399 },
  concreteHand: { db: 'Wall Concrete Hand Mix', fb: 92.0 },
  concreteTruck: { db: 'Wall Concrete Truck', fb: 185.0 },
  groutPumpSetup: { db: 'Wall Grout Pump Setup', fb: 402.5 },
  groutPumpPerYd: { db: 'Wall Grout Pump Per Yard', fb: 9.2 },
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

// Default entries
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
})
const DEFAULT_PIP = () => ({
  vendor: 'House',
  lf: '',
  heightIn: '',
  footingWIn: '12',
  footingDIn: '12',
  horizBars: '2',
  subEach: '',
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
function wallMatPrice(dbName, vendorId, materialRows, mp, fallback) {
  if (vendorId && vendorId !== 'House') {
    const row = (materialRows || []).find(r => r.name === dbName && r.vendor_id === vendorId)
    if (row && row.unit_cost != null && row.unit_cost !== '') return n(row.unit_cost)
  }
  return mp?.[dbName] ?? fallback
}

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

// ── Per-wall calculators ──────────────────────────────────────────────────────
function calcOneCMU(wall, footingPump, groutPump, r, mp = {}, materialRows = []) {
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
  if (!n(lf) || !n(heightIn)) return { hrs: 0, mat: 0, subUnit: 0, subEach: 0, subMat: 0, detail: null }

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
  const b = blockByName(blockType)
  const blockPrice = wallMatPrice(wallBlockRateName(b.name), v, materialRows, mp, b.price)
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

  return {
    hrs,
    mat,
    subUnit,
    subEach,
    subMat,
    detail: { orderGreyBlock, orderBBBlock, footingCY, groutCY, totalRebarLF, curveAdd, subUnit },
  }
}

function calcOnePIP(wall, r, mp = {}, materialRows = []) {
  const { lf, heightIn, footingWIn, footingDIn, horizBars } = wall
  if (!n(lf) || !n(heightIn)) return { hrs: 0, mat: 0, concCY: 0, subUnit: 0, subEach: 0, subMat: 0 }
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
  return { hrs, mat, concCY, footingCY, horizRebarLF, subUnit, subEach, subMat }
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
    pipDetails = []

  // ALL wall types contribute simultaneously — switching the visible tab
  // no longer drops the other types from the calc. Each section is its
  // own array and gets summed below. Vendor only changes the material $;
  // In-House labor / geometry is unchanged.
  ;(state.cmuWalls || []).forEach(wall => {
    const res = calcOneCMU(wall, state.cmuFootingPump, state.cmuGroutPump, r, mp, materialRows)
    structuralHrs += res.hrs
    structuralMat += res.mat
    structuralSubMat += res.subMat
    cmuDetails.push(res.detail)
  })
  ;(state.pipWalls || []).forEach(wall => {
    const res = calcOnePIP(wall, r, mp, materialRows)
    structuralHrs += res.hrs
    structuralMat += res.mat
    structuralSubMat += res.subMat
    pipDetails.push({ ...res, lf: wall.lf, heightIn: wall.heightIn })
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

  // ── Waterproofing — per-row (Vendor + Item). Legacy single entry
  //    (wpType / wpSF) is migrated into the array form by the component. ─────
  const wpRowsSrc =
    Array.isArray(state.wpRows) && state.wpRows.length
      ? state.wpRows
      : [{ type: state.wpType, sf: state.wpSF, vendor: 'House' }]
  const wpResults = wpRowsSrc.map(row => computeWpRow(row, mp, materialRows))
  const wpHrs = wpResults.reduce((a, x) => a + (x.hrs || 0), 0)
  const wpMat = wpResults.reduce((a, x) => a + (x.mat || 0), 0)
  const wpSubMat = wpResults.reduce((a, x) => a + (x.subMat || 0), 0)

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
    finishRows,
    capResults,
    wpResults,
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
function initCmuWalls(src = {}) {
  if (src.cmuWalls) return src.cmuWalls.map(w => ({ blockType: DEFAULT_BLOCK_NAME, vendor: 'House', subEach: '', ...w }))
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
      },
    ]
  return [DEFAULT_CMU()]
}
function initPipWalls(src = {}) {
  if (src.pipWalls) return src.pipWalls.map(w => ({ vendor: 'House', subEach: '', ...w }))
  if (src.pipLF !== undefined)
    return [{ vendor: 'House', lf: src.pipLF, heightIn: src.pipHeightIn, subEach: '' }]
  return [DEFAULT_PIP()]
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
  return {
    difficulty: src.difficulty ?? '',
    hoursAdj: src.hoursAdj ?? '',
    wallType: src.wallType ?? 'CMU',
    distanceLF: src.distanceLF ?? '',
    cmuWalls: initCmuWalls(src),
    cmuFootingPump: src.cmuFootingPump ?? 'No',
    cmuGroutPump: src.cmuGroutPump ?? 'No',
    pipWalls: initPipWalls(src),
    timberLF: src.timberLF ?? '',
    timberHeightIn: src.timberHeightIn ?? '',
    timberType: src.timberType ?? 'Railroad Treated',
    timberPosts: src.timberPosts ?? '',
    timberSubEach: src.timberSubEach ?? '',
    wallFinishRows: initWallFinishRows(src),
    capRows: src.capRows ? src.capRows.map(r => ({ vendor: 'House', subEach: '', ...r })) : DEFAULT_CAP_ROWS.map(r => ({ ...r })),
    wpRows: initWpRows(src),
    manualRows: src.manualRows ?? DEFAULT_MANUAL_ROWS.map(r => ({ ...r })),
  }
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
            {(vendorOptions || [{ value: 'House', label: 'House' }]).map(o => (
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
    </div>
  )
}

// ── PIP Wall Entry ────────────────────────────────────────────────────────────
function PipWallEntry({ wall, idx, total, onChange, onRemove, detail, vendorOptions, isSub }) {
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
            {(vendorOptions || [{ value: 'House', label: 'House' }]).map(o => (
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
  const [materialPrices, setMaterialPrices] = useState(initialData?.materialPrices ?? {})
  // Full Walls material_rates catalog (id/name/vendor_id/unit/unit_cost) used to
  // resolve a vendor's material price. Plus the vendor list for the pickers.
  const [materialRows, setMaterialRows] = useState(initialData?.materialRows || [])
  const [vendors, setVendors] = useState([])
  const [pricesLoading, setPricesLoading] = useState(!initialData?.materialPrices)

  // Re-fetch the merged labor+material rate map + vendor catalog. Called once on
  // mount and again after any RateEditPopover save so the calc reflects edits.
  const refreshAllRates = useCallback(async () => {
    const [matRes, labRes, catRes, venRes] = await Promise.all([
      supabase.from('material_rates').select('name, unit_cost').eq('category', 'Walls'),
      supabase.from('labor_rates').select('name, rate').eq('category', 'Walls'),
      supabase
        .from('material_rates')
        .select('id,name,vendor_id,unit,unit_cost')
        .eq('category', 'Walls'),
      supabase
        .from('subs_vendors')
        .select('id, company_name, supplied_categories')
        .eq('type', 'vendor')
        .order('company_name'),
    ])
    const p = {}
    ;(matRes.data || []).forEach(row => {
      p[row.name] = parseFloat(row.unit_cost) || 0
    })
    ;(labRes.data || []).forEach(row => {
      p[row.name] = parseFloat(row.rate) || 0
    })
    setMaterialPrices(p)
    setMaterialRows(catRes.data || [])
    setVendors(
      (venRes.data || []).map(v => ({
        id: v.id,
        name: v.company_name,
        categories: v.supplied_categories || [],
      }))
    )
  }, [])

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
    // Always refresh so the vendor list + material catalog load, even when
    // editing a saved estimate (which already carries a materialPrices map).
    refreshAllRates().then(() => setPricesLoading(false))
  }, [refreshAllRates])

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
  const wpRows = cur.wpRows
  const setWpRows = setField('wpRows')
  const manualRows = cur.manualRows
  const setManualRows = setField('manualRows')
  function updateWpRow(i, field, val) {
    setWpRows(rs => rs.map((r, idx) => (idx === i ? { ...r, [field]: val } : r)))
  }
  function addWpRow() {
    setWpRows(rs => [...rs, blankWpRow()])
  }
  function removeWpRow(idx) {
    setWpRows(rs => (rs.length > 1 ? rs.filter((_, i) => i !== idx) : rs))
  }

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
  const vendorsForCategory = cat => vendors.filter(v => (v.categories || []).includes(cat))
  const vendorOptions = [
    { value: 'House', label: 'House' },
    ...vendorsForCategory('Walls').map(v => ({ value: v.id, label: v.name })),
  ]

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
        vendorNames: Object.fromEntries(vendors.map(v => [v.id, v.name])),
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
                  category="Walls"
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
                  category="Walls"
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
                  category="Walls"
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
                  category="Walls"
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
                  category="Walls"
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

          {/* Waterproofing — multiple rows so different wall sections can
              get different specs. "None" rows contribute nothing. */}
          <div>
            <label className="block text-xs text-gray-500 mb-1 font-medium">Waterproofing</label>
            <div className="space-y-2">
              {wpRows.map((row, i) => {
                const wpKey = WP_KEY[row.type]
                const wpc = computeWpRow(row, materialPrices, materialRows)
                return (
                  <div key={i} className="flex items-center gap-2 flex-wrap">
                    <select
                      className="input text-sm py-1.5 w-40"
                      value={row.vendor || 'House'}
                      onChange={e => updateWpRow(i, 'vendor', e.target.value)}
                    >
                      {vendorOptions.map(o => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                    <select
                      className="input text-sm py-1.5 flex-1"
                      value={row.type}
                      onChange={e => updateWpRow(i, 'type', e.target.value)}
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
                        onChange={v => updateWpRow(i, 'sf', v)}
                        placeholder="0"
                        className="w-28"
                      />
                    )}
                    {row.type !== 'None' && (
                      <span className="text-xs text-gray-400 shrink-0">SF</span>
                    )}
                    {row.type !== 'None' && wpKey && (
                      <span className="inline-flex items-center gap-1 text-xs text-gray-400">
                        ${wallMatPrice(WALL_RATES[wpKey].db, row.vendor, materialRows, materialPrices, WALL_RATES[wpKey].fb).toFixed(2)}/SF
                        <RateEditPopover
                          table="material_rates"
                          name={WALL_RATES[wpKey].db}
                          category="Walls"
                          unitLabel="SF"
                          currentValue={r(wpKey)}
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
                          onChange={e => updateWpRow(i, 'subEach', e.target.value)}
                        />
                      </div>
                    )}
                    {wpRows.length > 1 && (
                      <button
                        onClick={() => removeWpRow(i)}
                        className="text-xs text-red-400 hover:text-red-600 px-2 py-0.5 rounded border border-red-100 hover:border-red-300"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                )
              })}
              <button
                onClick={addWpRow}
                className="w-full py-1.5 rounded-lg border border-dashed border-green-400 text-green-700 text-xs font-medium hover:bg-green-50 transition-colors"
              >
                + Add another waterproofing line
              </button>
            </div>
          </div>
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
                  category="Walls"
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

      {/* ── Wall Finishes ── */}
      {renderWallFinishSection()}

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
