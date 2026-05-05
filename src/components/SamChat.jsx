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
  const [open,            setOpen]            = useState(false)
  const [conversationId,  setConversationId]  = useState(null)
  const [greeting,        setGreeting]        = useState(DEFAULT_GREETING)
  const [messages,        setMessages]        = useState([
    { role: 'assistant', content: DEFAULT_GREETING },
  ])
  const [input,           setInput]           = useState('')
  const [sending,         setSending]         = useState(false)
  const [error,           setError]           = useState('')
  const scrollRef = useRef(null)

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
      const fullName  = (data?.full_name || '').trim()
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
    return () => { cancelled = true }
  }, [user?.id])

  // Auto-scroll to the latest message whenever the list grows.
  useEffect(() => {
    if (!scrollRef.current) return
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages, sending])

  async function send() {
    const text = input.trim()
    if (!text || sending) return
    setError('')
    setInput('')
    setMessages(m => [...m, { role: 'user', content: text }])
    setSending(true)
    try {
      // Forward the user's JWT so the Edge Function can run tools as the user.
      const { data: { session } } = await supabase.auth.getSession()
      const jwt = session?.access_token
      if (!jwt) throw new Error('Not signed in.')

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/agent-chat`,
        {
          method: 'POST',
          headers: {
            'Content-Type':  'application/json',
            'Authorization': `Bearer ${jwt}`,
          },
          body: JSON.stringify({ conversation_id: conversationId, message: text }),
        }
      )
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
  }

  // Hide entirely when not signed in — Sam needs an auth context.
  if (!user) return null

  return (
    <>
      {/* Floating button (always visible) */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          title="Chat with Sam"
          className="fixed bottom-5 right-5 z-40 w-14 h-14 rounded-full shadow-lg flex items-center justify-center text-white text-lg font-bold transition-transform hover:scale-105"
          style={{ backgroundColor: FG }}
        >
          <span className="text-2xl leading-none">S</span>
        </button>
      )}

      {/* Slide-in panel */}
      {open && (
        <div className="fixed bottom-5 right-5 z-50 w-[380px] max-w-[95vw] h-[70vh] max-h-[640px] flex flex-col bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
          {/* Header */}
          <div className="flex items-center gap-2 px-4 py-3 flex-shrink-0" style={{ backgroundColor: FG }}>
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white font-bold">
              S
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-semibold leading-tight">Sam</p>
              <p className="text-green-200 text-[11px] leading-tight">Numbers analyst · AI</p>
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
                  className={`max-w-[85%] px-3 py-2 rounded-2xl text-sm whitespace-pre-wrap leading-snug ${
                    m.role === 'user'
                      ? 'bg-green-700 text-white rounded-br-md'
                      : m.error
                        ? 'bg-red-50 text-red-700 border border-red-200 rounded-bl-md'
                        : 'bg-white text-gray-800 border border-gray-200 rounded-bl-md'
                  }`}
                >
                  {m.content}
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
            <div className="flex items-end gap-2">
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
                placeholder="Ask Sam about your stats, sales, costs…"
                className="flex-1 resize-none border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-700/30 focus:border-green-700 max-h-32"
              />
              <button
                onClick={send}
                disabled={sending || !input.trim()}
                className="px-3 py-2 rounded-xl text-white text-sm font-semibold disabled:opacity-40"
                style={{ backgroundColor: FG }}
              >
                Send
              </button>
            </div>
            {error && (
              <p className="text-[11px] text-red-600 mt-1 px-1 truncate">{error}</p>
            )}
          </div>
        </div>
      )}
    </>
  )
}
