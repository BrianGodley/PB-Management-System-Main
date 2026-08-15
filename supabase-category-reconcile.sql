-- Phase 1: unify the CATEGORY namespace across the three rate systems. After
-- this, category / labor_category / subcontractor_category all hold the same set
-- of category names (sub-categories stay independent per system). The app then
-- keeps them in sync on every add / rename / delete.
--
-- Three independent INSERTs (one per category table). Idempotent: each inserts
-- only the names its table is missing; codes follow the app's scheme (6-char
-- slug, 2-digit suffix on collision). Safe to re-run.
--
-- SNAPSHOT the DB before running (this writes to all three category tables).

-- 1) Material categories
insert into public.category (tenant_id, code, name)
select tenant_id, code, name from (
  select tenant_id, name,
    case when count(*) over (partition by tenant_id, base) = 1 then base
         else base || lpad((row_number() over (partition by tenant_id, base order by name))::text, 2, '0') end as code
  from (
    select t.tenant_id, n.name,
      coalesce(nullif(upper(regexp_replace(left(n.name, 6), '[^a-zA-Z0-9]', '', 'g')), ''), 'GEN') as base
    from (
      select distinct tenant_id from public.category
      union select distinct tenant_id from public.labor_category
      union select distinct tenant_id from public.subcontractor_category
    ) t
    cross join (
      select btrim(name) as name from public.category where btrim(coalesce(name, '')) <> ''
      union select btrim(name) from public.labor_category where btrim(coalesce(name, '')) <> ''
      union select btrim(name) from public.subcontractor_category where btrim(coalesce(name, '')) <> ''
      union select btrim(category) from public.labor_rates where btrim(coalesce(category, '')) <> ''
      union select btrim(category) from public.subcontractor_rates where btrim(coalesce(category, '')) <> ''
      union select btrim(category) from public.misc_rates where btrim(coalesce(category, '')) <> ''
    ) n
    where not exists (
      select 1 from public.category x where x.tenant_id = t.tenant_id and x.name = n.name
    )
  ) w
) d
on conflict (tenant_id, code) do nothing;

-- 2) Labor categories
insert into public.labor_category (tenant_id, code, name)
select tenant_id, code, name from (
  select tenant_id, name,
    case when count(*) over (partition by tenant_id, base) = 1 then base
         else base || lpad((row_number() over (partition by tenant_id, base order by name))::text, 2, '0') end as code
  from (
    select t.tenant_id, n.name,
      coalesce(nullif(upper(regexp_replace(left(n.name, 6), '[^a-zA-Z0-9]', '', 'g')), ''), 'GEN') as base
    from (
      select distinct tenant_id from public.category
      union select distinct tenant_id from public.labor_category
      union select distinct tenant_id from public.subcontractor_category
    ) t
    cross join (
      select btrim(name) as name from public.category where btrim(coalesce(name, '')) <> ''
      union select btrim(name) from public.labor_category where btrim(coalesce(name, '')) <> ''
      union select btrim(name) from public.subcontractor_category where btrim(coalesce(name, '')) <> ''
      union select btrim(category) from public.labor_rates where btrim(coalesce(category, '')) <> ''
      union select btrim(category) from public.subcontractor_rates where btrim(coalesce(category, '')) <> ''
      union select btrim(category) from public.misc_rates where btrim(coalesce(category, '')) <> ''
    ) n
    where not exists (
      select 1 from public.labor_category x where x.tenant_id = t.tenant_id and x.name = n.name
    )
  ) w
) d
on conflict (tenant_id, code) do nothing;

-- 3) Subcontractor categories
insert into public.subcontractor_category (tenant_id, code, name)
select tenant_id, code, name from (
  select tenant_id, name,
    case when count(*) over (partition by tenant_id, base) = 1 then base
         else base || lpad((row_number() over (partition by tenant_id, base order by name))::text, 2, '0') end as code
  from (
    select t.tenant_id, n.name,
      coalesce(nullif(upper(regexp_replace(left(n.name, 6), '[^a-zA-Z0-9]', '', 'g')), ''), 'GEN') as base
    from (
      select distinct tenant_id from public.category
      union select distinct tenant_id from public.labor_category
      union select distinct tenant_id from public.subcontractor_category
    ) t
    cross join (
      select btrim(name) as name from public.category where btrim(coalesce(name, '')) <> ''
      union select btrim(name) from public.labor_category where btrim(coalesce(name, '')) <> ''
      union select btrim(name) from public.subcontractor_category where btrim(coalesce(name, '')) <> ''
      union select btrim(category) from public.labor_rates where btrim(coalesce(category, '')) <> ''
      union select btrim(category) from public.subcontractor_rates where btrim(coalesce(category, '')) <> ''
      union select btrim(category) from public.misc_rates where btrim(coalesce(category, '')) <> ''
    ) n
    where not exists (
      select 1 from public.subcontractor_category x where x.tenant_id = t.tenant_id and x.name = n.name
    )
  ) w
) d
on conflict (tenant_id, code) do nothing;
