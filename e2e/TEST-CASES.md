# End-to-end test cases

The living catalog of what the Playwright suite checks, plus the review loop. Claude
maintains this file; Brian runs the suite.

## The loop (after every code edit)

1. **Claude** makes the code change **and** writes/updates the matching test case
   here + in `e2e/`.
2. **Brian** waits for Vercel to finish deploying `master`, then runs:
   ```
   npm run test:e2e
   ```
3. The run writes machine-readable results to **`test-results/results.json`** (plus
   an HTML report: `npm run test:e2e:report`).
4. **Brian** says "ran it." **Claude** reads `test-results/results.json`, records the
   outcome in `e2e/TEST-RESULTS.md`, and reports: what passed, what failed (with the
   failing request/URL or assertion), and the proposed next fix.
5. Repeat.

Config + credentials are env-driven in `.env` (never committed):
`BASE_URL`, `TEST_USER_EMAIL`, `TEST_USER_PASSWORD`, `TEST_ESTIMATE_URL`.

**Prod safety:** the suite is NON-DESTRUCTIVE — it loads, navigates, reads, and may
enter estimator values but NEVER saves. No user creation (real emails/SMS), no
deletes, no rate edits, no SQL.

## Cases

### `auth.setup.js`
- **authenticate** — logs in with env creds, saves the session for all other specs.

### `smoke.spec.js`
- **dashboard loads without console errors** — `/` renders logged-in; zero console
  or failed-request errors on load.

### `navigation.spec.js` — each route loads with no console/HTTP error
- Dashboard `/`, Jobs `/jobs`, Bids `/bids`, Tracker `/tracker`, Collections
  `/collections`, Statistics `/statistics`, Master Rates `/master-rates`, Admin
  `/admin`. (Caught the real `/tracker` 400 — `id=eq.undefined` — now fixed.)

### `security.spec.js` — audit-hardening regressions (NON-DESTRUCTIVE)
- **return_to=<payload> does not leave the origin** — four payloads (`//example.com`,
  `/\example.com`, `https://example.com`, `javascript:alert(1)`) against
  `TEST_ESTIMATE_URL`; each must stay on the app origin. Guards the
  `safeInternalPath()` fix for the open redirect at `EstimateDetail.jsx:100`.
  Only the load half is exercised — the redirect fires after a change-order bid
  is created, which the suite must never do against prod.
- **e-documents list renders a PDF preview** — `/edocuments` paints a `<canvas>`
  (or reports an empty list). Regression guard for `isEvalSupported: false`
  (GHSA-wgrm-67xf-hhpq) breaking pdf.js font/CMap rendering.

### `code-changes.spec.js` — Admin → Code Changes (the git-history tab)
- **tab opens and lists code changes** — heading + rows (or the "run the SQL"
  notice), plus a total count.
- **search filters the list** — typing "Fire Pit" narrows results (inputs are
  readonly-until-focus, so the test clicks first).

### `estimator.spec.js` — requires `TEST_ESTIMATE_URL` (skips if unset)
- **estimate opens without console errors** — the estimate at `TEST_ESTIMATE_URL`
  loads clean; attaches a full-page screenshot for selector work.
- **Fire Pit module renders if present** — asserts the Fire Pit section shows when
  the estimate has one.

### `fire-pit.spec.js` — requires `TEST_ESTIMATE_URL` (opens the module editor)
Reproduces the bugs hand-testing caught that injected-value unit tests can't see.
NON-DESTRUCTIVE (opens the editor, enters values, never saves). Round-1 selectors
are text/section-based; the attached screenshots harden them after the first run.
- **module editor opens with Gas Line + Trenching + Gas Fixtures sections** — the
  three sections render; no console/HTTP errors.
- **Gas Line Type dropdown is populated** — the picker has >1 option (catches the
  empty-picker bug from the `Utility Lines` → `Gas Pipe` subcategory mismatch).
- **Trenching row computes non-zero hours** — filling LF/Width/Depth on the new
  Trenching section yields an Est. Hrs value (shared math with Utilities).
- **wall finishes resolve a price** — picking a finish shows NO unpriced /
  "labor rate needed" banner.
- **exhaustive: every dropdown option resolves** — walks every option of every
  `<select>` in the editor (finish types, cap types, gas pipes, gas fixtures,
  vendors, trench method); none may trigger an unpriced prompt.
- **exhaustive: every structure type tab** — CMU / Poured in Place / Modular /
  Brick each price with no unpriced prompt.
- **exhaustive: numeric fields** — fill every numeric input; a $ total renders and
  no unpriced prompt appears.
- **exhaustive: Subcontractor tab** — renders + prices with no unpriced prompt.
  (All 4 core Fire Pit checks GREEN on prod 2026-08-20; exhaustive set added next.)

## Calc unit tests (`node --test`, run by Claude in seconds — no prod, no network)

Run: `npm run test:unit`. These lock pure calc logic directly, sidestepping the
frozen-rate-snapshot ambiguity of saved-estimate E2E.

### `firePitCalc.test.mjs` — LOCKED 2026-08-19 (goal met, red→green verified)
- Built-in Precast cap → material AND labor both non-zero.
- Vendor cap via the Master-Rates default-labor pointer → material AND labor both
  non-zero (THE fix we chased).
- Vendor cap with no labor configured → 0 labor + unpriced flag (never a silent
  fallback).
- Vendor price overrides the house unit for material.
- Built-in Smooth Stucco finish → material AND labor both non-zero.
- `resolveLabor` priority: numeric coeff > default-labor pointer > 0.

## Backlog (not yet written)
- Walls Modular: block math renders; a dimensionless product surfaces $0, not 8x8x16.
- E2E (interactive) Fire Pit cap+finish on a BLANK estimate: Add module → pick Fire
  Pit → in the modal enter a cap + finish → the row cell shows `$… · …h`. (Brian's
  flow; needs the editor-modal DOM from a run screenshot.)

### `walls.spec.js` — requires `TEST_ESTIMATE_URL` (the live-browser layer for Walls)
Unit math is locked by wallsCalc/wallsSections/wallsStruct .test.mjs (65 tests); this
is the exhaustive UI layer. NON-DESTRUCTIVE. Uses shared helpers.openModule/sectionSelect.
- **editor opens with wall-type tabs** — mounts; a CMU/PIP/Modular/Brick/Timber tab renders; console/HTTP clean.
- **every Type dropdown populated** — every `<select>` has >1 option.
- **exhaustive: every dropdown option** — cycle every non-vendor option → no NaN/Infinity, no console/HTTP errors (in-page scan).
- **exhaustive: every wall-type tab** — CMU/PIP/Modular/Brick/Timber each compute without NaN (poll for stable render).
- **exhaustive: numeric fields** — fill every input → `$` total renders, no unpriced prompt.
- **Subcontractor tab** — renders + prices, no unpriced prompt.
- **live edit reflects** — change a field in-browser → on-page totals change (Goal 4 end-to-end).

### `hand-demo.spec.js` — requires `TEST_ESTIMATE_URL` (Hand Demo live-browser layer)
Demos: few dropdowns, mostly numeric inputs + an In-House↔Subcontractor toggle (no
type tabs). NON-DESTRUCTIVE. Uses shared helpers.openModule/scanEveryOptionForNaN.
- **editor opens with demo sections** — Job Site Conditions / Hauling / Shrub / Stump render; console/HTTP clean.
- **any dropdown populated** — each `<select>` has >1 option.
- **exhaustive: every dropdown option** — no NaN/Infinity, no console/HTTP errors.
- **numeric fields** — fill every input → `$` total renders, no unpriced prompt.
- **In-House and Subcontractor both price** — toggle each crew mode → no NaN, pricing shows.
- **live edit reflects** — change a field → on-page totals change (Goal 4 end-to-end).

### fire-pit.spec.js — added guard (2026-08-20)
- **wall finish resolves nonzero material $ AND nonzero labor hrs** — picks a real finish,
  enters SF, asserts the finish table shows BOTH a nonzero `$` and a nonzero `x.xx` hrs.
  Catches the fetch-scope bug (finish labor = 0 hrs when the module omits the Finishes
  category from its labor query) that "no unpriced banner" alone missed.

## Columns (columns.spec.js)
- opens with type tabs; every picker populated
- finishes available on CMU tab (not PIP-only) + resolve (no unpriced)
- exhaustive vendor × item matrix on every type tab; every-tab NaN check
- numeric fields → total; Sub tab prices; live edit moves total

## Outdoor Kitchen (outdoor-kitchen.spec.js)
- opens with Wall Finishes section; every picker populated
- shared wall finish resolves (no unpriced)
- exhaustive vendor × item matrix (In-House + Sub); numeric → total; Sub prices; live edit

## Irrigation (irrigation.spec.js)
- opens with Zone / Timer sections; zone + timer pickers populated
- exhaustive zone/timer × vendor matrix (In-House + Sub); every-option NaN check
- numeric fields → total; Sub tab prices; live edit moves total
- unit layer (irrigationCalc.test.mjs, 8): zone labor value/edit-reflects, Trench-vs-Hand
  independence, timer labor, unset-rate→0, unpriced-BOM→`missing`+$0, Sub-tab 0-labor

## Lighting (lighting.spec.js)
- opens with Fixture / Transformer / Wire sections; vendor + item pickers populated
- exhaustive vendor × item matrix (In-House + Sub); every-option NaN check
- numeric fields → total; Sub tab prices (flat $/each); live edit moves total
- unit layer (lightingCalc.test.mjs, 8): item-driven labor value/edit-reflects, material +
  watts/VA, 15% markup, unset-item-labor→0+laborUnset, fixture-vs-wire independence, Sub 0-labor

## Steps (steps.spec.js)
- opens with Paver / Brick / Tiled / Flagstone / Concrete Steps sections; vendor + Type pickers populated
- exhaustive vendor × Type matrix (In-House + Sub); every-option NaN check
- numeric fields → total; Sub tab prices (flat $/Ln Ft); live edit (Hours Adj) moves total
- unit layer (stepsCalc.test.mjs, 7): paver form labor value/edit-reflects (SF × form rate) +
  material (SF × item price, pallets), concrete type+finish+form value/edit-reflects, material
  NO-FALLBACK (unresolved catalog item → $0, labor still priced), Sub flat $/LF independence, no-NaN
- coverage manifest: `npm run test:steps-coverage` (11 labor + 9 concrete material + 17 sub $/LF + 4 catalog sub_categories)

## Planting (planting.spec.js)
- opens with Small Plants / Large Plants / Planting Add-Ons / Till sections; vendor + Item pickers populated
- exhaustive vendor × Item matrix (In-House + Sub); every-option NaN check
- numeric fields → total; Sub tab prices (flat $/unit); live edit (Hours Adj) moves total
- unit layer (plantingCalc.test.mjs, 7): item-driven plant labor value/edit-reflects (qty × per-plant rate) +
  material (qty × price), add-on perDay labor + material, LABOR NO-FALLBACK (unset plant rate → 0 hrs + 0 material
  guard + laborUnset flag), till guarded (any unset till rate → 0), Sub flat $/unit independence, no-NaN
- coverage manifest: `npm run test:planting-coverage` (8 name-keyed labor + item-driven per-plant labor + 8 add-on materials)

## Weed Abatement (weed-abatement.spec.js)
- opens with Area Type + Flat/Hillside Area + Number of Visits fields (no vendor catalog)
- every Area Type mode (Flat/Hillside/Mixed) computes without NaN — In-House value path (ReferenceError regression guard)
- numeric fields → total; In-House + Sub both render without NaN; live edit (Sub $/SF) moves total (DB-independent)
- unit layer (weedCalc.test.mjs, 6): In-House value (throws-before/green-after flatPer1k/hillPer1k
  ReferenceError fix), edit-reflects, Area-Type mode independence, unset-rate NO-FALLBACK → 0, Sub strict
  $/SF independence, no-NaN
- coverage manifest: `npm run test:weed-coverage` (3 labor coefficients + 1 material $/1k SF)

## Finishes (finishes.spec.js)
- opens with Flatwork / Wall Caps / Wall Finishes sections; vendor + Type pickers populated
- exhaustive vendor × Type matrix (In-House + Sub); every-option NaN check
- numeric fields → total; In-House + Sub both render; live edit (Hours Adj) moves total
- unit layer (finishesCalc.test.mjs, 8): flatwork value/edit-reflects (SF × $/SF + labor), cap qty×$/ea,
  wall Ledgerstone composite (×1.1 + screws), vendor-first material override, material NO-FALLBACK,
  Sub flat $/unit independence, no-NaN
- coverage manifest: `npm run test:finishes-coverage` (17 material/consumable + 15 labor rates)

## Artificial Turf (artificial-turf.spec.js)
- opens with Demo / Turf Prep / Turf Installation / Strips sections; vendor + Type/brand pickers populated
- exhaustive vendor × Type matrix (In-House + Sub); every-option NaN check
- numeric fields → total; In-House + Sub both render; live edit (Hours Adj, In-House toggle) moves total
- unit layer (artificialTurfCalc.test.mjs, 8): turf roll value/edit-reflects (edgeLF×width×rate, ×$/SF),
  demo tonnage (SF/divisor×in → hrs×rate, ×dump fee), base Gravel Cu-Yd qty + labor, vendor-first base
  price override, material NO-FALLBACK (unpriced brand/unset divisor → $0), Sub flat $/SF (base suppressed,
  0 labor) independence, no-NaN
- coverage manifest: `npm run test:turf-coverage` (7 labor + 14 misc + 3 dump fees + 2 sub rates + base/turf catalog)

## Ground Treatments (ground-treatments.spec.js)
- opens with Mulch / Edging / Gravel / DG / Steppers / Sod / Cobbles sections; vendor + Type pickers populated
- exhaustive vendor × Type matrix (In-House + Sub); every-option NaN check
- numeric fields → total; In-House + Sub both render; live edit (Hours Adj, In-House toggle) moves total
- unit layer (groundTreatmentsCalc.test.mjs, 10): mulch CY value/edit-reflects (+ delivery), edging metal-vs-plastic
  labor independence, planter prep + tilling, sod + fertilizer bags (ceil), DG Cu-Yd × markup, gravel excavation,
  material NO-FALLBACK, Sub flat $/SF-$/LF independence, no-NaN
- coverage manifest: `npm run test:gt-coverage` (14 material + 18 labor + 9 'GT -' coeffs + 9 sub rates + 10 catalog sub_categories)

## Pool (pool.spec.js)
- opens with Structure Dimensions / Excavation / Shotcrete / Waterline Tile / Water Features / Spillways / Equipment sections; pickers populated
- exhaustive vendor × item matrix (In-House + Sub); every-option NaN check
- numeric fields → total; In-House + Sub both render; live edit (Hours Adj, In-House toggle) moves total
- unit layer (poolCalc.test.mjs, 8): excavation CY volume + In-House hrs value/edit-reflects, excavation Sub ($/CY × volume),
  water features (qty × item labor + qty × item unit_cost, vendor catalog), material NO-FALLBACK (unpriced feature → $0/0hrs),
  excavation NO-FALLBACK (unset equip rate → 0 hrs), Sub-tab in-house hours → 0, no-NaN
- coverage manifest: `npm run test:pool-coverage` (7 excavation labor + 8 misc coeffs + 9 sub rates + item-driven tile/coping/spillway/raised/water-feature/utilities/equipment)

## M7 material ref_key regression (m7-refkey.spec.js)
- Proves the M7 change — every module reads a built-in material's Standard price by its
  frozen ref_key (MAT-NNN) first, name fallback — did not break pricing anywhere.
- Per converted module (Finishes, Columns, Concrete, Planting, Drainage, Ground Treatments,
  Outdoor Kitchen, Fire Pit, Walls, Irrigation): opens the editor and walks the FULL
  vendor × Type matrix (Standard + every real vendor × every item) in both crew modes via
  the shared scanEveryOptionForNaN helper; asserts zero NaN/Infinity and zero console/HTTP
  error. A mis-wired ref_key resolves undefined → the row goes $0/NaN, which this catches.
- Modules not on TEST_ESTIMATE_URL are skipped (not failed) with a row-titles diagnostic.
- FOLLOW-UP after run 1: harden a $0-specific View-Rates assertion from the real DOM for the
  highest-value converted materials (rebar, concrete, the 7 shared finishes, timers).

## View Rates coverage (pavers.spec.js + concrete.spec.js)
- Regression guarded: a Base-Prep-only `rateScope` flips buildViewRates into scope-only
  mode and silently drops the module's OWN category (all materials + labor) from View
  Rates, while the module still prices correctly (calc reads the rate map directly). Every
  NaN / total-moves / opens test stayed green — the gap was ONLY in the View Rates popup.
- Pavers: opens the editor, clicks "View Rates", and asserts (scoped to the popup) that a
  paver MATERIAL row (Class II Roadbase / Bedding Sand / Base Rock) AND a paver LABOR row
  (Install / Straight Cut / Curved Cut / Restraint / Sealer / Soldier) are present — not
  just the borrowed Base Prep rows.
- Concrete: same shape — asserts a concrete MATERIAL row (Class II Roadbase / Ready Mix /
  Hand Mix / Rebar) AND a concrete LABOR row (Install / Rebar / Form / Sleeve / Vapor /
  Sealer / Finish) show in the popup.
- Fix: PaverModule → PAVER_RATE_SCOPE, ConcreteModule → CONCRETE_RATE_SCOPE (full own
  category + borrowed shared subs + Base Prep), mirroring WALLS_RATE_SCOPE. FirePit + the
  3 demos were audited and already carry complete own-category scopes.
