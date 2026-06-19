// src/pages/Signup.jsx
// Self-serve signup: creates the auth user, then provisions a tenant + owner
// profile (via the provision_my_tenant RPC) and drops the user into the app.
// If email confirmation is required, it stores the intent and finishes
// provisioning on first login (handled in EntitlementsGate).

import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const PLANS = [
  { id: 'tier1', name: 'Tier 1 — Base', price: 79, blurb: 'Dashboard, Org Chart, HR, Statistics, Documents' },
  { id: 'tier2', name: 'Tier 2', price: 199, blurb: '+ Training, Contacts, Opportunities, Workflows' },
  { id: 'tier3', name: 'Tier 3', price: 399, blurb: '+ Accounting, Weekly FP, Subs & Vendors, Equipment' },
]

export default function Signup() {
  const navigate = useNavigate()
  const [company, setCompany] = useState('')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [plan, setPlan] = useState('tier2')
  const [addContractor, setAddContractor] = useState(true)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [info, setInfo] = useState('')

  // Contractor package needs Tier 2+ (jobs/estimates attach to a client).
  const contractorAllowed = plan !== 'tier1'
  const wantsContractor = addContractor && contractorAllowed

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

      const packages = wantsContractor ? ['contractor'] : []
      // Remember intent so provisioning can complete after confirm/login.
      localStorage.setItem('pbs:pendingSignup', JSON.stringify({ company: company.trim(), plan, packages }))

      if (data.session) {
        // Email confirmation is off — we have a session, provision now.
        const { error: pErr } = await supabase.rpc('provision_my_tenant', {
          p_company: company.trim(),
          p_plan: plan,
          p_packages: packages,
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
                    <span className="flex-1">
                      <span className="flex items-baseline justify-between">
                        <span className="text-sm font-semibold text-gray-900">{p.name}</span>
                        <span className="text-sm font-bold text-gray-900">${p.price}<span className="text-xs font-normal text-gray-400">/mo</span></span>
                      </span>
                      <span className="block text-xs text-gray-500">{p.blurb}</span>
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Contractor add-on (requires Tier 2+) */}
            <label
              className={`flex items-start gap-2 border rounded-lg px-3 py-2 ${
                contractorAllowed ? 'cursor-pointer ' : 'opacity-50 '
              }${wantsContractor ? 'border-green-600 bg-green-50' : 'border-gray-200'}`}
            >
              <input
                type="checkbox"
                checked={wantsContractor}
                disabled={!contractorAllowed}
                onChange={e => setAddContractor(e.target.checked)}
                className="mt-1 accent-green-700"
              />
              <span className="flex-1">
                <span className="flex items-baseline justify-between">
                  <span className="text-sm font-semibold text-gray-900">Contractor Package</span>
                  <span className="text-sm font-bold text-gray-900">+$149<span className="text-xs font-normal text-gray-400">/mo</span></span>
                </span>
                <span className="block text-xs text-gray-500">
                  Jobs, Estimating, Design{!contractorAllowed && ' — requires Tier 2 or higher'}
                </span>
              </span>
            </label>

            <div className="text-right text-sm text-gray-700">
              <span className="text-gray-400 text-xs">Total </span>
              <span className="font-bold">
                ${(PLANS.find(p => p.id === plan)?.price || 0) + (wantsContractor ? 149 : 0)}
                <span className="text-xs font-normal text-gray-400">/mo after trial</span>
              </span>
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
