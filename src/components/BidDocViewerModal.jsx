// src/components/BidDocViewerModal.jsx
//
// Bid document viewer + editor.
//
// Behavior:
//   1. On open: fetch the latest bids row.
//      - If bids.bid_doc_html is set, that saved HTML is shown directly.
//      - Otherwise we generate a fresh .docx from the linked estimate,
//        convert it to HTML via mammoth, and show that.
//   2. The body is a contenteditable div - light text edits work inline
//      (typing, deleting, bolding via ctrl+B, etc.).
//   3. Save persists the current HTML to bids.bid_doc_html so the next
//      reopen jumps straight to the saved version.
//   4. Regenerate replaces the current content with a fresh template
//      pulled from the current estimate (after a confirm).
//   5. Download converts the current HTML to a .docx file via
//      html-docx-js so the downloaded file matches what the user sees.
//
// Usage:
//   <BidDocViewerModal bid={bid} onClose={() => setViewingBid(null)} />
//
// Required bid fields:
//   id, estimate_id, client_name, date_submitted, job_address (optional)

import { useEffect, useRef, useState } from 'react'
import * as mammoth from 'mammoth'
import { supabase } from '../lib/supabase'
import { generateBidDoc } from '../lib/generateBidDoc'
import { LOGO_B64 } from '../lib/logoBase64'

const FG = '#3A5038'

// HTML version of the letterhead used in the .docx (logo left, company info
// right). The .docx puts this in a Word Header that repeats on every page;
// mammoth strips Word headers during conversion, so for the modal/preview/
// download we render it once at the top of the body. Inline styles + base64
// logo so the saved HTML is self-contained and the downloaded .doc renders
// the same way without external assets.
const LETTERHEAD_HTML =
  '<table style="width:100%;border-collapse:collapse;margin:0 0 12px 0;border:none;" cellpadding="0" cellspacing="0" border="0">' +
    '<tr>' +
      '<td style="width:30%;vertical-align:middle;border:none;padding:0;">' +
        '<img src="data:image/png;base64,' + LOGO_B64 + '" alt="Picture Build" style="height:50px;width:auto;display:block;" />' +
      '</td>' +
      '<td style="width:70%;vertical-align:middle;text-align:right;border:none;padding:0;font-family:Calibri,Arial,sans-serif;font-size:9pt;color:#333;line-height:1.4;">' +
        '12410 Foothill Blvd Unit U &nbsp; Sylmar, CA 91342<br/>' +
        '(818) 751-2690 &nbsp;&nbsp; www.picturebuild.com<br/>' +
        "CA Contractor's License &nbsp; B, C-27,8,53: 990772" +
      '</td>' +
    '</tr>' +
  '</table>' +
  '<hr style="border:none;border-top:1px solid #d0d0d0;margin:0 0 16px 0;" />'


export default function BidDocViewerModal({ bid, onClose }) {
  const editorRef = useRef(null)

  const [html,             setHtml]             = useState('')
  const [loading,          setLoading]          = useState(true)
  const [error,            setError]            = useState('')
  const [dirty,            setDirty]            = useState(false)
  const [saving,           setSaving]           = useState(false)
  const [saveMsg,          setSaveMsg]          = useState('') // "ok:..." or "error:..."
  const [hasSavedVersion,  setHasSavedVersion]  = useState(false)
  const [regenerating,     setRegenerating]     = useState(false)

  // -- Initial load -------------------------------------------------------
  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        if (!bid?.id) throw new Error('Missing bid id.')

        const { data: latest, error: bidErr } = await supabase
          .from('bids')
          .select('bid_doc_html, bid_doc_updated_at, estimate_id, client_name, date_submitted, job_address')
          .eq('id', bid.id)
          .single()
        if (bidErr) throw bidErr
        if (cancelled) return

        if (latest.bid_doc_html && latest.bid_doc_html.trim() !== '') {
          setHtml(latest.bid_doc_html)
          setHasSavedVersion(true)
          setLoading(false)
          return
        }

        if (!latest.estimate_id) {
          throw new Error('This bid has no linked estimate, so its bid document cannot be generated. Edit and save manually if you want a starting draft.')
        }
        const fresh = await generateFromEstimate(latest)
        if (cancelled) return
        setHtml(fresh)
        setHasSavedVersion(false)
        setLoading(false)
      } catch (err) {
        if (!cancelled) {
          setError(err?.message || 'Failed to load bid document.')
          setLoading(false)
        }
      }
    }

    load()
    return () => { cancelled = true }
  }, [bid?.id])

  // -- Generate fresh HTML from the linked estimate ----------------------
  async function generateFromEstimate(bidLite) {
    const { data: est, error: estErr } = await supabase
      .from('estimates').select('*').eq('id', bidLite.estimate_id).single()
    if (estErr) throw estErr

    const { data: projs, error: projErr } = await supabase
      .from('estimate_projects')
      .select('*, estimate_modules(*)')
      .eq('estimate_id', bidLite.estimate_id)
      .order('created_at')
    if (projErr) throw projErr

    const blob = await generateBidDoc(est, projs || [], bidLite.job_address || '')
    const ab   = await blob.arrayBuffer()
    const res  = await mammoth.convertToHtml({ arrayBuffer: ab })
    const body = res.value || '<p class="text-gray-400">Document is empty.</p>'
    return LETTERHEAD_HTML + body
  }

  // -- Editing -----------------------------------------------------------
  function handleInput() {
    if (!dirty) setDirty(true)
    if (saveMsg) setSaveMsg('')
  }

  // -- Save --------------------------------------------------------------
  async function handleSave() {
    if (!editorRef.current) return
    setSaving(true)
    setSaveMsg('')

    const newHtml = editorRef.current.innerHTML
    const { error: upErr } = await supabase
      .from('bids')
      .update({
        bid_doc_html:       newHtml,
        bid_doc_updated_at: new Date().toISOString(),
      })
      .eq('id', bid.id)

    setSaving(false)
    if (upErr) {
      setSaveMsg('error:Save failed: ' + upErr.message)
      return
    }
    setHtml(newHtml)
    setHasSavedVersion(true)
    setDirty(false)
    setSaveMsg('ok:Saved')
  }

  // -- Regenerate from estimate ------------------------------------------
  async function handleRegenerate() {
    const ok = window.confirm(
      'Discard your edits and regenerate this bid document from the latest estimate?\n\n' +
      'Your saved version will be replaced when you click Save afterward.'
    )
    if (!ok) return

    setRegenerating(true)
    setError('')
    setSaveMsg('')
    try {
      const fresh = await generateFromEstimate(bid)
      setHtml(fresh)
      setHasSavedVersion(false)
      setDirty(true)
      setSaveMsg('ok:Regenerated from estimate. Click Save to replace your saved version.')
    } catch (err) {
      setError(err?.message || 'Regeneration failed.')
    } finally {
      setRegenerating(false)
    }
  }

  // -- Download as .doc (Word HTML) ---------------------------------------
  // We avoid the html-docx-js dependency (it ships a `with` statement that
  // Rollup can't bundle in strict-mode ES modules). Instead we wrap the
  // current HTML in the Microsoft Office HTML namespace and serve it with the
  // application/msword MIME type. Word opens this like a native .doc and
  // preserves tables, lists, basic formatting from the editor.
  function handleDownload() {
    if (!editorRef.current) return
    const currentHtml = editorRef.current.innerHTML
    const docHtml =
      '<!DOCTYPE html>' +
      '<html xmlns:o="urn:schemas-microsoft-com:office:office"' +
      '      xmlns:w="urn:schemas-microsoft-com:office:word"' +
      '      xmlns="http://www.w3.org/TR/REC-html40">' +
      '<head><meta charset="utf-8"><title>Bid Document</title>' +
      '<style>' +
      'body{font-family:Calibri,Arial,sans-serif;font-size:11pt;color:#333;}' +
      'table{border-collapse:collapse;width:100%;}' +
      'th,td{border:1px solid #ccc;padding:6px 8px;text-align:left;vertical-align:top;}' +
      'th{background:#f2f2f2;font-weight:600;}' +
      'h1,h2,h3{color:#1f2937;}' +
      '</style></head>' +
      '<body>' + currentHtml + '</body></html>'

    // BOM (\ufeff) helps Word detect the encoding
    const blob = new Blob(['\ufeff', docHtml], { type: 'application/msword' })
    const safeName = (bid.client_name || 'Bid').replace(/[^a-z0-9]/gi, '_')
    const dateStr  = bid.date_submitted || new Date().toISOString().split('T')[0]
    const filename = `${safeName}_Bid_${dateStr}.doc`

    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // -- Render ------------------------------------------------------------
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
              {hasSavedVersion && (
                <span className="ml-2 px-2 py-0.5 rounded-full bg-green-600/40 text-green-100 text-[10px]">
                  Edited version
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0 ml-4">
            <button
              onClick={handleRegenerate}
              disabled={regenerating || loading}
              title="Discard edits and regenerate from the current estimate"
              className="text-xs px-3 py-1.5 rounded-lg bg-white/10 text-white hover:bg-white/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-semibold"
            >
              {regenerating ? 'Regenerating…' : 'Regenerate'}
            </button>
            <button
              onClick={handleSave}
              disabled={!dirty || saving || loading}
              className="text-xs px-3 py-1.5 rounded-lg bg-white text-green-800 hover:bg-green-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-semibold"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button
              onClick={handleDownload}
              disabled={loading}
              className="text-xs px-3 py-1.5 rounded-lg bg-white text-green-800 hover:bg-green-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-semibold"
            >
              ⬇ Download
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

        {/* Save status banner */}
        {saveMsg && (
          <div
            className={`px-6 py-2 text-xs flex-shrink-0 ${
              saveMsg.startsWith('ok:')
                ? 'bg-green-50 text-green-800 border-b border-green-200'
                : 'bg-red-50 text-red-700 border-b border-red-200'
            }`}
          >
            {saveMsg.slice(saveMsg.indexOf(':') + 1)}
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto bg-gray-50 p-6">
          {loading && (
            <div className="text-center py-20 text-gray-500">
              <span className="animate-spin inline-block w-8 h-8 border-2 border-green-700/30 border-t-green-700 rounded-full mb-4"></span>
              <p className="text-sm">Loading…</p>
            </div>
          )}

          {error && !loading && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
              <span className="font-semibold">Could not load:</span> {error}
            </div>
          )}

          {!loading && !error && (
            <div
              ref={editorRef}
              contentEditable
              suppressContentEditableWarning
              onInput={handleInput}
              spellCheck
              className="bid-doc-preview bg-white rounded-xl shadow border border-gray-200 p-10 mx-auto max-w-3xl outline-none focus:ring-2 focus:ring-green-700/20 cursor-text"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          )}
        </div>

        {/* Footer hint */}
        {!loading && !error && (
          <div className="px-6 py-2 bg-gray-50 border-t border-gray-200 text-xs text-gray-500 flex-shrink-0">
            {dirty ? (
              <span>Unsaved changes — click <strong className="text-green-800">Save</strong> to persist them.</span>
            ) : hasSavedVersion ? (
              <span>Showing the saved edited version. Click anywhere to make further edits.</span>
            ) : (
              <span>Showing a fresh template generated from the estimate. Edit anywhere and Save to keep your changes.</span>
            )}
          </div>
        )}
      </div>

      {/* Scoped styles for the document body */}
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
        .bid-doc-preview[contenteditable="true"]:focus { outline: none; }
      `}</style>
    </div>
  )
}
