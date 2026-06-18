// src/components/files/PdfFieldEditor.jsx
//
// Place fillable fields on any PDF (same place/drag/resize UX as the e-doc
// editor, minus signer roles). On save it hands the field list back to the
// caller, which embeds real AcroForm fields with pdf-lib and writes a fillable
// PDF back to the Drive.
//
// Field shape: { id, page, xPct, yPct, wPct, hPct, type, label }
import { useState } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'

pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`

const FIELD_TYPES = {
  text: { label: 'Text', icon: '🅣', defW: 24, defH: 3.5, box: 'border-blue-500 bg-blue-100/50 text-blue-800' },
  date: { label: 'Date', icon: '📅', defW: 16, defH: 3.5, box: 'border-violet-500 bg-violet-100/50 text-violet-800' },
  checkbox: { label: 'Checkbox', icon: '☑', defW: 4, defH: 2.6, box: 'border-emerald-600 bg-emerald-100/50 text-emerald-800' },
  signature: { label: 'Signature', icon: '✍️', defW: 26, defH: 6, box: 'border-amber-500 bg-amber-100/50 text-amber-800' },
}
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v))

export default function PdfFieldEditor({ url, title = 'PDF', initialFields = [], onClose, onSave }) {
  const [numPages, setNumPages] = useState(0)
  const [fields, setFields] = useState(Array.isArray(initialFields) ? initialFields : [])
  const [addType, setAddType] = useState('text')
  const [placing, setPlacing] = useState(false)
  const [selectedId, setSelectedId] = useState(null)
  const [pageWidth, setPageWidth] = useState(720)
  const [saving, setSaving] = useState(false)
  const [loadError, setLoadError] = useState(null)

  const selected = fields.find(f => f.id === selectedId) || null
  const updateField = (id, patch) => setFields(prev => prev.map(f => (f.id === id ? { ...f, ...patch } : f)))
  const deleteField = id => {
    setFields(prev => prev.filter(f => f.id !== id))
    if (selectedId === id) setSelectedId(null)
  }

  function onOverlayClick(e, page) {
    if (!placing) return
    const rect = e.currentTarget.getBoundingClientRect()
    const t = FIELD_TYPES[addType]
    const xPct = clamp(((e.clientX - rect.left) / rect.width) * 100 - t.defW / 2, 0, 100 - t.defW)
    const yPct = clamp(((e.clientY - rect.top) / rect.height) * 100 - t.defH / 2, 0, 100 - t.defH)
    const n = fields.length + 1
    const f = { id: crypto.randomUUID(), page, xPct, yPct, wPct: t.defW, hPct: t.defH, type: addType, label: `${t.label} ${n}` }
    setFields(prev => [...prev, f])
    setSelectedId(f.id)
    setPlacing(false)
  }

  function startDrag(e, f, mode) {
    e.stopPropagation()
    e.preventDefault()
    setSelectedId(f.id)
    const overlay = e.currentTarget.closest('[data-overlay]')
    if (!overlay) return
    const rect = overlay.getBoundingClientRect()
    const startX = e.clientX
    const startY = e.clientY
    const orig = { ...f }
    function move(ev) {
      const dxPct = ((ev.clientX - startX) / rect.width) * 100
      const dyPct = ((ev.clientY - startY) / rect.height) * 100
      setFields(prev =>
        prev.map(ff => {
          if (ff.id !== orig.id) return ff
          if (mode === 'move')
            return { ...ff, xPct: clamp(orig.xPct + dxPct, 0, 100 - ff.wPct), yPct: clamp(orig.yPct + dyPct, 0, 100 - ff.hPct) }
          return { ...ff, wPct: clamp(orig.wPct + dxPct, 3, 100 - ff.xPct), hPct: clamp(orig.hPct + dyPct, 2, 100 - ff.yPct) }
        })
      )
    }
    function up() {
      window.removeEventListener('mousemove', move)
      window.removeEventListener('mouseup', up)
    }
    window.addEventListener('mousemove', move)
    window.addEventListener('mouseup', up)
  }

  async function handleSave() {
    if (!fields.length) {
      alert('Add at least one field first.')
      return
    }
    setSaving(true)
    try {
      await onSave(fields)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[85] bg-black/50 flex" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      {/* Left toolbar */}
      <div className="w-64 bg-white h-full flex flex-col border-r border-gray-200 flex-shrink-0">
        <div className="px-4 py-3 border-b border-gray-200">
          <p className="text-xs font-semibold text-green-700 uppercase tracking-wide">Add Fillable Fields</p>
          <p className="text-sm font-bold text-gray-900 truncate">{title}</p>
        </div>

        <div className="p-4 space-y-4 overflow-y-auto flex-1">
          <div>
            <p className="text-[11px] font-semibold text-gray-500 uppercase mb-1">Field type</p>
            <div className="grid grid-cols-2 gap-1.5">
              {Object.entries(FIELD_TYPES).map(([k, t]) => (
                <button
                  key={k}
                  onClick={() => { setAddType(k); setPlacing(true) }}
                  className={`text-xs px-2 py-1.5 rounded-lg border text-left ${
                    addType === k && placing ? 'border-green-600 bg-green-50 text-green-800' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {t.icon} {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className={`text-[11px] rounded-lg px-3 py-2 ${placing ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-gray-50 text-gray-500 border border-gray-200'}`}>
            {placing ? `Click on the page to drop a ${FIELD_TYPES[addType].label} field.` : 'Pick a field type, then click the page to place it.'}
          </div>

          {selected && (
            <div className="border-t border-gray-200 pt-3 space-y-2">
              <p className="text-[11px] font-semibold text-gray-500 uppercase">Selected field</p>
              <label className="block">
                <span className="text-[11px] text-gray-500">Label / field name</span>
                <input value={selected.label} onChange={e => updateField(selected.id, { label: e.target.value })} className="input text-sm py-1 w-full" />
              </label>
              <div>
                <span className="text-[11px] text-gray-500">Size &amp; position (% of page)</span>
                <div className="grid grid-cols-2 gap-1.5 mt-1">
                  {[
                    ['wPct', 'Width', 3, 100 - selected.xPct],
                    ['hPct', 'Height', 2, 100 - selected.yPct],
                    ['xPct', 'X', 0, 100 - selected.wPct],
                    ['yPct', 'Y', 0, 100 - selected.hPct],
                  ].map(([key, lbl, lo, hi]) => (
                    <label key={key} className="flex items-center gap-1">
                      <span className="text-[10px] text-gray-400 w-10">{lbl}</span>
                      <input
                        type="number"
                        step="0.5"
                        value={Math.round((selected[key] || 0) * 10) / 10}
                        onChange={e => updateField(selected.id, { [key]: clamp(parseFloat(e.target.value) || 0, lo, hi) })}
                        className="input text-xs py-1 w-full"
                      />
                    </label>
                  ))}
                </div>
              </div>
              <button onClick={() => deleteField(selected.id)} className="w-full text-xs text-red-500 border border-red-200 rounded-lg py-1.5 hover:bg-red-50">
                Delete field
              </button>
            </div>
          )}

          <p className="text-[11px] text-gray-400">{fields.length} field{fields.length !== 1 ? 's' : ''} placed</p>
        </div>

        <div className="p-3 border-t border-gray-200 flex gap-2">
          <button onClick={onClose} disabled={saving} className="flex-1 text-sm border border-gray-300 rounded-lg py-2 text-gray-600 hover:bg-gray-50 disabled:opacity-50">
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving} className="flex-1 text-sm bg-green-700 text-white rounded-lg py-2 font-semibold hover:bg-green-800 disabled:opacity-50">
            {saving ? 'Saving…' : 'Save fillable PDF'}
          </button>
        </div>
      </div>

      {/* PDF canvas */}
      <div className="flex-1 h-full overflow-auto bg-gray-100 p-6">
        <div className="flex items-center justify-end gap-2 mb-3">
          <span className="text-[11px] text-gray-500">Zoom</span>
          <button onClick={() => setPageWidth(w => clamp(w - 80, 480, 1100))} className="w-7 h-7 rounded-md bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 font-bold leading-none">−</button>
          <button onClick={() => setPageWidth(w => clamp(w + 80, 480, 1100))} className="w-7 h-7 rounded-md bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 font-bold leading-none">+</button>
        </div>
        {loadError ? (
          <div className="text-center text-sm text-red-600 bg-white rounded-lg p-6 max-w-md mx-auto">Couldn't load the PDF. {loadError}</div>
        ) : (
          <Document
            file={url}
            onLoadSuccess={({ numPages: n }) => setNumPages(n)}
            onLoadError={e => setLoadError(e?.message || 'Unknown error')}
            loading={<p className="text-center text-sm text-gray-400 py-10">Loading PDF…</p>}
          >
            {Array.from({ length: numPages || 0 }, (_, i) => i + 1).map(n => (
              <div key={n} className="relative mx-auto mb-6 shadow-lg bg-white" style={{ width: pageWidth }}>
                <Page pageNumber={n} width={pageWidth} renderTextLayer={false} renderAnnotationLayer={false} />
                <div data-overlay onClick={e => onOverlayClick(e, n)} className={`absolute inset-0 ${placing ? 'cursor-crosshair' : ''}`}>
                  {fields.filter(f => f.page === n).map(f => {
                    const t = FIELD_TYPES[f.type] || FIELD_TYPES.text
                    const isSel = f.id === selectedId
                    return (
                      <div
                        key={f.id}
                        onMouseDown={e => startDrag(e, f, 'move')}
                        onClick={e => { e.stopPropagation(); setSelectedId(f.id) }}
                        style={{ left: `${f.xPct}%`, top: `${f.yPct}%`, width: `${f.wPct}%`, height: `${f.hPct}%` }}
                        className={`absolute border-2 rounded-sm cursor-move flex items-center justify-center overflow-hidden ${t.box} ${isSel ? 'ring-2 ring-offset-1 ring-gray-800' : ''}`}
                        title={f.label}
                      >
                        <span className="text-[9px] font-semibold leading-none px-1 truncate pointer-events-none">{t.icon} {f.label}</span>
                        <span onMouseDown={e => startDrag(e, f, 'resize')} className="absolute -right-1 -bottom-1 w-3 h-3 bg-white border-2 border-gray-700 rounded-sm cursor-se-resize" />
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </Document>
        )}
      </div>
    </div>
  )
}
