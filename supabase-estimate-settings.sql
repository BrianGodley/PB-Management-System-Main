-- ============================================================================
-- Consolidated Estimate Settings (Sales → Settings → Estimate Settings).
-- Adds the one missing column (commission_rate) and back-fills the single
-- company_settings row with the historical defaults ONLY where a value is null,
-- so the panel loads real numbers and the estimator can read them with no code
-- default. Never overwrites values you've already set. Run on prod + staging.
-- ============================================================================

-- 1) Missing column (percentages stored as fractions: 0.12 = 12%).
alter table public.company_settings
  add column if not exists commission_rate numeric;

-- 2) Ensure a single settings row exists.
insert into public.company_settings (id)
select 1 where not exists (select 1 from public.company_settings);

-- 3) Back-fill defaults only where null (historical baselines).
update public.company_settings set
  labor_rate_per_hour        = coalesce(labor_rate_per_hour, 35),
  labor_burden_pct           = coalesce(labor_burden_pct, 0.29),
  estimate_gpmd_default      = coalesce(estimate_gpmd_default, 425),
  commission_rate            = coalesce(commission_rate, 0.12),
  sub_gp_markup_rate         = coalesce(sub_gp_markup_rate, 0.20),
  sales_tax_rate             = coalesce(sales_tax_rate, 0),
  walk_access_pace_lf_per_min = coalesce(walk_access_pace_lf_per_min, 60),
  updated_at                 = now();

-- Verify:
-- select labor_rate_per_hour, labor_burden_pct, estimate_gpmd_default,
--        commission_rate, sub_gp_markup_rate, sales_tax_rate,
--        walk_access_pace_lf_per_min from public.company_settings;
