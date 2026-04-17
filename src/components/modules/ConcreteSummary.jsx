// ─────────────────────────────────────────────────────────────────────────────
// ConcreteSummary — read-only detail view for a saved Concrete module
// Uses three rate snapshots saved at module creation time:
//   laborRates    → production rates (lr)
//   materialRates → material unit costs (mr)
//   subRates      → sub/equipment costs (sr)
// ─────────────────────────────────────────────────────────────────────────────

const n = v => parseFloat(v) || 0

const BASE_RATES = {
  'Skid Steer Good': 10.0, 'Skid Steer OK': 7.5, 'Mini Skid Steer': 5.0, 'Wheelbarrow': 3.34, 'Hand': 2.5,
}

// Hardcoded fallbacks — used only when no snapshot is available
const R = {
  concreteSFPerHr:      23,      rebarSFPerHr:    60,
  formLFPerHr:          18,      sleeveLFPerHr:   10,
  sealerNaturalSFPerHr: 200,     sealerWetSFPerHr: 120,
  vaporBarrierSFPerHr:  15,
  concretePerCY:        185,     rebarSFPrice:    0.8625,
  formMaterialPerLF:    1.73,    sleevePer10LF:   4.60,
  pumpFeeFlat:          316.25,  pumpFeePerCY:    9.20,
  colorCostPerCY:       28.75,   sandFinishPer400SF: 207,
  stampSubFlat:         800,     stampSubPerCY:   120,
  sealerNatural5g:      150,     sealerWet5g:     190,
  sealerSFPerGal:       70,
  vaporBarrierPerSF:    0.22,
  costBase:             7.50,    crewDaySF:       650,
  laborBurdenPct:       0.28,    gpmd:            425,
}

function SectionLabel({ title }) {
  return (
    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mt-4 mb-1 border-t border-gray-100 pt-3">
      {title}
    </p>
  )
}

function LineRow({ label, value, sub, highlight }) {
  return (
    <div className={`flex items-start justify-between py-1 border-b border-gray-50 ${highlight ? 'font-semibold' : ''}`}>
      <span className={`text-xs flex-1 pr-2 ${highlight ? 'text-gray-800' : 'text-gray-600'}`}>{label}</span>
      <div className="text-right shrink-0">
        <span className={`text-xs ${highlight ? 'text-gray-900 font-semibold' : 'text-gray-700'}`}>{value}</span>
        {sub && <p className="text-xs text-gray-400">{sub}</p>}
      </div>
    </div>
  )
}

import FinancialSummaryList from './FinancialSummaryList'

export default function ConcreteSummary({ module }) {
  const data = module?.data || {}
  const {
    difficulty = 0, layoutHrs = 0, distanceLF = 0, pctBackyard = 0,
    formingComplexity = 0, finishingType = 'IH', hoursAdj = 0,
    installSF = 0, depthIn = 4, rebarSF = 0, formLF = 0, sleeveLF = 0,
    finishType = 'Broom Finish', colorYes = false, pumpYes = false,
    vaporBarrierSF = 0, sealerSF = 0, sealerType = 'Natural',
    baseRows = [], manualRows = [],
    laborRatePerHour = 35, laborRates = {}, materialRates = {}, subRates = {}, calc = null,
  } = data

  // Labor production rates (labor_rates snapshot)
  const lr = laborRates || {}
  const concreteSFPerHr      = lr['Concrete - Pour & Finish']      ?? R.concreteSFPerHr
  const rebarSFPerHr         = lr['Concrete - Rebar 24" OC']       ?? R.rebarSFPerHr
  const formLFPerHr          = lr['Concrete - Form Setting']        ?? R.formLFPerHr
  const sleeveLFPerHr        = lr['Concrete - Sleeves']             ?? R.sleeveLFPerHr
  const sealerNaturalSFPerHr = lr['Concrete - Sealer Natural']      ?? R.sealerNaturalSFPerHr
  const sealerWetSFPerHr     = lr['Concrete - Sealer Wet-Look']     ?? R.sealerWetSFPerHr
  const vaporBarrierSFPerHr  = lr['Concrete - Vapor Barrier']       ?? R.vaporBarrierSFPerHr

  // Material unit costs (material_rates snapshot)
  const mr = materialRates || {}
  const concretePerCY        = mr['Concrete - Per CY']              ?? R.concretePerCY
  const rebarSFPrice         = mr['Concrete - Rebar Price SF']      ?? R.rebarSFPrice
  const formMaterialPerLF    = mr['Concrete - Form Lumber LF']      ?? R.formMaterialPerLF
  const sleevePer10LF        = mr['Concrete - Sleeve Per 10LF']     ?? R.sleevePer10LF
  const colorCostPerCY       = mr['Concrete - Color Per CY']        ?? R.colorCostPerCY
  const sealerNatural5g      = mr['Concrete - Sealer Natural 5gal'] ?? R.sealerNatural5g
  const sealerWet5g          = mr['Concrete - Sealer Wet 5gal']     ?? R.sealerWet5g
  const vaporBarrierPerSF    = mr['Concrete - Vapor Barrier SF']    ?? R.vaporBarrierPerSF
  const costBase             = mr['Concrete - Import Base']         ?? R.costBase

  // Sub / equipment costs (subcontractor_rates snapshot)
  const sr = subRates || {}
  const pumpFeeFlat          = sr['Concrete - Pump Flat Fee']       ?? R.pumpFeeFlat
  const pumpFeePerCY         = sr['Concrete - Pump Per CY']         ?? R.pumpFeePerCY
  const sandFinishPer400SF   = sr['Concrete - Sand Finish 400SF']   ?? R.sandFinishPer400SF
  const stampSubFlat         = sr['Concrete - Stamp Sub Flat']      ?? R.stampSubFlat
  const stampSubPerCY        = sr['Concrete - Stamp Sub Per CY']    ?? R.stampSubPerCY

  // Use saved calc for financials
  const savedCalc  = calc || {}
  const totalHrs   = n(savedCalc.totalHrs)
  const manDays    = n(savedCalc.manDays)    || n(module.man_days)
  const totalMat   = n(savedCalc.totalMat)   || n(module.material_cost)
  const laborCost  = n(savedCalc.laborCost)
  const burden     = n(savedCalc.burden)
  const gp         = n(savedCalc.gp)
  const commission = n(savedCalc.commission) || gp * 0.12
  const subCost    = n(savedCalc.subCost)
  const priceTotal = n(savedCalc.price)
  const concreteCY = n(savedCalc.concreteCY)

  const fmt  = v => `$${Math.round(v).toLocaleString()}`
  const fmt2 = v => `$${n(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  const fh   = v => v > 0 ? `${v.toFixed(2)} hrs` : null

  // Re-derive per-row calcs for display using snapshot rates
  const baseCalc = baseRows.map(r => {
    const sf = n(r.sf), depth = n(r.depth) || 2
    if (!sf) return { tons: 0, hrs: 0, mat: 0 }
    const tons = (sf / 200) * depth
    const rate = BASE_RATES[r.method] || 10.0
    return { tons, hrs: tons / rate, mat: tons * costBase }
  })

  const installHrs = n(installSF) / concreteSFPerHr
  const rebarHrs   = n(rebarSF)   / rebarSFPerHr
  const formHrs    = n(formLF)    / formLFPerHr
  const sleeveHrs  = n(sleeveLF)  / sleeveLFPerHr
  const sealerHrs  = n(sealerSF) > 0
    ? n(sealerSF) / (sealerType === 'Natural' ? sealerNaturalSFPerHr : sealerWetSFPerHr)
    : 0
  const vaporHrs   = n(vaporBarrierSF) > 0 ? n(vaporBarrierSF) / vaporBarrierSFPerHr : 0
  const pumpMat    = pumpYes && concreteCY > 0
    ? pumpFeeFlat + pumpFeePerCY * Math.ceil(concreteCY)
    : 0

  const hasBaseRows     = baseCalc.some(r => r.hrs > 0)
  const manualFiltered  = manualRows.filter(r => n(r.hours) > 0 || n(r.materials) > 0 || n(r.subCost) > 0)

  return (
    <div className="space-y-1 text-sm">

      {/* Stat bar */}
      <div className="grid grid-cols-2 gap-2 mb-2">
        <div className="bg-gray-50 rounded-lg p-3 text-center">
          <p className="text-xs text-gray-500 mb-0.5">Man Days</p>
          <p className="text-xl font-bold text-gray-900">{manDays.toFixed(2)}</p>
          <p className="text-xs text-gray-400">{totalHrs.toFixed(1)} hrs</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-3 text-center">
          <p className="text-xs text-gray-500 mb-0.5">Materials</p>
          <p className="text-xl font-bold text-gray-900">{fmt2(totalMat)}</p>
        </div>
      </div>

      {/* Badges */}
      <div className="flex gap-2 flex-wrap mb-1">
        {concreteCY > 0 && <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded">{concreteCY.toFixed(2)} CY @ {depthIn}"</span>}
        <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded">{finishType}</span>
        <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded">{finishingType === 'IH' ? 'In-House' : 'Sub'} finish</span>
        {colorYes && <span className="text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded">Color Hardener</span>}
        {pumpYes  && <span className="text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded">Pump</span>}
        {n(difficulty) > 0 && <span className="text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded">+{difficulty}% difficulty</span>}
      </div>

      {/* Base */}
      {hasBaseRows && (
        <>
          <SectionLabel title="Base Install" />
          {baseRows.map((r, i) => {
            const c = baseCalc[i] || {}
            if (!c.hrs) return null
            return (
              <LineRow key={i} label={`${r.label} — ${n(r.sf).toLocaleString()} SF @ ${r.depth}"`}
                value={fh(c.hrs) || '—'}
                sub={`${c.tons.toFixed(1)} tons  ·  ${r.method}  ·  ${fmt2(c.mat)}`}
              />
            )
          })}
        </>
      )}

      {/* Install */}
      {n(installSF) > 0 && (
        <>
          <SectionLabel title="Concrete Install" />
          {installHrs > 0 && (
            <LineRow label={`Pour + Finish — ${n(installSF).toLocaleString()} SF @ ${depthIn}"`}
              value={fh(installHrs) || '—'}
              sub={`${concreteCY.toFixed(2)} CY  ·  ${concreteSFPerHr} SF/hr  ·  ${fmt2(n(installSF) / 27 * (n(depthIn)/12) * concretePerCY)} mat`}
            />
          )}
          {rebarHrs > 0 && (
            <LineRow label={`Rebar 24" OC — ${n(rebarSF).toLocaleString()} SF`}
              value={fh(rebarHrs) || '—'}
              sub={`${rebarSFPerHr} SF/hr  ·  ${fmt2(n(rebarSF) * rebarSFPrice)} mat`}
            />
          )}
          {formHrs > 0 && (
            <LineRow label={`Form Edging — ${n(formLF).toLocaleString()} LF`}
              value={fh(formHrs) || '—'}
              sub={`${formLFPerHr} LF/hr  ·  ${fmt2(n(formLF) * formMaterialPerLF)} mat`}
            />
          )}
          {sleeveHrs > 0 && (
            <LineRow label={`3" Sleeves — ${n(sleeveLF).toLocaleString()} LF`}
              value={fh(sleeveHrs) || '—'}
              sub={`${Math.ceil(n(sleeveLF)/10)} units  ·  ${fmt2(Math.ceil(n(sleeveLF)/10) * sleevePer10LF)} mat`}
            />
          )}
        </>
      )}

      {/* Options add-ons */}
      {(colorYes || pumpYes || n(vaporBarrierSF) > 0 || n(sealerSF) > 0) && (
        <>
          <SectionLabel title="Finish Options" />
          {colorYes && concreteCY > 0 && (
            <LineRow label="Color Hardener"
              value={fmt2(Math.ceil(concreteCY) * colorCostPerCY)}
              sub={`${Math.ceil(concreteCY)} CY × $${colorCostPerCY}/CY`}
            />
          )}
          {pumpYes && pumpMat > 0 && (
            <LineRow label="Concrete Pump"
              value={fmt2(pumpMat)}
              sub={`$${pumpFeeFlat} flat + $${pumpFeePerCY}/CY × ${Math.ceil(concreteCY)} CY`}
            />
          )}
          {vaporHrs > 0 && (
            <LineRow label={`Vapor Barrier — ${n(vaporBarrierSF).toLocaleString()} SF`}
              value={fh(vaporHrs) || '—'}
              sub={`${fmt2(n(vaporBarrierSF) * vaporBarrierPerSF)} mat`}
            />
          )}
          {sealerHrs > 0 && (
            <LineRow label={`Sealer (${sealerType}) — ${n(sealerSF).toLocaleString()} SF`}
              value={fh(sealerHrs) || '—'}
              sub={`${Math.ceil(n(sealerSF)/R.sealerSFPerGal)} gals  ·  ${fmt2(Math.ceil(n(sealerSF)/R.sealerSFPerGal) * ((sealerType === 'Natural' ? sealerNatural5g : sealerWet5g)/5))} mat`}
            />
          )}
        </>
      )}

      {/* Travel / Backyard */}
      {(n(layoutHrs) > 0 || n(savedCalc.travelHrs) > 0 || n(savedCalc.backyardHrs) > 0 || n(savedCalc.complexityHrs) > 0) && (
        <>
          <SectionLabel title="Adjustments" />
          {n(layoutHrs) > 0 && <LineRow label="Layout Time" value={fh(n(layoutHrs)) || '—'} />}
          {n(savedCalc.travelHrs) > 0 && <LineRow label="Travel (truck distance)" value={fh(n(savedCalc.travelHrs)) || '—'} sub={`${distanceLF} LF from truck`} />}
          {n(savedCalc.backyardHrs) > 0 && <LineRow label="Backyard Congestion" value={fh(n(savedCalc.backyardHrs)) || '—'} sub={`${pctBackyard}% in backyard`} />}
          {n(savedCalc.complexityHrs) > 0 && <LineRow label="Forming Complexity" value={fh(n(savedCalc.complexityHrs)) || '—'} />}
        </>
      )}

      {/* Finish sub cost */}
      {n(savedCalc.finishSubCost) > 0 && (
        <>
          <SectionLabel title="Finish Sub Cost" />
          <LineRow label={finishType} value={fmt(n(savedCalc.finishSubCost))} highlight />
        </>
      )}

      {/* Manual */}
      {manualFiltered.length > 0 && (
        <>
          <SectionLabel title="Manual Entry" />
          {manualFiltered.map((r, i) => (
            <div key={i} className="py-1 border-b border-gray-50">
              <p className="text-xs font-medium text-gray-700">{r.label}</p>
              <div className="flex gap-3 mt-0.5">
                {n(r.hours)     > 0 && <span className="text-xs text-gray-500">{n(r.hours).toFixed(1)} hrs</span>}
                {n(r.materials) > 0 && <span className="text-xs text-gray-500">{fmt2(r.materials)} mat.</span>}
                {n(r.subCost)   > 0 && <span className="text-xs text-gray-500">{fmt2(r.subCost)} sub</span>}
              </div>
            </div>
          ))}
        </>
      )}

      <FinancialSummaryList
        totalHrs={totalHrs} manDays={manDays} totalMat={totalMat}
        laborCost={laborCost} lrph={n(laborRatePerHour)} burden={burden}
        subCost={subCost} gp={gp} commission={commission} price={priceTotal}
      />
    </div>
  )
}
