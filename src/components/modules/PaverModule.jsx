import WorkTypeChooser from './WorkTypeChooser'
import CrewTypeBar from './CrewTypeBar'
import ModuleHeaderSlot from './ModuleHeaderSlot'
// ─────────────────────────────────────────────────────────────────────────────
// PaverModule — Paver estimator
//
// Labor rates (category='Paver') from labor_rates table:
//   Paver - Install          20 SF/hr
//   Paver - Straight Cut     70 LF/hr
//   Paver - Curved Cut       30 LF/hr
//   Paver - Restraints       22 LF/hr
//   Paver - Sleeves          10 LF/hr
//   Paver - Vertical Soldier  8 LF/hr
//   Paver - Sealer          200 SF/hr
//   Paver - 80mm Add         0.15 (multiplier × install SF / install rate)
//   Paver - Stone Add        0.05 hrs/ea
//   Paver - Color Add        0.05 hrs/ea
//   Paver - Poly Sand New    0.004 hrs/SF
//   Paver - Poly Sand Existing 0.0075 hrs/SF (labor)
//   Base prep shares the demo Import Base rates (hrs / Cu Ft):
//     Skid Good → Skid - Import Base Good
//     Skid OK   → Skid - Import Base   (shared w/ Skid demo)
//     Mini Skid → Mini - Import Base   (shared w/ Mini demo)
//     Hand      → Hand - Import Base   (shared w/ Hand demo)
//
// Material rates (category='Paver') from material_rates table:
//   Paver - Base Rock           $7.50/ton
//   Paver - Bedding Sand       $/Cu Yd
//   Paver - Joint Sand          $0.05/SF
//   Paver - Poly Sand           $0.56/SF
//   Paver - Sealer              $0.63/SF
//   Paver - Restraint Concrete  $1.38/LF
//   Paver - Sleeves             $0.46/LF
//   Paver - Pallet Charge      $51.75/pallet
//   Paver - Delivery          $442.75 flat
//
// Paver prices from paver_prices table: brand, name, price_per_sf,
//   sf_per_pallet, price_per_lf_vert
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useCallback, useContext } from 'react'
import { SubTabContext, subSectionTitle } from './subTabContext'
import { supabase } from '../../lib/supabase'
import GpmdBar from './GpmdBar'
import RateEditPopover from '../RateEditPopover'
import { fetchSalesTaxRate } from '../../lib/companyDefaults'
import { calcWalkAccessLabor } from '../../lib/walkAccess'
import {
  fetchPriceLedgerAsOf,
  ledgerPrice,
  catalogOptions,
  catalogItemFor,
  fetchModuleCatalog,
  fetchStandardRateMap,
} from '../../lib/materialCatalog'
import { calcPaver } from './paverCalc'

// One-picker scheme (matches Concrete/Steps): Standard sources & prices from the
// item's null-vendor catalog record; an unset vendor shows nothing.
const CATALOG_OPTS = { standardRows: 'null-vendor', stripPrefix: true }

const n = v => parseFloat(v) || 0
// Base-rock tonnage density (SF·inch per ton). The 200 divisor is a tunable
// estimating coefficient — callers pass the DB-editable value.

const BASE_METHODS = ['Skid Good', 'Skid OK', 'Mini Skid', 'Hand']

// Each base-install method maps to a demo Import Base labor_rates row (shared
// source of truth) so the inline calculator icon edits the same rate the demo
// modules use. Skid = hrs/Sq Ft; Mini + Hand = hrs/Cu Ft.
const BASE_METHOD_LABOR_NAME = {
  'Skid Good': 'Skid - Import Base Good',
  'Skid OK': 'Skid - Import Base',
  'Mini Skid': 'Mini - Import Base',
  Hand: 'Hand - Import Base',
}

// ── Calculation engine ────────────────────────────────────────────────────────
// Every rate/coefficient below is read live from the rate maps (labor_rates,
// material catalog / misc_rates) with NO hardcoded fallback. The old values are
// guaranteed to exist in the tables via supabase-paver-fallbacks-seed.sql.
// ── Vendor catalog (subs_vendors + material_rates) ───────────────────────────
const PAVER_CAT = { paver: 'Paver Material', base: 'Base Material' }

// Option list for a section = the vendor's catalog items. Each option carries
// the material_rates row id (the STABLE key a selection is stored/matched by —
// rename-proof) plus a human label (name minus the '<sub_category> - ' prefix,
// and minus the sub_category collection so it reads clean). Empty for
// Standard/Custom/unset vendors.
// Vendor catalog options + row resolution now come from the shared library
// (src/lib/materialCatalog.js) so every module resolves identically.
// Vendor-first: an unset vendor yields no options (empty placeholder); an
// explicit 'Standard' sources the null-vendor catalog rows; a real vendor its own.
function paverOptions(cat, vendorSel, materialRows) {
  if (!vendorSel || vendorSel === 'auto') return []
  const isStd = vendorSel === 'Standard'
  return catalogOptions(materialRows, cat, isStd ? 'Standard' : vendorSel, CATALOG_OPTS)
}
function paverItemFor(cat, vendorSel, key, materialRows) {
  if (!vendorSel || vendorSel === 'auto') return null
  const isStd = vendorSel === 'Standard'
  return catalogItemFor(materialRows, cat, isStd ? 'Standard' : vendorSel, key, CATALOG_OPTS)
}


// ── Default state ─────────────────────────────────────────────────────────────
const DEFAULT_STATE = {
  distanceLF: '', // Avg truck → work area (LF) for walk-access penalty
  difficulty: 0,
  crewType: 'Paver',
  hoursAdj: 0,
  areaRows: [
    { label: 'Area 1', method: 'Skid OK', sf: '', depth: 6, paverVendor: '', paverType: '', customPricePerSF: '', baseVendor: '', baseType: '' },
  ],
  straightCutLF: '',
  curvedCutLF: '',
  restraintsLF: '',
  numStones: '',
  numColors: '',
  sleevesLF: '',
  // Vertical Soldier Course — array of rows (Vendor → Paver → LF). Legacy single-
  // record fields (vertSoldierLF/vertVendor/vertType/vertCustomPricePerLF) are
  // kept for backward-compat and migrated into vertRows on load (see ensureVertRows).
  vertRows: [],
  vertSoldierLF: '',
  vertVendor: '',
  vertType: '',
  // Used only when vertVendor === 'Custom'
  vertCustomPricePerLF: '',
  sealerSF: '',
  // Install SF is entered manually (Paver Labor → Install line).
  installSF: '',
  // 80mm thickness line — SF that gets the +15% (table-driven) labor penalty.
  mm80SF: '',
  // Poly Sand — New pavers: own SF input (Paver Labor line).
  polySandNewSF: '',
  // SF of existing pavers being re-sanded — independent input, uses
  // the higher "Paver - Poly Sand Existing" material rate.
  polySandExistingSF: '',
  includeDelivery: false,
  salesTax: 0,
  shippingCharge: '',
  manualRows: [
    { label: '', hours: '', materials: '', subCost: '' },
  ],

  // ── Subcontractor tab — independent copies of every mirrored field so the
  //    Sub tab is its own calculator that SUMS with In-House. Only the
  //    modifiers (difficulty / distanceLF / hoursAdj) are In-House-only and
  //    are NOT mirrored. Sub cost itself uses an install-only whole-job rate
  //    (see calc below); the other mirrored fields are captured for scope.
  subAreaRows: [
    { label: 'Area 1', method: 'Skid OK', sf: '', depth: 6, paverVendor: '', paverType: '', customPricePerSF: '', baseVendor: '', baseType: '', installType: 'Hand Demo', largeFormat: false, under500: false },
  ],
  // Sub install line items — SF per install type + two surcharge lines.
  subInstall: {
    handDemo: '',
    bobcatDemo: '',
    noDemo: '',
    noDemoBase: '',
    tileConcrete: '',
    permeable: '',
    largeFormat: '',
    under500: '',
  },
  subStraightCutLF: '',
  subCurvedCutLF: '',
  subRestraintsLF: '',
  subNumStones: '',
  subNumColors: '',
  subSleevesLF: '',
  subVertSoldierLF: '',
  subVertPaverBrand: '',
  subVertPaverName: '',
  subVertCustomPricePerLF: '',
  subSealerSF: '',
  subIs80mm: false,
  subPolySand: false,
  subPolySandExistingSF: '',
  subManualRows: [
    { label: '', hours: '', materials: '', subCost: '' },
  ],
}

// ── Backward-compat: migrate legacy single-record Vertical Soldier fields into
// the vertRows array so older saved estimates render + price via the new rows UI.
function ensureVertRows(s) {
  if (Array.isArray(s.vertRows) && s.vertRows.length) return s
  const hasLegacy =
    s.vertVendor ||
    s.vertId ||
    s.vertType ||
    s.vertCustomPricePerLF ||
    (s.vertSoldierLF != null && s.vertSoldierLF !== '' && Number(s.vertSoldierLF) > 0)
  if (!hasLegacy) return s
  return {
    ...s,
    vertRows: [
      {
        vendor: s.vertVendor || '',
        id: s.vertId || '',
        type: s.vertType || '',
        customPricePerLF: s.vertCustomPricePerLF || '',
        lf: s.vertSoldierLF || '',
      },
    ],
  }
}

// ── UI helpers ────────────────────────────────────────────────────────────────
function SecHdr({ title, sub }) {
  const isSub = useContext(SubTabContext)
  return (
    <div className="flex items-center gap-2 col-span-full text-xs font-bold text-gray-600 uppercase tracking-wider bg-gray-50 rounded-lg border border-gray-200 px-4 py-2.5 mt-4 mb-1">
      {subSectionTitle(title, isSub)}
      {sub && <span className="ml-2 font-normal normal-case text-gray-400">{sub}</span>}
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

function Sel({ value, onChange, options }) {
  return (
    <select
      value={value}
      onChange={onChange}
      className="w-full border border-gray-200 rounded-md px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-400"
    >
      {options.map(o => {
        const val = typeof o === 'object' ? o.value : o
        const lab = typeof o === 'object' ? o.label : o
        return (
          <option key={val} value={val}>
            {lab}
          </option>
        )
      })}
    </select>
  )
}

function Toggle({ checked, onChange, label }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer select-none">
      <input
        type="checkbox"
        checked={checked}
        onChange={e => onChange(e.target.checked)}
        className="w-4 h-4 rounded accent-blue-600"
      />
      <span className="text-sm text-gray-700">{label}</span>
    </label>
  )
}

function TH({ cols, center }) {
  return (
    <thead>
      <tr className={`${center ? 'text-center' : 'text-left'} text-gray-400 border-b border-gray-100 text-xs`}>
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
export default function PaverModule({ initialData, onSave, onCancel }) {
  const [state, setState] = useState(() =>
    ensureVertRows({ ...DEFAULT_STATE, ...(initialData || {}) })
  )

  // Free-text notes for this module — Sam writes auto-generated
  // takeoffs here via create_estimate_from_takeoff, and the user can
  // overwrite / append their own.
  const [notes, setNotes] = useState(initialData?.notes ?? '')
  const [laborRates, setLaborRates] = useState(initialData?.laborRates || {})
  const [materialRates, setMaterialRates] = useState(initialData?.materialRates || {})
  const [laborRatePerHour, setLaborRatePerHour] = useState(initialData?.laborRatePerHour ?? null)
  const [laborBurdenPct, setLaborBurdenPct] = useState(initialData?.laborBurdenPct ?? null)
  const [gpmd, setGpmd] = useState(initialData?.gpmd ?? null)
  const [subGpMarkupRate, setSubGpMarkupRate] = useState(initialData?.subGpMarkupRate ?? null)
  const [commissionRate, setCommissionRate] = useState(initialData?.commissionRate ?? null)
  const [walkPace, setWalkPace] = useState(initialData?.walkAccess?.paceLfPerMin ?? null)
  const [walkAccess] = useState(
    initialData?.walkAccess ?? {
      paceLfPerMin: null,
    }
  )
  const [paverPrices, setPaverPrices] = useState(initialData?.paverPrices || [])
  // Vendor catalog (material_rates rows w/ sub_category + vendor_id + paver attrs)
  // and the vendor list, driving the per-row Vendor/Type pickers.
  const [materialRows, setMaterialRows] = useState(initialData?.materialRows || [])
  const [ledger, setLedger] = useState({}) // Phase 4 per-vendor price ledger
  const [asOfDate, setAsOfDate] = useState('') // blank = current prices
  const [vendors, setVendors] = useState([])

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

  const [loading, setLoading] = useState(true)

  // Re-fetch all Paver rate maps. Called once on mount and again whenever the
  // user saves an edit from a RateEditPopover so the calc picks up the change.
  const refreshAllRates = useCallback(async () => {
    // material_rates retired: base map (incl. shared Basic Materials) from the
    // new model; Paver catalog (with pallet / vertical-LF specs) from
    // material + material_price. Subcategories ('Paver Material'/'Base Material')
    // are unchanged, so no remap needed.
    const [lrRes, matMap, rows, venRes] = await Promise.all([
      // Base prep shares the demo Import Base rates, so pull 'Demo' too.
      supabase.from('labor_rates').select('name,rate').in('category', ['Paver', 'Demo']),
      fetchStandardRateMap(['Paver', 'Basic Materials']),
      fetchModuleCatalog(['Paver', 'Basic Materials']),
      supabase
        .from('subs_vendors')
        .select('id, company_name')
        .eq('type', 'vendor')
        .order('company_name'),
    ])
    if (lrRes.data) {
      const m = {}
      lrRes.data.forEach(r => {
        m[r.name] = parseFloat(r.rate)
      })
      setLaborRates(m)
    }
    setMaterialRates(matMap)
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
        // Company settings
        !initialData?.laborRatePerHour &&
          supabase
            .from('company_settings')
            .select('labor_rate_per_hour, labor_burden_pct, walk_access_pace_lf_per_min, estimate_gpmd_default, commission_rate, sub_gp_markup_rate')
            .single()
            .then(({ data }) => {
              if (!gone && data?.labor_rate_per_hour != null)
                setLaborRatePerHour(parseFloat(data.labor_rate_per_hour))
              if (!gone && data?.labor_burden_pct != null)
                setLaborBurdenPct(parseFloat(data.labor_burden_pct))
              if (!gone && data?.walk_access_pace_lf_per_min != null)
                setWalkPace(parseFloat(data.walk_access_pace_lf_per_min))
              if (!gone && data?.estimate_gpmd_default != null)
                setGpmd(parseFloat(data.estimate_gpmd_default))
              if (!gone && data?.commission_rate != null)
                setCommissionRate(parseFloat(data.commission_rate))
              if (!gone && data?.sub_gp_markup_rate != null)
                setSubGpMarkupRate(parseFloat(data.sub_gp_markup_rate))
            }),
        refreshAllRates(),
        // Paver prices catalog — always fresh
        supabase
          .from('paver_prices')
          .select('brand,name,price_per_sf,sf_per_pallet,price_per_lf_vert')
          .order('brand')
          .order('name')
          .then(({ data }) => {
            if (!gone && data) setPaverPrices(data)
          }),
      ])
      if (!gone) setLoading(false)
    })()
    return () => {
      gone = true
    }
  }, [refreshAllRates])

  // (Re)load the price ledger whenever the catalog rows or the as-of date change.
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

  const set = useCallback((f, v) => setState(p => ({ ...p, [f]: v })), [])
  const setRow = useCallback(
    (sec, i, f, v) =>
      setState(p => {
        const rows = [...p[sec]]
        rows[i] = { ...rows[i], [f]: v }
        return { ...p, [sec]: rows }
      }),
    []
  )

  const effWalkAccess = { ...(walkAccess || {}), paceLfPerMin: n(walkAccess?.paceLfPerMin) || walkPace }

  // ── In-House vs Subcontractor tab ───────────────────────────────────────────
  // The two tabs are independent calculators that SUM together. Each mirrored
  // input binds to the ACTIVE key so it edits its own tab's data; the In-House
  // engine (calcPaver) always reads the raw In-House fields, so switching tabs
  // never mutates In-House numbers. Active-key strings resolve to the original
  // field names on the In-House tab (behaviour unchanged) and to the sub*
  // counterparts on the Subcontractor tab.
  const isSub = state.subType === 'Subcontractor'
  const kArea = isSub ? 'subAreaRows' : 'areaRows'
  const kStraight = isSub ? 'subStraightCutLF' : 'straightCutLF'
  const kCurved = isSub ? 'subCurvedCutLF' : 'curvedCutLF'
  const kRestraints = isSub ? 'subRestraintsLF' : 'restraintsLF'
  const kSleeves = isSub ? 'subSleevesLF' : 'sleevesLF'
  const kSealer = isSub ? 'subSealerSF' : 'sealerSF'
  const kStones = isSub ? 'subNumStones' : 'numStones'
  const kColors = isSub ? 'subNumColors' : 'numColors'
  const kManual = isSub ? 'subManualRows' : 'manualRows'

  // Append an empty area row to the ACTIVE tab's shared area array. Both the
  // Paver Material and Base Material tables render from state[kArea], so a new
  // row shows up in both. Empty vendor ('' → "Select") means the row is
  // unselected and contributes $0 until filled (calc is guarded on selection).
  const addAreaRow = () => {
    const rows = state[kArea] || []
    const base = {
      label: `Area ${rows.length + 1}`,
      method: 'Skid OK',
      sf: '',
      depth: 6,
      paverVendor: '',
      paverType: '',
      customPricePerSF: '',
      baseVendor: '',
      baseType: '',
    }
    const newRow = isSub
      ? { ...base, installType: 'Hand Demo', largeFormat: false, under500: false }
      : base
    set(kArea, [...rows, newRow])
  }

  // ── Sub tab unit-price rates (per-SF install types + per-LF sleeves) ─────────
  // Simple $/SF install pricing keyed by install type, plus per-SF surcharges
  // and a per-LF sleeves rate. All read from labor_rates (category 'Paver').
  // Sub install is a FIXED set of line items — each has its own SF input, $/SF
  // rate, and cost. The two surcharge lines sit at the bottom.
  const SUB_INSTALL_LINES = [
    { key: 'handDemo', label: 'Paver with Hand Demo', name: 'Paver Sub - Hand Demo' },
    { key: 'bobcatDemo', label: 'Paver with Bobcat Demo', name: 'Paver Sub - Bobcat Demo' },
    { key: 'noDemo', label: 'Paver No Demo', name: 'Paver Sub - No Demo' },
    { key: 'noDemoBase', label: 'Paver No Demo/Base', name: 'Paver Sub - No Demo/Base' },
    { key: 'tileConcrete', label: 'Tile Paver in Concrete', name: 'Paver Sub - Tile in Concrete' },
    { key: 'permeable', label: 'Permeable Paver', name: 'Paver Sub - Permeable' },
  ]
  const SUB_SURCHARGE_LINES = [
    { key: 'largeFormat', label: 'Large Format Paver', name: 'Paver Sub - Large Format Add' },
    { key: 'under500', label: 'Less than 500 SF', name: 'Paver Sub - Under 500 Add' },
  ]
  const subRateFor = ln => n(laborRates[ln.name])
  const sleevesSubRate = n(laborRates['Paver Sub - Sleeves LF'])
  const subInstall = state.subInstall || {}

  // ── Vendor catalog helpers (per-row Vendor/Type pickers) ─────────────────
  const vendorsForCategory = cat => vendors.filter(v => materialRows.some(r => r.vendor_id === v.id && (r.sub_category === cat || r.category === cat)))

  // Resolve a catalog item's unit cost from the price ledger (per-vendor),
  // falling back to the row's own unit_cost.
  const priceOf = item => (item ? ledgerPrice(ledger, item.id, item.vendor_id, n(item.unit_cost)) : 0)

  // In-House engine — FORCE the In-House tab so it always reads the raw In-House
  // fields (state.areaRows …) regardless of which tab is active. This is the
  // in-house side of the module: paver material + install labor + in-house GP.
  const inHouse = calcPaver(
    { ...state, subType: 'In-House' },
    laborRatePerHour,
    laborRates,
    materialRates,
    paverPrices,
    gpmd,
    effWalkAccess,
    laborBurdenPct,
    materialRows,
    priceOf,
    commissionRate
  )
  // Sub engine — FORCE the Sub tab so it reads the sub area rows (state.subAreaRows
  // …). We take only its MATERIAL total (its labor/GP are ignored — install labor
  // is always In-House). This paver material is a subcontractor cost.
  const subEngine = calcPaver(
    { ...state, subType: 'Subcontractor' },
    laborRatePerHour,
    laborRates,
    materialRates,
    paverPrices,
    gpmd,
    effWalkAccess,
    laborBurdenPct,
    materialRows,
    priceOf,
    commissionRate
  )

  // ── Sub side — per-SF / per-LF unit pricing ─────────────────────────────────
  // Each sub install line is $/SF; the two surcharge lines add their own $/SF;
  // sleeves are per LF; sub manual-row sub costs pass through.
  const subInstallSF = SUB_INSTALL_LINES.reduce((s, ln) => s + n(subInstall[ln.key]), 0)
  const subAreaCost = [...SUB_INSTALL_LINES, ...SUB_SURCHARGE_LINES].reduce(
    (s, ln) => s + n(subInstall[ln.key]) * subRateFor(ln),
    0
  )
  const subSideCost =
    subAreaCost +
    n(state.subSleevesLF) * sleevesSubRate +
    (state.subManualRows || []).reduce((s, r) => s + n(r.subCost), 0)

  // ── Sum the two INDEPENDENT sides ───────────────────────────────────────────
  // In-House side  = inHouse (labor + in-house paver material + in-house GP).
  // Sub side       = sub paver material (from the sub area rows) + the sub install
  //                  $/SF lines + manual sub costs, marked up by the Sub GP rate.
  // Both are ALWAYS included so the module total = In-House subtotal + Sub subtotal,
  // and each tab's inputs are fully independent.
  const subPaverMat = subEngine.totalMat || 0
  const _subCost = inHouse.subCost + subSideCost + subPaverMat
  const _subGp = _subCost * subGpMarkupRate
  const _gp = inHouse.gp
  const _commission = (_gp + _subGp) * n(commissionRate)
  const _price =
    inHouse.laborCost +
    inHouse.burden +
    inHouse.totalMat +
    _gp +
    _subCost +
    _subGp +
    _commission
  const calcRaw = {
    ...inHouse,
    subCost: _subCost,
    subGp: _subGp,
    gp: _gp,
    commission: _commission,
    price: _price,
    subInstallSF,
    subAreaCost,
    subSideCost,
    subPaverMat,
    // Itemized Sub-side breakdown for the module detail summary: the sub
    // MATERIAL components (from the sub area rows) and the sub install/rate cost.
    subInstallCost: subSideCost,
    subMatItems: {
      paver: subEngine.totalPaverCost,
      vert: subEngine.vertPaverCost,
      base: subEngine.baseRockCost,
      baseCuYd: subEngine.totalBaseCuYd,
      bedding: subEngine.beddingSandCost,
      joint: subEngine.jointSandCost,
      poly: subEngine.polySandCost,
      polyExisting: subEngine.polySandExistingCost,
      sealer: subEngine.sealerMatCost,
      restraint: subEngine.restraintMatCost,
      sleeves: subEngine.sleevesMatCost,
      pallet: subEngine.palletCost,
      pallets: subEngine.totalPallets,
      delivery: subEngine.deliveryCost,
      tax: subEngine.salesTaxCost,
      manual: subEngine.manualMat,
      total: subEngine.totalMat,
    },
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

  const fmt2 = v =>
    `$${n(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  const fmt = v => `$${Math.round(v).toLocaleString()}`
  const fh = v => (v > 0 ? v.toFixed(2) : '—')

  const td = 'py-1.5 pr-2 align-top'
  const num = 'py-1.5 pr-2 text-gray-600 tabular-nums text-xs align-top'

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
        walkAccess: effWalkAccess,
        laborRatePerHour,
        laborBurdenPct,
        gpmd,
        subGpMarkupRate,
        commissionRate,
        laborRates,
        materialRates,
        paverPrices,
        calc: {
          totalHrs: calc.totalHrs,
          manDays: calc.manDays,
          laborCost: calc.laborCost,
          burden: calc.burden,
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

  // Active-tab material engine for the per-tab material readout: shows ONLY the
  // active tab's materials (In-House on the In-House tab, Sub on the Sub tab).
  // The financial calc still sums both sides.
  const matBd = isSub ? subEngine : inHouse

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
    category: 'Paver',
    unitLabel: r0.unit || 'ea',
    mode: 'currency',
    value: n(r0.unit_cost),
  })
  const catalogSort = (a, b) => {
    const va = a.vendor_id == null ? '' : vendorNames[a.vendor_id] || '~'
    const vb = b.vendor_id == null ? '' : vendorNames[b.vendor_id] || '~'
    return va.localeCompare(vb) || (a.name || '').localeCompare(b.name || '')
  }
  // Sub-category–picked sections (Paver / Base): every catalog row in that subcat.
  const catalogBlockItems = subcat =>
    (materialRows || [])
      .filter(r0 => r0.sub_category === subcat)
      .filter(r0 => r0.vendor_id == null || vendorNames[r0.vendor_id])
      .sort(catalogSort)
      .map(catalogRowToItem)
  // Named materials (base rock, sands, sealer, …): matched by exact catalog name.
  const materialRateRows = dbName =>
    (materialRows || [])
      .filter(r0 => r0.name === dbName)
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
            crewType={state.crewType}
            onCrewTypeChange={v => set('crewType', v)}
            title="Pavers"
            moduleType="Pavers"
            refreshAllRates={refreshAllRates}
            showInlineToggle={false}
          />
        </div>
      </div>

      <ModuleHeaderSlot>
        <WorkTypeChooser value={state.subType || 'In-House'} onChange={v => set('subType', v)} compact />
      </ModuleHeaderSlot>

      {loading && (
        <div className="text-xs text-amber-700 bg-amber-50 rounded px-3 py-2">
          Loading rates and paver catalog…
        </div>
      )}

      {/* ── Settings ─────────────────────────────────────────────────────────── */}
      {/* Job Site Conditions — In-House only. The Sub tab is a simple
          unit-priced section and does not use difficulty / walk-access /
          80mm / poly-sand modifiers. */}
      {!isSub && (
        <>
      <SecHdr title="Job Site Conditions" />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Difficulty / walk-access / hours-adj are In-House modifiers only —
            hidden on the Subcontractor tab (sub pricing is a whole-job rate). */}
        {!isSub && (
          <div>
            <p className="text-xs text-gray-500 mb-0.5">Difficulty (%)</p>
            <Inp
              value={state.difficulty}
              onChange={e => set('difficulty', e.target.value)}
              step="5"
            />
            <p className="text-xs text-gray-400 mt-0.5">Adds % to install hrs</p>
          </div>
        )}
        {!isSub && (
          <div>
            <div className="flex items-center gap-1 mb-0.5">
              <p
                className="text-xs text-gray-500"
                title="Average Distance from Truck to Work Area"
              >
                Truck → Work Area (Avg LF)
              </p>
            </div>
            <Inp
              value={state.distanceLF}
              onChange={e => set('distanceLF', e.target.value)}
              step="5"
            />
            {calc.walkHrs > 0 && (
              <p className="text-[10px] text-gray-500 mt-0.5">
                +{calc.walkHrs.toFixed(2)} hrs walk-access
              </p>
            )}
          </div>
        )}
        {!isSub && (
          <div>
            <p className="text-xs text-gray-500 mb-0.5">Hours Adj (±hrs)</p>
            <Inp value={state.hoursAdj} onChange={e => set('hoursAdj', e.target.value)} step="0.5" />
          </div>
        )}
      </div>
        </>
      )}

      {/* ── Paver Material — In-House + Subcontractor (materials on both tabs) ──── */}
      <div>
        <div className="flex items-center flex-wrap gap-x-2 gap-y-1 text-xs font-bold text-gray-600 uppercase tracking-wider bg-gray-50 rounded-lg border border-gray-200 px-4 py-2.5 mt-4 mb-2">
          <span>{subSectionTitle('Paver Material', isSub)}</span>
        </div>
        <table className="w-full text-xs">
          <TH
            center
            cols={[
              { label: 'Vendor', w: 'w-40' },
              { label: 'Paver Type' },
              { label: 'SF', w: 'w-24' },
              { label: '$/SF', w: 'w-12' },
              { label: 'Pallets', w: 'w-12' },
              { label: 'Cost', w: 'w-20' },
            ]}
          />
          <tbody className="divide-y divide-gray-50">
            {state[kArea].map((row, i) => {
              const a = (isSub ? calc.subAreas : calc.areas)[i] || {}
              const pOpts = paverOptions(PAVER_CAT.paver, row.paverVendor, materialRows)
              // Empty default + "Select paver" placeholder; keep a stored id that is
              // not in the current catalog selectable (backward-compat).
              const paverSelOpts = !row.paverId
                ? [{ value: '', label: 'Select paver' }, ...pOpts]
                : pOpts.some(o => o.value === row.paverId)
                  ? pOpts
                  : [{ value: row.paverId, label: row.paverType || row.paverId }, ...pOpts]
              return (
                <tr key={i}>
                  <td className={td}>
                    <select
                      className="w-full border border-gray-200 rounded-md px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-400"
                      value={row.paverVendor || ''}
                      onChange={e => {
                        const v = e.target.value
                        setRow(kArea, i, 'paverVendor', v)
                        // Reset the paver selection so the user explicitly picks
                        // (no fallback to the vendor's first catalog item).
                        setRow(kArea, i, 'paverId', '')
                        setRow(kArea, i, 'paverType', '')
                      }}
                    >
                      <option value="">Select</option>
                      {vendorsForCategory(PAVER_CAT.paver).map(v => (
                        <option key={v.id} value={v.id}>
                          {v.name}
                        </option>
                      ))}
                      <option value="Custom">Custom (inline price)</option>
                    </select>
                  </td>
                  <td className={td}>
                    {row.paverVendor === 'Custom' ? (
                      <Inp
                        value={row.customPricePerSF || ''}
                        onChange={e => setRow(kArea, i, 'customPricePerSF', e.target.value)}
                        placeholder="$/SF"
                      />
                    ) : (
                      <Sel
                        value={row.paverId || ''}
                        onChange={e => {
                          const id = e.target.value
                          const opt = pOpts.find(o => o.id === id)
                          setRow(kArea, i, 'paverId', id)
                          setRow(kArea, i, 'paverType', opt ? opt.stored : '')
                        }}
                        options={paverSelOpts}
                      />
                    )}
                  </td>
                  <td className={td}>
                    <Inp
                      value={row.sf}
                      onChange={e => setRow(kArea, i, 'sf', e.target.value)}
                      placeholder="Paver SF"
                      className="text-center"
                    />
                  </td>
                  <td className={`${num} text-center`}>{a.pricePerSF > 0 ? fmt2(a.pricePerSF) : '—'}</td>
                  <td className={`${num} text-center`}>{a.pallets > 0 ? a.pallets : '—'}</td>
                  <td className={`${num} text-center`}>{a.paverCost > 0 ? fmt(a.paverCost) : '—'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
        <button
          type="button"
          onClick={() => addAreaRow()}
          className="mt-2 text-xs px-2 py-1 rounded bg-slate-100 text-slate-700 hover:bg-slate-200"
        >
          + Add row
        </button>
      </div>

      {/* ── Additional Paver Costs (moved directly below Paver Material) ───────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SecHdr title="Additional Paver Costs" />
        <div>
          <p className="text-xs text-gray-500 mb-0.5">Sales Tax on Pavers (%)</p>
          <Inp
            value={state.salesTax}
            onChange={e => set('salesTax', e.target.value)}
            step="0.1"
            placeholder="0"
          />
          {calc.salesTaxCost > 0 && (
            <p className="text-xs text-gray-400 mt-0.5">{fmt2(calc.salesTaxCost)} tax</p>
          )}
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-0.5">Shipping / Freight ($)</p>
          <Inp
            value={state.shippingCharge}
            onChange={e => set('shippingCharge', e.target.value)}
            step="1"
          />
        </div>
        {/* Delivery — auto when any paver is selected, billed per 900 Sq Ft
            increment. Read-only display; the per-increment rate is editable
            via the View Rates popup. */}
        <div>
          <div className="flex items-center gap-1 mb-0.5">
            <p className="text-xs text-gray-500">Delivery</p>
          </div>
          {calc.deliveryIncrements > 0 ? (
            <>
              <div className="px-2 py-1.5 rounded border border-gray-200 bg-gray-50 text-sm font-semibold text-gray-700">
                {fmt2(calc.deliveryCost)}
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                {calc.deliveryIncrements} × {fmt2(calc.deliveryFlat)} (
                {calc.matInstallSF.toLocaleString()} Sq Ft ÷ {calc.deliverySFPerIncrement})
              </p>
            </>
          ) : (
            <div className="px-2 py-1.5 rounded border border-gray-200 bg-gray-50 text-sm text-gray-400 italic">
              Select a paver to apply
            </div>
          )}
        </div>
      </div>

      {/* ── Base Material — In-House + Subcontractor ──────────────────────────── */}
      <div>
        <div className="flex items-center flex-wrap gap-x-2 gap-y-1 text-xs font-bold text-gray-600 uppercase tracking-wider bg-gray-50 rounded-lg border border-gray-200 px-4 py-2.5 mt-4 mb-2">
          <span>{subSectionTitle('Base Material', isSub)}</span>
        </div>
        <table className="w-full text-xs">
          <TH
            center
            cols={[
              { label: 'Vendor', w: 'w-36' },
              { label: 'Base Type', w: 'w-40' },
              { label: 'Base SF', w: 'w-24' },
              { label: 'Base Install', w: 'w-36' },
              { label: 'Base (in)', w: 'w-14' },
              { label: 'Cu Yd', w: 'w-12' },
              { label: 'Hrs', w: 'w-12' },
            ]}
          />
          <tbody className="divide-y divide-gray-50">
            {state[kArea].map((row, i) => {
              const a = (isSub ? calc.subAreas : calc.areas)[i] || {}
              const baseUnset = !row.baseVendor
              const isRealBase = row.baseVendor && row.baseVendor !== 'Standard'
              const bOpts = isRealBase
                ? paverOptions(PAVER_CAT.base, row.baseVendor, materialRows)
                : baseUnset
                  ? [{ value: '', label: 'Select base' }]
                  : ['Class II Roadbase']
              return (
                <tr key={i}>
                  <td className={td}>
                    <select
                      className="w-full border border-gray-200 rounded-md px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-400"
                      value={row.baseVendor || ''}
                      onChange={e => {
                        const v = e.target.value
                        setRow(kArea, i, 'baseVendor', v)
                        if (!v) {
                          // Empty placeholder → clear selection ($0 base material).
                          setRow(kArea, i, 'baseId', '')
                          setRow(kArea, i, 'baseType', '')
                        } else if (v === 'Standard') {
                          setRow(kArea, i, 'baseId', '')
                          setRow(kArea, i, 'baseType', 'Class II Roadbase')
                        } else {
                          const opts = paverOptions(PAVER_CAT.base, v, materialRows)
                          setRow(kArea, i, 'baseId', opts[0]?.id || '')
                          setRow(kArea, i, 'baseType', opts[0]?.stored || '')
                        }
                      }}
                    >
                      <option value="">Select</option>
                      <option value="Standard">Standard</option>
                      {vendorsForCategory(PAVER_CAT.base).map(v => (
                        <option key={v.id} value={v.id}>
                          {v.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className={td}>
                    <Sel
                      value={
                        isRealBase
                          ? row.baseId || ''
                          : baseUnset
                            ? ''
                            : row.baseType || 'Class II Roadbase'
                      }
                      onChange={e => {
                        if (baseUnset) return
                        if (!isRealBase) {
                          setRow(kArea, i, 'baseType', e.target.value)
                          return
                        }
                        const id = e.target.value
                        const opt = bOpts.find(o => o.id === id)
                        setRow(kArea, i, 'baseId', id)
                        setRow(kArea, i, 'baseType', opt ? opt.stored : '')
                      }}
                      options={bOpts}
                    />
                  </td>
                  <td className={td}>
                    <Inp
                      value={row.baseSf ?? ''}
                      onChange={e => setRow(kArea, i, 'baseSf', e.target.value)}
                      placeholder={row.sf ? `Base SF (def ${row.sf})` : 'Base SF'}
                      className="text-center"
                    />
                  </td>
                  <td className={td}>
                    <Sel
                      value={row.method}
                      onChange={e => setRow(kArea, i, 'method', e.target.value)}
                      options={BASE_METHODS}
                    />
                  </td>
                  <td className={td}>
                    <Inp
                      value={row.depth}
                      onChange={e => setRow(kArea, i, 'depth', e.target.value)}
                      placeholder="6"
                      className="text-center"
                    />
                  </td>
                  <td className={`${num} text-center`}>{a.baseCuYd > 0 ? a.baseCuYd.toFixed(2) : '—'}</td>
                  <td className={`${num} text-center`}>{fh(a.baseHrs)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
        <button
          type="button"
          onClick={() => addAreaRow()}
          className="mt-2 text-xs px-2 py-1 rounded bg-slate-100 text-slate-700 hover:bg-slate-200"
        >
          + Add row
        </button>
      </div>

      {/* ── Paver Labor (In-House) / Paver/Demo Installation (Sub) ─────────── */}
      <div>
        <div className="flex items-center gap-2 text-xs font-bold text-gray-600 uppercase tracking-wider bg-gray-50 rounded-lg border border-gray-200 px-4 py-2.5 mt-4 mb-2">
          {subSectionTitle(isSub ? 'Paver/Demo Installation' : 'Paver Labor', isSub)}
        </div>
        {!isSub && (
        <table className="w-full text-xs">
          <TH
            cols={[
              { label: 'Operation', w: 'w-72' },
              { label: 'Qty / LF / SF', w: 'w-32' },
              { label: 'Labor Hrs', w: 'w-24' },
              { label: 'Notes' },
            ]}
          />
          <tbody className="divide-y divide-gray-50">
            <tr>
              <td className={`${td} font-medium text-gray-700`}>
                <span className="inline-flex items-center gap-1">
                  Install{' '}
                  <span className="text-gray-400 font-normal">({calc.installRate} Sq Ft/hr)</span>
                </span>
              </td>
              <td className={td}>
                <Inp
                  value={state.installSF}
                  onChange={e => set('installSF', e.target.value)}
                  placeholder="Install SF"
                />
              </td>
              <td className={num}>{fh(calc.installHrs)}</td>
              <td />
            </tr>
            <tr>
              <td className={`${td} font-medium text-gray-700`}>
                <span className="inline-flex items-center gap-1 flex-wrap">
                  Poly Sand New{' '}
                  <span className="text-gray-400 font-normal">
                    ({n(laborRates['Paver - Poly Sand New'])}{' '}
                    hrs/SF)
                  </span>
                  <span className="text-gray-400 font-normal">· ${calc.polySandPerSF} per Sq Ft mat</span>
                </span>
              </td>
              <td className={td}>
                <Inp
                  value={state.polySandNewSF}
                  onChange={e => set('polySandNewSF', e.target.value)}
                  placeholder="0 Sq Ft"
                />
              </td>
              <td className={num}>{fh(calc.polySandHrs)}</td>
              <td />
            </tr>
            <tr>
              <td className={`${td} font-medium text-gray-700`}>
                <span className="inline-flex items-center gap-1 flex-wrap">
                  Poly Sand Existing{' '}
                  <span className="text-gray-400 font-normal">
                    ({n(laborRates['Paver - Poly Sand Existing'])}{' '}
                    hrs/SF)
                  </span>
                  <span className="text-gray-400 font-normal">
                    · ${calc.polySandPerSF}/SF mat
                  </span>
                </span>
              </td>
              <td className={td}>
                <Inp
                  value={state.polySandExistingSF}
                  onChange={e => set('polySandExistingSF', e.target.value)}
                  placeholder="0 Sq Ft"
                />
              </td>
              <td className={num}>{fh(calc.polySandExistingHrs)}</td>
              <td />
            </tr>
            <tr>
              <td className={`${td} font-medium text-gray-700`}>
                <span className="inline-flex items-center gap-1 flex-wrap">
                  80mm{' '}
                  <span className="text-gray-400 font-normal">
                    (+{Math.round(n(laborRates['Paver - 80mm Add']) * 100)}%
                    labor)
                  </span>
                </span>
              </td>
              <td className={td}>
                <Inp
                  value={state.mm80SF}
                  onChange={e => set('mm80SF', e.target.value)}
                  placeholder="0 Sq Ft"
                />
              </td>
              <td className={num}>{fh(calc.add80mmHrs)}</td>
              <td />
            </tr>
            {[
              {
                label: 'Straight Cut',
                rate: calc.straightCutRate,
                key: kStraight,
                hrs: calc.straightCutHrs,
                unit: 'LF',
                rateName: 'Paver - Straight Cut',
              },
              {
                label: 'Curved Cut',
                rate: calc.curvedCutRate,
                key: kCurved,
                hrs: calc.curvedCutHrs,
                unit: 'LF',
                rateName: 'Paver - Curved Cut',
              },
              {
                label: 'Restraints',
                rate: calc.restraintRate,
                key: kRestraints,
                hrs: calc.restraintsHrs,
                unit: 'LF',
                rateName: 'Paver - Restraints',
                matName: 'Paver - Restraint Concrete',
                matRate: calc.restraintConcrLF,
                matUnit: 'Ln Ft',
              },
              {
                label: 'Sleeves',
                rate: calc.sleevesRate,
                key: kSleeves,
                hrs: calc.sleevesHrs,
                unit: 'LF',
                rateName: 'Paver - Sleeves',
                matName: 'Paver - Sleeves',
                matRate: calc.sleevesMatLF,
                matUnit: 'Ln Ft',
              },
            ].map(({ label, rate, key, hrs, unit, rateName, matName, matRate, matUnit }) => (
              <tr key={key}>
                <td className={`${td} font-medium text-gray-700`}>
                  <span className="inline-flex items-center gap-1 flex-wrap">
                    {label}{' '}
                    <span className="text-gray-400 font-normal">
                      ({rate} {unit}/hr)
                    </span>
                    {matName && (
                      <>
                        <span className="text-gray-400 font-normal">
                          · ${matRate}/{matUnit} mat
                        </span>
                      </>
                    )}
                  </span>
                </td>
                <td className={td}>
                  <Inp
                    value={state[key]}
                    onChange={e => set(key, e.target.value)}
                    placeholder="0"
                  />
                </td>
                <td className={num}>{fh(hrs)}</td>
                <td />
              </tr>
            ))}
            <tr>
              <td className={`${td} font-medium text-gray-700`}>
                <span className="inline-flex items-center gap-1">
                  Stones{' '}
                  <span className="text-gray-400 font-normal">
                    ({n(laborRates['Paver - Stone Add'])} hrs/ea)
                  </span>
                </span>
              </td>
              <td className={td}>
                <Inp
                  value={state[kStones]}
                  onChange={e => set(kStones, e.target.value)}
                  placeholder="0"
                />
              </td>
              <td className={num}>{fh(calc.addStoneHrs)}</td>
              <td />
            </tr>
            <tr>
              <td className={`${td} font-medium text-gray-700`}>
                <span className="inline-flex items-center gap-1">
                  Colors{' '}
                  <span className="text-gray-400 font-normal">
                    ({n(laborRates['Paver - Color Add'])} hrs/ea)
                  </span>
                </span>
              </td>
              <td className={td}>
                <Inp
                  value={state[kColors]}
                  onChange={e => set(kColors, e.target.value)}
                  placeholder="0"
                />
              </td>
              <td className={num}>{fh(calc.addColorHrs)}</td>
              <td />
            </tr>
            <tr>
              <td className={`${td} font-medium text-gray-700`}>
                <span className="inline-flex items-center gap-1 flex-wrap">
                  Sealer{' '}
                  <span className="text-gray-400 font-normal">({calc.sealerRate} Sq Ft/hr)</span>
                  <span className="text-gray-400 font-normal">· ${calc.sealerMatPerSF} per Sq Ft mat</span>
                </span>
              </td>
              <td className={td}>
                <Inp
                  value={state[kSealer]}
                  onChange={e => set(kSealer, e.target.value)}
                  placeholder="0 Sq Ft"
                />
              </td>
              <td className={num}>{fh(calc.sealerHrs)}</td>
              <td />
            </tr>
          </tbody>
        </table>
        )}

        {/* Sub tab — fixed install line items, each with its own SF input. */}
        {isSub && (
          <>
            <table className="w-full text-xs">
              <TH
                cols={[
                  { label: 'Installation' },
                  { label: 'Sq Ft', w: 'w-28' },
                  { label: 'Rate', w: 'w-28' },
                  { label: 'Cost', w: 'w-24' },
                ]}
              />
              <tbody className="divide-y divide-gray-50">
                {[...SUB_INSTALL_LINES, ...SUB_SURCHARGE_LINES].map((ln, idx) => {
                  const rate = subRateFor(ln)
                  const sf = n(subInstall[ln.key])
                  const isSurcharge = idx >= SUB_INSTALL_LINES.length
                  return (
                    <tr key={ln.key} className={isSurcharge ? 'bg-amber-50/40' : undefined}>
                      <td className={td}>{ln.label}</td>
                      <td className={td}>
                        <Inp
                          value={subInstall[ln.key] ?? ''}
                          onChange={e => set('subInstall', { ...subInstall, [ln.key]: e.target.value })}
                          placeholder="0"
                        />
                      </td>
                      <td className={num}>
                        <span className="inline-flex items-center gap-1">
                          ${rate}/SF
                        </span>
                      </td>
                      <td className={num}>{sf > 0 ? fmt(sf * rate) : '—'}</td>
                    </tr>
                  )
                })}
                {/* Sleeves — per linear foot */}
                <tr>
                  <td className={td}>Sleeves</td>
                  <td className={td}>
                    <Inp
                      value={state[kSleeves]}
                      onChange={e => set(kSleeves, e.target.value)}
                      placeholder="0 Ln Ft"
                    />
                  </td>
                  <td className={num}>
                    <span className="inline-flex items-center gap-1">
                      ${sleevesSubRate}/LF
                    </span>
                  </td>
                  <td className={num}>
                    {n(state[kSleeves]) > 0 ? fmt(n(state[kSleeves]) * sleevesSubRate) : '—'}
                  </td>
                </tr>
              </tbody>
            </table>
          </>
        )}
      </div>

      {/* ── Vertical Soldier Course — In-House only ───────────────────────────── */}
      {!isSub && (
      <div>
        <div className="flex items-center flex-wrap gap-x-2 gap-y-1 text-xs font-bold text-gray-600 uppercase tracking-wider bg-gray-50 rounded-lg border border-gray-200 px-4 py-2.5 mt-4 mb-2">
          <span>{subSectionTitle('Vertical Soldier Course', isSub)}</span>
        </div>
        <table className="w-full text-xs">
          <TH
            center
            cols={[
              { label: 'Vendor', w: 'w-40' },
              { label: 'Paver Type' },
              { label: 'LF', w: 'w-24' },
              { label: 'Cost', w: 'w-24' },
            ]}
          />
          <tbody className="divide-y divide-gray-50">
            {(state.vertRows || []).map((row, i) => {
              const vOpts = paverOptions(PAVER_CAT.paver, row.vendor, materialRows)
              const vSelOpts = !row.id
                ? [{ value: '', label: 'Select paver' }, ...vOpts]
                : vOpts.some(o => o.value === row.id)
                  ? vOpts
                  : [{ value: row.id, label: row.type || row.id }, ...vOpts]
              const lf = n(row.lf)
              let ppl = 0
              if (row.vendor === 'Custom') {
                ppl = n(row.customPricePerLF)
              } else if (row.vendor && (row.id || row.type)) {
                const it = paverItemFor(PAVER_CAT.paver, row.vendor, row.id || row.type, materialRows)
                ppl = it ? n(it.price_per_lf_vert) : 0
              }
              const cost = lf * ppl
              return (
                <tr key={i}>
                  <td className={td}>
                    <select
                      className="w-full border border-gray-200 rounded-md px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-400"
                      value={row.vendor || ''}
                      onChange={e => {
                        const v = e.target.value
                        setRow('vertRows', i, 'vendor', v)
                        // Reset paver selection so the user explicitly picks one.
                        setRow('vertRows', i, 'id', '')
                        setRow('vertRows', i, 'type', '')
                      }}
                    >
                      <option value="">Select</option>
                      {vendorsForCategory(PAVER_CAT.paver).map(v => (
                        <option key={v.id} value={v.id}>
                          {v.name}
                        </option>
                      ))}
                      <option value="Custom">Custom (inline)</option>
                    </select>
                  </td>
                  <td className={td}>
                    {row.vendor === 'Custom' ? (
                      <Inp
                        value={row.customPricePerLF || ''}
                        onChange={e => setRow('vertRows', i, 'customPricePerLF', e.target.value)}
                        placeholder="$/LF"
                      />
                    ) : (
                      <Sel
                        value={row.id || ''}
                        onChange={e => {
                          const id = e.target.value
                          const opt = vOpts.find(o => o.id === id)
                          setRow('vertRows', i, 'id', id)
                          setRow('vertRows', i, 'type', opt ? opt.stored : '')
                        }}
                        options={vSelOpts}
                      />
                    )}
                  </td>
                  <td className={td}>
                    <Inp
                      value={row.lf}
                      onChange={e => setRow('vertRows', i, 'lf', e.target.value)}
                      placeholder="Ln Ft"
                      className="text-center"
                    />
                  </td>
                  <td className={`${num} text-center`}>{cost > 0 ? fmt2(cost) : '—'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
        <button
          type="button"
          onClick={() =>
            set('vertRows', [
              ...(state.vertRows || []),
              { vendor: '', id: '', type: '', customPricePerLF: '', lf: '' },
            ])
          }
          className="mt-2 text-xs px-2 py-1 rounded bg-slate-100 text-slate-700 hover:bg-slate-200"
        >
          + Add row
        </button>
      </div>
      )}

      {/* ── Manual Entry ──────────────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center gap-2 text-xs font-bold text-gray-600 uppercase tracking-wider bg-gray-50 rounded-lg border border-gray-200 px-4 py-2.5 mt-4 mb-2">
          {subSectionTitle('Manual Entry', isSub)}
        </div>
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
            center
            cols={
              isSub
                ? [{ label: 'Description' }, { label: 'Cost ($)' }]
                : [{ label: 'Description' }, { label: 'Hours' }, { label: 'Materials ($)' }]
            }
          />
          <tbody className="divide-y divide-gray-50">
            {state[kManual].map((r, i) => (
              <tr key={i}>
                <td className={td}>
                  <Inp
                    type="text"
                    value={r.label}
                    onChange={e => setRow(kManual, i, 'label', e.target.value)}
                    placeholder="Description"
                  />
                </td>
                {isSub ? (
                  <td className={td}>
                    <div className="flex items-center gap-1">
                      <Inp
                        value={r.subCost}
                        onChange={e => setRow(kManual, i, 'subCost', e.target.value)}
                        step="1"
                        className="text-center flex-1"
                      />
                      {state[kManual].length > 1 && (
                        <button
                          type="button"
                          onClick={() => set(kManual, state[kManual].filter((_, idx) => idx !== i))}
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
                        onChange={e => setRow(kManual, i, 'hours', e.target.value)}
                        step="0.5"
                        className="text-center"
                      />
                    </td>
                    <td className={td}>
                      <div className="flex items-center gap-1">
                        <Inp
                          value={r.materials}
                          onChange={e => setRow(kManual, i, 'materials', e.target.value)}
                          step="1"
                          className="text-center flex-1"
                        />
                        {state[kManual].length > 1 && (
                          <button
                            type="button"
                            onClick={() => set(kManual, state[kManual].filter((_, idx) => idx !== i))}
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
          onClick={() => set(kManual, [...state[kManual], { label: '', hours: '', materials: '', subCost: '' }])}
          className="mt-2 text-xs px-2 py-1 rounded bg-slate-100 text-slate-700 hover:bg-slate-200"
        >
          + Add manual entry
        </button>
      </div>

      {/* ── Materials Summary (per-tab, independent) ──────────────────────────── */}
      {Number.isFinite(calc.totalMat) && (
        <div className="bg-gray-50 rounded-lg p-3 text-xs">
          <p className="font-semibold text-gray-600 uppercase tracking-wide text-xs mb-2">
            {isSub ? 'Sub' : 'In House'} Materials Breakdown
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1 text-gray-600">
            {matBd.totalPaverCost > 0 && (
              <span>
                Paver Material: <strong>{fmt2(matBd.totalPaverCost)}</strong>
              </span>
            )}
            {matBd.vertPaverCost > 0 && (
              <span>
                Vert Soldier: <strong>{fmt2(matBd.vertPaverCost)}</strong>
              </span>
            )}
            {matBd.baseRockCost > 0 && (
              <span>
                Base Rock ({matBd.totalBaseCuYd.toFixed(2)} Cu Yd):{' '}
                <strong>{fmt2(matBd.baseRockCost)}</strong>
              </span>
            )}
            {matBd.beddingSandCost > 0 && (
              <span>
                Bedding Sand: <strong>{fmt2(matBd.beddingSandCost)}</strong>
              </span>
            )}
            {matBd.jointSandCost > 0 && (
              <span>
                Joint Sand: <strong>{fmt2(matBd.jointSandCost)}</strong>
              </span>
            )}
            {matBd.polySandCost > 0 && (
              <span>
                Poly Sand: <strong>{fmt2(matBd.polySandCost)}</strong>
              </span>
            )}
            {matBd.polySandExistingCost > 0 && (
              <span>
                Poly Sand (Existing): <strong>{fmt2(matBd.polySandExistingCost)}</strong>
              </span>
            )}
            {matBd.sealerMatCost > 0 && (
              <span>
                Sealer: <strong>{fmt2(matBd.sealerMatCost)}</strong>
              </span>
            )}
            {matBd.restraintMatCost > 0 && (
              <span>
                Restraint Concrete: <strong>{fmt2(matBd.restraintMatCost)}</strong>
              </span>
            )}
            {matBd.sleevesMatCost > 0 && (
              <span>
                Sleeves: <strong>{fmt2(matBd.sleevesMatCost)}</strong>
              </span>
            )}
            {matBd.palletCost > 0 && (
              <span>
                Pallet Charges ({matBd.totalPallets}): <strong>{fmt2(matBd.palletCost)}</strong>
              </span>
            )}
            {matBd.deliveryCost > 0 && (
              <span>
                Delivery: <strong>{fmt2(matBd.deliveryCost)}</strong>
              </span>
            )}
            {matBd.shipping > 0 && (
              <span>
                Shipping: <strong>{fmt2(matBd.shipping)}</strong>
              </span>
            )}
            {matBd.salesTaxCost > 0 && (
              <span>
                Sales Tax: <strong>{fmt2(matBd.salesTaxCost)}</strong>
              </span>
            )}
            {matBd.manualMat > 0 && (
              <span>
                Manual: <strong>{fmt2(matBd.manualMat)}</strong>
              </span>
            )}
          </div>
          <p className="mt-2 pt-2 border-t border-gray-200 font-semibold text-gray-800">
            Total Materials: {fmt2(matBd.totalMat)}
          </p>
        </div>
      )}

      {/* ── GPMD Summary Bar ─────────────────────────────────────────────────── */}

      {/* ── Actions ───────────────────────────────────────────────────────────── */}
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
