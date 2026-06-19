// src/lib/brand.js
//
// Platform brand (SoftCake) + per-tenant white-label resolver.
//
// User-facing PRODUCT chrome (login, marketing, app header, PWA name) reads the
// brand from here — never hardcode the name again. Pre-auth screens use the
// platform brand; in-app/portal chrome can pass the current tenant to
// resolveBrand() so a white-label tenant shows its own name + logo.
//
// NOTE: this is the *product* brand. A tenant's own company name shown on
// client-facing documents (bids, invoices, e-sign, their client portal) is
// tenant data (company_settings / tenants), NOT this platform brand.

export const PLATFORM_BRAND = {
  name: 'SoftCake',
  shortName: 'SoftCake',
  tagline: 'Run your whole company from one place',
  logo: '/logo.png',
  accent: '#3A5038', // change here to retheme the product chrome
}

// Resolve the brand to display. Pass a tenant object that may carry white-label
// fields (brand_name / brand_logo_url); falls back to the platform brand.
export function resolveBrand(tenant) {
  if (!tenant) return PLATFORM_BRAND
  return {
    ...PLATFORM_BRAND,
    name: tenant.brand_name || PLATFORM_BRAND.name,
    shortName: tenant.brand_name || PLATFORM_BRAND.shortName,
    logo: tenant.brand_logo_url || PLATFORM_BRAND.logo,
  }
}
