-- supabase-update-38.sql
-- Add payroll_week_start setting to company_settings
-- Values: 0=Sunday, 1=Monday, 2=Tuesday, 3=Wednesday, 4=Thursday, 5=Friday, 6=Saturday

INSERT INTO company_settings (key, value)
VALUES ('payroll_week_start', '0')
ON CONFLICT (key) DO NOTHING;
