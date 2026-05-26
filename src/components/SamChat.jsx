// src/components/SamChat.jsx
//
// Floating "Sam" chat panel. A small avatar pinned bottom-right opens a
// side panel with the current conversation. The panel calls the
// supabase/functions/agent-chat Edge Function to talk to the model and
// persists messages in agent_conversations + agent_messages.
//
// First-time greeting comes from supabase/functions/agent-chat/persona.ts
// (we mirror only the small pieces needed on the client).

import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

const FG = '#3A5038'

// ── Attachment limits — kept in sync with supabase-sam-attachments.sql ────
const ATTACH_MAX_BYTES = 25 * 1024 * 1024 // 25 MB
const ATTACH_ALLOWED_MIME = new Set([
  'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic', 'image/heif',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
])
// Accept attribute for the <input type=file> picker. Same set as ATTACH_ALLOWED_MIME
// plus a few extension hints for browsers/OS pickers that ignore mime types.
const ATTACH_ACCEPT =
  'image/jpeg,image/png,image/webp,image/heic,image/heif,' +
  'application/pdf,application/msword,' +
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document,' +
  'application/vnd.ms-excel,' +
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,' +
  '.jpg,.jpeg,.png,.webp,.heic,.heif,.pdf,.doc,.docx,.xls,.xlsx'

// Map a file's mime type to the small kind enum stored in the DB.
function kindFromMime(mime) {
  if (!mime) return 'other'
  if (mime.startsWith('image/')) return 'image'
  if (mime === 'application/pdf') return 'pdf'
  if (
    mime === 'application/msword' ||
    mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    mime === 'application/vnd.ms-excel' ||
    mime === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ) return 'office'
  return 'other'
}

function humanBytes(n) {
  if (!n && n !== 0) return ''
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`
  return `${(n / 1024 / 1024).toFixed(1)} MB`
}

// Fallback when we can't fetch the user's name yet (or they have no profile).
const DEFAULT_GREETING =
  "Hi! I'm Sam — your numbers analyst for Picture Build. Ask me about your " +
  "stats, sales, or job costs and I'll dig through the data. " +
  "I'm an AI assistant, so I can be wrong — feel free to push back."

// Build a personalised greeting from the user's first name + an optional
// tagline ("Go Rams!"). Falls back to a friendly default when fields are
// missing.
function buildGreeting({ firstName, tagline }) {
  if (!firstName) return DEFAULT_GREETING
  const tail = (tagline || '').trim()
  return tail
    ? `Hi ${firstName}, how can I help you? ${tail}`
    : `Hi ${firstName}, how can I help you?`
}

export default function SamChat() {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const [conversationId, setConversationId] = useState(null)
  const [greeting, setGreeting] = useState(DEFAULT_GREETING)
  const [messages, setMessages] = useState([{ role: 'assistant', content: DEFAULT_GREETING }])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  // Pending attachments — files the user has selected but not yet sent.
  // Each entry: { id, file, previewUrl, kind } where previewUrl is a local
  // object URL good for the panel's lifetime.
  const [pending, setPending] = useState([])
  const scrollRef = useRef(null)
  const fileInputRef = useRef(null)

  // Personalise the greeting once we know who the user is. Pulls full_name +
  // greeting_tagline from profiles. If the user has no profile row, we leave
  // the friendly default in place.
  useEffect(() => {
    if (!user?.id) return
    let cancelled = false
    ;(async () => {
      const { data } = await supabase
        .from('profiles')
        .select('full_name, greeting_tagline')
        .eq('id', user.id)
        .maybeSingle()
      if (cancelled) return
      const fullName = (data?.full_name || '').trim()
      const firstName = fullName ? fullName.split(/\s+/)[0] : ''
      const g = buildGreeting({ firstName, tagline: data?.greeting_tagline })
      setGreeting(g)
      // Only swap the opening message if the user hasn't started chatting yet.
      setMessages(m => {
        if (m.length === 1 && m[0].role === 'assistant') {
          return [{ role: 'assistant', content: g }]
        }
        return m
      })
    })()
    return () => {
      cancelled = true
    }
  }, [user?.id])

  // Auto-scroll to the latest message whenever the list grows.
  useEffect(() => {
    if (!scrollRef.current) return
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages, sending])

  // ── File picker handlers ─────────────────────────────────────────────────
  // User clicked the paperclip / dropped files in. Validate each file
  // against the type allowlist + size cap, then queue valid ones for
  // upload on the next send().
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

  // Upload every pending file to the sam-attachments bucket under the user's
  // folder, returning the attachment payload the edge function will persist
  // into agent_message_attachments. Path layout:
  //   {user_id}/{conversation_id || 'inbox'}/{uuid}_{safe_filename}
  async function uploadPending(userId, convId) {
    if (pending.length === 0) return []
    const out = []
    for (const att of pending) {
      const safeName = att.file.name.replace(/[^\w.\-]+/g, '_').slice(0, 120)
      const path = `${userId}/${convId || 'inbox'}/${att.id}_${safeName}`
      const { error: upErr } = await supabase.storage
        .from('sam-attachments')
        .upload(path, att.file, {
          contentType: att.file.type,
          upsert: false,
        })
      if (upErr) throw new Error(`Upload of ${att.file.name} failed: ${upErr.message}`)
      out.push({
        storage_path: path,
        file_name:    att.file.name,
        mime_type:    att.file.type,
        size_bytes:   att.file.size,
        kind:         att.kind,
      })
    }
    return out
  }

  async function send() {
    const text = input.trim()
    // Require either text OR at least one attachment.
    if ((!text && pending.length === 0) || sending) return
    setError('')
    setInput('')
    const pendingSnap = pending // capture for both upload + optimistic render
    setPending([])
    // Optimistic user-bubble render — show the message AND any pending
    // attachments immediately, using local Object URLs for images so the
    // user doesn't wait for a round-trip to see what they sent.
    const localAttachments = pendingSnap.map(p => ({
      file_name:  p.file.name,
      mime_type:  p.file.type,
      size_bytes: p.file.size,
      kind:       p.kind,
      previewUrl: p.previewUrl, // null for non-images
    }))
    setMessages(m => [...m, { role: 'user', content: text, attachments: localAttachments }])
    setSending(true)
    try {
      // Forward the user's JWT so the Edge Function can run tools as the user.
      const {
        data: { session },
      } = await supabase.auth.getSession()
      const jwt = session?.access_token
      if (!jwt) throw new Error('Not signed in.')

      // Upload files first (client → storage directly), then call the edge
      // function with the resulting storage paths so it can persist
      // agent_message_attachments rows and pass images/PDFs to Claude.
      const uploaded = await uploadPending(user.id, conversationId)

      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/agent-chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${jwt}`,
        },
        body: JSON.stringify({
          conversation_id: conversationId,
          message:         text || '(no message text — attachments only)',
          attachments:     uploaded,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`)
      if (data.conversation_id && !conversationId) setConversationId(data.conversation_id)
      setMessages(m => [...m, { role: 'assistant', content: data.reply || '(no reply)' }])
    } catch (e) {
      const msg = e?.message || 'Something went wrong.'
      setError(msg)
      setMessages(m => [...m, { role: 'assistant', content: `⚠️ ${msg}`, error: true }])
    } finally {
      setSending(false)
    }
  }

  function newThread() {
    setConversationId(null)
    setMessages([{ role: 'assistant', content: greeting }])
    setError('')
    // Drop any unsent attachments and revoke their preview URLs.
    pending.forEach(p => p.previewUrl && URL.revokeObjectURL(p.previewUrl))
    setPending([])
  }

  // Hide entirely when not signed in — Sam needs an auth context.
  if (!user) return null

  return (
    <>
      {/* Trigger — a single round 36px Sam icon in the Layout header next
          to the brand mark. White outer circle for contrast on the
          forest-green bar, with an amber chat bubble inside carrying the
          word "Sam." Reads instantly at a glance without competing with
          the brand mark. */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          title="Chat with Sam"
          aria-label="Chat with Sam"
          className="flex-shrink-0 rounded-full transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-white/50"
        >
          <svg
            width="36"
            height="36"
            viewBox="0 0 40 40"
            aria-hidden="true"
            style={{ display: 'block' }}
          >
            {/* White outer circle — high contrast on the forest-green header */}
            <circle cx="20" cy="20" r="19" fill="#FFFFFF" />
            {/* Amber chat bubble */}
            <rect x="6" y="9" width="28" height="18" rx="5" fill="#FAC775" />
            {/* Bubble tail — points down-left like a real speech bubble */}
            <path d="M11 26 L9 32 L17 27 Z" fill="#FAC775" />
            {/* "Sam" label, dark amber for legibility on the amber fill */}
            <text
              x="20"
              y="22"
              textAnchor="middle"
              fontFamily="Arial, sans-serif"
              fontWeight="700"
              fontSize="11"
              fill="#412402"
            >
              Sam
            </text>
          </svg>
        </button>
      )}

      {/* Slide-in panel */}
      {open && (
        <div className="fixed bottom-4 right-4 sm:bottom-5 sm:right-5 z-50 w-[475px] max-w-[95vw] h-[87vh] max-h-[800px] flex flex-col bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
          {/* Header */}
          <div
            className="flex items-center gap-2 px-4 py-3 flex-shrink-0"
            style={{ backgroundColor: FG }}
          >
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white font-bold">
              S
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-semibold leading-tight">Sam</p>
              <p className="text-green-200 text-[11px] leading-tight">
                Your friendly, neighborhood AI assistant.
              </p>
            </div>
            <button
              onClick={newThread}
              title="Start a new conversation"
              className="text-white/80 hover:text-white text-xs px-2 py-1 rounded-md hover:bg-white/10"
            >
              New
            </button>
            <button
              onClick={() => setOpen(false)}
              title="Close"
              className="text-white/80 hover:text-white text-xl leading-none px-2"
            >
              ✕
            </button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3 bg-gray-50">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] flex flex-col gap-2 ${
                    m.role === 'user' ? 'items-end' : 'items-start'
                  }`}
                >
                  {/* Attachment thumbs / pills above the text bubble */}
                  {Array.isArray(m.attachments) && m.attachments.length > 0 && (
                    <div className="flex flex-wrap gap-2 max-w-full">
                      {m.attachments.map((a, ai) => <AttachmentTile key={ai} att={a} />)}
                    </div>
                  )}
                  {/* Text bubble — hidden when only attachments and no real text */}
                  {m.content && m.content !== '(no message text — attachments only)' && (
                    <div
                      className={`px-3 py-2 rounded-2xl text-sm whitespace-pre-wrap leading-snug ${
                        m.role === 'user'
                          ? 'bg-green-700 text-white rounded-br-md'
                          : m.error
                            ? 'bg-red-50 text-red-700 border border-red-200 rounded-bl-md'
                            : 'bg-white text-gray-800 border border-gray-200 rounded-bl-md'
                      }`}
                    >
                      {m.content}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {sending && (
              <div className="flex justify-start">
                <div className="px-3 py-2 rounded-2xl rounded-bl-md bg-white text-gray-400 border border-gray-200 text-sm italic">
                  Sam is thinking…
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="flex-shrink-0 border-t border-gray-200 p-2 bg-white">
            {/* Pending attachment chips — shown above the textarea so the
                user sees what's queued before they hit Send. */}
            {pending.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2 px-1">
                {pending.map(p => (
                  <PendingChip key={p.id} item={p} onRemove={() => removePending(p.id)} />
                ))}
              </div>
            )}

            <div className="flex items-end gap-2">
              {/* Hidden file picker the paperclip triggers. Multi-file. */}
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept={ATTACH_ACCEPT}
                style={{ display: 'none' }}
                onChange={e => {
                  handleFilesPicked(e.target.files)
                  e.target.value = '' // reset so re-picking same file fires onChange
                }}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={sending}
                title="Attach photos or documents (up to 25 MB each)"
                aria-label="Attach files"
                className="p-2 rounded-xl text-gray-500 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
                  />
                </svg>
              </button>
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    send()
                  }
                }}
                rows={1}
                placeholder="Ask Sam, or attach a photo/document…"
                className="flex-1 resize-none border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-700/30 focus:border-green-700 max-h-40"
              />
              <button
                onClick={send}
                disabled={sending || (!input.trim() && pending.length === 0)}
                className="px-3 py-2 rounded-xl text-white text-sm font-semibold disabled:opacity-40"
                style={{ backgroundColor: FG }}
              >
                {sending ? '…' : 'Send'}
              </button>
            </div>
            {error && <p className="text-[11px] text-red-600 mt-1 px-1 whitespace-pre-line">{error}</p>}
          </div>
        </div>
      )}
    </>
  )
}

// ── Pending attachment chip (in the input area before send) ──────────────
function PendingChip({ item, onRemove }) {
  const isImage = item.kind === 'image' && item.previewUrl
  return (
    <div className="relative flex items-center gap-2 max-w-[200px] bg-gray-100 border border-gray-200 rounded-lg px-2 py-1">
      {isImage ? (
        <img
          src={item.previewUrl}
          alt={item.file.name}
          className="w-8 h-8 rounded object-cover flex-shrink-0"
        />
      ) : (
        <span className="w-8 h-8 rounded bg-white border border-gray-200 flex items-center justify-center text-[10px] font-bold text-gray-500 flex-shrink-0">
          {item.kind === 'pdf' ? 'PDF' : item.kind === 'office' ? 'DOC' : '?'}
        </span>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-[11px] text-gray-700 truncate">{item.file.name}</p>
        <p className="text-[10px] text-gray-400">{humanBytes(item.file.size)}</p>
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

// ── Sent attachment tile (rendered inside a message bubble) ──────────────
function AttachmentTile({ att }) {
  const isImage = att.kind === 'image' && att.previewUrl
  if (isImage) {
    return (
      <a
        href={att.previewUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="block"
      >
        <img
          src={att.previewUrl}
          alt={att.file_name}
          className="max-w-[220px] max-h-[160px] rounded-lg border border-gray-200 object-cover"
        />
      </a>
    )
  }
  return (
    <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-2.5 py-1.5">
      <span className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center text-[10px] font-bold text-gray-500 flex-shrink-0">
        {att.kind === 'pdf' ? 'PDF' : att.kind === 'office' ? 'DOC' : 'FILE'}
      </span>
      <div className="min-w-0 max-w-[180px]">
        <p className="text-[12px] text-gray-800 truncate">{att.file_name}</p>
        <p className="text-[10px] text-gray-400">{humanBytes(att.size_bytes)}</p>
      </div>
    </div>
  )
}
