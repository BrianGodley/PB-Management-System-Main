-- ============================================================================
-- FUNNELS TENANCY FIX
-- ----------------------------------------------------------------------------
-- funnels / funnel_stages / funnel_cards were created AFTER the Stage A
-- migration, so they never got tenant_id — their RLS is permissive (using true),
-- which would let every tenant see every tenant's funnels. This applies the same
-- treatment Stage A/B/C gave the other tables: tenant_id column + backfill +
-- auto-fill trigger + NOT NULL + FK + tenant-scoped RLS.
--
-- Requires Stage A/B (tenants, public.auth_tenant_id(), public.set_tenant_id()).
-- Run on staging now; on prod it's a cutover step AFTER Stage B (the funnels
-- tables are empty on prod, so the backfill is a no-op there). Safe to re-run.
-- ============================================================================

-- 1) Column + backfill existing rows to Picture Build (the only tenant with
--    funnel data pre-cutover).
do $$
declare pb uuid := (select id from public.tenants where name = 'Picture Build' limit 1);
begin
  alter table public.funnels       add column if not exists tenant_id uuid;
  alter table public.funnel_stages add column if not exists tenant_id uuid;
  alter table public.funnel_cards  add column if not exists tenant_id uuid;

  update public.funnels       set tenant_id = pb where tenant_id is null;
  update public.funnel_stages set tenant_id = pb where tenant_id is null;
  update public.funnel_cards  set tenant_id = pb where tenant_id is null;
end $$;

-- 2) Auto-fill trigger + NOT NULL + FK on each (mirrors Stage B).
do $$
declare r text;
begin
  foreach r in array array['funnels','funnel_stages','funnel_cards'] loop
    execute format('drop trigger if exists trg_set_tenant_id on public.%I', r);
    execute format('create trigger trg_set_tenant_id before insert on public.%I for each row execute function public.set_tenant_id()', r);
    execute format('alter table public.%I alter column tenant_id set not null', r);
    if not exists (select 1 from pg_constraint where conname = r || '_tenant_id_fkey') then
      execute format('alter table public.%I add constraint %I foreign key (tenant_id) references public.tenants(id)', r, r || '_tenant_id_fkey');
    end if;
  end loop;
end $$;

-- 3) Replace permissive policies with tenant-scoped ones (mirrors Stage C).
drop policy if exists funnels_all        on public.funnels;
drop policy if exists funnel_stages_all  on public.funnel_stages;
drop policy if exists funnel_cards_all   on public.funnel_cards;

create policy funnels_tenant on public.funnels for all to authenticated
  using (tenant_id = public.auth_tenant_id()) with check (tenant_id = public.auth_tenant_id());
create policy funnel_stages_tenant on public.funnel_stages for all to authenticated
  using (tenant_id = public.auth_tenant_id()) with check (tenant_id = public.auth_tenant_id());
create policy funnel_cards_tenant on public.funnel_cards for all to authenticated
  using (tenant_id = public.auth_tenant_id()) with check (tenant_id = public.auth_tenant_id());

-- Verify: all three should report 0 nullable + a policy each.
select 'funnels tenant_id not null' as chk,
       count(*) filter (where is_nullable='NO')::text as result
  from information_schema.columns
 where table_schema='public' and column_name='tenant_id'
   and table_name in ('funnels','funnel_stages','funnel_cards');
