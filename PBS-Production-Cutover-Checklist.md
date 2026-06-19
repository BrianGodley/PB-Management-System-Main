# Picture Build — Production Cutover Checklist

Promotes the `saas-multitenant` branch (multi-tenant SaaS + marketing + Sales/Marketing IA + Funnels)
to **production**. Production DB = Supabase `jjlnpywpmoukgwmwczbz`; production site deploys from
`master` (domains: `pbs.picturebuild.com` = app, `picturebuild.com` = marketing).

**Golden rule:** the DB migration goes first and must finish clean, THEN the frontend merges. Never
merge `master` before the prod DB has the tenant tables + RPCs, or existing Picture Build users can
lose data visibility / fail to log in.

The whole sequence was already rehearsed on **staging** (`fgyexksqinjczebtsuon`), which is a pg_dump
copy of prod. Prod should behave the same — but it's live, so do it in a low-traffic window.

---

## Decisions to confirm before starting

1. **Public face.** After cutover, logged-out visitors to `picturebuild.com` / `pbs.picturebuild.com`
   see the **marketing site** (not the login screen). Logged-in users still get the app. OK to flip
   the public front door now? (If not, we hold the marketing-at-`/` commit.)
2. **Open signups.** `/signup` becomes live and creates real new tenants (beta mock-card, no real
   charge yet). Leave it open, or keep it unlinked/soft-gated until Helcim billing is live?
3. **Picture Build's plan.** PB will be set to **Tier 3 + Contractor** (all modules). Confirm.
4. **Maintenance window.** Pick a low-traffic time; optionally tell PB staff to expect a brief blip.

---

## Phase 0 — Pre-flight (no changes yet)

- [ ] **Full prod DB backup.** Supabase → Database → Backups: take a manual snapshot / confirm PITR is
      on. (Or `pg_dump` via the Session pooler.) **Do not proceed without a restore point.**
- [ ] Confirm staging ran all scripts below cleanly and PB-equivalent tenant sees all data there.
- [ ] Confirm prod Vercel **Production** env vars exist: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
      (prod values). Helcim vars can stay blank (beta payments are mocked; `BETA_PAYMENTS=true`).
- [ ] Have the exact run order (Phase 1) open and ready. **Exclude staging-only steps** — do NOT run
      any `drop schema public cascade`, the pg_dump grant re-fix, or staging-specific seed scripts.
- [ ] `git fetch && git log --oneline master..saas-multitenant` — review exactly what will merge.

---

## Phase 1 — Database migration on PROD (Supabase SQL editor, in this order)

Run each, verify, then move on. Stop immediately if any step errors.

- [ ] **1. `supabase-stageA-tenancy.sql`** — creates `tenants`, adds `tenant_id` to all tenant-scoped
      tables, inserts Picture Build as tenant #1, backfills every existing row's `tenant_id` to PB.
  - [ ] Verify: `tenants` has the Picture Build row.
  - [ ] Verify: no tenant-scoped table has NULL `tenant_id` (spot-check `clients`, `jobs`, `profiles`,
        `employees`).
  - [ ] **Verify EVERY existing profile has `tenant_id` = PB.** This is the single most important
        check — after RLS, a profile with a null tenant sees nothing.
        `select count(*) from profiles where tenant_id is null;` → must be **0**.
- [ ] **1b. `supabase-tenant-whitelabel.sql`** — adds `brand_name` / `brand_logo_url` to `tenants`.
      Must run **after** Stage A (it needs the `tenants` table — running it before fails with
      `relation "public.tenants" does not exist`). Already applied on staging.
- [ ] **2. `supabase-stageB-tenancy.sql`** — FK + NOT NULL on `tenant_id` + auto-fill trigger.
  - [ ] Verify: inserting a test row (then deleting it) auto-stamps `tenant_id`.
- [ ] **3. `supabase-plans-entitlements.sql`** — `plans` table + base `get_my_modules()`.
- [ ] **4. `supabase-billing-schema.sql`** — billing/price columns (safe if already partially present).
- [ ] **5. `supabase-tiers-packages.sql`** — tier1/2/3 + `packages` + `tenant_packages` +
      `provision_my_tenant()` + final `get_my_modules()`. Sets **PB → tier3 + contractor**.
  - [ ] Verify: `select id, plan_id from tenants;` → PB = `tier3`.
  - [ ] Verify: `select * from tenant_packages;` → PB has `contractor`.
  - [ ] Verify: `select public.get_my_modules();` (as an authed PB user) returns the full module list.
- [ ] **5b. `supabase-provision-baseline.sql`** — run **AFTER** tiers-packages (it redefines
      `provision_my_tenant` to the final version that ALSO seeds a `company_settings` row; running it
      before step 5 would get overwritten). It also: **drops the `single_row` CHECK constraint** on
      `company_settings` (the hard global-singleton guard — incompatible with one row per tenant) and
      **backfills** a `company_settings` row for every existing tenant. On prod this is essentially a
      no-op backfill (only PB exists, already has its row), but the constraint drop is required before
      any second tenant can be created.
  - [ ] Verify: `select cs.id, cs.tenant_id, t.name from company_settings cs join tenants t on t.id = cs.tenant_id order by cs.id;` → one row per tenant.
- [ ] **5c. `supabase-funnels-tenancy.sql`** — the funnels/funnel_stages/funnel_cards tables were
      created AFTER Stage A and missed tenant_id (would leak across tenants). Adds tenant_id +
      auto-fill trigger + NOT NULL + FK + tenant-scoped RLS. Needs Stage B. On prod the funnels tables
      are empty (feature not yet deployed there), so the backfill is a no-op; the policy swap is what
      matters. (Verified on staging.)
- [ ] **6. `supabase-payment-connections.sql`** — Layer 2 Helcim connected-accounts (inert until
      partner creds). Safe.
- [ ] **7. `supabase-funnels.sql`** — ALREADY RUN on prod. Re-running is safe (idempotent); skip if you
      know it's there.
  - [ ] Same for **`supabase-drive-label.sql`** — additive (`company_settings`), run on prod ahead of
        cutover; safe to re-run. Not order-sensitive.
- [ ] **8. `supabase-stageC-rls.sql`** — **LAST.** Enables RLS tenant isolation + `auth_tenant_id()`.
      This is the point of no return for data visibility. Only run after steps 1–5 verified.
  - [ ] **Immediately verify (you, logged in as a PB user): you still see all PB data.** Open the app
        against prod and load clients, jobs, HR. If anything is empty, STOP and disable RLS
        (`alter table <t> disable row level security;`) as a fast mitigation, then investigate.

> Note on `provision_my_tenant`: `supabase-tiers-packages.sql` defines the final version. If you also
> run `supabase-provisioning.sql`, run it **before** tiers-packages so the tiers version wins, or just
> skip it (tiers-packages is the source of truth).

---

## Phase 2 — Edge functions (deploy to prod Supabase)

Only the ones used by the new flows; the rest already exist in prod.

- [ ] Deploy `helcim-connect-webhook` and the `_shared` helpers (Layer 2 — inert without secrets).
- [ ] Deploy `drive-sync` if not already in prod.
- [ ] Helcim/Drive **secrets** can be added later — none are required for the beta launch.

---

## Phase 3 — Frontend: merge & deploy

- [ ] `git checkout master`
- [ ] `git merge saas-multitenant` (resolve any conflicts; this branch is 22 commits ahead).
- [ ] Re-confirm prod Vercel Production env vars (Phase 0).
- [ ] `git push origin master` → Vercel builds **Production**.
- [ ] Watch the deployment to **Ready**; confirm its commit = the merge.

**Why this is safe for existing PB users:** the entitlements layer fails open — if `get_my_modules`
returns the full set (PB = tier3+contractor), every module shows exactly as before. The app behaves
identically for PB; multi-tenancy is invisible to a single-tenant company.

---

## Phase 4 — Domains

- [ ] In Vercel, add apex **`picturebuild.com`** to this project (marketing front door).
- [ ] Keep **`pbs.picturebuild.com`** pointed at the app. (Same build; behavior differs by auth state —
      logged-out → marketing, logged-in → app.)
- [ ] Confirm DNS for the apex resolves and SSL is issued.

---

## Phase 5 — Post-cutover smoke test (on production)

- [ ] Log in as a PB user → lands in the app, all modules present.
- [ ] Open: Dashboard, **Sales** (Individuals/Companies/**Funnels**/Estimates/Bids/Past), **Marketing**
      (Individuals/Companies/Workflows/Website/Social), HR, Accounting, Jobs.
- [ ] **Funnels:** create a funnel + stages, add an opportunity, drag it between stages — persists.
- [ ] Create + edit a record in a couple of modules (clients, a job) — saves, still visible on reload.
- [ ] Logged-out: `picturebuild.com` shows the marketing site; `/welcome` works; "Go to app" appears
      when logged in.
- [ ] **Tenant isolation test:** sign up a throwaway tenant via `/signup`, confirm it lands in an
      **empty** workspace and cannot see any PB data. Then delete that test tenant.
- [ ] Mobile: PWA loads, menus render, no layout regressions.

---

## Rollback plan

- **Frontend:** in Vercel, "Promote to Production" the previous (pre-merge) deployment — instant
  revert of the site while you investigate.
- **Database (fast mitigation):** if RLS hides data unexpectedly, `alter table <table> disable row
  level security;` on the affected tables restores visibility without losing data (tenant_id columns
  are additive and harmless).
- **Database (full):** restore from the Phase 0 backup/snapshot. Tenant_id columns and new tables are
  additive, so a forward-fix is usually preferable to a full restore.
- Keep the Phase 0 backup for at least 7 days post-cutover.

---

## Key risks & why each is covered

| Risk | Mitigation |
|---|---|
| Existing PB users lose data after RLS | Phase 1 step 1 backfills every row + profile to PB; verified before Stage C; Stage C run last with an immediate visibility check |
| Login breaks because `get_my_modules` missing | Plans/tiers RPCs installed (steps 3–5) before the frontend merge; resolver fails open if a plan is ever null |
| Half-built multi-tenant code hits prod without DB | DB-first ordering; frontend merges only after Phase 1 verified |
| Public signup creates broken tenants | `provision_my_tenant` installed in prod (step 5); tested in Phase 5 |
| Marketing front door surprises PB staff | Decision #1 confirmed up front; logged-in users are unaffected |
| Bad deploy | Vercel instant rollback to prior production deployment |

---

## One-line summary of order

**Backup → Stage A → (verify profiles) → Stage B → plans → billing → tiers/packages → payment-conn →
Stage C (last) → verify PB sees data → deploy edge fns → merge `saas-multitenant`→`master` → push →
add apex domain → smoke test.**
