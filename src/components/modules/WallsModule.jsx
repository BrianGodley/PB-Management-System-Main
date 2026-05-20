import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import GpmdBar from './GpmdBar'
import RateEditPopover from '../RateEditPopover'
import { fetchSalesTaxRate } from '../../lib/companyDefaults'

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
  { name: '8x8x16 (GREY)',         w: 8,  h: 8, l: 16, spec: 24, price: 2.59 },
  { name: '8x8x16 SPLITFACE',      w: 8,  h: 8, l: 16, spec: 24, price: 5.19 },
  { name: '8x8x16 (COLOR)',        w: 8,  h: 8, l: 16, spec: 24, price: 6.19 },
  { name: '8x6x16 SLUMP (GREY)',   w: 8,  h: 6, l: 16, spec: 20, price: 4.09 },
  { name: '8x6x16 SLUMP (COLOR)',  w: 8,  h: 6, l: 16, spec: 20, price: 4.59 },
  { name: '12x8x16 (GREY)',        w: 12, h: 8, l: 16, spec: 16, price: 5.39 },
  { name: '12x8x16 SPLITFACE',     w: 12, h: 8, l: 16, spec: 16, price: 7.59 },
  { name: '12x8x16 (COLOR)',       w: 12, h: 8, l: 16, spec: 16, price: 6.39 },
  { name: '12x6x16 SLUMP (COLOR)', w: 12, h: 6, l: 16, spec: 14, price: 8.60 },
  { name: '12x6x16 SLUMP (GREY)',  w: 12, h: 6, l: 16, spec: 14, price: 7.89 },
  { name: '6x8x16 (GREY)',         w: 6,  h: 8, l: 16, spec: 28, price: 2.13 },
  { name: '6x8x16 SPLITFACE',      w: 6,  h: 8, l: 16, spec: 28, price: 4.59 },
  { name: '6x8x16 (COLOR)',        w: 6,  h: 8, l: 16, spec: 28, price: 2.59 },
  { name: '6x6x16 SLUMP (COLOR)',  w: 6,  h: 6, l: 16, spec: 26, price: 3.00 },
  { name: '6x6x16 SLUMP (GREY)',   w: 6,  h: 6, l: 16, spec: 26, price: 3.01 },
]
const DEFAULT_BLOCK_NAME = '8x8x16 (GREY)'
function blockByName(name) {
  return CMU_BLOCK_TYPES.find(b => b.name === name) || CMU_BLOCK_TYPES[0]
}
// Master-rates row name for a given block type. If an admin overrides the
// price via RateEditPopover the row is stored under this name in the
// material_rates table (category='Walls'). When no override exists, the
// calc falls back to the catalog's default price.
function wallBlockRateName(name) { return `Wall Block ${name}` }
function groutCyPerBlock(b) {
  // Same formula as the Excel ((L-2) × H × (W-2)) in³ → yd³
  return ((b.l - 2) * b.h * (b.w - 2)) / 1728 / 27
}

const WALL_RATES = {
  greyBlock:       { db: 'Wall Grey Block',                 fb: 2.59   },
  bondbeamBlock:   { db: 'Wall Bondbeam Block',             fb: 2.59   },
  rebar:           { db: 'Wall Rebar',                      fb: 1.399  },
  concreteHand:    { db: 'Wall Concrete Hand Mix',          fb: 92.00  },
  concreteTruck:   { db: 'Wall Concrete Truck',             fb: 185.00 },
  groutPumpSetup:  { db: 'Wall Grout Pump Setup',           fb: 402.50 },
  groutPumpPerYd:  { db: 'Wall Grout Pump Per Yard',        fb: 9.20   },
  digLab:          { db: 'Wall Dig Footing Labor Rate',     fb: 4.0    },
  rebarLab:        { db: 'Wall Set Rebar Labor Rate',       fb: 35.0   },
  blockLab:        { db: 'Wall Set Block Labor Rate',       fb: 10.4   },
  handGroutLab:    { db: 'Wall Hand Grout Labor Rate',      fb: 5.5    },
  pumpGroutLab:    { db: 'Wall Pump Grout Labor Rate',      fb: 81.0   },
  setupCleanLab:   { db: 'Wall Setup Clean Labor Rate',     fb: 30.0   },
  sandStucco:      { db: 'Sand Stucco - Wall',              fb: 0.00   },
  smoothStucco:    { db: 'Smooth Stucco - Wall',            fb: 0.00   },
  ledgerstone:     { db: 'Ledgerstone - Wall',              fb: 10.00  },
  stackedStone:    { db: 'Stacked Stone - Wall',            fb: 10.00  },
  tile:            { db: 'Tile - Wall',                     fb: 6.50   },
  flagstone:       { db: 'Real Flagstone - Wall',           fb: 400.00 },
  realStone:       { db: 'Real Stone - Wall',               fb: 400.00 },
  sandStuccoLab:   { db: 'Sand Stucco - Wall Labor Rate',   fb: 92     },
  smoothStuccoLab: { db: 'Smooth Stucco - Wall Labor Rate', fb: 65     },
  ledgerstoneLab:  { db: 'Ledgerstone - Wall Labor Rate',   fb: 24     },
  stackedStoneLab: { db: 'Stacked Stone - Wall Labor Rate', fb: 24     },
  tileLab:         { db: 'Tile - Wall Labor Rate',          fb: 0.2867 },
  flagstoneLab:    { db: 'Real Flagstone - Wall Labor Rate',fb: 0.4487 },
  realStoneLab:    { db: 'Real Stone - Wall Labor Rate',    fb: 0.8954 },
  capFlagstone:    { db: 'Wall Cap Flagstone',              fb: 500.00 },
  capPrecast:      { db: 'Wall Cap Precast',                fb: 50.00  },
  capBullnose:     { db: 'Wall Cap Bullnose Brick',         fb: 5.00   },
  wpPrimerMembrane:{ db: 'Wall WP Primer Membrane',         fb: 1.80   },
  wp3CoatRollOn:   { db: 'Wall WP 3 Coat Roll On',          fb: 1.20   },
  wpThoroseal:     { db: 'Wall WP Thoroseal Roll On',       fb: 1.50   },
  wpDimpleMembrane:{ db: 'Wall WP Dimple Membrane',         fb: 2.10   },
}

const DEFAULTS = { laborRatePerHour: 35, laborBurdenPct: 0.29, gpmd: 425, commissionRate: 0.12 }
const n = (v) => parseFloat(v) || 0

// Default entries
const DEFAULT_CMU = () => ({
  blockType: DEFAULT_BLOCK_NAME,
  lf: '', heightIn: '', footingWIn: '12', footingDIn: '12',
  rebarSpIn: '16', horizBars: '2', bondBeams: '1',
  pctGrouted: '100', pctCurved: '0',
})
const DEFAULT_PIP = () => ({ lf: '', heightIn: '' })

// ── Per-wall calculators ──────────────────────────────────────────────────────
function calcOneCMU(wall, footingPump, groutPump, r, mp = {}) {
  const { blockType, lf, heightIn, footingWIn, footingDIn, rebarSpIn, horizBars, bondBeams, pctGrouted, pctCurved } = wall
  if (!n(lf) || !n(heightIn)) return { hrs: 0, mat: 0, detail: null }

  // Selected block type drives both DIMENSIONS (how many blocks per course /
  // per wall height) and PRICE (grey block unit cost). Price prefers a
  // master_rates override (set via the Edit Rates popover) and falls back to
  // the catalog default. Falls back to the default 8x8x16 grey block if
  // blockType is missing (legacy walls).
  const b = blockByName(blockType)
  const blockPrice = mp[wallBlockRateName(b.name)] ?? b.price
  const blocksPerCourse = Math.ceil((n(lf) * 12) / b.l)
  const totalCourses    = Math.ceil(n(heightIn) / b.h)
  const bbCourses       = Math.min(n(bondBeams), totalCourses)
  const regCourses      = Math.max(0, totalCourses - bbCourses)
  const rawBlocks       = blocksPerCourse * totalCourses
  const orderGreyBlock  = Math.ceil(blocksPerCourse * regCourses * 1.10)
  const orderBBBlock    = Math.ceil(blocksPerCourse * bbCourses  * 1.10)

  const footingCF  = (n(footingWIn) / 12) * (n(footingDIn) / 12) * n(lf)
  const footingCY  = footingCF / 27
  const groutCY    = rawBlocks * groutCyPerBlock(b) * (n(pctGrouted) / 100)
  const groutCF    = groutCY * 27

  const vertRebars   = n(rebarSpIn) > 0 ? Math.ceil((n(lf) * 12) / n(rebarSpIn)) : 0
  const vertRebarLF  = vertRebars * (n(heightIn) + n(footingDIn)) / 12
  const horizRebarLF = (n(horizBars) + bbCourses) * n(lf)
  const totalRebarLF = vertRebarLF + horizRebarLF

  const groutRate  = groutPump === 'Yes' ? r('pumpGroutLab') : r('handGroutLab')
  const structBase = (footingCF > 0 ? footingCF / r('digLab') : 0)
                   + (totalRebarLF > 0 ? totalRebarLF / r('rebarLab') : 0)
                   + (footingCY > 0 ? footingCY / 0.2037 : 0)
                   + (rawBlocks > 0 ? rawBlocks / r('blockLab') : 0)
                   + (groutCF > 0 ? groutCF / groutRate : 0)
                   + n(lf) / r('setupCleanLab')
  const curveAdd   = structBase * (n(pctCurved) / 100) * 0.50
  const hrs        = structBase + curveAdd

  const footConcrPrc     = footingPump === 'Yes' ? r('concreteTruck') : r('concreteHand')
  const groutConcrPrc    = groutPump   === 'Yes' ? r('concreteTruck') : r('concreteHand')
  // Grey block price comes from the selected block type's catalog entry
  // (mirroring the Excel VLOOKUP into the CmuBlockPrices table). Bond-beam
  // block stays on the flat master rate — there's only one BB SKU.
  const mat = orderGreyBlock * blockPrice
            + orderBBBlock   * r('bondbeamBlock')
            + totalRebarLF   * r('rebar')
            + footingCY      * footConcrPrc
            + (footingPump === 'Yes' ? r('groutPumpSetup') : 0)
            + groutCY        * groutConcrPrc
            + (groutPump === 'Yes' && groutCY > 0 ? r('groutPumpSetup') + groutCY * r('groutPumpPerYd') : 0)

  return { hrs, mat, detail: { orderGreyBlock, orderBBBlock, footingCY, groutCY, totalRebarLF, curveAdd } }
}

function calcOnePIP(wall, r) {
  const { lf, heightIn } = wall
  if (!n(lf) || !n(heightIn)) return { hrs: 0, mat: 0, concCY: 0 }
  const addlCourses = Math.max(0, Math.ceil((n(heightIn) - 6) / 6))
  const hrs   = n(lf) * (1.0833 + addlCourses * 1.6167)
  const concCY = n(lf) * (0.2833 + addlCourses * 0.3667)
  const mat   = concCY * r('concreteTruck')
  return { hrs, mat, concCY }
}

// ── Main calc ─────────────────────────────────────────────────────────────────
function calcWalls(state, lrph = DEFAULTS.laborRatePerHour, mp = {}, gpmd = DEFAULTS.gpmd) {
  const r = (key) => mp[WALL_RATES[key].db] ?? WALL_RATES[key].fb

  let structuralHrs = 0, structuralMat = 0
  let cmuDetails = [], pipDetails = []

  if (state.wallType === 'CMU') {
    ;(state.cmuWalls || []).forEach(wall => {
      const res = calcOneCMU(wall, state.cmuFootingPump, state.cmuGroutPump, r, mp)
      structuralHrs += res.hrs
      structuralMat += res.mat
      cmuDetails.push(res.detail)
    })
  }

  if (state.wallType === 'PIP') {
    ;(state.pipWalls || []).forEach(wall => {
      const res = calcOnePIP(wall, r)
      structuralHrs += res.hrs
      structuralMat += res.mat
      pipDetails.push({ ...res, lf: wall.lf, heightIn: wall.heightIn })
    })
  }

  if (state.wallType === 'Timber') {
    const addlCourses = Math.max(0, Math.ceil((n(state.timberHeightIn) - 8) / 8))
    const postQty = n(state.timberPosts)
    structuralHrs = n(state.timberLF) * (0.4417 + addlCourses * 0.80) + postQty * 0.4667
    structuralMat = n(state.timberLF) * (0.2917 + addlCourses * 0.55) * 50 + postQty * 100
  }

  // Wall Finishes
  // Each finish has BOTH a master/default rate (from material_rates, looked
  // up via r('matKey')) AND an optional per-estimate override that the
  // estimator types into the Finishes row. Quoted prices vary by supplier
  // and project, so the override always wins when set; otherwise we fall
  // back to the master rate.
  const { sandStuccoSF, sandStuccoRateIn, smoothStuccoSF, smoothStuccoRateIn,
          ledgerstoneSF, ledgerstoneRateIn, stackedStoneSF, stackedStoneRateIn,
          tileSF, tileRateIn, flagstoneSF, flagstoneRateIn,
          realStoneSF, realStoneRateIn } = state
  // Override-or-master helper. Empty string / 0 / NaN → fall back.
  const ovr = (input, key) => {
    const v = parseFloat(input)
    return Number.isFinite(v) && v > 0 ? v : r(key)
  }
  const sandStuccoRate   = ovr(sandStuccoRateIn,   'sandStucco')
  const smoothStuccoRate = ovr(smoothStuccoRateIn, 'smoothStucco')
  const ledgerstoneRate  = ovr(ledgerstoneRateIn,  'ledgerstone')
  const stackedStoneRate = ovr(stackedStoneRateIn, 'stackedStone')
  const tileRate         = ovr(tileRateIn,         'tile')

  const sandStuccoHrs   = n(sandStuccoSF)   > 0 ? (n(sandStuccoSF)   / r('sandStuccoLab'))   * 8 : 0
  const smoothStuccoHrs = n(smoothStuccoSF) > 0 ? (n(smoothStuccoSF) / r('smoothStuccoLab')) * 8 : 0
  const ledgerstoneHrs  = n(ledgerstoneSF)  > 0 ? (n(ledgerstoneSF)  / r('ledgerstoneLab'))  * 8 : 0
  const stackedStoneHrs = n(stackedStoneSF) > 0 ? (n(stackedStoneSF) / r('stackedStoneLab')) * 8 : 0
  const tileHrs         = n(tileSF)   > 0 ? n(tileSF)   * r('tileLab')    : 0
  const flagstoneHrs    = n(flagstoneSF) > 0 ? n(flagstoneSF) * r('flagstoneLab') : 0
  const realStoneHrs    = n(realStoneSF)  > 0 ? n(realStoneSF)  * r('realStoneLab')  : 0

  const sandStuccoMat   = n(sandStuccoSF)   * sandStuccoRate
  const smoothStuccoMat = n(smoothStuccoSF) * smoothStuccoRate
  const ledgerstoneMat  = n(ledgerstoneSF)  > 0 ? n(ledgerstoneSF) * ledgerstoneRate * 1.1 + (n(ledgerstoneSF) / 5) * 2 : 0
  const stackedStoneMat = n(stackedStoneSF) > 0 ? n(stackedStoneSF) * stackedStoneRate * 1.1 + (n(stackedStoneSF) / 5) * 2 : 0
  const tileMat         = n(tileSF) > 0 ? n(tileSF) * tileRate + n(tileSF) : 0
  const flagstoneRate   = n(flagstoneRateIn) || r('flagstone')
  const flagstoneMat    = n(flagstoneSF) > 0 ? (n(flagstoneSF) / 80) * flagstoneRate + n(flagstoneSF) * 1.5 : 0
  const realStoneRate   = n(realStoneRateIn) || r('realStone')
  const realStoneMat    = n(realStoneSF)  > 0 ? (n(realStoneSF)  / 70) * realStoneRate  + n(realStoneSF) * 2 : 0

  const finishHrs = sandStuccoHrs + smoothStuccoHrs + ledgerstoneHrs + stackedStoneHrs + tileHrs + flagstoneHrs + realStoneHrs
  const finishMat = sandStuccoMat + smoothStuccoMat + ledgerstoneMat + stackedStoneMat + tileMat + flagstoneMat + realStoneMat

  // Caps
  let capHrs = 0, capMat = 0
  ;(state.capRows || []).forEach(cap => {
    const lf = n(cap.lf), qty = n(cap.qty)
    if (cap.type === 'Flagstone')    { capMat += (n(cap.widthIn)/12)*lf*0.0833*100/2000*r('capFlagstone'); capHrs += lf*0.25 }
    else if (cap.type === 'Precast') {
      // Width scales the unit price — base $/ea is keyed to an 8" cap;
      // empty/0 width falls back to 8" so old entries price identically.
      const widthFactor = (n(cap.widthIn) || 8) / 8
      capMat += qty * r('capPrecast') * widthFactor
      capHrs += qty * 0.20
    }
    else if (cap.type === 'PIP Concrete') { capMat += lf*(n(cap.widthIn)/12)*0.333/27*r('concreteTruck'); capHrs += lf*0.15 }
    else if (cap.type === 'Bullnose Brick') { capMat += lf*r('capBullnose'); capHrs += lf*0.08 }
  })

  // Waterproofing
  const wpSF = n(state.wpSF)
  const wpKey = { 'Primer & Membrane':'wpPrimerMembrane','3 Coats Roll On':'wp3CoatRollOn','Thoroseal & Roll On':'wpThoroseal','Dimple Membrane':'wpDimpleMembrane' }[state.wpType]
  const wpMat = wpSF > 0 && wpKey ? wpSF * r(wpKey) : 0
  const wpHrs = wpSF > 0 ? wpSF / 200 : 0

  // Manual
  let manHrs = 0, manMat = 0, manSub = 0
  ;(state.manualRows || []).forEach(row => { manHrs += n(row.hours); manMat += n(row.materials); manSub += n(row.subCost) })

  const baseHrs   = structuralHrs + finishHrs + capHrs + wpHrs + manHrs
  const diffMod   = 1 + n(state.difficulty) / 100
  const totalHrs  = baseHrs * diffMod + n(state.hoursAdj)
  const manDays   = totalHrs / 8
  const totalMat  = structuralMat + finishMat + capMat + wpMat + manMat

  const laborCost  = totalHrs * lrph
  const burden     = laborCost * DEFAULTS.laborBurdenPct
  const gp         = manDays * gpmd
  const commission = gp * DEFAULTS.commissionRate
  const price      = totalMat + laborCost + burden + gp + commission + manSub

  return {
    totalHrs, manDays, totalMat, laborCost, burden, gp, commission, subCost: manSub, price,
    structuralHrs, finishHrs, capHrs, wpHrs,
    structuralMat, finishMat, capMat, wpMat,
    cmuDetails, pipDetails,
    sandStuccoMat, smoothStuccoMat, ledgerstoneMat, stackedStoneMat, tileMat, flagstoneMat, realStoneMat,
  }
}

// ── Sub-components ────────────────────────────────────────────────────────────
function SectionHeader({ title }) {
  return (
    <div className="bg-gray-100 px-4 py-2 rounded-lg mb-2">
      <h3 className="text-xs font-bold text-gray-600 uppercase tracking-wider">{title}</h3>
    </div>
  )
}

function NumInput({ value, onChange, placeholder = '0', className = '' }) {
  return (
    <input type="number" step="any"
      className={`input text-sm py-1.5 ${className}`}
      placeholder={placeholder} value={value}
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
  { label: 'Misc 4', hours: '', materials: '', subCost: '' },
]
const DEFAULT_CAP_ROWS = [
  { type: 'None', widthIn: '', lf: '', qty: '' },
  { type: 'None', widthIn: '', lf: '', qty: '' },
]
const CAP_TYPES = ['None', 'Flagstone', 'Precast', 'PIP Concrete', 'Bullnose Brick']

// ── CMU Wall Entry ────────────────────────────────────────────────────────────
function CmuWallEntry({ wall, idx, total, onChange, onRemove, detail, materialPrices, refreshAllRates }) {
  const set = (field) => (val) => onChange(idx, field, val)
  const hasData = n(wall.lf) > 0 && n(wall.heightIn) > 0
  return (
    <div className="border border-gray-200 rounded-xl p-3 mb-3 bg-white">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
          Wall {idx + 1}
        </span>
        {total > 1 && (
          <button onClick={() => onRemove(idx)}
            className="text-xs text-red-400 hover:text-red-600 px-2 py-0.5 rounded border border-red-100 hover:border-red-300 transition-colors">
            Remove
          </button>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2">
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
          {/* Resolved block price + Edit Rates icon. The price line only
              appears once a block is chosen. Price prefers a master_rates
              override (set via the inline RateEditPopover, only visible when
              the Edit Rates toggle is on) and falls back to the catalog
              default — so an empty DB still yields a sensible quote. */}
          {(() => {
            const b = blockByName(wall.blockType)
            const price = (materialPrices?.[wallBlockRateName(b.name)] ?? b.price)
            return (
              <div className="mt-1 flex items-center gap-1 text-[11px] text-gray-500">
                <span>Price: <strong className="text-gray-800">${price.toFixed(2)}</strong>/ea</span>
                <RateEditPopover
                  table="material_rates"
                  name={wallBlockRateName(b.name)}
                  category="Walls"
                  unitLabel="ea"
                  currentValue={price}
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
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">%</span>
          </div>
        </div>
        <div className="col-span-2 sm:col-span-1">
          <label className="block text-xs text-gray-500 mb-1">% of Wall Curved</label>
          <div className="relative">
            <NumInput value={wall.pctCurved} onChange={set('pctCurved')} placeholder="0" />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">%</span>
          </div>
        </div>
      </div>
      {hasData && detail && (
        <div className="mt-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-1.5 text-xs text-gray-600 flex flex-wrap gap-3">
          <span>Grey: <strong>{detail.orderGreyBlock}</strong></span>
          <span>BB: <strong>{detail.orderBBBlock}</strong></span>
          <span>Footing: <strong>{detail.footingCY.toFixed(3)} CY</strong></span>
          <span>Grout: <strong>{detail.groutCY.toFixed(3)} CY</strong></span>
          <span>Rebar: <strong>{Math.round(detail.totalRebarLF)} LF</strong></span>
          {detail.curveAdd > 0 && <span>Curve: <strong>+{detail.curveAdd.toFixed(2)} hrs</strong></span>}
        </div>
      )}
    </div>
  )
}

// ── PIP Wall Entry ────────────────────────────────────────────────────────────
function PipWallEntry({ wall, idx, total, onChange, onRemove, detail }) {
  const set = (field) => (val) => onChange(idx, field, val)
  const hasData = n(wall.lf) > 0 && n(wall.heightIn) > 0
  return (
    <div className="border border-gray-200 rounded-xl p-3 mb-3 bg-white">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
          Wall {idx + 1}
        </span>
        {total > 1 && (
          <button onClick={() => onRemove(idx)}
            className="text-xs text-red-400 hover:text-red-600 px-2 py-0.5 rounded border border-red-100 hover:border-red-300 transition-colors">
            Remove
          </button>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Linear Feet</label>
          <NumInput value={wall.lf} onChange={set('lf')} placeholder="0" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Wall Height (in)</label>
          <NumInput value={wall.heightIn} onChange={set('heightIn')} placeholder="48" />
        </div>
      </div>
      {hasData && detail && (
        <div className="mt-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-1.5 text-xs text-gray-600 flex gap-4">
          <span>Concrete: <strong>{detail.concCY.toFixed(2)} CY</strong></span>
          <span>Labor: <strong>{detail.hrs.toFixed(2)} hrs</strong></span>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────
export default function WallsModule({ projectName, onSave, onBack, saving, initialData }) {
  const [laborRatePerHour, setLaborRatePerHour] = useState(initialData?.laborRatePerHour ?? DEFAULTS.laborRatePerHour)
  const [materialPrices, setMaterialPrices] = useState(initialData?.materialPrices ?? {})
  const [pricesLoading, setPricesLoading]   = useState(!initialData?.materialPrices)

  // Re-fetch the merged labor+material rate map. Called once on mount and
  // again after any RateEditPopover save so the calc reflects edits.
  const refreshAllRates = useCallback(async () => {
    const [matRes, labRes] = await Promise.all([
      supabase.from('material_rates').select('name, unit_cost').eq('category', 'Walls'),
      supabase.from('labor_rates').select('name, rate').eq('category', 'Walls'),
    ])
    const p = {}
    ;(matRes.data || []).forEach(row => { p[row.name] = parseFloat(row.unit_cost) || 0 })
    ;(labRes.data  || []).forEach(row => { p[row.name] = parseFloat(row.rate)     || 0 })
    setMaterialPrices(p)
  }, [])

  useEffect(() => {
    if (!initialData?.laborRatePerHour) {
      supabase.from('company_settings').select('value').eq('key', 'labor_rate_per_hour').single()
        .then(({ data }) => { if (data) setLaborRatePerHour(parseFloat(data.value) || DEFAULTS.laborRatePerHour) })
    }
    if (initialData?.materialPrices) { setPricesLoading(false); return }
    refreshAllRates().then(() => setPricesLoading(false))
  }, [refreshAllRates])

  const gpmd            = initialData?.gpmd            ?? DEFAULTS.gpmd
  const subGpMarkupRate = initialData?.subGpMarkupRate ?? 0.20

  // ── Shared state ──────────────────────────────────────────────────────────
  const [difficulty, setDifficulty] = useState(initialData?.difficulty ?? '')
  const [crewType, setCrewType] = useState(initialData?.crewType ?? 'Masonry')
  const [hoursAdj,   setHoursAdj]   = useState(initialData?.hoursAdj   ?? '')
  const [wallType,   setWallType]   = useState(initialData?.wallType   ?? 'CMU')

  // ── CMU walls array ───────────────────────────────────────────────────────
  // Backward-compat: if old single-entry format, wrap it
  const initCmuWalls = () => {
    if (initialData?.cmuWalls) {
      // Backfill blockType on legacy entries saved before block-type support.
      return initialData.cmuWalls.map(w => ({ blockType: DEFAULT_BLOCK_NAME, ...w }))
    }
    if (initialData?.cmuLF !== undefined) return [{
      blockType: DEFAULT_BLOCK_NAME,
      lf: initialData.cmuLF, heightIn: initialData.cmuHeightIn,
      footingWIn: initialData.cmuFootingWIn ?? '12', footingDIn: initialData.cmuFootingDIn ?? '12',
      rebarSpIn: initialData.cmuRebarSpIn ?? '16', horizBars: initialData.cmuHorizBars ?? '2',
      bondBeams: initialData.cmuBondBeams ?? '1', pctGrouted: initialData.cmuPctGrouted ?? '100',
      pctCurved: initialData.cmuPctCurved ?? '0',
    }]
    return [DEFAULT_CMU()]
  }
  const [cmuWalls,      setCmuWalls]      = useState(initCmuWalls)
  const [cmuFootingPump,setCmuFootingPump]= useState(initialData?.cmuFootingPump ?? 'No')
  const [cmuGroutPump,  setCmuGroutPump]  = useState(initialData?.cmuGroutPump   ?? 'No')

  // ── PIP walls array ───────────────────────────────────────────────────────
  const initPipWalls = () => {
    if (initialData?.pipWalls) return initialData.pipWalls
    if (initialData?.pipLF !== undefined) return [{ lf: initialData.pipLF, heightIn: initialData.pipHeightIn }]
    return [DEFAULT_PIP()]
  }
  const [pipWalls, setPipWalls] = useState(initPipWalls)

  // ── Timber (single) ───────────────────────────────────────────────────────
  const [timberLF,       setTimberLF]       = useState(initialData?.timberLF       ?? '')
  const [timberHeightIn, setTimberHeightIn] = useState(initialData?.timberHeightIn ?? '')
  const [timberType,     setTimberType]     = useState(initialData?.timberType     ?? 'Railroad Treated')
  const [timberPosts,    setTimberPosts]    = useState(initialData?.timberPosts    ?? '')

  // ── Wall Finishes ─────────────────────────────────────────────────────────
  const [sandStuccoSF,      setSandStuccoSF]      = useState(initialData?.sandStuccoSF      ?? '')
  const [sandStuccoRateIn,  setSandStuccoRateIn]  = useState(initialData?.sandStuccoRateIn  ?? '')
  const [smoothStuccoSF,    setSmoothStuccoSF]    = useState(initialData?.smoothStuccoSF    ?? '')
  const [smoothStuccoRateIn,setSmoothStuccoRateIn]= useState(initialData?.smoothStuccoRateIn?? '')
  const [ledgerstoneSF,     setLedgerstoneSF]     = useState(initialData?.ledgerstoneSF     ?? '')
  const [ledgerstoneRateIn, setLedgerstoneRateIn] = useState(initialData?.ledgerstoneRateIn ?? '')
  const [stackedStoneSF,    setStackedStoneSF]    = useState(initialData?.stackedStoneSF    ?? '')
  const [stackedStoneRateIn,setStackedStoneRateIn]= useState(initialData?.stackedStoneRateIn?? '')
  const [tileSF,            setTileSF]            = useState(initialData?.tileSF            ?? '')
  const [tileRateIn,        setTileRateIn]        = useState(initialData?.tileRateIn        ?? '')
  const [flagstoneSF,       setFlagstoneSF]       = useState(initialData?.flagstoneSF       ?? '')
  const [flagstoneRateIn,   setFlagstoneRateIn]   = useState(initialData?.flagstoneRateIn   ?? '')
  const [realStoneSF,       setRealStoneSF]       = useState(initialData?.realStoneSF       ?? '')
  const [realStoneRateIn,   setRealStoneRateIn]   = useState(initialData?.realStoneRateIn   ?? '')

  // ── Caps / Waterproofing / Manual ─────────────────────────────────────────
  const [capRows,    setCapRows]    = useState(initialData?.capRows    ?? DEFAULT_CAP_ROWS)
  const [wpType,     setWpType]     = useState(initialData?.wpType     ?? 'None')
  const [wpSF,       setWpSF]       = useState(initialData?.wpSF       ?? '')
  const [manualRows, setManualRows] = useState(initialData?.manualRows ?? DEFAULT_MANUAL_ROWS)

  // ── Sales tax — applied to totalMat across every module so the bid
  //    reflects supplier-invoiced material cost. Sourced from
  //    company_settings.sales_tax_rate via fetchSalesTaxRate(). Default
  //    0 (no tax) until the admin sets it in Opportunities → Settings.
  const [salesTaxRate, setSalesTaxRate] = useState(0)
  useEffect(() => {
    let alive = true
    fetchSalesTaxRate().then(r => { if (alive) setSalesTaxRate(r) })
    return () => { alive = false }
  }, [])


  useEffect(() => {
    if (Object.keys(materialPrices).length === 0) return
    if (!initialData?.flagstoneRateIn && materialPrices[WALL_RATES.flagstone.db])
      setFlagstoneRateIn(materialPrices[WALL_RATES.flagstone.db].toString())
    if (!initialData?.realStoneRateIn && materialPrices[WALL_RATES.realStone.db])
      setRealStoneRateIn(materialPrices[WALL_RATES.realStone.db].toString())
  }, [materialPrices])

  // ── Array helpers ─────────────────────────────────────────────────────────
  function updateCmuWall(idx, field, val) {
    setCmuWalls(ws => ws.map((w, i) => i === idx ? { ...w, [field]: val } : w))
  }
  function addCmuWall()    { setCmuWalls(ws => [...ws, DEFAULT_CMU()]) }
  function removeCmuWall(idx) { setCmuWalls(ws => ws.filter((_, i) => i !== idx)) }

  function updatePipWall(idx, field, val) {
    setPipWalls(ws => ws.map((w, i) => i === idx ? { ...w, [field]: val } : w))
  }
  function addPipWall()    { setPipWalls(ws => [...ws, DEFAULT_PIP()]) }
  function removePipWall(idx) { setPipWalls(ws => ws.filter((_, i) => i !== idx)) }

  function updateManual(i, field, val) {
    setManualRows(rows => rows.map((row, idx) => idx === i ? { ...row, [field]: val } : row))
  }
  function updateCap(i, field, val) {
    setCapRows(rows => rows.map((row, idx) => idx === i ? { ...row, [field]: val } : row))
  }

  const r = (key) => materialPrices[WALL_RATES[key].db] ?? WALL_RATES[key].fb

  const state = {
    crewType,
    difficulty, hoursAdj, wallType,
    cmuWalls, cmuFootingPump, cmuGroutPump,
    pipWalls,
    timberLF, timberHeightIn, timberType, timberPosts,
    sandStuccoSF,   sandStuccoRateIn,
    smoothStuccoSF, smoothStuccoRateIn,
    ledgerstoneSF,  ledgerstoneRateIn,
    stackedStoneSF, stackedStoneRateIn,
    tileSF,         tileRateIn,
    flagstoneSF,    flagstoneRateIn,
    realStoneSF,    realStoneRateIn,
    capRows, wpType, wpSF, manualRows,
  }
  const calcRaw = calcWalls(state, laborRatePerHour, materialPrices, gpmd)
  // Apply company sales tax to the module's total material cost so the
  // estimate price matches what suppliers actually invoice. Stored
  // material_cost (saved with the module) ends up tax-inclusive too,
  // so bid totals add up to GpmdBar's displayed price.
  const _salesTaxAmt = (calcRaw.totalMat || 0) * (salesTaxRate || 0)
  const calc = _salesTaxAmt > 0
    ? {
        ...calcRaw,
        totalMat: (calcRaw.totalMat || 0) + _salesTaxAmt,
        price:    (calcRaw.price    || 0) + _salesTaxAmt,
        salesTax: _salesTaxAmt,
      }
    : calcRaw


  function handleSave() {
    onSave({
      man_days:      parseFloat(calc.manDays.toFixed(2)),
      material_cost: parseFloat(calc.totalMat.toFixed(2)),
      data: { ...state, laborRatePerHour, gpmd, materialPrices, calc },
    })
  }

  return (
    <div className="space-y-5">
      {/* ── Sticky GPMD bar ── */}
      <div className="sticky top-0 z-20 -mx-6 px-6 pt-2 pb-2 bg-gray-900 shadow-lg">
      <GpmdBar
          sticky
        totalMat={calc.totalMat} totalHrs={calc.totalHrs} manDays={calc.manDays}
        laborCost={calc.laborCost} laborRatePerHour={laborRatePerHour}
        burden={calc.burden} gp={calc.gp} commission={calc.commission}
        subCost={calc.subCost} gpmd={gpmd} price={calc.price} subMarkupRate={subGpMarkupRate}
      />
      </div>

      {/* Crew Type */}
      <div className="flex items-center gap-3 bg-gray-50 rounded-lg px-4 py-2.5 border border-gray-200">
        <label className="text-sm font-medium text-gray-700 whitespace-nowrap">Crew Type</label>
        <select value={crewType} onChange={e => setCrewType(e.target.value)} className="input text-sm py-1 w-36">
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

      {/* Difficulty */}
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium text-gray-700 whitespace-nowrap">Difficulty Add</label>
        <div className="relative w-32">
          <NumInput value={difficulty} onChange={setDifficulty} placeholder="0" />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">%</span>
        </div>
      </div>

      {/* Wall Type */}
      <div>
        <SectionHeader title="Wall Type" />
        <div className="flex gap-2">
          {['CMU', 'PIP', 'Timber'].map(t => (
            <button key={t} onClick={() => setWallType(t)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                wallType === t ? 'bg-green-700 text-white border-green-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}>
              {t === 'CMU' ? 'CMU Block' : t === 'PIP' ? 'Poured In Place' : 'Timber / Lumber'}
            </button>
          ))}
        </div>
      </div>

      {/* ── CMU Block Walls ── */}
      {wallType === 'CMU' && (
        <div>
          <SectionHeader title="CMU Block Walls" />

          {/* Inline CMU rate reference — labor + material — all editable */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 mb-2 text-[11px] text-gray-500">
            <p className="font-semibold uppercase tracking-wide text-gray-400 mb-1">CMU Rates (click any to edit)</p>
            <div className="flex flex-wrap gap-x-3 gap-y-1">
              <span className="inline-flex items-center gap-1">Grey block ${r('greyBlock')}/ea
                <RateEditPopover table="material_rates" name={WALL_RATES.greyBlock.db} category="Walls" unitLabel="ea" currentValue={r('greyBlock')} onSaved={refreshAllRates} />
              </span>
              <span className="inline-flex items-center gap-1">Bondbeam ${r('bondbeamBlock')}/ea
                <RateEditPopover table="material_rates" name={WALL_RATES.bondbeamBlock.db} category="Walls" unitLabel="ea" currentValue={r('bondbeamBlock')} onSaved={refreshAllRates} />
              </span>
              <span className="inline-flex items-center gap-1">Rebar ${r('rebar')}/LF
                <RateEditPopover table="material_rates" name={WALL_RATES.rebar.db} category="Walls" unitLabel="LF" currentValue={r('rebar')} onSaved={refreshAllRates} />
              </span>
              <span className="inline-flex items-center gap-1">Conc hand ${r('concreteHand')}/CY
                <RateEditPopover table="material_rates" name={WALL_RATES.concreteHand.db} category="Walls" unitLabel="CY" currentValue={r('concreteHand')} onSaved={refreshAllRates} />
              </span>
              <span className="inline-flex items-center gap-1">Conc truck ${r('concreteTruck')}/CY
                <RateEditPopover table="material_rates" name={WALL_RATES.concreteTruck.db} category="Walls" unitLabel="CY" currentValue={r('concreteTruck')} onSaved={refreshAllRates} />
              </span>
              <span className="inline-flex items-center gap-1">Grout pump setup ${r('groutPumpSetup')}
                <RateEditPopover table="material_rates" name={WALL_RATES.groutPumpSetup.db} category="Walls" unitLabel="flat" currentValue={r('groutPumpSetup')} onSaved={refreshAllRates} />
              </span>
              <span className="inline-flex items-center gap-1">Grout pump ${r('groutPumpPerYd')}/CY
                <RateEditPopover table="material_rates" name={WALL_RATES.groutPumpPerYd.db} category="Walls" unitLabel="CY" currentValue={r('groutPumpPerYd')} onSaved={refreshAllRates} />
              </span>
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1">
              <span className="inline-flex items-center gap-1">Dig {r('digLab')} CF/hr
                <RateEditPopover table="labor_rates" name={WALL_RATES.digLab.db} category="Walls" mode="coefficient" unitLabel="CF/hr" currentValue={r('digLab')} onSaved={refreshAllRates} />
              </span>
              <span className="inline-flex items-center gap-1">Rebar {r('rebarLab')} LF/hr
                <RateEditPopover table="labor_rates" name={WALL_RATES.rebarLab.db} category="Walls" mode="coefficient" unitLabel="LF/hr" currentValue={r('rebarLab')} onSaved={refreshAllRates} />
              </span>
              <span className="inline-flex items-center gap-1">Block {r('blockLab')} blk/hr
                <RateEditPopover table="labor_rates" name={WALL_RATES.blockLab.db} category="Walls" mode="coefficient" unitLabel="blk/hr" currentValue={r('blockLab')} onSaved={refreshAllRates} />
              </span>
              <span className="inline-flex items-center gap-1">Hand grout {r('handGroutLab')} CF/hr
                <RateEditPopover table="labor_rates" name={WALL_RATES.handGroutLab.db} category="Walls" mode="coefficient" unitLabel="CF/hr" currentValue={r('handGroutLab')} onSaved={refreshAllRates} />
              </span>
              <span className="inline-flex items-center gap-1">Pump grout {r('pumpGroutLab')} CF/hr
                <RateEditPopover table="labor_rates" name={WALL_RATES.pumpGroutLab.db} category="Walls" mode="coefficient" unitLabel="CF/hr" currentValue={r('pumpGroutLab')} onSaved={refreshAllRates} />
              </span>
              <span className="inline-flex items-center gap-1">Setup/clean {r('setupCleanLab')} LF/hr
                <RateEditPopover table="labor_rates" name={WALL_RATES.setupCleanLab.db} category="Walls" mode="coefficient" unitLabel="LF/hr" currentValue={r('setupCleanLab')} onSaved={refreshAllRates} />
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
              refreshAllRates={refreshAllRates}
            />
          ))}

          <button onClick={addCmuWall}
            className="w-full py-2 rounded-lg border border-dashed border-green-400 text-green-700 text-sm font-medium hover:bg-green-50 transition-colors mb-3">
            + Add Another CMU Wall
          </button>

          {/* Module-level pump options */}
          <div className="border border-gray-200 rounded-xl p-3 bg-gray-50 space-y-0 mb-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Pump Options (all walls)</p>
            <LabeledRow label="Pump for Pouring Footing?">
              <select className="input text-sm py-1.5 w-24" value={cmuFootingPump} onChange={e => setCmuFootingPump(e.target.value)}>
                <option>No</option><option>Yes</option>
              </select>
            </LabeledRow>
            <LabeledRow label="Pump for Grouting Block?">
              <select className="input text-sm py-1.5 w-24" value={cmuGroutPump} onChange={e => setCmuGroutPump(e.target.value)}>
                <option>No</option><option>Yes</option>
              </select>
            </LabeledRow>
          </div>

          {/* Waterproofing */}
          <div>
            <label className="block text-xs text-gray-500 mb-1 font-medium">Waterproofing</label>
            <div className="flex items-center gap-2 flex-wrap">
              <select className="input text-sm py-1.5 flex-1" value={wpType} onChange={e => setWpType(e.target.value)}>
                <option>None</option>
                <option>Primer &amp; Membrane</option>
                <option>3 Coats Roll On</option>
                <option>Thoroseal &amp; Roll On</option>
                <option>Dimple Membrane</option>
              </select>
              {wpType !== 'None' && <NumInput value={wpSF} onChange={setWpSF} placeholder="0" className="w-28" />}
              {wpType !== 'None' && <span className="text-xs text-gray-400 shrink-0">SF</span>}
              {wpType !== 'None' && (() => {
                const wpKey = { 'Primer & Membrane':'wpPrimerMembrane','3 Coats Roll On':'wp3CoatRollOn','Thoroseal & Roll On':'wpThoroseal','Dimple Membrane':'wpDimpleMembrane' }[wpType]
                return wpKey ? (
                  <span className="inline-flex items-center gap-1 text-xs text-gray-400">
                    ${r(wpKey).toFixed(2)}/SF
                    <RateEditPopover table="material_rates" name={WALL_RATES[wpKey].db} category="Walls"
                      unitLabel="SF" currentValue={r(wpKey)} onSaved={refreshAllRates} />
                  </span>
                ) : null
              })()}
            </div>
          </div>
        </div>
      )}

      {/* ── PIP Walls ── */}
      {wallType === 'PIP' && (
        <div>
          <SectionHeader title="Poured In Place Walls" />

          <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 mb-2 text-[11px] text-gray-500">
            <p className="font-semibold uppercase tracking-wide text-gray-400 mb-1">PIP Rate (click to edit)</p>
            <span className="inline-flex items-center gap-1">Concrete truck ${r('concreteTruck')}/CY
              <RateEditPopover table="material_rates" name={WALL_RATES.concreteTruck.db} category="Walls"
                unitLabel="CY" currentValue={r('concreteTruck')} onSaved={refreshAllRates} />
            </span>
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
            />
          ))}

          <button onClick={addPipWall}
            className="w-full py-2 rounded-lg border border-dashed border-green-400 text-green-700 text-sm font-medium hover:bg-green-50 transition-colors">
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
            <select className="input text-sm py-1.5 w-full" value={timberType} onChange={e => setTimberType(e.target.value)}>
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
            <label className="block text-xs text-gray-500 mb-1">Pile-Driven Steel Posts (qty)</label>
            <div className="flex items-center gap-2">
              <NumInput value={timberPosts} onChange={setTimberPosts} placeholder="0" className="w-28" />
              <span className="text-xs text-gray-400">$100 mat + 0.47 hr each</span>
            </div>
          </div>
        </div>
      )}

      {/* ── Wall Finishes ── */}
      <div>
        <SectionHeader title="Wall Finishes" />
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-gray-500 border-b border-gray-200">
              <th className="text-left pb-1 pr-2 font-medium">Type</th>
              <th className="text-left pb-1 pr-2 font-medium">SF</th>
              <th className="text-left pb-1 pr-2 font-medium">Rate</th>
              <th className="text-right pb-1 font-medium text-gray-400">Mat $</th>
            </tr>
          </thead>
          <tbody>
            {[
              { label: 'Sand Stucco',        sf: sandStuccoSF,   setSf: setSandStuccoSF,   rate: sandStuccoRateIn,   setRate: setSandStuccoRateIn,   mat: calc.sandStuccoMat,   matKey: 'sandStucco',   labKey: 'sandStuccoLab' },
              { label: 'Smooth Stucco',      sf: smoothStuccoSF, setSf: setSmoothStuccoSF, rate: smoothStuccoRateIn, setRate: setSmoothStuccoRateIn, mat: calc.smoothStuccoMat, matKey: 'smoothStucco', labKey: 'smoothStuccoLab' },
              { label: 'Ledgerstone Veneer', sf: ledgerstoneSF,  setSf: setLedgerstoneSF,  rate: ledgerstoneRateIn,  setRate: setLedgerstoneRateIn,  mat: calc.ledgerstoneMat,  matKey: 'ledgerstone',  labKey: 'ledgerstoneLab' },
              { label: 'Stacked Stone',      sf: stackedStoneSF, setSf: setStackedStoneSF, rate: stackedStoneRateIn, setRate: setStackedStoneRateIn, mat: calc.stackedStoneMat, matKey: 'stackedStone', labKey: 'stackedStoneLab' },
              { label: 'Tile',               sf: tileSF,         setSf: setTileSF,         rate: tileRateIn,         setRate: setTileRateIn,         mat: calc.tileMat,         matKey: 'tile',         labKey: 'tileLab' },
            ].map(({ label, sf, setSf, rate, setRate, mat, matKey, labKey }) => (
              <tr key={label} className="border-b border-gray-100">
                <td className="py-1 pr-2 text-xs text-gray-700">{label}</td>
                <td className="py-1 pr-2"><NumInput value={sf} onChange={setSf} /></td>
                <td className="py-1 pr-2">
                  {/* Per-estimate $/SF override. Empty falls back to the
                      master rate (whose placeholder shows the current
                      default + a RateEdit popover for admin edits). */}
                  <div className="flex items-center gap-1">
                    <div className="relative w-24">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">$</span>
                      <input type="number" step="any" className="input text-sm py-1.5 pl-5 w-full"
                        placeholder={r(matKey).toFixed(2)}
                        value={rate}
                        onChange={e => setRate(e.target.value)} />
                    </div>
                    <RateEditPopover table="material_rates" name={WALL_RATES[matKey].db} category="Walls"
                      unitLabel="SF" currentValue={r(matKey)} onSaved={refreshAllRates} />
                    <RateEditPopover table="labor_rates" name={WALL_RATES[labKey].db} category="Walls"
                      mode="coefficient" unitLabel="rate" currentValue={r(labKey)} onSaved={refreshAllRates} />
                  </div>
                </td>
                <td className="py-1 text-right text-xs text-gray-600">{n(sf) > 0 ? `$${mat.toFixed(2)}` : '—'}</td>
              </tr>
            ))}
            <tr className="border-b border-gray-100">
              <td className="py-1 pr-2 text-xs text-gray-700">
                <span className="inline-flex items-center gap-1">
                  Real Flagstone
                  <RateEditPopover table="labor_rates" name={WALL_RATES.flagstoneLab.db} category="Walls"
                    mode="coefficient" unitLabel="rate" currentValue={r('flagstoneLab')} onSaved={refreshAllRates} />
                </span>
              </td>
              <td className="py-1 pr-2"><NumInput value={flagstoneSF} onChange={setFlagstoneSF} /></td>
              <td className="py-1 pr-2">
                <div className="flex items-center gap-1">
                  <div className="relative w-24">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">$</span>
                    <input type="number" step="any" className="input text-sm py-1.5 pl-5 w-full"
                      placeholder={r('flagstone').toString()} value={flagstoneRateIn}
                      onChange={e => setFlagstoneRateIn(e.target.value)} />
                  </div>
                  <RateEditPopover table="material_rates" name={WALL_RATES.flagstone.db} category="Walls"
                    unitLabel="ton" currentValue={r('flagstone')} onSaved={refreshAllRates} />
                </div>
              </td>
              <td className="py-1 text-right text-xs text-gray-600">{n(flagstoneSF) > 0 ? `$${calc.flagstoneMat.toFixed(2)}` : '—'}</td>
            </tr>
            <tr className="border-b border-gray-100">
              <td className="py-1 pr-2 text-xs text-gray-700">
                <span className="inline-flex items-center gap-1">
                  Real Stone
                  <RateEditPopover table="labor_rates" name={WALL_RATES.realStoneLab.db} category="Walls"
                    mode="coefficient" unitLabel="rate" currentValue={r('realStoneLab')} onSaved={refreshAllRates} />
                </span>
              </td>
              <td className="py-1 pr-2"><NumInput value={realStoneSF} onChange={setRealStoneSF} /></td>
              <td className="py-1 pr-2">
                <div className="flex items-center gap-1">
                  <div className="relative w-24">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">$</span>
                    <input type="number" step="any" className="input text-sm py-1.5 pl-5 w-full"
                      placeholder={r('realStone').toString()} value={realStoneRateIn}
                      onChange={e => setRealStoneRateIn(e.target.value)} />
                  </div>
                  <RateEditPopover table="material_rates" name={WALL_RATES.realStone.db} category="Walls"
                    unitLabel="ton" currentValue={r('realStone')} onSaved={refreshAllRates} />
                </div>
              </td>
              <td className="py-1 text-right text-xs text-gray-600">{n(realStoneSF) > 0 ? `$${calc.realStoneMat.toFixed(2)}` : '—'}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* ── Wall Caps ── */}
      <div>
        <SectionHeader title="Wall Caps" />
        <p className="text-xs text-gray-400 mb-1 inline-flex items-center flex-wrap gap-x-2">
          <span className="inline-flex items-center gap-1">Flagstone ${r('capFlagstone')}/ton
            <RateEditPopover table="material_rates" name={WALL_RATES.capFlagstone.db} category="Walls"
              unitLabel="ton" currentValue={r('capFlagstone')} onSaved={refreshAllRates} />
          </span>·
          <span className="inline-flex items-center gap-1">Precast ${r('capPrecast')}/ea
            <RateEditPopover table="material_rates" name={WALL_RATES.capPrecast.db} category="Walls"
              unitLabel="ea" currentValue={r('capPrecast')} onSaved={refreshAllRates} />
          </span>·
          <span className="inline-flex items-center gap-1">Bullnose ${r('capBullnose')}/LF
            <RateEditPopover table="material_rates" name={WALL_RATES.capBullnose.db} category="Walls"
              unitLabel="LF" currentValue={r('capBullnose')} onSaved={refreshAllRates} />
          </span>
        </p>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-gray-500 border-b border-gray-200">
              <th className="text-left pb-1 pr-2 font-medium">Type</th>
              <th className="text-left pb-1 pr-2 font-medium">Width (in)</th>
              <th className="text-left pb-1 font-medium">Lin. Ft / Qty</th>
            </tr>
          </thead>
          <tbody>
            {capRows.map((cap, i) => {
              const isActive = cap.type !== 'None'
              return (
                <tr key={i} className="border-b border-gray-100">
                  <td className="py-1 pr-2">
                    <select className="input text-sm py-1 w-36" value={cap.type}
                      onChange={e => updateCap(i, 'type', e.target.value)}>
                      {CAP_TYPES.map(t => <option key={t}>{t}</option>)}
                    </select>
                  </td>
                  <td className="py-1 pr-2">
                    {isActive && (
                      <NumInput value={cap.widthIn} onChange={v => updateCap(i, 'widthIn', v)} className="w-20" placeholder="4" />
                    )}
                  </td>
                  <td className="py-1">
                    {isActive && (
                      <NumInput
                        value={cap.type === 'Precast' ? cap.qty : cap.lf}
                        onChange={v => updateCap(i, cap.type === 'Precast' ? 'qty' : 'lf', v)}
                        className="w-20" placeholder="0"
                      />
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

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
                  <input className="input text-sm py-1" value={row.label}
                    onChange={e => updateManual(i, 'label', e.target.value)} />
                </td>
                <td className="py-1 pr-2"><NumInput value={row.hours}     onChange={v => updateManual(i, 'hours', v)} /></td>
                <td className="py-1 pr-2"><NumInput value={row.materials} onChange={v => updateManual(i, 'materials', v)} /></td>
                <td className="py-1">     <NumInput value={row.subCost}   onChange={v => updateManual(i, 'subCost', v)} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Hours Adjustment */}
      <div className="flex items-center gap-3 bg-gray-50 rounded-lg px-4 py-3">
        <label className="text-sm font-medium text-gray-700 whitespace-nowrap flex-1">Hours Adjustment</label>
        <NumInput value={hoursAdj} onChange={setHoursAdj} placeholder="0" className="w-28" />
        <span className="text-xs text-gray-400">Net: {calc.totalHrs.toFixed(2)} hrs</span>
      </div>


      <div className="flex gap-3 pt-2">
        <button onClick={onBack} className="btn-secondary flex-1">← Back</button>
        <button onClick={handleSave} disabled={saving} className="btn-primary flex-1">
          {saving ? 'Saving...' : 'Add Module'}
        </button>
      </div>
    </div>
  )
}
