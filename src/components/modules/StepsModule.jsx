import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import GpmdBar from './GpmdBar'

// ─────────────────────────────────────────────────────────────────────────────
// Steps Module
// Labor rates (category='Steps') from labor_rates:
//   Steps - Straight    1.5 LF/hr
//   Steps - Curved      1.0 LF/hr
//
// Paver material selection pulled from paver_prices table (same as PaverModule).
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULTS = { laborRatePerHour: 35, laborBurdenPct: 0.29, gpmd: 425, commissionRate: 0.12 }
const n = v => parseFloat(v) || 0

// ── Calculation engine ────────────────────────────────────────────────────────
function calcSteps(state, lrph, laborRates, paverPrices, gpmd = DEFAULTS.gpmd) {
  const lr = laborRates || {}
  const pp = paverPrices || []

  const straightRate = lr['Steps - Straight'] ?? 1.5  // LF/hr
  const curvedRate   = lr['Steps - Curved']   ?? 1.0  // LF/hr

  // Step labor hours
  const straightHrs = n(state.straightLF) > 0 ? n(state.straightLF) / straightRate : 0
  const curvedHrs   = n(state.curvedLF)   > 0 ? n(state.curvedLF)   / curvedRate   : 0

  // Step paver material cost
  const stepPaverData = pp.find(p => p.brand === state.paverBrand && p.name === state.paverName)
  const pricePerSF  = stepPaverData?.price_per_sf  || 0
  const sfPerPallet = stepPaverData?.sf_per_pallet || 0
  const paverSF     = n(state.paverSF)
  const paverCost   = paverSF * pricePerSF
  const pallets     = paverSF > 0 && sfPerPallet > 0 ? Math.ceil(paverSF / sfPerPallet) : 0

  // Manual entry
  let manHrs = 0, manMat = 0, manSub = 0
  ;(state.manualRows || []).forEach(r => {
    manHrs += n(r.hours); manMat += n(r.materials); manSub += n(r.subCost)
  })

  const baseHrs   = straightHrs + curvedHrs + manHrs
  const diffMod   = 1 + n(state.difficulty) / 100
  const totalHrs  = baseHrs * diffMod + n(state.hoursAdj)
  const manDays   = totalHrs / 8
  const totalMat  = paverCost + manMat

  const laborCost  = totalHrs * (n(lrph) || DEFAULTS.laborRatePerHour)
  const burden     = laborCost * DEFAULTS.laborBurdenPct
  const gp         = manDays * gpmd
  const commission = gp * DEFAULTS.commissionRate
  const subCost    = manSub
  const price      = totalMat + laborCost + burden + gp + commission + subCost

  return {
    totalHrs, manDays, totalMat, laborCost, burden, gp, commission, subCost, price,
    straightHrs, curvedHrs, paverCost, pallets, pricePerSF,
    straightRate, curvedRate,
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
    <input type="number" step="any" min="0"
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
  const [laborRates,   setLaborRates]   = useState(initialData?.laborRates   || {})
  const [paverPrices,  setPaverPrices]  = useState(initialData?.paverPrices  || [])
  const [loading,      setLoading]      = useState(true)

  useEffect(() => {
    let gone = false
    Promise.all([
      !initialData?.laborRatePerHour &&
        supabase.from('company_settings').select('labor_rate_per_hour').single()
          .then(({ data }) => {
            if (!gone && data?.labor_rate_per_hour != null)
              setLaborRatePerHour(parseFloat(data.labor_rate_per_hour) || DEFAULTS.laborRatePerHour)
          }),
      supabase.from('labor_rates').select('name, rate').eq('category', 'Steps')
        .then(({ data }) => {
          if (!gone && data) {
            const m = {}
            data.forEach(r => { m[r.name] = parseFloat(r.rate) })
            setLaborRates(m)
          }
        }),
      supabase.from('paver_prices').select('brand, name, price_per_sf, sf_per_pallet')
        .order('brand').order('name')
        .then(({ data }) => { if (!gone && data) setPaverPrices(data) }),
    ]).then(() => { if (!gone) setLoading(false) })
    return () => { gone = true }
  }, [])

  const gpmd            = initialData?.gpmd            ?? DEFAULTS.gpmd
  const subGpMarkupRate = initialData?.subGpMarkupRate ?? 0.20

  // ── State ──────────────────────────────────────────────────────────────────
  const [difficulty,  setDifficulty]  = useState(initialData?.difficulty  ?? '')
  const [hoursAdj,    setHoursAdj]    = useState(initialData?.hoursAdj    ?? '')

  // Paver Steps
  const [straightLF,  setStraightLF]  = useState(initialData?.straightLF  ?? '')
  const [curvedLF,    setCurvedLF]    = useState(initialData?.curvedLF    ?? '')
  const [groutedBullnose, setGroutedBullnose] = useState(initialData?.groutedBullnose ?? false)
  const [paverBrand,  setPaverBrand]  = useState(initialData?.paverBrand  ?? '')
  const [paverName,   setPaverName]   = useState(initialData?.paverName   ?? '')
  const [paverSF,     setPaverSF]     = useState(initialData?.paverSF     ?? '')

  // Manual entry
  const [manualRows, setManualRows] = useState(initialData?.manualRows ?? DEFAULT_MANUAL_ROWS)

  const state = {
    difficulty, hoursAdj,
    straightLF, curvedLF, groutedBullnose,
    paverBrand, paverName, paverSF,
    manualRows,
  }

  const calc = calcSteps(state, laborRatePerHour, laborRates, paverPrices, gpmd)

  function updateManual(i, field, val) {
    setManualRows(rows => rows.map((row, idx) => idx === i ? { ...row, [field]: val } : row))
  }

  function handleSave() {
    onSave({
      man_days:      parseFloat(calc.manDays.toFixed(2)),
      material_cost: parseFloat(calc.totalMat.toFixed(2)),
      data: { ...state, laborRatePerHour, gpmd, laborRates, paverPrices, calc },
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

      {/* ── Paver Steps ── */}
      <div>
        <SectionHeader
          title="Paver Steps"
          sub={`straight ${calc.straightRate} LF/hr · curved ${calc.curvedRate} LF/hr`}
        />

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {/* Straight Steps */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">Straight Steps (LF)</label>
            <NumInput value={straightLF} onChange={setStraightLF} placeholder="0" />
            {calc.straightHrs > 0 && (
              <p className="text-xs text-gray-400 mt-0.5">{calc.straightHrs.toFixed(2)} hrs</p>
            )}
          </div>

          {/* Curved Steps */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">Curved Steps (LF)</label>
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
