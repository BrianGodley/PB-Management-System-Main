// ─────────────────────────────────────────────────────────────────────────────
// DocViewerModal — in-app document viewer
//
// Renders a file inline (no leaving the app) given a name + a URL:
//   • Images (png/jpg/gif/webp/svg) → native <img>
//   • PDFs                          → <iframe> of the URL
//   • Office (xls/xlsx/doc/docx/ppt)→ Microsoft Office web viewer iframe
//   • Anything else                 → download/open fallback
//
// `url` should be directly fetchable (e.g. a Supabase signed URL or public URL).
// There's always an "Open ↗" button as a fallback if inline preview fails.
//
// Usage:
//   const [doc, setDoc] = useState(null)  // { name, url }
//   {doc && <DocViewerModal name={doc.name} url={doc.url} onClose={() => setDoc(null)} />}
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect } from 'react'

const ext = (name = '') => (name.split('.').pop() || '').toLowerCase()
const isImage = name => ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg'].includes(ext(name))
const isPdf = name => ext(name) === 'pdf'
const isOffice = name =>
  ['xls', 'xlsx', 'csv', 'doc', 'docx', 'ppt', 'pptx'].includes(ext(name))

export default function DocViewerModal({ name = 'Document', url, onClose }) {
  useEffect(() => {
    const onKey = e => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  let body
  if (!url) {
    body = <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">Loading…</div>
  } else if (isImage(name)) {
    body = (
      <div className="flex-1 min-h-0 overflow-auto flex items-center justify-center p-4 bg-gray-100">
        <img src={url} alt={name} className="max-w-full max-h-full object-contain" />
      </div>
    )
  } else if (isPdf(name)) {
    body = <iframe title={name} src={url} className="flex-1 min-h-0 w-full border-0 bg-gray-100" />
  } else if (isOffice(name)) {
    body = (
      <iframe
        title={name}
        src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}`}
        className="flex-1 min-h-0 w-full border-0 bg-gray-100"
      />
    )
  } else {
    body = (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center p-6 bg-gray-100">
        <p className="text-4xl">📄</p>
        <p className="text-sm text-gray-500">This file type can't be previewed in-app.</p>
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="px-4 py-2 rounded-lg bg-green-700 text-white text-sm font-semibold"
        >
          Open / Download
        </a>
      </div>
    )
  }

  return (
    <div
      className="fixed inset-x-0 top-0 h-[100dvh] z-[70] flex flex-col bg-black/80"
      onMouseDown={e => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="flex-shrink-0 flex items-center justify-between gap-3 px-4 py-3 bg-gray-900 text-white">
        <span className="truncate text-sm font-semibold">{name}</span>
        <div className="flex items-center gap-2 flex-shrink-0">
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="text-xs px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 whitespace-nowrap"
          >
            Open ↗
          </a>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-white/80 hover:text-white text-2xl leading-none px-1"
          >
            ✕
          </button>
        </div>
      </div>
      {body}
    </div>
  )
}
