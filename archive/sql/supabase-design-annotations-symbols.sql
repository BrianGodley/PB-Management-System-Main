-- ─────────────────────────────────────────────────────────────────────────────
-- supabase-design-annotations-symbols.sql
-- Adds a `symbol` column to design_annotations so count-type annotations can
-- carry a per-marker shape (square, triangle, circle, plus, pound, asterisk,
-- ampersand, percent). Ignored for non-count types.
--
-- Safe to re-run.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.design_annotations
  ADD COLUMN IF NOT EXISTS symbol TEXT;
