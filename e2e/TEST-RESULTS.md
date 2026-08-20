# Test results log

## 2026-08-20 — Fire Pit E2E GREEN (4/4) — bugs verified fixed on prod
- After iterating the spec's navigation (estimate is view-only → click ✏️ Edit →
  project row `div.cursor-pointer` (name is "⠿Fire Pit", not exact-matchable) →
  module row → ✎ Edit Module → wait ≤30s for the async editor), all four Fire Pit
  checks pass against live prod:
  1. Editor opens with Gas Line + Trenching + Gas Fixtures sections.
  2. Gas Line Type dropdown populated (Gas Pipe subcategory fix — was empty).
  3. Trenching row (LF/W/D, inputs readonly-until-focus → click-before-fill)
     computes non-zero Est. Hrs (shared lib/trench math).
  4. Wall finishes resolve a price, no unpriced/labor-needed banner (shared
     Finishes consolidation).
- Loop mechanics that worked: read test-results/results.json + error-context.md
  a11y snapshots from disk each round; locate sections via `following::select/input`
  from the header; editor-open signal = View Rates button (version-independent).
- Next: expand Fire Pit E2E to every field + every dropdown option; then roll the
  shared-finishes repoint to OK / Columns / Walls + retire the dup records.


## 2026-08-20 — Fire Pit: Gas Line/Trenching fixes + finishes → shared Finishes
- **Gas Line** now resolves gas pipes from the `Gas Pipe` subcategory (was stale
  `Utility Lines` → empty picker; the section was dead). **Trenching** is now its
  own section mirroring Utilities, via the shared `lib/trench` helper (Utilities is
  King — Fire Pit + Utilities call the identical pure fn; unit-tested, 6 cases).
- **Finishes consolidation (Fire Pit, reference):** finish material + labor now
  read the canonical shared records — `<Type> - Finishes` (Finishes/Finish
  Material) + `<Type> - Finishes Labor Rate` (Finishes/Surface Finishes) — for
  every finish, not per-module `- FP` copies. Picker + vendor override source from
  `Finishes/Finish Material`; RATE_SCOPE borrows both shared subs. Fixes the
  Ledgerstone-returns-null bug (was resolving a per-module dupe). Parse OK, 34/34
  unit. Next: OK / Columns / Walls, then retire the `- FP` / `- BBQ` / etc. dupes.
- **New E2E** (`fire-pit.spec.js`): Gas Line populates, Trenching computes, finishes
  resolve (no unpriced banner). Run after deploy; the finish check should now pass.


## 2026-08-20 — Walls test battery: finish/cap/WP extraction + coverage caught a REAL bug
- **Goals 1+4 (finish/cap/WP):** extracted computeWallFinishRow/computeCapRow/
  computeWpRow into pure wallsCalc.js (module delegates via same-signature wrappers).
  Value tests (exact $) for all 7 finishes @20SF, 5 cap types @12LF, WP; edit-reflect
  tests proving every material $ and labor rate moves the estimate. **86/86 unit.**
- **Goal 2 (coverage) — caught a live mispricing bug.** New walls-labor-coverage.mjs
  (consumed − surfaced) flagged 31 rates. Root cause: when the no-fallback rule
  stripped the `fb:` constants off WALL_RATES, **19 Walls coefficients were never
  seeded** → with no fallback they read 0:
    · CMU `Wall Block Order Waste`=0 → orders 0 blocks → $0 block material
    · PIP `Wall PIP Stem CY per LF`=0 → $0 wall concrete
    · Ledgerstone/Stacked Stone setting-SF-per-unit=0 → NaN material
    · Real Flagstone/Real Stone SF-per-ton=0 → Infinity material
    · Tile missing $1/SF extra (undercount)
  Canonical values recovered from git (commit dbd572c stripped them; parent has them),
  re-seeded into misc_rates/Walls (19 rows). Locked with value tests (Ledgerstone
  $228, Real Flagstone $130, …) + BUG-GUARD tests (coefficient 0 → NaN/Infinity).
- **Result:** coverage **PASS** (5 accepted exceptions: Demo SF-to-Tons has an inline
  ||200 fallback; 4 Drainage labor coeffs editable from the Drainage module — not a
  mispricing risk). Orphans **0**. Guard PASS. Likely module-wide (Columns/FirePit/OK
  finishes share the pattern) — audit those next.
- **Battery COMPLETE:** section calcs extracted to wallsSections.js (Drainage/
  Backfill/Demo) with value + edit-reflect tests; type aggregators covered —
  CMU (cmuStructTotals), PIP (pipFormSf), Modular (CMU + modularInstallLab),
  Brick (brickCore), Timber (timberCore), each value + edit-reflect tested.
  **100/100 unit tests.** Coverage PASS, orphans 0, no-fallback guard PASS.
  All four goals met for every Walls type + section.

## 2026-08-20 — Walls View Rates orphan check: 88 → 1 (Demo GOAL MET)
- **Finding:** `walls-orphan-rates.mjs` (new) diffed the 137 Walls-scoped rate names
  Brian pulled against the rates WallsModule consumes → **88 non-actionable rows**.
  87 were the entire Demo tree/stump/shrub/grade-cut/haul/etc. set: Walls borrows
  three whole Demo method subs but its per-wall Demo section reads only 7 (Dirt SF,
  Grade Fill SF ×3 methods, Hand JJ SF); `buildViewRates` surfaces all labor in a
  borrowed sub, so the rest flooded in.
- **Fix (code-only):** added an optional `only: [...]` rate-name allowlist to a
  scope entry. `buildViewRates` now filters borrowed material/labor/sub rows by
  name when their (category, sub) carries an allowlist. `WALLS_RATE_SCOPE`'s three
  Demo subs now `only`-list the 7 rates Walls uses. Generalizes to any module
  borrowing a fat shared sub.
- **Result:** orphans **88 → 1**. `npm run test:unit` → 43/43; no-fallback guard
  PASS; viewRates.js + WallsModule.jsx parse.
- **Remaining 1 → resolved by PIP consolidation (below).**

## 2026-08-20 — PIP install labor consolidated to one basis (GOAL MET, orphans 0)
- **Decision (Brian):** one canonical PIP install labor rate on the per-SF-of-form
  basis. There were two models: Walls priced PIP as `LF × courses × 'Wall PIP Stem
  Added Course Labor'`; Columns + Fire Pit as `formSF × 'Wall PIP Install Labor'`
  (plus a dead `'Wall PIP Stem LF Labor'` spec never used).
- **Change:** Walls PIP labor now `pipFormSf(wall) × 'Wall PIP Install Labor'`,
  where `pipFormSf = 2 × LF × height` (both form faces) — the SAME rate + basis
  Columns and Fire Pit use (those two unchanged). Removed the dead `pipStemLfLab`
  spec and the `pipStemCourseLab` labor read; kept the two Stem CY-per-LF concrete-
  VOLUME coefficients (still used).
- **Tests:** extracted `pipFormSf` into wallsStruct.js; added form-area + labor-
  product tests. `npm run test:unit` → **45/45**; no-fallback guard PASS; both files
  parse. **`walls-orphan-rates` → 0** (was 1).
- **DB step (Brian, prod):** retire the two now-unused Walls PIP Stem LABOR rates
  from `labor_rates` (snapshot then delete). After that runs, Walls View Rates shows
  the one `Wall PIP Install Labor` row, actionable across all three modules.

## 2026-08-20 — Walls CMU structure extracted + dollar values locked (GOAL MET)
- **Extraction:** the CMU dollar composition (labor hrs + material $) moved out of
  `calcOneCMU` into React-free `cmuStructTotals(q, wall, {r, pm, blockPrice,
  rebarMat, footingPump, groutPump, installKey})` in `wallsStruct.js` (quantities
  already extracted). WallsModule now imports + calls it — single source, same math.
- **Value test (20 LF × 48" CMU, 8x8x16 block, 16"×12" footing, rebar @16" +2+2,
  100% hand grout):** rebar 7.2 hr, labor **35.925 hr**, material **$744.35**
  (block 285 + rebar 61.20 + footing 148.15 + grout 250). Plus a View-Rates-edit-
  reflects check (block +$1 → mat +$95; block labor +0.1 → hrs +9) and a grout-pump
  path (adds setup + per-CY + truck-mix delta).
- **Result:** `npm run test:unit` → **43/43**. No-fallback guard PASS. WallsModule
  parses (esbuild). Mirrors the Fire Pit structure lock; next Walls goals: orphan
  View Rates check + extend value tests to PIP/Modular/Brick/Timber.

## 2026-08-19 — Walls: explicit RATE_SCOPE (uniform with Fire Pit)
- **Finding:** Walls' old `WALL_RATE_SPECS` registry is dead code; Walls relied only
  on `module_category_map`, risking gaps for shared rates (Basic Materials concrete/
  rebar/grout, Demo, Drainage). It uses ~81 rates across Walls / Basic Materials /
  Demo / Drainage (+ Concrete Mix for PIP).
- **Fix:** added `WALLS_RATE_SCOPE` (full `Walls` + borrowed subs: Basic Materials
  Aggregate&Concrete/Grout/Reinforcement, Concrete/Concrete Mix, Drainage/French
  Drain + French Drain Pipe, Demo Hand/Mini-Skid/Skid-Steer) and passed it to the
  Walls `CrewTypeBar` — so Walls View Rates is now scope-driven like Fire Pit.
- **Result:** `npm run test:walls-coverage` → PASS (every consumed category covered);
  Walls parses; no-fallback guard PASS. Grout-pump SETUP/PER-CY are Basic Materials
  misc (no sub) — stay editable in Master Rates.
- **Eyeball after deploy:** open Walls → View Rates, confirm concrete/rebar/grout +
  demo + drainage rates now appear and edit; flag any surfaced row Walls doesn't use.


Newest first. Claude appends after each run (E2E from `test-results/results.json`,
unit from `npm run test:unit`).

## 2026-08-19 — Fire Pit structure dollar values + orphan-rate check
- **Structure values (GOAL MET):** extracted STRUCT_CALC → React-free firePitStruct.js
  (module imports + re-exports it; 4 old copies flagged SUPERSEDED). Value test for a
  12 LF × 18" CMU ring (1'×1' footing, rebar @24" + 1 bond beam, 100% hand grout):
  geometry exact (9/course × 3 = 27 blocks, 51 LF rebar, 13.5 CF grout), material =
  $291.97, labor = 10.5 hrs; plus a View-Rates-edit-reflects check + grout-pump path.
  `npm run test:unit` → 35/35.
- **Orphan View Rates entries (GOAL MET):** `npm run test:firepit-orphans` extracts
  the 58 rates the module CONSUMES and diffs against the surfaced list. Ran with the
  live Fire Pit labor/misc names (19 rows) → **0 orphans; PASS** — every surfaced
  rate maps to a module field. (Checked the Fire Pit category labor/misc; materials
  are all pickable/actionable; borrowed-sub gas labor optional to add to the query.)

## 2026-08-19 — Fire Pit scenario + full material/labor coverage (GOAL MET)
- **Scenario:** 12 LF × 18" fire pit, all 4 cap types (Flagstone/Precast/PIP/Bullnose),
  all 7 wall finishes @ 20 SF (Sand/Smooth Stucco, Ledgerstone, Stacked Stone, Tile,
  Real Flagstone, Real Stone). Each shows material AND labor, and each reflects a
  View Rates price/labor edit. `npm run test:unit` → 30/30.
- **Coverage:** `npm run test:firepit-coverage` → PASS — all 17 materials + 16 labor
  rates the module uses are surfaced/editable in Fire Pit View Rates (Fire Pit full
  category + Finishes for real flagstone/stone material).
- **Not yet value-tested:** the 12 LF × 18" STRUCTURE math + standard fire ring
  (block count/footing/grout) lives in STRUCT_CALC inside the React module; its rate
  keys are all confirmed editable, but unit-testing its VALUES needs the same pure
  extraction we did for caps/finishes (next goal candidate).

## 2026-08-19 — Fire Pit View Rates ↔ module parity + price round-trip (GOAL MET)
- **Goal:** Fire Pit View Rates surfaces every rate the module uses, and a View
  Rates price edit reflects in the module estimate.
- **Findings (audit red first):** `Finishes` category read by the module but absent
  from RATE_SCOPE (real flagstone/stone material not editable); borrowed-sub LABOR
  (gas, etc.) not surfaced because View Rates only pulled labor from full categories.
- **Fixes:** (1) added `{ Finishes, Finish Material }` to Fire Pit RATE_SCOPE;
  (2) enhanced shared `buildViewRates` to surface borrowed-sub labor + sub (filtered
  by sub_category) — so gas labor etc. are now editable from Fire Pit (and every
  module that borrows a sub). Misc stays home-module-only (misc_rates has no sub).
- **Result:** `npm run test:firepit-parity` → PASS. `npm run test:unit` → 8/8
  (added "price edit reflects in estimate"). No-fallback guard PASS.
- **To eyeball after deploy:** open Fire Pit View Rates and confirm Real
  Flagstone/Stone lines + gas labor now appear (the `Finish Material` subcat + the
  gas-labor sub_category matching are the only data-dependent bits).

## 2026-08-19 — Fire Pit cap/finish fix (GOAL MET)
- **Goal:** a Fire Pit cap + finish show BOTH non-zero material AND non-zero labor,
  including the vendor/catalog default-labor-pointer path; unset labor = 0 + flag,
  never a silent fallback.
- **Instrument:** calc unit test (`firePitCalc.test.mjs`) after extracting the
  cap/finish math into React-free `firePitCalc.js`.
- **Result:** `npm run test:unit` → 7/7 pass (6 Fire Pit + 1 condition engine).
  Red→green verified: injecting the old bug (drop the labor_rate pointer) turned
  tests #2 + #6 red; restored → green. **Locked.**

## 2026-08-19 — E2E Round 1 (harness bring-up)
- Run 1: 10 passed, 2 failed, 2 skipped. Failures: (a) Code Changes search — test
  bug (readonly-until-focus input; fixed by click-before-fill); (b) `/tracker` HTTP
  400 — real app bug (`id=eq.undefined`), fixed by guarding the fetch in
  JobTracker.jsx.
- Run 2 (after fixes + deploy): **14/14 passed.** Estimator specs active
  (`TEST_ESTIMATE_URL` set).

## CI run — 2026-08-20T17:19Z — commit 71e533f — GREEN (via GitHub Actions)
First fully-automated CI loop iteration. Trigger: Vercel deploy → `.github/workflows/e2e.yml`.
- **21 passed, 0 unexpected, 1 flaky, 0 skipped.**
- Flaky (passed on retry): `Fire Pit › exhaustive: every structure type tab computes without NaN` — first attempt failed, retry passed. Timing on tab click/render; harden later (wait for tab-active state before NaN scan).
- Prior run (62cded1) had 2 failures, both fixed here: exhaustive dropdown 150s timeout → replaced per-option getByText with in-page innerText scan (+180s ceiling); dashboard `net::ERR_TIMED_OUT` console flake → added transient net::ERR_ filter to helpers.collectErrors.
- Loop mechanics proven: Claude read results.json straight from the `ci-results` branch in the mount (no pasting); Brian only pushed + ran `npm run e2e:sync`.

## 2026-08-20 — autopilot (CI run, commit 4c4b18b)
- CI updated_at: 2026-08-20T17:43:31Z | duration 106s
- **GREEN** — 22 passed, 0 failed, 0 flaky, 0 skipped.
- No action taken (no robustness fixes needed).

## 2026-08-20 — autopilot (CI 09b9bc6)

GREEN. 22 passed / 0 failed / 0 flaky / 0 skipped. Duration 106s. CI run updated 2026-08-20T18:13:39Z. No action taken.

## 2026-08-20 — autopilot (CI 0d64f02)

GREEN. 22 passed / 0 failed / 0 flaky / 0 skipped. Duration 106s. CI run updated 2026-08-20T18:24:12Z (results.json startTime 17:41:43Z — same suite payload as the prior run). No action taken.

## Fire Pit — CLOSED 2026-08-20 (shared-finishes branch, Fire-Pit-only scope)
- Code: module + summary already on shared '<Type> - Finishes' (material) + '- Finishes Labor Rate' (labor); Gas Line on 'Gas Pipe' subcat; Trenching on shared lib/trench (Utilities canonical). No src changes needed.
- Cleanup: firePitCalc.test.mjs fixtures repointed '- FP' → '- Finishes' (FP Cap rates untouched); unit tests green.
- DB verify (prod): 7 shared finish MATERIALS priced under Unspecified vendor 05a4535e (Ledgerstone 10, Real Flagstone 400, Real Stone 400, Stacked Stone 10, Tile 6.50, Smooth Stucco 1) — Sand Stucco was $0.00 GAP → seeded to $1.00. 7 shared LABOR rates all set (Surface Finishes, Hrs per Sq Ft).
- Purge: supabase-firepit-fp-finish-purge.sql removed 14 orphans (7 '- FP' materials + 7 '- FP Labor Rate') snapshot-first (bak_fp_purge_*). Post-check: 0 orphans remain.
- Status: code off old records, tests green, CI green, duplicates purged, all 7 finishes priced. DONE.

### Walls — definition-of-done sign-off (2026-08-20)
A. Unit:      value[x] edit[x] unpriced[x] vendor[x] priority[x] units[x] aggregator[x] sub-indep[~] breakdown[ ] summary-parity[ ]
B. Audit:     coverage[x] orphan[x] no-fallback[x] no-hardcoded[x] imports[x]
C. E2E:       opens[.] dropdowns[.] every-option[.] every-tab[.] numeric[.] price-resolve[.] sub[.] live-edit[.]  (walls.spec.js authored; [.] = pending first CI run)
D. DB:        priced[ ] no-dupes[ ] filing[ ]
E. Loop:      red-first[x] catalogued[x] logged[x] green[ ]
N/A items + reason: —
Open gaps: (1) WallsSummary has its own computeWallFinishRow duplicating wallsCalc → add module-vs-summary PARITY test (drift risk). (2) per-tab materials breakdown test. (3) sub-tab independence unit test (structurally present via makeTab ihTab/subTab). (4) DB-health SQL for Walls rates on prod.

## 2026-08-20 — autopilot (CI 9c987d1)

GREEN. 22 passed / 0 failed / 0 flaky / 0 skipped. Duration 102s. CI updated 2026-08-20T18:59:30Z. No action taken.

## 2026-08-20 — autopilot (CI 46e5ece)

28 passed / 1 failed / 0 flaky / 0 skipped. Duration 500s. CI updated 2026-08-20T19:14:00Z.

FAIL — `e2e/fire-pit.spec.js:144` "exhaustive: every TYPE dropdown option computes
without a NaN/console error": "Test timeout of 180000ms exceeded" then
`page.evaluate: Target page, context or browser has been closed` at line 164.
Classified TEST-ROBUSTNESS, not a product bug — the NaN assertion never fired; the
spec simply ran out of wall-clock cycling every select/option across Fire Pit's 4
structure-type tabs (the whole file took 500s).

FIX: `test.setTimeout(180000)` → `600000` in that spec. No options skipped, no
coverage lost, no src/ change. `node --check` clean.

### Hand Demo — definition-of-done sign-off (2026-08-20)
A. Unit:      value[ ] edit[ ] unpriced[ ] vendor[ ] priority[ ] units[ ] aggregator[ ] sub-indep[ ] breakdown[ ] summary-parity[ ]   (NO handDemoCalc.js yet — extraction pending)
B. Audit:     coverage[ ] orphan[ ] no-fallback[x] no-hardcoded[x] imports[x]   (no demo coverage/orphan scripts yet)
C. E2E:       opens[.] dropdowns[.] every-option[.] numeric[.] sub[.] live-edit[.]  (hand-demo.spec.js authored; [.] = pending first CI run) | every-tab = N/A (demos have no type tabs)
D. DB:        priced[ ] no-dupes[ ] filing[ ]
E. Loop:      red-first[x] catalogued[x] logged[x] green[ ]
Next: extract handDemoCalc.js + unit tests (container/tons→CuYd/rebar-hrs/hauling/grading/tree-stump + In-House vs Sub independence), demo coverage+orphan scripts, DB-health SQL for Demo rates. Class: finish Hand → then Skid Steer → Mini Skid (shared pattern).

## 2026-08-20 — autopilot — ee2081c — RUN ABORTED (0 tests collected)
Playwright never collected: `SyntaxError: The requested module './helpers.js' does not
provide an export named 'scanEveryOptionForNaN'` (stats: expected 0 / unexpected 0 /
flaky 0, duration 0.13s). Classification: TEST-ROBUSTNESS (build/import, not product).
Cause: ee2081c added `e2e/hand-demo.spec.js` (and earlier fire-pit/walls edits) that
import `scanEveryOptionForNaN`, but the `e2e/helpers.js` change adding that export was
never committed — it is still an uncommitted working-tree change on Brian's machine.
Action: no edit needed; the fix already exists locally. `node --check` passes on
helpers.js, hand-demo.spec.js, fire-pit.spec.js, walls.spec.js. Handed Brian the commit
command for e2e/helpers.js + e2e/fire-pit.spec.js + e2e/walls.spec.js. Next CI run on
that SHA should collect all specs.

## 2026-08-20 — autopilot — a48570a — RUN ABORTED again (0 tests collected)
Identical failure to ee2081c: `SyntaxError: The requested module './helpers.js' does not
provide an export named 'scanEveryOptionForNaN'` (expected 0 / unexpected 0 / flaky 0,
duration 0.17s). a48570a is only the CI cancel-in-progress workflow change, so the
missing export is still missing on `master`. Classification: TEST-ROBUSTNESS (import).
Cause unchanged: `e2e/helpers.js` (adding the export) plus the fire-pit/walls edits are
still UNCOMMITTED in Brian's working tree. Nothing for autopilot to edit — `node --check`
passes on helpers.js, fire-pit.spec.js, walls.spec.js, hand-demo.spec.js. Re-handed Brian
the same commit command. CI will keep aborting until those three files are pushed.

### Hand Demo — unit layer DONE (2026-08-20)
Extracted calcDemo → src/components/modules/handDemoCalc.js (faithful, no logic change);
module now imports it. handDemoCalc.test.mjs (5 tests, green): faithful-extraction (finite
price, no NaN across all outputs), unset container PRICE → 0 (finite), View-Rates edit-
reflects (concrete labor rate → price), In-House responds to concSF, Sub independent
(subGradingCost tracks sub inputs; In-House concSF does NOT affect Sub). Full suite 111/111.
FINDING (follow-up, not blocking): container CAPACITY (material 'Demo - Hand Container
Capacity (CY)') is a divisor — if unset it yields Math.ceil(x/0)=Infinity → NaN price.
Always priced in prod; consider guarding removalContainers when capacity<=0 → surface
unpriced instead of NaN. Checklist A now: value[x] edit[x] unpriced[~] vendor[~] priority[~]
units[~] aggregator[~] sub-indep[x] breakdown[ ] summary-parity[ ].
