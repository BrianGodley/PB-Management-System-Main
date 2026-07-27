import WorkTypeChooser from './WorkTypeChooser'
// ─────────────────────────────────────────────────────────────────────────────
// ConcreteModule — Concrete paving estimator
//
// Rates are split across three tables (category='Concrete'):
//   labor_rates         → production rates (lr)  — SF/hr, LF/hr
//   material_rates      → material unit costs (mr) — per CY, per SF, etc.
//   subcontractor_rates → sub / equipment costs (sr) — pump, stamp, sand finish
//
// All three snapshots are saved in data so re-edits use rates from creation time.
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import GpmdBar from './GpmdBar'
import ModuleNotesField from './ModuleNotesField'
import RateEditPopover from '../RateEditPopover'
import { SubRateOverrideProvider } from '../SubRateOverrideContext.jsx'
import { fetchSalesTaxRate } from '../../lib/companyDefaults'
import { calcWalkAccessLabor, DEFAULT_WALK_ACCESS_PACE_LF_PER_MIN } from '../../lib/walkAccess'

// ── Rate tables (method-indexed — not in DB) ──────────────────────────────────

const BASE_RATES = {
  'Skid Steer Good': 10.0,
  'Skid Steer OK': 7.5,
  'Mini Skid Steer': 5.0,
  Wheelbarrow: 3.34,
  Hand: 2.5,
}

// Each base-install method maps to a labor_rates row so the inline calculator
// icon next to the method dropdown can edit the t/hr rate. Names must match
// the seed file.
const BASE_METHOD_LABOR_NAME = {
  'Skid Steer Good': 'Concrete - Base Skid Steer Good',
  'Skid Steer OK': 'Concrete - Base Skid Steer OK',
  'Mini Skid Steer': 'Concrete - Base Mini Skid Steer',
  Wheelbarrow: 'Concrete - Base Wheelbarrow',
  Hand: 'Concrete - Base Hand',
}

const METHODS = Object.keys(BASE_RATES)
const FINISH_TYPES = [
  'Broom Finish',
  'Sand Finish',
  'Salt Finish',
  'Stamped',
  'Exposed Aggregate',
  'Seeded Aggregate',
]
const SEALER_TYPES = ['Natural', 'Wet-Look']

// In-House pour+finish is priced by job-size tier — each tier has its own
// SF/hr labour rate (editable via labor_rates, category 'Concrete').
const INSTALL_TIERS = [
  { key: 's100_300', label: '100–300 SF', rateName: 'Concrete - Install 100-300', def: 6.5 },
  { key: 's300_600', label: '300–600 SF', rateName: 'Concrete - Install 300-600', def: 12 },
  { key: 's600_1000', label: '600–1000 SF', rateName: 'Concrete - Install 600-1000', def: 20 },
  { key: 's1000_2000', label: '1000–2000 SF', rateName: 'Concrete - Install 1000-2000', def: 24 },
  { key: 's2000plus', label: '2000+ SF', rateName: 'Concrete - Install 2000+', def: 28 },
]

// ── Hardcoded fallbacks (mirror seed values in each table) ───────────────────
const R = {
  // Labor production rates (labor_rates)
  concreteSFPerHr: 23,
  rebarSFPerHr: 60,
  formLFPerHr: 18,
  sleeveLFPerHr: 10,
  sealerNaturalSFPerHr: 200,
  sealerWetSFPerHr: 120,
  vaporBarrierSFPerHr: 15,
  // Forming complexity: % of labor added per point of the 0–100 input.
  complexityPctPerUnit: 1,
  // Material unit costs (material_rates)
  concretePerCY: 185,
  rebarSFPrice: 0.8625,
  formMaterialPerLF: 1.73,
  sleevePer10LF: 4.6,
  colorCostPerCY: 28.75,
  sealerNatural5g: 150,
  sealerWet5g: 190,
  vaporBarrierPerSF: 0.22,
  costBase: 7.5,
  // Sub / equipment costs (subcontractor_rates)
  pumpFeeFlat: 316.25,
  pumpFeePerCY: 9.2,
  sandFinishPer400SF: 207,
  stampSubFlat: 800,
  stampSubPerCY: 120,
  // Non-editable constants
  sealerSFPerGal: 70,
  crewDaySF: 650,
  laborBurdenPct: 0.29,
  gpmd: 425,
  commissionRate: 0.12,
}

// ── Calculation engine ────────────────────────────────────────────────────────

const n = v => parseFloat(v) || 0

function calcConcrete(
  state,
  laborRatePerHour = 35,
  lr = {},
  mr = {},
  sr = {},
  gpmd = R.gpmd,
  walkAccess = null,
  laborBurdenPct = R.laborBurdenPct
) {
  // Subcontractor rates: a one-off adjustment saved on THIS estimate
  // (state.rateOverrides) takes precedence over the master rate.
  sr = { ...(sr || {}) }
  Object.entries(state.rateOverrides || {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '' && Number.isFinite(Number(v))) sr[k] = Number(v)
  })
  const _pace = parseFloat(walkAccess?.paceLfPerMin) || DEFAULT_WALK_ACCESS_PACE_LF_PER_MIN
  const lrph = n(laborRatePerHour) || 35

  // ── Labor production rates (labor_rates) ─────────────────────────────────
  const concreteSFPerHr = lr['Concrete - Pour & Finish'] ?? R.concreteSFPerHr
  const rebarSFPerHr = lr['Concrete - Rebar 24" OC'] ?? R.rebarSFPerHr
  const formLFPerHr = lr['Concrete - Form Setting'] ?? R.formLFPerHr
  const sleeveLFPerHr = lr['Concrete - Sleeves'] ?? R.sleeveLFPerHr
  const sealerNaturalSFPerHr = lr['Concrete - Sealer Natural'] ?? R.sealerNaturalSFPerHr
  const sealerWetSFPerHr = lr['Concrete - Sealer Wet-Look'] ?? R.sealerWetSFPerHr
  const vaporBarrierSFPerHr = lr['Concrete - Vapor Barrier'] ?? R.vaporBarrierSFPerHr
  const complexityPctPerUnit =
    lr['Concrete - Forming Complexity % Per Unit'] ?? R.complexityPctPerUnit
  // Finish add-on labor coefficients (SF/hr) — editable via labor_rates.
  const sandFinishSFPerHr = lr['Concrete - Sand Finish SF/hr'] ?? 100
  const saltFinishSFPerHr = lr['Concrete - Salt Finish SF/hr'] ?? 25
  const exposedAggSFPerHr = lr['Concrete - Exposed Aggregate SF/hr'] ?? 50
  const seededAggSFPerHr = lr['Concrete - Seeded Aggregate SF/hr'] ?? 40

  // ── Material unit costs (material_rates) ─────────────────────────────────
  const concretePerCY = mr['Concrete - Per CY'] ?? R.concretePerCY
  const rebarSFPrice = mr['Concrete - Rebar Price SF'] ?? R.rebarSFPrice
  const formMaterialPerLF = mr['Concrete - Form Lumber LF'] ?? R.formMaterialPerLF
  const sleevePer10LF = mr['Concrete - Sleeve Per 10LF'] ?? R.sleevePer10LF
  const colorCostPerCY = mr['Concrete - Color Per CY'] ?? R.colorCostPerCY
  const sealerNatural5g = mr['Concrete - Sealer Natural 5gal'] ?? R.sealerNatural5g
  const sealerWet5g = mr['Concrete - Sealer Wet 5gal'] ?? R.sealerWet5g
  const vaporBarrierPerSF = mr['Concrete - Vapor Barrier SF'] ?? R.vaporBarrierPerSF
  const costBase = mr['Concrete - Import Base'] ?? R.costBase

  // ── Sub / equipment costs (subcontractor_rates) ──────────────────────────
  const pumpFeeFlat = sr['Concrete - Pump Flat Fee'] ?? R.pumpFeeFlat
  const pumpFeePerCY = sr['Concrete - Pump Per CY'] ?? R.pumpFeePerCY
  const sandFinishPer400SF = sr['Concrete - Sand Finish 400SF'] ?? R.sandFinishPer400SF
  const stampSubFlat = sr['Concrete - Stamp Sub Flat'] ?? R.stampSubFlat
  const stampSubPerCY = sr['Concrete - Stamp Sub Per CY'] ?? R.stampSubPerCY

  const diffPct = n(state.difficulty) / 100
  const layoutHrs = n(state.layoutHrs)
  const distanceLF = n(state.distanceLF)
  const pctBackyard = n(state.pctBackyard) / 100
  const finishType = state.finishType || 'Broom Finish'
  const colorYes = state.colorYes
  const pumpYes = state.pumpYes
  const isIH = state.finishingType !== 'Sub'
  const vaporSF = n(state.vaporBarrierSF)
  const sealerSF = n(state.sealerSF)
  const sealerType = state.sealerType || 'Natural'
  const hoursAdj = n(state.hoursAdj)

  // ── Base ────────────────────────────────────────────────────────────────
  let baseHrsTot = 0,
    baseMatTot = 0
  const baseCalc = (state.baseRows || []).map(r => {
    const sf = n(r.sf),
      depth = n(r.depth) || 2
    if (!sf) return { tons: 0, hrs: 0, mat: 0 }
    const tons = (sf / 200) * depth
    // Per-method base rate — DB value via labor_rates['Concrete - Base ...']
    // takes precedence over the hardcoded fallback in BASE_RATES.
    const rate = lr[BASE_METHOD_LABOR_NAME[r.method]] ?? BASE_RATES[r.method] ?? 10.0
    const hrs = tons / rate
    const mat = tons * costBase
    baseHrsTot += hrs
    baseMatTot += mat
    return { tons, hrs, mat, rate }
  })

  // ── Concrete install ─────────────────────────────────────────────────────
  // In-House install SF is entered per job-size tier; each tier has its own
  // SF/hr rate. Total SF drives the material (CY) + finish add-ons.
  const installTiers = state.installTiers || {}
  const installSF = INSTALL_TIERS.reduce((s, t) => s + n(installTiers[t.key]), 0)
  const depthIn = n(state.depthIn) || 4
  const rebarSF = n(state.rebarSF)
  const formLF = n(state.formLF)
  const sleeveLF = n(state.sleeveLF)

  const concreteCY = installSF > 0 ? ((depthIn / 12) * installSF) / 27 : 0
  const installHrs = INSTALL_TIERS.reduce((s, t) => {
    const sf = n(installTiers[t.key])
    if (!sf) return s
    const rate = lr[t.rateName] ?? t.def
    return s + (rate > 0 ? sf / rate : 0)
  }, 0)
  const concreteMat = concreteCY * concretePerCY

  const rebarHrs = rebarSF > 0 ? rebarSF / rebarSFPerHr : 0
  const rebarMat = rebarSF * rebarSFPrice

  const formHrs = formLF > 0 ? formLF / formLFPerHr : 0
  const formMat = formLF * formMaterialPerLF

  const sleeveUnits = sleeveLF > 0 ? Math.ceil(sleeveLF / 10) : 0
  const sleeveHrs = sleeveLF / sleeveLFPerHr
  const sleeveMat = sleeveUnits * sleevePer10LF

  // ── Travel + backyard ────────────────────────────────────────────────────
  // Old per-module travelHrs retired — now handled by unified walk-access penalty below.
  const travelHrs = 0
  const backyardHrs = pctBackyard > 0 ? 0.2 * pctBackyard * installHrs : 0

  // ── Forming complexity ───────────────────────────────────────────────────
  const preComplexHrs =
    layoutHrs + travelHrs + backyardHrs + baseHrsTot + installHrs + rebarHrs + formHrs + sleeveHrs

  // ── Finish add-ons ───────────────────────────────────────────────────────
  let finishHrs = 0,
    finishSubCost = 0,
    colorMat = 0
  if (finishType === 'Sand Finish') {
    finishHrs = sandFinishSFPerHr > 0 ? installSF / sandFinishSFPerHr : 0
    if (isIH) finishSubCost = Math.ceil(installSF / 400) * sandFinishPer400SF
  } else if (finishType === 'Salt Finish') {
    finishHrs = saltFinishSFPerHr > 0 ? installSF / saltFinishSFPerHr : 0
  } else if (finishType === 'Exposed Aggregate') {
    finishHrs = exposedAggSFPerHr > 0 ? installSF / exposedAggSFPerHr : 0
  } else if (finishType === 'Seeded Aggregate') {
    finishHrs = seededAggSFPerHr > 0 ? installSF / seededAggSFPerHr : 0
  } else if (finishType === 'Stamped') {
    finishSubCost = isIH ? stampSubFlat : concreteCY * stampSubPerCY
  }
  if (colorYes && concreteCY > 0) {
    colorMat = Math.ceil(concreteCY) * colorCostPerCY
  }

  // ── Pump ────────────────────────────────────────────────────────────────
  // Auto-included whenever any 300+ SF install tier has SF (In-House). The
  // pumpYes toggle was removed from the UI; pump is now driven by job size.
  const pumpAuto =
    n(installTiers.s300_600) +
      n(installTiers.s600_1000) +
      n(installTiers.s1000_2000) +
      n(installTiers.s2000plus) >
    0
  const pumpMat = pumpAuto && concreteCY > 0 ? pumpFeeFlat + pumpFeePerCY * Math.ceil(concreteCY) : 0

  // ── Vapor barrier ────────────────────────────────────────────────────────
  const vaporHrs = vaporSF > 0 ? vaporSF / vaporBarrierSFPerHr : 0
  const vaporMat = vaporSF * vaporBarrierPerSF

  // ── Sealer ───────────────────────────────────────────────────────────────
  let sealerHrs = 0,
    sealerMat = 0
  if (sealerSF > 0) {
    const sealerGals = Math.ceil(sealerSF / R.sealerSFPerGal)
    const price5g = sealerType === 'Natural' ? sealerNatural5g : sealerWet5g
    sealerMat = sealerGals * (price5g / 5)
    const sealSFPerHr = sealerType === 'Natural' ? sealerNaturalSFPerHr : sealerWetSFPerHr
    sealerHrs = sealerSF / sealSFPerHr
  }

  // ── Manual ───────────────────────────────────────────────────────────────
  let manHrs = 0,
    manMat = 0,
    manSub = 0
  ;(state.manualRows || []).forEach(r => {
    manHrs += n(r.hours)
    manMat += n(r.materials)
    manSub += n(r.subCost)
  })

  // ── Totals ───────────────────────────────────────────────────────────────
  // ── Forming complexity — a 1-to-1% labor modifier. Each point of the
  //    0–100 input adds complexityPctPerUnit % (default 1%) to EVERY labor
  //    hour, so 100 points ⇒ +100% ⇒ the job's labor doubles.
  const baseLaborHrs = preComplexHrs + finishHrs + vaporHrs + sealerHrs + manHrs
  const complexityHrs =
    (baseLaborHrs * n(state.formingComplexity) * complexityPctPerUnit) / 100
  const preAdjHrs = baseLaborHrs + complexityHrs
  const diffHrs = preAdjHrs * diffPct
  const _preWalkHrs = preAdjHrs + diffHrs + hoursAdj
  const walkHrs = calcWalkAccessLabor(_preWalkHrs, distanceLF, { paceLfPerMin: _pace })
  const totalHrs = _preWalkHrs + walkHrs
  const manDays = totalHrs / 8

  const totalMat =
    baseMatTot +
    concreteMat +
    rebarMat +
    formMat +
    sleeveMat +
    colorMat +
    pumpMat +
    vaporMat +
    sealerMat +
    manMat
  const laborCost = totalHrs * lrph
  const burden = laborCost * (n(laborBurdenPct) || R.laborBurdenPct)
  const gp = manDays * gpmd
  const commission = gp * R.commissionRate
  const subCost = finishSubCost + manSub
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
    concreteCY,
    baseCalc,
    layoutHrs,
    travelHrs,
    backyardHrs,
    complexityHrs,
    complexityPctPerUnit,
    installHrs,
    rebarHrs,
    formHrs,
    sleeveHrs,
    finishHrs,
    vaporHrs,
    sealerHrs,
    baseMatTot,
    concreteMat,
    rebarMat,
    formMat,
    sleeveMat,
    colorMat,
    pumpMat,
    vaporMat,
    sealerMat,
    finishSubCost,
    // Resolved rates — exposed so the inline calculator icons can show + edit them
    concreteSFPerHr,
    rebarSFPerHr,
    formLFPerHr,
    sleeveLFPerHr,
    sealerNaturalSFPerHr,
    sealerWetSFPerHr,
    vaporBarrierSFPerHr,
    concretePerCY,
    rebarSFPrice,
    formMaterialPerLF,
    sleevePer10LF,
    colorCostPerCY,
    sealerNatural5g,
    sealerWet5g,
    vaporBarrierPerSF,
    costBase,
    pumpFeeFlat,
    pumpFeePerCY,
    sandFinishPer400SF,
    stampSubFlat,
    stampSubPerCY,
    sandFinishSFPerHr,
    saltFinishSFPerHr,
    exposedAggSFPerHr,
    seededAggSFPerHr,
    pumpAuto,
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

function NumInput({ value, onChange, placeholder = '0', className = '', step = 'any', min, max }) {
  // When a `max` is supplied, hard-cap the value so the user cannot enter a
  // number higher than it. The HTML5 `max` attribute alone does NOT block
  // typing — it only fails form validation — so we clamp in onChange too.
  // Used by e.g. Forming Complexity, which caps at 100 (+100% labor max).
  const handleChange = e => {
    let v = e.target.value
    if (max != null && v !== '') {
      const parsed = parseFloat(v)
      if (Number.isFinite(parsed) && parsed > parseFloat(max)) v = String(max)
    }
    onChange(v)
  }
  return (
    <input
      type="number"
      step={step}
      min={min}
      max={max}
      className={`input text-sm py-1.5 ${className}`}
      placeholder={placeholder}
      value={value}
      onChange={handleChange}
    />
  )
}

// ── Default state ─────────────────────────────────────────────────────────────

const DEFAULT_BASE_ROWS = [
  { label: 'Area 1', method: 'Skid Steer Good', sf: '', depth: '2' },
  { label: 'Area 2', method: 'Skid Steer Good', sf: '', depth: '2' },
  { label: 'Area 3', method: 'Skid Steer Good', sf: '', depth: '2' },
]

const DEFAULT_MANUAL_ROWS = [
  { label: 'Misc 1', hours: '', materials: '', subCost: '' },
  { label: 'Misc 2', hours: '', materials: '', subCost: '' },
  { label: 'Misc 3', hours: '', materials: '', subCost: '' },
  { label: 'Misc 4', hours: '', materials: '', subCost: '' },
]

// ── Main component ────────────────────────────────────────────────────────────

export default function ConcreteModule({ onSave, onBack, saving, initialData }) {
  const [laborRatePerHour, setLaborRatePerHour] = useState(initialData?.laborRatePerHour ?? 35)
  const [laborBurdenPct, setLaborBurdenPct] = useState(initialData?.laborBurdenPct ?? R.laborBurdenPct)

  // Free-text notes for this module — Sam writes auto-generated
  // takeoffs here via create_estimate_from_takeoff, and the user can
  // overwrite / append their own.
  const [notes, setNotes] = useState(initialData?.notes ?? '')
  const [walkAccess] = useState(
    initialData?.walkAccess ?? {
      paceLfPerMin: DEFAULT_WALK_ACCESS_PACE_LF_PER_MIN,
    }
  )
  // Rate snapshots keyed by name → rate value (restored from saved data if re-editing)
  const [laborRates, setLaborRates] = useState(initialData?.laborRates ?? {})
  const [materialRates, setMaterialRates] = useState(initialData?.materialRates ?? {})
  const [subRates, setSubRates] = useState(initialData?.subRates ?? {})
  // One-off subcontractor rates for this estimate only (undefined clears one).
  const [rateOverrides, setRateOverrides] = useState(initialData?.rateOverrides ?? {})
  const setOverride = (name, value) =>
    setRateOverrides(p => {
      const next = { ...(p || {}) }
      if (value === undefined || value === null || value === '') delete next[name]
      else next[name] = Number(value)
      return next
    })

  // Fetch company labor rate per hour
  useEffect(() => {
    if (initialData?.laborRatePerHour) return
    supabase
      .from('company_settings')
      .select('labor_rate_per_hour, labor_burden_pct, walk_access_pace_lf_per_min')
      .single()
      .then(({ data }) => {
        if (data?.labor_rate_per_hour != null) setLaborRatePerHour(parseFloat(data.labor_rate_per_hour) || 35)
        if (data?.labor_burden_pct != null) setLaborBurdenPct(parseFloat(data.labor_burden_pct))
      })
  }, [])

  // Re-fetch all three rate tables. Called once on mount and again whenever
  // the user saves an edit from a RateEditPopover so the calc picks up the
  // change without a page reload.
  const refreshAllRates = useCallback(async () => {
    const [lrRes, mrRes, srRes] = await Promise.all([
      supabase.from('labor_rates').select('name, rate').eq('category', 'Concrete'),
      supabase.from('material_rates').select('name, unit_cost').eq('category', 'Concrete'),
      supabase.from('subcontractor_rates').select('company_name, rate').eq('category', 'Concrete'),
    ])
    if (lrRes.data) {
      const m = {}
      lrRes.data.forEach(r => {
        m[r.name] = r.rate
      })
      setLaborRates(m)
    }
    if (mrRes.data) {
      const m = {}
      mrRes.data.forEach(r => {
        m[r.name] = r.unit_cost
      })
      setMaterialRates(m)
    }
    if (srRes.data) {
      const m = {}
      srRes.data.forEach(r => {
        m[r.company_name] = r.rate
      })
      setSubRates(m)
    }
  }, [])

  // Fetch all three rate tables (skip if re-editing — use saved snapshots)
  useEffect(() => {
    const hasLr = initialData?.laborRates && Object.keys(initialData.laborRates).length > 0
    const hasMr = initialData?.materialRates && Object.keys(initialData.materialRates).length > 0
    const hasSr = initialData?.subRates && Object.keys(initialData.subRates).length > 0
    if (hasLr && hasMr && hasSr) return
    refreshAllRates()
  }, [refreshAllRates])

  // Settings
  const [difficulty, setDifficulty] = useState(initialData?.difficulty ?? '')
  const [crewType, setCrewType] = useState(initialData?.crewType ?? 'Masonry')
  const [subType, setSubType] = useState(initialData?.subType ?? 'In-House')
  const [layoutHrs, setLayoutHrs] = useState(initialData?.layoutHrs ?? '')
  const [distanceLF, setDistanceLF] = useState(initialData?.distanceLF ?? '')
  const [pctBackyard, setPctBackyard] = useState(initialData?.pctBackyard ?? '')
  const [formingComplexity, setFormingComplexity] = useState(initialData?.formingComplexity ?? '')
  const [finishingType, setFinishingType] = useState(initialData?.finishingType ?? 'IH')
  const [hoursAdj, setHoursAdj] = useState(initialData?.hoursAdj ?? '')

  // Install
  const [installTiers, setInstallTiers] = useState(initialData?.installTiers ?? {})
  const [depthIn, setDepthIn] = useState(initialData?.depthIn ?? '4')
  const [rebarSF, setRebarSF] = useState(initialData?.rebarSF ?? '')
  const [formLF, setFormLF] = useState(initialData?.formLF ?? '')
  const [sleeveLF, setSleeveLF] = useState(initialData?.sleeveLF ?? '')

  // Options
  const [finishType, setFinishType] = useState(initialData?.finishType ?? 'Broom Finish')
  const [colorYes, setColorYes] = useState(initialData?.colorYes ?? false)
  const [pumpYes, setPumpYes] = useState(initialData?.pumpYes ?? false)
  const [vaporBarrierSF, setVaporBarrierSF] = useState(initialData?.vaporBarrierSF ?? '')
  const [sealerSF, setSealerSF] = useState(initialData?.sealerSF ?? '')
  const [sealerType, setSealerType] = useState(initialData?.sealerType ?? 'Natural')

  // Multi-row sections
  const [baseRows, setBaseRows] = useState(initialData?.baseRows ?? DEFAULT_BASE_ROWS)
  const [manualRows, setManualRows] = useState(initialData?.manualRows ?? DEFAULT_MANUAL_ROWS)

  // ── Independent Subcontractor-tab state ──────────────────────────────────
  // The Sub tab is its own calculator (mirrors the demo / Utilities modules).
  // Each field defaults to the same blank value as its in-house counterpart.
  // The site-conditions modifiers (difficulty/layout/distance/backyard/
  // forming complexity/hours adj) are In-House only and are NOT mirrored.
  const [subInstallSF, setSubInstallSF] = useState(initialData?.subInstallSF ?? '')
  const [subDepthIn, setSubDepthIn] = useState(initialData?.subDepthIn ?? '4')
  const [subRebarSF, setSubRebarSF] = useState(initialData?.subRebarSF ?? '')
  const [subFormLF, setSubFormLF] = useState(initialData?.subFormLF ?? '')
  const [subSleeveLF, setSubSleeveLF] = useState(initialData?.subSleeveLF ?? '')
  const [subFinishType, setSubFinishType] = useState(initialData?.subFinishType ?? 'Broom Finish')
  const [subColorYes, setSubColorYes] = useState(initialData?.subColorYes ?? false)
  const [subPumpYes, setSubPumpYes] = useState(initialData?.subPumpYes ?? false)
  const [subVaporBarrierSF, setSubVaporBarrierSF] = useState(initialData?.subVaporBarrierSF ?? '')
  const [subSealerSF, setSubSealerSF] = useState(initialData?.subSealerSF ?? '')
  const [subSealerType, setSubSealerType] = useState(initialData?.subSealerType ?? 'Natural')
  const [subBaseRows, setSubBaseRows] = useState(initialData?.subBaseRows ?? DEFAULT_BASE_ROWS)
  const [subManualRows, setSubManualRows] = useState(
    initialData?.subManualRows ?? DEFAULT_MANUAL_ROWS
  )

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
    rateOverrides,
    crewType,
    subType,
    difficulty,
    layoutHrs,
    distanceLF,
    pctBackyard,
    formingComplexity,
    finishingType,
    hoursAdj,
    installTiers,
    depthIn,
    rebarSF,
    formLF,
    sleeveLF,
    finishType,
    colorYes,
    pumpYes,
    vaporBarrierSF,
    sealerSF,
    sealerType,
    baseRows,
    manualRows,
  }
  const gpmd = initialData?.gpmd ?? R.gpmd
  const subGpMarkupRate = initialData?.subGpMarkupRate ?? 0.2

  // Active-tab wiring: the mirrored field sections edit whichever set matches
  // the current tab, so In-House and Subcontractor are fully independent
  // calculators. Modifiers (difficulty/layout/etc.) are In-House only.
  const isSub = subType === 'Subcontractor'
  const installTiersTotal = INSTALL_TIERS.reduce((s, t) => s + n(installTiers[t.key]), 0)
  // In-House install is entered per tier (below); activeInstallSF is the total
  // used for the CY/material readout. Sub uses its single whole-slab SF field.
  const activeInstallSF = isSub ? subInstallSF : installTiersTotal
  const setActiveInstallSF = isSub ? setSubInstallSF : () => {}
  const activeDepthIn = isSub ? subDepthIn : depthIn
  const setActiveDepthIn = isSub ? setSubDepthIn : setDepthIn
  const activeRebarSF = isSub ? subRebarSF : rebarSF
  const setActiveRebarSF = isSub ? setSubRebarSF : setRebarSF
  const activeFormLF = isSub ? subFormLF : formLF
  const setActiveFormLF = isSub ? setSubFormLF : setFormLF
  const activeSleeveLF = isSub ? subSleeveLF : sleeveLF
  const setActiveSleeveLF = isSub ? setSubSleeveLF : setSleeveLF
  const activeFinishType = isSub ? subFinishType : finishType
  const setActiveFinishType = isSub ? setSubFinishType : setFinishType
  const activeColorYes = isSub ? subColorYes : colorYes
  const setActiveColorYes = isSub ? setSubColorYes : setColorYes
  const activePumpYes = isSub ? subPumpYes : pumpYes
  const setActivePumpYes = isSub ? setSubPumpYes : setPumpYes
  const activeVaporBarrierSF = isSub ? subVaporBarrierSF : vaporBarrierSF
  const setActiveVaporBarrierSF = isSub ? setSubVaporBarrierSF : setVaporBarrierSF
  const activeSealerSF = isSub ? subSealerSF : sealerSF
  const setActiveSealerSF = isSub ? setSubSealerSF : setSealerSF
  const activeSealerType = isSub ? subSealerType : sealerType
  const setActiveSealerType = isSub ? setSubSealerType : setSealerType
  const activeBaseRows = isSub ? subBaseRows : baseRows
  const setActiveBaseRows = isSub ? setSubBaseRows : setBaseRows
  const activeManualRows = isSub ? subManualRows : manualRows
  const setActiveManualRows = isSub ? setSubManualRows : setManualRows

  // Concrete volume for the ACTIVE tab (drives color/pump display + sub calc).
  const _activeDepth = n(activeDepthIn) || 4
  const activeConcreteCY =
    n(activeInstallSF) > 0 ? ((_activeDepth / 12) * n(activeInstallSF)) / 27 : 0

  // In-house calc is unchanged — it reads only the in-house state fields.
  const inHouse = calcConcrete(
    state,
    laborRatePerHour,
    laborRates,
    materialRates,
    subRates,
    gpmd,
    walkAccess,
    laborBurdenPct
  )

  // ── Sub-side cost — a single fully-loaded subcontractor cost figure.
  // Concrete install is a flat $/SF (covers finish); the add-ons reuse the
  // exact same per-unit rate lookups as the in-house calc but book
  // (material$ + labor-hours × labor rate) as a sub COST. Nothing here adds
  // to the module's in-house manDays / totalHrs / totalMat / laborCost.
  const subSlabRate = subRates['Concrete Sub - Per SF'] ?? 12
  // Sub-side vapor barrier + sealer are flat $/SF (no SF/hr labor component).
  const subVaporBarrierRate = subRates['Concrete Sub - Vapor Barrier Per SF'] ?? 1
  const subSealerRate = subRates['Concrete Sub - Sealer Per SF'] ?? 3
  const lrph = n(laborRatePerHour) || 35
  // Resolved add-on rates (identical on both tabs — sourced from rate maps).
  const {
    rebarSFPerHr,
    rebarSFPrice,
    formLFPerHr,
    formMaterialPerLF,
    sleeveLFPerHr,
    sleevePer10LF,
    colorCostPerCY,
    pumpFeeFlat,
    pumpFeePerCY,
    vaporBarrierSFPerHr,
    vaporBarrierPerSF,
    sealerNaturalSFPerHr,
    sealerWetSFPerHr,
    sealerNatural5g,
    sealerWet5g,
    costBase,
  } = inHouse
  const _subDepth = n(subDepthIn) || 4
  const subConcreteCY =
    n(subInstallSF) > 0 ? ((_subDepth / 12) * n(subInstallSF)) / 27 : 0
  let subSideCost = 0
  // Concrete install — flat $/SF (finish folded in, so subFinishType ignored).
  // No Base Install or Form Edging on the sub side (removed by request).
  subSideCost += n(subInstallSF) * subSlabRate
  // Rebar
  if (n(subRebarSF) > 0) {
    subSideCost += n(subRebarSF) * rebarSFPrice + (n(subRebarSF) / rebarSFPerHr) * lrph
  }
  // Sleeves
  if (n(subSleeveLF) > 0) {
    const units = Math.ceil(n(subSleeveLF) / 10)
    subSideCost += units * sleevePer10LF + (n(subSleeveLF) / sleeveLFPerHr) * lrph
  }
  // Color hardener
  if (subColorYes && subConcreteCY > 0) {
    subSideCost += Math.ceil(subConcreteCY) * colorCostPerCY
  }
  // Pump
  if (subPumpYes && subConcreteCY > 0) {
    subSideCost += pumpFeeFlat + pumpFeePerCY * Math.ceil(subConcreteCY)
  }
  // Vapor barrier — flat $/SF (no SF/hr labor).
  if (n(subVaporBarrierSF) > 0) {
    subSideCost += n(subVaporBarrierSF) * subVaporBarrierRate
  }
  // Sealer — flat $/SF (no SF/hr labor, type-independent).
  if (n(subSealerSF) > 0) {
    subSideCost += n(subSealerSF) * subSealerRate
  }
  // Sub manual rows
  ;(subManualRows || []).forEach(r => {
    subSideCost += n(r.subCost)
  })

  // ── Combine: in-house calc + sub-side cost. GP stays in-house; sub cost
  // earns its own markup (subGp); commission applies to both GP pools.
  const _subCost = inHouse.subCost + subSideCost
  const _subGp = _subCost * subGpMarkupRate
  const _gp = inHouse.gp
  const _commission = (_gp + _subGp) * R.commissionRate
  const _price =
    inHouse.totalMat + inHouse.laborCost + inHouse.burden + _gp + _subCost + _subGp + _commission
  const calcRaw = {
    ...inHouse,
    subCost: _subCost,
    subGp: _subGp,
    gp: _gp,
    commission: _commission,
    price: _price,
  }

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

  function updateBaseRow(i, field, val) {
    setActiveBaseRows(rows => rows.map((r, idx) => (idx === i ? { ...r, [field]: val } : r)))
  }
  function updateManual(i, field, val) {
    setActiveManualRows(rows => rows.map((r, idx) => (idx === i ? { ...r, [field]: val } : r)))
  }

  function handleSave() {
    onSave({
      notes,
      man_days: parseFloat(calc.manDays.toFixed(2)),
      material_cost: parseFloat(calc.totalMat.toFixed(2)),
      data: {
        ...state,
        // Independent Subcontractor-tab fields
        subType,
        subInstallSF,
        subDepthIn,
        subRebarSF,
        subFormLF,
        subSleeveLF,
        subFinishType,
        subColorYes,
        subPumpYes,
        subVaporBarrierSF,
        subSealerSF,
        subSealerType,
        subBaseRows,
        subManualRows,
        walkAccess,
        laborRatePerHour,
        gpmd,
        laborRates, // ← production rate snapshot
        materialRates, // ← material cost snapshot
        subRates, // ← sub/equipment cost snapshot
        calc,
      },
    })
  }

  const fmt2 = v =>
    `$${n(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  return (
    <SubRateOverrideProvider overrides={rateOverrides} setOverride={setOverride}>
    <div className="space-y-5">
      {/* ── Sticky GPMD bar ── */}
      <div className="sticky top-0 z-20 -mx-6 px-6 pt-1 pb-1 bg-gray-900 shadow-lg">
        {/* GPMD summary bar */}
        <GpmdBar
          variant={isSub ? 'sub' : 'inhouse'}
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

      {/* ── Global Settings — In-House tab only (Sub tab has no modifiers) ── */}
      {!isSub && (
      <div>
        <SectionHeader title="Job Site Conditions" />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-gray-500 block mb-1">Difficulty Add (%)</label>
            <NumInput value={difficulty} onChange={setDifficulty} placeholder="0" />
          </div>
          <div>
            <label
              className="text-xs text-gray-500 block mb-1"
              title="Average Distance from Truck to Work Area"
            >
              Truck → Work Area (Avg LF)
            </label>
            <NumInput value={distanceLF} onChange={setDistanceLF} placeholder="0" />
            {calc.walkHrs > 0 && (
              <p className="text-[10px] text-gray-500 italic lowercase mt-0.5">
                +{calc.walkHrs.toFixed(2)} hrs walk-access
              </p>
            )}
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Layout Time (hrs)</label>
            <NumInput value={layoutHrs} onChange={setLayoutHrs} placeholder="0" />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">% of Paving in Backyard</label>
            <NumInput value={pctBackyard} onChange={setPctBackyard} placeholder="0" max="100" />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1 inline-flex items-center gap-1 flex-wrap">
              Forming Complexity (0–100)
              <span className="text-gray-400">— +{calc.complexityPctPerUnit}% labor / point</span>
              <RateEditPopover
                table="labor_rates"
                name="Concrete - Forming Complexity % Per Unit"
                category="Concrete"
                mode="coefficient"
                unitLabel="%/pt"
                currentValue={calc.complexityPctPerUnit}
                onSaved={refreshAllRates}
              />
            </label>
            <NumInput
              value={formingComplexity}
              onChange={setFormingComplexity}
              placeholder="0"
              max="100"
            />
            {calc.complexityHrs > 0 && (
              <p className="text-[10px] text-gray-500 italic mt-0.5">
                +{calc.complexityHrs.toFixed(2)} hrs added
              </p>
            )}
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Hrs Adjustment</label>
            <NumInput
              value={hoursAdj}
              onChange={setHoursAdj}
              placeholder="0"
              min="-999"
              step="0.5"
            />
          </div>
        </div>
      </div>
      )}

      {/* ── Base Install — In-House only ── */}
      {!isSub && (
      <div>
        <SectionHeader title="Base Install" />
        <p className="text-xs text-gray-400 mb-1 inline-flex items-center gap-1">
          Base material ${calc.costBase}/ton
          <RateEditPopover
            table="material_rates"
            name="Concrete - Import Base"
            category="Concrete"
            unitLabel="ton"
            currentValue={calc.costBase}
            onSaved={refreshAllRates}
          />
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 border-b border-gray-200">
                <th className="text-left pb-1 pr-2 font-medium">Area</th>
                <th className="text-left pb-1 pr-2 font-medium">Method</th>
                <th className="text-left pb-1 pr-2 font-medium">Sq Ft</th>
                <th className="text-left pb-1 pr-2 font-medium">Depth (in)</th>
                <th className="text-right pb-1 font-medium text-gray-400">Hrs</th>
              </tr>
            </thead>
            <tbody>
              {activeBaseRows.map((row, i) => {
                const _sf = n(row.sf),
                  _depth = n(row.depth) || 2
                const _tons = _sf > 0 ? (_sf / 200) * _depth : 0
                const methodRate =
                  laborRates[BASE_METHOD_LABOR_NAME[row.method]] ?? BASE_RATES[row.method] ?? 10.0
                const c = {
                  hrs: _tons > 0 ? _tons / methodRate : 0,
                  mat: _tons * (calc.costBase ?? R.costBase),
                }
                return (
                  <tr key={i} className="border-b border-gray-100">
                    <td className="py-1 pr-2">
                      <input
                        className="input text-sm py-1"
                        value={row.label}
                        onChange={e => updateBaseRow(i, 'label', e.target.value)}
                      />
                    </td>
                    <td className="py-1 pr-2">
                      <div className="flex items-center gap-1">
                        <select
                          className="input text-sm py-1 flex-1 min-w-0"
                          value={row.method}
                          onChange={e => updateBaseRow(i, 'method', e.target.value)}
                        >
                          {METHODS.map(m => (
                            <option key={m}>{m}</option>
                          ))}
                        </select>
                        <RateEditPopover
                          table="labor_rates"
                          name={BASE_METHOD_LABOR_NAME[row.method]}
                          category="Concrete"
                          mode="coefficient"
                          unitLabel="t/hr"
                          currentValue={methodRate}
                          onSaved={refreshAllRates}
                        />
                      </div>
                    </td>
                    <td className="py-1 pr-2">
                      <NumInput value={row.sf} onChange={v => updateBaseRow(i, 'sf', v)} />
                    </td>
                    <td className="py-1 pr-2">
                      <NumInput
                        value={row.depth}
                        onChange={v => updateBaseRow(i, 'depth', v)}
                        placeholder="2"
                      />
                    </td>
                    <td className="py-1 text-right text-gray-500 text-xs">
                      {c.hrs > 0 ? c.hrs.toFixed(2) : '—'}
                      {c.mat > 0 && <p className="text-gray-400">{fmt2(c.mat)}</p>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
      )}

      {/* ── Concrete Install ── */}
      <div>
        <SectionHeader title="Concrete Install" />
        <div className="grid grid-cols-2 gap-3 items-end">
          <div className={!isSub ? 'col-span-2' : undefined}>
            <label className="text-xs text-gray-500 block mb-1 inline-flex items-center gap-1 flex-wrap">
              Installation (Sq Ft)
              {isSub ? (
                <span className="text-gray-400 inline-flex items-center gap-1">
                  — ${subSlabRate}/SF all-in
                  <RateEditPopover
                    table="subcontractor_rates"
                    name="Concrete Sub - Per SF"
                    category="Concrete"
                    unitLabel="/SF"
                    currentValue={subSlabRate}
                    onSaved={refreshAllRates}
                  />
                </span>
              ) : (
                <span className="text-gray-400 inline-flex items-center gap-1">
                  — ${calc.concretePerCY}/CY
                  <RateEditPopover
                    table="material_rates"
                    name="Concrete - Per CY"
                    category="Concrete"
                    unitLabel="CY"
                    currentValue={calc.concretePerCY}
                    onSaved={refreshAllRates}
                  />
                </span>
              )}
            </label>
            {isSub ? (
              <NumInput
                value={activeInstallSF}
                onChange={v => {
                  setActiveInstallSF(v)
                  if (!activeRebarSF) setActiveRebarSF(v)
                }}
              />
            ) : (
              <div className="space-y-1">
                {INSTALL_TIERS.map(t => {
                  const rate = laborRates[t.rateName] ?? t.def
                  const is300plus = t.key !== 's100_300'
                  const hasSF = n(installTiers[t.key]) > 0
                  return (
                    <div key={t.key} className="flex items-center gap-2">
                      <span className="text-[11px] text-gray-500 w-24 shrink-0">{t.label}</span>
                      <div className="flex-1 min-w-0">
                        <NumInput
                          value={installTiers[t.key] ?? ''}
                          onChange={v => setInstallTiers({ ...installTiers, [t.key]: v })}
                          placeholder="0 SF"
                        />
                      </div>
                      {is300plus && hasSF && (
                        <span className="text-[10px] text-green-600 shrink-0 whitespace-nowrap">
                          pump incl.
                        </span>
                      )}
                      <span className="text-[11px] text-gray-400 inline-flex items-center gap-1 shrink-0 whitespace-nowrap">
                        {rate} SF/hr
                        <RateEditPopover
                          table="labor_rates"
                          name={t.rateName}
                          category="Concrete"
                          mode="coefficient"
                          unitLabel="SF/hr"
                          currentValue={rate}
                          onSaved={refreshAllRates}
                        />
                      </span>
                    </div>
                  )
                })}
                <div className="pt-1 text-[11px] text-gray-400 inline-flex items-center gap-1 flex-wrap">
                  Pump (auto 300+): ${calc.pumpFeeFlat} flat
                  <RateEditPopover
                    table="subcontractor_rates"
                    name="Concrete - Pump Flat Fee"
                    category="Concrete"
                    unitLabel="flat"
                    currentValue={calc.pumpFeeFlat}
                    onSaved={refreshAllRates}
                  />
                  + ${calc.pumpFeePerCY}/CY
                  <RateEditPopover
                    table="subcontractor_rates"
                    name="Concrete - Pump Per CY"
                    category="Concrete"
                    unitLabel="CY"
                    currentValue={calc.pumpFeePerCY}
                    onSaved={refreshAllRates}
                  />
                </div>
              </div>
            )}
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Depth (inches)</label>
            <NumInput value={activeDepthIn} onChange={setActiveDepthIn} placeholder="4" />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1 inline-flex items-center gap-1">
              Rebar 24" OC (Sq Ft)
              <span className="text-gray-400">
                — {calc.rebarSFPerHr} SF/hr · ${calc.rebarSFPrice}/SF
              </span>
              <RateEditPopover
                table="labor_rates"
                name='Concrete - Rebar 24" OC'
                category="Concrete"
                mode="coefficient"
                unitLabel="SF/hr"
                currentValue={calc.rebarSFPerHr}
                onSaved={refreshAllRates}
              />
              <RateEditPopover
                table="material_rates"
                name="Concrete - Rebar Price SF"
                category="Concrete"
                unitLabel="SF"
                currentValue={calc.rebarSFPrice}
                onSaved={refreshAllRates}
              />
            </label>
            <NumInput value={activeRebarSF} onChange={setActiveRebarSF} />
          </div>
          {!isSub && (
          <div>
            <label className="text-xs text-gray-500 block mb-1 inline-flex items-center gap-1">
              Form Edging (Lin Ft)
              <span className="text-gray-400">
                — {calc.formLFPerHr} LF/hr · ${calc.formMaterialPerLF}/LF
              </span>
              <RateEditPopover
                table="labor_rates"
                name="Concrete - Form Setting"
                category="Concrete"
                mode="coefficient"
                unitLabel="LF/hr"
                currentValue={calc.formLFPerHr}
                onSaved={refreshAllRates}
              />
              <RateEditPopover
                table="material_rates"
                name="Concrete - Form Lumber LF"
                category="Concrete"
                unitLabel="LF"
                currentValue={calc.formMaterialPerLF}
                onSaved={refreshAllRates}
              />
            </label>
            <NumInput value={activeFormLF} onChange={setActiveFormLF} />
          </div>
          )}
          <div>
            <label className="text-xs text-gray-500 block mb-1 inline-flex items-center gap-1">
              3" Sleeves (Lin Ft)
              <span className="text-gray-400">
                — {calc.sleeveLFPerHr} LF/hr · ${calc.sleevePer10LF}/10LF
              </span>
              <RateEditPopover
                table="labor_rates"
                name="Concrete - Sleeves"
                category="Concrete"
                mode="coefficient"
                unitLabel="LF/hr"
                currentValue={calc.sleeveLFPerHr}
                onSaved={refreshAllRates}
              />
              <RateEditPopover
                table="material_rates"
                name="Concrete - Sleeve Per 10LF"
                category="Concrete"
                unitLabel="10LF"
                currentValue={calc.sleevePer10LF}
                onSaved={refreshAllRates}
              />
            </label>
            <NumInput value={activeSleeveLF} onChange={setActiveSleeveLF} />
          </div>
          {activeConcreteCY > 0 && (
            <div className="flex items-end pb-1.5">
              <p className="text-xs text-gray-400">
                ≈{' '}
                <span className="font-semibold text-gray-600">
                  {activeConcreteCY.toFixed(2)} CY
                </span>{' '}
                concrete
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── Finish Options ── */}
      <div>
        <SectionHeader title="Finish Options" />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-gray-500 block mb-1 inline-flex items-center gap-1 flex-wrap">
              Finish Type
              {isSub && (
                <span className="text-gray-400">— folded into $/SF</span>
              )}
              {!isSub && activeFinishType === 'Sand Finish' && (
                <span className="text-gray-400 inline-flex items-center gap-1 flex-wrap">
                  — {calc.sandFinishSFPerHr} SF/hr
                  <RateEditPopover
                    table="labor_rates"
                    name="Concrete - Sand Finish SF/hr"
                    category="Concrete"
                    mode="coefficient"
                    unitLabel="SF/hr"
                    currentValue={calc.sandFinishSFPerHr}
                    onSaved={refreshAllRates}
                  />
                  · sand sub ${calc.sandFinishPer400SF}/400SF
                  <RateEditPopover
                    table="subcontractor_rates"
                    name="Concrete - Sand Finish 400SF"
                    category="Concrete"
                    unitLabel="400SF"
                    currentValue={calc.sandFinishPer400SF}
                    onSaved={refreshAllRates}
                  />
                </span>
              )}
              {!isSub && activeFinishType === 'Salt Finish' && (
                <span className="text-gray-400 inline-flex items-center gap-1">
                  — {calc.saltFinishSFPerHr} SF/hr
                  <RateEditPopover
                    table="labor_rates"
                    name="Concrete - Salt Finish SF/hr"
                    category="Concrete"
                    mode="coefficient"
                    unitLabel="SF/hr"
                    currentValue={calc.saltFinishSFPerHr}
                    onSaved={refreshAllRates}
                  />
                </span>
              )}
              {!isSub && activeFinishType === 'Exposed Aggregate' && (
                <span className="text-gray-400 inline-flex items-center gap-1">
                  — {calc.exposedAggSFPerHr} SF/hr
                  <RateEditPopover
                    table="labor_rates"
                    name="Concrete - Exposed Aggregate SF/hr"
                    category="Concrete"
                    mode="coefficient"
                    unitLabel="SF/hr"
                    currentValue={calc.exposedAggSFPerHr}
                    onSaved={refreshAllRates}
                  />
                </span>
              )}
              {!isSub && activeFinishType === 'Seeded Aggregate' && (
                <span className="text-gray-400 inline-flex items-center gap-1">
                  — {calc.seededAggSFPerHr} SF/hr
                  <RateEditPopover
                    table="labor_rates"
                    name="Concrete - Seeded Aggregate SF/hr"
                    category="Concrete"
                    mode="coefficient"
                    unitLabel="SF/hr"
                    currentValue={calc.seededAggSFPerHr}
                    onSaved={refreshAllRates}
                  />
                </span>
              )}
              {!isSub && activeFinishType === 'Stamped' && (
                <span className="text-gray-400 inline-flex items-center gap-1 flex-wrap">
                  — stamp sub ${calc.stampSubFlat} flat
                  <RateEditPopover
                    table="subcontractor_rates"
                    name="Concrete - Stamp Sub Flat"
                    category="Concrete"
                    unitLabel="flat"
                    currentValue={calc.stampSubFlat}
                    onSaved={refreshAllRates}
                  />
                  · ${calc.stampSubPerCY}/CY
                  <RateEditPopover
                    table="subcontractor_rates"
                    name="Concrete - Stamp Sub Per CY"
                    category="Concrete"
                    unitLabel="CY"
                    currentValue={calc.stampSubPerCY}
                    onSaved={refreshAllRates}
                  />
                </span>
              )}
            </label>
            <select
              className="input text-sm py-1.5"
              value={activeFinishType}
              onChange={e => setActiveFinishType(e.target.value)}
            >
              {FINISH_TYPES.map(t => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </div>
          <div className="flex items-end gap-4 pb-1 flex-wrap">
            <label className="flex items-center gap-1.5 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={activeColorYes}
                onChange={e => setActiveColorYes(e.target.checked)}
                className="accent-green-600"
              />
              <span className="text-gray-700">Color Hardener (${calc.colorCostPerCY}/CY)</span>
              <RateEditPopover
                table="material_rates"
                name="Concrete - Color Per CY"
                category="Concrete"
                unitLabel="CY"
                currentValue={calc.colorCostPerCY}
                onSaved={refreshAllRates}
              />
            </label>
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1 inline-flex items-center gap-1">
              Vapor Barrier (Sq Ft)
              {isSub ? (
                <span className="text-gray-400 inline-flex items-center gap-1">
                  — ${subVaporBarrierRate}/SF
                  <RateEditPopover
                    table="subcontractor_rates"
                    name="Concrete Sub - Vapor Barrier Per SF"
                    category="Concrete"
                    unitLabel="/SF"
                    currentValue={subVaporBarrierRate}
                    onSaved={refreshAllRates}
                  />
                </span>
              ) : (
                <>
                  <span className="text-gray-400">
                    — {calc.vaporBarrierSFPerHr} SF/hr · ${calc.vaporBarrierPerSF}/SF
                  </span>
                  <RateEditPopover
                    table="labor_rates"
                    name="Concrete - Vapor Barrier"
                    category="Concrete"
                    mode="coefficient"
                    unitLabel="SF/hr"
                    currentValue={calc.vaporBarrierSFPerHr}
                    onSaved={refreshAllRates}
                  />
                  <RateEditPopover
                    table="material_rates"
                    name="Concrete - Vapor Barrier SF"
                    category="Concrete"
                    unitLabel="SF"
                    currentValue={calc.vaporBarrierPerSF}
                    onSaved={refreshAllRates}
                  />
                </>
              )}
            </label>
            <NumInput value={activeVaporBarrierSF} onChange={setActiveVaporBarrierSF} />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1 inline-flex items-center gap-1 flex-wrap">
              Sealer (Sq Ft)
              {isSub ? (
                <span className="text-gray-400 inline-flex items-center gap-1">
                  — ${subSealerRate}/SF
                  <RateEditPopover
                    table="subcontractor_rates"
                    name="Concrete Sub - Sealer Per SF"
                    category="Concrete"
                    unitLabel="/SF"
                    currentValue={subSealerRate}
                    onSaved={refreshAllRates}
                  />
                </span>
              ) : activeSealerType === 'Natural' ? (
                <span className="text-gray-400 inline-flex items-center gap-1">
                  — {calc.sealerNaturalSFPerHr} SF/hr · ${calc.sealerNatural5g}/5gal
                  <RateEditPopover
                    table="labor_rates"
                    name="Concrete - Sealer Natural"
                    category="Concrete"
                    mode="coefficient"
                    unitLabel="SF/hr"
                    currentValue={calc.sealerNaturalSFPerHr}
                    onSaved={refreshAllRates}
                  />
                  <RateEditPopover
                    table="material_rates"
                    name="Concrete - Sealer Natural 5gal"
                    category="Concrete"
                    unitLabel="5gal"
                    currentValue={calc.sealerNatural5g}
                    onSaved={refreshAllRates}
                  />
                </span>
              ) : (
                <span className="text-gray-400 inline-flex items-center gap-1">
                  — {calc.sealerWetSFPerHr} SF/hr · ${calc.sealerWet5g}/5gal
                  <RateEditPopover
                    table="labor_rates"
                    name="Concrete - Sealer Wet-Look"
                    category="Concrete"
                    mode="coefficient"
                    unitLabel="SF/hr"
                    currentValue={calc.sealerWetSFPerHr}
                    onSaved={refreshAllRates}
                  />
                  <RateEditPopover
                    table="material_rates"
                    name="Concrete - Sealer Wet 5gal"
                    category="Concrete"
                    unitLabel="5gal"
                    currentValue={calc.sealerWet5g}
                    onSaved={refreshAllRates}
                  />
                </span>
              )}
            </label>
            <div className="flex gap-2">
              <NumInput value={activeSealerSF} onChange={setActiveSealerSF} className="flex-1" />
              <select
                className="input text-sm py-1.5 w-28"
                value={activeSealerType}
                onChange={e => setActiveSealerType(e.target.value)}
              >
                {SEALER_TYPES.map(t => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>
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
              {activeManualRows.map((row, i) => (
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
            onClick={() => setActiveManualRows(rows => [...rows, { label: '', hours: '', materials: '', subCost: '' }])}
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
    </SubRateOverrideProvider>
  )
}
