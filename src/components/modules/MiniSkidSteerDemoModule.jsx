import WorkTypeChooser from './WorkTypeChooser'
// ─────────────────────────────────────────────────────────────────────────────
// MiniSkidSteerDemoModule — Mini Skid Steer Demo estimator
//
// All labor rates pulled from labor_rates table (lr[]) with constant fallbacks.
// Rate keys for mini-specific rates differ from full SS:
//   'Demo - Mini Skid Steer Concrete/Dirt'   0.75 t/hr
//   'Demo - Mini Skid Steer Grass'           0.75 t/hr
//   'Demo - Mini Skid Steer Import Base'     5.0 t/hr
//   'Demo - Mini SS Compaction'          1.23 t/hr
// Shared with full SS:
//   'Demo - Mini JJ Compaction', 'Demo - Mini Shrub', 'Demo - Stump 1st/Additional',
//   'Demo - Tree Small/Medium/Large', 'Demo - Mini Rebar'
//
// Mini-specific dump fee differences vs full SS:
//   • Import Base carries $7.50/ton dump fee
//   • Misc Flat/Vert/Footing carry $36.21/ton concrete dump fee
//   • Trees use $125.33/ton 'Demo - Mini Dump - Tree/Stump'
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
const BOBCAT_BUCKET_LBS = 400

// ── Fallback constants ────────────────────────────────────────────────────────

// Excel uses two separate access tables:
//   NonBobLevels — for hand/mini demo items (concrete, dirt, base, misc)
//   BobcatLevels — for bobcat-assisted operations (grading, footing, grass, vegetation)
const NON_BOB_LEVELS = { Poor: 0.5, OK: 0.667, Full: 1.0 }
const BOB_LEVELS = { Poor: 0.5, OK: 0.75, Full: 1.0 }
const DUMP_TYPES = ['In-House', 'Subcontractor']

const RATE_DEFAULTS = {
  concrete: 0.75, // 'Demo - Mini Skid Steer Concrete/Dirt' (NonBob)
  grass: 0.75, // 'Demo - Mini Skid Steer Grass' (Bobcat)
  importBase: 5.0, // 'Demo - Mini Skid Steer Import Base' (NonBob)
  bobcatConc: 2.0, // Full Bobcat haul rate — used for Grade Cut & Footing
  bobcatBase: 10.0, // Full Bobcat base spread — used for Grade Fill
  jj: 1.75, // 'Demo - Mini JJ Compaction'
  ssCompact: 1.23, // 'Demo - Mini SS Compaction'
  rebarMin: 0.05, // 'Demo - Mini Rebar'
  shrub: 0.75, // 'Demo - Mini Shrub'
  stumpFst: 2.5, // 'Demo - Mini Stump 1st'
  stumpAdd: 0.75, // 'Demo - Mini Stump Additional'
  treeSmall: 0.1, // 'Demo - Mini Tree Small'
  treeMed: 0.15, // 'Demo - Mini Tree Medium'
  treeLarge: 0.2, // 'Demo - Mini Tree Large'
}

// Sub Haul rates — billed per 1.5 tons removed (sub cost, not materials)
// Labor is unchanged in Sub Haul mode; dump fees are replaced by these charges
const SUB_HAUL_DEFAULTS = {
  concrete: 85, // $/1.5T — concrete, misc flat/vert, footing
  dirt: 95, // $/1.5T — dirt/rock, grade cut
  grass: 120, // $/1.5T — grass/sod
}

const DUMP_FEE_DEFAULTS = {
  'Demo - Mini Dump - Concrete': 36.21,
  'Demo - Mini Dump - Dirt': 36.21,
  'Demo - Mini Dump - Green Waste': 72.19,
  'Demo - Mini Dump - Tree/Stump': 125.33,
  'Demo - Mini Dump - Import Base': 7.5,
}

// ── Calculation engine ────────────────────────────────────────────────────────

const n = v => parseFloat(v) || 0
const sfToTons = (sf, depthIn) => (n(sf) / 200) * n(depthIn)

// Container-based removal: SF -> CF (x depth/12) -> CY (/27) -> x swell,
// billed at a flat rate per low-boy container (per material, rounded up).
const CONTAINER_COST = 770
const CONTAINER_CY = 10
const SWELL = 1.2

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
  // Excel uses two separate access-level tables:
  //   NonBobLevels — hand/mini demo items (concrete, dirt, base, misc flat/vert)
  //   BobcatLevels — bobcat-assisted ops (grass, grading, footing, vegetation)
  const accessNonBob = 1 // access modifier removed
  const accessBobcat = 1 // access modifier removed
  const isSub = state.dumpType === 'Subcontractor'
  const isDumpSub = false // disposal follows the In House/Sub toggle
  const lrph = n(laborRatePerHour) || 35
  const difficultyRatio = lr['Demo - Mini Difficulty Ratio'] ?? 1
  const diff = 1 + (n(state.difficulty) / 100) * difficultyRatio
  const hrsAdj = n(state.hoursAdj)

  // ── Pull rates from DB (lr) with fallbacks ────────────────────────────────
  // Mini Skid Steer rates — used for all operations
  const laborConc = lr['Demo - Mini - Concrete t/hr'] ?? RATE_DEFAULTS.concrete
  const laborDirt = lr['Demo - Mini - Dirt t/hr'] ?? RATE_DEFAULTS.concrete
  const laborMiscFlat = lr['Demo - Mini - Misc Flat t/hr'] ?? RATE_DEFAULTS.concrete
  const laborMiscVert = lr['Demo - Mini - Misc Vert t/hr'] ?? RATE_DEFAULTS.concrete
  const laborFooting = lr['Demo - Mini - Footing t/hr'] ?? RATE_DEFAULTS.concrete
  const laborGradeCut = lr['Demo - Mini - Grade Cut t/hr'] ?? RATE_DEFAULTS.concrete
  const rateGrass = lr['Demo - Mini Skid Steer Grass'] ?? RATE_DEFAULTS.grass
  const laborBase = lr['Demo - Mini - Import Base t/hr'] ?? RATE_DEFAULTS.importBase
  const laborGradeFill = lr['Demo - Mini - Grade Fill t/hr'] ?? RATE_DEFAULTS.importBase
  const rateJJ = lr['Demo - Mini JJ Compaction'] ?? RATE_DEFAULTS.jj
  const rateSSCmp = lr['Demo - Mini SS Compaction'] ?? RATE_DEFAULTS.ssCompact
  const rebarMinPerSF = lr['Demo - Mini Rebar'] ?? RATE_DEFAULTS.rebarMin
  const shrubRate = lr['Demo - Mini Shrub'] ?? RATE_DEFAULTS.shrub
  const stumpSmallRate = lr['Demo - Mini Stump Small'] ?? 1.25
  const stumpMedRate = lr['Demo - Mini Stump Medium'] ?? 2.5
  const stumpLargeRate = lr['Demo - Mini Stump Large'] ?? 3.75
  const stumpXLRate = lr['Demo - Mini Stump XL'] ?? 5
  const treeSmall = lr['Demo - Mini Tree Small'] ?? RATE_DEFAULTS.treeSmall
  const treeMed = lr['Demo - Mini Tree Medium'] ?? RATE_DEFAULTS.treeMed
  const treeLarge = lr['Demo - Mini Tree Large'] ?? RATE_DEFAULTS.treeLarge

  const dumpConc = mp['Demo - Mini Dump - Concrete'] ?? DUMP_FEE_DEFAULTS['Demo - Mini Dump - Concrete']
  const dumpDirt = mp['Demo - Mini Dump - Dirt'] ?? DUMP_FEE_DEFAULTS['Demo - Mini Dump - Dirt']
  const dumpGreen = mp['Demo - Mini Dump - Green Waste'] ?? DUMP_FEE_DEFAULTS['Demo - Mini Dump - Green Waste']
  const dumpTreeStump = mp['Demo - Mini Dump - Tree/Stump'] ?? DUMP_FEE_DEFAULTS['Demo - Mini Dump - Tree/Stump']
  const dumpBase = mp['Demo - Mini Dump - Import Base'] ?? DUMP_FEE_DEFAULTS['Demo - Mini Dump - Import Base']

  // ── Helpers ───────────────────────────────────────────────────────────────
  // accessLevel param lets each call site use the correct NonBob or Bobcat multiplier
  // Sub Haul: labor hours are UNCHANGED — sub replaces disposal cost only
  // dump fees zero out (replaced by per-1.5T sub haul charges in subCost)
  function flat(sf, depthIn, baseRate, dumpFeePerTon = 0, accessLevel = accessNonBob) {
    const tons = sfToTons(sf, depthIn)
    if (!tons) return { tons: 0, hours: 0, dumpFee: 0 }
    return {
      tons,
      hours: tons / (baseRate * accessLevel),
      dumpFee: isSub || isDumpSub ? 0 : tons * dumpFeePerTon,
    }
  }

  function vert(lf, heightIn, widthIn, baseRate, dumpFeePerTon = 0, accessLevel = accessNonBob) {
    const cf = n(lf) * (n(heightIn) / 12) * (n(widthIn) / 12)
    const tons = (cf * 150) / 2000
    if (!tons) return { tons: 0, cf: 0, hours: 0, dumpFee: 0 }
    return {
      tons,
      cf,
      hours: tons / (baseRate * accessLevel),
      dumpFee: isSub || isDumpSub ? 0 : tons * dumpFeePerTon,
    }
  }

  // Editable container disposal rates (Master Rates -> Materials, category Demo).
  const containerPrice = mp['Demo - Mini Container (Low-Boy)'] ?? CONTAINER_COST
  const containerCy = mp['Demo - Mini Container Capacity (CY)'] ?? CONTAINER_CY
  const swellFactor = mp['Demo - Mini Removal Swell'] ?? SWELL
  const removalYards = (sf, depthIn) => ((n(sf) * (n(depthIn) / 12)) / 27) * swellFactor
  const removalContainers = (sf, depthIn) => Math.ceil(removalYards(sf, depthIn) / containerCy)
  const containerCost = (sf, depthIn) =>
    isSub || isDumpSub ? 0 : removalContainers(sf, depthIn) * containerPrice
  // Editable hauling coefficients (Master Rates -> Labor, category Demo).
  const haulSecPerFt = lr['Demo - Mini Haul Sec/Ft'] ?? 0.5
  const haulLoadCy = lr['Demo - Mini Load (CY)'] ?? 0.2

  // ── Demo rows — NonBob access (OK=0.667) ──────────────────────────────────
  const conc = flat(state.concSF, state.concDepth || 4, laborConc, 0, accessNonBob)
  const dirt = flat(state.dirtSF, state.dirtDepth || 4, laborDirt, 0, accessNonBob)
  const base = flat(state.baseSF, state.baseDepth || 4, laborBase, dumpBase, accessNonBob) // Mini: has dump fee
  const grass = flat(state.grassSF, state.grassDepth || 4, rateGrass, 0, accessBobcat)
  conc.dumpFee = containerCost(state.concSF, state.concDepth || 4)
  dirt.dumpFee = containerCost(state.dirtSF, state.dirtDepth || 4)
  grass.dumpFee = containerCost(state.grassSF, state.grassDepth || 4)

  // Mini SS: misc flat/vert carry $36.21 concrete dump fee — NonBob access
  const miscFlatCalc = (state.miscFlatRows || []).map(r =>
    flat(r.sf, r.depth || 4, laborMiscFlat, dumpConc, accessNonBob)
  )
  const miscVertCalc = (state.miscVertRows || []).map(r =>
    vert(r.lf, r.heightIn || 0, r.widthIn || 8, laborMiscVert, dumpConc, accessNonBob)
  )
  // Footing — Mini Skid Steer rate + Bobcat access
  const footingCalc = (state.footingRows || []).map(r =>
    flat(r.sf, r.depth || 12, laborFooting, dumpConc, accessBobcat)
  )

  // ── Grading — Mini Skid Steer rates + Bobcat access ──────────────────────
  const gradeCut = flat(
    state.gradeCutSF,
    state.gradeCutDepth || 4,
    laborGradeCut,
    0,
    accessBobcat
  )
  gradeCut.dumpFee = containerCost(state.gradeCutSF, state.gradeCutDepth || 4)
  const gradeFill = flat(state.gradeFillSF, state.gradeFillDepth || 4, laborGradeFill, 0, accessBobcat)

  const jjTons = sfToTons(state.jjSF, state.jjDepth || 4)
  const ssCmpTons = sfToTons(state.ssCmpSF, state.ssCmpDepth || 4)
  const jjHrs = jjTons > 0 ? jjTons / rateJJ : 0
  const ssCmpHrs = ssCmpTons > 0 ? ssCmpTons / rateSSCmp : 0

  // ── Rebar add-on ─────────────────────────────────────────────────────────
  const rebarHrs = isSub ? 0 : n(state.rebarSF) * (rebarMinPerSF / 60)

  // ── Vegetation — Bobcat access ────────────────────────────────────────────
  const shrubHrs = n(state.shrubQty) * accessBobcat * shrubRate
  // Shrubs by SqFt: density (1–5) × rate per 100 SF. Density 1 = 2 hrs &
  // $100 per 100 SF; both base rates editable in the Edit Rates popovers.
  const shrubSfRate = lr['Demo - Shrub SqFt (Mini Skid)'] ?? 1
  const shrubSfMatRate = mp['Demo - Mini Shrub SqFt Mat'] ?? 100
  const shrubSfDensity = n(state.shrubDensity) || 1
  const shrubSfHrs = (n(state.shrubSqFt) / 100) * shrubSfDensity * shrubSfRate
  const shrubSfMat = (n(state.shrubSqFt) / 100) * shrubSfDensity * shrubSfMatRate
  const stumpSmallHrs = n(state.stumpSmallQty) * accessBobcat * stumpSmallRate
  const stumpMedHrs = n(state.stumpMedQty) * accessBobcat * stumpMedRate
  const stumpLargeHrs = n(state.stumpLargeQty) * accessBobcat * stumpLargeRate
  const stumpXLHrs = n(state.stumpXLQty) * accessBobcat * stumpXLRate
  const stumpHrs = stumpSmallHrs + stumpMedHrs + stumpLargeHrs + stumpXLHrs

  const treeCalc = (state.treeRows || []).map(r => {
    const qty = n(r.qty),
      ht = n(r.height) || 10
    const mult = r.size === 'Large' ? treeLarge : r.size === 'Medium' ? treeMed : treeSmall
    const hrs = qty * ht * accessBobcat * mult
    const tons = qty * (ht / 10) * 0.25
    const dumpFee = isSub ? 0 : tons * dumpTreeStump // Mini: $125.33/ton
    return { hrs, tons, dumpFee }
  })

  // ── Manual ────────────────────────────────────────────────────────────────
  const manualRows = (state.manualRows || []).filter(
    r => n(r.hours) > 0 || n(r.materials) > 0 || n(r.subCost) > 0
  )
  const manualHrs = manualRows.reduce((s, r) => s + n(r.hours), 0)
  const manualMat = manualRows.reduce((s, r) => s + n(r.materials), 0)
  const manualSub = manualRows.reduce((s, r) => s + n(r.subCost), 0)

  // ── Sub Haul cost — per 1.5 tons, goes into subCost (not materials) ──────────
  // DB values (subcontractor_rates category='Sub Haul') take precedence over defaults
  const shConc = sr['Demo - Mini Sub Haul - Concrete'] ?? SUB_HAUL_DEFAULTS.concrete
  const shDirt = sr['Demo - Mini Sub Haul - Dirt'] ?? SUB_HAUL_DEFAULTS.dirt
  const shGrass = sr['Demo - Mini Sub Haul - Grass'] ?? SUB_HAUL_DEFAULTS.grass

  const tonsPerCharge = 1.5 // billing increment

  const subHaulCost =
    isSub || isDumpSub
      ? (conc.tons / tonsPerCharge) * shConc +
        (dirt.tons / tonsPerCharge) * shDirt +
        (grass.tons / tonsPerCharge) * shGrass +
        miscFlatCalc.reduce((s, r) => s + (r.tons / tonsPerCharge) * shConc, 0) +
        miscVertCalc.reduce((s, r) => s + (r.tons / tonsPerCharge) * shConc, 0) +
        footingCalc.reduce((s, r) => s + (r.tons / tonsPerCharge) * shConc, 0) +
        (gradeCut.tons / tonsPerCharge) * shDirt
      : 0

  // ── Hour aggregation — labor is the same in both modes ────────────────────
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
  const vegHrs = shrubHrs + shrubSfHrs + stumpHrs + treeCalc.reduce((s, r) => s + r.hrs, 0)

  // ── Walk-access (Truck → Work Area) — trip-based for mini-skid demo ───
  // Excel: S4 = (F6 - BobcatTravel) × N4 × 2 × (1/60/60)
  // where N4 = total tons × 2000 / NonBobBucketSize
  const totalDemoTons =
    conc.tons +
    dirt.tons +
    base.tons +
    grass.tons +
    miscFlatCalc.reduce((s, r) => s + r.tons, 0) +
    miscVertCalc.reduce((s, r) => s + r.tons, 0) +
    footingCalc.reduce((s, r) => s + r.tons, 0) +
    gradeCut.tons +
    treeCalc.reduce((s, r) => s + r.tons, 0)
  const haulYards =
    removalYards(state.concSF, state.concDepth || 4) +
    removalYards(state.dirtSF, state.dirtDepth || 4) +
    removalYards(state.gradeCutSF, state.gradeCutDepth || 4) +
    removalYards(state.grassSF, state.grassDepth || 4)
  const haulTrips = haulLoadCy > 0 ? haulYards / haulLoadCy : 0
  const walkHrs = (haulTrips * n(state.distanceLF) * haulSecPerFt) / 3600

  const rawHrs = crewDemoHrs + gradingHrs + vegHrs + rebarHrs + manualHrs
  const totalHrs = rawHrs * diff + hrsAdj + walkHrs

  // ── Materials ─────────────────────────────────────────────────────────────
  const dumpMatCost = isSub
    ? 0
    : conc.dumpFee +
      dirt.dumpFee +
      base.dumpFee +
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
  const burden = laborCost * (n(laborBurdenPct) || 0.29)
  // GP = labor component + Universal Sub Markup % on sub haul cost
  // Hauling (Subcontractor) — 12-yard loads × per-load rate (sub cost, pre-GP markup).
  const haulTrashRate = sr['Demo - Mini Sub Haul - Trash 12yd'] ?? 850
  const haulConcreteRate = sr['Demo - Mini Sub Haul - Concrete 12yd'] ?? 800
  const haulSoilRate = sr['Demo - Mini Sub Haul - Soil 12yd'] ?? 650
  const haulBaseRate = sr['Demo - Mini Sub Haul - Import Base 12yd'] ?? 350
  const haulCost = isSub
    ? n(state.haulTrashLoads) * haulTrashRate +
      n(state.haulConcreteLoads) * haulConcreteRate +
      n(state.haulSoilLoads) * haulSoilRate +
      n(state.haulBaseLoads) * haulBaseRate
    : 0
  // Subcontractor combined demo line: SF × tiered $/sf by depth (concrete/dirt/rock/paver).
  const miniRateDeep = sr['Sub Demo - Mini 5-7in'] ?? 2.0
  const miniRateMid = sr['Sub Demo - Mini 2-4in'] ?? 1.75
  const miniRateShallow = sr['Sub Demo - Mini 1-2in'] ?? 1.5
  const miniSubRate = d => {
    const x = n(d)
    return x >= 5 ? miniRateDeep : x >= 2 ? miniRateMid : miniRateShallow
  }
  const subDemoCost = isSub ? n(state.subDemoSF) * miniSubRate(state.subDemoDepth || 7) : 0
  const miniMiscFlatSubRate = sr['Sub Demo - Mini Misc Flat'] ?? 2.0
  const miscFlatSubCost = isSub
    ? (state.miscFlatRows || []).slice(0, 2).reduce((sum, r) => sum + n(r.sf) * miniMiscFlatSubRate, 0)
    : 0
  const miniSubDemo = subDemoCost + miscFlatSubCost
  const gp = manDays * gpmd + (subHaulCost + haulCost + miniSubDemo) * subMarkupRate
  const commission = gp * 0.12
  const subCost = subHaulCost + manualSub + haulCost + miniSubDemo
  const price = laborCost + burden + totalMat + gp + commission + subCost

  return {
    walkHrs,
    totalDemoTons,
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
    miniRateDeep,
    miniRateMid,
    miniRateShallow,
    subDemoCost,
    miniMiscFlatSubRate,
    gp,
    commission,
    price,
    containerPrice,
    containerCy,
    swellFactor,
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
    shrubSfRate,
    shrubSfMatRate,
    stumpSmallHrs,
    stumpMedHrs,
    stumpLargeHrs,
    stumpXLHrs,
    shrubRate,
    stumpSmallRate,
    stumpMedRate,
    stumpLargeRate,
    stumpXLRate,
    treeCalc,
    crewDemoHrs,
    gradingHrs,
    vegHrs,
    manualHrs,
    dumpMatCost,
    isSub,
    subHaulCost,
    dumpConc,
    dumpDirt,
    dumpGreen,
    dumpTreeStump,
    dumpBase,
    laborConc,
    laborDirt,
    laborBase,
    laborMiscFlat,
    laborMiscVert,
    laborFooting,
    laborGradeCut,
    laborGradeFill,
    rateGrass,
    rateJJ,
    rateSSCmp,
    rebarMinPerSF,
    treeSmall,
    treeMed,
    treeLarge,
    accessNonBob,
    accessBobcat,
    shConc,
    shDirt,
    shGrass,
    tonsPerCharge,
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
  distanceLF: '', // Avg truck → work area (LF) for walk-access penalty
  concSF: '',
  concDepth: 4,
  dirtSF: '',
  dirtDepth: 4,
  baseSF: '',
  baseDepth: 4,
  grassSF: '',
  grassDepth: 4,
  rebarSF: '',
  miscFlatRows: Array(4)
    .fill(null)
    .map(() => ({ label: '', sf: '', depth: 4 })),
  miscVertRows: Array(4)
    .fill(null)
    .map(() => ({ label: '', lf: '', heightIn: '', widthIn: 8 })),
  footingRows: Array(4)
    .fill(null)
    .map(() => ({ label: '', sf: '', depth: 12 })),
  gradeCutSF: '',
  gradeCutDepth: 4,
  gradeFillSF: '',
  gradeFillDepth: 4,
  jjSF: '',
  jjDepth: 4,
  ssCmpSF: '',
  ssCmpDepth: 4,
  shrubQty: '',
  shrubSqFt: '',
  shrubDensity: '1',
  stumpSmallQty: '',
  stumpMedQty: '',
  stumpLargeQty: '',
  stumpXLQty: '',
  haulTrashLoads: '',
  haulConcreteLoads: '',
  haulSoilLoads: '',
  haulBaseLoads: '',
  subDemoSF: '',
  subDemoDepth: 7,
  treeRows: [
    { qty: '', height: 20, size: 'Small' },
    { qty: '', height: 20, size: 'Medium' },
    { qty: '', height: 20, size: 'Large' },
  ],
  manualRows: [
    { label: '', hours: '', materials: '', subCost: '' },
    { label: '', hours: '', materials: '', subCost: '' },
  ],
}

// ── UI helpers ────────────────────────────────────────────────────────────────

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

export default function MiniSkidSteerDemoModule({ initialData, onSave, onCancel, onSwitchType }) {
  const [state, setState] = useState(() => ({ ...DEFAULT_STATE, ...(initialData || {}) }))

  // Free-text notes for this module — Sam writes auto-generated
  // takeoffs here via create_estimate_from_takeoff, and the user can
  // overwrite / append their own.
  const [notes, setNotes] = useState(initialData?.notes ?? '')
  const [materialPrices, setMaterialPrices] = useState(initialData?.materialPrices || {})
  const [laborRates, setLaborRates] = useState(initialData?.laborRates || {})
  const [laborRatePerHour, setLaborRatePerHour] = useState(initialData?.laborRatePerHour ?? 35)
  const [laborBurdenPct, setLaborBurdenPct] = useState(initialData?.laborBurdenPct ?? 0.29)
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
            .maybeSingle()
            .single()
            .then(({ data }) => {
              if (!gone && data) {
                if (data.labor_rate_per_hour != null)
                  setLaborRatePerHour(parseFloat(data.labor_rate_per_hour) || 35)
                if (data.labor_burden_pct != null)
                  setLaborBurdenPct(parseFloat(data.labor_burden_pct))
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

  const { dumpConc, dumpDirt, dumpGreen, dumpTreeStump, dumpBase } = calc

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
        laborBurdenPct,
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
              name="Demo - Mini Difficulty Ratio"
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
              name="Demo - Mini Haul Sec/Ft"
              category="Demo"
              mode="coefficient"
              unitLabel="sec/ft"
              currentValue={calc.haulSecPerFt}
              onSaved={refreshAllRates}
            />
            · {calc.haulLoadCy} cy/load
            <RateEditPopover
              table="labor_rates"
              name="Demo - Mini Load (CY)"
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
          <p className="text-sm font-medium text-gray-700 py-1">{state.dumpType === 'In-House' ? 'In House' : 'Subcontractor'}</p>
          {!isSelf && (
            <p className="text-xs text-amber-600 mt-0.5 inline-flex items-center flex-wrap gap-x-1 gap-y-0.5">
              Sub haul:
              <span className="inline-flex items-center gap-0.5">
                ${calc.shConc}/1.5T conc
                <RateEditPopover
                  table="subcontractor_rates"
                  name="Demo - Mini Sub Haul - Concrete"
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
                  name="Demo - Mini Sub Haul - Dirt"
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
                  name="Demo - Mini Sub Haul - Grass"
                  unitLabel="/1.5T"
                  currentValue={calc.shGrass}
                  onSaved={refreshAllRates}
                />
              </span>
            </p>
          )}
        </div>
      </div>
      {/* Demolition */}
      <div>
        <div className="flex items-center flex-wrap gap-x-2 gap-y-1 text-xs font-bold text-gray-600 uppercase tracking-wider bg-gray-50 rounded-lg border border-gray-200 px-4 py-2.5 mt-4 mb-2">
          <span>Demolition</span>
          {isSelf ? (
            <>
              <span className="font-normal normal-case">· Container ${calc.containerPrice}</span>
              <RateEditPopover
                table="material_rates"
                name="Demo - Mini Container (Low-Boy)"
                category="Demo"
                unitLabel="container"
                currentValue={calc.containerPrice}
                onSaved={refreshAllRates}
              />
              <span className="font-normal normal-case">/ {calc.containerCy} cy</span>
              <RateEditPopover
                table="material_rates"
                name="Demo - Mini Container Capacity (CY)"
                category="Demo"
                mode="coefficient"
                unitLabel="cy"
                currentValue={calc.containerCy}
                onSaved={refreshAllRates}
              />
              <span className="font-normal normal-case">· ×{calc.swellFactor} swell</span>
              <RateEditPopover
                table="material_rates"
                name="Demo - Mini Removal Swell"
                category="Demo"
                mode="coefficient"
                unitLabel="×"
                currentValue={calc.swellFactor}
                onSaved={refreshAllRates}
              />
            </>
          ) : (
            <>
              <span className="font-normal normal-case">· Concrete / Dirt / Rock / Paver</span>
              <span className="font-normal normal-case text-gray-500">${calc.miniRateDeep} (5-7")</span>
              <RateEditPopover table="subcontractor_rates" name="Sub Demo - Mini 5-7in" unitLabel="/sf" currentValue={calc.miniRateDeep} onSaved={refreshAllRates} />
              <span className="font-normal normal-case text-gray-500">/ ${calc.miniRateMid} (2-4")</span>
              <RateEditPopover table="subcontractor_rates" name="Sub Demo - Mini 2-4in" unitLabel="/sf" currentValue={calc.miniRateMid} onSaved={refreshAllRates} />
              <span className="font-normal normal-case text-gray-500">/ ${calc.miniRateShallow} (1-2")</span>
              <RateEditPopover table="subcontractor_rates" name="Sub Demo - Mini 1-2in" unitLabel="/sf" currentValue={calc.miniRateShallow} onSaved={refreshAllRates} />
              <span className="font-normal normal-case text-gray-500">/sf</span>
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
                rateName: 'Demo - Mini - Concrete t/hr',
                rateNote: `${calc.laborConc} t/hr`,
              },
              {
                label: 'Dirt/Rock',
                sfK: 'dirtSF',
                dK: 'dirtDepth',
                dep: 4,
                row: calc.dirt,
                fee: dumpDirt,
                rate: calc.laborDirt,
                rateName: 'Demo - Mini - Dirt t/hr',
                rateNote: `${calc.laborDirt} t/hr`,
              },
              {
                label: 'Import Base',
                sfK: 'baseSF',
                dK: 'baseDepth',
                dep: 4,
                row: calc.base,
                fee: dumpBase,
                rate: calc.laborBase,
                rateName: 'Demo - Mini - Import Base t/hr',
                rateNote: `${calc.laborBase} t/hr · $${dumpBase}/ton base`,
                extraIcon: (
                  <RateEditPopover
                    table="material_rates"
                    name="Demo - Mini Dump - Import Base"
                    category="Demo"
                    unitLabel="ton"
                    currentValue={dumpBase}
                    onSaved={refreshAllRates}
                  />
                ),
              },
              {
                label: 'Grass/Sod',
                sfK: 'grassSF',
                dK: 'grassDepth',
                dep: 4,
                row: calc.grass,
                fee: dumpGreen,
                rate: calc.rateGrass,
                rateName: 'Demo - Mini Skid Steer Grass',
                rateNote: `${calc.rateGrass} t/hr · $${dumpGreen}/ton green waste`,
                extraIcon: (
                  <RateEditPopover
                    table="material_rates"
                    name="Demo - Mini Dump - Green Waste"
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
              <span className="text-gray-400 font-normal">({calc.rebarMinPerSF} min/SF)</span>
              <RateEditPopover
                table="labor_rates"
                name="Demo - Mini Rebar"
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
        )}
      </div>

      {/* Misc Flat */}
      <div>
        <div className="flex items-center flex-wrap gap-x-2 gap-y-1 text-xs font-bold text-gray-600 uppercase tracking-wider bg-gray-50 rounded-lg border border-gray-200 px-4 py-2.5 mt-4 mb-2">
          <span>Misc Flat Demo{isSelf ? ` — ${calc.laborMiscFlat} t/hr` : ''}</span>
          {isSelf && (
            <RateEditPopover
              table="labor_rates"
              name="Demo - Mini - Misc Flat t/hr"
              category="Demo"
              mode="coefficient"
              unitLabel="t/hr"
              currentValue={calc.laborMiscFlat}
              onSaved={refreshAllRates}
            />
          )}
          {isSelf && (
            <>
              <span className="font-normal normal-case">· ${dumpConc}/ton dump fee</span>
              <RateEditPopover
                table="material_rates"
                name="Demo - Mini Dump - Concrete"
                category="Demo"
                unitLabel="ton"
                currentValue={dumpConc}
                onSaved={refreshAllRates}
              />
            </>
          )}
          {isSub && (
            <>
              <span className="font-normal normal-case text-gray-500">${calc.miniMiscFlatSubRate}/sf</span>
              <RateEditPopover table="subcontractor_rates" name="Sub Demo - Mini Misc Flat" unitLabel="/sf" currentValue={calc.miniMiscFlatSubRate} onSaved={refreshAllRates} />
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
                    { label: 'Dump Fee', w: 'w-24' },
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
            {(isSub ? state.miscFlatRows.slice(0, 2) : state.miscFlatRows).map((r, i) => {
              const cr = calc.miscFlatCalc[i] || { tons: 0, hours: 0, dumpFee: 0 }
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
                    <td className={num}>{n(r.sf) > 0 ? fmt2(n(r.sf) * calc.miniMiscFlatSubRate) : '—'}</td>
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
          <span>Misc Vertical / Structural Demo — LF × Height × Width · {calc.laborMiscVert} t/hr</span>
          <RateEditPopover
            table="labor_rates"
            name="Demo - Mini - Misc Vert t/hr"
            category="Demo"
            mode="coefficient"
            unitLabel="t/hr"
            currentValue={calc.laborMiscVert}
            onSaved={refreshAllRates}
          />
          {isSelf && (
            <>
              <span className="font-normal normal-case">· ${dumpConc}/ton dump fee</span>
              <RateEditPopover
                table="material_rates"
                name="Demo - Mini Dump - Concrete"
                category="Demo"
                unitLabel="ton"
                currentValue={dumpConc}
                onSaved={refreshAllRates}
              />
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
              ...(isSelf ? [{ label: 'Dump Fee', w: 'w-24' }] : []),
              { label: 'Labor Hrs', w: 'w-20' },
            ]}
          />
          <tbody className="divide-y divide-gray-50">
            {state.miscVertRows.map((r, i) => {
              const cr = calc.miscVertCalc[i] || { tons: 0, hours: 0, cf: 0, dumpFee: 0 }
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
                  {isSelf && <td className={num}>{cr.dumpFee > 0 ? fmt2(cr.dumpFee) : '—'}</td>}
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
          <span>Footing Demo — SF × Depth · {calc.laborFooting} t/hr</span>
          <RateEditPopover
            table="labor_rates"
            name="Demo - Mini - Footing t/hr"
            category="Demo"
            mode="coefficient"
            unitLabel="t/hr"
            currentValue={calc.laborFooting}
            onSaved={refreshAllRates}
          />
          {isSelf && (
            <>
              <span className="font-normal normal-case">· ${dumpConc}/ton dump fee</span>
              <RateEditPopover
                table="material_rates"
                name="Demo - Mini Dump - Concrete"
                category="Demo"
                unitLabel="ton"
                currentValue={dumpConc}
                onSaved={refreshAllRates}
              />
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
            {state.footingRows.map((r, i) => {
              const cr = calc.footingCalc[i] || { tons: 0, hours: 0, dumpFee: 0 }
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
                  { label: 'Trash Per 12 Yard Load', key: 'haulTrashLoads', rate: calc.haulTrashRate, rateName: 'Demo - Mini Sub Haul - Trash 12yd' },
                  { label: 'Concrete Per 12 Yard Load', key: 'haulConcreteLoads', rate: calc.haulConcreteRate, rateName: 'Demo - Mini Sub Haul - Concrete 12yd' },
                  { label: 'Soil Per 12 Yard Load', key: 'haulSoilLoads', rate: calc.haulSoilRate, rateName: 'Demo - Mini Sub Haul - Soil 12yd' },
                  { label: 'Import Base Per 12 Yard Load', key: 'haulBaseLoads', rate: calc.haulBaseRate, rateName: 'Demo - Mini Sub Haul - Import Base 12yd' },
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
        <table className="w-full text-xs">
          <TH
            cols={[
              { label: 'Operation', w: 'w-44' },
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
                note: `${calc.laborGradeCut} t/hr`,
                rate: calc.laborGradeCut,
                rateName: 'Demo - Mini - Grade Cut t/hr',
              },
              {
                label: 'Grade Fill',
                sfK: 'gradeFillSF',
                dK: 'gradeFillDepth',
                dep: 4,
                tons: calc.gradeFill.tons,
                hrs: calc.gradeFill.hours,
                note: `${calc.laborGradeFill} t/hr`,
                rate: calc.laborGradeFill,
                rateName: 'Demo - Mini - Grade Fill t/hr',
              },
              {
                label: 'Jumping Jack',
                sfK: 'jjSF',
                dK: 'jjDepth',
                dep: 4,
                tons: calc.jjTons,
                hrs: calc.jjHrs,
                note: `${calc.rateJJ} t/hr`,
                rate: calc.rateJJ,
                rateName: 'Demo - Mini JJ Compaction',
              },
              {
                label: 'Mini SS Compact (4" Max)',
                sfK: 'ssCmpSF',
                dK: 'ssCmpDepth',
                dep: 4,
                tons: calc.ssCmpTons,
                hrs: calc.ssCmpHrs,
                note: `${calc.rateSSCmp} t/hr`,
                rate: calc.rateSSCmp,
                rateName: 'Demo - Mini SS Compaction',
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
            sub: `${calc.shrubRate} hrs/ea`,
            rate: calc.shrubRate,
            rateName: 'Demo - Mini Shrub',
          },
          {
            label: 'Small (up to 12")',
            key: 'stumpSmallQty',
            hrs: calc.stumpSmallHrs,
            sub: `${calc.stumpSmallRate} hrs/ea`,
            rate: calc.stumpSmallRate,
            rateName: 'Demo - Mini Stump Small',
          },
          {
            label: 'Medium (12"–24")',
            key: 'stumpMedQty',
            hrs: calc.stumpMedHrs,
            sub: `${calc.stumpMedRate} hrs/ea`,
            rate: calc.stumpMedRate,
            rateName: 'Demo - Mini Stump Medium',
          },
          {
            label: 'Large (24"–36")',
            key: 'stumpLargeQty',
            hrs: calc.stumpLargeHrs,
            sub: `${calc.stumpLargeRate} hrs/ea`,
            rate: calc.stumpLargeRate,
            rateName: 'Demo - Mini Stump Large',
          },
          {
            label: 'Extra Large (36"–48")',
            key: 'stumpXLQty',
            hrs: calc.stumpXLHrs,
            sub: `${calc.stumpXLRate} hrs/ea`,
            rate: calc.stumpXLRate,
            rateName: 'Demo - Mini Stump XL',
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
              name="Demo - Shrub SqFt (Mini Skid)"
              category="Demo"
              mode="coefficient"
              unitLabel="hrs/100sf"
              currentValue={calc.shrubSfRate}
              onSaved={refreshAllRates}
            />
            <RateEditPopover
              table="material_rates"
              name="Demo - Mini Shrub SqFt Mat"
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
          <span>Tree Demo — qty × height × size multiplier</span>
          <span className="font-normal normal-case text-gray-400 inline-flex items-center gap-1">
            (S:{calc.treeSmall}
            <RateEditPopover
              table="labor_rates"
              name="Demo - Mini Tree Small"
              category="Demo"
              mode="coefficient"
              unitLabel="hrs/ft"
              currentValue={calc.treeSmall}
              onSaved={refreshAllRates}
            />
            · M:{calc.treeMed}
            <RateEditPopover
              table="labor_rates"
              name="Demo - Mini Tree Medium"
              category="Demo"
              mode="coefficient"
              unitLabel="hrs/ft"
              currentValue={calc.treeMed}
              onSaved={refreshAllRates}
            />
            · L:{calc.treeLarge}
            <RateEditPopover
              table="labor_rates"
              name="Demo - Mini Tree Large"
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
              · ${dumpTreeStump}/ton tree/stump dump
              <RateEditPopover
                table="material_rates"
                name="Demo - Mini Dump - Tree/Stump"
                category="Demo"
                unitLabel="ton"
                currentValue={dumpTreeStump}
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
              ...(isSelf ? [{ label: 'Dump Fee', w: 'w-24' }] : []),
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
