import WorkTypeChooser from './WorkTypeChooser'
import CrewTypeBar from './CrewTypeBar'
import ModuleHeaderSlot from './ModuleHeaderSlot'
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
import { useState, useEffect, useCallback, useContext } from 'react'
import { SubTabContext, subSectionTitle } from './subTabContext'
import { supabase } from '../../lib/supabase'
import GpmdBar from './GpmdBar'
import RateEditPopover from '../RateEditPopover'
import { SubRateOverrideProvider } from '../SubRateOverrideContext.jsx'
import { fetchSalesTaxRate } from '../../lib/companyDefaults'
import { calcWalkAccessLabor, DEFAULT_WALK_ACCESS_PACE_LF_PER_MIN } from '../../lib/walkAccess'
import { catalogOptions, fetchModuleCatalog, fetchStandardRateMap } from '../../lib/materialCatalog'

// ── Rate tables (method-indexed — not in DB) ──────────────────────────────────

// Base spread labor: HOURS PER INCH of depth PER 100 SF of area (not tons/hr).
const BASE_RATES = {
  'Skid Steer': 0.25,
  'Mini Skid Steer': 0.5,
  Wheelbarrow: 1.0,
}

// Each base-install method maps to a labor_rates row so the inline calculator
// icon next to the method dropdown can edit the t/hr rate. Names must match
// the seed file.
const BASE_METHOD_LABOR_NAME = {
  'Skid Steer': 'Concrete - Base Skid Steer',
  'Mini Skid Steer': 'Concrete - Base Mini Skid Steer',
  Wheelbarrow: 'Concrete - Base Wheelbarrow',
}

const METHODS = Object.keys(BASE_RATES)
// Map legacy saved base methods to the consolidated set.
const normBaseMethod = m =>
  m === 'Skid Steer OK' || m === 'Skid Steer Good'
    ? 'Skid Steer'
    : m === 'Hand'
      ? 'Wheelbarrow'
      : m
const FINISH_TYPES = [
  'Broom Finish',
  'Smooth Trowel',
  'Sand Finish',
  'Salt Finish',
  'Stamped',
  'Exposed Aggregate',
  'Seeded Aggregate',
]

// Sub-tab finish modifier — flat $/SF (labor) + optional $/SF material, on top
// of the base install $/SF. Broom + Smooth Trowel have no added cost.
const SUB_FINISH_RATES = {
  'Sand Finish': { labor: { name: 'Concrete Sub - Sand Finish Per SF', def: 2 } },
  'Salt Finish': { labor: { name: 'Concrete Sub - Salt Finish Per SF', def: 3 } },
  Stamped: { labor: { name: 'Concrete Sub - Stamped Per SF', def: 3 } },
  'Exposed Aggregate': {
    labor: { name: 'Concrete Sub - Exposed Aggregate Per SF', def: 5 },
    mat: { name: 'Concrete Sub - Exposed Aggregate Mat Per SF', def: 2.75 },
  },
  'Seeded Aggregate': {
    labor: { name: 'Concrete Sub - Seeded Aggregate Per SF', def: 4.5 },
    mat: { name: 'Concrete Sub - Seeded Aggregate Mat Per SF', def: 1.75 },
  },
}
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
  laborBurdenPct: 0.29,
  gpmd: 425,
  commissionRate: 0.12,
}

// Base Install ('Concrete Base') and Concrete Install mix ('Concrete Mix') source
// their Type options AND price/description entirely from the catalog, per vendor
// (Standard = the null-vendor rows). No built-in product list.

// Resolve a picked Type label against the CATALOG option list only. No built-in
// fallback: an unmatched/unseeded pick resolves to $0 (price + description come
// solely from the catalog row the user selected). Shared by the calc + render.
function resolveType(label, opts) {
  return (label != null && opts.find(o => o.label === label)) || { dbName: null, fallback: 0 }
}

// Rebar is priced by LINEAR FEET of bar, converted from the slab SF takeoff by
// the on-center spacing, then multiplied by the canonical rebar $/LF (the
// shared Basic Materials 'Rebar' row). Values set with Brian: 24" OC uses
// 0.59 LF of rebar per SF; 12" OC uses 1.20 LF/SF.
const REBAR_LF_PER_SF = { '24" OC': 0.59, '12" OC': 1.2 }
const REBAR_CANONICAL_FB = 1.388 // $/LF fallback (matches Basic Materials seed)
const REBAR_SPACINGS = ['24" OC', '12" OC']

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
  laborBurdenPct = R.laborBurdenPct,
  materialRows = [],
  catDefaults = {}
) {
  // Per-row/line vendor-aware price resolver. 'Standard' (or a missing/'auto'
  // vendor → the category default) uses the Standard array; a real vendor id →
  // that vendor's products for the category, priced from material_rates.
  const rowOpt = (cat, row) => {
    const vsel = row.vendor && row.vendor !== 'auto' ? row.vendor : catDefaults[cat] || 'Standard'
    const isStd = !vsel || vsel === 'Standard'
    // Resolve the picked Type against the CATALOG so price/description come from
    // the actual selected item: Standard → the null-vendor rows, a real vendor →
    // that vendor's rows. No built-in fallback — an unseeded pick prices at $0.
    const opts = catalogOptions(materialRows, cat, isStd ? 'Standard' : vsel, {
      standardRows: 'null-vendor',
      stripPrefix: true,
    }).map(o => ({ label: o.label, dbName: o.row.name, fallback: n(o.row.unit_cost) }))
    return resolveType(row.type, opts)
  }
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
  const concretePerCY = mr['Concrete - Ready Mix (Truck)'] ?? R.concretePerCY // shared Basic Materials
  // Rebar $/LF (canonical, from the shared Basic Materials 'Rebar' row) and the
  // LF-per-SF conversion factor for the chosen on-center spacing.
  const rebarPerLF = mr['Rebar'] ?? REBAR_CANONICAL_FB
  // Rebar LF-per-SF conversion by spacing — DB-editable coefficients.
  const rebarLfPerSfBySpacing = {
    '24" OC': mr['Concrete - Rebar LF/SF 24" OC'] ?? REBAR_LF_PER_SF['24" OC'],
    '12" OC': mr['Concrete - Rebar LF/SF 12" OC'] ?? REBAR_LF_PER_SF['12" OC'],
  }
  const rebarLfPerSf = rebarLfPerSfBySpacing[state.rebarSpacing] ?? rebarLfPerSfBySpacing['24" OC']
  const formMaterialPerLF = mr['Concrete - Form Lumber LF'] ?? R.formMaterialPerLF
  const sleevePer10LF = mr['Concrete - Sleeve Per 10LF'] ?? R.sleevePer10LF
  const colorCostPerCY = mr['Concrete - Color Per CY'] ?? R.colorCostPerCY
  const sealerNatural5g = mr['Concrete - Sealer Natural 5gal'] ?? R.sealerNatural5g
  const sealerWet5g = mr['Concrete - Sealer Wet 5gal'] ?? R.sealerWet5g
  const vaporBarrierPerSF = mr['Concrete - Vapor Barrier SF'] ?? R.vaporBarrierPerSF
  const costBase = mr['Base - Class II Roadbase'] ?? R.costBase // shared Basic Materials
  // Sealer coverage (SF per gallon) — DB-editable coefficient.
  const sealerSFPerGal = mr['Concrete - Sealer SF/gal'] ?? R.sealerSFPerGal

  // ── Sub / equipment costs (subcontractor_rates) ──────────────────────────
  const pumpFeeFlat = sr['Concrete - Pump Flat Fee'] ?? R.pumpFeeFlat
  const pumpFeePerCY = sr['Concrete - Pump Per CY'] ?? R.pumpFeePerCY
  const sandFinishPer400SF = sr['Concrete - Sand Finish 400SF'] ?? R.sandFinishPer400SF
  const stampSubFlat = sr['Concrete - Stamp Sub Flat'] ?? R.stampSubFlat
  const stampSubPerCY = sr['Concrete - Stamp Sub Per CY'] ?? R.stampSubPerCY

  const diffPct = n(state.difficulty) / 100
  const layoutHrs = n(state.layoutHrs)
  const distanceLF = n(state.distanceLF)
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
    if (!sf) return { hrs: 0, mat: 0 }
    const m = normBaseMethod(r.method)
    // Both labor AND material are by AREA: (SF ÷ 100) × depth(in) × rate.
    // Labor rate = labor_rates['Concrete - Base ...'] (hrs per inch per 100 SF).
    const rate = lr[BASE_METHOD_LABOR_NAME[m]] ?? BASE_RATES[m] ?? 0.25
    const hrs = (sf / 100) * depth * rate
    const bt = rowOpt('Concrete Base', r)
    // Material = (SF ÷ 100) × depth(in) × the picked catalog item's price.
    const mat = r.type ? (sf / 100) * depth * bt.fallback : 0
    baseHrsTot += hrs
    baseMatTot += mat
    return { hrs, mat, rate }
  })

  // ── Concrete install ─────────────────────────────────────────────────────
  // In-House install SF is entered per job-size tier; each tier has its own
  // SF/hr rate. Total SF drives the material (CY) + finish add-ons.
  const installTiers = state.installTiers || {}
  const installTierVendor = state.installTierVendor || {}
  const installTierType = state.installTierType || {}
  const installTierDepth = state.installTierDepth || {}
  const installSF = INSTALL_TIERS.reduce((s, t) => s + n(installTiers[t.key]), 0)
  const depthIn = n(state.depthIn) || 4 // legacy single depth — fallback for old saves + Sub
  const rebarSF = n(state.rebarSF)
  const formLF = n(state.formLF)
  const sleeveLF = n(state.sleeveLF)

  const installHrs = INSTALL_TIERS.reduce((s, t) => {
    const sf = n(installTiers[t.key])
    if (!sf) return s
    const rate = lr[t.rateName] ?? t.def
    return s + (rate > 0 ? sf / rate : 0)
  }, 0)
  // Concrete mix material + volume — per size-tier: each tier's SF × its own
  // depth drives its own CY, priced at that tier's picked mix Vendor/Type.
  // Depth falls back to the legacy single depth for pre-per-tier estimates, so
  // an all-Standard job at one depth matches the old flat calc.
  let concreteCY = 0
  const concreteMat = INSTALL_TIERS.reduce((s, t) => {
    const sf = n(installTiers[t.key])
    if (!sf) return s
    const d = n(installTierDepth[t.key]) || depthIn
    const tierCY = ((d / 12) * sf) / 27
    concreteCY += tierCY
    // Empty mix picker → no concrete material cost for this tier.
    if (!installTierType[t.key]) return s
    const mt = rowOpt('Concrete Mix', {
      vendor: installTierVendor[t.key],
      type: installTierType[t.key],
    })
    return s + tierCY * mt.fallback
  }, 0)

  const rebarHrs = rebarSF > 0 ? rebarSF / rebarSFPerHr : 0
  const rebarMat = rebarSF * rebarLfPerSf * rebarPerLF

  const formHrs = formLF > 0 ? formLF / formLFPerHr : 0
  const formMat = formLF * formMaterialPerLF

  const sleeveUnits = sleeveLF > 0 ? Math.ceil(sleeveLF / 10) : 0
  const sleeveHrs = sleeveLF / sleeveLFPerHr
  const sleeveMat = sleeveUnits * sleevePer10LF

  // ── Travel ───────────────────────────────────────────────────────────────
  // Old per-module travelHrs retired — now handled by unified walk-access penalty below.
  const travelHrs = 0

  // ── Forming complexity ───────────────────────────────────────────────────
  const preComplexHrs =
    layoutHrs + travelHrs + baseHrsTot + installHrs + rebarHrs + formHrs + sleeveHrs

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
    const sealerGals = Math.ceil(sealerSF / sealerSFPerGal)
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
    rebarPerLF,
    rebarLfPerSf,
    rebarLfPerSfBySpacing,
    sealerSFPerGal,
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
  const isSub = useContext(SubTabContext)
  return (
    <div className="bg-gray-100 rounded-lg px-4 py-2.5 border border-gray-200 mb-2">
      <h3 className="text-xs font-bold text-gray-600 uppercase tracking-wider">{subSectionTitle(title, isSub)}</h3>
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

// Start with ZERO seeded rows — the user adds rows via "+ Add row". Every added
// row defaults vendor to '' (empty "Select vendor" placeholder → empty Type list
// → $0 until a vendor is chosen).
const DEFAULT_BASE_ROWS = [{ label: '', method: 'Skid Steer', sf: '', depth: '2', vendor: '', type: '' }]

const DEFAULT_MANUAL_ROWS = [{ label: '', hours: '', materials: '', subCost: '' }]

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
  // Vendor catalog: material_rates rows (with sub_category + vendor_id) and the
  // vendor list, used to build the per-line Vendor/Type pickers.
  const [materialRows, setMaterialRows] = useState(initialData?.materialRows ?? [])
  const [vendors, setVendors] = useState([])
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
    // material_rates retired: base map (incl. shared Basic Materials) from the
    // new model; vendor catalog from material + material_price. Concrete's
    // markers ('Concrete Mix'/'Concrete Base') are unchanged, so no remap.
    const [lrRes, matMap, srRes, rows, venRes] = await Promise.all([
      supabase.from('labor_rates').select('name, rate').eq('category', 'Concrete'),
      fetchStandardRateMap(['Concrete', 'Basic Materials']),
      supabase.from('subcontractor_rates').select('company_name, rate').eq('category', 'Concrete'),
      fetchModuleCatalog(['Concrete']),
      supabase
        .from('subs_vendors')
        .select('id, company_name')
        .eq('type', 'vendor')
        .order('company_name'),
    ])
    setMaterialRows(rows || [])
    setVendors(
      (venRes.data || []).map(v => ({
        id: v.id,
        name: v.company_name,
      }))
    )
    if (lrRes.data) {
      const m = {}
      lrRes.data.forEach(r => {
        m[r.name] = r.rate
      })
      setLaborRates(m)
    }
    setMaterialRates(matMap)
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

  // Always load the vendor list + material rows (even when re-editing a saved
  // estimate) so the per-line Vendor/Type pickers work.
  useEffect(() => {
    let alive = true
    Promise.all([
      fetchModuleCatalog(['Concrete']),
      supabase
        .from('subs_vendors')
        .select('id, company_name')
        .eq('type', 'vendor')
        .order('company_name'),
    ]).then(([rows, venRes]) => {
      if (!alive) return
      setMaterialRows(rows || [])
      setVendors(
        (venRes.data || []).map(v => ({
          id: v.id,
          name: v.company_name,
        }))
      )
    })
    return () => {
      alive = false
    }
  }, [])

  // Settings
  const [difficulty, setDifficulty] = useState(initialData?.difficulty ?? '')
  const [crewType, setCrewType] = useState(initialData?.crewType ?? 'Masonry')
  const [subType, setSubType] = useState(initialData?.subType ?? 'In-House')
  const [layoutHrs, setLayoutHrs] = useState(initialData?.layoutHrs ?? '')
  const [distanceLF, setDistanceLF] = useState(initialData?.distanceLF ?? '')
  const [formingComplexity, setFormingComplexity] = useState(initialData?.formingComplexity ?? '')
  const [finishingType, setFinishingType] = useState(initialData?.finishingType ?? 'IH')
  const [hoursAdj, setHoursAdj] = useState(initialData?.hoursAdj ?? '')

  // Install
  const [installTiers, setInstallTiers] = useState(initialData?.installTiers ?? {})
  // Per size-tier concrete-mix Vendor + Type (objects keyed by INSTALL_TIERS key)
  const [installTierVendor, setInstallTierVendor] = useState(initialData?.installTierVendor ?? {})
  const [installTierType, setInstallTierType] = useState(initialData?.installTierType ?? {})
  const [installTierDepth, setInstallTierDepth] = useState(initialData?.installTierDepth ?? {})
  const [depthIn, setDepthIn] = useState(initialData?.depthIn ?? '4')
  const [rebarSF, setRebarSF] = useState(initialData?.rebarSF ?? '')
  const [rebarSpacing, setRebarSpacing] = useState(initialData?.rebarSpacing ?? '24" OC')
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
  // The site-conditions modifiers (difficulty/layout/distance/
  // forming complexity/hours adj) are In-House only and are NOT mirrored.
  const [subInstallSF, setSubInstallSF] = useState(initialData?.subInstallSF ?? '')
  const [subDepthIn, setSubDepthIn] = useState(initialData?.subDepthIn ?? '4')
  const [subRebarSF, setSubRebarSF] = useState(initialData?.subRebarSF ?? '')
  const [subRebarSpacing, setSubRebarSpacing] = useState(initialData?.subRebarSpacing ?? '24" OC')
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
    formingComplexity,
    finishingType,
    hoursAdj,
    installTiers,
    installTierVendor,
    installTierType,
    installTierDepth,
    depthIn,
    rebarSF,
    rebarSpacing,
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

  // ── Vendor catalog helpers (per-line Vendor/Type pickers) ────────────────
  const vendorsForCategory = cat => vendors.filter(v => materialRows.some(r => r.vendor_id === v.id && (r.sub_category === cat || r.category === cat)))
  const defaultVendorFor = cat => vendorsForCategory(cat)[0]?.id || 'Standard'
  const catDefaults = {
    'Concrete Base': defaultVendorFor('Concrete Base'),
    'Concrete Mix': defaultVendorFor('Concrete Mix'),
  }
  // Build a section's Type option list for a given vendor selection. Options come
  // ONLY from the catalog: 'Standard' → the null-vendor catalog rows for the
  // sub-category; a vendor id → that vendor's products for the category. When the
  // catalog has none, the list is EMPTY (picker shows just its "Select …"
  // placeholder and the row books $0). houseArray is retained for the price
  // resolver's fallback (resolveType) only, never as an option source.
  function sectionOptions(subcat, vendorSel, houseArray) {
    // Unset vendor ('' / 'auto') → EMPTY Type list so the picker shows only its
    // own "Select …" placeholder and the row books $0 until a vendor is chosen.
    if (!vendorSel || vendorSel === 'auto') return []
    const isStd = vendorSel === 'Standard'
    const opts = catalogOptions(materialRows, subcat, isStd ? 'Standard' : vendorSel, {
      standardRows: 'null-vendor',
      stripPrefix: true,
    })
    return opts.map(o => ({ label: o.label, dbName: o.row.name, fallback: n(o.row.unit_cost), category: 'Concrete' }))
  }
  // Effective vendor for a stored value: 'auto'/unset/Standard → category default.
  // Honest effective vendor: only unset/'auto' falls back to the category default;
  // 'Standard' stays 'Standard' so the displayed vendor matches the Type list.
  const effVendor = (cat, v) => (v && v !== 'auto' ? v : catDefaults[cat])

  // NOTE: per the shared "Vendor Select" convention, per-row/per-tier vendor is
  // left UNSET ('') on a new estimate so each picker shows a "Select vendor"
  // placeholder (empty Type list + $0 row) until the user chooses. No auto-
  // default to the first real vendor.

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
  const activeRebarSpacing = isSub ? subRebarSpacing : rebarSpacing
  const setActiveRebarSpacing = isSub ? setSubRebarSpacing : setRebarSpacing
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
  // In-House sums each tier's SF × its own depth; Sub uses its single slab depth.
  const _activeDepth = n(activeDepthIn) || 4
  const activeConcreteCY = isSub
    ? n(activeInstallSF) > 0
      ? ((_activeDepth / 12) * n(activeInstallSF)) / 27
      : 0
    : INSTALL_TIERS.reduce((s, t) => {
        const sf = n(installTiers[t.key])
        if (!sf) return s
        const d = n(installTierDepth[t.key]) || n(depthIn) || 4
        return s + ((d / 12) * sf) / 27
      }, 0)

  // In-house calc is unchanged — it reads only the in-house state fields.
  const inHouse = calcConcrete(
    state,
    laborRatePerHour,
    laborRates,
    materialRates,
    subRates,
    gpmd,
    walkAccess,
    laborBurdenPct,
    materialRows,
    catDefaults
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
  // Sub-side finish modifier ($/SF labor + optional $/SF material).
  const subFinishCfg = SUB_FINISH_RATES[subFinishType] || null
  const subFinishLaborPerSF = subFinishCfg
    ? subRates[subFinishCfg.labor.name] ?? subFinishCfg.labor.def
    : 0
  const subFinishMatPerSF = subFinishCfg?.mat
    ? subRates[subFinishCfg.mat.name] ?? subFinishCfg.mat.def
    : 0
  const lrph = n(laborRatePerHour) || 35
  // Resolved add-on rates (identical on both tabs — sourced from rate maps).
  const {
    rebarSFPerHr,
    rebarPerLF,
    rebarLfPerSfBySpacing,
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
  // Concrete install — flat $/SF, plus a per-finish $/SF modifier (labor + mat).
  // No Base Install or Form Edging on the sub side (removed by request).
  subSideCost += n(subInstallSF) * subSlabRate
  subSideCost += n(subInstallSF) * (subFinishLaborPerSF + subFinishMatPerSF)
  // Rebar — same LF-per-SF conversion × canonical $/LF, using the Sub tab's
  // own on-center spacing.
  if (n(subRebarSF) > 0) {
    const subRebarLfPerSf =
      rebarLfPerSfBySpacing[subRebarSpacing] ?? rebarLfPerSfBySpacing['24" OC']
    subSideCost +=
      n(subRebarSF) * subRebarLfPerSf * rebarPerLF + (n(subRebarSF) / rebarSFPerHr) * lrph
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
        subRebarSpacing,
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
        materialRows, // ← vendor catalog snapshot (for re-edit pricing)
        calc,
      },
    })
  }

  const fmt2 = v =>
    `$${n(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  // ── Catalog material rows for View Rates ────────────────────────────────────
  // Mirrors Walls/Utilities: surface the module's material catalog prices (one
  // row per vendor, Standard first) so each section lists its MATERIAL rates
  // after its labor rates. Sourced from the SAME `materialRows`/`vendors` state
  // the estimator's pickers use — no extra fetch.
  const vendorNames = Object.fromEntries((vendors || []).map(v => [v.id, v.name]))
  const catalogRowToItem = r0 => ({
    label: `${r0.vendor_id ? vendorNames[r0.vendor_id] || 'Vendor' : 'Standard'} — ${r0.name}`,
    table: 'material_price',
    materialId: r0.id,
    vendorId: r0.vendor_id || undefined,
    category: 'Concrete',
    unitLabel: r0.unit || 'ea',
    mode: 'currency',
    value: n(r0.unit_cost),
  })
  const catalogSort = (a, b) => {
    const va = a.vendor_id == null ? '' : vendorNames[a.vendor_id] || '~'
    const vb = b.vendor_id == null ? '' : vendorNames[b.vendor_id] || '~'
    return va.localeCompare(vb) || (a.name || '').localeCompare(b.name || '')
  }
  // Sub-category–picked sections (Base / Mix): every catalog row in that subcat.
  const catalogBlockItems = subcat =>
    (materialRows || [])
      .filter(r0 => r0.sub_category === subcat)
      .filter(r0 => r0.vendor_id == null || vendorNames[r0.vendor_id])
      .sort(catalogSort)
      .map(catalogRowToItem)
  // Named materials (Rebar, Form Lumber, …): matched by exact catalog name.
  const materialRateRows = dbName =>
    (materialRows || [])
      .filter(r0 => r0.name === dbName)
      .filter(r0 => r0.vendor_id == null || vendorNames[r0.vendor_id])
      .sort(catalogSort)
      .map(catalogRowToItem)

  // ── Grouped rate list for the "View Rates" popup (CrewTypeBar). Every rate
  //    that used to have an inline RateEditPopover in this module now lives here.
  const concreteRateList = [
    {
      group: 'Job Site Conditions',
      items: [
        {
          label: 'Concrete - Forming Complexity % Per Unit',
          table: 'labor_rates',
          name: 'Concrete - Forming Complexity % Per Unit',
          category: 'Concrete',
          mode: 'coefficient',
          unitLabel: '%/pt',
          value: calc.complexityPctPerUnit,
        },
      ],
    },
    {
      group: 'Base Install',
      items: [
        ...METHODS.map(m => ({
          label: BASE_METHOD_LABOR_NAME[m],
          table: 'labor_rates',
          name: BASE_METHOD_LABOR_NAME[m],
          category: 'Concrete',
          mode: 'coefficient',
          unitLabel: 'hrs/in·100sf',
          value: laborRates[BASE_METHOD_LABOR_NAME[m]] ?? BASE_RATES[m],
        })),
        // Base material catalog (vendor-supplied 'Concrete Base' products).
        ...catalogBlockItems('Concrete Base'),
      ],
    },
    {
      group: 'Concrete Install',
      items: [
        ...INSTALL_TIERS.map(t => ({
          label: t.rateName,
          table: 'labor_rates',
          name: t.rateName,
          category: 'Concrete',
          mode: 'coefficient',
          unitLabel: 'SF/hr',
          value: laborRates[t.rateName] ?? t.def,
        })),
        {
          label: 'Concrete - Rebar 24" OC',
          table: 'labor_rates',
          name: 'Concrete - Rebar 24" OC',
          category: 'Concrete',
          mode: 'coefficient',
          unitLabel: 'SF/hr',
          value: calc.rebarSFPerHr,
        },
        {
          label: 'Rebar LF/SF — 24" OC',
          table: 'misc_rates',
          name: 'Concrete - Rebar LF/SF 24" OC',
          category: 'Concrete',
          mode: 'coefficient',
          unitLabel: 'LF/SF',
          value: calc.rebarLfPerSfBySpacing['24" OC'],
        },
        {
          label: 'Rebar LF/SF — 12" OC',
          table: 'misc_rates',
          name: 'Concrete - Rebar LF/SF 12" OC',
          category: 'Concrete',
          mode: 'coefficient',
          unitLabel: 'LF/SF',
          value: calc.rebarLfPerSfBySpacing['12" OC'],
        },
        {
          label: 'Concrete - Form Setting',
          table: 'labor_rates',
          name: 'Concrete - Form Setting',
          category: 'Concrete',
          mode: 'coefficient',
          unitLabel: 'LF/hr',
          value: calc.formLFPerHr,
        },
        {
          label: 'Concrete - Sleeves',
          table: 'labor_rates',
          name: 'Concrete - Sleeves',
          category: 'Concrete',
          mode: 'coefficient',
          unitLabel: 'LF/hr',
          value: calc.sleeveLFPerHr,
        },
        {
          label: 'Concrete - Pump Flat Fee',
          table: 'subcontractor_rates',
          name: 'Concrete - Pump Flat Fee',
          category: 'Concrete',
          mode: 'currency',
          unitLabel: 'flat',
          value: calc.pumpFeeFlat,
        },
        {
          label: 'Concrete - Pump Per CY',
          table: 'subcontractor_rates',
          name: 'Concrete - Pump Per CY',
          category: 'Concrete',
          mode: 'currency',
          unitLabel: 'CY',
          value: calc.pumpFeePerCY,
        },
        // Concrete mix catalog (vendor-supplied 'Concrete Mix' products) + the
        // named install materials (rebar, form lumber, sleeves, color).
        ...catalogBlockItems('Concrete Mix'),
        ...materialRateRows('Rebar'),
        ...materialRateRows('Concrete - Form Lumber LF'),
        ...materialRateRows('Concrete - Sleeve Per 10LF'),
        ...materialRateRows('Concrete - Color Per CY'),
      ],
    },
    {
      group: 'Finish Options',
      items: [
        {
          label: 'Concrete - Sand Finish SF/hr',
          table: 'labor_rates',
          name: 'Concrete - Sand Finish SF/hr',
          category: 'Concrete',
          mode: 'coefficient',
          unitLabel: 'SF/hr',
          value: calc.sandFinishSFPerHr,
        },
        {
          label: 'Concrete - Salt Finish SF/hr',
          table: 'labor_rates',
          name: 'Concrete - Salt Finish SF/hr',
          category: 'Concrete',
          mode: 'coefficient',
          unitLabel: 'SF/hr',
          value: calc.saltFinishSFPerHr,
        },
        {
          label: 'Concrete - Exposed Aggregate SF/hr',
          table: 'labor_rates',
          name: 'Concrete - Exposed Aggregate SF/hr',
          category: 'Concrete',
          mode: 'coefficient',
          unitLabel: 'SF/hr',
          value: calc.exposedAggSFPerHr,
        },
        {
          label: 'Concrete - Seeded Aggregate SF/hr',
          table: 'labor_rates',
          name: 'Concrete - Seeded Aggregate SF/hr',
          category: 'Concrete',
          mode: 'coefficient',
          unitLabel: 'SF/hr',
          value: calc.seededAggSFPerHr,
        },
        {
          label: 'Concrete - Vapor Barrier',
          table: 'labor_rates',
          name: 'Concrete - Vapor Barrier',
          category: 'Concrete',
          mode: 'coefficient',
          unitLabel: 'SF/hr',
          value: calc.vaporBarrierSFPerHr,
        },
        {
          label: 'Concrete - Sealer Natural',
          table: 'labor_rates',
          name: 'Concrete - Sealer Natural',
          category: 'Concrete',
          mode: 'coefficient',
          unitLabel: 'SF/hr',
          value: calc.sealerNaturalSFPerHr,
        },
        {
          label: 'Concrete - Sealer Wet-Look',
          table: 'labor_rates',
          name: 'Concrete - Sealer Wet-Look',
          category: 'Concrete',
          mode: 'coefficient',
          unitLabel: 'SF/hr',
          value: calc.sealerWetSFPerHr,
        },
        {
          label: 'Sealer Coverage (SF/gal)',
          table: 'misc_rates',
          name: 'Concrete - Sealer SF/gal',
          category: 'Concrete',
          mode: 'coefficient',
          unitLabel: 'SF/gal',
          value: calc.sealerSFPerGal,
        },
        {
          label: 'Concrete - Sand Finish 400SF',
          table: 'subcontractor_rates',
          name: 'Concrete - Sand Finish 400SF',
          category: 'Concrete',
          mode: 'currency',
          unitLabel: '400SF',
          value: calc.sandFinishPer400SF,
        },
        {
          label: 'Concrete - Stamp Sub Flat',
          table: 'subcontractor_rates',
          name: 'Concrete - Stamp Sub Flat',
          category: 'Concrete',
          mode: 'currency',
          unitLabel: 'flat',
          value: calc.stampSubFlat,
        },
        {
          label: 'Concrete - Stamp Sub Per CY',
          table: 'subcontractor_rates',
          name: 'Concrete - Stamp Sub Per CY',
          category: 'Concrete',
          mode: 'currency',
          unitLabel: 'CY',
          value: calc.stampSubPerCY,
        },
        // Finish material catalog (sealers, vapor barrier).
        ...materialRateRows('Concrete - Sealer Natural 5gal'),
        ...materialRateRows('Concrete - Sealer Wet 5gal'),
        ...materialRateRows('Concrete - Vapor Barrier SF'),
      ],
    },
    {
      group: 'Subcontractor',
      items: [
        {
          label: 'Concrete Sub - Per SF',
          table: 'subcontractor_rates',
          name: 'Concrete Sub - Per SF',
          category: 'Concrete',
          mode: 'currency',
          unitLabel: 'SF',
          value: subSlabRate,
        },
        ...Object.entries(SUB_FINISH_RATES).flatMap(([, cfg]) => {
          const rows = [
            {
              label: cfg.labor.name,
              table: 'subcontractor_rates',
              name: cfg.labor.name,
              category: 'Concrete',
              mode: 'currency',
              unitLabel: 'SF',
              value: subRates[cfg.labor.name] ?? cfg.labor.def,
            },
          ]
          if (cfg.mat) {
            rows.push({
              label: cfg.mat.name,
              table: 'subcontractor_rates',
              name: cfg.mat.name,
              category: 'Concrete',
              mode: 'currency',
              unitLabel: 'SF',
              value: subRates[cfg.mat.name] ?? cfg.mat.def,
            })
          }
          return rows
        }),
        {
          label: 'Concrete Sub - Vapor Barrier Per SF',
          table: 'subcontractor_rates',
          name: 'Concrete Sub - Vapor Barrier Per SF',
          category: 'Concrete',
          mode: 'currency',
          unitLabel: 'SF',
          value: subVaporBarrierRate,
        },
        {
          label: 'Concrete Sub - Sealer Per SF',
          table: 'subcontractor_rates',
          name: 'Concrete Sub - Sealer Per SF',
          category: 'Concrete',
          mode: 'currency',
          unitLabel: 'SF',
          value: subSealerRate,
        },
      ],
    },
  ]

  return (
    <SubTabContext.Provider value={isSub}>
    <SubRateOverrideProvider overrides={rateOverrides} setOverride={setOverride}>
    <div className="space-y-5">
      {/* ── Frozen header: GPMD bar + Crew Type / View Rates bar ── */}
      <div className="sticky top-0 z-20 -mx-6 bg-white shadow-md">
        <div className="px-6 pt-1 pb-1 bg-gray-900">
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
        <div className="px-6 py-2">
          <CrewTypeBar
            crewType={crewType}
            onCrewTypeChange={setCrewType}
            title="Concrete"
            rates={concreteRateList}
            refreshAllRates={refreshAllRates}
            showInlineToggle={false}
          />
        </div>
      </div>

      <ModuleHeaderSlot>
        <WorkTypeChooser value={subType || 'In-House'} onChange={setSubType} compact />
      </ModuleHeaderSlot>

      {/* ── Global Settings — In-House tab only (Sub tab has no modifiers) ── */}
      {!isSub && (
      <div>
        <SectionHeader title="Job Site Conditions" />
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="text-xs text-gray-500 block mb-1">Difficulty Add (%)</label>
            <NumInput value={difficulty} onChange={setDifficulty} placeholder="0" />
          </div>
          <div className="flex-1">
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
          <div className="flex-1">
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
        <div className="overflow-x-auto">
          <table className="w-full text-sm table-fixed">
            {/* Sq Ft + Depth ~3× their prior shrunk width; the freed
                space is absorbed by the widened Type column. */}
            <colgroup>
              <col />
              <col className="w-[28%]" />
              <col />
              <col className="w-[12%]" />
              <col className="w-[12%]" />
              <col />
            </colgroup>
            <thead>
              <tr className="text-xs text-gray-500 border-b border-gray-200">
                <th className="text-center pb-1 pr-2 font-medium">Vendor</th>
                <th className="text-center pb-1 pr-2 font-medium">Type</th>
                <th className="text-center pb-1 pr-2 font-medium">Method</th>
                <th className="text-center pb-1 pr-2 font-medium">Sq Ft</th>
                <th className="text-center pb-1 pr-2 font-medium">Depth (in)</th>
                <th className="text-center pb-1 font-medium text-gray-400">Hrs</th>
              </tr>
            </thead>
            <tbody>
              {activeBaseRows.map((row, i) => {
                const _sf = n(row.sf),
                  _depth = n(row.depth) || 2
                const _bm = normBaseMethod(row.method)
                const methodRate =
                  laborRates[BASE_METHOD_LABOR_NAME[_bm]] ?? BASE_RATES[_bm] ?? 0.25
                const baseOpts = sectionOptions('Concrete Base', row.vendor)
                const bt = resolveType(row.type, baseOpts)
                const baseRate = bt.fallback
                const c = {
                  hrs: _sf > 0 ? (_sf / 100) * _depth * methodRate : 0,
                  mat: row.type ? (_sf / 100) * _depth * baseRate : 0,
                }
                return (
                  <tr key={i} className="border-b border-gray-100">
                    <td className="py-1 pr-2">
                      <select
                        className="input text-sm py-1 min-w-0"
                        value={row.vendor || ''}
                        onChange={e => updateBaseRow(i, 'vendor', e.target.value)}
                        title="Vendor"
                      >
                        {!row.vendor && <option value="">Select</option>}
                        {vendorsForCategory('Concrete Base').map(v => (
                          <option key={v.id} value={v.id}>
                            {v.name}
                          </option>
                        ))}
                        <option value="Standard">Standard</option>
                      </select>
                    </td>
                    <td className="py-1 pr-2">
                      <div className="flex items-center gap-1">
                        <select
                          className="input text-sm py-1 min-w-0"
                          value={row.type || ''}
                          onChange={e => updateBaseRow(i, 'type', e.target.value)}
                        >
                          {!row.type && <option value="">Select type</option>}
                          {row.type && !baseOpts.some(o => o.label === row.type) && (
                            <option value={row.type}>{row.type}</option>
                          )}
                          {baseOpts.map(o => (
                            <option key={o.label} value={o.label}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </td>
                    <td className="py-1 pr-2">
                      <div className="flex items-center gap-1">
                        <select
                          className="input text-sm py-1 flex-1 min-w-0"
                          value={normBaseMethod(row.method)}
                          onChange={e => updateBaseRow(i, 'method', e.target.value)}
                        >
                          {METHODS.map(m => (
                            <option key={m}>{m}</option>
                          ))}
                        </select>
                      </div>
                    </td>
                    <td className="py-1 pr-2">
                      <NumInput value={row.sf} onChange={v => updateBaseRow(i, 'sf', v)} className="text-center" />
                    </td>
                    <td className="py-1 pr-2">
                      <NumInput
                        value={row.depth}
                        onChange={v => updateBaseRow(i, 'depth', v)}
                        placeholder="2"
                        className="text-center"
                      />
                    </td>
                    <td className="py-1 text-center text-gray-500 text-xs">
                      {c.hrs > 0 ? c.hrs.toFixed(2) : '—'}
                      {c.mat > 0 && <p className="text-gray-400">{fmt2(c.mat)}</p>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <button
            type="button"
            onClick={() =>
              setActiveBaseRows(rows => [
                ...(rows || []),
                { label: '', method: 'Skid Steer', sf: '', depth: '2', vendor: '', type: '' },
              ])
            }
            className="mt-2 text-xs px-2 py-1 rounded bg-slate-100 text-slate-700 hover:bg-slate-200"
          >
            + Add row
          </button>
        </div>
      </div>
      )}

      {/* ── Concrete Install ── */}
      <div>
        <SectionHeader title="Concrete Install" />
        <div className="grid grid-cols-2 gap-3 items-end">
          <div className={!isSub ? 'col-span-2' : undefined}>
            {isSub && (
              <label className="text-xs text-gray-500 block mb-1 inline-flex items-center gap-1 flex-wrap">
                Installation (Sq Ft)
                <span className="text-gray-400 inline-flex items-center gap-1">
                  — ${subSlabRate}/SF all-in
                </span>
              </label>
            )}
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
                {/* Column labels */}
                <div className="grid grid-cols-[6rem_9rem_minmax(0,1fr)_5rem_5rem_16rem] items-center gap-2 text-[10px] font-semibold text-gray-400 uppercase tracking-wide text-center">
                  <span />
                  <span>Vendor</span>
                  <span>Mix</span>
                  <span>Sq Ft</span>
                  <span>Depth (In)</span>
                  <span />
                </div>
                {INSTALL_TIERS.map(t => {
                  const rate = laborRates[t.rateName] ?? t.def
                  const is300plus = t.key !== 's100_300'
                  const mixOpts = sectionOptions('Concrete Mix', installTierVendor[t.key])
                  const mt = resolveType(installTierType[t.key], mixOpts)
                  const mixRate = mt.fallback
                  return (
                    <div
                      key={t.key}
                      className="grid grid-cols-[6rem_9rem_minmax(0,1fr)_5rem_5rem_16rem] items-center gap-2"
                    >
                      <span className="text-[11px] text-gray-500">{t.label}</span>
                      <select
                        className="input text-xs py-1 w-full"
                        value={installTierVendor[t.key] || ''}
                        onChange={e =>
                          setInstallTierVendor({ ...installTierVendor, [t.key]: e.target.value })
                        }
                        title="Mix vendor"
                      >
                        {!installTierVendor[t.key] && <option value="">Select</option>}
                        {vendorsForCategory('Concrete Mix').map(v => (
                          <option key={v.id} value={v.id}>
                            {v.name}
                          </option>
                        ))}
                        <option value="Standard">Standard</option>
                      </select>
                      <select
                        className="input text-xs py-1 w-full"
                        value={installTierType[t.key] || ''}
                        onChange={e =>
                          setInstallTierType({ ...installTierType, [t.key]: e.target.value })
                        }
                        title="Mix type"
                      >
                        {!installTierType[t.key] && <option value="">Select mix</option>}
                        {installTierType[t.key] && !mixOpts.some(o => o.label === installTierType[t.key]) && (
                          <option value={installTierType[t.key]}>{installTierType[t.key]}</option>
                        )}
                        {mixOpts.map(o => (
                          <option key={o.label} value={o.label}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                      <NumInput
                        value={installTiers[t.key] ?? ''}
                        onChange={v => setInstallTiers({ ...installTiers, [t.key]: v })}
                        placeholder="0"
                        className="w-full text-center"
                      />
                      <NumInput
                        value={installTierDepth[t.key] ?? ''}
                        onChange={v => setInstallTierDepth({ ...installTierDepth, [t.key]: v })}
                        placeholder="4"
                        className="w-full text-center"
                      />
                      <div className="flex items-center justify-end gap-2 whitespace-nowrap">
                        <span className="text-[11px] text-gray-400 inline-flex items-center gap-1">
                          ${Number(mixRate).toFixed(0)}/CY
                        </span>
                        <span
                          className={`text-[10px] whitespace-nowrap ${
                            is300plus ? 'text-green-600' : 'text-gray-400'
                          }`}
                        >
                          {is300plus ? 'pump' : 'pump not included'}
                        </span>
                        <span className="text-[11px] text-gray-400 inline-flex items-center gap-1">
                          {rate} SF/hr
                        </span>
                      </div>
                    </div>
                  )
                })}
                <div className="pt-1 text-[11px] text-gray-400 inline-flex items-center gap-1 flex-wrap">
                  Pump (auto 300+): ${calc.pumpFeeFlat} flat
                  + ${calc.pumpFeePerCY}/CY
                </div>
              </div>
            )}
          </div>
          {isSub && (
            <div>
              <label className="text-xs text-gray-500 block mb-1">Depth (inches)</label>
              <NumInput value={activeDepthIn} onChange={setActiveDepthIn} placeholder="4" />
            </div>
          )}
          <div>
            <label className="text-xs text-gray-500 block mb-1">Rebar (Sq Ft)</label>
            <div className="flex items-center gap-2">
              <select
                className="input text-sm py-1.5 w-28"
                value={activeRebarSpacing}
                onChange={e => setActiveRebarSpacing(e.target.value)}
                title="Rebar on-center spacing"
              >
                {REBAR_SPACINGS.map(s => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <NumInput value={activeRebarSF} onChange={setActiveRebarSF} placeholder="Sq Ft" className="flex-1" />
            </div>
          </div>
          {!isSub && (
          <div>
            <label className="text-xs text-gray-500 block mb-1">Form Edging (Ln Ft)</label>
            <NumInput value={activeFormLF} onChange={setActiveFormLF} />
          </div>
          )}
          <div>
            <label className="text-xs text-gray-500 block mb-1">3" Sleeves (Ln Ft)</label>
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
          {!isSub && (
            <div className="col-span-2">
              <label className="text-xs text-gray-500 block mb-1 inline-flex items-center gap-1 flex-wrap">
                Forming Complexity (0–100)
                <span className="text-gray-400">— +{calc.complexityPctPerUnit}% labor / point</span>
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
          )}
          <div className="col-span-2">
            <label className="text-xs text-gray-500 block mb-1">Layout Time (hrs)</label>
            <NumInput value={layoutHrs} onChange={setLayoutHrs} placeholder="0" />
          </div>
        </div>
      </div>

      {/* ── Finish Options ── */}
      <div>
        <SectionHeader title="Finish Options" />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-gray-500 block mb-1 inline-flex items-center gap-1 flex-wrap">
              Finish Type
              {isSub &&
                (subFinishCfg ? (
                  <span className="text-gray-400 inline-flex items-center gap-1 flex-wrap">
                    — ${subFinishLaborPerSF}/SF
                    {subFinishCfg.mat && (
                      <>
                        · ${subFinishMatPerSF}/SF mat
                      </>
                    )}
                  </span>
                ) : (
                  <span className="text-gray-400">— no added cost</span>
                ))}
              {!isSub && activeFinishType === 'Sand Finish' && (
                <span className="text-gray-400 inline-flex items-center gap-1 flex-wrap">
                  — {calc.sandFinishSFPerHr} SF/hr
                  · sand sub ${calc.sandFinishPer400SF}/400SF
                </span>
              )}
              {!isSub && activeFinishType === 'Salt Finish' && (
                <span className="text-gray-400 inline-flex items-center gap-1">
                  — {calc.saltFinishSFPerHr} SF/hr
                </span>
              )}
              {!isSub && activeFinishType === 'Exposed Aggregate' && (
                <span className="text-gray-400 inline-flex items-center gap-1">
                  — {calc.exposedAggSFPerHr} SF/hr
                </span>
              )}
              {!isSub && activeFinishType === 'Seeded Aggregate' && (
                <span className="text-gray-400 inline-flex items-center gap-1">
                  — {calc.seededAggSFPerHr} SF/hr
                </span>
              )}
              {!isSub && activeFinishType === 'Stamped' && (
                <span className="text-gray-400 inline-flex items-center gap-1 flex-wrap">
                  — stamp sub ${calc.stampSubFlat} flat
                  · ${calc.stampSubPerCY}/CY
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
            </label>
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Vapor Barrier (Sq Ft)</label>
            <NumInput value={activeVaporBarrierSF} onChange={setActiveVaporBarrierSF} />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Sealer (Sq Ft)</label>
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
          <table className="w-full text-sm table-fixed">
            <colgroup>
              {isSub ? (
                <>
                  <col className="w-1/2" />
                  <col className="w-1/2" />
                </>
              ) : (
                <>
                  <col className="w-1/3" />
                  <col className="w-1/3" />
                  <col className="w-1/3" />
                </>
              )}
            </colgroup>
            <thead>
              <tr className="text-xs text-gray-500 border-b border-gray-200">
                <th className="text-center pb-1 pr-2 font-medium">Description</th>
                {isSub ? (
                  <th className="text-center pb-1 font-medium">Cost $</th>
                ) : (
                  <>
                    <th className="text-center pb-1 pr-2 font-medium">Hours</th>
                    <th className="text-center pb-1 font-medium">Materials $</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {activeManualRows.map((row, i) => (
                <tr key={i} className="border-b border-gray-100">
                  <td className="py-1 pr-2">
                    <input
                      className="input text-sm py-1 w-full"
                      value={row.label}
                      onChange={e => updateManual(i, 'label', e.target.value)}
                    />
                  </td>
                  {isSub ? (
                    <td className="py-1">
                      <div className="flex items-center gap-1">
                        <NumInput value={row.subCost} onChange={v => updateManual(i, 'subCost', v)} className="text-center flex-1" />
                        {activeManualRows.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setActiveManualRows(rows => rows.filter((_, idx) => idx !== i))}
                            className="text-gray-300 hover:text-red-500 text-sm px-1"
                            title="Remove line"
                          >
                            ×
                          </button>
                        )}
                      </div>
                    </td>
                  ) : (
                    <>
                      <td className="py-1 pr-2">
                        <NumInput value={row.hours} onChange={v => updateManual(i, 'hours', v)} className="text-center" />
                      </td>
                      <td className="py-1">
                        <div className="flex items-center gap-1">
                          <NumInput
                            value={row.materials}
                            onChange={v => updateManual(i, 'materials', v)}
                            className="text-center flex-1"
                          />
                          {activeManualRows.length > 1 && (
                            <button
                              type="button"
                              onClick={() => setActiveManualRows(rows => rows.filter((_, idx) => idx !== i))}
                              className="text-gray-300 hover:text-red-500 text-sm px-1"
                              title="Remove line"
                            >
                              ×
                            </button>
                          )}
                        </div>
                      </td>
                    </>
                  )}
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
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>
    </div>
    </SubRateOverrideProvider>
    </SubTabContext.Provider>
  )
}
