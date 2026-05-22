// supabase/functions/helcim-charge-saved/index.ts
//
// Charges a previously-saved (vaulted) payment method for a portal invoice —
// the client picks a saved card / bank account and it's charged with no
// re-entry. Server-side so HELCIM_API_TOKEN never reaches the browser and the
// amount is the authoritative invoice balance.
//
// Request  (POST):  { invoice_id, payment_method_id }
// Response (200):   { ok: true, transactionId, amount }
//
// NOTE: the credit-card token charge uses Helcim's documented Payment API
// (/v2/payment/purchase + cardData.cardToken). The bank/ACH token charge
// endpoint is inferred — verify it against your live Helcim account.
//
// Deploy:  supabase functions deploy helcim-charge-saved --no-verify-jwt
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

const today = () => new Date().toISOString().slice(0, 10)

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405)

  try {
    const { invoice_id, payment_method_id } = await req.json().catch(() => ({}))
    if (!invoice_id || !payment_method_id)
      return json({ error: 'invoice_id and payment_method_id are required' }, 400)

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { data: pm } = await supabase
      .from('client_payment_methods')
      .select('*')
      .eq('id', payment_method_id)
      .maybeSingle()
    if (!pm || !pm.helcim_card_token)
      return json({ error: 'Saved payment method not found.' }, 404)

    const { data: inv } = await supabase
      .from('job_invoices')
      .select('id, invoice_number, amount, amount_paid, status, job_id')
      .eq('id', invoice_id)
      .maybeSingle()
    if (!inv) return json({ error: 'Invoice not found' }, 404)
    if (inv.status === 'paid') return json({ error: 'This invoice is already paid.' }, 400)
    const balance = Number(inv.amount || 0) - Number(inv.amount_paid || 0)
    if (!(balance > 0)) return json({ error: 'This invoice has no balance due.' }, 400)

    const apiToken = Deno.env.get('HELCIM_API_TOKEN')
    if (!apiToken) return json({ error: 'Helcim is not configured.' }, 500)

    const amount = Number(balance.toFixed(2))
    const isBank = pm.method_type === 'bank'
    const idem = crypto.randomUUID().replace(/-/g, '').slice(0, 25)

    const endpoint = isBank
      ? 'https://api.helcim.com/v2/payment/ach-purchase'
      : 'https://api.helcim.com/v2/payment/purchase'
    const body: Record<string, unknown> = {
      paymentType: 'purchase',
      currency: 'USD',
      amount,
      ipAddress: '0.0.0.0',
    }
    if (pm.helcim_customer_code) body.customerCode = pm.helcim_customer_code
    if (isBank) body.bankAccountToken = pm.helcim_card_token
    else body.cardData = { cardToken: pm.helcim_card_token }

    const hRes = await fetch(endpoint, {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'api-token': apiToken,
        'content-type': 'application/json',
        'idempotency-key': idem,
      },
      body: JSON.stringify(body),
    })
    const hData = await hRes.json().catch(() => null)
    const approved =
      hRes.ok && (hData?.status === 'APPROVED' || !!hData?.transactionId)
    if (!approved) {
      const detail = hData?.errors || hData?.message || `HTTP ${hRes.status}`
      return json({ error: `Payment declined: ${JSON.stringify(detail)}` }, 402)
    }
    const txnId = String(hData?.transactionId || hData?.id || '')

    // Record the payment + recompute the invoice balance.
    await supabase.from('job_invoice_payments').insert({
      job_id: inv.job_id,
      invoice_id: inv.id,
      amount,
      method: isBank ? 'Bank Transfer' : 'Credit Card',
      status: 'completed',
      payment_date: today(),
      transaction_id: txnId || null,
    })
    const { data: pays } = await supabase
      .from('job_invoice_payments')
      .select('amount')
      .eq('invoice_id', inv.id)
    const paid = (pays || []).reduce((s, p) => s + Number(p.amount || 0), 0)
    const fullyPaid = paid >= Number(inv.amount || 0) - 0.005
    await supabase
      .from('job_invoices')
      .update({
        amount_paid: paid,
        status: fullyPaid ? 'paid' : inv.status,
        ...(fullyPaid ? { paid_date: today() } : {}),
      })
      .eq('id', inv.id)

    return json({ ok: true, transactionId: txnId, amount })
  } catch (e) {
    return json({ error: String((e as Error)?.message || e) }, 500)
  }
})
