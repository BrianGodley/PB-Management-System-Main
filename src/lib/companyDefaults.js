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
      .from('company_settings')
      .select('estimate_gpmd_default')
      .maybeSingle()
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
    const { data } = await supabase.from('company_settings').select('sales_tax_rate').maybeSingle()
    const n = parseFloat(data?.sales_tax_rate)
    return Number.isFinite(n) && n >= 0 ? n : DEFAULT_SALES_TAX_RATE
  } catch {
    return DEFAULT_SALES_TAX_RATE
  }
}

// ── Invoice notification email template ───────────────────────────────────────
// The "standard message" emailed to a client when staff send them an invoice.
// Editable in Admin -> Email Settings; pre-filled (and tweakable) in the invoice
// Send dialog. Placeholders resolved at send time:
//   {{client_name}} {{invoice_number}} {{amount}} {{due_date}} {{company_name}}
export const DEFAULT_INVOICE_EMAIL_SUBJECT = 'Invoice {{invoice_number}} is ready to view'
export const DEFAULT_INVOICE_EMAIL_BODY =
  'Hi {{client_name}},\n\n' +
  'A new invoice ({{invoice_number}}) for {{amount}} is now available in your client portal. ' +
  'Payment is due {{due_date}}.\n\n' +
  'You can review the full invoice, see what it covers, and download any attachments ' +
  'using the button below. If you have any questions, just reply to this email.\n\n' +
  'Thank you!'

/**
 * fetchInvoiceEmailTemplate()
 * Returns { subject, body } for the invoice notification email from
 * company_settings, falling back to the defaults above if unset or unreadable.
 *
 * @returns {Promise<{subject: string, body: string}>}
 */
export async function fetchInvoiceEmailTemplate() {
  try {
    const { data } = await supabase
      .from('company_settings')
      .select('invoice_email_subject, invoice_email_body')
      .maybeSingle()
    return {
      subject: data?.invoice_email_subject?.trim() || DEFAULT_INVOICE_EMAIL_SUBJECT,
      body: data?.invoice_email_body?.trim() || DEFAULT_INVOICE_EMAIL_BODY,
    }
  } catch {
    return { subject: DEFAULT_INVOICE_EMAIL_SUBJECT, body: DEFAULT_INVOICE_EMAIL_BODY }
  }
}
