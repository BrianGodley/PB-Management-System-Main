# Selling PBS as a Product — Phased Roadmap

**Goal:** turn PBS (today an in-house tool for Picture Build) into a sellable SaaS with its own
website, self-serve signup, free trial, Helcim-billed **tiered plans (Starter / Pro / Enterprise)**,
and per-plan module packaging — without disrupting Picture Build's own production instance.

This document is the agreed plan before we build. Sections marked **DECISION** need your input.

---

## 1. The big picture

Four systems sit on top of (or beside) the existing app:

1. **Marketing / sales website** — public pages (landing, features, pricing, sign-up CTA) on a new
   brand + domain.
2. **Signup + onboarding + auth** — self-serve account creation that provisions a new customer
   workspace and an admin user, with a free trial.
3. **Billing** — Helcim Recurring subscription per customer, tied to a plan, with trials, upgrades,
   downgrades, and dunning (failed-payment handling).
4. **Module packaging / entitlements** — the plan a customer is on decides which modules are
   unlocked inside the app.

The existing app (Jobs, Estimator, Time Clock, E-Docs, etc.) becomes the **product** that those
four systems sell access to.

---

## 2. Architecture — my recommendation (the "advise me")

The core question: when you sell to Company B, where does their data live, separate from Picture
Build and from Company C?

**Two models:**

| | Multi-tenant (recommended target) | Separate instance per customer |
|---|---|---|
| Data isolation | One database, every row tagged with `company_id`, enforced by row-level security | Each customer gets their own Supabase project + Vercel deployment |
| Code updates | Deploy once, everyone gets it | Must redeploy + migrate **every** customer instance |
| Ops cost | Low and flat | Grows linearly with every sale |
| Isolation strength | Strong if RLS is done right (must be careful) | Absolute (physically separate) |
| Upfront work | Larger — the app must be made "company-aware" | Small at first, painful to scale |
| Good for | A real product sold to many customers | 1–3 hand-held pilots |

**Recommendation: build toward multi-tenant.** Per-instance cloning feels easier today but becomes
unmanageable around the 3rd–5th customer (every bug fix and migration multiplies). Multi-tenant is
the standard for vertical SaaS like this and keeps your cost-per-customer near zero.

**Pragmatic path:** we can still get revenue early. Sell the **first 1–2 pilot customers on cloned
instances** (fast, no refactor) while we build the multi-tenant core in parallel, then migrate
everyone (including Picture Build, as "tenant #1") onto the shared system. You are not blocked from
selling while the refactor happens.

**What multi-tenant requires (the main engineering lift):**
- A `companies` (tenants) table; every existing table gets a `company_id`.
- Row-level security so a logged-in user only ever sees their company's rows.
- A signup flow that creates a company + its first admin.
- A backfill that wraps Picture Build's current data as the first company.
- A plan/entitlement layer (Section 4–5).

This is the largest and most safety-critical part of the project (a missed RLS rule = data leak
between customers), so it gets its own phase and a dedicated verification pass.

---

## 2.5 Hybrid model — shared tier + dedicated/custom tier (recommended)

Your instinct here is right and worth building toward: run **most customers on the shared
multi-tenant system**, and offer a **dedicated tier** for clients who pay a premium for their own
isolated instance and/or bespoke features, billed with setup + support/SLA fees.

**Three levels of isolation/customization:**

1. **Shared multi-tenant** (Starter / Pro) — one DB, one deployment, isolated by `company_id` + RLS.
   Cheapest to serve; the volume of your business.
2. **Dedicated single-tenant** (Enterprise / Dedicated) — the customer gets their **own database +
   deployment** for hard isolation (compliance, data residency, security-sensitive buyers), but it
   runs the **same core codebase**. Priced higher + support retainer.
3. **Bespoke / custom code** — a dedicated client wants features no one else has. These live in a
   **per-tenant extension overlay**, *not* a fork (see the golden rule below).

**The golden rule: one codebase, two deploy modes, customization by config + extensions — never
forks.** Maintaining separate divergent codebases per customer is the failure mode: every core fix
must be hand-merged into every copy, and cost grows exponentially. Instead:

- The **same repo** powers both the shared deployment and every dedicated deployment; behavior
  differs by **environment config + feature flags + entitlements**, not by changing core files.
- Custom work for a dedicated client is an **additive extension module** (a tenant-scoped folder /
  plugin the build or runtime enables for that tenant only). The shared core stays single-source and
  keeps receiving fixes/updates that flow to everyone.
- Hard caps: prefer config/flags first, an extension module second, and a true fork **never** (or
  only as a last-resort, explicitly-priced exception for a very large contract).

**Operations (the real cost of the dedicated tier):** dedicated instances multiply deploys and
migrations, so this tier only pays off with automation —
- **Templated provisioning** (a script that stands up a new Supabase project + Vercel deployment from
  the template).
- **CI that deploys the core to all instances** on release, and a **shared migration runner** that
  applies schema changes across every instance.
- A **registry** of which tenants are shared vs dedicated, their versions, and their enabled
  extensions.

**Pricing the dedicated tier (suggested):**
- One-time **onboarding/setup fee** (provisioning, data import, branding).
- Higher **monthly subscription** than Pro/Enterprise shared.
- **Support / SLA retainer** (response-time guarantees, a named contact).
- **Custom modules** billed as a one-time **build fee** + an ongoing **maintenance %** (so you're paid
  to keep their extension working as the core evolves).

**Roadmap impact:** the shared multi-tenant core (Phase 1) is the prerequisite for everything. The
dedicated tier adds two later workstreams — a **provisioning/deploy automation** pipeline and an
**extension/plugin framework** — best slotted after Phases 1–4 (call it **Phase 6 — Dedicated tier**)
once the shared product and billing are proven. Don't build the dedicated tooling first; sell a
dedicated client manually for the first one or two, then automate.

---

## 3. Brand, domains, and separation

**DECISION — product name & domain.** "Picture Build" is your landscaping company; the product
needs its own neutral brand so competitors will buy it (e.g. a name like "FieldStack",
"YardOps", "BuildLedger" — placeholder). Suggested layout once a name is chosen:

- `www.<brand>.com` — marketing/sales site
- `app.<brand>.com` — the SaaS application (multi-tenant)
- `pbs.picturebuild.com` — stays as-is; becomes Picture Build's tenant on `app.<brand>.com` later, or
  remains a vanity domain pointing at their workspace.

Keeping the product brand separate from Picture Build also matters for trust (buyers may be
competitors of a landscaping company).

---

## 4. Data model additions

New tables (multi-tenant core + commerce):

- **`companies`** — the tenant: name, status (`trialing` / `active` / `past_due` / `suspended` /
  `canceled`), created_at, owner_user_id, plan_id, helcim_subscription_id, trial_ends_at, seats.
- **`plans`** — Starter / Pro / Enterprise: name, price, billing_interval, included module keys
  (jsonb), seat limits, Helcim plan id.
- **`subscriptions`** — mirror of the Helcim subscription: company_id, plan_id, status, current
  period end, last payment status (kept in sync via Helcim webhooks).
- **`company_users`** — maps app users to a company + role (so a user belongs to a tenant).
- **`module_entitlements`** (or derived from plan) — the effective set of unlocked modules for a
  company, allowing per-customer add-ons/overrides on top of their plan.

Every existing business table (`jobs`, `bids`, `daily_logs`, `edoc_*`, `time_*`, etc.) gains a
`company_id` and an RLS policy: `company_id = current user's company`.

---

## 5. Module packaging (Starter / Pro / Enterprise)

PBS already has a clean module list (the same one used in **Customize → Module Backgrounds** and the
nav). We map modules to tiers. **DECISION — confirm/adjust this mapping:**

**Starter** (small crews — the essentials)
- Dashboard, Jobs, Contacts, Opportunities, Daily Logs, Documents (Files/Photos), Time Clock

**Pro** (Starter +)
- Estimator / Bids, Change Orders, Scheduling, E-Documents (e-sign), Workflows, Doc Creator,
  Org Chart, Statistics

**Enterprise** (Pro +)
- HR / Employees, Training (LMS), Equipment Tracking, Accounting & Weekly FP, Subs & Vendor portal,
  integrations (QuickBooks, GoHighLevel), custom branding, priority support, higher seat counts

**How gating works in the app (reuses what's already there):**
- The company's plan resolves to a set of enabled module keys (the same keys as `CUSTOMIZE_MODULES`,
  e.g. `/jobs`, `/bids`, `/edocuments`).
- The left/top **nav filters** to only enabled modules.
- **Route guards** block direct-URL access to locked modules and show an "Upgrade to unlock" screen.
- Locked modules can show as greyed teasers with an upgrade CTA (drives expansion revenue).

This is a relatively small, well-contained change because the module concept already exists.

---

## 6. Billing with Helcim (native recurring)

Helcim supports exactly what we need natively — subscription **plans**, **free trials** (in
days/weeks), add-ons, proration, and a **Recurring API** — so we drive tiered billing through Helcim
rather than building a billing engine.

**Setup**
- Create three **Helcim payment plans** (Starter / Pro / Enterprise) with the trial length you pick.
- Store each Helcim plan id on our `plans` rows.

**Trial → paid flow**
1. Customer signs up and picks a plan → we create the company in `trialing`.
2. Start a Helcim subscription on that plan (free-trial period).
3. **DECISION — card-up-front vs no-card trial:** require a card to start the trial (higher quality
   leads, auto-converts) **or** no card during trial (more signups, manual conversion). Recommended:
   card-up-front with a clear "free until <date>" message.
4. At trial end Helcim auto-charges; our webhook flips the company to `active`.

**Ongoing**
- A **Helcim webhook** endpoint (new edge function) keeps `subscriptions`/`companies` in sync on
  payment success/failure, cancellation, plan change.
- **Dunning:** on failed payment Helcim retries; we move the company to `past_due`, show a banner,
  and after a grace period set `suspended` (read-only or locked) until they fix billing.
- **Upgrade/downgrade:** change the Helcim plan (proration handled by Helcim) and update entitlements
  immediately.
- A **billing/customer portal** screen in-app: current plan, seats, next charge, update card
  (reusing your existing Helcim card-vault flow), invoices, upgrade/cancel.

You already have the Helcim building blocks (HelcimPay checkout, card vault, `helcim-charge-saved`),
so this extends a proven integration rather than starting cold.

---

## 7. Signup & onboarding flow

1. Pricing page → "Start free trial" on a plan.
2. Create account: email + password (Supabase auth), company name.
3. Provision: create `companies` row, attach the user as admin, set plan + trial, seed starter data
   (default org chart, example job, etc. — optional).
4. Helcim subscription created (card step per the decision above).
5. Land in the app, scoped to the new company, with only the plan's modules unlocked.
6. Guided first-run checklist (add your logo, invite teammates, create your first job).

---

## 8. Marketing / sales website

A separate lightweight site (can be a new Vite/React or a simple static site) on `www.<brand>.com`:
- Landing (value prop, screenshots, social proof)
- Features (by module) and an interactive **"test run" demo** (a sandboxed read-only or reset-nightly
  demo tenant — this satisfies your "test run" requirement)
- **Pricing** (the three tiers, feature comparison) → signup
- About / contact / legal (Terms, Privacy, DPA)

The "test run" can be either (a) a true free trial (Section 6/7) or (b) a shared **demo workspace**
that resets each night. Recommended: offer both — a no-risk demo button *and* a free trial.

---

## 9. Security & isolation (must-haves)

- RLS on **every** tenant table, tested with an automated check that confirms one company cannot read
  another's rows (a dedicated verification phase + a subagent review).
- Storage buckets partitioned by `company_id` path prefixes + storage policies.
- Edge functions validate the caller's company on every request.
- Admin "super-user" (you) tooling kept separate from tenant admin.

---

## 10. Phased roadmap

Rough sizing: **S** = days, **M** = 1–2 weeks, **L** = multiple weeks. Order is dependency-driven.

- **Phase 0 — Foundations & decisions (S).** Lock brand/domain, plan→module mapping, trial style,
  card-up-front choice. Create Helcim plans. Stand up the new repo/site skeleton + domain.
- **Phase 1 — Multi-tenant core (L).** `companies` + `company_users`, add `company_id` everywhere,
  RLS, signup-provisioning, migrate Picture Build in as tenant #1. *Highest-risk; gets a dedicated
  isolation verification pass.*
- **Phase 2 — Plans & entitlements (M).** `plans`/`subscriptions`/entitlements, nav filtering, route
  guards, "upgrade to unlock" screens.
- **Phase 3 — Billing (M).** Helcim plans wired to signup, trial logic, webhook sync, dunning,
  in-app billing/customer portal.
- **Phase 4 — Marketing site + signup + demo (M).** Public site, pricing→signup, the "test run"
  demo workspace, onboarding checklist.
- **Phase 5 — Launch hardening (M).** Legal pages, emails (welcome/trial-ending/payment-failed),
  analytics, support intake, super-admin tenant management, load/permission testing.
- **Phase 6 — Dedicated tier & extensions (L, later).** Templated provisioning script, CI deploy +
  shared migration runner across instances, per-tenant extension/plugin framework + feature flags,
  tenant registry. Build only after Phases 1–4 are proven; sell the first 1–2 dedicated clients
  manually first.

**Parallel pilot track (optional, S–M):** clone an instance for the first 1–2 paying customers to
earn revenue while Phases 1–3 are built, then migrate them onto the shared system. (This also doubles
as the manual precursor to the Phase 6 dedicated tier.)

---

## 11. Open decisions I need from you

1. **Product brand name + domain** (Section 3).
2. **Confirm the Starter/Pro/Enterprise module mapping** (Section 5) and the price points per tier.
3. **Trial style:** card-up-front vs no-card; trial length (e.g., 14 days) (Section 6).
4. **"Test run" meaning:** free trial, a reset-nightly demo workspace, or both (Section 8).
5. **Pilot track yes/no:** do you want to sell 1–2 customers on cloned instances now, or wait for
   the multi-tenant build (Section 2/10)?
6. **Seats/pricing unit:** per-company flat, or per-user/seat pricing?

---

## 12. Recommended immediate next steps

1. You answer Section 11 (especially brand + tier mapping + trial style).
2. I set up the **new product repo + marketing-site skeleton + pricing page** (Phase 0/4 front end) —
   visible progress fast, and it doesn't touch the existing app.
3. In parallel I draft the **Phase 1 multi-tenant migration plan** (exact tables, RLS policies,
   Picture-Build backfill) for your review before any schema changes go live.

Nothing here changes Picture Build's current app until we deliberately migrate it in as tenant #1.
