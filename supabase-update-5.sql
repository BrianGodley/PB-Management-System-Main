-- ─────────────────────────────────────────────────────────────────────────────
-- supabase-update-5.sql
-- Company-wide settings (universal rates, GPMD, burden %)
-- Run once in the Supabase SQL Editor
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS company_settings (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL DEFAULT '',
  label      TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read and write
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'company_settings' AND policyname = 'auth_all_company_settings'
  ) THEN
    CREATE POLICY "auth_all_company_settings"
      ON company_settings FOR ALL
      TO authenticated
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- Seed defaults — will NOT overwrite values you have already saved
INSERT INTO company_settings (key, value, label) VALUES
  ('labor_rate_per_hour', '35',  'Universal Labor Rate ($/hr)'),
  ('gpmd',               '425', 'Gross Profit Per Man Day ($)'),
  ('labor_burden_pct',   '28',  'Labor Burden (%)')
ON CONFLICT (key) DO NOTHING;
