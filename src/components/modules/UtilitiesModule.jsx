import WorkTypeChooser from './WorkTypeChooser'
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import GpmdBar from './GpmdBar'
import ModuleNotesField from './ModuleNotesField'
import RateEditPopover from '../RateEditPopover'
import { fetchSalesTaxRate } from '../../lib/companyDefaults'
import { calcWalkAccessLabor, DEFAULT_WALK_ACCESS_PACE_LF_PER_MIN } from '../../lib/walkAccess'

// ─────────────────────────────────────────────────────────────────────────────
// Utilities Module — fields and calculations from Excel estimator (Utilities Module tab)
// Covers trenching, utility lines (gas/electrical), gas fixtures, and add-ons.
//
// All material costs AND labor time rates are stored in material_rates
// (category = 'Utilities') so they are fully editable in Master Rates.
// Hardcoded values here are fallbacks only, used when the DB row is absent.
// ─────────────────────────────────────────────────────────────────────────────

// dbName = name in material_rates for the material cost row
// laborDbName = name in material_rates for the labor rate row (hrs per unit)
const UTILITY_LINE_TYPES = {
  'PVC Conduit with Electrical': {
    costPerLF: 1.92,
    dbName: 'PVC Conduit with Electrical',
    laborPerLF: 0.05,
    laborDbName: 'PVC Conduit with Electrical - Labor Rate',
  },
  '1-1/2" Poly Gas Pipe': {
    costPerLF: 4.25,
    dbName: '1-1/2" Poly Gas Pipe',
    laborPerLF: 0.05,
    laborDbName: '1-1/2" Poly Gas Pipe - Labor Rate',
  },
  '1" Black Iron Gas Pipe': {
    costPerLF: 2.76,
    dbName: '1" Black Iron Gas Pipe',
    laborPerLF: 0.15,
    laborDbName: '1" Black Iron Gas Pipe - Labor Rate',
  },
  '1-1/2" Black Iron Gas Pipe': {
    costPerLF: 4.23,
    dbName: '1-1/2" Black Iron Gas Pipe',
    laborPerLF: 0.2,
    laborDbName: '1-1/2" Black Iron Gas Pipe - Labor Rate',
  },
  '2" Black Iron Gas Pipe': {
    costPerLF: 5.72,
    dbName: '2" Black Iron Gas Pipe',
    laborPerLF: 0.25,
    laborDbName: '2" Black Iron Gas Pipe - Labor Rate',
  },
}

const GAS_FIXTURE_TYPES = {
  '12" Single Gas Ring': {
    cost: 61.75,
    dbName: '12" Single Gas Ring',
    laborHrs: 2,
    laborDbName: '12" Single Gas Ring - Labor Rate',
  },
  '18" Single Gas Ring': {
    cost: 84.75,
    dbName: '18" Single Gas Ring',
    laborHrs: 2,
    laborDbName: '18" Single Gas Ring - Labor Rate',
  },
  '24" Single Gas Ring': {
    cost: 107.75,
    dbName: '24" Single Gas Ring',
    laborHrs: 2,
    laborDbName: '24" Single Gas Ring - Labor Rate',
  },
  '24" Double Gas Ring': {
    cost: 163.25,
    dbName: '24" Double Gas Ring',
    laborHrs: 2,
    laborDbName: '24" Double Gas Ring - Labor Rate',
  },
  "2' Straight Gas Bar": {
    cost: 35.5,
    dbName: "2' Straight Gas Bar",
    laborHrs: 2,
    laborDbName: "2' Straight Gas Bar - Labor Rate",
  },
  "3' Straight Gas Bar": {
    cost: 56.0,
    dbName: "3' Straight Gas Bar",
    laborHrs: 2.5,
    laborDbName: "3' Straight Gas Bar - Labor Rate",
  },
  "4' Straight Gas Bar": {
    cost: 68.5,
    dbName: "4' Straight Gas Bar",
    laborHrs: 3,
    laborDbName: "4' Straight Gas Bar - Labor Rate",
  },
  'Gas Shut-Off Valve': {
    cost: 89.7,
    dbName: 'Gas Shut-Off Valve',
    laborHrs: 2,
    laborDbName: 'Gas Shut-Off Valve - Labor Rate',
  },
}

// Electrical fixtures — same table/rate shape as gas, in their own section.
const ELECTRICAL_FIXTURE_TYPES = {
  'Electric Sub-panel': {
    cost: 300,
    dbName: 'Electric Sub-panel',
    laborHrs: 4.5,
    laborDbName: 'Electric Sub-panel - Labor Rate',
  },
  'Electric Disconnect': {
    cost: 150,
    dbName: 'Electric Disconnect',
    laborHrs: 2.5,
    laborDbName: 'Electric Disconnect - Labor Rate',
  },
  'GFCI Protected Receptacles': {
    cost: 86.25,
    dbName: 'GFCI Protected Receptacles',
    laborHrs: 2,
    laborDbName: 'GFCI Protected Receptacles - Labor Rate',
  },
  'Bubble Covers for Receptacles': {
    cost: 19.19,
    dbName: 'Bubble Covers for Receptacles',
    laborHrs: 0.25,
    laborDbName: 'Bubble Covers for Receptacles - Labor Rate',
  },
  'Infratech W2024SS 2000W 240V Heater (Stainless)': {
    cost: 725.22,
    dbName: 'Infratech W2024SS 2000W 240V Heater (Stainless)',
    laborHrs: 6,
    laborDbName: 'Infratech W2024SS 2000W 240V Heater (Stainless) - Labor Rate',
  },
  'Infratech W39 Flush Mount Frame': {
    cost: 572.26,
    dbName: 'Infratech W39 Flush Mount Frame',
    laborHrs: 2,
    laborDbName: 'Infratech W39 Flush Mount Frame - Labor Rate',
  },
  'Infratech Single Duplex Switch in Surface Mount Gang Box': {
    cost: 206.11,
    dbName: 'Infratech Single Duplex Switch in Surface Mount Gang Box',
    laborHrs: 2,
    laborDbName: 'Infratech Single Duplex Switch in Surface Mount Gang Box - Labor Rate',
  },
}

// Combined lookup so a row of either kind resolves its rate.
const FIXTURE_TYPES = { ...GAS_FIXTURE_TYPES, ...ELECTRICAL_FIXTURE_TYPES }

// Minutes per cubic foot by equipment type (same as Drainage)
const TRENCH_MINS_PER_CF = { Trench: 10, Hand: 12.5 }

// Each trench equipment maps to a labor_rates row so the inline calculator
// icon next to the dropdown can edit the t/hr → min/cf rate.
const TRENCH_LABOR_RATE_NAME = {
  Trench: 'Utilities Trench Excavation',
  Hand: 'Utilities Hand Excavation',
}

const ADD_ITEM_RATES = {
  // In-house electrical: quantity × install hours + material (NOT a sub cost).
  curbCore: {
    matCost: 250,
    dbName: 'Curb Core',
    label: 'Curb Core *',
    laborHrs: 2,
    laborDbName: 'Curb Core - Labor Rate',
  },
  hydrocut: {
    matCost: 50,
    dbName: 'Hydrocut Under Hardscape',
    label: 'Hydrocut Under Hardscape *',
    laborHrs: 2,
    laborDbName: 'Hydrocut Under Hardscape - Labor Rate',
  },
  gfciOutlet: {
    matCost: 19.5,
    dbName: 'GFCI Outlet Receptacle',
    label: 'GFCI Outlet Receptacle',
    laborHrs: 1,
    laborDbName: 'GFCI Outlet Receptacle - Labor Rate',
  },
}

const DEFAULTS = {
  laborRatePerHour: 35,
  laborBurdenPct: 0.29,
  gpmd: 425,
  commissionRate: 0.12,
}

const n = v => parseFloat(v) || 0

function calcUtilities(
  state,
  laborRatePerHour = DEFAULTS.laborRatePerHour,
  materialPrices = {},
  gpmd = DEFAULTS.gpmd,
  walkAccess = null,
  laborBurdenPct = DEFAULTS.laborBurdenPct
) {
  const _pace = parseFloat(walkAccess?.paceLfPerMin) || DEFAULT_WALK_ACCESS_PACE_LF_PER_MIN
  const {
    difficulty,
    hoursAdj,
    trenchRows,
    lineRows,
    fixtureRows,
    elecFixtureRows,
    additionalItems,
    electricSubpanelSubCost,
    manualRows,
  } = state

  let trenchHrs = 0
  let lineHrs = 0,
    lineMat = 0
  let fixHrs = 0,
    fixMat = 0
  let addHrs = 0,
    addMat = 0
  let manHrs = 0,
    manMat = 0,
    manSub = 0

  trenchRows.forEach(r => {
    const lf = n(r.lf),
      w = n(r.width),
      d = n(r.depth)
    if (lf > 0 && w > 0 && d > 0) {
      const cf = lf * (w / 12) * (d / 12)
      // DB value via labor_rates['Utilities Trench/Hand Excavation'] takes precedence
      const minsPerCF =
        materialPrices[TRENCH_LABOR_RATE_NAME[r.equipment]] ?? TRENCH_MINS_PER_CF[r.equipment] ?? 10
      trenchHrs += (cf * minsPerCF) / 60
    }
  })

  lineRows.forEach(r => {
    const lf = n(r.lf)
    const rate = UTILITY_LINE_TYPES[r.type]
    if (lf > 0 && rate) {
      const costPerLF = materialPrices[rate.dbName] ?? rate.costPerLF
      const laborPerLF = materialPrices[rate.laborDbName] ?? rate.laborPerLF
      lineMat += lf * costPerLF
      lineHrs += lf * laborPerLF
    }
  })

  ;[...fixtureRows, ...(elecFixtureRows || [])].forEach(r => {
    const qty = n(r.qty)
    const rate = FIXTURE_TYPES[r.type]
    if (qty > 0 && rate) {
      const cost = materialPrices[rate.dbName] ?? rate.cost
      const laborHrs = materialPrices[rate.laborDbName] ?? rate.laborHrs
      fixMat += qty * cost
      fixHrs += qty * laborHrs
    }
  })

  Object.entries(ADD_ITEM_RATES).forEach(([key, rate]) => {
    const qty = n(additionalItems[`${key}Qty`])
    if (qty > 0) {
      const matCost = materialPrices[rate.dbName] ?? rate.matCost
      const laborHrs = materialPrices[rate.laborDbName] ?? rate.laborHrs
      addHrs += qty * laborHrs
      addMat += qty * matCost
    }
  })

  manualRows.forEach(r => {
    manHrs += n(r.hours)
    manMat += n(r.materials)
    manSub += n(r.subCost)
  })

  const baseHrs = trenchHrs + lineHrs + fixHrs + addHrs + manHrs
  const diffMod = 1 + n(difficulty) / 100
  const adjHrs = n(hoursAdj)
  const _preWalkHrs = baseHrs * diffMod + adjHrs
  const walkHrs = calcWalkAccessLabor(_preWalkHrs, state.distanceLF, { paceLfPerMin: _pace })
  const totalHrs = _preWalkHrs + walkHrs
  const manDays = totalHrs / 8
  const totalMat = lineMat + fixMat + addMat + manMat
  const laborCost = totalHrs * laborRatePerHour
  const burden = laborCost * (n(laborBurdenPct) || DEFAULTS.laborBurdenPct)
  const gp = manDays * gpmd
  const commission = gp * DEFAULTS.commissionRate
  const subCost = manSub
  const price = totalMat + laborCost + burden + gp + commission + subCost

  return {
    totalHrs,
    manDays,
    totalMat,
    laborCost,
    burden,
    gp,
    commission,
    subCost,
    price,
    walkHrs,
    trenchHrs,
    lineHrs,
    lineMat,
    fixHrs,
    fixMat,
    addHrs,
    addMat,
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

// ── Default blank rows ────────────────────────────────────────────────────────
const DEFAULT_TRENCH_ROWS = [
  { equipment: 'Trench', lf: '', width: '', depth: '' },
  { equipment: 'Trench', lf: '', width: '', depth: '' },
  { equipment: 'Hand', lf: '', width: '', depth: '' },
]
const DEFAULT_LINE_ROWS = [
  { type: 'PVC Conduit with Electrical', lf: '' },
  { type: '1" Black Iron Gas Pipe', lf: '' },
  { type: '1-1/2" Black Iron Gas Pipe', lf: '' },
]
const DEFAULT_FIXTURE_ROWS = [
  { type: '12" Single Gas Ring', qty: '' },
  { type: '12" Single Gas Ring', qty: '' },
]
const DEFAULT_ELEC_FIXTURE_ROWS = [
  { type: 'GFCI Protected Receptacles', qty: '' },
  { type: 'GFCI Protected Receptacles', qty: '' },
]
const DEFAULT_ADDITIONAL = {
  curbCoreQty: '',
  hydrocutQty: '',
  gfciOutletQty: '',
  permitRequired: false,
}
const DEFAULT_MANUAL_ROWS = [
  { label: 'Misc 1', hours: '', materials: '', subCost: '' },
  { label: 'Misc 2', hours: '', materials: '', subCost: '' },
  { label: 'Misc 3', hours: '', materials: '', subCost: '' },
  { label: 'Misc 4', hours: '', materials: '', subCost: '' },
]

// ── Main Component ────────────────────────────────────────────────────────────
export default function UtilitiesModule({ onSave, onBack, saving, initialData }) {
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
  const [distanceLF, setDistanceLF] = useState(initialData?.distanceLF ?? '')
  const [walkAccess, setWalkAccess] = useState(
    initialData?.walkAccess ?? {
      paceLfPerMin: DEFAULT_WALK_ACCESS_PACE_LF_PER_MIN,
    }
  )
  const [materialPrices, setMaterialPrices] = useState(initialData?.materialPrices ?? {})
  const [pricesLoading, setPricesLoading] = useState(!initialData?.materialPrices)

  // Re-fetch Utilities labor+material rate map (merged into one for lookup).
  // Called once on mount and again after any RateEditPopover save.
  const refreshAllRates = useCallback(async () => {
    const [matRes, labRes] = await Promise.all([
      supabase.from('material_rates').select('name, unit_cost').eq('category', 'Utilities'),
      supabase.from('labor_rates').select('name, rate').eq('category', 'Utilities'),
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
        .select('labor_rate_per_hour, labor_burden_pct, walk_access_pace_lf_per_min')
        .single()
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

    if (initialData?.materialPrices) return
    refreshAllRates().then(() => setPricesLoading(false))
  }, [refreshAllRates])

  const gpmd = initialData?.gpmd ?? DEFAULTS.gpmd
  const subGpMarkupRate = initialData?.subGpMarkupRate ?? 0.2

  const [difficulty, setDifficulty] = useState(initialData?.difficulty ?? '')
  const [crewType, setCrewType] = useState(initialData?.crewType ?? 'Specialty')
  const [subType, setSubType] = useState(initialData?.subType ?? 'In-House')
  const [hoursAdj, setHoursAdj] = useState(initialData?.hoursAdj ?? '')
  const [trenchRows, setTrenchRows] = useState(initialData?.trenchRows ?? DEFAULT_TRENCH_ROWS)
  const [lineRows, setLineRows] = useState(initialData?.lineRows ?? DEFAULT_LINE_ROWS)
  const [fixtureRows, setFixtureRows] = useState(initialData?.fixtureRows ?? DEFAULT_FIXTURE_ROWS)
  const [elecFixtureRows, setElecFixtureRows] = useState(
    initialData?.elecFixtureRows ?? DEFAULT_ELEC_FIXTURE_ROWS
  )
  const [additionalItems, setAdditionalItems] = useState(
    initialData?.additionalItems ?? DEFAULT_ADDITIONAL
  )
  const [electricSubpanelSubCost, setElectricSubpanelSubCost] = useState(
    initialData?.electricSubpanelSubCost ?? ''
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

  const calcRaw = calcUtilities(
    {
      difficulty,
      hoursAdj,
      trenchRows,
      lineRows,
      fixtureRows,
      elecFixtureRows,
      additionalItems,
      electricSubpanelSubCost,
      manualRows,
      distanceLF,
    },
    laborRatePerHour,
    materialPrices,
    gpmd,
    walkAccess,
    laborBurdenPct
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

  function updateTrench(i, field, val) {
    setTrenchRows(rows => rows.map((r, idx) => (idx === i ? { ...r, [field]: val } : r)))
  }
  function updateLine(i, field, val) {
    setLineRows(rows => rows.map((r, idx) => (idx === i ? { ...r, [field]: val } : r)))
  }
  function updateFixture(i, field, val) {
    setFixtureRows(rows => rows.map((r, idx) => (idx === i ? { ...r, [field]: val } : r)))
  }
  function updateElecFixture(i, field, val) {
    setElecFixtureRows(rows => rows.map((r, idx) => (idx === i ? { ...r, [field]: val } : r)))
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
        trenchRows,
        lineRows,
        fixtureRows,
        elecFixtureRows,
        additionalItems,
        electricSubpanelSubCost,
        manualRows,
        laborRatePerHour,
        laborBurdenPct,
        gpmd,
        materialPrices,
        calc,
      },
    })
  }

  return (
    <div className="space-y-5">
      {/* ── Sticky GPMD bar ── */}
      <div className="sticky top-0 z-20 -mx-6 px-6 pt-1 pb-1 bg-gray-900 shadow-lg">
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

      {/* Settings */}
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

      {/* ── Trenching ── */}
      <div>
        <SectionHeader title="Trenching" />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 border-b border-gray-200">
                <th className="text-left pb-1 pr-2 font-medium">Equipment</th>
                <th className="text-left pb-1 pr-2 font-medium">Linear Feet</th>
                <th className="text-left pb-1 pr-2 font-medium">Width (In)</th>
                <th className="text-left pb-1 font-medium">Depth (In)</th>
                <th className="text-right pb-1 font-medium text-gray-400">Est. Hrs</th>
              </tr>
            </thead>
            <tbody>
              {trenchRows.map((row, i) => {
                const lf = n(row.lf),
                  w = n(row.width),
                  d = n(row.depth)
                const minsPerCF =
                  materialPrices[TRENCH_LABOR_RATE_NAME[row.equipment]] ??
                  TRENCH_MINS_PER_CF[row.equipment] ??
                  10
                const cf = lf > 0 && w > 0 && d > 0 ? lf * (w / 12) * (d / 12) : 0
                const hrs = cf > 0 ? (cf * minsPerCF) / 60 : 0
                const laborName = TRENCH_LABOR_RATE_NAME[row.equipment]
                return (
                  <tr key={i} className="border-b border-gray-100">
                    <td className="py-1 pr-2">
                      <div className="flex items-center gap-1">
                        <select
                          className="input text-sm py-1 flex-1 min-w-0"
                          value={row.equipment}
                          onChange={e => updateTrench(i, 'equipment', e.target.value)}
                        >
                          <option>Trench</option>
                          <option>Hand</option>
                        </select>
                        {laborName && (
                          <RateEditPopover
                            table="labor_rates"
                            name={laborName}
                            category="Utilities"
                            mode="coefficient"
                            unitLabel="min/cf"
                            currentValue={minsPerCF}
                            onSaved={refreshAllRates}
                          />
                        )}
                      </div>
                    </td>
                    <td className="py-1 pr-2">
                      <NumInput value={row.lf} onChange={v => updateTrench(i, 'lf', v)} />
                    </td>
                    <td className="py-1 pr-2">
                      <NumInput value={row.width} onChange={v => updateTrench(i, 'width', v)} />
                    </td>
                    <td className="py-1">
                      {' '}
                      <NumInput value={row.depth} onChange={v => updateTrench(i, 'depth', v)} />
                    </td>
                    <td className="py-1 text-right text-gray-500 text-xs pl-2">
                      {hrs > 0 ? hrs.toFixed(2) : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <button
            type="button"
            className="mt-1 text-xs text-green-700 hover:text-green-900 font-medium"
            onClick={() =>
              setTrenchRows(r => [...r, { equipment: 'Trench', lf: '', width: '', depth: '' }])
            }
          >
            + Add row
          </button>
        </div>
      </div>

      {/* ── Additional Subgrade Work ── */}
      <div>
        <SectionHeader title="Additional Subgrade Work" />
        <div className="space-y-2">
          {/* Curb Core & Hydrocut — qty based */}
          {Object.entries(ADD_ITEM_RATES).map(([key, rate]) => {
            const qty = n(additionalItems[`${key}Qty`])
            const matCost = materialPrices[rate.dbName] ?? rate.matCost
            const laborHrs = materialPrices[rate.laborDbName] ?? rate.laborHrs
            return (
              <div key={key} className="flex items-center gap-3 py-1.5 border-b border-gray-100">
                <span className="text-xs text-gray-700 flex-1 inline-flex items-center gap-1">
                  {rate.label}
                  <RateEditPopover
                    table="labor_rates"
                    name={rate.laborDbName}
                    category="Utilities"
                    mode="coefficient"
                    unitLabel="hr/ea"
                    currentValue={laborHrs}
                    onSaved={refreshAllRates}
                  />
                  <RateEditPopover
                    table="material_rates"
                    name={rate.dbName}
                    category="Utilities"
                    unitLabel="ea"
                    currentValue={matCost}
                    onSaved={refreshAllRates}
                  />
                </span>
                <input
                  type="number"
                  step="1"
                  className="input text-sm py-1 w-20"
                  placeholder="Qty"
                  value={additionalItems[`${key}Qty`]}
                  onChange={e => setAdditionalItems(p => ({ ...p, [`${key}Qty`]: e.target.value }))}
                />
                <span className="text-xs text-gray-400 w-20 text-right">
                  {qty > 0 ? `$${(qty * matCost).toLocaleString()} mat` : '—'}
                </span>
              </div>
            )
          })}

          {/* Permit Required */}
          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer py-1">
            <input
              type="checkbox"
              checked={additionalItems.permitRequired}
              onChange={e => setAdditionalItems(p => ({ ...p, permitRequired: e.target.checked }))}
              className="rounded"
            />
            * Permit Required
          </label>
        </div>
      </div>

      {/* ── Utility Lines ── */}
      <div>
        <SectionHeader title="Utility Lines" />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 border-b border-gray-200">
                <th className="text-left pb-1 pr-2 font-medium">Line Type</th>
                <th className="text-left pb-1 pr-2 font-medium">Linear Feet</th>
                <th className="text-right pb-1 pr-2 font-medium text-gray-400">$/LF</th>
                <th className="text-right pb-1 font-medium text-gray-400">Material $</th>
              </tr>
            </thead>
            <tbody>
              {lineRows.map((row, i) => {
                const rate = UTILITY_LINE_TYPES[row.type]
                const costPerLF = materialPrices[rate?.dbName] ?? rate?.costPerLF ?? 0
                const laborPerLF = materialPrices[rate?.laborDbName] ?? rate?.laborPerLF ?? 0
                const mat = n(row.lf) * costPerLF
                return (
                  <tr key={i} className="border-b border-gray-100">
                    <td className="py-1 pr-2">
                      <div className="flex items-center gap-1">
                        <select
                          className="input text-sm py-1 flex-1 min-w-0"
                          value={row.type}
                          onChange={e => updateLine(i, 'type', e.target.value)}
                        >
                          {Object.keys(UTILITY_LINE_TYPES).map(t => (
                            <option key={t}>{t}</option>
                          ))}
                        </select>
                        {rate && (
                          <RateEditPopover
                            table="labor_rates"
                            name={rate.laborDbName}
                            category="Utilities"
                            mode="coefficient"
                            unitLabel="hrs/LF"
                            currentValue={laborPerLF}
                            onSaved={refreshAllRates}
                          />
                        )}
                      </div>
                    </td>
                    <td className="py-1 pr-2">
                      <NumInput value={row.lf} onChange={v => updateLine(i, 'lf', v)} />
                    </td>
                    <td className="py-1 text-right text-gray-400 text-xs pr-2">
                      <span className="inline-flex items-center justify-end gap-1">
                        ${costPerLF.toFixed(2)}
                        {rate && (
                          <RateEditPopover
                            table="material_rates"
                            name={rate.dbName}
                            category="Utilities"
                            unitLabel="LF"
                            currentValue={costPerLF}
                            onSaved={refreshAllRates}
                          />
                        )}
                      </span>
                    </td>
                    <td className="py-1 text-right text-gray-600 text-xs">
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
            onClick={() =>
              setLineRows(r => [...r, { type: 'PVC Conduit with Electrical', lf: '' }])
            }
          >
            + Add row
          </button>
        </div>
      </div>

      {/* ── Fixtures ── */}
      <div>
        <SectionHeader title="Gas Fixtures" />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 border-b border-gray-200">
                <th className="text-left pb-1 pr-2 font-medium">Fixture</th>
                <th className="text-left pb-1 pr-2 font-medium">Qty</th>
                <th className="text-right pb-1 pr-2 font-medium text-gray-400">$/Ea</th>
                <th className="text-right pb-1 font-medium text-gray-400">Material $</th>
              </tr>
            </thead>
            <tbody>
              {fixtureRows.map((row, i) => {
                const rate = FIXTURE_TYPES[row.type]
                const cost = materialPrices[rate?.dbName] ?? rate?.cost ?? 0
                const laborHrs = materialPrices[rate?.laborDbName] ?? rate?.laborHrs ?? 0
                const mat = n(row.qty) * cost
                return (
                  <tr key={i} className="border-b border-gray-100">
                    <td className="py-1 pr-2">
                      <div className="flex items-center gap-1">
                        <select
                          className="input text-sm py-1 flex-1 min-w-0"
                          value={row.type}
                          onChange={e => updateFixture(i, 'type', e.target.value)}
                        >
                          {Object.keys(GAS_FIXTURE_TYPES).map(t => (
                            <option key={t}>{t}</option>
                          ))}
                        </select>
                        {rate && (
                          <RateEditPopover
                            table="labor_rates"
                            name={rate.laborDbName}
                            category="Utilities"
                            mode="coefficient"
                            unitLabel="hrs/ea"
                            currentValue={laborHrs}
                            onSaved={refreshAllRates}
                          />
                        )}
                      </div>
                    </td>
                    <td className="py-1 pr-2">
                      <NumInput value={row.qty} onChange={v => updateFixture(i, 'qty', v)} />
                    </td>
                    <td className="py-1 text-right text-gray-400 text-xs pr-2">
                      <span className="inline-flex items-center justify-end gap-1">
                        ${cost.toFixed(2)}
                        {rate && (
                          <RateEditPopover
                            table="material_rates"
                            name={rate.dbName}
                            category="Utilities"
                            unitLabel="ea"
                            currentValue={cost}
                            onSaved={refreshAllRates}
                          />
                        )}
                      </span>
                    </td>
                    <td className="py-1 text-right text-gray-600 text-xs">
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
            onClick={() => setFixtureRows(r => [...r, { type: '12" Single Gas Ring', qty: '' }])}
          >
            + Add row
          </button>
        </div>
      </div>

      {/* ── Electrical Fixtures ── */}
      <div>
        <SectionHeader title="Electrical Fixtures" />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 border-b border-gray-200">
                <th className="text-left pb-1 pr-2 font-medium">Fixture</th>
                <th className="text-left pb-1 pr-2 font-medium">Qty</th>
                <th className="text-right pb-1 pr-2 font-medium text-gray-400">$/Ea</th>
                <th className="text-right pb-1 font-medium text-gray-400">Material $</th>
              </tr>
            </thead>
            <tbody>
              {elecFixtureRows.map((row, i) => {
                const rate = FIXTURE_TYPES[row.type]
                const cost = materialPrices[rate?.dbName] ?? rate?.cost ?? 0
                const laborHrs = materialPrices[rate?.laborDbName] ?? rate?.laborHrs ?? 0
                const mat = n(row.qty) * cost
                return (
                  <tr key={i} className="border-b border-gray-100">
                    <td className="py-1 pr-2">
                      <div className="flex items-center gap-1">
                        <select
                          className="input text-sm py-1 flex-1 min-w-0"
                          value={row.type}
                          onChange={e => updateElecFixture(i, 'type', e.target.value)}
                        >
                          {Object.keys(ELECTRICAL_FIXTURE_TYPES).map(t => (
                            <option key={t}>{t}</option>
                          ))}
                        </select>
                        {rate && (
                          <RateEditPopover
                            table="labor_rates"
                            name={rate.laborDbName}
                            category="Utilities"
                            mode="coefficient"
                            unitLabel="hrs/ea"
                            currentValue={laborHrs}
                            onSaved={refreshAllRates}
                          />
                        )}
                      </div>
                    </td>
                    <td className="py-1 pr-2">
                      <NumInput value={row.qty} onChange={v => updateElecFixture(i, 'qty', v)} />
                    </td>
                    <td className="py-1 text-right text-gray-400 text-xs pr-2">
                      <span className="inline-flex items-center justify-end gap-1">
                        ${cost.toFixed(2)}
                        {rate && (
                          <RateEditPopover
                            table="material_rates"
                            name={rate.dbName}
                            category="Utilities"
                            unitLabel="ea"
                            currentValue={cost}
                            onSaved={refreshAllRates}
                          />
                        )}
                      </span>
                    </td>
                    <td className="py-1 text-right text-gray-600 text-xs">
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
            onClick={() =>
              setElecFixtureRows(r => [...r, { type: 'GFCI Protected Receptacles', qty: '' }])
            }
          >
            + Add row
          </button>
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
          <button
            type="button"
            onClick={() => setManualRows(rows => [...rows, { label: '', hours: '', materials: '', subCost: '' }])}
            className="mt-2 text-xs px-2 py-1 rounded bg-slate-100 text-slate-700 hover:bg-slate-200"
          >
            + Add manual entry
          </button>
        </div>
      </div>

      {/* ── Actions ── */}
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
