import FinancialSummaryList from './FinancialSummaryList'

// ─────────────────────────────────────────────────────────────────────────────
// WallsSummary — read-only detail view for a saved Walls module.
// In-House and Sub are independent tab records (data.ihData / data.subData),
// with a flat-field fallback for legacy estimates. Each tab renders its own
// quantity block; the shared financial + labor breakdown comes from the saved
// calc snapshot.
// ─────────────────────────────────────────────────────────────────────────────

const n = v => parseFloat(v) || 0
const fmt = v =>
  `$${n(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

function SectionLabel({ title }) {
  return (
    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mt-4 mb-1 border-t border-gray-100 pt-3">
      {title}
    </p>
  )
}

function LineRow({ label, value, highlight }) {
  return (
    <div
      className={`flex items-center justify-between py-1 border-b border-gray-50 ${highlight ? 'font-semibold' : ''}`}
    >
      <span className={`text-xs ${highlight ? 'text-gray-800' : 'text-gray-600'} pr-2`}>
        {label}
      </span>
      <span
        className={`text-xs ${highlight ? 'text-gray-900 font-semibold' : 'text-gray-700'} shrink-0`}
      >
        {value}
      </span>
    </div>
  )
}

const WALL_LABELS = {
  CMU: 'CMU Block Wall',
  PIP: 'Poured In Place Wall',
  Timber: 'Timber / Lumber Wall',
}

// True when a tab record actually holds some wall / finish / cap / wp entry.
function tabHasData(t = {}) {
  const cmu = (t.cmuWalls || []).some(w => n(w.lf) > 0 || n(w.heightIn) > 0)
  const pip = (t.pipWalls || []).some(w => n(w.lf) > 0 || n(w.heightIn) > 0)
  const timber = n(t.timberLF) > 0 || n(t.timberPosts) > 0
  const finishes =
    n(t.sandStuccoSF) > 0 ||
    n(t.smoothStuccoSF) > 0 ||
    n(t.ledgerstoneSF) > 0 ||
    n(t.stackedStoneSF) > 0 ||
    n(t.tileSF) > 0 ||
    n(t.flagstoneSF) > 0 ||
    n(t.realStoneSF) > 0
  const caps = (t.capRows || []).some(c => c.type && c.type !== 'None' && (n(c.lf) > 0 || n(c.qty) > 0))
  const wp = (t.wpRows || []).some(w => w.type && w.type !== 'None' && n(w.sf) > 0)
  const manual = (t.manualRows || []).some(m => n(m.hours) > 0 || n(m.materials) > 0 || n(m.subCost) > 0)
  // Legacy flat fields (pre multi-wall / pre per-tab) still count as data.
  const legacy = n(t.cmuLF) > 0 || n(t.pipLF) > 0
  return cmu || pip || timber || finishes || caps || wp || manual || legacy
}

// Quantity detail for a single tab record (In-House or Sub). Mirrors the
// original single-column layout, now driven off the passed-in source.
function WallQtyDetail({ t = {} }) {
  const {
    wallType = 'CMU',
    // CMU (legacy flat single-entry fallback)
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
    // PIP (legacy flat)
    pipLF = 0,
    pipHeightIn = 0,
    // Timber
    timberLF = 0,
    timberHeightIn = 0,
    timberType = 'Railroad Treated',
    timberPosts = 0,
    // Finishes
    sandStuccoSF = 0,
    smoothStuccoSF = 0,
    ledgerstoneSF = 0,
    stackedStoneSF = 0,
    tileSF = 0,
    flagstoneSF = 0,
    realStoneSF = 0,
    // Caps
    capRows = [],
    // Waterproofing (legacy flat)
    wpType = 'None',
    wpSF = 0,
  } = t

  // Prefer the multi-wall arrays when present, falling back to legacy flat.
  const cmuWalls = Array.isArray(t.cmuWalls)
    ? t.cmuWalls.filter(w => n(w.lf) > 0 || n(w.heightIn) > 0)
    : []
  const pipWalls = Array.isArray(t.pipWalls)
    ? t.pipWalls.filter(w => n(w.lf) > 0 || n(w.heightIn) > 0)
    : []
  const wpRows = Array.isArray(t.wpRows)
    ? t.wpRows.filter(w => w.type && w.type !== 'None' && n(w.sf) > 0)
    : []

  const activeCaps = (capRows || []).filter(
    c => c.type && c.type !== 'None' && (n(c.lf) > 0 || n(c.qty) > 0)
  )
  const activeFinishes = [
    { label: 'Sand Stucco', sf: sandStuccoSF },
    { label: 'Smooth Stucco', sf: smoothStuccoSF },
    { label: 'Ledgerstone Veneer', sf: ledgerstoneSF },
    { label: 'Stacked Stone', sf: stackedStoneSF },
    { label: 'Tile', sf: tileSF },
    { label: 'Real Flagstone', sf: flagstoneSF },
    { label: 'Real Stone', sf: realStoneSF },
  ].filter(f => n(f.sf) > 0)

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
            {w.blockType && <LineRow label="Block Type" value={w.blockType} />}
            <LineRow label="Linear Feet" value={`${n(w.lf)} LF`} />
            <LineRow label="Wall Height" value={`${n(w.heightIn)} in`} />
            <LineRow label="Footing" value={`${n(w.footingWIn) || 12}"W × ${n(w.footingDIn) || 12}"D`} />
            <LineRow label="Rebar Spacing" value={`${n(w.rebarSpIn) || 16}" on-center`} />
            <LineRow label="Bond Beam Courses" value={n(w.bondBeams).toString()} />
            <LineRow label="% Grouted" value={`${n(w.pctGrouted)}%`} />
            {n(w.pctCurved) > 0 && <LineRow label="% Curved" value={`${n(w.pctCurved)}%`} />}
          </div>
        ))}
      {cmuWalls.length === 0 && n(cmuLF) > 0 && (
        <>
          <SectionLabel title="CMU Structure" />
          <LineRow label="Linear Feet" value={`${n(cmuLF)} LF`} />
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
            <SectionLabel title={pipWalls.length > 1 ? `Poured In Place ${i + 1}` : 'Poured In Place'} />
            <LineRow label="Linear Feet" value={`${n(w.lf)} LF`} />
            <LineRow label="Wall Height" value={`${n(w.heightIn)} in`} />
          </div>
        ))}
      {pipWalls.length === 0 && n(pipLF) > 0 && (
        <>
          <SectionLabel title="Poured In Place" />
          <LineRow label="Linear Feet" value={`${n(pipLF)} LF`} />
          <LineRow label="Wall Height" value={`${n(pipHeightIn)} in`} />
        </>
      )}

      {/* Timber detail */}
      {n(timberLF) > 0 && (
        <>
          <SectionLabel title="Timber Wall" />
          <LineRow label="Timber Type" value={timberType} />
          <LineRow label="Linear Feet" value={`${n(timberLF)} LF`} />
          <LineRow label="Wall Height" value={`${n(timberHeightIn)} in`} />
          {n(timberPosts) > 0 && <LineRow label="Steel Posts" value={`${n(timberPosts)} qty`} />}
        </>
      )}

      {/* Waterproofing */}
      {wpRows.length > 0 && (
        <>
          <SectionLabel title="Waterproofing" />
          {wpRows.map((row, i) => (
            <LineRow key={i} label={row.type} value={`${n(row.sf).toLocaleString()} SF`} />
          ))}
        </>
      )}
      {wpRows.length === 0 && wpType !== 'None' && n(wpSF) > 0 && (
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
        </>
      )}

      {/* Wall Caps */}
      {activeCaps.length > 0 && (
        <>
          <SectionLabel title="Wall Caps" />
          {activeCaps.map((cap, i) => (
            <LineRow
              key={i}
              label={cap.type}
              value={cap.type === 'Precast' ? `${n(cap.qty)} pcs` : `${n(cap.lf)} LF`}
            />
          ))}
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
  const { difficulty = 0, hoursAdj = 0 } = ih

  const showSub = tabHasData(sub)

  return (
    <div>
      {/* Financial summary */}
      <FinancialSummaryList module={module} />

      {/* In-House quantities */}
      {showSub && (
        <p className="text-xs font-bold text-green-700 uppercase tracking-wider mt-4">In House</p>
      )}
      <WallQtyDetail t={ih} />

      {/* Sub quantities (only when the Sub tab has entries) */}
      {showSub && (
        <>
          <p className="text-xs font-bold text-green-700 uppercase tracking-wider mt-5">
            Subcontractor
          </p>
          <WallQtyDetail t={sub} />
        </>
      )}

      {/* Hour breakdown — from the saved calc snapshot (active tab) */}
      <SectionLabel title="Labor Breakdown" />
      <LineRow label="Structural Hours" value={`${n(calc.structuralHrs).toFixed(2)} hrs`} />
      {n(calc.finishHrs) > 0 && (
        <LineRow label="Finish Hours" value={`${n(calc.finishHrs).toFixed(2)} hrs`} />
      )}
      {n(calc.capHrs) > 0 && (
        <LineRow label="Cap Hours" value={`${n(calc.capHrs).toFixed(2)} hrs`} />
      )}
      {n(calc.finishMat) > 0 && (
        <LineRow label="Finish Material Total" value={fmt(calc.finishMat)} />
      )}
      {n(difficulty) > 0 && <LineRow label="Difficulty Add" value={`${n(difficulty)}%`} />}
      {n(hoursAdj) !== 0 && (
        <LineRow label="Hours Adjustment" value={`${n(hoursAdj) > 0 ? '+' : ''}${n(hoursAdj)}`} />
      )}
      <LineRow label="Total Hours" value={`${n(calc.totalHrs).toFixed(2)} hrs`} highlight />
    </div>
  )
}
