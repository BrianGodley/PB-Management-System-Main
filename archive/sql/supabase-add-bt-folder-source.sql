-- supabase-add-bt-folder-source.sql
-- Mark job_folders rows by import source so we can tell BT-imported
-- folders apart from user-created ones (and re-run --rebuild-job
-- cleanly without nuking manual folders).
-- Safe to re-run.

ALTER TABLE public.job_folders
  ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual';

CREATE INDEX IF NOT EXISTS job_folders_source_idx
  ON public.job_folders (source);
