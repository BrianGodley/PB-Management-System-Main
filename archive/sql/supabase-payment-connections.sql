-- ============================================================================
-- LAYER 2 — Per-tenant payment connections (Helcim partner / connected accounts)
-- (RUN ON STAGING FIRST: fgyexksqinjczebtsuon)
-- ----------------------------------------------------------------------------
-- Each tenant connects their OWN Helcim merchant account (via your partner
-- registration flow). The merchant's api-token is delivered by a Helcim webhook
-- on approval and stored here, then used to process THAT tenant's client
-- payments (with your partner-token in the header for revenue share).
--
-- SECURITY: this table holds a sensitive merchant token. RLS is enabled with NO
-- policies for app users, so the browser/anon/authenticated roles can NEVER read
-- it — only the service role (edge functions) and the SECURITY DEFINER RPCs
-- below can touch it. The app reads only non-sensitive STATUS via an RPC.
-- ============================================================================

create table if not exists public.tenant_payment_connections (
  tenant_id         uuid primary key references public.tenants(id) on delete cascade,
  provider          text not null default 'helcim',
  status            text not null default 'pending',  -- pending|connected|failed|disabled
  helcim_account_id text,
  helcim_api_token  text,                              -- SENSITIVE (merchant token)
  registration_ref  text unique,                       -- matches the Helcim webhook back to this tenant
  connected_at      timestamptz,
  created_at        timestamptz default now(),
  updated_at        timestamptz default now()
);

-- Lock it down: enable RLS and add NO policies → app roles get nothing.
alter table public.tenant_payment_connections enable row level security;
revoke all on public.tenant_payment_connections from anon, authenticated;

-- ── Start a connection: returns a fresh registration ref for this tenant ─────
-- Owner/admin only. The app builds the partner registration URL with this ref
-- and redirects the tenant to Helcim to complete merchant signup.
create or replace function public.start_payment_connection()
returns text
language plpgsql security definer set search_path = ''
as $$
declare
  t uuid := (select tenant_id from public.profiles where id = auth.uid());
  r text;
  is_admin boolean := exists (
    select 1 from public.profiles
     where id = auth.uid() and role in ('owner','admin')
  );
begin
  if t is null then raise exception 'No tenant'; end if;
  if not is_admin then raise exception 'Only an owner/admin can connect payments'; end if;

  r := encode(gen_random_bytes(12), 'hex');
  insert into public.tenant_payment_connections (tenant_id, status, registration_ref, updated_at)
  values (t, 'pending', r, now())
  on conflict (tenant_id) do update
    set status = 'pending', registration_ref = r, updated_at = now();
  return r;
end $$;
grant execute on function public.start_payment_connection() to authenticated;

-- ── Read connection STATUS only (never the token) ───────────────────────────
create or replace function public.my_payment_connection()
returns jsonb
language sql stable security definer set search_path = ''
as $$
  select coalesce(
    (select jsonb_build_object(
       'status', c.status,
       'account_id', c.helcim_account_id,
       'connected_at', c.connected_at
     )
     from public.tenant_payment_connections c
     where c.tenant_id = (select tenant_id from public.profiles where id = auth.uid())),
    jsonb_build_object('status', 'none')
  );
$$;
grant execute on function public.my_payment_connection() to authenticated;
