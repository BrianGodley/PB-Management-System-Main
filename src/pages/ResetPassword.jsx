import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const FG      = '#3A5038'
const FG_DARK = '#2E4030'

function pwStrength(pw) {
  return (
    (pw.length >= 8 ? 1 : 0) +
    (/[A-Z]/.test(pw) ? 1 : 0) +
    (/[0-9]/.test(pw) ? 1 : 0) +
    (/[^A-Za-z0-9]/.test(pw) ? 1 : 0)
  )
}
const strengthColors = ['bg-red-400', 'bg-orange-400', 'bg-yellow-400', 'bg-green-500']

export default function ResetPassword() {
  const navigate = useNavigate()

  const [ready,           setReady]           = useState(false)   // recovery session active
  const [checking,        setChecking]        = useState(true)    // waiting on session check
  const [newPassword,     setNewPassword]     = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPw,          setShowPw]          = useState(false)
  const [saving,          setSaving]          = useState(false)
  const [msg,             setMsg]             = useState('')       // 'ok:…' | 'error:…'

  useEffect(() => {
    // Supabase automatically exchanges the tokens in the URL hash.
    // Listen for the PASSWORD_RECOVERY event which fires when the link is valid.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' && session) {
        setReady(true)
        setChecking(false)
      }
    })

    // Also check if there's already a recovery session (e.g. page refresh)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setReady(true)
      } else {
        // Give the onAuthStateChange a moment to fire before declaring invalid
        setTimeout(() => setChecking(false), 2000)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function handleSetPassword(e) {
    e.preventDefault()
    setMsg('')
    if (!newPassword)                    { setMsg('error:Please enter a new password.');             return }
    if (newPassword.length < 8)          { setMsg('error:Password must be at least 8 characters.'); return }
    if (newPassword !== confirmPassword) { setMsg('error:Passwords do not match.');                  return }

    setSaving(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) throw new Error(error.message)

      await supabase.auth.signOut()
      setMsg('ok:Password updated! Taking you back to sign in…')
      setTimeout(() => navigate('/login', { replace: true }), 2500)
    } catch (err) {
      setMsg('error:' + (err.message || 'Failed to update password. Please try again.'))
    }
    setSaving(false)
  }

  const inputCls = `
    w-full border border-gray-300 rounded-xl px-4 py-3 text-sm text-gray-900
    placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-700
    focus:border-transparent transition-all bg-white
  `

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-12"
      style={{ background: `linear-gradient(135deg, ${FG_DARK} 0%, ${FG} 60%, #5a7a58 100%)` }}
    >
      <div className="w-full max-w-sm">

        {/* Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl mb-4 shadow-lg overflow-hidden"
               style={{ backgroundColor: FG_DARK }}>
            <img src="/logo.png" alt="Logo" className="w-full h-full object-contain p-2"
              onError={e => { e.target.style.display='none'; e.target.nextSibling.style.display='block' }} />
            <span style={{ display:'none', fontSize:'2.5rem' }}>🌿</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Picture Build</h1>
          <p className="text-green-200 text-sm mt-1">Management System</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">

          {/* Checking session */}
          {checking && (
            <div className="p-8 text-center space-y-4">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-700 mx-auto"></div>
              <p className="text-sm text-gray-500">Verifying your reset link…</p>
            </div>
          )}

          {/* Invalid / expired link */}
          {!checking && !ready && (
            <div className="p-8 text-center space-y-5">
              <div className="text-5xl">⚠️</div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">Link expired or invalid</h2>
                <p className="text-sm text-gray-500 mt-1">
                  This password reset link has expired or already been used. Please request a new one.
                </p>
              </div>
              <button
                onClick={() => navigate('/login', { replace: true })}
                className="w-full py-3 rounded-xl text-sm font-bold text-white"
                style={{ backgroundColor: FG }}
              >
                Back to Sign In
              </button>
            </div>
          )}

          {/* Reset form */}
          {!checking && ready && (
            <form onSubmit={handleSetPassword} className="p-8 space-y-5">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Create a new password</h2>
                <p className="text-sm text-gray-500 mt-0.5">Choose a strong password for your account.</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">New Password</label>
                <div className="relative">
                  <input
                    type={showPw ? 'text' : 'password'}
                    className={inputCls + ' pr-12'}
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    autoComplete="new-password"
                    autoFocus
                  />
                  <button type="button" tabIndex={-1}
                    onClick={() => setShowPw(v => !v)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm">
                    {showPw ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>

              {/* Strength bar */}
              {newPassword && (
                <div className="flex gap-1 -mt-2">
                  {[1,2,3,4].map(n => {
                    const s = pwStrength(newPassword)
                    return (
                      <div key={n}
                        className={`h-1 flex-1 rounded-full transition-all ${n <= s ? strengthColors[s-1] : 'bg-gray-200'}`}
                      />
                    )
                  })}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Confirm New Password</label>
                <input
                  type={showPw ? 'text' : 'password'}
                  className={inputCls}
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  autoComplete="new-password"
                />
              </div>

              {msg && (
                <div className={`flex items-start gap-2 text-sm px-3 py-2.5 rounded-xl border ${
                  msg.startsWith('ok:')
                    ? 'bg-green-50 border-green-200 text-green-800'
                    : 'bg-red-50 border-red-200 text-red-700'
                }`}>
                  <span className="mt-0.5">{msg.startsWith('ok:') ? '✅' : '⚠️'}</span>
                  <span>{msg.slice(3)}</span>
                </div>
              )}

              {!msg.startsWith('ok:') && (
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full py-3 rounded-xl text-sm font-bold text-white transition-opacity disabled:opacity-60"
                  style={{ backgroundColor: FG }}
                >
                  {saving
                    ? <span className="flex items-center justify-center gap-2">
                        <span className="animate-spin inline-block w-4 h-4 border-2 border-white/40 border-t-white rounded-full" />
                        Saving…
                      </span>
                    : 'Set New Password'
                  }
                </button>
              )}
            </form>
          )}

        </div>

        <p className="text-center text-green-300/60 text-xs mt-6">
          © {new Date().getFullYear()} Picture Build System
        </p>
      </div>
    </div>
  )
}
