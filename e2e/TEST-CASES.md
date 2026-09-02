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

## env-label.spec.js — staging vs production tab title

- Goal: staging and production get run side by side in separate browser windows, and the
  two are otherwise pixel-identical. The tab title is what actually distinguishes them
  when the windows overlap, so it carries the environment.
- `src/lib/envLabel.js` resolves the Supabase project ref out of `VITE_SUPABASE_URL` and
  compares it to the pinned production ref. Production is identified positively; anything
  else — including an unset or malformed URL — resolves to "staging". A forgotten env flag
  therefore makes a build shout, never makes it impersonate production.
- `main.jsx` stamps `data-env="production" | "staging"` on `<html>` and, when not
  production, prefixes `document.title` with `STAGING — `. The prefix is guarded so an HMR
  re-run can't produce "STAGING — STAGING — SoftCake".
- Test asserts the INVARIANT, not a fixed string, so the one spec is correct in either
  environment: `data-env=production` ⇒ title contains no "STAGING";
  `data-env=staging` ⇒ title starts with "STAGING — ".
- Second case reloads the page and asserts at most one "STAGING" in the title, guarding
  the double-prefix regression directly.
- Staging also gets a 4px hazard-striped bar fixed across the top of the viewport
  (`html[data-env='staging']::before` in `index.css`) — pure CSS, no component to mount.
  It is `position: fixed` so it never shifts layout (staging renders identically to
  production underneath it), `pointer-events: none` so it can never swallow a click,
  z-index 2147483647 because the app already uses 10000 and a warning a modal can cover
  is not a warning, and hidden in `@media print` so a printed bid never carries it.
- Test reads the pseudo-element via `getComputedStyle(el, '::before')`, since a ::before
  is not a locatable DOM node: production asserts `content: none`; staging asserts the bar
  exists, is 4px, fixed, and non-interactive.
- Non-destructive: loads `/` only, reads the title and computed styles, saves nothing.

## send-sms — multi-tenant config + payload alias (production bugs)

- `loadSmsConfig` called `.maybeSingle()` on `company_settings` with NO tenant filter.
  That table holds one row per tenant, so from the moment a second tenant existed the
  query errored with "multiple rows returned" and EVERY SMS failed before a provider was
  chosen. Production has 3 tenants — SMS had been broken there, silently.
- Fix: accept optional `tenant_id`, filter on it, and fall back to the sole row only when
  the table genuinely holds one. With several tenants and no `tenant_id`, fail with a
  message naming the fix rather than guessing whose provider to bill.
- Second bug: `CODetailModal.jsx` and `COEstimatePanel.jsx` posted `{to, body}` while the
  function read `{to, message}` — so even past bug 1 those two sent an undefined message.
  Callers now send `message`; the function also accepts `body` as an alias so older
  callers keep working.
- Verified on staging against the live SimpleTexting account: ambiguous-tenant call errors
  clearly, `body`-key call with `tenant_id` delivered (id 6a973ed1…), non-allowlisted
  number still blocked by the delivery guard.

## SMS callers must pass tenant_id (completes the send-sms fix)

- Fixing `loadSmsConfig` turned a cryptic crash into a clear error, but SMS still could not
  send: NO caller passed `tenant_id`, so every call hit the "ambiguous tenant" branch.
- `notify.js` now resolves the tenant once via `supabase.rpc('my_tenant_id')`, caches it
  (it cannot change without a re-login), and attaches it to every send-sms payload.
  `sendSMS({ to, message, tenantId })` also accepts an explicit override.
- All three inline `fetch('/functions/v1/send-sms')` call sites — two in CODetailModal,
  one in COEstimatePanel — now go through `sendSMS()`. `notify.js` is the single SMS path,
  so no caller can drift on payload shape again. That drift is exactly what produced the
  `{to, body}` vs `{to, message}` bug: one of the three sites built the text into a
  variable named `body` and passed it with shorthand, which a pattern-based fix missed.
- Verified on staging: `my_tenant_id()` returns the DemoScape tenant, that tenant has
  sms_config, and a real message was delivered to the allowlisted number.

## Collections — keyed fragments in CollectionTable

- `/collections` logged React's "Each child in a list should have a unique key" warning on
  every render, which failed `navigation.spec.js` (it asserts a clean console).
- Cause: FOUR `.map()` calls in `CollectionTable` returned a SHORTHAND fragment `<>…</>`
  with `key` props on the fragment's CHILDREN. React keys the mapped element — the
  fragment — so those keys did nothing and the fragment itself was keyless. A grep for
  "map without a nearby key=" finds nothing here, which is why it hid for so long: the
  keys are present, just on the wrong element.
- `<>` cannot take a key; `<Fragment>` can. All four now return
  `<Fragment key={…}>`, and the meaningless child keys were removed. The manager grouping
  keys on `'mgr-' + (manager || 'unassigned')` so an empty manager name cannot collide.
- Two other fragments in the same component (lines ~2099, ~2133) are conditional branches,
  not list items, and correctly need no key.
- Impact was cosmetic — DAYS is fixed-length and fixed-order, so React's index fallback
  reconciled correctly and no user ever saw a defect. The real cost was the console noise
  masking genuine errors on that page.
- Verified: navigation.spec.js Collections case passes; full navigation suite 9/9 green.

## COEstimatePanel — release lifecycle wired up (completing cd2f7aa7)

- Commit cd2f7aa7 (2026-06-12) built the full change-order release lifecycle for the
  ESTIMATOR panel — `handleNotifySend`, `handleUnrelease`, `handleDeleteCO`,
  `handlePrintCO`, the `notifyMode`/`lifecycleBusy`/`isReleased` state, and an import of
  the shared `CONotifyDialog` — but never added the buttons. All four handlers sat
  unreferenced for three months, so a change order could be released, resent, unreleased,
  deleted and printed when opened from the jobs list (CODetailModal) but NOT when opened
  in the estimator, even though the code to do it existed.
- Now wired: 📤 Release (unreleased only), Resend + Unrelease (released only), 🖨️ Print and
  Delete (any saved CO), all disabled while `lifecycleBusy`. Status gating mirrors
  CODetailModal so the two screens behave identically. `CONotifyDialog` is now mounted.
- Lint on the file went from 7 unused symbols to 1 (an unrelated `projectSubRates`),
  which is the mechanical confirmation that the previously-dead code is now reachable.
- NOT yet exercised in a browser: reaching the panel is a deep path (JobsList → job → CO →
  estimator view) and the selectors need a real DOM to harden against. Verify manually by
  opening an estimator-built change order and confirming the buttons appear and gate by
  status; then this becomes a spec.

## CODetailModal — removed the superseded email/text handlers

- `handleEmail` and `handleText` (added 2026-05-13, "Change Orders rebuild … print/email/text")
  were replaced a month later by the shared `CONotifyDialog` flow in cd2f7aa7, but left in
  place. Both were unreferenced — no button, no caller — for three months.
- They mattered because `handleText` was one of the three call sites carrying the
  `{to, body}` vs `{to, message}` payload bug. It survived precisely BECAUSE it was
  unreachable: nobody could trigger it, so nobody saw the failure. Dead code is where bugs
  go to hide from testing.
- Removed 56 lines. Lint on the file is now 0 errors / 0 unused symbols.
- NOT touched: `WorkOrders.jsx` has its own `handleEmail`/`handleText`, both wired to real
  buttons. Same names, different component, still live.

## Change-order notification — per-channel outcome reporting

- Two silent-failure bugs in `sendClientNotification`, in BOTH CODetailModal and
  COEstimatePanel:
  1. **Missing contact was skipped silently.** The send was guarded by
     `if ((method === 'text' || method === 'both') && cell)`. With method "both" and only
     an email on file, the email went, `sent` was non-zero, and NOTHING said the text never
     did. The user reasonably assumed the client was reached both ways.
  2. **Failures were counted as successes.** CODetailModal pushed `res.ok` into a `results`
     array it only ever checked the LENGTH of; COEstimatePanel incremented `sent` without
     looking at the response at all. A 500 from send-email reported success.
- Both now track each requested channel separately and return `{ sent, problems }`:
  no contact on file → "no mobile number on file for this client"; a failed send →
  "text failed (<reason>)". Nothing sent at all still throws, now naming every reason.
- `handleNotifySend` surfaces partial failures after the release completes — `setError`
  in CODetailModal, `alert` in COEstimatePanel — so a release still succeeds but the user
  is told which channel did not go.
- This is the bug that cost real debugging time on 2026-09-01: a change-order release
  reported success while no SMS was sent, and there was no way to tell from the UI whether
  the client had no mobile, the function errored, or the message was simply lost.
