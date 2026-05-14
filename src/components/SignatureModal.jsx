// src/components/SignatureModal.jsx
//
// Touch + mouse signature pad. User draws their signature on the canvas,
// types their name, then clicks Approve to confirm.
//
// Returns the signature as a base64 PNG data URL plus the typed name via
// onComplete({ dataUrl, signedByName }).
//
// Pure-React implementation; no external libs needed.

import { useEffect, useRef, useState } from 'react'

export default function SignatureModal({ onClose, onComplete, defaultName = '' }) {
  const canvasRef = useRef(null)
  const drawing   = useRef(false)
  const lastPt    = useRef(null)
  const [name,    setName]    = useState(defaultName)
  const [hasInk,  setHasInk]  = useState(false)

  // ── Canvas sizing — make it crisp on hi-dpi (Retina) screens ───────────
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dpr = window.devicePixelRatio || 1
    const w = canvas.clientWidth, h = canvas.clientHeight
    canvas.width  = w * dpr
    canvas.height = h * dpr
    const ctx = canvas.getContext('2d')
    ctx.scale(dpr, dpr)
    ctx.lineWidth   = 2
    ctx.lineCap     = 'round'
    ctx.lineJoin    = 'round'
    ctx.strokeStyle = '#1f2937'
  }, [])

  function getPoint(e) {
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const t = e.touches ? e.touches[0] : e
    return { x: t.clientX - rect.left, y: t.clientY - rect.top }
  }

  function startDraw(e) {
    e.preventDefault()
    drawing.current = true
    lastPt.current  = getPoint(e)
  }
  function moveDraw(e) {
    if (!drawing.current) return
    e.preventDefault()
    const p = getPoint(e)
    const ctx = canvasRef.current.getContext('2d')
    ctx.beginPath()
    ctx.moveTo(lastPt.current.x, lastPt.current.y)
    ctx.lineTo(p.x, p.y)
    ctx.stroke()
    lastPt.current = p
    if (!hasInk) setHasInk(true)
  }
  function endDraw() { drawing.current = false; lastPt.current = null }

  function clearPad() {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    setHasInk(false)
  }

  function approve() {
    if (!hasInk) { alert('Please sign before approving.'); return }
    const dataUrl = canvasRef.current.toDataURL('image/png')
    onComplete({ dataUrl, signedByName: name.trim() })
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-5">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="text-base font-bold text-gray-900">Sign to approve</h3>
            <p className="text-xs text-gray-500 mt-0.5">Sign with your mouse, finger, or stylus.</p>
          </div>
          <button onClick={onClose} className="text-gray-300 hover:text-gray-500">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="mb-3">
          <label className="block text-xs font-semibold text-gray-600 mb-1">Print name</label>
          <input type="text" value={name} onChange={e => setName(e.target.value)}
            className="input text-sm w-full" placeholder="Type your full name" />
        </div>

        <div className="border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 mb-2"
             style={{ touchAction: 'none' }}>
          <canvas
            ref={canvasRef}
            className="w-full h-48 cursor-crosshair touch-none rounded-lg bg-white"
            onMouseDown={startDraw} onMouseMove={moveDraw} onMouseUp={endDraw} onMouseLeave={endDraw}
            onTouchStart={startDraw} onTouchMove={moveDraw} onTouchEnd={endDraw}
          />
        </div>

        <div className="flex items-center justify-between mb-4">
          <button onClick={clearPad} className="text-xs text-gray-500 hover:text-gray-800">Clear</button>
          <p className="text-[11px] text-gray-400 italic">By signing you confirm approval of this change order.</p>
        </div>

        <div className="flex gap-2">
          <button onClick={approve} disabled={!hasInk}
            className="flex-1 py-2.5 rounded-xl bg-green-700 text-white text-sm font-semibold hover:bg-green-800 disabled:opacity-40">
            ✓ Approve
          </button>
          <button onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm hover:bg-gray-50">
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
