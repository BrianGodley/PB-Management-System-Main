// ─────────────────────────────────────────────────────────────────────────────
// materialCatalog — the single, shared material-pricing layer for the estimator.
//
// Every module historically shipped its own copy of the same resolver
// (wallMatPrice / colMatPrice / finishMatPrice / plantMatPrice / irrMatPrice /
// wfVendorPrice / turfMatPrice / resolveUtilRow / drainMatCost). This module
// collapses them into ONE resolver + ONE fetch hook so behavior is identical
// everywhere and new pricing features (as-of dates, multi-vendor) are a
// one-place change.
//
// Resolution order (canonical, byte-for-byte identical to the old per-module
// resolvers, so converting a module never changes its numbers):
//   1. Selected vendor's row:  materialRows.find(name === n && vendor_id === v).unit_cost
//   2. House / Unspecified price: name-keyed priceMap[n]  (vendor-agnostic master rate)
//   3. Hardcoded fallback:     fb
// Vendor 'House' / '' / null resolves straight to step 2 → 3.
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from './supabase'

const num = v => {
  const x = parseFloat(v)
  return Number.isFinite(x) ? x : 0
}

// Name-keyed resolver (Pattern A/B modules). `vendorId` of 'House'/''/null → House price.
export function resolveMaterialPrice(name, vendorId, materialRows, priceMap, fallback = 0) {
  if (vendorId && vendorId !== 'House') {
    const row = (materialRows || []).find(r => r.name === name && r.vendor_id === vendorId)
    if (row && row.unit_cost != null && row.unit_cost !== '') return num(row.unit_cost)
  }
  const mp = priceMap?.[name]
  return mp != null ? mp : fallback
}

// Id-keyed resolver (Pattern C catalog modules — Paver/Steps/Lighting). Rename-proof.
export function resolveMaterialPriceById(id, materialRows, fallback = 0) {
  const row = (materialRows || []).find(r => r.id === id)
  if (row && row.unit_cost != null && row.unit_cost !== '') return num(row.unit_cost)
  return fallback
}

// ── Subcategory catalog resolution (shared by every vendor-catalog module) ────
// Filters material_rows to a subcategory + vendor and resolves a stored key to
// its row. Options tune the per-module behavior so this single implementation
// reproduces paverOptions / lightingOptions / wfVendorPrice / resolveUtilRow /
// drainMatCost / turfMatPrice / etc. exactly:
//   houseRows : 'exclude'     → House/Custom vendor yields no catalog rows
//                               (module prices House off its name-keyed map)
//               'null-vendor' → House yields the vendor_id IS NULL rows
//   stripPrefix: true         → label = name minus the '<subcategory> - ' prefix
export function catalogOptions(
  materialRows,
  subcategory,
  vendorSel,
  { houseRows = 'exclude', stripPrefix = false } = {}
) {
  const isHouse = !vendorSel || vendorSel === 'House' || vendorSel === 'Custom'
  if (isHouse && houseRows === 'exclude') return []
  const prefix = `${subcategory} - `
  return (materialRows || [])
    .filter(r => r.sub_category === subcategory && (isHouse ? r.vendor_id == null : r.vendor_id === vendorSel))
    .map(r => {
      const label =
        stripPrefix && r.name && r.name.startsWith(prefix) ? r.name.slice(prefix.length) : r.name
      return { id: r.id, value: r.id, label, stored: label, row: r }
    })
}

// Resolve a stored selection key to its material_rates row: by id (new saves),
// then by label/name (legacy saves). By default falls back to the first option;
// pass fallbackFirst:false to return null when nothing matches (so a module can
// keep its House default instead).
export function catalogItemFor(materialRows, subcategory, vendorSel, key, opts = {}) {
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

// ── Price ledger (Phase 4 — normalized multi-vendor pricing) ─────────────────
// The current OPEN price per (material, vendor) lives in material_price_history
// (effective_end IS NULL). fetchOpenPriceLedger returns a map keyed by material
// id → { [vendor_id | '__house__']: unit_cost }. ledgerPrice resolves a
// material+vendor from that map, falling back to the supplied default (usually
// the row's own unit_cost). Today the open price equals unit_cost (backfilled),
// so this is price-preserving; it becomes multi-vendor once writers populate
// per-vendor ledger rows.
const HOUSE_KEY = '__house__'

// Price map for a set of materials AS OF a date. asOfDate null/'' → the current
// open price (effective_end IS NULL). Otherwise → the period covering that date
// (effective_start <= date AND (effective_end IS NULL OR effective_end >= date)),
// so an estimate can be priced at its bid-date rates.
export async function fetchPriceLedgerAsOf(materialIds, asOfDate = null) {
  const ids = [...new Set((materialIds || []).filter(Boolean))]
  if (!ids.length) return {}
  let q = supabase
    .from('material_price_history')
    .select('material_rate_id, vendor_id, unit_cost, effective_start')
    .in('material_rate_id', ids)
  if (asOfDate) {
    q = q.lte('effective_start', asOfDate).or(`effective_end.is.null,effective_end.gte.${asOfDate}`)
  } else {
    q = q.is('effective_end', null)
  }
  const { data } = await q
  const map = {}
  const bestStart = {} // "materialId|vendorKey" → latest effective_start seen
  ;(data || []).forEach(r => {
    const vk = r.vendor_id ?? HOUSE_KEY
    const key = `${r.material_rate_id}|${vk}`
    const start = r.effective_start || ''
    if (bestStart[key] == null || start >= bestStart[key]) {
      bestStart[key] = start
      if (!map[r.material_rate_id]) map[r.material_rate_id] = {}
      map[r.material_rate_id][vk] = parseFloat(r.unit_cost)
    }
  })
  return map
}

// Current open price map (today). Thin wrapper over fetchPriceLedgerAsOf.
export async function fetchOpenPriceLedger(materialIds) {
  return fetchPriceLedgerAsOf(materialIds, null)
}

export function ledgerPrice(ledgerById, materialId, vendorId, fallback = 0) {
  const led = ledgerById?.[materialId]
  if (led) {
    const vk = vendorId && vendorId !== 'House' ? vendorId : HOUSE_KEY
    if (led[vk] != null) return led[vk]
    if (led[HOUSE_KEY] != null) return led[HOUSE_KEY]
  }
  return num(fallback)
}

// ── New pricing model adapter (material + material_price) ────────────────────
// Returns catalog rows in the SAME shape the modules already consume from
// material_rates — {id,name,unit_cost,sub_category,vendor_id,calc_meta,collection}
// — sourced from the rebuilt `material` product + `material_price` (one open
// price per product×vendor). The Standard vendor is emitted as vendor_id:null so
// houseRows:'null-vendor' / House resolution behaves exactly as before.
//
// `sub_category` is the taxonomy sub-category NAME (e.g. 'Turf Material'), which
// equals the legacy marker for the converted modules. Repoints a module by
// replacing its material_rates catalog fetch with this — prices are identical
// to the migrated material_rates values, so estimate totals do not move.
export async function fetchModuleCatalog(categories) {
  const cats = Array.isArray(categories) ? categories : [categories]
  const [{ data: catRows }, { data: vends }] = await Promise.all([
    supabase.from('category').select('id, name').in('name', cats),
    supabase.from('subs_vendors').select('id, company_name'),
  ])
  const catIds = (catRows || []).map(c => c.id)
  const stdId =
    (vends || []).find(v => ['standard', 'unspecified'].includes((v.company_name || '').trim().toLowerCase()))
      ?.id || null
  if (!catIds.length) return []
  const { data } = await supabase
    .from('material')
    .select(
      `id, description, unit, calc_meta, collection,
       category:category_id ( name ),
       subcategory:subcategory_id ( name ),
       prices:material_price ( price, vendor_id, effective_end )`
    )
    .in('category_id', catIds)
  const rows = []
  ;(data || []).forEach(m => {
    ;(m.prices || [])
      .filter(p => p.effective_end == null)
      .forEach(p => {
        rows.push({
          id: m.id,
          name: m.description,
          unit: m.unit || null,
          unit_cost: p.price,
          sub_category: m.subcategory?.name || null,
          category: m.category?.name || null,
          vendor_id: p.vendor_id === stdId ? null : p.vendor_id,
          calc_meta: m.calc_meta || null,
          collection: m.collection || null,
        })
      })
  })
  return rows
}

// Shared catalog hook. Fetches, for one or more `categories`:
//   • priceMap  — name → unit_cost (materials) merged with name → rate (labor coefficients)
//   • materialRows — {id,name,vendor_id,unit,unit_cost,category,sub_category,subcategory}
//   • vendors   — [{id,name,categories}] (type='vendor'), for the pickers
// and returns a `resolve(name, vendorId, fallback)` bound to the loaded data plus
// `vendorOptionsForCategory(cat)` (House/Unspecified first).
//
// `initial` seeds from a saved estimate ({ materialPrices, materialRows }) so
// re-opening an estimate doesn't flash empty prices before the fetch lands.
export function useMaterialCatalog(categories, initial = {}) {
  const cats = Array.isArray(categories) ? categories : [categories]
  const catsKey = cats.join('|')

  const [priceMap, setPriceMap] = useState(initial.materialPrices ?? {})
  const [materialRows, setMaterialRows] = useState(initial.materialRows ?? [])
  const [vendors, setVendors] = useState([])
  const [loading, setLoading] = useState(!initial.materialPrices)

  const refresh = useCallback(async () => {
    const catList = catsKey.split('|')
    const [matRes, labRes, catRes, venRes] = await Promise.all([
      supabase.from('material_rates').select('name, unit_cost').in('category', catList),
      supabase.from('labor_rates').select('name, rate').in('category', catList),
      supabase
        .from('material_rates')
        .select(
          'id,name,vendor_id,unit,unit_cost,category,sub_category,block_w_in,block_h_in,block_l_in,calc_meta'
        )
        .in('category', catList),
      supabase
        .from('subs_vendors')
        .select('id, company_name')
        .eq('type', 'vendor')
        .order('company_name'),
    ])
    const pm = {}
    ;(matRes.data || []).forEach(r => {
      pm[r.name] = parseFloat(r.unit_cost) || 0
    })
    ;(labRes.data || []).forEach(r => {
      pm[r.name] = parseFloat(r.rate) || 0
    })
    setPriceMap(pm)
    setMaterialRows(catRes.data || [])
    setVendors(
      (venRes.data || []).map(v => ({
        id: v.id,
        name: v.company_name,
      }))
    )
    setLoading(false)
  }, [catsKey])

  useEffect(() => {
    refresh()
  }, [refresh])

  const resolve = useCallback(
    (name, vendorId, fallback = 0) =>
      resolveMaterialPrice(name, vendorId, materialRows, priceMap, fallback),
    [materialRows, priceMap]
  )

  // Catalog-driven: a vendor appears in a section only when they have priced a
  // product in that category / sub-category (material_rates row with their
  // vendor_id). Replaces the retired supplied_categories gate.
  const vendorOptionsForCategory = useCallback(
    cat => [
      { value: 'House', label: 'Standard' },
      ...vendors
        .filter(v =>
          materialRows.some(
            r => r.vendor_id === v.id && (r.sub_category === cat || r.category === cat)
          )
        )
        .map(v => ({ value: v.id, label: v.name })),
    ],
    [vendors, materialRows]
  )

  const vendorNames = useMemo(() => Object.fromEntries(vendors.map(v => [v.id, v.name])), [vendors])

  return {
    priceMap,
    materialRows,
    vendors,
    vendorNames,
    loading,
    refresh,
    resolve,
    vendorOptionsForCategory,
  }
}

// New-model version of useMaterialCatalog — same return shape, but material
// options/prices come from material + material_price (via fetchModuleCatalog),
// labor from labor_rates, fees from misc_rates. materialRows carry calc_meta
// (which includes migrated block dims for Modular Wall). Standard prices are
// keyed by the (cleaned) description in priceMap. Use this to repoint a hook
// module off material_rates without touching the legacy hook other modules use.
export function useNewMaterialCatalog(categories, initial = {}) {
  const cats = Array.isArray(categories) ? categories : [categories]
  const catsKey = cats.join('|')

  const [priceMap, setPriceMap] = useState(initial.materialPrices ?? {})
  const [materialRows, setMaterialRows] = useState(initial.materialRows ?? [])
  const [vendors, setVendors] = useState([])
  const [loading, setLoading] = useState(!initial.materialPrices)

  const refresh = useCallback(async () => {
    const catList = catsKey.split('|')
    const [rows, labRes, feeRes, venRes] = await Promise.all([
      fetchModuleCatalog(catList),
      supabase.from('labor_rates').select('name, rate').in('category', catList),
      supabase.from('misc_rates').select('name, rate').in('category', catList),
      supabase
        .from('subs_vendors')
        .select('id, company_name')
        .eq('type', 'vendor')
        .order('company_name'),
    ])
    const pm = {}
    ;(rows || []).forEach(r => {
      if (r.vendor_id == null && r.name) pm[r.name] = num(r.unit_cost)
    })
    ;(labRes.data || []).forEach(r => {
      pm[r.name] = num(r.rate)
    })
    ;(feeRes.data || []).forEach(r => {
      pm[r.name] = num(r.rate)
    })
    setPriceMap(pm)
    setMaterialRows(rows || [])
    setVendors(
      (venRes.data || []).map(v => ({
        id: v.id,
        name: v.company_name,
      }))
    )
    setLoading(false)
  }, [catsKey])

  useEffect(() => {
    refresh()
  }, [refresh])

  const resolve = useCallback(
    (name, vendorId, fallback = 0) =>
      resolveMaterialPrice(name, vendorId, materialRows, priceMap, fallback),
    [materialRows, priceMap]
  )
  // Catalog-driven vendor list (see useMaterialCatalog note): a vendor shows in a
  // section only where they have priced a product in that category / sub-category.
  const vendorOptionsForCategory = useCallback(
    cat => [
      { value: 'House', label: 'Standard' },
      ...vendors
        .filter(v =>
          materialRows.some(
            r => r.vendor_id === v.id && (r.sub_category === cat || r.category === cat)
          )
        )
        .map(v => ({ value: v.id, label: v.name })),
    ],
    [vendors, materialRows]
  )
  const vendorNames = useMemo(() => Object.fromEntries(vendors.map(v => [v.id, v.name])), [vendors])

  return { priceMap, materialRows, vendors, vendorNames, loading, refresh, resolve, vendorOptionsForCategory }
}
