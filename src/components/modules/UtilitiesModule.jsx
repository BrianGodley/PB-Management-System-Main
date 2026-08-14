import WorkTypeChooser from './WorkTypeChooser'
import CrewTypeBar from './CrewTypeBar'
import ModuleHeaderSlot from './ModuleHeaderSlot'
import { useState, useEffect, useCallback, useContext } from 'react'
import { SubTabContext, subSectionTitle } from './subTabContext'
import { supabase } from '../../lib/supabase'
import GpmdBar from './GpmdBar'
import RateEditPopover from '../RateEditPopover'
import { fetchSalesTaxRate } from '../../lib/companyDefaults'
import { calcWalkAccessLabor, DEFAULT_WALK_ACCESS_PACE_LF_PER_MIN } from '../../lib/walkAccess'
import { catalogItemFor, catalogOptions, fetchModuleCatalog, fetchStandardRateMap } from '../../lib/materialCatalog'

const CATALOG_OPTS = { standardRows: 'exclude', stripPrefix: true }

// ─────────────────────────────────────────────────────────────────────────────
// Utilities Module — fields and calculations from Excel estimator (Utilities Module tab)
// Covers trenching, utility lines (gas/electrical), gas fixtures, and add-ons.
//
// All material costs AND labor time rates are stored in the rate tables
// (labor_rates + misc_rates + catalog, category = 'Utilities') so they are fully
// editable in Master Rates. These maps carry ONLY item identity (dbName +
// laborDbName); every price/coefficient is read live — no hardcoded fallbacks.
// ─────────────────────────────────────────────────────────────────────────────

// dbName = material name (catalog Standard / misc_rates) for the material cost.
// laborDbName = labor_rates name for the per-unit labor coefficient.
// Electrical Pipe (conduit) — electrical-conduit entries only. Gas-pipe entries
// moved to GAS_PIPE_TYPES (Gas Pipe Sub-category) below.
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

// Each trench equipment maps to a labor_rates row so the inline calculator
// icon next to the dropdown can edit the t/hr → min/cf rate.
const TRENCH_LABOR_RATE_NAME = {
  Trench: 'Utilities Trench Excavation',
  Hand: 'Utilities Hand Excavation',
}

const ADD_ITEM_RATES = {
  // In-house electrical: quantity × install hours + material (NOT a sub cost).
  // Identity only — material $ + labor hrs read live from the rate tables.
  curbCore: {
    dbName: 'Curb Core',
    label: 'Curb Core *',
    laborDbName: 'Curb Core - Labor Rate',
  },
  hydrocut: {
    dbName: 'Hydrocut Under Hardscape',
    label: 'Hydrocut Under Hardscape *',
    laborDbName: 'Hydrocut Under Hardscape - Labor Rate',
  },
}

// Company/estimate financial settings (labor rate, burden %, GPMD, commission,
// sub GP markup) are sourced live from company_settings — no hardcoded defaults.

const n = v => parseFloat(v) || 0

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

// Type list = the Master Rates catalog (Items in Category 'Utilities' + this
// Sub-category, Standard/null-vendor). Whatever is in the catalog IS the dropdown,
// so renaming / adding / deleting an Item in Master Rates flows straight through
// with NO duplicates. Built-ins are NOT a second source of options — they only
// supply a labor-rate name + price/labor FALLBACK for any Item that was seeded
// from a built-in (matched by name). Labor for each type is the Item's paired
// '<name> - Labor Rate' row (looked up by name). Only when a Sub-category has NO
// catalog Items at all do we fall back to the built-in list.
// Vendor-first Type list (mirrors Paver's paverOptions): the dropdown shows the
// Items that the ROW'S SELECTED VENDOR carries in Category 'Utilities' + this
// Sub-category. Standard → the null-vendor (Standard-priced) Items; a real vendor
// → only that vendor's Items. So moving an Item from Standard to a vendor makes it
// appear under that vendor and leave the Standard list. Options come ONLY from the
// catalog — when the selected vendor+sub-category has no catalog Items the list is
// empty (the picker shows just its "Select …" placeholder). The built-in array is
// still consulted for LABOR coefficients on catalog rows, never for options.
function mergedUtilTypes(cat, builtInArr, materialRows, vendorSel = 'Standard') {
  const isStd = !vendorSel || vendorSel === 'Standard' || vendorSel === 'auto'
  const catRows = catalogOptions(materialRows, cat, isStd ? 'Standard' : vendorSel, {
    standardRows: 'null-vendor',
    stripPrefix: true,
    category: 'Utilities',
  })
  if (!catRows.length) return []
  return catRows.map(o => {
    const bi = builtInArr.find(b => b.dbName === o.row.name || b.label === o.label)
    return {
      label: o.label,
      dbName: o.row.name,
      // Catalog Standard price for this Item (DB-resolved, not a hardcoded fallback).
      catalogPrice: n(o.row.unit_cost),
      laborDbName: bi?.laborDbName ?? `${o.label} - Labor Rate`,
      fromMaster: !bi,
    }
  })
}

// Resolve a row's material cost + per-unit labor.
// The Type is a built-in item OR a master-list addition (same shape). It defines
// the labor and the Standard material price. A vendor NEVER affects labor; it only
// overrides the MATERIAL price for the selected item, matched by the item's name
// in the vendor's catalog (material_rates for the category + vendor).
function resolveUtilRow(cat, row, houseArr, materialRows, catDefaults, mp) {
  const vsel = row.vendor && row.vendor !== 'auto' ? row.vendor : ''
  // Unset vendor → empty Type list and no material/labor, so the row contributes
  // $0 until a vendor (Standard or a real vendor) is chosen.
  if (!vsel) {
    return {
      opts: [],
      matOpt: { label: row.type, dbName: undefined, fallback: 0 },
      matCost: 0,
      laborVal: 0,
      laborBuiltIn: null,
    }
  }
  // Type options are the SELECTED VENDOR'S items (vendor-first, like Paver).
  const merged = mergedUtilTypes(cat, houseArr, materialRows, vsel)
  const builtIn = merged.find(o => o.label === row.type) || merged[0]
  // Labor coefficient read live from labor_rates (via mp) — no hardcoded fallback.
  const laborVal = n(mp[builtIn?.laborDbName])
  let matDbName = builtIn?.dbName
  const vrow = catalogItemFor(materialRows, cat, vsel, builtIn?.label, {
    ...CATALOG_OPTS,
    fallbackFirst: false,
  })
  if (vrow) {
    matDbName = vrow.name
  }
  // The SELECTED vendor's catalog row (vrow) is the source of truth for its price.
  // Otherwise the name-keyed Standard map (mp) — the catalog Standard price / misc
  // rate. No hardcoded fallback: an unpriced item contributes $0.
  const matCost = vrow ? n(vrow.unit_cost) : n(mp[matDbName])
  // matOpt drives the Type dropdown value + the material rate popover target.
  const matOpt = { label: builtIn?.label, dbName: matDbName }
  return { opts: merged, matOpt, matCost, laborVal, laborBuiltIn: builtIn }
}

function calcUtilities(
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

  trenchRows.forEach(r => {
    const lf = n(r.lf),
      w = n(r.width),
      d = n(r.depth)
    if (lf > 0 && w > 0 && d > 0) {
      const cf = lf * (w / 12) * (d / 12)
      // min/cf read live from labor_rates['Utilities Trench/Hand Excavation'] — no fallback.
      const minsPerCF = n(materialPrices[TRENCH_LABOR_RATE_NAME[r.equipment]])
      trenchHrs += (cf * minsPerCF) / 60
    }
  })

  lineRows.forEach(r => {
    if (!r.type) return
    const lf = n(r.lf)
    if (lf <= 0) return
    const { matCost, laborVal } = resolveUtilRow(
      UTIL_CAT.line,
      r,
      LINE_TYPE_ARR,
      materialRows,
      catDefaults,
      materialPrices
    )
    lineMat += lf * matCost
    lineHrs += lf * laborVal
  })

  ;(gasPipeRows || []).forEach(r => {
    if (!r.type) return
    const lf = n(r.lf)
    if (lf <= 0) return
    const { matCost, laborVal } = resolveUtilRow(
      UTIL_CAT.gasPipe,
      r,
      GASPIPE_TYPE_ARR,
      materialRows,
      catDefaults,
      materialPrices
    )
    gasPipeMat += lf * matCost
    gasPipeHrs += lf * laborVal
  })

  ;(wireRows || []).forEach(r => {
    if (!r.type) return
    const lf = n(r.lf)
    if (lf <= 0) return
    const { matCost, laborVal } = resolveUtilRow(
      UTIL_CAT.wire,
      r,
      WIRE_TYPE_ARR,
      materialRows,
      catDefaults,
      materialPrices
    )
    wireMat += lf * matCost
    wireHrs += lf * laborVal
  })

  const _fixtureLoop = (rows, cat, houseArr) => {
    ;(rows || []).forEach(r => {
      if (!r.type) return
      const qty = n(r.qty)
      if (qty <= 0) return
      const { matCost, laborVal } = resolveUtilRow(
        cat,
        r,
        houseArr,
        materialRows,
        catDefaults,
        materialPrices
      )
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
    const { matCost, laborVal } = resolveUtilRow(
      UTIL_CAT.sewerLine,
      r,
      SEWER_LINE_ARR,
      materialRows,
      catDefaults,
      materialPrices
    )
    sewerLineMat += lf * matCost
    sewerLineHrs += lf * laborVal
  })

  Object.entries(ADD_ITEM_RATES).forEach(([key, rate]) => {
    const qty = n(additionalItems[`${key}Qty`])
    if (qty > 0) {
      const matCost = n(materialPrices[rate.dbName])
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
  }
}

// ── Sub-components ────────────────────────────────────────────────────────────
function SectionHeader({ title }) {
  const isSub = useContext(SubTabContext)
  return (
    <div className="bg-gray-100 rounded-lg px-4 py-2.5 border border-gray-200 mb-2">
      <h3 className="text-xs font-bold text-gray-600 uppercase tracking-wider">{subSectionTitle(title, isSub)}</h3>
    </div>
  )
}

function NumInput({ value, onChange, placeholder = '0', className = '' }) {
  return (
    <input
      type="number"
      step="any"
      className={`input text-sm py-1.5 ${className}`}
      placeholder={placeholder}
      value={value}
      onChange={e => onChange(e.target.value)}
    />
  )
}

// ── Default blank rows ────────────────────────────────────────────────────────
const DEFAULT_TRENCH_ROWS = [
  { equipment: 'Trench', lf: '', width: '', depth: '' },
]
const DEFAULT_LINE_ROWS = [
  { type: '', laborType: '', lf: '', vendor: '' },
]
const DEFAULT_GASPIPE_ROWS = [
  { type: '', laborType: '', lf: '', vendor: '' },
]
const DEFAULT_WIRE_ROWS = [
  { type: '', laborType: '', lf: '', vendor: '' },
]
const DEFAULT_FIXTURE_ROWS = [
  { type: '', laborType: '', qty: '', vendor: '' },
]
const DEFAULT_ELEC_FIXTURE_ROWS = [
  { type: '', laborType: '', qty: '', vendor: '' },
]
const DEFAULT_SEWER_LINE_ROWS = [
  { type: '', laborType: '', lf: '', vendor: '' },
]
const DEFAULT_ADDITIONAL = {
  curbCoreQty: '',
  hydrocutQty: '',
}
const DEFAULT_MANUAL_ROWS = [{ label: '', hours: '', materials: '', subCost: '' }]

// ── Main Component ────────────────────────────────────────────────────────────
export default function UtilitiesModule({ onSave, onBack, saving, initialData }) {
  const [laborRatePerHour, setLaborRatePerHour] = useState(
    initialData?.laborRatePerHour ?? null
  )
  const [laborBurdenPct, setLaborBurdenPct] = useState(
    initialData?.laborBurdenPct ?? null
  )
  const [gpmd, setGpmd] = useState(initialData?.gpmd ?? null)
  const [commissionRate, setCommissionRate] = useState(initialData?.commissionRate ?? null)
  const [subGpMarkupRate, setSubGpMarkupRate] = useState(initialData?.subGpMarkupRate ?? null)

  // Free-text notes for this module — Sam writes auto-generated
  // takeoffs here via create_estimate_from_takeoff, and the user can
  // overwrite / append their own.
  const [notes, setNotes] = useState(initialData?.notes ?? '')
  const [distanceLF, setDistanceLF] = useState(initialData?.distanceLF ?? '')
  const [walkAccess, setWalkAccess] = useState(
    initialData?.walkAccess ?? {
      paceLfPerMin: DEFAULT_WALK_ACCESS_PACE_LF_PER_MIN,
    }
  )
  const [materialPrices, setMaterialPrices] = useState(initialData?.materialPrices ?? {})
  const [pricesLoading, setPricesLoading] = useState(!initialData?.materialPrices)
  // Vendor catalog (material_rates rows with sub_category + vendor_id) + vendor list.
  const [materialRows, setMaterialRows] = useState(initialData?.materialRows ?? [])
  const [vendors, setVendors] = useState([])

  // Re-fetch Utilities labor+material rate map (merged into one for lookup).
  // Called once on mount and again after any RateEditPopover save.
  const refreshAllRates = useCallback(async () => {
    const [prices, catRows, venRes] = await Promise.all([
      fetchStandardRateMap(['Utilities']),
      fetchModuleCatalog(['Utilities']),
      supabase
        .from('subs_vendors')
        .select('id, company_name')
        .eq('type', 'vendor')
        .order('company_name'),
    ])
    setMaterialPrices(initialData?.materialPrices ? { ...prices, ...initialData.materialPrices } : prices)
    setMaterialRows(catRows || [])
    setVendors(
      (venRes.data || []).map(v => ({
        id: v.id,
        name: v.company_name,
      }))
    )
  }, [])

  // Always load the vendor list + material rows (even when re-editing a saved
  // estimate) so the per-row Vendor/Type pickers work.
  useEffect(() => {
    let alive = true
    Promise.all([
      fetchModuleCatalog(['Utilities']),
      supabase
        .from('subs_vendors')
        .select('id, company_name')
        .eq('type', 'vendor')
        .order('company_name'),
    ]).then(([catRows, venRes]) => {
      if (!alive) return
      setMaterialRows(catRows || [])
      setVendors(
        (venRes.data || []).map(v => ({
          id: v.id,
          name: v.company_name,
        }))
      )
    })
    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    supabase
      .from('company_settings')
      .select('labor_rate_per_hour, labor_burden_pct, walk_access_pace_lf_per_min, estimate_gpmd_default, commission_rate, sub_gp_markup_rate')
      .single()
      .then(({ data }) => {
        if (!data) return
        if (!initialData?.laborRatePerHour && data.labor_rate_per_hour != null)
          setLaborRatePerHour(parseFloat(data.labor_rate_per_hour))
        if (!initialData?.laborBurdenPct && data.labor_burden_pct != null) setLaborBurdenPct(parseFloat(data.labor_burden_pct))
        if (initialData?.gpmd == null && data.estimate_gpmd_default != null) setGpmd(parseFloat(data.estimate_gpmd_default))
        if (initialData?.commissionRate == null && data.commission_rate != null) setCommissionRate(parseFloat(data.commission_rate))
        if (initialData?.subGpMarkupRate == null && data.sub_gp_markup_rate != null) setSubGpMarkupRate(parseFloat(data.sub_gp_markup_rate))
        if (!initialData?.walkAccess && data.walk_access_pace_lf_per_min != null) {
          const _wpace = parseFloat(data.walk_access_pace_lf_per_min)
          setWalkAccess({
            paceLfPerMin:
              Number.isFinite(_wpace) && _wpace > 0
                ? _wpace
                : DEFAULT_WALK_ACCESS_PACE_LF_PER_MIN,
          })
        }
      })

    // Always refresh the catalog on open so newly-added Master Rates items appear.
    refreshAllRates().then(() => setPricesLoading(false))
  }, [refreshAllRates])

  const [difficulty, setDifficulty] = useState(initialData?.difficulty ?? '')
  const [crewType, setCrewType] = useState(initialData?.crewType ?? 'Specialty')
  const [subType, setSubType] = useState(initialData?.subType ?? 'In-House')
  const [hoursAdj, setHoursAdj] = useState(initialData?.hoursAdj ?? '')
  const [trenchRows, setTrenchRows] = useState(initialData?.trenchRows ?? DEFAULT_TRENCH_ROWS)
  const [lineRows, setLineRows] = useState(initialData?.lineRows ?? DEFAULT_LINE_ROWS)
  const [gasPipeRows, setGasPipeRows] = useState(initialData?.gasPipeRows ?? DEFAULT_GASPIPE_ROWS)
  const [wireRows, setWireRows] = useState(initialData?.wireRows ?? DEFAULT_WIRE_ROWS)
  const [fixtureRows, setFixtureRows] = useState(initialData?.fixtureRows ?? DEFAULT_FIXTURE_ROWS)
  const [elecFixtureRows, setElecFixtureRows] = useState(
    initialData?.elecFixtureRows ?? DEFAULT_ELEC_FIXTURE_ROWS
  )
  const [sewerLineRows, setSewerLineRows] = useState(
    initialData?.sewerLineRows ?? DEFAULT_SEWER_LINE_ROWS
  )
  const [additionalItems, setAdditionalItems] = useState(
    initialData?.additionalItems ?? DEFAULT_ADDITIONAL
  )
  const [electricSubpanelSubCost, setElectricSubpanelSubCost] = useState(
    initialData?.electricSubpanelSubCost ?? ''
  )
  const [manualRows, setManualRows] = useState(initialData?.manualRows ?? DEFAULT_MANUAL_ROWS)

  // ── Independent Subcontractor-tab state ──────────────────────────────────
  // The Sub tab is its own calculator (mirrors the demo Hand/Skid/Mini tabs).
  // Each field defaults to the same blank rows as its in-house counterpart,
  // except sub trench which is LF-only (no equipment/width/depth).
  const [subTrenchRows, setSubTrenchRows] = useState(
    initialData?.subTrenchRows ?? [{ lf: '' }]
  )
  const [subLineRows, setSubLineRows] = useState(initialData?.subLineRows ?? DEFAULT_LINE_ROWS)
  const [subGasPipeRows, setSubGasPipeRows] = useState(
    initialData?.subGasPipeRows ?? DEFAULT_GASPIPE_ROWS
  )
  const [subWireRows, setSubWireRows] = useState(initialData?.subWireRows ?? DEFAULT_WIRE_ROWS)
  const [subFixtureRows, setSubFixtureRows] = useState(
    initialData?.subFixtureRows ?? DEFAULT_FIXTURE_ROWS
  )
  const [subElecFixtureRows, setSubElecFixtureRows] = useState(
    initialData?.subElecFixtureRows ?? DEFAULT_ELEC_FIXTURE_ROWS
  )
  const [subSewerLineRows, setSubSewerLineRows] = useState(
    initialData?.subSewerLineRows ?? DEFAULT_SEWER_LINE_ROWS
  )
  const [subAdditionalItems, setSubAdditionalItems] = useState(
    initialData?.subAdditionalItems ?? DEFAULT_ADDITIONAL
  )
  const [subManualRows, setSubManualRows] = useState(
    initialData?.subManualRows ?? DEFAULT_MANUAL_ROWS
  )

  // ── Sales tax — applied to totalMat across every module so the bid
  //    reflects supplier-invoiced material cost. Sourced from
  //    company_settings.sales_tax_rate via fetchSalesTaxRate(). Default
  //    0 (no tax) until the admin sets it in Opportunities → Settings.
  const [salesTaxRate, setSalesTaxRate] = useState(0)
  useEffect(() => {
    let alive = true
    fetchSalesTaxRate().then(r => {
      if (alive) setSalesTaxRate(r)
    })
    return () => {
      alive = false
    }
  }, [])

  // Active-tab wiring: the shared sections (Lines / Fixtures / Electrical
  // Fixtures / Additional / Manual) edit whichever set matches the current
  // tab, so In-House and Subcontractor are fully independent calculators.
  const isSub = subType === 'Subcontractor'
  const activeLineRows = isSub ? subLineRows : lineRows
  const activeGasPipeRows = isSub ? subGasPipeRows : gasPipeRows
  const activeWireRows = isSub ? subWireRows : wireRows
  const activeFixtureRows = isSub ? subFixtureRows : fixtureRows
  const activeElecFixtureRows = isSub ? subElecFixtureRows : elecFixtureRows
  const activeSewerLineRows = isSub ? subSewerLineRows : sewerLineRows
  const activeAdditionalItems = isSub ? subAdditionalItems : additionalItems
  const activeManualRows = isSub ? subManualRows : manualRows
  const setActiveLineRows = isSub ? setSubLineRows : setLineRows
  const setActiveGasPipeRows = isSub ? setSubGasPipeRows : setGasPipeRows
  const setActiveWireRows = isSub ? setSubWireRows : setWireRows
  const setActiveFixtureRows = isSub ? setSubFixtureRows : setFixtureRows
  const setActiveElecFixtureRows = isSub ? setSubElecFixtureRows : setElecFixtureRows
  const setActiveSewerLineRows = isSub ? setSubSewerLineRows : setSewerLineRows
  const setActiveAdditionalItems = isSub ? setSubAdditionalItems : setAdditionalItems
  const setActiveManualRows = isSub ? setSubManualRows : setManualRows

  // ── Vendor catalog helpers (per-row Vendor/Type pickers) ─────────────────
  const vendorsForCategory = cat => vendors.filter(v => materialRows.some(r => r.vendor_id === v.id && (r.sub_category === cat || r.category === cat)))
  const defaultVendorFor = cat => vendorsForCategory(cat)[0]?.id || 'Standard'
  // Vendor picker is controlled by the RAW row vendor. Unset/'auto' → '' so the
  // dropdown shows the empty "Select vendor" placeholder (no auto-resolve to a
  // default vendor). A chosen vendor (incl. 'Standard') is shown as-is.
  const effVendor = (cat, v) => (v && v !== 'auto' ? v : '')
  const catDefaults = {
    [UTIL_CAT.line]: defaultVendorFor(UTIL_CAT.line),
    [UTIL_CAT.gasPipe]: defaultVendorFor(UTIL_CAT.gasPipe),
    [UTIL_CAT.wire]: defaultVendorFor(UTIL_CAT.wire),
    [UTIL_CAT.gas]: defaultVendorFor(UTIL_CAT.gas),
    [UTIL_CAT.elec]: defaultVendorFor(UTIL_CAT.elec),
    [UTIL_CAT.sewerLine]: defaultVendorFor(UTIL_CAT.sewerLine),
  }

  // Rows now default to an EMPTY vendor ("Select vendor" placeholder); we no
  // longer auto-fill unset rows with a default vendor. An unset vendor yields an
  // empty Type list and contributes $0 until a vendor is chosen.

  // In-house calc — now vendor-aware via materialRows + catDefaults.
  const inHouse = calcUtilities(
    {
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
      distanceLF,
    },
    laborRatePerHour,
    materialPrices,
    gpmd,
    walkAccess,
    laborBurdenPct,
    materialRows,
    catDefaults,
    commissionRate
  )

  // ── Sub-side cost — a single fully-loaded subcontractor cost figure.
  // Reuses the exact same per-unit rate lookups as the in-house calc, but
  // books (material$ + labor-hours × labor rate) as a sub COST. It does NOT
  // add to the module's in-house manDays / totalHrs / totalMat / laborCost.
  const subTrenchRate = n(materialPrices['Utilities Sub Trench - Per LF'])
  let subSideCost = 0
  subTrenchRows.forEach(r => {
    subSideCost += n(r.lf) * subTrenchRate
  })
  subLineRows.forEach(r => {
    if (!r.type) return
    const lf = n(r.lf)
    if (lf <= 0) return
    const { matCost, laborVal } = resolveUtilRow(
      UTIL_CAT.line,
      r,
      LINE_TYPE_ARR,
      materialRows,
      catDefaults,
      materialPrices
    )
    subSideCost += lf * matCost + lf * laborVal * laborRatePerHour
  })
  ;(subGasPipeRows || []).forEach(r => {
    if (!r.type) return
    const lf = n(r.lf)
    if (lf <= 0) return
    const { matCost, laborVal } = resolveUtilRow(
      UTIL_CAT.gasPipe,
      r,
      GASPIPE_TYPE_ARR,
      materialRows,
      catDefaults,
      materialPrices
    )
    subSideCost += lf * matCost + lf * laborVal * laborRatePerHour
  })
  ;(subWireRows || []).forEach(r => {
    if (!r.type) return
    const lf = n(r.lf)
    if (lf <= 0) return
    const { matCost, laborVal } = resolveUtilRow(
      UTIL_CAT.wire,
      r,
      WIRE_TYPE_ARR,
      materialRows,
      catDefaults,
      materialPrices
    )
    subSideCost += lf * matCost + lf * laborVal * laborRatePerHour
  })
  const _subFixtureLoop = (rows, cat, houseArr) => {
    ;(rows || []).forEach(r => {
      if (!r.type) return
      const qty = n(r.qty)
      if (qty <= 0) return
      const { matCost, laborVal } = resolveUtilRow(
        cat,
        r,
        houseArr,
        materialRows,
        catDefaults,
        materialPrices
      )
      subSideCost += qty * matCost + qty * laborVal * laborRatePerHour
    })
  }
  _subFixtureLoop(subFixtureRows, UTIL_CAT.gas, GAS_TYPE_ARR)
  _subFixtureLoop(subElecFixtureRows, UTIL_CAT.elec, ELEC_TYPE_ARR)
  ;(subSewerLineRows || []).forEach(r => {
    if (!r.type) return
    const lf = n(r.lf)
    if (lf <= 0) return
    const { matCost, laborVal } = resolveUtilRow(
      UTIL_CAT.sewerLine,
      r,
      SEWER_LINE_ARR,
      materialRows,
      catDefaults,
      materialPrices
    )
    subSideCost += lf * matCost + lf * laborVal * laborRatePerHour
  })
  Object.entries(ADD_ITEM_RATES).forEach(([key, rate]) => {
    const qty = n(subAdditionalItems[`${key}Qty`])
    if (qty > 0) {
      const matCost = n(materialPrices[rate.dbName])
      const laborHrs = n(materialPrices[rate.laborDbName])
      subSideCost += qty * matCost + qty * laborHrs * laborRatePerHour
    }
  })
  subManualRows.forEach(r => {
    subSideCost += n(r.subCost)
  })

  // ── Combine: in-house calc + sub-side cost. GP stays in-house; sub cost
  // earns its own markup (subGp); commission applies to both GP pools.
  const _subCost = inHouse.subCost + subSideCost
  const _subGp = _subCost * n(subGpMarkupRate)
  const _gp = inHouse.gp
  const _commission = (_gp + _subGp) * n(commissionRate)
  const _price =
    inHouse.totalMat + inHouse.laborCost + inHouse.burden + _gp + _subCost + _subGp + _commission
  const calcRaw = {
    ...inHouse,
    subCost: _subCost,
    subGp: _subGp,
    gp: _gp,
    commission: _commission,
    price: _price,
  }

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

  function updateTrench(i, field, val) {
    setTrenchRows(rows => rows.map((r, idx) => (idx === i ? { ...r, [field]: val } : r)))
  }
  function updateSubTrench(i, field, val) {
    setSubTrenchRows(rows => rows.map((r, idx) => (idx === i ? { ...r, [field]: val } : r)))
  }
  function updateLine(i, field, val) {
    setActiveLineRows(rows => rows.map((r, idx) => (idx === i ? { ...r, [field]: val } : r)))
  }
  function updateGasPipe(i, field, val) {
    setActiveGasPipeRows(rows => rows.map((r, idx) => (idx === i ? { ...r, [field]: val } : r)))
  }
  function updateWire(i, field, val) {
    setActiveWireRows(rows => rows.map((r, idx) => (idx === i ? { ...r, [field]: val } : r)))
  }
  function updateFixture(i, field, val) {
    setActiveFixtureRows(rows => rows.map((r, idx) => (idx === i ? { ...r, [field]: val } : r)))
  }
  function updateElecFixture(i, field, val) {
    setActiveElecFixtureRows(rows => rows.map((r, idx) => (idx === i ? { ...r, [field]: val } : r)))
  }
  function updateManual(i, field, val) {
    setActiveManualRows(rows => rows.map((r, idx) => (idx === i ? { ...r, [field]: val } : r)))
  }
  // Type = built-in item (sets labor); Vendor = material price only. Both are
  // simple per-row field sets. Section = 'line' | 'gas' | 'elec'.
  const _sectionSetter = {
    line: setActiveLineRows,
    gasPipe: setActiveGasPipeRows,
    wire: setActiveWireRows,
    gas: setActiveFixtureRows,
    elec: setActiveElecFixtureRows,
    sewerLine: setActiveSewerLineRows,
  }
  function changeRowType(section, i, val) {
    _sectionSetter[section](rows => rows.map((r, idx) => (idx === i ? { ...r, type: val } : r)))
  }
  function changeRowVendor(section, i, val) {
    _sectionSetter[section](rows => rows.map((r, idx) => (idx === i ? { ...r, vendor: val } : r)))
  }

  function handleSave() {
    onSave({
      notes,
      man_days: parseFloat(calc.manDays.toFixed(2)),
      material_cost: parseFloat(calc.totalMat.toFixed(2)),
      data: {
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
        subTrenchRows,
        subLineRows,
        subGasPipeRows,
        subWireRows,
        subFixtureRows,
        subElecFixtureRows,
        subSewerLineRows,
        subAdditionalItems,
        subManualRows,
        subType,
        subGpMarkupRate,
        commissionRate,
        laborRatePerHour,
        laborBurdenPct,
        gpmd,
        materialPrices,
        // materialRows (live catalog) intentionally NOT persisted — fetched fresh on open.
        calc,
      },
    })
  }

  // ── Grouped rate list for the "View Rates" popup (CrewTypeBar). Every rate
  //    that used to have an inline RateEditPopover in this module now lives here.
  //    Each section lists its LABOR rates first, then every MATERIAL rate
  //    (per vendor from the catalog) — mirrors the Walls module View Rates.
  const vendorNames = Object.fromEntries((vendors || []).map(v => [v.id, v.name]))
  // Options for a per-row Vendor <select>. Shows an empty "Select vendor"
  // placeholder when the row vendor is unset (never auto-resolves to a default),
  // a backward-compat option for a stored vendor no longer in the catalog list,
  // then the category's vendors + Standard.
  const vendorOptions = (cat, rawVendor) => {
    const list = vendorsForCategory(cat)
    const rv = rawVendor && rawVendor !== 'auto' ? rawVendor : ''
    const known = rv === 'Standard' || list.some(v => v.id === rv)
    return (
      <>
        {!rv && <option value="">Select</option>}
        {rv && !known && <option value={rv}>{vendorNames[rv] || rv}</option>}
        {list.map(v => (
          <option key={v.id} value={v.id}>
            {v.name}
          </option>
        ))}
        <option value="Standard">Standard</option>
      </>
    )
  }
  // Material rows for a catalog item (matched by name). One row per vendor
  // (Standard first), each editable straight to material_price — same helper
  // shape Walls uses.
  const matRows = (dbName, unit, fallback) => {
    const rows = (materialRows || []).filter(r0 => r0.name === dbName)
    if (rows.length) {
      return rows
        .filter(r0 => r0.vendor_id == null || vendorNames[r0.vendor_id])
        .sort((a, b) => {
          const va = a.vendor_id == null ? '' : vendorNames[a.vendor_id] || '~'
          const vb = b.vendor_id == null ? '' : vendorNames[b.vendor_id] || '~'
          return va.localeCompare(vb)
        })
        .map(r0 => ({
          label: `${r0.vendor_id ? vendorNames[r0.vendor_id] || 'Vendor' : 'Standard'} — ${r0.name}`,
          table: 'material_price',
          materialId: r0.id,
          vendorId: r0.vendor_id || undefined,
          category: 'Utilities',
          unitLabel: r0.unit || unit,
          mode: 'currency',
          value: n(r0.unit_cost),
        }))
    }
    return [
      { label: `Standard — ${dbName}`, table: 'material_price', name: dbName, category: 'Utilities', unitLabel: unit, mode: 'currency', value: fallback },
    ]
  }
  const laborRow = (name, unit, value) => ({
    label: name, table: 'labor_rates', name, category: 'Utilities', mode: 'coefficient', unitLabel: unit, value,
  })
  const utilitiesRateList = [
    {
      group: 'Trenching',
      items: [
        laborRow(TRENCH_LABOR_RATE_NAME.Trench, 'min/cf', materialPrices[TRENCH_LABOR_RATE_NAME.Trench]),
        laborRow(TRENCH_LABOR_RATE_NAME.Hand, 'min/cf', materialPrices[TRENCH_LABOR_RATE_NAME.Hand]),
      ],
    },
    {
      group: 'Electrical Pipe',
      items: [
        ...Object.values(UTILITY_LINE_TYPES).map(t =>
          laborRow(t.laborDbName, 'hr/LF', materialPrices[t.laborDbName])
        ),
        ...Object.values(UTILITY_LINE_TYPES).flatMap(t => matRows(t.dbName, 'LF', 0)),
      ],
    },
    {
      group: 'Gas Pipe',
      items: [
        ...Object.values(GAS_PIPE_TYPES).map(t =>
          laborRow(t.laborDbName, 'hr/LF', materialPrices[t.laborDbName])
        ),
        ...Object.values(GAS_PIPE_TYPES).flatMap(t => matRows(t.dbName, 'LF', 0)),
      ],
    },
    {
      // Electrical Wiring has no code built-ins — surface every catalog Item
      // seeded under the 'Electrical Wiring' Sub-category (one block per vendor).
      group: 'Electrical Wiring',
      items: [
        ...Array.from(
          new Set(
            (materialRows || [])
              .filter(r0 => r0.sub_category === UTIL_CAT.wire)
              .map(r0 => r0.name)
          )
        ).flatMap(name => matRows(name, 'LF', 0)),
      ],
    },
    {
      group: 'Gas Fixtures',
      items: [
        ...Object.values(GAS_FIXTURE_TYPES).map(t =>
          laborRow(t.laborDbName, 'hr/ea', materialPrices[t.laborDbName])
        ),
        ...Object.values(GAS_FIXTURE_TYPES).flatMap(t => matRows(t.dbName, 'ea', 0)),
      ],
    },
    {
      group: 'Electrical Fixtures',
      items: [
        ...Object.values(ELECTRICAL_FIXTURE_TYPES).map(t =>
          laborRow(t.laborDbName, 'hr/ea', materialPrices[t.laborDbName])
        ),
        ...Object.values(ELECTRICAL_FIXTURE_TYPES).flatMap(t => matRows(t.dbName, 'ea', 0)),
      ],
    },
    {
      group: 'Sewer Pipe',
      items: [
        ...Object.values(SEWER_LINE_TYPES).map(t =>
          laborRow(t.laborDbName, 'hr/LF', materialPrices[t.laborDbName])
        ),
        ...Object.values(SEWER_LINE_TYPES).flatMap(t => matRows(t.dbName, 'LF', 0)),
      ],
    },
    {
      group: 'Additional Subgrade Work',
      items: [
        ...Object.values(ADD_ITEM_RATES).map(rate =>
          laborRow(rate.laborDbName, 'hr/ea', materialPrices[rate.laborDbName])
        ),
        ...Object.values(ADD_ITEM_RATES).flatMap(rate => matRows(rate.dbName, 'ea', 0)),
      ],
    },
    {
      group: 'Subcontractor Trenching',
      items: [
        {
          label: 'Utilities Sub Trench - Per LF',
          table: 'misc_rates',
          name: 'Utilities Sub Trench - Per LF',
          category: 'Utilities',
          mode: 'currency',
          unitLabel: 'Ln Ft',
          section: 'sub',
          value: materialPrices['Utilities Sub Trench - Per LF'],
        },
      ],
    },
  ]

  return (
    <SubTabContext.Provider value={isSub}>
    <div className="space-y-5">
      {/* ── Frozen header: GPMD bar + Crew Type / View Rates bar ── */}
      <div className="sticky top-0 z-20 -mx-6 bg-white shadow-md">
        <div className="px-6 pt-1 pb-1 bg-gray-900">
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
        <div className="px-6 py-2">
          <CrewTypeBar
            crewType={crewType}
            onCrewTypeChange={setCrewType}
            title="Utilities"
            rates={utilitiesRateList}
            refreshAllRates={refreshAllRates}
            showInlineToggle={false}
          />
        </div>
      </div>

      <ModuleHeaderSlot>
        <WorkTypeChooser value={subType || 'In-House'} onChange={setSubType} compact />
      </ModuleHeaderSlot>

      {pricesLoading && (
        <div className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2">
          Loading material prices from Master Rates…
        </div>
      )}

      {/* Settings — In-House tab only (sub tab is a flat cost calculator) */}
      {!isSub && (
        <>
          <SectionHeader title="Job Site Conditions" />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <p className="text-xs text-gray-500 mb-0.5">Difficulty (%)</p>
              <NumInput value={difficulty} onChange={setDifficulty} placeholder="0" />
            </div>
            <div>
              <p
                className="text-xs text-gray-500 mb-0.5"
                title="Average Distance from Truck to Work Area"
              >
                Truck → Work Area (Avg LF)
              </p>
              <NumInput value={distanceLF} onChange={setDistanceLF} placeholder="0" />
              {calc.walkHrs > 0 && (
                <p className="text-[10px] text-gray-500 italic lowercase mt-0.5">
                  +{calc.walkHrs.toFixed(2)} hrs walk-access
                </p>
              )}
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-0.5">Hours Adj (±hrs)</p>
              <NumInput value={hoursAdj} onChange={setHoursAdj} placeholder="0" />
            </div>
          </div>
        </>
      )}

      {/* ── Trenching ── */}
      <div>
        <SectionHeader title="Trenching" />
        {!isSub ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 border-b border-gray-200">
                <th className="text-left pb-1 pr-2 font-medium">Method</th>
                <th className="text-left pb-1 pr-2 font-medium">Linear Feet</th>
                <th className="text-left pb-1 pr-2 font-medium">Width (In)</th>
                <th className="text-left pb-1 font-medium">Depth (In)</th>
                <th className="text-right pb-1 font-medium text-gray-400">Est. Hrs</th>
              </tr>
            </thead>
            <tbody>
              {trenchRows.map((row, i) => {
                const lf = n(row.lf),
                  w = n(row.width),
                  d = n(row.depth)
                const minsPerCF = n(materialPrices[TRENCH_LABOR_RATE_NAME[row.equipment]])
                const cf = lf > 0 && w > 0 && d > 0 ? lf * (w / 12) * (d / 12) : 0
                const hrs = cf > 0 ? (cf * minsPerCF) / 60 : 0
                const laborName = TRENCH_LABOR_RATE_NAME[row.equipment]
                return (
                  <tr key={i} className="border-b border-gray-100">
                    <td className="py-1 pr-2">
                      <div className="flex items-center gap-1">
                        <select
                          className="input text-sm py-1 flex-1 min-w-0"
                          value={row.equipment}
                          onChange={e => updateTrench(i, 'equipment', e.target.value)}
                        >
                          <option>Trench</option>
                          <option>Hand</option>
                        </select>
                      </div>
                    </td>
                    <td className="py-1 pr-2">
                      <NumInput value={row.lf} onChange={v => updateTrench(i, 'lf', v)} />
                    </td>
                    <td className="py-1 pr-2">
                      <NumInput value={row.width} onChange={v => updateTrench(i, 'width', v)} />
                    </td>
                    <td className="py-1">
                      {' '}
                      <NumInput value={row.depth} onChange={v => updateTrench(i, 'depth', v)} />
                    </td>
                    <td className="py-1 text-right text-gray-500 text-xs pl-2">
                      {hrs > 0 ? hrs.toFixed(2) : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <button
            type="button"
            className="mt-1 text-xs text-green-700 hover:text-green-900 font-medium"
            onClick={() =>
              setTrenchRows(r => [...r, { equipment: 'Trench', lf: '', width: '', depth: '' }])
            }
          >
            + Add row
          </button>
        </div>
        ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 border-b border-gray-200">
                <th className="text-left pb-1 pr-2 font-medium">Linear Feet</th>
                <th className="text-right pb-1 font-medium text-gray-400">Sub $</th>
              </tr>
            </thead>
            <tbody>
              {subTrenchRows.map((row, i) => {
                const cost = n(row.lf) * subTrenchRate
                return (
                  <tr key={i} className="border-b border-gray-100">
                    <td className="py-1 pr-2">
                      <NumInput value={row.lf} onChange={v => updateSubTrench(i, 'lf', v)} />
                    </td>
                    <td className="py-1 text-right text-gray-600 text-xs">
                      {cost > 0 ? `$${cost.toFixed(2)}` : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <div className="flex items-center gap-3 mt-1">
            <button
              type="button"
              className="text-xs text-green-700 hover:text-green-900 font-medium"
              onClick={() => setSubTrenchRows(r => [...r, { lf: '' }])}
            >
              + Add row
            </button>
            <span className="inline-flex items-center gap-1 text-xs text-gray-400">
              ${subTrenchRate.toFixed(2)}/LF
            </span>
          </div>
        </div>
        )}
      </div>

      {/* ── Additional Subgrade Work ── */}
      <div>
        <SectionHeader title="Additional Subgrade Work" />
        <div className="space-y-0.5">
          {/* Curb Core & Hydrocut — qty based */}
          {Object.entries(ADD_ITEM_RATES).map(([key, rate]) => {
            const qty = n(activeAdditionalItems[`${key}Qty`])
            const matCost = n(materialPrices[rate.dbName])
            const laborHrs = n(materialPrices[rate.laborDbName])
            return (
              <div key={key} className="flex items-center gap-3 py-1.5 border-b border-gray-100">
                <span className="text-xs text-gray-700 flex-1 inline-flex items-center gap-1">
                  {rate.label}
                </span>
                <input
                  type="number"
                  step="1"
                  className="input text-sm py-1 w-20"
                  placeholder="Qty"
                  value={activeAdditionalItems[`${key}Qty`]}
                  onChange={e =>
                    setActiveAdditionalItems(p => ({ ...p, [`${key}Qty`]: e.target.value }))
                  }
                />
                <span className="text-xs text-gray-400 w-20 text-right">
                  {qty > 0 ? `$${(qty * matCost).toLocaleString()} mat` : '—'}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Electrical Pipe ── */}
      <div>
        <SectionHeader title="Electrical Pipe" />
        <div className="overflow-x-auto">
          <table className="w-full text-sm table-fixed">
            <colgroup>
              <col className="w-[128px]" />
              <col />
              <col className="w-[84px]" />
              <col className="w-[96px]" />
              <col className="w-[96px]" />
            </colgroup>
            <thead>
              <tr className="text-xs text-gray-500 border-b border-gray-200">
                <th className="text-center pb-1 pr-2 font-medium">Vendor</th>
                <th className="text-center pb-1 pr-2 font-medium">Pipe Type</th>
                <th className="text-center pb-1 pr-2 font-medium">Linear Feet</th>
                <th className="text-center pb-1 pr-2 font-medium text-gray-400">$ per Ln Ft</th>
                <th className="text-center pb-1 font-medium text-gray-400">Material $</th>
              </tr>
            </thead>
            <tbody>
              {activeLineRows.map((row, i) => {
                const { opts, matOpt, matCost, laborVal, laborBuiltIn } = resolveUtilRow(
                  UTIL_CAT.line,
                  row,
                  LINE_TYPE_ARR,
                  materialRows,
                  catDefaults,
                  materialPrices
                )
                const mat = n(row.lf) * matCost
                return (
                  <tr key={i} className="border-b border-gray-100">
                    <td className="py-1 pr-2">
                      <select
                        className="input text-sm py-1 w-full"
                        value={effVendor(UTIL_CAT.line, row.vendor)}
                        onChange={e => changeRowVendor('line', i, e.target.value)}
                        title="Vendor"
                      >
                        {vendorOptions(UTIL_CAT.line, row.vendor)}
                      </select>
                    </td>
                    <td className="py-1 pr-2">
                      <div className="flex items-center gap-1">
                        <select
                          className="input text-sm py-1 flex-1 min-w-0"
                          value={row.type || ''}
                          onChange={e => changeRowType('line', i, e.target.value)}
                        >
                          {!row.type && <option value="">Select pipe</option>}
                          {row.type && !opts.some(o => o.label === row.type) && (
                            <option value={row.type}>{row.type}</option>
                          )}
                          {opts.map(o => (
                            <option key={o.label} value={o.label}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </td>
                    <td className="py-1 pr-2">
                      <NumInput value={row.lf} onChange={v => updateLine(i, 'lf', v)} className="w-full text-center" />
                    </td>
                    <td className="py-1 text-right text-gray-400 text-xs pr-2">
                      <span className="flex items-center justify-center gap-1">
                        ${matCost.toFixed(2)}
                      </span>
                    </td>
                    <td className="py-1 text-center text-gray-600 text-xs">
                      {mat > 0 ? `$${mat.toFixed(2)}` : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <button
            type="button"
            className="mt-1 text-xs text-green-700 hover:text-green-900 font-medium"
            onClick={() =>
              setActiveLineRows(r => [
                ...r,
                {
                  type: '',
                  laborType: '',
                  lf: '',
                  vendor: '',
                },
              ])
            }
          >
            + Add row
          </button>
        </div>
      </div>

      {/* ── Electrical Wiring ── */}
      <div>
        <SectionHeader title="Electrical Wiring" />
        <div className="overflow-x-auto">
          <table className="w-full text-sm table-fixed">
            <colgroup>
              <col className="w-[128px]" />
              <col />
              <col className="w-[84px]" />
              <col className="w-[96px]" />
              <col className="w-[96px]" />
            </colgroup>
            <thead>
              <tr className="text-xs text-gray-500 border-b border-gray-200">
                <th className="text-center pb-1 pr-2 font-medium">Vendor</th>
                <th className="text-center pb-1 pr-2 font-medium">Wire Type</th>
                <th className="text-center pb-1 pr-2 font-medium">Linear Feet</th>
                <th className="text-center pb-1 pr-2 font-medium text-gray-400">$ per Ln Ft</th>
                <th className="text-center pb-1 font-medium text-gray-400">Material $</th>
              </tr>
            </thead>
            <tbody>
              {activeWireRows.map((row, i) => {
                const { opts, matOpt, matCost, laborVal, laborBuiltIn } = resolveUtilRow(
                  UTIL_CAT.wire,
                  row,
                  WIRE_TYPE_ARR,
                  materialRows,
                  catDefaults,
                  materialPrices
                )
                const mat = n(row.lf) * matCost
                return (
                  <tr key={i} className="border-b border-gray-100">
                    <td className="py-1 pr-2">
                      <select
                        className="input text-sm py-1 w-full"
                        value={effVendor(UTIL_CAT.wire, row.vendor)}
                        onChange={e => changeRowVendor('wire', i, e.target.value)}
                        title="Vendor"
                      >
                        {vendorOptions(UTIL_CAT.wire, row.vendor)}
                      </select>
                    </td>
                    <td className="py-1 pr-2">
                      <div className="flex items-center gap-1">
                        <select
                          className="input text-sm py-1 flex-1 min-w-0"
                          value={row.type || ''}
                          onChange={e => changeRowType('wire', i, e.target.value)}
                        >
                          {!row.type && <option value="">Select wire</option>}
                          {row.type && !opts.some(o => o.label === row.type) && (
                            <option value={row.type}>{row.type}</option>
                          )}
                          {opts.map(o => (
                            <option key={o.label} value={o.label}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </td>
                    <td className="py-1 pr-2">
                      <NumInput value={row.lf} onChange={v => updateWire(i, 'lf', v)} className="w-full text-center" />
                    </td>
                    <td className="py-1 text-right text-gray-400 text-xs pr-2">
                      <span className="flex items-center justify-center gap-1">
                        ${matCost.toFixed(2)}
                      </span>
                    </td>
                    <td className="py-1 text-center text-gray-600 text-xs">
                      {mat > 0 ? `$${mat.toFixed(2)}` : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <button
            type="button"
            className="mt-1 text-xs text-green-700 hover:text-green-900 font-medium"
            onClick={() =>
              setActiveWireRows(r => [
                ...r,
                {
                  type: '',
                  laborType: '',
                  lf: '',
                  vendor: '',
                },
              ])
            }
          >
            + Add row
          </button>
        </div>
      </div>

      {/* ── Electrical Fixtures ── */}
      <div>
        <SectionHeader title="Electrical Fixtures" />
        <div className="overflow-x-auto">
          <table className="w-full text-sm table-fixed">
            <colgroup>
              <col className="w-[128px]" />
              <col />
              <col className="w-[84px]" />
              <col className="w-[96px]" />
              <col className="w-[96px]" />
            </colgroup>
            <thead>
              <tr className="text-xs text-gray-500 border-b border-gray-200">
                <th className="text-center pb-1 pr-2 font-medium">Vendor</th>
                <th className="text-center pb-1 pr-2 font-medium">Fixture</th>
                <th className="text-center pb-1 pr-2 font-medium">Qty</th>
                <th className="text-center pb-1 pr-2 font-medium text-gray-400">$/Ea</th>
                <th className="text-center pb-1 font-medium text-gray-400">Material $</th>
              </tr>
            </thead>
            <tbody>
              {activeElecFixtureRows.map((row, i) => {
                const { opts, matOpt, matCost, laborVal, laborBuiltIn } = resolveUtilRow(
                  UTIL_CAT.elec,
                  row,
                  ELEC_TYPE_ARR,
                  materialRows,
                  catDefaults,
                  materialPrices
                )
                const mat = n(row.qty) * matCost
                return (
                  <tr key={i} className="border-b border-gray-100">
                    <td className="py-1 pr-2">
                      <select
                        className="input text-sm py-1 w-full"
                        value={effVendor(UTIL_CAT.elec, row.vendor)}
                        onChange={e => changeRowVendor('elec', i, e.target.value)}
                        title="Vendor"
                      >
                        {vendorOptions(UTIL_CAT.elec, row.vendor)}
                      </select>
                    </td>
                    <td className="py-1 pr-2">
                      <div className="flex items-center gap-1">
                        <select
                          className="input text-sm py-1 flex-1 min-w-0"
                          value={row.type || ''}
                          onChange={e => changeRowType('elec', i, e.target.value)}
                        >
                          {!row.type && <option value="">Select fixture</option>}
                          {row.type && !opts.some(o => o.label === row.type) && (
                            <option value={row.type}>{row.type}</option>
                          )}
                          {opts.map(o => (
                            <option key={o.label} value={o.label}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </td>
                    <td className="py-1 pr-2">
                      <NumInput value={row.qty} onChange={v => updateElecFixture(i, 'qty', v)} className="w-full text-center" />
                    </td>
                    <td className="py-1 text-right text-gray-400 text-xs pr-2">
                      <span className="flex items-center justify-center gap-1">
                        ${matCost.toFixed(2)}
                      </span>
                    </td>
                    <td className="py-1 text-center text-gray-600 text-xs">
                      {mat > 0 ? `$${mat.toFixed(2)}` : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <button
            type="button"
            className="mt-1 text-xs text-green-700 hover:text-green-900 font-medium"
            onClick={() =>
              setActiveElecFixtureRows(r => [
                ...r,
                {
                  type: '',
                  laborType: '',
                  qty: '',
                  vendor: '',
                },
              ])
            }
          >
            + Add row
          </button>
        </div>
      </div>

      {/* ── Gas Pipe ── */}
      <div>
        <SectionHeader title="Gas Pipe" />
        <div className="overflow-x-auto">
          <table className="w-full text-sm table-fixed">
            <colgroup>
              <col className="w-[128px]" />
              <col />
              <col className="w-[84px]" />
              <col className="w-[96px]" />
              <col className="w-[96px]" />
            </colgroup>
            <thead>
              <tr className="text-xs text-gray-500 border-b border-gray-200">
                <th className="text-center pb-1 pr-2 font-medium">Vendor</th>
                <th className="text-center pb-1 pr-2 font-medium">Pipe Type</th>
                <th className="text-center pb-1 pr-2 font-medium">Linear Feet</th>
                <th className="text-center pb-1 pr-2 font-medium text-gray-400">$ per Ln Ft</th>
                <th className="text-center pb-1 font-medium text-gray-400">Material $</th>
              </tr>
            </thead>
            <tbody>
              {activeGasPipeRows.map((row, i) => {
                const { opts, matOpt, matCost, laborVal, laborBuiltIn } = resolveUtilRow(
                  UTIL_CAT.gasPipe,
                  row,
                  GASPIPE_TYPE_ARR,
                  materialRows,
                  catDefaults,
                  materialPrices
                )
                const mat = n(row.lf) * matCost
                return (
                  <tr key={i} className="border-b border-gray-100">
                    <td className="py-1 pr-2">
                      <select
                        className="input text-sm py-1 w-full"
                        value={effVendor(UTIL_CAT.gasPipe, row.vendor)}
                        onChange={e => changeRowVendor('gasPipe', i, e.target.value)}
                        title="Vendor"
                      >
                        {vendorOptions(UTIL_CAT.gasPipe, row.vendor)}
                      </select>
                    </td>
                    <td className="py-1 pr-2">
                      <div className="flex items-center gap-1">
                        <select
                          className="input text-sm py-1 flex-1 min-w-0"
                          value={row.type || ''}
                          onChange={e => changeRowType('gasPipe', i, e.target.value)}
                        >
                          {!row.type && <option value="">Select pipe</option>}
                          {row.type && !opts.some(o => o.label === row.type) && (
                            <option value={row.type}>{row.type}</option>
                          )}
                          {opts.map(o => (
                            <option key={o.label} value={o.label}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </td>
                    <td className="py-1 pr-2">
                      <NumInput value={row.lf} onChange={v => updateGasPipe(i, 'lf', v)} className="w-full text-center" />
                    </td>
                    <td className="py-1 text-right text-gray-400 text-xs pr-2">
                      <span className="flex items-center justify-center gap-1">
                        ${matCost.toFixed(2)}
                      </span>
                    </td>
                    <td className="py-1 text-center text-gray-600 text-xs">
                      {mat > 0 ? `$${mat.toFixed(2)}` : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <button
            type="button"
            className="mt-1 text-xs text-green-700 hover:text-green-900 font-medium"
            onClick={() =>
              setActiveGasPipeRows(r => [
                ...r,
                {
                  type: '',
                  laborType: '',
                  lf: '',
                  vendor: '',
                },
              ])
            }
          >
            + Add row
          </button>
        </div>
      </div>

      {/* ── Gas Fixtures ── */}
      <div>
        <SectionHeader title="Gas Fixtures" />
        <div className="overflow-x-auto">
          <table className="w-full text-sm table-fixed">
            <colgroup>
              <col className="w-[128px]" />
              <col />
              <col className="w-[84px]" />
              <col className="w-[96px]" />
              <col className="w-[96px]" />
            </colgroup>
            <thead>
              <tr className="text-xs text-gray-500 border-b border-gray-200">
                <th className="text-center pb-1 pr-2 font-medium">Vendor</th>
                <th className="text-center pb-1 pr-2 font-medium">Fixture</th>
                <th className="text-center pb-1 pr-2 font-medium">Qty</th>
                <th className="text-center pb-1 pr-2 font-medium text-gray-400">$/Ea</th>
                <th className="text-center pb-1 font-medium text-gray-400">Material $</th>
              </tr>
            </thead>
            <tbody>
              {activeFixtureRows.map((row, i) => {
                const { opts, matOpt, matCost, laborVal, laborBuiltIn } = resolveUtilRow(
                  UTIL_CAT.gas,
                  row,
                  GAS_TYPE_ARR,
                  materialRows,
                  catDefaults,
                  materialPrices
                )
                const mat = n(row.qty) * matCost
                return (
                  <tr key={i} className="border-b border-gray-100">
                    <td className="py-1 pr-2">
                      <select
                        className="input text-sm py-1 w-full"
                        value={effVendor(UTIL_CAT.gas, row.vendor)}
                        onChange={e => changeRowVendor('gas', i, e.target.value)}
                        title="Vendor"
                      >
                        {vendorOptions(UTIL_CAT.gas, row.vendor)}
                      </select>
                    </td>
                    <td className="py-1 pr-2">
                      <div className="flex items-center gap-1">
                        <select
                          className="input text-sm py-1 flex-1 min-w-0"
                          value={row.type || ''}
                          onChange={e => changeRowType('gas', i, e.target.value)}
                        >
                          {!row.type && <option value="">Select fixture</option>}
                          {row.type && !opts.some(o => o.label === row.type) && (
                            <option value={row.type}>{row.type}</option>
                          )}
                          {opts.map(o => (
                            <option key={o.label} value={o.label}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </td>
                    <td className="py-1 pr-2">
                      <NumInput value={row.qty} onChange={v => updateFixture(i, 'qty', v)} className="w-full text-center" />
                    </td>
                    <td className="py-1 text-right text-gray-400 text-xs pr-2">
                      <span className="flex items-center justify-center gap-1">
                        ${matCost.toFixed(2)}
                      </span>
                    </td>
                    <td className="py-1 text-center text-gray-600 text-xs">
                      {mat > 0 ? `$${mat.toFixed(2)}` : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <button
            type="button"
            className="mt-1 text-xs text-green-700 hover:text-green-900 font-medium"
            onClick={() =>
              setActiveFixtureRows(r => [
                ...r,
                {
                  type: '',
                  laborType: '',
                  qty: '',
                  vendor: '',
                },
              ])
            }
          >
            + Add row
          </button>
        </div>
      </div>

      {/* ── Sewer Pipe ── */}
      <div>
        <SectionHeader title="Sewer Pipe" />
        <div className="overflow-x-auto">
          <table className="w-full text-sm table-fixed">
            <colgroup>
              <col className="w-[128px]" />
              <col />
              <col className="w-[84px]" />
              <col className="w-[96px]" />
              <col className="w-[96px]" />
            </colgroup>
            <thead>
              <tr className="text-xs text-gray-500 border-b border-gray-200">
                <th className="text-center pb-1 pr-2 font-medium">Vendor</th>
                <th className="text-center pb-1 pr-2 font-medium">Sewer Pipe</th>
                <th className="text-center pb-1 pr-2 font-medium">Linear Feet</th>
                <th className="text-center pb-1 pr-2 font-medium text-gray-400">$ per Ln Ft</th>
                <th className="text-center pb-1 font-medium text-gray-400">Material $</th>
              </tr>
            </thead>
            <tbody>
              {activeSewerLineRows.map((row, i) => {
                const { opts, matOpt, matCost, laborVal, laborBuiltIn } = resolveUtilRow(
                  UTIL_CAT.sewerLine,
                  row,
                  SEWER_LINE_ARR,
                  materialRows,
                  catDefaults,
                  materialPrices
                )
                const mat = n(row.lf) * matCost
                return (
                  <tr key={i} className="border-b border-gray-100">
                    <td className="py-1 pr-2">
                      <select
                        className="input text-sm py-1 w-full"
                        value={effVendor(UTIL_CAT.sewerLine, row.vendor)}
                        onChange={e => changeRowVendor('sewerLine', i, e.target.value)}
                        title="Vendor"
                      >
                        {vendorOptions(UTIL_CAT.sewerLine, row.vendor)}
                      </select>
                    </td>
                    <td className="py-1 pr-2">
                      <div className="flex items-center gap-1">
                        <select
                          className="input text-sm py-1 flex-1 min-w-0"
                          value={row.type || ''}
                          onChange={e => changeRowType('sewerLine', i, e.target.value)}
                        >
                          {!row.type && <option value="">Select pipe</option>}
                          {row.type && !opts.some(o => o.label === row.type) && (
                            <option value={row.type}>{row.type}</option>
                          )}
                          {opts.map(o => (
                            <option key={o.label} value={o.label}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </td>
                    <td className="py-1 pr-2">
                      <NumInput
                        value={row.lf}
                        onChange={v =>
                          setActiveSewerLineRows(rows =>
                            rows.map((rr, idx) => (idx === i ? { ...rr, lf: v } : rr))
                          )
                        }
                        className="w-full text-center"
                      />
                    </td>
                    <td className="py-1 text-right text-gray-400 text-xs pr-2">
                      <span className="flex items-center justify-center gap-1">
                        ${matCost.toFixed(2)}
                      </span>
                    </td>
                    <td className="py-1 text-center text-gray-600 text-xs">
                      {mat > 0 ? `$${mat.toFixed(2)}` : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <button
            type="button"
            className="mt-1 text-xs text-green-700 hover:text-green-900 font-medium"
            onClick={() =>
              setActiveSewerLineRows(r => [
                ...r,
                { type: '', laborType: '', lf: '', vendor: '' },
              ])
            }
          >
            + Add row
          </button>
        </div>
      </div>

      {/* ── Manual Entry ── */}
      <div>
        <SectionHeader title="Manual Entry" />
        <div className="overflow-x-auto">
          <table className="w-full text-sm table-fixed">
            <colgroup>
              {isSub ? (
                <>
                  <col className="w-1/2" />
                  <col className="w-1/2" />
                </>
              ) : (
                <>
                  <col className="w-1/3" />
                  <col className="w-1/3" />
                  <col className="w-1/3" />
                </>
              )}
            </colgroup>
            <thead>
              <tr className="text-xs text-gray-500 border-b border-gray-200">
                <th className="text-center pb-1 pr-2 font-medium">Description</th>
                {isSub ? (
                  <th className="text-center pb-1 font-medium">Cost $</th>
                ) : (
                  <>
                    <th className="text-center pb-1 pr-2 font-medium">Hours</th>
                    <th className="text-center pb-1 font-medium">Materials $</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {activeManualRows.map((row, i) => (
                <tr key={i} className="border-b border-gray-100">
                  <td className="py-1 pr-2">
                    <input
                      className="input text-sm py-1 w-full"
                      value={row.label}
                      onChange={e => updateManual(i, 'label', e.target.value)}
                    />
                  </td>
                  {isSub ? (
                    <td className="py-1">
                      <div className="flex items-center gap-1">
                        <NumInput value={row.subCost} onChange={v => updateManual(i, 'subCost', v)} className="text-center flex-1" />
                        {activeManualRows.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setActiveManualRows(rows => rows.filter((_, idx) => idx !== i))}
                            className="text-gray-300 hover:text-red-500 text-sm px-1"
                            title="Remove line"
                          >
                            ×
                          </button>
                        )}
                      </div>
                    </td>
                  ) : (
                    <>
                      <td className="py-1 pr-2">
                        <NumInput value={row.hours} onChange={v => updateManual(i, 'hours', v)} className="text-center" />
                      </td>
                      <td className="py-1">
                        <div className="flex items-center gap-1">
                          <NumInput
                            value={row.materials}
                            onChange={v => updateManual(i, 'materials', v)}
                            className="text-center flex-1"
                          />
                          {activeManualRows.length > 1 && (
                            <button
                              type="button"
                              onClick={() => setActiveManualRows(rows => rows.filter((_, idx) => idx !== i))}
                              className="text-gray-300 hover:text-red-500 text-sm px-1"
                              title="Remove line"
                            >
                              ×
                            </button>
                          )}
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          <button
            type="button"
            onClick={() =>
              setActiveManualRows(rows => [
                ...rows,
                { label: '', hours: '', materials: '', subCost: '' },
              ])
            }
            className="mt-2 text-xs px-2 py-1 rounded bg-slate-100 text-slate-700 hover:bg-slate-200"
          >
            + Add manual entry
          </button>
        </div>
      </div>

      {/* ── Actions ── */}
      <div className="flex gap-3 pt-2">
        <button onClick={onBack} className="btn-secondary flex-1">
          ← Back
        </button>
        <button onClick={handleSave} disabled={saving} className="btn-primary flex-1">
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>
    </div>
    </SubTabContext.Provider>
  )
}
