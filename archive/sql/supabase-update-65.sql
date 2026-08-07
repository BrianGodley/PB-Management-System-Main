-- supabase-update-65.sql
-- Add sms_config JSONB column to company_settings
-- Stores active SMS provider + per-provider credentials
-- Shape: { active_provider: 'simpletexting', providers: { simpletexting: { api_key, from_number } } }

ALTER TABLE company_settings
  ADD COLUMN IF NOT EXISTS sms_config JSONB;
