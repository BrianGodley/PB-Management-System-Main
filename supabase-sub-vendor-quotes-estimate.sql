-- Quotes: optional link to an estimate from the estimates table.
alter table sub_vendor_quotes
  add column if not exists estimate_id uuid references estimates(id) on delete set null,
  add column if not exists estimate_name text;
