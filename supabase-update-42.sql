-- supabase-update-42.sql
-- Crew Types master table + crew_type column on work_orders

CREATE TABLE IF NOT EXISTS crew_types (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL UNIQUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  color      TEXT NOT NULL DEFAULT '#15803d',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Pre-populate in specified display order
INSERT INTO crew_types (name, sort_order, color) VALUES
  ('Demolition', 0, '#dc2626'),
  ('Specialty',  1, '#9333ea'),
  ('Masonry',    2, '#f97316'),
  ('Paver',      3, '#3b82f6'),
  ('Landscape',  4, '#16a34a')
ON CONFLICT (name) DO NOTHING;

-- RLS
ALTER TABLE crew_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "crew_types_all" ON crew_types
  FOR ALL USING (true) WITH CHECK (true);

-- Add crew_type to work_orders so new ones store it directly
ALTER TABLE work_orders
  ADD COLUMN IF NOT EXISTS crew_type TEXT;

-- Backfill crew_type on existing work_orders from module_type patterns
UPDATE work_orders SET crew_type = 'Demolition'
  WHERE crew_type IS NULL
    AND (lower(module_type) LIKE '%demo%' OR lower(module_type) LIKE '%demolition%');

UPDATE work_orders SET crew_type = 'Masonry'
  WHERE crew_type IS NULL
    AND (lower(module_type) LIKE '%mason%' OR lower(module_type) LIKE '%wall%' OR lower(module_type) LIKE '%column%');

UPDATE work_orders SET crew_type = 'Paver'
  WHERE crew_type IS NULL
    AND (lower(module_type) LIKE '%paver%' OR lower(module_type) LIKE '%turf%' OR lower(module_type) LIKE '%step%');

UPDATE work_orders SET crew_type = 'Landscape'
  WHERE crew_type IS NULL
    AND (lower(module_type) LIKE '%landscape%' OR lower(module_type) LIKE '%plant%'
      OR lower(module_type) LIKE '%irrig%' OR lower(module_type) LIKE '%drainage%'
      OR lower(module_type) LIKE '%utili%');

UPDATE work_orders SET crew_type = 'Specialty'
  WHERE crew_type IS NULL;
