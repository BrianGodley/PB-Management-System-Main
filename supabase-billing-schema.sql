-- ============================================================================
-- BILLING SCHEMA  (RUN ON STAGING FIRST: fgyexksqinjczebtsuon)
-- ----------------------------------------------------------------------------
-- Adds pricing to plans and subscription-tracking to tenants. The actual
-- charging is done by Helcim (Recurring API); these columns mirror Helcim state
-- so the app can gate access by billing status.
-- ============================================================================

-- Plan pricing + link to the Helcim recurring plan
alter table public.plans add column if not exists price_monthly numeric;     -- USD / month
alter table public.plans add column if not exists helcim_plan_id text;       -- Helcim recurring plan id/code

-- >>> EDIT these to your real prices, then we create matching Helcim plans <<<
update public.plans set price_monthly = 49  where id = 'starter'    and price_monthly is null;
update public.plans set price_monthly = 149 where id = 'pro'        and price_monthly is null;
update public.plans set price_monthly = 349 where id = 'enterprise' and price_monthly is null;

-- Tenant subscription state (mirrors Helcim)
alter table public.tenants add column if not exists helcim_customer_id     text;
alter table public.tenants add column if not exists helcim_subscription_id text;
alter table public.tenants add column if not exists billing_status         text;        -- trialing|active|past_due|canceled
alter table public.tenants add column if not exists card_last4             text;
alter table public.tenants add column if not exists current_period_end     timestamptz;

-- Keep status in sync: tenants.status already exists (trialing on signup).
-- billing_status tracks Helcim specifically; access gating reads tenants.status.
