// Pure Utilities calc — extracted from UtilitiesModule.jsx so the math is unit-testable
// without React/Supabase. Logic identical. trench.js (the shared "King" trench calc)
// is pure and imported; the catalog helpers + resolveUtilRow/mergedUtilTypes (whose lib
// imports supabase) are inlined here, kept in sync with lib/materialCatalog + lib/utilRow.
import { trenchHours, trenchRowHrs, TRENCH_LABOR_RATE_NAME } from '../../lib/trench.js'
import { BAS } from '../../lib/basicLaborRefs.js'

const n = v => { const x = typeof v === 'number' ? v : parseFloat(v); return Number.isFinite(x) ? x : 0 }
const DEFAULT_WALK_ACCESS_PACE_LF_PER_MIN = 60
const isStandardSel = v => !v || v === 'Standard'
const CATALOG_OPTS = { standardRows: 'null-vendor', stripPrefix: true }

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
function mergedUtilTypes(cat, builtInArr, materialRows, vendorSel = 'Standard', opts = {}) {
  const isStd = !vendorSel || vendorSel === 'Standard' || vendorSel === 'auto'
  const catRows = catalogOptions(materialRows, cat, isStd ? 'Standard' : vendorSel, {
    standardRows: 'null-vendor', stripPrefix: true, ...(opts.category ? { category: opts.category } : {}),
  })
  if (!catRows.length) return []
  return catRows.map(o => {
    const bi = (builtInArr || []).find(b => b.dbName === o.row.name || b.label === o.label)
    return {
      label: o.label, ref_key: o.ref_key || o.row?.ref_key || null,
      dbName: o.row.name, matCatalog: n(o.row.unit_cost), catalogPrice: n(o.row.unit_cost),
      laborDbName: o.row.calc_meta?.labor_rate || null, fromMaster: !bi,
    }
  })
}
function resolveUtilRow(cat, row, houseArr, materialRows, mp, opts = {}) {
  const vsel = row.vendor && row.vendor !== 'auto' ? row.vendor : ''
  if (!vsel) return { opts: [], matOpt: { label: row.type, dbName: undefined, matCatalog: 0, fallback: 0 }, matCost: 0, laborVal: 0, laborName: null, laborBuiltIn: null }
  const merged = mergedUtilTypes(cat, houseArr, materialRows, vsel, opts)
  // row.type may be the frozen material ref_key (converted picker) or the legacy label.
  const builtIn = merged.find(o => (o.ref_key && o.ref_key === row.type) || o.label === row.type) || merged[0]
  let matDbName = builtIn?.dbName
  const vrow = catalogItemFor(materialRows, cat, vsel, builtIn?.ref_key || builtIn?.label, { ...CATALOG_OPTS, fallbackFirst: false })
  if (vrow) matDbName = vrow.name
  const laborName = vrow?.calc_meta?.labor_rate || builtIn?.laborDbName || null
  const laborVal = n(mp[laborName])
  const matCatalog = builtIn?.matCatalog ?? 0
  const matCost = vrow ? n(vrow.unit_cost) : mp[matDbName] != null ? n(mp[matDbName]) : matCatalog
  const matOpt = { label: builtIn?.label, ref_key: builtIn?.ref_key || null, dbName: matDbName, matCatalog, fallback: matCatalog }
  return { opts: merged, matOpt, matCost, laborVal, laborName, laborBuiltIn: builtIn }
}
function calcWalkAccessLabor(laborSubtotalHrs, distanceLF, opts = {}) {
  const hrs = n(laborSubtotalHrs); const lf = n(distanceLF)
  const pace = n(opts.paceLfPerMin) || DEFAULT_WALK_ACCESS_PACE_LF_PER_MIN
  if (hrs <= 0 || lf <= 0 || pace <= 0) return 0
  return ((hrs / 8) * (lf * 2)) / pace
}

// ── Built-in type maps + derived arrays + UTIL_CAT (from UtilitiesModule) ──
const UTILITY_LINE_TYPES = {
  'PVC Conduit with Electrical': {
    dbName: 'PVC Conduit with Electrical',
    laborDbName: 'PVC Conduit with Electrical - Labor Rate',
  },
}

// Gas Pipe — poly + black iron gas pipe entries (moved out of UTILITY_LINE_TYPES).
const GAS_PIPE_TYPES = {
  '1-1/2" Poly Gas Pipe': {
    dbName: '1-1/2" Poly Gas Pipe',
    laborDbName: '1-1/2" Poly Gas Pipe - Labor Rate',
  },
  '1" Black Iron Gas Pipe': {
    dbName: '1" Black Iron Gas Pipe',
    laborDbName: '1" Black Iron Gas Pipe - Labor Rate',
  },
  '1-1/2" Black Iron Gas Pipe': {
    dbName: '1-1/2" Black Iron Gas Pipe',
    laborDbName: '1-1/2" Black Iron Gas Pipe - Labor Rate',
  },
  '2" Black Iron Gas Pipe': {
    dbName: '2" Black Iron Gas Pipe',
    laborDbName: '2" Black Iron Gas Pipe - Labor Rate',
  },
}

const GAS_FIXTURE_TYPES = {
  '12" Single Gas Ring': {
    dbName: '12" Single Gas Ring',
    laborDbName: '12" Single Gas Ring - Labor Rate',
  },
  '18" Single Gas Ring': {
    dbName: '18" Single Gas Ring',
    laborDbName: '18" Single Gas Ring - Labor Rate',
  },
  '24" Single Gas Ring': {
    dbName: '24" Single Gas Ring',
    laborDbName: '24" Single Gas Ring - Labor Rate',
  },
  '24" Double Gas Ring': {
    dbName: '24" Double Gas Ring',
    laborDbName: '24" Double Gas Ring - Labor Rate',
  },
  "2' Straight Gas Bar": {
    dbName: "2' Straight Gas Bar",
    laborDbName: "2' Straight Gas Bar - Labor Rate",
  },
  "3' Straight Gas Bar": {
    dbName: "3' Straight Gas Bar",
    laborDbName: "3' Straight Gas Bar - Labor Rate",
  },
  "4' Straight Gas Bar": {
    dbName: "4' Straight Gas Bar",
    laborDbName: "4' Straight Gas Bar - Labor Rate",
  },
  'Gas Shut-Off Valve': {
    dbName: 'Gas Shut-Off Valve',
    laborDbName: 'Gas Shut-Off Valve - Labor Rate',
  },
}

// Electrical fixtures — same table/rate shape as gas, in their own section.
const ELECTRICAL_FIXTURE_TYPES = {
  'Electric Sub-panel': {
    dbName: 'Electric Sub-panel',
    laborDbName: 'Electric Sub-panel - Labor Rate',
  },
  'Electric Disconnect': {
    dbName: 'Electric Disconnect',
    laborDbName: 'Electric Disconnect - Labor Rate',
  },
  'GFCI Protected Receptacles': {
    dbName: 'GFCI Protected Receptacles',
    laborDbName: 'GFCI Protected Receptacles - Labor Rate',
  },
  'Bubble Covers for Receptacles': {
    dbName: 'Bubble Covers for Receptacles',
    laborDbName: 'Bubble Covers for Receptacles - Labor Rate',
  },
  'Infratech W2024SS 2000W 240V Heater (Stainless)': {
    dbName: 'Infratech W2024SS 2000W 240V Heater (Stainless)',
    laborDbName: 'Infratech W2024SS 2000W 240V Heater (Stainless) - Labor Rate',
  },
  'Infratech W39 Flush Mount Frame': {
    dbName: 'Infratech W39 Flush Mount Frame',
    laborDbName: 'Infratech W39 Flush Mount Frame - Labor Rate',
  },
  'Infratech Single Duplex Switch in Surface Mount Gang Box': {
    dbName: 'Infratech Single Duplex Switch in Surface Mount Gang Box',
    laborDbName: 'Infratech Single Duplex Switch in Surface Mount Gang Box - Labor Rate',
  },
}

// Sewer lines — ABS pipe. Trenching uses the module's existing Trenching section.
const SEWER_LINE_TYPES = {
  '3" ABS': {
    dbName: '3" ABS Sewer Pipe',
    laborDbName: '3" ABS Sewer Pipe - Labor Rate',
  },
  '4" ABS': {
    dbName: '4" ABS Sewer Pipe',
    laborDbName: '4" ABS Sewer Pipe - Labor Rate',
  },
}

// Combined lookup so a row of either kind resolves its rate.
const FIXTURE_TYPES = { ...GAS_FIXTURE_TYPES, ...ELECTRICAL_FIXTURE_TYPES }

// TRENCH_LABOR_RATE_NAME + trench math now live in lib/trench (shared with Fire
// Pit; Utilities is the canonical source). Imported above.

const ADD_ITEM_RATES = {
  // In-house electrical: quantity × install hours + material (NOT a sub cost).
  // Identity only — material $ + labor hrs read live from the rate tables.
  // Curb Core / Hydrocut are pure labor now (2 hrs each) — no material fee.
  curbCore: {
    dbName: 'Curb Core',
    label: 'Curb Core',
    // Shared Basic Labor rate (Hrs per Each) — one curb-core labor row for all modules.
    laborDbName: BAS.CURB_CORE,
    laborOnly: true,
  },
  hydrocut: {
    dbName: 'Hydrocut Under Hardscape',
    label: 'Hydrocut Under Hardscape',
    laborDbName: 'Hydrocut Under Hardscape - Labor Rate',
    laborOnly: true,
  },
}

// Company/estimate financial settings (labor rate, burden %, GPMD, commission,
// sub GP markup) are sourced live from company_settings — no hardcoded defaults.


// ── Vendor catalog: built-in Type lists as {label, dbName, laborDbName} ──
// The section's built-in items name the catalog Standard item + its paired labor
// coefficient row. Vendors tagged to the matching material category supply
// additional priced items (material only — labor keeps the built-in's labor row).
// No hardcoded price/labor fallbacks — every value is read live from the tables.
const LINE_TYPE_ARR = Object.entries(UTILITY_LINE_TYPES).map(([label, t]) => ({
  label,
  dbName: t.dbName,
  laborDbName: t.laborDbName,
}))
const GASPIPE_TYPE_ARR = Object.entries(GAS_PIPE_TYPES).map(([label, t]) => ({
  label,
  dbName: t.dbName,
  laborDbName: t.laborDbName,
}))
// Electrical Wiring has NO code built-ins — it's purely catalog-sourced (items
// live only under the 'Electrical Wiring' Sub-category on the Home Depot vendor).
const WIRE_TYPE_ARR = []
const GAS_TYPE_ARR = Object.entries(GAS_FIXTURE_TYPES).map(([label, t]) => ({
  label,
  dbName: t.dbName,
  laborDbName: t.laborDbName,
}))
const ELEC_TYPE_ARR = Object.entries(ELECTRICAL_FIXTURE_TYPES).map(([label, t]) => ({
  label,
  dbName: t.dbName,
  laborDbName: t.laborDbName,
}))
const SEWER_LINE_ARR = Object.entries(SEWER_LINE_TYPES).map(([label, t]) => ({
  label,
  dbName: t.dbName,
  laborDbName: t.laborDbName,
}))
// Section → material category name (used for vendor tagging + catalog lookup).
const UTIL_CAT = {
  line: 'Electrical Pipe',
  gasPipe: 'Gas Pipe',
  wire: 'Electrical Wiring',
  gas: 'Gas Fixtures',
  elec: 'Electrical Fixtures',
  sewerLine: 'Sewer Pipe',
}

export function calcUtilities(
  state,
  laborRatePerHour,
  materialPrices = {},
  gpmd,
  walkAccess = null,
  laborBurdenPct,
  materialRows = [],
  catDefaults = {},
  commissionRate
) {
  const _pace = parseFloat(walkAccess?.paceLfPerMin) || DEFAULT_WALK_ACCESS_PACE_LF_PER_MIN
  const {
    difficulty,
    hoursAdj,
    trenchRows,
    lineRows,
    gasPipeRows,
    wireRows,
    fixtureRows,
    elecFixtureRows,
    sewerLineRows,
    additionalItems,
    electricSubpanelSubCost,
    manualRows,
  } = state

  let trenchHrs = 0
  let lineHrs = 0,
    lineMat = 0
  let gasPipeHrs = 0,
    gasPipeMat = 0
  let wireHrs = 0,
    wireMat = 0
  let fixHrs = 0,
    fixMat = 0
  let sewerLineHrs = 0,
    sewerLineMat = 0
  let addHrs = 0,
    addMat = 0
  let manHrs = 0,
    manMat = 0,
    manSub = 0

  // Items whose selected Type has no labor rate set (calc_meta.labor_rate unset or
  // resolves to 0). Surfaced as a prompt so the user fixes it — never a fallback.
  const laborUnset = []

  // Trench hours via the shared lib/trench helper (same math as Fire Pit).
  trenchHrs += trenchHours(trenchRows, materialPrices)

  lineRows.forEach(r => {
    if (!r.type) return
    const lf = n(r.lf)
    if (lf <= 0) return
    const { matCost, laborVal, laborName } = resolveUtilRow(
      UTIL_CAT.line,
      r,
      LINE_TYPE_ARR,
      materialRows,
      materialPrices,
      { category: 'Utilities' }
    )
    if (laborVal <= 0) laborUnset.push({ kind: 'labor', name: laborName, label: r.type, category: 'Utilities', unit: null })
    lineMat += lf * matCost
    lineHrs += lf * laborVal
  })

  ;(gasPipeRows || []).forEach(r => {
    if (!r.type) return
    const lf = n(r.lf)
    if (lf <= 0) return
    const { matCost, laborVal, laborName } = resolveUtilRow(
      UTIL_CAT.gasPipe,
      r,
      GASPIPE_TYPE_ARR,
      materialRows,
      materialPrices,
      { category: 'Utilities' }
    )
    if (laborVal <= 0) laborUnset.push({ kind: 'labor', name: laborName, label: r.type, category: 'Utilities', unit: null })
    gasPipeMat += lf * matCost
    gasPipeHrs += lf * laborVal
  })

  ;(wireRows || []).forEach(r => {
    if (!r.type) return
    const lf = n(r.lf)
    if (lf <= 0) return
    const { matCost, laborVal, laborName } = resolveUtilRow(
      UTIL_CAT.wire,
      r,
      WIRE_TYPE_ARR,
      materialRows,
      materialPrices,
      { category: 'Utilities' }
    )
    if (laborVal <= 0) laborUnset.push({ kind: 'labor', name: laborName, label: r.type, category: 'Utilities', unit: null })
    wireMat += lf * matCost
    wireHrs += lf * laborVal
  })

  const _fixtureLoop = (rows, cat, houseArr) => {
    ;(rows || []).forEach(r => {
      if (!r.type) return
      const qty = n(r.qty)
      if (qty <= 0) return
      const { matCost, laborVal, laborName } = resolveUtilRow(
        cat,
        r,
        houseArr,
        materialRows,
        materialPrices,
        { category: 'Utilities' }
      )
      if (laborVal <= 0) laborUnset.push({ kind: 'labor', name: laborName, label: r.type, category: 'Utilities', unit: null })
      fixMat += qty * matCost
      fixHrs += qty * laborVal
    })
  }
  _fixtureLoop(fixtureRows, UTIL_CAT.gas, GAS_TYPE_ARR)
  _fixtureLoop(elecFixtureRows, UTIL_CAT.elec, ELEC_TYPE_ARR)

  // Sewer lines — material + labor per LF (trenching handled by Trenching section)
  ;(sewerLineRows || []).forEach(r => {
    if (!r.type) return
    const lf = n(r.lf)
    if (lf <= 0) return
    const { matCost, laborVal, laborName } = resolveUtilRow(
      UTIL_CAT.sewerLine,
      r,
      SEWER_LINE_ARR,
      materialRows,
      materialPrices,
      { category: 'Utilities' }
    )
    if (laborVal <= 0) laborUnset.push({ kind: 'labor', name: laborName, label: r.type, category: 'Utilities', unit: null })
    sewerLineMat += lf * matCost
    sewerLineHrs += lf * laborVal
  })

  Object.entries(ADD_ITEM_RATES).forEach(([key, rate]) => {
    const qty = n(additionalItems[`${key}Qty`])
    if (qty > 0) {
      const matCost = rate.laborOnly ? 0 : n(materialPrices[rate.dbName])
      const laborHrs = n(materialPrices[rate.laborDbName])
      addHrs += qty * laborHrs
      addMat += qty * matCost
    }
  })

  manualRows.forEach(r => {
    manHrs += n(r.hours)
    manMat += n(r.materials)
    manSub += n(r.subCost)
  })

  const baseHrs =
    trenchHrs + lineHrs + gasPipeHrs + wireHrs + fixHrs + sewerLineHrs + addHrs + manHrs
  const diffMod = 1 + n(difficulty) / 100
  const adjHrs = n(hoursAdj)
  const _preWalkHrs = baseHrs * diffMod + adjHrs
  const walkHrs = calcWalkAccessLabor(_preWalkHrs, state.distanceLF, { paceLfPerMin: _pace })
  const totalHrs = _preWalkHrs + walkHrs
  const manDays = totalHrs / 8
  const totalMat = lineMat + gasPipeMat + wireMat + fixMat + sewerLineMat + addMat + manMat
  const laborCost = totalHrs * n(laborRatePerHour)
  const burden = laborCost * n(laborBurdenPct)
  const gp = manDays * n(gpmd)
  const commission = gp * n(commissionRate)
  const subCost = manSub
  const price = totalMat + laborCost + burden + gp + commission + subCost

  return {
    totalHrs,
    manDays,
    totalMat,
    laborCost,
    burden,
    gp,
    commission,
    subCost,
    price,
    walkHrs,
    trenchHrs,
    lineHrs,
    lineMat,
    gasPipeHrs,
    gasPipeMat,
    wireHrs,
    wireMat,
    fixHrs,
    fixMat,
    sewerLineHrs,
    sewerLineMat,
    addHrs,
    addMat,
    laborUnset: Array.from(new Set(laborUnset.filter(Boolean))),
  }
}
