-- supabase-drive-sync.sql
-- Server-side, hands-off Google Drive -> PBS sync.
-- Tables that track the background job, the resumable folder queue, and a
-- per-file manifest (so re-runs skip unchanged files and re-copy changed ones).
-- Run once in the Supabase SQL editor. The cron schedule at the bottom is a
-- TEMPLATE — fill in your project ref + service-role key and run it after the
-- edge function is deployed.

-- ── Job state (one row per sync run) ─────────────────────────────────────────
create table if not exists drive_sync_jobs (
  id            bigint generated always as identity primary key,
  status        text        not null default 'idle',  -- idle|running|done|error
  message       text,
  files_copied  int         not null default 0,
  files_skipped int         not null default 0,
  errors        int         not null default 0,
  started_at    timestamptz,
  finished_at   timestamptz,
  updated_at    timestamptz default now()
);

-- ── Folder queue (the function pops these; survives across invocations) ──────
create table if not exists drive_sync_queue (
  id         bigint generated always as identity primary key,
  job_id     bigint references drive_sync_jobs(id) on delete cascade,
  drive_id   text not null,
  parent_id  text not null,          -- Drive folder id to list
  pbs_id     text not null,          -- target pbs_drives.id (as text)
  rel_path   text not null default '',
  status     text not null default 'pending',  -- pending|done
  created_at timestamptz default now()
);
-- One queue row per folder per job; lets the function re-enqueue safely on
-- resume without creating duplicates.
create unique index if not exists drive_sync_queue_uniq
  on drive_sync_queue(job_id, parent_id);
create index if not exists drive_sync_queue_pending
  on drive_sync_queue(job_id, status);

-- ── File manifest (change detection: skip unchanged, recopy changed) ─────────
create table if not exists drive_sync_files (
  file_id       text primary key,    -- Google Drive file id
  modified_time timestamptz,
  name          text,
  pbs_path      text,
  synced_at     timestamptz default now()
);

-- ── RLS ──────────────────────────────────────────────────────────────────────
-- The edge function uses the service-role key (bypasses RLS). We enable RLS and
-- add a read-only policy so signed-in staff can see job status in the app.
alter table drive_sync_jobs   enable row level security;
alter table drive_sync_queue  enable row level security;
alter table drive_sync_files  enable row level security;

drop policy if exists drive_sync_jobs_read on drive_sync_jobs;
create policy drive_sync_jobs_read on drive_sync_jobs
  for select to authenticated using (true);

-- ── Helper: atomically bump the job counters from the edge function ──────────
create or replace function bump_drive_sync(p_job bigint, p_copied int, p_skipped int, p_errors int)
returns void language sql as $$
  update drive_sync_jobs
     set files_copied  = files_copied  + p_copied,
         files_skipped = files_skipped + p_skipped,
         errors        = errors        + p_errors,
         updated_at    = now()
   where id = p_job;
$$;

-- ── Cron schedule (TEMPLATE — run AFTER deploying the edge function) ─────────
-- Requires the pg_cron + pg_net extensions (enable in Dashboard → Database →
-- Extensions, or with the create extension lines below).
--
--   create extension if not exists pg_cron;
--   create extension if not exists pg_net;
--
--   select cron.schedule(
--     'drive-sync-nightly',
--     '0 9 * * *',                       -- 09:00 UTC ≈ 2am PT; adjust as you like
--     $$
--       select net.http_post(
--         url     := 'https://jjlnpywpmoukgwmwczbz.supabase.co/functions/v1/drive-sync',
--         headers := jsonb_build_object(
--                      'Content-Type','application/json',
--                      'Authorization','Bearer <YOUR_SERVICE_ROLE_KEY>'
--                    ),
--         body    := jsonb_build_object('trigger','cron')
--       );
--     $$
--   );
--
-- To remove later:  select cron.unschedule('drive-sync-nightly');
