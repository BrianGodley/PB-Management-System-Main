// src/lib/dailyLogDocx.js
//
// Builds a client-ready "Daily Log Report" as an editable Word (.docx) file —
// the Word counterpart to dailyLogPdf.js. Same content: company/job header,
// then each daily log's date, author, weather, notes, and photos (2-up).
//
// Uses the `docx` library (already a dependency, same one that builds bid docs).
// Photos are downscaled + re-encoded to JPEG in a canvas before embedding.

import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  ImageRun,
  AlignmentType,
  BorderStyle,
  WidthType,
} from 'docx'

const NO_BORDER = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }
const NO_BORDERS = {
  top: NO_BORDER,
  bottom: NO_BORDER,
  left: NO_BORDER,
  right: NO_BORDER,
  insideHorizontal: NO_BORDER,
  insideVertical: NO_BORDER,
}
const BRAND = '3A5038'
const GREY = '6E6E6E'

function fmtDate(d) {
  if (!d) return ''
  return new Date(d + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

// Load a remote image → { bytes:Uint8Array, width, height } (downscaled JPEG).
function loadImageBytes(url, maxPx = 1100, quality = 0.72) {
  return new Promise(resolve => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      try {
        let { width, height } = img
        if (!width || !height) return resolve(null)
        const s = Math.min(1, maxPx / Math.max(width, height))
        width = Math.round(width * s)
        height = Math.round(height * s)
        const c = document.createElement('canvas')
        c.width = width
        c.height = height
        const ctx = c.getContext('2d')
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, width, height)
        ctx.drawImage(img, 0, 0, width, height)
        c.toBlob(
          async b => {
            if (!b) return resolve(null)
            resolve({ bytes: new Uint8Array(await b.arrayBuffer()), width, height })
          },
          'image/jpeg',
          quality
        )
      } catch {
        resolve(null)
      }
    }
    img.onerror = () => resolve(null)
    img.src = url
  })
}

function photoTable(imgs) {
  const rows = []
  for (let i = 0; i < imgs.length; i += 2) {
    const cells = []
    for (let j = i; j < Math.min(i + 2, imgs.length); j++) {
      const ph = imgs[j]
      const ar = ph.width / ph.height || 1.33
      let w = 290
      let h = Math.round(w / ar)
      if (h > 230) {
        h = 230
        w = Math.round(h * ar)
      }
      cells.push(
        new TableCell({
          width: { size: 50, type: WidthType.PERCENTAGE },
          borders: NO_BORDERS,
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { after: 80 },
              children: [new ImageRun({ type: 'jpg', data: ph.bytes, transformation: { width: w, height: h } })],
            }),
          ],
        })
      )
    }
    if (cells.length === 1) {
      cells.push(new TableCell({ width: { size: 50, type: WidthType.PERCENTAGE }, borders: NO_BORDERS, children: [new Paragraph('')] }))
    }
    rows.push(new TableRow({ children: cells }))
  }
  return new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, borders: NO_BORDERS, rows })
}

export async function generateDailyLogDocx({ job = {}, logs = [], company = {}, options = {}, onProgress }) {
  const includePhotos = options.includePhotos !== false
  const jobName = job.name || job.client_name || 'Job'
  const addr = [job.job_address, job.job_city, job.job_state, job.job_zip].filter(Boolean).join(', ')
  const children = []

  // Optional logo
  if (company.logoUrl) {
    onProgress?.('Loading logo…')
    const logo = await loadImageBytes(company.logoUrl, 240, 0.9)
    if (logo) {
      const ar = logo.width / logo.height || 3
      const w = 150
      const h = Math.min(Math.round(w / ar), 70)
      children.push(
        new Paragraph({ children: [new ImageRun({ type: 'jpg', data: logo.bytes, transformation: { width: w, height: h } })] })
      )
    }
  }

  // Header
  children.push(
    new Paragraph({
      spacing: { after: 40 },
      children: [new TextRun({ text: company.name || 'Daily Log Report', bold: true, size: 40, color: BRAND })],
    }),
    new Paragraph({ spacing: { after: 160 }, children: [new TextRun({ text: 'Daily Log Report', size: 22, color: GREY })] }),
    new Paragraph({ spacing: { after: 20 }, children: [new TextRun({ text: jobName, bold: true, size: 26 })] })
  )
  if (job.client_name && job.client_name !== jobName)
    children.push(new Paragraph({ children: [new TextRun({ text: `Client: ${job.client_name}`, size: 20, color: GREY })] }))
  if (addr) children.push(new Paragraph({ children: [new TextRun({ text: addr, size: 20, color: GREY })] }))
  const meta = []
  if (options.rangeLabel) meta.push(options.rangeLabel)
  meta.push(`${logs.length} log${logs.length === 1 ? '' : 's'}`)
  meta.push(`Generated ${new Date().toLocaleDateString('en-US')}`)
  children.push(
    new Paragraph({
      spacing: { after: 160 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: 'DDDDDD' } },
      children: [new TextRun({ text: meta.join('   •   '), size: 18, color: GREY })],
    })
  )

  if (!logs.length) {
    children.push(new Paragraph({ children: [new TextRun({ text: 'No daily logs in the selected range.', size: 20, color: GREY })] }))
  }

  for (let li = 0; li < logs.length; li++) {
    const log = logs[li]
    onProgress?.(`Building log ${li + 1} of ${logs.length}…`)

    // Date + author line
    const headRuns = [new TextRun({ text: fmtDate(log.date), bold: true, size: 24, color: '1E1E1E' })]
    if (log.authorName) headRuns.push(new TextRun({ text: `    —  ${log.authorName}`, size: 18, color: GREY }))
    children.push(new Paragraph({ spacing: { before: 160, after: 40 }, children: headRuns }))

    if (log.weather_conditions && log.weather_notes)
      children.push(
        new Paragraph({
          spacing: { after: 60 },
          children: [new TextRun({ text: `Weather: ${log.weather_notes}`, italics: true, size: 18, color: GREY })],
        })
      )

    if (log.notes)
      children.push(new Paragraph({ spacing: { after: 100 }, children: [new TextRun({ text: log.notes, size: 21, color: '2D2D2D' })] }))

    if (includePhotos && log.photoUrls && log.photoUrls.length) {
      const imgs = []
      for (let pi = 0; pi < log.photoUrls.length; pi++) {
        onProgress?.(`Loading photo ${pi + 1}/${log.photoUrls.length} (log ${li + 1}/${logs.length})…`)
        const im = await loadImageBytes(log.photoUrls[pi].url)
        if (im) imgs.push(im)
      }
      if (imgs.length) children.push(photoTable(imgs))
    }

    if (li < logs.length - 1)
      children.push(
        new Paragraph({
          spacing: { before: 120, after: 0 },
          border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: 'EEEEEE' } },
          children: [new TextRun({ text: '', size: 2 })],
        })
      )
  }

  onProgress?.('Finalizing…')
  const doc = new Document({ sections: [{ properties: {}, children }] })
  const blob = await Packer.toBlob(doc)

  const safeName = jobName.replace(/[^\w\- ]+/g, '').trim() || 'Job'
  const range = options.rangeLabel ? ` ${options.rangeLabel.replace(/[^\w\- ]+/g, '')}` : ''
  const filename = `${safeName} - Daily Logs${range}.docx`
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
  return blob
}
