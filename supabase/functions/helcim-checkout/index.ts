// supabase/functions/helcim-checkout/index.ts
//
// Initializes a HelcimPay.js checkout session for a client-portal invoice
// payment.
//
// `method` ('card' | 'ach') picks the form Helcim shows. When `save` is true
// the invoice's client is linked to a Helcim customer (created on first use)
// so the card / bank account entered in the modal is vaulted under that
// customer and can be re-used later without re-entry.
//
// Request  (POST):  { invoice_id, method?, save? }
// Response (200):   { checkoutToken, amount, invoiceNumber, customerCode }
//
// Deploy:  supabase functions deploy helcim-checkout
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

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405)

  try {
    const { invoice_id, edoc_token, method, save } = await req.json().catch(() => ({}))

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // ── E-Document deposit flow (tokenized, no login) ─────────────────────────
    // The amount is read from edoc_documents server-side — never trusted from
    // the browser. Keyed strictly on the document's access_token.
    if (edoc_token) {
      const apiTokenE = Deno.env.get('HELCIM_API_TOKEN')
      if (!apiTokenE) return json({ error: 'Helcim is not configured.' }, 500)
      const { data: doc, error: dErr } = await supabase
        .from('edoc_documents')
        .select('id, name, deposit_required, deposit_amount, deposit_paid_at, status')
        .eq('access_token', edoc_token)
        .maybeSingle()
      if (dErr || !doc) return json({ error: 'Document not found' }, 404)
      if (!doc.deposit_required || !(Number(doc.deposit_amount) > 0))
        return json({ error: 'No deposit is due on this document.' }, 400)
      if (doc.deposit_paid_at) return json({ error: 'The deposit has already been paid.' }, 400)

      const depAmt = Number(Number(doc.deposit_amount).toFixed(2))
      const hResD = await fetch('https://api.helcim.com/v2/helcim-pay/initialize', {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'api-token': apiTokenE,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          paymentType: 'purchase',
          amount: depAmt,
          currency: 'USD',
          paymentMethod: method === 'ach' ? 'ach' : method === 'card' ? 'cc' : 'cc-ach',
        }),
      })
      const hDataD = await hResD.json().catch(() => null)
      if (!hResD.ok || !hDataD?.checkoutToken) {
        const detail = hDataD?.errors || hDataD?.message || `HTTP ${hResD.status}`
        return json({ error: `Helcim initialize failed: ${JSON.stringify(detail)}` }, 502)
      }
      return json({ checkoutToken: hDataD.checkoutToken, amount: depAmt })
    }

    if (!invoice_id) return json({ error: 'invoice_id is required' }, 400)
    const { data: inv, error } = await supabase
      .from('job_invoices')
      .select('id, invoice_number, amount, amount_paid, status, job_id')
      .eq('id', invoice_id)
      .maybeSingle()
    if (error || !inv) return json({ error: 'Invoice not found' }, 404)
    if (inv.status === 'paid') return json({ error: 'This invoice is already paid.' }, 400)

    const balance = Number(inv.amount || 0) - Number(inv.amount_paid || 0)
    if (!(balance > 0)) return json({ error: 'This invoice has no balance due.' }, 400)

    const apiToken = Deno.env.get('HELCIM_API_TOKEN')
    if (!apiToken) return json({ error: 'Helcim is not configured.' }, 500)

    // When the client opted to save the method, make sure their client record
    // has a Helcim customer so the entered card / bank is vaulted against it.
    let customerCode: string | null = null
    if (save) {
      const { data: job } = await supabase
        .from('jobs')
        .select('id, client_id')
        .eq('id', inv.job_id)
        .maybeSingle()
      const clientId = job?.client_id
      if (clientId) {
        const { data: portal } = await supabase
          .from('client_portals')
          .select('id, helcim_customer_code')
          .eq('client_id', clientId)
          .maybeSingle()
        customerCode = portal?.helcim_customer_code || null
        if (!customerCode) {
          const { data: client } = await supabase
            .from('clients')
            .select('name, first_name, last_name, email')
            .eq('id', clientId)
            .maybeSingle()
          const contactName =
            client?.name ||
            [client?.first_name, client?.last_name].filter(Boolean).join(' ') ||
            'Client'
          const cRes = await fetch('https://api.helcim.com/v2/customers', {
            method: 'POST',
            headers: {
              accept: 'application/json',
              'api-token': apiToken,
              'content-type': 'application/json',
            },
            body: JSON.stringify({ contactName, email: client?.email || undefined }),
          })
          const cData = await cRes.json().catch(() => null)
          customerCode = cData?.customerCode || cData?.customer?.customerCode || null
          if (customerCode && portal?.id) {
            await supabase
              .from('client_portals')
              .update({ helcim_customer_code: customerCode })
              .eq('id', portal.id)
          }
        }
      }
    }

    const initBody: Record<string, unknown> = {
      paymentType: 'purchase',
      amount: Number(balance.toFixed(2)),
      currency: 'USD',
      // 'ach' = bank transfer form, 'cc' = card form, 'cc-ach' = customer choice.
      paymentMethod: method === 'ach' ? 'ach' : method === 'card' ? 'cc' : 'cc-ach',
    }
    if (customerCode) initBody.customerCode = customerCode

    const hRes = await fetch('https://api.helcim.com/v2/helcim-pay/initialize', {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'api-token': apiToken,
        'content-type': 'application/json',
      },
      body: JSON.stringify(initBody),
    })
    const hData = await hRes.json().catch(() => null)
    if (!hRes.ok || !hData?.checkoutToken) {
      const detail = hData?.errors || hData?.message || `HTTP ${hRes.status}`
      return json({ error: `Helcim initialize failed: ${JSON.stringify(detail)}` }, 502)
    }

    return json({
      checkoutToken: hData.checkoutToken,
      amount: Number(balance.toFixed(2)),
      invoiceNumber: inv.invoice_number,
      customerCode,
    })
  } catch (e) {
    return json({ error: String((e as Error)?.message || e) }, 500)
  }
})
