-- ============================================================================
-- Formulas extension — billing plumbing (Helcim). Apply in Supabase SQL editor.
-- Idempotent. Pairs with the extension-subscribe edge function.
-- ============================================================================

-- Maps a paid extension to its Helcim Payment Plan + monthly price.
create table if not exists public.ext_plans (
  extension_id   text primary key,
  name           text not null,
  price_monthly  numeric not null default 0,
  helcim_plan_id text,                 -- set after creating the Payment Plan in Helcim
  active         boolean not null default true
);
alter table public.ext_plans enable row level security;
drop policy if exists ext_plans_read on public.ext_plans;
create policy ext_plans_read on public.ext_plans for select to authenticated using (true);
grant select on public.ext_plans to authenticated;
grant all on public.ext_plans to service_role;

-- Seed the Formulas add-on. Set price_monthly + helcim_plan_id to real values:
--   update public.ext_plans set price_monthly = 49, helcim_plan_id = '<helcim id>' where extension_id='formulas';
insert into public.ext_plans (extension_id, name, price_monthly)
values ('formulas', 'Formulas', 0)
on conflict (extension_id) do nothing;

-- Owner/admin grants or revokes an extension for THEIR tenant. Usable for manual
-- ops; the edge function writes tenant_extensions directly via service role.
create or replace function public.set_my_extension(
  p_ext text, p_status text default 'active', p_period_end timestamptz default null
) returns void language plpgsql security definer set search_path = public as $$
declare t uuid; r text;
begin
  t := public.auth_tenant_id();
  if t is null then raise exception 'no tenant for caller'; end if;
  select role into r from public.profiles where id = auth.uid();
  if r is null or r not in ('owner','admin','super_admin') then
    raise exception 'only an owner/admin can change extensions';
  end if;
  insert into public.tenant_extensions (tenant_id, extension_id, status, current_period_end)
  values (t, p_ext, p_status, p_period_end)
  on conflict (tenant_id, extension_id)
    do update set status = excluded.status, current_period_end = excluded.current_period_end;
end;
$$;
grant execute on function public.set_my_extension(text, text, timestamptz) to authenticated;
