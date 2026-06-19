// src/pages/Signup.jsx
// Self-serve signup: creates the auth user, then provisions a tenant + owner
// profile (via the provision_my_tenant RPC) and drops the user into the app.
// If email confirmation is required, it stores the intent and finishes
// provisioning on first login (handled in EntitlementsGate).

import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const PLANS = [
  { id: 'starter', name: 'Starter', blurb: 'Jobs, Contacts, Opportunities, Documents, Time Clock' },
  { id: 'pro', name: 'Pro', blurb: 'Starter + Estimator/Bids, Workflows, Scheduling, e-Sign, Statistics' },
  { id: 'enterprise', name: 'Enterprise', blurb: 'Pro + HR, Training, Accounting, Equipment, integrations' },
]

export default function Signup() {
  const navigate = useNavigate()
  const [company, setCompany] = useState('')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [plan, setPlan] = useState('pro')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [info, setInfo] = useState('')

  async function submit(e) {
    e.preventDefault()
    setErr('')
    setInfo('')
    if (!company.trim()) return setErr('Please enter your company name.')
    if (password.length < 6) return setErr('Password must be at least 6 characters.')
    setBusy(true)
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { data: { full_name: fullName.trim() } },
      })
      if (error) throw error

      // Remember intent so provisioning can complete after confirm/login.
      localStorage.setItem('pbs:pendingSignup', JSON.stringify({ company: company.trim(), plan }))

      if (data.session) {
        // Email confirmation is off — we have a session, provision now.
        const { error: pErr } = await supabase.rpc('provision_my_tenant', {
          p_company: company.trim(),
          p_plan: plan,
        })
        if (pErr) throw pErr
        localStorage.removeItem('pbs:pendingSignup')
        navigate('/')
        return
      }
      // No session => email confirmation required.
      setInfo('Almost there — check your email to confirm your account, then log in. Your workspace finishes setting up automatically.')
    } catch (e2) {
      const m = e2?.message || 'Could not create your account.'
      setErr(/already registered|already exists/i.test(m) ? 'That email already has an account — try logging in.' : m)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-800 to-green-950 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-7">
        <div className="text-center mb-5">
          <h1 className="text-2xl font-bold text-gray-900">Start your free trial</h1>
          <p className="text-sm text-gray-500 mt-1">14 days free. Set up your company in under a minute.</p>
        </div>

        {err && <div className="mb-4 text-sm bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2">{err}</div>}
        {info ? (
          <div className="text-sm bg-green-50 border border-green-200 text-green-800 rounded-lg px-4 py-3">
            {info}
            <div className="mt-3">
              <Link to="/login" className="btn-primary text-sm px-4 py-2 inline-block">Go to login</Link>
            </div>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            <div>
              <label className="label">Company name</label>
              <input value={company} onChange={e => setCompany(e.target.value)} className="input" placeholder="Acme Landscaping" />
            </div>
            <div>
              <label className="label">Your name</label>
              <input value={fullName} onChange={e => setFullName(e.target.value)} className="input" placeholder="Jane Smith" />
            </div>
            <div>
              <label className="label">Work email</label>
              <input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="input" placeholder="you@company.com" />
            </div>
            <div>
              <label className="label">Password</label>
              <input type="password" required value={password} onChange={e => setPassword(e.target.value)} className="input" placeholder="At least 6 characters" />
            </div>

            <div>
              <label className="label">Plan</label>
              <div className="space-y-2">
                {PLANS.map(p => (
                  <label
                    key={p.id}
                    className={`flex items-start gap-2 border rounded-lg px-3 py-2 cursor-pointer ${
                      plan === p.id ? 'border-green-600 bg-green-50' : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <input type="radio" name="plan" checked={plan === p.id} onChange={() => setPlan(p.id)} className="mt-1 accent-green-700" />
                    <span>
                      <span className="block text-sm font-semibold text-gray-900">{p.name}</span>
                      <span className="block text-xs text-gray-500">{p.blurb}</span>
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <button type="submit" disabled={busy} className="btn-primary w-full text-sm py-2.5 disabled:opacity-50">
              {busy ? 'Creating your workspace…' : 'Start free trial'}
            </button>
            <p className="text-center text-xs text-gray-500 pt-1">
              Already have an account?{' '}
              <Link to="/login" className="text-green-700 font-medium hover:underline">Log in</Link>
            </p>
          </form>
        )}
      </div>
    </div>
  )
}
