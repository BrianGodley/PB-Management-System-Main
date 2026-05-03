-- supabase-update-74.sql
-- Extends bids table to support Change Orders

ALTER TABLE bids
  ADD COLUMN IF NOT EXISTS record_type   TEXT NOT NULL DEFAULT 'bid',
  ADD COLUMN IF NOT EXISTS linked_job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS co_type       TEXT,
  ADD COLUMN IF NOT EXISTS co_name       TEXT;

CREATE INDEX IF NOT EXISTS bids_record_type_idx ON bids(record_type);
CREATE INDEX IF NOT EXISTS bids_linked_job_idx  ON bids(linked_job_id);
