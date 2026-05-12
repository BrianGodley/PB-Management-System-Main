import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

const FG       = '#3A5038'
const FG_DARK  = '#2E4030'

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
  const [username,   setUsername]   = useState('')
  const [password,   setPassword]   = useState('')
  const [rememberMe, setRememberMe] = useState(true)
  const [showPw,     setShowPw]     = useState(false)
  const [loading,    setLoading]    = useState(false)
  const [error,      setError]      = useState('')

  // ── Password-reset multi-step state ───────────────────────────────────────
  // mode: 'login' | 'forgot' | 'choose' | 'verify' | 'newpass'
  const [mode,             setMode]             = useState('login')
  const [resetUsername,    setResetUsername]    = useState('')
  const [resetEmail,       setResetEmail]       = useState('')   // resolved email (E.164 or plain)
  const [resetPhone,       setResetPhone]       = useState('')   // E.164 phone (empty if none on file)
  const [resetPhoneMasked, setResetPhoneMasked] = useState('')
  const [resetEmailMasked, setResetEmailMasked] = useState('')
  const [verifyMethod,     setVerifyMethod]     = useState('')   // 'sms' | 'email'
  const [otpCode,          setOtpCode]          = useState('')
  const [newPassword,      setNewPassword]      = useState('')
  const [confirmPassword,  setConfirmPassword]  = useState('')
  const [showNewPw,        setShowNewPw]        = useState(false)
  const [resetLoading,     setResetLoading]     = useState(false)
  const [resetMsg,         setResetMsg]         = useState('')   // 'ok:…' | 'error:…'

  function resetFlow() {
    setMode('login')
    setResetUsername('')
    setResetEmail('')
    setResetPhone('')
    setResetPhoneMasked('')
    setResetEmailMasked('')
    setVerifyMethod('')
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
    if (!username.trim()) { setError('Please enter your username or email.'); return }
    if (!password)        { setError('Please enter your password.');           return }
    setLoading(true)

    try {
      let loginEmail = username.trim()
      if (!loginEmail.includes('@')) {
        const { data: resolvedEmail, error: rpcErr } = await supabase.rpc(
          'get_email_by_username',
          { p_username: loginEmail.toLowerCase() }
        )
        if (rpcErr) throw new Error(rpcErr.message)
        if (!resolvedEmail) throw new Error('Username not found. Try signing in with your email address instead.')
        loginEmail = resolvedEmail
      }
      const { error: signInErr } = await signIn(loginEmail, password, { persistSession: rememberMe })
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
    if (!entered) { setResetMsg('error:Please enter your username or email.'); return }
    setResetLoading(true)

    try {
      // Resolve to email
      let email = entered
      if (!email.includes('@')) {
        const { data: resolvedEmail, error: rpcErr } = await supabase.rpc(
          'get_email_by_username',
          { p_username: email.toLowerCase() }
        )
        if (rpcErr) throw new Error(rpcErr.message)
        if (!resolvedEmail) throw new Error('Username not found. Try entering your email address instead.')
        email = resolvedEmail
      }

      // Look up cell phone from the employees table
      let phoneRaw = null
      const { data: empRow } = await supabase
        .from('employees')
        .select('cell_phone')
        .eq('email', email)
        .maybeSingle()
      phoneRaw = empRow?.cell_phone

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

  // ── Step 2: send OTP (SMS) or reset link (email) ─────────────────────────
  async function handleSendCode(method) {
    setResetMsg('')
    setResetLoading(true)
    setVerifyMethod(method)

    try {
      if (method === 'sms') {
        // SMS: sends a 6-digit OTP code
        const { error: otpErr } = await supabase.auth.signInWithOtp({ phone: resetPhone })
        if (otpErr) throw new Error(otpErr.message)
        setMode('verify')
      } else {
        // Email: sends a magic link → user clicks → lands on /reset-password
        const { error: resetErr } = await supabase.auth.resetPasswordForEmail(resetEmail, {
          redirectTo: window.location.origin + '/reset-password',
        })
        if (resetErr) throw new Error(resetErr.message)
        setMode('emailsent')
      }
    } catch (err) {
      setResetMsg('error:' + (err.message || 'Failed to send. Please try again.'))
    }
    setResetLoading(false)
  }

  // ── Step 3: verify OTP ─────────────────────────────────────────────────────
  async function handleVerifyOtp(e) {
    e.preventDefault()
    setResetMsg('')
    const code = otpCode.trim()
    if (!code || code.length < 4) { setResetMsg('error:Please enter the 6-digit code.'); return }
    setResetLoading(true)

    try {
      let verifyErr
      if (verifyMethod === 'sms') {
        ({ error: verifyErr } = await supabase.auth.verifyOtp({
          phone: resetPhone,
          token: code,
          type: 'sms',
        }))
      } else {
        ({ error: verifyErr } = await supabase.auth.verifyOtp({
          email: resetEmail,
          token: code,
          type: 'email',
        }))
      }
      if (verifyErr) throw new Error('Invalid or expired code. Please try again.')
      setMode('newpass')
      setResetMsg('')
    } catch (err) {
      setResetMsg('error:' + (err.message || 'Verification failed.'))
    }
    setResetLoading(false)
  }

  // ── Step 4: set new password ───────────────────────────────────────────────
  async function handleSetPassword(e) {
    e.preventDefault()
    setResetMsg('')
    if (!newPassword)                    { setResetMsg('error:Please enter a new password.');             return }
    if (newPassword.length < 8)          { setResetMsg('error:Password must be at least 8 characters.'); return }
    if (newPassword !== confirmPassword) { setResetMsg('error:Passwords do not match.');                  return }
    setResetLoading(true)

    try {
      const { error: updateErr } = await supabase.auth.updateUser({ password: newPassword })
      if (updateErr) throw new Error(updateErr.message)
      await supabase.auth.signOut()
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

  const MsgBox = ({ msg }) => !msg ? null : (
    <div className={`flex items-start gap-2 text-sm px-3 py-2.5 rounded-xl border ${
      msg.startsWith('ok:')
        ? 'bg-green-50 border-green-200 text-green-800'
        : 'bg-red-50 border-red-200 text-red-700'
    }`}>
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
      {ld
        ? <span className="flex items-center justify-center gap-2"><Spinner /> {loadingLabel}</span>
        : idleLabel
      }
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
  const strengthColors = ['bg-red-400','bg-orange-400','bg-yellow-400','bg-green-500']

  // ── Render ─────────────────────────────────────────────────────────────────
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
            <img
              src="/logo.png" alt="Logo"
              className="w-full h-full object-contain p-2"
              onError={e => { e.target.style.display='none'; e.target.nextSibling.style.display='block' }}
            />
            <span style={{ display:'none', fontSize:'2.5rem' }}>🌿</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Picture Build</h1>
          <p className="text-green-200 text-sm mt-1">Management System</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">

          {/* ── LOGIN ──────────────────────────────────────────────────── */}
          {mode === 'login' && (
            <form onSubmit={handleLogin} className="p-8 space-y-5">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Welcome back</h2>
                <p className="text-sm text-gray-500 mt-0.5">Sign in with your username and password</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Username or Email</label>
                <input type="text" className={inputCls} value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="username or you@company.com"
                  autoComplete="username" autoFocus spellCheck={false} />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Password</label>
                <div className="relative">
                  <input type={showPw ? 'text' : 'password'} className={inputCls + ' pr-12'}
                    value={password} onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••" autoComplete="current-password" />
                  <button type="button" tabIndex={-1}
                    onClick={() => setShowPw(v => !v)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm">
                    {showPw ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input type="checkbox" checked={rememberMe}
                    onChange={e => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded accent-green-700" />
                  <span className="text-sm text-gray-600">Remember me</span>
                </label>
                <button type="button"
                  onClick={() => { setMode('forgot'); setError(''); setResetMsg('') }}
                  className="text-sm font-medium hover:underline" style={{ color: FG }}>
                  Forgot password?
                </button>
              </div>

              {error && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2.5 rounded-xl">
                  <span className="mt-0.5">⚠️</span><span>{error}</span>
                </div>
              )}

              <button type="submit" disabled={loading}
                className="w-full py-3 rounded-xl text-sm font-bold text-white transition-opacity disabled:opacity-60"
                style={{ backgroundColor: FG }}>
                {loading
                  ? <span className="flex items-center justify-center gap-2"><Spinner /> Signing in…</span>
                  : 'Sign In'}
              </button>

              <p className="text-center text-xs text-gray-400">
                Don't have an account? Contact your administrator.
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
                  Enter your username or email and we'll verify it's you before letting you create a new one.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Username or Email</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm select-none">@</span>
                  <input type="text" className={inputCls + ' pl-8'} value={resetUsername}
                    onChange={e => setResetUsername(e.target.value)}
                    placeholder="username or you@company.com"
                    autoComplete="username" autoFocus spellCheck={false} />
                </div>
              </div>

              <MsgBox msg={resetMsg} />

              <SubmitBtn ld={resetLoading} idleLabel="Continue" loadingLabel="Looking up account…" />
            </form>
          )}

          {/* ── STEP 2: CHOOSE verification method ─────────────────────── */}
          {mode === 'choose' && (
            <div className="p-8 space-y-5">
              <div>
                <BackBtn label="← Change account" onClick={() => { setMode('forgot'); setResetMsg('') }} />
                <h2 className="text-lg font-bold text-gray-900">How would you like to verify?</h2>
                <p className="text-sm text-gray-500 mt-0.5">
                  We'll send a 6-digit code to confirm it's you.
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
                      <p className="text-sm font-semibold text-gray-800 group-hover:text-green-700">Text message</p>
                      <p className="text-xs text-gray-500 mt-0.5">Send code to {resetPhoneMasked}</p>
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
                    <p className="text-sm font-semibold text-gray-800 group-hover:text-green-700">Email</p>
                    <p className="text-xs text-gray-500 mt-0.5">Send code to {resetEmailMasked}</p>
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

          {/* ── EMAIL SENT — check inbox ───────────────────────────────── */}
          {mode === 'emailsent' && (
            <div className="p-8 space-y-5">
              <div className="text-center">
                <div className="text-5xl mb-4">📬</div>
                <h2 className="text-lg font-bold text-gray-900">Check your inbox</h2>
                <p className="text-sm text-gray-500 mt-2">
                  We sent a password reset link to{' '}
                  <span className="font-semibold text-gray-700">{resetEmailMasked}</span>.
                  Click the link in that email to create a new password.
                </p>
                <p className="text-xs text-gray-400 mt-3">
                  The link expires in 1 hour. Check your spam folder if you don't see it.
                </p>
              </div>

              <button
                type="button"
                disabled={resetLoading}
                onClick={() => handleSendCode('email')}
                className="w-full text-sm text-center py-2 rounded-xl border border-gray-200 text-gray-500 hover:text-gray-700 hover:border-gray-300 transition-all disabled:opacity-40"
              >
                {resetLoading ? 'Resending…' : 'Resend email'}
              </button>

              <button
                type="button"
                onClick={resetFlow}
                className="w-full py-3 rounded-xl text-sm font-bold text-white"
                style={{ backgroundColor: FG }}
              >
                Back to Sign In
              </button>
            </div>
          )}

          {/* ── STEP 3: VERIFY — enter OTP ─────────────────────────────── */}
          {mode === 'verify' && (
            <form onSubmit={handleVerifyOtp} className="p-8 space-y-5">
              <div>
                <BackBtn label="← Choose another method" onClick={() => { setMode('choose'); setResetMsg('') }} />
                <h2 className="text-lg font-bold text-gray-900">Enter the code</h2>
                <p className="text-sm text-gray-500 mt-0.5">
                  {verifyMethod === 'sms'
                    ? <>We texted a 6-digit code to <span className="font-semibold text-gray-700">{resetPhoneMasked}</span>.</>
                    : <>We emailed a 6-digit code to <span className="font-semibold text-gray-700">{resetEmailMasked}</span>.</>
                  }
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Verification Code</label>
                <input
                  type="text" inputMode="numeric" maxLength={6}
                  className={inputCls + ' tracking-[0.4em] text-center text-lg font-semibold'}
                  value={otpCode}
                  onChange={e => setOtpCode(e.target.value.replace(/\D/g,'').slice(0,6))}
                  placeholder="000000"
                  autoFocus autoComplete="one-time-code"
                />
              </div>

              <MsgBox msg={resetMsg} />

              <SubmitBtn ld={resetLoading} idleLabel="Verify Code" loadingLabel="Verifying…" />

              <button type="button" disabled={resetLoading}
                onClick={() => handleSendCode(verifyMethod)}
                className="w-full text-sm text-center text-gray-400 hover:text-gray-600 disabled:opacity-40">
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
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">New Password</label>
                <div className="relative">
                  <input type={showNewPw ? 'text' : 'password'}
                    className={inputCls + ' pr-12'} value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    autoComplete="new-password" autoFocus />
                  <button type="button" tabIndex={-1}
                    onClick={() => setShowNewPw(v => !v)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm">
                    {showNewPw ? '🙈' : '👁️'}
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
                <input type={showNewPw ? 'text' : 'password'}
                  className={inputCls} value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  autoComplete="new-password" />
              </div>

              <MsgBox msg={resetMsg} />

              {!resetMsg.startsWith('ok:') && (
                <SubmitBtn ld={resetLoading} idleLabel="Set New Password" loadingLabel="Saving…" />
              )}

              {resetMsg.startsWith('ok:') && (
                <button type="button" onClick={resetFlow}
                  className="w-full py-3 rounded-xl text-sm font-bold text-white"
                  style={{ backgroundColor: FG }}>
                  Back to Sign In
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
