// Pure Skid Steer Demo calc — extracted from SkidSteerDemoModule.jsx so the math is
// unit-testable without React/Supabase. Signature unchanged (only lifted out of the
// component; logic identical). Reads 'Demo - Skid …' rate keys.
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
  const tonsSfInDenom = n(mp['Tons SF-in Denominator']) // shared Basic Materials (Sub tab per-ton)
  const concreteWeightLbCf = n(lr['Basic Labor - Concrete Weight lb/cf']) // shared Basic Labor (Sub tab / vertical tons)
  // Tree green-waste CY factor is a material coefficient — lives in master material
  // rates (Basic Materials), read from materialPrices (mp), not labor_rates.
  const treeCyFactor = n(mp['Tree CY Factor'])
  // Local sfToTons shadows the module helper so the tons denominator is editable.
  const sfToTons = (sf, depthIn) => (n(sf) / tonsSfInDenom) * n(depthIn)
  // Subcontractor rates: a one-off adjustment saved on THIS estimate
  // (state.rateOverrides) takes precedence over the master rate.
  const sr = { ...(subRates || {}) }
  Object.entries(state.rateOverrides || {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '' && Number.isFinite(Number(v))) sr[k] = Number(v)
  })
  const access = 1 // access modifier removed
  const isSub = state.dumpType === 'Subcontractor' // Demo Type = Sub
  const isDumpSub = false // disposal follows the In House/Sub toggle
  const lrph = n(laborRatePerHour)
  const difficultyRatio = n(lr['Basic Labor - Difficulty Ratio']) // shared Basic Labor
  const diff = 1 + (n(state.difficulty) / 100) * difficultyRatio
  const hrsAdj = n(state.hoursAdj)

  // ── In-House labor rates (hrs per unit; unset ⇒ 0, no fallback) ───────────
  // Model: Concrete/Soil/Footing/Misc-Vert = hrs × Cu Yd; Misc-Flat/Compaction/
  // Jumping-Jack = hrs × Cu Ft; Grade-Cut/Grade-Fill/Import-Base = hrs × Sq Ft.
  const laborConc = n(lr['Skid - Concrete'])          // hrs / Cu Yd
  const laborDirt = n(lr['Skid - Soil'])              // hrs / Cu Yd
  const laborGrass = n(lr['Demo - Skid - Grass SF'])  // unchanged (per 100 sf·in)
  const laborMiscFlat = n(lr['Skid - Misc Flat'])     // hrs / Cu Ft
  const laborMiscVert = n(lr['Skid - Misc Vertical']) // hrs / Cu Yd
  const laborFooting = n(lr['Skid - Footing'])        // hrs / Cu Yd
  const laborGradeCut = n(lr['Skid - Grade Cut'])     // hrs / Sq Ft
  const rateGrass = n(lr['Demo - Skid Steer Grass'])
  const laborBase = n(lr['Skid - Import Base'])       // hrs / Cu Ft
  const laborGradeFill = n(lr['Skid - Grade Fill'])   // hrs / Sq Ft
  const laborJJ = n(lr['Basic Labor - Jumping Jack']) // shared, hrs / Cu Ft
  const laborSS = n(lr['Skid - Compaction'])          // hrs / Cu Ft
  // Rebar/Mesh is now a yes/no toggle that adds 30% to Skid - Concrete labor.
  const rebarMult = state.rebar ? 1.3 : 1
  // Shrub labor: per-height Each rates (replaces base rate × height factor).
  const shrubRateFor = h => n(lr['Skid - Shrubs ' + h + ' ft'])
  const stumpSmallRate = n(lr['Skid - Stump Small'])
  const stumpMedRate = n(lr['Skid - Stump Medium'])
  const stumpLargeRate = n(lr['Skid - Stump Large'])
  const stumpXLRate = n(lr['Skid - Stump XL'])
  const treeSmall = n(lr['Skid - Tree Small'])
  const treeMed = n(lr['Skid - Tree Medium'])
  const treeLarge = n(lr['Skid - Tree Large'])

  const dumpConc = n(mp['Dump Fee - Concrete'])
  const dumpDirt = n(mp['Dump Fee - Dirt'])
  const dumpGreen = n(mp['Dump Fee - Green Waste'])

  // ── Helpers ───────────────────────────────────────────────────────────────
  // Flat: SF × Depth → tons → hours = tons / (baseRate × access)
  function flat(sf, depthIn, baseRate, dumpFeePerTon = 0) {
    const tons = sfToTons(sf, depthIn)
    // Bank (in-place) cubic yards — the volume shown to the user. 27 cf/cy and
    // 12 in/ft are fixed unit conversions. cy = sf × depthFt / 27.
    const cy = (n(sf) * (n(depthIn) / 12)) / 27
    if (!tons) return { tons: 0, cy: 0, hours: 0, dumpFee: 0 }
    const hours = tons / (baseRate * access)
    const dumpFee = tons * dumpFeePerTon
    return { tons, cy, hours, dumpFee }
  }

  // Vertical: LF × Height(in) × Width(in) → CF → tons (concrete 150 lb/cf)
  function vert(lf, heightIn, widthIn, baseRate, dumpFeePerTon = 0) {
    const cf = n(lf) * (n(heightIn) / 12) * (n(widthIn) / 12)
    const tons = (cf * concreteWeightLbCf) / 2000
    const cy = cf / 27
    if (!tons) return { tons: 0, cy: 0, cf: 0, hours: 0, dumpFee: 0 }
    const hours = tons / (baseRate * access)
    const dumpFee = tons * dumpFeePerTon
    return { tons, cy, cf, hours, dumpFee }
  }

  // Editable container disposal rates (Master Rates -> Materials, category Demo).
  const containerPrice = n(mp['Container (Low-Boy)'])
  const containerCy = n(mp['Container Capacity (CY)'])
  const swellFactor = n(mp['Removal Swell'])
  const removalYards = (sf, depthIn) => ((n(sf) * (n(depthIn) / 12)) / 27) * swellFactor
  const removalContainers = (sf, depthIn) => Math.ceil(removalYards(sf, depthIn) / containerCy)
  const containerCost = (sf, depthIn) =>
    removalContainers(sf, depthIn) * containerPrice
  const sfLaborHrs = (sf, depthIn, rate) => (n(sf) / 100) * n(depthIn) * rate
  const cfLaborHrs = (cf, rate) => (n(cf) * 12 / 100) * rate
  const flatCf = (sf, depthIn) => n(sf) * (n(depthIn) / 12)
  const baseMatPer10Cy = n(mp['Import Base $/10cy'])
  const containerCostCf = cf =>
    Math.ceil(((n(cf) / 27) * swellFactor) / containerCy) * containerPrice
  // Editable hauling coefficients (Master Rates -> Labor, category Demo).
  const haulSecPerFt = n(lr['Demo - Skid Steer Haul Sec/Ft'])
  const haulLoadCy = n(lr['Demo - Skid Steer Load (CY)'])

  // ── Demo rows ────────────────────────────────────────────────────────────
  const conc = flat(state.concSF, state.concDepth || 4, laborConc, 0)
  const dirt = flat(state.dirtSF, state.dirtDepth || 4, laborDirt, 0)
  const base = flat(state.baseSF, state.baseDepth || 4, laborBase, 0)
  const baseRawCy = flatCf(state.baseSF, state.baseDepth || 4) / 27
  const baseMat = Math.ceil(baseRawCy / 10) * baseMatPer10Cy
  const grass = flat(state.grassSF, state.grassDepth || 4, rateGrass, 0)
  // New model: Concrete/Soil = hrs × Cu Yd (Rebar/Mesh adds 30% to concrete);
  // Import Base = hrs × Cu Ft; Grass unchanged (per 100 sf·in).
  conc.hours = conc.cy * laborConc * rebarMult
  dirt.hours = dirt.cy * laborDirt
  base.hours = flatCf(state.baseSF, state.baseDepth || 4) * laborBase
  grass.hours = sfLaborHrs(state.grassSF, state.grassDepth || 4, laborGrass)
  conc.dumpFee = containerCost(state.concSF, state.concDepth || 4)
  dirt.dumpFee = containerCost(state.dirtSF, state.dirtDepth || 4)
  grass.dumpFee = containerCost(state.grassSF, state.grassDepth || 4)

  // Misc rows use same base rate as concrete/dirt (no preset dump fee for full SS)
  const miscFlatCalc = (state.miscFlatRows || []).map(r => {
    const row = flat(r.sf, r.depth || 4, laborConc, 0)
    row.hours = flatCf(r.sf, r.depth || 4) * laborMiscFlat // hrs × Cu Ft
    row.dumpFee = containerCost(r.sf, r.depth || 4)
    return row
  })
  const miscVertCalc = (state.miscVertRows || []).map(r => {
    const row = vert(r.lf, r.heightIn || 0, r.widthIn || 8, laborConc, 0)
    row.hours = row.cy * laborMiscVert // hrs × Cu Yd
    row.dumpFee = containerCostCf(row.cf)
    return row
  })
  const footingCalc = (state.footingRows || []).map(r => {
    const row = vert(r.lf, r.heightIn || 0, r.widthIn || 8, laborConc, 0)
    row.hours = row.cy * laborFooting // hrs × Cu Yd
    row.dumpFee = containerCostCf(row.cf)
    return row
  })

  // ── Grading ──────────────────────────────────────────────────────────────
  const gradeCut = flat(state.gradeCutSF, state.gradeCutDepth || 4, laborGradeCut, 0)
  gradeCut.dumpFee = containerCost(state.gradeCutSF, state.gradeCutDepth || 4)
  const gradeFill = flat(state.gradeFillSF, state.gradeFillDepth || 4, laborGradeFill, 0)
  // New model: grade cut/fill = hrs × Sq Ft (depth still drives haul/dump volume).
  gradeCut.hours = n(state.gradeCutSF) * laborGradeCut
  gradeFill.hours = n(state.gradeFillSF) * laborGradeFill

  const jjTons = sfToTons(state.jjSF, state.jjDepth || 4)
  const ssCmpTons = sfToTons(state.ssCmpSF, state.ssCmpDepth || 4)
  // Bank cubic yards for compaction display (volume shown to user).
  const jjCy = (n(state.jjSF) * (n(state.jjDepth || 4) / 12)) / 27
  const ssCmpCy = (n(state.ssCmpSF) * (n(state.ssCmpDepth || 4) / 12)) / 27
  // New model: Jumping Jack (shared Basic Labor) and Compaction = hrs × Cu Ft.
  const jjHrs = flatCf(state.jjSF, state.jjDepth || 4) * laborJJ
  const ssCmpHrs = flatCf(state.ssCmpSF, state.ssCmpDepth || 4) * laborSS

  // ── Rebar/Mesh ───────────────────────────────────────────────────────────
  // Yes/no toggle — 30% uplift already applied to conc.hours above (rebarMult).

  // ── Vegetation ───────────────────────────────────────────────────────────
  // Shrub Demo — per-height Each rates: qty × rate for the row's height bucket.
  const shrubRowsCalc = (state.shrubRows || []).map(r => ({
    hrs: n(r.qty) * shrubRateFor(r.height),
  }))
  const shrubRowsHrs = shrubRowsCalc.reduce((sum, r) => sum + r.hrs, 0)
  const stumpSmallHrs = n(state.stumpSmallQty) * access * stumpSmallRate
  const stumpMedHrs = n(state.stumpMedQty) * access * stumpMedRate
  const stumpLargeHrs = n(state.stumpLargeQty) * access * stumpLargeRate
  const stumpXLHrs = n(state.stumpXLQty) * access * stumpXLRate
  const stumpHrs = stumpSmallHrs + stumpMedHrs + stumpLargeHrs + stumpXLHrs

  const treeCalc = (state.treeRows || []).map(r => {
    const qty = n(r.qty),
      ht = n(r.height) || 10
    const mult = r.size === 'Large' ? treeLarge : r.size === 'Medium' ? treeMed : treeSmall
    const hrs = qty * ht * access * mult
    // Green-waste volume in cubic yards; dump billed per CY.
    const cy = qty * (ht / 10) * treeCyFactor
    const dumpFee = cy * dumpGreen
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

  // ── Sub rates — DB values take precedence over hardcoded fallbacks ───────────
  // Concrete/dirt/misc/footing/gradeCut → $/CY  |  grass/base → $/SF
  const srConc = n(sr['Demo - Skid Sub Demo - Concrete'])
  const srDirt = n(sr['Demo - Skid Sub Demo - Dirt/Rock'])
  const srBase = n(sr['Demo - Skid Sub Demo - Import Base'])
  const srGrass = n(sr['Demo - Skid Sub Demo - Grass/Sod'])
  const srMiscFlat = n(sr['Demo - Skid Sub Demo - Misc Flat'])
  const srGradeCut = n(sr['Demo - Skid Sub Demo - Grade Cut'])

  // ── Subcontractor cost (ton-based for concrete & dirt items) ─────────────────
  const subDumpCost = isSub
    ? // Concrete — $/ton
      sfToTons(state.concSF, state.concDepth || 4) * srConc +
      // Dirt/Rock — $/ton
      sfToTons(state.dirtSF, state.dirtDepth || 4) * srDirt +
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
        const tons = (cf * concreteWeightLbCf) / 2000
        return s + tons * srConc
      }, 0) +
      // Footing — $/ton (concrete rate)
      (state.footingRows || []).reduce((s, r) => s + sfToTons(r.sf, r.depth || 12) * srConc, 0) +
      // Grade Cut — $/ton (dirt rate)
      sfToTons(state.gradeCutSF, state.gradeCutDepth || 4) * srGradeCut
    : 0

  // ── Sub Haul cost (Dump Type = Subcontractor, Demo Type = In-House) ──────────
  // Labor unchanged; dump fees zeroed; per-1.5-ton sub haul charges applied
  // DB values (subcontractor_rates category='Sub Haul') take precedence over defaults
  const shConc = n(sr['Demo - Skid Sub Haul CY - Concrete'])
  const shDirt = n(sr['Demo - Skid Sub Haul CY - Dirt'])
  const shGrass = n(sr['Demo - Skid Sub Haul CY - Grass'])
  const subHaulCost = isDumpSub
    ? conc.cy * shConc +
      dirt.cy * shDirt +
      grass.cy * shGrass +
      miscFlatCalc.reduce((s, r) => s + r.cy * shConc, 0) +
      miscVertCalc.reduce((s, r) => s + r.cy * shConc, 0) +
      footingCalc.reduce((s, r) => s + r.cy * shConc, 0) +
      gradeCut.cy * shDirt +
      treeCalc.reduce((s, r) => s + r.cy * shGrass, 0)
    : 0

  // ── Hour aggregation ──────────────────────────────────────────────────────
  const crewDemoHrs =
    conc.hours +
      dirt.hours +
      base.hours +
      grass.hours +
      miscFlatCalc.reduce((s, r) => s + r.hours, 0) +
      miscVertCalc.reduce((s, r) => s + r.hours, 0) +
      footingCalc.reduce((s, r) => s + r.hours, 0) +
      gradeCut.hours
  const gradingHrs = gradeFill.hours + jjHrs + ssCmpHrs
  // Shrub & Stump Demo are In-House only — no labour or sub cost on Sub.
  const vegHrs = shrubRowsHrs + stumpHrs + treeCalc.reduce((s, r) => s + r.hrs, 0)

  // ── Walk-access (Truck → Work Area) — trip-based for bobcat demo ───────
  // Excel: S4 = (F6 - BobcatTravel) × N4 × 2 × (1/60/60)
  // where N4 = total tons × 2000 / BobcatBucket. Sub-only jobs (isSub) skip
  // the shuttle since the sub handles haul.
  const totalDemoTons =
    conc.tons +
      dirt.tons +
      grass.tons +
      miscFlatCalc.reduce((s, r) => s + r.tons, 0) +
      miscVertCalc.reduce((s, r) => s + r.tons, 0) +
      footingCalc.reduce((s, r) => s + r.tons, 0) +
      gradeCut.tons
  const haulYards =
    removalYards(state.concSF, state.concDepth || 4) +
    removalYards(state.dirtSF, state.dirtDepth || 4) +
    removalYards(state.gradeCutSF, state.gradeCutDepth || 4) +
    removalYards(state.grassSF, state.grassDepth || 4)
  const haulTrips = haulLoadCy > 0 ? haulYards / haulLoadCy : 0
  const walkHrs = (haulTrips * n(state.distanceLF) * haulSecPerFt) / 3600

  const rawHrs = crewDemoHrs + gradingHrs + vegHrs + manualHrs
  const totalHrs = rawHrs * diff + hrsAdj + walkHrs

  // ── Materials (dump fees — Self Haul mode) ────────────────────────────────
  const dumpMatCost =
    conc.dumpFee +
      dirt.dumpFee +
      grass.dumpFee +
      miscFlatCalc.reduce((s, r) => s + r.dumpFee, 0) +
      miscVertCalc.reduce((s, r) => s + r.dumpFee, 0) +
      footingCalc.reduce((s, r) => s + r.dumpFee, 0) +
      gradeCut.dumpFee +
      treeCalc.reduce((s, r) => s + r.dumpFee, 0)
  const totalMat = dumpMatCost + baseMat + manualMat

  // ── Financials ────────────────────────────────────────────────────────────
  const manDays = totalHrs / 8
  const laborCost = totalHrs * lrph
  const burden = laborCost * n(laborBurdenPct)
  // GP = labor component + Universal Sub Markup % on all sub costs
  // Hauling (Subcontractor) — 12-yard loads × per-load rate (sub cost, pre-GP markup).
  const haulTrashRate = n(sr['Demo - Skid Sub Haul - Trash 12yd'])
  const haulConcreteRate = n(sr['Demo - Skid Sub Haul - Concrete 12yd'])
  const haulSoilRate = n(sr['Demo - Skid Sub Haul - Soil 12yd'])
  const haulBaseRate = n(sr['Demo - Skid Sub Haul - Import Base 12yd'])
  const haulCost =
    n(state.haulTrashLoads) * haulTrashRate +
    n(state.haulConcreteLoads) * haulConcreteRate +
    n(state.haulSoilLoads) * haulSoilRate +
    n(state.haulBaseLoads) * haulBaseRate
  // Subcontractor combined demo line: SF × tiered $/sf by depth (concrete/dirt/rock/paver).
  const skidRateDeep = n(sr['Sub Demo - Skid 5-7in'])
  const skidRateMid = n(sr['Sub Demo - Skid 2-4in'])
  const skidRateShallow = n(sr['Sub Demo - Skid 1-2in'])
  const skidSubRate = d => {
    const x = n(d)
    return x >= 5 ? skidRateDeep : x >= 2 ? skidRateMid : skidRateShallow
  }
  const subDemoCost = n(state.subDemoSF) * skidSubRate(state.subDemoDepth || 7)
  const skidMiscFlatSubRate = n(sr['Sub Demo - Skid Misc Flat'])
  const miscFlatSubCost = (state.subMiscFlatRows || [])
    .slice(0, 2)
    .reduce((sum, r) => sum + n(r.sf) * skidMiscFlatSubRate, 0)
  const skidSubDemo = subDemoCost + miscFlatSubCost

  // ── Subcontractor fixed unit pricing: Grading ($/sf), Stump & Tree ($/ea) ──
  const sgCut = n(sr['Sub Grade - Skid Cut SF'])
  const sgFill = n(sr['Sub Grade - Skid Fill SF'])
  const sgJJ = n(sr['Sub Grade - Skid JJ SF'])
  const sgSheep = n(sr['Sub Grade - Skid Sheepsfoot SF'])
  const sgRoll = n(sr['Sub Grade - Skid Roll SF'])
  const sgSS = n(sr['Sub Grade - Skid SS Compact SF'])
  const subGradingCost =
    n(state.subGradeCutSF) * sgCut +
    n(state.subGradeFillSF) * sgFill +
    n(state.subJjSF) * sgJJ +
    n(state.sheepsfootSF) * sgSheep +
    n(state.rollCompSF) * sgRoll +
    n(state.subSsCmpSF) * sgSS

  const ssSmall = n(sr['Sub Stump - Skid Small'])
  const ssMed = n(sr['Sub Stump - Skid Medium'])
  const ssLarge = n(sr['Sub Stump - Skid Large'])
  const ssXL = n(sr['Sub Stump - Skid XL'])
  const subStumpCost =
    n(state.stumpSmallQty) * ssSmall +
    n(state.stumpMedQty) * ssMed +
    n(state.stumpLargeQty) * ssLarge +
    n(state.stumpXLQty) * ssXL

  const stSmall = n(sr['Sub Tree - Skid Small'])
  const stMed = n(sr['Sub Tree - Skid Medium'])
  const stLarge = n(sr['Sub Tree - Skid Large'])
  const subTreeRateFor = size =>
    size === 'Large' || size === '18" - 24"'
      ? stLarge
      : size === 'Medium' || size === '12" - 18"'
        ? stMed
        : stSmall
  const subTreeCost = (state.subTreeRows || []).reduce(
    (sum, r) => sum + n(r.qty) * subTreeRateFor(r.size),
    0,
  )

  const subFixedCost = subGradingCost + subTreeCost // stump hidden on Sub tab
  const subCost = skidSubDemo + subHaulCost + manualSub + haulCost + subFixedCost
  const subGp = subCost * subMarkupRate
  const gp = manDays * gpmd
  const commission = (gp + subGp) * n(commissionRate)
  const price = laborCost + burden + totalMat + gp + subGp + commission + subCost

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
    jjCy,
    ssCmpCy,
    jjHrs,
    ssCmpHrs,
    rebarMult,
    shrubRowsCalc,
    stumpSmallHrs,
    stumpMedHrs,
    stumpLargeHrs,
    stumpXLHrs,
    stumpSmallRate,
    stumpMedRate,
    stumpLargeRate,
    stumpXLRate,
    treeCalc,
    crewDemoHrs,
    gradingHrs,
    vegHrs,
    manualHrs,
    manualMat,
    subManualMat,
    dumpMatCost,
    baseMat,
    laborGrass,
    isSub,
    isDumpSub,
    subDumpCost,
    skidRateDeep,
    skidRateMid,
    skidRateShallow,
    subDemoCost,
    sgCut,
    sgFill,
    sgJJ,
    sgSheep,
    sgRoll,
    sgSS,
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
    skidMiscFlatSubRate,
    subHaulCost,
    // expose resolved rates for UI display
    laborConc,
    laborDirt,
    laborBase,
    laborMiscFlat,
    laborMiscVert,
    laborFooting,
    laborGradeCut,
    laborGradeFill,
    rateGrass,
    laborJJ,
    laborSS,
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
