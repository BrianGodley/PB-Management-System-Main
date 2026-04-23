// ─────────────────────────────────────────────────────────────────────────────
// LightingSummary — read-only Panel 3 detail view for a saved Lighting module
// ─────────────────────────────────────────────────────────────────────────────

const FIXTURE_TYPES = [
  { key: 'spotLights',  label: 'Spot Lights',          unit: 'ea'  },
  { key: 'floodLights', label: 'Flood Lights',          unit: 'ea'  },
  { key: 'wallWasher',  label: 'Wall Washer Lights',    unit: 'ea'  },
  { key: 'pathLights',  label: 'Path Lights',           unit: 'ea'  },
  { key: 'stepLights',  label: 'Step Lights',           unit: 'ea'  },
  { key: 'bistro',      label: 'Bistro Lighting',       unit: 'LF'  },
]

const TRANSFORMER_TYPES = [
  { key: 'xfrm100',  label: '100 Watt'  },
  { key: 'xfrm200',  label: '200 Watt'  },
  { key: 'xfrm300',  label: '300 Watt'  },
  { key: 'xfrm600',  label: '600 Watt'  },
  { key: 'xfrm900',  label: '900 Watt'  },
  { key: 'xfrm1200', label: '1200 Watt' },
]

const WIRE_ITEMS = [
  { key: 'wire250',    label: "12x2 E. Wiring × 250'" },
  { key: 'wirePerFt',  label: '12x2 E. Wiring (per ft)' },
  { key: 'fxTimer',    label: 'Fx Timer' },
  { key: 'bistroWire', label: 'Bistro Wire (per ft)' },
]

const n = (v) => parseFloat(v) || 0

function SectionLabel({ title }) {
  return (
    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mt-4 mb-1 border-t border-gray-100 pt-3">
      {title}
    </p>
  )
}

function LineRow({ label, value, sub }) {
  return (
    <div className="flex items-start justify-between py-1 border-b border-gray-50">
      <span className="text-xs text-gray-600 flex-1 pr-2">{label}</span>
      <div className="text-right shrink-0">
        <span className="text-xs text-gray-700">{value}</span>
        {sub && <p className="text-xs text-gray-400">{sub}</p>}
      </div>
    </div>
  )
}

import FinancialSummaryList from './FinancialSummaryList'

export default function LightingSummary({ module }) {
  const data = module?.data || {}
  const {
    difficulty       = 0,
    fixtureQtys      = {},
    transformerQtys  = {},
    wireQtys         = {},
    manualRows       = [],
    laborRatePerHour = 35,
    calc             = {},
  } = data

  const fixtureLines = FIXTURE_TYPES
    .map(f => {
      const qty = n(fixtureQtys[f.key])
      if (!qty) return null
      return { key: f.key, label: `${f.label} × ${qty} ${f.unit}` }
    })
    .filter(Boolean)

  const transformerLines = TRANSFORMER_TYPES
    .map(t => {
      const qty = n(transformerQtys[t.key])
      if (!qty) return null
      return { key: t.key, label: `${t.label} Transformer × ${qty}` }
    })
    .filter(Boolean)

  const wireLines = WIRE_ITEMS
    .map(w => {
      const qty = n(wireQtys[w.key])
      if (!qty) return null
      return { key: w.key, label: `${w.label} × ${qty}` }
    })
    .filter(Boolean)

  const manualLines = manualRows.filter(r => n(r.hours) > 0 || n(r.materials) > 0 || n(r.subCost) > 0)

  const totalHrs  = n(calc.totalHrs)
  const manDays   = n(calc.manDays)   || n(module.man_days)
  const totalMat  = n(calc.totalMat)  || n(module.material_cost)
  const laborCost = n(calc.laborCost) || (totalHrs * n(laborRatePerHour))
  const burden    = n(calc.burden)
  const gp        = n(calc.gp)
  const commission = n(calc.commission) || gp * 0.12
  const subCost   = n(calc.subCost)
  const price     = n(calc.price)
  const totalWatts = n(calc.totalWatts)
  const totalVA    = n(calc.totalVA)
  const rawMat     = n(calc.rawMat)
  const markedUpMat = n(calc.markedUpMat)

  const fmt  = (v) => `$${Math.round(v).toLocaleString()}`
  const fmt2 = (v) => `$${n(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  return (
    <div className="space-y-1 text-sm">

      {/* Top stats */}
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

      {/* Watts / VA badges */}
      {totalWatts > 0 && (
        <div className="flex gap-2">
          <span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded font-medium">
            {totalWatts.toFixed(1)} W
          </span>
          <span className="text-xs bg-purple-50 text-purple-700 px-2 py-1 rounded font-medium">
            {totalVA.toFixed(1)} VA
          </span>
          {n(difficulty) > 0 && (
            <span className="text-xs bg-amber-50 text-amber-700 px-2 py-1 rounded font-medium">
              +{difficulty}% difficulty
            </span>
          )}
        </div>
      )}

      {/* Line items */}
      {fixtureLines.length > 0 && (
        <>
          <SectionLabel title="Fixtures" />
          {fixtureLines.map(l => <LineRow key={l.key} label={l.label} />)}
        </>
      )}

      {transformerLines.length > 0 && (
        <>
          <SectionLabel title="Transformers" />
          {transformerLines.map(l => <LineRow key={l.key} label={l.label} />)}
        </>
      )}

      {wireLines.length > 0 && (
        <>
          <SectionLabel title="Wire & Other" />
          {wireLines.map(l => <LineRow key={l.key} label={l.label} />)}
        </>
      )}

      {markedUpMat > 0 && (
        <p className="text-xs text-gray-400 mt-1">
          {fmt2(rawMat)} raw materials + 15% markup = <span className="text-gray-600 font-medium">{fmt2(markedUpMat)}</span>
        </p>
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

      <FinancialSummaryList
        totalHrs={totalHrs} manDays={manDays} totalMat={totalMat}
        laborCost={laborCost} lrph={n(laborRatePerHour)} burden={burden}
        subCost={subCost} gp={gp} commission={commission} price={price}
      />
    </div>
  )
}
