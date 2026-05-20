import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import GpmdBar from './GpmdBar'
import RateEditPopover from '../RateEditPopover'
import { fetchSalesTaxRate } from '../../lib/companyDefaults'
import { calcWalkAccessLabor, DEFAULT_WALK_ACCESS_PACE_LF_PER_MIN } from '../../lib/walkAccess'

// ─────────────────────────────────────────────────────────────────────────────
// Drainage Module — fields and calculations from Excel estimator
// Material prices are fetched live from material_rates (category='Drainage')
// so changes in Master Rates are reflected here automatically.
// ─────────────────────────────────────────────────────────────────────────────

// dbName must match the name column in material_rates exactly
const PIPE_TYPES = {
  '4" SDR 35':      { laborPerLF: 0.0495, costPerLF: 2.26, dbName: '4" SDR 35 Pipe'      },
  '3" SDR 35':      { laborPerLF: 0.045,  costPerLF: 1.48, dbName: '3" SDR 35 Pipe'      },
  '6" SDR 35':      { laborPerLF: 0.06,   costPerLF: 3.72, dbName: '6" SDR 35 Pipe'      },
  '4" Triple Wall': { laborPerLF: 0.05,   costPerLF: 1.03, dbName: '4" Triple Wall Pipe' },
  '3" Triple Wall': { laborPerLF: 0.045,  costPerLF: 0.86, dbName: '3" Triple Wall Pipe' },
  '4" Perforated':  { laborPerLF: 0.05,   costPerLF: 2.26, dbName: '4" Perforated Pipe'  },
  '3" Perforated':  { laborPerLF: 0.045,  costPerLF: 1.48, dbName: '3" Perforated Pipe'  },
}

const FIXTURE_TYPES = {
  '3" Area Drain':         { laborHrs: 0.495, cost: 3.27,  dbName: '3" Area Drain'         },
  '4" Area Drain':         { laborHrs: 0.495, cost: 1.90,  dbName: '4" Area Drain'         },
  '3" Atrium Drain':       { laborHrs: 0.495, cost: 9.59,  dbName: '3" Atrium Drain'       },
  '4" Atrium Drain':       { laborHrs: 0.495, cost: 7.19,  dbName: '4" Atrium Drain'       },
  '4" Brass Area Drain':   { laborHrs: 0.495, cost: 16.36, dbName: '4" Brass Area Drain'   },
  '3" Brass Area Drain':   { laborHrs: 0.495, cost: 16.36, dbName: '3" Brass Area Drain'   },
  'Downspout Connector':   { laborHrs: 0.495, cost: 7.01,  dbName: 'Downspout Connector'   },
  '4" Paver Top Inlet':    { laborHrs: 0.75,  cost: 23.63, dbName: '4" Paver Top Inlet'    },
  '9" x 9" Catch Basin':   { laborHrs: 0.495, cost: 16.90, dbName: '9" x 9" Catch Basin'   },
  '12" x 12" Catch Basin': { laborHrs: 0.495, cost: 21.60, dbName: '12" x 12" Catch Basin' },
}

// minutes per cubic foot by equipment type
const TRENCH_MINS_PER_CF = { Trench: 10, Hand: 12.5 }

// ── Labor-coefficient lookup maps ─────────────────────────────────────────
// Each entry points the inline calculator icon at a row in `labor_rates`
// (seeded by supabase-drainage-labor-coefficients.sql). Click the icon →
// popover fetches that coefficient, user adjusts it. The seed names match
// these exactly.
const TRENCH_LABOR_RATE_NAME = {
  Trench: 'Drainage Trench Excavation',
  Hand:   'Drainage Hand Excavation',
}
const PIPE_LABOR_RATE_NAME = {
  '4" SDR 35':      'Drainage 4" SDR 35 Pipe Labor',
  '3" SDR 35':      'Drainage 3" SDR 35 Pipe Labor',
  '6" SDR 35':      'Drainage 6" SDR 35 Pipe Labor',
  '4" Triple Wall': 'Drainage 4" Triple Wall Pipe Labor',
  '3" Triple Wall': 'Drainage 3" Triple Wall Pipe Labor',
  '4" Perforated':  'Drainage 4" Perforated Pipe Labor',
  '3" Perforated':  'Drainage 3" Perforated Pipe Labor',
}
const FIXTURE_LABOR_RATE_NAME = {
  '3" Area Drain':         'Drainage 3" Area Drain Labor',
  '4" Area Drain':         'Drainage 4" Area Drain Labor',
  '3" Atrium Drain':       'Drainage 3" Atrium Drain Labor',
  '4" Atrium Drain':       'Drainage 4" Atrium Drain Labor',
  '4" Brass Area Drain':   'Drainage 4" Brass Area Drain Labor',
  '3" Brass Area Drain':   'Drainage 3" Brass Area Drain Labor',
  'Downspout Connector':   'Drainage Downspout Connector Labor',
  '4" Paver Top Inlet':    'Drainage 4" Paver Top Inlet Labor',
  '9" x 9" Catch Basin':   'Drainage 9" x 9" Catch Basin Labor',
  '12" x 12" Catch Basin': 'Drainage 12" x 12" Catch Basin Labor',
}

// Additional item rates — qty drives both labor hours AND material cost
const ADD_ITEM_RATES = {
  pumpVault: { laborHrs: 5, matCost: 275,  label: 'Pump Vault',                 dbName: 'Pump Vault'               },
  sumpPump:  { laborHrs: 3, matCost: 650,  label: 'Sump Pump',                  dbName: 'Sump Pump'                },
  curbCore:  { laborHrs: 2, matCost: 250,  label: 'Curb Core *',                dbName: 'Curb Core'                },
  hydrocut:  { laborHrs: 2, matCost: 50,   label: 'Hydrocut Under Hardscape *', dbName: 'Hydrocut Under Hardscape' },
}

// Labor-coefficient lookup for Additional Items — matches names seeded in
// supabase-drainage-labor-coefficients.sql so the popover edits the right row.
const ADD_ITEM_LABOR_RATE_NAME = {
  pumpVault: 'Drainage Pump Vault Labor',
  sumpPump:  'Drainage Sump Pump Labor',
  curbCore:  'Drainage Curb Core Labor',
  hydrocut:  'Drainage Hydrocut Under Hardscape Labor',
}

// Default fitting fee per drain unit — overridden by 'Drain Fitting Fee' in material_rates
const DRAIN_FITTING_FEE = 10

const DEFAULTS = {
  laborRatePerHour: 35,
  laborBurdenPct:   0.29,
  gpmd:             425,
  commissionRate:   0.12,
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const n = (v) => parseFloat(v) || 0

// materialPrices — { 'dbName': unit_cost, ... } fetched from material_rates
function calcDrainage(state, laborRatePerHour = DEFAULTS.laborRatePerHour, materialPrices = {}, gpmd = DEFAULTS.gpmd, walkAccess = null) {
  const _pace = (parseFloat(walkAccess?.paceLfPerMin) || DEFAULT_WALK_ACCESS_PACE_LF_PER_MIN)
  const { difficulty, trenchRows, pipeRows, fixtureRows, additionalItems, manualRows } = state

  let trenchHrs = 0, pipeHrs = 0, pipeMat = 0
  let fixHrs = 0, fixMat = 0
  let manHrs = 0, manMat = 0, manSub = 0

  trenchRows.forEach(r => {
    const lf = n(r.lf), w = n(r.width), d = n(r.depth)
    if (lf > 0 && w > 0 && d > 0) {
      const cf = lf * (w / 12) * (d / 12)
      trenchHrs += (cf * (TRENCH_MINS_PER_CF[r.equipment] || 10)) / 60
    }
  })

  pipeRows.forEach(r => {
    const lf   = n(r.lf)
    const rate = PIPE_TYPES[r.type]
    if (lf > 0 && rate) {
      const costPerLF = materialPrices[rate.dbName] ?? rate.costPerLF
      pipeMat += lf * costPerLF
      pipeHrs += lf * rate.laborPerLF
    }
  })

  let totalFixQty = 0
  fixtureRows.forEach(r => {
    const qty  = n(r.qty)
    const rate = FIXTURE_TYPES[r.type]
    if (qty > 0 && rate) {
      const cost = materialPrices[rate.dbName] ?? rate.cost
      fixMat += qty * cost
      fixHrs += qty * rate.laborHrs
      totalFixQty += qty
    }
  })

  const fittingFeeEa   = materialPrices['Drain Fitting Fee'] ?? DRAIN_FITTING_FEE
  const drainFittingFee = totalFixQty * fittingFeeEa

  let addHrs = 0, addMat = 0
  Object.entries(ADD_ITEM_RATES).forEach(([key, rate]) => {
    const qty = n(additionalItems[`${key}Qty`])
    if (qty > 0) {
      const matCost = materialPrices[rate.dbName] ?? rate.matCost
      addHrs += qty * rate.laborHrs
      addMat += qty * matCost
    }
  })

  manualRows.forEach(r => {
    manHrs += n(r.hours); manMat += n(r.materials); manSub += n(r.subCost)
  })

  const baseHrs  = trenchHrs + pipeHrs + fixHrs + addHrs + manHrs
  const diffMod  = 1 + (n(difficulty) / 100)
  const _preWalkHrs = baseHrs * diffMod
  const walkHrs     = calcWalkAccessLabor(_preWalkHrs, state.distanceLF, { paceLfPerMin: _pace })
  const totalHrs    = _preWalkHrs + walkHrs
  const manDays  = totalHrs / 8
  const totalMat = pipeMat + fixMat + drainFittingFee + addMat + manMat
  const laborCost = totalHrs * laborRatePerHour
  const burden     = laborCost * DEFAULTS.laborBurdenPct
  const gp         = manDays * gpmd
  const commission = gp * DEFAULTS.commissionRate
  const subCost    = manSub
  const price      = totalMat + laborCost + burden + gp + commission + subCost

  return { totalHrs, manDays, totalMat, laborCost, burden, gp, commission, subCost, price, walkHrs,
           drainFittingFee, fittingFeeEa, addHrs, addMat }
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

// ── Default blank rows ─────────────────────────────────────────────────────────
const DEFAULT_TRENCH_ROWS = [
  { equipment: 'Trench', lf: '', width: '', depth: '' },
  { equipment: 'Trench', lf: '', width: '', depth: '' },
  { equipment: 'Hand',   lf: '', width: '', depth: '' },
  { equipment: 'Trench', lf: '', width: '', depth: '' },
]
const DEFAULT_PIPE_ROWS = [
  { type: '4" SDR 35', lf: '' },
  { type: '4" SDR 35', lf: '' },
  { type: '4" SDR 35', lf: '' },
  { type: '4" SDR 35', lf: '' },
]
const DEFAULT_FIXTURE_ROWS = [
  { type: '3" Area Drain',   qty: '' },
  { type: '3" Area Drain',   qty: '' },
  { type: '3" Area Drain',   qty: '' },
  { type: '3" Atrium Drain', qty: '' },
]
const DEFAULT_ADDITIONAL = {
  pumpVaultQty: '',
  sumpPumpQty:  '',
  curbCoreQty:  '',
  hydrocutQty:  '',
  permitRequired: false,
}
const DEFAULT_MANUAL_ROWS = [
  { label: 'Misc 1', hours: '', materials: '', subCost: '' },
  { label: 'Misc 2', hours: '', materials: '', subCost: '' },
  { label: 'Misc 3', hours: '', materials: '', subCost: '' },
  { label: 'Misc 4', hours: '', materials: '', subCost: '' },
]

// ── Main Component ─────────────────────────────────────────────────────────────
export default function DrainageModule({ projectName, onSave, onBack, saving, initialData }) {
  const [laborRatePerHour, setLaborRatePerHour] = useState(
    initialData?.laborRatePerHour ?? DEFAULTS.laborRatePerHour
  )
  const [distanceLF, setDistanceLF] = useState(initialData?.distanceLF ?? '')
  const [walkAccess, setWalkAccess] = useState(initialData?.walkAccess ?? {
    paceLfPerMin: DEFAULT_WALK_ACCESS_PACE_LF_PER_MIN,
  })
  // Live material prices from material_rates table (category='Drainage')
  // When editing, use the snapshot saved at the time the module was created
  const [materialPrices, setMaterialPrices] = useState(
    initialData?.materialPrices ?? {}
  )
  const [pricesLoading, setPricesLoading] = useState(!initialData?.materialPrices)

  // Pulled out so RateEditPopover can call it after the user saves a new
  // master-rate value — picks up the change without a page refresh.
  async function refreshMaterialPrices() {
    const { data } = await supabase
      .from('material_rates')
      .select('name, unit_cost')
      .eq('category', 'Drainage')
    if (data) {
      const prices = {}
      data.forEach(r => { prices[r.name] = parseFloat(r.unit_cost) || 0 })
      setMaterialPrices(prices)
    }
    setPricesLoading(false)
  }

  useEffect(() => {
    // Fetch labor rate unless we already have it from initialData
    if (!initialData?.laborRatePerHour) {
      supabase
        .from('company_settings')
        .select('labor_rate_per_hour, walk_access_pace_lf_per_min')
        .single()
        .then(({ data }) => {
          if (!data) return
          if (data.labor_rate_per_hour != null) setLaborRatePerHour(parseFloat(data.labor_rate_per_hour) || DEFAULTS.laborRatePerHour)
          if (data.walk_access_pace_lf_per_min != null) {
            const _wpace = parseFloat(data.walk_access_pace_lf_per_min)
            setWalkAccess({ paceLfPerMin: Number.isFinite(_wpace) && _wpace > 0 ? _wpace : DEFAULT_WALK_ACCESS_PACE_LF_PER_MIN })
          }
        })
    }

    // Fetch material prices unless we have a saved snapshot from initialData
    if (initialData?.materialPrices) return
    refreshMaterialPrices()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const gpmd = initialData?.gpmd ?? DEFAULTS.gpmd
  const subGpMarkupRate = initialData?.subGpMarkupRate ?? 0.20

  const [difficulty,      setDifficulty]     = useState(initialData?.difficulty      ?? '')
  const [crewType, setCrewType] = useState(initialData?.crewType ?? 'Demo')
  const [trenchRows,      setTrenchRows]     = useState(initialData?.trenchRows      ?? DEFAULT_TRENCH_ROWS)
  const [pipeRows,        setPipeRows]       = useState(initialData?.pipeRows        ?? DEFAULT_PIPE_ROWS)
  const [fixtureRows,     setFixtureRows]    = useState(initialData?.fixtureRows     ?? DEFAULT_FIXTURE_ROWS)
  const [additionalItems, setAdditionalItems]= useState(initialData?.additionalItems ?? DEFAULT_ADDITIONAL)
  const [manualRows,      setManualRows]     = useState(initialData?.manualRows      ?? DEFAULT_MANUAL_ROWS)

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


  const calcRaw = calcDrainage(
    { difficulty, trenchRows, pipeRows, fixtureRows, additionalItems, manualRows, distanceLF },
    laborRatePerHour,
    materialPrices,
    gpmd,
    walkAccess,
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


  function updateTrench(i, field, val) {
    setTrenchRows(rows => rows.map((r, idx) => idx === i ? { ...r, [field]: val } : r))
  }
  function updatePipe(i, field, val) {
    setPipeRows(rows => rows.map((r, idx) => idx === i ? { ...r, [field]: val } : r))
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
        difficulty, trenchRows, pipeRows, fixtureRows, additionalItems, manualRows,
        laborRatePerHour, gpmd,
        materialPrices,   // snapshot of prices used — so the summary always reflects save-time costs
        calc,
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

      {/* Prices loading notice */}
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
          <NumInput value={distanceLF} onChange={setDistanceLF} placeholder="0" />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">Avg LF</span>
        </div>
        {calc.walkHrs > 0 && (
          <span className="text-xs text-gray-500">+{calc.walkHrs.toFixed(2)} hrs walk-access</span>
        )}
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
                const laborName = TRENCH_LABOR_RATE_NAME[row.equipment]
                return (
                  <tr key={i} className="border-b border-gray-100">
                    <td className="py-1 pr-2">
                      <div className="flex items-center gap-1">
                        <select className="input text-sm py-1 flex-1 min-w-0" value={row.equipment} onChange={e => updateTrench(i, 'equipment', e.target.value)}>
                          <option>Trench</option>
                          <option>Hand</option>
                        </select>
                        {laborName && (
                          <RateEditPopover
                            table="labor_rates"
                            name={laborName}
                            category="Drainage"
                            mode="coefficient"
                            unitLabel="min/cf"
                            currentValue={TRENCH_MINS_PER_CF[row.equipment]}
                          />
                        )}
                      </div>
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
        </div>
      </div>

      {/* ── Drain Pipe ── */}
      <div>
        <SectionHeader title="Drain Pipe" />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 border-b border-gray-200">
                <th className="text-left pb-1 pr-2 font-medium">Pipe Type</th>
                <th className="text-left pb-1 pr-2 font-medium">Linear Feet</th>
                <th className="text-right pb-1 pr-2 font-medium text-gray-400">$/LF</th>
                <th className="text-right pb-1 font-medium text-gray-400">Material $</th>
              </tr>
            </thead>
            <tbody>
              {pipeRows.map((row, i) => {
                const rate      = PIPE_TYPES[row.type]
                const costPerLF = materialPrices[rate?.dbName] ?? rate?.costPerLF ?? 0
                const mat       = n(row.lf) * costPerLF
                return (
                  <tr key={i} className="border-b border-gray-100">
                    <td className="py-1 pr-2">
                      <div className="flex items-center gap-1">
                        <select className="input text-sm py-1 flex-1 min-w-0" value={row.type} onChange={e => updatePipe(i, 'type', e.target.value)}>
                          {Object.keys(PIPE_TYPES).map(t => <option key={t}>{t}</option>)}
                        </select>
                        {PIPE_LABOR_RATE_NAME[row.type] && (
                          <RateEditPopover
                            table="labor_rates"
                            name={PIPE_LABOR_RATE_NAME[row.type]}
                            category="Drainage"
                            mode="coefficient"
                            unitLabel="hr/LF"
                            currentValue={rate?.laborPerLF}
                          />
                        )}
                      </div>
                    </td>
                    <td className="py-1 pr-2"><NumInput value={row.lf} onChange={v => updatePipe(i, 'lf', v)} /></td>
                    <td className="py-1 text-right text-gray-400 text-xs pr-2">
                      <span className="inline-flex items-center justify-end">
                        ${costPerLF.toFixed(2)}
                        <RateEditPopover
                          table="material_rates"
                          name={rate?.dbName || row.type}
                          category="Drainage"
                          unitLabel="LF"
                          currentValue={costPerLF}
                          onSaved={refreshMaterialPrices}
                        />
                      </span>
                    </td>
                    <td className="py-1 text-right text-gray-600 text-xs">{mat > 0 ? `$${mat.toFixed(2)}` : '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Fixtures ── */}
      <div>
        <SectionHeader title="Drains & Fixtures" />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 border-b border-gray-200">
                <th className="text-left pb-1 pr-2 font-medium">Fixture Type</th>
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
                      <div className="flex items-center gap-1">
                        <select className="input text-sm py-1 flex-1 min-w-0" value={row.type} onChange={e => updateFixture(i, 'type', e.target.value)}>
                          <option value="">-- Select --</option>
                          {Object.keys(FIXTURE_TYPES).map(t => <option key={t}>{t}</option>)}
                        </select>
                        {FIXTURE_LABOR_RATE_NAME[row.type] && (
                          <RateEditPopover
                            table="labor_rates"
                            name={FIXTURE_LABOR_RATE_NAME[row.type]}
                            category="Drainage"
                            mode="coefficient"
                            unitLabel="hr/ea"
                            currentValue={rate?.laborHrs}
                          />
                        )}
                      </div>
                    </td>
                    <td className="py-1 pr-2"><NumInput value={row.qty} onChange={v => updateFixture(i, 'qty', v)} /></td>
                    <td className="py-1 text-right text-gray-400 text-xs pr-2">
                      <span className="inline-flex items-center justify-end">
                        {rate ? `$${cost.toFixed(2)}` : '—'}
                        <RateEditPopover
                          table="material_rates"
                          name={rate?.dbName || row.type}
                          category="Drainage"
                          unitLabel="ea"
                          currentValue={cost}
                          onSaved={refreshMaterialPrices}
                        />
                      </span>
                    </td>
                    <td className="py-1 text-right text-gray-600 text-xs">{mat > 0 ? `$${mat.toFixed(2)}` : '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Additional Items ── */}
      <div>
        <SectionHeader title="Additional Items" />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 border-b border-gray-200">
                <th className="text-left pb-1 pr-2 font-medium">Item</th>
                <th className="text-left pb-1 pr-2 font-medium w-24">Qty</th>
                <th className="text-right pb-1 pr-2 font-medium text-gray-400">Labor Hrs</th>
                <th className="text-right pb-1 font-medium text-gray-400">Material $</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(ADD_ITEM_RATES).map(([key, rate]) => {
                const qty       = n(additionalItems[`${key}Qty`])
                const matCost   = materialPrices[rate.dbName] ?? rate.matCost
                const laborName = ADD_ITEM_LABOR_RATE_NAME[key]
                return (
                  <tr key={key} className="border-b border-gray-100">
                    <td className="py-1.5 pr-2 text-xs text-gray-700">{rate.label}</td>
                    <td className="py-1.5 pr-2">
                      <input
                        type="number" step="1"
                        className="input text-sm py-1 w-20"
                        placeholder="0"
                        value={additionalItems[`${key}Qty`]}
                        onChange={e => setAdditionalItems(p => ({ ...p, [`${key}Qty`]: e.target.value }))}
                      />
                    </td>
                    <td className="py-1.5 text-right text-gray-400 text-xs pr-2">
                      <span className="inline-flex items-center justify-end">
                        {qty > 0 ? (qty * rate.laborHrs).toFixed(1) : `${rate.laborHrs} / ea`}
                        {laborName && (
                          <RateEditPopover
                            table="labor_rates"
                            name={laborName}
                            category="Drainage"
                            mode="coefficient"
                            unitLabel="hr/ea"
                            currentValue={rate.laborHrs}
                          />
                        )}
                      </span>
                    </td>
                    <td className="py-1.5 text-right text-gray-600 text-xs">
                      <span className="inline-flex items-center justify-end">
                        {qty > 0 ? `$${(qty * matCost).toLocaleString()}` : `$${matCost} / ea`}
                        <RateEditPopover
                          table="material_rates"
                          name={rate.dbName}
                          category="Drainage"
                          unitLabel="ea"
                          currentValue={matCost}
                          onSaved={refreshMaterialPrices}
                        />
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <div className="mt-2">
          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
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
                    <input className="input text-sm py-1" value={row.label} onChange={e => updateManual(i, 'label', e.target.value)} />
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
