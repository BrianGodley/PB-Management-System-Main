// src/components/CONotifyDialog.jsx
//
// Release / Resend notification chooser shared by the manual CO modal
// (CODetailModal) and the estimator CO panel (COEstimatePanel).
//
// Props:
//   mode    — 'release' | 'resend'
//   saving  — boolean (disables Send while a request is in flight)
//   onCancel— () => void   (X / backdrop — leaves the CO unchanged)
//   onSend  — (method) => void   method = 'text' | 'email' | 'both'

import { useState } from 'react'

export default function CONotifyDialog({ mode, saving, onCancel, onSend }) {
  const [method, setMethod] = useState('both')
  const isRelease = mode === 'release'
  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-sm bg-white rounded-2xl shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200">
          <h3 className="text-base font-bold text-gray-900">
            {isRelease ? 'Release Change Order' : 'Resend Notification'}
          </h3>
          <button
            onClick={onCancel}
            className="w-8 h-8 rounded-full text-gray-400 hover:bg-gray-100 flex items-center justify-center text-lg"
          >
            ✕
          </button>
        </div>
        <div className="px-5 py-4 space-y-4">
          {isRelease && (
            <p className="text-sm text-gray-600">
              This will notify the client that a change order is pending. They can approve it in
              their client portal, or sign in the app.
            </p>
          )}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1.5">
              Notify by
            </p>
            <div className="grid grid-cols-3 gap-2">
              {[
                { k: 'text', label: '📱 Text' },
                { k: 'email', label: '✉️ Email' },
                { k: 'both', label: 'Both' },
              ].map(o => (
                <button
                  key={o.k}
                  onClick={() => setMethod(o.k)}
                  className={`py-2.5 rounded-xl border text-sm font-semibold transition-colors ${
                    method === o.k
                      ? 'border-blue-600 bg-blue-50 text-blue-800'
                      : 'border-gray-200 text-gray-600'
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="px-5 py-3 border-t border-gray-200">
          <button
            onClick={() => onSend(method)}
            disabled={saving}
            className="w-full py-3 rounded-xl bg-blue-700 text-white text-sm font-bold hover:bg-blue-800 disabled:opacity-50"
          >
            {saving ? 'Sending…' : isRelease ? 'Send & Release' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  )
}
