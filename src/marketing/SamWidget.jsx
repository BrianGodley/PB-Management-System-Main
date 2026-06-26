// src/marketing/SamWidget.jsx
//
// Floating "Chat with Sam" widget for the public marketing pages. Calls the
// sandboxed sam-public edge function (no login, no data access). Safe to render
// on any logged-out page.

import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'

const FG = '#2E8BC9'
const GREETING = "Hi, I'm Sam 👋 Ask me anything about SoftCake — features, pricing, or how to get started."

export default function SamWidget() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([{ role: 'assistant', content: GREETING }])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const scrollRef = useRef(null)
  const hpRef = useRef(null)        // honeypot input (bots fill it, humans don't)
  const lastSentRef = useRef(0)     // client-side throttle

  useEffect(() => {
    if (open && scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages, open, busy])

  async function send(e) {
    e?.preventDefault()
    const text = input.trim()
    if (!text || busy) return
    // Client-side throttle: at most one send per 1.5s (mirrors server burst cap).
    const now = Date.now()
    if (now - lastSentRef.current < 1500) return
    lastSentRef.current = now
    setInput('')
    const next = [...messages, { role: 'user', content: text }]
    setMessages(next)
    setBusy(true)
    try {
      // Only send prior conversational turns (skip the canned greeting).
      const history = next.filter(m => m.content !== GREETING).slice(-6)
      const { data, error } = await supabase.functions.invoke('sam-public', {
        body: { message: text, history, hp: hpRef.current?.value || '' },
      })
      const reply = data?.reply || data?.error || error?.message || "Sorry, I couldn't reach Sam just now."
      setMessages(m => [...m, { role: 'assistant', content: reply }])
    } catch {
      setMessages(m => [...m, { role: 'assistant', content: 'Sam is offline for a moment — please try again shortly.' }])
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      {/* Launcher */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed z-50 bottom-5 right-5 flex items-center gap-2 text-white font-bold rounded-full pl-4 pr-5 py-3 shadow-2xl hover:opacity-90 transition-opacity"
          style={{ backgroundColor: FG }}
          aria-label="Chat with Sam"
        >
          <span className="text-lg">✨</span> Chat with Sam
        </button>
      )}

      {/* Panel */}
      {open && (
        <div className="fixed z-50 bottom-5 right-5 w-[calc(100vw-2.5rem)] sm:w-96 max-w-96 h-[32rem] max-h-[80vh] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 text-white" style={{ backgroundColor: FG }}>
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-lg">✨</div>
              <div>
                <p className="font-bold leading-tight">Sam</p>
                <p className="text-[11px] text-white/80 leading-tight">AI assistant · SoftCake</p>
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="text-white/90 hover:text-white text-2xl leading-none px-1" aria-label="Close">
              ×
            </button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-4 space-y-3 bg-gray-50">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`text-sm leading-relaxed px-3 py-2 rounded-2xl max-w-[85%] whitespace-pre-wrap ${
                  m.role === 'user'
                    ? 'ml-auto text-white rounded-br-sm'
                    : 'bg-white border border-gray-200 text-gray-700 rounded-bl-sm'
                }`}
                style={m.role === 'user' ? { backgroundColor: FG } : undefined}
              >
                {m.content}
              </div>
            ))}
            {busy && (
              <div className="bg-white border border-gray-200 text-gray-400 text-sm px-3 py-2 rounded-2xl rounded-bl-sm w-16">
                <span className="inline-flex gap-1">
                  <span className="animate-bounce">·</span>
                  <span className="animate-bounce [animation-delay:0.15s]">·</span>
                  <span className="animate-bounce [animation-delay:0.3s]">·</span>
                </span>
              </div>
            )}
          </div>

          {/* Input */}
          <form onSubmit={send} className="border-t border-gray-100 p-2.5 flex items-center gap-2">
            {/* Honeypot: visually hidden, off-screen, not tabbable. Real users
                never fill this; bots that auto-fill inputs trip it. */}
            <input
              ref={hpRef}
              type="text"
              name="company_website"
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              className="hidden"
            />
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Ask about SoftCake…"
              className="flex-1 text-sm border border-gray-300 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
              maxLength={1000}
            />
            <button
              type="submit"
              disabled={busy || !input.trim()}
              className="text-white font-bold rounded-xl px-4 py-2 text-sm disabled:opacity-40"
              style={{ backgroundColor: FG }}
            >
              Send
            </button>
          </form>
          <p className="text-[10px] text-gray-400 text-center pb-2 -mt-1 px-3">
            Sam can make mistakes. No account data is used here.
          </p>
        </div>
      )}
    </>
  )
}
