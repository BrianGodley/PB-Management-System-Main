-- Add a Default Vendor to the material CATEGORY table (subcategory already has
-- one). Powers the new "Default Vendor" column on the Categories tab in Master
-- Material Rates. Idempotent. Run on prod + staging BEFORE the code deploy lands
-- (the Categories query now selects default_vendor_id).
alter table public.category
  add column if not exists default_vendor_id uuid references public.subs_vendors (id);
