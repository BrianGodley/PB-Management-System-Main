-- supabase-sam-public-hardening.sql
-- =============================================================================
-- Bot/abuse hardening for the public "Chat with Sam" endpoint (sam-public).
-- Replaces the old check-then-upsert rate limit (which had a race) with a single
-- ATOMIC gate that enforces, in one round trip:
--   • per-IP per-minute BURST cap   (stops rapid hammering)
--   • GLOBAL per-day ceiling         (caps total Anthropic spend / botnet abuse)
--   • per-IP per-day cap             (the existing limit)
-- No tenant data is involved — this is an isolated counter table.
-- Idempotent; safe to re-run.
-- =============================================================================

-- Generic short-lived counter. PK (scope,key); rows self-expire via expires_at.
create table if not exists public.sam_counter (
  scope      text        not null,
  key        text        not null,
  count      int         not null default 0,
  expires_at timestamptz not null,
  primary key (scope, key)
);

-- Only the security-definer RPC (service role) touches it; lock everyone else out.
alter table public.sam_counter enable row level security;

-- Atomic gate. Returns one row: (allowed boolean, reason text).
-- Pass 0 for any cap to disable that check.
create or replace function public.sam_public_gate(
  p_ip         text,
  p_daily_cap  int default 30,
  p_burst_cap  int default 6,    -- per IP per minute
  p_global_cap int default 5000  -- all IPs per day
)
returns table(allowed boolean, reason text)
language plpgsql security definer set search_path = public as $$
declare
  v_day text := to_char(now() at time zone 'utc', 'YYYY-MM-DD');
  v_min text := to_char(date_trunc('minute', now() at time zone 'utc'), 'YYYY-MM-DD"T"HH24:MI');
  m_count int; g_count int; d_count int;
begin
  -- Opportunistic cleanup of expired buckets.
  delete from public.sam_counter where expires_at < now();

  -- 1) Burst: per IP per minute.
  insert into public.sam_counter(scope, key, count, expires_at)
    values ('min', p_ip || '|' || v_min, 1, now() + interval '2 minutes')
    on conflict (scope, key) do update set count = public.sam_counter.count + 1
    returning count into m_count;
  if p_burst_cap > 0 and m_count > p_burst_cap then
    return query select false, 'burst'; return;
  end if;

  -- 2) Global daily ceiling (cost circuit-breaker).
  if p_global_cap > 0 then
    insert into public.sam_counter(scope, key, count, expires_at)
      values ('global', v_day, 1, now() + interval '2 days')
      on conflict (scope, key) do update set count = public.sam_counter.count + 1
      returning count into g_count;
    if g_count > p_global_cap then
      return query select false, 'global'; return;
    end if;
  end if;

  -- 3) Per-IP daily cap.
  insert into public.sam_counter(scope, key, count, expires_at)
    values ('day', p_ip || '|' || v_day, 1, now() + interval '2 days')
    on conflict (scope, key) do update set count = public.sam_counter.count + 1
    returning count into d_count;
  if p_daily_cap > 0 and d_count > p_daily_cap then
    return query select false, 'daily'; return;
  end if;

  return query select true, 'ok';
end $$;

grant execute on function public.sam_public_gate(text, int, int, int)
  to anon, authenticated, service_role;

-- (The old public.sam_public_usage table is now unused and can be dropped later:
--   drop table if exists public.sam_public_usage;
--  Left in place for now so nothing breaks mid-deploy.)
