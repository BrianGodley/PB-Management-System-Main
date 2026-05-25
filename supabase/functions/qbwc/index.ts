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
const SERVER_VERSION = 'Landscape Job Tracker QBWC service 1.1 (payroll-hours pull)'

// The work queue for a session. One entity for now — Time Tracking.
const SYNC_ENTITIES = ['TimeTracking']

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

type WorkItem = { entity: string; fromDate?: string | null }

function buildEntityRequest(item: WorkItem, version: string): string {
  if (item?.entity === 'TimeTracking') {
    const filter = item.fromDate
      ? `<TxnDateRangeFilter><FromTxnDate>${xmlEscape(item.fromDate)}</FromTxnDate></TxnDateRangeFilter>`
      : ''
    return qbxmlRequest(version, `<TimeTrackingQueryRq>${filter}</TimeTrackingQueryRq>`)
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

      // Queue the work items. Snapshot payroll_from_date onto the work item so
      // the request is consistent for the life of the session.
      const work: WorkItem[] = SYNC_ENTITIES.map((entity) => ({
        entity,
        fromDate: entity === 'TimeTracking' ? (conn.payroll_from_date ?? null) : null,
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
      await logCall(sb, ticket || null, 'sendRequestXML', 'ok',
        `Requesting ${item.entity}${item.fromDate ? ` from ${item.fromDate}` : ''} ` +
        `(step ${step + 1} of ${work.length}, qbXML ${version}).`,
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

      try {
        if (hresult) throw new Error(`QuickBooks reported hresult ${hresult}: ${qbMsg}`)

        if (entity === 'TimeTracking') {
          const { rows, status } = parseTimeTracking(response)
          const count = await upsertChunked(sb, 'qb_time_tracking', rows, 'txn_id')
          await logCall(sb, ticket || null, 'receiveResponseXML', 'ok',
            `Pulled ${count} time-tracking entries (${status}).`, entity, 'pull')
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

      const pct = next >= total ? 100 : Math.max(1, Math.min(99, Math.round((next / total) * 100)))
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
<p>Status: running (payroll-hours pull).</p></body></html>`

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
