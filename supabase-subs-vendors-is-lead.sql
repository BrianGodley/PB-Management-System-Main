-- Subcontractor Leads: potential subs to vet, kept in the same subs_vendors
-- table but flagged is_lead=true so they stay out of the main directory until
-- promoted ("Make Permanent" flips this back to false).
alter table public.subs_vendors
  add column if not exists is_lead boolean not null default false;

create index if not exists idx_subs_vendors_is_lead
  on public.subs_vendors (is_lead);
