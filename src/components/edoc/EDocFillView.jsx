// src/components/edoc/EDocFillView.jsx
// Shared "fill the document" renderer. Renders a PDF with react-pdf and overlays
// the template's fields. Fields whose role matches `fillRole` are interactive
// (text/date inputs, checkbox, or a signature pad for signature/initials);
// every other field shows read-only. Used by both the staff prepare view
// (fillRole="contractor") and the public signer page (fillRole="buyer").
import { useRef, useState, useEffect } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'

pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`

// ── Minimal canvas signature pad ──────────────────────────────────────────────
function SignaturePad({ onDone, onCancel }) {
  const canvasRef = useRef(null)
  const drawing = useRef(false)
  const dirty = useRef(false)

  useEffect(() => {
    const c = canvasRef.current
    if (!c) return
    const ctx = c.getContext('2d')
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, c.width, c.height)
    ctx.strokeStyle = '#111'
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
  }, [])

  function pos(e) {
    const c = canvasRef.current
    const rect = c.getBoundingClientRect()
    const t = e.touches ? e.touches[0] : e
    return { x: ((t.clientX - rect.left) / rect.width) * c.width, y: ((t.clientY - rect.top) / rect.height) * c.height }
  }
  function start(e) {
    e.preventDefault()
    drawing.current = true
    const ctx = canvasRef.current.getContext('2d')
    const p = pos(e)
    ctx.beginPath()
    ctx.moveTo(p.x, p.y)
  }
  function move(e) {
    if (!drawing.current) return
    e.preventDefault()
    const ctx = canvasRef.current.getContext('2d')
    const p = pos(e)
    ctx.lineTo(p.x, p.y)
    ctx.stroke()
    dirty.current = true
  }
  function end() {
    drawing.current = false
  }
  function clear() {
    const c = canvasRef.current
    const ctx = c.getContext('2d')
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, c.width, c.height)
    dirty.current = false
  }

  return (
    <div className="fixed inset-0 z-[80] bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-5">
        <p className="font-bold text-gray-900 mb-1">Sign here</p>
        <p className="text-xs text-gray-500 mb-3">Draw your signature with your mouse or finger.</p>
        <canvas
          ref={canvasRef}
          width={460}
          height={180}
          onMouseDown={start}
          onMouseMove={move}
          onMouseUp={end}
          onMouseLeave={end}
          onTouchStart={start}
          onTouchMove={move}
          onTouchEnd={end}
          className="w-full border-2 border-dashed border-gray-300 rounded-lg touch-none"
        />
        <div className="flex gap-2 mt-3">
          <button onClick={clear} className="text-sm border border-gray-300 rounded-lg px-3 py-2 text-gray-600 hover:bg-gray-50">
            Clear
          </button>
          <button onClick={onCancel} className="text-sm border border-gray-300 rounded-lg px-3 py-2 text-gray-600 hover:bg-gray-50 ml-auto">
            Cancel
          </button>
          <button
            onClick={() => {
              if (!dirty.current) {
                alert('Please draw your signature first.')
                return
              }
              onDone(canvasRef.current.toDataURL('image/png'))
            }}
            className="text-sm bg-green-700 text-white rounded-lg px-4 py-2 font-semibold hover:bg-green-800"
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  )
}

export default function EDocFillView({
  url,
  numPages: initialPages = 0,
  fields = [],
  values = {},
  setValues,
  fillRole,
  pageWidth = 720,
}) {
  const [numPages, setNumPages] = useState(initialPages)
  const [sigFieldId, setSigFieldId] = useState(null)
  const [loadError, setLoadError] = useState(null)

  const set = (id, v) => setValues(prev => ({ ...prev, [id]: v }))

  function renderField(f) {
    const editable = f.role === fillRole
    const val = values[f.id]
    const common = {
      style: {
        position: 'absolute',
        left: `${f.xPct}%`,
        top: `${f.yPct}%`,
        width: `${f.wPct}%`,
        height: `${f.hPct}%`,
      },
    }

    if (f.type === 'signature' || f.type === 'initials') {
      return (
        <div key={f.id} {...common} className="flex items-center justify-center">
          {val ? (
            <img
              src={val}
              alt="signature"
              onClick={() => editable && setSigFieldId(f.id)}
              className={`max-h-full max-w-full object-contain ${editable ? 'cursor-pointer' : ''}`}
            />
          ) : editable ? (
            <button
              onClick={() => setSigFieldId(f.id)}
              className="w-full h-full border-2 border-blue-500 bg-blue-50/70 rounded text-[10px] font-semibold text-blue-700 hover:bg-blue-100"
            >
              ✍️ {f.label}
            </button>
          ) : (
            <div className="w-full h-full border border-dashed border-gray-300 rounded" />
          )}
        </div>
      )
    }

    if (f.type === 'checkbox') {
      return (
        <div key={f.id} {...common} className="flex items-center justify-center">
          <input
            type="checkbox"
            checked={!!val}
            disabled={!editable}
            onChange={e => set(f.id, e.target.checked)}
            className="w-full h-full accent-blue-600"
          />
        </div>
      )
    }

    // text / date
    return (
      <input
        key={f.id}
        {...common}
        type={f.type === 'date' ? 'date' : 'text'}
        value={val || ''}
        disabled={!editable}
        placeholder={f.label}
        onChange={e => set(f.id, e.target.value)}
        className={`text-[11px] px-1 rounded border ${
          editable
            ? 'border-blue-400 bg-blue-50/70 focus:outline-none focus:border-blue-600'
            : 'border-transparent bg-transparent text-gray-700'
        }`}
      />
    )
  }

  return (
    <div className="bg-gray-100 p-4 overflow-auto">
      {loadError ? (
        <div className="text-center text-sm text-red-600 bg-white rounded-lg p-6 max-w-md mx-auto">
          Couldn't load the document. {loadError}
        </div>
      ) : (
        <Document
          file={url}
          onLoadSuccess={({ numPages: n }) => setNumPages(n)}
          onLoadError={e => setLoadError(e?.message || 'Unknown error')}
          loading={<p className="text-center text-sm text-gray-400 py-10">Loading document…</p>}
        >
          {Array.from({ length: numPages || 0 }, (_, i) => i + 1).map(n => (
            <div key={n} className="relative mx-auto mb-6 shadow-lg bg-white" style={{ width: pageWidth }}>
              <Page pageNumber={n} width={pageWidth} renderTextLayer={false} renderAnnotationLayer={false} />
              <div className="absolute inset-0">{fields.filter(f => f.page === n).map(renderField)}</div>
            </div>
          ))}
        </Document>
      )}

      {sigFieldId && (
        <SignaturePad
          onCancel={() => setSigFieldId(null)}
          onDone={dataUrl => {
            set(sigFieldId, dataUrl)
            setSigFieldId(null)
          }}
        />
      )}
    </div>
  )
}
