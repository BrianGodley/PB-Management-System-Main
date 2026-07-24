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
  const sr = { ...(d.subRates || {}), ...(d.rateOverrides || {}) }
  const P = cfg.prefix

  // ── In House — entered quantities ──────────────────────────────────────────
  const qSF = (label, sf, depth) =>
    n(sf) > 0
      ? { label, value: `${n(sf).toLocaleString()} SF`, sub: depth ? `${depth}"` : undefined }
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
        ? { label: r.label || `Item ${i + 1}`, value: `${n(r.sf)} SF`, sub: `${r.depth || 4}"` }
        : null
    )
    .filter(Boolean)

  const miscVertRows = (d.miscVertRows || [])
    .map((r, i) =>
      n(r.lf) > 0
        ? {
            label: r.label || `Item ${i + 1}`,
            value: `${n(r.lf)} LF`,
            sub: `${r.heightIn || 0}" × ${r.widthIn || 8}"`,
          }
        : null
    )
    .filter(Boolean)

  const footingRows = (d.footingRows || [])
    .map((r, i) =>
      n(r.sf) > 0
        ? { label: r.label || `Footing ${i + 1}`, value: `${n(r.sf)} SF`, sub: `${r.depth || 12}"` }
        : null
    )
    .filter(Boolean)

  const gradeRows = [
    qSF('Grade Cut', d.gradeCutSF),
    qSF('Grade Fill', d.gradeFillSF),
    qSF('Jumping Jack', d.jjSF),
    cfg.hasSS ? qSF('SS Compact', d.ssCmpSF) : null,
  ].filter(Boolean)

  const rebarRows = n(d.rebarSF) > 0 ? [{ label: 'Rebar', value: `${n(d.rebarSF).toLocaleString()} SF` }] : []

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

  // ── Subcontractor — per-line $ ─────────────────────────────────────────────
  let subDemoRate
  if (cfg.subDemoModel === 'tiered') {
    const deep = sr[`Sub Demo - ${P} 5-7in`] ?? 2.0
    const mid = sr[`Sub Demo - ${P} 2-4in`] ?? 1.75
    const shallow = sr[`Sub Demo - ${P} 1-2in`] ?? 1.5
    const x = n(d.subDemoDepth || 7)
    subDemoRate = x >= 5 ? deep : x >= 2 ? mid : shallow
  } else {
    subDemoRate = sr[cfg.subDemoFlatKey] ?? 2.8
  }
  const miscFlatSubRate = cfg.miscFlatKey ? sr[cfg.miscFlatKey] ?? 2.0 : subDemoRate

  const subDemoRows =
    n(d.subDemoSF) > 0
      ? [
          {
            label: `Demolition — ${n(d.subDemoSF).toLocaleString()} SF @ ${d.subDemoDepth || 7}"`,
            value: fmt(n(d.subDemoSF) * subDemoRate),
            sub: `${fmt2(subDemoRate)}/sf`,
          },
        ]
      : []

  const subMiscFlatRows = (d.subMiscFlatRows || [])
    .slice(0, 2)
    .filter(r => n(r.sf) > 0)
    .map((r, i) => ({
      label: r.label || `Item ${i + 1}`,
      value: fmt(n(r.sf) * miscFlatSubRate),
      sub: `${n(r.sf)} SF · ${fmt2(miscFlatSubRate)}/sf`,
    }))

  const sg = (label, sf, key) =>
    n(sf) > 0
      ? { label, value: fmt(n(sf) * (sr[key] ?? 0)), sub: `${n(sf)} SF · ${fmt2(sr[key] ?? 0)}/sf` }
      : null
  const subGradeRows = [
    sg('Grade Cut', d.subGradeCutSF, `Sub Grade - ${P} Cut SF`),
    sg('Grade Fill', d.subGradeFillSF, `Sub Grade - ${P} Fill SF`),
    sg('Jumping Jack', d.subJjSF, `Sub Grade - ${P} JJ SF`),
    sg('Sheepsfoot', d.sheepsfootSF, `Sub Grade - ${P} Sheepsfoot SF`),
    sg('Roll Compactor', d.rollCompSF, `Sub Grade - ${P} Roll SF`),
    cfg.hasSS ? sg('SS Compact', d.subSsCmpSF, `Sub Grade - ${P} SS Compact SF`) : null,
  ].filter(Boolean)

  const subTreeRows = (d.subTreeRows || [])
    .filter(r => n(r.qty) > 0)
    .map(r => {
      const rate = sr[cfg.treeKey(r.size)] ?? 0
      return { label: `${r.size} Trees × ${r.qty}`, value: fmt(n(r.qty) * rate), sub: `${fmt2(rate)}/ea` }
    })

  const haulRows = [
    ['Trash haul', d.haulTrashLoads, `Demo - ${P} Sub Haul - Trash 12yd`, 850],
    ['Concrete haul', d.haulConcreteLoads, `Demo - ${P} Sub Haul - Concrete 12yd`, 800],
    ['Soil haul', d.haulSoilLoads, `Demo - ${P} Sub Haul - Soil 12yd`, 650],
    ['Import base haul', d.haulBaseLoads, `Demo - ${P} Sub Haul - Import Base 12yd`, 350],
  ]
    .filter(([, loads]) => n(loads) > 0)
    .map(([label, loads, key, def]) => {
      const rate = sr[key] ?? def
      return { label: `${label} × ${loads}`, value: fmt(n(loads) * rate), sub: `${fmt(rate)}/load` }
    })

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
