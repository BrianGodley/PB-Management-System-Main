-- Add company_week_ending_day to company_settings
-- 0=Sunday, 1=Monday, 2=Tuesday, 3=Wednesday, 4=Thursday, 5=Friday, 6=Saturday
-- Defaults to Saturday (6)

ALTER TABLE company_settings
  ADD COLUMN IF NOT EXISTS company_week_ending_day int DEFAULT 6
    CHECK (company_week_ending_day BETWEEN 0 AND 6);

-- Update any existing rows to Saturday
UPDATE company_settings SET company_week_ending_day = 6 WHERE company_week_ending_day = 5;
