# Test results log

## 2026-09-01 — First run against pbs-staging — 149 passed / 3 failed / 6 skipped (21.5m)

Full suite, first run ever against **staging** rather than prod (`BASE_URL=http://127.0.0.1:5173`,
local Vite dev server → pbs-staging, which now carries a copy of production's data).

**Before / after within the same session:** 45 passed / 12 failed / 101 skipped → 149 / 3 / 6.
Nine of the twelve original failures were harness problems, not application problems:

- **6 × "Could not open the <module> editor"** — NOT a product bug. The estimator's shape is
  estimate → **projects** → modules, and the clickable rows are *projects*, carrying the user's
  area names ("cook center", "Demo/wall", "gfic"). `openModule()` filters those rows by MODULE
  name, so it only works on an estimate whose PROJECTS are named after their module type.
  Concrete passed by luck (a project named "concrete"; Playwright `hasText` is case-insensitive).
  Fixed by pointing `TEST_ESTIMATE_URL` at the estimate with 16 type-named projects.
  ⚠️ Consequence worth remembering: most REAL estimates will silently skip or fail this suite,
  because real users name projects after areas. The suite depends on a purpose-built estimate.
- **3 × open-redirect** — NOT a product bug; the assertion was self-defeating. `safeInternalPath`
  held the origin every time, but the spec also asserted `.not.toHaveURL(/example\.com/)` and the
  payload sits in our OWN query string because the test put it there, so it could never pass.
  Now parses the URL and asserts on `origin` + `host`. All 4 green.

**The 3 remaining failures:**
1. `navigation.spec.js` — **loads Collections** — REAL BUG. React "unique key" warning from
   `CollectionTable`. Every `.map()` in Collections.jsx does carry a `key=`, so a key is
   resolving to `undefined` on some row (a row arriving with no `id`). Surfaced only once
   staging held production-shaped data; it is happening in production too. UNFIXED.
2. `outdoor-kitchen.spec.js` — **frozen-priced live edit** — data shape, not a defect. The spec
   drives a "BBQ Wall Length" field; this estimate's OK module renders no BBQ Structure section.
   The module opens and its other 5 tests pass.
3. `security.spec.js` — **e-documents PDF preview** — environment gap, not a defect. Staging has
   **0 storage buckets / 0 objects** against prod's 18 / 137,273: the refresh copied database
   rows but not Supabase Storage, so `job_files` has 9,501 rows pointing at nothing.

**Also uncovered, not test failures:** staging has only **8 of 32 edge functions** deployed, so
send-email/send-sms/qbwc/process-invoice/helcim-* and 19 others are absent there.

**Harness setup this run:** Playwright's chromium had never been installed on this server, and
`.env` carried no `TEST_USER_EMAIL`/`TEST_USER_PASSWORD`. `BASE_URL` is pinned to `127.0.0.1`
rather than `localhost` because the dev server binds IPv4 only and `localhost` can resolve to
`::1` first.

## 2026-08-22 — Pool run 07:01Z — 5/5 GREEN (false positive fixed) — ALL MODULES DONE
- Targeted run of `pool.spec.js`: **6 expected / 0 unexpected / 0 flaky / 0 skipped** (43s).
  All 5 Pool tests GREEN once the NaN-scan `Infinity(?!\s+Edge)` fix ignored the "Infinity Edge
  Basin" label. Pool's calc was finite throughout — no product bug. Pool C/E → green:
  - C. E2E: opens[x] vendor×item[x] numeric[x] sub[x] live-edit[x] clean[x]
  - E. Loop: green[x]
  - D (DB-health SQL) stays Brian's step.
- 🏁 **EXTRACTION BATTERY COMPLETE FOR ALL 20 DEVELOPED ESTIMATOR MODULES** (A/B/C green):
  Hand Demo, Skid Steer, Mini Skid, Utilities, Drainage, Concrete, Pavers, Artificial Turf,
  Steps, Ground Treatments, Pool, Outdoor Kitchen, Fire Pit, Walls, Columns, Lighting, Finishes,
  Irrigation, Planting, Weed Abatement. Every module: pure calc + unit tests, rate-coverage
  manifest, Playwright e2e. Unit suite 243/243; guards green. Only Water Features remains — not
  yet developed (no battery needed until it's built).

## 2026-08-22 — Pool run 06:21Z — 3/5, NaN scan FALSE POSITIVE on "Infinity Edge Basin"
- `pool.spec.js` opens / numeric / live-edit GREEN; the two NaN-scan tests failed. Root cause
  is NOT a product bug: the Pool module has an **"Infinity Edge Basin"** structure, and the
  scan regex `/\bNaN\b|Infinity/` matched the "Infinity" substring in that legitimate label.
  The a11y snapshot's only "Infinity" hit was the `+ Add Infinity Edge Basin` button — no
  actual NaN/Infinity number on the page.
- Fix (test-only): tightened the check to `Infinity(?!\s+Edge)` in both `e2e/helpers.js`
  (`scanEveryOptionForNaN`) and `pool.spec.js`'s In-House poll. A real numeric Infinity
  ("Infinity hrs", "$Infinity") is never followed by " Edge", so it's still caught; the label
  is ignored. Pool's calc is finite (poolCalc.test.mjs 8/8). Re-run to confirm 5/5.

## 2026-08-22 — Pool: Layer A+B (extraction battery) — the last module
- **Layer A:** extracted the ~516-line `calcPool` into pure `poolCalc.js` (module now
  `import { calcPool } from './poolCalc'`). Programmatic byte-identical slice; inlined the
  supabase-tainted `calcWalkAccessLabor` + catalog resolvers (`catalogOptions`/`catalogItemFor`)
  + the whole `resolveUtilRow`/`mergedUtilTypes` from lib/utilRow; carried the module's
  `poolStdItem`/`defaultSubVendor`/`defaultEquipVendor` + constants (EXCAVATION_LABOR_NAME,
  WATER_FEATURE_SUBCAT, UTIL_CAT). `poolCalc.test.mjs` = **8/8**: excavation In-House CY volume
  + hrs (CY × equip rate) + edit-reflects; excavation Sub ($/CY × dug volume, 0 IH hrs); water
  features (2 × $500 = $1000 mat, 2 × 12 = 24 hrs, per-row breakdown emitted); material
  NO-FALLBACK (unpriced feature → $0/0hrs); excavation NO-FALLBACK (unset equip rate → 0 hrs);
  Sub-tab moves in-house hours → 0; no-NaN populated. Module bundles clean (esbuild).
- **Layer B:** `scripts/pool-rate-coverage.mjs` (`test:pool-coverage`) — Pool consumes **7
  excavation labor rates** (hrs/CY) + **8 tunable misc coefficients** + **9 subcontractor
  rates** (Pool), plus ITEM-DRIVEN labor (each catalog item's calc_meta.labor_rate) for
  Waterline Tile / Coping / Spillway / Raised Surface / Water Features / Equipment / the shared
  Utilities lines, all vendor-first material. No-fallback + imports guards PASS. Full unit suite
  **243/243** (incl. 8 new Pool).
- **Layer C authored, pending CI:** `e2e/pool.spec.js` (opens / vendor×item / numeric /
  In-House↔Sub / live-edit via Hours Adj + In-House toggle + `> p` leaf selector / clean).
  Skips unless a Pool module is on the test estimate.

```
### Pool — definition-of-done sign-off (2026-08-22, A+B done; C/D/E pending)
A. Unit:      value[x] edit[x] unpriced[x] vendor[x] priority[N/A] units[x] aggregator[x] sub-indep[x] breakdown[~] summary-parity[x]
B. Audit:     coverage[x] orphan[~] no-fallback[x] no-hardcoded[~] imports[x]
C. E2E:       opens[ ] vendor×item[ ] numeric[ ] sub[ ] live-edit[ ] clean[ ]  (authored; runs when a Pool module is on the test estimate)
D. DB:        priced[ ] no-dupes[ ] filing[ ]  (Brian's SQL step — excavation labor + Pool coeffs + sub rates priced; every Pool catalog item's calc_meta.labor_rate priced)
E. Loop:      red-first[N/A] catalogued[x] logged[x] green[ ]
N/A items + reason:
  A.priority — per-section formulas keyed by equipment/item, not a numeric-coeff priority ladder; unset ⇒ 0 (covered).
  A.aggregator[x] — every section aggregates into totalHrs + totalMat; the populated no-NaN test exercises the aggregation.
  A.vendor[x] — water-features test asserts the vendor catalog unit_cost drives material; excavation labor by equipment.
  A.sub-indep[x] — Sub-tab test asserts excavHrs=0 (in-house hours move to flat sub costs).
  A.breakdown[~] — per-row breakdowns (waterFeatureCalc/tileCalc/spillwayCalc/copingCalc) feed PoolSummary parity; asserted structurally.
  A.summary-parity[x] — PoolSummary renders from the saved calc snapshot's per-line arrays (fixed earlier); no separate summary calc to drift.
  B.no-hardcoded[~] — the 27 cf/cy volume conversions are math-invariant literals (allowed), not rate values.
  Layer A via poolCalc.test.mjs (8); B via scripts/pool-rate-coverage.mjs (test:pool-coverage).
```

## 2026-08-22 — GT run 01:50Z — 5/5 GREEN (summary guard deployed)
- Targeted run of `ground-treatments.spec.js`: **6 expected / 0 unexpected / 0 flaky / 0
  skipped** (37s). All 5 GT tests GREEN once the DG-summary ÷0 guard (bba2e18) actually
  deployed — the two prior "still NaN" reruns were deploy lag (prod was on 27422a2, one commit
  behind). GT definition-of-done C/E → green:
  - C. E2E: opens[x] vendor×Type[x] numeric[x] sub[x] live-edit[x] clean[x]
  - E. Loop: red-first[x] (÷0 NaN guards) green[x]
  - D (DB-health SQL) stays Brian's step.
- Bugs the battery caught + fixed here: unguarded Steppers/DG divisor ÷0 in the CALC, and the
  same DG divisor ÷0 in the SUMMARY (rendered "NaN hrs · Cu Yd" on the estimate page). Both
  now guarded (unset coeff → 0).
- **Extraction battery COMPLETE (A/B/C green) for all 20 developed estimator modules.**
  Remaining work: Pool (developed, battery not yet started) + Water Features (not developed).

## 2026-08-22 — GT rerun 01:24Z — live-edit GREEN, NaN persisted → traced to the SUMMARY (÷0)
- After the calc-side guards, live-edit passed but the NaN/Infinity scan still tripped.
  Traced via the a11y snapshot: `paragraph: NaN hrs · 10.80 Cu Yd` — the **DG line in
  `GroundTreatmentsSummary.jsx`** (which renders on the estimate page, so it trips the scan on
  either tab). The Summary mirrors the calc and had the SAME unguarded division:
  `tons = SF×depth / dgTonsDenom`. With the coefficient unset, `tons` → Infinity, then
  `Infinity × 0` (another unset coeff) → NaN → "NaN hrs".
- Fix: guarded the Summary's DG `tons` (`dgTonsDenom > 0 ? … : 0`), mirroring the calc + the
  Summary's already-guarded stepper/fertilizer divisions. Both GroundTreatments module +
  summary bundle clean; all Summary divisors now guarded. Re-run to confirm 5/5.

## 2026-08-22 — GT run 01:14Z — 2/5, surfaced a real NaN bug (÷0) → FIXED + guarded
- `ground-treatments.spec.js` opens + numeric-total GREEN, but 3 failed: the exhaustive scan
  + In-House render found **NaN/Infinity** on the page, and live-edit couldn't move a NaN total.
- Root cause (real latent bug, NOT introduced by the extraction — the calc was copied
  byte-for-byte and had never been NaN-scanned): two tunable-coefficient divisions were
  **unguarded against zero** — `mat = SF / stepperSfPerTon` ('GT - Steppers SF Per Ton') and
  `tons = SF×depth / dgTonsDenom` ('GT - DG Tons Denominator'). The e2e fills stepper/DG areas;
  if those coefficients aren't seeded on the estimate, `x/0 = Infinity` → NaN totals.
- Fix (per the no-fallback rule: unset/zero rate ⇒ 0 contribution, never Infinity): guarded
  both divisions (`divisor > 0 ? … : 0`), matching the existing `demoTonsDivisor`/`sfPerBag`
  guards. Added a red-first regression test (`divisor guard`) proving finite output when either
  coefficient is unset. GT unit tests **11/11**, full suite **235/235**, guard:rates PASS.
  Re-run the spec to confirm 5/5.

## 2026-08-22 — Ground Treatments: Layer A+B (extraction battery)
- **Layer A:** extracted the ~495-line `calcGroundTreatments` into pure
  `groundTreatmentsCalc.js` (module now `import { calcGroundTreatments } from
  './groundTreatmentsCalc'`; keeps its own `mergedGtOpts`/`resolveType` copies for JSX).
  Extracted programmatically (byte-identical source slices for GT_RATES + mergedGtOpts +
  resolveType + the calc) with the supabase-tainted `catalogOptions` + `calcWalkAccessLabor`
  inlined. `groundTreatmentsCalc.test.mjs` = **10/10**: mulch (CY × $/CY + delivery; labor CY ×
  spread + SF × coverage) + edit-reflects; edging metal-vs-plastic labor-key independence;
  planter prep + tilling (area × (base + till)); sod + fertilizer (bags = ceil(SF/SF-per-bag) ×
  $/bag); DG (Cu Yd × $/CY × markup); gravel (CY × $/CY, CY × swell × machine rate); material
  NO-FALLBACK (empty catalog → $0, labor still applies); Sub flat $/SF-$/LF (no in-house
  hrs/mat, subCost = section sums); no-NaN populated. Module bundles clean (esbuild).
- **Layer B:** `scripts/ground-treatments-rate-coverage.mjs` (`test:gt-coverage`) — GT consumes
  **14 material/consumable rates + 18 labor coefficients + 9 tunable 'GT -' coefficients + 9
  subcontractor rates**, across **10 catalog sub_categories** (Mulch/Edging/Soils/Sod/
  Fertilizer/Steppers/DG/Gravel/Pebble/Cobbles). No-fallback + imports guards PASS. Full unit
  suite **234/234** (incl. 10 new GT).
- **Layer C authored, pending CI:** `e2e/ground-treatments.spec.js` (opens / vendor×Type /
  numeric / In-House↔Sub / live-edit via Hours Adj + In-House toggle + `> p` leaf selector /
  clean). Skips unless a Ground Treatments module is on the test estimate.

```
### Ground Treatments — definition-of-done sign-off (2026-08-22, A+B done; C/D/E pending)
A. Unit:      value[x] edit[x] unpriced[x] vendor[x] priority[N/A] units[x] aggregator[x] sub-indep[x] breakdown[N/A] summary-parity[x]
B. Audit:     coverage[x] orphan[~] no-fallback[x] no-hardcoded[x] imports[x]
C. E2E:       opens[ ] vendor×Type[ ] numeric[ ] sub[ ] live-edit[ ] clean[ ]  (authored; runs when a GT module is on the test estimate)
D. DB:        priced[ ] no-dupes[ ] filing[ ]  (Brian's SQL step — 14 material + 18 labor + 9 GT coeffs + 9 sub rates priced; catalog Items per section)
E. Loop:      red-first[N/A] catalogued[x] logged[x] green[ ]
N/A items + reason:
  A.priority — per-section formulas keyed by material/method, not a numeric-coeff priority ladder; unset ⇒ 0 (covered).
  A.breakdown — many row sections + In-House↔Sub toggle; no per-tab materials breakdown.
  A.aggregator[x] — every section aggregates into baseHrs + totalMat; the populated no-NaN test exercises the whole aggregation.
  A.vendor[x] — vendor override via rowOpt/catalogOptions (vendor_id match → Standard null-vendor); covered structurally + the NO-FALLBACK case.
  A.sub-indep[x] — Sub-tab test asserts totalHrs=0/totalMat=0 and the flat $/SF-$/LF cost routes into subCost.
  A.summary-parity[x] — GroundTreatmentsSummary reads the saved calc snapshot; no separate summary calc to drift.
  Layer A via groundTreatmentsCalc.test.mjs (10); B via scripts/ground-treatments-rate-coverage.mjs (test:gt-coverage).
```

## 2026-08-22 — Artificial Turf run 01:01Z — 5/5 GREEN (first try)
- Targeted run of `artificial-turf.spec.js`: **6 expected / 0 unexpected / 0 flaky / 0
  skipped** (29s; 6th is auth.setup). All 5 Turf tests GREEN first try — the "Turf" row-title
  match + In-House toggle + `> p` leaf selector all landed. Turf definition-of-done C/E → green:
  - C. E2E: opens[x] vendor×Type[x] numeric[x] sub[x] live-edit[x] clean[x]
  - E. Loop: green[x]
  - D (DB-health SQL) stays Brian's step (7 labor + 14 misc + 3 dump + 2 sub rates; base/turf catalog Items).
- Extraction battery COMPLETE (A/B/C green) for 18 of 20 estimator modules. Remaining:
  Ground Treatments, Pool.

## 2026-08-22 — Artificial Turf: Layer A+B (extraction battery)
- **Layer A:** extracted the ~285-line `calcTurf` into pure `artificialTurfCalc.js` (module now
  `import { calcTurf } from './artificialTurfCalc'`; keeps its own helper copies for JSX).
  Inlined the supabase-tainted `calcWalkAccessLabor` + catalog resolvers
  (`catalogItemFor`/`catalogOptions`) and carried the constants + `baseTypePrice`/`turfBrandRow`
  the calc consumes. `artificialTurfCalc.test.mjs` = **8/8**: turf roll (100 LF × 15' = 1500 SF;
  × 0.01 = 15 hrs; × $3 = $4500) + edit-reflects; demo tonnage ((1000/100)×4 = 40 T; × 0.5 =
  20 hrs; × $10 dump = $400); base Gravel Cu-Yd qty + labor + material; vendor-first base price
  override ($40 vendor vs $30 Standard); material NO-FALLBACK (unpriced brand → $0 mat, labor
  still computes; unset demo divisor → 0 tons); Sub tab (roll → flat installSF×($/SF sub +
  brand) = $5000, base suppressed, 0 labor); no-NaN populated. Fixed one test that read a
  non-returned `baseMat` top-level key → use per-row `baseCalc[].mat`. Module bundles clean.
- **Layer B:** `scripts/turf-rate-coverage.mjs` (`test:turf-coverage`) — Turf consumes **7 labor
  rates** (5 demo methods hrs/Ton + turf/strip install) + **14 misc coefficients/consumables** +
  **3 dump fees** + **2 subcontractor rates**, plus base material (Base Material / Decomposed
  Granite / Barriers sub_categories) and turf-brand material (Turf Material), both vendor-first.
  Roll width / base depths are documented geometry-spec fallbacks (allowed). No-fallback +
  imports guards PASS. Full unit suite **224/224** (incl. 8 new Turf).
- **Layer C authored, pending CI:** `e2e/artificial-turf.spec.js` (opens / vendor×Type / numeric /
  In-House↔Sub / live-edit via Hours Adj + In-House toggle + `> p` leaf selector / clean). Matches
  the "Turf"/"Artificial Turf" row title. Skips unless a Turf module is on the test estimate.

```
### Artificial Turf — definition-of-done sign-off (2026-08-22, A+B done; C/D/E pending)
A. Unit:      value[x] edit[x] unpriced[x] vendor[x] priority[N/A] units[x] aggregator[x] sub-indep[x] breakdown[N/A] summary-parity[x]
B. Audit:     coverage[x] orphan[~] no-fallback[x] no-hardcoded[~] imports[x]
C. E2E:       opens[ ] vendor×Type[ ] numeric[ ] sub[ ] live-edit[ ] clean[ ]  (authored; runs when a Turf module is on the test estimate)
D. DB:        priced[ ] no-dupes[ ] filing[ ]  (Brian's SQL step — 7 labor + 14 misc + 3 dump + 2 sub rates priced; base/turf catalog Items priced)
E. Loop:      red-first[N/A] catalogued[x] logged[x] green[ ]
N/A items + reason:
  A.priority — per-section formulas keyed by material/method, not a numeric-coeff priority ladder; unset ⇒ 0 (covered).
  A.breakdown — Demo/Prep/Install/Strip row sections + In-House↔Sub toggle; no per-tab materials breakdown.
  A.aggregator[x] — demo/base/roll/strip aggregate into rawHrs + totalMat; the populated no-NaN test exercises the whole aggregation.
  A.vendor[x] — dedicated test: a real vendor's shared base-row price overrides the Standard price.
  A.sub-indep[x] — Sub-tab test asserts totalHrs=0/baseHrs=0 and the flat $/SF cost routes into subCost, base suppressed.
  A.summary-parity[x] — ArtificialTurfSummary reads the saved calc snapshot; no separate summary calc to drift.
  B.no-hardcoded[~] — roll width (15') + Class II/DG install depths are documented geometry-spec fallbacks (allowed), not rate values.
  Layer A via artificialTurfCalc.test.mjs (8); B via scripts/turf-rate-coverage.mjs (test:turf-coverage).
```

## 2026-08-22 — Finishes run 00:47Z — 5/5 GREEN (first try)
- Targeted run of `finishes.spec.js`: **6 expected / 0 unexpected / 0 flaky / 0 skipped**
  (28s; 6th is auth.setup). All 5 Finishes tests GREEN on the first attempt — the In-House
  toggle + `> p` direct-child leaf selector (carried over from the Planting/Weed fixes) meant
  no live-edit iteration this time. Finishes definition-of-done C/E → green:
  - C. E2E: opens[x] vendor×Type[x] numeric[x] sub[x] live-edit[x] clean[x]
  - E. Loop: green[x]
  - D (DB-health SQL) stays Brian's step (17 material + 15 labor rates priced; catalog Items per vendor).
- Extraction battery COMPLETE (A/B/C green) for: Skid, Mini, Concrete, Pavers, Utilities,
  Drainage, Irrigation, Lighting, Steps, Planting, Weed Abatement, **Finishes**. Remaining:
  ArtificialTurf, GroundTreatments, Pool.

## 2026-08-22 — Finishes: Layer A+B (extraction battery)
- **Layer A:** extracted the inline `calcFinishes` (+ its `computeFlat/Cap/WallRow` +
  `finishMatPriceV` helpers and the `FINISHES_RATES`/`FINISH_CAT_ITEM` maps it needs) into
  pure `finishesCalc.js` (module now `import { calcFinishes } from './finishesCalc'`; keeps
  its own helper copies for JSX). Inlined the supabase-tainted `calcWalkAccessLabor` +
  `resolveMaterialPrice`. `finishesCalc.test.mjs` = **8/8**: flatwork Tile value (100 SF ×
  $10 = $1000; × 0.2 = 20 hrs → $700) + edit-reflects; cap Precast (5 × $40 = $200; × 0.5 =
  2.5 hrs); wall Ledgerstone composite (50 × $20 × 1.1 + 50 × $2 screws = $1200); vendor-first
  material (real vendor's catalog Item $15 overrides Standard $10, labor unchanged); material
  NO-FALLBACK (empty rate map → $0 + 0 hrs); Sub flat $/unit (100 SF × $12 = $1200, 0 labor →
  subCost); no-NaN populated. Module bundles clean (esbuild).
- **Layer B:** `scripts/finishes-rate-coverage.mjs` (`test:finishes-coverage`) — Finishes
  consumes **17 material/consumable rates + 15 labor coefficients** (category Finishes), all
  name-keyed with a vendor-first material override (FINISH_CAT_ITEM maps rate key → catalog
  Item). No-fallback + imports guards PASS (cleared a stale `.git/index.lock` first). Full
  unit suite **216/216** (incl. 8 new Finishes).
- **Layer C authored, pending CI:** `e2e/finishes.spec.js` (opens / vendor×Type / numeric /
  In-House↔Sub / live-edit via Hours Adj with In-House toggle + `> p` leaf selector / clean).
  Skips unless a Finishes module is on the test estimate. Catalogued in `e2e/TEST-CASES.md`.

```
### Finishes — definition-of-done sign-off (2026-08-22, A+B done; C/D/E pending)
A. Unit:      value[x] edit[x] unpriced[x] vendor[x] priority[N/A] units[x] aggregator[N/A] sub-indep[x] breakdown[N/A] summary-parity[x]
B. Audit:     coverage[x] orphan[~] no-fallback[x] no-hardcoded[x] imports[x]
C. E2E:       opens[ ] vendor×Type[ ] numeric[ ] sub[ ] live-edit[ ] clean[ ]  (authored; runs when a Finishes module is on the test estimate)
D. DB:        priced[ ] no-dupes[ ] filing[ ]  (Brian's SQL step — 17 material + 15 labor rates priced under category 'Finishes'; catalog Items priced per vendor)
E. Loop:      red-first[N/A] catalogued[x] logged[x] green[ ]
N/A items + reason:
  A.priority — type-keyed formulas, not a numeric-coeff priority ladder; unset ⇒ 0 (covered).
  A.aggregator/breakdown — Flatwork/Cap/Wall row sections + In-House↔Sub toggle; no per-type-tab aggregator or per-tab materials breakdown.
  A.vendor[x] — dedicated test: a real vendor's catalog Item unit_cost overrides the Standard name-keyed price; labor unchanged.
  A.sub-indep[x] — Sub-tab test asserts totalHrs=0/laborCost=0/totalMat=0 and the flat $/unit cost routes into subCost.
  A.summary-parity[x] — FinishesSummary reads the saved calc snapshot; no separate summary calc to drift.
  Layer A via finishesCalc.test.mjs (8); B via scripts/finishes-rate-coverage.mjs (test:finishes-coverage).
```

## 2026-08-22 — Weed rerun 00:30Z — 5/5 GREEN (selector fix landed)
- Targeted rerun of `weed-abatement.spec.js`: **6 expected / 0 unexpected / 0 flaky / 0
  skipped** (23s; 6th is auth.setup). All 5 Weed tests GREEN — the `> label` direct-child
  selector fix put the value in "Additional Flat Sub Cost", so subCost moved. Weed Abatement
  definition-of-done C/E → green:
  - C. E2E: opens[x] modes[x] numeric[x] sub[x] live-edit[x] clean[x]
  - E. Loop: red-first[x] (flatPer1k/hillPer1k ReferenceError) green[x]
  - D (DB-health SQL) stays Brian's step (3 labor coefficients + Material $/1k SF priced).
- Extraction battery COMPLETE (A/B/C green) for: Skid, Mini, Concrete, Pavers, Utilities,
  Drainage, Irrigation, Lighting, Steps, Planting, **Weed Abatement**. Remaining:
  ArtificialTurf, Finishes, GroundTreatments, Pool.

## 2026-08-22 — Weed run 00:20Z — 4/5 ROOT-CAUSED via screenshot (selector matched root div)
- The failed-run screenshot showed the "900" landing in **Flat Area (SF)**, not "Additional
  Flat Sub Cost" — with Subcontractor Rate $0, subCost stayed $0 the whole time, so the total
  never moved. Root cause: `div:has(label:has-text(...))` (loose descendant) matched the
  module ROOT div, so `.first()` grabbed the page's first number input (Flat Area). This is
  what sank ALL prior live-edit attempts (rate + area + flat all typed into Flat Area). NOT a
  product bug — the Weed calc is fine (proven in weedCalc.test.mjs). Fix: scope with a
  DIRECT-child `> label` so the locator resolves the leaf wrapper's own input. Re-run.

## 2026-08-22 — Weed run 00:16Z — 4/5 (area approach still flaky; switched to additive driver)
- Second live-edit attempt (force Flat mode + set Flat Area, then edit $/SF) still didn't move
  the total. Rather than keep fighting the area/mode-gated $/SF path in-browser, switched the
  Goal-4 driver to **"Additional Flat Sub Cost (optional)"**, which adds DIRECTLY into subCost
  (subCost = area × $/SF × visits + subFlat) — no dependence on area, mode, visits, or any
  rate. 100 → 900 must move the total. The $/SF × area path itself stays proven in
  `weedCalc.test.mjs`. Re-run to confirm.

## 2026-08-22 — Weed run 00:09Z — 4/5 (opens now; live-edit needed an area)
- `weed-abatement.spec.js` now OPENS the "Weeds" module — opens / every-mode-NaN / numeric /
  In-House↔Sub all GREEN (4/5). `live edit reflects` FAILED: Subcontractor Cost didn't move
  when the $/SF rate changed. Root cause: sub cost = area × $/SF × visits, and the Sub tab
  only renders "Flat Area (SF)" when mode ≠ hillside — the saved module's Sub tab wasn't in a
  mode that showed an area field, so the rate multiplied zero. NOT a product bug. Fix: the
  live-edit test now forces "Flat" Area Type, asserts + fills Flat Area (SF), THEN edits the
  $/SF rate. Re-run to confirm green.

## 2026-08-22 — Weed run 00:05Z — 5/5 skipped: module titled "Weeds" (selector fixed)
- `weed-abatement.spec.js` skipped 5/5. Skip annotation revealed the estimate DOES carry a
  Weed Abatement module, but its row is titled **"Weeds"** — `openModule(page, 'Weed
  Abatement')` didn't substring-match it. Fixed: `openWeed` now matches on `'Weed'` (catches
  both "Weeds" and "Weed Abatement"). Spec-only change; re-run to confirm green.
- Bonus confirmation: the row list shows `Planting … In House Price $0 · Sub Price $12,026`,
  i.e. the saved Planting module is on the Subcontractor tab — validating the In-House-toggle
  fix that turned Planting live-edit green.

## 2026-08-21 — Planting rerun 23:55Z — 5/5 GREEN (live-edit fixed)
- Targeted rerun of `planting.spec.js`: **6 expected / 0 unexpected / 0 flaky / 0 skipped**
  (38s; the 6th is auth.setup). All 5 Planting tests GREEN — the In-House-toggle fix to the
  live-edit test resolved the Subcontractor-default issue. Planting definition-of-done C/E → green:
  - C. E2E: opens[x] vendor×Item[x] numeric[x] sub[x] live-edit[x] clean[x]
  - E. Loop: green[x]
  - D (DB-health SQL) stays Brian's step (per-plant calc_meta.labor_rate priced + Till/add-on rates + add-on materials).
- Extraction battery COMPLETE (A/B/C green) for: Skid, Mini, Concrete, Pavers, Utilities,
  Drainage, Irrigation, Lighting, Steps, **Planting**. Remaining: ArtificialTurf, Finishes,
  GroundTreatments, Pool; Weed Abatement A/B green + C authored (skips — no Weed module on the estimate).

## 2026-08-21 — targeted run (Planting + Weed) 23:49Z — Planting 4/5, live-edit selector fixed
- Ran only `planting.spec.js` + `weed-abatement.spec.js` (5 expected / 1 unexpected / 5 skipped, 62s).
- **Planting 4/5** — opens / vendor×Item / numeric / In-House↔Sub GREEN. `live edit reflects`
  FAILED: the Hours Adj field resolved to 0 elements. Root cause is NOT a product bug — the
  saved Planting module on the test estimate opens on the **Subcontractor** tab, where the
  In-House-only "Job Site Conditions / Hours Adj" block is not rendered. Fix: the live-edit
  test now clicks the In-House toggle first, then drives Hours Adj (spec-only change;
  `plantingCalc.test.mjs` already proves the pure recompute). Re-run to confirm green.
- **Weed Abatement 5/5 skipped** — no Weed Abatement module on this test estimate (the
  `openWeed` fallback names the rows that ARE present). Weed Layer C stays authored/pending
  until a Weed module is added to `TEST_ESTIMATE_URL`; its calc is fully proven by
  `weedCalc.test.mjs` (6/6) + the red-first ReferenceError catch.

## 2026-08-21 — Weed Abatement: Layer A+B (extraction battery) + In-House ReferenceError FIX
- **Bug found + fixed (red-first):** the inline `calcWeed` In-House return referenced
  `flatPer1k`/`hillPer1k`, which were never declared (the coefficients are `flatRate`/
  `hillRate`) — a strict-mode ESM **ReferenceError** on the In-House value path. Proven red
  (`ReferenceError - flatPer1k is not defined`), then fixed in the extraction to expose the
  real DB-sourced coefficients (`travelPerVisit, flatRate, hillRate, materialPer1k`). No
  consumer read the old keys, so no downstream change. No-fallback rule preserved: rates
  still come from `state.rates`, unset ⇒ 0, no constant.
- **Layer A:** extracted `calcWeed` + `WEED_RATE_NAMES` into pure `weedCalc.js` (module now
  imports both). Calc is fully pure (no supabase-tainted imports — it reads everything off
  its args). `weedCalc.test.mjs` = **6/6**: In-House value (travel 1×2 + flat 1000×0.001×2 =
  4 hrs → $300; material (1000/1000)×50×2 = $100) with `finiteNums` proving the
  ReferenceError is gone; edit-reflects; Area-Type mode independence (Flat/Hillside/Mixed);
  unset-coefficient NO-FALLBACK → 0 hrs + $0; Sub strict $/SF (1000×0.10×2 + 50 flat = $250,
  0 labor → subCost); no-NaN. Module bundles clean (esbuild).
- **Layer B:** `scripts/weed-rate-coverage.mjs` (`test:weed-coverage`) — Weed Abatement
  consumes **3 labor coefficients** (Travel hr/visit, Flat, Hillside) + **1 misc material
  rate** ($/1k SF), all category 'Weed Abatement', read live by name (unset ⇒ 0). Sub tab is
  a strict per-estimate $/SF (no rate row). No-fallback + imports guards PASS. Full unit
  suite **208/208** (incl. 6 new Weed).
- **Layer C authored, pending CI:** `e2e/weed-abatement.spec.js` (opens / every Area-Type
  mode NaN / numeric / In-House↔Sub / live-edit via Sub $/SF / clean). Skips unless a Weed
  Abatement module is on the test estimate. Catalogued in `e2e/TEST-CASES.md`.

```
### Weed Abatement — definition-of-done sign-off (2026-08-21, A+B done; C/D/E pending)
A. Unit:      value[x] edit[x] unpriced[x] vendor[N/A] priority[N/A] units[x] aggregator[x] sub-indep[x] breakdown[N/A] summary-parity[x]
B. Audit:     coverage[x] orphan[~] no-fallback[x] no-hardcoded[x] imports[x]
C. E2E:       opens[ ] modes[ ] numeric[ ] sub[ ] live-edit[ ] clean[ ]  (authored; runs when a Weed Abatement module is on the test estimate)
D. DB:        priced[ ] no-dupes[ ] filing[ ]  (Brian's SQL step — 3 labor coefficients + Material $/1k SF priced under category 'Weed Abatement')
E. Loop:      red-first[x] catalogued[x] logged[x] green[ ]
N/A items + reason:
  A.vendor/priority — no vendor catalog and no numeric-coeff priority ladder; four flat company coefficients read by name.
  A.breakdown — single Area-Type calc + In-House↔Sub toggle; no per-tab materials breakdown.
  A.aggregator[x] — Flat/Hillside/Mixed mode gating is the aggregation; mode-independence asserted.
  A.summary-parity[x] — WeedAbatementSummary reads the saved calc snapshot; no separate summary calc to drift.
  E.red-first[x] — the flatPer1k/hillPer1k ReferenceError was proven red, then fixed green.
  Layer A via weedCalc.test.mjs (6); B via scripts/weed-rate-coverage.mjs (test:weed-coverage).
```

## 2026-08-21 — Planting: Layer A+B (extraction battery)
- **Layer A:** extracted the inline `calcPlanting` out of `PlantingModule.jsx` into pure
  `plantingCalc.js` (module now `import { calcPlanting } from './plantingCalc'`; kept its own
  helper copies for JSX). Inlined the supabase-tainted `calcWalkAccessLabor` + catalog
  resolvers (`resolveMaterialPrice`/`catalogOptions`/`catalogItemFor` + `isStandardSel`) and
  carried `ADDON_META` + `computePlantRow`/`computeAddonRow` verbatim (exported).
  `plantingCalc.test.mjs` = **7/7**: item-driven plant labor value (10 × 0.5 hr = 5 hrs →
  $375) + material (10 × $18 = $180) + edit-reflects; add-on perDay labor (4 × 0.25 = 1 hr) +
  Standard material (4 × $10 = $40); **LABOR NO-FALLBACK** (unset plant rate → 0 hrs AND the
  perDay>0 guard also zeroes material, plus the plant surfaces in `laborUnset`); Till labor
  formula + guard (any unset Till rate → 0 till hrs); Sub tab flat $/unit (10 × $25 = $250,
  0 labor, cost → subCost); no-NaN populated (till + plants + add-on + manual + yard check).
  Module bundles clean (esbuild).
- **Layer B:** `scripts/planting-rate-coverage.mjs` (`test:planting-coverage`) — Planting
  consumes **8 name-keyed labor rates** (3 Till + 5 add-on install) + **per-plant ITEM-DRIVEN
  labor** via each Plants Item's `calc_meta.labor_rate` (like Lighting) + **8 add-on
  materials** (Amendments sub_category), plus plant material from the Plants sub_category
  (vendor-first → Standard). Because per-plant labor keys live in DB calc_meta, DB-health SQL
  proves per-item coverage. No-fallback + imports guards PASS. Full unit suite **202/202**
  (incl. 7 new Planting).
- **Layer C authored, pending CI:** `e2e/planting.spec.js` (opens / vendor×Item / numeric /
  In-House↔Sub / live-edit via Hours Adj / clean). Skips unless a Planting module is on the
  test estimate. Catalogued in `e2e/TEST-CASES.md`.

```
### Planting — definition-of-done sign-off (2026-08-21, A+B done; C/D/E pending)
A. Unit:      value[x] edit[x] unpriced[x] vendor[~] priority[N/A] units[x] aggregator[N/A] sub-indep[x] breakdown[N/A] summary-parity[x]
B. Audit:     coverage[x] orphan[~] no-fallback[x] no-hardcoded[x] imports[x]
C. E2E:       opens[ ] vendor×Item[ ] numeric[ ] sub[ ] live-edit[ ] clean[ ]  (authored; runs when a Planting module is on the test estimate)
D. DB:        priced[ ] no-dupes[ ] filing[ ]  (Brian's SQL step — every Plants Item's calc_meta.labor_rate priced, Till + add-on rates priced, add-on materials priced)
E. Loop:      red-first[N/A] catalogued[x] logged[x] green[ ]
N/A items + reason:
  A.priority — per-plant labor is item-driven (calc_meta.labor_rate), not a numeric-coeff ladder; unset ⇒ laborUnset (covered).
  A.aggregator/breakdown — Small/Large/Add-On row sections + In-House↔Sub toggle; no per-type-tab aggregator or per-tab materials breakdown.
  A.vendor[~] — vendor override via resolveMaterialPrice / catalogItemFor (vendor_id match → Standard null-vendor); covered structurally + the NO-FALLBACK case, not a dedicated per-vendor assertion.
  A.sub-indep[x] — Sub-tab test asserts totalHrs=0/laborCost=0/totalMat=0 and the flat $/unit cost routes into subCost independently of the In-House labor path.
  A.summary-parity[x] — PlantingSummary reads the saved calc snapshot; no separate summary calc to drift.
  Layer A via plantingCalc.test.mjs (7); B via scripts/planting-rate-coverage.mjs (test:planting-coverage).
```

## 2026-08-21 — CI (22:47Z, published 22:55Z) — Steps Layer C GREEN — 97/97
- Complete run, **97 passed / 0 failed / 0 flaky / 0 skipped** (start 22:47:08Z, duration 501s).
  Suite grew 92 → 97 with the 5-test `steps.spec.js`.
- **Steps** `steps.spec.js` **5/5 GREEN** — not skipped, so a Steps module is on the test
  estimate and the live-browser layer actually verified: opens with step sections,
  exhaustive vendor×Type NaN sweep (In-House + Sub), numeric→total, In-House↔Sub pricing,
  and live-edit (Hours Adj moves the total, Goal 4). Steps definition-of-done C/E → green:
  - C. E2E: opens[x] vendor×Type[x] numeric[x] sub[x] live-edit[x] clean[x]
  - E. Loop: green[x]
  - D (DB-health SQL) stays Brian's step — verify every Steps labor/concrete/sub rate is
    priced and each step catalog item has a Standard price.
- Extraction battery COMPLETE (A/B/C green) for: Skid, Mini, Concrete, Pavers, Utilities,
  Drainage, Irrigation, Lighting, **Steps**. Remaining: ArtificialTurf, Finishes,
  GroundTreatments, Planting, Pool, WeedAbatement.

## 2026-08-21 — Steps: Layer A+B (extraction battery)
- **Layer A:** extracted the inline `calcSteps` out of `StepsModule.jsx` into pure
  `stepsCalc.js` (module now `import { calcSteps } from './stepsCalc'`; kept the module's own
  helper const copies for JSX). Inlined the supabase-tainted `calcWalkAccessLabor` + catalog
  resolvers (`catalogOptions`/`catalogItemFor` + `isStandardSel`) and carried the rate-key
  builders (`kPaverForm`/`kConcTypeHrs`/`kConcTypeMat`/`kFinishHrs`/`kFinishMat`/`kConcForm` +
  the sub keys) + `MAT_SECTIONS` + row calculators verbatim. `stepsCalc.test.mjs` = **7/7**:
  paver form labor value (100 SF × 0.5 hr = 50 hrs → $3,750) + material (SF × $8 = $800, 1
  pallet) + edit-reflects; concrete type+finish+form value (100 LF × (0.9+0.1) × 1 = 100 hrs;
  material 100 × (5+1) = $600) + edit-reflects; material **NO-FALLBACK** (picked paver with
  empty catalog → $0 material, labor still priced from the form rate); Sub tab flat $/LF
  (100 × (2+0.5) = $250) with 0 In-House labor (independence); and a no-NaN populated
  estimate. Module bundles clean (esbuild).
- **Layer B:** `scripts/steps-rate-coverage.mjs` (`test:steps-coverage`) — Steps consumes
  **11 labor rates** (paver/brick/tile/flag form + concrete type/finish/form), **9 concrete
  materials** ($/Sq Ft, color-inclusive), **17 sub $/Ln Ft rates**, across **4 catalog
  sub_categories** (Paver Material / Brick / Tile / Flagstone) for In-House step material
  (vendor-first → Standard). Manifest derives its arrays from the calc source so it can't
  drift. No-fallback + imports guards PASS. Full unit suite **195/195** (incl. 7 new Steps).
- **Layer C authored, pending CI:** `e2e/steps.spec.js` (opens / vendor×Type / numeric /
  In-House↔Sub / live-edit via Hours Adj / clean). Skips unless a Steps module is on the test
  estimate. Catalogued in `e2e/TEST-CASES.md`.

```
### Steps — definition-of-done sign-off (2026-08-21, A+B done; C/D/E pending)
A. Unit:      value[x] edit[x] unpriced[x] vendor[~] priority[N/A] units[x] aggregator[N/A] sub-indep[x] breakdown[N/A] summary-parity[x]
B. Audit:     coverage[x] orphan[~] no-fallback[x] no-hardcoded[x] imports[x]
C. E2E:       opens[ ] vendor×Type[ ] numeric[ ] sub[ ] live-edit[ ] clean[ ]  (authored; runs when a Steps module is on the test estimate)
D. DB:        priced[ ] no-dupes[ ] filing[ ]  (Brian's SQL step — every Steps labor/concrete/sub rate priced; step catalog items priced)
E. Loop:      red-first[N/A] catalogued[x] logged[x] green[ ]
N/A items + reason:
  A.priority — no numeric-coeff priority ladder; form/type/finish rates are independent name keys, unset ⇒ 0 (covered).
  A.aggregator/breakdown — per-material-section rows (paver/brick/tile/flag/conc), In-House↔Sub toggle; PoolSummary-style per-tab breakdown N/A here.
  A.vendor[~] — vendor override via paverItemFor→catalogItemFor (vendor_id match → Standard null-vendor); covered structurally + the NO-FALLBACK case, not a dedicated per-vendor assertion.
  A.sub-indep[x] — Sub-tab test asserts totalHrs=0 and the flat $/LF cost routes into subCost independently of the In-House labor path.
  A.summary-parity[x] — StepsSummary reads the saved calc snapshot; no separate summary calc to drift.
  Layer A via stepsCalc.test.mjs (7); B via scripts/steps-rate-coverage.mjs (test:steps-coverage).
```

## 2026-08-21 — Irrigation: surface unpriced MATERIAL (zones + timers)
- Closes the silent-$0 material gap in Irrigation (the twin of the Lighting fix). The calc
  collected `zoneMissing` but never returned it, and timers weren't tracked — so an unpriced
  zone BOM line or timer added $0 with no prompt. Added `matUnset` to `calcIrrigation`
  (In-House only; Sub prices flat): unresolved zone BOM names + selected timers whose material
  resolves to $0, deduped, name-based (write back via `saveStandardNamedRate`). Wired a
  "Material price needed" banner + `UnpricedItemModal` into `IrrigationModule` (onSaved =
  refreshAllRates).
- **Red-first:** wrote the matUnset surfacing test (unpriced zone BOM + timer) — failed
  (`matUnset` undefined) — then implemented → green. Also a Sub-tab-empty test. Suite **195/195**.

## 2026-08-21 — Lighting hand-test fixes: per-row Labor Hrs + material NO-FALLBACK surfacing
- Two defects from Brian's hand-testing, both fixed:
  1. **Per-row "Labor Hrs" blank** while the total priced right — the row cell read the
     retired per-product `labor_hrs_ea` (always null now). Fixed to mirror the calc:
     `qty × laborRates[item.calc_meta.labor_rate]`.
  2. **Silent $0 material** (unpriced Light Craft fixtures) with NO notification — Lighting
     only surfaced unpriced *labor*, never *material*. Added `matUnset` to the calc
     (a picked item resolving to $0 flags itself, adds $0 — no fallback) + a "Material price
     needed" banner wired to `UnpricedItemModal` (material mode → writes Standard price back).
- **Red-first:** wrote the material-unpriced test, watched it fail, then implemented →
  **193/193**. This is the guardrail that should have caught the original bug.
- Data side (separate, Brian ran/queued): blanket $110 on unpriced Light Fixture prices;
  added Light Craft 100W/200W transformers.
- Lighting sign-off stays OPEN pending Brian's hand-retest + a CI cycle.

## 2026-08-21 — CI b8e8da0 (20:01Z) — Lighting C GREEN, timer fix verified — 92/92
- Complete run, **92 passed / 0 failed / 0 flaky / 0 skipped**. Covers the Irrigation timer
  matKey fix + the Lighting live-edit retarget (drives Hours Adj). **Lighting** `lighting.spec.js`
  now 5/5. C/E flip to done:
```
### Lighting — C/E now green (CI b8e8da0)
C. E2E: opens[x] vendor×item[x] numeric[x] sub[x] live-edit[x] clean[x]
E. Loop: red-first[x] catalogued[x] logged[x] green[x]   (live-edit went red→retarget→green)
```
- Not yet in a CI run: a5d565e (DropdownSelect first-open page-jump fix) — deploys + runs next cycle.
- Extraction battery COMPLETE for: Skid, Mini, Concrete, Pavers, Utilities, Drainage, Irrigation,
  Lighting — all Layers A/B/C green.

## 2026-08-21 — Irrigation timer/controller material bug (hand-test find) FIXED
- Brian hand-tested controllers: **no material was being added**. Root cause (verified):
  the timer material is an EXACT-string lookup of `TIMER_TYPES.matKey` against the Standard
  price map, which is keyed by the catalog item's `description`. The catalog items are named
  `Timer - N Station` (sub_category **Controllers**), but the code used `Irrigation Timer -
  N Station` — the `Irrigation ` prefix doesn't exist in the DB, so every timer resolved to
  $0 material, silently (zones were unaffected — they normalize names via makeBomPrice).
  Pre-existing (not a refactor regression); the extraction carried the wrong key verbatim.
- **Fix:** aligned `matKey` to the catalog description (`Timer - N Station`) in all three
  copies — `irrigationCalc.js`, `IrrigationModule.jsx`, `IrrigationSummary.jsx`.
- **Why the tests missed it:** the unit test only asserted timer LABOR, never MATERIAL; and
  a fixture-keyed unit test can't catch a code-vs-DB naming mismatch anyway; the e2e only
  checks "a $ appears / total moves," which zone labor already satisfies. Closed the gap:
  added a priced-timer material test (2 × $200 = $400 raw) + a matKey contract test that
  fails if the `Irrigation ` prefix ever returns. Suite now **192/192**. (The durable catch
  for this class is a DB-health check that every matKey resolves to a priced Controllers
  row — recommend adding to Irrigation Layer D.)

## 2026-08-21 — CI 8f1a4ea (19:34Z) — Irrigation C GREEN; Lighting 4/5, live-edit retargeted
- Complete run of the Lighting commit (both Irrigation + Lighting deployed): **91 passed /
  1 failed / 0 flaky / 0 skipped** (92 specs). Not a cancellation artifact — full run.
- **Irrigation** `irrigation.spec.js` 5/5 GREEN. C/E flip to done:
```
### Irrigation — C/E now green (CI 8f1a4ea)
C. E2E: opens[x] vendor×item[x] numeric[x] sub[x] live-edit[x] clean[x]
E. Loop: red-first[N/A] catalogued[x] logged[x] green[x]
```
- **Lighting** 4/5 — only `live edit reflects` failed: the spec drove `.first()` numeric
  input, which is **Difficulty (%)** (Job Site Conditions renders before the item rows).
  Difficulty only *scales* existing labor hours, so with no priced Lighting line items on
  the estimate, 2→20 multiplies zero and the total can't move — a false Goal-4 failure, NOT
  a calc bug (lightingCalc.test.mjs edit-reflects passes). **Fix:** retargeted the test to
  drive **Hours Adj (±hrs)**, which *adds* labor hours directly and always moves the
  In-House total independent of catalog pricing. Pending re-run to confirm green.
- Autopilot verified the retargeted selector against `LightingModule.jsx:753` (Hours Adj
  `<p>` + sibling `<input>`), `node --check` clean. No src/, SQL or rate changes.
- `.autopilot-last` -> `8f1a4ea`.

## 2026-08-21 — Lighting: Layer A+B
- **Layer A:** extracted inline `calcLighting` into pure `lightingCalc.js` (module imports
  it). Inlined the supabase-tainted `calcWalkAccessLabor` + catalog resolvers
  (`catalogOptions`/`catalogItemFor` + `isStandardSel`); carried the module's own
  `LIGHT_CAT` / `CATALOG_OPTS` / `MATERIAL_MARKUP_NAME` / `processSection`. `lightingCalc.
  test.mjs` = **8/8**: item-driven labor value (3 fixtures × 1.5 hr = 4.5 hrs → $337.50),
  material + watts/VA accumulation, edit-reflects, material markup (15% → ×1.15),
  unset-item-labor → 0 hrs + `laborUnset` flag (NO-FALLBACK), fixture-vs-wire section
  independence, and the Sub tab (flat $/each = sub_price_ea, 0 labor, cost → subCost).
  Module bundles clean (esbuild).
- **Layer B:** `scripts/lighting-rate-coverage.mjs` (`test:lighting-coverage`) — Lighting
  is fully catalog-driven: 3 sub_categories (Light Fixture / Transformer / Wire), material
  vendor-first→Standard, install labor ITEM-DRIVEN via each item's `calc_meta.labor_rate`
  (Fixture / Transformer / Bistro / Wire Labor), plus the `Lighting - Material Markup` misc
  rate. Because labor keys live in DB calc_meta, DB-health SQL proves per-item coverage.
  No-fallback + imports guards PASS. Full unit suite **190/190** (incl. 8 new Lighting).
- **Layer C authored, pending CI:** `e2e/lighting.spec.js` (opens / vendor×item / numeric /
  In-House↔Sub / live-edit / clean). Skips unless a Lighting module is on the test estimate.

```
### Lighting — definition-of-done sign-off (2026-08-21, A+B done; C/D/E pending)
A. Unit:      value[x] edit[x] unpriced[x] vendor[~] priority[N/A] units[x] aggregator[N/A] sub-indep[x] breakdown[N/A] summary-parity[x]
B. Audit:     coverage[x] orphan[~] no-fallback[x] no-hardcoded[x] imports[x]
C. E2E:       opens[ ] vendor×item[ ] numeric[ ] sub[ ] live-edit[ ] clean[ ]  (authored; runs when a Lighting module is on the test estimate)
D. DB:        priced[ ] no-dupes[ ] filing[ ]  (Brian's SQL step — every Lighting item's calc_meta.labor_rate priced + markup row exists)
E. Loop:      red-first[N/A] catalogued[x] logged[x] green[ ]
N/A items + reason:
  A.priority — labor is item-driven (item.calc_meta.labor_rate), not a numeric-coeff ladder; unset ⇒ laborUnset (covered).
  A.aggregator/breakdown — In-House↔Sub toggle, not per-type tabs; no per-tab materials breakdown.
  A.vendor[~] — vendor override via catalogItemFor (vendor_id match → Standard null-vendor); covered structurally, not a dedicated unit assertion.
  A.sub-indep[x] — Sub-tab test asserts totalHrs=0/laborCost=0 and cost routes to subCost independently of the In-House labor path.
  A.summary-parity[x] — LightingSummary reads the saved calc snapshot; no separate summary calc to drift.
  Layer A via lightingCalc.test.mjs (8); B via scripts/lighting-rate-coverage.mjs (test:lighting-coverage).
```

## 2026-08-21 — Drainage Layer C GREEN (CI 28d0f0d, 18:57Z) — 82/82
- ci-results `commit.txt` = 28d0f0d (the Drainage commit at master HEAD), **82 passed /
  0 unexpected / 0 flaky / 0 skipped** (up from 77 — Drainage's 5 specs are live). Drainage
  `drainage.spec.js` opened, exercised every vendor×item combo, priced numerics, both crew
  modes, moved the total on live edit — all clean. Drainage C/E flip to done:
```
### Drainage — C/E now green (CI 28d0f0d)
C. E2E: opens[x] vendor×item[x] numeric[x] sub[x] live-edit[x] clean[x]
E. Loop: red-first[N/A] catalogued[x] logged[x] green[x]
```
- **Irrigation** commit (irrigationCalc + coverage + spec) is authored and verified locally
  (8/8 unit, 182/182 suite, guards PASS) but **not yet pushed** — it'll deploy + run on the
  next CI cycle once the Irrigation commit lands on master.

## 2026-08-21 — Irrigation: Layer A+B
- **Layer A:** extracted inline `calcIrrigation` into pure `irrigationCalc.js` (module
  imports it). Inlined the supabase-tainted helpers (`resolveMaterialPrice` +
  `calcWalkAccessLabor`) and carried the module's own `TIMER_TYPES` / `RATE_DEFAULTS` /
  `computeTimerRow`; zone helpers (`makeBomPrice`, `computeZoneRow`) import directly from
  `lib/irrigationZones.js` (pure — no supabase). `irrigationCalc.test.mjs` = **8/8**:
  zone labor value (2 lawn zones × 3 hrs = 6 hrs → $450), edit-reflects (rate ×2 → labor
  ×2), Trench-vs-Hand rate independence, timer labor (2 × 1.5 = 3 hrs → $225), unset-rate
  → 0 (no constant), unpriced-BOM → row `missing` + $0 rawMat (NO-FALLBACK), and the Sub
  tab (flat $/unit, 0 labor hours, cost → subCost). Module bundles clean (esbuild).
- **Layer B:** `scripts/irrigation-rate-coverage.mjs` (`test:irrigation-coverage`) —
  manifests 14 labor rates (11 zone Trench/Hand keys + timer/config), 8 timer materials
  (`Irrigation Timer - N Station`), and 16 zone-BOM products (`IRR_PRODUCTS`), read from
  both `irrigationCalc.js` and `lib/irrigationZones.js`. No-fallback + imports guards PASS.
  Full unit suite **182/182** (incl. the 8 new Irrigation tests).
- **Layer C authored, pending CI:** `e2e/irrigation.spec.js` (opens / zone×timer vendor /
  numeric / In-House↔Sub / live-edit / clean). Skips unless an Irrigation module is on the
  test estimate.

```
### Irrigation — definition-of-done sign-off (2026-08-21, A+B done; C/D/E pending)
A. Unit:      value[x] edit[x] unpriced[x] vendor[~] priority[N/A] units[x] aggregator[N/A] sub-indep[x] breakdown[N/A] summary-parity[x]
B. Audit:     coverage[x] orphan[~] no-fallback[x] no-hardcoded[x] imports[x]
C. E2E:       opens[ ] vendor×item[ ] numeric[ ] sub[ ] live-edit[ ] clean[ ]  (authored; runs when an Irrigation module is on the test estimate)
D. DB:        priced[ ] no-dupes[ ] filing[ ]  (Brian's SQL step)
E. Loop:      red-first[N/A] catalogued[x] logged[x] green[ ]
N/A items + reason:
  A.priority — zone labor reads one Trench + one Hand key per zone by name; timer material is vendor-first→Standard. No numeric-coeff ladder to A/B-test.
  A.aggregator/breakdown — In-House↔Sub toggle, not per-type tabs; no per-tab materials breakdown.
  A.vendor[~] — vendor override supported via makeBomPrice (materialRows vendor line → Standard) + irrMatPrice on timers; covered structurally, not a dedicated unit assertion.
  A.sub-indep[x] — Sub-tab test asserts totalHrs=0/laborCost=0 and cost routes to subCost independently of the In-House labor path.
  A.summary-parity[x] — IrrigationSummary reads the saved calc snapshot; no separate summary calc to drift.
  Layer A via irrigationCalc.test.mjs (8); B via scripts/irrigation-rate-coverage.mjs (test:irrigation-coverage).
```

## 2026-08-21 — Drainage: Layer A+B
- **Layer A:** extracted inline `calcDrainage` into pure `drainageCalc.js` (module
  imports it; inlined the catalog helpers + `calcWalkAccessLabor`, carried the module's
  own type/rate maps + `drainMatCost`). `drainageCalc.test.mjs` = **7/7**: trench value
  (100 LF × 6" × 24" = 100 CF × 0.1 = 10 hrs → $750), depth-doubles units, edit-reflects,
  Trench-vs-Hand rate independence, unset-rate → 0, and the `laborUnset` fix-it flag on a
  typed pipe row with no catalog labor. Note: pipe/french/fixture labor rides each catalog
  item's calc_meta.labor_rate (vendor-first) — an unresolved one surfaces in laborUnset.
- **Layer B:** `scripts/drainage-rate-coverage.mjs` (`test:drainage-coverage`) — 23
  name-keyed rates (trench + pipe/french/fixture built-in labor names + sock/gravel) plus
  the note that catalog material/labor resolve vendor-first. No-fallback guard PASS.
- **Layer C authored, pending CI:** `e2e/drainage.spec.js` (opens / vendor×item / numeric /
  In-House↔Sub / live-edit / clean). Skips unless a Drainage module is on the estimate
  (the estimate already has one).

```
### Drainage — definition-of-done sign-off (2026-08-21, A+B done; C/D/E pending)
A. Unit:      value[x] edit[x] unpriced[x] vendor[~] priority[N/A] units[x] aggregator[N/A] sub-indep[~] breakdown[N/A] summary-parity[x]
B. Audit:     coverage[x] orphan[~] no-fallback[x] no-hardcoded[x] imports[x]
C. E2E:       opens[ ] vendor×item[ ] numeric[ ] sub[ ] live-edit[ ] clean[ ]  (authored; runs when a Drainage module is on the test estimate)
D. DB:        priced[ ] no-dupes[ ] filing[ ]  (Brian's SQL step)
E. Loop:      red-first[N/A] catalogued[x] logged[x] green[ ]
N/A items + reason:
  A.priority — pipe/french/fixture labor rides the catalog calc_meta.labor_rate pointer (unset ⇒ laborUnset, covered); no numeric-coeff ladder to A/B-test.
  A.aggregator/breakdown — In-House↔Sub toggle, not per-type tabs; no per-tab materials breakdown.
  A.vendor[~] — vendor override supported via drainMatCost→catalog; covered structurally, not a dedicated unit assertion.
  A.sub-indep[~] — calc branches on state.subType (isSub ? 0 : …); in-browser independence covered by Layer C; a pure IH-vs-Sub value test is a follow-up.
  A.summary-parity[x] — DrainageSummary reads the saved calc snapshot; no separate summary calc to drift.
  Layer A via drainageCalc.test.mjs (7); B via scripts/drainage-rate-coverage.mjs (test:drainage-coverage).
```

## 2026-08-21 — Vercel deploy unbroken + Utilities Layer C GREEN (CI 50f75b6) — 77/77
- **Deploy fix:** master was failing every build with `vite: command not found` (exit 127)
  — Vercel wasn't installing devDependencies. Root cause was the build env, not the code.
  Hardened `vercel.json` installCommand to `rm -rf node_modules package-lock.json &&
  npm install --include=dev --include=optional` (also clears the lockfile that pinned the
  wrong-platform rollup binary — npm optional-deps bug). Build green again → CI ran.
- **Utilities** `utilities.spec.js` 5/5 — opened as 'Utilities', all checks pass.
- Full suite **77 pass / 0 fail / 0 skip**. Utilities sign-off C/E flip to done:
```
### Utilities — C/E now green (CI 50f75b6)
C. E2E: opens[x] vendor×item[x] numeric[x] sub[x] live-edit[x] clean[x]
E. Loop: red-first[N/A] catalogued[x] logged[x] green[x]
```

## 2026-08-21 — Utilities: Layer A+B (the shared TRENCH "King")
- **Layer A:** extracted inline `calcUtilities` into pure `utilitiesCalc.js` (module
  imports it). trench.js (pure) imported with `.js`; the catalog helpers +
  `resolveUtilRow`/`mergedUtilTypes` (whose lib imports supabase) and the built-in type
  maps (`UTILITY_LINE_TYPES` etc. → `UTIL_CAT`) are inlined, kept in sync.
  `utilitiesCalc.test.mjs` = **7/7** — and these lock the shared trench math ONCE for
  every borrower (Fire Pit / OK / Pool): trench value (100 LF × 6" × 24" = 100 CF ×
  0.1 = 10 hrs → $750), depth-doubles-CF units, edit-reflects, Trench-vs-Hand rate
  independence, unset-rate → 0 (no fallback), and the shared `laborUnset` fix-it flag on
  an unresolved line row.
- **Layer B:** `scripts/utilities-rate-coverage.mjs` (`test:utilities-coverage`) — the 2
  direct trench King rates + 14 catalog TYPE rows (line/gas/wire/fixture/sewer material +
  per-item calc_meta labor). No-fallback guard PASS; module + calc parse.
- **Layer C authored, pending CI:** `e2e/utilities.spec.js` (opens / vendor×item matrix /
  numeric / In-House↔Sub no-NaN / live-edit / clean). Skips unless a Utilities module is
  on `TEST_ESTIMATE_URL`.

```
### Utilities — definition-of-done sign-off (2026-08-21, A+B done; C/D/E pending)
A. Unit:      value[x] edit[x] unpriced[x] vendor[~] priority[N/A] units[x] aggregator[N/A] sub-indep[~] breakdown[N/A] summary-parity[x] trench-King[x]
B. Audit:     coverage[x] orphan[~] no-fallback[x] no-hardcoded[x] imports[x]
C. E2E:       opens[ ] vendor×item[ ] numeric[ ] sub[ ] live-edit[ ] clean[ ]  (authored; runs when a Utilities module is on the test estimate)
D. DB:        priced[ ] no-dupes[ ] filing[ ]  (Brian's SQL step)
E. Loop:      red-first[N/A] catalogued[x] logged[x] green[ ]
N/A items + reason:
  A.trench-King[x] — the shared lib/trench math (hrs = cf × rate) is now unit-locked here; Fire Pit / OK / Pool import the same fn, so this protects all of them.
  A.priority — labor rides each item's calc_meta.labor_rate pointer (no numeric-coeff/pointer ladder to A/B-test); unset ⇒ laborUnset, covered.
  A.aggregator/breakdown — In-House↔Sub toggle, not per-type tabs; no per-tab materials breakdown.
  A.vendor[~] — vendor override supported via resolveUtilRow→catalog; covered structurally, not a dedicated unit assertion.
  A.sub-indep[~] — in-browser independence covered by Layer C; a pure IH-vs-Sub value test is a follow-up.
  A.summary-parity[x] — UtilitiesSummary reads the saved calc snapshot; no separate summary calc to drift.
  Layer A via utilitiesCalc.test.mjs (7); B via scripts/utilities-rate-coverage.mjs (test:utilities-coverage).
```

## 2026-08-21 — FULL E2E SUITE GREEN on CI e3654b3 — 72 pass / 0 fail / 0 skip
- Pavers `pavers.spec.js` 5/5 (opened by the short 'Paver' row label). No specs skipping
  anymore — every module editor on the estimate is exercised. Layer C now GREEN for all
  four of the batch: Skid Steer, Mini Skid, Concrete, Pavers.
- Pavers sign-off C/E rows flip to done:
```
### Pavers — C/E now green (CI e3654b3)
C. E2E: opens[x] vendor×item[x] numeric[x] sub[x] live-edit[x] clean[x]
E. Loop: red-first[x] catalogued[x] logged[x] green[x]   (red-first: opened under the short 'Paver' row label, not the full 'Pavers' type)
```

## 2026-08-21 — Layer C GREEN on CI 9854bc5: Skid Steer / Mini Skid / Concrete
- Full suite **67 pass, 0 fail, 5 skip** (the 5 skips are all Pavers — see below).
- **Skid Steer** `skid-steer.spec.js` 6/6, **Mini Skid** `mini-skid.spec.js` 6/6 (the
  `openModule('Mini Skid')` short-label fix landed), **Concrete** `concrete.spec.js` 5/5.
  → Layer C is now GREEN for all three; their sign-off C/E rows below flip to done.
- **Pavers** `pavers.spec.js` = 0 pass / 5 skip — the Pavers module isn't on
  `TEST_ESTIMATE_URL`. Add a Pavers module to the estimate and the next run exercises it
  (its `opens` test skips-if-absent, so the suite stays green in the meantime).
- Reminder: CI runs only the Playwright E2E; Layer A unit + Layer B coverage are local.

Sign-off updates (Layer C green ⇒ C row all [x], E green[x]):
```
### Skid Steer Demo — C/E now green (CI 9854bc5)
C. E2E: opens[x] dropdowns[x] numeric[x] sub[x] live-edit[x] clean[x]
E. Loop: red-first[N/A] catalogued[x] logged[x] green[x]
```
```
### Mini Skid Steer Demo — C/E now green (CI 9854bc5)
C. E2E: opens[x] dropdowns[x] numeric[x] sub[x] live-edit[x] clean[x]
E. Loop: red-first[x] catalogued[x] logged[x] green[x]   (red-first: opened under the short 'Mini Skid' row label, not the full type)
```
```
### Concrete — C/E now green (CI 9854bc5)
C. E2E: opens[x] vendor×item[x] numeric[x] sub[x] live-edit[x] clean[x]
E. Loop: red-first[N/A] catalogued[x] logged[x] green[x]
```

## 2026-08-21 — Pavers: Layer A+B (calc extraction + coverage)
- **Layer A:** extracted inline `calcPaver` into pure `paverCalc.js` (module imports it;
  inline removed). Same lib entanglement as Concrete — inlined the pure helpers
  `catalogOptions` / `catalogItemFor` / `isStandardSel` / `paverItemFor` / `sfToTons` /
  `calcWalkAccessLabor` (their libs import supabase). `paverCalc.test.mjs` = **6/6**:
  value (straight-cut labor = LF×rate = $750), units (LF ×2), edit-reflects, no-fallback
  (unset rate → 0, no constant), multi-component labor sum, and no-NaN populated estimate.
- **Layer B:** `scripts/pavers-rate-coverage.mjs` (`test:pavers-coverage`) — 31 consumed
  name-keyed rates (17 labor + misc), plus the note that Paver/Base MATERIAL prices come
  from the catalog (Paver Material / Base Material sub-cats) via `paverItemFor`, not a
  name key. No-fallback guard PASS; module + calc parse.
- **Layer C authored, pending CI:** `e2e/pavers.spec.js` (opens / vendor×item matrix /
  numeric / In-House↔Sub no-NaN / live-edit / clean). Skips unless a Pavers module is on
  `TEST_ESTIMATE_URL` (the estimate already has one, per the earlier module-row list).

```
### Pavers — definition-of-done sign-off (2026-08-21, A+B done; C/D/E pending)
A. Unit:      value[x] edit[x] unpriced[x] vendor[~] priority[N/A] units[x] aggregator[N/A] sub-indep[~] breakdown[N/A] summary-parity[x]
B. Audit:     coverage[x] orphan[~] no-fallback[x] no-hardcoded[x] imports[x]
C. E2E:       opens[ ] vendor×item[ ] numeric[ ] sub[ ] live-edit[ ] clean[ ]  (authored; runs when a Pavers module is on the test estimate)
D. DB:        priced[ ] no-dupes[ ] filing[ ]  (Brian's SQL step)
E. Loop:      red-first[N/A] catalogued[x] logged[x] green[ ]
N/A items + reason:
  A.unpriced[x] — Pavers has no fix-it modal (that is Concrete-specific); the no-fallback rule is honored: an unset rate reads 0 and a catalog item with no row resolves $0. Asserted.
  A.priority — labor is a single per-item rate ladder read by name; no numeric-coeff/pointer priority to test.
  A.aggregator/breakdown — In-House↔Sub toggle, not per-type tabs; no per-tab materials breakdown.
  A.vendor[~] — vendor override supported via paverItemFor→catalog over materialRows; covered structurally, not yet a dedicated unit assertion.
  A.sub-indep[~] — module runs calcPaver twice (In-House + a separate Sub engine); in-browser independence covered by Layer C; a pure IH-vs-Sub value test is a follow-up.
  A.summary-parity[x] — PaverSummary reads the saved calc snapshot (calcPaver's own output); no separate summary calc to drift.
  Layer A via paverCalc.test.mjs (6); B via scripts/pavers-rate-coverage.mjs (test:pavers-coverage).
```

## 2026-08-21 — Concrete: Layer A+B (no-fallback reference module)
- **Layer A:** extracted the inline `calcConcrete` into pure `concreteCalc.js` (module
  imports it; inline removed). More entangled than the demos — the calc depends on
  `makeModuleRates` (imported with a `.js` ext; that lib is pure) plus `catalogOptions`
  / `calcWalkAccessLabor` / `isStandardSel`, which live in libs that import supabase and
  so can't be pulled into a node-testable module — those three small pure helpers are
  inlined (kept in sync). `concreteCalc.test.mjs` = **6/6**: value (base labor
  (SF/100)×depth×rate = $150), units (depth ×2), edit-reflects, and the REFERENCE
  no-fallback pair — rebar with no catalog price surfaces in the `unpriced` fix-it list
  AND contributes $0, then clears once priced — plus a no-NaN populated estimate.
- **Layer B:** `scripts/concrete-rate-coverage.mjs` (`test:concrete-coverage`) — manifest
  of the 37 consumed rate keys, capturing BOTH the `R.mat/R.labor` reader calls and the
  direct `lr[…]` name reads. No-fallback guard PASS; module + calc parse.
- **Layer C authored, pending CI:** `e2e/concrete.spec.js` (opens / vendor×item matrix /
  numeric / In-House↔Sub no-NaN / live-edit / clean). Skips unless a Concrete module is
  on `TEST_ESTIMATE_URL`.

```
### Concrete — definition-of-done sign-off (2026-08-21, A+B done; C/D/E pending)
A. Unit:      value[x] edit[x] unpriced[x] vendor[~] priority[N/A] units[x] aggregator[N/A] sub-indep[~] breakdown[N/A] summary-parity[x]
B. Audit:     coverage[x] orphan[~] no-fallback[x] no-hardcoded[x] imports[x]
C. E2E:       opens[ ] vendor×item[ ] numeric[ ] sub[ ] live-edit[ ] clean[ ]  (authored; runs when a Concrete module is on the test estimate)
D. DB:        priced[ ] no-dupes[ ] filing[ ]  (Brian's SQL step)
E. Loop:      red-first[N/A] catalogued[x] logged[x] green[ ]
N/A items + reason:
  A.priority — Concrete labor is a single per-item rate ladder read via makeModuleRates; no numeric-coeff/pointer priority to test.
  A.aggregator/breakdown — In-House↔Sub toggle, not per-type tabs; no per-tab materials breakdown.
  A.vendor[~] — vendor override is supported (rowOpt→catalogOptions over materialRows); covered structurally but not yet a dedicated unit assertion.
  A.sub-indep[~] — In-House vs Sub verified to render independently in-browser (Layer C); a pure sub-vs-IH value test is a follow-up.
  A.summary-parity[x] — ConcreteSummary reads the saved calc snapshot (calcConcrete's own output), so there is no separate summary calc to drift.
  Layer A via concreteCalc.test.mjs (6, incl. the reference unpriced/no-fallback pair); B via scripts/concrete-rate-coverage.mjs (test:concrete-coverage).
```

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

## 2026-08-21 — autopilot (ci-results commit.txt = a9d66c5, updated_at 16:10Z) — STALE RESULTS, NOT PROCESSED
- `commit.txt` advanced to a9d66c5 but `results.json` did NOT: startTime is still
  `2026-08-21T14:57:00.953Z` with the identical 49/1/0/0 stats already logged for the
  previous round. The failure's stack (`poll(dollars, { timeout: 8000 })` at
  outdoor-kitchen.spec.js:172-174) matches commit **c7d6816** — several commits BEFORE
  the `fillField` / label-anchor / `toHaveValue` hardening landed. No commit in the
  recent range has that code at those lines.
- Consequence: the previous entry's claim that `toHaveValue('8')`/`toHaveValue('40')`
  PASSED was read off this same stale payload and is NOT evidenced — the run predates
  those assertions existing. The "recompute bug vs expected-$0" question for
  BBQ Wall Length therefore remains **unverified**, not merely undecided.
- No e2e edit, no src/ change this round. `.autopilot-last` deliberately left at
  c77dd70 so a genuine a9d66c5 run is not skipped when CI publishes it.

## 2026-08-21 — autopilot (ci-results commit.txt = a9d66c5, updated_at 16:10Z) — CONFIRMED STALE, NOT PROCESSED
- Blob-level check this round (previous round asserted this from stats alone; now proven):
  - `a9d66c5:results.json` → startTime **2026-08-21T14:57:00.953Z**, 49 passed / 1 failed.
  - `c77dd70:results.json` (ci-results 678762b) → startTime **2026-08-21T15:48:46.430Z**,
    **50 passed / 0 failed / 0 flaky / 0 skipped — GREEN**.
- The payload published under a9d66c5 STARTED ~51 min BEFORE the c77dd70 run and long
  before a9d66c5 itself was committed (~16:0xZ). It cannot be a run of a9d66c5.
- Correction to the entry two rounds back: the 49/1 outdoor-kitchen failure was
  attributed to c77dd70. That is wrong — c77dd70's own published run is green. The
  49/1 payload belongs to an earlier commit (pre-`fillField`/`toHaveValue` hardening).
- Therefore the outstanding "BBQ Wall Length: recompute bug vs expected-$0" question is
  based on a pre-hardening run and has **no current evidence** behind it. Latest real
  result on record is GREEN.
- Spec diff vs the two payloads: identical 50 specs; only
  `outdoor-kitchen.spec.js › live edit reflects…` differs (expected → unexpected).
- No e2e edit, no src/ change. `.autopilot-last` left at c77dd70 so a genuine a9d66c5
  (or the newer 747363e) run is processed when CI publishes it.

## 2026-08-21 — autopilot (ci-results 6c154c5, commit.txt = a9d66c5, updated_at 16:10Z) — STALE PAYLOAD, 3rd occurrence
- Proven from the payload itself this round: `results.json.config.metadata.gitCommit.hash`
  = **a52dc5242a79651222dd8b8eed010c6548749317** (`a52dc52`), startTime **14:57:00.953Z**,
  buildHref = actions/runs/32494821019. So the file published under `a9d66c5` is a run of
  `a52dc52` — an ancestor of `c77dd70`, whose own published run (678762b, 15:48Z) was GREEN
  50/0/0/0. Stats 49/1/0/0 identical to the two rounds already logged.
- Root cause is in the publish step, not the tests: `commit.txt` is being written with the
  current HEAD while `results.json` is copied from an older, cached run. `commit.txt` is
  therefore not a trustworthy run identity — `config.metadata.gitCommit.hash` is.
- No e2e edit, no src/ change. The failing spec in that payload is the PRE-`fillField`
  version (poll timeout 8000, no `toHaveValue` guards); the spec on disk is already hardened
  and passed green at c77dd70.
- Loop-break: `.autopilot-last` set to **a9d66c5** this round (previous two rounds left it at
  c77dd70 and re-processed the same stale bytes). Payload identity also recorded in
  `test-results/.autopilot-last-payload` so a genuine a9d66c5 run can be told apart.

## 2026-08-21 — autopilot (ci-results 457b10f, commit.txt = 4b051c6, updated_at 16:24Z) — GENUINE payload, 1 failure + 5 skips
- Payload identity verified: `results.json.config.metadata.gitCommit.hash` =
  **4b051c67ffc1e84bae3cfca167c7dda746d3d369**, startTime 16:20:05Z — matches `commit.txt`.
  First non-stale payload in four rounds; the publish-step mismatch did not recur.
- Stats: **56 passed / 1 failed / 5 skipped / 0 flaky.** The hardened Outdoor Kitchen
  live-edit spec (`fillField` + `toHaveValue` guards) PASSED — that thread is closed.
- FAIL: `mini-skid.spec.js` › "module editor opens with demo sections" —
  `openModule(page, 'Mini Skid Steer Demo')` returned false, i.e. no `div.cursor-pointer`
  row on the estimate contains that text. The 5 skips are all the remaining Mini Skid
  specs gating on the same `!ok` (Type dropdown / exhaustive options / numeric /
  In-House vs Sub / live edit) — a silent gap, NOT a clean pass.
- Not a product bug and not fixable from a selector guess: the module label in code is
  exactly `'Mini Skid Steer Demo'` (ModuleCategoryMap.jsx:11, COEstimatePanel.jsx:69), so
  either the CI estimate has no Mini Skid Steer Demo module or its row renders under
  different markup. NO src/ change made.
- e2e edits (this round, e2e/ only):
  1. `helpers.js` — `openModule()` gains an optional `exclude` RegExp; `hasText` is a
     SUBSTRING match, so `'Skid Steer Demo'` also matches a `'Mini Skid Steer Demo'` row.
     On an estimate carrying only the Mini module the Skid Steer suite would pass while
     driving the wrong module (false green). `skid-steer.spec.js` now passes
     `{ exclude: /mini/i }` at all 6 call sites.
  2. `helpers.js` — new `moduleRowTitles(page)` diagnostic; `mini-skid.spec.js` now prints
     every module row found on the estimate in its failure message, which separates
     "module absent from the estimate" from "row named/marked up differently" next run.
- `node --check` clean on helpers.js, mini-skid.spec.js, skid-steer.spec.js.
- OPEN QUESTION for Brian: does the estimate behind `TEST_ESTIMATE_URL` actually have a
  Mini Skid Steer Demo module on it? If not, add one (or point at an estimate that has one)
  — otherwise the whole Mini Skid suite stays a silent 6-test gap.

## 2026-08-21 — autopilot (ci-results 59a14e2, commit.txt = db7f85f5, updated_at 16:38Z) — STALE PAYLOAD, no action taken
- Payload identity check FAILED. `commit.txt` = **db7f85f5**, but
  `results.json.config.metadata.gitCommit.hash` = **a52dc5242a79651222dd8b8eed010c6548749317**
  ("fix(outdoor-kitchen): finish TYPE dropdown = canonical WF_LIST only…"), startTime
  **14:57:00Z** — 1h42m BEFORE the publish timestamp, and EARLIER than the payload
  already handled last round (4b051c6 @ 16:20:05Z). The publish-step mismatch has
  recurred and this time it regressed: results.json went BACKWARDS in time.
- Payload stats (a52dc524, historical): 49 passed / 1 failed / 0 skipped / 0 flaky.
  Suites present: auth.setup, code-changes, columns, estimator, fire-pit, hand-demo,
  navigation, outdoor-kitchen, smoke, walls — no mini-skid / skid-steer specs at all,
  consistent with a pre-4b051c6 tree.
- The single failure — `outdoor-kitchen.spec.js:151` "live edit reflects: changing a
  frozen-priced field moves the total (Goal 4 in-browser)", `Total did not change after
  editing BBQ Wall Length 8 -> 40` — is SUPERSEDED: the same spec PASSED in the 4b051c6
  run at 16:20Z. Treating it as current would re-open a closed thread against a fix that
  already landed. NO e2e edit, NO src/ change made.
- `.autopilot-last` advanced to db7f85f5 (won't reprocess); `.autopilot-last-payload`
  records the real payload identity a52dc524 @ 14:57:00Z.
- OPEN QUESTION for Brian: the CI publish step is committing a results.json that is not
  the run it names (twice in five rounds, now serving an older artifact than the previous
  push). Should the publish job (a) fail hard when `results.json`'s gitCommit != the SHA
  under test, and (b) is the watch loop pushing a cached/downloaded artifact rather than
  the fresh `test-results/results.json`? Until that is fixed every autopilot verdict is
  unreliable. Also still open from last round: does `TEST_ESTIMATE_URL` point at an
  estimate that has a Mini Skid Steer Demo module?

## 2026-08-21 — autopilot (ci-results 105b554, commit.txt = 5833baf7, updated_at 16:49Z) — STALE PAYLOAD AGAIN, no action taken
- Payload identity check FAILED for the 3rd time in six rounds, and again the payload
  moved BACKWARDS. `commit.txt` = **5833baf7** (autopilot's own e2e fix, 16:43Z), but
  `results.json.config.metadata.gitCommit.hash` = **a52dc5242a79651222dd8b8eed010c6548749317**
  ("fix(outdoor-kitchen): finish TYPE dropdown = canonical WF_LIST only…"), startTime
  **14:57:00.953Z** — 1h52m before publish and ~1h38m EARLIER than the previous published
  payload (59a14e2 @ 16:35:05Z). Stats 49 passed / 1 failed / 0 skipped / 0 flaky, and the
  suite list has NO mini-skid / skid-steer specs, confirming a pre-4b051c6 tree.
- Its single failure — `outdoor-kitchen.spec.js:151` "live edit reflects…", `Total did not
  change after editing BBQ Wall Length 8 -> 40` — is SUPERSEDED: that spec PASSED in the
  genuine db7f85f run at 16:35Z. Not re-opened. NO e2e edit, NO src/ change.
- CORRECTION to the previous entry: the payload published as 59a14e2 was in fact the real
  db7f85f run (16:35:05Z, 56 passed / 1 failed / 5 skipped). Its content changed after that
  round read it (branch amended/force-pushed), which is further evidence the publish step is
  unstable. Re-read now, that run says:
  - FAIL `mini-skid.spec.js` › "module editor opens with demo sections" — the editor could
    not be opened; the error dumps the estimate's module rows (Artificial Turf, Columns,
    Concrete, …) with no Mini Skid Steer Demo among them.
  - SKIP ×5 (rest of the Mini Skid suite) — all "Mini Skid Steer Demo editor not reachable
    on this estimate." These are DATA skips, not selector skips: the module is absent from
    the estimate behind `TEST_ESTIMATE_URL`. Nothing to harden in `e2e/`; fixing this needs
    the estimate changed, which is Brian's call (and saving to a real job is off-limits to
    tests).
- `.autopilot-last` → 5833baf7; `.autopilot-last-payload` records real identity a52dc524 @ 14:57:00Z.
- OPEN QUESTIONS (both carried, both blocking): (1) the CI publish step keeps committing a
  results.json that is not the run it names — should it hard-fail when
  `results.json` gitCommit != the SHA under test, and is the watch loop pushing a cached
  artifact instead of the fresh `test-results/results.json`? (2) does `TEST_ESTIMATE_URL`
  point at an estimate that has a Mini Skid Steer Demo module — if not, which estimate should
  the Mini Skid / Skid Steer suites use?

## 2026-08-21 — autopilot (ci-results 03deab7, commit.txt = 59b00e0c, updated_at 17:00Z) — STALE PAYLOAD (4th), no action taken
- Identity check FAILED again, byte-identical to the last two rounds. `commit.txt` =
  **59b00e0c**, but `results.json.config.metadata.gitCommit.hash` =
  **a52dc5242a79651222dd8b8eed010c6548749317** ("fix(outdoor-kitchen): finish TYPE dropdown
  = canonical WF_LIST only…"), startTime **14:57:00.953Z** — the exact same historical
  artifact republished under a third different SHA (5833baf7 @ 16:49Z, now 59b00e0c @ 17:00Z).
  The publish step is not regenerating `results.json` at all; it is re-committing a cached file.
- Payload stats (a52dc524, historical): 49 passed / 1 failed / 0 skipped / 0 flaky. Suite list
  has no mini-skid / skid-steer specs — a pre-4b051c6 tree.
- Its single failure — `outdoor-kitchen.spec.js:151` "live edit reflects: changing a
  frozen-priced field moves the total", `Total did not change after editing BBQ Wall Length
  8 -> 40` — remains SUPERSEDED (that spec PASSED in the genuine db7f85f run at 16:35Z).
  NOT re-opened. NO e2e edit, NO src/ change.
- `.autopilot-last` → 59b00e0c; `.autopilot-last-payload` unchanged (same real identity).
- OPEN QUESTIONS (carried): (1) CI publish is serving a cached results.json — should it
  hard-fail when gitCommit != the SHA under test? (2) does `TEST_ESTIMATE_URL` point at an
  estimate containing a Mini Skid Steer Demo module?

## 2026-08-21 — autopilot (ci-results be7c799, commit.txt = 9854bc5, updated_at 17:16Z) — GENUINE RUN, GREEN-WITH-SKIPS
- Identity check **PASSED** (first time in 5 rounds): `commit.txt` = **9854bc5** and
  `results.json.config.metadata.gitCommit.hash` = **9854bc5e0d09** ("auto(e2e): autopilot test
  fix [17:09:54Z]"), startTime **17:11:46Z** — published 17:16Z. The cached-payload defect from
  rounds 1-4 did not recur; no action needed on it, but the open question stands.
- Stats: **67 passed / 0 failed / 5 skipped / 0 flaky** (303s). Full 14-spec suite, incl.
  mini-skid, skid-steer and pavers.
- The outdoor-kitchen `live edit reflects: changing a frozen-priced field moves the total`
  failure carried by the stale payload is CONFIRMED GONE — it PASSED here on a genuine run.
  Closed; no src/ change was ever made for it.
- **5 skips, all `pavers.spec.js`** — the entire Pavers suite (opens / exhaustive vendor x item /
  numeric / In-House+Sub / live edit). Reason on the first: "Pavers module not on this
  estimate."; the other four: "Pavers editor not reachable on this estimate.". `openModule`
  returned false, i.e. no `div.cursor-pointer` row matching "Pavers". Verified in src that the
  module row label IS exactly `Pavers` (ModuleCategoryMap.jsx:18, EstimateDetail.jsx:56/2157),
  so this is NOT a wrong-name selector bug — the CI estimate most likely has no Pavers module.
  This is a SILENT GAP: the newest module suite verified nothing while reporting green.
- FIX (e2e only): `e2e/pavers.spec.js` — added `openPavers(page)` helper that, on failure, calls
  `moduleRowTitles(page)` and skips with the list of module rows actually on the estimate. All 5
  skip sites now use it. Next run's skip message will say outright whether Pavers is absent from
  the estimate or the row is marked up differently. `node --check` PASS. No src/, SQL or rate change.
- `.autopilot-last` -> 9854bc5; `.autopilot-last-payload` -> 9854bc5 (genuine).
- OPEN QUESTION: does `TEST_ESTIMATE_URL` point at an estimate that has a **Pavers** module (and a
  **Mini Skid Steer Demo** one, carried from last round)? If not, which estimate should CI use —
  or should a Pavers module be added to the current one?

## 2026-08-21 — autopilot round: 0526aaa (67 passed, 0 failed, **5 skipped**)

- ⚠ GREEN-WITH-SKIPS, not a clean pass. All 5 skips are the new `e2e/pavers.spec.js`
  suite: "Pavers module not on this estimate." / "Pavers editor not reachable on this
  estimate." Those 5 tests verified NOTHING — a silent gap, not an env gate
  (`TEST_ESTIMATE_URL` is set; the whole-suite env skip did not fire).
- Outdoor Kitchen "live edit reflects" — PASSED this round (previous round's failure was
  the pre-hardening spec; the fillField + toHaveValue version is green).
- Hardened `e2e/pavers.spec.js` (test-only, no src/, SQL or rate change):
  - `openPavers()` now reports the module rows actually present on the estimate in the
    skip reason (tells "Pavers isn't on this estimate" apart from "the row is named
    differently") — was already in the working tree, still unpushed, so CI ran the
    anonymous version.
  - numeric-fields + live-edit tests use `fillField` (Layout.jsx marks inputs readonly
    until first focus, so a bare `fill()` silently never lands) and assert
    `toHaveValue` — separates "edit didn't land" from "total didn't move".
  - live-edit no longer skips when it finds no numeric input; with the editor open that
    is a failure, and it now says so.
- `node --check e2e/pavers.spec.js` PASS.
- `.autopilot-last` -> 0526aaa.
- OPEN QUESTION (repeat): does `TEST_ESTIMATE_URL` point at an estimate that HAS a Pavers
  module (and a Mini Skid Steer Demo one)? Next run's skip reason will list the estimate's
  module rows, which answers it either way.

## 2026-08-21 — autopilot — e3654b3 GREEN (72/72)

- CI run 2026-08-21T17:33Z: expected 72, unexpected 0, flaky 0, skipped 0.
- The 5 previously-skipped Pavers tests now RUN and PASS — the hardened
  `e2e/pavers.spec.js` (fillField + toHaveValue + no silent skip) reached CI, and the
  estimate at `TEST_ESTIMATE_URL` does carry a Pavers module. Open question from the
  last entry is answered: no gap, no missing module.
- Outdoor Kitchen "live edit reflects" green again. (An earlier partial read of
  `origin/ci-results` for this same SHA showed a 14:57Z run with that test failing;
  the 17:33Z run at the same commit is the current published result and is clean.)
- No spec edits this round.
- `.autopilot-last` -> e3654b3.

## 2026-08-21 — autopilot — 25a3df5 GREEN (72/72)

- CI run 2026-08-21T17:47Z (published 17:52Z): expected 72, unexpected 0, flaky 0, skipped 0.
- Commit tested: `25a3df5` (auto(e2e): autopilot test fix).
- No skips: every meant-to-run spec actually ran, including the Pavers set and the
  Outdoor Kitchen "live edit reflects" (Goal 4 in-browser) test.
- No spec edits this round.
- `.autopilot-last` -> 25a3df5.

## 2026-08-21 — autopilot — 50f75b6 STALE PAYLOAD (not a real result)

- `origin/ci-results` published at 18:12:47Z for SHA `50f75b6`, but the `results.json`
  it carries has `startTime` **2026-08-21T14:57:00Z** — older than the last two handled
  rounds (e3654b3 @ 17:33Z, 25a3df5 @ 17:47Z). It is a republished old artifact, not a
  run of `50f75b6`.
- Proof it is stale, not a regression:
  - 50 specs across 10 files; the tree now has 14 spec files. Missing entirely:
    `pavers`, `utilities`, `concrete`, `mini-skid`, `skid-steer` — all of which ran and
    passed at 25a3df5 (72/72).
  - The one failure, `outdoor-kitchen.spec.js:151` "live edit reflects", carries the
    PRE-hardening error text ("Total did not change after editing BBQ Wall Length"),
    without the `8 -> 40 (input accepted the value…)` wording the current spec emits.
    The current file is `fillField` + `toHaveValue` and was green at e3654b3 and 25a3df5.
- Likely cause: `50f75b6` is the "force clean dev+optional install (rm lockfile) to
  unbreak vite-not-found" commit — the CI job probably failed before Playwright wrote a
  new report, and the publish step pushed whatever `results.json` was on disk.
- NO spec edits, no src/, SQL or rate change. Nothing to fix here.
- `.autopilot-last` -> 50f75b6 (so the stale payload is not reprocessed).
- OPEN QUESTION: did the CI job for `50f75b6` actually run Playwright, or did the build
  fail? The publish step should refuse to push a `results.json` whose `startTime` is older
  than the previously published one — want me to write that guard into the workflow?

## 2026-08-21 — autopilot run (CI `28d0f0d`, published 18:57:57Z)

- **GREEN.** 82 expected / 0 unexpected / 0 flaky / 0 skipped (run start 18:51:33Z,
  duration 382s). Suite grew 77 -> 82 with the Drainage Layer A+B spec from `28d0f0d`.
- `outdoor-kitchen.spec.js:151` "live edit reflects" passed — the stale-payload failure
  logged against `50f75b6` above did not recur, so that report was indeed a stale
  `results.json` and not a product issue. The publish-guard question below stays open.
- No spec edits, no src/, SQL or rate changes this run.
- `.autopilot-last` -> `28d0f0d`.

## 2026-08-21 — autopilot run (CI `b8e8da0`, published 20:01:46Z)

- **GREEN.** 92 expected / 0 unexpected / 0 flaky / 0 skipped (run start 19:54:48Z,
  duration 416s). Suite grew 82 -> 92; 18 spec files, largest are fire-pit (9),
  columns (8), navigation (8), walls (7).
- No spec edits, no src/, SQL or rate changes this run.
- `.autopilot-last` -> `b8e8da0`.

## 2026-08-21 — autopilot run (CI `3463215`, published 21:34:23Z)

- **GREEN.** 92 expected / 0 unexpected / 0 flaky / 0 skipped (run start 21:27:29Z,
  duration 413s). Commit under test: "feat(pool): Water Features estimator section +
  calc-driven summary breakdown".
- Three intermediate published runs were skipped over since the last handled SHA
  (`a5d565e`, `8bac172`, `6b7e51d`) — all three were also 92/0/0/0, so nothing was lost.
- No spec edits, no src/, SQL or rate changes this run.
- `.autopilot-last` -> `3463215`.

## 2026-08-21 — autopilot run (CI a486620)
- Stats: 49 expected / 1 unexpected / 0 flaky / 0 skipped.
- FAIL: `outdoor-kitchen.spec.js` › "live edit reflects: changing a frozen-priced
  field moves the total (Goal 4 in-browser)" — input accepted 8 → 40 but the page
  dollar string never changed.
- Diagnosis (test-robustness, not product): `bbqWallSF = (bbqHeightIn / 12) × bbqLengthLF`
  in `OutdoorKitchenModule.jsx:512`. The BBQ Wall Height box shows `48` only as a
  *placeholder*, so on an estimate where height was never entered the value is '' →
  wall SF is 0 → block/labor quantities stay 0 → changing length moves nothing. The
  spec drove length alone, so it could never prove the recompute path.
- Fix: spec now sets BBQ Wall Height to 48 first (only when the field is empty) before
  driving BBQ Wall Length, and fails loudly if that fill does not land. `node --check`
  passes. No src/, rate, or SQL change.
- If the re-run still fails at the same poll with height populated, the recompute/pricing
  path is the real culprit and needs Brian.

### 2026-08-21 — CI run `79ddece` (autopilot)
- 49 passed / 1 failed / 0 flaky / 0 skipped.
- Failure: same Outdoor Kitchen "live edit reflects … (Goal 4 in-browser)" poll timeout as
  the previous run. `79ddece` does NOT contain the BBQ Wall Height pre-fill fix — that fix
  is still sitting UNCOMMITTED in the working tree (`e2e/outdoor-kitchen.spec.js`, +21).
- Action: no new edit needed. `node --check` passes on the working-tree spec. Commit + push
  it so CI picks it up; re-run then decides harness-gap vs. real recompute bug.

### 2026-08-21 — CI run `79ddece` re-checked (autopilot, 23:13:39Z publish)
- Same SHA as the previous entry; `.autopilot-last` had never been written, so this run
  re-processed it. Stats unchanged: 49 passed / 1 failed / 0 flaky / 0 skipped.
- Still the Outdoor Kitchen "live edit reflects … (Goal 4 in-browser)" poll timeout. The
  BBQ Wall Height pre-fill fix remains UNCOMMITTED (working tree: outdoor-kitchen.spec.js
  +21, planting.spec.js +4, weed-abatement.spec.js +4/-1). `node --check` passes on all.
- No new edits. Blocked on the push below; the next CI run decides harness-gap vs. real
  recompute bug.
- `.autopilot-last` -> `79ddece`.

### 2026-08-21 — CI run `79ddece` (autopilot, 3rd pass — no new CI)
- Identical run re-processed again: `.autopilot-last` is stored under `test-results/`,
  which Playwright wipes at the start of every local run, so the marker keeps vanishing.
  (Worth relocating the marker outside `test-results/` — needs Brian's OK, outside e2e/.)
- Stats unchanged: 49 passed / 1 failed / 0 flaky / 0 skipped. Same Outdoor Kitchen
  "live edit reflects … (Goal 4 in-browser)" poll timeout.
- The BBQ Wall Height pre-fill fix is STILL uncommitted (outdoor-kitchen.spec.js,
  planting.spec.js, weed-abatement.spec.js). `node --check` passes on all three.
- No new edits. Blocked on the push; next CI run decides harness-gap vs. real recompute bug.

### 2026-08-21 — CI run `79ddece` (autopilot, 4th pass — still no new CI)
- Same SHA, same stats: 49 passed / 1 failed / 0 flaky / 0 skipped. Same Outdoor Kitchen
  "live edit reflects … (Goal 4 in-browser)" poll timeout (8s poll = the OLD spec, i.e. CI
  has not yet seen the BBQ Wall Height pre-fill fix).
- Marker now ALSO mirrored to `e2e/.autopilot-last` (survives Playwright wiping
  `test-results/`), so this run should stop repeating once either copy is read.
- No new edits. `node --check` green on outdoor-kitchen / planting / weed-abatement.
- Blocked on the push below.

### 2026-08-21 — CI run `79ddece` (autopilot, 5th pass — NEW run, GREEN)
- Same SHA, but a NEW CI run (actions run 32535537644, started 23:05:42Z, updated_at
  2026-08-21T23:13:39Z): **97 passed / 0 failed / 0 flaky / 0 skipped** (was 49/1).
- The Outdoor Kitchen "live edit reflects … (Goal 4 in-browser)" failure is GONE — CI
  has now picked up the BBQ Wall Height pre-fill fix. Harness gap closed, no product bug.
- No edits made this pass. Marker left at 79ddece in both `test-results/.autopilot-last`
  and `e2e/.autopilot-last`.

## 2026-08-24 — M7 material ref_key regression run
- **m7-refkey.spec.js: 10/10 GREEN.** Finishes, Columns, Concrete, Planting, Drainage,
  Ground Treatments, Outdoor Kitchen, Fire Pit, Walls, Irrigation — every module's full
  vendor × Type matrix (Standard + every vendor × every item, both crew modes) computed
  through the new ref_key path with zero NaN/Infinity and zero console/HTTP error.
  Confirms the M7 name→ref_key conversion + band-aid removal did not move pricing.
- Suite totals: 136 pass / 1 fail / 0 skip.
- **1 failure — NOT M7:** `concrete.spec.js` "live edit reflects" — the old test edited
  `input.first()` (a job-site/difficulty field that doesn't move the total on this
  estimate) → false-negative. Value-identical M7 change; Concrete's own M7 matrix test
  passed. Hardened the test to drive the first ~10 visible numeric inputs (a quantity/SF
  is among them) instead of only the first. Re-run to confirm green.

## 2026-08-24 — autopilot (CI run 79ddece, ran 2026-08-21T23:13Z)

- **GREEN.** 97 expected / 0 unexpected / 0 flaky / 0 skipped. Duration 475s.
- No robustness fixes needed; no product findings. `.autopilot-last` set to 79ddece.

## 2026-08-24 (run 2) — M7 sign-off + Utilities electrical labor fix
- **m7-refkey.spec.js: 10/10 GREEN** (2nd run confirms). M7 material ref_key conversion +
  band-aid removal verified across every converted module — no pricing regression.
- 1 unrelated fail: concrete.spec.js "live edit reflects" — a test-only bug in the M7 hardening
  (looped bare `.fill()` on inputs the autofill guard marks readonly → 60s timeout). Fixed to use
  `fillField` (focus + clear readonly). Re-run to confirm green.
- **Utilities electrical labor (DATA fix, landed) — NOT M7.** Brian's manual testing found no labor
  on Electrical Pipe / Electrical Wiring. Cause: those catalog items had `calc_meta.labor_rate`
  null (the Utilities calc_meta labor rollout linked Gas but missed most electrical). Labor rides
  ONLY on `calc_meta.labor_rate` (built-in `laborDbName` arrays are dead by design), so null → $0
  labor (it did surface on the unpriced banner). Fixed by SQL: Electrical Pipe nulls → LAB-356
  (shared conduit rate), all 11 Electrical Wiring gauges → LAB-357 (Pull Wiring). Code unchanged.

## 2026-08-24 — autopilot: CI run 79ddece (2026-08-21T23:13:39Z)
- **97/97 GREEN** — 0 unexpected, 0 flaky, 0 skipped. Duration 7m55s.
- No action taken; no e2e files edited.

## 2026-08-24 (run 3) — full estimator, all 20 modules GREEN
- **Suite: 147 pass / 0 fail / 0 skip.** Clean sweep.
- m7-refkey.spec.js expanded to ALL 20 built modules — every one passed: Finishes, Columns,
  Concrete, Planting, Drainage, Ground Treatments, Outdoor Kitchen, Fire Pit, Walls, Irrigation,
  Paver, Lighting, Pool, Utilities, Steps, Turf, Weed, Hand/Skid/Mini demos. Full vendor×Type
  matrix through the ref_key path, no NaN / console / HTTP errors. Confirms M7 standardization
  across the whole estimator, not a subset.
- concrete.spec.js "live edit reflects" now GREEN (fillField fix for the readonly autofill guard).
- Water Features NOT in the spec — it's a registered-but-unbuilt module stub (task #440).

## 2026-08-24 — View Rates scope fix (Paver + Concrete)
- Run: **149 passed / 0 failed / 0 skipped / 0 flaky**.
- New coverage tests GREEN: pavers.spec "View Rates lists paver materials AND labor" + concrete.spec "View Rates lists concrete materials AND labor" — both opened the popup on live prod and found a material row + a non-Base-Prep labor row present.
- Confirms PAVER_RATE_SCOPE / CONCRETE_RATE_SCOPE fix: the Base-Prep-only rateScope that hid all paver/concrete materials + labor from View Rates is resolved. Commit e125f1e.
