-- Phase 3: per-module View Rates hide/unhide. A row here means "this sub-category
-- or item is hidden from <module_type>'s data-driven View Rates". Absence = shown.
-- hide_key: 'subcat:<Category><Subcategory>' or 'item:<kind>:<id>'.
--
-- Run once on prod (and staging). Idempotent.

create table if not exists public.view_rates_hidden (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  module_type text not null,
  hide_key text not null,
  created_at timestamptz not null default now(),
  unique (tenant_id, module_type, hide_key)
);

do $$
begin
  execute 'drop trigger if exists set_tenant_id on public.view_rates_hidden';
  execute 'create trigger set_tenant_id before insert on public.view_rates_hidden for each row execute function public.set_tenant_id()';
  execute 'alter table public.view_rates_hidden enable row level security';
  execute 'drop policy if exists view_rates_hidden_rw on public.view_rates_hidden';
  execute 'create policy view_rates_hidden_rw on public.view_rates_hidden for all to authenticated using (tenant_id = public.auth_tenant_id()) with check (tenant_id = public.auth_tenant_id())';
  execute 'grant select, insert, update, delete on public.view_rates_hidden to authenticated';
end $$;
