-- supabase-update-84.sql
-- Capitalize first letter of first_name and last_name for all contacts.
-- Uses initcap() which handles "john smith" → "John Smith" and also
-- corrects ALL-CAPS names like "JOHN" → "John".

UPDATE contacts
SET
  first_name = initcap(trim(first_name)),
  last_name  = initcap(trim(last_name))
WHERE
  first_name IS NOT NULL OR last_name IS NOT NULL;
