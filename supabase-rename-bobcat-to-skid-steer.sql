-- Rename "Bobcat" → "Skid Steer" in labor_rates (category = 'Paver')
-- Run once in Supabase SQL Editor

UPDATE labor_rates
SET name = 'Paver - Base Skid Steer Good'
WHERE name = 'Paver - Base Bobcat Good';

UPDATE labor_rates
SET name = 'Paver - Base Skid Steer OK'
WHERE name = 'Paver - Base Bobcat OK';

UPDATE labor_rates
SET name = 'Paver - Base Mini Skid Steer'
WHERE name = 'Paver - Base Mini Bobcat';

-- Verify
SELECT id, name, rate, unit, category
FROM labor_rates
WHERE category = 'Paver'
ORDER BY name;
