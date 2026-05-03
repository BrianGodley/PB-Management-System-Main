import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────
const STATUS_STYLES = {
  pending:     'bg-yellow-50 text-yellow-800 border-yellow-300',
  in_progress: 'bg-blue-50 text-blue-800 border-blue-300',
  complete:    'bg-green-50 text-green-800 border-green-300',
}
const STATUS_LABELS = {
  pending:     'Pending',
  in_progress: 'In Progress',
  complete:    'Complete',
}
const STATUS_DOT = {
  pending:     'bg-yellow-400',
  in_progress: 'bg-blue-500',
  complete:    'bg-green-500',
}

function fieldHasValue(v) {
  if (v === undefined || v === null || v === '' || v === false) return false
  if (typeof v === 'number') return v !== 0
  if (typeof v === 'string') return v.trim() !== ''
  return true
}

function fmt(n) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n || 0)
}
function fmtHrs(n) {
  return `${parseFloat(n || 0).toFixed(1)} hrs`
}
function fmtDays(n) {
  const v = parseFloat(n || 0)
  return `${v % 1 === 0 ? v.toFixed(0) : v.toFixed(1)} MD`
}

// ─────────────────────────────────────────────────────────────────────────────
// New Work Order Modal
// ─────────────────────────────────────────────────────────────────────────────
function NewWorkOrderModal({ jobId, crewTypes, onSave, onClose }) {
  const [form, setForm] = useState({
    module_type: '', project_name: '', crew_type: '',
    is_subcontractor: false,
    man_days: '', labor_hours: '', labor_cost: '',
    material_cost: '', sub_cost: '', total_price: '',
    status: 'pending',
  })
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  async function handleSave() {
    if (!form.module_type.trim()) return
    setSaving(true)
    const { data, error } = await supabase
      .from('work_orders')
      .insert({
        job_id:           jobId,
        module_type:      form.module_type.trim(),
        project_name:     form.project_name.trim() || null,
        crew_type:        form.crew_type || null,
        is_subcontractor: form.is_subcontractor,
        man_days:         parseFloat(form.man_days)      || 0,
        labor_hours:      parseFloat(form.labor_hours)   || 0,
        labor_cost:       parseFloat(form.labor_cost)    || 0,
        material_cost:    parseFloat(form.material_cost) || 0,
        sub_cost:         parseFloat(form.sub_cost)      || 0,
        total_price:      parseFloat(form.total_price)   || 0,
        status:           form.status,
        is_manual:        true,
      })
      .select()
      .single()
    setSaving(false)
    if (!error && data) onSave(data)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 p-6 max-h-[90vh] overflow-y-auto">

        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-lg font-bold text-gray-900">New Work Order</h2>
            <p className="text-xs text-gray-400 mt-0.5">Manually created — independent of estimate or bid</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="label text-xs">Module Type <span className="text-red-400">*</span></label>
              <input
                className="input"
                value={form.module_type}
                onChange={e => set('module_type', e.target.value)}
                placeholder="e.g. Demolition, Masonry, Planting…"
                autoFocus
              />
            </div>
            <div>
              <label className="label text-xs">Project Name</label>
              <input className="input" value={form.project_name} onChange={e => set('project_name', e.target.value)} placeholder="Optional" />
            </div>
            <div>
              <label className="label text-xs">Crew Type</label>
              <select className="input" value={form.crew_type} onChange={e => set('crew_type', e.target.value)}>
                <option value="">— Select —</option>
                {crewTypes.map(ct => <option key={ct.id} value={ct.name}>{ct.name}</option>)}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2 py-1">
            <input
              type="checkbox" id="new_is_sub"
              checked={form.is_subcontractor}
              onChange={e => set('is_subcontractor', e.target.checked)}
              className="w-4 h-4 rounded accent-green-600"
            />
            <label htmlFor="new_is_sub" className="text-sm text-gray-700 cursor-pointer select-none">
              Subcontractor work order
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {[
              { k: 'man_days',      l: 'Man Days',      p: '0'   },
              { k: 'labor_hours',   l: 'Labor Hours',   p: '0'   },
              { k: 'labor_cost',    l: 'Labor Cost',    p: '$0'  },
              { k: 'material_cost', l: 'Material Cost', p: '$0'  },
              { k: 'sub_cost',      l: 'Sub Cost',      p: '$0'  },
              { k: 'total_price',   l: 'Total Price',   p: '$0'  },
            ].map(({ k, l, p }) => (
              <div key={k}>
                <label className="label text-xs">{l}</label>
                <input
                  type="number" min="0" step="0.01"
                  className="input"
                  value={form[k]}
                  onChange={e => set(k, e.target.value)}
                  placeholder={p}
                />
              </div>
            ))}
          </div>

          <div>
            <label className="label text-xs">Status</label>
            <select className="input" value={form.status} onChange={e => set('status', e.target.value)}>
              <option value="pending">Pending</option>
              <option value="in_progress">In Progress</option>
              <option value="complete">Complete</option>
            </select>
          </div>
        </div>

        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="flex-1 btn-secondary">Cancel</button>
          <button
            onClick={handleSave}
            disabled={saving || !form.module_type.trim()}
            className="flex-1 bg-green-700 text-white font-semibold py-2 rounded-lg hover:bg-green-800 transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving…' : '+ Save Work Order'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Work Order Detail / Edit Modal
// ─────────────────────────────────────────────────────────────────────────────
function WorkOrderDetailModal({ wo, crewTypes, onClose, onSaved, onDeleted }) {
  const [editMode,       setEditMode]       = useState(false)
  const [saving,         setSaving]         = useState(false)
  const [deleting,       setDeleting]       = useState(false)
  const [confirmDelete,  setConfirmDelete]  = useState(false)
  const [form, setForm] = useState({
    module_type:      wo.module_type      || '',
    project_name:     wo.project_name     || '',
    crew_type:        wo.crew_type        || '',
    is_subcontractor: wo.is_subcontractor || false,
    man_days:         wo.man_days         ?? '',
    labor_hours:      wo.labor_hours      ?? '',
    labor_cost:       wo.labor_cost       ?? '',
    material_cost:    wo.material_cost    ?? '',
    sub_cost:         wo.sub_cost         ?? '',
    total_price:      wo.total_price      ?? '',
    status:           wo.status           || 'pending',
  })

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  function hasChanges() {
    const n = v => parseFloat(v) || 0
    return (
      form.module_type      !== (wo.module_type      || '') ||
      form.project_name     !== (wo.project_name     || '') ||
      form.crew_type        !== (wo.crew_type        || '') ||
      form.is_subcontractor !== (wo.is_subcontractor || false) ||
      n(form.man_days)      !== n(wo.man_days)      ||
      n(form.labor_hours)   !== n(wo.labor_hours)   ||
      n(form.labor_cost)    !== n(wo.labor_cost)    ||
      n(form.material_cost) !== n(wo.material_cost) ||
      n(form.sub_cost)      !== n(wo.sub_cost)      ||
      n(form.total_price)   !== n(wo.total_price)   ||
      form.status           !== (wo.status || 'pending')
    )
  }

  async function handleSave() {
    setSaving(true)
    const updates = {
      module_type:      form.module_type.trim(),
      project_name:     form.project_name.trim() || null,
      crew_type:        form.crew_type || null,
      is_subcontractor: form.is_subcontractor,
      man_days:         parseFloat(form.man_days)      || 0,
      labor_hours:      parseFloat(form.labor_hours)   || 0,
      labor_cost:       parseFloat(form.labor_cost)    || 0,
      material_cost:    parseFloat(form.material_cost) || 0,
      sub_cost:         parseFloat(form.sub_cost)      || 0,
      total_price:      parseFloat(form.total_price)   || 0,
      status:           form.status,
    }
    // Flag as edited if values changed and work order was originally from an estimate
    if (hasChanges() && !wo.is_manual) {
      updates.edited_from_estimate = true
    }
    const { data, error } = await supabase
      .from('work_orders').update(updates).eq('id', wo.id).select().single()
    setSaving(false)
    if (!error && data) { onSaved(data); onClose() }
  }

  async function handleDelete() {
    setDeleting(true)
    await supabase.from('work_orders').delete().eq('id', wo.id)
    onDeleted(wo.id)
    setDeleting(false)
    onClose()
  }

  const roInput = `input text-sm bg-gray-50 text-gray-500 cursor-default`
  const rwInput = `input text-sm`

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 p-6 max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-bold text-gray-900 truncate">{wo.module_type}</h2>
              {wo.is_manual && (
                <span className="flex-shrink-0 text-[10px] font-bold px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full uppercase tracking-wide">
                  Manual
                </span>
              )}
              {wo.edited_from_estimate && (
                <span className="flex-shrink-0 text-[10px] font-bold px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full uppercase tracking-wide">
                  Edited
                </span>
              )}
            </div>
            {wo.project_name && <p className="text-xs text-gray-400 mt-0.5 truncate">{wo.project_name}</p>}
          </div>
          <button onClick={onClose} className="flex-shrink-0 text-gray-400 hover:text-gray-600 text-xl leading-none ml-4">✕</button>
        </div>

        {!editMode && (
          <p className="text-xs text-gray-400 italic mb-3">Click <strong className="font-semibold text-gray-600">Edit</strong> to make changes to this work order.</p>
        )}

        {/* Fields */}
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="label text-xs">Module Type</label>
              <input
                readOnly={!editMode}
                className={editMode ? rwInput : roInput}
                value={form.module_type}
                onChange={e => set('module_type', e.target.value)}
              />
            </div>
            <div>
              <label className="label text-xs">Project Name</label>
              <input
                readOnly={!editMode}
                className={editMode ? rwInput : roInput}
                value={form.project_name}
                onChange={e => set('project_name', e.target.value)}
              />
            </div>
            <div>
              <label className="label text-xs">Crew Type</label>
              {editMode ? (
                <select className="input text-sm" value={form.crew_type} onChange={e => set('crew_type', e.target.value)}>
                  <option value="">— Select —</option>
                  {crewTypes.map(ct => <option key={ct.id} value={ct.name}>{ct.name}</option>)}
                </select>
              ) : (
                <input readOnly className={roInput} value={form.crew_type || '—'} />
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 py-1">
            <input
              type="checkbox" id="det_is_sub"
              disabled={!editMode}
              checked={form.is_subcontractor}
              onChange={e => set('is_subcontractor', e.target.checked)}
              className="w-4 h-4 rounded accent-green-600"
            />
            <label
              htmlFor="det_is_sub"
              className={`text-sm select-none ${editMode ? 'cursor-pointer text-gray-700' : 'cursor-default text-gray-400'}`}
            >
              Subcontractor work order
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {[
              { k: 'man_days',      l: 'Man Days'      },
              { k: 'labor_hours',   l: 'Labor Hours'   },
              { k: 'labor_cost',    l: 'Labor Cost'    },
              { k: 'material_cost', l: 'Material Cost' },
              { k: 'sub_cost',      l: 'Sub Cost'      },
              { k: 'total_price',   l: 'Total Price'   },
            ].map(({ k, l }) => (
              <div key={k}>
                <label className="label text-xs">{l}</label>
                <input
                  type="number" min="0" step="0.01"
                  readOnly={!editMode}
                  className={editMode ? rwInput : roInput}
                  value={form[k]}
                  onChange={e => set(k, e.target.value)}
                />
              </div>
            ))}
          </div>

          <div>
            <label className="label text-xs">Status</label>
            {editMode ? (
              <select className="input text-sm" value={form.status} onChange={e => set('status', e.target.value)}>
                <option value="pending">Pending</option>
                <option value="in_progress">In Progress</option>
                <option value="complete">Complete</option>
              </select>
            ) : (
              <input readOnly className={roInput} value={STATUS_LABELS[form.status] || form.status} />
            )}
          </div>
        </div>

        {/* Actions */}
        {confirmDelete ? (
          <div className="mt-5 bg-red-50 border border-red-200 rounded-xl p-4">
            <p className="text-sm font-semibold text-red-700 mb-1">Delete this work order?</p>
            <p className="text-xs text-red-500 mb-3">This cannot be undone.</p>
            <div className="flex gap-2">
              <button onClick={() => setConfirmDelete(false)} className="flex-1 btn-secondary text-sm">Keep It</button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 bg-red-600 text-white font-semibold py-2 rounded-lg hover:bg-red-700 text-sm transition-colors disabled:opacity-50"
              >
                {deleting ? 'Deleting…' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 mt-5">
            <button
              onClick={() => setConfirmDelete(true)}
              className="px-3 py-2 rounded-lg border border-red-200 text-red-400 text-sm hover:bg-red-50 hover:text-red-600 transition-colors"
            >
              Delete
            </button>
            <div className="flex-1" />
            {editMode ? (
              <>
                <button onClick={() => setEditMode(false)} className="btn-secondary text-sm">Cancel</button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="bg-green-700 text-white font-semibold px-5 py-2 rounded-lg hover:bg-green-800 text-sm transition-colors disabled:opacity-50"
                >
                  {saving ? 'Saving…' : 'Save Changes'}
                </button>
              </>
            ) : (
              <button
                onClick={() => setEditMode(true)}
                className="bg-green-700 text-white font-semibold px-5 py-2 rounded-lg hover:bg-green-800 text-sm transition-colors"
              >
                ✏️ Edit
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Work Order Output Helpers — print / email / text
// ─────────────────────────────────────────────────────────────────────────────

async function generateWorkOrderPDF({ workOrders, crewType, jobName, requiredEquipFn, isSub }) {
  const $ = n => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(parseFloat(n) || 0)
  const nv = v => parseFloat(v || 0)
  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })

  const totalMD    = workOrders.reduce((s, w) => s + nv(w.man_days), 0)
  const totalHrs   = workOrders.reduce((s, w) => s + nv(w.labor_hours), 0)
  const totalLabor = workOrders.reduce((s, w) => s + nv(w.labor_cost), 0)
  const totalMat   = workOrders.reduce((s, w) => s + nv(w.material_cost), 0)
  const totalSub   = workOrders.reduce((s, w) => s + nv(w.sub_cost), 0)
  const totalVal   = workOrders.reduce((s, w) => s + nv(w.total_price), 0)
  const allEquip   = [...new Set(workOrders.flatMap(wo => requiredEquipFn(wo)))]

  const doc    = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'letter' })
  const PW     = doc.internal.pageSize.getWidth()   // 612 pt
  const margin = 40

  const GREEN = [78, 123, 76]
  const DARK  = [31, 41, 55]
  const MID   = [107, 114, 128]
  const LITE  = [229, 231, 235]
  const ZEBRA = [249, 250, 251]
  const THEAD = [243, 244, 246]

  // ── Logo
  let logoDataUrl = null
  try {
    const res  = await fetch(window.location.origin + '/logo.png')
    const blob = await res.blob()
    logoDataUrl = await new Promise(resolve => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result)
      reader.readAsDataURL(blob)
    })
  } catch (_) { /* logo optional */ }

  const hdrTop = margin
  if (logoDataUrl) {
    doc.addImage(logoDataUrl, 'PNG', margin, hdrTop, 90, 36, undefined, 'FAST')
  } else {
    doc.setFontSize(13).setFont('helvetica', 'bold').setTextColor(...GREEN)
    doc.text('PICTURE BUILD', margin, hdrTop + 24)
  }

  // Right: WORK ORDER + job info
  doc.setFontSize(20).setFont('helvetica', 'bold').setTextColor(...DARK)
  doc.text('WORK ORDER', PW - margin, hdrTop + 16, { align: 'right' })
  doc.setFontSize(9).setFont('helvetica', 'normal').setTextColor(...MID)
  doc.text('Job:', PW - margin - 150, hdrTop + 29)
  doc.setFont('helvetica', 'bold').setTextColor(...DARK)
  doc.text(jobName, PW - margin - 126, hdrTop + 29)
  doc.setFont('helvetica', 'normal').setTextColor(...MID)
  doc.text('Crew Type:', PW - margin - 150, hdrTop + 41)
  doc.setFont('helvetica', 'bold').setTextColor(...DARK)
  doc.text(crewType, PW - margin - 108, hdrTop + 41)
  doc.setFont('helvetica', 'normal').setFontSize(8).setTextColor(...MID)
  doc.text(`Date: ${today}`, PW - margin, hdrTop + 52, { align: 'right' })

  // Green divider
  const divY = hdrTop + 60
  doc.setDrawColor(...GREEN).setLineWidth(1.5)
  doc.line(margin, divY, PW - margin, divY)

  let curY = divY + 16

  // Helper: gray section banner
  function sectionBanner(label, y) {
    doc.setFillColor(...LITE)
    doc.rect(margin, y, PW - margin * 2, 16, 'F')
    doc.setFontSize(9).setFont('helvetica', 'bold').setTextColor(...DARK)
    doc.text(label, margin + 6, y + 11)
    return y + 16
  }

  const tableStyles = {
    styles:            { fontSize: 9, cellPadding: 5, lineColor: [209, 213, 219], lineWidth: 0.5 },
    headStyles:        { fillColor: THEAD, textColor: DARK, fontStyle: 'bold', fontSize: 9 },
    alternateRowStyles:{ fillColor: ZEBRA },
    margin:            { left: margin, right: margin },
  }

  if (isSub) {
    curY = sectionBanner(`Subcontractor Module:   ${crewType}`, curY)
    const subRows = workOrders.map(wo => [
      wo.module_type + (wo.project_name ? ` — ${wo.project_name}` : ''),
      '—',
      nv(wo.sub_cost) > 0 ? $(wo.sub_cost) : '—',
    ])
    subRows.push([
      { content: 'TOTALS', styles: { fontStyle: 'bold' } },
      '',
      { content: $(totalSub), styles: { fontStyle: 'bold', halign: 'right' } },
    ])
    autoTable(doc, {
      ...tableStyles,
      startY: curY,
      head: [['Module Item', 'Subcontractor', 'Sub Cost']],
      body: subRows,
      columnStyles: { 0: { cellWidth: 'auto' }, 1: { cellWidth: 120 }, 2: { cellWidth: 90, halign: 'right' } },
    })
    curY = doc.lastAutoTable.finalY + 14

  } else {
    // Modules table
    curY = sectionBanner(`In House Module:   ${crewType}`, curY)
    const modRows = workOrders.map(wo => [
      wo.module_type + (wo.project_name ? ` — ${wo.project_name}` : ''),
      nv(wo.man_days) > 0 ? nv(wo.man_days).toFixed(2) : '—',
      '—',
      nv(wo.material_cost) > 0 ? $(wo.material_cost) : '—',
    ])
    modRows.push([
      { content: 'TOTALS', styles: { fontStyle: 'bold' } },
      { content: totalMD > 0 ? totalMD.toFixed(2) : '—', styles: { fontStyle: 'bold', halign: 'center' } },
      { content: totalLabor > 0 ? $(totalLabor) : '—', styles: { fontStyle: 'bold' } },
      { content: totalMat > 0 ? $(totalMat) : '—', styles: { fontStyle: 'bold', halign: 'right' } },
    ])
    autoTable(doc, {
      ...tableStyles,
      startY: curY,
      head: [['Module Item', 'Man Days', 'Material Type', 'Materials Cost']],
      body: modRows,
      columnStyles: {
        0: { cellWidth: 'auto' },
        1: { cellWidth: 65,  halign: 'center' },
        2: { cellWidth: 110 },
        3: { cellWidth: 90,  halign: 'right' },
      },
    })
    curY = doc.lastAutoTable.finalY + 10

    // Equipment table
    const equipRows = workOrders.map(wo => {
      const eq = requiredEquipFn(wo)
      return [
        wo.module_type + (wo.project_name ? ` — ${wo.project_name}` : ''),
        eq.length > 0 ? eq.join(', ') : '—',
        '—',
      ]
    })
    autoTable(doc, {
      ...tableStyles,
      startY: curY,
      head: [['Module Item', 'Equipment Needed', 'Inspections Needed']],
      body: equipRows,
      columnStyles: { 0: { cellWidth: 160 }, 1: { cellWidth: 'auto' }, 2: { cellWidth: 110 } },
    })
    curY = doc.lastAutoTable.finalY + 14
  }

  // Summary footer
  doc.setDrawColor(...LITE).setLineWidth(1)
  doc.line(margin, curY, PW - margin, curY)
  curY += 10

  const parts = []
  if (totalMD > 0)    parts.push(`Man Days: ${totalMD.toFixed(2)}`)
  if (totalHrs > 0)   parts.push(`Labor Hours: ${totalHrs.toFixed(1)}`)
  if (totalLabor > 0) parts.push(`Labor Cost: ${$(totalLabor)}`)
  parts.push(`Total Value: ${$(totalVal)}`)
  if (allEquip.length > 0) parts.push(`Equipment: ${allEquip.join(', ')}`)

  doc.setFontSize(8.5).setFont('helvetica', 'normal').setTextColor(...MID)
  doc.text(parts.join('     '), margin, curY, { maxWidth: PW - margin * 2 })

  // Open PDF in new browser tab
  const blob = doc.output('blob')
  window.open(URL.createObjectURL(blob), '_blank')
}

function buildEmailText({ workOrders, crewType, jobName, requiredEquipFn, isSub }) {
  const today = new Date().toLocaleDateString()
  const $  = n => '$'+Math.round(parseFloat(n||0)).toLocaleString()
  const nv = v => parseFloat(v||0)
  const sep = '—'.repeat(38)
  const lines = [
    `PICTURE BUILD`,
    `Design | Pools | Hardscape | Landscape`,
    sep,
    `WORK ORDER — ${crewType.toUpperCase()}`,
    `Job: ${jobName}   Date: ${today}`,
    sep,
  ]
  for (const wo of workOrders) {
    const label = wo.module_type+(wo.project_name?` (${wo.project_name})`:'')
    lines.push(label)
    if (isSub) {
      if (nv(wo.sub_cost)>0) lines.push(`  Sub Cost: ${$(wo.sub_cost)}`)
    } else {
      const parts = []
      if (nv(wo.man_days)>0)      parts.push(`${nv(wo.man_days).toFixed(1)} Man Days`)
      if (nv(wo.labor_cost)>0)    parts.push(`Labor: ${$(wo.labor_cost)}`)
      if (nv(wo.material_cost)>0) parts.push(`Materials: ${$(wo.material_cost)}`)
      if (parts.length) lines.push('  '+parts.join(' | '))
      const eq = requiredEquipFn(wo)
      if (eq.length) lines.push(`  Equipment: ${eq.join(', ')}`)
    }
  }
  lines.push(sep)
  const totalMD  = workOrders.reduce((s,w)=>s+nv(w.man_days),0)
  const totalMat = workOrders.reduce((s,w)=>s+nv(w.material_cost),0)
  const totalSub = workOrders.reduce((s,w)=>s+nv(w.sub_cost),0)
  const totalVal = workOrders.reduce((s,w)=>s+nv(w.total_price),0)
  const allEquip = [...new Set(workOrders.flatMap(wo=>requiredEquipFn(wo)))]
  if (!isSub && totalMD>0)  lines.push(`Total Man Days: ${totalMD.toFixed(1)}`)
  if (!isSub && totalMat>0) lines.push(`Total Materials: ${$(totalMat)}`)
  if (isSub  && totalSub>0) lines.push(`Total Sub Cost: ${$(totalSub)}`)
  lines.push(`Total Value: ${$(totalVal)}`)
  if (allEquip.length) lines.push(`Equipment: ${allEquip.join(', ')}`)
  return lines.join('\n')
}

function buildSMSText({ workOrders, crewType, jobName, requiredEquipFn, isSub }) {
  const $  = n => '$'+Math.round(parseFloat(n||0)).toLocaleString()
  const nv = v => parseFloat(v||0)
  const lines = [`WO: ${crewType} - ${jobName}`]
  for (const wo of workOrders) {
    const label = wo.project_name?`${wo.module_type}/${wo.project_name}`:wo.module_type
    const parts = []
    if (isSub) {
      parts.push(`Sub ${$(wo.sub_cost)}`)
    } else {
      if (nv(wo.man_days)>0)      parts.push(`${nv(wo.man_days).toFixed(1)}MD`)
      if (nv(wo.material_cost)>0) parts.push(`Mat ${$(wo.material_cost)}`)
    }
    lines.push(`${label}: ${parts.join(' ')||'—'}`)
  }
  const totalVal = workOrders.reduce((s,w)=>s+nv(w.total_price),0)
  const totalMD  = workOrders.reduce((s,w)=>s+nv(w.man_days),0)
  const allEquip = [...new Set(workOrders.flatMap(wo=>requiredEquipFn(wo)))]
  if (!isSub && totalMD>0) lines.push(`Total: ${totalMD.toFixed(1)}MD | ${$(totalVal)}`)
  else lines.push(`Total: ${$(totalVal)}`)
  if (allEquip.length) lines.push(`Equip: ${allEquip.join(', ')}`)
  return lines.join('\n')
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared helpers for recipient modals
// ─────────────────────────────────────────────────────────────────────────────
function useRecipientData() {
  const [employees, setEmployees] = useState([])
  const [crews, setCrews]         = useState([])
  const [selEmps, setSelEmps]     = useState(new Set())
  const [selCrews, setSelCrews]   = useState(new Set())
  const [loading, setLoading]     = useState(true)

  useEffect(() => {
    Promise.all([
      supabase.from('employees').select('id, first_name, last_name, phone, cell_phone, email').eq('status', 'active').order('first_name'),
      supabase.from('crews').select('*').order('label'),
    ]).then(([{ data: emps }, { data: crs }]) => {
      setEmployees(emps || [])
      setCrews(crs || [])
      setLoading(false)
    })
  }, [])

  function crewMemberIds(crew) {
    return ['crew_chief_id', 'journeyman_id', 'laborer_1_id', 'laborer_2_id', 'laborer_3_id']
      .map(k => crew[k]).filter(Boolean)
  }

  const empMap = Object.fromEntries(employees.map(e => [e.id, e]))

  function toggleEmp(id) {
    setSelEmps(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }
  function toggleCrew(crew, contactField) {
    setSelCrews(prev => {
      const next = new Set(prev)
      const ids  = crewMemberIds(crew).filter(id => empMap[id]?.[contactField])
      if (next.has(crew.id)) {
        next.delete(crew.id)
        setSelEmps(ep => { const ne = new Set(ep); ids.forEach(id => ne.delete(id)); return ne })
      } else {
        next.add(crew.id)
        setSelEmps(ep => { const ne = new Set(ep); ids.forEach(id => ne.add(id));    return ne })
      }
      return next
    })
  }

  return { employees, crews, selEmps, selCrews, loading, empMap, crewMemberIds, toggleEmp, toggleCrew }
}

function RecipientPanels({ employees, crews, selEmps, selCrews, empMap, crewMemberIds, toggleEmp, toggleCrew, contactField, noContactLabel }) {
  return (
    <div className="flex flex-1 min-h-0 divide-x divide-gray-200">
      {/* Left — individual employees */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-200 flex-shrink-0">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Employees</span>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {employees.length === 0 && <p className="text-xs text-gray-400 px-1 py-2">No active employees found.</p>}
          {employees.map(emp => {
            const checked  = selEmps.has(emp.id)
            const hasContact = !!emp[contactField]
            return (
              <label
                key={emp.id}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors ${checked ? 'bg-blue-50' : 'hover:bg-gray-50'} ${!hasContact ? 'opacity-50' : ''}`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={!hasContact}
                  onChange={() => hasContact && toggleEmp(emp.id)}
                  className="w-4 h-4 accent-blue-600 flex-shrink-0"
                />
                <div className="min-w-0">
                  <div className="text-sm font-medium text-gray-800 truncate">{emp.first_name} {emp.last_name}</div>
                  <div className="text-xs text-gray-400 truncate">{emp[contactField] || noContactLabel}</div>
                </div>
              </label>
            )
          })}
        </div>
      </div>

      {/* Right — crews */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-200 flex-shrink-0">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Crews</span>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {crews.length === 0 && <p className="text-xs text-gray-400 px-1 py-2">No crews found.</p>}
          {crews.map(crew => {
            const memberIds = crewMemberIds(crew)
            const checked   = selCrews.has(crew.id)
            const members   = memberIds.map(id => empMap[id]).filter(Boolean)
            const hasAny    = members.some(m => m[contactField])
            return (
              <label
                key={crew.id}
                className={`flex items-start gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors ${checked ? 'bg-blue-50' : 'hover:bg-gray-50'} ${!hasAny ? 'opacity-50' : ''}`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={!hasAny}
                  onChange={() => hasAny && toggleCrew(crew, contactField)}
                  className="w-4 h-4 accent-blue-600 flex-shrink-0 mt-0.5"
                />
                <div className="min-w-0">
                  <div className="text-sm font-medium text-gray-800">Crew {crew.label}</div>
                  <div className="text-xs text-gray-400 leading-relaxed">
                    {members.length === 0
                      ? 'No members assigned'
                      : members.map(m => `${m.first_name} ${m.last_name}`).join(', ')}
                  </div>
                </div>
              </label>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Email Recipients Modal
// ─────────────────────────────────────────────────────────────────────────────
function EmailRecipientsModal({ subject, body, onClose }) {
  const { employees, crews, selEmps, selCrews, loading, empMap, crewMemberIds, toggleEmp, toggleCrew } = useRecipientData()
  const [sent, setSent] = useState(false)

  const emails  = [...selEmps].map(id => empMap[id]?.email).filter(Boolean)
  const canSend = emails.length > 0

  function handleSend() {
    if (!canSend) return
    const to  = emails.join(',')
    window.open(`mailto:${to}?subject=${subject}&body=${body}`, '_self')
    setSent(true)
    setTimeout(onClose, 1200)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 flex flex-col" style={{ maxHeight: '85vh' }}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 flex-shrink-0">
          <div>
            <h2 className="text-base font-bold text-gray-900">Email Work Order</h2>
            <p className="text-xs text-gray-400 mt-0.5">Select employees or crews to email this work order to</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center py-16 text-gray-400 text-sm">Loading…</div>
        ) : (
          <RecipientPanels
            employees={employees} crews={crews}
            selEmps={selEmps} selCrews={selCrews}
            empMap={empMap} crewMemberIds={crewMemberIds}
            toggleEmp={toggleEmp} toggleCrew={toggleCrew}
            contactField="email" noContactLabel="No email on file"
          />
        )}

        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 flex-shrink-0 bg-gray-50 rounded-b-2xl">
          <div className="text-xs text-gray-500">
            {canSend ? `${emails.length} recipient${emails.length === 1 ? '' : 's'} selected` : 'Select at least one recipient'}
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} className="px-4 py-1.5 rounded-lg text-sm font-medium text-gray-600 bg-white border border-gray-300 hover:bg-gray-50 transition-colors">Cancel</button>
            <button
              onClick={handleSend}
              disabled={!canSend || sent}
              className={`px-5 py-1.5 rounded-lg text-sm font-semibold transition-colors ${canSend && !sent ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
            >
              {sent ? 'Opening email…' : 'Send Email'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SMS Recipients Modal
// ─────────────────────────────────────────────────────────────────────────────
function SMSRecipientsModal({ smsText, onClose }) {
  const { employees, crews, selEmps, selCrews, loading, empMap, crewMemberIds, toggleEmp, toggleCrew } = useRecipientData()
  const [sending,  setSending]  = useState(false)
  const [results,  setResults]  = useState(null) // [{ name, phone, success, error }]

  const phones  = [...selEmps].map(id => ({
    id,
    name:  `${empMap[id]?.first_name || ''} ${empMap[id]?.last_name || ''}`.trim(),
    phone: empMap[id]?.cell_phone || empMap[id]?.phone,
  })).filter(p => p.phone)
  const canSend = phones.length > 0

  async function handleSend() {
    if (!canSend || sending) return
    setSending(true)

    const outcomes = await Promise.all(
      phones.map(async ({ name, phone }) => {
        try {
          const { data, error } = await supabase.functions.invoke('send-sms', {
            body: { to: phone, message: smsText },
          })
          if (error) return { name, phone, success: false, error: error.message }
          if (data?.success === false) return { name, phone, success: false, error: data.error || 'Send failed' }
          return { name, phone, success: true }
        } catch (err) {
          return { name, phone, success: false, error: err.message }
        }
      })
    )

    setSending(false)
    setResults(outcomes)
  }

  // After results are shown, allow closing
  const allSent    = results?.every(r => r.success)
  const anyFailed  = results?.some(r => !r.success)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 flex flex-col" style={{ maxHeight: '85vh' }}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 flex-shrink-0">
          <div>
            <h2 className="text-base font-bold text-gray-900">Send Work Order via Text</h2>
            <p className="text-xs text-gray-400 mt-0.5">Select employees or crews to text this work order to</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
        </div>

        {/* Results view — shown after sending */}
        {results ? (
          <div className="flex-1 overflow-y-auto px-6 py-5">
            <p className="text-sm font-semibold text-gray-700 mb-3">
              {allSent ? '✅ All messages sent!' : anyFailed ? '⚠️ Some messages failed' : ''}
            </p>
            <div className="space-y-2">
              {results.map((r, i) => (
                <div key={i} className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm ${r.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-700'}`}>
                  <span className="flex-shrink-0">{r.success ? '✅' : '❌'}</span>
                  <span className="font-medium">{r.name}</span>
                  <span className="text-xs opacity-70">{r.phone}</span>
                  {!r.success && <span className="ml-auto text-xs">{r.error}</span>}
                </div>
              ))}
            </div>
          </div>
        ) : loading ? (
          <div className="flex-1 flex items-center justify-center py-16 text-gray-400 text-sm">Loading…</div>
        ) : (
          <RecipientPanels
            employees={employees} crews={crews}
            selEmps={selEmps} selCrews={selCrews}
            empMap={empMap} crewMemberIds={crewMemberIds}
            toggleEmp={toggleEmp} toggleCrew={toggleCrew}
            contactField="cell_phone" noContactLabel="No cell phone on file"
          />
        )}

        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 flex-shrink-0 bg-gray-50 rounded-b-2xl">
          <div className="text-xs text-gray-500">
            {results
              ? `${results.filter(r => r.success).length} of ${results.length} sent`
              : canSend
                ? `${phones.length} recipient${phones.length === 1 ? '' : 's'} selected`
                : 'Select at least one recipient'}
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} className="px-4 py-1.5 rounded-lg text-sm font-medium text-gray-600 bg-white border border-gray-300 hover:bg-gray-50 transition-colors">
              {results ? 'Close' : 'Cancel'}
            </button>
            {!results && (
              <button
                onClick={handleSend}
                disabled={!canSend || sending}
                className={`px-5 py-1.5 rounded-lg text-sm font-semibold transition-colors ${canSend && !sending ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
              >
                {sending
                  ? <span className="flex items-center gap-2"><span className="animate-spin inline-block w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full" />Sending…</span>
                  : 'Send Text'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// Four small icon buttons — print / email / text / edit
function WOActionButtons({ workOrders, crewType, jobName, requiredEquipFn, isSub, onEdit }) {
  const [showEmailModal, setShowEmailModal] = useState(false)
  const [showSMSModal,   setShowSMSModal]   = useState(false)
  const args = { workOrders, crewType, jobName, requiredEquipFn, isSub }

  function handlePrint(e) {
    e.stopPropagation()
    generateWorkOrderPDF(args)
  }
  function handleEmail(e) {
    e.stopPropagation()
    setShowEmailModal(true)
  }
  function handleText(e) {
    e.stopPropagation()
    setShowSMSModal(true)
  }

  const btn = 'flex items-center justify-center w-7 h-7 rounded hover:opacity-80 transition-opacity flex-shrink-0'

  return (
    <>
      {showEmailModal && (
        <EmailRecipientsModal
          subject={encodeURIComponent(`Work Order — ${crewType} — ${jobName}`)}
          body={encodeURIComponent(buildEmailText(args))}
          onClose={() => setShowEmailModal(false)}
        />
      )}
      {showSMSModal && (
        <SMSRecipientsModal
          smsText={buildSMSText(args)}
          onClose={() => setShowSMSModal(false)}
        />
      )}

      <div className="flex items-center gap-1 flex-shrink-0">
        {/* Print — two-tone blue tint */}
        <button onClick={handlePrint} title="Print work order" className={btn}>
          <svg width="24" height="24" viewBox="0 0 28 28" xmlns="http://www.w3.org/2000/svg">
            <rect x="4" y="10" width="20" height="13" rx="2" fill="#B5D4F4" stroke="#185FA5" strokeWidth="1.5"/>
            <rect x="8" y="18" width="12" height="7" rx="1" fill="white" stroke="#185FA5" strokeWidth="1.2"/>
            <rect x="8" y="4" width="12" height="8" rx="1" fill="white" stroke="#185FA5" strokeWidth="1.2"/>
            <circle cx="21" cy="14" r="1.2" fill="#185FA5"/>
          </svg>
        </button>

        {/* Email — two-tone blue tint */}
        <button onClick={handleEmail} title="Email work order" className={btn}>
          <svg width="24" height="24" viewBox="0 0 28 28" xmlns="http://www.w3.org/2000/svg">
            <rect x="2" y="5" width="24" height="18" rx="3" fill="#B5D4F4" stroke="#185FA5" strokeWidth="1.5"/>
            <polyline points="2,8 14,17 26,8" fill="none" stroke="#185FA5" strokeWidth="1.8" strokeLinejoin="round"/>
          </svg>
        </button>

        {/* Text/SMS — two-tone blue tint */}
        <button onClick={handleText} title="Text work order" className={btn}>
          <svg width="24" height="24" viewBox="0 0 28 28" xmlns="http://www.w3.org/2000/svg">
            <path d="M4 5 h20 a2 2 0 0 1 2 2 v12 a2 2 0 0 1 -2 2 h-12 l-6 4 v-4 h-2 a2 2 0 0 1 -2 -2 v-12 a2 2 0 0 1 2 -2 z" fill="#B5D4F4" stroke="#185FA5" strokeWidth="1.5" strokeLinejoin="round"/>
            <line x1="8" y1="11" x2="20" y2="11" stroke="#185FA5" strokeWidth="1.8" strokeLinecap="round"/>
            <line x1="8" y1="15" x2="16" y2="15" stroke="#185FA5" strokeWidth="1.8" strokeLinecap="round"/>
          </svg>
        </button>

        {/* Edit/pencil */}
        {onEdit && (
          <button onClick={e => { e.stopPropagation(); onEdit() }} title="View / edit" className={btn}>
            <svg width="24" height="24" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="2" y="2" width="24" height="24" rx="5" fill="#B5D4F4"/>
              <path d="M18 7.5a1.768 1.768 0 0 1 2.5 2.5L9.5 21 6 22l1-3.5L18 7.5z" stroke="#185FA5" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        )}
      </div>
    </>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Module Row — one line inside a combined work order card
// ─────────────────────────────────────────────────────────────────────────────
function ModuleRow({ wo, jobsMap, crewMap, subMap, onStatusChange, onRowClick }) {
  const [updating, setUpdating] = useState(false)

  async function cycleStatus(e) {
    e.stopPropagation()
    const next = { pending: 'in_progress', in_progress: 'complete', complete: 'pending' }
    const newStatus = next[wo.status] || 'pending'
    setUpdating(true)
    await supabase.from('work_orders').update({ status: newStatus }).eq('id', wo.id)
    onStatusChange(wo.id, newStatus)
    setUpdating(false)
  }

  const jobName = jobsMap?.[wo.job_id]

  return (
    <div
      className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50 border-b border-gray-100 last:border-0 cursor-pointer"
      onClick={onRowClick}
      title="Click to view / edit"
    >
      {/* Left: identifiers */}
      <div className="flex items-center gap-1.5 min-w-0 flex-1">
        {jobName && (
          <span className="flex-shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded bg-green-100 text-green-800 max-w-[100px] truncate">
            {jobName}
          </span>
        )}
        <span className="text-xs font-semibold text-gray-800 truncate">{wo.module_type}</span>
        {wo.project_name && (
          <>
            <span className="text-gray-300 flex-shrink-0 text-[10px]">·</span>
            <span className="text-xs text-gray-500 truncate">{wo.project_name}</span>
          </>
        )}
        {wo.is_manual && (
          <span className="flex-shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 uppercase tracking-wide">
            Manual
          </span>
        )}
        {wo.edited_from_estimate && (
          <span className="flex-shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded bg-orange-100 text-orange-700 uppercase tracking-wide">
            Edited
          </span>
        )}
        {wo.scheduled_crew_id && crewMap?.[wo.scheduled_crew_id] && (
          <span className="flex-shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded bg-green-100 text-green-800">
            👷 Crew {crewMap[wo.scheduled_crew_id].label}
          </span>
        )}
        {wo.scheduled_sub_id && subMap?.[wo.scheduled_sub_id] && (
          <span className="flex-shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded bg-gray-100 text-gray-700">
            🏢 {subMap[wo.scheduled_sub_id].company_name}
          </span>
        )}
      </div>

      {/* Right: metrics + status + edit */}
      <div className="flex items-center gap-3 flex-shrink-0">
        {parseFloat(wo.man_days)     > 0 && <span className="text-[11px] text-gray-500">{fmtDays(wo.man_days)}</span>}
        {parseFloat(wo.labor_hours)  > 0 && <span className="text-[11px] text-gray-500">{fmtHrs(wo.labor_hours)}</span>}
        {parseFloat(wo.labor_cost)   > 0 && <span className="text-[11px] text-gray-500">Labor {fmt(wo.labor_cost)}</span>}
        {parseFloat(wo.material_cost)> 0 && <span className="text-[11px] text-gray-500">Mat {fmt(wo.material_cost)}</span>}
        {parseFloat(wo.total_price)  > 0 && <span className="text-[11px] font-semibold text-green-700">{fmt(wo.total_price)}</span>}
        <button
          onClick={cycleStatus}
          disabled={updating}
          className={`flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border transition-colors flex-shrink-0 ${STATUS_STYLES[wo.status]}`}
          title="Click to advance status"
        >
          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${STATUS_DOT[wo.status]}`} />
          {STATUS_LABELS[wo.status]}
        </button>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Combined Work Order Card
// ─────────────────────────────────────────────────────────────────────────────
function CombinedWorkOrderCard({ workOrders, requiredEquipFn, jobsMap, crewMap, subMap, onStatusChange, onRowClick, crewType, jobName }) {
  const totalMD    = workOrders.reduce((s, w) => s + parseFloat(w.man_days     || 0), 0)
  const totalHrs   = workOrders.reduce((s, w) => s + parseFloat(w.labor_hours  || 0), 0)
  const totalLabor = workOrders.reduce((s, w) => s + parseFloat(w.labor_cost   || 0), 0)
  const totalMat   = workOrders.reduce((s, w) => s + parseFloat(w.material_cost|| 0), 0)
  const totalValue = workOrders.reduce((s, w) => s + parseFloat(w.total_price  || 0), 0)
  const doneCount  = workOrders.filter(w => w.status === 'complete').length

  const allReqEquip = [...new Set(workOrders.flatMap(wo => requiredEquipFn(wo)))]

  return (
    <div className="bg-white border-2 border-gray-400 rounded-lg overflow-hidden">

      {/* Aggregate header */}
      <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-b border-gray-200">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-0.5 min-w-0">
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wide flex-shrink-0">
            {workOrders.length} module{workOrders.length !== 1 ? 's' : ''}
          </span>
          {totalMD    > 0 && <span className="text-xs text-gray-700"><span className="text-gray-400">MD </span>{fmtDays(totalMD)}</span>}
          {totalHrs   > 0 && <span className="text-xs text-gray-700"><span className="text-gray-400">Hrs </span>{fmtHrs(totalHrs)}</span>}
          {totalLabor > 0 && <span className="text-xs text-gray-700"><span className="text-gray-400">Labor </span>{fmt(totalLabor)}</span>}
          {totalMat   > 0 && <span className="text-xs text-gray-700"><span className="text-gray-400">Mat </span>{fmt(totalMat)}</span>}
          {totalValue > 0 && <span className="text-xs font-bold text-green-700">{fmt(totalValue)}</span>}
        </div>
        <div className="flex items-center gap-3 flex-shrink-0 ml-3">
          <span className="text-[10px] font-semibold text-gray-400">
            {doneCount}/{workOrders.length} complete
          </span>
          {crewType && (
            <WOActionButtons
              workOrders={workOrders}
              crewType={crewType}
              jobName={jobName || 'Job'}
              requiredEquipFn={requiredEquipFn}
              isSub={false}
              onEdit={workOrders.length === 1 ? () => onRowClick(workOrders[0]) : undefined}
            />
          )}
        </div>
      </div>

      {/* Module rows */}
      <div>
        {workOrders.map(wo => (
          <ModuleRow
            key={wo.id}
            wo={wo}
            jobsMap={jobsMap}
            crewMap={crewMap}
            subMap={subMap}
            onStatusChange={onStatusChange}
            onRowClick={() => onRowClick(wo)}
          />
        ))}
      </div>

      {/* Required equipment */}
      {allReqEquip.length > 0 && (
        <div className="px-3 py-1.5 border-t border-blue-50 bg-blue-50/40 flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-[10px] font-bold text-blue-500 uppercase tracking-wide flex-shrink-0">Req. Equip:</span>
          {allReqEquip.map((eq, i) => (
            <span key={i} className="text-[10px] font-semibold bg-white text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full">
              {eq}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub Work Order Card
// ─────────────────────────────────────────────────────────────────────────────
function SubWorkOrderCard({ wo, requiredEquip, jobName, crewMap, subMap, onStatusChange, onRowClick, crewType }) {
  const [updating, setUpdating] = useState(false)

  async function cycleStatus(e) {
    e.stopPropagation()
    const next = { pending: 'in_progress', in_progress: 'complete', complete: 'pending' }
    const newStatus = next[wo.status] || 'pending'
    setUpdating(true)
    await supabase.from('work_orders').update({ status: newStatus }).eq('id', wo.id)
    onStatusChange(wo.id, newStatus)
    setUpdating(false)
  }

  return (
    <div className="bg-white border-2 border-gray-400 rounded-lg overflow-hidden transition-colors">
      <div className="flex items-center justify-between px-3 py-1.5 bg-gray-50 border-b border-gray-100">
        <div className="flex items-center gap-2 min-w-0">
          <span className="flex-shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded bg-gray-200 text-gray-600">SUB</span>
          {jobName && (
            <span className="flex-shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded bg-green-100 text-green-800 max-w-[100px] truncate">{jobName}</span>
          )}
          <span className="text-xs font-bold text-gray-900 truncate">{wo.module_type}</span>
          {wo.project_name && (
            <>
              <span className="text-gray-300 flex-shrink-0">·</span>
              <span className="text-xs text-gray-500 truncate">{wo.project_name}</span>
            </>
          )}
          {wo.is_manual && (
            <span className="flex-shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 uppercase tracking-wide">Manual</span>
          )}
          {wo.edited_from_estimate && (
            <span className="flex-shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded bg-orange-100 text-orange-700 uppercase tracking-wide">Edited</span>
          )}
          {wo.scheduled_crew_id && crewMap?.[wo.scheduled_crew_id] && (
            <span className="flex-shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded bg-green-100 text-green-800">
              👷 Crew {crewMap[wo.scheduled_crew_id].label}
            </span>
          )}
          {wo.scheduled_sub_id && subMap?.[wo.scheduled_sub_id] && (
            <span className="flex-shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded bg-gray-100 text-gray-700">
              🏢 {subMap[wo.scheduled_sub_id].company_name}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {crewType && (
            <WOActionButtons
              workOrders={[wo]}
              crewType={crewType}
              jobName={jobName || 'Job'}
              requiredEquipFn={() => requiredEquip || []}
              isSub={true}
              onEdit={() => onRowClick(wo)}
            />
          )}
          <button
            onClick={cycleStatus}
            disabled={updating}
            className={`flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border transition-colors ${STATUS_STYLES[wo.status]}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${STATUS_DOT[wo.status]}`} />
            {STATUS_LABELS[wo.status]}
          </button>
        </div>
      </div>
      <div className="px-3 py-1.5 flex flex-wrap items-center gap-x-4 gap-y-0.5">
        {parseFloat(wo.sub_cost)   > 0 && <span className="text-xs text-gray-600"><span className="text-gray-400">Sub </span>{fmt(wo.sub_cost)}</span>}
        {parseFloat(wo.total_price)> 0 && <span className="text-xs font-semibold text-green-700"><span className="font-normal text-gray-400">Total </span>{fmt(wo.total_price)}</span>}
      </div>
      {requiredEquip?.length > 0 && (
        <div className="px-3 py-1.5 border-t border-blue-50 bg-blue-50/40 flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-[10px] font-bold text-blue-500 uppercase tracking-wide flex-shrink-0">Req. Equip:</span>
          {requiredEquip.map((eq, i) => (
            <span key={i} className="text-[10px] font-semibold bg-white text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full">{eq}</span>
          ))}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Crew Group
// ─────────────────────────────────────────────────────────────────────────────
function CrewGroup({ moduleType, workOrders, requiredEquipFn, jobsMap, crewMap, subMap, onStatusChange, onRowClick, isAllJobs, singleJobName }) {
  const crewWOs = workOrders.filter(wo => !wo.is_subcontractor)
  const subWOs  = workOrders.filter(wo =>  wo.is_subcontractor)
  const total   = crewWOs.length + subWOs.length

  const totalMD  = crewWOs.reduce((s, w) => s + parseFloat(w.man_days || 0), 0)
  const totalHrs = crewWOs.reduce((s, w) => s + parseFloat(w.labor_hours || 0), 0)
  const totalMat = crewWOs.reduce((s, w) => s + parseFloat(w.material_cost || 0), 0)
  const totalSub = subWOs.reduce((s,  w) => s + parseFloat(w.sub_cost || 0), 0)

  // In All Jobs mode, bucket each WO by job so each job gets its own combined card
  const jobBuckets = isAllJobs ? (() => {
    const buckets = {}
    for (const wo of [...crewWOs, ...subWOs]) {
      if (!buckets[wo.job_id]) buckets[wo.job_id] = { crew: [], sub: [] }
      wo.is_subcontractor ? buckets[wo.job_id].sub.push(wo) : buckets[wo.job_id].crew.push(wo)
    }
    return buckets
  })() : null

  return (
    <div className="mb-4">
      {/* Section header bar */}
      <div className="flex items-center gap-3 flex-wrap px-3 py-0.5 rounded-lg mb-2 bg-blue-50 border-2 border-green-700">
        <h3 className="text-sm font-bold uppercase tracking-widest text-gray-800">{moduleType}</h3>
        {crewWOs.length > 0 && (
          <span className="text-xs font-semibold px-2.5 py-0 rounded-full bg-gray-100 text-gray-600">
            {crewWOs.length} module{crewWOs.length !== 1 ? 's' : ''}
          </span>
        )}
        <div className="flex gap-3">
          {totalMD  > 0 && <span className="text-xs text-gray-500">{fmtDays(totalMD)}</span>}
          {totalHrs > 0 && <span className="text-xs text-gray-500">{fmtHrs(totalHrs)}</span>}
          {totalMat > 0 && <span className="text-xs text-gray-500">Mat {fmt(totalMat)}</span>}
          {totalSub > 0 && <span className="text-xs font-medium text-gray-500">Sub {fmt(totalSub)}</span>}
          {total === 0  && <span className="text-xs italic text-gray-400">No work orders for this job</span>}
        </div>
      </div>

      <div className="space-y-2">
        {isAllJobs && jobBuckets ? (
          // ── All Jobs: one combined card per job, stacked ──────────────────
          Object.entries(jobBuckets).map(([jobId, { crew, sub }]) => {
            const jobName = jobsMap?.[jobId] || 'Job'
            return (
              <div key={jobId} className="space-y-1">
                {/* Job name label above each job's card */}
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">{jobName}</p>
                {crew.length > 0 && (
                  <CombinedWorkOrderCard
                    workOrders={crew}
                    requiredEquipFn={requiredEquipFn}
                    jobsMap={{}}
                    crewMap={crewMap}
                    subMap={subMap}
                    onStatusChange={onStatusChange}
                    onRowClick={onRowClick}
                    crewType={moduleType}
                    jobName={jobName}
                  />
                )}
                {sub.map(wo => (
                  <SubWorkOrderCard
                    key={wo.id}
                    wo={wo}
                    requiredEquip={requiredEquipFn(wo)}
                    jobName={jobName}
                    crewMap={crewMap}
                    subMap={subMap}
                    onStatusChange={onStatusChange}
                    onRowClick={onRowClick}
                    crewType={moduleType}
                  />
                ))}
              </div>
            )
          })
        ) : (
          // ── Single Job: one combined card for the whole crew type ─────────
          <>
            {crewWOs.length > 0 && (
              <CombinedWorkOrderCard
                workOrders={crewWOs}
                requiredEquipFn={requiredEquipFn}
                jobsMap={jobsMap}
                crewMap={crewMap}
                subMap={subMap}
                onStatusChange={onStatusChange}
                onRowClick={onRowClick}
                crewType={moduleType}
                jobName={singleJobName}
              />
            )}
            {subWOs.map(wo => (
              <SubWorkOrderCard
                key={wo.id}
                wo={wo}
                requiredEquip={requiredEquipFn(wo)}
                jobName={singleJobName}
                crewMap={crewMap}
                subMap={subMap}
                onStatusChange={onStatusChange}
                onRowClick={onRowClick}
                crewType={moduleType}
              />
            ))}
          </>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────
export default function WorkOrders({ jobs, selectedJob }) {
  const [workOrders,    setWorkOrders]    = useState([])
  const [crewTypes,     setCrewTypes]     = useState([])
  const [equipmentMap,  setEquipmentMap]  = useState({})
  const [fieldEquipMap, setFieldEquipMap] = useState({})
  const [moduleDataMap, setModuleDataMap] = useState({})
  const [crewMap,       setCrewMap]       = useState({})
  const [subMap,        setSubMap]        = useState({})
  const [loading,       setLoading]       = useState(true)
  const [error,         setError]         = useState(null)
  const [statusFilter,  setStatusFilter]  = useState('all')

  // Modal state
  const [showNewWOModal, setShowNewWOModal] = useState(false)
  const [detailWO,       setDetailWO]       = useState(null)

  const jobId = selectedJob === 'all' ? null : selectedJob

  useEffect(() => { fetchAll() }, [jobId])

  async function fetchAll() {
    setLoading(true)
    setError(null)

    const woBase = supabase.from('work_orders').select('*').order('module_type').order('is_subcontractor')
    const [woRes, ctRes, mapRes, equipRes, fieldMapRes, crewsRes, subsRes] = await Promise.all([
      jobId ? woBase.eq('job_id', jobId) : woBase,
      supabase.from('crew_types').select('*').order('sort_order').order('name'),
      supabase.from('module_equipment_map').select('module_type, equipment_id'),
      supabase.from('master_equipment').select('*'),
      supabase.from('module_field_equipment_map').select('*'),
      supabase.from('crews').select('id, label, color').order('label'),
      supabase.from('subs_vendors').select('id, company_name').order('company_name'),
    ])

    if (woRes.error) {
      setError(woRes.error.message)
      setLoading(false)
      return
    }

    const wos = woRes.data || []
    setWorkOrders(wos)
    setCrewTypes(ctRes.data || [])

    if (!mapRes.error && !equipRes.error) {
      const maps  = mapRes.data  || []
      const equip = equipRes.data || []
      const lookup = {}
      for (const m of maps) {
        const e = equip.find(eq => eq.id === m.equipment_id)
        if (!e) continue
        if (!lookup[m.module_type]) lookup[m.module_type] = []
        lookup[m.module_type].push(e)
      }
      setEquipmentMap(lookup)
    }

    // Build crew and sub lookup maps
    setCrewMap(Object.fromEntries((crewsRes.data || []).map(c => [c.id, c])))
    setSubMap(Object.fromEntries((subsRes.data  || []).map(s => [s.id, s])))

    const fMap = {}
    for (const m of fieldMapRes.data || []) {
      if (!m.equipment_type) continue
      if (!fMap[m.module_type]) fMap[m.module_type] = []
      fMap[m.module_type].push(m)
    }
    setFieldEquipMap(fMap)

    const moduleIds = [...new Set(wos.filter(w => w.estimate_module_id).map(w => w.estimate_module_id))]
    if (moduleIds.length > 0) {
      const { data: modData } = await supabase
        .from('estimate_modules')
        .select('id, data')
        .in('id', moduleIds)
      const mMap = {}
      for (const m of modData || []) mMap[m.id] = m.data || {}
      setModuleDataMap(mMap)
    }

    setLoading(false)
  }

  function resolveCrewType(wo, types) {
    if (wo.crew_type) {
      const direct = types.find(ct => ct.name === wo.crew_type)
      if (direct) return direct.name
    }
    const mt = (wo.module_type || '').toLowerCase()
    for (const ct of types) {
      const n = ct.name.toLowerCase()
      if (n === 'demolition' && (mt.includes('demo') || mt.includes('demolition'))) return ct.name
      if (n === 'masonry'    && (mt.includes('mason') || mt.includes('wall') || mt.includes('column'))) return ct.name
      if (n === 'paver'      && (mt.includes('paver') || mt.includes('turf') || mt.includes('step'))) return ct.name
      if (n === 'landscape'  && (mt.includes('landscape') || mt.includes('plant') || mt.includes('irrig') || mt.includes('drainage') || mt.includes('utili'))) return ct.name
      if (n === 'specialty') continue
      if (mt.includes(n)) return ct.name
    }
    const specialty = types.find(ct => ct.name.toLowerCase() === 'specialty')
    return specialty?.name || types[0]?.name || 'Other'
  }

  async function generateFromEstimate() {
    const job = jobs?.find(j => j.id === jobId)
    if (!job?.estimate_id) {
      setError('This job has no linked estimate. Work orders can only be generated from jobs created via a sold bid.')
      return
    }
    setLoading(true)
    setError(null)

    const { data: estProjects, error: projErr } = await supabase
      .from('estimate_projects')
      .select('id, project_name, estimate_modules(*)')
      .eq('estimate_id', job.estimate_id)
      .order('created_at')

    if (projErr) { setError(projErr.message); setLoading(false); return }
    if (!estProjects?.length) {
      setError('No estimate modules found for this job\'s estimate.')
      setLoading(false)
      return
    }

    const rows = []
    for (const proj of estProjects) {
      for (const mod of proj.estimate_modules || []) {
        const calc        = mod.data?.calc || {}
        const laborHours  = parseFloat(calc.totalHrs     || 0)
        const laborCost   = parseFloat(mod.labor_cost    || calc.laborCost || 0)
        const laborBurden = parseFloat(mod.labor_burden  || calc.burden    || 0)
        const manDays     = parseFloat(mod.man_days      || 0)
        const matCost     = parseFloat(mod.material_cost || calc.totalMat  || 0)
        const subCost     = parseFloat(mod.sub_cost      || calc.subCost   || 0)
        const totalPrice  = parseFloat(mod.total_price   || calc.price     || 0)

        if (laborCost > 0 || manDays > 0 || matCost > 0) {
          rows.push({
            job_id: jobId, estimate_module_id: mod.id,
            project_name: proj.project_name, module_type: mod.module_type,
            is_subcontractor: false, man_days: manDays, labor_hours: laborHours,
            material_cost: matCost, sub_cost: 0, labor_cost: laborCost,
            labor_burden: laborBurden, total_price: totalPrice - subCost, status: 'pending',
          })
        }
        if (subCost > 0) {
          rows.push({
            job_id: jobId, estimate_module_id: mod.id,
            project_name: proj.project_name, module_type: mod.module_type,
            is_subcontractor: true, man_days: 0, labor_hours: 0, material_cost: 0,
            sub_cost: subCost, labor_cost: 0, labor_burden: 0, total_price: subCost, status: 'pending',
          })
        }
      }
    }

    if (rows.length === 0) {
      setError('The linked estimate has modules but no labor, materials, or sub costs were found.')
      setLoading(false)
      return
    }

    const { error: insertErr } = await supabase.from('work_orders').insert(rows)
    if (insertErr) { setError(insertErr.message); setLoading(false); return }
    await fetchAll()
  }

  function getRequiredEquip(wo) {
    if (!wo.estimate_module_id) return []
    const modData   = moduleDataMap[wo.estimate_module_id] || {}
    const fieldMaps = fieldEquipMap[wo.module_type] || []
    const results   = []
    for (const fm of fieldMaps) {
      if (fm.equipment_type && fieldHasValue(modData[fm.field_key])) {
        if (!results.includes(fm.equipment_type)) results.push(fm.equipment_type)
      }
    }
    return results
  }

  function handleStatusChange(woId, newStatus) {
    setWorkOrders(prev => prev.map(w => w.id === woId ? { ...w, status: newStatus } : w))
  }

  function handleWOSaved(updatedWO) {
    setWorkOrders(prev => {
      const idx = prev.findIndex(w => w.id === updatedWO.id)
      if (idx >= 0) {
        const next = [...prev]; next[idx] = updatedWO; return next
      }
      return [...prev, updatedWO]
    })
  }

  function handleWODeleted(id) {
    setWorkOrders(prev => prev.filter(w => w.id !== id))
  }

  const filtered = statusFilter === 'all'
    ? workOrders
    : workOrders.filter(w => w.status === statusFilter)

  const sections = crewTypes.map(ct => ({
    crewType: ct,
    workOrders: filtered.filter(wo => resolveCrewType(wo, crewTypes) === ct.name),
  }))

  // ─── Loading / error states ───────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-green-700" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-20 text-center px-6">
        <p className="text-4xl mb-3">⚠️</p>
        <p className="text-sm font-semibold text-red-600 mb-1">Could not load work orders</p>
        <p className="text-xs text-gray-500 max-w-sm mb-4">{error}</p>
        <button onClick={fetchAll} className="btn-ghost text-xs px-4 py-2 rounded-lg border border-gray-200">
          Try Again
        </button>
      </div>
    )
  }

  if (workOrders.length === 0) {
    if (!jobId) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-gray-400 py-20 text-center px-6">
          <p className="text-4xl mb-3">📋</p>
          <p className="text-sm font-medium text-gray-600 mb-1">No work orders found across any jobs.</p>
          <p className="text-xs text-gray-400">Work orders are generated automatically when a bid is marked sold.</p>
        </div>
      )
    }
    const job = jobs?.find(j => j.id === jobId)
    return (
      <>
        {showNewWOModal && (
          <NewWorkOrderModal
            jobId={jobId}
            crewTypes={crewTypes}
            onSave={wo => { handleWOSaved(wo); setShowNewWOModal(false) }}
            onClose={() => setShowNewWOModal(false)}
          />
        )}
        <div className="flex flex-col items-center justify-center h-full text-gray-400 py-20 text-center px-6">
          <p className="text-4xl mb-3">📋</p>
          <p className="text-sm font-medium text-gray-600 mb-1">No work orders for this job yet.</p>
          <div className="flex flex-wrap items-center justify-center gap-3 mt-4">
            {job?.estimate_id && (
              <button onClick={generateFromEstimate} className="btn-primary text-sm px-5 py-2 rounded-lg">
                Generate from Estimate
              </button>
            )}
            <button onClick={() => setShowNewWOModal(true)} className="btn-secondary text-sm px-5 py-2 rounded-lg">
              + Add Work Order
            </button>
          </div>
          {!job?.estimate_id && (
            <p className="text-xs text-gray-400 mt-3">Work orders are generated automatically when a bid is marked sold.</p>
          )}
        </div>
      </>
    )
  }

  // Job name lookup for all-jobs mode
  const jobsMap = !jobId
    ? Object.fromEntries((jobs || []).map(j => [j.id, j.name || j.client_name || 'Job']))
    : {}

  // Single-job name (for print/email/text on individual job view)
  const singleJobName = jobId
    ? (jobs?.find(j => j.id === jobId)?.name || jobs?.find(j => j.id === jobId)?.client_name || 'Job')
    : null

  // Summary totals
  const totalMD    = workOrders.filter(w => !w.is_subcontractor).reduce((s, w) => s + parseFloat(w.man_days || 0), 0)
  const totalMat   = workOrders.filter(w => !w.is_subcontractor).reduce((s, w) => s + parseFloat(w.material_cost || 0), 0)
  const totalSub   = workOrders.filter(w =>  w.is_subcontractor).reduce((s, w) => s + parseFloat(w.sub_cost || 0), 0)
  const totalValue = workOrders.reduce((s, w) => s + parseFloat(w.total_price || 0), 0)
  const complete   = workOrders.filter(w => w.status === 'complete').length

  return (
    <div>
      {/* Modals */}
      {showNewWOModal && (
        <NewWorkOrderModal
          jobId={jobId}
          crewTypes={crewTypes}
          onSave={wo => { handleWOSaved(wo); setShowNewWOModal(false) }}
          onClose={() => setShowNewWOModal(false)}
        />
      )}
      {detailWO && (
        <WorkOrderDetailModal
          wo={detailWO}
          crewTypes={crewTypes}
          onClose={() => setDetailWO(null)}
          onSaved={updatedWO => { handleWOSaved(updatedWO); setDetailWO(null) }}
          onDeleted={handleWODeleted}
        />
      )}

      {/* Summary bar */}
      <div className="mb-5 rounded-xl border-2 border-green-700 bg-white overflow-hidden shadow-sm">
        <div className="h-1 bg-green-700 w-full" />
        <div className="flex flex-wrap items-center gap-0 divide-x divide-gray-200">
          <div className="px-5 py-2 flex-1 min-w-[120px]">
            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide block">Total Man Days</span>
            <span className="text-base font-bold text-gray-900">{fmtDays(totalMD)}</span>
          </div>
          <div className="px-5 py-2 flex-1 min-w-[120px]">
            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide block">Materials</span>
            <span className="text-base font-bold text-gray-900">{fmt(totalMat)}</span>
          </div>
          {totalSub > 0 && (
            <div className="px-5 py-2 flex-1 min-w-[120px]">
              <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide block">Sub Costs</span>
              <span className="text-base font-bold text-gray-900">{fmt(totalSub)}</span>
            </div>
          )}
          <div className="px-5 py-2 flex-1 min-w-[140px] bg-green-50">
            <span className="text-[10px] font-semibold text-green-700 uppercase tracking-wide block">Total Value</span>
            <span className="text-base font-bold text-green-800">{fmt(totalValue)}</span>
          </div>
          <div className="px-5 py-2 flex-1 min-w-[140px]">
            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide block">Completion</span>
            <span className="text-base font-bold text-gray-900">{complete} <span className="text-sm font-normal text-gray-400">/ {workOrders.length}</span></span>
          </div>
        </div>

        {/* Filter row + add button */}
        <div className="flex items-center justify-between gap-2 px-5 py-2.5 border-t border-gray-100 bg-blue-50">
          <div className="flex gap-1.5 flex-wrap">
            {['all', 'pending', 'in_progress', 'complete'].map(s => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
                  statusFilter === s
                    ? 'bg-green-700 text-white'
                    : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                }`}
              >
                {s === 'all' ? 'All' : s === 'in_progress' ? 'In Progress' : s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
          {/* + Work Order button — only for single job */}
          {jobId && (
            <button
              onClick={() => setShowNewWOModal(true)}
              className="flex-shrink-0 text-xs px-3 py-1.5 rounded-lg font-semibold bg-white border-2 border-green-700 text-green-700 hover:bg-green-50 transition-colors"
            >
              + Work Order
            </button>
          )}
        </div>
      </div>

      {/* Crew type sections — only render if the section has work orders */}
      {sections.filter(s => s.workOrders.length > 0).map(({ crewType, workOrders: sectionWOs }) => (
        <CrewGroup
          key={crewType.id}
          moduleType={crewType.name}
          color={crewType.color}
          workOrders={sectionWOs}
          requiredEquipFn={getRequiredEquip}
          jobsMap={jobsMap}
          crewMap={crewMap}
          subMap={subMap}
          onStatusChange={handleStatusChange}
          onRowClick={setDetailWO}
          isAllJobs={!jobId}
          singleJobName={singleJobName}
        />
      ))}
    </div>
  )
}
