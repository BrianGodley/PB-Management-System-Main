-- supabase-update-103.sql
-- Documents → Files / Photos / Videos: a company file manager backed by a
-- single storage bucket. Three virtual roots ('files/', 'photos/', 'videos/')
-- keep the three tabs separate. Public (like job-files / hr-files) so the
-- in-app list + previews can fetch by URL.
-- ─────────────────────────────────────────────────────────────────────────────

insert into storage.buckets (id, name, public)
values ('company-files', 'company-files', true)
on conflict (id) do nothing;

do $$ begin
  create policy "company_files_read"   on storage.objects for select to authenticated using (bucket_id = 'company-files');
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "company_files_insert" on storage.objects for insert to authenticated with check (bucket_id = 'company-files');
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "company_files_update" on storage.objects for update to authenticated using (bucket_id = 'company-files');
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "company_files_delete" on storage.objects for delete to authenticated using (bucket_id = 'company-files');
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "company_files_public_read" on storage.objects for select to anon using (bucket_id = 'company-files');
exception when duplicate_object then null; end $$;
