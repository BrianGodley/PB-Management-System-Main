import WorkTypeChooser from './WorkTypeChooser'
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import GpmdBar from './GpmdBar'
import ModuleNotesField from './ModuleNotesField'
import RateEditPopover from '../RateEditPopover'
import { fetchSalesTaxRate } from '../../lib/companyDefaults'
import { calcWalkAccessLabor, DEFAULT_WALK_ACCESS_PACE_LF_PER_MIN } from '../../lib/walkAccess'

// ─────────────────────────────────────────────────────────────────────────────
// Lighting Module — rates and formulas from Excel Lighting Module sheet
// ─────────────────────────────────────────────────────────────────────────────

// Fixture types — dbName matches the seeded name in material_rates (category='Lighting')
// matCostEa is the fallback if the DB row isn't found yet
// labDbName resolves the per-fixture labor coefficient from labor_rates so it can
// be edited from the inline calculator icon next to the row.
const FIXTURE_TYPES = [
  {
    key: 'spotLights',
    label: 'Spot Lights',
    dbName: 'Spot Light',
    labDbName: 'Lighting - Spot Light Labor',
    wattsEa: 4.5,
    vaEa: 7.5,
    laborHrsEa: 0.5,
    matCostEa: 99.0,
    unit: 'ea',
  },
  {
    key: 'floodLights',
    label: 'Flood Lights',
    dbName: 'Flood Light',
    labDbName: 'Lighting - Flood Light Labor',
    wattsEa: 4.5,
    vaEa: 7.5,
    laborHrsEa: 0.5,
    matCostEa: 99.0,
    unit: 'ea',
  },
  {
    key: 'wallWasher',
    label: 'Wall Washer Lights',
    dbName: 'Wall Washer Light',
    labDbName: 'Lighting - Wall Washer Light Labor',
    wattsEa: 4.5,
    vaEa: 7.5,
    laborHrsEa: 0.5,
    matCostEa: 99.0,
    unit: 'ea',
  },
  {
    key: 'pathLights',
    label: 'Path Lights',
    dbName: 'Path Light',
    labDbName: 'Lighting - Path Light Labor',
    wattsEa: 4.1,
    vaEa: 5.8,
    laborHrsEa: 0.5,
    matCostEa: 135.45,
    unit: 'ea',
  },
  {
    key: 'stepLights',
    label: 'Step Lights',
    dbName: 'Step Light',
    labDbName: 'Lighting - Step Light Labor',
    wattsEa: 0.75,
    vaEa: 1.3,
    laborHrsEa: 0.5,
    matCostEa: 67.05,
    unit: 'ea',
  },
  {
    key: 'bistro',
    label: 'Bistro Lighting',
    dbName: 'Bistro Lighting',
    labDbName: 'Lighting - Bistro Labor',
    wattsEa: 1,
    vaEa: 1,
    laborHrsEa: 0.125,
    matCostEa: 11.52,
    unit: 'LF',
  },
]

// Transformer types — 0.25 hrs labor each
const TRANSFORMER_TYPES = [
  {
    key: 'xfrm100',
    label: '100 Watt',
    dbName: 'Transformer 100W',
    labDbName: 'Lighting - Transformer 100W Labor',
    laborHrs: 0.25,
    matCost: 205.5,
  },
  {
    key: 'xfrm200',
    label: '200 Watt',
    dbName: 'Transformer 200W',
    labDbName: 'Lighting - Transformer 200W Labor',
    laborHrs: 0.25,
    matCost: 222.0,
  },
  {
    key: 'xfrm300',
    label: '300 Watt',
    dbName: 'Transformer 300W',
    labDbName: 'Lighting - Transformer 300W Labor',
    laborHrs: 0.25,
    matCost: 237.0,
  },
  {
    key: 'xfrm600',
    label: '600 Watt',
    dbName: 'Transformer 600W',
    labDbName: 'Lighting - Transformer 600W Labor',
    laborHrs: 0.25,
    matCost: 367.5,
  },
  {
    key: 'xfrm900',
    label: '900 Watt',
    dbName: 'Transformer 900W',
    labDbName: 'Lighting - Transformer 900W Labor',
    laborHrs: 0.25,
    matCost: 520.5,
  },
  {
    key: 'xfrm1200',
    label: '1200 Watt',
    dbName: 'Transformer 1200W',
    labDbName: 'Lighting - Transformer 1200W Labor',
    laborHrs: 0.25,
    matCost: 666.0,
  },
]

// Wire & other materials
const WIRE_ITEMS = [
  {
    key: 'wire250',
    label: "12x2 E. Wiring × 250' roll",
    dbName: "12x2 E. Wiring 250' Roll",
    matCostEa: 115.0,
  },
  {
    key: 'wirePerFt',
    label: '12x2 E. Wiring (per foot)',
    dbName: '12x2 E. Wiring',
    matCostEa: 0.35,
  },
  { key: 'fxTimer', label: 'Fx Timer', dbName: 'Fx Timer', matCostEa: 16.26 },
  { key: 'bistroWire', label: 'Bistro Wire (per foot)', dbName: 'Bistro Wire', matCostEa: 4.0 },
]

// 15% material markup applied to all fixture, transformer, and wire materials
const MATERIAL_MARKUP = 0.15

const DEFAULTS = {
  laborRatePerHour: 35,
  laborBurdenPct: 0.29,
  gpmd: 425,
  commissionRate: 0.12,
}

const n = v => parseFloat(v) || 0

// ── Calculation ──────────────────────────────────────────────────────────────
// materialPrices: { [dbName]: unit_cost } — overrides hardcoded defaults when available
// laborRates:     { [labDbName]: hours_per_unit } — overrides hardcoded labor defaults
function calcLighting(
  state,
  laborRatePerHour = DEFAULTS.laborRatePerHour,
  materialPrices = {},
  laborRates = {},
  gpmd = DEFAULTS.gpmd,
  walkAccess = null,
  laborBurdenPct = DEFAULTS.laborBurdenPct
) {
  const _pace = parseFloat(walkAccess?.paceLfPerMin) || DEFAULT_WALK_ACCESS_PACE_LF_PER_MIN
  const { difficulty, hoursAdj, fixtureQtys, transformerQtys, wireQtys, manualRows } = state

  let fixHrs = 0,
    fixMat = 0,
    totalWatts = 0,
    totalVA = 0
  FIXTURE_TYPES.forEach(f => {
    const qty = n(fixtureQtys[f.key])
    if (qty > 0) {
      const price = materialPrices[f.dbName] ?? f.matCostEa
      const labHrsEa = laborRates[f.labDbName] ?? f.laborHrsEa
      totalWatts += qty * f.wattsEa
      totalVA += qty * f.vaEa
      fixHrs += qty * labHrsEa
      fixMat += qty * price
    }
  })

  let xfrmHrs = 0,
    xfrmMat = 0
  TRANSFORMER_TYPES.forEach(t => {
    const qty = n(transformerQtys[t.key])
    if (qty > 0) {
      const price = materialPrices[t.dbName] ?? t.matCost
      const labHrsEa = laborRates[t.labDbName] ?? t.laborHrs
      xfrmHrs += qty * labHrsEa
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

  let manHrs = 0,
    manMat = 0,
    manSub = 0
  manualRows.forEach(r => {
    manHrs += n(r.hours)
    manMat += n(r.materials)
    manSub += n(r.subCost)
  })

  const subtotalHrs = fixHrs + xfrmHrs
  const diffHrs = subtotalHrs * (n(difficulty) / 100)
  const _preWalkHrs = subtotalHrs + diffHrs + manHrs + (parseFloat(hoursAdj) || 0)
  const walkHrs = calcWalkAccessLabor(_preWalkHrs, state.distanceLF, { paceLfPerMin: _pace })
  const totalHrs = _preWalkHrs + walkHrs
  const manDays = totalHrs / 8

  const totalMat = markedUpMat + manMat
  const laborCost = totalHrs * laborRatePerHour
  const burden = laborCost * (n(laborBurdenPct) || DEFAULTS.laborBurdenPct)
  const gp = manDays * gpmd
  const commission = gp * DEFAULTS.commissionRate
  const subCost = manSub
  const price = totalMat + laborCost + burden + gp + commission + subCost

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
    commission,
    subCost,
    price,
  }
}

// ── Default blank state ───────────────────────────────────────────────────────
function blankFixtureQtys() {
  return Object.fromEntries(FIXTURE_TYPES.map(f => [f.key, '']))
}
function blankTransformerQtys() {
  return Object.fromEntries(TRANSFORMER_TYPES.map(t => [t.key, '']))
}
function blankWireQtys() {
  return Object.fromEntries(WIRE_ITEMS.map(w => [w.key, '']))
}
const DEFAULT_MANUAL_ROWS = [
  { label: 'Misc 1', hours: '', materials: '', subCost: '' },
  { label: 'Misc 2', hours: '', materials: '', subCost: '' },
  { label: 'Misc 3', hours: '', materials: '', subCost: '' },
  { label: 'Misc 4', hours: '', materials: '', subCost: '' },
]

// ── Sub-components ────────────────────────────────────────────────────────────
function SectionHeader({ title, sub }) {
  return (
    <div className="bg-gray-50 rounded-lg px-4 py-2.5 border border-gray-200 mb-2">
      <h3 className="text-xs font-bold text-gray-600 uppercase tracking-wider">{title}</h3>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  )
}

function QtyInput({ value, onChange, step = '1' }) {
  return (
    <input
      type="number"
      step={step}
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
  const [laborBurdenPct, setLaborBurdenPct] = useState(
    initialData?.laborBurdenPct ?? DEFAULTS.laborBurdenPct
  )

  // Free-text notes for this module — Sam writes auto-generated
  // takeoffs here via create_estimate_from_takeoff, and the user can
  // overwrite / append their own.
  const [notes, setNotes] = useState(initialData?.notes ?? '')
  const [distanceLF, setDistanceLF] = useState(initialData?.distanceLF ?? '')
  const [walkAccess, setWalkAccess] = useState(
    initialData?.walkAccess ?? {
      paceLfPerMin: DEFAULT_WALK_ACCESS_PACE_LF_PER_MIN,
    }
  )
  const [materialPrices, setMaterialPrices] = useState({})
  const [laborRates, setLaborRates] = useState({})

  // Re-fetch lighting material + labor rate maps. Used on mount and after edits.
  const refreshAllRates = useCallback(async () => {
    const [matRes, labRes] = await Promise.all([
      supabase.from('material_rates').select('name, unit_cost').eq('category', 'Lighting'),
      supabase.from('labor_rates').select('name, rate').eq('category', 'Lighting'),
    ])
    if (matRes.data) {
      const m = {}
      matRes.data.forEach(r => {
        m[r.name] = parseFloat(r.unit_cost)
      })
      setMaterialPrices(m)
    }
    if (labRes.data) {
      const m = {}
      labRes.data.forEach(r => {
        m[r.name] = parseFloat(r.rate)
      })
      setLaborRates(m)
    }
  }, [])

  useEffect(() => {
    // Fetch labor rate (skip if editing with a saved rate)
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
    refreshAllRates()
  }, [refreshAllRates])

  const gpmd = initialData?.gpmd ?? DEFAULTS.gpmd
  const subGpMarkupRate = initialData?.subGpMarkupRate ?? 0.2

  const [difficulty, setDifficulty] = useState(initialData?.difficulty ?? '')
  const [hoursAdj, setHoursAdj] = useState(initialData?.hoursAdj ?? '')
  const [crewType, setCrewType] = useState(initialData?.crewType ?? 'Landscape')
  const [subType, setSubType] = useState(initialData?.subType ?? 'In-House')
  const [fixtureQtys, setFixtureQtys] = useState(initialData?.fixtureQtys ?? blankFixtureQtys())
  const [transformerQtys, setTransformerQtys] = useState(
    initialData?.transformerQtys ?? blankTransformerQtys()
  )
  const [wireQtys, setWireQtys] = useState(initialData?.wireQtys ?? blankWireQtys())
  const [manualRows, setManualRows] = useState(initialData?.manualRows ?? DEFAULT_MANUAL_ROWS)

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

  const calcRaw = calcLighting(
    { difficulty, hoursAdj, fixtureQtys, transformerQtys, wireQtys, manualRows, distanceLF },
    laborRatePerHour,
    materialPrices,
    laborRates,
    gpmd,
    walkAccess,
    laborBurdenPct
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
        fixtureQtys,
        transformerQtys,
        wireQtys,
        manualRows,
        laborRatePerHour,
        laborBurdenPct,
        gpmd,
        materialPrices,
        calc,
      },
    })
  }

  const fmt2 = v =>
    `$${n(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  return (
    <div className="space-y-5">
      {/* ── Sticky GPMD bar ── */}
      <div className="sticky top-0 z-20 -mx-6 px-6 pt-1 pb-1 bg-gray-900 shadow-lg">
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

      {/* Notes — pinned in its own sticky container just below the
          GPMD bar. Plain white textarea, no card chrome. */}
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

      {/* Settings */}
      <SectionHeader title="Settings" />
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
                const matPrice = materialPrices[f.dbName] ?? f.matCostEa
                const labHrsEa = laborRates[f.labDbName] ?? f.laborHrsEa
                return (
                  <tr key={f.key} className="border-b border-gray-100">
                    <td className="py-1.5 pr-2 text-xs text-gray-700">
                      <span className="inline-flex items-center gap-1">
                        {f.label}
                        <span className="text-gray-400">({f.unit})</span>
                        <RateEditPopover
                          table="material_rates"
                          name={f.dbName}
                          category="Lighting"
                          unitLabel={f.unit}
                          currentValue={matPrice}
                          onSaved={refreshAllRates}
                        />
                        <RateEditPopover
                          table="labor_rates"
                          name={f.labDbName}
                          category="Lighting"
                          mode="coefficient"
                          unitLabel={`hrs/${f.unit}`}
                          currentValue={labHrsEa}
                          onSaved={refreshAllRates}
                        />
                      </span>
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
                      {qty > 0 ? (qty * labHrsEa).toFixed(2) : '—'}
                    </td>
                    <td className="py-1.5 text-right text-gray-600 text-xs">
                      {qty > 0 ? fmt2(qty * matPrice) : '—'}
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
                const matPrice = materialPrices[t.dbName] ?? t.matCost
                const labHrsEa = laborRates[t.labDbName] ?? t.laborHrs
                return (
                  <tr key={t.key} className="border-b border-gray-100">
                    <td className="py-1.5 pr-2 text-xs text-gray-700">
                      <span className="inline-flex items-center gap-1">
                        {t.label}
                        <RateEditPopover
                          table="material_rates"
                          name={t.dbName}
                          category="Lighting"
                          unitLabel="ea"
                          currentValue={matPrice}
                          onSaved={refreshAllRates}
                        />
                        <RateEditPopover
                          table="labor_rates"
                          name={t.labDbName}
                          category="Lighting"
                          mode="coefficient"
                          unitLabel="hrs/ea"
                          currentValue={labHrsEa}
                          onSaved={refreshAllRates}
                        />
                      </span>
                    </td>
                    <td className="py-1.5 pr-2">
                      <QtyInput
                        value={transformerQtys[t.key]}
                        onChange={v => setTransformerQtys(p => ({ ...p, [t.key]: v }))}
                      />
                    </td>
                    <td className="py-1.5 text-right text-gray-400 text-xs pr-2">
                      {qty > 0 ? (qty * labHrsEa).toFixed(2) : '—'}
                    </td>
                    <td className="py-1.5 text-right text-gray-600 text-xs">
                      {qty > 0 ? fmt2(qty * matPrice) : '—'}
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
                const matPrice = materialPrices[w.dbName] ?? w.matCostEa
                return (
                  <tr key={w.key} className="border-b border-gray-100">
                    <td className="py-1.5 pr-2 text-xs text-gray-700">
                      <span className="inline-flex items-center gap-1">
                        {w.label}
                        <RateEditPopover
                          table="material_rates"
                          name={w.dbName}
                          category="Lighting"
                          unitLabel="ea"
                          currentValue={matPrice}
                          onSaved={refreshAllRates}
                        />
                      </span>
                    </td>
                    <td className="py-1.5 pr-2">
                      <QtyInput
                        value={wireQtys[w.key]}
                        onChange={v => setWireQtys(p => ({ ...p, [w.key]: v }))}
                      />
                    </td>
                    <td className="py-1.5 text-right text-gray-400 text-xs pr-2">
                      ${matPrice.toFixed(2)}
                    </td>
                    <td className="py-1.5 text-right text-gray-600 text-xs">
                      {qty > 0 ? fmt2(qty * matPrice) : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {calc.rawMat > 0 && (
          <p className="text-xs text-gray-400 mt-1.5 px-1">
            Raw materials {fmt2(calc.rawMat)} + 15% markup ={' '}
            <span className="text-gray-600 font-medium">{fmt2(calc.markedUpMat)}</span>
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
        <button onClick={onBack} className="btn-secondary flex-1">
          ← Back
        </button>
        <button onClick={handleSave} disabled={saving} className="btn-primary flex-1">
          {saving ? 'Saving...' : 'Add Module'}
        </button>
      </div>
    </div>
  )
}
