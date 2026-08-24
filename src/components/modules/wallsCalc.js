// Pure, React-free Wall FINISH / CAP / WATERPROOFING row math — extracted from
// WallsModule so it can be unit-tested with `node --test` (no React / supabase /
// vite imports). The React module keeps thin same-signature wrappers that resolve
// the catalog/vendor price + the WALL_RATES labor keys and inject them here:
//   lab(key)   → labor coefficient (hrs per unit) for a WALL_RATES labor key
//   catP       → resolved catalog material $/unit for the row's selected product
//   capP(name) → catalog $/unit resolver for a named Wall Cap product
// Same arithmetic as the originals; this file is the single source for the math.
export const n = v => parseFloat(v) || 0

// One wall-finish row → { mat, hrs, sub… }. `catP` is the vendor/catalog $/unit;
// a per-estimate rateIn override still wins. Labor is the per-type coefficient.
export function computeWallFinishRow(row, { lab, catP }) {
  const sf = n(row.sf)
  const rate = n(row.rateIn) > 0 ? n(row.rateIn) : n(catP)
  let mat = 0,
    hrs = 0,
    subUnit = 0,
    tons = 0
  switch (row.type) {
    case 'Sand Stucco':
      hrs = sf > 0 ? sf * lab('sandStuccoLab') : 0
      mat = sf * rate
      subUnit = rate
      break
    case 'Smooth Stucco':
      hrs = sf > 0 ? sf * lab('smoothStuccoLab') : 0
      mat = sf * rate
      subUnit = rate
      break
    case 'Ledgerstone':
      hrs = sf > 0 ? sf * lab('ledgerstoneLab') : 0
      mat = sf > 0 ? sf * rate * lab('ledgerWaste') + (sf / lab('ledgerSetSfPerUnit')) * lab('ledgerSetUnitCost') : 0
      subUnit = rate * lab('ledgerWaste') + lab('ledgerSubExtraPerSf')
      break
    case 'Stacked Stone':
      hrs = sf > 0 ? sf * lab('stackedStoneLab') : 0
      mat = sf > 0 ? sf * rate * lab('stackedWaste') + (sf / lab('stackedSetSfPerUnit')) * lab('stackedSetUnitCost') : 0
      subUnit = rate * lab('stackedWaste') + lab('stackedSubExtraPerSf')
      break
    case 'Tile':
      hrs = sf > 0 ? sf * lab('tileLab') : 0
      mat = sf > 0 ? sf * rate + sf * lab('tileExtraPerSf') : 0
      subUnit = rate + lab('tileExtraPerSf')
      break
    case 'Real Flagstone':
      // $/Sq Ft now (shared Finishes record) — no ton conversion. Matches the
      // Finishes module + Columns. The old SF-per-ton + extra-per-SF coefficients
      // are retired (material rate is per Sq Ft).
      hrs = sf > 0 ? sf * lab('flagstoneLab') : 0
      mat = sf > 0 ? sf * rate : 0
      subUnit = rate
      tons = 0
      break
    case 'Real Stone':
      hrs = sf > 0 ? sf * lab('realStoneLab') : 0
      mat = sf > 0 ? sf * rate : 0
      subUnit = rate
      tons = 0
      break
    default:
      break
  }
  const subEach = row.subEach !== '' && row.subEach != null ? n(row.subEach) : subUnit
  return { mat, hrs, subUnit, subEach, subMat: sf * subEach, tons, unit: 'SF', qty: sf }
}

// One wall-cap row. capP(name) resolves a named cap product's $/unit; PIP Concrete
// caps price off the injected ready-mix $/CY (concreteTruckP). A catalog cap (the
// default branch) rides on its calc_meta (per_lf count + labor_rate pointer),
// resolved in the wrapper and passed as { perLf, labRate } — unset labor ⇒ 0 hrs.
export function computeCapRow(row, { lab, capP, concreteTruckP, defaultCap }) {
  const lf = n(row.lf),
    widthIn = n(row.widthIn),
    qty = n(row.qty)
  let mat = 0,
    hrs = 0,
    subUnit = 0,
    subQty = 0,
    unit = 'LF',
    dispQty = lf
  switch (row.type) {
    case 'Flagstone': {
      // Priced per Sq Ft of cap surface (width_ft × LF) — tons removed.
      const pr = n(capP('Flagstone')) // $/Sq Ft
      mat = (widthIn / 12) * lf * pr
      hrs = lf * lab('capFlagstoneLab')
      subUnit = (widthIn / 12) * pr
      subQty = lf
      break
    }
    case 'Precast': {
      const pr = n(capP('Precast'))
      const widthFactor = (widthIn || 8) / 8
      mat = qty * pr * widthFactor
      hrs = qty * lab('capPrecastLab')
      subUnit = pr * widthFactor
      subQty = qty
      unit = 'ea'
      dispQty = qty
      break
    }
    case 'PIP Concrete': {
      const pr = n(concreteTruckP)
      mat = ((lf * (widthIn / 12) * 0.333) / 27) * pr
      hrs = lf * lab('capPipLab')
      subUnit = (((widthIn / 12) * 0.333) / 27) * pr
      subQty = lf
      break
    }
    case 'Bullnose Brick': {
      const pr = n(capP('Bullnose Brick'))
      mat = lf * pr
      hrs = lf * lab('capBullnoseLab')
      subUnit = pr
      subQty = lf
      break
    }
    default: {
      const pr = n(capP(row.type))
      const perLf = n(defaultCap?.perLf) || 1
      const capLabRate = n(defaultCap?.labRate)
      mat = lf * perLf * pr
      hrs = lf * capLabRate
      subUnit = perLf * pr
      subQty = lf
      break
    }
  }
  const subEach = row.subEach !== '' && row.subEach != null ? n(row.subEach) : subUnit
  return { mat, hrs, subUnit, subEach, subMat: subQty * subEach, unit, qty: dispQty, widthIn }
}

// One waterproofing row. `valid` = the type maps to a real WP product/labor key;
// `catP` is the product $/SF; `wpRate` is the per-type install labor (hrs / SF).
export function computeWpRow(row, { valid, catP, wpRate }) {
  const sf = n(row?.sf)
  let mat = 0,
    hrs = 0,
    subUnit = 0
  if (sf > 0 && valid) {
    const pr = n(catP)
    mat = sf * pr
    hrs = sf * n(wpRate)
    subUnit = pr
  }
  const subEach = row.subEach !== '' && row.subEach != null ? n(row.subEach) : subUnit
  return { mat, hrs, subUnit, subEach, subMat: sf * subEach, unit: 'SF', qty: sf }
}
