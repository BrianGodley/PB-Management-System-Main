// src/pages/DesignDetail.jsx
//
// Phase 2 of Design / CAD-takeoff: upload + multi-page viewer + drag-resize.
//
// Layout:
//   ┌──────────────┬─┬───────────────────────────────────┐
//   │  File list   │ │  Toolbar (zoom, page nav)         │
//   │  + upload    │ │  ┌─────────────────────────────┐  │
//   │              │ │  │   PDF page / image          │  │
//   │              │ │  └─────────────────────────────┘  │
//   └──────────────┴─┴───────────────────────────────────┘
//        sidebar    splitter     viewer
//
// PDFs are rendered one page at a time via react-pdf (Mozilla's PDF.js
// wrapper). Images render inline. Files live in the private 'design-files'
// Supabase Storage bucket; signed URLs are minted on-demand for the viewer.
//
// Subsequent phases:
//   • Phase 3 — scale calibration (click two points + known distance)
//   • Phase 4 — overlay drawing tools (linear / area / count)
//   • Phase 5 — aggregated takeoff report

import { useEffect, useRef, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Document, Page, pdfjs } from 'react-pdf'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

// PDF.js worker — load from a CDN so Vite doesn't have to bundle it. Local
// worker imports via new URL(...) work but can break across react-pdf
// versions; the CDN approach is the most reliable.
pdfjs.GlobalWorkerOptions.workerSrc =
  `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`

const FG = '#3A5038'
const SIDEBAR_MIN = 220
const SIDEBAR_MAX = 560

const ACCEPTED_EXTENSIONS = '.pdf,.png,.jpg,.jpeg,.webp,.gif'

function isPdfFile(f) {
  return f?.file_type === 'application/pdf' ||
         /\.pdf$/i.test(f?.file_name || '')
}
function isImageFile(f) {
  return (f?.file_type || '').startsWith('image/') ||
         /\.(png|jpe?g|gif|webp|svg)$/i.test(f?.file_name || '')
}
function fmtBytes(n) {
  if (!n) return '—'
  const units = ['B', 'KB', 'MB', 'GB']
  let i = 0
  while (n >= 1024 && i < units.length - 1) { n /= 1024; i++ }
  return n.toFixed(n < 10 ? 1 : 0) + ' ' + units[i]
}

export default function DesignDetail() {
  const { id } = useParams()
  const { user } = useAuth()
  const fileInputRef = useRef(null)
  const containerRef = useRef(null)
  const draggingRef  = useRef(false)

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

  // ── Load project + files ──────────────────────────────────────────────────
  useEffect(() => { loadProjectAndFiles() }, [id])

  async function loadProjectAndFiles() {
    setLoading(true)
    const [{ data: proj }, { data: filesData, error: filesErr }] = await Promise.all([
      supabase
        .from('design_projects')
        .select('id, name, notes, status, clients(name)')
        .eq('id', id)
        .single(),
      supabase
        .from('design_files')
        .select('*')
        .eq('project_id', id)
        .order('display_order')
        .order('uploaded_at'),
    ])
    if (filesErr) setError('Failed to load files: ' + filesErr.message)
    setProject(proj || null)
    setFiles(filesData || [])
    setLoading(false)
    if ((filesData || []).length > 0) {
      setSelectedFileId(prev => prev || filesData[0].id)
    } else {
      setSelectedFileId(null)
    }
  }

  // ── Mint signed URL whenever the selected file changes ────────────────────
  useEffect(() => {
    let cancelled = false
    async function go() {
      if (!selectedFileId) { setSignedUrl(null); return }
      const file = files.find(f => f.id === selectedFileId)
      if (!file) { setSignedUrl(null); return }
      const { data, error: urlErr } = await supabase.storage
        .from('design-files')
        .createSignedUrl(file.storage_path, 3600)
      if (cancelled) return
      if (urlErr) {
        setError('Could not load file: ' + urlErr.message)
        setSignedUrl(null)
        return
      }
      setSignedUrl(data.signedUrl)
      setNumPages(0)
      setCurrentPage(1)
      setZoom(1.0)
      setError('')
    }
    go()
    return () => { cancelled = true }
  }, [selectedFileId, files])

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
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
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
    setError('')
    setUploading(true)
    try {
      const safeName = file.name.replace(/[^a-z0-9._-]/gi, '_')
      const path = `${id}/${Date.now()}_${safeName}`

      const { error: upErr } = await supabase.storage
        .from('design-files')
        .upload(path, file, { cacheControl: '3600', upsert: false })
      if (upErr) throw upErr

      const { data: row, error: dbErr } = await supabase
        .from('design_files')
        .insert({
          project_id:   id,
          file_name:    file.name,
          storage_path: path,
          file_type:    file.type || null,
          size_bytes:   file.size || null,
          uploaded_by:  user?.id || null,
        })
        .select()
        .single()
      if (dbErr) throw dbErr

      await loadProjectAndFiles()
      if (row?.id) setSelectedFileId(row.id)
    } catch (err) {
      setError('Upload failed: ' + err.message + (
        err.message?.toLowerCase().includes('bucket')
          ? ' — make sure you ran supabase-design-files.sql in Supabase.'
          : ''
      ))
    } finally {
      setUploading(false)
    }
  }

  function onFileInputChange(e) {
    const f = e.target.files?.[0]
    if (f) handleUpload(f)
    e.target.value = ''
  }

  function onDragOver(e) {
    e.preventDefault()
    setDropping(true)
  }
  function onDragLeave(e) {
    e.preventDefault()
    setDropping(false)
  }
  function onDrop(e) {
    e.preventDefault()
    setDropping(false)
    const f = e.dataTransfer.files?.[0]
    if (f) handleUpload(f)
  }

  // ── Delete a file ─────────────────────────────────────────────────────────
  async function handleDelete(file, ev) {
    ev?.stopPropagation?.()
    if (!confirm(`Delete "${file.file_name}"? This cannot be undone.`)) return
    await supabase.storage.from('design-files').remove([file.storage_path])
    await supabase.from('design_files').delete().eq('id', file.id)
    if (selectedFileId === file.id) setSelectedFileId(null)
    await loadProjectAndFiles()
  }

  // ── PDF callbacks ─────────────────────────────────────────────────────────
  function onPdfLoad({ numPages: n }) {
    setNumPages(n)
    setCurrentPage(1)
    // Persist num_pages back to the row for future listings
    const file = files.find(f => f.id === selectedFileId)
    if (file && file.num_pages !== n) {
      supabase.from('design_files').update({ num_pages: n }).eq('id', file.id)
    }
  }

  // ── Zoom helpers ──────────────────────────────────────────────────────────
  const zoomIn  = () => setZoom(z => Math.min(4, +(z + 0.25).toFixed(2)))
  const zoomOut = () => setZoom(z => Math.max(0.25, +(z - 0.25).toFixed(2)))
  const zoomReset = () => setZoom(1.0)

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
      <aside
        style={{ width: sidebarWidth }}
        className="flex flex-col bg-white border-r border-gray-200 overflow-hidden flex-shrink-0"
      >
        <div className="px-4 py-3 border-b border-gray-200 flex-shrink-0">
          <Link to="/design" className="text-xs text-green-700 hover:underline block mb-1">← All Projects</Link>
          <h1 className="text-base font-bold text-gray-900 truncate" title={project.name}>{project.name}</h1>
          {project.clients?.name && (
            <p className="text-xs text-gray-500 truncate">{project.clients.name}</p>
          )}
        </div>

        {/* Upload zone */}
        <div className="px-4 py-3 border-b border-gray-200 flex-shrink-0">
          <div
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl px-3 py-4 text-center cursor-pointer transition-colors ${
              dropping
                ? 'border-green-500 bg-green-50'
                : 'border-gray-300 hover:border-green-500 hover:bg-green-50/40'
            }`}
          >
            <p className="text-2xl mb-1">📥</p>
            <p className="text-xs font-medium text-gray-700">
              {uploading ? 'Uploading…' : 'Drop file or click to upload'}
            </p>
            <p className="text-[10px] text-gray-400 mt-0.5">PDF, PNG, JPG, GIF, WebP</p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_EXTENSIONS}
            onChange={onFileInputChange}
            className="hidden"
          />
        </div>

        {/* File list */}
        <div className="flex-1 overflow-y-auto">
          {files.length === 0 ? (
            <div className="px-4 py-8 text-center text-xs text-gray-400">
              No files yet. Upload above to start.
            </div>
          ) : files.map(f => (
            <button
              key={f.id}
              onClick={() => setSelectedFileId(f.id)}
              className={`w-full text-left px-4 py-2 border-b border-gray-100 transition-colors flex items-start gap-2 group ${
                f.id === selectedFileId
                  ? 'bg-green-50 text-green-800'
                  : 'hover:bg-gray-50 text-gray-800'
              }`}
            >
              <span className="text-base flex-shrink-0">{isPdfFile(f) ? '📄' : isImageFile(f) ? '🖼️' : '📎'}</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate" title={f.file_name}>{f.file_name}</p>
                <p className="text-[10px] text-gray-400">
                  {fmtBytes(f.size_bytes)}
                  {f.num_pages ? ` · ${f.num_pages}p` : ''}
                </p>
              </div>
              <span
                onClick={e => handleDelete(f, e)}
                className="text-gray-300 group-hover:text-red-500 hover:!text-red-700 text-xs flex-shrink-0 px-1"
                title="Delete file"
              >✕</span>
            </button>
          ))}
        </div>

        {/* Phase progress */}
        <div className="px-4 py-2 border-t border-gray-200 text-[10px] text-gray-400 flex-shrink-0">
          Phase 2 of 5 · drawing tools in upcoming releases
        </div>
      </aside>

      {/* ── Splitter ─────────────────────────────────────────────────────── */}
      <div
        onMouseDown={startDrag}
        className="w-1 bg-gray-200 hover:bg-green-500 cursor-col-resize flex-shrink-0 transition-colors"
        title="Drag to resize"
      />

      {/* ── Viewer ───────────────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col overflow-hidden">

        {/* Toolbar */}
        <div className="flex items-center gap-2 px-4 py-2 bg-white border-b border-gray-200 flex-shrink-0">
          {selectedFile ? (
            <p className="text-sm font-medium text-gray-700 truncate" title={selectedFile.file_name}>
              {selectedFile.file_name}
            </p>
          ) : (
            <p className="text-sm text-gray-400">No file selected</p>
          )}

          <div className="flex-1" />

          {/* Page nav (PDFs only) */}
          {isPdfFile(selectedFile) && numPages > 0 && (
            <div className="flex items-center gap-1 mr-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                className="px-2 py-1 rounded text-sm border border-gray-300 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
              >‹</button>
              <span className="text-xs text-gray-600 px-2">Page {currentPage} / {numPages}</span>
              <button
                onClick={() => setCurrentPage(p => Math.min(numPages, p + 1))}
                disabled={currentPage >= numPages}
                className="px-2 py-1 rounded text-sm border border-gray-300 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
              >›</button>
            </div>
          )}

          {/* Zoom controls */}
          <div className="flex items-center gap-1">
            <button onClick={zoomOut} className="px-2 py-1 rounded text-sm border border-gray-300 hover:bg-gray-50" title="Zoom out">−</button>
            <button onClick={zoomReset} className="px-2 py-1 rounded text-xs border border-gray-300 hover:bg-gray-50 min-w-[3.25rem]" title="Reset zoom">
              {Math.round(zoom * 100)}%
            </button>
            <button onClick={zoomIn} className="px-2 py-1 rounded text-sm border border-gray-300 hover:bg-gray-50" title="Zoom in">+</button>
          </div>
        </div>

        {/* Canvas */}
        <div className="flex-1 overflow-auto bg-gray-200 p-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm mb-4 max-w-3xl mx-auto">
              <span className="font-semibold">Error:</span> {error}
            </div>
          )}

          {!selectedFile ? (
            <div className="text-center py-20 text-gray-400">
              <p className="text-5xl mb-3">📐</p>
              <p className="text-base font-medium text-gray-600">Upload a drawing to get started</p>
              <p className="text-sm mt-1">PDF or image file from the sidebar.</p>
            </div>
          ) : !signedUrl ? (
            <div className="text-center py-20 text-gray-400">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-700 mx-auto mb-3"></div>
              <p className="text-sm">Loading file…</p>
            </div>
          ) : isPdfFile(selectedFile) ? (
            <div className="flex justify-center">
              <Document
                file={signedUrl}
                onLoadSuccess={onPdfLoad}
                onLoadError={(err) => setError('PDF load failed: ' + err.message)}
                loading={(
                  <div className="text-center py-20 text-gray-400">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-700 mx-auto mb-3"></div>
                    <p className="text-sm">Rendering PDF…</p>
                  </div>
                )}
              >
                <Page
                  pageNumber={currentPage}
                  scale={zoom}
                  renderTextLayer={false}
                  renderAnnotationLayer={false}
                  className="shadow-lg bg-white"
                />
              </Document>
            </div>
          ) : isImageFile(selectedFile) ? (
            <div className="flex justify-center">
              <img
                src={signedUrl}
                alt={selectedFile.file_name}
                style={{ width: `${zoom * 100}%`, maxWidth: 'none' }}
                className="shadow-lg bg-white"
              />
            </div>
          ) : (
            <div className="text-center py-20 text-gray-500">
              <p className="text-sm">Preview not available for this file type.</p>
              <a href={signedUrl} target="_blank" rel="noreferrer" className="text-xs text-green-700 hover:underline mt-2 inline-block">
                Download original
              </a>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
