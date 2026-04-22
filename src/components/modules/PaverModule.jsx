// ─────────────────────────────────────────────────────────────────────────────
// PaverModule — Paver estimator
//
// Labor rates (category='Paver') from labor_rates table:
//   Paver - Install          20 SF/hr
//   Paver - Straight Cut     70 LF/hr
//   Paver - Curved Cut       30 LF/hr
//   Paver - Restraints       22 LF/hr
//   Paver - Sleeves          10 LF/hr
//   Paver - Vertical Soldier  8 LF/hr
//   Paver - Sealer          200 SF/hr
//   Paver - Step Straight    1.5 LF/hr
//   Paver - Step Curved      1.0 LF/hr
//   Paver - 80mm Add         0.15 (multiplier × install SF / install rate)
//   Paver - Stone Add        0.05 hrs/ea
//   Paver - Color Add        0.05 hrs/ea
//   Paver - Poly Sand Spread 0.004 hrs/SF
//   Paver - Base Skid Steer Good 10 tons/hr
//   Paver - Base Skid Steer OK   7.5 tons/hr
//   Paver - Base Mini Skid Steer  5 tons/hr
//   Paver - Base Hand        2.5 tons/hr
//
// Material rates (category='Paver') from material_rates table:
//   Paver - Base Rock           $7.50/ton
//   Paver - Bedding Sand       $25.30/ton
//   Paver - Joint Sand          $0.05/SF
//   Paver - Poly Sand           $0.56/SF
//   Paver - Sealer              $0.63/SF
//   Paver - Restraint Concrete  $1.38/LF
//   Paver - Sleeves             $0.46/LF
//   Paver - Pallet Charge      $51.75/pallet
//   Paver - Delivery          $442.75 flat
//
// Paver prices from paver_prices table: brand, name, price_per_sf,
//   sf_per_pallet, price_per_lf_vert
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import GpmdBar from './GpmdBar'

const n = v => parseFloat(v) || 0
const sfToTons = (sf, depthIn) => (n(sf) / 200) * n(depthIn)

const BASE_METHODS = ['Skid Good', 'Skid OK', 'Mini Skid', 'Hand']

// ── Fallback constants (matched to seed SQL) ──────────────────────────────────
const LABOR_DEFAULTS = {
  install:        20,
  straightCut:    70,
  curvedCut:      30,
  restraints:     22,
  sleeves:        10,
  vertSoldier:     8,
  sealer:        200,
  stepStraight:   1.5,
  stepCurved:     1.0,
  add80mm:        0.15,
  addStone:       0.05,
  addColor:       0.05,
  polySandSpread: 0.004,
  baseBobcatGood: 10,
  baseBobcatOK:   7.5,
  baseMiniBobcat: 5,
  baseHand:       2.5,
}

const MAT_DEFAULTS = {
  baseRock:        7.50,
  beddingSand:    25.30,
  jointSand:       0.05,
  polySandMat:     0.56,
  sealerMat:       0.63,
  restraintConcr:  1.38,
  sleevesMat:      0.46,
  palletCharge:   51.75,
  delivery:      442.75,
}

// ── Calculation engine ────────────────────────────────────────────────────────
function calcPaver(state, laborRatePerHour, laborRates, materialRates, paverPrices, gpmd = 425) {
  const lr = laborRates   || {}
  const mr = materialRates || {}
  const pp = paverPrices   || []

  // Labor rates
  const installRate      = lr['Paver - Install']          ?? LABOR_DEFAULTS.install
  const straightCutRate  = lr['Paver - Straight Cut']     ?? LABOR_DEFAULTS.straightCut
  const curvedCutRate    = lr['Paver - Curved Cut']       ?? LABOR_DEFAULTS.curvedCut
  const restraintRate    = lr['Paver - Restraints']       ?? LABOR_DEFAULTS.restraints
  const sleevesRate      = lr['Paver - Sleeves']          ?? LABOR_DEFAULTS.sleeves
  const vertSoldierRate  = lr['Paver - Vertical Soldier'] ?? LABOR_DEFAULTS.vertSoldier
  const sealerRate       = lr['Paver - Sealer']           ?? LABOR_DEFAULTS.sealer
  const stepStraightRate = lr['Paver - Step Straight']    ?? LABOR_DEFAULTS.stepStraight
  const stepCurvedRate   = lr['Paver - Step Curved']      ?? LABOR_DEFAULTS.stepCurved
  const add80mmMult      = lr['Paver - 80mm Add']         ?? LABOR_DEFAULTS.add80mm
  const addStonePer      = lr['Paver - Stone Add']        ?? LABOR_DEFAULTS.addStone
  const addColorPer      = lr['Paver - Color Add']        ?? LABOR_DEFAULTS.addColor
  const polySandSpread   = lr['Paver - Poly Sand Spread'] ?? LABOR_DEFAULTS.polySandSpread
  const baseBobcatGood   = lr['Paver - Base Skid Steer Good'] ?? LABOR_DEFAULTS.baseBobcatGood
  const baseBobcatOK     = lr['Paver - Base Skid Steer OK']   ?? LABOR_DEFAULTS.baseBobcatOK
  const baseMiniBobcat   = lr['Paver - Base Mini Skid Steer'] ?? LABOR_DEFAULTS.baseMiniBobcat
  const baseHand         = lr['Paver - Base Hand']        ?? LABOR_DEFAULTS.baseHand

  // Material rates
  const baseRockPerTon    = mr['Paver - Base Rock']           ?? MAT_DEFAULTS.baseRock
  const beddingSandPerTon = mr['Paver - Bedding Sand']        ?? MAT_DEFAULTS.beddingSand
  const jointSandPerSF    = mr['Paver - Joint Sand']          ?? MAT_DEFAULTS.jointSand
  const polySandPerSF     = mr['Paver - Poly Sand']           ?? MAT_DEFAULTS.polySandMat
  const sealerMatPerSF    = mr['Paver - Sealer']              ?? MAT_DEFAULTS.sealerMat
  const restraintConcrLF  = mr['Paver - Restraint Concrete']  ?? MAT_DEFAULTS.restraintConcr
  const sleevesMatLF      = mr['Paver - Sleeves']             ?? MAT_DEFAULTS.sleevesMat
  const palletCharge      = mr['Paver - Pallet Charge']       ?? MAT_DEFAULTS.palletCharge
  const deliveryFlat      = mr['Paver - Delivery']            ?? MAT_DEFAULTS.delivery

  const BASE_RATE_MAP = {
    'Skid Good': baseBobcatGood,
    'Skid OK':   baseBobcatOK,
    'Mini Skid': baseMiniBobcat,
    'Hand':      baseHand,
  }

  // ── Paver areas ─────────────────────────────────────────────────────────────
  const areas = (state.areaRows || []).map(row => {
    const sf = n(row.sf)
    const depthIn = n(row.depth) || 6
    const baseTons = sfToTons(sf, depthIn)
    const baseRate = BASE_RATE_MAP[row.method] ?? baseBobcatOK
    const baseHrs  = baseTons > 0 ? baseTons / baseRate : 0

    const paverData  = pp.find(p => p.brand === row.paverBrand && p.name === row.paverName)
    const pricePerSF = paverData?.price_per_sf  || 0
    const sfPerPallet= paverData?.sf_per_pallet || 0
    const pallets    = sf > 0 && sfPerPallet > 0 ? Math.ceil(sf / sfPerPallet) : 0
    const paverCost  = sf * pricePerSF

    return { sf, depthIn, baseTons, baseHrs, paverCost, pallets, pricePerSF, sfPerPallet }
  })

  const totalInstallSF   = areas.reduce((s, a) => s + a.sf,        0)
  const totalBaseTons    = areas.reduce((s, a) => s + a.baseTons,   0)
  const totalBaseHrs     = areas.reduce((s, a) => s + a.baseHrs,    0)
  const totalPaverCost   = areas.reduce((s, a) => s + a.paverCost,  0)
  const totalAreaPallets = areas.reduce((s, a) => s + a.pallets,    0)

  // ── Install labor hours ──────────────────────────────────────────────────────
  const installHrs     = totalInstallSF > 0 ? totalInstallSF / installRate : 0
  const add80mmHrs     = state.is80mm && totalInstallSF > 0
    ? totalInstallSF * add80mmMult / installRate : 0
  const straightCutHrs = n(state.straightCutLF) > 0 ? n(state.straightCutLF) / straightCutRate : 0
  const curvedCutHrs   = n(state.curvedCutLF)   > 0 ? n(state.curvedCutLF)   / curvedCutRate   : 0
  const restraintsHrs  = n(state.restraintsLF)  > 0 ? n(state.restraintsLF)  / restraintRate   : 0
  const sleevesHrs     = n(state.sleevesLF)     > 0 ? n(state.sleevesLF)     / sleevesRate     : 0
  const vertSoldierHrs = n(state.vertSoldierLF) > 0 ? n(state.vertSoldierLF) / vertSoldierRate : 0
  const sealerHrs      = n(state.sealerSF)      > 0 ? n(state.sealerSF)      / sealerRate      : 0
  const polySandHrs    = state.polySand && totalInstallSF > 0
    ? totalInstallSF * polySandSpread : 0
  const addStoneHrs    = n(state.numStones) * addStonePer
  const addColorHrs    = n(state.numColors) * addColorPer

  // ── Steps ────────────────────────────────────────────────────────────────────
  const stepStraightHrs = n(state.stepStraightLF) > 0
    ? n(state.stepStraightLF) / stepStraightRate : 0
  const stepCurvedHrs   = n(state.stepCurvedLF) > 0
    ? n(state.stepCurvedLF) / stepCurvedRate : 0
  const stepPaverData   = pp.find(p => p.brand === state.stepPaverBrand && p.name === state.stepPaverName)
  const stepPricePerSF  = stepPaverData?.price_per_sf  || 0
  const stepSFPerPallet = stepPaverData?.sf_per_pallet || 0
  const stepPaverSF     = n(state.stepPaverSF)
  const stepPaverCost   = stepPaverSF * stepPricePerSF
  const stepPallets     = stepPaverSF > 0 && stepSFPerPallet > 0
    ? Math.ceil(stepPaverSF / stepSFPerPallet) : 0

  // ── Vertical soldier ─────────────────────────────────────────────────────────
  const vertPaverData  = pp.find(p => p.brand === state.vertPaverBrand && p.name === state.vertPaverName)
  const vertPricePerLF = vertPaverData?.price_per_lf_vert || 0
  const vertPaverCost  = n(state.vertSoldierLF) * vertPricePerLF

  const totalPallets = totalAreaPallets + stepPallets

  // ── Manual rows ──────────────────────────────────────────────────────────────
  const manualRows = (state.manualRows || []).filter(r =>
    n(r.hours) > 0 || n(r.materials) > 0 || n(r.subCost) > 0
  )
  const manualHrs = manualRows.reduce((s, r) => s + n(r.hours), 0)
  const manualMat = manualRows.reduce((s, r) => s + n(r.materials), 0)
  const manualSub = manualRows.reduce((s, r) => s + n(r.subCost), 0)

  // ── Hour totals ───────────────────────────────────────────────────────────────
  const diff   = 1 + n(state.difficulty) / 100
  const hrsAdj = n(state.hoursAdj)
  const rawInstallHrs = installHrs + add80mmHrs + straightCutHrs + curvedCutHrs +
    restraintsHrs + sleevesHrs + vertSoldierHrs + sealerHrs + polySandHrs +
    addStoneHrs + addColorHrs + stepStraightHrs + stepCurvedHrs
  const adjustedInstallHrs = rawInstallHrs * diff + hrsAdj
  const totalHrs = adjustedInstallHrs + totalBaseHrs + manualHrs

  // ── Materials ─────────────────────────────────────────────────────────────────
  const baseRockCost     = totalBaseTons * baseRockPerTon
  const beddingSandCost  = sfToTons(totalInstallSF, 1) * beddingSandPerTon
  const jointSandCost    = totalInstallSF * jointSandPerSF
  const polySandCost     = state.polySand ? totalInstallSF * polySandPerSF : 0
  const sealerMatCost    = n(state.sealerSF) * sealerMatPerSF
  const restraintMatCost = n(state.restraintsLF) * restraintConcrLF
  const sleevesMatCost   = n(state.sleevesLF) * sleevesMatLF
  const palletCost       = totalPallets * palletCharge
  const deliveryCost     = state.includeDelivery ? deliveryFlat : 0
  const shipping         = n(state.shippingCharge)
  const salesTaxRate     = n(state.salesTax) / 100
  const salesTaxCost     = (totalPaverCost + stepPaverCost + vertPaverCost) * salesTaxRate

  const totalMat = totalPaverCost + stepPaverCost + vertPaverCost +
    baseRockCost + beddingSandCost + jointSandCost + polySandCost +
    sealerMatCost + restraintMatCost + sleevesMatCost + palletCost +
    deliveryCost + shipping + salesTaxCost + manualMat

  // ── Financials ────────────────────────────────────────────────────────────────
  const manDays   = totalHrs / 8
  const lrph      = n(laborRatePerHour) || 35
  const laborCost = totalHrs * lrph
  const burden    = laborCost * 0.29
  const gp        = manDays * gpmd
  const commission= gp * 0.12
  const subCost   = manualSub
  const price     = laborCost + burden + totalMat + gp + commission + subCost

  return {
    totalHrs, adjustedInstallHrs, totalBaseHrs, rawInstallHrs,
    manDays, laborCost, burden, totalMat, subCost, gp, commission, price,
    areas, totalInstallSF, totalBaseTons, totalPallets, totalAreaPallets, stepPallets,
    installHrs, add80mmHrs, straightCutHrs, curvedCutHrs,
    restraintsHrs, sleevesHrs, vertSoldierHrs, sealerHrs, polySandHrs,
    addStoneHrs, addColorHrs, stepStraightHrs, stepCurvedHrs,
    baseRockCost, beddingSandCost, jointSandCost, polySandCost,
    sealerMatCost, restraintMatCost, sleevesMatCost, palletCost,
    deliveryCost, shipping, salesTaxCost, totalPaverCost, stepPaverCost, vertPaverCost,
    manualHrs, manualMat, manualSub,
    installRate, straightCutRate, curvedCutRate, restraintRate,
    sleevesRate, vertSoldierRate, sealerRate, stepStraightRate, stepCurvedRate,
    baseBobcatGood, baseBobcatOK, baseMiniBobcat, baseHand,
    baseRockPerTon, beddingSandPerTon, jointSandPerSF, polySandPerSF,
    sealerMatPerSF, restraintConcrLF, sleevesMatLF, palletCharge, deliveryFlat,
    stepPricePerSF, stepPaverSF, vertPricePerLF,
  }
}

// ── Default state ─────────────────────────────────────────────────────────────
const DEFAULT_STATE = {
  difficulty: 0,
  hoursAdj: 0,
  areaRows: [
    { label: 'Area 1', method: 'Skid OK', sf: '', depth: 6, paverBrand: '', paverName: '' },
    { label: 'Area 2', method: 'Skid OK', sf: '', depth: 6, paverBrand: '', paverName: '' },
    { label: 'Area 3', method: 'Skid OK', sf: '', depth: 6, paverBrand: '', paverName: '' },
  ],
  straightCutLF: '',
  curvedCutLF: '',
  restraintsLF: '',
  numStones: '',
  numColors: '',
  sleevesLF: '',
  vertSoldierLF: '',
  vertPaverBrand: '',
  vertPaverName: '',
  sealerSF: '',
  is80mm: false,
  polySand: false,
  includeDelivery: false,
  stepStraightLF: '',
  stepCurvedLF: '',
  stepPaverBrand: '',
  stepPaverName: '',
  stepPaverSF: '',
  salesTax: 0,
  shippingCharge: '',
  manualRows: [
    { label: '', hours: '', materials: '', subCost: '' },
    { label: '', hours: '', materials: '', subCost: '' },
  ],
}

// ── UI helpers ────────────────────────────────────────────────────────────────
function SecHdr({ title, sub }) {
  return (
    <p className="col-span-full text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200 pb-1 mt-4 mb-1">
      {title}{sub && <span className="ml-2 font-normal normal-case text-gray-400">{sub}</span>}
    </p>
  )
}

function Inp({ value, onChange, placeholder = '0', type = 'number', step, className = '' }) {
  return (
    <input type={type} value={value} onChange={onChange} placeholder={placeholder} step={step}
      className={`w-full border border-gray-200 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400 ${className}`} />
  )
}

function Sel({ value, onChange, options }) {
  return (
    <select value={value} onChange={onChange}
      className="w-full border border-gray-200 rounded-md px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-400">
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  )
}

function Toggle({ checked, onChange, label }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer select-none">
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)}
        className="w-4 h-4 rounded accent-blue-600" />
      <span className="text-sm text-gray-700">{label}</span>
    </label>
  )
}

function TH({ cols }) {
  return (
    <thead>
      <tr className="text-left text-gray-400 border-b border-gray-100 text-xs">
        {cols.map((c, i) => <th key={i} className={`py-1 pr-2 font-medium ${c.w || ''}`}>{c.label}</th>)}
      </tr>
    </thead>
  )
}

// Two-part paver picker: brand dropdown + searchable model input
function PaverPicker({ brand, name, onSelect, paverPrices, showLF = false }) {
  const [search, setSearch] = useState(name || '')
  const [open,   setOpen]   = useState(false)

  // Keep search display in sync when name changes externally (load saved data)
  useEffect(() => { setSearch(name || '') }, [name])

  const brands = [...new Set(paverPrices.map(p => p.brand))].filter(Boolean).sort()

  const filtered = paverPrices.filter(p => {
    if (brand && p.brand !== brand) return false
    if (!search) return true
    return p.name.toLowerCase().includes(search.toLowerCase())
  })

  function handleBrandChange(newBrand) {
    onSelect(newBrand, '')
    setSearch('')
    setOpen(false)
  }

  function handleModelSelect(p) {
    onSelect(p.brand, p.name)
    setSearch(p.name)
    setOpen(false)
  }

  return (
    <div className="flex gap-1.5">
      {/* Manufacturer / Brand */}
      <select
        value={brand || ''}
        onChange={e => handleBrandChange(e.target.value)}
        className="border border-gray-200 rounded-md px-2 py-1.5 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-400 flex-shrink-0 w-24"
      >
        <option value="">— Brand —</option>
        {brands.map(b => <option key={b} value={b}>{b}</option>)}
      </select>

      {/* Searchable model */}
      <div className="relative min-w-0 flex-[2]">
        <input
          type="text"
          value={search}
          onChange={e => { setSearch(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 200)}
          placeholder={brand ? 'Search model…' : 'Select brand first'}
          disabled={!brand}
          className="w-full border border-gray-200 rounded-md px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400 disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed"
        />
        {open && brand && filtered.length > 0 && (
          <div className="absolute z-50 top-full left-0 right-0 mt-0.5 bg-white border border-gray-200 rounded-md shadow-lg max-h-52 overflow-y-auto">
            {filtered.map(p => {
              const price = showLF && p.price_per_lf_vert
                ? `$${parseFloat(p.price_per_lf_vert).toFixed(2)}/LF`
                : `$${parseFloat(p.price_per_sf || 0).toFixed(2)}/SF`
              const isSelected = p.name === name
              return (
                <button
                  key={p.name}
                  onMouseDown={() => handleModelSelect(p)}
                  className={`w-full text-left px-2.5 py-1.5 hover:bg-blue-50 border-b border-gray-50 last:border-0 ${
                    isSelected ? 'bg-blue-50' : ''
                  }`}
                >
                  <span className={`block text-xs truncate ${isSelected ? 'font-semibold text-blue-800' : 'text-gray-800'}`}>
                    {p.name}
                  </span>
                  <span className="text-xs text-gray-400">
                    {price}{p.sf_per_pallet ? ` · ${p.sf_per_pallet} SF/pallet` : ''}
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

// ── Main component ────────────────────────────────────────────────────────────
export default function PaverModule({ initialData, onSave, onCancel }) {
  const [state,            setState]            = useState(() => ({ ...DEFAULT_STATE, ...(initialData || {}) }))
  const [laborRates,       setLaborRates]       = useState(initialData?.laborRates     || {})
  const [materialRates,    setMaterialRates]    = useState(initialData?.materialRates  || {})
  const [laborRatePerHour, setLaborRatePerHour] = useState(initialData?.laborRatePerHour ?? 35)
  const [paverPrices,      setPaverPrices]      = useState(initialData?.paverPrices    || [])
  const [loading,          setLoading]          = useState(true)

  useEffect(() => {
    let gone = false
    ;(async () => {
      await Promise.all([
        // Company settings
        !initialData?.laborRatePerHour &&
          supabase.from('company_settings').select('labor_rate_per_hour').single()
            .then(({ data }) => {
              if (!gone && data?.labor_rate_per_hour != null)
                setLaborRatePerHour(parseFloat(data.labor_rate_per_hour) || 35)
            }),
        // Paver labor rates — always fresh
        supabase.from('labor_rates').select('name,rate').eq('category', 'Paver')
          .then(({ data }) => {
            if (!gone && data) {
              const m = {}; data.forEach(r => { m[r.name] = parseFloat(r.rate) }); setLaborRates(m)
            }
          }),
        // Paver material rates — always fresh
        supabase.from('material_rates').select('name,unit_cost').eq('category', 'Paver')
          .then(({ data }) => {
            if (!gone && data) {
              const m = {}; data.forEach(r => { m[r.name] = parseFloat(r.unit_cost) }); setMaterialRates(m)
            }
          }),
        // Paver prices catalog — always fresh
        supabase.from('paver_prices').select('brand,name,price_per_sf,sf_per_pallet,price_per_lf_vert')
          .order('brand').order('name')
          .then(({ data }) => {
            if (!gone && data) setPaverPrices(data)
          }),
      ])
      if (!gone) setLoading(false)
    })()
    return () => { gone = true }
  }, [])

  const set    = useCallback((f, v) => setState(p => ({ ...p, [f]: v })), [])
  const setRow = useCallback((sec, i, f, v) => setState(p => {
    const rows = [...p[sec]]; rows[i] = { ...rows[i], [f]: v }; return { ...p, [sec]: rows }
  }), [])

  const gpmd = initialData?.gpmd ?? 425
  const subGpMarkupRate = initialData?.subGpMarkupRate ?? 0.20
  const calc = calcPaver(state, laborRatePerHour, laborRates, materialRates, paverPrices, gpmd)

  const fmt2 = v => `$${n(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  const fmt  = v => `$${Math.round(v).toLocaleString()}`
  const fh   = v => v > 0 ? v.toFixed(2) : '—'

  const td  = 'py-1.5 pr-2 align-top'
  const num = 'py-1.5 pr-2 text-gray-600 tabular-nums text-xs align-top'

  function handleSave() {
    onSave({
      man_days:      parseFloat(calc.manDays.toFixed(2)),
      material_cost: parseFloat(calc.totalMat.toFixed(2)),
      labor_cost:    parseFloat(calc.laborCost.toFixed(2)),
      labor_burden:  parseFloat(calc.burden.toFixed(2)),
      gross_profit:  parseFloat(calc.gp.toFixed(2)),
      sub_cost:      parseFloat(calc.subCost.toFixed(2)),
      total_price:   parseFloat(calc.price.toFixed(2)),
      data: {
        ...state, laborRatePerHour, gpmd, laborRates, materialRates, paverPrices,
        calc: {
          totalHrs:   calc.totalHrs,
          manDays:    calc.manDays,
          laborCost:  calc.laborCost,
          burden:     calc.burden,
          totalMat:   calc.totalMat,
          subCost:    calc.subCost,
          gp:         calc.gp,
          commission: calc.commission,
          price:      calc.price,
        },
      },
    })
  }

  return (
    <div className="space-y-4">
      {loading && (
        <div className="text-xs text-amber-700 bg-amber-50 rounded px-3 py-2">
          Loading rates and paver catalog…
        </div>
      )}

      {/* ── Settings ─────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SecHdr title="Settings" />
        <div>
          <p className="text-xs text-gray-500 mb-0.5">Difficulty (%)</p>
          <Inp value={state.difficulty} onChange={e => set('difficulty', e.target.value)} step="5" />
          <p className="text-xs text-gray-400 mt-0.5">Adds % to install hrs</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-0.5">Hours Adj (±hrs)</p>
          <Inp value={state.hoursAdj} onChange={e => set('hoursAdj', e.target.value)} step="0.5" />
        </div>
        <div className="flex flex-col gap-2 justify-center pt-4">
          <Toggle checked={state.is80mm}   onChange={v => set('is80mm', v)}   label="80mm Pavers (+15%)" />
          <Toggle checked={state.polySand} onChange={v => set('polySand', v)} label="Polymeric Sand" />
        </div>
      </div>

      {/* ── Paver Material ──────────────────────────────────────────────────────── */}
      <div>
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200 pb-1 mt-4 mb-2">
          Paver Material
          {calc.totalInstallSF > 0 && (
            <span className="ml-2 font-normal normal-case text-gray-400">
              {calc.totalInstallSF.toLocaleString()} SF total · {calc.totalBaseTons.toFixed(1)} tons base
            </span>
          )}
        </p>
        <table className="w-full text-xs">
          <TH cols={[
            { label: 'Area',         w: 'w-20' },
            { label: 'SF',           w: 'w-24' },
            { label: 'Base Install', w: 'w-36' },
            { label: 'Base (in)',    w: 'w-14' },
            { label: 'Tons',         w: 'w-12' },
            { label: 'Hrs',          w: 'w-12' },
            { label: 'Paver Brand / Type' },
            { label: '$/SF',         w: 'w-12' },
            { label: 'Pallets',      w: 'w-12' },
            { label: 'Cost',         w: 'w-20' },
          ]} />
          <tbody className="divide-y divide-gray-50">
            {state.areaRows.map((row, i) => {
              const a = calc.areas[i] || {}
              return (
                <tr key={i}>
                  <td className={td}>
                    <Inp type="text" value={row.label} onChange={e => setRow('areaRows', i, 'label', e.target.value)}
                      placeholder={`Area ${i + 1}`} />
                  </td>
                  <td className={td}>
                    <Inp value={row.sf} onChange={e => setRow('areaRows', i, 'sf', e.target.value)} />
                  </td>
                  <td className={td}>
                    <Sel value={row.method} onChange={e => setRow('areaRows', i, 'method', e.target.value)} options={BASE_METHODS} />
                  </td>
                  <td className={td}>
                    <Inp value={row.depth} onChange={e => setRow('areaRows', i, 'depth', e.target.value)} placeholder="6" />
                  </td>
                  <td className={num}>{a.baseTons > 0 ? a.baseTons.toFixed(1) : '—'}</td>
                  <td className={num}>{fh(a.baseHrs)}</td>
                  <td className={td}>
                    <PaverPicker
                      brand={row.paverBrand}
                      name={row.paverName}
                      onSelect={(b, nm) => { setRow('areaRows', i, 'paverBrand', b); setRow('areaRows', i, 'paverName', nm) }}
                      paverPrices={paverPrices}
                    />
                  </td>
                  <td className={num}>{a.pricePerSF > 0 ? fmt2(a.pricePerSF) : '—'}</td>
                  <td className={num}>{a.pallets > 0 ? a.pallets : '—'}</td>
                  <td className={num}>{a.paverCost > 0 ? fmt(a.paverCost) : '—'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* ── Paver Labor ─────────────────────────────────────────────────────── */}
      <div>
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200 pb-1 mt-4 mb-2">
          Paver Labor
          <span className="ml-2 font-normal normal-case text-gray-400">
            {calc.installRate} SF/hr install · {calc.straightCutRate}/{calc.curvedCutRate} LF/hr cuts
          </span>
        </p>
        <table className="w-full text-xs">
          <TH cols={[
            { label: 'Operation', w: 'w-56' },
            { label: 'Qty / LF / SF', w: 'w-32' },
            { label: 'Labor Hrs', w: 'w-24' },
            { label: 'Notes' },
          ]} />
          <tbody className="divide-y divide-gray-50">
            <tr>
              <td className={`${td} font-medium text-gray-700`}>
                Install <span className="text-gray-400 font-normal">({calc.installRate} SF/hr)</span>
              </td>
              <td className={`${num} text-gray-500`}>{calc.totalInstallSF > 0 ? calc.totalInstallSF.toLocaleString() : '—'} SF</td>
              <td className={num}>{fh(calc.installHrs)}</td>
              <td className="py-1 text-xs text-gray-400">auto from areas</td>
            </tr>
            {state.is80mm && (
              <tr>
                <td className={`${td} font-medium text-gray-700`}>
                  80mm Add <span className="text-gray-400 font-normal">({(calc.add80mmMult * 100 || LABOR_DEFAULTS.add80mm * 100).toFixed(0)}% penalty)</span>
                </td>
                <td className={`${num} text-gray-500`}>{calc.totalInstallSF > 0 ? calc.totalInstallSF.toLocaleString() : '—'} SF</td>
                <td className={num}>{fh(calc.add80mmHrs)}</td>
                <td className="py-1 text-xs text-gray-400">extra for 80mm thickness</td>
              </tr>
            )}
            {[
              { label: 'Straight Cut', rate: calc.straightCutRate, key: 'straightCutLF', hrs: calc.straightCutHrs, unit: 'LF' },
              { label: 'Curved Cut',   rate: calc.curvedCutRate,   key: 'curvedCutLF',   hrs: calc.curvedCutHrs,   unit: 'LF' },
              { label: 'Restraints',   rate: calc.restraintRate,   key: 'restraintsLF',  hrs: calc.restraintsHrs,  unit: 'LF' },
              { label: 'Sleeves',      rate: calc.sleevesRate,     key: 'sleevesLF',     hrs: calc.sleevesHrs,     unit: 'LF' },
            ].map(({ label, rate, key, hrs, unit }) => (
              <tr key={key}>
                <td className={`${td} font-medium text-gray-700`}>
                  {label} <span className="text-gray-400 font-normal">({rate} {unit}/hr)</span>
                </td>
                <td className={td}>
                  <Inp value={state[key]} onChange={e => set(key, e.target.value)} placeholder="0" />
                </td>
                <td className={num}>{fh(hrs)}</td>
                <td />
              </tr>
            ))}
            <tr>
              <td className={`${td} font-medium text-gray-700`}>
                Stones <span className="text-gray-400 font-normal">({calc.addStonePer ?? LABOR_DEFAULTS.addStone} hrs/ea)</span>
              </td>
              <td className={td}>
                <Inp value={state.numStones} onChange={e => set('numStones', e.target.value)} placeholder="0" />
              </td>
              <td className={num}>{fh(calc.addStoneHrs)}</td>
              <td />
            </tr>
            <tr>
              <td className={`${td} font-medium text-gray-700`}>
                Colors <span className="text-gray-400 font-normal">({calc.addColorPer ?? LABOR_DEFAULTS.addColor} hrs/ea)</span>
              </td>
              <td className={td}>
                <Inp value={state.numColors} onChange={e => set('numColors', e.target.value)} placeholder="0" />
              </td>
              <td className={num}>{fh(calc.addColorHrs)}</td>
              <td />
            </tr>
            {state.polySand && (
              <tr>
                <td className={`${td} font-medium text-gray-700`}>
                  Poly Sand Spread <span className="text-gray-400 font-normal">(0.004 hrs/SF)</span>
                </td>
                <td className={`${num} text-gray-500`}>{calc.totalInstallSF > 0 ? calc.totalInstallSF.toLocaleString() : '—'} SF</td>
                <td className={num}>{fh(calc.polySandHrs)}</td>
                <td className="py-1 text-xs text-gray-400">auto from areas</td>
              </tr>
            )}
            <tr>
              <td className={`${td} font-medium text-gray-700`}>
                Sealer <span className="text-gray-400 font-normal">({calc.sealerRate} SF/hr)</span>
              </td>
              <td className={td}>
                <Inp value={state.sealerSF} onChange={e => set('sealerSF', e.target.value)} placeholder="0 SF" />
              </td>
              <td className={num}>{fh(calc.sealerHrs)}</td>
              <td />
            </tr>
          </tbody>
        </table>
      </div>

      {/* ── Vertical Soldier Course ───────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <SecHdr
          title="Vertical Soldier Course"
          sub={`${calc.vertSoldierRate} LF/hr — paver priced $/LF (price_per_lf_vert)`}
        />
        <div>
          <p className="text-xs text-gray-500 mb-0.5">Vertical Soldier LF</p>
          <Inp value={state.vertSoldierLF} onChange={e => set('vertSoldierLF', e.target.value)} />
          {calc.vertSoldierHrs > 0 && (
            <p className="text-xs text-gray-400 mt-0.5">{calc.vertSoldierHrs.toFixed(2)} hrs</p>
          )}
        </div>
        <div className="sm:col-span-2">
          <p className="text-xs text-gray-500 mb-0.5">Paver (priced per LF)</p>
          <PaverPicker
            brand={state.vertPaverBrand}
            name={state.vertPaverName}
            onSelect={(b, nm) => { set('vertPaverBrand', b); set('vertPaverName', nm) }}
            paverPrices={paverPrices.filter(p => p.price_per_lf_vert > 0)}
            showLF
          />
          {calc.vertPaverCost > 0 && (
            <p className="text-xs text-gray-400 mt-0.5">
              {n(state.vertSoldierLF).toLocaleString()} LF × {fmt2(calc.vertPricePerLF)}/LF = {fmt2(calc.vertPaverCost)}
            </p>
          )}
        </div>
      </div>

      {/* ── Steps ─────────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SecHdr
          title="Paver Steps"
          sub={`straight ${calc.stepStraightRate} LF/hr · curved ${calc.stepCurvedRate} LF/hr`}
        />
        <div>
          <p className="text-xs text-gray-500 mb-0.5">Straight Steps (LF)</p>
          <Inp value={state.stepStraightLF} onChange={e => set('stepStraightLF', e.target.value)} />
          {calc.stepStraightHrs > 0 && <p className="text-xs text-gray-400 mt-0.5">{calc.stepStraightHrs.toFixed(2)} hrs</p>}
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-0.5">Curved Steps (LF)</p>
          <Inp value={state.stepCurvedLF} onChange={e => set('stepCurvedLF', e.target.value)} />
          {calc.stepCurvedHrs > 0 && <p className="text-xs text-gray-400 mt-0.5">{calc.stepCurvedHrs.toFixed(2)} hrs</p>}
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-0.5">Step Paver SF (for cost)</p>
          <Inp value={state.stepPaverSF} onChange={e => set('stepPaverSF', e.target.value)} />
          {calc.stepPallets > 0 && <p className="text-xs text-gray-400 mt-0.5">{calc.stepPallets} pallet{calc.stepPallets !== 1 ? 's' : ''}</p>}
        </div>
        <div className="sm:col-span-1">
          <p className="text-xs text-gray-500 mb-0.5">Step Paver Selection</p>
          <PaverPicker
            brand={state.stepPaverBrand}
            name={state.stepPaverName}
            onSelect={(b, nm) => { set('stepPaverBrand', b); set('stepPaverName', nm) }}
            paverPrices={paverPrices}
          />
          {calc.stepPaverCost > 0 && (
            <p className="text-xs text-gray-400 mt-0.5">
              {calc.stepPaverSF} SF × {fmt2(calc.stepPricePerSF)}/SF = {fmt2(calc.stepPaverCost)}
            </p>
          )}
        </div>
      </div>

      {/* ── Material Options ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SecHdr title="Material Options" />
        <div>
          <p className="text-xs text-gray-500 mb-0.5">Sales Tax on Pavers (%)</p>
          <Inp value={state.salesTax} onChange={e => set('salesTax', e.target.value)} step="0.1" placeholder="0" />
          {calc.salesTaxCost > 0 && <p className="text-xs text-gray-400 mt-0.5">{fmt2(calc.salesTaxCost)} tax</p>}
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-0.5">Shipping / Freight ($)</p>
          <Inp value={state.shippingCharge} onChange={e => set('shippingCharge', e.target.value)} step="1" />
        </div>
        <div className="flex flex-col gap-2 justify-center pt-4">
          <Toggle
            checked={state.includeDelivery}
            onChange={v => set('includeDelivery', v)}
            label={`Delivery (${fmt2(calc.deliveryFlat)} flat)`}
          />
        </div>
      </div>

      {/* ── Materials Summary ─────────────────────────────────────────────────── */}
      {calc.totalMat > 0 && (
        <div className="bg-gray-50 rounded-lg p-3 text-xs">
          <p className="font-semibold text-gray-600 uppercase tracking-wide text-xs mb-2">Materials Breakdown</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1 text-gray-600">
            {calc.totalPaverCost    > 0 && <span>Paver Material: <strong>{fmt2(calc.totalPaverCost)}</strong></span>}
            {calc.stepPaverCost     > 0 && <span>Step Pavers: <strong>{fmt2(calc.stepPaverCost)}</strong></span>}
            {calc.vertPaverCost     > 0 && <span>Vert Soldier: <strong>{fmt2(calc.vertPaverCost)}</strong></span>}
            {calc.baseRockCost      > 0 && <span>Base Rock ({calc.totalBaseTons.toFixed(1)}T): <strong>{fmt2(calc.baseRockCost)}</strong></span>}
            {calc.beddingSandCost   > 0 && <span>Bedding Sand: <strong>{fmt2(calc.beddingSandCost)}</strong></span>}
            {calc.jointSandCost     > 0 && <span>Joint Sand: <strong>{fmt2(calc.jointSandCost)}</strong></span>}
            {calc.polySandCost      > 0 && <span>Poly Sand: <strong>{fmt2(calc.polySandCost)}</strong></span>}
            {calc.sealerMatCost     > 0 && <span>Sealer: <strong>{fmt2(calc.sealerMatCost)}</strong></span>}
            {calc.restraintMatCost  > 0 && <span>Restraint Concrete: <strong>{fmt2(calc.restraintMatCost)}</strong></span>}
            {calc.sleevesMatCost    > 0 && <span>Sleeves: <strong>{fmt2(calc.sleevesMatCost)}</strong></span>}
            {calc.palletCost        > 0 && <span>Pallet Charges ({calc.totalPallets}): <strong>{fmt2(calc.palletCost)}</strong></span>}
            {calc.deliveryCost      > 0 && <span>Delivery: <strong>{fmt2(calc.deliveryCost)}</strong></span>}
            {calc.shipping          > 0 && <span>Shipping: <strong>{fmt2(calc.shipping)}</strong></span>}
            {calc.salesTaxCost      > 0 && <span>Sales Tax: <strong>{fmt2(calc.salesTaxCost)}</strong></span>}
            {calc.manualMat         > 0 && <span>Manual: <strong>{fmt2(calc.manualMat)}</strong></span>}
          </div>
          <p className="mt-2 pt-2 border-t border-gray-200 font-semibold text-gray-800">
            Total Materials: {fmt2(calc.totalMat)}
          </p>
        </div>
      )}

      {/* ── Manual Entry ──────────────────────────────────────────────────────── */}
      <div>
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200 pb-1 mt-4 mb-2">
          Manual Entry
        </p>
        <table className="w-full text-xs">
          <TH cols={[
            { label: 'Description' },
            { label: 'Hours', w: 'w-20' },
            { label: 'Materials ($)', w: 'w-28' },
            { label: 'Sub Cost ($)', w: 'w-28' },
          ]} />
          <tbody className="divide-y divide-gray-50">
            {state.manualRows.map((r, i) => (
              <tr key={i}>
                <td className={td}>
                  <Inp type="text" value={r.label} onChange={e => setRow('manualRows', i, 'label', e.target.value)} placeholder="Description" />
                </td>
                <td className={td}>
                  <Inp value={r.hours}     onChange={e => setRow('manualRows', i, 'hours',     e.target.value)} step="0.5" />
                </td>
                <td className={td}>
                  <Inp value={r.materials} onChange={e => setRow('manualRows', i, 'materials', e.target.value)} step="1" />
                </td>
                <td className={td}>
                  <Inp value={r.subCost}   onChange={e => setRow('manualRows', i, 'subCost',   e.target.value)} step="1" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── GPMD Summary Bar ─────────────────────────────────────────────────── */}
      <GpmdBar
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

      {/* ── Actions ───────────────────────────────────────────────────────────── */}
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
