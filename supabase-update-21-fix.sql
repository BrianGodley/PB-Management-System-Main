-- Drop and recreate company_settings cleanly
DROP TABLE IF EXISTS company_settings;

CREATE TABLE company_settings (
  id              INTEGER PRIMARY KEY DEFAULT 1,
  week_ending_day INTEGER NOT NULL DEFAULT 5
    CHECK (week_ending_day BETWEEN 0 AND 6),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT single_row CHECK (id = 1)
);

ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "company_settings_select" ON company_settings;
DROP POLICY IF EXISTS "company_settings_insert" ON company_settings;
DROP POLICY IF EXISTS "company_settings_update" ON company_settings;

CREATE POLICY "company_settings_select" ON company_settings
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "company_settings_insert" ON company_settings
  FOR INSERT WITH CHECK (is_admin());

CREATE POLICY "company_settings_update" ON company_settings
  FOR UPDATE USING (is_admin());

NOTIFY pgrst, 'reload schema';
