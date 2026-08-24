// ─────────────────────────────────────────────────────────────────────────────
// DrainageSummary — read-only detail view. In House / Subcontractor sections
// show entered quantities; the green Summary box carries the money (shared
// DemoSummaryView layout, same as the demo modules).
// ─────────────────────────────────────────────────────────────────────────────
import DemoSummaryView from './DemoSummaryView'

const n = v => parseFloat(v) || 0
const fmt2 = v =>
  `$${n(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

// Additional-item keys → display labels (qty lives at `${key}Qty`).
const ADD_ITEMS = {
  pumpVault: 'Pump Vault',
  sumpPump: 'Sump Pump',
  curbCore: 'Curb Core',
  hydrocut: 'Hydrocut Under Hardscape',
}

export default function DrainageSummary({ module }) {
  const d = module?.data || {}

  // A pipe/fixture row's Type is stored as a frozen material ref_key. Resolve it to
  // the item's name via the saved catalog snapshot (live → current, frozen bid →
  // as-bid). Legacy id/name saves still resolve; a plain label passes through.
  const matName = key => {
    if (!key) return key
    const hit = (d.materialRows || []).find(r => r.ref_key === key || r.id === key || r.name === key)
    if (!hit) return key
    const dash = hit.name ? hit.name.indexOf(' - ') : -1
    return dash > 0 ? hit.name.slice(dash + 3) : hit.name
  }

  const manualHrsRows = (d.manualRows || [])
    .filter(r => n(r.hours) > 0 || n(r.materials) > 0 || n(r.subCost) > 0)
    .map((r, i) => ({
      label: r.label || `Item ${i + 1}`,
      value:
        n(r.hours) > 0
          ? `${n(r.hours).toFixed(1)} hrs`
          : n(r.materials) > 0
            ? fmt2(r.materials)
            : `${fmt2(r.subCost)} sub`,
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
          value: `${n(r.lf)} Ln Ft`,
          sub: n(r.width) || n(r.depth) ? `${n(r.width)}"W × ${n(r.depth)}"D` : undefined,
        })),
    },
    {
      title: 'Drain Pipe',
      rows: (d.pipeRows || [])
        .filter(r => n(r.lf) > 0)
        .map(r => ({ label: matName(r.type), value: `${n(r.lf)} Ln Ft` })),
    },
    {
      title: 'Drain Fixtures',
      rows: (d.fixtureRows || [])
        .filter(r => n(r.qty) > 0)
        .map(r => ({ label: matName(r.type), value: `× ${r.qty}` })),
    },
    {
      title: 'Additional Items',
      rows: Object.entries(ADD_ITEMS)
        .filter(([k]) => n(d.additionalItems?.[`${k}Qty`]) > 0)
        .map(([k, label]) => ({ label, value: `× ${n(d.additionalItems[`${k}Qty`])}` })),
    },
    { title: 'Manual Entry', rows: manualHrsRows },
  ]

  // ── Subcontractor — quantities (LF of trench run + flat fixtures/items) ─────
  const subFixtureFlat = n(d.subRates?.['Drainage Sub - Fixture Flat']) || 20
  const subSections = [
    {
      title: 'Trenching',
      rows: (d.subTrenchRows || [])
        .filter(r => n(r.lf) > 0)
        .map(r => ({ label: 'Trenching', value: `${n(r.lf)} Ln Ft` })),
    },
    {
      title: 'Drain Fixtures',
      rows: (d.subFixtureRows || [])
        .filter(r => n(r.qty) > 0)
        .map(r => ({ label: matName(r.type), value: `${n(r.qty)} × ${fmt2(subFixtureFlat)}` })),
    },
    {
      title: 'Additional Items',
      rows: [
        { key: 'pumpVaultQty', label: 'Pump Vault', unit: '' },
        { key: 'sumpPumpQty', label: 'Sump Pump', unit: '' },
        { key: 'curbCoreQty', label: 'Curb Core', unit: '' },
        { key: 'hydrocutLF', label: 'Hydro Cut', unit: ' LF' },
      ]
        .filter(it => n(d.subAdditionalItems?.[it.key]) > 0)
        .map(it => ({
          label: it.label,
          value: it.unit
            ? `${n(d.subAdditionalItems[it.key])}${it.unit}`
            : `× ${n(d.subAdditionalItems[it.key])}`,
        })),
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
