import FinancialSummaryList from './FinancialSummaryList'

// ─────────────────────────────────────────────────────────────────────────────
// LightingSummary — read-only detail view for a saved Lighting module.
//
// Consumes the per-vendor catalog shape (ihData / subData holding
// fixtureRows / transformerRows / wireRows). Falls back gracefully to legacy
// flat data (no ihData) so old saved estimates never crash.
// ─────────────────────────────────────────────────────────────────────────────

const LIGHT_CAT = { fixture: 'Light Fixture', transformer: 'Transformer', wire: 'Wire' }
const MATERIAL_MARKUP = 0.15

const n = v => parseFloat(v) || 0

// Resolve a saved row selection to its material_rates row (id → label → first).
function lightingItemFor(subcat, vendorSel, key, materialRows) {
  const isHouse = !vendorSel || vendorSel === 'House'
  const opts = (materialRows || []).filter(
    r => r.subcategory === subcat && (isHouse ? r.vendor_id == null : r.vendor_id === vendorSel)
  )
  if (!opts.length) return null
  if (!key) return opts[0]
  return opts.find(r => r.id === key) || opts.find(r => r.name === key) || opts[0]
}

function SectionLabel({ title }) {
  return (
    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mt-4 mb-1 border-t border-gray-100 pt-3">
      {title}
    </p>
  )
}

function LineRow({ label, value, sub }) {
  return (
    <div className="flex items-start justify-between py-1 border-b border-gray-50">
      <span className="text-xs text-gray-600 flex-1 pr-2">{label}</span>
      <div className="text-right shrink-0">
        <span className="text-xs text-gray-700">{value}</span>
        {sub && <p className="text-xs text-gray-400">{sub}</p>}
      </div>
    </div>
  )
}

export default function LightingSummary({ module }) {
  const data = module?.data || {}
  const isSub = (data.subType || 'In-House') === 'Subcontractor'
  // Active tab drives the saved price (subType). Legacy flat data → In-House.
  const active = isSub ? data.subData || {} : data.ihData || data
  const materialRows = data.materialRows || []
  const calc = data.calc || {}

  const fmt2 = v =>
    `$${n(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  // Build display lines for one section's saved rows.
  function sectionLines(subcat, rows, isFixture) {
    return (rows || [])
      .map((row, i) => {
        const qty = n(row.qty)
        if (qty <= 0) return null
        const item = lightingItemFor(subcat, row.vendor, row.itemId, materialRows)
        const name = item?.name || row.itemId || 'Item'
        const unit = item?.unit ? ` ${item.unit}` : ''
        const eachSub =
          row.subEach !== '' && row.subEach != null
            ? n(row.subEach)
            : item
              ? item.sub_price_ea != null
                ? n(item.sub_price_ea)
                : n(item.unit_cost)
              : 0
        const material = isSub ? qty * eachSub : item ? qty * n(item.unit_cost) : 0
        const hrs = !isSub && item ? qty * n(item.labor_hrs_ea) : 0
        const watts = isFixture && item ? qty * n(item.watts) : 0
        const subParts = []
        if (!isSub && hrs > 0) subParts.push(`${hrs.toFixed(2)} hrs`)
        if (isSub) subParts.push(`${fmt2(eachSub)}/ea`)
        if (isFixture && watts > 0) subParts.push(`${watts.toFixed(1)} W`)
        return {
          key: `${subcat}-${i}`,
          label: `${name} × ${qty}${unit}`,
          value: material > 0 ? fmt2(material) : '—',
          sub: subParts.join('  ·  ') || null,
        }
      })
      .filter(Boolean)
  }

  const fixtureLines = sectionLines(LIGHT_CAT.fixture, active.fixtureRows, true)
  const transformerLines = sectionLines(LIGHT_CAT.transformer, active.transformerRows, false)
  const wireLines = sectionLines(LIGHT_CAT.wire, active.wireRows, false)

  const manualLines = (active.manualRows || []).filter(
    r => n(r.hours) > 0 || n(r.materials) > 0 || n(r.subCost) > 0
  )

  const difficulty = active.difficulty ?? 0
  const laborRatePerHour = data.laborRatePerHour ?? 35

  const totalHrs = n(calc.totalHrs)
  const manDays = n(calc.manDays) || n(module.man_days)
  const totalMat = n(calc.totalMat) || n(module.material_cost)
  const laborCost = n(calc.laborCost) || totalHrs * n(laborRatePerHour)
  const burden = n(calc.burden)
  const gp = n(calc.gp)
  const subGp = n(calc.subGp)
  const commission = n(calc.commission) || gp * 0.12
  const subCost = n(calc.subCost)
  const price = n(calc.price)
  const totalWatts = n(calc.totalWatts)
  const totalVA = n(calc.totalVA)
  const rawMat = n(calc.rawMat)
  const markedUpMat = n(calc.markedUpMat) || rawMat * (1 + MATERIAL_MARKUP)

  const hasAnyLines =
    fixtureLines.length || transformerLines.length || wireLines.length || manualLines.length

  return (
    <div className="space-y-1 text-sm">
      {/* Top stats */}
      <div className="grid grid-cols-2 gap-2 mb-2">
        <div className="bg-gray-50 rounded-lg p-3 text-center">
          <p className="text-xs text-gray-500 mb-0.5">Man Days</p>
          <p className="text-xl font-bold text-gray-900">{manDays.toFixed(2)}</p>
          <p className="text-xs text-gray-400">{totalHrs.toFixed(1)} hrs</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-3 text-center">
          <p className="text-xs text-gray-500 mb-0.5">Materials</p>
          <p className="text-xl font-bold text-gray-900">{fmt2(totalMat)}</p>
        </div>
      </div>

      {/* Badges */}
      <div className="flex flex-wrap gap-2">
        {isSub && (
          <span className="text-xs bg-orange-50 text-orange-700 px-2 py-1 rounded font-medium">
            Subcontractor
          </span>
        )}
        {totalWatts > 0 && (
          <span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded font-medium">
            {totalWatts.toFixed(1)} W
          </span>
        )}
        {totalVA > 0 && (
          <span className="text-xs bg-purple-50 text-purple-700 px-2 py-1 rounded font-medium">
            {totalVA.toFixed(1)} VA
          </span>
        )}
        {n(difficulty) > 0 && (
          <span className="text-xs bg-amber-50 text-amber-700 px-2 py-1 rounded font-medium">
            +{difficulty}% difficulty
          </span>
        )}
      </div>

      {!hasAnyLines ? (
        <p className="text-xs text-gray-400 text-center py-4">No line items entered.</p>
      ) : (
        <>
          {fixtureLines.length > 0 && (
            <>
              <SectionLabel title="Light Fixtures" />
              {fixtureLines.map(l => (
                <LineRow key={l.key} label={l.label} value={l.value} sub={l.sub} />
              ))}
            </>
          )}

          {transformerLines.length > 0 && (
            <>
              <SectionLabel title="Transformers" />
              {transformerLines.map(l => (
                <LineRow key={l.key} label={l.label} value={l.value} sub={l.sub} />
              ))}
            </>
          )}

          {wireLines.length > 0 && (
            <>
              <SectionLabel title="Wire & Other" />
              {wireLines.map(l => (
                <LineRow key={l.key} label={l.label} value={l.value} sub={l.sub} />
              ))}
            </>
          )}

          {!isSub && markedUpMat > 0 && rawMat > 0 && (
            <p className="text-xs text-gray-400 mt-1">
              {fmt2(rawMat)} raw materials + 15% markup ={' '}
              <span className="text-gray-600 font-medium">{fmt2(markedUpMat)}</span>
            </p>
          )}

          {manualLines.length > 0 && (
            <>
              <SectionLabel title="Manual Entry" />
              {manualLines.map((r, i) => (
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
        subGp={subGp}
        gp={gp}
        commission={commission}
        price={price}
      />
    </div>
  )
}
