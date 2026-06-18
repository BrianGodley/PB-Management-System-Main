// src/components/DocCreator.jsx
//
// "Doc Creator" — a blank-document workspace inside the Documents module.
// Three creators selectable from buttons at the top:
//   • Document  → rich-text editor, downloads as Word (.doc)
//   • PDF       → same rich-text editor, downloads as PDF
//   • Spreadsheet → editable grid, downloads as Excel (.xlsx) or CSV
//
// No new dependencies: Word uses the HTML-in-.doc trick (opens natively in
// Word), PDF uses jsPDF + html2canvas (already installed), Excel uses SheetJS
// loaded from CDN on demand (same source the Statistics export uses).

import { useState, useRef, useEffect } from 'react'
import { jsPDF } from 'jspdf'

const MODES = [
  ['doc', '📄 Document'],
  ['pdf', '📕 PDF'],
  ['sheet', '📊 Spreadsheet'],
]

function safeName(s) {
  return (s || '').replace(/[^\w\- ]+/g, '').trim()
}
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

export default function DocCreator() {
  const [mode, setMode] = useState('doc')

  return (
    <div className="flex flex-col h-full">
      {/* Creator selector */}
      <div className="flex items-center justify-center gap-2 flex-shrink-0 mb-4">
        {MODES.map(([key, label]) => (
          <button
            key={key}
            onClick={() => setMode(key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
              mode === key
                ? 'bg-green-700 text-white border-green-700'
                : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
        {/* Keyed so switching modes starts a fresh blank document */}
        {(mode === 'doc' || mode === 'pdf') && <RichTextCreator key={mode} mode={mode} />}
        {mode === 'sheet' && <SheetCreator key="sheet" />}
      </div>
    </div>
  )
}

// ── Rich text (Document + PDF) ────────────────────────────────
const FONTS = ['Arial', 'Calibri', 'Times New Roman', 'Georgia', 'Courier New', 'Verdana', 'Trebuchet MS', 'Tahoma', 'Comic Sans MS']
const FONT_SIZES = [10, 11, 12, 14, 16, 18, 24, 28, 36, 48, 72]

export function RichTextCreator({ mode, initialTitle = '', initialHtml = '', onSave }) {
  const [title, setTitle] = useState(initialTitle)
  const [busy, setBusy] = useState('')
  const editorRef = useRef(null)
  const pageRef = useRef(null)
  const savedRange = useRef(null)

  // Seed the editor with the opened file's content (once on mount).
  useEffect(() => {
    if (editorRef.current && initialHtml) editorRef.current.innerHTML = initialHtml
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Save/restore the caret so toolbar dropdowns & color pickers (which steal
  // focus) still apply to the text you had selected.
  const saveSel = () => {
    const s = window.getSelection()
    if (s && s.rangeCount && editorRef.current?.contains(s.anchorNode)) savedRange.current = s.getRangeAt(0)
  }
  const restoreSel = () => {
    const r = savedRange.current
    if (r) {
      const s = window.getSelection()
      s.removeAllRanges()
      s.addRange(r)
    }
    editorRef.current?.focus()
  }

  const cmd = (command, value = null) => {
    document.execCommand('styleWithCSS', false, true)
    document.execCommand(command, false, value)
    editorRef.current?.focus()
    saveSel()
  }

  const applyFont = f => {
    if (!f) return
    restoreSel()
    document.execCommand('fontName', false, f)
    saveSel()
  }
  // Reliable px font-size: execCommand only supports 1–7, so we tag with size 7
  // then rewrite those nodes to the real px value.
  const applyFontSize = px => {
    if (!px) return
    restoreSel()
    document.execCommand('styleWithCSS', false, true)
    document.execCommand('fontSize', false, '7')
    editorRef.current?.querySelectorAll('font[size="7"]').forEach(el => {
      el.removeAttribute('size')
      el.style.fontSize = px + 'px'
    })
    saveSel()
  }
  const applyColor = (kind, val) => {
    restoreSel()
    document.execCommand('styleWithCSS', false, true)
    if (kind === 'text') document.execCommand('foreColor', false, val)
    else if (!document.execCommand('hiliteColor', false, val)) document.execCommand('backColor', false, val)
    saveSel()
  }
  const addLink = () => {
    restoreSel()
    const url = window.prompt('Link URL (https://…):')
    if (url) document.execCommand('createLink', false, url)
    saveSel()
  }

  function downloadWord() {
    const body = editorRef.current?.innerHTML || ''
    const header =
      "<html xmlns:o='urn:schemas-microsoft-com:office:office' " +
      "xmlns:w='urn:schemas-microsoft-com:office:word' " +
      "xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'>" +
      `<title>${title || 'Document'}</title></head><body>` +
      (title ? `<h1>${title}</h1>` : '')
    const blob = new Blob(['﻿', header + body + '</body></html>'], { type: 'application/msword' })
    triggerDownload(blob, `${safeName(title) || 'Document'}.doc`)
  }

  async function downloadPdf() {
    setBusy('Building PDF…')
    try {
      const html2canvas = (await import('html2canvas')).default
      const node = pageRef.current
      const canvas = await html2canvas(node, { scale: 2, backgroundColor: '#ffffff', useCORS: true })
      const pdf = new jsPDF({ unit: 'pt', format: 'letter' })
      const pw = pdf.internal.pageSize.getWidth()
      const ph = pdf.internal.pageSize.getHeight()
      const margin = 36
      const imgW = pw - margin * 2
      const ratio = imgW / canvas.width
      const pageCanvasH = (ph - margin * 2) / ratio
      let sY = 0
      let first = true
      while (sY < canvas.height) {
        const sliceH = Math.min(pageCanvasH, canvas.height - sY)
        const slice = document.createElement('canvas')
        slice.width = canvas.width
        slice.height = sliceH
        slice.getContext('2d').drawImage(canvas, 0, sY, canvas.width, sliceH, 0, 0, canvas.width, sliceH)
        const img = slice.toDataURL('image/jpeg', 0.88)
        if (!first) pdf.addPage()
        pdf.addImage(img, 'JPEG', margin, margin, imgW, sliceH * ratio)
        first = false
        sY += sliceH
      }
      pdf.save(`${safeName(title) || 'Document'}.pdf`)
    } catch (e) {
      alert('Could not build the PDF: ' + (e?.message || 'unknown error'))
    } finally {
      setBusy('')
    }
  }

  const ToolBtn = ({ onClick, children, title: tip }) => (
    <button
      type="button"
      title={tip}
      onMouseDown={e => e.preventDefault()}
      onClick={onClick}
      className="px-2.5 py-1 rounded text-sm text-gray-700 hover:bg-gray-100 border border-transparent hover:border-gray-200"
    >
      {children}
    </button>
  )

  return (
    <div className="max-w-4xl mx-auto">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1 bg-white border border-gray-200 rounded-lg px-2 py-1.5 mb-3 sticky top-0 z-10">
        <ToolBtn onClick={() => cmd('undo')} title="Undo">↶</ToolBtn>
        <ToolBtn onClick={() => cmd('redo')} title="Redo">↷</ToolBtn>
        <span className="w-px h-5 bg-gray-200 mx-1" />

        {/* Font + size */}
        <select
          title="Font"
          defaultValue=""
          onMouseDown={saveSel}
          onChange={e => { applyFont(e.target.value); e.target.value = '' }}
          className="text-xs border border-gray-200 rounded px-1 py-1 bg-white text-gray-700 max-w-[120px]"
        >
          <option value="" disabled>Font</option>
          {FONTS.map(f => (
            <option key={f} value={f} style={{ fontFamily: f }}>{f}</option>
          ))}
        </select>
        <select
          title="Font size"
          defaultValue=""
          onMouseDown={saveSel}
          onChange={e => { applyFontSize(e.target.value); e.target.value = '' }}
          className="text-xs border border-gray-200 rounded px-1 py-1 bg-white text-gray-700 w-14"
        >
          <option value="" disabled>Size</option>
          {FONT_SIZES.map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <span className="w-px h-5 bg-gray-200 mx-1" />

        {/* Inline styles */}
        <ToolBtn onClick={() => cmd('bold')} title="Bold"><b>B</b></ToolBtn>
        <ToolBtn onClick={() => cmd('italic')} title="Italic"><i>I</i></ToolBtn>
        <ToolBtn onClick={() => cmd('underline')} title="Underline"><u>U</u></ToolBtn>
        <ToolBtn onClick={() => cmd('strikeThrough')} title="Strikethrough"><s>S</s></ToolBtn>

        {/* Colors */}
        <label title="Text color" onMouseDown={saveSel} className="relative px-1.5 py-1 rounded hover:bg-gray-100 cursor-pointer text-sm font-semibold leading-none flex items-center" style={{ textDecoration: 'underline', textDecorationColor: '#dc2626', textDecorationThickness: 2 }}>
          A
          <input type="color" defaultValue="#111111" onChange={e => applyColor('text', e.target.value)} className="absolute inset-0 opacity-0 w-full h-full cursor-pointer" />
        </label>
        <label title="Highlight" onMouseDown={saveSel} className="relative px-1.5 py-1 rounded hover:bg-gray-100 cursor-pointer text-sm leading-none flex items-center bg-yellow-200/70">
          H
          <input type="color" defaultValue="#ffeb3b" onChange={e => applyColor('highlight', e.target.value)} className="absolute inset-0 opacity-0 w-full h-full cursor-pointer" />
        </label>
        <span className="w-px h-5 bg-gray-200 mx-1" />

        {/* Blocks */}
        <ToolBtn onClick={() => cmd('formatBlock', 'H1')} title="Heading 1">H1</ToolBtn>
        <ToolBtn onClick={() => cmd('formatBlock', 'H2')} title="Heading 2">H2</ToolBtn>
        <ToolBtn onClick={() => cmd('formatBlock', 'H3')} title="Heading 3">H3</ToolBtn>
        <ToolBtn onClick={() => cmd('formatBlock', 'P')} title="Normal text">¶</ToolBtn>
        <ToolBtn onClick={() => cmd('formatBlock', 'BLOCKQUOTE')} title="Quote">❝</ToolBtn>
        <span className="w-px h-5 bg-gray-200 mx-1" />

        {/* Lists + indent */}
        <ToolBtn onClick={() => cmd('insertUnorderedList')} title="Bullet list">• List</ToolBtn>
        <ToolBtn onClick={() => cmd('insertOrderedList')} title="Numbered list">1. List</ToolBtn>
        <ToolBtn onClick={() => cmd('outdent')} title="Decrease indent">⇤</ToolBtn>
        <ToolBtn onClick={() => cmd('indent')} title="Increase indent">⇥</ToolBtn>
        <span className="w-px h-5 bg-gray-200 mx-1" />

        {/* Align */}
        <ToolBtn onClick={() => cmd('justifyLeft')} title="Align left">⯇</ToolBtn>
        <ToolBtn onClick={() => cmd('justifyCenter')} title="Center">≡</ToolBtn>
        <ToolBtn onClick={() => cmd('justifyRight')} title="Align right">⯈</ToolBtn>
        <ToolBtn onClick={() => cmd('justifyFull')} title="Justify">▤</ToolBtn>
        <span className="w-px h-5 bg-gray-200 mx-1" />

        {/* Insert / clear */}
        <ToolBtn onClick={addLink} title="Insert link">🔗</ToolBtn>
        <ToolBtn onClick={() => cmd('insertHorizontalRule')} title="Divider line">―</ToolBtn>
        <ToolBtn onClick={() => cmd('removeFormat')} title="Clear formatting">⌫</ToolBtn>

        <div className="ml-auto flex items-center gap-2 pl-2">
          {busy && <span className="text-xs text-gray-500">{busy}</span>}
          <button onClick={downloadWord} className="btn-secondary text-xs px-3 py-1.5">Word</button>
          <button onClick={downloadPdf} disabled={!!busy} className="btn-secondary text-xs px-3 py-1.5">PDF</button>
          {onSave && (
            <button
              onClick={async () => {
                setBusy('Saving…')
                try {
                  await onSave(editorRef.current?.innerHTML || '')
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

      {/* Page */}
      <div ref={pageRef} className="bg-white shadow-sm border border-gray-200 rounded-lg mx-auto p-10" style={{ minHeight: 600 }}>
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Document title…"
          className="w-full text-2xl font-bold text-gray-900 outline-none mb-4 placeholder-gray-300"
        />
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onKeyUp={saveSel}
          onMouseUp={saveSel}
          onBlur={saveSel}
          className="prose-sm max-w-none outline-none text-gray-800 leading-relaxed min-h-[420px] doc-creator-body"
          style={{ fontSize: 15 }}
          data-placeholder="Start typing…"
        />
      </div>

      {/* Minimal styling for headings/lists inside the editable area + placeholder */}
      <style>{`
        .doc-creator-body:empty:before { content: attr(data-placeholder); color: #c8c8c8; }
        .doc-creator-body h1 { font-size: 1.6em; font-weight: 700; margin: .4em 0; }
        .doc-creator-body h2 { font-size: 1.3em; font-weight: 700; margin: .4em 0; }
        .doc-creator-body ul { list-style: disc; padding-left: 1.5em; }
        .doc-creator-body ol { list-style: decimal; padding-left: 1.5em; }
        .doc-creator-body p { margin: .35em 0; }
      `}</style>
    </div>
  )
}

// ── Spreadsheet ───────────────────────────────────────────────
const COL_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')

function loadSheetJS() {
  return new Promise((resolve, reject) => {
    if (window.XLSX) return resolve(window.XLSX)
    const s = document.createElement('script')
    s.src = 'https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js'
    s.onload = () => resolve(window.XLSX)
    s.onerror = () => reject(new Error('Could not load spreadsheet engine'))
    document.head.appendChild(s)
  })
}

export function SheetCreator({ initialTitle = '', initialGrid = null, onSave }) {
  const START_ROWS = 12
  const START_COLS = 6
  const [title, setTitle] = useState(initialTitle)
  const [grid, setGrid] = useState(() => {
    if (initialGrid && initialGrid.length) {
      const cols = Math.max(1, ...initialGrid.map(r => r.length))
      return initialGrid.map(r => {
        const row = r.map(c => (c == null ? '' : String(c)))
        while (row.length < cols) row.push('')
        return row
      })
    }
    return Array.from({ length: START_ROWS }, () => Array.from({ length: START_COLS }, () => ''))
  })
  const [busy, setBusy] = useState('')

  const cols = grid[0]?.length || 0

  const setCell = (r, c, v) =>
    setGrid(prev => prev.map((row, ri) => (ri === r ? row.map((cell, ci) => (ci === c ? v : cell)) : row)))
  const addRow = () => setGrid(prev => [...prev, Array.from({ length: cols }, () => '')])
  const addCol = () => setGrid(prev => prev.map(row => [...row, '']))

  function trimmedGrid() {
    // Drop fully-empty trailing rows/cols so exports aren't padded.
    let g = grid.map(r => [...r])
    while (g.length > 1 && g[g.length - 1].every(c => !String(c).trim())) g.pop()
    let maxC = 0
    g.forEach(r => r.forEach((c, i) => { if (String(c).trim()) maxC = Math.max(maxC, i + 1) }))
    maxC = Math.max(maxC, 1)
    g = g.map(r => r.slice(0, maxC))
    return g
  }

  async function downloadXlsx() {
    setBusy('Building Excel…')
    try {
      const XLSX = await loadSheetJS()
      const ws = XLSX.utils.aoa_to_sheet(trimmedGrid())
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Sheet1')
      XLSX.writeFile(wb, `${safeName(title) || 'Spreadsheet'}.xlsx`)
    } catch (e) {
      alert('Could not build the spreadsheet: ' + (e?.message || 'unknown error'))
    } finally {
      setBusy('')
    }
  }

  function downloadCsv() {
    const csv = trimmedGrid()
      .map(row =>
        row
          .map(cell => {
            const s = String(cell ?? '')
            return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
          })
          .join(',')
      )
      .join('\n')
    triggerDownload(new Blob([csv], { type: 'text/csv' }), `${safeName(title) || 'Spreadsheet'}.csv`)
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex flex-wrap items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2 mb-3">
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Spreadsheet name…"
          className="text-sm font-medium text-gray-900 outline-none placeholder-gray-300 flex-1 min-w-[140px]"
        />
        <button onClick={addRow} className="btn-secondary text-xs px-3 py-1.5">+ Row</button>
        <button onClick={addCol} className="btn-secondary text-xs px-3 py-1.5">+ Column</button>
        {busy && <span className="text-xs text-gray-500">{busy}</span>}
        <button onClick={downloadCsv} className="btn-secondary text-xs px-3 py-1.5">CSV</button>
        <button onClick={downloadXlsx} disabled={!!busy} className={`text-xs px-3 py-1.5 ${onSave ? 'btn-secondary' : 'btn-primary'}`}>Excel</button>
        {onSave && (
          <button
            onClick={async () => {
              setBusy('Saving…')
              try {
                await onSave(trimmedGrid())
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

      <div className="bg-white border border-gray-200 rounded-lg overflow-auto">
        <table className="border-collapse">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 bg-gray-50 border border-gray-200 w-10" />
              {Array.from({ length: cols }).map((_, c) => (
                <th key={c} className="bg-gray-50 border border-gray-200 text-xs font-semibold text-gray-500 px-2 py-1 min-w-[110px]">
                  {COL_LETTERS[c] || `C${c + 1}`}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {grid.map((row, r) => (
              <tr key={r}>
                <td className="sticky left-0 z-10 bg-gray-50 border border-gray-200 text-xs text-gray-400 text-center">{r + 1}</td>
                {row.map((cell, c) => (
                  <td key={c} className="border border-gray-200 p-0">
                    <input
                      value={cell}
                      onChange={e => setCell(r, c, e.target.value)}
                      className="w-full px-2 py-1 text-sm outline-none focus:bg-green-50"
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
