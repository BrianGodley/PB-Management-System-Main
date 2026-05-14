-- ============================================================
-- Change Order rebuild — schema additions
-- ============================================================
BEGIN;

ALTER TABLE bids
  ADD COLUMN IF NOT EXISTS custom_co_id          INT,
  ADD COLUMN IF NOT EXISTS scope_of_work_html    TEXT,
  ADD COLUMN IF NOT EXISTS signed_at             TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS signed_by_name        TEXT,
  ADD COLUMN IF NOT EXISTS signature_data_url    TEXT;

CREATE INDEX IF NOT EXISTS bids_job_co_idx ON bids(linked_job_id, custom_co_id);

ALTER TABLE job_files
  ADD COLUMN IF NOT EXISTS bid_id UUID REFERENCES bids(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS job_files_bid_idx ON job_files(bid_id);

COMMIT;
