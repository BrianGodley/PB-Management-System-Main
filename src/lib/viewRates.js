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

export async function fetchModuleCategories(moduleType) {
  const { data } = await supabase
    .from('module_category_map')
    .select('category_name')
    .eq('module_type', moduleType)
  return Array.from(new Set((data || []).map(r => r.category_name).filter(Boolean)))
}

export async function buildViewRates(moduleType) {
  const cats = await fetchModuleCategories(moduleType)
  if (!cats.length) return { groups: [], categories: [] }

  const [matRows, labRes, subRes, venRes] = await Promise.all([
    fetchModuleCatalog(cats),
    supabase.from('labor_rates').select('id, category, sub_category, name, unit, rate').in('category', cats),
    supabase
      .from('subcontractor_rates')
      .select('id, category, sub_category, trade, item_key, unit, rate, company_name')
      .in('category', cats),
    supabase.from('subs_vendors').select('id, company_name'),
  ])
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
  ;(matRows || []).forEach(r => {
    const g = ensure(r.category, r.sub_category)
    g.items.push({
      label: `${r.vendor_id ? vendorName(r.vendor_id) : 'Standard'} — ${r.name}`,
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

  // Labor — coefficients, keyed by name.
  ;(labRes.data || []).forEach(r => {
    const g = ensure(r.category, r.sub_category)
    g.items.push({
      label: r.name,
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
  ;(subRes.data || []).forEach(r => {
    const g = ensure(r.category, r.sub_category)
    g.items.push({
      label: `${r.company_name || 'Unassigned'} — ${r.trade || r.item_key || 'Rate'}`,
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

  // Order: category (map order), then sub-category alpha; items vendor-first.
  const catOrder = new Map(cats.map((c, i) => [c, i]))
  const out = [...groups.values()]
    .sort(
      (a, b) =>
        (catOrder.get(a.category) ?? 99) - (catOrder.get(b.category) ?? 99) ||
        a.category.localeCompare(b.category) ||
        a.sub.localeCompare(b.sub)
    )
    .map(g => ({
      group: `${g.category} · ${g.sub}`,
      hideKey: subcatHideKey(g.category, g.sub),
      items: g.items.sort((x, y) => (x._vsort || '').localeCompare(y._vsort || '') || x.label.localeCompare(y.label)),
    }))

  return { groups: out, categories: cats }
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
