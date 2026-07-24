// ─────────────────────────────────────────────────────────────────────────────
// FinancialSummaryList — shared cost breakdown for every module detail view.
// Grouped to mirror the GPMD bar: In House, then Subcontractor, then Totals.
// ─────────────────────────────────────────────────────────────────────────────

const fmt = v => `$${Math.round(v || 0).toLocaleString()}`
const fnum = v =>
  (v || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const n = v => parseFloat(v) || 0

function Row({ label, value, dim, green, bold }) {
  return (
    <div className="flex items-baseline justify-between text-xs py-0.5">
      <span className="text-gray-500">
        {label}
        {dim && <span className="ml-1 text-gray-400 text-[10px]">{dim}</span>}
      </span>
      <span
        className={`tabular-nums ${bold ? 'font-semibold' : 'font-normal'} ${green ? 'text-green-700' : 'text-gray-800'}`}
      >
        {value}
      </span>
    </div>
  )
}

function GroupLabel({ children, color }) {
  return (
    <p className={`text-[10px] font-bold uppercase tracking-wider mt-2 mb-0.5 ${color}`}>
      {children}
    </p>
  )
}

export default function FinancialSummaryList({
  totalHrs = 0,
  manDays = 0,
  totalMat = 0,
  laborCost = 0,
  lrph = 35,
  burden = 0,
  subCost = 0,
  gp = 0,
  subGp = 0,
  commission = 0,
  price = 0,
}) {
  const gpmd = manDays > 0 && gp > 0 ? Math.round(gp / manDays) : 425
  const markupPct = subCost > 0 ? Math.round((subGp / subCost) * 100) : 0
  const totalGp = gp + subGp
  const hasSub = subCost > 0 || subGp > 0

  return (
    <>
      {/* Section header — matches the In House / Subcontractor headers above */}
      <p className="text-xs font-bold uppercase tracking-wider mt-3 mb-1 border-t border-gray-100 pt-2 text-green-700">
        Summary
      </p>
      <div className="bg-gray-50 rounded-lg p-3">
        {/* In House */}
        <GroupLabel color="text-blue-700">In House</GroupLabel>
      <Row label="Labor Hours" value={fnum(totalHrs)} dim="hrs" />
      <Row label="Man Days" value={fnum(manDays)} dim="MD" />
      <Row label="Materials" value={fmt(totalMat)} />
      <Row label="Crew Labor" value={fmt(laborCost)} dim={`@ $${n(lrph).toFixed(0)}/hr`} />
      <Row label="Labor Burden" value={fmt(burden)} dim="29%" />
      <Row label="GPMD" value={`$${gpmd.toLocaleString()}`} dim="rate/MD" />
      <Row label="Gross Profit" value={fmt(gp)} />

      {/* Subcontractor */}
      {hasSub && (
        <>
          <GroupLabel color="text-orange-600">Subcontractor</GroupLabel>
          <Row label="Sub Cost" value={fmt(subCost)} />
          <Row label="Sub GP" value={fmt(subGp)} />
          <Row label="Markup" value={`${markupPct}%`} />
        </>
      )}

      {/* Totals */}
      <GroupLabel color="text-green-700">Totals</GroupLabel>
      <Row label="Commission" value={fmt(commission)} dim="12%" />
      <Row label="Total Gross Profit" value={fmt(totalGp)} green />

      <div className="border-t border-gray-200 my-1.5" />

      <Row label="Total Price" value={fmt(price)} green bold />
      </div>
    </>
  )
}
