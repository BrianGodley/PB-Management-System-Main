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

const FINISHES_RATES = {
  flatTile: { db: 'Finishes Tile Flatwork', fb: 6.5 },
  flatBrick: { db: 'Finishes Brick Flatwork', fb: 3.0 },
  flatFlagstone: { db: 'Finishes Flagstone Flatwork', fb: 400.0 },
  flatPorcelain: { db: 'Finishes Porcelain Flatwork', fb: 10.0 },
  capFlagstone: { db: 'Finishes Cap Flagstone', fb: 500.0 },
  capPrecast: { db: 'Finishes Cap Precast', fb: 50.0 },
  capBullnose: { db: 'Finishes Cap Bullnose Brick', fb: 5.0 },
  concreteTruck: { db: 'Finishes Concrete Truck', fb: 185.0 },
  sandStucco: { db: 'Sand Stucco - Finishes', fb: 0.0 },
  smoothStucco: { db: 'Smooth Stucco - Finishes', fb: 0.0 },
  ledgerstone: { db: 'Ledgerstone - Finishes', fb: 10.0 },
  stackedStone: { db: 'Stacked Stone - Finishes', fb: 10.0 },
  tile: { db: 'Tile - Finishes', fb: 6.5 },
  realFlagstone: { db: 'Real Flagstone - Finishes', fb: 400.0 },
  realStone: { db: 'Real Stone - Finishes', fb: 400.0 },
  flatTileLab: { db: 'Finishes Tile Flatwork Labor Rate', fb: 0.2867 },
  flatBrickLab: { db: 'Finishes Brick Flatwork Labor Rate', fb: 0.35 },
  flatFlagstoneLab: { db: 'Finishes Flagstone Flatwork Labor Rate', fb: 0.4487 },
  flatPorcelainLab: { db: 'Finishes Porcelain Flatwork Labor Rate', fb: 0.267 },
  sandStuccoLab: { db: 'Sand Stucco - Finishes Labor Rate', fb: 92 },
  smoothStuccoLab: { db: 'Smooth Stucco - Finishes Labor Rate', fb: 65 },
  ledgerstoneLab: { db: 'Ledgerstone - Finishes Labor Rate', fb: 24 },
  stackedStoneLab: { db: 'Stacked Stone - Finishes Labor Rate', fb: 24 },
  tileLab: { db: 'Tile - Finishes Labor Rate', fb: 0.2867 },
  flagstoneLab: { db: 'Real Flagstone - Finishes Labor Rate', fb: 0.4487 },
  realStoneLab: { db: 'Real Stone - Finishes Labor Rate', fb: 0.8954 },
  capFlagstoneLab: { db: 'Finishes Cap Flagstone Labor Rate', fb: 0.25 },
  capPrecastLab: { db: 'Finishes Cap Precast Labor Rate', fb: 0.2 },
  capPipLab: { db: 'Finishes Cap PIP Concrete Labor Rate', fb: 0.15 },
  capBullnoseLab: { db: 'Finishes Cap Bullnose Labor Rate', fb: 0.08 },
  stoneScrews: { db: 'Finishes Stone Screws', fb: 0.4 },
  tileAdhesive: { db: 'Finishes Tile Adhesive/Grout', fb: 1.0 },
}

const finishMatPrice = resolveMaterialPrice

function computeFlatRow(row, mp, materialRows) {
  const sf = n(row.sf)
  const price = k =>
    finishMatPrice(FINISHES_RATES[k].db, row.vendor, materialRows, mp, FINISHES_RATES[k].fb)
  const lab = k => mp?.[FINISHES_RATES[k].db] ?? FINISHES_RATES[k].fb
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
      mat = sf > 0 ? (sf / 80) * rate : 0
      hrs = sf > 0 ? sf * lab('flatFlagstoneLab') : 0
      subUnit = rate / 80
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
    finishMatPrice(FINISHES_RATES[k].db, row.vendor, materialRows, mp, FINISHES_RATES[k].fb)
  const lab = k => mp?.[FINISHES_RATES[k].db] ?? FINISHES_RATES[k].fb
  let mat = 0,
    hrs = 0,
    subUnit = 0,
    subQty = 0,
    unit = 'LF',
    dispQty = lf
  switch (row.type) {
    case 'Flagstone':
      mat = (((widthIn / 12) * lf * 0.0833 * 100) / 2000) * price('capFlagstone')
      hrs = lf * lab('capFlagstoneLab')
      subUnit = (((widthIn / 12) * 0.0833 * 100) / 2000) * price('capFlagstone')
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
    finishMatPrice(FINISHES_RATES[k].db, row.vendor, materialRows, mp, FINISHES_RATES[k].fb)
  const lab = k => mp?.[FINISHES_RATES[k].db] ?? FINISHES_RATES[k].fb
  let mat = 0,
    hrs = 0,
    subUnit = 0
  switch (row.type) {
    case 'Sand Stucco':
      hrs = sf > 0 ? (sf / lab('sandStuccoLab')) * 8 : 0
      mat = sf * price('sandStucco')
      subUnit = price('sandStucco')
      break
    case 'Smooth Stucco':
      hrs = sf > 0 ? (sf / lab('smoothStuccoLab')) * 8 : 0
      mat = sf * price('smoothStucco')
      subUnit = price('smoothStucco')
      break
    case 'Ledgerstone':
      hrs = sf > 0 ? (sf / lab('ledgerstoneLab')) * 8 : 0
      mat = sf > 0 ? sf * price('ledgerstone') * 1.1 + sf * lab('stoneScrews') : 0
      subUnit = price('ledgerstone') * 1.1 + lab('stoneScrews')
      break
    case 'Stacked Stone':
      hrs = sf > 0 ? (sf / lab('stackedStoneLab')) * 8 : 0
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
      mat = sf > 0 ? (sf / 80) * rate : 0
      subUnit = rate / 80
      break
    }
    case 'Real Stone': {
      const rate = n(row.rateIn) || price('realStone')
      hrs = sf > 0 ? sf * lab('realStoneLab') : 0
      mat = sf > 0 ? (sf / 70) * rate : 0
      subUnit = rate / 70
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
