// src/pages/DesignDetail.jsx
//
// Design / CAD-takeoff per-project page. Phases 1–4:
//   • upload + multi-page viewer (Phase 2)
//   • set-scale tool (Phase 3) — click two points, type the known distance,
//     stores pixels-per-unit for the page in a type='scale' annotation
//   • linear / area / count drawing tools (Phase 4) — measurements live-render
//     using the page's scale and persist to design_annotations
//
// Coordinates are stored in NATURAL page pixels (what they'd be at zoom 1.0)
// so the same data renders correctly at any zoom level.
//
// Phase 5 (aggregated takeoff report) is still pending.

import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Document, Page, pdfjs } from 'react-pdf'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

pdfjs.GlobalWorkerOptions.workerSrc =
  `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`

const FG = '#3A5038'
const SIDEBAR_MIN = 240
const SIDEBAR_MAX = 600
const ACCEPTED = '.pdf,.png,.jpg,.jpeg,.webp,.gif'

const TOOL_META = {
  pointer: { icon: '➤',  label: 'Pointer' },
  scale:   { icon: '📏', label: 'Set Scale' },
  linear:  { icon: '📐', label: 'Linear' },
  area:    { icon: '⬛', label: 'Area' },
  count:   { icon: '🎯', label: 'Count' },
}

const COLOR_PRESETS = ['#3A5038', '#DC2626', '#2563EB', '#D97706', '#7C3AED', '#0891B2']

// Standard architectural + engineering imperial scales. Drawing inches per
// real-world foot. Assumes the PDF renders at 72 DPI at zoom = 1.0 (PDF
// standard), so pixels_per_foot = 72 * drawing_in_per_foot.
const IMPERIAL_SCALES = [
  { label: '1/64" = 1\'-0"',   ipf: 1/64 },
  { label: '1/32" = 1\'-0"',   ipf: 1/32 },
  { label: '1/16" = 1\'-0"',   ipf: 1/16 },
  { label: '3/32" = 1\'-0"',   ipf: 3/32 },
  { label: '1/8" = 1\'-0"',    ipf: 1/8 },
  { label: '3/16" = 1\'-0"',   ipf: 3/16 },
  { label: '1/4" = 1\'-0"',    ipf: 1/4 },
  { label: '3/8" = 1\'-0"',    ipf: 3/8 },
  { label: '1/2" = 1\'-0"',    ipf: 1/2 },
  { label: '3/4" = 1\'-0"',    ipf: 3/4 },
  { label: '1" = 1\'-0"',      ipf: 1 },
  { label: '1 1/2" = 1\'-0"',  ipf: 1.5 },
  { label: '3" = 1\'-0"',      ipf: 3 },
  // Engineering scales (1 inch = N feet)
  { label: '1" = 10\'',         ipf: 1/10 },
  { label: '1" = 20\'',         ipf: 1/20 },
  { label: '1" = 30\'',         ipf: 1/30 },
  { label: '1" = 40\'',         ipf: 1/40 },
  { label: '1" = 50\'',         ipf: 1/50 },
  { label: '1" = 60\'',         ipf: 1/60 },
  { label: '1" = 100\'',        ipf: 1/100 },
]

// Metric scales: 1:N (drawing units : real units). Same 72 DPI assumption.
// 1 px at zoom 1.0 = 1/72 inch = 25.4/72 mm on the drawing → * N mm in reality.
const METRIC_SCALES = [
  { label: '1:1',    ratio: 1 },
  { label: '1:5',    ratio: 5 },
  { label: '1:10',   ratio: 10 },
  { label: '1:20',   ratio: 20 },
  { label: '1:25',   ratio: 25 },
  { label: '1:50',   ratio: 50 },
  { label: '1:100',  ratio: 100 },
  { label: '1:200',  ratio: 200 },
  { label: '1:500',  ratio: 500 },
  { label: '1:1000', ratio: 1000 },
]

// Returns { ppu, unit } where ppu is pixels-per-unit at zoom 1.0
function computePresetPpu(measurementType, presetLabel) {
  if (measurementType === 'imperial') {
    const s = IMPERIAL_SCALES.find(x => x.label === presetLabel)
    if (!s) return null
    return { ppu: 72 * s.ipf, unit: 'ft' }
  }
  const s = METRIC_SCALES.find(x => x.label === presetLabel)
  if (!s) return null
  // 72000 / (25.4 * ratio)  ≈  2834.65 / ratio
  return { ppu: 72000 / (25.4 * s.ratio), unit: 'm' }
}

function isPdfFile(f) { return f?.file_type === 'application/pdf' || /\.pdf$/i.test(f?.file_name || '') }
function isImageFile(f) { return (f?.file_type || '').startsWith('image/') || /\.(png|jpe?g|gif|webp|svg)$/i.test(f?.file_name || '') }
function fmtBytes(n) {
  if (!n) return '—'
  const u = ['B','KB','MB','GB']; let i = 0
  while (n >= 1024 && i < u.length - 1) { n /= 1024; i++ }
  return n.toFixed(n < 10 ? 1 : 0) + ' ' + u[i]
}

// ── Geometry helpers (in natural-pixel coords) ─────────────────────────────
function distPx(a, b) { return Math.hypot(b[0] - a[0], b[1] - a[1]) }
function polylineLengthPx(pts) {
  let total = 0
  for (let i = 1; i < pts.length; i++) total += distPx(pts[i-1], pts[i])
  return total
}
function polygonAreaPx(pts) {
  if (pts.length < 3) return 0
  let s = 0
  for (let i = 0; i < pts.length; i++) {
    const [x1, y1] = pts[i]
    const [x2, y2] = pts[(i+1) % pts.length]
    s += x1 * y2 - x2 * y1
  }
  return Math.abs(s) / 2
}
function polygonCentroid(pts) {
  if (!pts.length) return [0, 0]
  let cx = 0, cy = 0
  for (const [x, y] of pts) { cx += x; cy += y }
  return [cx / pts.length, cy / pts.length]
}
function fmtLen(px, ppu, unit) {
  if (!ppu) return px.toFixed(0) + ' px'
  const v = px / ppu
  return v.toFixed(v < 10 ? 2 : 1) + ' ' + unit
}
function fmtArea(pxSq, ppu, unit) {
  if (!ppu) return pxSq.toFixed(0) + ' px²'
  const v = pxSq / (ppu * ppu)
  return v.toFixed(v < 10 ? 2 : 1) + ' sq ' + unit
}

export default function DesignDetail() {
  const { id } = useParams()
  const { user } = useAuth()
  const fileInputRef = useRef(null)
  const containerRef = useRef(null)
  const pageWrapRef  = useRef(null)
  const draggingRef  = useRef(false)

  // Files / project
  const [project,        setProject]        = useState(null)
  const [files,          setFiles]          = useState([])
  const [selectedFileId, setSelectedFileId] = useState(null)
  const [signedUrl,      setSignedUrl]      = useState(null)
  const [numPages,       setNumPages]       = useState(0)
  const [currentPage,    setCurrentPage]    = useState(1)
  const [zoom,           setZoom]           = useState(1.0)
  const [loading,        setLoading]        = useState(true)
  const [uploading,      setUploading]      = useState(false)
  const [error,          setError]          = useState('')

  const [sidebarWidth,   setSidebarWidth]   = useState(280)
  const [dropping,       setDropping]       = useState(false)

  // Drawing
  const [tool,           setTool]           = useState('pointer')
  const [drawColor,      setDrawColor]      = useState(FG)
  const [drawing,        setDrawing]        = useState(null)  // { type, points: [[x,y]…] }
  const [hoverPoint,     setHoverPoint]     = useState(null)  // [x,y] in natural coords for preview
  const [annotations,    setAnnotations]    = useState([])
  const [scaleDialog,    setScaleDialog]    = useState(null)  // { points, distance, unit }
  const [pageDims,       setPageDims]       = useState(null)  // {width, height} of rendered canvas at current zoom

  // ── Project + files ──────────────────────────────────────────────────────
  useEffect(() => { loadProjectAndFiles() }, [id])
  async function loadProjectAndFiles() {
    setLoading(true)
    const [{ data: proj }, { data: filesData }] = await Promise.all([
      supabase.from('design_projects').select('id, name, notes, status, clients(name)').eq('id', id).single(),
      supabase.from('design_files').select('*').eq('project_id', id).order('display_order').order('uploaded_at'),
    ])
    setProject(proj || null)
    setFiles(filesData || [])
    setLoading(false)
    if ((filesData || []).length > 0) setSelectedFileId(prev => prev || filesData[0].id)
    else setSelectedFileId(null)
  }

  // ── Signed URL ────────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false
    async function go() {
      if (!selectedFileId) { setSignedUrl(null); return }
      const f = files.find(x => x.id === selectedFileId)
      if (!f) { setSignedUrl(null); return }
      const { data, error: urlErr } = await supabase.storage
        .from('design-files').createSignedUrl(f.storage_path, 3600)
      if (cancelled) return
      if (urlErr) { setError('Could not load file: ' + urlErr.message); setSignedUrl(null); return }
      setSignedUrl(data.signedUrl)
      setNumPages(0); setCurrentPage(1); setZoom(1.0)
      setDrawing(null); setHoverPoint(null); setError('')
    }
    go()
    return () => { cancelled = true }
  }, [selectedFileId, files])

  // ── Annotations ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!selectedFileId) { setAnnotations([]); return }
    let cancelled = false
    ;(async () => {
      const { data } = await supabase
        .from('design_annotations')
        .select('*')
        .eq('file_id', selectedFileId)
        .eq('page_number', currentPage)
      if (!cancelled) setAnnotations(data || [])
    })()
    return () => { cancelled = true }
  }, [selectedFileId, currentPage])

  // Scale annotation for current page (if any)
  const pageScale = useMemo(() => {
    const s = annotations.find(a => a.type === 'scale')
    if (!s || !s.known_distance || !s.unit) return null
    const px = distPx(s.points[0], s.points[1])
    if (!px) return null
    return { ppu: px / s.known_distance, unit: s.unit }
  }, [annotations])

  // Aggregate counts for the sidebar (must live above any conditional returns
  // — Rules of Hooks: every render path must call the same hooks in the same
  // order, so we can't put a useMemo after `if (loading) return …`.)
  const totals = useMemo(() => {
    const linears = annotations.filter(a => a.type === 'linear')
    const areas   = annotations.filter(a => a.type === 'area')
    const counts  = annotations.filter(a => a.type === 'count')
    const linearTotal = linears.reduce((s, a) => s + polylineLengthPx(a.points), 0)
    const areaTotal   = areas  .reduce((s, a) => s + polygonAreaPx(a.points), 0)
    return {
      linearCount: linears.length, linearTotal,
      areaCount:   areas.length,   areaTotal,
      countTotal:  counts.length,
    }
  }, [annotations])

  // ── Splitter drag ─────────────────────────────────────────────────────────
  useEffect(() => {
    function onMove(e) {
      if (!draggingRef.current) return
      const rect = containerRef.current?.getBoundingClientRect()
      const x = e.clientX - (rect?.left || 0)
      setSidebarWidth(Math.max(SIDEBAR_MIN, Math.min(SIDEBAR_MAX, x)))
    }
    function onUp() {
      if (!draggingRef.current) return
      draggingRef.current = false
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
  }, [])
  function startDrag(e) {
    e.preventDefault()
    draggingRef.current = true
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }

  // ── Upload ────────────────────────────────────────────────────────────────
  async function handleUpload(file) {
    if (!file) return
    setError(''); setUploading(true)
    try {
      const safe = file.name.replace(/[^a-z0-9._-]/gi, '_')
      const path = `${id}/${Date.now()}_${safe}`
      const { error: upErr } = await supabase.storage.from('design-files')
        .upload(path, file, { cacheControl: '3600', upsert: false })
      if (upErr) throw upErr
      const { data: row, error: dbErr } = await supabase.from('design_files').insert({
        project_id: id, file_name: file.name, storage_path: path,
        file_type: file.type || null, size_bytes: file.size || null,
        uploaded_by: user?.id || null,
      }).select().single()
      if (dbErr) throw dbErr
      await loadProjectAndFiles()
      if (row?.id) setSelectedFileId(row.id)
    } catch (err) {
      setError('Upload failed: ' + err.message + (
        err.message?.toLowerCase().includes('bucket')
          ? ' — make sure you ran supabase-design-files.sql in Supabase.' : ''
      ))
    } finally { setUploading(false) }
  }
  function onFileInputChange(e) {
    const f = e.target.files?.[0]
    if (f) handleUpload(f); e.target.value = ''
  }
  async function handleDeleteFile(file, ev) {
    ev?.stopPropagation?.()
    if (!confirm(`Delete "${file.file_name}"? This cannot be undone.`)) return
    await supabase.storage.from('design-files').remove([file.storage_path])
    await supabase.from('design_files').delete().eq('id', file.id)
    if (selectedFileId === file.id) setSelectedFileId(null)
    await loadProjectAndFiles()
  }

  // ── PDF/page render → measure dims ────────────────────────────────────────
  function onPdfLoad({ numPages: n }) {
    setNumPages(n); setCurrentPage(1)
    const f = files.find(x => x.id === selectedFileId)
    if (f && f.num_pages !== n) supabase.from('design_files').update({ num_pages: n }).eq('id', f.id)
  }
  function onPageRender() {
    const el = pageWrapRef.current?.querySelector('canvas, img')
    if (el) setPageDims({ width: el.clientWidth, height: el.clientHeight })
  }
  // Recompute when zoom or page changes; canvas will redraw and clientWidth reflects new size.
  useEffect(() => {
    const t = setTimeout(onPageRender, 50)
    return () => clearTimeout(t)
  }, [zoom, currentPage, signedUrl])

  const zoomIn  = () => setZoom(z => Math.min(4,    +(z + 0.25).toFixed(2)))
  const zoomOut = () => setZoom(z => Math.max(0.25, +(z - 0.25).toFixed(2)))
  const zoomReset = () => setZoom(1.0)

  // ── Drawing click handlers ────────────────────────────────────────────────
  // Convert mouse event → natural coords (zoom = 1.0)
  function eventToCoords(e) {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = (e.clientX - rect.left) / zoom
    const y = (e.clientY - rect.top)  / zoom
    return [x, y]
  }
  function onSvgMouseMove(e) {
    if (tool === 'pointer') return
    if (!drawing && tool !== 'count') return
    setHoverPoint(eventToCoords(e))
  }
  function onSvgClick(e) {
    if (tool === 'pointer') return
    const pt = eventToCoords(e)

    if (tool === 'count') {
      saveAnnotation({ type: 'count', points: [pt], color: drawColor })
      return
    }

    if (tool === 'scale' || tool === 'linear') {
      if (!drawing) {
        setDrawing({ type: tool, points: [pt] })
      } else {
        const finalPts = [...drawing.points, pt]
        if (tool === 'scale') {
          setScaleDialog({ mode: 'twoPoints', points: finalPts, distance: '', unit: 'ft' })
        } else {
          saveAnnotation({ type: 'linear', points: finalPts, color: drawColor })
        }
        setDrawing(null); setHoverPoint(null)
      }
      return
    }

    if (tool === 'area') {
      if (!drawing) {
        setDrawing({ type: 'area', points: [pt] })
        return
      }
      // If user clicks within 10 natural-pixels of the first vertex AND has 3+ points, close.
      const first = drawing.points[0]
      const closing = drawing.points.length >= 3 && distPx(pt, first) < (10 / zoom)
      if (closing) {
        saveAnnotation({ type: 'area', points: drawing.points, color: drawColor })
        setDrawing(null); setHoverPoint(null)
      } else {
        setDrawing({ ...drawing, points: [...drawing.points, pt] })
      }
    }
  }
  function onSvgKeyDown(e) {
    if (e.key === 'Escape') { setDrawing(null); setHoverPoint(null) }
    if (e.key === 'Enter' && drawing?.type === 'area' && drawing.points.length >= 3) {
      saveAnnotation({ type: 'area', points: drawing.points, color: drawColor })
      setDrawing(null); setHoverPoint(null)
    }
  }
  // Hook keyboard listener on window so it works even without focus on SVG
  useEffect(() => {
    function onKey(e) { onSvgKeyDown(e) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drawing, drawColor])

  // ── Persistence ───────────────────────────────────────────────────────────
  async function saveAnnotation(payload) {
    if (!selectedFileId) return
    const { data, error: insErr } = await supabase
      .from('design_annotations')
      .insert({
        file_id:        selectedFileId,
        page_number:    currentPage,
        type:           payload.type,
        points:         payload.points,
        color:          payload.color || drawColor,
        label:          payload.label || null,
        known_distance: payload.known_distance ?? null,
        unit:           payload.unit ?? null,
        created_by:     user?.id || null,
      })
      .select().single()
    if (insErr) { setError('Save failed: ' + insErr.message); return }
    setAnnotations(prev => [...prev, data])
  }
  async function deleteAnnotation(annId) {
    await supabase.from('design_annotations').delete().eq('id', annId)
    setAnnotations(prev => prev.filter(a => a.id !== annId))
  }

  // ── Scale dialog: apply ─────────────────────────────────────────────────
  // Handles BOTH modes: 'page' picks ppu from a preset (no clicking needed),
  // 'twoPoints' uses the captured points + the user-entered real distance.
  async function applyScale() {
    if (!scaleDialog) return
    let scalePoints, knownDistance, unit, label

    if (scaleDialog.mode === 'page') {
      const got = computePresetPpu(scaleDialog.measurementType, scaleDialog.preset)
      if (!got) { setError('Pick a scale preset.'); return }
      // Synthetic scale: points span exactly 1 unit (ppu pixels) so
      // distPx / known_distance == ppu / 1 == ppu — same math as two-points.
      scalePoints   = [[0, 0], [got.ppu, 0]]
      knownDistance = 1
      unit          = got.unit
      label         = scaleDialog.preset
    } else {
      const dist = parseFloat(scaleDialog.distance)
      if (!isFinite(dist) || dist <= 0) { setError('Enter a positive distance.'); return }
      if (!scaleDialog.points || scaleDialog.points.length !== 2) {
        setError('No points captured. Click "Click 2 Points on Drawing" and click two points.')
        return
      }
      scalePoints   = scaleDialog.points
      knownDistance = dist
      unit          = scaleDialog.unit
      label         = `${dist} ${unit}`
    }

    // Pages we apply to (current, or every page if checkbox is on)
    const targetPages = (scaleDialog.applyAll && numPages > 1)
      ? Array.from({ length: numPages }, (_, i) => i + 1)
      : [currentPage]

    // Replace any existing scale rows on those pages
    const { data: existingScales } = await supabase
      .from('design_annotations')
      .select('id')
      .eq('file_id', selectedFileId)
      .eq('type', 'scale')
      .in('page_number', targetPages)
    if (existingScales?.length) {
      await supabase.from('design_annotations').delete().in('id', existingScales.map(r => r.id))
    }

    // Insert one scale row per target page
    const rows = targetPages.map(p => ({
      file_id:        selectedFileId,
      page_number:    p,
      type:           'scale',
      points:         scalePoints,
      color:          '#FF8800',
      label:          label,
      known_distance: knownDistance,
      unit:           unit,
      created_by:     user?.id || null,
    }))
    const { error: insErr } = await supabase.from('design_annotations').insert(rows)
    if (insErr) { setError('Save failed: ' + insErr.message); return }

    // Refresh the current page's annotations list
    const { data: refreshed } = await supabase
      .from('design_annotations')
      .select('*')
      .eq('file_id', selectedFileId)
      .eq('page_number', currentPage)
    setAnnotations(refreshed || [])
    setScaleDialog(null)
  }

  // Trigger the two-points capture flow from inside the dialog
  function startTwoPointsCapture() {
    setScaleDialog(null)
    setTool('scale')
    setDrawing(null)
    setHoverPoint(null)
  }

  // ── Render ────────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="flex items-center justify-center h-screen">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-700"></div>
    </div>
  )
  if (!project) return (
    <div className="p-6 max-w-3xl mx-auto">
      <Link to="/design" className="text-sm text-green-700 hover:underline">← Back to Design</Link>
      <p className="mt-6 text-gray-500">Project not found.</p>
    </div>
  )

  const selectedFile = files.find(f => f.id === selectedFileId) || null

  return (
    <div ref={containerRef} className="flex h-[calc(100vh-2.75rem)] -m-4 lg:-m-6 bg-gray-100 overflow-hidden">

      {/* ── Sidebar ──────────────────────────────────────────────────────── */}
      <aside style={{ width: sidebarWidth }} className="flex flex-col bg-white border-r border-gray-200 overflow-hidden flex-shrink-0">
        <div className="px-4 py-3 border-b border-gray-200 flex-shrink-0">
          <Link to="/design" className="text-xs text-green-700 hover:underline block mb-1">← All Projects</Link>
          <h1 className="text-base font-bold text-gray-900 truncate" title={project.name}>{project.name}</h1>
          {project.clients?.name && <p className="text-xs text-gray-500 truncate">{project.clients.name}</p>}
        </div>

        {/* Upload zone */}
        <div className="px-4 py-3 border-b border-gray-200 flex-shrink-0">
          <div
            onDragOver={(e) => { e.preventDefault(); setDropping(true) }}
            onDragLeave={(e) => { e.preventDefault(); setDropping(false) }}
            onDrop={(e) => { e.preventDefault(); setDropping(false); const f = e.dataTransfer.files?.[0]; if (f) handleUpload(f) }}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl px-3 py-3 text-center cursor-pointer transition-colors ${
              dropping ? 'border-green-500 bg-green-50' : 'border-gray-300 hover:border-green-500 hover:bg-green-50/40'
            }`}
          >
            <p className="text-xl mb-1">📥</p>
            <p className="text-xs font-medium text-gray-700">{uploading ? 'Uploading…' : 'Upload drawing'}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">PDF, PNG, JPG, GIF</p>
          </div>
          <input ref={fileInputRef} type="file" accept={ACCEPTED} onChange={onFileInputChange} className="hidden" />
        </div>

        {/* File list */}
        <div className="overflow-y-auto border-b border-gray-200 max-h-48 flex-shrink-0">
          {files.length === 0 ? (
            <div className="px-4 py-4 text-center text-xs text-gray-400">No files yet.</div>
          ) : files.map(f => (
            <button key={f.id} onClick={() => setSelectedFileId(f.id)}
              className={`w-full text-left px-4 py-2 border-b border-gray-100 transition-colors flex items-start gap-2 group ${
                f.id === selectedFileId ? 'bg-green-50 text-green-800' : 'hover:bg-gray-50 text-gray-800'
              }`}>
              <span className="text-base flex-shrink-0">{isPdfFile(f) ? '📄' : isImageFile(f) ? '🖼️' : '📎'}</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate" title={f.file_name}>{f.file_name}</p>
                <p className="text-[10px] text-gray-400">{fmtBytes(f.size_bytes)}{f.num_pages ? ` · ${f.num_pages}p` : ''}</p>
              </div>
              <span onClick={e => handleDeleteFile(f, e)} className="text-gray-300 group-hover:text-red-500 hover:!text-red-700 text-xs flex-shrink-0 px-1" title="Delete file">✕</span>
            </button>
          ))}
        </div>

        {/* Takeoff totals + annotations */}
        {selectedFile && (
          <div className="flex-1 overflow-y-auto">
            <div className="px-4 py-3 border-b border-gray-100">
              <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Takeoff (page {currentPage})</h3>
              {pageScale ? (
                <p className="text-[11px] text-green-700 mb-2">Scale: 1 px = {(1 / pageScale.ppu).toFixed(4)} {pageScale.unit}</p>
              ) : (
                <p className="text-[11px] text-amber-600 mb-2">⚠ No scale set — measurements show in pixels.</p>
              )}
              <div className="text-xs text-gray-700 space-y-1">
                <p>📐 Linear: <strong>{totals.linearCount}</strong> ({fmtLen(totals.linearTotal, pageScale?.ppu, pageScale?.unit || '')})</p>
                <p>⬛ Area: <strong>{totals.areaCount}</strong> ({fmtArea(totals.areaTotal, pageScale?.ppu, pageScale?.unit || '')})</p>
                <p>🎯 Count: <strong>{totals.countTotal}</strong></p>
              </div>
            </div>

            {annotations.length > 0 && (
              <div className="px-4 py-2 border-b border-gray-100">
                <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">Annotations</h3>
                {annotations.map(a => (
                  <div key={a.id} className="flex items-center gap-2 py-1 group">
                    <span className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: a.color || '#666' }} />
                    <span className="text-xs flex-1 truncate">
                      {TOOL_META[a.type]?.icon} {a.type}
                      {a.type === 'linear' && ` · ${fmtLen(polylineLengthPx(a.points), pageScale?.ppu, pageScale?.unit || '')}`}
                      {a.type === 'area'   && ` · ${fmtArea(polygonAreaPx(a.points), pageScale?.ppu, pageScale?.unit || '')}`}
                      {a.type === 'scale'  && ` · ${a.known_distance} ${a.unit}`}
                    </span>
                    <button onClick={() => deleteAnnotation(a.id)} className="text-gray-300 group-hover:text-red-500 hover:!text-red-700 text-xs px-1">✕</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="px-4 py-2 border-t border-gray-200 text-[10px] text-gray-400 flex-shrink-0">Phase 4 of 5 · report coming next</div>
      </aside>

      {/* ── Splitter ─────────────────────────────────────────────────────── */}
      <div onMouseDown={startDrag} className="w-1 bg-gray-200 hover:bg-green-500 cursor-col-resize flex-shrink-0 transition-colors" />

      {/* ── Viewer ───────────────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col overflow-hidden">

        {/* Toolbar */}
        <div className="flex items-center gap-2 px-4 py-2 bg-white border-b border-gray-200 flex-shrink-0 flex-wrap">
          {selectedFile ? (
            <p className="text-sm font-medium text-gray-700 truncate max-w-xs" title={selectedFile.file_name}>{selectedFile.file_name}</p>
          ) : (
            <p className="text-sm text-gray-400">No file selected</p>
          )}

          {/* Tool selector */}
          {selectedFile && (
            <div className="flex items-center gap-1 ml-2">
              {Object.entries(TOOL_META).map(([k, m]) => (
                <button key={k}
                  onClick={() => {
                    if (k === 'scale') {
                      // Open the scale dialog; it offers Page Scale + Two Points
                      setTool('pointer'); setDrawing(null); setHoverPoint(null)
                      setScaleDialog({
                        mode: 'page',
                        measurementType: 'imperial',
                        preset: '1/8" = 1\'-0"',
                        applyAll: false,
                        points: null,
                        distance: '',
                        unit: 'ft',
                      })
                    } else {
                      setTool(k); setDrawing(null); setHoverPoint(null)
                    }
                  }}
                  title={k === 'scale' && !pageScale ? 'Set scale (required for measurements)' : m.label}
                  className={`px-2 py-1 rounded text-xs border transition-colors ${
                    tool === k ? 'bg-green-700 text-white border-green-700' : 'bg-white border-gray-300 hover:bg-gray-50 text-gray-700'
                  }`}>
                  <span className="mr-1">{m.icon}</span>{m.label}
                </button>
              ))}
            </div>
          )}

          {/* Color picker for active tool */}
          {selectedFile && tool !== 'pointer' && tool !== 'scale' && (
            <div className="flex items-center gap-1 ml-1">
              {COLOR_PRESETS.map(c => (
                <button key={c} onClick={() => setDrawColor(c)} title={c}
                  className={`w-5 h-5 rounded-full border-2 transition-transform ${drawColor === c ? 'border-gray-800 scale-110' : 'border-white shadow'}`}
                  style={{ backgroundColor: c }} />
              ))}
            </div>
          )}

          <div className="flex-1" />

          {/* Page nav */}
          {isPdfFile(selectedFile) && numPages > 0 && (
            <div className="flex items-center gap-1 mr-2">
              <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage <= 1}
                className="px-2 py-1 rounded text-sm border border-gray-300 hover:bg-gray-50 disabled:opacity-30">‹</button>
              <span className="text-xs text-gray-600 px-2">Page {currentPage} / {numPages}</span>
              <button onClick={() => setCurrentPage(p => Math.min(numPages, p + 1))} disabled={currentPage >= numPages}
                className="px-2 py-1 rounded text-sm border border-gray-300 hover:bg-gray-50 disabled:opacity-30">›</button>
            </div>
          )}

          {/* Zoom controls */}
          <div className="flex items-center gap-1">
            <button onClick={zoomOut} className="px-2 py-1 rounded text-sm border border-gray-300 hover:bg-gray-50" title="Zoom out">−</button>
            <button onClick={zoomReset} className="px-2 py-1 rounded text-xs border border-gray-300 hover:bg-gray-50 min-w-[3.25rem]" title="Reset zoom">{Math.round(zoom * 100)}%</button>
            <button onClick={zoomIn} className="px-2 py-1 rounded text-sm border border-gray-300 hover:bg-gray-50" title="Zoom in">+</button>
          </div>
        </div>

        {/* Status hint */}
        {tool !== 'pointer' && (
          <div className="bg-amber-50 border-b border-amber-200 px-4 py-1.5 text-xs text-amber-800 flex-shrink-0">
            {tool === 'scale'  && (drawing ? 'Click the second point of a known distance.' : 'Click the first point of a known distance, then click the second.')}
            {tool === 'linear' && (drawing ? 'Click the end point.' : 'Click the start of a linear measurement.')}
            {tool === 'area'   && (drawing ? `Click vertices (${drawing.points.length} so far). Click near the first point or press Enter to close. Esc to cancel.` : 'Click the first vertex of an area.')}
            {tool === 'count'  && 'Click anywhere to drop a count marker.'}
          </div>
        )}

        {/* Canvas + overlay */}
        <div className="flex-1 overflow-auto bg-gray-200 p-6">
          {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm mb-4 max-w-3xl mx-auto"><span className="font-semibold">Error:</span> {error}</div>}

          {!selectedFile ? (
            <div className="text-center py-20 text-gray-400">
              <p className="text-5xl mb-3">📐</p>
              <p className="text-base font-medium text-gray-600">Upload a drawing to get started</p>
            </div>
          ) : !signedUrl ? (
            <div className="text-center py-20 text-gray-400">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-700 mx-auto mb-3"></div>
              <p className="text-sm">Loading file…</p>
            </div>
          ) : (
            <div className="flex justify-center">
              <div ref={pageWrapRef} className="relative inline-block shadow-lg bg-white" style={{ lineHeight: 0 }}>
                {isPdfFile(selectedFile) ? (
                  <Document file={signedUrl} onLoadSuccess={onPdfLoad} onLoadError={(err) => setError('PDF load failed: ' + err.message)}>
                    <Page pageNumber={currentPage} scale={zoom} renderTextLayer={false} renderAnnotationLayer={false} onRenderSuccess={onPageRender} />
                  </Document>
                ) : isImageFile(selectedFile) ? (
                  <img src={signedUrl} alt={selectedFile.file_name} onLoad={onPageRender} style={{ width: `${zoom * 100}%`, maxWidth: 'none', display: 'block' }} />
                ) : (
                  <div className="p-12 text-center text-gray-500"><p className="text-sm">Preview not available.</p></div>
                )}

                {/* SVG annotation overlay */}
                {pageDims && (
                  <svg
                    width={pageDims.width}
                    height={pageDims.height}
                    onClick={onSvgClick}
                    onMouseMove={onSvgMouseMove}
                    onMouseLeave={() => setHoverPoint(null)}
                    style={{ position: 'absolute', top: 0, left: 0, cursor: tool === 'pointer' ? 'default' : 'crosshair' }}
                  >
                    {/* Saved annotations (skip 'scale' — visualised only in sidebar) */}
                    {annotations.filter(a => a.type !== 'scale').map(a => (
                      <AnnotationShape key={a.id} a={a} zoom={zoom} pageScale={pageScale} />
                    ))}
                    {/* In-progress preview */}
                    {drawing && (
                      <DrawingPreview drawing={drawing} hover={hoverPoint} zoom={zoom} color={drawing.type === 'scale' ? '#FF8800' : drawColor} pageScale={pageScale} />
                    )}
                  </svg>
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* ── Scale dialog ─────────────────────────────────────────────────── */}
      {scaleDialog && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setScaleDialog(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between" style={{ backgroundColor: FG }}>
              <div>
                <h2 className="text-base font-bold text-white">Set Page Scale</h2>
                <p className="text-xs text-green-200 mt-0.5">Page {currentPage}{numPages > 1 ? ` of ${numPages}` : ''}</p>
              </div>
              <button onClick={() => setScaleDialog(null)} className="text-white/70 hover:text-white text-xl leading-none px-2">✕</button>
            </div>

            {/* Mode toggle */}
            <div className="px-6 pt-4 pb-2 flex gap-2">
              <button
                onClick={() => setScaleDialog({ ...scaleDialog, mode: 'page' })}
                className={`flex-1 px-3 py-2 text-sm rounded-lg border-2 transition-colors ${
                  scaleDialog.mode === 'page' ? 'border-green-700 bg-green-50 text-green-800 font-semibold' : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                }`}
              >
                📐 Set via Page Scale
              </button>
              <button
                onClick={() => setScaleDialog({ ...scaleDialog, mode: 'twoPoints' })}
                className={`flex-1 px-3 py-2 text-sm rounded-lg border-2 transition-colors ${
                  scaleDialog.mode === 'twoPoints' ? 'border-green-700 bg-green-50 text-green-800 font-semibold' : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                }`}
              >
                📏 Set via Two Points
              </button>
            </div>

            {/* Page Scale mode body */}
            {scaleDialog.mode === 'page' && (
              <div className="p-6 space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Measurement Type</label>
                  <div className="flex gap-2">
                    {['imperial', 'metric'].map(t => (
                      <button
                        key={t}
                        onClick={() => setScaleDialog({
                          ...scaleDialog,
                          measurementType: t,
                          preset: t === 'imperial' ? '1/8" = 1\'-0"' : '1:100',
                        })}
                        className={`flex-1 px-3 py-2 text-sm rounded-lg border transition-colors ${
                          scaleDialog.measurementType === t ? 'border-green-700 bg-green-50 text-green-800 font-semibold' : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        {t === 'imperial' ? 'Imperial (ft / in)' : 'Metric (m / mm)'}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Drawing Scale</label>
                  <select
                    value={scaleDialog.preset}
                    onChange={e => setScaleDialog({ ...scaleDialog, preset: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-700/30 focus:border-green-700"
                  >
                    {(scaleDialog.measurementType === 'imperial' ? IMPERIAL_SCALES : METRIC_SCALES).map(s => (
                      <option key={s.label} value={s.label}>{s.label}</option>
                    ))}
                  </select>
                </div>

                {numPages > 1 && (
                  <label className="flex items-center gap-2 cursor-pointer pt-1">
                    <input
                      type="checkbox"
                      checked={!!scaleDialog.applyAll}
                      onChange={e => setScaleDialog({ ...scaleDialog, applyAll: e.target.checked })}
                      className="w-4 h-4 rounded accent-green-700"
                    />
                    <span className="text-sm text-gray-700">Apply same scale to all {numPages} pages</span>
                  </label>
                )}

                <p className="text-xs text-gray-500 pt-1">
                  Picks pixels-per-unit from the standard scale assuming the drawing renders at 72 DPI (PDF default).
                </p>
              </div>
            )}

            {/* Two Points mode body */}
            {scaleDialog.mode === 'twoPoints' && (
              <div className="p-6 space-y-3">
                {!scaleDialog.points ? (
                  <>
                    <p className="text-sm text-gray-700">
                      Click <strong>Click 2 Points on Drawing</strong>, then click two points along something with a known length (a labelled scale bar, a wall whose length you know, etc.). This dialog will reopen so you can enter the real distance.
                    </p>
                    <button
                      onClick={startTwoPointsCapture}
                      className="w-full py-2 rounded-lg text-sm font-bold text-white"
                      style={{ backgroundColor: FG }}
                    >
                      Click 2 Points on Drawing
                    </button>
                  </>
                ) : (
                  <>
                    <p className="text-xs text-gray-500">
                      Drawn distance: <strong>{distPx(scaleDialog.points[0], scaleDialog.points[1]).toFixed(1)} px</strong>
                    </p>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Real-world distance</label>
                      <div className="flex gap-2">
                        <input type="number" step="any" autoFocus value={scaleDialog.distance}
                          onChange={e => setScaleDialog({ ...scaleDialog, distance: e.target.value })}
                          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-700/30 focus:border-green-700"
                          placeholder="e.g. 10" />
                        <select value={scaleDialog.unit}
                          onChange={e => setScaleDialog({ ...scaleDialog, unit: e.target.value })}
                          className="border border-gray-300 rounded-lg px-2 py-2 text-sm bg-white">
                          <option value="ft">ft</option><option value="in">in</option>
                          <option value="m">m</option><option value="cm">cm</option>
                        </select>
                      </div>
                    </div>
                    {numPages > 1 && (
                      <label className="flex items-center gap-2 cursor-pointer pt-1">
                        <input
                          type="checkbox"
                          checked={!!scaleDialog.applyAll}
                          onChange={e => setScaleDialog({ ...scaleDialog, applyAll: e.target.checked })}
                          className="w-4 h-4 rounded accent-green-700"
                        />
                        <span className="text-sm text-gray-700">Apply same scale to all {numPages} pages</span>
                      </label>
                    )}
                  </>
                )}
              </div>
            )}

            <div className="px-6 py-3 border-t border-gray-200 bg-gray-50 flex justify-end gap-2">
              <button onClick={() => setScaleDialog(null)} className="px-4 py-2 rounded-lg text-sm text-gray-600 hover:bg-white border border-gray-300">Cancel</button>
              <button
                onClick={applyScale}
                disabled={
                  scaleDialog.mode === 'page'
                    ? !scaleDialog.preset
                    : !scaleDialog.points || !scaleDialog.distance || parseFloat(scaleDialog.distance) <= 0
                }
                className="px-5 py-2 rounded-lg text-sm font-bold text-white disabled:opacity-50" style={{ backgroundColor: FG }}>
                Apply Scale
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Sub-components ──────────────────────────────────────────────────────────

function AnnotationShape({ a, zoom, pageScale }) {
  const z = zoom
  const pts = a.points.map(([x, y]) => [x * z, y * z])
  const color = a.color || '#3A5038'
  if (a.type === 'count') {
    const [x, y] = pts[0] || [0, 0]
    return (
      <g pointerEvents="none">
        <circle cx={x} cy={y} r={8} fill={color} stroke="#fff" strokeWidth={2} />
      </g>
    )
  }
  if (a.type === 'linear' || a.type === 'scale') {
    const [a0, b0] = pts
    if (!a0 || !b0) return null
    const lengthPx = distPx(a.points[0], a.points[1])
    const label = a.type === 'scale'
      ? `${a.known_distance} ${a.unit}`
      : fmtLen(lengthPx, pageScale?.ppu, pageScale?.unit || '')
    const mid = [(a0[0] + b0[0]) / 2, (a0[1] + b0[1]) / 2]
    return (
      <g pointerEvents="none">
        <line x1={a0[0]} y1={a0[1]} x2={b0[0]} y2={b0[1]} stroke={color} strokeWidth={3}
              strokeDasharray={a.type === 'scale' ? '6 4' : undefined} />
        <circle cx={a0[0]} cy={a0[1]} r={4} fill={color} stroke="#fff" strokeWidth={1.5} />
        <circle cx={b0[0]} cy={b0[1]} r={4} fill={color} stroke="#fff" strokeWidth={1.5} />
        <rect x={mid[0] - 28} y={mid[1] - 10} width={56} height={20} rx={3} fill="white" stroke={color} />
        <text x={mid[0]} y={mid[1] + 5} textAnchor="middle" fontSize={11} fill="#1f2937" fontWeight={600}>{label}</text>
      </g>
    )
  }
  if (a.type === 'area') {
    if (pts.length < 2) return null
    const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0]} ${p[1]}`).join(' ') + ' Z'
    const areaPx = polygonAreaPx(a.points)
    const [cx, cy] = polygonCentroid(pts)
    const label = fmtArea(areaPx, pageScale?.ppu, pageScale?.unit || '')
    return (
      <g pointerEvents="none">
        <path d={d} fill={color} fillOpacity={0.25} stroke={color} strokeWidth={2} />
        {pts.map((p, i) => (<circle key={i} cx={p[0]} cy={p[1]} r={3} fill={color} stroke="#fff" strokeWidth={1} />))}
        <rect x={cx - 36} y={cy - 10} width={72} height={20} rx={3} fill="white" stroke={color} />
        <text x={cx} y={cy + 5} textAnchor="middle" fontSize={11} fill="#1f2937" fontWeight={600}>{label}</text>
      </g>
    )
  }
  return null
}

function DrawingPreview({ drawing, hover, zoom, color, pageScale }) {
  const z = zoom
  const pts = drawing.points.map(([x, y]) => [x * z, y * z])

  if (drawing.type === 'scale' || drawing.type === 'linear') {
    const a0 = pts[0]
    const tip = hover ? [hover[0] * z, hover[1] * z] : a0
    if (!a0) return null
    const lengthPx = distPx(drawing.points[0], hover || drawing.points[0])
    const label = drawing.type === 'scale'
      ? `${lengthPx.toFixed(1)} px`
      : fmtLen(lengthPx, pageScale?.ppu, pageScale?.unit || '')
    return (
      <g pointerEvents="none">
        <line x1={a0[0]} y1={a0[1]} x2={tip[0]} y2={tip[1]} stroke={color} strokeWidth={3} strokeDasharray="6 4" opacity={0.85} />
        <circle cx={a0[0]} cy={a0[1]} r={4} fill={color} stroke="#fff" strokeWidth={1.5} />
        {hover && (<>
          <circle cx={tip[0]} cy={tip[1]} r={4} fill={color} stroke="#fff" strokeWidth={1.5} />
          <text x={tip[0] + 8} y={tip[1] - 8} fontSize={11} fill="#1f2937" fontWeight={600} style={{ paintOrder: 'stroke', stroke: '#fff', strokeWidth: 3 }}>{label}</text>
        </>)}
      </g>
    )
  }

  if (drawing.type === 'area' && pts.length > 0) {
    const tip = hover ? [hover[0] * z, hover[1] * z] : null
    const allPts = tip ? [...pts, tip] : pts
    const d = allPts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0]} ${p[1]}`).join(' ')
    return (
      <g pointerEvents="none">
        <path d={d} fill={color} fillOpacity={0.15} stroke={color} strokeWidth={2} strokeDasharray="6 4" />
        {pts.map((p, i) => (<circle key={i} cx={p[0]} cy={p[1]} r={4} fill={color} stroke="#fff" strokeWidth={1.5} />))}
      </g>
    )
  }

  return null
}
