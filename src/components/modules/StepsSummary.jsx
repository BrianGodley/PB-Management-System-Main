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

  const MAT_SECTIONS = [
    { title: 'Paver Steps', rows: 'paverRows', sub: 'subPaverRows' },
    { title: 'Brick Steps', rows: 'brickRows', sub: 'subBrickRows' },
    { title: 'Tiled Steps', rows: 'tileRows', sub: 'subTileRows' },
    { title: 'Flagstone Steps', rows: 'flagRows', sub: 'subFlagRows' },
  ]
  const matSections = MAT_SECTIONS.map(sec => ({
    title: sec.title,
    rows: ((isSub ? data[sec.sub] : data[sec.rows]) || []).filter(r => n(r.sf) > 0),
  })).filter(s => s.rows.length > 0)

  const concRows = (isSub ? data.subConcRows : data.concRows) || []
  const manualRows = (isSub ? data.subManualRows : data.manualRows) || []

  const activeConc = concRows.filter(r => n(r.sf) > 0)
  const activeMan = manualRows.filter(r => n(r.hours) > 0 || n(r.materials) > 0 || n(r.subCost) > 0)

  return (
    <div>
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

      {/* Vendor/Type step sections */}
      {matSections.map(sec => (
        <div key={sec.title}>
          <SectionLabel title={sec.title} />
          {sec.rows.map((r, i) => (
            <LineRow
              key={i}
              label={[r.type || sec.title.replace(' Steps', ''), r.form, r.grouted ? 'grouted' : null]
                .filter(Boolean)
                .join(' · ')}
              value={`${n(r.sf)} ${isSub ? 'LF' : 'SF'}`}
            />
          ))}
        </div>
      ))}

      {/* Concrete Steps */}
      {activeConc.length > 0 && (
        <>
          <SectionLabel title="Concrete Steps" />
          {activeConc.map((r, i) => (
            <LineRow
              key={i}
              label={[r.type, r.finish, r.form].filter(Boolean).join(' · ')}
              value={`${n(r.sf)} ${isSub ? 'LF' : 'SF'}`}
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
