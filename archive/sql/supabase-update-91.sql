-- supabase-update-91.sql
-- Add BuilderTrend import columns to jobs table + missing address/staff fields

ALTER TABLE jobs
  -- Notes field
  ADD COLUMN IF NOT EXISTS notes             TEXT,
  -- BuilderTrend identifier for deduplication on re-import
  ADD COLUMN IF NOT EXISTS bt_job_id         INTEGER,
  -- Address fields (used in app but may not be in DB yet)
  ADD COLUMN IF NOT EXISTS job_city          TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS job_state         TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS job_zip           TEXT NOT NULL DEFAULT '',
  -- Staff
  ADD COLUMN IF NOT EXISTS project_manager   TEXT,
  ADD COLUMN IF NOT EXISTS consultant        TEXT,
  -- Dates
  ADD COLUMN IF NOT EXISTS projected_start       DATE,
  ADD COLUMN IF NOT EXISTS projected_completion  DATE,
  ADD COLUMN IF NOT EXISTS actual_start          DATE,
  ADD COLUMN IF NOT EXISTS actual_completion     DATE,
  -- Financial summary from BT
  ADD COLUMN IF NOT EXISTS bt_contract_price     NUMERIC(14,2),
  ADD COLUMN IF NOT EXISTS bt_revised_cost       NUMERIC(14,2),
  ADD COLUMN IF NOT EXISTS bt_total_costs        NUMERIC(14,2),
  ADD COLUMN IF NOT EXISTS bt_total_costs_paid   NUMERIC(14,2),
  ADD COLUMN IF NOT EXISTS bt_owner_invoices_paid NUMERIC(14,2),
  -- Source tracking
  ADD COLUMN IF NOT EXISTS source            TEXT DEFAULT 'manual',  -- 'buildertrend' | 'manual'
  ADD COLUMN IF NOT EXISTS bt_imported_at    TIMESTAMPTZ;

-- Unique index on bt_job_id to prevent duplicate imports
CREATE UNIQUE INDEX IF NOT EXISTS jobs_bt_job_id_idx ON jobs(bt_job_id)
  WHERE bt_job_id IS NOT NULL;

-- General index for source lookups
CREATE INDEX IF NOT EXISTS jobs_source_idx ON jobs(source);
