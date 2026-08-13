import FinancialSummaryList from './FinancialSummaryList'

// ─────────────────────────────────────────────────────────────────────────────
// WeedAbatementSummary — read-only detail view for a saved Weed Abatement
// module. Mirrors FinishesSummary: recomputes nothing, just reads the saved
// `calc` snapshot and renders the shared financial summary plus a compact
// per-tab breakdown (strict $/SF on Sub, labor hours + material In-House).
// ─────────────────────────────────────────────────────────────────────────────

const n = v => parseFloat(v) || 0
const fmt = v =>
  '$' + (parseFloat(v) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })

function SectionLabel({ title }) {
  return (
    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mt-4 mb-1 border-t border-gray-100 pt-3">
      {title}
    </p>
  )
}

function LineRow({ label, value, sub, highlight }) {
  return (
    <div
      className={`flex items-start justify-between py-1 border-b border-gray-50 ${highlight ? 'font-semibold' : ''}`}
    >
      <span className={`text-xs ${highlight ? 'text-gray-800' : 'text-gray-600'} flex-1 pr-2`}>
        {label}
      </span>
      <div className="text-right shrink-0">
        <span className={`text-xs ${highlight ? 'text-gray-900 font-semibold' : 'text-gray-700'}`}>
          {value}
        </span>
        {sub && <p className="text-xs text-gray-400">{sub}</p>}
      </div>
    </div>
  )
}

export default function WeedAbatementSummary({ module }) {
  const data = module?.data || {}
  const isSub = data.subType === 'Subcontractor'
  const calc = data.calc || {}

  const totalAreaVisits = n(calc.subArea) * n(calc.visits)

  return (
    <div className="text-sm space-y-1">
      {/* Financial summary — FinancialSummaryList takes NAMED props */}
      <FinancialSummaryList
        totalHrs={n(calc.totalHrs)}
        manDays={n(calc.manDays)}
        totalMat={n(calc.totalMat)}
        laborCost={n(calc.laborCost)}
        lrph={n(data.laborRatePerHour) || 35}
        burden={n(calc.burden)}
        subCost={n(calc.subCost)}
        gp={n(calc.gp)}
        subGp={n(calc.subGp)}
        commission={n(calc.commission)}
        price={n(calc.price)}
      />

      {isSub && (
        <div className="flex flex-wrap gap-2 pt-1">
          <span className="text-xs bg-orange-50 text-orange-700 px-2 py-1 rounded font-medium">
            Subcontractor
          </span>
        </div>
      )}

      {/* Subcontractor breakdown — strict $/SF, no labor/hours */}
      {isSub ? (
        <>
          <SectionLabel title="Subcontractor" />
          <LineRow label="Total Area × Visits" value={`${totalAreaVisits.toLocaleString()} Sq Ft`} />
          <LineRow label="Rate" value={`${fmt(calc.subRatePerSF)} / SF`} />
          {n(calc.subFlat) > 0 && <LineRow label="Flat Add" value={fmt(calc.subFlat)} />}
          <LineRow label="Subcontractor Cost" value={fmt(calc.subCost)} highlight />
        </>
      ) : (
        <>
          <SectionLabel title="Labor & Material" />
          <LineRow
            label="Total Hours"
            value={`${n(calc.totalHrs).toFixed(2)} hrs`}
            sub={`${n(calc.manDays).toFixed(2)} MD`}
          />
          {n(calc.travelHrs) > 0 && (
            <LineRow label="Travel" value={`${n(calc.travelHrs).toFixed(2)} hrs`} />
          )}
          {n(calc.flatHrs) > 0 && (
            <LineRow label="Flat Labor" value={`${n(calc.flatHrs).toFixed(2)} hrs`} />
          )}
          {n(calc.hillHrs) > 0 && (
            <LineRow label="Hillside Labor" value={`${n(calc.hillHrs).toFixed(2)} hrs`} />
          )}
          <LineRow label="Material Cost" value={fmt(calc.totalMat)} highlight />
        </>
      )}
    </div>
  )
}
