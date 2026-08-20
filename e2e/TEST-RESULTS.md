# Test results log

Newest first. Claude appends after each run (E2E from `test-results/results.json`,
unit from `npm run test:unit`).

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
