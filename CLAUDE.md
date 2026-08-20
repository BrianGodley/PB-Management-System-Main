# Working rules for this repo (non-negotiable)

These are hard rules, not suggestions. Follow them exactly. Before editing any
`calc*` function or rate/price resolution, state the rule you are applying first
("unset → modal, no fallback"), then write the code. If you skip that, you are
coding from momentum, not policy — stop and re-check.

## Pricing & rates

- **NO fallbacks.** Never resolve a material price, labor rate, or coefficient to
  a hardcoded constant, an inherited/"nearest type" value, or any silent default.
  An unset/zero rate MUST surface the unpriced fix-it modal (`UnpricedItemModal`,
  push to the module's `laborUnset` / unpriced list) so the user enters the real
  value, which writes back to the rate table. A read-only summary may show 0, but
  the live module always prompts. Do not reintroduce `?? CONST`, `?? houseUnit`
  with a constant, or `xTypeLabor()`-style inheritance.
- **Nothing hardcoded.** No material/labor/misc dollar values and no labor/qty
  coefficients in code. Everything is table-driven (`material` + `material_price`,
  `labor_rates`, `misc_rates`, `subcontractor_rates`). If you find a hardcoded
  value, move it to a rate table.
- A price resolver feeding `?? fallback` must return **null** (never 0) for an
  unpriced/placeholder row, or the fallback never fires.
- The calc reads `materialRows` from its `state` argument — the live React-state
  catalog must be merged in (`const state = { ...cur, materialRows }`) or every
  catalog price resolves null. Check this whenever a module shows $0 material.
- `material_rates` is STALE and being retired — never query it to judge
  correctness or run parity. Canonical model = `material` + `material_price` +
  subcategory. Fix missing data in the new model, never band-aid with a 'General'
  bucket.
- Labor values are **hours per unit** everywhere (`hours = qty × rate`), no
  production-rate divides. Exception: Utilities trench/hand excavation rates are
  stored in **minutes per Cu Ft** (÷60 in every consumer).

## Process

- **Finish every module in a class before starting anything else.** Migrations
  and updates cover the whole class first. Keep a running done / not-done ledger
  and show it. Never claim completion without verifying it.
- **Verify, don't guess.** Do not assert data, schema, or behavior without
  checking the code or running a query first. A narrow query result is not proof
  of a broad claim. If unsure, say so and check.
- Include a verification step (build/parse check, query, or test) before
  reporting any non-trivial change as done.

## Language & UI

- **Never say "catalog"** in chat or UI. Use "master material rates —
  standard / vendor / misc", "master labor rates", "master subcontractor rates".
  Only name the real DB tables (`material`, `material_price`, `labor_rates`,
  `misc_rates`, `subcontractor_rates`) when talking about DB/code.
- Unit abbreviations (display only): Sq Ft / Ln Ft / Each / Cu Yd / Cu Ft / Tons;
  `/` and `-` → "per". DB key names are untouched.
- Per-row material/type pickers start empty ("Select …"); unselected rows = $0.

## Git & SQL

- **Running git from the sandbox is allowed** (rule relaxed 2026-08-19). Read
  freely (`git log`, `git diff`, `git status`). Watch for Windows-mount lock
  errors; if a git write fails with a lock, back off and print the command instead.
- **Default is still: do NOT auto-commit.** After code edits, print the commit
  command for Brian to run — a ` ```powershell ` fenced block, one command per
  block, NO `cd` line, NO `+` prefix — UNLESS Brian explicitly asks you to commit,
  in which case you may run it from the sandbox.
- **Show changed SQL as inline plain ` ```sql ` blocks** (file name bolded above),
  wrapped across short lines so it copies clean — never one giant single-line
  UPDATE (it truncates on paste). Not `present_files` thumbnails.
- Single live prod env — Brian runs all SQL directly on prod. Still snapshot
  before irreversible ops.

## Testing context

- Saved / reopened estimates are **test data** (frozen rate snapshot). Do not gate
  changes on saved-estimate parity — only fresh-estimate correctness matters.

## Deploy

- Prod deploys from `master` via Vercel. Two Supabase DBs (staging + prod) with
  different tenant ids — run SQL on both when relevant. `qbwc` function must
  deploy with `--no-verify-jwt --use-api`.

## Edit-tool caution

- Large `Edit` writes (>100 lines) on this Windows mount can silently short-write.
  Verify with `wc -l` after, repair via Python in bash if needed.
