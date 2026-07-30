// supabase/functions/process-invoice/index.ts
//
// Sam reads an uploaded vendor invoice (PDF or image, or pre-extracted text)
// and returns its header + line items as structured data. Extraction only —
// no DB writes. The app matches lines to the master price list, runs the
// price-check, and posts job expenses after the admin approves.
//
// Request (POST): { file_path?, text?, vendor_name?, invoice_date? }
// Response (200):
//   { vendor_name, invoice_no, invoice_date, subtotal, total,
//     rows: [{ description, qty, unit, unit_price, amount, sku }] }
//
// Auth: requires the caller's Supabase session JWT.
// Deploy: supabase functions deploy process-invoice
import { createClient } from 'npm:@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, 'content-type': 'application/json' } })
}

const ANTHROPIC_API = 'https://api.anthropic.com/v1/messages'
const ANTHROPIC_VERSION = '2023-06-01'
const MODEL = 'claude-sonnet-4-5'
const MAX_TEXT = 80_000

const TOOL = {
  name: 'extract_invoice',
  description: 'Return the vendor invoice header and every line item.',
  input_schema: {
    type: 'object',
    properties: {
      vendor_name: { type: 'string', description: 'Supplier/vendor name on the invoice.' },
      invoice_no: { type: 'string', description: 'Invoice number/ID, if present.' },
      invoice_date: { type: 'string', description: 'Invoice date in YYYY-MM-DD, if present.' },
      subtotal: { type: 'number', description: 'Subtotal before tax/fees, if shown.' },
      total: { type: 'number', description: 'Invoice grand total, if shown.' },
      rows: {
        type: 'array',
        description: 'One entry per billed line item (materials/products/services).',
        items: {
          type: 'object',
          properties: {
            description: { type: 'string', description: 'Line item description exactly as printed.' },
            qty: { type: 'number', description: 'Quantity billed.' },
            unit: { type: 'string', description: 'Unit of measure (ton, each, sqft, LF, yard, bag, hour, etc.).' },
            unit_price: { type: 'number', description: 'Price per unit (no currency symbol).' },
            amount: { type: 'number', description: 'Extended line total (qty × unit_price).' },
            sku: { type: 'string', description: 'Item/SKU code if shown, else omit.' },
          },
          required: ['description'],
        },
      },
    },
    required: ['rows'],
  },
}

const SYSTEM = `You are a data-extraction assistant for a landscaping/construction company. You receive a VENDOR INVOICE (image, PDF, or text) and must extract the header fields and every billed line item.

Rules:
- Capture vendor name, invoice number, and invoice date (YYYY-MM-DD) when present.
- One row per billed line. Record description exactly as printed, plus qty, unit, unit_price, and the extended amount.
- Strip currency symbols and thousands separators from numbers.
- If unit isn't explicit, infer the most likely unit; if unknown, use "each".
- Ignore payment terms, remittance stubs, tax lines as line items (but do capture subtotal/total in the header fields), and page furniture.
- Do not invent items or numbers. If a value isn't present, omit it.
- Always return via the extract_invoice tool. Emit no prose.`

function mediaTypeFor(path: string): string | null {
  const p = path.toLowerCase()
  if (p.endsWith('.pdf')) return 'application/pdf'
  if (p.endsWith('.png')) return 'image/png'
  if (p.endsWith('.jpg') || p.endsWith('.jpeg')) return 'image/jpeg'
  if (p.endsWith('.webp')) return 'image/webp'
  if (p.endsWith('.gif')) return 'image/gif'
  return null
}
function toBase64(bytes: Uint8Array): string {
  let binary = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
  return btoa(binary)
}
const numOrNull = (v: unknown) => (v == null || v === '' ? null : Number(v) || 0)

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405)

  try {
    const { file_path, text, vendor_name, invoice_date } = await req.json().catch(() => ({}))

    const admin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )
    const jwt = (req.headers.get('Authorization') || '').replace('Bearer ', '')
    const { data: userData } = await admin.auth.getUser(jwt)
    if (!userData?.user) return json({ error: 'Not signed in.' }, 401)

    const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
    if (!apiKey) return json({ error: 'AI is not configured (ANTHROPIC_API_KEY missing).' }, 500)

    const content: Array<Record<string, unknown>> = []
    if (file_path) {
      const media = mediaTypeFor(String(file_path))
      if (!media) return json({ error: 'Unsupported file type. Upload a PDF or image, or send text.' }, 400)
      const { data: blob, error: dlErr } = await admin.storage.from('vendor-invoices').download(String(file_path))
      if (dlErr || !blob) return json({ error: `Could not read the uploaded file: ${dlErr?.message || 'not found'}` }, 400)
      const b64 = toBase64(new Uint8Array(await blob.arrayBuffer()))
      if (media === 'application/pdf') content.push({ type: 'document', source: { type: 'base64', media_type: media, data: b64 } })
      else content.push({ type: 'image', source: { type: 'base64', media_type: media, data: b64 } })
    } else if (text && String(text).trim()) {
      content.push({ type: 'text', text: `=== INVOICE (text) ===\n${String(text).slice(0, MAX_TEXT)}` })
    } else {
      return json({ error: 'Provide a file_path or text to extract.' }, 400)
    }
    const hints: string[] = []
    if (vendor_name) hints.push(`Vendor hint: ${vendor_name}`)
    if (invoice_date) hints.push(`Invoice date hint: ${invoice_date}`)
    hints.push('Extract the invoice now by calling the extract_invoice tool.')
    content.push({ type: 'text', text: hints.join('\n') })

    const body = {
      model: MODEL,
      max_tokens: 8192,
      system: SYSTEM,
      tools: [TOOL],
      tool_choice: { type: 'tool', name: 'extract_invoice' },
      messages: [{ role: 'user', content }],
    }

    let data: any = null
    let lastErr = ''
    for (let attempt = 0; attempt <= 3; attempt++) {
      const res = await fetch(ANTHROPIC_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': ANTHROPIC_VERSION },
        body: JSON.stringify(body),
      })
      if (res.ok) { data = await res.json(); break }
      lastErr = `${res.status}: ${(await res.text()).slice(0, 300)}`
      const transient = res.status === 529 || res.status === 429 || res.status >= 500
      if (!transient || attempt === 3) return json({ error: `AI error ${lastErr}` }, 502)
      await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt)))
    }

    const toolBlock = (data?.content || []).find(
      (b: any) => b?.type === 'tool_use' && b?.name === 'extract_invoice'
    )
    const out = toolBlock?.input
    if (!out || !Array.isArray(out.rows))
      return json({ error: 'The AI did not return usable invoice lines. Try a clearer scan or send the text.' }, 502)

    const rows = out.rows
      .filter((r: any) => r && r.description)
      .map((r: any) => {
        const qty = numOrNull(r.qty)
        const unit_price = numOrNull(r.unit_price)
        let amount = numOrNull(r.amount)
        if (amount == null && qty != null && unit_price != null) amount = qty * unit_price
        return {
          description: String(r.description).trim().slice(0, 300),
          qty,
          unit: String(r.unit || 'each').trim().slice(0, 40),
          unit_price,
          amount,
          sku: r.sku ? String(r.sku).trim().slice(0, 80) : null,
        }
      })

    return json({
      vendor_name: out.vendor_name ? String(out.vendor_name).slice(0, 120) : (vendor_name || null),
      invoice_no: out.invoice_no ? String(out.invoice_no).slice(0, 80) : null,
      invoice_date: out.invoice_date ? String(out.invoice_date).slice(0, 10) : (invoice_date || null),
      subtotal: numOrNull(out.subtotal),
      total: numOrNull(out.total),
      rows,
    })
  } catch (e) {
    return json({ error: String((e as Error)?.message || e) }, 500)
  }
})
