// supabase/functions/website-lead/index.ts
//
// Captures a contact-form submission from a tenant's public marketing site
// (built in the Website Builder, served at /s/:slug). The visitor is anonymous,
// so this runs with the service role and resolves the tenant from the site's
// slug — then, scoped to that tenant, it:
//   1. creates a Marketing contact (clients row),
//   2. drops a card into the site's target Sales funnel (first stage), and
//   3. records the raw submission in website_leads.
//
// Request (POST): { slug, page_slug?, name, email?, phone?, message? }
// Response (200): { ok: true, client_id }
//
// Deploy:  supabase functions deploy website-lead --no-verify-jwt
//   (--no-verify-jwt so anonymous site visitors aren't rejected by the gateway.)
import { createClient } from 'npm:@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, 'content-type': 'application/json' } })
}

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405)

  try {
    const { slug, page_slug, name, email, phone, message } = await req.json().catch(() => ({}))
    if (!slug) return json({ error: 'Missing site.' }, 400)
    if (!name || !String(name).trim()) return json({ error: 'Please enter your name.' }, 400)
    if (!String(email || '').trim() && !String(phone || '').trim())
      return json({ error: 'Please provide an email or phone.' }, 400)

    const admin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // ── Resolve the site → tenant + target funnel ───────────────────────────
    const { data: site } = await admin
      .from('websites')
      .select('id, tenant_id, funnel_id, published')
      .ilike('slug', slug)
      .maybeSingle()
    if (!site || !site.published) return json({ error: 'Site not found.' }, 404)
    const tenantId = site.tenant_id

    // ── Anti-spam throttle (public endpoint) ────────────────────────────────
    // Not a tenant-isolation issue (we write to the slug's own tenant), but an
    // open form invites flooding. Cap submissions per site per IP per hour and
    // drop exact-duplicate (same email → same site) repeats within 5 minutes.
    const ip =
      (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() ||
      req.headers.get('cf-connecting-ip') ||
      'unknown'
    const emailNorm = String(email || '').trim().toLowerCase()
    const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    const { count: ipCount } = await admin
      .from('website_leads')
      .select('id', { count: 'exact', head: true })
      .eq('website_id', site.id)
      .gte('created_at', hourAgo)
      .contains('raw', { ip })
    if ((ipCount || 0) >= 10)
      return json({ error: 'Too many submissions. Please try again later.' }, 429)
    if (emailNorm) {
      const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
      const { count: dupCount } = await admin
        .from('website_leads')
        .select('id', { count: 'exact', head: true })
        .eq('website_id', site.id)
        .eq('email', emailNorm)
        .gte('created_at', fiveMinAgo)
      if ((dupCount || 0) >= 1)
        return json({ ok: true, deduped: true })
    }

    // ── 1) Create the contact ───────────────────────────────────────────────
    const full = String(name).trim()
    const sp = full.indexOf(' ')
    const first_name = sp === -1 ? full : full.slice(0, sp)
    const last_name = sp === -1 ? '' : full.slice(sp + 1)

    const { data: client, error: cErr } = await admin
      .from('clients')
      .insert({
        tenant_id: tenantId,
        client_type: 'individual',
        first_name,
        last_name,
        name: full,
        email: String(email || '').trim() || null,
        phone: String(phone || '').trim() || null,
        status: 'active',
        source: 'website',
      })
      .select('id')
      .single()
    if (cErr) return json({ error: 'Could not save the contact: ' + cErr.message }, 500)
    const clientId = client?.id || null

    // ── 2) Drop a card into the target funnel's first stage ─────────────────
    if (site.funnel_id && clientId) {
      const { data: stage } = await admin
        .from('funnel_stages')
        .select('id')
        .eq('funnel_id', site.funnel_id)
        .order('sort_order')
        .limit(1)
        .maybeSingle()
      if (stage?.id) {
        await admin.from('funnel_cards').insert({
          tenant_id: tenantId,
          funnel_id: site.funnel_id,
          stage_id: stage.id,
          client_id: clientId,
        })
      }
    }

    // ── 3) Record the raw submission ────────────────────────────────────────
    await admin.from('website_leads').insert({
      tenant_id: tenantId,
      website_id: site.id,
      page_slug: page_slug || null,
      name: full,
      email: emailNorm || null,
      phone: String(phone || '').trim() || null,
      message: String(message || '').trim() || null,
      raw: { name, email, phone, message, page_slug, ip },
      client_id: clientId,
    })

    return json({ ok: true, client_id: clientId })
  } catch (e) {
    return json({ error: String((e as Error)?.message || e) }, 500)
  }
})
