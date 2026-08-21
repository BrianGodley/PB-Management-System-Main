import FinancialSummaryList from './FinancialSummaryList'
import { resolveMaterialPrice } from '../../lib/materialCatalog'
import { ROW_CALC } from './ColumnsModule'

// ─────────────────────────────────────────────────────────────────────────────
// ColumnsSummary — read-only detail view for a saved Columns module
// ─────────────────────────────────────────────────────────────────────────────

// Grout fill is priced at the concrete ready-mix rate (shared Basic Materials).
const GROUT_CONCRETE = { dbName: 'Concrete - Ready Mix (Truck)' }

// SHARED finish source — mirrors ColumnsModule: material '<Type> - Finishes' +
// labor '<Type> - Finishes Labor Rate' (the Finishes module's own records). Sub
// (subDbName) stays Columns-specific. All $/Sq Ft — no ton unit.
const FINISH_TYPES = {
  'Sand Stucco': {
    unit: 'SF',
    dbName: 'Sand Stucco - Finishes',
    laborDbName: 'Sand Stucco - Finishes Labor Rate',
    subDbName: 'Sand Stucco - Sub SF',
  },
  'Smooth Stucco': {
    unit: 'SF',
    dbName: 'Smooth Stucco - Finishes',
    laborDbName: 'Smooth Stucco - Finishes Labor Rate',
    subDbName: 'Smooth Stucco - Sub SF',
  },
  'Ledgerstone Veneer Panels': {
    unit: 'SF',
    dbName: 'Ledgerstone - Finishes',
    laborDbName: 'Ledgerstone - Finishes Labor Rate',
    subDbName: 'Ledgerstone Veneer Panels - Sub SF',
  },
  'Stacked Stone Veneer': {
    unit: 'SF',
    dbName: 'Stacked Stone - Finishes',
    laborDbName: 'Stacked Stone - Finishes Labor Rate',
    subDbName: 'Stacked Stone Veneer - Sub SF',
  },
  Tile: {
    unit: 'SF',
    dbName: 'Tile - Finishes',
    laborDbName: 'Tile - Finishes Labor Rate',
    subDbName: 'Tile - Columns - Sub SF',
  },
  'Real Flagstone, Flat': {
    unit: 'SF',
    dbName: 'Real Flagstone - Finishes',
    laborDbName: 'Real Flagstone - Finishes Labor Rate',
    subDbName: 'Real Flagstone Flat - Sub SF',
  },
  'Real Stone': {
    unit: 'SF',
    dbName: 'Real Stone - Finishes',
    laborDbName: 'Real Stone - Finishes Labor Rate',
    subDbName: 'Real Stone - Columns - Sub SF',
  },
}

const BLOCK_RATES = {
  blockMatCost: { dbName: 'CMU Block' },
  rebarMatCost: { dbName: 'Rebar' }, // shared Basic Materials rebar
  installLaborHrs: { dbName: 'CMU Install Labor' },
  excavateLaborHrs: { dbName: 'Excavate Footing Labor' },
  pourLaborHrs: { dbName: 'Pour Footing Labor' },
  fillLaborHrs: { dbName: 'Fill Labor' },
}

function columnGeometry(heightIn, widthIn) {
  const n = v => parseFloat(v) || 0
  const courses = Math.ceil(n(heightIn) / 8)
  const blocksWide = Math.ceil(n(widthIn) / 8)
  const blocksPerCourse = blocksWide * blocksWide
  const totalBlocks = courses * blocksPerCourse
  const rebarLF = (n(heightIn) / 12) * (blocksWide > 1 ? 4 : 1)
  const footingArea = Math.pow(n(widthIn) / 12 + 1, 2)
  return { courses, blocksWide, blocksPerCourse, totalBlocks, rebarLF, footingArea }
}

const n = v => parseFloat(v) || 0

// Vendor-catalog material price. Mirrors ColumnsModule.colMatPrice: a real vendor's
// material_rates row (name===dbName && vendor_id===vendorId) wins; otherwise fall
// back to the Standard price (name-keyed materialPrices) then the hard fallback.
// vendorId 'Standard'/empty returns exactly the pre-vendor value.
const colMatPrice = resolveMaterialPrice

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

export default function ColumnsSummary({ module }) {
  const data = module?.data || {}
  const {
    difficulty = 0,
    hoursAdj = 0,
    cmuCols = [],
    pipCols = [],
    modularCols = [],
    brickCols = [],
    finishRows = [],
    manualRows = [],
    subType = 'In-House',
    laborRatePerHour = 35,
    materialPrices = {},
    materialRows = [],
    vendorNames = {},
    calc = null,
  } = data
  const isSub = subType === 'Subcontractor'

  // Labor / non-vendor prices stay Standard name-keyed.
  const price = dbName => n(materialPrices[dbName])
  // Material prices resolve through the saved Vendor selection.
  const matPrice = (dbName, _fallback, vendorId) =>
    colMatPrice(dbName, vendorId, materialRows, materialPrices)
  const vendorLabel = v => (!v || v === 'Standard' ? 'Standard' : vendorNames[v] || 'Vendor')

  const fmt2 = v =>
    `$${n(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  // ── Installation — per-column-type breakdown (reuses the module's calculators) ──
  const rowHasGeo = c => n(c.qty) > 0 && n(c.heightIn) > 0 && n(c.widthIn) > 0
  const COL_TYPES = [
    ['CMU', cmuCols],
    ['PIP', pipCols],
    ['Modular', modularCols],
    ['Brick', brickCols],
  ]
  const installLines = []
  COL_TYPES.forEach(([type, arr]) => {
    ;(arr || []).forEach((c, i) => {
      if (!rowHasGeo(c)) return
      const r = ROW_CALC[type](c, materialPrices, materialRows) || { mat: 0, hrs: 0 }
      installLines.push({
        key: `${type}-${i}`,
        label: `${type} — ${n(c.qty)} Each · ${n(c.heightIn)}"×${n(c.widthIn)}"`,
        value: fmt2(r.mat),
        sub: `${n(r.hrs).toFixed(2)} hrs labor`,
      })
    })
  })
  const installSection = installLines.length ? (
    <>
      <SectionLabel title="Installation" />
      {installLines.map(l => (
        <LineRow key={l.key} label={l.label} value={l.value} sub={l.sub} />
      ))}
    </>
  ) : null

  // ── Finishes ─────────────────────────────────────────────────────────────────
  const finishLines = finishRows
    .map((r, i) => {
      const rate = FINISH_TYPES[r.type]
      if (!rate || !n(r.qty)) return null
      const vLabel = vendorLabel(r.vendor)
      if (isSub) {
        // Sub tab: flat $/SF, no labor. Vendor overrides the flat $/SF source.
        const flat = matPrice(rate.subDbName, rate.subFallback ?? 0, r.vendor)
        const mat = n(r.qty) * flat
        return {
          key: i,
          label: `${r.type} — ${n(r.qty)} Sq Ft`,
          value: fmt2(mat),
          sub: `${fmt2(flat)} per Sq Ft flat  ·  ${vLabel}`,
        }
      }
      const isTon = rate.unit === 'ton'
      const cost = matPrice(rate.dbName, isTon ? rate.costPerTon : rate.costPerSF, r.vendor)
      const labHrs = price(rate.laborDbName, isTon ? rate.laborHrsPer : rate.laborHrsPerSF)
      const mat = n(r.qty) * cost
      const hrs = n(r.qty) * labHrs
      return {
        key: i,
        label: `${r.type} — ${n(r.qty)} ${rate.unit}`,
        value: fmt2(mat),
        sub: `${hrs.toFixed(2)} hrs labor  ·  ${fmt2(cost)}/${rate.unit}  ·  ${vLabel}`,
      }
    })
    .filter(Boolean)

  // ── Manual rows ──────────────────────────────────────────────────────────────
  const manualLines = (manualRows || []).filter(
    r => n(r.hours) > 0 || n(r.materials) > 0 || n(r.subCost) > 0
  )

  // ── Financials from saved calc ───────────────────────────────────────────────
  const savedCalc = calc || {}
  const totalHrs = n(savedCalc.totalHrs)
  const manDays = n(savedCalc.manDays) || n(module.man_days)
  const totalMat = n(savedCalc.totalMat) || n(module.material_cost)
  const laborCost = n(savedCalc.laborCost) || totalHrs * n(laborRatePerHour)
  const burden = n(savedCalc.burden)
  const gp = n(savedCalc.gp)
  const commission = n(savedCalc.commission)
  const subCost = n(savedCalc.subCost)
  const priceTotal = n(savedCalc.price)

  const hasAnyLines = installLines.length || finishLines.length || manualLines.length

  return (
    <div className="space-y-1 text-sm">
      {/* Top stat bar */}
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

      {n(difficulty) > 0 && (
        <div className="flex items-center justify-between text-xs text-amber-700 bg-amber-50 rounded px-3 py-1.5">
          <span>Difficulty modifier applied</span>
          <span className="font-semibold">+{difficulty}%</span>
        </div>
      )}
      {n(hoursAdj) !== 0 && (
        <div className="flex items-center justify-between text-xs text-blue-700 bg-blue-50 rounded px-3 py-1.5">
          <span>Hours adjustment</span>
          <span className="font-semibold">
            {n(hoursAdj) > 0 ? '+' : ''}
            {n(hoursAdj).toFixed(1)} hrs
          </span>
        </div>
      )}

      {!hasAnyLines ? (
        <p className="text-xs text-gray-400 text-center py-4">No line items entered.</p>
      ) : (
        <>
          {installSection}

          {finishLines.length > 0 && (
            <>
              <SectionLabel title="Finishes" />
              {finishLines.map(l => (
                <LineRow key={l.key} label={l.label} value={l.value} sub={l.sub} />
              ))}
            </>
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
        gp={gp}
        commission={commission}
        price={priceTotal}
      />
    </div>
  )
}
