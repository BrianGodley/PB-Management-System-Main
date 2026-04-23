ALTER TABLE subs_vendors
  ADD COLUMN IF NOT EXISTS services_pricing text;
