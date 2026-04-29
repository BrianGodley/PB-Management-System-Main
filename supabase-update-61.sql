-- supabase-update-61.sql
-- Re-add job_address to jobs table (was dropped in supabase-update-7.sql)

ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS job_address TEXT NOT NULL DEFAULT '';
