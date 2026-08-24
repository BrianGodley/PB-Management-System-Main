import WorkTypeChooser from './WorkTypeChooser'
import CrewTypeBar from './CrewTypeBar'
import ModuleHeaderSlot from './ModuleHeaderSlot'
// ─────────────────────────────────────────────────────────────────────────────
// ConcreteModule — Concrete paving estimator
//
// Rates are split across three tables (category='Concrete'):
//   labor_rates         → production rates (lr)  — SF/hr, LF/hr
//   material_rates      → material unit costs (mr) — per CY, per SF, etc.
//   subcontractor_rates → sub / equipment costs (sr) — pump, stamp, sand finish
//
// All three snapshots are saved in data so re-edits use rates from creation time.
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useCallback, useContext } from 'react'
import { SubTabContext, subSectionTitle } from './subTabContext'
import { supabase } from '../../lib/supabase'
import GpmdBar from './GpmdBar'
import RateEditPopover from '../RateEditPopover'
import { SubRateOverrideProvider } from '../SubRateOverrideContext.jsx'
import { fetchSalesTaxRate } from '../../lib/companyDefaults'
import { calcWalkAccessLabor } from '../../lib/walkAccess'
import { catalogOptions, fetchModuleCatalog, fetchStandardRateMap, fetchLaborRateMap } from '../../lib/materialCatalog'
import UnpricedItemModal from '../UnpricedItemModal'
import { makeModuleRates } from '../../lib/moduleRates'
import NewCatalogItemModal from '../NewCatalogItemModal'
import { calcConcrete } from './concreteCalc'
import { BAS } from '../../lib/basicLaborRefs'

// ── Rate tables (method-indexed — not in DB) ──────────────────────────────────

// Base-prep methods — the three shared Basic Labor 'Base Prep' rates (hrs per
// Cu Ft) that Pavers + the demos also read. Skid Good/OK collapsed to one Skid.
const METHODS = ['Skid Steer', 'Mini Skid Steer', 'Hand']

// Each method maps to a shared Basic Labor ref_key; the module preview reads it
// from the dual-keyed rate map (edited in Master Rates → Basic Labor).
const BASE_METHOD_LABOR_NAME = {
  'Skid Steer': BAS.BASE_PREP_SKID,
  'Mini Skid Steer': BAS.BASE_PREP_MINI,
  Hand: BAS.BASE_PREP_HAND,
}
// Map legacy saved base methods to the consolidated set.
const normBaseMethod = m =>
  m === 'Skid Steer OK' || m === 'Skid Steer Good'
    ? 'Skid Steer'
    : m === 'Wheelbarrow'
      ? 'Hand'
      : m
const FINISH_TYPES = [
  'Broom Finish',
  'Smooth Trowel',
  'Sand Finish',
  'Salt Finish',
  'Stamped',
  'Exposed Aggregate',
  'Seeded Aggregate',
]

// Sub-tab finish modifier — flat $/SF (labor) + optional $/SF material, on top
// of the base install $/SF. Broom + Smooth Trowel have no added cost.
const SUB_FINISH_RATES = {
  'Sand Finish': { labor: { name: 'Concrete Sub - Sand Finish Per SF' } },
  'Salt Finish': { labor: { name: 'Concrete Sub - Salt Finish Per SF' } },
  Stamped: { labor: { name: 'Concrete Sub - Stamped Per SF' } },
  'Exposed Aggregate': {
    labor: { name: 'Concrete Sub - Exposed Aggregate Per SF' },
    mat: { name: 'Concrete Sub - Exposed Aggregate Mat Per SF' },
  },
  'Seeded Aggregate': {
    labor: { name: 'Concrete Sub - Seeded Aggregate Per SF' },
    mat: { name: 'Concrete Sub - Seeded Aggregate Mat Per SF' },
  },
}

// In-House pour+finish is priced by job-size tier — each tier has its own
// SF/hr labour rate (editable via labor_rates, category 'Concrete').
const INSTALL_TIERS = [
  { key: 's100_300', label: '100–300 Sq Ft', rateName: 'Concrete - Install 100-300' },
  { key: 's300_600', label: '300–600 Sq Ft', rateName: 'Concrete - Install 300-600' },
  { key: 's600_1000', label: '600–1000 Sq Ft', rateName: 'Concrete - Install 600-1000' },
  { key: 's1000_2000', label: '1000–2000 Sq Ft', rateName: 'Concrete - Install 1000-2000' },
  { key: 's2000plus', label: '2000+ SF', rateName: 'Concrete - Install 2000+' },
]

// ── Company/estimate defaults (NOT per-item rates) ───────────────────────────
// Every material/labor/sub RATE is now read live from its table with no
// hardcoded fallback. The estimate-level financials (labor rate, burden, GPMD,
// commission, sub GP markup, walk pace) are sourced from company_settings — no
// hardcoded code defaults.

// Base Install ('Base Material') and Concrete Install mix ('Concrete Mix') source
// their Type options AND price/description entirely from the catalog, per vendor
// (Standard = the null-vendor rows). No built-in product list.

// Resolve a picked Type label against the CATALOG option list only. No built-in
// fallback: an unmatched/unseeded pick resolves to $0 (price + description come
// solely from the catalog row the user selected). Shared by the calc + render.
function resolveType(label, opts) {
  return (label != null && opts.find(o => o.label === label)) || { dbName: null, fallback: 0 }
}

// Rebar is priced by LINEAR FEET of bar, converted from the slab SF takeoff by
// the on-center spacing, then multiplied by the canonical rebar $/LF (the
// shared Basic Materials 'Rebar' row). Values set with Brian: 24" OC uses
// 0.59 LF of rebar per SF; 12" OC uses 1.20 LF/SF.
const REBAR_SPACINGS = ['24" OC', '18" OC', '12" OC']
// Rebar sizes — priced per Ln Ft from the canonical Basic Materials → Reinforcement
// catalog rows ('Rebar #3' … 'Rebar #8'). Shared across all modules.
const REBAR_SIZES = ['#3', '#4', '#5', '#6', '#8']

// ── Calculation engine ────────────────────────────────────────────────────────

const n = v => parseFloat(v) || 0

// Base Install material is the canonical Basic Materials 'Class II Roadbase'
// ($/Cu Yd). Resolved by NAME from the shared Standard rate map — mirrors
// ArtificialTurfModule's firstDefinedRate so the old 'Base - Class II Roadbase'
// key still resolves for pre-consolidation snapshots. First defined value wins.
const CLASS2_NAMES = ['Class II Roadbase', 'Base - Class II Roadbase']
const firstDefinedRate = (m, keys) => {
  for (const k of keys) if (m && m[k] != null) return m[k]
  return undefined
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

function NumInput({ value, onChange, placeholder = '0', className = '', step = 'any', min, max }) {
  // When a `max` is supplied, hard-cap the value so the user cannot enter a
  // number higher than it. The HTML5 `max` attribute alone does NOT block
  // typing — it only fails form validation — so we clamp in onChange too.
  // Used by e.g. Forming Complexity, which caps at 100 (+100% labor max).
  const handleChange = e => {
    let v = e.target.value
    if (max != null && v !== '') {
      const parsed = parseFloat(v)
      if (Number.isFinite(parsed) && parsed > parseFloat(max)) v = String(max)
    }
    onChange(v)
  }
  return (
    <input
      type="number"
      step={step}
      min={min}
      max={max}
      className={`input text-sm py-1.5 ${className}`}
      placeholder={placeholder}
      value={value}
      onChange={handleChange}
    />
  )
}

// ── Default state ─────────────────────────────────────────────────────────────

// Start with ZERO seeded rows — the user adds rows via "+ Add row". Every added
// row defaults vendor to '' (empty "Select vendor" placeholder → empty Type list
// → $0 until a vendor is chosen).
const DEFAULT_BASE_ROWS = [{ label: '', method: 'Skid Steer', sf: '', depth: '2', vendor: '', type: '' }]

const DEFAULT_MANUAL_ROWS = [{ label: '', hours: '', materials: '', subCost: '' }]

// ── Main component ────────────────────────────────────────────────────────────

export default function ConcreteModule({ onSave, onBack, saving, initialData }) {
  const [laborRatePerHour, setLaborRatePerHour] = useState(initialData?.laborRatePerHour ?? null)
  const [laborBurdenPct, setLaborBurdenPct] = useState(initialData?.laborBurdenPct ?? null)
  const [gpmd, setGpmd] = useState(initialData?.gpmd ?? null)
  const [subGpMarkupRate, setSubGpMarkupRate] = useState(initialData?.subGpMarkupRate ?? null)
  const [commissionRate, setCommissionRate] = useState(initialData?.commissionRate ?? null)
  const [walkPace, setWalkPace] = useState(initialData?.walkAccess?.paceLfPerMin ?? null)

  // Free-text notes for this module — Sam writes auto-generated
  // takeoffs here via create_estimate_from_takeoff, and the user can
  // overwrite / append their own.
  const [notes, setNotes] = useState(initialData?.notes ?? '')
  const [walkAccess] = useState(
    initialData?.walkAccess ?? {
      paceLfPerMin: null,
    }
  )
  // Rate snapshots keyed by name → rate value (restored from saved data if re-editing)
  const [laborRates, setLaborRates] = useState(initialData?.laborRates ?? {})
  const [materialRates, setMaterialRates] = useState(initialData?.materialRates ?? {})
  const [subRates, setSubRates] = useState(initialData?.subRates ?? {})
  // Vendor catalog: material_rates rows (with sub_category + vendor_id) and the
  // vendor list, used to build the per-line Vendor/Type pickers.
  const [materialRows, setMaterialRows] = useState(initialData?.materialRows ?? [])
  const [vendors, setVendors] = useState([])
  // Gate the "unpriced items" banner until rates have actually loaded, so it never
  // flashes on first open (empty rate map → everything looks unpriced for a frame).
  const [ratesLoaded, setRatesLoaded] = useState(false)
  // One-off subcontractor rates for this estimate only (undefined clears one).
  const [rateOverrides, setRateOverrides] = useState(initialData?.rateOverrides ?? {})
  const setOverride = (name, value) =>
    setRateOverrides(p => {
      const next = { ...(p || {}) }
      if (value === undefined || value === null || value === '') delete next[name]
      else next[name] = Number(value)
      return next
    })

  // Fetch company labor rate per hour
  useEffect(() => {
    if (initialData?.laborRatePerHour) return
    supabase
      .from('company_settings')
      .select('labor_rate_per_hour, labor_burden_pct, walk_access_pace_lf_per_min, estimate_gpmd_default, commission_rate, sub_gp_markup_rate')
      .single()
      .then(({ data }) => {
        if (data?.labor_rate_per_hour != null) setLaborRatePerHour(parseFloat(data.labor_rate_per_hour))
        if (data?.labor_burden_pct != null) setLaborBurdenPct(parseFloat(data.labor_burden_pct))
        if (data?.walk_access_pace_lf_per_min != null) setWalkPace(parseFloat(data.walk_access_pace_lf_per_min))
        if (data?.estimate_gpmd_default != null) setGpmd(parseFloat(data.estimate_gpmd_default))
        if (data?.commission_rate != null) setCommissionRate(parseFloat(data.commission_rate))
        if (data?.sub_gp_markup_rate != null) setSubGpMarkupRate(parseFloat(data.sub_gp_markup_rate))
      })
  }, [])

  // Re-fetch all three rate tables. Called once on mount and again whenever
  // the user saves an edit from a RateEditPopover so the calc picks up the
  // change without a page reload.
  const refreshAllRates = useCallback(async () => {
    // material_rates retired: base map (incl. shared Basic Materials) from the
    // new model; vendor catalog from material + material_price. Concrete's
    // markers ('Concrete Mix'/'Base Material') are unchanged, so no remap.
    const [labMap, matMap, srRes, rows, venRes] = await Promise.all([
      fetchLaborRateMap(['Concrete']), // dual-keyed (name + ref_key) + basic_labor_rates
      fetchStandardRateMap(['Concrete', 'Basic Materials']),
      supabase.from('subcontractor_rates').select('item_key, rate').eq('category', 'Concrete'),
      fetchModuleCatalog(['Concrete', 'Basic Materials']),
      supabase
        .from('subs_vendors')
        .select('id, company_name')
        .eq('type', 'vendor')
        .order('company_name'),
    ])
    setMaterialRows(rows || [])
    setVendors(
      (venRes.data || []).map(v => ({
        id: v.id,
        name: v.company_name,
      }))
    )
    setLaborRates(labMap)
    setMaterialRates(matMap)
    if (srRes.data) {
      const m = {}
      srRes.data.forEach(r => {
        m[r.item_key] = r.rate
      })
      setSubRates(m)
    }
    setRatesLoaded(true)
  }, [])

  // Fetch all three rate tables (skip if re-editing — use saved snapshots)
  useEffect(() => {
    const hasLr = initialData?.laborRates && Object.keys(initialData.laborRates).length > 0
    const hasMr = initialData?.materialRates && Object.keys(initialData.materialRates).length > 0
    const hasSr = initialData?.subRates && Object.keys(initialData.subRates).length > 0
    if (hasLr && hasMr && hasSr) {
      setRatesLoaded(true) // re-editing: snapshots already populate the rate maps
      return
    }
    refreshAllRates()
  }, [refreshAllRates])

  // Always load the vendor list + material rows (even when re-editing a saved
  // estimate) so the per-line Vendor/Type pickers work.
  useEffect(() => {
    let alive = true
    Promise.all([
      fetchModuleCatalog(['Concrete', 'Basic Materials']),
      supabase
        .from('subs_vendors')
        .select('id, company_name')
        .eq('type', 'vendor')
        .order('company_name'),
    ]).then(([rows, venRes]) => {
      if (!alive) return
      setMaterialRows(rows || [])
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

  // Settings
  const [difficulty, setDifficulty] = useState(initialData?.difficulty ?? '')
  const [crewType, setCrewType] = useState(initialData?.crewType ?? 'Masonry')
  const [subType, setSubType] = useState(initialData?.subType ?? 'In-House')
  const [layoutHrs, setLayoutHrs] = useState(initialData?.layoutHrs ?? '')
  const [distanceLF, setDistanceLF] = useState(initialData?.distanceLF ?? '')
  const [formingComplexity, setFormingComplexity] = useState(initialData?.formingComplexity ?? '')
  const [finishingType, setFinishingType] = useState(initialData?.finishingType ?? 'IH')
  const [hoursAdj, setHoursAdj] = useState(initialData?.hoursAdj ?? '')

  // Inline catalog modals: an unpriced item to price, or an empty sub-category to
  // add an item to. Both write back to the catalog then refresh rates.
  const [unpricedItem, setUnpricedItem] = useState(null)
  const [newItemTarget, setNewItemTarget] = useState(null)

  // Install
  const [installTiers, setInstallTiers] = useState(initialData?.installTiers ?? {})
  // Per size-tier concrete-mix Vendor + Type (objects keyed by INSTALL_TIERS key)
  const [installTierVendor, setInstallTierVendor] = useState(initialData?.installTierVendor ?? {})
  const [installTierType, setInstallTierType] = useState(initialData?.installTierType ?? {})
  const [installTierDepth, setInstallTierDepth] = useState(initialData?.installTierDepth ?? {})
  const [depthIn, setDepthIn] = useState(initialData?.depthIn ?? '4')
  const [rebarSF, setRebarSF] = useState(initialData?.rebarSF ?? '')
  const [rebarSpacing, setRebarSpacing] = useState(initialData?.rebarSpacing ?? '24" OC')
  const [rebarSize, setRebarSize] = useState(initialData?.rebarSize ?? '#4')
  const [formLF, setFormLF] = useState(initialData?.formLF ?? '')
  const [sleeveLF, setSleeveLF] = useState(initialData?.sleeveLF ?? '')

  // Options
  const [finishType, setFinishType] = useState(initialData?.finishType ?? 'Broom Finish')
  const [colorYes, setColorYes] = useState(initialData?.colorYes ?? false)
  const [pumpYes, setPumpYes] = useState(initialData?.pumpYes ?? false)
  const [vaporBarrierSF, setVaporBarrierSF] = useState(initialData?.vaporBarrierSF ?? '')
  const [vaporVendor, setVaporVendor] = useState(initialData?.vaporVendor ?? '')
  const [vaporItem, setVaporItem] = useState(initialData?.vaporItem ?? '')
  const [sealerSF, setSealerSF] = useState(initialData?.sealerSF ?? '')
  const [sealerVendor, setSealerVendor] = useState(initialData?.sealerVendor ?? '')
  const [sealerItem, setSealerItem] = useState(initialData?.sealerItem ?? '')
  const [finishMatVendor, setFinishMatVendor] = useState(initialData?.finishMatVendor ?? '')
  const [finishMatItem, setFinishMatItem] = useState(initialData?.finishMatItem ?? '')
  const [finishMatSF, setFinishMatSF] = useState(initialData?.finishMatSF ?? '')

  // Multi-row sections
  const [baseRows, setBaseRows] = useState(initialData?.baseRows ?? DEFAULT_BASE_ROWS)
  const [manualRows, setManualRows] = useState(initialData?.manualRows ?? DEFAULT_MANUAL_ROWS)

  // ── Independent Subcontractor-tab state ──────────────────────────────────
  // The Sub tab is its own calculator (mirrors the demo / Utilities modules).
  // Each field defaults to the same blank value as its in-house counterpart.
  // The site-conditions modifiers (difficulty/layout/distance/
  // forming complexity/hours adj) are In-House only and are NOT mirrored.
  const [subInstallSF, setSubInstallSF] = useState(initialData?.subInstallSF ?? '')
  const [subDepthIn, setSubDepthIn] = useState(initialData?.subDepthIn ?? '4')
  const [subRebarSF, setSubRebarSF] = useState(initialData?.subRebarSF ?? '')
  const [subRebarSpacing, setSubRebarSpacing] = useState(initialData?.subRebarSpacing ?? '24" OC')
  const [subFormLF, setSubFormLF] = useState(initialData?.subFormLF ?? '')
  const [subSleeveLF, setSubSleeveLF] = useState(initialData?.subSleeveLF ?? '')
  const [subFinishType, setSubFinishType] = useState(initialData?.subFinishType ?? 'Broom Finish')
  const [subColorYes, setSubColorYes] = useState(initialData?.subColorYes ?? false)
  const [subPumpYes, setSubPumpYes] = useState(initialData?.subPumpYes ?? false)
  const [subVaporBarrierSF, setSubVaporBarrierSF] = useState(initialData?.subVaporBarrierSF ?? '')
  const [subVaporVendor, setSubVaporVendor] = useState(initialData?.subVaporVendor ?? '')
  const [subVaporItem, setSubVaporItem] = useState(initialData?.subVaporItem ?? '')
  const [subSealerSF, setSubSealerSF] = useState(initialData?.subSealerSF ?? '')
  const [subSealerVendor, setSubSealerVendor] = useState(initialData?.subSealerVendor ?? '')
  const [subSealerItem, setSubSealerItem] = useState(initialData?.subSealerItem ?? '')
  const [subFinishMatVendor, setSubFinishMatVendor] = useState(initialData?.subFinishMatVendor ?? '')
  const [subFinishMatItem, setSubFinishMatItem] = useState(initialData?.subFinishMatItem ?? '')
  const [subFinishMatSF, setSubFinishMatSF] = useState(initialData?.subFinishMatSF ?? '')
  const [subBaseRows, setSubBaseRows] = useState(initialData?.subBaseRows ?? DEFAULT_BASE_ROWS)
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

  const state = {
    rateOverrides,
    crewType,
    subType,
    difficulty,
    layoutHrs,
    distanceLF,
    formingComplexity,
    finishingType,
    hoursAdj,
    installTiers,
    installTierVendor,
    installTierType,
    installTierDepth,
    depthIn,
    rebarSF,
    rebarSpacing,
    rebarSize,
    formLF,
    sleeveLF,
    finishType,
    colorYes,
    pumpYes,
    vaporBarrierSF,
    vaporVendor,
    vaporItem,
    sealerSF,
    sealerVendor,
    sealerItem,
    finishMatVendor,
    finishMatItem,
    finishMatSF,
    baseRows,
    manualRows,
  }
  // ── Vendor catalog helpers (per-line Vendor/Type pickers) ────────────────
  const vendorsForCategory = cat => vendors.filter(v => materialRows.some(r => r.vendor_id === v.id && (r.sub_category === cat || r.category === cat)))
  const defaultVendorFor = cat => vendorsForCategory(cat)[0]?.id || 'Standard'
  const catDefaults = {
    'Base Material': defaultVendorFor('Base Material'),
    'Concrete Mix': defaultVendorFor('Concrete Mix'),
  }
  // Build a section's Type option list for a given vendor selection. Options come
  // ONLY from the catalog: 'Standard' → the null-vendor catalog rows for the
  // sub-category; a vendor id → that vendor's products for the category. When the
  // catalog has none, the list is EMPTY (picker shows just its "Select …"
  // placeholder and the row books $0). houseArray is retained for the price
  // resolver's fallback (resolveType) only, never as an option source.
  function sectionOptions(subcat, vendorSel, houseArray) {
    // Unset vendor ('' / 'auto') → EMPTY Type list so the picker shows only its
    // own "Select …" placeholder and the row books $0 until a vendor is chosen.
    if (!vendorSel || vendorSel === 'auto') return []
    const isStd = vendorSel === 'Standard'
    const opts = catalogOptions(materialRows, subcat, isStd ? 'Standard' : vendorSel, {
      standardRows: 'null-vendor',
      stripPrefix: true,
    })
    return opts.map(o => ({ ref_key: o.ref_key || null, id: o.id, label: o.label, dbName: o.row.name, fallback: n(o.row.unit_cost), category: 'Concrete' }))
  }
  // Effective vendor for a stored value: 'auto'/unset/Standard → category default.
  // Honest effective vendor: only unset/'auto' falls back to the category default;
  // 'Standard' stays 'Standard' so the displayed vendor matches the Type list.
  const effVendor = (cat, v) => (v && v !== 'auto' ? v : catDefaults[cat])

  // NOTE: per the shared "Vendor Select" convention, per-row/per-tier vendor is
  // left UNSET ('') on a new estimate so each picker shows a "Select vendor"
  // placeholder (empty Type list + $0 row) until the user chooses. No auto-
  // default to the first real vendor.

  // Active-tab wiring: the mirrored field sections edit whichever set matches
  // the current tab, so In-House and Subcontractor are fully independent
  // calculators. Modifiers (difficulty/layout/etc.) are In-House only.
  const isSub = subType === 'Subcontractor'
  const installTiersTotal = INSTALL_TIERS.reduce((s, t) => s + n(installTiers[t.key]), 0)
  // In-House install is entered per tier (below); activeInstallSF is the total
  // used for the CY/material readout. Sub uses its single whole-slab SF field.
  const activeInstallSF = isSub ? subInstallSF : installTiersTotal
  const setActiveInstallSF = isSub ? setSubInstallSF : () => {}
  const activeDepthIn = isSub ? subDepthIn : depthIn
  const setActiveDepthIn = isSub ? setSubDepthIn : setDepthIn
  const activeRebarSF = isSub ? subRebarSF : rebarSF
  const setActiveRebarSF = isSub ? setSubRebarSF : setRebarSF
  const activeRebarSpacing = isSub ? subRebarSpacing : rebarSpacing
  const setActiveRebarSpacing = isSub ? setSubRebarSpacing : setRebarSpacing
  const activeFormLF = isSub ? subFormLF : formLF
  const setActiveFormLF = isSub ? setSubFormLF : setFormLF
  const activeSleeveLF = isSub ? subSleeveLF : sleeveLF
  const setActiveSleeveLF = isSub ? setSubSleeveLF : setSleeveLF
  const activeFinishType = isSub ? subFinishType : finishType
  const setActiveFinishType = isSub ? setSubFinishType : setFinishType
  const activeColorYes = isSub ? subColorYes : colorYes
  const setActiveColorYes = isSub ? setSubColorYes : setColorYes
  const activePumpYes = isSub ? subPumpYes : pumpYes
  const setActivePumpYes = isSub ? setSubPumpYes : setPumpYes
  const activeVaporBarrierSF = isSub ? subVaporBarrierSF : vaporBarrierSF
  const setActiveVaporBarrierSF = isSub ? setSubVaporBarrierSF : setVaporBarrierSF
  const activeVaporVendor = isSub ? subVaporVendor : vaporVendor
  const setActiveVaporVendor = isSub ? setSubVaporVendor : setVaporVendor
  const activeVaporItem = isSub ? subVaporItem : vaporItem
  const setActiveVaporItem = isSub ? setSubVaporItem : setVaporItem
  const activeSealerSF = isSub ? subSealerSF : sealerSF
  const setActiveSealerSF = isSub ? setSubSealerSF : setSealerSF
  const activeSealerVendor = isSub ? subSealerVendor : sealerVendor
  const setActiveSealerVendor = isSub ? setSubSealerVendor : setSealerVendor
  const activeSealerItem = isSub ? subSealerItem : sealerItem
  const setActiveSealerItem = isSub ? setSubSealerItem : setSealerItem
  const activeFinishMatVendor = isSub ? subFinishMatVendor : finishMatVendor
  const setActiveFinishMatVendor = isSub ? setSubFinishMatVendor : setFinishMatVendor
  const activeFinishMatItem = isSub ? subFinishMatItem : finishMatItem
  const setActiveFinishMatItem = isSub ? setSubFinishMatItem : setFinishMatItem
  const activeFinishMatSF = isSub ? subFinishMatSF : finishMatSF
  const setActiveFinishMatSF = isSub ? setSubFinishMatSF : setFinishMatSF
  const activeBaseRows = isSub ? subBaseRows : baseRows
  const setActiveBaseRows = isSub ? setSubBaseRows : setBaseRows
  const activeManualRows = isSub ? subManualRows : manualRows
  const setActiveManualRows = isSub ? setSubManualRows : setManualRows

  // Concrete volume for the ACTIVE tab (drives color/pump display + sub calc).
  // In-House sums each tier's SF × its own depth; Sub uses its single slab depth.
  const _activeDepth = n(activeDepthIn) || 4
  const activeConcreteCY = isSub
    ? n(activeInstallSF) > 0
      ? ((_activeDepth / 12) * n(activeInstallSF)) / 27
      : 0
    : INSTALL_TIERS.reduce((s, t) => {
        const sf = n(installTiers[t.key])
        if (!sf) return s
        const d = n(installTierDepth[t.key]) || n(depthIn) || 4
        return s + ((d / 12) * sf) / 27
      }, 0)

  // In-house calc is unchanged — it reads only the in-house state fields.
  const effWalkAccess = { ...(walkAccess || {}), paceLfPerMin: n(walkAccess?.paceLfPerMin) || walkPace }
  const inHouse = calcConcrete(
    state,
    laborRatePerHour,
    laborRates,
    materialRates,
    subRates,
    gpmd,
    effWalkAccess,
    laborBurdenPct,
    materialRows,
    catDefaults,
    commissionRate
  )

  // ── Sub-side cost — a single fully-loaded subcontractor cost figure.
  // Concrete install is a flat $/SF (covers finish); the add-ons reuse the
  // exact same per-unit rate lookups as the in-house calc but book
  // (material$ + labor-hours × labor rate) as a sub COST. Nothing here adds
  // to the module's in-house manDays / totalHrs / totalMat / laborCost.
  const subSlabRate = n(subRates['Concrete Sub - Per SF'])
  // Sub-side vapor barrier + sealer are flat $/SF (no SF/hr labor component).
  const subVaporBarrierRate = n(subRates['Concrete Sub - Vapor Barrier Per SF'])
  const subSealerRate = n(subRates['Concrete Sub - Sealer Per SF'])
  // Sub-side finish modifier ($/SF labor + optional $/SF material).
  const subFinishCfg = SUB_FINISH_RATES[subFinishType] || null
  const subFinishLaborPerSF = subFinishCfg ? n(subRates[subFinishCfg.labor.name]) : 0
  const subFinishMatPerSF = subFinishCfg?.mat ? n(subRates[subFinishCfg.mat.name]) : 0
  const lrph = n(laborRatePerHour)
  // Resolved add-on rates (identical on both tabs — sourced from rate maps).
  const {
    rebarSFPerHr,
    rebarSFPerHrBySpacing,
    rebarPerLF,
    rebarLfPerSfBySpacing,
    formLFPerHr,
    formMaterialPerLF,
    sleeveLFPerHr,
    sleevePer10LF,
    colorCostPerCY,
    pumpFeeFlat,
    pumpFeePerCY,
    vaporBarrierSFPerHr,
    sealerNaturalSFPerHr,
    sealerWetSFPerHr,
    costBase,
  } = inHouse
  const _subDepth = n(subDepthIn) || 4
  const subConcreteCY =
    n(subInstallSF) > 0 ? ((_subDepth / 12) * n(subInstallSF)) / 27 : 0
  let subSideCost = 0
  // Concrete install — flat $/SF, plus a per-finish $/SF modifier (labor + mat).
  // No Base Install or Form Edging on the sub side (removed by request).
  subSideCost += n(subInstallSF) * subSlabRate
  subSideCost += n(subInstallSF) * (subFinishLaborPerSF + subFinishMatPerSF)
  // Rebar — same LF-per-SF conversion × canonical $/LF, using the Sub tab's
  // own on-center spacing.
  if (n(subRebarSF) > 0) {
    const subRebarLfPerSf =
      rebarLfPerSfBySpacing[subRebarSpacing] ?? rebarLfPerSfBySpacing['24" OC']
    const subRebarSFPerHr =
      rebarSFPerHrBySpacing[subRebarSpacing] ?? rebarSFPerHrBySpacing['24" OC']
    subSideCost +=
      n(subRebarSF) * subRebarLfPerSf * rebarPerLF +
      n(subRebarSF) * subRebarSFPerHr * lrph
  }
  // Sleeves
  if (n(subSleeveLF) > 0) {
    const units = Math.ceil(n(subSleeveLF) / 10)
    subSideCost += units * sleevePer10LF + n(subSleeveLF) * sleeveLFPerHr * lrph
  }
  // Color hardener
  if (subColorYes && subConcreteCY > 0) {
    subSideCost += Math.ceil(subConcreteCY) * colorCostPerCY
  }
  // Pump
  if (subPumpYes && subConcreteCY > 0) {
    subSideCost += pumpFeeFlat + pumpFeePerCY * Math.ceil(subConcreteCY)
  }
  // Vapor barrier — flat $/SF (no SF/hr labor).
  if (n(subVaporBarrierSF) > 0) {
    subSideCost += n(subVaporBarrierSF) * subVaporBarrierRate
  }
  // Sealer — flat $/SF (no SF/hr labor, type-independent).
  if (n(subSealerSF) > 0) {
    subSideCost += n(subSealerSF) * subSealerRate
  }
  // Sub manual rows
  ;(subManualRows || []).forEach(r => {
    subSideCost += n(r.subCost)
  })

  // ── Combine: in-house calc + sub-side cost. GP stays in-house; sub cost
  // earns its own markup (subGp); commission applies to both GP pools.
  const _subCost = inHouse.subCost + subSideCost
  const _subGp = _subCost * subGpMarkupRate
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

  function updateBaseRow(i, field, val) {
    setActiveBaseRows(rows => rows.map((r, idx) => (idx === i ? { ...r, [field]: val } : r)))
  }
  function updateManual(i, field, val) {
    setActiveManualRows(rows => rows.map((r, idx) => (idx === i ? { ...r, [field]: val } : r)))
  }

  function handleSave() {
    onSave({
      notes,
      man_days: parseFloat(calc.manDays.toFixed(2)),
      material_cost: parseFloat(calc.totalMat.toFixed(2)),
      data: {
        ...state,
        // Independent Subcontractor-tab fields
        subType,
        subInstallSF,
        subDepthIn,
        subRebarSF,
        subRebarSpacing,
        subFormLF,
        subSleeveLF,
        subFinishType,
        subColorYes,
        subPumpYes,
        subVaporBarrierSF,
        subVaporVendor,
        subVaporItem,
        subSealerSF,
        subSealerVendor,
        subSealerItem,
        subFinishMatVendor,
        subFinishMatItem,
        subFinishMatSF,
        subBaseRows,
        subManualRows,
        walkAccess: effWalkAccess,
        laborRatePerHour,
        laborBurdenPct,
        gpmd,
        subGpMarkupRate,
        commissionRate,
        laborRates, // ← production rate snapshot
        materialRates, // ← material cost snapshot
        subRates, // ← sub/equipment cost snapshot
        materialRows, // ← vendor catalog snapshot (for re-edit pricing)
        calc,
      },
    })
  }

  const fmt2 = v =>
    `$${n(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  // ── Catalog material rows for View Rates ────────────────────────────────────
  // Mirrors Walls/Utilities: surface the module's material catalog prices (one
  // row per vendor, Standard first) so each section lists its MATERIAL rates
  // after its labor rates. Sourced from the SAME `materialRows`/`vendors` state
  // the estimator's pickers use — no extra fetch.
  const vendorNames = Object.fromEntries((vendors || []).map(v => [v.id, v.name]))
  const catalogRowToItem = r0 => ({
    label: `${r0.vendor_id ? vendorNames[r0.vendor_id] || 'Vendor' : 'Standard'} — ${r0.name}`,
    table: 'material_price',
    materialId: r0.id,
    vendorId: r0.vendor_id || undefined,
    category: 'Concrete',
    unitLabel: r0.unit || 'ea',
    mode: 'currency',
    value: n(r0.unit_cost),
  })
  const catalogSort = (a, b) => {
    const va = a.vendor_id == null ? '' : vendorNames[a.vendor_id] || '~'
    const vb = b.vendor_id == null ? '' : vendorNames[b.vendor_id] || '~'
    return va.localeCompare(vb) || (a.name || '').localeCompare(b.name || '')
  }
  // Sub-category–picked sections (Base / Mix): every catalog row in that subcat.
  const catalogBlockItems = subcat =>
    (materialRows || [])
      .filter(r0 => r0.sub_category === subcat)
      .filter(r0 => r0.vendor_id == null || vendorNames[r0.vendor_id])
      .sort(catalogSort)
      .map(catalogRowToItem)
  // Which finish types have finish-material PRODUCTS (i.e. appear as
  // calc_meta.finish on a 'Concrete Finish Material' catalog row). Used to
  // enable/disable the Finish material pickers per selected finish.
  const finishMatFinishes = new Set(
    (materialRows || [])
      .filter(r0 => r0.sub_category === 'Concrete Finish Material')
      .map(r0 => (r0.calc_meta && r0.calc_meta.finish) || '')
      .filter(Boolean)
  )
  const finishHasProducts = finishMatFinishes.has(activeFinishType)
  // Named materials (Rebar, Form Lumber, …): matched by exact catalog name.
  const materialRateRows = dbName =>
    (materialRows || [])
      .filter(r0 => r0.name === dbName)
      .filter(r0 => r0.vendor_id == null || vendorNames[r0.vendor_id])
      .sort(catalogSort)
      .map(catalogRowToItem)


  return (
    <SubTabContext.Provider value={isSub}>
    <SubRateOverrideProvider overrides={rateOverrides} setOverride={setOverride}>
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
            title="Concrete"
            moduleType="Concrete"
            rateScope={[{ category: 'Basic Labor', sub: 'Base Prep' }]}
            refreshAllRates={refreshAllRates}
            showInlineToggle={false}
          />
        </div>
      </div>

      {ratesLoaded && calc.unpriced && calc.unpriced.length > 0 && (
        <div className="rounded-md border border-red-300 bg-red-50 px-4 py-3">
          <p className="text-sm font-medium text-red-800">
            {calc.unpriced.length} item{calc.unpriced.length > 1 ? 's have' : ' has'} no price yet —
            click to price:
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {calc.unpriced.map(it => (
              <button
                key={it.name}
                type="button"
                className="rounded-full border border-red-300 bg-white px-3 py-1 text-sm text-red-700 hover:bg-red-100"
                onClick={() => setUnpricedItem(it)}
              >
                {it.label} · $0.00
              </button>
            ))}
          </div>
        </div>
      )}

      <ModuleHeaderSlot>
        <WorkTypeChooser value={subType || 'In-House'} onChange={setSubType} compact />
      </ModuleHeaderSlot>

      {/* ── Global Settings — In-House tab only (Sub tab has no modifiers) ── */}
      {!isSub && (
      <div>
        <SectionHeader title="Job Site Conditions" />
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="text-xs text-gray-500 block mb-1">Difficulty Add (%)</label>
            <NumInput value={difficulty} onChange={setDifficulty} placeholder="0" />
          </div>
          <div className="flex-1">
            <label
              className="text-xs text-gray-500 block mb-1"
              title="Average Distance from Truck to Work Area"
            >
              Truck → Work Area (Avg LF)
            </label>
            <NumInput value={distanceLF} onChange={setDistanceLF} placeholder="0" />
            {calc.walkHrs > 0 && (
              <p className="text-[10px] text-gray-500 italic lowercase mt-0.5">
                +{calc.walkHrs.toFixed(2)} hrs walk-access
              </p>
            )}
          </div>
          <div className="flex-1">
            <label className="text-xs text-gray-500 block mb-1">Hrs Adjustment</label>
            <NumInput
              value={hoursAdj}
              onChange={setHoursAdj}
              placeholder="0"
              min="-999"
              step="0.5"
            />
          </div>
        </div>
      </div>
      )}

      {/* ── Base Prep — In-House only ── */}
      {!isSub && (
      <div>
        <SectionHeader title="Base Prep" />
        <div className="overflow-x-auto">
          <table className="w-full text-sm table-fixed">
            {/* Sq Ft + Depth ~3× their prior shrunk width; the freed
                space is absorbed by the widened Type column. */}
            <colgroup>
              <col />
              <col className="w-[28%]" />
              <col />
              <col className="w-[12%]" />
              <col className="w-[12%]" />
              <col />
            </colgroup>
            <thead>
              <tr className="text-xs text-gray-500 border-b border-gray-200">
                <th className="text-center pb-1 pr-2 font-medium">Vendor</th>
                <th className="text-center pb-1 pr-2 font-medium">Type</th>
                <th className="text-center pb-1 pr-2 font-medium">Method</th>
                <th className="text-center pb-1 pr-2 font-medium">Sq Ft</th>
                <th className="text-center pb-1 pr-2 font-medium">Depth (in)</th>
                <th className="text-center pb-1 font-medium text-gray-400">Hrs</th>
              </tr>
            </thead>
            <tbody>
              {activeBaseRows.map((row, i) => {
                const _sf = n(row.sf),
                  _depth = n(row.depth) || 2
                const _bm = normBaseMethod(row.method)
                const methodRate = n(laborRates[BASE_METHOD_LABOR_NAME[_bm]])
                const baseOpts = sectionOptions('Base Material', row.vendor)
                const bt = resolveType(row.type, baseOpts)
                // Base material $/Cu Yd = canonical Basic Materials 'Class II
                // Roadbase' Standard rate (costBase), unless a vendor-picked
                // 'Base Material' product overrides it.
                const baseRate = bt.fallback > 0 ? bt.fallback : costBase
                const c = {
                  // Labor by VOLUME (Cu Ft) — mirrors Pavers; Cu Ft = SF × depth/12.
                  hrs: _sf > 0 ? (_sf * (_depth / 12)) * methodRate : 0,
                  // Material priced per Cu Yd: SF × depth(in)/12 ÷ 27 × $/Cu Yd.
                  mat: _sf > 0 ? (_sf * (_depth / 12) / 27) * baseRate : 0,
                }
                return (
                  <tr key={i} className="border-b border-gray-100">
                    <td className="py-1 pr-2">
                      <select
                        className="input text-sm py-1 min-w-0"
                        value={row.vendor || ''}
                        onChange={e => updateBaseRow(i, 'vendor', e.target.value)}
                        title="Vendor"
                      >
                        {!row.vendor && <option value="">Select</option>}
                        {vendorsForCategory('Base Material').map(v => (
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
                          className="input text-sm py-1 min-w-0"
                          value={row.type || ''}
                          onChange={e => updateBaseRow(i, 'type', e.target.value)}
                        >
                          {!row.type && <option value="">Select type</option>}
                          {row.type &&
                            !baseOpts.some(o => (o.ref_key || o.id) === row.type || o.label === row.type) && (
                              <option value={row.type}>{row.type}</option>
                            )}
                          {baseOpts.map(o => (
                            <option key={o.id} value={o.ref_key || o.id}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                        {row.vendor && baseOpts.length === 0 && (
                          <button
                            type="button"
                            className="whitespace-nowrap rounded border border-blue-300 px-2 py-1 text-xs text-blue-700 hover:bg-blue-50"
                            title="This sub-category has no items — add one"
                            onClick={() =>
                              setNewItemTarget({
                                category: 'Concrete',
                                subCategory: 'Base Material',
                                label: 'Base Material',
                                unit: 'Cu Yd',
                                vendorId: row.vendor !== 'Standard' ? row.vendor : null,
                              })
                            }
                          >
                            + Add item
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="py-1 pr-2">
                      <div className="flex items-center gap-1">
                        <select
                          className="input text-sm py-1 flex-1 min-w-0"
                          value={normBaseMethod(row.method)}
                          onChange={e => updateBaseRow(i, 'method', e.target.value)}
                        >
                          {METHODS.map(m => (
                            <option key={m}>{m}</option>
                          ))}
                        </select>
                      </div>
                    </td>
                    <td className="py-1 pr-2">
                      <NumInput value={row.sf} onChange={v => updateBaseRow(i, 'sf', v)} className="text-center" />
                    </td>
                    <td className="py-1 pr-2">
                      <NumInput
                        value={row.depth}
                        onChange={v => updateBaseRow(i, 'depth', v)}
                        placeholder="2"
                        className="text-center"
                      />
                    </td>
                    <td className="py-1 text-center text-gray-500 text-xs">
                      {c.hrs > 0 ? c.hrs.toFixed(2) : '—'}
                      {c.mat > 0 && <p className="text-gray-400">{fmt2(c.mat)}</p>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <button
            type="button"
            onClick={() =>
              setActiveBaseRows(rows => [
                ...(rows || []),
                { label: '', method: 'Skid Steer', sf: '', depth: '2', vendor: '', type: '' },
              ])
            }
            className="mt-2 text-xs px-2 py-1 rounded bg-slate-100 text-slate-700 hover:bg-slate-200"
          >
            + Add row
          </button>
        </div>
      </div>
      )}

      {/* ── Rebar Install ── */}
      <div>
        <SectionHeader title="Rebar Install" />
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="text-xs text-gray-500 block mb-1">Size</label>
            <select
              className="input text-sm py-1.5 w-full"
              value={rebarSize}
              onChange={e => setRebarSize(e.target.value)}
            >
              {REBAR_SIZES.map(s => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Pattern</label>
            <select
              className="input text-sm py-1.5 w-full"
              value={activeRebarSpacing}
              onChange={e => setActiveRebarSpacing(e.target.value)}
            >
              {REBAR_SPACINGS.map(s => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Sq Ft</label>
            <NumInput value={activeRebarSF} onChange={setActiveRebarSF} placeholder="Sq Ft" className="w-full" />
          </div>
        </div>
      </div>

      {/* ── Concrete Install ── */}
      <div>
        <SectionHeader title="Concrete Install" />
        <div className="grid grid-cols-2 gap-3 items-end">
          <div className={!isSub ? 'col-span-2' : undefined}>
            {isSub && (
              <label className="text-xs text-gray-500 block mb-1 inline-flex items-center gap-1 flex-wrap">
                Installation (Sq Ft)
                <span className="text-gray-400 inline-flex items-center gap-1">
                  — ${subSlabRate}/SF all-in
                </span>
              </label>
            )}
            {isSub ? (
              <NumInput
                value={activeInstallSF}
                onChange={v => {
                  setActiveInstallSF(v)
                  if (!activeRebarSF) setActiveRebarSF(v)
                }}
              />
            ) : (
              <div className="space-y-1">
                {/* Column labels */}
                <div className="grid grid-cols-[6rem_9rem_minmax(0,1fr)_5rem_5rem_16rem] items-center gap-2 text-[10px] font-semibold text-gray-400 uppercase tracking-wide text-center">
                  <span />
                  <span>Vendor</span>
                  <span>Mix</span>
                  <span>Sq Ft</span>
                  <span>Depth (In)</span>
                  <span />
                </div>
                {INSTALL_TIERS.map(t => {
                  const rate = n(laborRates[t.rateName])
                  const is300plus = t.key !== 's100_300'
                  const mixOpts = sectionOptions('Concrete Mix', installTierVendor[t.key])
                  const mt = resolveType(installTierType[t.key], mixOpts)
                  const mixRate = mt.fallback
                  // Cubic yards this tier's Sq Ft + Depth entry equals.
                  const tierSF = n(installTiers[t.key])
                  const tierDepth = n(installTierDepth[t.key]) || 4
                  const tierCY = tierSF > 0 ? ((tierDepth / 12) * tierSF) / 27 : 0
                  return (
                    <div
                      key={t.key}
                      className="grid grid-cols-[6rem_9rem_minmax(0,1fr)_5rem_5rem_16rem] items-center gap-2"
                    >
                      <span className="text-[11px] text-gray-500">{t.label}</span>
                      <select
                        className="input text-xs py-1 w-full"
                        value={installTierVendor[t.key] || ''}
                        onChange={e =>
                          setInstallTierVendor({ ...installTierVendor, [t.key]: e.target.value })
                        }
                        title="Mix vendor"
                      >
                        {!installTierVendor[t.key] && <option value="">Select</option>}
                        {vendorsForCategory('Concrete Mix').map(v => (
                          <option key={v.id} value={v.id}>
                            {v.name}
                          </option>
                        ))}
                        <option value="Standard">Standard</option>
                      </select>
                      <select
                        className="input text-xs py-1 w-full"
                        value={installTierType[t.key] || ''}
                        onChange={e =>
                          setInstallTierType({ ...installTierType, [t.key]: e.target.value })
                        }
                        title="Mix type"
                      >
                        {!installTierType[t.key] && <option value="">Select mix</option>}
                        {installTierType[t.key] &&
                          !mixOpts.some(
                            o => (o.ref_key || o.id) === installTierType[t.key] || o.label === installTierType[t.key]
                          ) && <option value={installTierType[t.key]}>{installTierType[t.key]}</option>}
                        {mixOpts.map(o => (
                          <option key={o.id} value={o.ref_key || o.id}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                      <NumInput
                        value={installTiers[t.key] ?? ''}
                        onChange={v => setInstallTiers({ ...installTiers, [t.key]: v })}
                        placeholder="0"
                        className="w-full text-center"
                      />
                      <NumInput
                        value={installTierDepth[t.key] ?? ''}
                        onChange={v => setInstallTierDepth({ ...installTierDepth, [t.key]: v })}
                        placeholder="4"
                        className="w-full text-center"
                      />
                      <div className="flex items-center justify-end gap-2 whitespace-nowrap">
                        {tierCY > 0 && (
                          <span className="text-[11px] font-semibold text-gray-600 inline-flex items-center gap-1">
                            {tierCY.toFixed(2)} Cu Yd
                          </span>
                        )}
                        <span className="text-[11px] text-gray-400 inline-flex items-center gap-1">
                          ${Number(mixRate).toFixed(0)}/CY
                        </span>
                        <span
                          className={`text-[10px] whitespace-nowrap ${
                            is300plus ? 'text-green-600' : 'text-gray-400'
                          }`}
                        >
                          {is300plus ? 'pump' : 'pump not included'}
                        </span>
                        <span className="text-[11px] text-gray-400 inline-flex items-center gap-1">
                          {rate} Sq Ft/hr
                        </span>
                      </div>
                    </div>
                  )
                })}
                <div className="pt-1 text-[11px] text-gray-400 inline-flex items-center gap-1 flex-wrap">
                  Pump (auto 300+): ${calc.pumpFeeFlat} flat
                  + ${calc.pumpFeePerCY}/CY
                </div>
              </div>
            )}
          </div>
          {isSub && (
            <div>
              <label className="text-xs text-gray-500 block mb-1">Depth (inches)</label>
              <NumInput value={activeDepthIn} onChange={setActiveDepthIn} placeholder="4" />
            </div>
          )}
          {!isSub && (
            <div className="col-span-2">
              <p className="text-[11px] text-gray-700 uppercase tracking-wide mb-1">Forming</p>
            </div>
          )}
          {!isSub && (
          <div>
            <label className="text-xs text-gray-500 block mb-1">Form Edging (Ln Ft)</label>
            <NumInput value={activeFormLF} onChange={setActiveFormLF} />
          </div>
          )}
          <div>
            <label className="text-xs text-gray-500 block mb-1">3" Sleeves (Ln Ft)</label>
            <NumInput value={activeSleeveLF} onChange={setActiveSleeveLF} />
          </div>
          {activeConcreteCY > 0 && (
            <div className="flex items-end pb-1.5">
              <p className="text-xs text-gray-400">
                ≈{' '}
                <span className="font-semibold text-gray-600">
                  {activeConcreteCY.toFixed(2)} Cu Yd
                </span>{' '}
                concrete
              </p>
            </div>
          )}
          {!isSub && (
            <div className="col-span-2">
              <label className="text-xs text-gray-500 block mb-1 inline-flex items-center gap-1 flex-wrap">
                Forming Complexity (0–100)
                <span className="text-gray-400">— +{calc.complexityPctPerUnit}% labor / point</span>
              </label>
              <NumInput
                value={formingComplexity}
                onChange={setFormingComplexity}
                placeholder="0"
                max="100"
              />
              {calc.complexityHrs > 0 && (
                <p className="text-[10px] text-gray-500 italic mt-0.5">
                  +{calc.complexityHrs.toFixed(2)} hrs added
                </p>
              )}
            </div>
          )}
          <div className="col-span-2">
            <label className="text-xs text-gray-500 block mb-1">Layout Time (hrs)</label>
            <NumInput value={layoutHrs} onChange={setLayoutHrs} placeholder="0" />
          </div>
          {/* ── Vapor Barrier ── */}
          <div className="col-span-2">
            <p className="text-[11px] text-gray-700 uppercase tracking-wide mb-1">Vapor Barrier</p>
            <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_5rem_6rem] gap-2 items-end">
              <div>
                <label className="text-xs text-gray-500 block mb-1 text-center">Vendor</label>
                <select
                  className="input text-sm py-1.5 w-full min-w-0"
                  value={activeVaporVendor || ''}
                  onChange={e => {
                    setActiveVaporVendor(e.target.value)
                    setActiveVaporItem('')
                  }}
                  title="Vapor barrier vendor"
                >
                  {!activeVaporVendor && <option value="">Select</option>}
                  {vendorsForCategory('Vapor Barrier').map(v => (
                    <option key={v.id} value={v.id}>
                      {v.name}
                    </option>
                  ))}
                  <option value="Standard">Standard</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1 text-center">Item</label>
                <select
                  className="input text-sm py-1.5 w-full min-w-0"
                  value={activeVaporItem || ''}
                  onChange={e => setActiveVaporItem(e.target.value)}
                >
                  {!activeVaporItem && <option value="">Select item</option>}
                  {activeVaporItem &&
                    !sectionOptions('Vapor Barrier', activeVaporVendor).some(
                      o => (o.ref_key || o.id) === activeVaporItem || o.label === activeVaporItem
                    ) && <option value={activeVaporItem}>{activeVaporItem}</option>}
                  {sectionOptions('Vapor Barrier', activeVaporVendor).map(o => (
                    <option key={o.id} value={o.ref_key || o.id}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1 text-center">Sq Ft</label>
                <NumInput value={activeVaporBarrierSF} onChange={setActiveVaporBarrierSF} className="w-full text-center" />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1 text-center">Material</label>
                <div className="input text-sm py-1.5 w-full text-right bg-gray-50 text-gray-600">
                  {fmt2(calc.vaporMat)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Finish Options ── */}
      <div>
        <SectionHeader title="Finish Options" />
        <div className="grid grid-cols-2 gap-3">
          {/* ── Finish: Finish | Vendor | Item | Sq Ft | Material ──
              Vendor/Item disabled unless the finish has products (e.g. Sand Finish). */}
          <div className="col-span-2">
            <div className="grid grid-cols-[minmax(0,0.9fr)_minmax(0,1fr)_minmax(0,1.4fr)_5rem_6rem] gap-2 items-end">
              <div>
                <label className="text-xs text-gray-500 block mb-1 text-center inline-flex items-center justify-center gap-1 flex-wrap w-full">
                  Finish
                  {!isSub && activeFinishType === 'Sand Finish' && (
                    <span className="text-gray-400">— {calc.sandFinishSFPerHr} Sq Ft/hr</span>
                  )}
                </label>
                <select
                  className="input text-sm py-1.5 w-full"
                  value={activeFinishType}
                  onChange={e => setActiveFinishType(e.target.value)}
                >
                  {FINISH_TYPES.map(t => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1 text-center">Vendor</label>
                <select
                  className={`input text-sm py-1.5 w-full min-w-0 ${finishHasProducts ? '' : 'bg-gray-100 text-gray-400'}`}
                  value={activeFinishMatVendor || ''}
                  onChange={e => {
                    setActiveFinishMatVendor(e.target.value)
                    setActiveFinishMatItem('')
                  }}
                  disabled={!finishHasProducts}
                  title={finishHasProducts ? 'Finish material vendor' : 'No products for this finish'}
                >
                  {!activeFinishMatVendor && <option value="">Select</option>}
                  {vendorsForCategory('Concrete Finish Material').map(v => (
                    <option key={v.id} value={v.id}>
                      {v.name}
                    </option>
                  ))}
                  <option value="Standard">Standard</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1 text-center">Item</label>
                <select
                  className={`input text-sm py-1.5 w-full min-w-0 ${finishHasProducts ? '' : 'bg-gray-100 text-gray-400'}`}
                  value={activeFinishMatItem || ''}
                  onChange={e => setActiveFinishMatItem(e.target.value)}
                  disabled={!finishHasProducts}
                >
                  {!activeFinishMatItem && <option value="">Select item</option>}
                  {activeFinishMatItem &&
                    !sectionOptions('Concrete Finish Material', activeFinishMatVendor).some(
                      o => (o.ref_key || o.id) === activeFinishMatItem || o.label === activeFinishMatItem
                    ) && <option value={activeFinishMatItem}>{activeFinishMatItem}</option>}
                  {sectionOptions('Concrete Finish Material', activeFinishMatVendor).map(o => (
                    <option key={o.id} value={o.ref_key || o.id}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1 text-center">Sq Ft</label>
                <NumInput value={activeFinishMatSF} onChange={setActiveFinishMatSF} className="w-full text-center" />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1 text-center">Material</label>
                <div className="input text-sm py-1.5 w-full text-right bg-gray-50 text-gray-600">
                  {fmt2(calc.finishMat)}
                </div>
              </div>
            </div>
          </div>
          {/* ── Sealer ── */}
          <div className="col-span-2">
            <p className="text-[11px] text-gray-700 uppercase tracking-wide mb-1">Sealer</p>
            <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_5rem_6rem] gap-2 items-end">
              <div>
                <label className="text-xs text-gray-500 block mb-1 text-center">Vendor</label>
                <select
                  className="input text-sm py-1.5 w-full min-w-0"
                  value={activeSealerVendor || ''}
                  onChange={e => {
                    setActiveSealerVendor(e.target.value)
                    setActiveSealerItem('')
                  }}
                  title="Sealer vendor"
                >
                  {!activeSealerVendor && <option value="">Select</option>}
                  {vendorsForCategory('Concrete Sealer').map(v => (
                    <option key={v.id} value={v.id}>
                      {v.name}
                    </option>
                  ))}
                  <option value="Standard">Standard</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1 text-center">Item</label>
                <select
                  className="input text-sm py-1.5 w-full min-w-0"
                  value={activeSealerItem || ''}
                  onChange={e => setActiveSealerItem(e.target.value)}
                >
                  {!activeSealerItem && <option value="">Select item</option>}
                  {activeSealerItem &&
                    !sectionOptions('Concrete Sealer', activeSealerVendor).some(
                      o => (o.ref_key || o.id) === activeSealerItem || o.label === activeSealerItem
                    ) && <option value={activeSealerItem}>{activeSealerItem}</option>}
                  {sectionOptions('Concrete Sealer', activeSealerVendor).map(o => (
                    <option key={o.id} value={o.ref_key || o.id}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1 text-center">Sq Ft</label>
                <NumInput value={activeSealerSF} onChange={setActiveSealerSF} className="w-full text-center" />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1 text-center">Material</label>
                <div className="input text-sm py-1.5 w-full text-right bg-gray-50 text-gray-600">
                  {fmt2(calc.sealerMat)}
                </div>
              </div>
            </div>
          </div>
          {/* ── Color Hardener (bottom) ── */}
          <div className="col-span-2 flex items-end gap-4 pb-1 flex-wrap">
            <label className="flex items-center gap-1.5 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={activeColorYes}
                onChange={e => setActiveColorYes(e.target.checked)}
                className="accent-green-600"
              />
              <span className="text-gray-700">Color Hardener (${calc.colorCostPerCY} per Cu Yd)</span>
            </label>
          </div>
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
            onClick={() => setActiveManualRows(rows => [...rows, { label: '', hours: '', materials: '', subCost: '' }])}
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

      {unpricedItem && (
        <UnpricedItemModal
          item={unpricedItem}
          onClose={() => setUnpricedItem(null)}
          onSaved={refreshAllRates}
        />
      )}
      {newItemTarget && (
        <NewCatalogItemModal
          target={newItemTarget}
          onClose={() => setNewItemTarget(null)}
          onSaved={refreshAllRates}
        />
      )}
    </div>
    </SubRateOverrideProvider>
    </SubTabContext.Provider>
  )
}
