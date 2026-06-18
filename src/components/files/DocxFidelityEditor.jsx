// src/components/files/DocxFidelityEditor.jsx
//
// High-fidelity .docx editor. Unlike the lightweight body-only importer,
// docx-preview renders the WHOLE document — header/footer bands, logos &
// images, tables, fonts and spacing — so letterhead-style docs come through
// looking right. The rendered area is made editable, with a basic toolbar,
// plus Word/PDF download and Save-to-Drive.

import { useEffect, useRef, useState } from 'react'
import { jsPDF } from 'jspdf'

const baseOf = name => name.replace(/\.[^.]+$/, '')
function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export default function DocxFidelityEditor({ blob, name, onSave }) {
  const hostRef = useRef(null)
  const [busy, setBusy] = useState('')
  const [err, setErr] = useState('')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const { renderAsync } = await import('docx-preview')
        if (cancelled || !hostRef.current) return
        hostRef.current.innerHTML = ''
        await renderAsync(blob, hostRef.current, undefined, {
          className: 'docx',
          inWrapper: true,
          ignoreLastRenderedPageBreak: true,
          ignoreHeight: true, // flow by content so letterheads don't show a tall empty page
          breakPages: false,
        })
        if (cancelled || !hostRef.current) return
        // Make every rendered page section editable (text, tables, header band).
        hostRef.current.setAttribute('contenteditable', 'true')
        hostRef.current.style.outline = 'none'
        hostRef.current.querySelectorAll('section.docx, .docx').forEach(el => {
          el.setAttribute('contenteditable', 'true')
          el.style.outline = 'none'
        })
      } catch (e) {
        if (!cancelled) setErr(e?.message || 'Could not render this document.')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [blob])

  const cmd = (c, v = null) => {
    document.execCommand(c, false, v)
    hostRef.current?.focus()
  }
  const html = () => hostRef.current?.innerHTML || ''

  function downloadWord() {
    const header =
      "<html xmlns:o='urn:schemas-microsoft-com:office:office' " +
      "xmlns:w='urn:schemas-microsoft-com:office:word' " +
      "xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'></head><body>"
    triggerDownload(new Blob(['﻿', header + html() + '</body></html>'], { type: 'application/msword' }), `${baseOf(name)}.doc`)
  }

  async function downloadPdf() {
    setBusy('Building PDF…')
    try {
      const html2canvas = (await import('html2canvas')).default
      const canvas = await html2canvas(hostRef.current, { scale: 2, backgroundColor: '#ffffff', useCORS: true })
      const pdf = new jsPDF({ unit: 'pt', format: 'letter' })
      const pw = pdf.internal.pageSize.getWidth()
      const ph = pdf.internal.pageSize.getHeight()
      const m = 24
      const imgW = pw - m * 2
      const ratio = imgW / canvas.width
      const pageCanvasH = (ph - m * 2) / ratio
      let sY = 0
      let first = true
      while (sY < canvas.height) {
        const sliceH = Math.min(pageCanvasH, canvas.height - sY)
        const slice = document.createElement('canvas')
        slice.width = canvas.width
        slice.height = sliceH
        slice.getContext('2d').drawImage(canvas, 0, sY, canvas.width, sliceH, 0, 0, canvas.width, sliceH)
        if (!first) pdf.addPage()
        pdf.addImage(slice.toDataURL('image/jpeg', 0.9), 'JPEG', m, m, imgW, sliceH * ratio)
        first = false
        sY += sliceH
      }
      pdf.save(`${baseOf(name)}.pdf`)
    } catch (e) {
      alert('Could not build the PDF: ' + (e?.message || 'unknown error'))
    } finally {
      setBusy('')
    }
  }

  const ToolBtn = ({ onClick, children, title }) => (
    <button
      type="button"
      title={title}
      onMouseDown={e => e.preventDefault()}
      onClick={onClick}
      className="px-2.5 py-1 rounded text-sm text-gray-700 hover:bg-gray-100 border border-transparent hover:border-gray-200"
    >
      {children}
    </button>
  )

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex flex-wrap items-center gap-1 bg-white border border-gray-200 rounded-lg px-2 py-1.5 mb-3 sticky top-0 z-10">
        <ToolBtn onClick={() => cmd('undo')} title="Undo">↶</ToolBtn>
        <ToolBtn onClick={() => cmd('redo')} title="Redo">↷</ToolBtn>
        <span className="w-px h-5 bg-gray-200 mx-1" />
        <ToolBtn onClick={() => cmd('bold')} title="Bold"><b>B</b></ToolBtn>
        <ToolBtn onClick={() => cmd('italic')} title="Italic"><i>I</i></ToolBtn>
        <ToolBtn onClick={() => cmd('underline')} title="Underline"><u>U</u></ToolBtn>
        <span className="w-px h-5 bg-gray-200 mx-1" />
        <ToolBtn onClick={() => cmd('insertUnorderedList')} title="Bullets">• List</ToolBtn>
        <ToolBtn onClick={() => cmd('insertOrderedList')} title="Numbered">1. List</ToolBtn>
        <ToolBtn onClick={() => cmd('justifyLeft')} title="Left">⯇</ToolBtn>
        <ToolBtn onClick={() => cmd('justifyCenter')} title="Center">≡</ToolBtn>
        <ToolBtn onClick={() => cmd('justifyRight')} title="Right">⯈</ToolBtn>

        <div className="ml-auto flex items-center gap-2 pl-2">
          {busy && <span className="text-xs text-gray-500">{busy}</span>}
          <button onClick={downloadWord} className="btn-secondary text-xs px-3 py-1.5">Word</button>
          <button onClick={downloadPdf} disabled={!!busy} className="btn-secondary text-xs px-3 py-1.5">PDF</button>
          {onSave && (
            <button
              onClick={async () => {
                setBusy('Saving…')
                try {
                  await onSave(html())
                } finally {
                  setBusy('')
                }
              }}
              disabled={!!busy}
              className="btn-primary text-xs px-3 py-1.5"
            >
              Save to Drive
            </button>
          )}
        </div>
      </div>

      {err ? (
        <div className="bg-white border border-gray-200 rounded-lg p-6 text-center text-sm text-gray-500">
          Couldn’t render this document. {err}
        </div>
      ) : (
        <div className="overflow-auto">
          <div ref={hostRef} />
        </div>
      )}

      {/* Override docx-preview's flex centering (which can clip/shove wide pages)
          with reliable margin-auto centering, and drop its grey padding. */}
      <style>{`
        .docx-wrapper { background: transparent !important; padding: 0 !important; display: block !important; }
        .docx-wrapper > section.docx { margin: 0 auto 16px auto !important; box-shadow: 0 1px 8px rgba(0,0,0,0.15); background:#fff; }
        section.docx:focus, .docx-wrapper:focus { outline: none; }
      `}</style>
    </div>
  )
}
