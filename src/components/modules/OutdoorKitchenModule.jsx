import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import GpmdBar from './GpmdBar'
import ModuleNotesField from './ModuleNotesField'
import RateEditPopover from '../RateEditPopover'
import { fetchSalesTaxRate } from '../../lib/companyDefaults'
import { calcWalkAccessLabor, DEFAULT_WALK_ACCESS_PACE_LF_PER_MIN } from '../../lib/walkAccess'

// ─────────────────────────────────────────────────────────────────────────────
// Outdoor Kitchen (BBQ) Module — based on BBQ Module tab in Excel estimator
// Covers: BBQ wall structure, countertop, appliances/services, wall finishes,
//         manual entry
// ─────────────────────────────────────────────────────────────────────────────

const OK_RATES = {
  // ── Material costs ──────────────────────────────────────────────────────────
  bbqBlock: { dbName: 'BBQ Block', fallback: 2.5 }, // $/block
  bbqRebar: { dbName: 'BBQ Rebar', fallback: 0.4 }, // $/LF
  bbqConcrete: { dbName: 'BBQ Concrete', fallback: 149.5 }, // $/CY (footing & counter)
  bbqFillMat: { dbName: 'BBQ Fill Material', fallback: 60.0 }, // $/CY grout/fill
  applianceHardware: { dbName: 'BBQ Appliance Hardware', fallback: 3.0 }, // $/appliance (misc hardware)
  gficOutlet: { dbName: 'GFIC Outlet - BBQ', fallback: 80.0 }, // $/outlet
  sinkPlumbing: { dbName: 'Sink Plumbing - BBQ', fallback: 115.0 }, // $ flat
  gasPipe: { dbName: 'Gas Pipe - BBQ', fallback: 3.0 }, // $/LF
  sandStucco: { dbName: 'Sand Stucco - BBQ', fallback: 0.0 }, // $/SF
  smoothStucco: { dbName: 'Smooth Stucco - BBQ', fallback: 0.0 }, // $/SF
  ledgerstone: { dbName: 'Ledgerstone - BBQ', fallback: 10.0 }, // $/SF
  stackedStone: { dbName: 'Stacked Stone - BBQ', fallback: 10.0 }, // $/SF
  tile: { dbName: 'Tile - BBQ', fallback: 6.5 }, // $/SF
  realFlagstone: { dbName: 'Real Flagstone - BBQ', fallback: 400.0 }, // $/ton (default editable)
  realStone: { dbName: 'Real Stone - BBQ', fallback: 400.0 }, // $/ton (default editable)

  // ── Labor productivity rates ────────────────────────────────────────────────
  excavateLab: { dbName: 'BBQ Excavate Labor Rate', fallback: 5 }, // CF/hr
  rebarLab: { dbName: 'BBQ Rebar Labor Rate', fallback: 146 }, // LF/day
  pourFootingLab: { dbName: 'BBQ Pour Footing Labor Rate', fallback: 4 }, // hrs/CY
  installBlockLab: { dbName: 'BBQ Block Install Labor Rate', fallback: 60 }, // blocks/day
  fillBlockLab: { dbName: 'BBQ Fill Block Labor Rate', fallback: 146 }, // blocks/day (×80/75 factor in calc)
  counterFormLab: { dbName: 'BBQ Counter Form Labor Rate', fallback: 20 }, // LF of form/hr (×2 LF/SF in calc)
  counterPourLab: { dbName: 'BBQ Counter Pour Labor Rate', fallback: 50 }, // SF/day
  counterBroomLab: { dbName: 'BBQ Counter Broom Labor Rate', fallback: 60 }, // SF/day
  counterPolishLab: { dbName: 'BBQ Counter Polish Labor Rate', fallback: 18 }, // SF/day
  applianceLab: { dbName: 'BBQ Appliance Labor Rate', fallback: 2.75 }, // appliances/day
  gficLab: { dbName: 'BBQ GFIC Labor Rate', fallback: 2 }, // hrs/unit
  sinkLab: { dbName: 'BBQ Sink Labor Rate', fallback: 4 }, // hrs flat
  gasTrenchLab: { dbName: 'BBQ Gas Trench Labor Rate', fallback: 35 }, // LF/day
  sandStuccoLab: { dbName: 'Sand Stucco - BBQ Labor Rate', fallback: 92 }, // SF/day
  smoothStuccoLab: { dbName: 'Smooth Stucco - BBQ Labor Rate', fallback: 65 }, // SF/day
  ledgerstoneLab: { dbName: 'Ledgerstone - BBQ Labor Rate', fallback: 24 }, // SF/day
  stackedStoneLab: { dbName: 'Stacked Stone - BBQ Labor Rate', fallback: 24 }, // SF/day
  tileLab: { dbName: 'Tile - BBQ Labor Rate', fallback: 0.2867 }, // hrs/SF (layout+install combined)
  flagstoneLab: { dbName: 'Real Flagstone - BBQ Labor Rate', fallback: 0.4487 }, // hrs/SF (delivery+install+seal)
  realStoneLab: { dbName: 'Real Stone - BBQ Labor Rate', fallback: 0.8954 }, // hrs/SF (transport+install+seal)
}

const DEFAULTS = {
  laborRatePerHour: 35,
  laborBurdenPct: 0.29,
  gpmd: 425,
  commissionRate: 0.12,
}

const COUNTER_FINISHES = ['Broom Finish', 'Polished Finish']

const n = v => parseFloat(v) || 0

// ── Calculation engine ────────────────────────────────────────────────────────
function calcOutdoorKitchen(
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
    bbqLengthLF,
    bbqHeightIn,
    backLengthLF,
    backHeightIn,
    footingWidthIn,
    footingDepthIn,
    counterSF,
    counterFinish,
    applianceCount,
    gficCount,
    sinkYN,
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

  // ── Structure derived quantities ────────────────────────────────────────────
  const bbqWallSF = (n(bbqHeightIn) / 12) * n(bbqLengthLF)
  const backWallSF = (n(backHeightIn) / 12) * n(backLengthLF)
  const totalWallSF = bbqWallSF + backWallSF
  const totalLF = n(bbqLengthLF) + n(backLengthLF)

  const blockRaw = totalLF > 0 ? totalWallSF / 0.888 : 0 // blocks
  const blockWaste = blockRaw * 1.1 // +10% waste (used for labor)
  const blockOrdered = blockWaste * 1.1 // +10% again for ordering material

  const footingAreaSF = (n(footingWidthIn) * n(footingDepthIn)) / 144 // SF cross-section
  const footingCY = (totalLF * footingAreaSF) / 27
  const rebarLF = totalLF * 4
  const fillCY = ((n(bbqHeightIn) / 12) * n(bbqLengthLF) * 0.25) / 27 / 2
  const counterCY = (n(counterSF) * 0.33) / 27

  // ── BBQ Install Labor Hours (all rates from DB) ──────────────────────────────
  const layoutLab = n(layoutHrs)
  const excavateHrs =
    totalLF > 0
      ? (totalLF * footingAreaSF) / p(OK_RATES.excavateLab.dbName, OK_RATES.excavateLab.fallback)
      : 0
  const rebarHrs =
    rebarLF > 0 ? (rebarLF / p(OK_RATES.rebarLab.dbName, OK_RATES.rebarLab.fallback)) * 8 : 0
  const pourFootingHrs =
    footingCY > 0
      ? footingCY * p(OK_RATES.pourFootingLab.dbName, OK_RATES.pourFootingLab.fallback)
      : 0
  const installBlockHrs =
    blockWaste > 0
      ? (blockWaste / p(OK_RATES.installBlockLab.dbName, OK_RATES.installBlockLab.fallback)) * 8
      : 0
  const fillBlockHrs =
    blockRaw > 0
      ? (((80 / 75) * blockRaw) / p(OK_RATES.fillBlockLab.dbName, OK_RATES.fillBlockLab.fallback)) *
        8
      : 0
  const counterFormHrs =
    n(counterSF) > 0
      ? (n(counterSF) * 2) / p(OK_RATES.counterFormLab.dbName, OK_RATES.counterFormLab.fallback)
      : 0
  const counterPourHrs =
    n(counterSF) > 0
      ? (n(counterSF) / p(OK_RATES.counterPourLab.dbName, OK_RATES.counterPourLab.fallback)) * 8
      : 0
  const counterBroomHrs =
    counterFinish === 'Broom Finish'
      ? (n(counterSF) / p(OK_RATES.counterBroomLab.dbName, OK_RATES.counterBroomLab.fallback)) * 8
      : 0
  const counterPolishHrs =
    counterFinish === 'Polished Finish'
      ? (n(counterSF) / p(OK_RATES.counterPolishLab.dbName, OK_RATES.counterPolishLab.fallback)) * 8
      : 0
  const installAppHrs =
    n(applianceCount) > 0
      ? (n(applianceCount) / p(OK_RATES.applianceLab.dbName, OK_RATES.applianceLab.fallback)) * 8
      : 0
  const gficHrs = n(gficCount) * p(OK_RATES.gficLab.dbName, OK_RATES.gficLab.fallback)
  const sinkHrs = sinkYN === 'Yes' ? p(OK_RATES.sinkLab.dbName, OK_RATES.sinkLab.fallback) : 0
  const gasHrs =
    n(gasTrenchLF) > 0
      ? (n(gasTrenchLF) / p(OK_RATES.gasTrenchLab.dbName, OK_RATES.gasTrenchLab.fallback)) * 8
      : 0

  // ── Finish Labor Hours (all rates from DB) ────────────────────────────────
  const sandStuccoHrs =
    n(sandStuccoSF) > 0
      ? (n(sandStuccoSF) / p(OK_RATES.sandStuccoLab.dbName, OK_RATES.sandStuccoLab.fallback)) * 8
      : 0
  const smoothStuccoHrs =
    n(smoothStuccoSF) > 0
      ? (n(smoothStuccoSF) /
          p(OK_RATES.smoothStuccoLab.dbName, OK_RATES.smoothStuccoLab.fallback)) *
        8
      : 0
  const ledgerstoneHrs =
    n(ledgerstoneSF) > 0
      ? (n(ledgerstoneSF) / p(OK_RATES.ledgerstoneLab.dbName, OK_RATES.ledgerstoneLab.fallback)) * 8
      : 0
  const stackedStoneHrs =
    n(stackedStoneSF) > 0
      ? (n(stackedStoneSF) /
          p(OK_RATES.stackedStoneLab.dbName, OK_RATES.stackedStoneLab.fallback)) *
        8
      : 0
  const tileHrs =
    n(tileSF) > 0 ? n(tileSF) * p(OK_RATES.tileLab.dbName, OK_RATES.tileLab.fallback) : 0
  const flagstoneHrs =
    n(flagstoneSF) > 0
      ? n(flagstoneSF) * p(OK_RATES.flagstoneLab.dbName, OK_RATES.flagstoneLab.fallback)
      : 0
  const realStoneHrs =
    n(realStoneSF) > 0
      ? n(realStoneSF) * p(OK_RATES.realStoneLab.dbName, OK_RATES.realStoneLab.fallback)
      : 0

  // ── Material Costs ──────────────────────────────────────────────────────────
  const blockMat = blockOrdered * p(OK_RATES.bbqBlock.dbName, OK_RATES.bbqBlock.fallback)
  const rebarMat = rebarLF * p(OK_RATES.bbqRebar.dbName, OK_RATES.bbqRebar.fallback)
  const footingMat = footingCY * p(OK_RATES.bbqConcrete.dbName, OK_RATES.bbqConcrete.fallback)
  const fillMat = fillCY * p(OK_RATES.bbqFillMat.dbName, OK_RATES.bbqFillMat.fallback)
  const counterConcMat = counterCY * p(OK_RATES.bbqConcrete.dbName, OK_RATES.bbqConcrete.fallback)
  const counterPolishMat = counterFinish === 'Polished Finish' ? n(counterSF) : 0 // $1/SF supply
  const applianceMat =
    n(applianceCount) * p(OK_RATES.applianceHardware.dbName, OK_RATES.applianceHardware.fallback)
  const gficMat = n(gficCount) * p(OK_RATES.gficOutlet.dbName, OK_RATES.gficOutlet.fallback)
  const sinkMat =
    sinkYN === 'Yes' ? p(OK_RATES.sinkPlumbing.dbName, OK_RATES.sinkPlumbing.fallback) : 0
  const gasMat = n(gasTrenchLF) * p(OK_RATES.gasPipe.dbName, OK_RATES.gasPipe.fallback)

  // Finish materials
  const sandStuccoMat =
    n(sandStuccoSF) * p(OK_RATES.sandStucco.dbName, OK_RATES.sandStucco.fallback)
  const smoothStuccoMat =
    n(smoothStuccoSF) * p(OK_RATES.smoothStucco.dbName, OK_RATES.smoothStucco.fallback)
  const ledgerstoneMat =
    n(ledgerstoneSF) > 0
      ? n(ledgerstoneSF) * p(OK_RATES.ledgerstone.dbName, OK_RATES.ledgerstone.fallback) * 1.1 +
        (n(ledgerstoneSF) / 5) * 2
      : 0
  const stackedStoneMat =
    n(stackedStoneSF) > 0
      ? n(stackedStoneSF) * p(OK_RATES.stackedStone.dbName, OK_RATES.stackedStone.fallback) * 1.1 +
        (n(stackedStoneSF) / 5) * 2
      : 0
  const tileMat =
    n(tileSF) > 0
      ? n(tileSF) * p(OK_RATES.tile.dbName, OK_RATES.tile.fallback) + n(tileSF) // +$1/SF adhesive/grout
      : 0
  const realFlagRate =
    n(flagstoneRateInput) || p(OK_RATES.realFlagstone.dbName, OK_RATES.realFlagstone.fallback)
  const flagstoneMat =
    n(flagstoneSF) > 0
      ? (n(flagstoneSF) / 80) * realFlagRate + (n(flagstoneSF) / 80) * 80 + 268.75 // stone + $80/ton delivery + $268.75 misc
      : 0
  const realStoneRt =
    n(realStoneRateInput) || p(OK_RATES.realStone.dbName, OK_RATES.realStone.fallback)
  const realStoneMat =
    n(realStoneSF) > 0
      ? (n(realStoneSF) / 70) * realStoneRt + (n(realStoneSF) / 70) * 180 + n(realStoneSF)
      : 0

  // ── Manual ──────────────────────────────────────────────────────────────────
  let manHrs = 0,
    manMat = 0,
    manSub = 0
  manualRows.forEach(r => {
    manHrs += n(r.hours)
    manMat += n(r.materials)
    manSub += n(r.subCost)
  })

  // ── Totals ──────────────────────────────────────────────────────────────────
  const baseHrs =
    layoutLab +
    excavateHrs +
    rebarHrs +
    pourFootingHrs +
    installBlockHrs +
    fillBlockHrs +
    counterFormHrs +
    counterPourHrs +
    counterBroomHrs +
    counterPolishHrs +
    installAppHrs +
    gficHrs +
    sinkHrs +
    gasHrs +
    sandStuccoHrs +
    smoothStuccoHrs +
    ledgerstoneHrs +
    stackedStoneHrs +
    realStoneHrs +
    tileHrs +
    flagstoneHrs +
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
    fillMat +
    counterConcMat +
    counterPolishMat +
    applianceMat +
    gficMat +
    sinkMat +
    gasMat +
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
    // derived quantities for display
    blockOrdered,
    blockWaste,
    blockRaw,
    footingCY,
    rebarLF,
    fillCY,
    counterCY,
    // section breakdowns
    structureMat: blockMat + rebarMat + footingMat + fillMat,
    counterMat: counterConcMat + counterPolishMat,
    servicesMat: applianceMat + gficMat + sinkMat + gasMat,
    finishesMat:
      sandStuccoMat +
      smoothStuccoMat +
      ledgerstoneMat +
      stackedStoneMat +
      tileMat +
      flagstoneMat +
      realStoneMat,
    flagstoneMat,
    realStoneMat,
    ledgerstoneMat,
    stackedStoneMat,
    tileMat,
    sandStuccoMat,
    smoothStuccoMat,
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

const DEFAULT_MANUAL_ROWS = [
  { label: 'Misc 1', hours: '', materials: '', subCost: '' },
  { label: 'Misc 2', hours: '', materials: '', subCost: '' },
  { label: 'Misc 3', hours: '', materials: '', subCost: '' },
  { label: 'Misc 4', hours: '', materials: '', subCost: '' },
]

// ── Main component ────────────────────────────────────────────────────────────
export default function OutdoorKitchenModule({ onSave, onBack, saving, initialData }) {
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

  // Re-fetch Outdoor Kitchen merged labor+material map. Used on mount and after save.
  const refreshAllRates = useCallback(async () => {
    const [matRes, labRes] = await Promise.all([
      supabase.from('material_rates').select('name, unit_cost').eq('category', 'Outdoor Kitchen'),
      supabase.from('labor_rates').select('name, rate').eq('category', 'Outdoor Kitchen'),
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
  const [bbqLengthLF, setBbqLengthLF] = useState(initialData?.bbqLengthLF ?? '')
  const [bbqHeightIn, setBbqHeightIn] = useState(initialData?.bbqHeightIn ?? '48')
  const [backLengthLF, setBackLengthLF] = useState(initialData?.backLengthLF ?? '')
  const [backHeightIn, setBackHeightIn] = useState(initialData?.backHeightIn ?? '48')
  const [footingWidthIn, setFootingWidthIn] = useState(initialData?.footingWidthIn ?? '12')
  const [footingDepthIn, setFootingDepthIn] = useState(initialData?.footingDepthIn ?? '12')
  // Countertop
  const [counterSF, setCounterSF] = useState(initialData?.counterSF ?? '')
  const [counterFinish, setCounterFinish] = useState(initialData?.counterFinish ?? 'Broom Finish')
  // Appliances / Services
  const [applianceCount, setApplianceCount] = useState(initialData?.applianceCount ?? '')
  const [gficCount, setGficCount] = useState(initialData?.gficCount ?? '')
  const [sinkYN, setSinkYN] = useState(initialData?.sinkYN ?? 'No')
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

  // Default stone rates once prices load
  useEffect(() => {
    if (Object.keys(materialPrices).length === 0) return
    if (!initialData?.flagstoneRateInput && materialPrices[OK_RATES.realFlagstone.dbName]) {
      setFlagstoneRateInput(materialPrices[OK_RATES.realFlagstone.dbName].toString())
    }
    if (!initialData?.realStoneRateInput && materialPrices[OK_RATES.realStone.dbName]) {
      setRealStoneRateInput(materialPrices[OK_RATES.realStone.dbName].toString())
    }
  }, [materialPrices])

  const state = {
    crewType,
    difficulty,
    hoursAdj,
    layoutHrs,
    bbqLengthLF,
    bbqHeightIn,
    backLengthLF,
    backHeightIn,
    footingWidthIn,
    footingDepthIn,
    counterSF,
    counterFinish,
    applianceCount,
    gficCount,
    sinkYN,
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
  const calcRaw = calcOutdoorKitchen(state, laborRatePerHour, materialPrices, gpmd, walkAccess)
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

      {/* ── BBQ Structure ── */}
      <div>
        <SectionHeader title="BBQ Structure" />
        <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 mb-3 text-[11px] text-gray-500">
          <p className="font-semibold uppercase tracking-wide text-gray-400 mb-1">
            BBQ Structural Rates (click any to edit)
          </p>
          <div className="flex flex-wrap gap-x-3 gap-y-1">
            <span className="inline-flex items-center gap-1">
              Block ${p(OK_RATES.bbqBlock.dbName, 2.5).toFixed(2)}/ea
              <RateEditPopover
                table="material_rates"
                name={OK_RATES.bbqBlock.dbName}
                category="Outdoor Kitchen"
                unitLabel="ea"
                currentValue={p(OK_RATES.bbqBlock.dbName, OK_RATES.bbqBlock.fallback)}
                onSaved={refreshAllRates}
              />
            </span>
            <span className="inline-flex items-center gap-1">
              Rebar ${p(OK_RATES.bbqRebar.dbName, 0.4).toFixed(2)}/LF
              <RateEditPopover
                table="material_rates"
                name={OK_RATES.bbqRebar.dbName}
                category="Outdoor Kitchen"
                unitLabel="LF"
                currentValue={p(OK_RATES.bbqRebar.dbName, OK_RATES.bbqRebar.fallback)}
                onSaved={refreshAllRates}
              />
            </span>
            <span className="inline-flex items-center gap-1">
              Concrete ${p(OK_RATES.bbqConcrete.dbName, 149.5).toFixed(2)}/CY
              <RateEditPopover
                table="material_rates"
                name={OK_RATES.bbqConcrete.dbName}
                category="Outdoor Kitchen"
                unitLabel="CY"
                currentValue={p(OK_RATES.bbqConcrete.dbName, OK_RATES.bbqConcrete.fallback)}
                onSaved={refreshAllRates}
              />
            </span>
            <span className="inline-flex items-center gap-1">
              Fill ${p(OK_RATES.bbqFillMat.dbName, 60).toFixed(2)}/CY
              <RateEditPopover
                table="material_rates"
                name={OK_RATES.bbqFillMat.dbName}
                category="Outdoor Kitchen"
                unitLabel="CY"
                currentValue={p(OK_RATES.bbqFillMat.dbName, OK_RATES.bbqFillMat.fallback)}
                onSaved={refreshAllRates}
              />
            </span>
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1">
            <span className="inline-flex items-center gap-1">
              Excavate {p(OK_RATES.excavateLab.dbName, 5)} CF/hr
              <RateEditPopover
                table="labor_rates"
                name={OK_RATES.excavateLab.dbName}
                category="Outdoor Kitchen"
                mode="coefficient"
                unitLabel="CF/hr"
                currentValue={p(OK_RATES.excavateLab.dbName, OK_RATES.excavateLab.fallback)}
                onSaved={refreshAllRates}
              />
            </span>
            <span className="inline-flex items-center gap-1">
              Rebar {p(OK_RATES.rebarLab.dbName, 146)} LF/day
              <RateEditPopover
                table="labor_rates"
                name={OK_RATES.rebarLab.dbName}
                category="Outdoor Kitchen"
                mode="coefficient"
                unitLabel="LF/day"
                currentValue={p(OK_RATES.rebarLab.dbName, OK_RATES.rebarLab.fallback)}
                onSaved={refreshAllRates}
              />
            </span>
            <span className="inline-flex items-center gap-1">
              Pour {p(OK_RATES.pourFootingLab.dbName, 4)} hrs/CY
              <RateEditPopover
                table="labor_rates"
                name={OK_RATES.pourFootingLab.dbName}
                category="Outdoor Kitchen"
                mode="coefficient"
                unitLabel="hrs/CY"
                currentValue={p(OK_RATES.pourFootingLab.dbName, OK_RATES.pourFootingLab.fallback)}
                onSaved={refreshAllRates}
              />
            </span>
            <span className="inline-flex items-center gap-1">
              Block {p(OK_RATES.installBlockLab.dbName, 60)} blk/day
              <RateEditPopover
                table="labor_rates"
                name={OK_RATES.installBlockLab.dbName}
                category="Outdoor Kitchen"
                mode="coefficient"
                unitLabel="blk/day"
                currentValue={p(OK_RATES.installBlockLab.dbName, OK_RATES.installBlockLab.fallback)}
                onSaved={refreshAllRates}
              />
            </span>
            <span className="inline-flex items-center gap-1">
              Fill {p(OK_RATES.fillBlockLab.dbName, 146)} blk/day
              <RateEditPopover
                table="labor_rates"
                name={OK_RATES.fillBlockLab.dbName}
                category="Outdoor Kitchen"
                mode="coefficient"
                unitLabel="blk/day"
                currentValue={p(OK_RATES.fillBlockLab.dbName, OK_RATES.fillBlockLab.fallback)}
                onSaved={refreshAllRates}
              />
            </span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">BBQ Wall Length (LF)</label>
            <NumInput value={bbqLengthLF} onChange={setBbqLengthLF} placeholder="0" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">BBQ Wall Height (inches)</label>
            <NumInput value={bbqHeightIn} onChange={setBbqHeightIn} placeholder="48" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Backsplash Wall Length (LF)</label>
            <NumInput value={backLengthLF} onChange={setBackLengthLF} placeholder="0" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">
              Backsplash Wall Height (inches)
            </label>
            <NumInput value={backHeightIn} onChange={setBackHeightIn} placeholder="48" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Footing Width (inches)</label>
            <NumInput value={footingWidthIn} onChange={setFootingWidthIn} placeholder="12" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Footing Depth (inches)</label>
            <NumInput value={footingDepthIn} onChange={setFootingDepthIn} placeholder="12" />
          </div>
        </div>
        {(n(bbqLengthLF) > 0 || n(backLengthLF) > 0) && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-xs text-gray-600 flex flex-wrap gap-4">
            <span>
              Blocks: <strong>{calc.blockOrdered.toFixed(0)}</strong>
            </span>
            <span>
              Footing: <strong>{calc.footingCY.toFixed(2)} CY</strong>
            </span>
            <span>
              Rebar: <strong>{calc.rebarLF.toFixed(0)} LF</strong>
            </span>
            <span>
              Fill: <strong>{calc.fillCY.toFixed(3)} CY</strong>
            </span>
          </div>
        )}
      </div>

      {/* ── Countertop ── */}
      <div>
        <SectionHeader title="Concrete Countertop" />
        <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 mb-2 text-[11px] text-gray-500">
          <p className="font-semibold uppercase tracking-wide text-gray-400 mb-1">
            Countertop Rates (click any to edit)
          </p>
          <div className="flex flex-wrap gap-x-3 gap-y-1">
            <span className="inline-flex items-center gap-1">
              Concrete ${p(OK_RATES.bbqConcrete.dbName, 149.5).toFixed(2)}/CY
              <RateEditPopover
                table="material_rates"
                name={OK_RATES.bbqConcrete.dbName}
                category="Outdoor Kitchen"
                unitLabel="CY"
                currentValue={p(OK_RATES.bbqConcrete.dbName, OK_RATES.bbqConcrete.fallback)}
                onSaved={refreshAllRates}
              />
            </span>
            <span className="inline-flex items-center gap-1">
              Form {p(OK_RATES.counterFormLab.dbName, 20)} LF/hr
              <RateEditPopover
                table="labor_rates"
                name={OK_RATES.counterFormLab.dbName}
                category="Outdoor Kitchen"
                mode="coefficient"
                unitLabel="LF/hr"
                currentValue={p(OK_RATES.counterFormLab.dbName, OK_RATES.counterFormLab.fallback)}
                onSaved={refreshAllRates}
              />
            </span>
            <span className="inline-flex items-center gap-1">
              Pour {p(OK_RATES.counterPourLab.dbName, 50)} SF/day
              <RateEditPopover
                table="labor_rates"
                name={OK_RATES.counterPourLab.dbName}
                category="Outdoor Kitchen"
                mode="coefficient"
                unitLabel="SF/day"
                currentValue={p(OK_RATES.counterPourLab.dbName, OK_RATES.counterPourLab.fallback)}
                onSaved={refreshAllRates}
              />
            </span>
            <span className="inline-flex items-center gap-1">
              Broom {p(OK_RATES.counterBroomLab.dbName, 60)} SF/day
              <RateEditPopover
                table="labor_rates"
                name={OK_RATES.counterBroomLab.dbName}
                category="Outdoor Kitchen"
                mode="coefficient"
                unitLabel="SF/day"
                currentValue={p(OK_RATES.counterBroomLab.dbName, OK_RATES.counterBroomLab.fallback)}
                onSaved={refreshAllRates}
              />
            </span>
            <span className="inline-flex items-center gap-1">
              Polish {p(OK_RATES.counterPolishLab.dbName, 18)} SF/day
              <RateEditPopover
                table="labor_rates"
                name={OK_RATES.counterPolishLab.dbName}
                category="Outdoor Kitchen"
                mode="coefficient"
                unitLabel="SF/day"
                currentValue={p(
                  OK_RATES.counterPolishLab.dbName,
                  OK_RATES.counterPolishLab.fallback
                )}
                onSaved={refreshAllRates}
              />
            </span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Area (SF)</label>
            <NumInput value={counterSF} onChange={setCounterSF} placeholder="0" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Finish</label>
            <select
              className="input text-sm py-1.5"
              value={counterFinish}
              onChange={e => setCounterFinish(e.target.value)}
            >
              {COUNTER_FINISHES.map(f => (
                <option key={f}>{f}</option>
              ))}
            </select>
          </div>
        </div>
        {n(counterSF) > 0 && (
          <div className="mt-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-xs text-gray-600 flex gap-4">
            <span>
              Counter CY: <strong>{calc.counterCY.toFixed(3)}</strong>
            </span>
            <span>
              Material: <strong>${calc.counterMat.toFixed(2)}</strong>
            </span>
          </div>
        )}
      </div>

      {/* ── Appliances & Services ── */}
      <div>
        <SectionHeader title="Appliances & Services" />
        <div className="space-y-0">
          <div className="flex items-center gap-3 py-1.5 border-b border-gray-100">
            <span className="text-xs text-gray-700 w-44 shrink-0">Layout Time (Hours)</span>
            <NumInput value={layoutHrs} onChange={setLayoutHrs} placeholder="0" className="w-28" />
          </div>
          <div className="flex items-center gap-3 py-1.5 border-b border-gray-100">
            <span className="text-xs text-gray-700 w-44 shrink-0 inline-flex items-center gap-1">
              Appliances / Openings
              <RateEditPopover
                table="labor_rates"
                name={OK_RATES.applianceLab.dbName}
                category="Outdoor Kitchen"
                mode="coefficient"
                unitLabel="per day"
                currentValue={p(OK_RATES.applianceLab.dbName, OK_RATES.applianceLab.fallback)}
                onSaved={refreshAllRates}
              />
              <RateEditPopover
                table="material_rates"
                name={OK_RATES.applianceHardware.dbName}
                category="Outdoor Kitchen"
                unitLabel="ea"
                currentValue={p(
                  OK_RATES.applianceHardware.dbName,
                  OK_RATES.applianceHardware.fallback
                )}
                onSaved={refreshAllRates}
              />
            </span>
            <NumInput
              value={applianceCount}
              onChange={setApplianceCount}
              placeholder="0"
              className="w-28"
            />
            {n(applianceCount) > 0 && (
              <span className="text-xs text-gray-400 shrink-0">
                {(n(applianceCount) / 2.75).toFixed(2)} days
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 py-1.5 border-b border-gray-100">
            <span className="text-xs text-gray-700 w-44 shrink-0 inline-flex items-center gap-1">
              GFIC Outlets
              <RateEditPopover
                table="labor_rates"
                name={OK_RATES.gficLab.dbName}
                category="Outdoor Kitchen"
                mode="coefficient"
                unitLabel="hrs/ea"
                currentValue={p(OK_RATES.gficLab.dbName, OK_RATES.gficLab.fallback)}
                onSaved={refreshAllRates}
              />
              <RateEditPopover
                table="material_rates"
                name={OK_RATES.gficOutlet.dbName}
                category="Outdoor Kitchen"
                unitLabel="ea"
                currentValue={p(OK_RATES.gficOutlet.dbName, OK_RATES.gficOutlet.fallback)}
                onSaved={refreshAllRates}
              />
            </span>
            <NumInput value={gficCount} onChange={setGficCount} placeholder="0" className="w-28" />
            {n(gficCount) > 0 && (
              <span className="text-xs text-gray-400 shrink-0">
                {(n(gficCount) * 2).toFixed(0)} hrs · $
                {(n(gficCount) * p(OK_RATES.gficOutlet.dbName, 80)).toFixed(2)} mat
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 py-1.5 border-b border-gray-100">
            <span className="text-xs text-gray-700 w-44 shrink-0 inline-flex items-center gap-1">
              Add Sink Plumbing
              <RateEditPopover
                table="labor_rates"
                name={OK_RATES.sinkLab.dbName}
                category="Outdoor Kitchen"
                mode="coefficient"
                unitLabel="hrs"
                currentValue={p(OK_RATES.sinkLab.dbName, OK_RATES.sinkLab.fallback)}
                onSaved={refreshAllRates}
              />
              <RateEditPopover
                table="material_rates"
                name={OK_RATES.sinkPlumbing.dbName}
                category="Outdoor Kitchen"
                unitLabel="flat"
                currentValue={p(OK_RATES.sinkPlumbing.dbName, OK_RATES.sinkPlumbing.fallback)}
                onSaved={refreshAllRates}
              />
            </span>
            <select
              className="input text-sm py-1.5 w-28"
              value={sinkYN}
              onChange={e => setSinkYN(e.target.value)}
            >
              <option>No</option>
              <option>Yes</option>
            </select>
          </div>
          <div className="flex items-center gap-3 py-1.5 border-b border-gray-100">
            <span className="text-xs text-gray-700 w-44 shrink-0 inline-flex items-center gap-1">
              Gas Trench/Run (LF)
              <RateEditPopover
                table="labor_rates"
                name={OK_RATES.gasTrenchLab.dbName}
                category="Outdoor Kitchen"
                mode="coefficient"
                unitLabel="LF/day"
                currentValue={p(OK_RATES.gasTrenchLab.dbName, OK_RATES.gasTrenchLab.fallback)}
                onSaved={refreshAllRates}
              />
              <RateEditPopover
                table="material_rates"
                name={OK_RATES.gasPipe.dbName}
                category="Outdoor Kitchen"
                unitLabel="LF"
                currentValue={p(OK_RATES.gasPipe.dbName, OK_RATES.gasPipe.fallback)}
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
                ${(n(gasTrenchLF) * p(OK_RATES.gasPipe.dbName, 3)).toFixed(2)} mat
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
                  matKey: 'sandStucco',
                  labKey: 'sandStuccoLab',
                  matCalc: calc.sandStuccoMat,
                  fallback: 0,
                },
                {
                  label: 'Smooth Stucco',
                  sf: smoothStuccoSF,
                  setSf: setSmoothStuccoSF,
                  matKey: 'smoothStucco',
                  labKey: 'smoothStuccoLab',
                  matCalc: calc.smoothStuccoMat,
                  fallback: 0,
                },
                {
                  label: 'Ledgerstone Veneer',
                  sf: ledgerstoneSF,
                  setSf: setLedgerstoneSF,
                  matKey: 'ledgerstone',
                  labKey: 'ledgerstoneLab',
                  matCalc: calc.ledgerstoneMat,
                  fallback: 10,
                },
                {
                  label: 'Stacked Stone Veneer',
                  sf: stackedStoneSF,
                  setSf: setStackedStoneSF,
                  matKey: 'stackedStone',
                  labKey: 'stackedStoneLab',
                  matCalc: calc.stackedStoneMat,
                  fallback: 10,
                },
                {
                  label: 'Tile',
                  sf: tileSF,
                  setSf: setTileSF,
                  matKey: 'tile',
                  labKey: 'tileLab',
                  matCalc: calc.tileMat,
                  fallback: 6.5,
                },
              ].map(({ label, sf, setSf, matKey, labKey, matCalc, fallback }) => (
                <tr key={label} className="border-b border-gray-100">
                  <td className="py-1 pr-2 text-xs text-gray-700">{label}</td>
                  <td className="py-1 pr-2">
                    <NumInput value={sf} onChange={setSf} />
                  </td>
                  <td className="py-1 pr-2 text-xs text-gray-400">
                    <span className="inline-flex items-center gap-1 flex-wrap">
                      ${p(OK_RATES[matKey].dbName, fallback).toFixed(2)}/SF
                      <RateEditPopover
                        table="material_rates"
                        name={OK_RATES[matKey].dbName}
                        category="Outdoor Kitchen"
                        unitLabel="SF"
                        currentValue={p(OK_RATES[matKey].dbName, OK_RATES[matKey].fallback)}
                        onSaved={refreshAllRates}
                      />
                      <RateEditPopover
                        table="labor_rates"
                        name={OK_RATES[labKey].dbName}
                        category="Outdoor Kitchen"
                        mode="coefficient"
                        unitLabel="rate"
                        currentValue={p(OK_RATES[labKey].dbName, OK_RATES[labKey].fallback)}
                        onSaved={refreshAllRates}
                      />
                    </span>
                  </td>
                  <td className="py-1 text-right text-xs text-gray-600">
                    {n(sf) > 0 ? `$${matCalc.toFixed(2)}` : '—'}
                  </td>
                </tr>
              ))}
              {/* Real Flagstone — editable $/ton */}
              <tr className="border-b border-gray-100">
                <td className="py-1 pr-2 text-xs text-gray-700">
                  <span className="inline-flex items-center gap-1">
                    Real Flagstone (Flat)
                    <RateEditPopover
                      table="labor_rates"
                      name={OK_RATES.flagstoneLab.dbName}
                      category="Outdoor Kitchen"
                      mode="coefficient"
                      unitLabel="hrs/SF"
                      currentValue={p(OK_RATES.flagstoneLab.dbName, OK_RATES.flagstoneLab.fallback)}
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
                        placeholder={p(OK_RATES.realFlagstone.dbName, 400).toString()}
                        value={flagstoneRateInput}
                        onChange={e => setFlagstoneRateInput(e.target.value)}
                      />
                    </div>
                    <RateEditPopover
                      table="material_rates"
                      name={OK_RATES.realFlagstone.dbName}
                      category="Outdoor Kitchen"
                      unitLabel="ton"
                      currentValue={p(
                        OK_RATES.realFlagstone.dbName,
                        OK_RATES.realFlagstone.fallback
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
                      name={OK_RATES.realStoneLab.dbName}
                      category="Outdoor Kitchen"
                      mode="coefficient"
                      unitLabel="hrs/SF"
                      currentValue={p(OK_RATES.realStoneLab.dbName, OK_RATES.realStoneLab.fallback)}
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
                        placeholder={p(OK_RATES.realStone.dbName, 400).toString()}
                        value={realStoneRateInput}
                        onChange={e => setRealStoneRateInput(e.target.value)}
                      />
                    </div>
                    <RateEditPopover
                      table="material_rates"
                      name={OK_RATES.realStone.dbName}
                      category="Outdoor Kitchen"
                      unitLabel="ton"
                      currentValue={p(OK_RATES.realStone.dbName, OK_RATES.realStone.fallback)}
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
