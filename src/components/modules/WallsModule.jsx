import WorkTypeChooser from './WorkTypeChooser'
import CrewTypeBar from './CrewTypeBar'
import ModuleHeaderSlot from './ModuleHeaderSlot'
import { useState, useEffect, useCallback, useContext } from 'react'
import { SubTabContext, subSectionTitle } from './subTabContext'
import { supabase } from '../../lib/supabase'
import GpmdBar from './GpmdBar'
import DropdownSelect from '../DropdownSelect'
import MissingPriceModal from '../MissingPriceModal'
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
  // Cap + waterproofing install labor (editable; fallbacks = the original
  // hard-coded coefficients so totals don't move until a rate is changed).
  capFlagstoneLab: { db: 'Wall Cap Flagstone Labor', fb: 0.25 }, // hr/LF
  capPrecastLab: { db: 'Wall Cap Precast Labor', fb: 0.2 }, // hr/ea
  capPipLab: { db: 'Wall Cap PIP Concrete Labor', fb: 0.15 }, // hr/LF
  capBullnoseLab: { db: 'Wall Cap Bullnose Labor', fb: 0.08 }, // hr/LF
  wpLabor: { db: 'Wall WP Install Labor', fb: 200 }, // SF/hr
}

// Rate catalog for the "View Rates" popup, BROKEN DOWN BY WALL TYPE. Each item:
// [WALL_RATES key, label, category, unit, mode]. mode 'coefficient' → labor_rates;
// else material_rates. `blocks:true` prepends the CMU block-type price list.
// Finishes / Caps / Waterproofing are shown once (they apply to every wall type).
const WALL_RATE_SPECS = [
  {
    group: 'CMU Block',
    catalogSubcat: 'Wall Block',
    items: [
      ['greyBlock', 'Grey Block', 'Walls', 'ea', 'currency'],
      ['bondbeamBlock', 'Bondbeam Block', 'Walls', 'ea', 'currency'],
      ['rebar', 'Rebar', 'Basic Materials', 'LF', 'currency'],
      ['concreteHand', 'Concrete — Hand Mix', 'Basic Materials', 'CY', 'currency'],
      ['concreteTruck', 'Concrete — Ready Mix (Truck)', 'Basic Materials', 'CY', 'currency'],
      ['groutPumpSetup', 'Grout Pump — Setup', 'Basic Materials', 'flat', 'currency'],
      ['groutPumpPerYd', 'Grout Pump — Per CY', 'Basic Materials', 'CY', 'currency'],
      ['digLab', 'Dig Footing', 'Walls', 'CF/hr', 'coefficient'],
      ['rebarLab', 'Set Rebar', 'Walls', 'LF/hr', 'coefficient'],
      ['blockLab', 'Set Block', 'Walls', 'blk/hr', 'coefficient'],
      ['handGroutLab', 'Hand Grout', 'Walls', 'CF/hr', 'coefficient'],
      ['pumpGroutLab', 'Pump Grout', 'Walls', 'CF/hr', 'coefficient'],
      ['setupCleanLab', 'Setup / Clean', 'Walls', 'LF/hr', 'coefficient'],
    ],
  },
  {
    group: 'Poured In Place',
    items: [
      ['concreteTruck', 'Concrete — Ready Mix (Truck)', 'Basic Materials', 'CY', 'currency'],
      ['concreteHand', 'Concrete — Hand Mix', 'Basic Materials', 'CY', 'currency'],
      ['rebar', 'Rebar', 'Basic Materials', 'LF', 'currency'],
      ['digLab', 'Dig Footing', 'Walls', 'CF/hr', 'coefficient'],
      ['rebarLab', 'Set Rebar', 'Walls', 'LF/hr', 'coefficient'],
    ],
  },
  {
    group: 'Modular',
    catalogSubcat: 'Modular Wall',
    items: [
      ['concreteHand', 'Footing Concrete — Hand Mix', 'Basic Materials', 'CY', 'currency'],
      ['concreteTruck', 'Footing Concrete — Ready Mix', 'Basic Materials', 'CY', 'currency'],
      ['groutPumpSetup', 'Footing Pump — Setup', 'Basic Materials', 'flat', 'currency'],
      ['digLab', 'Dig Footing', 'Walls', 'CF/hr', 'coefficient'],
      ['blockLab', 'Set Block', 'Walls', 'blk/hr', 'coefficient'],
      ['setupCleanLab', 'Setup / Clean', 'Walls', 'LF/hr', 'coefficient'],
    ],
  },
  {
    group: 'Brick',
    catalogSubcat: 'Wall Block',
    items: [
      ['concreteHand', 'Footing Concrete — Hand Mix', 'Basic Materials', 'CY', 'currency'],
      ['concreteTruck', 'Footing Concrete — Ready Mix', 'Basic Materials', 'CY', 'currency'],
      ['groutPumpSetup', 'Footing Pump — Setup', 'Basic Materials', 'flat', 'currency'],
      ['digLab', 'Dig Footing', 'Walls', 'CF/hr', 'coefficient'],
      ['blockLab', 'Set Block', 'Walls', 'blk/hr', 'coefficient'],
      ['setupCleanLab', 'Setup / Clean', 'Walls', 'LF/hr', 'coefficient'],
    ],
  },
  {
    group: 'Finishes (all wall types)',
    items: [
      ['sandStucco', 'Sand Stucco', 'Walls', 'SF', 'currency'],
      ['smoothStucco', 'Smooth Stucco', 'Walls', 'SF', 'currency'],
      ['ledgerstone', 'Ledgerstone', 'Walls', 'SF', 'currency'],
      ['stackedStone', 'Stacked Stone', 'Walls', 'SF', 'currency'],
      ['tile', 'Tile', 'Walls', 'SF', 'currency'],
      ['flagstone', 'Real Flagstone', 'Walls', 'ton', 'currency'],
      ['realStone', 'Real Stone', 'Walls', 'ton', 'currency'],
      ['sandStuccoLab', 'Sand Stucco Labor', 'Walls', 'SF/day', 'coefficient'],
      ['smoothStuccoLab', 'Smooth Stucco Labor', 'Walls', 'SF/day', 'coefficient'],
      ['ledgerstoneLab', 'Ledgerstone Labor', 'Walls', 'SF/day', 'coefficient'],
      ['stackedStoneLab', 'Stacked Stone Labor', 'Walls', 'SF/day', 'coefficient'],
      ['tileLab', 'Tile Labor', 'Walls', 'hrs/SF', 'coefficient'],
      ['flagstoneLab', 'Real Flagstone Labor', 'Walls', 'hrs/SF', 'coefficient'],
      ['realStoneLab', 'Real Stone Labor', 'Walls', 'hrs/SF', 'coefficient'],
    ],
  },
  {
    group: 'Caps (all wall types)',
    items: [
      ['capFlagstone', 'Cap — Flagstone', 'Walls', 'ton', 'currency'],
      ['capPrecast', 'Cap — Precast', 'Walls', 'ea', 'currency'],
      ['capBullnose', 'Cap — Bullnose Brick', 'Walls', 'LF', 'currency'],
      ['capFlagstoneLab', 'Flagstone Labor', 'Walls', 'hr/LF', 'coefficient'],
      ['capPrecastLab', 'Precast Labor', 'Walls', 'hr/ea', 'coefficient'],
      ['capPipLab', 'PIP Concrete Labor', 'Walls', 'hr/LF', 'coefficient'],
      ['capBullnoseLab', 'Bullnose Labor', 'Walls', 'hr/LF', 'coefficient'],
    ],
  },
  {
    group: 'Waterproofing (all wall types)',
    items: [
      ['wpPrimerMembrane', 'Primer & Membrane', 'Walls', 'SF', 'currency'],
      ['wp3CoatRollOn', '3 Coats Roll On', 'Walls', 'SF', 'currency'],
      ['wpThoroseal', 'Thoroseal & Roll On', 'Walls', 'SF', 'currency'],
      ['wpDimpleMembrane', 'Dimple Membrane', 'Walls', 'SF', 'currency'],
      ['wpLabor', 'Install Labor', 'Walls', 'SF/hr', 'coefficient'],
    ],
  },
]

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
  footingPump: 'No',
  groutPump: 'No',
  subEach: '',
  wpRows: [blankWpRow()],
  finishRows: [{ ...blankWallFinishRow(), type: 'None' }],
  capRows: [blankCapRow()],
})
const DEFAULT_PIP = () => ({
  vendor: 'House',
  lf: '',
  heightIn: '',
  footingWIn: '12',
  footingDIn: '12',
  horizBars: '2',
  footingPump: 'Yes',
  subEach: '',
  wpRows: [blankWpRow()],
  finishRows: [{ ...blankWallFinishRow(), type: 'None' }],
  capRows: [blankCapRow()],
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
  footingPump: 'No',
  subEach: '',
  wpRows: [blankWpRow()],
  finishRows: [{ ...blankWallFinishRow(), type: 'None' }],
  capRows: [blankCapRow()],
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
  footingPump: 'No',
  subEach: '',
  wpRows: [blankWpRow()],
  finishRows: [{ ...blankWallFinishRow(), type: 'None' }],
  capRows: [blankCapRow()],
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
  const lab = k => mp?.[WALL_RATES[k].db] ?? WALL_RATES[k].fb
  // Material price comes from the selected Wall Finish catalog product (per
  // vendor); a per-estimate $/unit override still wins if entered.
  const meta = WALL_FINISH_META[row.type] || {}
  const matFb = meta.matKey ? WALL_RATES[meta.matKey].fb : 0
  const catP = catalogItemPrice(materialRows, WALL_FINISH_SUBCAT, row.type, v, matFb)
  const rate = n(row.rateIn) > 0 ? n(row.rateIn) : catP
  let mat = 0,
    hrs = 0,
    subUnit = 0,
    tons = 0
  switch (row.type) {
    case 'Sand Stucco': {
      hrs = sf > 0 ? (sf / lab('sandStuccoLab')) * 8 : 0
      mat = sf * rate
      subUnit = rate
      break
    }
    case 'Smooth Stucco': {
      hrs = sf > 0 ? (sf / lab('smoothStuccoLab')) * 8 : 0
      mat = sf * rate
      subUnit = rate
      break
    }
    case 'Ledgerstone': {
      hrs = sf > 0 ? (sf / lab('ledgerstoneLab')) * 8 : 0
      mat = sf > 0 ? sf * rate * 1.1 + (sf / 5) * 2 : 0
      subUnit = rate * 1.1 + 0.4
      break
    }
    case 'Stacked Stone': {
      hrs = sf > 0 ? (sf / lab('stackedStoneLab')) * 8 : 0
      mat = sf > 0 ? sf * rate * 1.1 + (sf / 5) * 2 : 0
      subUnit = rate * 1.1 + 0.4
      break
    }
    case 'Tile': {
      hrs = sf > 0 ? sf * lab('tileLab') : 0
      mat = sf > 0 ? sf * rate + sf : 0
      subUnit = rate + 1
      break
    }
    case 'Real Flagstone': {
      hrs = sf > 0 ? sf * lab('flagstoneLab') : 0
      mat = sf > 0 ? (sf / 80) * rate + sf * 1.5 : 0
      subUnit = rate / 80 + 1.5
      tons = sf / 80
      break
    }
    case 'Real Stone': {
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
  const lab = k => mp?.[WALL_RATES[k].db] ?? WALL_RATES[k].fb
  // Cap material price from the Wall Cap catalog product (per vendor). PIP
  // Concrete caps price off the concrete rate (a poured cap, not a cap product).
  const capP = (name, fb) => catalogItemPrice(materialRows, WALL_CAP_SUBCAT, name, v, fb)
  let mat = 0,
    hrs = 0,
    subUnit = 0,
    subQty = 0,
    unit = 'LF',
    dispQty = lf
  switch (row.type) {
    case 'Flagstone': {
      const pr = capP('Flagstone', WALL_RATES.capFlagstone.fb)
      mat = (((widthIn / 12) * lf * 0.0833 * 100) / 2000) * pr
      hrs = lf * lab('capFlagstoneLab')
      subUnit = (((widthIn / 12) * 0.0833 * 100) / 2000) * pr
      subQty = lf
      break
    }
    case 'Precast': {
      const pr = capP('Precast', WALL_RATES.capPrecast.fb)
      const widthFactor = (widthIn || 8) / 8
      mat = qty * pr * widthFactor
      hrs = qty * lab('capPrecastLab')
      subUnit = pr * widthFactor
      subQty = qty
      unit = 'ea'
      dispQty = qty
      break
    }
    case 'PIP Concrete': {
      const pr = wallMatPrice(WALL_RATES.concreteTruck.db, v, materialRows, mp, WALL_RATES.concreteTruck.fb)
      mat = ((lf * (widthIn / 12) * 0.333) / 27) * pr
      hrs = lf * lab('capPipLab')
      subUnit = (((widthIn / 12) * 0.333) / 27) * pr
      subQty = lf
      break
    }
    case 'Bullnose Brick': {
      const pr = capP('Bullnose Brick', WALL_RATES.capBullnose.fb)
      mat = lf * pr
      hrs = lf * lab('capBullnoseLab')
      subUnit = pr
      subQty = lf
      break
    }
    default: {
      // Any catalog Wall Cap product (e.g. modular block caps like "Shelton
      // Wall Cap"): priced per LF from its own material_price for the selected
      // vendor, with the standard per-LF cap install labor coefficient.
      const pr = capP(row.type, 0)
      mat = lf * pr
      hrs = lf * lab('capBullnoseLab')
      subUnit = pr
      subQty = lf
      break
    }
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
    // Price from the Waterproofing catalog product (per vendor), not a constant.
    const pr = catalogItemPrice(materialRows, WALL_WP_SUBCAT, row.type, row.vendor, WALL_RATES[k].fb)
    const wpRate = n(mp?.[WALL_RATES.wpLabor.db]) || WALL_RATES.wpLabor.fb
    mat = sf * pr
    hrs = sf / wpRate
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

// CMU & Brick blocks are now catalog-driven from the Walls › "Wall Block"
// sub-category (products carry dims in calc_meta + a per-vendor price). This
// resolver returns the selected product's { name, w, h, l, price } ONLY when
// blockType is a catalog product id; for legacy estimates (blockType = a built-in
// size name) it returns null so the calc falls back to the built-in CMU catalog —
// keeping old estimates byte-for-byte identical.
const WALL_BLOCK_SUBCAT = 'Wall Block'
function blockHasDims(r) {
  const cm = r?.calc_meta || {}
  return n(cm.block_w_in) || n(r?.block_w_in)
}
function resolveCatalogBlock(wall, materialRows) {
  const row = (materialRows || []).find(
    r => r.sub_category === WALL_BLOCK_SUBCAT && r.id === wall.blockType
  )
  if (!row) return null
  const cm = row.calc_meta || {}
  return {
    name: row.name,
    w: n(cm.block_w_in) || n(row.block_w_in) || 8,
    h: n(cm.block_h_in) || n(row.block_h_in) || 8,
    l: n(cm.block_l_in) || n(row.block_l_in) || 16,
    price: n(row.unit_cost),
  }
}
// The "Wall Block" products a vendor offers for the Block Type picker (only the
// dimensioned ones — Grey/Bondbeam base blocks have no dims and aren't types).
function wallBlockOptions(materialRows, vendorSel) {
  return (materialRows || []).filter(
    r =>
      r.sub_category === WALL_BLOCK_SUBCAT &&
      blockHasDims(r) &&
      (!vendorSel || vendorSel === 'House' ? r.vendor_id == null : r.vendor_id === vendorSel)
  )
}

// Caps & Finishes are also vendor-catalog-driven: the Item dropdown lists the
// selected vendor's products in the 'Wall Cap' / 'Wall Finish' sub-category. The
// product NAMES match the built-in type keys (Flagstone, Sand Stucco, …) so the
// existing cap/finish calc is untouched — the vendor only controls availability.
const WALL_CAP_SUBCAT = 'Wall Cap'
const WALL_FINISH_SUBCAT = 'Wall Finish'
const WALL_WP_SUBCAT = 'Waterproofing'
// PIP walls pour concrete — the "Concrete Vendor" picker is scoped to the
// Concrete category's 'Concrete Mix' sub-category (loaded into the Walls catalog).
const CONCRETE_CATEGORY = 'Concrete'
const CONC_MIX_SUBCAT = 'Concrete Mix'
function wallCatalogTypes(materialRows, subcat, vendorSel) {
  const seen = new Set()
  const out = []
  ;(materialRows || []).forEach(r => {
    if (r.sub_category !== subcat || !r.name) return
    const ok = !vendorSel || vendorSel === 'House' ? r.vendor_id == null : r.vendor_id === vendorSel
    if (ok && !seen.has(r.name)) {
      seen.add(r.name)
      out.push(r.name)
    }
  })
  return out
}
// Price of a catalog product by (sub-category, name) for the selected vendor —
// vendor row → Standard row → fallback. This is how finish/cap/waterproofing
// prices resolve now: from the DB product, not a hard-coded constant.
function catalogItemPrice(materialRows, subcat, name, vendorSel, fallback) {
  const rows = (materialRows || []).filter(r => r.sub_category === subcat && r.name === name)
  if (!rows.length) return fallback
  const vsel = vendorSel && vendorSel !== 'House' ? vendorSel : null
  const row = rows.find(r => r.vendor_id === vsel) || rows.find(r => r.vendor_id == null) || rows[0]
  return row && row.unit_cost != null && row.unit_cost !== '' ? n(row.unit_cost) : fallback
}

// Return the catalog product row for (sub-category, name, vendor) — used to
// detect a selected material that has NO price so we can prompt the user.
function wallCatalogRow(materialRows, subcat, name, vendorSel) {
  const rows = (materialRows || []).filter(r => r.sub_category === subcat && r.name === name)
  if (!rows.length) return null
  const vsel = vendorSel && vendorSel !== 'House' ? vendorSel : null
  return rows.find(r => r.vendor_id === vsel) || rows.find(r => r.vendor_id == null) || rows[0]
}
// True when a catalog row exists but carries no usable price.
function isPricelessRow(row) {
  return !!(row && row.id && (row.unit_cost == null || row.unit_cost === '' || n(row.unit_cost) === 0))
}
// Shared "missing price" prompt: when a selected catalog item has no price, open
// a modal so the user can enter one (written to the catalog). Used by every
// Walls picker (caps/finishes/waterproofing/blocks).
function usePricePrompt() {
  const [prompt, setPrompt] = useState(null)
  // name-keyed catalog items (caps/finishes/waterproofing)
  const check = (materialRows, subcat, name, vendor) => {
    const row = wallCatalogRow(materialRows, subcat, name, vendor)
    if (isPricelessRow(row)) {
      setPrompt({ materialId: row.id, vendorId: vendor && vendor !== 'House' ? vendor : null, name })
      return true
    }
    return false
  }
  // id-keyed catalog items (block pickers select the material id directly)
  const checkById = (materialRows, id, vendor, name) => {
    const row = (materialRows || []).find(r => r.id === id)
    if (isPricelessRow(row)) {
      setPrompt({
        materialId: row.id,
        vendorId: vendor && vendor !== 'House' ? vendor : null,
        name: name || row.name,
      })
      return true
    }
    return false
  }
  return { prompt, check, checkById, close: () => setPrompt(null) }
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
function calcOneModular(wall, footingPump, r, mp = {}, materialRows = [], blockOverride = null) {
  const modWall = { ...wall, rebarSpIn: '0', horizBars: '0', bondBeams: '0', pctGrouted: '0' }
  return calcOneCMU(modWall, footingPump, 'No', r, mp, materialRows, blockOverride)
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
  // Per-wall footing pump: 'Yes' = ready-mix truck (default, unchanged), 'No' =
  // hand mix. No separate pump-setup fee on PIP footings.
  const footPrc = (wall.footingPump ?? 'Yes') === 'Yes' ? pm('concreteTruck') : pm('concreteHand')
  const footingMat = footingCY * footPrc + horizRebarLF * pm('rebar')

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
    const res = calcOneCMU(
      wall,
      wall.footingPump ?? 'No',
      wall.groutPump ?? 'No',
      r,
      mp,
      materialRows,
      resolveCatalogBlock(wall, materialRows)
    )
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
    const res = calcOneModular(
      wall,
      wall.footingPump ?? 'No',
      r,
      mp,
      materialRows,
      resolveMasterBlock(wall, materialRows, MODULAR_SUBCAT)
    )
    structuralHrs += res.hrs
    structuralMat += res.mat
    structuralSubMat += res.subMat
    addWp(res)
    modularDetails.push(res.detail)
  })
  ;(state.brickWalls || []).forEach(wall => {
    const res = calcOneModular(
      wall,
      wall.footingPump ?? 'No',
      r,
      mp,
      materialRows,
      resolveCatalogBlock(wall, materialRows)
    )
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

  // ── Wall Finishes & Caps — now specified PER WALL. Gather each wall's own
  //    finishRows / capRows across every wall type; per-row math is identical
  //    to the original global sections, so totals are unchanged. ────────────
  const allWalls = [
    ...(state.cmuWalls || []),
    ...(state.pipWalls || []),
    ...(state.modularWalls || []),
    ...(state.brickWalls || []),
  ]
  const finishRows = allWalls
    .flatMap(w => w.finishRows || [])
    .map(row => computeWallFinishRow(row, mp, materialRows))
  const finishHrs = finishRows.reduce((a, x) => a + (x.hrs || 0), 0)
  const finishMat = finishRows.reduce((a, x) => a + (x.mat || 0), 0)
  const finishSubMat = finishRows.reduce((a, x) => a + (x.subMat || 0), 0)

  const capResults = allWalls
    .flatMap(w => w.capRows || [])
    .map(row => computeCapRow(row, mp, materialRows))
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
]
const DEFAULT_CAP_ROWS = [blankCapRow(), blankCapRow()]
const CAP_TYPES = ['None', 'Flagstone', 'Precast', 'PIP Concrete', 'Bullnose Brick']

// ── Per-tab input record ──────────────────────────────────────────────────────
// In-House and Sub each hold their own independent copy so the two tabs are
// separate calculators. Backward-compat: legacy single-entry / flat fields are
// migrated into the array forms below.
// Waterproofing is now a SINGLE field per wall — collapse any legacy multi-row
// wp to the first meaningful line (prefer the first non-None).
function initWallWp(w = {}) {
  const rows = Array.isArray(w.wpRows) ? w.wpRows.map(r => ({ vendor: 'House', subEach: '', ...r })) : []
  if (!rows.length) return [blankWpRow()]
  const firstReal = rows.find(r => r.type && r.type !== 'None')
  return [firstReal || rows[0]]
}
// Per-wall Finishes / Caps — normalized copies. Default to ONE neutral row so
// every wall opens with an empty Finishes + Caps line the user can fill or leave.
function initWallExtras(w = {}) {
  const fin = Array.isArray(w.finishRows) && w.finishRows.length
    ? w.finishRows.map(r => ({ ...r }))
    : [{ ...blankWallFinishRow(), type: 'None' }]
  const cap = Array.isArray(w.capRows) && w.capRows.length
    ? w.capRows.map(r => ({ vendor: 'House', subEach: '', ...r }))
    : [blankCapRow()]
  return { finishRows: fin, capRows: cap }
}
function initCmuWalls(src = {}) {
  // Footing + grout pumps are now per-wall; legacy estimates carried module-level
  // values (cmuFootingPump / cmuGroutPump) — inherit them onto each wall so
  // totals don't move.
  const legacyPump = src.cmuFootingPump ?? 'No'
  const legacyGrout = src.cmuGroutPump ?? 'No'
  if (src.cmuWalls)
    return src.cmuWalls.map(w => ({
      blockType: DEFAULT_BLOCK_NAME,
      vendor: 'House',
      subEach: '',
      ...w,
      footingPump: w.footingPump ?? legacyPump,
      groutPump: w.groutPump ?? legacyGrout,
      wpRows: initWallWp(w),
      ...initWallExtras(w),
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
        footingPump: legacyPump,
        groutPump: legacyGrout,
        subEach: '',
        wpRows: [blankWpRow()],
        finishRows: [{ ...blankWallFinishRow(), type: 'None' }],
        capRows: [blankCapRow()],
      },
    ]
  return [DEFAULT_CMU()]
}
function initPipWalls(src = {}) {
  // PIP footing pumped by default ('Yes' = ready-mix truck, matching the prior
  // always-truck behavior); the per-wall toggle can switch to hand mix.
  if (src.pipWalls)
    return src.pipWalls.map(w => ({
      vendor: 'House',
      subEach: '',
      ...w,
      footingPump: w.footingPump ?? 'Yes',
      wpRows: initWallWp(w),
      ...initWallExtras(w),
    }))
  if (src.pipLF !== undefined)
    return [
      {
        vendor: 'House',
        lf: src.pipLF,
        heightIn: src.pipHeightIn,
        footingPump: 'Yes',
        subEach: '',
        wpRows: [blankWpRow()],
        finishRows: [{ ...blankWallFinishRow(), type: 'None' }],
        capRows: [blankCapRow()],
      },
    ]
  return [DEFAULT_PIP()]
}
function initModularWalls(src = {}) {
  const legacyPump = src.modularFootingPump ?? 'No'
  if (src.modularWalls)
    return src.modularWalls.map(w => ({
      blockType: DEFAULT_BLOCK_NAME,
      vendor: 'House',
      subEach: '',
      ...w,
      footingPump: w.footingPump ?? legacyPump,
      wpRows: initWallWp(w),
      ...initWallExtras(w),
    }))
  return [DEFAULT_MODULAR()]
}
function initBrickWalls(src = {}) {
  const legacyPump = src.brickFootingPump ?? 'No'
  if (src.brickWalls)
    return src.brickWalls.map(w => ({
      blockType: DEFAULT_BLOCK_NAME,
      vendor: 'House',
      subEach: '',
      ...w,
      footingPump: w.footingPump ?? legacyPump,
      wpRows: initWallWp(w),
      ...initWallExtras(w),
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
      // Single wp per wall now — keep the first legacy line if the wall has none.
      const existing = (cmuWalls[0].wpRows || []).find(w => w.type && w.type !== 'None')
      cmuWalls[0].wpRows = [existing || legacyWp[0]]
    }
  }
  // Finishes & Caps are per-wall now. Old estimates stored one global list
  // (wallFinishRows / capRows) — fold the REAL (non-empty) rows onto the first
  // CMU wall so totals stay byte-for-byte identical. New estimates already carry
  // per-wall finishRows/capRows (detected below) and skip this.
  const anyWall = [
    ...(src.cmuWalls || []),
    ...(src.pipWalls || []),
    ...(src.modularWalls || []),
    ...(src.brickWalls || []),
  ]
  const isNewFormat = anyWall.some(w => Array.isArray(w.finishRows) || Array.isArray(w.capRows))
  if (!isNewFormat && cmuWalls[0]) {
    const legacyFinish = initWallFinishRows(src).filter(
      row => n(row.sf) > 0 || (row.rateIn != null && row.rateIn !== '')
    )
    const legacyCaps = (Array.isArray(src.capRows) ? src.capRows : [])
      .map(row => ({ vendor: 'House', subEach: '', ...row }))
      .filter(row => row.type && row.type !== 'None')
    if (legacyFinish.length)
      cmuWalls[0].finishRows = [...(cmuWalls[0].finishRows || []), ...legacyFinish]
    if (legacyCaps.length) cmuWalls[0].capRows = [...(cmuWalls[0].capRows || []), ...legacyCaps]
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
    manualRows: src.manualRows ?? DEFAULT_MANUAL_ROWS.map(r => ({ ...r })),
  }
}

// Vendors from `vendorOptions` that actually have a priced product in `subcat`
// (the Standard/House option is always kept). Prevents a vendor that only supplies
// one wall sub-type (e.g. Modular Wall) from appearing in another sub-type's picker
// (e.g. CMU Wall Block) just because both share the 'Walls' category.
function vendorOptsForSub(vendorOptions, materialRows, subcat) {
  if (!subcat) return vendorOptions || [{ value: 'House', label: 'Standard' }]
  const allowed = new Set(
    (materialRows || []).filter(r => r.sub_category === subcat && r.vendor_id).map(r => r.vendor_id)
  )
  return (vendorOptions || [{ value: 'House', label: 'Standard' }]).filter(
    o => o.value === 'House' || allowed.has(o.value)
  )
}

// ── Per-wall Waterproofing field ──────────────────────────────────────────────
// A SINGLE waterproofing line that is a standard field on every wall entry (it
// carries over with each wall the user adds). No add/remove — edits the wall's
// own wpRows[0] via onWpUpdate. "None" contributes nothing.
function WallWaterproofing({
  wpRows,
  vendorOptions,
  materialPrices,
  materialRows,
  isSub,
  refreshAllRates,
  onWpUpdate,
}) {
  const pp = usePricePrompt()
  const row = (Array.isArray(wpRows) && wpRows[0]) || blankWpRow()
  const rr = key => materialPrices?.[WALL_RATES[key].db] ?? WALL_RATES[key].fb
  const wpKey = WP_KEY[row.type]
  const wpc = computeWpRow(row, materialPrices, materialRows)
  // Live $/SF for the selected product (per vendor) — shown next to the SF field.
  const wpUnit =
    row.type && row.type !== 'None'
      ? catalogItemPrice(materialRows, WALL_WP_SUBCAT, row.type, row.vendor, wpKey ? WALL_RATES[wpKey].fb : 0)
      : 0
  // Built-in waterproofing types the calc supports + any real Waterproofing
  // catalog products for the vendor; stale/phantom values are dropped.
  const wpBase = WP_TYPES.filter(t => t !== 'None')
  const wpCatalog = wallCatalogTypes(materialRows, WALL_WP_SUBCAT, row.vendor)
  // Standard/House → built-in types (+ Standard catalog). A specific vendor →
  // ONLY that vendor's catalog products.
  const wpIsHouse = !row.vendor || row.vendor === 'House'
  const wpShown = wpIsHouse
    ? [...wpBase, ...wpCatalog.filter(t => !wpBase.includes(t))]
    : wpCatalog
  return (
    <div className="mt-3 border-t border-gray-100 pt-2">
      <label className="block text-xs text-gray-500 mb-1 font-medium">Waterproofing</label>
      <div className="flex items-center gap-1.5 flex-wrap">
        <DropdownSelect
          className="input text-sm py-1.5 flex-1 min-w-0"
          value={row.vendor || 'House'}
          onChange={v => {
            onWpUpdate(0, 'vendor', v)
            pp.check(materialRows, WALL_WP_SUBCAT, row.type, v)
          }}
          options={vendorOptsForSub(vendorOptions, materialRows, WALL_WP_SUBCAT)}
        />
        <DropdownSelect
          className="input text-sm py-1.5 flex-[1.5] min-w-0"
          value={row.type || 'None'}
          onChange={v => {
            onWpUpdate(0, 'type', v)
            pp.check(materialRows, WALL_WP_SUBCAT, v, row.vendor)
          }}
          options={[{ value: 'None', label: 'None' }, ...wpShown.map(t => ({ value: t, label: t }))]}
        />
        {/* SF is a PERMANENT field on the row — always shown, regardless of the
            selected type (a "None" row simply doesn't bill it). */}
        <NumInput
          value={row.sf}
          onChange={v => onWpUpdate(0, 'sf', v)}
          placeholder="0"
          className="w-20 shrink-0"
        />
        <span className="text-xs text-gray-400 shrink-0">SF</span>
        {row.type !== 'None' && (
          <span className="inline-flex items-center gap-1 text-xs text-gray-400 shrink-0">
            ${r2(wpUnit).toFixed(2)}/SF
          </span>
        )}
        {row.type !== 'None' && n(row.sf) > 0 && (
          <span className="text-xs text-gray-500 shrink-0">
            = <strong>{r2(wpc.mat).toFixed(2)}</strong> mat · {r2(wpc.hrs).toFixed(2)} hrs
          </span>
        )}
        {isSub && row.type !== 'None' && (
          <div className="relative w-24">
            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">$</span>
            <input
              type="number"
              step="any"
              className="input text-sm py-1.5 pl-5 w-full"
              placeholder={r2(wpc.subUnit).toString()}
              value={row.subEach ?? ''}
              onChange={e => onWpUpdate(0, 'subEach', e.target.value)}
            />
          </div>
        )}
      </div>
      {pp.prompt && (
        <MissingPriceModal {...pp.prompt} onClose={pp.close} onSaved={refreshAllRates} />
      )}
    </div>
  )
}

// ── Per-wall Finishes editor ──────────────────────────────────────────────────
// Add / edit / remove finish rows scoped to one wall. Math is identical to the
// original global section — only the row source is per-wall. Handlers:
//   onPatch(i, patch, recompute) · onAdd() · onRemove(i)
function WallFinishesEditor({
  rows = [],
  onPatch,
  onAdd,
  onRemove,
  vendorOptions,
  materialRows,
  refreshAllRates,
}) {
  const pp = usePricePrompt()
  return (
    <div className="mt-3 border-t border-gray-100 pt-2">
      <label className="block text-xs text-gray-500 mb-1 font-medium">Finishes</label>
      <div className="space-y-1.5">
        {rows.map((row, i) => {
          // Item list = the built-in finish types the calc supports, plus any
          // real Wall Finish catalog products for the selected vendor. Stale
          // saved values that are neither are dropped (not surfaced as phantoms).
          const catalog = wallCatalogTypes(materialRows, WALL_FINISH_SUBCAT, row.vendor)
          // Standard/House → built-in finishes (+ Standard catalog). A specific
          // vendor → ONLY that vendor's catalog products.
          const finIsHouse = !row.vendor || row.vendor === 'House'
          const shown = finIsHouse
            ? [...WALL_FINISH_TYPES, ...catalog.filter(t => !WALL_FINISH_TYPES.includes(t))]
            : catalog
          return (
            <div key={i} className="flex items-center gap-1.5">
              <DropdownSelect
                className="input text-sm py-1 flex-1 min-w-0"
                value={row.vendor || 'House'}
                onChange={v => {
                  onPatch(i, { vendor: v }, true)
                  pp.check(materialRows, WALL_FINISH_SUBCAT, row.type, v)
                }}
                options={vendorOptsForSub(vendorOptions, materialRows, WALL_FINISH_SUBCAT)}
              />
              <DropdownSelect
                className="input text-sm py-1 flex-[1.5] min-w-0"
                value={row.type || 'None'}
                onChange={v => {
                  onPatch(i, { type: v }, true)
                  pp.check(materialRows, WALL_FINISH_SUBCAT, v, row.vendor)
                }}
                options={[{ value: 'None', label: 'None' }, ...shown.map(t => ({ value: t, label: t }))]}
              />
              <NumInput
                value={row.sf}
                onChange={v => onPatch(i, { sf: v }, false)}
                placeholder="0"
                className="w-20 shrink-0"
              />
              <span className="text-xs text-gray-400 shrink-0">SF</span>
              <button
                type="button"
                onClick={() => onRemove(i)}
                className="text-gray-300 hover:text-red-500 text-sm px-1 shrink-0"
                title="Remove row"
              >
                ✕
              </button>
            </div>
          )
        })}
        <button
          type="button"
          onClick={onAdd}
          className="mt-1 text-xs px-2 py-1 rounded bg-slate-100 text-slate-700 hover:bg-slate-200"
        >
          + Add finish
        </button>
      </div>
      {pp.prompt && (
        <MissingPriceModal {...pp.prompt} onClose={pp.close} onSaved={refreshAllRates} />
      )}
    </div>
  )
}

// ── Per-wall Caps editor ──────────────────────────────────────────────────────
// Add / edit / remove cap rows scoped to one wall. Identical cap math.
function WallCapsEditor({ rows = [], onPatch, onAdd, onRemove, vendorOptions, materialRows, refreshAllRates }) {
  const pp = usePricePrompt()
  return (
    <div className="mt-3 border-t border-gray-100 pt-2">
      <label className="block text-xs text-gray-500 mb-1 font-medium">Caps</label>
      <div className="space-y-1.5">
        {rows.map((row, i) => {
          // Built-in cap types the calc supports + any real Wall Cap catalog
          // products for the vendor; stale/phantom values are dropped.
          const capBase = CAP_TYPES.filter(t => t !== 'None')
          const catalog = wallCatalogTypes(materialRows, WALL_CAP_SUBCAT, row.vendor)
          // Standard/House → built-in types (+ any Standard catalog). A specific
          // vendor → ONLY that vendor's catalog products (don't append built-ins).
          const capIsHouse = !row.vendor || row.vendor === 'House'
          const shown = capIsHouse
            ? [...capBase, ...catalog.filter(t => !capBase.includes(t))]
            : catalog
          const qtyLabel = row.type === 'Precast' ? 'Qty' : 'LF'
          return (
            <div key={i} className="flex items-center gap-1.5">
              <DropdownSelect
                className="input text-sm py-1 flex-1 min-w-0"
                value={row.vendor || 'House'}
                onChange={v => {
                  onPatch(i, { vendor: v }, true)
                  pp.check(materialRows, WALL_CAP_SUBCAT, row.type, v)
                }}
                options={vendorOptsForSub(vendorOptions, materialRows, WALL_CAP_SUBCAT)}
              />
              <DropdownSelect
                className="input text-sm py-1 flex-[1.5] min-w-0"
                value={row.type || 'None'}
                onChange={v => {
                  onPatch(i, { type: v }, true)
                  pp.check(materialRows, WALL_CAP_SUBCAT, v, row.vendor)
                }}
                options={[{ value: 'None', label: 'None' }, ...shown.map(t => ({ value: t, label: t }))]}
              />
              <NumInput
                value={row.widthIn}
                onChange={v => onPatch(i, { widthIn: v }, true)}
                placeholder={row.type === 'Precast' ? '8' : '4'}
                className="w-16 shrink-0"
              />
              <span className="text-xs text-gray-400 shrink-0">W&quot;</span>
              <NumInput
                value={row.type === 'Precast' ? row.qty : row.lf}
                onChange={v =>
                  onPatch(i, row.type === 'Precast' ? { qty: v } : { lf: v }, false)
                }
                placeholder="0"
                className="w-20 shrink-0"
              />
              <span className="text-xs text-gray-400 shrink-0">{qtyLabel}</span>
              <button
                type="button"
                onClick={() => onRemove(i)}
                className="text-gray-300 hover:text-red-500 text-sm px-1 shrink-0"
                title="Remove row"
              >
                ✕
              </button>
            </div>
          )
        })}
        <button
          type="button"
          onClick={onAdd}
          className="mt-1 text-xs px-2 py-1 rounded bg-slate-100 text-slate-700 hover:bg-slate-200"
        >
          + Add cap
        </button>
      </div>
      {pp.prompt && (
        <MissingPriceModal {...pp.prompt} onClose={pp.close} onSaved={refreshAllRates} />
      )}
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
  finishHandlers,
  capHandlers,
}) {
  const pp = usePricePrompt()
  const set = field => val => onChange(idx, field, val)
  const hasData = n(wall.lf) > 0 && n(wall.heightIn) > 0
  // Catalog-driven Block Type: the selected vendor's "Wall Block" products.
  const blockOpts = wallBlockOptions(materialRows, wall.vendor)
  // Legacy estimate: blockType is a built-in size name, not a catalog id — keep
  // it selectable + priced off the built-in catalog so old bids don't move.
  const legacyBlock =
    wall.blockType && !blockOpts.some(o => o.id === wall.blockType)
      ? CMU_BLOCK_TYPES.find(b => b.name === wall.blockType)
      : null
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
          <DropdownSelect
            className="input text-sm py-1.5 w-full"
            value={wall.vendor || 'House'}
            onChange={nv => {
              set('vendor')(nv)
              // Point Block Type at a block this vendor actually offers.
              const opts = wallBlockOptions(materialRows, nv)
              if (opts.length && !opts.some(o => o.id === wall.blockType))
                set('blockType')(opts[0].id)
            }}
            options={vendorOptsForSub(vendorOptions, materialRows, WALL_BLOCK_SUBCAT)}
          />
        </div>
        {/* Block Type — the selected vendor's "Wall Block" catalog products
            (dims from calc_meta drive the block-count math). */}
        <div className="col-span-2">
          <label className="block text-xs text-gray-500 mb-1">Block Type</label>
          <DropdownSelect
            className="input text-sm py-1.5 w-full"
            value={wall.blockType || ''}
            onChange={v => {
              set('blockType')(v)
              pp.checkById(materialRows, v, wall.vendor)
            }}
            placeholder={blockOpts.length === 0 && !legacyBlock ? 'No block types for this vendor' : 'Select…'}
            options={[
              ...(legacyBlock
                ? [
                    {
                      value: legacyBlock.name,
                      label: `${legacyBlock.name} — ${legacyBlock.w}×${legacyBlock.h}×${legacyBlock.l}`,
                    },
                  ]
                : []),
              ...blockOpts.map(o => {
                const cm = o.calc_meta || {}
                const w = n(cm.block_w_in) || n(o.block_w_in) || 8
                const h = n(cm.block_h_in) || n(o.block_h_in) || 8
                const l = n(cm.block_l_in) || n(o.block_l_in) || 16
                return { value: o.id, label: `${o.name} — ${w}×${h}×${l}` }
              }),
            ]}
          />
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
        <div className="col-span-2 sm:col-span-1">
          <label className="block text-xs text-gray-500 mb-1">Pump for Footing?</label>
          <DropdownSelect
            className="input text-sm py-1.5 w-full"
            value={wall.footingPump || 'No'}
            onChange={v => set('footingPump')(v)}
            options={[{ value: 'No', label: 'No' }, { value: 'Yes', label: 'Yes' }]}
          />
        </div>
        <div className="col-span-2 sm:col-span-1">
          <label className="block text-xs text-gray-500 mb-1">Pump for Grouting?</label>
          <DropdownSelect
            className="input text-sm py-1.5 w-full"
            value={wall.groutPump || 'No'}
            onChange={v => set('groutPump')(v)}
            options={[{ value: 'No', label: 'No' }, { value: 'Yes', label: 'Yes' }]}
          />
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
      <WallCapsEditor
        rows={wall.capRows || []}
        vendorOptions={vendorOptions}
        materialPrices={materialPrices}
        materialRows={materialRows}
        isSub={isSub}
        refreshAllRates={refreshAllRates}
        {...(capHandlers || {})}
      />
      <WallFinishesEditor
        rows={wall.finishRows || []}
        vendorOptions={vendorOptions}
        materialPrices={materialPrices}
        materialRows={materialRows}
        isSub={isSub}
        refreshAllRates={refreshAllRates}
        {...(finishHandlers || {})}
      />
      <WallWaterproofing
        wpRows={wall.wpRows}
        vendorOptions={vendorOptions}
        materialPrices={materialPrices}
        materialRows={materialRows}
        isSub={isSub}
        refreshAllRates={refreshAllRates}
        onWpUpdate={onWpUpdate}
      />
      {pp.prompt && (
        <MissingPriceModal {...pp.prompt} onClose={pp.close} onSaved={refreshAllRates} />
      )}
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
  concreteVendorOptions,
  isSub,
  materialPrices,
  materialRows,
  refreshAllRates,
  onWpUpdate,
  finishHandlers,
  capHandlers,
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
          <label className="block text-xs text-gray-500 mb-1">Concrete Vendor</label>
          <DropdownSelect
            className="input text-sm py-1.5 w-full"
            value={wall.vendor || 'House'}
            onChange={v => set('vendor')(v)}
            options={concreteVendorOptions || [{ value: 'House', label: 'Standard' }]}
          />
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
        <div className="col-span-2 sm:col-span-1">
          <label className="block text-xs text-gray-500 mb-1">Pump for Footing?</label>
          <DropdownSelect
            className="input text-sm py-1.5 w-full"
            value={wall.footingPump || 'Yes'}
            onChange={v => set('footingPump')(v)}
            options={[{ value: 'No', label: 'No' }, { value: 'Yes', label: 'Yes' }]}
          />
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
      <WallCapsEditor
        rows={wall.capRows || []}
        vendorOptions={vendorOptions}
        materialPrices={materialPrices}
        materialRows={materialRows}
        isSub={isSub}
        refreshAllRates={refreshAllRates}
        {...(capHandlers || {})}
      />
      <WallFinishesEditor
        rows={wall.finishRows || []}
        vendorOptions={vendorOptions}
        materialPrices={materialPrices}
        materialRows={materialRows}
        isSub={isSub}
        refreshAllRates={refreshAllRates}
        {...(finishHandlers || {})}
      />
      <WallWaterproofing
        wpRows={wall.wpRows}
        vendorOptions={vendorOptions}
        materialPrices={materialPrices}
        materialRows={materialRows}
        isSub={isSub}
        refreshAllRates={refreshAllRates}
        onWpUpdate={onWpUpdate}
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
  finishHandlers,
  capHandlers,
  // Modular tab passes { label:'Wall Type', subcat:'Modular Wall', master:true }
  // to source options from the master list. Brick omits it → legacy CMU catalog.
  typeSource = { label: 'Block Type', master: false },
}) {
  const set = field => val => onChange(idx, field, val)
  const pp = usePricePrompt()
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
          <DropdownSelect
            className="input text-sm py-1.5 w-full"
            value={wall.vendor || (typeSource.master ? vendorOptions?.[0]?.value : undefined) || 'House'}
            onChange={v => {
              set('vendor')(v)
              if (typeSource.master) {
                const first = (materialRows || []).find(
                  r => r.sub_category === typeSource.subcat && (v === 'House' ? r.vendor_id == null : r.vendor_id === v)
                )
                set('blockType')(first ? first.id : '')
              }
            }}
            options={vendorOptsForSub(vendorOptions, materialRows, typeSource?.subcat || WALL_BLOCK_SUBCAT)}
          />
        </div>
        <div className="col-span-2">
          <label className="block text-xs text-gray-500 mb-1">{typeSource.label}</label>
          {typeSource.master
            ? (() => {
                // Options + price come live from the master list (marker =
                // sub_category). Add a product in Master Rates and it appears here.
                // Vendor-first: the selected vendor's Modular Wall products.
                const _vsel = wall.vendor && wall.vendor !== 'House' ? wall.vendor : vendorOptions?.[0]?.value
                const opts = (materialRows || [])
                  .filter(
                    r =>
                      r.sub_category === typeSource.subcat &&
                      (_vsel === 'House' ? r.vendor_id == null : r.vendor_id === _vsel)
                  )
                  .map(r => ({ id: r.id, label: r.name, row: r }))
                const selRow = opts.find(o => o.row.id === wall.blockType)?.row || opts[0]?.row
                const price = n(selRow?.unit_cost)
                return (
                  <>
                    <DropdownSelect
                      className="input text-sm py-1.5 w-full"
                      value={selRow?.id ?? ''}
                      onChange={v => {
                        set('blockType')(v)
                        pp.checkById(materialRows, v, wall.vendor)
                      }}
                      placeholder={opts.length === 0 ? 'No products — add one in Master Rates' : 'Select…'}
                      options={opts.map(o => ({
                        value: o.id,
                        label: `${o.label}${
                          n(o.row?.calc_meta?.block_w_in) || n(o.row?.block_w_in)
                            ? ` — ${n(o.row.calc_meta?.block_w_in) || n(o.row.block_w_in)}×${n(o.row.calc_meta?.block_h_in) || n(o.row.block_h_in)}×${n(o.row.calc_meta?.block_l_in) || n(o.row.block_l_in)}`
                            : ''
                        }`,
                      }))}
                    />
                  </>
                )
              })()
            : (
                <DropdownSelect
                  className="input text-sm py-1.5 w-full"
                  value={wall.blockType || ''}
                  onChange={v => set('blockType')(v)}
                  options={CMU_BLOCK_TYPES.map(bt => ({
                    value: bt.name,
                    label: `${bt.name} — ${bt.w}×${bt.h}×${bt.l}`,
                  }))}
                />
              )}
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
        <div className="col-span-2 sm:col-span-1">
          <label className="block text-xs text-gray-500 mb-1">Pump for Footing?</label>
          <DropdownSelect
            className="input text-sm py-1.5 w-full"
            value={wall.footingPump || 'No'}
            onChange={v => set('footingPump')(v)}
            options={[{ value: 'No', label: 'No' }, { value: 'Yes', label: 'Yes' }]}
          />
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
      <WallCapsEditor
        rows={wall.capRows || []}
        vendorOptions={vendorOptions}
        materialPrices={materialPrices}
        materialRows={materialRows}
        isSub={isSub}
        refreshAllRates={refreshAllRates}
        {...(capHandlers || {})}
      />
      <WallFinishesEditor
        rows={wall.finishRows || []}
        vendorOptions={vendorOptions}
        materialPrices={materialPrices}
        materialRows={materialRows}
        isSub={isSub}
        refreshAllRates={refreshAllRates}
        {...(finishHandlers || {})}
      />
      <WallWaterproofing
        wpRows={wall.wpRows}
        vendorOptions={vendorOptions}
        materialPrices={materialPrices}
        materialRows={materialRows}
        isSub={isSub}
        refreshAllRates={refreshAllRates}
        onWpUpdate={onWpUpdate}
      />
      {pp.prompt && (
        <MissingPriceModal {...pp.prompt} onClose={pp.close} onSaved={refreshAllRates} />
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
  } = useNewMaterialCatalog([WALLS_CATEGORY, BASIC_CATEGORY, CONCRETE_CATEGORY], {
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
  const manualRows = cur.manualRows
  const setManualRows = setField('manualRows')

  // Per-wall waterproofing: single line, edits the wall's own wpRows[0].
  const makeWpHandlers = (setWalls, wallIdx) => ({
    onWpUpdate: (wpIdx, field, val) =>
      setWalls(ws =>
        ws.map((w, i) =>
          i === wallIdx
            ? {
                ...w,
                wpRows: (w.wpRows && w.wpRows.length ? w.wpRows : [blankWpRow()]).map((r, j) =>
                  j === wpIdx ? { ...r, [field]: val } : r
                ),
              }
            : w
        )
      ),
  })

  // Per-wall Finishes / Caps handlers. `field` is 'finishRows' | 'capRows';
  // `compute` recomputes the Sub flat default when a driving input changes.
  const makeRowHandlers = (setWalls, wallIdx, field, blank, compute) => ({
    onPatch: (rowIdx, patch, recompute) =>
      setWalls(ws =>
        ws.map((w, i) =>
          i === wallIdx
            ? {
                ...w,
                [field]: (w[field] || []).map((row, j) => {
                  if (j !== rowIdx) return row
                  const next = { ...row, ...patch }
                  if (recompute && isSub)
                    next.subEach = String(r2(compute(next, materialPrices, materialRows).subUnit))
                  return next
                }),
              }
            : w
        )
      ),
    onAdd: () =>
      setWalls(ws =>
        ws.map((w, i) => (i === wallIdx ? { ...w, [field]: [...(w[field] || []), blank()] } : w))
      ),
    onRemove: rowIdx =>
      setWalls(ws =>
        ws.map((w, i) =>
          i === wallIdx ? { ...w, [field]: (w[field] || []).filter((_, j) => j !== rowIdx) } : w
        )
      ),
  })
  const makeFinishHandlers = (setWalls, wallIdx) =>
    makeRowHandlers(setWalls, wallIdx, 'finishRows', blankWallFinishRow, computeWallFinishRow)
  const makeCapHandlers = (setWalls, wallIdx) =>
    makeRowHandlers(setWalls, wallIdx, 'capRows', blankCapRow, computeCapRow)

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

  // Full rate list for the "View Rates" popup, broken down by wall type. Groups
  // flagged with `catalogSubcat` prepend that sub-category's actual catalog block
  // products (per vendor), editable via material_price — so the vendor and its
  // real price show, not the retired built-in list.
  const catalogBlockItems = subcat =>
    (materialRows || [])
      .filter(r0 => r0.sub_category === subcat)
      .sort(
        (a, b) =>
          (a.name || '').localeCompare(b.name || '') ||
          (vendorNames[a.vendor_id] || 'Standard').localeCompare(vendorNames[b.vendor_id] || 'Standard')
      )
      .map(r0 => ({
        label: `${r0.name} — ${r0.vendor_id ? vendorNames[r0.vendor_id] || 'Vendor' : 'Standard'}`,
        table: 'material_price',
        materialId: r0.id,
        vendorId: r0.vendor_id || undefined,
        category: 'Walls',
        unitLabel: r0.unit || 'ea',
        mode: 'currency',
        value: n(r0.unit_cost),
      }))
  const wallRateList = WALL_RATE_SPECS.map(g => ({
    group: g.group,
    items: [
      ...(g.catalogSubcat ? catalogBlockItems(g.catalogSubcat) : []),
      ...g.items.map(([key, label, category, unit, mode]) => ({
        label,
        table: mode === 'coefficient' ? 'labor_rates' : 'material_rates',
        name: WALL_RATES[key].db,
        category,
        unitLabel: unit,
        mode,
        value: r(key),
      })),
    ],
  }))

  // ── Vendor helpers ──────────────────────────────────────────────────────────
  const vendorOptions = vendorOptionsForCategory(WALLS_CATEGORY)
  // PIP "Concrete Vendor" list — only vendors that supply the Concrete Mix
  // sub-category (Standard always first).
  const concreteVendorOptions = vendorOptionsForCategory(CONC_MIX_SUBCAT)
  // Modular Wall vendors — derived from the products themselves (reclassified
  // items may not be tagged 'Walls' at the vendor level). Enables vendor-first
  // picking: choose a vendor, then that vendor's Modular Wall types.
  const modularVendorOptions = (() => {
    const rows = (materialRows || []).filter(r => r.sub_category === MODULAR_SUBCAT)
    const ids = [...new Set(rows.filter(r => r.vendor_id).map(r => r.vendor_id))]
    const out = ids.map(id => ({ value: id, label: vendorNames[id] || 'Vendor' }))
    if (rows.some(r => r.vendor_id == null)) out.unshift({ value: 'House', label: 'Standard' })
    return out
  })()

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


  return (
    <SubTabContext.Provider value={isSub}>
    <div className="space-y-5">
      {/* ── Frozen header: GPMD bar + Crew Type / View Rates bar ── */}
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
            title="Walls"
            rates={wallRateList}
            refreshAllRates={refreshAllRates}
            showInlineToggle={false}
          />
        </div>
      </div>

      <ModuleHeaderSlot>
        <WorkTypeChooser value={subType || 'In-House'} onChange={setSubType} compact />
      </ModuleHeaderSlot>

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
              finishHandlers={makeFinishHandlers(setCmuWalls, idx)}
              capHandlers={makeCapHandlers(setCmuWalls, idx)}
            />
          ))}

          <button
            onClick={addCmuWall}
            className="w-full py-2 rounded-lg border border-dashed border-green-400 text-green-700 text-sm font-medium hover:bg-green-50 transition-colors mb-3"
          >
            + Add Another CMU Wall
          </button>

          {/* Footing + grout pumps are now set per wall in each Wall entry above. */}
        </div>
      )}

      {/* ── PIP Walls ── */}
      {wallType === 'PIP' && (
        <div>
          <SectionHeader title="Poured In Place Walls" />

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
              concreteVendorOptions={concreteVendorOptions}
              isSub={isSub}
              materialPrices={materialPrices}
              materialRows={materialRows}
              refreshAllRates={refreshAllRates}
              {...makeWpHandlers(setPipWalls, idx)}
              finishHandlers={makeFinishHandlers(setPipWalls, idx)}
              capHandlers={makeCapHandlers(setPipWalls, idx)}
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
          <SectionHeader title="Modular Walls" />

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
              vendorOptions={modularVendorOptions}
              isSub={isSub}
              refreshAllRates={refreshAllRates}
              typeSource={{ label: 'Wall Type', subcat: MODULAR_SUBCAT, master: true }}
              {...makeWpHandlers(setModularWalls, idx)}
              finishHandlers={makeFinishHandlers(setModularWalls, idx)}
              capHandlers={makeCapHandlers(setModularWalls, idx)}
            />
          ))}

          <button
            onClick={addModularWall}
            className="w-full py-2 rounded-lg border border-dashed border-green-400 text-green-700 text-sm font-medium hover:bg-green-50 transition-colors mb-3"
          >
            + Add Another Modular Wall
          </button>

          {/* Footing pump is now set per wall in each Wall entry above. */}
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
              typeSource={{ label: 'Block Type', subcat: WALL_BLOCK_SUBCAT, master: true }}
              {...makeWpHandlers(setBrickWalls, idx)}
              finishHandlers={makeFinishHandlers(setBrickWalls, idx)}
              capHandlers={makeCapHandlers(setBrickWalls, idx)}
            />
          ))}

          <button
            onClick={addBrickWall}
            className="w-full py-2 rounded-lg border border-dashed border-green-400 text-green-700 text-sm font-medium hover:bg-green-50 transition-colors mb-3"
          >
            + Add Another Brick Wall
          </button>

          {/* Footing pump is now set per wall in each Wall entry above. */}
        </div>
      )}

      {/* ── Timber Wall (single) ── */}
      {wallType === 'Timber' && (
        <div>
          <SectionHeader title="Timber / Lumber Wall" />
          <div className="mb-3">
            <label className="block text-xs text-gray-500 mb-1">Timber Type</label>
            <DropdownSelect
              className="input text-sm py-1.5 w-full"
              value={timberType}
              onChange={v => setTimberType(v)}
              options={[
                { value: 'Railroad Treated', label: 'Railroad Treated' },
                { value: 'Douglas Fir 6×6', label: 'Douglas Fir 6×6' },
                { value: 'Cedar 6×6', label: 'Cedar 6×6' },
                { value: 'Redwood 6×6', label: 'Redwood 6×6' },
              ]}
            />
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

      {/* Finishes, Caps & Waterproofing are now specified inside each wall entry
          above (per wall) — no separate global sections. */}

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
