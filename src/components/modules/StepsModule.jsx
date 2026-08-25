import WorkTypeChooser from './WorkTypeChooser'
import CrewTypeBar from './CrewTypeBar'
import ModuleHeaderSlot from './ModuleHeaderSlot'
import { useState, useEffect, useCallback, useContext } from 'react'
import { SubTabContext, subSectionTitle } from './subTabContext'
import { createPortal } from 'react-dom'
import { supabase } from '../../lib/supabase'
import GpmdBar from './GpmdBar'
import { fetchSalesTaxRate } from '../../lib/companyDefaults'
import { calcWalkAccessLabor, DEFAULT_WALK_ACCESS_PACE_LF_PER_MIN } from '../../lib/walkAccess'
import { calcSteps } from './stepsCalc'
import UnpricedItemModal from '../UnpricedItemModal'
import {
  fetchPriceLedgerAsOf,
  ledgerPrice,
  catalogOptions,
  catalogItemFor,
  fetchModuleCatalog,
  fetchStandardRateMap,
  saveStandardNamedRate,
  fetchLaborRateMap,
} from '../../lib/materialCatalog'

// One-picker scheme (matches Concrete/Turf): Standard sources the null-vendor
// catalog rows (and prices against them); an unset vendor shows nothing.
const CATALOG_OPTS = { standardRows: 'null-vendor', stripPrefix: true }

// ─────────────────────────────────────────────────────────────────────────────
// Steps Module
//
// Two row-based sections, each replicated on the In-House and Sub tabs with
// their OWN rows so every tab is an independent calculator:
//
//   Paver Steps — Vendor · Type · Form · SF · Grouted?
//     Vendor + Type come from the shared Paver Material catalog (subs_vendors +
//     material_rates, category='Paver', sub_category='Paver Material'), same as
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

const n = v => parseFloat(v) || 0
const fmt2 = v => `$${(n(v)).toFixed(2)}`

const PAVER_STEP_CAT = 'Paver Material' // shared Paver catalog sub_category
const CONC_VENDOR_CAT = 'Concrete Mix' // catalog sub_category for concrete vendors
const STEP_FORMS = ['Straight', 'Curved']
const CONC_TYPES = ['Standard', 'Standard Colored', 'Cantilevered', 'Cantilevered Colored']
// Colored only affects material, not labor — so LABOR is keyed by the base type
// (Standard / Cantilevered). This keeps the View Rates labor list free of the
// duplicate "… Colored Labor" lines.
const CONC_BASE_TYPES = ['Standard', 'Cantilevered']
const concBaseType = t => (t || '').replace(/\s*Colored$/i, '')
const CONC_FINISHES = ['Smooth', 'Broom', 'Sanded', 'Salted', 'Exposed Aggregate']

// ── Rate-key builders (category 'Steps') ─────────────────────────────────────
const kPaverForm = form => `Steps - ${form}` // labor hrs per Ln Ft (Paver/Flagstone share)
const kBrickForm = form => `Steps - Brick ${form}` // Brick step labor, hrs per Ln Ft (base 1.5)
const kTileForm = form => `Steps - Tile ${form}` // Tiled step labor, hrs per Ln Ft (base 3)
const kConcTypeHrs = t => `Steps - Conc ${t} Hrs per Sq Ft` // labor hrs per Sq Ft
const kConcTypeMat = t => `Steps - Conc ${t} $ per Sq Ft` // material $ per Sq Ft
const kFinishHrs = f => `Steps - Finish ${f} Hrs per Sq Ft` // labor +hrs per Sq Ft
const kFinishMat = f => `Steps - Finish ${f} $ per Sq Ft` // material +$ per Sq Ft
const kConcForm = form => `Steps - Conc Form ${form}` // labor multiplier

// Subcontractor pricing is UNIT priced per linear foot — no hourly labor. A
// base $/LF for paver + concrete steps, plus per-LF modifiers that add to the
// base. All stored in material_rates (category 'Steps').
const kSubPaverBase = 'Steps - Sub Paver Base' // $/LF
const kSubConcBase = 'Steps - Sub Conc Base' // $/LF
const kSubForm = form => `Steps - Sub Form ${form}` // +$ per Ln Ft
const kSubGrouted = 'Steps - Sub Grouted' // +$/LF (paver, when grouted)
const kSubType = t => `Steps - Sub Type ${t}` // +$ per Ln Ft (concrete type)
const kSubFinish = f => `Steps - Sub Finish ${f}` // +$ per Ln Ft (concrete finish)

// No hardcoded rate fallbacks — every labor coefficient / $/LF base is read live
// from the rate tables (labor_rates + misc_rates via fetchStandardRateMap). A
// missing rate contributes 0 until seeded in Master Rates.

// Vendor/Type step sections. Each pulls Type options from its own material
// catalog sub_category (subs_vendors + material_rates). Shape mirrors Paver
// Steps: Vendor · Type · Form · SF · Grouted?.
const MAT_SECTIONS = [
  { key: 'paver', title: 'Paver Steps', matWord: 'Paver', cat: 'Paver Material', rowsKey: 'paverRows', subKey: 'subPaverRows', baseKey: kSubPaverBase, formKey: kPaverForm },
  { key: 'brick', title: 'Brick Steps', matWord: 'Brick', cat: 'Brick', rowsKey: 'brickRows', subKey: 'subBrickRows', baseKey: 'Steps - Sub Brick Base', formKey: kBrickForm },
  { key: 'tile', title: 'Tiled Steps', matWord: 'Tile', cat: 'Tile', rowsKey: 'tileRows', subKey: 'subTileRows', baseKey: 'Steps - Sub Tile Base', formKey: kTileForm },
  { key: 'flag', title: 'Flagstone Steps', matWord: 'Flagstone', cat: 'Flagstone', rowsKey: 'flagRows', subKey: 'subFlagRows', baseKey: 'Steps - Sub Flagstone Base', formKey: kPaverForm },
]

// ── Vendor-catalog helpers (mirror ConcreteModule.sectionOptions) ────────────
// Vendor-first: an unset vendor yields no options (empty placeholder); an
// explicit 'Standard' sources the null-vendor catalog rows; a real vendor its
// own. Options + price both come from the same catalog record — no name fallback.
function paverOptions(cat, vendorSel, materialRows) {
  if (!vendorSel || vendorSel === 'auto') return []
  const isStd = vendorSel === 'Standard'
  return catalogOptions(materialRows, cat, isStd ? 'Standard' : vendorSel, CATALOG_OPTS)
}
function paverItemFor(cat, vendorSel, typeLabel, materialRows) {
  if (!vendorSel || vendorSel === 'auto') return null
  const isStd = vendorSel === 'Standard'
  return catalogItemFor(materialRows, cat, isStd ? 'Standard' : vendorSel, typeLabel, CATALOG_OPTS)
}

// ── Per-row calculators ──────────────────────────────────────────────────────
// Shared by every Vendor/Type step section (Paver/Brick/Tile/Flagstone); `cat`
// selects which material catalog sub_category the Type options come from.
function matStepRowCalc(r, laborRates, materialRows, cat = PAVER_STEP_CAT, priceOf = item => n(item?.unit_cost), formKey = kPaverForm) {
  // Unselected step (no material Type) contributes nothing (no crash, no fallback).
  if (!r.type) return { sf: n(r.sf), hrs: 0, mat: 0, price: 0, pallets: 0 }
  const sf = n(r.sf)
  // hrs-per-unit: rate is hours per Ln Ft (was LF/hr; standardized 2026-08-18).
  // formKey selects the labor rate family: Paver/Flagstone share 'Steps - <form>';
  // Brick/Tile have their own per-form rates ('Steps - Brick/Tile <form>').
  const rate = n(laborRates[formKey(r.form)])
  const hrs = sf * rate
  let price = 0
  let sfPerPallet = 0
  // Standard resolves to the item's null-vendor catalog price; a real vendor to
  // its own. paverItemFor returns null for an unset vendor, so no hidden $0.
  const item = paverItemFor(cat, r.vendor, r.type, materialRows)
  if (item) {
    price = priceOf(item)
    sfPerPallet = n(item.sf_per_pallet)
  }
  const mat = sf * price
  const pallets = sf > 0 && sfPerPallet > 0 ? Math.ceil(sf / sfPerPallet) : 0
  return { sf, hrs, mat, price, pallets }
}

function concRowCalc(r, laborRates, materialRates) {
  // Unselected concrete step (no Type) contributes nothing (no crash, no fallback).
  if (!r.type) return { lf: n(r.sf), hrs: 0, mat: 0 }
  // Quantity is linear feet; every rate is per Ln Ft. Labor is keyed by the base
  // type (color only changes material), so it stays a single per-type rate.
  const lf = n(r.sf)
  const typeHrs = n(laborRates[kConcTypeHrs(concBaseType(r.type))])
  const finishHrs = n(laborRates[kFinishHrs(r.finish)])
  const formMult = n(laborRates[kConcForm(r.form)])
  const hrs = lf * (typeHrs + finishHrs) * formMult
  const typeMat = n(materialRates[kConcTypeMat(r.type)])
  const finishMat = n(materialRates[kFinishMat(r.finish)])
  const mat = lf * (typeMat + finishMat)
  return { lf, hrs, mat }
}

// Sub rows are unit priced per LF: rate = base + applicable per-LF modifiers.
// On the Sub tab the row quantity field represents linear feet.
function matStepSubRowCalc(r, mr, baseKey = kSubPaverBase) {
  // Unselected step (no material Type) contributes nothing.
  if (!r.type) return { lf: n(r.sf), rate: 0, cost: 0 }
  const lf = n(r.sf)
  const base = n(mr[baseKey])
  const form = n(mr[kSubForm(r.form)])
  const grouted = r.grouted ? n(mr[kSubGrouted]) : 0
  const rate = base + form + grouted
  return { lf, rate, cost: lf * rate }
}
function concSubRowCalc(r, mr) {
  // Unselected concrete step (no Type) contributes nothing.
  if (!r.type) return { lf: n(r.sf), rate: 0, cost: 0 }
  const lf = n(r.sf)
  const base = n(mr[kSubConcBase])
  const form = n(mr[kSubForm(r.form)])
  const type = n(mr[kSubType(r.type)])
  const finish = n(mr[kSubFinish(r.finish)])
  const rate = base + form + type + finish
  return { lf, rate, cost: lf * rate }
}

// ── Calculation engine ────────────────────────────────────────────────────────

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

function StepsRatesModal({ open, onClose, onSaved, isSub = false }) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [draft, setDraft] = useState({})

  useEffect(() => {
    if (!open) return
    let gone = false
    setLoading(true)
    Promise.all([
      supabase.from('labor_rates').select('name, rate').eq('category', 'Steps'),
      fetchStandardRateMap(['Steps']),
    ]).then(([lrRes, mr]) => {
      if (gone) return
      const lr = {}
      ;(lrRes.data || []).forEach(r => {
        lr[r.name] = parseFloat(r.rate)
      })
      const d = {
        paverForm: {},
        typeHrs: {},
        typeMat: {},
        finHrs: {},
        finMat: {},
        concForm: {},
        subBase: {},
        subForm: {},
        subType: {},
        subFinish: {},
        subGrouted: mr[kSubGrouted],
      }
      STEP_FORMS.forEach(f => {
        d.paverForm[f] = lr[kPaverForm(f)]
        d.concForm[f] = lr[kConcForm(f)]
        d.subForm[f] = mr[kSubForm(f)]
      })
      CONC_TYPES.forEach(t => {
        d.typeHrs[t] = lr[kConcTypeHrs(t)]
        d.typeMat[t] = mr[kConcTypeMat(t)]
        d.subType[t] = mr[kSubType(t)]
      })
      CONC_FINISHES.forEach(f => {
        d.finHrs[f] = lr[kFinishHrs(f)]
        d.finMat[f] = mr[kFinishMat(f)]
        d.subFinish[f] = mr[kSubFinish(f)]
      })
      MAT_SECTIONS.forEach(sec => {
        d.subBase[sec.key] = mr[sec.baseKey]
      })
      d.subBase.conc = mr[kSubConcBase]
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
      jobs.push(saveStandardNamedRate(kConcTypeMat(t), draft.typeMat[t], 'Steps'))
    })
    CONC_FINISHES.forEach(f => {
      jobs.push(upsertRate('labor_rates', kFinishHrs(f), 'rate', draft.finHrs[f]))
      jobs.push(saveStandardNamedRate(kFinishMat(f), draft.finMat[f], 'Steps'))
    })
    // Subcontractor per-LF rates → material Standard price on the new model.
    MAT_SECTIONS.forEach(sec => {
      jobs.push(saveStandardNamedRate(sec.baseKey, draft.subBase[sec.key], 'Steps'))
    })
    jobs.push(saveStandardNamedRate(kSubConcBase, draft.subBase.conc, 'Steps'))
    jobs.push(saveStandardNamedRate(kSubGrouted, draft.subGrouted, 'Steps'))
    STEP_FORMS.forEach(f => {
      jobs.push(saveStandardNamedRate(kSubForm(f), draft.subForm[f], 'Steps'))
    })
    CONC_TYPES.forEach(t => {
      jobs.push(saveStandardNamedRate(kSubType(t), draft.subType[t], 'Steps'))
    })
    CONC_FINISHES.forEach(f => {
      jobs.push(saveStandardNamedRate(kSubFinish(f), draft.subFinish[f], 'Steps'))
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
            <p className="text-base font-semibold text-gray-900">
              {isSub ? 'Subcontractor Step Pricing ($/LF)' : 'Step Labor & Material Modifiers'}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              {isSub
                ? 'Unit price per linear foot — base plus per-LF modifiers.'
                : 'All values save to master Steps rates. Zero is fine to start.'}
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
            {!isSub && (
              <>
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
                    <th className="text-right pb-1 font-medium">Labor (hrs per Ln Ft)</th>
                    <th className="text-right pb-1 font-medium">Material ($ per Ln Ft)</th>
                  </tr>
                </thead>
                <tbody>
                  {CONC_TYPES.map(t => (
                    <tr key={t} className="border-b border-gray-50">
                      <td className="py-1 text-gray-700">{t}</td>
                      {/* Labor is per base type (color = material only), so colored
                          rows inherit the base type's labor rather than duplicate it. */}
                      <td className="py-1 text-right">
                        {concBaseType(t) === t ? (
                          numCell('typeHrs', t)
                        ) : (
                          <span className="text-gray-300">= {concBaseType(t)}</span>
                        )}
                      </td>
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
                    <th className="text-right pb-1 font-medium">+Labor (hrs per Ln Ft)</th>
                    <th className="text-right pb-1 font-medium">+Material ($ per Ln Ft)</th>
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
              </>
            )}

            {isSub && (
              <>
                <div>
                  <p className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">
                    Subcontractor — Base ($/LF)
                  </p>
                  <div className="flex gap-6 flex-wrap">
                    {MAT_SECTIONS.map(sec => (
                      <label
                        key={sec.key}
                        className="flex items-center gap-2 text-xs text-gray-700"
                      >
                        {sec.title.replace(' Steps', '')}
                        {numCell('subBase', sec.key)}
                      </label>
                    ))}
                    <label className="flex items-center gap-2 text-xs text-gray-700">
                      Concrete
                      {numCell('subBase', 'conc')}
                    </label>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">
                    Form Modifier (+$/LF)
                  </p>
                  <div className="flex gap-6 flex-wrap">
                    {STEP_FORMS.map(f => (
                      <label key={f} className="flex items-center gap-2 text-xs text-gray-700">
                        {f}
                        {numCell('subForm', f)}
                      </label>
                    ))}
                    <label className="flex items-center gap-2 text-xs text-gray-700">
                      Grouted (paver)
                      <input
                        type="number"
                        step="any"
                        value={draft.subGrouted ?? ''}
                        onChange={e => setDraft(p => ({ ...p, subGrouted: e.target.value }))}
                        className="w-20 border border-gray-200 rounded px-1.5 py-1 text-xs text-right"
                      />
                    </label>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">
                    Concrete Type Modifier (+$/LF)
                  </p>
                  <table className="w-full text-xs">
                    <tbody>
                      {CONC_TYPES.map(t => (
                        <tr key={t} className="border-b border-gray-50">
                          <td className="py-1 text-gray-700">{t}</td>
                          <td className="py-1 text-right">{numCell('subType', t)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div>
                  <p className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">
                    Concrete Finish Modifier (+$/LF)
                  </p>
                  <table className="w-full text-xs">
                    <tbody>
                      {CONC_FINISHES.map(f => (
                        <tr key={f} className="border-b border-gray-50">
                          <td className="py-1 text-gray-700">{f}</td>
                          <td className="py-1 text-right">{numCell('subFinish', f)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
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
function SectionHeader({ title, right }) {
  const isSub = useContext(SubTabContext)
  return (
    <div className="bg-gray-100 rounded-lg px-4 py-2.5 border border-gray-200 mb-2 flex items-center justify-between gap-2">
      <h3 className="text-xs font-bold text-gray-600 uppercase tracking-wider">
        {subSectionTitle(title, isSub)}
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

const PAVER_ROW = () => ({ vendor: '', type: '', form: 'Straight', sf: '', grouted: false })
const CONC_ROW = () => ({ vendor: '', type: '', form: 'Straight', sf: '', finish: 'Smooth' })
const MANUAL_ROW = () => ({ label: '', hours: '', materials: '', subCost: '' })

// Every step-material section starts with ONE blank row. Factories return a fresh
// array each call so In-House and Sub (and each section) never share a reference.
const DEFAULT_PAVER_ROWS = () => [PAVER_ROW()]
const DEFAULT_CONC_ROWS = () => [CONC_ROW()]

// Reusable Vendor · Type · Form · SF · Grouted step section (Paver / Brick /
// Tiled / Flagstone). Type options come from the given catalog sub_category.
function MaterialStepSection({
  title,
  matWord = 'Material',
  cat,
  baseKey,
  rows,
  setRows,
  isSub,
  materialRows,
  materialRates,
  laborRates,
  vendors,
  priceOf = item => n(item?.unit_cost),
  formKey = kPaverForm,
}) {
  const vForCat = vendors.filter(v => materialRows.some(r => r.vendor_id === v.id && (r.sub_category === cat || r.category === cat)))
  const setRow = (i, field, val) =>
    setRows(rs => rs.map((r, idx) => (idx === i ? { ...r, [field]: val } : r)))
  return (
    <div>
      <SectionHeader title={title} />
      <table className="w-full text-xs">
        <thead>
          <tr className="text-gray-400 border-b border-gray-200">
            <th className="text-center pb-1 pr-2 font-medium w-40">Vendor</th>
            <th className="text-center pb-1 pr-2 font-medium">{`${matWord} Type`}</th>
            <th className="text-center pb-1 pr-2 font-medium w-24">Form</th>
            <th className="text-center pb-1 pr-2 font-medium w-20">LF</th>
            <th className="text-center pb-1 pr-2 font-medium w-24">Grouted?</th>
            <th className="text-center pb-1 pr-2 font-medium w-28">{isSub ? 'Sub $' : 'Hrs · Mat'}</th>
            <th className="w-6"></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => {
            const opts = paverOptions(cat, row.vendor, materialRows)
            const c = matStepRowCalc(row, laborRates, materialRows, cat, priceOf, formKey)
            const sc = matStepSubRowCalc(row, materialRates, baseKey)
            return (
              <tr key={i} className="border-b border-gray-50">
                <td className="py-1 pr-2">
                  <select
                    className={cellSel}
                    value={row.vendor}
                    onChange={e => setRow(i, 'vendor', e.target.value)}
                  >
                    <option value="">Select</option>
                    <option value="Standard">Standard</option>
                    {vForCat.map(v => (
                      <option key={v.id} value={v.id}>
                        {v.name}
                      </option>
                    ))}
                    {row.vendor &&
                      row.vendor !== 'Standard' &&
                      !vForCat.some(v => String(v.id) === String(row.vendor)) && (
                        <option value={row.vendor}>
                          {vendors.find(v => String(v.id) === String(row.vendor))?.name ||
                            'Saved vendor'}
                        </option>
                      )}
                  </select>
                </td>
                <td className="py-1 pr-2">
                  <select
                    className={cellSel}
                    value={row.type}
                    onChange={e => setRow(i, 'type', e.target.value)}
                    disabled={!opts.length}
                  >
                    <option value="">{`Select ${matWord.toLowerCase()} type`}</option>
                    {row.type &&
                      !opts.some(o => (o.ref_key || o.id) === row.type || o.label === row.type) && (
                        <option value={row.type}>{row.type}</option>
                      )}
                    {opts.map(o => (
                      <option key={o.id} value={o.ref_key || o.id}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="py-1 pr-2">
                  <select
                    className={cellSel}
                    value={row.form}
                    onChange={e => setRow(i, 'form', e.target.value)}
                  >
                    {STEP_FORMS.map(f => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="py-1 pr-2">
                  <NumInput value={row.sf} onChange={v => setRow(i, 'sf', v)} className="text-center" />
                </td>
                <td className="py-1 pr-2">
                  <select
                    className={cellSel}
                    value={row.grouted ? 'Yes' : 'No'}
                    onChange={e => setRow(i, 'grouted', e.target.value === 'Yes')}
                  >
                    <option value="No">No</option>
                    <option value="Yes">Yes</option>
                  </select>
                </td>
                <td className="py-1 pr-2 text-center text-gray-400 whitespace-nowrap">
                  {isSub ? (
                    sc.cost > 0 ? (
                      fmt2(sc.cost)
                    ) : (
                      '—'
                    )
                  ) : (
                    <>
                      {c.hrs > 0 ? `${c.hrs.toFixed(1)}h` : '—'}
                      {c.mat > 0 ? ` · ${fmt2(c.mat)}` : ''}
                      {c.pallets > 0 ? ` · ${c.pallets}p` : ''}
                    </>
                  )}
                </td>
                <td className="py-1 text-center">
                  {rows.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setRows(rs => rs.filter((_, idx) => idx !== i))}
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
        onClick={() => setRows(rs => [...rs, PAVER_ROW()])}
        className="mt-2 text-xs text-green-700 hover:text-green-900 font-medium"
      >
        + Add row
      </button>
    </div>
  )
}
const DEFAULT_MANUAL_ROWS = [{ label: '', hours: '', materials: '', subCost: '' }]

// ── Main component ────────────────────────────────────────────────────────────
export default function StepsModule({ onSave, onBack, saving, initialData }) {
  const [laborRatePerHour, setLaborRatePerHour] = useState(
    initialData?.laborRatePerHour ?? null
  )
  const [laborBurdenPct, setLaborBurdenPct] = useState(
    initialData?.laborBurdenPct ?? null
  )

  const [notes, setNotes] = useState(initialData?.notes ?? '')
  const [distanceLF, setDistanceLF] = useState(initialData?.distanceLF ?? '')
  const [walkAccess] = useState(
    initialData?.walkAccess ?? { paceLfPerMin: DEFAULT_WALK_ACCESS_PACE_LF_PER_MIN }
  )
  const [laborRates, setLaborRates] = useState(initialData?.laborRates || {})
  const [materialRates, setMaterialRates] = useState(initialData?.materialRates || {})
  const [materialRows, setMaterialRows] = useState(initialData?.materialRows || [])
  const [ledger, setLedger] = useState({}) // Phase 4 per-vendor price ledger
  const [asOfDate, setAsOfDate] = useState('') // blank = current prices
  const [vendors, setVendors] = useState([])
  const [loading, setLoading] = useState(true)
  const [ratesModalOpen, setRatesModalOpen] = useState(false)

  const refreshAllRates = useCallback(async () => {
    // material_rates retired: base map (category 'Steps') from the new model;
    // catalog from the shared Paver + Concrete categories (Steps' pickers filter
    // on 'Paver Material' / 'Concrete Mix', both unchanged names).
    const [labMap, matMap, rows, venRes] = await Promise.all([
      fetchLaborRateMap(['Steps']),
      fetchStandardRateMap(['Steps']),
      // Basic Materials holds the shared Brick (moved from Walls) + Tile (moved
      // from Pool) step materials — matched by sub_category ('Brick' / 'Tile').
      fetchModuleCatalog(['Paver', 'Concrete', 'Basic Materials']),
      supabase
        .from('subs_vendors')
        .select('id, company_name')
        .eq('type', 'vendor')
        .order('company_name'),
    ])
    setLaborRates(labMap)
    setMaterialRates(matMap)
    setMaterialRows(rows || [])
    setVendors(
      (venRes.data || []).map(v => ({
        id: v.id,
        name: v.company_name,
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
              setLaborRatePerHour(parseFloat(data.labor_rate_per_hour))
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

  // (Re)load the price ledger whenever the catalog rows or the as-of date change.
  useEffect(() => {
    let alive = true
    fetchPriceLedgerAsOf(
      materialRows.map(r => r.id),
      asOfDate || null
    ).then(m => {
      if (alive) setLedger(m)
    })
    return () => {
      alive = false
    }
  }, [materialRows, asOfDate])

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

  const gpmd = initialData?.gpmd ?? gpmdDefault
  const subGpMarkupRate = initialData?.subGpMarkupRate ?? subGpMarkupRateDefault

  // ── State ──────────────────────────────────────────────────────────────────
  const [difficulty, setDifficulty] = useState(initialData?.difficulty ?? '')
  const [crewType, setCrewType] = useState(initialData?.crewType ?? 'Masonry')
  const [subType, setSubType] = useState(initialData?.subType ?? 'In-House')
  // Unpriced-labor fix-it modal target (mirrors Concrete's inline banner).
  const [unpricedItem, setUnpricedItem] = useState(null)
  const [hoursAdj, setHoursAdj] = useState(initialData?.hoursAdj ?? '')

  const [paverRows, setPaverRows] = useState(initialData?.paverRows ?? DEFAULT_PAVER_ROWS())
  const [subPaverRows, setSubPaverRows] = useState(initialData?.subPaverRows ?? DEFAULT_PAVER_ROWS())
  const [brickRows, setBrickRows] = useState(initialData?.brickRows ?? DEFAULT_PAVER_ROWS())
  const [subBrickRows, setSubBrickRows] = useState(initialData?.subBrickRows ?? DEFAULT_PAVER_ROWS())
  const [tileRows, setTileRows] = useState(initialData?.tileRows ?? DEFAULT_PAVER_ROWS())
  const [subTileRows, setSubTileRows] = useState(initialData?.subTileRows ?? DEFAULT_PAVER_ROWS())
  const [flagRows, setFlagRows] = useState(initialData?.flagRows ?? DEFAULT_PAVER_ROWS())
  const [subFlagRows, setSubFlagRows] = useState(initialData?.subFlagRows ?? DEFAULT_PAVER_ROWS())
  const [concRows, setConcRows] = useState(initialData?.concRows ?? DEFAULT_CONC_ROWS())
  const [subConcRows, setSubConcRows] = useState(initialData?.subConcRows ?? DEFAULT_CONC_ROWS())
  const [manualRows, setManualRows] = useState(initialData?.manualRows ?? DEFAULT_MANUAL_ROWS)
  const [subManualRows, setSubManualRows] = useState(
    initialData?.subManualRows ?? []
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
    brickRows,
    subBrickRows,
    tileRows,
    subTileRows,
    flagRows,
    subFlagRows,
    concRows,
    subConcRows,
    manualRows,
    subManualRows,
    distanceLF,
  }

  // Per-section active-tab rows + setters, keyed by MAT_SECTIONS[].key.
  const sectionState = {
    paver: { rows: isSub ? subPaverRows : paverRows, set: isSub ? setSubPaverRows : setPaverRows },
    brick: { rows: isSub ? subBrickRows : brickRows, set: isSub ? setSubBrickRows : setBrickRows },
    tile: { rows: isSub ? subTileRows : tileRows, set: isSub ? setSubTileRows : setTileRows },
    flag: { rows: isSub ? subFlagRows : flagRows, set: isSub ? setSubFlagRows : setFlagRows },
  }

  // Resolve a catalog item's unit cost from the price ledger (per-vendor),
  // falling back to the row's own unit_cost.
  const priceOf = item => (item ? ledgerPrice(ledger, item.id, item.vendor_id, n(item.unit_cost)) : 0)

  const calcRaw = calcSteps(
    state,
    laborRatePerHour,
    laborRates,
    materialRates,
    materialRows,
    gpmd,
    walkAccess,
    laborBurdenPct,
    subGpMarkupRate,
    commissionRate,
    priceOf
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
  const curConc = isSub ? subConcRows : concRows
  const setCurConc = isSub ? setSubConcRows : setConcRows
  const curManual = isSub ? subManualRows : manualRows
  const setCurManual = isSub ? setSubManualRows : setManualRows

  const setConcRow = (i, field, val) =>
    setCurConc(rows => rows.map((r, idx) => (idx === i ? { ...r, [field]: val } : r)))
  const setManual = (i, field, val) =>
    setCurManual(rows => rows.map((r, idx) => (idx === i ? { ...r, [field]: val } : r)))

  const vendorsForCategory = cat => vendors.filter(v => materialRows.some(r => r.vendor_id === v.id && (r.sub_category === cat || r.category === cat)))

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
        commissionRate,
        laborRates,
        materialRates,
        materialRows,
        calc,
      },
    })
  }

  // ── Grouped rate list for the "View Rates" popup (CrewTypeBar). Mirrors every
  //    rate the module (and its Edit-Rates modal) uses: Paver/Concrete labor +
  //    material modifiers, plus the flat per-LF Subcontractor pricing. Each
  //    section lists its LABOR rates first, then every MATERIAL rate (one row
  //    per vendor, Standard first) from the module's catalog — mirrors the Walls
  //    / Utilities View Rates. material_rates is retired: labor coefficients →
  //    labor_rates; per-vendor catalog products → material_price; the remaining
  //    named $/SF or $/LF modifiers live as misc_rates on the new model.
  const vendorNames = Object.fromEntries((vendors || []).map(v => [v.id, v.name]))
  // Catalog material rows for a sub_category: one currency row per vendor
  // (Standard/null-vendor first), each editable straight to material_price.
  const catalogBlockItems = subcat =>
    (materialRows || [])
      .filter(r0 => r0.sub_category === subcat)
      .filter(r0 => r0.vendor_id == null || vendorNames[r0.vendor_id])
      .sort((a, b) => {
        const va = a.vendor_id == null ? '' : vendorNames[a.vendor_id] || '~'
        const vb = b.vendor_id == null ? '' : vendorNames[b.vendor_id] || '~'
        return va.localeCompare(vb) || (a.name || '').localeCompare(b.name || '')
      })
      .map(r0 => ({
        label: `${r0.vendor_id ? vendorNames[r0.vendor_id] || 'Vendor' : 'Standard'} — ${r0.name}`,
        table: 'material_price',
        materialId: r0.id,
        vendorId: r0.vendor_id || undefined,
        category: 'Steps',
        unitLabel: r0.unit || 'ea',
        mode: 'currency',
        value: n(r0.unit_cost),
      }))

  return (
    <SubTabContext.Provider value={isSub}>
    <div className="space-y-5">
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
            crewType={crewType}
            onCrewTypeChange={setCrewType}
            title="Steps"
            moduleType="Steps"
            refreshAllRates={refreshAllRates}
            showInlineToggle={false}
          />
        </div>
      </div>

      <ModuleHeaderSlot>
        <WorkTypeChooser value={subType || 'In-House'} onChange={setSubType} compact />
      </ModuleHeaderSlot>

      {loading && (
        <div className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2">Loading rates…</div>
      )}

      {!loading && calc.unpriced && calc.unpriced.length > 0 && (
        <div className="rounded-md border border-red-300 bg-red-50 px-4 py-3">
          <p className="text-sm font-medium text-red-800">
            {calc.unpriced.length} item{calc.unpriced.length > 1 ? 's have' : ' has'} no price yet —
            click to price:
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {calc.unpriced.map(it => (
              <button
                key={it.name}
                type="button"
                className="rounded-full border border-red-300 bg-white px-3 py-1 text-sm text-red-700 hover:bg-red-100"
                onClick={() => setUnpricedItem(it)}
              >
                {it.label} · $0.00
              </button>
            ))}
          </div>
        </div>
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

      {/* ── Vendor/Type step sections: Paver · Brick · Tiled · Flagstone ── */}
      {MAT_SECTIONS.map(sec => (
        <MaterialStepSection
          key={sec.key}
          title={sec.title}
          matWord={sec.matWord}
          cat={sec.cat}
          baseKey={sec.baseKey}
          rows={sectionState[sec.key].rows}
          setRows={sectionState[sec.key].set}
          isSub={isSub}
          materialRows={materialRows}
          materialRates={materialRates}
          laborRates={laborRates}
          vendors={vendors}
          priceOf={priceOf}
          formKey={sec.formKey}
        />
      ))}

      {/* ── Concrete Steps ── */}
      <div>
        <SectionHeader
          title="Concrete Steps"
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
              <th className="text-center pb-1 pr-2 font-medium w-40">Vendor</th>
              <th className="text-center pb-1 pr-2 font-medium">Concrete Type</th>
              <th className="text-center pb-1 pr-2 font-medium w-24">Form</th>
              <th className="text-center pb-1 pr-2 font-medium w-20">LF</th>
              <th className="text-center pb-1 pr-2 font-medium">Finish</th>
              <th className="text-center pb-1 pr-2 font-medium w-28">{isSub ? 'Sub $' : 'Hrs · Mat'}</th>
              <th className="w-6"></th>
            </tr>
          </thead>
          <tbody>
            {curConc.map((row, i) => {
              const c = concRowCalc(row, laborRates, materialRates)
              const sc = concSubRowCalc(row, materialRates)
              return (
                <tr key={i} className="border-b border-gray-50">
                  <td className="py-1 pr-2">
                    <select
                      className={cellSel}
                      value={row.vendor}
                      onChange={e => setConcRow(i, 'vendor', e.target.value)}
                    >
                      <option value="">Select</option>
                      <option value="Standard">Standard</option>
                      {vendorsForCategory(CONC_VENDOR_CAT).map(v => (
                        <option key={v.id} value={v.id}>
                          {v.name}
                        </option>
                      ))}
                      {row.vendor &&
                        row.vendor !== 'Standard' &&
                        !vendorsForCategory(CONC_VENDOR_CAT).some(
                          v => String(v.id) === String(row.vendor)
                        ) && (
                          <option value={row.vendor}>
                            {vendors.find(v => String(v.id) === String(row.vendor))?.name ||
                              'Saved vendor'}
                          </option>
                        )}
                    </select>
                  </td>
                  <td className="py-1 pr-2">
                    <select
                      className={cellSel}
                      value={row.type || ''}
                      onChange={e => setConcRow(i, 'type', e.target.value)}
                    >
                      {!row.type && <option value="">Select concrete type</option>}
                      {row.type && !CONC_TYPES.includes(row.type) && (
                        <option value={row.type}>{row.type}</option>
                      )}
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
                    <NumInput value={row.sf} onChange={v => setConcRow(i, 'sf', v)} className="text-center" />
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
                  <td className="py-1 pr-2 text-center text-gray-400 whitespace-nowrap">
                    {isSub ? (
                      sc.cost > 0 ? fmt2(sc.cost) : '—'
                    ) : (
                      <>
                        {c.hrs > 0 ? `${c.hrs.toFixed(1)}h` : '—'}
                        {c.mat > 0 ? ` · ${fmt2(c.mat)}` : ''}
                      </>
                    )}
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
          className="mt-2 text-xs text-green-700 hover:text-green-900 font-medium"
        >
          + Add row
        </button>
      </div>

      {/* ── Manual Entry ── */}
      <div>
        <SectionHeader title="Manual Entry" />
        <table className="w-full text-sm table-fixed">
          <colgroup>
            {isSub ? (
              <>
                <col className="w-1/2" />
                <col className="w-1/2" />
              </>
            ) : (
              <>
                <col className="w-1/3" />
                <col className="w-1/3" />
                <col className="w-1/3" />
              </>
            )}
          </colgroup>
          <thead>
            <tr className="text-xs text-gray-500 border-b border-gray-200">
              <th className="text-center pb-1 pr-2 font-medium">Description</th>
              {isSub ? (
                <th className="text-center pb-1 font-medium">Cost $</th>
              ) : (
                <>
                  <th className="text-center pb-1 pr-2 font-medium">Hours</th>
                  <th className="text-center pb-1 font-medium">Materials $</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {curManual.map((row, i) => (
              <tr key={i} className="border-b border-gray-100">
                <td className="py-1 pr-2">
                  <input
                    className="input text-sm py-1 w-full"
                    value={row.label}
                    onChange={e => setManual(i, 'label', e.target.value)}
                  />
                </td>
                {isSub ? (
                  <td className="py-1">
                    <div className="flex items-center gap-1">
                      <NumInput value={row.subCost} onChange={v => setManual(i, 'subCost', v)} className="text-center flex-1" />
                      {curManual.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setCurManual(rows => rows.filter((_, idx) => idx !== i))}
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
                    <td className="py-1 pr-2">
                      <NumInput value={row.hours} onChange={v => setManual(i, 'hours', v)} className="text-center" />
                    </td>
                    <td className="py-1">
                      <div className="flex items-center gap-1">
                        <NumInput value={row.materials} onChange={v => setManual(i, 'materials', v)} className="text-center flex-1" />
                        {curManual.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setCurManual(rows => rows.filter((_, idx) => idx !== i))}
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
            ))}
          </tbody>
        </table>
        <button
          type="button"
          onClick={() => setCurManual(rows => [...rows, MANUAL_ROW()])}
          className="mt-2 text-xs text-green-700 hover:text-green-900 font-medium"
        >
          + Add manual entry
        </button>
      </div>

      {/* ── In-House Materials Breakdown (independent) ── */}
      {!isSub && (
        <div className="bg-gray-50 rounded-lg p-3 text-xs">
          <p className="font-semibold text-gray-600 uppercase tracking-wide text-xs mb-2">
            In House Materials Breakdown
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1 text-gray-600">
            {(calc.matSections || [])
              .filter(s => s.mat > 0)
              .map(s => (
                <span key={s.key}>
                  {s.title}: <strong>{fmt2(s.mat)}</strong>
                  {s.pallets > 0 ? ` (${s.pallets}p)` : ''}
                </span>
              ))}
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

      {/* ── Sub Materials Breakdown (per-tab, independent) ── */}
      {isSub && (
        <div className="bg-gray-50 rounded-lg p-3 text-xs">
          <p className="font-semibold text-gray-600 uppercase tracking-wide text-xs mb-2">
            Sub Materials Breakdown
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1 text-gray-600">
            {(calc.matSections || [])
              .filter(s => s.subCost > 0)
              .map(s => (
                <span key={s.key}>
                  {s.title}: <strong>{fmt2(s.subCost)}</strong>
                </span>
              ))}
            {calc.subConcCost > 0 && (
              <span>
                Concrete Steps: <strong>{fmt2(calc.subConcCost)}</strong>
              </span>
            )}
            {calc.manSub > 0 && (
              <span>
                Manual Sub: <strong>{fmt2(calc.manSub)}</strong>
              </span>
            )}
          </div>
          <p className="mt-1.5 text-[11px] text-gray-400 italic">
            Sub step material is bundled into the flat per-LF price, so line items
            reflect all-in sub cost per section.
          </p>
          <p className="mt-2 pt-2 border-t border-gray-200 font-semibold text-gray-800">
            Total Sub Cost: {fmt2(calc.subCost)}
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <button onClick={onBack} className="btn-secondary flex-1">
          ← Back
        </button>
        <button onClick={handleSave} disabled={saving} className="btn-primary flex-1">
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>

      <StepsRatesModal
        open={ratesModalOpen}
        onClose={() => setRatesModalOpen(false)}
        onSaved={refreshAllRates}
        isSub={isSub}
      />

      {unpricedItem && (
        <UnpricedItemModal
          item={unpricedItem}
          onClose={() => setUnpricedItem(null)}
          onSaved={refreshAllRates}
        />
      )}
    </div>
    </SubTabContext.Provider>
  )
}
