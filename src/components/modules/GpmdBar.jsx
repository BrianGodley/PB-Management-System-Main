// ─────────────────────────────────────────────────────────────────────────────
// GpmdBar — shared summary bar matching the Excel "GPMD bar"
// ─────────────────────────────────────────────────────────────────────────────

const fmt  = v => `$${Math.round(v || 0).toLocaleString()}`
const fmt2 = v => `$${(v || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const fnum = v => (v || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export default function GpmdBar({
  totalMat   = 0,
  totalHrs   = 0,
  manDays    = 0,
  laborCost  = 0,
  laborRatePerHour = 35,
  burden     = 0,
  gpmd       = 425,
  gp         = 0,
  commission = 0,
  subCost    = 0,
  price      = 0,
  wrap       = false,
}) {
  if (price <= 0) return null

  const effectiveGp         = manDays * gpmd
  const effectiveCommission = effectiveGp * 0.12
  const effectivePrice      = laborCost + burden + totalMat + (subCost || 0) + effectiveGp + effectiveCommission

  // GPMD cell — static display
  function GpmdCell({ horizontal }) {
    return (
      <div className={`rounded-lg bg-amber-500/20 border border-amber-400/30 px-3 py-1 text-center ${horizontal ? 'min-w-[90px]' : ''}`}>
        <p className={`text-xs mb-0.5 ${horizontal ? 'whitespace-nowrap' : ''} text-amber-300`}>GPMD</p>
        <p className="font-bold tabular-nums text-sm text-amber-200">
          ${gpmd.toLocaleString()}
        </p>
      </div>
    )
  }

  const staticCols = [
    { label: 'Labor Hours',  value: fnum(totalHrs),                           dim: 'hrs' },
    { label: 'Man Days',     value: fnum(manDays),                            dim: 'MD' },
    { label: 'Materials',    value: fmt2(totalMat),                           dim: null },
    { label: 'Crew Labor',   value: fmt(laborCost),                           dim: `@ $${parseFloat(laborRatePerHour).toFixed(0)}/hr` },
    { label: 'Labor Burden', value: fmt(burden),                              dim: '29%' },
    { label: 'Sub Cost',     value: subCost > 0 ? fmt(subCost) : '—',        dim: null },
    { label: 'Gross Profit', value: fmt(effectiveGp),                         dim: null,  green: true },
    { label: 'Commission',   value: fmt(effectiveCommission),                 dim: '12%' },
    { label: 'Total Price',  value: fmt(effectivePrice),                      dim: null,  green: true, big: true },
  ]

  if (wrap) {
    return (
      <div className="bg-gray-900 text-white rounded-xl p-4 mt-2">
        <div className="flex flex-wrap gap-y-4 gap-x-0">
          {/* GPMD — editable, highlighted */}
          <div className="text-center px-3" style={{ flexBasis: '20%', minWidth: '90px' }}>
            <GpmdCell />
          </div>
          {staticCols.map(col => (
            <div key={col.label} className="text-center px-3" style={{ flexBasis: '20%', minWidth: '90px' }}>
              <p className="text-xs text-gray-400 mb-0.5">{col.label}</p>
              <p className={`font-bold tabular-nums ${
                col.big   ? 'text-lg text-green-400' :
                col.green ? 'text-sm text-green-400' :
                            'text-sm text-white'
              }`}>
                {col.value}
              </p>
              {col.dim && <p className="text-xs text-gray-500">{col.dim}</p>}
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gray-900 text-white rounded-xl p-4 mt-2">
      <div className="overflow-x-auto">
        <div className="flex gap-0 min-w-max divide-x divide-white/10">
          {/* GPMD — editable, no left border divider */}
          <div className="pr-3">
            <GpmdCell horizontal />
          </div>
          {staticCols.map((col, i) => (
            <div
              key={col.label}
              className={`px-3 flex-1 min-w-[80px] text-center ${i === staticCols.length - 1 ? 'pl-4' : ''}`}
            >
              <p className="text-xs text-gray-400 whitespace-nowrap mb-0.5">{col.label}</p>
              <p className={`font-bold whitespace-nowrap tabular-nums ${
                col.big   ? 'text-lg text-green-400' :
                col.green ? 'text-sm text-green-400' :
                            'text-sm text-white'
              }`}>
                {col.value}
              </p>
              {col.dim && <p className="text-xs text-gray-500 whitespace-nowrap">{col.dim}</p>}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
