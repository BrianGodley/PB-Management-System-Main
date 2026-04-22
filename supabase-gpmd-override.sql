-- Add per-project GPMD override column to estimate_projects
-- When set, overrides the GPMD derived from module calculations for that project.
-- The overall estimate GPMD bar reflects the blended adjusted value across all projects.
ALTER TABLE estimate_projects
  ADD COLUMN IF NOT EXISTS gpmd_override numeric;
