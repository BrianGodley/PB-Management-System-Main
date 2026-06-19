import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { sendSMS, sendEmail } from '../lib/notify'
import { PLATFORM_BRAND } from '../lib/brand'

const FG = '#3A5038'
const FG_DARK = '#2E4030'

// Mask phone: show only last 4 digits
function maskPhone(phone) {
  if (!phone) return '***-****'
  const digits = phone.replace(/\D/g, '')
  if (digits.length < 4) return '***-****'
  return `***-***-${digits.slice(-4)}`
}

// Mask email: show first char + *** + @domain
function maskEmail(email) {
  if (!email || !email.includes('@')) return email
  const [local, domain] = email.split('@')
  const visible = local.slice(0, 1)
  return `${visible}***@${domain}`
}

// Normalise to E.164 (US assumed if no country code)
function toE164(raw) {
  const digits = raw.replace(/\D/g, '')
  if (digits.startsWith('1') && digits.length === 11) return `+${digits}`
  if (digits.length === 10) return `+1${digits}`
  return `+${digits}`
}

export default function Login() {
  const { signIn } = useAuth()

  // ── Login form state ───────────────────────────────────────────────────────
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(true)
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // ── Password-reset multi-step state ───────────────────────────────────────
  // mode: 'login' | 'forgot' | 'choose' | 'verify' | 'newpass'
  const [mode, setMode] = useState('login')
  const [resetUsername, setResetUsername] = useState('')
  const [resetEmail, setResetEmail] = useState('') // resolved email (E.164 or plain)
  const [resetPhone, setResetPhone] = useState('') // E.164 phone (empty if none on file)
  const [resetPhoneMasked, setResetPhoneMasked] = useState('')
  const [resetEmailMasked, setResetEmailMasked] = useState('')
  const [verifyMethod, setVerifyMethod] = useState('') // 'sms' | 'email'
  const [pendingOtp, setPendingOtp] = useState('') // generated code
  const [otpCode, setOtpCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showNewPw, setShowNewPw] = useState(false)
  const [resetLoading, setResetLoading] = useState(false)
  const [resetMsg, setResetMsg] = useState('') // 'ok:…' | 'error:…'

  function resetFlow() {
    setMode('login')
    setResetUsername('')
    setResetEmail('')
    setResetPhone('')
    setResetPhoneMasked('')
    setResetEmailMasked('')
    setVerifyMethod('')
    setPendingOtp('')
    setOtpCode('')
    setNewPassword('')
    setConfirmPassword('')
    setResetMsg('')
    setError('')
  }

  // ── Login handler ──────────────────────────────────────────────────────────
  async function handleLogin(e) {
    e.preventDefault()
    setError('')
    if (!username.trim()) {
      setError('Please enter your username or email.')
      return
    }
    if (!password) {
      setError('Please enter your password.')
      return
    }
    setLoading(true)

    try {
      let loginEmail = username.trim()
      if (!loginEmail.includes('@')) {
        const { data: resolvedEmail, error: rpcErr } = await supabase.rpc('get_email_by_username', {
          p_username: loginEmail.toLowerCase(),
        })
        if (rpcErr) throw new Error(rpcErr.message)
        if (!resolvedEmail)
          throw new Error('Username not found. Try signing in with your email address instead.')
        loginEmail = resolvedEmail
      }
      const { error: signInErr } = await signIn(loginEmail, password, {
        persistSession: rememberMe,
      })
      if (signInErr) throw new Error('Incorrect password. Please try again.')
    } catch (err) {
      setError(err.message || 'Sign in failed. Please try again.')
      setLoading(false)
    }
  }

  // ── Step 1: look up account info, move to choice screen ───────────────────
  async function handleLookup(e) {
    e.preventDefault()
    setResetMsg('')
    const entered = resetUsername.trim()
    if (!entered) {
      setResetMsg('error:Please enter your username or email.')
      return
    }
    setResetLoading(true)

    try {
      // Resolve to email
      let email = entered
      if (!email.includes('@')) {
        const { data: resolvedEmail, error: rpcErr } = await supabase.rpc('get_email_by_username', {
          p_username: email.toLowerCase(),
        })
        if (rpcErr) throw new Error(rpcErr.message)
        if (!resolvedEmail)
          throw new Error('Username not found. Try entering your email address instead.')
        email = resolvedEmail
      }

      // Look up cell phone via SECURITY DEFINER RPC (bypasses RLS on login screen)
      const { data: phoneRaw } = await supabase.rpc('get_phone_by_email', { p_email: email })

      setResetEmail(email)
      setResetEmailMasked(maskEmail(email))
      if (phoneRaw) {
        setResetPhone(toE164(phoneRaw))
        setResetPhoneMasked(maskPhone(phoneRaw))
      }

      setMode('choose')
    } catch (err) {
      setResetMsg('error:' + (err.message || 'Something went wrong.'))
    }
    setResetLoading(false)
  }

  // ── Step 2: generate OTP and send via existing SMS/email provider ─────────
  async function handleSendCode(method) {
    setResetMsg('')
    setResetLoading(true)
    setVerifyMethod(method)

    // Generate a fresh 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString()
    setPendingOtp(code)
    setOtpCode('')

    try {
      if (method === 'sms') {
        const { error } = await sendSMS({
          to: resetPhone,
          message: `Your ${PLATFORM_BRAND.name} verification code is: ${code}. It expires in 10 minutes.`,
        })
        if (error) throw new Error(error.message)
      } else {
        const { error } = await sendEmail({
          to: resetEmail,
          subject: `${PLATFORM_BRAND.name} — Password Reset Code`,
          html: `
            <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#f9fafb;border-radius:16px;">
              <div style="text-align:center;margin-bottom:24px;">
                <span style="font-size:2.5rem;">🌿</span>
                <h2 style="margin:8px 0 0;color:#1f2937;font-size:20px;">${PLATFORM_BRAND.name}</h2>
              </div>
              <div style="background:#fff;border-radius:12px;padding:28px;border:1px solid #e5e7eb;">
                <h3 style="margin:0 0 8px;color:#111827;font-size:17px;">Password Reset Code</h3>
                <p style="margin:0 0 20px;color:#6b7280;font-size:14px;">
                  Use the code below to reset your password. It expires in 10 minutes.
                </p>
                <div style="background:#f0fdf4;border:2px solid #bbf7d0;border-radius:10px;padding:18px;text-align:center;margin-bottom:20px;">
                  <span style="font-size:36px;font-weight:700;letter-spacing:0.25em;color:#14532d;font-family:monospace;">${code}</span>
                </div>
                <p style="margin:0;color:#9ca3af;font-size:12px;">
                  If you didn't request this, you can safely ignore this email.
                </p>
              </div>
            </div>`,
          text: `Your ${PLATFORM_BRAND.name} verification code is: ${code}. It expires in 10 minutes.`,
        })
        if (error) throw new Error(error.message)
      }
      setMode('verify')
    } catch (err) {
      setResetMsg('error:' + (err.message || 'Failed to send code. Please try again.'))
      setPendingOtp('')
    }
    setResetLoading(false)
  }

  // ── Step 3: verify OTP against stored code ─────────────────────────────────
  async function handleVerifyOtp(e) {
    e.preventDefault()
    setResetMsg('')
    const code = otpCode.trim()
    if (!code || code.length < 6) {
      setResetMsg('error:Please enter the 6-digit code.')
      return
    }
    if (code !== pendingOtp) {
      setResetMsg('error:Incorrect code. Please try again.')
      return
    }
    setMode('newpass')
    setResetMsg('')
  }

  // ── Step 4: set new password via edge function ─────────────────────────────
  async function handleSetPassword(e) {
    e.preventDefault()
    setResetMsg('')
    if (!newPassword) {
      setResetMsg('error:Please enter a new password.')
      return
    }
    if (newPassword.length < 8) {
      setResetMsg('error:Password must be at least 8 characters.')
      return
    }
    if (newPassword !== confirmPassword) {
      setResetMsg('error:Passwords do not match.')
      return
    }
    setResetLoading(true)

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      const supabaseAnon = import.meta.env.VITE_SUPABASE_ANON_KEY
      const res = await fetch(`${supabaseUrl}/functions/v1/reset-user-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${supabaseAnon}`,
          apikey: supabaseAnon,
        },
        body: JSON.stringify({ email: resetEmail, newPassword }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)

      setResetMsg('ok:Password updated! Returning to sign in…')
      setTimeout(() => resetFlow(), 2500)
    } catch (err) {
      setResetMsg('error:' + (err.message || 'Failed to update password.'))
    }
    setResetLoading(false)
  }

  // ── Shared UI helpers ──────────────────────────────────────────────────────
  const inputCls = `
    w-full border border-gray-300 rounded-xl px-4 py-3 text-sm text-gray-900
    placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-700
    focus:border-transparent transition-all bg-white
  `

  const Spinner = () => (
    <span className="animate-spin inline-block w-4 h-4 border-2 border-white/40 border-t-white rounded-full" />
  )

  const MsgBox = ({ msg }) =>
    !msg ? null : (
      <div
        className={`flex items-start gap-2 text-sm px-3 py-2.5 rounded-xl border ${
          msg.startsWith('ok:')
            ? 'bg-green-50 border-green-200 text-green-800'
            : 'bg-red-50 border-red-200 text-red-700'
        }`}
      >
        <span className="mt-0.5">{msg.startsWith('ok:') ? '✅' : '⚠️'}</span>
        <span>{msg.slice(3)}</span>
      </div>
    )

  const BackBtn = ({ label = '← Back to sign in', onClick }) => (
    <button
      type="button"
      onClick={onClick || resetFlow}
      className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 mb-4 -ml-1"
    >
      {label}
    </button>
  )

  const SubmitBtn = ({ ld, idleLabel, loadingLabel }) => (
    <button
      type="submit"
      disabled={ld}
      className="w-full py-3 rounded-xl text-sm font-bold text-white transition-opacity disabled:opacity-60"
      style={{ backgroundColor: FG }}
    >
      {ld ? (
        <span className="flex items-center justify-center gap-2">
          <Spinner /> {loadingLabel}
        </span>
      ) : (
        idleLabel
      )}
    </button>
  )

  // ── Password strength bar ──────────────────────────────────────────────────
  function pwStrength(pw) {
    return (
      (pw.length >= 8 ? 1 : 0) +
      (/[A-Z]/.test(pw) ? 1 : 0) +
      (/[0-9]/.test(pw) ? 1 : 0) +
      (/[^A-Za-z0-9]/.test(pw) ? 1 : 0)
    )
  }
  const strengthColors = ['bg-red-400', 'bg-orange-400', 'bg-yellow-400', 'bg-green-500']

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-12"
      style={{ background: `linear-gradient(135deg, ${FG_DARK} 0%, ${FG} 60%, #5a7a58 100%)` }}
    >
      <div className="w-full max-w-sm">
        {/* Branding */}
        <div className="text-center mb-8">
          <div
            className="inline-flex items-center justify-center w-20 h-20 rounded-2xl mb-4 shadow-lg overflow-hidden"
            style={{ backgroundColor: FG_DARK }}
          >
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
          <h1 className="text-2xl font-bold text-white tracking-tight">{PLATFORM_BRAND.name}</h1>
          <p className="text-green-200 text-sm mt-1">{PLATFORM_BRAND.tagline}</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* ── LOGIN ──────────────────────────────────────────────────── */}
          {mode === 'login' && (
            <form onSubmit={handleLogin} className="p-8 space-y-5">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Welcome back</h2>
                <p className="text-sm text-gray-500 mt-0.5">
                  Sign in with your username and password
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                  Username or Email
                </label>
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
                    tabIndex={-1}
                    onClick={() => setShowPw(v => !v)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm"
                  >
                    {showPw ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>

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
                  onClick={() => {
                    setMode('forgot')
                    setError('')
                    setResetMsg('')
                  }}
                  className="text-sm font-medium hover:underline"
                  style={{ color: FG }}
                >
                  Forgot password?
                </button>
              </div>

              {error && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2.5 rounded-xl">
                  <span className="mt-0.5">⚠️</span>
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl text-sm font-bold text-white transition-opacity disabled:opacity-60"
                style={{ backgroundColor: FG }}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Spinner /> Signing in…
                  </span>
                ) : (
                  'Sign In'
                )}
              </button>

              <p className="text-center text-xs text-gray-400">
                Don't have an account?{' '}
                <a href="/signup" className="font-medium hover:underline" style={{ color: FG }}>
                  Start a free trial
                </a>
              </p>
            </form>
          )}

          {/* ── STEP 1: FORGOT — enter identity ────────────────────────── */}
          {mode === 'forgot' && (
            <form onSubmit={handleLookup} className="p-8 space-y-5">
              <div>
                <BackBtn />
                <h2 className="text-lg font-bold text-gray-900">Forgot your password?</h2>
                <p className="text-sm text-gray-500 mt-0.5">
                  Enter your username or email and we'll verify it's you before letting you create a
                  new one.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                  Username or Email
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm select-none">
                    @
                  </span>
                  <input
                    type="text"
                    className={inputCls + ' pl-8'}
                    value={resetUsername}
                    onChange={e => setResetUsername(e.target.value)}
                    placeholder="username or you@company.com"
                    autoComplete="username"
                    autoFocus
                    spellCheck={false}
                  />
                </div>
              </div>

              <MsgBox msg={resetMsg} />

              <SubmitBtn
                ld={resetLoading}
                idleLabel="Continue"
                loadingLabel="Looking up account…"
              />
            </form>
          )}

          {/* ── STEP 2: CHOOSE verification method ─────────────────────── */}
          {mode === 'choose' && (
            <div className="p-8 space-y-5">
              <div>
                <BackBtn
                  label="← Change account"
                  onClick={() => {
                    setMode('forgot')
                    setResetMsg('')
                  }}
                />
                <h2 className="text-lg font-bold text-gray-900">Verification required</h2>
                <p className="text-sm text-gray-500 mt-1">
                  Identity verification is required before you can reset your password. Please
                  choose which method you would like to use.
                </p>
              </div>

              <div className="space-y-3">
                {/* SMS option — only shown if a phone is on file */}
                {resetPhone && (
                  <button
                    type="button"
                    disabled={resetLoading}
                    onClick={() => handleSendCode('sms')}
                    className="w-full flex items-center gap-4 border-2 border-gray-200 hover:border-green-600 rounded-xl px-4 py-3.5 text-left transition-all disabled:opacity-60 group"
                  >
                    <span className="text-2xl">📱</span>
                    <div>
                      <p className="text-sm font-semibold text-gray-800 group-hover:text-green-700">
                        Text message to {resetPhoneMasked}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Send a text with a 6-digit code for entry
                      </p>
                    </div>
                  </button>
                )}

                {/* Email option */}
                <button
                  type="button"
                  disabled={resetLoading}
                  onClick={() => handleSendCode('email')}
                  className="w-full flex items-center gap-4 border-2 border-gray-200 hover:border-green-600 rounded-xl px-4 py-3.5 text-left transition-all disabled:opacity-60 group"
                >
                  <span className="text-2xl">✉️</span>
                  <div>
                    <p className="text-sm font-semibold text-gray-800 group-hover:text-green-700">
                      Email to {resetEmailMasked}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">Email a 6-digit code for entry</p>
                  </div>
                </button>
              </div>

              {resetLoading && (
                <div className="flex items-center justify-center gap-2 text-sm text-gray-500 py-1">
                  <span className="animate-spin inline-block w-4 h-4 border-2 border-gray-300 border-t-green-700 rounded-full" />
                  Sending code…
                </div>
              )}

              <MsgBox msg={resetMsg} />
            </div>
          )}

          {/* ── STEP 3: VERIFY — enter OTP ─────────────────────────────── */}
          {mode === 'verify' && (
            <form onSubmit={handleVerifyOtp} className="p-8 space-y-5">
              <div>
                <BackBtn
                  label="← Choose another method"
                  onClick={() => {
                    setMode('choose')
                    setResetMsg('')
                  }}
                />
                <h2 className="text-lg font-bold text-gray-900">Enter the code</h2>
                <p className="text-sm text-gray-500 mt-0.5">
                  {verifyMethod === 'sms' ? (
                    <>
                      We texted a 6-digit code to{' '}
                      <span className="font-semibold text-gray-700">{resetPhoneMasked}</span>.
                    </>
                  ) : (
                    <>
                      We emailed a 6-digit code to{' '}
                      <span className="font-semibold text-gray-700">{resetEmailMasked}</span>.
                    </>
                  )}
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                  Verification Code
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  className={inputCls + ' tracking-[0.4em] text-center text-lg font-semibold'}
                  value={otpCode}
                  onChange={e => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  autoFocus
                  autoComplete="one-time-code"
                />
              </div>

              <MsgBox msg={resetMsg} />

              <SubmitBtn ld={resetLoading} idleLabel="Verify Code" loadingLabel="Verifying…" />

              <button
                type="button"
                disabled={resetLoading}
                onClick={() => handleSendCode(verifyMethod)}
                className="w-full text-sm text-center text-gray-400 hover:text-gray-600 disabled:opacity-40"
              >
                Didn't get it? Resend code
              </button>
            </form>
          )}

          {/* ── STEP 4: NEW PASSWORD ────────────────────────────────────── */}
          {mode === 'newpass' && (
            <form onSubmit={handleSetPassword} className="p-8 space-y-5">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Create a new password</h2>
                <p className="text-sm text-gray-500 mt-0.5">
                  You're verified! Choose a strong password for your account.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showNewPw ? 'text' : 'password'}
                    className={inputCls + ' pr-12'}
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    autoComplete="new-password"
                    autoFocus
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowNewPw(v => !v)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm"
                  >
                    {showNewPw ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>

              {/* Strength bar */}
              {newPassword && (
                <div className="flex gap-1 -mt-2">
                  {[1, 2, 3, 4].map(n => {
                    const s = pwStrength(newPassword)
                    return (
                      <div
                        key={n}
                        className={`h-1 flex-1 rounded-full transition-all ${n <= s ? strengthColors[s - 1] : 'bg-gray-200'}`}
                      />
                    )
                  })}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                  Confirm New Password
                </label>
                <input
                  type={showNewPw ? 'text' : 'password'}
                  className={inputCls}
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  autoComplete="new-password"
                />
              </div>

              <MsgBox msg={resetMsg} />

              {!resetMsg.startsWith('ok:') && (
                <SubmitBtn ld={resetLoading} idleLabel="Set New Password" loadingLabel="Saving…" />
              )}

              {resetMsg.startsWith('ok:') && (
                <button
                  type="button"
                  onClick={resetFlow}
                  className="w-full py-3 rounded-xl text-sm font-bold text-white"
                  style={{ backgroundColor: FG }}
                >
                  Back to Sign In
                </button>
              )}
            </form>
          )}
        </div>

        <p className="text-center text-green-300/60 text-xs mt-6">
          © {new Date().getFullYear()} {PLATFORM_BRAND.name}
        </p>
      </div>
    </div>
  )
}
