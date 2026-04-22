// ─────────────────────────────────────────────────────────────────────────────
// ConcreteModule — Concrete paving estimator
//
// Rates are split across three tables (category='Concrete'):
//   labor_rates         → production rates (lr)  — SF/hr, LF/hr
//   material_rates      → material unit costs (mr) — per CY, per SF, etc.
//   subcontractor_rates → sub / equipment costs (sr) — pump, stamp, sand finish
//
// All three snapshots are saved in data so re-edits use rates from creation time.
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import GpmdBar from './GpmdBar'

// ── Rate tables (method-indexed — not in DB) ──────────────────────────────────

const BASE_RATES = {
  'Skid Steer Good': 10.0,
  'Skid Steer OK':   7.5,
  'Mini Skid Steer': 5.0,
  'Wheelbarrow': 3.34,
  'Hand':        2.5,
}

const METHODS      = Object.keys(BASE_RATES)
const FINISH_TYPES = ['Broom Finish', 'Sand Finish', 'Salt Finish', 'Stamped']
const SEALER_TYPES = ['Natural', 'Wet-Look']

// ── Hardcoded fallbacks (mirror seed values in each table) ───────────────────
const R = {
  // Labor production rates (labor_rates)
  concreteSFPerHr:      23,
  rebarSFPerHr:         60,
  formLFPerHr:          18,
  sleeveLFPerHr:        10,
  sealerNaturalSFPerHr: 200,
  sealerWetSFPerHr:     120,
  vaporBarrierSFPerHr:  15,
  // Material unit costs (material_rates)
  concretePerCY:        185,
  rebarSFPrice:         0.8625,
  formMaterialPerLF:    1.73,
  sleevePer10LF:        4.60,
  colorCostPerCY:       28.75,
  sealerNatural5g:      150,
  sealerWet5g:          190,
  vaporBarrierPerSF:    0.22,
  costBase:             7.50,
  // Sub / equipment costs (subcontractor_rates)
  pumpFeeFlat:          316.25,
  pumpFeePerCY:         9.20,
  sandFinishPer400SF:   207,
  stampSubFlat:         800,
  stampSubPerCY:        120,
  // Non-editable constants
  sealerSFPerGal:       70,
  crewDaySF:            650,
  laborBurdenPct:       0.29,
  gpmd:                 425,
  commissionRate:       0.12,
}

// ── Calculation engine ────────────────────────────────────────────────────────

const n = v => parseFloat(v) || 0

function calcConcrete(state, laborRatePerHour = 35, lr = {}, mr = {}, sr = {}, gpmd = R.gpmd) {
  const lrph = n(laborRatePerHour) || 35

  // ── Labor production rates (labor_rates) ─────────────────────────────────
  const concreteSFPerHr      = lr['Concrete - Pour & Finish']      ?? R.concreteSFPerHr
  const rebarSFPerHr         = lr['Concrete - Rebar 24" OC']       ?? R.rebarSFPerHr
  const formLFPerHr          = lr['Concrete - Form Setting']        ?? R.formLFPerHr
  const sleeveLFPerHr        = lr['Concrete - Sleeves']             ?? R.sleeveLFPerHr
  const sealerNaturalSFPerHr = lr['Concrete - Sealer Natural']      ?? R.sealerNaturalSFPerHr
  const sealerWetSFPerHr     = lr['Concrete - Sealer Wet-Look']     ?? R.sealerWetSFPerHr
  const vaporBarrierSFPerHr  = lr['Concrete - Vapor Barrier']       ?? R.vaporBarrierSFPerHr

  // ── Material unit costs (material_rates) ─────────────────────────────────
  const concretePerCY        = mr['Concrete - Per CY']              ?? R.concretePerCY
  const rebarSFPrice         = mr['Concrete - Rebar Price SF']      ?? R.rebarSFPrice
  const formMaterialPerLF    = mr['Concrete - Form Lumber LF']      ?? R.formMaterialPerLF
  const sleevePer10LF        = mr['Concrete - Sleeve Per 10LF']     ?? R.sleevePer10LF
  const colorCostPerCY       = mr['Concrete - Color Per CY']        ?? R.colorCostPerCY
  const sealerNatural5g      = mr['Concrete - Sealer Natural 5gal'] ?? R.sealerNatural5g
  const sealerWet5g          = mr['Concrete - Sealer Wet 5gal']     ?? R.sealerWet5g
  const vaporBarrierPerSF    = mr['Concrete - Vapor Barrier SF']    ?? R.vaporBarrierPerSF
  const costBase             = mr['Concrete - Import Base']         ?? R.costBase

  // ── Sub / equipment costs (subcontractor_rates) ──────────────────────────
  const pumpFeeFlat          = sr['Concrete - Pump Flat Fee']       ?? R.pumpFeeFlat
  const pumpFeePerCY         = sr['Concrete - Pump Per CY']         ?? R.pumpFeePerCY
  const sandFinishPer400SF   = sr['Concrete - Sand Finish 400SF']   ?? R.sandFinishPer400SF
  const stampSubFlat         = sr['Concrete - Stamp Sub Flat']      ?? R.stampSubFlat
  const stampSubPerCY        = sr['Concrete - Stamp Sub Per CY']    ?? R.stampSubPerCY

  const diffPct         = n(state.difficulty) / 100
  const layoutHrs       = n(state.layoutHrs)
  const distanceLF      = n(state.distanceLF)
  const pctBackyard     = n(state.pctBackyard) / 100
  const formComplexity  = n(state.formingComplexity) / 100
  const finishType      = state.finishType   || 'Broom Finish'
  const colorYes        = state.colorYes
  const pumpYes         = state.pumpYes
  const isIH            = state.finishingType !== 'Sub'
  const vaporSF         = n(state.vaporBarrierSF)
  const sealerSF        = n(state.sealerSF)
  const sealerType      = state.sealerType   || 'Natural'
  const hoursAdj        = n(state.hoursAdj)

  // ── Base ────────────────────────────────────────────────────────────────
  let baseHrsTot = 0, baseMatTot = 0
  const baseCalc = (state.baseRows || []).map(r => {
    const sf = n(r.sf), depth = n(r.depth) || 2
    if (!sf) return { tons: 0, hrs: 0, mat: 0 }
    const tons = (sf / 200) * depth
    const rate = BASE_RATES[r.method] || 10.0
    const hrs  = tons / rate
    const mat  = tons * costBase
    baseHrsTot += hrs
    baseMatTot += mat
    return { tons, hrs, mat }
  })

  // ── Concrete install ─────────────────────────────────────────────────────
  const installSF   = n(state.installSF)
  const depthIn     = n(state.depthIn) || 4
  const rebarSF     = n(state.rebarSF)
  const formLF      = n(state.formLF)
  const sleeveLF    = n(state.sleeveLF)

  const concreteCY  = installSF > 0 ? (depthIn / 12 * installSF) / 27 : 0
  const installHrs  = installSF / concreteSFPerHr
  const concreteMat = concreteCY * concretePerCY

  const rebarHrs = rebarSF > 0 ? rebarSF / rebarSFPerHr : 0
  const rebarMat = rebarSF * rebarSFPrice

  const formHrs = formLF > 0 ? formLF / formLFPerHr : 0
  const formMat = formLF * formMaterialPerLF

  const sleeveUnits = sleeveLF > 0 ? Math.ceil(sleeveLF / 10) : 0
  const sleeveHrs   = sleeveLF / sleeveLFPerHr
  const sleeveMat   = sleeveUnits * sleevePer10LF

  // ── Travel + backyard ────────────────────────────────────────────────────
  const travelHrs   = installSF > 0 && distanceLF > 0
    ? (installSF / R.crewDaySF) * (distanceLF / 60) * 2
    : 0
  const backyardHrs = pctBackyard > 0 ? 0.2 * pctBackyard * installHrs : 0

  // ── Forming complexity ───────────────────────────────────────────────────
  const preComplexHrs = layoutHrs + travelHrs + backyardHrs +
                        baseHrsTot +
                        installHrs + rebarHrs + formHrs + sleeveHrs
  const complexityHrs = preComplexHrs * formComplexity * 0.2

  // ── Finish add-ons ───────────────────────────────────────────────────────
  let finishHrs = 0, finishSubCost = 0, colorMat = 0
  if (finishType === 'Sand Finish') {
    finishHrs = installSF / 100
    if (isIH) finishSubCost = Math.ceil(installSF / 400) * sandFinishPer400SF
  } else if (finishType === 'Salt Finish') {
    finishHrs = installSF / 25
  } else if (finishType === 'Stamped') {
    finishSubCost = isIH ? stampSubFlat : concreteCY * stampSubPerCY
  }
  if (colorYes && concreteCY > 0) {
    colorMat = Math.ceil(concreteCY) * colorCostPerCY
  }

  // ── Pump ────────────────────────────────────────────────────────────────
  const pumpMat = pumpYes && concreteCY > 0
    ? pumpFeeFlat + pumpFeePerCY * Math.ceil(concreteCY)
    : 0

  // ── Vapor barrier ────────────────────────────────────────────────────────
  const vaporHrs = vaporSF > 0 ? vaporSF / vaporBarrierSFPerHr : 0
  const vaporMat = vaporSF * vaporBarrierPerSF

  // ── Sealer ───────────────────────────────────────────────────────────────
  let sealerHrs = 0, sealerMat = 0
  if (sealerSF > 0) {
    const sealerGals    = Math.ceil(sealerSF / R.sealerSFPerGal)
    const price5g       = sealerType === 'Natural' ? sealerNatural5g : sealerWet5g
    sealerMat           = sealerGals * (price5g / 5)
    const sealSFPerHr   = sealerType === 'Natural' ? sealerNaturalSFPerHr : sealerWetSFPerHr
    sealerHrs           = sealerSF / sealSFPerHr
  }

  // ── Manual ───────────────────────────────────────────────────────────────
  let manHrs = 0, manMat = 0, manSub = 0
  ;(state.manualRows || []).forEach(r => {
    manHrs += n(r.hours)
    manMat += n(r.materials)
    manSub += n(r.subCost)
  })

  // ── Totals ───────────────────────────────────────────────────────────────
  const preAdjHrs = preComplexHrs + complexityHrs + finishHrs + vaporHrs + sealerHrs + manHrs
  const diffHrs   = preAdjHrs * diffPct
  const totalHrs  = preAdjHrs + diffHrs + hoursAdj
  const manDays   = totalHrs / 8

  const totalMat  = baseMatTot + concreteMat + rebarMat + formMat + sleeveMat +
                    colorMat + pumpMat + vaporMat + sealerMat + manMat
  const laborCost = totalHrs * lrph
  const burden     = laborCost * R.laborBurdenPct
  const gp         = manDays * gpmd
  const commission = gp * R.commissionRate
  const subCost    = finishSubCost + manSub
  const price      = totalMat + laborCost + burden + gp + commission + subCost

  return {
    totalHrs, manDays, totalMat, laborCost, burden, gp, commission, subCost, price,
    concreteCY, baseCalc,
    layoutHrs, travelHrs, backyardHrs, complexityHrs,
    installHrs, rebarHrs, formHrs, sleeveHrs, finishHrs, vaporHrs, sealerHrs,
    baseMatTot, concreteMat, rebarMat, formMat, sleeveMat,
    colorMat, pumpMat, vaporMat, sealerMat, finishSubCost,
  }
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionHeader({ title }) {
  return (
    <div className="bg-gray-100 px-4 py-2 rounded-lg mb-2">
      <h3 className="text-xs font-bold text-gray-600 uppercase tracking-wider">{title}</h3>
    </div>
  )
}

function NumInput({ value, onChange, placeholder = '0', className = '', step = 'any', min = '0' }) {
  return (
    <input
      type="number" step={step} min={min}
      className={`input text-sm py-1.5 ${className}`}
      placeholder={placeholder}
      value={value}
      onChange={e => onChange(e.target.value)}
    />
  )
}

// ── Default state ─────────────────────────────────────────────────────────────

const DEFAULT_BASE_ROWS = [
  { label: 'Area 1', method: 'Skid Steer Good', sf: '', depth: '2' },
  { label: 'Area 2', method: 'Skid Steer Good', sf: '', depth: '2' },
  { label: 'Area 3', method: 'Skid Steer Good', sf: '', depth: '2' },
]

const DEFAULT_MANUAL_ROWS = [
  { label: 'Misc 1', hours: '', materials: '', subCost: '' },
  { label: 'Misc 2', hours: '', materials: '', subCost: '' },
  { label: 'Misc 3', hours: '', materials: '', subCost: '' },
  { label: 'Misc 4', hours: '', materials: '', subCost: '' },
]

// ── Main component ────────────────────────────────────────────────────────────

export default function ConcreteModule({ projectName, onSave, onBack, saving, initialData }) {
  const [laborRatePerHour, setLaborRatePerHour] = useState(
    initialData?.laborRatePerHour ?? 35
  )
  // Rate snapshots keyed by name → rate value (restored from saved data if re-editing)
  const [laborRates,    setLaborRates]    = useState(initialData?.laborRates    ?? {})
  const [materialRates, setMaterialRates] = useState(initialData?.materialRates ?? {})
  const [subRates,      setSubRates]      = useState(initialData?.subRates      ?? {})

  // Fetch company labor rate per hour
  useEffect(() => {
    if (initialData?.laborRatePerHour) return
    supabase.from('company_settings').select('value').eq('key', 'labor_rate_per_hour').single()
      .then(({ data }) => { if (data) setLaborRatePerHour(parseFloat(data.value) || 35) })
  }, [])

  // Fetch all three rate tables (skip if re-editing — use saved snapshots)
  useEffect(() => {
    const hasLr = initialData?.laborRates    && Object.keys(initialData.laborRates).length > 0
    const hasMr = initialData?.materialRates && Object.keys(initialData.materialRates).length > 0
    const hasSr = initialData?.subRates      && Object.keys(initialData.subRates).length > 0
    if (hasLr && hasMr && hasSr) return

    Promise.all([
      hasLr ? null : supabase.from('labor_rates').select('name, rate').eq('category', 'Concrete'),
      hasMr ? null : supabase.from('material_rates').select('name, unit_cost').eq('category', 'Concrete'),
      hasSr ? null : supabase.from('subcontractor_rates').select('company_name, rate').eq('category', 'Concrete'),
    ]).then(([lrRes, mrRes, srRes]) => {
      if (lrRes?.data) {
        const map = {}; lrRes.data.forEach(r => { map[r.name] = r.rate }); setLaborRates(map)
      }
      if (mrRes?.data) {
        const map = {}; mrRes.data.forEach(r => { map[r.name] = r.unit_cost }); setMaterialRates(map)
      }
      if (srRes?.data) {
        const map = {}; srRes.data.forEach(r => { map[r.company_name] = r.rate }); setSubRates(map)
      }
    })
  }, [])

  // Settings
  const [difficulty,        setDifficulty]        = useState(initialData?.difficulty        ?? '')
  const [layoutHrs,         setLayoutHrs]          = useState(initialData?.layoutHrs         ?? '')
  const [distanceLF,        setDistanceLF]         = useState(initialData?.distanceLF        ?? '')
  const [pctBackyard,       setPctBackyard]        = useState(initialData?.pctBackyard       ?? '')
  const [formingComplexity, setFormingComplexity]  = useState(initialData?.formingComplexity ?? '')
  const [finishingType,     setFinishingType]      = useState(initialData?.finishingType     ?? 'IH')
  const [hoursAdj,          setHoursAdj]           = useState(initialData?.hoursAdj          ?? '')

  // Install
  const [installSF,   setInstallSF]  = useState(initialData?.installSF  ?? '')
  const [depthIn,     setDepthIn]    = useState(initialData?.depthIn    ?? '4')
  const [rebarSF,     setRebarSF]    = useState(initialData?.rebarSF    ?? '')
  const [formLF,      setFormLF]     = useState(initialData?.formLF     ?? '')
  const [sleeveLF,    setSleeveLF]   = useState(initialData?.sleeveLF   ?? '')

  // Options
  const [finishType,     setFinishType]     = useState(initialData?.finishType     ?? 'Broom Finish')
  const [colorYes,       setColorYes]       = useState(initialData?.colorYes       ?? false)
  const [pumpYes,        setPumpYes]        = useState(initialData?.pumpYes        ?? false)
  const [vaporBarrierSF, setVaporBarrierSF] = useState(initialData?.vaporBarrierSF ?? '')
  const [sealerSF,       setSealerSF]       = useState(initialData?.sealerSF       ?? '')
  const [sealerType,     setSealerType]     = useState(initialData?.sealerType     ?? 'Natural')

  // Multi-row sections
  const [baseRows,   setBaseRows]   = useState(initialData?.baseRows   ?? DEFAULT_BASE_ROWS)
  const [manualRows, setManualRows] = useState(initialData?.manualRows ?? DEFAULT_MANUAL_ROWS)

  const state = {
    difficulty, layoutHrs, distanceLF, pctBackyard, formingComplexity, finishingType, hoursAdj,
    installSF, depthIn, rebarSF, formLF, sleeveLF,
    finishType, colorYes, pumpYes, vaporBarrierSF, sealerSF, sealerType,
    baseRows, manualRows,
  }
  const gpmd = initialData?.gpmd ?? R.gpmd
  const subGpMarkupRate = initialData?.subGpMarkupRate ?? 0.20
  const calc = calcConcrete(state, laborRatePerHour, laborRates, materialRates, subRates, gpmd)

  function updateBaseRow(i, field, val) {
    setBaseRows(rows => rows.map((r, idx) => idx === i ? { ...r, [field]: val } : r))
  }
  function updateManual(i, field, val) {
    setManualRows(rows => rows.map((r, idx) => idx === i ? { ...r, [field]: val } : r))
  }

  function handleSave() {
    onSave({
      man_days:      parseFloat(calc.manDays.toFixed(2)),
      material_cost: parseFloat(calc.totalMat.toFixed(2)),
      data: {
        ...state,
        laborRatePerHour, gpmd, subGpMarkupRate,
        laborRates,    // ← production rate snapshot
        materialRates, // ← material cost snapshot
        subRates,      // ← sub/equipment cost snapshot
        calc,
      },
    })
  }

  const fmt2 = v => `$${n(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  return (
    <div className="space-y-5">

      {/* ── Global Settings ── */}
      <div>
        <SectionHeader title="Settings" />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-gray-500 block mb-1">Difficulty Add (%)</label>
            <NumInput value={difficulty} onChange={setDifficulty} placeholder="0" />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Layout Time (hrs)</label>
            <NumInput value={layoutHrs} onChange={setLayoutHrs} placeholder="0" />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Dist. from Truck (LF)</label>
            <NumInput value={distanceLF} onChange={setDistanceLF} placeholder="0" />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">% of Paving in Backyard</label>
            <NumInput value={pctBackyard} onChange={setPctBackyard} placeholder="0" max="100" />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Forming Complexity (0–100)</label>
            <NumInput value={formingComplexity} onChange={setFormingComplexity} placeholder="0" max="100" />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Hrs Adjustment</label>
            <NumInput value={hoursAdj} onChange={setHoursAdj} placeholder="0" min="-999" step="0.5" />
          </div>
        </div>
        <div className="mt-2 flex items-center gap-4">
          <span className="text-xs text-gray-500">Concrete Finishing</span>
          {['IH', 'Sub'].map(opt => (
            <label key={opt} className="flex items-center gap-1.5 text-sm cursor-pointer">
              <input type="radio" value={opt} checked={finishingType === opt}
                onChange={() => setFinishingType(opt)} className="accent-green-600" />
              {opt === 'IH' ? 'In-House' : 'Sub'}
            </label>
          ))}
        </div>
      </div>

      {/* ── Base Install ── */}
      <div>
        <SectionHeader title="Base Install" />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 border-b border-gray-200">
                <th className="text-left pb-1 pr-2 font-medium">Area</th>
                <th className="text-left pb-1 pr-2 font-medium">Method</th>
                <th className="text-left pb-1 pr-2 font-medium">Sq Ft</th>
                <th className="text-left pb-1 pr-2 font-medium">Depth (in)</th>
                <th className="text-right pb-1 font-medium text-gray-400">Hrs</th>
              </tr>
            </thead>
            <tbody>
              {baseRows.map((row, i) => {
                const c = calc.baseCalc[i] || {}
                return (
                  <tr key={i} className="border-b border-gray-100">
                    <td className="py-1 pr-2">
                      <input className="input text-sm py-1" value={row.label}
                        onChange={e => updateBaseRow(i, 'label', e.target.value)} />
                    </td>
                    <td className="py-1 pr-2">
                      <select className="input text-sm py-1" value={row.method}
                        onChange={e => updateBaseRow(i, 'method', e.target.value)}>
                        {METHODS.map(m => <option key={m}>{m}</option>)}
                      </select>
                    </td>
                    <td className="py-1 pr-2"><NumInput value={row.sf}    onChange={v => updateBaseRow(i, 'sf', v)} /></td>
                    <td className="py-1 pr-2"><NumInput value={row.depth} onChange={v => updateBaseRow(i, 'depth', v)} placeholder="2" /></td>
                    <td className="py-1 text-right text-gray-500 text-xs">
                      {c.hrs > 0 ? c.hrs.toFixed(2) : '—'}
                      {c.mat > 0 && <p className="text-gray-400">{fmt2(c.mat)}</p>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Concrete Install ── */}
      <div>
        <SectionHeader title="Concrete Install" />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-gray-500 block mb-1">Installation (Sq Ft)</label>
            <NumInput value={installSF} onChange={v => { setInstallSF(v); if (!rebarSF) setRebarSF(v) }} />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Depth (inches)</label>
            <NumInput value={depthIn} onChange={setDepthIn} placeholder="4" />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Rebar 24" OC (Sq Ft)</label>
            <NumInput value={rebarSF} onChange={setRebarSF} />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Form Edging (Lin Ft)</label>
            <NumInput value={formLF} onChange={setFormLF} />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">3" Sleeves (Lin Ft)</label>
            <NumInput value={sleeveLF} onChange={setSleeveLF} />
          </div>
          {calc.concreteCY > 0 && (
            <div className="flex items-end pb-1.5">
              <p className="text-xs text-gray-400">
                ≈ <span className="font-semibold text-gray-600">{calc.concreteCY.toFixed(2)} CY</span> concrete
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── Finish Options ── */}
      <div>
        <SectionHeader title="Finish Options" />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-gray-500 block mb-1">Finish Type</label>
            <select className="input text-sm py-1.5" value={finishType} onChange={e => setFinishType(e.target.value)}>
              {FINISH_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div className="flex items-end gap-4 pb-1">
            <label className="flex items-center gap-1.5 text-sm cursor-pointer">
              <input type="checkbox" checked={colorYes} onChange={e => setColorYes(e.target.checked)} className="accent-green-600" />
              <span className="text-gray-700">Color Hardener</span>
            </label>
            <label className="flex items-center gap-1.5 text-sm cursor-pointer">
              <input type="checkbox" checked={pumpYes} onChange={e => setPumpYes(e.target.checked)} className="accent-green-600" />
              <span className="text-gray-700">Pump</span>
            </label>
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Vapor Barrier (Sq Ft)</label>
            <NumInput value={vaporBarrierSF} onChange={setVaporBarrierSF} />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Sealer (Sq Ft)</label>
            <div className="flex gap-2">
              <NumInput value={sealerSF} onChange={setSealerSF} className="flex-1" />
              <select className="input text-sm py-1.5 w-28" value={sealerType} onChange={e => setSealerType(e.target.value)}>
                {SEALER_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
          </div>
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
        gpmd={gpmd}
        price={calc.price}
        subMarkupRate={subGpMarkupRate}
      />

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
