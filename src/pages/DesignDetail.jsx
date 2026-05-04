// src/pages/DesignDetail.jsx
//
// Per-project Design page. Phase 1 placeholder — Phases 2–5 will fill this
// with file upload, multi-page viewer, scale calibration, drawing tools, and
// the takeoff aggregation report.

import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function DesignDetail() {
  const { id } = useParams()
  const [project, setProject] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const { data } = await supabase
        .from('design_projects')
        .select('id, name, notes, status, created_at, updated_at, clients(name)')
        .eq('id', id)
        .single()
      if (!cancelled) {
        setProject(data || null)
        setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [id])

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-700"></div>
    </div>
  )

  if (!project) return (
    <div className="p-6 max-w-3xl mx-auto">
      <Link to="/design" className="text-sm text-green-700 hover:underline">← Back to Design</Link>
      <p className="mt-6 text-gray-500">Project not found.</p>
    </div>
  )

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <Link to="/design" className="text-sm text-green-700 hover:underline">← Back to Design</Link>

      <div className="flex items-center gap-3 mt-4 mb-2">
        <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
        <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
          {project.clients?.name || 'No client'}
        </span>
      </div>
      {project.notes && (
        <p className="text-sm text-gray-600 mb-4 whitespace-pre-wrap">{project.notes}</p>
      )}

      {/* Phase 1 placeholder — viewer/drawing/report come later */}
      <div className="mt-6 bg-white rounded-2xl border-2 border-dashed border-gray-300 p-12 text-center">
        <p className="text-5xl mb-4">📐</p>
        <h2 className="text-lg font-semibold text-gray-700 mb-2">Drawings & takeoffs coming soon</h2>
        <p className="text-sm text-gray-500 max-w-md mx-auto">
          This is where you'll upload PDF/CAD drawings, set the scale, and use the
          drawing tools to mark linear, area, and count takeoffs. The aggregated
          takeoff report will live here too.
        </p>
        <ul className="text-xs text-gray-400 mt-6 space-y-1 max-w-sm mx-auto text-left">
          <li>📥 Phase 2 — Upload + multi-page viewer + drag-resize</li>
          <li>📏 Phase 3 — Set scale (click-two-points + known distance)</li>
          <li>🖍️ Phase 4 — Linear / area / count drawing tools</li>
          <li>📊 Phase 5 — Aggregated takeoff report</li>
        </ul>
      </div>
    </div>
  )
}
