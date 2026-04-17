// ─────────────────────────────────────────────────────────────────────────────
// PaverSummary — read-only detail view for a saved Paver module
// ─────────────────────────────────────────────────────────────────────────────

const fmt  = v => `$${Math.round(v || 0).toLocaleString()}`
const fnum = v => (v || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const n    = v => parseFloat(v) || 0

export default function PaverSummary({ module: mod }) {
  const data = mod?.data || {}
  const calc = data.calc || {}

  const totalHrs   = n(calc.totalHrs)
  const manDays    = n(calc.manDays)
  const laborCost  = n(calc.laborCost)
  const burden     = n(calc.burden)
  const totalMat   = n(calc.totalMat)
  const subCost    = n(calc.subCost)
  const gp         = n(calc.gp)
  const commission = n(calc.commission)
  const price      = n(calc.price)
  const lrph       = n(data.laborRatePerHour) || 35
  const gpmd       = manDays > 0 && gp > 0 ? Math.round(gp / manDays) : 425

  const areaRows = data.areaRows || []
  const hasAreas = areaRows.some(r => n(r.sf) > 0)

  const installItems = []
  if (n(data.straightCutLF) > 0) installItems.push(`${n(data.straightCutLF).toLocaleString()} LF straight cut`)
  if (n(data.curvedCutLF)   > 0) installItems.push(`${n(data.curvedCutLF).toLocaleString()} LF curved cut`)
  if (n(data.restraintsLF)  > 0) installItems.push(`${n(data.restraintsLF).toLocaleString()} LF restraints`)
  if (n(data.sleevesLF)     > 0) installItems.push(`${n(data.sleevesLF).toLocaleString()} LF sleeves`)
  if (n(data.vertSoldierLF) > 0) installItems.push(`${n(data.vertSoldierLF).toLocaleString()} LF vert soldier`)
  if (n(data.sealerSF)      > 0) installItems.push(`${n(data.sealerSF).toLocaleString()} SF sealer`)
  if (n(data.numStones)     > 0) installItems.push(`${n(data.numStones)} stones`)
  if (n(data.numColors)     > 0) installItems.push(`${n(data.numColors)} colors`)
  if (data.is80mm)               installItems.push('80mm pavers')
  if (data.polySand)             installItems.push('poly sand')

  const hasSteps = n(data.stepStraightLF) > 0 || n(data.stepCurvedLF) > 0

  const Row = ({ label, value, dim, green, bold }) => (
    <div className="flex items-baseline justify-between text-xs py-0.5">
      <span className="text-gray-500">{label}{dim && <span className="ml-1 text-gray-400 text-[10px]">{dim}</span>}</span>
      <span className={`tabular-nums font-${bold ? 'semibold' : 'normal'} ${green ? 'text-green-700' : 'text-gray-800'}`}>{value}</span>
    </div>
  )

  return (
    <div className="space-y-3 text-sm">

      {/* Paver areas */}
      {hasAreas && (
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Paver Areas</p>
          <div className="space-y-1">
            {areaRows.filter(r => n(r.sf) > 0).map((row, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <span className="text-gray-700 font-medium">{row.label || `Area ${i + 1}`}</span>
                <span className="text-gray-500">
                  {n(row.sf).toLocaleString()} SF · {row.depth}" base · {row.method}
                  {row.paverName && <span className="ml-1 text-gray-400"> · {row.paverName}</span>}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Install details */}
      {installItems.length > 0 && (
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Install Details</p>
          <p className="text-xs text-gray-600">{installItems.join(' · ')}</p>
        </div>
      )}

      {/* Steps */}
      {hasSteps && (
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Steps</p>
          <p className="text-xs text-gray-600">
            {n(data.stepStraightLF) > 0 && `${n(data.stepStraightLF).toLocaleString()} LF straight`}
            {n(data.stepStraightLF) > 0 && n(data.stepCurvedLF) > 0 && ' · '}
            {n(data.stepCurvedLF)   > 0 && `${n(data.stepCurvedLF).toLocaleString()} LF curved`}
            {data.stepPaverName && ` · ${data.stepPaverName}`}
            {n(data.stepPaverSF) > 0 && ` · ${n(data.stepPaverSF).toLocaleString()} SF`}
          </p>
        </div>
      )}

      {/* Options used */}
      {(data.includeDelivery || data.is80mm || data.polySand || n(data.salesTax) > 0 || n(data.shippingCharge) > 0) && (
        <div className="text-xs text-gray-500 bg-blue-50 rounded-lg px-3 py-2">
          {[
            data.includeDelivery && 'Delivery included',
            data.is80mm          && '80mm pavers',
            data.polySand        && 'Polymeric sand',
            n(data.salesTax) > 0 && `${n(data.salesTax)}% sales tax`,
            n(data.shippingCharge) > 0 && `$${n(data.shippingCharge).toLocaleString()} shipping`,
          ].filter(Boolean).join(' · ')}
        </div>
      )}

      {/* Main financials list */}
      <div className="bg-gray-50 rounded-lg p-3">
        <Row label="GPMD"         value={`$${gpmd.toLocaleString()}`} dim="rate/MD" />
        <Row label="Labor Hours"  value={fnum(totalHrs)}              dim="hrs" />
        <Row label="Man Days"     value={fnum(manDays)}               dim="MD" />

        <div className="border-t border-gray-200 my-1.5" />

        <Row label="Materials"    value={fmt(totalMat)} />
        <Row label="Crew Labor"   value={fmt(laborCost)} dim={`@ $${lrph.toFixed(0)}/hr`} />
        <Row label="Labor Burden" value={fmt(burden)}    dim="29%" />
        <Row label="Sub Cost"     value={subCost > 0 ? fmt(subCost) : '—'} />
        <Row label="Gross Profit" value={fmt(gp)}        green />
        <Row label="Commission"   value={fmt(commission)} dim="12%" />

        <div className="border-t border-gray-200 my-1.5" />

        <Row label="Total Price"  value={fmt(price)} green bold />
      </div>

    </div>
  )
}
