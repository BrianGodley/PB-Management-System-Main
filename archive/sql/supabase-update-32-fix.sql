-- ─────────────────────────────────────────────────────────────────────────────
-- supabase-update-32-fix.sql
-- Fixes the company_settings block that failed in supabase-update-32.sql.
-- Run this AFTER supabase-update-32.sql (the labor/material rows already succeeded).
--
-- What this does:
--   1. Adds sales_tax_rate column  (9.5% — used to gross up irrigation materials)
--   2. Adds labor_rate_per_hour column  ($35.00/hr default)
--   3. Seeds both on the singleton row (id = 1) without overwriting existing values.
--
-- company_settings is a singleton table (one row, id = 1) with named columns.
-- This is safe to re-run — it will not overwrite values you have already set.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE company_settings
  ADD COLUMN IF NOT EXISTS sales_tax_rate      DECIMAL(6,5) DEFAULT 0.095,
  ADD COLUMN IF NOT EXISTS labor_rate_per_hour DECIMAL(8,2) DEFAULT 35.00;

INSERT INTO company_settings (id, week_ending_day, sales_tax_rate, labor_rate_per_hour)
VALUES (1, 5, 0.095, 35.00)
ON CONFLICT (id) DO UPDATE
  SET sales_tax_rate      = COALESCE(company_settings.sales_tax_rate,      0.095),
      labor_rate_per_hour = COALESCE(company_settings.labor_rate_per_hour, 35.00);

-- ── Verify ────────────────────────────────────────────────────────────────────
-- SELECT id, sales_tax_rate, labor_rate_per_hour FROM company_settings WHERE id = 1;
