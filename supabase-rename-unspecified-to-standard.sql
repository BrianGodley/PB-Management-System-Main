-- Rename the permanent system vendor "Unspecified" → "Standard" so the label
-- matches the model (the standard/default price list). The app's protection
-- guards accept either name, so ordering with the deploy doesn't matter.
UPDATE subs_vendors
   SET company_name = 'Standard'
 WHERE lower(trim(company_name)) = 'unspecified';
