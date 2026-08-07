-- ============================================================
-- Add Universal Sub Markup Rate to company_settings
-- Run this in your Supabase SQL Editor
-- ============================================================

ALTER TABLE company_settings
  ADD COLUMN IF NOT EXISTS sub_markup_rate DECIMAL(5,4) DEFAULT 0.35;

-- Set the default value on the existing row
UPDATE company_settings
SET sub_markup_rate = 0.35
WHERE sub_markup_rate IS NULL;
