-- supabase-background-uploads.sql
-- Let any signed-in user upload / manage their own background photos in the
-- public "company-assets" bucket under  backgrounds/<user_id>/...
-- (The bucket is already public-read, same as the company logo.)
-- Run once in the Supabase SQL editor.

-- Public can read background images (bucket is public; this is explicit/idempotent).
drop policy if exists "bg_public_read" on storage.objects;
create policy "bg_public_read" on storage.objects
  for select to public
  using (bucket_id = 'company-assets');

-- Authenticated users may upload into the backgrounds/ folder.
drop policy if exists "bg_auth_insert" on storage.objects;
create policy "bg_auth_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'company-assets' and (storage.foldername(name))[1] = 'backgrounds');

-- Authenticated users may overwrite/update objects in backgrounds/.
drop policy if exists "bg_auth_update" on storage.objects;
create policy "bg_auth_update" on storage.objects
  for update to authenticated
  using (bucket_id = 'company-assets' and (storage.foldername(name))[1] = 'backgrounds');

-- Authenticated users may delete objects in backgrounds/.
drop policy if exists "bg_auth_delete" on storage.objects;
create policy "bg_auth_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'company-assets' and (storage.foldername(name))[1] = 'backgrounds');
