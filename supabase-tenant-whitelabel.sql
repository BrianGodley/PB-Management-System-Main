-- ============================================================================
-- TENANT WHITE-LABEL  (optional per-tenant brand override)
-- ----------------------------------------------------------------------------
-- The product chrome shows the SoftCake platform brand by default. A tenant
-- that wants white-labeling can set its own brand name + logo here; the app's
-- brand resolver (src/lib/brand.js → resolveBrand) overlays these over the
-- platform defaults. NULL = use the SoftCake platform brand.
--
-- Run on prod + staging. Safe to re-run.
-- ============================================================================

alter table public.tenants add column if not exists brand_name     text;
alter table public.tenants add column if not exists brand_logo_url  text;

-- Example: white-label a specific tenant (fill in the real id + values)
-- update public.tenants
--   set brand_name = 'Their Company', brand_logo_url = 'https://…/logo.png'
--   where id = '<tenant-uuid>';

-- Note: an in-app workspace already shows each tenant's own company name + logo
-- from company_settings (Layout header). brand_name/brand_logo_url here are for
-- product-chrome white-labeling (login/marketing/portal) once that's wired.
