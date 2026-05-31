// ─────────────────────────────────────────────────────────────────────────────
// SkidSteerDemoModule — Full Skid Steer Demo estimator
//
// All labor rates pulled from labor_rates table (lr[]) with constant fallbacks.
// Rate keys match the 'name' column in labor_rates exactly.
//
// Key formulas:
//   • 2.0 tons/hr for conc/dirt ALREADY includes haul — no separate haulHrs
//   • JJ compaction: hours = tons / 1.75  (1.75 is tons/hr, not hrs/ton)
//   • Misc Vertical: LF × Height(in) × Width(in) → CF → tons (150 lb/cf)
//   • Footing: SF × Depth(in) → tons (same as flat)
//   • Rebar add-on: SF × (lr['Demo - Rebar'] min/SF) / 60 → hrs
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import GpmdBar from './GpmdBar'
import ModuleNotesField from './ModuleNotesField'
import RateEditPopover from '../RateEditPopover'
import { fetchSalesTaxRate } from '../../lib/companyDefaults'
import {
  calcWalkAccessTrips,
  DEFAULT_WALK_ACCESS_PACE_LF_PER_MIN,
  DEFAULT_BOBCAT_BASELINE_LF,
} from '../../lib/walkAccess'

// Bobcat bucket capacity (lbs) — drives `trips = totalTons × 2000 / bucket`
// for the walk-access shuttle penalty. Matches Excel master rates.
const BOBCAT_BUCKET_LBS = 1600

// ── Fallback constants (used when DB rate not yet loaded or missing) ──────────

const ACCESS_LEVELS = { Poor: 0.5, OK: 0.75, Full: 1.0 }
const DEMO_TYPES = ['In-House', 'Subcontractor']

// Default rates — DB values (lr[]) take precedence at calc time
const RATE_DEFAULTS = {
  concrete: 2.0, // 'Demo - Skid Steer Concrete/Dirt'
  grass: 2.1, // 'Demo - Skid Steer Grass'
  importBase: 10.0, // 'Demo - Skid Steer Import Base'
  jj: 1.75, // 'Demo - JJ Compaction'
  ssCompact: 7.0, // 'Demo - SS Compaction'
  rebarMin: 0.05, // 'Demo - Rebar'  (min/SF)
  shrub: 0.75, // 'Demo - Shrub'
  stumpFst: 2.5, // 'Demo - Stump 1st'
  stumpAdd: 0.75, // 'Demo - Stump Additional'
  treeSmall: 0.1, // 'Demo - Tree Small'
  treeMed: 0.15, // 'Demo - Tree Medium'
  treeLarge: 0.2, // 'Demo - Tree Large'
}

// Sub Haul (Dump Type = Subcontractor, Demo Type = In-House)
// Labor unchanged; dump fees replaced by per-1.5-ton sub haul charges
const SUB_HAUL_DEFAULTS = {
  concrete: 85, // $/1.5T — concrete, misc flat/vert, footing
  dirt: 95, // $/1.5T — dirt/rock, grade cut
  grass: 120, // $/1.5T — grass/sod
}

// Subcontractor Demo rates — concrete/dirt/misc/footing/gradeCut billed per ton removed
// grass and import base remain per SF
const SUB_RATES = {
  concrete: 175, // $/ton  (concrete demo removal)
  dirt: 135, // $/ton  (dirt/rock removal)
  importBase: 1.5, // $/SF   (unchanged)
  grass: 1.75, // $/SF   (unchanged)
  miscFlat: 175, // $/ton  (same as concrete)
  gradeCut: 135, // $/ton  (same as dirt)
}

const DUMP_FEE_DEFAULTS = {
  'Dump Fee - Concrete': 36.21,
  'Dump Fee - Dirt': 36.21,
  'Dump Fee - Green Waste': 72.19,
}

// ── Calculation engine ────────────────────────────────────────────────────────

const n = v => parseFloat(v) || 0
const sfToTons = (sf, depthIn) => (n(sf) / 200) * n(depthIn)

function calcDemo(
  state,
  laborRatePerHour,
  materialPrices,
  laborRates,
  subMarkupRate = 0.35,
  subRates = {},
  gpmd = 425,
  walkAccess = null
) {
  const _pace = parseFloat(walkAccess?.paceLfPerMin) || DEFAULT_WALK_ACCESS_PACE_LF_PER_MIN
  const mp = materialPrices || {}
  const lr = laborRates || {}
  const sr = subRates || {}
  const access = ACCESS_LEVELS[state.access] || 0.75
  const isSub = state.dumpType === 'Subcontractor' // Demo Type = Sub
  const isDumpSub = !isSub && state.dispType === 'Subcontractor' // Dump Type = Sub (Demo must be In-House)
  const lrph = n(laborRatePerHour) || 35
  const diff = 1 + n(state.difficulty) / 100
  const hrsAdj = n(state.hoursAdj)

  // ── Pull rates from DB (lr) with fallbacks ────────────────────────────────
  const rateConc = lr['Demo - Skid Steer Concrete/Dirt'] ?? RATE_DEFAULTS.concrete
  const rateGrass = lr['Demo - Skid Steer Grass'] ?? RATE_DEFAULTS.grass
  const rateBase = lr['Demo - Skid Steer Import Base'] ?? RATE_DEFAULTS.importBase
  const rateJJ = lr['Demo - JJ Compaction'] ?? RATE_DEFAULTS.jj
  const rateSSCmp = lr['Demo - SS Compaction'] ?? RATE_DEFAULTS.ssCompact
  const rebarMinPerSF = lr['Demo - Rebar'] ?? RATE_DEFAULTS.rebarMin
  const shrubRate = lr['Demo - Shrub'] ?? RATE_DEFAULTS.shrub
  const stumpFstRate = lr['Demo - Stump 1st'] ?? RATE_DEFAULTS.stumpFst
  const stumpAddRate = lr['Demo - Stump Additional'] ?? RATE_DEFAULTS.stumpAdd
  const treeSmall = lr['Demo - Tree Small'] ?? RATE_DEFAULTS.treeSmall
  const treeMed = lr['Demo - Tree Medium'] ?? RATE_DEFAULTS.treeMed
  const treeLarge = lr['Demo - Tree Large'] ?? RATE_DEFAULTS.treeLarge

  const dumpConc = mp['Dump Fee - Concrete'] ?? DUMP_FEE_DEFAULTS['Dump Fee - Concrete']
  const dumpDirt = mp['Dump Fee - Dirt'] ?? DUMP_FEE_DEFAULTS['Dump Fee - Dirt']
  const dumpGreen = mp['Dump Fee - Green Waste'] ?? DUMP_FEE_DEFAULTS['Dump Fee - Green Waste']

  // ── Helpers ───────────────────────────────────────────────────────────────
  // Flat: SF × Depth → tons → hours = tons / (baseRate × access)
  function flat(sf, depthIn, baseRate, dumpFeePerTon = 0) {
    const tons = sfToTons(sf, depthIn)
    if (!tons) return { tons: 0, hours: 0, dumpFee: 0 }
    const hours = isSub ? 0 : tons / (baseRate * access)
    const dumpFee = isSub || isDumpSub ? 0 : tons * dumpFeePerTon
    return { tons, hours, dumpFee }
  }

  // Vertical: LF × Height(in) × Width(in) → CF → tons (concrete 150 lb/cf)
  function vert(lf, heightIn, widthIn, baseRate, dumpFeePerTon = 0) {
    const cf = n(lf) * (n(heightIn) / 12) * (n(widthIn) / 12)
    const tons = (cf * 150) / 2000
    if (!tons) return { tons: 0, cf: 0, hours: 0, dumpFee: 0 }
    const hours = isSub ? 0 : tons / (baseRate * access)
    const dumpFee = isSub || isDumpSub ? 0 : tons * dumpFeePerTon
    return { tons, cf, hours, dumpFee }
  }

  // ── Demo rows ────────────────────────────────────────────────────────────
  const conc = flat(state.concSF, state.concDepth || 4, rateConc, dumpConc)
  const dirt = flat(state.dirtSF, state.dirtDepth || 6, rateConc, dumpDirt)
  const base = flat(state.baseSF, state.baseDepth || 4, rateBase, 0)
  const grass = flat(state.grassSF, state.grassDepth || 2, rateGrass, dumpGreen)

  // Misc rows use same base rate as concrete/dirt (no preset dump fee for full SS)
  const miscFlatCalc = (state.miscFlatRows || []).map(r => flat(r.sf, r.depth || 4, rateConc, 0))
  const miscVertCalc = (state.miscVertRows || []).map(r =>
    vert(r.lf, r.heightIn || 0, r.widthIn || 8, rateConc, 0)
  )
  const footingCalc = (state.footingRows || []).map(r => flat(r.sf, r.depth || 12, rateConc, 0))

  // ── Grading ──────────────────────────────────────────────────────────────
  const gradeCut = flat(state.gradeCutSF, state.gradeCutDepth || 3, rateConc, dumpDirt)
  const gradeFill = flat(state.gradeFillSF, state.gradeFillDepth || 3, rateBase, 0)

  const jjTons = sfToTons(state.jjSF, state.jjDepth || 3)
  const ssCmpTons = sfToTons(state.ssCmpSF, state.ssCmpDepth || 3)
  const jjHrs = jjTons > 0 ? jjTons / rateJJ : 0 // no access mod
  const ssCmpHrs = ssCmpTons > 0 ? ssCmpTons / rateSSCmp : 0 // no access mod

  // ── Rebar add-on ─────────────────────────────────────────────────────────
  const rebarHrs = n(state.rebarSF) * (rebarMinPerSF / 60)

  // ── Vegetation ───────────────────────────────────────────────────────────
  const shrubHrs = n(state.shrubQty) * access * shrubRate
  const shrubSfHrs = n(state.shrubSqFt) * 0.02
  const shrubSfMat = n(state.shrubSqFt) * 0.8
  const stumpFstHrs = n(state.stumpFirstQty) * access * stumpFstRate
  const stumpAddHrs = n(state.stumpAddQty) * access * stumpAddRate

  const treeCalc = (state.treeRows || []).map(r => {
    const qty = n(r.qty),
      ht = n(r.height) || 10
    const mult = r.size === 'Large' ? treeLarge : r.size === 'Medium' ? treeMed : treeSmall
    const hrs = qty * ht * access * mult
    const tons = qty * (ht / 10) * 0.25
    const dumpFee = isSub || isDumpSub ? 0 : tons * dumpGreen
    return { hrs, tons, dumpFee }
  })

  // ── Manual entry ─────────────────────────────────────────────────────────
  const manualRows = (state.manualRows || []).filter(
    r => n(r.hours) > 0 || n(r.materials) > 0 || n(r.subCost) > 0
  )
  const manualHrs = manualRows.reduce((s, r) => s + n(r.hours), 0)
  const manualMat = manualRows.reduce((s, r) => s + n(r.materials), 0)
  const manualSub = manualRows.reduce((s, r) => s + n(r.subCost), 0)

  // ── Sub rates — DB values take precedence over hardcoded fallbacks ───────────
  // Concrete/dirt/misc/footing/gradeCut → $/CY  |  grass/base → $/SF
  const srConc = sr['Sub Demo - Concrete'] ?? SUB_RATES.concrete
  const srDirt = sr['Sub Demo - Dirt/Rock'] ?? SUB_RATES.dirt
  const srBase = sr['Sub Demo - Import Base'] ?? SUB_RATES.importBase
  const srGrass = sr['Sub Demo - Grass/Sod'] ?? SUB_RATES.grass
  const srMiscFlat = sr['Sub Demo - Misc Flat'] ?? SUB_RATES.miscFlat
  const srGradeCut = sr['Sub Demo - Grade Cut'] ?? SUB_RATES.gradeCut

  // ── Subcontractor cost (ton-based for concrete & dirt items) ─────────────────
  const subDumpCost = isSub
    ? // Concrete — $/ton
      sfToTons(state.concSF, state.concDepth || 4) * srConc +
      // Dirt/Rock — $/ton
      sfToTons(state.dirtSF, state.dirtDepth || 6) * srDirt +
      // Import Base — $/SF (no depth, stays SF-based)
      n(state.baseSF) * srBase +
      // Grass/Sod — $/SF (stays SF-based)
      n(state.grassSF) * srGrass +
      // Misc Flat — $/ton (concrete rate)
      (state.miscFlatRows || []).reduce(
        (s, r) => s + sfToTons(r.sf, r.depth || 4) * srMiscFlat,
        0
      ) +
      // Misc Vert — $/ton (concrete rate), tons from LF × H × W → CF → 150 lb/cf
      (state.miscVertRows || []).reduce((s, r) => {
        const cf = n(r.lf) * (n(r.heightIn || 0) / 12) * (n(r.widthIn || 8) / 12)
        const tons = (cf * 150) / 2000
        return s + tons * srConc
      }, 0) +
      // Footing — $/ton (concrete rate)
      (state.footingRows || []).reduce((s, r) => s + sfToTons(r.sf, r.depth || 12) * srConc, 0) +
      // Grade Cut — $/ton (dirt rate)
      sfToTons(state.gradeCutSF, state.gradeCutDepth || 3) * srGradeCut
    : 0

  // ── Sub Haul cost (Dump Type = Subcontractor, Demo Type = In-House) ──────────
  // Labor unchanged; dump fees zeroed; per-1.5-ton sub haul charges applied
  // DB values (subcontractor_rates category='Sub Haul') take precedence over defaults
  const shConc = sr['Sub Haul - Concrete'] ?? SUB_HAUL_DEFAULTS.concrete
  const shDirt = sr['Sub Haul - Dirt'] ?? SUB_HAUL_DEFAULTS.dirt
  const shGrass = sr['Sub Haul - Grass'] ?? SUB_HAUL_DEFAULTS.grass
  const tonsPerCharge = 1.5
  const subHaulCost = isDumpSub
    ? (conc.tons / tonsPerCharge) * shConc +
      (dirt.tons / tonsPerCharge) * shDirt +
      (grass.tons / tonsPerCharge) * shGrass +
      miscFlatCalc.reduce((s, r) => s + (r.tons / tonsPerCharge) * shConc, 0) +
      miscVertCalc.reduce((s, r) => s + (r.tons / tonsPerCharge) * shConc, 0) +
      footingCalc.reduce((s, r) => s + (r.tons / tonsPerCharge) * shConc, 0) +
      (gradeCut.tons / tonsPerCharge) * shDirt +
      treeCalc.reduce((s, r) => s + (r.tons / tonsPerCharge) * shGrass, 0)
    : 0

  // ── Hour aggregation ──────────────────────────────────────────────────────
  const crewDemoHrs = isSub
    ? 0
    : conc.hours +
      dirt.hours +
      base.hours +
      grass.hours +
      miscFlatCalc.reduce((s, r) => s + r.hours, 0) +
      miscVertCalc.reduce((s, r) => s + r.hours, 0) +
      footingCalc.reduce((s, r) => s + r.hours, 0) +
      gradeCut.hours
  const gradingHrs = gradeFill.hours + jjHrs + ssCmpHrs
  const vegHrs = shrubHrs + shrubSfHrs + stumpFstHrs + stumpAddHrs + treeCalc.reduce((s, r) => s + r.hrs, 0)

  // ── Walk-access (Truck → Work Area) — trip-based for bobcat demo ───────
  // Excel: S4 = (F6 - BobcatTravel) × N4 × 2 × (1/60/60)
  // where N4 = total tons × 2000 / BobcatBucket. Sub-only jobs (isSub) skip
  // the shuttle since the sub handles haul.
  const totalDemoTons = isSub
    ? 0
    : conc.tons +
      dirt.tons +
      grass.tons +
      miscFlatCalc.reduce((s, r) => s + r.tons, 0) +
      miscVertCalc.reduce((s, r) => s + r.tons, 0) +
      footingCalc.reduce((s, r) => s + r.tons, 0) +
      gradeCut.tons +
      treeCalc.reduce((s, r) => s + r.tons, 0)
  const bobcatTrips = totalDemoTons > 0 ? (totalDemoTons * 2000) / BOBCAT_BUCKET_LBS : 0
  const walkHrs = calcWalkAccessTrips(bobcatTrips, state.distanceLF, {
    paceLfPerMin: _pace,
    baselineLF: DEFAULT_BOBCAT_BASELINE_LF,
  })

  const rawHrs = crewDemoHrs + gradingHrs + vegHrs + rebarHrs + manualHrs
  const totalHrs = rawHrs * diff + hrsAdj + walkHrs

  // ── Materials (dump fees — Self Haul mode) ────────────────────────────────
  const dumpMatCost = isSub
    ? 0
    : conc.dumpFee +
      dirt.dumpFee +
      grass.dumpFee +
      miscFlatCalc.reduce((s, r) => s + r.dumpFee, 0) +
      miscVertCalc.reduce((s, r) => s + r.dumpFee, 0) +
      footingCalc.reduce((s, r) => s + r.dumpFee, 0) +
      gradeCut.dumpFee +
      treeCalc.reduce((s, r) => s + r.dumpFee, 0)
  const totalMat = dumpMatCost + manualMat + shrubSfMat

  // ── Financials ────────────────────────────────────────────────────────────
  const manDays = totalHrs / 8
  const laborCost = totalHrs * lrph
  const burden = laborCost * 0.29
  // GP = labor component + Universal Sub Markup % on all sub costs
  const gp = manDays * gpmd + (subDumpCost + subHaulCost) * subMarkupRate
  const commission = gp * 0.12
  const subCost = subDumpCost + subHaulCost + manualSub
  const price = laborCost + burden + totalMat + gp + commission + subCost

  return {
    walkHrs,
    bobcatTrips,
    totalDemoTons,
    totalHrs,
    manDays,
    laborCost,
    burden,
    totalMat,
    subCost,
    gp,
    commission,
    price,
    conc,
    dirt,
    base,
    grass,
    miscFlatCalc,
    miscVertCalc,
    footingCalc,
    gradeCut,
    gradeFill,
    jjTons,
    ssCmpTons,
    jjHrs,
    ssCmpHrs,
    rebarHrs,
    shrubHrs,
    shrubSfHrs,
    shrubSfMat,
    stumpFstHrs,
    stumpAddHrs,
    shrubRate,
    stumpFstRate,
    stumpAddRate,
    treeCalc,
    crewDemoHrs,
    gradingHrs,
    vegHrs,
    manualHrs,
    dumpMatCost,
    isSub,
    isDumpSub,
    subDumpCost,
    subHaulCost,
    // expose resolved rates for UI display
    rateConc,
    rateGrass,
    rateBase,
    rateJJ,
    rateSSCmp,
    rebarMinPerSF,
    treeSmall,
    treeMed,
    treeLarge,
    srConc,
    srDirt,
    srBase,
    srGrass,
    srMiscFlat,
    srGradeCut,
    shConc,
    shDirt,
    shGrass,
  }
}

// ── Default state ─────────────────────────────────────────────────────────────

const DEFAULT_STATE = {
  access: 'OK',
  dumpType: 'In-House', // Demo Type: In-House | Subcontractor
  dispType: 'In-House', // Dump Type:  In-House | Subcontractor (only active when Demo=In-House)
  difficulty: 0,
  crewType: 'Demo',
  hoursAdj: 0,
  distanceLF: '', // Avg truck → work area (LF) for walk-access penalty
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
  // Grading
  gradeCutSF: '',
  gradeCutDepth: 3,
  gradeFillSF: '',
  gradeFillDepth: 3,
  jjSF: '',
  jjDepth: 3,
  ssCmpSF: '',
  ssCmpDepth: 3,
  // Vegetation
  shrubQty: '',
  shrubSqFt: '',
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

function Sel({ value, onChange, options, disabled = false }) {
  return (
    <select
      value={value}
      onChange={onChange}
      disabled={disabled}
      className={`w-full border border-gray-200 rounded-md px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-400 ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
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

export default function SkidSteerDemoModule({ initialData, onSave, onCancel, onSwitchType }) {
  const [state, setState] = useState(() => ({ ...DEFAULT_STATE, ...(initialData || {}) }))

  // Free-text notes for this module — Sam writes auto-generated
  // takeoffs here via create_estimate_from_takeoff, and the user can
  // overwrite / append their own.
  const [notes, setNotes] = useState(initialData?.notes ?? '')
  const [materialPrices, setMaterialPrices] = useState(initialData?.materialPrices || {})
  const [laborRates, setLaborRates] = useState(initialData?.laborRates || {})
  const [laborRatePerHour, setLaborRatePerHour] = useState(initialData?.laborRatePerHour ?? 35)
  const [walkAccess, setWalkAccess] = useState(
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
      supabase
        .from('subcontractor_rates')
        .select('company_name,rate')
        .in('category', ['Demo', 'Sub Haul']),
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
            .select('labor_rate_per_hour, sub_markup_rate, walk_access_pace_lf_per_min')
            .maybeSingle()
            .single()
            .then(({ data }) => {
              if (!gone && data) {
                if (data.labor_rate_per_hour != null)
                  setLaborRatePerHour(parseFloat(data.labor_rate_per_hour) || 35)
                if (data.sub_markup_rate != null)
                  setSubMarkupRate(parseFloat(data.sub_markup_rate) || 0.35)
                if (data.walk_access_pace_lf_per_min != null) {
                  const _wpace = parseFloat(data.walk_access_pace_lf_per_min)
                  setWalkAccess({
                    paceLfPerMin:
                      Number.isFinite(_wpace) && _wpace > 0
                        ? _wpace
                        : DEFAULT_WALK_ACCESS_PACE_LF_PER_MIN,
                  })
                }
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
    walkAccess
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
  // isSelf = fully in-house (no sub involvement in demo or dump)
  const isDemoSub = state.dumpType === 'Subcontractor'
  const isDumpSub = !isDemoSub && state.dispType === 'Subcontractor'
  const isSelf = !isDemoSub && !isDumpSub

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
        laborRatePerHour,
        gpmd,
        materialPrices,
        laborRates,
        walkAccess,
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
                    onSwitchType?.('Hand Demo', {
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
                  Hand Demo
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
          {calc.walkHrs > 0 && (
            <p className="text-[10px] text-gray-500 mt-0.5">
              +{calc.walkHrs.toFixed(2)} hrs walk-access
            </p>
          )}
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
            options={DEMO_TYPES}
          />
          {isDemoSub && <p className="text-xs text-amber-600 mt-0.5">Sub handles removal</p>}
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-0.5">Dump Type</p>
          <Sel
            value={state.dispType ?? 'In-House'}
            onChange={e => set('dispType', e.target.value)}
            options={['In-House', 'Subcontractor']}
            disabled={isDemoSub}
          />
          {isDumpSub && <p className="text-xs text-amber-600 mt-0.5">Sub haul charges apply</p>}
          {isDemoSub && <p className="text-xs text-gray-400 mt-0.5">N/A — sub demos</p>}
        </div>
      </div>
      {/* Demolition */}
      <div>
        <div className="flex items-center flex-wrap gap-x-2 gap-y-1 text-xs font-bold text-gray-600 uppercase tracking-wider bg-gray-50 rounded-lg border border-gray-200 px-4 py-2.5 mt-4 mb-2">
          <span>Demolition — {calc.rateConc} tons/hr</span>
          <RateEditPopover
            table="labor_rates"
            name="Demo - Skid Steer Concrete/Dirt"
            category="Demo"
            mode="coefficient"
            unitLabel="t/hr"
            currentValue={calc.rateConc}
            onSaved={refreshAllRates}
          />
          {isDemoSub ? (
            <span className="font-normal normal-case">· Sub Handles Removal</span>
          ) : isDumpSub ? (
            <span className="font-normal normal-case inline-flex items-center flex-wrap gap-x-1">
              · Sub Haul:
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
            </span>
          ) : (
            <>
              <span className="font-normal normal-case">· Conc ${dumpConc}/ton</span>
              <RateEditPopover
                table="material_rates"
                name="Dump Fee - Concrete"
                category="Demo"
                unitLabel="ton"
                currentValue={dumpConc}
                onSaved={refreshAllRates}
              />
              <span className="font-normal normal-case">· Dirt ${dumpDirt}/ton</span>
              <RateEditPopover
                table="material_rates"
                name="Dump Fee - Dirt"
                category="Demo"
                unitLabel="ton"
                currentValue={dumpDirt}
                onSaved={refreshAllRates}
              />
            </>
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
                rate: calc.rateConc,
                rateName: 'Demo - Skid Steer Concrete/Dirt',
                rateNote: `${calc.rateConc} t/hr`,
              },
              {
                label: 'Dirt/Rock',
                sfK: 'dirtSF',
                dK: 'dirtDepth',
                dep: 6,
                row: calc.dirt,
                fee: dumpDirt,
                rate: calc.rateConc,
                rateName: 'Demo - Skid Steer Concrete/Dirt',
                rateNote: `${calc.rateConc} t/hr`,
              },
              {
                label: 'Import Base',
                sfK: 'baseSF',
                dK: 'baseDepth',
                dep: 4,
                row: calc.base,
                fee: 0,
                rate: calc.rateBase,
                rateName: 'Demo - Skid Steer Import Base',
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
                rateName: 'Demo - Skid Steer Grass',
                rateNote: `${calc.rateGrass} t/hr · $${dumpGreen}/ton green waste`,
                extraIcon: (
                  <RateEditPopover
                    table="material_rates"
                    name="Dump Fee - Green Waste"
                    category="Demo"
                    unitLabel="ton"
                    currentValue={dumpGreen}
                    onSaved={refreshAllRates}
                  />
                ),
              },
            ].map(({ label, sfK, dK, dep, row, rate, rateName, rateNote, extraIcon }) => (
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
                      unitLabel="t/hr"
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
                name="Demo - Rebar"
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
          <span>Misc Flat Demo — {calc.rateConc} t/hr</span>
          <RateEditPopover
            table="labor_rates"
            name="Demo - Skid Steer Concrete/Dirt"
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
          <span>Misc Vertical / Structural Demo — LF × Height × Width · {calc.rateConc} t/hr</span>
          <RateEditPopover
            table="labor_rates"
            name="Demo - Skid Steer Concrete/Dirt"
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
          <span>Footing Demo — SF × Depth · {calc.rateConc} t/hr</span>
          <RateEditPopover
            table="labor_rates"
            name="Demo - Skid Steer Concrete/Dirt"
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

      {/* Grading */}
      <div>
        <div className="flex items-center gap-2 text-xs font-bold text-gray-600 uppercase tracking-wider bg-gray-50 rounded-lg border border-gray-200 px-4 py-2.5 mt-4 mb-2">
          Grading
        </div>
        <table className="w-full text-xs">
          <TH
            cols={[
              { label: 'Operation', w: 'w-36' },
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
                rateName: 'Demo - Skid Steer Concrete/Dirt',
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
                rateName: 'Demo - Skid Steer Import Base',
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
              {
                label: 'SS Compact',
                sfK: 'ssCmpSF',
                dK: 'ssCmpDepth',
                dep: 3,
                tons: calc.ssCmpTons,
                hrs: calc.ssCmpHrs,
                note: `${calc.rateSSCmp} t/hr`,
                rate: calc.rateSSCmp,
                rateName: 'Demo - SS Compaction',
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
        {/* Shrubs by square footage — labor + $0.80/SF material */}
        <div>
          <p className="text-xs text-gray-500 mb-0.5">Shrubs (Sq Ft)</p>
          <Inp value={state.shrubSqFt} onChange={e => set('shrubSqFt', e.target.value)} />
          <p className="text-xs text-gray-400 mt-0.5">
            {calc.shrubSfHrs > 0
              ? `${calc.shrubSfHrs.toFixed(2)} hrs · $${calc.shrubSfMat.toFixed(2)} mat`
              : 'Labor + $0.80/SF material'}
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
              · Green waste
              <RateEditPopover
                table="material_rates"
                name="Dump Fee - Green Waste"
                category="Demo"
                unitLabel="ton"
                currentValue={dumpGreen}
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
              ...(isSelf ? [{ label: 'Green Waste', w: 'w-24' }] : []),
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
