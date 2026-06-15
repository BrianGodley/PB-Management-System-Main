-- supabase-update-99.sql
-- HR: position Hats + New Employee file-folder template.
-- Run once in the Supabase SQL editor. Safe to re-run.

-- 1) Positions get a Quick Hat + Full Hat document (URL + display name),
--    opened from the Positions table via the Quick Hat / Full Hat buttons.
alter table positions
  add column if not exists quick_hat_url  text,
  add column if not exists quick_hat_name text,
  add column if not exists full_hat_url   text,
  add column if not exists full_hat_name  text;

-- 2) Storage bucket for the position Hat documents (public, like job-files,
--    so the in-app viewer + Office Online preview can fetch by URL).
insert into storage.buckets (id, name, public)
values ('hr-files', 'hr-files', true)
on conflict (id) do nothing;

do $$ begin
  create policy "hr_files_read"   on storage.objects for select to authenticated using (bucket_id = 'hr-files');
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "hr_files_write"  on storage.objects for insert to authenticated with check (bucket_id = 'hr-files');
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "hr_files_delete" on storage.objects for delete to authenticated using (bucket_id = 'hr-files');
exception when duplicate_object then null; end $$;

-- 3) New Employee template — the folder names shown in every employee's Files
--    tab (EmployeeDetail > Files, backed by employee_documents.category).
--    Editable in HR > Settings > New Employee.
alter table company_settings
  add column if not exists new_employee_file_template jsonb
    default '["Full Hat","Quick Hat","Application","Review Forms","Personnel Records","ID Documents","Other"]'::jsonb;

update company_settings
set new_employee_file_template =
  '["Full Hat","Quick Hat","Application","Review Forms","Personnel Records","ID Documents","Other"]'::jsonb
where new_employee_file_template is null;

-- NOTE: an earlier draft of this migration created an employee_files table +
-- per-employee folder rows. That approach was dropped — employee files live in
-- the existing employee_documents table, with the template above defining the
-- folders. If you already ran that draft, the unused employee_files table is
-- harmless and can be dropped with:  drop table if exists employee_files;
