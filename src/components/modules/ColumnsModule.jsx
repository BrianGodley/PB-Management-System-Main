import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import GpmdBar from './GpmdBar'
import RateEditPopover from '../RateEditPopover'
import { fetchSalesTaxRate } from '../../lib/companyDefaults'
import { calcWalkAccessLabor, DEFAULT_WALK_ACCESS_PACE_LF_PER_MIN } from '../../lib/walkAccess'

// ─────────────────────────────────────────────────────────────────────────────
// Columns Module — fields and calculations from Excel estimator (Columns Module tab)
// Column Install auto-calculates CMU blocks, rebar, footing, and fill from
// quantity, height, and width inputs.
// ─────────────────────────────────────────────────────────────────────────────

// dbName = name in material_rates (category = 'Columns')
// Hardcoded values are fallbacks when DB row is absent.
const FINISH_TYPES = {
  'Sand Stucco':               { costPerSF: 0,      unit: 'SF',  dbName: 'Sand Stucco',               laborDbName: 'Sand Stucco - Labor Rate',               laborHrsPerSF: 0.05  },
  'Smooth Stucco':             { costPerSF: 0,      unit: 'SF',  dbName: 'Smooth Stucco',             laborDbName: 'Smooth Stucco - Labor Rate',             laborHrsPerSF: 0.05  },
  'Ledgerstone Veneer Panels': { costPerSF: 10.00,  unit: 'SF',  dbName: 'Ledgerstone Veneer Panels', laborDbName: 'Ledgerstone Veneer Panels - Labor Rate', laborHrsPerSF: 0.10  },
  'Stacked Stone Veneer':      { costPerSF: 10.00,  unit: 'SF',  dbName: 'Stacked Stone Veneer',      laborDbName: 'Stacked Stone Veneer - Labor Rate',      laborHrsPerSF: 0.10  },
  'Tile':                      { costPerSF: 6.50,   unit: 'SF',  dbName: 'Tile - Columns',            laborDbName: 'Tile - Columns - Labor Rate',            laborHrsPerSF: 0.125 },
  'Real Flagstone, Flat':      { costPerTon: 400.0, unit: 'ton', dbName: 'Real Flagstone Flat',       laborDbName: 'Real Flagstone Flat - Labor Rate',       laborHrsPer: 0.5     },
  'Real Stone':                { costPerTon: 400.0, unit: 'ton', dbName: 'Real Stone - Columns',      laborDbName: 'Real Stone - Columns - Labor Rate',      laborHrsPer: 0.5     },
}

const BLOCK_RATES = {
  blockMatCost:    { dbName: 'CMU Block',          fallback: 2.50  },  // $/block
  rebarMatCost:    { dbName: 'Rebar - Columns',    fallback: 0.80  },  // $/LF
  faceBlockMat:    { dbName: 'Face Block',         fallback: 3.00  },  // $/block (decorative)
  fillMatCost:     { dbName: 'Fill Block / Grout', fallback: 0.75  },  // $/block
  // Labor rates
  installLaborHrs: { dbName: 'CMU Install Labor',  fallback: 0.083 },  // hrs per block (~5 min)
  excavateLaborHrs:{ dbName: 'Excavate Footing Labor', fallback: 0.5 },// hrs per column
  pourLaborHrs:    { dbName: 'Pour Footing Labor', fallback: 0.25  },  // hrs per column
  fillLaborHrs:    { dbName: 'Fill Labor',         fallback: 0.05  },  // hrs per block
}

const MISC_RATES = {
  bbqBlock:        { dbName: 'BBQ Block',          matCost: 5.00, laborHrs: 0.10, label: 'BBQ Block'        },
  backsplashBlock: { dbName: 'Backsplash Block',   matCost: 3.50, laborHrs: 0.05, label: 'Backsplash Block' },
}

const DEFAULTS = {
  laborRatePerHour: 35,
  laborBurdenPct:   0.29,
  gpmd:             425,
  commissionRate:   0.12,
}

const n = (v) => parseFloat(v) || 0

// ── Column geometry helpers ───────────────────────────────────────────────────
// Standard CMU blocks are 8"×8"×16" (face) or 8"×8"×8" (corner/half)
// We use 8" module for both dimensions.
function columnGeometry(heightIn, widthIn) {
  const courses     = Math.ceil(n(heightIn) / 8)           // 8" per course
  const blocksWide  = Math.ceil(n(widthIn)  / 8)           // blocks per side
  const blocksPerCourse = blocksWide * blocksWide           // solid column
  const totalBlocks = courses * blocksPerCourse
  const rebarLF     = (n(heightIn) / 12) * (blocksWide > 1 ? 4 : 1) // LF rebar per column
  const footingArea = Math.pow((n(widthIn) / 12) + 1, 2)  // SF (1 ft larger each side)
  return { courses, blocksWide, blocksPerCourse, totalBlocks, rebarLF, footingArea }
}

function calcColumns(state, laborRatePerHour = DEFAULTS.laborRatePerHour, materialPrices = {}, gpmd = DEFAULTS.gpmd) {
  const { difficulty, hoursAdj, qty, heightIn, widthIn,
          finishRows, miscQty, manualRows } = state

  const mp = (dbName, fallback) => materialPrices[dbName] ?? fallback

  let installHrs = 0, installMat = 0

  if (n(qty) > 0 && n(heightIn) > 0 && n(widthIn) > 0) {
    const geo = columnGeometry(heightIn, widthIn)
    const totalBlocks = geo.totalBlocks * n(qty)
    const totalRebar  = geo.rebarLF    * n(qty)

    // Material costs
    installMat +=
      totalBlocks * mp(BLOCK_RATES.blockMatCost.dbName, BLOCK_RATES.blockMatCost.fallback)
      + totalBlocks * mp(BLOCK_RATES.fillMatCost.dbName, BLOCK_RATES.fillMatCost.fallback)
      + totalRebar  * mp(BLOCK_RATES.rebarMatCost.dbName, BLOCK_RATES.rebarMatCost.fallback)

    // Labor hours
    installHrs +=
      n(qty) * mp(BLOCK_RATES.excavateLaborHrs.dbName, BLOCK_RATES.excavateLaborHrs.fallback)
      + n(qty) * mp(BLOCK_RATES.pourLaborHrs.dbName,    BLOCK_RATES.pourLaborHrs.fallback)
      + totalBlocks * mp(BLOCK_RATES.installLaborHrs.dbName, BLOCK_RATES.installLaborHrs.fallback)
      + totalBlocks * mp(BLOCK_RATES.fillLaborHrs.dbName,    BLOCK_RATES.fillLaborHrs.fallback)
  }

  // Finishes
  let finishHrs = 0, finishMat = 0
  finishRows.forEach(r => {
    const rate = FINISH_TYPES[r.type]
    if (!rate || !n(r.qty)) return
    if (rate.unit === 'SF') {
      const cost    = mp(rate.dbName, rate.costPerSF)
      const labRate = mp(rate.laborDbName, rate.laborHrsPerSF)
      finishMat += n(r.qty) * cost
      finishHrs += n(r.qty) * labRate
    } else {
      // ton-based (flagstone, real stone)
      const cost    = mp(rate.dbName, rate.costPerTon)
      const labRate = mp(rate.laborDbName, rate.laborHrsPer)
      finishMat += n(r.qty) * cost
      finishHrs += n(r.qty) * labRate
    }
  })

  // Misc (BBQ block, backsplash)
  let miscHrs = 0, miscMat = 0
  Object.entries(MISC_RATES).forEach(([key, rate]) => {
    const q = n(miscQty[`${key}Qty`])
    if (q > 0) {
      miscMat += q * mp(rate.dbName, rate.matCost)
      miscHrs += q * rate.laborHrs
    }
  })

  // Manual
  let manHrs = 0, manMat = 0, manSub = 0
  manualRows.forEach(r => { manHrs += n(r.hours); manMat += n(r.materials); manSub += n(r.subCost) })

  const baseHrs  = installHrs + finishHrs + miscHrs + manHrs
  const diffMod  = 1 + (n(difficulty) / 100)
  const _preWalkHrs = (baseHrs * diffMod) + n(hoursAdj)
  const walkHrs     = calcWalkAccessLabor(_preWalkHrs, state.distanceLF, { paceLfPerMin: _pace })
  const totalHrs    = _preWalkHrs + walkHrs
  const manDays  = totalHrs / 8
  const totalMat = installMat + finishMat + miscMat + manMat
  const laborCost   = totalHrs * laborRatePerHour
  const burden      = laborCost * DEFAULTS.laborBurdenPct
  const gp          = manDays * gpmd
  const commission  = gp * DEFAULTS.commissionRate
  const subCost     = manSub
  const price       = totalMat + laborCost + burden + gp + commission + subCost

  return { totalHrs, manDays, totalMat, laborCost, burden, gp, commission, subCost, price,
           installHrs, installMat, finishHrs, finishMat }
}

// ── Sub-components ────────────────────────────────────────────────────────────
function SectionHeader({ title }) {
  return (
    <div className="bg-gray-100 px-4 py-2 rounded-lg mb-2">
      <h3 className="text-xs font-bold text-gray-600 uppercase tracking-wider">{title}</h3>
    </div>
  )
}

function NumInput({ value, onChange, placeholder = '0', className = '' }) {
  return (
    <input
      type="number" step="any"
      className={`input text-sm py-1.5 ${className}`}
      placeholder={placeholder}
      value={value}
      onChange={e => onChange(e.target.value)}
    />
  )
}

// ── Defaults ──────────────────────────────────────────────────────────────────
const DEFAULT_FINISH_ROWS = [
  { type: 'Sand Stucco', qty: '' },
  { type: 'Sand Stucco', qty: '' },
  { type: 'Ledgerstone Veneer Panels', qty: '' },
  { type: 'Tile', qty: '' },
]
const DEFAULT_MISC_QTY = { bbqBlockQty: '', backsplashBlockQty: '' }
const DEFAULT_MANUAL_ROWS = [
  { label: 'Misc 1', hours: '', materials: '', subCost: '' },
  { label: 'Misc 2', hours: '', materials: '', subCost: '' },
  { label: 'Misc 3', hours: '', materials: '', subCost: '' },
  { label: 'Misc 4', hours: '', materials: '', subCost: '' },
]

// ── Main Component ────────────────────────────────────────────────────────────
export default function ColumnsModule({ projectName, onSave, onBack, saving, initialData }) {
  const [laborRatePerHour, setLaborRatePerHour] = useState(
    initialData?.laborRatePerHour ?? DEFAULTS.laborRatePerHour
  )
  const [walkAccess, setWalkAccess] = useState(initialData?.walkAccess ?? {
    paceLfPerMin: DEFAULT_WALK_ACCESS_PACE_LF_PER_MIN,
  })
  const [materialPrices, setMaterialPrices] = useState(initialData?.materialPrices ?? {})
  const [pricesLoading, setPricesLoading]   = useState(!initialData?.materialPrices)

  // Re-fetch Columns merged labor+material map. Used on mount and after edits.
  const refreshAllRates = useCallback(async () => {
    const [matRes, labRes] = await Promise.all([
      supabase.from('material_rates').select('name, unit_cost').eq('category', 'Columns'),
      supabase.from('labor_rates').select('name, rate').eq('category', 'Columns'),
    ])
    const prices = {}
    ;(matRes.data || []).forEach(r => { prices[r.name] = parseFloat(r.unit_cost) || 0 })
    ;(labRes.data  || []).forEach(r => { prices[r.name] = parseFloat(r.rate)     || 0 })
    setMaterialPrices(prices)
  }, [])

  useEffect(() => {
    if (!initialData?.laborRatePerHour) {
      supabase.from('company_settings').select('labor_rate_per_hour, walk_access_pace_lf_per_min').single()
        .then(({ data }) => {
          if (!data) return
          if (data.labor_rate_per_hour != null) setLaborRatePerHour(parseFloat(data.labor_rate_per_hour) || DEFAULTS.laborRatePerHour)
          if (data.walk_access_pace_lf_per_min != null) {
            const _wpace = parseFloat(data.walk_access_pace_lf_per_min)
            setWalkAccess({ paceLfPerMin: Number.isFinite(_wpace) && _wpace > 0 ? _wpace : DEFAULT_WALK_ACCESS_PACE_LF_PER_MIN })
          }
        })
    }
    if (initialData?.materialPrices) return
    refreshAllRates().then(() => setPricesLoading(false))
  }, [refreshAllRates])

  const gpmd          = initialData?.gpmd ?? DEFAULTS.gpmd
  const subGpMarkupRate = initialData?.subGpMarkupRate ?? 0.20

  const [difficulty,  setDifficulty]  = useState(initialData?.difficulty  ?? '')
  const [crewType, setCrewType] = useState(initialData?.crewType ?? 'Masonry')
  const [hoursAdj,    setHoursAdj]    = useState(initialData?.hoursAdj    ?? '')
  const [qty,         setQty]         = useState(initialData?.qty         ?? '')
  const [heightIn,    setHeightIn]    = useState(initialData?.heightIn    ?? '')
  const [widthIn,     setWidthIn]     = useState(initialData?.widthIn     ?? '')
  const [finishRows,  setFinishRows]  = useState(initialData?.finishRows  ?? DEFAULT_FINISH_ROWS)
  const [miscQty,     setMiscQty]     = useState(initialData?.miscQty     ?? DEFAULT_MISC_QTY)
  const [manualRows,  setManualRows]  = useState(initialData?.manualRows  ?? DEFAULT_MANUAL_ROWS)

  // ── Sales tax — applied to totalMat across every module so the bid
  //    reflects supplier-invoiced material cost. Sourced from
  //    company_settings.sales_tax_rate via fetchSalesTaxRate(). Default
  //    0 (no tax) until the admin sets it in Opportunities → Settings.
  const [salesTaxRate, setSalesTaxRate] = useState(0)
  useEffect(() => {
    let alive = true
    fetchSalesTaxRate().then(r => { if (alive) setSalesTaxRate(r) })
    return () => { alive = false }
  }, [])


  const calcRaw = calcColumns(
    { difficulty, hoursAdj, qty, heightIn, widthIn, finishRows, miscQty, manualRows },
    laborRatePerHour, materialPrices, gpmd,
  )
  // Apply company sales tax to the module's total material cost so the
  // estimate price matches what suppliers actually invoice. Stored
  // material_cost (saved with the module) ends up tax-inclusive too,
  // so bid totals add up to GpmdBar's displayed price.
  const _salesTaxAmt = (calcRaw.totalMat || 0) * (salesTaxRate || 0)
  const calc = _salesTaxAmt > 0
    ? {
        ...calcRaw,
        totalMat: (calcRaw.totalMat || 0) + _salesTaxAmt,
        price:    (calcRaw.price    || 0) + _salesTaxAmt,
        salesTax: _salesTaxAmt,
      }
    : calcRaw


  // Show geometry preview when all three inputs filled
  const geo = (n(qty) > 0 && n(heightIn) > 0 && n(widthIn) > 0)
    ? columnGeometry(heightIn, widthIn)
    : null

  function updateFinish(i, field, val) {
    setFinishRows(rows => rows.map((r, idx) => idx === i ? { ...r, [field]: val } : r))
  }
  function updateManual(i, field, val) {
    setManualRows(rows => rows.map((r, idx) => idx === i ? { ...r, [field]: val } : r))
  }

  function handleSave() {
    onSave({
      man_days:      parseFloat(calc.manDays.toFixed(2)),
      material_cost: parseFloat(calc.totalMat.toFixed(2)),
      data: {
        difficulty, hoursAdj, qty, heightIn, widthIn,
        finishRows, miscQty, manualRows, laborRatePerHour, gpmd,
        materialPrices, calc,
      },
    })
  }

  return (
    <div className="space-y-5">
      {/* ── Sticky GPMD bar ── */}
      <div className="sticky top-0 z-20 -mx-6 px-6 pt-2 pb-2 bg-gray-900 shadow-lg">
      {/* GPMD summary bar */}
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
      />
      </div>

      {/* Crew Type */}
      <div className="flex items-center gap-3 bg-gray-50 rounded-lg px-4 py-2.5 border border-gray-200">
        <label className="text-sm font-medium text-gray-700 whitespace-nowrap">Crew Type</label>
        <select value={crewType} onChange={e => setCrewType(e.target.value)} className="input text-sm py-1 w-36">
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

      {/* Difficulty */}
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium text-gray-700 whitespace-nowrap">Difficulty Add</label>
        <div className="relative w-32">
          <NumInput value={difficulty} onChange={setDifficulty} placeholder="0" />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">%</span>
        </div>
      </div>

      {/* Truck → Work Area (walk-access penalty input) */}
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium text-gray-700 whitespace-nowrap" title="Average Distance from Truck to Work Area">Truck → Work Area</label>
        <div className="relative w-32">
          <NumInput value={state.distanceLF} onChange={v => setState(p => ({ ...p, distanceLF: v }))} placeholder="0" />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">Avg LF</span>
        </div>
        {calc.walkHrs > 0 && (
          <span className="text-xs text-gray-500">+{calc.walkHrs.toFixed(2)} hrs walk-access</span>
        )}
      </div>

      {/* ── Column Install ── */}
      <div>
        <SectionHeader title="Column Install" />
        <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 mb-3 text-[11px] text-gray-500">
          <p className="font-semibold uppercase tracking-wide text-gray-400 mb-1">Column Install Rates (click any to edit)</p>
          <div className="flex flex-wrap gap-x-3 gap-y-1">
            <span className="inline-flex items-center gap-1">Block ${(materialPrices[BLOCK_RATES.blockMatCost.dbName] ?? BLOCK_RATES.blockMatCost.fallback).toFixed(2)}/ea
              <RateEditPopover table="material_rates" name={BLOCK_RATES.blockMatCost.dbName} category="Columns" unitLabel="ea"
                currentValue={materialPrices[BLOCK_RATES.blockMatCost.dbName] ?? BLOCK_RATES.blockMatCost.fallback} onSaved={refreshAllRates} />
            </span>
            <span className="inline-flex items-center gap-1">Rebar ${(materialPrices[BLOCK_RATES.rebarMatCost.dbName] ?? BLOCK_RATES.rebarMatCost.fallback).toFixed(2)}/LF
              <RateEditPopover table="material_rates" name={BLOCK_RATES.rebarMatCost.dbName} category="Columns" unitLabel="LF"
                currentValue={materialPrices[BLOCK_RATES.rebarMatCost.dbName] ?? BLOCK_RATES.rebarMatCost.fallback} onSaved={refreshAllRates} />
            </span>
            <span className="inline-flex items-center gap-1">Fill ${(materialPrices[BLOCK_RATES.fillMatCost.dbName] ?? BLOCK_RATES.fillMatCost.fallback).toFixed(2)}/block
              <RateEditPopover table="material_rates" name={BLOCK_RATES.fillMatCost.dbName} category="Columns" unitLabel="block"
                currentValue={materialPrices[BLOCK_RATES.fillMatCost.dbName] ?? BLOCK_RATES.fillMatCost.fallback} onSaved={refreshAllRates} />
            </span>
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1">
            <span className="inline-flex items-center gap-1">Install {(materialPrices[BLOCK_RATES.installLaborHrs.dbName] ?? BLOCK_RATES.installLaborHrs.fallback)} hrs/blk
              <RateEditPopover table="labor_rates" name={BLOCK_RATES.installLaborHrs.dbName} category="Columns" mode="coefficient" unitLabel="hrs/blk"
                currentValue={materialPrices[BLOCK_RATES.installLaborHrs.dbName] ?? BLOCK_RATES.installLaborHrs.fallback} onSaved={refreshAllRates} />
            </span>
            <span className="inline-flex items-center gap-1">Excavate {(materialPrices[BLOCK_RATES.excavateLaborHrs.dbName] ?? BLOCK_RATES.excavateLaborHrs.fallback)} hrs/col
              <RateEditPopover table="labor_rates" name={BLOCK_RATES.excavateLaborHrs.dbName} category="Columns" mode="coefficient" unitLabel="hrs/col"
                currentValue={materialPrices[BLOCK_RATES.excavateLaborHrs.dbName] ?? BLOCK_RATES.excavateLaborHrs.fallback} onSaved={refreshAllRates} />
            </span>
            <span className="inline-flex items-center gap-1">Pour {(materialPrices[BLOCK_RATES.pourLaborHrs.dbName] ?? BLOCK_RATES.pourLaborHrs.fallback)} hrs/col
              <RateEditPopover table="labor_rates" name={BLOCK_RATES.pourLaborHrs.dbName} category="Columns" mode="coefficient" unitLabel="hrs/col"
                currentValue={materialPrices[BLOCK_RATES.pourLaborHrs.dbName] ?? BLOCK_RATES.pourLaborHrs.fallback} onSaved={refreshAllRates} />
            </span>
            <span className="inline-flex items-center gap-1">Fill {(materialPrices[BLOCK_RATES.fillLaborHrs.dbName] ?? BLOCK_RATES.fillLaborHrs.fallback)} hrs/blk
              <RateEditPopover table="labor_rates" name={BLOCK_RATES.fillLaborHrs.dbName} category="Columns" mode="coefficient" unitLabel="hrs/blk"
                currentValue={materialPrices[BLOCK_RATES.fillLaborHrs.dbName] ?? BLOCK_RATES.fillLaborHrs.fallback} onSaved={refreshAllRates} />
            </span>
          </div>
        </div>
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
            <span>Blocks per course: <strong>{geo.blocksPerCourse}</strong></span>
            <span>Courses: <strong>{geo.courses}</strong></span>
            <span>Total blocks per column: <strong>{geo.totalBlocks}</strong></span>
            <span>Total blocks (all): <strong>{geo.totalBlocks * n(qty)}</strong></span>
            <span>Rebar per column: <strong>{geo.rebarLF.toFixed(1)} LF</strong></span>
            <span>Footing area: <strong>{geo.footingArea.toFixed(1)} SF</strong></span>
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
                <th className="text-left pb-1 pr-2 font-medium">Finish Type</th>
                <th className="text-left pb-1 pr-2 font-medium">Qty</th>
                <th className="text-left pb-1 pr-2 font-medium text-gray-400">Unit</th>
                <th className="text-right pb-1 pr-2 font-medium text-gray-400">$/Unit</th>
                <th className="text-right pb-1 font-medium text-gray-400">Material $</th>
              </tr>
            </thead>
            <tbody>
              {finishRows.map((row, i) => {
                const rate    = FINISH_TYPES[row.type]
                const isTon   = rate?.unit === 'ton'
                const defCost = isTon ? rate?.costPerTon : rate?.costPerSF
                const cost    = materialPrices[rate?.dbName] ?? defCost ?? 0
                const defLab  = isTon ? rate?.laborHrsPer : rate?.laborHrsPerSF
                const labRate = materialPrices[rate?.laborDbName] ?? defLab ?? 0
                const mat     = n(row.qty) * cost
                return (
                  <tr key={i} className="border-b border-gray-100">
                    <td className="py-1 pr-2">
                      <div className="flex items-center gap-1">
                        <select className="input text-sm py-1 flex-1 min-w-0" value={row.type}
                                onChange={e => updateFinish(i, 'type', e.target.value)}>
                          {Object.keys(FINISH_TYPES).map(t => <option key={t}>{t}</option>)}
                        </select>
                        {rate && (
                          <RateEditPopover table="labor_rates" name={rate.laborDbName} category="Columns"
                            mode="coefficient" unitLabel={`hrs/${rate.unit}`} currentValue={labRate} onSaved={refreshAllRates} />
                        )}
                      </div>
                    </td>
                    <td className="py-1 pr-2">
                      <NumInput value={row.qty} onChange={v => updateFinish(i, 'qty', v)} />
                    </td>
                    <td className="py-1 pr-2 text-xs text-gray-400">{rate?.unit ?? 'SF'}</td>
                    <td className="py-1 text-right text-gray-400 text-xs pr-2">
                      <span className="inline-flex items-center justify-end gap-1">
                        ${cost.toFixed(2)}
                        {rate && (
                          <RateEditPopover table="material_rates" name={rate.dbName} category="Columns"
                            unitLabel={rate.unit} currentValue={cost} onSaved={refreshAllRates} />
                        )}
                      </span>
                    </td>
                    <td className="py-1 text-right text-gray-600 text-xs">{mat > 0 ? `$${mat.toFixed(2)}` : '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <button
            type="button"
            className="mt-1 text-xs text-green-700 hover:text-green-900 font-medium"
            onClick={() => setFinishRows(r => [...r, { type: 'Sand Stucco', qty: '' }])}
          >+ Add row</button>
        </div>
      </div>

      {/* ── Additional Items ── */}
      <div>
        <SectionHeader title="Additional Items" />
        <div className="space-y-2">
          {Object.entries(MISC_RATES).map(([key, rate]) => {
            const q       = n(miscQty[`${key}Qty`])
            const matCost = materialPrices[rate.dbName] ?? rate.matCost
            return (
              <div key={key} className="flex items-center gap-3 py-1.5 border-b border-gray-100">
                <span className="text-xs text-gray-700 flex-1 inline-flex items-center gap-1">
                  {rate.label}
                  <RateEditPopover table="material_rates" name={rate.dbName} category="Columns"
                    unitLabel="ea" currentValue={matCost} onSaved={refreshAllRates} />
                </span>
                <input
                  type="number" step="1"
                  className="input text-sm py-1 w-24"
                  placeholder="Qty"
                  value={miscQty[`${key}Qty`]}
                  onChange={e => setMiscQty(p => ({ ...p, [`${key}Qty`]: e.target.value }))}
                />
                <span className="text-xs text-gray-400 w-24 text-right">
                  {q > 0 ? `$${(q * matCost).toFixed(2)} mat` : '—'}
                </span>
              </div>
            )
          })}
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
                    <input className="input text-sm py-1" value={row.label}
                           onChange={e => updateManual(i, 'label', e.target.value)} />
                  </td>
                  <td className="py-1 pr-2"><NumInput value={row.hours}     onChange={v => updateManual(i, 'hours', v)} /></td>
                  <td className="py-1 pr-2"><NumInput value={row.materials} onChange={v => updateManual(i, 'materials', v)} /></td>
                  <td className="py-1">     <NumInput value={row.subCost}   onChange={v => updateManual(i, 'subCost', v)} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Hours Adjustment */}
      <div className="flex items-center gap-3 bg-gray-50 rounded-lg px-4 py-3">
        <label className="text-sm font-medium text-gray-700 whitespace-nowrap flex-1">Hours Adjustment</label>
        <NumInput value={hoursAdj} onChange={setHoursAdj} placeholder="0" className="w-28" />
        <span className="text-xs text-gray-400">Net: {calc.totalHrs.toFixed(2)} hrs</span>
      </div>


      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <button onClick={onBack} className="btn-secondary flex-1">← Back</button>
        <button onClick={handleSave} disabled={saving} className="btn-primary flex-1">
          {saving ? 'Saving...' : 'Add Module'}
        </button>
      </div>
    </div>
  )
}
