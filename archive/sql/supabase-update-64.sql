-- supabase-update-64.sql
-- Auto Stat support + Admin Integrations config

-- Auto stat: data_source key on statistics
ALTER TABLE statistics
  ADD COLUMN IF NOT EXISTS data_source text;

-- Integrations config on company_settings
ALTER TABLE company_settings
  ADD COLUMN IF NOT EXISTS integrations_config JSONB;
