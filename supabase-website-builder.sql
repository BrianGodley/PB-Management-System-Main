-- ============================================================================
-- WEBSITE BUILDER  (Marketing hub → Website Builder tab)
-- ----------------------------------------------------------------------------
-- A tenant builds a multi-page marketing site from section blocks (stored as
-- Puck JSON per page). Published sites are served publicly at /s/:slug. A
-- contact form on the site creates a Marketing contact + a Sales funnel card.
--
-- Tables (tenant-isolated, created after the multi-tenant cutover):
--   websites        — one or more sites per tenant (slug, theme, target funnel)
--   website_pages   — pages within a site (Puck data jsonb, nav/home flags)
--   website_leads   — raw form submissions captured from the public site
--
-- Plus get_public_site(slug): a SECURITY DEFINER function so logged-out
-- visitors can read a PUBLISHED site + its pages without RLS exposure.
--
-- Requires Stage A/B (tenants, public.auth_tenant_id(), public.set_tenant_id()).
-- Run on prod (live) and staging. Safe to re-run.
-- ============================================================================

-- ── websites ────────────────────────────────────────────────────────────────
create table if not exists public.websites (
  id               uuid primary key default gen_random_uuid(),
  tenant_id        uuid,
  slug             text not null,
  name             text not null default 'My Website',
  published        boolean not null default false,
  theme            jsonb not null default '{}'::jsonb,   -- { primary, font, logo_url }
  settings         jsonb not null default '{}'::jsonb,   -- { business_name, phone, email, ... }
  funnel_id        uuid references public.funnels(id) on delete set null,
  created_by_email text,
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);

-- Public routing key: globally unique, case-insensitive.
create unique index if not exists websites_slug_unique on public.websites (lower(slug));

-- ── website_pages ───────────────────────────────────────────────────────────
create table if not exists public.website_pages (
  id           uuid primary key default gen_random_uuid(),
  tenant_id    uuid,
  website_id   uuid not null references public.websites(id) on delete cascade,
  title        text not null default 'Page',
  slug         text not null default 'home',   -- path segment within the site
  sort_order   int not null default 0,
  is_home      boolean not null default false,
  show_in_nav  boolean not null default true,
  data         jsonb not null default '{"content":[],"root":{},"zones":{}}'::jsonb,  -- Puck data
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);
create unique index if not exists website_pages_slug_unique
  on public.website_pages (website_id, lower(slug));
create index if not exists website_pages_website_idx
  on public.website_pages (website_id, sort_order);

-- ── website_leads ───────────────────────────────────────────────────────────
create table if not exists public.website_leads (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid,
  website_id  uuid references public.websites(id) on delete set null,
  page_slug   text,
  name        text,
  email       text,
  phone       text,
  message     text,
  raw         jsonb,
  client_id   uuid references public.clients(id) on delete set null,
  created_at  timestamptz default now()
);
create index if not exists website_leads_tenant_idx on public.website_leads (tenant_id, created_at);

-- ── tenant plumbing for all three ───────────────────────────────────────────
do $$
declare t text;
begin
  foreach t in array array['websites', 'website_pages', 'website_leads'] loop
    execute format('drop trigger if exists trg_set_tenant_id on public.%I', t);
    execute format('create trigger trg_set_tenant_id before insert on public.%I for each row execute function public.set_tenant_id()', t);
    begin
      execute format('delete from public.%I where tenant_id is null', t);
      execute format('alter table public.%I alter column tenant_id set not null', t);
    exception when others then null;
    end;
  end loop;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'websites_tenant_id_fkey') then
    alter table public.websites add constraint websites_tenant_id_fkey foreign key (tenant_id) references public.tenants(id);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'website_pages_tenant_id_fkey') then
    alter table public.website_pages add constraint website_pages_tenant_id_fkey foreign key (tenant_id) references public.tenants(id);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'website_leads_tenant_id_fkey') then
    alter table public.website_leads add constraint website_leads_tenant_id_fkey foreign key (tenant_id) references public.tenants(id);
  end if;
end $$;

-- ── RLS: tenant-scoped (staff editing) ──────────────────────────────────────
alter table public.websites enable row level security;
alter table public.website_pages enable row level security;
alter table public.website_leads enable row level security;

drop policy if exists websites_tenant on public.websites;
create policy websites_tenant on public.websites for all to authenticated
  using (tenant_id = public.auth_tenant_id()) with check (tenant_id = public.auth_tenant_id());

drop policy if exists website_pages_tenant on public.website_pages;
create policy website_pages_tenant on public.website_pages for all to authenticated
  using (tenant_id = public.auth_tenant_id()) with check (tenant_id = public.auth_tenant_id());

drop policy if exists website_leads_tenant on public.website_leads;
create policy website_leads_tenant on public.website_leads for all to authenticated
  using (tenant_id = public.auth_tenant_id()) with check (tenant_id = public.auth_tenant_id());

grant all on public.websites, public.website_pages, public.website_leads to anon, authenticated, service_role;

-- ── Public read: published site + pages by slug (no RLS exposure) ───────────
create or replace function public.get_public_site(p_slug text)
returns jsonb
language sql
security definer
set search_path = public
as $$
  select case when w.id is null then null else jsonb_build_object(
    'site', jsonb_build_object(
      'id', w.id, 'slug', w.slug, 'name', w.name,
      'theme', w.theme, 'settings', w.settings
    ),
    'pages', coalesce((
      select jsonb_agg(jsonb_build_object(
        'title', p.title, 'slug', p.slug, 'is_home', p.is_home,
        'show_in_nav', p.show_in_nav, 'sort_order', p.sort_order, 'data', p.data
      ) order by p.sort_order)
      from public.website_pages p where p.website_id = w.id
    ), '[]'::jsonb)
  ) end
  from public.websites w
  where lower(w.slug) = lower(p_slug) and w.published = true
  limit 1;
$$;

grant execute on function public.get_public_site(text) to anon, authenticated;
