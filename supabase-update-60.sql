-- supabase-update-60.sql
-- Ensure company_settings has key/value columns (in case original table
-- was created before supabase-update-5.sql added them via CREATE TABLE IF NOT EXISTS)

ALTER TABLE company_settings
  ADD COLUMN IF NOT EXISTS key        TEXT,
  ADD COLUMN IF NOT EXISTS value      TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS label      TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Seed the default schedule color used by ScheduleCalendar
INSERT INTO company_settings (key, value, label)
VALUES ('default_schedule_color', '#15803d', 'Default Schedule Color')
ON CONFLICT (key) DO NOTHING;
