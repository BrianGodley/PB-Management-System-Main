-- ════════════════════════════════════════════════════════════════════════════
-- LMS Libraries migration  (Stage A)
--   • lms_categories         — shared category list, seeded from checksheet lists
--   • lms_read_items.category — Read Items folded into the Documents Library
--                               (table kept as-is to avoid breaking existing code)
--   • lms_videos             — new Video Library
--   • lms_courses.image_url  — course-card photo header
--   • lms_steps.video_id     — let a checksheet step pull a Video Library item
--                               (documents already pull via the existing read step)
--   • storage buckets         — lms-videos, lms-documents, lms-images (admin-write)
-- Idempotent. Safe to re-run. Run in the Supabase SQL editor.
-- ════════════════════════════════════════════════════════════════════════════
BEGIN;

-- ── 1) Shared category list, seeded from existing checksheet categories ──────
CREATE TABLE IF NOT EXISTS public.lms_categories (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT        NOT NULL UNIQUE,
  sort_order  INTEGER     NOT NULL DEFAULT 100,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
INSERT INTO public.lms_categories (name, sort_order)
SELECT DISTINCT COALESCE(NULLIF(TRIM(category), ''), 'General'), 100
FROM public.lms_courses
ON CONFLICT (name) DO NOTHING;
INSERT INTO public.lms_categories (name, sort_order) VALUES ('General', 0)
ON CONFLICT (name) DO NOTHING;

-- ── 2) Read Items → Documents Library (keep table, add category) ─────────────
-- Create the table if this is a fresh install (matches the v2 schema shape).
CREATE TABLE IF NOT EXISTS public.lms_read_items (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  title            TEXT        NOT NULL,
  description      TEXT,
  doc_url          TEXT,
  file_name        TEXT,
  created_by_email TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.lms_read_items ADD COLUMN IF NOT EXISTS category   TEXT NOT NULL DEFAULT 'General';
ALTER TABLE public.lms_read_items ADD COLUMN IF NOT EXISTS mime_type  TEXT;
ALTER TABLE public.lms_read_items ADD COLUMN IF NOT EXISTS size_bytes BIGINT;
ALTER TABLE public.lms_read_items ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
CREATE INDEX IF NOT EXISTS lms_read_items_category_idx ON public.lms_read_items(category);

-- ── 3) Video library ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.lms_videos (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  title            TEXT        NOT NULL,
  description      TEXT,
  category         TEXT        NOT NULL DEFAULT 'General',
  video_url        TEXT,
  file_name        TEXT,
  mime_type        TEXT,
  size_bytes       BIGINT,
  thumbnail_url    TEXT,
  created_by_email TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS lms_videos_category_idx ON public.lms_videos(category);

-- ── 4) Step link to a video + course header image ───────────────────────────
ALTER TABLE public.lms_steps   ADD COLUMN IF NOT EXISTS video_id  UUID REFERENCES public.lms_videos(id) ON DELETE SET NULL;
ALTER TABLE public.lms_courses ADD COLUMN IF NOT EXISTS image_url TEXT;

-- ── 5) Grants (match existing lms_* pattern) ────────────────────────────────
GRANT ALL ON public.lms_categories TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lms_categories TO authenticated;
GRANT ALL ON public.lms_videos TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lms_videos TO authenticated;
GRANT ALL ON public.lms_read_items TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lms_read_items TO authenticated;

COMMIT;

-- ── 6) Storage buckets (public read for in-app playback/preview) ────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('lms-videos',    'lms-videos',    true, 1024*1024*1024,
    ARRAY['video/mp4','video/quicktime','video/webm','video/x-m4v']),
  ('lms-documents', 'lms-documents', true, 200*1024*1024,
    ARRAY['application/pdf','application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/vnd.ms-powerpoint',
          'application/vnd.openxmlformats-officedocument.presentationml.presentation',
          'image/jpeg','image/png','image/webp']),
  ('lms-images',    'lms-images',    true, 25*1024*1024,
    ARRAY['image/jpeg','image/png','image/webp','image/gif'])
ON CONFLICT (id) DO UPDATE
  SET public = EXCLUDED.public,
      file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Storage RLS: anyone signed in can READ; only admins can WRITE.
DO $$
DECLARE b TEXT;
BEGIN
  FOREACH b IN ARRAY ARRAY['lms-videos','lms-documents','lms-images'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', b||'_read');
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', b||'_admin_write');
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', b||'_admin_update');
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', b||'_admin_delete');
    EXECUTE format($p$CREATE POLICY %I ON storage.objects FOR SELECT TO authenticated
      USING (bucket_id = %L)$p$, b||'_read', b);
    EXECUTE format($p$CREATE POLICY %I ON storage.objects FOR INSERT TO authenticated
      WITH CHECK (bucket_id = %L AND EXISTS (SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid() AND p.role IN ('admin','super_admin')))$p$, b||'_admin_write', b);
    EXECUTE format($p$CREATE POLICY %I ON storage.objects FOR UPDATE TO authenticated
      USING (bucket_id = %L AND EXISTS (SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid() AND p.role IN ('admin','super_admin')))$p$, b||'_admin_update', b);
    EXECUTE format($p$CREATE POLICY %I ON storage.objects FOR DELETE TO authenticated
      USING (bucket_id = %L AND EXISTS (SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid() AND p.role IN ('admin','super_admin')))$p$, b||'_admin_delete', b);
  END LOOP;
END $$;
