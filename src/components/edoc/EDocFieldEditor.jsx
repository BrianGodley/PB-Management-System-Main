// src/components/edoc/EDocFieldEditor.jsx
// PDF template field-placement editor (PandaDoc/DocuSign-style).
// Renders every page of a template's source PDF with react-pdf, then lets the
// user drop fillable fields onto the pages: pick a type + role, click to place,
// drag to move, corner-resize, and edit label/required/delete. Field positions
// are stored as percentages of the page box so they scale at any render width.
//
// Saved shape (edoc_templates.fields jsonb):
//   [{ id, page, xPct, yPct, wPct, hPct, type, role, label, key, required }]
import { useState } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import { supabase } from '../../lib/supabase'

// Worker from cdnjs (same CDN pattern the app uses for Leaflet). pdfjs.version
// resolves to the exact version react-pdf bundles, so the worker always matches.
pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`

const FIELD_TYPES = {
  text: { label: 'Text', icon: '🅣', defW: 24, defH: 3.5 },
  date: { label: 'Date', icon: '📅', defW: 16, defH: 3.5 },
  signature: { label: 'Signature', icon: '✍️', defW: 26, defH: 6 },
  initials: { label: 'Initials', icon: '🅘', defW: 10, defH: 5 },
  checkbox: { label: 'Checkbox', icon: '☑', defW: 4, defH: 2.6 },
}
const ROLES = {
  buyer: { label: 'Buyer (signer)', box: 'border-blue-500 bg-blue-100/50 text-blue-800' },
  contractor: { label: 'You (contractor)', box: 'border-green-600 bg-green-100/50 text-green-800' },
}

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v))

function defaultLabel(type, n) {
  const base = FIELD_TYPES[type]?.label || 'Field'
  return `${base} ${n}`
}

export default function EDocFieldEditor({ template, onClose, onSaved }) {
  const url = supabase.storage.from('edocuments').getPublicUrl(template.pdf_path).data.publicUrl
  const [numPages, setNumPages] = useState(template.page_count || 0)
  const [fields, setFields] = useState(Array.isArray(template.fields) ? template.fields : [])
  const [addType, setAddType] = useState('text')
  const [addRole, setAddRole] = useState('buyer')
  const [placing, setPlacing] = useState(false)
  const [selectedId, setSelectedId] = useState(null)
  const [pageWidth, setPageWidth] = useState(720)
  const [saving, setSaving] = useState(false)
  const [loadError, setLoadError] = useState(null)

  const selected = fields.find(f => f.id === selectedId) || null

  function updateField(id, patch) {
    setFields(prev => prev.map(f => (f.id === id ? { ...f, ...patch } : f)))
  }
  function deleteField(id) {
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
    const f = {
      id: crypto.randomUUID(),
      page,
      xPct,
      yPct,
      wPct: t.defW,
      hPct: t.defH,
      type: addType,
      role: addRole,
      label: defaultLabel(addType, n),
      key: `${addType}_${n}`,
      required: true,
    }
    setFields(prev => [...prev, f])
    setSelectedId(f.id)
    setPlacing(false)
  }

  // Shared drag handler for move + resize. mode: 'move' | 'resize'.
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
          if (mode === 'move') {
            return {
              ...ff,
              xPct: clamp(orig.xPct + dxPct, 0, 100 - ff.wPct),
              yPct: clamp(orig.yPct + dyPct, 0, 100 - ff.hPct),
            }
          }
          return {
            ...ff,
            wPct: clamp(orig.wPct + dxPct, 3, 100 - ff.xPct),
            hPct: clamp(orig.hPct + dyPct, 2, 100 - ff.yPct),
          }
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

  async function save() {
    setSaving(true)
    const { error } = await supabase
      .from('edoc_templates')
      .update({
        fields,
        page_count: numPages || template.page_count || 1,
        updated_at: new Date().toISOString(),
      })
      .eq('id', template.id)
    setSaving(false)
    if (error) {
      alert('Save failed: ' + error.message)
      return
    }
    onSaved?.()
  }

  return (
    <div className="fixed inset-0 z-[70] bg-black/50 flex">
      {/* Left toolbar */}
      <div className="w-64 bg-white h-full flex flex-col border-r border-gray-200 flex-shrink-0">
        <div className="px-4 py-3 border-b border-gray-200">
          <p className="text-xs font-semibold text-green-700 uppercase tracking-wide">Edit Fields</p>
          <p className="text-sm font-bold text-gray-900 truncate">{template.name}</p>
        </div>

        <div className="p-4 space-y-4 overflow-y-auto flex-1">
          <div>
            <p className="text-[11px] font-semibold text-gray-500 uppercase mb-1">Field type</p>
            <div className="grid grid-cols-2 gap-1.5">
              {Object.entries(FIELD_TYPES).map(([k, t]) => (
                <button
                  key={k}
                  onClick={() => {
                    setAddType(k)
                    setPlacing(true)
                  }}
                  className={`text-xs px-2 py-1.5 rounded-lg border text-left ${
                    addType === k && placing
                      ? 'border-green-600 bg-green-50 text-green-800'
                      : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {t.icon} {t.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-[11px] font-semibold text-gray-500 uppercase mb-1">Assigned to</p>
            <div className="flex gap-1.5">
              {Object.entries(ROLES).map(([k, r]) => (
                <button
                  key={k}
                  onClick={() => setAddRole(k)}
                  className={`flex-1 text-[11px] px-2 py-1.5 rounded-lg border ${
                    addRole === k ? r.box : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  {k === 'buyer' ? 'Buyer' : 'You'}
                </button>
              ))}
            </div>
          </div>

          <div
            className={`text-[11px] rounded-lg px-3 py-2 ${
              placing
                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                : 'bg-gray-50 text-gray-500 border border-gray-200'
            }`}
          >
            {placing
              ? `Click on the document to drop a ${FIELD_TYPES[addType].label} field.`
              : 'Pick a field type, then click on the page to place it.'}
          </div>

          {/* Selected field inspector */}
          {selected && (
            <div className="border-t border-gray-200 pt-3 space-y-2">
              <p className="text-[11px] font-semibold text-gray-500 uppercase">Selected field</p>
              <label className="block">
                <span className="text-[11px] text-gray-500">Label</span>
                <input
                  value={selected.label}
                  onChange={e => updateField(selected.id, { label: e.target.value })}
                  className="input text-sm py-1 w-full"
                />
              </label>

              {/* Precise size + position (percent of page) so boxes fit exactly. */}
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
                        onChange={e =>
                          updateField(selected.id, { [key]: clamp(parseFloat(e.target.value) || 0, lo, hi) })
                        }
                        className="input text-xs py-1 w-full"
                      />
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex gap-1.5">
                {Object.entries(ROLES).map(([k]) => (
                  <button
                    key={k}
                    onClick={() => updateField(selected.id, { role: k })}
                    className={`flex-1 text-[11px] px-2 py-1 rounded-lg border ${
                      selected.role === k ? ROLES[k].box : 'border-gray-200 text-gray-500'
                    }`}
                  >
                    {k === 'buyer' ? 'Buyer' : 'You'}
                  </button>
                ))}
              </div>
              <label className="flex items-center gap-2 text-xs text-gray-600">
                <input
                  type="checkbox"
                  checked={!!selected.required}
                  onChange={e => updateField(selected.id, { required: e.target.checked })}
                  className="accent-green-700"
                />
                Required
              </label>
              <button
                onClick={() => deleteField(selected.id)}
                className="w-full text-xs text-red-500 border border-red-200 rounded-lg py-1.5 hover:bg-red-50"
              >
                Delete field
              </button>
            </div>
          )}

          <p className="text-[11px] text-gray-400">
            {fields.length} field{fields.length !== 1 ? 's' : ''} placed
          </p>
        </div>

        <div className="p-3 border-t border-gray-200 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 text-sm border border-gray-300 rounded-lg py-2 text-gray-600 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="flex-1 text-sm bg-green-700 text-white rounded-lg py-2 font-semibold hover:bg-green-800 disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>

      {/* PDF canvas */}
      <div className="flex-1 h-full overflow-auto bg-gray-100 p-6">
        <div className="flex items-center justify-end gap-2 mb-3">
          <span className="text-[11px] text-gray-500">Zoom</span>
          <button
            onClick={() => setPageWidth(w => clamp(w - 80, 480, 1100))}
            className="w-7 h-7 rounded-md bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 font-bold leading-none"
          >
            −
          </button>
          <button
            onClick={() => setPageWidth(w => clamp(w + 80, 480, 1100))}
            className="w-7 h-7 rounded-md bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 font-bold leading-none"
          >
            +
          </button>
        </div>
        {loadError ? (
          <div className="text-center text-sm text-red-600 bg-white rounded-lg p-6 max-w-md mx-auto">
            Couldn't load the PDF. {loadError}
          </div>
        ) : (
          <Document
            file={url}
            onLoadSuccess={({ numPages: n }) => setNumPages(n)}
            onLoadError={e => setLoadError(e?.message || 'Unknown error')}
            loading={<p className="text-center text-sm text-gray-400 py-10">Loading PDF…</p>}
          >
            {Array.from({ length: numPages || 0 }, (_, i) => i + 1).map(n => (
              <div
                key={n}
                className="relative mx-auto mb-6 shadow-lg bg-white"
                style={{ width: pageWidth }}
              >
                <Page
                  pageNumber={n}
                  width={pageWidth}
                  renderTextLayer={false}
                  renderAnnotationLayer={false}
                />
                <div
                  data-overlay
                  onClick={e => onOverlayClick(e, n)}
                  className={`absolute inset-0 ${placing ? 'cursor-crosshair' : ''}`}
                >
                  {fields
                    .filter(f => f.page === n)
                    .map(f => {
                      const isSel = f.id === selectedId
                      const role = ROLES[f.role] || ROLES.buyer
                      return (
                        <div
                          key={f.id}
                          onMouseDown={e => startDrag(e, f, 'move')}
                          onClick={e => {
                            e.stopPropagation()
                            setSelectedId(f.id)
                          }}
                          style={{
                            left: `${f.xPct}%`,
                            top: `${f.yPct}%`,
                            width: `${f.wPct}%`,
                            height: `${f.hPct}%`,
                          }}
                          className={`absolute border-2 rounded-sm cursor-move flex items-center justify-center overflow-hidden ${role.box} ${
                            isSel ? 'ring-2 ring-offset-1 ring-gray-800' : ''
                          }`}
                          title={`${f.label} · ${role.label}`}
                        >
                          <span className="text-[9px] font-semibold leading-none px-1 truncate pointer-events-none">
                            {FIELD_TYPES[f.type]?.icon} {f.label}
                          </span>
                          {/* resize handle */}
                          <span
                            onMouseDown={e => startDrag(e, f, 'resize')}
                            className="absolute -right-1 -bottom-1 w-3 h-3 bg-white border-2 border-gray-700 rounded-sm cursor-se-resize"
                          />
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
