// ─────────────────────────────────────────────────────────────────────────────
// OutdoorKitchenSummary — read-only detail view. Uses the shared DemoSummaryView
// layout (In House / Subcontractor quantity sections + green Summary box), same
// as Concrete / Paver / Steps. In-House and Sub are independent tab records
// (data.ihData / data.subData), with a flat-field fallback for legacy estimates.
// ─────────────────────────────────────────────────────────────────────────────
import DemoSummaryView from './DemoSummaryView'

const n = v => parseFloat(v) || 0
const fmt2 = v =>
  `$${n(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

// Build the quantity sections for one tab record (In-House or Sub).
function buildSections(t = {}, { sub = false } = {}) {
  const structure = []
  if (n(t.bbqLengthLF) > 0)
    structure.push({ label: 'BBQ Wall', value: `${n(t.bbqLengthLF)} Ln Ft × ${n(t.bbqHeightIn) || 48}"` })
  if (n(t.backLengthLF) > 0)
    structure.push({
      label: 'Backsplash',
      value: `${n(t.backLengthLF)} Ln Ft × ${n(t.backHeightIn) || 48}"`,
    })

  const counter = []
  if (n(t.counterSF) > 0)
    counter.push({
      label: `Countertop (${t.counterFinish || 'Broom Finish'})`,
      value: `${n(t.counterSF)} Sq Ft`,
    })

  const appliances = (t.equipmentRows || [])
    .filter(r => n(r.qty) > 0)
    .map(r => ({
      label: `${r.type || 'Equipment'}${r.clientProvided ? ' (client provided)' : ''}`,
      value: `× ${n(r.qty)}`,
      sub: n(r.hours) > 0 ? `${n(r.hours)} hrs per Each` : undefined,
    }))

  const ep = []
  ;(t.epLineRows || [])
    .filter(r => n(r.lf) > 0)
    .forEach(r => ep.push({ label: r.type || 'Utility line', value: `${n(r.lf)} Ln Ft` }))
  ;(t.epGasRows || [])
    .filter(r => n(r.qty) > 0)
    .forEach(r => ep.push({ label: r.type || 'Gas fixture', value: `× ${n(r.qty)}` }))
  ;(t.epElecRows || [])
    .filter(r => n(r.qty) > 0)
    .forEach(r => ep.push({ label: r.type || 'Electrical fixture', value: `× ${n(r.qty)}` }))

  const finishes = (t.wallFinishRows || [])
    .filter(r => n(r.sf) > 0)
    .map(r => ({ label: r.type || 'Finish', value: `${n(r.sf)} Sq Ft` }))

  const manual = sub
    ? (t.manualRows || [])
        .filter(r => n(r.subCost) > 0)
        .map((r, i) => ({ label: r.label || `Item ${i + 1}`, value: fmt2(r.subCost) }))
    : (t.manualRows || [])
        .filter(r => n(r.hours) > 0 || n(r.materials) > 0)
        .map((r, i) => ({
          label: r.label || `Item ${i + 1}`,
          value: n(r.hours) > 0 ? `${n(r.hours)} hrs` : fmt2(r.materials),
          sub: n(r.hours) > 0 && n(r.materials) > 0 ? `${fmt2(r.materials)} mat.` : undefined,
        }))

  return [
    { title: 'Structure', rows: structure },
    { title: 'Countertop', rows: counter },
    { title: 'Appliances', rows: appliances },
    { title: 'Electrical & Plumbing', rows: ep },
    { title: 'Wall Finishes', rows: finishes },
    { title: 'Manual Entry', rows: manual },
  ]
}

export default function OutdoorKitchenSummary({ module }) {
  const d = module?.data || {}
  const ih = d.ihData || d // legacy estimates stored flat = In-House
  const sub = d.subData || {}

  const inHouseSections = buildSections(ih, { sub: false })
  const subSections = buildSections(sub, { sub: true })

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
