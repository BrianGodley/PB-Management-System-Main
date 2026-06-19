# Tenancy migration plan (company_id + RLS) — FOR REVIEW BEFORE RUNNING

This is the high-risk step (Step 2 in the framework spec). **Nothing here runs against live data until
you approve it.** It converts the single-company database into a multi-tenant one by adding a tenant id
to every business table, backfilling Picture Build as tenant #1, and enforcing row-level security.

The database has **~130 tables**, so this is a sizable, carefully-staged migration with a verification
gate. We do it in **reversible stages**, not one big irreversible change.

---

## 0. Important: name collision

There is **already a `companies` table** in the schema (it's the CRM/opportunity "client companies"
concept). To avoid collision, the **tenant table will be named `tenants`** (not `companies`), and the
tenant key column will be **`tenant_id`** everywhere. (Confirm what the existing `companies` table is
before we finalize naming.)

---

## 1. New platform tables

- **`tenants`** — id, name, status (`trialing|active|past_due|suspended|canceled`), plan_id,
  helcim_subscription_id, trial_ends_at, seats, created_at, owner_user_id.
- **`tenant_users`** — user_id (→ auth.users / profiles), tenant_id, role (`owner|admin|member`).
  (We will reconcile this with the existing **`profiles`** table — likely add `tenant_id` to
  `profiles` and use it as the membership record rather than a separate table.)
- **`plans`**, **`subscriptions`**, **`tenant_extensions`** — added in the plans/billing phase, not here.

### Tenant resolver
```sql
create or replace function auth_tenant_id() returns uuid
language sql stable security definer as $$
  select tenant_id from profiles where id = auth.uid() limit 1;
$$;
```
(Optionally also stamp `tenant_id` into JWT `app_metadata` at login for performance; the function is
the safe baseline.)

---

## 2. Table classification (the rule for each of the ~130 tables)

Each table is exactly one of:

**(T) Tenant-scoped — gets `tenant_id` + RLS.** The vast majority — all business data:
`jobs, job_*, change_orders, estimates, estimate_*, bids/projects/modules, contacts,
contact_communications, employees, employee_*, daily_logs, daily_log_photos, edoc_*, schedule_items,
crews, crew_types, positions, org_charts, org_nodes, org_edges, design_*, acct_*, collection_*,
statistic_*, stat_*, statistic_values, statistic_shares, agent_* , company_settings,
company_communications, pbs_drives, pbs_drive_members, drive_sync_*, ghl_*, qb_sync_state,
feature_requests*, applicants, hr_reviews, hr_review_forms, labor_rates, material_rates, paver_prices,
master_equipment, master_sub_crews, module_equipment_map, *_stg staging, …`

**(G) Global / product reference — NO `tenant_id` (shared across all tenants, read-only to tenants).**
Candidates to confirm: `help_docs, help_doc_categories, help_videos, help_video_categories` (product
help), and possibly the **template libraries** `org_chart_templates(+categories/subcategories)`,
`org_chart_wizard_feedback`, and any seeded `lms_*` catalog content shipped as product material.

**(P) Platform — already global:** `tenants, plans, subscriptions, tenant_extensions` (+ the existing
`companies` CRM table becomes tenant-scoped **(T)**).

> **DECISION needed:** confirm the **(G) global** list — especially `org_chart_templates` and any
> `lms_*` catalog tables. If those are meant to be per-tenant (each customer builds their own), they
> move to **(T)**. Default assumption: templates/help are global product content; everything a customer
> creates is tenant-scoped.

A full per-table T/G/P spreadsheet will be produced for sign-off before execution.

---

## 3. Staged rollout (reversible)

**Stage A — Additive, invisible (safe).**
1. Create `tenants`; insert one row for **Picture Build** → `PB_TENANT_ID`.
2. Add `tenant_id uuid` (nullable, no FK yet) to every **(T)** table.
3. Add `tenant_id` to `profiles`; set all existing profiles to `PB_TENANT_ID`.
4. Backfill `tenant_id = PB_TENANT_ID` on every (T) table.
   *App still works unchanged — nothing reads tenant_id yet.*

**Stage B — Constrain.**
5. Add FK `tenant_id → tenants(id)` and `NOT NULL` on (T) tables (now that they're backfilled).
6. Add insert defaults/triggers so new rows auto-set `tenant_id = auth_tenant_id()`.

**Stage C — Enforce (the cutover).**
7. Enable RLS on (T) tables with the policy:
   ```sql
   alter table <t> enable row level security;
   create policy <t>_tenant on <t> for all
     using (tenant_id = auth_tenant_id())
     with check (tenant_id = auth_tenant_id());
   ```
8. Keep a **service-role bypass** for Edge Functions/admin jobs that legitimately cross tenants.

**Stage D — Verify (gate before launch).**
9. Automated **cross-tenant isolation test**: create a throwaway tenant + user, confirm it sees **zero**
   of PB's rows on every table; confirm PB user sees only PB rows. Run as a subagent review.
10. Smoke-test the whole app as a PB user (everything still works, nothing missing).

Each stage is a separate migration file; A and B are reversible without data loss. C is the cutover
(reversible by disabling RLS). D is the go/no-go.

---

## 4. Storage (files) isolation

Buckets (`company-files`, `company-assets`, `edocuments`, `daily-log-photos`, drive storage) currently
key paths by user/various prefixes. Plan: prefix tenant paths with `t/<tenant_id>/…` going forward and
add storage RLS policies that match `tenant_id`. Existing PB objects are migrated under PB's prefix.
(Storage migration is its own sub-step, run after Stage C.)

---

## 5. Edge functions

Every function that reads/writes tenant data must resolve and enforce `tenant_id` (from the caller's
JWT/profile). Service-role functions (cron, webhooks) must explicitly scope by tenant. This is a code
pass alongside Stage C.

---

## 6. Rollback

- Stages A/B: drop the added columns/constraints — no data loss.
- Stage C: `disable row level security` per table reverts to open access instantly.
- Full snapshot/backup taken before Stage A; PITR enabled throughout.

---

## 7. What I need from you before executing

1. Approve the **`tenants` table name** + confirm what the existing `companies` table is.
2. Confirm the **(G) global** list (templates/help/LMS catalog) vs tenant-scoped.
3. Approve doing **Stage A (additive, safe)** first — it's reversible and changes no behavior — so we
   make progress while the rest is reviewed.

Nothing runs until you say go. Recommended first execution: **Stage A only**, then re-confirm before B/C.
