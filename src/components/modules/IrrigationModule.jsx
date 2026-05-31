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
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import GpmdBar from './GpmdBar'
import ModuleNotesField from './ModuleNotesField'
import RateEditPopover from '../RateEditPopover'
import { calcWalkAccessLabor, DEFAULT_WALK_ACCESS_PACE_LF_PER_MIN } from '../../lib/walkAccess'

// ── Zone definitions ──────────────────────────────────────────────────────────
// defaultMode: 'Hand' | 'Trench'  — matches Excel defaults; user can override
const ZONE_TYPES = [
  {
    key: 'planterSpray',
    label: 'Planter Spray Heads',
    defaultMode: 'Hand',
    matKey: 'Irrigation Zone - Planter Spray',
    matFallback: 345,
  },
  {
    key: 'lawn',
    label: 'Lawn Zone (≤ 1,000 SF)',
    defaultMode: 'Trench',
    matKey: 'Irrigation Zone - Lawn',
    matFallback: 345,
  },
  {
    key: 'hillside',
    label: 'Hillside Zone (≤ 6 big heads)',
    defaultMode: 'Hand',
    matKey: 'Irrigation Zone - Hillside',
    matFallback: 345,
  },
  {
    key: 'dripPlant',
    label: 'Drip per Plant (≤ 50 emitters)',
    defaultMode: 'Trench',
    matKey: 'Irrigation Zone - Drip per Plant',
    matFallback: 230,
  },
  {
    key: 'dripline',
    label: 'Planter Dripline (≤ 700 SF)',
    defaultMode: 'Trench',
    matKey: 'Irrigation Zone - Planter Dripline',
    matFallback: 345,
  },
]

// ── Timer definitions ─────────────────────────────────────────────────────────
const TIMER_TYPES = [
  { key: 'timer4', label: '4 Station', matKey: 'Irrigation Timer - 4 Station', matFallback: 69.0 },
  { key: 'timer6', label: '6 Station', matKey: 'Irrigation Timer - 6 Station', matFallback: 138.0 },
  { key: 'timer9', label: '9 Station', matKey: 'Irrigation Timer - 9 Station', matFallback: 184.0 },
  {
    key: 'timer12',
    label: '12 Station',
    matKey: 'Irrigation Timer - 12 Station',
    matFallback: 270.25,
  },
  {
    key: 'timer15',
    label: '15 Station',
    matKey: 'Irrigation Timer - 15 Station',
    matFallback: 322.0,
  },
  {
    key: 'timer18',
    label: '18 Station',
    matKey: 'Irrigation Timer - 18 Station',
    matFallback: 402.5,
  },
  {
    key: 'timerICC8',
    label: 'Hunter ICC 8 Station',
    matKey: 'Irrigation Timer - Hunter ICC 8 Station',
    matFallback: 345.0,
  },
  {
    key: 'timerAdd8',
    label: 'Additional 8 Station Module',
    matKey: 'Irrigation Timer - Additional 8 Station Module',
    matFallback: 115.0,
  },
]

// ── Rate fallbacks (used when DB row not found) ───────────────────────────────
const RATE_DEFAULTS = {
  handRate: 16, // hrs/zone — 'Irrigation - Hand Zone'   (Excel VLOOKUP: Hand = 16)
  trenchRate: 12.5, // hrs/zone — 'Irrigation - Trench Zone' (Excel VLOOKUP: Trench = 12.5)
  timerHrs: 0.5, // hrs/ea  — 'Irrigation - Timer Install'
  salesTax: 0.095, // 9.5% — company_settings key 'sales_tax_rate'
}

// ── Calculation engine ────────────────────────────────────────────────────────
const n = v => parseFloat(v) || 0

function calcIrrigation(
  state,
  laborRatePerHour,
  materialPrices,
  laborRates,
  salesTax,
  gpmd = 425,
  walkAccess = null
) {
  const mp = materialPrices || {}
  const lr = laborRates || {}
  const lrph = n(laborRatePerHour) || 35
  const diff = 1 + n(state.difficulty) / 100
  const hrsAdj = n(state.hoursAdj)
  const tax = n(salesTax) || RATE_DEFAULTS.salesTax
  const pace = n(walkAccess?.paceLfPerMin) || DEFAULT_WALK_ACCESS_PACE_LF_PER_MIN

  // Rates from DB with fallbacks
  // NOTE: handRate / trenchRate are hrs/zone (not zones/hr).
  // Excel formula: =Vlookup(mode, rateTable, 2) * qty  →  rate × qty = hrs
  const handRate = lr['Irrigation - Hand Zone'] ?? RATE_DEFAULTS.handRate
  const trenchRate = lr['Irrigation - Trench Zone'] ?? RATE_DEFAULTS.trenchRate
  const timerHrs = lr['Irrigation - Timer Install'] ?? RATE_DEFAULTS.timerHrs

  // ── Zone labor + material (pre-tax) ─────────────────────────────────────
  let zoneHrs = 0,
    zoneMat = 0
  const zoneCalc = ZONE_TYPES.map(z => {
    const qty = n(state.zoneQtys[z.key])
    const mode = state.zoneModes[z.key] || z.defaultMode
    const rate = mode === 'Hand' ? handRate : trenchRate
    const hrs = qty > 0 ? qty * rate : 0 // hrs = rate (hrs/zone) × qty
    const mat = qty * (mp[z.matKey] ?? z.matFallback)
    zoneHrs += hrs
    zoneMat += mat
    return { qty, mode, rate, hrs, mat }
  })

  // ── Timer labor + material (pre-tax) ────────────────────────────────────
  let timerLaborHrs = 0,
    timerMat = 0
  const timerCalc = TIMER_TYPES.map(t => {
    const qty = n(state.timerQtys[t.key])
    const hrs = qty * timerHrs
    const mat = qty * (mp[t.matKey] ?? t.matFallback)
    timerLaborHrs += hrs
    timerMat += mat
    return { qty, hrs, mat }
  })

  // ── Manual entry ─────────────────────────────────────────────────────────
  const manualFiltered = (state.manualRows || []).filter(
    r => n(r.hours) > 0 || n(r.materials) > 0 || n(r.subCost) > 0
  )
  const manualHrs = manualFiltered.reduce((s, r) => s + n(r.hours), 0)
  const manualMat = manualFiltered.reduce((s, r) => s + n(r.materials), 0)
  const manualSub = manualFiltered.reduce((s, r) => s + n(r.subCost), 0)

  // ── Totals ────────────────────────────────────────────────────────────────
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
  const burden = laborCost * 0.29 // 29% — Excel Module #1 O4
  const gp = manDays * gpmd
  const commission = gp * 0.12 // 12% of GP — Excel Module #1 O3
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

// ── Default state ─────────────────────────────────────────────────────────────
const DEFAULT_STATE = {
  difficulty: 0,
  crewType: 'Landscape',
  hoursAdj: 0,
  distanceLF: '', // Average Distance (Truck to Work Area), linear feet
  zoneQtys: Object.fromEntries(ZONE_TYPES.map(z => [z.key, ''])),
  zoneModes: Object.fromEntries(ZONE_TYPES.map(z => [z.key, z.defaultMode])),
  timerQtys: Object.fromEntries(TIMER_TYPES.map(t => [t.key, ''])),
  manualRows: [
    { label: '', hours: '', materials: '', subCost: '' },
    { label: '', hours: '', materials: '', subCost: '' },
  ],
}

// ── UI helpers ────────────────────────────────────────────────────────────────
function SecHdr({ title }) {
  return (
    <div className="bg-gray-50 rounded-lg px-4 py-2.5 border border-gray-200 mb-2">
      <h3 className="text-xs font-bold text-gray-600 uppercase tracking-wider">{title}</h3>
    </div>
  )
}
function Inp({ value, onChange, placeholder = '0', type = 'number', step }) {
  return (
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      step={step}
      className="w-full border border-gray-200 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
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
      {options.map(o => (
        <option key={o} value={o}>
          {o}
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

// ── Main component ────────────────────────────────────────────────────────────
export default function IrrigationModule({ initialData, onSave, onCancel }) {
  const [state, setState] = useState(() => ({ ...DEFAULT_STATE, ...(initialData || {}) }))

  // Free-text notes for this module — Sam writes auto-generated
  // takeoffs here via create_estimate_from_takeoff, and the user can
  // overwrite / append their own.
  const [notes, setNotes] = useState(initialData?.notes ?? '')
  const [materialPrices, setMaterialPrices] = useState(initialData?.materialPrices || {})
  const [laborRates, setLaborRates] = useState(initialData?.laborRates || {})
  const [laborRatePerHour, setLaborRatePerHour] = useState(initialData?.laborRatePerHour ?? 35)
  const [salesTax, setSalesTax] = useState(initialData?.salesTax ?? RATE_DEFAULTS.salesTax)
  const [walkAccess, setWalkAccess] = useState(
    initialData?.walkAccess ?? {
      paceLfPerMin: DEFAULT_WALK_ACCESS_PACE_LF_PER_MIN,
    }
  )
  const [pricesLoading, setPricesLoading] = useState(!initialData?.materialPrices)
  const gpmd = initialData?.gpmd ?? 425
  const subGpMarkupRate = initialData?.subGpMarkupRate ?? 0.2

  // Re-fetch Irrigation master-rate maps. Used on mount and after edit-saves.
  const refreshAllRates = useCallback(async () => {
    const [mrRes, lrRes] = await Promise.all([
      supabase.from('material_rates').select('name, unit_cost').eq('category', 'Irrigation'),
      supabase.from('labor_rates').select('name, rate').eq('category', 'Irrigation'),
    ])
    if (mrRes.data) {
      const m = {}
      mrRes.data.forEach(r => {
        m[r.name] = parseFloat(r.unit_cost)
      })
      setMaterialPrices(m)
    }
    if (lrRes.data) {
      const m = {}
      lrRes.data.forEach(r => {
        m[r.name] = parseFloat(r.rate)
      })
      setLaborRates(m)
    }
  }, [])

  useEffect(() => {
    if (initialData?.materialPrices && initialData?.laborRatePerHour) return
    let gone = false
    ;(async () => {
      await Promise.all([
        (!initialData?.laborRatePerHour || !initialData?.salesTax || !initialData?.walkAccess) &&
          supabase
            .from('company_settings')
            .select('labor_rate_per_hour, sales_tax_rate, walk_access_pace_lf_per_min')
            .maybeSingle()
            .then(({ data }) => {
              if (!gone && data) {
                if (!initialData?.laborRatePerHour && data.labor_rate_per_hour)
                  setLaborRatePerHour(parseFloat(data.labor_rate_per_hour) || 35)
                if (!initialData?.salesTax && data.sales_tax_rate != null)
                  setSalesTax(parseFloat(data.sales_tax_rate) || RATE_DEFAULTS.salesTax)
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
        refreshAllRates(),
      ])
      if (!gone) setPricesLoading(false)
    })()
    return () => {
      gone = true
    }
  }, [refreshAllRates])

  const set = useCallback((f, v) => setState(p => ({ ...p, [f]: v })), [])
  const setNested = useCallback(
    (group, key, val) => setState(p => ({ ...p, [group]: { ...p[group], [key]: val } })),
    []
  )
  const setRow = useCallback(
    (i, f, v) =>
      setState(p => {
        const rows = [...p.manualRows]
        rows[i] = { ...rows[i], [f]: v }
        return { ...p, manualRows: rows }
      }),
    []
  )

  const calc = calcIrrigation(
    state,
    laborRatePerHour,
    materialPrices,
    laborRates,
    salesTax,
    gpmd,
    walkAccess
  )

  const fmt2 = v =>
    `$${n(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
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
        laborRatePerHour,
        gpmd,
        materialPrices,
        laborRates,
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
          price: calc.price,
        },
      },
    })
  }

  return (
    <div className="space-y-4">
      {/* ── Sticky GPMD bar ── */}
      <div className="sticky top-0 z-20 -mx-6 px-6 pt-1 pb-1 bg-gray-900 shadow-lg">
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

      {/* Notes — pinned in its own sticky container just below the
          GPMD bar. Plain white textarea, no card chrome. */}
      <div className="sticky top-[56px] z-10 -mx-6 px-6 pt-2 pb-2 mt-2 bg-transparent">
        <ModuleNotesField value={notes} onChange={setNotes} />
      </div>

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

      {/* Settings */}
      <SecHdr title="Settings" />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <p className="text-xs text-gray-500 mb-0.5">Difficulty (%)</p>
          <Inp
            value={state.difficulty}
            onChange={e => set('difficulty', e.target.value)}
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
            value={state.distanceLF}
            onChange={e => set('distanceLF', e.target.value)}
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
          <Inp value={state.hoursAdj} onChange={e => set('hoursAdj', e.target.value)} step="0.5" />
        </div>
      </div>

      {/* Zones */}
      <div>
        <div className="text-xs font-bold text-gray-600 uppercase tracking-wider bg-gray-50 rounded-lg border border-gray-200 px-4 py-2.5 mt-5 mb-2 flex items-center flex-wrap gap-x-2 gap-y-1">
          <span>Irrigation Zones —</span>
          <span className="inline-flex items-center gap-1">
            Hand: {calc.handRate} hrs/zone
            <RateEditPopover
              table="labor_rates"
              name="Irrigation - Hand Zone"
              category="Irrigation"
              mode="coefficient"
              unitLabel="hrs/zone"
              currentValue={calc.handRate}
              onSaved={refreshAllRates}
            />
          </span>
          ·
          <span className="inline-flex items-center gap-1">
            Trench: {calc.trenchRate} hrs/zone
            <RateEditPopover
              table="labor_rates"
              name="Irrigation - Trench Zone"
              category="Irrigation"
              mode="coefficient"
              unitLabel="hrs/zone"
              currentValue={calc.trenchRate}
              onSaved={refreshAllRates}
            />
          </span>
        </div>
        <table className="w-full text-xs">
          <TH
            cols={[
              { label: 'Zone Type' },
              { label: '# Zones', w: 'w-20' },
              { label: 'Install Mode', w: 'w-28' },
              { label: 'Est. Hrs', w: 'w-20' },
              { label: 'Zone Materials', w: 'w-28' },
            ]}
          />
          <tbody className="divide-y divide-gray-50">
            {ZONE_TYPES.map((z, i) => {
              const cr = calc.zoneCalc[i]
              const matRate = materialPrices[z.matKey] ?? z.matFallback
              return (
                <tr key={z.key}>
                  <td className={`${td} font-medium text-gray-700`}>
                    <span className="inline-flex items-center gap-1">
                      {z.label}
                      <span className="text-gray-400 font-normal text-xs">
                        (default: {z.defaultMode})
                      </span>
                      <RateEditPopover
                        table="material_rates"
                        name={z.matKey}
                        category="Irrigation"
                        unitLabel="zone"
                        currentValue={matRate}
                        onSaved={refreshAllRates}
                      />
                    </span>
                  </td>
                  <td className={td}>
                    <Inp
                      value={state.zoneQtys[z.key]}
                      onChange={e => setNested('zoneQtys', z.key, e.target.value)}
                    />
                  </td>
                  <td className={td}>
                    <Sel
                      value={state.zoneModes[z.key]}
                      onChange={e => setNested('zoneModes', z.key, e.target.value)}
                      options={['Hand', 'Trench']}
                    />
                  </td>
                  <td className={num}>{fh(cr.hrs)}</td>
                  <td className={num}>{cr.mat > 0 ? fmt2(cr.mat) : '—'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Timers */}
      <div>
        <div className="text-xs font-bold text-gray-600 uppercase tracking-wider bg-gray-50 rounded-lg border border-gray-200 px-4 py-2.5 mt-5 mb-2 flex items-center gap-2">
          <span>Controllers / Timers — {calc.timerHrs} hrs install each</span>
          <RateEditPopover
            table="labor_rates"
            name="Irrigation - Timer Install"
            category="Irrigation"
            mode="coefficient"
            unitLabel="hrs/ea"
            currentValue={calc.timerHrs}
            onSaved={refreshAllRates}
          />
        </div>
        <table className="w-full text-xs">
          <TH
            cols={[
              { label: 'Timer Type' },
              { label: 'Qty', w: 'w-20' },
              { label: 'Est. Hrs', w: 'w-20' },
              { label: 'Materials', w: 'w-28' },
            ]}
          />
          <tbody className="divide-y divide-gray-50">
            {TIMER_TYPES.map((t, i) => {
              const cr = calc.timerCalc[i]
              const matRate = materialPrices[t.matKey] ?? t.matFallback
              return (
                <tr key={t.key}>
                  <td className={`${td} font-medium text-gray-700`}>
                    <span className="inline-flex items-center gap-1">
                      {t.label}
                      <RateEditPopover
                        table="material_rates"
                        name={t.matKey}
                        category="Irrigation"
                        unitLabel="ea"
                        currentValue={matRate}
                        onSaved={refreshAllRates}
                      />
                    </span>
                  </td>
                  <td className={td}>
                    <Inp
                      value={state.timerQtys[t.key]}
                      onChange={e => setNested('timerQtys', t.key, e.target.value)}
                    />
                  </td>
                  <td className={num}>{fh(cr.hrs)}</td>
                  <td className={num}>{cr.mat > 0 ? fmt2(cr.mat) : '—'}</td>
                </tr>
              )
            })}
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
              { label: 'Materials ($)', w: 'w-28' },
              { label: 'Sub Cost ($)', w: 'w-28' },
            ]}
          />
          <tbody className="divide-y divide-gray-50">
            {state.manualRows.map((r, i) => (
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
      </div>

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
  )
}
