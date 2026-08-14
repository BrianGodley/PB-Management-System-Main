import FinancialSummaryList from './FinancialSummaryList'
import { resolveMaterialPrice } from '../../lib/materialCatalog'

// ─────────────────────────────────────────────────────────────────────────────
// WallsSummary — read-only detail view for a saved Walls module.
// In-House and Sub are independent tab records (data.ihData / data.subData),
// with a flat-field fallback for legacy estimates. The material sections
// (Wall Finishes / Wall Caps / Waterproofing) are now Vendor + Item rows and
// are re-priced from the saved rate maps so each line shows Vendor · Item ·
// qty · Material (+ hrs In-House, flat $ on Sub). Structural walls keep their
// geometry blocks (with a vendor label). Legacy saves never crash.
// ─────────────────────────────────────────────────────────────────────────────

const n = v => parseFloat(v) || 0
const fmt = v =>
  `$${n(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

// Rate metadata mirrored from WallsModule (finish + cap + wp material/labor).
const WALL_RATES = {
  concreteTruck: { db: 'Concrete - Ready Mix (Truck)' }, // shared Basic Materials
  sandStucco: { db: 'Sand Stucco - Wall' },
  smoothStucco: { db: 'Smooth Stucco - Wall' },
  ledgerstone: { db: 'Ledgerstone - Wall' },
  stackedStone: { db: 'Stacked Stone - Wall' },
  tile: { db: 'Tile - Wall' },
  flagstone: { db: 'Real Flagstone - Wall' },
  realStone: { db: 'Real Stone - Wall' },
  sandStuccoLab: { db: 'Sand Stucco - Wall Labor Rate' },
  smoothStuccoLab: { db: 'Smooth Stucco - Wall Labor Rate' },
  ledgerstoneLab: { db: 'Ledgerstone - Wall Labor Rate' },
  stackedStoneLab: { db: 'Stacked Stone - Wall Labor Rate' },
  tileLab: { db: 'Tile - Wall Labor Rate' },
  flagstoneLab: { db: 'Real Flagstone - Wall Labor Rate' },
  realStoneLab: { db: 'Real Stone - Wall Labor Rate' },
  capFlagstone: { db: 'Wall Cap Flagstone' },
  capPrecast: { db: 'Wall Cap Precast' },
  capBullnose: { db: 'Wall Cap Bullnose Brick' },
  wpPrimerMembrane: { db: 'Wall WP Primer Membrane' },
  wp3CoatRollOn: { db: 'Wall WP 3 Coat Roll On' },
  wpThoroseal: { db: 'Wall WP Thoroseal Roll On' },
  wpDimpleMembrane: { db: 'Wall WP Dimple Membrane' },
}
const WP_KEY = {
  'Primer & Membrane': 'wpPrimerMembrane',
  '3 Coats Roll On': 'wp3CoatRollOn',
  'Thoroseal & Roll On': 'wpThoroseal',
  'Dimple Membrane': 'wpDimpleMembrane',
}

const wallMatPrice = resolveMaterialPrice

function computeWallFinishRow(row, mp, materialRows) {
  const sf = n(row.sf)
  const v = row.vendor
  const price = k => wallMatPrice(WALL_RATES[k].db, v, materialRows, mp)
  const lab = k => n(mp?.[WALL_RATES[k].db])
  const ovr = (input, k) => {
    const x = parseFloat(input)
    return Number.isFinite(x) && x > 0 ? x : price(k)
  }
  let mat = 0,
    hrs = 0,
    subUnit = 0
  switch (row.type) {
    case 'Sand Stucco': {
      const rate = ovr(row.rateIn, 'sandStucco')
      hrs = sf > 0 ? (sf / lab('sandStuccoLab')) * 8 : 0
      mat = sf * rate
      subUnit = rate
      break
    }
    case 'Smooth Stucco': {
      const rate = ovr(row.rateIn, 'smoothStucco')
      hrs = sf > 0 ? (sf / lab('smoothStuccoLab')) * 8 : 0
      mat = sf * rate
      subUnit = rate
      break
    }
    case 'Ledgerstone': {
      const rate = ovr(row.rateIn, 'ledgerstone')
      hrs = sf > 0 ? (sf / lab('ledgerstoneLab')) * 8 : 0
      mat = sf > 0 ? sf * rate * 1.1 + (sf / 5) * 2 : 0
      subUnit = rate * 1.1 + 0.4
      break
    }
    case 'Stacked Stone': {
      const rate = ovr(row.rateIn, 'stackedStone')
      hrs = sf > 0 ? (sf / lab('stackedStoneLab')) * 8 : 0
      mat = sf > 0 ? sf * rate * 1.1 + (sf / 5) * 2 : 0
      subUnit = rate * 1.1 + 0.4
      break
    }
    case 'Tile': {
      const rate = ovr(row.rateIn, 'tile')
      hrs = sf > 0 ? sf * lab('tileLab') : 0
      mat = sf > 0 ? sf * rate + sf : 0
      subUnit = rate + 1
      break
    }
    case 'Real Flagstone': {
      const rate = n(row.rateIn) || price('flagstone')
      hrs = sf > 0 ? sf * lab('flagstoneLab') : 0
      mat = sf > 0 ? (sf / 80) * rate + sf * 1.5 : 0
      subUnit = rate / 80 + 1.5
      break
    }
    case 'Real Stone': {
      const rate = n(row.rateIn) || price('realStone')
      hrs = sf > 0 ? sf * lab('realStoneLab') : 0
      mat = sf > 0 ? (sf / 70) * rate + sf * 2 : 0
      subUnit = rate / 70 + 2
      break
    }
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
  const v = row.vendor
  const price = k => wallMatPrice(WALL_RATES[k].db, v, materialRows, mp)
  let mat = 0,
    hrs = 0,
    subUnit = 0,
    subQty = 0,
    unit = 'LF',
    dispQty = lf
  switch (row.type) {
    case 'Flagstone':
      mat = (((widthIn / 12) * lf * 0.0833 * 100) / 2000) * price('capFlagstone')
      hrs = lf * 0.25
      subUnit = (((widthIn / 12) * 0.0833 * 100) / 2000) * price('capFlagstone')
      subQty = lf
      break
    case 'Precast': {
      const widthFactor = (widthIn || 8) / 8
      mat = qty * price('capPrecast') * widthFactor
      hrs = qty * 0.2
      subUnit = price('capPrecast') * widthFactor
      subQty = qty
      unit = 'ea'
      dispQty = qty
      break
    }
    case 'PIP Concrete':
      mat = ((lf * (widthIn / 12) * 0.333) / 27) * price('concreteTruck')
      hrs = lf * 0.15
      subUnit = (((widthIn / 12) * 0.333) / 27) * price('concreteTruck')
      subQty = lf
      break
    case 'Bullnose Brick':
      mat = lf * price('capBullnose')
      hrs = lf * 0.08
      subUnit = price('capBullnose')
      subQty = lf
      break
    default:
      break
  }
  const subEach = row.subEach !== '' && row.subEach != null ? n(row.subEach) : subUnit
  return { qty: dispQty, unit, mat, hrs, subEach, subMat: subQty * subEach }
}

function computeWpRow(row, mp, materialRows) {
  const sf = n(row?.sf)
  const k = WP_KEY[row?.type]
  let mat = 0,
    hrs = 0,
    subUnit = 0
  if (sf > 0 && k) {
    const pr = wallMatPrice(WALL_RATES[k].db, row.vendor, materialRows, mp)
    mat = sf * pr
    hrs = sf / 200
    subUnit = pr
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

const WALL_LABELS = {
  CMU: 'CMU Block Wall',
  PIP: 'Poured In Place Wall',
  Modular: 'Modular Block Wall',
  Brick: 'Brick Wall',
  Timber: 'Timber / Lumber Wall',
}

// Gather every wall entry's own waterproofing rows (CMU + PIP + Modular) plus
// any legacy tab-level wpRows, into one active list.
function allWpRows(t = {}) {
  const fromWalls = []
  ;['cmuWalls', 'pipWalls', 'modularWalls', 'brickWalls'].forEach(k => {
    if (Array.isArray(t[k])) t[k].forEach(w => (w.wpRows || []).forEach(r => fromWalls.push(r)))
  })
  const legacy = Array.isArray(t.wpRows) ? t.wpRows : []
  return [...fromWalls, ...legacy].filter(w => w && w.type && w.type !== 'None' && n(w.sf) > 0)
}

// Finishes & caps now live per-wall. Gather each wall's rows; fall back to the
// legacy top-level list (older saves) so both formats render identically.
function allFinishRows(t = {}) {
  const fromWalls = []
  ;['cmuWalls', 'pipWalls', 'modularWalls', 'brickWalls'].forEach(k => {
    if (Array.isArray(t[k])) t[k].forEach(w => (w.finishRows || []).forEach(r => fromWalls.push(r)))
  })
  const topLevel = Array.isArray(t.wallFinishRows) ? t.wallFinishRows : legacyFinishRows(t)
  return [...fromWalls, ...topLevel]
}
function allCapRows(t = {}) {
  const fromWalls = []
  ;['cmuWalls', 'pipWalls', 'modularWalls', 'brickWalls'].forEach(k => {
    if (Array.isArray(t[k])) t[k].forEach(w => (w.capRows || []).forEach(r => fromWalls.push(r)))
  })
  const topLevel = Array.isArray(t.capRows) ? t.capRows : []
  return [...fromWalls, ...topLevel]
}

// Legacy flat finish fields → row shape (so old saves still list finishes).
function legacyFinishRows(t = {}) {
  const rows = []
  const push = (type, sfKey, rateKey) => {
    if (n(t[sfKey]) > 0)
      rows.push({ vendor: 'Standard', type, sf: t[sfKey], rateIn: t[rateKey] ?? '', subEach: '' })
  }
  push('Sand Stucco', 'sandStuccoSF', 'sandStuccoRateIn')
  push('Smooth Stucco', 'smoothStuccoSF', 'smoothStuccoRateIn')
  push('Ledgerstone', 'ledgerstoneSF', 'ledgerstoneRateIn')
  push('Stacked Stone', 'stackedStoneSF', 'stackedStoneRateIn')
  push('Tile', 'tileSF', 'tileRateIn')
  push('Real Flagstone', 'flagstoneSF', 'flagstoneRateIn')
  push('Real Stone', 'realStoneSF', 'realStoneRateIn')
  return rows
}

// True when a tab record actually holds some wall / finish / cap / wp entry.
function tabHasData(t = {}) {
  const cmu = (t.cmuWalls || []).some(w => n(w.lf) > 0 || n(w.heightIn) > 0)
  const pip = (t.pipWalls || []).some(w => n(w.lf) > 0 || n(w.heightIn) > 0)
  const modular = (t.modularWalls || []).some(w => n(w.lf) > 0 || n(w.heightIn) > 0)
  const brick = (t.brickWalls || []).some(w => n(w.lf) > 0 || n(w.heightIn) > 0)
  const timber = n(t.timberLF) > 0 || n(t.timberPosts) > 0
  const finishRows = allFinishRows(t).some(r => n(r.sf) > 0)
  const caps = allCapRows(t).some(
    c => c.type && c.type !== 'None' && (n(c.lf) > 0 || n(c.qty) > 0)
  )
  const wp = allWpRows(t).length > 0
  const manual = (t.manualRows || []).some(
    m => n(m.hours) > 0 || n(m.materials) > 0 || n(m.subCost) > 0
  )
  const legacy = n(t.cmuLF) > 0 || n(t.pipLF) > 0
  return cmu || pip || modular || brick || timber || finishRows || caps || wp || manual || legacy
}

// Quantity + material detail for a single tab record (In-House or Sub).
function WallQtyDetail({ t = {}, isSub, materialPrices, materialRows, vendorLabel }) {
  const {
    wallType = 'CMU',
    cmuLF = 0,
    cmuHeightIn = 0,
    cmuFootingWIn = 12,
    cmuFootingDIn = 12,
    cmuRebarSpIn = 16,
    cmuBondBeams = 1,
    cmuPctGrouted = 100,
    cmuPctCurved = 0,
    cmuFootingPump = 'No',
    cmuGroutPump = 'No',
    pipLF = 0,
    pipHeightIn = 0,
    timberLF = 0,
    timberHeightIn = 0,
    timberType = 'Railroad Treated',
    timberPosts = 0,
    timberSubEach = '',
  } = t

  const cmuWalls = Array.isArray(t.cmuWalls)
    ? t.cmuWalls.filter(w => n(w.lf) > 0 || n(w.heightIn) > 0)
    : []
  const pipWalls = Array.isArray(t.pipWalls)
    ? t.pipWalls.filter(w => n(w.lf) > 0 || n(w.heightIn) > 0)
    : []
  const modularWalls = Array.isArray(t.modularWalls)
    ? t.modularWalls.filter(w => n(w.lf) > 0 || n(w.heightIn) > 0)
    : []
  const brickWalls = Array.isArray(t.brickWalls)
    ? t.brickWalls.filter(w => n(w.lf) > 0 || n(w.heightIn) > 0)
    : []
  const wpRows = allWpRows(t)
  const finishRows = allFinishRows(t).filter(r => n(r.sf) > 0)
  const activeCaps = allCapRows(t).filter(
    c => c.type && c.type !== 'None' && (n(c.lf) > 0 || n(c.qty) > 0)
  )

  // Block Type may be a catalog product id (new model) or a built-in size name
  // (legacy). Resolve ids to the product name for display.
  const blockLabel = id => (materialRows || []).find(r => r.id === id)?.name || id

  // Build a Vendor · Item line with recomputed material (+ hrs / flat $).
  const rowLine = (row, c, i) => {
    const material = isSub ? c.subMat : c.mat
    const parts = []
    if (!isSub && c.hrs > 0) parts.push(`${c.hrs.toFixed(2)} hrs`)
    if (isSub) parts.push(`${fmt(c.subEach)}/${c.unit}`)
    return (
      <LineRow
        key={i}
        label={`${vendorLabel(row.vendor)} · ${row.type}`}
        value={`${n(c.qty)} ${c.unit}`}
        sub={[material > 0 ? fmt(material) : null, parts.join(' · ') || null]
          .filter(Boolean)
          .join('  ·  ')}
      />
    )
  }

  return (
    <>
      {/* Wall type */}
      <SectionLabel title="Wall Type" />
      <LineRow label="Type" value={WALL_LABELS[wallType] || wallType} highlight />

      {/* CMU detail — multi-wall arrays, with legacy single-entry fallback */}
      {cmuWalls.length > 0 &&
        cmuWalls.map((w, i) => (
          <div key={i}>
            <SectionLabel title={cmuWalls.length > 1 ? `CMU Wall ${i + 1}` : 'CMU Structure'} />
            {w.vendor && w.vendor !== 'Standard' && (
              <LineRow label="Vendor" value={vendorLabel(w.vendor)} />
            )}
            {w.blockType && <LineRow label="Block Type" value={blockLabel(w.blockType)} />}
            <LineRow label="Linear Feet" value={`${n(w.lf)} Ln Ft`} />
            <LineRow label="Wall Height" value={`${n(w.heightIn)} in`} />
            <LineRow
              label="Footing"
              value={`${n(w.footingWIn) || 12}"W × ${n(w.footingDIn) || 12}"D`}
            />
            <LineRow label="Rebar Spacing" value={`${n(w.rebarSpIn) || 16}" on-center`} />
            <LineRow label="Bond Beam Courses" value={n(w.bondBeams).toString()} />
            <LineRow label="% Grouted" value={`${n(w.pctGrouted)}%`} />
            {n(w.pctCurved) > 0 && <LineRow label="% Curved" value={`${n(w.pctCurved)}%`} />}
            {isSub && (n(w.subEach) > 0 || (w.subEach != null && w.subEach !== '')) && (
              <LineRow label="Sub Flat" value={`${fmt(w.subEach)} per Ln Ft`} />
            )}
          </div>
        ))}
      {cmuWalls.length === 0 && n(cmuLF) > 0 && (
        <>
          <SectionLabel title="CMU Structure" />
          <LineRow label="Linear Feet" value={`${n(cmuLF)} Ln Ft`} />
          <LineRow label="Wall Height" value={`${n(cmuHeightIn)} in`} />
          <LineRow label="Footing" value={`${n(cmuFootingWIn)}"W × ${n(cmuFootingDIn)}"D`} />
          <LineRow label="Rebar Spacing" value={`${n(cmuRebarSpIn)}" on-center`} />
          <LineRow label="Bond Beam Courses" value={n(cmuBondBeams).toString()} />
          <LineRow label="% Grouted" value={`${n(cmuPctGrouted)}%`} />
          {n(cmuPctCurved) > 0 && <LineRow label="% Curved" value={`${n(cmuPctCurved)}%`} />}
        </>
      )}
      {(cmuWalls.length > 0 || n(cmuLF) > 0) && cmuFootingPump === 'Yes' && (
        <LineRow label="Footing Pump" value="Yes" />
      )}
      {(cmuWalls.length > 0 || n(cmuLF) > 0) && cmuGroutPump === 'Yes' && (
        <LineRow label="Grout Pump" value="Yes" />
      )}

      {/* PIP detail */}
      {pipWalls.length > 0 &&
        pipWalls.map((w, i) => (
          <div key={i}>
            <SectionLabel
              title={pipWalls.length > 1 ? `Poured In Place ${i + 1}` : 'Poured In Place'}
            />
            {w.vendor && w.vendor !== 'Standard' && (
              <LineRow label="Vendor" value={vendorLabel(w.vendor)} />
            )}
            <LineRow label="Linear Feet" value={`${n(w.lf)} Ln Ft`} />
            <LineRow label="Wall Height" value={`${n(w.heightIn)} in`} />
            {isSub && (n(w.subEach) > 0 || (w.subEach != null && w.subEach !== '')) && (
              <LineRow label="Sub Flat" value={`${fmt(w.subEach)} per Ln Ft`} />
            )}
          </div>
        ))}
      {pipWalls.length === 0 && n(pipLF) > 0 && (
        <>
          <SectionLabel title="Poured In Place" />
          <LineRow label="Linear Feet" value={`${n(pipLF)} Ln Ft`} />
          <LineRow label="Wall Height" value={`${n(pipHeightIn)} in`} />
        </>
      )}

      {/* Modular detail — CMU-like minus rebar / grout / bond beam */}
      {modularWalls.length > 0 &&
        modularWalls.map((w, i) => (
          <div key={i}>
            <SectionLabel
              title={modularWalls.length > 1 ? `Wall Installation ${i + 1}` : 'Modular Structure'}
            />
            {w.vendor && w.vendor !== 'Standard' && (
              <LineRow label="Vendor" value={vendorLabel(w.vendor)} />
            )}
            {w.blockType && <LineRow label="Block Type" value={blockLabel(w.blockType)} />}
            <LineRow label="Linear Feet" value={`${n(w.lf)} Ln Ft`} />
            <LineRow label="Wall Height" value={`${n(w.heightIn)} in`} />
            <LineRow
              label="Footing"
              value={`${n(w.footingWIn) || 12}"W × ${n(w.footingDIn) || 12}"D`}
            />
            {n(w.pctCurved) > 0 && <LineRow label="% Curved" value={`${n(w.pctCurved)}%`} />}
            {isSub && (n(w.subEach) > 0 || (w.subEach != null && w.subEach !== '')) && (
              <LineRow label="Sub Flat" value={`${fmt(w.subEach)} per Ln Ft`} />
            )}
          </div>
        ))}
      {modularWalls.length > 0 && t.modularFootingPump === 'Yes' && (
        <LineRow label="Footing Pump" value="Yes" />
      )}

      {/* Brick detail — same shape as Modular */}
      {brickWalls.length > 0 &&
        brickWalls.map((w, i) => (
          <div key={i}>
            <SectionLabel
              title={brickWalls.length > 1 ? `Brick Wall ${i + 1}` : 'Brick Structure'}
            />
            {w.vendor && w.vendor !== 'Standard' && (
              <LineRow label="Vendor" value={vendorLabel(w.vendor)} />
            )}
            {w.blockType && <LineRow label="Block Type" value={blockLabel(w.blockType)} />}
            <LineRow label="Linear Feet" value={`${n(w.lf)} Ln Ft`} />
            <LineRow label="Wall Height" value={`${n(w.heightIn)} in`} />
            <LineRow
              label="Footing"
              value={`${n(w.footingWIn) || 12}"W × ${n(w.footingDIn) || 12}"D`}
            />
            {n(w.pctCurved) > 0 && <LineRow label="% Curved" value={`${n(w.pctCurved)}%`} />}
            {isSub && (n(w.subEach) > 0 || (w.subEach != null && w.subEach !== '')) && (
              <LineRow label="Sub Flat" value={`${fmt(w.subEach)} per Ln Ft`} />
            )}
          </div>
        ))}
      {brickWalls.length > 0 && t.brickFootingPump === 'Yes' && (
        <LineRow label="Footing Pump" value="Yes" />
      )}

      {/* Timber detail */}
      {n(timberLF) > 0 && (
        <>
          <SectionLabel title="Timber Wall" />
          <LineRow label="Timber Type" value={timberType} />
          <LineRow label="Linear Feet" value={`${n(timberLF)} Ln Ft`} />
          <LineRow label="Wall Height" value={`${n(timberHeightIn)} in`} />
          {n(timberPosts) > 0 && <LineRow label="Steel Posts" value={`${n(timberPosts)} qty`} />}
          {isSub && timberSubEach != null && timberSubEach !== '' && (
            <LineRow label="Sub Flat" value={`${fmt(timberSubEach)} per Ln Ft`} />
          )}
        </>
      )}

      {/* Waterproofing */}
      {wpRows.length > 0 && (
        <>
          <SectionLabel title="Waterproofing" />
          {wpRows.map((row, i) => rowLine(row, computeWpRow(row, materialPrices, materialRows), i))}
        </>
      )}

      {/* Wall Finishes */}
      {finishRows.length > 0 && (
        <>
          <SectionLabel title="Wall Finishes" />
          {finishRows.map((row, i) =>
            rowLine(row, computeWallFinishRow(row, materialPrices, materialRows), i)
          )}
        </>
      )}

      {/* Wall Caps */}
      {activeCaps.length > 0 && (
        <>
          <SectionLabel title="Wall Caps" />
          {activeCaps.map((row, i) => rowLine(row, computeCapRow(row, materialPrices, materialRows), i))}
        </>
      )}
    </>
  )
}

export default function WallsSummary({ module }) {
  const data = module?.data || {}
  const ih = data.ihData || data // legacy estimates stored flat = In-House
  const sub = data.subData || {}
  const calc = data.calc || {}
  const materialPrices = data.materialPrices || {}
  const materialRows = data.materialRows || []
  const vendorNames = data.vendorNames || {}
  const { difficulty = 0, hoursAdj = 0 } = ih
  const vendorLabel = v => (!v || v === 'Standard' ? 'Standard' : vendorNames[v] || 'Vendor')
  // Labor rate + assigned crews for the three labor-bucket lines. Crew names are
  // saved at the top level of `data` (spread from the module's state).
  const lrph = n(data.laborRatePerHour) || 35
  const mainCrew = data.crewType || ''
  const demoCrew = data.demoCrewType || ''
  const timberCrew = data.timberCrewType || ''
  // Main Wall Install hours: new saves carry calc.mainInstallHrs; legacy saves
  // fall back to the old structural+finish+cap+wp sum (which folded timber in).
  const mainInstallHrs =
    calc.mainInstallHrs != null
      ? n(calc.mainInstallHrs)
      : n(calc.structuralHrs) + n(calc.finishHrs) + n(calc.capHrs) + n(calc.wpHrs)

  const showSub = tabHasData(sub)

  return (
    <div>
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

      {/* In-House quantities */}
      {showSub && (
        <p className="text-xs font-bold text-green-700 uppercase tracking-wider mt-4">In House</p>
      )}
      <WallQtyDetail
        t={ih}
        isSub={false}
        materialPrices={materialPrices}
        materialRows={materialRows}
        vendorLabel={vendorLabel}
      />

      {/* Sub quantities (only when the Sub tab has entries) */}
      {showSub && (
        <>
          <p className="text-xs font-bold text-green-700 uppercase tracking-wider mt-5">
            Subcontractor
          </p>
          <WallQtyDetail
            t={sub}
            isSub={true}
            materialPrices={materialPrices}
            materialRows={materialRows}
            vendorLabel={vendorLabel}
          />
        </>
      )}

      {/* Labor breakdown — three crew-split buckets. Each shows hours, the $
          value (hours × labor rate) and the assigned crew. */}
      <SectionLabel title="Labor Breakdown" />
      <LineRow
        label={`Main Wall Install${mainCrew ? ` · ${mainCrew}` : ''}`}
        value={`${mainInstallHrs.toFixed(2)} hrs`}
        sub={fmt(mainInstallHrs * lrph)}
      />
      {n(calc.demoHrs) > 0 && (
        <LineRow
          label={`Demo${demoCrew ? ` · ${demoCrew}` : ''}`}
          value={`${n(calc.demoHrs).toFixed(2)} hrs`}
          sub={
            `${fmt(n(calc.demoHrs) * lrph)}` +
            (n(calc.demoTons) > 0 ? ` · ${n(calc.demoTons).toFixed(2)} t` : '') +
            (n(calc.demoDump) > 0 ? ` · ${fmt(n(calc.demoDump))} dump` : '')
          }
        />
      )}
      {n(calc.timberHrs) > 0 && (
        <LineRow
          label={`Timber${timberCrew ? ` · ${timberCrew}` : ''}`}
          value={`${n(calc.timberHrs).toFixed(2)} hrs`}
          sub={fmt(n(calc.timberHrs) * lrph)}
        />
      )}
      {n(calc.finishMat) > 0 && <LineRow label="Finish Material Total" value={fmt(calc.finishMat)} />}
      {n(difficulty) > 0 && <LineRow label="Difficulty Add" value={`${n(difficulty)}%`} />}
      {n(hoursAdj) !== 0 && (
        <LineRow label="Hours Adjustment" value={`${n(hoursAdj) > 0 ? '+' : ''}${n(hoursAdj)}`} />
      )}
      <LineRow label="Total Hours" value={`${n(calc.totalHrs).toFixed(2)} hrs`} highlight />
    </div>
  )
}
