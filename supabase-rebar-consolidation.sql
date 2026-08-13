-- ============================================================================
-- Uniform rebar: ONE canonical size-based set in Basic Materials → Reinforcement
-- Rebar #3–#8, unit 'Ln Ft', Standard prices from Walls' dataset.
-- Run on prod AND staging. NOTE: the Standard vendor id differs per env — the
-- prod id is below; swap it for staging's Standard vendor id before running there.
-- Review the SELECT at the end before COMMIT.
-- ============================================================================
begin;

do $$
declare
  v_cat uuid;
  v_sub uuid;
  v_ten uuid;
  v_std uuid := '05a4535e-3a9b-40c1-9a98-c630b3b4fee5'; -- Standard vendor (PROD)
  sizes  text[]    := array['#3','#4','#5','#6','#8'];
  prices numeric[] := array[1.20,1.50,1.75,2.00,2.50];
  i int;
  v_mat uuid;
begin
  select tenant_id into v_ten from material limit 1;
  select id into v_cat from category where name ilike 'Basic Materials' limit 1;
  select id into v_sub from subcategory where category_id = v_cat and name ilike 'Reinforcement' limit 1;
  if v_sub is null then
    insert into subcategory (category_id, name, tenant_id) values (v_cat, 'Reinforcement', v_ten)
    returning id into v_sub;
  end if;

  for i in 1..array_length(sizes,1) loop
    -- Reuse an existing 'Rebar #N' anywhere (e.g. #4 from Walls → Wall Misc); else create.
    select id into v_mat from material
      where description = 'Rebar ' || sizes[i] and archived_at is null limit 1;
    if v_mat is null then
      insert into material (description, category_id, subcategory_id, unit, tenant_id, attributes)
      values ('Rebar ' || sizes[i], v_cat, v_sub, 'Ln Ft', v_ten, '{}'::jsonb)
      returning id into v_mat;
    else
      update material set category_id = v_cat, subcategory_id = v_sub, unit = 'Ln Ft' where id = v_mat;
    end if;
    -- Seed a Standard price ONLY if none is open (never clobber a real price).
    if not exists (
      select 1 from material_price
      where material_id = v_mat and vendor_id = v_std and effective_end is null
    ) then
      insert into material_price (material_id, vendor_id, price, source)
      values (v_mat, v_std, prices[i], 'manual');
    end if;
  end loop;

  -- Archive now-unused duplicate rebar rows (reversible: clear archived_at to restore).
  -- NOTE: generic 'Rebar' is left ACTIVE — Walls Brick/Timber still reads it.
  update material set archived_at = now()
  where description in ('BBQ Rebar','FP Rebar','Rebar-Columns','Rebar Price Sf')
    and archived_at is null;
end $$;

-- Review, then COMMIT:
select m.description, m.unit, m.archived_at,
       (select price from material_price mp
         where mp.material_id = m.id and mp.effective_end is null
         order by mp.effective_start desc nulls last limit 1) as std_price
from material m
where m.description like 'Rebar%'
   or m.description in ('BBQ Rebar','FP Rebar','Rebar-Columns','Rebar Price Sf')
order by m.description;

commit;
