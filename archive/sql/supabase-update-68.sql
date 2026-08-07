-- supabase-update-68.sql
-- Add super_admin role and designate Brian Godley as super_admin
--
-- 1. Drop the existing role check constraint (if any) and re-add it
--    to include 'super_admin' as a valid role value.
-- 2. Set Brian Godley's profile to super_admin.

-- Drop the old constraint (name may vary — cover both common forms)
ALTER TABLE profiles
  DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE profiles
  DROP CONSTRAINT IF EXISTS check_role;

-- Re-add with super_admin included
ALTER TABLE profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('user', 'admin', 'super_admin'));

-- Set Brian Godley as super_admin (matched by email)
UPDATE profiles
  SET role = 'super_admin'
  WHERE email = 'brian@picturebuild.com';
