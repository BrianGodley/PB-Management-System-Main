-- supabase-update-59.sql
-- Add overlay_parts JSONB column to statistics table for Overlay Statistics feature
-- overlay_parts stores an ordered array of { stat_id, y_min, y_max } objects
-- y_min and y_max are optional (null = auto-range from data)
-- Example: [{"stat_id":"uuid-A","y_min":0,"y_max":100000},{"stat_id":"uuid-B","y_min":null,"y_max":null}]
-- Overlay stats are identified by stat_category = 'overlay'

ALTER TABLE statistics
  ADD COLUMN IF NOT EXISTS overlay_parts jsonb;
