-- ============================================================================
-- stat_sources — user-defined "Auto Internal" statistic data sources.
-- ----------------------------------------------------------------------------
-- The built-in sources stay hard-coded in Statistics.jsx (AUTO_SOURCES) as the
-- baseline seed. This table holds ADDITIONAL custom sources a tenant builds via
-- the allowlisted picker, so new sources can be added without a deploy. The
-- Statistics page merges code seeds + these rows into the source picker; the
-- existing syncAutoValues engine computes values from the same JSON shape.
--
-- SECURITY: the builder only lets users pick tables/columns from the code-side
-- allowlist (STAT_SOURCE_CATALOG). This table just stores the chosen combo.
-- Run on STAGING first, then PROD.
-- ============================================================================

create table if not exists public.stat_sources (
  id           uuid primary key default gen_random_uuid(),
  tenant_id    uuid not null references public.tenants(id) on delete cascade,
  category     text not null default 'Custom',
  key          text not null,                 -- slug, unique per tenant
  label        text not null,
  description  text,
  source_type  text not null default 'pull',  -- 'pull' | 'push'
  table_name   text,                          -- allowlisted source table (pull)
  date_column  text,                          -- allowlisted date column (pull)
  metric       text,                          -- 'count' | 'sum' | 'avg'
  field        text,                          -- allowlisted numeric field (sum/avg)
  filters      jsonb not null default '{}'::jsonb,  -- equality filters {col: val}
  stat_type    text not null default 'numeric',     -- numeric | currency | percentage
  tracking     text not null default 'monthly',     -- daily | weekly | monthly | ...
  archived     boolean not null default false,
  created_by   uuid,
  created_at   timestamptz not null default now(),
  unique (tenant_id, key)
);

-- Tenant isolation: fill tenant_id on insert when the client omits it.
drop trigger if exists set_tenant_id on public.stat_sources;
create trigger set_tenant_id
  before insert on public.stat_sources
  for each row execute function public.set_tenant_id();

alter table public.stat_sources enable row level security;

drop policy if exists stat_sources_rw on public.stat_sources;
create policy stat_sources_rw on public.stat_sources
  for all to authenticated
  using (tenant_id = public.auth_tenant_id())
  with check (tenant_id = public.auth_tenant_id());

grant select, insert, update, delete on public.stat_sources to authenticated;
