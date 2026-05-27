// supabase/functions/qbwc/index.ts
//
// QuickBooks Web Connector (QBWC) SOAP web service.
//
// Scope right now: a READ-ONLY pull of payroll hours (QuickBooks Time
// Tracking entries) into an isolated staging table, qb_time_tracking.
//
//   * Nothing is written back to QuickBooks.
//   * Nothing is mapped into the app's clients / acct_* tables.
//   * Because it only issues *Query* requests, it cannot create sync or
//     duplication conflicts with the live BuilderTrend <-> QuickBooks
//     connection — a read can't change anything QuickBooks or BuilderTrend
//     can see. Mapping into PBS happens later, at the BuilderTrend cutover.
//
// QBWC session lifecycle (one HTTP POST per SOAP call):
//   serverVersion / clientVersion  -> version negotiation
//   authenticate                   -> check qb_connection creds, open a
//                                      qb_session, queue the work items
//   sendRequestXML                 -> hand QBWC the next qbXML query to run
//   receiveResponseXML             -> parse QuickBooks' qbXML answer, upsert
//                                      rows, report progress %
//   connectionError / getLastError -> error reporting
//   closeConnection                -> session over
//
// Deploy WITHOUT JWT verification — QBWC sends no Supabase auth header:
//   supabase functions deploy qbwc --no-verify-jwt

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { XMLParser } from 'https://esm.sh/fast-xml-parser@4.4.1'

const QB_NS = 'http://developer.intuit.com/'
const SERVER_VERSION = 'Landscape Job Tracker QBWC service 1.4 (job-cost + chart of accounts)'

// The work queue for a session.
//   * TimeTracking pulls payroll hours into qb_time_tracking (unchanged).
//   * Bill / Check / CreditCardCharge / ItemReceipt pull job-tagged AP
//     transactions into the acct_* tables. Each one paginates via QB's
//     iterator (continuation work items get appended dynamically inside
//     receiveResponseXML when iteratorRemainingCount > 0).
const SYNC_ENTITIES = ['TimeTracking', 'Account', 'Bill', 'Check', 'CreditCardCharge', 'ItemReceipt']
// How many rows to ask QuickBooks for per page on the AP queries. Lower =
// safer for QBWC's response buffer; higher = fewer round-trips. 500 is the
// QBWC sweet spot per Intuit's own QBSDK samples.
const MAX_RETURNED = 500

// ── Supabase ────────────────────────────────────────────────────────────────
// Service-role client — the qb_* tables have RLS and QBWC carries no JWT.
function admin() {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )
}

// ── XML helpers ─────────────────────────────────────────────────────────────
function xmlEscape(s: unknown): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}
function xmlUnescape(s: string): string {
  return String(s ?? '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_m, d) => String.fromCharCode(Number(d)))
    .replace(/&amp;/g, '&')
}

// Pull the text content of the first <name>…</name> from a SOAP body.
function param(body: string, name: string): string {
  const re = new RegExp(
    `<(?:[\\w.-]+:)?${name}\\b[^>]*?>([\\s\\S]*?)</(?:[\\w.-]+:)?${name}>`,
    'i',
  )
  const m = body.match(re)
  return m ? xmlUnescape(m[1].trim()) : ''
}

// QBWC calls exactly one of these per HTTP request. Detect which by its tag.
const SOAP_METHODS = [
  'serverVersion', 'clientVersion', 'authenticate', 'sendRequestXML',
  'receiveResponseXML', 'connectionError', 'getLastError', 'closeConnection',
  'getInteractiveURL', 'interactiveDone', 'interactiveRejected',
]
function detectMethod(body: string): string | null {
  for (const m of SOAP_METHODS) {
    if (new RegExp(`<(?:[\\w.-]+:)?${m}\\b`).test(body)) return m
  }
  return null
}

// Build <{method}Response><{method}Result>…</…></…> in the QB namespace.
function methodResponse(method: string, innerXml: string): string {
  return `<${method}Response xmlns="${QB_NS}">${innerXml}</${method}Response>`
}
function stringArray(items: string[]): string {
  return items.map((i) => `<string>${xmlEscape(i)}</string>`).join('')
}
function soapEnvelope(inner: string): string {
  return '<?xml version="1.0" encoding="utf-8"?>' +
    '<soap:Envelope ' +
      'xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" ' +
      'xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" ' +
      'xmlns:xsd="http://www.w3.org/2001/XMLSchema">' +
    `<soap:Body>${inner}</soap:Body></soap:Envelope>`
}
function soapFault(message: string): string {
  return soapEnvelope(
    '<soap:Fault><faultcode>soap:Server</faultcode>' +
    `<faultstring>${xmlEscape(message)}</faultstring></soap:Fault>`,
  )
}

const XML_HEADERS = { 'Content-Type': 'text/xml; charset=utf-8' }
const nowIso = () => new Date().toISOString()

// ── Audit log ───────────────────────────────────────────────────────────────
async function logCall(
  sb: ReturnType<typeof admin>,
  ticket: string | null,
  method: string,
  status: 'ok' | 'error',
  message: string,
  entity: string | null = null,
  direction: string | null = null,
) {
  try {
    await sb.from('qb_sync_log').insert({
      ticket: ticket || null,
      soap_method: method,
      status,
      message,
      entity,
      direction,
    })
  } catch (_) {
    // Logging must never break the SOAP exchange.
  }
}

// ── qbXML request builders ──────────────────────────────────────────────────
function qbxmlRequest(version: string, inner: string): string {
  return '<?xml version="1.0" encoding="utf-8"?>\n' +
    `<?qbxml version="${version}"?>\n` +
    `<QBXML><QBXMLMsgsRq onError="continueOnError">${inner}</QBXMLMsgsRq></QBXML>`
}

type WorkItem = {
  entity: string
  fromDate?: string | null
  // QB iterator state. Unset on the first request; populated when a
  // continuation work item is queued from receiveResponseXML.
  iteratorId?: string | null
  // Incremental-sync watermark. When set on the first request of an
  // entity (not on continuations — iterators carry the filter forward
  // on QB's side), we include a ModifiedDateRangeFilter so QB only
  // returns records modified on or after this timestamp.
  fromModifiedDate?: string | null
}

// QB qbXML DATETIMETYPE accepts YYYY-MM-DDTHH:MM:SS, optionally with a
// timezone offset. Postgres TIMESTAMPTZ values come back from Supabase as
// ISO strings with microseconds, e.g. "2025-08-20T14:23:45.123456+00:00",
// which QB's parser rejects with hresult 0x80040400 (XML parse error).
//
// We're paranoid here: re-emit the date explicitly via JS Date math so
// regardless of what input format Supabase gives us, the output is
// guaranteed-valid. We DROP the timezone — QB then treats the value as
// QuickBooks-local time. We also subtract a 24h safety buffer so a
// UTC-vs-local mismatch can't miss boundary records. The cost is
// re-pulling up to 24h of overlap on each sync, which is cheap (upserts
// are idempotent on qb_txn_id / qb_line_id).
function toQbDateTime(iso: string | null | undefined): string | null {
  if (!iso) return null
  const s = String(iso).trim()
  if (!s) return null
  const t = new Date(s).getTime()
  if (!Number.isFinite(t)) return null
  const d = new Date(t - 24 * 60 * 60 * 1000) // 24h safety buffer
  const pad = (n: number) => String(n).padStart(2, '0')
  return (
    `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}` +
    `T${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`
  )
}

// Bill / Check / CCCharge / ItemReceipt all use the same iterator + MaxReturned
// + IncludeLineItems shape. Centralise it so the four branches stay short.
function apQueryAttrs(item: WorkItem): {
  attrs: string
  modFilter: string
  max: string
  lines: string
} {
  const attrs = item.iteratorId
    ? `iterator="Continue" iteratorID="${xmlEscape(item.iteratorId)}"`
    : `iterator="Start"`
  // ModifiedDateRangeFilter is only valid on the first request of an
  // iterator; once iterator="Continue", the filter is locked on QB's
  // side and we mustn't re-send it.
  const qbFromMod = !item.iteratorId ? toQbDateTime(item.fromModifiedDate) : null
  const modFilter = qbFromMod
    ? `<ModifiedDateRangeFilter><FromModifiedDate>${xmlEscape(qbFromMod)}</FromModifiedDate></ModifiedDateRangeFilter>`
    : ''
  return {
    attrs,
    modFilter,
    max: `<MaxReturned>${MAX_RETURNED}</MaxReturned>`,
    lines: `<IncludeLineItems>true</IncludeLineItems>`,
  }
}

function buildEntityRequest(item: WorkItem, version: string): string {
  if (item?.entity === 'TimeTracking') {
    const filter = item.fromDate
      ? `<TxnDateRangeFilter><FromTxnDate>${xmlEscape(item.fromDate)}</FromTxnDate></TxnDateRangeFilter>`
      : ''
    return qbxmlRequest(version, `<TimeTrackingQueryRq>${filter}</TimeTrackingQueryRq>`)
  }

  // List queries like AccountQueryRq don't use the transaction-iterator
  // pattern — charts of accounts are small enough that a single full
  // pull is fine. ActiveStatus="All" includes inactive accounts so the
  // PBS chart shows the same scope as QB.
  if (item?.entity === 'Account') {
    return qbxmlRequest(version, `<AccountQueryRq><ActiveStatus>All</ActiveStatus></AccountQueryRq>`)
  }

  const { attrs, modFilter, max, lines } = apQueryAttrs(item)

  // qbXML schema element order is strict AND varies by entity. Sending the
  // wrong order produces hresult 0x80040400 ("error parsing XML stream").
  // Verified empirically against QuickBooks Desktop 17:
  //   - BillQueryRq / CheckQueryRq / CreditCardChargeQueryRq:
  //       MaxReturned → Filter → IncludeLineItems
  //   - ItemReceiptQueryRq (the oddball):
  //       Filter → MaxReturned → IncludeLineItems
  if (item?.entity === 'Bill') {
    return qbxmlRequest(version,
      `<BillQueryRq ${attrs}>${max}${modFilter}${lines}</BillQueryRq>`)
  }
  if (item?.entity === 'Check') {
    return qbxmlRequest(version,
      `<CheckQueryRq ${attrs}>${max}${modFilter}${lines}</CheckQueryRq>`)
  }
  if (item?.entity === 'CreditCardCharge') {
    return qbxmlRequest(version,
      `<CreditCardChargeQueryRq ${attrs}>${max}${modFilter}${lines}</CreditCardChargeQueryRq>`)
  }
  if (item?.entity === 'ItemReceipt') {
    return qbxmlRequest(version,
      `<ItemReceiptQueryRq ${attrs}>${modFilter}${max}${lines}</ItemReceiptQueryRq>`)
  }

  return ''
}

// ── qbXML response parsing ──────────────────────────────────────────────────
const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  parseTagValue: false,   // keep every value a string; we coerce ourselves
  trimValues: true,
})

function ensureArray<T>(x: T | T[] | undefined | null): T[] {
  return x == null ? [] : Array.isArray(x) ? x : [x]
}
function num(x: unknown): number | null {
  if (x == null || x === '') return null
  const n = Number(x)
  return Number.isFinite(n) ? n : null
}
function bool(x: unknown): boolean | null {
  if (x == null) return null
  return x === 'true' || x === true
}

// QuickBooks time-tracking Duration arrives either as an ISO-8601 duration
// (PT8H30M), an H:MM[:SS] string, or a plain decimal. Normalise to hours.
function parseDuration(raw: unknown): number | null {
  if (raw == null) return null
  const s = String(raw).trim()
  if (!s) return null
  const iso = s.match(/^(-)?P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/)
  if (iso) {
    const sign = iso[1] ? -1 : 1
    const d = Number(iso[2] || 0), h = Number(iso[3] || 0)
    const m = Number(iso[4] || 0), sec = Number(iso[5] || 0)
    return Math.round(sign * (d * 24 + h + m / 60 + sec / 3600) * 10000) / 10000
  }
  if (s.includes(':')) {
    const neg = s.startsWith('-')
    const parts = s.replace(/^-/, '').split(':').map(Number)
    if (parts.some((n) => !Number.isFinite(n))) return null
    const [h = 0, m = 0, sec = 0] = parts
    const v = h + m / 60 + sec / 3600
    return Math.round((neg ? -v : v) * 10000) / 10000
  }
  const n = Number(s)
  return Number.isFinite(n) ? n : null
}

// Parse a TimeTrackingQueryRs into staging-table rows.
function parseTimeTracking(qbxml: string): { rows: Record<string, unknown>[]; status: string } {
  const doc = xmlParser.parse(qbxml || '')
  const rs = doc?.QBXML?.QBXMLMsgsRs?.TimeTrackingQueryRs
  const rets = ensureArray(rs?.TimeTrackingRet)
  const rows = rets
    .filter((t: any) => t && t.TxnID)
    .map((t: any) => ({
      txn_id:               t.TxnID,
      txn_date:             t.TxnDate ?? null,
      txn_number:           num(t.TxnNumber),
      entity_list_id:       t.EntityRef?.ListID ?? null,
      entity_name:          t.EntityRef?.FullName ?? null,
      customer_list_id:     t.CustomerRef?.ListID ?? null,
      customer_name:        t.CustomerRef?.FullName ?? null,
      service_item_list_id: t.ItemServiceRef?.ListID ?? null,
      service_item_name:    t.ItemServiceRef?.FullName ?? null,
      payroll_item_list_id: t.PayrollItemWageRef?.ListID ?? null,
      payroll_item_name:    t.PayrollItemWageRef?.FullName ?? null,
      class_list_id:        t.ClassRef?.ListID ?? null,
      class_name:           t.ClassRef?.FullName ?? null,
      duration_hours:       parseDuration(t.Duration),
      duration_raw:         t.Duration != null ? String(t.Duration) : null,
      billable_status:      t.BillableStatus ?? null,
      notes:                t.Notes ?? null,
      edit_sequence:        t.EditSequence ?? null,
      qb_time_created:      t.TimeCreated ?? null,
      qb_time_modified:     t.TimeModified ?? null,
      synced_at:            nowIso(),
    }))
  const status = rs
    ? `statusCode ${rs['@_statusCode']} — ${rs['@_statusMessage']}`
    : 'no TimeTrackingQueryRs element in response'
  return { rows, status }
}

// ── AP transaction parsers ──────────────────────────────────────────────────
// Bill / Check / CreditCardCharge / ItemReceipt all return a list of header
// rets with nested ItemLineRet / ExpenseLineRet arrays. The parsers below
// flatten that into { headers, lines } plus the iterator metadata so the
// caller can queue a continuation work item when there's more to fetch.

type ApParseResult = {
  headers: Record<string, unknown>[]
  lines:   Record<string, unknown>[]
  iteratorRemaining: number
  iteratorId: string | null
  status: string
  // Highest TimeModified seen in this batch's headers; advance_qb_watermark
  // uses this to bump qb_sync_state.last_synced_at so subsequent pulls only
  // request records modified after it.
  maxTimeModified: string | null
}

// Extract iterator state from a *QueryRs attribute bag. QB returns
// iteratorRemainingCount="N" and iteratorID="uuid" as attributes on the Rs.
function readIteratorState(rs: any): { remaining: number; id: string | null } {
  const remaining = Number(rs?.['@_iteratorRemainingCount'] ?? 0) || 0
  const id = rs?.['@_iteratorID'] ?? null
  return { remaining, id }
}

// QB TimeModified strings are ISO 8601 ("2026-05-26T18:14:35-04:00"), so
// lexicographic string comparison on same-offset values gives the right
// ordering for "newest". We coerce to TIMESTAMPTZ on the postgres side
// anyway via advance_qb_watermark, which handles tz normalization.
function maxIsoString(a: string | null, b: string | null | undefined): string | null {
  if (!b) return a
  if (!a) return String(b)
  return b > a ? String(b) : a
}

// Lines come in two flavours: ItemLineRet (with ItemRef + Quantity + Cost +
// Amount) and ExpenseLineRet (with AccountRef + Amount only). Both can carry
// a CustomerRef — that's what tells us this line is a job cost.
function flattenLines(header: any, txnIdField: string): Record<string, unknown>[] {
  const out: Record<string, unknown>[] = []
  const headerId = header?.TxnID
  if (!headerId) return out

  for (const il of ensureArray(header.ItemLineRet)) {
    out.push({
      [txnIdField]:           headerId,    // resolved to a FK by the caller
      qb_line_id:             il.TxnLineID ?? null,
      line_type:              'item',
      qb_customer_full_name:  il.CustomerRef?.FullName ?? null,
      item_name:              il.ItemRef?.FullName ?? null,
      qb_account_name:        null,
      description:            il.Desc ?? null,
      quantity:               num(il.Quantity),
      unit_price:             num(il.Cost),
      amount:                 num(il.Amount),
      billable_status:        il.BillableStatus ?? null,
      class_name:             il.ClassRef?.FullName ?? null,
    })
  }
  for (const el of ensureArray(header.ExpenseLineRet)) {
    out.push({
      [txnIdField]:           headerId,
      qb_line_id:             el.TxnLineID ?? null,
      line_type:              'expense',
      qb_customer_full_name:  el.CustomerRef?.FullName ?? null,
      item_name:              null,
      qb_account_name:        el.AccountRef?.FullName ?? null,
      description:            el.Memo ?? null,
      quantity:               null,
      unit_price:             null,
      amount:                 num(el.Amount),
      billable_status:        el.BillableStatus ?? null,
      class_name:             el.ClassRef?.FullName ?? null,
    })
  }
  return out
}

function parseBills(qbxml: string): ApParseResult {
  const doc = xmlParser.parse(qbxml || '')
  const rs = doc?.QBXML?.QBXMLMsgsRs?.BillQueryRs
  const rets = ensureArray(rs?.BillRet)
  const headers: Record<string, unknown>[] = []
  const lines:   Record<string, unknown>[] = []
  let maxTM: string | null = null
  for (const b of rets) {
    if (!b?.TxnID) continue
    maxTM = maxIsoString(maxTM, b.TimeModified)
    headers.push({
      qb_txn_id:        b.TxnID,
      number:           b.RefNumber ?? null,
      vendor_name:      b.VendorRef?.FullName ?? null,
      date:             b.TxnDate ?? null,
      due_date:         b.DueDate ?? null,
      total:            num(b.AmountDue) ?? 0,
      // acct_bills uses `notes` (pre-existed); the three new transaction
      // tables we added use `memo`. Map QB's <Memo> into whichever the
      // target table actually has.
      notes:            b.Memo ?? null,
      source:           'qb',
      qb_edit_sequence: b.EditSequence ?? null,
      qb_time_created:  b.TimeCreated ?? null,
      qb_time_modified: b.TimeModified ?? null,
      qb_synced_at:     nowIso(),
    })
    for (const l of flattenLines(b, '__header_qb_txn_id')) lines.push(l)
  }
  const { remaining, id } = readIteratorState(rs)
  const status = rs
    ? `statusCode ${rs['@_statusCode']} — ${rs['@_statusMessage']}`
    : 'no BillQueryRs element in response'
  return { headers, lines, iteratorRemaining: remaining, iteratorId: id, status, maxTimeModified: maxTM }
}

function parseChecks(qbxml: string): ApParseResult {
  const doc = xmlParser.parse(qbxml || '')
  const rs = doc?.QBXML?.QBXMLMsgsRs?.CheckQueryRs
  const rets = ensureArray(rs?.CheckRet)
  const headers: Record<string, unknown>[] = []
  const lines:   Record<string, unknown>[] = []
  let maxTM: string | null = null
  for (const c of rets) {
    if (!c?.TxnID) continue
    maxTM = maxIsoString(maxTM, c.TimeModified)
    // QB returns one of PayeeEntityRef (Vendor/Customer/Other) — we keep
    // the type label so the UI can show "(Employee)" etc. when relevant.
    const payeeRef = c.PayeeEntityRef
    headers.push({
      qb_txn_id:         c.TxnID,
      ref_number:        c.RefNumber ?? null,
      payee_type:        payeeRef?.['@_type'] ?? null,
      payee_name:        payeeRef?.FullName ?? null,
      bank_account_name: c.AccountRef?.FullName ?? null,
      date:              c.TxnDate ?? null,
      total:             num(c.Amount) ?? 0,
      memo:              c.Memo ?? null,
      is_to_be_printed:  bool(c.IsToBePrinted),
      source:            'qb',
      qb_edit_sequence:  c.EditSequence ?? null,
      qb_time_created:   c.TimeCreated ?? null,
      qb_time_modified:  c.TimeModified ?? null,
      qb_synced_at:      nowIso(),
    })
    for (const l of flattenLines(c, '__header_qb_txn_id')) lines.push(l)
  }
  const { remaining, id } = readIteratorState(rs)
  const status = rs
    ? `statusCode ${rs['@_statusCode']} — ${rs['@_statusMessage']}`
    : 'no CheckQueryRs element in response'
  return { headers, lines, iteratorRemaining: remaining, iteratorId: id, status, maxTimeModified: maxTM }
}

function parseCreditCardCharges(qbxml: string): ApParseResult {
  const doc = xmlParser.parse(qbxml || '')
  const rs = doc?.QBXML?.QBXMLMsgsRs?.CreditCardChargeQueryRs
  const rets = ensureArray(rs?.CreditCardChargeRet)
  const headers: Record<string, unknown>[] = []
  const lines:   Record<string, unknown>[] = []
  let maxTM: string | null = null
  for (const cc of rets) {
    if (!cc?.TxnID) continue
    maxTM = maxIsoString(maxTM, cc.TimeModified)
    const payeeRef = cc.PayeeEntityRef
    headers.push({
      qb_txn_id:                cc.TxnID,
      ref_number:               cc.RefNumber ?? null,
      payee_type:               payeeRef?.['@_type'] ?? null,
      payee_name:               payeeRef?.FullName ?? null,
      credit_card_account_name: cc.AccountRef?.FullName ?? null,
      date:                     cc.TxnDate ?? null,
      total:                    num(cc.Amount) ?? 0,
      memo:                     cc.Memo ?? null,
      source:                   'qb',
      qb_edit_sequence:         cc.EditSequence ?? null,
      qb_time_created:          cc.TimeCreated ?? null,
      qb_time_modified:         cc.TimeModified ?? null,
      qb_synced_at:             nowIso(),
    })
    for (const l of flattenLines(cc, '__header_qb_txn_id')) lines.push(l)
  }
  const { remaining, id } = readIteratorState(rs)
  const status = rs
    ? `statusCode ${rs['@_statusCode']} — ${rs['@_statusMessage']}`
    : 'no CreditCardChargeQueryRs element in response'
  return { headers, lines, iteratorRemaining: remaining, iteratorId: id, status, maxTimeModified: maxTM }
}

function parseItemReceipts(qbxml: string): ApParseResult {
  const doc = xmlParser.parse(qbxml || '')
  const rs = doc?.QBXML?.QBXMLMsgsRs?.ItemReceiptQueryRs
  const rets = ensureArray(rs?.ItemReceiptRet)
  const headers: Record<string, unknown>[] = []
  const lines:   Record<string, unknown>[] = []
  let maxTM: string | null = null
  for (const r of rets) {
    if (!r?.TxnID) continue
    maxTM = maxIsoString(maxTM, r.TimeModified)
    headers.push({
      qb_txn_id:        r.TxnID,
      ref_number:       r.RefNumber ?? null,
      vendor_name:      r.VendorRef?.FullName ?? null,
      date:             r.TxnDate ?? null,
      total:            num(r.TotalAmount) ?? 0,
      memo:             r.Memo ?? null,
      source:           'qb',
      qb_edit_sequence: r.EditSequence ?? null,
      qb_time_created:  r.TimeCreated ?? null,
      qb_time_modified: r.TimeModified ?? null,
      qb_synced_at:     nowIso(),
    })
    for (const l of flattenLines(r, '__header_qb_txn_id')) lines.push(l)
  }
  const { remaining, id } = readIteratorState(rs)
  const status = rs
    ? `statusCode ${rs['@_statusCode']} — ${rs['@_statusMessage']}`
    : 'no ItemReceiptQueryRs element in response'
  return { headers, lines, iteratorRemaining: remaining, iteratorId: id, status, maxTimeModified: maxTM }
}

// ── Chart of Accounts ───────────────────────────────────────────────────
// Maps the QB AccountType string (as it comes back in qbXML, e.g. "Bank",
// "FixedAsset", "OtherCurrentLiability") to the PBS high-level type the
// acct_accounts table CHECK constraint accepts. We also keep the raw QB
// type in `qb_account_type` and store its display-friendly form in
// `subtype` so reports can pivot either way.
const QB_ACCOUNT_TYPE_MAP: Record<string, { type: string; subtype: string }> = {
  Bank:                  { type: 'asset',     subtype: 'Bank' },
  AccountsReceivable:    { type: 'asset',     subtype: 'Accounts Receivable' },
  OtherCurrentAsset:     { type: 'asset',     subtype: 'Other Current Asset' },
  FixedAsset:            { type: 'asset',     subtype: 'Fixed Asset' },
  OtherAsset:            { type: 'asset',     subtype: 'Other Asset' },
  AccountsPayable:       { type: 'liability', subtype: 'Accounts Payable' },
  CreditCard:            { type: 'liability', subtype: 'Credit Card' },
  OtherCurrentLiability: { type: 'liability', subtype: 'Other Current Liability' },
  LongTermLiability:     { type: 'liability', subtype: 'Long-Term Liability' },
  Equity:                { type: 'equity',    subtype: 'Equity' },
  Income:                { type: 'income',    subtype: 'Income' },
  OtherIncome:           { type: 'income',    subtype: 'Other Income' },
  CostOfGoodsSold:       { type: 'cogs',      subtype: 'Cost of Goods Sold' },
  Expense:               { type: 'expense',   subtype: 'Expense' },
  OtherExpense:          { type: 'expense',   subtype: 'Other Expense' },
  NonPosting:            { type: 'expense',   subtype: 'Non-Posting' },
}

function mapQbAccountType(qbType: string | null | undefined): { type: string; subtype: string } {
  const t = String(qbType || '').trim()
  return QB_ACCOUNT_TYPE_MAP[t] || { type: 'expense', subtype: t || 'Unknown' }
}

function parseAccounts(qbxml: string): { rows: Record<string, unknown>[]; status: string } {
  const doc = xmlParser.parse(qbxml || '')
  const rs = doc?.QBXML?.QBXMLMsgsRs?.AccountQueryRs
  const rets = ensureArray(rs?.AccountRet)
  const rows = rets
    .filter((a: any) => a && a.ListID)
    .map((a: any) => {
      const mapped = mapQbAccountType(a.AccountType)
      return {
        qb_list_id:        a.ListID,
        qb_full_name:      a.FullName ?? null,
        qb_account_type:   a.AccountType ?? null,
        qb_edit_sequence:  a.EditSequence ?? null,
        qb_time_modified:  a.TimeModified ?? null,
        qb_synced_at:      nowIso(),
        parent_qb_list_id: a.ParentRef?.ListID ?? null,
        source:            'qb',
        // Mapped values
        name:              a.FullName ?? a.Name ?? '(unnamed)',
        number:            a.AccountNumber ?? null,
        type:              mapped.type,
        subtype:           mapped.subtype,
        description:       a.Desc ?? null,
        is_active:         bool(a.IsActive) ?? true,
      }
    })
  const status = rs
    ? `statusCode ${rs['@_statusCode']} — ${rs['@_statusMessage']}`
    : 'no AccountQueryRs element in response'
  return { rows, status }
}

// Upsert headers, then resolve each line's __header_qb_txn_id placeholder to
// the actual header UUID, then upsert lines. Returns the row counts so the
// caller can write a tidy status message into qb_sync_log.
async function upsertApBundle(
  sb: ReturnType<typeof admin>,
  headerTable: string,
  lineTable: string,
  lineFkColumn: string,        // e.g. 'bill_id', 'check_id', 'charge_id', 'receipt_id'
  headers: Record<string, unknown>[],
  lines:   Record<string, unknown>[],
): Promise<{ headerCount: number; lineCount: number }> {
  if (headers.length === 0) return { headerCount: 0, lineCount: 0 }

  // De-dupe headers on qb_txn_id (same TxnID can appear twice if QB returns
  // overlapping pages on iterator continue — rare but defensive).
  const seenH = new Map<unknown, Record<string, unknown>>()
  for (const h of headers) seenH.set(h.qb_txn_id, h)
  const dedupedHeaders = [...seenH.values()]

  // Upsert and capture id ↔ qb_txn_id so we can wire lines to their FK.
  const { data: returned, error: hErr } = await sb
    .from(headerTable)
    .upsert(dedupedHeaders, { onConflict: 'qb_txn_id' })
    .select('id, qb_txn_id')
  if (hErr) throw new Error(`${headerTable} upsert failed: ${hErr.message}`)

  const idMap = new Map<string, string>()
  for (const r of returned ?? []) idMap.set(String(r.qb_txn_id), String(r.id))

  // Resolve lines' header FK, drop the placeholder, drop orphans.
  const resolvedLines = lines
    .map((l) => {
      const headerId = idMap.get(String(l['__header_qb_txn_id']))
      if (!headerId) return null
      const { __header_qb_txn_id, ...rest } = l as any
      return { ...rest, [lineFkColumn]: headerId }
    })
    .filter((l): l is Record<string, unknown> => l != null)

  // De-dupe on qb_line_id within this batch.
  const seenL = new Map<unknown, Record<string, unknown>>()
  for (const l of resolvedLines) {
    if (l.qb_line_id != null) seenL.set(l.qb_line_id, l)
  }
  const dedupedLines = [...seenL.values()]

  let lineCount = 0
  for (let i = 0; i < dedupedLines.length; i += 500) {
    const chunk = dedupedLines.slice(i, i + 500)
    const { error } = await sb.from(lineTable).upsert(chunk, { onConflict: 'qb_line_id' })
    if (error) throw new Error(`${lineTable} upsert failed: ${error.message}`)
    lineCount += chunk.length
  }

  return { headerCount: dedupedHeaders.length, lineCount }
}

// Upsert rows in chunks, de-duplicated on the conflict key.
async function upsertChunked(
  sb: ReturnType<typeof admin>,
  table: string,
  rows: Record<string, unknown>[],
  conflictCol: string,
): Promise<number> {
  const seen = new Map<unknown, Record<string, unknown>>()
  for (const r of rows) {
    const k = r[conflictCol]
    if (k != null) seen.set(k, r)
  }
  const deduped = [...seen.values()]
  for (let i = 0; i < deduped.length; i += 500) {
    const chunk = deduped.slice(i, i + 500)
    const { error } = await sb.from(table).upsert(chunk, { onConflict: conflictCol })
    if (error) throw new Error(`${table} upsert failed: ${error.message}`)
  }
  return deduped.length
}

// ── SOAP method handlers ────────────────────────────────────────────────────
async function handle(method: string, body: string): Promise<string> {
  const sb = admin()

  switch (method) {
    // ── version negotiation ──────────────────────────────────────────────
    case 'serverVersion':
      return methodResponse(
        'serverVersion',
        `<serverVersionResult>${xmlEscape(SERVER_VERSION)}</serverVersionResult>`,
      )

    case 'clientVersion':
      // '' = accept any QBWC version.
      return methodResponse('clientVersion', '<clientVersionResult></clientVersionResult>')

    // ── open a session + queue the work ──────────────────────────────────
    case 'authenticate': {
      const user = param(body, 'strUserName')
      const pass = param(body, 'strPassword')

      const { data: conn } = await sb
        .from('qb_connection').select('*').eq('id', 1).maybeSingle()

      const ok = !!conn && conn.enabled === true &&
        conn.qbwc_username === user && conn.qbwc_password === pass

      if (!ok) {
        const why = !conn
          ? 'No qb_connection row is configured.'
          : conn.enabled === false
          ? 'The QuickBooks connection is disabled.'
          : 'Invalid QBWC username or password.'
        await logCall(sb, null, 'authenticate', 'error', why)
        return methodResponse(
          'authenticate',
          `<authenticateResult>${stringArray(['', 'nvu'])}</authenticateResult>`,
        )
      }

      // Load per-entity watermarks for incremental sync. AP entities use
      // qb_sync_state.last_synced_at as the FromModifiedDate so QB only
      // returns records modified since the last successful pull.
      // TimeTracking still uses TxnDateRangeFilter (payroll_from_date)
      // because we want a date-of-work cut-off, not a modified-since.
      const { data: syncStates } = await sb
        .from('qb_sync_state')
        .select('entity, last_synced_at')
      const watermarkByEntity = new Map<string, string | null>(
        (syncStates ?? []).map((s: any) => [s.entity, s.last_synced_at]),
      )
      const AP_ENTITIES = new Set(['Bill', 'Check', 'CreditCardCharge', 'ItemReceipt'])

      // Queue the work items. Snapshot per-entity filters onto each work
      // item so they're consistent for the life of the session.
      const work: WorkItem[] = SYNC_ENTITIES.map((entity) => ({
        entity,
        fromDate: entity === 'TimeTracking' ? (conn.payroll_from_date ?? null) : null,
        fromModifiedDate: AP_ENTITIES.has(entity)
          ? (watermarkByEntity.get(entity) ?? null)
          : null,
      }))

      const { data: sess, error: sErr } = await sb
        .from('qb_session')
        .insert({
          company_file: conn.company_file_path || null,
          work,
          total_steps: work.length,
        })
        .select('ticket').single()

      if (sErr || !sess) {
        await logCall(sb, null, 'authenticate', 'error',
          `Could not open a session: ${sErr?.message || 'unknown error'}`)
        return methodResponse(
          'authenticate',
          `<authenticateResult>${stringArray(['', 'nvu'])}</authenticateResult>`,
        )
      }

      await sb.from('qb_connection')
        .update({ last_connected_at: nowIso(), last_error: null, updated_at: nowIso() })
        .eq('id', 1)
      await logCall(sb, sess.ticket, 'authenticate', 'ok',
        `Session opened for QBWC user "${user}"; ${work.length} query queued.`)

      // [ticket, companyFile]. '' => use the company file currently open in QB.
      return methodResponse(
        'authenticate',
        `<authenticateResult>${stringArray([sess.ticket, conn.company_file_path || ''])}</authenticateResult>`,
      )
    }

    // ── hand QBWC the next qbXML query ───────────────────────────────────
    case 'sendRequestXML': {
      const ticket = param(body, 'ticket')
      const major  = param(body, 'qbXMLMajorVers')
      const minor  = param(body, 'qbXMLMinorVers')
      const version = major && minor ? `${major}.${minor}` : '13.0'

      const { data: sess } = await sb
        .from('qb_session').select('*').eq('ticket', ticket).maybeSingle()

      const work: WorkItem[] = Array.isArray(sess?.work) ? sess!.work : []
      const step = sess?.current_step ?? 0

      if (!sess || sess.status !== 'active' || step >= work.length) {
        return methodResponse('sendRequestXML', '<sendRequestXMLResult></sendRequestXMLResult>')
      }

      const item = work[step]
      const reqXml = buildEntityRequest(item, version)
      // Include the formatted FromModifiedDate in the log when present so
      // we can correlate any QB parse errors back to the exact filter we
      // sent. Include a tail of the actual XML for the first request of
      // each entity (iterator=Start) since that's the one that carries
      // ModifiedDateRangeFilter.
      const tag = item.fromModifiedDate
        ? ` from-modified ${toQbDateTime(item.fromModifiedDate)}`
        : item.fromDate
          ? ` from ${item.fromDate}`
          : ''
      const xmlTail = !item.iteratorId ? ` xml=${reqXml.replace(/\s+/g, ' ').slice(-220)}` : ''
      await logCall(sb, ticket || null, 'sendRequestXML', 'ok',
        `Requesting ${item.entity}${tag} ` +
        `(step ${step + 1} of ${work.length}, qbXML ${version}).${xmlTail}`,
        item.entity, 'pull')

      return methodResponse(
        'sendRequestXML',
        `<sendRequestXMLResult>${xmlEscape(reqXml)}</sendRequestXMLResult>`,
      )
    }

    // ── ingest QuickBooks' qbXML answer ──────────────────────────────────
    case 'receiveResponseXML': {
      const ticket   = param(body, 'ticket')
      const response = param(body, 'response')
      const hresult  = param(body, 'hresult')
      const qbMsg    = param(body, 'message')

      const { data: sess } = await sb
        .from('qb_session').select('*').eq('ticket', ticket).maybeSingle()
      const work: WorkItem[] = Array.isArray(sess?.work) ? sess!.work : []
      const total = sess?.total_steps ?? work.length ?? 1
      const step  = sess?.current_step ?? 0
      const item  = work[step]
      const entity = item?.entity ?? 'unknown'

      // Queue a continuation work item for the next sendRequestXML if QB
      // tells us iterator pagination is still in flight. Mutates `work`.
      // Continuations do NOT carry fromModifiedDate — QB's iterator has the
      // filter locked in on its side; resending would be invalid.
      async function queueContinuation(iteratorId: string | null, remaining: number) {
        if (!iteratorId || remaining <= 0) return
        const next: WorkItem = { entity, iteratorId }
        const newWork = [...work, next]
        await sb.from('qb_session')
          .update({ work: newWork, total_steps: newWork.length, updated_at: nowIso() })
          .eq('ticket', ticket)
      }

      // Bump qb_sync_state.last_synced_at for this entity to the highest
      // TimeModified in the just-processed batch. The RPC uses GREATEST so
      // a late or out-of-order batch can't regress the watermark.
      async function advanceWatermark(maxTimeModified: string | null) {
        if (!maxTimeModified) return
        const { error } = await sb.rpc('advance_qb_watermark', {
          p_entity:         entity,
          p_modified_at:    maxTimeModified,
          p_session_ticket: ticket || null,
        })
        if (error) {
          // Non-fatal — we just won't have an updated watermark; the data
          // is already upserted idempotently so the next pull at worst
          // re-fetches a few records.
          console.error(`advance_qb_watermark(${entity}) failed:`, error.message)
        }
      }

      try {
        if (hresult) throw new Error(`QuickBooks reported hresult ${hresult}: ${qbMsg}`)

        if (entity === 'TimeTracking') {
          const { rows, status } = parseTimeTracking(response)
          const count = await upsertChunked(sb, 'qb_time_tracking', rows, 'txn_id')
          await logCall(sb, ticket || null, 'receiveResponseXML', 'ok',
            `Pulled ${count} time-tracking entries (${status}).`, entity, 'pull')

        } else if (entity === 'Account') {
          const { rows, status } = parseAccounts(response)
          // Upsert chart of accounts via qb_list_id (idempotent). After
          // the upsert, run the parent resolver so hierarchy (Materials
          // → Pavers) is wired up without ordering the inserts by depth.
          const count = await upsertChunked(sb, 'acct_accounts', rows, 'qb_list_id')
          let resolved = 0
          try {
            const { data } = await sb.rpc('resolve_acct_account_parents')
            resolved = typeof data === 'number' ? data : Number(data) || 0
          } catch (e) {
            console.warn('resolve_acct_account_parents failed:', e instanceof Error ? e.message : e)
          }
          await logCall(sb, ticket || null, 'receiveResponseXML', 'ok',
            `Pulled ${count} accounts (${resolved} parent links resolved) (${status}).`,
            entity, 'pull')

        } else if (entity === 'Bill') {
          const { headers, lines, iteratorRemaining, iteratorId, status, maxTimeModified } = parseBills(response)
          const { headerCount, lineCount } = await upsertApBundle(
            sb, 'acct_bills', 'acct_bill_lines', 'bill_id', headers, lines)
          await advanceWatermark(maxTimeModified)
          await queueContinuation(iteratorId, iteratorRemaining)
          await logCall(sb, ticket || null, 'receiveResponseXML', 'ok',
            `Pulled ${headerCount} bills / ${lineCount} lines${iteratorRemaining ? ` (more: ${iteratorRemaining})` : ''} (${status}).`,
            entity, 'pull')

        } else if (entity === 'Check') {
          const { headers, lines, iteratorRemaining, iteratorId, status, maxTimeModified } = parseChecks(response)
          const { headerCount, lineCount } = await upsertApBundle(
            sb, 'acct_checks', 'acct_check_lines', 'check_id', headers, lines)
          await advanceWatermark(maxTimeModified)
          await queueContinuation(iteratorId, iteratorRemaining)
          await logCall(sb, ticket || null, 'receiveResponseXML', 'ok',
            `Pulled ${headerCount} checks / ${lineCount} lines${iteratorRemaining ? ` (more: ${iteratorRemaining})` : ''} (${status}).`,
            entity, 'pull')

        } else if (entity === 'CreditCardCharge') {
          const { headers, lines, iteratorRemaining, iteratorId, status, maxTimeModified } = parseCreditCardCharges(response)
          const { headerCount, lineCount } = await upsertApBundle(
            sb, 'acct_credit_card_charges', 'acct_credit_card_charge_lines', 'charge_id', headers, lines)
          await advanceWatermark(maxTimeModified)
          await queueContinuation(iteratorId, iteratorRemaining)
          await logCall(sb, ticket || null, 'receiveResponseXML', 'ok',
            `Pulled ${headerCount} CC charges / ${lineCount} lines${iteratorRemaining ? ` (more: ${iteratorRemaining})` : ''} (${status}).`,
            entity, 'pull')

        } else if (entity === 'ItemReceipt') {
          const { headers, lines, iteratorRemaining, iteratorId, status, maxTimeModified } = parseItemReceipts(response)
          const { headerCount, lineCount } = await upsertApBundle(
            sb, 'acct_item_receipts', 'acct_item_receipt_lines', 'receipt_id', headers, lines)
          await advanceWatermark(maxTimeModified)
          await queueContinuation(iteratorId, iteratorRemaining)
          await logCall(sb, ticket || null, 'receiveResponseXML', 'ok',
            `Pulled ${headerCount} item receipts / ${lineCount} lines${iteratorRemaining ? ` (more: ${iteratorRemaining})` : ''} (${status}).`,
            entity, 'pull')

        } else {
          await logCall(sb, ticket || null, 'receiveResponseXML', 'ok',
            `No handler for entity "${entity}"; skipped.`, entity, 'pull')
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        await logCall(sb, ticket || null, 'receiveResponseXML', 'error',
          `${entity} pull failed: ${msg}`, entity, 'pull')
        await sb.from('qb_session')
          .update({ last_error: `${entity}: ${msg}`, updated_at: nowIso() })
          .eq('ticket', ticket)
      }

      // Advance the cursor regardless, so one bad entity can't loop forever.
      const next = step + 1
      await sb.from('qb_session')
        .update({ current_step: next, updated_at: nowIso() })
        .eq('ticket', ticket)

      // Re-read total_steps — queueContinuation may have appended work items
      // since we snapshotted `total` at the top of this method. Without this,
      // mid-pull progress could be reported as 100% prematurely.
      const { data: latest } = await sb
        .from('qb_session').select('total_steps').eq('ticket', ticket).maybeSingle()
      const liveTotal = latest?.total_steps ?? total

      const pct = next >= liveTotal
        ? 100
        : Math.max(1, Math.min(99, Math.round((next / liveTotal) * 100)))
      return methodResponse(
        'receiveResponseXML',
        `<receiveResponseXMLResult>${pct}</receiveResponseXMLResult>`,
      )
    }

    // ── QBWC could not reach QuickBooks ──────────────────────────────────
    case 'connectionError': {
      const ticket  = param(body, 'ticket')
      const hresult = param(body, 'hresult')
      const message = param(body, 'message')
      const detail  = `${hresult} ${message}`.trim() || 'Unknown connection error.'
      await sb.from('qb_session')
        .update({ status: 'error', last_error: detail, updated_at: nowIso() })
        .eq('ticket', ticket)
      await sb.from('qb_connection')
        .update({ last_error: detail, updated_at: nowIso() }).eq('id', 1)
      await logCall(sb, ticket || null, 'connectionError', 'error', detail)
      return methodResponse('connectionError', '<connectionErrorResult>done</connectionErrorResult>')
    }

    // ── QBWC asks for the last error message to display ──────────────────
    case 'getLastError': {
      const ticket = param(body, 'ticket')
      const { data: sess } = await sb
        .from('qb_session').select('last_error').eq('ticket', ticket).maybeSingle()
      const msg = sess?.last_error || 'No work to do.'
      return methodResponse(
        'getLastError',
        `<getLastErrorResult>${xmlEscape(msg)}</getLastErrorResult>`,
      )
    }

    // ── close the session ────────────────────────────────────────────────
    case 'closeConnection': {
      const ticket = param(body, 'ticket')
      await sb.from('qb_session')
        .update({ status: 'done', updated_at: nowIso() })
        .eq('ticket', ticket).eq('status', 'active')
      await logCall(sb, ticket || null, 'closeConnection', 'ok', 'Session closed.')
      return methodResponse(
        'closeConnection',
        '<closeConnectionResult>OK - sync complete.</closeConnectionResult>',
      )
    }

    // ── interactive mode — unused, answered defensively ──────────────────
    case 'getInteractiveURL':
      return methodResponse('getInteractiveURL', '<getInteractiveURLResult></getInteractiveURLResult>')
    case 'interactiveDone':
      return methodResponse('interactiveDone', '<interactiveDoneResult>Done</interactiveDoneResult>')
    case 'interactiveRejected':
      return methodResponse('interactiveRejected', '<interactiveRejectedResult>Done</interactiveRejectedResult>')

    default:
      throw new Error(`Unknown SOAP method: ${method}`)
  }
}

// ── WSDL ────────────────────────────────────────────────────────────────────
// QBWC does not fetch this — it is contract-driven — but serving a correct
// WSDL makes the endpoint testable with SoapUI / Postman and self-documenting.
const WSDL_OPS = [
  'serverVersion', 'clientVersion', 'authenticate', 'sendRequestXML',
  'receiveResponseXML', 'connectionError', 'getLastError', 'closeConnection',
]
function buildWsdl(serviceUrl: string): string {
  const messages = WSDL_OPS.map((op) =>
    `<wsdl:message name="${op}SoapIn"><wsdl:part name="parameters" element="tns:${op}"/></wsdl:message>` +
    `<wsdl:message name="${op}SoapOut"><wsdl:part name="parameters" element="tns:${op}Response"/></wsdl:message>`,
  ).join('')
  const portOps = WSDL_OPS.map((op) =>
    `<wsdl:operation name="${op}"><wsdl:input message="tns:${op}SoapIn"/>` +
    `<wsdl:output message="tns:${op}SoapOut"/></wsdl:operation>`,
  ).join('')
  const bindingOps = WSDL_OPS.map((op) =>
    `<wsdl:operation name="${op}">` +
    `<soap:operation soapAction="${QB_NS}${op}" style="document"/>` +
    '<wsdl:input><soap:body use="literal"/></wsdl:input>' +
    '<wsdl:output><soap:body use="literal"/></wsdl:output></wsdl:operation>',
  ).join('')

  return `<?xml version="1.0" encoding="utf-8"?>
<wsdl:definitions xmlns:soap="http://schemas.xmlsoap.org/wsdl/soap/" xmlns:tns="${QB_NS}" xmlns:s="http://www.w3.org/2001/XMLSchema" xmlns:wsdl="http://schemas.xmlsoap.org/wsdl/" targetNamespace="${QB_NS}">
  <wsdl:types>
    <s:schema elementFormDefault="qualified" targetNamespace="${QB_NS}">
      <s:element name="serverVersion"><s:complexType/></s:element>
      <s:element name="serverVersionResponse"><s:complexType><s:sequence>
        <s:element minOccurs="0" maxOccurs="1" name="serverVersionResult" type="s:string"/>
      </s:sequence></s:complexType></s:element>
      <s:element name="clientVersion"><s:complexType><s:sequence>
        <s:element minOccurs="0" maxOccurs="1" name="strVersion" type="s:string"/>
      </s:sequence></s:complexType></s:element>
      <s:element name="clientVersionResponse"><s:complexType><s:sequence>
        <s:element minOccurs="0" maxOccurs="1" name="clientVersionResult" type="s:string"/>
      </s:sequence></s:complexType></s:element>
      <s:element name="authenticate"><s:complexType><s:sequence>
        <s:element minOccurs="0" maxOccurs="1" name="strUserName" type="s:string"/>
        <s:element minOccurs="0" maxOccurs="1" name="strPassword" type="s:string"/>
      </s:sequence></s:complexType></s:element>
      <s:element name="authenticateResponse"><s:complexType><s:sequence>
        <s:element minOccurs="0" maxOccurs="1" name="authenticateResult" type="tns:ArrayOfString"/>
      </s:sequence></s:complexType></s:element>
      <s:complexType name="ArrayOfString"><s:sequence>
        <s:element minOccurs="0" maxOccurs="unbounded" name="string" nillable="true" type="s:string"/>
      </s:sequence></s:complexType>
      <s:element name="sendRequestXML"><s:complexType><s:sequence>
        <s:element minOccurs="0" maxOccurs="1" name="ticket" type="s:string"/>
        <s:element minOccurs="0" maxOccurs="1" name="strHCPResponse" type="s:string"/>
        <s:element minOccurs="0" maxOccurs="1" name="strCompanyFileName" type="s:string"/>
        <s:element minOccurs="0" maxOccurs="1" name="qbXMLCountry" type="s:string"/>
        <s:element minOccurs="1" maxOccurs="1" name="qbXMLMajorVers" type="s:int"/>
        <s:element minOccurs="1" maxOccurs="1" name="qbXMLMinorVers" type="s:int"/>
      </s:sequence></s:complexType></s:element>
      <s:element name="sendRequestXMLResponse"><s:complexType><s:sequence>
        <s:element minOccurs="0" maxOccurs="1" name="sendRequestXMLResult" type="s:string"/>
      </s:sequence></s:complexType></s:element>
      <s:element name="receiveResponseXML"><s:complexType><s:sequence>
        <s:element minOccurs="0" maxOccurs="1" name="ticket" type="s:string"/>
        <s:element minOccurs="0" maxOccurs="1" name="response" type="s:string"/>
        <s:element minOccurs="0" maxOccurs="1" name="hresult" type="s:string"/>
        <s:element minOccurs="0" maxOccurs="1" name="message" type="s:string"/>
      </s:sequence></s:complexType></s:element>
      <s:element name="receiveResponseXMLResponse"><s:complexType><s:sequence>
        <s:element minOccurs="1" maxOccurs="1" name="receiveResponseXMLResult" type="s:int"/>
      </s:sequence></s:complexType></s:element>
      <s:element name="connectionError"><s:complexType><s:sequence>
        <s:element minOccurs="0" maxOccurs="1" name="ticket" type="s:string"/>
        <s:element minOccurs="0" maxOccurs="1" name="hresult" type="s:string"/>
        <s:element minOccurs="0" maxOccurs="1" name="message" type="s:string"/>
      </s:sequence></s:complexType></s:element>
      <s:element name="connectionErrorResponse"><s:complexType><s:sequence>
        <s:element minOccurs="0" maxOccurs="1" name="connectionErrorResult" type="s:string"/>
      </s:sequence></s:complexType></s:element>
      <s:element name="getLastError"><s:complexType><s:sequence>
        <s:element minOccurs="0" maxOccurs="1" name="ticket" type="s:string"/>
      </s:sequence></s:complexType></s:element>
      <s:element name="getLastErrorResponse"><s:complexType><s:sequence>
        <s:element minOccurs="0" maxOccurs="1" name="getLastErrorResult" type="s:string"/>
      </s:sequence></s:complexType></s:element>
      <s:element name="closeConnection"><s:complexType><s:sequence>
        <s:element minOccurs="0" maxOccurs="1" name="ticket" type="s:string"/>
      </s:sequence></s:complexType></s:element>
      <s:element name="closeConnectionResponse"><s:complexType><s:sequence>
        <s:element minOccurs="0" maxOccurs="1" name="closeConnectionResult" type="s:string"/>
      </s:sequence></s:complexType></s:element>
    </s:schema>
  </wsdl:types>
  ${messages}
  <wsdl:portType name="QBWebConnectorSvcSoap">${portOps}</wsdl:portType>
  <wsdl:binding name="QBWebConnectorSvcSoap" type="tns:QBWebConnectorSvcSoap">
    <soap:binding transport="http://schemas.xmlsoap.org/soap/http"/>
    ${bindingOps}
  </wsdl:binding>
  <wsdl:service name="QBWebConnectorSvc">
    <wsdl:port name="QBWebConnectorSvcSoap" binding="tns:QBWebConnectorSvcSoap">
      <soap:address location="${xmlEscape(serviceUrl)}"/>
    </wsdl:port>
  </wsdl:service>
</wsdl:definitions>`
}

const INFO_HTML = `<!doctype html>
<html><head><meta charset="utf-8"><title>Landscape Job Tracker - QuickBooks Web Connector</title>
<style>body{font-family:system-ui,sans-serif;max-width:640px;margin:48px auto;padding:0 20px;color:#1f2937}
code{background:#f3f4f6;padding:2px 6px;border-radius:4px}h1{font-size:20px}</style></head>
<body><h1>Landscape Job Tracker - QuickBooks Web Connector</h1>
<p>This endpoint is the SOAP web service for the QuickBooks Web Connector.
It is not meant to be opened in a browser - the QuickBooks Web Connector
posts to it automatically.</p>
<p>WSDL: <code>?wsdl</code></p>
<p>Status: running (payroll hours + job-cost pull: bills, checks, CC charges, item receipts).</p></body></html>`

// ── HTTP entry point ────────────────────────────────────────────────────────
serve(async (req) => {
  const url = new URL(req.url)
  const serviceUrl = `${url.origin}${url.pathname}`

  if (req.method === 'GET') {
    if (url.searchParams.has('wsdl')) {
      return new Response(buildWsdl(serviceUrl), { headers: XML_HEADERS })
    }
    return new Response(INFO_HTML, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
  }

  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 })
  }

  let body = ''
  try {
    body = await req.text()
    const method = detectMethod(body)
    if (!method) {
      return new Response(soapFault('Unrecognised SOAP request.'), {
        status: 500, headers: XML_HEADERS,
      })
    }
    const inner = await handle(method, body)
    return new Response(soapEnvelope(inner), { status: 200, headers: XML_HEADERS })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[qbwc] error:', msg)
    try {
      await logCall(admin(), null, detectMethod(body) || 'unknown', 'error', msg)
    } catch (_) { /* ignore */ }
    return new Response(soapFault(msg), { status: 500, headers: XML_HEADERS })
  }
})
