import FinancialSummaryList from './FinancialSummaryList'

// ─────────────────────────────────────────────────────────────────────────────
// WallsSummary — read-only detail view for a saved Walls module
// ─────────────────────────────────────────────────────────────────────────────

const n   = (v) => parseFloat(v) || 0
const fmt = (v) => `$${n(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

function SectionLabel({ title }) {
  return (
    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mt-4 mb-1 border-t border-gray-100 pt-3">
      {title}
    </p>
  )
}

function LineRow({ label, value, highlight }) {
  return (
    <div className={`flex items-center justify-between py-1 border-b border-gray-50 ${highlight ? 'font-semibold' : ''}`}>
      <span className={`text-xs ${highlight ? 'text-gray-800' : 'text-gray-600'} pr-2`}>{label}</span>
      <span className={`text-xs ${highlight ? 'text-gray-900 font-semibold' : 'text-gray-700'} shrink-0`}>{value}</span>
    </div>
  )
}

export default function WallsSummary({ module }) {
  const data = module?.data || {}
  const {
    wallType = 'CMU',
    difficulty = 0, hoursAdj = 0,
    // CMU
    cmuLF = 0, cmuHeightIn = 0, cmuFootingWIn = 12, cmuFootingDIn = 12,
    cmuRebarSpIn = 16, cmuHorizBars = 2, cmuBondBeams = 1,
    cmuPctGrouted = 100, cmuPctCurved = 0, cmuFootingPump = 'No', cmuGroutPump = 'No',
    // PIP
    pipLF = 0, pipHeightIn = 0,
    // Timber
    timberLF = 0, timberHeightIn = 0, timberType = 'Railroad Treated', timberPosts = 0,
    // Finishes
    sandStuccoSF = 0, smoothStuccoSF = 0, ledgerstoneSF = 0, stackedStoneSF = 0,
    tileSF = 0, flagstoneSF = 0, realStoneSF = 0,
    // Caps
    capRows = [],
    // Waterproofing
    wpType = 'None', wpSF = 0,
    // Financial
    calc = {},
  } = data

  const WALL_LABELS = { CMU: 'CMU Block Wall', PIP: 'Poured In Place Wall', Timber: 'Timber / Lumber Wall' }

  const activeCaps   = (capRows).filter(c => c.type && c.type !== 'None' && (n(c.lf) > 0 || n(c.qty) > 0))
  const activeFinishes = [
    { label: 'Sand Stucco',        sf: sandStuccoSF },
    { label: 'Smooth Stucco',      sf: smoothStuccoSF },
    { label: 'Ledgerstone Veneer', sf: ledgerstoneSF },
    { label: 'Stacked Stone',      sf: stackedStoneSF },
    { label: 'Tile',               sf: tileSF },
    { label: 'Real Flagstone',     sf: flagstoneSF },
    { label: 'Real Stone',         sf: realStoneSF },
  ].filter(f => n(f.sf) > 0)

  return (
    <div>
      {/* Financial summary */}
      <FinancialSummaryList module={module} />

      {/* Wall type */}
      <SectionLabel title="Wall Type" />
      <LineRow label="Type" value={WALL_LABELS[wallType] || wallType} highlight />

      {/* CMU detail */}
      {wallType === 'CMU' && n(cmuLF) > 0 && (
        <>
          <SectionLabel title="CMU Structure" />
          <LineRow label="Linear Feet" value={`${n(cmuLF)} LF`} />
          <LineRow label="Wall Height" value={`${n(cmuHeightIn)} in`} />
          <LineRow label="Footing" value={`${n(cmuFootingWIn)}"W × ${n(cmuFootingDIn)}"D`} />
          <LineRow label="Rebar Spacing" value={`${n(cmuRebarSpIn)}" on-center`} />
          <LineRow label="Bond Beam Courses" value={n(cmuBondBeams).toString()} />
          <LineRow label="% Grouted" value={`${n(cmuPctGrouted)}%`} />
          {n(cmuPctCurved) > 0 && <LineRow label="% Curved" value={`${n(cmuPctCurved)}%`} />}
          {cmuFootingPump === 'Yes' && <LineRow label="Footing Pump" value="Yes" />}
          {cmuGroutPump   === 'Yes' && <LineRow label="Grout Pump"   value="Yes" />}
          {calc.cmuDetail && (
            <>
              <LineRow label="Est. Grey Blocks (w/ 10% waste)" value={calc.cmuDetail.orderGreyBlock || '—'} />
              <LineRow label="Est. Bond Beam Blocks"           value={calc.cmuDetail.orderBBBlock   || '—'} />
              <LineRow label="Footing Concrete"                value={calc.cmuDetail.footingCY ? `${calc.cmuDetail.footingCY.toFixed(3)} CY` : '—'} />
              <LineRow label="Grout"                           value={calc.cmuDetail.groutCY   ? `${calc.cmuDetail.groutCY.toFixed(3)} CY` : '—'} />
              <LineRow label="Rebar"                           value={calc.cmuDetail.totalRebarLF ? `${Math.round(calc.cmuDetail.totalRebarLF)} LF` : '—'} />
            </>
          )}
        </>
      )}

      {/* PIP detail */}
      {wallType === 'PIP' && n(pipLF) > 0 && (
        <>
          <SectionLabel title="Poured In Place" />
          <LineRow label="Linear Feet" value={`${n(pipLF)} LF`} />
          <LineRow label="Wall Height" value={`${n(pipHeightIn)} in`} />
        </>
      )}

      {/* Timber detail */}
      {wallType === 'Timber' && n(timberLF) > 0 && (
        <>
          <SectionLabel title="Timber Wall" />
          <LineRow label="Timber Type"  value={timberType} />
          <LineRow label="Linear Feet"  value={`${n(timberLF)} LF`} />
          <LineRow label="Wall Height"  value={`${n(timberHeightIn)} in`} />
          {n(timberPosts) > 0 && <LineRow label="Steel Posts" value={`${n(timberPosts)} qty`} />}
        </>
      )}

      {/* Waterproofing */}
      {wpType !== 'None' && n(wpSF) > 0 && (
        <>
          <SectionLabel title="Waterproofing" />
          <LineRow label={wpType} value={`${n(wpSF).toLocaleString()} SF`} />
        </>
      )}

      {/* Wall Finishes */}
      {activeFinishes.length > 0 && (
        <>
          <SectionLabel title="Wall Finishes" />
          {activeFinishes.map(f => (
            <LineRow key={f.label} label={f.label} value={`${n(f.sf).toLocaleString()} SF`} />
          ))}
          {calc.finishMat > 0 && <LineRow label="Finish Material Total" value={fmt(calc.finishMat)} highlight />}
        </>
      )}

      {/* Wall Caps */}
      {activeCaps.length > 0 && (
        <>
          <SectionLabel title="Wall Caps" />
          {activeCaps.map((cap, i) => (
            <LineRow key={i} label={cap.type}
              value={cap.type === 'Precast' ? `${n(cap.qty)} pcs` : `${n(cap.lf)} LF`} />
          ))}
        </>
      )}

      {/* Hour breakdown */}
      <SectionLabel title="Labor Breakdown" />
      <LineRow label="Structural Hours"  value={`${n(calc.structuralHrs).toFixed(2)} hrs`} />
      {n(calc.finishHrs) > 0 && <LineRow label="Finish Hours" value={`${n(calc.finishHrs).toFixed(2)} hrs`} />}
      {n(calc.capHrs)    > 0 && <LineRow label="Cap Hours"    value={`${n(calc.capHrs).toFixed(2)} hrs`} />}
      {n(difficulty)     > 0 && <LineRow label="Difficulty Add" value={`${n(difficulty)}%`} />}
      {n(hoursAdj) !== 0    && <LineRow label="Hours Adjustment" value={`${n(hoursAdj) > 0 ? '+' : ''}${n(hoursAdj)}`} />}
      <LineRow label="Total Hours" value={`${n(calc.totalHrs).toFixed(2)} hrs`} highlight />
    </div>
  )
}
