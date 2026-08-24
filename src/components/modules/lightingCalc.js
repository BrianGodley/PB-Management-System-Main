// Pure Lighting calc — extracted from LightingModule.jsx so the math is unit-testable
// without React/Supabase. Logic identical. calcWalkAccessLabor (lib/walkAccess) and the
// catalog resolvers catalogOptions/catalogItemFor (lib/materialCatalog) both transitively
// import supabase, so their pure bodies are inlined here and kept in sync.
const n = v => parseFloat(v) || 0
const DEFAULT_WALK_ACCESS_PACE_LF_PER_MIN = 60
const isStandardSel = v => !v || v === 'Standard'

// ── Inlined from lib/walkAccess (pure) ───────────────────────────────────────
function calcWalkAccessLabor(laborSubtotalHrs, distanceLF, opts = {}) {
  const hrs = n(laborSubtotalHrs); const lf = n(distanceLF)
  const pace = n(opts.paceLfPerMin) || DEFAULT_WALK_ACCESS_PACE_LF_PER_MIN
  if (hrs <= 0 || lf <= 0 || pace <= 0) return 0
  return ((hrs / 8) * (lf * 2)) / pace
}

// ── Inlined from lib/materialCatalog (pure) ──────────────────────────────────
function catalogOptions(materialRows, subcategory, vendorSel, { standardRows = 'exclude', stripPrefix = false, category = null } = {}) {
  const isStandard = isStandardSel(vendorSel) || vendorSel === 'Custom'
  if (isStandard && standardRows === 'exclude') return []
  const prefix = `${subcategory} - `
  return (materialRows || [])
    .filter(r => r.sub_category === subcategory && (!category || r.category === category) && (isStandard ? r.vendor_id == null : r.vendor_id === vendorSel))
    .map(r => {
      const label = stripPrefix && r.name && r.name.startsWith(prefix) ? r.name.slice(prefix.length) : r.name
      return { id: r.id, value: r.id, ref_key: r.ref_key || null, label, stored: label, row: r }
    })
}
function catalogItemFor(materialRows, subcategory, vendorSel, key, opts = {}) {
  const { fallbackFirst = true, ...rest } = opts
  const options = catalogOptions(materialRows, subcategory, vendorSel, rest)
  if (!options.length) return null
  if (!key) return fallbackFirst ? options[0].row : null
  const byRef = options.find(o => o.ref_key && o.ref_key === key)
  if (byRef) return byRef.row
  const byId = options.find(o => o.id === key)
  if (byId) return byId.row
  const byLabel = options.find(o => o.stored === key || o.label === key)
  if (byLabel) return byLabel.row
  return fallbackFirst ? options[0].row : null
}

const CATALOG_OPTS = { standardRows: 'null-vendor', stripPrefix: false }
// ── Module const/helper block (carried verbatim) ──
const LIGHTING_CATEGORY = 'Lighting'
const LIGHT_CAT = { fixture: 'Light Fixture', transformer: 'Transformer', wire: 'Wire' }

// Material markup applied to all fixture / transformer / wire materials. Read
// live from the price list (misc_rates 'Lighting - Material Markup', category
// 'Lighting'), stored as a fraction (0.15 = 15%). No hardcoded fallback: a
// missing row means no markup (0).
const MATERIAL_MARKUP_NAME = 'Lighting - Material Markup'

// Install labor is item-driven: each item points to its own labor_rates row via
// calc_meta.labor_rate (Fixture / Transformer / Bistro / Wire Labor), resolved
// live in processSection. No section-fixed labor names, no product labor_hrs_ea,
// no hardcoded fallback. Bistro is a string light, priced per linear foot.

// Company/estimate financial settings (labor rate, burden %, GPMD, commission,
// sub GP markup) are sourced live from company_settings — no hardcoded defaults.


// ── Vendor catalog helpers (mirror PaverModule) ──────────────────────────────
// Option list for a section = the catalog items for that sub_category + vendor.
// Standard (vendorSel === 'Standard' or falsy) → rows with vendor_id == null;
// otherwise → rows whose vendor_id === vendorSel. Each option carries the
// material_rates row id (the STABLE, rename-proof key a selection is stored /
// matched by) plus a clean label.
// Vendor catalog options + row resolution from the shared library. Standard =
// vendor_id IS NULL rows (Lighting prices Standard from the catalog, not a map).
function lightingOptions(subcat, vendorSel, materialRows) {
  return catalogOptions(materialRows, subcat, vendorSel, CATALOG_OPTS)
}
function lightingItemFor(subcat, vendorSel, key, materialRows) {
  return catalogItemFor(materialRows, subcat, vendorSel, key, CATALOG_OPTS)
}

// Default sub $/each for a picked item: sub_price_ea, else unit_cost.
function defaultSubEach(item) {
  if (!item) return ''
  const v = item.sub_price_ea != null ? item.sub_price_ea : item.unit_cost
  return v == null ? '' : String(v)
}

// ── Calculation ──────────────────────────────────────────────────────────────
// Processes a section's rows → { hrs, mat, watts, va, sub }.
// priceOf(item) resolves the item's current MATERIAL unit cost — from the price
// ledger when available, else the row's own unit_cost. Defaults to unit_cost so
// the calc still works when no ledger is supplied.
function processSection(subcat, rows, materialRows, priceOf = item => n(item.unit_cost), laborRates = {}) {
  let hrs = 0,
    mat = 0,
    watts = 0,
    va = 0,
    sub = 0
  const laborUnset = []
  const matUnset = []
  ;(rows || []).forEach(r => {
    const qty = n(r.qty)
    if (qty <= 0) return
    const item = lightingItemFor(subcat, r.vendor, r.itemId, materialRows)
    if (!item) return
    const cost = priceOf(item)
    // NO-FALLBACK for material: a picked item that resolves to $0 (no catalog price for
    // this vendor, e.g. an unpriced Light Craft fixture) must surface a fix-it prompt and
    // add $0 — never pass silently. Mirrors the labor path below. materialId lets the
    // UnpricedItemModal write the price straight back to the catalog.
    if (cost <= 0) matUnset.push({ name: item.name || item.description, label: item.name || item.description, materialId: item.id ?? null, category: 'Lighting', unit: item.unit || null })
    watts += qty * n(item.watts)
    va += qty * n(item.va)
    // Install labor = the item's own default labor rate (calc_meta.labor_rate),
    // resolved live from labor_rates. No section-fixed name, no bistro special
    // case, no hardcoded fallback — unset ⇒ 0 hrs and the item is flagged.
    const laborName = item.calc_meta?.labor_rate || null
    const laborRate = n(laborRates[laborName])
    if (laborRate <= 0) laborUnset.push({ kind: 'labor', name: laborName, label: item.name || item.description, category: 'Lighting', unit: null })
    hrs += qty * laborRate
    mat += qty * cost
    const each =
      r.subEach !== '' && r.subEach != null
        ? n(r.subEach)
        : item.sub_price_ea != null
          ? n(item.sub_price_ea)
          : cost
    sub += qty * each
  })
  return { hrs, mat, watts, va, sub, laborUnset, matUnset }
}

export function calcLighting(
  state,
  laborRatePerHour,
  materialRows = [],
  gpmd,
  walkAccess = null,
  laborBurdenPct,
  priceOf = item => n(item.unit_cost),
  materialMarkup = null,
  commissionRate,
  laborRates = {}
) {
  const _pace = parseFloat(walkAccess?.paceLfPerMin) || DEFAULT_WALK_ACCESS_PACE_LF_PER_MIN
  const { difficulty, hoursAdj, fixtureRows, transformerRows, wireRows, manualRows, distanceLF } =
    state
  const isSub = state.subType === 'Subcontractor'

  // Install labor is item-driven: each item points to its own labor_rates row via
  // calc_meta.labor_rate (fixtures → Fixture Labor, bistro → Bistro Labor, etc.),
  // resolved live inside processSection. Every rate is hours-per-unit so the calc
  // is uniformly hrs = qty × rate. No fallback — unset ⇒ 0 hrs and a prompt.
  const fx = processSection(LIGHT_CAT.fixture, fixtureRows, materialRows, priceOf, laborRates)
  const xf = processSection(LIGHT_CAT.transformer, transformerRows, materialRows, priceOf, laborRates)
  const wr = processSection(LIGHT_CAT.wire, wireRows, materialRows, priceOf, laborRates)
  const laborUnset = isSub
    ? []
    : (() => {
        const seen = new Set()
        return [...fx.laborUnset, ...xf.laborUnset, ...wr.laborUnset].filter(u => {
          const k = u && (u.name || u.label)
          if (!k || seen.has(k)) return false
          seen.add(k)
          return true
        })
      })()
  // Unpriced MATERIAL — In-House only (the Sub tab prices flat per-each, not off the
  // catalog). Deduped by materialId/name so the same item flags once.
  const matUnset = isSub
    ? []
    : (() => {
        const seen = new Set()
        return [...fx.matUnset, ...xf.matUnset, ...wr.matUnset].filter(u => {
          const k = u && (u.materialId || u.name)
          if (!k || seen.has(k)) return false
          seen.add(k)
          return true
        })
      })()

  // Electrical load (fixtures) is shown on both tabs for transformer sizing.
  const totalWatts = fx.watts + xf.watts + wr.watts
  const totalVA = fx.va + xf.va + wr.va

  const _markup = n(materialMarkup)
  const rawMat = fx.mat + xf.mat + wr.mat
  const markedUpMat = rawMat * (1 + _markup)

  let manHrs = 0,
    manMat = 0,
    manSub = 0
  ;(manualRows || []).forEach(r => {
    manHrs += n(r.hours)
    manMat += n(r.materials)
    manSub += n(r.subCost)
  })

  // In-House labor hours from the itemized rows (0 on the Sub tab).
  const itemHrs = isSub ? 0 : fx.hrs + xf.hrs + wr.hrs
  const subtotalHrs = itemHrs
  const diffHrs = subtotalHrs * (n(difficulty) / 100)
  const _preWalkHrs = subtotalHrs + diffHrs + (isSub ? 0 : manHrs) + (isSub ? 0 : parseFloat(hoursAdj) || 0)
  const walkHrs = isSub ? 0 : calcWalkAccessLabor(_preWalkHrs, distanceLF, { paceLfPerMin: _pace })
  const totalHrs = _preWalkHrs + walkHrs
  const manDays = totalHrs / 8

  const totalMat = markedUpMat + (isSub ? 0 : manMat)
  const laborCost = totalHrs * n(laborRatePerHour)
  const burden = laborCost * n(laborBurdenPct)

  let gp, subGp, commission, subCost, price
  if (isSub) {
    // Sub tab: flat $/each pricing, no labor. Route the itemized cost into
    // subCost so GpmdBar's 'sub' variant totals it (subCost + subGp + comm).
    const itemizedSub = fx.sub + xf.sub + wr.sub
    subCost = itemizedSub + manSub
    gp = 0
    subGp = subCost * n(state.subGpMarkupRate)
    commission = subGp * n(commissionRate)
    price = subCost + subGp + commission
  } else {
    gp = manDays * n(gpmd)
    subGp = 0
    commission = gp * n(commissionRate)
    subCost = manSub
    price = totalMat + laborCost + burden + gp + commission + subCost
  }

  return {
    totalHrs,
    manDays,
    totalMat,
    totalWatts,
    totalVA,
    rawMat,
    markedUpMat,
    laborCost,
    burden,
    gp,
    subGp,
    commission,
    subCost,
    price,
    walkHrs,
    laborUnset,
    matUnset,
  }
}
