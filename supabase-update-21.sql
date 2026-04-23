-- ─────────────────────────────────────────────────────────────────────────────
-- supabase-update-21.sql
-- Company-wide settings (singleton table)
--   • company_settings table with week_ending_day (0=Sun … 6=Sat)
--   • No default row — row absence means "not yet configured"
--   • Admins can insert/update; all authenticated users can read
-- Run after supabase-update-20.sql
-- ─────────────────────────────────────────────────────────────────────────────

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Table
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS company_settings (
  id              INTEGER PRIMARY KEY DEFAULT 1,
  week_ending_day INTEGER NOT NULL
    CHECK (week_ending_day BETWEEN 0 AND 6),  -- 0=Sun 1=Mon … 6=Sat
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_by      UUID REFERENCES profiles(id) ON DELETE SET NULL,
  CONSTRAINT single_row CHECK (id = 1)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. updated_at auto-touch (reuses touch_updated_at() from update-15)
-- ─────────────────────────────────────────────────────────────────────────────
DROP TRIGGER IF EXISTS company_settings_updated_at ON company_settings;
CREATE TRIGGER company_settings_updated_at
  BEFORE UPDATE ON company_settings
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. RLS
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "company_settings_select" ON company_settings;
DROP POLICY IF EXISTS "company_settings_insert" ON company_settings;
DROP POLICY IF EXISTS "company_settings_update" ON company_settings;

-- Any logged-in user can read (Statistics page needs it for weekly period logic)
CREATE POLICY "company_settings_select" ON company_settings
  FOR SELECT USING (auth.role() = 'authenticated');

-- Only admins can write
CREATE POLICY "company_settings_insert" ON company_settings
  FOR INSERT WITH CHECK (is_admin());

CREATE POLICY "company_settings_update" ON company_settings
  FOR UPDATE USING (is_admin());
