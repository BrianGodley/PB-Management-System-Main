// Pure Concrete calc — extracted from ConcreteModule.jsx so the math (incl. the
// no-fallback unpriced list) is unit-testable without React/Supabase. Logic identical.
// The small helper consts below are duplicated from the module (kept in sync); the
// module now imports calcConcrete from here.
import { makeModuleRates } from '../../lib/moduleRates.js'
import { LAB } from '../../lib/laborRefs.js'
import { BAS } from '../../lib/basicLaborRefs.js'

// Inlined pure helpers — lib/materialCatalog + lib/walkAccess import supabase and so
// can't be pulled into a node-testable pure module. Copies kept in sync with the libs.
const n = v => parseFloat(v) || 0
const DEFAULT_WALK_ACCESS_PACE_LF_PER_MIN = 60
const isStandardSel = v => !v || v === 'Standard'
function catalogOptions(materialRows, subcategory, vendorSel, { standardRows = 'exclude', stripPrefix = false, category = null } = {}) {
  const isStandard = isStandardSel(vendorSel) || vendorSel === 'Custom'
  if (isStandard && standardRows === 'exclude') return []
  const prefix = `${subcategory} - `
  return (materialRows || [])
    .filter(r => r.sub_category === subcategory && (!category || r.category === category) && (isStandard ? r.vendor_id == null : r.vendor_id === vendorSel))
    .map(r => {
      const label = stripPrefix && r.name && r.name.startsWith(prefix) ? r.name.slice(prefix.length) : r.name
      return { id: r.id, value: r.id, label, stored: label, row: r }
    })
}
function calcWalkAccessLabor(laborSubtotalHrs, distanceLF, opts = {}) {
  const hrs = n(laborSubtotalHrs)
  const lf = n(distanceLF)
  const pace = n(opts.paceLfPerMin) || DEFAULT_WALK_ACCESS_PACE_LF_PER_MIN
  if (hrs <= 0 || lf <= 0 || pace <= 0) return 0
  return ((hrs / 8) * (lf * 2)) / pace
}


// Concrete base-prep labor reads the SHARED Basic Labor table (sub 'Base Prep') —
// the same three methods Pavers + the demos use, one source of truth by ref_key.
const BASE_METHOD_LABOR_NAME = {
  'Skid Steer': BAS.BASE_PREP_SKID,
  'Mini Skid Steer': BAS.BASE_PREP_MINI,
  Hand: BAS.BASE_PREP_HAND,
}

// Collapse legacy method labels onto the three canonical methods.
const normBaseMethod = m =>
  m === 'Skid Steer OK' || m === 'Skid Steer Good'
    ? 'Skid Steer'
    : m === 'Wheelbarrow'
      ? 'Hand'
      : m

const INSTALL_TIERS = [
  { key: 's100_300', label: '100–300 Sq Ft', rateName: LAB.CONC_INSTALL_100_300 },
  { key: 's300_600', label: '300–600 Sq Ft', rateName: LAB.CONC_INSTALL_300_600 },
  { key: 's600_1000', label: '600–1000 Sq Ft', rateName: LAB.CONC_INSTALL_600_1000 },
  { key: 's1000_2000', label: '1000–2000 Sq Ft', rateName: LAB.CONC_INSTALL_1000_2000 },
  { key: 's2000plus', label: '2000+ SF', rateName: LAB.CONC_INSTALL_2000_PLUS },
]

function resolveType(label, opts) {
  return (label != null && opts.find(o => o.label === label)) || { dbName: null, fallback: 0 }
}

const CLASS2_NAMES = ['Class II Roadbase', 'Base - Class II Roadbase']
const firstDefinedRate = (m, keys) => {
  for (const k of keys) if (m && m[k] != null) return m[k]
  return undefined
}

export function calcConcrete(
  state,
  laborRatePerHour = null,
  lr = {},
  mr = {},
  sr = {},
  gpmd = null,
  walkAccess = null,
  laborBurdenPct = null,
  materialRows = [],
  catDefaults = {},
  commissionRate = null
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
  // Vendor-catalog MATERIAL resolver (sealer / vapor / finish material). Resolves
  // a picked Vendor+Item against the catalog and returns its unit price + coverage
  // + coats from calc_meta. 'Standard'/'auto' → the null-vendor rows. No hardcoded
  // fallback — an unmatched pick returns null (row books $0).
  const catItem = (subcat, vendor, itemName) => {
    if (!vendor || !itemName) return null
    const isStd = vendor === 'Standard' || vendor === 'auto'
    const opts = catalogOptions(materialRows, subcat, isStd ? 'Standard' : vendor, {
      standardRows: 'null-vendor',
      stripPrefix: true,
    })
    const o = opts.find(x => x.label === itemName)
    if (!o) return null
    const meta = o.row.calc_meta || {}
    return { price: n(o.row.unit_cost), coverage: n(meta.coverageSqFt), coats: n(meta.coats) }
  }
  // Subcontractor rates: a one-off adjustment saved on THIS estimate
  // (state.rateOverrides) takes precedence over the master rate.
  sr = { ...(sr || {}) }
  Object.entries(state.rateOverrides || {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '' && Number.isFinite(Number(v))) sr[k] = Number(v)
  })
  const _pace = parseFloat(walkAccess?.paceLfPerMin) || 0
  const lrph = n(laborRatePerHour)

  // ── Labor production rates (labor_rates) ─────────────────────────────────
  const concreteSFPerHr = n(lr[LAB.CONC_POUR_FINISH])
  // Rebar labor SF/hr is pattern-specific — each spacing has its own production
  // rate row (read by frozen ref_key). All table-driven.
  const rebarSFPerHrBySpacing = {
    '24" OC': n(lr[LAB.CONC_REBAR_24]),
    '18" OC': n(lr[LAB.CONC_REBAR_18]),
    '12" OC': n(lr[LAB.CONC_REBAR_12]),
  }
  const rebarSFPerHr =
    rebarSFPerHrBySpacing[state.rebarSpacing] ?? n(lr[LAB.CONC_REBAR_24])
  const formLFPerHr = n(lr[LAB.CONC_FORM_SETTING])
  const sleeveLFPerHr = n(lr[LAB.CONC_SLEEVES])
  const sealerNaturalSFPerHr = n(lr[LAB.CONC_SEALER_NATURAL])
  const sealerWetSFPerHr = n(lr[LAB.CONC_SEALER_WET])
  const vaporBarrierSFPerHr = n(lr[LAB.CONC_VAPOR_BARRIER])
  const complexityPctPerUnit = n(lr[LAB.CONC_FORMING_COMPLEXITY])
  // Finish add-on labor — hrs per Sq Ft, editable via labor_rates. (Vars keep
  // the legacy *SFPerHr names but now hold hrs-per-SF; standardized 2026-08-18.)
  const sandFinishSFPerHr = n(lr[LAB.CONC_SAND_FINISH])
  const saltFinishSFPerHr = n(lr[LAB.CONC_SALT_FINISH])
  const exposedAggSFPerHr = n(lr[LAB.CONC_EXPOSED_AGG])
  const seededAggSFPerHr = n(lr[LAB.CONC_SEEDED_AGG])
  const stampedSFPerHr = n(lr[LAB.CONC_STAMPED_FINISH])
  // Hand Mix takes more labor to produce than truck-delivered mix. Applied as a
  // % uplift to that tier's pour & finish hours. Tunable coefficient — lives in
  // labor_rates (View Rates), read live with no hardcoded fallback.
  const handMixUpliftPct = n(lr[LAB.CONC_HAND_MIX_UPLIFT])

  // ── Material unit costs (material_rates) ─────────────────────────────────
  // Material $ come ONLY from the catalog (no hardcoded fallbacks). A name with
  // no catalog price is recorded on R.unpriced and returned so the module can
  // prompt the user to price it inline — never silently defaulted.
  // Unified rate reader (reference conversion). Value-identical to the old
  // makePriceLookup — R.mat reads the same merged `mr` with the same coercion —
  // but also records .touched (every rate this calc read), which will drive
  // usage-based View Rates. mr holds material+misc; lr labor; sr sub.
  const R = makeModuleRates({ material: mr, labor: lr, sub: sr, misc: mr, materialRows })
  const concretePerCY = n(mr['Concrete - Ready Mix (Truck)']) // display-only; Install prices per-row from the catalog (mt.fallback)
  // Rebar $/LF (canonical, from the shared Basic Materials 'Rebar' row) and the
  // LF-per-SF conversion factor for the chosen on-center spacing.
  const rebarPerLF = R.mat('Rebar ' + (state.rebarSize || '#4'), {
    category: 'Basic Materials',
    unit: 'Ln Ft',
  })
  // Rebar LF-per-SF conversion by spacing — DB-editable coefficients (kept).
  const rebarLfPerSfBySpacing = {
    '24" OC': n(mr['Concrete - Rebar LF/SF 24" OC']),
    '18" OC': n(mr['Concrete - Rebar LF/SF 18" OC']),
    '12" OC': n(mr['Concrete - Rebar LF/SF 12" OC']),
  }
  const rebarLfPerSf = rebarLfPerSfBySpacing[state.rebarSpacing] ?? rebarLfPerSfBySpacing['24" OC']
  const formMaterialPerLF = R.mat('Concrete - Form Lumber LF', { category: 'Concrete', unit: 'LF' })
  const sleevePer10LF = R.mat('Concrete - Sleeve Per 10LF', { category: 'Concrete', unit: '10LF' })
  const colorCostPerCY = R.mat('Concrete - Color Per CY', { category: 'Concrete', unit: 'CY' })
  // Base Install MATERIAL price ($/Cu Yd) — the canonical Basic Materials
  // 'Class II Roadbase' Standard price, resolved by name (the old 'Concrete
  // Base' sub-category source has been consolidated/archived into this record).
  const costBase = n(firstDefinedRate(mr, CLASS2_NAMES))

  // ── Sub / equipment costs (subcontractor_rates) ──────────────────────────
  const pumpFeeFlat = n(sr['Concrete - Pump Flat Fee'])
  const pumpFeePerCY = n(sr['Concrete - Pump Per CY'])
  const sandFinishPer400SF = n(sr['Concrete - Sand Finish 400SF'])
  const stampSubFlat = n(sr['Concrete - Stamp Sub Flat'])
  const stampSubPerCY = n(sr['Concrete - Stamp Sub Per CY'])

  const diffPct = n(state.difficulty) / 100
  const layoutHrs = n(state.layoutHrs)
  const distanceLF = n(state.distanceLF)
  const finishType = state.finishType || 'Broom Finish'
  const colorYes = state.colorYes
  const pumpYes = state.pumpYes
  const isIH = state.finishingType !== 'Sub'
  const vaporSF = n(state.vaporBarrierSF)
  const sealerSF = n(state.sealerSF)
  const hoursAdj = n(state.hoursAdj)

  // ── Base ────────────────────────────────────────────────────────────────
  let baseHrsTot = 0,
    baseMatTot = 0
  const baseCalc = (state.baseRows || []).map(r => {
    const sf = n(r.sf),
      depth = n(r.depth) || 2
    if (!sf) return { hrs: 0, mat: 0 }
    const m = normBaseMethod(r.method)
    // LABOR is by VOLUME (Cu Ft) — mirrors Pavers exactly so both share the same
    // Basic Labor 'Base Prep' rate (hrs per Cu Ft). Cu Ft = SF × depth(in)/12.
    const rate = n(lr[BASE_METHOD_LABOR_NAME[m]])
    const hrs = (sf * (depth / 12)) * rate
    const bt = rowOpt('Base Material', r)
    // MATERIAL is by VOLUME, priced per CUBIC YARD. Base cubic yards =
    // SF × depth(in)/12 ÷ 27. Priced from the canonical Basic Materials
    // 'Class II Roadbase' Standard rate (costBase, $/Cu Yd); a vendor-picked
    // 'Base Material' product, if any, overrides that Standard price.
    const baseRate = bt.fallback > 0 ? bt.fallback : costBase
    const mat = sf > 0 ? (sf * (depth / 12) / 27) * baseRate : 0
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
    // hrs-per-SF: tier rate is hours per Sq Ft (standardized 2026-08-18, was SF/hr).
    const rate = n(lr[t.rateName])
    let hrs = sf * rate
    // Hand Mix uplift: producing mix by hand adds labor to this tier.
    if (/hand\s*mix/i.test(installTierType[t.key] || '')) hrs *= 1 + handMixUpliftPct / 100
    return s + hrs
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

  // hrs-per-unit reads below (standardized 2026-08-18): rebar/form/sleeve rates
  // are hours per Sq Ft / Ln Ft, so hours = qty × rate.
  const rebarHrs = rebarSF * rebarSFPerHr
  const rebarMat = rebarSF * rebarLfPerSf * rebarPerLF

  const formHrs = formLF * formLFPerHr
  const formMat = formLF * formMaterialPerLF

  const sleeveUnits = sleeveLF > 0 ? Math.ceil(sleeveLF / 10) : 0
  const sleeveHrs = sleeveLF * sleeveLFPerHr
  const sleeveMat = sleeveUnits * sleevePer10LF

  // ── Travel ───────────────────────────────────────────────────────────────
  // Old per-module travelHrs retired — now handled by unified walk-access penalty below.
  const travelHrs = 0

  // ── Forming complexity ───────────────────────────────────────────────────
  const preComplexHrs =
    layoutHrs + travelHrs + baseHrsTot + installHrs + rebarHrs + formHrs + sleeveHrs

  // ── Finish add-ons ───────────────────────────────────────────────────────
  // Finish labor is driven by the finish area entered in the Finish row (Sq Ft).
  // If that's left blank, it falls back to the full poured area (install tiers)
  // so the whole slab gets finished — matching the original behavior.
  const finishSF = n(state.finishMatSF) > 0 ? n(state.finishMatSF) : installSF
  let finishHrs = 0,
    finishSubCost = 0,
    colorMat = 0
  if (finishType === 'Sand Finish') {
    finishHrs = finishSF * sandFinishSFPerHr
    if (isIH) finishSubCost = Math.ceil(finishSF / 400) * sandFinishPer400SF
  } else if (finishType === 'Salt Finish') {
    finishHrs = finishSF * saltFinishSFPerHr
  } else if (finishType === 'Exposed Aggregate') {
    finishHrs = finishSF * exposedAggSFPerHr
  } else if (finishType === 'Seeded Aggregate') {
    finishHrs = finishSF * seededAggSFPerHr
  } else if (finishType === 'Stamped') {
    finishHrs = finishSF * stampedSFPerHr
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
  // Labor = SF × hrs-per-SF; material = SF × the picked catalog item's $/SF.
  const vaporHrs = vaporSF * vaporBarrierSFPerHr
  const vap = catItem('Vapor Barrier', state.vaporVendor, state.vaporItem)
  const vaporMat = vap ? vaporSF * vap.price : 0

  // ── Sealer ───────────────────────────────────────────────────────────────
  // Labor by item name (wet → Wet-Look SF/hr, else Natural SF/hr; guarded).
  // Material = ceil(SF ÷ coverage) × the picked catalog item's $/gal. Coats are
  // display-only and NOT part of the math.
  const seal = catItem('Concrete Sealer', state.sealerVendor, state.sealerItem)
  let sealerHrs = 0
  if (sealerSF > 0) {
    const sealSFPerHr = /wet/i.test(state.sealerItem || '') ? sealerWetSFPerHr : sealerNaturalSFPerHr
    sealerHrs = sealerSF * sealSFPerHr
  }
  const sealerMat = seal && seal.coverage > 0 ? Math.ceil(sealerSF / seal.coverage) * seal.price : 0
  const sealerCoats = seal ? seal.coats : 0

  // ── Finish material (in-house — products for finishes that have them, e.g.
  //    Sand Finish). Whole gallons: ceil(SF ÷ coverage) × the item's $/gal. ──
  const finMatSF = n(state.finishMatSF)
  const fin = catItem('Concrete Finish Material', state.finishMatVendor, state.finishMatItem)
  const finishMat = fin && fin.coverage > 0 ? Math.ceil(finMatSF / fin.coverage) * fin.price : 0

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
    finishMat +
    manMat
  const laborCost = totalHrs * lrph
  const burden = laborCost * n(laborBurdenPct)
  const gp = manDays * n(gpmd)
  const commission = gp * n(commissionRate)
  const subCost = finishSubCost + manSub
  const price = totalMat + laborCost + burden + gp + commission + subCost

  return {
    unpriced: R.unpricedList,
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
    handMixUpliftPct,
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
    finishMat,
    sealerCoats,
    // Per-section resolved catalog unit price/coverage (display convenience).
    sealerUnitPrice: seal ? seal.price : 0,
    sealerCoverage: seal ? seal.coverage : 0,
    vaporUnitPrice: vap ? vap.price : 0,
    finishMatUnitPrice: fin ? fin.price : 0,
    finishMatCoverage: fin ? fin.coverage : 0,
    finishSubCost,
    // Resolved rates — exposed so the inline calculator icons can show + edit them
    concreteSFPerHr,
    rebarSFPerHr,
    rebarSFPerHrBySpacing,
    formLFPerHr,
    sleeveLFPerHr,
    sealerNaturalSFPerHr,
    sealerWetSFPerHr,
    vaporBarrierSFPerHr,
    concretePerCY,
    rebarPerLF,
    rebarLfPerSf,
    rebarLfPerSfBySpacing,
    formMaterialPerLF,
    sleevePer10LF,
    colorCostPerCY,
    costBase,
    pumpFeeFlat,
    pumpFeePerCY,
    sandFinishPer400SF,
    stampSubFlat,
    stampSubPerCY,
    sandFinishSFPerHr,
    saltFinishSFPerHr,
    stampedSFPerHr,
    exposedAggSFPerHr,
    seededAggSFPerHr,
    pumpAuto,
  }
}
