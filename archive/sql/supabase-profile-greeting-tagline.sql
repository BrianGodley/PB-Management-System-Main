-- ─────────────────────────────────────────────────────────────────────────────
-- supabase-profile-greeting-tagline.sql
-- Adds a per-user "greeting tagline" so Sam's chat panel can greet each user
-- with a personalised signoff (e.g. "Go Steelers!", "Go Rams!").
--
-- Stored on profiles since every authenticated user has a profile row,
-- regardless of whether they're an HR-tracked employee.
--
-- Safe to re-run.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS greeting_tagline TEXT;

COMMENT ON COLUMN public.profiles.greeting_tagline IS
  'Optional one-line signoff Sam tacks onto the chat-panel greeting (e.g. "Go Rams!"). Admin-set in HR > Profile.';
