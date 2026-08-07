import WorkTypeChooser from './WorkTypeChooser'
import { useState, useEffect, useCallback, useContext } from 'react'
import { SubTabContext, subSectionTitle } from './subTabContext'
import { supabase } from '../../lib/supabase'
import GpmdBar from './GpmdBar'
import RateEditPopover from '../RateEditPopover'
import { fetchSalesTaxRate } from '../../lib/companyDefaults'
import { calcWalkAccessLabor, DEFAULT_WALK_ACCESS_PACE_LF_PER_MIN } from '../../lib/walkAccess'
import { useMaterialCatalog, resolveMaterialPrice } from '../../lib/materialCatalog'
import { groutCyPerBlock } from '../../lib/cmuGrout'

// ─────────────────────────────────────────────────────────────────────────────
// Columns Module — fields and calculations from Excel estimator (Columns Module tab)
// Column Install auto-calculates CMU blocks, rebar, footing, and fill from
// quantity, height, and width inputs.
// ─────────────────────────────────────────────────────────────────────────────

// dbName = name in material_rates (category = 'Columns')
// Hardcoded values are fallbacks when DB row is absent.
// subDbName / subFallback = flat Subcontractor $/SF price for the finish
// (Sub tab prices finishes as a single flat rate per SF — no in-house
//  material + labor breakdown). subFallback seeds a starting value.
const FINISH_TYPES = {
  'Sand Stucco': {
    costPerSF: 0,
    unit: 'SF',
    dbName: 'Sand Stucco',
    laborDbName: 'Sand Stucco - Labor Rate',
    laborHrsPerSF: 0.05,
    subDbName: 'Sand Stucco - Sub SF',
    subFallback: 0,
  },
  'Smooth Stucco': {
    costPerSF: 0,
    unit: 'SF',
    dbName: 'Smooth Stucco',
    laborDbName: 'Smooth Stucco - Labor Rate',
    laborHrsPerSF: 0.05,
    subDbName: 'Smooth Stucco - Sub SF',
    subFallback: 0,
  },
  'Ledgerstone Veneer Panels': {
    costPerSF: 10.0,
    unit: 'SF',
    dbName: 'Ledgerstone Veneer Panels',
    laborDbName: 'Ledgerstone Veneer Panels - Labor Rate',
    laborHrsPerSF: 0.1,
    subDbName: 'Ledgerstone Veneer Panels - Sub SF',
    subFallback: 0,
  },
  'Stacked Stone Veneer': {
    costPerSF: 10.0,
    unit: 'SF',
    dbName: 'Stacked Stone Veneer',
    laborDbName: 'Stacked Stone Veneer - Labor Rate',
    laborHrsPerSF: 0.1,
    subDbName: 'Stacked Stone Veneer - Sub SF',
    subFallback: 0,
  },
  Tile: {
    costPerSF: 6.5,
    unit: 'SF',
    dbName: 'Tile - Columns',
    laborDbName: 'Tile - Columns - Labor Rate',
    laborHrsPerSF: 0.125,
    subDbName: 'Tile - Columns - Sub SF',
    subFallback: 0,
  },
  'Real Flagstone, Flat': {
    costPerTon: 400.0,
    unit: 'ton',
    dbName: 'Real Flagstone Flat',
    laborDbName: 'Real Flagstone Flat - Labor Rate',
    laborHrsPer: 0.5,
    subDbName: 'Real Flagstone Flat - Sub SF',
    subFallback: 0,
  },
  'Real Stone': {
    costPerTon: 400.0,
    unit: 'ton',
    dbName: 'Real Stone - Columns',
    laborDbName: 'Real Stone - Columns - Labor Rate',
    laborHrsPer: 0.5,
    subDbName: 'Real Stone - Columns - Sub SF',
    subFallback: 0,
  },
}

const BLOCK_RATES = {
  blockMatCost: { dbName: 'CMU Block', fallback: 2.5 }, // $/block
  // Rebar now references the shared Basic Materials 'Rebar' row (canonical
  // $1.388/LF) so a vendor price change on rebar flows through here too.
  rebarMatCost: { dbName: 'Rebar', fallback: 1.388 }, // $/LF (Basic Materials)
  faceBlockMat: { dbName: 'Face Block', fallback: 3.0 }, // $/block (decorative)
  // Grout fill is now priced at the concrete rate by volume (block count ×
  // cu-ft/block ÷ 27 × concrete $/CY) via the shared Basic Materials concrete
  // row — see cmuGrout.js. fillMatCost (flat $/block) is retired.
  // Labor rates
  installLaborHrs: { dbName: 'CMU Install Labor', fallback: 0.083 }, // hrs per block (~5 min)
  excavateLaborHrs: { dbName: 'Excavate Footing Labor', fallback: 0.5 }, // hrs per column
  pourLaborHrs: { dbName: 'Pour Footing Labor', fallback: 0.25 }, // hrs per column
  fillLaborHrs: { dbName: 'Fill Labor', fallback: 0.05 }, // hrs per block
}

const DEFAULTS = {
  laborRatePerHour: 35,
  laborBurdenPct: 0.29,
  gpmd: 425,
  commissionRate: 0.12,
}

const n = v => parseFloat(v) || 0

const COLUMNS_CATEGORY = 'Columns'
// Shared cross-module catalog of basic materials (concrete, base, sand, rebar,
// grout). Columns resolves its rebar + grout concrete from here so vendor
// prices propagate.
const BASIC_CATEGORY = 'Basic Materials'
// Grout fill is priced at the concrete ready-mix rate (shared Basic Materials).
const GROUT_CONCRETE = { dbName: 'Concrete - Ready Mix (Truck)', fallback: 185 } // $/CY

// Vendor-resolved material price now comes from the shared resolver
// (src/lib/materialCatalog.js) — same order (vendor row → House name key →
// fallback), so Columns numbers are byte-for-byte unchanged.
const colMatPrice = resolveMaterialPrice

// ── Column geometry helpers ───────────────────────────────────────────────────
// Standard CMU blocks are 8"×8"×16" (face) or 8"×8"×8" (corner/half)
// We use 8" module for both dimensions.
function columnGeometry(heightIn, widthIn) {
  const courses = Math.ceil(n(heightIn) / 8) // 8" per course
  const blocksWide = Math.ceil(n(widthIn) / 8) // blocks per side
  const blocksPerCourse = blocksWide * blocksWide // solid column
  const totalBlocks = courses * blocksPerCourse
  const rebarLF = (n(heightIn) / 12) * (blocksWide > 1 ? 4 : 1) // LF rebar per column
  const footingArea = Math.pow(n(widthIn) / 12 + 1, 2) // SF (1 ft larger each side)
  return { courses, blocksWide, blocksPerCourse, totalBlocks, rebarLF, footingArea }
}

function calcColumns(
  state,
  laborRatePerHour = DEFAULTS.laborRatePerHour,
  materialPrices = {},
  gpmd = DEFAULTS.gpmd,
  walkAccess = null,
  laborBurdenPct = DEFAULTS.laborBurdenPct,
  materialRows = []
) {
  const _pace = parseFloat(walkAccess?.paceLfPerMin) || DEFAULT_WALK_ACCESS_PACE_LF_PER_MIN
  const { difficulty, hoursAdj, qty, heightIn, widthIn, finishRows, manualRows } = state
  const isSub = state.subType === 'Subcontractor'
  const installVendor = state.installVendor // section-level Vendor for Column Install materials

  // mp() = name-keyed House lookup (labor coefficients + House material fallback).
  // matP() = vendor-resolved MATERIAL price; with vendor 'House'/empty it returns
  // exactly (materialPrices[dbName] ?? fallback) == the pre-vendor mp() value.
  const mp = (dbName, fallback) => materialPrices[dbName] ?? fallback
  const matP = (dbName, fallback, vendorId) =>
    colMatPrice(dbName, vendorId, materialRows, materialPrices, fallback)

  let installHrs = 0,
    installMat = 0

  if (n(qty) > 0 && n(heightIn) > 0 && n(widthIn) > 0) {
    const geo = columnGeometry(heightIn, widthIn)
    const totalBlocks = geo.totalBlocks * n(qty)
    const totalRebar = geo.rebarLF * n(qty)

    // Material costs — unit prices resolve through the section Vendor.
    // Grout fill = block count × cu-ft/block ÷ 27 × concrete $/CY (columns are
    // solid-grouted 8x8x16 → 0.5 cu ft/block). Concrete rate is the shared
    // Basic Materials row, so vendor price changes propagate.
    const groutCY = totalBlocks * groutCyPerBlock(8, 8)
    installMat +=
      totalBlocks * matP(BLOCK_RATES.blockMatCost.dbName, BLOCK_RATES.blockMatCost.fallback, installVendor) +
      groutCY * matP(GROUT_CONCRETE.dbName, GROUT_CONCRETE.fallback, installVendor) +
      totalRebar * matP(BLOCK_RATES.rebarMatCost.dbName, BLOCK_RATES.rebarMatCost.fallback, installVendor)

    // Labor hours
    installHrs +=
      n(qty) * mp(BLOCK_RATES.excavateLaborHrs.dbName, BLOCK_RATES.excavateLaborHrs.fallback) +
      n(qty) * mp(BLOCK_RATES.pourLaborHrs.dbName, BLOCK_RATES.pourLaborHrs.fallback) +
      totalBlocks * mp(BLOCK_RATES.installLaborHrs.dbName, BLOCK_RATES.installLaborHrs.fallback) +
      totalBlocks * mp(BLOCK_RATES.fillLaborHrs.dbName, BLOCK_RATES.fillLaborHrs.fallback)
  }

  // Finishes
  let finishHrs = 0,
    finishMat = 0
  finishRows.forEach(r => {
    const rate = FINISH_TYPES[r.type]
    if (!rate || !n(r.qty)) return
    if (isSub) {
      // Sub tab: flat $/SF, no separate labor. Vendor overrides the flat source.
      finishMat += n(r.qty) * matP(rate.subDbName, rate.subFallback ?? 0, r.vendor)
    } else if (rate.unit === 'SF') {
      const cost = matP(rate.dbName, rate.costPerSF, r.vendor)
      const labRate = mp(rate.laborDbName, rate.laborHrsPerSF)
      finishMat += n(r.qty) * cost
      finishHrs += n(r.qty) * labRate
    } else {
      // ton-based (flagstone, real stone) — Vendor overrides the material $ only.
      const cost = matP(rate.dbName, rate.costPerTon, r.vendor)
      const labRate = mp(rate.laborDbName, rate.laborHrsPer)
      finishMat += n(r.qty) * cost
      finishHrs += n(r.qty) * labRate
    }
  })

  // Manual
  let manHrs = 0,
    manMat = 0,
    manSub = 0
  manualRows.forEach(r => {
    manHrs += n(r.hours)
    manMat += n(r.materials)
    manSub += n(r.subCost)
  })

  const baseHrs = installHrs + finishHrs + manHrs
  const diffMod = 1 + n(difficulty) / 100
  const _preWalkHrs = baseHrs * diffMod + n(hoursAdj)
  const walkHrs = calcWalkAccessLabor(_preWalkHrs, state.distanceLF, { paceLfPerMin: _pace })
  const totalHrs = _preWalkHrs + walkHrs
  const manDays = totalHrs / 8
  const totalMat = installMat + finishMat + manMat
  const laborCost = totalHrs * laborRatePerHour
  const burden = laborCost * (n(laborBurdenPct) || DEFAULTS.laborBurdenPct)

  // Sub tab: GpmdBar's 'sub' variant totals subCost + subGp + commission and
  // ignores totalMat/laborCost/gp, so route the itemized scope INTO subCost.
  let gp, subCost, subGp, commission, price
  if (isSub) {
    gp = 0
    subCost = totalMat + laborCost + burden + manSub
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
    laborCost,
    burden,
    gp,
    subGp,
    commission,
    subCost,
    price,
    walkHrs,
    installHrs,
    installMat,
    finishHrs,
    finishMat,
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

// ── Defaults ──────────────────────────────────────────────────────────────────
const DEFAULT_FINISH_ROWS = [
  { type: 'Sand Stucco', qty: '', vendor: 'House' },
  { type: 'Sand Stucco', qty: '', vendor: 'House' },
  { type: 'Ledgerstone Veneer Panels', qty: '', vendor: 'House' },
  { type: 'Tile', qty: '', vendor: 'House' },
]
const DEFAULT_MANUAL_ROWS = [
  { label: 'Misc 1', hours: '', materials: '', subCost: '' },
  { label: 'Misc 2', hours: '', materials: '', subCost: '' },
  { label: 'Misc 3', hours: '', materials: '', subCost: '' },
]

// ── Main Component ────────────────────────────────────────────────────────────
export default function ColumnsModule({ onSave, onBack, saving, initialData }) {
  const [laborRatePerHour, setLaborRatePerHour] = useState(
    initialData?.laborRatePerHour ?? DEFAULTS.laborRatePerHour
  )
  const [laborBurdenPct, setLaborBurdenPct] = useState(
    initialData?.laborBurdenPct ?? DEFAULTS.laborBurdenPct
  )

  // Free-text notes for this module — Sam writes auto-generated
  // takeoffs here via create_estimate_from_takeoff, and the user can
  // overwrite / append their own.
  const [notes, setNotes] = useState(initialData?.notes ?? '')
  const [walkAccess, setWalkAccess] = useState(
    initialData?.walkAccess ?? {
      paceLfPerMin: DEFAULT_WALK_ACCESS_PACE_LF_PER_MIN,
    }
  )
  // Shared material catalog — fetches Columns material + labor rates, the
  // material_rates rows, and vendors, and exposes the canonical resolver.
  // (Replaces the old per-module fetch + colMatPrice copy.)
  const {
    priceMap: materialPrices,
    materialRows,
    vendors,
    vendorNames,
    loading: pricesLoading,
    refresh: refreshAllRates,
    vendorOptionsForCategory,
  } = useMaterialCatalog([COLUMNS_CATEGORY, BASIC_CATEGORY], {
    materialPrices: initialData?.materialPrices,
    materialRows: initialData?.materialRows,
  })

  useEffect(() => {
    if (!initialData?.laborRatePerHour) {
      supabase
        .from('company_settings')
        .select('labor_rate_per_hour, labor_burden_pct, walk_access_pace_lf_per_min')
        .single()
        .then(({ data }) => {
          if (!data) return
          if (data.labor_rate_per_hour != null)
            setLaborRatePerHour(parseFloat(data.labor_rate_per_hour) || DEFAULTS.laborRatePerHour)
          if (data.labor_burden_pct != null)
            setLaborBurdenPct(parseFloat(data.labor_burden_pct))
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
  }, [initialData?.laborRatePerHour])

  const gpmd = initialData?.gpmd ?? DEFAULTS.gpmd
  const subGpMarkupRate = initialData?.subGpMarkupRate ?? 0.2

  const [crewType, setCrewType] = useState(initialData?.crewType ?? 'Masonry')
  const [subType, setSubType] = useState(initialData?.subType ?? 'In-House')
  const isSub = subType === 'Subcontractor'

  // ── Per-tab independence — In-House and Subcontractor keep their own
  //    takeoff inputs so entering data on one tab never changes the other.
  //    makeTab() seeds a tab's defaults; ihData/subData persist both.
  //    Legacy modules (flat data, no ihData) load into the In-House tab.
  const makeTab = (src = {}) => ({
    difficulty: src.difficulty ?? '',
    hoursAdj: src.hoursAdj ?? '',
    qty: src.qty ?? '',
    heightIn: src.heightIn ?? '',
    widthIn: src.widthIn ?? '',
    distanceLF: src.distanceLF ?? '',
    // Section-level Vendor for the Column Install materials. 'House' = current price.
    installVendor: src.installVendor ?? 'House',
    finishRows: src.finishRows
      ? src.finishRows.map(r => ({ vendor: 'House', ...r }))
      : DEFAULT_FINISH_ROWS.map(r => ({ ...r })),
    manualRows: src.manualRows ? src.manualRows.map(r => ({ ...r })) : DEFAULT_MANUAL_ROWS.map(r => ({ ...r })),
  })
  const [ihTab, setIhTab] = useState(() => makeTab(initialData?.ihData ?? initialData))
  const [subTab, setSubTab] = useState(() => makeTab(initialData?.subData))
  const cur = isSub ? subTab : ihTab
  const setCur = isSub ? setSubTab : setIhTab
  const setField = k => v =>
    setCur(p => ({ ...p, [k]: typeof v === 'function' ? v(p[k]) : v }))

  const difficulty = cur.difficulty
  const setDifficulty = setField('difficulty')
  const hoursAdj = cur.hoursAdj
  const setHoursAdj = setField('hoursAdj')
  const qty = cur.qty
  const setQty = setField('qty')
  const heightIn = cur.heightIn
  const setHeightIn = setField('heightIn')
  const widthIn = cur.widthIn
  const setWidthIn = setField('widthIn')
  const distanceLF = cur.distanceLF
  const setDistanceLF = setField('distanceLF')
  const installVendor = cur.installVendor ?? 'House'
  const setInstallVendor = setField('installVendor')
  const finishRows = cur.finishRows
  const setFinishRows = setField('finishRows')
  const manualRows = cur.manualRows
  const setManualRows = setField('manualRows')

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

  // Vendor pickers: only vendors that supply the Columns category. 'House' first.
  const vendorOptions = vendorOptionsForCategory(COLUMNS_CATEGORY)
  // Vendor-resolved material price for display (calc uses the same resolver).
  const colMat = (dbName, vendorId, fallback) =>
    colMatPrice(dbName, vendorId, materialRows, materialPrices, fallback)

  const calcRaw = calcColumns(
    {
      difficulty,
      hoursAdj,
      qty,
      heightIn,
      widthIn,
      installVendor,
      finishRows,
      manualRows,
      distanceLF,
      subType,
      subGpMarkupRate,
    },
    laborRatePerHour,
    materialPrices,
    gpmd,
    walkAccess,
    laborBurdenPct,
    materialRows
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

  // Show geometry preview when all three inputs filled
  const geo =
    n(qty) > 0 && n(heightIn) > 0 && n(widthIn) > 0 ? columnGeometry(heightIn, widthIn) : null

  function updateFinish(i, field, val) {
    setFinishRows(rows => rows.map((r, idx) => (idx === i ? { ...r, [field]: val } : r)))
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
        hoursAdj,
        qty,
        heightIn,
        widthIn,
        distanceLF,
        installVendor,
        finishRows,
        manualRows,
        crewType,
        subType,
        subGpMarkupRate,
        laborRatePerHour,
        laborBurdenPct,
        gpmd,
        materialPrices,
        materialRows,
        vendorNames,
        ihData: ihTab,
        subData: subTab,
        calc,
      },
    })
  }

  return (
    <SubTabContext.Provider value={isSub}>
    <div className="space-y-5">
      {/* ── Sticky GPMD bar ── */}
      <div className="sticky top-0 z-20 -mx-6 px-6 pt-1 pb-1 bg-gray-900 shadow-lg">
        {/* GPMD summary bar */}
        <GpmdBar
          variant={subType === 'Subcontractor' ? 'sub' : 'inhouse'}
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

      {pricesLoading && (
        <div className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2">
          Loading material prices from Master Rates…
        </div>
      )}

      {/* Settings — Job Site Conditions is In-House only (hidden on Sub tab) */}
      {subType !== 'Subcontractor' && (
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

      {/* ── Column Install ── */}
      <div>
        <SectionHeader title="Column Install" />
        {/* Section Vendor — overrides ONLY the material unit prices (CMU Block,
            Fill/Grout, Rebar) used by the geometry calc. 'House' = current price. */}
        <div className="flex items-center gap-3 bg-gray-50 rounded-lg px-4 py-2.5 border border-gray-200 mb-3">
          <label className="text-sm font-medium text-gray-700 whitespace-nowrap">Vendor</label>
          <select
            value={installVendor || 'House'}
            onChange={e => setInstallVendor(e.target.value)}
            className="input text-sm py-1 w-48"
          >
            {vendorOptions.map(o => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <span className="text-[11px] text-gray-400">material prices only</span>
        </div>
        {/* Rates reference box — In-House only (hidden on Sub tab) */}
        {!isSub && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 mb-3 text-[11px] text-gray-500">
          <p className="font-semibold uppercase tracking-wide text-gray-400 mb-1">
            Column Install Rates (click any to edit)
          </p>
          <div className="flex flex-wrap gap-x-3 gap-y-1">
            <span className="inline-flex items-center gap-1">
              Block $
              {colMat(
                BLOCK_RATES.blockMatCost.dbName,
                installVendor,
                BLOCK_RATES.blockMatCost.fallback
              ).toFixed(2)}
              /ea
              <RateEditPopover
                table="material_rates"
                name={BLOCK_RATES.blockMatCost.dbName}
                category="Columns"
                unitLabel="ea"
                currentValue={
                  materialPrices[BLOCK_RATES.blockMatCost.dbName] ??
                  BLOCK_RATES.blockMatCost.fallback
                }
                onSaved={refreshAllRates}
              />
            </span>
            <span className="inline-flex items-center gap-1">
              Rebar $
              {colMat(
                BLOCK_RATES.rebarMatCost.dbName,
                installVendor,
                BLOCK_RATES.rebarMatCost.fallback
              ).toFixed(2)}
              /LF
              <RateEditPopover
                table="material_rates"
                name={BLOCK_RATES.rebarMatCost.dbName}
                category={BASIC_CATEGORY}
                unitLabel="LF"
                currentValue={
                  materialPrices[BLOCK_RATES.rebarMatCost.dbName] ??
                  BLOCK_RATES.rebarMatCost.fallback
                }
                onSaved={refreshAllRates}
              />
            </span>
            <span className="inline-flex items-center gap-1">
              Grout (concrete) $
              {colMat(GROUT_CONCRETE.dbName, installVendor, GROUT_CONCRETE.fallback).toFixed(2)}
              /CY · {(groutCyPerBlock(8, 8) * 27).toFixed(2)} cf/block
              <RateEditPopover
                table="material_rates"
                name={GROUT_CONCRETE.dbName}
                category={BASIC_CATEGORY}
                unitLabel="CY"
                currentValue={materialPrices[GROUT_CONCRETE.dbName] ?? GROUT_CONCRETE.fallback}
                onSaved={refreshAllRates}
              />
            </span>
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1">
            <span className="inline-flex items-center gap-1">
              Install{' '}
              {materialPrices[BLOCK_RATES.installLaborHrs.dbName] ??
                BLOCK_RATES.installLaborHrs.fallback}{' '}
              hrs/blk
              <RateEditPopover
                table="labor_rates"
                name={BLOCK_RATES.installLaborHrs.dbName}
                category="Columns"
                mode="coefficient"
                unitLabel="hrs/blk"
                currentValue={
                  materialPrices[BLOCK_RATES.installLaborHrs.dbName] ??
                  BLOCK_RATES.installLaborHrs.fallback
                }
                onSaved={refreshAllRates}
              />
            </span>
            <span className="inline-flex items-center gap-1">
              Excavate{' '}
              {materialPrices[BLOCK_RATES.excavateLaborHrs.dbName] ??
                BLOCK_RATES.excavateLaborHrs.fallback}{' '}
              hrs/col
              <RateEditPopover
                table="labor_rates"
                name={BLOCK_RATES.excavateLaborHrs.dbName}
                category="Columns"
                mode="coefficient"
                unitLabel="hrs/col"
                currentValue={
                  materialPrices[BLOCK_RATES.excavateLaborHrs.dbName] ??
                  BLOCK_RATES.excavateLaborHrs.fallback
                }
                onSaved={refreshAllRates}
              />
            </span>
            <span className="inline-flex items-center gap-1">
              Pour{' '}
              {materialPrices[BLOCK_RATES.pourLaborHrs.dbName] ?? BLOCK_RATES.pourLaborHrs.fallback}{' '}
              hrs/col
              <RateEditPopover
                table="labor_rates"
                name={BLOCK_RATES.pourLaborHrs.dbName}
                category="Columns"
                mode="coefficient"
                unitLabel="hrs/col"
                currentValue={
                  materialPrices[BLOCK_RATES.pourLaborHrs.dbName] ??
                  BLOCK_RATES.pourLaborHrs.fallback
                }
                onSaved={refreshAllRates}
              />
            </span>
            <span className="inline-flex items-center gap-1">
              Fill{' '}
              {materialPrices[BLOCK_RATES.fillLaborHrs.dbName] ?? BLOCK_RATES.fillLaborHrs.fallback}{' '}
              hrs/blk
              <RateEditPopover
                table="labor_rates"
                name={BLOCK_RATES.fillLaborHrs.dbName}
                category="Columns"
                mode="coefficient"
                unitLabel="hrs/blk"
                currentValue={
                  materialPrices[BLOCK_RATES.fillLaborHrs.dbName] ??
                  BLOCK_RATES.fillLaborHrs.fallback
                }
                onSaved={refreshAllRates}
              />
            </span>
          </div>
        </div>
        )}
        <div className="grid grid-cols-3 gap-3 mb-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Quantity of Columns</label>
            <NumInput value={qty} onChange={setQty} placeholder="0" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Height (Inches)</label>
            <NumInput value={heightIn} onChange={setHeightIn} placeholder="0" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Width (Inches)</label>
            <NumInput value={widthIn} onChange={setWidthIn} placeholder="0" />
          </div>
        </div>

        {/* Geometry preview */}
        {geo && (
          <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-xs text-gray-700 grid grid-cols-2 gap-x-6 gap-y-1">
            <span>
              Blocks per course: <strong>{geo.blocksPerCourse}</strong>
            </span>
            <span>
              Courses: <strong>{geo.courses}</strong>
            </span>
            <span>
              Total blocks per column: <strong>{geo.totalBlocks}</strong>
            </span>
            <span>
              Total blocks (all): <strong>{geo.totalBlocks * n(qty)}</strong>
            </span>
            <span>
              Rebar per column: <strong>{geo.rebarLF.toFixed(1)} LF</strong>
            </span>
            <span>
              Footing area: <strong>{geo.footingArea.toFixed(1)} SF</strong>
            </span>
          </div>
        )}
      </div>

      {/* ── Finishes ── */}
      <div>
        <SectionHeader title="Finishes" />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 border-b border-gray-200">
                <th className="text-left pb-1 pr-2 font-medium w-36">Vendor</th>
                <th className="text-left pb-1 pr-2 font-medium">Finish Type</th>
                <th className="text-left pb-1 pr-2 font-medium">Qty</th>
                <th className="text-left pb-1 pr-2 font-medium text-gray-400">Unit</th>
                <th className="text-right pb-1 pr-2 font-medium text-gray-400">$/Unit</th>
                <th className="text-right pb-1 font-medium text-gray-400">Material $</th>
              </tr>
            </thead>
            <tbody>
              {finishRows.map((row, i) => {
                const rate = FINISH_TYPES[row.type]
                const isTon = rate?.unit === 'ton'
                const defCost = isTon ? rate?.costPerTon : rate?.costPerSF
                // Sub tab: flat $/SF rate; In-House: material cost per unit.
                // Vendor overrides ONLY this material price (row.vendor).
                const cost = isSub
                  ? colMat(rate?.subDbName, row.vendor, rate?.subFallback ?? 0)
                  : colMat(rate?.dbName, row.vendor, defCost ?? 0)
                const defLab = isTon ? rate?.laborHrsPer : rate?.laborHrsPerSF
                const labRate = materialPrices[rate?.laborDbName] ?? defLab ?? 0
                const unitLabel = isSub ? 'SF' : rate?.unit ?? 'SF'
                const mat = n(row.qty) * cost
                return (
                  <tr key={i} className="border-b border-gray-100">
                    <td className="py-1 pr-2">
                      <select
                        className="input text-sm py-1 w-full"
                        value={row.vendor || 'House'}
                        onChange={e => updateFinish(i, 'vendor', e.target.value)}
                      >
                        {vendorOptions.map(o => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-1 pr-2">
                      <div className="flex items-center gap-1">
                        <select
                          className="input text-sm py-1 flex-1 min-w-0"
                          value={row.type}
                          onChange={e => updateFinish(i, 'type', e.target.value)}
                        >
                          {Object.keys(FINISH_TYPES).map(t => (
                            <option key={t}>{t}</option>
                          ))}
                        </select>
                        {/* In-House only: labor coefficient edit */}
                        {rate && !isSub && (
                          <RateEditPopover
                            table="labor_rates"
                            name={rate.laborDbName}
                            category="Columns"
                            mode="coefficient"
                            unitLabel={`hrs/${rate.unit}`}
                            currentValue={labRate}
                            onSaved={refreshAllRates}
                          />
                        )}
                      </div>
                    </td>
                    <td className="py-1 pr-2">
                      <NumInput value={row.qty} onChange={v => updateFinish(i, 'qty', v)} />
                    </td>
                    <td className="py-1 pr-2 text-xs text-gray-400">{unitLabel}</td>
                    <td className="py-1 text-right text-gray-400 text-xs pr-2">
                      <span className="inline-flex items-center justify-end gap-1">
                        ${cost.toFixed(2)}
                        {/* House rate edit — only when House vendor (edits the
                            name-keyed House material_rates row, not a vendor's). */}
                        {rate && (!row.vendor || row.vendor === 'House') && (
                          <RateEditPopover
                            table="material_rates"
                            name={isSub ? rate.subDbName : rate.dbName}
                            category="Columns"
                            unitLabel={unitLabel}
                            currentValue={
                              materialPrices[isSub ? rate.subDbName : rate.dbName] ??
                              (isSub ? rate.subFallback ?? 0 : defCost ?? 0)
                            }
                            onSaved={refreshAllRates}
                          />
                        )}
                      </span>
                    </td>
                    <td className="py-1 text-right text-gray-600 text-xs">
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
            onClick={() => setFinishRows(r => [...r, { type: 'Sand Stucco', qty: '', vendor: 'House' }])}
          >
            + Add row
          </button>
        </div>
      </div>

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
                    <NumInput value={row.hours} onChange={v => updateManual(i, 'hours', v)} />
                  </td>
                  <td className="py-1 pr-2">
                    <NumInput
                      value={row.materials}
                      onChange={v => updateManual(i, 'materials', v)}
                    />
                  </td>
                  <td className="py-1">
                    {' '}
                    <NumInput value={row.subCost} onChange={v => updateManual(i, 'subCost', v)} />
                  </td>
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

      {/* Actions */}
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
