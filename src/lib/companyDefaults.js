// src/lib/companyDefaults.js
// Thin fetchers for the global defaults stored on the single-row
// `company_settings` table. Used by features that need to read a tenant-wide
// configuration value (Estimate GPMD, Finance OAC rate, etc.).
//
// Every helper here is "fail-soft": if the column doesn't exist yet, the row
// is missing, or the network fails, we return the historical hardcoded
// default rather than throwing. That keeps estimating / bid generation
// working during DB migrations and prevents a single misconfigured row from
// taking the app down.

import { supabase } from './supabase'

// Historical hardcoded baseline. Until the user changes the value in
// Opportunities → Settings → General, this is what every new module is
// initialised with.
export const DEFAULT_ESTIMATE_GPMD = 425

/**
 * fetchGlobalGpmd()
 * Returns the global estimate GPMD target from company_settings, or
 * DEFAULT_ESTIMATE_GPMD if it can't be read.
 *
 * @returns {Promise<number>}
 */
export async function fetchGlobalGpmd() {
  try {
    const { data } = await supabase
      .from('company_settings').select('estimate_gpmd_default').maybeSingle()
    const n = parseFloat(data?.estimate_gpmd_default)
    return Number.isFinite(n) && n > 0 ? n : DEFAULT_ESTIMATE_GPMD
  } catch {
    return DEFAULT_ESTIMATE_GPMD
  }
}

// Sales tax rate. Stored as a fractional rate (0.095 = 9.5%) on
// company_settings; applied to every module's totalMat in the estimating
// flow so quotes match the supplier-invoiced material cost. Defaults to 0
// (no tax) until an admin opens Opportunities → Settings → General and
// sets it.
export const DEFAULT_SALES_TAX_RATE = 0

/**
 * fetchSalesTaxRate()
 * Returns the sales tax fractional rate from company_settings, or
 * DEFAULT_SALES_TAX_RATE if it can't be read.
 *
 * @returns {Promise<number>}
 */
export async function fetchSalesTaxRate() {
  try {
    const { data } = await supabase
      .from('company_settings').select('sales_tax_rate').maybeSingle()
    const n = parseFloat(data?.sales_tax_rate)
    return Number.isFinite(n) && n >= 0 ? n : DEFAULT_SALES_TAX_RATE
  } catch {
    return DEFAULT_SALES_TAX_RATE
  }
}
