import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import GpmdBar from './GpmdBar'

// ─────────────────────────────────────────────────────────────────────────────
// Walls Module — based on Walls Module tab in Excel estimator
// Wall types: CMU Block | Poured In Place (PIP) | Timber/Lumber
// Shared sections: Wall Finishes, Wall Caps, Waterproofing, Manual Entry
// ─────────────────────────────────────────────────────────────────────────────

// Standard CMU block: 16"L × 8"H × 8"W
const BLOCK_L = 16, BLOCK_H = 8, BLOCK_W = 8
// Grout CY per block (Excel: 0.01440329218 = 14×8×6 / 1728 / 27)
const GROUT_CY_PER_BLOCK = ((BLOCK_L - 2) * BLOCK_H * (BLOCK_W - 2)) / 1728 / 27

const WALL_RATES = {
  // ── CMU structural materials ────────────────────────────────────────────────
  greyBlock:       { db: 'Wall Grey Block',           fb: 2.59   },  // $/block
  bondbeamBlock:   { db: 'Wall Bondbeam Block',        fb: 2.59   },  // $/block
  rebar:           { db: 'Wall Rebar',                 fb: 1.399  },  // $/LF
  specMixBag:      { db: 'Wall Spec Mix Bag 80lb',     fb: 8.57   },  // $/bag
  concreteHand:    { db: 'Wall Concrete Hand Mix',     fb: 92.00  },  // $/CY
  concreteTruck:   { db: 'Wall Concrete Truck',        fb: 185.00 },  // $/CY
  groutPumpSetup:  { db: 'Wall Grout Pump Setup',      fb: 402.50 },  // flat
  groutPumpPerYd:  { db: 'Wall Grout Pump Per Yard',   fb: 9.20   },  // $/CY
  // ── CMU labor rates ─────────────────────────────────────────────────────────
  digLab:          { db: 'Wall Dig Footing Labor Rate',   fb: 4.0    },  // CF/hr
  rebarLab:        { db: 'Wall Set Rebar Labor Rate',     fb: 35.0   },  // LF/hr
  blockLab:        { db: 'Wall Set Block Labor Rate',     fb: 10.4   },  // blocks/hr
  handGroutLab:    { db: 'Wall Hand Grout Labor Rate',    fb: 5.5    },  // CF/hr
  pumpGroutLab:    { db: 'Wall Pump Grout Labor Rate',    fb: 81.0   },  // CF/hr
  setupCleanLab:   { db: 'Wall Setup Clean Labor Rate',   fb: 30.0   },  // LF/hr
  // ── Wall finishes materials ─────────────────────────────────────────────────
  sandStucco:      { db: 'Sand Stucco - Wall',         fb: 0.00   },  // $/SF
  smoothStucco:    { db: 'Smooth Stucco - Wall',        fb: 0.00   },  // $/SF
  ledgerstone:     { db: 'Ledgerstone - Wall',          fb: 10.00  },  // $/SF
  stackedStone:    { db: 'Stacked Stone - Wall',        fb: 10.00  },  // $/SF
  tile:            { db: 'Tile - Wall',                 fb: 6.50   },  // $/SF
  flagstone:       { db: 'Real Flagstone - Wall',       fb: 400.00 },  // $/ton
  realStone:       { db: 'Real Stone - Wall',           fb: 400.00 },  // $/ton
  // ── Wall finish labor rates ─────────────────────────────────────────────────
  sandStuccoLab:   { db: 'Sand Stucco - Wall Labor Rate',   fb: 92     },  // SF/day
  smoothStuccoLab: { db: 'Smooth Stucco - Wall Labor Rate', fb: 65     },  // SF/day
  ledgerstoneLab:  { db: 'Ledgerstone - Wall Labor Rate',   fb: 24     },  // SF/day
  stackedStoneLab: { db: 'Stacked Stone - Wall Labor Rate', fb: 24     },  // SF/day
  tileLab:         { db: 'Tile - Wall Labor Rate',           fb: 0.2867 },  // hrs/SF
  flagstoneLab:    { db: 'Real Flagstone - Wall Labor Rate', fb: 0.4487 },  // hrs/SF
  realStoneLab:    { db: 'Real Stone - Wall Labor Rate',     fb: 0.8954 },  // hrs/SF
  // ── Wall caps ──────────────────────────────────────────────────────────────
  capFlagstone:    { db: 'Wall Cap Flagstone',          fb: 500.00 },  // $/ton
  capPrecast:      { db: 'Wall Cap Precast',            fb: 50.00  },  // $/piece
  capBullnose:     { db: 'Wall Cap Bullnose Brick',     fb: 5.00   },  // $/LF
  // ── Waterproofing ──────────────────────────────────────────────────────────
  wpPrimerMembrane:  { db: 'Wall WP Primer Membrane',  fb: 1.80   },  // $/SF
  wp3CoatRollOn:     { db: 'Wall WP 3 Coat Roll On',   fb: 1.20   },  // $/SF
  wpThoroseal:       { db: 'Wall WP Thoroseal Roll On', fb: 1.50   },  // $/SF
  wpDimpleMembrane:  { db: 'Wall WP Dimple Membrane',  fb: 2.10   },  // $/SF
}

const DEFAULTS = { laborRatePerHour: 35, laborBurdenPct: 0.29, gpmd: 425, commissionRate: 0.12 }

const n = (v) => parseFloat(v) || 0

// ─────────────────────────────────────────────────────────────────────────────
// Calculation engine
// ─────────────────────────────────────────────────────────────────────────────
function calcWalls(state, lrph = DEFAULTS.laborRatePerHour, mp = {}, gpmd = DEFAULTS.gpmd) {
  const r = (key) => mp[WALL_RATES[key].db] ?? WALL_RATES[key].fb

  // ── CMU Wall ───────────────────────────────────────────────────────────────
  let cmuHrs = 0, cmuMat = 0
  let cmuDetail = {}
  if (state.wallType === 'CMU') {
    const { cmuLF, cmuHeightIn, cmuFootingWIn, cmuFootingDIn, cmuRebarSpIn,
            cmuHorizBars, cmuBondBeams, cmuPctGrouted, cmuPctCurved,
            cmuFootingPump, cmuGroutPump } = state

    const blocksPerCourse = n(cmuLF) > 0 ? Math.ceil((n(cmuLF) * 12) / BLOCK_L) : 0
    const totalCourses    = n(cmuHeightIn) > 0 ? Math.ceil(n(cmuHeightIn) / BLOCK_H) : 0
    const bbCourses       = Math.min(n(cmuBondBeams), totalCourses)
    const regCourses      = Math.max(0, totalCourses - bbCourses)
    const rawBlocks       = blocksPerCourse * totalCourses
    const regBlocks       = blocksPerCourse * regCourses
    const bbBlocks        = blocksPerCourse * bbCourses
    // +10% waste
    const orderGreyBlock  = Math.ceil(regBlocks * 1.10)
    const orderBBBlock    = Math.ceil(bbBlocks  * 1.10)

    // Footing
    const footingCF = (n(cmuFootingWIn) / 12) * (n(cmuFootingDIn) / 12) * n(cmuLF)
    const footingCY = footingCF / 27

    // Grout
    const groutCY = rawBlocks * GROUT_CY_PER_BLOCK * (n(cmuPctGrouted) / 100)
    const groutCF = groutCY * 27

    // Rebar
    const vertRebars  = n(cmuRebarSpIn) > 0 ? Math.ceil((n(cmuLF) * 12) / n(cmuRebarSpIn)) : 0
    const vertRebarLF = vertRebars * (n(cmuHeightIn) + n(cmuFootingDIn)) / 12
    const horizRebarLF = (n(cmuHorizBars) + bbCourses) * n(cmuLF)
    const totalRebarLF = vertRebarLF + horizRebarLF

    // Labor
    const digHrs        = footingCF > 0 ? footingCF / r('digLab') : 0
    const rebarHrs      = totalRebarLF > 0 ? totalRebarLF / r('rebarLab') : 0
    const pourFootHrs   = footingCY > 0 ? footingCY / 0.2037 : 0   // yards/hr
    const setBlockHrs   = rawBlocks > 0 ? rawBlocks / r('blockLab') : 0
    const groutRate     = cmuGroutPump === 'Yes' ? r('pumpGroutLab') : r('handGroutLab')
    const groutHrs      = groutCF > 0 ? groutCF / groutRate : 0
    const setupHrs      = n(cmuLF) > 0 ? n(cmuLF) / r('setupCleanLab') : 0

    const structBase    = digHrs + rebarHrs + pourFootHrs + setBlockHrs + groutHrs + setupHrs
    const curveAdd      = structBase * (n(cmuPctCurved) / 100) * 0.50  // 0.5 = Excel extra labor for curve

    cmuHrs = structBase + curveAdd

    // Materials
    const greyMat       = orderGreyBlock * r('greyBlock')
    const bbMat         = orderBBBlock   * r('bondbeamBlock')
    const rebarMat      = totalRebarLF   * r('rebar')
    const footConcrPrc  = cmuFootingPump === 'Yes' ? r('concreteTruck') : r('concreteHand')
    const footMat       = footingCY * footConcrPrc
    const footPumpMat   = cmuFootingPump === 'Yes' ? r('groutPumpSetup') : 0
    const groutPrc      = cmuGroutPump === 'Yes' ? r('concreteTruck') : r('concreteHand')
    const groutMat      = groutCY * groutPrc + (cmuGroutPump === 'Yes' ? groutCY * r('groutPumpPerYd') : 0)
    const groutPumpSetupMat = (cmuGroutPump === 'Yes' && groutCY > 0) ? r('groutPumpSetup') : 0

    cmuMat = greyMat + bbMat + rebarMat + footMat + footPumpMat + groutMat + groutPumpSetupMat

    cmuDetail = {
      blocksPerCourse, totalCourses, rawBlocks, orderGreyBlock, orderBBBlock,
      footingCY, groutCY, totalRebarLF, curveAdd,
    }
  }

  // ── PIP Wall ───────────────────────────────────────────────────────────────
  // Rates from Excel: 1.0833 hr/LF (first 6"+ftng), 1.6167 hr/LF per add'l 6"
  //                   0.2833 CY/LF  (first 6"+ftng), 0.3667 CY/LF per add'l 6"
  let pipHrs = 0, pipMat = 0
  if (state.wallType === 'PIP') {
    const { pipLF, pipHeightIn } = state
    const heightAbove6   = Math.max(0, n(pipHeightIn) - 6)
    const addlCourses    = Math.ceil(heightAbove6 / 6)   // each 6" above first 6"
    pipHrs = n(pipLF) * (1.0833 + addlCourses * 1.6167)
    const concCY = n(pipLF) * (0.2833 + addlCourses * 0.3667)
    pipMat = concCY * r('concreteTruck')
  }

  // ── Timber Wall ────────────────────────────────────────────────────────────
  // Rates from Excel: first course 0.4417 hr/LF, 0.2917 mat/LF
  //                   add'l courses 0.80 hr/LF, 0.55 mat/LF
  //                   steel post 0.4667 hr/post, $100 mat/post
  let timberHrs = 0, timberMat = 0
  if (state.wallType === 'Timber') {
    const { timberLF, timberHeightIn, timberPosts } = state
    // Each timber course ≈ 8" height (railroad tie cross-section)
    const addlCourses   = Math.max(0, Math.ceil((n(timberHeightIn) - 8) / 8))
    const postQty       = n(timberPosts)
    timberHrs = n(timberLF) * (0.4417 + addlCourses * 0.80) + postQty * 0.4667
    timberMat = n(timberLF) * (0.2917 + addlCourses * 0.55) * 50  // ~$50/LF lumber cost base
                + postQty * 100  // $100/post
  }

  const structuralHrs = cmuHrs + pipHrs + timberHrs
  const structuralMat = cmuMat + pipMat + timberMat

  // ── Wall Finishes ──────────────────────────────────────────────────────────
  const { sandStuccoSF, smoothStuccoSF, ledgerstoneSF, stackedStoneSF,
          tileSF, flagstoneSF, flagstoneRateIn, realStoneSF, realStoneRateIn } = state

  const sandStuccoHrs   = n(sandStuccoSF)   > 0 ? (n(sandStuccoSF)   / r('sandStuccoLab'))   * 8 : 0
  const smoothStuccoHrs = n(smoothStuccoSF) > 0 ? (n(smoothStuccoSF) / r('smoothStuccoLab')) * 8 : 0
  const ledgerstoneHrs  = n(ledgerstoneSF)  > 0 ? (n(ledgerstoneSF)  / r('ledgerstoneLab'))  * 8 : 0
  const stackedStoneHrs = n(stackedStoneSF) > 0 ? (n(stackedStoneSF) / r('stackedStoneLab')) * 8 : 0
  const tileHrs         = n(tileSF)         > 0 ? n(tileSF)           * r('tileLab')          : 0
  const flagstoneHrs    = n(flagstoneSF)    > 0 ? n(flagstoneSF)      * r('flagstoneLab')     : 0
  const realStoneHrs    = n(realStoneSF)    > 0 ? n(realStoneSF)      * r('realStoneLab')     : 0

  const sandStuccoMat   = n(sandStuccoSF)   * r('sandStucco')
  const smoothStuccoMat = n(smoothStuccoSF) * r('smoothStucco')
  const ledgerstoneMat  = n(ledgerstoneSF) > 0
    ? n(ledgerstoneSF) * r('ledgerstone') * 1.1 + (n(ledgerstoneSF) / 5) * 2 : 0
  const stackedStoneMat = n(stackedStoneSF) > 0
    ? n(stackedStoneSF) * r('stackedStone') * 1.1 + (n(stackedStoneSF) / 5) * 2 : 0
  const tileMat = n(tileSF) > 0 ? n(tileSF) * r('tile') + n(tileSF) : 0  // +$1/SF adhesive
  const flagstoneRate  = n(flagstoneRateIn)  || r('flagstone')
  const flagstoneMat   = n(flagstoneSF) > 0 ? (n(flagstoneSF) / 80) * flagstoneRate + n(flagstoneSF) * 1.5 : 0
  const realStoneRate  = n(realStoneRateIn) || r('realStone')
  const realStoneMat   = n(realStoneSF)   > 0 ? (n(realStoneSF) / 70) * realStoneRate + n(realStoneSF) * 2 : 0

  const finishHrs = sandStuccoHrs + smoothStuccoHrs + ledgerstoneHrs + stackedStoneHrs
                  + tileHrs + flagstoneHrs + realStoneHrs
  const finishMat = sandStuccoMat + smoothStuccoMat + ledgerstoneMat + stackedStoneMat
                  + tileMat + flagstoneMat + realStoneMat

  // ── Wall Caps ──────────────────────────────────────────────────────────────
  let capHrs = 0, capMat = 0
  ;(state.capRows || []).forEach(cap => {
    const lf = n(cap.lf)
    const qty = n(cap.qty)
    if (cap.type === 'Flagstone') {
      // tons = (widthIn/12 * lf * 0.0833 * 170) / 2000  ~~ approx density
      const tons = (n(cap.widthIn) / 12) * lf * 0.0833 * 100 / 2000
      capMat += tons * r('capFlagstone')
      capHrs += lf * 0.25  // approx install labor
    } else if (cap.type === 'Precast') {
      capMat += qty * r('capPrecast')
      capHrs += qty * 0.20
    } else if (cap.type === 'PIP Concrete') {
      capMat += lf * (n(cap.widthIn) / 12) * 0.333 / 27 * r('concreteTruck')
      capHrs += lf * 0.15
    } else if (cap.type === 'Bullnose Brick') {
      capMat += lf * r('capBullnose')
      capHrs += lf * 0.08
    }
  })

  // ── Waterproofing ──────────────────────────────────────────────────────────
  const wpSF = n(state.wpSF)
  const wpRateKey = {
    'Primer & Membrane': 'wpPrimerMembrane',
    '3 Coats Roll On':   'wp3CoatRollOn',
    'Thoroseal & Roll On': 'wpThoroseal',
    'Dimple Membrane':   'wpDimpleMembrane',
  }[state.wpType] || 'wpPrimerMembrane'
  const wpMat = wpSF > 0 ? wpSF * r(wpRateKey) : 0
  const wpHrs = wpSF > 0 ? wpSF / 200 : 0  // ~200 SF/hr application

  // ── Manual entry ───────────────────────────────────────────────────────────
  let manHrs = 0, manMat = 0, manSub = 0
  ;(state.manualRows || []).forEach(row => {
    manHrs += n(row.hours); manMat += n(row.materials); manSub += n(row.subCost)
  })

  // ── Totals ─────────────────────────────────────────────────────────────────
  const baseHrs   = structuralHrs + finishHrs + capHrs + wpHrs + manHrs
  const diffMod   = 1 + n(state.difficulty) / 100
  const totalHrs  = baseHrs * diffMod + n(state.hoursAdj)
  const manDays   = totalHrs / 8
  const totalMat  = structuralMat + finishMat + capMat + wpMat + manMat

  const laborCost  = totalHrs * lrph
  const burden     = laborCost * DEFAULTS.laborBurdenPct
  const gp         = manDays * gpmd
  const commission = gp * DEFAULTS.commissionRate
  const subCost    = manSub
  const price      = totalMat + laborCost + burden + gp + commission + subCost

  return {
    totalHrs, manDays, totalMat, laborCost, burden, gp, commission, subCost, price,
    structuralHrs, finishHrs, capHrs, wpHrs,
    structuralMat, finishMat, capMat, wpMat,
    cmuDetail,
    sandStuccoMat, smoothStuccoMat, ledgerstoneMat, stackedStoneMat,
    tileMat, flagstoneMat, realStoneMat,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────
function SectionHeader({ title }) {
  return (
    <div className="bg-gray-100 px-4 py-2 rounded-lg mb-2">
      <h3 className="text-xs font-bold text-gray-600 uppercase tracking-wider">{title}</h3>
    </div>
  )
}

function NumInput({ value, onChange, placeholder = '0', className = '' }) {
  return (
    <input type="number" step="any" min="0"
      className={`input text-sm py-1.5 ${className}`}
      placeholder={placeholder}
      value={value}
      onChange={e => onChange(e.target.value)}
    />
  )
}

function LabeledRow({ label, children, note }) {
  return (
    <div className="flex items-center gap-3 py-1.5 border-b border-gray-100">
      <span className="text-xs text-gray-700 w-52 shrink-0">{label}</span>
      {children}
      {note && <span className="text-xs text-gray-400 shrink-0">{note}</span>}
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

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────
export default function WallsModule({ projectName, onSave, onBack, saving, initialData }) {
  const [laborRatePerHour, setLaborRatePerHour] = useState(
    initialData?.laborRatePerHour ?? DEFAULTS.laborRatePerHour
  )
  const [materialPrices, setMaterialPrices] = useState(initialData?.materialPrices ?? {})
  const [pricesLoading, setPricesLoading]   = useState(!initialData?.materialPrices)

  useEffect(() => {
    if (!initialData?.laborRatePerHour) {
      supabase.from('company_settings').select('value').eq('key', 'labor_rate_per_hour').single()
        .then(({ data }) => { if (data) setLaborRatePerHour(parseFloat(data.value) || DEFAULTS.laborRatePerHour) })
    }
    if (initialData?.materialPrices) { setPricesLoading(false); return }
    supabase.from('material_rates').select('name, unit_cost').eq('category', 'Walls')
      .then(({ data }) => {
        if (data) {
          const p = {}
          data.forEach(r => { p[r.name] = parseFloat(r.unit_cost) || 0 })
          setMaterialPrices(p)
        }
        setPricesLoading(false)
      })
  }, [])

  const gpmd            = initialData?.gpmd            ?? DEFAULTS.gpmd
  const subGpMarkupRate = initialData?.subGpMarkupRate ?? 0.20

  // ── State ──────────────────────────────────────────────────────────────────
  const [difficulty, setDifficulty] = useState(initialData?.difficulty ?? '')
  const [hoursAdj,   setHoursAdj]   = useState(initialData?.hoursAdj   ?? '')

  // Wall type
  const [wallType, setWallType] = useState(initialData?.wallType ?? 'CMU')

  // CMU inputs
  const [cmuLF,         setCmuLF]         = useState(initialData?.cmuLF         ?? '')
  const [cmuHeightIn,   setCmuHeightIn]   = useState(initialData?.cmuHeightIn   ?? '')
  const [cmuFootingWIn, setCmuFootingWIn] = useState(initialData?.cmuFootingWIn ?? '12')
  const [cmuFootingDIn, setCmuFootingDIn] = useState(initialData?.cmuFootingDIn ?? '12')
  const [cmuRebarSpIn,  setCmuRebarSpIn]  = useState(initialData?.cmuRebarSpIn  ?? '16')
  const [cmuHorizBars,  setCmuHorizBars]  = useState(initialData?.cmuHorizBars  ?? '2')
  const [cmuBondBeams,  setCmuBondBeams]  = useState(initialData?.cmuBondBeams  ?? '1')
  const [cmuPctGrouted, setCmuPctGrouted] = useState(initialData?.cmuPctGrouted ?? '100')
  const [cmuPctCurved,  setCmuPctCurved]  = useState(initialData?.cmuPctCurved  ?? '0')
  const [cmuFootingPump,setCmuFootingPump]= useState(initialData?.cmuFootingPump ?? 'No')
  const [cmuGroutPump,  setCmuGroutPump]  = useState(initialData?.cmuGroutPump  ?? 'No')

  // PIP inputs
  const [pipLF,       setPipLF]       = useState(initialData?.pipLF       ?? '')
  const [pipHeightIn, setPipHeightIn] = useState(initialData?.pipHeightIn ?? '')

  // Timber inputs
  const [timberLF,       setTimberLF]       = useState(initialData?.timberLF       ?? '')
  const [timberHeightIn, setTimberHeightIn] = useState(initialData?.timberHeightIn ?? '')
  const [timberType,     setTimberType]     = useState(initialData?.timberType     ?? 'Railroad Treated')
  const [timberPosts,    setTimberPosts]    = useState(initialData?.timberPosts    ?? '')

  // Wall Finishes
  const [sandStuccoSF,   setSandStuccoSF]   = useState(initialData?.sandStuccoSF   ?? '')
  const [smoothStuccoSF, setSmoothStuccoSF] = useState(initialData?.smoothStuccoSF ?? '')
  const [ledgerstoneSF,  setLedgerstoneSF]  = useState(initialData?.ledgerstoneSF  ?? '')
  const [stackedStoneSF, setStackedStoneSF] = useState(initialData?.stackedStoneSF ?? '')
  const [tileSF,         setTileSF]         = useState(initialData?.tileSF         ?? '')
  const [flagstoneSF,    setFlagstoneSF]    = useState(initialData?.flagstoneSF    ?? '')
  const [flagstoneRateIn,setFlagstoneRateIn]= useState(initialData?.flagstoneRateIn ?? '')
  const [realStoneSF,    setRealStoneSF]    = useState(initialData?.realStoneSF    ?? '')
  const [realStoneRateIn,setRealStoneRateIn]= useState(initialData?.realStoneRateIn ?? '')

  // Wall Caps
  const [capRows, setCapRows] = useState(initialData?.capRows ?? DEFAULT_CAP_ROWS)

  // Waterproofing
  const [wpType, setWpType] = useState(initialData?.wpType ?? 'None')
  const [wpSF,   setWpSF]   = useState(initialData?.wpSF   ?? '')

  // Manual entry
  const [manualRows, setManualRows] = useState(initialData?.manualRows ?? DEFAULT_MANUAL_ROWS)

  // Pre-fill editable stone rates
  useEffect(() => {
    if (Object.keys(materialPrices).length === 0) return
    if (!initialData?.flagstoneRateIn && materialPrices[WALL_RATES.flagstone.db]) {
      setFlagstoneRateIn(materialPrices[WALL_RATES.flagstone.db].toString())
    }
    if (!initialData?.realStoneRateIn && materialPrices[WALL_RATES.realStone.db]) {
      setRealStoneRateIn(materialPrices[WALL_RATES.realStone.db].toString())
    }
  }, [materialPrices])

  const state = {
    difficulty, hoursAdj, wallType,
    cmuLF, cmuHeightIn, cmuFootingWIn, cmuFootingDIn, cmuRebarSpIn,
    cmuHorizBars, cmuBondBeams, cmuPctGrouted, cmuPctCurved, cmuFootingPump, cmuGroutPump,
    pipLF, pipHeightIn,
    timberLF, timberHeightIn, timberType, timberPosts,
    sandStuccoSF, smoothStuccoSF, ledgerstoneSF, stackedStoneSF,
    tileSF, flagstoneSF, flagstoneRateIn, realStoneSF, realStoneRateIn,
    capRows, wpType, wpSF, manualRows,
  }
  const calc = calcWalls(state, laborRatePerHour, materialPrices, gpmd)
  const r    = (key) => materialPrices[WALL_RATES[key].db] ?? WALL_RATES[key].fb

  function updateManual(i, field, val) {
    setManualRows(rows => rows.map((row, idx) => idx === i ? { ...row, [field]: val } : row))
  }
  function updateCap(i, field, val) {
    setCapRows(rows => rows.map((row, idx) => idx === i ? { ...row, [field]: val } : row))
  }

  function handleSave() {
    onSave({
      man_days:      parseFloat(calc.manDays.toFixed(2)),
      material_cost: parseFloat(calc.totalMat.toFixed(2)),
      data: { ...state, laborRatePerHour, gpmd, materialPrices, calc },
    })
  }

  return (
    <div className="space-y-5">

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

      {/* ── Wall Type Selector ── */}
      <div>
        <SectionHeader title="Wall Type" />
        <div className="flex gap-2">
          {['CMU', 'PIP', 'Timber'].map(t => (
            <button
              key={t}
              onClick={() => setWallType(t)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                wallType === t
                  ? 'bg-green-700 text-white border-green-700'
                  : 'border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {t === 'CMU' ? 'CMU Block' : t === 'PIP' ? 'Poured In Place' : 'Timber / Lumber'}
            </button>
          ))}
        </div>
      </div>

      {/* ── CMU Block Wall ── */}
      {wallType === 'CMU' && (
        <div>
          <SectionHeader title="CMU Block Wall" />
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Linear Feet of Wall</label>
              <NumInput value={cmuLF} onChange={setCmuLF} placeholder="0" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Wall Finish Height (in)</label>
              <NumInput value={cmuHeightIn} onChange={setCmuHeightIn} placeholder="48" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Footing Width (in)</label>
              <NumInput value={cmuFootingWIn} onChange={setCmuFootingWIn} placeholder="12" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Footing Depth (in)</label>
              <NumInput value={cmuFootingDIn} onChange={setCmuFootingDIn} placeholder="12" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Vertical Rebar Spacing (in)</label>
              <NumInput value={cmuRebarSpIn} onChange={setCmuRebarSpIn} placeholder="16" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Horiz. Bars in Footing</label>
              <NumInput value={cmuHorizBars} onChange={setCmuHorizBars} placeholder="2" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Bond Beam Courses</label>
              <NumInput value={cmuBondBeams} onChange={setCmuBondBeams} placeholder="1" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">% Grouted Solid</label>
              <div className="relative">
                <NumInput value={cmuPctGrouted} onChange={setCmuPctGrouted} placeholder="100" />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">%</span>
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">% of Wall Curved</label>
              <div className="relative">
                <NumInput value={cmuPctCurved} onChange={setCmuPctCurved} placeholder="0" />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">%</span>
              </div>
            </div>
          </div>
          <div className="space-y-0 mb-2">
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

          {n(cmuLF) > 0 && calc.cmuDetail.rawBlocks > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-xs text-gray-600 flex flex-wrap gap-3">
              <span>Grey Blocks: <strong>{calc.cmuDetail.orderGreyBlock}</strong></span>
              <span>Bond Beam: <strong>{calc.cmuDetail.orderBBBlock}</strong></span>
              <span>Footing: <strong>{calc.cmuDetail.footingCY.toFixed(3)} CY</strong></span>
              <span>Grout: <strong>{calc.cmuDetail.groutCY.toFixed(3)} CY</strong></span>
              <span>Rebar: <strong>{calc.cmuDetail.totalRebarLF.toFixed(0)} LF</strong></span>
              {calc.cmuDetail.curveAdd > 0 && <span>Curve add: <strong>{calc.cmuDetail.curveAdd.toFixed(2)} hrs</strong></span>}
            </div>
          )}

          {/* Waterproofing — CMU only */}
          <div className="mt-3">
            <label className="block text-xs text-gray-500 mb-1 font-medium">Waterproofing</label>
            <div className="flex items-center gap-2">
              <select className="input text-sm py-1.5 flex-1" value={wpType} onChange={e => setWpType(e.target.value)}>
                <option>None</option>
                <option>Primer &amp; Membrane</option>
                <option>3 Coats Roll On</option>
                <option>Thoroseal &amp; Roll On</option>
                <option>Dimple Membrane</option>
              </select>
              {wpType !== 'None' && (
                <div className="w-32">
                  <NumInput value={wpSF} onChange={setWpSF} placeholder="0" />
                </div>
              )}
              {wpType !== 'None' && <span className="text-xs text-gray-400 shrink-0">SF</span>}
            </div>
          </div>
        </div>
      )}

      {/* ── Poured In Place Wall ── */}
      {wallType === 'PIP' && (
        <div>
          <SectionHeader title="Poured In Place Wall" />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Linear Feet of Wall</label>
              <NumInput value={pipLF} onChange={setPipLF} placeholder="0" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Wall Finish Height (in)</label>
              <NumInput value={pipHeightIn} onChange={setPipHeightIn} placeholder="48" />
            </div>
          </div>
          {n(pipLF) > 0 && n(pipHeightIn) > 0 && (
            <div className="mt-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-xs text-gray-600">
              Est. concrete: <strong>{(n(pipLF) * (0.2833 + Math.max(0, Math.ceil((n(pipHeightIn) - 6) / 6)) * 0.3667)).toFixed(2)} CY</strong>
              {' · '}Labor: <strong>{calc.totalHrs.toFixed(1)} hrs</strong>
            </div>
          )}
        </div>
      )}

      {/* ── Timber / Lumber Wall ── */}
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
        <div className="overflow-x-auto">
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
                { label: 'Sand Stucco',       sf: sandStuccoSF,   setSf: setSandStuccoSF,   mat: calc.sandStuccoMat,   rate: `$${r('sandStucco').toFixed(2)}/SF` },
                { label: 'Smooth Stucco',     sf: smoothStuccoSF, setSf: setSmoothStuccoSF, mat: calc.smoothStuccoMat, rate: `$${r('smoothStucco').toFixed(2)}/SF` },
                { label: 'Ledgerstone Veneer',sf: ledgerstoneSF,  setSf: setLedgerstoneSF,  mat: calc.ledgerstoneMat,  rate: `$${r('ledgerstone').toFixed(2)}/SF` },
                { label: 'Stacked Stone',     sf: stackedStoneSF, setSf: setStackedStoneSF, mat: calc.stackedStoneMat, rate: `$${r('stackedStone').toFixed(2)}/SF` },
                { label: 'Tile',              sf: tileSF,         setSf: setTileSF,         mat: calc.tileMat,         rate: `$${r('tile').toFixed(2)}/SF` },
              ].map(({ label, sf, setSf, mat, rate }) => (
                <tr key={label} className="border-b border-gray-100">
                  <td className="py-1 pr-2 text-xs text-gray-700">{label}</td>
                  <td className="py-1 pr-2"><NumInput value={sf} onChange={setSf} /></td>
                  <td className="py-1 pr-2 text-xs text-gray-400">{rate}</td>
                  <td className="py-1 text-right text-xs text-gray-600">{n(sf) > 0 ? `$${mat.toFixed(2)}` : '—'}</td>
                </tr>
              ))}

              {/* Real Flagstone — editable $/ton */}
              <tr className="border-b border-gray-100">
                <td className="py-1 pr-2 text-xs text-gray-700">Real Flagstone</td>
                <td className="py-1 pr-2"><NumInput value={flagstoneSF} onChange={setFlagstoneSF} /></td>
                <td className="py-1 pr-2">
                  <div className="relative w-24">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">$</span>
                    <input type="number" step="any" min="0"
                      className="input text-sm py-1.5 pl-5 w-full"
                      placeholder={r('flagstone').toString()}
                      value={flagstoneRateIn}
                      onChange={e => setFlagstoneRateIn(e.target.value)}
                    />
                  </div>
                </td>
                <td className="py-1 text-right text-xs text-gray-600">
                  {n(flagstoneSF) > 0 ? `$${calc.flagstoneMat.toFixed(2)}` : '—'}
                </td>
              </tr>

              {/* Real Stone — editable $/ton */}
              <tr className="border-b border-gray-100">
                <td className="py-1 pr-2 text-xs text-gray-700">Real Stone</td>
                <td className="py-1 pr-2"><NumInput value={realStoneSF} onChange={setRealStoneSF} /></td>
                <td className="py-1 pr-2">
                  <div className="relative w-24">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">$</span>
                    <input type="number" step="any" min="0"
                      className="input text-sm py-1.5 pl-5 w-full"
                      placeholder={r('realStone').toString()}
                      value={realStoneRateIn}
                      onChange={e => setRealStoneRateIn(e.target.value)}
                    />
                  </div>
                </td>
                <td className="py-1 text-right text-xs text-gray-600">
                  {n(realStoneSF) > 0 ? `$${calc.realStoneMat.toFixed(2)}` : '—'}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Wall Caps ── */}
      <div>
        <SectionHeader title="Wall Caps" />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 border-b border-gray-200">
                <th className="text-left pb-1 pr-2 font-medium">Type</th>
                <th className="text-left pb-1 pr-2 font-medium">Width (in)</th>
                <th className="text-left pb-1 pr-2 font-medium">Lin. Ft / Qty</th>
                <th className="text-right pb-1 font-medium text-gray-400">Mat $</th>
              </tr>
            </thead>
            <tbody>
              {capRows.map((cap, i) => {
                const isActive = cap.type !== 'None'
                return (
                  <tr key={i} className="border-b border-gray-100">
                    <td className="py-1 pr-2">
                      <select className="input text-sm py-1 w-36"
                        value={cap.type}
                        onChange={e => updateCap(i, 'type', e.target.value)}>
                        {CAP_TYPES.map(t => <option key={t}>{t}</option>)}
                      </select>
                    </td>
                    <td className="py-1 pr-2">
                      {isActive && cap.type !== 'Precast' && (
                        <NumInput value={cap.widthIn} onChange={v => updateCap(i, 'widthIn', v)} className="w-20" placeholder="4" />
                      )}
                    </td>
                    <td className="py-1 pr-2">
                      {isActive && (
                        <NumInput
                          value={cap.type === 'Precast' ? cap.qty : cap.lf}
                          onChange={v => updateCap(i, cap.type === 'Precast' ? 'qty' : 'lf', v)}
                          className="w-20"
                          placeholder="0"
                        />
                      )}
                    </td>
                    <td className="py-1 text-right text-xs text-gray-600">
                      {isActive ? '—' : ''}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

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
      </div>

      {/* Hours Adjustment */}
      <div className="flex items-center gap-3 bg-gray-50 rounded-lg px-4 py-3">
        <label className="text-sm font-medium text-gray-700 whitespace-nowrap flex-1">Hours Adjustment</label>
        <NumInput value={hoursAdj} onChange={setHoursAdj} placeholder="0" className="w-28" />
        <span className="text-xs text-gray-400">Net: {calc.totalHrs.toFixed(2)} hrs</span>
      </div>

      {/* GPMD summary bar */}
      <GpmdBar
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

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <button onClick={onBack} className="btn-secondary flex-1">← Back</button>
        <button onClick={handleSave} disabled={saving} className="btn-primary flex-1">
          {saving ? 'Saving...' : 'Add Module'}
        </button>
      </div>
    </div>
  )
}
