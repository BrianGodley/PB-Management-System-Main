-- supabase-update-75.sql
-- Add parent_folder_id to job_folders to support nested folder trees

ALTER TABLE job_folders
  ADD COLUMN IF NOT EXISTS parent_folder_id UUID REFERENCES job_folders(id) ON DELETE CASCADE;

-- Index for fast lookups of children by parent
CREATE INDEX IF NOT EXISTS idx_job_folders_parent_folder_id ON job_folders(parent_folder_id);
