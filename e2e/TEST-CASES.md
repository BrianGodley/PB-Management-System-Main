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

## agent-chat — prompt caching on Sam's static prefix

- Sam re-sent its full static prefix — the ~30KB persona plus 17 tool schemas, 11,564 tokens
  measured — at the full input rate on EVERY call, and a single user question costs three
  LLM calls (the tool-use loop), so the prefix was billed three times per question.
- `callLLM` now sends `system` as a content-block array with
  `cache_control: {type: 'ephemeral'}`. Caching is a prefix match in render order
  tools → system → messages, so one breakpoint on the system block covers the tool schemas
  too; the conversation sits after it and is billed normally.
- Every call now logs `[llm] <model> in= out= cache_write= cache_read=` so cache health is
  visible in the function logs without extra tooling.
- Verified on staging by signing in and asking Sam a question twice: first call
  cache_write=11564 / cache_read=0, all five subsequent calls cache_read=11564.
- FRAGILE BY DESIGN: the prefix must be byte-identical between calls. Anything per-request
  interpolated into `system` upstream — a timestamp, a user id, a tenant name — silently
  drops the hit rate to zero with no error. `cache_read_input_tokens` staying 0 across
  repeated calls is the signal.

## Estimator summary bar — four groups, Materials as its own vertical

- The estimate/project summary bar (`GpmdBar`, `variant='full'`) was three groups:
  In House / Subcontractor / Totals, with Materials sitting inside In-House. Labour
  profit and material profit were therefore blended into one number.
- Now four groups: **In House Labor** (labour hours · man days · crew labor · burden ·
  GPMD · GP), **Subcontractor** (sub cost · markup · GP), **Materials** (material cost ·
  markup · GP — mirrors Sub), **Totals** (unchanged). In-House flex 7 → 6; cell padding
  px-2 → px-1 so four groups fit the width three used to have.
- `e2e/estimator.spec.js` asserts all four headings by exact string, that Materials does
  NOT appear inside the In-House group, and that the Materials group carries cost, Markup
  and Gross Profit.
- NO-FALLBACK: `materialMarkupRate` has no default. Unset renders "—", never "0%" — a
  second case asserts this, since a constant default here would silently invent profit.
- OPEN: nothing in the codebase computes a material gross profit today, and only Lighting
  has a material markup at all (`misc_rates` → 'Lighting - Material Markup'), where it is
  baked INTO the material figure (`totalMat = markedUpMat + manMat`) rather than tracked
  separately. Until the rate source is decided the Materials group renders "—" for markup
  and GP. Totals still read `effectiveGp + subGp` — material GP is deliberately not added.

## Materials markup — editable per project, 0% default, GLPMD rename

- `estimate_projects.material_gp_markup_rate numeric default 0` added (staging + prod).
  Mirrors `sub_gp_markup_rate`; the save path spreads the project object, so it persists
  with no change to the insert code.
- `recalcModuleFinancials(mod, gpmd, subMarkup, matMarkup)` now computes
  `matGp = material_cost × matMarkup` and folds it into BOTH the commission base and the
  total price, exactly as sub GP is folded in. Default 0 means an estimate nobody has set
  a material markup on prices identically to before the field existed.
- `saveProjectMaterialRate` cascades the rate to every module in the project, the same
  way `saveProjectSubRate` does. Estimate-level bar shows the blended derived rate
  (read-only); project-level bar is editable.
- Display changes: material markup defaults to **0%** and shows `0%` / `$0` rather than a
  dash — 0% is a deliberate state (materials sold at cost), not a missing rate. Gross
  Profit is green in all three profit groups. GPMD renamed **GLPMD** and restyled light
  yellow; Total Price took the blue GLPMD gave up.
- Specs: four-group layout, 0%/$0 defaults, GLPMD rename (asserts no bare "GPMD" remains),
  green gross profit in each group.

## Module bars — two bars per tab, and the dropped-props bug

- Every module's summary bar was ONE flat row. It is now two unlabelled bars, matching the
  estimate bar's shape. No group headings: the tab already says which side of the job it is.
  - In-House: `[ Labor Hours · Man Days · Crew Labor · Labor Burden · GLPMD · Gross Profit ]`
    then `[ Materials · Gross Profit · TOTAL PRICE ]`
  - Sub: `[ Sub Cost · Markup · Gross Profit ]` then `[ Commission · TOTAL PRICE ]`
- BUG FIXED: all 20 modules passed `gp`, `commission` and `price`, but GpmdBar only accepts
  `directGp` / `directCommission` / `directPrice`. All three were silently dropped, so
  **Commission read $0 on every module bar and TOTAL PRICE was understated by the
  commission**. Renamed at all 20 call sites; the bar now shows the module's own figures.
- `materialMarkupRate` is threaded through all 20 modules so the second in-house bar can
  show material gross profit. 15 modules take it via `useState(initialData?…)`; HandDemo,
  MiniSkidSteer, SkidSteer and Steps derive it as a const beside their existing
  `subGpMarkupRate` const; Pool reads it from `state`.
- Removed as dead code once both variants returned early: the flat `cols` layout, the
  `SubGpCol` amber box, and the mobile More/Less `expanded` state (both bars now stack on
  narrow screens the way the estimate bar does).

## TOTAL PRICE box, no module commission, Labor Cost rename

- TOTAL PRICE moved from a plain column into its own **green box**, matching the yellow
  GLPMD and orange Markup boxes. Read-only in all three places it renders — it is the sum
  of the columns to its left, never typed.
- **Commission removed from the module bars.** It stays on the estimate/project Totals
  group, where whole-job commission is meaningful. It is still inside `effectivePrice`, so
  removing the column does not change what TOTAL PRICE reports.
- **"Crew Labor" renamed "Labor Cost"** in every bar — estimate, project and module.

## Boxed figures — GLPMD, Gross Profit, Price

- Every derived figure is now a coloured box rather than a plain column, so the bar reads
  as inputs (plain columns) vs outputs (boxes):
  - **GLPMD** yellow, editable · **Markup** orange, editable
  - **Gross Profit** green, read-only — all four: in house, sub, materials, total
  - **Price** blue, read-only
- "TOTAL PRICE" reverted to sentence case and shortened to **"Price"**.
- Spec note: the boxed value carries `text-green-200` inside a green border, NOT the old
  `text-green-400` plain-cell class — the green-profit test asserts the new class.

## Job profit tracking — the PM completion grid and produced GP

- `module_completion` (job, module, date, cumulative %) added to staging, with the standard
  `tenant_isolation` policy + `set_tenant_id()` trigger and a unique index on
  (module, date) so a correction updates the reading rather than adding a second.
  `company_settings.overtime_multiplier` added (default 1.5).
- `src/lib/jobProfit.js` holds all the arithmetic as pure functions so the cross-job PM grid
  can reuse it. 28 unit tests in `jobProfit.test.mjs`, including the design doc's six-module
  table reproduced verbatim — if those numbers move, the formula changed and the doc is stale.
- `JobTracker` rebuilt. It previously read the legacy projects → modules → actual_entries
  tables (0 modules, 0 entries in production) and rendered an empty shell; it now reads the
  real estimate model via `jobs.estimate_id` and is where the PM enters percent complete.
- GUARD FOUND BY A FAILING TEST: with completion entered and NO hours clocked, the raw
  formula books the entire unspent budget as a favourable variance — a job nobody clocked
  into looks like the most profitable on the board. `laborDataMissing` now suppresses the
  variance and the page says why. `laborCoverage` flags the weaker partial-data version of
  the same hazard below 60%.
- NO-FALLBACK: `resolveRates` returns null unless BOTH `avg_hourly_crew_rate` and
  `overtime_multiplier` are set; the page shows a fix-it banner instead of a number.
- Module-level cost variance uses the work-order chain (time entry → employee → crew →
  schedule item → work_order_ids → module). Hours it cannot resolve are reported as
  unattributed, never apportioned silently; a crew on several modules in one day splits
  evenly and the row is flagged `apportioned`.
- Removed `GPSummaryCard.jsx` and `ModuleTrackerRow.jsx`, orphaned by the rebuild.

## Seeded end-to-end profit jobs (staging only)

- `scripts/seed-test-jobs.py` creates 15 clients Test Tester1–15, each with a sold estimate
  (2 projects × 3 modules of different types), a job, 6 work orders each with a crew, 6
  schedule items, time entries for every crew member every day, and uneven daily completion
  readings landing on 100%. Split 5/5/5 across finishing faster / on estimate / over.
  Guards the staging project ref, scoped to `^Test Tester[0-9]+$`, and re-runnable.
- `scripts/report-test-jobs.mjs` runs the SHIPPED `src/lib/jobProfit.js` over that data and
  asserts nine properties. Importing the real engine is the point — a green report is
  evidence about the code that runs in the app, not a reimplementation.
- Two failures on the first run were BOTH seeding faults, not engine faults, and are worth
  recording: time entries of 07:00–16:00 are NINE hours, so every ordinary day generated
  8 standard + 1 overtime and inflated cost on all 15 jobs; and `round(man_days / crew_size)`
  biased every job upward to whole crew-days. Fixed by an 8-hour day (07:00–15:00) and by
  shortening the final day so total man-days hit the scenario target.
- Result: faster jobs return +$1,544 to +$2,036 over GLPE, on-estimate jobs land within
  0.1%, over jobs return −$2,902 to −$3,634, GLPMDA spans $224–$734 against GLPMDE of
  $400–$550, and 100% of hours resolve to a module through the work order chain.

## Tracker navigation — a peer tab, not a detour

- The Tracker was reachable only from a green "Open Job Tracker" button above the job's tab
  strip, so it read as a side trip and was easy to miss entirely.
- `components/JobTabs.jsx` is now shared by the job page and the tracker:
  `🏗 Projects · 📋 Change Orders · 📊 Tracker · 📁 Documents`. Tracker keeps its own route
  (a PM opens and links to it directly); the other three are in-page panels, addressable as
  `?tab=<key>` so a tab is linkable from the tracker and survives a refresh.
- The redundant green button is gone — one discoverable path, not two.

## Tracking tab — real gross profit, and the PM completion grid

- The Tracking tab (`JobComparison`) is the job workspace people actually use. Two other job
  views existed — `pages/JobDetail.jsx` (`/jobs/:id`) and `pages/JobTracker.jsx`
  (`/jobs/:id/tracker`) — both reading the legacy `projects`/`modules` tables that hold 0
  modules in production. Both are DELETED, along with their routes, the "Full View" and
  tracker buttons on the job header, and `JobTabs`. `NewJob` now redirects to `/jobs`.
- BUG FIXED, and it was a big one: the Gross Profit card computed `revenue − cost` with
  actual material cost taken from linked bills. With no bills linked it booked the ENTIRE
  unspent material budget as profit. Test Tester1 reported $65,269 actual against $38,166
  estimated on a job that used MORE labour than estimated — overstated by $30,011, exactly
  the material budget. Median bill lag is 8 days and the 90th percentile is 308, so nearly
  every open job was affected.
- The card now shows gross profit PRODUCED from `lib/jobProfit.js` — labour + sub only,
  driven by completion readings and the timeclock — with GLPMDE → GLPMDA underneath.
  Materials are deliberately excluded: material profit is only knowable when the last bill
  lands.
- SECOND BUG, caught on the screenshot: the card compared a labour-only estimate against a
  labour+sub actual, inventing a gain equal to the sub GP. Tester1 read +$5,571 when the
  real figure is +$1,763. Both sides now count the same things.
- Man Days "actual" was SCHEDULED man-days; it now reports clocked (30.4 vs the 39
  scheduled for Tester1), with scheduled and overtime shown underneath.
- `ModuleCompletionGrid` is mounted in the tab: a row per module, Sun–Sat columns, cumulative
  percent entry, plus Complete % and GP earned per module. A "Jump to first entry" button
  goes to the first week with readings, since a job that ran last month opens on an empty
  current week otherwise.

## Tracking KPI cards — matching rates, matching man-days, and "not yet known"

- LABOR COST compared unlike things on each side. Estimated came from
  `work_orders.labor_cost` (man-days × `avg_hourly_crew_rate` × 8 = $253.20/MD); actual used
  `labor_rate_per_man_day` ($317.36/MD, a separate setting 25% higher) multiplied by
  SCHEDULED man-days rather than clocked. Test Tester1 read $12,377 actual (39 MD × $317.36)
  against $9,470 estimated — a 31% overrun reported on a job that finished early and under
  budget. Actual is now `profit.rlc`: clocked hours at the same burdened rate the estimate
  uses, with overtime at the multiplier. Tester1 now reads $7,707.
- MATERIAL COST showed $0 actual when no bills are linked, which reads as "we spent nothing"
  rather than "we have not been billed". `KpiCard` gained an `unknown` state rendering
  "not yet known"; material uses it whenever `bills.length === 0`.
- Tester1's four cards now tell one coherent story: 37.4 → 30.4 MD, $9,470 → $7,707 labour,
  material not yet known, $24,378 → $26,141 profit at $550 → $734/MD. The arithmetic ties:
  $20,570 earned + $1,763 labour saved + $3,808 sub = $26,141.

## Completion progression + 5 in-progress jobs to enter against

- The grid now shows PROGRESSION, not isolated percentages. Each entered cell carries the
  day's gain beneath it (+5%, +16%), and a **Job total** row sums every module's cumulative
  reading weighted by estimated profit — the same weighting the engine uses, so the row
  reaches 100% exactly when the job does. `cumAt()` reads the latest entry on or before a
  date, so a module worked Monday and idle Tuesday still stands at Monday's figure.
- `scripts/seed-inprogress-jobs.py` seeds Test Active1–5, deliberately UNFINISHED, running
  from ~2 weeks ago to today so the grid opens on live data. Five shapes: sequential with
  two done · just started · all six overlapping · nearly finished · stalled mid-job. Each
  carries a labour efficiency (0.88–1.30) so the five read differently.
- SEED BUG worth recording: the first version gave every overlapping module a full crew for
  the whole window, so Active3 burned 106 man-days against 44.2 estimated on a job a third
  complete and reported −$16,232 profit. Arithmetically correct, uselessly unrealistic.
  Hours are now derived from completion: `emd × 8 × (pct/100) × efficiency`.
- Modules at `None` get no readings and no hours at all — "never started" rather than a
  stored zero.

## Completion grid — the week navigator stops at the sold date

- A job cannot have progress before it existed, so the week containing `jobs.sold_date` is
  the floor. Prev is disabled there and the range label reads "job sold this week"; the
  button says why on hover rather than silently doing nothing.
- `sold_date` is the field to use: 220 of 221 active jobs carry it, against 24 for
  `actual_start`. Falls back projected_start → actual_start → created_at, and imposes no
  floor at all when none of them exist.
- `shift()` CLAMPS to the floor rather than ignoring the click, so a jump from two weeks out
  still lands on the first week. A mount-time effect clamps too, in case a job is sold in
  the future or a clock skews — otherwise the grid would open below the floor and instantly
  disable the button the user needs.
- Verified on Test Active1 (sold 2026-08-09): three clicks back reach 2026-08-09 – 08-15 and
  Prev disables.

## Completion grid — bounded at both ends

- Next now stops at the CURRENT week, mirroring the sold-date floor: work cannot be reported
  before it happens. The range label reads "current week" and the button explains itself on
  hover. `shift()` clamps at both ends.
- Days still in the future WITHIN the current week are individually locked — Thursday cannot
  be filled in on Tuesday. Existing readings still render (nothing is hidden); the cell just
  refuses new input, with a "this day has not happened yet" tooltip.
- Verified on Test Active1 on Fri 2026-09-04: week 08-30 – 09-05, Next disabled, and 6 of 42
  cells locked — Saturday across all six modules.

## Summary bar — three encapsulated groups

- The four-card row became three bordered groups matching the estimator's bar, so both
  screens read the same way:
  - **In House Labor** (blue) — Man Days, Labor Cost, Gross Profit Produced, each est vs
    actual, with GLPMDE/GLPMDA under the profit pair. Labour ONLY: the old card mixed sub GP
    into the dollars while the $/MD figure excluded it, so headline and rate disagreed.
  - **Subcontractors** (orange) — Cost and Gross Profit as single values, since sub cost is
    fixed at estimate. A note shows how much of that GP is earned so far.
  - **Materials** (amber) — Estimated Cost, Actual Cost, Gross Profit. Actual reads "not yet
    known" until a bill is linked; GP reads "no markup set" when the rate is 0.
- BUG FIXED: sub COST came from `work_orders.is_subcontractor` while sub PROFIT came from the
  estimate modules — Active1 showed $0 cost against $1,186 profit. Both now read the estimate.
- BUG FIXED: actuals were coloured against the FULL estimate, so every unfinished job showed
  red for having spent less than its whole budget. They now compare against what is due at
  the job's current completion (`estManDays × jobCompletion`, `profit.elcToDate`,
  `profit.earned`), with a "due by now" line under the estimate.
- Verified: Active1 (lean, 0.92) green on all three — 16.1 MD against 17.5 due. Active5
  (stalled, 1.30) red on all three — 19.9 MD against 15.3 due, $296/MD against $475.

## Summary bar — dark theme matching the estimator

- The three groups now sit on `bg-gray-900` with `divide-white/10` separators and coloured
  borders, the same treatment as the estimator's GPMD bar, so the two screens read as one
  system. Headings keep their light-page accents (blue-700 / orange-600 / amber-600) above
  the dark boxes, as the estimator does.
- Tones shift one step lighter on black: `text-green-400` / `text-red-400` rather than
  `-700` / `-600`, values in white, labels `text-gray-400`, and the muted states
  ("not yet known", "no markup set", "due by now") in `text-gray-500`.

## Summary bar — labels on the values, sub cost dropped

- In House Labor lost its shared column headings and the EST/ACTUAL abbreviations. Each
  value now carries its own label: Estimated/Actual Man Days, Estimated/Actual Labor Cost,
  Estimated/Actual GP. One line to read instead of two.
- Subcontractors carries Gross Profit alone — cost is fixed at estimate and told a tracking
  view nothing. `subCostTotal` removed as orphaned.
- All ten labels verified at the same pixel offset; the spacer that had aligned the
  single-value columns is gone, since Pair no longer has an extra row to match.
- Widths rebalanced 7/2/4 for three labelled pairs, one value, three values.

## Summary bar — GLPMD column, no sub-labels, In House on its own row

- All secondary lines removed: "17.5 due by now", "$4,441 due by now", the inline "/MD"
  figures, "$0 earned so far" and "no markup set". The completion-adjusted comparison still
  drives the red/green colouring — it is just no longer printed.
- **Estimated GLPMD / Actual GLPMD** is now its own column. No `inverse`: a higher produced
  rate is the good outcome, unlike man-days and cost. Reads "not yet known" when no hours
  are clocked, since there is no produced rate to divide.
- In House Labor moved to its own full-width row. Four labelled pairs would not fit beside
  the other groups — "Estimated Labor Cost" and "Estimated Man Days" both truncated at 60%
  width. Subcontractors and Materials share the row beneath. Verified 0 of 12 labels clipped
  by comparing scrollWidth against clientWidth rather than by eye.
- Single-column values centred to match their centred labels.

## Summary bar — inset and centring

- In House Labor cells inset to `px-14` at 2xl, stepping down `xl:px-8` and `px-3` below.
  A fixed px-14 truncated four labels at 1280px; scaling it means the PADDING gives way on a
  narrower window rather than the words. Verified 0 of 12 truncated at 1440px and above.
- Each half of a pair centres on itself, so the figure sits under the middle of its own
  label instead of flush against the group's outer border.

## Summary bar — pairs read as units

- `justify-between` pushed Estimated and Actual to opposite edges of their cell, so "Actual
  Man Days" sat nearer "Estimated Labor Cost" than its own partner — the proximity grouped
  the wrong things. Pairs now sit CENTRED with a tight internal gap; the cell padding is what
  separates one pair from the next.
- Measured: 24px within a pair against 132–176px between pairs, so the visual grouping now
  matches the logical one.

## Summary bar — In House Labor as four cards

- The single long bar became four separate tiles, one per estimated/actual pair: Man Days,
  Labor Cost, GP, GLPMD. `Group` gained a `cards` mode and a `Card` tile component. The tile
  edge does the grouping that spacing alone kept fighting — with one bar, whatever gap made
  a pair cohere also pushed it against its neighbour.
- Inside a tile the pair spreads with `px-9` and `justify-between`: ~74–140px between
  estimated and actual, against a hard card boundary either side. Edge-to-edge (px-4) read
  as two unrelated figures again; centred (px-2) wasted the tile.
- Verified 0 of 12 labels truncated at 1600px, no page errors.

## Subcontractors — Cost Change +/-

- `jobs.sub_cost_change numeric default 0` added (staging). A sub revising their own quote
  OUTSIDE of a change order. Positive = the sub now costs more.
- It comes straight off subcontractor gross profit, one-for-one: the sale price does not
  move, so any cost change is profit either way. Verified in the browser — Active1's sub GP
  went $1,186 → $686 on a +$500 entry.
- Editable in place: click the value, Enter or blur saves, Escape abandons, empty clears to
  zero rather than storing NaN. Same interaction as the estimator's markup boxes. Shows an
  em dash when unset, red when positive (costs more), green when negative.
- JOB-LEVEL, not per module. Subs are per module in the estimate, so this trades attribution
  for simplicity on a field described as rarely used — worth revisiting if it turns out to be
  used often, or on jobs carrying several subs.
- PROD SQL still outstanding for this column along with module_completion and
  company_settings.overtime_multiplier.

## Completion grid — header cleanup

- "Completion by day" and its explanatory line removed; the week chooser moved to the left
  of its row. The per-day gain figures under each cell now carry the explanation the text was
  doing.
- MODULE, the day names and the dates are black rather than grey — they are column
  identifiers, not secondary labels.
- Dates in US format: `8/30/2026 – 9/5/2026` in the picker, `8/30` in the column heads.
  Built by splitting the ISO string, NOT via `new Date()`: `new Date('2026-08-30')` is UTC
  midnight and renders as the 29th anywhere west of Greenwich, which would shift every
  column heading by a day.
- Day names 20px, dates 18px — roughly double. They are the first thing a PM scans, so they
  no longer inherit the 10px size shared with MODULE and COMPLETE.

## Completion grid — boundary note as a heading

- "current week" / "job sold this week" moved out from under the date range into its own
  centred slot in the chooser row, at `text-base font-semibold` — a heading over the day
  columns rather than a caption crowding the picker.
- Both states verified in the browser: "Current week" at 8/30–9/5 with Next disabled, and
  "Job sold this week" at 8/9–8/15 with Prev disabled.

## Summary bar — Estimated and Actual as separate cards

- Four groups on one row: **In House Labor Estimated · In House Labor Actual · Subcontractors
  · Materials**. Each labour card holds Man Days, Labor Cost, Gross Profit, GLPMD — the word
  Estimated/Actual moved from every value label to the card title, so a column says what the
  figure IS and the card says which side it is on.
- `Pair` and `Card` deleted; every cell is a `Single` now. `toneFor(actual, expected,
  inverse)` carries the completion-adjusted colouring that Pair used to compute internally.
- Widths follow column counts: 8 / 8 / 5 / 7.
- "not yet known" was the one string still clipping at these widths; it wraps to two lines at
  `text-xs` rather than truncating. Verified 0 of 25 texts clipped.
- COMPLETE column in the grid reads **Yes** (green) at 100%, **No** (grey) otherwise, on both
  module rows and the job total.
- The Overall / By Crew toggle lifted from `JobComparison` into `JobsList`, sharing the
  breadcrumb row with "Tracking / <job>". `JobComparison` takes `view` as a prop.

## Completion grid — GP Earned before Complete

- GP Earned moved to the LEFT of Complete, and both columns centre their values under their
  headings (module rows and the job total alike). Previously both were right-aligned, so the
  figures drifted away from the titles above them.
- "GP earned" retitled "GP Earned" for consistency with the other headings.

## Completion grid — week naming and label centring

- "GP Earned" retitled **Total GP Earned**.
- The week label is now absolutely centred on the ROW. `flex-1 text-center` centred it in
  whatever space was left beside the buttons, which pushed it right of the day columns by
  however wide those buttons happened to be. Measured at 7px from the day columns' midpoint
  on a 1310px row, against a visible offset before.
- Every week is named now, not just the two boundaries: **Current Week** at the ceiling,
  **Job Sold This Week** at the floor, **Previous Week** for anything between. All three
  verified by navigating in the browser.

## Completion grid — the week picker stops jumping

- The date range sized to its content, so the Next button slid sideways whenever the week
  changed: "8/30/2026 – 9/5/2026" is wider than "8/9/2026 – 8/15/2026". The range is now a
  fixed `w-52`, centred, sized for the widest case (12/28/2026 – 1/3/2027).
- Verified by walking back through four weeks and reading the Next button's x each time:
  703px throughout.

## Completion grid — the week range is a date picker

- Clicking the date range opens the browser's native date picker, so jumping back months
  does not mean clicking Prev twenty times. A transparent `input[type=date]` sits over the
  text: the picker brings month/year dropdowns, keyboard support and the right locale for
  free, and the styled range underneath is untouched.
- `min` is the sold week, `max` is today — the same window the arrows obey — and `onChange`
  clamps as well, so a browser that ignored min/max could not land the grid outside its own
  bounds.
- Verified: picking 8/19 lands on 8/16–8/22; picking 5/4 (before the job was sold) is
  refused and the week does not move. min/max render as 2026-08-09 / 2026-09-04.

- FOLLOW-UP: clicking the range did nothing at first. Chrome only opens a date input's
  picker when the click lands on its calendar indicator, and ours is transparent — the click
  has to call `showPicker()` itself. Wrapped in try/catch: it throws on browsers without it,
  where the field stays focusable and typable, so failing quietly is the right behaviour.
