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
