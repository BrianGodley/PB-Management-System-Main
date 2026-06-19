// supabase/functions/_shared/helcim.ts
//
// Layer-2 (per-tenant client payments) helper. Loads a tenant's connected Helcim
// merchant token and builds request headers that include your partner-token, so
// charges process on the TENANT's account and earn partner revenue share.
//
// Use in payment functions (helcim-checkout, helcim-charge-saved) once tenants
// are connected:
//   const conn = await getTenantHelcim(admin, tenantId)
//   if (!conn) return json({ error: 'Payments not connected for this account' }, 400)
//   await fetch('https://api.helcim.com/v2/...', { headers: helcimHeaders(conn), ... })

// deno-lint-ignore no-explicit-any
type Admin = any

export interface TenantHelcim {
  apiToken: string
  accountId: string | null
  partnerToken: string
}

/** The tenant's connected Helcim merchant token, or null if not connected. */
export async function getTenantHelcim(admin: Admin, tenantId: string | null): Promise<TenantHelcim | null> {
  if (!tenantId) return null
  const { data } = await admin
    .from('tenant_payment_connections')
    .select('helcim_api_token, helcim_account_id, status')
    .eq('tenant_id', tenantId)
    .maybeSingle()
  if (!data || data.status !== 'connected' || !data.helcim_api_token) return null
  return {
    apiToken: data.helcim_api_token,
    accountId: data.helcim_account_id ?? null,
    partnerToken: Deno.env.get('HELCIM_PARTNER_TOKEN') || '',
  }
}

/** Standard Helcim API headers for a tenant payment (incl. partner-token tag). */
export function helcimHeaders(conn: TenantHelcim): Record<string, string> {
  const h: Record<string, string> = {
    accept: 'application/json',
    'content-type': 'application/json',
    'api-token': conn.apiToken,
  }
  // Tagging requests with the partner-token earns revenue share. Confirm the
  // exact header name in Helcim's partner docs once enrolled.
  if (conn.partnerToken) h['partner-token'] = conn.partnerToken
  return h
}
