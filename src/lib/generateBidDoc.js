// src/lib/generateBidDoc.js
// Generates a Word (.docx) bid proposal from estimate data.
// Requires: npm install docx
// Usage: import { generateBidDoc } from './generateBidDoc'
//
// ── Styling target ───────────────────────────────────────────────────────────
// This output is intentionally modeled on the historical Picture Build "Sauer"
// estimate template Brian provided. Specifically:
//   • Header (logo + address block) repeats on every page in Times New Roman.
//   • Body font is Calibri (Word's default) at 11pt.
//   • The body opens with a single bold "Estimate For <name> - M/D/YYYY"
//     line, followed by plain address lines. No "PREPARED FOR" label, no
//     proposal title banner, no separate Date/Proposal rows.
//   • Each module renders as a Sauer-style section:
//       Heading 2 (bold, 16pt, Title-Case)         ← module title
//       italic indented scope lines (NO numbering) ← MODULE_VERBIAGE.scope[]
//       italic indented asterisk notes             ← MODULE_VERBIAGE.notes[]
//       bold "COST $X,XXX" (left-aligned, 12pt)    ← per-module subtotal
//   • Document ends with two bold ~13pt lines:
//       "Job Total $X,XXX - Cash/Check Price"
//       "Job Total $X,XXX - Finance OAC Price"  (cash × FINANCE_OAC_RATE)
//   • No Terms & Conditions, no Authorization to Proceed / signature block.
//     (Those used to live here; intentionally removed to match Sauer.)
//
// HeadingLevel.HEADING_2 is used for module titles so mammoth maps them to
// <h2> in the BidDocViewerModal preview, where CSS picks up the 16pt size.
// ─────────────────────────────────────────────────────────────────────────────

import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  Header,
  Footer,
  ImageRun,
  AlignmentType,
  BorderStyle,
  WidthType,
  VerticalAlign,
  PageNumber,
  HeadingLevel,
} from 'docx'
import { LOGO_B64 } from './logoBase64'
import { MODULE_VERBIAGE } from './bidVerbiage'
import { supabase } from './supabase'

// Fetch the Finance OAC markup rate from company_settings (single-row table).
// Returns DEFAULT_FINANCE_OAC_RATE if the row or column is missing, the value
// is null, or the query errors — fail-soft so a bad fetch never blocks the
// bid doc from rendering.
export async function fetchFinanceOacRate() {
  try {
    const { data } = await supabase
      .from('company_settings')
      .select('finance_oac_rate')
      .maybeSingle()
    const n = parseFloat(data?.finance_oac_rate)
    return Number.isFinite(n) && n >= 0 ? n : DEFAULT_FINANCE_OAC_RATE
  } catch {
    return DEFAULT_FINANCE_OAC_RATE
  }
}

// ── Constants ────────────────────────────────────────────────────────────────

const HEADER_FONT = 'Times New Roman' // matches Sauer header
const BODY_FONT = 'Calibri' // matches Sauer body

// Finance OAC markup default. Sauer template: $33,915 cash → $37,307 finance
// = +10.0%. Now configurable in Bids → Settings → Finance, persisted to
// company_settings.finance_oac_rate. Callers should fetch that value and
// pass it in; this constant is the fallback when nothing is set.
const DEFAULT_FINANCE_OAC_RATE = 0.1

// Half-point sizes used throughout (docx sizes are in half-points).
const SZ_BODY = 22 // 11pt
const SZ_BODY_SM = 18 //  9pt (header lines)
const SZ_TITLE = 24 // 12pt — "Estimate For …" + COST lines
const SZ_SECTION = 32 // 16pt — module heading
const SZ_TOTAL = 26 // 13pt — final Job Total lines

// Borders for header/footer tables (all invisible).
const NO_BORDER = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }
const NO_BORDERS = { top: NO_BORDER, bottom: NO_BORDER, left: NO_BORDER, right: NO_BORDER }

// ── Helpers ──────────────────────────────────────────────────────────────────

function b64ToUint8(b64) {
  const binary = atob(b64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

function usd(n) {
  return '$' + Math.round(n || 0).toLocaleString()
}

// Sauer-style short date: M/D/YYYY (e.g. "2/11/2026").
function fmtDate(d = new Date()) {
  const dt = new Date(d)
  return `${dt.getMonth() + 1}/${dt.getDate()}/${dt.getFullYear()}`
}

let _logoBytes = null
function logoBytes() {
  if (!_logoBytes) _logoBytes = b64ToUint8(LOGO_B64)
  return _logoBytes
}

// Body run — Calibri at the requested half-point size with optional bold/italic.
function bRun(text, opts = {}) {
  return new TextRun({
    text,
    font: BODY_FONT,
    size: opts.size ?? SZ_BODY,
    bold: !!opts.bold,
    italics: !!opts.italics,
    color: opts.color,
  })
}

function emptyLine(after = 120) {
  return new Paragraph({
    spacing: { after, line: 276 },
    children: [new TextRun({ text: '', font: BODY_FONT })],
  })
}

// ── Header: Logo (left) + company info (right), Times New Roman ──────────────
function buildHeader() {
  const logo = new ImageRun({
    type: 'png',
    data: logoBytes(),
    transformation: { width: 213, height: 50 },
    altText: { title: 'Picture Build Logo', description: 'Company logo', name: 'logo' },
  })

  const headerTable = new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [3000, 6360],
    borders: {
      top: NO_BORDER,
      bottom: NO_BORDER,
      left: NO_BORDER,
      right: NO_BORDER,
      insideH: NO_BORDER,
      insideV: NO_BORDER,
    },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            borders: NO_BORDERS,
            width: { size: 3000, type: WidthType.DXA },
            verticalAlign: VerticalAlign.CENTER,
            children: [new Paragraph({ spacing: { after: 0 }, children: [logo] })],
          }),
          new TableCell({
            borders: NO_BORDERS,
            width: { size: 6360, type: WidthType.DXA },
            verticalAlign: VerticalAlign.CENTER,
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                spacing: { after: 20 },
                children: [
                  new TextRun({
                    text: '12410 Foothill Blvd Unit U  Sylmar, CA 91342',
                    font: HEADER_FONT,
                    size: SZ_BODY_SM,
                  }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                spacing: { after: 20 },
                children: [
                  new TextRun({
                    text: '(818) 751-2690    www.picturebuild.com',
                    font: HEADER_FONT,
                    size: SZ_BODY_SM,
                  }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                spacing: { after: 0 },
                children: [
                  new TextRun({
                    text: "CA Contractor's License    B, C-27,8,53: 990772",
                    font: HEADER_FONT,
                    size: SZ_BODY_SM,
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  })

  return new Header({ children: [headerTable, emptyLine(0)] })
}

// ── Footer: page numbers with thin top border ────────────────────────────────
function buildFooter() {
  return new Footer({
    children: [
      new Paragraph({
        border: { top: { style: BorderStyle.SINGLE, size: 4, color: 'D9D9D9', space: 1 } },
        spacing: { after: 0 },
        children: [
          new TextRun({ text: 'Page ', font: BODY_FONT, size: SZ_BODY_SM, bold: true }),
          new TextRun({
            children: [PageNumber.CURRENT],
            font: BODY_FONT,
            size: SZ_BODY_SM,
            bold: true,
          }),
          new TextRun({ text: ' of ', font: BODY_FONT, size: SZ_BODY_SM, bold: true }),
          new TextRun({
            children: [PageNumber.TOTAL_PAGES],
            font: BODY_FONT,
            size: SZ_BODY_SM,
            bold: true,
          }),
        ],
      }),
    ],
  })
}

// ── Title + address block (Sauer-style opening) ──────────────────────────────
function buildOpening(estimate, bidDate, clientAddress, consultantName = '') {
  const out = []
  const name = (estimate.client_name || '').trim() || 'Client'

  // Single bold line: "Estimate For <Name> - M/D/YYYY"
  out.push(
    new Paragraph({
      spacing: { before: 0, after: 120, line: 276 },
      children: [
        bRun(`Estimate For ${name} - ${fmtDate(bidDate)}`, { bold: true, size: SZ_TITLE }),
      ],
    })
  )

  // Plain address lines — no spacing between them, mirrors Sauer.
  const addressLines = (clientAddress || '')
    .split('\n')
    .map(s => s.trim())
    .filter(Boolean)
  addressLines.forEach(line => {
    out.push(
      new Paragraph({
        spacing: { after: 0, line: 276 },
        children: [bRun(line)],
      })
    )
  })

  // Consultant line — appears under the address when known. Sourced from
  // the opportunity (clients.consultant_employee_id) by the caller and
  // threaded in via opts.consultantName.
  if (consultantName && consultantName.trim()) {
    out.push(
      new Paragraph({
        spacing: { before: 80, after: 0, line: 276 },
        children: [bRun(`Consultant: ${consultantName.trim()}`)],
      })
    )
  }

  out.push(emptyLine(120))
  return out
}

// ── Module section (Sauer-style: heading → italic items → COST) ──────────────
// Returns the paragraphs PLUS the dollar amount used for the cost line, so
// the caller can roll a grand total. The cost mirrors EstimateDetail's
// per-module pricing (total_price falls back to data.calc.price).
function buildModuleSection(mod, project) {
  const out = []
  const v = MODULE_VERBIAGE[mod.module_type]
  // Prefer the user's descriptive names so the proposal reads naturally:
  //   1) a custom module name, if one was set
  //   2) the custom project name from the Projects section
  //   3) the generic module-type title (fallback)
  const customName = (mod.name || mod.module_name || mod.data?.moduleName || '').trim()
  const projName = (project?.project_name || '').trim()
  const title = customName || projName || v?.title || mod.module_type || 'Scope of Work'

  // Heading 2 → mammoth renders <h2>; print CSS sizes it to 16pt.
  out.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 200, after: 80 },
      children: [bRun(title, { bold: true, size: SZ_SECTION })],
    })
  )

  // Scope lines — italic, indented (~0.5in = 720 twips), NO numbering.
  if (v?.scope?.length) {
    v.scope.forEach(line => {
      out.push(
        new Paragraph({
          spacing: { after: 40, line: 276 },
          indent: { left: 720 },
          children: [bRun(line, { italics: true })],
        })
      )
    })
  }

  // Custom user note (if present) + standard disclaimer notes — italic, indented.
  if (mod.notes && mod.notes.trim()) {
    out.push(
      new Paragraph({
        spacing: { before: 80, after: 40, line: 276 },
        indent: { left: 720 },
        children: [bRun(`*${mod.notes.trim()}`, { italics: true })],
      })
    )
  }
  if (v?.notes?.length) {
    v.notes.forEach((note, i) => {
      out.push(
        new Paragraph({
          spacing: { before: i === 0 ? 80 : 0, after: 40, line: 276 },
          indent: { left: 720 },
          children: [bRun(`*${note}`, { italics: true })],
        })
      )
    })
  }

  // Per-module cost. Use the same fallback chain EstimateDetail uses.
  const modPrice = parseFloat(mod.total_price || mod.data?.calc?.price || 0)
  // Per-module sub markup share = sub_cost × project's sub_gp_markup_rate × 1.12.
  // This keeps the per-module COSTs adding up to the same grand total the
  // current code produces (which rolls Sub GP × 1.12 into each project total).
  const modSubCost = parseFloat(mod.sub_cost || mod.data?.calc?.subCost || 0)
  const modSubGp = modSubCost * (project?.sub_gp_markup_rate ?? 0.2)
  const modTotal = modPrice + modSubGp + modSubGp * 0.12

  if (modTotal > 0) {
    out.push(
      new Paragraph({
        spacing: { before: 120, after: 0, line: 276 },
        children: [bRun(`COST ${usd(modTotal)}`, { bold: true, size: SZ_TITLE })],
      })
    )
  }
  out.push(emptyLine(160))

  return { paragraphs: out, amount: modTotal }
}

// ── Final Job Total lines (Cash / Finance OAC) ───────────────────────────────
function buildJobTotals(grandTotal, financeOacRate) {
  const cash = grandTotal
  const finance =
    grandTotal * (1 + (Number.isFinite(financeOacRate) ? financeOacRate : DEFAULT_FINANCE_OAC_RATE))
  return [
    emptyLine(120),
    new Paragraph({
      spacing: { after: 80, line: 276 },
      children: [bRun(`Job Total ${usd(cash)} - Cash/Check Price`, { bold: true, size: SZ_TOTAL })],
    }),
    new Paragraph({
      spacing: { after: 0, line: 276 },
      children: [
        bRun(`Job Total ${usd(finance)} - Finance OAC Price`, { bold: true, size: SZ_TOTAL }),
      ],
    }),
  ]
}

// ── Main export ──────────────────────────────────────────────────────────────

/**
 * generateBidDoc(estimate, projects, clientAddress, opts)
 * Returns a Blob containing the .docx file.
 *
 * @param {object} estimate         - estimate row from Supabase
 * @param {array}  projects         - estimate_projects with nested estimate_modules[]
 * @param {string} clientAddress    - multi-line address string for the client
 * @param {object} [opts]
 * @param {number} [opts.financeOacRate] - Finance OAC markup (0.10 = +10%).
 *                                         Falls back to DEFAULT_FINANCE_OAC_RATE.
 */
export async function generateBidDoc(estimate, projects, clientAddress = '', opts = {}) {
  const bidDate = new Date()

  const body = []

  // Opening: "Estimate For …" + address lines (+ Consultant line if known)
  body.push(...buildOpening(estimate, bidDate, clientAddress, opts.consultantName || ''))

  // Flatten projects → modules; render each module as a Sauer-style section.
  // Sauer doesn't show a project-level grouping label, so we don't either —
  // the cost lives on each module's COST line.
  let grandTotal = 0
  for (const project of projects || []) {
    const modules = project.estimate_modules || []
    for (const mod of modules) {
      const { paragraphs, amount } = buildModuleSection(mod, project)
      body.push(...paragraphs)
      grandTotal += amount
    }
  }

  // Final Job Total block (Cash + Finance OAC).
  // The finance markup comes from company_settings.finance_oac_rate, threaded
  // through opts. If absent/invalid, falls back to DEFAULT_FINANCE_OAC_RATE.
  if (grandTotal > 0) {
    body.push(...buildJobTotals(grandTotal, opts.financeOacRate))
  }

  const doc = new Document({
    styles: {
      default: {
        document: { run: { font: BODY_FONT, size: SZ_BODY } },
        // Make sure the Heading 2 style itself doesn't override our colors/fonts.
        heading2: {
          run: { font: BODY_FONT, size: SZ_SECTION, bold: true, color: '000000' },
          paragraph: { spacing: { before: 200, after: 80 } },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            size: { width: 12240, height: 15840 },
            margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
          },
        },
        headers: { default: buildHeader() },
        footers: { default: buildFooter() },
        children: body,
      },
    ],
  })

  return await Packer.toBlob(doc)
}

/**
 * fetchConsultantNameForEstimate(supabase, estimate)
 * Resolves the consultant's "First Last" text for a bid document, given the
 * estimate row. The lookup chain is estimate → client → consultant employee.
 * Returns '' if any link is missing. Pass the project's supabase instance —
 * we don't import it here to keep this file framework-agnostic.
 */
export async function fetchConsultantNameForEstimate(supabase, estimate) {
  try {
    const clientId = estimate?.client_id
    if (!clientId) return ''
    const { data: client } = await supabase
      .from('clients')
      .select('consultant_employee_id')
      .eq('id', clientId)
      .maybeSingle()
    if (!client?.consultant_employee_id) return ''
    const { data: emp } = await supabase
      .from('employees')
      .select('first_name, last_name')
      .eq('id', client.consultant_employee_id)
      .maybeSingle()
    if (!emp) return ''
    return `${emp.first_name || ''} ${emp.last_name || ''}`.trim()
  } catch (_) {
    return ''
  }
}

/**
 * downloadBidDoc(blob, filename)
 * Triggers a browser download of the generated DOCX.
 */
export function downloadBidDoc(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
