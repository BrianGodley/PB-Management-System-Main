-- ─────────────────────────────────────────────────────────────────────────────
-- supabase-design-annotations.sql
-- Phase 3+4 of Design / CAD-takeoff: persisted annotations.
--
-- Single polymorphic table holding every drawn shape:
--   • type='scale'   — two points + known real-world distance + unit. Sets
--                      pixels-per-unit for the page.
--   • type='linear'  — two points; length computed via the page's scale.
--   • type='area'    — polygon vertices; area via shoelace formula + scale.
--   • type='count'   — single point; counted in the per-color/label tally.
--
-- Coordinates are stored as a JSONB array of [x, y] tuples in NATURAL page
-- pixel coordinates (i.e. what they'd be at zoom = 1.0). The viewer
-- multiplies by the current zoom to render and divides incoming clicks by
-- zoom to capture.
--
-- Safe to re-run.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.design_annotations (
  id              UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  file_id         UUID        NOT NULL REFERENCES public.design_files(id) ON DELETE CASCADE,
  page_number     INT         NOT NULL DEFAULT 1,
  type            TEXT        NOT NULL CHECK (type IN ('scale', 'linear', 'area', 'count')),
  points          JSONB       NOT NULL,                            -- [[x, y], …] in natural-pixel coords
  color           TEXT        DEFAULT '#3A5038',
  label           TEXT,
  -- 'scale' rows only:
  known_distance  NUMERIC,                                          -- real-world length user entered
  unit            TEXT,                                             -- 'ft' | 'in' | 'm' | 'cm'
  -- Tracking
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  created_by      UUID        REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS design_annotations_file_idx     ON public.design_annotations (file_id);
CREATE INDEX IF NOT EXISTS design_annotations_filepage_idx ON public.design_annotations (file_id, page_number);
CREATE INDEX IF NOT EXISTS design_annotations_type_idx     ON public.design_annotations (type);

ALTER TABLE public.design_annotations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "design_annotations_auth_all" ON public.design_annotations;
CREATE POLICY "design_annotations_auth_all" ON public.design_annotations
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.design_annotations TO authenticated;
