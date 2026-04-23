-- supabase-update-27.sql
-- Import / Export history log

create table if not exists stat_import_export_log (
  id            uuid        primary key default gen_random_uuid(),
  type          text        not null check (type in ('import', 'export')),
  file_name     text,
  stat_names    text[]      default '{}',
  stat_count    integer     default 0,
  value_count   integer     default 0,
  performed_by  uuid        references auth.users(id),
  performed_at  timestamptz default now()
);

-- RLS
alter table stat_import_export_log enable row level security;

create policy "Authenticated users can view log"
  on stat_import_export_log for select
  using (auth.role() = 'authenticated');

create policy "Authenticated users can insert log"
  on stat_import_export_log for insert
  with check (auth.role() = 'authenticated');
