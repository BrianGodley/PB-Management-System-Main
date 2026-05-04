-- ─────────────────────────────────────────────────────────────────────────────
-- supabase-sync-employee-email.sql
-- Keep auth + profiles email in sync when an admin edits an employee email in HR.
--
-- Problem this solves:
--   Email lives in three places — employees.email (HR profile),
--   profiles.email (used by the username-login RPC), and auth.users.email
--   (where Supabase actually delivers the password reset link). HR was only
--   updating employees.email, so password resets kept going to the old address.
--
-- This adds an admin-only RPC that updates the latter two, including
-- auth.identities (Supabase's secondary email store) and skipping the
-- email-change confirmation flow because the admin is making the change
-- directly.
--
-- Safe to re-run (CREATE OR REPLACE).
-- Run in Supabase: SQL editor → paste → Run.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION admin_sync_employee_email(
  p_employee_id UUID,
  p_new_email   TEXT
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_user_id    UUID;
  v_normalised TEXT;
  v_collisions INT;
BEGIN
  -- Caller must be admin
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
     WHERE id = auth.uid() AND role = 'admin'
  ) THEN
    RETURN 'forbidden';
  END IF;

  v_normalised := LOWER(TRIM(p_new_email));
  IF v_normalised IS NULL OR v_normalised = '' THEN
    RETURN 'invalid_email';
  END IF;

  -- Find the linked auth user (if any)
  SELECT user_id INTO v_user_id
    FROM public.employees
   WHERE id = p_employee_id;

  IF v_user_id IS NULL THEN
    -- No auth account linked to this employee; nothing to sync (and no error)
    RETURN 'no_linked_account';
  END IF;

  -- Reject if another auth user already owns this email
  SELECT COUNT(*) INTO v_collisions
    FROM auth.users
   WHERE LOWER(email) = v_normalised
     AND id <> v_user_id;
  IF v_collisions > 0 THEN
    RETURN 'email_already_in_use';
  END IF;

  -- Update auth.users — keep the user verified, clear any in-flight email change
  UPDATE auth.users
     SET email                       = v_normalised,
         email_change                = '',
         email_change_token_new      = '',
         email_change_token_current  = '',
         email_change_confirm_status = 0,
         email_confirmed_at          = COALESCE(email_confirmed_at, NOW()),
         updated_at                  = NOW()
   WHERE id = v_user_id;

  -- Update auth.identities (Supabase's secondary email store; some flows read here)
  UPDATE auth.identities
     SET identity_data = jsonb_set(
                            COALESCE(identity_data, '{}'::jsonb),
                            '{email}',
                            to_jsonb(v_normalised),
                            true
                         ),
         updated_at    = NOW()
   WHERE user_id  = v_user_id
     AND provider = 'email';

  -- Update profiles.email so get_email_by_username returns the new address
  UPDATE public.profiles
     SET email = v_normalised
   WHERE id = v_user_id;

  RETURN 'ok';
END;
$$;

GRANT EXECUTE ON FUNCTION admin_sync_employee_email(UUID, TEXT) TO authenticated;
