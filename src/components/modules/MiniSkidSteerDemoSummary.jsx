// ─────────────────────────────────────────────────────────────────────────────
// MiniSkidSteerDemoSummary — read-only detail view for a saved Mini Skid module.
// Line items are grouped: In House (top), Subcontractor (per-line $ from the
// saved subRates snapshot), then the grouped Totals (FinancialSummaryList).
// Only sections that have an entry are shown.
// ─────────────────────────────────────────────────────────────────────────────
import FinancialSummaryList from './FinancialSummaryList'

const n = v => parseFloat(v) || 0
const sfToTons = (sf, depthIn) => (n(sf) / 200) * n(depthIn)
const CONTAINER_COST = 770
const CONTAINER_CY = 10
const SWELL = 1.2
const removalContainers = (sf, depthIn) =>
  Math.ceil((((n(sf) * (n(depthIn) / 12)) / 27) * SWELL) / CONTAINER_CY)
const ACCESS_LEVELS = { Poor: 0.5, OK: 0.75, Full: 1.0 }

const R = { concrete: 0.75, grass: 0.75, importBase: 5.0, jj: 1.75, ssCompact: 1.23 }

function GroupLabel({ children, color }) {
  return (
    <p className={`text-xs font-bold uppercase tracking-wider mt-3 mb-1 border-t border-gray-100 pt-2 ${color}`}>
      {children}
    </p>
  )
}
function SectionLabel({ title }) {
  return (
    <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mt-2 mb-0.5">
      {title}
    </p>
  )
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

export default function MiniSkidSteerDemoSummary({ module }) {
  const data = module?.data || {}
  const {
    access = 'OK',
    // In-House inputs
    concSF = 0,
    concDepth = 4,
    dirtSF = 0,
    dirtDepth = 6,
    baseSF = 0,
    baseDepth = 4,
    grassSF = 0,
    grassDepth = 2,
    miscFlatRows = [],
    gradeCutSF = 0,
    gradeCutDepth = 4,
    gradeFillSF = 0,
    gradeFillDepth = 4,
    jjSF = 0,
    jjDepth = 4,
    ssCmpSF = 0,
    ssCmpDepth = 4,
    stumpSmallQty = 0,
    stumpMedQty = 0,
    stumpLargeQty = 0,
    stumpXLQty = 0,
    treeRows = [],
    manualRows = [],
    // Sub inputs
    subDemoSF = 0,
    subDemoDepth = 7,
    subMiscFlatRows = [],
    subGradeCutSF = 0,
    subGradeFillSF = 0,
    subJjSF = 0,
    subSsCmpSF = 0,
    sheepsfootSF = 0,
    rollCompSF = 0,
    subTreeRows = [],
    subManualRows = [],
    haulTrashLoads = 0,
    haulConcreteLoads = 0,
    haulSoilLoads = 0,
    haulBaseLoads = 0,
    // snapshots
    laborRatePerHour = 35,
    laborRates = {},
    subRates = {},
    calc = null,
  } = data

  const lr = laborRates || {}
  const sr = subRates || {}
  const accessMult = ACCESS_LEVELS[access] || 0.75

  const fmt = v => `$${Math.round(v).toLocaleString()}`
  const fmt2 = v =>
    `$${n(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  const fh = v => (v > 0 ? `${v.toFixed(2)} hrs` : '—')

  // ── In-House line items ────────────────────────────────────────────────────
  const rateConc = lr['Demo - Mini Skid Steer Concrete/Dirt'] ?? R.concrete
  const rateGrass = lr['Demo - Mini Skid Steer Grass'] ?? R.grass
  const rateBase = lr['Demo - Mini Skid Steer Import Base'] ?? R.importBase
  const rateJJ = lr['Demo - Mini JJ Compaction'] ?? R.jj
  const rateSSCmp = lr['Demo - Mini SS Compaction'] ?? R.ssCompact
  const stumpSmallRate = lr['Demo - Mini Stump Small'] ?? 1.25
  const stumpMedRate = lr['Demo - Mini Stump Medium'] ?? 2.5
  const stumpLargeRate = lr['Demo - Mini Stump Large'] ?? 3.75
  const stumpXLRate = lr['Demo - Mini Stump XL'] ?? 5
  const treeSmall = lr['Demo - Mini Tree Small'] ?? 0.1
  const treeMed = lr['Demo - Mini Tree Medium'] ?? 0.15
  const treeLarge = lr['Demo - Mini Tree Large'] ?? 0.2

  const ihFlat = (sf, depthIn, rate) => {
    const tons = sfToTons(sf, depthIn)
    return {
      tons,
      hours: tons > 0 ? tons / (rate * accessMult) : 0,
      containers: removalContainers(sf, depthIn),
    }
  }
  const conc = ihFlat(concSF, concDepth || 4, rateConc)
  const dirt = ihFlat(dirtSF, dirtDepth || 6, rateConc)
  const base = ihFlat(baseSF, baseDepth || 4, rateBase)
  const grass = ihFlat(grassSF, grassDepth || 2, rateGrass)
  const miscFlatIH = (miscFlatRows || []).map(r => ihFlat(r.sf, r.depth || 4, rateConc))
  const gradeCut = ihFlat(gradeCutSF, gradeCutDepth || 4, rateConc)
  const gradeFill = ihFlat(gradeFillSF, gradeFillDepth || 4, rateBase)
  const jjTons = sfToTons(jjSF, jjDepth || 4)
  const ssTons = sfToTons(ssCmpSF, ssCmpDepth || 4)
  const jjHrs = jjTons > 0 ? jjTons / rateJJ : 0
  const ssHrs = ssTons > 0 ? ssTons / rateSSCmp : 0
  const stumpSmallHrs = n(stumpSmallQty) * accessMult * stumpSmallRate
  const stumpMedHrs = n(stumpMedQty) * accessMult * stumpMedRate
  const stumpLargeHrs = n(stumpLargeQty) * accessMult * stumpLargeRate
  const stumpXLHrs = n(stumpXLQty) * accessMult * stumpXLRate
  const treeMult = size => (size === 'Large' ? treeLarge : size === 'Medium' ? treeMed : treeSmall)
  const treeIH = (treeRows || []).map(r => ({
    ...r,
    hrs: n(r.qty) * (n(r.height) || 10) * accessMult * treeMult(r.size),
  }))
  const manualIH = (manualRows || []).filter(r => n(r.hours) > 0 || n(r.materials) > 0)

  const inHouseHasLines =
    conc.tons ||
    dirt.tons ||
    base.tons ||
    grass.tons ||
    miscFlatIH.some(r => r.tons > 0) ||
    gradeCut.tons ||
    gradeFill.tons ||
    jjTons ||
    ssTons ||
    stumpSmallHrs ||
    stumpMedHrs ||
    stumpLargeHrs ||
    stumpXLHrs ||
    treeIH.some(r => r.hrs > 0) ||
    manualIH.length

  // ── Subcontractor line items ($ from saved subRates) ───────────────────────
  const miniRate = d => {
    const x = n(d)
    const deep = sr['Sub Demo - Mini 5-7in'] ?? 2.0
    const mid = sr['Sub Demo - Mini 2-4in'] ?? 1.75
    const shallow = sr['Sub Demo - Mini 1-2in'] ?? 1.5
    return x >= 5 ? deep : x >= 2 ? mid : shallow
  }
  const subDemoCost = n(subDemoSF) * miniRate(subDemoDepth || 7)
  const miscFlatSubRate = sr['Sub Demo - Mini Misc Flat'] ?? 2.0
  const subMiscFlat = (subMiscFlatRows || [])
    .slice(0, 2)
    .map(r => ({ ...r, cost: n(r.sf) * miscFlatSubRate }))
  const subGradeRows = [
    { label: 'Grade Cut', sf: subGradeCutSF, rate: sr['Sub Grade - Mini Cut SF'] ?? 0 },
    { label: 'Grade Fill', sf: subGradeFillSF, rate: sr['Sub Grade - Mini Fill SF'] ?? 0 },
    { label: 'Jumping Jack', sf: subJjSF, rate: sr['Sub Grade - Mini JJ SF'] ?? 0 },
    { label: 'Sheepsfoot', sf: sheepsfootSF, rate: sr['Sub Grade - Mini Sheepsfoot SF'] ?? 0 },
    { label: 'Roll Compactor', sf: rollCompSF, rate: sr['Sub Grade - Mini Roll SF'] ?? 0 },
    { label: 'SS Compact', sf: subSsCmpSF, rate: sr['Sub Grade - Mini SS Compact SF'] ?? 0 },
  ].filter(r => n(r.sf) > 0)
  const subTreeRate = size =>
    size === 'Large'
      ? sr['Sub Tree - Mini Large'] ?? 0
      : size === 'Medium'
        ? sr['Sub Tree - Mini Medium'] ?? 0
        : sr['Sub Tree - Mini Small'] ?? 0
  const subTree = (subTreeRows || [])
    .filter(r => n(r.qty) > 0)
    .map(r => ({ ...r, cost: n(r.qty) * subTreeRate(r.size) }))
  const haulRows = [
    { label: 'Trash haul', loads: haulTrashLoads, rate: sr['Demo - Mini Sub Haul - Trash 12yd'] ?? 850 },
    { label: 'Concrete haul', loads: haulConcreteLoads, rate: sr['Demo - Mini Sub Haul - Concrete 12yd'] ?? 800 },
    { label: 'Soil haul', loads: haulSoilLoads, rate: sr['Demo - Mini Sub Haul - Soil 12yd'] ?? 650 },
    { label: 'Import base haul', loads: haulBaseLoads, rate: sr['Demo - Mini Sub Haul - Import Base 12yd'] ?? 350 },
  ].filter(r => n(r.loads) > 0)
  const subManual = (subManualRows || []).filter(r => n(r.subCost) > 0)

  const subHasLines =
    n(subDemoSF) > 0 ||
    subMiscFlat.some(r => n(r.sf) > 0) ||
    subGradeRows.length ||
    subTree.length ||
    haulRows.length ||
    subManual.length

  // ── Totals from saved calc snapshot ────────────────────────────────────────
  const c = calc || {}
  const totalHrs = n(c.totalHrs)
  const manDays = n(c.manDays) || n(module.man_days)
  const totalMat = n(c.totalMat) || n(module.material_cost)
  const laborCost = n(c.laborCost) || totalHrs * n(laborRatePerHour)
  const burden = n(c.burden)
  const gp = n(c.gp) || n(module.gross_profit)
  const subGp = n(c.subGp)
  const subCost = n(c.subCost) || n(module.sub_cost)
  const commission = n(c.commission) || (gp + subGp) * 0.12
  const priceTotal = n(c.price) || n(module.total_price)

  return (
    <div className="space-y-1 text-sm">
      {/* ── In House ── */}
      {inHouseHasLines ? (
        <>
          <GroupLabel color="text-blue-700">In House</GroupLabel>
          {(conc.tons || dirt.tons || base.tons || grass.tons) > 0 && (
            <>
              <SectionLabel title="Demolition" />
              {[
                { label: 'Concrete', r: conc },
                { label: 'Dirt / Rock', r: dirt },
                { label: 'Import Base', r: base },
                { label: 'Grass / Sod', r: grass },
              ].map(
                ({ label, r }) =>
                  r.tons > 0 && (
                    <LineRow
                      key={label}
                      label={label}
                      value={fh(r.hours)}
                      sub={`${r.tons.toFixed(1)} tons · ${r.containers} container${r.containers !== 1 ? 's' : ''}`}
                    />
                  )
              )}
            </>
          )}
          {miscFlatIH.some(r => r.tons > 0) && (
            <>
              <SectionLabel title="Misc Flat Demo" />
              {miscFlatRows.map((r, i) => {
                const cr = miscFlatIH[i]
                if (!cr || !cr.tons) return null
                return (
                  <LineRow
                    key={i}
                    label={r.label || `Item ${i + 1}`}
                    value={fh(cr.hours)}
                    sub={`${n(r.sf)} SF × ${r.depth || 4}" · ${cr.tons.toFixed(1)} tons`}
                  />
                )
              })}
            </>
          )}
          {(gradeCut.tons || gradeFill.tons || jjTons || ssTons) > 0 && (
            <>
              <SectionLabel title="Grading" />
              {gradeCut.tons > 0 && <LineRow label="Grade Cut" value={fh(gradeCut.hours)} sub={`${gradeCut.tons.toFixed(1)} tons`} />}
              {gradeFill.tons > 0 && <LineRow label="Grade Fill" value={fh(gradeFill.hours)} sub={`${gradeFill.tons.toFixed(1)} tons`} />}
              {jjTons > 0 && <LineRow label="Jumping Jack" value={fh(jjHrs)} sub={`${jjTons.toFixed(1)} tons`} />}
              {ssTons > 0 && <LineRow label="SS Compact" value={fh(ssHrs)} sub={`${ssTons.toFixed(1)} tons`} />}
            </>
          )}
          {(stumpSmallHrs || stumpMedHrs || stumpLargeHrs || stumpXLHrs || treeIH.some(r => r.hrs > 0)) > 0 && (
            <>
              <SectionLabel title="Stump / Tree" />
              {n(stumpSmallQty) > 0 && <LineRow label={`Stump Small × ${stumpSmallQty}`} value={fh(stumpSmallHrs)} />}
              {n(stumpMedQty) > 0 && <LineRow label={`Stump Medium × ${stumpMedQty}`} value={fh(stumpMedHrs)} />}
              {n(stumpLargeQty) > 0 && <LineRow label={`Stump Large × ${stumpLargeQty}`} value={fh(stumpLargeHrs)} />}
              {n(stumpXLQty) > 0 && <LineRow label={`Stump XL × ${stumpXLQty}`} value={fh(stumpXLHrs)} />}
              {treeIH.map((r, i) =>
                r.hrs > 0 ? (
                  <LineRow key={i} label={`${r.size} Trees × ${r.qty} @ ${r.height || 10}ft`} value={fh(r.hrs)} />
                ) : null
              )}
            </>
          )}
          {manualIH.length > 0 && (
            <>
              <SectionLabel title="Manual Entry" />
              {manualIH.map((r, i) => (
                <LineRow
                  key={i}
                  label={r.label || `Item ${i + 1}`}
                  value={n(r.hours) > 0 ? `${n(r.hours).toFixed(1)} hrs` : fmt2(r.materials)}
                  sub={n(r.hours) > 0 && n(r.materials) > 0 ? `${fmt2(r.materials)} mat.` : undefined}
                />
              ))}
            </>
          )}
        </>
      ) : null}

      {/* ── Subcontractor ── */}
      {subHasLines ? (
        <>
          <GroupLabel color="text-orange-600">Subcontractor</GroupLabel>
          {n(subDemoSF) > 0 && (
            <>
              <SectionLabel title="Combined Demo" />
              <LineRow
                label={`Demolition — ${n(subDemoSF).toLocaleString()} SF @ ${subDemoDepth || 7}"`}
                value={fmt(subDemoCost)}
                sub={`${fmt2(miniRate(subDemoDepth || 7))}/sf`}
              />
            </>
          )}
          {subMiscFlat.some(r => n(r.sf) > 0) && (
            <>
              <SectionLabel title="Misc Flat Demo" />
              {subMiscFlat.map((r, i) =>
                n(r.sf) > 0 ? (
                  <LineRow key={i} label={r.label || `Item ${i + 1}`} value={fmt(r.cost)} sub={`${n(r.sf)} SF`} />
                ) : null
              )}
            </>
          )}
          {subGradeRows.length > 0 && (
            <>
              <SectionLabel title="Grading" />
              {subGradeRows.map((r, i) => (
                <LineRow key={i} label={r.label} value={fmt(n(r.sf) * r.rate)} sub={`${n(r.sf)} SF · ${fmt2(r.rate)}/sf`} />
              ))}
            </>
          )}
          {subTree.length > 0 && (
            <>
              <SectionLabel title="Tree Demo" />
              {subTree.map((r, i) => (
                <LineRow key={i} label={`${r.size} Trees × ${r.qty}`} value={fmt(r.cost)} sub={`${fmt2(subTreeRate(r.size))}/ea`} />
              ))}
            </>
          )}
          {haulRows.length > 0 && (
            <>
              <SectionLabel title="Hauling" />
              {haulRows.map((r, i) => (
                <LineRow key={i} label={`${r.label} × ${r.loads}`} value={fmt(n(r.loads) * r.rate)} sub={`${fmt(r.rate)}/load`} />
              ))}
            </>
          )}
          {subManual.length > 0 && (
            <>
              <SectionLabel title="Manual Entry" />
              {subManual.map((r, i) => (
                <LineRow key={i} label={r.label || `Item ${i + 1}`} value={fmt2(r.subCost)} />
              ))}
            </>
          )}
        </>
      ) : null}

      {!inHouseHasLines && !subHasLines && (
        <p className="text-xs text-gray-400 text-center py-4">No line items entered.</p>
      )}

      {/* ── Totals ── */}
      <FinancialSummaryList
        totalHrs={totalHrs}
        manDays={manDays}
        totalMat={totalMat}
        laborCost={laborCost}
        lrph={n(laborRatePerHour)}
        burden={burden}
        subCost={subCost}
        gp={gp}
        subGp={subGp}
        commission={commission}
        price={priceTotal}
      />
    </div>
  )
}
