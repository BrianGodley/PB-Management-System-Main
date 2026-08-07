-- supabase-reset-contacts.sql
-- Wipes all contact records and resets the GHL sync watermark so the next
-- sync pulls the entire contact list fresh from GoHighLevel.
--
-- Run this in the Supabase SQL editor, then trigger a full sync from
-- Admin → Integrations → GHL → Sync Contacts.
--
-- WHAT THIS DELETES:
--   • contact_communications  (all comm-log entries for individual contacts)
--   • contacts                (all individual contact records)
--
-- WHAT THIS DOES NOT TOUCH:
--   • companies / company_communications  (company contacts — separate table)
--   • clients / estimates / bids / jobs   (unrelated to contacts)
--   • profiles / auth.users               (employee accounts — unrelated)
--   • ghl_connections                     (your API credentials — kept)
--   • ghl_sync_log                        (history log — kept for reference)
--
-- After this runs the GHL sync will be in BULK mode (full re-import).

BEGIN;

-- 1. Clear all communication log entries for individual contacts
DELETE FROM contact_communications;

-- 2. Clear all individual contact records
DELETE FROM contacts;

-- 3. Reset the sync watermark so the next run triggers a full bulk import
UPDATE ghl_sync_state
SET
  inbound_synced_at = NULL,
  last_run_status   = NULL,
  last_run_message  = NULL
WHERE object_type = 'contacts';

COMMIT;
