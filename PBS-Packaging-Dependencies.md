# Tiers, Packages & Cross-Module Dependencies

Defines the sellable tiers/packages **and** the cross-module integration hooks that must be
entitlement-aware, so a tenant never lands on a dead link or an empty module that depends on one they
don't have.

## 1. Tiers & packages (final)

Tiers **stack** (each includes the ones below). **Packages** are add-ons on top of any tier.

| | Modules (nav keys) |
|---|---|
| **Tier 1 — base ($79)** | Dashboard `/`, Org Chart `/org-chart`, HR `/hr`, Statistics `/statistics`, Documents `/edocuments` |
| **Tier 2 (+) ($199)** | Training `/training`, Contacts `/contacts`, Opportunities `/clients`, Workflows `/workflows` |
| **Tier 3 (+) ($399)** | Accounting `/accounting`, Weekly FP `/collections`, Subs & Vendors `/portal/subs`, Equipment `/equipment-tracking` |
| **Contractor package** (add-on, +$149) | Jobs `/jobs`, Estimating/Bids `/bids`, Design `/design` |

Sub-features that live *inside* Jobs (not separate nav modules), and therefore ride with the
**Contractor package**: Change Orders, Schedule, Work Orders, Daily Logs, Time Clock, Job Invoices.

## 2. Dependency map (from code scan)

**Hard dependency** = the module can't function without the other (would error or be unusable).
**Soft dependency** = works standalone but is richer/integrates when the other is present.

| Module | Depends on | Type | Why (from code) |
|---|---|---|---|
| Estimating/Bids, Jobs, Design (Contractor) | **Contacts + Opportunities** (Tier 2) | **HARD** | Estimates & jobs attach to a `clients`/opportunity; `Bids`, `EstimateDetail`, `Design` all read `clients`. You can't create a job/estimate with no client. |
| Accounting (T3) | Jobs (Contractor) | Very soft | NO job-AR section. Only an *optional* `job_id` dropdown on invoices/bills/expense/journal lines (+1 `from('jobs')` to fill it). No Contractor = empty dropdown, harmless. At most hide the job-tag field. |
| Weekly FP (T3) | — | **NONE** (verified) | Reads only `collection_weeks/rows/payables/financial`, `statistics`, `statistic_values`, `company_settings`. No `jobs`/`work_orders`/`estimates`/`job_invoices` refs anywhere. Fully standalone Tier-3 module. |
| Subs & Vendors (T3) | Jobs (Contractor) | Soft→strong | Directory page (`SubsVendors.jsx`) is independent, but `SubVendorContracts/Quotes` read `jobs`, `work_orders`, `estimates` to link a contract/quote to a job/WO. No Contractor = empty pickers. **Only real banner case.** |
| HR (T2) | Org Chart (T1) | Soft | Uses `positions` from the org structure. |
| Training (T2) | HR (T2) | Soft | Course assignments key off `employees`/`positions`. |
| Statistics (T1) | Org Chart (T1) + HR (T2) | Soft | Reads `positions` + `employees`; manual stats work without HR. |
| Change Orders / Schedule / Work Orders / Daily Logs / Time Clock | Jobs | **HARD** | All read `jobs`; they are job sub-features (ride with Contractor). |
| Documents/E-Docs (T1) | Opportunities/Jobs | Soft | Per-opportunity docs integrate when present; stand alone otherwise. |

## 3. Co-requisite rules (enforced in entitlements)

1. **Contractor package REQUIRES Tier 2+** (hard) — needs Contacts + Opportunities to attach jobs/
   estimates. Don't sell Contractor on Tier 1.
2. **Tier 3 modules are soft-dependent on Contractor** — sold freely, but show graceful empty/"connect
   Jobs" states when Contractor isn't present (no crashes, no dead data).
3. Everything else resolves within the stack (HR↔Org Chart, Training↔HR, Statistics↔Org Chart all sit
   in tiers that include their dependency).

## 4. Integration hooks that must check entitlements ("hooks within packaging")

Gating the **nav + routes** isn't enough — these *in-page* hooks point at other modules and must be
hidden/disabled when the target module isn't entitled (use `isModuleEnabled(moduleKeys, '<key>')`):

- **Opportunities / ClientDetail** → "Create Estimate", "Convert to Job", and the Estimates / Jobs /
  Work-Orders / Change-Orders tabs → gate behind **Contractor (`/bids`,`/jobs`)**. Without it,
  Opportunities behaves as pure CRM ("without estimating", exactly as specified).
- **Contacts** → "Create Opportunity" → gate behind Opportunities (`/clients`).
- **Dashboard** widgets summarizing jobs/finances → render only the job/finance widgets if Contractor;
  otherwise show the entitled widgets only.
- **Accounting** → optional per-transaction `job_id` dropdown only (no AR section). Empty + harmless without Contractor; optional: hide the job-tag field when `/jobs` not entitled.
- **Weekly FP** → NO job hooks (verified independent). Nothing to gate.
- **Subs & Vendors** → `SubVendorContracts/Quotes` job/work-order/estimate pickers → gate/empty-state behind Contractor (`/jobs`). Only genuine banner case.
- **Statistics** → employee/position-linked stat types → full when HR present; manual stats always.
- **Estimating/Bids** → client picker → requires Opportunities/Contacts (guaranteed by co-requisite #1).

## 5. Implementation plan

1. **Schema:** keep `plans` as the **tiers** (tier1/tier2/tier3, cumulative `module_keys`). Add
   `packages` (id, name, module_keys, price) and `tenant_packages` (tenant_id, package_id). A tenant =
   one tier (`tenants.plan_id`) + zero-or-more packages.
2. **Resolver:** `get_my_modules()` returns `tier.module_keys ∪ (all tenant package module_keys)`.
   Enforce co-requisite #1 at purchase (Contractor sale requires Tier ≥ 2).
3. **Hook gating:** at each integration point in §4, wrap the cross-module button/tab/panel in
   `isModuleEnabled(moduleKeys, '<targetKey>')` (the platform entitlements hook is already app-wide).
   This is the bulk of the work and is incremental — gate one hook at a time, each safe.
4. **Graceful states:** Tier-3 modules show a friendly "Add the Contractor package to populate this
   from your jobs" notice instead of empty/broken sections.

## 6. Build order
Schema + resolver first (packages model), then the §4 hooks one module at a time (Opportunities/
ClientDetail is the biggest), then graceful states. All testable on staging by toggling a tenant's
tier + packages.
