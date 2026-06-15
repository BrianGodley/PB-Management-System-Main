// src/lib/flattenEDoc.js
// Flatten an e-document: draw the captured field values + signatures onto the
// original PDF and return the finished bytes. Used to produce a downloadable,
// non-editable signed copy.
//
// Field coordinates are stored as percentages of the page box with the origin
// at the TOP-left (how they were placed over the react-pdf render). pdf-lib's
// coordinate origin is the BOTTOM-left, so we flip Y.
//
// Note: assumes unrotated pages (true for the standard contract templates). If
// a page has a non-zero /Rotate, placement would need extra handling.
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'

export async function flattenEDoc(pdfUrl, fields) {
  const srcBytes = await fetch(pdfUrl).then(r => {
    if (!r.ok) throw new Error('Could not fetch the source PDF.')
    return r.arrayBuffer()
  })
  const pdf = await PDFDocument.load(srcBytes)
  const font = await pdf.embedFont(StandardFonts.Helvetica)
  const pages = pdf.getPages()

  for (const f of fields || []) {
    const value = f.value
    if (value == null || value === '' || value === false) continue
    const page = pages[(f.page || 1) - 1]
    if (!page) continue
    const { width: pw, height: ph } = page.getSize()

    const x = (f.xPct / 100) * pw
    const wBox = (f.wPct / 100) * pw
    const hBox = (f.hPct / 100) * ph
    const yTop = (f.yPct / 100) * ph
    const yBottom = ph - yTop - hBox // bottom edge of the box, PDF coords

    if ((f.type === 'signature' || f.type === 'initials') && typeof value === 'string' && value.startsWith('data:image')) {
      try {
        const png = await pdf.embedPng(value)
        const scale = Math.min(wBox / png.width, hBox / png.height)
        const drawW = png.width * scale
        const drawH = png.height * scale
        page.drawImage(png, {
          x: x + (wBox - drawW) / 2,
          y: yBottom + (hBox - drawH) / 2,
          width: drawW,
          height: drawH,
        })
      } catch {
        // ignore a bad image; leave the field area blank
      }
    } else if (f.type === 'checkbox') {
      const size = Math.min(hBox * 0.9, 14)
      page.drawText('X', { x: x + wBox * 0.25, y: yBottom + hBox * 0.15, size, font, color: rgb(0, 0, 0) })
    } else {
      // text / date
      const size = Math.max(7, Math.min(hBox * 0.65, 11))
      page.drawText(String(value), {
        x: x + 2,
        y: yBottom + (hBox - size) / 2 + 1,
        size,
        font,
        color: rgb(0, 0, 0),
      })
    }
  }

  return pdf.save() // Uint8Array
}

// Build the merged [{...field, value}] array the flattener expects from a
// fields-with-values list and a values map (signer page case).
export function mergeFieldValues(fields, values) {
  return (fields || []).map(f => ({ ...f, value: values?.[f.id] ?? f.value ?? null }))
}

export function downloadBytes(bytes, filename) {
  const blob = new Blob([bytes], { type: 'application/pdf' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename.endsWith('.pdf') ? filename : `${filename}.pdf`
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
