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


-- ─────────────────────────────────────────────────────────────────────────
-- Data API grants (Supabase change effective 2026-10-30 — new tables in
-- public are not exposed via PostgREST / supabase-js by default; this
-- block makes them reachable. RLS policies (above) still control rows.
-- ─────────────────────────────────────────────────────────────────────────
GRANT ALL ON public.stat_import_export_log TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.stat_import_export_log TO authenticated;
