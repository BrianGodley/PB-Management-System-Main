// ─────────────────────────────────────────────────────────────────────────────
// demoSummaryData — builds the grouped detail-view data for the demo modules.
// In House sections show entered quantities; Subcontractor sections show
// per-line $ derived from the saved subRates snapshot; Totals come from the
// saved calc snapshot. Parametrised per module (Mini / Skid / Hand).
// ─────────────────────────────────────────────────────────────────────────────

const n = v => parseFloat(v) || 0
const fmt = v => `$${Math.round(v).toLocaleString()}`
const fmt2 = v =>
  `$${n(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

export const CFG = {
  Mini: {
    prefix: 'Mini',
    hasSS: true,
    subDemoModel: 'tiered',
    miscFlatKey: 'Sub Demo - Mini Misc Flat',
    treeKey: s => `Sub Tree - Mini ${s}`,
  },
  Skid: {
    prefix: 'Skid',
    hasSS: true,
    subDemoModel: 'tiered',
    miscFlatKey: 'Sub Demo - Skid Misc Flat',
    treeKey: s => `Sub Tree - Skid ${s}`,
  },
  Hand: {
    prefix: 'Hand',
    hasSS: false,
    subDemoModel: 'flat',
    subDemoFlatKey: 'Sub Demo - Hand SF',
    miscFlatKey: null, // Hand misc-flat uses the flat sub-demo rate
    treeKey: s =>
      `Sub Tree - Hand ${{ '6" - 12"': '6-12', '12" - 18"': '12-18', '18" - 24"': '18-24' }[s] || '6-12'}`,
  },
}

export function buildDemoSummary(module, cfg) {
  const d = module?.data || {}
  // Resolve sub rates exactly like the module calc: estimate-level one-off
  // overrides (rateOverrides) win over the master subRates snapshot.
  // Prefer the exact resolved rate map the module used at save time; fall back
  // to merging the master rates with any estimate-level overrides.
  const sr =
    d.calc && d.calc.subRatesUsed
      ? d.calc.subRatesUsed
      : { ...(d.subRates || {}), ...(d.rateOverrides || {}) }
  const P = cfg.prefix

  // ── In House — entered quantities ──────────────────────────────────────────
  const qSF = (label, sf, depth) =>
    n(sf) > 0
      ? { label, value: `${n(sf).toLocaleString()} Sq Ft`, sub: depth ? `${depth}"` : undefined }
      : null

  const demoRows = [
    qSF('Concrete', d.concSF, d.concDepth || 4),
    qSF('Dirt / Rock', d.dirtSF, d.dirtDepth || 6),
    qSF('Import Base', d.baseSF, d.baseDepth || 4),
    qSF('Grass / Sod', d.grassSF, d.grassDepth || 2),
  ].filter(Boolean)

  const miscFlatRows = (d.miscFlatRows || [])
    .map((r, i) =>
      n(r.sf) > 0
        ? { label: r.label || `Item ${i + 1}`, value: `${n(r.sf)} Sq Ft`, sub: `${r.depth || 4}"` }
        : null
    )
    .filter(Boolean)

  const miscVertRows = (d.miscVertRows || [])
    .map((r, i) =>
      n(r.lf) > 0
        ? {
            label: r.label || `Item ${i + 1}`,
            value: `${n(r.lf)} Ln Ft`,
            sub: `${r.heightIn || 0}" × ${r.widthIn || 8}"`,
          }
        : null
    )
    .filter(Boolean)

  const footingRows = (d.footingRows || [])
    .map((r, i) =>
      n(r.sf) > 0
        ? { label: r.label || `Footing ${i + 1}`, value: `${n(r.sf)} Sq Ft`, sub: `${r.depth || 12}"` }
        : null
    )
    .filter(Boolean)

  const gradeRows = [
    qSF('Grade Cut', d.gradeCutSF),
    qSF('Grade Fill', d.gradeFillSF),
    qSF('Jumping Jack', d.jjSF),
    cfg.hasSS ? qSF('SS Compact', d.ssCmpSF) : null,
  ].filter(Boolean)

  const rebarRows = n(d.rebarSF) > 0 ? [{ label: 'Rebar', value: `${n(d.rebarSF).toLocaleString()} Sq Ft` }] : []

  const shrubArrRows = (d.shrubRows || [])
    .filter(r => n(r.qty) > 0)
    .map((r, i) => ({ label: `Shrubs ${r.area || i + 1}`, value: `× ${r.qty}`, sub: r.height ? `${r.height} ft` : undefined }))
  const shrubRows = shrubArrRows.length
    ? shrubArrRows
    : n(d.shrubQty) > 0
      ? [{ label: 'Shrubs', value: `× ${d.shrubQty}` }]
      : []

  const stumpRows = [
    ['Stump Small', d.stumpSmallQty],
    ['Stump Medium', d.stumpMedQty],
    ['Stump Large', d.stumpLargeQty],
    ['Stump XL', d.stumpXLQty],
  ]
    .filter(([, q]) => n(q) > 0)
    .map(([label, q]) => ({ label, value: `× ${q}` }))

  const treeRows = (d.treeRows || [])
    .filter(r => n(r.qty) > 0)
    .map(r => ({ label: `${r.size} Trees`, value: `× ${r.qty}`, sub: `@ ${r.height || 10} ft` }))

  const manualIH = (d.manualRows || [])
    .filter(r => n(r.hours) > 0 || n(r.materials) > 0)
    .map((r, i) => ({
      label: r.label || `Item ${i + 1}`,
      value: n(r.hours) > 0 ? `${n(r.hours).toFixed(1)} hrs` : fmt2(r.materials),
      sub: n(r.hours) > 0 && n(r.materials) > 0 ? `${fmt2(r.materials)} mat.` : undefined,
    }))

  const inHouseSections = [
    { title: 'Demolition', rows: demoRows },
    { title: 'Misc Flat Demo', rows: miscFlatRows },
    { title: 'Misc Vertical Demo', rows: miscVertRows },
    { title: 'Footing Demo', rows: footingRows },
    { title: 'Grading', rows: gradeRows },
    { title: 'Rebar', rows: rebarRows },
    { title: 'Shrub', rows: shrubRows },
    { title: 'Stump', rows: stumpRows },
    { title: 'Tree', rows: treeRows },
    { title: 'Manual Entry', rows: manualIH },
  ]

  // ── Subcontractor — quantities only (pricing lives in the Summary box) ─────
  const subDemoRows =
    n(d.subDemoSF) > 0
      ? [{ label: 'Demolition', value: `${n(d.subDemoSF).toLocaleString()} Sq Ft`, sub: `${d.subDemoDepth || 7}"` }]
      : []

  const subMiscFlatRows = (d.subMiscFlatRows || [])
    .slice(0, 2)
    .filter(r => n(r.sf) > 0)
    .map((r, i) => ({ label: r.label || `Item ${i + 1}`, value: `${n(r.sf)} Sq Ft` }))

  const sg = (label, sf) => (n(sf) > 0 ? { label, value: `${n(sf).toLocaleString()} Sq Ft` } : null)
  const subGradeRows = [
    sg('Grade Cut', d.subGradeCutSF),
    sg('Grade Fill', d.subGradeFillSF),
    sg('Jumping Jack', d.subJjSF),
    sg('Sheepsfoot', d.sheepsfootSF),
    sg('Roll Compactor', d.rollCompSF),
    cfg.hasSS ? sg('SS Compact', d.subSsCmpSF) : null,
  ].filter(Boolean)

  const subTreeRows = (d.subTreeRows || [])
    .filter(r => n(r.qty) > 0)
    .map(r => ({ label: `${r.size} Trees`, value: `× ${r.qty}` }))

  const haulRows = [
    ['Trash haul', d.haulTrashLoads],
    ['Concrete haul', d.haulConcreteLoads],
    ['Soil haul', d.haulSoilLoads],
    ['Import base haul', d.haulBaseLoads],
  ]
    .filter(([, loads]) => n(loads) > 0)
    .map(([label, loads]) => ({ label, value: `× ${loads} load${n(loads) !== 1 ? 's' : ''}` }))

  const subManual = (d.subManualRows || [])
    .filter(r => n(r.subCost) > 0)
    .map((r, i) => ({ label: r.label || `Item ${i + 1}`, value: fmt2(r.subCost) }))

  const subSections = [
    { title: 'Combined Demo', rows: subDemoRows },
    { title: 'Misc Flat Demo', rows: subMiscFlatRows },
    { title: 'Grading', rows: subGradeRows },
    { title: 'Tree Demo', rows: subTreeRows },
    { title: 'Hauling', rows: haulRows },
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

  return { inHouseSections, subSections, financials }
}
