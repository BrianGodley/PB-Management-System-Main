# Pricing research & recommended model

Starting-point pricing for the PBS SaaS, grounded in 2026 competitor pricing. Treat the numbers as a
launch hypothesis to validate with real prospects, not gospel.

## 1. Market comps (verified 2026)

| Platform | Price | Model | Notes |
|---|---|---|---|
| **Jobber** | from $39/mo (Core); ~$119 / ~$199+ higher tiers | per limited users | SMB field service; lighter than PBS |
| **LMN** | ~$97/mo | crew-based | Landscape-specific |
| **Arborgold** | $129–$499/mo | **flat, unlimited users** | Markets unlimited-users as the differentiator |
| **SingleOps** | $200–$500/mo + $55–$150 / extra user | per-user overage | Mid-market landscape |
| **Aspire** | $250–$350 / user / mo + implementation | enterprise per-user | Commercial/enterprise; $3,500+/mo at scale |

**Takeaways:**
- The SMB landscape band is ~$40–$500/mo; serious operations suites cluster **$100–$500/mo**.
- **Per-user** pricing (Aspire, SingleOps) scales revenue with crew size but creates buyer friction
  for field-heavy businesses. **Flat / unlimited-users** (Arborgold) is a deliberate selling point.
- PBS's breadth (CRM + estimating + jobs + HR + training + accounting + org chart) is closer to
  LMN/Aspire scope than to Jobber's — so price in the **mid band**, not the bottom.

## 2. Pricing unit (FINAL)

**Flat price per tier — unlimited users.** Simple to communicate ("unlimited users, one price") and a
deliberate differentiator vs. per-user competitors (Aspire/SingleOps) that penalize field-heavy crews.
Each tier is priced to capture the value of unlimited seats.

## 3. Launch prices (FINAL) — monthly, billed annually = 2 months free

Tiers stack; the Contractor package adds on. Card-up-front, 14-day trial. **Unlimited users on every tier.**

| Plan | Price/mo | Modules |
|---|---|---|
| **Tier 1 — Base** | **$79** | Dashboard, Org Chart, HR, Statistics, Documents |
| **Tier 2** | **$199** | + Training, Contacts, Opportunities, Workflows |
| **Tier 3** | **$399** | + Accounting, Weekly FP, Subs & Vendors, Equipment |
| **Contractor package** (add-on) | **+$149** | Jobs, Estimating/Bids, Design — *requires Tier 2+* |

**Example bundles (all unlimited users):**
- Typical contractor: **Tier 2 + Contractor = $348/mo**.
- Full commercial operation: **Tier 3 + Contractor = $548/mo**.
- Office / management only: **Tier 1 ($79)** or **Tier 2 ($199)**, no Contractor.

## 4. Other levers
- **Annual billing:** 2 months free (~17% off) — improves cash flow and retention.
- **Dedicated tier** (own database, from the SaaS roadmap): setup fee (e.g., $1–3k) + premium monthly
  (e.g., Tier 3 price ×1.5–2) + support/SLA retainer.
- **Founding-customer / early-bird** discount (e.g., 30% for 12 months) to seed the first cohort and
  get testimonials.
- **Payments revenue (Layer 2):** the Helcim partner residual on tenants' processing is a *second*
  revenue stream on top of subscriptions — factor it in; it lets you price subscriptions a touch lower
  to win deals while still profiting on processing volume.

## 5. Positioning guidance
- Lead with **Tier 2 + Contractor** as the "most popular" anchor (~$300/mo) — it's the natural fit for a
  typical landscape contractor and frames Tier 1 as cheap, Tier 3 as premium.
- Emphasize **unlimited crew clock-in** and **all-in-one** (CRM→estimate→job→invoice→books) vs. paying
  for Jobber + a separate CRM + a separate accounting tool.
- Validate by asking 5–10 target contractors what they pay today (Jobber/LMN/Aspire) and for what —
  then adjust before locking prices in `plans.price_monthly`.
