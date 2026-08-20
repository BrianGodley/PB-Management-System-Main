# Test results log

Newest first. Claude appends after each run (E2E from `test-results/results.json`,
unit from `npm run test:unit`).

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
