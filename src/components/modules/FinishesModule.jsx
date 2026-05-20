import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import GpmdBar from './GpmdBar'
import RateEditPopover from '../RateEditPopover'
import { fetchSalesTaxRate } from '../../lib/companyDefaults'
import { calcWalkAccessLabor, DEFAULT_WALK_ACCESS_PACE_LF_PER_MIN } from '../../lib/walkAccess'

// ─────────────────────────────────────────────────────────────────────────────
// Finishes Module — Flatwork, Wall Caps, Wall Finishes
// Covers: tile, brick, flagstone, porcelain flatwork finishes; wall caps;
// wall finishes (stucco, veneer, tile, stone)
// ─────────────────────────────────────────────────────────────────────────────

const FINISHES_RATES = {
  // ── Flatwork material costs ────────────────────────────────────────────────
  flatTile: { db: 'Finishes Tile Flatwork', fb: 6.5 }, // $/SF
  flatBrick: { db: 'Finishes Brick Flatwork', fb: 3.0 }, // $/brick
  flatFlagstone: { db: 'Finishes Flagstone Flatwork', fb: 400.0 }, // $/ton
  flatPorcelain: { db: 'Finishes Porcelain Flatwork', fb: 10.0 }, // $/SF

  // ── Wall Caps material costs ───────────────────────────────────────────────
  capFlagstone: { db: 'Finishes Cap Flagstone', fb: 500.0 }, // $/ton
  capPrecast: { db: 'Finishes Cap Precast', fb: 50.0 }, // $/piece
  capBullnose: { db: 'Finishes Cap Bullnose Brick', fb: 5.0 }, // $/LF
  concreteTruck: { db: 'Finishes Concrete Truck', fb: 185.0 }, // $/CY (for PIP cap)

  // ── Wall Finishes material costs ───────────────────────────────────────────
  sandStucco: { db: 'Sand Stucco - Finishes', fb: 0.0 }, // $/SF
  smoothStucco: { db: 'Smooth Stucco - Finishes', fb: 0.0 }, // $/SF
  ledgerstone: { db: 'Ledgerstone - Finishes', fb: 10.0 }, // $/SF
  stackedStone: { db: 'Stacked Stone - Finishes', fb: 10.0 }, // $/SF
  tile: { db: 'Tile - Finishes', fb: 6.5 }, // $/SF
  realFlagstone: { db: 'Real Flagstone - Finishes', fb: 400.0 }, // $/ton
  realStone: { db: 'Real Stone - Finishes', fb: 400.0 }, // $/ton

  // ── Labor rates ────────────────────────────────────────────────────────────
  flatTileLab: { db: 'Finishes Tile Flatwork Labor Rate', fb: 0.2867 }, // hrs/SF
  flatBrickLab: { db: 'Finishes Brick Flatwork Labor Rate', fb: 0.35 }, // hrs/SF
  flatFlagstoneLab: { db: 'Finishes Flagstone Flatwork Labor Rate', fb: 0.4487 }, // hrs/SF
  flatPorcelainLab: { db: 'Finishes Porcelain Flatwork Labor Rate', fb: 0.267 }, // hrs/SF
  sandStuccoLab: { db: 'Sand Stucco - Finishes Labor Rate', fb: 92 }, // SF/day
  smoothStuccoLab: { db: 'Smooth Stucco - Finishes Labor Rate', fb: 65 }, // SF/day
  ledgerstoneLab: { db: 'Ledgerstone - Finishes Labor Rate', fb: 24 }, // SF/day
  stackedStoneLab: { db: 'Stacked Stone - Finishes Labor Rate', fb: 24 }, // SF/day
  tileLab: { db: 'Tile - Finishes Labor Rate', fb: 0.2867 }, // hrs/SF
  flagstoneLab: { db: 'Real Flagstone - Finishes Labor Rate', fb: 0.4487 }, // hrs/SF
  realStoneLab: { db: 'Real Stone - Finishes Labor Rate', fb: 0.8954 }, // hrs/SF
}

const DEFAULTS = {
  laborRatePerHour: 35,
  laborBurdenPct: 0.29,
  gpmd: 425,
  commissionRate: 0.12,
}

const n = v => parseFloat(v) || 0

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

// ── Calculation engine ────────────────────────────────────────────────────────
function calcFinishes(
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
    tileFlatSF,
    brickFlatSF,
    flagstoneFlatSF,
    flagstoneFlatRateIn,
    porcelainFlatSF,
    capRows,
    sandStuccoSF,
    smoothStuccoSF,
    ledgerstoneSF,
    stackedStoneSF,
    tileSF,
    wallFlagstoneSF,
    wallFlagstoneRateIn,
    realStoneSF,
    realStoneRateIn,
    manualRows,
  } = state

  const p = db => mp[db] ?? undefined

  // ── Flatwork hours ───────────────────────────────────────────────────────
  const tileFlatHrs =
    n(tileFlatSF) > 0
      ? n(tileFlatSF) * (p(FINISHES_RATES.flatTileLab.db) ?? FINISHES_RATES.flatTileLab.fb)
      : 0
  const brickFlatHrs =
    n(brickFlatSF) > 0
      ? n(brickFlatSF) * (p(FINISHES_RATES.flatBrickLab.db) ?? FINISHES_RATES.flatBrickLab.fb)
      : 0
  const flagstoneFlatHrs =
    n(flagstoneFlatSF) > 0
      ? n(flagstoneFlatSF) *
        (p(FINISHES_RATES.flatFlagstoneLab.db) ?? FINISHES_RATES.flatFlagstoneLab.fb)
      : 0
  const porcelainFlatHrs =
    n(porcelainFlatSF) > 0
      ? n(porcelainFlatSF) *
        (p(FINISHES_RATES.flatPorcelainLab.db) ?? FINISHES_RATES.flatPorcelainLab.fb)
      : 0

  // ── Flatwork materials ───────────────────────────────────────────────────
  const tileFlatMat = n(tileFlatSF) * (p(FINISHES_RATES.flatTile.db) ?? FINISHES_RATES.flatTile.fb)
  const brickFlatMat =
    n(brickFlatSF) * 2 * (p(FINISHES_RATES.flatBrick.db) ?? FINISHES_RATES.flatBrick.fb)
  const flagstoneFlatRate =
    n(flagstoneFlatRateIn) ||
    (p(FINISHES_RATES.flatFlagstone.db) ?? FINISHES_RATES.flatFlagstone.fb)
  const flagstoneFlatMat =
    n(flagstoneFlatSF) > 0 ? (n(flagstoneFlatSF) / 80) * flagstoneFlatRate : 0
  const porcelainFlatMat =
    n(porcelainFlatSF) * (p(FINISHES_RATES.flatPorcelain.db) ?? FINISHES_RATES.flatPorcelain.fb)

  // ── Wall Caps ──────────────────────────────────────────────────────────
  let capHrs = 0,
    capMat = 0
  ;(capRows || []).forEach(cap => {
    const lf = n(cap.lf),
      widthIn = n(cap.widthIn),
      qty = n(cap.qty)
    if (cap.type === 'Flagstone') {
      capMat +=
        (((widthIn / 12) * lf * 0.0833 * 100) / 2000) *
        (p(FINISHES_RATES.capFlagstone.db) ?? FINISHES_RATES.capFlagstone.fb)
      capHrs += lf * 0.25
    } else if (cap.type === 'Precast') {
      capMat += qty * (p(FINISHES_RATES.capPrecast.db) ?? FINISHES_RATES.capPrecast.fb)
      capHrs += qty * 0.2
    } else if (cap.type === 'PIP Concrete') {
      capMat +=
        ((lf * (widthIn / 12) * 0.333) / 27) *
        (p(FINISHES_RATES.concreteTruck.db) ?? FINISHES_RATES.concreteTruck.fb)
      capHrs += lf * 0.15
    } else if (cap.type === 'Bullnose Brick') {
      capMat += lf * (p(FINISHES_RATES.capBullnose.db) ?? FINISHES_RATES.capBullnose.fb)
      capHrs += lf * 0.08
    }
  })

  // ── Wall Finishes ─────────────────────────────────────────────────────
  const sandStuccoHrs =
    n(sandStuccoSF) > 0
      ? (n(sandStuccoSF) /
          (p(FINISHES_RATES.sandStuccoLab.db) ?? FINISHES_RATES.sandStuccoLab.fb)) *
        8
      : 0
  const smoothStuccoHrs =
    n(smoothStuccoSF) > 0
      ? (n(smoothStuccoSF) /
          (p(FINISHES_RATES.smoothStuccoLab.db) ?? FINISHES_RATES.smoothStuccoLab.fb)) *
        8
      : 0
  const ledgerstoneHrs =
    n(ledgerstoneSF) > 0
      ? (n(ledgerstoneSF) /
          (p(FINISHES_RATES.ledgerstoneLab.db) ?? FINISHES_RATES.ledgerstoneLab.fb)) *
        8
      : 0
  const stackedStoneHrs =
    n(stackedStoneSF) > 0
      ? (n(stackedStoneSF) /
          (p(FINISHES_RATES.stackedStoneLab.db) ?? FINISHES_RATES.stackedStoneLab.fb)) *
        8
      : 0
  const tileHrs =
    n(tileSF) > 0 ? n(tileSF) * (p(FINISHES_RATES.tileLab.db) ?? FINISHES_RATES.tileLab.fb) : 0
  const wallFlagstoneHrs =
    n(wallFlagstoneSF) > 0
      ? n(wallFlagstoneSF) * (p(FINISHES_RATES.flagstoneLab.db) ?? FINISHES_RATES.flagstoneLab.fb)
      : 0
  const realStoneHrs =
    n(realStoneSF) > 0
      ? n(realStoneSF) * (p(FINISHES_RATES.realStoneLab.db) ?? FINISHES_RATES.realStoneLab.fb)
      : 0

  const sandStuccoMat =
    n(sandStuccoSF) * (p(FINISHES_RATES.sandStucco.db) ?? FINISHES_RATES.sandStucco.fb)
  const smoothStuccoMat =
    n(smoothStuccoSF) * (p(FINISHES_RATES.smoothStucco.db) ?? FINISHES_RATES.smoothStucco.fb)
  const ledgerstoneMat =
    n(ledgerstoneSF) > 0
      ? n(ledgerstoneSF) *
          (p(FINISHES_RATES.ledgerstone.db) ?? FINISHES_RATES.ledgerstone.fb) *
          1.1 +
        (n(ledgerstoneSF) / 5) * 2
      : 0
  const stackedStoneMat =
    n(stackedStoneSF) > 0
      ? n(stackedStoneSF) *
          (p(FINISHES_RATES.stackedStone.db) ?? FINISHES_RATES.stackedStone.fb) *
          1.1 +
        (n(stackedStoneSF) / 5) * 2
      : 0
  const tileMat =
    n(tileSF) > 0
      ? n(tileSF) * (p(FINISHES_RATES.tile.db) ?? FINISHES_RATES.tile.fb) + n(tileSF) // +$1/SF adhesive/grout
      : 0
  const wallFlagstoneRate =
    n(wallFlagstoneRateIn) ||
    (p(FINISHES_RATES.realFlagstone.db) ?? FINISHES_RATES.realFlagstone.fb)
  const wallFlagStoneMat =
    n(wallFlagstoneSF) > 0 ? (n(wallFlagstoneSF) / 80) * wallFlagstoneRate : 0
  const realStoneRate =
    n(realStoneRateIn) || (p(FINISHES_RATES.realStone.db) ?? FINISHES_RATES.realStone.fb)
  const realStoneMat = n(realStoneSF) > 0 ? (n(realStoneSF) / 70) * realStoneRate : 0

  // ── Manual ──────────────────────────────────────────────────────────────
  let manHrs = 0,
    manMat = 0,
    manSub = 0
  ;(manualRows || []).forEach(r => {
    manHrs += n(r.hours)
    manMat += n(r.materials)
    manSub += n(r.subCost)
  })

  // ── Totals ──────────────────────────────────────────────────────────────
  const baseHrs =
    tileFlatHrs +
    brickFlatHrs +
    flagstoneFlatHrs +
    porcelainFlatHrs +
    capHrs +
    sandStuccoHrs +
    smoothStuccoHrs +
    ledgerstoneHrs +
    stackedStoneHrs +
    tileHrs +
    wallFlagstoneHrs +
    realStoneHrs +
    manHrs

  const diffMod = 1 + n(difficulty) / 100
  const _preWalkHrs = baseHrs * diffMod + n(hoursAdj)
  const walkHrs = calcWalkAccessLabor(_preWalkHrs, state.distanceLF, { paceLfPerMin: _pace })
  const totalHrs = _preWalkHrs + walkHrs
  const manDays = totalHrs / 8

  const totalMat =
    tileFlatMat +
    brickFlatMat +
    flagstoneFlatMat +
    porcelainFlatMat +
    capMat +
    sandStuccoMat +
    smoothStuccoMat +
    ledgerstoneMat +
    stackedStoneMat +
    tileMat +
    wallFlagStoneMat +
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
    tileFlatMat,
    brickFlatMat,
    flagstoneFlatMat,
    porcelainFlatMat,
    capMat,
    capHrs,
    sandStuccoMat,
    smoothStuccoMat,
    ledgerstoneMat,
    stackedStoneMat,
    tileMat,
    wallFlagStoneMat,
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

// ── Main component ────────────────────────────────────────────────────────────
export default function FinishesModule({ onSave, onBack, saving, initialData }) {
  const [laborRatePerHour, setLaborRatePerHour] = useState(
    initialData?.laborRatePerHour ?? DEFAULTS.laborRatePerHour
  )
  const [distanceLF, setDistanceLF] = useState(initialData?.distanceLF ?? '')
  const [walkAccess, setWalkAccess] = useState(
    initialData?.walkAccess ?? {
      paceLfPerMin: DEFAULT_WALK_ACCESS_PACE_LF_PER_MIN,
    }
  )
  const [materialPrices, setMaterialPrices] = useState(initialData?.materialPrices ?? {})
  const [pricesLoading, setPricesLoading] = useState(!initialData?.materialPrices)

  // Re-fetch Finishes merged labor+material map. Used on mount and after edits.
  const refreshAllRates = useCallback(async () => {
    const [matRes, labRes] = await Promise.all([
      supabase.from('material_rates').select('name, unit_cost').eq('category', 'Finishes'),
      supabase.from('labor_rates').select('name, rate').eq('category', 'Finishes'),
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

  // ── State ──────────────────────────────────────────────────────────────
  const [difficulty, setDifficulty] = useState(initialData?.difficulty ?? '')
  const [crewType, setCrewType] = useState(initialData?.crewType ?? 'Masonry')
  const [hoursAdj, setHoursAdj] = useState(initialData?.hoursAdj ?? '')
  // Flatwork
  const [tileFlatSF, setTileFlatSF] = useState(initialData?.tileFlatSF ?? '')
  const [brickFlatSF, setBrickFlatSF] = useState(initialData?.brickFlatSF ?? '')
  const [flagstoneFlatSF, setFlagstoneFlatSF] = useState(initialData?.flagstoneFlatSF ?? '')
  const [flagstoneFlatRateIn, setFlagstoneFlatRateIn] = useState(
    initialData?.flagstoneFlatRateIn ?? ''
  )
  const [porcelainFlatSF, setPorcelainFlatSF] = useState(initialData?.porcelainFlatSF ?? '')
  // Wall Caps
  const [capRows, setCapRows] = useState(initialData?.capRows ?? DEFAULT_CAP_ROWS)
  // Wall Finishes
  const [sandStuccoSF, setSandStuccoSF] = useState(initialData?.sandStuccoSF ?? '')
  const [smoothStuccoSF, setSmoothStuccoSF] = useState(initialData?.smoothStuccoSF ?? '')
  const [ledgerstoneSF, setLedgerstoneSF] = useState(initialData?.ledgerstoneSF ?? '')
  const [stackedStoneSF, setStackedStoneSF] = useState(initialData?.stackedStoneSF ?? '')
  const [tileSF, setTileSF] = useState(initialData?.tileSF ?? '')
  const [wallFlagstoneSF, setWallFlagstoneSF] = useState(initialData?.wallFlagstoneSF ?? '')
  const [wallFlagstoneRateIn, setWallFlagstoneRateIn] = useState(
    initialData?.wallFlagstoneRateIn ?? ''
  )
  const [realStoneSF, setRealStoneSF] = useState(initialData?.realStoneSF ?? '')
  const [realStoneRateIn, setRealStoneRateIn] = useState(initialData?.realStoneRateIn ?? '')
  // Manual
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
    if (!initialData?.flagstoneFlatRateIn && materialPrices[FINISHES_RATES.flatFlagstone.db]) {
      setFlagstoneFlatRateIn(materialPrices[FINISHES_RATES.flatFlagstone.db].toString())
    }
    if (!initialData?.wallFlagstoneRateIn && materialPrices[FINISHES_RATES.realFlagstone.db]) {
      setWallFlagstoneRateIn(materialPrices[FINISHES_RATES.realFlagstone.db].toString())
    }
    if (!initialData?.realStoneRateIn && materialPrices[FINISHES_RATES.realStone.db]) {
      setRealStoneRateIn(materialPrices[FINISHES_RATES.realStone.db].toString())
    }
  }, [materialPrices])

  const state = {
    crewType,
    difficulty,
    hoursAdj,
    tileFlatSF,
    brickFlatSF,
    flagstoneFlatSF,
    flagstoneFlatRateIn,
    porcelainFlatSF,
    capRows,
    sandStuccoSF,
    smoothStuccoSF,
    ledgerstoneSF,
    stackedStoneSF,
    tileSF,
    wallFlagstoneSF,
    wallFlagstoneRateIn,
    realStoneSF,
    realStoneRateIn,
    manualRows,
    distanceLF,
  }
  const calcRaw = calcFinishes(state, laborRatePerHour, materialPrices, gpmd, walkAccess)
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

  const p = db => materialPrices[db] ?? undefined

  function updateManual(i, field, val) {
    setManualRows(rows => rows.map((r, idx) => (idx === i ? { ...r, [field]: val } : r)))
  }

  function updateCap(i, field, val) {
    setCapRows(rows => rows.map((row, idx) => (idx === i ? { ...row, [field]: val } : row)))
  }

  function handleSave() {
    onSave({
      man_days: parseFloat(calc.manDays.toFixed(2)),
      material_cost: parseFloat(calc.totalMat.toFixed(2)),
      data: { ...state, walkAccess, laborRatePerHour, gpmd, materialPrices, calc },
    })
  }

  return (
    <div className="space-y-5">
      {/* ── Sticky GPMD bar ── */}
      <div className="sticky top-0 z-20 -mx-6 px-6 pt-2 pb-2 bg-gray-900 shadow-lg">
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

      {/* ── Flatwork Finish ── */}
      <div>
        <SectionHeader title="Flatwork Finish" />
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
                  label: 'Tile Over Slab',
                  sf: tileFlatSF,
                  setSf: setTileFlatSF,
                  mat: calc.tileFlatMat,
                  matKey: 'flatTile',
                  labKey: 'flatTileLab',
                  matUnit: 'SF',
                  rateLabel: `$${(p(FINISHES_RATES.flatTile.db) ?? FINISHES_RATES.flatTile.fb).toFixed(2)}/SF`,
                },
                {
                  label: 'Brick Over Slab',
                  sf: brickFlatSF,
                  setSf: setBrickFlatSF,
                  mat: calc.brickFlatMat,
                  matKey: 'flatBrick',
                  labKey: 'flatBrickLab',
                  matUnit: 'brick',
                  rateLabel: `$${(p(FINISHES_RATES.flatBrick.db) ?? FINISHES_RATES.flatBrick.fb).toFixed(2)}/brick`,
                },
                {
                  label: 'Porcelain Paver',
                  sf: porcelainFlatSF,
                  setSf: setPorcelainFlatSF,
                  mat: calc.porcelainFlatMat,
                  matKey: 'flatPorcelain',
                  labKey: 'flatPorcelainLab',
                  matUnit: 'SF',
                  rateLabel: `$${(p(FINISHES_RATES.flatPorcelain.db) ?? FINISHES_RATES.flatPorcelain.fb).toFixed(2)}/SF`,
                },
              ].map(({ label, sf, setSf, mat, matKey, labKey, matUnit, rateLabel }) => (
                <tr key={label} className="border-b border-gray-100">
                  <td className="py-1 pr-2 text-xs text-gray-700">{label}</td>
                  <td className="py-1 pr-2">
                    <NumInput value={sf} onChange={setSf} />
                  </td>
                  <td className="py-1 pr-2 text-xs text-gray-400">
                    <span className="inline-flex items-center gap-1 flex-wrap">
                      {rateLabel}
                      <RateEditPopover
                        table="material_rates"
                        name={FINISHES_RATES[matKey].db}
                        category="Finishes"
                        unitLabel={matUnit}
                        currentValue={p(FINISHES_RATES[matKey].db) ?? FINISHES_RATES[matKey].fb}
                        onSaved={refreshAllRates}
                      />
                      <RateEditPopover
                        table="labor_rates"
                        name={FINISHES_RATES[labKey].db}
                        category="Finishes"
                        mode="coefficient"
                        unitLabel="hrs/SF"
                        currentValue={p(FINISHES_RATES[labKey].db) ?? FINISHES_RATES[labKey].fb}
                        onSaved={refreshAllRates}
                      />
                    </span>
                  </td>
                  <td className="py-1 text-right text-xs text-gray-600">
                    {n(sf) > 0 ? `$${mat.toFixed(2)}` : '—'}
                  </td>
                </tr>
              ))}

              {/* Flagstone Flatwork — editable $/ton */}
              <tr className="border-b border-gray-100">
                <td className="py-1 pr-2 text-xs text-gray-700">
                  <span className="inline-flex items-center gap-1">
                    Flagstone Over Slab
                    <RateEditPopover
                      table="labor_rates"
                      name={FINISHES_RATES.flatFlagstoneLab.db}
                      category="Finishes"
                      mode="coefficient"
                      unitLabel="hrs/SF"
                      currentValue={
                        p(FINISHES_RATES.flatFlagstoneLab.db) ?? FINISHES_RATES.flatFlagstoneLab.fb
                      }
                      onSaved={refreshAllRates}
                    />
                  </span>
                </td>
                <td className="py-1 pr-2">
                  <NumInput value={flagstoneFlatSF} onChange={setFlagstoneFlatSF} />
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
                        placeholder={(
                          p(FINISHES_RATES.flatFlagstone.db) ?? FINISHES_RATES.flatFlagstone.fb
                        ).toString()}
                        value={flagstoneFlatRateIn}
                        onChange={e => setFlagstoneFlatRateIn(e.target.value)}
                      />
                    </div>
                    <RateEditPopover
                      table="material_rates"
                      name={FINISHES_RATES.flatFlagstone.db}
                      category="Finishes"
                      unitLabel="ton"
                      currentValue={
                        p(FINISHES_RATES.flatFlagstone.db) ?? FINISHES_RATES.flatFlagstone.fb
                      }
                      onSaved={refreshAllRates}
                    />
                  </div>
                </td>
                <td className="py-1 text-right text-xs text-gray-600">
                  {n(flagstoneFlatSF) > 0 ? (
                    <div className="text-right">
                      <div>${calc.flagstoneFlatMat.toFixed(2)}</div>
                      <div className="text-gray-400">
                        {(n(flagstoneFlatSF) / 80).toFixed(2)} tons
                      </div>
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

      {/* ── Wall Caps ── */}
      <div>
        <SectionHeader title="Wall Caps" />
        <p className="text-xs text-gray-400 mb-1 inline-flex items-center flex-wrap gap-x-2">
          <span className="inline-flex items-center gap-1">
            Flagstone $
            {(p(FINISHES_RATES.capFlagstone.db) ?? FINISHES_RATES.capFlagstone.fb).toFixed(2)}/ton
            <RateEditPopover
              table="material_rates"
              name={FINISHES_RATES.capFlagstone.db}
              category="Finishes"
              unitLabel="ton"
              currentValue={p(FINISHES_RATES.capFlagstone.db) ?? FINISHES_RATES.capFlagstone.fb}
              onSaved={refreshAllRates}
            />
          </span>
          ·
          <span className="inline-flex items-center gap-1">
            Precast ${(p(FINISHES_RATES.capPrecast.db) ?? FINISHES_RATES.capPrecast.fb).toFixed(2)}
            /ea
            <RateEditPopover
              table="material_rates"
              name={FINISHES_RATES.capPrecast.db}
              category="Finishes"
              unitLabel="ea"
              currentValue={p(FINISHES_RATES.capPrecast.db) ?? FINISHES_RATES.capPrecast.fb}
              onSaved={refreshAllRates}
            />
          </span>
          ·
          <span className="inline-flex items-center gap-1">
            Bullnose $
            {(p(FINISHES_RATES.capBullnose.db) ?? FINISHES_RATES.capBullnose.fb).toFixed(2)}/LF
            <RateEditPopover
              table="material_rates"
              name={FINISHES_RATES.capBullnose.db}
              category="Finishes"
              unitLabel="LF"
              currentValue={p(FINISHES_RATES.capBullnose.db) ?? FINISHES_RATES.capBullnose.fb}
              onSaved={refreshAllRates}
            />
          </span>
          ·
          <span className="inline-flex items-center gap-1">
            Concrete $
            {(p(FINISHES_RATES.concreteTruck.db) ?? FINISHES_RATES.concreteTruck.fb).toFixed(2)}/CY
            <RateEditPopover
              table="material_rates"
              name={FINISHES_RATES.concreteTruck.db}
              category="Finishes"
              unitLabel="CY"
              currentValue={p(FINISHES_RATES.concreteTruck.db) ?? FINISHES_RATES.concreteTruck.fb}
              onSaved={refreshAllRates}
            />
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
                    <select
                      className="input text-sm py-1 w-36"
                      value={cap.type}
                      onChange={e => updateCap(i, 'type', e.target.value)}
                    >
                      {CAP_TYPES.map(t => (
                        <option key={t}>{t}</option>
                      ))}
                    </select>
                  </td>
                  <td className="py-1 pr-2">
                    {isActive && cap.type !== 'Precast' && (
                      <NumInput
                        value={cap.widthIn}
                        onChange={v => updateCap(i, 'widthIn', v)}
                        className="w-20"
                        placeholder="4"
                      />
                    )}
                  </td>
                  <td className="py-1">
                    {isActive && (
                      <NumInput
                        value={cap.type === 'Precast' ? cap.qty : cap.lf}
                        onChange={v => updateCap(i, cap.type === 'Precast' ? 'qty' : 'lf', v)}
                        className="w-20"
                        placeholder="0"
                      />
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
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
                },
                {
                  label: 'Smooth Stucco',
                  sf: smoothStuccoSF,
                  setSf: setSmoothStuccoSF,
                  mat: calc.smoothStuccoMat,
                  matKey: 'smoothStucco',
                  labKey: 'smoothStuccoLab',
                },
                {
                  label: 'Ledgerstone Veneer',
                  sf: ledgerstoneSF,
                  setSf: setLedgerstoneSF,
                  mat: calc.ledgerstoneMat,
                  matKey: 'ledgerstone',
                  labKey: 'ledgerstoneLab',
                },
                {
                  label: 'Stacked Stone',
                  sf: stackedStoneSF,
                  setSf: setStackedStoneSF,
                  mat: calc.stackedStoneMat,
                  matKey: 'stackedStone',
                  labKey: 'stackedStoneLab',
                },
                {
                  label: 'Tile',
                  sf: tileSF,
                  setSf: setTileSF,
                  mat: calc.tileMat,
                  matKey: 'tile',
                  labKey: 'tileLab',
                },
              ].map(({ label, sf, setSf, mat, matKey, labKey }) => (
                <tr key={label} className="border-b border-gray-100">
                  <td className="py-1 pr-2 text-xs text-gray-700">{label}</td>
                  <td className="py-1 pr-2">
                    <NumInput value={sf} onChange={setSf} />
                  </td>
                  <td className="py-1 pr-2 text-xs text-gray-400">
                    <span className="inline-flex items-center gap-1 flex-wrap">
                      ${(p(FINISHES_RATES[matKey].db) ?? FINISHES_RATES[matKey].fb).toFixed(2)}/SF
                      <RateEditPopover
                        table="material_rates"
                        name={FINISHES_RATES[matKey].db}
                        category="Finishes"
                        unitLabel="SF"
                        currentValue={p(FINISHES_RATES[matKey].db) ?? FINISHES_RATES[matKey].fb}
                        onSaved={refreshAllRates}
                      />
                      <RateEditPopover
                        table="labor_rates"
                        name={FINISHES_RATES[labKey].db}
                        category="Finishes"
                        mode="coefficient"
                        unitLabel="rate"
                        currentValue={p(FINISHES_RATES[labKey].db) ?? FINISHES_RATES[labKey].fb}
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
                      name={FINISHES_RATES.flagstoneLab.db}
                      category="Finishes"
                      mode="coefficient"
                      unitLabel="hrs/SF"
                      currentValue={
                        p(FINISHES_RATES.flagstoneLab.db) ?? FINISHES_RATES.flagstoneLab.fb
                      }
                      onSaved={refreshAllRates}
                    />
                  </span>
                </td>
                <td className="py-1 pr-2">
                  <NumInput value={wallFlagstoneSF} onChange={setWallFlagstoneSF} />
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
                        placeholder={(
                          p(FINISHES_RATES.realFlagstone.db) ?? FINISHES_RATES.realFlagstone.fb
                        ).toString()}
                        value={wallFlagstoneRateIn}
                        onChange={e => setWallFlagstoneRateIn(e.target.value)}
                      />
                    </div>
                    <RateEditPopover
                      table="material_rates"
                      name={FINISHES_RATES.realFlagstone.db}
                      category="Finishes"
                      unitLabel="ton"
                      currentValue={
                        p(FINISHES_RATES.realFlagstone.db) ?? FINISHES_RATES.realFlagstone.fb
                      }
                      onSaved={refreshAllRates}
                    />
                  </div>
                </td>
                <td className="py-1 text-right text-xs text-gray-600">
                  {n(wallFlagstoneSF) > 0 ? (
                    <div className="text-right">
                      <div>${calc.wallFlagStoneMat.toFixed(2)}</div>
                      <div className="text-gray-400">
                        {(n(wallFlagstoneSF) / 80).toFixed(2)} tons
                      </div>
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
                      name={FINISHES_RATES.realStoneLab.db}
                      category="Finishes"
                      mode="coefficient"
                      unitLabel="hrs/SF"
                      currentValue={
                        p(FINISHES_RATES.realStoneLab.db) ?? FINISHES_RATES.realStoneLab.fb
                      }
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
                        placeholder={(
                          p(FINISHES_RATES.realStone.db) ?? FINISHES_RATES.realStone.fb
                        ).toString()}
                        value={realStoneRateIn}
                        onChange={e => setRealStoneRateIn(e.target.value)}
                      />
                    </div>
                    <RateEditPopover
                      table="material_rates"
                      name={FINISHES_RATES.realStone.db}
                      category="Finishes"
                      unitLabel="ton"
                      currentValue={p(FINISHES_RATES.realStone.db) ?? FINISHES_RATES.realStone.fb}
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
