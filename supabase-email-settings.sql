-- Add email_config column to company_settings for multi-provider email support
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS email_config JSONB;
