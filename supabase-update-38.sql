-- supabase-update-38.sql
-- Add payroll_week_start column to company_settings
-- Values: 0=Sunday, 1=Monday, 2=Tuesday, 3=Wednesday, 4=Thursday, 5=Friday, 6=Saturday
-- Defaults to Sunday (0)

ALTER TABLE company_settings
  ADD COLUMN IF NOT EXISTS payroll_week_start int DEFAULT 0
    CHECK (payroll_week_start BETWEEN 0 AND 6);

-- Ensure any existing rows have the default value
UPDATE company_settings SET payroll_week_start = 0 WHERE payroll_week_start IS NULL;
