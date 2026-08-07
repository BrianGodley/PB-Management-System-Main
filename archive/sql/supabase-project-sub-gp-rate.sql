-- Add per-project sub GP markup rate
-- Previously this was a single global value in company_settings.sub_gp_markup_rate
-- Now each project stores its own rate so different projects can have different sub GP margins

alter table estimate_projects
  add column if not exists sub_gp_markup_rate numeric default 0.20;

-- Backfill existing projects with the current global rate (if you want to preserve it)
-- If you prefer to just default all to 20%, the column default handles it.
-- To use the existing global value instead, run:
--   update estimate_projects ep
--   set sub_gp_markup_rate = (select sub_gp_markup_rate from company_settings where id = 1)
--   where ep.sub_gp_markup_rate is null;
