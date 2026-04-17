-- Strip SUB - and VEN - prefixes using simple REPLACE (standard ASCII confirmed)
UPDATE subs_vendors
SET company_name = TRIM(
  REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
    company_name,
    'SUB - ', ''),
    'SUB- ',  ''),
    'SUB -',  ''),
    'VEN - ', ''),
    'VEN- ',  ''),
    'VEN -',  '')
),
updated_at = now()
WHERE company_name ILIKE 'SUB%' OR company_name ILIKE 'VEN%';

-- Confirm results
SELECT company_name, type FROM subs_vendors
WHERE updated_at > now() - interval '1 minute'
ORDER BY company_name;
