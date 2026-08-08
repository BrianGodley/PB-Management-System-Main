import WorkTypeChooser from './WorkTypeChooser'
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
import RateEditPopover from '../RateEditPopover'
import { fetchSalesTaxRate } from '../../lib/companyDefaults'
import { calcWalkAccessLabor, DEFAULT_WALK_ACCESS_PACE_LF_PER_MIN } from '../../lib/walkAccess'
import { catalogItemFor, catalogOptions, fetchModuleCatalog, fetchStandardRateMap } from '../../lib/materialCatalog'

const CATALOG_OPTS = { houseRows: 'exclude', stripPrefix: true }

// ── Demo method rates (tons/hr) — DemoRatesTurf lookup table ────────────────
const DEMO_METHODS = [
  {
    key: 'Skid Steer Good',
    label: 'Skid Steer (Good)',
    matKey: 'Turf - Demo Skid Steer Good',
    fallback: 2.0,
  },
  {
    key: 'Skid Steer OK',
    label: 'Skid Steer (OK)',
    matKey: 'Turf - Demo Skid Steer OK',
    fallback: 1.5,
  },
  {
    key: 'Mini Skid Steer',
    label: 'Mini Skid Steer',
    matKey: 'Turf - Demo Mini Skid Steer',
    fallback: 0.75,
  },
  { key: 'Wheelbarrow', label: 'Wheelbarrow', matKey: 'Turf - Demo Wheelbarrow', fallback: 0.5 },
  { key: 'Hand', label: 'Hand', matKey: 'Turf - Demo Hand', fallback: 0.38 },
]

// ── Demo row types — each has its dump fee key ────────────────────────────────
const DEMO_ROWS = [
  { key: 'concrete', label: 'Concrete', dumpKey: 'Dump Fee - Concrete', dumpFallback: 36.21 },
  { key: 'soil', label: 'Soil', dumpKey: 'Dump Fee - Dirt', dumpFallback: 36.21 },
  { key: 'lawn', label: 'Lawn', dumpKey: 'Dump Fee - Green Waste', dumpFallback: 72.19 },
]

// Turf brands are no longer a hardcoded list — they live in the catalog as
// products (category 'Artificial Turf', sub_category 'Turf Material'). See
// turfBrandOptions / turfBrandRow below.

// ── Rate defaults (DB fallbacks) ──────────────────────────────────────────────
const RATE_DEFAULTS = {
  // Labor rates
  baseInstallRate: 0.25, // hrs/10SF (BaseTurfRate) — hrs = (SF/10)*0.25
  baseSFPerHr: 10, // SF unit for base (BaseTurfSfPerHr)
  turfSFHr: 20, // SF/hr layout (TurfSFHr)
  turfPH: 0.5, // person-hours multiplier (TurfPH)
  turfCutSFHr: 100, // LF/hr for cut/staple/seam (TurfCutSfHr)
  turfCutRate: 1.0, // PH for cut/staple/seam (TurfCutRate)
  stripLFHr: 12.5, // LF/hr for narrow/custom strips — equals legacy (LF/100)*8

  weedFabricHrPer1kSF: 8, // hrs per 1000 SF for weed fabric — (SF/1000)*8
  // Material rates
  gravelBase: 6.9, // $/ton (Gravel Base — $6.90/ton)
  dgBase: 57.5, // $/ton (DG Base)
  weedFabric: 165.0, // $/roll (per 1800 SF)
  installMaterials: 0.14, // $/LF (staples $0.029 + seam $0.050 + nails $0.061 per SF, × LF)
  infillDurafill: 0.62, // $/SF (TurfInfillSF)
  infillZeoFill: 30.0, // $/bag (per 30 SF)
  // Pricing factors — from Excel Module #1 O3/O4
  laborBurden: 0.29, // 29% burden on labor cost (Module #1 O4)
  commissionRate: 0.12, // 12% commission on gross profit (Module #1 O3 = Comm)
}

// ── Calculation engine ────────────────────────────────────────────────────────
const n = v => parseFloat(v) || 0

// ── Vendor catalog: material-only price override ─────────────────────────────
// The Type (turf brand / base material) still sets the item and its House price;
// a real vendor only overrides the MATERIAL price for that item (matched by
// label in the vendor's catalog), never labor.
const TURF_CAT = { base: 'Turf Base', turf: 'Turf Material' }
// Base-install material picker options. Each computes qty differently:
// Gravel/DG are priced per ton, Weed per roll. Vendor overrides material price
// only (matched by label); labor is per-material preset math.
const BASE_MATERIALS = [
  { key: 'Gravel', label: '2" Gravel Base', matKey: 'Turf - Gravel Base', fallbackKey: 'gravelBase', qtyUnit: 't' },
  { key: 'DG', label: '1" DG Base', matKey: 'Turf - DG Base', fallbackKey: 'dgBase', qtyUnit: 't' },
  { key: 'Weed', label: 'Weed Barrier Fabric', matKey: 'Turf - Weed Barrier Fabric', fallbackKey: 'weedFabric', qtyUnit: 'roll' },
]
function turfMatPrice(cat, vendorSel, typeLabel, houseName, houseFallback, materialRows, catDefaults, mp) {
  const vsel = vendorSel && vendorSel !== 'auto' ? vendorSel : catDefaults?.[cat] || 'House'
  const vrow = catalogItemFor(materialRows, cat, vsel, typeLabel, {
    ...CATALOG_OPTS,
    fallbackFirst: false,
  })
  if (vrow) return { price: n(vrow.unit_cost), dbName: vrow.name }
  return { price: n(mp[houseName]) || houseFallback, dbName: houseName }
}

// Turf brands live entirely in the catalog now (category 'Artificial Turf',
// sub_category 'Turf Material'). One product row per brand = one id; a vendor
// that quotes differently is a price tag on that same id, never a new row.
//   turfBrandOptions → the standard products for the picker ({id, label, row}).
//   turfBrandRow     → resolve a saved selection (row id, or a legacy key/label)
//                      to its row, preferring a vendor-specific row over standard.
function turfBrandOptions(materialRows) {
  return catalogOptions(materialRows, TURF_CAT.turf, 'House', {
    houseRows: 'null-vendor',
    stripPrefix: true,
  })
}
function turfBrandRow(materialRows, vendorSel, key) {
  return (
    catalogItemFor(materialRows, TURF_CAT.turf, vendorSel, key, {
      houseRows: 'null-vendor',
      stripPrefix: true,
      fallbackFirst: false,
    }) ||
    catalogItemFor(materialRows, TURF_CAT.turf, 'House', key, {
      houseRows: 'null-vendor',
      stripPrefix: true,
      fallbackFirst: true,
    })
  )
}

function calcTurf(
  state,
  laborRatePerHour,
  materialPrices,
  laborRates,
  gpmd = 425,
  walkAccess = null,
  laborBurdenPct = 0.29,
  subRates = {},
  materialRows = [],
  catDefaults = {}
) {
  const _pace = parseFloat(walkAccess?.paceLfPerMin) || DEFAULT_WALK_ACCESS_PACE_LF_PER_MIN
  const mp = materialPrices || {}
  const lr = laborRates || {}
  const lrph = n(laborRatePerHour) || 35
  const hrsAdj = n(state.hoursAdj)
  const distanceLF = n(state.distanceLF) // avg distance truck to work area

  // ── Subcontractor tab ──────────────────────────────────────────────────────
  // On the Sub tab, turf install + strips become flat sub costs (SF/LF based,
  // no labor hours). Rates come from subcontractor_rates (category 'Artificial
  // Turf'), keyed by company_name.
  const isSub = state.subType === 'Subcontractor'
  const subInstallPerSF = subRates['Turf Sub - Install Per SF'] ?? 3
  const subStripPerLF = subRates['Turf Sub - Strip Per LF'] ?? 10

  // Look up demo method rate (tons/hr) for each demo row
  function demoRate(method) {
    const m = DEMO_METHODS.find(x => x.key === method)
    return n(lr[m?.matKey]) || m?.fallback || 2.0
  }

  // ── Demo section ──────────────────────────────────────────────────────────
  let demoHrs = 0,
    demoMat = 0
  const demoCalc = DEMO_ROWS.map(row => {
    const sf = n(state.demo[row.key]?.sf)
    const inches = n(state.demo[row.key]?.inches) || 4
    const method = state.demo[row.key]?.method || 'Skid Steer Good'
    const rate = demoRate(method)
    const dumpRate = n(mp[row.dumpKey]) || row.dumpFallback
    const tons = sf > 0 ? (sf / 200) * inches : 0
    const hrs = tons > 0 ? tons / rate : 0
    const mat = tons * dumpRate
    demoHrs += hrs
    demoMat += mat
    return { sf, inches, method, rate, tons, hrs, mat, dumpRate }
  })

  // Total turf SF comes from demo concrete row (K8 = K9 = K10 = same area)
  // Use the largest demo SF entered, or default to concrete row
  const turfAreaSF = Math.max(...DEMO_ROWS.map(r => n(state.demo[r.key]?.sf))) || 0

  // ── Base installation ─────────────────────────────────────────────────────
  // Rows: pick a material (Gravel/DG priced per ton, Weed per roll); Vendor
  // overrides the material price only. Labor is per-material preset math.
  //   Gravel: tons=(SF/200)*2, hrs=(SF/baseSFPerHr)*baseInstallRate
  //   DG:     tons=(SF*(1/12))/27, hrs handled by walk-access penalty (0 here)
  //   Weed:   rolls=ceil(SF/1800), hrs=(SF/1000)*weedFabricHrPer1kSF
  let baseHrs = 0,
    baseMat = 0
  const baseCalc = (state.baseRows || []).map(row => {
    const def = BASE_MATERIALS.find(m => m.key === row.material) || BASE_MATERIALS[0]
    const sf = n(row.sf) || turfAreaSF
    const price = turfMatPrice(
      TURF_CAT.base,
      row.vendor,
      def.label,
      def.matKey,
      RATE_DEFAULTS[def.fallbackKey],
      materialRows,
      catDefaults,
      mp
    ).price
    let qty = 0,
      hrs = 0
    if (def.key === 'Gravel') {
      qty = sf > 0 ? (sf / 200) * 2 : 0
      hrs = sf > 0 ? (sf / RATE_DEFAULTS.baseSFPerHr) * RATE_DEFAULTS.baseInstallRate : 0
    } else if (def.key === 'DG') {
      qty = sf > 0 ? (sf * (1 / 12)) / 27 : 0
      hrs = 0
    } else {
      qty = sf > 0 ? Math.ceil(sf / 1800) : 0
      hrs = sf > 0 ? (sf / 1000) * RATE_DEFAULTS.weedFabricHrPer1kSF : 0
    }
    const mat = qty * price
    baseHrs += hrs
    baseMat += mat
    return { material: def.key, label: def.label, qtyUnit: def.qtyUnit, sf: n(row.sf), qty, hrs, mat, price }
  })

  // On the Sub tab there is no Base Installation section — the subcontractor's
  // flat SF/LF pricing is all-in — so base labor + material never apply.
  if (isSub) {
    baseHrs = 0
    baseMat = 0
  }

  // ── Turf installation (up to 3 rolls of 15' wide) ─────────────────────────
  // hrs = SF/TurfSFHr * TurfPH = SF/20 * 0.5
  const turfSFHr = n(lr['Turf - Turf Install SF/hr']) || RATE_DEFAULTS.turfSFHr
  const turfPH = RATE_DEFAULTS.turfPH
  let turfHrs = 0,
    turfMat = 0,
    totalEdgeLF = 0,
    subTurfCost = 0

  const rollCalc = state.rolls.map(roll => {
    const edgeLF = n(roll.edgeLF)
    const installSF = n(roll.installSF)
    const brandRow = turfBrandRow(materialRows, roll.vendor, roll.brand)
    const pricePerSF = n(brandRow?.unit_cost)
    // In-house derives SF from the 15' roll edge; the Sub tab uses the
    // installed SF the estimator enters directly.
    const sf = isSub ? installSF : edgeLF * 15
    const hrs = !isSub && sf > 0 ? (sf / turfSFHr) * turfPH : 0
    const mat = isSub ? 0 : sf * pricePerSF
    // All-in sub cost for this roll: (sub install $/SF + material $/SF) × SF.
    const rowSubCost = installSF * (subInstallPerSF + pricePerSF)
    turfHrs += hrs
    turfMat += mat
    totalEdgeLF += edgeLF
    subTurfCost += rowSubCost
    return { edgeLF, installSF, sf, brand: roll.brand, pricePerSF, hrs, mat, rowSubCost }
  })

  // ── Turf Strips (row 20-21) ───────────────────────────────────────────────
  // Narrow/custom cut strips — separate from the 15' wide rolls.
  // Labor: hrs = (LF / 100) * 8  — Excel R20=(E21/100)*8
  // Material: brand $/SF × (LF × width ft)  — Excel S20=O20*Q20 (manual inputs)
  const stripsLF = n(state.strips?.lf)
  const stripsWidthIn = n(state.strips?.widthIn) || 12
  const stripsBrandRow = turfBrandRow(materialRows, state.strips?.vendor, state.strips?.brand)
  const stripsPrice = n(stripsBrandRow?.unit_cost)
  const stripsSF = stripsLF * (stripsWidthIn / 12)
  // Labor rate is DB-editable (LF/hr). Legacy (LF/100)*8 == LF/12.5.
  const stripLFHr = n(lr['Turf - Strip Install LF/hr']) || RATE_DEFAULTS.stripLFHr
  const stripsHrs = !isSub && stripsLF > 0 && stripLFHr > 0 ? stripsLF / stripLFHr : 0
  const stripsMat = isSub ? 0 : stripsPrice * stripsSF
  // Sub strips: flat $/LF sub install + brand material $/SF.
  const subStripsCost = stripsLF * subStripPerLF + stripsPrice * stripsSF

  // ── Cut, Staple & Seam ────────────────────────────────────────────────────
  // hrs = (totalLF / TurfCutSfHr) * TurfCutRate = (totalLF/100)*1.0
  // mat = installMaterials ($/LF) × totalLF  — matches Excel S18=O18*Q18
  const installMatPerLF = n(mp['Turf - Install Materials']) || RATE_DEFAULTS.installMaterials
  const cutHrs =
    !isSub && totalEdgeLF > 0
      ? (totalEdgeLF / RATE_DEFAULTS.turfCutSFHr) * RATE_DEFAULTS.turfCutRate
      : 0
  // On the Sub tab cut/seam material rolls into the sub cost bucket instead of
  // in-house material.
  const subCutMat = installMatPerLF * totalEdgeLF
  const cutMat = isSub ? 0 : installMatPerLF * totalEdgeLF

  // ── Infill ────────────────────────────────────────────────────────────────
  // Excel uses K8 (base gravel SF) directly for infill quantity — NOT the demo SF.
  // When no demo rows are entered, turfAreaSF = 0 but infill still applies to the
  // installed base area. Fall back to base SF so infill always calculates.
  // ZeoFill (pet): $30/bag, bags=ceil(SF/30)
  // Standard Durafill: $0.62/SF
  const infillAreaSF =
    turfAreaSF || (state.baseRows || []).reduce((m, r) => Math.max(m, n(r.sf)), 0)
  let infillMat = 0
  if (!isSub && infillAreaSF > 0) {
    if (state.useZeoFill) {
      const bags = Math.ceil(infillAreaSF / 30)
      infillMat = bags * (n(mp['Turf - Infill ZeoFill']) || RATE_DEFAULTS.infillZeoFill)
    } else {
      infillMat = infillAreaSF * (n(mp['Turf - Infill Durafill']) || RATE_DEFAULTS.infillDurafill)
    }
  }

  // ── Manual entry ─────────────────────────────────────────────────────────
  const manualFiltered = (state.manualRows || []).filter(
    r => n(r.hours) > 0 || n(r.materials) > 0 || n(r.subCost) > 0
  )
  const manualHrs = manualFiltered.reduce((s, r) => s + n(r.hours), 0)
  const manualMat = manualFiltered.reduce((s, r) => s + n(r.materials), 0)
  const manualSub = manualFiltered.reduce((s, r) => s + n(r.subCost), 0)

  // ── Totals ────────────────────────────────────────────────────────────────
  const rawHrs = baseHrs + turfHrs + stripsHrs + cutHrs + manualHrs
  const diffHrs = (rawHrs * n(state.difficulty)) / 100
  const _preWalkHrs = rawHrs + diffHrs + hrsAdj
  const walkHrs = calcWalkAccessLabor(_preWalkHrs, distanceLF, { paceLfPerMin: _pace })
  const totalHrs = _preWalkHrs + walkHrs
  const totalMat = baseMat + turfMat + stripsMat + cutMat + infillMat + manualMat
  const subCost = manualSub + (isSub ? subTurfCost + subStripsCost + subCutMat : 0)

  const manDays = totalHrs / 8
  const laborCost = totalHrs * lrph
  const burden = laborCost * (n(laborBurdenPct) || RATE_DEFAULTS.laborBurden) // burden % — company setting, fallback Excel Module #1 O4
  const gp = manDays * gpmd
  const commission = gp * RATE_DEFAULTS.commissionRate // 12% of GP — Excel Module #1 O3
  const price = laborCost + burden + totalMat + gp + commission + subCost

  return {
    walkHrs,
    totalHrs,
    manDays,
    laborCost,
    burden,
    totalMat,
    subCost,
    gp,
    commission,
    price,
    infillAreaSF,
    demoCalc,
    turfAreaSF,
    baseCalc,
    rollCalc,
    totalEdgeLF,
    turfHrs,
    turfSFHr,
    turfMat,
    stripsLF,
    stripsWidthIn,
    stripsSF,
    stripsHrs,
    stripLFHr,
    stripsMat,
    stripsPrice,
    cutHrs,
    cutMat,
    subCutMat,
    infillMat,
    demoHrs,
    baseHrs,
    rawHrs,
    diffHrs,
    isSub,
    subTurfCost,
    subStripsCost,
    subInstallPerSF,
    subStripPerLF,
  }
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
  baseRows: [
    { material: 'Gravel', sf: '', vendor: 'House' },
    { material: 'DG', sf: '', vendor: 'House' },
    { material: 'Weed', sf: '', vendor: 'House' },
  ],
  useZeoFill: false,
  rolls: [
    { brand: 'Socal Blen Supreme 80', edgeLF: '', vendor: 'House' },
    { brand: 'Socal Blen Supreme 80', edgeLF: '', vendor: 'House' },
    { brand: 'Socal Blen Supreme 80', edgeLF: '', vendor: 'House' },
  ],
  strips: { lf: '', widthIn: '12', brand: 'Socal Blen Supreme 80', vendor: 'House' },
  manualRows: [
    { label: '', hours: '', materials: '', subCost: '' },
    { label: '', hours: '', materials: '', subCost: '' },
    { label: '', hours: '', materials: '', subCost: '' },
  ],
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
    strips: { ...d.strips, ...(src.strips || {}) },
    manualRows: (src.manualRows || d.manualRows).map(r => ({ ...r })),
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
function Sel({ value, onChange, options, optionLabels }) {
  return (
    <select
      value={value}
      onChange={onChange}
      className="w-full border border-gray-200 rounded-md px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-400"
    >
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
      <tr className="text-left text-gray-400 border-b border-gray-100 text-xs">
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
        b.useGravel !== false && { material: 'Gravel', sf: b.gravelSF || '', vendor: b.gravelVendor || 'House' },
        b.useDG !== false && { material: 'DG', sf: b.dgSF || '', vendor: b.dgVendor || 'House' },
        b.useWeedFabric !== false && { material: 'Weed', sf: b.weedSF || '', vendor: b.weedVendor || 'House' },
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
  const [vendors, setVendors] = useState([])
  const [laborRatePerHour, setLaborRatePerHour] = useState(initialData?.laborRatePerHour ?? 35)
  const [laborBurdenPct, setLaborBurdenPct] = useState(initialData?.laborBurdenPct ?? 0.29)
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
    const [matMap, labRes, subRes, rows, venRes] = await Promise.all([
      fetchStandardRateMap(['Artificial Turf', 'Demo']),
      supabase.from('labor_rates').select('name, rate').eq('category', 'Artificial Turf'),
      supabase
        .from('subcontractor_rates')
        .select('company_name, rate')
        .eq('category', 'Artificial Turf'),
      fetchModuleCatalog(['Artificial Turf']),
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
        m[r.company_name] = parseFloat(r.rate) || 0
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
    if (initialData?.materialPrices && initialData?.laborRatePerHour) return
    let gone = false
    ;(async () => {
      await Promise.all([
        !initialData?.laborRatePerHour &&
          supabase
            .from('company_settings')
            .select('labor_rate_per_hour, labor_burden_pct, walk_access_pace_lf_per_min')
            .single()
            .then(({ data }) => {
              if (!gone && data?.labor_rate_per_hour)
                setLaborRatePerHour(parseFloat(data.labor_rate_per_hour) || 35)
              if (!gone && data?.labor_burden_pct != null)
                setLaborBurdenPct(parseFloat(data.labor_burden_pct))
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
            baseRows: [...(cur.baseRows || []), { material: 'Gravel', sf: '', vendor: 'House' }],
          },
        }
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
  const setStrips = useCallback(
    (field, val) =>
      setState(p => {
        const k = tabKey(p)
        const cur = p[k]
        return { ...p, [k]: { ...cur, strips: { ...cur.strips, [field]: val } } }
      }),
    []
  )

  const gpmd = initialData?.gpmd ?? 425
  const subGpMarkupRate = initialData?.subGpMarkupRate ?? 0.2

  // ── Vendor catalog helpers (material-only per-line Vendor pickers) ────────
  const vendorsForCategory = cat => vendors.filter(v => materialRows.some(r => r.vendor_id === v.id && (r.sub_category === cat || r.category === cat)))
  // A vendor belongs in a SECTION's dropdown only if they actually price a product
  // under that section's marker (not just somewhere in the category). Standard is
  // always offered via the <option value="House">Standard</option> in each select.
  const vendorsSupplyingMarker = marker => {
    const ids = new Set(
      (materialRows || []).filter(r => r.sub_category === marker && r.vendor_id).map(r => r.vendor_id)
    )
    return vendors.filter(v => ids.has(v.id))
  }
  const catDefaults = {} // Turf defaults to House; a real vendor is an explicit pick.

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
    catDefaults
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
  const num = 'py-1.5 pr-2 text-gray-600 tabular-nums text-xs align-top'
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
          price: calc.price,
          turfAreaSF: calc.turfAreaSF,
        },
      },
    })
  }

  return (
    <SubTabContext.Provider value={isSub}>
    <div className="space-y-4">
      {/* ── Sticky GPMD bar ── */}
      <div className="sticky top-0 z-20 -mx-6 px-6 pt-1 pb-1 bg-gray-900 shadow-lg">
        {/* GPMD summary bar */}
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


      <WorkTypeChooser value={state.subType || 'In-House'} onChange={v => set('subType', v)} />

      {/* Crew Type */}
      <div className="flex items-center gap-3 bg-gray-50 rounded-lg px-4 py-2.5 border border-gray-200">
        <label className="text-sm font-medium text-gray-700 whitespace-nowrap">Crew Type</label>
        <select
          value={state.crewType}
          onChange={e => set('crewType', e.target.value)}
          className="input text-sm py-1 w-36"
        >
          <option value="Demo">Demo</option>
          <option value="Landscape">Landscape</option>
          <option value="Masonry">Masonry</option>
          <option value="Paver">Paver</option>
          <option value="Specialty">Specialty</option>
        </select>
      </div>
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
        <SecHdr title="Base Installation" />
        <div className="text-xs text-gray-500 mb-2 italic">
          Enter the turf area square footage.
        </div>
        <table className="w-full text-xs">
          <TH
            cols={[
              { label: 'Vendor', w: 'w-28' },
              { label: 'Material' },
              { label: 'Sq Ft', w: 'w-20' },
              { label: 'Qty', w: 'w-16' },
              { label: 'Hrs', w: 'w-16' },
              { label: 'Material', w: 'w-24' },
              { label: '', w: 'w-8' },
            ]}
          />
          <tbody className="divide-y divide-gray-50">
            {(T.baseRows || []).map((row, i) => {
              const def = BASE_MATERIALS.find(m => m.key === row.material) || BASE_MATERIALS[0]
              const bc = calc.baseCalc?.[i] || {}
              const unitLabel = def.qtyUnit === 'roll' ? 'roll' : 'ton'
              const rate = n(materialPrices[def.matKey] || RATE_DEFAULTS[def.fallbackKey])
              return (
                <tr key={i}>
                  <td className={td}>
                    <select
                      className="w-full border border-gray-200 rounded-md px-2 py-1.5 text-xs bg-white"
                      value={row.vendor || 'House'}
                      onChange={e => setBaseRow(i, 'vendor', e.target.value)}
                      title="Vendor"
                    >
                      {vendorsSupplyingMarker(TURF_CAT.base).map(v => (
                        <option key={v.id} value={v.id}>
                          {v.name}
                        </option>
                      ))}
                      <option value="House">Standard</option>
                    </select>
                  </td>
                  <td className={td}>
                    <div className="flex items-center gap-1">
                      <select
                        className="w-full border border-gray-200 rounded-md px-2 py-1.5 text-xs bg-white"
                        value={row.material}
                        onChange={e => setBaseRow(i, 'material', e.target.value)}
                        title="Material"
                      >
                        {BASE_MATERIALS.map(m => (
                          <option key={m.key} value={m.key}>
                            {m.label}
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
                    />
                  </td>
                  <td className={num}>
                    {bc.qty > 0
                      ? def.qtyUnit === 'roll'
                        ? `${bc.qty} ${bc.qty === 1 ? 'roll' : 'rolls'}`
                        : `${bc.qty.toFixed(2)} t`
                      : '—'}
                  </td>
                  <td className={num}>{bc.hrs > 0 ? fh(bc.hrs) : '—'}</td>
                  <td className={num}>{bc.mat > 0 ? fmt2(bc.mat) : '—'}</td>
                  <td className={num}>
                    {(T.baseRows || []).length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeBaseRow(i)}
                        className="text-gray-300 hover:text-red-500"
                        title="Remove row"
                      >
                        ×
                      </button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        <button
          type="button"
          onClick={addBaseRow}
          className="mt-2 text-xs text-blue-600 hover:text-blue-700 font-medium"
        >
          ＋ Add base material
        </button>

        {/* ZeoFill toggle */}
        <div className="mt-3 flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          <Toggle
            checked={T.useZeoFill}
            onChange={v => setT('useZeoFill', v)}
            label="ZeoFill Pet Odor Infill (upgrade)"
          />
          <span className="text-xs text-amber-700 ml-auto inline-flex items-center gap-1">
            {T.useZeoFill ? (
              <>
                {Math.ceil(calc.infillAreaSF / 30)} bags @ $
                {n(materialPrices['Turf - Infill ZeoFill'] || RATE_DEFAULTS.infillZeoFill).toFixed(
                  2
                )}
                /bag
              </>
            ) : (
              <>
                Durafill @ $
                {n(
                  materialPrices['Turf - Infill Durafill'] || RATE_DEFAULTS.infillDurafill
                ).toFixed(2)}
                /SF
              </>
            )}
          </span>
        </div>
      </div>
      )}

      {/* Turf Installation */}
      <div>
        <SecHdr title="Turf Installation (15' Wide Rolls)" />
        <div className="text-xs text-gray-400 mb-2">
          {calc.isSub ? (
            <>
              Flat subcontractor install: <span className="text-gray-500">${calc.subInstallPerSF}/SF</span>{' '}
              + brand material ($/SF). Enter the installed square footage per brand.
            </>
          ) : (
            <>
              Each row edits both rates: <span className="text-gray-500">material</span> ($/SF, per
              brand) and <span className="text-gray-500">install labor</span> ({calc.turfSFHr} SF/hr,
              shared).
            </>
          )}
        </div>
        <table className="w-full text-xs">
          <TH
            cols={
              calc.isSub
                ? [
                    { label: 'Vendor', w: 'w-28' },
                    { label: 'Turf Brand' },
                    { label: 'Install SF', w: 'w-24' },
                    { label: 'Edge LF', w: 'w-20' },
                    { label: 'Material', w: 'w-24' },
                  ]
                : [
                    { label: 'Vendor', w: 'w-28' },
                    { label: 'Turf Brand' },
                    { label: 'Edge LF', w: 'w-20' },
                    { label: 'Sq Ft', w: 'w-20' },
                    { label: 'Hrs', w: 'w-16' },
                    { label: 'Material', w: 'w-24' },
                  ]
            }
          />
          <tbody className="divide-y divide-gray-50">
            {T.rolls.map((roll, i) => {
              const cr = calc.rollCalc[i]
              const brandRow = turfBrandRow(materialRows, roll.vendor, roll.brand)
              return (
                <tr key={i}>
                  <td className={td}>
                    <select
                      className="w-full border border-gray-200 rounded-md px-2 py-1.5 text-xs bg-white"
                      value={roll.vendor || 'House'}
                      onChange={e => setRoll(i, 'vendor', e.target.value)}
                      title="Vendor"
                    >
                      {vendorsSupplyingMarker(TURF_CAT.turf).map(v => (
                        <option key={v.id} value={v.id}>
                          {v.name}
                        </option>
                      ))}
                      <option value="House">Standard</option>
                    </select>
                  </td>
                  <td className={td}>
                    <div className="flex items-center gap-1">
                      <div className="flex-1 min-w-0">
                        <Sel
                          value={brandRow?.id || roll.brand}
                          onChange={e => setRoll(i, 'brand', e.target.value)}
                          options={brandKeys}
                          optionLabels={brandLabels}
                        />
                      </div>
                      {calc.isSub ? (
                        <RateEditPopover
                          table="subcontractor_rates"
                          name="Turf Sub - Install Per SF"
                          category="Artificial Turf"
                          unitLabel="/SF"
                          currentValue={calc.subInstallPerSF}
                          onSaved={refreshAllRates}
                        />
                      ) : (
                        <RateEditPopover
                          table="labor_rates"
                          name="Turf - Turf Install SF/hr"
                          category="Artificial Turf"
                          mode="coefficient"
                          unitLabel="SF/hr"
                          currentValue={calc.turfSFHr}
                          onSaved={refreshAllRates}
                        />
                      )}
                    </div>
                  </td>
                  {calc.isSub ? (
                    <>
                      <td className={td}>
                        <Inp
                          value={roll.installSF || ''}
                          onChange={e => setRoll(i, 'installSF', e.target.value)}
                        />
                      </td>
                      <td className={td}>
                        <Inp
                          value={roll.edgeLF}
                          onChange={e => setRoll(i, 'edgeLF', e.target.value)}
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
                        />
                      </td>
                      <td className={num}>{cr.sf > 0 ? cr.sf.toLocaleString() : '—'}</td>
                      <td className={num}>{fh(cr.hrs)}</td>
                      <td className={num}>{cr.mat > 0 ? fmt2(cr.mat) : '—'}</td>
                    </>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>

        {/* Cut, Staple & Seam — auto-calculated */}
        {calc.totalEdgeLF > 0 && (
          <div className="mt-2 bg-gray-50 rounded-lg px-3 py-2 text-xs flex justify-between">
            <span className="text-gray-600 font-medium inline-flex items-center gap-1">
              Cut, Staple &amp; Seam
              <span className="text-gray-400 font-normal ml-1">({calc.totalEdgeLF} LF total)</span>
            </span>
            <div className="flex gap-4">
              {!calc.isSub && <span className="text-gray-700">{fh(calc.cutHrs)} hrs</span>}
              <span className="text-gray-700">
                {fmt2(calc.isSub ? calc.subCutMat : calc.cutMat)} {calc.isSub ? 'sub' : 'mat'}
              </span>
            </div>
          </div>
        )}

        {/* Infill — auto-calculated from base area */}
        {calc.infillAreaSF > 0 && (
          <div className="mt-1 bg-gray-50 rounded-lg px-3 py-2 text-xs flex justify-between">
            <span className="text-gray-600 font-medium">
              {T.useZeoFill ? 'ZeoFill Pet Infill' : 'Durafill Infill'}
              <span className="text-gray-400 font-normal ml-2">
                ({calc.infillAreaSF.toLocaleString()} SF)
              </span>
            </span>
            <span className="text-gray-700">{fmt2(calc.infillMat)}</span>
          </div>
        )}
      </div>

      {/* Turf Strips */}
      <div>
        <SecHdr title="Turf Strips (Narrow / Custom Cuts)" />
        <div className="text-xs text-gray-500 mb-2 italic">
          {calc.isSub ? (
            <>
              For narrow strips that don't come off a standard 15' roll. Flat subcontractor rate:{' '}
              <span className="text-gray-600">${calc.subStripPerLF}/LF</span> + brand material ($/SF).
            </>
          ) : (
            <>
              For narrow strips that don't come off a standard 15' roll. Row edits both rates:{' '}
              <span className="text-gray-600">material</span> ($/SF, per brand) and{' '}
              <span className="text-gray-600">install labor</span> ({calc.stripLFHr} LF/hr).
            </>
          )}
        </div>
        <table className="w-full text-xs">
          <TH
            cols={
              calc.isSub
                ? [
                    { label: 'Vendor', w: 'w-28' },
                    { label: 'Turf Brand' },
                    { label: 'Length (LF)', w: 'w-24' },
                    { label: 'Width (in)', w: 'w-20' },
                    { label: 'Material', w: 'w-24' },
                  ]
                : [
                    { label: 'Vendor', w: 'w-28' },
                    { label: 'Turf Brand' },
                    { label: 'Length (LF)', w: 'w-24' },
                    { label: 'Width (in)', w: 'w-20' },
                    { label: 'Sq Ft', w: 'w-16' },
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
                  value={T.strips?.vendor || 'House'}
                  onChange={e => setStrips('vendor', e.target.value)}
                  title="Vendor"
                >
                  {vendorsSupplyingMarker(TURF_CAT.turf).map(v => (
                    <option key={v.id} value={v.id}>
                      {v.name}
                    </option>
                  ))}
                  <option value="House">Standard</option>
                </select>
              </td>
              <td className={td}>
                <div className="flex items-center gap-1">
                  <div className="flex-1 min-w-0">
                    <Sel
                      value={turfBrandRow(materialRows, T.strips?.vendor, T.strips?.brand)?.id || T.strips?.brand || brandKeys[0]}
                      onChange={e => setStrips('brand', e.target.value)}
                      options={brandKeys}
                      optionLabels={brandLabels}
                    />
                  </div>
                  {(() => {
                    const stripBrand = turfBrandRow(materialRows, T.strips?.vendor, T.strips?.brand)
                    return (
                      <>
                        {calc.isSub ? (
                          <RateEditPopover
                            table="subcontractor_rates"
                            name="Turf Sub - Strip Per LF"
                            category="Artificial Turf"
                            unitLabel="/LF"
                            currentValue={calc.subStripPerLF}
                            onSaved={refreshAllRates}
                          />
                        ) : (
                          <RateEditPopover
                            table="labor_rates"
                            name="Turf - Strip Install LF/hr"
                            category="Artificial Turf"
                            mode="coefficient"
                            unitLabel="LF/hr"
                            currentValue={calc.stripLFHr}
                            onSaved={refreshAllRates}
                          />
                        )}
                      </>
                    )
                  })()}
                </div>
              </td>
              <td className={td}>
                <Inp
                  value={T.strips?.lf || ''}
                  onChange={e => setStrips('lf', e.target.value)}
                />
              </td>
              <td className={td}>
                <Inp
                  value={T.strips?.widthIn || '12'}
                  onChange={e => setStrips('widthIn', e.target.value)}
                  placeholder="12"
                  step="1"
                />
              </td>
              {calc.isSub ? (
                <td className={num}>{calc.subStripsCost > 0 ? fmt2(calc.subStripsCost) : '—'}</td>
              ) : (
                <>
                  <td className={num}>
                    {calc.stripsSF > 0 ? calc.stripsSF.toLocaleString() : '—'}
                  </td>
                  <td className={num}>{fh(calc.stripsHrs)}</td>
                  <td className={num}>{calc.stripsMat > 0 ? fmt2(calc.stripsMat) : '—'}</td>
                </>
              )}
            </tr>
          </tbody>
        </table>
      </div>

      {/* Manual Entry */}
      <div>
        <SecHdr title="Manual Entry" />
        <table className="w-full text-xs">
          <TH
            cols={[
              { label: 'Description' },
              { label: 'Hours', w: 'w-20' },
              { label: 'Materials ($)', w: 'w-24' },
              { label: 'Sub Cost ($)', w: 'w-24' },
            ]}
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
                <td className={td}>
                  <Inp
                    value={r.hours}
                    onChange={e => setRow(i, 'hours', e.target.value)}
                    step="0.5"
                  />
                </td>
                <td className={td}>
                  <Inp
                    value={r.materials}
                    onChange={e => setRow(i, 'materials', e.target.value)}
                    step="1"
                  />
                </td>
                <td className={td}>
                  <Inp
                    value={r.subCost}
                    onChange={e => setRow(i, 'subCost', e.target.value)}
                    step="1"
                  />
                </td>
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
          <span className="font-medium text-gray-700">{calc.turfAreaSF.toLocaleString()} SF</span>
          <span>turf area</span>
          {calc.infillAreaSF !== calc.turfAreaSF && (
            <span className="text-gray-400">
              · {calc.infillAreaSF.toLocaleString()} SF infill base
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
          Save Module
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
