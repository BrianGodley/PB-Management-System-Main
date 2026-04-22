// ─────────────────────────────────────────────────────────────────────────────
// PoolSummary — read-only detail view for a saved Pool module
// Uses materialPrices + laborRates snapshots saved at module-save time
// ─────────────────────────────────────────────────────────────────────────────
import FinancialSummaryList from './FinancialSummaryList'

const n = (v) => parseFloat(v) || 0

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

const fmt2 = (v) => `$${n(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const COPING_DEFAULTS = {
  'Paver Bullnose':            { mat: 8.50,  hrs: 0.400 },
  'Travertine 12"x12"':       { mat: 13.00, hrs: 0.444 },
  'Precast Concrete':          { mat: 50.00, hrs: 0.444 },
  'Arizona Flagstone Eased':   { mat: 13.00, hrs: 0.500 },
  'Other Flagstone':           { mat: 18.00, hrs: 0.533 },
  'Pacific Clay':              { mat: 12.00, hrs: 0.410 },
  'Pour In Place Sand Finish': { mat:  7.50, hrs: 0.727 },
}
const SPILLWAY_DEFAULTS = {
  'TILE':       { mat: 30.00, hrs: 1.25 },
  'FLAGSTONE':  { mat: 24.00, hrs: 0.50 },
}
const TILE_INSTALL_DEFAULTS = {
  '6" Squares':  0.356,
  '3" Squares':  0.400,
  '2" Squares':  0.421,
  '1" Squares':  0.457,
  'Segmental':   0.533,
  'Multi-Piece': 0.457,
  'Glass Tile':  0.533,
}
const INTERIOR_DEFAULTS = { 'White Plaster': 45, 'Quartzscapes': 87, 'Stonescapes': 83 }
const EXCAVATION_RATES = {
  'IH - Bobcat 72"': 7.33, 'IH - Bobcat 64"': 7.14,
  'Rental 48"': 7.33, 'Rental 42"': 7.33,
  'Medium Excavator': 29.75, 'Large Excavator': 25.50,
  'Hand Dig': 0.50, 'Sub Bobcat / Mini Bob': 0,
}

export default function PoolSummary({ module }) {
  const data = module?.data || {}
  const {
    pool = {}, spa = {}, basin = {}, vault = {},
    excavation = {}, shotcrete = {}, tile = {}, spillways = [],
    copingRows = [], raisedSurfaces = [], interiorFinish = {},
    equipment = [], plumbing = {}, steel = {}, manualRows = [],
    laborRatePerHour = 35,
    calc = {},
  } = data

  const savedCalc = calc || {}
  const totalHrs   = n(savedCalc.totalHrs)
  const manDays    = n(savedCalc.manDays)    || n(module.man_days)
  const totalMat   = n(savedCalc.totalMat)   || n(module.material_cost)
  const laborCost  = n(savedCalc.laborCost)  || totalHrs * n(laborRatePerHour)
  const burden     = n(savedCalc.burden)
  const subCost    = n(savedCalc.subCost)    || n(module.sub_cost)
  const gp         = n(savedCalc.gp)
  const commission = n(savedCalc.commission) || gp * 0.12
  const price      = n(savedCalc.price)      || n(module.total_price)

  const activeStructs = [
    ['Pool', pool], ['Spa', spa], ['Infinity Basin', basin], ['Cover Vault', vault],
  ].filter(([,s]) => s.enabled)

  const avgDepth = s => n(s.maxDepth) * 2 / 3

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
              value={`${n(s.waterSF).toLocaleString()} SF`}
              sub={`${n(s.perimLF)} LF perim · ${n(s.maxDepth)}′ max (${avgDepth(s).toFixed(2)}′ avg)`}
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
            sub={`${n(savedCalc.totalExcavCY).toFixed(1)} CY${n(savedCalc.excavSub) > 0 ? ' · ' + fmt2(savedCalc.excavSub) + ' sub' : ''}`}
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
            sub={`${n(savedCalc.totalShotCY).toFixed(1)} CY shell`}
          />
        </>
      )}

      {/* Waterline Tile */}
      {activeStructs.some(([k]) => n((tile[k] || {}).lf) > 0) && (
        <>
          <SectionLabel title="Waterline Tile" />
          {activeStructs.map(([k]) => {
            const t = tile[k] || {}
            const lf = n(t.lf)
            if (!lf) return null
            const hrs = lf * (TILE_INSTALL_DEFAULTS[t.installType] ?? 0.356)
            return (
              <LineRow
                key={k}
                label={`${k} — ${t.installType || '6" Squares'}`}
                value={`${lf} LF`}
                sub={`${hrs.toFixed(1)} hrs · $${n(t.matPricePerSF)}/SF mat${t.waterproof ? ' · WP' : ''}`}
              />
            )
          })}
        </>
      )}

      {/* Spillways */}
      {spillways.filter(sw => n(sw.qty) > 0 && n(sw.lf) > 0).length > 0 && (
        <>
          <SectionLabel title="Spillways" />
          {spillways.filter(sw => n(sw.qty) > 0 && n(sw.lf) > 0).map((sw, i) => {
            const totalLF = n(sw.qty) * n(sw.lf)
            const def = SPILLWAY_DEFAULTS[sw.type] || { mat: 24, hrs: 0.5 }
            return (
              <LineRow
                key={i}
                label={`${sw.struct} — ${sw.type} × ${sw.qty}`}
                value={`${totalLF} LF`}
                sub={`${(totalLF * def.hrs).toFixed(1)} hrs · ${fmt2(totalLF * def.mat)} mat`}
              />
            )
          })}
        </>
      )}

      {/* Coping */}
      {copingRows.filter(cr => n(cr.lf) > 0).length > 0 && (
        <>
          <SectionLabel title="Coping" />
          {copingRows.filter(cr => n(cr.lf) > 0).map((cr, i) => {
            const sided = cr.sided === 'double' ? 2 : 1
            const def   = COPING_DEFAULTS[cr.type] || { mat: 8.50, hrs: 0.4 }
            const totalLF = n(cr.lf) * sided
            return (
              <LineRow
                key={i}
                label={`${cr.struct} — ${cr.type}${cr.sided === 'double' ? ' (double)' : ''}`}
                value={`${n(cr.lf)} LF`}
                sub={`${(totalLF * def.hrs).toFixed(1)} hrs · ${fmt2(totalLF * def.mat)} mat`}
              />
            )
          })}
        </>
      )}

      {/* Raised Surfaces */}
      {raisedSurfaces.filter(rs => n(rs.sqft) > 0).length > 0 && (
        <>
          <SectionLabel title="Raised Surfaces" />
          {raisedSurfaces.filter(rs => n(rs.sqft) > 0).map((rs, i) => (
            <LineRow
              key={i}
              label={rs.matType}
              value={`${n(rs.sqft)} SF`}
              sub={n(rs.curvePct) > 0 ? `${rs.curvePct}% curve · ${rs.corners || 0} corners` : undefined}
            />
          ))}
        </>
      )}

      {/* Interior Finish */}
      {activeStructs.some(([k]) => {
        const fin = interiorFinish[k] || {}
        const s   = { pool, spa, basin, vault }[k === 'Pool' ? 'pool' : k === 'Spa' ? 'spa' : k === 'Infinity Basin' ? 'basin' : 'vault'] || {}
        return n(fin.subCost) > 0 || n(s.waterSF) > 0
      }) && (
        <>
          <SectionLabel title="Interior Finish" />
          {activeStructs.map(([k, s]) => {
            const fin = interiorFinish[k] || {}
            const priceSF = INTERIOR_DEFAULTS[fin.type] ?? 45
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
          {equipment.filter(eq => n(eq.qty) > 0).map((eq, i) => (
            <LineRow
              key={i}
              label={`${eq.category} — ${eq.model}`}
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
      {manualRows.filter(r => n(r.hours) > 0 || n(r.materials) > 0 || n(r.subCost) > 0).length > 0 && (
        <>
          <SectionLabel title="Manual Entry" />
          {manualRows.filter(r => n(r.hours) > 0 || n(r.materials) > 0 || n(r.subCost) > 0).map((r, i) => (
            <div key={i} className="py-1 border-b border-gray-50">
              <p className="text-xs font-medium text-gray-700">{r.label || 'Manual'}</p>
              <div className="flex gap-3 mt-0.5">
                {n(r.hours)     > 0 && <span className="text-xs text-gray-500">{n(r.hours).toFixed(1)} hrs</span>}
                {n(r.materials) > 0 && <span className="text-xs text-gray-500">{fmt2(r.materials)} mat</span>}
                {n(r.subCost)   > 0 && <span className="text-xs text-gray-500">{fmt2(r.subCost)} sub</span>}
              </div>
            </div>
          ))}
        </>
      )}

      <FinancialSummaryList
        totalHrs={totalHrs} manDays={manDays} totalMat={totalMat}
        laborCost={laborCost} lrph={n(laborRatePerHour)} burden={burden}
        subCost={subCost} gp={gp} commission={commission} price={price}
      />
    </div>
  )
}
