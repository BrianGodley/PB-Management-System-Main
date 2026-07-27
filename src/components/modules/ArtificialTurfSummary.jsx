// ─────────────────────────────────────────────────────────────────────────────
// ArtificialTurfSummary — read-only detail view for a saved Artificial Turf module
// All values pulled from the saved calc snapshot with fallbacks re-derived.
// ─────────────────────────────────────────────────────────────────────────────

const DEMO_ROWS = [
  { key: 'concrete', label: 'Concrete' },
  { key: 'soil', label: 'Soil' },
  { key: 'lawn', label: 'Lawn' },
]

const TURF_BRANDS = {
  'Socal Blen Supreme 80': 'Socal Blen Supreme - 80',
  'Bel Air SH 92/66': 'Bel Air SH 92/66',
  'Venice SH Light 50': 'Venice SH Light - 50',
  'Bel Air SH Light 50': 'Bel Air SH Light - 50',
  'Performance Play 63': 'Performance Play - 63',
  'Autumn Grass 75': 'Autumn Grass - 75',
  'Bel Air Supreme 90': 'Bel Air Supreme - 90',
  'Pet Turf Pro 85': 'Pet Turf Pro - 85',
  'Verdant Supreme 94': 'Verdant Supreme - 94',
  'Golf Pro SH 47': 'Golf Pro SH - 47',
}

const n = v => parseFloat(v) || 0

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
      <span className={`text-xs flex-1 pr-2 ${highlight ? 'text-gray-800' : 'text-gray-600'}`}>
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

import FinancialSummaryList from './FinancialSummaryList'

export default function ArtificialTurfSummary({ module }) {
  const data = module?.data || {}
  const {
    subType = 'In-House',
    difficulty = 0,
    hoursAdj = 0,
    distanceLF = 0,
    demo = {},
    base = {},
    useZeoFill = false,
    rolls = [],
    strips = {},
    manualRows = [],
    laborRatePerHour = 35,
    calc = null,
  } = data
  const isSub = subType === 'Subcontractor'

  const savedCalc = calc || {}
  const totalHrs = n(savedCalc.totalHrs)
  const manDays = n(savedCalc.manDays) || n(module.man_days)
  const totalMat = n(savedCalc.totalMat) || n(module.material_cost)
  const laborCost = n(savedCalc.laborCost)
  const burden = n(savedCalc.burden)
  const gp = n(savedCalc.gp)
  const commission = n(savedCalc.commission)
  const subCost = n(savedCalc.subCost)
  const priceTotal = n(savedCalc.price)
  const turfAreaSF = n(savedCalc.turfAreaSF)

  const fmt2 = v =>
    `$${n(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  // Demo rows with any entry
  const demoLines = DEMO_ROWS.map(row => {
    const d = demo[row.key] || {}
    const sf = n(d.sf)
    return { label: row.label, sf, inches: n(d.inches) || 4, method: d.method || 'Skid Steer Good' }
  }).filter(d => d.sf > 0)

  // Base items included — omitted entirely on the Sub tab (no base section).
  const baseLines = []
  if (!isSub) {
    if (base.useGravel) baseLines.push(`2" Gravel Base (${n(base.gravelSF) || turfAreaSF} SF)`)
    if (base.useDG) baseLines.push(`1" DG Base (${n(base.dgSF) || turfAreaSF} SF)`)
    if (base.useWeedFabric)
      baseLines.push(`Weed Barrier Fabric (${n(base.weedSF) || turfAreaSF} SF)`)
  }

  // Active rolls — Sub uses entered install SF, In-House uses edge LF.
  const rollLines = (rolls || []).filter(r =>
    isSub ? n(r.installSF) > 0 : n(r.edgeLF) > 0
  )

  const manualFiltered = (manualRows || []).filter(
    r => n(r.hours) > 0 || n(r.materials) > 0 || n(r.subCost) > 0
  )

  // Turf strips
  const stripsLF = n(strips?.lf)
  const hasStrips = stripsLF > 0

  const hasContent =
    demoLines.length > 0 ||
    baseLines.length > 0 ||
    rollLines.length > 0 ||
    hasStrips ||
    manualFiltered.length > 0

  return (
    <div className="space-y-1 text-sm">
      {!hasContent ? (
        <p className="text-xs text-gray-400 text-center py-4">No line items entered.</p>
      ) : (
        <>
          {/* Demo */}
          {demoLines.length > 0 && (
            <>
              <SectionLabel title="Turf Prep (Demo)" />
              {demoLines.map((d, i) => (
                <LineRow
                  key={i}
                  label={`${d.label} · ${d.method}`}
                  value={`${d.sf.toLocaleString()} SF`}
                  sub={`${d.inches}" depth`}
                />
              ))}
            </>
          )}

          {/* Base */}
          {baseLines.length > 0 && (
            <>
              <SectionLabel title="Base Installation" />
              {baseLines.map((b, i) => (
                <LineRow key={i} label={b} value="" />
              ))}
            </>
          )}

          {/* Turf Rolls */}
          {rollLines.length > 0 && (
            <>
              <SectionLabel title="Turf Installation" />
              {rollLines.map((r, i) => {
                if (isSub) {
                  return (
                    <LineRow
                      key={i}
                      label={TURF_BRANDS[r.brand] || r.brand}
                      value={`${n(r.installSF).toLocaleString()} SF`}
                      sub={n(r.edgeLF) > 0 ? `${n(r.edgeLF)} LF edge` : undefined}
                    />
                  )
                }
                const sf = n(r.edgeLF) * 15
                return (
                  <LineRow
                    key={i}
                    label={TURF_BRANDS[r.brand] || r.brand}
                    value={`${n(r.edgeLF)} LF edge`}
                    sub={`${sf.toLocaleString()} SF`}
                  />
                )
              })}
            </>
          )}

          {/* Turf Strips */}
          {hasStrips && (
            <>
              <SectionLabel title="Turf Strips" />
              <LineRow
                label={`${TURF_BRANDS[strips?.brand] || strips?.brand || 'Turf'} · ${n(strips?.widthIn) || 12} in wide`}
                value={`${stripsLF} LF`}
                sub={`${(stripsLF * ((n(strips?.widthIn) || 12) / 12)).toLocaleString()} SF`}
              />
            </>
          )}

          {/* Manual */}
          {manualFiltered.length > 0 && (
            <>
              <SectionLabel title="Manual Entry" />
              {manualFiltered.map((r, i) => (
                <div key={i} className="py-1 border-b border-gray-50">
                  <p className="text-xs font-medium text-gray-700">{r.label}</p>
                  <div className="flex gap-3 mt-0.5">
                    {n(r.hours) > 0 && (
                      <span className="text-xs text-gray-500">{n(r.hours).toFixed(1)} hrs</span>
                    )}
                    {n(r.materials) > 0 && (
                      <span className="text-xs text-gray-500">{fmt2(r.materials)} mat.</span>
                    )}
                    {n(r.subCost) > 0 && (
                      <span className="text-xs text-gray-500">{fmt2(r.subCost)} sub</span>
                    )}
                  </div>
                </div>
              ))}
            </>
          )}
        </>
      )}

      <FinancialSummaryList
        totalHrs={totalHrs}
        manDays={manDays}
        totalMat={totalMat}
        laborCost={laborCost}
        lrph={n(laborRatePerHour)}
        burden={burden}
        subCost={subCost}
        gp={gp}
        commission={commission}
        price={priceTotal}
      />
    </div>
  )
}
