-- ============================================================================
-- PUBLIC SAM — RATE LIMIT  (RUN ON STAGING FIRST: fgyexksqinjczebtsuon)
-- ----------------------------------------------------------------------------
-- Per-IP daily usage counter for the public, logged-out "Chat with Sam" bot.
-- Written only by the sam-public edge function (service role). NOT tenant data;
-- RLS is enabled with no policies so it is unreachable from the browser.
-- ============================================================================

create table if not exists public.sam_public_usage (
  ip         text not null,
  day        date not null default current_date,
  count      int  not null default 0,
  updated_at timestamptz not null default now(),
  primary key (ip, day)
);

alter table public.sam_public_usage enable row level security;
-- (No policies on purpose — only the service role, which bypasses RLS, touches it.)

-- Optional: prune old rows periodically.
-- delete from public.sam_public_usage where day < current_date - 7;
