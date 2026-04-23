-- ─────────────────────────────────────────────────────────────────────────────
-- supabase-update-7.sql
-- Adds status workflow + sold-job tracking
-- Run once in the Supabase SQL Editor
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. estimates table: add client_id and fix status ────────────────────────
ALTER TABLE estimates
  ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id) ON DELETE SET NULL;

-- The estimates table was created in supabase-update-3.sql with a status column
-- that has CHECK (status IN ('draft','sent','approved','rejected')).
-- We need to drop that constraint and replace it with our workflow values.

-- Drop the old check constraint (Supabase auto-names it <table>_<column>_check)
ALTER TABLE estimates DROP CONSTRAINT IF EXISTS estimates_status_check;

-- Set the new default and re-seed any old values
ALTER TABLE estimates ALTER COLUMN status SET DEFAULT 'pending';
UPDATE estimates SET status = 'pending' WHERE status IN ('draft','sent','approved','rejected') OR status IS NULL OR status = '';

-- Add new constraint that covers the estimate lifecycle
ALTER TABLE estimates
  ADD CONSTRAINT estimates_status_check CHECK (status IN ('pending','sold','lost'));

-- ── 2. estimate_modules: add financial snapshot columns ──────────────────────
ALTER TABLE estimate_modules
  ADD COLUMN IF NOT EXISTS labor_cost    NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS labor_burden  NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS gross_profit  NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sub_cost      NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_price   NUMERIC(12,2) DEFAULT 0;

-- ── 3. jobs table: drop old schema and recreate ──────────────────────────────
-- (The old jobs table had a different shape; safe to recreate in development)
DROP TABLE IF EXISTS jobs CASCADE;

CREATE TABLE jobs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estimate_id   UUID REFERENCES estimates(id) ON DELETE SET NULL,
  client_id     UUID REFERENCES clients(id)   ON DELETE SET NULL,
  client_name   TEXT NOT NULL DEFAULT '',
  name          TEXT NOT NULL DEFAULT '',
  sold_date     TIMESTAMPTZ DEFAULT NOW(),
  total_man_days NUMERIC(10,2) DEFAULT 0,
  labor_burden  NUMERIC(12,2) DEFAULT 0,
  material_cost NUMERIC(12,2) DEFAULT 0,
  sub_cost      NUMERIC(12,2) DEFAULT 0,
  gross_profit  NUMERIC(12,2) DEFAULT 0,
  gpmd          NUMERIC(10,2) DEFAULT 0,
  total_price   NUMERIC(12,2) DEFAULT 0,
  status        TEXT NOT NULL DEFAULT 'active',
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ── 4. RLS for jobs ──────────────────────────────────────────────────────────
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own jobs"   ON jobs;
DROP POLICY IF EXISTS "Users can insert own jobs" ON jobs;
DROP POLICY IF EXISTS "Users can update own jobs" ON jobs;
DROP POLICY IF EXISTS "Users can delete own jobs" ON jobs;

CREATE POLICY "Users can view own jobs"
  ON jobs FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can insert own jobs"
  ON jobs FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update own jobs"
  ON jobs FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Users can delete own jobs"
  ON jobs FOR DELETE USING (auth.role() = 'authenticated');
