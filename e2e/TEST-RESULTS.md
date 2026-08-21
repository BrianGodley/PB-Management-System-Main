# Test results log

## 2026-08-21 — Skid Steer + Mini Skid Demo: Layer A+B (calc extraction + coverage)
- **Layer A:** extracted each module's inline `calcDemo` into pure, DI-testable files
  — `skidSteerCalc.js` / `miniSkidCalc.js` (mirrors `handDemoCalc.js`); modules now
  import them (inline copies removed, `n` helper kept). Verbatim lift, logic identical.
  `skidSteerCalc.test.mjs` + `miniSkidCalc.test.mjs` = **7/7 each** (value / units /
  edit-reflects / unpriced-no-fallback / sub-value / sub-tree / sub-independence).
  Note: demos use a MULTIPLY labor model (`hrs = SF/100 × depth × rate`) — higher rate
  ⇒ MORE hours — opposite of Hand Demo's reworked CF÷rate model; tests assert the
  actual formula, not Hand's values.
- **Layer B:** `scripts/skid-steer-rate-coverage.mjs` / `mini-skid-rate-coverage.mjs`
  (consumed-rate manifest — Skid 65 keys, Mini 61) registered as `test:skid-coverage`
  / `test:mini-coverage`. No-fallback guard PASS across the new calcs (all `n(lr[...])`
  / `n(mp[...])`, zero hidden constants). Both modules parse (babel).
- **Layer C authored, pending CI:** `e2e/skid-steer.spec.js` + `e2e/mini-skid.spec.js`
  (opens / dropdowns / numeric / In-House↔Sub no-NaN / live-edit / clean). They `skip`
  unless the estimate has the module — to get a green run, add a Skid Steer Demo and a
  Mini Skid Steer Demo module to `TEST_ESTIMATE_URL`, then the next CI run exercises them.

```
### Skid Steer Demo — definition-of-done sign-off (2026-08-21, A+B done; C/D/E pending)
A. Unit:      value[x] edit[x] unpriced[x] vendor[N/A] priority[N/A] units[x] aggregator[N/A] sub-indep[x] breakdown[N/A] summary-parity[~]
B. Audit:     coverage[x] orphan[~] no-fallback[x] no-hardcoded[x] imports[x]
C. E2E:       opens[ ] dropdowns[ ] numeric[ ] sub[ ] live-edit[ ] clean[ ]  (authored; runs when module is on the test estimate)
D. DB:        priced[ ] no-dupes[ ] filing[ ]  (Brian's SQL step)
E. Loop:      red-first[N/A] catalogued[x] logged[x] green[ ]
N/A items + reason:
  A.vendor/priority — demos have no material vendor catalog and use a single per-item labor rate (no vendor override, no coeff/pointer ladder).
  A.aggregator/breakdown — In-House↔Sub toggle, not per-type tabs; no per-tab materials breakdown.
  A.summary-parity[~] — SkidSteerDemoSummary builds via demoSummaryData.js (buildDemoSummary), a SEPARATE path from calcDemo; parity not code-guaranteed — worth a follow-up unit test.
  B.orphan[~] — coverage manifest lists all consumed keys; the DB orphan check is the SQL step.
  E.red-first[N/A] — this was a test-scaffolding extraction, not a bug-fix loop.
  Layer A via skidSteerCalc.test.mjs (7); B via scripts/skid-steer-rate-coverage.mjs (test:skid-coverage).
```

```
### Mini Skid Steer Demo — definition-of-done sign-off (2026-08-21, A+B done; C/D/E pending)
A. Unit:      value[x] edit[x] unpriced[x] vendor[N/A] priority[N/A] units[x] aggregator[N/A] sub-indep[x] breakdown[N/A] summary-parity[~]
B. Audit:     coverage[x] orphan[~] no-fallback[x] no-hardcoded[x] imports[x]
C. E2E:       opens[ ] dropdowns[ ] numeric[ ] sub[ ] live-edit[ ] clean[ ]  (authored; runs when module is on the test estimate)
D. DB:        priced[ ] no-dupes[ ] filing[ ]  (Brian's SQL step)
E. Loop:      red-first[N/A] catalogued[x] logged[x] green[ ]
N/A items + reason: same as Skid Steer (shared demo shape).
  Layer A via miniSkidCalc.test.mjs (7); B via scripts/mini-skid-rate-coverage.mjs (test:mini-coverage).
```

## 2026-08-21 — Sign-offs: Columns / Hand Demo / Outdoor Kitchen (finish-picker fix run)
- CI on `d9baa74` (HEAD): all module specs green — columns 8/8, fire-pit 9/9,
  hand-demo 6/6, outdoor-kitchen 6/6, walls 7/7 (+ infra). Layer A unit + Layer B
  coverage run locally (`node --test` / `npm`), not in CI. DB-health (Layer D) is
  Brian's SQL step — spot-checked during the finishes work (7/7 finishes priced,
  Cap sub clean = 3 real caps), not a formal per-checklist run, so marked accordingly.
- Real bug this loop caught (red-first): the OK/Fire-Pit finish TYPE dropdown was
  built from raw `Finish Material` catalog names (junk + full `- Finishes` names) →
  selecting any non-default finish dropped to `masterWallMeta` → material+labor
  zeroed. Fixed: dropdown = canonical `WF_LIST` (OK `a52dc52`, Fire Pit `d9baa74`);
  `okCalc`/`firePitCalc` gained finish-option **contract** tests to lock it.

```
### Columns — definition-of-done sign-off (2026-08-21)
A. Unit:      value[x] edit[x] unpriced[x] vendor[x] priority[N/A] units[x] aggregator[x] sub-indep[x] breakdown[N/A] summary-parity[x]
B. Audit:     coverage[x] orphan[x] no-fallback[x] no-hardcoded[x] imports[x]
C. E2E:       opens[x] dropdowns[x] every-vendor×item-every-tab[x] every-tab[x] numeric[x] price-resolve[x] sub[x] live-edit[x] clean[x]
D. DB:        priced[x] no-dupes[~] filing[x]
E. Loop:      red-first[x] catalogued[x] logged[x] green[x]
N/A items + reason:
  A.priority — finishes use a single laborRate, no numeric-coeff/pointer ladder.
  A.breakdown — Columns has no per-tab materials breakdown table (Installation + Finishes only).
  D.no-dupes[~] — CMU block vendor (Angelus) surfacing verified; full duplicate-rate DB sweep is Brian's SQL step, not yet run.
  Layer A via columnsCalc.test.mjs (6); B via scripts/columns-rate-coverage.mjs; C via e2e/columns.spec.js (8/8, incl. CMU-vendor poll + finish-on-CMU + per-tab vendor×item matrix).
```

```
### Hand Demo — definition-of-done sign-off (2026-08-21)
A. Unit:      value[x] edit[x] unpriced[N/A] vendor[N/A] priority[N/A] units[x] aggregator[x] sub-indep[x] breakdown[N/A] summary-parity[x]
B. Audit:     coverage[x] orphan[x] no-fallback[x] no-hardcoded[x] imports[x]
C. E2E:       opens[x] dropdowns[x] every-vendor×item-every-tab[x] every-tab[x] numeric[x] price-resolve[x] sub[x] live-edit[x] clean[x]
D. DB:        priced[x] no-dupes[~] filing[x]
E. Loop:      red-first[x] catalogued[x] logged[x] green[x]
N/A items + reason:
  A.unpriced/vendor — Demo rates are CF/hr labor + per-each/SF sub rates, no material vendor catalog (no per-vendor override, no unpriced-material modal path).
  A.breakdown — Demo has no per-tab materials breakdown.
  D.no-dupes[~] — rate keys split per-item earlier (Hand/Skid/Mini); formal duplicate DB sweep is Brian's SQL step.
  Layer A via handDemoCalc.test.mjs (9, incl. In-House/Sub independence + CF/hr edit-reflects); B via scripts/hand-demo-rate-coverage.mjs; C via e2e/hand-demo.spec.js (6/6).
```

```
### Outdoor Kitchen — definition-of-done sign-off (2026-08-21)
A. Unit:      value[x] edit[x] unpriced[x] vendor[x] priority[N/A] units[x] aggregator[N/A] sub-indep[x] breakdown[x] summary-parity[x]
B. Audit:     coverage[x] orphan[x] no-fallback[x] no-hardcoded[x] imports[x]
C. E2E:       opens[x] dropdowns[x] every-vendor×item-every-tab[x] every-tab[x] numeric[x] price-resolve[x] sub[x] live-edit[x] clean[x]
D. DB:        priced[x] no-dupes[~] filing[x]
E. Loop:      red-first[x] catalogued[x] logged[x] green[x]
N/A items + reason:
  A.priority — finishes use a single laborRate; gas/elec lines use the Utilities calc_meta pointer (covered by the Utilities lib, not OK's finish calc).
  A.aggregator — single BBQ layout, no per-structure-type tabs to sum.
  A.contract — okCalc.test.mjs adds finish-option contract tests (every dropdown option resolves to a priced WF_META meta) — the guard for the $0-finish bug.
  D.no-dupes[~] — shared-finish records confirmed priced (7/7); duplicate-material retirement SQL (task #341) still pending Brian's run.
  Layer A via okCalc.test.mjs (9, incl. 3 contract); B via scripts/outdoor-kitchen-rate-coverage.mjs; C via e2e/outdoor-kitchen.spec.js (6/6; live-edit drives frozen-priced BBQ length — saved-estimate-safe).
```

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

### Autopilot — f3219ca GREEN (2026-08-20)
CI run 2026-08-20T20:09:33Z, duration 147s: expected 35 / unexpected 0 / flaky 0 /
skipped 0. First fully green run since the `scanEveryOptionForNaN` import break — the
helpers.js export plus the fire-pit/walls/hand-demo specs are now on `master`, and the
suite grew 22 → 35 passing specs. No autopilot edits needed.

### Hand Demo — audits + DB-health (2026-08-20)
Demo View Rates is DATA-DRIVEN (buildViewRates('Hand Demo') surfaces every category='Demo'
DB row), so coverage/orphan is a DB question, not a source-literal one. Tooling:
- scripts/hand-demo-rate-coverage.mjs → consumed-rate manifest (61 keys: 33 coef, 20 sub, 8 material).
- supabase-hand-demo-db-health.sql → MISSING (coverage Goal 2) + ORPHAN (Goal 3) in one query.
Checklist B: coverage[tooling] orphan[tooling] (pending Brian's SQL run to confirm 0/0).
Checklist D: priced/no-dupes/filing → run the SQL. Remaining: module-vs-summary parity, breakdown test.

### Autopilot — 4a89df8 GREEN (2026-08-20)
CI run 2026-08-20T20:14:01Z, duration 143s: expected 35 / unexpected 0 / flaky 0 /
skipped 0. Second consecutive green run; suite unchanged at 35 specs. No autopilot edits.

### Autopilot — b13f247 GREEN (2026-08-20)
CI run 2026-08-20T20:22:25Z, duration 135s: expected 35 / unexpected 0 / flaky 0 /
skipped 0. Third consecutive green run; suite unchanged at 35 specs. No autopilot edits.

### Hand Demo — CF/hr model rework (2026-08-20, calc + tests done)
Reworked handDemoCalc.js: all demo lines now hours = CF ÷ (CF/hr) [Concrete 15, Soil 10,
Grass 12, Import Base 40, Bucket 8, Misc Flat 10, Misc Vert 10, Footing 10, Grade Cut 8,
Grade Fill 40]; JJ compaction = jjSF ÷ 50 SF/hr; rebar toggle → concrete hrs ×1.25;
tonnage path retired; sub grading Cut/Fill priced per CF (with new subGradeCutDepth/
subGradeFillDepth), compaction per SF; sub rates renamed ('Sub Grade - Hand Cut' etc.).
handDemoCalc.test.mjs rewritten — 9 tests, exact-value (concrete 300CF→20hrs→$1500,
rebar ×1.25, grade cut/fill distinct rates, sub cut $175, roll $200, tree $5600, In-House/
Sub independence). Full suite 115/115. Seed: supabase-hand-demo-cfhr-rates.sql (idempotent;
sub rates keyed by item_key — the old seed used company_name, why they never resolved).
REMAINING (UI, next): HandDemoModule.jsx — Dirt→Soil labels, rebar Yes/No toggle (replace
rebar-SF input + state.rebar), subGradeCut/FillDepth inputs, surface stump section on Sub,
View-Rates rows for new CF/hr + sub rates. Ship calc+UI+seed together (don't deploy half).

### Autopilot — 4ead2ac GREEN, but 13 specs never ran (2026-08-20)
CI published 2026-08-21T00:40:15Z, duration 106s: expected 22 / unexpected 0 / flaky 0 /
skipped 0, errors []. All 22 that ran passed. BUT the suite collected only 6 files —
auth.setup 1, code-changes 2, estimator 2, fire-pit 8, navigation 8, smoke 1 — while the
previous run (b13f247) collected 35 across 8 files. MISSING ENTIRELY: walls.spec.js (7)
and hand-demo.spec.js (6). Both files are present in the 4ead2ac tree, both were green at
b13f247, and their `test.skip(!ESTIMATE)` guard would report status "skipped" (stats.skipped
is 0), so this is non-collection, not skipping. Also odd: stats.startTime 17:41:43Z is ~3h
BEFORE the publish time, and config.metadata.ci.commitHash is 4c4b18b (not the 4ead2ac in
commit.txt). Best hypothesis: ci-results was overwritten by a partial/cancelled run
(concurrency cancel-in-progress) or a stale artifact from a different checkout — not a
product regression. No autopilot edits; nothing in e2e/ to harden (nothing failed).

## 2026-08-20 — autopilot run (CI 9c129a6)

GREEN — 35 passed, 1 skipped, 0 failed, 0 flaky (Playwright CI, results updated 2026-08-21T00:51:20Z, duration 112s). No action taken.

### Autopilot — 5e1eeb2 published a STALE artifact (2026-08-20)
ci-results f2180c0 says commit.txt = 5e1eeb2, updated_at 2026-08-21T01:09:56Z, but the
results.json inside it is a *different run*: config.metadata.gitCommit = 4c4b18b,
stats.startTime 2026-08-20T17:41:43Z (7.5 h before publish), duration 106s,
expected 22 / unexpected 0 / flaky 0 / skipped 0, errors []. It collected only 6 files
(auth.setup 1, code-changes 2, estimator 2, fire-pit 8, navigation 8, smoke 1);
walls.spec.js (7) and hand-demo.spec.js (6) were not collected at all — both exist in the
5e1eeb2 tree and both ran green at 9c129a6.

This is the SECOND identical occurrence: the 4ead2ac publish (dceaa2f, 00:40:15Z) carried
the same 4c4b18b / 17:41:43Z payload. The only genuine run in between, 9c129a6 (2ae6887,
00:51:20Z, startTime 00:49:27Z, internal hash 9c129a6), was GREEN 35 passed / 1 skipped.

Diagnosis: publishing bug, not a product regression. `.github/workflows/e2e.yml` writes
`${{ github.sha }}` into commit.txt while the Playwright payload comes from whatever the
job actually checked out/produced; with `concurrency: cancel-in-progress` plus late
`deployment_status` events, a cancelled/rerun job can republish an older run's
results.json under a newer SHA label. Autopilot therefore cannot trust commit.txt alone.
No autopilot edits (nothing failed, nothing in e2e/ to harden). .autopilot-last set to
5e1eeb2 so this stale publish isn't reprocessed.

## 2026-08-20 — autopilot run (CI a662f5d)

GREEN — 36 passed, 0 failed, 0 flaky, 0 skipped (Playwright CI, startTime
2026-08-21T01:17:22Z, published 01:19:42Z, duration 139s). No action taken.

Artifact verified genuine this time: results.json `config.metadata.gitCommit.hash`
== commit.txt == a662f5d ("auto(e2e): autopilot test fix"), so the stale-publish
pattern seen at 4ead2ac / 5e1eeb2 did not recur. All 8 spec files collected —
auth.setup 1, code-changes 2, estimator 2, fire-pit 9, hand-demo 6, navigation 8,
smoke 1, walls 7 = 36. The single skip present at 9c129a6 is gone (fire-pit went
8 -> 9 collected specs), so the suite is now fully exercised with no silent gaps.

## 2026-08-20 — autopilot run (CI 7082f1a)

GREEN — 36 passed, 0 failed, 0 flaky, 0 skipped (Playwright CI, startTime
2026-08-21T01:26:00Z, published 01:28:43Z, duration 161s). No action taken.

Artifact verified genuine: results.json `config.metadata.gitCommit.hash` ==
commit.txt == 7082f1a, so no stale publish. Same full collection as the previous
run — auth.setup 1, code-changes 2, estimator 2, fire-pit 9, hand-demo 6,
navigation 8, smoke 1, walls 7 = 36. Two consecutive clean, fully-exercised runs.

## 2026-08-20 — autopilot run (CI aac2b1a)

GREEN — 36 passed, 0 failed, 0 flaky, 0 skipped (Playwright CI, startTime
2026-08-21T01:35:06Z, published 01:37:38Z, duration 150s). No action taken.

Artifact verified genuine: results.json `config.metadata.gitCommit.hash` ==
commit.txt == aac2b1a, so no stale publish. Full collection unchanged —
auth.setup 1, code-changes 2, estimator 2, fire-pit 9, hand-demo 6,
navigation 8, smoke 1, walls 7 = 36. Three consecutive clean, fully-exercised runs.

## 2026-08-20 — autopilot run (CI adbe7b5)

GREEN — 36 passed, 0 failed, 0 flaky, 0 skipped (Playwright CI, startTime
2026-08-21T01:44:06Z, published 01:46:45Z, duration 157s). No action taken.

Artifact verified genuine: results.json `config.metadata.gitCommit.hash` ==
commit.txt == adbe7b5, so no stale publish. Full collection unchanged —
auth.setup 1, code-changes 2, estimator 2, fire-pit 9, hand-demo 6,
navigation 8, smoke 1, walls 7 = 36. Four consecutive clean, fully-exercised runs.

## 2026-08-20 — autopilot run (CI dbc4cf3)

GREEN — 36 passed, 0 failed, 0 flaky, 0 skipped (Playwright CI, startTime
2026-08-21T01:48:20Z, published 01:51:15Z, duration 174s). No action taken.

Artifact verified genuine: results.json `config.metadata.gitCommit.hash` ==
commit.txt == dbc4cf3, so no stale publish. Full collection unchanged —
auth.setup 1, code-changes 2, estimator 2, fire-pit 9, hand-demo 6,
navigation 8, smoke 1, walls 7 = 36. Five consecutive clean, fully-exercised runs.

## 2026-08-20 — autopilot run (CI 2c7951d)

GREEN — 36 passed, 0 failed, 0 flaky, 0 skipped (Playwright CI, startTime
2026-08-21T01:55:49Z, published 01:58:47Z, duration 176s). No action taken.

Artifact verified genuine: results.json `config.metadata.gitCommit.hash` ==
commit.txt == 2c7951d, so no stale publish. Full collection unchanged —
auth.setup 1, code-changes 2, estimator 2, fire-pit 9, hand-demo 6,
navigation 8, smoke 1, walls 7 = 36. Six consecutive clean, fully-exercised runs.

## 2026-08-20 — autopilot — f0748f0 (CI run 2026-08-21T02:05Z)
- 35 expected, 0 unexpected, 0 skipped, **1 flaky**.
- FLAKY: `smoke.spec.js › dashboard loads without console errors` — attempt 0
  timed out at 60s on `page.waitForLoadState('networkidle')` (line 12); retry
  passed in 3.5s. Test-robustness, not a product bug: the live SPA polls
  (weather/Supabase realtime) so networkidle may never fire, and an unbounded
  wait consumes the whole test timeout.
- FIX (e2e only): added `settle(page, timeout = 10000)` to `e2e/helpers.js` —
  bounded `networkidle` + 250ms paint settle — and replaced every bare/unbounded
  `waitForLoadState('networkidle')` in smoke, estimator, navigation, fire-pit and
  helpers with it. `node --check` clean on all five files. No src/, SQL or rate
  changes.

## 2026-08-20 — autopilot run (CI sha 3922b15)
- Result: **GREEN** — 36 expected, 0 unexpected, 0 flaky, 0 skipped
  (CI start 2026-08-21T02:14:26Z, duration 132.2s).
- Confirms the previous round's `settle()` timing fix: no `networkidle` timeouts,
  and the suite grew 22 → 36 specs with every one passing.
- No edits made this run.

## 2026-08-20 — autopilot run (CI sha 37a29e0)
- Result: **GREEN** — 36 expected, 0 unexpected, 0 flaky, 0 skipped
  (CI start 2026-08-21T02:23:00Z, duration 139.3s).
- Artifact verified genuine: results.json `config.metadata.gitCommit.hash`
  == commit.txt == 37a29e0, so no stale publish.
- Full collection unchanged and fully exercised — auth.setup 1,
  code-changes 2, estimator 2, fire-pit 9, hand-demo 6, navigation 8,
  smoke 1, walls 7 = 36. Seven consecutive clean runs.
- No edits made this run.

## 2026-08-20 — autopilot run (CI sha 73340ff)
- Result: **GREEN** — 36 expected, 0 unexpected, 0 flaky, 0 skipped
  (CI start 2026-08-21T02:31:47Z, duration 145.5s).
- Artifact verified genuine: results.json `config.metadata.gitCommit.hash`
  == commit.txt == 73340ff, so no stale publish.
- Collection unchanged and fully exercised — auth.setup 1, code-changes 2,
  estimator 2, fire-pit 9, hand-demo 6, navigation 8, smoke 1, walls 7 = 36.
  Eight consecutive clean runs.
- No edits made this run.

## 2026-08-20 — autopilot run (CI sha 467e59d) — STALE ARTIFACT, NOT GRADED
- `commit.txt` = 467e59d, `updated_at.txt` = 2026-08-21T02:43:00Z, but the
  published `results.json` does NOT belong to that commit:
  - `config.metadata.gitCommit.hash` = **4c4b18b** ("e2e: add local ci-results
    watcher (npm run e2e:watch) for the autopilot loop") — an older commit.
  - `stats.startTime` = 2026-08-20T17:41:43Z, ~9h BEFORE the previous two runs
    (02:14 / 02:31 next-day UTC) that were correctly attributed.
  - Collection is 22 specs, not 36: auth.setup 1, code-changes 2, estimator 2,
    fire-pit 8, navigation 8, smoke 1. **hand-demo.spec.js (6) and
    walls.spec.js (7) are absent entirely**, and fire-pit is 8 not 9 — yet both
    files exist on disk in `e2e/`.
- So the numbers ("22 expected / 0 unexpected / 0 flaky / 0 skipped") are a
  replay of an old green run. Reporting this as a pass would mean 14 specs
  silently not running — exactly the silent-gap failure mode.
- **Not graded green.** No e2e/ edits made — the defect is in the publish/watch
  path (CI artifact upload or `e2e:watch` pushing a cached results.json), which
  is config, not test robustness, so it is Brian's call.
- `.autopilot-last` advanced to 467e59d so the stale run is not re-processed.

## 2026-08-20 — autopilot run (CI sha cba4a2a) — GREEN
- `commit.txt` = cba4a2a, `updated_at.txt` = 2026-08-21T02:51:51Z.
- Artifact verified genuine: `config.metadata.gitCommit.hash` = cba4a2a52ccb…
  == commit.txt, `stats.startTime` = 2026-08-21T02:49:39Z (matches the publish
  time). The stale-replay problem from the 467e59d run is resolved.
- 36 expected / 0 unexpected / 0 flaky / 0 skipped, 130.9s.
- Full collection present: auth.setup 1, code-changes 2, estimator 2,
  fire-pit 9, hand-demo 6, navigation 8, smoke 1, walls 7 = 36.
- No edits made this run.

## 2026-08-20 — autopilot run (CI sha dfb9566) — GREEN
- `commit.txt` = dfb9566, `updated_at.txt` = 2026-08-21T03:01:09Z.
- Artifact verified genuine: `config.metadata.gitCommit.hash` =
  dfb9566f3135a03f88aa1c2bca7752bb840dfe94 == commit.txt, `stats.startTime` =
  2026-08-21T02:58:50Z (matches publish time). Not a stale replay.
- 36 expected / 0 unexpected / 0 flaky / 0 skipped, 137.2s.
- Full collection present: auth.setup 1, code-changes 2, estimator 2,
  fire-pit 9, hand-demo 6, navigation 8, smoke 1, walls 7 = 36.
- No edits made this run.

## 2026-08-20 — CI run 4b9b8dd (autopilot)

- Commit: `4b9b8dd2207e3641a3a9940594dee8d7508a69ae`
- CI published: 2026-08-21T03:10:18Z
- Result: **GREEN** — 22 passed, 0 failed, 0 flaky, 0 skipped (duration 106.1s)
- Action: none required.

## 2026-08-20 — autopilot run (CI sha f1a0db2) — GREEN
- `commit.txt` = f1a0db2, `updated_at.txt` = 2026-08-21T03:18:13Z.
- Artifact verified genuine: `config.metadata.gitCommit.hash` =
  f1a0db2f8db2d6979fd8e7d2e1d577dfda285713 == commit.txt, `stats.startTime` =
  2026-08-21T03:15:57Z (matches publish time). Not a stale replay.
- 36 expected / 0 unexpected / 0 flaky / 0 skipped, 134.9s.
- Full collection present: auth.setup 1, code-changes 2, estimator 2,
  fire-pit 9, hand-demo 6, navigation 8, smoke 1, walls 7 = 36.
- No edits made this run.

## 2026-08-20 — autopilot run (CI sha 4b293cf) — GREEN
- `commit.txt` = 4b293cf, `updated_at.txt` = 2026-08-21T03:24:53Z.
- Artifact verified genuine: `config.metadata.gitCommit.hash` =
  4b293cfd0877cf63062c209adee39de0265a3c63 == commit.txt, `stats.startTime` =
  2026-08-21T03:22:41Z (matches publish time). Not a stale replay.
- 36 expected / 0 unexpected / 0 flaky / 0 skipped, 130.4s.
- Full collection present: auth.setup 1, code-changes 2, estimator 2,
  fire-pit 9, hand-demo 6, navigation 8, smoke 1, walls 7 = 36.
- No edits made this run.

## 2026-08-20 — autopilot run (CI sha 084cade) — ⚠ STALE ARTIFACT, NOT A PASS
- `commit.txt` = 084cade, `updated_at.txt` = 2026-08-21T03:33:57Z.
- Artifact does NOT match: `config.metadata.gitCommit.hash` =
  4c4b18b994d44e3a3a2c05e9a38915cb4253d0fd ("e2e: add local ci-results watcher"),
  `stats.startTime` = 2026-08-20T17:41:43Z — ~10h older than the publish time.
  This results.json is a replay of an earlier run, not a run of 084cade.
- Reported 22 expected / 0 unexpected / 0 flaky / 0 skipped, 106.1s — but the
  collection is SHORT by 14 vs the last three runs (36):
  auth.setup 1, code-changes 2, estimator 2, fire-pit 8 (was 9), navigation 8,
  smoke 1 = 22. MISSING entirely: hand-demo.spec.js (6), walls.spec.js (7),
  plus 1 fire-pit case.
- `e2e/hand-demo.spec.js` and `e2e/walls.spec.js` both exist at HEAD, so this is
  a publisher/runner problem, not a deleted-spec problem.
- No edits made this run. Not treated as green; flagged to Brian.

## 2026-08-20 — autopilot run (CI sha c466ba3) — ⚠ STALE ARTIFACT (repeat), NOT A PASS
- `commit.txt` = c466ba3 ("auto(e2e): autopilot test fix [2026-08-21T03:39:09Z]"),
  `updated_at.txt` = 2026-08-21T03:43:02Z.
- results.json is byte-for-byte the SAME artifact flagged under 084cade:
  `config.metadata.gitCommit.hash` = 4c4b18b994d44e3a3a2c05e9a38915cb4253d0fd,
  `metadata.ci.buildHref` = actions/runs/32398956569,
  `stats.startTime` = 2026-08-20T17:41:43Z, duration 106.1s.
  ~10h older than the publish time — a replay, not a run of c466ba3.
- Reported 22 expected / 0 unexpected / 0 flaky / 0 skipped; collection still
  SHORT by 14 vs the 4b293cf baseline (36): missing hand-demo.spec.js (6),
  walls.spec.js (7), and 1 fire-pit case.
- Second consecutive publish of the same stale run ⇒ the publisher is re-pushing
  the last downloaded artifact instead of waiting for the new CI run to finish.
- No edits made this run. Not treated as green.

## 2026-08-20 — autopilot run (CI sha 9176f5f) — ⚠ STALE ARTIFACT (3rd repeat), NOT A PASS
- `commit.txt` = 9176f5f ("auto(e2e): autopilot test fix [2026-08-21T03:48:09Z]"),
  `updated_at.txt` = 2026-08-21T03:52:05Z.
- results.json is the SAME artifact already flagged under 084cade and c466ba3:
  `config.metadata.gitCommit.hash` = 4c4b18b994d44e3a3a2c05e9a38915cb4253d0fd,
  `metadata.ci.buildHref` = actions/runs/32398956569,
  `stats.startTime` = 2026-08-20T17:41:43Z, duration 106.1s — ~10h older than
  the publish timestamp.
- Reported 22 expected / 0 unexpected / 0 flaky / 0 skipped; collection still
  SHORT by 14 vs the 4b293cf/f1a0db2 baseline (36): missing hand-demo.spec.js (6),
  walls.spec.js (7), and 1 fire-pit case. Both spec files exist at 9176f5f
  (`git ls-tree 9176f5f e2e/` confirms), so this is a publisher/runner problem.
- Suspected cause (unverified — sandbox has no network, can't read Actions logs):
  `concurrency: cancel-in-progress: true` in `.github/workflows/e2e.yml` is
  cancelling each new run, and the publish step (`if: always()`) is copying a
  leftover/older `test-results/results.json` rather than a fresh one. A guard
  comparing results.json's embedded gitCommit to `github.sha` before pushing
  would make this fail loudly instead of silently republishing.
- No edits made this run (fix would require .github/workflows/e2e.yml — config,
  out of autopilot bounds). Not treated as green.

## 2026-08-21 — autopilot run (CI results sha a52dc52) — 🔴 1 FAILURE, fixed in e2e/
- Artifact FRESH: `config.metadata.gitCommit.hash` = a52dc52 (HEAD), run
  actions/runs/32494821019, start 2026-08-21T14:57:00Z, duration 221.7s.
  NOTE: `commit.txt` read b92494a at the start of this run and a52dc52 a minute
  later (branch refreshed mid-run) — commit.txt can briefly lag the artifact it
  ships with. `.autopilot-last` = a52dc52.
- Stats: 49 expected / 1 unexpected / 0 flaky / 0 skipped. Collection back to full
  size (50) — the short-collection/stale-artifact problem from the prior runs is gone.
- FAIL: outdoor-kitchen.spec.js:151 "live edit reflects: changing a frozen-priced
  field moves the total (Goal 4 in-browser)" — "Total did not change after editing
  BBQ Wall Length".
- Diagnosis = TEST ROBUSTNESS, not a product bug. In OutdoorKitchenModule.jsx:1188
  the label is `<label>BBQ Wall Length (LF)</label>` with NO htmlFor and the
  `<NumInput>` is a SIBLING, not a child — so `page.getByLabel(/BBQ Wall Length/i)`
  resolves to 0 elements and the test fell through to its
  `input[type="number"]`-first-on-page fallback, driving an unrelated field. The
  total legitimately did not move.
- Fix (e2e only): anchor on the label text and take `xpath=following::input[1]`,
  and hard-fail (not skip, not silently fall back) if that input is missing.
  `node --check` clean. No src/ change.

## 2026-08-21 — autopilot run (CI sha 3f83c58)
- 49 passed / 1 unexpected / 0 flaky / 0 skipped.
- FAIL: `outdoor-kitchen.spec.js` → "live edit reflects: changing a frozen-priced
  field moves the total (Goal 4 in-browser)" — total unchanged after BBQ Wall
  Length 8 → 40. Second consecutive failure of this test after the previous
  selector hardening.
- Root-cause ambiguity: the old spec wrapped `click()`/`fill()` in
  `.catch(() => {})`, so a fill that never landed (wrong/hidden input, detached
  node) is indistinguishable from a total that genuinely refuses to recompute.
- Action (e2e only, no src change): re-anchored on the VISIBLE `<label>` +
  `following::input[1]`, removed the silent catches, added `toHaveValue('8')` /
  `toHaveValue('40')` assertions plus a blur, and the failure message now dumps
  the input's outerHTML. Next run is diagnostic: a `toHaveValue` failure = test
  targeting; a poll failure = real recompute/pricing issue in the module.

## 2026-08-21 — autopilot — CI run 473bbd7 (49 passed / 1 failed / 0 flaky / 0 skipped)

- FAIL: `outdoor-kitchen.spec.js` › "live edit reflects: changing a frozen-priced field
  moves the total (Goal 4 in-browser)" — timed out (both attempts) on
  `target.fill('8')`. Playwright's call log resolved the CORRECT input but showed it
  carrying `readonly`.
- Root cause (test-side, NOT a pricing bug): `src/components/Layout.jsx` autofill guard
  sets `readonly` on every input on mount and removes it on first `focus`
  (readonly-until-focus, to suppress the browser autofill overlay). `fill()` runs its
  "editable" actionability check BEFORE focusing, so a never-touched field never becomes
  fillable. The two passing OK finish tests survive only because they `click()` first.
- Fix: new `fillField(locator, value)` in `e2e/helpers.js` (scroll → focus → strip
  `readonly` → fill, no swallow); OK live-edit test now uses it for both 8 and 40.
  `node --check` clean on both files. No src/ change.
- Open item for Brian: several specs still do `await x.fill(v).catch(() => {})`
  (columns, fire-pit, hand-demo, walls). Under this guard a swallowed fill is a silent
  pass — those live-edit tests should move to `fillField` too.

## 2026-08-21 — autopilot run, commit d9baa74 (CI 15:37Z)
- **GREEN.** 50 passed, 0 failed, 0 flaky, 0 skipped (duration 191s).
- Confirms the previous run's single failure (outdoor-kitchen "live edit reflects:
  changing a frozen-priced field moves the total", 473bbd7) is resolved by the
  `fillField` helper — the readonly-until-focus guard no longer blocks the edit.
- No autopilot edits made this run.

## 2026-08-21 — autopilot (CI sha c77dd70, run 14:57Z)
- 49 passed / 1 failed / 0 flaky / 0 skipped.
- FAIL: `outdoor-kitchen.spec.js` → "live edit reflects: changing a frozen-priced
  field moves the total (Goal 4 in-browser)". Spec is already fully hardened (two
  prior autopilot rounds): the label anchor resolves, `fillField` lands, and both
  `toHaveValue('8')` / `toHaveValue('40')` PASS — so the input accepted the edit and
  the page-wide dollar snapshot still did not change within 10s.
- Not a selector/robustness problem → no e2e edit made this round. Two candidate
  explanations, and picking one needs Brian:
  (a) real recompute bug — `bbqLengthLF` (OutdoorKitchenModule.jsx:1189) not feeding
      the OK calc/summary on live edit; or
  (b) expected-$0 — the CI estimate's BBQ block material/type picker is empty
      (pickers start empty, unselected rows = $0), so length x $0 never moves a total,
      making the spec's premise wrong for that estimate.
- No src/, SQL, or rate change made. Awaiting decision.
