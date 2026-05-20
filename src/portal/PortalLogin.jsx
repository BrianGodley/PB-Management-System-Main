// src/portal/PortalLogin.jsx
//
// Client-facing login for the Client Portal (/client-portal). Separate from
// the staff /login page. Authenticates through Supabase Auth, then confirms
// the account is linked to an active client_portals row before entering.
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function PortalLogin() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    const { data, error: signErr } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })
    if (signErr) {
      setBusy(false)
      setError(signErr.message)
      return
    }
    const { data: portal } = await supabase
      .from('client_portals')
      .select('id, status')
      .eq('auth_user_id', data.user.id)
      .eq('status', 'active')
      .maybeSingle()
    setBusy(false)
    if (!portal) {
      await supabase.auth.signOut()
      setError('This login is not set up for the client portal.')
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
          <p className="text-xs text-white/70">Client Portal</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4 px-6 py-6">
          <h1 className="text-center text-base font-semibold text-gray-800">Sign in</h1>
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
              {error}
            </div>
          )}
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
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
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-green-600 focus:outline-none focus:ring-2 focus:ring-green-600/30"
            />
          </div>
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-lg bg-green-700 py-2.5 text-sm font-semibold text-white hover:bg-green-800 disabled:opacity-50"
          >
            {busy ? 'Signing in…' : 'Sign In'}
          </button>
          <p className="text-center text-xs text-gray-400">
            Need access? Your contractor sends an activation invite by email.
          </p>
        </form>
      </div>
    </div>
  )
}
