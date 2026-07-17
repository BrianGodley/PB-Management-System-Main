// ─────────────────────────────────────────────────────────────────────────────
// HandDemoModule — Hand (Non-Skid-Steer) Demo estimator
//
// All labor rates pulled from labor_rates table (lr[]) with constant fallbacks.
// Key differences vs Skid Steer Demo:
//   • Access modifiers: Poor=0.5, OK=0.667, Full=1.0  (non-skid-steer rates)
//   • Concrete/Dirt rate:  0.75 t/hr  (vs 2.0 for SS)
//   • Import Base rate:    5.0  t/hr  (vs 10.0 for SS)
//   • Rebar add-on:        0.25 min/SF (vs 0.05 for SS)
//   • No Skid Steer Compaction row
//   • Adds "Hand Bucket Areas" section (tight access; rate 0.38 t/hr)
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import GpmdBar from './GpmdBar'
import ModuleNotesField from './ModuleNotesField'
import RateEditPopover from '../RateEditPopover'
import { fetchSalesTaxRate } from '../../lib/companyDefaults'
import { calcWalkAccessLabor, DEFAULT_WALK_ACCESS_PACE_LF_PER_MIN } from '../../lib/walkAccess'

// ── Fallback constants ────────────────────────────────────────────────────────

const ACCESS_LEVELS = { Poor: 0.5, OK: 0.667, Full: 1.0 }
const DUMP_TYPES = ['In-House', 'Subcontractor']

const RATE_DEFAULTS = {
  concrete: 0.75, // 'Demo - Hand Concrete/Dirt'
  grass: 0.75, // 'Demo - Hand Grass'
  importBase: 5.0, // 'Demo - Hand Import Base'
  bucket: 0.38, // 'Demo - Hand Bucket'  (tight-access hand bucket areas)
  jj: 1.75, // 'Demo - JJ Compaction'
  rebarMin: 0.25, // 'Demo - Hand Rebar'  (min/SF)
  shrub: 0.75, // 'Demo - Shrub'
  stumpFst: 2.5, // 'Demo - Stump 1st'
  stumpAdd: 0.75, // 'Demo - Stump Additional'
  treeSmall: 0.1, // 'Demo - Tree Small'
  treeMed: 0.17, // 'Demo - Tree Medium'
  treeLarge: 0.23, // 'Demo - Tree Large'
}

// Sub Haul rates — billed per 1.5 tons removed (sub cost, not materials)
// Labor is unchanged in Subcontractor mode; dump fees are replaced by these charges
// DB values (subcontractor_rates category='Sub Haul') take precedence
const SUB_HAUL_DEFAULTS = {
  concrete: 85, // $/1.5T — concrete, misc flat/vert, footing
  dirt: 95, // $/1.5T — dirt/rock, grade cut, bucket areas
  grass: 120, // $/1.5T — grass/sod, trees (green waste)
}

const DUMP_FEE_DEFAULTS = {
  'Dump Fee - Concrete': 36.21,
  'Dump Fee - Dirt': 36.21,
  'Dump Fee - Green Waste': 72.19,
  'Dump Fee - Tree/Stump': 125.33,
}

// ── Calculation engine ────────────────────────────────────────────────────────

const n = v => parseFloat(v) || 0
const sfToTons = (sf, depthIn) => (n(sf) / 200) * n(depthIn)

// Container-based removal: SF -> CF (x depth/12) -> CY (/27) -> x swell,
// billed at a flat rate per low-boy container (per material, rounded up).
const CONTAINER_COST = 770 // $ per low-boy container
const CONTAINER_CY = 10 // cubic yards a container holds
const SWELL = 1.2 // broken-material swell factor

function calcDemo(
  state,
  laborRatePerHour,
  materialPrices,
  laborRates,
  subMarkupRate = 0.35,
  subRates = {},
  gpmd = 425,
  walkAccess = null,
  laborBurdenPct = 0.29
) {
  const _pace = parseFloat(walkAccess?.paceLfPerMin) || DEFAULT_WALK_ACCESS_PACE_LF_PER_MIN
  const mp = materialPrices || {}
  const lr = laborRates || {}
  const sr = subRates || {}
  const access = ACCESS_LEVELS[state.access] || 0.667
  const isSub = state.dumpType === 'Subcontractor'
  const isDumpSub = !isSub && state.dispType === 'Subcontractor'
  const lrph = n(laborRatePerHour) || 35
  const difficultyRatio = lr['Demo - Difficulty Ratio'] ?? 1
  const diff = 1 + (n(state.difficulty) / 100) * difficultyRatio
  const hrsAdj = n(state.hoursAdj)

  // ── Rates from DB with fallbacks ──────────────────────────────────────────
  const rateConc = lr['Demo - Hand Concrete/Dirt'] ?? RATE_DEFAULTS.concrete
  const rateGrass = lr['Demo - Hand Grass'] ?? RATE_DEFAULTS.grass
  const rateBase = lr['Demo - Hand Import Base'] ?? RATE_DEFAULTS.importBase
  const rateBucket = lr['Demo - Hand Bucket'] ?? RATE_DEFAULTS.bucket
  const rateJJ = lr['Demo - JJ Compaction'] ?? RATE_DEFAULTS.jj
  const rebarMinPerSF = lr['Demo - Hand Rebar'] ?? RATE_DEFAULTS.rebarMin
  const shrubRate = lr['Demo - Shrub'] ?? RATE_DEFAULTS.shrub
  const stumpFstRate = lr['Demo - Stump 1st'] ?? RATE_DEFAULTS.stumpFst
  const stumpAddRate = lr['Demo - Stump Additional'] ?? RATE_DEFAULTS.stumpAdd
  const treeSmall = lr['Demo - Tree Small'] ?? RATE_DEFAULTS.treeSmall
  const treeMed = lr['Demo - Tree Medium'] ?? RATE_DEFAULTS.treeMed
  const treeLarge = lr['Demo - Tree Large'] ?? RATE_DEFAULTS.treeLarge

  const dumpConc = mp['Dump Fee - Concrete'] ?? DUMP_FEE_DEFAULTS['Dump Fee - Concrete']
  const dumpDirt = mp['Dump Fee - Dirt'] ?? DUMP_FEE_DEFAULTS['Dump Fee - Dirt']
  const dumpGreen = mp['Dump Fee - Green Waste'] ?? DUMP_FEE_DEFAULTS['Dump Fee - Green Waste']
  const dumpTree = mp['Dump Fee - Tree/Stump'] ?? DUMP_FEE_DEFAULTS['Dump Fee - Tree/Stump']

  // ── Helpers ───────────────────────────────────────────────────────────────
  function flat(sf, depthIn, baseRate, dumpFeePerTon = 0) {
    const tons = sfToTons(sf, depthIn)
    if (!tons) return { tons: 0, hours: 0, dumpFee: 0 }
    return {
      tons,
      hours: tons / (baseRate * access), // labor always calculated
      dumpFee: isSub || isDumpSub ? 0 : tons * dumpFeePerTon,
    }
  }

  // Vertical: LF × Height(in) × Width(in) → CF → tons (concrete 150 lb/cf)
  function vert(lf, heightIn, widthIn, baseRate, dumpFeePerTon = 0) {
    const cf = n(lf) * (n(heightIn) / 12) * (n(widthIn) / 12)
    const tons = (cf * 150) / 2000
    if (!tons) return { tons: 0, cf: 0, hours: 0, dumpFee: 0 }
    return {
      tons,
      cf,
      hours: tons / (baseRate * access), // labor always calculated
      dumpFee: isSub || isDumpSub ? 0 : tons * dumpFeePerTon,
    }
  }

  // Editable container disposal rates (Master Rates -> Materials, category Demo).
  const containerPrice = mp['Demo - Container (Low-Boy)'] ?? CONTAINER_COST
  const containerCy = mp['Demo - Container Capacity (CY)'] ?? CONTAINER_CY
  const swellFactor = mp['Demo - Removal Swell'] ?? SWELL
  const removalYards = (sf, depthIn) => ((n(sf) * (n(depthIn) / 12)) / 27) * swellFactor
  const removalContainers = (sf, depthIn) => Math.ceil(removalYards(sf, depthIn) / containerCy)
  const containerCost = (sf, depthIn) =>
    isSub || isDumpSub ? 0 : removalContainers(sf, depthIn) * containerPrice
  // Editable hand-demo removal labor: hours per 100 SF at 1", scaled by thickness.
  const sfLaborRate = lr['Demo - Hand Removal (SF)'] ?? 1
  const sfLaborHrs = (sf, depthIn) => (n(sf) / 100) * n(depthIn) * sfLaborRate
  // Editable hauling coefficients: wheelbarrow load 1/5 cy; 4 sec/ft (covers round trip).
  const haulSecPerFt = lr['Demo - Hand Haul Sec/Ft'] ?? 4
  const haulLoadCy = lr['Demo - Hand Load (CY)'] ?? 0.2

  // ── Demo rows ────────────────────────────────────────────────────────────
  const conc = flat(state.concSF, state.concDepth || 4, rateConc, 0)
  const dirt = flat(state.dirtSF, state.dirtDepth || 6, rateConc, 0)
  const base = flat(state.baseSF, state.baseDepth || 4, rateBase, 0)
  const grass = flat(state.grassSF, state.grassDepth || 2, rateGrass, 0)
  // Removed debris — container disposal per material (shown as the row's Dump Fee).
  conc.dumpFee = containerCost(state.concSF, state.concDepth || 4)
  dirt.dumpFee = containerCost(state.dirtSF, state.dirtDepth || 6)
  grass.dumpFee = containerCost(state.grassSF, state.grassDepth || 2)
  // Hand-demo: concrete + soils removal labor is square-foot based (not tons).
  conc.hours = sfLaborHrs(state.concSF, state.concDepth || 4)
  dirt.hours = sfLaborHrs(state.dirtSF, state.dirtDepth || 6)

  const miscFlatCalc = (state.miscFlatRows || []).map(r => flat(r.sf, r.depth || 4, rateConc, 0))
  const miscVertCalc = (state.miscVertRows || []).map(r =>
    vert(r.lf, r.heightIn || 0, r.widthIn || 8, rateConc, 0)
  )
  const footingCalc = (state.footingRows || []).map(r => flat(r.sf, r.depth || 12, rateConc, 0))

  // ── Hand Bucket Areas (confined-access manual work) ───────────────────────
  const bucketCalc = (state.bucketRows || []).map(r =>
    flat(r.sf, r.depth || 4, rateBucket, dumpDirt)
  )

  // ── Grading ──────────────────────────────────────────────────────────────
  const gradeCut = flat(state.gradeCutSF, state.gradeCutDepth || 3, rateConc, 0)
  gradeCut.dumpFee = containerCost(state.gradeCutSF, state.gradeCutDepth || 3)
  const gradeFill = flat(state.gradeFillSF, state.gradeFillDepth || 3, rateBase, 0)

  const jjTons = sfToTons(state.jjSF, state.jjDepth || 3)
  const jjHrs = jjTons > 0 ? jjTons / rateJJ : 0 // no access mod on JJ

  // ── Rebar add-on ─────────────────────────────────────────────────────────
  const rebarHrs = n(state.rebarSF) * (rebarMinPerSF / 60)

  // ── Vegetation ───────────────────────────────────────────────────────────
  const shrubHrs = n(state.shrubQty) * access * shrubRate
  // Shrubs by SqFt: density (1–5) × rate per 100 SF. Density 1 = 2 hrs &
  // $100 per 100 SF; both base rates editable in the Edit Rates popovers.
  const shrubSfRate = lr['Demo - Shrub SqFt (Hand)'] ?? 2
  const shrubSfMatRate = mp['Demo - Shrub SqFt'] ?? 100
  const shrubSfDensity = n(state.shrubDensity) || 1
  const shrubSfHrs = (n(state.shrubSqFt) / 100) * shrubSfDensity * shrubSfRate
  const shrubSfMat = (n(state.shrubSqFt) / 100) * shrubSfDensity * shrubSfMatRate
  const stumpFstHrs = n(state.stumpFirstQty) * access * stumpFstRate
  const stumpAddHrs = n(state.stumpAddQty) * access * stumpAddRate

  const treeCalc = (state.treeRows || []).map(r => {
    const qty = n(r.qty),
      ht = n(r.height) || 10
    const mult = r.size === 'Large' ? treeLarge : r.size === 'Medium' ? treeMed : treeSmall
    const hrs = qty * ht * access * mult
    const tons = qty * (ht / 10) * 0.25
    const dumpFee = isSub ? 0 : tons * dumpTree
    return { hrs, tons, dumpFee }
  })

  // ── Manual entry ─────────────────────────────────────────────────────────
  const manualRows = (state.manualRows || []).filter(
    r => n(r.hours) > 0 || n(r.materials) > 0 || n(r.subCost) > 0
  )
  const manualHrs = manualRows.reduce((s, r) => s + n(r.hours), 0)
  const manualMat = manualRows.reduce((s, r) => s + n(r.materials), 0)
  const manualSub = manualRows.reduce((s, r) => s + n(r.subCost), 0)

  // ── Sub Haul cost — per 1.5 tons, goes into subCost (not materials) ──────────
  // DB values (subcontractor_rates category='Sub Haul') take precedence over defaults
  const shConc = sr['Sub Haul - Concrete'] ?? SUB_HAUL_DEFAULTS.concrete
  const shDirt = sr['Sub Haul - Dirt'] ?? SUB_HAUL_DEFAULTS.dirt
  const shGrass = sr['Sub Haul - Grass'] ?? SUB_HAUL_DEFAULTS.grass
  const tonsPerCharge = 1.5

  const subHaulCost =
    isSub || isDumpSub
      ? (conc.tons / tonsPerCharge) * shConc +
        (dirt.tons / tonsPerCharge) * shDirt +
        (grass.tons / tonsPerCharge) * shGrass +
        miscFlatCalc.reduce((s, r) => s + (r.tons / tonsPerCharge) * shConc, 0) +
        miscVertCalc.reduce((s, r) => s + (r.tons / tonsPerCharge) * shConc, 0) +
        footingCalc.reduce((s, r) => s + (r.tons / tonsPerCharge) * shConc, 0) +
        bucketCalc.reduce((s, r) => s + (r.tons / tonsPerCharge) * shDirt, 0) +
        (gradeCut.tons / tonsPerCharge) * shDirt +
        treeCalc.reduce((s, r) => s + (r.tons / tonsPerCharge) * shGrass, 0)
      : 0

  // ── Hour aggregation — labor same in both modes ───────────────────────────
  const crewDemoHrs =
    conc.hours +
    dirt.hours +
    base.hours +
    grass.hours +
    miscFlatCalc.reduce((s, r) => s + r.hours, 0) +
    miscVertCalc.reduce((s, r) => s + r.hours, 0) +
    footingCalc.reduce((s, r) => s + r.hours, 0) +
    bucketCalc.reduce((s, r) => s + r.hours, 0) +
    gradeCut.hours
  const gradingHrs = gradeFill.hours + jjHrs
  const vegHrs = shrubHrs + shrubSfHrs + stumpFstHrs + stumpAddHrs + treeCalc.reduce((s, r) => s + r.hrs, 0)

  const rawHrs = crewDemoHrs + gradingHrs + vegHrs + rebarHrs + manualHrs
  const _preWalkHrs = rawHrs * diff + hrsAdj
  // Hauling to the truck: trips (removed yards / load) x distance x sec/ft.
  const haulYards =
    removalYards(state.concSF, state.concDepth || 4) +
    removalYards(state.dirtSF, state.dirtDepth || 6) +
    removalYards(state.gradeCutSF, state.gradeCutDepth || 3) +
    removalYards(state.grassSF, state.grassDepth || 2)
  const haulTrips = haulLoadCy > 0 ? haulYards / haulLoadCy : 0
  const walkHrs = (haulTrips * n(state.distanceLF) * haulSecPerFt) / 3600
  const totalHrs = _preWalkHrs + walkHrs

  // ── Materials ─────────────────────────────────────────────────────────────
  const dumpMatCost = isSub
    ? 0
    : conc.dumpFee +
      dirt.dumpFee +
      grass.dumpFee +
      miscFlatCalc.reduce((s, r) => s + r.dumpFee, 0) +
      miscVertCalc.reduce((s, r) => s + r.dumpFee, 0) +
      footingCalc.reduce((s, r) => s + r.dumpFee, 0) +
      bucketCalc.reduce((s, r) => s + r.dumpFee, 0) +
      gradeCut.dumpFee +
      treeCalc.reduce((s, r) => s + r.dumpFee, 0)
  const totalMat = dumpMatCost + manualMat + shrubSfMat

  // ── Financials ────────────────────────────────────────────────────────────
  const manDays = totalHrs / 8
  const laborCost = totalHrs * lrph
  const burden = laborCost * (n(laborBurdenPct) || 0.29)
  // GP = labor component + Universal Sub Markup % on sub haul cost
  const gp = manDays * gpmd + subHaulCost * subMarkupRate
  const commission = gp * 0.12
  const subCost = subHaulCost + manualSub
  const price = laborCost + burden + totalMat + gp + commission + subCost

  return {
    walkHrs,
    totalHrs,
    manDays,
    laborCost,
    burden,
    totalMat,
    subCost,
    gp,
    commission,
    price,
    containerPrice,
    containerCy,
    swellFactor,
    sfLaborRate,
    difficultyRatio,
    haulSecPerFt,
    haulLoadCy,
    haulTrips,
    conc,
    dirt,
    base,
    grass,
    miscFlatCalc,
    miscVertCalc,
    footingCalc,
    bucketCalc,
    gradeCut,
    gradeFill,
    jjTons,
    jjHrs,
    rebarHrs,
    shrubHrs,
    shrubSfHrs,
    shrubSfMat,
    shrubSfRate,
    shrubSfMatRate,
    stumpFstHrs,
    stumpAddHrs,
    treeCalc,
    crewDemoHrs,
    gradingHrs,
    vegHrs,
    manualHrs,
    dumpMatCost,
    isSub,
    subHaulCost,
    shConc,
    shDirt,
    shGrass,
    // expose resolved rates
    rateConc,
    rateGrass,
    rateBase,
    rateBucket,
    rateJJ,
    rebarMinPerSF,
    shrubRate,
    stumpFstRate,
    stumpAddRate,
    treeSmall,
    treeMed,
    treeLarge,
  }
}

// ── Default state ─────────────────────────────────────────────────────────────

const DEFAULT_STATE = {
  access: 'OK',
  dumpType: 'In-House',
  difficulty: 0,
  crewType: 'Demo',
  hoursAdj: 0,
  dispType: 'In-House',
  // Demolition
  concSF: '',
  concDepth: 4,
  dirtSF: '',
  dirtDepth: 6,
  baseSF: '',
  baseDepth: 4,
  grassSF: '',
  grassDepth: 2,
  // Rebar add-on
  rebarSF: '',
  // Misc flat (SF + Depth)
  miscFlatRows: Array(4)
    .fill(null)
    .map(() => ({ label: '', sf: '', depth: 4 })),
  // Misc vertical (LF × Height × Width)
  miscVertRows: Array(4)
    .fill(null)
    .map(() => ({ label: '', lf: '', heightIn: '', widthIn: 8 })),
  // Footing (SF + Depth)
  footingRows: Array(4)
    .fill(null)
    .map(() => ({ label: '', sf: '', depth: 12 })),
  // Hand Bucket Areas
  bucketRows: Array(4)
    .fill(null)
    .map(() => ({ label: '', sf: '', depth: 4 })),
  // Grading
  gradeCutSF: '',
  gradeCutDepth: 3,
  gradeFillSF: '',
  gradeFillDepth: 3,
  jjSF: '',
  jjDepth: 3,
  // Vegetation
  shrubQty: '',
  shrubSqFt: '',
  shrubDensity: '1',
  stumpFirstQty: '',
  stumpAddQty: '',
  treeRows: [
    { qty: '', height: 10, size: 'Small' },
    { qty: '', height: 10, size: 'Small' },
    { qty: '', height: 10, size: 'Small' },
    { qty: '', height: 15, size: 'Medium' },
    { qty: '', height: 20, size: 'Large' },
  ],
  // Manual
  manualRows: [
    { label: '', hours: '', materials: '', subCost: '' },
    { label: '', hours: '', materials: '', subCost: '' },
  ],
}

// ── Shared UI helpers ─────────────────────────────────────────────────────────

function SecHdr({ title }) {
  return (
    <div className="bg-gray-50 rounded-lg px-4 py-2.5 border border-gray-200 mb-2">
      <h3 className="text-xs font-bold text-gray-600 uppercase tracking-wider">{title}</h3>
    </div>
  )
}

function Inp({ value, onChange, placeholder = '0', type = 'number', step, className = '' }) {
  return (
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      step={step}
      className={`w-full border border-gray-200 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400 ${className}`}
    />
  )
}

function Sel({ value, onChange, options }) {
  return (
    <select
      value={value}
      onChange={onChange}
      className="w-full border border-gray-200 rounded-md px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-400"
    >
      {options.map(o => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  )
}

function TH({ cols }) {
  return (
    <thead>
      <tr className="text-left text-gray-400 border-b border-gray-100 text-xs">
        {cols.map((c, i) => (
          <th key={i} className={`py-1 pr-2 font-medium ${c.w || ''}`}>
            {c.label}
          </th>
        ))}
      </tr>
    </thead>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function HandDemoModule({ initialData, onSave, onCancel, onSwitchType }) {
  const [state, setState] = useState(() => ({ ...DEFAULT_STATE, ...(initialData || {}) }))

  // Free-text notes for this module — Sam writes auto-generated
  // takeoffs here via create_estimate_from_takeoff, and the user can
  // overwrite / append their own.
  const [notes, setNotes] = useState(initialData?.notes ?? '')
  const [materialPrices, setMaterialPrices] = useState(initialData?.materialPrices || {})
  const [laborRates, setLaborRates] = useState(initialData?.laborRates || {})
  const [laborRatePerHour, setLaborRatePerHour] = useState(initialData?.laborRatePerHour ?? 35)
  const [laborBurdenPct, setLaborBurdenPct] = useState(initialData?.laborBurdenPct ?? 0.29)
  const [walkAccess] = useState(
    initialData?.walkAccess ?? {
      paceLfPerMin: DEFAULT_WALK_ACCESS_PACE_LF_PER_MIN,
    }
  )
  const [subMarkupRate, setSubMarkupRate] = useState(initialData?.subMarkupRate ?? 0.35)
  const [subRates, setSubRates] = useState(initialData?.subRates || {})

  // ── Sales tax — applied to totalMat across every module so the bid
  //    reflects supplier-invoiced material cost. Sourced from
  //    company_settings.sales_tax_rate via fetchSalesTaxRate(). Default
  //    0 (no tax) until the admin sets it in Opportunities → Settings.
  const [salesTaxRate, setSalesTaxRate] = useState(0)

  // Picker visibility for the "Change Demo Module" button rendered
  // next to Crew Type. Hosts a tiny popover with the other two demo
  // types. On selection, we bundle the current state + rate caches
  // and hand them up to the parent (EstimateDetail) so it can swap
  // selectedType while keeping the user's entered values.
  const [showDemoSwitcher, setShowDemoSwitcher] = useState(false)

  useEffect(() => {
    let alive = true
    fetchSalesTaxRate().then(r => {
      if (alive) setSalesTaxRate(r)
    })
    return () => {
      alive = false
    }
  }, [])

  const [pricesLoading, setPricesLoading] = useState(!initialData?.materialPrices)

  // Re-fetch all master-rate maps. Called once on mount and again whenever the
  // user saves an edit from a RateEditPopover so the calc picks up the change.
  const refreshAllRates = useCallback(async () => {
    const [matRes, lrRes, srRes] = await Promise.all([
      supabase.from('material_rates').select('name,unit_cost').eq('category', 'Demo'),
      supabase.from('labor_rates').select('name,rate,rate_per_day'),
      supabase.from('subcontractor_rates').select('company_name,rate').eq('category', 'Sub Haul'),
    ])
    if (matRes.data) {
      const m = {}
      matRes.data.forEach(r => {
        m[r.name] = parseFloat(r.unit_cost)
      })
      setMaterialPrices(m)
    }
    if (lrRes.data) {
      const m = {}
      lrRes.data.forEach(r => {
        m[r.name] = parseFloat(r.rate ?? r.rate_per_day)
      })
      setLaborRates(m)
    }
    if (srRes.data) {
      const m = {}
      srRes.data.forEach(r => {
        m[r.company_name] = parseFloat(r.rate)
      })
      setSubRates(m)
    }
  }, [])

  useEffect(() => {
    let gone = false
    ;(async () => {
      await Promise.all([
        // Company settings — skip if already loaded via initialData
        !initialData?.laborRatePerHour &&
          supabase
            .from('company_settings')
            .select('labor_rate_per_hour, labor_burden_pct, sub_markup_rate, walk_access_pace_lf_per_min')
            .single()
            .then(({ data }) => {
              if (!gone && data) {
                if (data.labor_rate_per_hour != null)
                  setLaborRatePerHour(parseFloat(data.labor_rate_per_hour) || 35)
                if (data.labor_burden_pct != null)
                  setLaborBurdenPct(parseFloat(data.labor_burden_pct))
                if (data.sub_markup_rate != null)
                  setSubMarkupRate(parseFloat(data.sub_markup_rate) || 0.35)
              }
            }),
        refreshAllRates(),
      ])
      if (!gone) setPricesLoading(false)
    })()
    return () => {
      gone = true
    }
  }, [refreshAllRates])

  const set = useCallback((f, v) => setState(p => ({ ...p, [f]: v })), [])
  const setRow = useCallback(
    (sec, i, f, v) =>
      setState(p => {
        const rows = [...p[sec]]
        rows[i] = { ...rows[i], [f]: v }
        return { ...p, [sec]: rows }
      }),
    []
  )

  const gpmd = initialData?.gpmd ?? 425
  const subGpMarkupRate = initialData?.subGpMarkupRate ?? 0.2
  const calcRaw = calcDemo(
    state,
    laborRatePerHour,
    materialPrices,
    laborRates,
    subMarkupRate,
    subRates,
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

  const fmt2 = v =>
    `$${n(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  const fh = v => (v > 0 ? v.toFixed(2) : '—')
  const isSelf = state.dumpType === 'In-House'
  const isSub = state.dumpType === 'Subcontractor'
  const isDumpSub = !isSub && state.dispType === 'Subcontractor'

  const dumpConc = materialPrices['Dump Fee - Concrete'] ?? DUMP_FEE_DEFAULTS['Dump Fee - Concrete']
  const dumpDirt = materialPrices['Dump Fee - Dirt'] ?? DUMP_FEE_DEFAULTS['Dump Fee - Dirt']
  const dumpGreen =
    materialPrices['Dump Fee - Green Waste'] ?? DUMP_FEE_DEFAULTS['Dump Fee - Green Waste']

  const td = 'py-1 pr-2 align-top'
  const num = 'py-1 pr-2 text-gray-600 tabular-nums text-xs'

  function handleSave() {
    onSave({
      notes,
      man_days: parseFloat(calc.manDays.toFixed(2)),
      material_cost: parseFloat(calc.totalMat.toFixed(2)),
      labor_cost: parseFloat(calc.laborCost.toFixed(2)),
      labor_burden: parseFloat(calc.burden.toFixed(2)),
      gross_profit: parseFloat(calc.gp.toFixed(2)),
      sub_cost: parseFloat(calc.subCost.toFixed(2)),
      total_price: parseFloat(calc.price.toFixed(2)),
      data: {
        ...state,
        walkAccess,
        laborRatePerHour,
        laborBurdenPct,
        gpmd,
        materialPrices,
        laborRates,
        calc: {
          totalHrs: calc.totalHrs,
          manDays: calc.manDays,
          laborCost: calc.laborCost,
          burden: calc.burden,
          totalMat: calc.totalMat,
          subCost: calc.subCost,
          gp: calc.gp,
          price: calc.price,
        },
      },
    })
  }

  return (
    <div className="space-y-4">
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

      {/* Crew Type + Change Demo Module switcher */}
      <div className="flex items-center gap-3 bg-gray-50 rounded-lg px-4 py-2.5 border border-gray-200">
        <label className="text-sm font-medium text-gray-700 whitespace-nowrap">Crew Type</label>
        <select
          value={state.crewType}
          onChange={e => set('crewType', e.target.value)}
          className="input text-sm py-1 w-36"
        >
          <option value="Demo">Demo</option>
          <option value="Landscape">Landscape</option>
          <option value="Masonry">Masonry</option>
          <option value="Paver">Paver</option>
          <option value="Specialty">Specialty</option>
        </select>
        {/* Change Demo Module — bundle current values and switch to
            another demo type (Hand / Skid Steer / Mini Skid Steer).
            Shared fields populate automatically in the target. */}
        {onSwitchType && (
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowDemoSwitcher(v => !v)}
              className="text-xs font-semibold px-3 py-1.5 rounded-md border border-green-300 bg-green-50 text-green-800 hover:bg-green-100 hover:border-green-500 transition-colors whitespace-nowrap"
              title="Switch to a different Demo module — keep your entries"
            >
              🔁 Change Demo Module
            </button>
            {showDemoSwitcher && (
              <div className="absolute z-30 top-full left-0 mt-1 w-56 bg-white border border-gray-200 rounded-lg shadow-lg p-1">
                <p className="text-[10px] uppercase tracking-wide font-bold text-gray-400 px-2 pt-1 pb-0.5">
                  Switch to
                </p>
                <button
                  onClick={() => {
                    // Hand the source module's full state + rate caches
                    // up to EstimateDetail so the target module loads
                    // with everything prefilled.
                    onSwitchType?.('Skid Steer Demo', {
                      ...state,
                      materialPrices,
                      laborRates,
                      laborRatePerHour,
                      subMarkupRate,
                      subRates,
                    })
                    setShowDemoSwitcher(false)
                  }}
                  className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-green-50 hover:text-green-800 rounded transition-colors"
                >
                  Skid Steer Demo
                </button>
                <button
                  onClick={() => {
                    // Hand the source module's full state + rate caches
                    // up to EstimateDetail so the target module loads
                    // with everything prefilled.
                    onSwitchType?.('Mini Skid Steer Demo', {
                      ...state,
                      materialPrices,
                      laborRates,
                      laborRatePerHour,
                      subMarkupRate,
                      subRates,
                    })
                    setShowDemoSwitcher(false)
                  }}
                  className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-green-50 hover:text-green-800 rounded transition-colors"
                >
                  Mini Skid Steer Demo
                </button>
                <button
                  onClick={() => setShowDemoSwitcher(false)}
                  className="w-full text-left px-3 py-1.5 text-[11px] text-gray-400 hover:text-gray-700"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      {pricesLoading && (
        <div className="text-xs text-amber-700 bg-amber-50 rounded px-3 py-2">
          Loading current rates…
        </div>
      )}

      {/* Settings */}
      <SecHdr title="Settings" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <p className="text-xs text-gray-500 mb-0.5">Difficulty (%)</p>
          <Inp
            value={state.difficulty}
            onChange={e => set('difficulty', e.target.value)}
            step="5"
          />
          <p className="text-[10px] text-gray-500 mt-0.5 inline-flex items-center gap-1">
            {calc.difficultyRatio}% labor per 1%
            <RateEditPopover
              table="labor_rates"
              name="Demo - Difficulty Ratio"
              category="Demo"
              mode="coefficient"
              unitLabel="% per 1%"
              currentValue={calc.difficultyRatio}
              onSaved={refreshAllRates}
            />
          </p>
        </div>
        <div>
          <p
            className="text-xs text-gray-500 mb-0.5"
            title="Average Distance from Truck to Work Area"
          >
            Truck → Work Area (Avg LF)
          </p>
          <Inp
            value={state.distanceLF}
            onChange={e => set('distanceLF', e.target.value)}
            step="5"
          />
          <p className="text-[10px] text-gray-500 mt-0.5 inline-flex items-center gap-1 flex-wrap">
            {calc.haulSecPerFt} sec/ft
            <RateEditPopover
              table="labor_rates"
              name="Demo - Hand Haul Sec/Ft"
              category="Demo"
              mode="coefficient"
              unitLabel="sec/ft"
              currentValue={calc.haulSecPerFt}
              onSaved={refreshAllRates}
            />
            · {calc.haulLoadCy} cy/load
            <RateEditPopover
              table="labor_rates"
              name="Demo - Hand Load (CY)"
              category="Demo"
              mode="coefficient"
              unitLabel="cy"
              currentValue={calc.haulLoadCy}
              onSaved={refreshAllRates}
            />
            {calc.walkHrs > 0 && <span>· +{calc.walkHrs.toFixed(2)} hrs haul</span>}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-0.5">Hours Adj (±hrs)</p>
          <Inp value={state.hoursAdj} onChange={e => set('hoursAdj', e.target.value)} step="0.5" />
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-0.5">Access Level</p>
          <Sel
            value={state.access}
            onChange={e => set('access', e.target.value)}
            options={Object.keys(ACCESS_LEVELS)}
          />
          <p className="text-xs text-gray-400 mt-0.5">Modifier: {ACCESS_LEVELS[state.access]}×</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-0.5">Demo Type</p>
          <Sel
            value={state.dumpType}
            onChange={e => set('dumpType', e.target.value)}
            options={DUMP_TYPES}
          />
          {!isSelf && (
            <p className="text-xs text-amber-600 mt-0.5 inline-flex items-center flex-wrap gap-x-1 gap-y-0.5">
              Sub haul:
              <span className="inline-flex items-center gap-0.5">
                ${calc.shConc}/1.5T conc
                <RateEditPopover
                  table="subcontractor_rates"
                  name="Sub Haul - Concrete"
                  unitLabel="/1.5T"
                  currentValue={calc.shConc}
                  onSaved={refreshAllRates}
                />
              </span>
              ·
              <span className="inline-flex items-center gap-0.5">
                ${calc.shDirt}/1.5T dirt
                <RateEditPopover
                  table="subcontractor_rates"
                  name="Sub Haul - Dirt"
                  unitLabel="/1.5T"
                  currentValue={calc.shDirt}
                  onSaved={refreshAllRates}
                />
              </span>
              ·
              <span className="inline-flex items-center gap-0.5">
                ${calc.shGrass}/1.5T grass
                <RateEditPopover
                  table="subcontractor_rates"
                  name="Sub Haul - Grass"
                  unitLabel="/1.5T"
                  currentValue={calc.shGrass}
                  onSaved={refreshAllRates}
                />
              </span>
            </p>
          )}
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-0.5">Dump Type</p>
          <Sel
            value={state.dispType ?? 'In-House'}
            onChange={e => set('dispType', e.target.value)}
            options={['In-House', 'Subcontractor']}
            disabled={isSub}
          />
          {isDumpSub && <p className="text-xs text-amber-600 mt-0.5">Sub haul charges apply</p>}
          {isSub && <p className="text-xs text-gray-400 mt-0.5">N/A — sub demos</p>}
        </div>
      </div>
      {/* Demolition */}
      <div>
        <div className="flex items-center flex-wrap gap-x-2 gap-y-1 text-xs font-bold text-gray-600 uppercase tracking-wider bg-gray-50 rounded-lg border border-gray-200 px-4 py-2.5 mt-4 mb-2">
          <span>Demolition</span>
          <span className="text-gray-400 font-normal">·</span>
          <span className="font-normal normal-case">Hand labor {calc.sfLaborRate} hr/100sf·in</span>
          <RateEditPopover
            table="labor_rates"
            name="Demo - Hand Removal (SF)"
            category="Demo"
            mode="coefficient"
            unitLabel="hr/100sf·in"
            currentValue={calc.sfLaborRate}
            onSaved={refreshAllRates}
          />
          {isSelf ? (
            <>
              <span className="text-gray-400 font-normal">·</span>
              <span className="font-normal normal-case">Container ${calc.containerPrice}</span>
              <RateEditPopover
                table="material_rates"
                name="Demo - Container (Low-Boy)"
                category="Demo"
                unitLabel="container"
                currentValue={calc.containerPrice}
                onSaved={refreshAllRates}
              />
              <span className="font-normal normal-case">/ {calc.containerCy} cy</span>
              <RateEditPopover
                table="material_rates"
                name="Demo - Container Capacity (CY)"
                category="Demo"
                mode="coefficient"
                unitLabel="cy"
                currentValue={calc.containerCy}
                onSaved={refreshAllRates}
              />
              <span className="font-normal normal-case">· ×{calc.swellFactor} swell</span>
              <RateEditPopover
                table="material_rates"
                name="Demo - Removal Swell"
                category="Demo"
                mode="coefficient"
                unitLabel="×"
                currentValue={calc.swellFactor}
                onSaved={refreshAllRates}
              />
            </>
          ) : (
            <span className="font-normal normal-case">· Sub Handles Removal</span>
          )}
        </div>
        <table className="w-full text-xs">
          <TH
            cols={[
              { label: 'Material', w: 'w-32' },
              { label: 'SF', w: 'w-24' },
              { label: 'Depth (in)', w: 'w-20' },
              { label: 'Tons', w: 'w-16' },
              ...(isSelf ? [{ label: 'Dump Fee', w: 'w-24' }] : []),
              { label: 'Labor Hrs', w: 'w-20' },
            ]}
          />
          <tbody className="divide-y divide-gray-50">
            {[
              {
                label: 'Concrete',
                sfK: 'concSF',
                dK: 'concDepth',
                dep: 4,
                row: calc.conc,
                fee: dumpConc,
                rate: calc.sfLaborRate,
                rateName: 'Demo - Hand Removal (SF)',
                rateNote: `${calc.sfLaborRate} hr/100sf·in`,
                rateUnit: 'hr/100sf·in',
              },
              {
                label: 'Dirt/Rock',
                sfK: 'dirtSF',
                dK: 'dirtDepth',
                dep: 6,
                row: calc.dirt,
                fee: dumpDirt,
                rate: calc.sfLaborRate,
                rateName: 'Demo - Hand Removal (SF)',
                rateNote: `${calc.sfLaborRate} hr/100sf·in`,
                rateUnit: 'hr/100sf·in',
              },
              {
                label: 'Import Base',
                sfK: 'baseSF',
                dK: 'baseDepth',
                dep: 4,
                row: calc.base,
                fee: 0,
                rate: calc.rateBase,
                rateName: 'Demo - Hand Import Base',
                rateNote: `${calc.rateBase} t/hr`,
              },
              {
                label: 'Grass/Sod',
                sfK: 'grassSF',
                dK: 'grassDepth',
                dep: 2,
                row: calc.grass,
                fee: dumpGreen,
                rate: calc.rateGrass,
                rateName: 'Demo - Hand Grass',
                rateNote: `${calc.rateGrass} t/hr`,
              },
            ].map(({ label, sfK, dK, dep, row, rate, rateName, rateNote, rateUnit, extraIcon }) => (
              <tr key={label}>
                <td className={`${td} font-medium text-gray-700`}>
                  <span className="inline-flex items-center gap-1">
                    {label}
                    <span className="text-gray-400 font-normal text-[10px]">({rateNote})</span>
                    <RateEditPopover
                      table="labor_rates"
                      name={rateName}
                      category="Demo"
                      mode="coefficient"
                      unitLabel={rateUnit || 't/hr'}
                      currentValue={rate}
                      onSaved={refreshAllRates}
                    />
                    {extraIcon}
                  </span>
                </td>
                <td className={td}>
                  <Inp value={state[sfK]} onChange={e => set(sfK, e.target.value)} />
                </td>
                <td className={td}>
                  <Inp
                    value={state[dK]}
                    onChange={e => set(dK, e.target.value)}
                    placeholder={String(dep)}
                  />
                </td>
                <td className={num}>{row.tons > 0 ? row.tons.toFixed(1) : '—'}</td>
                {isSelf && <td className={num}>{row.dumpFee > 0 ? fmt2(row.dumpFee) : '—'}</td>}
                <td className={num}>{fh(row.hours)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Rebar add-on */}
        <div className="mt-3 flex items-center gap-3">
          <div className="flex-1 max-w-xs">
            <p className="text-xs text-gray-500 mb-0.5 inline-flex items-center gap-1">
              Rebar SF
              <span className="text-gray-400 font-normal">
                ({calc.rebarMinPerSF} min/SF = {(calc.rebarMinPerSF / 60).toFixed(5)} hrs/SF)
              </span>
              <RateEditPopover
                table="labor_rates"
                name="Demo - Hand Rebar"
                category="Demo"
                mode="coefficient"
                unitLabel="min/SF"
                currentValue={calc.rebarMinPerSF}
                onSaved={refreshAllRates}
              />
            </p>
            <Inp
              value={state.rebarSF}
              onChange={e => set('rebarSF', e.target.value)}
              placeholder="0"
            />
          </div>
          {calc.rebarHrs > 0 && (
            <p className="text-xs text-gray-500 mt-4">+{calc.rebarHrs.toFixed(2)} hrs rebar</p>
          )}
        </div>
      </div>

      {/* Misc Flat */}
      <div>
        <div className="text-xs font-bold text-gray-600 uppercase tracking-wider bg-gray-50 rounded-lg border border-gray-200 px-4 py-2.5 mt-4 mb-2 flex items-center gap-2">
          <span>Misc Flat Demo — {calc.rateConc} t/hr (hand)</span>
          <RateEditPopover
            table="labor_rates"
            name="Demo - Hand Concrete/Dirt"
            category="Demo"
            mode="coefficient"
            unitLabel="t/hr"
            currentValue={calc.rateConc}
            onSaved={refreshAllRates}
          />
        </div>
        <table className="w-full text-xs">
          <TH
            cols={[
              { label: 'Description' },
              { label: 'SF', w: 'w-24' },
              { label: 'Depth (in)', w: 'w-20' },
              { label: 'Tons', w: 'w-16' },
              { label: 'Labor Hrs', w: 'w-20' },
            ]}
          />
          <tbody className="divide-y divide-gray-50">
            {state.miscFlatRows.map((r, i) => {
              const cr = calc.miscFlatCalc[i] || { tons: 0, hours: 0 }
              return (
                <tr key={i}>
                  <td className={td}>
                    <Inp
                      type="text"
                      value={r.label}
                      onChange={e => setRow('miscFlatRows', i, 'label', e.target.value)}
                      placeholder={`Item ${i + 1}`}
                    />
                  </td>
                  <td className={td}>
                    <Inp
                      value={r.sf}
                      onChange={e => setRow('miscFlatRows', i, 'sf', e.target.value)}
                    />
                  </td>
                  <td className={td}>
                    <Inp
                      value={r.depth}
                      onChange={e => setRow('miscFlatRows', i, 'depth', e.target.value)}
                      placeholder="4"
                    />
                  </td>
                  <td className={num}>{cr.tons > 0 ? cr.tons.toFixed(1) : '—'}</td>
                  <td className={num}>{fh(cr.hours)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Misc Vertical */}
      <div>
        <div className="text-xs font-bold text-gray-600 uppercase tracking-wider bg-gray-50 rounded-lg border border-gray-200 px-4 py-2.5 mt-4 mb-2 flex items-center gap-2">
          <span>
            Misc Vertical / Structural Demo — LF × Height × Width · {calc.rateConc} t/hr (hand)
          </span>
          <RateEditPopover
            table="labor_rates"
            name="Demo - Hand Concrete/Dirt"
            category="Demo"
            mode="coefficient"
            unitLabel="t/hr"
            currentValue={calc.rateConc}
            onSaved={refreshAllRates}
          />
        </div>
        <table className="w-full text-xs">
          <TH
            cols={[
              { label: 'Description' },
              { label: 'LF', w: 'w-20' },
              { label: 'H (in)', w: 'w-18' },
              { label: 'W (in)', w: 'w-18' },
              { label: 'Tons', w: 'w-16' },
              { label: 'Labor Hrs', w: 'w-20' },
            ]}
          />
          <tbody className="divide-y divide-gray-50">
            {state.miscVertRows.map((r, i) => {
              const cr = calc.miscVertCalc[i] || { tons: 0, hours: 0, cf: 0 }
              return (
                <tr key={i}>
                  <td className={td}>
                    <Inp
                      type="text"
                      value={r.label}
                      onChange={e => setRow('miscVertRows', i, 'label', e.target.value)}
                      placeholder={`Item ${i + 1}`}
                    />
                  </td>
                  <td className={td}>
                    <Inp
                      value={r.lf}
                      onChange={e => setRow('miscVertRows', i, 'lf', e.target.value)}
                    />
                  </td>
                  <td className={td}>
                    <Inp
                      value={r.heightIn}
                      onChange={e => setRow('miscVertRows', i, 'heightIn', e.target.value)}
                      placeholder="0"
                    />
                  </td>
                  <td className={td}>
                    <Inp
                      value={r.widthIn}
                      onChange={e => setRow('miscVertRows', i, 'widthIn', e.target.value)}
                      placeholder="8"
                    />
                  </td>
                  <td className={num}>{cr.tons > 0 ? cr.tons.toFixed(2) : '—'}</td>
                  <td className={num}>{fh(cr.hours)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Footing */}
      <div>
        <div className="text-xs font-bold text-gray-600 uppercase tracking-wider bg-gray-50 rounded-lg border border-gray-200 px-4 py-2.5 mt-4 mb-2 flex items-center gap-2">
          <span>Footing Demo — SF × Depth · {calc.rateConc} t/hr (hand)</span>
          <RateEditPopover
            table="labor_rates"
            name="Demo - Hand Concrete/Dirt"
            category="Demo"
            mode="coefficient"
            unitLabel="t/hr"
            currentValue={calc.rateConc}
            onSaved={refreshAllRates}
          />
        </div>
        <table className="w-full text-xs">
          <TH
            cols={[
              { label: 'Description' },
              { label: 'SF', w: 'w-24' },
              { label: 'Depth (in)', w: 'w-20' },
              { label: 'Tons', w: 'w-16' },
              { label: 'Labor Hrs', w: 'w-20' },
            ]}
          />
          <tbody className="divide-y divide-gray-50">
            {state.footingRows.map((r, i) => {
              const cr = calc.footingCalc[i] || { tons: 0, hours: 0 }
              return (
                <tr key={i}>
                  <td className={td}>
                    <Inp
                      type="text"
                      value={r.label}
                      onChange={e => setRow('footingRows', i, 'label', e.target.value)}
                      placeholder={`Footing ${i + 1}`}
                    />
                  </td>
                  <td className={td}>
                    <Inp
                      value={r.sf}
                      onChange={e => setRow('footingRows', i, 'sf', e.target.value)}
                    />
                  </td>
                  <td className={td}>
                    <Inp
                      value={r.depth}
                      onChange={e => setRow('footingRows', i, 'depth', e.target.value)}
                      placeholder="12"
                    />
                  </td>
                  <td className={num}>{cr.tons > 0 ? cr.tons.toFixed(2) : '—'}</td>
                  <td className={num}>{fh(cr.hours)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Hand Bucket Areas */}
      <div>
        <div className="text-xs font-bold text-gray-600 uppercase tracking-wider bg-gray-50 rounded-lg border border-gray-200 px-4 py-2.5 mt-4 mb-2 flex items-center gap-2">
          <span>Hand Bucket Areas — tight/confined access · {calc.rateBucket} t/hr</span>
          <RateEditPopover
            table="labor_rates"
            name="Demo - Hand Bucket"
            category="Demo"
            mode="coefficient"
            unitLabel="t/hr"
            currentValue={calc.rateBucket}
            onSaved={refreshAllRates}
          />
        </div>
        <table className="w-full text-xs">
          <TH
            cols={[
              { label: 'Description' },
              { label: 'SF', w: 'w-24' },
              { label: 'Depth (in)', w: 'w-20' },
              { label: 'Tons', w: 'w-16' },
              ...(isSelf ? [{ label: 'Dump Fee', w: 'w-24' }] : []),
              { label: 'Labor Hrs', w: 'w-20' },
            ]}
          />
          <tbody className="divide-y divide-gray-50">
            {state.bucketRows.map((r, i) => {
              const cr = calc.bucketCalc[i] || { tons: 0, hours: 0, dumpFee: 0 }
              return (
                <tr key={i}>
                  <td className={td}>
                    <Inp
                      type="text"
                      value={r.label}
                      onChange={e => setRow('bucketRows', i, 'label', e.target.value)}
                      placeholder={`Area ${i + 1}`}
                    />
                  </td>
                  <td className={td}>
                    <Inp
                      value={r.sf}
                      onChange={e => setRow('bucketRows', i, 'sf', e.target.value)}
                    />
                  </td>
                  <td className={td}>
                    <Inp
                      value={r.depth}
                      onChange={e => setRow('bucketRows', i, 'depth', e.target.value)}
                      placeholder="4"
                    />
                  </td>
                  <td className={num}>{cr.tons > 0 ? cr.tons.toFixed(1) : '—'}</td>
                  {isSelf && <td className={num}>{cr.dumpFee > 0 ? fmt2(cr.dumpFee) : '—'}</td>}
                  <td className={num}>{fh(cr.hours)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Grading */}
      <div>
        <div className="flex items-center gap-2 text-xs font-bold text-gray-600 uppercase tracking-wider bg-gray-50 rounded-lg border border-gray-200 px-4 py-2.5 mt-4 mb-2">
          Grading
        </div>
        <table className="w-full text-xs">
          <TH
            cols={[
              { label: 'Operation', w: 'w-40' },
              { label: 'SF', w: 'w-24' },
              { label: 'Depth (in)', w: 'w-20' },
              { label: 'Tons', w: 'w-16' },
              { label: 'Labor Hrs', w: 'w-20' },
            ]}
          />
          <tbody className="divide-y divide-gray-50">
            {[
              {
                label: 'Grade Cut',
                sfK: 'gradeCutSF',
                dK: 'gradeCutDepth',
                dep: 3,
                tons: calc.gradeCut.tons,
                hrs: calc.gradeCut.hours,
                note: `${calc.rateConc} t/hr`,
                rate: calc.rateConc,
                rateName: 'Demo - Hand Concrete/Dirt',
              },
              {
                label: 'Grade Fill',
                sfK: 'gradeFillSF',
                dK: 'gradeFillDepth',
                dep: 3,
                tons: calc.gradeFill.tons,
                hrs: calc.gradeFill.hours,
                note: `${calc.rateBase} t/hr`,
                rate: calc.rateBase,
                rateName: 'Demo - Hand Import Base',
              },
              {
                label: 'Jumping Jack',
                sfK: 'jjSF',
                dK: 'jjDepth',
                dep: 3,
                tons: calc.jjTons,
                hrs: calc.jjHrs,
                note: `${calc.rateJJ} t/hr`,
                rate: calc.rateJJ,
                rateName: 'Demo - JJ Compaction',
              },
            ].map(({ label, sfK, dK, dep, tons, hrs, note, rate, rateName }) => (
              <tr key={label}>
                <td className={`${td} font-medium text-gray-700`}>
                  <span className="inline-flex items-center gap-1">
                    {label}
                    <span className="text-gray-400 font-normal">({note})</span>
                    <RateEditPopover
                      table="labor_rates"
                      name={rateName}
                      category="Demo"
                      mode="coefficient"
                      unitLabel="t/hr"
                      currentValue={rate}
                      onSaved={refreshAllRates}
                    />
                  </span>
                </td>
                <td className={td}>
                  <Inp value={state[sfK]} onChange={e => set(sfK, e.target.value)} />
                </td>
                <td className={td}>
                  <Inp
                    value={state[dK]}
                    onChange={e => set(dK, e.target.value)}
                    placeholder={String(dep)}
                  />
                </td>
                <td className={num}>{tons > 0 ? tons.toFixed(1) : '—'}</td>
                <td className={num}>{fh(hrs)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Shrub & Stump */}
      <SecHdr title="Shrub & Stump Demo" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {[
          {
            label: 'Shrubs (qty)',
            key: 'shrubQty',
            hrs: calc.shrubHrs,
            sub: `${ACCESS_LEVELS[state.access]}× × ${calc.shrubRate} hrs/ea`,
            rate: calc.shrubRate,
            rateName: 'Demo - Shrub',
          },
          {
            label: 'Stump Grind 1st',
            key: 'stumpFirstQty',
            hrs: calc.stumpFstHrs,
            sub: `${ACCESS_LEVELS[state.access]}× × ${calc.stumpFstRate} hrs`,
            rate: calc.stumpFstRate,
            rateName: 'Demo - Stump 1st',
          },
          {
            label: "Stump Grind Add'l",
            key: 'stumpAddQty',
            hrs: calc.stumpAddHrs,
            sub: `${ACCESS_LEVELS[state.access]}× × ${calc.stumpAddRate} hrs`,
            rate: calc.stumpAddRate,
            rateName: 'Demo - Stump Additional',
          },
        ].map(({ label, key, hrs, sub, rate, rateName }) => (
          <div key={key}>
            <p className="text-xs text-gray-500 mb-0.5 inline-flex items-center gap-1">
              {label}
              <RateEditPopover
                table="labor_rates"
                name={rateName}
                category="Demo"
                mode="coefficient"
                unitLabel="hrs/ea"
                currentValue={rate}
                onSaved={refreshAllRates}
              />
            </p>
            <Inp value={state[key]} onChange={e => set(key, e.target.value)} />
            <p className="text-xs text-gray-400 mt-0.5">
              {hrs > 0 ? `${hrs.toFixed(2)} hrs — ${sub}` : sub}
            </p>
          </div>
        ))}
        {/* Shrubs by square footage — density (1–5) × rate per 100 SF */}
        <div>
          <p className="text-xs text-gray-500 mb-0.5 inline-flex items-center gap-1">
            Shrubs (Density × Sq Ft)
            <RateEditPopover
              table="labor_rates"
              name="Demo - Shrub SqFt (Hand)"
              category="Demo"
              mode="coefficient"
              unitLabel="hrs/100sf"
              currentValue={calc.shrubSfRate}
              onSaved={refreshAllRates}
            />
            <RateEditPopover
              table="material_rates"
              name="Demo - Shrub SqFt"
              category="Demo"
              unitLabel="$/100sf"
              currentValue={calc.shrubSfMatRate}
              onSaved={refreshAllRates}
            />
          </p>
          <div className="flex gap-2">
            <select
              value={state.shrubDensity}
              onChange={e => set('shrubDensity', e.target.value)}
              title="Density"
              className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
            >
              {[1, 2, 3, 4, 5].map(d => (
                <option key={d} value={d}>
                  Density {d}
                </option>
              ))}
            </select>
            <Inp value={state.shrubSqFt} onChange={e => set('shrubSqFt', e.target.value)} />
          </div>
          <p className="text-xs text-gray-400 mt-0.5">
            {calc.shrubSfHrs > 0
              ? `${calc.shrubSfHrs.toFixed(2)} hrs · $${calc.shrubSfMat.toFixed(2)} mat`
              : `Density × ${calc.shrubSfRate} hrs & $${calc.shrubSfMatRate} per 100 SF`}
          </p>
        </div>
      </div>

      {/* Trees */}
      <div>
        <div className="flex items-center flex-wrap gap-x-2 gap-y-1 text-xs font-bold text-gray-600 uppercase tracking-wider bg-gray-50 rounded-lg border border-gray-200 px-4 py-2.5 mt-4 mb-2">
          <span>
            Tree Demo — qty × height × {ACCESS_LEVELS[state.access]}× access × size multiplier
          </span>
          <span className="font-normal normal-case text-gray-400 inline-flex items-center gap-1">
            (S:{calc.treeSmall}
            <RateEditPopover
              table="labor_rates"
              name="Demo - Tree Small"
              category="Demo"
              mode="coefficient"
              unitLabel="hrs/ft"
              currentValue={calc.treeSmall}
              onSaved={refreshAllRates}
            />
            · M:{calc.treeMed}
            <RateEditPopover
              table="labor_rates"
              name="Demo - Tree Medium"
              category="Demo"
              mode="coefficient"
              unitLabel="hrs/ft"
              currentValue={calc.treeMed}
              onSaved={refreshAllRates}
            />
            · L:{calc.treeLarge}
            <RateEditPopover
              table="labor_rates"
              name="Demo - Tree Large"
              category="Demo"
              mode="coefficient"
              unitLabel="hrs/ft"
              currentValue={calc.treeLarge}
              onSaved={refreshAllRates}
            />
            hrs/ft)
          </span>
          {isSelf && (
            <span className="font-normal normal-case text-gray-400 inline-flex items-center gap-1">
              · Tree dump
              <RateEditPopover
                table="material_rates"
                name="Dump Fee - Tree/Stump"
                category="Demo"
                unitLabel="ton"
                currentValue={
                  materialPrices['Dump Fee - Tree/Stump'] ??
                  DUMP_FEE_DEFAULTS['Dump Fee - Tree/Stump']
                }
                onSaved={refreshAllRates}
              />
            </span>
          )}
        </div>
        <table className="w-full text-xs">
          <TH
            cols={[
              { label: 'Qty', w: 'w-16' },
              { label: 'Height (ft)', w: 'w-24' },
              { label: 'Size', w: 'w-28' },
              { label: 'Labor Hrs', w: 'w-20' },
              ...(isSelf ? [{ label: 'Tree Dump', w: 'w-24' }] : []),
            ]}
          />
          <tbody className="divide-y divide-gray-50">
            {state.treeRows.map((r, i) => {
              const cr = calc.treeCalc[i] || { hrs: 0, dumpFee: 0 }
              return (
                <tr key={i}>
                  <td className={td}>
                    <Inp
                      value={r.qty}
                      onChange={e => setRow('treeRows', i, 'qty', e.target.value)}
                    />
                  </td>
                  <td className={td}>
                    <Inp
                      value={r.height}
                      onChange={e => setRow('treeRows', i, 'height', e.target.value)}
                      placeholder="10"
                    />
                  </td>
                  <td className={td}>
                    <Sel
                      value={r.size}
                      onChange={e => setRow('treeRows', i, 'size', e.target.value)}
                      options={['Small', 'Medium', 'Large']}
                    />
                  </td>
                  <td className={num}>{fh(cr.hrs)}</td>
                  {isSelf && <td className={num}>{cr.dumpFee > 0 ? fmt2(cr.dumpFee) : '—'}</td>}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Manual */}
      <div>
        <div className="flex items-center gap-2 text-xs font-bold text-gray-600 uppercase tracking-wider bg-gray-50 rounded-lg border border-gray-200 px-4 py-2.5 mt-4 mb-2">
          Manual Entry
        </div>
        <table className="w-full text-xs">
          <TH
            cols={[
              { label: 'Description' },
              { label: 'Hours', w: 'w-20' },
              { label: 'Materials ($)', w: 'w-28' },
              { label: 'Sub Cost ($)', w: 'w-28' },
            ]}
          />
          <tbody className="divide-y divide-gray-50">
            {state.manualRows.map((r, i) => (
              <tr key={i}>
                <td className={td}>
                  <Inp
                    type="text"
                    value={r.label}
                    onChange={e => setRow('manualRows', i, 'label', e.target.value)}
                    placeholder="Description"
                  />
                </td>
                <td className={td}>
                  <Inp
                    value={r.hours}
                    onChange={e => setRow('manualRows', i, 'hours', e.target.value)}
                    step="0.5"
                  />
                </td>
                <td className={td}>
                  <Inp
                    value={r.materials}
                    onChange={e => setRow('manualRows', i, 'materials', e.target.value)}
                    step="1"
                  />
                </td>
                <td className={td}>
                  <Inp
                    value={r.subCost}
                    onChange={e => setRow('manualRows', i, 'subCost', e.target.value)}
                    step="1"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <button
          onClick={handleSave}
          className="flex-1 bg-gray-900 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-gray-700 transition-colors"
        >
          Save Module
        </button>
        <button
          onClick={onCancel}
          className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
