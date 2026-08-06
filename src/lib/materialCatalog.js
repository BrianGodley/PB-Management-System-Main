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

// ── Price ledger (Phase 4 — normalized multi-vendor pricing) ─────────────────
// The current OPEN price per (material, vendor) lives in material_price_history
// (effective_end IS NULL). fetchOpenPriceLedger returns a map keyed by material
// id → { [vendor_id | '__house__']: unit_cost }. ledgerPrice resolves a
// material+vendor from that map, falling back to the supplied default (usually
// the row's own unit_cost). Today the open price equals unit_cost (backfilled),
// so this is price-preserving; it becomes multi-vendor once writers populate
// per-vendor ledger rows.
const HOUSE_KEY = '__house__'
export async function fetchOpenPriceLedger(materialIds) {
  const ids = [...new Set((materialIds || []).filter(Boolean))]
  if (!ids.length) return {}
  const { data } = await supabase
    .from('material_price_history')
    .select('material_rate_id, vendor_id, unit_cost')
    .in('material_rate_id', ids)
    .is('effective_end', null)
  const map = {}
  ;(data || []).forEach(r => {
    const k = r.vendor_id ?? HOUSE_KEY
    if (!map[r.material_rate_id]) map[r.material_rate_id] = {}
    map[r.material_rate_id][k] = parseFloat(r.unit_cost)
  })
  return map
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
        .select('id,name,vendor_id,unit,unit_cost,category,sub_category,subcategory')
        .in('category', catList),
      supabase
        .from('subs_vendors')
        .select('id, company_name, supplied_categories')
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
        categories: v.supplied_categories || [],
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

  const vendorOptionsForCategory = useCallback(
    cat => [
      { value: 'House', label: 'Unspecified' },
      ...vendors
        .filter(v => (v.categories || []).includes(cat))
        .map(v => ({ value: v.id, label: v.name })),
    ],
    [vendors]
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
