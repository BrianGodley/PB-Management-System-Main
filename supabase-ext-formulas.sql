-- ============================================================================
-- Formulas extension — schema, entitlement plumbing, RLS, and seed data.
-- Apply in the Supabase SQL editor. Idempotent (safe to re-run).
--
-- Matches this app's real multi-tenant convention:
--   * tenant table         : public.tenants(id uuid)
--   * per-row scope column : tenant_id  (NOT company_id)
--   * RLS predicate        : tenant_id = public.auth_tenant_id()
--   * auto-fill on insert   : trigger trg_set_tenant_id -> public.set_tenant_id()
--   * stats                : public.statistics(id uuid)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 0. Platform: tenant_extensions + entitlement helpers (Phase-0 foundations)
-- ----------------------------------------------------------------------------
-- Prerequisite tenant helpers (idempotent; canonical defs — present in most envs,
-- re-created here so this script is self-contained).
create or replace function public.auth_tenant_id()
returns uuid language sql stable security definer set search_path = public as $$
  select tenant_id from public.profiles where id = auth.uid() limit 1;
$$;

create or replace function public.set_tenant_id()
returns trigger language plpgsql security definer set search_path = public as $$
declare t uuid;
begin
  if new.tenant_id is not null then return new; end if;
  t := public.auth_tenant_id();
  if t is null then return new; end if;
  new.tenant_id := t;
  return new;
end;
$$;

create table if not exists public.tenant_extensions (
  tenant_id           uuid not null references public.tenants(id) on delete cascade,
  extension_id        text not null,
  status              text not null default 'active',
  trial_ends_at       timestamptz,
  current_period_end  timestamptz,
  enabled_at          timestamptz not null default now(),
  primary key (tenant_id, extension_id)
);

alter table public.tenant_extensions enable row level security;
drop policy if exists tenant_extensions_read on public.tenant_extensions;
create policy tenant_extensions_read on public.tenant_extensions
  for select to authenticated using (tenant_id = public.auth_tenant_id());
grant select on public.tenant_extensions to authenticated;
grant all on public.tenant_extensions to service_role;

create or replace function public.has_extension(p_ext text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.tenant_extensions te
    where te.tenant_id = public.auth_tenant_id()
      and te.extension_id = p_ext
      and te.status in ('active', 'trialing')
      and (te.current_period_end is null or te.current_period_end > now())
  );
$$;

create or replace function public.get_my_extensions()
returns text[] language sql stable security definer set search_path = public as $$
  select coalesce(array_agg(extension_id), '{}')
  from public.tenant_extensions
  where tenant_id = public.auth_tenant_id()
    and status in ('active', 'trialing')
    and (current_period_end is null or current_period_end > now());
$$;

grant execute on function public.has_extension(text) to authenticated;
grant execute on function public.get_my_extensions() to authenticated;

-- ----------------------------------------------------------------------------
-- 1. Formulas schema (ext_formulas_*)
-- ----------------------------------------------------------------------------
create table if not exists public.ext_formulas_conditions (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid references public.tenants(id) on delete cascade,
  name        text not null,
  slug        text not null,
  sort_order  int  not null default 0,
  is_default  boolean not null default false,
  visible     boolean not null default true,
  read_only   boolean not null default false,
  created_at  timestamptz not null default now()
);
create unique index if not exists ext_formulas_conditions_scope_slug
  on public.ext_formulas_conditions (coalesce(tenant_id, '00000000-0000-0000-0000-000000000000'::uuid), slug);

create table if not exists public.ext_formulas_sub_conditions (
  id            uuid primary key default gen_random_uuid(),
  condition_id  uuid not null references public.ext_formulas_conditions(id) on delete cascade,
  slug          text not null,
  name          text not null,
  sort_order    int  not null default 0
);

create table if not exists public.ext_formulas_condition_steps (
  id                uuid primary key default gen_random_uuid(),
  condition_id      uuid not null references public.ext_formulas_conditions(id) on delete cascade,
  sub_condition_id  uuid references public.ext_formulas_sub_conditions(id) on delete cascade,
  seq               int  not null,
  text              text not null
);
create index if not exists ext_formulas_condition_steps_cond on public.ext_formulas_condition_steps(condition_id);

create table if not exists public.ext_formulas_formulas (
  id                uuid primary key default gen_random_uuid(),
  tenant_id         uuid not null references public.tenants(id) on delete cascade,
  created_by        uuid,
  statistic_id      bigint not null references public.statistics(id) on delete cascade,
  condition_id      uuid references public.ext_formulas_conditions(id),
  sub_condition_id  uuid references public.ext_formulas_sub_conditions(id),
  window_mode       text not null default 'static',
  stat_view_type    text,
  evaluated_on      date not null default current_date,
  end_date          date,
  status            text not null default 'active',
  created_at        timestamptz not null default now()
);
create index if not exists ext_formulas_formulas_tenant on public.ext_formulas_formulas(tenant_id);
create index if not exists ext_formulas_formulas_stat on public.ext_formulas_formulas(statistic_id);

create table if not exists public.ext_formulas_steps (
  id                 uuid primary key default gen_random_uuid(),
  formula_id         uuid not null references public.ext_formulas_formulas(id) on delete cascade,
  condition_step_id  uuid references public.ext_formulas_condition_steps(id),
  seq                int  not null,
  action_text        text,
  due_date           date,
  assign             boolean not null default false,
  action_id          uuid,
  created_at         timestamptz not null default now()
);
create index if not exists ext_formulas_steps_formula on public.ext_formulas_steps(formula_id);

-- Auto-fill tenant_id on insert (matches every other tenant table in this app).
drop trigger if exists trg_set_tenant_id on public.tenant_extensions;
create trigger trg_set_tenant_id before insert on public.tenant_extensions
  for each row execute function public.set_tenant_id();
drop trigger if exists trg_set_tenant_id on public.ext_formulas_conditions;
create trigger trg_set_tenant_id before insert on public.ext_formulas_conditions
  for each row execute function public.set_tenant_id();
drop trigger if exists trg_set_tenant_id on public.ext_formulas_formulas;
create trigger trg_set_tenant_id before insert on public.ext_formulas_formulas
  for each row execute function public.set_tenant_id();

-- ----------------------------------------------------------------------------
-- 2. RLS — every table gated on the 'formulas' entitlement + tenant scope
-- ----------------------------------------------------------------------------
alter table public.ext_formulas_conditions      enable row level security;
alter table public.ext_formulas_sub_conditions  enable row level security;
alter table public.ext_formulas_condition_steps enable row level security;
alter table public.ext_formulas_formulas        enable row level security;
alter table public.ext_formulas_steps           enable row level security;

drop policy if exists ext_formulas_conditions_read on public.ext_formulas_conditions;
create policy ext_formulas_conditions_read on public.ext_formulas_conditions
  for select to authenticated
  using (public.has_extension('formulas') and (tenant_id = public.auth_tenant_id() or tenant_id is null));
drop policy if exists ext_formulas_conditions_write on public.ext_formulas_conditions;
create policy ext_formulas_conditions_write on public.ext_formulas_conditions
  for all to authenticated
  using (public.has_extension('formulas') and tenant_id = public.auth_tenant_id())
  with check (public.has_extension('formulas') and tenant_id = public.auth_tenant_id());

drop policy if exists ext_formulas_sub_conditions_rw on public.ext_formulas_sub_conditions;
create policy ext_formulas_sub_conditions_rw on public.ext_formulas_sub_conditions
  for all to authenticated
  using (public.has_extension('formulas') and exists (
      select 1 from public.ext_formulas_conditions c where c.id = condition_id
        and (c.tenant_id = public.auth_tenant_id() or c.tenant_id is null)))
  with check (public.has_extension('formulas') and exists (
      select 1 from public.ext_formulas_conditions c where c.id = condition_id and c.tenant_id = public.auth_tenant_id()));

drop policy if exists ext_formulas_condition_steps_rw on public.ext_formulas_condition_steps;
create policy ext_formulas_condition_steps_rw on public.ext_formulas_condition_steps
  for all to authenticated
  using (public.has_extension('formulas') and exists (
      select 1 from public.ext_formulas_conditions c where c.id = condition_id
        and (c.tenant_id = public.auth_tenant_id() or c.tenant_id is null)))
  with check (public.has_extension('formulas') and exists (
      select 1 from public.ext_formulas_conditions c where c.id = condition_id and c.tenant_id = public.auth_tenant_id()));

drop policy if exists ext_formulas_formulas_rw on public.ext_formulas_formulas;
create policy ext_formulas_formulas_rw on public.ext_formulas_formulas
  for all to authenticated
  using (public.has_extension('formulas') and tenant_id = public.auth_tenant_id())
  with check (public.has_extension('formulas') and tenant_id = public.auth_tenant_id());

drop policy if exists ext_formulas_steps_rw on public.ext_formulas_steps;
create policy ext_formulas_steps_rw on public.ext_formulas_steps
  for all to authenticated
  using (public.has_extension('formulas') and exists (
      select 1 from public.ext_formulas_formulas f where f.id = formula_id and f.tenant_id = public.auth_tenant_id()))
  with check (public.has_extension('formulas') and exists (
      select 1 from public.ext_formulas_formulas f where f.id = formula_id and f.tenant_id = public.auth_tenant_id()));

grant select, insert, update, delete on
  public.ext_formulas_conditions, public.ext_formulas_sub_conditions,
  public.ext_formulas_condition_steps, public.ext_formulas_formulas, public.ext_formulas_steps
  to authenticated;
grant all on
  public.ext_formulas_conditions, public.ext_formulas_sub_conditions,
  public.ext_formulas_condition_steps, public.ext_formulas_formulas, public.ext_formulas_steps
  to service_role;

-- ----------------------------------------------------------------------------
-- 3. Seed standard conditions + canonical handling steps (global defaults)
-- ----------------------------------------------------------------------------
insert into public.ext_formulas_conditions (tenant_id, name, slug, sort_order, is_default, read_only)
select * from (values
  (null::uuid, 'Non-Existence', 'non_existence', 1, true, true),
  (null::uuid, 'Danger',        'danger',        2, true, true),
  (null::uuid, 'Emergency',     'emergency',     3, true, true),
  (null::uuid, 'Normal',        'normal',        4, true, true),
  (null::uuid, 'Affluence',     'affluence',     5, true, true),
  (null::uuid, 'Power',         'power',         6, true, true)
) as v(tenant_id, name, slug, sort_order, is_default, read_only)
where not exists (
  select 1 from public.ext_formulas_conditions c where c.tenant_id is null and c.slug = v.slug
);

insert into public.ext_formulas_condition_steps (condition_id, seq, text)
select c.id, s.seq, s.text
from public.ext_formulas_conditions c
join (values
  ('non_existence', 1, 'Find a communication line.'),
  ('non_existence', 2, 'Make yourself known.'),
  ('non_existence', 3, 'Discover what is needed or wanted.'),
  ('non_existence', 4, 'Do, produce and/or present it.'),
  ('danger', 1, 'Bypass habitual routes; handle the situation and any danger in it.'),
  ('danger', 2, 'Handle the personnel involved.'),
  ('danger', 3, 'Reorganize the activity so the situation does not recur.'),
  ('danger', 4, 'Recommend firm policy to detect and prevent the same situation.'),
  ('emergency', 1, 'Promote.'),
  ('emergency', 2, 'Change your operating basis.'),
  ('emergency', 3, 'Economize.'),
  ('emergency', 4, 'Prepare to deliver.'),
  ('emergency', 5, 'Stiffen discipline.'),
  ('normal', 1, 'Do not change anything.'),
  ('normal', 2, 'Find what improved the statistic and reinforce it.'),
  ('normal', 3, 'Keep ethics light.'),
  ('normal', 4, 'Spot any threatened danger and handle it early.'),
  ('affluence', 1, 'Economize.'),
  ('affluence', 2, 'Pay every bill.'),
  ('affluence', 3, 'Invest the remainder in service facilities; make more possible.'),
  ('affluence', 4, 'Discover what caused the affluence and strengthen it.'),
  ('power', 1, 'Do not disconnect; you cannot just drop the post.'),
  ('power', 2, 'Write up your post — record what you do so it can be done.'),
  ('power', 3, 'Get your replacement trained and hatted.')
) as s(slug, seq, text) on s.slug = c.slug
where c.tenant_id is null
  and not exists (select 1 from public.ext_formulas_condition_steps st where st.condition_id = c.id);

-- ----------------------------------------------------------------------------
-- 4. (Manual) Enable the extension for a beta tenant during testing:
--    insert into public.tenant_extensions (tenant_id, extension_id, status)
--    values ('<tenant-uuid>', 'formulas', 'active')
--    on conflict (tenant_id, extension_id) do update set status = 'active';
-- ----------------------------------------------------------------------------
