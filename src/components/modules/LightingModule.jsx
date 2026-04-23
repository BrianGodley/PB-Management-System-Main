import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import GpmdBar from './GpmdBar'

// ─────────────────────────────────────────────────────────────────────────────
// Lighting Module — rates and formulas from Excel Lighting Module sheet
// ─────────────────────────────────────────────────────────────────────────────

// Fixture types — dbName matches the seeded name in material_rates (category='Lighting')
// matCostEa is the fallback if the DB row isn't found yet
const FIXTURE_TYPES = [
  { key: 'spotLights',  label: 'Spot Lights',        dbName: 'Spot Light',        wattsEa: 4.5,  vaEa: 7.5, laborHrsEa: 0.5,   matCostEa: 99.00,  unit: 'ea' },
  { key: 'floodLights', label: 'Flood Lights',        dbName: 'Flood Light',       wattsEa: 4.5,  vaEa: 7.5, laborHrsEa: 0.5,   matCostEa: 99.00,  unit: 'ea' },
  { key: 'wallWasher',  label: 'Wall Washer Lights',  dbName: 'Wall Washer Light', wattsEa: 4.5,  vaEa: 7.5, laborHrsEa: 0.5,   matCostEa: 99.00,  unit: 'ea' },
  { key: 'pathLights',  label: 'Path Lights',         dbName: 'Path Light',        wattsEa: 4.1,  vaEa: 5.8, laborHrsEa: 0.5,   matCostEa: 135.45, unit: 'ea' },
  { key: 'stepLights',  label: 'Step Lights',         dbName: 'Step Light',        wattsEa: 0.75, vaEa: 1.3, laborHrsEa: 0.5,   matCostEa: 67.05,  unit: 'ea' },
  { key: 'bistro',      label: 'Bistro Lighting',     dbName: 'Bistro Lighting',   wattsEa: 1,    vaEa: 1,   laborHrsEa: 0.125, matCostEa: 11.52,  unit: 'LF' },
]

// Transformer types — 0.25 hrs labor each
const TRANSFORMER_TYPES = [
  { key: 'xfrm100',  label: '100 Watt',  dbName: 'Transformer 100W',  laborHrs: 0.25, matCost: 205.50 },
  { key: 'xfrm200',  label: '200 Watt',  dbName: 'Transformer 200W',  laborHrs: 0.25, matCost: 222.00 },
  { key: 'xfrm300',  label: '300 Watt',  dbName: 'Transformer 300W',  laborHrs: 0.25, matCost: 237.00 },
  { key: 'xfrm600',  label: '600 Watt',  dbName: 'Transformer 600W',  laborHrs: 0.25, matCost: 367.50 },
  { key: 'xfrm900',  label: '900 Watt',  dbName: 'Transformer 900W',  laborHrs: 0.25, matCost: 520.50 },
  { key: 'xfrm1200', label: '1200 Watt', dbName: 'Transformer 1200W', laborHrs: 0.25, matCost: 666.00 },
]

// Wire & other materials
const WIRE_ITEMS = [
  { key: 'wire250',    label: "12x2 E. Wiring × 250' roll", dbName: "12x2 E. Wiring 250' Roll", matCostEa: 115.00 },
  { key: 'wirePerFt',  label: '12x2 E. Wiring (per foot)',   dbName: '12x2 E. Wiring',           matCostEa: 0.35   },
  { key: 'fxTimer',    label: 'Fx Timer',                    dbName: 'Fx Timer',                  matCostEa: 16.26  },
  { key: 'bistroWire', label: 'Bistro Wire (per foot)',       dbName: 'Bistro Wire',               matCostEa: 4.00   },
]

// 15% material markup applied to all fixture, transformer, and wire materials
const MATERIAL_MARKUP = 0.15

const DEFAULTS = {
  laborRatePerHour: 35,
  laborBurdenPct:   0.29,
  gpmd:             425,
  commissionRate:   0.12,
}

const n = (v) => parseFloat(v) || 0

// ── Calculation ──────────────────────────────────────────────────────────────
// materialPrices: { [dbName]: unit_cost } — overrides hardcoded defaults when available
function calcLighting(state, laborRatePerHour = DEFAULTS.laborRatePerHour, materialPrices = {}, gpmd = DEFAULTS.gpmd) {
  const { difficulty, fixtureQtys, transformerQtys, wireQtys, manualRows } = state

  let fixHrs = 0, fixMat = 0, totalWatts = 0, totalVA = 0
  FIXTURE_TYPES.forEach(f => {
    const qty = n(fixtureQtys[f.key])
    if (qty > 0) {
      const price = materialPrices[f.dbName] ?? f.matCostEa
      totalWatts += qty * f.wattsEa
      totalVA    += qty * f.vaEa
      fixHrs     += qty * f.laborHrsEa
      fixMat     += qty * price
    }
  })

  let xfrmHrs = 0, xfrmMat = 0
  TRANSFORMER_TYPES.forEach(t => {
    const qty = n(transformerQtys[t.key])
    if (qty > 0) {
      const price = materialPrices[t.dbName] ?? t.matCost
      xfrmHrs += qty * t.laborHrs
      xfrmMat += qty * price
    }
  })

  let wireMat = 0
  WIRE_ITEMS.forEach(w => {
    const qty = n(wireQtys[w.key])
    if (qty > 0) {
      const price = materialPrices[w.dbName] ?? w.matCostEa
      wireMat += qty * price
    }
  })

  // 15% markup on all fixture/transformer/wire materials
  const rawMat = fixMat + xfrmMat + wireMat
  const markedUpMat = rawMat * (1 + MATERIAL_MARKUP)

  let manHrs = 0, manMat = 0, manSub = 0
  manualRows.forEach(r => {
    manHrs += n(r.hours); manMat += n(r.materials); manSub += n(r.subCost)
  })

  const subtotalHrs = fixHrs + xfrmHrs
  const diffHrs     = subtotalHrs * (n(difficulty) / 100)
  const totalHrs    = subtotalHrs + diffHrs + manHrs
  const manDays     = totalHrs / 8

  const totalMat  = markedUpMat + manMat
  const laborCost = totalHrs * laborRatePerHour
  const burden     = laborCost * DEFAULTS.laborBurdenPct
  const gp         = manDays * gpmd
  const commission = gp * DEFAULTS.commissionRate
  const subCost    = manSub
  const price      = totalMat + laborCost + burden + gp + commission + subCost

  return { totalHrs, manDays, totalMat, totalWatts, totalVA,
           rawMat, markedUpMat, laborCost, burden, gp, commission, subCost, price }
}

// ── Default blank state ───────────────────────────────────────────────────────
function blankFixtureQtys()     { return Object.fromEntries(FIXTURE_TYPES.map(f => [f.key, ''])) }
function blankTransformerQtys() { return Object.fromEntries(TRANSFORMER_TYPES.map(t => [t.key, ''])) }
function blankWireQtys()        { return Object.fromEntries(WIRE_ITEMS.map(w => [w.key, ''])) }
const DEFAULT_MANUAL_ROWS = [
  { label: 'Misc 1', hours: '', materials: '', subCost: '' },
  { label: 'Misc 2', hours: '', materials: '', subCost: '' },
  { label: 'Misc 3', hours: '', materials: '', subCost: '' },
  { label: 'Misc 4', hours: '', materials: '', subCost: '' },
]

// ── Sub-components ────────────────────────────────────────────────────────────
function SectionHeader({ title, sub }) {
  return (
    <div className="bg-gray-100 px-4 py-2 rounded-lg mb-2">
      <h3 className="text-xs font-bold text-gray-600 uppercase tracking-wider">{title}</h3>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  )
}

function QtyInput({ value, onChange, step = '1' }) {
  return (
    <input
      type="number" step={step} min="0"
      className="input text-sm py-1 w-20"
      placeholder="0"
      value={value}
      onChange={e => onChange(e.target.value)}
    />
  )
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function LightingModule({ onSave, onBack, saving, initialData }) {
  const [laborRatePerHour, setLaborRatePerHour] = useState(
    initialData?.laborRatePerHour ?? DEFAULTS.laborRatePerHour
  )
  const [materialPrices, setMaterialPrices] = useState({})

  useEffect(() => {
    // Fetch labor rate (skip if editing with a saved rate)
    if (!initialData?.laborRatePerHour) {
      supabase.from('company_settings').select('value').eq('key', 'labor_rate_per_hour').single()
        .then(({ data }) => { if (data) setLaborRatePerHour(parseFloat(data.value) || DEFAULTS.laborRatePerHour) })
    }
    // Fetch lighting material rates from Master Rates (material_rates, category='Lighting')
    supabase.from('material_rates').select('name, unit_cost').eq('category', 'Lighting')
      .then(({ data }) => {
        if (data && data.length > 0) {
          const map = {}
          data.forEach(r => { map[r.name] = parseFloat(r.unit_cost) })
          setMaterialPrices(map)
        }
      })
  }, [])

  const gpmd = initialData?.gpmd ?? DEFAULTS.gpmd
  const subGpMarkupRate = initialData?.subGpMarkupRate ?? 0.20

  const [difficulty,      setDifficulty]      = useState(initialData?.difficulty      ?? '')
  const [fixtureQtys,     setFixtureQtys]     = useState(initialData?.fixtureQtys     ?? blankFixtureQtys())
  const [transformerQtys, setTransformerQtys] = useState(initialData?.transformerQtys ?? blankTransformerQtys())
  const [wireQtys,        setWireQtys]        = useState(initialData?.wireQtys        ?? blankWireQtys())
  const [manualRows,      setManualRows]       = useState(initialData?.manualRows      ?? DEFAULT_MANUAL_ROWS)

  const calc = calcLighting({ difficulty, fixtureQtys, transformerQtys, wireQtys, manualRows }, laborRatePerHour, materialPrices, gpmd)

  function updateManual(i, field, val) {
    setManualRows(rows => rows.map((r, idx) => idx === i ? { ...r, [field]: val } : r))
  }

  function handleSave() {
    onSave({
      man_days:      parseFloat(calc.manDays.toFixed(2)),
      material_cost: parseFloat(calc.totalMat.toFixed(2)),
      data: { difficulty, fixtureQtys, transformerQtys, wireQtys, manualRows, laborRatePerHour, gpmd, materialPrices, calc },
    })
  }

  const fmt2 = (v) => `$${n(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  return (
    <div className="space-y-5">
      {/* ── Sticky GPMD bar ── */}
      <div className="sticky top-0 z-20 -mx-6 -mt-5 px-6 pt-2 pb-2 bg-gray-900 shadow-lg">
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

      {/* Difficulty */}
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium text-gray-700 whitespace-nowrap">Difficulty Add</label>
        <div className="relative w-32">
          <input
            type="number" step="any" min="0"
            className="input text-sm py-1.5"
            placeholder="0"
            value={difficulty}
            onChange={e => setDifficulty(e.target.value)}
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">%</span>
        </div>
      </div>

      {/* ── Light Fixtures ── */}
      <div>
        <SectionHeader title="Light Fixtures" sub="Total Watts / VA updates automatically" />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 border-b border-gray-200">
                <th className="text-left pb-1 pr-2 font-medium">Type</th>
                <th className="text-left pb-1 pr-2 font-medium">Qty</th>
                <th className="text-right pb-1 pr-2 font-medium text-gray-400">Watts</th>
                <th className="text-right pb-1 pr-2 font-medium text-gray-400">Labor Hrs</th>
                <th className="text-right pb-1 font-medium text-gray-400">Material $</th>
              </tr>
            </thead>
            <tbody>
              {FIXTURE_TYPES.map(f => {
                const qty = n(fixtureQtys[f.key])
                return (
                  <tr key={f.key} className="border-b border-gray-100">
                    <td className="py-1.5 pr-2 text-xs text-gray-700">
                      {f.label}
                      <span className="text-gray-400 ml-1">({f.unit})</span>
                    </td>
                    <td className="py-1.5 pr-2">
                      <QtyInput
                        value={fixtureQtys[f.key]}
                        onChange={v => setFixtureQtys(p => ({ ...p, [f.key]: v }))}
                        step={f.unit === 'LF' ? '1' : '1'}
                      />
                    </td>
                    <td className="py-1.5 text-right text-gray-400 text-xs pr-2">
                      {qty > 0 ? (qty * f.wattsEa).toFixed(1) : '—'}
                    </td>
                    <td className="py-1.5 text-right text-gray-400 text-xs pr-2">
                      {qty > 0 ? (qty * f.laborHrsEa).toFixed(2) : '—'}
                    </td>
                    <td className="py-1.5 text-right text-gray-600 text-xs">
                      {qty > 0 ? fmt2(qty * f.matCostEa) : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Watts / VA summary */}
        {(calc.totalWatts > 0 || calc.totalVA > 0) && (
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

      {/* ── Transformers ── */}
      <div>
        <SectionHeader title="Transformers" sub="Size transformer(s) based on Total VA above" />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 border-b border-gray-200">
                <th className="text-left pb-1 pr-2 font-medium">Size</th>
                <th className="text-left pb-1 pr-2 font-medium">Qty</th>
                <th className="text-right pb-1 pr-2 font-medium text-gray-400">Labor Hrs</th>
                <th className="text-right pb-1 font-medium text-gray-400">Material $</th>
              </tr>
            </thead>
            <tbody>
              {TRANSFORMER_TYPES.map(t => {
                const qty = n(transformerQtys[t.key])
                return (
                  <tr key={t.key} className="border-b border-gray-100">
                    <td className="py-1.5 pr-2 text-xs text-gray-700">{t.label}</td>
                    <td className="py-1.5 pr-2">
                      <QtyInput
                        value={transformerQtys[t.key]}
                        onChange={v => setTransformerQtys(p => ({ ...p, [t.key]: v }))}
                      />
                    </td>
                    <td className="py-1.5 text-right text-gray-400 text-xs pr-2">
                      {qty > 0 ? (qty * t.laborHrs).toFixed(2) : '—'}
                    </td>
                    <td className="py-1.5 text-right text-gray-600 text-xs">
                      {qty > 0 ? fmt2(qty * t.matCost) : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Wire & Other ── */}
      <div>
        <SectionHeader title="Wire & Other" />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 border-b border-gray-200">
                <th className="text-left pb-1 pr-2 font-medium">Item</th>
                <th className="text-left pb-1 pr-2 font-medium">Qty</th>
                <th className="text-right pb-1 pr-2 font-medium text-gray-400">$/Unit</th>
                <th className="text-right pb-1 font-medium text-gray-400">Material $</th>
              </tr>
            </thead>
            <tbody>
              {WIRE_ITEMS.map(w => {
                const qty = n(wireQtys[w.key])
                return (
                  <tr key={w.key} className="border-b border-gray-100">
                    <td className="py-1.5 pr-2 text-xs text-gray-700">{w.label}</td>
                    <td className="py-1.5 pr-2">
                      <QtyInput
                        value={wireQtys[w.key]}
                        onChange={v => setWireQtys(p => ({ ...p, [w.key]: v }))}
                      />
                    </td>
                    <td className="py-1.5 text-right text-gray-400 text-xs pr-2">
                      ${w.matCostEa.toFixed(2)}
                    </td>
                    <td className="py-1.5 text-right text-gray-600 text-xs">
                      {qty > 0 ? fmt2(qty * w.matCostEa) : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {calc.rawMat > 0 && (
          <p className="text-xs text-gray-400 mt-1.5 px-1">
            Raw materials {fmt2(calc.rawMat)} + 15% markup = <span className="text-gray-600 font-medium">{fmt2(calc.markedUpMat)}</span>
          </p>
        )}
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
                  <td className="py-1 pr-2">
                    <input type="number" step="any" min="0" className="input text-sm py-1 w-20"
                      placeholder="0" value={row.hours}
                      onChange={e => updateManual(i, 'hours', e.target.value)} />
                  </td>
                  <td className="py-1 pr-2">
                    <input type="number" step="any" min="0" className="input text-sm py-1 w-24"
                      placeholder="0" value={row.materials}
                      onChange={e => updateManual(i, 'materials', e.target.value)} />
                  </td>
                  <td className="py-1">
                    <input type="number" step="any" min="0" className="input text-sm py-1 w-24"
                      placeholder="0" value={row.subCost}
                      onChange={e => updateManual(i, 'subCost', e.target.value)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* GPMD summary bar */}
      {calc.totalWatts > 0 && (
        <div className="flex gap-4 justify-center text-xs text-gray-500 bg-gray-50 rounded-lg py-2">
          <span>{calc.totalWatts.toFixed(1)} W total</span>
          <span>·</span>
          <span>{calc.totalVA.toFixed(1)} VA total</span>
        </div>
      )}

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
