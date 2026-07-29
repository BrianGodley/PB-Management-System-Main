import WorkTypeChooser from './WorkTypeChooser'
import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { supabase } from '../../lib/supabase'
import GpmdBar from './GpmdBar'
import ModuleNotesField from './ModuleNotesField'
import { fetchSalesTaxRate } from '../../lib/companyDefaults'
import { calcWalkAccessLabor, DEFAULT_WALK_ACCESS_PACE_LF_PER_MIN } from '../../lib/walkAccess'

// ─────────────────────────────────────────────────────────────────────────────
// Steps Module
//
// Two row-based sections, each replicated on the In-House and Sub tabs with
// their OWN rows so every tab is an independent calculator:
//
//   Paver Steps — Vendor · Type · Form · SF · Grouted?
//     Vendor + Type come from the shared Paver Material catalog (subs_vendors +
//     material_rates, category='Paver', subcategory='Paver Material'), same as
//     the Paver module. Form (Straight/Curved) sets the labor LF/hr rate. SF
//     drives BOTH labor (SF ÷ form rate) and material (SF × vendor $/SF).
//
//   Concrete Steps — Vendor · Type · Form · SF · Finish
//     Type ∈ {Standard, Standard Colored, Cantilevered, Cantilevered Colored}
//     Finish ∈ {Smooth, Broom, Sanded, Salted, Exposed Aggregate}
//     A single "Edit Rates" modal edits a labor + material modifier for every
//     Type, Finish, and Form choice (all category='Steps', default 0 / 1 —
//     zero to start, tuned later). Vendor is captured for scope + future
//     material-price override once a concrete catalog exists.
//
// Material Breakdown at the bottom is fully per-tab independent (In House vs
// Sub) — only the active tab's entered rows contribute.
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULTS = { laborRatePerHour: 35, laborBurdenPct: 0.29, gpmd: 425, commissionRate: 0.12 }
const n = v => parseFloat(v) || 0
const fmt2 = v => `$${(n(v)).toFixed(2)}`

const PAVER_STEP_CAT = 'Paver Material' // shared Paver catalog subcategory
const CONC_VENDOR_CAT = 'Concrete Mix' // supplied_categories tag for concrete vendors
const STEP_FORMS = ['Straight', 'Curved']
const CONC_TYPES = ['Standard', 'Standard Colored', 'Cantilevered', 'Cantilevered Colored']
const CONC_FINISHES = ['Smooth', 'Broom', 'Sanded', 'Salted', 'Exposed Aggregate']

// ── Rate-key builders (category 'Steps') ─────────────────────────────────────
const kPaverForm = form => `Steps - ${form}` // labor LF/hr
const kConcTypeHrs = t => `Steps - Conc ${t} Hrs/SF` // labor hrs/SF
const kConcTypeMat = t => `Steps - Conc ${t} $/SF` // material $/SF
const kFinishHrs = f => `Steps - Finish ${f} Hrs/SF` // labor +hrs/SF
const kFinishMat = f => `Steps - Finish ${f} $/SF` // material +$/SF
const kConcForm = form => `Steps - Conc Form ${form}` // labor multiplier

const PAVER_FORM_DEFAULT = { Straight: 1.5, Curved: 1.0 } // LF/hr fallbacks

// ── Vendor-catalog helpers (same as PaverModule) ─────────────────────────────
function paverOptions(cat, vendorSel, materialRows) {
  if (!vendorSel || vendorSel === 'House' || vendorSel === 'Custom') return []
  const prefix = `${cat} - `
  return (materialRows || [])
    .filter(r => r.subcategory === cat && r.vendor_id === vendorSel)
    .map(r => ({
      label: r.name && r.name.startsWith(prefix) ? r.name.slice(prefix.length) : r.name,
      row: r,
    }))
}
function paverItemFor(cat, vendorSel, typeLabel, materialRows) {
  const opts = paverOptions(cat, vendorSel, materialRows)
  if (!opts.length) return null
  return (opts.find(o => o.label === typeLabel) || opts[0]).row
}

// ── Per-row calculators ──────────────────────────────────────────────────────
function paverRowCalc(r, laborRates, materialRows) {
  const sf = n(r.sf)
  const rate = n(laborRates[kPaverForm(r.form)] ?? PAVER_FORM_DEFAULT[r.form] ?? 0)
  const hrs = sf > 0 && rate > 0 ? sf / rate : 0
  let price = 0
  let sfPerPallet = 0
  if (r.vendor && r.vendor !== 'House' && r.vendor !== 'Custom') {
    const item = paverItemFor(PAVER_STEP_CAT, r.vendor, r.type, materialRows)
    if (item) {
      price = n(item.unit_cost)
      sfPerPallet = n(item.sf_per_pallet)
    }
  }
  const mat = sf * price
  const pallets = sf > 0 && sfPerPallet > 0 ? Math.ceil(sf / sfPerPallet) : 0
  return { sf, hrs, mat, price, pallets }
}

function concRowCalc(r, laborRates, materialRates) {
  const sf = n(r.sf)
  const typeHrs = n(laborRates[kConcTypeHrs(r.type)] ?? 0)
  const finishHrs = n(laborRates[kFinishHrs(r.finish)] ?? 0)
  const formMult = n(laborRates[kConcForm(r.form)] ?? 1)
  const hrs = sf * (typeHrs + finishHrs) * formMult
  const typeMat = n(materialRates[kConcTypeMat(r.type)] ?? 0)
  const finishMat = n(materialRates[kFinishMat(r.finish)] ?? 0)
  const mat = sf * (typeMat + finishMat)
  return { sf, hrs, mat }
}

// ── Calculation engine ────────────────────────────────────────────────────────
// Labor always reads the In-House rows; MATERIAL follows the active tab so each
// tab's Materials Breakdown is fully independent.
function calcSteps(
  state,
  lrph,
  laborRates,
  materialRates,
  materialRows,
  gpmd = DEFAULTS.gpmd,
  walkAccess = null,
  laborBurdenPct = DEFAULTS.laborBurdenPct,
  subGpMarkupRate = 0.2
) {
  const _pace = parseFloat(walkAccess?.paceLfPerMin) || DEFAULT_WALK_ACCESS_PACE_LF_PER_MIN
  const lr = laborRates || {}
  const mr = materialRates || {}
  const isSub = state.subType === 'Subcontractor'

  const ihPaver = state.paverRows || []
  const ihConc = state.concRows || []
  const matPaver = isSub ? state.subPaverRows || [] : ihPaver
  const matConc = isSub ? state.subConcRows || [] : ihConc

  // ── Labor (In-House rows only) ───────────────────────────────────────────
  let laborHrs = 0
  ihPaver.forEach(r => {
    laborHrs += paverRowCalc(r, lr, materialRows).hrs
  })
  ihConc.forEach(r => {
    laborHrs += concRowCalc(r, lr, mr).hrs
  })

  // ── Material (active tab rows) ───────────────────────────────────────────
  let paverMat = 0
  let pallets = 0
  const matPaverCalc = matPaver.map(r => {
    const c = paverRowCalc(r, lr, materialRows)
    paverMat += c.mat
    pallets += c.pallets
    return c
  })
  let concMat = 0
  const matConcCalc = matConc.map(r => {
    const c = concRowCalc(r, lr, mr)
    concMat += c.mat
    return c
  })

  // ── Manual entry ─────────────────────────────────────────────────────────
  const ihManual = state.manualRows || []
  const matManual = isSub ? state.subManualRows || [] : ihManual
  let manHrs = 0
  ihManual.forEach(r => {
    manHrs += n(r.hours)
  })
  const manMat = matManual.reduce((s, r) => s + n(r.materials), 0)
  const manSub = [...(state.manualRows || []), ...(state.subManualRows || [])].reduce(
    (s, r) => s + n(r.subCost),
    0
  )

  const baseHrs = laborHrs + manHrs
  const diffMod = 1 + n(state.difficulty) / 100
  const _preWalkHrs = baseHrs * diffMod + n(state.hoursAdj)
  const walkHrs = calcWalkAccessLabor(_preWalkHrs, state.distanceLF, { paceLfPerMin: _pace })
  const totalHrs = _preWalkHrs + walkHrs
  const manDays = totalHrs / 8
  const totalMat = paverMat + concMat + manMat

  const laborCost = totalHrs * (n(lrph) || DEFAULTS.laborRatePerHour)
  const burden = laborCost * (n(laborBurdenPct) || DEFAULTS.laborBurdenPct)
  const gp = manDays * gpmd
  const subCost = manSub
  const subGp = subCost * subGpMarkupRate
  const commission = (gp + subGp) * DEFAULTS.commissionRate
  const price = totalMat + laborCost + burden + gp + subCost + subGp + commission

  return {
    walkHrs,
    totalHrs,
    manDays,
    totalMat,
    laborCost,
    burden,
    gp,
    subGp,
    commission,
    subCost,
    price,
    paverMat,
    concMat,
    manMat,
    pallets,
    matPaverCalc,
    matConcCalc,
    isSub,
  }
}

// ── Edit-Rates modal (Concrete Type/Finish/Form + Paver Form) ────────────────
async function upsertRate(table, name, field, value) {
  const v = Number(value)
  const val = Number.isFinite(v) ? v : 0
  const { data: up } = await supabase
    .from(table)
    .update({ [field]: val })
    .eq('name', name)
    .eq('category', 'Steps')
    .select('id')
  if (up && up.length) return
  const { data: any } = await supabase.from(table).select('id').eq('name', name).limit(1)
  if (any && any.length) {
    await supabase.from(table).update({ [field]: val, category: 'Steps' }).eq('id', any[0].id)
  } else {
    await supabase.from(table).insert({ name, category: 'Steps', [field]: val })
  }
}

function StepsRatesModal({ open, onClose, onSaved }) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [draft, setDraft] = useState({})

  useEffect(() => {
    if (!open) return
    let gone = false
    setLoading(true)
    Promise.all([
      supabase.from('labor_rates').select('name, rate').eq('category', 'Steps'),
      supabase.from('material_rates').select('name, unit_cost').eq('category', 'Steps'),
    ]).then(([lrRes, mrRes]) => {
      if (gone) return
      const lr = {}
      ;(lrRes.data || []).forEach(r => {
        lr[r.name] = parseFloat(r.rate)
      })
      const mr = {}
      ;(mrRes.data || []).forEach(r => {
        mr[r.name] = parseFloat(r.unit_cost)
      })
      const d = { paverForm: {}, typeHrs: {}, typeMat: {}, finHrs: {}, finMat: {}, concForm: {} }
      STEP_FORMS.forEach(f => {
        d.paverForm[f] = lr[kPaverForm(f)] ?? PAVER_FORM_DEFAULT[f]
        d.concForm[f] = lr[kConcForm(f)] ?? 1
      })
      CONC_TYPES.forEach(t => {
        d.typeHrs[t] = lr[kConcTypeHrs(t)] ?? 0
        d.typeMat[t] = mr[kConcTypeMat(t)] ?? 0
      })
      CONC_FINISHES.forEach(f => {
        d.finHrs[f] = lr[kFinishHrs(f)] ?? 0
        d.finMat[f] = mr[kFinishMat(f)] ?? 0
      })
      setDraft(d)
      setLoading(false)
    })
    return () => {
      gone = true
    }
  }, [open])

  if (!open) return null

  const setD = (group, key, val) =>
    setDraft(p => ({ ...p, [group]: { ...p[group], [key]: val } }))

  async function saveAll() {
    setSaving(true)
    const jobs = []
    STEP_FORMS.forEach(f => {
      jobs.push(upsertRate('labor_rates', kPaverForm(f), 'rate', draft.paverForm[f]))
      jobs.push(upsertRate('labor_rates', kConcForm(f), 'rate', draft.concForm[f]))
    })
    CONC_TYPES.forEach(t => {
      jobs.push(upsertRate('labor_rates', kConcTypeHrs(t), 'rate', draft.typeHrs[t]))
      jobs.push(upsertRate('material_rates', kConcTypeMat(t), 'unit_cost', draft.typeMat[t]))
    })
    CONC_FINISHES.forEach(f => {
      jobs.push(upsertRate('labor_rates', kFinishHrs(f), 'rate', draft.finHrs[f]))
      jobs.push(upsertRate('material_rates', kFinishMat(f), 'unit_cost', draft.finMat[f]))
    })
    await Promise.all(jobs)
    setSaving(false)
    if (onSaved) await onSaved()
    onClose()
  }

  const numCell = (group, key) => (
    <input
      type="number"
      step="any"
      value={draft[group]?.[key] ?? ''}
      onChange={e => setD(group, key, e.target.value)}
      className="w-20 border border-gray-200 rounded px-1.5 py-1 text-xs text-right"
    />
  )

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm px-4"
      onMouseDown={e => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className="bg-white border border-gray-200 rounded-xl shadow-2xl w-full max-w-2xl p-5 relative max-h-[88vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">
              Master Rates → Steps
            </p>
            <p className="text-base font-semibold text-gray-900">Step Labor & Material Modifiers</p>
            <p className="text-xs text-gray-500 mt-0.5">
              All values save to master Steps rates. Zero is fine to start.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-300 hover:text-gray-600 text-xl leading-none p-1 -mt-1"
          >
            ×
          </button>
        </div>

        {loading ? (
          <p className="text-sm text-gray-400 py-6 text-center">Loading current rates…</p>
        ) : (
          <div className="space-y-5">
            {/* Paver Form labor */}
            <div>
              <p className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">
                Paver Steps — Form Labor (LF/hr)
              </p>
              <div className="flex gap-6">
                {STEP_FORMS.map(f => (
                  <label key={f} className="flex items-center gap-2 text-xs text-gray-700">
                    {f}
                    {numCell('paverForm', f)}
                  </label>
                ))}
              </div>
            </div>

            {/* Concrete Type */}
            <div>
              <p className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">
                Concrete Type
              </p>
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-gray-400 border-b border-gray-200">
                    <th className="text-left pb-1 font-medium">Type</th>
                    <th className="text-right pb-1 font-medium">Labor (hrs/SF)</th>
                    <th className="text-right pb-1 font-medium">Material ($/SF)</th>
                  </tr>
                </thead>
                <tbody>
                  {CONC_TYPES.map(t => (
                    <tr key={t} className="border-b border-gray-50">
                      <td className="py-1 text-gray-700">{t}</td>
                      <td className="py-1 text-right">{numCell('typeHrs', t)}</td>
                      <td className="py-1 text-right">{numCell('typeMat', t)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Finish modifiers */}
            <div>
              <p className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">
                Finish (added to Type)
              </p>
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-gray-400 border-b border-gray-200">
                    <th className="text-left pb-1 font-medium">Finish</th>
                    <th className="text-right pb-1 font-medium">+Labor (hrs/SF)</th>
                    <th className="text-right pb-1 font-medium">+Material ($/SF)</th>
                  </tr>
                </thead>
                <tbody>
                  {CONC_FINISHES.map(f => (
                    <tr key={f} className="border-b border-gray-50">
                      <td className="py-1 text-gray-700">{f}</td>
                      <td className="py-1 text-right">{numCell('finHrs', f)}</td>
                      <td className="py-1 text-right">{numCell('finMat', f)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Concrete Form multiplier */}
            <div>
              <p className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">
                Concrete — Form Labor Multiplier (×)
              </p>
              <div className="flex gap-6">
                {STEP_FORMS.map(f => (
                  <label key={f} className="flex items-center gap-2 text-xs text-gray-700">
                    {f}
                    {numCell('concForm', f)}
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="flex gap-2 mt-6">
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={saveAll}
            disabled={saving || loading}
            className="flex-1 py-2 rounded-lg bg-green-700 text-white text-sm font-semibold hover:bg-green-800 disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save Rates'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

// ── UI helpers ────────────────────────────────────────────────────────────────
function SectionHeader({ title, sub, right }) {
  return (
    <div className="bg-gray-50 rounded-lg px-4 py-2.5 border border-gray-200 mb-2 flex items-center justify-between gap-2">
      <h3 className="text-xs font-bold text-gray-600 uppercase tracking-wider">
        {title}
        {sub && <span className="ml-2 font-normal normal-case text-gray-400">{sub}</span>}
      </h3>
      {right}
    </div>
  )
}

function NumInput({ value, onChange, placeholder = '0', className = '' }) {
  return (
    <input
      type="number"
      step="any"
      className={`input text-sm py-1.5 ${className}`}
      placeholder={placeholder}
      value={value}
      onChange={e => onChange(e.target.value)}
    />
  )
}

const cellSel =
  'w-full border border-gray-200 rounded-md px-2 py-1.5 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-400'

const PAVER_ROW = () => ({ vendor: 'House', type: '', form: 'Straight', sf: '', grouted: false })
const CONC_ROW = () => ({ vendor: 'House', type: 'Standard', form: 'Straight', sf: '', finish: 'Smooth' })
const MANUAL_ROW = () => ({ label: '', hours: '', materials: '', subCost: '' })

const DEFAULT_PAVER_ROWS = [PAVER_ROW(), PAVER_ROW(), PAVER_ROW()]
const DEFAULT_CONC_ROWS = [CONC_ROW(), CONC_ROW(), CONC_ROW()]
const DEFAULT_MANUAL_ROWS = [
  { label: 'Misc 1', hours: '', materials: '', subCost: '' },
  { label: 'Misc 2', hours: '', materials: '', subCost: '' },
  { label: 'Misc 3', hours: '', materials: '', subCost: '' },
]

// ── Main component ────────────────────────────────────────────────────────────
export default function StepsModule({ onSave, onBack, saving, initialData }) {
  const [laborRatePerHour, setLaborRatePerHour] = useState(
    initialData?.laborRatePerHour ?? DEFAULTS.laborRatePerHour
  )
  const [laborBurdenPct, setLaborBurdenPct] = useState(
    initialData?.laborBurdenPct ?? DEFAULTS.laborBurdenPct
  )

  const [notes, setNotes] = useState(initialData?.notes ?? '')
  const [distanceLF, setDistanceLF] = useState(initialData?.distanceLF ?? '')
  const [walkAccess] = useState(
    initialData?.walkAccess ?? { paceLfPerMin: DEFAULT_WALK_ACCESS_PACE_LF_PER_MIN }
  )
  const [laborRates, setLaborRates] = useState(initialData?.laborRates || {})
  const [materialRates, setMaterialRates] = useState(initialData?.materialRates || {})
  const [materialRows, setMaterialRows] = useState(initialData?.materialRows || [])
  const [vendors, setVendors] = useState([])
  const [loading, setLoading] = useState(true)
  const [ratesModalOpen, setRatesModalOpen] = useState(false)

  const refreshAllRates = useCallback(async () => {
    const [lrRes, mrRes, matRowsRes, venRes] = await Promise.all([
      supabase.from('labor_rates').select('name, rate').eq('category', 'Steps'),
      supabase.from('material_rates').select('name, unit_cost').eq('category', 'Steps'),
      supabase
        .from('material_rates')
        .select('name, unit_cost, subcategory, vendor_id, sf_per_pallet')
        .eq('category', 'Paver'),
      supabase
        .from('subs_vendors')
        .select('id, company_name, supplied_categories')
        .eq('type', 'vendor')
        .order('company_name'),
    ])
    if (lrRes.data) {
      const m = {}
      lrRes.data.forEach(r => {
        m[r.name] = parseFloat(r.rate)
      })
      setLaborRates(m)
    }
    if (mrRes.data) {
      const m = {}
      mrRes.data.forEach(r => {
        m[r.name] = parseFloat(r.unit_cost)
      })
      setMaterialRates(m)
    }
    setMaterialRows(matRowsRes.data || [])
    setVendors(
      (venRes.data || []).map(v => ({
        id: v.id,
        name: v.company_name,
        categories: v.supplied_categories || [],
      }))
    )
  }, [])

  useEffect(() => {
    let gone = false
    Promise.all([
      !initialData?.laborRatePerHour &&
        supabase
          .from('company_settings')
          .select('labor_rate_per_hour, labor_burden_pct, walk_access_pace_lf_per_min')
          .single()
          .then(({ data }) => {
            if (!gone && data?.labor_rate_per_hour != null)
              setLaborRatePerHour(parseFloat(data.labor_rate_per_hour) || DEFAULTS.laborRatePerHour)
            if (!gone && data?.labor_burden_pct != null)
              setLaborBurdenPct(parseFloat(data.labor_burden_pct))
          }),
      refreshAllRates(),
    ]).then(() => {
      if (!gone) setLoading(false)
    })
    return () => {
      gone = true
    }
  }, [refreshAllRates])

  const gpmd = initialData?.gpmd ?? DEFAULTS.gpmd
  const subGpMarkupRate = initialData?.subGpMarkupRate ?? 0.2

  // ── State ──────────────────────────────────────────────────────────────────
  const [difficulty, setDifficulty] = useState(initialData?.difficulty ?? '')
  const [crewType, setCrewType] = useState(initialData?.crewType ?? 'Masonry')
  const [subType, setSubType] = useState(initialData?.subType ?? 'In-House')
  const [hoursAdj, setHoursAdj] = useState(initialData?.hoursAdj ?? '')

  const [paverRows, setPaverRows] = useState(initialData?.paverRows ?? DEFAULT_PAVER_ROWS)
  const [subPaverRows, setSubPaverRows] = useState(initialData?.subPaverRows ?? DEFAULT_PAVER_ROWS)
  const [concRows, setConcRows] = useState(initialData?.concRows ?? DEFAULT_CONC_ROWS)
  const [subConcRows, setSubConcRows] = useState(initialData?.subConcRows ?? DEFAULT_CONC_ROWS)
  const [manualRows, setManualRows] = useState(initialData?.manualRows ?? DEFAULT_MANUAL_ROWS)
  const [subManualRows, setSubManualRows] = useState(
    initialData?.subManualRows ?? [MANUAL_ROW(), MANUAL_ROW()]
  )

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

  const isSub = subType === 'Subcontractor'

  const state = {
    crewType,
    subType,
    difficulty,
    hoursAdj,
    paverRows,
    subPaverRows,
    concRows,
    subConcRows,
    manualRows,
    subManualRows,
    distanceLF,
  }

  const calcRaw = calcSteps(
    state,
    laborRatePerHour,
    laborRates,
    materialRates,
    materialRows,
    gpmd,
    walkAccess,
    laborBurdenPct,
    subGpMarkupRate
  )
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

  // ── Active-tab row accessors ─────────────────────────────────────────────
  const curPaver = isSub ? subPaverRows : paverRows
  const setCurPaver = isSub ? setSubPaverRows : setPaverRows
  const curConc = isSub ? subConcRows : concRows
  const setCurConc = isSub ? setSubConcRows : setConcRows
  const curManual = isSub ? subManualRows : manualRows
  const setCurManual = isSub ? setSubManualRows : setManualRows

  const setPaverRow = (i, field, val) =>
    setCurPaver(rows => rows.map((r, idx) => (idx === i ? { ...r, [field]: val } : r)))
  const setConcRow = (i, field, val) =>
    setCurConc(rows => rows.map((r, idx) => (idx === i ? { ...r, [field]: val } : r)))
  const setManual = (i, field, val) =>
    setCurManual(rows => rows.map((r, idx) => (idx === i ? { ...r, [field]: val } : r)))

  const vendorsForCategory = cat => vendors.filter(v => (v.categories || []).includes(cat))

  function handleSave() {
    onSave({
      notes,
      man_days: parseFloat(calc.manDays.toFixed(2)),
      material_cost: parseFloat(calc.totalMat.toFixed(2)),
      data: {
        ...state,
        walkAccess,
        laborRatePerHour,
        laborBurdenPct,
        gpmd,
        subGpMarkupRate,
        laborRates,
        materialRates,
        materialRows,
        calc,
      },
    })
  }

  return (
    <div className="space-y-5">
      {/* ── Sticky GPMD bar ── */}
      <div className="sticky top-0 z-20 -mx-6 px-6 pt-1 pb-1 bg-gray-900 shadow-lg">
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

      {loading && (
        <div className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2">Loading rates…</div>
      )}

      {/* Settings — In-House tab only */}
      {!isSub && (
        <>
          <SectionHeader title="Job Site Conditions" />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <p className="text-xs text-gray-500 mb-0.5">Difficulty (%)</p>
              <NumInput value={difficulty} onChange={setDifficulty} placeholder="0" />
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-0.5" title="Average Distance from Truck to Work Area">
                Truck → Work Area (Avg LF)
              </p>
              <NumInput value={distanceLF} onChange={setDistanceLF} placeholder="0" />
              {calc.walkHrs > 0 && (
                <p className="text-[10px] text-gray-500 italic lowercase mt-0.5">
                  +{calc.walkHrs.toFixed(2)} hrs walk-access
                </p>
              )}
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-0.5">Hours Adj (±hrs)</p>
              <NumInput value={hoursAdj} onChange={setHoursAdj} placeholder="0" />
            </div>
          </div>
        </>
      )}

      {/* ── Paver Steps ── */}
      <div>
        <SectionHeader title="Paver Steps" sub="Vendor · Type · Form · SF · Grouted" />
        <table className="w-full text-xs">
          <thead>
            <tr className="text-gray-400 border-b border-gray-200">
              <th className="text-left pb-1 pr-2 font-medium w-40">Vendor</th>
              <th className="text-left pb-1 pr-2 font-medium">Type</th>
              <th className="text-left pb-1 pr-2 font-medium w-24">Form</th>
              <th className="text-left pb-1 pr-2 font-medium w-20">SF</th>
              <th className="text-left pb-1 pr-2 font-medium w-24">Grouted?</th>
              <th className="text-right pb-1 pr-2 font-medium w-28">Hrs · Mat</th>
              <th className="w-6"></th>
            </tr>
          </thead>
          <tbody>
            {curPaver.map((row, i) => {
              const opts = paverOptions(PAVER_STEP_CAT, row.vendor, materialRows)
              const c = paverRowCalc(row, laborRates, materialRows)
              return (
                <tr key={i} className="border-b border-gray-50">
                  <td className="py-1 pr-2">
                    <select
                      className={cellSel}
                      value={row.vendor}
                      onChange={e => setPaverRow(i, 'vendor', e.target.value)}
                    >
                      <option value="House">House</option>
                      {vendorsForCategory(PAVER_STEP_CAT).map(v => (
                        <option key={v.id} value={v.id}>
                          {v.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="py-1 pr-2">
                    <select
                      className={cellSel}
                      value={row.type}
                      onChange={e => setPaverRow(i, 'type', e.target.value)}
                      disabled={!opts.length}
                    >
                      <option value="">{opts.length ? '— Type —' : 'Pick vendor first'}</option>
                      {opts.map(o => (
                        <option key={o.label} value={o.label}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="py-1 pr-2">
                    <select
                      className={cellSel}
                      value={row.form}
                      onChange={e => setPaverRow(i, 'form', e.target.value)}
                    >
                      {STEP_FORMS.map(f => (
                        <option key={f} value={f}>
                          {f}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="py-1 pr-2">
                    <NumInput value={row.sf} onChange={v => setPaverRow(i, 'sf', v)} />
                  </td>
                  <td className="py-1 pr-2">
                    <select
                      className={cellSel}
                      value={row.grouted ? 'Yes' : 'No'}
                      onChange={e => setPaverRow(i, 'grouted', e.target.value === 'Yes')}
                    >
                      <option value="No">No</option>
                      <option value="Yes">Yes</option>
                    </select>
                  </td>
                  <td className="py-1 pr-2 text-right text-gray-400 whitespace-nowrap">
                    {c.hrs > 0 ? `${c.hrs.toFixed(1)}h` : '—'}
                    {c.mat > 0 ? ` · ${fmt2(c.mat)}` : ''}
                    {c.pallets > 0 ? ` · ${c.pallets}p` : ''}
                  </td>
                  <td className="py-1 text-center">
                    {curPaver.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setCurPaver(rows => rows.filter((_, idx) => idx !== i))}
                        className="text-gray-300 hover:text-red-500"
                        title="Remove row"
                      >
                        ×
                      </button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        <button
          type="button"
          onClick={() => setCurPaver(rows => [...rows, PAVER_ROW()])}
          className="mt-2 text-xs px-2 py-1 rounded bg-slate-100 text-slate-700 hover:bg-slate-200"
        >
          + Add paver step
        </button>
      </div>

      {/* ── Concrete Steps ── */}
      <div>
        <SectionHeader
          title="Concrete Steps"
          sub="Vendor · Type · Form · SF · Finish"
          right={
            <button
              type="button"
              onClick={() => setRatesModalOpen(true)}
              className="text-xs px-2.5 py-1 rounded border border-green-300 bg-green-50 text-green-700 font-semibold hover:bg-green-100 whitespace-nowrap"
            >
              Edit Rates
            </button>
          }
        />
        <table className="w-full text-xs">
          <thead>
            <tr className="text-gray-400 border-b border-gray-200">
              <th className="text-left pb-1 pr-2 font-medium w-40">Vendor</th>
              <th className="text-left pb-1 pr-2 font-medium">Type</th>
              <th className="text-left pb-1 pr-2 font-medium w-24">Form</th>
              <th className="text-left pb-1 pr-2 font-medium w-20">SF</th>
              <th className="text-left pb-1 pr-2 font-medium">Finish</th>
              <th className="text-right pb-1 pr-2 font-medium w-28">Hrs · Mat</th>
              <th className="w-6"></th>
            </tr>
          </thead>
          <tbody>
            {curConc.map((row, i) => {
              const c = concRowCalc(row, laborRates, materialRates)
              return (
                <tr key={i} className="border-b border-gray-50">
                  <td className="py-1 pr-2">
                    <select
                      className={cellSel}
                      value={row.vendor}
                      onChange={e => setConcRow(i, 'vendor', e.target.value)}
                    >
                      <option value="House">House</option>
                      {vendorsForCategory(CONC_VENDOR_CAT).map(v => (
                        <option key={v.id} value={v.id}>
                          {v.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="py-1 pr-2">
                    <select
                      className={cellSel}
                      value={row.type}
                      onChange={e => setConcRow(i, 'type', e.target.value)}
                    >
                      {CONC_TYPES.map(t => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="py-1 pr-2">
                    <select
                      className={cellSel}
                      value={row.form}
                      onChange={e => setConcRow(i, 'form', e.target.value)}
                    >
                      {STEP_FORMS.map(f => (
                        <option key={f} value={f}>
                          {f}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="py-1 pr-2">
                    <NumInput value={row.sf} onChange={v => setConcRow(i, 'sf', v)} />
                  </td>
                  <td className="py-1 pr-2">
                    <select
                      className={cellSel}
                      value={row.finish}
                      onChange={e => setConcRow(i, 'finish', e.target.value)}
                    >
                      {CONC_FINISHES.map(f => (
                        <option key={f} value={f}>
                          {f}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="py-1 pr-2 text-right text-gray-400 whitespace-nowrap">
                    {c.hrs > 0 ? `${c.hrs.toFixed(1)}h` : '—'}
                    {c.mat > 0 ? ` · ${fmt2(c.mat)}` : ''}
                  </td>
                  <td className="py-1 text-center">
                    {curConc.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setCurConc(rows => rows.filter((_, idx) => idx !== i))}
                        className="text-gray-300 hover:text-red-500"
                        title="Remove row"
                      >
                        ×
                      </button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        <button
          type="button"
          onClick={() => setCurConc(rows => [...rows, CONC_ROW()])}
          className="mt-2 text-xs px-2 py-1 rounded bg-slate-100 text-slate-700 hover:bg-slate-200"
        >
          + Add concrete step
        </button>
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
            {curManual.map((row, i) => (
              <tr key={i} className="border-b border-gray-100">
                <td className="py-1 pr-2">
                  <input
                    className="input text-sm py-1"
                    value={row.label}
                    onChange={e => setManual(i, 'label', e.target.value)}
                  />
                </td>
                <td className="py-1 pr-2">
                  <NumInput value={row.hours} onChange={v => setManual(i, 'hours', v)} />
                </td>
                <td className="py-1 pr-2">
                  <NumInput value={row.materials} onChange={v => setManual(i, 'materials', v)} />
                </td>
                <td className="py-1">
                  <NumInput value={row.subCost} onChange={v => setManual(i, 'subCost', v)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <button
          type="button"
          onClick={() => setCurManual(rows => [...rows, MANUAL_ROW()])}
          className="mt-2 text-xs px-2 py-1 rounded bg-slate-100 text-slate-700 hover:bg-slate-200"
        >
          + Add manual entry
        </button>
      </div>

      {/* ── Materials Breakdown (per-tab, independent) ── */}
      {calc.totalMat > 0 && (
        <div className="bg-gray-50 rounded-lg p-3 text-xs">
          <p className="font-semibold text-gray-600 uppercase tracking-wide text-xs mb-2">
            {isSub ? 'Sub' : 'In House'} Materials Breakdown
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1 text-gray-600">
            {calc.paverMat > 0 && (
              <span>
                Paver Material: <strong>{fmt2(calc.paverMat)}</strong>
                {calc.pallets > 0 ? ` (${calc.pallets}p)` : ''}
              </span>
            )}
            {calc.concMat > 0 && (
              <span>
                Concrete Material: <strong>{fmt2(calc.concMat)}</strong>
              </span>
            )}
            {calc.manMat > 0 && (
              <span>
                Manual: <strong>{fmt2(calc.manMat)}</strong>
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

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <button onClick={onBack} className="btn-secondary flex-1">
          ← Back
        </button>
        <button onClick={handleSave} disabled={saving} className="btn-primary flex-1">
          {saving ? 'Saving...' : 'Add Module'}
        </button>
      </div>

      <StepsRatesModal
        open={ratesModalOpen}
        onClose={() => setRatesModalOpen(false)}
        onSaved={refreshAllRates}
      />
    </div>
  )
}
