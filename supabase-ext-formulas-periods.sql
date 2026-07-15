-- ============================================================================
-- Formulas extension — per-period formulas + date range.
-- Apply in the Supabase SQL editor on BOTH staging and production. Idempotent.
--
-- A statistic formula is now recorded per trend period (1/6/12-week), since each
-- period can classify to a different condition. `period` is null for optional
-- (non-statistic) formulas.
-- ============================================================================

alter table public.ext_formulas_formulas
  add column if not exists period       text;   -- 'one_week' | 'six_week' | 'twelve_week' | null
alter table public.ext_formulas_formulas
  add column if not exists period_start date;
alter table public.ext_formulas_formulas
  add column if not exists period_end   date;
