// Pure Hand Demo calc — extracted from HandDemoModule.jsx so the math is unit-
// testable without React/Supabase. Signature unchanged:
//   calcDemo(state, laborRatePerHour, materialPrices, laborRates, subMarkupRate,
//            subRates, gpmd, walkAccess, laborBurdenPct, commissionRate)
// Only lifted out of the component; logic is identical.

const n = v => parseFloat(v) || 0
const DEFAULT_WALK_ACCESS_PACE_LF_PER_MIN = 60

export function calcDemo(
  state,
  laborRatePerHour,
  materialPrices,
  laborRates,
  subMarkupRate = 0.35,
  subRates = {},
  gpmd,
  walkAccess = null,
  laborBurdenPct,
  commissionRate
) {
  const _pace = parseFloat(walkAccess?.paceLfPerMin) || DEFAULT_WALK_ACCESS_PACE_LF_PER_MIN
  const mp = materialPrices || {}
  const lr = laborRates || {}
  // ── Table-driven estimating coefficients (fall back to code constants) ──
  // Business-tunable assumptions, surfaced as editable coefficient rows in View
  // Rates (labor_rates, category Demo). Fixed unit conversions (27 cf/cy,
  // 12 in/ft, 2000 lb/ton, 60 min/hr) stay as literal math.
  const tonsSfInDenom = n(mp['Tons SF-in Denominator']) // shared Basic Materials
  const concreteWeightLbCf = n(lr['Basic Labor - Concrete Weight lb/cf']) // shared Basic Labor
  const treeCyFactor = n(mp['Hand - Tree CY Factor'])
  const bucketLaborMult = n(lr['Hand - Bucket Labor Mult'])
  // Local sfToTons shadows the module helper so the tons denominator is editable.
  const sfToTons = (sf, depthIn) => (n(sf) / tonsSfInDenom) * n(depthIn)
  // Subcontractor rates: a one-off adjustment saved on THIS estimate
  // (state.rateOverrides) takes precedence over the master rate.
  const sr = { ...(subRates || {}) }
  Object.entries(state.rateOverrides || {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '' && Number.isFinite(Number(v))) sr[k] = Number(v)
  })
  const access = 1 // access modifier removed
  const isSub = state.dumpType === 'Subcontractor'
  const isDumpSub = false // disposal follows the In House/Sub toggle
  const lrph = n(laborRatePerHour)
  const difficultyRatio = n(lr['Basic Labor - Difficulty Ratio']) // shared Basic Labor
  const diff = 1 + (n(state.difficulty) / 100) * difficultyRatio
  const hrsAdj = n(state.hoursAdj)

  // ── Rates from DB with fallbacks ──────────────────────────────────────────
  const rateConc = n(lr['Hand - Concrete/Dirt'])
  const rateGrass = n(lr['Hand - Grass'])
  const rateBase = n(lr['Hand - Import Base'])
  const rateBucket = n(lr['Hand - Bucket'])
  const rebarMinPerSF = n(lr['Hand - Rebar'])
  // ── hrs-per-Cu-Ft model: hours = Cu Ft × rate. CF = SF×depth/12 (flat) or
  //    LF×h/12×w/12 (vert). Unset rate → 0 hrs. (Multiply — higher rate ⇒ more hrs.)
  const hrConc = n(lr['Hand - Concrete'])       // hrs / Cu Ft
  const hrSoil = n(lr['Hand - Soil'])           // hrs / Cu Ft
  const hrGrass = n(lr['Hand - Grass'])         // hrs / Cu Ft
  const hrBase = n(lr['Hand - Import Base'])    // hrs / Cu Ft
  const hrBucket = n(lr['Hand - Bucket'])  // Bucket coefficient (confined access)
  const hrMiscFlat = n(lr['Hand - Misc Flat'])  // hrs / Cu Ft
  const hrMiscVert = n(lr['Hand - Misc Vertical']) // hrs / Cu Ft
  const hrFooting = n(lr['Hand - Footing'])     // hrs / Cu Ft
  const hrGradeCut = n(lr['Hand - Grade Cut'])  // hrs / Cu Ft
  const hrGradeFill = n(lr['Hand - Grade Fill']) // hrs / Cu Ft
  const jjRate = n(lr['Basic Labor - Jumping Jack']) // shared, hrs / Cu Ft
  // Rebar toggle: concrete demo hours ×(1 + 25%) when rebar present.
  const rebarFactor = state.rebar ? 1 + n(lr['Hand - Rebar']) : 1
  // Per-height shrub rates (Each), replacing the base rate × height factor model.
  const shrubRateFor = h => n(lr['Hand - Shrubs ' + h + ' ft'])
  const stumpSmallRate = n(lr['Hand - Stump Small'])
  const stumpMedRate = n(lr['Hand - Stump Medium'])
  const stumpLargeRate = n(lr['Hand - Stump Large'])
  const stumpXLRate = n(lr['Hand - Stump XL'])
  const treeSmall = n(lr['Hand - Tree Small'])
  const treeMed = n(lr['Hand - Tree Medium'])
  const treeLarge = n(lr['Hand - Tree Large'])

  const dumpConc = n(mp['Hand - Dump - Concrete'])
  const dumpDirt = n(mp['Hand - Dump - Dirt'])
  const dumpGreen = n(mp['Hand - Dump - Green Waste'])
  const dumpTree = n(mp['Hand - Dump - Tree/Stump'])

  // ── Helpers ───────────────────────────────────────────────────────────────
  // Bank (in-place) cubic yards — the volume shown to the user. 27 cf/cy and
  // 12 in/ft are fixed unit conversions. cy = sf × depthFt / 27.
  function flat(sf, depthIn, baseRate, dumpFeePerTon = 0) {
    const tons = sfToTons(sf, depthIn)
    const cy = (n(sf) * (n(depthIn) / 12)) / 27
    if (!tons) return { tons: 0, cy: 0, hours: 0, dumpFee: 0 }
    return {
      tons,
      cy,
      hours: tons / (baseRate * access), // labor always calculated
      dumpFee: tons * dumpFeePerTon,
    }
  }

  // Vertical: LF × Height(in) × Width(in) → CF → CY (bank) and tons.
  function vert(lf, heightIn, widthIn, baseRate, dumpFeePerTon = 0) {
    const cf = n(lf) * (n(heightIn) / 12) * (n(widthIn) / 12)
    const tons = (cf * concreteWeightLbCf) / 2000
    const cy = cf / 27
    if (!tons) return { tons: 0, cy: 0, cf: 0, hours: 0, dumpFee: 0 }
    return {
      tons,
      cy,
      cf,
      hours: tons / (baseRate * access), // labor always calculated
      dumpFee: tons * dumpFeePerTon,
    }
  }

  // Editable container disposal rates (Master Rates -> Materials, category Demo).
  const containerPrice = n(mp['Hand - Container (Low-Boy)'])
  const containerCy = n(mp['Hand - Container Capacity (CY)'])
  const swellFactor = n(mp['Hand - Removal Swell'])
  const removalYards = (sf, depthIn) => ((n(sf) * (n(depthIn) / 12)) / 27) * swellFactor
  const removalContainers = (sf, depthIn) => Math.ceil(removalYards(sf, depthIn) / containerCy)
  const containerCost = (sf, depthIn) =>
    removalContainers(sf, depthIn) * containerPrice
  // Editable hauling coefficients: wheelbarrow load 1/5 cy; 4 sec/ft (covers round trip).
  const haulSecPerFt = n(lr['Hand - Haul Sec/Ft'])
  const haulLoadCy = n(lr['Hand - Load (CY)'])
  // Concrete-method labor generalized to raw cubic feet (= (sf/100)*depth for flat).
  const flatCf = (sf, depthIn) => n(sf) * (n(depthIn) / 12)
  const cfLaborHrs = (cf, rate) => (n(cf) * 12 / 100) * rate
  const containerCostCf = cf =>
    Math.ceil(((n(cf) / 27) * swellFactor) / containerCy) * containerPrice
  const baseMatPer10Cy = n(mp['Hand - Import Base $/10cy'])

  // ── Demo rows ────────────────────────────────────────────────────────────
  const conc = flat(state.concSF, state.concDepth || 4, rateConc, 0)
  const dirt = flat(state.dirtSF, state.dirtDepth || 4, rateConc, 0)
  const base = flat(state.baseSF, state.baseDepth || 4, rateBase, 0)
  base.hours = flatCf(state.baseSF, state.baseDepth || 4) * hrBase
  const baseRawCy = flatCf(state.baseSF, state.baseDepth || 4) / 27
  const baseMat = Math.ceil(baseRawCy / 10) * baseMatPer10Cy
  const grass = flat(state.grassSF, state.grassDepth || 4, rateGrass, 0)
  // Removed debris — container disposal per material (shown as the row's Dump Fee).
  conc.dumpFee = containerCost(state.concSF, state.concDepth || 4)
  dirt.dumpFee = containerCost(state.dirtSF, state.dirtDepth || 4)
  grass.dumpFee = containerCost(state.grassSF, state.grassDepth || 4)
  // Hand-demo removal labor: hours = Cu Ft × rate. Concrete ×rebarFactor.
  // Bucket checkbox (confined access) multiplies a Main Demo row's hours by the
  // Bucket coefficient. Unset coefficient ⇒ no effect (identity), never zeroes.
  const bk = on => (on && bucketLaborMult > 0 ? bucketLaborMult : 1)
  conc.hours = flatCf(state.concSF, state.concDepth || 4) * hrConc * rebarFactor * bk(state.concBucket)
  dirt.hours = flatCf(state.dirtSF, state.dirtDepth || 4) * hrSoil * bk(state.dirtBucket)
  grass.hours = flatCf(state.grassSF, state.grassDepth || 4) * hrGrass * bk(state.grassBucket)

  const miscFlatCalc = (state.miscFlatRows || []).map(r => {
    const row = flat(r.sf, r.depth || 4, rateConc, 0)
    row.hours = flatCf(r.sf, r.depth || 4) * hrMiscFlat
    row.dumpFee = containerCost(r.sf, r.depth || 4)
    return row
  })
  const miscVertCalc = (state.miscVertRows || []).map(r => {
    const row = vert(r.lf, r.heightIn || 0, r.widthIn || 8, rateConc, 0)
    row.hours = row.cf * hrMiscVert
    row.dumpFee = containerCostCf(row.cf)
    return row
  })
  const footingCalc = (state.footingRows || []).map(r => {
    const row = vert(r.lf, r.heightIn || 0, r.widthIn || 8, rateConc, 0)
    row.hours = row.cf * hrFooting
    row.dumpFee = containerCostCf(row.cf)
    return row
  })

  // Hand Bucket Areas section removed — Bucket is now a per-row checkbox (bk() above).
  const bucketCalc = []

  // ── Grading ──────────────────────────────────────────────────────────────
  const gradeCut = flat(state.gradeCutSF, state.gradeCutDepth || 4, rateConc, 0)
  gradeCut.dumpFee = containerCost(state.gradeCutSF, state.gradeCutDepth || 4)
  gradeCut.hours = flatCf(state.gradeCutSF, state.gradeCutDepth || 4) * hrGradeCut * bk(state.gradeCutBucket)
  const gradeFill = flat(state.gradeFillSF, state.gradeFillDepth || 4, rateBase, 0)
  gradeFill.hours = flatCf(state.gradeFillSF, state.gradeFillDepth || 4) * hrGradeFill

  // Jumping Jack now uses the shared Basic Labor rate (hrs × Cu Ft).
  const jjHrs = flatCf(state.jjSF, state.jjDepth || 4) * jjRate

  // ── Rebar ────────────────────────────────────────────────────────────────
  // Rebar now multiplies the concrete demo line (rebarFactor above); no separate hrs.
  const rebarHrs = 0

  // ── Vegetation ───────────────────────────────────────────────────────────
  // Shrub demo: per-area rows — qty × shrub rate × shrub-height modifier.
  const shrubRowsCalc = (state.shrubRows || []).map(r => ({
    hrs: n(r.qty) * shrubRateFor(r.height),
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
    // Green-waste volume in cubic yards; dump billed per CY.
    const cy = qty * (ht / 10) * treeCyFactor
    const dumpFee = cy * dumpTree
    return { hrs, cy, dumpFee }
  })

  // ── Manual entry ─────────────────────────────────────────────────────────
  const manualRows = (state.manualRows || []).filter(
    r => n(r.hours) > 0 || n(r.materials) > 0 || n(r.subCost) > 0
  )
  const manualHrs = manualRows.reduce((s, r) => s + n(r.hours), 0)
  const manualMat = manualRows.reduce((s, r) => s + n(r.materials), 0)
  const subManualEntries = (state.subManualRows || []).filter(
    r => n(r.hours) > 0 || n(r.materials) > 0 || n(r.subCost) > 0
  )
  const manualSub = subManualEntries.reduce((s, r) => s + n(r.subCost), 0)
  const subManualMat = subManualEntries.reduce((s, r) => s + n(r.materials), 0)

  // ── Sub Haul cost — per cubic yard removed, goes into subCost (not materials) ─
  // DB values (subcontractor_rates category='Sub Haul') take precedence over defaults
  const shConc = n(sr['Hand - Sub Haul CY - Concrete'])
  const shDirt = n(sr['Hand - Sub Haul CY - Dirt'])
  const shGrass = n(sr['Hand - Sub Haul CY - Grass'])

  const subHaulCost =
    isSub || isDumpSub
      ? conc.cy * shConc +
        dirt.cy * shDirt +
        grass.cy * shGrass +
        miscFlatCalc.reduce((s, r) => s + r.cy * shConc, 0) +
        miscVertCalc.reduce((s, r) => s + r.cy * shConc, 0) +
        footingCalc.reduce((s, r) => s + r.cy * shConc, 0) +
        bucketCalc.reduce((s, r) => s + r.cy * shDirt, 0) +
        gradeCut.cy * shDirt +
        treeCalc.reduce((s, r) => s + r.cy * shGrass, 0)
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
  const burden = laborCost * n(laborBurdenPct)
  // Hauling (Subcontractor) — 12-yard loads × per-load rate (sub cost, pre-GP markup).
  const haulTrashRate = n(sr['Hand - Sub Haul - Trash 12yd'])
  const haulConcreteRate = n(sr['Hand - Sub Haul - Concrete 12yd'])
  const haulSoilRate = n(sr['Hand - Sub Haul - Soil 12yd'])
  const haulBaseRate = n(sr['Hand - Sub Haul - Import Base 12yd'])
  const haulCost =
    n(state.haulTrashLoads) * haulTrashRate +
    n(state.haulConcreteLoads) * haulConcreteRate +
    n(state.haulSoilLoads) * haulSoilRate +
    n(state.haulBaseLoads) * haulBaseRate
  // Subcontractor demo line: SF × per-sf rate (concrete/dirt/rock/paver combined).
  const handSubRate = n(sr['Sub Demo - Hand SF'])
  const subDemoCost = n(state.subDemoSF) * handSubRate
  const miscFlatSubCost = (state.subMiscFlatRows || [])
    .slice(0, 2)
    .reduce((sum, r) => sum + n(r.sf) * handSubRate, 0)
  const handSubDemo = subDemoCost + miscFlatSubCost

  // ── Subcontractor fixed unit pricing: Grading ($/sf), Stump & Tree ($/ea) ──
  const sgCut = n(sr['Sub Grade - Hand Cut']) // $/CF
  const sgFill = n(sr['Sub Grade - Hand Fill']) // $/CF
  const sgJJ = n(sr['Sub Grade - Hand JJ']) // $/SF
  const sgSheep = n(sr['Sub Grade - Hand Sheepsfoot']) // $/SF
  const sgRoll = n(sr['Sub Grade - Hand Roll']) // $/SF
  const subGradingCost =
    flatCf(state.subGradeCutSF, state.subGradeCutDepth || 4) * sgCut +
    flatCf(state.subGradeFillSF, state.subGradeFillDepth || 4) * sgFill +
    n(state.subJjSF) * sgJJ +
    n(state.sheepsfootSF) * sgSheep +
    n(state.rollCompSF) * sgRoll

  const ssSmall = n(sr['Sub Stump - Hand Small'])
  const ssMed = n(sr['Sub Stump - Hand Medium'])
  const ssLarge = n(sr['Sub Stump - Hand Large'])
  const ssXL = n(sr['Sub Stump - Hand XL'])
  const subStumpCost =
    n(state.stumpSmallQty) * ssSmall +
    n(state.stumpMedQty) * ssMed +
    n(state.stumpLargeQty) * ssLarge +
    n(state.stumpXLQty) * ssXL

  const stSmall = n(sr['Sub Tree - Hand 6-12'])
  const stMed = n(sr['Sub Tree - Hand 12-18'])
  const stLarge = n(sr['Sub Tree - Hand 18-24'])
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
  const commission = (gp + subGp) * n(commissionRate)
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
    sr,
    containerPrice,
    containerCy,
    swellFactor,
    tonsSfInDenom,
    concreteWeightLbCf,
    treeCyFactor,
    bucketLaborMult,
    // hrs-per-Cu-Ft rates (new model) — surfaced for View Rates rows.
    hrConc,
    hrSoil,
    hrGrass,
    hrBase,
    hrBucket,
    hrMiscFlat,
    hrMiscVert,
    hrFooting,
    hrGradeCut,
    hrGradeFill,
    jjRate,
    rebarFactor,
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
    manualMat,
    subManualMat,
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
    rebarMinPerSF,
    stumpSmallRate,
    stumpMedRate,
    stumpLargeRate,
    stumpXLRate,
    treeSmall,
    treeMed,
    treeLarge,
  }
}
