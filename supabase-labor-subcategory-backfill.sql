-- Backfill labor_rates.sub_category from the item name within each category.
-- Derived from how the estimator groups these rates; only sub_category is set
-- (names/rates untouched). Idempotent — safe to re-run.

update public.labor_rates set sub_category = case
  when name like 'Turf - Demo%' then 'Demo'
  when name like '%Cut%' or name like '%Staple%' or name like '%Seam%'
       or name like '%Layout%' or name like 'Turf - Strip%'
       or name like 'Turf - Turf Install%' then 'Turf Installation'
  else 'Base Prep'
end
where category = 'Artificial Turf';

update public.labor_rates set sub_category = case
  when name like '%Veneer%' or name like '%Flagstone%' or name like '%Real Stone%'
       or name like '%Stucco%' or name like '%Stacked Stone%' or name like 'Tile%' then 'Finishes'
  else 'Installation'
end
where category = 'Columns';

update public.labor_rates set sub_category = case
  when name like '%Base %' or name like '%Import Base%' then 'Base Prep'
  when name like '%Form%' then 'Forming'
  when name like '%Rebar%' then 'Reinforcement'
  when name like '%Pump%' then 'Pump'
  when name like '%Sealer%' then 'Sealer'
  when name like '%Sleeve%' then 'Sleeves'
  when name like '%Vapor Barrier%' then 'Vapor Barrier'
  when name like '%Aggregate%' or name like '%Salt Finish%' or name like '%Sand Finish%'
       or name like '%Stamp%' then 'Finishes'
  else 'Placement'
end
where category = 'Concrete';

update public.labor_rates set sub_category = case
  when name like '%Mini%' then 'Mini Skid Steer Demo'
  when name like '%Hand%' then 'Hand Demo'
  when name like '%Skid%' then 'Skid Steer Demo'
  else 'Shared'
end
where category = 'Demo';

update public.labor_rates set sub_category = case
  when name like '%Excavation%' then 'Excavation'
  when name like '%Catch Basin%' then 'Catch Basins'
  else 'Coring'
end
where category = 'Drainage';

update public.labor_rates set sub_category = case
  when name like '%Cap %' then 'Caps'
  else 'Surface Finishes'
end
where category = 'Finishes';

update public.labor_rates set sub_category = case
  when name like 'FP Gas%' then 'Gas'
  when name like 'FP %' then 'Structure'
  else 'Finishes'
end
where category = 'Fire Pit';

update public.labor_rates set sub_category = case
  when name like '%Edging%' then 'Edging'
  when name like 'Mulch%' then 'Mulch'
  when name like 'DG %' or name like 'Gravel%' then 'Gravel & DG'
  when name like '%Steppers%' then 'Steppers'
  else 'Sod & Soil Prep'
end
where category = 'Ground Treatments';

update public.labor_rates set sub_category = case
  when name like 'Irrigation Zone%' then 'Zones'
  else 'Installation'
end
where category = 'Irrigation';

update public.labor_rates set sub_category = case
  when name like '%Transformer%' then 'Transformers'
  else 'Fixtures'
end
where category = 'Lighting';

update public.labor_rates set sub_category = case
  when name like '%Counter%' then 'Countertop'
  when name like '%Appliance%' or name like '%GFIC%' or name like '%Sink%'
       or name like '%Gas Trench%' then 'Appliances & Utilities'
  when name like 'BBQ %' then 'Structure'
  else 'Finishes'
end
where category = 'Outdoor Kitchen';

update public.labor_rates set sub_category = case
  when name like 'Paver Sub%' then 'Subcontractor'
  when name like '%Base %' then 'Base Prep'
  else 'Installation'
end
where category = 'Paver';

update public.labor_rates set sub_category = case
  when name like 'Till%' then 'Soil Prep'
  when name like '%Basket%' or name like '%Fabric%' or name like '%Mesh%'
       or name like '%Barrier%' or name like '%Stakes%' then 'Accessories'
  else 'Plant Installation'
end
where category = 'Planting';

update public.labor_rates set sub_category = case
  when name like 'Excavation%' then 'Excavation'
  when name like 'Coping%' then 'Coping'
  when name like 'Spillway%' then 'Spillway'
  when name like 'Tile%' then 'Waterline Tile'
  when name like 'Raised%' then 'Raised Finishes'
  when name like 'Equip Labor%' then 'Equipment'
  when name like '%Plumbing%' then 'Plumbing'
  else 'Structure'
end
where category = 'Pool';

update public.labor_rates set sub_category = case
  when name like '%Finish%' then 'Finishes'
  else 'Concrete'
end
where category = 'Steps';

update public.labor_rates set sub_category = case
  when name like '%Gas%' then 'Gas'
  when name like '%Sewer%' then 'Sewer'
  when name like '%Sink%' then 'Sinks'
  when name like '%Excavation%' or name like '%Curb Core%' or name like '%Hydrocut%' then 'Excavation'
  else 'Electrical'
end
where category = 'Utilities';

update public.labor_rates set sub_category = case
  when name like '%Cap %' then 'Caps'
  when name like '%Timber%' then 'Timber'
  when name like '%WP %' or name like '%Waterproof%' then 'Waterproofing'
  when name like 'Wall %' then 'Structure'
  else 'Finishes'
end
where category = 'Walls';

update public.labor_rates set sub_category = 'Abatement'
where category = 'Weed Abatement';
