-- Step 1: See the exact names currently in the DB
SELECT id, name, rate, unit, category
FROM labor_rates
WHERE name ILIKE '%bobcat%'
ORDER BY name;

-- Step 2: Rename any variation of "Bobcat" → "Skid Steer" in Paver labor rates
UPDATE labor_rates
SET name = REPLACE(REPLACE(name, 'Bobcat', 'Skid Steer'), 'bobcat', 'skid steer')
WHERE name ILIKE '%bobcat%';

-- Step 3: Verify result
SELECT id, name, rate, unit, category
FROM labor_rates
WHERE category = 'Paver'
ORDER BY name;
