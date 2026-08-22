// Pure Pool calc — extracted from PoolModule.jsx so the math is unit-testable without
// React/Supabase. Logic identical. calcWalkAccessLabor (lib/walkAccess), the catalog
// resolvers catalogOptions/catalogItemFor (lib/materialCatalog) and resolveUtilRow
// (lib/utilRow) all import supabase, so their pure bodies are inlined here and kept in sync.
// The module keeps its own copies of the helpers for JSX; this file owns the copies the
// calc consumes (poolStdItem / defaultSubVendor / constants).
const n = v => parseFloat(v) || 0
const isStandardSel = v => !v || v === 'Standard'
const DEFAULT_WALK_ACCESS_PACE_LF_PER_MIN = 60

function calcWalkAccessLabor(laborSubtotalHrs, distanceLF, opts = {}) {
  const hrs = n(laborSubtotalHrs); const lf = n(distanceLF)
  const pace = n(opts.paceLfPerMin) || DEFAULT_WALK_ACCESS_PACE_LF_PER_MIN
  if (hrs <= 0 || lf <= 0 || pace <= 0) return 0
  return ((hrs / 8) * (lf * 2)) / pace
}
function catalogOptions(materialRows, subcategory, vendorSel, { standardRows = 'exclude', stripPrefix = false, category = null } = {}) {
  const isStandard = isStandardSel(vendorSel) || vendorSel === 'Custom'
  if (isStandard && standardRows === 'exclude') return []
  const prefix = `${subcategory} - `
  return (materialRows || [])
    .filter(r => r.sub_category === subcategory && (!category || r.category === category) && (isStandard ? r.vendor_id == null : r.vendor_id === vendorSel))
    .map(r => {
      const label = stripPrefix && r.name && r.name.startsWith(prefix) ? r.name.slice(prefix.length) : r.name
      return { id: r.id, value: r.id, label, stored: label, row: r }
    })
}
function catalogItemFor(materialRows, subcategory, vendorSel, key, opts = {}) {
  const { fallbackFirst = true, ...rest } = opts
  const options = catalogOptions(materialRows, subcategory, vendorSel, rest)
  if (!options.length) return null
  if (!key) return fallbackFirst ? options[0].row : null
  const byId = options.find(o => o.id === key)
  if (byId) return byId.row
  const byLabel = options.find(o => o.stored === key || o.label === key)
  if (byLabel) return byLabel.row
  return fallbackFirst ? options[0].row : null
}

// ── Inlined shared util-row resolver (lib/utilRow.js, pure body) ──────────────
const CATALOG_OPTS = { standardRows: 'null-vendor', stripPrefix: true }
function mergedUtilTypes(cat, builtInArr, materialRows, vendorSel = 'Standard', opts = {}) {
  const isStd = !vendorSel || vendorSel === 'Standard' || vendorSel === 'auto'
  const catRows = catalogOptions(materialRows, cat, isStd ? 'Standard' : vendorSel, {
    standardRows: 'null-vendor', stripPrefix: true, ...(opts.category ? { category: opts.category } : {}),
  })
  if (!catRows.length) return []
  return catRows.map(o => {
    const bi = (builtInArr || []).find(b => b.dbName === o.row.name || b.label === o.label)
    return { label: o.label, dbName: o.row.name, matCatalog: n(o.row.unit_cost), catalogPrice: n(o.row.unit_cost), laborDbName: o.row.calc_meta?.labor_rate || null, fromMaster: !bi }
  })
}
function resolveUtilRow(cat, row, houseArr, materialRows, mp, opts = {}) {
  const vsel = row.vendor && row.vendor !== 'auto' ? row.vendor : ''
  if (!vsel) {
    return { opts: [], matOpt: { label: row.type, dbName: undefined, matCatalog: 0, fallback: 0 }, matCost: 0, laborVal: 0, laborName: null, laborBuiltIn: null }
  }
  const merged = mergedUtilTypes(cat, houseArr, materialRows, vsel, opts)
  const builtIn = merged.find(o => o.label === row.type) || merged[0]
  let matDbName = builtIn?.dbName
  const vrow = catalogItemFor(materialRows, cat, vsel, builtIn?.label, { ...CATALOG_OPTS, fallbackFirst: false })
  if (vrow) matDbName = vrow.name
  const laborName = vrow?.calc_meta?.labor_rate || builtIn?.laborDbName || null
  const laborVal = n(mp[laborName])
  const matCatalog = builtIn?.matCatalog ?? 0
  const matCost = vrow ? n(vrow.unit_cost) : mp[matDbName] != null ? n(mp[matDbName]) : matCatalog
  const matOpt = { label: builtIn?.label, dbName: matDbName, matCatalog, fallback: matCatalog }
  return { opts: merged, matOpt, matCost, laborVal, laborName, laborBuiltIn: builtIn }
}

// ── Carried module constants + helpers the calc consumes ──
const EXCAVATION_LABOR_NAME = {
  'IH - Bobcat 72"': 'Excavation - IH Bobcat 72',
  'IH - Bobcat 64"': 'Excavation - IH Bobcat 64',
  'Rental 48"': 'Excavation - Rental 48',
  'Rental 42"': 'Excavation - Rental 42',
  'Medium Excavator': 'Excavation - Medium Excavator',
  'Large Excavator': 'Excavation - Large Excavator',
  'Hand Dig': 'Excavation - Hand Dig',
  'Sub Bobcat / Mini Bob': null, // sub cost, not a labor rate
}

export const WATER_FEATURE_SUBCAT = 'Water Features'
const WATER_FEATURE_TYPES = ['Sheer Descents', 'Fire/Water Bowls', 'Deck Jets', 'Water Slides']
const UTIL_CAT = { line: 'Electrical Pipe', gasPipe: 'Gas Pipe', wire: 'Electrical Wiring', elec: 'Electrical Fixtures' }

function poolStdOptions(materialRows, subcat, vendorSel = 'Standard') {
  return catalogOptions(materialRows, subcat, vendorSel, {
    standardRows: 'null-vendor',
    stripPrefix: true,
    category: 'Pool',
  })
}
function poolStdItem(materialRows, subcat, key, vendorSel = 'Standard') {
  return catalogItemFor(materialRows, subcat, vendorSel, key, {
    standardRows: 'null-vendor',
    category: 'Pool',
    stripPrefix: true,
    fallbackFirst: false,
  })
}
function poolSubVendorIds(materialRows, subcat) {
  return [
    ...new Set(
      (materialRows || [])
        .filter(r => r.category === 'Pool' && r.sub_category === subcat && r.vendor_id)
        .map(r => r.vendor_id)
    ),
  ]
}
function defaultSubVendor(materialRows, subcat) {
  return poolSubVendorIds(materialRows, subcat)[0] || 'Standard'
}
const POOL_EQUIP_SUBCAT = 'Equipment'
function equipVendorIds(materialRows) {
  return [
    ...new Set(
      (materialRows || [])
        .filter(r => r.category === 'Pool' && r.sub_category === POOL_EQUIP_SUBCAT && r.vendor_id)
        .map(r => r.vendor_id)
    ),
  ]
}
function defaultEquipVendor(materialRows) {
  return equipVendorIds(materialRows)[0] || 'Standard'
}

// ── Calculation engine ──
export function calcPool(state, materialPrices, laborRates, subRates = {}, walkAccess = null, materialRows = []) {
  // Subcontractor rates: a one-off adjustment saved on THIS estimate
  // (state.rateOverrides) takes precedence over the master rate.
  subRates = { ...(subRates || {}) }
  Object.entries(state.rateOverrides || {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '' && Number.isFinite(Number(v))) subRates[k] = Number(v)
  })

  const _pace = parseFloat(walkAccess?.paceLfPerMin) || 0
  const {
    pool,
    spa,
    basin,
    vault,
    trough,
    excavation,
    shotcrete,
    tile,
    spillways,
    waterFeatures,
    copingRows,
    raisedSurfaces,
    interiorFinish,
    equipment,
    plumbing,
    steel,
    manualRows,
    laborRatePerHour,
    laborBurdenPct,
    gpmd,
  } = state

  const lrph = n(laborRatePerHour)
  const gpmdVal = n(gpmd)

  const activeStructs = [
    { key: 'Pool', s: pool, tileKey: 'Pool', iKey: 'Pool' },
    { key: 'Spa', s: spa, tileKey: 'Spa', iKey: 'Spa' },
    { key: 'Cover Vault', s: vault, tileKey: 'Cover Vault', iKey: 'Cover Vault' },
    { key: 'Infinity Edge Basin', s: basin, tileKey: 'Infinity Edge Basin', iKey: 'Infinity Edge Basin' },
    { key: 'Zero Edge Trough', s: trough || {}, tileKey: 'Zero Edge Trough', iKey: 'Zero Edge Trough' },
  ].filter(x => x.s.enabled)

  // ─ Volume helpers ─
  // Tunable estimating coefficients — table-driven via the merged rate map
  // (misc_rates), read live by name with NO hardcoded fallback (seeded by
  // supabase-pool-fallbacks-seed.sql). The fixed 27 cu-ft/cu-yd conversions
  // below are math-invariant and stay inline.
  const avgDepthRatio = n(materialPrices['Pool Avg Depth Ratio'])
  const excavSwell = n(materialPrices['Pool Excavation Swell Factor'])
  const shotShellFt = n(materialPrices['Pool Shotcrete Shell Thickness'])
  const shotSwell = n(materialPrices['Pool Shotcrete Swell Factor'])
  function avgDepth(s) {
    return n(s.maxDepth) * avgDepthRatio
  }

  function excavCY(s) {
    if (!n(s.waterSF)) return 0
    return ((n(s.waterSF) * avgDepth(s)) / 27) * excavSwell
  }

  function shotcreteCYFn(s) {
    if (!n(s.waterSF)) return 0
    const bot = (n(s.waterSF) * shotShellFt) / 27
    const wall = (n(s.perimLF) * avgDepth(s) * shotShellFt) / 27
    return (bot + wall) * shotSwell
  }

  const totalExcavCY = activeStructs.reduce((s, x) => s + excavCY(x.s), 0)
  const totalShotCY = activeStructs.reduce((s, x) => s + shotcreteCYFn(x.s), 0)

  // ─ Excavation ─
  // Per-section In-House/Sub toggle (independent of the module tab). Default: follow
  // the module tab. 'Sub' greys the excavation out (a flat subcontractor cost); 'In
  // House' digs with equipment (labor hrs) AND hauls the spoil off (Containers or Sub
  // Haul, a $/Cu Yd sub cost). totalExcavCY already includes the fluff/swell factor.
  const excMode = excavation.mode || 'In House'
  const isSubExcav = excMode === 'Sub'
  // hrs/CY rate read live from labor_rates['Excavation - ...'] — no fallback.
  const excavLaborName = EXCAVATION_LABOR_NAME[excavation.equipment]
  const equipRate = n(excavLaborName && laborRates[excavLaborName])
  const excavHrs = !isSubExcav ? totalExcavCY * equipRate : 0 // rate is hrs per Cu Yd
  // Haul-off MATERIAL (In-House excavation only). yards = totalExcavCY (SF × avg depth
  // ÷ 27 × fluff). Sub Haul is priced BY THE YARD ($/CY × yards); roll-off Containers are
  // priced BY THE CONTAINER (# containers = ceil(yards ÷ 10 CY capacity) × $/container).
  // Rates read live from subcontractor_rates by name — unset ⇒ 0 (no hardcoded 55/70).
  const ROLL_OFF_YDS_PER_CONTAINER = 10
  const isContainerHaul = excavation.haulMethod === 'Containers'
  const isSubHaul = excavation.haulMethod === 'Sub Haul'
  const haulUnitRate = !isSubExcav
    ? isContainerHaul
      ? n(subRates['Excavation - Roll Off per Container'])
      : isSubHaul
        ? n(subRates['Excavation - Sub Haul per Cu Yd'])
        : 0
    : 0
  const haulContainers =
    !isSubExcav && isContainerHaul && ROLL_OFF_YDS_PER_CONTAINER > 0
      ? Math.ceil(totalExcavCY / ROLL_OFF_YDS_PER_CONTAINER)
      : 0
  const excavHaulMat = !isSubExcav
    ? isContainerHaul
      ? haulContainers * haulUnitRate
      : isSubHaul
        ? totalExcavCY * haulUnitRate
        : 0
    : 0
  // Sub-excavation cost (mode Sub only): auto-fill from the chosen sub's stored rate
  // (per-CY rates × dug volume; flat/lump used as-is), overridable by a manual subCost.
  const excavAutoSub = /yd/i.test(excavation.subRateUnit || '')
    ? n(excavation.subRate) * totalExcavCY
    : n(excavation.subRate)
  const excavSub = isSubExcav ? (n(excavation.subCost) || excavAutoSub) : 0

  // Shotcrete / Interior Finish / Plumbing / Steel auto-subs apply on the Sub
  // tab ONLY. On the In-House tab their AUTO amount is not charged (done
  // in-house or entered manually). A manual sub override is still honored on
  // either tab.
  const isSubTab = state.subType === 'Subcontractor'

  // ─ Shotcrete sub (rates from subcontractor_rates, category='Pool') ─
  const shotMatCY = n(subRates['Shotcrete Material'])
  const shotLabCY = n(subRates['Shotcrete Labor'])
  const shotMin = n(subRates['Shotcrete Minimum Labor'])
  // An override counts only when the user actually typed a value — '' means
  // "use auto", but a typed 0 is a real override that removes the auto sub.
  const hasOverride = v => v !== '' && v != null && !isNaN(parseFloat(v))
  // No pool structure → no shotcrete sub (don't apply the labor minimum to an
  // empty scope, e.g. a remodel with no new walls).
  const autoShotcreteSub =
    totalShotCY > 0 ? totalShotCY * shotMatCY + Math.max(shotMin, totalShotCY * shotLabCY) : 0
  const shotcreteSub = hasOverride(shotcrete.manualSubCost)
    ? n(shotcrete.manualSubCost)
    : (isSubTab ? autoShotcreteSub : 0)
  // ─ Shotcrete In-House (In-House tab only): a Vendor + Type row, NOT an auto sub.
  //   Material = shotcrete CY × the picked concrete Type's $/CY (shared 'Concrete Mix'
  //   catalog under Basic Materials; default 'Truck Mix Concrete'), vendor-first.
  //   Labor = shotcrete CY × 'Pool - Shotcrete Labor' (hrs per Cu Yd) — live, no fallback. ─
  const shotItem = catalogItemFor(materialRows, 'Concrete Mix', shotcrete.vendor || 'Standard', shotcrete.type || 'Truck Mix Concrete', {
    standardRows: 'null-vendor',
    stripPrefix: true,
    fallbackFirst: false,
  })
  const shotMatRate = shotItem ? n(shotItem.unit_cost) : 0
  const shotcreteMat = !isSubTab ? totalShotCY * shotMatRate : 0
  const shotLabRate = n(laborRates['Pool - Shotcrete Labor'])
  const shotcreteHrs = !isSubTab ? totalShotCY * shotLabRate : 0

  // Items whose picked Type has no labor rate set (calc_meta.labor_rate unset or
  // resolves to 0). Surfaced as a prompt — never a fallback. Declared here (above
  // its first use in the tile/spillway/coping/raised loops below) to avoid a TDZ
  // ReferenceError when a picked install type has no labor rate.
  const laborUnset = []

  // ─ Waterline Tile ─
  let tileHrs = 0,
    tileMat = 0
  // Tile coverage (SF of tile per LF of waterline) — table-driven coefficient.
  const tileSfPerLf = n(materialPrices['Pool Tile SF per LF'])
  const tileCalc = []
  activeStructs.forEach(({ tileKey }) => {
    const t = tile[tileKey] || {}
    const lf = n(t.lf)
    if (!lf) return
    // Install type is a master material rates item; labor rides on its calc_meta
    // pointer. The material $/SF stays a per-row figure (tile product is job-specific).
    const item = poolStdItem(materialRows, TILE_SUBCAT, t.installType, t.vendor || 'Standard')
    // Labor rides on the item's calc_meta pointer (single source). Unset/0 → the
    // item is surfaced as unpriced (prompt) — no by-name fallback.
    const installRate = n(laborRates[item?.calc_meta?.labor_rate])
    if (t.installType && installRate <= 0)
      laborUnset.push({ kind: 'labor', name: item?.calc_meta?.labor_rate || null, label: t.installType, category: 'Pool', unit: 'Hrs per Ln Ft' })
    const matPriceSF = n(t.matPricePerSF)
    tileHrs += lf * installRate
    tileMat += lf * tileSfPerLf * matPriceSF
    tileCalc.push({
      label: `${tileKey} — ${t.installType || '6" Squares'}`,
      value: `${lf} Ln Ft`,
      hrs: lf * installRate,
      matPerSF: matPriceSF,
      waterproof: !!t.waterproof,
    })
  })

  // ─ Spillways ─
  let spillwayHrs = 0,
    spillwayMat = 0
  const spillwayCalc = []
  spillways.forEach(sw => {
    if (!sw.type) return
    const qty = n(sw.qty)
    const lf = n(sw.lf)
    if (!qty || !lf) return
    const totalLF = qty * lf
    // Spillway is a master material rates item: material from the item price, labor
    // from its calc_meta pointer ('Spillway - <type>'). No name-keyed lookups.
    const item = poolStdItem(materialRows, SPILLWAY_SUBCAT, sw.type, sw.vendor || 'Standard')
    const matRate = item ? n(item.unit_cost) : 0
    const labRate = n(laborRates[item?.calc_meta?.labor_rate])
    if (labRate <= 0)
      laborUnset.push({ kind: 'labor', name: item?.calc_meta?.labor_rate || null, label: sw.type, category: 'Pool', unit: 'Hrs per Ln Ft' })
    spillwayHrs += totalLF * labRate
    spillwayMat += totalLF * matRate
    spillwayCalc.push({
      label: `${sw.struct} — ${sw.type} × ${sw.qty}`,
      value: `${totalLF} Ln Ft`,
      hrs: totalLF * labRate,
      mat: totalLF * matRate,
    })
  })

  // ─ Water Features (sheer descents / waterfalls) ─
  // Each row picks a Water Features catalog item: material = qty × item price, labor
  // = qty × the item's own calc_meta.labor_rate (hrs per each). No name-keyed lookups.
  let waterFeatureHrs = 0,
    waterFeatureMat = 0
  const wfDefVendor = defaultSubVendor(materialRows, WATER_FEATURE_SUBCAT)
  // Per-row breakdown emitted for the summary so it renders from the saved snapshot
  // (parity-safe) instead of re-resolving the catalog with stale name keys.
  const waterFeatureCalc = []
  ;(waterFeatures || []).forEach(wf => {
    if (!wf.type) return
    const qty = n(wf.qty)
    if (!qty) return
    const item = poolStdItem(materialRows, WATER_FEATURE_SUBCAT, wf.type, wf.vendor || wfDefVendor)
    const matRate = item ? n(item.unit_cost) : 0
    const labRate = n(laborRates[item?.calc_meta?.labor_rate])
    if (labRate <= 0)
      laborUnset.push({ kind: 'labor', name: item?.calc_meta?.labor_rate || null, label: wf.type, category: 'Pool', unit: 'Hrs per Each' })
    const hrs = qty * labRate
    const mat = qty * matRate
    waterFeatureHrs += hrs
    waterFeatureMat += mat
    waterFeatureCalc.push({ label: wf.type, qty, hrs, mat })
  })

  // ─ Coping ─
  let copingHrs = 0,
    copingMat = 0
  const copingCalc = []
  copingRows.forEach(cr => {
    if (!cr.type) return
    const lf = n(cr.lf)
    if (!lf) return
    const sided = cr.sided === 'double' ? 2 : 1
    // Coping is a master material rates item: material from the picked item's price
    // (Standard, or Bellecrete for Precast Concrete), labor from its calc_meta
    // pointer ('Coping - <type>'). No name-keyed misc/labor lookup, no fallback.
    const item = catalogItemFor(materialRows, COPING_SUBCAT, cr.vendor || 'Standard', cr.type, {
      standardRows: 'null-vendor',
      category: 'Pool',
      stripPrefix: true,
      fallbackFirst: false,
    })
    const matRate = item ? n(item.unit_cost) : 0
    const labRate = n(laborRates[item?.calc_meta?.labor_rate])
    if (labRate <= 0)
      laborUnset.push({ kind: 'labor', name: item?.calc_meta?.labor_rate || null, label: cr.type, category: 'Pool', unit: 'Hrs per Ln Ft' })
    copingHrs += lf * sided * labRate
    copingMat += lf * sided * matRate
    copingCalc.push({
      label: `${cr.struct} — ${cr.type}${cr.sided === 'double' ? ' (double)' : ''}`,
      value: `${lf} Ln Ft`,
      hrs: lf * sided * labRate,
      mat: lf * sided * matRate,
    })
  })

  // ─ Raised Surfaces ─
  let raisedHrs = 0,
    raisedMat = 0
  // Per-corner labor add and per-corner material factor — table-driven coefficients.
  const raisedCornerHrs = n(materialPrices['Pool Raised Corner Labor'])
  const raisedCornerMatFactor = n(materialPrices['Pool Raised Corner Mat Factor'])
  raisedSurfaces.forEach(rs => {
    if (!rs.matType) return
    const sqft = n(rs.sqft)
    const corners = n(rs.corners)
    if (!sqft) return
    // Raised is a master material rates item: material from the item price, labor
    // from its calc_meta pointer (tile sizes share the waterline 'Tile - <size>'
    // rate). No name-keyed lookups, no fallback.
    const item = poolStdItem(materialRows, RAISED_SUBCAT, rs.matType)
    const matRate = item ? n(item.unit_cost) : 0
    const labRate = n(laborRates[item?.calc_meta?.labor_rate])
    if (labRate <= 0)
      laborUnset.push({ kind: 'labor', name: item?.calc_meta?.labor_rate || null, label: rs.matType, category: 'Pool', unit: 'Hrs per Sq Ft' })
    const curveMult = 1 + n(rs.curvePct) / 100
    raisedHrs += sqft * labRate * curveMult + corners * raisedCornerHrs
    raisedMat += sqft * matRate + corners * (matRate * raisedCornerMatFactor)
  })

  // ─ Interior Finish (rates from subcontractor_rates, category='Pool') ─
  let interiorSub = 0
  activeStructs.forEach(({ iKey, s }) => {
    const fin = interiorFinish[iKey] || {}
    const manSub = n(fin.subCost)
    if (manSub > 0) {
      interiorSub += manSub
    } else if (isSubTab && fin.type) {
      const sf = n(s.waterSF)
      const priceSF = n(subRates[`Interior Finish - ${fin.type}`])
      interiorSub += sf * priceSF
    }
  })

  // ─ Pool Equipment ─
  // Each equipment row has a material rate (unit cost — sub charges) and an
  // optional labor rate (in-house install hours per unit, defaults to 0).
  let equipmentSub = 0,
    equipmentHrs = 0
  const equipDefVendor = defaultEquipVendor(materialRows)
  equipment.forEach(eq => {
    const qty = n(eq.qty)
    if (!qty) return
    // Resolve the picked model to its master material rates item (Heritage Pools):
    // price from the item, install labor from the item's calc_meta.labor_rate.
    const item = catalogItemFor(materialRows, POOL_EQUIP_SUBCAT, eq.vendor || equipDefVendor, eq.model, {
      standardRows: 'null-vendor',
      category: 'Pool',
      stripPrefix: true,
      fallbackFirst: false,
    })
    // Manual Unit $ override wins; otherwise the item's price. No name-keyed map.
    const unitCost = n(eq.unitCost) || (item ? n(item.unit_cost) : 0)
    // Equipment install labor is optional (many pieces have none), so a 0 rate is
    // not flagged — but when a rate exists it rides on the item's calc_meta pointer.
    const labHrsEa = n(laborRates[item?.calc_meta?.labor_rate])
    equipmentSub += qty * unitCost
    equipmentHrs += qty * labHrsEa
  })

  // ─ Plumbing (rates from subcontractor_rates, category='Pool') ─
  const plumbBaseRate = n(subRates[`Plumbing ${plumbing.baseType}`])
  let plumbSub
  if (hasOverride(plumbing.manualSubCost)) {
    plumbSub = n(plumbing.manualSubCost)
  } else if (isSubTab && (n(pool.perimLF) > 0 || spa.enabled)) {
    // Only auto-charge the plumbing base when there's actual pool/spa scope,
    // and only on the Sub tab (In-House does plumbing in-house).
    plumbSub =
      plumbBaseRate +
      (plumbing.over20ft ? n(subRates['Plumbing Over 20ft Add']) : 0) +
      (plumbing.remodel ? n(subRates['Plumbing Remodel Add']) : 0) +
      n(plumbing.extraLights) * n(subRates['Plumbing Extra Light']) +
      n(plumbing.sheerDescents) * n(subRates['Plumbing Sheer Descent'])
  } else {
    plumbSub = 0
  }

  // ─ Steel / Rebar ─
  // Rebar quantity = shell SF × (LF per SF factor). In-House picks a rebar size
  // from Basic Materials → Reinforcement (priced per Ln Ft) + the 'Steel - Install'
  // labor rate (per Ln Ft). The Sub tab uses a flat sub cost (manual, or the legacy
  // perimeter × 'Steel Per LF' auto-sub).
  const steelLF = n(steel.sf) * n(steel.lfPerSf)
  let steelMat = 0,
    steelHrs = 0
  if (!isSubTab && steelLF > 0) {
    const rebarItem = catalogItemFor(materialRows, REINFORCEMENT_SUBCAT, steel.vendor || 'Standard', steel.rebarSize, {
      standardRows: 'null-vendor',
      category: BASIC_CATEGORY,
      stripPrefix: true,
      fallbackFirst: false,
    })
    steelMat = steelLF * (rebarItem ? n(rebarItem.unit_cost) : 0)
    steelHrs = steelLF * n(laborRates[POOL_STEEL_LABOR])
  }
  let steelSub
  if (hasOverride(steel.manualSubCost)) {
    steelSub = n(steel.manualSubCost)
  } else {
    // Legacy auto-sub: perimeter + spa on the Sub tab only.
    const poolPerim = n(pool.perimLF)
    const steelPerLF = n(subRates['Steel Per LF'])
    const steelSpaBonus = n(subRates['Steel Spa Bonus'])
    steelSub = isSubTab ? poolPerim * steelPerLF + (spa.enabled ? steelSpaBonus : 0) : 0
  }

  // ─ Manual rows ─
  let manHrs = 0,
    manMat = 0,
    manSub = 0
  manualRows.forEach(r => {
    manHrs += n(r.hours)
    manMat += n(r.materials)
    manSub += n(r.subCost)
  })

  // ── Utilities (Trenching / Gas Pipe / Electrical Pipe / Electrical Wiring /
  //    Electrical Fixtures) — mirrors the Utilities module's mapping ────────────
  let epHrs = 0
  let epMat = 0
  // (laborUnset is declared earlier, above the Waterline Tile section, so the
  // tile/spillway/coping/raised loops can push to it without a TDZ error.)
  // Trenching: the Utilities Trench/Hand Excavation rate is HOURS per Cu Ft, so
  // hrs = cf × rate for the chosen method (matches Drainage/Utilities).
  ;(state.epTrenchRows || []).forEach(r => {
    const lf = n(r.lf),
      w = n(r.width),
      d = n(r.depth)
    if (lf > 0 && w > 0 && d > 0) {
      const cf = lf * (w / 12) * (d / 12)
      epHrs += cf * n(materialPrices[POOL_TRENCH_LABOR[r.equipment]])
    }
  })
  // Per-LF pipe/wire sections (Gas Pipe, Electrical Pipe, Electrical Wiring).
  ;[
    [state.epGasPipeRows, UTIL_CAT.gasPipe],
    [state.epLineRows, UTIL_CAT.line],
    [state.epWireRows, UTIL_CAT.wire],
  ].forEach(([rows, cat]) => {
    ;(rows || []).forEach(r => {
      if (!r.type) return
      const lf = n(r.lf)
      if (lf <= 0) return
      const { matCost, laborVal } = resolveUtilRow(cat, r, [], materialRows, materialPrices)
      if (laborVal <= 0) laborUnset.push({ kind: 'labor', name: null, label: r.type, category: 'Utilities', unit: null })
      epMat += lf * matCost
      epHrs += lf * laborVal
    })
  })
  // Per-Each Electrical Fixtures.
  ;(state.epElecRows || []).forEach(r => {
    if (!r.type) return
    const qty = n(r.qty)
    if (qty <= 0) return
    const { matCost, laborVal } = resolveUtilRow(UTIL_CAT.elec, r, [], materialRows, materialPrices)
    if (laborVal <= 0) laborUnset.push({ kind: 'labor', name: null, label: r.type, category: 'Utilities', unit: null })
    epMat += qty * matCost
    epHrs += qty * laborVal
  })

  // ── In-House Plumbing (pool plumbing done in-house) ─────────────────────────
  // Contributes in-house labor hours + materials only (never a sub cost). The
  // section is shown on the In-House tab only, so gate on !isSubTab to be safe:
  // its fields stay blank on the Sub tab and the DB default must not silently
  // add cost there. A typed value overrides the DB default; a typed 0 => 0.
  const plumbIH = state.plumbingIH || {}
  const plumbHrsDefault = n(laborRates['Pool Plumbing - Base Hours'])
  const plumbMatDefault = n(materialPrices['Pool Plumbing - Materials'])
  // The DB default only kicks in once there's real pool scope (perimeter or spa) —
  // mirrors the Sub side — so a brand-new blank estimate reads 0 until a pool is
  // started. A typed value always applies; a typed 0 => 0.
  const hasPoolScope = n(pool.perimLF) > 0 || spa.enabled
  const plumbHrsIH = isSubTab
    ? 0
    : hasOverride(plumbIH.hours)
      ? n(plumbIH.hours)
      : hasPoolScope
        ? plumbHrsDefault
        : 0
  const plumbMatIH = isSubTab
    ? 0
    : hasOverride(plumbIH.materials)
      ? n(plumbIH.materials)
      : hasPoolScope
        ? plumbMatDefault
        : 0

  const _preWalkHrs =
    excavHrs +
    tileHrs +
    spillwayHrs +
    waterFeatureHrs +
    copingHrs +
    raisedHrs +
    equipmentHrs +
    epHrs +
    steelHrs +
    shotcreteHrs +
    manHrs +
    plumbHrsIH +
    (parseFloat(state.hoursAdj) || 0)
  const walkHrs = calcWalkAccessLabor(_preWalkHrs, state.distanceLF, { paceLfPerMin: _pace })
  const totalHrs = _preWalkHrs + walkHrs
  const manDays = totalHrs / 8
  const totalMat = tileMat + spillwayMat + waterFeatureMat + copingMat + raisedMat + epMat + steelMat + shotcreteMat + excavHaulMat + manMat + plumbMatIH
  // Pool's genuine sub trades (excavation / shotcrete / interior / equipment /
  // plumbing / steel / manual-sub). These are sub costs on either tab.
  const subTradeCost =
    excavSub + shotcreteSub + interiorSub + equipmentSub + plumbSub + steelSub + manSub
  const laborCost = totalHrs * lrph
  const burden = laborCost * n(laborBurdenPct)
  // On the Sub tab every itemized cost — the in-house-style material + labor +
  // burden (waterline tile, coping, spillways, raised surfaces, E&P, manual) AND
  // the pool sub trades — IS the subcontractor cost. Roll it all into subCost so
  // GpmdBar's 'sub' view (total = subCost + subGp + commission) captures the full
  // scope instead of silently dropping the in-house buckets it ignores. The
  // in-house GP model applies only to the In-House tab. Matches the
  // OutdoorKitchen reference; sub-trade computation above is untouched.
  const subMarkup = n(state.subGpMarkupRate)
  const commissionRateVal = n(state.commissionRate)
  let gp, subCost, subGp, commission, price
  if (isSubTab) {
    gp = 0
    subCost = totalMat + laborCost + burden + subTradeCost
    subGp = subCost * subMarkup
    commission = subGp * commissionRateVal
    price = subCost + subGp + commission
  } else {
    gp = manDays * gpmdVal
    subCost = subTradeCost
    subGp = 0
    commission = gp * commissionRateVal
    price = totalMat + laborCost + burden + subCost + gp + commission
  }

  return {
    totalHrs,
    manDays,
    totalMat,
    laborCost,
    burden,
    subCost,
    gp,
    subGp,
    commission,
    price,
    walkHrs,
    totalExcavCY,
    totalShotCY,
    excavHrs,
    excavAutoSub,
    excavHaulMat,
    haulUnitRate,
    haulContainers,
    isContainerHaul,
    isSubHaul,
    excMode,
    shotcreteMat,
    shotcreteHrs,
    shotMatRate,
    shotLabRate,
    tileHrs,
    tileCalc,
    spillwayHrs,
    spillwayCalc,
    waterFeatureHrs,
    waterFeatureMat,
    waterFeatureCalc,
    copingHrs,
    copingCalc,
    raisedHrs,
    excavSub,
    shotcreteSub,
    interiorSub,
    equipmentSub,
    plumbSub,
    steelSub,
    steelMat,
    steelHrs,
    steelLF,
    plumbHrsIH, // effective in-house pool-plumbing hours (default or override)
    plumbMatIH, // effective in-house pool-plumbing materials $
    equipRate, // resolved excavation CY/hr so the icon can show + edit it
    laborUnset: (() => {
      const seen = new Set()
      return laborUnset.filter(u => {
        const k = u && (u.name || u.label)
        if (!k || seen.has(k)) return false
        seen.add(k)
        return true
      })
    })(),
  }
}
