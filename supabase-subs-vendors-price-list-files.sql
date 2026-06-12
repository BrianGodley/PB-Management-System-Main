-- ============================================================================
-- Subs & Vendors: price-list file uploads
-- ----------------------------------------------------------------------------
-- 1) A jsonb column on subs_vendors holding an array of file references:
--      [{ "name": "...", "path": "...", "type": "...", "size": 123 }, ...]
-- 2) A private storage bucket "sub-vendor-files" where the actual PDF/Excel/
--    Word files live (the app uploads to it and opens them via signed URLs).
-- 3) Policies letting any authenticated user read / upload / delete in that
--    bucket (matches how the rest of the app treats internal files).
-- Run this whole script once in the Supabase SQL editor.
-- ============================================================================

-- 1) Column ───────────────────────────────────────────────────────────────────
alter table subs_vendors
  add column if not exists price_list_files jsonb not null default '[]'::jsonb;

-- 2) Private storage bucket ────────────────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('sub-vendor-files', 'sub-vendor-files', false)
on conflict (id) do nothing;

-- 3) Access policies (authenticated users) ─────────────────────────────────────
drop policy if exists "sub_vendor_files_select" on storage.objects;
create policy "sub_vendor_files_select"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'sub-vendor-files');

drop policy if exists "sub_vendor_files_insert" on storage.objects;
create policy "sub_vendor_files_insert"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'sub-vendor-files');

drop policy if exists "sub_vendor_files_update" on storage.objects;
create policy "sub_vendor_files_update"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'sub-vendor-files');

drop policy if exists "sub_vendor_files_delete" on storage.objects;
create policy "sub_vendor_files_delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'sub-vendor-files');
