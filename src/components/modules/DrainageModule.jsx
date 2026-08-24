import WorkTypeChooser from './WorkTypeChooser'
import CrewTypeBar from './CrewTypeBar'
import ModuleHeaderSlot from './ModuleHeaderSlot'
import { useState, useEffect, useContext } from 'react'
import { SubTabContext, subSectionTitle } from './subTabContext'
import { supabase } from '../../lib/supabase'
import GpmdBar from './GpmdBar'
import RateEditPopover from '../RateEditPopover'
import { fetchSalesTaxRate } from '../../lib/companyDefaults'
import { calcWalkAccessLabor } from '../../lib/walkAccess'
import { catalogItemFor, catalogOptions, fetchModuleCatalog, fetchStandardRateMap } from '../../lib/materialCatalog'
import UnpricedItemModal from '../UnpricedItemModal'
import { calcDrainage } from './drainageCalc'

// One-picker scheme (matches Concrete/Turf/Steps): Standard resolves to the
// item's null-vendor catalog record — options AND price come from the same row.
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
  sumpPump: { label: 'Sump Pump', dbName: 'Sump Pump' },
  // Curb Core / Hydrocut are pure labor now (2 hrs each) — no material fee.
  curbCore: { label: 'Curb Core', dbName: 'Curb Core', laborOnly: true },
  hydrocut: { label: 'Hydrocut Under Hardscape', dbName: 'Hydrocut Under Hardscape', laborOnly: true },
}

// Labor-coefficient lookup for Additional Items — matches names seeded in
// supabase-drainage-labor-coefficients.sql so the popover edits the right row.
const ADD_ITEM_LABOR_RATE_NAME = {
  sumpPump: 'Drainage Sump Pump Labor',
  // Shared Basic Labor rate — same curb-core labor row every module uses.
  curbCore: 'Basic Labor - Curb Core',
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
const n = v => parseFloat(v) || 0

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
  // Option VALUE = the item's frozen ref_key (picker stores it); LABEL = live
  // description. Rename-proof and survives a saved estimate.
  return catRows.map(o => ({ value: o.ref_key || o.label, label: o.label }))
}

// materialPrices — { 'dbName': unit_cost, ... } fetched from material_rates

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

// ── Default blank rows ─────────────────────────────────────────────────────────
const DEFAULT_TRENCH_ROWS = [{ equipment: 'Hand', lf: '', width: '', depth: '' }]
const DEFAULT_PIPE_ROWS = [{ type: '', lf: '', vendor: '' }]
const DEFAULT_FIXTURE_ROWS = [{ type: '', qty: '', vendor: '' }]
const DEFAULT_FRENCH_ROWS = [
  { type: '', lf: '', vendor: '' },
]
const DEFAULT_ADDITIONAL = {
  sumpPumpQty: '',
  curbCoreQty: '',
  hydrocutQty: '',
}
const DEFAULT_MANUAL_ROWS = [{ label: '', hours: '', materials: '', subCost: '' }]

// ── Main Component ─────────────────────────────────────────────────────────────
export default function DrainageModule({ onSave, onBack, saving, initialData }) {
  const [laborRatePerHour, setLaborRatePerHour] = useState(
    initialData?.laborRatePerHour ?? null
  )
  const [laborBurdenPct, setLaborBurdenPct] = useState(
    initialData?.laborBurdenPct ?? null
  )
  const [gpmd, setGpmd] = useState(initialData?.gpmd ?? null)
  const [subGpMarkupRate, setSubGpMarkupRate] = useState(initialData?.subGpMarkupRate ?? null)
  const [commissionRate, setCommissionRate] = useState(initialData?.commissionRate ?? null)

  // Free-text notes for this module — Sam writes auto-generated
  // takeoffs here via create_estimate_from_takeoff, and the user can
  // overwrite / append their own.
  const [notes, setNotes] = useState(initialData?.notes ?? '')
  const [distanceLF, setDistanceLF] = useState(initialData?.distanceLF ?? '')
  const [walkAccess, setWalkAccess] = useState(
    initialData?.walkAccess ?? {
      paceLfPerMin: null,
    }
  )
  // Live material prices from material_rates table (category='Drainage')
  // When editing, use the snapshot saved at the time the module was created
  const [materialPrices, setMaterialPrices] = useState(initialData?.materialPrices ?? {})
  const [subRates, setSubRates] = useState(initialData?.subRates ?? {})
  const [pricesLoading, setPricesLoading] = useState(!initialData?.materialPrices)
  // Vendor catalog (material_rates rows with sub_category + vendor_id) + vendor list.
  const [materialRows, setMaterialRows] = useState(initialData?.materialRows ?? [])
  const [vendors, setVendors] = useState([])
  // Drainage labor rates (independent of material) — feed the per-row Labor picker.
  const [laborRateRows, setLaborRateRows] = useState([])
  const [laborModalItem, setLaborModalItem] = useState(null)
  useEffect(() => {
    let alive = true
    Promise.all([
      fetchModuleCatalog(['Drainage']),
      supabase
        .from('subs_vendors')
        .select('id, company_name')
        .eq('type', 'vendor')
        .order('company_name'),
      supabase
        .from('labor_rates')
        .select('name, sub_category, rate, unit')
        .eq('category', 'Drainage')
        .order('name'),
    ]).then(([rows, venRes, labRes]) => {
      if (!alive) return
      setMaterialRows(rows || [])
      setLaborRateRows(labRes.data || [])
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

  // Pulled out so RateEditPopover can call it after the user saves a new
  // master-rate value — picks up the change without a page refresh. Fetches
  // both the Drainage material rates and the Drainage subcontractor rates.
  async function refreshMaterialPrices() {
    // material_rates retired: base map via the new model; catalog
    // subcategories ('Drain Pipe' / 'Drain Fixtures') already match the
    // module's markers.
    const [matMap, subRes] = await Promise.all([
      fetchStandardRateMap(['Drainage', 'Basic Labor']),
      supabase.from('subcontractor_rates').select('item_key, rate').eq('category', 'Drainage'),
    ])
    setMaterialPrices(initialData?.materialPrices ? { ...matMap, ...initialData.materialPrices } : matMap)
    if (subRes.data) {
      const sr = {}
      subRes.data.forEach(r => {
        sr[r.item_key] = parseFloat(r.rate) || 0
      })
      setSubRates(sr)
    }
    setPricesLoading(false)
  }

  useEffect(() => {
    // Fetch labor rate unless we already have it from initialData
    if (!initialData?.laborRatePerHour) {
      supabase
        .from('company_settings')
        .select('labor_rate_per_hour, labor_burden_pct, walk_access_pace_lf_per_min, estimate_gpmd_default, commission_rate, sub_gp_markup_rate')
        .single()
        .then(({ data }) => {
          if (!data) return
          if (data.labor_rate_per_hour != null)
            setLaborRatePerHour(parseFloat(data.labor_rate_per_hour))
          if (data.labor_burden_pct != null)
            setLaborBurdenPct(parseFloat(data.labor_burden_pct))
          if (data.estimate_gpmd_default != null)
            setGpmd(parseFloat(data.estimate_gpmd_default))
          if (data.commission_rate != null)
            setCommissionRate(parseFloat(data.commission_rate))
          if (data.sub_gp_markup_rate != null)
            setSubGpMarkupRate(parseFloat(data.sub_gp_markup_rate))
          if (data.walk_access_pace_lf_per_min != null) {
            const _wpace = parseFloat(data.walk_access_pace_lf_per_min)
            setWalkAccess({
              paceLfPerMin: Number.isFinite(_wpace) && _wpace > 0 ? _wpace : null,
            })
          }
        })
    }

    // Always refresh the catalog on open so newly-added Master Rates items appear.
    refreshMaterialPrices()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])


  const [difficulty, setDifficulty] = useState(initialData?.difficulty ?? '')
  const [hoursAdj, setHoursAdj] = useState(initialData?.hoursAdj ?? '')
  const [crewType, setCrewType] = useState(initialData?.crewType ?? 'Demo')
  const [subType, setSubType] = useState(initialData?.subType ?? 'In-House')
  const isSub = subType === 'Subcontractor'
  const [trenchRows, setTrenchRows] = useState(initialData?.trenchRows ?? DEFAULT_TRENCH_ROWS)
  // Subcontractor tab has its OWN trench-run LF list, independent of In-House.
  const [subTrenchRows, setSubTrenchRows] = useState(
    initialData?.subTrenchRows ?? [{ lf: '' }, { lf: '' }]
  )
  const [pipeRows, setPipeRows] = useState(initialData?.pipeRows ?? DEFAULT_PIPE_ROWS)
  // French Drains — In-House perforated pipe + section-level fabric wrap + gravel bed.
  const [frenchRows, setFrenchRows] = useState(initialData?.frenchRows ?? DEFAULT_FRENCH_ROWS)
  const [frenchFabric, setFrenchFabric] = useState(initialData?.frenchFabric ?? 'None')
  const [frenchGravel, setFrenchGravel] = useState(initialData?.frenchGravel ?? 'None')
  const [fixtureRows, setFixtureRows] = useState(initialData?.fixtureRows ?? DEFAULT_FIXTURE_ROWS)
  const [additionalItems, setAdditionalItems] = useState(
    initialData?.additionalItems ?? DEFAULT_ADDITIONAL
  )
  // Subcontractor tab has its OWN Drain Fixtures + Additional Items, priced as
  // flat sub costs — independent of the In-House hourly sections above.
  const [subFixtureRows, setSubFixtureRows] = useState(
    initialData?.subFixtureRows ?? DEFAULT_FIXTURE_ROWS.map(r => ({ ...r }))
  )
  const [subAdditionalItems, setSubAdditionalItems] = useState(
    initialData?.subAdditionalItems ?? {
      sumpPumpQty: '',
      curbCoreQty: '',
      hydrocutLF: '',
    }
  )
  const [manualRows, setManualRows] = useState(initialData?.manualRows ?? DEFAULT_MANUAL_ROWS)

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

  // ── Vendor catalog helpers (material-only, per-row Vendor picker) ────────
  // Resolve a stored Type (frozen material ref_key; legacy id/name still work) to
  // the item's display name via the live catalog — used only by the orphan-value
  // fallback option so a stored key never renders raw. Strips the "<sub> - " prefix.
  const matName = key => {
    if (!key) return key
    const hit = (materialRows || []).find(r => r.ref_key === key || r.id === key || r.name === key)
    if (!hit) return key
    const dash = hit.name ? hit.name.indexOf(' - ') : -1
    return dash > 0 ? hit.name.slice(dash + 3) : hit.name
  }
  const vendorsForCategory = cat => vendors.filter(v => materialRows.some(r => r.vendor_id === v.id && (r.sub_category === cat || r.category === cat)))
  const defaultVendorFor = cat => vendorsForCategory(cat)[0]?.id || 'Standard'
  const catDefaults = {
    [DRAIN_CAT.pipe]: defaultVendorFor(DRAIN_CAT.pipe),
    [DRAIN_CAT.french]: defaultVendorFor(DRAIN_CAT.french),
    [DRAIN_CAT.fixture]: defaultVendorFor(DRAIN_CAT.fixture),
  }
  // Per-row Vendor picker defaults to an empty "Select vendor" placeholder; rows
  // are NOT auto-assigned a default vendor. An unset vendor yields an empty Type
  // list, so the row stays $0 until the user picks a vendor (then a type).

  const calcRaw = calcDrainage(
    {
      difficulty,
      hoursAdj,
      trenchRows,
      pipeRows,
      fixtureRows,
      frenchRows,
      frenchFabric,
      frenchGravel,
      additionalItems,
      manualRows,
      subTrenchRows,
      subFixtureRows,
      subAdditionalItems,
      distanceLF,
      subType,
    },
    laborRatePerHour,
    materialPrices,
    gpmd,
    walkAccess,
    laborBurdenPct,
    subRates,
    subGpMarkupRate,
    materialRows,
    catDefaults,
    commissionRate
  )
  const PIPE_T = { ...PIPE_TYPES, ...masterDrainTypes(DRAIN_CAT.pipe, PIPE_TYPES, materialRows, 'laborPerLF') }
  const FIX_T = { ...FIXTURE_TYPES, ...masterDrainTypes(DRAIN_CAT.fixture, FIXTURE_TYPES, materialRows, 'laborHrs') }
  const FRENCH_PIPE_T = { ...FRENCH_PIPE_TYPES, ...masterDrainTypes(DRAIN_CAT.french, FRENCH_PIPE_TYPES, materialRows, 'laborPerLF') }
  // Independent Labor picker options, sourced straight from the Drainage labor_rates
  // (by sub_category), with a readable label. Nothing links these to a material.
  const cleanLaborLabel = name => String(name || '').replace(/^Drainage\s+/, '').replace(/\s+Labor$/, '')
  const laborOptionsFor = sub =>
    (laborRateRows || [])
      .filter(r => r.sub_category === sub)
      .map(r => ({ value: r.name, label: cleanLaborLabel(r.name) }))
  const PIPE_LABOR_OPTS = laborOptionsFor('Pipe')
  const FRENCH_LABOR_OPTS = laborOptionsFor('French Drain')
  const FIX_LABOR_OPTS = laborOptionsFor('Fixtures')
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
  function updatePipe(i, field, val) {
    setPipeRows(rows => rows.map((r, idx) => (idx === i ? { ...r, [field]: val } : r)))
  }
  function updateFrench(i, field, val) {
    setFrenchRows(rows => rows.map((r, idx) => (idx === i ? { ...r, [field]: val } : r)))
  }
  function updateFixture(i, field, val) {
    setFixtureRows(rows => rows.map((r, idx) => (idx === i ? { ...r, [field]: val } : r)))
  }
  function updateSubFixture(i, field, val) {
    setSubFixtureRows(rows => rows.map((r, idx) => (idx === i ? { ...r, [field]: val } : r)))
  }
  function updateManual(i, field, val) {
    setManualRows(rows => rows.map((r, idx) => (idx === i ? { ...r, [field]: val } : r)))
  }

  function handleSave() {
    onSave({
      notes,
      man_days: parseFloat(calc.manDays.toFixed(2)),
      material_cost: parseFloat(calc.totalMat.toFixed(2)),
      data: {
        difficulty,
        trenchRows,
        subTrenchRows,
        pipeRows,
        fixtureRows,
        frenchRows,
        frenchFabric,
        frenchGravel,
        additionalItems,
        subFixtureRows,
        subAdditionalItems,
        manualRows,
        subType,
        laborRatePerHour,
        laborBurdenPct,
        gpmd,
        subGpMarkupRate,
        commissionRate,
        walkAccess,
        materialPrices, // snapshot of prices used — so the summary always reflects save-time costs
        // Persist the catalog snapshot so the summary can resolve each row's frozen
        // material ref_key → name (live estimate re-fetches; a frozen bid reads this).
        materialRows,
        subRates,
        calc,
      },
    })
  }

  // ── Grouped rate list for the "View Rates" popup (CrewTypeBar). Every rate
  //    that used to have an inline RateEditPopover in this module now lives here.
  //    Each section lists its LABOR rates first, then every MATERIAL rate (one
  //    row per vendor, Standard first) resolved from the module's catalog —
  //    mirrors the Walls / Utilities View Rates.
  const vendorNames = Object.fromEntries((vendors || []).map(v => [v.id, v.name]))
  // Catalog material rows for a sub_category: one currency row per vendor
  // (Standard/null-vendor first), each editable straight to material_price.
  const catalogBlockItems = subcat =>
    (materialRows || [])
      .filter(r0 => r0.sub_category === subcat)
      .filter(r0 => r0.vendor_id == null || vendorNames[r0.vendor_id])
      .sort((a, b) => {
        const va = a.vendor_id == null ? '' : vendorNames[a.vendor_id] || '~'
        const vb = b.vendor_id == null ? '' : vendorNames[b.vendor_id] || '~'
        return va.localeCompare(vb) || (a.name || '').localeCompare(b.name || '')
      })
      .map(r0 => ({
        label: `${r0.vendor_id ? vendorNames[r0.vendor_id] || 'Vendor' : 'Standard'} — ${r0.name}`,
        table: 'material_price',
        materialId: r0.id,
        vendorId: r0.vendor_id || undefined,
        category: 'Drainage',
        unitLabel: r0.unit || 'ea',
        mode: 'currency',
        value: n(r0.unit_cost),
      }))

  return (
    <SubTabContext.Provider value={isSub}>
    <div className="space-y-5">
      {/* ── Frozen header: GPMD bar + Crew Type / View Rates bar ── */}
      <div className="sticky top-0 z-20 -mx-6 bg-white shadow-md">
        <div className="px-6 pt-1 pb-1 bg-gray-900">
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
            variant={isSub ? 'sub' : 'inhouse'}
          />
        </div>
        <div className="px-6 py-2">
          <CrewTypeBar
            crewType={crewType}
            onCrewTypeChange={setCrewType}
            title="Drainage"
            moduleType="Drainage"
            refreshAllRates={refreshMaterialPrices}
            showInlineToggle={false}
          />
        </div>
      </div>

      <ModuleHeaderSlot>
        <WorkTypeChooser value={subType || 'In-House'} onChange={setSubType} compact />
      </ModuleHeaderSlot>

      {/* Prices loading notice */}
      {pricesLoading && (
        <div className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2">
          Loading material prices from Master Rates…
        </div>
      )}

      {/* Settings — In-House only. The sub side is a fixed $/LF cost, so job
          site conditions and the difficulty/hours modifiers don't apply. */}
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

      {/* ── Drainage (Subcontractor) ── */}
      {isSub ? (
        <>
        <div>
          <SectionHeader title="Drainage — Subcontractor" />
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-500 border-b border-gray-200">
                  <th className="text-left pb-1 pr-2 font-medium">Run</th>
                  <th className="text-left pb-1 pr-2 font-medium">Linear Feet</th>
                  <th className="text-right pb-1 font-medium">Cost</th>
                </tr>
              </thead>
              <tbody>
                {subTrenchRows.map((row, i) => (
                  <tr key={i} className="border-b border-gray-100">
                    <td className="py-1 pr-2 text-gray-600 text-xs">Run {i + 1}</td>
                    <td className="py-1 pr-2">
                      <NumInput
                        value={row.lf}
                        onChange={v =>
                          setSubTrenchRows(rows =>
                            rows.map((r, idx) => (idx === i ? { ...r, lf: v } : r))
                          )
                        }
                      />
                    </td>
                    <td className="py-1 text-right text-gray-600 text-xs">
                      {n(row.lf) > 0 ? `$${(n(row.lf) * calc.subRatePerLF).toFixed(2)}` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button
              type="button"
              className="mt-1 text-xs text-green-700 hover:text-green-900 font-medium"
              onClick={() => setSubTrenchRows(r => [...r, { lf: '' }])}
            >
              + Add run
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-2 inline-flex items-center gap-1">
            ${calc.subRatePerLF}/LF × {calc.subLf} Ln Ft = ${calc.subDrainCost.toFixed(2)}
          </p>
        </div>

        {/* ── Drain Fixtures (Subcontractor — flat) ── */}
        <div>
          <SectionHeader title="Drain Fixtures" />
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-500 border-b border-gray-200">
                  <th className="text-left pb-1 pr-2 font-medium">Fixture Type</th>
                  <th className="text-left pb-1 pr-2 font-medium">Qty</th>
                  <th className="text-right pb-1 font-medium text-gray-400">Cost</th>
                </tr>
              </thead>
              <tbody>
                {subFixtureRows.map((row, i) => (
                  <tr key={i} className="border-b border-gray-100">
                    <td className="py-1 pr-2">
                      <select
                        className="input text-sm py-1 w-full min-w-0"
                        value={row.type || ''}
                        onChange={e => updateSubFixture(i, 'type', e.target.value)}
                      >
                        {!row.type && <option value="">Select fixture</option>}
                        {row.type && !Object.keys(FIX_T).includes(row.type) && (
                          <option value={row.type}>{row.type}</option>
                        )}
                        {Object.keys(FIX_T).map(t => (
                          <option key={t}>{t}</option>
                        ))}
                      </select>
                    </td>
                    <td className="py-1 pr-2">
                      <NumInput value={row.qty} onChange={v => updateSubFixture(i, 'qty', v)} />
                    </td>
                    <td className="py-1 text-right text-gray-600 text-xs">
                      {n(row.qty) > 0
                        ? `$${(n(row.qty) * calc.subFixtureFlat).toFixed(2)}`
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button
              type="button"
              className="mt-1 text-xs text-green-700 hover:text-green-900 font-medium"
              onClick={() => setSubFixtureRows(r => [...r, { type: '', qty: '' }])}
            >
              + Add fixture
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-2 inline-flex items-center gap-1">
            ${calc.subFixtureFlat}/fixture × {calc.subFixQty} = ${calc.subFixtureCost.toFixed(2)}
          </p>
        </div>

        {/* ── Additional Items (Subcontractor — flat) ── */}
        <div>
          <SectionHeader title="Additional Items" />
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-500 border-b border-gray-200">
                  <th className="text-left pb-1 pr-2 font-medium">Item</th>
                  <th className="text-left pb-1 pr-2 font-medium w-32">Qty</th>
                  <th className="text-right pb-1 font-medium text-gray-400">Cost</th>
                </tr>
              </thead>
              <tbody>
                {[
                  {
                    key: 'sumpPumpQty',
                    label: 'Sump Pump',
                    rate: calc.subSumpPumpRate,
                    rateName: 'Drainage Sub - Sump Pump',
                    unit: 'ea',
                  },
                  {
                    key: 'curbCoreQty',
                    label: 'Curb Core',
                    rate: calc.subCurbCoreRate,
                    rateName: 'Drainage Sub - Curb Core',
                    unit: 'ea',
                  },
                  {
                    key: 'hydrocutLF',
                    label: 'Hydro Cut',
                    rate: calc.subHydrocutRate,
                    rateName: 'Drainage Sub - Hydrocut Per LF',
                    unit: 'LF',
                    qtyLabel: 'Linear Feet',
                  },
                ].map(item => {
                  const qty = n(subAdditionalItems[item.key])
                  return (
                    <tr key={item.key} className="border-b border-gray-100">
                      <td className="py-1.5 pr-2 text-xs text-gray-700">{item.label}</td>
                      <td className="py-1.5 pr-2">
                        {item.qtyLabel && (
                          <span className="text-[10px] text-gray-400 block leading-none mb-0.5">
                            {item.qtyLabel}
                          </span>
                        )}
                        <input
                          type="number"
                          step="any"
                          className="input text-sm py-1 w-24"
                          placeholder="0"
                          value={subAdditionalItems[item.key]}
                          onChange={e =>
                            setSubAdditionalItems(p => ({ ...p, [item.key]: e.target.value }))
                          }
                        />
                      </td>
                      <td className="py-1.5 text-right text-gray-600 text-xs">
                        <span className="inline-flex items-center justify-end">
                          {qty > 0
                            ? `$${(qty * item.rate).toFixed(2)}`
                            : `$${item.rate} / ${item.unit}`}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
        </>
      ) : (
        <>
      {/* ── Trenching ── */}
      <div>
        <SectionHeader title="Trenching" />
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
                const cf = lf > 0 && w > 0 && d > 0 ? lf * (w / 12) * (d / 12) : 0
                // Use the same rate source as the calc (DB value first, hardcoded
                // fallback second) so the row's Est. Hrs matches the GPMD total.
                const laborName = TRENCH_LABOR_RATE_NAME[row.equipment]
                const hrsPerCf = n(materialPrices[laborName])
                const hrs = cf > 0 ? cf * hrsPerCf : 0
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
            onClick={() =>
              setTrenchRows(rows => [...rows, { equipment: 'Hand', lf: '', width: '', depth: '' }])
            }
            className="mt-2 text-xs px-2 py-1 rounded bg-slate-100 text-slate-700 hover:bg-slate-200"
          >
            + Add Row
          </button>
        </div>
      </div>

      {calc.laborUnset && calc.laborUnset.length > 0 && (
        <div className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
          <b>Labor rate needed.</b> These selected items have no default labor rate (or it resolves to 0),
          so their hours aren't priced. Click one to set it inline:
          <span className="ml-1 inline-flex flex-wrap gap-1 align-middle">
            {calc.laborUnset.map((u, i) =>
              u.name ? (
                <button
                  key={u.name || i}
                  type="button"
                  onClick={() => setLaborModalItem(u)}
                  className="rounded border border-amber-400 bg-white/70 px-1.5 py-0.5 font-medium text-amber-900 hover:bg-white"
                >
                  {u.label} ↗
                </button>
              ) : (
                <span key={(u.label || '') + i} className="px-1 py-0.5 text-amber-800">
                  {u.label}
                </span>
              )
            )}
          </span>
        </div>
      )}

      <UnpricedItemModal
        item={laborModalItem}
        onClose={() => setLaborModalItem(null)}
        onSaved={refreshMaterialPrices}
      />

      {/* ── Solid Drain Pipe ── */}
      <div>
        <SectionHeader title="Solid Drain Pipe" />
        <div className="overflow-x-auto">
          <table className="w-full text-sm table-fixed">
            <colgroup>
              <col className="w-[120px]" />
              <col />
              <col className="w-[70px]" />
              <col className="w-[76px]" />
              <col className="w-[84px]" />
              <col className="w-[72px]" />
            </colgroup>
            <thead>
              <tr className="text-xs text-gray-500 border-b border-gray-200">
                <th className="text-center pb-1 pr-2 font-medium">Vendor</th>
                <th className="text-center pb-1 pr-2 font-medium">Pipe Type</th>
                <th className="text-center pb-1 pr-2 font-medium">Linear Feet</th>
                <th className="text-center pb-1 pr-2 font-medium text-gray-400">$ per Ln Ft</th>
                <th className="text-center pb-1 pr-2 font-medium text-gray-400">Material $</th>
                <th className="text-center pb-1 font-medium text-gray-400">Labor Hrs</th>
              </tr>
            </thead>
            <tbody>
              {pipeRows.map((row, i) => {
                const rate = PIPE_T[row.type]
                const { dbName, cost, row: vrow } = drainMatCost(
                  DRAIN_CAT.pipe,
                  row,
                  PIPE_T,
                  materialRows,
                  catDefaults,
                  materialPrices
                )
                const mat = n(row.lf) * cost
                const effLabor = row.laborType || vrow?.calc_meta?.labor_rate || ''
                const laborHrs = n(row.lf) * n(materialPrices[effLabor])
                return (
                  <tr key={i} className="border-b border-gray-100">
                    <td className="py-1 pr-2">
                      <select
                        className="input text-sm py-1 w-full"
                        value={row.vendor || ''}
                        onChange={e => updatePipe(i, 'vendor', e.target.value)}
                        title="Vendor"
                      >
                        {!row.vendor && <option value="">Select</option>}
                        {row.vendor &&
                          row.vendor !== 'Standard' &&
                          !vendorsForCategory(DRAIN_CAT.pipe).some(v => v.id === row.vendor) && (
                            <option value={row.vendor}>{vendorNames[row.vendor] || row.vendor}</option>
                          )}
                        {vendorsForCategory(DRAIN_CAT.pipe).map(v => (
                          <option key={v.id} value={v.id}>
                            {v.name}
                          </option>
                        ))}
                        <option value="Standard">Standard</option>
                      </select>
                    </td>
                    <td className="py-1 pr-2">
                      <div className="flex items-center gap-1">
                        <select
                          className="input text-sm py-1 flex-1 min-w-0"
                          value={row.type || ''}
                          onChange={e => updatePipe(i, 'type', e.target.value)}
                        >
                          {(() => {
                            const pipeOpts = drainTypeOptions(
                              DRAIN_CAT.pipe,
                              PIPE_TYPES,
                              materialRows,
                              row.vendor
                            )
                            return (
                              <>
                                {!row.type && <option value="">Select pipe</option>}
                                {row.type &&
                                  !pipeOpts.some(o => o.value === row.type || o.label === row.type) && (
                                    <option value={row.type}>{matName(row.type)}</option>
                                  )}
                                {pipeOpts.map(o => (
                                  <option key={o.value} value={o.value}>
                                    {o.label}
                                  </option>
                                ))}
                              </>
                            )
                          })()}
                        </select>
                      </div>
                    </td>
                    <td className="py-1 pr-2">
                      <NumInput value={row.lf} onChange={v => updatePipe(i, 'lf', v)} className="w-full text-center" />
                    </td>
                    <td className="py-1 text-right text-gray-400 text-xs pr-2">
                      <span className="flex items-center justify-center">
                        ${cost.toFixed(2)}
                      </span>
                    </td>
                    <td className="py-1 text-center text-gray-600 text-xs pr-2">
                      {mat > 0 ? `$${mat.toFixed(2)}` : '—'}
                    </td>
                    <td className="py-1 text-center text-gray-600 text-xs">
                      {laborHrs > 0 ? laborHrs.toFixed(2) : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <button
            type="button"
            onClick={() =>
              setPipeRows(rows => [...rows, { type: '', lf: '', vendor: '' }])
            }
            className="mt-2 text-xs px-2 py-1 rounded bg-slate-100 text-slate-700 hover:bg-slate-200"
          >
            + Add Row
          </button>
        </div>
      </div>

      {/* ── French Drains ── */}
      <div>
        <SectionHeader title="French Drains" />
        <div className="overflow-x-auto">
          <table className="w-full text-sm table-fixed">
            <colgroup>
              <col className="w-[120px]" />
              <col />
              <col className="w-[70px]" />
              <col className="w-[76px]" />
              <col className="w-[84px]" />
              <col className="w-[72px]" />
            </colgroup>
            <thead>
              <tr className="text-xs text-gray-500 border-b border-gray-200">
                <th className="text-center pb-1 pr-2 font-medium">Vendor</th>
                <th className="text-center pb-1 pr-2 font-medium">Pipe Type</th>
                <th className="text-center pb-1 pr-2 font-medium">Linear Feet</th>
                <th className="text-center pb-1 pr-2 font-medium text-gray-400">$ per Ln Ft</th>
                <th className="text-center pb-1 pr-2 font-medium text-gray-400">Material $</th>
                <th className="text-center pb-1 font-medium text-gray-400">Labor Hrs</th>
              </tr>
            </thead>
            <tbody>
              {frenchRows.map((row, i) => {
                const rate = FRENCH_PIPE_T[row.type]
                const { cost, row: vrow } = drainMatCost(
                  DRAIN_CAT.french,
                  row,
                  FRENCH_PIPE_T,
                  materialRows,
                  catDefaults,
                  materialPrices
                )
                const mat = n(row.lf) * cost
                const effLabor = row.laborType || vrow?.calc_meta?.labor_rate || ''
                const laborHrs = n(row.lf) * n(materialPrices[effLabor])
                return (
                  <tr key={i} className="border-b border-gray-100">
                    <td className="py-1 pr-2">
                      <select
                        className="input text-sm py-1 w-full"
                        value={row.vendor || ''}
                        onChange={e => updateFrench(i, 'vendor', e.target.value)}
                        title="Vendor"
                      >
                        {!row.vendor && <option value="">Select</option>}
                        {row.vendor &&
                          row.vendor !== 'Standard' &&
                          !vendorsForCategory(DRAIN_CAT.french).some(v => v.id === row.vendor) && (
                            <option value={row.vendor}>{vendorNames[row.vendor] || row.vendor}</option>
                          )}
                        {vendorsForCategory(DRAIN_CAT.french).map(v => (
                          <option key={v.id} value={v.id}>
                            {v.name}
                          </option>
                        ))}
                        <option value="Standard">Standard</option>
                      </select>
                    </td>
                    <td className="py-1 pr-2">
                      <div className="flex items-center gap-1">
                        <select
                          className="input text-sm py-1 flex-1 min-w-0"
                          value={row.type || ''}
                          onChange={e => updateFrench(i, 'type', e.target.value)}
                        >
                          {(() => {
                            const frenchOpts = drainTypeOptions(
                              DRAIN_CAT.french,
                              FRENCH_PIPE_TYPES,
                              materialRows,
                              row.vendor
                            )
                            return (
                              <>
                                {!row.type && <option value="">Select pipe</option>}
                                {row.type &&
                                  !frenchOpts.some(o => o.value === row.type || o.label === row.type) && (
                                    <option value={row.type}>{matName(row.type)}</option>
                                  )}
                                {frenchOpts.map(o => (
                                  <option key={o.value} value={o.value}>
                                    {o.label}
                                  </option>
                                ))}
                              </>
                            )
                          })()}
                        </select>
                      </div>
                    </td>
                    <td className="py-1 pr-2">
                      <NumInput value={row.lf} onChange={v => updateFrench(i, 'lf', v)} className="w-full text-center" />
                    </td>
                    <td className="py-1 text-right text-gray-400 text-xs pr-2">
                      <span className="flex items-center justify-center">
                        ${cost.toFixed(2)}
                      </span>
                    </td>
                    <td className="py-1 text-center text-gray-600 text-xs pr-2">
                      {mat > 0 ? `$${mat.toFixed(2)}` : '—'}
                    </td>
                    <td className="py-1 text-center text-gray-600 text-xs">
                      {laborHrs > 0 ? laborHrs.toFixed(2) : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <button
            type="button"
            onClick={() =>
              setFrenchRows(rows => [...rows, { type: '', lf: '', vendor: '' }])
            }
            className="mt-2 text-xs px-2 py-1 rounded bg-slate-100 text-slate-700 hover:bg-slate-200"
          >
            + Add Row
          </button>
        </div>
        {/* Fabric + Gravel Bed — applied to the TOTAL French-drain linear feet */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
          <div>
            <p className="text-xs text-gray-500 mb-0.5">Fabric</p>
            <select
              className="input text-sm py-1.5 w-full"
              value={frenchFabric}
              onChange={e => setFrenchFabric(e.target.value)}
            >
              <option value="None">None</option>
              <option value="Drain Sock">Drain Sock</option>
              <option value="Burrito Wrap">Burrito Wrap</option>
            </select>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-0.5">Gravel Bed</p>
            <select
              className="input text-sm py-1.5 w-full"
              value={frenchGravel}
              onChange={e => setFrenchGravel(e.target.value)}
            >
              <option value="None">None</option>
              <option value='12"'>12"</option>
              <option value='24"'>24"</option>
            </select>
          </div>
        </div>
      </div>

        </>
      )}

      {/* ── Fixtures (In-House) ── */}
      {!isSub && (
      <div>
        <SectionHeader title="Drain Fixtures" />
        <div className="overflow-x-auto">
          <table className="w-full text-sm table-fixed">
            <colgroup>
              <col className="w-[120px]" />
              <col />
              <col className="w-[70px]" />
              <col className="w-[76px]" />
              <col className="w-[84px]" />
              <col className="w-[72px]" />
            </colgroup>
            <thead>
              <tr className="text-xs text-gray-500 border-b border-gray-200">
                <th className="text-center pb-1 pr-2 font-medium">Vendor</th>
                <th className="text-center pb-1 pr-2 font-medium">Fixture Type</th>
                <th className="text-center pb-1 pr-2 font-medium">Qty</th>
                <th className="text-center pb-1 pr-2 font-medium text-gray-400">$/Ea</th>
                <th className="text-center pb-1 pr-2 font-medium text-gray-400">Material $</th>
                <th className="text-center pb-1 font-medium text-gray-400">Labor Hrs</th>
              </tr>
            </thead>
            <tbody>
              {fixtureRows.map((row, i) => {
                const rate = FIX_T[row.type]
                const { dbName, cost, row: vrow } = drainMatCost(
                  DRAIN_CAT.fixture,
                  row,
                  FIX_T,
                  materialRows,
                  catDefaults,
                  materialPrices
                )
                const mat = n(row.qty) * cost
                const effLabor = row.laborType || vrow?.calc_meta?.labor_rate || ''
                const laborHrs = n(row.qty) * n(materialPrices[effLabor])
                return (
                  <tr key={i} className="border-b border-gray-100">
                    <td className="py-1 pr-2">
                      <select
                        className="input text-sm py-1 w-full"
                        value={row.vendor || ''}
                        onChange={e => updateFixture(i, 'vendor', e.target.value)}
                        title="Vendor"
                      >
                        {!row.vendor && <option value="">Select</option>}
                        {row.vendor &&
                          row.vendor !== 'Standard' &&
                          !vendorsForCategory(DRAIN_CAT.fixture).some(v => v.id === row.vendor) && (
                            <option value={row.vendor}>{vendorNames[row.vendor] || row.vendor}</option>
                          )}
                        {vendorsForCategory(DRAIN_CAT.fixture).map(v => (
                          <option key={v.id} value={v.id}>
                            {v.name}
                          </option>
                        ))}
                        <option value="Standard">Standard</option>
                      </select>
                    </td>
                    <td className="py-1 pr-2">
                      <div className="flex items-center gap-1">
                        <select
                          className="input text-sm py-1 flex-1 min-w-0"
                          value={row.type || ''}
                          onChange={e => updateFixture(i, 'type', e.target.value)}
                        >
                          {(() => {
                            const fixOpts = drainTypeOptions(
                              DRAIN_CAT.fixture,
                              FIXTURE_TYPES,
                              materialRows,
                              row.vendor
                            )
                            return (
                              <>
                                {!row.type && <option value="">Select fixture</option>}
                                {row.type &&
                                  !fixOpts.some(o => o.value === row.type || o.label === row.type) && (
                                    <option value={row.type}>{matName(row.type)}</option>
                                  )}
                                {fixOpts.map(o => (
                                  <option key={o.value} value={o.value}>
                                    {o.label}
                                  </option>
                                ))}
                              </>
                            )
                          })()}
                        </select>
                      </div>
                    </td>
                    <td className="py-1 pr-2">
                      <NumInput value={row.qty} onChange={v => updateFixture(i, 'qty', v)} className="w-full text-center" />
                    </td>
                    <td className="py-1 text-right text-gray-400 text-xs pr-2">
                      <span className="flex items-center justify-center">
                        {rate ? `$${cost.toFixed(2)}` : '—'}
                      </span>
                    </td>
                    <td className="py-1 text-center text-gray-600 text-xs pr-2">
                      {mat > 0 ? `$${mat.toFixed(2)}` : '—'}
                    </td>
                    <td className="py-1 text-center text-gray-600 text-xs">
                      {laborHrs > 0 ? laborHrs.toFixed(2) : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <button
            type="button"
            onClick={() =>
              setFixtureRows(rows => [...rows, { type: '', qty: '', vendor: '' }])
            }
            className="mt-2 text-xs px-2 py-1 rounded bg-slate-100 text-slate-700 hover:bg-slate-200"
          >
            + Add Row
          </button>
        </div>
      </div>

      )}

      {/* ── Additional Items (In-House) ── */}
      {!isSub && (
      <div>
        <SectionHeader title="Additional Items" />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 border-b border-gray-200">
                <th className="text-left pb-1 pr-2 font-medium">Item</th>
                <th className="text-left pb-1 pr-2 font-medium w-24">Qty</th>
                <th className="text-right pb-1 pr-2 font-medium text-gray-400">Labor Hrs</th>
                <th className="text-right pb-1 font-medium text-gray-400">Material $</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(ADD_ITEM_RATES).map(([key, rate]) => {
                const qty = n(additionalItems[`${key}Qty`])
                const matCost = n(materialPrices[rate.dbName])
                const laborName = ADD_ITEM_LABOR_RATE_NAME[key]
                const laborHrsRate = n(materialPrices[laborName])
                return (
                  <tr key={key} className="border-b border-gray-100">
                    <td className="py-1.5 pr-2 text-xs text-gray-700">{rate.label}</td>
                    <td className="py-1.5 pr-2">
                      <input
                        type="number"
                        step="1"
                        className="input text-sm py-1 w-20"
                        placeholder="0"
                        value={additionalItems[`${key}Qty`]}
                        onChange={e =>
                          setAdditionalItems(p => ({ ...p, [`${key}Qty`]: e.target.value }))
                        }
                      />
                    </td>
                    <td className="py-1.5 text-right text-gray-400 text-xs pr-2">
                      <span className="inline-flex items-center justify-end">
                        {qty > 0 ? (qty * laborHrsRate).toFixed(1) : `${laborHrsRate} / ea`}
                      </span>
                    </td>
                    <td className="py-1.5 text-right text-gray-600 text-xs">
                      <span className="inline-flex items-center justify-end">
                        {rate.laborOnly
                          ? '—'
                          : qty > 0
                            ? `$${(qty * matCost).toLocaleString()}`
                            : `$${matCost} / ea`}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
      )}

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
              {manualRows.map((row, i) => (
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
                        {manualRows.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setManualRows(rows => rows.filter((_, idx) => idx !== i))}
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
                          {manualRows.length > 1 && (
                            <button
                              type="button"
                              onClick={() => setManualRows(rows => rows.filter((_, idx) => idx !== i))}
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
            onClick={() => setManualRows(rows => [...rows, { label: '', hours: '', materials: '', subCost: '' }])}
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
