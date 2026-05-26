// src/components/ReportIssueModal.jsx
//
// "Report Issue" modal opened from the Help dropdown in the top bar.
// Lets the user file a support ticket with a title, description, and
// optional photo/document attachments — same attachment flow used by Sam.
//
// On save:
//   1. Insert a feature_requests row (source='manual') and capture its id.
//   2. Upload any selected files to the sam-attachments bucket (we reuse
//      that bucket since policies + UI patterns already exist).
//   3. Insert feature_request_attachments rows linking the uploads to
//      the new ticket so admins see them in the Help Desk.
//
// File-type + size validation mirrors SamChat (25 MB cap, images / PDFs /
// Office docs allowed).
import { useRef, useState } from 'react'
import { supabase } from '../lib/supabase'

const ATTACH_MAX_BYTES = 25 * 1024 * 1024
const ATTACH_ALLOWED_MIME = new Set([
  'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic', 'image/heif',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
])
const ATTACH_ACCEPT =
  'image/jpeg,image/png,image/webp,image/heic,image/heif,' +
  'application/pdf,application/msword,' +
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document,' +
  'application/vnd.ms-excel,' +
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,' +
  '.jpg,.jpeg,.png,.webp,.heic,.heif,.pdf,.doc,.docx,.xls,.xlsx'

function kindFromMime(mime) {
  if (!mime) return 'other'
  if (mime.startsWith('image/')) return 'image'
  if (mime === 'application/pdf') return 'pdf'
  if (mime.includes('officedocument') || mime === 'application/msword' || mime === 'application/vnd.ms-excel') {
    return 'office'
  }
  return 'other'
}

function humanBytes(n) {
  if (!n && n !== 0) return ''
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`
  return `${(n / 1024 / 1024).toFixed(1)} MB`
}

const CATEGORIES = [
  { value: 'bug',         label: 'Bug — something is broken' },
  { value: 'feature',     label: 'Feature — new capability' },
  { value: 'enhancement', label: 'Enhancement — small tweak to existing' },
  { value: 'other',       label: 'Other / Feedback' },
]

export default function ReportIssueModal({ user, onClose, onCreated }) {
  const [title, setTitle]         = useState('')
  const [body, setBody]           = useState('')
  const [category, setCategory]   = useState('bug')
  const [pending, setPending]     = useState([])
  const [saving, setSaving]       = useState(false)
  const [error, setError]         = useState('')
  const fileInputRef = useRef(null)

  function handleFilesPicked(fileList) {
    if (!fileList || !fileList.length) return
    const rejects = []
    const accepts = []
    for (const f of fileList) {
      if (!ATTACH_ALLOWED_MIME.has(f.type)) {
        rejects.push(`${f.name} — type ${f.type || 'unknown'} not allowed`)
        continue
      }
      if (f.size > ATTACH_MAX_BYTES) {
        rejects.push(`${f.name} — ${humanBytes(f.size)} exceeds 25 MB cap`)
        continue
      }
      accepts.push({
        id: crypto.randomUUID(),
        file: f,
        previewUrl: f.type.startsWith('image/') ? URL.createObjectURL(f) : null,
        kind: kindFromMime(f.type),
      })
    }
    if (rejects.length) setError(rejects.join('\n'))
    if (accepts.length) setPending(p => [...p, ...accepts])
  }

  function removePending(id) {
    setPending(p => {
      const removed = p.find(x => x.id === id)
      if (removed?.previewUrl) URL.revokeObjectURL(removed.previewUrl)
      return p.filter(x => x.id !== id)
    })
  }

  async function save() {
    if (!title.trim() || !body.trim()) {
      setError('Title and description are both required.')
      return
    }
    setSaving(true)
    setError('')
    try {
      // 1. Insert the ticket.
      const { data: ticket, error: insertErr } = await supabase
        .from('feature_requests')
        .insert({
          user_id:  user.id,
          title:    title.trim().slice(0, 200),
          body:     body.trim().slice(0, 5000),
          category,
          source:   'manual',
          status:   'new',
          priority: 'medium',
        })
        .select('id')
        .single()
      if (insertErr) throw new Error(insertErr.message)

      // 2. Upload + link attachments (if any). Path layout mirrors
      //    SamChat's so the same RLS policies apply: {user_id}/{conv|inbox}/...
      //    For manual tickets there's no conversation, so we use the
      //    ticket id as the second-level folder for traceability.
      if (pending.length > 0) {
        const rows = []
        for (const att of pending) {
          const safeName = att.file.name.replace(/[^\w.\-]+/g, '_').slice(0, 120)
          const path = `${user.id}/ticket-${ticket.id}/${att.id}_${safeName}`
          const { error: upErr } = await supabase.storage
            .from('sam-attachments')
            .upload(path, att.file, { contentType: att.file.type, upsert: false })
          if (upErr) throw new Error(`Upload of ${att.file.name} failed: ${upErr.message}`)
          rows.push({
            feature_request_id:           ticket.id,
            source_message_attachment_id: null, // manual upload, not from chat
            user_id:                      user.id,
            storage_path:                 path,
            file_name:                    att.file.name,
            mime_type:                    att.file.type,
            size_bytes:                   att.file.size,
            kind:                         att.kind,
          })
        }
        const { error: attErr } = await supabase
          .from('feature_request_attachments')
          .insert(rows)
        if (attErr) throw new Error(`Attachment linking failed: ${attErr.message}`)
      }

      // Done — let parent close + refresh.
      onCreated?.(ticket.id)
    } catch (e) {
      setError(e?.message || 'Save failed.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-xl border border-gray-200 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <span>🎫</span> Report an Issue
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-4 max-h-[70vh] overflow-y-auto">
          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">
              Type
            </label>
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2"
            >
              {CATEGORIES.map(c => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">
              Title <span className="text-red-500 normal-case font-normal">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Short summary, e.g. 'Schedule view loads slow'"
              maxLength={200}
              className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">
              Description <span className="text-red-500 normal-case font-normal">*</span>
            </label>
            <textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              rows={6}
              placeholder="What's happening? Steps to reproduce, what you expected, what you saw."
              maxLength={5000}
              className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 resize-y"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
              Attachments (photos, PDFs, Word/Excel — up to 25 MB each)
            </label>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept={ATTACH_ACCEPT}
              style={{ display: 'none' }}
              onChange={e => {
                handleFilesPicked(e.target.files)
                e.target.value = ''
              }}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg"
              type="button"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
                />
              </svg>
              Attach files
            </button>
            {pending.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {pending.map(p => <PendingChip key={p.id} item={p} onRemove={() => removePending(p.id)} />)}
              </div>
            )}
          </div>

          {error && (
            <p className="text-xs text-red-600 whitespace-pre-line bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-gray-100 flex justify-end gap-2">
          <button
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={save}
            disabled={saving || !title.trim() || !body.trim()}
            className="px-5 py-2 text-sm rounded-lg bg-green-700 text-white font-semibold hover:bg-green-800 disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Submit Ticket'}
          </button>
        </div>
      </div>
    </div>
  )
}

function PendingChip({ item, onRemove }) {
  const isImage = item.kind === 'image' && item.previewUrl
  const sizeStr =
    item.file.size < 1024 * 1024
      ? `${(item.file.size / 1024).toFixed(0)} KB`
      : `${(item.file.size / 1024 / 1024).toFixed(1)} MB`
  return (
    <div className="flex items-center gap-2 max-w-[220px] bg-gray-100 border border-gray-200 rounded-lg px-2 py-1">
      {isImage ? (
        <img src={item.previewUrl} alt={item.file.name} className="w-8 h-8 rounded object-cover flex-shrink-0" />
      ) : (
        <span className="w-8 h-8 rounded bg-white border border-gray-200 flex items-center justify-center text-[10px] font-bold text-gray-500 flex-shrink-0">
          {item.kind === 'pdf' ? 'PDF' : item.kind === 'office' ? 'DOC' : '?'}
        </span>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-[11px] text-gray-700 truncate">{item.file.name}</p>
        <p className="text-[10px] text-gray-400">{sizeStr}</p>
      </div>
      <button
        onClick={onRemove}
        aria-label="Remove attachment"
        className="text-gray-400 hover:text-red-500 text-lg leading-none flex-shrink-0"
      >
        ×
      </button>
    </div>
  )
}
