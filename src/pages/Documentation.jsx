// src/pages/Documentation.jsx
//
// User-facing Documentation page (route /documentation). Anyone signed in
// can browse here. Lists categories (help_doc_categories) and, under each,
// the help_docs uploaded by admins via Help Desk → Manage Support Docs.
//
// Files live in the private help-resources bucket. We mint 1-hour signed
// URLs on the fly so the browser can open them directly. Read RLS lets
// every authenticated user view; only admins can upload/edit/delete (that
// lives in Help.jsx).
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import DocumentViewerModal from '../components/DocumentViewerModal'

export default function Documentation() {
  const [categories, setCategories] = useState([])
  const [docs, setDocs]             = useState([])
  const [loading, setLoading]       = useState(true)
  const [openCats, setOpenCats]     = useState({}) // categoryId → bool
  // Currently-open document in the floating viewer. Single-doc-at-a-time
  // for simplicity; can be extended to a list of windows later.
  const [viewer, setViewer]         = useState(null) // { doc, signedUrl } | null

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      try {
        const [{ data: cats }, { data: rows }] = await Promise.all([
          supabase.from('help_doc_categories').select('*').order('sort_order').order('name'),
          supabase.from('help_docs').select('*').order('sort_order').order('created_at'),
        ])
        if (cancelled) return
        setCategories(cats || [])
        setDocs(rows || [])
        // Default everything open so users see content immediately.
        const initOpen = {}
        for (const c of cats || []) initOpen[c.id] = true
        initOpen['uncat'] = true
        setOpenCats(initOpen)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  async function openDoc(doc) {
    // Mint a fresh signed URL each time — short-lived, scoped to the file.
    // Then hand it to the floating in-app viewer instead of launching a
    // new browser tab. The viewer renders PDFs and images directly and
    // proxies Office docs through Microsoft's Office Online embed.
    const { data, error } = await supabase
      .storage
      .from('help-resources')
      .createSignedUrl(doc.storage_path, 3600)
    if (error || !data?.signedUrl) {
      alert('Could not open file: ' + (error?.message || 'no signed URL returned'))
      return
    }
    setViewer({ doc, signedUrl: data.signedUrl })
  }

  const docsByCat = {}
  for (const d of docs) {
    const k = d.category_id || 'uncat'
    if (!docsByCat[k]) docsByCat[k] = []
    docsByCat[k].push(d)
  }

  const buckets = [
    ...categories.map(c => ({ id: c.id, name: c.name, docs: docsByCat[c.id] || [] })),
    ...(docsByCat['uncat']?.length
      ? [{ id: 'uncat', name: 'Uncategorised', docs: docsByCat['uncat'] }]
      : []),
  ]

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <span>📘</span> Documentation
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          System documentation, training guides, and reference material — browse by category below.
        </p>
      </div>

      {loading && <p className="text-sm text-gray-400 text-center py-12">Loading…</p>}

      {!loading && buckets.length === 0 && (
        <div className="text-center py-16 bg-white border border-dashed border-gray-300 rounded-xl">
          <p className="text-5xl mb-3">📘</p>
          <p className="text-lg font-semibold text-gray-700">No documentation yet</p>
          <p className="text-sm text-gray-500 mt-1 max-w-md mx-auto">
            An admin can add categories and upload docs from the Help Desk.
          </p>
        </div>
      )}

      <div className="space-y-4">
        {buckets.map(b => (
          <div key={b.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <button
              onClick={() => setOpenCats(o => ({ ...o, [b.id]: !o[b.id] }))}
              className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 border-b border-gray-200"
            >
              <span className="font-semibold text-gray-800 flex items-center gap-2">
                {b.name}
                <span className="text-xs font-normal text-gray-400">({b.docs.length})</span>
              </span>
              <span className="text-gray-400 text-sm">{openCats[b.id] ? '▾' : '▸'}</span>
            </button>
            {openCats[b.id] && (
              b.docs.length === 0 ? (
                <p className="text-xs text-gray-400 italic px-4 py-3">No docs in this category.</p>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {b.docs.map(d => (
                    <li key={d.id} className="px-4 py-3 flex items-center gap-3 hover:bg-gray-50">
                      <span className="w-10 h-10 rounded bg-blue-50 text-blue-700 flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                        {(d.mime_type || '').includes('pdf')
                          ? 'PDF'
                          : (d.mime_type || '').startsWith('image/')
                            ? 'IMG'
                            : 'DOC'}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{d.title}</p>
                        {d.description && (
                          <p className="text-xs text-gray-500 truncate">{d.description}</p>
                        )}
                        <p className="text-[10px] text-gray-400">
                          {d.file_name} · {(d.size_bytes / 1024 / 1024).toFixed(1)} MB
                        </p>
                      </div>
                      <button
                        onClick={() => openDoc(d)}
                        className="text-xs font-semibold text-green-700 hover:text-green-900 hover:underline"
                      >
                        Open
                      </button>
                    </li>
                  ))}
                </ul>
              )
            )}
          </div>
        ))}
      </div>

      {/* In-app document viewer — draggable + resizable floating window.
          Non-modal: the user can keep clicking through Documentation
          while the doc is open. */}
      {viewer && (
        <DocumentViewerModal
          doc={viewer.doc}
          signedUrl={viewer.signedUrl}
          onClose={() => setViewer(null)}
        />
      )}
    </div>
  )
}
