# Phase 4 — Normalized Multi-Vendor Pricing

_Picture Build estimator · pricing architecture_

## Decision

Multi-vendor pricing uses the **normalized** model: a canonical material with a
child table of per-vendor prices — rather than relaxing the unique key so the
same product can appear as many rows.

## Key insight: the child table already exists

`material_price_history` already has exactly the shape a `material_prices` child
needs — `material_rate_id`, `vendor_id`, `unit_cost`, `effective_start/end`,
`source`, `import_id`. So Phase 4 **reuses it** instead of adding a redundant
table:

| Table | Role |
|---|---|
| `material_rates` | Canonical material — the spec (name, category, sub_category, sku, photo, attributes) + a default/Unspecified `unit_cost`. |
| `material_price_history` | Per-vendor price ledger. One row per vendor per price period; `effective_end IS NULL` = the current price. Many open rows per material (one per vendor). |

`price_as_of(material_id, vendor_id, date)` (added in the migration) resolves:
the vendor's own price → the Unspecified (null-vendor) price → the live
`material_rates.unit_cost`.

## What shipped (Step 1 — additive, non-breaking)

`supabase-material-prices-phase4.sql`:

1. Backfills an **open** `material_price_history` period for every current
   `material_rates` price (so the ledger is complete — seeded/manually-set rows
   included, not just price-sheet-updated ones).
2. Adds the vendor-aware `price_as_of(material_id, vendor_id, date)` overload and
   a `material_current_price(material_id, vendor_id)` convenience wrapper.

Nothing in the app reads these yet, so estimates are unchanged. Run on STAGING
then PROD.

## Rollout (next increments, each independently shippable)

**Step 2 — resolver reads the ledger.** Extend `useMaterialCatalog` to also load
the current open price per (material_id, vendor_id) from `material_price_history`
and expose `resolveById(materialId, vendorId)`. Modules that already reference
materials by `id` (Paver, Steps, Lighting) switch first; the name-keyed modules
keep working via the existing fallback. Live estimates recompute unchanged
because the backfilled open price equals today's `unit_cost`.

**Step 3 — writers target the ledger.**
- *Price sheets*: instead of creating a new `material_rates` row per vendor for a
  product that already exists, match to the canonical material and write a
  `material_price_history` row for that `(material, vendor)` (closing the prior
  open period). New products still create a canonical `material_rates` row.
- *Catalog import*: same — a vendor's price for an existing product becomes a
  ledger row against the canonical material, not a duplicate material row.
- *RateEditPopover / Master Rates*: a manual price edit writes a
  `material_price_history` row (source `manual`) for the chosen vendor, and keeps
  `material_rates.unit_cost` in sync as the Unspecified default.

**Step 4 — consolidation.** The existing merge tool (`merge_material_rates`)
already repoints `material_price_history`; extend the reconcile flow so that
merging duplicate vendor-specific rows moves their prices onto the kept
canonical material as per-vendor ledger rows. Over time the N-rows-per-product
data collapses into one canonical + N ledger rows.

**Step 5 — as-of pricing in the estimator (optional payoff).** Once modules read
the ledger, an estimate can be priced "as of" its bid date via
`price_as_of(material_id, vendor_id, bid_date)`, and invoices already price-check
against it.

## Invariants

- One **open** period per `(material_id, vendor_id)`; a new price closes the prior
  one (`effective_end = day before the new start`).
- `material_rates.unit_cost` remains the canonical default (Unspecified) price and
  the ultimate fallback, so anything not yet migrated still resolves.
- Vendor `null` in the ledger = Unspecified/House.
