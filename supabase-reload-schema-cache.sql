-- Reload PostgREST schema cache
-- Run this in Supabase SQL Editor any time you see
-- "Could not find column X in the schema cache" errors
NOTIFY pgrst, 'reload schema';
