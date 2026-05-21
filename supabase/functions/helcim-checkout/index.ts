// supabase/functions/helcim-checkout/index.ts
//
// Initializes a HelcimPay.js checkout session for a client-portal invoice
// payment. Called from the portal payment modal.
//
// Why server-side: Helcim's initialize endpoint must run from a back end
// (a browser call gets a CORS error), and the HELCIM_API_TOKEN secret must
// never reach the client. The invoice balance is also looked up here so the
// charge amount can't be tampered with by the browser.
//
// Request  (POST):  { invoice_id: "<uuid>" }
// Response (200):   { checkoutToken, amount, invoiceNumber }
//
// Deploy:  supabase functions deploy helcim-checkout
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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
    const { invoice_id } = await req.json().catch(() => ({}))
    if (!invoice_id) return json({ error: 'invoice_id is required' }, 400)

    // Look the invoice up server-side so the charged amount is authoritative.
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )
    const { data: inv, error } = await supabase
      .from('job_invoices')
      .select('id, invoice_number, amount, amount_paid, status')
      .eq('id', invoice_id)
      .maybeSingle()
    if (error || !inv) return json({ error: 'Invoice not found' }, 404)
    if (inv.status === 'paid') return json({ error: 'This invoice is already paid.' }, 400)

    const balance = Number(inv.amount || 0) - Number(inv.amount_paid || 0)
    if (!(balance > 0)) return json({ error: 'This invoice has no balance due.' }, 400)

    const apiToken = Deno.env.get('HELCIM_API_TOKEN')
    if (!apiToken) return json({ error: 'Helcim is not configured.' }, 500)

    // Initialize the HelcimPay.js checkout session.
    const hRes = await fetch('https://api.helcim.com/v2/helcim-pay/initialize', {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'api-token': apiToken,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        paymentType: 'purchase',
        amount: Number(balance.toFixed(2)),
        currency: 'USD',
      }),
    })
    const hData = await hRes.json().catch(() => null)
    if (!hRes.ok || !hData?.checkoutToken) {
      const detail = hData?.errors || hData?.message || `HTTP ${hRes.status}`
      return json({ error: `Helcim initialize failed: ${JSON.stringify(detail)}` }, 502)
    }

    // checkoutToken renders the modal in the browser. secretToken stays here —
    // it's used by the (separate) payment-recording function to verify the
    // result hash, so it is deliberately NOT returned to the client.
    return json({
      checkoutToken: hData.checkoutToken,
      amount: Number(balance.toFixed(2)),
      invoiceNumber: inv.invoice_number,
    })
  } catch (e) {
    return json({ error: String((e as Error)?.message || e) }, 500)
  }
})
