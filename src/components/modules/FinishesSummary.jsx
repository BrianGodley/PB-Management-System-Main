import FinancialSummaryList from './FinancialSummaryList'

// ─────────────────────────────────────────────────────────────────────────────
// FinishesSummary — read-only detail view for a saved Finishes module
// ─────────────────────────────────────────────────────────────────────────────

const n   = (v) => parseFloat(v) || 0
const fmt = (v) => `$${n(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

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

export default function FinishesSummary({ module }) {
  const data = module?.data || {}
  const {
    difficulty = 0, hoursAdj = 0,
    tileFlatSF = 0, brickFlatSF = 0, flagstoneFlatSF = 0, porcelainFlatSF = 0,
    capRows = [],
    sandStuccoSF = 0, smoothStuccoSF = 0, ledgerstoneSF = 0, stackedStoneSF = 0,
    tileSF = 0, wallFlagstoneSF = 0, realStoneSF = 0,
    manualRows = [],
    calc = {},
  } = data

  const activeFlatwork = [
    { label: 'Tile Over Slab',        sf: tileFlatSF },
    { label: 'Brick Over Slab',       sf: brickFlatSF },
    { label: 'Flagstone Over Slab',   sf: flagstoneFlatSF },
    { label: 'Porcelain Paver',       sf: porcelainFlatSF },
  ].filter(f => n(f.sf) > 0)

  const activeCaps = (capRows || []).filter(c => c.type && c.type !== 'None' && (n(c.lf) > 0 || n(c.qty) > 0))

  const activeFinishes = [
    { label: 'Sand Stucco',      sf: sandStuccoSF },
    { label: 'Smooth Stucco',    sf: smoothStuccoSF },
    { label: 'Ledgerstone',      sf: ledgerstoneSF },
    { label: 'Stacked Stone',    sf: stackedStoneSF },
    { label: 'Tile',             sf: tileSF },
    { label: 'Real Flagstone',   sf: wallFlagstoneSF },
    { label: 'Real Stone',       sf: realStoneSF },
  ].filter(f => n(f.sf) > 0)

  const financeRows = [
    { label: 'Materials',   value: fmt(calc.totalMat)  },
    { label: 'Labor',       value: fmt(calc.laborCost) },
    { label: 'Burden',      value: fmt(calc.burden)    },
    { label: 'GP',          value: fmt(calc.gp)        },
    { label: 'Commission',  value: fmt(calc.commission)},
    { label: 'Subs',        value: fmt(calc.subCost)   },
    { label: 'Price',       value: fmt(calc.price), highlight: true },
  ]

  return (
    <div className="text-sm space-y-1">

      {/* Financial summary */}
      <FinancialSummaryList rows={financeRows} />

      {/* Flatwork */}
      {activeFlatwork.length > 0 && (
        <>
          <SectionLabel title="Flatwork Finish" />
          {activeFlatwork.map(f => (
            <LineRow key={f.label} label={f.label} value={`${n(f.sf)} SF`} />
          ))}
        </>
      )}

      {/* Wall Caps */}
      {activeCaps.length > 0 && (
        <>
          <SectionLabel title="Wall Caps" />
          {activeCaps.map((cap, i) => (
            <LineRow
              key={i}
              label={cap.type}
              value={cap.type === 'Precast' ? `${n(cap.qty)} pieces` : `${n(cap.lf)} LF`}
              sub={cap.type !== 'Precast' && cap.widthIn ? `${cap.widthIn}" wide` : null}
            />
          ))}
        </>
      )}

      {/* Wall Finishes */}
      {activeFinishes.length > 0 && (
        <>
          <SectionLabel title="Wall Finishes" />
          {activeFinishes.map(f => (
            <LineRow key={f.label} label={f.label} value={`${n(f.sf)} SF`} />
          ))}
        </>
      )}

      {/* Labor breakdown */}
      {(calc.totalHrs || n(difficulty) || n(hoursAdj)) && (
        <>
          <SectionLabel title="Labor" />
          <LineRow label="Total Hours" value={`${(calc.totalHrs || 0).toFixed(2)} hrs`} />
          <LineRow label="Man Days" value={`${(calc.manDays || 0).toFixed(2)} days`} />
          {n(difficulty) > 0 && <LineRow label="Difficulty Add" value={`${n(difficulty)}%`} />}
          {n(hoursAdj) !== 0 && <LineRow label="Hours Adjustment" value={`${n(hoursAdj)} hrs`} />}
        </>
      )}

      {/* Manual */}
      {manualRows.filter(r => n(r.hours) || n(r.materials) || n(r.subCost)).length > 0 && (
        <>
          <SectionLabel title="Manual Entry" />
          {manualRows.filter(r => n(r.hours) || n(r.materials) || n(r.subCost)).map((r, i) => (
            <LineRow key={i} label={r.label || `Misc ${i + 1}`}
              value={n(r.hours) > 0 ? `${n(r.hours)} hrs` : '—'}
              sub={[n(r.materials) > 0 && fmt(r.materials), n(r.subCost) > 0 && `Sub: ${fmt(r.subCost)}`].filter(Boolean).join(' · ')} />
          ))}
        </>
      )}

    </div>
  )
}
