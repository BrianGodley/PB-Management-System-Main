# Test results log

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
