// ─────────────────────────────────────────────────────────────────────────────
// DemoSummaryView — shared read-only detail layout for the demo modules.
// Renders line items grouped under In House and Subcontractor (only sections
// with rows), then the grouped Totals via FinancialSummaryList.
//
// Props:
//   inHouseSections / subSections: [{ title, rows: [{ label, value, sub }] }]
//   financials: props forwarded to FinancialSummaryList
// ─────────────────────────────────────────────────────────────────────────────
import FinancialSummaryList from './FinancialSummaryList'

function GroupLabel({ children, color }) {
  return (
    <p className={`text-xs font-bold uppercase tracking-wider mt-3 mb-1 border-t border-gray-100 pt-2 ${color}`}>
      {children}
    </p>
  )
}
function SectionLabel({ title }) {
  return <p className="text-xs font-bold text-gray-700 mt-2 mb-0.5">{title}</p>
}
function LineRow({ label, value, sub }) {
  return (
    <div className="flex items-start justify-between py-1 border-b border-gray-50">
      <span className="text-xs flex-1 pr-2 text-gray-600">{label}</span>
      <div className="text-right shrink-0">
        <span className="text-xs text-gray-800">{value}</span>
        {sub && <p className="text-[11px] text-gray-400">{sub}</p>}
      </div>
    </div>
  )
}

function Sections({ sections }) {
  return sections
    .filter(s => s && s.rows && s.rows.length)
    .map((s, si) => (
      <div key={si}>
        <SectionLabel title={s.title} />
        {s.rows.map((r, i) => (
          <LineRow key={i} label={r.label} value={r.value} sub={r.sub} />
        ))}
      </div>
    ))
}

export default function DemoSummaryView({ inHouseSections = [], subSections = [], financials = {} }) {
  const ih = inHouseSections.filter(s => s && s.rows && s.rows.length)
  const sub = subSections.filter(s => s && s.rows && s.rows.length)
  return (
    <div className="space-y-1 text-sm">
      {ih.length > 0 && (
        <>
          <GroupLabel color="text-blue-700">In House</GroupLabel>
          <Sections sections={ih} />
        </>
      )}
      {sub.length > 0 && (
        <>
          <GroupLabel color="text-orange-600">Subcontractor</GroupLabel>
          <Sections sections={sub} />
        </>
      )}
      {ih.length === 0 && sub.length === 0 && (
        <p className="text-xs text-gray-400 text-center py-4">No line items entered.</p>
      )}
      <FinancialSummaryList {...financials} />
    </div>
  )
}
