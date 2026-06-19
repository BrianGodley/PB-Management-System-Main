// supabase/functions/_shared/tenant.ts
//
// Shared tenancy helpers for edge functions. Edge functions connect with the
// service-role key, which BYPASSES row-level security — so unlike the app, they
// are NOT auto-scoped to a tenant. Any function acting on behalf of a logged-in
// user must resolve that user's tenant and scope its reads/writes accordingly.
//
// Usage (user-initiated function):
//   import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
//   import { getCaller, getTenantSettings } from '../_shared/tenant.ts'
//
//   const admin = createClient(SUPABASE_URL, SERVICE_ROLE)
//   const { userId, tenantId } = await getCaller(req, admin)
//   if (!tenantId) return json(401, { error: 'No tenant for caller' })
//
//   // scope reads:   .from('jobs').select('*').eq('tenant_id', tenantId)
//   // scope writes:  .from('jobs').insert({ ...row, tenant_id: tenantId })
//   const settings = await getTenantSettings(admin, tenantId)
//
// Cron/webhook functions have no caller JWT — they must either loop over all
// tenants or map an external id back to a tenant; this helper is for the
// user-initiated case.

// deno-lint-ignore no-explicit-any
type Admin = any

/** The auth user id (sub) from the request's Bearer token, or null. */
export async function getUserId(req: Request, admin: Admin): Promise<string | null> {
  const authHeader = req.headers.get('Authorization') || req.headers.get('authorization') || ''
  const token = authHeader.replace(/^Bearer\s+/i, '').trim()
  if (!token) return null
  try {
    const { data, error } = await admin.auth.getUser(token)
    if (error || !data?.user) return null
    return data.user.id as string
  } catch {
    return null
  }
}

/** The tenant_id for the calling user (via profiles), or null. */
export async function getTenantId(req: Request, admin: Admin): Promise<string | null> {
  const userId = await getUserId(req, admin)
  if (!userId) return null
  const { data } = await admin.from('profiles').select('tenant_id').eq('id', userId).maybeSingle()
  return data?.tenant_id ?? null
}

/** Both the caller's userId and tenantId in one call. */
export async function getCaller(
  req: Request,
  admin: Admin
): Promise<{ userId: string | null; tenantId: string | null }> {
  const userId = await getUserId(req, admin)
  if (!userId) return { userId: null, tenantId: null }
  const { data } = await admin.from('profiles').select('tenant_id').eq('id', userId).maybeSingle()
  return { userId, tenantId: data?.tenant_id ?? null }
}

/** This tenant's company_settings row (per-tenant config: branding, addresses…). */
export async function getTenantSettings(admin: Admin, tenantId: string | null) {
  if (!tenantId) return null
  const { data } = await admin
    .from('company_settings')
    .select('*')
    .eq('tenant_id', tenantId)
    .maybeSingle()
  return data
}
