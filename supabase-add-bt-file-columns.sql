-- supabase-add-bt-file-columns.sql
-- Extends job_files for the BuilderTrend file downloader.
-- Safe to re-run.

ALTER TABLE public.job_files
  ADD COLUMN IF NOT EXISTS bt_file_id   TEXT,
  ADD COLUMN IF NOT EXISTS folder_path  TEXT,
  ADD COLUMN IF NOT EXISTS mime_type    TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS job_files_bt_dedup_idx
  ON public.job_files (job_id, bt_file_id)
  WHERE bt_file_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS job_files_job_folder_idx
  ON public.job_files (job_id, folder_path);
