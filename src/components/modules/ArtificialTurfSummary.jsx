// ─────────────────────────────────────────────────────────────────────────────
// ArtificialTurfSummary — read-only detail view. Uses the shared DemoSummaryView
// layout (In House / Subcontractor quantity sections + green Summary box), same
// as Concrete / Paver / demo modules. Reads the current data shape (baseRows,
// rolls, strips) and the saved calc snapshot.
// ─────────────────────────────────────────────────────────────────────────────
import DemoSummaryView from './DemoSummaryView'

const DEMO_ROWS = [
  { key: 'concrete', label: 'Concrete' },
  { key: 'soil', label: 'Soil' },
  { key: 'lawn', label: 'Lawn' },
]

const TURF_BRANDS = {
  'Socal Blen Supreme 80': 'Socal Blen Supreme - 80',
  'Bel Air SH 92/66': 'Bel Air SH 92/66',
  'Venice SH Light 50': 'Venice SH Light - 50',
  'Bel Air SH Light 50': 'Bel Air SH Light - 50',
  'Performance Play 63': 'Performance Play - 63',
  'Autumn Grass 75': 'Autumn Grass - 75',
  'Bel Air Supreme 90': 'Bel Air Supreme - 90',
  'Pet Turf Pro 85': 'Pet Turf Pro - 85',
  'Verdant Supreme 94': 'Verdant Supreme - 94',
  'Golf Pro SH 47': 'Golf Pro SH - 47',
}
const BASE_LABELS = { Gravel: '2" Gravel Base', DG: '1" DG Base', Weed: 'Weed Barrier Fabric' }

const n = v => parseFloat(v) || 0
const fmt2 = v =>
  `$${n(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
// Resolve a saved brand selection to a display name: by row id from the saved
// materialRows snapshot (new estimates store the id), else the legacy key map.
const brandLabel = (rows, b) => (rows || []).find(r => r.id === b)?.name || TURF_BRANDS[b] || b || 'Turf'

export default function ArtificialTurfSummary({ module }) {
  const d = module?.data || {}
  const c = d.calc || {}
  const turfAreaSF = n(c.turfAreaSF)

  // Independent per-tab input records. In-House reads d.ihData (legacy flat data
  // falls back to `d` itself); Sub reads d.subData. Each tab is its own calculator.
  const ih = d.ihData || d
  const sub = d.subData || {}

  // ── Turf Prep (Demo) — In House ─────────────────────────────────────────────
  const demoRows = DEMO_ROWS.map(row => {
    const dd = (ih.demo || {})[row.key] || {}
    return {
      label: `${row.label} · ${dd.method || 'Skid Steer Good'}`,
      value: `${n(dd.sf).toLocaleString()} Sq Ft`,
      sub: `${n(dd.inches) || 4}" depth`,
      sf: n(dd.sf),
    }
  })
    .filter(r => r.sf > 0)
    .map(({ sf, ...r }) => r) // eslint-disable-line no-unused-vars

  // ── Base Installation — In House ────────────────────────────────────────────
  const baseRows = Array.isArray(ih.baseRows)
    ? ih.baseRows
        .filter(r => n(r.sf) > 0 || turfAreaSF > 0)
        .map(r => ({
          label: BASE_LABELS[r.material] || r.material || 'Base',
          value: `${(n(r.sf) || turfAreaSF).toLocaleString()} Sq Ft`,
        }))
    : []

  // ── Turf Installation ───────────────────────────────────────────────────────
  const rollInHouse = (ih.rolls || [])
    .filter(r => n(r.edgeLF) > 0)
    .map(r => ({ label: brandLabel(d.materialRows, r.brand), value: `${n(r.edgeLF).toLocaleString()} Ln Ft edge` }))
  const rollSub = (sub.rolls || [])
    .filter(r => n(r.installSF) > 0)
    .map(r => ({ label: brandLabel(d.materialRows, r.brand), value: `${n(r.installSF).toLocaleString()} Sq Ft` }))

  // ── Turf Strips ─────────────────────────────────────────────────────────────
  const stripRows =
    n(ih.strips?.lf) > 0
      ? [{ label: 'Turf Strips', value: `${n(ih.strips.lf).toLocaleString()} Ln Ft` }]
      : []
  const subStripRows =
    n(sub.strips?.lf) > 0
      ? [{ label: 'Turf Strips', value: `${n(sub.strips.lf).toLocaleString()} Ln Ft` }]
      : []

  // ── Manual ─────────────────────────────────────────────────────────────────
  const manualRows = (ih.manualRows || [])
    .filter(r => n(r.hours) > 0 || n(r.materials) > 0)
    .map((r, i) => ({
      label: r.label || `Item ${i + 1}`,
      value: n(r.hours) > 0 ? `${n(r.hours)} hrs` : fmt2(r.materials),
      sub: n(r.hours) > 0 && n(r.materials) > 0 ? `${fmt2(r.materials)} mat.` : undefined,
    }))
  const subManual = (sub.manualRows || [])
    .filter(r => n(r.subCost) > 0)
    .map((r, i) => ({ label: r.label || `Item ${i + 1}`, value: fmt2(r.subCost) }))

  const inHouseSections = [
    { title: 'Turf Prep (Demo)', rows: demoRows },
    { title: 'Base Installation', rows: baseRows },
    { title: 'Turf Installation', rows: rollInHouse },
    { title: 'Turf Strips', rows: stripRows },
    { title: 'Manual Entry', rows: manualRows },
  ]
  const subSections = [
    { title: 'Turf Installation', rows: rollSub },
    { title: 'Turf Strips', rows: subStripRows },
    { title: 'Manual Entry', rows: subManual },
  ]

  // ── Totals from saved calc snapshot ────────────────────────────────────────
  const gp = n(c.gp) || n(module.gross_profit)
  const subGp = n(c.subGp)
  const financials = {
    totalHrs: n(c.totalHrs),
    manDays: n(c.manDays) || n(module.man_days),
    totalMat: n(c.totalMat) || n(module.material_cost),
    laborCost: n(c.laborCost),
    lrph: n(d.laborRatePerHour) || 35,
    burden: n(c.burden),
    subCost: n(c.subCost) || n(module.sub_cost),
    gp,
    subGp,
    commission: n(c.commission),
    price: n(c.price) || n(module.total_price),
  }

  return (
    <DemoSummaryView
      inHouseSections={inHouseSections}
      subSections={subSections}
      financials={financials}
    />
  )
}
