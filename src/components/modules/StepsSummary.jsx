import FinancialSummaryList from './FinancialSummaryList'

// ─────────────────────────────────────────────────────────────────────────────
// StepsSummary — read-only detail view for a saved Steps module
// ─────────────────────────────────────────────────────────────────────────────

const n   = v => parseFloat(v) || 0
const fmt2 = v => `$${(v || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

function SectionLabel({ title }) {
  return (
    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mt-4 mb-1 border-t border-gray-100 pt-3">
      {title}
    </p>
  )
}

function LineRow({ label, value, highlight }) {
  return (
    <div className={`flex items-center justify-between py-1 border-b border-gray-50 ${highlight ? 'font-semibold' : ''}`}>
      <span className={`text-xs ${highlight ? 'text-gray-800' : 'text-gray-600'} pr-2`}>{label}</span>
      <span className={`text-xs shrink-0 ${highlight ? 'text-gray-900 font-semibold' : 'text-gray-700'}`}>{value}</span>
    </div>
  )
}

export default function StepsSummary({ module }) {
  const data = module?.data || {}
  const {
    difficulty = 0, hoursAdj = 0,
    straightLF = 0, curvedLF = 0, groutedBullnose = false,
    paverBrand = '', paverName = '', paverSF = 0,
    manualRows = [],
    calc = {},
  } = data

  const hasSteps   = n(straightLF) > 0 || n(curvedLF) > 0
  const hasPaver   = n(paverSF) > 0 && paverBrand
  const activeMan  = manualRows.filter(r => n(r.hours) > 0 || n(r.materials) > 0 || n(r.subCost) > 0)

  return (
    <div>
      <FinancialSummaryList module={module} />

      {/* Paver Steps */}
      {(hasSteps || hasPaver) && (
        <>
          <SectionLabel title="Paver Steps" />
          {n(straightLF) > 0 && (
            <LineRow label="Straight Steps"
              value={`${n(straightLF)} LF${calc.straightHrs ? ` · ${calc.straightHrs.toFixed(2)} hrs` : ''}`} />
          )}
          {n(curvedLF) > 0 && (
            <LineRow label="Curved Steps"
              value={`${n(curvedLF)} LF${calc.curvedHrs ? ` · ${calc.curvedHrs.toFixed(2)} hrs` : ''}`} />
          )}
          {groutedBullnose && <LineRow label="Grouted / Bullnose" value="Yes" />}
          {hasPaver && (
            <>
              <LineRow label="Step Paver" value={`${paverBrand} — ${paverName}`} />
              <LineRow label="Paver SF" value={`${n(paverSF)} SF`} />
              {calc.pallets > 0 && <LineRow label="Pallets" value={`${calc.pallets}`} />}
              {calc.paverCost > 0 && <LineRow label="Paver Cost" value={fmt2(calc.paverCost)} highlight />}
            </>
          )}
        </>
      )}

      {/* Manual entry */}
      {activeMan.length > 0 && (
        <>
          <SectionLabel title="Manual Entry" />
          {activeMan.map((r, i) => (
            <LineRow key={i} label={r.label || `Misc ${i + 1}`}
              value={[
                n(r.hours) > 0     ? `${n(r.hours)} hrs` : null,
                n(r.materials) > 0 ? fmt2(r.materials) + ' mat' : null,
                n(r.subCost) > 0   ? fmt2(r.subCost) + ' sub'  : null,
              ].filter(Boolean).join(' · ')} />
          ))}
        </>
      )}

      {/* Labor breakdown */}
      <SectionLabel title="Labor" />
      {n(straightLF) > 0 && calc.straightHrs > 0 && (
        <LineRow label={`Straight (${calc.straightRate} LF/hr)`} value={`${calc.straightHrs.toFixed(2)} hrs`} />
      )}
      {n(curvedLF) > 0 && calc.curvedHrs > 0 && (
        <LineRow label={`Curved (${calc.curvedRate} LF/hr)`} value={`${calc.curvedHrs.toFixed(2)} hrs`} />
      )}
      {n(difficulty) > 0 && <LineRow label="Difficulty Add" value={`${n(difficulty)}%`} />}
      {n(hoursAdj) !== 0 && <LineRow label="Hours Adjustment" value={`${n(hoursAdj) > 0 ? '+' : ''}${n(hoursAdj)}`} />}
      <LineRow label="Total Hours" value={`${n(calc.totalHrs).toFixed(2)} hrs`} highlight />
    </div>
  )
}
