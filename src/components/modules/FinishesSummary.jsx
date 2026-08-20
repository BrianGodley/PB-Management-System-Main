import FinancialSummaryList from './FinancialSummaryList'
import { resolveMaterialPrice } from '../../lib/materialCatalog'

// ─────────────────────────────────────────────────────────────────────────────
// FinishesSummary — read-only detail view for a saved Finishes module.
//
// Consumes the row-based catalog shape (ihData / subData holding flatworkRows /
// capRows / wallFinishRows). Recomputes each row's material / labor from the
// saved rate maps so lines show Vendor · Item · qty/SF · Material (+ hrs on
// In-House, flat $ on Sub). Falls back gracefully to legacy flat saves so old
// estimates never crash.
// ─────────────────────────────────────────────────────────────────────────────

const n = v => parseFloat(v) || 0
const fmt = v =>
  `$${n(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

// Identity-only: each entry carries just the DB rate name (`db`). Every price /
// labor coefficient is read LIVE from the saved rate map — no hardcoded
// fallbacks. A missing rate resolves to 0.
const FINISHES_RATES = {
  flatTile: { db: 'Finishes Tile Flatwork' },
  flatBrick: { db: 'Finishes Brick Flatwork' },
  flatFlagstone: { db: 'Finishes Flagstone Flatwork' },
  flatPorcelain: { db: 'Finishes Porcelain Flatwork' },
  capFlagstone: { db: 'Finishes Cap Flagstone' },
  capPrecast: { db: 'Finishes Cap Precast' },
  capBullnose: { db: 'Finishes Cap Bullnose Brick' },
  concreteTruck: { db: 'Finishes Concrete Truck' },
  sandStucco: { db: 'Sand Stucco - Finishes' },
  smoothStucco: { db: 'Smooth Stucco - Finishes' },
  ledgerstone: { db: 'Ledgerstone - Finishes' },
  stackedStone: { db: 'Stacked Stone - Finishes' },
  tile: { db: 'Tile - Finishes' },
  realFlagstone: { db: 'Real Flagstone - Finishes' },
  realStone: { db: 'Real Stone - Finishes' },
  flatTileLab: { db: 'Finishes Tile Flatwork Labor Rate' },
  flatBrickLab: { db: 'Finishes Brick Flatwork Labor Rate' },
  flatFlagstoneLab: { db: 'Finishes Flagstone Flatwork Labor Rate' },
  flatPorcelainLab: { db: 'Finishes Porcelain Flatwork Labor Rate' },
  sandStuccoLab: { db: 'Sand Stucco - Finishes Labor Rate' },
  smoothStuccoLab: { db: 'Smooth Stucco - Finishes Labor Rate' },
  ledgerstoneLab: { db: 'Ledgerstone - Finishes Labor Rate' },
  stackedStoneLab: { db: 'Stacked Stone - Finishes Labor Rate' },
  tileLab: { db: 'Tile - Finishes Labor Rate' },
  flagstoneLab: { db: 'Real Flagstone - Finishes Labor Rate' },
  realStoneLab: { db: 'Real Stone - Finishes Labor Rate' },
  capFlagstoneLab: { db: 'Finishes Cap Flagstone Labor Rate' },
  capPrecastLab: { db: 'Finishes Cap Precast Labor Rate' },
  capPipLab: { db: 'Finishes Cap PIP Concrete Labor Rate' },
  capBullnoseLab: { db: 'Finishes Cap Bullnose Labor Rate' },
  stoneScrews: { db: 'Finishes Stone Screws' },
  tileAdhesive: { db: 'Finishes Tile Adhesive/Grout' },
}

const finishMatPrice = resolveMaterialPrice

function computeFlatRow(row, mp, materialRows) {
  const sf = n(row.sf)
  const price = k =>
    finishMatPrice(FINISHES_RATES[k].db, row.vendor, materialRows, mp, 0)
  const lab = k => n(mp?.[FINISHES_RATES[k].db])
  let mat = 0,
    hrs = 0,
    subUnit = 0
  switch (row.type) {
    case 'Tile':
      mat = sf * price('flatTile')
      hrs = sf > 0 ? sf * lab('flatTileLab') : 0
      subUnit = price('flatTile')
      break
    case 'Brick':
      mat = sf * 2 * price('flatBrick')
      hrs = sf > 0 ? sf * lab('flatBrickLab') : 0
      subUnit = 2 * price('flatBrick')
      break
    case 'Flagstone': {
      const rate = n(row.rateIn) || price('flatFlagstone')
      mat = sf > 0 ? sf * rate : 0 // now $/Sq Ft (was $/ton ÷ 80)
      hrs = sf > 0 ? sf * lab('flatFlagstoneLab') : 0
      subUnit = rate
      break
    }
    case 'Porcelain':
      mat = sf * price('flatPorcelain')
      hrs = sf > 0 ? sf * lab('flatPorcelainLab') : 0
      subUnit = price('flatPorcelain')
      break
    default:
      break
  }
  const subEach = row.subEach !== '' && row.subEach != null ? n(row.subEach) : subUnit
  return { qty: sf, unit: 'SF', mat, hrs, subEach, subMat: sf * subEach }
}

function computeCapRow(row, mp, materialRows) {
  const lf = n(row.lf),
    widthIn = n(row.widthIn),
    qty = n(row.qty)
  const price = k =>
    finishMatPrice(FINISHES_RATES[k].db, row.vendor, materialRows, mp, 0)
  const lab = k => n(mp?.[FINISHES_RATES[k].db])
  let mat = 0,
    hrs = 0,
    subUnit = 0,
    subQty = 0,
    unit = 'LF',
    dispQty = lf
  switch (row.type) {
    case 'Flagstone':
      // 1 Sq Ft per Ln Ft (width averages out); rate is now $/Sq Ft, applied per LF.
      mat = lf * price('capFlagstone')
      hrs = lf * lab('capFlagstoneLab')
      subUnit = price('capFlagstone')
      subQty = lf
      break
    case 'Precast':
      mat = qty * price('capPrecast')
      hrs = qty * lab('capPrecastLab')
      subUnit = price('capPrecast')
      subQty = qty
      unit = 'ea'
      dispQty = qty
      break
    case 'PIP Concrete':
      mat = ((lf * (widthIn / 12) * 0.333) / 27) * price('concreteTruck')
      hrs = lf * lab('capPipLab')
      subUnit = (((widthIn / 12) * 0.333) / 27) * price('concreteTruck')
      subQty = lf
      break
    case 'Bullnose Brick':
      mat = lf * price('capBullnose')
      hrs = lf * lab('capBullnoseLab')
      subUnit = price('capBullnose')
      subQty = lf
      break
    default:
      break
  }
  const subEach = row.subEach !== '' && row.subEach != null ? n(row.subEach) : subUnit
  return { qty: dispQty, unit, mat, hrs, subEach, subMat: subQty * subEach, widthIn }
}

function computeWallRow(row, mp, materialRows) {
  const sf = n(row.sf)
  const price = k =>
    finishMatPrice(FINISHES_RATES[k].db, row.vendor, materialRows, mp, 0)
  const lab = k => n(mp?.[FINISHES_RATES[k].db])
  let mat = 0,
    hrs = 0,
    subUnit = 0
  switch (row.type) {
    case 'Sand Stucco':
      hrs = sf > 0 ? sf * lab('sandStuccoLab') : 0
      mat = sf * price('sandStucco')
      subUnit = price('sandStucco')
      break
    case 'Smooth Stucco':
      hrs = sf > 0 ? sf * lab('smoothStuccoLab') : 0
      mat = sf * price('smoothStucco')
      subUnit = price('smoothStucco')
      break
    case 'Ledgerstone':
      hrs = sf > 0 ? sf * lab('ledgerstoneLab') : 0
      mat = sf > 0 ? sf * price('ledgerstone') * 1.1 + sf * lab('stoneScrews') : 0
      subUnit = price('ledgerstone') * 1.1 + lab('stoneScrews')
      break
    case 'Stacked Stone':
      hrs = sf > 0 ? sf * lab('stackedStoneLab') : 0
      mat = sf > 0 ? sf * price('stackedStone') * 1.1 + sf * lab('stoneScrews') : 0
      subUnit = price('stackedStone') * 1.1 + lab('stoneScrews')
      break
    case 'Tile':
      hrs = sf > 0 ? sf * lab('tileLab') : 0
      mat = sf > 0 ? sf * price('tile') + sf * lab('tileAdhesive') : 0
      subUnit = price('tile') + lab('tileAdhesive')
      break
    case 'Real Flagstone': {
      const rate = n(row.rateIn) || price('realFlagstone')
      hrs = sf > 0 ? sf * lab('flagstoneLab') : 0
      mat = sf > 0 ? sf * rate : 0 // now $/Sq Ft (was $/ton ÷ 80)
      subUnit = rate
      break
    }
    case 'Real Stone': {
      const rate = n(row.rateIn) || price('realStone')
      hrs = sf > 0 ? sf * lab('realStoneLab') : 0
      mat = sf > 0 ? sf * rate : 0 // now $/Sq Ft (was $/ton ÷ 70)
      subUnit = rate
      break
    }
    default:
      break
  }
  const subEach = row.subEach !== '' && row.subEach != null ? n(row.subEach) : subUnit
  return { qty: sf, unit: 'SF', mat, hrs, subEach, subMat: sf * subEach }
}

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
      <span className={`text-xs ${highlight ? 'text-gray-800' : 'text-gray-600'} flex-1 pr-2`}>
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

export default function FinishesSummary({ module }) {
  const data = module?.data || {}
  const isSub = data.subType === 'Subcontractor'
  const tab = isSub ? data.subData || {} : data.ihData || data
  const materialPrices = data.materialPrices || {}
  const materialRows = data.materialRows || []
  const vendorNames = data.vendorNames || {}
  const calc = data.calc || {}
  const {
    difficulty = 0,
    hoursAdj = 0,
    flatworkRows = [],
    capRows = [],
    wallFinishRows = [],
    manualRows = [],
  } = tab

  const vendorLabel = v => (!v || v === 'Standard' ? 'Standard' : vendorNames[v] || 'Vendor')

  // Build display lines for one section. `compute` returns qty/unit/mat/hrs/subMat.
  function sectionLines(rows, compute, isActiveFn) {
    return (rows || [])
      .map((row, i) => {
        if (!isActiveFn(row)) return null
        const c = compute(row, materialPrices, materialRows)
        const material = isSub ? c.subMat : c.mat
        const subParts = []
        if (!isSub && c.hrs > 0) subParts.push(`${c.hrs.toFixed(2)} hrs`)
        if (isSub) subParts.push(`${fmt(c.subEach)}/${c.unit}`)
        return {
          key: i,
          label: `${vendorLabel(row.vendor)} · ${row.type}`,
          value: `${n(c.qty)} ${c.unit}`,
          sub: [material > 0 ? fmt(material) : null, subParts.join(' · ') || null]
            .filter(Boolean)
            .join('  ·  '),
        }
      })
      .filter(Boolean)
  }

  const flatLines = sectionLines(
    flatworkRows,
    computeFlatRow,
    r => n(r.sf) > 0
  )
  const capLines = sectionLines(
    capRows,
    computeCapRow,
    r => r.type && r.type !== 'None' && (n(r.lf) > 0 || n(r.qty) > 0)
  )
  const wallLines = sectionLines(
    wallFinishRows,
    computeWallRow,
    r => n(r.sf) > 0
  )

  const financeRows = [
    { label: 'Materials', value: fmt(calc.totalMat) },
    { label: 'Labor', value: fmt(calc.laborCost) },
    { label: 'Burden', value: fmt(calc.burden) },
    { label: 'GP', value: fmt(calc.gp) },
    { label: 'Commission', value: fmt(calc.commission) },
    { label: 'Subs', value: fmt(calc.subCost) },
    { label: 'Price', value: fmt(calc.price), highlight: true },
  ]

  return (
    <div className="text-sm space-y-1">
      {/* Financial summary — FinancialSummaryList reads NAMED props */}
      <FinancialSummaryList
        totalHrs={n(calc.totalHrs)}
        manDays={n(calc.manDays)}
        totalMat={n(calc.totalMat)}
        laborCost={n(calc.laborCost)}
        lrph={n(data.laborRatePerHour) || 35}
        burden={n(calc.burden)}
        subCost={n(calc.subCost)}
        gp={n(calc.gp)}
        subGp={n(calc.subGp)}
        commission={n(calc.commission)}
        price={n(calc.price)}
      />

      {isSub && (
        <div className="flex flex-wrap gap-2 pt-1">
          <span className="text-xs bg-orange-50 text-orange-700 px-2 py-1 rounded font-medium">
            Subcontractor
          </span>
        </div>
      )}

      {/* Flatwork */}
      {flatLines.length > 0 && (
        <>
          <SectionLabel title="Flatwork Finish" />
          {flatLines.map(l => (
            <LineRow key={l.key} label={l.label} value={l.value} sub={l.sub} />
          ))}
        </>
      )}

      {/* Wall Caps */}
      {capLines.length > 0 && (
        <>
          <SectionLabel title="Wall Caps" />
          {capLines.map(l => (
            <LineRow key={l.key} label={l.label} value={l.value} sub={l.sub} />
          ))}
        </>
      )}

      {/* Wall Finishes */}
      {wallLines.length > 0 && (
        <>
          <SectionLabel title="Wall Finishes" />
          {wallLines.map(l => (
            <LineRow key={l.key} label={l.label} value={l.value} sub={l.sub} />
          ))}
        </>
      )}

      {/* Labor breakdown (In-House only carries hours) */}
      {!isSub && (n(calc.totalHrs) || n(difficulty) || n(hoursAdj)) ? (
        <>
          <SectionLabel title="Labor" />
          <LineRow label="Total Hours" value={`${(calc.totalHrs || 0).toFixed(2)} hrs`} />
          <LineRow label="Man Days" value={`${(calc.manDays || 0).toFixed(2)} days`} />
          {n(difficulty) > 0 && <LineRow label="Difficulty Add" value={`${n(difficulty)}%`} />}
          {n(hoursAdj) !== 0 && <LineRow label="Hours Adjustment" value={`${n(hoursAdj)} hrs`} />}
        </>
      ) : null}

      {/* Manual */}
      {manualRows.filter(r => n(r.hours) || n(r.materials) || n(r.subCost)).length > 0 && (
        <>
          <SectionLabel title="Manual Entry" />
          {manualRows
            .filter(r => n(r.hours) || n(r.materials) || n(r.subCost))
            .map((r, i) => (
              <LineRow
                key={i}
                label={r.label || `Misc ${i + 1}`}
                value={n(r.hours) > 0 ? `${n(r.hours)} hrs` : '—'}
                sub={[
                  n(r.materials) > 0 && fmt(r.materials),
                  n(r.subCost) > 0 && `Sub: ${fmt(r.subCost)}`,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              />
            ))}
        </>
      )}
    </div>
  )
}
