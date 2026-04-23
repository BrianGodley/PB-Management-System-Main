// ─────────────────────────────────────────────────────────────────────────────
// IrrigationSummary — read-only detail view for a saved Irrigation module
// All rates pulled from the saved snapshot with fallbacks.
// ─────────────────────────────────────────────────────────────────────────────

const ZONE_TYPES = [
  { key: 'planterSpray', label: 'Planter Spray Heads',           defaultMode: 'Hand',   matKey: 'Irrigation Zone - Planter Spray',   matFallback: 345 },
  { key: 'lawn',         label: 'Lawn Zone (≤ 1,000 SF)',        defaultMode: 'Trench', matKey: 'Irrigation Zone - Lawn',             matFallback: 345 },
  { key: 'hillside',     label: 'Hillside Zone (≤ 6 big heads)', defaultMode: 'Hand',   matKey: 'Irrigation Zone - Hillside',         matFallback: 345 },
  { key: 'dripPlant',    label: 'Drip per Plant (≤ 50 emitters)',defaultMode: 'Trench', matKey: 'Irrigation Zone - Drip per Plant',   matFallback: 230 },
  { key: 'dripline',     label: 'Planter Dripline (≤ 700 SF)',   defaultMode: 'Trench', matKey: 'Irrigation Zone - Planter Dripline', matFallback: 345 },
]

const TIMER_TYPES = [
  { key: 'timer4',    label: '4 Station',                   matKey: 'Irrigation Timer - 4 Station',                   matFallback:   69.00 },
  { key: 'timer6',    label: '6 Station',                   matKey: 'Irrigation Timer - 6 Station',                   matFallback:  138.00 },
  { key: 'timer9',    label: '9 Station',                   matKey: 'Irrigation Timer - 9 Station',                   matFallback:  184.00 },
  { key: 'timer12',   label: '12 Station',                  matKey: 'Irrigation Timer - 12 Station',                  matFallback:  270.25 },
  { key: 'timer15',   label: '15 Station',                  matKey: 'Irrigation Timer - 15 Station',                  matFallback:  322.00 },
  { key: 'timer18',   label: '18 Station',                  matKey: 'Irrigation Timer - 18 Station',                  matFallback:  402.50 },
  { key: 'timerICC8', label: 'Hunter ICC 8 Station',        matKey: 'Irrigation Timer - Hunter ICC 8 Station',        matFallback:  345.00 },
  { key: 'timerAdd8', label: 'Additional 8 Station Module', matKey: 'Irrigation Timer - Additional 8 Station Module', matFallback:  115.00 },
]

const RATE_DEFAULTS = { handRate: 16, trenchRate: 12.5, timerHrs: 0.5, salesTax: 0.095 }

const n = v => parseFloat(v) || 0

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

export default function IrrigationSummary({ module }) {
  const data = module?.data || {}
  const {
    difficulty       = 0,
    hoursAdj         = 0,
    zoneQtys         = {},
    zoneModes        = {},
    timerQtys        = {},
    manualRows       = [],
    laborRatePerHour = 35,
    materialPrices   = {},
    laborRates       = {},
    salesTax         = RATE_DEFAULTS.salesTax,
    calc             = null,
  } = data

  const mp = materialPrices || {}
  const lr = laborRates    || {}

  const handRate   = lr['Irrigation - Hand Zone']     ?? RATE_DEFAULTS.handRate
  const trenchRate = lr['Irrigation - Trench Zone']   ?? RATE_DEFAULTS.trenchRate
  const timerHrs   = lr['Irrigation - Timer Install'] ?? RATE_DEFAULTS.timerHrs

  // Re-derive zone lines — rate is hrs/zone, so hrs = rate × qty
  const zoneCalc = ZONE_TYPES.map(z => {
    const qty  = n(zoneQtys[z.key])
    const mode = zoneModes[z.key] || z.defaultMode
    const rate = mode === 'Hand' ? handRate : trenchRate
    const hrs  = qty > 0 ? qty * rate : 0
    const mat  = qty * (mp[z.matKey] ?? z.matFallback)
    return { qty, mode, rate, hrs, mat }
  })

  // Re-derive timer lines
  const timerCalc = TIMER_TYPES.map(t => {
    const qty = n(timerQtys[t.key])
    const hrs = qty * timerHrs
    const mat = qty * (mp[t.matKey] ?? t.matFallback)
    return { qty, hrs, mat }
  })

  const manualFiltered = manualRows.filter(r =>
    n(r.hours) > 0 || n(r.materials) > 0 || n(r.subCost) > 0
  )

  // Use saved calc snapshot
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

  const fmt2 = v => `$${n(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  const fmt  = v => `$${Math.round(v).toLocaleString()}`
  const fh   = v => v > 0 ? `${v.toFixed(2)} hrs` : null

  const hasZones   = zoneCalc.some(r => r.qty > 0)
  const hasTimers  = timerCalc.some(r => r.qty > 0)
  const hasLines   = hasZones || hasTimers || manualFiltered.length > 0

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

      {/* Settings badges */}
      <div className="flex gap-2 flex-wrap mb-1">
        {n(difficulty) > 0 && (
          <span className="text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded">+{difficulty}% difficulty</span>
        )}
        {n(hoursAdj) !== 0 && (
          <span className="text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded">
            {n(hoursAdj) > 0 ? '+' : ''}{hoursAdj} hrs adj
          </span>
        )}
      </div>

      {!hasLines ? (
        <p className="text-xs text-gray-400 text-center py-4">No line items entered.</p>
      ) : (
        <>
          {/* Zones */}
          {hasZones && (
            <>
              <SectionLabel title="Irrigation Zones" />
              {ZONE_TYPES.map((z, i) => {
                const cr = zoneCalc[i]
                if (!cr || cr.qty === 0) return null
                return (
                  <LineRow key={z.key}
                    label={`${z.label} × ${cr.qty}`}
                    value={fh(cr.hrs) || '—'}
                    sub={`${cr.mode} · ${cr.rate} zones/hr${cr.mat > 0 ? ` · ${fmt2(cr.mat)} mat` : ''}`}
                  />
                )
              })}
            </>
          )}

          {/* Timers */}
          {hasTimers && (
            <>
              <SectionLabel title="Controllers / Timers" />
              {TIMER_TYPES.map((t, i) => {
                const cr = timerCalc[i]
                if (!cr || cr.qty === 0) return null
                return (
                  <LineRow key={t.key}
                    label={`${t.label} × ${cr.qty}`}
                    value={fh(cr.hrs) || '—'}
                    sub={`${timerHrs} hrs/ea${cr.mat > 0 ? ` · ${fmt2(cr.mat)} mat` : ''}`}
                  />
                )
              })}
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
