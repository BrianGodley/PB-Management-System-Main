-- ─────────────────────────────────────────────────────────────────────────────
-- Add sub_gp_markup_rate to company_settings
-- Default 20% (0.20) — used for Sub GP display in all GPMD bars
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE company_settings
  ADD COLUMN IF NOT EXISTS sub_gp_markup_rate DECIMAL DEFAULT 0.20;

-- Set default value on existing row
UPDATE company_settings
  SET sub_gp_markup_rate = 0.20
  WHERE sub_gp_markup_rate IS NULL;
