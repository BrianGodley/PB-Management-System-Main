import WorkTypeChooser from './WorkTypeChooser'
import CrewTypeBar from './CrewTypeBar'
import ModuleHeaderSlot from './ModuleHeaderSlot'
// ─────────────────────────────────────────────────────────────────────────────
// IrrigationModule — Irrigation system estimator
// Rates from Excel "Irrigation Module" sheet and Master Rates.
//
// Labor rates pulled from labor_rates table (category='Irrigation'):
//   'Irrigation - Hand Zone'     16   hrs/zone  → planter spray, hillside
//   'Irrigation - Trench Zone'   12.5 hrs/zone  → lawn, drip, dripline
//   'Irrigation - Timer Install'  0.5 hrs/timer → all timer types
//
// Material rates pulled from material_rates table (category='Irrigation'):
//   Zone materials:  'Irrigation Zone - Planter Spray', etc.
//   Timer materials: 'Irrigation Timer - 4 Station', etc.
//
// Sales tax applied to all materials via company_settings key 'sales_tax_rate'.
// Formula: totalMat = rawMat × (1 + salesTax)  — matches Excel: =P24+(P24*SalesTax)
//
// Vendor + Item catalog SELECTION
//   The Zones and Controllers/Timers sections are add/remove ROW tables with a
//   Vendor column + an Item column. The Item (zone type / timer type) drives the
//   labor + per-zone / per-timer FORMULA exactly as before; the Vendor ONLY
//   changes where the MATERIAL unit price comes from (Standard named-rate fallback
//   vs. a vendor's material_rates row). Vendor 'Standard' resolves to the original
//   math, so In-House numbers never move.
//
//   In-House and Subcontractor are independent calculators (makeTab / ihTab /
//   subTab). The Sub tab prices each row at a flat $/unit with NO labor hours and
//   routes the itemized cost into subCost (GpmdBar's 'sub' variant).
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useCallback, useContext } from 'react'
import { SubTabContext, subSectionTitle } from './subTabContext'
import { supabase } from '../../lib/supabase'
import GpmdBar from './GpmdBar'
import { calcWalkAccessLabor, DEFAULT_WALK_ACCESS_PACE_LF_PER_MIN } from '../../lib/walkAccess'
import { resolveMaterialPrice, fetchModuleCatalog, fetchStandardRateMap } from '../../lib/materialCatalog'

const IRRIGATION_CATEGORY = 'Irrigation'

// ── Zone definitions ──────────────────────────────────────────────────────────
// defaultMode: 'Hand' | 'Trench'  — matches Excel defaults; user can override
const ZONE_TYPES = [
  {
    key: 'planterSpray',
    label: 'Planter Spray Heads',
    defaultMode: 'Hand',
    matKey: 'Irrigation Zone - Planter Spray',
  },
  {
    key: 'lawn',
    label: 'Lawn Zone (≤ 1,000 Sq Ft)',
    defaultMode: 'Trench',
    matKey: 'Irrigation Zone - Lawn',
  },
  {
    key: 'hillside',
    label: 'Hillside Zone (≤ 6 big heads)',
    defaultMode: 'Hand',
    matKey: 'Irrigation Zone - Hillside',
  },
  {
    key: 'dripPlant',
    label: 'Drip per Plant (≤ 50 emitters)',
    defaultMode: 'Trench',
    matKey: 'Irrigation Zone - Drip per Plant',
  },
  {
    key: 'dripline',
    label: 'Planter Dripline (≤ 700 Sq Ft)',
    defaultMode: 'Trench',
    matKey: 'Irrigation Zone - Planter Dripline',
  },
]

// ── Timer definitions ─────────────────────────────────────────────────────────
const TIMER_TYPES = [
  { key: 'timer4', label: '4 Station', matKey: 'Irrigation Timer - 4 Station' },
  { key: 'timer6', label: '6 Station', matKey: 'Irrigation Timer - 6 Station' },
  { key: 'timer9', label: '9 Station', matKey: 'Irrigation Timer - 9 Station' },
  { key: 'timer12', label: '12 Station', matKey: 'Irrigation Timer - 12 Station' },
  { key: 'timer15', label: '15 Station', matKey: 'Irrigation Timer - 15 Station' },
  { key: 'timer18', label: '18 Station', matKey: 'Irrigation Timer - 18 Station' },
  {
    key: 'timerICC8',
    label: 'Hunter ICC 8 Station',
    matKey: 'Irrigation Timer - Hunter ICC 8 Station',
  },
  {
    key: 'timerAdd8',
    label: 'Additional 8 Station Module',
    matKey: 'Irrigation Timer - Additional 8 Station Module',
  },
]

const ZONE_BY_KEY = Object.fromEntries(ZONE_TYPES.map(z => [z.key, z]))
const TIMER_BY_KEY = Object.fromEntries(TIMER_TYPES.map(t => [t.key, t]))
const zoneMeta = key => ZONE_BY_KEY[key] || ZONE_TYPES[0]
const timerMeta = key => TIMER_BY_KEY[key] || TIMER_TYPES[0]
const ZONE_OPTIONS = ZONE_TYPES.map(z => ({ value: z.key, label: z.label }))
const TIMER_OPTIONS = TIMER_TYPES.map(t => ({ value: t.key, label: t.label }))

// ── Estimate-config defaults ──────────────────────────────────────────────────
// Only company/estimate-config defaults live here. Per-zone / per-timer labor
// coefficients and material prices are read live from the rate tables — no
// hardcoded rate fallbacks. Missing rates are guaranteed by
// supabase-irrigation-fallbacks-seed.sql.
const RATE_DEFAULTS = {
  salesTax: 0.095, // 9.5% — company_settings key 'sales_tax_rate'
}

// Commission, sub GP markup, GPMD, labor rate + burden % are sourced live from
// company_settings — no hardcoded code defaults.

// ── Calculation engine ────────────────────────────────────────────────────────
const n = v => parseFloat(v) || 0
const r2 = x => Math.round(((x || 0) + Number.EPSILON) * 100) / 100

// ── Vendor-catalog material price ─────────────────────────────────────────────
// The ONLY thing the Vendor selection changes: the material $ source. When a real
// vendor is selected AND a material_rates row exists (name===dbName &&
// vendor_id===vendorId) use that row's unit_cost; otherwise fall back to the Standard
// price (name-keyed materialPrices[dbName]) then the hard fallback. Vendor 'Standard'
// resolves to exactly the original math, so In-House numbers never move.
// Shared resolver (src/lib/materialCatalog.js) — same vendor→Standard→fallback
// order. Irrigation keeps separate material/labor maps, so it doesn't use the
// merged useMaterialCatalog hook.
const irrMatPrice = resolveMaterialPrice

// ── Per-row calculators ───────────────────────────────────────────────────────
// Zone row: In-House labor + material identical to the original per-zone math —
//   hrs = qty × (mode === 'Hand' ? handRate : trenchRate)   (guarded qty > 0)
//   mat = qty × material unit price
// Only the material unit price source is vendor-resolved (Standard = original price).
function computeZoneRow(row, handRate, trenchRate, materialPrices, materialRows) {
  // Unselected zone row contributes nothing (no crash, no fallback-to-first).
  if (!row.type)
    return { z: zoneMeta(row.type), qty: n(row.qty), mode: row.mode, rate: 0, hrs: 0, unitPrice: 0, mat: 0, subEach: 0, subMat: 0 }
  const z = zoneMeta(row.type)
  const qty = n(row.qty)
  const mode = row.mode || z.defaultMode
  const rate = mode === 'Hand' ? handRate : trenchRate
  const hrs = qty > 0 ? qty * rate : 0
  const unitPrice = irrMatPrice(z.matKey, row.vendor, materialRows, materialPrices)
  const mat = qty * unitPrice
  const subEach = row.subEach !== '' && row.subEach != null ? n(row.subEach) : unitPrice
  const subMat = qty > 0 ? qty * subEach : 0
  return { z, qty, mode, rate, hrs, unitPrice, mat, subEach, subMat }
}

// Timer row: In-House labor + material identical to the original per-timer math —
//   hrs = qty × timerHrs ;  mat = qty × material unit price
function computeTimerRow(row, timerHrs, materialPrices, materialRows) {
  // Unselected timer row contributes nothing (no crash, no fallback-to-first).
  if (!row.type)
    return { t: timerMeta(row.type), qty: n(row.qty), hrs: 0, unitPrice: 0, mat: 0, subEach: 0, subMat: 0 }
  const t = timerMeta(row.type)
  const qty = n(row.qty)
  const hrs = qty * timerHrs
  const unitPrice = irrMatPrice(t.matKey, row.vendor, materialRows, materialPrices)
  const mat = qty * unitPrice
  const subEach = row.subEach !== '' && row.subEach != null ? n(row.subEach) : unitPrice
  const subMat = qty * subEach
  return { t, qty, hrs, unitPrice, mat, subEach, subMat }
}

// In-House: every formula preserved byte-for-byte from the original calc.
// Sub: flat $/unit per row, NO labor hours, itemized cost routed into subCost.
function calcIrrigation(
  state,
  laborRatePerHour,
  materialPrices,
  laborRates,
  salesTax,
  gpmd,
  walkAccess = null,
  laborBurdenPct,
  materialRows = [],
  commissionRate
) {
  const mp = materialPrices || {}
  const lr = laborRates || {}
  const lrph = n(laborRatePerHour)
  const diff = 1 + n(state.difficulty) / 100
  const hrsAdj = n(state.hoursAdj)
  const tax = n(salesTax) || RATE_DEFAULTS.salesTax
  const pace = n(walkAccess?.paceLfPerMin) || DEFAULT_WALK_ACCESS_PACE_LF_PER_MIN
  const isSub = state.subType === 'Subcontractor'

  // Rates from DB with fallbacks
  // NOTE: handRate / trenchRate are hrs/zone (not zones/hr).
  // Excel formula: =Vlookup(mode, rateTable, 2) * qty  →  rate × qty = hrs
  const handRate = n(lr['Irrigation - Hand Zone'])
  const trenchRate = n(lr['Irrigation - Trench Zone'])
  const timerHrs = n(lr['Irrigation - Timer Install'])

  // ── Zone labor + material (pre-tax) ─────────────────────────────────────
  let zoneHrs = 0,
    zoneMat = 0,
    zoneSubMat = 0
  const zoneCalc = (state.zoneRows || []).map(row => {
    const c = computeZoneRow(row, handRate, trenchRate, mp, materialRows)
    zoneHrs += c.hrs
    zoneMat += c.mat
    zoneSubMat += c.subMat
    return c
  })

  // ── Timer labor + material (pre-tax) ────────────────────────────────────
  let timerLaborHrs = 0,
    timerMat = 0,
    timerSubMat = 0
  const timerCalc = (state.timerRows || []).map(row => {
    const c = computeTimerRow(row, timerHrs, mp, materialRows)
    timerLaborHrs += c.hrs
    timerMat += c.mat
    timerSubMat += c.subMat
    return c
  })

  // ── Manual entry ─────────────────────────────────────────────────────────
  const manualFiltered = (state.manualRows || []).filter(
    r => n(r.hours) > 0 || n(r.materials) > 0 || n(r.subCost) > 0
  )
  const manualHrs = manualFiltered.reduce((s, r) => s + n(r.hours), 0)
  const manualMat = manualFiltered.reduce((s, r) => s + n(r.materials), 0)
  const manualSub = manualFiltered.reduce((s, r) => s + n(r.subCost), 0)

  const subMarkup = n(state.subGpMarkupRate)

  if (isSub) {
    // Sub tab: flat per-unit material only, NO labor hours. The itemized flat cost
    // (+ any manual Sub Cost) IS the subcontractor cost; profit is the markup.
    const subMatTotal = zoneSubMat + timerSubMat
    const totalMat = subMatTotal
    const subCost = subMatTotal + manualSub
    const subGp = subCost * subMarkup
    const commission = subGp * n(commissionRate)
    const price = subCost + subGp + commission
    return {
      totalHrs: 0,
      manDays: 0,
      laborCost: 0,
      burden: 0,
      rawMat: subMatTotal,
      totalMat,
      subCost,
      gp: 0,
      subGp,
      commission,
      price,
      zoneCalc,
      timerCalc,
      zoneHrs: 0,
      timerLaborHrs: 0,
      manualHrs: 0,
      walkHrs: 0,
      handRate,
      trenchRate,
      timerHrs,
      salesTax: tax,
    }
  }

  // ── In-House totals (byte-for-byte identical to the original calc) ──────────
  const rawHrs = zoneHrs + timerLaborHrs + manualHrs
  // Walk-access penalty is calculated against the difficulty-adjusted labor
  // (i.e. how big the job actually is once site complexity is applied), then
  // added on. Mirrors Excel: O25 uses O24 (labor subtotal after item-level
  // adjustments) and the result flows into O26 = labor + drive.
  const adjLaborHrs = rawHrs * diff + hrsAdj
  const walkHrs = calcWalkAccessLabor(adjLaborHrs, state.distanceLF, { paceLfPerMin: pace })
  const totalHrs = adjLaborHrs + walkHrs
  const rawMat = zoneMat + timerMat + manualMat
  const totalMat = rawMat * (1 + tax) // Excel: =P24+(P24*SalesTax)
  const subCost = manualSub

  const manDays = totalHrs / 8
  const laborCost = totalHrs * lrph
  const burden = laborCost * n(laborBurdenPct)
  const gp = manDays * n(gpmd)
  const commission = gp * n(commissionRate)
  const price = laborCost + burden + totalMat + gp + commission + subCost

  return {
    totalHrs,
    manDays,
    laborCost,
    burden,
    rawMat,
    totalMat,
    subCost,
    gp,
    subGp: 0,
    commission,
    price,
    zoneCalc,
    timerCalc,
    zoneHrs,
    timerLaborHrs,
    manualHrs,
    walkHrs,
    handRate,
    trenchRate,
    timerHrs,
    salesTax: tax,
  }
}

// ── Default rows / factories ──────────────────────────────────────────────────
const defaultZoneRows = () =>
  ZONE_TYPES.map(z => ({ vendor: 'Standard', type: '', qty: '', mode: z.defaultMode, subEach: '' }))
const defaultTimerRows = () => [
  { vendor: 'Standard', type: '', qty: '', subEach: '' },
  { vendor: 'Standard', type: '', qty: '', subEach: '' },
]
const DEFAULT_MANUAL_ROWS = () => [{ label: '', hours: '', materials: '', subCost: '' }]

// Migrate the legacy fixed zoneQtys/zoneModes maps into the new row model. Every
// zone type becomes a row (qty defaults to '' → 0), so a legacy save's In-House
// totals stay byte-for-byte identical while the UI keeps showing all zones.
function migrateZoneRows(src) {
  return ZONE_TYPES.map(z => ({
    vendor: 'Standard',
    type: z.key,
    qty: src.zoneQtys?.[z.key] ?? '',
    mode: src.zoneModes?.[z.key] || z.defaultMode,
    subEach: '',
  }))
}
function migrateTimerRows(src) {
  return TIMER_TYPES.map(t => ({
    vendor: 'Standard',
    type: t.key,
    qty: src.timerQtys?.[t.key] ?? '',
    subEach: '',
  }))
}

// Per-tab input record. In-House and Sub each hold their own independent copy so
// the two tabs are separate calculators. Legacy flat saves (fields at the top
// level with zoneQtys/zoneModes/timerQtys) are migrated into In-House rows.
function makeTab(src = {}) {
  return {
    difficulty: src.difficulty ?? 0,
    hoursAdj: src.hoursAdj ?? 0,
    distanceLF: src.distanceLF ?? '',
    zoneRows: src.zoneRows
      ? src.zoneRows.map(r => ({ vendor: 'Standard', subEach: '', ...r }))
      : src.zoneQtys
        ? migrateZoneRows(src)
        : defaultZoneRows(),
    timerRows: src.timerRows
      ? src.timerRows.map(r => ({ vendor: 'Standard', subEach: '', ...r }))
      : src.timerQtys
        ? migrateTimerRows(src)
        : defaultTimerRows(),
    manualRows: src.manualRows ? src.manualRows.map(r => ({ ...r })) : DEFAULT_MANUAL_ROWS(),
  }
}

// ── UI helpers ────────────────────────────────────────────────────────────────
function SecHdr({ title }) {
  const isSub = useContext(SubTabContext)
  return (
    <div className="bg-gray-100 rounded-lg px-4 py-2.5 border border-gray-200 mb-2">
      <h3 className="text-xs font-bold text-gray-600 uppercase tracking-wider">{subSectionTitle(title, isSub)}</h3>
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
function Sel({ value, onChange, options, placeholder }) {
  // options: array of strings OR { value, label }
  // When `placeholder` is provided, an unset value shows the placeholder (empty
  // option) and a stored value not in `options` stays selectable (backward-compat).
  const norm = options.map(o => (typeof o === 'string' ? { value: o, label: o } : o))
  const hasVal = value !== '' && value != null
  const known = norm.some(o => o.value === value)
  return (
    <select
      value={hasVal ? value : ''}
      onChange={onChange}
      className="w-full border border-gray-200 rounded-md px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-400"
    >
      {placeholder && !hasVal && <option value="">{placeholder}</option>}
      {placeholder && hasVal && !known && <option value={value}>{value}</option>}
      {norm.map(o => (
        <option key={o.value} value={o.value}>
          {o.label}
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

// ── Main component ────────────────────────────────────────────────────────────
export default function IrrigationModule({ initialData, onSave, onCancel }) {
  // Free-text notes for this module — Sam writes auto-generated
  // takeoffs here via create_estimate_from_takeoff, and the user can
  // overwrite / append their own.
  const [notes, setNotes] = useState(initialData?.notes ?? '')
  const [materialPrices, setMaterialPrices] = useState(initialData?.materialPrices || {})
  const [laborRates, setLaborRates] = useState(initialData?.laborRates || {})
  const [materialRows, setMaterialRows] = useState(initialData?.materialRows || [])
  const [vendors, setVendors] = useState([])
  const [laborRatePerHour, setLaborRatePerHour] = useState(initialData?.laborRatePerHour ?? null)
  const [laborBurdenPct, setLaborBurdenPct] = useState(initialData?.laborBurdenPct ?? null)
  const [salesTax, setSalesTax] = useState(initialData?.salesTax ?? RATE_DEFAULTS.salesTax)
  const [walkAccess, setWalkAccess] = useState(
    initialData?.walkAccess ?? {
      paceLfPerMin: DEFAULT_WALK_ACCESS_PACE_LF_PER_MIN,
    }
  )
  const [pricesLoading, setPricesLoading] = useState(!initialData?.materialPrices)
  const [gpmd, setGpmd] = useState(initialData?.gpmd ?? null)
  const [commissionRate, setCommissionRate] = useState(initialData?.commissionRate ?? null)
  const [subGpMarkupRate, setSubGpMarkupRate] = useState(initialData?.subGpMarkupRate ?? null)

  // ── Shared (not per-tab) selections ─────────────────────────────────────────
  const [crewType, setCrewType] = useState(initialData?.crewType ?? 'Landscape')
  const [subType, setSubType] = useState(initialData?.subType ?? 'In-House')

  // Independent In-House vs Sub input records — each tab is its own calculator.
  // Legacy flat saves (no ihData) load into the In-House tab.
  const [ihTab, setIhTab] = useState(() => makeTab(initialData?.ihData || initialData || {}))
  const [subTab, setSubTab] = useState(() => makeTab(initialData?.subData || {}))
  const isSub = subType === 'Subcontractor'
  const cur = isSub ? subTab : ihTab
  const setCur = isSub ? setSubTab : setIhTab
  const setField = k => v => setCur(p => ({ ...p, [k]: typeof v === 'function' ? v(p[k]) : v }))

  // Derived active-tab accessors.
  const difficulty = cur.difficulty
  const setDifficulty = setField('difficulty')
  const hoursAdj = cur.hoursAdj
  const setHoursAdj = setField('hoursAdj')
  const distanceLF = cur.distanceLF
  const setDistanceLF = setField('distanceLF')
  const zoneRows = cur.zoneRows
  const setZoneRows = setField('zoneRows')
  const timerRows = cur.timerRows
  const setTimerRows = setField('timerRows')
  const manualRows = cur.manualRows
  const setManualRows = setField('manualRows')

  // Re-fetch Irrigation master-rate maps + vendor catalog. Called on mount and
  // after any RateEditPopover save so the calc reflects edits immediately.
  const refreshAllRates = useCallback(async () => {
    // material_rates retired: Standard/base prices from the new model
    // (fetchStandardRateMap = Standard + labor + misc, name-keyed); vendor
    // catalog rows from material + material_price. Irrigation resolves by name,
    // never by subcategory, so no remap is needed.
    const [matMap, lrRes, rows, venRes] = await Promise.all([
      fetchStandardRateMap([IRRIGATION_CATEGORY]),
      supabase.from('labor_rates').select('name, rate').eq('category', IRRIGATION_CATEGORY),
      fetchModuleCatalog([IRRIGATION_CATEGORY]),
      supabase
        .from('subs_vendors')
        .select('id, company_name')
        .eq('type', 'vendor')
        .order('company_name'),
    ])
    setMaterialPrices(matMap)
    if (lrRes.data) {
      const m = {}
      lrRes.data.forEach(r => {
        m[r.name] = parseFloat(r.rate)
      })
      setLaborRates(m)
    }
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
      await Promise.all([
        supabase
          .from('company_settings')
          .select('labor_rate_per_hour, labor_burden_pct, sales_tax_rate, walk_access_pace_lf_per_min, estimate_gpmd_default, commission_rate, sub_gp_markup_rate')
          .maybeSingle()
          .then(({ data }) => {
            if (!gone && data) {
              if (!initialData?.laborRatePerHour && data.labor_rate_per_hour != null)
                setLaborRatePerHour(parseFloat(data.labor_rate_per_hour))
              if (!initialData?.laborBurdenPct && data.labor_burden_pct != null)
                setLaborBurdenPct(parseFloat(data.labor_burden_pct))
              if (!initialData?.salesTax && data.sales_tax_rate != null)
                setSalesTax(parseFloat(data.sales_tax_rate) || RATE_DEFAULTS.salesTax)
              if (initialData?.gpmd == null && data.estimate_gpmd_default != null)
                setGpmd(parseFloat(data.estimate_gpmd_default))
              if (initialData?.commissionRate == null && data.commission_rate != null)
                setCommissionRate(parseFloat(data.commission_rate))
              if (initialData?.subGpMarkupRate == null && data.sub_gp_markup_rate != null)
                setSubGpMarkupRate(parseFloat(data.sub_gp_markup_rate))
              if (!initialData?.walkAccess) {
                const pace = parseFloat(data.walk_access_pace_lf_per_min)
                setWalkAccess({
                  paceLfPerMin:
                    Number.isFinite(pace) && pace > 0
                      ? pace
                      : DEFAULT_WALK_ACCESS_PACE_LF_PER_MIN,
                })
              }
            }
          }),
        // Always refresh so the vendor list + material catalog load, even when
        // editing a saved estimate (which already carries a materialPrices map).
        refreshAllRates(),
      ])
      if (!gone) setPricesLoading(false)
    })()
    return () => {
      gone = true
    }
  }, [refreshAllRates])

  // Active tab drives the calc — the other tab stays untouched. Shared (not
  // per-tab): subType, notes, laborRate/burden, materialPrices/materialRows, gpmd.
  const state = { crewType, subType, subGpMarkupRate, ...cur }
  const calc = calcIrrigation(
    state,
    laborRatePerHour,
    materialPrices,
    laborRates,
    salesTax,
    gpmd,
    walkAccess,
    laborBurdenPct,
    materialRows,
    commissionRate
  )

  // ── Vendor helpers ──────────────────────────────────────────────────────────
  const vendorsForCategory = cat => vendors.filter(v => materialRows.some(r => r.vendor_id === v.id))
  const vendorOptions = [
    { value: 'Standard', label: 'Standard' },
    ...vendorsForCategory(IRRIGATION_CATEGORY).map(v => ({ value: v.id, label: v.name })),
  ]

  // ── Row helpers ─────────────────────────────────────────────────────────────
  // Zone row update. Changing Vendor or Item (type/mode) on the Sub tab refreshes
  // the flat $/unit default to the vendor-resolved unit price.
  function zoneUpdate(i, field, val) {
    setZoneRows(rows =>
      rows.map((r, idx) => {
        if (idx !== i) return r
        const next = { ...r, [field]: val }
        if ((field === 'type' || field === 'vendor') && isSub) {
          const z = zoneMeta(next.type)
          const unit = irrMatPrice(z.matKey, next.vendor, materialRows, materialPrices)
          next.subEach = String(r2(unit))
        }
        return next
      })
    )
  }
  function timerUpdate(i, field, val) {
    setTimerRows(rows =>
      rows.map((r, idx) => {
        if (idx !== i) return r
        const next = { ...r, [field]: val }
        if ((field === 'type' || field === 'vendor') && isSub) {
          const t = timerMeta(next.type)
          const unit = irrMatPrice(t.matKey, next.vendor, materialRows, materialPrices)
          next.subEach = String(r2(unit))
        }
        return next
      })
    )
  }
  function updateManual(i, field, val) {
    setManualRows(rows => rows.map((r, idx) => (idx === i ? { ...r, [field]: val } : r)))
  }
  const removeRow = (setRows, i) =>
    setRows(rows => (rows.length > 1 ? rows.filter((_, idx) => idx !== i) : rows))

  const fmt2 = v =>
    `$${n(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  const fh = v => (v > 0 ? v.toFixed(2) : '—')

  const td = 'py-1.5 pr-2 align-top'
  const num = 'py-1.5 pr-2 text-gray-600 tabular-nums text-xs align-top text-center'

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
        ihData: ihTab,
        subData: subTab,
        subType,
        subGpMarkupRate,
        commissionRate,
        crewType,
        laborRatePerHour,
        laborBurdenPct,
        gpmd,
        materialPrices,
        laborRates,
        materialRows, // vendor-resolved catalog snapshot for the summary
        vendorNames: Object.fromEntries(vendors.map(v => [v.id, v.name])),
        salesTax,
        walkAccess,
        calc: {
          totalHrs: calc.totalHrs,
          manDays: calc.manDays,
          laborCost: calc.laborCost,
          burden: calc.burden,
          rawMat: calc.rawMat,
          totalMat: calc.totalMat,
          subCost: calc.subCost,
          gp: calc.gp,
          subGp: calc.subGp,
          commission: calc.commission,
          price: calc.price,
        },
      },
    })
  }

  // ── Grouped rate list for the "View Rates" popup (CrewTypeBar). Each section
  //    lists its LABOR rates first, then every MATERIAL rate (one row per vendor,
  //    Standard first) sourced from the module's material catalog — mirrors the
  //    Walls / Utilities View Rates. Irrigation resolves materials by name.
  const vendorNames = Object.fromEntries((vendors || []).map(v => [v.id, v.name]))
  // Material rows for a catalog item (matched by name). One row per vendor
  // (Standard first), each editable straight to material_price.
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
          category: 'Irrigation',
          unitLabel: r0.unit || unit,
          mode: 'currency',
          value: n(r0.unit_cost),
        }))
    }
    return [
      { label: `Standard — ${dbName}`, table: 'material_price', name: dbName, category: 'Irrigation', unitLabel: unit, mode: 'currency', value: fallback },
    ]
  }
  const irrigationRateList = [
    {
      group: 'Irrigation Zones',
      items: [
        {
          label: 'Irrigation - Hand Zone',
          table: 'labor_rates',
          name: 'Irrigation - Hand Zone',
          category: 'Irrigation',
          mode: 'coefficient',
          unitLabel: 'hrs per zone',
          value: calc.handRate,
        },
        {
          label: 'Irrigation - Trench Zone',
          table: 'labor_rates',
          name: 'Irrigation - Trench Zone',
          category: 'Irrigation',
          mode: 'coefficient',
          unitLabel: 'hrs per zone',
          value: calc.trenchRate,
        },
        ...ZONE_TYPES.flatMap(z =>
          matRows(z.matKey, 'ea', materialPrices[z.matKey])
        ),
      ],
    },
    {
      group: 'Controllers / Timers',
      items: [
        {
          label: 'Irrigation - Timer Install',
          table: 'labor_rates',
          name: 'Irrigation - Timer Install',
          category: 'Irrigation',
          mode: 'coefficient',
          unitLabel: 'hrs per Each',
          value: calc.timerHrs,
        },
        ...TIMER_TYPES.flatMap(t =>
          matRows(t.matKey, 'ea', materialPrices[t.matKey])
        ),
      ],
    },
  ]

  return (
    <SubTabContext.Provider value={isSub}>
    <div className="space-y-4">
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
            title="Irrigation"
            rates={irrigationRateList}
            refreshAllRates={refreshAllRates}
            showInlineToggle={false}
          />
        </div>
      </div>

      <ModuleHeaderSlot>
        <WorkTypeChooser value={subType || 'In-House'} onChange={setSubType} compact />
      </ModuleHeaderSlot>

      {pricesLoading && (
        <div className="text-xs text-amber-700 bg-amber-50 rounded px-3 py-2">
          Loading current rates…
        </div>
      )}

      {/* Settings — Job Site Conditions is In-House only (hidden on Sub tab) */}
      {!isSub && (
        <>
          <SecHdr title="Job Site Conditions" />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <p className="text-xs text-gray-500 mb-0.5">Difficulty (%)</p>
              <Inp value={difficulty} onChange={e => setDifficulty(e.target.value)} step="5" />
            </div>
            <div>
              <p
                className="text-xs text-gray-500 mb-0.5"
                title="Average Distance from Truck to Work Area"
              >
                Truck → Work Area (Avg LF)
              </p>
              <Inp value={distanceLF} onChange={e => setDistanceLF(e.target.value)} step="5" />
              {calc.walkHrs > 0 && (
                <p className="text-[10px] text-gray-500 italic lowercase mt-0.5">
                  +{calc.walkHrs.toFixed(2)} hrs walk-access
                </p>
              )}
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-0.5">Hours Adj (±hrs)</p>
              <Inp value={hoursAdj} onChange={e => setHoursAdj(e.target.value)} step="0.5" />
            </div>
          </div>
        </>
      )}

      {/* Zones */}
      <div>
        <div className="text-xs font-bold text-gray-600 uppercase tracking-wider bg-gray-50 rounded-lg border border-gray-200 px-4 py-2.5 mt-5 mb-2 flex items-center flex-wrap gap-x-2 gap-y-1">
          <span>{subSectionTitle('Irrigation Zones', isSub)} —</span>
          <span className="inline-flex items-center gap-1">
            Hand: {calc.handRate} hrs/zone
          </span>
          ·
          <span className="inline-flex items-center gap-1">
            Trench: {calc.trenchRate} hrs/zone
          </span>
        </div>
        <table className="w-full text-xs">
          <TH
            cols={[
              { label: 'Vendor', w: 'w-36' },
              { label: 'Zone Type' },
              { label: '# Zones', w: 'w-20' },
              { label: 'Install Mode', w: 'w-28' },
              { label: isSub ? 'Flat $/zone' : 'Est. Hrs', w: 'w-24' },
              { label: isSub ? 'Sub Material' : 'Zone Materials', w: 'w-28' },
              { label: '', w: 'w-6' },
            ]}
          />
          <tbody className="divide-y divide-gray-50">
            {zoneRows.map((row, i) => {
              const c = calc.zoneCalc[i] || computeZoneRow(row, calc.handRate, calc.trenchRate, materialPrices, materialRows)
              const z = zoneMeta(row.type)
              const isStandard = !row.vendor || row.vendor === 'Standard'
              const masterMat = n(materialPrices[z.matKey])
              return (
                <tr key={i}>
                  <td className={td}>
                    <Sel
                      value={row.vendor || 'Standard'}
                      onChange={e => zoneUpdate(i, 'vendor', e.target.value)}
                      options={vendorOptions}
                    />
                  </td>
                  <td className={td}>
                    <div className="flex items-center gap-1">
                      <div className="flex-1">
                        <Sel
                          value={row.type}
                          onChange={e => zoneUpdate(i, 'type', e.target.value)}
                          options={ZONE_OPTIONS}
                          placeholder="Select zone"
                        />
                      </div>
                    </div>
                  </td>
                  <td className={td}>
                    <Inp value={row.qty} onChange={e => zoneUpdate(i, 'qty', e.target.value)} className="text-center" />
                  </td>
                  <td className={td}>
                    <Sel
                      value={row.mode || z.defaultMode}
                      onChange={e => zoneUpdate(i, 'mode', e.target.value)}
                      options={['Hand', 'Trench']}
                    />
                  </td>
                  <td className={`${td} text-center`}>
                    {isSub ? (
                      <input
                        type="number"
                        step="any"
                        className="w-full border border-gray-200 rounded-md px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-1 focus:ring-blue-400"
                        placeholder={r2(c.unitPrice).toString()}
                        value={row.subEach ?? ''}
                        onChange={e => zoneUpdate(i, 'subEach', e.target.value)}
                      />
                    ) : (
                      <span className={num}>{fh(c.hrs)}</span>
                    )}
                  </td>
                  <td className={num}>
                    {(isSub ? c.subMat : c.mat) > 0 ? fmt2(isSub ? c.subMat : c.mat) : '—'}
                  </td>
                  <td className={`${td} text-right`}>
                    <button
                      type="button"
                      onClick={() => removeRow(setZoneRows, i)}
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
          onClick={() => setZoneRows(rows => [...rows, { vendor: 'Standard', type: '', qty: '', mode: 'Hand', subEach: '' }])}
          className="mt-2 text-xs text-green-700 hover:text-green-900 font-medium"
        >
          + Add zone
        </button>
      </div>

      {/* Timers */}
      <div>
        <div className="text-xs font-bold text-gray-600 uppercase tracking-wider bg-gray-50 rounded-lg border border-gray-200 px-4 py-2.5 mt-5 mb-2 flex items-center gap-2">
          <span>{subSectionTitle('Controllers / Timers', isSub)} — {calc.timerHrs} hrs install each</span>
        </div>
        <table className="w-full text-xs">
          <TH
            cols={[
              { label: 'Vendor', w: 'w-36' },
              { label: 'Timer Type' },
              { label: 'Qty', w: 'w-20' },
              { label: isSub ? 'Flat $/ea' : 'Est. Hrs', w: 'w-24' },
              { label: isSub ? 'Sub Material' : 'Materials', w: 'w-28' },
              { label: '', w: 'w-6' },
            ]}
          />
          <tbody className="divide-y divide-gray-50">
            {timerRows.map((row, i) => {
              const c = calc.timerCalc[i] || computeTimerRow(row, calc.timerHrs, materialPrices, materialRows)
              const t = timerMeta(row.type)
              const isStandard = !row.vendor || row.vendor === 'Standard'
              const masterMat = n(materialPrices[t.matKey])
              return (
                <tr key={i}>
                  <td className={td}>
                    <Sel
                      value={row.vendor || 'Standard'}
                      onChange={e => timerUpdate(i, 'vendor', e.target.value)}
                      options={vendorOptions}
                    />
                  </td>
                  <td className={td}>
                    <div className="flex items-center gap-1">
                      <div className="flex-1">
                        <Sel
                          value={row.type}
                          onChange={e => timerUpdate(i, 'type', e.target.value)}
                          options={TIMER_OPTIONS}
                          placeholder="Select timer"
                        />
                      </div>
                    </div>
                  </td>
                  <td className={td}>
                    <Inp value={row.qty} onChange={e => timerUpdate(i, 'qty', e.target.value)} className="text-center" />
                  </td>
                  <td className={`${td} text-center`}>
                    {isSub ? (
                      <input
                        type="number"
                        step="any"
                        className="w-full border border-gray-200 rounded-md px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-1 focus:ring-blue-400"
                        placeholder={r2(c.unitPrice).toString()}
                        value={row.subEach ?? ''}
                        onChange={e => timerUpdate(i, 'subEach', e.target.value)}
                      />
                    ) : (
                      <span className={num}>{fh(c.hrs)}</span>
                    )}
                  </td>
                  <td className={num}>
                    {(isSub ? c.subMat : c.mat) > 0 ? fmt2(isSub ? c.subMat : c.mat) : '—'}
                  </td>
                  <td className={`${td} text-right`}>
                    <button
                      type="button"
                      onClick={() => removeRow(setTimerRows, i)}
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
          onClick={() => setTimerRows(rows => [...rows, { vendor: 'Standard', type: '', qty: '', subEach: '' }])}
          className="mt-2 text-xs text-green-700 hover:text-green-900 font-medium"
        >
          + Add timer
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
            {manualRows.map((r, i) => (
              <tr key={i}>
                <td className={td}>
                  <Inp
                    type="text"
                    value={r.label}
                    onChange={e => updateManual(i, 'label', e.target.value)}
                    placeholder="Description"
                  />
                </td>
                {isSub ? (
                  <td className={td}>
                    <div className="flex items-center gap-1">
                      <Inp
                        value={r.subCost}
                        onChange={e => updateManual(i, 'subCost', e.target.value)}
                        step="1"
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
                ) : (
                  <>
                    <td className={td}>
                      <Inp value={r.hours} onChange={e => updateManual(i, 'hours', e.target.value)} step="0.5" className="text-center" />
                    </td>
                    <td className={td}>
                      <div className="flex items-center gap-1">
                        <Inp
                          value={r.materials}
                          onChange={e => updateManual(i, 'materials', e.target.value)}
                          step="1"
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
          onClick={() =>
            setManualRows(rows => [...rows, { label: '', hours: '', materials: '', subCost: '' }])
          }
          className="mt-2 text-xs text-green-700 hover:text-green-900 font-medium"
        >
          + Add manual entry
        </button>
      </div>

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
    </div>
    </SubTabContext.Provider>
  )
}
