-- Populate the Labor Categories + Labor Sub-Cats taxonomy tables from the now-
-- backfilled labor_rates. Re-run of the taxonomy seed: when it first ran, every
-- labor_rates.sub_category was empty, so no sub-categories were created. Now that
-- supabase-labor-subcategory-backfill.sql has filled them in, this pulls the
-- distinct (category, sub_category) pairs into labor_subcategory.
-- Idempotent — codes match the app's scheme; on conflict do nothing.

-- Labor categories (ensures a parent row exists for every sub-category link)
insert into public.labor_category (tenant_id, code, name)
select tenant_id, code, name from (
  select tenant_id, name,
    case when count(*) over (partition by tenant_id, base) = 1 then base
         else base || lpad((row_number() over (partition by tenant_id, base order by name))::text, 2, '0') end as code
  from (
    select distinct tenant_id, btrim(category) as name,
      coalesce(nullif(upper(regexp_replace(left(btrim(category), 6), '[^a-zA-Z0-9]', '', 'g')), ''), 'GEN') as base
    from public.labor_rates where btrim(coalesce(category, '')) <> ''
  ) d
) e
on conflict (tenant_id, code) do nothing;

-- Labor sub-categories (linked to their category by name)
insert into public.labor_subcategory (tenant_id, category_id, code, name)
select s.tenant_id, c.id, s.code, s.name from (
  select tenant_id, cat_name, name,
    case when count(*) over (partition by tenant_id, cat_name, base) = 1 then base
         else base || lpad((row_number() over (partition by tenant_id, cat_name, base order by name))::text, 2, '0') end as code
  from (
    select distinct tenant_id, btrim(category) as cat_name, btrim(sub_category) as name,
      coalesce(nullif(upper(regexp_replace(left(btrim(sub_category), 6), '[^a-zA-Z0-9]', '', 'g')), ''), 'GEN') as base
    from public.labor_rates
    where btrim(coalesce(sub_category, '')) <> '' and btrim(coalesce(category, '')) <> ''
  ) d
) s
join public.labor_category c on c.tenant_id = s.tenant_id and c.name = s.cat_name
on conflict (tenant_id, category_id, code) do nothing;
