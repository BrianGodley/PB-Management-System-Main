// ─────────────────────────────────────────────────────────────────────────────
// ArtificialTurfModule — Artificial Turf system estimator
// Rates pulled from DB:
//   labor_rates  (category='Artificial Turf') — demo, base, install, cut rates
//   material_rates (category='Artificial Turf') — turf brands, base, infill, install materials
//   material_rates (category='Demo') — dump fees for concrete/soil/green waste
//
// Excel source: "Artificial Turf Module" sheet + Master Rates and Calcs
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import GpmdBar from './GpmdBar'

// ── Demo method rates (tons/hr) — DemoRatesTurf lookup table ────────────────
const DEMO_METHODS = [
  { key: 'Skid Steer Good', label: 'Skid Steer (Good)',  matKey: 'Turf - Demo Skid Steer Good', fallback: 2.00 },
  { key: 'Skid Steer OK',   label: 'Skid Steer (OK)',    matKey: 'Turf - Demo Skid Steer OK',   fallback: 1.50 },
  { key: 'Mini Skid Steer', label: 'Mini Skid Steer',    matKey: 'Turf - Demo Mini Skid Steer', fallback: 0.75 },
  { key: 'Wheelbarrow',     label: 'Wheelbarrow',         matKey: 'Turf - Demo Wheelbarrow',     fallback: 0.50 },
  { key: 'Hand',            label: 'Hand',                matKey: 'Turf - Demo Hand',            fallback: 0.38 },
]

// ── Demo row types — each has its dump fee key ────────────────────────────────
const DEMO_ROWS = [
  { key: 'concrete', label: 'Concrete', dumpKey: 'Dump Fee - Concrete',    dumpFallback: 36.21 },
  { key: 'soil',     label: 'Soil',     dumpKey: 'Dump Fee - Dirt',         dumpFallback: 36.21 },
  { key: 'lawn',     label: 'Lawn',     dumpKey: 'Dump Fee - Green Waste',  dumpFallback: 72.19 },
]

// ── Turf brands (ArtTurfPrices — Softscape Prices A2:F11) ────────────────────
const TURF_BRANDS = [
  { key: 'Socal Blen Supreme 80', label: 'Socal Blen Supreme - 80',   matKey: 'Turf - Socal Blen Supreme 80', fallback: 2.39 },
  { key: 'Bel Air SH 92/66',      label: 'Bel Air SH 92/66',          matKey: 'Turf - Bel Air SH 92/66',     fallback: 1.79 },
  { key: 'Venice SH Light 50',    label: 'Venice SH Light - 50',      matKey: 'Turf - Venice SH Light 50',   fallback: 1.49 },
  { key: 'Bel Air SH Light 50',   label: 'Bel Air SH Light - 50',     matKey: 'Turf - Bel Air SH Light 50',  fallback: 1.29 },
  { key: 'Performance Play 63',   label: 'Performance Play - 63',     matKey: 'Turf - Performance Play 63',  fallback: 1.79 },
  { key: 'Autumn Grass 75',       label: 'Autumn Grass - 75',         matKey: 'Turf - Autumn Grass 75',      fallback: 2.98 },
  { key: 'Bel Air Supreme 90',    label: 'Bel Air Supreme - 90',      matKey: 'Turf - Bel Air Supreme 90',   fallback: 1.98 },
  { key: 'Pet Turf Pro 85',       label: 'Pet Turf Pro - 85',         matKey: 'Turf - Pet Turf Pro 85',      fallback: 2.29 },
  { key: 'Verdant Supreme 94',    label: 'Verdant Supreme - 94',      matKey: 'Turf - Verdant Supreme 94',   fallback: 2.39 },
  { key: 'Golf Pro SH 47',        label: 'Golf Pro SH - 47',          matKey: 'Turf - Golf Pro SH 47',       fallback: 1.98 },
]

// ── Rate defaults (DB fallbacks) ──────────────────────────────────────────────
const RATE_DEFAULTS = {
  // Labor rates
  baseInstallRate:   0.25,   // hrs/10SF (BaseTurfRate) — hrs = (SF/10)*0.25
  baseSFPerHr:       10,     // SF unit for base (BaseTurfSfPerHr)
  turfSFHr:          20,     // SF/hr layout (TurfSFHr)
  turfPH:            0.5,    // person-hours multiplier (TurfPH)
  turfCutSFHr:       100,    // LF/hr for cut/staple/seam (TurfCutSfHr)
  turfCutRate:       1.0,    // PH for cut/staple/seam (TurfCutRate)
  weedFabricHrPer1kSF: 8,   // hrs per 1000 SF for weed fabric — (SF/1000)*8
  wheelbarrowFtHr:   30,     // ft/hr travel rate for wheelbarrow (WheelbarrowTravelRate)
  // Material rates
  gravelBase:        6.90,   // $/ton (Gravel Base — $6.90/ton)
  dgBase:            57.50,  // $/ton (DG Base)
  weedFabric:        165.00, // $/roll (per 1800 SF)
  installMaterials:  0.140,  // $/LF (staples $0.029 + seam $0.050 + nails $0.061 per SF, × LF)
  infillDurafill:    0.62,   // $/SF (TurfInfillSF)
  infillZeoFill:     30.00,  // $/bag (per 30 SF)
  // Pricing factors — from Excel Module #1 O3/O4
  laborBurden:       0.29,   // 29% burden on labor cost (Module #1 O4)
  commissionRate:    0.12,   // 12% commission on gross profit (Module #1 O3 = Comm)
}

// ── Calculation engine ────────────────────────────────────────────────────────
const n = v => parseFloat(v) || 0

function calcTurf(state, laborRatePerHour, materialPrices, laborRates) {
  const mp   = materialPrices || {}
  const lr   = laborRates    || {}
  const lrph = n(laborRatePerHour) || 35
  const diff = 1 + n(state.difficulty) / 100
  const hrsAdj    = n(state.hoursAdj)
  const distanceLF = n(state.distanceLF)  // avg distance truck to work area

  // Look up demo method rate (tons/hr) for each demo row
  function demoRate(method) {
    const m = DEMO_METHODS.find(x => x.key === method)
    return n(lr[m?.matKey]) || m?.fallback || 2.0
  }

  // ── Demo section ──────────────────────────────────────────────────────────
  let demoHrs = 0, demoMat = 0
  const demoCalc = DEMO_ROWS.map(row => {
    const sf      = n(state.demo[row.key]?.sf)
    const inches  = n(state.demo[row.key]?.inches) || 4
    const method  = state.demo[row.key]?.method || 'Skid Steer Good'
    const rate    = demoRate(method)
    const dumpRate = n(mp[row.dumpKey]) || row.dumpFallback
    const tons    = sf > 0 ? (sf / 200) * inches : 0
    const hrs     = tons > 0 ? tons / rate : 0
    const mat     = tons * dumpRate
    demoHrs += hrs
    demoMat += mat
    return { sf, inches, method, rate, tons, hrs, mat, dumpRate }
  })

  // Total turf SF comes from demo concrete row (K8 = K9 = K10 = same area)
  // Use the largest demo SF entered, or default to concrete row
  const turfAreaSF = Math.max(...DEMO_ROWS.map(r => n(state.demo[r.key]?.sf))) || 0

  // ── Base installation ─────────────────────────────────────────────────────
  let baseHrs = 0, baseMat = 0

  // Gravel Base: tons=(SF/200)*2, hrs=(SF/10)*0.25, mat=$6.90*tons
  const gravelSF   = n(state.base.gravelSF) || turfAreaSF
  const gravelTons = gravelSF > 0 ? (gravelSF / 200) * 2 : 0
  const gravelHrs  = gravelSF > 0 ? (gravelSF / RATE_DEFAULTS.baseSFPerHr) * RATE_DEFAULTS.baseInstallRate : 0
  const gravelMat  = gravelTons * (n(mp['Turf - Gravel Base']) || RATE_DEFAULTS.gravelBase)
  if (state.base.useGravel) { baseHrs += gravelHrs; baseMat += gravelMat }

  // DG Base: tons=(SF*(1/12))/27, trips=SF/400, hrs=(trips*dist*2)/wheelFtHr/60
  const dgSF    = n(state.base.dgSF) || turfAreaSF
  const dgTons  = dgSF > 0 ? (dgSF * (1 / 12)) / 27 : 0
  const dgTrips = dgSF > 0 ? Math.ceil(dgSF / 400) : 0
  const wheelFtHr = RATE_DEFAULTS.wheelbarrowFtHr
  const dgHrs   = (dgTrips > 0 && distanceLF > 0) ? (dgTrips * distanceLF * 2) / wheelFtHr / 60 : 0
  const dgMat   = dgTons * (n(mp['Turf - DG Base']) || RATE_DEFAULTS.dgBase)
  if (state.base.useDG) { baseHrs += dgHrs; baseMat += dgMat }

  // Weed Barrier Fabric: rolls=ceil(SF/1800), hrs=(SF/1000)*8, mat=$165*rolls
  const weedSF    = n(state.base.weedSF) || turfAreaSF
  const weedRolls = weedSF > 0 ? Math.ceil(weedSF / 1800) : 0
  const weedHrs   = weedSF > 0 ? (weedSF / 1000) * RATE_DEFAULTS.weedFabricHrPer1kSF : 0
  const weedMat   = weedRolls * (n(mp['Turf - Weed Barrier Fabric']) || RATE_DEFAULTS.weedFabric)
  if (state.base.useWeedFabric) { baseHrs += weedHrs; baseMat += weedMat }

  // ── Turf installation (up to 3 rolls of 15' wide) ─────────────────────────
  // hrs = SF/TurfSFHr * TurfPH = SF/20 * 0.5
  const turfSFHr = RATE_DEFAULTS.turfSFHr
  const turfPH   = RATE_DEFAULTS.turfPH
  let turfHrs = 0, turfMat = 0, totalEdgeLF = 0

  const rollCalc = state.rolls.map(roll => {
    const edgeLF   = n(roll.edgeLF)
    const sf       = edgeLF * 15
    const brand    = TURF_BRANDS.find(b => b.key === roll.brand) || TURF_BRANDS[0]
    const pricePerSF = n(mp[brand.matKey]) || brand.fallback
    const hrs      = sf > 0 ? (sf / turfSFHr) * turfPH : 0
    const mat      = sf * pricePerSF
    turfHrs += hrs
    turfMat += mat
    totalEdgeLF += edgeLF
    return { edgeLF, sf, brand: roll.brand, pricePerSF, hrs, mat }
  })

  // ── Turf Strips (row 20-21) ───────────────────────────────────────────────
  // Narrow/custom cut strips — separate from the 15' wide rolls.
  // Labor: hrs = (LF / 100) * 8  — Excel R20=(E21/100)*8
  // Material: brand $/SF × (LF × width ft)  — Excel S20=O20*Q20 (manual inputs)
  const stripsLF    = n(state.strips?.lf)
  const stripsWidth = n(state.strips?.widthFt) || 1
  const stripsBrand = TURF_BRANDS.find(b => b.key === state.strips?.brand) || TURF_BRANDS[0]
  const stripsPrice = n(mp[stripsBrand.matKey]) || stripsBrand.fallback
  const stripsSF    = stripsLF * stripsWidth
  const stripsHrs   = stripsLF > 0 ? (stripsLF / 100) * 8 : 0
  const stripsMat   = stripsPrice * stripsSF

  // ── Cut, Staple & Seam ────────────────────────────────────────────────────
  // hrs = (totalLF / TurfCutSfHr) * TurfCutRate = (totalLF/100)*1.0
  // mat = installMaterials ($/LF) × totalLF  — matches Excel S18=O18*Q18
  const installMatPerLF = n(mp['Turf - Install Materials']) || RATE_DEFAULTS.installMaterials
  const cutHrs = totalEdgeLF > 0 ? (totalEdgeLF / RATE_DEFAULTS.turfCutSFHr) * RATE_DEFAULTS.turfCutRate : 0
  const cutMat = installMatPerLF * totalEdgeLF

  // ── Infill ────────────────────────────────────────────────────────────────
  // Excel uses K8 (base gravel SF) directly for infill quantity — NOT the demo SF.
  // When no demo rows are entered, turfAreaSF = 0 but infill still applies to the
  // installed base area. Fall back to base SF so infill always calculates.
  // ZeoFill (pet): $30/bag, bags=ceil(SF/30)
  // Standard Durafill: $0.62/SF
  const infillAreaSF = turfAreaSF || n(state.base.gravelSF) || n(state.base.dgSF) || n(state.base.weedSF)
  let infillMat = 0
  if (infillAreaSF > 0) {
    if (state.useZeoFill) {
      const bags = Math.ceil(infillAreaSF / 30)
      infillMat  = bags * (n(mp['Turf - Infill ZeoFill']) || RATE_DEFAULTS.infillZeoFill)
    } else {
      infillMat = infillAreaSF * (n(mp['Turf - Infill Durafill']) || RATE_DEFAULTS.infillDurafill)
    }
  }

  // ── Manual entry ─────────────────────────────────────────────────────────
  const manualFiltered = (state.manualRows || []).filter(r =>
    n(r.hours) > 0 || n(r.materials) > 0 || n(r.subCost) > 0
  )
  const manualHrs = manualFiltered.reduce((s, r) => s + n(r.hours), 0)
  const manualMat = manualFiltered.reduce((s, r) => s + n(r.materials), 0)
  const manualSub = manualFiltered.reduce((s, r) => s + n(r.subCost), 0)

  // ── Totals ────────────────────────────────────────────────────────────────
  const rawHrs   = demoHrs + baseHrs + turfHrs + stripsHrs + cutHrs + manualHrs
  const diffHrs  = rawHrs * n(state.difficulty) / 100
  const totalHrs = rawHrs + diffHrs + hrsAdj
  const totalMat = demoMat + baseMat + turfMat + stripsMat + cutMat + infillMat + manualMat
  const subCost  = manualSub

  const manDays    = totalHrs / 8
  const laborCost  = totalHrs * lrph
  const burden     = laborCost * RATE_DEFAULTS.laborBurden   // 29% — Excel Module #1 O4
  const gp         = manDays * 425
  const commission = gp * RATE_DEFAULTS.commissionRate       // 12% of GP — Excel Module #1 O3
  const price      = laborCost + burden + totalMat + gp + commission + subCost

  return {
    totalHrs, manDays, laborCost, burden, totalMat, subCost, gp, commission, price,
    infillAreaSF,
    demoCalc, turfAreaSF,
    gravelTons, gravelHrs, gravelMat,
    dgTons, dgTrips, dgHrs, dgMat,
    weedRolls, weedHrs, weedMat,
    rollCalc, totalEdgeLF, turfHrs, turfMat,
    stripsLF, stripsWidth, stripsSF, stripsHrs, stripsMat, stripsPrice,
    cutHrs, cutMat,
    infillMat,
    demoHrs, baseHrs, rawHrs, diffHrs,
  }
}

// ── Default state ─────────────────────────────────────────────────────────────
const DEFAULT_STATE = {
  difficulty:  0,
  hoursAdj:    0,
  distanceLF:  0,    // avg distance from truck to work area
  demo: {
    concrete: { sf: '', inches: '4', method: 'Skid Steer Good' },
    soil:     { sf: '', inches: '4', method: 'Skid Steer Good' },
    lawn:     { sf: '', inches: '4', method: 'Skid Steer Good' },
  },
  base: {
    useGravel:     true,
    gravelSF:      '',
    useDG:         true,
    dgSF:          '',
    useWeedFabric: true,
    weedSF:        '',
  },
  useZeoFill: false,
  rolls: [
    { brand: 'Socal Blen Supreme 80', edgeLF: '' },
    { brand: 'Socal Blen Supreme 80', edgeLF: '' },
    { brand: 'Socal Blen Supreme 80', edgeLF: '' },
  ],
  strips: { lf: '', widthFt: '1', brand: 'Socal Blen Supreme 80' },
  manualRows: [
    { label: '', hours: '', materials: '', subCost: '' },
    { label: '', hours: '', materials: '', subCost: '' },
    { label: '', hours: '', materials: '', subCost: '' },
    { label: '', hours: '', materials: '', subCost: '' },
  ],
}

// ── UI helpers ────────────────────────────────────────────────────────────────
function SecHdr({ title }) {
  return (
    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200 pb-1 mt-5 mb-2">
      {title}
    </p>
  )
}
function Inp({ value, onChange, placeholder = '0', type = 'number', step, className = '' }) {
  return (
    <input
      type={type} value={value} onChange={onChange}
      placeholder={placeholder} step={step}
      className={`w-full border border-gray-200 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400 ${className}`}
    />
  )
}
function Sel({ value, onChange, options, optionLabels }) {
  return (
    <select value={value} onChange={onChange}
      className="w-full border border-gray-200 rounded-md px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-400">
      {options.map((o, i) => <option key={o} value={o}>{optionLabels ? optionLabels[i] : o}</option>)}
    </select>
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
function Toggle({ checked, onChange, label }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)}
        className="w-4 h-4 rounded accent-blue-600" />
      <span className="text-xs text-gray-700">{label}</span>
    </label>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function ArtificialTurfModule({ initialData, onSave, onCancel }) {
  const [state,            setState]            = useState(() => ({ ...DEFAULT_STATE, ...(initialData || {}) }))
  const [materialPrices,   setMaterialPrices]   = useState(initialData?.materialPrices || {})
  const [laborRates,       setLaborRates]       = useState(initialData?.laborRates     || {})
  const [laborRatePerHour, setLaborRatePerHour] = useState(initialData?.laborRatePerHour ?? 35)
  const [pricesLoading,    setPricesLoading]    = useState(!initialData?.materialPrices)

  useEffect(() => {
    if (initialData?.materialPrices && initialData?.laborRatePerHour) return
    let gone = false
    ;(async () => {
      await Promise.all([
        !initialData?.laborRatePerHour &&
          supabase.from('company_settings').select('labor_rate_per_hour').single()
            .then(({ data }) => { if (!gone && data?.labor_rate_per_hour) setLaborRatePerHour(parseFloat(data.labor_rate_per_hour) || 35) }),
        !initialData?.materialPrices &&
          supabase.from('material_rates').select('name, unit_cost').in('category', ['Artificial Turf', 'Demo'])
            .then(({ data }) => { if (!gone && data) { const m = {}; data.forEach(r => { m[r.name] = parseFloat(r.unit_cost) }); setMaterialPrices(m) } }),
        !initialData?.laborRates &&
          supabase.from('labor_rates').select('name, rate').eq('category', 'Artificial Turf')
            .then(({ data }) => { if (!gone && data) { const m = {}; data.forEach(r => { m[r.name] = parseFloat(r.rate) }); setLaborRates(m) } }),
      ])
      if (!gone) setPricesLoading(false)
    })()
    return () => { gone = true }
  }, [])

  const set    = useCallback((f, v) => setState(p => ({ ...p, [f]: v })), [])
  const setDemo  = useCallback((type, field, val) =>
    setState(p => ({ ...p, demo: { ...p.demo, [type]: { ...p.demo[type], [field]: val } } })), [])
  const setBase  = useCallback((field, val) =>
    setState(p => ({ ...p, base: { ...p.base, [field]: val } })), [])
  const setRoll  = useCallback((i, field, val) =>
    setState(p => { const rolls = [...p.rolls]; rolls[i] = { ...rolls[i], [field]: val }; return { ...p, rolls } }), [])
  const setRow   = useCallback((i, f, v) =>
    setState(p => { const rows = [...p.manualRows]; rows[i] = { ...rows[i], [f]: v }; return { ...p, manualRows: rows } }), [])
  const setStrips = useCallback((field, val) =>
    setState(p => ({ ...p, strips: { ...p.strips, [field]: val } })), [])

  const calc  = calcTurf(state, laborRatePerHour, materialPrices, laborRates)
  const fmt2  = v => `$${n(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  const fmt   = v => `$${Math.round(v).toLocaleString()}`
  const fh    = v => v > 0 ? v.toFixed(2) : '—'
  const td    = 'py-1.5 pr-2 align-top'
  const num   = 'py-1.5 pr-2 text-gray-600 tabular-nums text-xs align-top'
  const demoMethodKeys   = DEMO_METHODS.map(m => m.key)
  const demoMethodLabels = DEMO_METHODS.map(m => m.label)
  const brandKeys   = TURF_BRANDS.map(b => b.key)
  const brandLabels = TURF_BRANDS.map(b => b.label)

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
        ...state, laborRatePerHour, materialPrices, laborRates,
        calc: {
          totalHrs: calc.totalHrs, manDays: calc.manDays,
          laborCost: calc.laborCost, burden: calc.burden,
          totalMat: calc.totalMat, subCost: calc.subCost,
          gp: calc.gp, price: calc.price,
          turfAreaSF: calc.turfAreaSF,
        },
      },
    })
  }

  return (
    <div className="space-y-4">
      {pricesLoading && (
        <div className="text-xs text-amber-700 bg-amber-50 rounded px-3 py-2">Loading current rates…</div>
      )}

      {/* Settings */}
      <div className="grid grid-cols-2 gap-3">
        <SecHdr title="Settings" />
        <div className="col-span-2 grid grid-cols-3 gap-3">
          <div>
            <p className="text-xs text-gray-500 mb-0.5">Difficulty (%)</p>
            <Inp value={state.difficulty} onChange={e => set('difficulty', e.target.value)} step="5" />
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-0.5">Hours Adj (±hrs)</p>
            <Inp value={state.hoursAdj} onChange={e => set('hoursAdj', e.target.value)} step="0.5" />
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-0.5">Truck Distance (LF)</p>
            <Inp value={state.distanceLF} onChange={e => set('distanceLF', e.target.value)} step="1" />
          </div>
        </div>
      </div>

      {/* Turf Prep — Demo */}
      <div>
        <SecHdr title="Turf Preparation (Demo)" />
        <table className="w-full text-xs">
          <TH cols={[
            { label: 'Demo Type' },
            { label: 'Method',   w: 'w-36' },
            { label: 'Sq Ft',    w: 'w-20' },
            { label: 'Inches',   w: 'w-16' },
            { label: 'Tons',     w: 'w-16' },
            { label: 'Hrs',      w: 'w-16' },
            { label: 'Dump $',   w: 'w-20' },
          ]} />
          <tbody className="divide-y divide-gray-50">
            {DEMO_ROWS.map((row, i) => {
              const cr = calc.demoCalc[i]
              return (
                <tr key={row.key}>
                  <td className={`${td} font-medium text-gray-700`}>{row.label}</td>
                  <td className={td}>
                    <Sel value={state.demo[row.key].method}
                      onChange={e => setDemo(row.key, 'method', e.target.value)}
                      options={demoMethodKeys} optionLabels={demoMethodLabels} />
                  </td>
                  <td className={td}>
                    <Inp value={state.demo[row.key].sf}
                      onChange={e => setDemo(row.key, 'sf', e.target.value)} />
                  </td>
                  <td className={td}>
                    <Inp value={state.demo[row.key].inches}
                      onChange={e => setDemo(row.key, 'inches', e.target.value)} step="1" />
                  </td>
                  <td className={num}>{cr.tons > 0 ? cr.tons.toFixed(2) : '—'}</td>
                  <td className={num}>{fh(cr.hrs)}</td>
                  <td className={num}>{cr.mat > 0 ? fmt2(cr.mat) : '—'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Base Installation */}
      <div>
        <SecHdr title="Base Installation" />
        <div className="text-xs text-gray-500 mb-2 italic">
          SF defaults to the largest demo area entered. Override below if different.
        </div>
        <table className="w-full text-xs">
          <TH cols={[
            { label: 'Include', w: 'w-14' },
            { label: 'Base Type' },
            { label: 'Sq Ft',    w: 'w-20' },
            { label: 'Qty',      w: 'w-16' },
            { label: 'Hrs',      w: 'w-16' },
            { label: 'Material', w: 'w-24' },
          ]} />
          <tbody className="divide-y divide-gray-50">
            {/* Gravel Base */}
            <tr>
              <td className={td}>
                <input type="checkbox" checked={state.base.useGravel}
                  onChange={e => setBase('useGravel', e.target.checked)}
                  className="w-4 h-4 accent-blue-600" />
              </td>
              <td className={`${td} font-medium text-gray-700`}>
                2" Gravel Base
                <span className="text-gray-400 font-normal ml-1">${n(materialPrices['Turf - Gravel Base'] || RATE_DEFAULTS.gravelBase).toFixed(2)}/ton</span>
              </td>
              <td className={td}><Inp value={state.base.gravelSF} onChange={e => setBase('gravelSF', e.target.value)} placeholder={calc.turfAreaSF || '0'} /></td>
              <td className={num}>{state.base.useGravel && calc.gravelTons > 0 ? `${calc.gravelTons.toFixed(2)} t` : '—'}</td>
              <td className={num}>{state.base.useGravel ? fh(calc.gravelHrs) : '—'}</td>
              <td className={num}>{state.base.useGravel && calc.gravelMat > 0 ? fmt2(calc.gravelMat) : '—'}</td>
            </tr>
            {/* DG Base */}
            <tr>
              <td className={td}>
                <input type="checkbox" checked={state.base.useDG}
                  onChange={e => setBase('useDG', e.target.checked)}
                  className="w-4 h-4 accent-blue-600" />
              </td>
              <td className={`${td} font-medium text-gray-700`}>
                1" DG Base
                <span className="text-gray-400 font-normal ml-1">${n(materialPrices['Turf - DG Base'] || RATE_DEFAULTS.dgBase).toFixed(2)}/ton</span>
              </td>
              <td className={td}><Inp value={state.base.dgSF} onChange={e => setBase('dgSF', e.target.value)} placeholder={calc.turfAreaSF || '0'} /></td>
              <td className={num}>{state.base.useDG && calc.dgTrips > 0 ? `${calc.dgTrips} trips` : '—'}</td>
              <td className={num}>{state.base.useDG ? fh(calc.dgHrs) : '—'}</td>
              <td className={num}>{state.base.useDG && calc.dgMat > 0 ? fmt2(calc.dgMat) : '—'}</td>
            </tr>
            {/* Weed Barrier */}
            <tr>
              <td className={td}>
                <input type="checkbox" checked={state.base.useWeedFabric}
                  onChange={e => setBase('useWeedFabric', e.target.checked)}
                  className="w-4 h-4 accent-blue-600" />
              </td>
              <td className={`${td} font-medium text-gray-700`}>
                Weed Barrier Fabric
                <span className="text-gray-400 font-normal ml-1">${n(materialPrices['Turf - Weed Barrier Fabric'] || RATE_DEFAULTS.weedFabric).toFixed(2)}/roll (1,800 SF)</span>
              </td>
              <td className={td}><Inp value={state.base.weedSF} onChange={e => setBase('weedSF', e.target.value)} placeholder={calc.turfAreaSF || '0'} /></td>
              <td className={num}>{state.base.useWeedFabric && calc.weedRolls > 0 ? `${calc.weedRolls} rolls` : '—'}</td>
              <td className={num}>{state.base.useWeedFabric ? fh(calc.weedHrs) : '—'}</td>
              <td className={num}>{state.base.useWeedFabric && calc.weedMat > 0 ? fmt2(calc.weedMat) : '—'}</td>
            </tr>
          </tbody>
        </table>

        {/* ZeoFill toggle */}
        <div className="mt-3 flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          <Toggle
            checked={state.useZeoFill}
            onChange={v => set('useZeoFill', v)}
            label="ZeoFill Pet Odor Infill (upgrade)"
          />
          <span className="text-xs text-amber-700 ml-auto">
            {state.useZeoFill
              ? `${Math.ceil(calc.infillAreaSF / 30)} bags @ $${n(materialPrices['Turf - Infill ZeoFill'] || RATE_DEFAULTS.infillZeoFill).toFixed(2)}/bag`
              : `Durafill @ $${n(materialPrices['Turf - Infill Durafill'] || RATE_DEFAULTS.infillDurafill).toFixed(2)}/SF`
            }
          </span>
        </div>
      </div>

      {/* Turf Installation */}
      <div>
        <SecHdr title="Turf Installation (15' Wide Rolls)" />
        <table className="w-full text-xs">
          <TH cols={[
            { label: 'Turf Brand' },
            { label: 'Edge LF', w: 'w-20' },
            { label: 'Sq Ft',   w: 'w-20' },
            { label: 'Hrs',     w: 'w-16' },
            { label: 'Material',w: 'w-24' },
          ]} />
          <tbody className="divide-y divide-gray-50">
            {state.rolls.map((roll, i) => {
              const cr = calc.rollCalc[i]
              return (
                <tr key={i}>
                  <td className={td}>
                    <Sel value={roll.brand}
                      onChange={e => setRoll(i, 'brand', e.target.value)}
                      options={brandKeys} optionLabels={brandLabels} />
                  </td>
                  <td className={td}>
                    <Inp value={roll.edgeLF}
                      onChange={e => setRoll(i, 'edgeLF', e.target.value)} />
                  </td>
                  <td className={num}>{cr.sf > 0 ? cr.sf.toLocaleString() : '—'}</td>
                  <td className={num}>{fh(cr.hrs)}</td>
                  <td className={num}>{cr.mat > 0 ? fmt2(cr.mat) : '—'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {/* Cut, Staple & Seam — auto-calculated */}
        {calc.totalEdgeLF > 0 && (
          <div className="mt-2 bg-gray-50 rounded-lg px-3 py-2 text-xs flex justify-between">
            <span className="text-gray-600 font-medium">Cut, Staple &amp; Seam
              <span className="text-gray-400 font-normal ml-2">({calc.totalEdgeLF} LF total)</span>
            </span>
            <div className="flex gap-4">
              <span className="text-gray-700">{fh(calc.cutHrs)} hrs</span>
              <span className="text-gray-700">{fmt2(calc.cutMat)} mat</span>
            </div>
          </div>
        )}

        {/* Infill — auto-calculated from base area */}
        {calc.infillAreaSF > 0 && (
          <div className="mt-1 bg-gray-50 rounded-lg px-3 py-2 text-xs flex justify-between">
            <span className="text-gray-600 font-medium">
              {state.useZeoFill ? 'ZeoFill Pet Infill' : 'Durafill Infill'}
              <span className="text-gray-400 font-normal ml-2">({calc.infillAreaSF.toLocaleString()} SF)</span>
            </span>
            <span className="text-gray-700">{fmt2(calc.infillMat)}</span>
          </div>
        )}
      </div>

      {/* Turf Strips */}
      <div>
        <SecHdr title="Turf Strips (Narrow / Custom Cuts)" />
        <div className="text-xs text-gray-500 mb-2 italic">
          For narrow strips that don't come off a standard 15' roll. Labor: (LF/100)×8 hrs. Material: brand $/SF × (LF × width).
        </div>
        <table className="w-full text-xs">
          <TH cols={[
            { label: 'Turf Brand' },
            { label: 'Length (LF)', w: 'w-24' },
            { label: 'Width (ft)',  w: 'w-20' },
            { label: 'Sq Ft',      w: 'w-16' },
            { label: 'Hrs',        w: 'w-16' },
            { label: 'Material',   w: 'w-24' },
          ]} />
          <tbody>
            <tr>
              <td className={td}>
                <Sel value={state.strips?.brand || brandKeys[0]}
                  onChange={e => setStrips('brand', e.target.value)}
                  options={brandKeys} optionLabels={brandLabels} />
              </td>
              <td className={td}>
                <Inp value={state.strips?.lf || ''}
                  onChange={e => setStrips('lf', e.target.value)} />
              </td>
              <td className={td}>
                <Inp value={state.strips?.widthFt || '1'}
                  onChange={e => setStrips('widthFt', e.target.value)} step="0.5" />
              </td>
              <td className={num}>{calc.stripsSF > 0 ? calc.stripsSF.toLocaleString() : '—'}</td>
              <td className={num}>{fh(calc.stripsHrs)}</td>
              <td className={num}>{calc.stripsMat > 0 ? fmt2(calc.stripsMat) : '—'}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Manual Entry */}
      <div>
        <SecHdr title="Manual Entry" />
        <table className="w-full text-xs">
          <TH cols={[
            { label: 'Description' },
            { label: 'Hours',       w: 'w-20' },
            { label: 'Materials ($)',w: 'w-24' },
            { label: 'Sub Cost ($)', w: 'w-24' },
          ]} />
          <tbody className="divide-y divide-gray-50">
            {state.manualRows.map((r, i) => (
              <tr key={i}>
                <td className={td}><Inp type="text" value={r.label}     onChange={e => setRow(i, 'label',     e.target.value)} placeholder="Description" /></td>
                <td className={td}><Inp value={r.hours}     onChange={e => setRow(i, 'hours',     e.target.value)} step="0.5" /></td>
                <td className={td}><Inp value={r.materials} onChange={e => setRow(i, 'materials', e.target.value)} step="1" /></td>
                <td className={td}><Inp value={r.subCost}   onChange={e => setRow(i, 'subCost',   e.target.value)} step="1" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Turf area context chip */}
      {calc.turfAreaSF > 0 && (
        <div className="flex gap-3 text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
          <span className="font-medium text-gray-700">{calc.turfAreaSF.toLocaleString()} SF</span>
          <span>turf area</span>
          {calc.infillAreaSF !== calc.turfAreaSF && (
            <span className="text-gray-400">· {calc.infillAreaSF.toLocaleString()} SF infill base</span>
          )}
        </div>
      )}
      {/* GPMD summary bar */}
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
        price={calc.price}
      />

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <button onClick={handleSave}
          className="flex-1 bg-gray-900 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-gray-700 transition-colors">
          Save Module
        </button>
        <button onClick={onCancel}
          className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
          Cancel
        </button>
      </div>
    </div>
  )
}
