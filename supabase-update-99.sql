-- supabase-update-99.sql
-- HR: position Hats, per-employee file system, and the New Employee template.
-- Run once in the Supabase SQL editor.

-- 1) Positions get a Quick Hat + Full Hat document (URL + display name).
alter table positions
  add column if not exists quick_hat_url  text,
  add column if not exists quick_hat_name text,
  add column if not exists full_hat_url   text,
  add column if not exists full_hat_name  text;

-- 2) Per-employee, folder-capable file system.
create table if not exists employee_files (
  id           uuid primary key default gen_random_uuid(),
  employee_id  uuid not null references employees(id) on delete cascade,
  parent_id    uuid references employee_files(id) on delete cascade, -- null = root
  is_folder    boolean not null default false,
  name         text not null,
  storage_path text,              -- null for folders
  file_type    text,
  file_size    bigint,
  uploaded_by  uuid,
  created_at   timestamptz default now()
);
create index if not exists employee_files_employee_idx on employee_files(employee_id);
create index if not exists employee_files_parent_idx   on employee_files(parent_id);

alter table employee_files enable row level security;
do $$ begin
  create policy "employee_files_all" on employee_files
    for all to authenticated using (true) with check (true);
exception when duplicate_object then null; end $$;

-- PostgREST exposure (Supabase 2026-10-30 change: new public tables aren't
-- auto-exposed).
grant all on public.employee_files to authenticated, service_role;

-- 3) Storage bucket for HR files (public, like job-files, so the in-app
--    viewer and the Office Online preview can fetch by URL).
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

-- 4) New Employee template — the default folder names copied into every new
--    hire's Files tab. Editable in HR > Settings > New Employee.
alter table company_settings
  add column if not exists new_employee_file_template jsonb
    default '["Full Hat","Quick Hat","Application","Review Forms"]'::jsonb;

update company_settings
set new_employee_file_template = '["Full Hat","Quick Hat","Application","Review Forms"]'::jsonb
where new_employee_file_template is null;
