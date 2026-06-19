// src/lib/extractDocText.js
// Extract plain text from an uploaded File in the browser, so we can feed
// training documents to the generate-checksheet edge function.
//
//   • PDF   → react-pdf's bundled pdfjs (getDocument → page.getTextContent)
//   • DOCX  → mammoth.extractRawText
//   • TXT/MD/CSV → read as text
//
// pdfjs comes from react-pdf (same instance the rest of the app uses) so the
// worker version always matches what's already configured elsewhere.
import { pdfjs } from 'react-pdf'

pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`

async function extractPdf(file) {
  const buf = await file.arrayBuffer()
  const pdf = await pdfjs.getDocument({ data: buf }).promise
  const pages = []
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    const text = content.items.map(it => ('str' in it ? it.str : '')).join(' ')
    pages.push(text)
  }
  return pages.join('\n\n')
}

async function extractDocx(file) {
  // Lazy import so mammoth (and its deps) only load when actually needed.
  const mammoth = await import('mammoth')
  const buf = await file.arrayBuffer()
  const { value } = await mammoth.extractRawText({ arrayBuffer: buf })
  return value || ''
}

/**
 * Extract text from a File. Returns a trimmed string (may be empty).
 * Throws an Error with a friendly message on unsupported types / failures.
 */
export async function extractDocText(file) {
  if (!file) return ''
  const name = (file.name || '').toLowerCase()
  const type = file.type || ''

  try {
    if (name.endsWith('.pdf') || type === 'application/pdf') {
      return (await extractPdf(file)).trim()
    }
    if (
      name.endsWith('.docx') ||
      type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ) {
      return (await extractDocx(file)).trim()
    }
    if (name.endsWith('.doc')) {
      throw new Error(
        'Old .doc files aren’t supported — please save it as .docx or PDF and upload again.'
      )
    }
    if (name.match(/\.(txt|md|csv|rtf)$/) || type.startsWith('text/')) {
      return (await file.text()).trim()
    }
  } catch (err) {
    throw new Error(`Couldn’t read “${file.name}”: ${err.message || err}`)
  }

  throw new Error(
    `“${file.name}” is an unsupported file type. Upload a PDF, Word (.docx), or text file.`
  )
}
