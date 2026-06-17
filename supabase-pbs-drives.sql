-- supabase-pbs-drives.sql
-- Community "PBS Drives": named shared drives with per-user permissions,
-- mirroring Google Shared Drives. Files live under the existing company-files
-- storage bucket at  drives/<drive_id>/...  ; membership is enforced in the app
-- (admins manage drives; members see the drives they belong to).
--
-- The admin check is inlined against profiles.role in each policy (no
-- dollar-quoted function, which some SQL editors mishandle).
--
-- Run this once in the Supabase SQL editor.

-- ── Tables ──────────────────────────────────────────────────────────────────
create table if not exists pbs_drives (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text,
  created_by  uuid references auth.users(id),
  created_at  timestamptz default now()
);

create table if not exists pbs_drive_members (
  id         uuid primary key default gen_random_uuid(),
  drive_id   uuid not null references pbs_drives(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  -- viewer = read only, editor = upload/rename/delete, manager = also manage members
  permission text not null default 'viewer' check (permission in ('viewer','editor','manager')),
  created_at timestamptz default now(),
  unique (drive_id, user_id)
);

create index if not exists pbs_drive_members_drive_idx on pbs_drive_members(drive_id);
create index if not exists pbs_drive_members_user_idx  on pbs_drive_members(user_id);

-- ── RLS ─────────────────────────────────────────────────────────────────────
alter table pbs_drives        enable row level security;
alter table pbs_drive_members enable row level security;

-- Drives: a user sees a drive if they're a member or an admin. Admins manage.
drop policy if exists pbs_drives_select on pbs_drives;
create policy pbs_drives_select on pbs_drives for select using (
  exists (select 1 from profiles p where p.id = auth.uid() and p.role in ('admin','super_admin'))
  or exists (select 1 from pbs_drive_members m where m.drive_id = pbs_drives.id and m.user_id = auth.uid())
);

drop policy if exists pbs_drives_admin_all on pbs_drives;
create policy pbs_drives_admin_all on pbs_drives for all
  using      (exists (select 1 from profiles p where p.id = auth.uid() and p.role in ('admin','super_admin')))
  with check (exists (select 1 from profiles p where p.id = auth.uid() and p.role in ('admin','super_admin')));

-- Members: a user sees their own membership rows; admins see/manage all.
drop policy if exists pbs_members_select on pbs_drive_members;
create policy pbs_members_select on pbs_drive_members for select using (
  exists (select 1 from profiles p where p.id = auth.uid() and p.role in ('admin','super_admin'))
  or user_id = auth.uid()
);

drop policy if exists pbs_members_admin_all on pbs_drive_members;
create policy pbs_members_admin_all on pbs_drive_members for all
  using      (exists (select 1 from profiles p where p.id = auth.uid() and p.role in ('admin','super_admin')))
  with check (exists (select 1 from profiles p where p.id = auth.uid() and p.role in ('admin','super_admin')));
