-- Estimate version tree.
--   version              — 1 for the original, 2/3/… for what-if-derived copies.
--   parent_estimate_id   — FK to the original estimate (NULL on originals).
-- Creating a new version is done by duplicating the estimate row, plus its
-- estimate_projects and estimate_modules, with the new GPMD overrides
-- baked into the module data. Originals stay untouched so the user always
-- has a clean lineage.
ALTER TABLE public.estimates
  ADD COLUMN IF NOT EXISTS version            int     DEFAULT 1,
  ADD COLUMN IF NOT EXISTS parent_estimate_id uuid    REFERENCES public.estimates(id) ON DELETE CASCADE;

-- Backfill existing rows so the first save reads as Estimate 1.
UPDATE public.estimates SET version = 1 WHERE version IS NULL;

CREATE INDEX IF NOT EXISTS idx_estimates_parent ON public.estimates(parent_estimate_id);
