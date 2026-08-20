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

## Backlog (not yet written)
- Fire Pit cap + finish: after entry, BOTH material and labor are non-zero (the fix
  from Aug 2026) — needs interactive selectors from an estimate screenshot.
- Walls Modular: block math renders; a dimensionless product surfaces $0, not 8x8x16.
- Unpriced item surfaces the fix-it modal / $0, never a silent fallback.
