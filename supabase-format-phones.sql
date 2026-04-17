-- Helper function: strips non-digits, takes last 10, formats as (xxx) xxx-xxxx
CREATE OR REPLACE FUNCTION format_phone(p text) RETURNS text AS $$
DECLARE
  digits text;
BEGIN
  IF p IS NULL OR TRIM(p) = '' THEN RETURN p; END IF;
  digits := regexp_replace(p, '\D', '', 'g');   -- strip everything except digits
  digits := right(digits, 10);                  -- drop country code (+1) if present
  IF length(digits) = 10 THEN
    RETURN '(' || left(digits,3) || ') ' || substring(digits,4,3) || '-' || right(digits,4);
  ELSE
    RETURN p;  -- can't format cleanly, leave as-is
  END IF;
END;
$$ LANGUAGE plpgsql;

-- ── Preview first — confirm results look right before updating ──
SELECT
  company_name,
  cell              AS cell_before,   format_phone(cell)  AS cell_after,
  phone             AS phone_before,  format_phone(phone) AS phone_after
FROM subs_vendors
WHERE cell IS NOT NULL OR phone IS NOT NULL
ORDER BY company_name;

-- ── Run after confirming preview ──
/*
UPDATE subs_vendors
SET
  cell       = format_phone(cell),
  phone      = format_phone(phone),
  updated_at = now()
WHERE cell IS NOT NULL OR phone IS NOT NULL;
*/
