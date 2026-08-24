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
//   2. Standard / Unspecified price: name-keyed priceMap[n]  (vendor-agnostic master rate)
//   3. Hardcoded fallback:     fb
// Vendor 'Standard' / '' / null resolves straight to step 2 → 3.
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from './supabase'

const num = v => {
  const x = parseFloat(v)
  return Number.isFinite(x) ? x : 0
}

// Vendor sentinel for the Standard/Unspecified (universal) price.
// '' / null and 'Standard' both mean "use the Standard price".
const isStandardSel = v => !v || v === 'Standard'

// Name-keyed resolver (Pattern A/B modules). `vendorId` of 'Standard'/''/null → Standard price.
export function resolveMaterialPrice(name, vendorId, materialRows, priceMap, fallback = 0) {
  if (vendorId && !isStandardSel(vendorId)) {
    const row = (materialRows || []).find(r => r.name === name && r.vendor_id === vendorId)
    if (row && row.unit_cost != null && row.unit_cost !== '') return num(row.unit_cost)
  }
  const mp = priceMap?.[name]
  return mp != null ? mp : fallback
}

// ── Subcategory catalog resolution (shared by every vendor-catalog module) ────
// Filters material_rows to a subcategory + vendor and resolves a stored key to
// its row. Options tune the per-module behavior so this single implementation
// reproduces paverOptions / lightingOptions / wfVendorPrice / resolveUtilRow /
// drainMatCost / turfMatPrice / etc. exactly:
//   standardRows : 'exclude'     → Standard/Custom vendor yields no catalog rows
//                               (module prices Standard off its name-keyed map)
//               'null-vendor' → Standard yields the vendor_id IS NULL rows
//   stripPrefix: true         → label = name minus the '<subcategory> - ' prefix
export function catalogOptions(
  materialRows,
  subcategory,
  vendorSel,
  { standardRows = 'exclude', stripPrefix = false, category = null } = {}
) {
  const isStandard = isStandardSel(vendorSel) || vendorSel === 'Custom'
  if (isStandard && standardRows === 'exclude') return []
  const prefix = `${subcategory} - `
  return (materialRows || [])
    // Optional Category scope: when a caller passes `category`, only items in
    // that Category are returned (Category + Sub-category scoping). Without it,
    // behavior is unchanged (Sub-category only). Used to keep module-specific
    // pickers (e.g. Fire Pit vs Outdoor Kitchen Wall Finish) from cross-showing.
    .filter(r => r.sub_category === subcategory && (!category || r.category === category) && (isStandard ? r.vendor_id == null : r.vendor_id === vendorSel))
    .map(r => {
      const label =
        stripPrefix && r.name && r.name.startsWith(prefix) ? r.name.slice(prefix.length) : r.name
      return { id: r.id, value: r.id, label, stored: label, row: r }
    })
}

// Resolve a stored selection key to its material_rates row: by id (new saves),
// then by label/name (legacy saves). By default falls back to the first option;
// pass fallbackFirst:false to return null when nothing matches (so a module can
// keep its Standard default instead).
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

// ── Price ledger (new model — effective-dated material_price) ────────────────
// Price history lives in material_price itself: each (material, vendor) has one
// or more periods (effective_start .. effective_end; effective_end IS NULL = the
// open/current period). fetchOpenPriceLedger returns a map keyed by material id →
// { [vendor_id | '__house__']: price }. ledgerPrice resolves a material+vendor
// from that map, falling back to the supplied default. The Standard/Unspecified
// vendor is folded into '__house__' so callers passing vendor_id null resolve to
// the universal price. Importers write new effective-dated rows (see
// supersedeMaterialPrice), so history accrues going forward.
const STANDARD_KEY = '__house__'

// Price map for a set of materials AS OF a date. asOfDate null/'' → the current
// open price (effective_end IS NULL). Otherwise → the period covering that date
// (effective_start <= date AND (effective_end IS NULL OR effective_end >= date)),
// so an estimate can be priced at its bid-date rates.
export async function fetchPriceLedgerAsOf(materialIds, asOfDate = null) {
  const ids = [...new Set((materialIds || []).filter(Boolean))]
  if (!ids.length) return {}
  const [{ data: vends }, ledRes] = await Promise.all([
    supabase.from('subs_vendors').select('id, company_name'),
    (() => {
      let q = supabase
        .from('material_price')
        .select('material_id, vendor_id, price, effective_start')
        .in('material_id', ids)
      if (asOfDate) {
        q = q.lte('effective_start', asOfDate).or(`effective_end.is.null,effective_end.gte.${asOfDate}`)
      } else {
        q = q.is('effective_end', null)
      }
      return q
    })(),
  ])
  const stdId =
    (vends || []).find(v => ['standard', 'unspecified'].includes((v.company_name || '').trim().toLowerCase()))
      ?.id || null
  const map = {}
  const bestStart = {} // "materialId|vendorKey" → latest effective_start seen
  ;(ledRes.data || []).forEach(r => {
    const vk = r.vendor_id == null || r.vendor_id === stdId ? STANDARD_KEY : r.vendor_id
    const key = `${r.material_id}|${vk}`
    const start = r.effective_start || ''
    if (bestStart[key] == null || start >= bestStart[key]) {
      bestStart[key] = start
      if (!map[r.material_id]) map[r.material_id] = {}
      map[r.material_id][vk] = num(r.price)
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
    const vk = vendorId && !isStandardSel(vendorId) ? vendorId : STANDARD_KEY
    if (led[vk] != null) return led[vk]
    if (led[STANDARD_KEY] != null) return led[STANDARD_KEY]
  }
  return num(fallback)
}

// ── New pricing model adapter (material + material_price) ────────────────────
// Returns catalog rows in the SAME shape the modules already consume from
// material_rates — {id,name,unit_cost,sub_category,vendor_id,calc_meta,collection}
// — sourced from the rebuilt `material` product + `material_price` (one open
// price per product×vendor). The Standard vendor is emitted as vendor_id:null so
// standardRows:'null-vendor' / Standard resolution behaves exactly as before.
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
  const sel = `id, description, unit, calc_meta, collection,
       watts, va, labor_hrs_ea, sub_price_ea, sf_per_pallet, price_per_lf_vert,
       category:category_id ( name ),
       subcategory:subcategory_id ( name ),
       prices:material_price ( price, vendor_id, effective_end )`
  // Prefer to hide archived materials, but fall back gracefully if the
  // archived_at column hasn't been migrated yet — otherwise the filter errors
  // and the estimator loses every catalog block/material.
  //
  // Page past PostgREST's default row cap (1000): a large catalog spanning
  // several categories (e.g. 50+ appliances tipping Outdoor Kitchen + Utilities
  // + Walls over the limit) would otherwise silently truncate the newest rows
  // out of the pickers — items show in Master Rates but never in the module.
  const PAGE = 1000
  const pageAll = async withArchivedFilter => {
    const out = []
    for (let from = 0; ; from += PAGE) {
      // A STABLE order is required for .range() paging — without ORDER BY, Postgres
      // may return rows in a different order per request, so rows near page
      // boundaries get skipped or duplicated (the newest-inserted product is the
      // one most likely to silently vanish). Order by id so paging is deterministic.
      let q = supabase.from('material').select(sel).in('category_id', catIds).order('id')
      if (withArchivedFilter) q = q.is('archived_at', null)
      const { data: pg, error } = await q.range(from, from + PAGE - 1)
      if (error) return { error }
      out.push(...(pg || []))
      if (!pg || pg.length < PAGE) break
    }
    return { data: out }
  }
  let matRes = await pageAll(true)
  if (matRes.error) matRes = await pageAll(false)
  const data = matRes.data
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
          // Module-specific product specs (Lighting watts/va/labor/sub-price,
          // Paver/Steps pallet, etc.) — null when the product doesn't carry them.
          watts: m.watts ?? null,
          va: m.va ?? null,
          labor_hrs_ea: m.labor_hrs_ea ?? null,
          sub_price_ea: m.sub_price_ea ?? null,
          sf_per_pallet: m.sf_per_pallet ?? null,
          price_per_lf_vert: m.price_per_lf_vert ?? null,
        })
      })
  })
  return rows
}

// name → price for the given categories from the NEW model: material Standard
// prices (material + open material_price for the Standard vendor) + labor_rates
// + misc_rates. Drop-in replacement for the legacy
//   material_rates.select('name, unit_cost').in('category', cats)
// map. Names not present fall back to the caller's code constant.
// Dual-keyed labor rate map (by NAME and by ref_key) for the given labor categories,
// PLUS the shared basic_labor_rates table. Modules read labor by ref_key (LAB-/BAS-)
// now and by legacy name during the transition, so BOTH keys must be present — a
// name-only map (a raw labor_rates query) makes every ref_key read resolve to 0.
export async function fetchLaborRateMap(categories) {
  // categories omitted → every non-archived labor row (matches the demos' old broad
  // `neq('category','Archived')` query); otherwise scope to the given categories.
  let laborQ = supabase.from('labor_rates').select('name, ref_key, rate, rate_per_day')
  laborQ = categories == null
    ? laborQ.neq('category', 'Archived')
    : laborQ.in('category', Array.isArray(categories) ? categories : [categories])
  const [labRes, basicRes] = await Promise.all([
    laborQ,
    // Basic Labor is shared across modules; always included, tolerant of the table
    // not existing yet (returns an error object, never rejects).
    supabase.from('basic_labor_rates').select('name, ref_key, rate, category'),
  ])
  const map = {}
  const put = (r, v) => { if (r.name) map[r.name] = v; if (r.ref_key) map[r.ref_key] = v }
  ;(labRes.data || []).forEach(r => put(r, num(r.rate ?? r.rate_per_day)))
  ;(basicRes?.data || []).forEach(r => { if (r.category !== 'Archived') put(r, num(r.rate)) })
  return map
}

export async function fetchStandardRateMap(categories) {
  const cats = Array.isArray(categories) ? categories : [categories]
  const [rows, labRes, feeRes, basicRes] = await Promise.all([
    fetchModuleCatalog(cats),
    supabase.from('labor_rates').select('name, ref_key, rate').in('category', cats),
    supabase.from('misc_rates').select('name, rate').in('category', cats),
    // Basic Labor lives in its OWN table and is a small SHARED set (base prep,
    // curb core, …) any module may read, so it's pulled in full — not filtered
    // by the caller's categories. Tolerant of the table not existing yet (returns
    // an error object, never rejects) so a pre-migration deploy can't break the map.
    supabase.from('basic_labor_rates').select('name, ref_key, rate, category'),
  ])
  const map = {}
  ;(rows || []).forEach(r => {
    if (r.vendor_id == null && r.name) map[r.name] = num(r.unit_cost)
  })
  ;(labRes.data || []).forEach(r => {
    // Key by BOTH the display name (legacy lookups) and the stable ref_key
    // (LAB-NNN-slug), so modules can migrate to ref_key without breakage.
    if (r.name) map[r.name] = num(r.rate)
    if (r.ref_key) map[r.ref_key] = num(r.rate)
  })
  ;(feeRes.data || []).forEach(r => {
    if (r.name) map[r.name] = num(r.rate)
  })
  ;(basicRes?.data || []).forEach(r => {
    if (r.category === 'Archived') return
    // Dual-keyed by name AND ref_key (BAS-NNN-slug), same transition contract.
    if (r.name) map[r.name] = num(r.rate)
    if (r.ref_key) map[r.ref_key] = num(r.rate)
  })
  return map
}

// Resolve the vendor to price against: an explicit vendor, else the tenant's
// Standard/Unspecified vendor (the universal price).
export async function resolvePriceVendor(vendorId) {
  if (vendorId && !isStandardSel(vendorId)) return vendorId
  const { data } = await supabase
    .from('subs_vendors')
    .select('id')
    .or('company_name.ilike.standard,company_name.ilike.unspecified')
    .limit(1)
  return data?.[0]?.id || null
}

// Write a price into the NEW model. Updates the OPEN material_price row for
// (material_id, resolved vendor) in place if one exists, else inserts one —
// matching the app's existing convention (MissingPriceModal / MasterMaterialRates).
// vendorId null/'Standard' → the Standard (universal) price. Throws on RLS/errors.
export async function setMaterialPrice(materialId, vendorId, price, source = 'manual') {
  const v = typeof price === 'number' ? price : parseFloat(price)
  if (!Number.isFinite(v) || v < 0) throw new Error('Invalid price.')
  const vid = await resolvePriceVendor(vendorId)
  if (!vid || !materialId) throw new Error('Missing product or vendor.')
  const { data: existing, error: selErr } = await supabase
    .from('material_price')
    .select('id')
    .eq('material_id', materialId)
    .eq('vendor_id', vid)
    .is('effective_end', null)
    .limit(1)
  if (selErr) throw new Error('Lookup failed: ' + selErr.message)
  if (existing && existing.length > 0) {
    const { data: up, error: upErr } = await supabase
      .from('material_price')
      .update({ price: v })
      .eq('id', existing[0].id)
      .select()
    if (upErr) throw new Error('Save failed: ' + upErr.message)
    if (!up || up.length === 0) throw new Error('Save returned 0 rows — RLS likely blocked the write.')
    return up[0]
  }
  const { data: ins, error: insErr } = await supabase
    .from('material_price')
    .insert({ material_id: materialId, vendor_id: vid, price: v, source })
    .select()
  if (insErr) throw new Error('Save failed: ' + insErr.message)
  if (!ins || ins.length === 0) throw new Error('Insert returned 0 rows — RLS likely blocked the write.')
  return ins[0]
}

// Effective-dated price write for imports (price sheets / invoices). Closes the
// current open material_price row for (material, vendor) by stamping its
// effective_end the day before `effectiveStart`, then inserts a new open row.
// This preserves a price timeline inside material_price itself (the new model's
// ledger), replacing the legacy material_rate_id-keyed material_price_history.
export async function supersedeMaterialPrice(materialId, vendorId, price, opts = {}) {
  const v = typeof price === 'number' ? price : parseFloat(price)
  if (!Number.isFinite(v) || v < 0) throw new Error('Invalid price.')
  const vid = await resolvePriceVendor(vendorId)
  if (!vid || !materialId) throw new Error('Missing product or vendor.')
  const start = opts.effectiveStart || new Date().toISOString().slice(0, 10)
  const source = opts.source || 'manual'
  // day before start → effective_end for the row we're closing
  const priorEnd = new Date(new Date(start).getTime() - 86400000).toISOString().slice(0, 10)
  const { data: open } = await supabase
    .from('material_price')
    .select('id, effective_start')
    .eq('material_id', materialId)
    .eq('vendor_id', vid)
    .is('effective_end', null)
  for (const row of open || []) {
    // Don't create a zero/negative-length period if an open row already starts
    // on/after the new start — just overwrite it in place instead.
    if (row.effective_start && row.effective_start >= start) {
      await supabase.from('material_price').update({ price: v, source }).eq('id', row.id)
      return { superseded: false, updatedId: row.id }
    }
    await supabase.from('material_price').update({ effective_end: priorEnd }).eq('id', row.id)
  }
  const { data: ins, error: insErr } = await supabase
    .from('material_price')
    .insert({ material_id: materialId, vendor_id: vid, price: v, effective_start: start, source })
    .select('id')
  if (insErr) throw new Error('Price insert failed: ' + insErr.message)
  return { superseded: true, newId: ins?.[0]?.id || null }
}

// Save a named "Standard" rate onto the new model. Mirrors how fetchStandardRateMap
// READS a name (material Standard price, else misc_rates). If a material exists with
// this description, its Standard (universal) price is set; otherwise the name is
// treated as a misc_rate. Used by module rate-editors that historically wrote
// material_rates.unit_cost by name (Steps, Walls). Labor coefficients keep using
// labor_rates directly — this is only for the material-price side.
export async function saveStandardNamedRate(name, price, category = null) {
  const val = typeof price === 'number' ? price : parseFloat(price)
  const { data: mat } = await supabase.from('material').select('id').eq('description', name).limit(1)
  if (mat && mat.length) {
    await setMaterialPrice(mat[0].id, null, Number.isFinite(val) ? val : 0)
    return
  }
  const { data: ex } = await supabase.from('misc_rates').select('id').eq('name', name).limit(1)
  if (ex && ex.length) {
    await supabase.from('misc_rates').update({ rate: Number.isFinite(val) ? val : 0 }).eq('id', ex[0].id)
  } else {
    const row = { name, rate: Number.isFinite(val) ? val : 0 }
    if (category) row.category = category
    await supabase.from('misc_rates').insert(row)
  }
}

// Set a labor rate by name (frozen key). The row almost always exists (labor
// names are stable keys), so this updates it; if somehow missing it inserts.
// Used by UnpricedItemModal in labor mode so an unpriced labor item can be
// priced inline, exactly like an unpriced material.
export async function saveLaborRate(name, rate, category = null) {
  const val = typeof rate === 'number' ? rate : parseFloat(rate)
  const v = Number.isFinite(val) ? val : 0
  const { data: ex } = await supabase.from('labor_rates').select('id').eq('name', name).limit(1)
  if (ex && ex.length) {
    await supabase.from('labor_rates').update({ rate: v }).eq('id', ex[0].id)
  } else {
    const row = { name, rate: v }
    if (category) row.category = category
    await supabase.from('labor_rates').insert(row)
  }
}

// Create a new catalog item (material) under a Category → Sub-category and set
// its Standard (or picked-vendor) price. Used by the inline "add item" flow when
// a picker's sub-category is an empty set. Mirrors SelectionsBrowser's create
// path. Returns the new material id.
export async function createCatalogItem({ name, category, subCategory, unit = null, price = null, vendorId = null }) {
  const desc = (name || '').trim()
  if (!desc) throw new Error('Item name is required.')
  const { category_id, subcategory_id, error: taxErr } = await resolveTaxonomyIds(category, subCategory)
  if (taxErr) throw new Error(taxErr)
  const payload = {
    description: desc,
    category_id,
    subcategory_id,
    unit: (unit || '').trim() || null,
    attributes: {},
  }
  const { data: ins, error: insErr } = await supabase.from('material').insert(payload).select('id')
  if (insErr) throw new Error('Create failed: ' + insErr.message)
  const materialId = ins?.[0]?.id || null
  if (!materialId) throw new Error('Create returned no row — RLS likely blocked the insert.')
  if (price !== '' && price != null) {
    await setMaterialPrice(materialId, vendorId || null, Number(price))
  }
  return materialId
}

// All materials mapped to the legacy material_rates row shape (for admin list
// views): one row per material with its Standard (universal) open price. Sorted
// by name. Used by the old Master Rates page's Materials tab.
export async function fetchAllMaterialsAdmin() {
  const [{ data: vends }, { data }] = await Promise.all([
    supabase.from('subs_vendors').select('id, company_name'),
    supabase
      .from('material')
      .select(
        `id, description, unit, calc_meta, photo_url, sku, show_in_selections, archived_at,
         category:category_id ( name ),
         subcategory:subcategory_id ( name ),
         prices:material_price ( price, vendor_id, effective_end )`
      ),
  ]).then(async ([v, m]) => {
    // Fall back without archived_at if the column hasn't been migrated yet.
    if (m.error) {
      m = await supabase
        .from('material')
        .select(
          `id, description, unit, calc_meta, photo_url, sku, show_in_selections,
           category:category_id ( name ),
           subcategory:subcategory_id ( name ),
           prices:material_price ( price, vendor_id, effective_end )`
        )
    }
    return [v, m]
  })
  const stdId =
    (vends || []).find(v => ['standard', 'unspecified'].includes((v.company_name || '').trim().toLowerCase()))
      ?.id || null
  return (data || [])
    .map(m => {
      const open = (m.prices || []).filter(p => p.effective_end == null)
      const std = open.find(p => p.vendor_id === stdId)
      return {
        id: m.id,
        name: m.description,
        unit: m.unit || null,
        unit_cost: std ? num(std.price) : open.length ? num(open[0].price) : null,
        category: m.category?.name || null,
        sub_category: m.subcategory?.name || null,
        vendor_id: null, // new model: materials are shared; price is per-vendor
        calc_meta: m.calc_meta || null,
        photo_url: m.photo_url || null,
        sku: m.sku || null,
        show_in_selections: !!m.show_in_selections,
      }
    })
    .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
}

// Read a named "Standard" rate from the new model — the inverse of
// saveStandardNamedRate. Returns the material's Standard open price if a material
// with this description exists, else the misc_rates value, else null.
export async function getStandardNamedRate(name) {
  const { data: mat } = await supabase.from('material').select('id').eq('description', name).limit(1)
  if (mat && mat.length) {
    const vid = await resolvePriceVendor(null)
    if (vid) {
      const { data: p } = await supabase
        .from('material_price')
        .select('price')
        .eq('material_id', mat[0].id)
        .eq('vendor_id', vid)
        .is('effective_end', null)
        .limit(1)
      if (p?.[0]?.price != null) return num(p[0].price)
    }
    return null
  }
  const { data: mr } = await supabase.from('misc_rates').select('rate').eq('name', name).limit(1)
  return mr?.[0]?.rate != null ? num(mr[0].rate) : null
}

// Materials flagged show_in_selections, normalized to the old material_rates
// "selections row" shape the CAD palette + SelectionsBrowser expect:
//   { id, category, sub_category, name, photo_url, unit, price, collection }
// price = the Standard (universal) open price, else the lowest open vendor price.
export async function fetchSelections() {
  const selSel = `id, description, photo_url, unit, collection, sku, attributes,
         category:category_id ( name ),
         subcategory:subcategory_id ( name ),
         prices:material_price ( price, vendor_id, effective_end )`
  const [{ data: vends }, matRes] = await Promise.all([
    supabase.from('subs_vendors').select('id, company_name'),
    supabase.from('material').select(selSel).eq('show_in_selections', true).is('archived_at', null),
  ])
  // Fall back if archived_at hasn't been migrated yet (see fetchModuleCatalog).
  let data = matRes.data
  if (matRes.error) {
    const retry = await supabase.from('material').select(selSel).eq('show_in_selections', true)
    data = retry.data
  }
  const stdId =
    (vends || []).find(v => ['standard', 'unspecified'].includes((v.company_name || '').trim().toLowerCase()))
      ?.id || null
  return (data || [])
    .map(m => {
      const open = (m.prices || []).filter(p => p.effective_end == null)
      const std = open.find(p => p.vendor_id === stdId)
      const price = std ? num(std.price) : open.length ? Math.min(...open.map(p => num(p.price))) : null
      const attrs = m.attributes && typeof m.attributes === 'object' ? m.attributes : {}
      return {
        id: m.id,
        category: m.category?.name || null,
        sub_category: m.subcategory?.name || null,
        name: m.description,
        photo_url: m.photo_url || null,
        unit: m.unit || null,
        price,
        unit_cost: price, // alias for edit-form prefill
        sku: m.sku || null,
        // the new model keeps the product name in `description`; the old long-text
        // "description" (spec blurb) lives under attributes.description.
        description: attrs.description || null,
        attributes: attrs,
        collection: m.collection || null,
      }
    })
    .sort(
      (a, b) =>
        (a.category || '').localeCompare(b.category || '') || (a.name || '').localeCompare(b.name || '')
    )
}

// ─────────────────────────────────────────────────────────────────────────────
// Delete-guard helpers. Selections in saved estimates reference materials by
// NAME (not FK), and material_price holds the price ledger — so a hard delete
// silently orphans live selections and erases history. These let the UI check
// usage first and prefer a reversible archive.
// ─────────────────────────────────────────────────────────────────────────────

// How much would be lost / broken if this material were hard-deleted:
//   priceCount — material_price rows (the price ledger, incl. history)
//   refCount   — saved estimate_modules whose JSON mentions this product name
export async function materialUsage(materialId, name) {
  const [{ count: priceCount }, refRes] = await Promise.all([
    supabase
      .from('material_price')
      .select('id', { count: 'exact', head: true })
      .eq('material_id', materialId),
    name
      ? supabase.rpc('material_reference_count', { p_name: name })
      : Promise.resolve({ data: 0 }),
  ])
  return {
    priceCount: priceCount || 0,
    refCount: Number(refRes?.data ?? 0) || 0,
  }
}

// Reversible soft-delete: hide from every module picker / selection browser but
// keep the product row + its whole price ledger intact.
export async function archiveMaterial(id) {
  return supabase.from('material').update({ archived_at: new Date().toISOString() }).eq('id', id)
}

// Undo an archive — the product reappears in pickers.
export async function restoreMaterial(id) {
  return supabase.from('material').update({ archived_at: null }).eq('id', id)
}

// Resolve a category name + sub-category name to their ids in the taxonomy
// tables. Returns { category_id, subcategory_id, error }. subcategory is matched
// within the resolved category. Missing rows → error (callers surface it; we do
// NOT auto-create taxonomy here — that's TaxonomyManager's job).
export async function resolveTaxonomyIds(categoryName, subCategoryName) {
  const cName = (categoryName || '').trim()
  const sName = (subCategoryName || '').trim()
  if (!cName) return { error: 'Category is required.' }
  const { data: cat } = await supabase
    .from('category')
    .select('id, name')
    .ilike('name', cName)
    .limit(1)
  const category_id = cat?.[0]?.id
  if (!category_id) return { error: `Category "${cName}" not found. Add it in Taxonomy first.` }
  let subcategory_id = null
  if (sName) {
    const { data: sub } = await supabase
      .from('subcategory')
      .select('id, name')
      .eq('category_id', category_id)
      .ilike('name', sName)
      .limit(1)
    subcategory_id = sub?.[0]?.id || null
    if (!subcategory_id)
      return { error: `Sub-category "${sName}" not found under "${cName}". Add it in Taxonomy first.` }
  }
  return { category_id, subcategory_id }
}

// Shared catalog hook. Fetches, for one or more `categories`:
//   • priceMap  — name → unit_cost (materials) merged with name → rate (labor coefficients)
//   • materialRows — {id,name,vendor_id,unit,unit_cost,category,sub_category,subcategory}
//   • vendors   — [{id,name,categories}] (type='vendor'), for the pickers
// and returns a `resolve(name, vendorId, fallback)` bound to the loaded data plus
// `vendorOptionsForCategory(cat)` (Standard/Unspecified first).
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
    // material_rates retired: material options/prices come from material +
    // material_price (fetchModuleCatalog); labor from labor_rates, fees from
    // misc_rates. A name not found falls back to the module's code constant.
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

  // Catalog-driven: a vendor appears in a section only when they have priced a
  // product in that category / sub-category (material_rates row with their
  // vendor_id). Replaces the retired supplied_categories gate.
  const vendorOptionsForCategory = useCallback(
    cat => [
      { value: 'Standard', label: 'Standard' },
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
    // material_rates is being retired: the base price map is built from the new
    // catalog's Standard prices (material + material_price) plus labor_rates and
    // misc_rates. Any name not found falls back to the module's code constant.
    const [rows, labRes, feeRes, basicRes, venRes] = await Promise.all([
      fetchModuleCatalog(catList),
      supabase.from('labor_rates').select('name, ref_key, rate').in('category', catList),
      supabase.from('misc_rates').select('name, rate').in('category', catList),
      // Shared Basic Labor coefficients (Jumping Jack, base prep, curb core, …),
      // read by name AND ref_key. Tolerant of the table not existing yet.
      supabase.from('basic_labor_rates').select('name, ref_key, rate, category'),
      supabase
        .from('subs_vendors')
        .select('id, company_name')
        .eq('type', 'vendor')
        .order('company_name'),
    ])
    const pm = {}
    // Catalog Standard prices (by name), then labor + misc coefficients.
    ;(rows || []).forEach(r => {
      if (r.vendor_id == null && r.name) pm[r.name] = num(r.unit_cost)
    })
    ;(labRes.data || []).forEach(r => {
      // Dual-key: modules read labor by legacy name AND by ref_key (LAB-/BAS-).
      if (r.name) pm[r.name] = num(r.rate)
      if (r.ref_key) pm[r.ref_key] = num(r.rate)
    })
    ;(feeRes.data || []).forEach(r => {
      pm[r.name] = num(r.rate)
    })
    ;(basicRes?.data || []).forEach(r => {
      if (r.category === 'Archived') return
      if (r.name) pm[r.name] = num(r.rate)
      if (r.ref_key) pm[r.ref_key] = num(r.rate)
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
      { value: 'Standard', label: 'Standard' },
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
