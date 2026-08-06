import WorkTypeChooser from './WorkTypeChooser'
import { useState, useEffect, useCallback, useContext } from 'react'
import { SubTabContext, subSectionTitle } from './subTabContext'
import { supabase } from '../../lib/supabase'
import GpmdBar from './GpmdBar'
import ModuleNotesField from './ModuleNotesField'
import { fetchSalesTaxRate } from '../../lib/companyDefaults'
import { calcWalkAccessLabor, DEFAULT_WALK_ACCESS_PACE_LF_PER_MIN } from '../../lib/walkAccess'
import { fetchPriceLedgerAsOf, ledgerPrice } from '../../lib/materialCatalog'

// ─────────────────────────────────────────────────────────────────────────────
// Lighting Module — per-vendor catalog layout (mirrors PaverModule).
//
// Items live in material_rates (category='Lighting') under a subcategory
// ('Light Fixture' | 'Transformer' | 'Wire'), optionally tagged to a vendor
// (vendor_id NULL = House). Lighting-specific attribute columns:
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

// 15% material markup applied to all fixture / transformer / wire materials
const MATERIAL_MARKUP = 0.15

const DEFAULTS = {
  laborRatePerHour: 35,
  laborBurdenPct: 0.29,
  gpmd: 425,
  commissionRate: 0.12,
}

const n = v => parseFloat(v) || 0

// ── Vendor catalog helpers (mirror PaverModule) ──────────────────────────────
// Option list for a section = the catalog items for that subcategory + vendor.
// House (vendorSel === 'House' or falsy) → rows with vendor_id == null;
// otherwise → rows whose vendor_id === vendorSel. Each option carries the
// material_rates row id (the STABLE, rename-proof key a selection is stored /
// matched by) plus a clean label.
function lightingOptions(subcat, vendorSel, materialRows) {
  const isHouse = !vendorSel || vendorSel === 'House'
  return (materialRows || [])
    .filter(r => r.subcategory === subcat && (isHouse ? r.vendor_id == null : r.vendor_id === vendorSel))
    .map(r => ({ id: r.id, value: r.id, label: r.name, stored: r.name, row: r }))
}

// Resolve a selection to its material_rates row. `key` is the row id (new
// estimates store the id); fall back to matching the saved label/name (rows
// saved before the id migration) and finally the vendor's first item.
function lightingItemFor(subcat, vendorSel, key, materialRows) {
  const opts = lightingOptions(subcat, vendorSel, materialRows)
  if (!opts.length) return null
  if (!key) return opts[0].row
  const byId = opts.find(o => o.id === key)
  if (byId) return byId.row
  const byLabel = opts.find(o => o.stored === key || o.label === key)
  return (byLabel || opts[0]).row
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
function processSection(subcat, rows, materialRows, priceOf = item => n(item.unit_cost)) {
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
    hrs += qty * n(item.labor_hrs_ea)
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
  laborRatePerHour = DEFAULTS.laborRatePerHour,
  materialRows = [],
  gpmd = DEFAULTS.gpmd,
  walkAccess = null,
  laborBurdenPct = DEFAULTS.laborBurdenPct,
  priceOf = item => n(item.unit_cost)
) {
  const _pace = parseFloat(walkAccess?.paceLfPerMin) || DEFAULT_WALK_ACCESS_PACE_LF_PER_MIN
  const { difficulty, hoursAdj, fixtureRows, transformerRows, wireRows, manualRows, distanceLF } =
    state
  const isSub = state.subType === 'Subcontractor'

  const fx = processSection(LIGHT_CAT.fixture, fixtureRows, materialRows, priceOf)
  const xf = processSection(LIGHT_CAT.transformer, transformerRows, materialRows, priceOf)
  const wr = processSection(LIGHT_CAT.wire, wireRows, materialRows, priceOf)

  // Electrical load (fixtures) is shown on both tabs for transformer sizing.
  const totalWatts = fx.watts + xf.watts + wr.watts
  const totalVA = fx.va + xf.va + wr.va

  const rawMat = fx.mat + xf.mat + wr.mat
  const markedUpMat = rawMat * (1 + MATERIAL_MARKUP)

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
  const laborCost = totalHrs * laborRatePerHour
  const burden = laborCost * (n(laborBurdenPct) || DEFAULTS.laborBurdenPct)

  let gp, subGp, commission, subCost, price
  if (isSub) {
    // Sub tab: flat $/each pricing, no labor. Route the itemized cost into
    // subCost so GpmdBar's 'sub' variant totals it (subCost + subGp + comm).
    const itemizedSub = fx.sub + xf.sub + wr.sub
    subCost = itemizedSub + manSub
    gp = 0
    subGp = subCost * (n(state.subGpMarkupRate) || 0.2)
    commission = subGp * DEFAULTS.commissionRate
    price = subCost + subGp + commission
  } else {
    gp = manDays * gpmd
    subGp = 0
    commission = gp * DEFAULTS.commissionRate
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
const blankRow = () => ({ vendor: 'House', itemId: '', qty: '', subEach: '' })
const blankRows = () => [blankRow(), blankRow(), blankRow()]
const DEFAULT_MANUAL_ROWS = [
  { label: 'Misc 1', hours: '', materials: '', subCost: '' },
  { label: 'Misc 2', hours: '', materials: '', subCost: '' },
  { label: 'Misc 3', hours: '', materials: '', subCost: '' },
]

// makeTab() seeds a tab's independent takeoff inputs; ihData / subData persist
// both. Legacy modules (flat data, no ihData) load into the In-House tab.
const makeTab = (src = {}) => ({
  difficulty: src.difficulty ?? '',
  hoursAdj: src.hoursAdj ?? '',
  distanceLF: src.distanceLF ?? '',
  fixtureRows: src.fixtureRows ? src.fixtureRows.map(r => ({ ...r })) : blankRows(),
  transformerRows: src.transformerRows ? src.transformerRows.map(r => ({ ...r })) : blankRows(),
  wireRows: src.wireRows ? src.wireRows.map(r => ({ ...r })) : blankRows(),
  manualRows: src.manualRows ? src.manualRows.map(r => ({ ...r })) : DEFAULT_MANUAL_ROWS.map(r => ({ ...r })),
})

// ── Sub-components ────────────────────────────────────────────────────────────
function SectionHeader({ title, sub }) {
  const isSub = useContext(SubTabContext)
  return (
    <div className="bg-gray-50 rounded-lg px-4 py-2.5 border border-gray-200 mb-2">
      <h3 className="text-xs font-bold text-gray-600 uppercase tracking-wider">{subSectionTitle(title, isSub)}</h3>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function LightingModule({ onSave, onBack, saving, initialData }) {
  const [laborRatePerHour, setLaborRatePerHour] = useState(
    initialData?.laborRatePerHour ?? DEFAULTS.laborRatePerHour
  )
  const [laborBurdenPct, setLaborBurdenPct] = useState(
    initialData?.laborBurdenPct ?? DEFAULTS.laborBurdenPct
  )

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

  // Re-fetch the lighting catalog + vendor list. Used on mount.
  const refreshCatalog = useCallback(async () => {
    const [matRes, venRes] = await Promise.all([
      supabase
        .from('material_rates')
        .select('id,name,subcategory,vendor_id,unit,unit_cost,watts,va,labor_hrs_ea,sub_price_ea')
        .eq('category', LIGHTING_CATEGORY),
      supabase
        .from('subs_vendors')
        .select('id, company_name, supplied_categories')
        .eq('type', 'vendor')
        .order('company_name'),
    ])
    setMaterialRows(matRes.data || [])
    setVendors(
      (venRes.data || []).map(v => ({
        id: v.id,
        name: v.company_name,
        categories: v.supplied_categories || [],
      }))
    )
  }, [])

  useEffect(() => {
    let gone = false
    ;(async () => {
      if (!initialData?.laborRatePerHour) {
        supabase
          .from('company_settings')
          .select('labor_rate_per_hour, labor_burden_pct, walk_access_pace_lf_per_min')
          .single()
          .then(({ data }) => {
            if (gone || !data) return
            if (data.labor_rate_per_hour != null)
              setLaborRatePerHour(parseFloat(data.labor_rate_per_hour) || DEFAULTS.laborRatePerHour)
            if (data.labor_burden_pct != null) setLaborBurdenPct(parseFloat(data.labor_burden_pct))
            if (data.walk_access_pace_lf_per_min != null) {
              const _wpace = parseFloat(data.walk_access_pace_lf_per_min)
              setWalkAccess({
                paceLfPerMin:
                  Number.isFinite(_wpace) && _wpace > 0
                    ? _wpace
                    : DEFAULT_WALK_ACCESS_PACE_LF_PER_MIN,
              })
            }
          })
      }
      await refreshCatalog()
      if (!gone) setLoading(false)
    })()
    return () => {
      gone = true
    }
  }, [refreshCatalog])

  const gpmd = initialData?.gpmd ?? DEFAULTS.gpmd
  const subGpMarkupRate = initialData?.subGpMarkupRate ?? 0.2

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
    priceOf
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
  const vendorsForCategory = cat => vendors.filter(v => (v.categories || []).includes(cat))
  const vendorSelectOptions = () => [
    { value: 'House', label: 'Unspecified' },
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
    const { title, subcat, rows, setRows, isFixture, subText } = sec
    const vOpts = vendorSelectOptions()
    return (
      <div>
        <SectionHeader title={title} sub={subText} />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 border-b border-gray-200">
                <th className="text-left pb-1 pr-2 font-medium w-40">Vendor</th>
                <th className="text-left pb-1 pr-2 font-medium">Item</th>
                <th className="text-left pb-1 pr-2 font-medium w-20">Qty</th>
                <th className="text-right pb-1 pr-2 font-medium text-gray-400 w-16">Watts</th>
                <th className="text-right pb-1 pr-2 font-medium text-gray-400 w-24">
                  {isSub ? 'Price (each)' : 'Labor Hrs'}
                </th>
                <th className="text-right pb-1 font-medium text-gray-400 w-24">Material</th>
                <th className="w-6" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => {
                const opts = lightingOptions(subcat, row.vendor, materialRows)
                const selId = row.itemId || opts[0]?.id || ''
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
                        value={row.vendor || 'House'}
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
                      <select
                        className="input text-sm py-1 w-full"
                        value={selId}
                        onChange={e => onItemChange(subcat, rows, setRows, i, row, e.target.value)}
                      >
                        {opts.length === 0 && <option value="">— No items —</option>}
                        {opts.map(o => (
                          <option key={o.id} value={o.id}>
                            {o.label}
                            {o.row.unit ? ` (${o.row.unit})` : ''}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-1.5 pr-2">
                      <input
                        type="number"
                        step="1"
                        className="input text-sm py-1 w-20"
                        placeholder="0"
                        value={row.qty}
                        onChange={e => updateRow(rows, setRows, i, { qty: e.target.value })}
                      />
                    </td>
                    <td className="py-1.5 text-right text-gray-400 text-xs pr-2">
                      {isFixture ? (qty > 0 ? watts.toFixed(1) : '—') : '—'}
                    </td>
                    <td className="py-1.5 text-right text-xs pr-2">
                      {isSub ? (
                        <input
                          type="number"
                          step="0.01"
                          className="input text-sm py-1 w-24 text-right"
                          placeholder="0.00"
                          value={row.subEach ?? ''}
                          onChange={e => updateRow(rows, setRows, i, { subEach: e.target.value })}
                        />
                      ) : (
                        <span className="text-gray-400">
                          {laborHrs > 0 ? laborHrs.toFixed(2) : '—'}
                        </span>
                      )}
                    </td>
                    <td className="py-1.5 text-right text-gray-600 text-xs">
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
            className="mt-2 text-xs px-2 py-1 rounded bg-slate-100 text-slate-700 hover:bg-slate-200"
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

  return (
    <SubTabContext.Provider value={isSub}>
    <div className="space-y-5">
      {/* ── Sticky GPMD bar ── */}
      <div className="sticky top-0 z-20 -mx-6 px-6 pt-1 pb-1 bg-gray-900 shadow-lg">
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

      {/* Notes — pinned just below the GPMD bar. */}
      <div className="sticky top-[56px] z-10 -mx-6 px-6 pt-2 pb-2 mt-2 bg-transparent">
        <ModuleNotesField value={notes} onChange={setNotes} />
      </div>

      <WorkTypeChooser value={subType || 'In-House'} onChange={setSubType} />

      {/* Crew Type */}
      <div className="flex items-center gap-3 bg-gray-50 rounded-lg px-4 py-2.5 border border-gray-200">
        <label className="text-sm font-medium text-gray-700 whitespace-nowrap">Crew Type</label>
        <select
          value={crewType}
          onChange={e => setCrewType(e.target.value)}
          className="input text-sm py-1 w-36"
        >
          <option value="Demo">Demo</option>
          <option value="Landscape">Landscape</option>
          <option value="Masonry">Masonry</option>
          <option value="Paver">Paver</option>
          <option value="Specialty">Specialty</option>
        </select>
      </div>

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
        subText: 'Total Watts / VA updates automatically',
      })}

      {/* ── Transformers ── */}
      {renderSection({
        title: 'Transformers',
        subcat: LIGHT_CAT.transformer,
        rows: transformerRows,
        setRows: setTransformerRows,
        subText: 'Size transformer(s) based on Total VA above',
      })}

      {/* ── Wire & Other ── */}
      {renderSection({
        title: 'Wire & Other',
        subcat: LIGHT_CAT.wire,
        rows: wireRows,
        setRows: setWireRows,
      })}

      {!isSub && calc.rawMat > 0 && (
        <p className="text-xs text-gray-400 -mt-2 px-1">
          Raw materials {fmt2(calc.rawMat)} + 15% markup ={' '}
          <span className="text-gray-600 font-medium">{fmt2(calc.markedUpMat)}</span>
        </p>
      )}

      {/* ── Manual Entry ── */}
      <div>
        <SectionHeader title="Manual Entry" />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 border-b border-gray-200">
                <th className="text-left pb-1 pr-2 font-medium">Description</th>
                <th className="text-left pb-1 pr-2 font-medium">Hours</th>
                <th className="text-left pb-1 pr-2 font-medium">Materials $</th>
                <th className="text-left pb-1 font-medium">Sub Cost $</th>
              </tr>
            </thead>
            <tbody>
              {manualRows.map((row, i) => (
                <tr key={i} className="border-b border-gray-100">
                  <td className="py-1 pr-2">
                    <input
                      className="input text-sm py-1"
                      value={row.label}
                      onChange={e => updateManual(i, 'label', e.target.value)}
                    />
                  </td>
                  <td className="py-1 pr-2">
                    <input
                      type="number"
                      step="any"
                      className="input text-sm py-1 w-20"
                      placeholder="0"
                      value={row.hours}
                      onChange={e => updateManual(i, 'hours', e.target.value)}
                    />
                  </td>
                  <td className="py-1 pr-2">
                    <input
                      type="number"
                      step="any"
                      className="input text-sm py-1 w-24"
                      placeholder="0"
                      value={row.materials}
                      onChange={e => updateManual(i, 'materials', e.target.value)}
                    />
                  </td>
                  <td className="py-1">
                    <input
                      type="number"
                      step="any"
                      className="input text-sm py-1 w-24"
                      placeholder="0"
                      value={row.subCost}
                      onChange={e => updateManual(i, 'subCost', e.target.value)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <button
            type="button"
            onClick={() =>
              setManualRows(rows => [...rows, { label: '', hours: '', materials: '', subCost: '' }])
            }
            className="mt-2 text-xs px-2 py-1 rounded bg-slate-100 text-slate-700 hover:bg-slate-200"
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
          {saving ? 'Saving...' : 'Add Module'}
        </button>
      </div>
    </div>
    </SubTabContext.Provider>
  )
}
