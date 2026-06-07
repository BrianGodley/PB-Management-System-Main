-- ─────────────────────────────────────────────────────────────────────────────
-- supabase-job-files-storage-policies.sql
--
-- The `job-files` storage bucket was created manually (per the note in
-- supabase-update-71.sql) but never had RLS policies attached for
-- authenticated users. Frontend uploads were silently relying on the
-- service-role key for the BT downloader and got "new row violates
-- row-level security policy" the moment a real user tried to upload.
--
-- This adds the same authenticated-user pattern we use for the
-- design-files bucket: full CRUD on objects inside `job-files`.
-- Safe to re-run.
-- ─────────────────────────────────────────────────────────────────────────────

-- Make sure the bucket row exists (private — we use public URLs only for
-- already-public org files; sensitive ops would use signed URLs).
INSERT INTO storage.buckets (id, name, public)
VALUES ('job-files', 'job-files', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "job_files_obj_select" ON storage.objects;
DROP POLICY IF EXISTS "job_files_obj_insert" ON storage.objects;
DROP POLICY IF EXISTS "job_files_obj_update" ON storage.objects;
DROP POLICY IF EXISTS "job_files_obj_delete" ON storage.objects;

CREATE POLICY "job_files_obj_select" ON storage.objects FOR SELECT
  TO authenticated USING (bucket_id = 'job-files');

CREATE POLICY "job_files_obj_insert" ON storage.objects FOR INSERT
  TO authenticated WITH CHECK (bucket_id = 'job-files');

CREATE POLICY "job_files_obj_update" ON storage.objects FOR UPDATE
  TO authenticated
  USING      (bucket_id = 'job-files')
  WITH CHECK (bucket_id = 'job-files');

CREATE POLICY "job_files_obj_delete" ON storage.objects FOR DELETE
  TO authenticated USING (bucket_id = 'job-files');
