-- ============================================================================
-- Formulas extension — add support for non-statistic ("optional") formulas.
-- Apply in the Supabase SQL editor on BOTH staging and production. Idempotent.
--
-- Legacy parity: a formula can be either
--   * 'stat'     — tied to a statistic, condition auto-computed from its trend
--   * 'optional' — no statistic; user picks the condition manually and gives it
--                  a free-text title. (Legacy "Optional Condition Formula".)
-- ============================================================================

-- statistic_id was NOT NULL; optional formulas have no statistic.
alter table public.ext_formulas_formulas
  alter column statistic_id drop not null;

-- Formula kind + free-text title (used by optional formulas).
alter table public.ext_formulas_formulas
  add column if not exists type  text not null default 'stat';
alter table public.ext_formulas_formulas
  add column if not exists title text;
