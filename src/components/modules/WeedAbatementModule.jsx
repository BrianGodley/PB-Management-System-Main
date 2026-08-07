// ─────────────────────────────────────────────────────────────────────────────
// WeedAbatementModule — Weed abatement estimator
//
// In-House pricing (fixed):
//   • Travel:    2 hrs minimum per visit (to site + on to the next)
//   • Flat:      0.5 hr per 1,000 SF
//   • Hillside:  1.0 hr per 1,000 SF
//   • Material:  $2 per 1,000 SF (all areas)
//   • Number of visits multiplies travel, labor AND material.
//   Labor cost uses the company hourly rate + burden %; GP = man-days × GPMD,
//   commission 12%.
//
// Sub pricing (flat): a subcontractor rate per 1,000 SF (× area × visits) plus an
// optional flat add. The itemized flat cost IS the subcontractor cost; profit is
// the Sub GP markup. In-house materials/labor are 0 on the Sub tab.
//
// In-House vs Sub are INDEPENDENT calculators with their own inputs (ihData /
// subData); the GPMD bar switches to its 'sub' variant on the Sub tab.
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import GpmdBar from './GpmdBar'
import WorkTypeChooser from './WorkTypeChooser'
import RateEditPopover from '../RateEditPopover'

const n = v => parseFloat(v) || 0
const R = { laborRatePerHour: 35, laborBurdenPct: 0.29, gpmd: 425, commissionRate: 0.12 }

const TRAVEL_HRS_PER_VISIT = 2
const FLAT_HRS_PER_1K = 0.5
const HILL_HRS_PER_1K = 1.0
const MATERIAL_PER_1K = 2

// Per-tab input factory — In-House and Sub each carry their OWN copy so the
// two tabs never share inputs, only the module-level rates.
function makeTab(src = {}) {
  return {
    mode: src.mode ?? 'flat', // flat | hillside | mixed
    visits: src.visits ?? '1',
    flatSF: src.flatSF ?? '',
    hillSF: src.hillSF ?? '',
    subRatePerSF: src.subRatePerSF ?? '', // Sub tab: strict $/SF
    subFlat: src.subFlat ?? '', // Sub tab: optional flat add
  }
}

function calcWeed(
  state,
  laborRatePerHour = R.laborRatePerHour,
  gpmd = R.gpmd,
  laborBurdenPct = R.laborBurdenPct
) {
  const isSub = state.subType === 'Subcontractor'
  const mode = state.mode || 'flat'
  const visits = state.visits === '' || state.visits == null ? 1 : n(state.visits)
  // Only the areas relevant to the chosen mode contribute.
  const flatSF = mode === 'hillside' ? 0 : n(state.flatSF)
  const hillSF = mode === 'flat' ? 0 : n(state.hillSF)
  const subMarkup = n(state.subGpMarkupRate) || 0.2

  if (isSub) {
    // Sub tab: STRICT price per square foot — no labor hours. subCost is purely
    // $/SF × area × visits, plus an optional flat add.
    const subArea = flatSF + hillSF
    const subRatePerSF = n(state.subRatePerSF)
    const subCost = subArea * subRatePerSF * visits + n(state.subFlat)
    const subGp = subCost * subMarkup
    const commission = subGp * R.commissionRate
    return {
      isSub: true, mode, visits, flatSF, hillSF,
      travelHrs: 0, flatHrs: 0, hillHrs: 0, laborHrs: 0, totalHrs: 0, manDays: 0,
      totalMat: 0, laborCost: 0, burden: 0, gp: 0,
      subArea, subRatePerSF, subFlat: n(state.subFlat),
      subCost, subGp, commission,
      price: subCost + subGp + commission,
    }
  }

  const travelHrs = TRAVEL_HRS_PER_VISIT * visits
  const flatHrs = (flatSF / 1000) * FLAT_HRS_PER_1K * visits
  const hillHrs = (hillSF / 1000) * HILL_HRS_PER_1K * visits
  const laborHrs = flatHrs + hillHrs
  const totalHrs = travelHrs + laborHrs
  const manDays = totalHrs / 8

  const totalMat = ((flatSF + hillSF) / 1000) * MATERIAL_PER_1K * visits

  const lrph = n(laborRatePerHour) || R.laborRatePerHour
  const laborCost = totalHrs * lrph
  const burden = laborCost * laborBurdenPct
  const gp = manDays * (n(gpmd) || R.gpmd)
  const commission = gp * R.commissionRate
  const subCost = 0
  const price = laborCost + burden + totalMat + gp + commission

  return {
    isSub: false, mode, visits, flatSF, hillSF,
    travelHrs, flatHrs, hillHrs, laborHrs, totalHrs, manDays,
    totalMat, laborCost, burden, gp, commission, subCost, subGp: 0, price,
  }
}

export default function WeedAbatementModule({ onSave, onBack, saving, initialData }) {
  const [laborRatePerHour, setLaborRatePerHour] = useState(initialData?.laborRatePerHour ?? R.laborRatePerHour)
  const [laborBurdenPct, setLaborBurdenPct] = useState(initialData?.laborBurdenPct ?? R.laborBurdenPct)
  const [gpmd, setGpmd] = useState(initialData?.gpmd ?? R.gpmd)
  const [notes, setNotes] = useState(initialData?.notes ?? '')
  const subGpMarkupRate = initialData?.subGpMarkupRate ?? 0.2

  // Master-rate default for the Sub $/SF. Used only when the user leaves the
  // Subcontractor Rate field blank; a typed value always wins.
  const [subRateDefault, setSubRateDefault] = useState(null)

  // Independent In-House / Sub tabs. Legacy flat saves load into In-House.
  const [ihTab, setIhTab] = useState(() => makeTab(initialData?.ihData || initialData))
  const [subTab, setSubTab] = useState(() => makeTab(initialData?.subData || {}))
  const [subType, setSubType] = useState(initialData?.subType ?? 'In-House')
  const isSub = subType === 'Subcontractor'
  const cur = isSub ? subTab : ihTab
  const setCur = isSub ? setSubTab : setIhTab
  const setField = field => val => setCur(t => ({ ...t, [field]: val }))

  const mode = cur.mode
  const visits = cur.visits
  const flatSF = cur.flatSF
  const hillSF = cur.hillSF

  // Load the master Sub $/SF rate so the Sub tab has a sensible default when
  // the user leaves the rate field blank. Re-fetched after a RateEditPopover
  // save so the hint + fallback reflect the edit immediately.
  const refreshRates = useCallback(async () => {
    const { data } = await supabase
      .from('material_rates')
      .select('name, unit_cost')
      .eq('category', 'Weed Abatement')
    const row = (data || []).find(r => r.name === 'Weed Abatement - Sub $/SF')
    const v = row ? parseFloat(row.unit_cost) : NaN
    setSubRateDefault(Number.isFinite(v) ? v : null)
  }, [])

  useEffect(() => {
    refreshRates()
  }, [refreshRates])

  // Pull the company labor rate + burden % (HR → Labor Rates). Skip when
  // re-editing a saved module so it keeps the rate it was built with.
  useEffect(() => {
    if (initialData?.laborRatePerHour) return
    supabase
      .from('company_settings')
      .select('labor_rate_per_hour, labor_burden_pct')
      .single()
      .then(({ data }) => {
        if (data?.labor_rate_per_hour != null) setLaborRatePerHour(parseFloat(data.labor_rate_per_hour) || R.laborRatePerHour)
        if (data?.labor_burden_pct != null) setLaborBurdenPct(parseFloat(data.labor_burden_pct))
      })
  }, [])

  // Effective Sub $/SF for the calc: the user's typed value is authoritative;
  // only fall back to the master-rate default when the field is left blank.
  const effSubRatePerSF =
    cur.subRatePerSF === '' || cur.subRatePerSF == null ? (subRateDefault ?? '') : cur.subRatePerSF
  const state = { subType, subGpMarkupRate, ...cur, subRatePerSF: effSubRatePerSF }
  const calc = calcWeed(state, laborRatePerHour, gpmd, laborBurdenPct)

  function handleSave() {
    onSave({
      notes,
      man_days: parseFloat(calc.manDays.toFixed(2)),
      // In-house materials only; Sub materials/cost live in subCost.
      material_cost: isSub ? 0 : parseFloat(calc.totalMat.toFixed(2)),
      data: {
        ...state,
        ihData: ihTab,
        subData: subTab,
        subType,
        subGpMarkupRate,
        laborRatePerHour,
        laborBurdenPct,
        gpmd,
        calc,
      },
    })
  }

  const fmt = v => `$${n(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  const inp = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600'
  const lbl = 'block text-sm font-medium text-gray-700 mb-1'

  return (
    <div className="space-y-5">
      {/* GPMD summary bar — switches to the Sub variant on the Sub tab */}
      <GpmdBar
        variant={isSub ? 'sub' : 'inhouse'}
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
        onGpmdSave={v => setGpmd(v)}
      />


      {/* In-House vs Subcontractor */}
      <WorkTypeChooser value={subType || 'In-House'} onChange={setSubType} />

      {/* Area type */}
      <div>
        <label className={lbl}>Area Type</label>
        <div className="flex gap-2">
          {[['flat', 'Flat'], ['hillside', 'Hillside'], ['mixed', 'Mixed']].map(([v, l]) => (
            <button
              key={v}
              type="button"
              onClick={() => setField('mode')(v)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                mode === v ? 'border-green-600 bg-green-50 text-green-800' : 'border-gray-200 text-gray-600 hover:border-gray-300'
              }`}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* Areas + visits */}
      <div className="grid sm:grid-cols-2 gap-4">
        {mode !== 'hillside' && (
          <div>
            <label className={lbl}>Flat Area (SF)</label>
            <input type="number" value={flatSF} onChange={e => setField('flatSF')(e.target.value)} placeholder="0" className={inp} />
            {!isSub && <p className="text-[11px] text-gray-400 mt-1">0.5 hr / 1,000 SF</p>}
          </div>
        )}
        {mode !== 'flat' && (
          <div>
            <label className={lbl}>Hillside Area (SF)</label>
            <input type="number" value={hillSF} onChange={e => setField('hillSF')(e.target.value)} placeholder="0" className={inp} />
            {!isSub && <p className="text-[11px] text-gray-400 mt-1">1 hr / 1,000 SF</p>}
          </div>
        )}
        <div>
          <label className={lbl}>Number of Visits</label>
          <input type="number" value={visits} onChange={e => setField('visits')(e.target.value)} placeholder="1" className={inp} />
          <p className="text-[11px] text-gray-400 mt-1">Multiplies {isSub ? 'the sub cost.' : 'travel, labor & material.'}</p>
        </div>
      </div>

      {/* Sub-only pricing inputs */}
      {isSub && (
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <div className="flex items-center mb-1">
              <label className={`${lbl} mb-0`}>Subcontractor Rate ($ / SF)</label>
              <RateEditPopover
                table="material_rates"
                name="Weed Abatement - Sub $/SF"
                category="Weed Abatement"
                unitLabel="SF"
                currentValue={subRateDefault ?? ''}
                onSaved={refreshRates}
              />
            </div>
            <input type="number" step="0.001" value={cur.subRatePerSF} onChange={e => setField('subRatePerSF')(e.target.value)} placeholder={subRateDefault != null ? String(subRateDefault) : '0.00'} className={inp} />
            <p className="text-[11px] text-gray-400 mt-1">
              Strict price per square foot × area × visits.
              {subRateDefault != null && (cur.subRatePerSF === '' || cur.subRatePerSF == null) && (
                <span className="ml-1">default {fmt(subRateDefault)}/SF</span>
              )}
            </p>
          </div>
          <div>
            <label className={lbl}>Additional Flat Sub Cost (optional)</label>
            <input type="number" value={cur.subFlat} onChange={e => setField('subFlat')(e.target.value)} placeholder="0" className={inp} />
          </div>
        </div>
      )}

      {/* Breakdown */}
      {isSub ? (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm space-y-1.5">
          <div className="flex justify-between">
            <span className="text-gray-500">Total area × visits</span>
            <span className="font-medium">{(calc.subArea * calc.visits).toLocaleString()} SF</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Rate</span>
            <span className="font-medium">{fmt(calc.subRatePerSF)} / SF</span>
          </div>
          {calc.subFlat > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-500">Flat add</span>
              <span className="font-medium">{fmt(calc.subFlat)}</span>
            </div>
          )}
          <div className="flex justify-between border-t border-gray-200 pt-1.5">
            <span className="font-semibold text-gray-700">Subcontractor Cost</span>
            <span className="font-bold text-gray-900">{fmt(calc.subCost)}</span>
          </div>
        </div>
      ) : (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm space-y-1.5">
          <div className="flex justify-between">
            <span className="text-gray-500">Travel ({TRAVEL_HRS_PER_VISIT} hr × {calc.visits} visit{calc.visits === 1 ? '' : 's'})</span>
            <span className="font-medium">{calc.travelHrs.toFixed(2)} hrs</span>
          </div>
          {mode !== 'hillside' && (
            <div className="flex justify-between">
              <span className="text-gray-500">Flat labor</span>
              <span className="font-medium">{calc.flatHrs.toFixed(2)} hrs</span>
            </div>
          )}
          {mode !== 'flat' && (
            <div className="flex justify-between">
              <span className="text-gray-500">Hillside labor</span>
              <span className="font-medium">{calc.hillHrs.toFixed(2)} hrs</span>
            </div>
          )}
          <div className="flex justify-between border-t border-gray-200 pt-1.5">
            <span className="font-semibold text-gray-700">Total Hours</span>
            <span className="font-bold text-gray-900">{calc.totalHrs.toFixed(2)} hrs ({calc.manDays.toFixed(2)} MD)</span>
          </div>
          <div className="flex justify-between">
            <span className="font-semibold text-gray-700">Material Cost</span>
            <span className="font-bold text-gray-900">{fmt(calc.totalMat)}</span>
          </div>
        </div>
      )}

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
