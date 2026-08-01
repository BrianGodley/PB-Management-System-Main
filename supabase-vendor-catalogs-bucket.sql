-- ============================================================================
-- Storage for the Vendor Catalog importer
-- ----------------------------------------------------------------------------
--   • vendor-catalogs  — the uploaded catalog files (PDF/image) Sam reads.
--   • cropped item photos are uploaded to the existing public 'rate-photos'
--     bucket and referenced from material_rates.photo_url (no new table needed;
--     the photo is stored and referenced to the item).
-- Idempotent. Run on STAGING first, then PROD.
-- ============================================================================

insert into storage.buckets (id, name, public)
values ('vendor-catalogs', 'vendor-catalogs', false)
on conflict (id) do nothing;

drop policy if exists "vendor_catalogs_auth_all" on storage.objects;
create policy "vendor_catalogs_auth_all" on storage.objects
  for all to authenticated
  using (bucket_id = 'vendor-catalogs')
  with check (bucket_id = 'vendor-catalogs');
