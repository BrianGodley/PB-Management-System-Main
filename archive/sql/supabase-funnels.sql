-- ============================================================================
-- SALES FUNNELS  (pipeline builder)
-- ----------------------------------------------------------------------------
-- User-defined funnels (named pipelines) → named stages → opportunity cards.
-- An opportunity (clients row) can sit in many funnels but only once per funnel
-- (unique funnel_id + client_id). Cards carry the stage placement + ordering.
--
-- RLS matches the current single-company convention (authenticated, permissive).
-- The multi-tenant migration (Stage A) later adds tenant_id to every table,
-- including these, so no special handling is needed here now.
--
-- Safe to re-run.
-- ============================================================================

-- 1) Funnels ----------------------------------------------------------------
create table if not exists public.funnels (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  sort_order  int  not null default 0,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- 2) Stages within a funnel --------------------------------------------------
create table if not exists public.funnel_stages (
  id          uuid primary key default gen_random_uuid(),
  funnel_id   uuid not null references public.funnels(id) on delete cascade,
  name        text not null,
  color       text,                          -- optional accent (hex like #16a34a)
  sort_order  int  not null default 0,
  created_at  timestamptz default now()
);

-- 3) Cards = an opportunity placed on a funnel at a stage --------------------
create table if not exists public.funnel_cards (
  id          uuid primary key default gen_random_uuid(),
  funnel_id   uuid not null references public.funnels(id) on delete cascade,
  stage_id    uuid not null references public.funnel_stages(id) on delete cascade,
  client_id   uuid not null references public.clients(id) on delete cascade,
  sort_order  int  not null default 0,
  created_at  timestamptz default now(),
  unique (funnel_id, client_id)
);

-- 4) Indexes -----------------------------------------------------------------
create index if not exists funnel_stages_funnel_idx on public.funnel_stages(funnel_id);
create index if not exists funnel_cards_funnel_idx   on public.funnel_cards(funnel_id);
create index if not exists funnel_cards_stage_idx    on public.funnel_cards(stage_id);
create index if not exists funnel_cards_client_idx   on public.funnel_cards(client_id);

-- 5) RLS + grants ------------------------------------------------------------
alter table public.funnels       enable row level security;
alter table public.funnel_stages enable row level security;
alter table public.funnel_cards  enable row level security;

drop policy if exists funnels_all       on public.funnels;
drop policy if exists funnel_stages_all  on public.funnel_stages;
drop policy if exists funnel_cards_all   on public.funnel_cards;

create policy funnels_all       on public.funnels       for all to authenticated using (true) with check (true);
create policy funnel_stages_all on public.funnel_stages for all to authenticated using (true) with check (true);
create policy funnel_cards_all  on public.funnel_cards  for all to authenticated using (true) with check (true);

grant all on public.funnels       to anon, authenticated, service_role;
grant all on public.funnel_stages to anon, authenticated, service_role;
grant all on public.funnel_cards  to anon, authenticated, service_role;
