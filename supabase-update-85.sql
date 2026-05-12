-- supabase-update-85.sql
-- Clear ghl_assigned_to values that are raw GHL user IDs (alphanumeric strings
-- with no spaces, 15+ chars) rather than resolved human names.
-- After deploying the updated edge function and re-syncing, the next pull
-- will overwrite these nulls with the correct resolved names.

UPDATE contacts
SET ghl_assigned_to = NULL
WHERE
  ghl_assigned_to IS NOT NULL
  AND ghl_assigned_to ~ '^[A-Za-z0-9]{15,}$';
