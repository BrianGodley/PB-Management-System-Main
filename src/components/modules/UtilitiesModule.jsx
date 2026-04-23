import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import GpmdBar from './GpmdBar'

// ─────────────────────────────────────────────────────────────────────────────
// Utilities Module — fields and calculations from Excel estimator (Utilities Module tab)
// Covers trenching, utility lines (gas/electrical), gas fixtures, and add-ons.
//
// All material costs AND labor time rates are stored in material_rates
// (category = 'Utilities') so they are fully editable in Master Rates.
// Hardcoded values here are fallbacks only, used when the DB row is absent.
// ─────────────────────────────────────────────────────────────────────────────

// dbName = name in material_rates for the material cost row
// laborDbName = name in material_rates for the labor rate row (hrs per unit)
const UTILITY_LINE_TYPES = {
  'PVC Conduit with Electrical': {
    costPerLF: 1.92,  dbName: 'PVC Conduit with Electrical',
    laborPerLF: 0.05, laborDbName: 'PVC Conduit with Electrical - Labor Rate',
  },
  '1" Black Iron Gas Pipe': {
    costPerLF: 2.76,  dbName: '1" Black Iron Gas Pipe',
    laborPerLF: 0.15, laborDbName: '1" Black Iron Gas Pipe - Labor Rate',
  },
  '1-1/2" Black Iron Gas Pipe': {
    costPerLF: 4.23,  dbName: '1-1/2" Black Iron Gas Pipe',
    laborPerLF: 0.20, laborDbName: '1-1/2" Black Iron Gas Pipe - Labor Rate',
  },
}

const FIXTURE_TYPES = {
  '12" Single Gas Ring': {
    cost: 61.75,  dbName: '12" Single Gas Ring',
    laborHrs: 2,  laborDbName: '12" Single Gas Ring - Labor Rate',
  },
}

// Minutes per cubic foot by equipment type (same as Drainage)
const TRENCH_MINS_PER_CF = { Trench: 10, Hand: 12.5 }

const ADD_ITEM_RATES = {
  curbCore: {
    matCost: 250, dbName: 'Curb Core',                label: 'Curb Core *',
    laborHrs: 2,  laborDbName: 'Curb Core - Labor Rate',
  },
  hydrocut: {
    matCost: 50,  dbName: 'Hydrocut Under Hardscape', label: 'Hydrocut Under Hardscape *',
    laborHrs: 2,  laborDbName: 'Hydrocut Under Hardscape - Labor Rate',
  },
}

const DEFAULTS = {
  laborRatePerHour: 35,
  laborBurdenPct:   0.29,
  gpmd:             425,
  commissionRate:   0.12,
}

const n = (v) => parseFloat(v) || 0

function calcUtilities(state, laborRatePerHour = DEFAULTS.laborRatePerHour, materialPrices = {}, gpmd = DEFAULTS.gpmd) {
  const { difficulty, hoursAdj, trenchRows, lineRows, fixtureRows, additionalItems,
          electricSubpanelSubCost, manualRows } = state

  let trenchHrs = 0
  let lineHrs = 0, lineMat = 0
  let fixHrs = 0, fixMat = 0
  let addHrs = 0, addMat = 0
  let manHrs = 0, manMat = 0, manSub = 0

  trenchRows.forEach(r => {
    const lf = n(r.lf), w = n(r.width), d = n(r.depth)
    if (lf > 0 && w > 0 && d > 0) {
      const cf = lf * (w / 12) * (d / 12)
      trenchHrs += (cf * (TRENCH_MINS_PER_CF[r.equipment] || 10)) / 60
    }
  })

  lineRows.forEach(r => {
    const lf   = n(r.lf)
    const rate = UTILITY_LINE_TYPES[r.type]
    if (lf > 0 && rate) {
      const costPerLF  = materialPrices[rate.dbName]      ?? rate.costPerLF
      const laborPerLF = materialPrices[rate.laborDbName]  ?? rate.laborPerLF
      lineMat += lf * costPerLF
      lineHrs += lf * laborPerLF
    }
  })

  fixtureRows.forEach(r => {
    const qty  = n(r.qty)
    const rate = FIXTURE_TYPES[r.type]
    if (qty > 0 && rate) {
      const cost     = materialPrices[rate.dbName]      ?? rate.cost
      const laborHrs = materialPrices[rate.laborDbName]  ?? rate.laborHrs
      fixMat += qty * cost
      fixHrs += qty * laborHrs
    }
  })

  Object.entries(ADD_ITEM_RATES).forEach(([key, rate]) => {
    const qty = n(additionalItems[`${key}Qty`])
    if (qty > 0) {
      const matCost  = materialPrices[rate.dbName]      ?? rate.matCost
      const laborHrs = materialPrices[rate.laborDbName]  ?? rate.laborHrs
      addHrs += qty * laborHrs
      addMat += qty * matCost
    }
  })

  manualRows.forEach(r => {
    manHrs += n(r.hours); manMat += n(r.materials); manSub += n(r.subCost)
  })

  const subpanelSub = n(electricSubpanelSubCost)

  const baseHrs   = trenchHrs + lineHrs + fixHrs + addHrs + manHrs
  const diffMod   = 1 + (n(difficulty) / 100)
  const adjHrs    = n(hoursAdj)
  const totalHrs  = (baseHrs * diffMod) + adjHrs
  const manDays   = totalHrs / 8
  const totalMat  = lineMat + fixMat + addMat + manMat
  const laborCost = totalHrs * laborRatePerHour
  const burden    = laborCost * DEFAULTS.laborBurdenPct
  const gp        = manDays * gpmd
  const commission = gp * DEFAULTS.commissionRate
  const subCost   = manSub + subpanelSub
  const price     = totalMat + laborCost + burden + gp + commission + subCost

  return { totalHrs, manDays, totalMat, laborCost, burden, gp, commission, subCost, price,
           trenchHrs, lineHrs, lineMat, fixHrs, fixMat, addHrs, addMat }
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
      type="number" step="any" min="0"
      className={`input text-sm py-1.5 ${className}`}
      placeholder={placeholder}
      value={value}
      onChange={e => onChange(e.target.value)}
    />
  )
}

// ── Default blank rows ────────────────────────────────────────────────────────
const DEFAULT_TRENCH_ROWS = [
  { equipment: 'Trench', lf: '', width: '', depth: '' },
  { equipment: 'Trench', lf: '', width: '', depth: '' },
  { equipment: 'Hand',   lf: '', width: '', depth: '' },
]
const DEFAULT_LINE_ROWS = [
  { type: 'PVC Conduit with Electrical', lf: '' },
  { type: '1" Black Iron Gas Pipe',      lf: '' },
  { type: '1-1/2" Black Iron Gas Pipe',  lf: '' },
]
const DEFAULT_FIXTURE_ROWS = [
  { type: '12" Single Gas Ring', qty: '' },
  { type: '12" Single Gas Ring', qty: '' },
]
const DEFAULT_ADDITIONAL = {
  curbCoreQty: '',
  hydrocutQty: '',
  permitRequired: false,
}
const DEFAULT_MANUAL_ROWS = [
  { label: 'Misc 1', hours: '', materials: '', subCost: '' },
  { label: 'Misc 2', hours: '', materials: '', subCost: '' },
  { label: 'Misc 3', hours: '', materials: '', subCost: '' },
  { label: 'Misc 4', hours: '', materials: '', subCost: '' },
]

// ── Main Component ────────────────────────────────────────────────────────────
export default function UtilitiesModule({ projectName, onSave, onBack, saving, initialData }) {
  const [laborRatePerHour, setLaborRatePerHour] = useState(
    initialData?.laborRatePerHour ?? DEFAULTS.laborRatePerHour
  )
  const [materialPrices, setMaterialPrices] = useState(
    initialData?.materialPrices ?? {}
  )
  const [pricesLoading, setPricesLoading] = useState(!initialData?.materialPrices)

  useEffect(() => {
    if (!initialData?.laborRatePerHour) {
      supabase
        .from('company_settings')
        .select('value')
        .eq('key', 'labor_rate_per_hour')
        .single()
        .then(({ data }) => {
          if (data) setLaborRatePerHour(parseFloat(data.value) || DEFAULTS.laborRatePerHour)
        })
    }

    if (initialData?.materialPrices) return
    Promise.all([
      supabase.from('material_rates').select('name, unit_cost').eq('category', 'Utilities'),
      supabase.from('labor_rates').select('name, rate').eq('category', 'Utilities'),
    ]).then(([matRes, labRes]) => {
      const prices = {}
      ;(matRes.data || []).forEach(r => { prices[r.name] = parseFloat(r.unit_cost) || 0 })
      ;(labRes.data  || []).forEach(r => { prices[r.name] = parseFloat(r.rate)     || 0 })
      setMaterialPrices(prices)
      setPricesLoading(false)
    })
  }, [])

  const gpmd          = initialData?.gpmd ?? DEFAULTS.gpmd
  const subGpMarkupRate = initialData?.subGpMarkupRate ?? 0.20

  const [difficulty,             setDifficulty]            = useState(initialData?.difficulty             ?? '')
  const [hoursAdj,               setHoursAdj]              = useState(initialData?.hoursAdj               ?? '')
  const [trenchRows,             setTrenchRows]            = useState(initialData?.trenchRows             ?? DEFAULT_TRENCH_ROWS)
  const [lineRows,               setLineRows]              = useState(initialData?.lineRows               ?? DEFAULT_LINE_ROWS)
  const [fixtureRows,            setFixtureRows]           = useState(initialData?.fixtureRows            ?? DEFAULT_FIXTURE_ROWS)
  const [additionalItems,        setAdditionalItems]       = useState(initialData?.additionalItems        ?? DEFAULT_ADDITIONAL)
  const [electricSubpanelSubCost,setElectricSubpanelSubCost] = useState(initialData?.electricSubpanelSubCost ?? '')
  const [manualRows,             setManualRows]            = useState(initialData?.manualRows             ?? DEFAULT_MANUAL_ROWS)

  const calc = calcUtilities(
    { difficulty, hoursAdj, trenchRows, lineRows, fixtureRows, additionalItems,
      electricSubpanelSubCost, manualRows },
    laborRatePerHour, materialPrices, gpmd,
  )

  function updateTrench(i, field, val) {
    setTrenchRows(rows => rows.map((r, idx) => idx === i ? { ...r, [field]: val } : r))
  }
  function updateLine(i, field, val) {
    setLineRows(rows => rows.map((r, idx) => idx === i ? { ...r, [field]: val } : r))
  }
  function updateFixture(i, field, val) {
    setFixtureRows(rows => rows.map((r, idx) => idx === i ? { ...r, [field]: val } : r))
  }
  function updateManual(i, field, val) {
    setManualRows(rows => rows.map((r, idx) => idx === i ? { ...r, [field]: val } : r))
  }

  function handleSave() {
    onSave({
      man_days:      parseFloat(calc.manDays.toFixed(2)),
      material_cost: parseFloat(calc.totalMat.toFixed(2)),
      data: {
        difficulty, hoursAdj, trenchRows, lineRows, fixtureRows, additionalItems,
        electricSubpanelSubCost, manualRows, laborRatePerHour, gpmd,
        materialPrices,
        calc,
      },
    })
  }

  return (
    <div className="space-y-5">
      {/* ── Sticky GPMD bar ── */}
      <div className="sticky top-0 z-20 -mx-6 -mt-5 px-6 pt-2 pb-2 bg-gray-900 shadow-lg">
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

      {/* ── Trenching ── */}
      <div>
        <SectionHeader title="Trenching" />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 border-b border-gray-200">
                <th className="text-left pb-1 pr-2 font-medium">Equipment</th>
                <th className="text-left pb-1 pr-2 font-medium">Linear Feet</th>
                <th className="text-left pb-1 pr-2 font-medium">Width (In)</th>
                <th className="text-left pb-1 font-medium">Depth (In)</th>
                <th className="text-right pb-1 font-medium text-gray-400">Est. Hrs</th>
              </tr>
            </thead>
            <tbody>
              {trenchRows.map((row, i) => {
                const lf = n(row.lf), w = n(row.width), d = n(row.depth)
                const cf  = lf > 0 && w > 0 && d > 0 ? lf * (w / 12) * (d / 12) : 0
                const hrs = cf > 0 ? (cf * (TRENCH_MINS_PER_CF[row.equipment] || 10)) / 60 : 0
                return (
                  <tr key={i} className="border-b border-gray-100">
                    <td className="py-1 pr-2">
                      <select className="input text-sm py-1" value={row.equipment}
                              onChange={e => updateTrench(i, 'equipment', e.target.value)}>
                        <option>Trench</option>
                        <option>Hand</option>
                      </select>
                    </td>
                    <td className="py-1 pr-2"><NumInput value={row.lf}    onChange={v => updateTrench(i, 'lf', v)} /></td>
                    <td className="py-1 pr-2"><NumInput value={row.width} onChange={v => updateTrench(i, 'width', v)} /></td>
                    <td className="py-1">    <NumInput value={row.depth} onChange={v => updateTrench(i, 'depth', v)} /></td>
                    <td className="py-1 text-right text-gray-500 text-xs pl-2">{hrs > 0 ? hrs.toFixed(2) : '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <button
            type="button"
            className="mt-1 text-xs text-green-700 hover:text-green-900 font-medium"
            onClick={() => setTrenchRows(r => [...r, { equipment: 'Trench', lf: '', width: '', depth: '' }])}
          >+ Add row</button>
        </div>
      </div>

      {/* ── Utility Lines ── */}
      <div>
        <SectionHeader title="Utility Lines" />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 border-b border-gray-200">
                <th className="text-left pb-1 pr-2 font-medium">Line Type</th>
                <th className="text-left pb-1 pr-2 font-medium">Linear Feet</th>
                <th className="text-right pb-1 pr-2 font-medium text-gray-400">$/LF</th>
                <th className="text-right pb-1 font-medium text-gray-400">Material $</th>
              </tr>
            </thead>
            <tbody>
              {lineRows.map((row, i) => {
                const rate      = UTILITY_LINE_TYPES[row.type]
                const costPerLF = materialPrices[rate?.dbName] ?? rate?.costPerLF ?? 0
                const mat       = n(row.lf) * costPerLF
                return (
                  <tr key={i} className="border-b border-gray-100">
                    <td className="py-1 pr-2">
                      <select className="input text-sm py-1" value={row.type}
                              onChange={e => updateLine(i, 'type', e.target.value)}>
                        {Object.keys(UTILITY_LINE_TYPES).map(t => <option key={t}>{t}</option>)}
                      </select>
                    </td>
                    <td className="py-1 pr-2"><NumInput value={row.lf} onChange={v => updateLine(i, 'lf', v)} /></td>
                    <td className="py-1 text-right text-gray-400 text-xs pr-2">${costPerLF.toFixed(2)}</td>
                    <td className="py-1 text-right text-gray-600 text-xs">{mat > 0 ? `$${mat.toFixed(2)}` : '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <button
            type="button"
            className="mt-1 text-xs text-green-700 hover:text-green-900 font-medium"
            onClick={() => setLineRows(r => [...r, { type: 'PVC Conduit with Electrical', lf: '' }])}
          >+ Add row</button>
        </div>
      </div>

      {/* ── Fixtures ── */}
      <div>
        <SectionHeader title="Gas Fixtures" />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 border-b border-gray-200">
                <th className="text-left pb-1 pr-2 font-medium">Fixture</th>
                <th className="text-left pb-1 pr-2 font-medium">Qty</th>
                <th className="text-right pb-1 pr-2 font-medium text-gray-400">$/Ea</th>
                <th className="text-right pb-1 font-medium text-gray-400">Material $</th>
              </tr>
            </thead>
            <tbody>
              {fixtureRows.map((row, i) => {
                const rate = FIXTURE_TYPES[row.type]
                const cost = materialPrices[rate?.dbName] ?? rate?.cost ?? 0
                const mat  = n(row.qty) * cost
                return (
                  <tr key={i} className="border-b border-gray-100">
                    <td className="py-1 pr-2">
                      <select className="input text-sm py-1" value={row.type}
                              onChange={e => updateFixture(i, 'type', e.target.value)}>
                        {Object.keys(FIXTURE_TYPES).map(t => <option key={t}>{t}</option>)}
                      </select>
                    </td>
                    <td className="py-1 pr-2"><NumInput value={row.qty} onChange={v => updateFixture(i, 'qty', v)} /></td>
                    <td className="py-1 text-right text-gray-400 text-xs pr-2">${cost.toFixed(2)}</td>
                    <td className="py-1 text-right text-gray-600 text-xs">{mat > 0 ? `$${mat.toFixed(2)}` : '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <button
            type="button"
            className="mt-1 text-xs text-green-700 hover:text-green-900 font-medium"
            onClick={() => setFixtureRows(r => [...r, { type: '12" Single Gas Ring', qty: '' }])}
          >+ Add row</button>
        </div>
      </div>

      {/* ── Additional Items ── */}
      <div>
        <SectionHeader title="Additional Items" />
        <div className="space-y-2">

          {/* Electric Sub-panel — sub cost entry */}
          <div className="flex items-center gap-3 py-1.5 border-b border-gray-100">
            <span className="text-xs text-gray-700 flex-1">Electric Sub-panel</span>
            <div className="relative w-36">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
              <input
                type="number" step="any" min="0"
                className="input text-sm py-1 pl-6"
                placeholder="Sub cost"
                value={electricSubpanelSubCost}
                onChange={e => setElectricSubpanelSubCost(e.target.value)}
              />
            </div>
            <span className="text-xs text-gray-400 w-20 text-right">sub cost</span>
          </div>

          {/* Curb Core & Hydrocut — qty based */}
          {Object.entries(ADD_ITEM_RATES).map(([key, rate]) => {
            const qty     = n(additionalItems[`${key}Qty`])
            const matCost = materialPrices[rate.dbName] ?? rate.matCost
            return (
              <div key={key} className="flex items-center gap-3 py-1.5 border-b border-gray-100">
                <span className="text-xs text-gray-700 flex-1">{rate.label}</span>
                <input
                  type="number" step="1" min="0"
                  className="input text-sm py-1 w-20"
                  placeholder="Qty"
                  value={additionalItems[`${key}Qty`]}
                  onChange={e => setAdditionalItems(p => ({ ...p, [`${key}Qty`]: e.target.value }))}
                />
                <span className="text-xs text-gray-400 w-20 text-right">
                  {qty > 0 ? `$${(qty * matCost).toLocaleString()} mat` : '—'}
                </span>
              </div>
            )
          })}

          {/* Permit Required */}
          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer py-1">
            <input
              type="checkbox"
              checked={additionalItems.permitRequired}
              onChange={e => setAdditionalItems(p => ({ ...p, permitRequired: e.target.checked }))}
              className="rounded"
            />
            * Permit Required
          </label>
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
        <span className="text-xs text-gray-400">
          Net: {(calc.totalHrs).toFixed(2)} hrs
        </span>
      </div>


      {/* ── Actions ── */}
      <div className="flex gap-3 pt-2">
        <button onClick={onBack} className="btn-secondary flex-1">← Back</button>
        <button onClick={handleSave} disabled={saving} className="btn-primary flex-1">
          {saving ? 'Saving...' : 'Add Module'}
        </button>
      </div>
    </div>
  )
}
