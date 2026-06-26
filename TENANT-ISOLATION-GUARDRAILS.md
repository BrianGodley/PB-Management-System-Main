# Tenant Isolation Guardrails (SoftCake)

How we keep tenant data from leaking across companies. There are exactly **two
layers** where a leak can happen. Cover both and there is nowhere else for a leak
to hide.

---

## Layer 1 — Database (Row-Level Security)

The app connects with each user's JWT, so RLS does the isolation automatically —
**if** every tenant table is set up correctly. A new table is safe only when all
of these are true:

1. **Has a `tenant_id uuid` column**, `NOT NULL`, FK → `tenants(id)`.
2. **RLS is enabled**: `alter table X enable row level security;`
3. **Has the isolation policy**:
   `create policy tenant_isolation on X for all to authenticated
    using (tenant_id = auth_tenant_id()) with check (tenant_id = auth_tenant_id());`
4. **Has the auto-fill trigger** so inserts don't have to set tenant_id by hand:
   `create trigger trg_set_tenant_id before insert on X
    for each row execute function public.set_tenant_id();`
5. **No permissive `using (true)` / `with check (true)` policy** left on it — those
   override isolation. (This was the original `collection_weeks` bug.)
6. **Every UNIQUE constraint includes `tenant_id`** — otherwise two tenants collide
   on the same name/date. Use `(tenant_id, ...)`. (Exception: globally-unique
   tokens like invite/access tokens and auth-user links stay single-column.)

> Reference implementations: `supabase-stageB-tenancy.sql` (trigger),
> `supabase-stageC-rls.sql` (policy), `supabase-fix-tenant-insert-triggers.sql`
> (re-apply trigger everywhere).

### Re-run the audit after ANY schema change
`supabase-tenant-isolation-audit.sql` is read-only and reports every gap in one
query. Categories `1`–`5` must come back **empty**. Category `6` (unique not
scoped) and `7` (no tenant_id column) need a human glance — platform-global
tables (`tenants`, `plans`, `packages`, `sam_public_usage`, …) legitimately have
no `tenant_id`, and random-token uniques legitimately stay global. Anything else
in 6/7 is a bug to fix.

---

## Layer 2 — Edge functions (service role bypasses RLS)

**Critical:** edge functions use `SUPABASE_SERVICE_ROLE_KEY`, which **ignores RLS
entirely**. A clean database does **not** protect them. Every edge function that
touches tenant data must scope it in code.

Pick the pattern that matches who calls the function:

- **User-initiated (staff app):** derive the tenant from the caller's JWT, never
  from the request body.
  ```ts
  import { getCaller } from '../_shared/tenant.ts'
  const { userId, tenantId } = await getCaller(req, admin)
  if (!tenantId) return json({ error: 'Not authenticated' }, 401)
  // reads:  .from('X').select().eq('tenant_id', tenantId)
  // writes: .from('X').insert({ ...row, tenant_id: tenantId })
  ```
- **Portal-initiated (client portal):** authenticate the portal session, then
  verify every referenced record belongs to **that portal's `client_id`**. Never
  trust an `invoice_id` / `payment_method_id` / etc. from the body without an
  ownership check. (Pattern now used in `invoice-comment`, `helcim-checkout`,
  `helcim-charge-saved`.)
- **Webhook (Helcim, etc.):** there's no caller — map the event to a tenant via a
  stored external id (`reference`, `customerCode`, `subscription_id`) and gate the
  endpoint with a shared secret.
- **Cron:** no caller — loop over tenants explicitly; scope each iteration's
  writes to that tenant's id.
- **Public (anonymous):** resolve the tenant from a server-side lookup (e.g. site
  slug), write only to that tenant, and add an anti-spam throttle. Never echo back
  another tenant's data.

### The one rule
> If a function uses the service-role key, **no tenant table query may run without
> a `tenant_id` (or an ownership chain that resolves to one) that came from the
> authenticated caller — not from the request body.**

### Review checklist for any new/edited edge function
- [ ] Does it use the service role? If yes, continue.
- [ ] Is the tenant/owner derived from the JWT or a server-side lookup (not the body)?
- [ ] Is every `.from(tenantTable)` read/write filtered by that tenant/owner?
- [ ] For ids passed in the body, is ownership verified before use?
- [ ] If public/webhook: secret-gated and/or rate-limited?

---

## Current status (last audit)
- DB: collections tables fixed (trigger + per-tenant unique); name-based uniques
  scoped; full audit query available.
- Edge functions: `helcim-charge-saved`, `helcim-checkout`, `invoice-comment`,
  `website-lead` hardened. All others passed the code audit.
- Storage: `company-files` namespaced per tenant (`<tenant_id>/<root>/...`).
- **Open follow-ups:** external-sync uniques (`acct_*` QuickBooks, `ghl_*`,
  `jobs.bt_job_id`) — only collide once a 2nd tenant connects those systems;
  storage RLS policy on `company-files` for direct-path defense.
