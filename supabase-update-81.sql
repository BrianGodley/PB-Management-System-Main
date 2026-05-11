-- supabase-update-81.sql
-- Adds campaign field to contacts table.
--
-- campaign — marketing campaign name/source; mapped from GHL custom field
--            "Campaign"; displayed in Marketing tab below Source Type.
--
-- Safe to re-run (IF NOT EXISTS).

ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS campaign text;
