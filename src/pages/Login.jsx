import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

const FG       = '#3A5038'
const FG_DARK  = '#2E4030'
const FG_LIGHT = '#EDF2EC'

export default function Login() {
  const { signIn } = useAuth()

  // ── Login form state ───────────────────────────────────────────────────────
  const [username,   setUsername]   = useState('')
  const [password,   setPassword]   = useState('')
  const [rememberMe, setRememberMe] = useState(true)
  const [showPw,     setShowPw]     = useState(false)
  const [loading,    setLoading]    = useState(false)
  const [error,      setError]      = useState('')

  // ── Forgot-password state ──────────────────────────────────────────────────
  const [mode,         setMode]         = useState('login')   // 'login' | 'forgot'
  const [resetUsername, setResetUsername] = useState('')
  const [resetLoading,  setResetLoading]  = useState(false)
  const [resetMsg,      setResetMsg]      = useState('')       // success/error

  // ── Login handler ──────────────────────────────────────────────────────────
  async function handleLogin(e) {
    e.preventDefault()
    setError('')
    if (!username.trim()) { setError('Please enter your username or email.'); return }
    if (!password)        { setError('Please enter your password.');           return }
    setLoading(true)

    try {
      let loginEmail = username.trim()

      // If the user typed an email address, use it directly.
      // Otherwise treat it as a username and look up the email.
      if (!loginEmail.includes('@')) {
        const { data: resolvedEmail, error: rpcErr } = await supabase.rpc(
          'get_email_by_username',
          { p_username: loginEmail.toLowerCase() }
        )
        if (rpcErr) throw new Error(rpcErr.message)
        if (!resolvedEmail) throw new Error('Username not found. Try signing in with your email address instead.')
        loginEmail = resolvedEmail
      }

      // Sign in with the resolved (or directly typed) email + password
      const { error: signInErr } = await signIn(loginEmail, password, { persistSession: rememberMe })
      if (signInErr) throw new Error('Incorrect password. Please try again.')

      // App.jsx redirects automatically on success
    } catch (err) {
      setError(err.message || 'Sign in failed. Please try again.')
      setLoading(false)
    }
  }

  // ── Forgot-password handler ────────────────────────────────────────────────
  async function handleForgotPassword(e) {
    e.preventDefault()
    setResetMsg('')
    if (!resetUsername.trim()) { setResetMsg('error:Please enter your username.'); return }
    setResetLoading(true)

    try {
      // Look up email by username
      const { data: email, error: rpcErr } = await supabase.rpc(
        'get_email_by_username',
        { p_username: resetUsername.trim().toLowerCase() }
      )
      if (rpcErr) throw new Error(rpcErr.message)
      if (!email) throw new Error('Username not found. Contact your admin if you need help.')

      // Send reset email
      const { error: resetErr } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + '/reset-password',
      })
      if (resetErr) throw new Error(resetErr.message)

      setResetMsg('ok:Password reset email sent! Check your inbox.')
    } catch (err) {
      setResetMsg('error:' + (err.message || 'Something went wrong.'))
    }
    setResetLoading(false)
  }

  // ── Shared styles ──────────────────────────────────────────────────────────
  const inputCls = `
    w-full border border-gray-300 rounded-xl px-4 py-3 text-sm text-gray-900
    placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-700
    focus:border-transparent transition-all bg-white
  `

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-12"
      style={{ background: `linear-gradient(135deg, ${FG_DARK} 0%, ${FG} 60%, #5a7a58 100%)` }}
    >
      {/* Card */}
      <div className="w-full max-w-sm">

        {/* Logo / branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl mb-4 shadow-lg overflow-hidden"
               style={{ backgroundColor: FG_DARK }}>
            <img
              src="/logo.png"
              alt="Logo"
              className="w-full h-full object-contain p-2"
              onError={e => {
                e.target.style.display = 'none'
                e.target.nextSibling.style.display = 'block'
              }}
            />
            <span style={{ display: 'none', fontSize: '2.5rem' }}>🌿</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Picture Build</h1>
          <p className="text-green-200 text-sm mt-1">Management System</p>
        </div>

        {/* Form card */}
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">

          {/* ── LOGIN MODE ─────────────────────────────────────────────── */}
          {mode === 'login' && (
            <form onSubmit={handleLogin} className="p-8 space-y-5">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Welcome back</h2>
                <p className="text-sm text-gray-500 mt-0.5">Sign in with your username and password</p>
              </div>

              {/* Username */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Username or Email</label>
                <input
                  type="text"
                  className={inputCls}
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="username or you@company.com"
                  autoComplete="username"
                  autoFocus
                  spellCheck={false}
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Password</label>
                <div className="relative">
                  <input
                    type={showPw ? 'text' : 'password'}
                    className={inputCls + ' pr-12'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(v => !v)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm"
                    tabIndex={-1}
                  >
                    {showPw ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>

              {/* Remember me + Forgot password */}
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={e => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded accent-green-700"
                  />
                  <span className="text-sm text-gray-600">Remember me</span>
                </label>
                <button
                  type="button"
                  onClick={() => { setMode('forgot'); setError(''); setResetMsg('') }}
                  className="text-sm font-medium hover:underline"
                  style={{ color: FG }}
                >
                  Forgot password?
                </button>
              </div>

              {/* Error */}
              {error && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2.5 rounded-xl">
                  <span className="mt-0.5">⚠️</span>
                  <span>{error}</span>
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl text-sm font-bold text-white transition-opacity disabled:opacity-60"
                style={{ backgroundColor: FG }}
              >
                {loading
                  ? <span className="flex items-center justify-center gap-2"><span className="animate-spin inline-block w-4 h-4 border-2 border-white/40 border-t-white rounded-full"></span> Signing in…</span>
                  : 'Sign In'
                }
              </button>

              <p className="text-center text-xs text-gray-400">
                Don't have an account? Contact your administrator.
              </p>
            </form>
          )}

          {/* ── FORGOT PASSWORD MODE ───────────────────────────────────── */}
          {mode === 'forgot' && (
            <form onSubmit={handleForgotPassword} className="p-8 space-y-5">
              <div>
                <button
                  type="button"
                  onClick={() => { setMode('login'); setResetMsg('') }}
                  className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 mb-4 -ml-1"
                >
                  ← Back to sign in
                </button>
                <h2 className="text-lg font-bold text-gray-900">Reset your password</h2>
                <p className="text-sm text-gray-500 mt-0.5">
                  Enter your username and we'll send a reset link to your email address.
                </p>
              </div>

              {/* Username */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Username</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm select-none">@</span>
                  <input
                    type="text"
                    className={inputCls + ' pl-8'}
                    value={resetUsername}
                    onChange={e => setResetUsername(e.target.value)}
                    placeholder="your.username"
                    autoFocus
                    spellCheck={false}
                  />
                </div>
              </div>

              {/* Message */}
              {resetMsg && (
                <div className={`flex items-start gap-2 text-sm px-3 py-2.5 rounded-xl border ${
                  resetMsg.startsWith('ok:')
                    ? 'bg-green-50 border-green-200 text-green-800'
                    : 'bg-red-50 border-red-200 text-red-700'
                }`}>
                  <span className="mt-0.5">{resetMsg.startsWith('ok:') ? '✅' : '⚠️'}</span>
                  <span>{resetMsg.slice(3)}</span>
                </div>
              )}

              {/* Submit */}
              {!resetMsg.startsWith('ok:') && (
                <button
                  type="submit"
                  disabled={resetLoading}
                  className="w-full py-3 rounded-xl text-sm font-bold text-white transition-opacity disabled:opacity-60"
                  style={{ backgroundColor: FG }}
                >
                  {resetLoading
                    ? <span className="flex items-center justify-center gap-2"><span className="animate-spin inline-block w-4 h-4 border-2 border-white/40 border-t-white rounded-full"></span> Sending…</span>
                    : 'Send Reset Link'
                  }
                </button>
              )}

              {resetMsg.startsWith('ok:') && (
                <button
                  type="button"
                  onClick={() => { setMode('login'); setResetMsg('') }}
                  className="w-full py-3 rounded-xl text-sm font-bold text-white"
                  style={{ backgroundColor: FG }}
                >
                  Back to Sign In
                </button>
              )}
            </form>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-green-300/60 text-xs mt-6">
          © {new Date().getFullYear()} Picture Build System
        </p>
      </div>
    </div>
  )
}
