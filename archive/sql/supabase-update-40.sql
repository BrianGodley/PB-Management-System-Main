-- supabase-update-40.sql
-- Master Equipment table + Module Equipment mapping

-- ── Master Equipment ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS master_equipment (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                TEXT NOT NULL,
  type                TEXT NOT NULL
    CHECK (type IN ('Vehicle','Trailer','Large Power','Small Power','Hand Tool')),
  equipment_id        TEXT UNIQUE,           -- auto-generated e.g. V100, T101
  year                INTEGER,
  condition           INTEGER CHECK (condition BETWEEN 1 AND 4),
  last_maintenance_date DATE,
  maintenance_summary TEXT,
  created_at          TIMESTAMPTZ DEFAULT now()
);

-- ── Module ↔ Equipment mapping (by module_type string) ───────────────────────
-- Assigns equipment to a module TYPE (e.g. 'Drainage', 'Concrete') globally.
-- Work orders for that module type automatically pull these equipment items.
CREATE TABLE IF NOT EXISTS module_equipment_map (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_type  TEXT NOT NULL,
  equipment_id UUID NOT NULL REFERENCES master_equipment(id) ON DELETE CASCADE,
  created_at   TIMESTAMPTZ DEFAULT now(),
  UNIQUE (module_type, equipment_id)
);


-- ─────────────────────────────────────────────────────────────────────────
-- Data API grants (Supabase change effective 2026-10-30 — new tables in
-- public are not exposed via PostgREST / supabase-js by default; this
-- block makes them reachable. RLS policies (above) still control rows.
-- ─────────────────────────────────────────────────────────────────────────
GRANT ALL ON public.master_equipment TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.master_equipment TO authenticated;
GRANT ALL ON public.module_equipment_map TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.module_equipment_map TO authenticated;
