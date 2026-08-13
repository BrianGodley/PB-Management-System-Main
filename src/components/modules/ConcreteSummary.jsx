// ─────────────────────────────────────────────────────────────────────────────
// ConcreteSummary — read-only detail view. In House / Subcontractor sections
// show entered quantities; the green Summary box carries the money (shared
// DemoSummaryView layout, same as the demo modules).
// ─────────────────────────────────────────────────────────────────────────────
import DemoSummaryView from './DemoSummaryView'

const n = v => parseFloat(v) || 0
const fmt2 = v =>
  `$${n(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

// Build the quantity sections for one field set (In-House or Sub).
function buildSections(f, isSub) {
  const baseRows = (f.baseRows || [])
    .filter(r => n(r.sf) > 0)
    .map(r => ({
      label: `${r.label || 'Base'}${r.method ? ` (${r.method})` : ''}`,
      value: `${n(r.sf).toLocaleString()} Sq Ft`,
      sub: `${r.depth || 2}"${r.type ? ` · ${r.type}` : ''}`,
    }))

  const install = []
  if (f.installTiers) {
    // In-House install is entered per job-size tier.
    const TIER_LABELS = {
      s100_300: '100–300 Sq Ft',
      s300_600: '300–600 Sq Ft',
      s600_1000: '600–1000 Sq Ft',
      s1000_2000: '1000–2000 Sq Ft',
      s2000plus: '2000+ SF',
    }
    Object.entries(TIER_LABELS).forEach(([k, label]) => {
      if (n(f.installTiers[k]) > 0) {
        const mix = (f.installTierType || {})[k]
        install.push({
          label: `Install (${label})`,
          value: `${n(f.installTiers[k]).toLocaleString()} Sq Ft`,
          sub: `${f.depthIn || 4}"${mix ? ` · ${mix}` : ''}`,
        })
      }
    })
  } else if (n(f.installSF) > 0)
    install.push({ label: 'Pour + Finish', value: `${n(f.installSF).toLocaleString()} Sq Ft`, sub: `${f.depthIn || 4}"` })
  if (n(f.rebarSF) > 0)
    install.push({ label: 'Rebar 24" OC', value: `${n(f.rebarSF).toLocaleString()} Sq Ft` })
  // Form Edging is In-House only (not on the sub side).
  if (!isSub && n(f.formLF) > 0)
    install.push({ label: 'Form Edging', value: `${n(f.formLF).toLocaleString()} Ln Ft` })
  if (n(f.sleeveLF) > 0)
    install.push({ label: '3" Sleeves', value: `${n(f.sleeveLF).toLocaleString()} Ln Ft` })

  const options = []
  if (n(f.installSF) > 0 && f.finishType) options.push({ label: 'Finish', value: f.finishType })
  if (f.colorYes) options.push({ label: 'Color Hardener', value: 'Yes' })
  // In-House pump is auto-included for 300+ tiers; Sub keeps its explicit flag.
  const pumpOn = f.installTiers
    ? n(f.installTiers.s300_600) +
        n(f.installTiers.s600_1000) +
        n(f.installTiers.s1000_2000) +
        n(f.installTiers.s2000plus) >
      0
    : f.pumpYes
  if (pumpOn)
    options.push({ label: 'Concrete Pump', value: f.installTiers ? 'Yes (auto 300+)' : 'Yes' })
  if (n(f.vaporBarrierSF) > 0)
    options.push({ label: 'Vapor Barrier', value: `${n(f.vaporBarrierSF).toLocaleString()} Sq Ft` })
  if (n(f.sealerSF) > 0)
    options.push({
      label: `Sealer (${f.sealerType || 'Natural'})`,
      value: `${n(f.sealerSF).toLocaleString()} Sq Ft`,
    })

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
    // Base Install is In-House only.
    ...(isSub ? [] : [{ title: 'Base Install', rows: baseRows }]),
    { title: 'Concrete Install', rows: install },
    { title: 'Finish Options', rows: options },
    { title: 'Manual Entry', rows: manual },
  ]
}

export default function ConcreteSummary({ module }) {
  const d = module?.data || {}

  const inHouseSections = buildSections(
    {
      installTiers: d.installTiers,
      installTierType: d.installTierType,
      depthIn: d.depthIn,
      rebarSF: d.rebarSF,
      rebarSize: d.rebarSize,
      formLF: d.formLF,
      sleeveLF: d.sleeveLF,
      finishType: d.finishType,
      colorYes: d.colorYes,
      pumpYes: d.pumpYes,
      vaporBarrierSF: d.vaporBarrierSF,
      sealerSF: d.sealerSF,
      sealerType: d.sealerType,
      baseRows: d.baseRows,
      manualRows: d.manualRows,
    },
    false
  )

  const subSections = buildSections(
    {
      installSF: d.subInstallSF,
      depthIn: d.subDepthIn,
      rebarSF: d.subRebarSF,
      rebarSize: d.rebarSize,
      formLF: d.subFormLF,
      sleeveLF: d.subSleeveLF,
      finishType: d.subFinishType,
      colorYes: d.subColorYes,
      pumpYes: d.subPumpYes,
      vaporBarrierSF: d.subVaporBarrierSF,
      sealerSF: d.subSealerSF,
      sealerType: d.subSealerType,
      baseRows: d.subBaseRows,
      manualRows: d.subManualRows,
    },
    true
  )

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
