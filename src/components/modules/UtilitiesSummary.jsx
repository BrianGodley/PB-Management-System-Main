// ─────────────────────────────────────────────────────────────────────────────
// UtilitiesSummary — read-only detail view. In House / Subcontractor sections
// show entered quantities; the green Summary box carries the money (shared
// DemoSummaryView layout, same as the demo modules).
// ─────────────────────────────────────────────────────────────────────────────
import DemoSummaryView from './DemoSummaryView'

const n = v => parseFloat(v) || 0
const fmt2 = v =>
  `$${n(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

// Additional-item keys → display labels (qty lives at `${key}Qty`).
const ADD_ITEMS = { curbCore: 'Curb Core', hydrocut: 'Hydrocut Under Hardscape' }

export default function UtilitiesSummary({ module }) {
  const d = module?.data || {}

  const addRows = items =>
    Object.entries(ADD_ITEMS)
      .filter(([k]) => n(items?.[`${k}Qty`]) > 0)
      .map(([k, label]) => ({ label, value: `× ${n(items[`${k}Qty`])}` }))

  const manualHrsRows = rows =>
    (rows || [])
      .filter(r => n(r.hours) > 0 || n(r.materials) > 0)
      .map((r, i) => ({
        label: r.label || `Item ${i + 1}`,
        value: n(r.hours) > 0 ? `${n(r.hours).toFixed(1)} hrs` : fmt2(r.materials),
        sub: n(r.hours) > 0 && n(r.materials) > 0 ? `${fmt2(r.materials)} mat.` : undefined,
      }))

  // ── In House — quantities ──────────────────────────────────────────────────
  const inHouseSections = [
    {
      title: 'Trenching',
      rows: (d.trenchRows || [])
        .filter(r => n(r.lf) > 0)
        .map(r => ({
          label: r.equipment || 'Trench',
          value: `${n(r.lf)} LF`,
          sub: n(r.width) || n(r.depth) ? `${n(r.width)}"W × ${n(r.depth)}"D` : undefined,
        })),
    },
    {
      title: 'Utility Lines',
      rows: (d.lineRows || [])
        .filter(r => n(r.lf) > 0)
        .map(r => ({ label: r.type, value: `${n(r.lf)} LF` })),
    },
    {
      title: 'Gas Fixtures',
      rows: (d.fixtureRows || [])
        .filter(r => n(r.qty) > 0)
        .map(r => ({ label: r.type, value: `× ${r.qty}` })),
    },
    {
      title: 'Electrical Fixtures',
      rows: (d.elecFixtureRows || [])
        .filter(r => n(r.qty) > 0)
        .map(r => ({ label: r.type, value: `× ${r.qty}` })),
    },
    {
      title: 'Sewer Lines',
      rows: (d.sewerLineRows || [])
        .filter(r => n(r.lf) > 0)
        .map(r => ({ label: r.type, value: `${n(r.lf)} LF` })),
    },
    {
      title: 'Sinks',
      rows: (d.sewerSinkRows || [])
        .filter(r => n(r.qty) > 0)
        .map(r => ({ label: r.type, value: `× ${r.qty}` })),
    },
    {
      title: 'Additional Items',
      rows: [
        ...addRows(d.additionalItems),
        ...(n(d.electricSubpanelSubCost) > 0
          ? [{ label: 'Electric Sub-panel', value: fmt2(d.electricSubpanelSubCost) }]
          : []),
      ],
    },
    { title: 'Manual Entry', rows: manualHrsRows(d.manualRows) },
  ]

  // ── Subcontractor — quantities ─────────────────────────────────────────────
  const subSections = [
    {
      title: 'Trenching',
      rows: (d.subTrenchRows || [])
        .filter(r => n(r.lf) > 0)
        .map(r => ({ label: 'Trenching', value: `${n(r.lf)} LF` })),
    },
    {
      title: 'Utility Lines',
      rows: (d.subLineRows || [])
        .filter(r => n(r.lf) > 0)
        .map(r => ({ label: r.type, value: `${n(r.lf)} LF` })),
    },
    {
      title: 'Gas Fixtures',
      rows: (d.subFixtureRows || [])
        .filter(r => n(r.qty) > 0)
        .map(r => ({ label: r.type, value: `× ${r.qty}` })),
    },
    {
      title: 'Electrical Fixtures',
      rows: (d.subElecFixtureRows || [])
        .filter(r => n(r.qty) > 0)
        .map(r => ({ label: r.type, value: `× ${r.qty}` })),
    },
    {
      title: 'Sewer Lines',
      rows: (d.subSewerLineRows || [])
        .filter(r => n(r.lf) > 0)
        .map(r => ({ label: r.type, value: `${n(r.lf)} LF` })),
    },
    {
      title: 'Sinks',
      rows: (d.subSewerSinkRows || [])
        .filter(r => n(r.qty) > 0)
        .map(r => ({ label: r.type, value: `× ${r.qty}` })),
    },
    { title: 'Additional Items', rows: addRows(d.subAdditionalItems) },
    {
      title: 'Manual Entry',
      rows: (d.subManualRows || [])
        .filter(r => n(r.subCost) > 0)
        .map((r, i) => ({ label: r.label || `Item ${i + 1}`, value: fmt2(r.subCost) })),
    },
  ]

  // ── Totals from saved calc snapshot ────────────────────────────────────────
  const c = d.calc || {}
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
    commission: n(c.commission) || (gp + subGp) * 0.12,
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
