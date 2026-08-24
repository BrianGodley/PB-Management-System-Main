// ─────────────────────────────────────────────────────────────────────────────
// Shared utility-row resolver — ONE copy for Fire Pit / Outdoor Kitchen / Pool /
// Utilities (previously four drifted copies). Resolves a gas/electrical/pipe row's
// material cost + per-unit labor from the master rates, vendor-first.
//
// Canonical behavior (decided 2026-08-19):
//   D1  Unset vendor → the row prices $0 until a vendor (Standard or real) is
//       chosen, so it surfaces as unpriced rather than silently defaulting.
//   D2  Material price = the selected vendor's catalog record (Standard resolves
//       to the item's null-vendor record — one record, one price). The name-map
//       (mp) is only an equivalent last resort for a type with no catalog record;
//       it's the same category rate map, so it never diverges from the record.
//       No hardcoded constant. Labor ALWAYS rides on the item's
//       calc_meta.labor_rate pointer; a vendor never changes labor.
//
// opts.category (optional) restricts the catalog option lookup to a category
// (Utilities passes 'Utilities'; the others pass nothing, matching prior behavior).
// ─────────────────────────────────────────────────────────────────────────────
import { catalogOptions, catalogItemFor } from './materialCatalog'

const n = v => {
  const x = typeof v === 'number' ? v : parseFloat(v)
  return Number.isFinite(x) ? x : 0
}
// One-picker scheme: Standard resolves the price from the item's null-vendor
// catalog record (same rows the options come from), not a name-map. A real vendor
// resolves its own row. Matches Concrete/Drainage/Turf/Steps.
const CATALOG_OPTS = { standardRows: 'null-vendor', stripPrefix: true }

// Catalog options for a util category, vendor-first. Built-in array supplies only
// the labor db-name for a matching item, never option rows.
export function mergedUtilTypes(cat, builtInArr, materialRows, vendorSel = 'Standard', opts = {}) {
  const isStd = !vendorSel || vendorSel === 'Standard' || vendorSel === 'auto'
  const catRows = catalogOptions(materialRows, cat, isStd ? 'Standard' : vendorSel, {
    standardRows: 'null-vendor',
    stripPrefix: true,
    ...(opts.category ? { category: opts.category } : {}),
  })
  if (!catRows.length) return []
  return catRows.map(o => {
    const bi = (builtInArr || []).find(b => b.dbName === o.row.name || b.label === o.label)
    return {
      label: o.label,
      // Frozen material key (MAT-NNN-slug) so a picker can store/match by ref_key and
      // survive a catalog rename. null for a legacy row without one.
      ref_key: o.ref_key || o.row?.ref_key || null,
      dbName: o.row.name,
      // Catalog Standard price for this Item (DB-sourced) — the D2 material fallback.
      matCatalog: n(o.row.unit_cost),
      catalogPrice: n(o.row.unit_cost), // alias, in case any caller reads catalogPrice
      // Labor pointer = the Item's own calc_meta.labor_rate (independent labor_rates
      // row). No synthesized name, no built-in map — unset ⇒ the row prompts a fix.
      laborDbName: o.row.calc_meta?.labor_rate || null,
      fromMaster: !bi,
    }
  })
}

export function resolveUtilRow(cat, row, houseArr, materialRows, mp, opts = {}) {
  // D1 — unset vendor → empty Type list, $0 material/labor (prompt to pick a vendor).
  const vsel = row.vendor && row.vendor !== 'auto' ? row.vendor : ''
  if (!vsel) {
    return {
      opts: [],
      matOpt: { label: row.type, dbName: undefined, matCatalog: 0, fallback: 0 },
      matCost: 0,
      laborVal: 0,
      laborName: null,
      laborBuiltIn: null,
    }
  }
  // Type options = the SELECTED VENDOR'S catalog items (vendor-first, like Paver).
  // row.type may be the frozen material ref_key (converted pickers) or the legacy
  // label (not-yet-converted modules) — match either (dual-key transition).
  const merged = mergedUtilTypes(cat, houseArr, materialRows, vsel, opts)
  const builtIn =
    merged.find(o => (o.ref_key && o.ref_key === row.type) || o.label === row.type) || merged[0]
  let matDbName = builtIn?.dbName
  // Resolve the catalog record by the option's frozen ref_key (falls back to label
  // for a row with no ref_key) so the price survives a catalog rename.
  const vrow = catalogItemFor(materialRows, cat, vsel, builtIn?.ref_key || builtIn?.label, {
    ...CATALOG_OPTS,
    fallbackFirst: false,
  })
  if (vrow) matDbName = vrow.name
  // Labor: the item's calc_meta.labor_rate, resolved live via mp. No fallback —
  // unset ⇒ laborVal 0 and the row is flagged for the user to fix.
  const laborName = vrow?.calc_meta?.labor_rate || builtIn?.laborDbName || null
  const laborVal = n(mp[laborName])
  // D2 — the selected vendor's catalog record wins (Standard resolves its
  // null-vendor record, so vrow is set for Standard too). mp[matDbName] is only an
  // equivalent last resort for a type with no catalog record; matCatalog last.
  const matCatalog = builtIn?.matCatalog ?? 0
  const matCost = vrow
    ? n(vrow.unit_cost)
    : mp[matDbName] != null
      ? n(mp[matDbName])
      : matCatalog
  const matOpt = { label: builtIn?.label, ref_key: builtIn?.ref_key || null, dbName: matDbName, matCatalog, fallback: matCatalog }
  return { opts: merged, matOpt, matCost, laborVal, laborName, laborBuiltIn: builtIn }
}
