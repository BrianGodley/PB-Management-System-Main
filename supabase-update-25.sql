-- ─────────────────────────────────────────────────────────────────────────────
-- supabase-update-25.sql
-- Adds avatar photo URL and address fields to profiles
-- Run after supabase-update-24.sql
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS avatar_url   TEXT,
  ADD COLUMN IF NOT EXISTS address_line1 TEXT,
  ADD COLUMN IF NOT EXISTS address_line2 TEXT,
  ADD COLUMN IF NOT EXISTS city          TEXT,
  ADD COLUMN IF NOT EXISTS state         TEXT,
  ADD COLUMN IF NOT EXISTS zip_code      TEXT;

NOTIFY pgrst, 'reload schema';

-- ─────────────────────────────────────────────────────────────────────────────
-- Storage: Create an "avatars" bucket for profile photos
-- Run this separately in the Supabase SQL editor, or create the bucket
-- manually in Supabase Dashboard → Storage → New bucket:
--   Name: avatars
--   Public: YES  (so photo URLs work without auth)
-- ─────────────────────────────────────────────────────────────────────────────

-- If you want to create the bucket via SQL:
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('avatars', 'avatars', true)
-- ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload/update/delete their own avatar:
-- CREATE POLICY "Users can manage their own avatar"
-- ON storage.objects FOR ALL
-- TO authenticated
-- USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1])
-- WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
