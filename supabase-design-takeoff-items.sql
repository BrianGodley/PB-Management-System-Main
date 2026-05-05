-- ─────────────────────────────────────────────────────────────────────────────
-- supabase-design-takeoff-items.sql
-- Adds a "takeoff item" concept to the Design feature.
--
-- A takeoff_item is a named container (color, symbol, type) that one or more
-- design_annotations belong to. The user creates an item ("Front Lawn",
-- "Driveway Concrete", etc.) before drawing — every linear/area/count shape
-- they then draw is linked to that item via the new item_id column. Totals
-- in the sidebar group by item.
--
-- Existing annotations created before this change have NULL item_id and
-- continue to work standalone.
--
-- Safe to re-run.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.design_takeoff_items (
  id           UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  file_id      UUID        NOT NULL REFERENCES public.design_files(id) ON DELETE CASCADE,
  page_number  INT         NOT NULL DEFAULT 1,
  type         TEXT        NOT NULL CHECK (type IN ('linear', 'area', 'count')),
  name         TEXT        NOT NULL,
  color        TEXT        DEFAULT '#3A5038',
  symbol       TEXT,                                 -- for type='count'
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  created_by   UUID        REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS design_takeoff_items_file_idx     ON public.design_takeoff_items (file_id);
CREATE INDEX IF NOT EXISTS design_takeoff_items_filepage_idx ON public.design_takeoff_items (file_id, page_number);

ALTER TABLE public.design_takeoff_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "design_takeoff_items_auth_all" ON public.design_takeoff_items;
CREATE POLICY "design_takeoff_items_auth_all" ON public.design_takeoff_items
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.design_takeoff_items TO authenticated;

-- Link annotations to items (nullable so legacy rows stay valid)
ALTER TABLE public.design_annotations
  ADD COLUMN IF NOT EXISTS item_id UUID REFERENCES public.design_takeoff_items(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS design_annotations_item_idx ON public.design_annotations (item_id);
