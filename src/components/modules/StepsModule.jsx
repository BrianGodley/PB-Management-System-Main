import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import GpmdBar from './GpmdBar'
import RateEditPopover from '../RateEditPopover'
import { fetchSalesTaxRate } from '../../lib/companyDefaults'
import { calcWalkAccessLabor, DEFAULT_WALK_ACCESS_PACE_LF_PER_MIN } from '../../lib/walkAccess'

// ─────────────────────────────────────────────────────────────────────────────
// Steps Module
// Labor rates (category='Steps') from labor_rates:
//   Steps - Straight          1.5 LF/hr  (paver steps)
//   Steps - Curved            1.0 LF/hr  (paver steps)
//   Steps - Concrete Straight 1.0 LF/hr  (concrete steps)
//   Steps - Concrete Curved   0.5 LF/hr  (concrete steps)
//
// Material rates (category='Steps') from material_rates:
//   Steps - Concrete          $12.00/LF
//
// Paver material selection pulled from paver_prices table (same as PaverModule).
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULTS = { laborRatePerHour: 35, laborBurdenPct: 0.29, gpmd: 425, commissionRate: 0.12 }
const n = v => parseFloat(v) || 0

// ── Calculation engine ────────────────────────────────────────────────────────
function calcSteps(state, lrph, laborRates, materialRates, paverPrices, gpmd = DEFAULTS.gpmd, walkAccess = null) {
  const _pace = (parseFloat(walkAccess?.paceLfPerMin) || DEFAULT_WALK_ACCESS_PACE_LF_PER_MIN)
  const lr = laborRates   || {}
  const mr = materialRates || {}
  const pp = paverPrices   || []

  // Paver step rates
  const straightRate = lr['Steps - Straight'] ?? 1.5  // LF/hr
  const curvedRate   = lr['Steps - Curved']   ?? 1.0  // LF/hr

  // Concrete step rates
  const concStraightRate = lr['Steps - Concrete Straight'] ?? 1.0   // LF/hr
  const concCurvedRate   = lr['Steps - Concrete Curved']   ?? 0.5   // LF/hr
  const concMatPerLF     = mr['Steps - Concrete']          ?? 12.00 // $/LF

  // Paver step labor hours
  const straightHrs = n(state.straightLF) > 0 ? n(state.straightLF) / straightRate : 0
  const curvedHrs   = n(state.curvedLF)   > 0 ? n(state.curvedLF)   / curvedRate   : 0

  // Paver step material cost
  const stepPaverData = pp.find(p => p.brand === state.paverBrand && p.name === state.paverName)
  const pricePerSF  = stepPaverData?.price_per_sf  || 0
  const sfPerPallet = stepPaverData?.sf_per_pallet || 0
  const paverSF     = n(state.paverSF)
  const paverCost   = paverSF * pricePerSF
  const pallets     = paverSF > 0 && sfPerPallet > 0 ? Math.ceil(paverSF / sfPerPallet) : 0

  // Concrete step labor hours + material
  const concStraightHrs  = n(state.concStraightLF) > 0 ? n(state.concStraightLF) / concStraightRate : 0
  const concCurvedHrs    = n(state.concCurvedLF)   > 0 ? n(state.concCurvedLF)   / concCurvedRate   : 0
  const concTotalLF      = n(state.concStraightLF) + n(state.concCurvedLF)
  const concMat          = concTotalLF * concMatPerLF

  // Manual entry
  let manHrs = 0, manMat = 0, manSub = 0
  ;(state.manualRows || []).forEach(r => {
    manHrs += n(r.hours); manMat += n(r.materials); manSub += n(r.subCost)
  })

  const baseHrs   = straightHrs + curvedHrs + concStraightHrs + concCurvedHrs + manHrs
  const diffMod   = 1 + n(state.difficulty) / 100
  const _preWalkHrs = baseHrs * diffMod + n(state.hoursAdj)
  const walkHrs     = calcWalkAccessLabor(_preWalkHrs, state.distanceLF, { paceLfPerMin: _pace })
  const totalHrs    = _preWalkHrs + walkHrs
  const manDays   = totalHrs / 8
  const totalMat  = paverCost + concMat + manMat

  const laborCost  = totalHrs * (n(lrph) || DEFAULTS.laborRatePerHour)
  const burden     = laborCost * DEFAULTS.laborBurdenPct
  const gp         = manDays * gpmd
  const commission = gp * DEFAULTS.commissionRate
  const subCost    = manSub
  const price      = totalMat + laborCost + burden + gp + commission + subCost

  return {
    walkHrs,
    totalHrs, manDays, totalMat, laborCost, burden, gp, commission, subCost, price,
    straightHrs, curvedHrs, paverCost, pallets, pricePerSF,
    straightRate, curvedRate,
    concStraightHrs, concCurvedHrs, concMat, concMatPerLF,
    concStraightRate, concCurvedRate,
  }
}

// ── UI helpers ────────────────────────────────────────────────────────────────
function SectionHeader({ title, sub }) {
  return (
    <div className="bg-gray-100 px-4 py-2 rounded-lg mb-2">
      <h3 className="text-xs font-bold text-gray-600 uppercase tracking-wider">
        {title}
        {sub && <span className="ml-2 font-normal normal-case text-gray-400">{sub}</span>}
      </h3>
    </div>
  )
}

function NumInput({ value, onChange, placeholder = '0', className = '' }) {
  return (
    <input type="number" step="any"
      className={`input text-sm py-1.5 ${className}`}
      placeholder={placeholder} value={value}
      onChange={e => onChange(e.target.value)}
    />
  )
}

// ── Paver picker (brand dropdown + searchable model) ─────────────────────────
function PaverPicker({ brand, name, onSelect, paverPrices }) {
  const [search, setSearch] = useState(name || '')
  const [open,   setOpen]   = useState(false)

  useEffect(() => { setSearch(name || '') }, [name])

  const brands   = [...new Set(paverPrices.map(p => p.brand))].filter(Boolean).sort()
  const filtered = paverPrices.filter(p => {
    if (brand && p.brand !== brand) return false
    if (!search) return true
    return p.name.toLowerCase().includes(search.toLowerCase())
  })

  return (
    <div className="flex gap-1.5">
      <select
        value={brand || ''}
        onChange={e => { onSelect(e.target.value, ''); setSearch('') }}
        className="border border-gray-200 rounded-md px-2 py-1.5 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-400 flex-shrink-0 w-24"
      >
        <option value="">— Brand —</option>
        {brands.map(b => <option key={b} value={b}>{b}</option>)}
      </select>

      <div className="relative min-w-0 flex-[2]">
        <input type="text" value={search}
          onChange={e => { setSearch(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 200)}
          placeholder={brand ? 'Search model…' : 'Select brand first'}
          disabled={!brand}
          className="w-full border border-gray-200 rounded-md px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400 disabled:bg-gray-50 disabled:text-gray-400"
        />
        {open && brand && filtered.length > 0 && (
          <div className="absolute z-50 top-full left-0 right-0 mt-0.5 bg-white border border-gray-200 rounded-md shadow-lg max-h-52 overflow-y-auto">
            {filtered.map(p => {
              const isSelected = p.name === name
              return (
                <button key={p.name} onMouseDown={() => { onSelect(p.brand, p.name); setSearch(p.name); setOpen(false) }}
                  className={`w-full text-left px-2.5 py-1.5 hover:bg-blue-50 border-b border-gray-50 last:border-0 ${isSelected ? 'bg-blue-50' : ''}`}>
                  <span className={`block text-xs truncate ${isSelected ? 'font-semibold text-blue-800' : 'text-gray-800'}`}>{p.name}</span>
                  <span className="text-xs text-gray-400">
                    ${parseFloat(p.price_per_sf || 0).toFixed(2)}/SF
                    {p.sf_per_pallet ? ` · ${p.sf_per_pallet} SF/pallet` : ''}
                  </span>
                </button>
              )
            })}
          </div>
        )}
        {open && brand && filtered.length === 0 && search && (
          <div className="absolute z-50 top-full left-0 right-0 mt-0.5 bg-white border border-gray-200 rounded-md shadow-sm px-3 py-2 text-xs text-gray-400">
            No models match "{search}"
          </div>
        )}
      </div>
    </div>
  )
}

const DEFAULT_MANUAL_ROWS = [
  { label: 'Misc 1', hours: '', materials: '', subCost: '' },
  { label: 'Misc 2', hours: '', materials: '', subCost: '' },
  { label: 'Misc 3', hours: '', materials: '', subCost: '' },
  { label: 'Misc 4', hours: '', materials: '', subCost: '' },
]

// ── Main component ────────────────────────────────────────────────────────────
export default function StepsModule({ projectName, onSave, onBack, saving, initialData }) {
  const [laborRatePerHour, setLaborRatePerHour] = useState(initialData?.laborRatePerHour ?? DEFAULTS.laborRatePerHour)
  const [distanceLF, setDistanceLF] = useState(initialData?.distanceLF ?? '')
  const [walkAccess, setWalkAccess] = useState(initialData?.walkAccess ?? {
    paceLfPerMin: DEFAULT_WALK_ACCESS_PACE_LF_PER_MIN,
  })
  const [laborRates,    setLaborRates]    = useState(initialData?.laborRates    || {})
  const [materialRates, setMaterialRates] = useState(initialData?.materialRates || {})
  const [paverPrices,   setPaverPrices]   = useState(initialData?.paverPrices   || [])
  const [loading,       setLoading]       = useState(true)

  // Re-fetch Steps rate maps. Called once on mount and again after any
  // RateEditPopover save so the calc picks up the change immediately.
  const refreshAllRates = useCallback(async () => {
    const [lrRes, mrRes] = await Promise.all([
      supabase.from('labor_rates').select('name, rate').eq('category', 'Steps'),
      supabase.from('material_rates').select('name, unit_cost').eq('category', 'Steps'),
    ])
    if (lrRes.data) { const m = {}; lrRes.data.forEach(r => { m[r.name] = parseFloat(r.rate) }); setLaborRates(m) }
    if (mrRes.data) { const m = {}; mrRes.data.forEach(r => { m[r.name] = parseFloat(r.unit_cost) }); setMaterialRates(m) }
  }, [])

  useEffect(() => {
    let gone = false
    Promise.all([
      !initialData?.laborRatePerHour &&
        supabase.from('company_settings').select('labor_rate_per_hour, walk_access_pace_lf_per_min').single()
          .then(({ data }) => {
            if (!gone && data?.labor_rate_per_hour != null)
              setLaborRatePerHour(parseFloat(data.labor_rate_per_hour) || DEFAULTS.laborRatePerHour)
          }),
      refreshAllRates(),
      supabase.from('paver_prices').select('brand, name, price_per_sf, sf_per_pallet')
        .order('brand').order('name')
        .then(({ data }) => { if (!gone && data) setPaverPrices(data) }),
    ]).then(() => { if (!gone) setLoading(false) })
    return () => { gone = true }
  }, [refreshAllRates])

  const gpmd            = initialData?.gpmd            ?? DEFAULTS.gpmd
  const subGpMarkupRate = initialData?.subGpMarkupRate ?? 0.20

  // ── State ──────────────────────────────────────────────────────────────────
  const [difficulty,  setDifficulty]  = useState(initialData?.difficulty  ?? '')
  const [crewType, setCrewType] = useState(initialData?.crewType ?? 'Masonry')
  const [hoursAdj,    setHoursAdj]    = useState(initialData?.hoursAdj    ?? '')

  // Paver Steps
  const [straightLF,  setStraightLF]  = useState(initialData?.straightLF  ?? '')
  const [curvedLF,    setCurvedLF]    = useState(initialData?.curvedLF    ?? '')
  const [groutedBullnose, setGroutedBullnose] = useState(initialData?.groutedBullnose ?? false)
  const [paverBrand,  setPaverBrand]  = useState(initialData?.paverBrand  ?? '')
  const [paverName,   setPaverName]   = useState(initialData?.paverName   ?? '')
  const [paverSF,     setPaverSF]     = useState(initialData?.paverSF     ?? '')

  // Concrete Steps
  const [concStraightLF, setConcStraightLF] = useState(initialData?.concStraightLF ?? '')
  const [concCurvedLF,   setConcCurvedLF]   = useState(initialData?.concCurvedLF   ?? '')

  // Manual entry
  const [manualRows, setManualRows] = useState(initialData?.manualRows ?? DEFAULT_MANUAL_ROWS)

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


  const state = {
    crewType,
    difficulty, hoursAdj,
    straightLF, curvedLF, groutedBullnose,
    paverBrand, paverName, paverSF,
    concStraightLF, concCurvedLF,
    manualRows,
    distanceLF,
  }

  const calcRaw = calcSteps(state, laborRatePerHour, laborRates, materialRates, paverPrices, gpmd, walkAccess)
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


  function updateManual(i, field, val) {
    setManualRows(rows => rows.map((row, idx) => idx === i ? { ...row, [field]: val } : row))
  }

  function handleSave() {
    onSave({
      man_days:      parseFloat(calc.manDays.toFixed(2)),
      material_cost: parseFloat(calc.totalMat.toFixed(2)),
      data: { ...state, walkAccess, laborRatePerHour, gpmd, laborRates, materialRates, paverPrices, calc },
    })
  }

  const fmt2 = v => `$${(v || 0).toFixed(2)}`

  return (
    <div className="space-y-5">

      {/* ── Sticky GPMD bar ── */}
      <div className="sticky top-0 z-20 -mx-6 px-6 pt-2 pb-2 bg-gray-900 shadow-lg">
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

      {loading && (
        <div className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2">
          Loading rates…
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

      {/* ── Paver Steps ── */}
      <div>
        <SectionHeader
          title="Paver Steps"
          sub={`straight ${calc.straightRate} LF/hr · curved ${calc.curvedRate} LF/hr`}
        />

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {/* Straight Steps */}
          <div>
            <label className="block text-xs text-gray-500 mb-1 inline-flex items-center gap-1">
              Straight Steps (LF) — {calc.straightRate} LF/hr
              <RateEditPopover table="labor_rates" name="Steps - Straight" category="Steps"
                mode="coefficient" unitLabel="LF/hr" currentValue={calc.straightRate} onSaved={refreshAllRates} />
            </label>
            <NumInput value={straightLF} onChange={setStraightLF} placeholder="0" />
            {calc.straightHrs > 0 && (
              <p className="text-xs text-gray-400 mt-0.5">{calc.straightHrs.toFixed(2)} hrs</p>
            )}
          </div>

          {/* Curved Steps */}
          <div>
            <label className="block text-xs text-gray-500 mb-1 inline-flex items-center gap-1">
              Curved Steps (LF) — {calc.curvedRate} LF/hr
              <RateEditPopover table="labor_rates" name="Steps - Curved" category="Steps"
                mode="coefficient" unitLabel="LF/hr" currentValue={calc.curvedRate} onSaved={refreshAllRates} />
            </label>
            <NumInput value={curvedLF} onChange={setCurvedLF} placeholder="0" />
            {calc.curvedHrs > 0 && (
              <p className="text-xs text-gray-400 mt-0.5">{calc.curvedHrs.toFixed(2)} hrs</p>
            )}
          </div>

          {/* Step Paver SF */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">Step Paver SF</label>
            <NumInput value={paverSF} onChange={setPaverSF} placeholder="0" />
            {calc.pallets > 0 && (
              <p className="text-xs text-gray-400 mt-0.5">
                {calc.pallets} pallet{calc.pallets !== 1 ? 's' : ''}
              </p>
            )}
          </div>

          {/* Grouted / Bullnose toggle */}
          <div className="flex flex-col justify-center pt-4">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input type="checkbox" checked={groutedBullnose}
                onChange={e => setGroutedBullnose(e.target.checked)}
                className="w-4 h-4 rounded accent-blue-600"
              />
              <span className="text-sm text-gray-700">Grouted / Bullnose</span>
            </label>
          </div>
        </div>

        {/* Paver picker */}
        <div className="mt-3">
          <label className="block text-xs text-gray-500 mb-1">Step Paver Selection</label>
          <PaverPicker
            brand={paverBrand}
            name={paverName}
            onSelect={(b, nm) => { setPaverBrand(b); setPaverName(nm) }}
            paverPrices={paverPrices}
          />
          {calc.paverCost > 0 && (
            <p className="text-xs text-gray-400 mt-1">
              {n(paverSF)} SF × {fmt2(calc.pricePerSF)}/SF = {fmt2(calc.paverCost)}
            </p>
          )}
        </div>
      </div>

      {/* ── Concrete Steps ── */}
      <div>
        <SectionHeader
          title="Concrete Steps"
          sub={`straight ${calc.concStraightRate} LF/hr · curved ${calc.concCurvedRate} LF/hr · $${calc.concMatPerLF}/LF mat`}
        />
        <div className="flex items-center gap-2 mb-2 -mt-1 flex-wrap text-xs text-gray-400">
          <span className="inline-flex items-center gap-1">
            Material ${calc.concMatPerLF}/LF
            <RateEditPopover table="material_rates" name="Steps - Concrete" category="Steps"
              unitLabel="LF" currentValue={calc.concMatPerLF} onSaved={refreshAllRates} />
          </span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1 inline-flex items-center gap-1">
              Straight Steps (LF) — {calc.concStraightRate} LF/hr
              <RateEditPopover table="labor_rates" name="Steps - Concrete Straight" category="Steps"
                mode="coefficient" unitLabel="LF/hr" currentValue={calc.concStraightRate} onSaved={refreshAllRates} />
            </label>
            <NumInput value={concStraightLF} onChange={setConcStraightLF} placeholder="0" />
            {calc.concStraightHrs > 0 && (
              <p className="text-xs text-gray-400 mt-0.5">{calc.concStraightHrs.toFixed(2)} hrs</p>
            )}
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1 inline-flex items-center gap-1">
              Curved Steps (LF) — {calc.concCurvedRate} LF/hr
              <RateEditPopover table="labor_rates" name="Steps - Concrete Curved" category="Steps"
                mode="coefficient" unitLabel="LF/hr" currentValue={calc.concCurvedRate} onSaved={refreshAllRates} />
            </label>
            <NumInput value={concCurvedLF} onChange={setConcCurvedLF} placeholder="0" />
            {calc.concCurvedHrs > 0 && (
              <p className="text-xs text-gray-400 mt-0.5">{calc.concCurvedHrs.toFixed(2)} hrs</p>
            )}
          </div>
        </div>
        {calc.concMat > 0 && (
          <p className="text-xs text-gray-400 mt-2">
            {n(concStraightLF) + n(concCurvedLF)} LF × {fmt2(calc.concMatPerLF)}/LF = {fmt2(calc.concMat)}
          </p>
        )}
      </div>

      {/* ── Manual Entry ── */}
      <div>
        <SectionHeader title="Manual Entry" />
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
