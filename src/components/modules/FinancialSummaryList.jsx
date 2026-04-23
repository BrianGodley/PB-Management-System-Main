// ─────────────────────────────────────────────────────────────────────────────
// FinancialSummaryList — shared cost breakdown list used in all module summaries
// Replaces the GpmdBar dark component with an inline light list format.
// ─────────────────────────────────────────────────────────────────────────────

const fmt  = v => `$${Math.round(v || 0).toLocaleString()}`
const fnum = v => (v || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const n    = v => parseFloat(v) || 0

function Row({ label, value, dim, green, bold }) {
  return (
    <div className="flex items-baseline justify-between text-xs py-0.5">
      <span className="text-gray-500">
        {label}
        {dim && <span className="ml-1 text-gray-400 text-[10px]">{dim}</span>}
      </span>
      <span className={`tabular-nums ${bold ? 'font-semibold' : 'font-normal'} ${green ? 'text-green-700' : 'text-gray-800'}`}>
        {value}
      </span>
    </div>
  )
}

export default function FinancialSummaryList({
  totalHrs   = 0,
  manDays    = 0,
  totalMat   = 0,
  laborCost  = 0,
  lrph       = 35,
  burden     = 0,
  subCost    = 0,
  gp         = 0,
  commission = 0,
  price      = 0,
}) {
  const gpmd = manDays > 0 && gp > 0 ? Math.round(gp / manDays) : 425

  return (
    <div className="bg-gray-50 rounded-lg p-3 mt-3">
      <Row label="GPMD"         value={`$${gpmd.toLocaleString()}`}  dim="rate/MD" />
      <Row label="Labor Hours"  value={fnum(totalHrs)}               dim="hrs" />
      <Row label="Man Days"     value={fnum(manDays)}                dim="MD" />

      <div className="border-t border-gray-200 my-1.5" />

      <Row label="Materials"    value={fmt(totalMat)} />
      <Row label="Crew Labor"   value={fmt(laborCost)} dim={`@ $${n(lrph).toFixed(0)}/hr`} />
      <Row label="Labor Burden" value={fmt(burden)}    dim="29%" />
      <Row label="Sub Cost"     value={subCost > 0 ? fmt(subCost) : '—'} />
      <Row label="Gross Profit" value={fmt(gp)}        green />
      <Row label="Commission"   value={fmt(commission)} dim="12%" />

      <div className="border-t border-gray-200 my-1.5" />

      <Row label="Total Price"  value={fmt(price)} green bold />
    </div>
  )
}
