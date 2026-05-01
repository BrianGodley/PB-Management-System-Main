-- supabase-update-67.sql
-- Fix FK constraints that blocked user deletion
--
-- estimates, material_rates, labor_rates, and subcontractor_rates all have
-- created_by REFERENCES auth.users(id) with no ON DELETE action (defaults to
-- RESTRICT). This causes a FK violation when an admin tries to delete a user
-- because Postgres won't remove the auth.users row while rows in those tables
-- still point to it.
--
-- Fix: drop and re-add each constraint with ON DELETE SET NULL so the user
-- can be deleted and the created_by column is simply nulled out.

-- estimates
ALTER TABLE estimates
  DROP CONSTRAINT IF EXISTS estimates_created_by_fkey;
ALTER TABLE estimates
  ADD CONSTRAINT estimates_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- material_rates
ALTER TABLE material_rates
  DROP CONSTRAINT IF EXISTS material_rates_created_by_fkey;
ALTER TABLE material_rates
  ADD CONSTRAINT material_rates_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- labor_rates
ALTER TABLE labor_rates
  DROP CONSTRAINT IF EXISTS labor_rates_created_by_fkey;
ALTER TABLE labor_rates
  ADD CONSTRAINT labor_rates_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- subcontractor_rates
ALTER TABLE subcontractor_rates
  DROP CONSTRAINT IF EXISTS subcontractor_rates_created_by_fkey;
ALTER TABLE subcontractor_rates
  ADD CONSTRAINT subcontractor_rates_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;
