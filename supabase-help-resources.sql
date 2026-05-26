-- ─────────────────────────────────────────────────────────────────────────
-- Help Desk resources — Documentation + Video Guides
--
-- Two parallel structures: doc categories + docs, and video categories +
-- videos. Files (both PDFs/DOCX and video files) live in a private
-- help-resources bucket. RLS: any authenticated user can VIEW everything;
-- only admins (profiles.role in admin/super_admin) can CRUD.
--
-- Both videos and docs are uploaded files (no external URLs in v1).
-- Storage paths look like:
--   docs:   docs/{uuid}_{safe_filename}
--   videos: videos/{uuid}_{safe_filename}
-- ─────────────────────────────────────────────────────────────────────────

BEGIN;

-- ── Storage bucket ────────────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'help-resources',
  'help-resources',
  false,
  500 * 1024 * 1024,                       -- 500 MB per file (videos can be chunky)
  ARRAY[
    -- Docs
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'image/jpeg', 'image/png', 'image/webp',
    -- Videos
    'video/mp4', 'video/quicktime', 'video/webm', 'video/x-m4v'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit    = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ── Storage RLS ──────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "help_resources_read_all"     ON storage.objects;
DROP POLICY IF EXISTS "help_resources_admin_insert" ON storage.objects;
DROP POLICY IF EXISTS "help_resources_admin_update" ON storage.objects;
DROP POLICY IF EXISTS "help_resources_admin_delete" ON storage.objects;

-- Everyone signed in can READ resources (so user-facing pages can list
-- + serve them via signed URLs).
CREATE POLICY "help_resources_read_all" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'help-resources');

-- Admins manage files.
CREATE POLICY "help_resources_admin_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'help-resources'
    AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','super_admin'))
  );
CREATE POLICY "help_resources_admin_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'help-resources'
    AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','super_admin'))
  );
CREATE POLICY "help_resources_admin_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'help-resources'
    AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','super_admin'))
  );

-- ── help_doc_categories + help_docs ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.help_doc_categories (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT         NOT NULL,
  sort_order  INTEGER      NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
ALTER TABLE public.help_doc_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "help_doc_categories_read"  ON public.help_doc_categories;
DROP POLICY IF EXISTS "help_doc_categories_admin" ON public.help_doc_categories;
CREATE POLICY "help_doc_categories_read" ON public.help_doc_categories
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "help_doc_categories_admin" ON public.help_doc_categories
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','super_admin')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','super_admin')));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.help_doc_categories TO authenticated;

CREATE TABLE IF NOT EXISTS public.help_docs (
  id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id   UUID         REFERENCES public.help_doc_categories(id) ON DELETE SET NULL,
  title         TEXT         NOT NULL,
  description   TEXT,
  storage_path  TEXT         NOT NULL,
  file_name     TEXT         NOT NULL,
  mime_type     TEXT         NOT NULL,
  size_bytes    BIGINT       NOT NULL,
  uploaded_by   UUID         REFERENCES auth.users(id) ON DELETE SET NULL,
  sort_order    INTEGER      NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS help_docs_category_idx ON public.help_docs(category_id, sort_order);
ALTER TABLE public.help_docs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "help_docs_read"  ON public.help_docs;
DROP POLICY IF EXISTS "help_docs_admin" ON public.help_docs;
CREATE POLICY "help_docs_read" ON public.help_docs
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "help_docs_admin" ON public.help_docs
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','super_admin')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','super_admin')));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.help_docs TO authenticated;

-- ── help_video_categories + help_videos ──────────────────────────────────
CREATE TABLE IF NOT EXISTS public.help_video_categories (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT         NOT NULL,
  sort_order  INTEGER      NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
ALTER TABLE public.help_video_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "help_video_categories_read"  ON public.help_video_categories;
DROP POLICY IF EXISTS "help_video_categories_admin" ON public.help_video_categories;
CREATE POLICY "help_video_categories_read" ON public.help_video_categories
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "help_video_categories_admin" ON public.help_video_categories
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','super_admin')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','super_admin')));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.help_video_categories TO authenticated;

CREATE TABLE IF NOT EXISTS public.help_videos (
  id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id   UUID         REFERENCES public.help_video_categories(id) ON DELETE SET NULL,
  title         TEXT         NOT NULL,
  description   TEXT,
  storage_path  TEXT         NOT NULL,
  file_name     TEXT         NOT NULL,
  mime_type     TEXT         NOT NULL,
  size_bytes    BIGINT       NOT NULL,
  duration_sec  INTEGER,
  uploaded_by   UUID         REFERENCES auth.users(id) ON DELETE SET NULL,
  sort_order    INTEGER      NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS help_videos_category_idx ON public.help_videos(category_id, sort_order);
ALTER TABLE public.help_videos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "help_videos_read"  ON public.help_videos;
DROP POLICY IF EXISTS "help_videos_admin" ON public.help_videos;
CREATE POLICY "help_videos_read" ON public.help_videos
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "help_videos_admin" ON public.help_videos
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','super_admin')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','super_admin')));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.help_videos TO authenticated;

COMMIT;

NOTIFY pgrst, 'reload schema';
