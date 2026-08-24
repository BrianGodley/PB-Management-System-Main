// Pure Steps calc — extracted from StepsModule.jsx so the math is unit-testable without
// React/Supabase. Logic identical. calcWalkAccessLabor (lib/walkAccess) and the catalog
// resolvers catalogOptions/catalogItemFor (lib/materialCatalog) both transitively import
// supabase, so their pure bodies are inlined here and kept in sync.
import { LAB } from '../../lib/laborRefs.js'
import { makeModuleRates } from '../../lib/moduleRates.js'
const n = v => parseFloat(v) || 0
const DEFAULT_WALK_ACCESS_PACE_LF_PER_MIN = 60
const isStandardSel = v => !v || v === 'Standard'
const num = v => { const x = typeof v === 'number' ? v : parseFloat(v); return Number.isFinite(x) ? x : 0 }
// One-picker scheme (matches Concrete/Turf): Standard sources the null-vendor catalog rows.
const CATALOG_OPTS = { standardRows: 'null-vendor', stripPrefix: true }

function calcWalkAccessLabor(laborSubtotalHrs, distanceLF, opts = {}) {
  const hrs = n(laborSubtotalHrs); const lf = n(distanceLF)
  const pace = n(opts.paceLfPerMin) || DEFAULT_WALK_ACCESS_PACE_LF_PER_MIN
  if (hrs <= 0 || lf <= 0 || pace <= 0) return 0
  return ((hrs / 8) * (lf * 2)) / pace
}
function catalogOptions(materialRows, subcategory, vendorSel, { standardRows = 'exclude', stripPrefix = false, category = null } = {}) {
  const isStandard = isStandardSel(vendorSel) || vendorSel === 'Custom'
  if (isStandard && standardRows === 'exclude') return []
  const prefix = `${subcategory} - `
  return (materialRows || [])
    .filter(r => r.sub_category === subcategory && (!category || r.category === category) && (isStandard ? r.vendor_id == null : r.vendor_id === vendorSel))
    .map(r => {
      const label = stripPrefix && r.name && r.name.startsWith(prefix) ? r.name.slice(prefix.length) : r.name
      return { id: r.id, value: r.id, ref_key: r.ref_key || null, label, stored: label, row: r }
    })
}
function catalogItemFor(materialRows, subcategory, vendorSel, key, opts = {}) {
  const { fallbackFirst = true, ...rest } = opts
  const options = catalogOptions(materialRows, subcategory, vendorSel, rest)
  if (!options.length) return null
  if (!key) return fallbackFirst ? options[0].row : null
  const byRef = options.find(o => o.ref_key && o.ref_key === key)
  if (byRef) return byRef.row
  const byId = options.find(o => o.id === key)
  if (byId) return byId.row
  const byLabel = options.find(o => o.stored === key || o.label === key)
  if (byLabel) return byLabel.row
  return fallbackFirst ? options[0].row : null
}

// ── Module const/helper block (carried verbatim; rate-key funcs + row calculators) ──
const PAVER_STEP_CAT = 'Paver Material' // shared Paver catalog sub_category
const CONC_VENDOR_CAT = 'Concrete Mix' // catalog sub_category for concrete vendors
const STEP_FORMS = ['Straight', 'Curved']
const CONC_TYPES = ['Standard', 'Standard Colored', 'Cantilevered', 'Cantilevered Colored']
// Colored only affects material, not labor — so LABOR is keyed by the base type
// (Standard / Cantilevered). This keeps the View Rates labor list free of the
// duplicate "… Colored Labor" lines.
const CONC_BASE_TYPES = ['Standard', 'Cantilevered']
const concBaseType = t => (t || '').replace(/\s*Colored$/i, '')
const CONC_FINISHES = ['Smooth', 'Broom', 'Sanded', 'Salted', 'Exposed Aggregate']

// ── Rate-key builders (category 'Steps') ─────────────────────────────────────
// LABOR keys resolve to stable ref_keys (labor ID refactor) — the enum value the
// user picks maps to a frozen LAB-NNN code, so a labor rate can be renamed in
// Master Rates without breaking pricing. Unknown enum → '' (resolves 0, no fallback).
const STEP_FORM_REF = { Straight: LAB.STEPS_FORM_STRAIGHT, Curved: LAB.STEPS_FORM_CURVED }
const CONC_TYPE_HRS_REF = { Standard: LAB.STEPS_CONC_STANDARD_HRS, Cantilevered: LAB.STEPS_CONC_CANTILEVERED_HRS }
const FINISH_HRS_REF = {
  Smooth: LAB.STEPS_FINISH_SMOOTH_HRS, Broom: LAB.STEPS_FINISH_BROOM_HRS,
  Sanded: LAB.STEPS_FINISH_SANDED_HRS, Salted: LAB.STEPS_FINISH_SALTED_HRS,
  'Exposed Aggregate': LAB.STEPS_FINISH_EXPOSED_HRS,
}
const CONC_FORM_REF = { Straight: LAB.STEPS_CONC_FORM_STRAIGHT, Curved: LAB.STEPS_CONC_FORM_CURVED }
const kPaverForm = form => STEP_FORM_REF[form] || '' // labor hrs per Ln Ft
const kConcTypeHrs = t => CONC_TYPE_HRS_REF[t] || '' // labor hrs per Sq Ft (base type)
const kConcTypeMat = t => `Steps - Conc ${t} $ per Sq Ft` // material $ per Sq Ft
const kFinishHrs = f => FINISH_HRS_REF[f] || '' // labor +hrs per Sq Ft
const kFinishMat = f => `Steps - Finish ${f} $ per Sq Ft` // material +$ per Sq Ft
const kConcForm = form => CONC_FORM_REF[form] || '' // labor multiplier

// Subcontractor pricing is UNIT priced per linear foot — no hourly labor. A
// base $/LF for paver + concrete steps, plus per-LF modifiers that add to the
// base. All stored in material_rates (category 'Steps').
const kSubPaverBase = 'Steps - Sub Paver Base' // $/LF
const kSubConcBase = 'Steps - Sub Conc Base' // $/LF
const kSubForm = form => `Steps - Sub Form ${form}` // +$ per Ln Ft
const kSubGrouted = 'Steps - Sub Grouted' // +$/LF (paver, when grouted)
const kSubType = t => `Steps - Sub Type ${t}` // +$ per Ln Ft (concrete type)
const kSubFinish = f => `Steps - Sub Finish ${f}` // +$ per Ln Ft (concrete finish)

// No hardcoded rate fallbacks — every labor coefficient / $/LF base is read live
// from the rate tables (labor_rates + misc_rates via fetchStandardRateMap). A
// missing rate contributes 0 until seeded in Master Rates.

// Vendor/Type step sections. Each pulls Type options from its own material
// catalog sub_category (subs_vendors + material_rates). Shape mirrors Paver
// Steps: Vendor · Type · Form · SF · Grouted?.
const MAT_SECTIONS = [
  { key: 'paver', title: 'Paver Steps', matWord: 'Paver', cat: 'Paver Material', rowsKey: 'paverRows', subKey: 'subPaverRows', baseKey: kSubPaverBase },
  { key: 'brick', title: 'Brick Steps', matWord: 'Brick', cat: 'Brick', rowsKey: 'brickRows', subKey: 'subBrickRows', baseKey: 'Steps - Sub Brick Base' },
  { key: 'tile', title: 'Tiled Steps', matWord: 'Tile', cat: 'Tile', rowsKey: 'tileRows', subKey: 'subTileRows', baseKey: 'Steps - Sub Tile Base' },
  { key: 'flag', title: 'Flagstone Steps', matWord: 'Flagstone', cat: 'Flagstone', rowsKey: 'flagRows', subKey: 'subFlagRows', baseKey: 'Steps - Sub Flagstone Base' },
]

// ── Vendor-catalog helpers (mirror ConcreteModule.sectionOptions) ────────────
// Vendor-first: an unset vendor yields no options (empty placeholder); an
// explicit 'Standard' sources the null-vendor catalog rows; a real vendor its
// own. Options + price both come from the same catalog record — no name fallback.
function paverOptions(cat, vendorSel, materialRows) {
  if (!vendorSel || vendorSel === 'auto') return []
  const isStd = vendorSel === 'Standard'
  return catalogOptions(materialRows, cat, isStd ? 'Standard' : vendorSel, CATALOG_OPTS)
}
function paverItemFor(cat, vendorSel, typeLabel, materialRows) {
  if (!vendorSel || vendorSel === 'auto') return null
  const isStd = vendorSel === 'Standard'
  return catalogItemFor(materialRows, cat, isStd ? 'Standard' : vendorSel, typeLabel, CATALOG_OPTS)
}

// ── Per-row calculators ──────────────────────────────────────────────────────
// Shared by every Vendor/Type step section (Paver/Brick/Tile/Flagstone); `cat`
// selects which material catalog sub_category the Type options come from.
function matStepRowCalc(r, laborRates, materialRows, cat = PAVER_STEP_CAT, priceOf = item => n(item?.unit_cost), R = null) {
  // Unselected step (no material Type) contributes nothing (no crash, no fallback).
  if (!r.type) return { sf: n(r.sf), hrs: 0, mat: 0, price: 0, pallets: 0 }
  const sf = n(r.sf)
  // hrs-per-unit: rate is hours per Ln Ft (was LF/hr; standardized 2026-08-18).
  // Route through R (guarded by sf) so an unset form-labor rate surfaces in the
  // fix-it banner only for a step row actually entered. Value identical to
  // n(laborRates[ref]); an unknown form → kPaverForm('') = '' → R records nothing.
  const ref = kPaverForm(r.form)
  const rate =
    sf > 0
      ? R
        ? R.labor(ref, { category: 'Steps', unit: 'Hrs per Ln Ft', label: 'Step Install — ' + (r.form || '') + ' Form' })
        : n(laborRates[ref])
      : 0
  const hrs = sf * rate
  let price = 0
  let sfPerPallet = 0
  // Standard resolves to the item's null-vendor catalog price; a real vendor to
  // its own. paverItemFor returns null for an unset vendor, so no hidden $0.
  const item = paverItemFor(cat, r.vendor, r.type, materialRows)
  if (item) {
    price = priceOf(item)
    sfPerPallet = n(item.sf_per_pallet)
  }
  const mat = sf * price
  const pallets = sf > 0 && sfPerPallet > 0 ? Math.ceil(sf / sfPerPallet) : 0
  return { sf, hrs, mat, price, pallets }
}

function concRowCalc(r, laborRates, materialRates, R = null) {
  // Unselected concrete step (no Type) contributes nothing (no crash, no fallback).
  if (!r.type) return { lf: n(r.sf), hrs: 0, mat: 0 }
  // Quantity is linear feet; every rate is per Ln Ft. Labor is keyed by the base
  // type (color only changes material), so it stays a single per-type rate.
  const lf = n(r.sf)
  // Type + finish LABOR routed through R (guarded by lf) so an unset rate surfaces
  // only for a concrete step in use. Value identical to n(laborRates[ref]). The
  // form MULTIPLIER stays a plain coefficient (never surfaces).
  const typeRef = kConcTypeHrs(concBaseType(r.type))
  const finishRef = kFinishHrs(r.finish)
  const typeHrs =
    lf > 0
      ? R
        ? R.labor(typeRef, { category: 'Steps', unit: 'Hrs per Ln Ft', label: 'Concrete Step — ' + concBaseType(r.type) })
        : n(laborRates[typeRef])
      : 0
  const finishHrs =
    lf > 0
      ? R
        ? R.labor(finishRef, { category: 'Steps', unit: 'Hrs per Ln Ft', label: 'Concrete Finish — ' + (r.finish || '') })
        : n(laborRates[finishRef])
      : 0
  const formMult = n(laborRates[kConcForm(r.form)])
  const hrs = lf * (typeHrs + finishHrs) * formMult
  const typeMat = n(materialRates[kConcTypeMat(r.type)])
  const finishMat = n(materialRates[kFinishMat(r.finish)])
  const mat = lf * (typeMat + finishMat)
  return { lf, hrs, mat }
}

// Sub rows are unit priced per LF: rate = base + applicable per-LF modifiers.
// On the Sub tab the row quantity field represents linear feet.
function matStepSubRowCalc(r, mr, baseKey = kSubPaverBase) {
  // Unselected step (no material Type) contributes nothing.
  if (!r.type) return { lf: n(r.sf), rate: 0, cost: 0 }
  const lf = n(r.sf)
  const base = n(mr[baseKey])
  const form = n(mr[kSubForm(r.form)])
  const grouted = r.grouted ? n(mr[kSubGrouted]) : 0
  const rate = base + form + grouted
  return { lf, rate, cost: lf * rate }
}
function concSubRowCalc(r, mr) {
  // Unselected concrete step (no Type) contributes nothing.
  if (!r.type) return { lf: n(r.sf), rate: 0, cost: 0 }
  const lf = n(r.sf)
  const base = n(mr[kSubConcBase])
  const form = n(mr[kSubForm(r.form)])
  const type = n(mr[kSubType(r.type)])
  const finish = n(mr[kSubFinish(r.finish)])
  const rate = base + form + type + finish
  return { lf, rate, cost: lf * rate }
}

export function calcSteps(
  state,
  lrph,
  laborRates,
  materialRates,
  materialRows,
  gpmd,
  walkAccess = null,
  laborBurdenPct,
  subGpMarkupRate,
  commissionRate,
  priceOf = item => n(item?.unit_cost)
) {
  const _pace = parseFloat(walkAccess?.paceLfPerMin) || DEFAULT_WALK_ACCESS_PACE_LF_PER_MIN
  const lr = laborRates || {}
  const mr = materialRates || {}
  // Unpriced-LABOR surfacing (mirrors Concrete): route in-house step labor through
  // one shared reader so an UNSET/0 labor rate becomes a clickable fix-it prompt
  // instead of a silent $0. R.labor returns the SAME number — no pricing-math
  // change. Sub rows are flat $/LF (never labor), so they never surface.
  const R = makeModuleRates({ material: mr, labor: lr, sub: {}, misc: mr, materialRows })
  const isSub = state.subType === 'Subcontractor'

  const ihConc = state.concRows || []

  // ── Vendor/Type step sections (Paver/Brick/Tile/Flagstone) ───────────────
  // Labor + In-House material from In-House rows; sub cost ($/LF) from Sub rows.
  let laborHrs = 0
  const matSections = MAT_SECTIONS.map(sec => {
    let labor = 0
    let mat = 0
    let pallets = 0
    ;(state[sec.rowsKey] || []).forEach(r => {
      const c = matStepRowCalc(r, lr, materialRows, sec.cat, priceOf, R)
      labor += c.hrs
      mat += c.mat
      pallets += c.pallets
    })
    let subCost = 0
    ;(state[sec.subKey] || []).forEach(r => {
      subCost += matStepSubRowCalc(r, mr, sec.baseKey).cost
    })
    laborHrs += labor
    return { key: sec.key, title: sec.title, mat, pallets, subCost }
  })
  const stepMat = matSections.reduce((s, x) => s + x.mat, 0)
  const pallets = matSections.reduce((s, x) => s + x.pallets, 0)
  const subStepCost = matSections.reduce((s, x) => s + x.subCost, 0)

  // ── Concrete steps ───────────────────────────────────────────────────────
  let concMat = 0
  ihConc.forEach(r => {
    const c = concRowCalc(r, lr, mr, R)
    laborHrs += c.hrs
    concMat += c.mat
  })
  let subConcCost = 0
  ;(state.subConcRows || []).forEach(r => {
    subConcCost += concSubRowCalc(r, mr).cost
  })
  const subRowCost = subStepCost + subConcCost

  // ── Manual entry ─────────────────────────────────────────────────────────
  const ihManual = state.manualRows || []
  let manHrs = 0
  ihManual.forEach(r => {
    manHrs += n(r.hours)
  })
  const manMat = ihManual.reduce((s, r) => s + n(r.materials), 0)
  const manSub = [...(state.manualRows || []), ...(state.subManualRows || [])].reduce(
    (s, r) => s + n(r.subCost),
    0
  )

  const baseHrs = laborHrs + manHrs
  const diffMod = 1 + n(state.difficulty) / 100
  const _preWalkHrs = baseHrs * diffMod + n(state.hoursAdj)
  const walkHrs = calcWalkAccessLabor(_preWalkHrs, state.distanceLF, { paceLfPerMin: _pace })
  const totalHrs = _preWalkHrs + walkHrs
  const manDays = totalHrs / 8
  // In-House material (hourly model). Sub steps are bundled into the flat
  // per-LF sub price, so they never contribute to material.
  const totalMat = stepMat + concMat + manMat

  const laborCost = totalHrs * n(lrph)
  const burden = laborCost * n(laborBurdenPct)
  const gp = manDays * gpmd
  const subCost = subRowCost + manSub
  const subGp = subCost * subGpMarkupRate
  const commission = (gp + subGp) * n(commissionRate)
  const price = totalMat + laborCost + burden + gp + subCost + subGp + commission

  return {
    // Unpriced LABOR fix-it list (additive surfacing). In-house step labor is
    // always part of the bid (both sides are summed), so it surfaces on either
    // tab; sub rows are flat $/LF and never contribute labor.
    unpriced: R.unpricedList,
    walkHrs,
    totalHrs,
    manDays,
    totalMat,
    laborCost,
    burden,
    gp,
    subGp,
    commission,
    subCost,
    matSections,
    stepMat,
    subStepCost,
    subConcCost,
    subRowCost,
    manSub,
    price,
    concMat,
    manMat,
    pallets,
    isSub,
  }
}
