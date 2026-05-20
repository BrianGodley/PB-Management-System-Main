const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, BorderStyle, WidthType, ShadingType, VerticalAlign,
  LevelFormat, HeadingLevel, Header, Footer, PageNumber,
} = require('docx')
const fs = require('fs')

const GREEN  = '3A5038'
const LGREY  = 'F3F4F6'
const MGREY  = 'D1D5DB'
const BLACK  = '111111'
const WHITE  = 'FFFFFF'

const PAGE_W  = 12240   // 8.5"
const PAGE_H  = 15840   // 11"
const MARGIN  = 1080    // 0.75"
const CONTENT = PAGE_W - MARGIN * 2  // 10080 DXA

// ── Helpers ───────────────────────────────────────────────────────────────────
function spacer(pts = 6) {
  return new Paragraph({ spacing: { before: 0, after: pts * 20 } })
}

function rule(color = MGREY) {
  return new Paragraph({
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color, space: 1 } },
    spacing: { before: 0, after: 160 },
  })
}

function heading(text, opts = {}) {
  return new Paragraph({
    spacing: { before: 280, after: 120 },
    ...opts,
    children: [new TextRun({ text, font: 'Arial', size: 22, bold: true, color: GREEN })],
  })
}

function body(text, opts = {}) {
  return new Paragraph({
    spacing: { before: 0, after: 120 },
    ...opts,
    children: [new TextRun({ text, font: 'Arial', size: 20, color: BLACK })],
  })
}

function bold(text) {
  return new TextRun({ text, font: 'Arial', size: 20, bold: true, color: BLACK })
}

function normal(text) {
  return new TextRun({ text, font: 'Arial', size: 20, color: BLACK })
}

function bullet(text) {
  return new Paragraph({
    numbering: { reference: 'bullets', level: 0 },
    spacing: { before: 0, after: 80 },
    children: [new TextRun({ text, font: 'Arial', size: 20, color: BLACK })],
  })
}

function signatureLine(label, width) {
  const border = { style: BorderStyle.SINGLE, size: 6, color: MGREY }
  const noBorder = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }
  return new TableRow({
    children: [
      new TableCell({
        width: { size: width, type: WidthType.DXA },
        borders: { top: noBorder, left: noBorder, right: noBorder, bottom: border },
        margins: { top: 0, bottom: 60, left: 0, right: 200 },
        children: [new Paragraph({
          spacing: { before: 400, after: 60 },
          children: [new TextRun({ text: label, font: 'Arial', size: 18, color: '6B7280' })]
        })]
      })
    ]
  })
}

// ── Signature table (3 cols: Name | Phone | Date) ────────────────────────────
function signatureTable() {
  const border = { style: BorderStyle.SINGLE, size: 6, color: MGREY }
  const none   = { style: BorderStyle.NONE,   size: 0, color: 'FFFFFF' }
  const makeLine = (label, width) =>
    new TableCell({
      width: { size: width, type: WidthType.DXA },
      borders: { top: none, left: none, right: none, bottom: border },
      margins: { top: 0, bottom: 60, left: 0, right: 400 },
      children: [new Paragraph({
        spacing: { before: 440, after: 80 },
        children: [new TextRun({ text: label, font: 'Arial', size: 17, color: '6B7280' })]
      })]
    })

  return new Table({
    width: { size: CONTENT, type: WidthType.DXA },
    columnWidths: [3800, 2800, 3480],
    borders: { top: none, left: none, right: none, bottom: none, insideH: none, insideV: none },
    rows: [
      new TableRow({ children: [
        makeLine('Employee Full Name', 3800),
        makeLine('Cell Phone Number', 2800),
        makeLine('Date', 3480),
      ]}),
    ]
  })
}

// ── Signature line row ────────────────────────────────────────────────────────
function signatureRow() {
  const border = { style: BorderStyle.SINGLE, size: 6, color: MGREY }
  const none   = { style: BorderStyle.NONE,   size: 0, color: 'FFFFFF' }
  const makeLine = (label, width) =>
    new TableCell({
      width: { size: width, type: WidthType.DXA },
      borders: { top: none, left: none, right: none, bottom: border },
      margins: { top: 0, bottom: 60, left: 0, right: 400 },
      children: [new Paragraph({
        spacing: { before: 440, after: 80 },
        children: [new TextRun({ text: label, font: 'Arial', size: 17, color: '6B7280' })]
      })]
    })

  return new Table({
    width: { size: CONTENT, type: WidthType.DXA },
    columnWidths: [6600, 3480],
    borders: { top: none, left: none, right: none, bottom: none, insideH: none, insideV: none },
    rows: [
      new TableRow({ children: [
        makeLine('Employee Signature', 6600),
        makeLine('Date', 3480),
      ]}),
    ]
  })
}

// ── Banner box ────────────────────────────────────────────────────────────────
function bannerBox(lines) {
  const none = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }
  return new Table({
    width: { size: CONTENT, type: WidthType.DXA },
    columnWidths: [CONTENT],
    rows: [new TableRow({ children: [new TableCell({
      width: { size: CONTENT, type: WidthType.DXA },
      shading: { fill: 'EBF5EB', type: ShadingType.CLEAR },
      borders: { top: none, left: { style: BorderStyle.SINGLE, size: 18, color: GREEN },
                 right: none, bottom: none },
      margins: { top: 120, bottom: 120, left: 200, right: 200 },
      children: lines.map(([txt, isBold]) => new Paragraph({
        spacing: { before: 0, after: 60 },
        children: [new TextRun({ text: txt, font: 'Arial', size: 19,
          bold: isBold, color: BLACK })]
      }))
    })]})],
  })
}

// ── Document ──────────────────────────────────────────────────────────────────
const doc = new Document({
  numbering: {
    config: [
      {
        reference: 'bullets',
        levels: [{
          level: 0, format: LevelFormat.BULLET, text: '\u2022',
          alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 540, hanging: 300 } } },
        }],
      },
    ],
  },

  styles: {
    default: { document: { run: { font: 'Arial', size: 20 } } },
  },

  sections: [{
    properties: {
      page: {
        size: { width: PAGE_W, height: PAGE_H },
        margin: { top: MARGIN, right: MARGIN, bottom: MARGIN, left: MARGIN },
      },
    },

    headers: {
      default: new Header({
        children: [new Paragraph({
          border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: GREEN, space: 1 } },
          spacing: { before: 0, after: 160 },
          children: [
            new TextRun({ text: 'Picture Build', font: 'Arial', size: 24, bold: true, color: GREEN }),
            new TextRun({ text: '   |   Employee SMS Opt-In Agreement', font: 'Arial', size: 20, color: '6B7280' }),
          ],
        })]
      })
    },

    footers: {
      default: new Footer({
        children: [new Paragraph({
          border: { top: { style: BorderStyle.SINGLE, size: 6, color: MGREY, space: 1 } },
          alignment: AlignmentType.CENTER,
          spacing: { before: 120, after: 0 },
          children: [
            new TextRun({ text: 'Picture Build System  \u2022  Employee SMS Consent Form  \u2022  Confidential', font: 'Arial', size: 16, color: '9CA3AF' }),
          ],
        })]
      })
    },

    children: [

      // ── Title block ─────────────────────────────────────────────────────────
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 200, after: 60 },
        children: [new TextRun({ text: 'Employee SMS Opt-In Agreement', font: 'Arial', size: 36, bold: true, color: GREEN })],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 0 },
        children: [new TextRun({ text: 'Text Message Consent & Authorization', font: 'Arial', size: 22, color: '4B5563' })],
      }),
      rule(GREEN),

      // ── Purpose ─────────────────────────────────────────────────────────────
      heading('Purpose'),
      new Paragraph({
        spacing: { before: 0, after: 120 },
        children: [
          normal('Picture Build ('),
          bold('"the Company"'),
          normal(') uses its internal management system to send employees work-related text messages via SMS. This form documents your consent to receive such messages on the cell phone number you provide below.'),
        ],
      }),

      spacer(4),

      // ── Types of messages ────────────────────────────────────────────────────
      heading('Types of Messages You May Receive'),
      body('By signing below, you agree to receive SMS notifications that may include:'),
      bullet('Account credentials \u2014 your initial password or a reset password when an admin generates one for you'),
      bullet('Job & schedule notifications \u2014 new job assignments, schedule changes, or updates from project supervisors'),
      bullet('Appointment reminders \u2014 reminders before scheduled jobs or client appointments'),
      bullet('Bid updates \u2014 notifications when a bid you are involved with is sent or accepted'),
      bullet('General work communications \u2014 time-sensitive operational messages from management'),
      spacer(4),

      // ── Message frequency ────────────────────────────────────────────────────
      heading('Message Frequency & Rates'),
      new Paragraph({
        spacing: { before: 0, after: 120 },
        children: [
          normal('Message frequency will vary based on your role and activity within the system. You may receive multiple messages per day during active project periods. '),
          bold('Standard message and data rates may apply'),
          normal(' depending on your mobile carrier and plan.'),
        ],
      }),
      spacer(4),

      // ── How to opt out ───────────────────────────────────────────────────────
      heading('How to Opt Out'),
      body('You may withdraw your consent and stop receiving SMS messages at any time by either:'),
      bullet('Replying STOP to any text message you receive from us, or'),
      bullet('Contacting your manager or the system administrator to have your number removed.'),
      body('After opting out, you may still receive messages that are necessary to perform your job duties at your manager\u2019s discretion via other channels.'),
      spacer(4),

      // ── Help ────────────────────────────────────────────────────────────────
      heading('Getting Help'),
      body('Reply HELP to any message for assistance, or contact your manager or the system administrator directly.'),
      spacer(4),

      // ── Not a condition of employment ────────────────────────────────────────
      bannerBox([
        ['Not a condition of employment', true],
        ['Consent to receive SMS messages is voluntary and is not a condition of your employment or continued employment with Picture Build. Opting out will not negatively affect your employment status.', false],
      ]),
      spacer(8),

      // ── Privacy ─────────────────────────────────────────────────────────────
      heading('Privacy & Data Use'),
      body('Your cell phone number will be used solely for the work-related notifications described above and will not be sold, rented, or shared with any third party for marketing purposes. Message content is routed through SimpleTexting, our SMS service provider, and is subject to their privacy policy.'),
      spacer(4),

      // ── Employee consent ────────────────────────────────────────────────────
      rule(MGREY),
      heading('Employee Consent & Acknowledgment'),
      body('By signing below, I confirm that:'),
      bullet('I am the authorized account holder or regular user of the cell phone number provided.'),
      bullet('I consent to receive the work-related SMS messages described in this agreement.'),
      bullet('I understand that message and data rates may apply.'),
      bullet('I understand I may opt out at any time by replying STOP.'),
      bullet('I understand this consent is not required as a condition of my employment.'),
      spacer(12),

      signatureTable(),
      spacer(20),
      signatureRow(),
      spacer(16),

      // ── Admin use only ───────────────────────────────────────────────────────
      rule(MGREY),
      new Paragraph({
        spacing: { before: 0, after: 100 },
        children: [new TextRun({ text: 'FOR OFFICE USE ONLY', font: 'Arial', size: 18, bold: true, color: '9CA3AF' })],
      }),

      new Table({
        width: { size: CONTENT, type: WidthType.DXA },
        columnWidths: [3360, 3360, 3360],
        rows: [new TableRow({ children: [
          new TableCell({
            width: { size: 3360, type: WidthType.DXA },
            shading: { fill: LGREY, type: ShadingType.CLEAR },
            margins: { top: 80, bottom: 80, left: 160, right: 160 },
            borders: { top: { style: BorderStyle.SINGLE, size: 4, color: MGREY },
                       bottom: { style: BorderStyle.SINGLE, size: 4, color: MGREY },
                       left:   { style: BorderStyle.SINGLE, size: 4, color: MGREY },
                       right:  { style: BorderStyle.SINGLE, size: 4, color: MGREY } },
            children: [
              new Paragraph({ children: [new TextRun({ text: 'Number entered in system', font: 'Arial', size: 16, color: '6B7280' })] }),
              new Paragraph({ spacing: { before: 160 }, children: [new TextRun({ text: '\u25a1  Yes    \u25a1  No', font: 'Arial', size: 18, color: BLACK })] }),
            ]
          }),
          new TableCell({
            width: { size: 3360, type: WidthType.DXA },
            shading: { fill: LGREY, type: ShadingType.CLEAR },
            margins: { top: 80, bottom: 80, left: 160, right: 160 },
            borders: { top: { style: BorderStyle.SINGLE, size: 4, color: MGREY },
                       bottom: { style: BorderStyle.SINGLE, size: 4, color: MGREY },
                       left:   { style: BorderStyle.SINGLE, size: 4, color: MGREY },
                       right:  { style: BorderStyle.SINGLE, size: 4, color: MGREY } },
            children: [
              new Paragraph({ children: [new TextRun({ text: 'Date added by admin', font: 'Arial', size: 16, color: '6B7280' })] }),
              new Paragraph({ spacing: { before: 160 }, children: [new TextRun({ text: '___________________', font: 'Arial', size: 18, color: BLACK })] }),
            ]
          }),
          new TableCell({
            width: { size: 3360, type: WidthType.DXA },
            shading: { fill: LGREY, type: ShadingType.CLEAR },
            margins: { top: 80, bottom: 80, left: 160, right: 160 },
            borders: { top: { style: BorderStyle.SINGLE, size: 4, color: MGREY },
                       bottom: { style: BorderStyle.SINGLE, size: 4, color: MGREY },
                       left:   { style: BorderStyle.SINGLE, size: 4, color: MGREY },
                       right:  { style: BorderStyle.SINGLE, size: 4, color: MGREY } },
            children: [
              new Paragraph({ children: [new TextRun({ text: 'Admin initials', font: 'Arial', size: 16, color: '6B7280' })] }),
              new Paragraph({ spacing: { before: 160 }, children: [new TextRun({ text: '___________________', font: 'Arial', size: 18, color: BLACK })] }),
            ]
          }),
        ]})],
      }),

    ],
  }],
})

Packer.toBuffer(doc).then(buf => {
  fs.writeFileSync('/sessions/relaxed-peaceful-darwin/sms-optin.docx', buf)
  console.log('done')
})
