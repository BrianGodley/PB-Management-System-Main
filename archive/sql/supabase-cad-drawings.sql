-- ─────────────────────────────────────────────────────────────────────────────
-- supabase-cad-drawings.sql
-- CAD authoring (from-scratch drafting), Phase 1.
--
-- A cad_drawing is one drawing document: layers + vector entities + view state,
-- all stored as JSON in `data`. It can optionally hang off a design_project so a
-- takeoff project and its drafted plan set live together, but standalone
-- drawings (design_project_id NULL) are fine too.
--
--   data = {
--     unit:       'ft' | 'in' | 'm',           -- world unit of the geometry
--     gridSpacing: number,                      -- in world units
--     layers:  [{ id, name, color, visible, locked }],
--     entities:[{ id, type, layer, points:[{x,y}], props:{...} }],  -- world coords
--     view:   { zoom, panX, panY }
--   }
--
-- Selections placed on the drawing are just entities of type 'block' whose
-- props carry selection_id / material_rate_id so later phases can roll them up
-- into takeoffs + the estimator. Nothing here needs to change for that.
--
-- Matches the design_projects access pattern: workspace-wide, open RLS.
-- Safe to re-run.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.cad_drawings (
  id                 UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  design_project_id  UUID        REFERENCES public.design_projects(id) ON DELETE SET NULL,
  name               TEXT        NOT NULL,
  discipline         TEXT        DEFAULT 'landscape'
                                 CHECK (discipline IN ('landscape', 'construction', 'detail', 'other')),
  data               JSONB       NOT NULL DEFAULT '{}'::jsonb,
  thumbnail          TEXT,
  status             TEXT        DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  created_at         TIMESTAMPTZ DEFAULT NOW(),
  updated_at         TIMESTAMPTZ DEFAULT NOW(),
  created_by         UUID        REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS cad_drawings_project_idx    ON public.cad_drawings (design_project_id);
CREATE INDEX IF NOT EXISTS cad_drawings_status_idx     ON public.cad_drawings (status);
CREATE INDEX IF NOT EXISTS cad_drawings_updated_at_idx ON public.cad_drawings (updated_at DESC);

-- Keep updated_at fresh on every write.
CREATE OR REPLACE FUNCTION public.cad_drawings_touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS cad_drawings_touch ON public.cad_drawings;
CREATE TRIGGER cad_drawings_touch
  BEFORE UPDATE ON public.cad_drawings
  FOR EACH ROW EXECUTE FUNCTION public.cad_drawings_touch_updated_at();

-- RLS — workspace-wide for authenticated users, matching design_projects.
ALTER TABLE public.cad_drawings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "cad_drawings_auth_all" ON public.cad_drawings;
CREATE POLICY "cad_drawings_auth_all" ON public.cad_drawings
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.cad_drawings TO authenticated;
