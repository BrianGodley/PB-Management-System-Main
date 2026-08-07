-- supabase-update-89.sql
-- Move individual contacts that have a company_name into the companies table.
--
-- Strategy:
--   1. For each unique company_name in contacts, insert ONE company row
--      (using the first contact's address/phone/email as the company's info).
--   2. Roll every individual with that company name into company_contacts JSON.
--   3. Skip company names that already exist in the companies table
--      (avoids duplicates — the individuals are still deleted in step 4).
--   4. Delete all individual contacts that had a non-empty company_name.
--
-- Run the SELECT preview block first to see what will be affected.

-- ── Preview (run this first to inspect) ───────────────────────────────────────
-- SELECT
--   trim(company_name)            AS company,
--   count(*)                      AS individual_count,
--   bool_or(EXISTS (
--     SELECT 1 FROM companies co
--     WHERE lower(trim(co.company_name)) = lower(trim(c.company_name))
--   ))                            AS already_in_companies
-- FROM contacts c
-- WHERE company_name IS NOT NULL AND trim(company_name) <> ''
-- GROUP BY trim(company_name)
-- ORDER BY individual_count DESC;

BEGIN;

-- ── Step 1: Insert new companies (skip names already in companies table) ───────
INSERT INTO companies (
  company_name,
  company_street,
  company_city,
  company_state,
  company_zip,
  phone,
  email,
  ghl_assigned_to,
  stage,
  contact_type,
  source,
  campaign,
  how_did_you_hear,
  notes,
  project_description,
  call_center_notes,
  company_contacts,
  created_at
)
SELECT
  trim(company_name)                             AS company_name,
  -- Use the first contact's address as the company address
  (array_agg(street_address ORDER BY created_at))[1] AS company_street,
  (array_agg(city           ORDER BY created_at))[1] AS company_city,
  (array_agg(state          ORDER BY created_at))[1] AS company_state,
  (array_agg(zip            ORDER BY created_at))[1] AS company_zip,
  (array_agg(phone          ORDER BY created_at))[1] AS phone,
  (array_agg(email          ORDER BY created_at))[1] AS email,
  (array_agg(ghl_assigned_to ORDER BY created_at) FILTER (WHERE ghl_assigned_to IS NOT NULL))[1] AS ghl_assigned_to,
  (array_agg(stage          ORDER BY created_at))[1] AS stage,
  -- Only pass through values the companies check constraint allows; NULL otherwise
  CASE
    WHEN (array_agg(contact_type ORDER BY created_at))[1] IN ('Residential','Commercial','HOA','Government','Other')
    THEN (array_agg(contact_type ORDER BY created_at))[1]
    ELSE NULL
  END AS contact_type,
  (array_agg(source         ORDER BY created_at) FILTER (WHERE source IS NOT NULL))[1] AS source,
  (array_agg(campaign       ORDER BY created_at) FILTER (WHERE campaign IS NOT NULL))[1] AS campaign,
  (array_agg(how_did_you_hear ORDER BY created_at) FILTER (WHERE how_did_you_hear IS NOT NULL))[1] AS how_did_you_hear,
  (array_agg(notes          ORDER BY created_at) FILTER (WHERE notes IS NOT NULL))[1] AS notes,
  (array_agg(project_description ORDER BY created_at) FILTER (WHERE project_description IS NOT NULL))[1] AS project_description,
  (array_agg(call_center_notes   ORDER BY created_at) FILTER (WHERE call_center_notes IS NOT NULL))[1] AS call_center_notes,
  -- Build company_contacts JSON array from every individual with this company name
  jsonb_agg(
    jsonb_build_object(
      'first_name', coalesce(first_name, ''),
      'last_name',  coalesce(last_name,  ''),
      'position',   '',
      'phone',      coalesce(cell, phone, ''),
      'email',      coalesce(email, '')
    )
    ORDER BY last_name, first_name
  ) FILTER (WHERE first_name IS NOT NULL OR last_name IS NOT NULL) AS company_contacts,
  min(created_at) AS created_at
FROM contacts
WHERE
  company_name IS NOT NULL
  AND trim(company_name) <> ''
  AND lower(trim(company_name)) NOT IN (
    SELECT lower(trim(company_name)) FROM companies
  )
GROUP BY trim(company_name);

-- ── Step 2: Delete all individual contacts that had a company name ─────────────
DELETE FROM contacts
WHERE company_name IS NOT NULL
  AND trim(company_name) <> '';

COMMIT;
