-- supabase-update-80.sql
-- Adds marketing and GHL-sync fields to the contacts table.
--
-- New columns:
--   last_activity_at   — GHL's lastActivityDate; timestamptz
--   call_center_notes  — GHL custom field "Call Center Notes"; text
--   consultation_type  — GHL custom field "Design or Estimate Consultation?";
--                        constrained to 'Design' | 'Estimate' | NULL
--   interest_1         — GHL custom field "I'm interested in #1"; text
--   interest_2         — GHL custom field "I'm interested in #2"; text
--   interest_3         — GHL custom field "I'm interested in (check all that apply)"; text
--
-- Safe to re-run (IF NOT EXISTS on each column).

ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS last_activity_at   timestamptz,
  ADD COLUMN IF NOT EXISTS call_center_notes  text,
  ADD COLUMN IF NOT EXISTS consultation_type  text
    CHECK (consultation_type IN ('Design', 'Estimate')),
  ADD COLUMN IF NOT EXISTS interest_1         text,
  ADD COLUMN IF NOT EXISTS interest_2         text,
  ADD COLUMN IF NOT EXISTS interest_3         text;
