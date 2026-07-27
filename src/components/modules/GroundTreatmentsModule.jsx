import WorkTypeChooser from './WorkTypeChooser'
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
  mulchLab: { dbName: 'Mulch - Labor Rate', fallback: 15 }, // CY/day spread rate (labor_rates)

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
  // Each stone (Flagstone / Precast) has ONE per-ton material key shared across
  // its Soil Set + Concrete Set lines, and a SEPARATE labor rate (SF/day) per
  // set. "Concrete Set" differs from "Soil Set" only by a (slower) labor rate —
  // no automatic concrete/mortar material is added (values TBD).
  flagstonePerTon: { dbName: 'Flagstone Steppers', fallback: 500.0 }, // $/ton default
  flagstoneSoilLab: { dbName: 'Flagstone Steppers - Soil Labor', fallback: 35 }, // SF/day
  flagstoneConcreteLab: { dbName: 'Flagstone Steppers - Concrete Labor', fallback: 25 }, // SF/day
  precastPerTon: { dbName: 'Precast Steppers', fallback: 200.0 }, // $/ton default
  precastSoilLab: { dbName: 'Precast Steppers - Soil Labor', fallback: 50 }, // SF/day
  precastConcreteLab: { dbName: 'Precast Steppers - Concrete Labor', fallback: 35 }, // SF/day

  // ── Decomposed Granite ─────────────────────────────────────────────────────
  dgPerTon: { dbName: 'Decomposed Granite', fallback: 50.0 }, // $/ton
  dgCementPerTon: { dbName: 'DG Cement Mix', fallback: 20.0 }, // $/ton add-on
  dgHandLab: { dbName: 'DG - Hand Labor Rate', fallback: 0.5 }, // CY/hr (labor_rates)
  dgMachineLab: { dbName: 'DG - Machine Labor Rate', fallback: 12 }, // CY/day (labor_rates)

  // ── Gravel ─────────────────────────────────────────────────────────────────
  gravelFabricMat: { dbName: 'Gravel Fabric', fallback: 0.1 }, // $/SF
  gravelFabricLab: { dbName: 'Gravel Fabric - Labor Rate', fallback: 0.024 }, // hrs/SF
  gravelMachineLab: { dbName: 'Gravel - Machine Labor Rate', fallback: 12 }, // CY/day (labor_rates)
  gravelHandLab: { dbName: 'Gravel - Hand Labor Rate', fallback: 4 }, // CY/day (labor_rates)
}

// Gravel material types — each drives its own $/CY (material_rates). Pricing TBD
// (all default 130) until real per-type prices are entered via RateEditPopover.
const GRAVEL_TYPES = [
  { label: 'Crushed Pea Gravel', dbName: 'Gravel - Crushed Pea Gravel', fallback: 130 },
  { label: '3/4" Crushed Gravel', dbName: 'Gravel - 3/4" Crushed Gravel', fallback: 130 },
  { label: 'Del Rio', dbName: 'Gravel - Del Rio', fallback: 130 },
  { label: 'Black River Rock 1" minus', dbName: 'Gravel - Black River Rock 1in minus', fallback: 130 },
  { label: 'Black River Rock 1"-2"', dbName: 'Gravel - Black River Rock 1in-2in', fallback: 130 },
  { label: 'Black River Rock 2" to 3"', dbName: 'Gravel - Black River Rock 2in-3in', fallback: 130 },
]

// Mulch product types (material_rates, $/CY). Type drives material cost only.
const MULCH_TYPES = [
  { label: 'Premium Mulch', dbName: 'Mulch - Premium', fallback: 20 },
  { label: 'Brown Shredded', dbName: 'Mulch - Brown Shredded', fallback: 20 },
  { label: 'Flower Bed Mulch', dbName: 'Mulch - Flower Bed', fallback: 28 },
  { label: 'Shredded Cedar / Gorilla Hair', dbName: 'Mulch - Shredded Cedar', fallback: 80 },
  { label: 'Forest Moss', dbName: 'Mulch - Forest Moss', fallback: 80 },
  { label: 'Black Dyed Chips', dbName: 'Mulch - Black Dyed Chips', fallback: 32 },
  { label: 'Brown Dyed Chips', dbName: 'Mulch - Brown Dyed Chips', fallback: 32 },
  { label: 'Red Dyed Chips', dbName: 'Mulch - Red Dyed Chips', fallback: 32 },
  { label: 'Playground Chips', dbName: 'Mulch - Playground Chips', fallback: 60 },
  { label: 'Walk On Bark', dbName: 'Mulch - Walk On Bark', fallback: 85 },
  { label: 'Small Bark Nugget', dbName: 'Mulch - Small Bark Nugget', fallback: 85 },
  { label: 'Medium Bark Nugget', dbName: 'Mulch - Medium Bark Nugget', fallback: 85 },
]

// D.G. product types (material_rates, per TON — matches the existing per-ton DG
// material calc). Default 'Decomposed Granite' keeps existing estimates unchanged.
const DG_TYPES = [
  { label: 'Decomposed Granite', dbName: 'Decomposed Granite', fallback: 50 }, // existing rate
  { label: 'Rock Dust - Grey', dbName: 'DG - Rock Dust Grey', fallback: 86 }, // placeholder ~$120/CY
]

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
  walkAccess = null,
  laborBurdenPct = DEFAULTS.laborBurdenPct
) {
  const _pace = parseFloat(walkAccess?.paceLfPerMin) || DEFAULT_WALK_ACCESS_PACE_LF_PER_MIN
  const {
    difficulty,
    hoursAdj,
    mulchRows,
    plasticEdgingLF,
    metalEdgingLF,
    soilPrepSF,
    sodSoilPrepSF,
    sodSF,
    sodType,
    flagstoneSoilSF,
    flagstoneConcreteSF,
    precastSoilSF,
    precastConcreteSF,
    dgRows,
    gravelRows,
    manualRows,
  } = state

  const p = (dbName, fallback) => mp[dbName] ?? fallback

  let totalMat = 0

  // ── Mulch (multi-row) ────────────────────────────────────────────────────────
  let mulchLab = 0,
    mulchMat = 0
  {
    const mulchCYPerDay = p(GT_RATES.mulchLab.dbName, GT_RATES.mulchLab.fallback)
    let anyMulch = false
    ;(mulchRows || []).forEach(r => {
      if (!(n(r.sf) > 0)) return
      anyMulch = true
      const CY = (n(r.sf) * (n(r.depth) / 12)) / 27
      const mt = MULCH_TYPES.find(t => t.label === r.type) || MULCH_TYPES[0]
      mulchMat += CY * p(mt.dbName, mt.fallback)
      mulchLab += (CY / mulchCYPerDay) * 8 + (n(r.sf) / 3200) * 8
      if (r.weedFabric === 'Yes') {
        mulchMat += n(r.sf) * p(GT_RATES.gravelFabricMat.dbName, GT_RATES.gravelFabricMat.fallback)
        mulchLab += n(r.sf) * p(GT_RATES.gravelFabricLab.dbName, GT_RATES.gravelFabricLab.fallback)
      }
    })
    // Flat delivery fee applied ONCE if any mulch row has area.
    if (anyMulch) {
      mulchMat += p(GT_RATES.mulchDelivery.dbName, GT_RATES.mulchDelivery.fallback)
    }
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
  // Sod bed prep — same rates as Planting Bed Prep, entered in the Sod section.
  const sodSoilLab =
    n(sodSoilPrepSF) * p(GT_RATES.soilPrepLab.dbName, GT_RATES.soilPrepLab.fallback)
  const sodSoilMat =
    n(sodSoilPrepSF) * p(GT_RATES.soilPrepMat.dbName, GT_RATES.soilPrepMat.fallback)

  // ── Sod ────────────────────────────────────────────────────────────────────
  const sodLab = n(sodSF) * p(GT_RATES.sodLab.dbName, GT_RATES.sodLab.fallback)
  const sodMat =
    n(sodSF) *
    (sodType === 'St. Augustine'
      ? p(GT_RATES.sodStAugMat.dbName, GT_RATES.sodStAugMat.fallback)
      : p(GT_RATES.sodMarathonMat.dbName, GT_RATES.sodMarathonMat.fallback))

  // ── Flagstone Steppers (Soil Set + Concrete Set) ────────────────────────────
  // Each set has its own labor rate (SF/day); material is tons*perTon for both,
  // where tons = SF/80. Concrete Set adds NO extra concrete/mortar material —
  // it only differs by a (slower) labor rate (values TBD, easy to extend later).
  let flagLab = 0,
    flagMat = 0
  {
    const perTon = p(GT_RATES.flagstonePerTon.dbName, GT_RATES.flagstonePerTon.fallback)
    const soilSfPerDay = p(GT_RATES.flagstoneSoilLab.dbName, GT_RATES.flagstoneSoilLab.fallback)
    const concSfPerDay = p(
      GT_RATES.flagstoneConcreteLab.dbName,
      GT_RATES.flagstoneConcreteLab.fallback
    )
    if (n(flagstoneSoilSF) > 0) {
      flagLab += (n(flagstoneSoilSF) / soilSfPerDay) * 8
      flagMat += (n(flagstoneSoilSF) / 80) * perTon
    }
    if (n(flagstoneConcreteSF) > 0) {
      flagLab += (n(flagstoneConcreteSF) / concSfPerDay) * 8
      flagMat += (n(flagstoneConcreteSF) / 80) * perTon
    }
  }

  // ── Precast Steppers (Soil Set + Concrete Set) ──────────────────────────────
  let precastLab = 0,
    precastMat = 0
  {
    const perTon = p(GT_RATES.precastPerTon.dbName, GT_RATES.precastPerTon.fallback)
    const soilSfPerDay = p(GT_RATES.precastSoilLab.dbName, GT_RATES.precastSoilLab.fallback)
    const concSfPerDay = p(GT_RATES.precastConcreteLab.dbName, GT_RATES.precastConcreteLab.fallback)
    if (n(precastSoilSF) > 0) {
      precastLab += (n(precastSoilSF) / soilSfPerDay) * 8
      precastMat += (n(precastSoilSF) / 80) * perTon
    }
    if (n(precastConcreteSF) > 0) {
      precastLab += (n(precastConcreteSF) / concSfPerDay) * 8
      precastMat += (n(precastConcreteSF) / 80) * perTon
    }
  }

  // ── Decomposed Granite (multi-row) ──────────────────────────────────────────
  let dgLab = 0,
    dgMat = 0
  {
    const dgHandRate = p(GT_RATES.dgHandLab.dbName, GT_RATES.dgHandLab.fallback)
    const dgMachineRate = p(GT_RATES.dgMachineLab.dbName, GT_RATES.dgMachineLab.fallback)
    ;(dgRows || []).forEach(r => {
      if (!(n(r.sf) > 0)) return
      const tons = (n(r.sf) * n(r.depth)) / 200
      const cement = r.cement === 'Yes'
      const dgt = DG_TYPES.find(t => t.label === r.type) || DG_TYPES[0]
      const baseHrs =
        r.method === 'Hand'
          ? (tons * 1.62) / dgHandRate + (n(r.sf) / 1000) * 8 + tons
          : ((tons * 1.62) / dgMachineRate) * 8 + (n(r.sf) / 1000) * 8 + tons
      dgLab += baseHrs + (cement ? tons * 1.25 : 0)
      dgMat +=
        (tons * p(dgt.dbName, dgt.fallback) +
          (cement
            ? tons * p(GT_RATES.dgCementPerTon.dbName, GT_RATES.dgCementPerTon.fallback)
            : 0)) *
        1.1
      if (r.weedFabric === 'Yes') {
        dgMat += n(r.sf) * p(GT_RATES.gravelFabricMat.dbName, GT_RATES.gravelFabricMat.fallback)
        dgLab += n(r.sf) * p(GT_RATES.gravelFabricLab.dbName, GT_RATES.gravelFabricLab.fallback)
      }
    })
  }

  // ── Gravel rows ────────────────────────────────────────────────────────────
  let gravelLab = 0,
    gravelMat = 0
  gravelRows.forEach(r => {
    if (!n(r.sf)) return
    const CY = (n(r.sf) * (n(r.depthIn) / 12)) / 27
    const machineRate = p(GT_RATES.gravelMachineLab.dbName, GT_RATES.gravelMachineLab.fallback)
    const handRate = p(GT_RATES.gravelHandLab.dbName, GT_RATES.gravelHandLab.fallback)
    const excavLab =
      r.method === 'Machine' ? ((CY * 1.62) / machineRate) * 8 : ((CY * 1.62) / handRate) * 8
    const fabricLab =
      n(r.sf) * p(GT_RATES.gravelFabricLab.dbName, GT_RATES.gravelFabricLab.fallback)
    gravelLab += excavLab + fabricLab
    const gtype = GRAVEL_TYPES.find(t => t.label === r.type) || GRAVEL_TYPES[0]
    const costPerCY = p(gtype.dbName, gtype.fallback)
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
    sodSoilLab +
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
    sodSoilMat +
    sodMat +
    flagMat +
    precastMat +
    dgMat +
    gravelMat +
    manMat
  const laborCost = totalHrs * lrph
  const burden = laborCost * (n(laborBurdenPct) || DEFAULTS.laborBurdenPct)
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
  { sf: '', method: 'Hand', type: 'Crushed Pea Gravel', depthIn: '3' },
  { sf: '', method: 'Hand', type: 'Crushed Pea Gravel', depthIn: '3' },
]
const DEFAULT_MULCH_ROWS = [
  { type: 'Premium Mulch', sf: '', depth: '2', weedFabric: 'No' },
  { type: 'Premium Mulch', sf: '', depth: '2', weedFabric: 'No' },
]
const DEFAULT_DG_ROWS = [
  { type: 'Decomposed Granite', sf: '', depth: '3.5', weedFabric: 'No', method: 'Machine', cement: 'No' },
  { type: 'Decomposed Granite', sf: '', depth: '3.5', weedFabric: 'No', method: 'Machine', cement: 'No' },
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
        .select('labor_rate_per_hour, labor_burden_pct, walk_access_pace_lf_per_min')
        .single()
        .then(({ data }) => {
          if (!data) return
          if (data.labor_rate_per_hour != null)
            setLaborRatePerHour(parseFloat(data.labor_rate_per_hour) || DEFAULTS.laborRatePerHour)
          if (data.labor_burden_pct != null)
            setLaborBurdenPct(parseFloat(data.labor_burden_pct))
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
  const [subType, setSubType] = useState(initialData?.subType ?? 'In-House')
  const [hoursAdj, setHoursAdj] = useState(initialData?.hoursAdj ?? '')
  // Mulch is now a multi-row table. Backward-compat: migrate a legacy single
  // mulch entry (mulchSF/mulchType/…) into the first row + one blank row.
  const [mulchRows, setMulchRows] = useState(
    initialData?.mulchRows ??
      (initialData?.mulchSF != null && initialData?.mulchSF !== ''
        ? [
            {
              type: initialData.mulchType || 'Premium Mulch',
              sf: initialData.mulchSF,
              depth: initialData.mulchDepth || '2',
              weedFabric: initialData.mulchWeedFabric || 'No',
            },
            { type: 'Premium Mulch', sf: '', depth: '2', weedFabric: 'No' },
          ]
        : DEFAULT_MULCH_ROWS)
  )
  const [plasticEdgingLF, setPlasticEdgingLF] = useState(initialData?.plasticEdgingLF ?? '')
  const [metalEdgingLF, setMetalEdgingLF] = useState(initialData?.metalEdgingLF ?? '')
  const [soilPrepSF, setSoilPrepSF] = useState(initialData?.soilPrepSF ?? '')
  const [sodSoilPrepSF, setSodSoilPrepSF] = useState(initialData?.sodSoilPrepSF ?? '')
  const [sodSF, setSodSF] = useState(initialData?.sodSF ?? '')
  const [sodType, setSodType] = useState(initialData?.sodType ?? 'Marathon I/II')
  const [flagstoneSoilSF, setFlagstoneSoilSF] = useState(initialData?.flagstoneSoilSF ?? '')
  const [flagstoneConcreteSF, setFlagstoneConcreteSF] = useState(
    initialData?.flagstoneConcreteSF ?? ''
  )
  const [precastSoilSF, setPrecastSoilSF] = useState(initialData?.precastSoilSF ?? '')
  const [precastConcreteSF, setPrecastConcreteSF] = useState(initialData?.precastConcreteSF ?? '')
  // D.G. is now a multi-row table. Backward-compat: migrate a legacy single DG
  // entry (dgSF/dgType/…) into the first row + one blank row.
  const [dgRows, setDgRows] = useState(
    initialData?.dgRows ??
      (initialData?.dgSF != null && initialData?.dgSF !== ''
        ? [
            {
              type: initialData.dgType || 'Decomposed Granite',
              sf: initialData.dgSF,
              depth: initialData.dgDepth || '3.5',
              weedFabric: initialData.dgWeedFabric || 'No',
              method: initialData.dgMethod || 'Machine',
              cement: initialData.dgCement || 'No',
            },
            {
              type: 'Decomposed Granite',
              sf: '',
              depth: '3.5',
              weedFabric: 'No',
              method: 'Machine',
              cement: 'No',
            },
          ]
        : DEFAULT_DG_ROWS)
  )
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

  const state = {
    crewType,
    subType,
    difficulty,
    hoursAdj,
    mulchRows,
    plasticEdgingLF,
    metalEdgingLF,
    soilPrepSF,
    sodSoilPrepSF,
    sodSF,
    sodType,
    flagstoneSoilSF,
    flagstoneConcreteSF,
    precastSoilSF,
    precastConcreteSF,
    dgRows,
    gravelRows,
    manualRows,
    distanceLF,
  }
  const calcRaw = calcGroundTreatments(
    state,
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

  const p = (dbName, fallback) => materialPrices[dbName] ?? fallback

  function updateGravel(i, field, val) {
    setGravelRows(rows => rows.map((r, idx) => (idx === i ? { ...r, [field]: val } : r)))
  }
  function updateMulch(i, field, val) {
    setMulchRows(rows => rows.map((r, idx) => (idx === i ? { ...r, [field]: val } : r)))
  }
  function updateDg(i, field, val) {
    setDgRows(rows => rows.map((r, idx) => (idx === i ? { ...r, [field]: val } : r)))
  }
  function updateManual(i, field, val) {
    setManualRows(rows => rows.map((r, idx) => (idx === i ? { ...r, [field]: val } : r)))
  }

  function handleSave() {
    onSave({
      notes,
      man_days: parseFloat(calc.manDays.toFixed(2)),
      material_cost: parseFloat(calc.totalMat.toFixed(2)),
      data: { ...state, walkAccess, laborRatePerHour, laborBurdenPct, gpmd, materialPrices, calc },
    })
  }

  return (
    <div className="space-y-5">
      {/* ── Sticky GPMD bar ── */}
      <div className="sticky top-0 z-20 -mx-6 px-6 pt-1 pb-1 bg-gray-900 shadow-lg">
        {/* GPMD summary bar */}
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

      {/* Settings — Job Site Conditions is In-House only (hidden on Sub tab) */}
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

      {/* ── Planting Bed Prep ── */}
      <div>
        <SectionHeader title="Planting Bed Prep" />
        <div className="space-y-0">
          <LabeledRow
            label="Till and Amend"
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
          <LabeledRow
            label="Soil Prep"
            note={
              n(sodSoilPrepSF) > 0
                ? `$${(n(sodSoilPrepSF) * p(GT_RATES.soilPrepMat.dbName, 0.1558)).toFixed(2)} mat`
                : null
            }
          >
            <NumInput
              value={sodSoilPrepSF}
              onChange={setSodSoilPrepSF}
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
        <p className="text-xs text-gray-400 mb-2 inline-flex items-center flex-wrap gap-x-2">
          <span className="inline-flex items-center gap-1">
            ${p(GT_RATES.mulchDelivery.dbName, 75).toFixed(2)} delivery
            <RateEditPopover
              table="material_rates"
              name={GT_RATES.mulchDelivery.dbName}
              category="Ground Treatments"
              unitLabel="flat"
              currentValue={p(GT_RATES.mulchDelivery.dbName, GT_RATES.mulchDelivery.fallback)}
              onSaved={refreshAllRates}
            />
          </span>
          ·
          <span className="inline-flex items-center gap-1">
            {p(GT_RATES.mulchLab.dbName, 15)} CY/day labor
            <RateEditPopover
              table="labor_rates"
              name={GT_RATES.mulchLab.dbName}
              category="Ground Treatments"
              mode="coefficient"
              unitLabel="CY/day"
              currentValue={p(GT_RATES.mulchLab.dbName, GT_RATES.mulchLab.fallback)}
              onSaved={refreshAllRates}
            />
          </span>
          ·
          <span className="inline-flex items-center gap-1">
            Weed fabric ${p(GT_RATES.gravelFabricMat.dbName, 0.1).toFixed(2)}/SF
            <RateEditPopover
              table="material_rates"
              name={GT_RATES.gravelFabricMat.dbName}
              category="Ground Treatments"
              unitLabel="SF"
              currentValue={p(GT_RATES.gravelFabricMat.dbName, GT_RATES.gravelFabricMat.fallback)}
              onSaved={refreshAllRates}
            />
            · {p(GT_RATES.gravelFabricLab.dbName, 0.024)} hrs/SF
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
                <th className="text-left pb-1 pr-1 font-medium">Type</th>
                <th className="text-left pb-1 pr-1 font-medium">Area (SF)</th>
                <th className="text-left pb-1 pr-1 font-medium">Depth (in)</th>
                <th className="text-left pb-1 font-medium">Weed Fabric</th>
              </tr>
            </thead>
            <tbody>
              {mulchRows.map((row, i) => {
                const mt = MULCH_TYPES.find(t => t.label === row.type) || MULCH_TYPES[0]
                const typeCost = p(mt.dbName, mt.fallback)
                return (
                  <tr key={i} className="border-b border-gray-100">
                    <td className="py-1 pr-1">
                      <div className="flex flex-col gap-1">
                        <select
                          className="input text-sm py-1.5"
                          value={row.type || MULCH_TYPES[0].label}
                          onChange={e => updateMulch(i, 'type', e.target.value)}
                        >
                          {MULCH_TYPES.map(t => (
                            <option key={t.label} value={t.label}>
                              {t.label}
                            </option>
                          ))}
                        </select>
                        <span className="text-xs text-gray-400 inline-flex items-center gap-1 whitespace-nowrap">
                          ${typeCost.toFixed(2)}/CY
                          <RateEditPopover
                            table="material_rates"
                            name={mt.dbName}
                            category="Ground Treatments"
                            unitLabel="CY"
                            currentValue={typeCost}
                            onSaved={refreshAllRates}
                          />
                        </span>
                      </div>
                    </td>
                    <td className="py-1 pr-1">
                      <NumInput value={row.sf} onChange={v => updateMulch(i, 'sf', v)} />
                    </td>
                    <td className="py-1 pr-1">
                      <select
                        className="input text-sm py-1.5"
                        value={row.depth}
                        onChange={e => updateMulch(i, 'depth', e.target.value)}
                      >
                        {['1', '2', '3', '4'].map(d => (
                          <option key={d} value={d}>
                            {d}" deep
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-1">
                      <div className="flex items-center gap-1">
                        <select
                          className="input text-sm py-1.5"
                          value={row.weedFabric}
                          onChange={e => updateMulch(i, 'weedFabric', e.target.value)}
                        >
                          <option value="No">No</option>
                          <option value="Yes">Yes</option>
                        </select>
                        {mulchRows.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setMulchRows(rows => rows.filter((_, idx) => idx !== i))}
                            className="text-gray-300 hover:text-red-500 text-sm px-1"
                            title="Remove line"
                          >
                            ×
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <button
            type="button"
            onClick={() =>
              setMulchRows(r => [
                ...r,
                { type: 'Premium Mulch', sf: '', depth: '2', weedFabric: 'No' },
              ])
            }
            className="mt-1 text-xs text-green-700 hover:text-green-900 font-medium"
          >
            + Add line
          </button>
          {mulchRows.some(r => n(r.sf) > 0) && (
            <div className="mt-1 flex gap-4 flex-wrap">
              {mulchRows.map((row, i) => {
                if (!n(row.sf)) return null
                const CY = (n(row.sf) * (n(row.depth) / 12)) / 27
                return (
                  <span key={i} className="text-xs text-gray-400">
                    #{i + 1}: {CY.toFixed(2)} CY
                  </span>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Decomposed Granite ── */}
      <div>
        <SectionHeader title="Decomposed Granite (D.G.)" />
        <p className="text-xs text-gray-400 mb-2 inline-flex items-center flex-wrap gap-x-2">
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
          ·
          <span className="inline-flex items-center gap-1">
            Hand {p(GT_RATES.dgHandLab.dbName, 0.5)} CY/hr labor
            <RateEditPopover
              table="labor_rates"
              name={GT_RATES.dgHandLab.dbName}
              category="Ground Treatments"
              mode="coefficient"
              unitLabel="CY/hr"
              currentValue={p(GT_RATES.dgHandLab.dbName, GT_RATES.dgHandLab.fallback)}
              onSaved={refreshAllRates}
            />
          </span>
          ·
          <span className="inline-flex items-center gap-1">
            Machine {p(GT_RATES.dgMachineLab.dbName, 12)} CY/day labor
            <RateEditPopover
              table="labor_rates"
              name={GT_RATES.dgMachineLab.dbName}
              category="Ground Treatments"
              mode="coefficient"
              unitLabel="CY/day"
              currentValue={p(GT_RATES.dgMachineLab.dbName, GT_RATES.dgMachineLab.fallback)}
              onSaved={refreshAllRates}
            />
          </span>
          ·
          <span className="inline-flex items-center gap-1">
            Weed fabric ${p(GT_RATES.gravelFabricMat.dbName, 0.1).toFixed(2)}/SF
            <RateEditPopover
              table="material_rates"
              name={GT_RATES.gravelFabricMat.dbName}
              category="Ground Treatments"
              unitLabel="SF"
              currentValue={p(GT_RATES.gravelFabricMat.dbName, GT_RATES.gravelFabricMat.fallback)}
              onSaved={refreshAllRates}
            />
            · {p(GT_RATES.gravelFabricLab.dbName, 0.024)} hrs/SF
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
                <th className="text-left pb-1 pr-1 font-medium">Type</th>
                <th className="text-left pb-1 pr-1 font-medium">Area (SF)</th>
                <th className="text-left pb-1 pr-1 font-medium">Depth (in)</th>
                <th className="text-left pb-1 pr-1 font-medium">Weed Fabric</th>
                <th className="text-left pb-1 pr-1 font-medium">Method</th>
                <th className="text-left pb-1 font-medium">Cement</th>
              </tr>
            </thead>
            <tbody>
              {dgRows.map((row, i) => {
                const dgt = DG_TYPES.find(t => t.label === row.type) || DG_TYPES[0]
                const typeCost = p(dgt.dbName, dgt.fallback)
                return (
                  <tr key={i} className="border-b border-gray-100">
                    <td className="py-1 pr-1">
                      <div className="flex flex-col gap-1">
                        <select
                          className="input text-sm py-1.5"
                          value={row.type || DG_TYPES[0].label}
                          onChange={e => updateDg(i, 'type', e.target.value)}
                        >
                          {DG_TYPES.map(t => (
                            <option key={t.label} value={t.label}>
                              {t.label}
                            </option>
                          ))}
                        </select>
                        <span className="text-xs text-gray-400 inline-flex items-center gap-1 whitespace-nowrap">
                          ${typeCost.toFixed(2)}/ton
                          <RateEditPopover
                            table="material_rates"
                            name={dgt.dbName}
                            category="Ground Treatments"
                            unitLabel="ton"
                            currentValue={typeCost}
                            onSaved={refreshAllRates}
                          />
                        </span>
                      </div>
                    </td>
                    <td className="py-1 pr-1">
                      <NumInput value={row.sf} onChange={v => updateDg(i, 'sf', v)} />
                    </td>
                    <td className="py-1 pr-1">
                      <NumInput
                        value={row.depth}
                        onChange={v => updateDg(i, 'depth', v)}
                        placeholder="3.5"
                      />
                    </td>
                    <td className="py-1 pr-1">
                      <select
                        className="input text-sm py-1.5"
                        value={row.weedFabric}
                        onChange={e => updateDg(i, 'weedFabric', e.target.value)}
                      >
                        <option value="No">No</option>
                        <option value="Yes">Yes</option>
                      </select>
                    </td>
                    <td className="py-1 pr-1">
                      <select
                        className="input text-sm py-1.5"
                        value={row.method}
                        onChange={e => updateDg(i, 'method', e.target.value)}
                      >
                        {DG_METHODS.map(m => (
                          <option key={m}>{m}</option>
                        ))}
                      </select>
                    </td>
                    <td className="py-1">
                      <div className="flex items-center gap-1">
                        <select
                          className="input text-sm py-1.5"
                          value={row.cement}
                          onChange={e => updateDg(i, 'cement', e.target.value)}
                          title="Add Cement Mixture"
                        >
                          <option value="No">No</option>
                          <option value="Yes">Yes</option>
                        </select>
                        {dgRows.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setDgRows(rows => rows.filter((_, idx) => idx !== i))}
                            className="text-gray-300 hover:text-red-500 text-sm px-1"
                            title="Remove line"
                          >
                            ×
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <button
            type="button"
            onClick={() =>
              setDgRows(r => [
                ...r,
                {
                  type: 'Decomposed Granite',
                  sf: '',
                  depth: '3.5',
                  weedFabric: 'No',
                  method: 'Machine',
                  cement: 'No',
                },
              ])
            }
            className="mt-1 text-xs text-green-700 hover:text-green-900 font-medium"
          >
            + Add line
          </button>
          {dgRows.some(r => n(r.sf) > 0) && (
            <div className="mt-1 flex gap-4 flex-wrap">
              {dgRows.map((row, i) => {
                if (!n(row.sf)) return null
                const tons = (n(row.sf) * n(row.depth)) / 200
                return (
                  <span key={i} className="text-xs text-gray-400">
                    #{i + 1}: {tons.toFixed(2)} tons
                  </span>
                )
              })}
            </div>
          )}
          {(n(calc.dgMat) > 0 || n(calc.dgLab) > 0) && (
            <div className="mt-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-xs text-gray-600 flex gap-6">
              <span>
                Material: <strong>${calc.dgMat.toFixed(2)}</strong>
              </span>
              <span>
                Labor: <strong>{calc.dgLab.toFixed(2)} hrs</strong>
              </span>
            </div>
          )}
        </div>
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
          ·
          <span className="inline-flex items-center gap-1">
            Machine excav {p(GT_RATES.gravelMachineLab.dbName, 12)} CY/day
            <RateEditPopover
              table="labor_rates"
              name={GT_RATES.gravelMachineLab.dbName}
              category="Ground Treatments"
              mode="coefficient"
              unitLabel="CY/day"
              currentValue={p(GT_RATES.gravelMachineLab.dbName, GT_RATES.gravelMachineLab.fallback)}
              onSaved={refreshAllRates}
            />
          </span>
          ·
          <span className="inline-flex items-center gap-1">
            Hand excav {p(GT_RATES.gravelHandLab.dbName, 4)} CY/day
            <RateEditPopover
              table="labor_rates"
              name={GT_RATES.gravelHandLab.dbName}
              category="Ground Treatments"
              mode="coefficient"
              unitLabel="CY/day"
              currentValue={p(GT_RATES.gravelHandLab.dbName, GT_RATES.gravelHandLab.fallback)}
              onSaved={refreshAllRates}
            />
          </span>
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 border-b border-gray-200">
                <th className="text-left pb-1 pr-1 font-medium">Type</th>
                <th className="text-left pb-1 pr-1 font-medium">SF</th>
                <th className="text-left pb-1 pr-1 font-medium">Method</th>
                <th className="text-left pb-1 pr-1 font-medium">$/CY</th>
                <th className="text-left pb-1 font-medium">Depth (in)</th>
              </tr>
            </thead>
            <tbody>
              {gravelRows.map((row, i) => {
                const gtype =
                  GRAVEL_TYPES.find(t => t.label === row.type) || GRAVEL_TYPES[0]
                const typeCost = p(gtype.dbName, gtype.fallback)
                return (
                  <tr key={i} className="border-b border-gray-100">
                    <td className="py-1 pr-1">
                      <select
                        className="input text-sm py-1.5"
                        value={row.type || GRAVEL_TYPES[0].label}
                        onChange={e => updateGravel(i, 'type', e.target.value)}
                      >
                        {GRAVEL_TYPES.map(t => (
                          <option key={t.label} value={t.label}>
                            {t.label}
                          </option>
                        ))}
                      </select>
                    </td>
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
                      <span className="text-xs text-gray-500 inline-flex items-center gap-1 whitespace-nowrap">
                        ${typeCost.toFixed(2)}/CY
                        <RateEditPopover
                          table="material_rates"
                          name={gtype.dbName}
                          category="Ground Treatments"
                          unitLabel="CY"
                          currentValue={typeCost}
                          onSaved={refreshAllRates}
                        />
                      </span>
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
                const gtype =
                  GRAVEL_TYPES.find(t => t.label === row.type) || GRAVEL_TYPES[0]
                const mat =
                  CY * p(gtype.dbName, gtype.fallback) +
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
        <p className="text-xs text-gray-400 mb-2">
          Each stone splits into a Soil Set and a Concrete Set line. "Concrete Set" differs only by a
          (slower) editable labor rate — no automatic concrete/mortar material is added (TBD).
          tons = SF / 80; material = tons × per-ton rate (shared per stone).
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 border-b border-gray-200">
                <th className="text-left pb-1 pr-2 font-medium">Line</th>
                <th className="text-left pb-1 pr-2 font-medium">Area (SF)</th>
                <th className="text-left pb-1 pr-2 font-medium">Labor</th>
                <th className="text-left pb-1 pr-2 font-medium">$/Ton</th>
                <th className="text-right pb-1 pr-2 font-medium text-gray-400">Tons</th>
                <th className="text-right pb-1 font-medium text-gray-400">Material $</th>
              </tr>
            </thead>
            <tbody>
              {[
                {
                  label: 'Flagstone — Soil Set',
                  sf: flagstoneSoilSF,
                  set: setFlagstoneSoilSF,
                  labRate: GT_RATES.flagstoneSoilLab,
                  matRate: GT_RATES.flagstonePerTon,
                },
                {
                  label: 'Flagstone — Concrete Set',
                  sf: flagstoneConcreteSF,
                  set: setFlagstoneConcreteSF,
                  labRate: GT_RATES.flagstoneConcreteLab,
                  matRate: GT_RATES.flagstonePerTon,
                },
                {
                  label: 'Precast — Soil Set',
                  sf: precastSoilSF,
                  set: setPrecastSoilSF,
                  labRate: GT_RATES.precastSoilLab,
                  matRate: GT_RATES.precastPerTon,
                },
                {
                  label: 'Precast — Concrete Set',
                  sf: precastConcreteSF,
                  set: setPrecastConcreteSF,
                  labRate: GT_RATES.precastConcreteLab,
                  matRate: GT_RATES.precastPerTon,
                },
              ].map((row, i) => {
                const sfPerDay = p(row.labRate.dbName, row.labRate.fallback)
                const perTon = p(row.matRate.dbName, row.matRate.fallback)
                const sfN = n(row.sf)
                const tons = sfN / 80
                const mat = tons * perTon
                const hrs = sfPerDay > 0 ? (sfN / sfPerDay) * 8 : 0
                return (
                  <tr key={i} className="border-b border-gray-100">
                    <td className="py-1 pr-2 text-xs text-gray-700 whitespace-nowrap">{row.label}</td>
                    <td className="py-1 pr-2">
                      <NumInput value={row.sf} onChange={row.set} />
                    </td>
                    <td className="py-1 pr-2">
                      <span className="text-xs text-gray-500 inline-flex items-center gap-1 whitespace-nowrap">
                        {sfPerDay} SF/day
                        <RateEditPopover
                          table="labor_rates"
                          name={row.labRate.dbName}
                          category="Ground Treatments"
                          mode="coefficient"
                          unitLabel="SF/day"
                          currentValue={sfPerDay}
                          onSaved={refreshAllRates}
                        />
                      </span>
                    </td>
                    <td className="py-1 pr-2">
                      <span className="text-xs text-gray-500 inline-flex items-center gap-1 whitespace-nowrap">
                        ${perTon.toFixed(2)}/ton
                        <RateEditPopover
                          table="material_rates"
                          name={row.matRate.dbName}
                          category="Ground Treatments"
                          unitLabel="ton"
                          currentValue={perTon}
                          onSaved={refreshAllRates}
                        />
                      </span>
                    </td>
                    <td className="py-1 text-right text-xs text-gray-400 pr-2">
                      {sfN > 0 ? tons.toFixed(2) : '—'}
                    </td>
                    <td className="py-1 text-right text-xs text-gray-600 whitespace-nowrap">
                      {sfN > 0 ? `$${mat.toFixed(2)} · ${hrs.toFixed(2)} hrs` : '—'}
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
