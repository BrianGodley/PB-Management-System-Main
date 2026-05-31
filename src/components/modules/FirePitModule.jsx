import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import GpmdBar from './GpmdBar'
import ModuleNotesField from './ModuleNotesField'
import RateEditPopover from '../RateEditPopover'
import { fetchSalesTaxRate } from '../../lib/companyDefaults'
import { calcWalkAccessLabor, DEFAULT_WALK_ACCESS_PACE_LF_PER_MIN } from '../../lib/walkAccess'

// ─────────────────────────────────────────────────────────────────────────────
// Fire Pit Module — based on Fire Pit Module tab in Excel estimator
// Covers: CMU block walls, gas fixtures, wall finishes, manual entry
// Standard CMU block: 16"L × 8"H × 8"W
// ─────────────────────────────────────────────────────────────────────────────

const FP_RATES = {
  // ── Structural material costs ───────────────────────────────────────────────
  fpBlock: { dbName: 'FP Block', fallback: 2.5 }, // $/block
  fpRebar: { dbName: 'FP Rebar', fallback: 0.5 }, // $/LF
  fpConcrete: { dbName: 'FP Concrete', fallback: 149.5 }, // $/CY (footing & grout)
  fpGroutPump: { dbName: 'FP Grout Pump Setup', fallback: 150.0 }, // flat fee when pump used
  fpGasRing: { dbName: 'FP Gas Ring/Burner', fallback: 25.0 }, // $/unit hardware
  fpGasPipe: { dbName: 'FP Gas Pipe', fallback: 3.0 }, // $/LF

  // ── Wall finish material costs ──────────────────────────────────────────────
  sandStucco: { dbName: 'Sand Stucco - FP', fallback: 0.0 }, // $/SF (labor only by default)
  smoothStucco: { dbName: 'Smooth Stucco - FP', fallback: 0.0 }, // $/SF
  ledgerstone: { dbName: 'Ledgerstone - FP', fallback: 10.0 }, // $/SF panel
  stackedStone: { dbName: 'Stacked Stone - FP', fallback: 10.0 }, // $/SF panel
  tile: { dbName: 'Tile - FP', fallback: 6.5 }, // $/SF
  realFlagstone: { dbName: 'Real Flagstone - FP', fallback: 400.0 }, // $/ton (editable per-job)
  realStone: { dbName: 'Real Stone - FP', fallback: 400.0 }, // $/ton (editable per-job)

  // ── Labor productivity rates ────────────────────────────────────────────────
  digLab: { dbName: 'FP Dig Footing Labor Rate', fallback: 4.0 }, // CF/hr
  rebarLab: { dbName: 'FP Set Rebar Labor Rate', fallback: 35.0 }, // LF/hr
  blockLab: { dbName: 'FP Set Blocks Labor Rate', fallback: 10.4 }, // blocks/hr
  handGroutLab: { dbName: 'FP Hand Grout Labor Rate', fallback: 5.5 }, // CF/hr
  pumpGroutLab: { dbName: 'FP Pump Grout Labor Rate', fallback: 81.0 }, // CF/hr
  gasTrenchLab: { dbName: 'FP Gas Trench Labor Rate', fallback: 35.0 }, // LF/day
  sandStuccoLab: { dbName: 'Sand Stucco - FP Labor Rate', fallback: 92 }, // SF/day
  smoothStuccoLab: { dbName: 'Smooth Stucco - FP Labor Rate', fallback: 65 }, // SF/day
  ledgerstoneLab: { dbName: 'Ledgerstone - FP Labor Rate', fallback: 24 }, // SF/day
  stackedStoneLab: { dbName: 'Stacked Stone - FP Labor Rate', fallback: 24 }, // SF/day
  tileLab: { dbName: 'Tile - FP Labor Rate', fallback: 0.2867 }, // hrs/SF (layout+install)
  flagstoneLab: { dbName: 'Real Flagstone - FP Labor Rate', fallback: 0.4487 }, // hrs/SF (delivery+install+seal)
  realStoneLab: { dbName: 'Real Stone - FP Labor Rate', fallback: 0.8954 }, // hrs/SF (transport+install+seal)
}

const DEFAULTS = {
  laborRatePerHour: 35,
  laborBurdenPct: 0.29,
  gpmd: 425,
  commissionRate: 0.12,
}

const n = v => parseFloat(v) || 0

// Standard CMU block dimensions (inches)
const BLOCK_LENGTH_IN = 16
const BLOCK_HEIGHT_IN = 8
const BLOCK_WIDTH_IN = 8
// Interior void per block (CF) — (L-2) × H × (W-2) / 1728
const GROUT_CF_PER_BLOCK = ((BLOCK_LENGTH_IN - 2) * BLOCK_HEIGHT_IN * (BLOCK_WIDTH_IN - 2)) / 1728

// ── Calculation engine ────────────────────────────────────────────────────────
function calcFirePit(
  state,
  lrph = DEFAULTS.laborRatePerHour,
  mp = {},
  gpmd = DEFAULTS.gpmd,
  walkAccess = null
) {
  const _pace = parseFloat(walkAccess?.paceLfPerMin) || DEFAULT_WALK_ACCESS_PACE_LF_PER_MIN
  const {
    difficulty,
    hoursAdj,
    layoutHrs,
    wallLF,
    wallHeightIn,
    footingWidthIn,
    footingDepthIn,
    rebarSpacingIn,
    bondBeamCourses,
    pctGrouted,
    pctCurved,
    useGroutPump,
    gasRingCount,
    gasTrenchLF,
    sandStuccoSF,
    smoothStuccoSF,
    ledgerstoneSF,
    stackedStoneSF,
    tileSF,
    flagstoneSF,
    flagstoneRateInput,
    realStoneSF,
    realStoneRateInput,
    manualRows,
  } = state

  const p = (dbName, fallback) => mp[dbName] ?? fallback

  // ── Block geometry ───────────────────────────────────────────────────────────
  const blocksPerCourse = n(wallLF) > 0 ? Math.ceil((n(wallLF) * 12) / BLOCK_LENGTH_IN) : 0
  const coursesCount = n(wallHeightIn) > 0 ? Math.ceil(n(wallHeightIn) / BLOCK_HEIGHT_IN) : 0
  const rawBlocks = blocksPerCourse * coursesCount
  const totalBlocks = rawBlocks * 1.1 // +10% waste for ordering

  // ── Footing ──────────────────────────────────────────────────────────────────
  const footingCF = (n(footingWidthIn) / 12) * (n(footingDepthIn) / 12) * n(wallLF)
  const footingCY = footingCF / 27

  // ── Grout ────────────────────────────────────────────────────────────────────
  const groutCF = rawBlocks * GROUT_CF_PER_BLOCK * (n(pctGrouted) / 100)
  const groutCY = groutCF / 27

  // ── Rebar ────────────────────────────────────────────────────────────────────
  const vertRebars = n(rebarSpacingIn) > 0 ? Math.ceil((n(wallLF) * 12) / n(rebarSpacingIn)) : 0
  const vertRebarLF = (vertRebars * (n(wallHeightIn) + n(footingDepthIn))) / 12
  const horizRebarLF = (2 + n(bondBeamCourses)) * n(wallLF) // 2 footing bars + bond beams
  const totalRebarLF = vertRebarLF + horizRebarLF

  // ── Labor hours ───────────────────────────────────────────────────────────────
  const layoutHrsN = n(layoutHrs)
  const digHrs = footingCF > 0 ? footingCF / p(FP_RATES.digLab.dbName, FP_RATES.digLab.fallback) : 0
  const rebarHrs =
    totalRebarLF > 0 ? totalRebarLF / p(FP_RATES.rebarLab.dbName, FP_RATES.rebarLab.fallback) : 0
  const setBlockHrs =
    rawBlocks > 0 ? rawBlocks / p(FP_RATES.blockLab.dbName, FP_RATES.blockLab.fallback) : 0
  const groutRate =
    useGroutPump === 'Yes'
      ? p(FP_RATES.pumpGroutLab.dbName, FP_RATES.pumpGroutLab.fallback)
      : p(FP_RATES.handGroutLab.dbName, FP_RATES.handGroutLab.fallback)
  const groutHrs = groutCF > 0 ? groutCF / groutRate : 0
  const gasTrenchHrs =
    n(gasTrenchLF) > 0
      ? (n(gasTrenchLF) / p(FP_RATES.gasTrenchLab.dbName, FP_RATES.gasTrenchLab.fallback)) * 8
      : 0

  // Curved adjustment: curved sections take 25% more structural labor
  const structuralBaseHrs = digHrs + rebarHrs + setBlockHrs + groutHrs
  const curveAddHrs = structuralBaseHrs * (n(pctCurved) / 100) * 0.25

  // ── Wall finish labor ─────────────────────────────────────────────────────────
  const sandStuccoHrs =
    n(sandStuccoSF) > 0
      ? (n(sandStuccoSF) / p(FP_RATES.sandStuccoLab.dbName, FP_RATES.sandStuccoLab.fallback)) * 8
      : 0
  const smoothStuccoHrs =
    n(smoothStuccoSF) > 0
      ? (n(smoothStuccoSF) /
          p(FP_RATES.smoothStuccoLab.dbName, FP_RATES.smoothStuccoLab.fallback)) *
        8
      : 0
  const ledgerstoneHrs =
    n(ledgerstoneSF) > 0
      ? (n(ledgerstoneSF) / p(FP_RATES.ledgerstoneLab.dbName, FP_RATES.ledgerstoneLab.fallback)) * 8
      : 0
  const stackedStoneHrs =
    n(stackedStoneSF) > 0
      ? (n(stackedStoneSF) /
          p(FP_RATES.stackedStoneLab.dbName, FP_RATES.stackedStoneLab.fallback)) *
        8
      : 0
  const tileHrs =
    n(tileSF) > 0 ? n(tileSF) * p(FP_RATES.tileLab.dbName, FP_RATES.tileLab.fallback) : 0
  const flagstoneHrs =
    n(flagstoneSF) > 0
      ? n(flagstoneSF) * p(FP_RATES.flagstoneLab.dbName, FP_RATES.flagstoneLab.fallback)
      : 0
  const realStoneHrs =
    n(realStoneSF) > 0
      ? n(realStoneSF) * p(FP_RATES.realStoneLab.dbName, FP_RATES.realStoneLab.fallback)
      : 0

  // ── Manual ───────────────────────────────────────────────────────────────────
  let manHrs = 0,
    manMat = 0,
    manSub = 0
  manualRows.forEach(r => {
    manHrs += n(r.hours)
    manMat += n(r.materials)
    manSub += n(r.subCost)
  })

  // ── Material costs ────────────────────────────────────────────────────────────
  const blockMat = totalBlocks * p(FP_RATES.fpBlock.dbName, FP_RATES.fpBlock.fallback)
  const rebarMat = totalRebarLF * p(FP_RATES.fpRebar.dbName, FP_RATES.fpRebar.fallback)
  const footingMat = footingCY * p(FP_RATES.fpConcrete.dbName, FP_RATES.fpConcrete.fallback)
  const groutMat = groutCY * p(FP_RATES.fpConcrete.dbName, FP_RATES.fpConcrete.fallback)
  const pumpSetupMat =
    useGroutPump === 'Yes' && groutCF > 0
      ? p(FP_RATES.fpGroutPump.dbName, FP_RATES.fpGroutPump.fallback)
      : 0
  const gasRingMat = n(gasRingCount) * p(FP_RATES.fpGasRing.dbName, FP_RATES.fpGasRing.fallback)
  const gasPipeMat = n(gasTrenchLF) * p(FP_RATES.fpGasPipe.dbName, FP_RATES.fpGasPipe.fallback)

  const sandStuccoMat =
    n(sandStuccoSF) * p(FP_RATES.sandStucco.dbName, FP_RATES.sandStucco.fallback)
  const smoothStuccoMat =
    n(smoothStuccoSF) * p(FP_RATES.smoothStucco.dbName, FP_RATES.smoothStucco.fallback)
  const ledgerstoneMat =
    n(ledgerstoneSF) > 0
      ? n(ledgerstoneSF) * p(FP_RATES.ledgerstone.dbName, FP_RATES.ledgerstone.fallback) * 1.1 +
        (n(ledgerstoneSF) / 5) * 2
      : 0
  const stackedStoneMat =
    n(stackedStoneSF) > 0
      ? n(stackedStoneSF) * p(FP_RATES.stackedStone.dbName, FP_RATES.stackedStone.fallback) * 1.1 +
        (n(stackedStoneSF) / 5) * 2
      : 0
  const tileMat =
    n(tileSF) > 0
      ? n(tileSF) * p(FP_RATES.tile.dbName, FP_RATES.tile.fallback) + n(tileSF) // +$1/SF adhesive/grout
      : 0
  const realFlagRate =
    n(flagstoneRateInput) || p(FP_RATES.realFlagstone.dbName, FP_RATES.realFlagstone.fallback)
  const flagstoneMat =
    n(flagstoneSF) > 0
      ? (n(flagstoneSF) / 80) * realFlagRate + (n(flagstoneSF) / 80) * 80 + 268.75
      : 0
  const realStoneRt =
    n(realStoneRateInput) || p(FP_RATES.realStone.dbName, FP_RATES.realStone.fallback)
  const realStoneMat =
    n(realStoneSF) > 0
      ? (n(realStoneSF) / 70) * realStoneRt + (n(realStoneSF) / 70) * 180 + n(realStoneSF)
      : 0

  // ── Totals ───────────────────────────────────────────────────────────────────
  const baseHrs =
    layoutHrsN +
    structuralBaseHrs +
    curveAddHrs +
    gasTrenchHrs +
    sandStuccoHrs +
    smoothStuccoHrs +
    ledgerstoneHrs +
    stackedStoneHrs +
    tileHrs +
    flagstoneHrs +
    realStoneHrs +
    manHrs

  const diffMod = 1 + n(difficulty) / 100
  const _preWalkHrs = baseHrs * diffMod + n(hoursAdj)
  const walkHrs = calcWalkAccessLabor(_preWalkHrs, state.distanceLF, { paceLfPerMin: _pace })
  const totalHrs = _preWalkHrs + walkHrs
  const manDays = totalHrs / 8

  const totalMat =
    blockMat +
    rebarMat +
    footingMat +
    groutMat +
    pumpSetupMat +
    gasRingMat +
    gasPipeMat +
    sandStuccoMat +
    smoothStuccoMat +
    ledgerstoneMat +
    stackedStoneMat +
    tileMat +
    flagstoneMat +
    realStoneMat +
    manMat

  const laborCost = totalHrs * lrph
  const burden = laborCost * DEFAULTS.laborBurdenPct
  const gp = manDays * gpmd
  const commission = gp * DEFAULTS.commissionRate
  const subCost = manSub
  const price = totalMat + laborCost + burden + gp + commission + subCost

  return {
    walkHrs,
    totalHrs,
    manDays,
    totalMat,
    laborCost,
    burden,
    gp,
    commission,
    subCost,
    price,
    blocksPerCourse,
    coursesCount,
    rawBlocks,
    totalBlocks,
    footingCF,
    footingCY,
    groutCF,
    groutCY,
    totalRebarLF,
    curveAddHrs,
    structureMat: blockMat + rebarMat + footingMat + groutMat + pumpSetupMat,
    fixturesMat: gasRingMat + gasPipeMat,
    finishesMat:
      sandStuccoMat +
      smoothStuccoMat +
      ledgerstoneMat +
      stackedStoneMat +
      tileMat +
      flagstoneMat +
      realStoneMat,
    sandStuccoMat,
    smoothStuccoMat,
    ledgerstoneMat,
    stackedStoneMat,
    tileMat,
    flagstoneMat,
    realStoneMat,
  }
}

// ── Sub-components ────────────────────────────────────────────────────────────
function SectionHeader({ title }) {
  return (
    <div className="bg-gray-50 rounded-lg px-4 py-2.5 border border-gray-200 mb-2">
      <h3 className="text-xs font-bold text-gray-600 uppercase tracking-wider">{title}</h3>
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

function LabeledRow({ label, children, note }) {
  return (
    <div className="flex items-center gap-3 py-1.5 border-b border-gray-100">
      <span className="text-xs text-gray-700 w-44 shrink-0">{label}</span>
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

// ── Main component ────────────────────────────────────────────────────────────
export default function FirePitModule({ onSave, onBack, saving, initialData }) {
  const [laborRatePerHour, setLaborRatePerHour] = useState(
    initialData?.laborRatePerHour ?? DEFAULTS.laborRatePerHour
  )

  // Free-text notes for this module — Sam writes auto-generated
  // takeoffs here via create_estimate_from_takeoff, and the user can
  // overwrite / append their own.
  const [notes, setNotes] = useState(initialData?.notes ?? '')
  const [distanceLF, setDistanceLF] = useState(initialData?.distanceLF ?? '')
  const [walkAccess, setWalkAccess] = useState(
    initialData?.walkAccess ?? {
      paceLfPerMin: DEFAULT_WALK_ACCESS_PACE_LF_PER_MIN,
    }
  )
  const [materialPrices, setMaterialPrices] = useState(initialData?.materialPrices ?? {})
  const [pricesLoading, setPricesLoading] = useState(!initialData?.materialPrices)

  // Re-fetch Fire Pit merged labor+material map. Used on mount and after edit.
  const refreshAllRates = useCallback(async () => {
    const [matRes, labRes] = await Promise.all([
      supabase.from('material_rates').select('name, unit_cost').eq('category', 'Fire Pit'),
      supabase.from('labor_rates').select('name, rate').eq('category', 'Fire Pit'),
    ])
    const prices = {}
    ;(matRes.data || []).forEach(r => {
      prices[r.name] = parseFloat(r.unit_cost) || 0
    })
    ;(labRes.data || []).forEach(r => {
      prices[r.name] = parseFloat(r.rate) || 0
    })
    setMaterialPrices(prices)
  }, [])

  useEffect(() => {
    if (!initialData?.laborRatePerHour) {
      supabase
        .from('company_settings')
        .select('labor_rate_per_hour, walk_access_pace_lf_per_min')
        .single()
        .then(({ data }) => {
          if (!data) return
          if (data.labor_rate_per_hour != null)
            setLaborRatePerHour(parseFloat(data.labor_rate_per_hour) || DEFAULTS.laborRatePerHour)
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
    if (initialData?.materialPrices) return
    refreshAllRates().then(() => setPricesLoading(false))
  }, [refreshAllRates])

  const gpmd = initialData?.gpmd ?? DEFAULTS.gpmd
  const subGpMarkupRate = initialData?.subGpMarkupRate ?? 0.2

  // ── State ──────────────────────────────────────────────────────────────────
  const [difficulty, setDifficulty] = useState(initialData?.difficulty ?? '')
  const [crewType, setCrewType] = useState(initialData?.crewType ?? 'Masonry')
  const [hoursAdj, setHoursAdj] = useState(initialData?.hoursAdj ?? '')
  const [layoutHrs, setLayoutHrs] = useState(initialData?.layoutHrs ?? '')
  // Structure
  const [wallLF, setWallLF] = useState(initialData?.wallLF ?? '')
  const [wallHeightIn, setWallHeightIn] = useState(initialData?.wallHeightIn ?? '40')
  const [footingWidthIn, setFootingWidthIn] = useState(initialData?.footingWidthIn ?? '12')
  const [footingDepthIn, setFootingDepthIn] = useState(initialData?.footingDepthIn ?? '12')
  const [rebarSpacingIn, setRebarSpacingIn] = useState(initialData?.rebarSpacingIn ?? '16')
  const [bondBeamCourses, setBondBeamCourses] = useState(initialData?.bondBeamCourses ?? '1')
  const [pctGrouted, setPctGrouted] = useState(initialData?.pctGrouted ?? '100')
  const [pctCurved, setPctCurved] = useState(initialData?.pctCurved ?? '0')
  const [useGroutPump, setUseGroutPump] = useState(initialData?.useGroutPump ?? 'No')
  // Fixtures
  const [gasRingCount, setGasRingCount] = useState(initialData?.gasRingCount ?? '')
  const [gasTrenchLF, setGasTrenchLF] = useState(initialData?.gasTrenchLF ?? '')
  // Wall Finishes
  const [sandStuccoSF, setSandStuccoSF] = useState(initialData?.sandStuccoSF ?? '')
  const [smoothStuccoSF, setSmoothStuccoSF] = useState(initialData?.smoothStuccoSF ?? '')
  const [ledgerstoneSF, setLedgerstoneSF] = useState(initialData?.ledgerstoneSF ?? '')
  const [stackedStoneSF, setStackedStoneSF] = useState(initialData?.stackedStoneSF ?? '')
  const [tileSF, setTileSF] = useState(initialData?.tileSF ?? '')
  const [flagstoneSF, setFlagstoneSF] = useState(initialData?.flagstoneSF ?? '')
  const [flagstoneRateInput, setFlagstoneRateInput] = useState(
    initialData?.flagstoneRateInput ?? ''
  )
  const [realStoneSF, setRealStoneSF] = useState(initialData?.realStoneSF ?? '')
  const [realStoneRateInput, setRealStoneRateInput] = useState(
    initialData?.realStoneRateInput ?? ''
  )
  const [manualRows, setManualRows] = useState(initialData?.manualRows ?? DEFAULT_MANUAL_ROWS)

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

  // Pre-fill editable stone rates once DB prices load
  useEffect(() => {
    if (Object.keys(materialPrices).length === 0) return
    if (!initialData?.flagstoneRateInput && materialPrices[FP_RATES.realFlagstone.dbName]) {
      setFlagstoneRateInput(materialPrices[FP_RATES.realFlagstone.dbName].toString())
    }
    if (!initialData?.realStoneRateInput && materialPrices[FP_RATES.realStone.dbName]) {
      setRealStoneRateInput(materialPrices[FP_RATES.realStone.dbName].toString())
    }
  }, [materialPrices])

  const state = {
    crewType,
    difficulty,
    hoursAdj,
    layoutHrs,
    wallLF,
    wallHeightIn,
    footingWidthIn,
    footingDepthIn,
    rebarSpacingIn,
    bondBeamCourses,
    pctGrouted,
    pctCurved,
    useGroutPump,
    gasRingCount,
    gasTrenchLF,
    sandStuccoSF,
    smoothStuccoSF,
    ledgerstoneSF,
    stackedStoneSF,
    tileSF,
    flagstoneSF,
    flagstoneRateInput,
    realStoneSF,
    realStoneRateInput,
    manualRows,
    distanceLF,
  }
  const calcRaw = calcFirePit(state, laborRatePerHour, materialPrices, gpmd, walkAccess)
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

  const p = (dbName, fallback) => materialPrices[dbName] ?? fallback

  function updateManual(i, field, val) {
    setManualRows(rows => rows.map((r, idx) => (idx === i ? { ...r, [field]: val } : r)))
  }

  function handleSave() {
    onSave({
      notes,
      man_days: parseFloat(calc.manDays.toFixed(2)),
      material_cost: parseFloat(calc.totalMat.toFixed(2)),
      data: { ...state, walkAccess, laborRatePerHour, gpmd, materialPrices, calc },
    })
  }

  return (
    <div className="space-y-5">
      {/* ── Sticky GPMD bar ── */}
      <div className="sticky top-0 z-20 -mx-6 px-6 pt-2 pb-2 bg-gray-900 shadow-lg">
        {/* GPMD summary bar */}
        <GpmdBar
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
      <div className="sticky top-[68px] z-10 -mx-6 px-6 pt-2 pb-2 bg-transparent">
        <ModuleNotesField value={notes} onChange={setNotes} />
      </div>

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

      {/* Settings */}
      <SectionHeader title="Settings" />
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

      {/* ── Fire Pit Structure ── */}
      <div>
        <SectionHeader title="Fire Pit Structure (CMU Block)" />
        <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 mb-3 text-[11px] text-gray-500">
          <p className="font-semibold uppercase tracking-wide text-gray-400 mb-1">
            FP Structural Rates (click any to edit)
          </p>
          <div className="flex flex-wrap gap-x-3 gap-y-1">
            <span className="inline-flex items-center gap-1">
              Block ${p(FP_RATES.fpBlock.dbName, 2.5).toFixed(2)}/ea
              <RateEditPopover
                table="material_rates"
                name={FP_RATES.fpBlock.dbName}
                category="Fire Pit"
                unitLabel="ea"
                currentValue={p(FP_RATES.fpBlock.dbName, FP_RATES.fpBlock.fallback)}
                onSaved={refreshAllRates}
              />
            </span>
            <span className="inline-flex items-center gap-1">
              Rebar ${p(FP_RATES.fpRebar.dbName, 0.5).toFixed(2)}/LF
              <RateEditPopover
                table="material_rates"
                name={FP_RATES.fpRebar.dbName}
                category="Fire Pit"
                unitLabel="LF"
                currentValue={p(FP_RATES.fpRebar.dbName, FP_RATES.fpRebar.fallback)}
                onSaved={refreshAllRates}
              />
            </span>
            <span className="inline-flex items-center gap-1">
              Concrete ${p(FP_RATES.fpConcrete.dbName, 149.5).toFixed(2)}/CY
              <RateEditPopover
                table="material_rates"
                name={FP_RATES.fpConcrete.dbName}
                category="Fire Pit"
                unitLabel="CY"
                currentValue={p(FP_RATES.fpConcrete.dbName, FP_RATES.fpConcrete.fallback)}
                onSaved={refreshAllRates}
              />
            </span>
            <span className="inline-flex items-center gap-1">
              Grout pump ${p(FP_RATES.fpGroutPump.dbName, 150).toFixed(2)}
              <RateEditPopover
                table="material_rates"
                name={FP_RATES.fpGroutPump.dbName}
                category="Fire Pit"
                unitLabel="flat"
                currentValue={p(FP_RATES.fpGroutPump.dbName, FP_RATES.fpGroutPump.fallback)}
                onSaved={refreshAllRates}
              />
            </span>
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1">
            <span className="inline-flex items-center gap-1">
              Dig {p(FP_RATES.digLab.dbName, 4)} CF/hr
              <RateEditPopover
                table="labor_rates"
                name={FP_RATES.digLab.dbName}
                category="Fire Pit"
                mode="coefficient"
                unitLabel="CF/hr"
                currentValue={p(FP_RATES.digLab.dbName, FP_RATES.digLab.fallback)}
                onSaved={refreshAllRates}
              />
            </span>
            <span className="inline-flex items-center gap-1">
              Rebar {p(FP_RATES.rebarLab.dbName, 35)} LF/hr
              <RateEditPopover
                table="labor_rates"
                name={FP_RATES.rebarLab.dbName}
                category="Fire Pit"
                mode="coefficient"
                unitLabel="LF/hr"
                currentValue={p(FP_RATES.rebarLab.dbName, FP_RATES.rebarLab.fallback)}
                onSaved={refreshAllRates}
              />
            </span>
            <span className="inline-flex items-center gap-1">
              Block {p(FP_RATES.blockLab.dbName, 10.4)} blk/hr
              <RateEditPopover
                table="labor_rates"
                name={FP_RATES.blockLab.dbName}
                category="Fire Pit"
                mode="coefficient"
                unitLabel="blk/hr"
                currentValue={p(FP_RATES.blockLab.dbName, FP_RATES.blockLab.fallback)}
                onSaved={refreshAllRates}
              />
            </span>
            <span className="inline-flex items-center gap-1">
              Hand grout {p(FP_RATES.handGroutLab.dbName, 5.5)} CF/hr
              <RateEditPopover
                table="labor_rates"
                name={FP_RATES.handGroutLab.dbName}
                category="Fire Pit"
                mode="coefficient"
                unitLabel="CF/hr"
                currentValue={p(FP_RATES.handGroutLab.dbName, FP_RATES.handGroutLab.fallback)}
                onSaved={refreshAllRates}
              />
            </span>
            <span className="inline-flex items-center gap-1">
              Pump grout {p(FP_RATES.pumpGroutLab.dbName, 81)} CF/hr
              <RateEditPopover
                table="labor_rates"
                name={FP_RATES.pumpGroutLab.dbName}
                category="Fire Pit"
                mode="coefficient"
                unitLabel="CF/hr"
                currentValue={p(FP_RATES.pumpGroutLab.dbName, FP_RATES.pumpGroutLab.fallback)}
                onSaved={refreshAllRates}
              />
            </span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Wall Perimeter (LF)</label>
            <NumInput value={wallLF} onChange={setWallLF} placeholder="0" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Wall Height (inches)</label>
            <NumInput value={wallHeightIn} onChange={setWallHeightIn} placeholder="40" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Footing Width (inches)</label>
            <NumInput value={footingWidthIn} onChange={setFootingWidthIn} placeholder="12" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Footing Depth (inches)</label>
            <NumInput value={footingDepthIn} onChange={setFootingDepthIn} placeholder="12" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Rebar Spacing (inches)</label>
            <NumInput value={rebarSpacingIn} onChange={setRebarSpacingIn} placeholder="16" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Bond Beam Courses</label>
            <NumInput value={bondBeamCourses} onChange={setBondBeamCourses} placeholder="1" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">% Grouted</label>
            <div className="relative">
              <NumInput value={pctGrouted} onChange={setPctGrouted} placeholder="100" />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                %
              </span>
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">% Curved Wall</label>
            <div className="relative">
              <NumInput value={pctCurved} onChange={setPctCurved} placeholder="0" />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                %
              </span>
            </div>
          </div>
        </div>

        <LabeledRow label="Use Grout Pump?">
          <select
            className="input text-sm py-1.5 w-28"
            value={useGroutPump}
            onChange={e => setUseGroutPump(e.target.value)}
          >
            <option>No</option>
            <option>Yes</option>
          </select>
        </LabeledRow>

        {n(wallLF) > 0 && (
          <div className="mt-3 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-xs text-gray-600 flex flex-wrap gap-4">
            <span>
              Blocks: <strong>{calc.totalBlocks.toFixed(0)}</strong> ({calc.blocksPerCourse} ×{' '}
              {calc.coursesCount} courses + 10% waste)
            </span>
            <span>
              Footing: <strong>{calc.footingCY.toFixed(3)} CY</strong>
            </span>
            <span>
              Grout: <strong>{calc.groutCY.toFixed(3)} CY</strong>
            </span>
            <span>
              Rebar: <strong>{calc.totalRebarLF.toFixed(0)} LF</strong>
            </span>
            {calc.curveAddHrs > 0 && (
              <span>
                Curve add: <strong>{calc.curveAddHrs.toFixed(2)} hrs</strong>
              </span>
            )}
          </div>
        )}
      </div>

      {/* ── Gas Fixtures & Trench ── */}
      <div>
        <SectionHeader title="Gas Fixtures & Trench" />
        <div className="space-y-0">
          <div className="flex items-center gap-3 py-1.5 border-b border-gray-100">
            <span className="text-xs text-gray-700 w-44 shrink-0">Layout Time (Hours)</span>
            <NumInput value={layoutHrs} onChange={setLayoutHrs} placeholder="0" className="w-28" />
          </div>
          <div className="flex items-center gap-3 py-1.5 border-b border-gray-100">
            <span className="text-xs text-gray-700 w-44 shrink-0 inline-flex items-center gap-1">
              Gas Ring / Burner Openings
              <RateEditPopover
                table="material_rates"
                name={FP_RATES.fpGasRing.dbName}
                category="Fire Pit"
                unitLabel="ea"
                currentValue={p(FP_RATES.fpGasRing.dbName, FP_RATES.fpGasRing.fallback)}
                onSaved={refreshAllRates}
              />
            </span>
            <NumInput
              value={gasRingCount}
              onChange={setGasRingCount}
              placeholder="0"
              className="w-28"
            />
            {n(gasRingCount) > 0 && (
              <span className="text-xs text-gray-400 shrink-0">
                ${(n(gasRingCount) * p(FP_RATES.fpGasRing.dbName, 25)).toFixed(2)} mat
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 py-1.5 border-b border-gray-100">
            <span className="text-xs text-gray-700 w-44 shrink-0 inline-flex items-center gap-1">
              Gas Trench / Run (LF)
              <RateEditPopover
                table="labor_rates"
                name={FP_RATES.gasTrenchLab.dbName}
                category="Fire Pit"
                mode="coefficient"
                unitLabel="LF/day"
                currentValue={p(FP_RATES.gasTrenchLab.dbName, FP_RATES.gasTrenchLab.fallback)}
                onSaved={refreshAllRates}
              />
              <RateEditPopover
                table="material_rates"
                name={FP_RATES.fpGasPipe.dbName}
                category="Fire Pit"
                unitLabel="LF"
                currentValue={p(FP_RATES.fpGasPipe.dbName, FP_RATES.fpGasPipe.fallback)}
                onSaved={refreshAllRates}
              />
            </span>
            <NumInput
              value={gasTrenchLF}
              onChange={setGasTrenchLF}
              placeholder="0"
              className="w-28"
            />
            {n(gasTrenchLF) > 0 && (
              <span className="text-xs text-gray-400 shrink-0">
                ${(n(gasTrenchLF) * p(FP_RATES.fpGasPipe.dbName, 3)).toFixed(2)} mat
              </span>
            )}
          </div>
        </div>
      </div>

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
                <th className="text-right pb-1 font-medium text-gray-400">Material $</th>
              </tr>
            </thead>
            <tbody>
              {[
                {
                  label: 'Sand Stucco',
                  sf: sandStuccoSF,
                  setSf: setSandStuccoSF,
                  mat: calc.sandStuccoMat,
                  matKey: 'sandStucco',
                  labKey: 'sandStuccoLab',
                  fallback: 0,
                },
                {
                  label: 'Smooth Stucco',
                  sf: smoothStuccoSF,
                  setSf: setSmoothStuccoSF,
                  mat: calc.smoothStuccoMat,
                  matKey: 'smoothStucco',
                  labKey: 'smoothStuccoLab',
                  fallback: 0,
                },
                {
                  label: 'Ledgerstone Veneer',
                  sf: ledgerstoneSF,
                  setSf: setLedgerstoneSF,
                  mat: calc.ledgerstoneMat,
                  matKey: 'ledgerstone',
                  labKey: 'ledgerstoneLab',
                  fallback: 10,
                },
                {
                  label: 'Stacked Stone',
                  sf: stackedStoneSF,
                  setSf: setStackedStoneSF,
                  mat: calc.stackedStoneMat,
                  matKey: 'stackedStone',
                  labKey: 'stackedStoneLab',
                  fallback: 10,
                },
                {
                  label: 'Tile',
                  sf: tileSF,
                  setSf: setTileSF,
                  mat: calc.tileMat,
                  matKey: 'tile',
                  labKey: 'tileLab',
                  fallback: 6.5,
                },
              ].map(({ label, sf, setSf, mat, matKey, labKey, fallback }) => (
                <tr key={label} className="border-b border-gray-100">
                  <td className="py-1 pr-2 text-xs text-gray-700">{label}</td>
                  <td className="py-1 pr-2">
                    <NumInput value={sf} onChange={setSf} />
                  </td>
                  <td className="py-1 pr-2 text-xs text-gray-400">
                    <span className="inline-flex items-center gap-1 flex-wrap">
                      ${p(FP_RATES[matKey].dbName, fallback).toFixed(2)}/SF
                      <RateEditPopover
                        table="material_rates"
                        name={FP_RATES[matKey].dbName}
                        category="Fire Pit"
                        unitLabel="SF"
                        currentValue={p(FP_RATES[matKey].dbName, FP_RATES[matKey].fallback)}
                        onSaved={refreshAllRates}
                      />
                      <RateEditPopover
                        table="labor_rates"
                        name={FP_RATES[labKey].dbName}
                        category="Fire Pit"
                        mode="coefficient"
                        unitLabel="rate"
                        currentValue={p(FP_RATES[labKey].dbName, FP_RATES[labKey].fallback)}
                        onSaved={refreshAllRates}
                      />
                    </span>
                  </td>
                  <td className="py-1 text-right text-xs text-gray-600">
                    {n(sf) > 0 ? `$${mat.toFixed(2)}` : '—'}
                  </td>
                </tr>
              ))}

              {/* Real Flagstone — editable $/ton */}
              <tr className="border-b border-gray-100">
                <td className="py-1 pr-2 text-xs text-gray-700">
                  <span className="inline-flex items-center gap-1">
                    Real Flagstone
                    <RateEditPopover
                      table="labor_rates"
                      name={FP_RATES.flagstoneLab.dbName}
                      category="Fire Pit"
                      mode="coefficient"
                      unitLabel="hrs/SF"
                      currentValue={p(FP_RATES.flagstoneLab.dbName, FP_RATES.flagstoneLab.fallback)}
                      onSaved={refreshAllRates}
                    />
                  </span>
                </td>
                <td className="py-1 pr-2">
                  <NumInput value={flagstoneSF} onChange={setFlagstoneSF} />
                </td>
                <td className="py-1 pr-2">
                  <div className="flex items-center gap-1">
                    <div className="relative w-24">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">
                        $
                      </span>
                      <input
                        type="number"
                        step="any"
                        className="input text-sm py-1.5 pl-5 w-full"
                        placeholder={p(FP_RATES.realFlagstone.dbName, 400).toString()}
                        value={flagstoneRateInput}
                        onChange={e => setFlagstoneRateInput(e.target.value)}
                      />
                    </div>
                    <RateEditPopover
                      table="material_rates"
                      name={FP_RATES.realFlagstone.dbName}
                      category="Fire Pit"
                      unitLabel="ton"
                      currentValue={p(
                        FP_RATES.realFlagstone.dbName,
                        FP_RATES.realFlagstone.fallback
                      )}
                      onSaved={refreshAllRates}
                    />
                  </div>
                </td>
                <td className="py-1 text-right text-xs text-gray-600">
                  {n(flagstoneSF) > 0 ? (
                    <div className="text-right">
                      <div>${calc.flagstoneMat.toFixed(2)}</div>
                      <div className="text-gray-400">{(n(flagstoneSF) / 80).toFixed(2)} tons</div>
                    </div>
                  ) : (
                    '—'
                  )}
                </td>
              </tr>

              {/* Real Stone — editable $/ton */}
              <tr className="border-b border-gray-100">
                <td className="py-1 pr-2 text-xs text-gray-700">
                  <span className="inline-flex items-center gap-1">
                    Real Stone
                    <RateEditPopover
                      table="labor_rates"
                      name={FP_RATES.realStoneLab.dbName}
                      category="Fire Pit"
                      mode="coefficient"
                      unitLabel="hrs/SF"
                      currentValue={p(FP_RATES.realStoneLab.dbName, FP_RATES.realStoneLab.fallback)}
                      onSaved={refreshAllRates}
                    />
                  </span>
                </td>
                <td className="py-1 pr-2">
                  <NumInput value={realStoneSF} onChange={setRealStoneSF} />
                </td>
                <td className="py-1 pr-2">
                  <div className="flex items-center gap-1">
                    <div className="relative w-24">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">
                        $
                      </span>
                      <input
                        type="number"
                        step="any"
                        className="input text-sm py-1.5 pl-5 w-full"
                        placeholder={p(FP_RATES.realStone.dbName, 400).toString()}
                        value={realStoneRateInput}
                        onChange={e => setRealStoneRateInput(e.target.value)}
                      />
                    </div>
                    <RateEditPopover
                      table="material_rates"
                      name={FP_RATES.realStone.dbName}
                      category="Fire Pit"
                      unitLabel="ton"
                      currentValue={p(FP_RATES.realStone.dbName, FP_RATES.realStone.fallback)}
                      onSaved={refreshAllRates}
                    />
                  </div>
                </td>
                <td className="py-1 text-right text-xs text-gray-600">
                  {n(realStoneSF) > 0 ? (
                    <div className="text-right">
                      <div>${calc.realStoneMat.toFixed(2)}</div>
                      <div className="text-gray-400">{(n(realStoneSF) / 70).toFixed(2)} tons</div>
                    </div>
                  ) : (
                    '—'
                  )}
                </td>
              </tr>
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
                    {' '}
                    <NumInput value={row.subCost} onChange={v => updateManual(i, 'subCost', v)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <button onClick={onBack} className="btn-secondary flex-1">
          ← Back
        </button>
        <button onClick={handleSave} disabled={saving} className="btn-primary flex-1">
          {saving ? 'Saving...' : 'Add Module'}
        </button>
      </div>
    </div>
  )
}
