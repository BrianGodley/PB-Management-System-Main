// Pure Mini Skid Steer Demo calc — extracted from MiniSkidSteerDemoModule.jsx so the
// math is unit-testable without React/Supabase. Signature unchanged (logic identical).
// Reads 'Mini - …' rate keys, independent of Hand/Skid.
import { BAS } from '../../lib/basicLaborRefs.js'
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
  const concreteWeightLbCf = n(lr[BAS.CONCRETE_WEIGHT]) // shared Basic Labor (Sub tab / vertical tons)
  const treeCyFactor = n(mp['Tree CY Factor']) // moved to master material rates
  // Local sfToTons shadows the module helper so the tons denominator is editable.
  const sfToTons = (sf, depthIn) => (n(sf) / tonsSfInDenom) * n(depthIn)
  // Subcontractor rates: a one-off adjustment saved on THIS estimate
  // (state.rateOverrides) takes precedence over the master rate.
  const sr = { ...(subRates || {}) }
  Object.entries(state.rateOverrides || {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '' && Number.isFinite(Number(v))) sr[k] = Number(v)
  })
  // Excel uses two separate access-level tables:
  //   NonBobLevels — hand/mini demo items (concrete, dirt, base, misc flat/vert)
  //   BobcatLevels — bobcat-assisted ops (grass, grading, footing, vegetation)
  const accessNonBob = 1 // access modifier removed
  const accessBobcat = 1 // access modifier removed
  const isSub = state.dumpType === 'Subcontractor'
  const isDumpSub = false // disposal follows the In House/Sub toggle
  const lrph = n(laborRatePerHour)
  const difficultyRatio = n(lr[BAS.DIFFICULTY_RATIO]) // shared Basic Labor
  const diff = 1 + (n(state.difficulty) / 100) * difficultyRatio
  const hrsAdj = n(state.hoursAdj)

  // ── Pull rates from DB (lr) with fallbacks ────────────────────────────────
  // Mini Skid Steer rates — used for all operations
  // In-House labor rates (hrs per unit): Concrete/Soil/Footing/Misc-Vert = hrs×CY;
  // Misc-Flat/Compaction/Jumping-Jack = hrs×CF; Grade-Cut/Fill/Import-Base = hrs×SF.
  const laborConc = n(lr['Mini - Concrete'])          // hrs / Cu Yd
  const laborDirt = n(lr['Mini - Soil'])              // hrs / Cu Yd
  const laborGrass = n(lr['Mini - Grass SF'])  // hrs / Cu Ft
  const laborMiscFlat = n(lr['Mini - Misc Flat'])     // hrs / Cu Yd
  const laborMiscVert = n(lr['Mini - Misc Vertical']) // hrs / Cu Yd
  const laborFooting = n(lr['Mini - Footing'])        // hrs / Cu Ft
  const laborGradeCut = n(lr['Mini - Grade Cut'])     // hrs / Cu Ft
  const rateGrass = n(lr['Mini - Skid Steer Grass'])
  const laborBase = n(lr[BAS.IMPORT_BASE_MINI])       // hrs / Cu Ft (shared Basic Labor)
  const laborGradeFill = n(lr['Mini - Grade Fill'])   // hrs / Cu Ft
  const laborJJ = n(lr[BAS.JUMPING_JACK]) // shared, hrs / Cu Ft
  const laborSS = n(lr['Mini - Compaction'])          // hrs / Cu Ft
  const rebarMult = state.rebar ? 1.3 : 1             // Rebar/Mesh toggle: +30% concrete
  // Per-height shrub rates (Each), replacing the base rate × height factor model.
  const shrubRateFor = h => n(lr['Mini - Shrubs ' + h + ' ft'])
  const stumpSmallRate = n(lr['Mini - Stump Small'])
  const stumpMedRate = n(lr['Mini - Stump Medium'])
  const stumpLargeRate = n(lr['Mini - Stump Large'])
  const stumpXLRate = n(lr['Mini - Stump XL'])
  const treeSmall = n(lr['Mini - Tree Small'])
  const treeMed = n(lr['Mini - Tree Medium'])
  const treeLarge = n(lr['Mini - Tree Large'])

  const dumpConc = n(mp['Dump Fee - Concrete'])
  const dumpDirt = n(mp['Dump Fee - Dirt'])
  const dumpGreen = n(mp['Dump Fee - Green Waste'])
  const dumpTreeStump = n(mp['Dump Fee - Tree/Stump'])
  const dumpBase = n(mp['Dump Fee - Import Base'])

  // ── Helpers ───────────────────────────────────────────────────────────────
  // accessLevel param lets each call site use the correct NonBob or Bobcat multiplier
  // Sub Haul: labor hours are UNCHANGED — sub replaces disposal cost only
  // dump fees zero out (replaced by per-1.5T sub haul charges in subCost)
  function flat(sf, depthIn, baseRate, dumpFeePerTon = 0, accessLevel = accessNonBob) {
    const tons = sfToTons(sf, depthIn)
    const cy = (n(sf) * (n(depthIn) / 12)) / 27
    if (!tons) return { tons: 0, cy: 0, hours: 0, dumpFee: 0 }
    return {
      tons,
      cy,
      hours: tons / (baseRate * accessLevel),
      dumpFee: tons * dumpFeePerTon,
    }
  }

  function vert(lf, heightIn, widthIn, baseRate, dumpFeePerTon = 0, accessLevel = accessNonBob) {
    const cf = n(lf) * (n(heightIn) / 12) * (n(widthIn) / 12)
    const tons = (cf * concreteWeightLbCf) / 2000
    const cy = cf / 27
    if (!tons) return { tons: 0, cy: 0, cf: 0, hours: 0, dumpFee: 0 }
    return {
      tons,
      cy,
      cf,
      hours: tons / (baseRate * accessLevel),
      dumpFee: tons * dumpFeePerTon,
    }
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
  const haulSecPerFt = n(lr['Mini - Haul Sec/Ft'])
  const haulLoadCy = n(lr['Mini - Load (CY)'])

  // ── Import Base (single — IMPORT section, not replicated) ─────────────────
  const base = flat(state.baseSF, state.baseDepth || 4, laborBase, 0, accessNonBob)
  base.hours = flatCf(state.baseSF, state.baseDepth || 4) * laborBase // Import Base = hrs × Cu Ft
  const baseRawCy = flatCf(state.baseSF, state.baseDepth || 4) / 27
  const baseMat = Math.ceil(baseRawCy / 10) * baseMatPer10Cy

  // ── Main Demo — one or more independent sections (Add Demo). Each carries its
  // own Concrete/Soil/Grass/Grade-Cut + Rebar. Old estimates (flat state) fall
  // back to ONE section, reproducing prior numbers. Concrete/Soil = hrs × Cu Yd
  // (Rebar +30% on concrete); Grass/Grade-Cut = hrs × Cu Ft.
  const rebarF = on => (on ? 1.3 : 1)
  const mainSections =
    Array.isArray(state.mainDemoSections) && state.mainDemoSections.length
      ? state.mainDemoSections
      : [
          {
            concSF: state.concSF, concDepth: state.concDepth,
            dirtSF: state.dirtSF, dirtDepth: state.dirtDepth,
            grassSF: state.grassSF, grassDepth: state.grassDepth,
            gradeCutSF: state.gradeCutSF, gradeCutDepth: state.gradeCutDepth,
            rebar: state.rebar,
          },
        ]
  const sectionCalcs = mainSections.map(sec => {
    const conc = flat(sec.concSF, sec.concDepth || 4, laborConc, 0, accessNonBob)
    conc.hours = conc.cy * laborConc * rebarF(sec.rebar)
    conc.dumpFee = containerCost(sec.concSF, sec.concDepth || 4)
    const dirt = flat(sec.dirtSF, sec.dirtDepth || 4, laborDirt, 0, accessNonBob)
    dirt.hours = dirt.cy * laborDirt
    dirt.dumpFee = containerCost(sec.dirtSF, sec.dirtDepth || 4)
    const grass = flat(sec.grassSF, sec.grassDepth || 4, rateGrass, 0, accessBobcat)
    grass.hours = flatCf(sec.grassSF, sec.grassDepth || 4) * laborGrass
    grass.dumpFee = containerCost(sec.grassSF, sec.grassDepth || 4)
    const gradeCut = flat(sec.gradeCutSF, sec.gradeCutDepth || 4, laborGradeCut, 0, accessBobcat)
    gradeCut.hours = flatCf(sec.gradeCutSF, sec.gradeCutDepth || 4) * laborGradeCut
    gradeCut.dumpFee = containerCost(sec.gradeCutSF, sec.gradeCutDepth || 4)
    return { conc, dirt, grass, gradeCut }
  })
  const sumRows = key => {
    const acc = { tons: 0, cy: 0, cf: 0, hours: 0, dumpFee: 0 }
    for (const s of sectionCalcs) {
      const r = s[key] || {}
      acc.tons += r.tons || 0
      acc.cy += r.cy || 0
      acc.cf += r.cf || 0
      acc.hours += r.hours || 0
      acc.dumpFee += r.dumpFee || 0
    }
    return acc
  }
  const conc = sumRows('conc')
  const dirt = sumRows('dirt')
  const grass = sumRows('grass')

  // Mini SS: misc flat/vert carry $36.21 concrete dump fee — NonBob access
  const miscFlatCalc = (state.miscFlatRows || []).map(r => {
    const row = flat(r.sf, r.depth || 4, laborConc, 0, accessNonBob)
    row.hours = row.cy * laborMiscFlat // hrs × Cu Yd
    row.dumpFee = containerCost(r.sf, r.depth || 4)
    return row
  })
  const miscVertCalc = (state.miscVertRows || []).map(r => {
    const row = vert(r.lf, r.heightIn || 0, r.widthIn || 8, laborConc, 0, accessNonBob)
    row.hours = row.cy * laborMiscVert // hrs × Cu Yd
    row.dumpFee = containerCostCf(row.cf)
    return row
  })
  const footingCalc = (state.footingRows || []).map(r => {
    const row = vert(r.lf, r.heightIn || 0, r.widthIn || 8, laborConc, 0, accessBobcat)
    row.hours = row.cf * laborFooting // hrs × Cu Ft
    row.dumpFee = containerCostCf(row.cf)
    return row
  })

  // ── Grading — Grade Cut aggregated per Main Demo section (above); Grade Fill
  // stays single. ──────────────────────────────────────────────────────────
  const gradeCut = sumRows('gradeCut')
  const gradeFill = flat(state.gradeFillSF, state.gradeFillDepth || 4, laborGradeFill, 0, accessBobcat)
  gradeFill.hours = flatCf(state.gradeFillSF, state.gradeFillDepth || 4) * laborGradeFill

  const jjTons = sfToTons(state.jjSF, state.jjDepth || 4)
  const ssCmpTons = sfToTons(state.ssCmpSF, state.ssCmpDepth || 4)
  const jjCy = (n(state.jjSF) * (n(state.jjDepth || 4) / 12)) / 27
  const ssCmpCy = (n(state.ssCmpSF) * (n(state.ssCmpDepth || 4) / 12)) / 27
  // New model: Jumping Jack (shared Basic Labor) and Compaction = hrs × Cu Ft.
  const jjHrs = flatCf(state.jjSF, state.jjDepth || 4) * laborJJ
  const ssCmpHrs = flatCf(state.ssCmpSF, state.ssCmpDepth || 4) * laborSS

  // Rebar/Mesh is a 30% uplift on concrete labor (rebarMult, applied above).

  // ── Vegetation — Bobcat access ────────────────────────────────────────────
  // Shrub Demo — per-area rows: qty × shrub rate × height modifier (Hand format).
  const shrubRowsCalc = (state.shrubRows || []).map(r => ({
    hrs: n(r.qty) * accessBobcat * shrubRateFor(r.height),
  }))
  const shrubRowsHrs = shrubRowsCalc.reduce((sum, r) => sum + r.hrs, 0)
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
    const cy = qty * (ht / 10) * treeCyFactor
    const dumpFee = cy * dumpTreeStump // Mini: green-waste dump billed per CY
    return { hrs, cy, dumpFee }
  })

  // ── Manual ────────────────────────────────────────────────────────────────
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

  // ── Sub Haul cost — per 1.5 tons, goes into subCost (not materials) ──────────
  // DB values (subcontractor_rates category='Sub Haul') take precedence over defaults
  const shConc = n(sr['Mini - Sub Haul CY - Concrete'])
  const shDirt = n(sr['Mini - Sub Haul CY - Dirt'])
  const shGrass = n(sr['Mini - Sub Haul CY - Grass'])

  const subHaulCost = isDumpSub
    ? conc.cy * shConc +
      dirt.cy * shDirt +
      grass.cy * shGrass +
      miscFlatCalc.reduce((s, r) => s + r.cy * shConc, 0) +
      miscVertCalc.reduce((s, r) => s + r.cy * shConc, 0) +
      footingCalc.reduce((s, r) => s + r.cy * shConc, 0) +
      gradeCut.cy * shDirt +
      treeCalc.reduce((s, r) => s + r.cy * shGrass, 0)
    : 0 // per-CY sub-haul — active only when disposal follows the Sub toggle

  // ── Hour aggregation — labor is the same in both modes ────────────────────
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
    gradeCut.tons
  const haulYards = mainSections.reduce(
    (s, sec) =>
      s +
      removalYards(sec.concSF, sec.concDepth || 4) +
      removalYards(sec.dirtSF, sec.dirtDepth || 4) +
      removalYards(sec.gradeCutSF, sec.gradeCutDepth || 4) +
      removalYards(sec.grassSF, sec.grassDepth || 4),
    0
  )
  const haulTrips = haulLoadCy > 0 ? haulYards / haulLoadCy : 0
  const walkHrs = (haulTrips * n(state.distanceLF) * haulSecPerFt) / 3600

  const rawHrs = crewDemoHrs + gradingHrs + vegHrs + manualHrs
  const totalHrs = rawHrs * diff + hrsAdj + walkHrs

  // ── Materials ─────────────────────────────────────────────────────────────
  const dumpMatCost =
    conc.dumpFee +
      dirt.dumpFee +
      base.dumpFee +
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
  // GP = labor component + Universal Sub Markup % on sub haul cost
  // Hauling (Subcontractor) — 12-yard loads × per-load rate (sub cost, pre-GP markup).
  const haulTrashRate = n(sr['Mini - Sub Haul - Trash 12yd'])
  const haulConcreteRate = n(sr['Mini - Sub Haul - Concrete 12yd'])
  const haulSoilRate = n(sr['Mini - Sub Haul - Soil 12yd'])
  const haulBaseRate = n(sr['Mini - Sub Haul - Import Base 12yd'])
  const haulCost =
    n(state.haulTrashLoads) * haulTrashRate +
    n(state.haulConcreteLoads) * haulConcreteRate +
    n(state.haulSoilLoads) * haulSoilRate +
    n(state.haulBaseLoads) * haulBaseRate
  // Subcontractor combined demo line: SF × tiered $/sf by depth (concrete/dirt/rock/paver).
  const miniRateDeep = n(sr['Sub Demo - Mini 5-7in'])
  const miniRateMid = n(sr['Sub Demo - Mini 2-4in'])
  const miniRateShallow = n(sr['Sub Demo - Mini 1-2in'])
  const miniSubRate = d => {
    const x = n(d)
    return x >= 5 ? miniRateDeep : x >= 2 ? miniRateMid : miniRateShallow
  }
  const subDemoCost = n(state.subDemoSF) * miniSubRate(state.subDemoDepth || 7)
  const miniMiscFlatSubRate = n(sr['Sub Demo - Mini Misc Flat'])
  const miscFlatSubCost = (state.subMiscFlatRows || [])
    .slice(0, 2)
    .reduce((sum, r) => sum + n(r.sf) * miniMiscFlatSubRate, 0)
  const miniSubDemo = subDemoCost + miscFlatSubCost

  // ── Subcontractor fixed unit pricing: Grading ($/sf), Stump & Tree ($/ea) ──
  const sgCut = n(sr['Sub Grade - Mini Cut SF'])
  const sgFill = n(sr['Sub Grade - Mini Fill SF'])
  const sgJJ = n(sr['Sub Grade - Mini JJ SF'])
  const sgSheep = n(sr['Sub Grade - Mini Sheepsfoot SF'])
  const sgRoll = n(sr['Sub Grade - Mini Roll SF'])
  const sgSS = n(sr['Sub Grade - Mini SS Compact SF'])
  const subGradingCost =
    n(state.subGradeCutSF) * sgCut +
    n(state.subGradeFillSF) * sgFill +
    n(state.subJjSF) * sgJJ +
    n(state.sheepsfootSF) * sgSheep +
    n(state.rollCompSF) * sgRoll +
    n(state.subSsCmpSF) * sgSS

  const ssSmall = n(sr['Sub Stump - Mini Small'])
  const ssMed = n(sr['Sub Stump - Mini Medium'])
  const ssLarge = n(sr['Sub Stump - Mini Large'])
  const ssXL = n(sr['Sub Stump - Mini XL'])
  const subStumpCost =
    n(state.stumpSmallQty) * ssSmall +
    n(state.stumpMedQty) * ssMed +
    n(state.stumpLargeQty) * ssLarge +
    n(state.stumpXLQty) * ssXL

  const stSmall = n(sr['Sub Tree - Mini Small'])
  const stMed = n(sr['Sub Tree - Mini Medium'])
  const stLarge = n(sr['Sub Tree - Mini Large'])
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
  const subCost = subHaulCost + manualSub + haulCost + miniSubDemo + subFixedCost
  const subGp = subCost * subMarkupRate
  const gp = manDays * gpmd
  const commission = (gp + subGp) * n(commissionRate)
  const price = laborCost + burden + totalMat + gp + subGp + commission + subCost

  return {
    sectionCalcs,
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
    miniMiscFlatSubRate,
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
    laborJJ,
    laborSS,
    treeSmall,
    treeMed,
    treeLarge,
    accessNonBob,
    accessBobcat,
    shConc,
    shDirt,
    shGrass,
  }
}
