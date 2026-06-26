-- ============================================================================
-- PRICING UPDATE  (RUN ON STAGING FIRST: fgyexksqinjczebtsuon)
-- ----------------------------------------------------------------------------
-- New monthly prices: Tier 2 $229, Tier 3 $389 (Tier 1 unchanged at $79,
-- Contractor add-on unchanged at $149). These drive Settings → Subscription /
-- Billing totals; the marketing site + signup prices are set in code.
-- ============================================================================

update public.plans set price_monthly = 229 where id = 'tier2';
update public.plans set price_monthly = 389 where id = 'tier3';

-- verify
-- select id, name, price_monthly from public.plans order by rank;
