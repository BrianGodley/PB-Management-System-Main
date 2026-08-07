-- supabase-update-58.sql
-- Add equation_parts JSONB column to statistics table for Equation Statistics feature
-- equation_parts stores an ordered array of { stat_id, operator } objects
-- Example: [{"stat_id":"uuid-A","operator":null},{"stat_id":"uuid-B","operator":"+"}]
-- Equation stats are identified by stat_category = 'equation'

ALTER TABLE statistics
  ADD COLUMN IF NOT EXISTS equation_parts jsonb;
