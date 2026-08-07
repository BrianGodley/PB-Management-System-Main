-- ============================================================
-- Add supervisor positions config to company_settings
-- Picks one or more HR positions to treat as supervisors for
-- the Schedule Assistant supervisor optimizer.
-- ============================================================

ALTER TABLE company_settings
  ADD COLUMN IF NOT EXISTS supervisor_position_ids JSONB NOT NULL DEFAULT '[]'::jsonb;
