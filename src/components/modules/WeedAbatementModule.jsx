// ─────────────────────────────────────────────────────────────────────────────
// WeedAbatementModule — Weed abatement estimator
//
// Pricing (fixed):
//   • Travel:    2 hrs minimum per visit (to site + on to the next)
//   • Flat:      0.5 hr per 1,000 SF
//   • Hillside:  1.0 hr per 1,000 SF
//   • Material:  $2 per 1,000 SF (all areas)
//   • Number of visits multiplies travel, labor AND material (each visit is a
//     full re-treatment).
//
// Labor cost uses the company hourly rate + burden % (HR → Labor Rates);
// GP = man-days × GPMD, commission 12% — same shape as every other module.
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import GpmdBar from './GpmdBar'
import ModuleNotesField from './ModuleNotesField'

const n = v => parseFloat(v) || 0
const R = { laborRatePerHour: 35, laborBurdenPct: 0.29, gpmd: 425, commissionRate: 0.12 }

const TRAVEL_HRS_PER_VISIT = 2
const FLAT_HRS_PER_1K = 0.5
const HILL_HRS_PER_1K = 1.0
const MATERIAL_PER_1K = 2

function calcWeed(
  state,
  laborRatePerHour = R.laborRatePerHour,
  gpmd = R.gpmd,
  laborBurdenPct = R.laborBurdenPct
) {
  const visits = state.visits === '' || state.visits == null ? 1 : n(state.visits)
  const flatSF = n(state.flatSF)
  const hillSF = n(state.hillSF)

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
    visits, flatSF, hillSF,
    travelHrs, flatHrs, hillHrs, laborHrs, totalHrs, manDays,
    totalMat, laborCost, burden, gp, commission, subCost, price,
  }
}

export default function WeedAbatementModule({ onSave, onBack, saving, initialData }) {
  const [laborRatePerHour, setLaborRatePerHour] = useState(initialData?.laborRatePerHour ?? R.laborRatePerHour)
  const [laborBurdenPct, setLaborBurdenPct] = useState(initialData?.laborBurdenPct ?? R.laborBurdenPct)
  const [gpmd, setGpmd] = useState(initialData?.gpmd ?? R.gpmd)
  const [notes, setNotes] = useState(initialData?.notes ?? '')

  const [mode, setMode] = useState(initialData?.mode ?? 'flat') // flat | hillside | mixed
  const [visits, setVisits] = useState(initialData?.visits ?? '1')
  const [flatSF, setFlatSF] = useState(initialData?.flatSF ?? '')
  const [hillSF, setHillSF] = useState(initialData?.hillSF ?? '')

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

  // Only the areas relevant to the chosen mode contribute.
  const effFlat = mode === 'hillside' ? 0 : n(flatSF)
  const effHill = mode === 'flat' ? 0 : n(hillSF)
  const calc = calcWeed({ visits, flatSF: effFlat, hillSF: effHill }, laborRatePerHour, gpmd, laborBurdenPct)

  function handleSave() {
    onSave({
      notes,
      man_days: parseFloat(calc.manDays.toFixed(2)),
      material_cost: parseFloat(calc.totalMat.toFixed(2)),
      data: { mode, visits, flatSF, hillSF, laborRatePerHour, laborBurdenPct, gpmd, calc },
    })
  }

  const fmt = v => `$${n(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  const inp = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600'
  const lbl = 'block text-sm font-medium text-gray-700 mb-1'

  return (
    <div className="space-y-5">
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
        onGpmdSave={v => setGpmd(v)}
      />

      <ModuleNotesField value={notes} onChange={setNotes} />

      {/* Area type */}
      <div>
        <label className={lbl}>Area Type</label>
        <div className="flex gap-2">
          {[['flat', 'Flat'], ['hillside', 'Hillside'], ['mixed', 'Mixed']].map(([v, l]) => (
            <button
              key={v}
              type="button"
              onClick={() => setMode(v)}
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
            <input type="number" value={flatSF} onChange={e => setFlatSF(e.target.value)} placeholder="0" className={inp} />
            <p className="text-[11px] text-gray-400 mt-1">0.5 hr / 1,000 SF</p>
          </div>
        )}
        {mode !== 'flat' && (
          <div>
            <label className={lbl}>Hillside Area (SF)</label>
            <input type="number" value={hillSF} onChange={e => setHillSF(e.target.value)} placeholder="0" className={inp} />
            <p className="text-[11px] text-gray-400 mt-1">1 hr / 1,000 SF</p>
          </div>
        )}
        <div>
          <label className={lbl}>Number of Visits</label>
          <input type="number" value={visits} onChange={e => setVisits(e.target.value)} placeholder="1" className={inp} />
          <p className="text-[11px] text-gray-400 mt-1">Multiplies travel, labor &amp; material.</p>
        </div>
      </div>

      {/* Breakdown */}
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
