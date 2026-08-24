// ─────────────────────────────────────────────────────────────────────────────
// PoolSummary — read-only detail view for a saved Pool module
// Uses materialPrices + laborRates snapshots saved at module-save time
// ─────────────────────────────────────────────────────────────────────────────
import FinancialSummaryList from './FinancialSummaryList'

const n = v => parseFloat(v) || 0

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

const fmt2 = v =>
  `$${n(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

export default function PoolSummary({ module }) {
  const data = module?.data || {}
  // A row's Type/model is stored as a frozen material ref_key. Resolve it to the
  // item's name via the saved catalog snapshot (live → current, frozen bid → as-bid).
  // Legacy id/name saves still resolve; a plain enum/label passes through.
  const matName = key => {
    if (!key) return key
    const hit = (data.materialRows || []).find(r => r.ref_key === key || r.id === key || r.name === key)
    if (!hit) return key
    const dash = hit.name ? hit.name.indexOf(' - ') : -1
    return dash > 0 ? hit.name.slice(dash + 3) : hit.name
  }
  // Rate snapshots saved with the module at save time. Line-item hrs/$ shown
  // below are recomputed from these snapshots (no hardcoded fallback), so the
  // detail view matches the numbers used when the estimate was created.
  const laborRates = data.laborRates || {}
  const materialPrices = data.materialPrices || {}
  const subRates = data.subRates || {}
  // In-House and Sub are independent tab records. Legacy estimates stored their
  // inputs flat = In-House. Display the quantities for the tab this estimate was
  // saved under (subType); the financial snapshot (calc) is shared top-level.
  const ih = data.ihData || data
  const sub = data.subData || {}
  const isSub = (data.subType || 'In-House') === 'Subcontractor'
  const src = isSub ? sub : ih
  const {
    pool = {},
    spa = {},
    basin = {},
    vault = {},
    trough = {},
    excavation = {},
    tile = {},
    spillways = [],
    copingRows = [],
    raisedSurfaces = [],
    interiorFinish = {},
    equipment = [],
    plumbing = {},
    manualRows = [],
  } = src
  const laborRatePerHour = data.laborRatePerHour ?? 35
  const calc = data.calc || {}

  const savedCalc = calc || {}
  const totalHrs = n(savedCalc.totalHrs)
  const manDays = n(savedCalc.manDays) || n(module.man_days)
  const totalMat = n(savedCalc.totalMat) || n(module.material_cost)
  const laborCost = n(savedCalc.laborCost) || totalHrs * n(laborRatePerHour)
  const burden = n(savedCalc.burden)
  const subCost = n(savedCalc.subCost) || n(module.sub_cost)
  const gp = n(savedCalc.gp)
  const commission = n(savedCalc.commission)
  const price = n(savedCalc.price) || n(module.total_price)

  const activeStructs = [
    ['Pool', pool],
    ['Spa', spa],
    ['Cover Vault', vault],
    ['Infinity Edge Basin', basin],
    ['Zero Edge Trough', trough],
  ].filter(([, s]) => s && s.enabled)

  const avgDepth = s => (n(s.maxDepth) * 2) / 3

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

      {/* Structures */}
      {activeStructs.length > 0 && (
        <>
          <SectionLabel title="Structures" />
          {activeStructs.map(([k, s]) => (
            <LineRow
              key={k}
              label={k}
              value={`${n(s.waterSF).toLocaleString()} Sq Ft`}
              sub={`${n(s.perimLF)} Ln Ft perim · ${n(s.maxDepth)}′ max (${avgDepth(s).toFixed(2)}′ avg)`}
            />
          ))}
        </>
      )}

      {/* Excavation */}
      {(n(savedCalc.excavHrs) > 0 || n(savedCalc.excavSub) > 0) && (
        <>
          <SectionLabel title="Excavation" />
          <LineRow
            label={excavation.equipment || '—'}
            value={n(savedCalc.excavHrs) > 0 ? `${n(savedCalc.excavHrs).toFixed(1)} hrs` : 'Sub'}
            sub={`${n(savedCalc.totalExcavCY).toFixed(1)} Cu Yd${n(savedCalc.excavSub) > 0 ? ' · ' + fmt2(savedCalc.excavSub) + ' sub' : ''}`}
          />
        </>
      )}

      {/* Shotcrete */}
      {n(savedCalc.shotcreteSub) > 0 && (
        <>
          <SectionLabel title="Shotcrete" />
          <LineRow
            label="Shotcrete Sub"
            value={fmt2(savedCalc.shotcreteSub)}
            sub={`${n(savedCalc.totalShotCY).toFixed(1)} Cu Yd shell`}
          />
        </>
      )}

      {/* Waterline Tile — from the saved calc breakdown (parity-safe) */}
      {(savedCalc.tileCalc || []).length > 0 && (
        <>
          <SectionLabel title="Waterline Tile" />
          {savedCalc.tileCalc.map((t, i) => (
            <LineRow
              key={i}
              label={t.label}
              value={t.value}
              sub={`${n(t.hrs).toFixed(1)} hrs · $${n(t.matPerSF)} per Sq Ft mat${t.waterproof ? ' · WP' : ''}`}
            />
          ))}
        </>
      )}

      {/* Spillways — from the saved calc breakdown (parity-safe) */}
      {(savedCalc.spillwayCalc || []).length > 0 && (
        <>
          <SectionLabel title="Spillways" />
          {savedCalc.spillwayCalc.map((sw, i) => (
            <LineRow
              key={i}
              label={sw.label}
              value={sw.value}
              sub={`${n(sw.hrs).toFixed(1)} hrs · ${fmt2(n(sw.mat))} mat`}
            />
          ))}
        </>
      )}

      {/* Water Features — rendered from the saved calc breakdown (parity-safe) */}
      {(savedCalc.waterFeatureCalc || []).length > 0 && (
        <>
          <SectionLabel title="Water Features" />
          {savedCalc.waterFeatureCalc.map((wf, i) => (
            <LineRow
              key={i}
              label={`${wf.label} × ${wf.qty}`}
              value={`${n(wf.qty)} Each`}
              sub={`${n(wf.hrs).toFixed(1)} hrs · ${fmt2(n(wf.mat))} mat`}
            />
          ))}
        </>
      )}

      {/* Coping — from the saved calc breakdown (parity-safe) */}
      {(savedCalc.copingCalc || []).length > 0 && (
        <>
          <SectionLabel title="Coping" />
          {savedCalc.copingCalc.map((cr, i) => (
            <LineRow
              key={i}
              label={cr.label}
              value={cr.value}
              sub={`${n(cr.hrs).toFixed(1)} hrs · ${fmt2(n(cr.mat))} mat`}
            />
          ))}
        </>
      )}

      {/* Raised Surfaces */}
      {raisedSurfaces.filter(rs => n(rs.sqft) > 0).length > 0 && (
        <>
          <SectionLabel title="Raised Surfaces" />
          {raisedSurfaces
            .filter(rs => n(rs.sqft) > 0)
            .map((rs, i) => (
              <LineRow
                key={i}
                label={matName(rs.matType)}
                value={`${n(rs.sqft)} Sq Ft`}
                sub={
                  n(rs.curvePct) > 0
                    ? `${rs.curvePct}% curve · ${rs.corners || 0} corners`
                    : undefined
                }
              />
            ))}
        </>
      )}

      {/* Interior Finish */}
      {activeStructs.some(([k]) => {
        const fin = interiorFinish[k] || {}
        const s =
          { pool, spa, basin, vault, trough }[
            k === 'Pool' ? 'pool'
              : k === 'Spa' ? 'spa'
              : k === 'Cover Vault' ? 'vault'
              : k === 'Infinity Edge Basin' ? 'basin'
              : 'trough'
          ] || {}
        return n(fin.subCost) > 0 || n(s.waterSF) > 0
      }) && (
        <>
          <SectionLabel title="Interior Finish" />
          {activeStructs.map(([k, s]) => {
            const fin = interiorFinish[k] || {}
            const priceSF = n(subRates[`Interior Finish - ${fin.type}`])
            const sub = n(fin.subCost) || n(s.waterSF) * priceSF
            return sub > 0 ? (
              <LineRow
                key={k}
                label={`${k} — ${fin.type || 'White Plaster'}`}
                value={fmt2(sub)}
                sub="Sub"
              />
            ) : null
          })}
        </>
      )}

      {/* Pool Equipment */}
      {equipment.filter(eq => n(eq.qty) > 0).length > 0 && (
        <>
          <SectionLabel title="Pool Equipment" />
          {equipment
            .filter(eq => n(eq.qty) > 0)
            .map((eq, i) => (
              <LineRow
                key={i}
                label={`${eq.category} — ${matName(eq.model)}`}
                value={fmt2(n(eq.qty) * n(eq.unitCost))}
                sub={`${eq.qty} × $${n(eq.unitCost).toLocaleString()}`}
              />
            ))}
        </>
      )}

      {/* Plumbing */}
      {n(savedCalc.plumbSub) > 0 && (
        <>
          <SectionLabel title="Plumbing" />
          <LineRow
            label={plumbing.baseType || 'Pool Only'}
            value={fmt2(savedCalc.plumbSub)}
            sub="Sub"
          />
        </>
      )}

      {/* Steel */}
      {n(savedCalc.steelSub) > 0 && (
        <>
          <SectionLabel title="Steel" />
          <LineRow label="Steel Sub" value={fmt2(savedCalc.steelSub)} sub="Sub" />
        </>
      )}

      {/* Manual Entry */}
      {manualRows.filter(r => n(r.hours) > 0 || n(r.materials) > 0 || n(r.subCost) > 0).length >
        0 && (
        <>
          <SectionLabel title="Manual Entry" />
          {manualRows
            .filter(r => n(r.hours) > 0 || n(r.materials) > 0 || n(r.subCost) > 0)
            .map((r, i) => (
              <div key={i} className="py-1 border-b border-gray-50">
                <p className="text-xs font-medium text-gray-700">{r.label || 'Manual'}</p>
                <div className="flex gap-3 mt-0.5">
                  {n(r.hours) > 0 && (
                    <span className="text-xs text-gray-500">{n(r.hours).toFixed(1)} hrs</span>
                  )}
                  {n(r.materials) > 0 && (
                    <span className="text-xs text-gray-500">{fmt2(r.materials)} mat</span>
                  )}
                  {n(r.subCost) > 0 && (
                    <span className="text-xs text-gray-500">{fmt2(r.subCost)} sub</span>
                  )}
                </div>
              </div>
            ))}
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
        price={price}
      />
    </div>
  )
}
