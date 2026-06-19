# Picture Build feature inventory (what's PB-only in core today)

Scan of the current codebase for Picture-Build-specific code, to decide what becomes **core config**
(generally useful, every tenant needs it) vs **PB-only extension** (genuinely bespoke).

## Headline finding (good news)

**Almost everything "Picture Build" in the code is branding/content, not bespoke logic.** There is
very little PB-specific *behavior* — it's product name, company contact details, logo, assistant name,
and default legal verbiage. That means:

- The path to multi-tenant is mostly **"make branding + company profile per-tenant configuration,"**
  which graduates into **core** (benefits every customer), not into the PB extension.
- The `extensions/picture-build/` module may start **nearly empty** — Picture Build essentially
  becomes "tenant #1 with its own brand config + seeded templates." The bespoke-extension capability
  stays available for *future* custom clients.

## Category A — Product/brand name → CORE (per-tenant or per-product config)

Hardcoded "Picture Build System" / "Picture Build" as the app/product name:
- `Layout.jsx` (header brand text), `Login.jsx`, `ResetPassword.jsx` (logo wordmark + footer)
- `lib/notify.js` (welcome / portal / reset emails), `Admin.jsx` (test email/SMS, Sam messages)
- `SamChat.jsx` (assistant greeting), `Customize.jsx` (label text)

**Action:** introduce a brand/product-name setting. Two layers:
- **SaaS product brand** (the thing you sell — the new name from the roadmap) for login, system emails.
- **Tenant company name** (already exists as `company_settings.company_name`) for tenant-facing labels.

## Category B — Company profile on documents → CORE (per-tenant company profile)

Hardcoded PB address / phone / license / website on generated documents:
- `BidDocViewerModal.jsx` and `lib/generateBidDoc.js` — letterhead: `12410 Foothill Blvd…`,
  `(818) 751-2690`, `www.picturebuild.com`, `CA Contractor's License … 990772`, PB logo.
- `WorkOrders.jsx` — `PICTURE BUILD` header on work-order PDFs.
- `JobInvoiceDetailModal.jsx`, `JobPaymentEntryModal.jsx` — `Picture Build System` fallbacks.

**Action:** pull all of these from a **per-tenant company profile** (extend `company_settings`:
company_name, address, phone, website, **license #**, logo_url). Bid/work-order/invoice generators read
the profile instead of constants. (`company_settings` already holds name + addresses; add the rest.)

## Category C — Bid/warranty legal verbiage → CORE with editable templates (seed PB as default)

- `lib/bidVerbiage.js` — PB's warranty/disclaimer language per module (concrete cracking, plant
  warranty, equipment, pool start-up, etc.).

**Action (judgment call):** every contractor needs warranty verbiage, so make it **core, per-tenant
editable templates**, **seeded with Picture Build's current text as the default**. New tenants get the
PB-authored defaults and can edit. (Alternative: keep as a PB extension if you consider the exact
wording proprietary — but template-with-defaults is more sellable.)

## Category D — "Sam" AI assistant branding → CORE config

- `SamChat.jsx`, `Admin.jsx`, `EmployeeDetail.jsx` — "Sam … from the Picture Build System."

**Action:** assistant name + company come from config (assistant_name + company_name). "Sam" can stay
the default assistant name product-wide, with the company reference pulled per-tenant.

## Category E — Genuinely PB-only / bespoke logic

**None clearly identified in this scan.** No PB-specific calculations, workflows, or modules are
hardcoded — the estimator, bids, etc. are generic with PB *content* (verbiage) layered on.

→ As we build, anything you decide is truly PB-only (a future PB-specific report, integration, or
rule) lands in `extensions/picture-build/`. For now it stays a stub.

## Net effect on the plan

1. Multi-tenant work centers on a **per-tenant brand + company profile**, plus seeded **verbiage
   templates** — all **core**, all sellable to every customer.
2. `extensions/picture-build/` remains an (almost) empty proof of the framework; PB runs as tenant #1.
3. This de-risks the project: less bespoke surface than feared; the core is already fairly generic.
