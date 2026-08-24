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
import { fetchStandardRateMap } from '../../lib/materialCatalog'
import { calcWeed, WEED_RATE_NAMES } from './weedCalc'
import GpmdBar from './GpmdBar'
import WorkTypeChooser from './WorkTypeChooser'
import CrewTypeBar from './CrewTypeBar'
import ModuleHeaderSlot from './ModuleHeaderSlot'
import UnpricedItemModal from '../UnpricedItemModal'

const n = v => parseFloat(v) || 0
// Company/estimate financial settings (labor rate, burden %, GPMD, commission,
// sub GP markup) are sourced live from company_settings — no hardcoded defaults.

// calcWeed + WEED_RATE_NAMES (the coefficient key map, category 'Weed Abatement')
// now live in ./weedCalc. Every value is read live from the price list — labor_rates
// for the hour coefficients, misc_rates for the per-1,000-SF material cost. No
// hardcoded fallbacks: a missing DB row contributes 0.

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


export default function WeedAbatementModule({ onSave, onBack, saving, initialData }) {
  const [laborRatePerHour, setLaborRatePerHour] = useState(initialData?.laborRatePerHour ?? null)
  const [laborBurdenPct, setLaborBurdenPct] = useState(initialData?.laborBurdenPct ?? null)
  const [gpmd, setGpmd] = useState(initialData?.gpmd ?? null)
  const [notes, setNotes] = useState(initialData?.notes ?? '')
  const [commissionRate, setCommissionRate] = useState(initialData?.commissionRate ?? null)
  const [subGpMarkupRate, setSubGpMarkupRate] = useState(initialData?.subGpMarkupRate ?? null)

  // Master-rate default for the Sub $/SF. Used only when the user leaves the
  // Subcontractor Rate field blank; a typed value always wins.
  const [subRateDefault, setSubRateDefault] = useState(null)

  // In-House labor/material coefficients pulled from the price list. Null until
  // loaded; calc falls back to WEED_RATE_FB for any coefficient still missing.
  const [rateMap, setRateMap] = useState({})
  // Gate the "unpriced items" banner until rates have actually loaded, so it never
  // flashes on first open (empty rate map → every rate looks unpriced for a frame).
  const [ratesLoaded, setRatesLoaded] = useState(false)
  // The unset labor rate the user clicked to price inline (UnpricedItemModal).
  const [unpricedItem, setUnpricedItem] = useState(null)

  // Independent In-House / Sub tabs. Legacy flat saves load into In-House.
  const [ihTab, setIhTab] = useState(() => makeTab(initialData?.ihData || initialData))
  const [subTab, setSubTab] = useState(() => makeTab(initialData?.subData || {}))
  const [subType, setSubType] = useState(initialData?.subType ?? 'In-House')
  const [crewType, setCrewType] = useState(initialData?.crewType ?? 'Landscape')
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
    // material_rates retired: material $ from the new model (fetchStandardRateMap
    // = material Standard + misc), labor coefficients from labor_rates.
    const [matMap, labRes] = await Promise.all([
      fetchStandardRateMap(['Weed Abatement']),
      supabase.from('labor_rates').select('name, rate').eq('category', 'Weed Abatement'),
    ])
    const lab = labRes.data || []
    const pickMat = name => {
      const v = matMap[name]
      return Number.isFinite(v) ? v : null
    }
    const pickLab = name => {
      const row = lab.find(r => r.name === name)
      const v = row ? parseFloat(row.rate) : NaN
      return Number.isFinite(v) ? v : null
    }
    setSubRateDefault(pickMat('Weed Abatement - Sub $/SF'))
    // In-House coefficients: labor hrs from labor_rates, material $ from material_rates.
    setRateMap({
      travelHrsPerVisit: pickLab(WEED_RATE_NAMES.travelHrsPerVisit),
      flatHrsPer1k: pickLab(WEED_RATE_NAMES.flatHrsPer1k),
      hillHrsPer1k: pickLab(WEED_RATE_NAMES.hillHrsPer1k),
      materialPer1k: pickMat(WEED_RATE_NAMES.materialPer1k),
    })
    setRatesLoaded(true)
  }, [])

  useEffect(() => {
    refreshRates()
  }, [refreshRates])

  // Pull the company labor rate + burden % (HR → Labor Rates). Skip when
  // re-editing a saved module so it keeps the rate it was built with.
  useEffect(() => {
    supabase
      .from('company_settings')
      .select('labor_rate_per_hour, labor_burden_pct, estimate_gpmd_default, commission_rate, sub_gp_markup_rate')
      .single()
      .then(({ data }) => {
        if (!data) return
        if (!initialData?.laborRatePerHour && data.labor_rate_per_hour != null) setLaborRatePerHour(parseFloat(data.labor_rate_per_hour))
        if (!initialData?.laborBurdenPct && data.labor_burden_pct != null) setLaborBurdenPct(parseFloat(data.labor_burden_pct))
        if (initialData?.gpmd == null && data.estimate_gpmd_default != null) setGpmd(parseFloat(data.estimate_gpmd_default))
        if (initialData?.commissionRate == null && data.commission_rate != null) setCommissionRate(parseFloat(data.commission_rate))
        if (initialData?.subGpMarkupRate == null && data.sub_gp_markup_rate != null) setSubGpMarkupRate(parseFloat(data.sub_gp_markup_rate))
      })
  }, [])

  // Effective Sub $/SF for the calc: the user's typed value is authoritative;
  // only fall back to the master-rate default when the field is left blank.
  const effSubRatePerSF =
    cur.subRatePerSF === '' || cur.subRatePerSF == null ? (subRateDefault ?? '') : cur.subRatePerSF
  const state = { subType, subGpMarkupRate, ...cur, subRatePerSF: effSubRatePerSF, rates: rateMap }
  const calc = calcWeed(state, laborRatePerHour, gpmd, laborBurdenPct, commissionRate)

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
        crewType,
        subGpMarkupRate,
        commissionRate,
        laborRatePerHour,
        laborBurdenPct,
        gpmd,
        calc,
      },
    })
  }

  // Effective In-House coefficients for display + popover current values.
  const effRate = k => n(rateMap[k])
  const fmt = v => `$${n(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  const inp = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600'
  const lbl = 'block text-sm font-medium text-gray-700 mb-1'


  return (
    <div className="space-y-5">
      {/* ── Frozen header: GPMD bar + Crew Type / View Rates bar ── */}
      <div className="sticky top-0 z-20 -mx-6 bg-white shadow-md">
        <div className="px-6 pt-1 pb-1 bg-gray-900">
          <GpmdBar
            sticky
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
        </div>
        <div className="px-6 py-2">
          <CrewTypeBar
            crewType={crewType}
            onCrewTypeChange={setCrewType}
            title="Weed Abatement"
            moduleType="Weed Abatement"
            refreshAllRates={refreshRates}
            showInlineToggle={false}
          />
        </div>
      </div>

      {/* Unset LABOR rates that were actually used → clickable fix-it prompts. */}
      {ratesLoaded && calc.unpriced && calc.unpriced.length > 0 && (
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

      {/* In-House vs Subcontractor */}
      <ModuleHeaderSlot>
        <WorkTypeChooser value={subType || 'In-House'} onChange={setSubType} compact />
      </ModuleHeaderSlot>

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

      {/* Areas + visits — reserve the tallest (Mixed = 2 rows) height so switching
          modes never shifts the sections below. */}
      <div className="grid sm:grid-cols-2 gap-4 content-start sm:min-h-[9.5rem]">
        {mode !== 'hillside' && (
          <div>
            <label className={lbl}>Flat Area (SF)</label>
            <input type="number" value={flatSF} onChange={e => setField('flatSF')(e.target.value)} placeholder="0" className={inp} />
            {!isSub && (
              <p className="text-[11px] text-gray-400 mt-1">
                {effRate('flatHrsPer1k')} hrs per Sq Ft
              </p>
            )}
          </div>
        )}
        {mode !== 'flat' && (
          <div>
            <label className={lbl}>Hillside Area (SF)</label>
            <input type="number" value={hillSF} onChange={e => setField('hillSF')(e.target.value)} placeholder="0" className={inp} />
            {!isSub && (
              <p className="text-[11px] text-gray-400 mt-1">
                {effRate('hillHrsPer1k')} hrs per Sq Ft
              </p>
            )}
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
            </div>
            <input type="number" step="0.001" value={cur.subRatePerSF} onChange={e => setField('subRatePerSF')(e.target.value)} placeholder={subRateDefault != null ? String(subRateDefault) : '0.00'} className={inp} />
            <p className="text-[11px] text-gray-400 mt-1">
              Strict price per square foot × area × visits.
              {subRateDefault != null && (cur.subRatePerSF === '' || cur.subRatePerSF == null) && (
                <span className="ml-1">default {fmt(subRateDefault)} per Sq Ft</span>
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
            <span className="font-medium">{(calc.subArea * calc.visits).toLocaleString()} Sq Ft</span>
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
            <span className="text-gray-500">
              Travel ({effRate('travelHrsPerVisit')} hr × {calc.visits} visit{calc.visits === 1 ? '' : 's'})
            </span>
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
            <span className="font-semibold text-gray-700 flex items-center gap-1">
              Material Cost ({fmt(effRate('materialPer1k'))} / 1,000 Sq Ft)
            </span>
            <span className="font-bold text-gray-900">{fmt(calc.totalMat)}</span>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <button onClick={onBack} className="btn-secondary flex-1">← Back</button>
        <button onClick={handleSave} disabled={saving} className="btn-primary flex-1">
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>

      {unpricedItem && (
        <UnpricedItemModal
          item={unpricedItem}
          onClose={() => setUnpricedItem(null)}
          onSaved={refreshRates}
        />
      )}
    </div>
  )
}
