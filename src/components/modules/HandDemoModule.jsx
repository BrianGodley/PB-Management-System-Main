import WorkTypeChooser from './WorkTypeChooser'
import CrewTypeBar from './CrewTypeBar'
import ModuleHeaderSlot from './ModuleHeaderSlot'
// ─────────────────────────────────────────────────────────────────────────────
// HandDemoModule — Hand (Non-Skid-Steer) Demo estimator
//
// All labor rates pulled from labor_rates table (lr[]) with constant fallbacks.
// Key differences vs Skid Steer Demo:
//   • Access modifiers: Poor=0.5, OK=0.667, Full=1.0  (non-skid-steer rates)
//   • Concrete/Dirt rate:  0.75 t/hr  (vs 2.0 for SS)
//   • Import Base rate:    5.0  t/hr  (vs 10.0 for SS)
//   • Rebar add-on:        0.25 min/SF (vs 0.05 for SS)
//   • No Skid Steer Compaction row
//   • Adds "Hand Bucket Areas" section (tight access; rate 0.38 t/hr)
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useCallback, useContext, useRef } from 'react'
import { SubTabContext, subSectionTitle } from './subTabContext'
import { supabase } from '../../lib/supabase'
import { fetchStandardRateMap } from '../../lib/materialCatalog'
import GpmdBar from './GpmdBar'
import { SubRateOverrideProvider } from '../SubRateOverrideContext.jsx'
import { fetchSalesTaxRate } from '../../lib/companyDefaults'
import { calcWalkAccessLabor, DEFAULT_WALK_ACCESS_PACE_LF_PER_MIN } from '../../lib/walkAccess'
import { calcDemo } from './handDemoCalc'

// ── Fallback constants ────────────────────────────────────────────────────────

// Shrub-height labor factor is table-driven: misc_rates 'Demo Shrub Height Factor - <bucket>'

// Sub Haul rates — billed per 1.5 tons removed (sub cost, not materials)
// Labor is unchanged in Subcontractor mode; dump fees are replaced by these charges
// DB values (subcontractor_rates category='Sub Haul') take precedence


// ── Calculation engine ────────────────────────────────────────────────────────

const n = v => parseFloat(v) || 0

// Container-based removal: SF -> CF (x depth/12) -> CY (/27) -> x swell,
// billed at a flat rate per low-boy container (per material, rounded up).


// ── Default state ─────────────────────────────────────────────────────────────

const DEFAULT_STATE = {
  access: 'OK',
  dumpType: 'In-House',
  difficulty: 0,
  crewType: 'Demo',
  hoursAdj: 0,
  dispType: 'In-House',
  // Demolition
  concSF: '',
  concDepth: 4,
  dirtSF: '',
  dirtDepth: 4,
  baseSF: '',
  baseDepth: 4,
  grassSF: '',
  grassDepth: 4,
  // Rebar: Yes/No toggle — concrete demo +25% when true.
  rebar: false,
  rebarSF: '',
  // Misc flat (SF + Depth)
  miscFlatRows: Array(3)
    .fill(null)
    .map(() => ({ label: '', sf: '', depth: 4 })),
  // Sub tab: its OWN misc-flat rows (2), independent of In-House.
  subMiscFlatRows: Array(2)
    .fill(null)
    .map(() => ({ label: '', sf: '', depth: 4 })),
  // Misc vertical (LF × Height × Width)
  miscVertRows: Array(1)
    .fill(null)
    .map(() => ({ label: '', lf: '', heightIn: '', widthIn: 8 })),
  // Footing (LF × Height × Width)
  footingRows: Array(1)
    .fill(null)
    .map(() => ({ label: '', lf: '', heightIn: '', widthIn: 8 })),
  // Hand Bucket Areas
  bucketRows: Array(1)
    .fill(null)
    .map(() => ({ label: '', sf: '', depth: 4 })),
  // Grading
  gradeCutSF: '',
  gradeCutDepth: 4,
  gradeFillSF: '',
  gradeFillDepth: 4,
  jjSF: '',
  jjDepth: 4,
  // Vegetation
  shrubRows: Array(1)
    .fill(null)
    .map(() => ({ area: '', qty: '', height: '0-1' })),
  stumpSmallQty: '',
  stumpMedQty: '',
  stumpLargeQty: '',
  stumpXLQty: '',
  haulTrashLoads: '',
  haulConcreteLoads: '',
  haulSoilLoads: '',
  haulBaseLoads: '',
  sheepsfootSF: '',
  rollCompSF: '',
  rateOverrides: {},
  subDemoSF: '',
  // Sub tab has its OWN grading fields — independent of In-House.
  subGradeCutSF: '',
  subGradeCutDepth: '',
  subGradeFillSF: '',
  subGradeFillDepth: '',
  subJjSF: '',
  subDemoDepth: 7,
  treeRows: [
    { qty: '', height: 20, size: '6" - 12"' },
  ],
  // Sub tab: its OWN tree rows, independent of In-House.
  subTreeRows: [
    { qty: '', height: 20, size: '6" - 12"' },
    { qty: '', height: 20, size: '12" - 18"' },
    { qty: '', height: 20, size: '18" - 24"' },
  ],
  // Manual
  manualRows: [
    { label: '', hours: '', materials: '', subCost: '' },
  ],
  // Sub tab has its OWN manual rows — independent of In-House.
  subManualRows: [
    { label: '', hours: '', materials: '', subCost: '' },
  ],
}

// ── Shared UI helpers ─────────────────────────────────────────────────────────

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

// ── Main component ─────────────────────────────────────────────────────────────

export default function HandDemoModule({ initialData, onSave, onCancel, onSwitchType }) {
  const [state, setState] = useState(() => ({ ...DEFAULT_STATE, ...(initialData || {}) }))

  // Free-text notes for this module — Sam writes auto-generated
  // takeoffs here via create_estimate_from_takeoff, and the user can
  // overwrite / append their own.
  const [notes, setNotes] = useState(initialData?.notes ?? '')
  const [materialPrices, setMaterialPrices] = useState(initialData?.materialPrices || {})
  const [laborRates, setLaborRates] = useState(initialData?.laborRates || {})
  const [laborRatePerHour, setLaborRatePerHour] = useState(initialData?.laborRatePerHour ?? null)
  const [laborBurdenPct, setLaborBurdenPct] = useState(initialData?.laborBurdenPct ?? null)
  const [walkAccess] = useState(
    initialData?.walkAccess ?? {
      paceLfPerMin: DEFAULT_WALK_ACCESS_PACE_LF_PER_MIN,
    }
  )
  const [subMarkupRate, setSubMarkupRate] = useState(initialData?.subMarkupRate ?? 0.35)
  const [subRates, setSubRates] = useState(initialData?.subRates || {})

  // ── Sales tax — applied to totalMat across every module so the bid
  //    reflects supplier-invoiced material cost. Sourced from
  //    company_settings.sales_tax_rate via fetchSalesTaxRate(). Default
  //    0 (no tax) until the admin sets it in Opportunities → Settings.
  const [salesTaxRate, setSalesTaxRate] = useState(0)

  // Picker visibility for the "Change Demo Module" button rendered
  // next to Crew Type. Hosts a tiny popover with the other two demo
  // types. On selection, we bundle the current state + rate caches
  // and hand them up to the parent (EstimateDetail) so it can swap
  // selectedType while keeping the user's entered values.
  const [showDemoSwitcher, setShowDemoSwitcher] = useState(false)
  // The switcher menu is rendered with position:fixed (anchored to the button)
  // so it escapes the CrewTypeBar's overflow-x-auto container, which would
  // otherwise clip it. demoMenuPos holds the computed viewport coordinates.
  const demoSwitchBtnRef = useRef(null)
  const [demoMenuPos, setDemoMenuPos] = useState(null)
  const toggleDemoSwitcher = useCallback(() => {
    setShowDemoSwitcher(v => {
      const next = !v
      if (next) {
        const r = demoSwitchBtnRef.current?.getBoundingClientRect()
        if (r) setDemoMenuPos({ top: r.bottom + 4, left: r.left + r.width / 2 })
      }
      return next
    })
  }, [])

  useEffect(() => {
    let alive = true
    fetchSalesTaxRate().then(r => {
      if (alive) setSalesTaxRate(r)
    })
    return () => {
      alive = false
    }
  }, [])

  // Estimate-level financial defaults (commission, GPMD, sub-GP markup) sourced
  // live from company_settings — no hardcoded code fallback. Fetched even when
  // re-editing so estimates saved before these were persisted still get a rate.
  const [commissionRate, setCommissionRate] = useState(initialData?.commissionRate ?? null)
  const [gpmdDefault, setGpmdDefault] = useState(null)
  const [subGpMarkupRateDefault, setSubGpMarkupRateDefault] = useState(null)
  useEffect(() => {
    if (
      initialData?.commissionRate != null &&
      initialData?.gpmd != null &&
      initialData?.subGpMarkupRate != null
    )
      return
    let alive = true
    supabase
      .from('company_settings')
      .select('commission_rate, sub_gp_markup_rate, estimate_gpmd_default')
      .single()
      .then(({ data }) => {
        if (!alive || !data) return
        if (initialData?.commissionRate == null && data.commission_rate != null)
          setCommissionRate(parseFloat(data.commission_rate))
        if (initialData?.gpmd == null && data.estimate_gpmd_default != null)
          setGpmdDefault(parseFloat(data.estimate_gpmd_default))
        if (initialData?.subGpMarkupRate == null && data.sub_gp_markup_rate != null)
          setSubGpMarkupRateDefault(parseFloat(data.sub_gp_markup_rate))
      })
    return () => {
      alive = false
    }
  }, [])

  const [pricesLoading, setPricesLoading] = useState(!initialData?.materialPrices)

  // Re-fetch all master-rate maps. Called once on mount and again whenever the
  // user saves an edit from a RateEditPopover so the calc picks up the change.
  const refreshAllRates = useCallback(async () => {
    const [matMap, lrRes, srRes] = await Promise.all([
      // material_rates retired: Demo materials from material+material_price,
      // fees from misc_rates, labor from labor_rates — all by name.
      fetchStandardRateMap(['Demo', 'Basic Materials']),
      supabase.from('labor_rates').select('name,rate,rate_per_day').neq('category', 'Archived'),
      supabase.from('subcontractor_rates').select('item_key,rate'),
    ])
    setMaterialPrices(matMap)
    if (lrRes.data) {
      const m = {}
      lrRes.data.forEach(r => {
        m[r.name] = parseFloat(r.rate ?? r.rate_per_day)
      })
      setLaborRates(m)
    }
    if (srRes.data) {
      const m = {}
      srRes.data.forEach(r => {
        m[r.item_key] = parseFloat(r.rate)
      })
      setSubRates(m)
    }
  }, [])

  useEffect(() => {
    let gone = false
    ;(async () => {
      await Promise.all([
        // Company settings — skip if already loaded via initialData
        !initialData?.laborRatePerHour &&
          supabase
            .from('company_settings')
            .select('labor_rate_per_hour, labor_burden_pct, sub_markup_rate, walk_access_pace_lf_per_min')
            .single()
            .then(({ data }) => {
              if (!gone && data) {
                if (data.labor_rate_per_hour != null)
                  setLaborRatePerHour(parseFloat(data.labor_rate_per_hour))
                if (data.labor_burden_pct != null)
                  setLaborBurdenPct(parseFloat(data.labor_burden_pct))
                if (data.sub_markup_rate != null)
                  setSubMarkupRate(parseFloat(data.sub_markup_rate) || 0.35)
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
  // One-off subcontractor rate for this estimate only (undefined clears it).
  const setOverride = useCallback((name, value) => {
    setState(p => {
      const next = { ...(p.rateOverrides || {}) }
      if (value === undefined || value === null || value === '') delete next[name]
      else next[name] = Number(value)
      return { ...p, rateOverrides: next }
    })
  }, [])
  const setRow = useCallback(
    (sec, i, f, v) =>
      setState(p => {
        const rows = [...p[sec]]
        rows[i] = { ...rows[i], [f]: v }
        return { ...p, [sec]: rows }
      }),
    []
  )

  const gpmd = initialData?.gpmd ?? gpmdDefault
  const subGpMarkupRate = initialData?.subGpMarkupRate ?? subGpMarkupRateDefault
  const calcRaw = calcDemo(
    state,
    laborRatePerHour,
    materialPrices,
    laborRates,
    subMarkupRate,
    subRates,
    gpmd,
    walkAccess,
    laborBurdenPct,
    commissionRate
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
  const isSelf = state.dumpType === 'In-House'
  const isSub = state.dumpType === 'Subcontractor'
  const isDumpSub = false // disposal follows the In House/Sub toggle

  const dumpConc = n(materialPrices['Hand - Dump - Concrete'])
  const dumpDirt = n(materialPrices['Hand - Dump - Dirt'])
  const dumpGreen =
    n(materialPrices['Hand - Dump - Green Waste'])

  const td = 'py-1 pr-2 align-top'
  const num = 'py-1 pr-2 text-gray-600 tabular-nums text-xs'

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
        subGpMarkupRate,
        commissionRate,
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
          subGp: calc.subGp,
          subRatesUsed: calc.sr,
          commission: calc.commission,
          price: calc.price,
        },
      },
    })
  }

  // ── Grouped rate list for the "View Rates" popup (CrewTypeBar). Every rate
  //    that used to have an inline RateEditPopover in this module now lives here.
  const coefRate = (label, name, value, unitLabel = 'hr/100 Sq Ft per in deep') => ({
    label, table: 'labor_rates', name, category: 'Demo', mode: 'coefficient', unitLabel, value,
  })
  const subcRate = (label, name, value, unitLabel = 'ea') => ({
    label, table: 'subcontractor_rates', name, category: 'Demo', mode: 'currency', unitLabel, value,
  })
  // Material/disposal fees the calc reads by name from the price map (misc_rates,
  // category Demo). mode defaults to currency; pass 'coefficient' for non-$ values
  // like container capacity.
  const matRate = (label, name, unitLabel = 'ea', mode = 'currency') => ({
    label, table: 'misc_rates', name, category: 'Demo', mode, unitLabel,
    value: n(materialPrices[name]),
  })

  return (
    <SubTabContext.Provider value={isSub}>
    <SubRateOverrideProvider overrides={state.rateOverrides} setOverride={setOverride}>
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
            title="Hand Demo"
            moduleType="Hand Demo"
            rateScope={[{ category: 'Demo', sub: 'Hand' }, { category: 'Basic Labor' }]}
            refreshAllRates={refreshAllRates}
            showInlineToggle={false}
            centerSlot={
              onSwitchType && (
                <div className="relative">
                  <button
                    ref={demoSwitchBtnRef}
                    type="button"
                    onClick={toggleDemoSwitcher}
                    className="text-xs font-semibold px-3 py-1.5 rounded-md border border-green-300 bg-green-50 text-green-800 hover:bg-green-100 hover:border-green-500 transition-colors whitespace-nowrap"
                    title="Switch to a different Demo module — keep your entries"
                  >
                    🔁 Change Demo Module
                  </button>
                  {showDemoSwitcher && demoMenuPos && (
                    <>
                    {/* Invisible full-screen backdrop closes the menu on outside click */}
                    <div className="fixed inset-0 z-[90]" onClick={() => setShowDemoSwitcher(false)} />
                    <div
                      className="fixed z-[100] w-56 bg-white border border-gray-200 rounded-lg shadow-lg p-1"
                      style={{ top: demoMenuPos.top, left: demoMenuPos.left, transform: 'translateX(-50%)' }}
                    >
                      <p className="text-[10px] uppercase tracking-wide font-bold text-gray-400 px-2 pt-1 pb-0.5">
                        Switch to
                      </p>
                      <button
                        onClick={() => {
                          // Hand the source module's full state + rate caches
                          // up to EstimateDetail so the target module loads
                          // with everything prefilled.
                          onSwitchType?.('Skid Steer Demo', {
                            ...state,
                            materialPrices,
                            laborRates,
                            laborRatePerHour,
                            subMarkupRate,
                            subRates,
                          })
                          setShowDemoSwitcher(false)
                        }}
                        className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-green-50 hover:text-green-800 rounded transition-colors"
                      >
                        Skid Steer Demo
                      </button>
                      <button
                        onClick={() => {
                          // Hand the source module's full state + rate caches
                          // up to EstimateDetail so the target module loads
                          // with everything prefilled.
                          onSwitchType?.('Mini Skid Steer Demo', {
                            ...state,
                            materialPrices,
                            laborRates,
                            laborRatePerHour,
                            subMarkupRate,
                            subRates,
                          })
                          setShowDemoSwitcher(false)
                        }}
                        className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-green-50 hover:text-green-800 rounded transition-colors"
                      >
                        Mini Skid Steer Demo
                      </button>
                      <button
                        onClick={() => setShowDemoSwitcher(false)}
                        className="w-full text-left px-3 py-1.5 text-[11px] text-gray-400 hover:text-gray-700"
                      >
                        Cancel
                      </button>
                    </div>
                    </>
                  )}
                </div>
              )
            }
          />
        </div>
      </div>

      <ModuleHeaderSlot>
        <WorkTypeChooser value={state.dumpType || 'In-House'} onChange={v => set('dumpType', v)} compact />
      </ModuleHeaderSlot>

      {pricesLoading && (
        <div className="text-xs text-amber-700 bg-amber-50 rounded px-3 py-2">
          Loading current rates…
        </div>
      )}

      {/* Settings — In-House only (subs don't bill by these modifiers) */}
      {!isSub && (
      <>
      <SecHdr title="Job Site Conditions" />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className={isSub ? 'hidden' : undefined}>
          <p className="text-xs text-gray-500 mb-0.5">Difficulty (%)</p>
          <Inp
            value={state.difficulty}
            onChange={e => set('difficulty', e.target.value)}
            step="5"
          />
        </div>
        <div className={isSub ? 'hidden' : undefined}>
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
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-0.5">Hours Adj (±hrs)</p>
          <Inp value={state.hoursAdj} onChange={e => set('hoursAdj', e.target.value)} step="0.5" />
        </div>
      </div>
      </>
      )}
      {/* Demolition */}
      <div>
        <div className="flex items-center flex-wrap gap-x-2 gap-y-1 text-xs font-bold text-gray-600 uppercase tracking-wider bg-gray-50 rounded-lg border border-gray-200 px-4 py-2.5 mt-4 mb-2">
          <span>{subSectionTitle('MAIN DEMO', isSub)}</span>
        </div>
        <table className="w-full text-xs">
          <TH
            cols={
              isSelf
                ? [
                    { label: '', w: 'w-32' },
                    { label: 'SF', w: 'w-24' },
                    { label: 'Depth (in)', w: 'w-20' },
                    { label: 'Bucket', w: 'w-16' },
                    { label: 'Cu Yd', w: 'w-16' },
                    { label: 'Dump Fee', w: 'w-24' },
                    { label: 'Labor Hrs', w: 'w-20' },
                  ]
                : [
                    { label: '', w: 'w-40' },
                    { label: 'SF', w: 'w-24' },
                    { label: 'Depth (in)', w: 'w-20' },
                    { label: 'Cost', w: 'w-24' },
                  ]
            }
          />
          <tbody className="divide-y divide-gray-50">
            {isSelf ? [
              {
                label: 'Concrete',
                sfK: 'concSF',
                dK: 'concDepth',
                dep: 4,
                row: calc.conc,
                fee: dumpConc,
                rate: calc.hrConc,
                rateName: 'Hand - Concrete',
                rateNote: `${calc.hrConc} hrs/Cu Ft${calc.rebarFactor > 1 ? ' ×rebar' : ''}`,
                rateUnit: 'Cu Ft per Hour',
              },
              {
                label: 'Soil',
                sfK: 'dirtSF',
                dK: 'dirtDepth',
                dep: 4,
                row: calc.dirt,
                fee: dumpDirt,
                rate: calc.hrSoil,
                rateName: 'Hand - Soil',
                rateNote: `${calc.hrSoil} hrs/Cu Ft`,
                rateUnit: 'Cu Ft per Hour',
              },
              {
                label: 'Grass/Sod',
                sfK: 'grassSF',
                dK: 'grassDepth',
                dep: 4,
                row: calc.grass,
                fee: dumpGreen,
                rate: calc.hrGrass,
                rateName: 'Hand - Grass',
                rateNote: `${calc.hrGrass} hrs/Cu Ft`,
                rateUnit: 'Cu Ft per Hour',
              },
              {
                label: 'Grade Cut',
                sfK: 'gradeCutSF',
                dK: 'gradeCutDepth',
                dep: 4,
                row: calc.gradeCut,
                fee: 0,
                rate: calc.hrGradeCut,
                rateName: 'Hand - Grade Cut',
                rateNote: `${calc.hrGradeCut} hrs/Cu Ft`,
                rateUnit: 'Cu Ft per Hour',
              },
            ].map(({ label, sfK, dK, dep, row, rate, rateName, rateNote, rateUnit, extraIcon }) => (
              <tr key={label}>
                <td className={`${td} font-medium text-gray-700`}>
                  <span className="inline-flex items-center gap-1">
                    {label}
                    {isSelf && (
                      <>
                        <span className="text-gray-400 font-normal text-[10px]">({rateNote})</span>
                        {extraIcon}
                      </>
                    )}
                  </span>
                </td>
                <td className={td}>
                  <Inp value={state[sfK]} onChange={e => set(sfK, e.target.value)} />
                </td>
                <td className={td}>
                  <Inp
                    value={state[dK]}
                    onChange={e => set(dK, e.target.value)}
                    placeholder={String(dep)}
                  />
                </td>
                <td className={num}>
                  <input
                    type="checkbox"
                    checked={!!state[sfK.replace(/SF$/, 'Bucket')]}
                    onChange={e => set(sfK.replace(/SF$/, 'Bucket'), e.target.checked)}
                    className="h-4 w-4"
                    title="Bucket (confined access)"
                  />
                </td>
                <td className={num}>{row.cy > 0 ? row.cy.toFixed(2) : '—'}</td>
                {isSelf && <td className={num}>{row.dumpFee > 0 ? fmt2(row.dumpFee) : '—'}</td>}
                <td className={num}>{fh(row.hours)}</td>
              </tr>
            )) : (
              <tr>
                <td className={`${td} font-medium text-gray-700`}>Concrete / Dirt / Rock / Paver</td>
                <td className={td}>
                  <Inp value={state.subDemoSF} onChange={e => set('subDemoSF', e.target.value)} />
                </td>
                <td className={td}>
                  <Inp value={state.subDemoDepth} onChange={e => set('subDemoDepth', e.target.value)} placeholder="7" />
                </td>
                <td className={num}>{calc.subDemoCost > 0 ? fmt2(calc.subDemoCost) : '—'}</td>
              </tr>
            )}
          </tbody>
        </table>

        {isSelf && (
        <div className="mt-3 flex items-center gap-3">
          <label className="inline-flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
            <input
              type="checkbox"
              checked={!!state.rebar}
              onChange={e => set('rebar', e.target.checked)}
              className="h-4 w-4"
            />
            <span className="font-medium">Rebar in concrete</span>
            <span className="text-gray-400 font-normal">
              (concrete demo +{Math.round((calc.rebarFactor - 1) * 100) || 25}% slower)
            </span>
          </label>
        </div>
        )}
      </div>

      {/* IMPORT — Import Base + Grade Fill (in-house only) */}
      {isSelf && (
      <div>
        <div className="flex items-center flex-wrap gap-x-2 gap-y-1 text-xs font-bold text-gray-600 uppercase tracking-wider bg-gray-50 rounded-lg border border-gray-200 px-4 py-2.5 mt-4 mb-2">
          <span>{subSectionTitle('IMPORT', isSub)}</span>
        </div>
        <table className="w-full text-xs">
          <TH
            cols={[
              { label: '', w: 'w-40' },
              { label: 'SF', w: 'w-24' },
              { label: 'Depth (in)', w: 'w-20' },
              { label: 'Cu Yd', w: 'w-16' },
              { label: 'Labor Hrs', w: 'w-20' },
            ]}
          />
          <tbody className="divide-y divide-gray-50">
            {[
              {
                label: 'Import Base',
                sfK: 'baseSF',
                dK: 'baseDepth',
                dep: 4,
                tons: calc.base.cy,
                hrs: calc.base.hours,
                note: `${calc.hrBase} hrs/Cu Ft`,
              },
              {
                label: 'Grade Fill',
                sfK: 'gradeFillSF',
                dK: 'gradeFillDepth',
                dep: 4,
                tons: calc.gradeFill.cy,
                hrs: calc.gradeFill.hours,
                note: `${calc.hrGradeFill} hrs/Cu Ft`,
              },
            ].map(({ label, sfK, dK, dep, tons, hrs, note }) => (
              <tr key={label}>
                <td className={`${td} font-medium text-gray-700`}>
                  <span className="inline-flex items-center gap-1">
                    {label}
                    <span className="text-gray-400 font-normal text-[10px]">({note})</span>
                  </span>
                </td>
                <td className={td}>
                  <Inp value={state[sfK]} onChange={e => set(sfK, e.target.value)} />
                </td>
                <td className={td}>
                  <Inp
                    value={state[dK]}
                    onChange={e => set(dK, e.target.value)}
                    placeholder={String(dep)}
                  />
                </td>
                <td className={num}>{tons > 0 ? tons.toFixed(2) : '—'}</td>
                <td className={num}>{fh(hrs)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      )}

      {/* Grading */}
      <div>
        <div className="flex items-center gap-2 text-xs font-bold text-gray-600 uppercase tracking-wider bg-gray-50 rounded-lg border border-gray-200 px-4 py-2.5 mt-4 mb-2">
          {subSectionTitle('Compaction', isSub)}
        </div>
        {isSelf && (
        <table className="w-full text-xs">
          <TH
            cols={[
              { label: '', w: 'w-40' },
              { label: 'SF', w: 'w-24' },
              { label: 'Depth (in)', w: 'w-20' },
              { label: 'Cu Yd', w: 'w-16' },
              { label: 'Labor Hrs', w: 'w-20' },
            ]}
          />
          <tbody className="divide-y divide-gray-50">
            {[
              {
                label: 'Jumping Jack',
                sfK: 'jjSF',
                dK: 'jjDepth',
                dep: 4,
                tons: 0,
                hrs: calc.jjHrs,
                note: `${calc.jjRate} Sq Ft/hr`,
                rate: calc.jjRate,
                rateName: 'Basic Labor - Jumping Jack',
                rateUnit: 'Sq Ft per Hour',
              },
            ].map(({ label, sfK, dK, dep, tons, hrs, note, rate, rateName, rateUnit }) => (
              <tr key={label}>
                <td className={`${td} font-medium text-gray-700`}>
                  <span className="inline-flex items-center gap-1">
                    {label}
                    {isSelf && (
                      <>
                        <span className="text-gray-400 font-normal">({note})</span>
                      </>
                    )}
                  </span>
                </td>
                <td className={td}>
                  <Inp value={state[sfK]} onChange={e => set(sfK, e.target.value)} />
                </td>
                <td className={td}>
                  <Inp
                    value={state[dK]}
                    onChange={e => set(dK, e.target.value)}
                    placeholder={String(dep)}
                  />
                </td>
                <td className={num}>{tons > 0 ? tons.toFixed(1) : '—'}</td>
                <td className={num}>{fh(hrs)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        )}
        {isSub && (
          <>
          <table className="w-full text-xs">
            <TH
              cols={[
                { label: '', w: 'w-48' },
                { label: 'SF', w: 'w-24' },
                { label: 'Depth (in)', w: 'w-20' },
                { label: 'Cost', w: 'w-24' },
              ]}
            />
            <tbody className="divide-y divide-gray-50">
              {[
                { label: 'Grade Cut', key: 'subGradeCutSF', depthKey: 'subGradeCutDepth', rate: calc.sgCut, rateName: 'Sub Grade - Hand Cut', perCf: true },
                { label: 'Grade Fill', key: 'subGradeFillSF', depthKey: 'subGradeFillDepth', rate: calc.sgFill, rateName: 'Sub Grade - Hand Fill', perCf: true },
                { label: 'Jumping Jack', key: 'subJjSF', rate: calc.sgJJ, rateName: 'Sub Grade - Hand JJ' },
                { label: 'Sheepsfoot Compactor', key: 'sheepsfootSF', rate: calc.sgSheep, rateName: 'Sub Grade - Hand Sheepsfoot' },
                { label: 'Roll Compactor', key: 'rollCompSF', rate: calc.sgRoll, rateName: 'Sub Grade - Hand Roll' },
              ].map(({ label, key, depthKey, rate, perCf }) => {
                const cf = perCf ? n(state[key]) * (n(state[depthKey] || 4) / 12) : 0
                const cost = perCf ? cf * rate : n(state[key]) * rate
                return (
                <tr key={key}>
                  <td className={`${td} font-medium text-gray-700`}>
                    <span className="inline-flex items-center gap-1">
                      {label}
                      <span className="text-gray-400 font-normal">(${rate} per {perCf ? 'Cu Ft' : 'Sq Ft'})</span>
                    </span>
                  </td>
                  <td className={td}>
                    <Inp value={state[key]} onChange={e => set(key, e.target.value)} />
                  </td>
                  <td className={td}>
                    {perCf ? (
                      <Inp value={state[depthKey]} onChange={e => set(depthKey, e.target.value)} placeholder="4" />
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                  <td className={num}>{cost > 0 ? fmt2(cost) : '—'}</td>
                </tr>
                )
              })}
            </tbody>
          </table>
          <p className="text-xs text-gray-500 mt-1 italic">
            Note: Grade Cut is for up to 2&quot; only.
          </p>
          </>
        )}
      </div>
      {/* Vertical Demo */}
      <div className={isSub ? 'hidden' : undefined}>
        <div className="flex items-center flex-wrap gap-x-2 gap-y-1 text-xs font-bold text-gray-600 uppercase tracking-wider bg-gray-50 rounded-lg border border-gray-200 px-4 py-2.5 mt-4 mb-2">
          <span>{subSectionTitle('VERTICAL DEMO', isSub)}</span>
        </div>
        <table className="w-full text-xs">
          <TH
            cols={[
              { label: 'Description' },
              { label: 'LF', w: 'w-20' },
              { label: 'H (in)', w: 'w-18' },
              { label: 'W (in)', w: 'w-18' },
              { label: 'Cu Yd', w: 'w-16' },
              { label: 'Labor Hrs', w: 'w-20' },
            ]}
          />
          <tbody className="divide-y divide-gray-50">
            {state.miscVertRows.map((r, i) => {
              const cr = calc.miscVertCalc[i] || { tons: 0, cy: 0, hours: 0, cf: 0 }
              return (
                <tr key={i}>
                  <td className={td}>
                    <Inp
                      type="text"
                      value={r.label}
                      onChange={e => setRow('miscVertRows', i, 'label', e.target.value)}
                      placeholder={`Item ${i + 1}`}
                    />
                  </td>
                  <td className={td}>
                    <Inp
                      value={r.lf}
                      onChange={e => setRow('miscVertRows', i, 'lf', e.target.value)}
                    />
                  </td>
                  <td className={td}>
                    <Inp
                      value={r.heightIn}
                      onChange={e => setRow('miscVertRows', i, 'heightIn', e.target.value)}
                      placeholder="0"
                    />
                  </td>
                  <td className={td}>
                    <Inp
                      value={r.widthIn}
                      onChange={e => setRow('miscVertRows', i, 'widthIn', e.target.value)}
                      placeholder="8"
                    />
                  </td>
                  <td className={num}>{cr.cy > 0 ? cr.cy.toFixed(2) : '—'}</td>
                  <td className={num}>{fh(cr.hours)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
        <button
          type="button"
          onClick={() => set('miscVertRows', [...state.miscVertRows, { label: '', lf: '', heightIn: '', widthIn: 8 }])}
          className="mt-2 text-xs px-2 py-1 rounded bg-slate-100 text-slate-700 hover:bg-slate-200"
        >
          + Add Row
        </button>
      </div>

      {/* Footing */}
      <div className={isSub ? 'hidden' : undefined}>
        <div className="flex items-center flex-wrap gap-x-2 gap-y-1 text-xs font-bold text-gray-600 uppercase tracking-wider bg-gray-50 rounded-lg border border-gray-200 px-4 py-2.5 mt-4 mb-2">
          <span>{subSectionTitle('Footing Demo', isSub)}</span>
        </div>
        <table className="w-full text-xs">
          <TH
            cols={[
              { label: 'Description' },
              { label: 'LF', w: 'w-20' },
              { label: 'H (in)', w: 'w-18' },
              { label: 'W (in)', w: 'w-18' },
              { label: 'Cu Yd', w: 'w-16' },
              { label: 'Labor Hrs', w: 'w-20' },
            ]}
          />
          <tbody className="divide-y divide-gray-50">
            {state.footingRows.map((r, i) => {
              const cr = calc.footingCalc[i] || { tons: 0, cy: 0, hours: 0, cf: 0 }
              return (
                <tr key={i}>
                  <td className={td}>
                    <Inp
                      type="text"
                      value={r.label}
                      onChange={e => setRow('footingRows', i, 'label', e.target.value)}
                      placeholder={`Footing ${i + 1}`}
                    />
                  </td>
                  <td className={td}>
                    <Inp
                      value={r.lf}
                      onChange={e => setRow('footingRows', i, 'lf', e.target.value)}
                    />
                  </td>
                  <td className={td}>
                    <Inp
                      value={r.heightIn}
                      onChange={e => setRow('footingRows', i, 'heightIn', e.target.value)}
                      placeholder="0"
                    />
                  </td>
                  <td className={td}>
                    <Inp
                      value={r.widthIn}
                      onChange={e => setRow('footingRows', i, 'widthIn', e.target.value)}
                      placeholder="8"
                    />
                  </td>
                  <td className={num}>{cr.cy > 0 ? cr.cy.toFixed(2) : '—'}</td>
                  <td className={num}>{fh(cr.hours)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
        <button
          type="button"
          onClick={() => set('footingRows', [...state.footingRows, { label: '', lf: '', heightIn: '', widthIn: 8 }])}
          className="mt-2 text-xs px-2 py-1 rounded bg-slate-100 text-slate-700 hover:bg-slate-200"
        >
          + Add Row
        </button>
      </div>

      {/* Hand Bucket Areas removed — Bucket is now a per-row checkbox on Main Demo. */}

      {isSub && (
        <>
          <SecHdr title="Hauling" />
          <div>
            <table className="w-full text-xs">
              <TH
                cols={[{ label: 'Load Type' }, { label: 'Loads', w: 'w-24' }, { label: 'Cost', w: 'w-24' }]}
              />
              <tbody className="divide-y divide-gray-50">
                {[
                  { label: 'Trash Per 12 Yard Load', key: 'haulTrashLoads', rate: calc.haulTrashRate, rateName: 'Hand - Sub Haul - Trash 12yd' },
                  { label: 'Concrete Per 12 Yard Load', key: 'haulConcreteLoads', rate: calc.haulConcreteRate, rateName: 'Hand - Sub Haul - Concrete 12yd' },
                  { label: 'Soil Per 12 Yard Load', key: 'haulSoilLoads', rate: calc.haulSoilRate, rateName: 'Hand - Sub Haul - Soil 12yd' },
                  { label: 'Import Base Per 12 Yard Load', key: 'haulBaseLoads', rate: calc.haulBaseRate, rateName: 'Hand - Sub Haul - Import Base 12yd' },
                ].map(({ label, key, rate, rateName }) => (
                  <tr key={key}>
                    <td className={`${td} font-medium text-gray-700`}>
                      <span className="inline-flex items-center gap-1">
                        {label}
                        <span className="text-gray-400 font-normal">(${rate}/load)</span>
                      </span>
                    </td>
                    <td className={td}>
                      <Inp value={state[key]} onChange={e => set(key, e.target.value)} />
                    </td>
                    <td className={num}>{n(state[key]) > 0 ? fmt2(n(state[key]) * rate) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}


      {isSelf && (
        <>
      {/* Shrub Demo */}
      <SecHdr title="Shrub Demo" />
      <div>
        <table className="w-full text-xs">
          <TH
            cols={[
              { label: 'Area Description' },
              { label: 'Qty', w: 'w-20' },
              { label: 'Shrub Height', w: 'w-32' },
              { label: 'Labor Hrs', w: 'w-20' },
            ]}
          />
          <tbody className="divide-y divide-gray-50">
            {state.shrubRows.map((r, i) => {
              const cr = calc.shrubRowsCalc[i] || { hrs: 0 }
              return (
                <tr key={i}>
                  <td className={td}>
                    <Inp
                      type="text"
                      value={r.area}
                      onChange={e => setRow('shrubRows', i, 'area', e.target.value)}
                      placeholder={`Area ${i + 1}`}
                    />
                  </td>
                  <td className={td}>
                    <Inp value={r.qty} onChange={e => setRow('shrubRows', i, 'qty', e.target.value)} />
                  </td>
                  <td className={td}>
                    <select
                      value={r.height || '0-1'}
                      onChange={e => setRow('shrubRows', i, 'height', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
                    >
                      {[['0-1', '0–1 ft'], ['1-2', '1–2 ft'], ['2-3', '2–3 ft'], ['3-4', '3–4 ft'], ['4-5', '4–5 ft']].map(([v, l]) => (
                        <option key={v} value={v}>
                          {l}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className={num}>{fh(cr.hrs)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
        <div>
          <button
            type="button"
            onClick={() => set('shrubRows', [...state.shrubRows, { area: '', qty: '', height: '0-1' }])}
            className="mt-2 text-xs px-2 py-1 rounded bg-slate-100 text-slate-700 hover:bg-slate-200"
          >
            + Add Row
          </button>
        </div>
      </div>

      {/* Stump Demo */}
      <SecHdr title="Stump Demo" />
      <div className="grid grid-cols-2 gap-3">
        {[
          {
            label: 'Small (up to 12")',
            key: 'stumpSmallQty',
            hrs: calc.stumpSmallHrs,
            sub: `${calc.stumpSmallRate} hrs per Each`,
            rate: calc.stumpSmallRate,
            rateName: 'Hand - Stump Small',
            subRate: calc.ssSmall,
            subRateName: 'Sub Stump - Hand Small',
          },
          {
            label: 'Medium (12"–24")',
            key: 'stumpMedQty',
            hrs: calc.stumpMedHrs,
            sub: `${calc.stumpMedRate} hrs per Each`,
            rate: calc.stumpMedRate,
            rateName: 'Hand - Stump Medium',
            subRate: calc.ssMed,
            subRateName: 'Sub Stump - Hand Medium',
          },
          {
            label: 'Large (24"–36")',
            key: 'stumpLargeQty',
            hrs: calc.stumpLargeHrs,
            sub: `${calc.stumpLargeRate} hrs per Each`,
            rate: calc.stumpLargeRate,
            rateName: 'Hand - Stump Large',
            subRate: calc.ssLarge,
            subRateName: 'Sub Stump - Hand Large',
          },
          {
            label: 'Extra Large (36"–48")',
            key: 'stumpXLQty',
            hrs: calc.stumpXLHrs,
            sub: `${calc.stumpXLRate} hrs per Each`,
            rate: calc.stumpXLRate,
            rateName: 'Hand - Stump XL',
            subRate: calc.ssXL,
            subRateName: 'Sub Stump - Hand XL',
          },
        ].map(({ label, key, hrs, sub, rate, rateName, subRate, subRateName }) => (
          <div key={key}>
            <p className="text-xs text-gray-500 mb-0.5 inline-flex items-center gap-1">
              {label}
            </p>
            <Inp value={state[key]} onChange={e => set(key, e.target.value)} />
          </div>
        ))}
      </div>

        </>
      )}

      {/* Trees */}
      <div>
        <div className="flex items-center flex-wrap gap-x-2 gap-y-1 text-xs font-bold text-gray-600 uppercase tracking-wider bg-gray-50 rounded-lg border border-gray-200 px-4 py-2.5 mt-4 mb-2">
          <span>{subSectionTitle('Tree Demo', isSub)}</span>
        </div>
        <table className="w-full text-xs">
          <TH
            cols={
              isSelf
                ? [
                    { label: 'Qty', w: 'w-16' },
                    { label: 'Height (ft)', w: 'w-24' },
                    { label: 'Trunk Size', w: 'w-32' },
                    { label: 'Labor Hrs', w: 'w-20' },
                    { label: 'Tree Dump', w: 'w-24' },
                  ]
                : [
                    { label: 'Qty', w: 'w-16' },
                    { label: 'Trunk Size', w: 'w-32' },
                    { label: 'Cost', w: 'w-24' },
                  ]
            }
          />
          <tbody className="divide-y divide-gray-50">
            {(isSub ? state.subTreeRows : state.treeRows).map((r, i) => {
              const cr = calc.treeCalc[i] || { hrs: 0, dumpFee: 0 }
              return (
                <tr key={i}>
                  <td className={td}>
                    <Inp
                      value={r.qty}
                      onChange={e => setRow(isSub ? 'subTreeRows' : 'treeRows', i, 'qty', e.target.value)}
                    />
                  </td>
                  {isSelf && (
                    <td className={td}>
                      <Inp
                        value={r.height}
                        onChange={e => setRow('treeRows', i, 'height', e.target.value)}
                        placeholder="10"
                      />
                    </td>
                  )}
                  <td className={td}>
                    <Sel
                      value={r.size}
                      onChange={e => setRow(isSub ? 'subTreeRows' : 'treeRows', i, 'size', e.target.value)}
                      options={['6" - 12"', '12" - 18"', '18" - 24"']}
                    />
                  </td>
                  {isSelf ? (
                    <>
                      <td className={num}>{fh(cr.hrs)}</td>
                      <td className={num}>{cr.dumpFee > 0 ? fmt2(cr.dumpFee) : '—'}</td>
                    </>
                  ) : (
                    <td className={num}>
                      {n(r.qty) > 0 ? fmt2(n(r.qty) * calc.subTreeRateFor(r.size)) : '—'}
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
        <p className="text-xs text-gray-500 mt-1 italic">
          Note: trunks over 24" must be subcontracted.
        </p>
        <button
          type="button"
          onClick={() => set(isSub ? 'subTreeRows' : 'treeRows', [...(isSub ? state.subTreeRows : state.treeRows), { qty: '', height: 20, size: '6" - 12"' }])}
          className="mt-2 text-xs px-2 py-1 rounded bg-slate-100 text-slate-700 hover:bg-slate-200"
        >
          + Add Row
        </button>
      </div>

      {/* Manual */}
      <div>
        <div className="flex items-center gap-2 text-xs font-bold text-gray-600 uppercase tracking-wider bg-gray-50 rounded-lg border border-gray-200 px-4 py-2.5 mt-4 mb-2">
          {subSectionTitle('Manual Entry', isSub)}
        </div>
        <table className="w-full text-xs table-fixed">
          <TH
            center
            cols={
              isSub
                ? [
                    { label: 'Description', w: 'w-1/2' },
                    { label: 'Cost ($)', w: 'w-1/2' },
                  ]
                : [
                    { label: 'Description', w: 'w-1/3' },
                    { label: 'Hours', w: 'w-1/3' },
                    { label: 'Materials ($)', w: 'w-1/3' },
                  ]
            }
          />
          <tbody className="divide-y divide-gray-50">
            {(isSub ? state.subManualRows : state.manualRows).map((r, i, arr) => {
              const key = isSub ? 'subManualRows' : 'manualRows'
              return (
              <tr key={i}>
                <td className={td}>
                  <Inp
                    type="text"
                    value={r.label}
                    onChange={e => setRow(key, i, 'label', e.target.value)}
                    className="text-center"
                    placeholder="Description"
                  />
                </td>
                {isSub ? (
                  <td className={td}>
                    <div className="flex items-center gap-1">
                      <Inp
                        value={r.subCost}
                        onChange={e => setRow(key, i, 'subCost', e.target.value)}
                        className="text-center flex-1"
                        step="1"
                      />
                      {arr.length > 1 && (
                        <button
                          type="button"
                          onClick={() => set(key, arr.filter((_, idx) => idx !== i))}
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
                        onChange={e => setRow(key, i, 'hours', e.target.value)}
                        className="text-center"
                        step="0.5"
                      />
                    </td>
                    <td className={td}>
                      <div className="flex items-center gap-1">
                        <Inp
                          value={r.materials}
                          onChange={e => setRow(key, i, 'materials', e.target.value)}
                          className="text-center flex-1"
                          step="1"
                        />
                        {arr.length > 1 && (
                          <button
                            type="button"
                            onClick={() => set(key, arr.filter((_, idx) => idx !== i))}
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
              )
            })}
          </tbody>
        </table>
        <button
          type="button"
          onClick={() => set(isSub ? 'subManualRows' : 'manualRows', [...(isSub ? state.subManualRows : state.manualRows), { label: '', hours: '', materials: '', subCost: '' }])}
          className="mt-2 text-xs px-2 py-1 rounded bg-slate-100 text-slate-700 hover:bg-slate-200"
        >
          + Add manual entry
        </button>
      </div>

      {/* ── Materials Breakdown (per tab) ─────────────────────────────────────── */}
      {!calc.isSub && (
        <div className="bg-gray-50 rounded-lg p-3 text-xs">
          <p className="font-semibold text-gray-600 uppercase tracking-wide text-xs mb-2">
            In-House Materials Breakdown
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1 text-gray-600">
            {calc.dumpMatCost > 0 && (
              <span>
                Dump / Disposal: <strong>{fmt2(calc.dumpMatCost)}</strong>
              </span>
            )}
            {calc.baseMat > 0 && (
              <span>
                Import Base: <strong>{fmt2(calc.baseMat)}</strong>
              </span>
            )}
            {calc.manualMat > 0 && (
              <span>
                Manual: <strong>{fmt2(calc.manualMat)}</strong>
              </span>
            )}
            {calc.salesTax > 0 && (
              <span>
                Sales Tax: <strong>{fmt2(calc.salesTax)}</strong>
              </span>
            )}
          </div>
          <p className="mt-2 pt-2 border-t border-gray-200 font-semibold text-gray-800">
            Total Materials: {fmt2(calc.totalMat)}
          </p>
        </div>
      )}
      {calc.isSub && (
        <div className="bg-gray-50 rounded-lg p-3 text-xs">
          <p className="font-semibold text-gray-600 uppercase tracking-wide text-xs mb-2">
            Sub Materials Breakdown
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1 text-gray-600">
            {calc.subManualMat > 0 && (
              <span>
                Manual: <strong>{fmt2(calc.subManualMat)}</strong>
              </span>
            )}
          </div>
          <p className="mt-2 pt-2 border-t border-gray-200 text-gray-500 italic">
            Demo material is bundled into the flat subcontractor pricing, so most lines are $0.
          </p>
          <p className="mt-1 font-semibold text-gray-800">
            Total Materials: {fmt2(calc.subManualMat)}
          </p>
        </div>
      )}

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
    </SubRateOverrideProvider>
    </SubTabContext.Provider>
  )
}
