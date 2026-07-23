import WorkTypeChooser from './WorkTypeChooser'
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
import { SubRateOverrideProvider } from '../SubRateOverrideContext.jsx'
import { fetchSalesTaxRate } from '../../lib/companyDefaults'
import { calcWalkAccessLabor, DEFAULT_WALK_ACCESS_PACE_LF_PER_MIN } from '../../lib/walkAccess'

// ── Fallback constants ────────────────────────────────────────────────────────

const ACCESS_LEVELS = { Poor: 0.5, OK: 0.667, Full: 1.0 }
const STUB_HEIGHT_MODS = { '0-1': 0.75, '1-2': 1, '2-3': 1.5, '3-4': 2, '4-5': 2.5 }
const DUMP_TYPES = ['In-House', 'Subcontractor']

const RATE_DEFAULTS = {
  concrete: 0.75, // 'Demo - Hand Concrete/Dirt'
  grass: 0.75, // 'Demo - Hand Grass'
  importBase: 5.0, // 'Demo - Hand Import Base'
  bucket: 0.38, // 'Demo - Hand Bucket'  (tight-access hand bucket areas)
  jj: 1.75, // 'Demo - Hand JJ Compaction'
  rebarMin: 0.25, // 'Demo - Hand Rebar'  (min/SF)
  shrub: 0.75, // 'Demo - Hand Shrub'
  stumpFst: 2.5, // 'Demo - Hand Stump 1st'
  stumpAdd: 0.75, // 'Demo - Hand Stump Additional'
  treeSmall: 0.1, // 'Demo - Hand Tree Small'
  treeMed: 0.17, // 'Demo - Hand Tree Medium'
  treeLarge: 0.23, // 'Demo - Hand Tree Large'
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
  'Demo - Hand Dump - Concrete': 36.21,
  'Demo - Hand Dump - Dirt': 36.21,
  'Demo - Hand Dump - Green Waste': 72.19,
  'Demo - Hand Dump - Tree/Stump': 125.33,
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
  // Subcontractor rates: a one-off adjustment saved on THIS estimate
  // (state.rateOverrides) takes precedence over the master rate.
  const sr = { ...(subRates || {}) }
  Object.entries(state.rateOverrides || {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '' && Number.isFinite(Number(v))) sr[k] = Number(v)
  })
  const access = 1 // access modifier removed
  const isSub = state.dumpType === 'Subcontractor'
  const isDumpSub = false // disposal follows the In House/Sub toggle
  const lrph = n(laborRatePerHour) || 35
  const difficultyRatio = lr['Demo - Hand Difficulty Ratio'] ?? 1
  const diff = 1 + (n(state.difficulty) / 100) * difficultyRatio
  const hrsAdj = n(state.hoursAdj)

  // ── Rates from DB with fallbacks ──────────────────────────────────────────
  const rateConc = lr['Demo - Hand Concrete/Dirt'] ?? RATE_DEFAULTS.concrete
  const rateGrass = lr['Demo - Hand Grass'] ?? RATE_DEFAULTS.grass
  const rateBase = lr['Demo - Hand Import Base'] ?? RATE_DEFAULTS.importBase
  const rateBucket = lr['Demo - Hand Bucket'] ?? RATE_DEFAULTS.bucket
  const rateJJ = lr['Demo - Hand JJ Compaction'] ?? RATE_DEFAULTS.jj
  const rebarMinPerSF = lr['Demo - Hand Rebar'] ?? RATE_DEFAULTS.rebarMin
  const shrubRate = lr['Demo - Hand Shrub'] ?? RATE_DEFAULTS.shrub
  const stumpSmallRate = lr['Demo - Hand Stump Small'] ?? 1.25
  const stumpMedRate = lr['Demo - Hand Stump Medium'] ?? 2.5
  const stumpLargeRate = lr['Demo - Hand Stump Large'] ?? 3.75
  const stumpXLRate = lr['Demo - Hand Stump XL'] ?? 5
  const treeSmall = lr['Demo - Hand Tree Small'] ?? RATE_DEFAULTS.treeSmall
  const treeMed = lr['Demo - Hand Tree Medium'] ?? RATE_DEFAULTS.treeMed
  const treeLarge = lr['Demo - Hand Tree Large'] ?? RATE_DEFAULTS.treeLarge

  const dumpConc = mp['Demo - Hand Dump - Concrete'] ?? DUMP_FEE_DEFAULTS['Demo - Hand Dump - Concrete']
  const dumpDirt = mp['Demo - Hand Dump - Dirt'] ?? DUMP_FEE_DEFAULTS['Demo - Hand Dump - Dirt']
  const dumpGreen = mp['Demo - Hand Dump - Green Waste'] ?? DUMP_FEE_DEFAULTS['Demo - Hand Dump - Green Waste']
  const dumpTree = mp['Demo - Hand Dump - Tree/Stump'] ?? DUMP_FEE_DEFAULTS['Demo - Hand Dump - Tree/Stump']

  // ── Helpers ───────────────────────────────────────────────────────────────
  function flat(sf, depthIn, baseRate, dumpFeePerTon = 0) {
    const tons = sfToTons(sf, depthIn)
    if (!tons) return { tons: 0, hours: 0, dumpFee: 0 }
    return {
      tons,
      hours: tons / (baseRate * access), // labor always calculated
      dumpFee: tons * dumpFeePerTon,
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
      dumpFee: tons * dumpFeePerTon,
    }
  }

  // Editable container disposal rates (Master Rates -> Materials, category Demo).
  const containerPrice = mp['Demo - Hand Container (Low-Boy)'] ?? CONTAINER_COST
  const containerCy = mp['Demo - Hand Container Capacity (CY)'] ?? CONTAINER_CY
  const swellFactor = mp['Demo - Hand Removal Swell'] ?? SWELL
  const removalYards = (sf, depthIn) => ((n(sf) * (n(depthIn) / 12)) / 27) * swellFactor
  const removalContainers = (sf, depthIn) => Math.ceil(removalYards(sf, depthIn) / containerCy)
  const containerCost = (sf, depthIn) =>
    removalContainers(sf, depthIn) * containerPrice
  // Editable hand-demo removal labor: hours per 100 SF at 1", scaled by thickness.
  const laborConc = lr['Demo - Hand - Concrete SF'] ?? 1
  const laborDirt = lr['Demo - Hand - Dirt SF'] ?? 1
  const laborBase = lr['Demo - Hand - Import Base SF'] ?? 1
  const laborGrass = lr['Demo - Hand - Grass SF'] ?? 1
  const laborMiscFlat = lr['Demo - Hand - Misc Flat SF'] ?? 1
  const laborMiscVert = lr['Demo - Hand - Misc Vert SF'] ?? 1
  const laborFooting = lr['Demo - Hand - Footing SF'] ?? 1
  const laborGradeCut = lr['Demo - Hand - Grade Cut SF'] ?? 1
  const laborGradeFill = lr['Demo - Hand - Grade Fill SF'] ?? 1
  const laborJJ = lr['Demo - Hand - JJ SF'] ?? 1
  const sfLaborHrs = (sf, depthIn, rate) => (n(sf) / 100) * n(depthIn) * rate
  // Editable hauling coefficients: wheelbarrow load 1/5 cy; 4 sec/ft (covers round trip).
  const haulSecPerFt = lr['Demo - Hand Haul Sec/Ft'] ?? 4
  const haulLoadCy = lr['Demo - Hand Load (CY)'] ?? 0.2
  // Concrete-method labor generalized to raw cubic feet (= (sf/100)*depth for flat).
  const flatCf = (sf, depthIn) => n(sf) * (n(depthIn) / 12)
  const cfLaborHrs = (cf, rate) => (n(cf) * 12 / 100) * rate
  const containerCostCf = cf =>
    Math.ceil(((n(cf) / 27) * swellFactor) / containerCy) * containerPrice
  const baseMatPer10Cy = mp['Demo - Hand Import Base $/10cy'] ?? 150
  const rebarSfPerHr = lr['Demo - Hand Rebar SF/hr'] ?? 250

  // ── Demo rows ────────────────────────────────────────────────────────────
  const conc = flat(state.concSF, state.concDepth || 4, rateConc, 0)
  const dirt = flat(state.dirtSF, state.dirtDepth || 4, rateConc, 0)
  const base = flat(state.baseSF, state.baseDepth || 4, rateBase, 0)
  base.hours = 0.5 * sfLaborHrs(state.baseSF, state.baseDepth || 4, laborBase)
  const baseRawCy = flatCf(state.baseSF, state.baseDepth || 4) / 27
  const baseMat = Math.ceil(baseRawCy / 10) * baseMatPer10Cy
  const grass = flat(state.grassSF, state.grassDepth || 4, rateGrass, 0)
  // Removed debris — container disposal per material (shown as the row's Dump Fee).
  conc.dumpFee = containerCost(state.concSF, state.concDepth || 4)
  dirt.dumpFee = containerCost(state.dirtSF, state.dirtDepth || 4)
  grass.dumpFee = containerCost(state.grassSF, state.grassDepth || 4)
  // Hand-demo: concrete + soils removal labor is square-foot based (not tons).
  conc.hours = sfLaborHrs(state.concSF, state.concDepth || 4, laborConc)
  dirt.hours = sfLaborHrs(state.dirtSF, state.dirtDepth || 4, laborDirt)
  grass.hours = sfLaborHrs(state.grassSF, state.grassDepth || 4, laborGrass)

  const miscFlatCalc = (state.miscFlatRows || []).map(r => {
    const row = flat(r.sf, r.depth || 4, rateConc, 0)
    row.hours = sfLaborHrs(r.sf, r.depth || 4, laborMiscFlat)
    row.dumpFee = containerCost(r.sf, r.depth || 4)
    return row
  })
  const miscVertCalc = (state.miscVertRows || []).map(r => {
    const row = vert(r.lf, r.heightIn || 0, r.widthIn || 8, rateConc, 0)
    row.hours = cfLaborHrs(row.cf, laborMiscVert)
    row.dumpFee = containerCostCf(row.cf)
    return row
  })
  const footingCalc = (state.footingRows || []).map(r => {
    const row = vert(r.lf, r.heightIn || 0, r.widthIn || 8, rateConc, 0)
    row.hours = cfLaborHrs(row.cf, laborFooting)
    row.dumpFee = containerCostCf(row.cf)
    return row
  })

  // ── Hand Bucket Areas (confined-access manual work) ───────────────────────
  // Hand Bucket Areas: identical square-foot calc to Concrete demo but at
  // DOUBLE the rate (tight/confined access), and the same container disposal.
  const laborBucket = laborConc * 2
  const bucketCalc = (state.bucketRows || []).map(r => {
    const row = flat(r.sf, r.depth || 4, rateConc, 0)
    row.hours = sfLaborHrs(r.sf, r.depth || 4, laborBucket)
    row.dumpFee = containerCost(r.sf, r.depth || 4)
    return row
  })

  // ── Grading ──────────────────────────────────────────────────────────────
  const gradeCut = flat(state.gradeCutSF, state.gradeCutDepth || 4, rateConc, 0)
  gradeCut.dumpFee = containerCost(state.gradeCutSF, state.gradeCutDepth || 4)
  gradeCut.hours = sfLaborHrs(state.gradeCutSF, state.gradeCutDepth || 4, laborGradeCut)
  const gradeFill = flat(state.gradeFillSF, state.gradeFillDepth || 4, rateBase, 0)
  gradeFill.hours = sfLaborHrs(state.gradeFillSF, state.gradeFillDepth || 4, laborGradeFill)

  const jjHrs = sfLaborHrs(state.jjSF, state.jjDepth || 4, laborJJ)

  // ── Rebar add-on ─────────────────────────────────────────────────────────
  const rebarHrs = rebarSfPerHr > 0 ? n(state.rebarSF) / rebarSfPerHr : 0

  // ── Vegetation ───────────────────────────────────────────────────────────
  // Shrub demo: per-area rows — qty × shrub rate × shrub-height modifier.
  const shrubRowsCalc = (state.shrubRows || []).map(r => ({
    hrs: n(r.qty) * shrubRate * (STUB_HEIGHT_MODS[r.height] ?? 0.75),
  }))
  const shrubRowsHrs = shrubRowsCalc.reduce((s, r) => s + r.hrs, 0)
  const stumpSmallHrs = n(state.stumpSmallQty) * stumpSmallRate
  const stumpMedHrs = n(state.stumpMedQty) * stumpMedRate
  const stumpLargeHrs = n(state.stumpLargeQty) * stumpLargeRate
  const stumpXLHrs = n(state.stumpXLQty) * stumpXLRate
  const stumpHrs = stumpSmallHrs + stumpMedHrs + stumpLargeHrs + stumpXLHrs

  const treeCalc = (state.treeRows || []).map(r => {
    const qty = n(r.qty),
      ht = n(r.height) || 10
    const mult =
      r.size === '18" - 24"' || r.size === 'Large'
        ? treeLarge
        : r.size === '12" - 18"' || r.size === 'Medium'
          ? treeMed
          : treeSmall
    const hrs = qty * ht * access * mult
    const tons = qty * (ht / 10) * 0.25
    const dumpFee = tons * dumpTree
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
  const shConc = sr['Demo - Hand Sub Haul - Concrete'] ?? SUB_HAUL_DEFAULTS.concrete
  const shDirt = sr['Demo - Hand Sub Haul - Dirt'] ?? SUB_HAUL_DEFAULTS.dirt
  const shGrass = sr['Demo - Hand Sub Haul - Grass'] ?? SUB_HAUL_DEFAULTS.grass
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
  // Shrub & Stump Demo are In-House only — no labour or sub cost on Sub.
  const vegHrs = shrubRowsHrs + stumpHrs + treeCalc.reduce((s, r) => s + r.hrs, 0)

  const rawHrs = crewDemoHrs + gradingHrs + vegHrs + rebarHrs + manualHrs
  const _preWalkHrs = rawHrs * diff + hrsAdj
  // Hauling to the truck: trips (removed yards / load) x distance x sec/ft.
  const haulYards =
    removalYards(state.concSF, state.concDepth || 4) +
    removalYards(state.dirtSF, state.dirtDepth || 4) +
    removalYards(state.gradeCutSF, state.gradeCutDepth || 4) +
    removalYards(state.grassSF, state.grassDepth || 4)
  const haulTrips = haulLoadCy > 0 ? haulYards / haulLoadCy : 0
  const walkHrs = (haulTrips * n(state.distanceLF) * haulSecPerFt) / 3600
  const totalHrs = _preWalkHrs + walkHrs

  // ── Materials ─────────────────────────────────────────────────────────────
  const dumpMatCost =
    conc.dumpFee +
      dirt.dumpFee +
      grass.dumpFee +
      miscFlatCalc.reduce((s, r) => s + r.dumpFee, 0) +
      miscVertCalc.reduce((s, r) => s + r.dumpFee, 0) +
      footingCalc.reduce((s, r) => s + r.dumpFee, 0) +
      bucketCalc.reduce((s, r) => s + r.dumpFee, 0) +
      gradeCut.dumpFee +
      treeCalc.reduce((s, r) => s + r.dumpFee, 0)
  const totalMat = dumpMatCost + manualMat + baseMat

  // ── Financials ────────────────────────────────────────────────────────────
  const manDays = totalHrs / 8
  const laborCost = totalHrs * lrph
  const burden = laborCost * (n(laborBurdenPct) || 0.29)
  // Hauling (Subcontractor) — 12-yard loads × per-load rate (sub cost, pre-GP markup).
  const haulTrashRate = sr['Demo - Hand Sub Haul - Trash 12yd'] ?? 850
  const haulConcreteRate = sr['Demo - Hand Sub Haul - Concrete 12yd'] ?? 800
  const haulSoilRate = sr['Demo - Hand Sub Haul - Soil 12yd'] ?? 650
  const haulBaseRate = sr['Demo - Hand Sub Haul - Import Base 12yd'] ?? 350
  const haulCost =
    n(state.haulTrashLoads) * haulTrashRate +
    n(state.haulConcreteLoads) * haulConcreteRate +
    n(state.haulSoilLoads) * haulSoilRate +
    n(state.haulBaseLoads) * haulBaseRate
  // Subcontractor demo line: SF × per-sf rate (concrete/dirt/rock/paver combined).
  const handSubRate = sr['Sub Demo - Hand SF'] ?? 2.8
  const subDemoCost = n(state.subDemoSF) * handSubRate
  const miscFlatSubCost = (state.subMiscFlatRows || [])
    .slice(0, 2)
    .reduce((sum, r) => sum + n(r.sf) * handSubRate, 0)
  const handSubDemo = subDemoCost + miscFlatSubCost

  // ── Subcontractor fixed unit pricing: Grading ($/sf), Stump & Tree ($/ea) ──
  const sgCut = sr['Sub Grade - Hand Cut SF'] ?? 0
  const sgFill = sr['Sub Grade - Hand Fill SF'] ?? 0
  const sgJJ = sr['Sub Grade - Hand JJ SF'] ?? 0
  const sgSheep = sr['Sub Grade - Hand Sheepsfoot SF'] ?? 0
  const sgRoll = sr['Sub Grade - Hand Roll SF'] ?? 0
  const subGradingCost =
    n(state.subGradeCutSF) * sgCut +
    n(state.subGradeFillSF) * sgFill +
    n(state.subJjSF) * sgJJ +
    n(state.sheepsfootSF) * sgSheep +
    n(state.rollCompSF) * sgRoll

  const ssSmall = sr['Sub Stump - Hand Small'] ?? 0
  const ssMed = sr['Sub Stump - Hand Medium'] ?? 0
  const ssLarge = sr['Sub Stump - Hand Large'] ?? 0
  const ssXL = sr['Sub Stump - Hand XL'] ?? 0
  const subStumpCost =
    n(state.stumpSmallQty) * ssSmall +
    n(state.stumpMedQty) * ssMed +
    n(state.stumpLargeQty) * ssLarge +
    n(state.stumpXLQty) * ssXL

  const stSmall = sr['Sub Tree - Hand 6-12'] ?? 0
  const stMed = sr['Sub Tree - Hand 12-18'] ?? 0
  const stLarge = sr['Sub Tree - Hand 18-24'] ?? 0
  const subTreeRateFor = size =>
    size === '18" - 24"' || size === 'Large'
      ? stLarge
      : size === '12" - 18"' || size === 'Medium'
        ? stMed
        : stSmall
  const subTreeCost = (state.subTreeRows || []).reduce(
    (sum, r) => sum + n(r.qty) * subTreeRateFor(r.size),
    0,
  )

  const subFixedCost = subGradingCost + subTreeCost // stump hidden on Sub tab
  // GP = labor component + Universal Sub Markup % on sub-haul + hauling + sub demo
  const subCost = manualSub + haulCost + handSubDemo + subFixedCost
  // gross_profit saved = IN-HOUSE GP only; the GPMD bar adds Sub GP once so
  // project/estimate GPMD stays the base rate (no double-count of Sub GP).
  const subGp = subCost * subMarkupRate
  const gp = manDays * gpmd
  const commission = (gp + subGp) * 0.12
  const price = laborCost + burden + totalMat + gp + subGp + commission + subCost

  return {
    walkHrs,
    totalHrs,
    manDays,
    laborCost,
    burden,
    totalMat,
    subCost,
    haulCost,
    haulTrashRate,
    haulConcreteRate,
    haulSoilRate,
    haulBaseRate,
    handSubRate,
    subDemoCost,
    sgCut,
    sgFill,
    sgJJ,
    sgSheep,
    sgRoll,
    subGradingCost,
    ssSmall,
    ssMed,
    ssLarge,
    ssXL,
    subStumpCost,
    stSmall,
    stMed,
    stLarge,
    subTreeRateFor,
    subTreeCost,
    gp,
    subGp,
    commission,
    price,
    containerPrice,
    containerCy,
    swellFactor,
    laborConc,
    laborDirt,
    laborBase,
    laborGrass,
    laborMiscFlat,
    laborMiscVert,
    laborFooting,
    laborGradeCut,
    laborGradeFill,
    laborJJ,
    rebarSfPerHr,
    baseMat,
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
    jjHrs,
    rebarHrs,
    shrubRowsCalc,
    stumpSmallHrs,
    stumpMedHrs,
    stumpLargeHrs,
    stumpXLHrs,
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
    laborBucket,
    rateJJ,
    rebarMinPerSF,
    shrubRate,
    stumpSmallRate,
    stumpMedRate,
    stumpLargeRate,
    stumpXLRate,
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
  dirtDepth: 4,
  baseSF: '',
  baseDepth: 4,
  grassSF: '',
  grassDepth: 4,
  // Rebar add-on
  rebarSF: '',
  // Misc flat (SF + Depth)
  miscFlatRows: Array(4)
    .fill(null)
    .map(() => ({ label: '', sf: '', depth: 4 })),
  // Sub tab: its OWN misc-flat rows (2), independent of In-House.
  subMiscFlatRows: Array(2)
    .fill(null)
    .map(() => ({ label: '', sf: '', depth: 4 })),
  // Misc vertical (LF × Height × Width)
  miscVertRows: Array(4)
    .fill(null)
    .map(() => ({ label: '', lf: '', heightIn: '', widthIn: 8 })),
  // Footing (LF × Height × Width)
  footingRows: Array(4)
    .fill(null)
    .map(() => ({ label: '', lf: '', heightIn: '', widthIn: 8 })),
  // Hand Bucket Areas
  bucketRows: Array(4)
    .fill(null)
    .map(() => ({ label: '', sf: '', depth: 4 })),
  // Grading
  gradeCutSF: '',
  gradeCutDepth: 4,
  gradeFillSF: '',
  gradeFillDepth: 4,
  jjSF: '',
  jjDepth: 4,
  // Vegetation
  shrubRows: Array(4)
    .fill(null)
    .map(() => ({ area: '', qty: '', height: '0-1' })),
  stumpSmallQty: '',
  stumpMedQty: '',
  stumpLargeQty: '',
  stumpXLQty: '',
  haulTrashLoads: '',
  haulConcreteLoads: '',
  haulSoilLoads: '',
  haulBaseLoads: '',
  sheepsfootSF: '',
  rollCompSF: '',
  rateOverrides: {},
  subDemoSF: '',
  // Sub tab has its OWN grading fields — independent of In-House.
  subGradeCutSF: '',
  subGradeFillSF: '',
  subJjSF: '',
  subDemoDepth: 7,
  treeRows: [
    { qty: '', height: 20, size: '6" - 12"' },
    { qty: '', height: 20, size: '12" - 18"' },
    { qty: '', height: 20, size: '18" - 24"' },
  ],
  // Sub tab: its OWN tree rows, independent of In-House.
  subTreeRows: [
    { qty: '', height: 20, size: '6" - 12"' },
    { qty: '', height: 20, size: '12" - 18"' },
    { qty: '', height: 20, size: '18" - 24"' },
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
  // One-off subcontractor rate for this estimate only (undefined clears it).
  const setOverride = useCallback((name, value) => {
    setState(p => {
      const next = { ...(p.rateOverrides || {}) }
      if (value === undefined || value === null || value === '') delete next[name]
      else next[name] = Number(value)
      return { ...p, rateOverrides: next }
    })
  }, [])
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
  const isDumpSub = false // disposal follows the In House/Sub toggle

  const dumpConc = materialPrices['Demo - Hand Dump - Concrete'] ?? DUMP_FEE_DEFAULTS['Demo - Hand Dump - Concrete']
  const dumpDirt = materialPrices['Demo - Hand Dump - Dirt'] ?? DUMP_FEE_DEFAULTS['Demo - Hand Dump - Dirt']
  const dumpGreen =
    materialPrices['Demo - Hand Dump - Green Waste'] ?? DUMP_FEE_DEFAULTS['Demo - Hand Dump - Green Waste']

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
          subGp: calc.subGp,
          commission: calc.commission,
          price: calc.price,
        },
      },
    })
  }

  return (
    <SubRateOverrideProvider overrides={state.rateOverrides} setOverride={setOverride}>
    <div className="space-y-4">
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

      {/* In House / Subcontractor chooser — drives the Sub calculations (isSub) */}
      <WorkTypeChooser value={state.dumpType} onChange={v => set('dumpType', v)} />

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
      <SecHdr title="Job Site Conditions" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className={isSub ? 'hidden' : undefined}>
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
              name="Demo - Hand Difficulty Ratio"
              category="Demo"
              mode="coefficient"
              unitLabel="% per 1%"
              currentValue={calc.difficultyRatio}
              onSaved={refreshAllRates}
            />
          </p>
        </div>
        <div className={isSub ? 'hidden' : undefined}>
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
          <p className="text-xs text-gray-500 mb-0.5">Demo Type</p>
          <p className="text-sm font-medium text-gray-700 py-1">{isSelf ? 'In House' : 'Subcontractor'}</p>
        </div>
      </div>
      {/* Demolition */}
      <div>
        <div className="flex items-center flex-wrap gap-x-2 gap-y-1 text-xs font-bold text-gray-600 uppercase tracking-wider bg-gray-50 rounded-lg border border-gray-200 px-4 py-2.5 mt-4 mb-2">
          <span>Demolition</span>
          {isSelf && (
            <>
              <span className="font-normal normal-case">Container ${calc.containerPrice}</span>
              <RateEditPopover table="material_rates" name="Demo - Hand Container (Low-Boy)" category="Demo" unitLabel="container" currentValue={calc.containerPrice} onSaved={refreshAllRates} />
              <span className="font-normal normal-case">/ {calc.containerCy} cy</span>
              <RateEditPopover table="material_rates" name="Demo - Hand Container Capacity (CY)" category="Demo" mode="coefficient" unitLabel="cy" currentValue={calc.containerCy} onSaved={refreshAllRates} />
              <span className="font-normal normal-case">· ×{calc.swellFactor} swell</span>
              <RateEditPopover table="material_rates" name="Demo - Hand Removal Swell" category="Demo" mode="coefficient" unitLabel="×" currentValue={calc.swellFactor} onSaved={refreshAllRates} />
            </>
          )}
          {isSub && (
            <>
              <span className="text-gray-400 font-normal">·</span>
              <span className="font-normal normal-case">Concrete / Dirt / Rock / Paver — ${calc.handSubRate}/sf</span>
              <RateEditPopover table="subcontractor_rates" name="Sub Demo - Hand SF" unitLabel="/sf" currentValue={calc.handSubRate} onSaved={refreshAllRates} />
            </>
          )}
        </div>
        <table className="w-full text-xs">
          <TH
            cols={
              isSelf
                ? [
                    { label: 'Material', w: 'w-32' },
                    { label: 'SF', w: 'w-24' },
                    { label: 'Depth (in)', w: 'w-20' },
                    { label: 'Tons', w: 'w-16' },
                    { label: 'Dump Fee', w: 'w-24' },
                    { label: 'Labor Hrs', w: 'w-20' },
                  ]
                : [
                    { label: 'Material', w: 'w-40' },
                    { label: 'SF', w: 'w-24' },
                    { label: 'Depth (in)', w: 'w-20' },
                    { label: 'Cost', w: 'w-24' },
                  ]
            }
          />
          <tbody className="divide-y divide-gray-50">
            {isSelf ? [
              {
                label: 'Concrete',
                sfK: 'concSF',
                dK: 'concDepth',
                dep: 4,
                row: calc.conc,
                fee: dumpConc,
                rate: calc.laborConc,
                rateName: 'Demo - Hand - Concrete SF',
                rateNote: `${calc.laborConc} hr/100sf·in`,
                rateUnit: 'hr/100sf·in',
              },
              {
                label: 'Dirt/Rock',
                sfK: 'dirtSF',
                dK: 'dirtDepth',
                dep: 4,
                row: calc.dirt,
                fee: dumpDirt,
                rate: calc.laborDirt,
                rateName: 'Demo - Hand - Dirt SF',
                rateNote: `${calc.laborDirt} hr/100sf·in`,
                rateUnit: 'hr/100sf·in',
              },
              {
                label: 'Import Base',
                sfK: 'baseSF',
                dK: 'baseDepth',
                dep: 4,
                row: calc.base,
                fee: 0,
                rate: calc.laborBase,
                rateName: 'Demo - Hand - Import Base SF',
                rateNote: `½ × ${calc.laborBase} hr/100sf·in`,
                rateUnit: 'hr/100sf·in',
              },
              {
                label: 'Grass/Sod',
                sfK: 'grassSF',
                dK: 'grassDepth',
                dep: 4,
                row: calc.grass,
                fee: dumpGreen,
                rate: calc.laborGrass,
                rateName: 'Demo - Hand - Grass SF',
                rateNote: `${calc.laborGrass} hr/100sf·in`,
                rateUnit: 'hr/100sf·in',
              },
            ].map(({ label, sfK, dK, dep, row, rate, rateName, rateNote, rateUnit, extraIcon }) => (
              <tr key={label}>
                <td className={`${td} font-medium text-gray-700`}>
                  <span className="inline-flex items-center gap-1">
                    {label}
                    {isSelf && (
                      <>
                        <span className="text-gray-400 font-normal text-[10px]">({rateNote})</span>
                        <RateEditPopover table="labor_rates" name={rateName} category="Demo" mode="coefficient" unitLabel={rateUnit || 't/hr'} currentValue={rate} onSaved={refreshAllRates} />
                        {extraIcon}
                      </>
                    )}
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
            )) : (
              <tr>
                <td className={`${td} font-medium text-gray-700`}>Concrete / Dirt / Rock / Paver</td>
                <td className={td}>
                  <Inp value={state.subDemoSF} onChange={e => set('subDemoSF', e.target.value)} />
                </td>
                <td className={td}>
                  <Inp value={state.subDemoDepth} onChange={e => set('subDemoDepth', e.target.value)} placeholder="7" />
                </td>
                <td className={num}>{calc.subDemoCost > 0 ? fmt2(calc.subDemoCost) : '—'}</td>
              </tr>
            )}
          </tbody>
        </table>

        {isSelf && (
        <div className="mt-3 flex items-center gap-3">
          <div className="flex-1 max-w-xs">
            <p className="text-xs text-gray-500 mb-0.5 inline-flex items-center gap-1">
              Rebar SF
              <span className="text-gray-400 font-normal">
                (1 hr per {calc.rebarSfPerHr} SF)
              </span>
              <RateEditPopover
                table="labor_rates"
                name="Demo - Hand Rebar SF/hr"
                category="Demo"
                mode="coefficient"
                unitLabel="SF/hr"
                currentValue={calc.rebarSfPerHr}
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
        )}
      </div>

      {/* Misc Flat */}
      <div>
        <div className="flex items-center flex-wrap gap-x-2 gap-y-1 text-xs font-bold text-gray-600 uppercase tracking-wider bg-gray-50 rounded-lg border border-gray-200 px-4 py-2.5 mt-4 mb-2">
          <span>Misc Flat Demo</span>
          {isSelf && (
            <>
              <span className="text-gray-400 font-normal">·</span>
              <span className="font-normal normal-case">Hand labor {calc.laborMiscFlat} hr/100sf·in</span>
              <RateEditPopover table="labor_rates" name="Demo - Hand - Misc Flat SF" category="Demo" mode="coefficient" unitLabel="hr/100sf·in" currentValue={calc.laborMiscFlat} onSaved={refreshAllRates} />
              <span className="text-gray-400 font-normal">·</span>
              <span className="font-normal normal-case">Container ${calc.containerPrice}</span>
              <RateEditPopover table="material_rates" name="Demo - Hand Container (Low-Boy)" category="Demo" unitLabel="container" currentValue={calc.containerPrice} onSaved={refreshAllRates} />
              <span className="font-normal normal-case">/ {calc.containerCy} cy</span>
              <RateEditPopover table="material_rates" name="Demo - Hand Container Capacity (CY)" category="Demo" mode="coefficient" unitLabel="cy" currentValue={calc.containerCy} onSaved={refreshAllRates} />
              <span className="font-normal normal-case">· ×{calc.swellFactor} swell</span>
              <RateEditPopover table="material_rates" name="Demo - Hand Removal Swell" category="Demo" mode="coefficient" unitLabel="×" currentValue={calc.swellFactor} onSaved={refreshAllRates} />
            </>
          )}
          {isSub && (
            <>
              <span className="text-gray-400 font-normal">·</span>
              <span className="font-normal normal-case">${calc.handSubRate}/sf</span>
              <RateEditPopover table="subcontractor_rates" name="Sub Demo - Hand SF" unitLabel="/sf" currentValue={calc.handSubRate} onSaved={refreshAllRates} />
            </>
          )}
        </div>
        <table className="w-full text-xs">
          <TH
            cols={
              isSelf
                ? [
                    { label: 'Description' },
                    { label: 'SF', w: 'w-24' },
                    { label: 'Depth (in)', w: 'w-20' },
                    { label: 'Tons', w: 'w-16' },
                    { label: 'Disposal', w: 'w-24' },
                    { label: 'Labor Hrs', w: 'w-20' },
                  ]
                : [
                    { label: 'Description' },
                    { label: 'SF', w: 'w-24' },
                    { label: 'Cost', w: 'w-24' },
                  ]
            }
          />
          <tbody className="divide-y divide-gray-50">
            {(isSub ? state.subMiscFlatRows.slice(0, 2) : state.miscFlatRows).map((r, i) => {
              const cr = calc.miscFlatCalc[i] || { tons: 0, hours: 0, dumpFee: 0 }
              return (
                <tr key={i}>
                  <td className={td}>
                    <Inp
                      type="text"
                      value={r.label}
                      onChange={e => setRow(isSub ? 'subMiscFlatRows' : 'miscFlatRows', i, 'label', e.target.value)}
                      placeholder={`Item ${i + 1}`}
                    />
                  </td>
                  <td className={td}>
                    <Inp
                      value={r.sf}
                      onChange={e => setRow(isSub ? 'subMiscFlatRows' : 'miscFlatRows', i, 'sf', e.target.value)}
                    />
                  </td>
                  {isSelf && (
                    <td className={td}>
                      <Inp
                        value={r.depth}
                        onChange={e => setRow('miscFlatRows', i, 'depth', e.target.value)}
                        placeholder="4"
                      />
                    </td>
                  )}
                  {isSelf ? (
                    <>
                      <td className={num}>{cr.tons > 0 ? cr.tons.toFixed(1) : '—'}</td>
                      <td className={num}>{cr.dumpFee > 0 ? fmt2(cr.dumpFee) : '—'}</td>
                      <td className={num}>{fh(cr.hours)}</td>
                    </>
                  ) : (
                    <td className={num}>{n(r.sf) > 0 ? fmt2(n(r.sf) * calc.handSubRate) : '—'}</td>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Misc Vertical */}
      <div className={isSub ? 'hidden' : undefined}>
        <div className="flex items-center flex-wrap gap-x-2 gap-y-1 text-xs font-bold text-gray-600 uppercase tracking-wider bg-gray-50 rounded-lg border border-gray-200 px-4 py-2.5 mt-4 mb-2">
          <span>Misc Vertical / Structural Demo</span>
          {isSelf && (
            <>
              <span className="font-normal normal-case text-gray-500">· LF × Height × Width · cu-ft labor {calc.laborMiscVert} hr/100sf·in equiv</span>
              <RateEditPopover table="labor_rates" name="Demo - Hand - Misc Vert SF" category="Demo" mode="coefficient" unitLabel="hr/100sf·in" currentValue={calc.laborMiscVert} onSaved={refreshAllRates} />
              <span className="font-normal normal-case text-gray-500">· container disposal</span>
            </>
          )}
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
      <div className={isSub ? 'hidden' : undefined}>
        <div className="flex items-center flex-wrap gap-x-2 gap-y-1 text-xs font-bold text-gray-600 uppercase tracking-wider bg-gray-50 rounded-lg border border-gray-200 px-4 py-2.5 mt-4 mb-2">
          <span>Footing Demo</span>
          {isSelf && (
            <>
              <span className="font-normal normal-case text-gray-500">· LF × Height × Width · cu-ft labor {calc.laborFooting} hr/100sf·in equiv</span>
              <RateEditPopover table="labor_rates" name="Demo - Hand - Footing SF" category="Demo" mode="coefficient" unitLabel="hr/100sf·in" currentValue={calc.laborFooting} onSaved={refreshAllRates} />
              <span className="font-normal normal-case text-gray-500">· container disposal</span>
            </>
          )}
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
            {state.footingRows.map((r, i) => {
              const cr = calc.footingCalc[i] || { tons: 0, hours: 0, cf: 0 }
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
                      value={r.lf}
                      onChange={e => setRow('footingRows', i, 'lf', e.target.value)}
                    />
                  </td>
                  <td className={td}>
                    <Inp
                      value={r.heightIn}
                      onChange={e => setRow('footingRows', i, 'heightIn', e.target.value)}
                      placeholder="0"
                    />
                  </td>
                  <td className={td}>
                    <Inp
                      value={r.widthIn}
                      onChange={e => setRow('footingRows', i, 'widthIn', e.target.value)}
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

      {/* Hand Bucket Areas */}
      <div className={isSub ? 'hidden' : undefined}>
        <div className="flex items-center flex-wrap gap-x-2 gap-y-1 text-xs font-bold text-gray-600 uppercase tracking-wider bg-gray-50 rounded-lg border border-gray-200 px-4 py-2.5 mt-4 mb-2">
          <span>Hand Bucket Areas</span>
          {isSelf && (
            <>
              <span className="font-normal normal-case text-gray-500">· tight/confined access · 2 × concrete rate = {calc.laborBucket} hr/100sf·in</span>
              <RateEditPopover table="labor_rates" name="Demo - Hand - Concrete SF" category="Demo" mode="coefficient" unitLabel="hr/100sf·in" currentValue={calc.laborConc} onSaved={refreshAllRates} />
              <span className="font-normal normal-case text-gray-500">· container disposal</span>
            </>
          )}
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

      {isSub && (
        <>
          <SecHdr title="Hauling" />
          <div>
            <table className="w-full text-xs">
              <TH
                cols={[{ label: 'Load Type' }, { label: 'Loads', w: 'w-24' }, { label: 'Cost', w: 'w-24' }]}
              />
              <tbody className="divide-y divide-gray-50">
                {[
                  { label: 'Trash Per 12 Yard Load', key: 'haulTrashLoads', rate: calc.haulTrashRate, rateName: 'Demo - Hand Sub Haul - Trash 12yd' },
                  { label: 'Concrete Per 12 Yard Load', key: 'haulConcreteLoads', rate: calc.haulConcreteRate, rateName: 'Demo - Hand Sub Haul - Concrete 12yd' },
                  { label: 'Soil Per 12 Yard Load', key: 'haulSoilLoads', rate: calc.haulSoilRate, rateName: 'Demo - Hand Sub Haul - Soil 12yd' },
                  { label: 'Import Base Per 12 Yard Load', key: 'haulBaseLoads', rate: calc.haulBaseRate, rateName: 'Demo - Hand Sub Haul - Import Base 12yd' },
                ].map(({ label, key, rate, rateName }) => (
                  <tr key={key}>
                    <td className={`${td} font-medium text-gray-700`}>
                      <span className="inline-flex items-center gap-1">
                        {label}
                        <span className="text-gray-400 font-normal">(${rate}/load)</span>
                        <RateEditPopover
                          table="subcontractor_rates"
                          name={rateName}
                          unitLabel="/load"
                          currentValue={rate}
                          onSaved={refreshAllRates}
                        />
                      </span>
                    </td>
                    <td className={td}>
                      <Inp value={state[key]} onChange={e => set(key, e.target.value)} />
                    </td>
                    <td className={num}>{n(state[key]) > 0 ? fmt2(n(state[key]) * rate) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Grading */}
      <div>
        <div className="flex items-center gap-2 text-xs font-bold text-gray-600 uppercase tracking-wider bg-gray-50 rounded-lg border border-gray-200 px-4 py-2.5 mt-4 mb-2">
          Grading
        </div>
        {isSelf && (
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
                dep: 4,
                tons: calc.gradeCut.tons,
                hrs: calc.gradeCut.hours,
                note: `${calc.laborGradeCut} hr/100sf·in`,
                rate: calc.laborGradeCut,
                rateName: 'Demo - Hand - Grade Cut SF',
                rateUnit: 'hr/100sf·in',
              },
              {
                label: 'Grade Fill',
                sfK: 'gradeFillSF',
                dK: 'gradeFillDepth',
                dep: 4,
                tons: calc.gradeFill.tons,
                hrs: calc.gradeFill.hours,
                note: `${calc.laborGradeFill} hr/100sf·in`,
                rate: calc.laborGradeFill,
                rateName: 'Demo - Hand - Grade Fill SF',
                rateUnit: 'hr/100sf·in',
              },
              {
                label: 'Jumping Jack',
                sfK: 'jjSF',
                dK: 'jjDepth',
                dep: 4,
                tons: 0,
                hrs: calc.jjHrs,
                note: `${calc.laborJJ} hr/100sf·in`,
                rate: calc.laborJJ,
                rateName: 'Demo - Hand - JJ SF',
                rateUnit: 'hr/100sf·in',
              },
            ].map(({ label, sfK, dK, dep, tons, hrs, note, rate, rateName, rateUnit }) => (
              <tr key={label}>
                <td className={`${td} font-medium text-gray-700`}>
                  <span className="inline-flex items-center gap-1">
                    {label}
                    {isSelf && (
                      <>
                        <span className="text-gray-400 font-normal">({note})</span>
                        <RateEditPopover table="labor_rates" name={rateName} category="Demo" mode="coefficient" unitLabel={rateUnit || 't/hr'} currentValue={rate} onSaved={refreshAllRates} />
                      </>
                    )}
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
        )}
        {isSub && (
          <>
          <table className="w-full text-xs">
            <TH
              cols={[
                { label: 'Operation', w: 'w-48' },
                { label: 'SF', w: 'w-24' },
                { label: 'Cost', w: 'w-24' },
              ]}
            />
            <tbody className="divide-y divide-gray-50">
              {[
                { label: 'Grade Cut', key: 'subGradeCutSF', rate: calc.sgCut, rateName: 'Sub Grade - Hand Cut SF' },
                { label: 'Grade Fill', key: 'subGradeFillSF', rate: calc.sgFill, rateName: 'Sub Grade - Hand Fill SF' },
                { label: 'Jumping Jack', key: 'subJjSF', rate: calc.sgJJ, rateName: 'Sub Grade - Hand JJ SF' },
                { label: 'Sheepsfoot Compactor', key: 'sheepsfootSF', rate: calc.sgSheep, rateName: 'Sub Grade - Hand Sheepsfoot SF' },
                { label: 'Roll Compactor', key: 'rollCompSF', rate: calc.sgRoll, rateName: 'Sub Grade - Hand Roll SF' },
              ].map(({ label, key, rate, rateName }) => (
                <tr key={key}>
                  <td className={`${td} font-medium text-gray-700`}>
                    <span className="inline-flex items-center gap-1">
                      {label}
                      <span className="text-gray-400 font-normal">(${rate}/sf)</span>
                      <RateEditPopover
                        table="subcontractor_rates"
                        name={rateName}
                        unitLabel="/sf"
                        currentValue={rate}
                        onSaved={refreshAllRates}
                      />
                    </span>
                  </td>
                  <td className={td}>
                    <Inp value={state[key]} onChange={e => set(key, e.target.value)} />
                  </td>
                  <td className={num}>{n(state[key]) > 0 ? fmt2(n(state[key]) * rate) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-xs text-gray-500 mt-1 italic">
            Note: Grade Cut is for up to 2&quot; only.
          </p>
          </>
        )}
      </div>

      {isSelf && (
        <>
      {/* Shrub Demo */}
      <SecHdr title="Shrub Demo" />
      <div>
        <table className="w-full text-xs">
          <TH
            cols={[
              { label: 'Area Description' },
              { label: 'Qty', w: 'w-20' },
              { label: 'Shrub Height', w: 'w-32' },
              { label: 'Labor Hrs', w: 'w-20' },
            ]}
          />
          <tbody className="divide-y divide-gray-50">
            {state.shrubRows.map((r, i) => {
              const cr = calc.shrubRowsCalc[i] || { hrs: 0 }
              return (
                <tr key={i}>
                  <td className={td}>
                    <Inp
                      type="text"
                      value={r.area}
                      onChange={e => setRow('shrubRows', i, 'area', e.target.value)}
                      placeholder={`Area ${i + 1}`}
                    />
                  </td>
                  <td className={td}>
                    <Inp value={r.qty} onChange={e => setRow('shrubRows', i, 'qty', e.target.value)} />
                  </td>
                  <td className={td}>
                    <select
                      value={r.height || '0-1'}
                      onChange={e => setRow('shrubRows', i, 'height', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
                    >
                      {[['0-1', '0–1 ft'], ['1-2', '1–2 ft'], ['2-3', '2–3 ft'], ['3-4', '3–4 ft'], ['4-5', '4–5 ft']].map(([v, l]) => (
                        <option key={v} value={v}>
                          {l}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className={num}>{fh(cr.hrs)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {isSelf && (
          <p className="text-xs text-gray-400 mt-1 inline-flex items-center gap-1">
            {calc.shrubRate} hrs/ea × shrub-height modifier
            <RateEditPopover
              table="labor_rates"
              name="Demo - Hand Shrub"
              category="Demo"
              mode="coefficient"
              unitLabel="hrs/ea"
              currentValue={calc.shrubRate}
              onSaved={refreshAllRates}
            />
          </p>
        )}
      </div>

      {/* Stump Demo */}
      <SecHdr title="Stump Demo" />
      <div className="grid grid-cols-2 gap-3">
        {[
          {
            label: 'Small (up to 12")',
            key: 'stumpSmallQty',
            hrs: calc.stumpSmallHrs,
            sub: `${calc.stumpSmallRate} hrs/ea`,
            rate: calc.stumpSmallRate,
            rateName: 'Demo - Hand Stump Small',
            subRate: calc.ssSmall,
            subRateName: 'Sub Stump - Hand Small',
          },
          {
            label: 'Medium (12"–24")',
            key: 'stumpMedQty',
            hrs: calc.stumpMedHrs,
            sub: `${calc.stumpMedRate} hrs/ea`,
            rate: calc.stumpMedRate,
            rateName: 'Demo - Hand Stump Medium',
            subRate: calc.ssMed,
            subRateName: 'Sub Stump - Hand Medium',
          },
          {
            label: 'Large (24"–36")',
            key: 'stumpLargeQty',
            hrs: calc.stumpLargeHrs,
            sub: `${calc.stumpLargeRate} hrs/ea`,
            rate: calc.stumpLargeRate,
            rateName: 'Demo - Hand Stump Large',
            subRate: calc.ssLarge,
            subRateName: 'Sub Stump - Hand Large',
          },
          {
            label: 'Extra Large (36"–48")',
            key: 'stumpXLQty',
            hrs: calc.stumpXLHrs,
            sub: `${calc.stumpXLRate} hrs/ea`,
            rate: calc.stumpXLRate,
            rateName: 'Demo - Hand Stump XL',
            subRate: calc.ssXL,
            subRateName: 'Sub Stump - Hand XL',
          },
        ].map(({ label, key, hrs, sub, rate, rateName, subRate, subRateName }) => (
          <div key={key}>
            <p className="text-xs text-gray-500 mb-0.5 inline-flex items-center gap-1">
              {label}
              {isSub ? (
                <RateEditPopover
                  table="subcontractor_rates"
                  name={subRateName}
                  unitLabel="/ea"
                  currentValue={subRate}
                  onSaved={refreshAllRates}
                />
              ) : (
                <RateEditPopover
                  table="labor_rates"
                  name={rateName}
                  category="Demo"
                  mode="coefficient"
                  unitLabel="hrs/ea"
                  currentValue={rate}
                  onSaved={refreshAllRates}
                />
              )}
            </p>
            <Inp value={state[key]} onChange={e => set(key, e.target.value)} />
            <p className="text-xs text-gray-400 mt-0.5">
              {isSub
                ? n(state[key]) > 0
                  ? `${fmt2(n(state[key]) * subRate)} — $${subRate}/ea`
                  : `$${subRate}/ea`
                : hrs > 0
                  ? `${hrs.toFixed(2)} hrs — ${sub}`
                  : sub}
            </p>
          </div>
        ))}
      </div>

        </>
      )}

      {/* Trees */}
      <div>
        <div className="flex items-center flex-wrap gap-x-2 gap-y-1 text-xs font-bold text-gray-600 uppercase tracking-wider bg-gray-50 rounded-lg border border-gray-200 px-4 py-2.5 mt-4 mb-2">
          <span>Tree Demo</span>
          {isSelf && (
            <>
          <span className="font-normal normal-case text-gray-500">· qty × height × size multiplier</span>
          <span className="font-normal normal-case text-gray-400 inline-flex items-center gap-1">
            (S:{calc.treeSmall}
            <RateEditPopover
              table="labor_rates"
              name="Demo - Hand Tree Small"
              category="Demo"
              mode="coefficient"
              unitLabel="hrs/ft"
              currentValue={calc.treeSmall}
              onSaved={refreshAllRates}
            />
            · M:{calc.treeMed}
            <RateEditPopover
              table="labor_rates"
              name="Demo - Hand Tree Medium"
              category="Demo"
              mode="coefficient"
              unitLabel="hrs/ft"
              currentValue={calc.treeMed}
              onSaved={refreshAllRates}
            />
            · L:{calc.treeLarge}
            <RateEditPopover
              table="labor_rates"
              name="Demo - Hand Tree Large"
              category="Demo"
              mode="coefficient"
              unitLabel="hrs/ft"
              currentValue={calc.treeLarge}
              onSaved={refreshAllRates}
            />
            hrs/ft)
          </span>
            </>
          )}
          {isSub && (
            <span className="font-normal normal-case text-gray-500 inline-flex items-center gap-1">
              · per tree: 6-12" ${calc.stSmall}
              <RateEditPopover table="subcontractor_rates" name="Sub Tree - Hand 6-12" unitLabel="/ea" currentValue={calc.stSmall} onSaved={refreshAllRates} />
              · 12-18" ${calc.stMed}
              <RateEditPopover table="subcontractor_rates" name="Sub Tree - Hand 12-18" unitLabel="/ea" currentValue={calc.stMed} onSaved={refreshAllRates} />
              · 18-24" ${calc.stLarge}
              <RateEditPopover table="subcontractor_rates" name="Sub Tree - Hand 18-24" unitLabel="/ea" currentValue={calc.stLarge} onSaved={refreshAllRates} />
            </span>
          )}
          {isSelf && (
            <span className="font-normal normal-case text-gray-400 inline-flex items-center gap-1">
              · Tree dump
              <RateEditPopover
                table="material_rates"
                name="Demo - Hand Dump - Tree/Stump"
                category="Demo"
                unitLabel="ton"
                currentValue={
                  materialPrices['Demo - Hand Dump - Tree/Stump'] ??
                  DUMP_FEE_DEFAULTS['Demo - Hand Dump - Tree/Stump']
                }
                onSaved={refreshAllRates}
              />
            </span>
          )}
        </div>
        <table className="w-full text-xs">
          <TH
            cols={
              isSelf
                ? [
                    { label: 'Qty', w: 'w-16' },
                    { label: 'Height (ft)', w: 'w-24' },
                    { label: 'Trunk Size', w: 'w-32' },
                    { label: 'Labor Hrs', w: 'w-20' },
                    { label: 'Tree Dump', w: 'w-24' },
                  ]
                : [
                    { label: 'Qty', w: 'w-16' },
                    { label: 'Trunk Size', w: 'w-32' },
                    { label: 'Cost', w: 'w-24' },
                  ]
            }
          />
          <tbody className="divide-y divide-gray-50">
            {(isSub ? state.subTreeRows : state.treeRows).map((r, i) => {
              const cr = calc.treeCalc[i] || { hrs: 0, dumpFee: 0 }
              return (
                <tr key={i}>
                  <td className={td}>
                    <Inp
                      value={r.qty}
                      onChange={e => setRow(isSub ? 'subTreeRows' : 'treeRows', i, 'qty', e.target.value)}
                    />
                  </td>
                  {isSelf && (
                    <td className={td}>
                      <Inp
                        value={r.height}
                        onChange={e => setRow('treeRows', i, 'height', e.target.value)}
                        placeholder="10"
                      />
                    </td>
                  )}
                  <td className={td}>
                    <Sel
                      value={r.size}
                      onChange={e => setRow(isSub ? 'subTreeRows' : 'treeRows', i, 'size', e.target.value)}
                      options={['6" - 12"', '12" - 18"', '18" - 24"']}
                    />
                  </td>
                  {isSelf ? (
                    <>
                      <td className={num}>{fh(cr.hrs)}</td>
                      <td className={num}>{cr.dumpFee > 0 ? fmt2(cr.dumpFee) : '—'}</td>
                    </>
                  ) : (
                    <td className={num}>
                      {n(r.qty) > 0 ? fmt2(n(r.qty) * calc.subTreeRateFor(r.size)) : '—'}
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
        <p className="text-xs text-gray-500 mt-1 italic">
          Note: trunks over 24" must be subcontracted.
        </p>
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
        <button
          type="button"
          onClick={() => set('manualRows', [...state.manualRows, { label: '', hours: '', materials: '', subCost: '' }])}
          className="mt-2 text-xs px-2 py-1 rounded bg-slate-100 text-slate-700 hover:bg-slate-200"
        >
          + Add manual entry
        </button>
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
    </SubRateOverrideProvider>
  )
}
