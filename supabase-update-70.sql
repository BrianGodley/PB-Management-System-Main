-- supabase-update-70.sql
-- Add cell_phone field to employees; migrate existing phone → cell_phone
-- Phone becomes home/work number; cell_phone is mobile (used for SMS)

-- 1. Add cell_phone column
ALTER TABLE employees ADD COLUMN IF NOT EXISTS cell_phone TEXT;

-- 2. Copy all existing phone values into cell_phone
UPDATE employees
SET cell_phone = phone
WHERE phone IS NOT NULL AND phone <> '';

-- 3. Clear the phone column (it now represents home/work phone)
UPDATE employees SET phone = NULL;
