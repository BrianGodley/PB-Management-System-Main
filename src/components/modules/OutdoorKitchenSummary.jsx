// ─────────────────────────────────────────────────────────────────────────────
// OutdoorKitchenSummary — read-only detail view. Uses the shared DemoSummaryView
// layout (In House / Subcontractor quantity sections + green Summary box), same
// as Concrete / Paver / demo modules. Reads the current module data shape
// (equipmentRows, wallFinishRows, ep* rows) and the saved calc snapshot.
// ─────────────────────────────────────────────────────────────────────────────
import DemoSummaryView from './DemoSummaryView'

const n = v => parseFloat(v) || 0
const fmt2 = v =>
  `$${n(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const WF_LABEL = t => t || 'Finish'

export default function OutdoorKitchenSummary({ module }) {
  const d = module?.data || {}

  // ── Structure ──────────────────────────────────────────────────────────────
  const structureRows = []
  if (n(d.bbqLengthLF) > 0) {
    structureRows.push({
      label: 'BBQ Wall',
      value: `${n(d.bbqLengthLF)} LF × ${n(d.bbqHeightIn) || 48}"`,
    })
  }
  if (n(d.backLengthLF) > 0) {
    structureRows.push({
      label: 'Backsplash',
      value: `${n(d.backLengthLF)} LF × ${n(d.backHeightIn) || 48}"`,
    })
  }

  // ── Countertop ─────────────────────────────────────────────────────────────
  const counterRows = []
  if (n(d.counterSF) > 0) {
    counterRows.push({
      label: `Countertop (${d.counterFinish || 'Broom Finish'})`,
      value: `${n(d.counterSF)} SF`,
    })
  }

  // ── Appliances ─────────────────────────────────────────────────────────────
  const applianceRows = (d.equipmentRows || [])
    .filter(r => n(r.qty) > 0)
    .map(r => ({
      label: `${r.type || 'Equipment'}${r.clientProvided ? ' (client provided)' : ''}`,
      value: `× ${n(r.qty)}`,
      sub: n(r.hours) > 0 ? `${n(r.hours)} hrs/ea` : undefined,
    }))

  // ── Electrical & Plumbing ──────────────────────────────────────────────────
  const epRows = []
  ;(d.epLineRows || [])
    .filter(r => n(r.lf) > 0)
    .forEach(r => epRows.push({ label: r.type || 'Utility line', value: `${n(r.lf)} LF` }))
  ;(d.epGasRows || [])
    .filter(r => n(r.qty) > 0)
    .forEach(r => epRows.push({ label: r.type || 'Gas fixture', value: `× ${n(r.qty)}` }))
  ;(d.epElecRows || [])
    .filter(r => n(r.qty) > 0)
    .forEach(r => epRows.push({ label: r.type || 'Electrical fixture', value: `× ${n(r.qty)}` }))

  // ── Wall Finishes ──────────────────────────────────────────────────────────
  const finishRows = (d.wallFinishRows || [])
    .filter(r => n(r.sf) > 0)
    .map(r => ({ label: WF_LABEL(r.type), value: `${n(r.sf)} SF` }))

  // ── Manual ─────────────────────────────────────────────────────────────────
  const manualRows = (d.manualRows || [])
    .filter(r => n(r.hours) > 0 || n(r.materials) > 0)
    .map((r, i) => ({
      label: r.label || `Item ${i + 1}`,
      value: n(r.hours) > 0 ? `${n(r.hours)} hrs` : fmt2(r.materials),
      sub: n(r.hours) > 0 && n(r.materials) > 0 ? `${fmt2(r.materials)} mat.` : undefined,
    }))
  const subManual = (d.manualRows || [])
    .filter(r => n(r.subCost) > 0)
    .map((r, i) => ({ label: r.label || `Item ${i + 1}`, value: fmt2(r.subCost) }))

  const inHouseSections = [
    { title: 'Structure', rows: structureRows },
    { title: 'Countertop', rows: counterRows },
    { title: 'Appliances', rows: applianceRows },
    { title: 'Electrical & Plumbing', rows: epRows },
    { title: 'Wall Finishes', rows: finishRows },
    { title: 'Manual Entry', rows: manualRows },
  ]
  const subSections = [{ title: 'Manual Entry', rows: subManual }]

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
