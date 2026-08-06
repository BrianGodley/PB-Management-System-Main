# Material Referencing Model — Current Wiring & Recommended Scheme

_Picture Build estimator · pricing architecture review_

This document does two things:

1. **Maps how every material-choice field and price-coded field in the estimator is wired today** — dropdowns, rate editors, vendor resolution, price sheets, invoices, and the master rate table.
2. **Recommends a single recurring model** for referencing materials so that (a) adding a material to a price list flows into the right dropdowns, (b) master-rate editors and price lists stay reconciled, and (c) even basic materials (concrete, base, sand, rebar) carry a vendor so vendor price changes propagate.

---

## 1. The one table everything hangs off: `material_rates`

Every priced material in the app resolves — directly or through a fallback — to a row in `material_rates`. Its columns (assembled from the migrations and runtime usage):

| Column | Role |
|---|---|
| `id` (uuid) | Primary key. The **rename-proof** way to reference a material. |
| `name` | Product name. The primary lookup key in most modules today. |
| `category` | **Module routing key** — decides which estimator module consumes the row (`Walls`, `Paver`, `Concrete`, …). |
| `subcategory` | Item-group label (paver + lighting catalogs use this). |
| `sub_category` | Item-group label (selections + catalog importer + price sheets use this). **Two columns, same intent — see §5.1.** |
| `vendor_id` → `subs_vendors.id` | Which vendor supplies this row. `null` = "Unspecified" (House). |
| `unit`, `unit_cost` | The live price and its unit. |
| `sku`, `photo_url`, `description`, `attributes` (jsonb) | Catalog/selection metadata. |
| `show_in_selections` (bool) | Gates the Design → Selections browser and CAD palette (not estimator dropdowns). |
| `sf_per_pallet`, `price_per_lf_vert` | Paver-specific catalog fields. |
| `tenant_id` | Multi-tenant scope (stamped by trigger, enforced by RLS). |

**Unique constraint:** `(tenant_id, name, category)`. This is important: the same product from two different vendors, in the same category, **collides** on that key. Multi-vendor pricing today therefore relies on distinct names or the merge flow — not on the schema.

Supporting tables: `labor_rates` (name/category/rate + coefficients), `subcontractor_rates` (company_name/trade/category/rate), `subs_vendors` (vendors + `supplied_categories text[]`), `material_price_history` (per-item price timeline), `material_categories` (a per-tenant tag vocabulary), `price_sheet_imports` / `invoices` / `invoice_lines` / `job_expenses` (import audit + expenses).

---

## 2. How a material choice is priced — three patterns in use

The modules do **not** share one resolver. Three distinct patterns evolved:

### Pattern A — Name-keyed "House" resolver (+ optional vendor override)
Used by **Walls, Columns, Finishes, Planting, Irrigation.**

Each module ships a hardcoded rate map, e.g.:

```js
const WALL_RATES = { greyBlock: { db: 'Wall Grey Block', fb: 2.59 }, rebar: { db: 'Wall Rebar', fb: 1.399 }, … }
```

and a resolver:

```js
wallMatPrice(dbName, vendorId, materialRows, mp, fallback)
//  1. vendor row: materialRows.find(r => r.name === dbName && r.vendor_id === vendorId).unit_cost
//  2. House price: mp[dbName]           (name-keyed master rate, vendor_id irrelevant)
//  3. hardcoded fallback: fb
```

The **material choice** (block type, finish type, cap type) comes from a **hardcoded list in code**; the **vendor dropdown** only swaps where the material `$` comes from. "House"/"Unspecified" = the original math.

### Pattern B — Subcategory-label catalog
Used by **Concrete, Utilities, Drainage, Fire Pit, Outdoor Kitchen, Ground Treatments, Artificial Turf, Pool (excavation & plumbing section only).**

The dropdown is populated from `material_rates` filtered by `subcategory === '<group>'` and `vendor_id === selectedVendor`, and matched to the chosen Type by stripping a `"<subcategory> - "` prefix off the name. Subcategory groups in use: `Wall Finish`, `Wall Cap`, `Utility Lines`, `Gas Fixtures`, `Electrical Fixtures`, `Drain Pipe`, `Drain Fixtures`, `Concrete Mix`.

### Pattern C — ID-keyed catalog (rename-proof)
Used by **Paver, Steps, Lighting.** Lighting is the cleanest example: no hardcoded fallback map at all, the material choice **is** a `material_rates` row selected by `id`, House = `vendor_id IS NULL`, and the sentinel label is already "Unspecified."

**Takeaway:** Pattern C is the direction the codebase has been evolving toward and is the most robust (survives renames, no name-string coupling). Patterns A and B are legacy weight.

---

## 3. Per-module wiring map

| Module | Hardcoded rate map | Dropdown source | Vendor pricing | Rate editor | Pattern |
|---|---|---|---|---|---|
| Lighting | — | `material_rates` `category=Lighting`, filter by subcategory + vendor | id row → `unit_cost`; House = null vendor | own inline modal | **C** |
| Paver | `MAT_DEFAULTS`, `LABOR_DEFAULTS`, `BASE_RATE_MAP` | id catalog, `category=Paver`, subcat `Paver Material`/`Base Material` | id-match `unit_cost` else House name key | RateEditPopover | **C** (base rock still House) |
| Steps | rate keys (no big map) | id catalog, `category=Steps`, shared `Paver Material`/`Concrete Mix` | id-match `unit_cost` | own Edit-Rates modal | **C** |
| Concrete | `BASE_RATES`, `SUB_FINISH_RATES`, `R` (~20) | hardcoded types + `category=Concrete` vendor rows by subcat | per-row House→map→fallback | RateEditPopover | **B/hybrid** |
| Utilities | `ADD_ITEM_RATES` + type tables | built-in lists + `category=Utilities` subcats | `resolveUtilRow` subcat+label | RateEditPopover | **B** |
| Drainage | `ADD_ITEM_RATES` + type tables | built-in lists + `category=Drainage` subcats | `drainMatCost` subcat+label | RateEditPopover | **B** |
| Fire Pit | `FP_RATES` (~35) + gas | hardcoded + `in(Fire Pit, Utilities)` vendor subcat | `wfVendorPrice` (finish/cap) | RateEditPopover | **B/hybrid** |
| Outdoor Kitchen | `OK_RATES` (~45) + utility tables | hardcoded + `in(Outdoor Kitchen, Utilities)` | `wfVendorPrice` (finishes) | RateEditPopover | **B/hybrid** |
| Ground Treatments | `GT_RATES` (~30) | hardcoded types + `category=Ground Treatments` vendor rows | per-row `resolveType` + vendor subcat | RateEditPopover | **B/hybrid** |
| Artificial Turf | `catDefaults={}` | vendor subcat catalog + `category=Artificial Turf` (+Demo) | `turfMatPrice` subcat catalog | RateEditPopover | **B** |
| Pool | `EXCAVATION_RATES`, `SHOTCRETE_*`, `PLUMBING_BASES` + utility tables | hardcoded equip + `in(Pool, Utilities)`; vendor only for E&P | `resolveUtilRow` (E&P only); structure hardcoded | RateEditPopover | **B (partial)** |
| Walls | `WALL_RATES` (~35) | hardcoded finish/cap + `category=Walls` vendor rows | `wallMatPrice` canonical | RateEditPopover | **A** |
| Columns | `BLOCK_RATES` (8) | hardcoded + `category=Columns` | `colMatPrice` canonical | RateEditPopover | **A** |
| Finishes | `FINISHES_RATES` (~28) | hardcoded types + `category=Finishes` | `finishMatPrice` canonical | RateEditPopover | **A** |
| Planting | plant defaults (name-keyed) | hardcoded plants + `category=Planting` | `plantMatPrice` canonical | RateEditPopover | **A** |
| Irrigation | zone/timer meta + `matFallback` | hardcoded types + `category=Irrigation` | `irrMatPrice` canonical | RateEditPopover | **A** |
| Hand / Skid / Mini Demo | `SUB_RATES`, dump, container | `category=Demo` (name + unit_cost only) | **no vendor** — House-keyed | RateEditPopover | fallback-only |
| Weed Abatement | `R` | `subcontractor_rates` `category=Weed Abatement` | sub-only, no materials | RateEditPopover | n/a |

`RateEditPopover` is used by every module except Lighting and Steps (which have their own inline editors).

---

## 4. Supporting pipelines (how prices get in and stay consistent)

- **Master Rates editor** (`MasterRates.jsx`) — add/edit a row with category, vendor picker (`vendor_id`, blank = Unspecified), sub_category, name, unit, unit_cost, photo. Vendor list excludes the reserved "Unspecified" company. `material_categories` is just a tag vocabulary; the real category→module mapping is in-code (`CATEGORY_MODULES` / `SUBCAT_MODULES`) and only drives display tags.
- **RateEditPopover** — inline single-value editor keyed by `(name + category)`. Self-heals: updates all matching rows, else reassigns a wrong-category row, else inserts. **Inserts do not set `vendor_id` or `show_in_selections`** → popover-created rows are vendor-less and invisible to Selections.
- **Price sheets** (`process-price-sheet` + `PriceSheetImportModal`) — AI-extracts vendor rows, matches to existing `material_rates` for that vendor, and on apply: updates `unit_cost`, closes the prior `material_price_history` period, opens a new one (`source='price_sheet'`), or inserts a new row (with category + vendor_id). Uses the fuzzy matcher + `reconcile-materials` to avoid creating duplicates of a catalog row.
- **Invoices** (`process-invoice` + `InvoiceImportModal`) — AI-extracts invoice lines, matches by vendor, price-checks each against `price_as_of(rate_id, invoice_date)`, flags variances, and posts `job_expenses`. **Read-only against `material_rates`** — an invoice checks price, it doesn't set it.
- **Catalog importer** (`VendorCatalogImportModal.jsx`) — page-by-page AI extraction with photo crops; writes one `material_rates` row per product with `category, sub_category, vendor_id, unit, unit_cost, photo_url, sku, show_in_selections=true`. Also archives the original PDF to `vendor_catalogs`.
- **Reconcile / merge** — `matchScore.js` (fuzzy) + `reconcile-materials` (AI same-product ranking) + `merge_material_rates(keep, drop)` RPC, surfaced in `MergeDuplicatesModal`. Deduplicates the classic split: a **catalog row (photo, no price)** vs a **price-sheet row (price, no photo)** into one record, repointing `material_price_history`, `estimate_modules.data`, and `cad_drawings.data`.
- **Selections + CAD** — both read `material_rates WHERE show_in_selections`. One product record, three "lenses": pricing (Master Rates), photo (catalog), design/spec (selections).

### The two flows that matter

**Add a material → appears in a dropdown:** insert into `material_rates` with `category = X` (+ usually `vendor_id`) → the module for category X re-fetches by category on mount / after any rate edit → the row shows up (choice = the row; vendor dropdown gated by the vendor's `supplied_categories`). `show_in_selections` does **not** gate estimator dropdowns — only category (and vendor tagging) does.

**Vendor changes price → estimate reflects it:** import the vendor's price sheet (or edit the cell) → `unit_cost` updates + a history period is written → open estimates re-read by category on load/refresh and pick up the new price immediately; invoices honor the as-of price via `price_as_of`.

---

## 5. Where the current model hurts

### 5.1 Two subcategory columns
`material_rates` has both `subcategory` (paver, lighting) and `sub_category` (selections, catalog importer, price sheets). They mean the same thing but are populated by different writers, so a row imported by the catalog tool (`sub_category`) is invisible to a paver query that reads `subcategory`, and vice versa. This is the single most confusing part of the schema.

### 5.2 Basic materials have no vendor
Concrete, base/roadbase, sand, rebar, grout, mortar, gravel, DG live inside hardcoded fallback maps (`WALL_RATES`, `BLOCK_RATES`, `MAT_DEFAULTS`, `GT_RATES`, `OK_RATES`, `FP_RATES`, Pool's `SHOTCRETE_*`…). They resolve only to a House name-keyed rate, so **a vendor price change on concrete or rebar cannot propagate** — exactly the gap you called out.

### 5.3 Three resolvers, one job
Patterns A/B/C each re-implement "pick a price." Adding a feature (e.g. per-wall vendors, or as-of pricing in the estimator) means touching every module. Name-string coupling (Pattern A/B) breaks when a product is renamed.

### 5.4 The unique key blocks clean multi-vendor pricing
`(tenant_id, name, category)` means "8x8x16 Grey Block" can exist once per category. Two vendors quoting the same block collide; the workaround is distinct names, which then breaks name-keyed resolution.

### 5.5 Inconsistent gating
Estimator dropdowns gate on `category` + vendor `supplied_categories`; Selections/CAD gate on `show_in_selections`; popover inserts set neither vendor nor the flag. A material can be "in the system" yet invisible in the place you expect.

---

## 6. Recommended recurring model

The goal: **one way to reference a material, one resolver, every priced item is a real row with a vendor, and price lists / rate editors write to the same records.**

### 6.1 Reference materials by `id`, everywhere (generalize Pattern C)
Estimator selections should store the `material_rates.id` (already done in Paver/Steps/Lighting and in `estimate_modules.data`/`cad_drawings.data`, which `merge` repoints). Retire name-string matching. Names become display-only and renameable.

### 6.2 Collapse the taxonomy to one pair: `category` + `subcategory`
Pick **one** column (recommend keeping `sub_category` since Selections/catalog/price-sheet — the growth areas — use it) and migrate the paver/lighting `subcategory` values into it, then drop the loser. `category` = module routing; `sub_category` = item group within a module. One vocabulary, enforced by `material_categories`.

### 6.3 Make every priced material a row — including basics
Create a shared **`Basic Materials`** category (concrete/CY, base/roadbase, sand, rebar, grout, mortar, gravel, DG) as real `material_rates` rows, each with a `vendor_id` (default the Unspecified vendor). Modules that need concrete/rebar/base reference those shared rows by id instead of a hardcoded `fb`. Then a vendor price change on rebar flows into Walls, Columns, Fire Pit, Outdoor Kitchen, Concrete, Pavers at once. The hardcoded fallback maps become **seed data**, not runtime logic.

### 6.4 Support multi-vendor pricing properly
Two options:

- **Interim (low effort):** change the unique key to `(tenant_id, category, sub_category, name, vendor_id)`. Now the same product can exist once per vendor; the resolver picks the row for the selected vendor, falling back to the Unspecified row.
- **Durable (recommended target):** normalize into two tables — a canonical **material/spec** record (what the product is: name, category, sub_category, sku, photo, attributes) and a **material_prices** child (one row per vendor per material: `vendor_id`, `unit`, `unit_cost`, effective dates). `material_price_history` already points this direction. Price sheets/invoices/catalog writes land in `material_prices`; the estimator references the material id and resolves the price for the chosen vendor as-of a date.

### 6.5 One shared resolver + catalog hook
Introduce `useMaterialCatalog(category)` (fetch + cache rows, vendors, price map) and `resolvePrice(materialId, vendorId, asOf?)`, and refactor modules onto it. This replaces `wallMatPrice` / `finishMatPrice` / `colMatPrice` / `plantMatPrice` / `irrMatPrice` / `wfVendorPrice` / `turfMatPrice` / `resolveUtilRow` / `drainMatCost` — nine bespoke resolvers — with one. It also lets you add as-of pricing to the estimator for free.

### 6.6 Reconcile editors and price lists by construction
Because Master Rates, RateEditPopover, price sheets, invoices (check), and catalog import all target the same records (or the same `material_prices` child), reconciliation stops being a special step and becomes the default. Two fixes to close the current gaps: (a) `RateEditPopover` inserts should set `vendor_id` (default Unspecified) and carry `show_in_selections` when appropriate; (b) route everything through the shared taxonomy so nothing lands in the wrong subcategory column.

### 6.7 The recurring "add a material" workflow (target state)
1. Add the product once — via **catalog import**, **price sheet**, or **Master Rates** — as a `material_rates` row with `category`, `sub_category`, `vendor_id`, `unit`, `unit_cost` (+ photo/sku/selections as available).
2. It **auto-appears** in that category's module dropdown, grouped by sub_category, selectable per vendor (vendor gated by `supplied_categories`).
3. A later **price sheet** or **cell edit** updates the price + writes a history period; open estimates recompute on load.
4. Duplicates (catalog photo row vs price-sheet price row) are merged into one record via the reconcile flow.

---

## 7. Suggested migration path (non-breaking, phased)

1. **Schema hygiene** — pick the surviving subcategory column, backfill, drop the other. Add the Unspecified vendor everywhere basic materials will point (already created).
2. **Basic Materials catalog** — seed shared rows for concrete/base/sand/rebar/grout/etc. with `vendor_id = Unspecified`; leave the hardcoded `fb` values as the seed prices so nothing moves on day one.
3. **Shared resolver** — build `useMaterialCatalog` + `resolvePrice`; migrate one module (Lighting is already close) as the reference, then convert the Pattern-A/B modules one at a time. Each conversion is byte-for-byte price-preserving because the seeds equal the old fallbacks.
4. **Multi-vendor** — apply the interim key change, or stand up `material_prices` and repoint the resolver. Do this after the resolver exists so it's a one-place change.
5. **Editor fixes** — make RateEditPopover set `vendor_id`; make catalog/price-sheet/master-rates all write the single taxonomy.

Each phase ships independently and leaves estimates numerically unchanged until you deliberately point a basic material at a real vendor's price.

---

## 8. Appendix — quick reference

**Estimator `category` strings:** `Walls, Columns, Finishes, Planting, Irrigation, Concrete, Paver, Steps, Lighting, Utilities, Drainage, Fire Pit, Outdoor Kitchen, Pool, Ground Treatments, Artificial Turf, Demo` (+ `Weed Abatement` on `subcontractor_rates`). Pool/Fire Pit/Outdoor Kitchen also pull `Utilities`; Artificial Turf also pulls `Demo`.

**Catalog sub-group labels in use:** `Paver Material, Base Material, Concrete Mix, Wall Finish, Wall Cap, Utility Lines, Gas Fixtures, Electrical Fixtures, Drain Pipe, Drain Fixtures` (plus per-vendor label matching in Ground Treatments / Artificial Turf / Lighting).

**Basic materials currently vendor-less (fix targets for §6.3):** concrete (hand/truck/shotcrete), base / Class II roadbase, bedding & joint & poly sand, rebar, grout (hand/pump), mortar/fill, gravel, DG, mulch, sod, excavation, plumbing bases.
