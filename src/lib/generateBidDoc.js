// src/lib/generateBidDoc.js
// Generates a Word (.docx) bid proposal from estimate data.
// Requires: npm install docx
// Usage: import { generateBidDoc } from './generateBidDoc'

import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, ImageRun, AlignmentType, BorderStyle, WidthType,
  ShadingType, VerticalAlign, PageNumber, LevelFormat,
  TabStopType, TabStopPosition,
} from 'docx'
import { LOGO_B64 } from './logoBase64'
import { MODULE_VERBIAGE } from './bidVerbiage'

// ── Helpers ──────────────────────────────────────────────────────────────────

function b64ToUint8(b64) {
  const binary = atob(b64)
  const bytes  = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

function usd(n) {
  return '$' + Math.round(n || 0).toLocaleString()
}

function fmtDate(d = new Date()) {
  return new Date(d).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

// Thin gray border for tables
const THIN = { style: BorderStyle.SINGLE, size: 4, color: 'D0D0D0' }
const BORDERS = { top: THIN, bottom: THIN, left: THIN, right: THIN }
const NO_BORDER = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }
const NO_BORDERS = { top: NO_BORDER, bottom: NO_BORDER, left: NO_BORDER, right: NO_BORDER }

const FONT    = 'Times New Roman'
const FG_HEX  = '2D6A2D'   // dark green to match app (approximate)

// ── Logo image bytes ─────────────────────────────────────────────────────────
let _logoBytes = null
function logoBytes() {
  if (!_logoBytes) _logoBytes = b64ToUint8(LOGO_B64)
  return _logoBytes
}

// ── Reusable paragraph builders ──────────────────────────────────────────────

function p(children, opts = {}) {
  return new Paragraph({
    spacing: { after: opts.after ?? 120, before: opts.before ?? 0, line: opts.line ?? 276 },
    alignment: opts.align ?? AlignmentType.LEFT,
    ...opts,
    children: Array.isArray(children) ? children : [children],
  })
}

function run(text, opts = {}) {
  return new TextRun({ text, font: FONT, size: opts.size ?? 20, ...opts })
}

function boldRun(text, opts = {}) {
  return run(text, { bold: true, ...opts })
}

function sectionTitle(text) {
  return new Paragraph({
    spacing: { before: 240, after: 80, line: 276 },
    children: [
      new TextRun({
        text,
        font: FONT,
        size: 22,
        bold: true,
        allCaps: true,
        color: '000000',
      }),
    ],
    border: {
      bottom: { style: BorderStyle.SINGLE, size: 6, color: 'D0D0D0', space: 4 },
    },
  })
}

function moduleTitlePara(text) {
  return new Paragraph({
    spacing: { before: 200, after: 60 },
    children: [
      new TextRun({ text, font: FONT, size: 20, bold: true, underline: {} }),
    ],
  })
}

function bulletPara(text, num) {
  return new Paragraph({
    spacing: { before: 0, after: 40, line: 276 },
    indent: { left: 360, hanging: 360 },
    children: [
      new TextRun({ text: `${num}.  ${text}`, font: FONT, size: 20 }),
    ],
  })
}

function notePara(text) {
  return new Paragraph({
    spacing: { before: 0, after: 40, line: 276 },
    indent: { left: 360 },
    children: [
      new TextRun({ text: `* ${text}`, font: FONT, size: 18, italics: true, color: '555555' }),
    ],
  })
}

function emptyLine(after = 80) {
  return new Paragraph({ spacing: { after }, children: [new TextRun('')] })
}

// ── Header: Logo (left) + company info (right) ───────────────────────────────
function buildHeader() {
  const logo = new ImageRun({
    type: 'png',
    data: logoBytes(),
    transformation: { width: 213, height: 50 },
    altText: { title: 'Picture Build Logo', description: 'Company logo', name: 'logo' },
  })

  // Two-cell table: logo left | company info right
  const headerTable = new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [3000, 6360],
    borders: { top: NO_BORDER, bottom: NO_BORDER, left: NO_BORDER, right: NO_BORDER, insideH: NO_BORDER, insideV: NO_BORDER },
    rows: [
      new TableRow({
        children: [
          // Logo cell
          new TableCell({
            borders: NO_BORDERS,
            width: { size: 3000, type: WidthType.DXA },
            verticalAlign: VerticalAlign.CENTER,
            children: [
              new Paragraph({
                spacing: { after: 0 },
                children: [logo],
              }),
            ],
          }),
          // Company info cell
          new TableCell({
            borders: NO_BORDERS,
            width: { size: 6360, type: WidthType.DXA },
            verticalAlign: VerticalAlign.CENTER,
            children: [
              p(run('12410 Foothill Blvd Unit U  Sylmar, CA 91342', { size: 18 }), { align: AlignmentType.RIGHT, after: 20 }),
              p(run('(818) 751-2690    www.picturebuild.com', { size: 18 }), { align: AlignmentType.RIGHT, after: 20 }),
              p(run('CA Contractor\'s License    B, C-27,8,53: 990772', { size: 18 }), { align: AlignmentType.RIGHT, after: 0 }),
            ],
          }),
        ],
      }),
    ],
  })

  return new Header({
    children: [
      headerTable,
      emptyLine(0),
    ],
  })
}

// ── Footer: page numbers ──────────────────────────────────────────────────────
function buildFooter() {
  return new Footer({
    children: [
      new Paragraph({
        border: { top: { style: BorderStyle.SINGLE, size: 4, color: 'D9D9D9', space: 1 } },
        spacing: { after: 0 },
        children: [
          new TextRun({ text: 'Page ', font: FONT, size: 18, bold: true }),
          new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: 18, bold: true }),
          new TextRun({ text: ' of ', font: FONT, size: 18, bold: true }),
          new TextRun({ children: [PageNumber.TOTAL_PAGES], font: FONT, size: 18, bold: true }),
        ],
      }),
    ],
  })
}

// ── Client info block ─────────────────────────────────────────────────────────
function buildClientBlock(estimate, bidDate, clientAddress) {
  const rows = []
  const addressLines = (clientAddress || '').split('\n').filter(Boolean)

  // Two-column info row: "PREPARED FOR" left, date/proposal right
  const infoTable = new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [4680, 4680],
    borders: { top: NO_BORDER, bottom: NO_BORDER, left: NO_BORDER, right: NO_BORDER, insideH: NO_BORDER, insideV: NO_BORDER },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            borders: NO_BORDERS,
            width: { size: 4680, type: WidthType.DXA },
            children: [
              p(boldRun('PREPARED FOR:', { size: 20, allCaps: true }), { after: 40 }),
              p(boldRun(estimate.client_name || '', { size: 22 }), { after: 40 }),
              ...addressLines.map(line => p(run(line, { size: 20 }), { after: 20 })),
              ...(addressLines.length === 0 ? [emptyLine(0)] : []),
            ],
          }),
          new TableCell({
            borders: NO_BORDERS,
            width: { size: 4680, type: WidthType.DXA },
            children: [
              p(run('Date:  ' + fmtDate(bidDate), { size: 20 }), { align: AlignmentType.RIGHT, after: 40 }),
              p(run('Proposal:  ' + (estimate.estimate_name || ''), { size: 20 }), { align: AlignmentType.RIGHT, after: 0 }),
            ],
          }),
        ],
      }),
    ],
  })

  rows.push(infoTable)
  rows.push(emptyLine(120))
  return rows
}

// ── Project section ───────────────────────────────────────────────────────────
function buildProjectSection(project) {
  const paras = []
  const modules = project.estimate_modules || []

  // Project header
  paras.push(
    new Paragraph({
      spacing: { before: 280, after: 100 },
      children: [
        new TextRun({
          text: project.project_name || 'Project',
          font: FONT, size: 24, bold: true, color: FG_HEX,
        }),
      ],
    })
  )

  // Each module's scope
  for (const mod of modules) {
    const v = MODULE_VERBIAGE[mod.module_type]
    if (!v) {
      // Fallback: just show the module type name and notes
      paras.push(moduleTitlePara(mod.module_type || 'Scope of Work'))
      if (mod.notes) {
        paras.push(notePara(mod.notes))
      }
      continue
    }

    paras.push(moduleTitlePara(v.title))

    v.scope.forEach((line, i) => {
      paras.push(bulletPara(line, i + 1))
    })

    // If the module has custom notes saved, include them first
    if (mod.notes && mod.notes.trim()) {
      paras.push(notePara(mod.notes.trim()))
    }

    // Standard disclaimer notes
    v.notes.forEach(note => paras.push(notePara(note)))

    paras.push(emptyLine(60))
  }

  // Project total price row
  const projTotal = modules.reduce((s, m) => s + parseFloat(m.total_price || m.data?.calc?.price || 0), 0)
  if (projTotal > 0) {
    const totalTable = new Table({
      width: { size: 9360, type: WidthType.DXA },
      columnWidths: [6360, 3000],
      borders: { top: NO_BORDER, bottom: NO_BORDER, left: NO_BORDER, right: NO_BORDER, insideH: NO_BORDER, insideV: NO_BORDER },
      rows: [
        new TableRow({
          children: [
            new TableCell({
              borders: NO_BORDERS,
              width: { size: 6360, type: WidthType.DXA },
              children: [emptyLine(0)],
            }),
            new TableCell({
              borders: {
                top: THIN, bottom: { style: BorderStyle.DOUBLE, size: 6, color: '333333' },
                left: NO_BORDER, right: NO_BORDER,
              },
              shading: { fill: 'F5F5F5', type: ShadingType.CLEAR },
              width: { size: 3000, type: WidthType.DXA },
              margins: { top: 60, bottom: 60, left: 120, right: 120 },
              children: [
                new Paragraph({
                  alignment: AlignmentType.RIGHT,
                  spacing: { after: 0 },
                  children: [
                    new TextRun({ text: project.project_name + ' Total:  ', font: FONT, size: 20 }),
                    new TextRun({ text: usd(projTotal), font: FONT, size: 20, bold: true }),
                  ],
                }),
              ],
            }),
          ],
        }),
      ],
    })
    paras.push(totalTable)
  }

  paras.push(emptyLine(120))
  return paras
}

// ── Grand total block ─────────────────────────────────────────────────────────
function buildGrandTotal(totalPrice) {
  const totalTable = new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [5360, 4000],
    borders: { top: NO_BORDER, bottom: NO_BORDER, left: NO_BORDER, right: NO_BORDER, insideH: NO_BORDER, insideV: NO_BORDER },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            borders: NO_BORDERS,
            width: { size: 5360, type: WidthType.DXA },
            children: [emptyLine(0)],
          }),
          new TableCell({
            borders: {
              top: { style: BorderStyle.DOUBLE, size: 6, color: '333333' },
              bottom: { style: BorderStyle.DOUBLE, size: 6, color: '333333' },
              left: NO_BORDER, right: NO_BORDER,
            },
            shading: { fill: 'EAFAEA', type: ShadingType.CLEAR },
            width: { size: 4000, type: WidthType.DXA },
            margins: { top: 100, bottom: 100, left: 180, right: 180 },
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                spacing: { after: 0 },
                children: [
                  new TextRun({ text: 'TOTAL BID AMOUNT:  ', font: FONT, size: 24, bold: true }),
                  new TextRun({ text: usd(totalPrice), font: FONT, size: 28, bold: true, color: FG_HEX }),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  })
  return [totalTable, emptyLine(240)]
}

// ── Terms & signature ─────────────────────────────────────────────────────────
function buildTerms() {
  const paras = []

  paras.push(sectionTitle('Terms and Conditions'))
  paras.push(emptyLine(60))

  const terms = [
    'This proposal is valid for 30 days from the date shown above.',
    'A deposit of 10% of the total bid amount is required to schedule the project. The remaining balance is due upon completion of each phase of work.',
    'Any changes to the scope of work must be agreed upon in writing and may result in a change order and additional costs.',
    'Picture Build is not responsible for underground utilities, pipes, or other obstructions not disclosed prior to the start of work.',
    'All work will be performed in accordance with applicable local building codes and regulations.',
    'Picture Build carries general liability insurance and workers\' compensation insurance.',
    'Permits, when required, are not included in this proposal unless specifically stated.',
    'This proposal does not include the cost of any HOA approvals, surveys, or engineering unless specifically stated.',
  ]

  terms.forEach((t, i) => paras.push(bulletPara(t, i + 1)))

  paras.push(emptyLine(240))

  // Signature block
  paras.push(sectionTitle('Authorization to Proceed'))
  paras.push(emptyLine(60))
  paras.push(
    p(run('By signing below, Client accepts the terms of this proposal and authorizes Picture Build to proceed with the work described herein.'), { after: 200 })
  )

  const sigTable = new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [4280, 500, 4580],
    borders: { top: NO_BORDER, bottom: NO_BORDER, left: NO_BORDER, right: NO_BORDER, insideH: NO_BORDER, insideV: NO_BORDER },
    rows: [
      new TableRow({
        children: [
          // Client sig
          new TableCell({
            borders: NO_BORDERS,
            width: { size: 4280, type: WidthType.DXA },
            children: [
              new Paragraph({
                border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: '333333', space: 2 } },
                spacing: { after: 60 },
                children: [new TextRun('')],
              }),
              p(run('Client Signature / Date', { size: 18 }), { after: 200 }),
            ],
          }),
          // Spacer
          new TableCell({
            borders: NO_BORDERS,
            width: { size: 500, type: WidthType.DXA },
            children: [emptyLine(0)],
          }),
          // PB sig
          new TableCell({
            borders: NO_BORDERS,
            width: { size: 4580, type: WidthType.DXA },
            children: [
              new Paragraph({
                border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: '333333', space: 2 } },
                spacing: { after: 60 },
                children: [new TextRun('')],
              }),
              p(run('Picture Build Representative / Date', { size: 18 }), { after: 0 }),
            ],
          }),
        ],
      }),
    ],
  })

  paras.push(sigTable)
  return paras
}

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * generateBidDoc(estimate, projects)
 * Returns a Blob containing the .docx file.
 *
 * @param {object} estimate  - estimate row from Supabase
 * @param {array}  projects  - estimate_projects with nested estimate_modules[]
 */
export async function generateBidDoc(estimate, projects, clientAddress = '') {
  const bidDate = new Date()

  // Compute grand total from all modules across all projects
  const grandTotal = projects.reduce((sum, proj) => {
    return sum + (proj.estimate_modules || []).reduce((s, m) => {
      return s + parseFloat(m.total_price || m.data?.calc?.price || 0)
    }, 0)
  }, 0)

  // Build document body
  const body = []

  // ── Proposal title
  body.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 120, after: 80 },
      children: [
        new TextRun({ text: 'LANDSCAPE PROPOSAL', font: FONT, size: 36, bold: true, color: FG_HEX }),
      ],
    })
  )
  body.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: FG_HEX, space: 4 } },
      children: [new TextRun({ text: '', font: FONT, size: 4 })],
    })
  )

  // ── Client info
  body.push(...buildClientBlock(estimate, bidDate, clientAddress))

  // ── Scope of work header
  body.push(sectionTitle('Scope of Work'))
  body.push(emptyLine(80))

  // ── Projects
  for (const proj of projects) {
    body.push(...buildProjectSection(proj))
  }

  // ── Grand total
  body.push(...buildGrandTotal(grandTotal))

  // ── Terms & signature
  body.push(...buildTerms())

  // ── Assemble document
  const doc = new Document({
    numbering: { config: [] },
    styles: {
      default: {
        document: {
          run: { font: FONT, size: 20 },
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
 * downloadBidDoc(blob, filename)
 * Triggers a browser download of the generated DOCX.
 */
export function downloadBidDoc(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a   = document.createElement('a')
  a.href     = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
