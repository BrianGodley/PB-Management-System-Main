-- ─────────────────────────────────────────────────────────────────────────────
-- BT photo-download support (run once in Supabase SQL Editor)
--
-- 1. Adds photo_urls TEXT[] to daily_logs so we can record the public URLs
--    of every photo we pull from BuilderTrend.
-- 2. Creates the 'bt-daily-log-photos' Storage bucket (public read).
-- 3. Sets RLS so authenticated users can read, but only the service role can
--    write — the downloader script runs with the service-role key.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Column on daily_logs ----------------------------------------------------
alter table public.daily_logs
  add column if not exists photo_urls text[] default '{}'::text[];

comment on column public.daily_logs.photo_urls is
  'Public URLs of photos downloaded from BuilderTrend by bt-photo-download.py.';

-- 2. Storage bucket ----------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('bt-daily-log-photos', 'bt-daily-log-photos', true)
on conflict (id) do nothing;

-- 3. Storage policies --------------------------------------------------------
-- Anyone can read the photos (bucket is public anyway, but make it explicit).
drop policy if exists "bt photos read" on storage.objects;
create policy "bt photos read"
  on storage.objects for select
  using ( bucket_id = 'bt-daily-log-photos' );

-- Only the service role inserts / updates / deletes. PostgREST exposes the
-- service role as the JWT role 'service_role'.
drop policy if exists "bt photos write" on storage.objects;
create policy "bt photos write"
  on storage.objects for all
  using ( bucket_id = 'bt-daily-log-photos' and auth.role() = 'service_role' )
  with check ( bucket_id = 'bt-daily-log-photos' and auth.role() = 'service_role' );
