-- ─────────────────────────────────────────────────────────────────────────────
-- supabase-update-18.sql
-- Fix: make handle_new_user trigger non-blocking +
--      add missing INSERT policy on profiles so admin upsert works
-- Run after supabase-update-17.sql
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. Non-blocking trigger ───────────────────────────────────────────────────
-- If profile insert fails for any reason the auth signup still succeeds.
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  )
  ON CONFLICT (id) DO UPDATE
    SET email     = EXCLUDED.email,
        full_name = COALESCE(EXCLUDED.full_name, profiles.full_name);
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'handle_new_user failed for %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;

-- ── 2. INSERT policy on profiles (was missing — caused silent upsert failure) ─
-- Admins can insert any profile row (needed when trigger fires late or fails).
-- Users can insert their own profile row (self-service / SSO fallback).
DROP POLICY IF EXISTS "profiles_insert_admin" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_own"   ON profiles;

CREATE POLICY "profiles_insert_admin" ON profiles
  FOR INSERT WITH CHECK (is_admin());

CREATE POLICY "profiles_insert_own" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- ── 3. Admin SELECT / UPDATE / ALL policies (idempotent re-apply) ─────────────
DROP POLICY IF EXISTS "profiles_admin_all" ON profiles;

CREATE POLICY "profiles_admin_all" ON profiles
  FOR ALL USING (is_admin());
