-- supabase-update-78.sql
-- Extend contacts table with additional GHL fields to support full field
-- mapping on inbound / outbound sync.
--
-- New columns:
--   website          — contact's website URL (standard GHL field)
--   timezone         — IANA timezone string from GHL (e.g. "America/Los_Angeles")
--   country          — country name / code from GHL
--   dnd              — overall Do-Not-Disturb flag from GHL
--   ghl_assigned_to  — raw GHL user-id of the assigned rep (text, no FK because
--                      GHL users are not PBS profiles; resolve to a name in-app)
--   how_did_you_hear — free-text "How did you hear about us?" value pulled from
--                      the GHL custom field keyed contact.how_did_you_hear_about_us
--   ghl_custom_fields — full customFields array from GHL stored as JSONB so that
--                       any field can be queried without re-syncing;
--                       [{id, fieldValue}, …]
--
-- Safe to re-run (IF NOT EXISTS guards on every column).

ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS website           text,
  ADD COLUMN IF NOT EXISTS timezone          text,
  ADD COLUMN IF NOT EXISTS country           text,
  ADD COLUMN IF NOT EXISTS dnd               boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS ghl_assigned_to   text,
  ADD COLUMN IF NOT EXISTS how_did_you_hear  text,
  ADD COLUMN IF NOT EXISTS ghl_custom_fields jsonb;

-- Index for querying contacts by source / how_did_you_hear (common analytics filter).
CREATE INDEX IF NOT EXISTS contacts_how_did_you_hear_idx
  ON public.contacts (how_did_you_hear);
