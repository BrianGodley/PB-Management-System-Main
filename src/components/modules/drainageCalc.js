// Pure Drainage calc — extracted from DrainageModule.jsx so the math is unit-testable
// without React/Supabase. Logic identical. The catalog helpers + calcWalkAccessLabor
// (whose libs import supabase) are inlined here, kept in sync with lib/materialCatalog +
// lib/walkAccess. The module's own type/rate maps + drainMatCost/masterDrainTypes are
// carried below (they only need the inlined catalog fns).
import { BAS } from '../../lib/basicLaborRefs.js'
import { MAT } from '../../lib/materialRefs.js'
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
function calcWalkAccessLabor(laborSubtotalHrs, distanceLF, opts = {}) {
  const hrs = n(laborSubtotalHrs); const lf = n(distanceLF)
  const pace = n(opts.paceLfPerMin) || DEFAULT_WALK_ACCESS_PACE_LF_PER_MIN
  if (hrs <= 0 || lf <= 0 || pace <= 0) return 0
  return ((hrs / 8) * (lf * 2)) / pace
}
// ── Module const/helper block (type maps, rate names, drainMatCost, etc.) ──
const CATALOG_OPTS = { standardRows: 'null-vendor', stripPrefix: true }

// ─────────────────────────────────────────────────────────────────────────────
// Drainage Module — fields and calculations from Excel estimator
// Material prices are fetched live from material_rates (category='Drainage')
// so changes in Master Rates are reflected here automatically.
// ─────────────────────────────────────────────────────────────────────────────

// dbName must match the name column in material_rates exactly. These maps carry
// ONLY the item identity (dbName); every price/coefficient is read live from the
// rate tables (material_price / labor_rates / misc_rates) — no hardcoded values.
// Solid Drain Pipe types (perforated types live in FRENCH_PIPE_TYPES below).
const PIPE_TYPES = {
  '4" SDR 35': { dbName: '4" SDR 35 Pipe' },
  '3" SDR 35': { dbName: '3" SDR 35 Pipe' },
  '6" SDR 35': { dbName: '6" SDR 35 Pipe' },
  '4" Triple Wall': { dbName: '4" Triple Wall Pipe' },
  '3" Triple Wall': { dbName: '3" Triple Wall Pipe' },
}

// French Drain pipe types — perforated pipe, same shape as PIPE_TYPES.
const FRENCH_PIPE_TYPES = {
  '4" Perforated': { dbName: '4" Perforated Pipe' },
  '3" Perforated': { dbName: '3" Perforated Pipe' },
}

const FIXTURE_TYPES = {
  '3" Area Drain': { dbName: '3" Area Drain' },
  '4" Area Drain': { dbName: '4" Area Drain' },
  '3" Atrium Drain': { dbName: '3" Atrium Drain' },
  '4" Atrium Drain': { dbName: '4" Atrium Drain' },
  '4" Brass Area Drain': { dbName: '4" Brass Area Drain' },
  '3" Brass Area Drain': { dbName: '3" Brass Area Drain' },
  'Downspout Connector': { dbName: 'Downspout Connector' },
  '4" Paver Top Inlet': { dbName: '4" Paver Top Inlet' },
  '9" x 9" Catch Basin': { dbName: '9" x 9" Catch Basin' },
  '12" x 12" Catch Basin': { dbName: '12" x 12" Catch Basin' },
  '24" x 24" Catch Basin': { dbName: '24" x 24" Catch Basin' },
}

// ── Labor-coefficient lookup maps ─────────────────────────────────────────
// Each entry points the inline calculator icon at a row in `labor_rates`
// (seeded by supabase-drainage-labor-coefficients.sql). Click the icon →
// popover fetches that coefficient, user adjusts it. The seed names match
// these exactly.
const TRENCH_LABOR_RATE_NAME = {
  Trench: 'Drainage Trench Excavation',
  Hand: 'Drainage Hand Excavation',
}
const PIPE_LABOR_RATE_NAME = {
  '4" SDR 35': 'Drainage 4" SDR 35 Pipe Labor',
  '3" SDR 35': 'Drainage 3" SDR 35 Pipe Labor',
  '6" SDR 35': 'Drainage 6" SDR 35 Pipe Labor',
  '4" Triple Wall': 'Drainage 4" Triple Wall Pipe Labor',
  '3" Triple Wall': 'Drainage 3" Triple Wall Pipe Labor',
}
const FRENCH_PIPE_LABOR_RATE_NAME = {
  '4" Perforated': 'Drainage 4" Perforated Pipe Labor',
  '3" Perforated': 'Drainage 3" Perforated Pipe Labor',
}
const FIXTURE_LABOR_RATE_NAME = {
  '3" Area Drain': 'Drainage 3" Area Drain Labor',
  '4" Area Drain': 'Drainage 4" Area Drain Labor',
  '3" Atrium Drain': 'Drainage 3" Atrium Drain Labor',
  '4" Atrium Drain': 'Drainage 4" Atrium Drain Labor',
  '4" Brass Area Drain': 'Drainage 4" Brass Area Drain Labor',
  '3" Brass Area Drain': 'Drainage 3" Brass Area Drain Labor',
  'Downspout Connector': 'Drainage Downspout Connector Labor',
  '4" Paver Top Inlet': 'Drainage 4" Paver Top Inlet Labor',
  '9" x 9" Catch Basin': 'Drainage 9" x 9" Catch Basin Labor',
  '12" x 12" Catch Basin': 'Drainage 12" x 12" Catch Basin Labor',
  '24" x 24" Catch Basin': 'Drainage 24" x 24" Catch Basin Labor',
}

// Additional items — identity only. Labor hours come from labor_rates
// (ADD_ITEM_LABOR_RATE_NAME) and material cost from materialPrices[dbName].
const ADD_ITEM_RATES = {
  sumpPump: { label: 'Sump Pump', dbName: 'Sump Pump', ref: MAT.SUMP_PUMP },
  // Curb Core / Hydrocut are pure labor now (2 hrs each) — no material fee.
  curbCore: { label: 'Curb Core', dbName: 'Curb Core', laborOnly: true },
  hydrocut: { label: 'Hydrocut Under Hardscape', dbName: 'Hydrocut Under Hardscape', laborOnly: true },
}

// Labor-coefficient lookup for Additional Items — matches names seeded in
// supabase-drainage-labor-coefficients.sql so the popover edits the right row.
const ADD_ITEM_LABOR_RATE_NAME = {
  sumpPump: 'Drainage Sump Pump Labor',
  // Curb Core labor is a SHARED Basic Labor rate (Hrs per Each) read by every
  // module that cores a curb — Drainage + Utilities. One row, one source.
  curbCore: BAS.CURB_CORE,
  hydrocut: 'Drainage Hydrocut Under Hardscape Labor',
}


// French-drain fabric + gravel-bed rates ($/ft), stored in misc_rates
// (category 'Drainage'). Read live from materialPrices[name] — no fallback.
// Applied to TOTAL French-drain LF.
const FRENCH_SOCK_MAT_NAME = 'Drainage Drain Sock Material'
const FRENCH_SOCK_LABOR_NAME = 'Drainage Drain Sock Labor'
const FRENCH_BURRITO_MAT_NAME = 'Drainage Burrito Wrap Material'
const FRENCH_BURRITO_LABOR_NAME = 'Drainage Burrito Wrap Labor'
const FRENCH_GRAVEL12_MAT_NAME = 'Drainage Gravel Bed 12in Material'
const FRENCH_GRAVEL12_LABOR_NAME = 'Drainage Gravel Bed 12in Labor'
const FRENCH_GRAVEL24_MAT_NAME = 'Drainage Gravel Bed 24in Material'
const FRENCH_GRAVEL24_LABOR_NAME = 'Drainage Gravel Bed 24in Labor'
// Read live from the rate map only — no hardcoded fallback.
const frenchRate = (mp, name) => n(mp[name])


// ── Helpers ───────────────────────────────────────────────────────────────────

// ── Vendor catalog: material-only overrides for Drain Pipe / Drain Fixtures ──
// The Type still sets the item's labor (per-type coefficient, unchanged) AND its
// Standard material price. A vendor only overrides the MATERIAL price for the same
// item (matched by name in the vendor's catalog); it never affects labor.
const DRAIN_CAT = { pipe: 'Drain Pipe', french: 'French Drain Pipe', fixture: 'Drain Fixtures' }
function drainMatCost(cat, row, TYPES, materialRows, catDefaults, mp) {
  const t = TYPES[row.type]
  let dbName = t?.dbName
  const vsel = row.vendor && row.vendor !== 'auto' ? row.vendor : catDefaults[cat] || 'Standard'
  const vrow = catalogItemFor(materialRows, cat, vsel, row.type, {
    ...CATALOG_OPTS,
    fallbackFirst: false,
  })
  if (vrow) dbName = vrow.name
  // One record, one price: the selected vendor's catalog row (or Standard's
  // null-vendor row) sets the price. `mp[dbName]` is only a last resort for a
  // type with no catalog record at all — it's the same category rate map, so it
  // never diverges from the record. No hardcoded fallback; a truly unpriced item
  // contributes $0. `row` is returned so the calc reads the item's own labor
  // pointer (calc_meta.labor_rate) rather than a hardcoded type→name map.
  return { dbName, cost: vrow ? n(vrow.unit_cost) : n(mp[dbName]), row: vrow }
}

// Master-list additions for a drain section: rows tagged sub_category=cat
// (Unspecified) become extra Type options. Material price = the row's unit_cost;
// labor comes from calc_meta (laborPerLF for pipe, laborHrs for fixtures). Add a
// row in Master Rates under that marker + set its calc_meta and it appears here.
function masterDrainTypes(cat, builtIn, materialRows, laborField) {
  const out = {}
  ;(catalogOptions(materialRows, cat, 'Standard', { standardRows: 'null-vendor', stripPrefix: true }) || []).forEach(
    o => {
      if (builtIn[o.label]) return
      const meta = o.row.calc_meta || {}
      out[o.label] = {
        dbName: o.row.name,
        costPerLF: n(o.row.unit_cost),
        cost: n(o.row.unit_cost),
        [laborField]: n(meta[laborField]) || 0,
        fromMaster: true,
      }
    }
  )
  return out
}

// Vendor-first Type OPTION list for a Drain Pipe / Fixtures row (mirrors
// Utilities' mergedUtilTypes). Options come ONLY from the catalog: 'Standard'/
// 'auto' → the Standard (null-vendor) catalog Items for the sub-category; a real
// vendor → only that vendor's catalog Items (nothing if they carry none). No
// built-in types are added to the option list — an unseeded sub-category shows an
// empty picker. The selected type still resolves its price/labor through
// PIPE_T/FIX_T + drainMatCost, which already applies the vendor's price by name.
function drainTypeOptions(cat, builtIn, materialRows, vendorSel) {
  // Unset vendor → empty Type list (only the row's own "Select …" placeholder);
  // pick a vendor first.
  if (!vendorSel) return []
  const isStd = vendorSel === 'Standard' || vendorSel === 'auto'
  const catRows =
    catalogOptions(materialRows, cat, isStd ? 'Standard' : vendorSel, {
      standardRows: 'null-vendor',
      stripPrefix: true,
    }) || []
  // Option VALUE is the item's frozen ref_key (a converted picker stores it);
  // LABEL is the live description. Rename-proof + survives a picker save.
  return catRows.map(o => ({ value: o.ref_key || o.label, label: o.label }))
}

// materialPrices — { 'dbName': unit_cost, ... } fetched from material_rates

export function calcDrainage(
  state,
  laborRatePerHour = null,
  materialPrices = {},
  gpmd = null,
  walkAccess = null,
  laborBurdenPct = null,
  subRates = {},
  subMarkupRate = null,
  materialRows = [],
  catDefaults = {},
  commissionRate = null
) {
  const _pace = parseFloat(walkAccess?.paceLfPerMin) || 0
  const {
    difficulty,
    hoursAdj,
    trenchRows,
    pipeRows,
    fixtureRows,
    additionalItems,
    manualRows,
    subTrenchRows,
    subFixtureRows,
    subAdditionalItems,
    frenchRows = [],
    frenchFabric = 'None',
    frenchGravel = 'None',
  } = state
  const isSub = state.subType === 'Subcontractor'
  const PIPE_T = { ...PIPE_TYPES, ...masterDrainTypes(DRAIN_CAT.pipe, PIPE_TYPES, materialRows, 'laborPerLF') }
  const FIX_T = { ...FIXTURE_TYPES, ...masterDrainTypes(DRAIN_CAT.fixture, FIXTURE_TYPES, materialRows, 'laborHrs') }
  const FRENCH_PIPE_T = { ...FRENCH_PIPE_TYPES, ...masterDrainTypes(DRAIN_CAT.french, FRENCH_PIPE_TYPES, materialRows, 'laborPerLF') }

  let trenchHrs = 0,
    pipeHrs = 0,
    pipeMat = 0
  let fixHrs = 0,
    fixMat = 0
  // Items whose selected material has no usable labor rate (unset or 0). Surfaced
  // as a prompt in the UI — NO hidden fallback substitutes a rate.
  const laborUnset = []
  let manHrs = 0,
    manMat = 0,
    manSub = 0

  trenchRows.forEach(r => {
    const lf = n(r.lf),
      w = n(r.width),
      d = n(r.depth)
    if (lf > 0 && w > 0 && d > 0) {
      const cf = lf * (w / 12) * (d / 12)
      const hrsPerCf = n(materialPrices[TRENCH_LABOR_RATE_NAME[r.equipment]])
      trenchHrs += cf * hrsPerCf
    }
  })

  pipeRows.forEach(r => {
    const lf = n(r.lf)
    // Gate on the selection itself (not membership in the built-in map) so a
    // vendor-only catalog item still prices through drainMatCost.
    if (lf > 0 && (r.type || r.laborType)) {
      const meta = PIPE_T[r.type] || {}
      const { cost, row: vrow } = drainMatCost(DRAIN_CAT.pipe, r, PIPE_T, materialRows, catDefaults, materialPrices)
      pipeMat += lf * cost
      // Labor is chosen independently: the row's own Labor pick wins; otherwise the
      // material item's default (calc_meta.labor_rate); then the legacy map/coefficient.
      const laborName = r.laborType || vrow?.calc_meta?.labor_rate
      const laborRate = n(materialPrices[laborName])
      if (r.type && laborRate <= 0) laborUnset.push({ kind: 'labor', name: laborName, label: vrow?.name || r.type, category: 'Drainage', unit: null })
      pipeHrs += lf * laborRate
    }
  })

  // ── French Drains ────────────────────────────────────────────────────────
  // Perforated pipe (same math as solid pipe) + section-level fabric wrap and
  // gravel bed priced $/ft on the TOTAL French-drain linear feet. Fabric/gravel
  // labor rates are hrs per Ln Ft (matches Walls) — hours = rate × LF.
  let frenchMat = 0,
    frenchHrs = 0
  ;(frenchRows || []).forEach(r => {
    const lf = n(r.lf)
    if (lf > 0 && (r.type || r.laborType)) {
      const meta = FRENCH_PIPE_T[r.type] || {}
      const { cost, row: vrow } = drainMatCost(
        DRAIN_CAT.french,
        r,
        FRENCH_PIPE_T,
        materialRows,
        catDefaults,
        materialPrices
      )
      frenchMat += lf * cost
      // Labor chosen independently: row pick → item default → legacy.
      const laborName = r.laborType || vrow?.calc_meta?.labor_rate
      const laborRate = n(materialPrices[laborName])
      if (r.type && laborRate <= 0) laborUnset.push({ kind: 'labor', name: laborName, label: vrow?.name || r.type, category: 'Drainage', unit: null })
      frenchHrs += lf * laborRate
    }
  })
  const totalFrenchLF = (frenchRows || []).reduce((s, r) => s + n(r.lf), 0)

  const fabricMatPerFt =
    frenchFabric === 'Drain Sock'
      ? frenchRate(materialPrices, FRENCH_SOCK_MAT_NAME)
      : frenchFabric === 'Burrito Wrap'
        ? frenchRate(materialPrices, FRENCH_BURRITO_MAT_NAME)
        : 0
  const fabricLaborPerFt =
    frenchFabric === 'Drain Sock'
      ? frenchRate(materialPrices, FRENCH_SOCK_LABOR_NAME)
      : frenchFabric === 'Burrito Wrap'
        ? frenchRate(materialPrices, FRENCH_BURRITO_LABOR_NAME)
        : 0
  const gravelMatPerFt =
    frenchGravel === '12"'
      ? frenchRate(materialPrices, FRENCH_GRAVEL12_MAT_NAME)
      : frenchGravel === '24"'
        ? frenchRate(materialPrices, FRENCH_GRAVEL24_MAT_NAME)
        : 0
  const gravelLaborPerFt =
    frenchGravel === '12"'
      ? frenchRate(materialPrices, FRENCH_GRAVEL12_LABOR_NAME)
      : frenchGravel === '24"'
        ? frenchRate(materialPrices, FRENCH_GRAVEL24_LABOR_NAME)
        : 0

  frenchMat += totalFrenchLF * fabricMatPerFt + totalFrenchLF * gravelMatPerFt
  frenchHrs += fabricLaborPerFt * totalFrenchLF
  frenchHrs += gravelLaborPerFt * totalFrenchLF

  let totalFixQty = 0
  fixtureRows.forEach(r => {
    const qty = n(r.qty)
    if (qty > 0 && (r.type || r.laborType)) {
      const meta = FIX_T[r.type] || {}
      const { cost, row: vrow } = drainMatCost(DRAIN_CAT.fixture, r, FIX_T, materialRows, catDefaults, materialPrices)
      fixMat += qty * cost
      // Labor chosen independently: row pick → item default → legacy.
      const laborName = r.laborType || vrow?.calc_meta?.labor_rate
      const laborRate = n(materialPrices[laborName])
      if (r.type && laborRate <= 0) laborUnset.push({ kind: 'labor', name: laborName, label: vrow?.name || r.type, category: 'Drainage', unit: null })
      fixHrs += qty * laborRate
      totalFixQty += qty
    }
  })

  let addHrs = 0,
    addMat = 0
  Object.entries(ADD_ITEM_RATES).forEach(([key, rate]) => {
    const qty = n(additionalItems[`${key}Qty`])
    if (qty > 0) {
      addHrs += qty * n(materialPrices[ADD_ITEM_LABOR_RATE_NAME[key]])
      if (!rate.laborOnly) addMat += qty * n(materialPrices[rate.ref] ?? materialPrices[rate.dbName])
    }
  })

  manualRows.forEach(r => {
    manHrs += n(r.hours)
    manMat += n(r.materials)
    manSub += n(r.subCost)
  })

  // Subcontractor: trenching + drain pipe collapse into ONE fixed price per
  // linear foot of trench run (default $16/LF). Their in-house labour/material
  // is replaced by that sub cost.
  // Sub side is independent of In-House now: its own trench-run LF list, priced
  // at the fixed $/LF. In-House always computes its own labour/material.
  const subRatePerLF = n(subRates['Drainage Sub - Per LF'])
  const subLf = (subTrenchRows || []).reduce((sum, r) => sum + n(r.lf), 0)
  const subDrainCost = subLf * subRatePerLF

  // Sub tab's own flat-priced Drain Fixtures + Additional Items — independent
  // of the In-House hourly sections. Each rate is a fixed sub cost.
  const subFixtureFlat = n(subRates['Drainage Sub - Fixture Flat'])
  const subSumpPumpRate = n(subRates['Drainage Sub - Sump Pump'])
  const subCurbCoreRate = n(subRates['Drainage Sub - Curb Core'])
  const subHydrocutRate = n(subRates['Drainage Sub - Hydrocut Per LF'])
  const subFixQty = (subFixtureRows || []).reduce((s, r) => s + n(r.qty), 0)
  const subFixtureCost = subFixQty * subFixtureFlat
  const sa = subAdditionalItems || {}
  const subAdditionalCost =
    n(sa.sumpPumpQty) * subSumpPumpRate +
    n(sa.curbCoreQty) * subCurbCoreRate +
    n(sa.hydrocutLF) * subHydrocutRate

  const baseHrs = (isSub ? 0 : trenchHrs + pipeHrs + fixHrs + addHrs + frenchHrs) + manHrs
  const diffMod = 1 + n(difficulty) / 100
  const _preWalkHrs = baseHrs * diffMod + (parseFloat(hoursAdj) || 0)
  const walkHrs = calcWalkAccessLabor(_preWalkHrs, state.distanceLF, { paceLfPerMin: _pace })
  const totalHrs = _preWalkHrs + walkHrs
  const manDays = totalHrs / 8
  const totalMat = (isSub ? 0 : pipeMat + fixMat + addMat + frenchMat) + manMat
  const laborCost = totalHrs * laborRatePerHour
  const burden = laborCost * n(laborBurdenPct)
  const subCost = manSub + subDrainCost + (isSub ? subFixtureCost + subAdditionalCost : 0)
  // Sub work earns a markup (gross profit on subcontracted cost), matching the
  // GPMD bar, so the saved total includes it.
  const subGp = subCost * (subMarkupRate || 0)
  const gp = manDays * gpmd // in-house GP only; bar adds Sub GP once
  const commission = (gp + subGp) * n(commissionRate)
  const price = totalMat + laborCost + burden + gp + subGp + commission + subCost

  return {
    totalHrs,
    manDays,
    laborUnset: (() => {
      const seen = new Set()
      return laborUnset.filter(u => {
        const k = u && (u.name || u.label)
        if (!k || seen.has(k)) return false
        seen.add(k)
        return true
      })
    })(),
    subRatePerLF,
    subLf,
    subDrainCost,
    subFixtureFlat,
    subFixtureCost,
    subFixQty,
    subSumpPumpRate,
    subCurbCoreRate,
    subHydrocutRate,
    subAdditionalCost,
    totalMat,
    laborCost,
    burden,
    gp,
    subGp,
    commission,
    subCost,
    price,
    walkHrs,
    addHrs,
    addMat,
    frenchMat,
    frenchHrs,
    totalFrenchLF,
  }
}
