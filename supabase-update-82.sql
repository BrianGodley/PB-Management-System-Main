-- supabase-update-82.sql
-- Adds entity_type and company_contacts columns to contacts table.
--
-- entity_type    — 'individual' (default) or 'company'
-- company_contacts — JSONB array of { first_name, last_name, email, phone }
--                    for company contacts; null / empty for individuals.
--
-- Safe to re-run (IF NOT EXISTS / no-op on existing constraint).

ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS entity_type text NOT NULL DEFAULT 'individual'
    CHECK (entity_type IN ('individual', 'company')),
  ADD COLUMN IF NOT EXISTS company_contacts jsonb DEFAULT '[]'::jsonb;
