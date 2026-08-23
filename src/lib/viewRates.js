import { supabase } from './supabase'
import { fetchModuleCatalog } from './materialCatalog'

// ─────────────────────────────────────────────────────────────────────────────
// Data-driven View Rates. For a module, read its mapped categories
// (module_category_map), then build one group per (category, sub-category) with
// every live item pulled straight from the source tables:
//   • Materials → material + open material_price (Standard + per-vendor lines)
//   • Labor     → labor_rates (coefficients)
//   • Sub       → subcontractor_rates (routed to the Subcontractor column)
// Description / unit / price are exact mirrors, so edits in the master tables
// (or via the row's edit control) flow both ways. Sub-categories with no items
// simply don't appear. Hide/unhide is layered on top (view_rates_hidden).
// ─────────────────────────────────────────────────────────────────────────────

const n = v => (v == null || v === '' ? 0 : parseFloat(v) || 0)
const GS = '' // group separator inside hide keys

export const subcatHideKey = (category, sub) => `subcat:${category}${GS}${sub}`

// Unit measures baked into item names are redundant in View Rates (the unit
// already shows in the value column), so strip them from the DISPLAY label only.
// The underlying name/rate is untouched — still the estimator's lookup key.
const UNIT_STRIP = [
  /\(\s*(?:SF|CY)\s*\)/gi, // (SF) (CY)
  /\bSF\s*\/\s*hr\b/gi, // SF/hr
  /\bt\s*\/\s*hr\b/gi, // t/hr
  /\bHrs?\s*\/?\s*SF\b/gi, // Hrs/SF, Hr SF, Hr/SF
  /\$\s*\/\s*SF\b/gi, // $/SF, $/Sf
  /\bPer\s+(?:CY|SF)\b/gi, // Per CY, Per SF
  /\bSec\s*\/\s*Ft\b/gi, // Sec/Ft
  /\bCY\b/gi, // CY
  /\bSF\b/gi, // SF
]
export function cleanLabel(s) {
  let out = String(s || '')
  for (const re of UNIT_STRIP) out = out.replace(re, ' ')
  return out
    .replace(/\s{2,}/g, ' ')
    .trim()
    .replace(/[\s\-–/]+$/, '')
    .trim()
}

export async function fetchModuleCategories(moduleType) {
  const { data } = await supabase
    .from('module_category_map')
    .select('category_name')
    .eq('module_type', moduleType)
  return Array.from(new Set((data || []).map(r => r.category_name).filter(Boolean)))
}

// `scope` (optional): the module's own (category, sub-category) rate scheme — the
// SAME list its pickers use, passed in so View Rates can't drift from the pickers.
//   • { category: 'Fire Pit' }                → the whole category: all its material
//       sub-categories PLUS its labor / sub / misc rates.
//   • { category: 'Walls', sub: 'Wall Cap' }  → ONLY that material sub-category,
//       borrowed from another category (no labor/sub/misc pulled for it).
// When `scope` is absent, fall back to the legacy module_category_map.
export async function buildViewRates(moduleType, scope = null) {
  let fullCats, subScope, fetchCats, subOnly
  // subOnly: `${category}${GS}${sub}` -> Set(rate names). When a borrowed pair
  // carries `only: [...]`, ONLY those named rates (material/labor/sub) surface for
  // that sub — so a module can borrow a fat shared sub (e.g. a whole Demo method)
  // but expose just the handful of rows it actually consumes, keeping View Rates
  // free of non-actionable rows.
  subOnly = new Map()
  if (Array.isArray(scope) && scope.length) {
    fullCats = new Set(scope.filter(s => s && s.category && !s.sub).map(s => s.category))
    subScope = new Map()
    for (const s of scope) {
      if (!s || !s.category || !s.sub) continue
      if (!subScope.has(s.category)) subScope.set(s.category, new Set())
      subScope.get(s.category).add(s.sub)
      if (Array.isArray(s.only) && s.only.length) subOnly.set(`${s.category}${GS}${s.sub}`, new Set(s.only))
    }
    fetchCats = Array.from(new Set(scope.map(s => s && s.category).filter(Boolean)))
  } else {
    const cats = await fetchModuleCategories(moduleType)
    fullCats = new Set(cats)
    subScope = new Map()
    fetchCats = cats
  }
  if (!fetchCats.length) return { groups: [], categories: [] }
  // Labor, sub AND misc are pulled across ALL fetched categories, then filtered
  // to full categories OR borrowed (category, sub-category) pairs via matInScope —
  // so each demo surfaces only its OWN rows (misc now carries a sub_category).
  const qAll = (table, cols) =>
    fetchCats.length
      ? supabase.from(table).select(cols).in('category', fetchCats)
      : Promise.resolve({ data: [] })

  const [matRows, labRes, subRes, miscRes, venRes] = await Promise.all([
    fetchModuleCatalog(fetchCats),
    qAll('labor_rates', 'id, category, sub_category, name, label, unit, rate'),
    qAll('subcontractor_rates', 'id, category, sub_category, trade, item_key, unit, rate, company_name'),
    // Misc coefficients / named $ adders — the 4th rate source. Pulled across all
    // fetched categories, then filtered by matInScope so a borrowed (category,
    // sub-category) pair surfaces only ITS OWN misc coefficients (misc now carries
    // a sub_category, so per-demo coefficients no longer bleed across demos).
    qAll('misc_rates', 'id, category, sub_category, name, rate, unit'),
    supabase.from('subs_vendors').select('id, company_name'),
  ])
  // A material row is in-scope if its category is a full category, or its exact
  // (category, sub-category) is one of the borrowed pairs.
  const matInScope = r => fullCats.has(r.category) || !!subScope.get(r.category)?.has(r.sub_category)
  // Honor a borrowed sub's `only` allowlist: full-category rows always pass; a
  // borrowed (category, sub) with an allowlist passes only its named rates.
  const nameAllowed = (category, sub, name) => {
    const set = subOnly.get(`${category}${GS}${sub}`)
    return !set || set.has(name)
  }
  const vendorName = id => (venRes.data || []).find(v => v.id === id)?.company_name || 'Vendor'

  // group map: "categorysub" -> { category, sub, items: [] }
  const groups = new Map()
  const keyOf = (category, sub) => `${category}${GS}${sub || 'General'}`
  const ensure = (category, sub) => {
    const k = keyOf(category, sub)
    if (!groups.has(k)) groups.set(k, { category, sub: sub || 'General', items: [] })
    return groups.get(k)
  }

  // Materials — one row per open price (Standard first, then each vendor).
  ;(matRows || []).filter(r => matInScope(r) && nameAllowed(r.category, r.sub_category, r.name)).forEach(r => {
    const g = ensure(r.category, r.sub_category)
    g.items.push({
      label: `${r.vendor_id ? vendorName(r.vendor_id) : 'Standard'} — ${cleanLabel(r.name)}`,
      table: 'material_price',
      materialId: r.id,
      vendorId: r.vendor_id || undefined,
      category: r.category,
      unitLabel: r.unit || 'ea',
      mode: 'currency',
      value: n(r.unit_cost),
      hideKey: `item:mat:${r.id}:${r.vendor_id || 'std'}`,
      _vsort: r.vendor_id ? vendorName(r.vendor_id) : '',
    })
  })

  // Labor — coefficients. `name` is the immutable key the modules reference;
  // `label` is the editable display description (falls back to name).
  ;(labRes.data || []).filter(r => matInScope(r) && nameAllowed(r.category, r.sub_category, r.name)).forEach(r => {
    const g = ensure(r.category, r.sub_category)
    g.items.push({
      label: cleanLabel(r.label || r.name),
      table: 'labor_rates',
      name: r.name,
      category: r.category,
      unitLabel: r.unit || '',
      mode: 'coefficient',
      section: 'labor',
      value: n(r.rate),
      hideKey: `item:lab:${r.id}`,
    })
  })

  // Subcontractor — routed to the Sub column via section:'sub'.
  ;(subRes.data || []).filter(r => matInScope(r) && nameAllowed(r.category, r.sub_category, r.item_key)).forEach(r => {
    const g = ensure(r.category, r.sub_category)
    g.items.push({
      label: `${r.company_name || 'Unassigned'} — ${cleanLabel(r.trade || r.item_key || 'Rate')}`,
      table: 'subcontractor_rates',
      name: r.item_key,
      category: r.category,
      unitLabel: r.unit || '',
      mode: 'currency',
      section: 'sub',
      value: n(r.rate),
      hideKey: `item:sub:${r.id}`,
    })
  })

  // Misc coefficients / named adders — grouped under an "Adjustments" sub-section.
  // misc_rates stores name + rate (no mode column), so these render as plain
  // editable numbers; the name carries the unit hint (e.g. '… per Cu Yd').
  ;(miscRes.data || []).filter(r => matInScope(r) && nameAllowed(r.category, r.sub_category, r.name)).forEach(r => {
    const g = ensure(r.category, 'Adjustments')
    // Fee / price rows (dump fees, container price, $-named items) are dollar
    // amounts → render as currency ("$36.21 per Ton"). True coefficients (swell,
    // capacity, density factors) stay coefficient style ("1.2 Factor").
    const isFee = /dump|low-?boy|\$|price|fee/i.test(r.name)
    g.items.push({
      label: cleanLabel(r.name),
      table: 'named_rate',
      name: r.name,
      category: r.category,
      unitLabel: r.unit || '',
      mode: isFee ? 'currency' : 'coefficient',
      value: n(r.rate),
      hideKey: `item:misc:${r.id}`,
    })
  })

  // Order: category (scope order), then sub-category alpha; items vendor-first.
  const catOrder = new Map(fetchCats.map((c, i) => [c, i]))
  const out = [...groups.values()]
    .sort(
      (a, b) =>
        (catOrder.get(a.category) ?? 99) - (catOrder.get(b.category) ?? 99) ||
        a.category.localeCompare(b.category) ||
        a.sub.localeCompare(b.sub)
    )
    .map(g => ({
      // Show just the sub-category name (the category is implied by the module).
      group: g.sub,
      hideKey: subcatHideKey(g.category, g.sub),
      items: g.items.sort((x, y) => (x._vsort || '').localeCompare(y._vsort || '') || x.label.localeCompare(y.label)),
    }))

  return { groups: out, categories: fetchCats }
}

// ── Hide/unhide persistence ──────────────────────────────────────────────────
export async function fetchHiddenKeys(moduleType) {
  const { data } = await supabase
    .from('view_rates_hidden')
    .select('hide_key')
    .eq('module_type', moduleType)
  return new Set((data || []).map(r => r.hide_key))
}

export async function setHidden(moduleType, hideKey, hide) {
  if (hide) {
    await supabase.from('view_rates_hidden').insert({ module_type: moduleType, hide_key: hideKey })
  } else {
    await supabase
      .from('view_rates_hidden')
      .delete()
      .eq('module_type', moduleType)
      .eq('hide_key', hideKey)
  }
}
