-- supabase-update-43.sql
-- Field-level equipment trigger map
-- Maps (module_type, field_key) → equipment_type
-- When an estimator fills in a mapped field, the work order displays
-- that equipment as "Required Equipment"

CREATE TABLE IF NOT EXISTS module_field_equipment_map (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_type    TEXT NOT NULL,
  field_key      TEXT NOT NULL,
  field_label    TEXT NOT NULL DEFAULT '',
  equipment_type TEXT NOT NULL DEFAULT '',
  created_at     TIMESTAMPTZ DEFAULT now(),
  UNIQUE(module_type, field_key)
);

ALTER TABLE module_field_equipment_map ENABLE ROW LEVEL SECURITY;
CREATE POLICY "module_field_equipment_map_all" ON module_field_equipment_map
  FOR ALL USING (true) WITH CHECK (true);
