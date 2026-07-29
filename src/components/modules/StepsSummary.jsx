import FinancialSummaryList from './FinancialSummaryList'

// ─────────────────────────────────────────────────────────────────────────────
// StepsSummary — read-only detail view for a saved Steps module. Reads the
// per-tab row structure (paverRows / concRows / manualRows, or their sub*
// counterparts) based on the module's saved subType.
// ─────────────────────────────────────────────────────────────────────────────

const n = v => parseFloat(v) || 0
const fmt2 = v =>
  `$${(v || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

function SectionLabel({ title }) {
  return (
    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mt-4 mb-1 border-t border-gray-100 pt-3">
      {title}
    </p>
  )
}

function LineRow({ label, value, highlight }) {
  return (
    <div
      className={`flex items-center justify-between py-1 border-b border-gray-50 ${highlight ? 'font-semibold' : ''}`}
    >
      <span className={`text-xs ${highlight ? 'text-gray-800' : 'text-gray-600'} pr-2`}>{label}</span>
      <span
        className={`text-xs shrink-0 ${highlight ? 'text-gray-900 font-semibold' : 'text-gray-700'}`}
      >
        {value}
      </span>
    </div>
  )
}

export default function StepsSummary({ module }) {
  const data = module?.data || {}
  const {
    subType = 'In-House',
    difficulty = 0,
    hoursAdj = 0,
    calc = {},
  } = data
  const isSub = subType === 'Subcontractor'

  const paverRows = (isSub ? data.subPaverRows : data.paverRows) || []
  const concRows = (isSub ? data.subConcRows : data.concRows) || []
  const manualRows = (isSub ? data.subManualRows : data.manualRows) || []

  const activePaver = paverRows.filter(r => n(r.sf) > 0)
  const activeConc = concRows.filter(r => n(r.sf) > 0)
  const activeMan = manualRows.filter(r => n(r.hours) > 0 || n(r.materials) > 0 || n(r.subCost) > 0)

  return (
    <div>
      <FinancialSummaryList module={module} />

      {/* Paver Steps */}
      {activePaver.length > 0 && (
        <>
          <SectionLabel title="Paver Steps" />
          {activePaver.map((r, i) => (
            <LineRow
              key={i}
              label={[r.type || 'Paver', r.form, r.grouted ? 'grouted' : null]
                .filter(Boolean)
                .join(' · ')}
              value={`${n(r.sf)} SF`}
            />
          ))}
        </>
      )}

      {/* Concrete Steps */}
      {activeConc.length > 0 && (
        <>
          <SectionLabel title="Concrete Steps" />
          {activeConc.map((r, i) => (
            <LineRow
              key={i}
              label={[r.type, r.finish, r.form].filter(Boolean).join(' · ')}
              value={`${n(r.sf)} SF`}
            />
          ))}
        </>
      )}

      {/* Manual entry */}
      {activeMan.length > 0 && (
        <>
          <SectionLabel title="Manual Entry" />
          {activeMan.map((r, i) => (
            <LineRow
              key={i}
              label={r.label || `Misc ${i + 1}`}
              value={[
                n(r.hours) > 0 ? `${n(r.hours)} hrs` : null,
                n(r.materials) > 0 ? fmt2(r.materials) + ' mat' : null,
                n(r.subCost) > 0 ? fmt2(r.subCost) + ' sub' : null,
              ]
                .filter(Boolean)
                .join(' · ')}
            />
          ))}
        </>
      )}

      {/* Totals */}
      <SectionLabel title="Labor" />
      {n(difficulty) > 0 && <LineRow label="Difficulty Add" value={`${n(difficulty)}%`} />}
      {n(hoursAdj) !== 0 && (
        <LineRow label="Hours Adjustment" value={`${n(hoursAdj) > 0 ? '+' : ''}${n(hoursAdj)}`} />
      )}
      <LineRow label="Total Hours" value={`${n(calc.totalHrs).toFixed(2)} hrs`} highlight />
    </div>
  )
}
