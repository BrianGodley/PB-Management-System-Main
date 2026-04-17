-- ── Step 1: Run this SELECT first to see what VEN records exist and their current type ──
SELECT company_name, type
FROM subs_vendors
WHERE company_name ILIKE 'VEN%'
ORDER BY company_name;

-- ── Step 2: Broader update — catches VEN-, VEN -, VEN - , VEN: etc. ──
-- Uncomment and run after confirming the SELECT looks right
/*
UPDATE subs_vendors
SET type = 'vendor',
    updated_at = now()
WHERE company_name ILIKE 'VEN%';
*/
