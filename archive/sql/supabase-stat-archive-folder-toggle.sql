-- ─────────────────────────────────────────────────────────────────────────────
-- supabase-stat-archive-folder-toggle.sql
-- Adds a company-wide toggle controlling whether the Statistics sidebar shows
-- the "All Stats" / "Archived" folder split, or just a flat list.
--
-- TRUE  (default) → both folders appear in the sidebar.
-- FALSE           → no folder buttons render; the sidebar shows only the user's
--                   accessible non-archived stats in a flat list.
--
-- Safe to re-run.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.company_settings
  ADD COLUMN IF NOT EXISTS show_stat_archive_folder BOOLEAN DEFAULT TRUE;
