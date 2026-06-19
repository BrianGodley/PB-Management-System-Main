# PBS Multi-Tenant + Extension Framework — Engineering Spec

The blueprint for turning PBS into a multi-tenant product with a bespoke-extension layer.
Picture Build becomes **extension #1**, which also proves the framework before we sell bespoke to
anyone else. This spec is reviewed and agreed **before** any live schema changes.

Companion docs: `PBS-SaaS-Roadmap.md` (business/phasing).

---

## 0. Principles (the rules everything else enforces)

1. **One codebase.** Shared tenants and dedicated tenants run the same core. Differences come from
   **config + entitlements + extensions**, never from editing core for one client.
2. **One-way dependency.** Extensions may reference core; **core never references an extension.**
   Disabling/removing any extension can never break core.
3. **Core schema is shared and additive-only.** It changes only when the change benefits everyone
   (or is a generic mechanism like `custom_fields`). No per-client columns on core tables.
4. **Extensions own their own schema** (`ext_<id>_*` tables) and may attach to core entities via
   **side tables** or the generic `custom_fields` jsonb — never by altering core tables.
5. **Isolation is enforced, not promised** — `company_id` + RLS on every table; extension migrations
   run under a role that *cannot* alter core tables.

---

## 1. Tenancy model

### Tables
- **`companies`** — id, name, status (`trialing|active|past_due|suspended|canceled`), plan_id,
  helcim_subscription_id, trial_ends_at, seats, created_at, owner_user_id.
- **`company_users`** — user_id (→ auth.users), company_id, role (`owner|admin|member`), created_at.
  A user belongs to a company; this is how we resolve "current tenant."
- Every existing business table gains **`company_id uuid not null references companies(id)`**.

### Resolving the current tenant
A SQL helper used by every policy:
```sql
create or replace function auth_company_id() returns uuid
language sql stable as $$
  select company_id from company_users where user_id = auth.uid() limit 1;
$$;
```
(For performance we can also stamp `company_id` into the JWT app_metadata at login and read it from
`auth.jwt()`; the function form is the safe default.)

### RLS template (applied to every tenant table)
```sql
alter table jobs add column company_id uuid references companies(id);
alter table jobs enable row level security;

create policy jobs_tenant_select on jobs for select using (company_id = auth_company_id());
create policy jobs_tenant_cud    on jobs for all
  using (company_id = auth_company_id())
  with check (company_id = auth_company_id());
```
Inserts must set `company_id = auth_company_id()` (enforced by `with check` + a default trigger).

### Picture Build = tenant #1
A migration creates one `companies` row for Picture Build and backfills `company_id` on all existing
rows to it. PB's current users are attached via `company_users`. **No data is lost; it's wrapped.**

---

## 1.5 Isolation tiers — shared RLS vs dedicated database

Customers buy different levels of isolation; all run the **same codebase**.

| Tier | Isolation | Stack | Sell to |
|---|---|---|---|
| **Shared** | Logical: `company_id` + RLS in one DB | One Supabase project, all tenants | Starter / Pro (most customers) |
| **Schema-per-tenant** | One cluster, separate schema | One Supabase project, schema per tenant | *Skip for now* — fights Supabase's `public`-schema/auth conventions |
| **Dedicated database** | Physical: own database, backups, keys, residency | **Own Supabase project + own deployment**, same code | High-security / compliance buyers (premium) |

**Dedicated = same core + their extensions, pointed at their own database via env config**
(`SUPABASE_URL`/keys). No fork, no code branch.

**Keep `company_id` + RLS ON even in a dedicated single-customer database** — one company that happens
to be alone. The code path stays identical to multi-tenant (no separate "single-tenant mode"), and you
get defense-in-depth: physical isolation *and* row security.

**Ops backbone (Phase 6):** dedicated instances multiply migrations and deploys, so they require
**automated provisioning** (template → new Supabase project + Vercel deploy) and a **shared migration
runner** that applies each release's versioned SQL to the shared DB *and* every dedicated DB, tracked
in an instance/version registry. Until that exists, provision the first 1–2 by hand.

**Pricing:** dedicated tier = setup fee + premium monthly + support/SLA retainer (covers infra + the
per-instance operational cost).

---

## 2. Core / extension boundary (governance)

| Action | Allowed? |
|---|---|
| Extension adds **new tables** (`ext_<id>_*`) | ✅ Yes — first-class |
| Extension adds **new routes/modules, nav items, UI** | ✅ Yes (via registry/slots) |
| Extension **references core** rows (FK `ext_*` → core) | ✅ Yes |
| Extension stores extra data on a core entity via **side table** or **`custom_fields`** | ✅ Yes |
| Extension **subscribes to core events / overrides via extension points** | ✅ Yes |
| Extension **alters a core table** (add/rename/retype columns, change constraints) | ❌ Never |
| **Core references an extension** (any import or FK) | ❌ Never |
| Per-client `if (tenant === 'PB')` branches inside core | ❌ Never (use an extension point) |

**When a bespoke feature "doesn't fit core models":** the extension brings its **own parallel model**
(its own tables). That's the normal path, not a problem.

**When a bespoke feature must change core *behavior*:** add a **generic extension point** to core
(a hook/slot/strategy), then the extension registers an override for its tenant only. The core change
is generic and benefits the architecture — never a client-specific hack.

**Graduation:** if several clients want the same non-core thing, promote it from extension into core
(additively, for everyone) and retire the per-client copy.

---

## 3. Schema conventions

- **Naming:** every extension object is prefixed `ext_<id>_…` (e.g., `ext_pb_irrigation_audits`).
- **Every ext table** carries `company_id` + the same RLS template as core.
- **Attaching to a core entity:**
  - *Side table (preferred for typed/queryable data):*
    ```sql
    create table ext_pb_job_details (
      id uuid primary key default gen_random_uuid(),
      company_id uuid not null references companies(id),
      job_id uuid not null references jobs(id) on delete cascade,
      water_usage numeric, audit_notes text
    );
    -- + RLS
    ```
  - *Generic `custom_fields jsonb` on a core table* (shipped for everyone, holds loose per-tenant keys):
    ```sql
    alter table jobs add column custom_fields jsonb not null default '{}';
    ```
  - *EAV table* for fully dynamic user-defined fields — last resort (query pain).
- **Migration ownership / enforcement:**
  - `migrations/core/…` vs `migrations/ext/<id>/…` — separate folders, separate review.
  - Core tables owned by a **core DB role**; extension migrations run as **`ext_migrator`**, which can
    `CREATE` new objects but is **not the owner** of core tables, so it physically cannot `ALTER`
    them. Guardrail is a permission, not a guideline.

---

## 4. Extension framework — frontend

### Repo layout
```
src/
  core/                 # the sellable product (modules, pages, components)
  platform/             # the framework itself
    registry.js         # collects manifests, filters by tenant entitlements
    Slot.jsx            # <Slot name="..." context={...} />
    hooks.js            # event bus (emit / subscribe)
    entitlements.js     # plan modules + enabled extensions for current company
  extensions/
    picture-build/
      manifest.js
      pages/            # full pages/modules
      slots/            # components injected into core slots
      hooks/            # logic subscribing to core events
      migrations/       # ext_pb_*.sql only
```

### Manifest shape
```js
// src/extensions/picture-build/manifest.js
export default {
  id: 'picture-build',
  name: 'Picture Build',
  version: '1.0.0',
  apiVersion: 1,                 // checked against the platform's supported version
  modules: [                     // new top-level modules (nav + route)
    { key: 'pb-irrigation', label: 'Irrigation', icon: '💧',
      path: '/x/pb/irrigation', load: () => import('./pages/Irrigation.jsx') },
  ],
  slots: {                       // inject UI into named core slots
    'job.tabs': [
      { id: 'pb-water', label: 'Water Usage', load: () => import('./slots/WaterUsageTab.jsx') },
    ],
    'dashboard.widgets': [/* ... */],
  },
  hooks: {                       // react to core events
    'estimate.saved': () => import('./hooks/onEstimateSaved.js'),
  },
}
```

### Registry + entitlements
```js
import pictureBuild from '../extensions/picture-build/manifest'
const ALL_EXTENSIONS = [pictureBuild /*, ...future */]

// Active extensions = those enabled for the current company (tenant_extensions table).
export function activeExtensions(enabledIds) {
  return ALL_EXTENSIONS.filter(e => enabledIds.includes(e.id) && e.apiVersion === PLATFORM_API_VERSION)
}
```
Routes under `/x/<ext>/…` are registered only when the extension is active. Nav is built from
**core modules (gated by plan)** + **active-extension modules**. Direct-URL access to an inactive
module hits a guard.

### Slots (the injection points). Initial set to seed:
- `job.tabs`, `job.sidebar`
- `dashboard.widgets`
- `estimate.lineItems.extra`, `estimate.summary.extra`
- `contact.tabs`, `company.settings.sections`
- `nav.extra` (loose nav additions)

`<Slot name="job.tabs" context={{ job }} />` renders every active contribution for that slot.

### Hooks/events
Core emits namespaced events at key moments (`estimate.saved`, `job.created`, `document.signed`).
Extensions subscribe via the manifest. Core never imports extension code; it only emits.

### Loading strategy
- **Shared deployment:** all manifests are known, but each extension's *code bundles* are
  **lazy-loaded** (dynamic `import()`) only for tenants entitled to them — so PB's bundle never ships
  to other tenants' sessions.
- **Dedicated deployment:** build config can additionally tree-shake out unentitled extensions.

---

## 5. Extension framework — backend

- **`tenant_extensions`** — `(company_id, extension_id, enabled bool, config jsonb)`. Drives both
  frontend activation and backend authorization.
- **Edge functions** validate the caller's company and check `tenant_extensions` before running any
  extension-specific logic.
- Extension Edge Functions live under `supabase/functions/ext-<id>-<name>` and only touch `ext_*`
  tables.
- **Versioned API:** `apiVersion` on each manifest; the platform exposes `PLATFORM_API_VERSION`. A
  breaking change to slots/hooks bumps the platform version and flags which extensions to update.

---

## 6. Plans, entitlements & extensions together

The effective access for a company =
**(modules from its plan)** ∪ **(modules from its active extensions)**, minus anything suspended for
billing. `platform/entitlements.js` resolves this once per session and feeds nav + route guards.

- Plan tier → core module keys (Starter/Pro/Enterprise mapping from the roadmap).
- `tenant_extensions` → extension module keys + slot/hook activation.
- Billing status (`past_due`/`suspended`) can override to read-only/locked.

---

## 7. Picture Build as extension #1

**Goal:** move PB-only behavior out of core and into `extensions/picture-build/`, leaving core as the
clean, sellable product.

Process:
1. **Inventory** the PB-specific features currently baked into core (I'll scan the codebase and
   produce a list — e.g., any PB-named branding, bespoke estimator rules, PB-only modules, hardcoded
   PB data/labels).
2. For each: decide **graduate-to-core** (generally useful → keep in core, generalized) vs
   **PB-only** (→ move into the extension via a module/slot/hook).
3. Re-home PB-only DB objects to `ext_pb_*` (or keep core tables but move PB-specific *logic* to the
   extension via side tables/custom_fields).
4. Enable the `picture-build` extension for the Picture Build tenant via `tenant_extensions`.

This both delivers PB's bespoke features cleanly and validates every seam (module, slot, hook, ext
schema, entitlement) end-to-end.

---

## 8. Security checklist (verified before launch)

- [ ] RLS on every core and `ext_*` table; automated cross-tenant read test (Company A cannot read
      Company B).
- [ ] Inserts force `company_id = auth_company_id()`.
- [ ] Storage buckets partitioned by `company_id` path prefix + storage policies.
- [ ] `ext_migrator` role cannot ALTER core tables (verified).
- [ ] Edge functions authorize company + extension on every call.
- [ ] Dedicated-instance provisioning leaves no shared secrets across tenants.

---

## 9. Build order (maps to roadmap phases)

1. **Platform skeleton** (`platform/registry|Slot|hooks|entitlements`) — no behavior change yet; core
   keeps working, slots render nothing.
2. **Tenancy core** — `companies`/`company_users`, `company_id` + RLS rollout, `auth_company_id()`,
   PB backfill as tenant #1. *(Highest risk → dedicated verification pass + subagent review.)*
3. **Seed slots/hooks into core** at the initial injection points (Section 4).
4. **Picture Build extension** — build `extensions/picture-build/`, migrate PB-only features in.
5. **Plans + entitlements + nav/route gating.**
6. **Billing (Helcim) + signup + marketing** (roadmap Phases 3–4).
7. **Dedicated tier automation** (roadmap Phase 6) — provisioning + multi-instance deploy/migrate.

Steps 1 and 3 are safe, additive, and shippable immediately. Step 2 is the gated, high-risk one and
will be drafted as its own migration plan for your sign-off before it runs against live data.

---

## 10. Open decisions / inputs needed

1. Confirm the **plan → core module mapping** + prices (roadmap §5).
2. Product **brand + domain** (roadmap §3) — needed for the marketing/signup phases, not for §1–§4.
3. **Trial style** (card-up-front vs not) for billing.
4. OK to begin with **Step 1 (platform skeleton)** + I produce the **PB-only feature inventory**
   (Step "7.1") — both are non-destructive and don't touch live data.

---

## 11. Recommended immediate action

Start with the **non-destructive** work that unblocks everything and touches no live data:
- Build the **platform skeleton** (registry, Slot, hooks, entitlements) — core behavior unchanged.
- Produce the **Picture Build feature inventory** (what's PB-only in core today) so we know exactly
  what extension #1 contains and what graduates to core.
- In parallel, draft the **Step-2 tenancy migration plan** (exact `company_id`/RLS rollout + PB
  backfill) for your review before it runs.

The multi-tenant data migration (Step 2) only proceeds after you approve that migration plan.
