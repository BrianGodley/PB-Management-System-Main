// supabase/functions/invoice-comment/index.ts
//
// Records a client's comment on a portal invoice. Called from the client
// portal's invoice list (the Comments column).
//
// It does two things server-side (so RLS + the Finance team's email address
// never have to be exposed to the browser):
//   1. Inserts the comment as a daily_logs row on the invoice's job.
//   2. Emails every active employee in the configured invoice-communication
//      position (company_settings.invoice_comm_position_id).
//
// Deploy:  supabase functions deploy invoice-comment --no-verify-jwt
//   (--no-verify-jwt so the portal client's session JWT isn't rejected by the
//    gateway; the caller is still verified below via auth.getUser.)
import { createClient } from 'npm:@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'content-type': 'application/json' },
  })
}

function esc(s: string) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405)

  try {
    const { invoice_id, comment } = await req.json().catch(() => ({}))
    if (!invoice_id || !comment || !String(comment).trim())
      return json({ error: 'invoice_id and comment are required' }, 400)

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
    const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    const admin = createClient(SUPABASE_URL, SERVICE_KEY)

    // ── Identify the caller from their portal session JWT ───────────────────
    const jwt = (req.headers.get('Authorization') || '').replace('Bearer ', '')
    const { data: userData } = await admin.auth.getUser(jwt)
    const user = userData?.user
    if (!user) return json({ error: 'Not signed in.' }, 401)

    const { data: portal } = await admin
      .from('client_portals')
      .select('client_id, status')
      .eq('auth_user_id', user.id)
      .maybeSingle()
    if (!portal || portal.status !== 'active')
      return json({ error: 'No active client portal for this account.' }, 403)

    // ── invoice -> job -> client; confirm the invoice is on this account ────
    const { data: inv } = await admin
      .from('job_invoices')
      .select('id, invoice_number, job_id')
      .eq('id', invoice_id)
      .maybeSingle()
    if (!inv) return json({ error: 'Invoice not found.' }, 404)

    const { data: job } = await admin
      .from('jobs')
      .select('id, name, client_name, client_id, tenant_id')
      .eq('id', inv.job_id)
      .maybeSingle()
    if (!job || job.client_id !== portal.client_id)
      return json({ error: 'This invoice is not on your account.' }, 403)

    // Service-role bypasses RLS, so every read/write below is scoped to the
    // job's tenant explicitly (the caller is a portal client, not a staff user).
    const tenantId = job.tenant_id

    const { data: client } = await admin
      .from('clients')
      .select('name, first_name, last_name, tenant_id')
      .eq('id', portal.client_id)
      .maybeSingle()
    // Defense-in-depth: the portal's client and the invoice's job must be in the
    // same tenant. (client_id uniqueness already guarantees this; this makes the
    // tenant boundary explicit and fails closed if that ever changes.)
    if (!client || (client.tenant_id && client.tenant_id !== tenantId))
      return json({ error: 'This invoice is not on your account.' }, 403)
    const clientName =
      client?.name ||
      [client?.first_name, client?.last_name].filter(Boolean).join(' ') ||
      'Client'

    const invNum = inv.invoice_number || inv.id
    const jobLabel = job.name || job.client_name || 'Job'
    const text = String(comment).trim()
    const today = new Date().toISOString().slice(0, 10)

    // ── 1) Daily log ────────────────────────────────────────────────────────
    const { error: logErr } = await admin.from('daily_logs').insert({
      job_id: job.id,
      tenant_id: tenantId,
      date: today,
      title: `Client comment · Invoice ${invNum}`,
      notes: `${clientName} commented on Invoice ${invNum}:\n\n${text}`,
      permissions: ['internal'],
      weather_conditions: false,
      source: 'client-portal',
    })
    if (logErr) return json({ error: 'Could not save the comment: ' + logErr.message }, 500)

    // ── 2) Resolve the invoice-communication position -> employee emails ────
    const { data: settings } = await admin
      .from('company_settings')
      .select('invoice_comm_position_id')
      .eq('tenant_id', tenantId)
      .maybeSingle()
    let recipients: string[] = []
    if (settings?.invoice_comm_position_id) {
      const { data: pos } = await admin
        .from('positions')
        .select('title')
        .eq('id', settings.invoice_comm_position_id)
        .maybeSingle()
      if (pos?.title) {
        const { data: emps } = await admin
          .from('employees')
          .select('email')
          .eq('tenant_id', tenantId)
          .eq('status', 'active')
          .ilike('job_title', pos.title)
        recipients = (emps || []).map((e: { email?: string }) => e.email || '').filter(Boolean)
      }
    }

    // ── 3) Email the invoice-communication team ─────────────────────────────
    let emailed = 0
    if (recipients.length) {
      const html = `
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f3f4f6;padding:32px 16px;">
  <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
    <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:14px;overflow:hidden;">
      <tr><td style="background:#3A5038;padding:22px 28px;">
        <p style="margin:0;color:#fff;font-size:16px;font-weight:700;">Client Invoice Comment</p>
      </td></tr>
      <tr><td style="padding:24px 28px;">
        <p style="margin:0 0 14px;color:#374151;font-size:14px;">
          <strong>${esc(clientName)}</strong> left a comment on
          <strong>Invoice ${esc(String(invNum))}</strong> (${esc(jobLabel)}):
        </p>
        <p style="margin:0;padding:14px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;
                  color:#111827;font-size:14px;line-height:1.6;white-space:pre-wrap;">${esc(text)}</p>
        <p style="margin:18px 0 0;color:#6b7280;font-size:12px;">
          This comment has also been saved to the job's daily log.
        </p>
      </td></tr>
    </table>
  </td></tr></table>
</div>`
      const res = await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${ANON_KEY}`,
          apikey: ANON_KEY,
        },
        body: JSON.stringify({
          to: recipients,
          subject: `Client comment on Invoice ${invNum} — ${jobLabel}`,
          html,
        }),
      })
      if (res.ok) emailed = recipients.length
    }

    return json({ ok: true, emailed })
  } catch (e) {
    return json({ error: String((e as Error)?.message || e) }, 500)
  }
})
