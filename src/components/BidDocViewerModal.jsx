// src/components/BidDocViewerModal.jsx
//
// Modal that previews a bid document inline instead of forcing a download.
// Bid docs are generated client-side as .docx blobs (see lib/generateBidDoc.js),
// which browsers can't render natively, so we run the blob through mammoth
// to convert it into HTML for preview. The original .docx blob is preserved
// and exposed via a Download button so the user can still grab the file
// after viewing it.
//
// Usage:
//   <BidDocViewerModal bid={bid} onClose={() => setViewingBid(null)} />
//
// Required bid fields:
//   id, estimate_id, client_name, date_submitted, job_address (optional)

import { useEffect, useState } from 'react'
import * as mammoth from 'mammoth'
import { supabase } from '../lib/supabase'
import { generateBidDoc, downloadBidDoc } from '../lib/generateBidDoc'

const FG = '#3A5038'

export default function BidDocViewerModal({ bid, onClose }) {
  const [html, setHtml]         = useState('')
  const [blob, setBlob]         = useState(null)
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState('')

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        if (!bid?.estimate_id) {
          throw new Error('This bid has no linked estimate, so its bid document cannot be generated.')
        }

        // Fetch estimate + projects (same shape generateBidDoc expects)
        const { data: est, error: estErr } = await supabase
          .from('estimates').select('*').eq('id', bid.estimate_id).single()
        if (estErr) throw estErr

        const { data: projs, error: projErr } = await supabase
          .from('estimate_projects')
          .select('*, estimate_modules(*)')
          .eq('estimate_id', bid.estimate_id)
          .order('created_at')
        if (projErr) throw projErr

        const generatedBlob = await generateBidDoc(est, projs || [], bid.job_address || '')

        // Convert .docx blob → HTML for preview
        const arrayBuffer = await generatedBlob.arrayBuffer()
        const result      = await mammoth.convertToHtml({ arrayBuffer })

        if (!cancelled) {
          setHtml(result.value || '<p class="text-gray-400">Document is empty.</p>')
          setBlob(generatedBlob)
          setLoading(false)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err?.message || 'Failed to generate bid document.')
          setLoading(false)
        }
      }
    }

    load()
    return () => { cancelled = true }
  }, [bid?.id, bid?.estimate_id])

  function handleDownload() {
    if (!blob) return
    const safeName = (bid.client_name || 'Bid').replace(/[^a-z0-9]/gi, '_')
    const dateStr  = bid.date_submitted || new Date().toISOString().split('T')[0]
    downloadBidDoc(blob, `${safeName}_Bid_${dateStr}.docx`)
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 border-b border-gray-200 flex-shrink-0"
          style={{ backgroundColor: FG }}
        >
          <div className="min-w-0">
            <h2 className="text-base font-bold text-white truncate">Bid Document</h2>
            <p className="text-xs text-green-200 mt-0.5 truncate">
              {bid.client_name || '—'}
              {bid.date_submitted ? ` · ${new Date(bid.date_submitted).toLocaleDateString()}` : ''}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0 ml-4">
            <button
              onClick={handleDownload}
              disabled={!blob}
              className="text-xs px-3 py-1.5 rounded-lg bg-white text-green-800 hover:bg-green-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-semibold"
            >
              ⬇ Download .docx
            </button>
            <button
              onClick={onClose}
              className="text-white/70 hover:text-white text-xl leading-none px-2"
              aria-label="Close"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto bg-gray-50 p-6">
          {loading && (
            <div className="text-center py-20 text-gray-500">
              <span className="animate-spin inline-block w-8 h-8 border-2 border-green-700/30 border-t-green-700 rounded-full mb-4"></span>
              <p className="text-sm">Generating preview…</p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
              <span className="font-semibold">Could not preview document:</span> {error}
            </div>
          )}

          {!loading && !error && (
            <div
              className="bid-doc-preview bg-white rounded-xl shadow border border-gray-200 p-10 mx-auto max-w-3xl"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          )}
        </div>
      </div>

      {/* Scoped styles for the converted document so it looks document-like */}
      <style>{`
        .bid-doc-preview h1, .bid-doc-preview h2, .bid-doc-preview h3 {
          color: #1f2937;
          font-weight: 700;
          margin-top: 1.25em;
          margin-bottom: 0.5em;
        }
        .bid-doc-preview h1 { font-size: 1.5rem; }
        .bid-doc-preview h2 { font-size: 1.25rem; }
        .bid-doc-preview h3 { font-size: 1.1rem; }
        .bid-doc-preview p {
          color: #374151;
          line-height: 1.6;
          margin: 0.5em 0;
        }
        .bid-doc-preview table {
          width: 100%;
          border-collapse: collapse;
          margin: 1em 0;
          font-size: 0.875rem;
        }
        .bid-doc-preview th, .bid-doc-preview td {
          border: 1px solid #e5e7eb;
          padding: 0.5em 0.75em;
          text-align: left;
          vertical-align: top;
        }
        .bid-doc-preview th {
          background: #f9fafb;
          font-weight: 600;
          color: #374151;
        }
        .bid-doc-preview ul, .bid-doc-preview ol {
          margin: 0.5em 0 0.5em 1.5em;
          color: #374151;
        }
        .bid-doc-preview img {
          max-width: 100%;
          height: auto;
        }
        .bid-doc-preview strong { color: #111827; }
      `}</style>
    </div>
  )
}
