import WorkTypeChooser from './WorkTypeChooser'
import CrewTypeBar from './CrewTypeBar'
import ModuleHeaderSlot from './ModuleHeaderSlot'
import { useState, useEffect, useCallback, useContext } from 'react'
import { SubTabContext, subSectionTitle } from './subTabContext'
import { supabase } from '../../lib/supabase'
import GpmdBar from './GpmdBar'
import RateEditPopover from '../RateEditPopover'
import DropdownSelect from '../DropdownSelect'
import { fetchSalesTaxRate } from '../../lib/companyDefaults'
import { calcWalkAccessLabor, DEFAULT_WALK_ACCESS_PACE_LF_PER_MIN } from '../../lib/walkAccess'
import {
  fetchPriceLedgerAsOf,
  ledgerPrice,
  catalogOptions,
  catalogItemFor,
  fetchModuleCatalog,
} from '../../lib/materialCatalog'

const CATALOG_OPTS = { standardRows: 'null-vendor', stripPrefix: false }

// ─────────────────────────────────────────────────────────────────────────────
// Lighting Module — per-vendor catalog layout (mirrors PaverModule).
//
// Items live in material_rates (category='Lighting') under a sub_category
// ('Light Fixture' | 'Transformer' | 'Wire'), optionally tagged to a vendor
// (vendor_id NULL = Standard). Lighting-specific attribute columns:
//   • watts / va        — per-each electrical load (fixtures only)
//   • labor_hrs_ea       — in-house install hours per each (wire = null)
//   • sub_price_ea       — subcontractor flat $/each (may be null → unit_cost)
//
// Each of the three sections is an add/remove ROW table. The In-House and
// Subcontractor tabs are independent calculators (makeTab / ihTab / subTab).
// The Sub tab prices each item at a flat $/each with NO labor hours and routes
// the itemized cost into subCost (GpmdBar's 'sub' variant).
// ─────────────────────────────────────────────────────────────────────────────

const LIGHTING_CATEGORY = 'Lighting'
const LIGHT_CAT = { fixture: 'Light Fixture', transformer: 'Transformer', wire: 'Wire' }

// Material markup applied to all fixture / transformer / wire materials. Read
// live from the price list (misc_rates 'Lighting - Material Markup', category
// 'Lighting'), stored as a fraction (0.15 = 15%). No hardcoded fallback: a
// missing row means no markup (0).
const MATERIAL_MARKUP_NAME = 'Lighting - Material Markup'

// Install labor now lives in labor_rates (per section, Each per hour) — NOT on the
// product (labor_hrs_ea is no longer read for labor). Bistro is a string light, so
// it's priced per linear foot.
const FIXTURE_LABOR_NAME = 'Lighting - Fixture Labor'
const TRANSFORMER_LABOR_NAME = 'Lighting - Transformer Labor'
const BISTRO_LABOR_NAME = 'Lighting - Bistro Labor'
const WIRE_LABOR_NAME = 'Lighting - Wire Labor'
const isBistroItem = it => /bistro/i.test(it?.name || it?.description || '')

// Company/estimate financial settings (labor rate, burden %, GPMD, commission,
// sub GP markup) are sourced live from company_settings — no hardcoded defaults.

const n = v => parseFloat(v) || 0

// ── Vendor catalog helpers (mirror PaverModule) ──────────────────────────────
// Option list for a section = the catalog items for that sub_category + vendor.
// Standard (vendorSel === 'Standard' or falsy) → rows with vendor_id == null;
// otherwise → rows whose vendor_id === vendorSel. Each option carries the
// material_rates row id (the STABLE, rename-proof key a selection is stored /
// matched by) plus a clean label.
// Vendor catalog options + row resolution from the shared library. Standard =
// vendor_id IS NULL rows (Lighting prices Standard from the catalog, not a map).
function lightingOptions(subcat, vendorSel, materialRows) {
  return catalogOptions(materialRows, subcat, vendorSel, CATALOG_OPTS)
}
function lightingItemFor(subcat, vendorSel, key, materialRows) {
  return catalogItemFor(materialRows, subcat, vendorSel, key, CATALOG_OPTS)
}

// Default sub $/each for a picked item: sub_price_ea, else unit_cost.
function defaultSubEach(item) {
  if (!item) return ''
  const v = item.sub_price_ea != null ? item.sub_price_ea : item.unit_cost
  return v == null ? '' : String(v)
}

// ── Calculation ──────────────────────────────────────────────────────────────
// Processes a section's rows → { hrs, mat, watts, va, sub }.
// priceOf(item) resolves the item's current MATERIAL unit cost — from the price
// ledger when available, else the row's own unit_cost. Defaults to unit_cost so
// the calc still works when no ledger is supplied.
function processSection(subcat, rows, materialRows, priceOf = item => n(item.unit_cost), laborHrsFor = () => 0) {
  let hrs = 0,
    mat = 0,
    watts = 0,
    va = 0,
    sub = 0
  ;(rows || []).forEach(r => {
    const qty = n(r.qty)
    if (qty <= 0) return
    const item = lightingItemFor(subcat, r.vendor, r.itemId, materialRows)
    if (!item) return
    const cost = priceOf(item)
    watts += qty * n(item.watts)
    va += qty * n(item.va)
    hrs += laborHrsFor(item, qty) // install labor from labor_rates (per section)
    mat += qty * cost
    const each =
      r.subEach !== '' && r.subEach != null
        ? n(r.subEach)
        : item.sub_price_ea != null
          ? n(item.sub_price_ea)
          : cost
    sub += qty * each
  })
  return { hrs, mat, watts, va, sub }
}

function calcLighting(
  state,
  laborRatePerHour,
  materialRows = [],
  gpmd,
  walkAccess = null,
  laborBurdenPct,
  priceOf = item => n(item.unit_cost),
  materialMarkup = null,
  commissionRate,
  laborRates = {}
) {
  const _pace = parseFloat(walkAccess?.paceLfPerMin) || DEFAULT_WALK_ACCESS_PACE_LF_PER_MIN
  const { difficulty, hoursAdj, fixtureRows, transformerRows, wireRows, manualRows, distanceLF } =
    state
  const isSub = state.subType === 'Subcontractor'

  // Install labor per section, read from labor_rates. Every rate is hours-per-unit
  // (fixtures/transformers = hrs per each; Bistro/wire = hrs per Ln Ft), so the calc
  // is uniformly hrs = qty × rate. A missing/0 rate contributes 0 hours.
  const fixtureRate = n(laborRates[FIXTURE_LABOR_NAME])
  const bistroRate = n(laborRates[BISTRO_LABOR_NAME])
  const xfRate = n(laborRates[TRANSFORMER_LABOR_NAME])
  const wireRate = n(laborRates[WIRE_LABOR_NAME])
  const fixtureHrs = (item, qty) => (isBistroItem(item) ? qty * bistroRate : qty * fixtureRate)
  const xfHrs = (item, qty) => qty * xfRate
  const wireHrs = (item, qty) => qty * wireRate

  const fx = processSection(LIGHT_CAT.fixture, fixtureRows, materialRows, priceOf, fixtureHrs)
  const xf = processSection(LIGHT_CAT.transformer, transformerRows, materialRows, priceOf, xfHrs)
  const wr = processSection(LIGHT_CAT.wire, wireRows, materialRows, priceOf, wireHrs)

  // Electrical load (fixtures) is shown on both tabs for transformer sizing.
  const totalWatts = fx.watts + xf.watts + wr.watts
  const totalVA = fx.va + xf.va + wr.va

  const _markup = n(materialMarkup)
  const rawMat = fx.mat + xf.mat + wr.mat
  const markedUpMat = rawMat * (1 + _markup)

  let manHrs = 0,
    manMat = 0,
    manSub = 0
  ;(manualRows || []).forEach(r => {
    manHrs += n(r.hours)
    manMat += n(r.materials)
    manSub += n(r.subCost)
  })

  // In-House labor hours from the itemized rows (0 on the Sub tab).
  const itemHrs = isSub ? 0 : fx.hrs + xf.hrs + wr.hrs
  const subtotalHrs = itemHrs
  const diffHrs = subtotalHrs * (n(difficulty) / 100)
  const _preWalkHrs = subtotalHrs + diffHrs + (isSub ? 0 : manHrs) + (isSub ? 0 : parseFloat(hoursAdj) || 0)
  const walkHrs = isSub ? 0 : calcWalkAccessLabor(_preWalkHrs, distanceLF, { paceLfPerMin: _pace })
  const totalHrs = _preWalkHrs + walkHrs
  const manDays = totalHrs / 8

  const totalMat = markedUpMat + (isSub ? 0 : manMat)
  const laborCost = totalHrs * n(laborRatePerHour)
  const burden = laborCost * n(laborBurdenPct)

  let gp, subGp, commission, subCost, price
  if (isSub) {
    // Sub tab: flat $/each pricing, no labor. Route the itemized cost into
    // subCost so GpmdBar's 'sub' variant totals it (subCost + subGp + comm).
    const itemizedSub = fx.sub + xf.sub + wr.sub
    subCost = itemizedSub + manSub
    gp = 0
    subGp = subCost * n(state.subGpMarkupRate)
    commission = subGp * n(commissionRate)
    price = subCost + subGp + commission
  } else {
    gp = manDays * n(gpmd)
    subGp = 0
    commission = gp * n(commissionRate)
    subCost = manSub
    price = totalMat + laborCost + burden + gp + commission + subCost
  }

  return {
    totalHrs,
    manDays,
    totalMat,
    totalWatts,
    totalVA,
    rawMat,
    markedUpMat,
    laborCost,
    burden,
    gp,
    subGp,
    commission,
    subCost,
    price,
    walkHrs,
  }
}

// ── Default blank state ───────────────────────────────────────────────────────
const blankRow = () => ({ vendor: 'Standard', itemId: '', qty: '', subEach: '' })
const blankRows = () => [blankRow(), blankRow(), blankRow()]
const DEFAULT_MANUAL_ROWS = [{ label: '', hours: '', materials: '', subCost: '' }]

// makeTab() seeds a tab's independent takeoff inputs; ihData / subData persist
// both. Legacy modules (flat data, no ihData) load into the In-House tab.
const makeTab = (src = {}) => ({
  difficulty: src.difficulty ?? '',
  hoursAdj: src.hoursAdj ?? '',
  distanceLF: src.distanceLF ?? '',
  fixtureRows: src.fixtureRows ? src.fixtureRows.map(r => ({ ...r })) : blankRows(),
  transformerRows: src.transformerRows ? src.transformerRows.map(r => ({ ...r })) : [blankRow()],
  wireRows: src.wireRows ? src.wireRows.map(r => ({ ...r })) : [blankRow()],
  manualRows: src.manualRows ? src.manualRows.map(r => ({ ...r })) : DEFAULT_MANUAL_ROWS.map(r => ({ ...r })),
})

// ── Sub-components ────────────────────────────────────────────────────────────
function SectionHeader({ title }) {
  const isSub = useContext(SubTabContext)
  return (
    <div className="bg-gray-100 rounded-lg px-4 py-2.5 border border-gray-200 mb-2">
      <h3 className="text-xs font-bold text-gray-600 uppercase tracking-wider">{subSectionTitle(title, isSub)}</h3>
    </div>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function LightingModule({ onSave, onBack, saving, initialData }) {
  const [laborRatePerHour, setLaborRatePerHour] = useState(
    initialData?.laborRatePerHour ?? null
  )
  const [laborBurdenPct, setLaborBurdenPct] = useState(
    initialData?.laborBurdenPct ?? null
  )
  const [gpmd, setGpmd] = useState(initialData?.gpmd ?? null)
  const [commissionRate, setCommissionRate] = useState(initialData?.commissionRate ?? null)
  const [subGpMarkupRate, setSubGpMarkupRate] = useState(initialData?.subGpMarkupRate ?? null)

  // Free-text notes for this module — Sam writes auto-generated takeoffs here
  // via create_estimate_from_takeoff, and the user can overwrite / append.
  const [notes, setNotes] = useState(initialData?.notes ?? '')
  const [walkAccess, setWalkAccess] = useState(
    initialData?.walkAccess ?? { paceLfPerMin: DEFAULT_WALK_ACCESS_PACE_LF_PER_MIN }
  )

  // Vendor catalog (material_rates rows for Lighting) + the vendor list that
  // drives the per-row Vendor/Item pickers.
  const [materialRows, setMaterialRows] = useState(initialData?.materialRows || [])
  const [vendors, setVendors] = useState([])
  const [loading, setLoading] = useState(true)
  // Phase 4 price ledger: price per (material, vendor), as of `asOfDate`
  // (blank = current). Lets the estimate be priced at historical rates.
  const [ledger, setLedger] = useState({})
  const [asOfDate, setAsOfDate] = useState('')
  // Material markup coefficient from the price list (fraction). Null → fallback.
  const [materialMarkup, setMaterialMarkup] = useState(null)
  // Per-section install labor rates (labor_rates, category Lighting).
  const [laborRates, setLaborRates] = useState({})

  // Re-fetch the lighting catalog + vendor list + markup rate. Used on mount
  // and after a markup RateEditPopover save.
  const refreshCatalog = useCallback(async () => {
    // material_rates retired: catalog (with watts/va/labor/sub-price specs) from
    // material + material_price. Subcategories (Light Fixture/Transformer/Wire)
    // are unchanged, so no remap needed.
    const [rows, venRes, mkRes, lrRes] = await Promise.all([
      fetchModuleCatalog([LIGHTING_CATEGORY]),
      supabase
        .from('subs_vendors')
        .select('id, company_name')
        .eq('type', 'vendor')
        .order('company_name'),
      supabase
        .from('misc_rates')
        .select('name, rate')
        .eq('category', LIGHTING_CATEGORY)
        .eq('name', MATERIAL_MARKUP_NAME)
        .maybeSingle(),
      supabase.from('labor_rates').select('name, rate').eq('category', LIGHTING_CATEGORY),
    ])
    const mk = mkRes.data ? parseFloat(mkRes.data.rate) : NaN
    setMaterialMarkup(Number.isFinite(mk) ? mk : null)
    const lrMap = {}
    ;(lrRes.data || []).forEach(r => {
      lrMap[r.name] = parseFloat(r.rate)
    })
    setLaborRates(lrMap)
    setMaterialRows(rows || [])
    setVendors(
      (venRes.data || []).map(v => ({
        id: v.id,
        name: v.company_name,
      }))
    )
  }, [])

  useEffect(() => {
    let gone = false
    ;(async () => {
      supabase
        .from('company_settings')
        .select('labor_rate_per_hour, labor_burden_pct, walk_access_pace_lf_per_min, estimate_gpmd_default, commission_rate, sub_gp_markup_rate')
        .single()
        .then(({ data }) => {
          if (gone || !data) return
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
      await refreshCatalog()
      if (!gone) setLoading(false)
    })()
    return () => {
      gone = true
    }
  }, [refreshCatalog])

  // ── Shared (not per-tab) fields ──────────────────────────────────────────────
  const [crewType, setCrewType] = useState(initialData?.crewType ?? 'Landscape')
  const [subType, setSubType] = useState(initialData?.subType ?? 'In-House')
  const isSub = subType === 'Subcontractor'

  // ── Per-tab independence — In-House and Subcontractor keep their own takeoff
  //    inputs so entering data on one tab never changes the other. ───────────────
  const [ihTab, setIhTab] = useState(() => makeTab(initialData?.ihData ?? initialData))
  const [subTab, setSubTab] = useState(() => makeTab(initialData?.subData))
  const cur = isSub ? subTab : ihTab
  const setCur = isSub ? setSubTab : setIhTab
  const setField = k => v => setCur(p => ({ ...p, [k]: typeof v === 'function' ? v(p[k]) : v }))

  const difficulty = cur.difficulty
  const setDifficulty = setField('difficulty')
  const hoursAdj = cur.hoursAdj
  const setHoursAdj = setField('hoursAdj')
  const distanceLF = cur.distanceLF
  const setDistanceLF = setField('distanceLF')
  const fixtureRows = cur.fixtureRows
  const setFixtureRows = setField('fixtureRows')
  const transformerRows = cur.transformerRows
  const setTransformerRows = setField('transformerRows')
  const wireRows = cur.wireRows
  const setWireRows = setField('wireRows')
  const manualRows = cur.manualRows
  const setManualRows = setField('manualRows')

  // ── Sales tax — applied to totalMat across every module so the bid reflects
  //    supplier-invoiced material cost. ─────────────────────────────────────────
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

  // (Re)load the price ledger for the catalog whenever the rows or the as-of
  // date change. Blank asOfDate → current price.
  useEffect(() => {
    let alive = true
    fetchPriceLedgerAsOf(
      materialRows.map(r => r.id),
      asOfDate || null
    ).then(m => {
      if (alive) setLedger(m)
    })
    return () => {
      alive = false
    }
  }, [materialRows, asOfDate])

  // Resolve an item's material cost from the price ledger (per-vendor), falling
  // back to the row's own unit_cost. Shared by the calc + the render display.
  const priceOf = item => (item ? ledgerPrice(ledger, item.id, item.vendor_id, n(item.unit_cost)) : 0)

  const calcRaw = calcLighting(
    {
      difficulty,
      hoursAdj,
      distanceLF,
      fixtureRows,
      transformerRows,
      wireRows,
      manualRows,
      subType,
      subGpMarkupRate,
    },
    laborRatePerHour,
    materialRows,
    gpmd,
    walkAccess,
    laborBurdenPct,
    priceOf,
    materialMarkup,
    commissionRate,
    laborRates
  )
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

  // ── Vendor / row helpers ─────────────────────────────────────────────────────
  const vendorsForCategory = cat => vendors.filter(v => materialRows.some(r => r.vendor_id === v.id))
  const vendorSelectOptions = () => [
    { value: 'Standard', label: 'Standard' },
    ...vendorsForCategory(LIGHTING_CATEGORY).map(v => ({ value: v.id, label: v.name })),
  ]

  function updateRow(rows, setRows, i, patch) {
    setRows(rs => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)))
  }
  function addRow(setRows) {
    setRows(rs => [...rs, blankRow()])
  }
  function removeRow(setRows, i) {
    setRows(rs => (rs.length > 1 ? rs.filter((_, idx) => idx !== i) : rs))
  }
  function onVendorChange(subcat, rows, setRows, i, vendor) {
    const opts = lightingOptions(subcat, vendor, materialRows)
    const first = opts[0]
    const patch = { vendor, itemId: first?.id || '', subEach: '' }
    if (isSub && first) patch.subEach = defaultSubEach(first.row)
    updateRow(rows, setRows, i, patch)
  }
  function onItemChange(subcat, rows, setRows, i, row, id) {
    const patch = { itemId: id }
    if (isSub) {
      const item = lightingItemFor(subcat, row.vendor, id, materialRows)
      patch.subEach = defaultSubEach(item)
    }
    updateRow(rows, setRows, i, patch)
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
        // Active-tab fields (kept flat for backwards-compatible readers)
        difficulty,
        hoursAdj,
        distanceLF,
        fixtureRows,
        transformerRows,
        wireRows,
        manualRows,
        // Shared
        notes,
        crewType,
        subType,
        subGpMarkupRate,
        commissionRate,
        walkAccess,
        laborRatePerHour,
        laborBurdenPct,
        gpmd,
        materialRows,
        // Per-tab records
        ihData: ihTab,
        subData: subTab,
        calc: {
          totalHrs: calc.totalHrs,
          manDays: calc.manDays,
          totalMat: calc.totalMat,
          totalWatts: calc.totalWatts,
          totalVA: calc.totalVA,
          rawMat: calc.rawMat,
          markedUpMat: calc.markedUpMat,
          laborCost: calc.laborCost,
          burden: calc.burden,
          gp: calc.gp,
          subGp: calc.subGp,
          commission: calc.commission,
          subCost: calc.subCost,
          price: calc.price,
        },
      },
    })
  }

  const fmt2 = v =>
    `$${n(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  // ── Section table renderer ───────────────────────────────────────────────────
  function renderSection(sec) {
    const { title, subcat, rows, setRows, isFixture } = sec
    const vOpts = vendorSelectOptions()
    const itemPlaceholder =
      subcat === LIGHT_CAT.fixture
        ? 'Select fixture'
        : subcat === LIGHT_CAT.transformer
          ? 'Select transformer'
          : 'Select wire'
    return (
      <div>
        <SectionHeader title={title} />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 border-b border-gray-200">
                <th className="text-center pb-1 pr-2 font-medium w-40">Vendor</th>
                <th className="text-center pb-1 pr-2 font-medium">Item</th>
                <th className="text-center pb-1 pr-2 font-medium w-20">Qty</th>
                <th className="text-center pb-1 pr-2 font-medium text-gray-400 w-16">Watts</th>
                <th className="text-center pb-1 pr-2 font-medium text-gray-400 w-24">
                  {isSub ? 'Price (each)' : 'Labor Hrs'}
                </th>
                <th className="text-center pb-1 font-medium text-gray-400 w-24">Material</th>
                <th className="w-6" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => {
                const opts = lightingOptions(subcat, row.vendor, materialRows)
                const selId = row.itemId || ''
                const item = lightingItemFor(subcat, row.vendor, row.itemId, materialRows)
                const qty = n(row.qty)
                const watts = item ? qty * n(item.watts) : 0
                const laborHrs = item ? qty * n(item.labor_hrs_ea) : 0
                const itemCost = priceOf(item)
                const eachSub =
                  row.subEach !== '' && row.subEach != null
                    ? n(row.subEach)
                    : item
                      ? item.sub_price_ea != null
                        ? n(item.sub_price_ea)
                        : itemCost
                      : 0
                const material = isSub ? qty * eachSub : item ? qty * itemCost : 0
                return (
                  <tr key={i} className="border-b border-gray-100">
                    <td className="py-1.5 pr-2">
                      <select
                        className="input text-sm py-1 w-full"
                        value={row.vendor || 'Standard'}
                        onChange={e =>
                          onVendorChange(subcat, rows, setRows, i, e.target.value)
                        }
                      >
                        {vOpts.map(o => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-1.5 pr-2">
                      {/* Searchable, portal-rendered item picker — long catalog lists. */}
                      <DropdownSelect
                        searchable
                        portal
                        className="input text-sm py-1 w-full"
                        placeholder={opts.length === 0 ? '— No items —' : itemPlaceholder}
                        value={selId}
                        onChange={val => onItemChange(subcat, rows, setRows, i, row, val)}
                        options={[
                          ...(row.itemId && !opts.some(o => o.id === row.itemId)
                            ? [{ value: row.itemId, label: item?.name || 'Saved item' }]
                            : []),
                          ...opts.map(o => ({
                            value: o.id,
                            label: `${o.label}${o.row.unit ? ` (${o.row.unit})` : ''}`,
                          })),
                        ]}
                      />
                    </td>
                    <td className="py-1.5 pr-2">
                      <input
                        type="number"
                        step="1"
                        className="input text-sm py-1 w-full text-center"
                        placeholder="0"
                        value={row.qty}
                        onChange={e => updateRow(rows, setRows, i, { qty: e.target.value })}
                      />
                    </td>
                    <td className="py-1.5 text-center text-gray-400 text-xs pr-2">
                      {isFixture ? (qty > 0 ? watts.toFixed(1) : '—') : '—'}
                    </td>
                    <td className="py-1.5 text-center text-xs pr-2">
                      {isSub ? (
                        <input
                          type="number"
                          step="0.01"
                          className="input text-sm py-1 w-full text-center"
                          placeholder="0.00"
                          value={row.subEach ?? ''}
                          onChange={e => updateRow(rows, setRows, i, { subEach: e.target.value })}
                        />
                      ) : (
                        <span className="text-gray-400 block text-center">
                          {laborHrs > 0 ? laborHrs.toFixed(2) : '—'}
                        </span>
                      )}
                    </td>
                    <td className="py-1.5 text-center text-gray-600 text-xs">
                      {material > 0 ? fmt2(material) : '—'}
                    </td>
                    <td className="py-1.5 text-right">
                      <button
                        type="button"
                        onClick={() => removeRow(setRows, i)}
                        className="text-gray-300 hover:text-red-500 text-xs px-1"
                        title="Remove row"
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <button
            type="button"
            onClick={() => addRow(setRows)}
            className="mt-2 text-xs text-green-700 hover:text-green-900 font-medium"
          >
            + Add row
          </button>
        </div>

        {/* Watts / VA running summary — fixtures section only */}
        {isFixture && (calc.totalWatts > 0 || calc.totalVA > 0) && (
          <div className="flex gap-4 mt-2 px-1">
            <div className="flex items-center gap-1.5 text-xs text-blue-700 bg-blue-50 px-3 py-1.5 rounded-lg">
              <span className="font-semibold">Total Watts:</span>
              <span>{calc.totalWatts.toFixed(1)} W</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-purple-700 bg-purple-50 px-3 py-1.5 rounded-lg">
              <span className="font-semibold">Total VA:</span>
              <span>{calc.totalVA.toFixed(1)} VA</span>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ── Grouped rate list for the "View Rates" popup (CrewTypeBar). Every rate
  //    that used to have an inline RateEditPopover in this module now lives here.
  //    Each section lists its catalog MATERIAL rates (one row per vendor,
  //    Standard first) sourced from the module's material catalog — mirrors the
  //    Walls module View Rates. Lighting labor lives per-item (labor_hrs_ea) so
  //    the only standalone rate is the material markup.
  const vendorNames = Object.fromEntries((vendors || []).map(v => [v.id, v.name]))
  // Catalog material rows for a sub_category → one row per vendor (Standard
  // first), each editable straight to material_price (same helper Walls uses).
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
        category: LIGHTING_CATEGORY,
        unitLabel: r0.unit || 'ea',
        mode: 'currency',
        value: n(r0.unit_cost),
      }))
  const lightingRateList = [
    { group: 'Fixtures', items: catalogBlockItems(LIGHT_CAT.fixture) },
    { group: 'Transformers', items: catalogBlockItems(LIGHT_CAT.transformer) },
    { group: 'Wire', items: catalogBlockItems(LIGHT_CAT.wire) },
    {
      group: 'Materials',
      items: [
        {
          label: MATERIAL_MARKUP_NAME,
          table: 'misc_rates',
          name: MATERIAL_MARKUP_NAME,
          category: LIGHTING_CATEGORY,
          mode: 'coefficient',
          unitLabel: 'fraction',
          value: n(materialMarkup),
          section: 'material',
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
            title="Lighting"
            moduleType="Lighting"
            rates={lightingRateList}
            refreshAllRates={refreshCatalog}
            showInlineToggle={false}
          />
        </div>
      </div>

      <ModuleHeaderSlot>
        <WorkTypeChooser value={subType || 'In-House'} onChange={setSubType} compact />
      </ModuleHeaderSlot>

      {/* Prices as of — leave blank for current prices, or pick a date to
          re-price the catalog at the rates in effect on that date. */}
      <div className="flex items-center gap-3 bg-gray-50 rounded-lg px-4 py-2.5 border border-gray-200">
        <label className="text-sm font-medium text-gray-700 whitespace-nowrap">Prices as of</label>
        <input
          type="date"
          value={asOfDate}
          onChange={e => setAsOfDate(e.target.value)}
          className="input text-sm py-1 w-44"
        />
        {asOfDate && (
          <button
            type="button"
            onClick={() => setAsOfDate('')}
            className="text-xs text-green-700 hover:text-green-900 font-medium"
          >
            Use current
          </button>
        )}
        <span className="text-[11px] text-gray-400">blank = today's prices</span>
      </div>

      {loading && (
        <div className="text-xs text-amber-700 bg-amber-50 rounded px-3 py-2">
          Loading lighting catalog…
        </div>
      )}

      {/* Settings — Job Site Conditions is In-House only (hidden on Sub tab) */}
      {!isSub && (
        <>
          <SectionHeader title="Job Site Conditions" />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <p className="text-xs text-gray-500 mb-0.5">Difficulty (%)</p>
              <input
                type="number"
                step="5"
                value={difficulty}
                onChange={e => setDifficulty(e.target.value)}
                placeholder="0"
                className="input text-sm py-1.5 w-full"
              />
            </div>
            <div>
              <p
                className="text-xs text-gray-500 mb-0.5"
                title="Average Distance from Truck to Work Area"
              >
                Truck → Work Area (Avg LF)
              </p>
              <input
                type="number"
                step="5"
                value={distanceLF}
                onChange={e => setDistanceLF(e.target.value)}
                placeholder="0"
                className="input text-sm py-1.5 w-full"
              />
              {calc.walkHrs > 0 && (
                <p className="text-[10px] text-gray-500 italic lowercase mt-0.5">
                  +{calc.walkHrs.toFixed(2)} hrs walk-access
                </p>
              )}
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-0.5">Hours Adj (±hrs)</p>
              <input
                type="number"
                step="0.5"
                value={hoursAdj}
                onChange={e => setHoursAdj(e.target.value)}
                placeholder="0"
                className="input text-sm py-1.5 w-full"
              />
            </div>
          </div>
        </>
      )}

      {/* ── Light Fixtures ── */}
      {renderSection({
        title: 'Light Fixtures',
        subcat: LIGHT_CAT.fixture,
        rows: fixtureRows,
        setRows: setFixtureRows,
        isFixture: true,
      })}

      {/* ── Transformers ── */}
      {renderSection({
        title: 'Transformers',
        subcat: LIGHT_CAT.transformer,
        rows: transformerRows,
        setRows: setTransformerRows,
      })}

      {/* ── Wire & Other ── */}
      {renderSection({
        title: 'Wire & Other',
        subcat: LIGHT_CAT.wire,
        rows: wireRows,
        setRows: setWireRows,
      })}

      {!isSub && calc.rawMat > 0 && (
        <p className="text-xs text-gray-400 -mt-2 px-1 flex items-center gap-1">
          Raw materials {fmt2(calc.rawMat)} +{' '}
          {((n(materialMarkup) * 100).toFixed(0))}% markup ={' '}
          <span className="text-gray-600 font-medium">{fmt2(calc.markedUpMat)}</span>
        </p>
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
                        <input
                          type="number"
                          step="any"
                          className="input text-sm py-1 w-full text-center flex-1"
                          placeholder="0"
                          value={row.subCost}
                          onChange={e => updateManual(i, 'subCost', e.target.value)}
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
                  ) : (
                    <>
                      <td className="py-1 pr-2">
                        <input
                          type="number"
                          step="any"
                          className="input text-sm py-1 w-full text-center"
                          placeholder="0"
                          value={row.hours}
                          onChange={e => updateManual(i, 'hours', e.target.value)}
                        />
                      </td>
                      <td className="py-1">
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            step="any"
                            className="input text-sm py-1 w-full text-center flex-1"
                            placeholder="0"
                            value={row.materials}
                            onChange={e => updateManual(i, 'materials', e.target.value)}
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
            onClick={() =>
              setManualRows(rows => [...rows, { label: '', hours: '', materials: '', subCost: '' }])
            }
            className="mt-2 text-xs text-green-700 hover:text-green-900 font-medium"
          >
            + Add manual entry
          </button>
        </div>
      </div>

      {/* Watts / VA total footer */}
      {calc.totalWatts > 0 && (
        <div className="flex gap-4 justify-center text-xs text-gray-500 bg-gray-50 rounded-lg py-2">
          <span>{calc.totalWatts.toFixed(1)} W total</span>
          <span>·</span>
          <span>{calc.totalVA.toFixed(1)} VA total</span>
        </div>
      )}

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
