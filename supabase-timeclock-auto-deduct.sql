-- ============================================================================
-- TIME CLOCK — DAILY AUTO-DEDUCTION  (HR → Settings → Time Clock → Auto Deduction)
-- ----------------------------------------------------------------------------
-- Company-wide rule to auto-deduct unpaid break time from each employee's
-- TOTAL clock-in hours for a day. Default rule: deduct 30 minutes for every
-- 6 hours worked (both editable). Applied daily to the day's total.
--
-- company_settings is already tenant-scoped; these are added columns that
-- inherit the table's RLS. Safe to re-run.
-- ============================================================================

alter table public.company_settings
  add column if not exists auto_deduct_enabled   boolean not null default false,
  add column if not exists auto_deduct_minutes    numeric not null default 30,  -- minutes deducted
  add column if not exists auto_deduct_per_hours   numeric not null default 6;  -- per X hours worked
