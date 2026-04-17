-- Add company_week_ending_day to company_settings
-- 0=Sunday, 1=Monday, 2=Tuesday, 3=Wednesday, 4=Thursday, 5=Friday, 6=Saturday
-- Defaults to Friday (5) to match existing Finance module behavior

ALTER TABLE company_settings
  ADD COLUMN IF NOT EXISTS company_week_ending_day int DEFAULT 5
    CHECK (company_week_ending_day BETWEEN 0 AND 6);
