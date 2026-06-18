// src/lib/dailyLogPdf.js
//
// Builds a polished, client-ready "Daily Log Report" PDF for a single job:
// a header (company logo + job/client/date-range), then each daily log with
// its date, author, weather, notes, and photos laid out in a 2-up grid.
//
// Uses jsPDF (already a dependency). Photos are downscaled + re-encoded to JPEG
// in a canvas before embedding so the PDF stays a reasonable size. Public
// Supabase storage URLs serve with CORS, so the canvas isn't tainted; if any
// image can't be loaded/exported it's skipped rather than breaking the report.

import { jsPDF } from 'jspdf'

const BRAND = [58, 80, 56] // PBS green (#3A5038)
const GREY = [110, 110, 110]
const LIGHT = [225, 225, 225]

function fmtDate(d) {
  if (!d) return ''
  return new Date(d + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}
function fmtShort(d) {
  if (!d) return ''
  return new Date(d + 'T12:00:00').toLocaleDateString('en-US', {
    month: 'numeric',
    day: 'numeric',
    year: 'numeric',
  })
}

// Load a remote image, downscale, and return { dataUrl, width, height }.
function loadImage(url, maxPx = 1100, quality = 0.72) {
  return new Promise(resolve => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      try {
        let { width, height } = img
        if (!width || !height) return resolve(null)
        const scale = Math.min(1, maxPx / Math.max(width, height))
        width = Math.round(width * scale)
        height = Math.round(height * scale)
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, width, height)
        ctx.drawImage(img, 0, 0, width, height)
        resolve({ dataUrl: canvas.toDataURL('image/jpeg', quality), width, height })
      } catch {
        resolve(null) // tainted canvas or decode failure → skip
      }
    }
    img.onerror = () => resolve(null)
    img.src = url
  })
}

/**
 * @param {Object}   p
 * @param {Object}   p.job        job row (name, client_name, job_address/city/state/zip)
 * @param {Array}    p.logs       daily_logs (date asc) each with .photoUrls [{url,caption}]
 * @param {Object}   p.company    { name, logoUrl }
 * @param {Object}   p.options    { includePhotos, rangeLabel }
 * @param {Function} p.onProgress (msg) => void
 * @returns {Promise<Blob>}
 */
export async function generateDailyLogPdf({ job = {}, logs = [], company = {}, options = {}, onProgress }) {
  const includePhotos = options.includePhotos !== false
  const doc = new jsPDF({ unit: 'pt', format: 'letter' })
  const PW = doc.internal.pageSize.getWidth() // 612
  const PH = doc.internal.pageSize.getHeight() // 792
  const M = 48
  const CW = PW - M * 2
  let y = M

  const ensure = space => {
    if (y + space > PH - M) {
      doc.addPage()
      y = M
    }
  }

  // ── Header ──────────────────────────────────────────────────────────────
  // Optional company logo (top-right).
  let logo = null
  if (company.logoUrl) {
    onProgress?.('Loading logo…')
    logo = await loadImage(company.logoUrl, 240, 0.9)
  }
  if (logo) {
    const lw = 90
    const lh = (logo.height / logo.width) * lw
    try {
      doc.addImage(logo.dataUrl, 'JPEG', PW - M - lw, y, lw, Math.min(lh, 54))
    } catch {
      /* ignore */
    }
  }

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(20)
  doc.setTextColor(...BRAND)
  doc.text(company.name || 'Daily Log Report', M, y + 16)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(11)
  doc.setTextColor(80, 80, 80)
  doc.text('Daily Log Report', M, y + 34)
  y += 56

  // Job / client block
  doc.setDrawColor(...LIGHT)
  doc.setLineWidth(1)
  doc.line(M, y, PW - M, y)
  y += 18

  const jobName = job.name || job.client_name || 'Job'
  const addr = [job.job_address, job.job_city, job.job_state, job.job_zip].filter(Boolean).join(', ')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.setTextColor(30, 30, 30)
  doc.text(jobName, M, y)
  y += 16
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(...GREY)
  if (job.client_name && job.client_name !== jobName) {
    doc.text(`Client: ${job.client_name}`, M, y)
    y += 13
  }
  if (addr) {
    doc.text(addr, M, y)
    y += 13
  }
  const meta = []
  if (options.rangeLabel) meta.push(options.rangeLabel)
  meta.push(`${logs.length} log${logs.length === 1 ? '' : 's'}`)
  meta.push(`Generated ${new Date().toLocaleDateString('en-US')}`)
  doc.text(meta.join('  •  '), M, y)
  y += 10
  doc.line(M, y, PW - M, y)
  y += 22

  if (!logs.length) {
    doc.setFontSize(11)
    doc.setTextColor(...GREY)
    doc.text('No daily logs in the selected range.', M, y)
  }

  // ── Logs ────────────────────────────────────────────────────────────────
  for (let li = 0; li < logs.length; li++) {
    const log = logs[li]
    onProgress?.(`Building log ${li + 1} of ${logs.length}…`)

    ensure(58)
    // Date heading with a green tab
    doc.setFillColor(...BRAND)
    doc.rect(M, y - 9, 4, 16, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.setTextColor(30, 30, 30)
    doc.text(fmtDate(log.date), M + 12, y + 3)
    // Author (right side)
    if (log.authorName) {
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      doc.setTextColor(...GREY)
      doc.text(log.authorName, PW - M, y + 3, { align: 'right' })
    }
    y += 20

    // Weather
    if (log.weather_conditions && log.weather_notes) {
      doc.setFont('helvetica', 'italic')
      doc.setFontSize(9)
      doc.setTextColor(...GREY)
      const wlines = doc.splitTextToSize(`Weather: ${log.weather_notes}`, CW)
      for (const ln of wlines) {
        ensure(13)
        doc.text(ln, M + 12, y)
        y += 12
      }
      y += 2
    }

    // Notes
    if (log.notes) {
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(10.5)
      doc.setTextColor(45, 45, 45)
      const lines = doc.splitTextToSize(log.notes, CW - 12)
      for (const ln of lines) {
        ensure(14)
        doc.text(ln, M + 12, y)
        y += 14
      }
      y += 4
    }

    // Photos (2-up grid, contained in fixed-height cells)
    if (includePhotos && log.photoUrls && log.photoUrls.length) {
      const gap = 12
      const colW = (CW - gap) / 2
      const cellH = 190
      const imgs = []
      for (let pi = 0; pi < log.photoUrls.length; pi++) {
        onProgress?.(`Loading photo ${pi + 1}/${log.photoUrls.length} (log ${li + 1}/${logs.length})…`)
        const im = await loadImage(log.photoUrls[pi].url)
        if (im) imgs.push(im)
      }
      let rowStartY = y
      for (let i = 0; i < imgs.length; i++) {
        const col = i % 2
        if (col === 0) {
          ensure(cellH + 10)
          rowStartY = y
        }
        const ph = imgs[i]
        const ar = ph.width / ph.height || 1.33
        let w = colW
        let h = w / ar
        if (h > cellH) {
          h = cellH
          w = h * ar
        }
        const cellX = M + col * (colW + gap)
        const offX = cellX + (colW - w) / 2
        const offY = rowStartY + (cellH - h) / 2
        try {
          doc.addImage(ph.dataUrl, 'JPEG', offX, offY, w, h)
        } catch {
          /* skip */
        }
        if (col === 1 || i === imgs.length - 1) {
          y = rowStartY + cellH + 10
        }
      }
    }

    y += 10
    // Separator between logs
    if (li < logs.length - 1) {
      ensure(14)
      doc.setDrawColor(...LIGHT)
      doc.setLineWidth(0.5)
      doc.line(M, y, PW - M, y)
      y += 16
    }
  }

  // ── Footers (page numbers) ───────────────────────────────────────────────
  const pages = doc.getNumberOfPages()
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...GREY)
    doc.text(`${jobName} — Daily Log Report`, M, PH - 24)
    doc.text(`Page ${i} of ${pages}`, PW - M, PH - 24, { align: 'right' })
  }

  onProgress?.('Finalizing…')
  const safeName = jobName.replace(/[^\w\- ]+/g, '').trim() || 'Job'
  const range = options.rangeLabel ? ` ${options.rangeLabel.replace(/[^\w\- ]+/g, '')}` : ''
  const filename = `${safeName} - Daily Logs${range}.pdf`
  doc.save(filename)
  return doc.output('blob')
}
