// ─────────────────────────────────────────────────────────────────────────────
// PaverSummary — read-only detail view. In House / Subcontractor sections show
// entered quantities; the green Summary box carries the money (shared
// DemoSummaryView layout, same as the demo modules).
// ─────────────────────────────────────────────────────────────────────────────
import DemoSummaryView from './DemoSummaryView'

const n = v => parseFloat(v) || 0
const fmt2 = v =>
  `$${n(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

// Build quantity sections for one field set (In-House or Sub).
function paverSections(f, isSub) {
  const areas = (f.areaRows || [])
    .filter(r => n(r.sf) > 0)
    .map(r => {
      const label =
        r.paverVendor === 'Custom' || r.paverBrand === 'Custom'
          ? 'Custom paver'
          : r.paverType ||
            [r.paverBrand, r.paverName].filter(Boolean).join(' ') ||
            'Pavers'
      const sub = [r.depth ? `${r.depth}"` : null, r.method].filter(Boolean).join(' · ')
      return { label, value: `${n(r.sf).toLocaleString()} Sq Ft`, sub: sub || undefined }
    })

  const details = []
  if (f.is80mm) details.push({ label: '80mm pavers', value: 'Yes' })
  if (n(f.straightCutLF) > 0)
    details.push({ label: 'Straight cut', value: `${n(f.straightCutLF).toLocaleString()} Ln Ft` })
  if (n(f.curvedCutLF) > 0)
    details.push({ label: 'Curved cut', value: `${n(f.curvedCutLF).toLocaleString()} Ln Ft` })
  if (n(f.restraintsLF) > 0)
    details.push({ label: 'Restraints', value: `${n(f.restraintsLF).toLocaleString()} Ln Ft` })
  if (n(f.sleevesLF) > 0)
    details.push({ label: 'Sleeves', value: `${n(f.sleevesLF).toLocaleString()} Ln Ft` })
  if (n(f.vertSoldierLF) > 0)
    details.push({
      label: `Vertical soldier${f.vertType || f.vertPaverName ? ` (${f.vertType || f.vertPaverName})` : ''}`,
      value: `${n(f.vertSoldierLF).toLocaleString()} Ln Ft`,
    })
  if (n(f.sealerSF) > 0)
    details.push({ label: 'Sealer', value: `${n(f.sealerSF).toLocaleString()} Sq Ft` })
  if (f.polySand) details.push({ label: 'Poly sand', value: 'Yes' })
  if (n(f.polySandExistingSF) > 0)
    details.push({
      label: 'Poly sand (existing)',
      value: `${n(f.polySandExistingSF).toLocaleString()} Sq Ft`,
    })
  if (n(f.numStones) > 0) details.push({ label: 'Stones', value: `× ${n(f.numStones)}` })
  if (n(f.numColors) > 0) details.push({ label: 'Colors', value: `× ${n(f.numColors)}` })

  const manual = isSub
    ? (f.manualRows || [])
        .filter(r => n(r.subCost) > 0)
        .map((r, i) => ({ label: r.label || `Item ${i + 1}`, value: fmt2(r.subCost) }))
    : (f.manualRows || [])
        .filter(r => n(r.hours) > 0 || n(r.materials) > 0)
        .map((r, i) => ({
          label: r.label || `Item ${i + 1}`,
          value: n(r.hours) > 0 ? `${n(r.hours).toFixed(1)} hrs` : fmt2(r.materials),
          sub: n(r.hours) > 0 && n(r.materials) > 0 ? `${fmt2(r.materials)} mat.` : undefined,
        }))

  return [
    { title: 'Paver Areas', rows: areas },
    { title: 'Install Details', rows: details },
    { title: 'Manual Entry', rows: manual },
  ]
}

export default function PaverSummary({ module }) {
  const d = module?.data || {}

  const inHouseSections = paverSections(
    {
      areaRows: d.areaRows,
      is80mm: d.is80mm,
      straightCutLF: d.straightCutLF,
      curvedCutLF: d.curvedCutLF,
      restraintsLF: d.restraintsLF,
      sleevesLF: d.sleevesLF,
      vertSoldierLF: d.vertSoldierLF,
      vertPaverName: d.vertPaverName,
      vertType: d.vertType,
      sealerSF: d.sealerSF,
      polySand: d.polySand,
      polySandExistingSF: d.polySandExistingSF,
      numStones: d.numStones,
      numColors: d.numColors,
      manualRows: d.manualRows,
    },
    false
  )

  // Sub tab is a fixed set of install line items (SF each) + sleeves (LF).
  const SUB_LINES = [
    ['handDemo', 'Paver with Hand Demo'],
    ['bobcatDemo', 'Paver with Bobcat Demo'],
    ['noDemo', 'Paver No Demo'],
    ['noDemoBase', 'Paver No Demo/Base'],
    ['tileConcrete', 'Tile Paver in Concrete'],
    ['permeable', 'Permeable Paver'],
    ['largeFormat', 'Large Format Paver'],
    ['under500', 'Less than 500 Sq Ft'],
  ]
  const si = d.subInstall || {}
  const installRows = SUB_LINES.filter(([k]) => n(si[k]) > 0).map(([k, label]) => ({
    label,
    value: `${n(si[k]).toLocaleString()} Sq Ft`,
  }))
  if (n(d.subSleevesLF) > 0)
    installRows.push({ label: 'Sleeves', value: `${n(d.subSleevesLF).toLocaleString()} Ln Ft` })
  const subManual = (d.subManualRows || [])
    .filter(r => n(r.subCost) > 0)
    .map((r, i) => ({ label: r.label || `Item ${i + 1}`, value: fmt2(r.subCost) }))
  // Sub MATERIAL $ breakdown (from the saved calc snapshot). Shows the sub
  // paver material as itemized dollars so the Sub cost isn't just a lump.
  const smi = (d.calc || {}).subMatItems || {}
  const subMaterialRows = [
    ['paver', 'Paver Material'],
    ['vert', 'Vertical Soldier'],
    ['base', 'Base Rock'],
    ['bedding', 'Bedding Sand'],
    ['joint', 'Joint Sand'],
    ['poly', 'Poly Sand'],
    ['polyExisting', 'Poly Sand (Existing)'],
    ['sealer', 'Sealer'],
    ['restraint', 'Restraint Concrete'],
    ['sleeves', 'Sleeves'],
    ['pallet', 'Pallet Charges'],
    ['delivery', 'Delivery'],
    ['tax', 'Sales Tax'],
    ['manual', 'Manual Material'],
  ]
    .filter(([k]) => n(smi[k]) > 0)
    .map(([k, label]) => ({ label, value: fmt2(smi[k]) }))
  const subSections = [
    { title: 'Sub Material', rows: subMaterialRows },
    { title: 'Paver & Demo Installation', rows: installRows },
    { title: 'Manual Entry', rows: subManual },
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
