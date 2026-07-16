-- ============================================================================
-- Formulas extension — record the period UNIT of a statistic formula so the
-- listing can show "6 months" / "12 quarters" etc. (not just weeks).
-- Apply in the Supabase SQL editor on BOTH staging and production. Idempotent.
-- ============================================================================
alter table public.ext_formulas_formulas
  add column if not exists period_unit text;  -- 'day' | 'week' | 'month' | 'quarter' | 'year'
