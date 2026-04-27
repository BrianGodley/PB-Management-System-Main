-- supabase-update-55.sql
-- Add job_id to acct_bills so vendor bills/purchase orders can be linked to jobs

ALTER TABLE acct_bills
  ADD COLUMN IF NOT EXISTS job_id uuid REFERENCES jobs(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS acct_bills_job_idx ON acct_bills(job_id);
