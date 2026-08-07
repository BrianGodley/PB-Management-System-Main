-- Add SMS config column to company_settings
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS sms_config JSONB;
