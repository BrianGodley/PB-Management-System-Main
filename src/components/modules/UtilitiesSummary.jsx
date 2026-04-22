import FinancialSummaryList from './FinancialSummaryList'

// ─────────────────────────────────────────────────────────────────────────────
// UtilitiesSummary — read-only detail view for a saved Utilities module
// ─────────────────────────────────────────────────────────────────────────────

const UTILITY_LINE_TYPES = {
  'PVC Conduit with Electrical': { laborPerLF: 0.05,  costPerLF: 1.92, dbName: 'PVC Conduit with Electrical' },
  '1" Black Iron Gas Pipe':      { laborPerLF: 0.15,  costPerLF: 2.76, dbName: '1" Black Iron Gas Pipe'      },
  '1-1/2" Black Iron Gas Pipe':  { laborPerLF: 0.20,  costPerLF: 4.23, dbName: '1-1/2" Black Iron Gas Pipe'  },
}

const FIXTURE_TYPES = {
  '12" Single Gas Ring': { laborHrs: 2, cost: 61.75, dbName: '12" Single Gas Ring' },
}

const TRENCH_MINS_PER_CF = { Trench: 10, Hand: 12.5 }

const ADD_ITEM_RATES = {
  curbCore: { laborHrs: 2, matCost: 250, label: 'Curb Core *',                dbName: 'Curb Core'                },
  hydrocut:  { laborHrs: 2, matCost: 50,  label: 'Hydrocut Under Hardscape *', dbName: 'Hydrocut Under Hardscape' },
}

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

export default function UtilitiesSummary({ module }) {
  const data = module?.data || {}
  const {
    difficulty              = 0,
    hoursAdj                = 0,
    trenchRows              = [],
    lineRows                = [],
    fixtureRows             = [],
    additionalItems         = {},
    electricSubpanelSubCost = 0,
    manualRows              = [],
    laborRatePerHour        = 35,
    materialPrices          = {},
    calc                    = null,
  } = data

  const price = (dbName, fallback) =>
    materialPrices[dbName] != null ? materialPrices[dbName] : fallback

  // ── Trenching ───────────────────────────────────────────────────────────────
  const trenchLines = trenchRows
    .map((r, i) => {
      const lf = n(r.lf), w = n(r.width), d = n(r.depth)
      if (!lf || !w || !d) return null
      const cf  = lf * (w / 12) * (d / 12)
      const hrs = (cf * (TRENCH_MINS_PER_CF[r.equipment] || 10)) / 60
      return { key: i, label: `${r.equipment} — ${lf} LF × ${w}"W × ${d}"D`,
               value: `${hrs.toFixed(2)} hrs`, sub: `${cf.toFixed(1)} CF` }
    })
    .filter(Boolean)

  // ── Utility lines ───────────────────────────────────────────────────────────
  const lineLines = lineRows
    .map((r, i) => {
      const lf   = n(r.lf)
      const rate = UTILITY_LINE_TYPES[r.type]
      if (!lf || !rate) return null
      const costPerLF = price(rate.dbName, rate.costPerLF)
      const mat       = lf * costPerLF
      const hrs       = lf * rate.laborPerLF
      return { key: i, label: `${r.type} — ${lf} LF`,
               value: `$${mat.toFixed(2)}`,
               sub: `${hrs.toFixed(2)} hrs labor  ·  $${costPerLF.toFixed(2)}/LF` }
    })
    .filter(Boolean)

  // ── Fixtures ────────────────────────────────────────────────────────────────
  const fixtureLines = fixtureRows
    .map((r, i) => {
      const qty  = n(r.qty)
      const rate = FIXTURE_TYPES[r.type]
      if (!qty || !rate) return null
      const costEa = price(rate.dbName, rate.cost)
      const mat    = qty * costEa
      const hrs    = qty * rate.laborHrs
      return { key: i, label: `${r.type} × ${qty}`,
               value: `$${mat.toFixed(2)}`,
               sub: `${hrs.toFixed(2)} hrs labor  ·  $${costEa.toFixed(2)}/ea` }
    })
    .filter(Boolean)

  // ── Additional items ────────────────────────────────────────────────────────
  const addLines = Object.entries(ADD_ITEM_RATES)
    .map(([key, rate]) => {
      const qty = n(additionalItems[`${key}Qty`])
      if (!qty) return null
      const matCostEa = price(rate.dbName, rate.matCost)
      return { key, label: rate.label, qty,
               laborHrs: qty * rate.laborHrs, matCost: qty * matCostEa, matCostEa }
    })
    .filter(Boolean)

  // ── Manual rows ─────────────────────────────────────────────────────────────
  const manualLines = manualRows.filter(r => n(r.hours) > 0 || n(r.materials) > 0 || n(r.subCost) > 0)

  const hasAnyLines = trenchLines.length || lineLines.length || fixtureLines.length ||
                      addLines.length || manualLines.length || n(electricSubpanelSubCost) > 0

  // Financials from saved calc or module-level fallbacks
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
      {n(hoursAdj) !== 0 && (
        <div className="flex items-center justify-between text-xs text-blue-700 bg-blue-50 rounded px-3 py-1.5">
          <span>Hours adjustment</span>
          <span className="font-semibold">{n(hoursAdj) > 0 ? '+' : ''}{n(hoursAdj).toFixed(1)} hrs</span>
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

          {lineLines.length > 0 && (
            <>
              <SectionLabel title="Utility Lines" />
              {lineLines.map(l => <LineRow key={l.key} label={l.label} value={l.value} sub={l.sub} />)}
            </>
          )}

          {fixtureLines.length > 0 && (
            <>
              <SectionLabel title="Gas Fixtures" />
              {fixtureLines.map(l => <LineRow key={l.key} label={l.label} value={l.value} sub={l.sub} />)}
            </>
          )}

          {(addLines.length > 0 || n(electricSubpanelSubCost) > 0) && (
            <>
              <SectionLabel title="Additional Items" />
              {n(electricSubpanelSubCost) > 0 && (
                <LineRow label="Electric Sub-panel" value={fmt2(electricSubpanelSubCost)} sub="sub cost" />
              )}
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
