-- Artificial Turf estimating coefficients belong in misc_rates (that is where the
-- module's View Rates reads/writes them). The original fallback seed only inserted
-- them into misc_rates when NO 'material' row of the same name existed -- but they
-- existed as 'material' rows, so misc_rates was skipped. When those 'material' rows
-- were re-pointed to a vendor (their 'material_price' left the Standard vendor),
-- fetchStandardRateMap stopped returning them and the module read 0 (e.g. Roll
-- Width FT -> Turf Installation Sq Ft/Hrs/Material all zero).
--
-- Fix: guarantee these pure coefficients exist in misc_rates (category
-- 'Artificial Turf'). fetchStandardRateMap merges misc_rates AFTER the 'material'
-- Standard price and overrides it, so the value resolves regardless of where the
-- 'material' rows live. Insert only when missing -- never clobber a value you set.
-- Idempotent. Run on prod + staging.
insert into public.misc_rates (tenant_id, name, rate, category)
select t.tid, v.name, v.rate, 'Artificial Turf'
from (select tenant_id tid from public.misc_rates limit 1) t
cross join (values
  ('Turf - Roll Width FT',            15),
  ('Turf - Demo Tons Divisor',        200),
  ('Turf - Gravel Base Tons Divisor', 200),
  ('Turf - Weed Fabric SF per Roll',  1800),
  ('Turf - Infill SF per Bag',        30),
  ('Turf - Class II Depth In',        3),
  ('Turf - DG Depth In',              1)
) as v(name, rate)
where not exists (
  select 1 from public.misc_rates m
  where m.name = v.name and m.category = 'Artificial Turf'
);

-- Verify:
-- select name, rate from public.misc_rates where category = 'Artificial Turf' order by name;
