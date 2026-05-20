// src/portal/PortalActivate.jsx
//
// Portal activation page reached from the invite email link
// (/client-portal/activate?token=...). Validates the token, lets the client
// pick an account name + password, creates their Supabase Auth account, then
// links it to the client_portals row via portal_complete_activation.
import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function PortalActivate() {
  const [params] = useSearchParams()
  const token = params.get('token') || ''
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [invite, setInvite] = useState(null) // { client_id, client_name, invite_email }
  const [accountName, setAccountName] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    if (!token) {
      setError('This activation link is missing its token.')
      setLoading(false)
      return
    }
    let cancelled = false
    ;(async () => {
      const { data, error: e } = await supabase.rpc('portal_validate_invite', {
        p_token: token,
      })
      if (cancelled) return
      if (e) {
        setError(e.message)
      } else if (!data || data.length === 0) {
        setError('This invite link is invalid or has expired. Ask your contractor to resend it.')
      } else {
        setInvite(data[0])
        setAccountName(data[0].client_name || '')
      }
      setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [token])

  async function handleActivate(e) {
    e.preventDefault()
    setError('')
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }
    setBusy(true)

    // 1) Create the Supabase Auth account for this client.
    const { error: signErr } = await supabase.auth.signUp({
      email: invite.invite_email,
      password,
    })
    if (signErr) {
      setBusy(false)
      // A pre-existing account is fine — they may be re-activating.
      if (!/already registered/i.test(signErr.message)) {
        setError(signErr.message)
        return
      }
    }

    // 2) Make sure we have a live session (sign-up may not auto-login).
    let { data: sess } = await supabase.auth.getSession()
    if (!sess?.session) {
      const { error: inErr } = await supabase.auth.signInWithPassword({
        email: invite.invite_email,
        password,
      })
      if (inErr) {
        setBusy(false)
        if (/confirm/i.test(inErr.message)) {
          setNotice(
            'Your account was created. Please check your email to confirm the address, then return to the portal login.'
          )
        } else {
          setError('Account created. Please continue from the portal login page.')
        }
        return
      }
    }

    // 3) Link the auth account to the portal record.
    const { data: result, error: rpcErr } = await supabase.rpc('portal_complete_activation', {
      p_token: token,
      p_account_name: accountName,
    })
    setBusy(false)
    if (rpcErr || result !== 'active') {
      setError(rpcErr?.message || 'Could not finish activation — the invite link may have expired.')
      return
    }
    navigate('/client-portal')
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 px-4">
      <div className="w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-lg">
        <div className="bg-[#3A5038] px-6 py-7 text-center">
          <p className="text-3xl">🌿</p>
          <p className="mt-1 text-lg font-bold text-white">Picture Build System</p>
          <p className="text-xs text-white/70">Activate Your Client Portal</p>
        </div>

        <div className="px-6 py-6">
          {loading && <p className="py-6 text-center text-sm text-gray-400">Checking your invite…</p>}

          {!loading && error && !invite && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

          {!loading && notice && (
            <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-3 text-sm text-green-700">
              {notice}
            </div>
          )}

          {!loading && invite && !notice && (
            <form onSubmit={handleActivate} className="space-y-4">
              <p className="text-sm text-gray-600">
                Welcome{invite.client_name ? `, ${invite.client_name}` : ''}. Set up your portal
                account below.
              </p>
              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
                  {error}
                </div>
              )}
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500">Email</label>
                <input
                  type="email"
                  value={invite.invite_email || ''}
                  disabled
                  className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500">Account Name</label>
                <input
                  type="text"
                  required
                  value={accountName}
                  onChange={e => setAccountName(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-green-600 focus:outline-none focus:ring-2 focus:ring-green-600/30"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500">Password</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-green-600 focus:outline-none focus:ring-2 focus:ring-green-600/30"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500">
                  Confirm Password
                </label>
                <input
                  type="password"
                  required
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-green-600 focus:outline-none focus:ring-2 focus:ring-green-600/30"
                />
              </div>
              <button
                type="submit"
                disabled={busy}
                className="w-full rounded-lg bg-green-700 py-2.5 text-sm font-semibold text-white hover:bg-green-800 disabled:opacity-50"
              >
                {busy ? 'Activating…' : 'Activate My Portal'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
