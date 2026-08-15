-- Phase 2: Module → Category(s) map. Each estimator module (estimate_modules
-- .module_type) owns one or more categories. Drives the data-driven View Rates
-- (every mapped category's sub-categories + items show, used or not) and the
-- "assign this new category to a module" prompt.
--
-- Run once on prod (and staging). Idempotent.

create table if not exists public.module_category_map (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  module_type text not null,
  category_name text not null,
  created_at timestamptz not null default now(),
  unique (tenant_id, module_type, category_name)
);

-- Tenant stamp + RLS (same pattern as every other table).
do $$
begin
  execute 'drop trigger if exists set_tenant_id on public.module_category_map';
  execute 'create trigger set_tenant_id before insert on public.module_category_map for each row execute function public.set_tenant_id()';
  execute 'alter table public.module_category_map enable row level security';
  execute 'drop policy if exists module_category_map_rw on public.module_category_map';
  execute 'create policy module_category_map_rw on public.module_category_map for all to authenticated using (tenant_id = public.auth_tenant_id()) with check (tenant_id = public.auth_tenant_id())';
  execute 'grant select, insert, update, delete on public.module_category_map to authenticated';
end $$;

-- Seed: module_type → category_name (each module's own category for the labor/
-- sub side, plus the material categories it actually consumes).
insert into public.module_category_map (tenant_id, module_type, category_name)
select t.tenant_id, m.module_type, m.category_name
from (select distinct tenant_id from public.category) t
cross join (values
  ('Drainage', 'Drainage'),
  ('Lighting', 'Lighting'),
  ('Hand Demo', 'Demo'),
  ('Skid Steer Demo', 'Demo'),
  ('Mini Skid Steer Demo', 'Demo'),
  ('Concrete', 'Concrete'),
  ('Concrete', 'Basic Materials'),
  ('Irrigation', 'Irrigation'),
  ('Artificial Turf', 'Artificial Turf'),
  ('Pavers', 'Paver'),
  ('Pavers', 'Basic Materials'),
  ('Planting', 'Planting'),
  ('Utilities', 'Utilities'),
  ('Columns', 'Columns'),
  ('Columns', 'Basic Materials'),
  ('Columns', 'Walls'),
  ('Columns', 'Concrete'),
  ('Ground Treatments', 'Ground Treatments'),
  ('Ground Treatments', 'Basic Materials'),
  ('Outdoor Kitchen', 'Outdoor Kitchen'),
  ('Outdoor Kitchen', 'Utilities'),
  ('Outdoor Kitchen', 'Walls'),
  ('Fire Pit', 'Fire Pit'),
  ('Fire Pit', 'Walls'),
  ('Fire Pit', 'Utilities'),
  ('Fire Pit', 'Basic Materials'),
  ('Fire Pit', 'Concrete'),
  ('Walls', 'Walls'),
  ('Walls', 'Basic Materials'),
  ('Walls', 'Concrete'),
  ('Walls', 'Demo'),
  ('Walls', 'Drainage'),
  ('Finishes', 'Finishes'),
  ('Steps', 'Steps'),
  ('Steps', 'Paver'),
  ('Steps', 'Concrete'),
  ('Pool', 'Pool'),
  ('Pool', 'Utilities'),
  ('Weed Abatement', 'Weed Abatement')
) as m(module_type, category_name)
on conflict (tenant_id, module_type, category_name) do nothing;
