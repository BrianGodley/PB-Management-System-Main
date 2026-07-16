-- ============================================================================
-- Formulas extension — multi-action write-ups, the lower conditions (below
-- Non-Existence), and per-user permission gating for restricted conditions.
-- Apply in the Supabase SQL editor on BOTH staging and production. Idempotent.
-- ============================================================================

-- 1) Multi-action write-ups: a formula step can now hold several actions.
alter table public.ext_formulas_steps
  add column if not exists action_seq int not null default 1;

-- 2) Restricted flag: a condition can be permission-gated.
alter table public.ext_formulas_conditions
  add column if not exists restricted boolean not null default false;

-- 3) Per-user access grants for restricted conditions (tenant-scoped).
create table if not exists public.ext_formulas_condition_access (
  tenant_id    uuid references public.tenants(id) on delete cascade,
  condition_id uuid not null references public.ext_formulas_conditions(id) on delete cascade,
  user_id      uuid not null,
  created_at   timestamptz not null default now(),
  primary key (condition_id, user_id)
);
alter table public.ext_formulas_condition_access enable row level security;

drop trigger if exists trg_set_tenant_id on public.ext_formulas_condition_access;
create trigger trg_set_tenant_id before insert on public.ext_formulas_condition_access
  for each row execute function public.set_tenant_id();

drop policy if exists ext_formulas_cond_access_rw on public.ext_formulas_condition_access;
create policy ext_formulas_cond_access_rw on public.ext_formulas_condition_access
  for all to authenticated
  using (public.has_extension('formulas') and tenant_id = public.auth_tenant_id())
  with check (public.has_extension('formulas') and tenant_id = public.auth_tenant_id());

grant select, insert, update, delete on public.ext_formulas_condition_access to authenticated;
grant all on public.ext_formulas_condition_access to service_role;

-- 4) Seed the lower conditions (below Non-Existence) as global, read-only,
--    restricted defaults. Steps are the canonical formulas — verify/adjust the
--    wording under Settings if your originals differed.
insert into public.ext_formulas_conditions (tenant_id, name, slug, sort_order, is_default, read_only, restricted)
select * from (values
  (null::uuid, 'Liability', 'liability', 7,  true, true, true),
  (null::uuid, 'Doubt',     'doubt',     8,  true, true, true),
  (null::uuid, 'Enemy',     'enemy',     9,  true, true, true),
  (null::uuid, 'Treason',   'treason',   10, true, true, true),
  (null::uuid, 'Confusion', 'confusion', 11, true, true, true)
) as v(tenant_id, name, slug, sort_order, is_default, read_only, restricted)
where not exists (
  select 1 from public.ext_formulas_conditions c where c.tenant_id is null and c.slug = v.slug
);

insert into public.ext_formulas_condition_steps (condition_id, seq, text)
select c.id, s.seq, s.text
from public.ext_formulas_conditions c
join (values
  ('liability', 1, 'Decide who are one''s friends.'),
  ('liability', 2, 'Deliver an effective blow to the enemies of the group one has been pretending to be part of, despite personal danger.'),
  ('liability', 3, 'Make up the damage one has done by personal contribution far beyond the ordinary demands of a group member.'),
  ('liability', 4, 'Apply for reentry to the group by asking permission of each member, and rejoin only by majority permission; if refused, repeat steps 2 through 4.'),
  ('doubt', 1, 'Inform oneself honestly of the actual intentions and activities of the group, brushing aside all bias and rumor.'),
  ('doubt', 2, 'Examine the statistics of the individual, group or org.'),
  ('doubt', 3, 'Decide, on the basis of the greatest good for the greatest number of dynamics, whether it should be helped or opposed.'),
  ('doubt', 4, 'Evaluate oneself or one''s own group as to intentions and objectives.'),
  ('doubt', 5, 'Evaluate one''s own or one''s group''s statistics.'),
  ('doubt', 6, 'Join, remain in or befriend the side that best serves the greatest good, and announce the decision publicly to both sides.'),
  ('enemy', 1, 'Find out who you really are.'),
  ('treason', 1, 'Find out that you are.'),
  ('confusion', 1, 'Find out where you are.'),
  ('confusion', 2, 'Having located yourself, handle by then applying the Non-Existence formula.')
) as s(slug, seq, text) on s.slug = c.slug
where c.tenant_id is null
  and not exists (select 1 from public.ext_formulas_condition_steps st where st.condition_id = c.id);
