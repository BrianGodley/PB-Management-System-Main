# Pricing & Materials Data Model — Locked Spec

Authoritative spec agreed 2026-08-06. Fresh tables + migration. No item may exist
in the price list without a valid Category + Sub-Category. Every estimator
material field is hard-mapped to one (Category, Sub-Category).

## Tables (new)

**`category`**
- `id` uuid PK · `code` text (unique) · `name` text
- Editable in-app; every edit runs an integrity check + confirm (see Editing).

**`subcategory`**
- `id` uuid PK · `category_id` → category (NOT NULL) · `code` text · `name` text
- `default_vendor_id` → vendor (nullable; empty = Standard shows first)
- Unique (category_id, code). A sub-category belongs to exactly one category.

**`material`** — the product. Attributes live **once** here (not per vendor).
- `id` uuid PK = the **Material ID**
- `category_id` (NOT NULL) · `subcategory_id` (NOT NULL)
- `description` text · `unit` text · `calc_meta` jsonb (labor coeff / dims / modes)
- `is_default` bool — the default item shown first for its sub-category

**`material_price`** — the priced list. One row per (product × vendor).
- `id` uuid PK · `material_id` → material (NOT NULL) · `vendor_id` (NOT NULL)
- `price` numeric · `effective_start` date · `effective_end` date (null = current)
- **Standard** rows use the single shared **Standard** vendor id; real vendors
  keep their own id. The same `material_id` links a product's Standard row and
  every vendor's row. One current (open) price per (material_id, vendor_id).

## Identity & display code

- **Row identity = (Category, Sub-Category, Vendor, Material ID).** Because
  `material_id` fixes category/sub-category, identity in `material_price` is
  effectively (material_id, vendor). **Description, unit, and price are editable
  attributes** — changing a price never changes the identity.
- **Display/reference code — generated on demand, NOT stored:**
  `<CategoryCode>-<SubCatCode>-<Vendor: STD|vendorCode>-<MaterialID>`
  e.g. `TURF-TMAT-STD-0005`. Built from the parts wherever shown or matched.

## Two views — Vendors → "Master Material Rates" (replaces the old Master Rates)

A join of `material` + `material_price`:
- **Standard view**: prices where vendor = Standard. Columns: Category,
  Sub-Category, Material ID, Description, Unit, Price. **No vendor column.**
- **Vendor view**: prices where vendor ≠ Standard. Same columns **+ Vendor**.

The current Master Rates screen is retired.

## Estimator material fields

- Each field is **hard-mapped in code** to one (Category, Sub-Category).
- Options = the `material` products for that Category + Sub-Category — live, so
  add/edit/delete of items reflects immediately in the field.
- **Default shown first:** the sub-category's `is_default` product at the
  **Standard** price — unless that sub-category has a `default_vendor` set **and**
  that vendor prices the item, in which case that vendor's price shows first.
- The user can change the vendor/item per selection; the default is only the
  first thing shown.
- A selection stores the chosen **Material ID** (+ chosen vendor). Price =
  `material_price` for (material_id, vendor), falling back to Standard.

## Entry paths — all enforce Category + Sub-Category + ID or error

- **Hand entry:** the add form requires Category + Sub-Category before save;
  Material ID auto-assigned; creates a `material` + a Standard `material_price`.
- **Price-sheet import:** every line must be assigned Category + Sub-Category in
  the review step; any unassigned line is flagged in the modal and must be fixed
  before the import can apply.
- **Invoice import:** same handling as price sheets.

## Category / sub-category editing

In-table edit function. Every edit (rename/delete/reassign) first runs a
"won't-break-anything" integrity check — e.g. a category/sub-category in use
can't be deleted; renames cascade by id (not text) — and asks to confirm.

## Migration (fresh tables, behind a parity check)

1. Create `category`, `subcategory`; extract distinct (category, sub_category)
   from today's `material_rates`, seed after **Brian approves the list**.
2. Create `material` + `material_price`; migrate `material_rates`:
   - Each distinct product → one `material` (new Material ID uuid), carrying
     category/sub-category, description (name), unit, `calc_meta`.
   - Standard/no-vendor rows → a Standard `material_price`.
   - Vendor rows for the same product → `material_price` under that vendor,
     sharing the product's `material_id`.
3. Convert each estimator field to (Category, Sub-Category)-mapped, id-based
   selection with the default rule — module by module, parity-checked.
4. Build the two-view "Master Material Rates" under Vendors; retire old Master Rates.
5. Enforce the rule on hand entry + price-sheet + invoice imports (flag modal).
6. Generated display code wherever an item is shown or matched.

Parity: recompute affected saved estimates old-vs-new and diff totals before any
selection/pricing path switches over.

## Build order

Phase 1 (this) → category/subcategory tables + extraction for approval.
Phase 2 → material/material_price tables + data migration.
Phase 3 → category/subcat admin UI. Phase 4 → two-view Master Material Rates.
Phase 5 → estimator field conversion (per module). Phase 6 → entry-path enforcement.
