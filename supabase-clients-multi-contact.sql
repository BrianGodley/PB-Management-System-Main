-- Mirror the contacts table's multi-contact-info columns on clients.
-- cell              — separate cell line in addition to phone
-- additional_emails — text[] of secondary email addresses
-- additional_phones — text[] of secondary phone numbers
-- Safe to re-run.

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS cell              text,
  ADD COLUMN IF NOT EXISTS additional_emails text[],
  ADD COLUMN IF NOT EXISTS additional_phones text[];
