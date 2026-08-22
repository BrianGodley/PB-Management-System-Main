import WorkTypeChooser from './WorkTypeChooser'
import CrewTypeBar from './CrewTypeBar'
import ModuleHeaderSlot from './ModuleHeaderSlot'
// ─────────────────────────────────────────────────────────────────────────────
// ArtificialTurfModule — Artificial Turf system estimator
// Rates pulled from DB:
//   labor_rates  (category='Artificial Turf') — demo, base, install, cut rates
//   material_rates (category='Artificial Turf') — turf brands, base, infill, install materials
//   material_rates (category='Demo') — dump fees for concrete/soil/green waste
//
// Excel source: "Artificial Turf Module" sheet + Master Rates and Calcs
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useCallback, useContext } from 'react'
import { SubTabContext, subSectionTitle } from './subTabContext'
import { supabase } from '../../lib/supabase'
import GpmdBar from './GpmdBar'
import { fetchSalesTaxRate } from '../../lib/companyDefaults'
import { calcWalkAccessLabor, DEFAULT_WALK_ACCESS_PACE_LF_PER_MIN } from '../../lib/walkAccess'
import { catalogItemFor, catalogOptions, fetchModuleCatalog, fetchStandardRateMap } from '../../lib/materialCatalog'
import { calcTurf } from './artificialTurfCalc'

// One-picker scheme: turf-brand materials price Standard from the item's
// null-vendor catalog record (consumed by turfMatPrice, which sets
// fallbackFirst:false). Matches the base-material pickers + sibling modules.
const CATALOG_OPTS = { standardRows: 'null-vendor', stripPrefix: true }

// ── Demo method rates (hrs per Ton) — DemoRatesTurf lookup table ────────────
const DEMO_METHODS = [
  { key: 'Skid Steer Good', label: 'Skid Steer (Good)', matKey: 'Turf - Demo Skid Steer Good' },
  { key: 'Skid Steer OK', label: 'Skid Steer (OK)', matKey: 'Turf - Demo Skid Steer OK' },
  { key: 'Mini Skid Steer', label: 'Mini Skid Steer', matKey: 'Turf - Demo Mini Skid Steer' },
  { key: 'Wheelbarrow', label: 'Wheelbarrow', matKey: 'Turf - Demo Wheelbarrow' },
  { key: 'Hand', label: 'Hand', matKey: 'Turf - Demo Hand' },
]

// ── Demo row types — each has its dump fee key ────────────────────────────────
const DEMO_ROWS = [
  { key: 'concrete', label: 'Concrete', dumpKey: 'Dump Fee - Concrete' },
  { key: 'soil', label: 'Soil', dumpKey: 'Dump Fee - Dirt' },
  { key: 'lawn', label: 'Lawn', dumpKey: 'Dump Fee - Green Waste' },
]

// Turf brands are no longer a hardcoded list — they live in the catalog as
// products (category 'Artificial Turf', sub_category 'Turf Material'). See
// turfBrandOptions / turfBrandRow below.

// ── Estimate-config factors ───────────────────────────────────────────────────
// Only the company/estimate-config constants live here. Every per-item labor
// coefficient and material price is read live from the rate tables (labor_rates
// / misc_rates / material) — no hardcoded rate fallbacks. Missing rates are
// guaranteed by supabase-turf-fallbacks-seed.sql.
// Company/estimate financial settings (labor rate, burden %, GPMD, commission,
// sub GP markup) are sourced live from company_settings — no hardcoded defaults.

// ── Calculation engine ────────────────────────────────────────────────────────
const n = v => parseFloat(v) || 0

// ── Vendor catalog: material-only price override ─────────────────────────────
// The Type (turf brand / base material) still sets the item and its Standard price;
// a real vendor only overrides the MATERIAL price for that item (matched by
// label in the vendor's catalog), never labor.
const TURF_CAT = { base: 'Turf Base', turf: 'Turf Material' }
// Shared Turf Prep base materials. The two prep bases reuse the SAME catalog item
// + Standard price that other modules already price against, so a rate change
// propagates everywhere instead of living in Turf's own 'Turf - Gravel/DG Base'
// rates:
//   • DG (Class II divisor row) ↔ Ground Treatments 'Decomposed Granite' (per ton)
//   • Class II Roadbase        ↔ the Concrete module's base item ('Class II
//     Roadbase', else the 'Base - Class II Roadbase' named rate)
// Their Standard prices are stashed in the module price map (mp): DG under its own
// name, Class II under a synthetic key so it can't collide with the Turf Base
// catalog's OWN 'Class II Roadbase' picker product (same name, different item).
// The three fixed base layers (row.material key → display label + billing unit).
// Selection + pricing flow entirely through BASE_KINDS (sub-category predicates)
// and baseTypePrice; this list only supplies the calc's key → label/qtyUnit
// mapping. Class II / DG bill per Cu Yd, Weed per Sq Ft.
const BASE_MATERIALS = [
  { key: 'Gravel', label: 'Class II Roadbase', qtyUnit: 'cy' },
  { key: 'DG', label: 'DG', qtyUnit: 'cy' },
  { key: 'Weed', label: 'Weed Barrier', qtyUnit: 'sf' },
]
// Turf Prep is three FIXED base layers, each its own mini-section: a fixed
// identity (row label) + vendor picker + Type picker whose options are the shared
// `material` rows for that layer. Vendor + Type together set the price.
//   Roadbase → Class II items (Basic Materials 'Aggregate & Concrete', matched by
//     name since that subcategory also holds concrete/sand)
//   DG Base  → Basic Materials subcategory 'Decomposed Granite'
//   Weed Barrier → Basic Materials subcategory 'Barriers'
const BASE_KINDS = [
  // All three layers now match by canonical Basic Materials sub-category (the one
  // scheme). Roadbase used to match by name because Class II Roadbase lived in the
  // mixed 'Aggregate & Concrete' sub-category; it now has its own shared
  // 'Base Material' sub-category, so it matches like DG and Weed.
  { key: 'Gravel', label: 'Roadbase', match: r => r.sub_category === 'Base Material' },
  { key: 'DG', label: 'DG Base', match: r => r.sub_category === 'Decomposed Granite' },
  { key: 'Weed', label: 'Weed Barrier', match: r => r.sub_category === 'Barriers' },
]
const baseKindDef = key => BASE_KINDS.find(b => b.key === key) || BASE_KINDS[0]
// Vendor-first Type options: the shared products for this layer, filtered to the
// chosen vendor (Standard → null-vendor rows), unique by name.
function baseTypeOptions(sharedRows, kind, vendorSel) {
  const def = baseKindDef(kind)
  const isStd = !vendorSel || vendorSel === 'Standard' || vendorSel === 'auto'
  const seen = new Set()
  return (sharedRows || [])
    .filter(def.match)
    .filter(r => (isStd ? r.vendor_id == null : r.vendor_id === vendorSel))
    .filter(r => (seen.has(r.name) ? false : (seen.add(r.name), true)))
    .map(r => ({ label: r.name, value: r.name, price: n(r.unit_cost) }))
}
// Vendors that carry any product for this layer (for the row's vendor picker).
function baseVendorOptions(sharedRows, vendors, kind) {
  const def = baseKindDef(kind)
  const ids = new Set(
    (sharedRows || []).filter(def.match).filter(r => r.vendor_id != null).map(r => r.vendor_id)
  )
  return (vendors || []).filter(v => ids.has(v.id))
}
// Price for a base row's selected Type + vendor from the shared rows.
function baseTypePrice(sharedRows, kind, vendorSel, typeName) {
  if (!typeName) return 0
  const def = baseKindDef(kind)
  const isStd = !vendorSel || vendorSel === 'Standard' || vendorSel === 'auto'
  if (!isStd) {
    const vr = (sharedRows || []).find(r => def.match(r) && r.name === typeName && r.vendor_id === vendorSel)
    if (vr && n(vr.unit_cost) > 0) return n(vr.unit_cost)
  }
  const sr = (sharedRows || []).find(r => def.match(r) && r.name === typeName && r.vendor_id == null)
  if (sr) return n(sr.unit_cost)
  return 0
}
// Turf-brand (non-base) material price for the chosen vendor + Type from the
// module catalog. Options and pricing come ONLY from the catalog; an unpriced
// item resolves to $0 (surfaced as $0, never a hidden fallback).
function turfMatPrice(cat, vendorSel, typeLabel, houseName, materialRows, catDefaults, mp) {
  const vsel = vendorSel && vendorSel !== 'auto' ? vendorSel : catDefaults?.[cat] || 'Standard'
  const vrow = catalogItemFor(materialRows, cat, vsel, typeLabel, {
    ...CATALOG_OPTS,
    fallbackFirst: false,
  })
  if (vrow) return { price: n(vrow.unit_cost), dbName: vrow.name }
  // No hardcoded fallback — an unpriced item resolves to $0 (surfaced as $0).
  return { price: n(mp[houseName]), dbName: houseName }
}

// Turf brands live entirely in the catalog now (category 'Artificial Turf',
// sub_category 'Turf Material'). One product row per brand = one id; a vendor
// that quotes differently is a price tag on that same id, never a new row.
//   turfBrandOptions → the standard products for the picker ({id, label, row}).
//   turfBrandRow     → resolve a saved selection (row id, or a legacy key/label)
//                      to its row, preferring a vendor-specific row over standard.
function turfBrandOptions(materialRows, vendorSel = 'Standard') {
  // Unset vendor (empty "Select vendor" placeholder) → no items until a vendor
  // is chosen, then the list populates (vendor-first).
  if (!vendorSel) return []
  // Vendor-first (mirrors Paver's paverOptions): Standard/auto → the null-vendor
  // Standard products; a real vendor → only that vendor's Items.
  const vsel = vendorSel && vendorSel !== 'auto' ? vendorSel : 'Standard'
  return catalogOptions(materialRows, TURF_CAT.turf, vsel, {
    standardRows: 'null-vendor',
    stripPrefix: true,
  })
}
function turfBrandRow(materialRows, vendorSel, key) {
  return (
    catalogItemFor(materialRows, TURF_CAT.turf, vendorSel, key, {
      standardRows: 'null-vendor',
      stripPrefix: true,
      fallbackFirst: false,
    }) ||
    catalogItemFor(materialRows, TURF_CAT.turf, 'Standard', key, {
      standardRows: 'null-vendor',
      stripPrefix: true,
      fallbackFirst: true,
    })
  )
}


// ── Default state ─────────────────────────────────────────────────────────────
const DEFAULT_STATE = {
  difficulty: 0,
  crewType: 'Landscape',
  hoursAdj: 0,
  distanceLF: 0, // avg distance from truck to work area
  demo: {
    concrete: { sf: '', inches: '4', method: 'Skid Steer Good' },
    soil: { sf: '', inches: '4', method: 'Skid Steer Good' },
    lawn: { sf: '', inches: '4', method: 'Skid Steer Good' },
  },
  // Master base area — filling this auto-populates each base row's Sq Ft.
  baseAreaSF: '',
  // Three FIXED base layers, each its own row: Roadbase, DG Base, Weed Barrier.
  // Each carries a vendor + Type selection that sets its price.
  baseRows: [
    { material: 'Gravel', type: '', sf: '', vendor: 'Standard' },
    { material: 'DG', type: '', sf: '', vendor: 'Standard' },
    { material: 'Weed', type: '', sf: '', vendor: 'Standard' },
  ],
  useZeoFill: false,
  rolls: [{ brand: '', edgeLF: '', vendor: '', useZeoFill: false }],
  stripRows: [{ lf: '', widthIn: '12', brand: '', vendor: '' }],
  manualRows: [{ label: '', hours: '', materials: '', subCost: '' }],
}

// ── Per-tab input record ──────────────────────────────────────────────────────
// In-House and Sub each hold their own independent copy of every user-input
// field, so the two tabs are separate calculators. Shared fields (crewType,
// subType, rate maps, notes) live at the top level of `state`, not here.
function makeTurfTab(src = {}) {
  const d = DEFAULT_STATE
  return {
    difficulty: src.difficulty ?? d.difficulty,
    hoursAdj: src.hoursAdj ?? d.hoursAdj,
    distanceLF: src.distanceLF ?? d.distanceLF,
    demo: {
      concrete: { ...d.demo.concrete, ...(src.demo?.concrete) },
      soil: { ...d.demo.soil, ...(src.demo?.soil) },
      lawn: { ...d.demo.lawn, ...(src.demo?.lawn) },
    },
    baseRows: (src.baseRows || d.baseRows).map(r => ({ ...r })),
    useZeoFill: src.useZeoFill ?? d.useZeoFill,
    rolls: (src.rolls || d.rolls).map(r => ({ ...r })),
    // strips was a single object; migrate legacy saves into the new row list.
    stripRows: (src.stripRows || (src.strips ? [src.strips] : d.stripRows)).map(r => ({ ...r })),
    manualRows: (src.manualRows || d.manualRows).map(r => ({ ...r })),
  }
}

// ── UI helpers ────────────────────────────────────────────────────────────────
function SecHdr({ title, right = null }) {
  const isSub = useContext(SubTabContext)
  return (
    <div className="bg-gray-100 rounded-lg px-4 py-2.5 border border-gray-200 mb-2 flex items-center justify-between gap-3">
      <h3 className="text-xs font-bold text-gray-600 uppercase tracking-wider">{subSectionTitle(title, isSub)}</h3>
      {right}
    </div>
  )
}
function Inp({ value, onChange, placeholder = '0', type = 'number', step, className = '' }) {
  return (
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      step={step}
      className={`w-full border border-gray-200 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400 ${className}`}
    />
  )
}
function Sel({ value, onChange, options, optionLabels, placeholder }) {
  // When `placeholder` is provided, an unset value shows the placeholder (empty
  // option) and a stored value not in `options` stays selectable (backward-compat).
  const hasVal = value !== '' && value != null
  const known = options.includes(value)
  return (
    <select
      value={hasVal ? value : ''}
      onChange={onChange}
      className="w-full border border-gray-200 rounded-md px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-400"
    >
      {placeholder && !hasVal && <option value="">{placeholder}</option>}
      {placeholder && hasVal && !known && <option value={value}>{value}</option>}
      {options.map((o, i) => (
        <option key={o} value={o}>
          {optionLabels ? optionLabels[i] : o}
        </option>
      ))}
    </select>
  )
}
function TH({ cols }) {
  return (
    <thead>
      <tr className="text-center text-gray-400 border-b border-gray-100 text-xs">
        {cols.map((c, i) => (
          <th key={i} className={`py-1 pr-2 font-medium ${c.w || ''}`}>
            {c.label}
          </th>
        ))}
      </tr>
    </thead>
  )
}
function Toggle({ checked, onChange, label }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={e => onChange(e.target.checked)}
        className="w-4 h-4 rounded accent-blue-600"
      />
      <span className="text-xs text-gray-700">{label}</span>
    </label>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function ArtificialTurfModule({ initialData, onSave, onCancel }) {
  const [state, setState] = useState(() => {
    // Legacy flat state (pre per-tab): input fields lived at the top level. Seed
    // the In-House tab from those; the Sub tab starts empty unless the estimate
    // already stored subData.
    const legacy = { ...DEFAULT_STATE, ...(initialData || {}) }
    // Migrate legacy fixed base object → baseRows list (In-House seed only).
    if (initialData && !initialData.baseRows && initialData.base) {
      const b = initialData.base
      const rows = [
        b.useGravel !== false && { material: 'Gravel', sf: b.gravelSF || '', vendor: b.gravelVendor || 'Standard' },
        b.useDG !== false && { material: 'DG', sf: b.dgSF || '', vendor: b.dgVendor || 'Standard' },
        b.useWeedFabric !== false && { material: 'Weed', sf: b.weedSF || '', vendor: b.weedVendor || 'Standard' },
      ].filter(Boolean)
      legacy.baseRows = rows.length ? rows : DEFAULT_STATE.baseRows.map(r => ({ ...r }))
    }
    return {
      crewType: initialData?.crewType ?? DEFAULT_STATE.crewType,
      subType: initialData?.subType ?? 'In-House',
      // Independent In-House vs Sub input records — each tab is its own calculator.
      ihData: makeTurfTab(initialData?.ihData || legacy),
      subData: makeTurfTab(initialData?.subData || {}),
    }
  })

  // Free-text notes for this module — Sam writes auto-generated
  // takeoffs here via create_estimate_from_takeoff, and the user can
  // overwrite / append their own.
  const [notes, setNotes] = useState(initialData?.notes ?? '')
  const [materialPrices, setMaterialPrices] = useState(initialData?.materialPrices || {})
  const [laborRates, setLaborRates] = useState(initialData?.laborRates || {})
  const [subRates, setSubRates] = useState(initialData?.subRates || {})
  // Vendor catalog: material_rates rows (sub_category + vendor_id) + vendor list.
  const [materialRows, setMaterialRows] = useState(initialData?.materialRows || [])
  // Shared base catalog rows (Concrete + Basic Materials + Ground Treatments) —
  // used to surface the shared Class II / DG base items in View Rates so editing
  // there edits the SAME rate the other modules use.
  const [sharedBaseRows, setSharedBaseRows] = useState([])
  const [vendors, setVendors] = useState([])
  // Company-wide default Vendor + Type per base layer (Roadbase / DG Base / Weed
  // Barrier), edited via the "Defaults" link and stored on company_settings.
  // Applied to a NEW module so those fields open pre-selected.
  const [baseDefaults, setBaseDefaults] = useState(null)
  const [showBaseDefaults, setShowBaseDefaults] = useState(false)
  const [defDraft, setDefDraft] = useState({})
  // Pre-fill each base row's Vendor + Type from the saved defaults. Only touches
  // rows the user hasn't set yet (empty Type, vendor still Standard/unset), so it
  // never overrides a real selection — applies on a fresh module and fills any
  // still-empty rows after defaults are (re)saved.
  useEffect(() => {
    if (!baseDefaults) return
    setState(p => {
      const patch = tab => {
        if (!tab?.baseRows) return tab
        let changed = false
        const baseRows = tab.baseRows.map(r => {
          const d = baseDefaults[r.material]
          if (d && !r.type && (!r.vendor || r.vendor === 'Standard')) {
            changed = true
            return { ...r, vendor: d.vendor || r.vendor, type: d.type || r.type }
          }
          return r
        })
        return changed ? { ...tab, baseRows } : tab
      }
      return { ...p, ihData: patch(p.ihData), subData: patch(p.subData) }
    })
  }, [baseDefaults])
  // Saves the defaults straight to company_settings — independent of the estimate
  // Save button. Surfaces any failure (e.g. the turf_base_defaults column not yet
  // added) instead of silently doing nothing.
  const saveBaseDefaults = useCallback(async () => {
    const { data: row } = await supabase.from('company_settings').select('id').limit(1).maybeSingle()
    let error
    if (row?.id) {
      ;({ error } = await supabase
        .from('company_settings')
        .update({ turf_base_defaults: defDraft })
        .eq('id', row.id))
    } else {
      ;({ error } = await supabase.from('company_settings').insert({ turf_base_defaults: defDraft }))
    }
    if (error) {
      alert('Could not save Turf Prep defaults: ' + error.message)
      return
    }
    setBaseDefaults(defDraft)
    setShowBaseDefaults(false)
  }, [defDraft])
  const [laborRatePerHour, setLaborRatePerHour] = useState(initialData?.laborRatePerHour ?? null)
  const [laborBurdenPct, setLaborBurdenPct] = useState(initialData?.laborBurdenPct ?? null)
  const [gpmd, setGpmd] = useState(initialData?.gpmd ?? null)
  const [commissionRate, setCommissionRate] = useState(initialData?.commissionRate ?? null)
  const [subGpMarkupRate, setSubGpMarkupRate] = useState(initialData?.subGpMarkupRate ?? null)
  const [walkAccess] = useState(
    initialData?.walkAccess ?? {
      paceLfPerMin: DEFAULT_WALK_ACCESS_PACE_LF_PER_MIN,
    }
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

  const [pricesLoading, setPricesLoading] = useState(!initialData?.materialPrices)

  // Re-fetch Turf rate maps. Used on mount and after any RateEditPopover save.
  const refreshAllRates = useCallback(async () => {
    // material_rates retired: base map (incl. shared Demo fees) from the new
    // model; Turf catalog from material + material_price. Markers
    // ('Turf Material'/'Turf Base') are unchanged, so no remap.
    // Also pull the SHARED base categories so the two Turf Prep bases price off the
    // same catalog items other modules use: Basic Materials 'Base Material'
    // (Class II Roadbase) + 'Decomposed Granite' + 'Barriers'. The base pickers read
    // these via sharedBaseRows and match by sub-category (the one scheme) — no name
    // map or synthetic keys.
    const SHARED_BASE_CATS = ['Basic Materials', 'Ground Treatments']
    const [matMap, labRes, subRes, rows, venRes, sharedRows] = await Promise.all([
      fetchStandardRateMap(['Artificial Turf', 'Demo']),
      supabase.from('labor_rates').select('name, rate').eq('category', 'Artificial Turf'),
      supabase
        .from('subcontractor_rates')
        .select('item_key, rate')
        .eq('category', 'Artificial Turf'),
      fetchModuleCatalog(['Artificial Turf']),
      supabase
        .from('subs_vendors')
        .select('id, company_name')
        .eq('type', 'vendor')
        .order('company_name'),
      fetchModuleCatalog(SHARED_BASE_CATS),
    ])
    setMaterialRows(rows || [])
    setSharedBaseRows(sharedRows || [])
    setVendors(
      (venRes.data || []).map(v => ({
        id: v.id,
        name: v.company_name,
      }))
    )
    setMaterialPrices(matMap)
    if (labRes.data) {
      const m = {}
      labRes.data.forEach(r => {
        m[r.name] = parseFloat(r.rate)
      })
      setLaborRates(m)
    }
    if (subRes.data) {
      const m = {}
      subRes.data.forEach(r => {
        m[r.item_key] = parseFloat(r.rate) || 0
      })
      setSubRates(m)
    }
  }, [])

  // Always load the vendor list + material rows (even when re-editing a saved
  // estimate) so the per-line Vendor pickers work.
  useEffect(() => {
    let alive = true
    Promise.all([
      fetchModuleCatalog(['Artificial Turf']),
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

  useEffect(() => {
    let gone = false
    ;(async () => {
      await Promise.all([
        supabase
          .from('company_settings')
          .select('labor_rate_per_hour, labor_burden_pct, estimate_gpmd_default, commission_rate, sub_gp_markup_rate, turf_base_defaults')
          .single()
          .then(({ data }) => {
            if (gone || !data) return
            setBaseDefaults(data.turf_base_defaults || {})
            if (!initialData?.laborRatePerHour && data.labor_rate_per_hour != null)
              setLaborRatePerHour(parseFloat(data.labor_rate_per_hour))
            if (!initialData?.laborBurdenPct && data.labor_burden_pct != null)
              setLaborBurdenPct(parseFloat(data.labor_burden_pct))
            if (initialData?.gpmd == null && data.estimate_gpmd_default != null)
              setGpmd(parseFloat(data.estimate_gpmd_default))
            if (initialData?.commissionRate == null && data.commission_rate != null)
              setCommissionRate(parseFloat(data.commission_rate))
            if (initialData?.subGpMarkupRate == null && data.sub_gp_markup_rate != null)
              setSubGpMarkupRate(parseFloat(data.sub_gp_markup_rate))
          }),
        refreshAllRates(),
      ])
      if (!gone) setPricesLoading(false)
    })()
    return () => {
      gone = true
    }
  }, [refreshAllRates])

  // Active tab helpers. `isSub` selects which per-tab record (ihData/subData)
  // every input reads from and writes to, so the two tabs never affect each other.
  const isSub = state.subType === 'Subcontractor'
  const T = isSub ? state.subData : state.ihData
  const tabKey = p => (p.subType === 'Subcontractor' ? 'subData' : 'ihData')

  // Top-level shared setter (crewType, subType).
  const set = useCallback((f, v) => setState(p => ({ ...p, [f]: v })), [])
  // Active-tab scalar setter (difficulty, hoursAdj, distanceLF, useZeoFill, manualRows…).
  const setT = useCallback(
    (f, v) =>
      setState(p => {
        const k = tabKey(p)
        return { ...p, [k]: { ...p[k], [f]: v } }
      }),
    []
  )
  const setDemo = useCallback(
    (type, field, val) =>
      setState(p => {
        const k = tabKey(p)
        const cur = p[k]
        return {
          ...p,
          [k]: { ...cur, demo: { ...cur.demo, [type]: { ...cur.demo[type], [field]: val } } },
        }
      }),
    []
  )
  const setBaseRow = useCallback(
    (i, field, val) =>
      setState(p => {
        const k = tabKey(p)
        const cur = p[k]
        const baseRows = (cur.baseRows || []).map((r, idx) =>
          idx === i ? { ...r, [field]: val } : r
        )
        return { ...p, [k]: { ...cur, baseRows } }
      }),
    []
  )
  const addBaseRow = useCallback(
    () =>
      setState(p => {
        const k = tabKey(p)
        const cur = p[k]
        return {
          ...p,
          [k]: {
            ...cur,
            baseRows: [...(cur.baseRows || []), { material: '', sf: '', vendor: '' }],
          },
        }
      }),
    []
  )
  // Master base-area field — sets every base row's Sq Ft to the entered value.
  const setBaseAreaSF = useCallback(
    val =>
      setState(p => {
        const k = tabKey(p)
        const cur = p[k]
        const baseRows = (cur.baseRows || []).map(r => ({ ...r, sf: val }))
        return { ...p, [k]: { ...cur, baseAreaSF: val, baseRows } }
      }),
    []
  )
  const removeBaseRow = useCallback(
    i =>
      setState(p => {
        const k = tabKey(p)
        const cur = p[k]
        return { ...p, [k]: { ...cur, baseRows: (cur.baseRows || []).filter((_, idx) => idx !== i) } }
      }),
    []
  )
  const setRoll = useCallback(
    (i, field, val) =>
      setState(p => {
        const k = tabKey(p)
        const cur = p[k]
        const rolls = [...cur.rolls]
        rolls[i] = { ...rolls[i], [field]: val }
        return { ...p, [k]: { ...cur, rolls } }
      }),
    []
  )
  const addRoll = useCallback(
    () =>
      setState(p => {
        const k = tabKey(p)
        const cur = p[k]
        return {
          ...p,
          [k]: { ...cur, rolls: [...(cur.rolls || []), { brand: '', edgeLF: '', vendor: '', useZeoFill: false }] },
        }
      }),
    []
  )
  const removeRoll = useCallback(
    i =>
      setState(p => {
        const k = tabKey(p)
        const cur = p[k]
        return { ...p, [k]: { ...cur, rolls: (cur.rolls || []).filter((_, idx) => idx !== i) } }
      }),
    []
  )
  const setRow = useCallback(
    (i, f, v) =>
      setState(p => {
        const k = tabKey(p)
        const cur = p[k]
        const rows = [...cur.manualRows]
        rows[i] = { ...rows[i], [f]: v }
        return { ...p, [k]: { ...cur, manualRows: rows } }
      }),
    []
  )
  const setStripRow = useCallback(
    (i, field, val) =>
      setState(p => {
        const k = tabKey(p)
        const cur = p[k]
        const stripRows = (cur.stripRows || []).map((r, idx) =>
          idx === i ? { ...r, [field]: val } : r
        )
        return { ...p, [k]: { ...cur, stripRows } }
      }),
    []
  )
  const addStripRow = useCallback(
    () =>
      setState(p => {
        const k = tabKey(p)
        const cur = p[k]
        return {
          ...p,
          [k]: {
            ...cur,
            stripRows: [...(cur.stripRows || []), { lf: '', widthIn: '12', brand: '', vendor: '' }],
          },
        }
      }),
    []
  )

  // ── Vendor catalog helpers (material-only per-line Vendor pickers) ────────
  const vendorsForCategory = cat => vendors.filter(v => materialRows.some(r => r.vendor_id === v.id && (r.sub_category === cat || r.category === cat)))
  // A vendor belongs in a SECTION's dropdown only if they actually price a product
  // under that section's marker (not just somewhere in the category). Standard is
  // always offered via the <option value="Standard">Standard</option> in each select.
  const vendorsSupplyingMarker = marker => {
    const ids = new Set(
      (materialRows || []).filter(r => r.sub_category === marker && r.vendor_id).map(r => r.vendor_id)
    )
    return vendors.filter(v => ids.has(v.id))
  }
  const catDefaults = {} // Turf defaults to Standard; a real vendor is an explicit pick.

  // Feed the calc only the ACTIVE tab's inputs plus the shared top-level fields
  // (crewType, subType). Each tab thus prices from its own independent data.
  const calcState = { ...T, crewType: state.crewType, subType: state.subType }
  const calcRaw = calcTurf(
    calcState,
    laborRatePerHour,
    materialPrices,
    laborRates,
    gpmd,
    walkAccess,
    laborBurdenPct,
    subRates,
    materialRows,
    catDefaults,
    commissionRate,
    sharedBaseRows
  )
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

  const fmt2 = v =>
    `$${n(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  const fh = v => (v > 0 ? v.toFixed(2) : '—')
  const td = 'py-1.5 pr-2 align-top'
  const num = 'py-1.5 pr-2 text-gray-600 tabular-nums text-xs align-top text-center'
  const demoMethodKeys = DEMO_METHODS.map(m => m.key)
  const demoMethodLabels = DEMO_METHODS.map(m => m.label)
  const brandOpts = turfBrandOptions(materialRows)
  const brandKeys = brandOpts.map(o => o.id)
  const brandLabels = brandOpts.map(o => o.label)

  function handleSave() {
    onSave({
      notes,
      man_days: parseFloat(calc.manDays.toFixed(2)),
      material_cost: parseFloat(calc.totalMat.toFixed(2)),
      labor_cost: parseFloat(calc.laborCost.toFixed(2)),
      labor_burden: parseFloat(calc.burden.toFixed(2)),
      gross_profit: parseFloat(calc.gp.toFixed(2)),
      sub_cost: parseFloat(calc.subCost.toFixed(2)),
      total_price: parseFloat(calc.price.toFixed(2)),
      data: {
        ...state,
        walkAccess,
        laborRatePerHour,
        laborBurdenPct,
        gpmd,
        commissionRate,
        subGpMarkupRate,
        materialPrices,
        laborRates,
        subRates,
        calc: {
          totalHrs: calc.totalHrs,
          manDays: calc.manDays,
          laborCost: calc.laborCost,
          burden: calc.burden,
          totalMat: calc.totalMat,
          subCost: calc.subCost,
          gp: calc.gp,
          commission: calc.commission,
          price: calc.price,
          turfAreaSF: calc.turfAreaSF,
        },
      },
    })
  }

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
    category: 'Artificial Turf',
    unitLabel: r0.unit || 'ea',
    mode: 'currency',
    value: n(r0.unit_cost),
  })
  const catalogSort = (a, b) => {
    const va = a.vendor_id == null ? '' : vendorNames[a.vendor_id] || '~'
    const vb = b.vendor_id == null ? '' : vendorNames[b.vendor_id] || '~'
    return va.localeCompare(vb) || (a.name || '').localeCompare(b.name || '')
  }
  // Sub-category–picked sections (Turf Base / Turf Material): all catalog rows.
  const catalogBlockItems = subcat =>
    (materialRows || [])
      .filter(r0 => r0.sub_category === subcat)
      .filter(r0 => r0.vendor_id == null || vendorNames[r0.vendor_id])
      .sort(catalogSort)
      .map(catalogRowToItem)
  // Named materials (base fabrics, infill, install materials): by exact name.
  const materialRateRows = dbName =>
    (materialRows || [])
      .filter(r0 => r0.name === dbName)
      .filter(r0 => r0.vendor_id == null || vendorNames[r0.vendor_id])
      .sort(catalogSort)
      .map(catalogRowToItem)
  // Shared base materials pulled from the shared catalog (Basic Materials
  // 'Base Material' / 'Decomposed Granite' / 'Barriers'). Sourced by the SAME
  // sub-category predicate the base pickers use, so the View Rates row matches the
  // exact records the base install prices against — edit here updates the shared
  // item everywhere. `match` is a BASE_KINDS predicate (r => r.sub_category === …).
  const sharedMatRows = match =>
    (sharedBaseRows || [])
      .filter(match)
      .filter(r0 => r0.vendor_id == null || vendorNames[r0.vendor_id])
      .sort(catalogSort)
      .map(catalogRowToItem)


  return (
    <SubTabContext.Provider value={isSub}>
    <div className="space-y-4">
      {/* ── Frozen header: GPMD bar + Crew Type / View Rates bar ── */}
      <div className="sticky top-0 z-20 -mx-6 bg-white shadow-md">
        <div className="px-6 pt-1 pb-1 bg-gray-900">
          <GpmdBar
            variant={state.subType === 'Subcontractor' ? 'sub' : 'inhouse'}
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
            crewType={state.crewType}
            onCrewTypeChange={v => set('crewType', v)}
            title="Artificial Turf"
            moduleType="Artificial Turf"
            refreshAllRates={refreshAllRates}
            showInlineToggle={false}
          />
        </div>
      </div>

      <ModuleHeaderSlot>
        <WorkTypeChooser value={state.subType || 'In-House'} onChange={v => set('subType', v)} compact />
      </ModuleHeaderSlot>

      {pricesLoading && (
        <div className="text-xs text-amber-700 bg-amber-50 rounded px-3 py-2">
          Loading current rates…
        </div>
      )}

      {/* Settings — Job Site Conditions is In-House only (hidden on Sub tab) */}
      {state.subType !== 'Subcontractor' && (
        <>
      <SecHdr title="Job Site Conditions" />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <p className="text-xs text-gray-500 mb-0.5">Difficulty (%)</p>
          <Inp
            value={T.difficulty}
            onChange={e => setT('difficulty', e.target.value)}
            step="5"
          />
        </div>
        <div>
          <p
            className="text-xs text-gray-500 mb-0.5"
            title="Average Distance from Truck to Work Area"
          >
            Truck → Work Area (Avg LF)
          </p>
          <Inp
            value={T.distanceLF}
            onChange={e => setT('distanceLF', e.target.value)}
            step="5"
          />
          {calc.walkHrs > 0 && (
            <p className="text-[10px] text-gray-500 italic lowercase mt-0.5">
              +{calc.walkHrs.toFixed(2)} hrs walk-access
            </p>
          )}
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-0.5">Hours Adj (±hrs)</p>
          <Inp value={T.hoursAdj} onChange={e => setT('hoursAdj', e.target.value)} step="0.5" />
        </div>
      </div>
        </>
      )}

      {/* Base Installation — In-House only (hidden on Sub tab) */}
      {state.subType !== 'Subcontractor' && (
      <div>
        <SecHdr
          title="Turf Prep"
          right={
            <button
              type="button"
              onClick={() => {
                setDefDraft(baseDefaults || {})
                setShowBaseDefaults(true)
              }}
              className="text-xs text-blue-600 hover:text-blue-700 font-medium"
            >
              Defaults
            </button>
          }
        />
        {/* Master area — fills every base row's Sq Ft automatically. */}
        <div className="flex flex-col items-center mb-3">
          <label className="text-xs font-medium text-gray-600 mb-1 text-center">Square Footage</label>
          <Inp
            value={T.baseAreaSF ?? ''}
            onChange={e => setBaseAreaSF(e.target.value)}
            placeholder="0"
            className="text-center w-32"
          />
        </div>
        <table className="w-full text-xs">
          <TH
            cols={[
              { label: '', w: 'w-20' },
              { label: 'Vendor', w: 'w-32' },
              { label: 'Type' },
              { label: 'Sq Ft', w: 'w-20' },
              { label: 'Qty', w: 'w-14' },
              { label: 'Hrs', w: 'w-12' },
              { label: 'Material', w: 'w-20' },
            ]}
          />
          <tbody className="divide-y divide-gray-50">
            {(T.baseRows || []).map((row, i) => {
              // Each row is a fixed base layer (Roadbase / DG Base / Weed Barrier).
              // Vendor + Type pickers are sourced from the shared material rows for
              // that layer; the calc resolves the price from the selection.
              const def = BASE_MATERIALS.find(m => m.key === row.material) || BASE_MATERIALS[0]
              const kdef = baseKindDef(row.material)
              const typeOpts = baseTypeOptions(sharedBaseRows, row.material, row.vendor)
              const venOpts = baseVendorOptions(sharedBaseRows, vendors, row.material)
              const bc = calc.baseCalc?.[i] || {}
              const unitLabel =
                def.qtyUnit === 'sf' ? 'Sq Ft' : def.qtyUnit === 'roll' ? 'roll' : 'Cu Yd'
              const rate = n(bc.price)
              return (
                <tr key={i}>
                  <td className="py-1.5 align-middle pl-3 pr-3">
                    <span className="text-xs font-medium text-gray-700 whitespace-nowrap">
                      {kdef.label}
                    </span>
                  </td>
                  <td className={td}>
                    <select
                      className="w-full border border-gray-200 rounded-md px-2 py-1.5 text-xs bg-white"
                      value={row.vendor || ''}
                      onChange={e => setBaseRow(i, 'vendor', e.target.value)}
                      title="Vendor"
                    >
                      <option value="">Select</option>
                      <option value="Standard">Standard</option>
                      {venOpts.map(v => (
                        <option key={v.id} value={v.id}>
                          {v.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className={td}>
                    <div className="flex items-center gap-1">
                      <select
                        className="w-full border border-gray-200 rounded-md px-2 py-1.5 text-xs bg-white"
                        value={row.type || ''}
                        onChange={e => setBaseRow(i, 'type', e.target.value)}
                        title="Type"
                      >
                        {!row.type && <option value="">Select type</option>}
                        {row.type && !typeOpts.some(o => o.value === row.type) && (
                          <option value={row.type}>{row.type}</option>
                        )}
                        {typeOpts.map(o => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                      <span className="text-gray-400 whitespace-nowrap">
                        ${rate.toFixed(2)}/{unitLabel}
                      </span>
                    </div>
                  </td>
                  <td className={td}>
                    <Inp
                      value={row.sf}
                      onChange={e => setBaseRow(i, 'sf', e.target.value)}
                      placeholder={calc.turfAreaSF || '0'}
                      className="text-center"
                    />
                  </td>
                  <td className={num}>
                    {bc.qty > 0
                      ? def.qtyUnit === 'sf'
                        ? `${bc.qty.toLocaleString()} Sq Ft`
                        : def.qtyUnit === 'roll'
                          ? `${bc.qty} ${bc.qty === 1 ? 'roll' : 'rolls'}`
                          : `${bc.qty.toFixed(2)} Cu Yd`
                      : '—'}
                  </td>
                  <td className={num}>{bc.hrs > 0 ? fh(bc.hrs) : '—'}</td>
                  <td className={num}>{bc.mat > 0 ? fmt2(bc.mat) : '—'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      )}

      {/* Turf Installation */}
      <div>
        <SecHdr title="Turf Installation (15' Wide Rolls)" />
        {T.rolls.map((roll, i) => {
          const cr = calc.rollCalc[i] || {}
          // Only resolve a brand row when one is selected — an empty picker
          // must not auto-fill the first turf.
          const brandRow = roll.brand ? turfBrandRow(materialRows, roll.vendor, roll.brand) : null
          const rollBrandOpts = turfBrandOptions(materialRows, roll.vendor)
          return (
            <div key={i} className="mb-4 border border-gray-100 rounded-lg p-2">
              <table className="w-full text-xs">
                <TH
                  cols={
                    calc.isSub
                      ? [
                          { label: 'Vendor', w: 'w-40' },
                          { label: 'Turf Type', w: 'w-32' },
                          { label: 'Install SF', w: 'w-24' },
                          { label: 'Edge LF', w: 'w-20' },
                          { label: 'Material', w: 'w-24' },
                        ]
                      : [
                          { label: 'Vendor', w: 'w-40' },
                          { label: 'Turf Type', w: 'w-32' },
                          { label: 'Edge LF', w: 'w-20' },
                          { label: 'Sq Ft', w: 'w-20' },
                          { label: 'Hrs', w: 'w-16' },
                          { label: 'Material', w: 'w-24' },
                        ]
                  }
                />
                <tbody>
                  <tr>
                    <td className={td}>
                      <select
                        className="w-full border border-gray-200 rounded-md px-2 py-1.5 text-xs bg-white"
                        value={roll.vendor || ''}
                        onChange={e => setRoll(i, 'vendor', e.target.value)}
                        title="Vendor"
                      >
                        <option value="">Select</option>
                        <option value="Standard">Standard</option>
                        {vendorsSupplyingMarker(TURF_CAT.turf).map(v => (
                          <option key={v.id} value={v.id}>
                            {v.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className={td}>
                      <Sel
                        value={roll.brand ? (brandRow?.id || roll.brand) : ''}
                        onChange={e => setRoll(i, 'brand', e.target.value)}
                        options={rollBrandOpts.map(o => o.id)}
                        optionLabels={rollBrandOpts.map(o => o.label)}
                        placeholder="Select turf"
                      />
                    </td>
                    {calc.isSub ? (
                      <>
                        <td className={td}>
                          <Inp
                            value={roll.installSF || ''}
                            onChange={e => setRoll(i, 'installSF', e.target.value)}
                            className="text-center"
                          />
                        </td>
                        <td className={td}>
                          <Inp
                            value={roll.edgeLF}
                            onChange={e => setRoll(i, 'edgeLF', e.target.value)}
                            className="text-center"
                          />
                        </td>
                        <td className={num}>{cr.rowSubCost > 0 ? fmt2(cr.rowSubCost) : '—'}</td>
                      </>
                    ) : (
                      <>
                        <td className={td}>
                          <Inp
                            value={roll.edgeLF}
                            onChange={e => setRoll(i, 'edgeLF', e.target.value)}
                            className="text-center"
                          />
                        </td>
                        <td className={num}>{cr.sf > 0 ? cr.sf.toLocaleString() : '—'}</td>
                        <td className={num}>{fh(cr.hrs)}</td>
                        <td className={num}>{cr.mat > 0 ? fmt2(cr.mat) : '—'}</td>
                      </>
                    )}
                  </tr>
                </tbody>
              </table>

              {/* Cut, Staple & Seam for this turf — always shown */}
              <div className="mt-2 bg-gray-50 rounded-lg px-3 py-2 text-xs flex justify-between">
                <span className="text-gray-600 font-medium inline-flex items-center gap-1">
                  Cut, Staple &amp; Seam
                  <span className="text-gray-400 font-normal ml-1">({n(cr.edgeLF) || 0} Ln Ft)</span>
                </span>
                <div className="flex gap-4">
                  {!calc.isSub && <span className="text-gray-700">{fh(cr.cutHrs || 0)} hrs</span>}
                  <span className="text-gray-700">
                    {fmt2(calc.isSub ? cr.subCutMat || 0 : cr.cutMat || 0)} {calc.isSub ? 'sub' : 'mat'}
                  </span>
                </div>
              </div>

              {/* Pet-odor infill for this turf */}
              <div className="mt-1 flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                <Toggle
                  checked={!!roll.useZeoFill}
                  onChange={v => setRoll(i, 'useZeoFill', v)}
                  label="ZeoFill Pet Odor Infill (upgrade)"
                />
                <span className="text-xs text-amber-700 ml-auto inline-flex items-center gap-1">
                  {roll.useZeoFill ? (
                    <>
                      {calc.infillSFPerBag > 0 ? Math.ceil((cr.infillSF || 0) / calc.infillSFPerBag) : 0} bags @ $
                      {n(materialPrices['Turf - Infill ZeoFill']).toFixed(2)}/bag · {fmt2(cr.infillMat || 0)}
                    </>
                  ) : (
                    <>
                      Durafill @ ${n(materialPrices['Turf - Infill Durafill']).toFixed(2)}/SF · {fmt2(cr.infillMat || 0)}
                    </>
                  )}
                </span>
                {T.rolls.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeRoll(i)}
                    className="text-gray-300 hover:text-red-500 text-sm px-1"
                    title="Remove turf"
                  >
                    ×
                  </button>
                )}
              </div>
            </div>
          )
        })}
        <button
          type="button"
          onClick={addRoll}
          className="mt-1 text-xs text-blue-600 hover:text-blue-700 font-medium"
        >
          ＋ Add Turf
        </button>
      </div>

      {/* Turf Strips */}
      <div>
        <SecHdr title="Turf Strips" />
        <table className="w-full text-xs">
          <TH
            cols={
              calc.isSub
                ? [
                    { label: 'Vendor', w: 'w-28' },
                    { label: 'Turf Type' },
                    { label: 'Length (LF)', w: 'w-24' },
                    { label: 'Width (in)', w: 'w-20' },
                    { label: 'Material', w: 'w-24' },
                  ]
                : [
                    { label: 'Vendor', w: 'w-28' },
                    { label: 'Turf Type' },
                    { label: 'Length (LF)', w: 'w-24' },
                    { label: 'Width (in)', w: 'w-20' },
                    { label: 'Sq Ft', w: 'w-16' },
                    { label: 'Hrs', w: 'w-16' },
                    { label: 'Material', w: 'w-24' },
                  ]
            }
          />
          <tbody className="divide-y divide-gray-50">
            {(T.stripRows || []).map((strip, i) => {
              const sc = calc.stripCalc?.[i] || {}
              const rowStripsBrandOpts = turfBrandOptions(materialRows, strip?.vendor)
              // Only resolve a brand row when one is selected — an empty picker
              // must not auto-fill the first turf.
              const stripBrandRow = strip?.brand
                ? turfBrandRow(materialRows, strip?.vendor, strip?.brand)
                : null
              return (
                <tr key={i}>
                  <td className={td}>
                    <select
                      className="w-full border border-gray-200 rounded-md px-2 py-1.5 text-xs bg-white"
                      value={strip?.vendor || ''}
                      onChange={e => setStripRow(i, 'vendor', e.target.value)}
                      title="Vendor"
                    >
                      <option value="">Select</option>
                      <option value="Standard">Standard</option>
                      {vendorsSupplyingMarker(TURF_CAT.turf).map(v => (
                        <option key={v.id} value={v.id}>
                          {v.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className={td}>
                    <Sel
                      value={strip?.brand ? (stripBrandRow?.id || strip?.brand) : ''}
                      onChange={e => setStripRow(i, 'brand', e.target.value)}
                      placeholder="Select turf"
                      options={rowStripsBrandOpts.map(o => o.id)}
                      optionLabels={rowStripsBrandOpts.map(o => o.label)}
                    />
                  </td>
                  <td className={td}>
                    <Inp
                      value={strip?.lf || ''}
                      onChange={e => setStripRow(i, 'lf', e.target.value)}
                      className="text-center"
                    />
                  </td>
                  <td className={td}>
                    <Inp
                      value={strip?.widthIn || '12'}
                      onChange={e => setStripRow(i, 'widthIn', e.target.value)}
                      placeholder="12"
                      step="1"
                      className="text-center"
                    />
                  </td>
                  {calc.isSub ? (
                    <td className={num}>{sc.rowSubCost > 0 ? fmt2(sc.rowSubCost) : '—'}</td>
                  ) : (
                    <>
                      <td className={num}>{sc.sf > 0 ? sc.sf.toLocaleString() : '—'}</td>
                      <td className={num}>{fh(sc.hrs)}</td>
                      <td className={num}>{sc.mat > 0 ? fmt2(sc.mat) : '—'}</td>
                    </>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
        <button
          type="button"
          onClick={addStripRow}
          className="mt-2 text-xs text-blue-600 hover:text-blue-700 font-medium"
        >
          ＋ Add row
        </button>
      </div>

      {/* Manual Entry */}
      <div>
        <SecHdr title="Manual Entry" />
        <table className="w-full text-xs table-fixed">
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
          <TH
            cols={
              isSub
                ? [{ label: 'Description' }, { label: 'Cost ($)' }]
                : [{ label: 'Description' }, { label: 'Hours' }, { label: 'Materials ($)' }]
            }
          />
          <tbody className="divide-y divide-gray-50">
            {T.manualRows.map((r, i) => (
              <tr key={i}>
                <td className={td}>
                  <Inp
                    type="text"
                    value={r.label}
                    onChange={e => setRow(i, 'label', e.target.value)}
                    placeholder="Description"
                  />
                </td>
                {isSub ? (
                  <td className={td}>
                    <div className="flex items-center gap-1">
                      <Inp
                        value={r.subCost}
                        onChange={e => setRow(i, 'subCost', e.target.value)}
                        step="1"
                        className="text-center flex-1"
                      />
                      {T.manualRows.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setT('manualRows', T.manualRows.filter((_, idx) => idx !== i))}
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
                    <td className={td}>
                      <Inp
                        value={r.hours}
                        onChange={e => setRow(i, 'hours', e.target.value)}
                        step="0.5"
                        className="text-center"
                      />
                    </td>
                    <td className={td}>
                      <div className="flex items-center gap-1">
                        <Inp
                          value={r.materials}
                          onChange={e => setRow(i, 'materials', e.target.value)}
                          step="1"
                          className="text-center flex-1"
                        />
                        {T.manualRows.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setT('manualRows', T.manualRows.filter((_, idx) => idx !== i))}
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
          onClick={() => setT('manualRows', [...T.manualRows, { label: '', hours: '', materials: '', subCost: '' }])}
          className="mt-2 text-xs px-2 py-1 rounded bg-slate-100 text-slate-700 hover:bg-slate-200"
        >
          + Add manual entry
        </button>
      </div>

      {/* Turf area context chip */}
      {calc.turfAreaSF > 0 && (
        <div className="flex gap-3 text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
          <span className="font-medium text-gray-700">{calc.turfAreaSF.toLocaleString()} Sq Ft</span>
          <span>turf area</span>
          {calc.infillAreaSF !== calc.turfAreaSF && (
            <span className="text-gray-400">
              · {calc.infillAreaSF.toLocaleString()} Sq Ft infill base
            </span>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <button
          onClick={handleSave}
          className="flex-1 bg-gray-900 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-gray-700 transition-colors"
        >
          Save
        </button>
        <button
          onClick={onCancel}
          className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
      </div>

      {/* Turf Prep Defaults — set a default Vendor + Type per base layer, stored on
          company_settings and pre-filled into new modules. */}
      {showBaseDefaults && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setShowBaseDefaults(false)}
        >
          <div
            className="bg-white rounded-xl shadow-xl w-full max-w-md p-5"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-sm font-bold text-gray-800">Turf Prep Defaults</h3>
              <button
                onClick={() => setShowBaseDefaults(false)}
                className="text-gray-400 hover:text-gray-600 text-lg leading-none"
              >
                ×
              </button>
            </div>
            <p className="text-xs text-gray-500 mb-3">
              Preselected Vendor + Type for each base layer on new Artificial Turf estimates.
            </p>
            <table className="w-full text-xs">
              <thead>
                <tr className="text-gray-500 border-b border-gray-200">
                  <th className="text-left pb-1 font-medium">Base</th>
                  <th className="text-left pb-1 pl-2 font-medium">Vendor</th>
                  <th className="text-left pb-1 pl-2 font-medium">Type</th>
                </tr>
              </thead>
              <tbody>
                {BASE_KINDS.map(k => {
                  const cur = defDraft[k.key] || {}
                  const venOpts = baseVendorOptions(sharedBaseRows, vendors, k.key)
                  const typeOpts = baseTypeOptions(sharedBaseRows, k.key, cur.vendor)
                  const setD = (field, val) =>
                    setDefDraft(d => ({ ...d, [k.key]: { ...(d[k.key] || {}), [field]: val } }))
                  return (
                    <tr key={k.key} className="border-b border-gray-100">
                      <td className="py-1.5 font-medium text-gray-700 whitespace-nowrap">{k.label}</td>
                      <td className="py-1.5 pl-2">
                        <select
                          className="w-full border border-gray-200 rounded-md px-2 py-1.5 bg-white"
                          value={cur.vendor || ''}
                          onChange={e => setD('vendor', e.target.value)}
                        >
                          <option value="">Select</option>
                          <option value="Standard">Standard</option>
                          {venOpts.map(v => (
                            <option key={v.id} value={v.id}>
                              {v.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-1.5 pl-2">
                        <select
                          className="w-full border border-gray-200 rounded-md px-2 py-1.5 bg-white"
                          value={cur.type || ''}
                          onChange={e => setD('type', e.target.value)}
                        >
                          <option value="">Select type</option>
                          {cur.type && !typeOpts.some(o => o.value === cur.type) && (
                            <option value={cur.type}>{cur.type}</option>
                          )}
                          {typeOpts.map(o => (
                            <option key={o.value} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            <div className="flex gap-2 mt-4">
              <button
                onClick={saveBaseDefaults}
                className="flex-1 bg-gray-900 text-white py-2 rounded-lg text-sm font-semibold hover:bg-gray-700"
              >
                Save Defaults
              </button>
              <button
                onClick={() => setShowBaseDefaults(false)}
                className="flex-1 border border-gray-200 text-gray-600 py-2 rounded-lg text-sm font-medium hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </SubTabContext.Provider>
  )
}
