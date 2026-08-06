// Product-type read + validation helpers (single-resolution-path Phase 1b).
//
// product_type declares, per class of catalog item, the calc contract its rows
// must satisfy. This module lets the app resolve a row's type and validate its
// calc_meta against the type's attribute_schema — turning the untyped JSON blob
// into something the UI can check. Additive: nothing here changes pricing.
import { supabase } from './supabase'

// Fetch the global product_type reference rows. Tolerant: if the table isn't
// present yet (migration not run on this DB), returns [] instead of throwing.
export async function fetchProductTypes() {
  const { data, error } = await supabase
    .from('product_type')
    .select('id,key,label,calc_kind,unit_basis,attribute_schema')
  if (error) return []
  return data || []
}

// Validate a row's calc_meta object against a product_type attribute_schema.
// Schema shape: { key: "type" | "type?" }  — a trailing "?" marks the key
// optional. Returns { ok, missing, unknown }.
export function validateCalcMeta(schema, meta) {
  const s = schema || {}
  const m = meta && typeof meta === 'object' ? meta : {}
  const missing = []
  for (const [key, spec] of Object.entries(s)) {
    const optional = typeof spec === 'string' && spec.trim().endsWith('?')
    const val = m[key]
    if (!optional && (val === undefined || val === null || val === '')) missing.push(key)
  }
  const known = new Set(Object.keys(s))
  const unknown = Object.keys(m).filter(k => !known.has(k))
  return { ok: missing.length === 0, missing, unknown }
}

// Build an id → product_type lookup from a fetched list.
export function indexProductTypes(list) {
  const byId = {}
  const byKey = {}
  for (const t of list || []) {
    byId[t.id] = t
    byKey[t.key] = t
  }
  return { byId, byKey }
}
