-- ─────────────────────────────────────────────────────────────────────────────
-- supabase-workday-exceptions.sql
-- Creates workday_exceptions table and adds include_saturday / include_sunday
-- columns to schedule_items. Run once in the Supabase SQL Editor.
-- ─────────────────────────────────────────────────────────────────────────────

-- Workday exceptions table
CREATE TABLE IF NOT EXISTS workday_exceptions (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  type          TEXT        NOT NULL CHECK (type IN ('day_of_week', 'specific_date')),
  day_of_week   INTEGER     CHECK (day_of_week BETWEEN 0 AND 6),
  exception_date DATE,
  label         TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE workday_exceptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_all_workday_exceptions"
  ON workday_exceptions FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Per-item weekend overrides on schedule_items
ALTER TABLE schedule_items
  ADD COLUMN IF NOT EXISTS include_saturday BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS include_sunday   BOOLEAN DEFAULT FALSE;
