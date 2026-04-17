// ─────────────────────────────────────────────────────────────────────────────
// DrainageSummary — read-only detail view for a saved Drainage module
// Rendered in Panel 3 of EstimateDetail when a Drainage module is selected.
// Uses materialPrices saved at module-save time so line items always reflect
// the prices that were in effect when the estimate was built.
// ─────────────────────────────────────────────────────────────────────────────

// dbName must match the name column in material_rates exactly
const PIPE_TYPES = {
  '4" SDR 35':      { laborPerLF: 0.0495, costPerLF: 2.26, dbName: '4" SDR 35 Pipe'      },
  '3" SDR 35':      { laborPerLF: 0.045,  costPerLF: 1.48, dbName: '3" SDR 35 Pipe'      },
  '6" SDR 35':      { laborPerLF: 0.06,   costPerLF: 3.72, dbName: '6" SDR 35 Pipe'      },
  '4" Triple Wall': { laborPerLF: 0.05,   costPerLF: 1.03, dbName: '4" Triple Wall Pipe' },
  '3" Triple Wall': { laborPerLF: 0.045,  costPerLF: 0.86, dbName: '3" Triple Wall Pipe' },
  '4" Perforated':  { laborPerLF: 0.05,   costPerLF: 2.26, dbName: '4" Perforated Pipe'  },
  '3" Perforated':  { laborPerLF: 0.045,  costPerLF: 1.48, dbName: '3" Perforated Pipe'  },
}

const FIXTURE_TYPES = {
  '3" Area Drain':         { laborHrs: 0.495, cost: 3.27,  dbName: '3" Area Drain'         },
  '4" Area Drain':         { laborHrs: 0.495, cost: 1.90,  dbName: '4" Area Drain'         },
  '3" Atrium Drain':       { laborHrs: 0.495, cost: 9.59,  dbName: '3" Atrium Drain'       },
  '4" Atrium Drain':       { laborHrs: 0.495, cost: 7.19,  dbName: '4" Atrium Drain'       },
  '4" Brass Area Drain':   { laborHrs: 0.495, cost: 16.36, dbName: '4" Brass Area Drain'   },
  '3" Brass Area Drain':   { laborHrs: 0.495, cost: 16.36, dbName: '3" Brass Area Drain'   },
  'Downspout Connector':   { laborHrs: 0.495, cost: 7.01,  dbName: 'Downspout Connector'   },
  '4" Paver Top Inlet':    { laborHrs: 0.75,  cost: 23.63, dbName: '4" Paver Top Inlet'    },
  '9" x 9" Catch Basin':   { laborHrs: 0.495, cost: 16.90, dbName: '9" x 9" Catch Basin'   },
  '12" x 12" Catch Basin': { laborHrs: 0.495, cost: 21.60, dbName: '12" x 12" Catch Basin' },
}

const ADD_ITEM_RATES = {
  pumpVault: { laborHrs: 5, matCost: 275,  label: 'Pump Vault',                 dbName: 'Pump Vault'               },
  sumpPump:  { laborHrs: 3, matCost: 650,  label: 'Sump Pump',                  dbName: 'Sump Pump'                },
  curbCore:  { laborHrs: 2, matCost: 250,  label: 'Curb Core *',                dbName: 'Curb Core'                },
  hydrocut:  { laborHrs: 2, matCost: 50,   label: 'Hydrocut Under Hardscape *', dbName: 'Hydrocut Under Hardscape' },
}

const TRENCH_MINS_PER_CF = { Trench: 10, Hand: 12.5 }
const DRAIN_FITTING_FEE  = 10

const n = (v) => parseFloat(v) || 0

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
      <span className={`text-xs ${highlight ? 'text-gray-800' : 'text-gray-600'} flex-1 pr-2`}>{label}</span>
      <div className="text-right shrink-0">
        <span className={`text-xs ${highlight ? 'text-gray-900 font-semibold' : 'text-gray-700'}`}>{value}</span>
        {sub && <p className="text-xs text-gray-400">{sub}</p>}
      </div>
    </div>
  )
}

import FinancialSummaryList from './FinancialSummaryList'

export default function DrainageSummary({ module }) {
  const data = module?.data || {}
  const {
    difficulty       = 0,
    trenchRows       = [],
    pipeRows         = [],
    fixtureRows      = [],
    additionalItems  = {},
    manualRows       = [],
    laborRatePerHour = 35,
    materialPrices   = {},   // snapshot of prices at save time
    calc             = null,
  } = data

  // Resolve a price: use saved materialPrices snapshot first, fall back to hardcoded default
  const price = (dbName, fallback) =>
    materialPrices[dbName] != null ? materialPrices[dbName] : fallback

  // ── Trenching rows ──────────────────────────────────────────────────────────
  const trenchLines = trenchRows
    .map((r, i) => {
      const lf = n(r.lf), w = n(r.width), d = n(r.depth)
      if (!lf || !w || !d) return null
      const cf  = lf * (w / 12) * (d / 12)
      const hrs = (cf * (TRENCH_MINS_PER_CF[r.equipment] || 10)) / 60
      return {
        key: i,
        label: `${r.equipment} — ${lf} LF × ${w}"W × ${d}"D`,
        value: `${hrs.toFixed(2)} hrs`,
        sub:   `${cf.toFixed(1)} CF`,
      }
    })
    .filter(Boolean)

  // ── Pipe rows ───────────────────────────────────────────────────────────────
  const pipeLines = pipeRows
    .map((r, i) => {
      const lf   = n(r.lf)
      const rate = PIPE_TYPES[r.type]
      if (!lf || !rate) return null
      const costPerLF = price(rate.dbName, rate.costPerLF)
      const mat       = lf * costPerLF
      const hrs       = lf * rate.laborPerLF
      return {
        key:   i,
        label: `${r.type} — ${lf} LF`,
        value: `$${mat.toFixed(2)}`,
        sub:   `${hrs.toFixed(2)} hrs labor  ·  $${costPerLF.toFixed(2)}/LF`,
      }
    })
    .filter(Boolean)

  // ── Fixture rows ────────────────────────────────────────────────────────────
  const fixtureLines = fixtureRows
    .map((r, i) => {
      const qty  = n(r.qty)
      const rate = FIXTURE_TYPES[r.type]
      if (!qty || !rate) return null
      const costEa = price(rate.dbName, rate.cost)
      const mat    = qty * costEa
      const hrs    = qty * rate.laborHrs
      return {
        key:   i,
        label: `${r.type} × ${qty}`,
        value: `$${mat.toFixed(2)}`,
        sub:   `${hrs.toFixed(2)} hrs labor  ·  $${costEa.toFixed(2)}/ea`,
      }
    })
    .filter(Boolean)

  // ── Additional items ────────────────────────────────────────────────────────
  const addLines = Object.entries(ADD_ITEM_RATES)
    .map(([key, rate]) => {
      const qty = n(additionalItems[`${key}Qty`])
      if (!qty) return null
      const matCostEa = price(rate.dbName, rate.matCost)
      return {
        key,
        label:    rate.label,
        qty,
        laborHrs: qty * rate.laborHrs,
        matCost:  qty * matCostEa,
        matCostEa,
      }
    })
    .filter(Boolean)

  // ── Manual rows ─────────────────────────────────────────────────────────────
  const manualLines = manualRows.filter(r => n(r.hours) > 0 || n(r.materials) > 0 || n(r.subCost) > 0)

  const hasAnyLines = trenchLines.length || pipeLines.length || fixtureLines.length || addLines.length || manualLines.length

  // Use saved calc if available, else fall back to module-level totals
  const savedCalc  = calc || {}
  const totalHrs   = n(savedCalc.totalHrs)
  const manDays    = n(savedCalc.manDays)    || n(module.man_days)
  const totalMat   = n(savedCalc.totalMat)   || n(module.material_cost)
  const laborCost  = n(savedCalc.laborCost)  || (totalHrs * n(laborRatePerHour))
  const burden     = n(savedCalc.burden)
  const gp         = n(savedCalc.gp)
  const commission = n(savedCalc.commission) || gp * 0.12
  const subCost    = n(savedCalc.subCost)
  const priceTotal = n(savedCalc.price)

  const fmt  = (v) => `$${Math.round(v).toLocaleString()}`
  const fmt2 = (v) => `$${n(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  return (
    <div className="space-y-1 text-sm">

      {/* Top stat bar */}
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

      {n(difficulty) > 0 && (
        <div className="flex items-center justify-between text-xs text-amber-700 bg-amber-50 rounded px-3 py-1.5">
          <span>Difficulty modifier applied</span>
          <span className="font-semibold">+{difficulty}%</span>
        </div>
      )}

      {/* Line items */}
      {!hasAnyLines ? (
        <p className="text-xs text-gray-400 text-center py-4">No line items entered.</p>
      ) : (
        <>
          {trenchLines.length > 0 && (
            <>
              <SectionLabel title="Trenching" />
              {trenchLines.map(l => <LineRow key={l.key} label={l.label} value={l.value} sub={l.sub} />)}
            </>
          )}

          {pipeLines.length > 0 && (
            <>
              <SectionLabel title="Drain Pipe" />
              {pipeLines.map(l => <LineRow key={l.key} label={l.label} value={l.value} sub={l.sub} />)}
            </>
          )}

          {fixtureLines.length > 0 && (
            <>
              <SectionLabel title="Drains & Fixtures" />
              {fixtureLines.map(l => <LineRow key={l.key} label={l.label} value={l.value} sub={l.sub} />)}
            </>
          )}

          {addLines.length > 0 && (
            <>
              <SectionLabel title="Additional Items" />
              {addLines.map(a => (
                <LineRow
                  key={a.key}
                  label={`${a.label} × ${a.qty}`}
                  value={fmt2(a.matCost)}
                  sub={`${a.laborHrs.toFixed(1)} hrs labor  ·  $${a.matCostEa.toFixed(2)}/ea`}
                />
              ))}
              {additionalItems.permitRequired && (
                <p className="text-xs text-amber-600 mt-1">⚠ Permit required</p>
              )}
            </>
          )}

          {manualLines.length > 0 && (
            <>
              <SectionLabel title="Manual Entry" />
              {manualLines.map((r, i) => (
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
