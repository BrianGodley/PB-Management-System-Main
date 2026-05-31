import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import GpmdBar from './GpmdBar'
import ModuleNotesField from './ModuleNotesField'
import RateEditPopover from '../RateEditPopover'
import { fetchSalesTaxRate } from '../../lib/companyDefaults'
import { calcWalkAccessLabor, DEFAULT_WALK_ACCESS_PACE_LF_PER_MIN } from '../../lib/walkAccess'

// ─────────────────────────────────────────────────────────────────────────────
// Ground Treatments Module — based on Softscape Module tab in Excel estimator
// Covers: Mulch, Edging, Soil Prep, Sod, Flagstone/Precast Steppers,
//         Decomposed Granite, Gravel, Manual Entry
// ─────────────────────────────────────────────────────────────────────────────

// All dbName entries are read from material_rates (category = 'Ground Treatments').
// Fallback values are used when DB row is absent.
const GT_RATES = {
  // ── Mulch ──────────────────────────────────────────────────────────────────
  mulchPerCY: { dbName: 'Mulch', fallback: 25.0 }, // $/CY
  mulchDelivery: { dbName: 'Mulch Delivery Fee', fallback: 75.0 }, // $ flat per delivery

  // ── Edging ─────────────────────────────────────────────────────────────────
  plasticEdgingMat: { dbName: 'Plastic Edging', fallback: 1.2 }, // $/LF
  plasticEdgingLab: { dbName: 'Plastic Edging - Labor Rate', fallback: 0.09 }, // hrs/LF
  metalEdgingMat: { dbName: 'Metal Edging', fallback: 4.0 }, // $/LF
  metalEdgingLab: { dbName: 'Metal Edging - Labor Rate', fallback: 0.17 }, // hrs/LF

  // ── Soil Prep ──────────────────────────────────────────────────────────────
  soilPrepMat: { dbName: 'Soil Prep', fallback: 0.1558 }, // $/SF
  soilPrepLab: { dbName: 'Soil Prep - Labor Rate', fallback: 0.012 }, // hrs/SF

  // ── Sod ────────────────────────────────────────────────────────────────────
  sodMarathonMat: { dbName: 'Sod - Marathon', fallback: 1.2 }, // $/SF
  sodStAugMat: { dbName: 'Sod - St. Augustine', fallback: 1.97 }, // $/SF
  sodLab: { dbName: 'Sod - Labor Rate', fallback: 0.01143 }, // hrs/SF (≈8/700)

  // ── Steppers ───────────────────────────────────────────────────────────────
  flagstonePerTon: { dbName: 'Flagstone Steppers', fallback: 500.0 }, // $/ton default
  flagstoneLab: { dbName: 'Flagstone Steppers - Labor Rate', fallback: 35 }, // SF/day
  precastPerTon: { dbName: 'Precast Steppers', fallback: 200.0 }, // $/ton default
  precastLab: { dbName: 'Precast Steppers - Labor Rate', fallback: 50 }, // SF/day

  // ── Decomposed Granite ─────────────────────────────────────────────────────
  dgPerTon: { dbName: 'Decomposed Granite', fallback: 50.0 }, // $/ton
  dgCementPerTon: { dbName: 'DG Cement Mix', fallback: 20.0 }, // $/ton add-on

  // ── Gravel ─────────────────────────────────────────────────────────────────
  gravelFabricMat: { dbName: 'Gravel Fabric', fallback: 0.1 }, // $/SF
  gravelFabricLab: { dbName: 'Gravel Fabric - Labor Rate', fallback: 0.024 }, // hrs/SF
}

const DEFAULTS = {
  laborRatePerHour: 35,
  laborBurdenPct: 0.29,
  gpmd: 425,
  commissionRate: 0.12,
}

const SOD_TYPES = ['Marathon I/II', 'St. Augustine']
const DG_METHODS = ['Machine', 'Hand']

const n = v => parseFloat(v) || 0

// ── Calculation engine ────────────────────────────────────────────────────────
function calcGroundTreatments(
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
    mulchSF,
    mulchDepth,
    plasticEdgingLF,
    metalEdgingLF,
    soilPrepSF,
    sodSF,
    sodType,
    flagstoneSF,
    flagstoneRate,
    precastSF,
    precastRate,
    dgSF,
    dgDepth,
    dgMethod,
    dgCement,
    gravelRows,
    manualRows,
  } = state

  const p = (dbName, fallback) => mp[dbName] ?? fallback

  let totalMat = 0

  // ── Mulch ──────────────────────────────────────────────────────────────────
  let mulchLab = 0,
    mulchMat = 0
  if (n(mulchSF) > 0) {
    const CY = (n(mulchSF) * (n(mulchDepth) / 12)) / 27
    mulchLab = (CY / 15) * 8 + (n(mulchSF) / 3200) * 8
    mulchMat =
      CY * p(GT_RATES.mulchPerCY.dbName, GT_RATES.mulchPerCY.fallback) +
      p(GT_RATES.mulchDelivery.dbName, GT_RATES.mulchDelivery.fallback)
  }

  // ── Edging ─────────────────────────────────────────────────────────────────
  const plasticLab =
    n(plasticEdgingLF) * p(GT_RATES.plasticEdgingLab.dbName, GT_RATES.plasticEdgingLab.fallback)
  const plasticMat =
    n(plasticEdgingLF) * p(GT_RATES.plasticEdgingMat.dbName, GT_RATES.plasticEdgingMat.fallback)
  const metalLab =
    n(metalEdgingLF) * p(GT_RATES.metalEdgingLab.dbName, GT_RATES.metalEdgingLab.fallback)
  const metalMat =
    n(metalEdgingLF) * p(GT_RATES.metalEdgingMat.dbName, GT_RATES.metalEdgingMat.fallback)

  // ── Soil Prep ──────────────────────────────────────────────────────────────
  const soilLab = n(soilPrepSF) * p(GT_RATES.soilPrepLab.dbName, GT_RATES.soilPrepLab.fallback)
  const soilMat = n(soilPrepSF) * p(GT_RATES.soilPrepMat.dbName, GT_RATES.soilPrepMat.fallback)

  // ── Sod ────────────────────────────────────────────────────────────────────
  const sodLab = n(sodSF) * p(GT_RATES.sodLab.dbName, GT_RATES.sodLab.fallback)
  const sodMat =
    n(sodSF) *
    (sodType === 'St. Augustine'
      ? p(GT_RATES.sodStAugMat.dbName, GT_RATES.sodStAugMat.fallback)
      : p(GT_RATES.sodMarathonMat.dbName, GT_RATES.sodMarathonMat.fallback))

  // ── Flagstone Steppers ─────────────────────────────────────────────────────
  let flagLab = 0,
    flagMat = 0
  if (n(flagstoneSF) > 0) {
    const tons = n(flagstoneSF) / 80
    const sfPerDay = p(GT_RATES.flagstoneLab.dbName, GT_RATES.flagstoneLab.fallback)
    flagLab = (n(flagstoneSF) / sfPerDay) * 8
    flagMat =
      tons *
      (n(flagstoneRate) || p(GT_RATES.flagstonePerTon.dbName, GT_RATES.flagstonePerTon.fallback))
  }

  // ── Precast Steppers ───────────────────────────────────────────────────────
  let precastLab = 0,
    precastMat = 0
  if (n(precastSF) > 0) {
    const tons = n(precastSF) / 80
    const sfPerDay = p(GT_RATES.precastLab.dbName, GT_RATES.precastLab.fallback)
    precastLab = (n(precastSF) / sfPerDay) * 8
    precastMat =
      tons * (n(precastRate) || p(GT_RATES.precastPerTon.dbName, GT_RATES.precastPerTon.fallback))
  }

  // ── Decomposed Granite ─────────────────────────────────────────────────────
  let dgLab = 0,
    dgMat = 0
  if (n(dgSF) > 0) {
    const tons = (n(dgSF) * n(dgDepth)) / 200
    const cement = dgCement === 'Yes'
    const baseHrs =
      dgMethod === 'Hand'
        ? (tons * 1.62) / 0.5 + (n(dgSF) / 1000) * 8 + tons
        : ((tons * 1.62) / 12) * 8 + (n(dgSF) / 1000) * 8 + tons
    dgLab = baseHrs + (cement ? tons * 1.25 : 0)
    dgMat =
      (tons * p(GT_RATES.dgPerTon.dbName, GT_RATES.dgPerTon.fallback) +
        (cement ? tons * p(GT_RATES.dgCementPerTon.dbName, GT_RATES.dgCementPerTon.fallback) : 0)) *
      1.1
  }

  // ── Gravel rows ────────────────────────────────────────────────────────────
  let gravelLab = 0,
    gravelMat = 0
  gravelRows.forEach(r => {
    if (!n(r.sf)) return
    const CY = (n(r.sf) * (n(r.depthIn) / 12)) / 27
    const excavLab = r.method === 'Machine' ? ((CY * 1.62) / 12) * 8 : ((CY * 1.62) / 4) * 8
    const fabricLab =
      n(r.sf) * p(GT_RATES.gravelFabricLab.dbName, GT_RATES.gravelFabricLab.fallback)
    gravelLab += excavLab + fabricLab
    const costPerCY = n(r.costPerCY) || 130
    gravelMat +=
      CY * costPerCY +
      n(r.sf) * p(GT_RATES.gravelFabricMat.dbName, GT_RATES.gravelFabricMat.fallback)
  })

  // ── Manual ─────────────────────────────────────────────────────────────────
  let manHrs = 0,
    manMat = 0,
    manSub = 0
  manualRows.forEach(r => {
    manHrs += n(r.hours)
    manMat += n(r.materials)
    manSub += n(r.subCost)
  })

  // ── Totals ─────────────────────────────────────────────────────────────────
  const baseHrs =
    mulchLab +
    plasticLab +
    metalLab +
    soilLab +
    sodLab +
    flagLab +
    precastLab +
    dgLab +
    gravelLab +
    manHrs
  const diffMod = 1 + n(difficulty) / 100
  const _preWalkHrs = baseHrs * diffMod + n(hoursAdj)
  const walkHrs = calcWalkAccessLabor(_preWalkHrs, state.distanceLF, { paceLfPerMin: _pace })
  const totalHrs = _preWalkHrs + walkHrs
  const manDays = totalHrs / 8
  totalMat =
    mulchMat +
    plasticMat +
    metalMat +
    soilMat +
    sodMat +
    flagMat +
    precastMat +
    dgMat +
    gravelMat +
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
    // section breakdowns for summary
    mulchLab,
    mulchMat,
    plasticLab,
    plasticMat,
    metalLab,
    metalMat,
    soilLab,
    soilMat,
    sodLab,
    sodMat,
    flagLab,
    flagMat,
    precastLab,
    precastMat,
    dgLab,
    dgMat,
    gravelLab,
    gravelMat,
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
      <span className="text-xs text-gray-700 w-40 shrink-0">{label}</span>
      {children}
      {note && <span className="text-xs text-gray-400 shrink-0">{note}</span>}
    </div>
  )
}

const DEFAULT_GRAVEL_ROWS = [
  { sf: '', method: 'Hand', costPerCY: '130', depthIn: '3' },
  { sf: '', method: 'Hand', costPerCY: '130', depthIn: '3' },
  { sf: '', method: 'Hand', costPerCY: '130', depthIn: '3' },
  { sf: '', method: 'Hand', costPerCY: '130', depthIn: '3' },
]
const DEFAULT_MANUAL_ROWS = [
  { label: 'Misc 1', hours: '', materials: '', subCost: '' },
  { label: 'Misc 2', hours: '', materials: '', subCost: '' },
  { label: 'Misc 3', hours: '', materials: '', subCost: '' },
  { label: 'Misc 4', hours: '', materials: '', subCost: '' },
]

// ── Main component ────────────────────────────────────────────────────────────
export default function GroundTreatmentsModule({ onSave, onBack, saving, initialData }) {
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

  // Re-fetch the merged labor+material rate map. Called on mount and after any
  // RateEditPopover save so the calc reflects edits.
  const refreshAllRates = useCallback(async () => {
    const [matRes, labRes] = await Promise.all([
      supabase.from('material_rates').select('name, unit_cost').eq('category', 'Ground Treatments'),
      supabase.from('labor_rates').select('name, rate').eq('category', 'Ground Treatments'),
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
  const [crewType, setCrewType] = useState(initialData?.crewType ?? 'Landscape')
  const [hoursAdj, setHoursAdj] = useState(initialData?.hoursAdj ?? '')
  const [mulchSF, setMulchSF] = useState(initialData?.mulchSF ?? '')
  const [mulchDepth, setMulchDepth] = useState(initialData?.mulchDepth ?? '2')
  const [plasticEdgingLF, setPlasticEdgingLF] = useState(initialData?.plasticEdgingLF ?? '')
  const [metalEdgingLF, setMetalEdgingLF] = useState(initialData?.metalEdgingLF ?? '')
  const [soilPrepSF, setSoilPrepSF] = useState(initialData?.soilPrepSF ?? '')
  const [sodSF, setSodSF] = useState(initialData?.sodSF ?? '')
  const [sodType, setSodType] = useState(initialData?.sodType ?? 'Marathon I/II')
  const [flagstoneSF, setFlagstoneSF] = useState(initialData?.flagstoneSF ?? '')
  const [flagstoneRate, setFlagstoneRate] = useState(initialData?.flagstoneRate ?? '')
  const [precastSF, setPrecastSF] = useState(initialData?.precastSF ?? '')
  const [precastRate, setPrecastRate] = useState(initialData?.precastRate ?? '')
  const [dgSF, setDgSF] = useState(initialData?.dgSF ?? '')
  const [dgDepth, setDgDepth] = useState(initialData?.dgDepth ?? '3.5')
  const [dgMethod, setDgMethod] = useState(initialData?.dgMethod ?? 'Machine')
  const [dgCement, setDgCement] = useState(initialData?.dgCement ?? 'Yes')
  const [gravelRows, setGravelRows] = useState(initialData?.gravelRows ?? DEFAULT_GRAVEL_ROWS)
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

  // Default stepper rates once prices load
  useEffect(() => {
    if (Object.keys(materialPrices).length === 0) return
    if (!initialData?.flagstoneRate && materialPrices[GT_RATES.flagstonePerTon.dbName]) {
      setFlagstoneRate(materialPrices[GT_RATES.flagstonePerTon.dbName].toString())
    }
    if (!initialData?.precastRate && materialPrices[GT_RATES.precastPerTon.dbName]) {
      setPrecastRate(materialPrices[GT_RATES.precastPerTon.dbName].toString())
    }
  }, [materialPrices])

  const state = {
    crewType,
    difficulty,
    hoursAdj,
    mulchSF,
    mulchDepth,
    plasticEdgingLF,
    metalEdgingLF,
    soilPrepSF,
    sodSF,
    sodType,
    flagstoneSF,
    flagstoneRate,
    precastSF,
    precastRate,
    dgSF,
    dgDepth,
    dgMethod,
    dgCement,
    gravelRows,
    manualRows,
    distanceLF,
  }
  const calcRaw = calcGroundTreatments(state, laborRatePerHour, materialPrices, gpmd, walkAccess)
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

  function updateGravel(i, field, val) {
    setGravelRows(rows => rows.map((r, idx) => (idx === i ? { ...r, [field]: val } : r)))
  }
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

      {/* ── Soil Prep ── */}
      <div>
        <SectionHeader title="Soil Prep" />
        <div className="space-y-0">
          <LabeledRow
            label="Soil Prep"
            note={
              n(soilPrepSF) > 0
                ? `$${(n(soilPrepSF) * p(GT_RATES.soilPrepMat.dbName, 0.1558)).toFixed(2)} mat`
                : null
            }
          >
            <NumInput
              value={soilPrepSF}
              onChange={setSoilPrepSF}
              placeholder="SF"
              className="w-28"
            />
            <span className="text-xs text-gray-400 inline-flex items-center gap-1">
              ${p(GT_RATES.soilPrepMat.dbName, 0.1558).toFixed(2)}/SF
              <RateEditPopover
                table="material_rates"
                name={GT_RATES.soilPrepMat.dbName}
                category="Ground Treatments"
                unitLabel="SF"
                currentValue={p(GT_RATES.soilPrepMat.dbName, GT_RATES.soilPrepMat.fallback)}
                onSaved={refreshAllRates}
              />
              <RateEditPopover
                table="labor_rates"
                name={GT_RATES.soilPrepLab.dbName}
                category="Ground Treatments"
                mode="coefficient"
                unitLabel="hrs/SF"
                currentValue={p(GT_RATES.soilPrepLab.dbName, GT_RATES.soilPrepLab.fallback)}
                onSaved={refreshAllRates}
              />
            </span>
          </LabeledRow>
        </div>
      </div>

      {/* ── Sod ── */}
      <div>
        <SectionHeader title="Sod" />
        <div className="space-y-0">
          <LabeledRow label="Sod">
            <NumInput value={sodSF} onChange={setSodSF} placeholder="SF" className="w-28" />
            <select
              className="input text-sm py-1.5 flex-1"
              value={sodType}
              onChange={e => setSodType(e.target.value)}
            >
              {SOD_TYPES.map(t => (
                <option key={t}>{t}</option>
              ))}
            </select>
            <span className="text-xs text-gray-400 inline-flex items-center gap-1">
              {sodType === 'St. Augustine' ? (
                <>
                  ${p(GT_RATES.sodStAugMat.dbName, 1.97).toFixed(2)}/SF
                  <RateEditPopover
                    table="material_rates"
                    name={GT_RATES.sodStAugMat.dbName}
                    category="Ground Treatments"
                    unitLabel="SF"
                    currentValue={p(GT_RATES.sodStAugMat.dbName, GT_RATES.sodStAugMat.fallback)}
                    onSaved={refreshAllRates}
                  />
                </>
              ) : (
                <>
                  ${p(GT_RATES.sodMarathonMat.dbName, 1.2).toFixed(2)}/SF
                  <RateEditPopover
                    table="material_rates"
                    name={GT_RATES.sodMarathonMat.dbName}
                    category="Ground Treatments"
                    unitLabel="SF"
                    currentValue={p(
                      GT_RATES.sodMarathonMat.dbName,
                      GT_RATES.sodMarathonMat.fallback
                    )}
                    onSaved={refreshAllRates}
                  />
                </>
              )}
              <RateEditPopover
                table="labor_rates"
                name={GT_RATES.sodLab.dbName}
                category="Ground Treatments"
                mode="coefficient"
                unitLabel="hrs/SF"
                currentValue={p(GT_RATES.sodLab.dbName, GT_RATES.sodLab.fallback)}
                onSaved={refreshAllRates}
              />
            </span>
            {n(sodSF) > 0 && (
              <span className="text-xs text-gray-400">
                $
                {(
                  n(sodSF) *
                  (sodType === 'St. Augustine'
                    ? p(GT_RATES.sodStAugMat.dbName, 1.97)
                    : p(GT_RATES.sodMarathonMat.dbName, 1.2))
                ).toFixed(2)}{' '}
                mat
              </span>
            )}
          </LabeledRow>
        </div>
      </div>

      {/* ── Mulch ── */}
      <div>
        <SectionHeader title="Mulch" />
        <div className="space-y-0">
          <LabeledRow label="Mulch">
            <NumInput value={mulchSF} onChange={setMulchSF} placeholder="SF" className="w-28" />
            <select
              className="input text-sm py-1.5 w-24"
              value={mulchDepth}
              onChange={e => setMulchDepth(e.target.value)}
            >
              {['1', '2', '3', '4'].map(d => (
                <option key={d} value={d}>
                  {d}" deep
                </option>
              ))}
            </select>
            <span className="text-xs text-gray-400 inline-flex items-center gap-1">
              ${p(GT_RATES.mulchPerCY.dbName, 25).toFixed(2)}/CY
              <RateEditPopover
                table="material_rates"
                name={GT_RATES.mulchPerCY.dbName}
                category="Ground Treatments"
                unitLabel="CY"
                currentValue={p(GT_RATES.mulchPerCY.dbName, GT_RATES.mulchPerCY.fallback)}
                onSaved={refreshAllRates}
              />
              · ${p(GT_RATES.mulchDelivery.dbName, 75).toFixed(2)} delivery
              <RateEditPopover
                table="material_rates"
                name={GT_RATES.mulchDelivery.dbName}
                category="Ground Treatments"
                unitLabel="flat"
                currentValue={p(GT_RATES.mulchDelivery.dbName, GT_RATES.mulchDelivery.fallback)}
                onSaved={refreshAllRates}
              />
            </span>
            {n(mulchSF) > 0 && (
              <span className="text-xs text-gray-400">
                {((n(mulchSF) * (n(mulchDepth) / 12)) / 27).toFixed(2)} CY
              </span>
            )}
          </LabeledRow>
        </div>
      </div>

      {/* ── Decomposed Granite ── */}
      <div>
        <SectionHeader title="Decomposed Granite (D.G.)" />
        <p className="text-xs text-gray-400 mb-2 inline-flex items-center flex-wrap gap-x-2">
          <span className="inline-flex items-center gap-1">
            DG ${p(GT_RATES.dgPerTon.dbName, 50).toFixed(2)}/ton
            <RateEditPopover
              table="material_rates"
              name={GT_RATES.dgPerTon.dbName}
              category="Ground Treatments"
              unitLabel="ton"
              currentValue={p(GT_RATES.dgPerTon.dbName, GT_RATES.dgPerTon.fallback)}
              onSaved={refreshAllRates}
            />
          </span>
          ·
          <span className="inline-flex items-center gap-1">
            Cement add ${p(GT_RATES.dgCementPerTon.dbName, 20).toFixed(2)}/ton
            <RateEditPopover
              table="material_rates"
              name={GT_RATES.dgCementPerTon.dbName}
              category="Ground Treatments"
              unitLabel="ton"
              currentValue={p(GT_RATES.dgCementPerTon.dbName, GT_RATES.dgCementPerTon.fallback)}
              onSaved={refreshAllRates}
            />
          </span>
        </p>
        <div className="grid grid-cols-2 gap-3 mb-2">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Area (SF)</label>
            <NumInput value={dgSF} onChange={setDgSF} />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Depth (Inches)</label>
            <NumInput value={dgDepth} onChange={setDgDepth} placeholder="3.5" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Method</label>
            <select
              className="input text-sm py-1.5"
              value={dgMethod}
              onChange={e => setDgMethod(e.target.value)}
            >
              {DG_METHODS.map(m => (
                <option key={m}>{m}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Add Cement Mixture?</label>
            <select
              className="input text-sm py-1.5"
              value={dgCement}
              onChange={e => setDgCement(e.target.value)}
            >
              <option value="Yes">Yes</option>
              <option value="No">No</option>
            </select>
          </div>
        </div>
        {n(dgSF) > 0 && (
          <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-xs text-gray-600 flex gap-6">
            <span>
              Tons: <strong>{((n(dgSF) * n(dgDepth)) / 200).toFixed(2)}</strong>
            </span>
            <span>
              Material: <strong>${calc.dgMat.toFixed(2)}</strong>
            </span>
            <span>
              Labor: <strong>{calc.dgLab.toFixed(2)} hrs</strong>
            </span>
          </div>
        )}
      </div>

      {/* ── Gravel ── */}
      <div>
        <SectionHeader title="Gravel" />
        <p className="text-xs text-gray-400 mb-2 inline-flex items-center flex-wrap gap-x-2">
          <span className="inline-flex items-center gap-1">
            Fabric ${p(GT_RATES.gravelFabricMat.dbName, 0.1).toFixed(2)}/SF mat
            <RateEditPopover
              table="material_rates"
              name={GT_RATES.gravelFabricMat.dbName}
              category="Ground Treatments"
              unitLabel="SF"
              currentValue={p(GT_RATES.gravelFabricMat.dbName, GT_RATES.gravelFabricMat.fallback)}
              onSaved={refreshAllRates}
            />
            · {p(GT_RATES.gravelFabricLab.dbName, 0.024)} hrs/SF labor
            <RateEditPopover
              table="labor_rates"
              name={GT_RATES.gravelFabricLab.dbName}
              category="Ground Treatments"
              mode="coefficient"
              unitLabel="hrs/SF"
              currentValue={p(GT_RATES.gravelFabricLab.dbName, GT_RATES.gravelFabricLab.fallback)}
              onSaved={refreshAllRates}
            />
          </span>
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 border-b border-gray-200">
                <th className="text-left pb-1 pr-1 font-medium w-16">#</th>
                <th className="text-left pb-1 pr-1 font-medium">SF</th>
                <th className="text-left pb-1 pr-1 font-medium">Method</th>
                <th className="text-left pb-1 pr-1 font-medium">$/CY</th>
                <th className="text-left pb-1 font-medium">Depth (in)</th>
              </tr>
            </thead>
            <tbody>
              {gravelRows.map((row, i) => {
                return (
                  <tr key={i} className="border-b border-gray-100">
                    <td className="py-1 pr-1 text-xs text-gray-500">#{i + 1}</td>
                    <td className="py-1 pr-1">
                      <NumInput value={row.sf} onChange={v => updateGravel(i, 'sf', v)} />
                    </td>
                    <td className="py-1 pr-1">
                      <select
                        className="input text-sm py-1.5"
                        value={row.method}
                        onChange={e => updateGravel(i, 'method', e.target.value)}
                      >
                        <option>Hand</option>
                        <option>Machine</option>
                      </select>
                    </td>
                    <td className="py-1 pr-1">
                      <NumInput
                        value={row.costPerCY}
                        onChange={v => updateGravel(i, 'costPerCY', v)}
                        placeholder="130"
                      />
                    </td>
                    <td className="py-1">
                      <NumInput
                        value={row.depthIn}
                        onChange={v => updateGravel(i, 'depthIn', v)}
                        placeholder="3"
                      />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {/* Show CY / material preview below table */}
          {gravelRows.some(r => n(r.sf) > 0) && (
            <div className="mt-1 flex gap-4 flex-wrap">
              {gravelRows.map((row, i) => {
                if (!n(row.sf)) return null
                const CY = (n(row.sf) * (n(row.depthIn) / 12)) / 27
                const mat =
                  CY * (n(row.costPerCY) || 130) +
                  n(row.sf) * p(GT_RATES.gravelFabricMat.dbName, 0.1)
                return (
                  <span key={i} className="text-xs text-gray-400">
                    #{i + 1}: {CY.toFixed(2)} CY · ${mat.toFixed(2)} mat
                  </span>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Edging ── */}
      <div>
        <SectionHeader title="Edging" />
        <div className="space-y-0">
          {/* Plastic Edging */}
          <LabeledRow
            label="Plastic Edging"
            note={
              n(plasticEdgingLF) > 0
                ? `$${(n(plasticEdgingLF) * p(GT_RATES.plasticEdgingMat.dbName, 1.2)).toFixed(2)} mat`
                : null
            }
          >
            <NumInput
              value={plasticEdgingLF}
              onChange={setPlasticEdgingLF}
              placeholder="LF"
              className="w-28"
            />
            <span className="text-xs text-gray-400 inline-flex items-center gap-1">
              ${p(GT_RATES.plasticEdgingMat.dbName, 1.2).toFixed(2)}/LF
              <RateEditPopover
                table="material_rates"
                name={GT_RATES.plasticEdgingMat.dbName}
                category="Ground Treatments"
                unitLabel="LF"
                currentValue={p(
                  GT_RATES.plasticEdgingMat.dbName,
                  GT_RATES.plasticEdgingMat.fallback
                )}
                onSaved={refreshAllRates}
              />
              <RateEditPopover
                table="labor_rates"
                name={GT_RATES.plasticEdgingLab.dbName}
                category="Ground Treatments"
                mode="coefficient"
                unitLabel="hrs/LF"
                currentValue={p(
                  GT_RATES.plasticEdgingLab.dbName,
                  GT_RATES.plasticEdgingLab.fallback
                )}
                onSaved={refreshAllRates}
              />
            </span>
          </LabeledRow>

          {/* Metal Edging */}
          <LabeledRow
            label="Metal Edging"
            note={
              n(metalEdgingLF) > 0
                ? `$${(n(metalEdgingLF) * p(GT_RATES.metalEdgingMat.dbName, 4.0)).toFixed(2)} mat`
                : null
            }
          >
            <NumInput
              value={metalEdgingLF}
              onChange={setMetalEdgingLF}
              placeholder="LF"
              className="w-28"
            />
            <span className="text-xs text-gray-400 inline-flex items-center gap-1">
              ${p(GT_RATES.metalEdgingMat.dbName, 4.0).toFixed(2)}/LF
              <RateEditPopover
                table="material_rates"
                name={GT_RATES.metalEdgingMat.dbName}
                category="Ground Treatments"
                unitLabel="LF"
                currentValue={p(GT_RATES.metalEdgingMat.dbName, GT_RATES.metalEdgingMat.fallback)}
                onSaved={refreshAllRates}
              />
              <RateEditPopover
                table="labor_rates"
                name={GT_RATES.metalEdgingLab.dbName}
                category="Ground Treatments"
                mode="coefficient"
                unitLabel="hrs/LF"
                currentValue={p(GT_RATES.metalEdgingLab.dbName, GT_RATES.metalEdgingLab.fallback)}
                onSaved={refreshAllRates}
              />
            </span>
          </LabeledRow>
        </div>
      </div>

      {/* ── Steppers ── */}
      <div>
        <SectionHeader title="Steppers" />
        <p className="text-xs text-gray-400 mb-2 inline-flex items-center flex-wrap gap-x-2">
          <span className="inline-flex items-center gap-1">
            Flagstone {p(GT_RATES.flagstoneLab.dbName, 35)} SF/day labor
            <RateEditPopover
              table="labor_rates"
              name={GT_RATES.flagstoneLab.dbName}
              category="Ground Treatments"
              mode="coefficient"
              unitLabel="SF/day"
              currentValue={p(GT_RATES.flagstoneLab.dbName, GT_RATES.flagstoneLab.fallback)}
              onSaved={refreshAllRates}
            />
          </span>
          ·
          <span className="inline-flex items-center gap-1">
            Precast {p(GT_RATES.precastLab.dbName, 50)} SF/day labor
            <RateEditPopover
              table="labor_rates"
              name={GT_RATES.precastLab.dbName}
              category="Ground Treatments"
              mode="coefficient"
              unitLabel="SF/day"
              currentValue={p(GT_RATES.precastLab.dbName, GT_RATES.precastLab.fallback)}
              onSaved={refreshAllRates}
            />
          </span>
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 border-b border-gray-200">
                <th className="text-left pb-1 pr-2 font-medium">Type</th>
                <th className="text-left pb-1 pr-2 font-medium">Area (SF)</th>
                <th className="text-left pb-1 pr-2 font-medium">$/Ton</th>
                <th className="text-right pb-1 pr-2 font-medium text-gray-400">Tons</th>
                <th className="text-right pb-1 font-medium text-gray-400">Material $</th>
              </tr>
            </thead>
            <tbody>
              {/* Flagstone */}
              <tr className="border-b border-gray-100">
                <td className="py-1 pr-2 text-xs text-gray-700">Flagstone Steppers</td>
                <td className="py-1 pr-2">
                  <NumInput value={flagstoneSF} onChange={setFlagstoneSF} />
                </td>
                <td className="py-1 pr-2">
                  <div className="flex items-center gap-1">
                    <div className="relative">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">
                        $
                      </span>
                      <input
                        type="number"
                        step="any"
                        className="input text-sm py-1.5 pl-5 w-24"
                        placeholder={p(GT_RATES.flagstonePerTon.dbName, 500).toString()}
                        value={flagstoneRate}
                        onChange={e => setFlagstoneRate(e.target.value)}
                      />
                    </div>
                    <RateEditPopover
                      table="material_rates"
                      name={GT_RATES.flagstonePerTon.dbName}
                      category="Ground Treatments"
                      unitLabel="ton"
                      currentValue={p(
                        GT_RATES.flagstonePerTon.dbName,
                        GT_RATES.flagstonePerTon.fallback
                      )}
                      onSaved={refreshAllRates}
                    />
                  </div>
                </td>
                <td className="py-1 text-right text-xs text-gray-400 pr-2">
                  {n(flagstoneSF) > 0 ? (n(flagstoneSF) / 80).toFixed(2) : '—'}
                </td>
                <td className="py-1 text-right text-xs text-gray-600">
                  {n(flagstoneSF) > 0 ? `$${calc.flagMat.toFixed(2)}` : '—'}
                </td>
              </tr>
              {/* Precast */}
              <tr className="border-b border-gray-100">
                <td className="py-1 pr-2 text-xs text-gray-700">Precast Steppers</td>
                <td className="py-1 pr-2">
                  <NumInput value={precastSF} onChange={setPrecastSF} />
                </td>
                <td className="py-1 pr-2">
                  <div className="flex items-center gap-1">
                    <div className="relative">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">
                        $
                      </span>
                      <input
                        type="number"
                        step="any"
                        className="input text-sm py-1.5 pl-5 w-24"
                        placeholder={p(GT_RATES.precastPerTon.dbName, 200).toString()}
                        value={precastRate}
                        onChange={e => setPrecastRate(e.target.value)}
                      />
                    </div>
                    <RateEditPopover
                      table="material_rates"
                      name={GT_RATES.precastPerTon.dbName}
                      category="Ground Treatments"
                      unitLabel="ton"
                      currentValue={p(
                        GT_RATES.precastPerTon.dbName,
                        GT_RATES.precastPerTon.fallback
                      )}
                      onSaved={refreshAllRates}
                    />
                  </div>
                </td>
                <td className="py-1 text-right text-xs text-gray-400 pr-2">
                  {n(precastSF) > 0 ? (n(precastSF) / 80).toFixed(2) : '—'}
                </td>
                <td className="py-1 text-right text-xs text-gray-600">
                  {n(precastSF) > 0 ? `$${calc.precastMat.toFixed(2)}` : '—'}
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
