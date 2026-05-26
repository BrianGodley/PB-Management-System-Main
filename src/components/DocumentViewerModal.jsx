// src/components/DocumentViewerModal.jsx
//
// In-app document viewer — opens any help_doc inside PBS as a draggable
// and resizable floating modal instead of kicking the user out to a new
// browser tab.
//
// How each file type is rendered:
//   • PDF      → <iframe src=signedUrl>          (browsers render natively)
//   • Image    → <img src=signedUrl>             (jpg/png/webp)
//   • Office   → <iframe src=officeOnlineUrl>    (.docx/.xlsx/.pptx via
//                Microsoft's view.officeapps.live.com embed; requires the
//                signed URL to be publicly fetchable for the duration of
//                the iframe load — Supabase signed URLs satisfy that)
//   • Other    → friendly "can't preview — download" panel
//
// The modal is draggable by its header and resizable via the bottom-right
// corner handle. A "Download" button in the header is always available as
// a fallback in case the inline viewer struggles with a file.
import { useEffect, useRef, useState } from 'react'

const MIN_W = 480
const MIN_H = 360

function kindOf(mime) {
  if (!mime) return 'other'
  if (mime === 'application/pdf') return 'pdf'
  if (mime.startsWith('image/')) return 'image'
  if (mime.includes('officedocument') ||
      mime === 'application/msword' ||
      mime === 'application/vnd.ms-excel' ||
      mime === 'application/vnd.ms-powerpoint') return 'office'
  return 'other'
}

// Build the iframe `src` Microsoft's Office Online embed expects. The
// service fetches the file at `src` and renders it server-side, so the URL
// must be publicly accessible (Supabase signed URLs are, for the signature
// window).
function officeViewerUrl(signedUrl) {
  return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(signedUrl)}`
}

export default function DocumentViewerModal({ doc, signedUrl, onClose }) {
  // Default size + centred position. We clamp to the viewport so the modal
  // can't open offscreen on small windows.
  const defaultW = Math.min(900, Math.max(MIN_W, Math.floor(window.innerWidth  * 0.72)))
  const defaultH = Math.min(720, Math.max(MIN_H, Math.floor(window.innerHeight * 0.82)))
  const [pos, setPos]   = useState({
    x: Math.max(20, Math.floor((window.innerWidth  - defaultW) / 2)),
    y: Math.max(20, Math.floor((window.innerHeight - defaultH) / 2)),
  })
  const [size, setSize] = useState({ w: defaultW, h: defaultH })
  const dragRef = useRef(null) // { kind:'move'|'resize', startX, startY, startPos, startSize }

  const kind = kindOf(doc?.mime_type)

  // Esc closes the modal — a common expectation for floating windows.
  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose?.() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  function onPointerDown(e, kind) {
    if (e.button !== 0) return // left-click only
    dragRef.current = {
      kind,
      startX: e.clientX, startY: e.clientY,
      startPos: { ...pos }, startSize: { ...size },
    }
    window.addEventListener('mousemove', onPointerMove)
    window.addEventListener('mouseup',   onPointerUp)
    // Stop accidental text selection while dragging.
    e.preventDefault()
  }

  function onPointerMove(e) {
    const d = dragRef.current
    if (!d) return
    const dx = e.clientX - d.startX
    const dy = e.clientY - d.startY
    if (d.kind === 'move') {
      // Clamp so the header stays grabbable — at least 40px of header on
      // screen on every side.
      const newX = Math.max(-size.w + 80, Math.min(window.innerWidth  - 80, d.startPos.x + dx))
      const newY = Math.max(0,             Math.min(window.innerHeight - 40, d.startPos.y + dy))
      setPos({ x: newX, y: newY })
    } else {
      setSize({
        w: Math.max(MIN_W, d.startSize.w + dx),
        h: Math.max(MIN_H, d.startSize.h + dy),
      })
    }
  }

  function onPointerUp() {
    dragRef.current = null
    window.removeEventListener('mousemove', onPointerMove)
    window.removeEventListener('mouseup',   onPointerUp)
  }

  // ── Body content per file kind ─────────────────────────────────────
  let body = null
  if (!signedUrl) {
    body = <div className="flex items-center justify-center h-full text-gray-400 text-sm">Loading…</div>
  } else if (kind === 'pdf') {
    body = (
      <iframe
        src={signedUrl}
        title={doc.title}
        className="w-full h-full"
        style={{ border: 0 }}
      />
    )
  } else if (kind === 'image') {
    body = (
      <div className="w-full h-full overflow-auto bg-gray-100 flex items-center justify-center">
        <img
          src={signedUrl}
          alt={doc.title}
          className="max-w-full max-h-full object-contain"
        />
      </div>
    )
  } else if (kind === 'office') {
    body = (
      <iframe
        src={officeViewerUrl(signedUrl)}
        title={doc.title}
        className="w-full h-full"
        style={{ border: 0 }}
      />
    )
  } else {
    body = (
      <div className="flex flex-col items-center justify-center h-full text-center px-6 text-gray-500">
        <p className="text-4xl mb-3">📄</p>
        <p className="text-sm">
          This file type can't be previewed inside PBS.
        </p>
        <a
          href={signedUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 text-sm font-semibold text-green-700 hover:text-green-900 hover:underline"
        >
          Download to view ↗
        </a>
      </div>
    )
  }

  return (
    <div
      // Fixed wrapper so position is viewport-relative. No backdrop — the
      // modal is intentionally non-modal so users can keep clicking around
      // PBS while reading the doc.
      style={{
        position: 'fixed',
        top:    pos.y,
        left:   pos.x,
        width:  size.w,
        height: size.h,
        zIndex: 60,
      }}
      className="bg-white rounded-xl shadow-2xl border border-gray-300 flex flex-col overflow-hidden"
    >
      {/* Header — draggable. */}
      <div
        onMouseDown={e => onPointerDown(e, 'move')}
        className="flex items-center gap-3 px-4 py-2.5 bg-gray-50 border-b border-gray-200 cursor-move select-none flex-shrink-0"
      >
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-800 truncate">{doc.title}</p>
          {doc.description && (
            <p className="text-[11px] text-gray-500 truncate">{doc.description}</p>
          )}
        </div>
        {signedUrl && (
          <a
            href={signedUrl}
            target="_blank"
            rel="noopener noreferrer"
            onMouseDown={e => e.stopPropagation()} // don't drag when clicking this
            className="text-[11px] font-semibold text-gray-500 hover:text-green-700 hover:underline whitespace-nowrap"
            title="Open in a new tab / download"
          >
            Download ↗
          </a>
        )}
        <button
          onClick={onClose}
          onMouseDown={e => e.stopPropagation()}
          aria-label="Close"
          className="text-gray-400 hover:text-gray-700 text-xl leading-none px-1"
        >
          ×
        </button>
      </div>

      {/* Body. */}
      <div className="flex-1 min-h-0 bg-white">
        {body}
      </div>

      {/* Resize handle (bottom-right). */}
      <div
        onMouseDown={e => onPointerDown(e, 'resize')}
        className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize"
        style={{
          background: 'linear-gradient(135deg, transparent 50%, #aaa 50%, #aaa 60%, transparent 60%, transparent 70%, #aaa 70%, #aaa 80%, transparent 80%)',
        }}
        title="Drag to resize"
        aria-label="Resize"
      />
    </div>
  )
}
