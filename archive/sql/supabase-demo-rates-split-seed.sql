-- Seed independent per-item demo rate keys from their current shared values.
-- Idempotent: only inserts a new key if its source exists and the new key is absent.
-- Run on BOTH staging and production.

-- labor_rates (read by name; copies category + tenant_id)
insert into labor_rates (name, rate, category, tenant_id)
select m.newname, r.rate, r.category, r.tenant_id
from (values
    ('Demo - Hand Removal (SF)','Demo - Hand - Concrete SF'),
    ('Demo - Hand Removal (SF)','Demo - Hand - Dirt SF'),
    ('Demo - Hand Removal (SF)','Demo - Hand - Import Base SF'),
    ('Demo - Hand Removal (SF)','Demo - Hand - Grass SF'),
    ('Demo - Hand Removal (SF)','Demo - Hand - Misc Flat SF'),
    ('Demo - Hand Removal (SF)','Demo - Hand - Misc Vert SF'),
    ('Demo - Hand Removal (SF)','Demo - Hand - Footing SF'),
    ('Demo - Hand Removal (SF)','Demo - Hand - Grade Cut SF'),
    ('Demo - Hand Removal (SF)','Demo - Hand - Grade Fill SF'),
    ('Demo - Hand Removal (SF)','Demo - Hand - JJ SF'),
    ('Demo - Skid Steer Concrete/Dirt','Demo - Skid - Concrete t/hr'),
    ('Demo - Skid Steer Concrete/Dirt','Demo - Skid - Dirt t/hr'),
    ('Demo - Skid Steer Concrete/Dirt','Demo - Skid - Misc Flat t/hr'),
    ('Demo - Skid Steer Concrete/Dirt','Demo - Skid - Misc Vert t/hr'),
    ('Demo - Skid Steer Concrete/Dirt','Demo - Skid - Footing t/hr'),
    ('Demo - Skid Steer Concrete/Dirt','Demo - Skid - Grade Cut t/hr'),
    ('Demo - Skid Steer Import Base','Demo - Skid - Import Base t/hr'),
    ('Demo - Skid Steer Import Base','Demo - Skid - Grade Fill t/hr'),
    ('Demo - Mini Skid Steer Concrete/Dirt','Demo - Mini - Concrete t/hr'),
    ('Demo - Mini Skid Steer Concrete/Dirt','Demo - Mini - Dirt t/hr'),
    ('Demo - Mini Skid Steer Concrete/Dirt','Demo - Mini - Misc Flat t/hr'),
    ('Demo - Mini Skid Steer Concrete/Dirt','Demo - Mini - Misc Vert t/hr'),
    ('Demo - Mini Skid Steer Concrete/Dirt','Demo - Mini - Footing t/hr'),
    ('Demo - Mini Skid Steer Concrete/Dirt','Demo - Mini - Grade Cut t/hr'),
    ('Demo - Mini Skid Steer Import Base','Demo - Mini - Import Base t/hr'),
    ('Demo - Mini Skid Steer Import Base','Demo - Mini - Grade Fill t/hr'),
    ('Demo - Difficulty Ratio','Demo - Hand Difficulty Ratio'),
    ('Demo - JJ Compaction','Demo - Hand JJ Compaction'),
    ('Demo - Shrub','Demo - Hand Shrub'),
    ('Demo - Stump 1st','Demo - Hand Stump 1st'),
    ('Demo - Stump Additional','Demo - Hand Stump Additional'),
    ('Demo - Tree Small','Demo - Hand Tree Small'),
    ('Demo - Tree Medium','Demo - Hand Tree Medium'),
    ('Demo - Tree Large','Demo - Hand Tree Large'),
    ('Demo - Difficulty Ratio','Demo - Skid Difficulty Ratio'),
    ('Demo - JJ Compaction','Demo - Skid JJ Compaction'),
    ('Demo - SS Compaction','Demo - Skid SS Compaction'),
    ('Demo - Rebar','Demo - Skid Rebar'),
    ('Demo - Shrub SqFt (Skid Steer)','Demo - Skid Shrub SqFt Labor'),
    ('Demo - Shrub','Demo - Skid Shrub'),
    ('Demo - Stump 1st','Demo - Skid Stump 1st'),
    ('Demo - Stump Additional','Demo - Skid Stump Additional'),
    ('Demo - Tree Small','Demo - Skid Tree Small'),
    ('Demo - Tree Medium','Demo - Skid Tree Medium'),
    ('Demo - Tree Large','Demo - Skid Tree Large'),
    ('Demo - Difficulty Ratio','Demo - Mini Difficulty Ratio'),
    ('Demo - JJ Compaction','Demo - Mini JJ Compaction'),
    ('Demo - Rebar','Demo - Mini Rebar'),
    ('Demo - Shrub','Demo - Mini Shrub'),
    ('Demo - Stump 1st','Demo - Mini Stump 1st'),
    ('Demo - Stump Additional','Demo - Mini Stump Additional'),
    ('Demo - Tree Small','Demo - Mini Tree Small'),
    ('Demo - Tree Medium','Demo - Mini Tree Medium'),
    ('Demo - Tree Large','Demo - Mini Tree Large')
) as m(oldname, newname)
join labor_rates r on r.name = m.oldname
where not exists (select 1 from labor_rates x where x.name = m.newname and x.tenant_id = r.tenant_id);

-- material_rates (category 'Demo')
insert into material_rates (name, unit_cost, category, tenant_id)
select m.newname, r.unit_cost, r.category, r.tenant_id
from (values
    ('Demo - Container (Low-Boy)','Demo - Hand Container (Low-Boy)'),
    ('Demo - Container Capacity (CY)','Demo - Hand Container Capacity (CY)'),
    ('Demo - Removal Swell','Demo - Hand Removal Swell'),
    ('Demo - Import Base $/10cy','Demo - Hand Import Base $/10cy'),
    ('Dump Fee - Concrete','Demo - Hand Dump - Concrete'),
    ('Dump Fee - Dirt','Demo - Hand Dump - Dirt'),
    ('Dump Fee - Green Waste','Demo - Hand Dump - Green Waste'),
    ('Dump Fee - Tree/Stump','Demo - Hand Dump - Tree/Stump'),
    ('Demo - Container (Low-Boy)','Demo - Skid Container (Low-Boy)'),
    ('Demo - Container Capacity (CY)','Demo - Skid Container Capacity (CY)'),
    ('Demo - Removal Swell','Demo - Skid Removal Swell'),
    ('Demo - Shrub SqFt','Demo - Skid Shrub SqFt Mat'),
    ('Dump Fee - Concrete','Demo - Skid Dump - Concrete'),
    ('Dump Fee - Dirt','Demo - Skid Dump - Dirt'),
    ('Dump Fee - Green Waste','Demo - Skid Dump - Green Waste'),
    ('Demo - Container (Low-Boy)','Demo - Mini Container (Low-Boy)'),
    ('Demo - Container Capacity (CY)','Demo - Mini Container Capacity (CY)'),
    ('Demo - Removal Swell','Demo - Mini Removal Swell'),
    ('Demo - Shrub SqFt','Demo - Mini Shrub SqFt Mat'),
    ('Dump Fee - Concrete','Demo - Mini Dump - Concrete'),
    ('Dump Fee - Dirt','Demo - Mini Dump - Dirt'),
    ('Dump Fee - Green Waste','Demo - Mini Dump - Green Waste'),
    ('Dump Fee - Tree/Stump','Demo - Mini Dump - Tree/Stump'),
    ('Dump Fee - Import Base','Demo - Mini Dump - Import Base')
) as m(oldname, newname)
join material_rates r on r.name = m.oldname
where not exists (select 1 from material_rates x where x.name = m.newname and x.tenant_id = r.tenant_id);

-- subcontractor_rates (company_name; category 'Sub Haul')
insert into subcontractor_rates (company_name, rate, category, tenant_id)
select m.newname, r.rate, r.category, r.tenant_id
from (values
    ('Sub Haul - Concrete','Demo - Hand Sub Haul - Concrete'),
    ('Sub Haul - Dirt','Demo - Hand Sub Haul - Dirt'),
    ('Sub Haul - Grass','Demo - Hand Sub Haul - Grass'),
    ('Sub Haul - Trash 12yd','Demo - Hand Sub Haul - Trash 12yd'),
    ('Sub Haul - Concrete 12yd','Demo - Hand Sub Haul - Concrete 12yd'),
    ('Sub Haul - Soil 12yd','Demo - Hand Sub Haul - Soil 12yd'),
    ('Sub Haul - Import Base 12yd','Demo - Hand Sub Haul - Import Base 12yd'),
    ('Sub Haul - Concrete','Demo - Skid Sub Haul - Concrete'),
    ('Sub Haul - Dirt','Demo - Skid Sub Haul - Dirt'),
    ('Sub Haul - Grass','Demo - Skid Sub Haul - Grass'),
    ('Sub Haul - Trash 12yd','Demo - Skid Sub Haul - Trash 12yd'),
    ('Sub Haul - Concrete 12yd','Demo - Skid Sub Haul - Concrete 12yd'),
    ('Sub Haul - Soil 12yd','Demo - Skid Sub Haul - Soil 12yd'),
    ('Sub Haul - Import Base 12yd','Demo - Skid Sub Haul - Import Base 12yd'),
    ('Sub Haul - Concrete','Demo - Mini Sub Haul - Concrete'),
    ('Sub Haul - Dirt','Demo - Mini Sub Haul - Dirt'),
    ('Sub Haul - Grass','Demo - Mini Sub Haul - Grass'),
    ('Sub Haul - Trash 12yd','Demo - Mini Sub Haul - Trash 12yd'),
    ('Sub Haul - Concrete 12yd','Demo - Mini Sub Haul - Concrete 12yd'),
    ('Sub Haul - Soil 12yd','Demo - Mini Sub Haul - Soil 12yd'),
    ('Sub Haul - Import Base 12yd','Demo - Mini Sub Haul - Import Base 12yd'),
    ('Sub Demo - Concrete','Demo - Skid Sub Demo - Concrete'),
    ('Sub Demo - Dirt/Rock','Demo - Skid Sub Demo - Dirt/Rock'),
    ('Sub Demo - Import Base','Demo - Skid Sub Demo - Import Base'),
    ('Sub Demo - Grass/Sod','Demo - Skid Sub Demo - Grass/Sod'),
    ('Sub Demo - Misc Flat','Demo - Skid Sub Demo - Misc Flat'),
    ('Sub Demo - Grade Cut','Demo - Skid Sub Demo - Grade Cut')
) as m(oldname, newname)
join subcontractor_rates r on r.company_name = m.oldname
where not exists (select 1 from subcontractor_rates x where x.company_name = m.newname and x.tenant_id = r.tenant_id);
