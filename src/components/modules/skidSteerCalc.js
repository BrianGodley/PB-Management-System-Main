// Pure Skid Steer Demo calc — extracted from SkidSteerDemoModule.jsx so the math is
// unit-testable without React/Supabase. Signature unchanged (only lifted out of the
// component; logic identical). Reads 'Demo - Skid …' rate keys.
import { BAS } from '../../lib/basicLaborRefs.js'
import { makeModuleRates } from '../../lib/moduleRates.js'
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
  // 12 in/ft, 60 min/hr) stay as literal math. Tons removed — every volume is
  // Cu Yd (dump fees per container/CY, sub demo per Cu Yd, labor hrs per Cu Ft/Yd).
  // Tree green-waste CY factor is a material coefficient — lives in master material
  // rates (Basic Materials), read from materialPrices (mp), not labor_rates.
  const treeCyFactor = n(mp['Tree CY Factor'])
  // Bank cubic yards from flat area: cy = sf × depth(in)/12 ÷ 27.
  const cyOf = (sf, depthIn) => (n(sf) * (n(depthIn) / 12)) / 27
  // Subcontractor rates: a one-off adjustment saved on THIS estimate
  // (state.rateOverrides) takes precedence over the master rate.
  const sr = { ...(subRates || {}) }
  Object.entries(state.rateOverrides || {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '' && Number.isFinite(Number(v))) sr[k] = Number(v)
  })
  // ONE shared rate reader (records unset labor rates for the fix-it banner).
  // Purely additive surfacing — R.labor returns the SAME number as n(lr[name]),
  // so no pricing math changes. No materialRows here (demos price no catalog).
  const R = makeModuleRates({ material: mp, labor: lr, sub: sr, misc: mp, materialRows: [] })
  const access = 1 // access modifier removed
  const isSub = state.dumpType === 'Subcontractor' // Demo Type = Sub
  const isDumpSub = false // disposal follows the In House/Sub toggle
  const lrph = n(laborRatePerHour)
  const difficultyRatio = n(lr[BAS.DIFFICULTY_RATIO]) // shared Basic Labor
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
  const laborBase = n(lr[BAS.BASE_PREP_SKID])    // hrs / Cu Ft (shared Basic Labor)
  const laborGradeFill = n(lr['Skid - Grade Fill'])   // hrs / Sq Ft
  const laborJJ = n(lr[BAS.JUMPING_JACK]) // shared, hrs / Cu Ft
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

  // Green-waste dump (tree/stump), billed per Cu Yd.
  const dumpGreen = n(mp['Dump Fee - Green Waste'])

  // ── Helpers ───────────────────────────────────────────────────────────────
  // Volume in bank cubic yards — the only basis (tons removed). hours + dumpFee
  // are always set by the caller (hrs per Cu Ft/Yd, container/CY dump).
  // cy = sf × depthFt / 27.
  function flat(sf, depthIn) {
    const cy = (n(sf) * (n(depthIn) / 12)) / 27
    if (!cy) return { cy: 0, hours: 0, dumpFee: 0 }
    return { cy, hours: 0, dumpFee: 0 }
  }

  // Vertical: LF × Height(in) × Width(in) → CF → CY (bank).
  function vert(lf, heightIn, widthIn) {
    const cf = n(lf) * (n(heightIn) / 12) * (n(widthIn) / 12)
    const cy = cf / 27
    if (!cf) return { cy: 0, cf: 0, hours: 0, dumpFee: 0 }
    return { cy, cf, hours: 0, dumpFee: 0 }
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

  // ── Import Base (single — the IMPORT section, not replicated) ──────────────
  const base = flat(state.baseSF, state.baseDepth || 4, laborBase, 0)
  // Labor via R.labor at point-of-use (guarded by baseSF) so an unset Import Base
  // rate surfaces in the fix-it banner only when the section is actually used.
  const baseHrRate = n(state.baseSF) > 0 ? R.labor(BAS.BASE_PREP_SKID, { category: 'Demo', unit: 'Hrs per Cu Ft', label: 'Import Base' }) : 0
  base.hours = flatCf(state.baseSF, state.baseDepth || 4) * baseHrRate
  const baseRawCy = flatCf(state.baseSF, state.baseDepth || 4) / 27
  const baseMat = Math.ceil(baseRawCy / 10) * baseMatPer10Cy

  // ── Main Demo — one or more independent sections. Each carries its own
  // Concrete / Soil / Grass / Grade-Cut inputs + Rebar. Old estimates (flat
  // state, no mainDemoSections) fall back to ONE section from the flat fields,
  // reproducing prior numbers exactly. Concrete/Soil = hrs × Cu Yd (Rebar adds
  // 30% to concrete); Grass = per-100-sf·in; Grade Cut = hrs × Sq Ft.
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
    const c = flat(sec.concSF, sec.concDepth || 4, laborConc, 0)
    const cRate = n(sec.concSF) > 0 ? R.labor('Skid - Concrete', { category: 'Demo', unit: 'Hrs per Cu Yd', label: 'Concrete Demo' }) : 0
    c.hours = c.cy * cRate * rebarF(sec.rebar)
    c.dumpFee = containerCost(sec.concSF, sec.concDepth || 4)
    const d = flat(sec.dirtSF, sec.dirtDepth || 4, laborDirt, 0)
    const dRate = n(sec.dirtSF) > 0 ? R.labor('Skid - Soil', { category: 'Demo', unit: 'Hrs per Cu Yd', label: 'Soil Demo' }) : 0
    d.hours = d.cy * dRate
    d.dumpFee = containerCost(sec.dirtSF, sec.dirtDepth || 4)
    const g = flat(sec.grassSF, sec.grassDepth || 4, rateGrass, 0)
    const gRate = n(sec.grassSF) > 0 ? R.labor('Demo - Skid - Grass SF', { category: 'Demo', unit: 'Hrs per Sq Ft', label: 'Grass Demo' }) : 0
    g.hours = sfLaborHrs(sec.grassSF, sec.grassDepth || 4, gRate)
    g.dumpFee = containerCost(sec.grassSF, sec.grassDepth || 4)
    const gc = flat(sec.gradeCutSF, sec.gradeCutDepth || 4, laborGradeCut, 0)
    const gcRate = n(sec.gradeCutSF) > 0 ? R.labor('Skid - Grade Cut', { category: 'Demo', unit: 'Hrs per Sq Ft', label: 'Grade Cut' }) : 0
    gc.hours = n(sec.gradeCutSF) * gcRate
    gc.dumpFee = containerCost(sec.gradeCutSF, sec.gradeCutDepth || 4)
    return { conc: c, dirt: d, grass: g, gradeCut: gc }
  })
  const sumRows = key => {
    const acc = { cy: 0, cf: 0, hours: 0, dumpFee: 0 }
    for (const s of sectionCalcs) {
      const r = s[key] || {}
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

  // Misc rows use same base rate as concrete/dirt (no preset dump fee for full SS)
  const miscFlatCalc = (state.miscFlatRows || []).map(r => {
    const row = flat(r.sf, r.depth || 4, laborConc, 0)
    const rate = n(r.sf) > 0 ? R.labor('Skid - Misc Flat', { category: 'Demo', unit: 'Hrs per Cu Ft', label: 'Misc Flat Demo' }) : 0
    row.hours = flatCf(r.sf, r.depth || 4) * rate // hrs × Cu Ft
    row.dumpFee = containerCost(r.sf, r.depth || 4)
    return row
  })
  const miscVertCalc = (state.miscVertRows || []).map(r => {
    const row = vert(r.lf, r.heightIn || 0, r.widthIn || 8, laborConc, 0)
    const rate = row.cf > 0 ? R.labor('Skid - Misc Vertical', { category: 'Demo', unit: 'Hrs per Cu Yd', label: 'Misc Vertical Demo' }) : 0
    row.hours = row.cy * rate // hrs × Cu Yd
    row.dumpFee = containerCostCf(row.cf)
    return row
  })
  const footingCalc = (state.footingRows || []).map(r => {
    const row = vert(r.lf, r.heightIn || 0, r.widthIn || 8, laborConc, 0)
    const rate = row.cf > 0 ? R.labor('Skid - Footing', { category: 'Demo', unit: 'Hrs per Cu Yd', label: 'Footing Demo' }) : 0
    row.hours = row.cy * rate // hrs × Cu Yd
    row.dumpFee = containerCostCf(row.cf)
    return row
  })

  // ── Grading ──────────────────────────────────────────────────────────────
  const gradeCut = sumRows('gradeCut') // aggregated per Main Demo section (above)
  const gradeFill = flat(state.gradeFillSF, state.gradeFillDepth || 4, laborGradeFill, 0)
  // New model: grade fill = hrs × Sq Ft (depth still drives haul/dump volume).
  const gradeFillRate = n(state.gradeFillSF) > 0 ? R.labor('Skid - Grade Fill', { category: 'Demo', unit: 'Hrs per Sq Ft', label: 'Grade Fill' }) : 0
  gradeFill.hours = n(state.gradeFillSF) * gradeFillRate

  // Bank cubic yards for compaction display (volume shown to user).
  const jjCy = (n(state.jjSF) * (n(state.jjDepth || 4) / 12)) / 27
  const ssCmpCy = (n(state.ssCmpSF) * (n(state.ssCmpDepth || 4) / 12)) / 27
  // New model: Jumping Jack (shared Basic Labor) and Compaction = hrs × Cu Ft.
  const jjRateUse = n(state.jjSF) > 0 ? R.labor(BAS.JUMPING_JACK, { category: 'Demo', unit: 'Hrs per Cu Ft', label: 'Jumping Jack' }) : 0
  const jjHrs = flatCf(state.jjSF, state.jjDepth || 4) * jjRateUse
  const ssCmpRate = n(state.ssCmpSF) > 0 ? R.labor('Skid - Compaction', { category: 'Demo', unit: 'Hrs per Cu Ft', label: 'Compaction' }) : 0
  const ssCmpHrs = flatCf(state.ssCmpSF, state.ssCmpDepth || 4) * ssCmpRate

  // ── Rebar/Mesh ───────────────────────────────────────────────────────────
  // Yes/no toggle — 30% uplift already applied to conc.hours above (rebarMult).

  // ── Vegetation ───────────────────────────────────────────────────────────
  // Shrub Demo — per-height Each rates: qty × rate for the row's height bucket.
  const shrubRowsCalc = (state.shrubRows || []).map(r => {
    const rate = n(r.qty) > 0 ? R.labor('Skid - Shrubs ' + r.height + ' ft', { category: 'Demo', unit: 'Hrs per Each', label: 'Shrub ' + r.height + ' ft' }) : 0
    return { hrs: n(r.qty) * rate }
  })
  const shrubRowsHrs = shrubRowsCalc.reduce((sum, r) => sum + r.hrs, 0)
  const stumpSmallHrs = n(state.stumpSmallQty) > 0 ? n(state.stumpSmallQty) * access * R.labor('Skid - Stump Small', { category: 'Demo', unit: 'Hrs per Each', label: 'Stump Small' }) : 0
  const stumpMedHrs = n(state.stumpMedQty) > 0 ? n(state.stumpMedQty) * access * R.labor('Skid - Stump Medium', { category: 'Demo', unit: 'Hrs per Each', label: 'Stump Medium' }) : 0
  const stumpLargeHrs = n(state.stumpLargeQty) > 0 ? n(state.stumpLargeQty) * access * R.labor('Skid - Stump Large', { category: 'Demo', unit: 'Hrs per Each', label: 'Stump Large' }) : 0
  const stumpXLHrs = n(state.stumpXLQty) > 0 ? n(state.stumpXLQty) * access * R.labor('Skid - Stump XL', { category: 'Demo', unit: 'Hrs per Each', label: 'Stump XL' }) : 0
  const stumpHrs = stumpSmallHrs + stumpMedHrs + stumpLargeHrs + stumpXLHrs

  const treeCalc = (state.treeRows || []).map(r => {
    const qty = n(r.qty),
      ht = n(r.height) || 10
    const treeName = r.size === 'Large' ? 'Skid - Tree Large' : r.size === 'Medium' ? 'Skid - Tree Medium' : 'Skid - Tree Small'
    const treeLabel = r.size === 'Large' ? 'Tree Large' : r.size === 'Medium' ? 'Tree Medium' : 'Tree Small'
    const mult = qty > 0 ? R.labor(treeName, { category: 'Demo', unit: 'Hrs per Each', label: treeLabel }) : 0
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

  // ── Subcontractor cost (per Cu Yd for concrete & dirt items) ─────────────────
  const subDumpCost = isSub
    ? // Concrete — $/Cu Yd
      cyOf(state.concSF, state.concDepth || 4) * srConc +
      // Dirt/Rock — $/Cu Yd
      cyOf(state.dirtSF, state.dirtDepth || 4) * srDirt +
      // Import Base — $/SF (no depth, stays SF-based)
      n(state.baseSF) * srBase +
      // Grass/Sod — $/SF (stays SF-based)
      n(state.grassSF) * srGrass +
      // Misc Flat — $/Cu Yd (concrete rate)
      (state.miscFlatRows || []).reduce(
        (s, r) => s + cyOf(r.sf, r.depth || 4) * srMiscFlat,
        0
      ) +
      // Misc Vert — $/Cu Yd (concrete rate); Cu Yd from LF × H × W → CF ÷ 27
      (state.miscVertRows || []).reduce((s, r) => {
        const cf = n(r.lf) * (n(r.heightIn || 0) / 12) * (n(r.widthIn || 8) / 12)
        return s + (cf / 27) * srConc
      }, 0) +
      // Footing — $/Cu Yd (concrete rate)
      (state.footingRows || []).reduce((s, r) => s + cyOf(r.sf, r.depth || 12) * srConc, 0) +
      // Grade Cut — $/Cu Yd (dirt rate)
      cyOf(state.gradeCutSF, state.gradeCutDepth || 4) * srGradeCut
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

  // ── Walk-access (Truck → Work Area) — trip-based for bobcat demo.
  // Trips = removed Cu Yd ÷ load size (tons removed — CY is the basis). ───
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
    unpriced: R.unpricedList,
    sectionCalcs,
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
    gp,
    subGp,
    commission,
    price,
    sr,
    containerPrice,
    containerCy,
    swellFactor,
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
