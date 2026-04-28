-- supabase-update-60.sql
-- Add target_lines JSONB column to statistics table
ALTER TABLE statistics ADD COLUMN IF NOT EXISTS target_lines jsonb;
