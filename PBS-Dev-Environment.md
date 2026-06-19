# Dev environment — branch + staging (protect PB production during the SaaS build)

Goal: do the risky multi-tenant work **without ever touching Picture Build's live app or database**
until it's tested. We use a **feature branch** + a **separate staging Supabase project**. No second
repo (one codebase stays the rule).

```
master  ──▶ Vercel Production ──▶ PB live app ──▶ PB live Supabase (prod)   ← untouched until merge
saas-multitenant ──▶ Vercel Preview URL ──▶ Staging Supabase (a copy)        ← all SaaS work happens here
```

---

## 1. Create the feature branch (git — run these together)

```bash
cd "C:\Users\Brian\Desktop\Claude Files\landscape-job-tracker"
git checkout -b saas-multitenant
git push -u origin saas-multitenant
```

- All multi-tenant/SaaS commits land on `saas-multitenant`.
- `master` stays exactly as-is and keeps auto-deploying PB's production. We only merge to `master`
  after staging tests pass.
- **Vercel auto-creates a Preview deployment** for this branch with its own URL (e.g.
  `pb-management-system-main-git-saas-multitenant-…vercel.app`). Production is unaffected.

To switch back to production code later: `git checkout master`. To resume SaaS work:
`git checkout saas-multitenant`.

---

## 2. Create the staging Supabase project

1. **supabase.com → New project** (same org, ideally same region as prod). Name it e.g.
   `pbs-staging`. Set a strong DB password and save it.
2. From **Project Settings → API**, copy:
   - `Project URL` → this is staging `VITE_SUPABASE_URL`
   - `anon` `public` key → staging `VITE_SUPABASE_ANON_KEY`
   - `service_role` key → for running migrations/edge functions (keep secret)
3. From **Project Settings → Database**, copy the **connection string** (for the dump/restore below).

---

## 3. Copy prod schema + data into staging (a realistic test copy)

We copy only the **`public`** schema (your tables/data/functions). We deliberately **do not** copy the
`auth` users — you'll make a couple of test logins in staging instead (cleaner + avoids auth-schema
issues). Storage files aren't copied either (not needed for migration testing).

Using the Postgres client tools (`pg_dump`/`psql`, v15 — or the Supabase CLI which bundles them):

```bash
# 1) Dump prod's public schema + data (run from anywhere with network access)
pg_dump "postgresql://postgres:<PROD_DB_PASSWORD>@db.<PROD_REF>.supabase.co:5432/postgres" \
  --schema=public --no-owner --no-privileges -f prod_public.sql

# 2) Restore into staging
psql "postgresql://postgres:<STAGING_DB_PASSWORD>@db.<STAGING_REF>.supabase.co:5432/postgres" \
  -f prod_public.sql
```

- `<PROD_REF>` / `<STAGING_REF>` are the project refs (the subdomain in each Project URL).
- If `pg_dump` complains about version, install Postgres 15 client tools, or run via the Supabase CLI
  (`supabase db dump` / `supabase db push`).
- Re-run this anytime you want to refresh staging with current prod data.

Then create **one or two test users** in staging: Supabase → Authentication → Add user (e.g.
`you+staging@…`). Those are your logins for the preview app.

---

## 4. Point the Preview deployment at staging

In **Vercel → your project → Settings → Environment Variables**, add (or edit) — scoped to
**Preview** (not Production):

| Key | Preview value |
|---|---|
| `VITE_SUPABASE_URL` | staging Project URL |
| `VITE_SUPABASE_ANON_KEY` | staging anon key |

Leave the **Production** values pointing at prod. Redeploy the branch (push any commit, or "Redeploy"
in Vercel) so the preview picks up the staging vars.

> Note: "Preview" scope applies to *all* preview branches. If you ever run other previews, use Vercel's
> branch-specific env vars (or just keep `saas-multitenant` as your only active preview) so only it
> hits staging.

Result: the **preview URL runs the SaaS code against the staging database**; the production URL keeps
running prod. You can break things in staging freely.

---

## 5. Edge functions + secrets on staging (only when we test functions)

Edge functions and their secrets are per-project. When we reach features that use them, deploy to
staging and set its secrets:
```bash
supabase functions deploy <fn> --project-ref <STAGING_REF>
supabase secrets set KEY=value --project-ref <STAGING_REF>
```
Until then, schema/RLS work doesn't need this.

---

## 6. The migration workflow (how Stage A/B/C run safely)

1. Write each migration as a `.sql` file in the repo (on `saas-multitenant`).
2. **Run it on STAGING first** (Supabase staging → SQL editor, or `psql` against staging).
3. Test on the **preview URL** (log in as a staging test user; run the cross-tenant isolation checks).
4. Only after it passes on staging do we schedule it for **production** — and we take a prod backup
   first.
5. Merge `saas-multitenant` → `master` to ship the code, and run the validated SQL on prod.

So nothing ever runs against PB's live data until it's proven on a copy.

---

## 7. Optional: local development

To run the app locally against staging, create a `.env` (see `.env.example`):
```
VITE_SUPABASE_URL=<staging url>
VITE_SUPABASE_ANON_KEY=<staging anon key>
```
then `npm install && npm run dev`. (Local dev is optional — the Vercel preview is enough.)

---

## Checklist

- [ ] `git checkout -b saas-multitenant && git push -u origin saas-multitenant`
- [ ] Create `pbs-staging` Supabase project; copy URL + anon + service_role + DB connection string
- [ ] Dump prod `public` schema/data → restore into staging
- [ ] Create 1–2 test users in staging
- [ ] Set Vercel **Preview** env vars to staging; redeploy the branch
- [ ] Confirm the preview URL loads and you can log in (against staging)
- [ ] (Later) deploy edge functions + secrets to staging when needed
