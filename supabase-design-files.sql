-- ─────────────────────────────────────────────────────────────────────────────
-- supabase-design-files.sql
-- Phase 2 of the Design / CAD-takeoff feature: file storage.
--
-- Adds:
--   • design_files       — metadata for every uploaded drawing file
--   • storage bucket     — 'design-files' (private; uses signed URLs)
--   • storage policies   — authenticated users can read/write inside bucket
--
-- Subsequent phases (scale, drawing, report) hang off design_files.id.
-- Safe to re-run.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. design_files table ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.design_files (
  id            UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id    UUID        NOT NULL REFERENCES public.design_projects(id) ON DELETE CASCADE,
  file_name     TEXT        NOT NULL,           -- original filename for display
  storage_path  TEXT        NOT NULL,           -- path within the design-files bucket
  file_type     TEXT,                            -- MIME type (application/pdf, image/png, etc.)
  size_bytes    BIGINT,
  num_pages     INT,                             -- filled in client-side after PDF.js loads it
  display_order INT         DEFAULT 0,           -- user-controlled ordering
  uploaded_at   TIMESTAMPTZ DEFAULT NOW(),
  uploaded_by   UUID        REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS design_files_project_idx ON public.design_files (project_id);
CREATE INDEX IF NOT EXISTS design_files_order_idx   ON public.design_files (project_id, display_order, uploaded_at);

ALTER TABLE public.design_files ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "design_files_auth_all" ON public.design_files;
CREATE POLICY "design_files_auth_all" ON public.design_files
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.design_files TO authenticated;

-- ── 2. Storage bucket ───────────────────────────────────────────────────────
-- Private bucket — files are accessed via short-lived signed URLs from the app.
INSERT INTO storage.buckets (id, name, public)
VALUES ('design-files', 'design-files', false)
ON CONFLICT (id) DO NOTHING;

-- ── 3. Storage policies ─────────────────────────────────────────────────────
-- Authenticated users can read, upload, update, and delete inside the bucket.
DROP POLICY IF EXISTS "design_files_obj_select" ON storage.objects;
DROP POLICY IF EXISTS "design_files_obj_insert" ON storage.objects;
DROP POLICY IF EXISTS "design_files_obj_update" ON storage.objects;
DROP POLICY IF EXISTS "design_files_obj_delete" ON storage.objects;

CREATE POLICY "design_files_obj_select" ON storage.objects FOR SELECT
  TO authenticated USING (bucket_id = 'design-files');

CREATE POLICY "design_files_obj_insert" ON storage.objects FOR INSERT
  TO authenticated WITH CHECK (bucket_id = 'design-files');

CREATE POLICY "design_files_obj_update" ON storage.objects FOR UPDATE
  TO authenticated USING (bucket_id = 'design-files') WITH CHECK (bucket_id = 'design-files');

CREATE POLICY "design_files_obj_delete" ON storage.objects FOR DELETE
  TO authenticated USING (bucket_id = 'design-files');
