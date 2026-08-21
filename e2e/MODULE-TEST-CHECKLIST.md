# Module test checklist — the per-module definition of done

A module is **not "done"** until every applicable item below is GREEN, or explicitly
marked **N/A** with a one-line reason. This is the standard the acceptance-test loop
grades every module against. Copy the sign-off table at the bottom into
`e2e/TEST-RESULTS.md` when you start a module and fill it in.

Grounded in the four acceptance goals Brian set on the Walls battery:
1. Every field, number, and calc is correct.
2. Every module field has a corresponding View Rates entry.
3. Every View Rates line maps to a real module item.
4. Every View Rates field (material + labor) creates a live adjustment.

Layers, fastest first. Unit + audit run in the sandbox in seconds (no network); E2E
runs in CI against prod; DB checks are SQL Brian runs.

---

## A. Pure calc unit tests — `node --test` (Goal 1)
Extract the calc to a pure DI function (`<module>Calc.js`) and lock it. No network.

- [ ] **Value** — each type/option yields correct material **and** labor at a representative qty.
- [ ] **Edit-reflects** — changing a rate in the price map changes the output (View Rates edit flows through).
- [ ] **Unpriced / no-fallback** — an unset rate resolves to 0 **and** raises the fix-it flag; never a silent constant or nearest-type inheritance.
- [ ] **Vendor-override** — a selected vendor price overrides the Standard unit.
- [ ] **Labor-priority** — numeric coeff > default-labor pointer > 0.
- [ ] **Unit-correctness** — labor is hrs-per-unit (no production-rate divide); trench minutes÷60 is the only exception.
- [ ] **Type-aggregator** — per-type totals (e.g. CMU/PIP/Modular/Brick/Timber) sum correctly.
- [ ] **Sub-tab independence** — In-House vs Sub are separate calculators (own inputs, shared rates only).
- [ ] **Per-tab materials breakdown** — the breakdown reflects only the active tab's inputs.
- [ ] **Module-vs-summary parity** — the `<Module>Summary` reprices identically to the live module.

## B. Rate-coverage / integrity audits — scripts, no network (Goals 2 & 3)
- [ ] **Coverage** (`scripts/<module>-rate-coverage.mjs`) — every rate the calc consumes surfaces in View Rates.
- [ ] **Orphan** (`scripts/<module>-orphan-rates.mjs`) — zero View Rates rows with no consuming field.
- [ ] **No-fallback guard** — passes `scripts/no-fallback-rates.mjs` (build-gated; global).
- [ ] **No-hardcoded-value** — passes `scripts/audit-catalog-pricing.mjs` (no $/coeff constants in code).
- [ ] **Import guard** — passes `scripts/check-imports.mjs` (no imports to missing/untracked files).

## C. E2E browser tests — Playwright on prod, `e2e/<module>.spec.js` (Goal 4)
NON-DESTRUCTIVE: open the editor, read, enter values, **never save**.

- [ ] **Editor opens** — module mounts; all expected sections render.
- [ ] **Dropdown populated** — every picker has >1 option (catches empty-picker/subcategory bugs).
- [ ] **Every dropdown option** — cycle every option of every non-vendor select → no NaN/Infinity, no console/HTTP errors (fast in-page scan).
- [ ] **Every type/structure tab** — each computes without NaN (poll for stable render, not a fixed sleep).
- [ ] **Numeric fields** — fill every input → a `$` total renders; no unpriced prompt on priced data.
- [ ] **Live price resolution** — each live-priced type shows no unpriced / "labor rate needed" banner.
- [ ] **Sub tab** — renders + prices; no unpriced prompt.
- [ ] **Live edit-reflects** — change a field in the browser → the total updates (Goal 4 end-to-end, not just at unit level).
- [ ] **Clean run** — no console errors, no failed requests (transient `net::ERR_` filtered).

## D. DB / data verification — SQL Brian runs on prod
- [ ] **Every consumed rate exists + priced** — material (`material` + `material_price`, open row) + labor (`labor_rates`) all present and non-zero (or an intentional 0 confirmed).
- [ ] **No duplicate/orphan records** — shared records are single-source; retired per-module copies purged (snapshot-first).
- [ ] **Correct filing** — each rate under the right category/sub_category.

## E. Loop wiring (process — every module)
- [ ] Acceptance test written **red-first** (fails before the fix proves the goal isn't met yet).
- [ ] Test case catalogued in `e2e/TEST-CASES.md`.
- [ ] Result read from `ci-results` and logged to `e2e/TEST-RESULTS.md`.
- [ ] Suite ends **green** in CI (0 unexpected, 0 flaky) — the test IS the definition of done.

---

## Per-module sign-off (copy into TEST-RESULTS.md)

```
### <Module> — definition-of-done sign-off (<date>)
A. Unit:      value[ ] edit[ ] unpriced[ ] vendor[ ] priority[ ] units[ ] aggregator[ ] sub-indep[ ] breakdown[ ] summary-parity[ ]
B. Audit:     coverage[ ] orphan[ ] no-fallback[ ] no-hardcoded[ ] imports[ ]
C. E2E:       opens[ ] dropdowns[ ] every-option[ ] every-tab[ ] numeric[ ] price-resolve[ ] sub[ ] live-edit[ ] clean[ ]
D. DB:        priced[ ] no-dupes[ ] filing[ ]
E. Loop:      red-first[ ] catalogued[ ] logged[ ] green[ ]
N/A items + reason:
```

## Addendum — fetch-scope coverage (added 2026-08-20, after the Fire Pit finish-labor miss)
A rate can EXIST and be PRICED in the DB yet never reach the calc if the module's fetch
query doesn't include its category. The Fire Pit wall-finish LABOR ($0 hrs) bug was this:
the shared labor lived under category 'Finishes' but the module's labor_rates query only
fetched ['Fire Pit','Utilities','Walls']. The E2E passed because it only checked "no NaN /
no unpriced banner / a total renders" — never "this selected finish shows nonzero material
AND nonzero labor hrs". Two required additions to the per-module DoD:
- **Fetch-scope audit (B):** every category the calc consumes a rate from must be in the
  module's fetch query (fetchStandardRateMap + the labor_rates `.in('category',[...])` +
  fetchModuleCatalog scope). A DB-health MISSING check is not enough — the rate can be
  present but unfetched.
- **E2E value assertion (C):** picking a shared type (finish/cap) must show BOTH nonzero
  material $ AND nonzero labor hrs on that line — not merely the absence of a banner.
