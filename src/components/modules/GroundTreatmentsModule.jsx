import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import GpmdBar from './GpmdBar'

// ─────────────────────────────────────────────────────────────────────────────
// Ground Treatments Module — based on Softscape Module tab in Excel estimator
// Covers: Mulch, Edging, Soil Prep, Sod, Flagstone/Precast Steppers,
//         Decomposed Granite, Gravel, Manual Entry
// ─────────────────────────────────────────────────────────────────────────────

// All dbName entries are read from material_rates (category = 'Ground Treatments').
// Fallback values are used when DB row is absent.
const GT_RATES = {
  // ── Mulch ──────────────────────────────────────────────────────────────────
  mulchPerCY:      { dbName: 'Mulch',                       fallback: 25.00  },  // $/CY
  mulchDelivery:   { dbName: 'Mulch Delivery Fee',          fallback: 75.00  },  // $ flat per delivery

  // ── Edging ─────────────────────────────────────────────────────────────────
  plasticEdgingMat:{ dbName: 'Plastic Edging',              fallback: 1.20   },  // $/LF
  plasticEdgingLab:{ dbName: 'Plastic Edging - Labor Rate', fallback: 0.09   },  // hrs/LF
  metalEdgingMat:  { dbName: 'Metal Edging',                fallback: 4.00   },  // $/LF
  metalEdgingLab:  { dbName: 'Metal Edging - Labor Rate',   fallback: 0.17   },  // hrs/LF

  // ── Soil Prep ──────────────────────────────────────────────────────────────
  soilPrepMat:     { dbName: 'Soil Prep',                   fallback: 0.1558 },  // $/SF
  soilPrepLab:     { dbName: 'Soil Prep - Labor Rate',      fallback: 0.012  },  // hrs/SF

  // ── Sod ────────────────────────────────────────────────────────────────────
  sodMarathonMat:  { dbName: 'Sod - Marathon',              fallback: 1.20   },  // $/SF
  sodStAugMat:     { dbName: 'Sod - St. Augustine',         fallback: 1.97   },  // $/SF
  sodLab:          { dbName: 'Sod - Labor Rate',            fallback: 0.01143 }, // hrs/SF (≈8/700)

  // ── Steppers ───────────────────────────────────────────────────────────────
  flagstonePerTon: { dbName: 'Flagstone Steppers',              fallback: 500.00 },  // $/ton default
  flagstoneLab:    { dbName: 'Flagstone Steppers - Labor Rate', fallback: 35     },  // SF/day
  precastPerTon:   { dbName: 'Precast Steppers',                fallback: 200.00 },  // $/ton default
  precastLab:      { dbName: 'Precast Steppers - Labor Rate',   fallback: 50     },  // SF/day

  // ── Decomposed Granite ─────────────────────────────────────────────────────
  dgPerTon:        { dbName: 'Decomposed Granite',          fallback: 50.00  },  // $/ton
  dgCementPerTon:  { dbName: 'DG Cement Mix',               fallback: 20.00  },  // $/ton add-on

  // ── Gravel ─────────────────────────────────────────────────────────────────
  gravelFabricMat: { dbName: 'Gravel Fabric',               fallback: 0.10   },  // $/SF
  gravelFabricLab: { dbName: 'Gravel Fabric - Labor Rate',  fallback: 0.024  },  // hrs/SF
}

const DEFAULTS = {
  laborRatePerHour: 35,
  laborBurdenPct:   0.29,
  gpmd:             425,
  commissionRate:   0.12,
}

const SOD_TYPES = ['Marathon I/II', 'St. Augustine']
const DG_METHODS = ['Machine', 'Hand']

const n = (v) => parseFloat(v) || 0

// ── Calculation engine ────────────────────────────────────────────────────────
function calcGroundTreatments(state, lrph = DEFAULTS.laborRatePerHour, mp = {}, gpmd = DEFAULTS.gpmd) {
  const {
    difficulty, hoursAdj,
    mulchSF, mulchDepth,
    plasticEdgingLF, metalEdgingLF,
    soilPrepSF,
    sodSF, sodType,
    flagstoneSF, flagstoneRate,
    precastSF, precastRate,
    dgSF, dgDepth, dgMethod, dgCement,
    gravelRows, manualRows,
  } = state

  const p = (dbName, fallback) => mp[dbName] ?? fallback

  let totalLab = 0, totalMat = 0

  // ── Mulch ──────────────────────────────────────────────────────────────────
  let mulchLab = 0, mulchMat = 0
  if (n(mulchSF) > 0) {
    const CY = n(mulchSF) * (n(mulchDepth) / 12) / 27
    mulchLab = (CY / 15) * 8 + (n(mulchSF) / 3200) * 8
    mulchMat = CY * p(GT_RATES.mulchPerCY.dbName, GT_RATES.mulchPerCY.fallback)
             + p(GT_RATES.mulchDelivery.dbName, GT_RATES.mulchDelivery.fallback)
  }

  // ── Edging ─────────────────────────────────────────────────────────────────
  const plasticLab = n(plasticEdgingLF) * p(GT_RATES.plasticEdgingLab.dbName, GT_RATES.plasticEdgingLab.fallback)
  const plasticMat = n(plasticEdgingLF) * p(GT_RATES.plasticEdgingMat.dbName, GT_RATES.plasticEdgingMat.fallback)
  const metalLab   = n(metalEdgingLF)   * p(GT_RATES.metalEdgingLab.dbName,   GT_RATES.metalEdgingLab.fallback)
  const metalMat   = n(metalEdgingLF)   * p(GT_RATES.metalEdgingMat.dbName,   GT_RATES.metalEdgingMat.fallback)

  // ── Soil Prep ──────────────────────────────────────────────────────────────
  const soilLab = n(soilPrepSF) * p(GT_RATES.soilPrepLab.dbName, GT_RATES.soilPrepLab.fallback)
  const soilMat = n(soilPrepSF) * p(GT_RATES.soilPrepMat.dbName, GT_RATES.soilPrepMat.fallback)

  // ── Sod ────────────────────────────────────────────────────────────────────
  const sodLab  = n(sodSF) * p(GT_RATES.sodLab.dbName, GT_RATES.sodLab.fallback)
  const sodMat  = n(sodSF) * (sodType === 'St. Augustine'
    ? p(GT_RATES.sodStAugMat.dbName,  GT_RATES.sodStAugMat.fallback)
    : p(GT_RATES.sodMarathonMat.dbName, GT_RATES.sodMarathonMat.fallback))

  // ── Flagstone Steppers ─────────────────────────────────────────────────────
  let flagLab = 0, flagMat = 0
  if (n(flagstoneSF) > 0) {
    const tons    = n(flagstoneSF) / 80
    const sfPerDay = p(GT_RATES.flagstoneLab.dbName, GT_RATES.flagstoneLab.fallback)
    flagLab = (n(flagstoneSF) / sfPerDay) * 8
    flagMat = tons * (n(flagstoneRate) || p(GT_RATES.flagstonePerTon.dbName, GT_RATES.flagstonePerTon.fallback))
  }

  // ── Precast Steppers ───────────────────────────────────────────────────────
  let precastLab = 0, precastMat = 0
  if (n(precastSF) > 0) {
    const tons    = n(precastSF) / 80
    const sfPerDay = p(GT_RATES.precastLab.dbName, GT_RATES.precastLab.fallback)
    precastLab = (n(precastSF) / sfPerDay) * 8
    precastMat = tons * (n(precastRate) || p(GT_RATES.precastPerTon.dbName, GT_RATES.precastPerTon.fallback))
  }

  // ── Decomposed Granite ─────────────────────────────────────────────────────
  let dgLab = 0, dgMat = 0
  if (n(dgSF) > 0) {
    const tons     = n(dgSF) * n(dgDepth) / 200
    const cement   = dgCement === 'Yes'
    const baseHrs  = dgMethod === 'Hand'
      ? (tons * 1.62) / 0.5 + (n(dgSF) / 1000) * 8 + tons
      : (tons * 1.62) / 12 * 8 + (n(dgSF) / 1000) * 8 + tons
    dgLab = baseHrs + (cement ? tons * 1.25 : 0)
    dgMat = (tons * p(GT_RATES.dgPerTon.dbName, GT_RATES.dgPerTon.fallback)
           + (cement ? tons * p(GT_RATES.dgCementPerTon.dbName, GT_RATES.dgCementPerTon.fallback) : 0)) * 1.1
  }

  // ── Gravel rows ────────────────────────────────────────────────────────────
  let gravelLab = 0, gravelMat = 0
  gravelRows.forEach(r => {
    if (!n(r.sf)) return
    const CY        = n(r.sf) * (n(r.depthIn) / 12) / 27
    const excavLab  = r.method === 'Machine' ? CY * 1.62 / 12 * 8 : CY * 1.62 / 4 * 8
    const fabricLab = n(r.sf) * p(GT_RATES.gravelFabricLab.dbName, GT_RATES.gravelFabricLab.fallback)
    gravelLab += excavLab + fabricLab
    const costPerCY = n(r.costPerCY) || 130
    gravelMat += CY * costPerCY
              + n(r.sf) * p(GT_RATES.gravelFabricMat.dbName, GT_RATES.gravelFabricMat.fallback)
  })

  // ── Manual ─────────────────────────────────────────────────────────────────
  let manHrs = 0, manMat = 0, manSub = 0
  manualRows.forEach(r => { manHrs += n(r.hours); manMat += n(r.materials); manSub += n(r.subCost) })

  // ── Totals ─────────────────────────────────────────────────────────────────
  const baseHrs = mulchLab + plasticLab + metalLab + soilLab + sodLab
                + flagLab + precastLab + dgLab + gravelLab + manHrs
  const diffMod  = 1 + n(difficulty) / 100
  const totalHrs = baseHrs * diffMod + n(hoursAdj)
  const manDays  = totalHrs / 8
  totalMat       = mulchMat + plasticMat + metalMat + soilMat + sodMat
                 + flagMat + precastMat + dgMat + gravelMat + manMat
  const laborCost  = totalHrs * lrph
  const burden     = laborCost * DEFAULTS.laborBurdenPct
  const gp         = manDays * gpmd
  const commission = gp * DEFAULTS.commissionRate
  const subCost    = manSub
  const price      = totalMat + laborCost + burden + gp + commission + subCost

  return {
    totalHrs, manDays, totalMat, laborCost, burden, gp, commission, subCost, price,
    // section breakdowns for summary
    mulchLab, mulchMat,
    plasticLab, plasticMat,
    metalLab, metalMat,
    soilLab, soilMat,
    sodLab, sodMat,
    flagLab, flagMat,
    precastLab, precastMat,
    dgLab, dgMat,
    gravelLab, gravelMat,
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

function NumInput({ value, onChange, placeholder = '0', className = '' }) {
  return (
    <input
      type="number" step="any" min="0"
      className={`input text-sm py-1.5 ${className}`}
      placeholder={placeholder}
      value={value}
      onChange={e => onChange(e.target.value)}
    />
  )
}

function LabeledRow({ label, children, note }) {
  return (
    <div className="flex items-center gap-3 py-1.5 border-b border-gray-100">
      <span className="text-xs text-gray-700 w-40 shrink-0">{label}</span>
      {children}
      {note && <span className="text-xs text-gray-400 shrink-0">{note}</span>}
    </div>
  )
}

const DEFAULT_GRAVEL_ROWS = [
  { sf: '', method: 'Hand', costPerCY: '130', depthIn: '3' },
  { sf: '', method: 'Hand', costPerCY: '130', depthIn: '3' },
  { sf: '', method: 'Hand', costPerCY: '130', depthIn: '3' },
  { sf: '', method: 'Hand', costPerCY: '130', depthIn: '3' },
]
const DEFAULT_MANUAL_ROWS = [
  { label: 'Misc 1', hours: '', materials: '', subCost: '' },
  { label: 'Misc 2', hours: '', materials: '', subCost: '' },
  { label: 'Misc 3', hours: '', materials: '', subCost: '' },
  { label: 'Misc 4', hours: '', materials: '', subCost: '' },
]

// ── Main component ────────────────────────────────────────────────────────────
export default function GroundTreatmentsModule({ projectName, onSave, onBack, saving, initialData }) {
  const [laborRatePerHour, setLaborRatePerHour] = useState(
    initialData?.laborRatePerHour ?? DEFAULTS.laborRatePerHour
  )
  const [materialPrices, setMaterialPrices] = useState(initialData?.materialPrices ?? {})
  const [pricesLoading, setPricesLoading]   = useState(!initialData?.materialPrices)

  useEffect(() => {
    if (!initialData?.laborRatePerHour) {
      supabase.from('company_settings').select('value').eq('key', 'labor_rate_per_hour').single()
        .then(({ data }) => { if (data) setLaborRatePerHour(parseFloat(data.value) || DEFAULTS.laborRatePerHour) })
    }
    if (initialData?.materialPrices) return
    Promise.all([
      supabase.from('material_rates').select('name, unit_cost').eq('category', 'Ground Treatments'),
      supabase.from('labor_rates').select('name, rate').eq('category', 'Ground Treatments'),
    ]).then(([matRes, labRes]) => {
      const prices = {}
      ;(matRes.data || []).forEach(r => { prices[r.name] = parseFloat(r.unit_cost) || 0 })
      ;(labRes.data  || []).forEach(r => { prices[r.name] = parseFloat(r.rate)     || 0 })
      setMaterialPrices(prices)
      setPricesLoading(false)
    })
  }, [])

  const gpmd          = initialData?.gpmd          ?? DEFAULTS.gpmd
  const subGpMarkupRate = initialData?.subGpMarkupRate ?? 0.20

  // ── State ──────────────────────────────────────────────────────────────────
  const [difficulty,      setDifficulty]      = useState(initialData?.difficulty      ?? '')
  const [hoursAdj,        setHoursAdj]        = useState(initialData?.hoursAdj        ?? '')
  const [mulchSF,         setMulchSF]         = useState(initialData?.mulchSF         ?? '')
  const [mulchDepth,      setMulchDepth]      = useState(initialData?.mulchDepth      ?? '2')
  const [plasticEdgingLF, setPlasticEdgingLF] = useState(initialData?.plasticEdgingLF ?? '')
  const [metalEdgingLF,   setMetalEdgingLF]   = useState(initialData?.metalEdgingLF   ?? '')
  const [soilPrepSF,      setSoilPrepSF]      = useState(initialData?.soilPrepSF      ?? '')
  const [sodSF,           setSodSF]           = useState(initialData?.sodSF           ?? '')
  const [sodType,         setSodType]         = useState(initialData?.sodType         ?? 'Marathon I/II')
  const [flagstoneSF,     setFlagstoneSF]     = useState(initialData?.flagstoneSF     ?? '')
  const [flagstoneRate,   setFlagstoneRate]   = useState(initialData?.flagstoneRate   ?? '')
  const [precastSF,       setPrecastSF]       = useState(initialData?.precastSF       ?? '')
  const [precastRate,     setPrecastRate]     = useState(initialData?.precastRate     ?? '')
  const [dgSF,            setDgSF]            = useState(initialData?.dgSF            ?? '')
  const [dgDepth,         setDgDepth]         = useState(initialData?.dgDepth         ?? '3.5')
  const [dgMethod,        setDgMethod]        = useState(initialData?.dgMethod        ?? 'Machine')
  const [dgCement,        setDgCement]        = useState(initialData?.dgCement        ?? 'Yes')
  const [gravelRows,      setGravelRows]      = useState(initialData?.gravelRows      ?? DEFAULT_GRAVEL_ROWS)
  const [manualRows,      setManualRows]      = useState(initialData?.manualRows      ?? DEFAULT_MANUAL_ROWS)

  // Default stepper rates once prices load
  useEffect(() => {
    if (Object.keys(materialPrices).length === 0) return
    if (!initialData?.flagstoneRate && materialPrices[GT_RATES.flagstonePerTon.dbName]) {
      setFlagstoneRate(materialPrices[GT_RATES.flagstonePerTon.dbName].toString())
    }
    if (!initialData?.precastRate && materialPrices[GT_RATES.precastPerTon.dbName]) {
      setPrecastRate(materialPrices[GT_RATES.precastPerTon.dbName].toString())
    }
  }, [materialPrices])

  const state = {
    difficulty, hoursAdj,
    mulchSF, mulchDepth,
    plasticEdgingLF, metalEdgingLF,
    soilPrepSF,
    sodSF, sodType,
    flagstoneSF, flagstoneRate,
    precastSF, precastRate,
    dgSF, dgDepth, dgMethod, dgCement,
    gravelRows, manualRows,
  }
  const calc = calcGroundTreatments(state, laborRatePerHour, materialPrices, gpmd)

  const p = (dbName, fallback) => materialPrices[dbName] ?? fallback

  function updateGravel(i, field, val) {
    setGravelRows(rows => rows.map((r, idx) => idx === i ? { ...r, [field]: val } : r))
  }
  function updateManual(i, field, val) {
    setManualRows(rows => rows.map((r, idx) => idx === i ? { ...r, [field]: val } : r))
  }

  function handleSave() {
    onSave({
      man_days:      parseFloat(calc.manDays.toFixed(2)),
      material_cost: parseFloat(calc.totalMat.toFixed(2)),
      data: { ...state, laborRatePerHour, gpmd, materialPrices, calc },
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

      {/* ── Soil Prep ── */}
      <div>
        <SectionHeader title="Soil Prep" />
        <div className="space-y-0">
          <LabeledRow label="Soil Prep"
            note={n(soilPrepSF) > 0 ? `$${(n(soilPrepSF)*p(GT_RATES.soilPrepMat.dbName,0.1558)).toFixed(2)} mat` : null}>
            <NumInput value={soilPrepSF} onChange={setSoilPrepSF} placeholder="SF" className="w-28" />
            <span className="text-xs text-gray-400">${p(GT_RATES.soilPrepMat.dbName,0.1558).toFixed(2)}/SF</span>
          </LabeledRow>
        </div>
      </div>

      {/* ── Sod ── */}
      <div>
        <SectionHeader title="Sod" />
        <div className="space-y-0">
          <LabeledRow label="Sod">
            <NumInput value={sodSF} onChange={setSodSF} placeholder="SF" className="w-28" />
            <select className="input text-sm py-1.5 flex-1" value={sodType} onChange={e => setSodType(e.target.value)}>
              {SOD_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
            {n(sodSF) > 0 && (
              <span className="text-xs text-gray-400">
                ${(n(sodSF) * (sodType === 'St. Augustine'
                  ? p(GT_RATES.sodStAugMat.dbName, 1.97)
                  : p(GT_RATES.sodMarathonMat.dbName, 1.20))).toFixed(2)} mat
              </span>
            )}
          </LabeledRow>
        </div>
      </div>

      {/* ── Mulch ── */}
      <div>
        <SectionHeader title="Mulch" />
        <div className="space-y-0">
          <LabeledRow label="Mulch">
            <NumInput value={mulchSF} onChange={setMulchSF} placeholder="SF" className="w-28" />
            <select
              className="input text-sm py-1.5 w-24"
              value={mulchDepth}
              onChange={e => setMulchDepth(e.target.value)}
            >
              {['1','2','3','4'].map(d => <option key={d} value={d}>{d}" deep</option>)}
            </select>
            {n(mulchSF) > 0 && (
              <span className="text-xs text-gray-400">
                {((n(mulchSF)*(n(mulchDepth)/12)/27)).toFixed(2)} CY
              </span>
            )}
          </LabeledRow>
        </div>
      </div>

      {/* ── Decomposed Granite ── */}
      <div>
        <SectionHeader title="Decomposed Granite (D.G.)" />
        <div className="grid grid-cols-2 gap-3 mb-2">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Area (SF)</label>
            <NumInput value={dgSF} onChange={setDgSF} />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Depth (Inches)</label>
            <NumInput value={dgDepth} onChange={setDgDepth} placeholder="3.5" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Method</label>
            <select className="input text-sm py-1.5" value={dgMethod} onChange={e => setDgMethod(e.target.value)}>
              {DG_METHODS.map(m => <option key={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Add Cement Mixture?</label>
            <select className="input text-sm py-1.5" value={dgCement} onChange={e => setDgCement(e.target.value)}>
              <option value="Yes">Yes</option>
              <option value="No">No</option>
            </select>
          </div>
        </div>
        {n(dgSF) > 0 && (
          <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-xs text-gray-600 flex gap-6">
            <span>Tons: <strong>{(n(dgSF)*n(dgDepth)/200).toFixed(2)}</strong></span>
            <span>Material: <strong>${calc.dgMat.toFixed(2)}</strong></span>
            <span>Labor: <strong>{calc.dgLab.toFixed(2)} hrs</strong></span>
          </div>
        )}
      </div>

      {/* ── Gravel ── */}
      <div>
        <SectionHeader title="Gravel" />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 border-b border-gray-200">
                <th className="text-left pb-1 pr-1 font-medium w-16">#</th>
                <th className="text-left pb-1 pr-1 font-medium">SF</th>
                <th className="text-left pb-1 pr-1 font-medium">Method</th>
                <th className="text-left pb-1 pr-1 font-medium">$/CY</th>
                <th className="text-left pb-1 font-medium">Depth (in)</th>
              </tr>
            </thead>
            <tbody>
              {gravelRows.map((row, i) => {
                const CY  = n(row.sf) * (n(row.depthIn)/12) / 27
                const mat = CY * (n(row.costPerCY) || 130)
                           + n(row.sf) * p(GT_RATES.gravelFabricMat.dbName, 0.10)
                return (
                  <tr key={i} className="border-b border-gray-100">
                    <td className="py-1 pr-1 text-xs text-gray-500">#{i+1}</td>
                    <td className="py-1 pr-1">
                      <NumInput value={row.sf} onChange={v => updateGravel(i,'sf',v)} />
                    </td>
                    <td className="py-1 pr-1">
                      <select className="input text-sm py-1.5" value={row.method}
                              onChange={e => updateGravel(i,'method',e.target.value)}>
                        <option>Hand</option>
                        <option>Machine</option>
                      </select>
                    </td>
                    <td className="py-1 pr-1">
                      <NumInput value={row.costPerCY} onChange={v => updateGravel(i,'costPerCY',v)} placeholder="130" />
                    </td>
                    <td className="py-1">
                      <NumInput value={row.depthIn} onChange={v => updateGravel(i,'depthIn',v)} placeholder="3" />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {/* Show CY / material preview below table */}
          {gravelRows.some(r => n(r.sf) > 0) && (
            <div className="mt-1 flex gap-4 flex-wrap">
              {gravelRows.map((row, i) => {
                if (!n(row.sf)) return null
                const CY = n(row.sf) * (n(row.depthIn)/12) / 27
                const mat = CY * (n(row.costPerCY)||130) + n(row.sf)*p(GT_RATES.gravelFabricMat.dbName,0.10)
                return (
                  <span key={i} className="text-xs text-gray-400">
                    #{i+1}: {CY.toFixed(2)} CY · ${mat.toFixed(2)} mat
                  </span>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Edging ── */}
      <div>
        <SectionHeader title="Edging" />
        <div className="space-y-0">
          {/* Plastic Edging */}
          <LabeledRow label="Plastic Edging"
            note={n(plasticEdgingLF) > 0 ? `$${(n(plasticEdgingLF)*p(GT_RATES.plasticEdgingMat.dbName,1.20)).toFixed(2)} mat` : null}>
            <NumInput value={plasticEdgingLF} onChange={setPlasticEdgingLF} placeholder="LF" className="w-28" />
            <span className="text-xs text-gray-400">${p(GT_RATES.plasticEdgingMat.dbName,1.20).toFixed(2)}/LF</span>
          </LabeledRow>

          {/* Metal Edging */}
          <LabeledRow label="Metal Edging"
            note={n(metalEdgingLF) > 0 ? `$${(n(metalEdgingLF)*p(GT_RATES.metalEdgingMat.dbName,4.00)).toFixed(2)} mat` : null}>
            <NumInput value={metalEdgingLF} onChange={setMetalEdgingLF} placeholder="LF" className="w-28" />
            <span className="text-xs text-gray-400">${p(GT_RATES.metalEdgingMat.dbName,4.00).toFixed(2)}/LF</span>
          </LabeledRow>
        </div>
      </div>

      {/* ── Steppers ── */}
      <div>
        <SectionHeader title="Steppers" />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 border-b border-gray-200">
                <th className="text-left pb-1 pr-2 font-medium">Type</th>
                <th className="text-left pb-1 pr-2 font-medium">Area (SF)</th>
                <th className="text-left pb-1 pr-2 font-medium">$/Ton</th>
                <th className="text-right pb-1 pr-2 font-medium text-gray-400">Tons</th>
                <th className="text-right pb-1 font-medium text-gray-400">Material $</th>
              </tr>
            </thead>
            <tbody>
              {/* Flagstone */}
              <tr className="border-b border-gray-100">
                <td className="py-1 pr-2 text-xs text-gray-700">Flagstone Steppers</td>
                <td className="py-1 pr-2"><NumInput value={flagstoneSF} onChange={setFlagstoneSF} /></td>
                <td className="py-1 pr-2">
                  <div className="relative">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">$</span>
                    <input
                      type="number" step="any" min="0"
                      className="input text-sm py-1.5 pl-5 w-24"
                      placeholder={p(GT_RATES.flagstonePerTon.dbName, 500).toString()}
                      value={flagstoneRate}
                      onChange={e => setFlagstoneRate(e.target.value)}
                    />
                  </div>
                </td>
                <td className="py-1 text-right text-xs text-gray-400 pr-2">
                  {n(flagstoneSF) > 0 ? (n(flagstoneSF)/80).toFixed(2) : '—'}
                </td>
                <td className="py-1 text-right text-xs text-gray-600">
                  {n(flagstoneSF) > 0 ? `$${calc.flagMat.toFixed(2)}` : '—'}
                </td>
              </tr>
              {/* Precast */}
              <tr className="border-b border-gray-100">
                <td className="py-1 pr-2 text-xs text-gray-700">Precast Steppers</td>
                <td className="py-1 pr-2"><NumInput value={precastSF} onChange={setPrecastSF} /></td>
                <td className="py-1 pr-2">
                  <div className="relative">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">$</span>
                    <input
                      type="number" step="any" min="0"
                      className="input text-sm py-1.5 pl-5 w-24"
                      placeholder={p(GT_RATES.precastPerTon.dbName, 200).toString()}
                      value={precastRate}
                      onChange={e => setPrecastRate(e.target.value)}
                    />
                  </div>
                </td>
                <td className="py-1 text-right text-xs text-gray-400 pr-2">
                  {n(precastSF) > 0 ? (n(precastSF)/80).toFixed(2) : '—'}
                </td>
                <td className="py-1 text-right text-xs text-gray-600">
                  {n(precastSF) > 0 ? `$${calc.precastMat.toFixed(2)}` : '—'}
                </td>
              </tr>
            </tbody>
          </table>
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
                           onChange={e => updateManual(i,'label',e.target.value)} />
                  </td>
                  <td className="py-1 pr-2"><NumInput value={row.hours}     onChange={v => updateManual(i,'hours',v)} /></td>
                  <td className="py-1 pr-2"><NumInput value={row.materials} onChange={v => updateManual(i,'materials',v)} /></td>
                  <td className="py-1">     <NumInput value={row.subCost}   onChange={v => updateManual(i,'subCost',v)} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
