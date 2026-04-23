-- ─────────────────────────────────────────────────────────────────────────────
-- supabase-update-17.sql
-- Username login support
--   • Adds username column to profiles (unique, case-insensitive)
--   • Creates get_email_by_username() RPC callable by anon (for login page)
--   • Creates set_username() helper for updating your own username
-- Run after supabase-update-16.sql
-- ─────────────────────────────────────────────────────────────────────────────

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Add username column to profiles
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS username TEXT;

-- Enforce uniqueness on a case-insensitive basis via a unique index
CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_unique
  ON profiles (LOWER(username))
  WHERE username IS NOT NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. get_email_by_username(p_username)
--    Called by the login page BEFORE the user is authenticated.
--    SECURITY DEFINER bypasses RLS so it can read profiles.
--    Granted to the anon role so no auth token is required.
--    Returns NULL if no match (login page treats this as invalid credentials).
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_email_by_username(p_username TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_email TEXT;
BEGIN
  SELECT email
    INTO v_email
    FROM profiles
   WHERE LOWER(username) = LOWER(TRIM(p_username))
   LIMIT 1;
  RETURN v_email;
END;
$$;

GRANT EXECUTE ON FUNCTION get_email_by_username(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION get_email_by_username(TEXT) TO authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. set_username(p_username)
--    Lets a user set their own username (enforces uniqueness cleanly).
--    Returns 'ok' on success, 'taken' if the username is already in use.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION set_username(p_username TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_exists BOOLEAN;
BEGIN
  -- Check if taken by someone else
  SELECT EXISTS (
    SELECT 1 FROM profiles
     WHERE LOWER(username) = LOWER(TRIM(p_username))
       AND id <> auth.uid()
  ) INTO v_exists;

  IF v_exists THEN
    RETURN 'taken';
  END IF;

  UPDATE profiles
     SET username = LOWER(TRIM(p_username))
   WHERE id = auth.uid();

  RETURN 'ok';
END;
$$;

GRANT EXECUTE ON FUNCTION set_username(TEXT) TO authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Back-fill usernames for existing users from their email prefix
--    e.g.  brian@company.com  →  brian
--    Only fills rows where username is currently NULL.
--    Appends a number if the prefix is already taken (brian2, brian3, etc.)
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  rec     RECORD;
  base    TEXT;
  attempt TEXT;
  counter INT;
BEGIN
  FOR rec IN SELECT id, email FROM profiles WHERE username IS NULL LOOP
    base    := LOWER(SPLIT_PART(rec.email, '@', 1));
    attempt := base;
    counter := 2;

    -- Find a unique slot
    WHILE EXISTS (
      SELECT 1 FROM profiles WHERE LOWER(username) = attempt
    ) LOOP
      attempt := base || counter;
      counter  := counter + 1;
    END LOOP;

    UPDATE profiles SET username = attempt WHERE id = rec.id;
  END LOOP;
END;
$$;
