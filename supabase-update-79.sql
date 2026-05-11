-- supabase-update-79.sql
-- Add additional contact info columns to support GHL's extra email/phone fields.
--
-- additional_emails  — array of secondary email addresses from GHL
-- additional_phones  — array of secondary phone numbers from GHL
--
-- Stored as text[] so they're queryable with Postgres array operators.
-- Safe to re-run (IF NOT EXISTS on each column).

ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS additional_emails text[],
  ADD COLUMN IF NOT EXISTS additional_phones text[];
