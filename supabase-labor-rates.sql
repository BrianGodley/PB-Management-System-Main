-- ============================================================================
-- LABOR RATES  (HR → Settings → Labor Rates)
-- ----------------------------------------------------------------------------
-- Stores the company's average crew wage + per-hour labor-burden percentages,
-- and per-employee benefits (PTO days, health insurance). The Labor Rates tab
-- computes a fully-burdened "Total Average Crew Member Labor Cost" ($/hr) and
-- writes it into the existing company_settings.labor_rate_per_hour (used by the
-- estimator) and labor_rate_per_man_day = total × 8 (used by job/work-order
-- tracking) — so one number drives both.
--
-- Burden rates are stored as PERCENTAGES (e.g. 6.2 means 6.2%).
-- company_settings is already tenant-scoped (one row per tenant); these are
-- just added columns, so they inherit the table's RLS. Safe to re-run.
-- ============================================================================

-- ── Company-level inputs ────────────────────────────────────────────────────
alter table public.company_settings
  add column if not exists avg_hourly_crew_rate    numeric,                 -- manual base wage $/hr
  add column if not exists burden_fica_rate        numeric not null default 6.2,
  add column if not exists burden_medicare_rate    numeric not null default 1.45,
  add column if not exists burden_futa_rate        numeric not null default 0.6,
  add column if not exists burden_suta_rate        numeric not null default 0,
  add column if not exists burden_workcomp_rate    numeric not null default 0,
  add column if not exists burden_sdi_rate         numeric not null default 0,
  add column if not exists burden_gl_rate          numeric not null default 0;

-- ── Per-employee benefits ───────────────────────────────────────────────────
alter table public.employees
  add column if not exists pto_days                numeric not null default 0,   -- paid time off, days/yr
  add column if not exists health_insurance_monthly numeric;                     -- $/month (reference only)
