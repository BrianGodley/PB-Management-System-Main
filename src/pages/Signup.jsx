// src/pages/Signup.jsx
// Self-serve signup: collect company + plan, take a payment method, then create
// the auth user and provision a tenant + owner profile (via provision_my_tenant).
// If email confirmation is required, intent is stored and provisioning finishes
// on first login (handled in EntitlementsGate).
//
// PAYMENTS — BETA / TEST MODE
// ───────────────────────────
// BETA_PAYMENTS=true renders a real-looking card step that is NOT charged: the
// card is format-validated only, then signup proceeds. This lets the full funnel
// run end-to-end while Helcim is being set up + verified. To go live, set
// BETA_PAYMENTS=false and replace mockChargeCard() with a real HelcimPay token
// + create-subscription call (the rest of the flow stays the same).

import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const BETA_PAYMENTS = true
const FG = '#2E8BC9' // SoftCake blue

const PLANS = [
  {
    id: 'tier1',
    name: 'Tier 1 — Base',
    price: 79,
    tagline: 'The essentials to organize your company.',
    includes: ['Dashboard', 'Org Chart', 'HR', 'Statistics', 'Documents & E-Docs'],
  },
  {
    id: 'tier2',
    name: 'Tier 2',
    price: 229,
    featured: true,
    tagline: 'Win and manage work, end to end.',
    includes: ['Everything in Tier 1', 'Training (LMS)', 'Sales', 'Marketing', 'Workflows'],
  },
  {
    id: 'tier3',
    name: 'Tier 3',
    price: 389,
    tagline: 'Full financial and operational control.',
    includes: ['Everything in Tier 2', 'Accounting', 'Weekly FP', 'Subs & Vendors', 'Equipment'],
  },
]

// Card input formatters
const fmtCard = v => v.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim()
const fmtExp = v => {
  const d = v.replace(/\D/g, '').slice(0, 4)
  return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d
}

// Best-effort card brand from the leading digit(s) (display only — beta).
function cardBrandOf(digits) {
  if (/^4/.test(digits)) return 'Visa'
  if (/^(5[1-5]|2[2-7])/.test(digits)) return 'Mastercard'
  if (/^3[47]/.test(digits)) return 'Amex'
  if (/^(6011|65|64[4-9])/.test(digits)) return 'Discover'
  return 'Card'
}

// Stand-in for the real processor. In beta this always "succeeds" without
// charging. Swap for a HelcimPay tokenize + create-subscription call to go live.
async function mockChargeCard() {
  await new Promise(r => setTimeout(r, 700))
  return { ok: true, mode: 'beta' }
}

export default function Signup() {
  const navigate = useNavigate()
  const [step, setStep] = useState('details') // 'details' | 'payment'

  // Account / plan
  const [company, setCompany] = useState('')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [plan, setPlan] = useState('tier2')
  const [addContractor, setAddContractor] = useState(true)

  // Payment (beta — not charged)
  const [cardName, setCardName] = useState('')
  const [cardNumber, setCardNumber] = useState('')
  const [cardExp, setCardExp] = useState('')
  const [cardCvc, setCardCvc] = useState('')
  const [cardZip, setCardZip] = useState('')

  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [info, setInfo] = useState('')

  // Contractor package needs Tier 2+ (jobs/estimates attach to a client).
  const contractorAllowed = plan !== 'tier1'
  const wantsContractor = addContractor && contractorAllowed
  const total = (PLANS.find(p => p.id === plan)?.price || 0) + (wantsContractor ? 199 : 0)

  // Step 1 → 2: validate details, then show the payment step.
  function continueToPayment(e) {
    e.preventDefault()
    setErr('')
    if (!company.trim()) return setErr('Please enter your company name.')
    if (!email.trim()) return setErr('Please enter your work email.')
    if (password.length < 6) return setErr('Password must be at least 6 characters.')
    setStep('payment')
  }

  // Step 2: take payment (beta-mock), then create the account + provision.
  async function submitPayment(e) {
    e.preventDefault()
    setErr('')
    setInfo('')

    const digits = cardNumber.replace(/\D/g, '')
    if (!cardName.trim()) return setErr('Enter the name on the card.')
    if (digits.length < 13) return setErr('Enter a valid card number.')
    if (!/^\d{2}\/\d{2}$/.test(cardExp)) return setErr('Enter expiry as MM/YY.')
    if (cardCvc.length < 3) return setErr('Enter the 3 or 4 digit security code.')

    setBusy(true)
    try {
      // 1) Payment (beta: not charged; live: HelcimPay token + subscription).
      const charge = await mockChargeCard()
      if (!charge.ok) throw new Error('Your card could not be processed. Please try another card.')

      // 2) Create the auth user.
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { data: { full_name: fullName.trim() } },
      })
      if (error) throw error

      const packages = wantsContractor ? ['contractor'] : []
      // The (beta/test) card to show in Settings → Billing. Last4 + brand + exp
      // only — never the full PAN.
      const expDigits = cardExp.replace(/\D/g, '')
      const card = {
        brand: cardBrandOf(digits),
        last4: digits.slice(-4),
        exp: expDigits.length === 4 ? `${expDigits.slice(0, 2)}/20${expDigits.slice(2)}` : '',
      }
      // Remember intent so provisioning can complete after confirm/login.
      localStorage.setItem(
        'softcake:pendingSignup',
        JSON.stringify({ company: company.trim(), plan, packages, card })
      )

      if (data.session) {
        // Email confirmation is off — we have a session, provision now.
        const { error: pErr } = await supabase.rpc('provision_my_tenant', {
          p_company: company.trim(),
          p_plan: plan,
          p_packages: packages,
        })
        if (pErr) throw pErr
        // Store the beta card so Billing reflects it (non-fatal).
        await supabase
          .rpc('set_beta_card', { p_brand: card.brand, p_last4: card.last4, p_exp: card.exp })
          .catch(() => {})
        localStorage.removeItem('softcake:pendingSignup')
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

  const wide = step === 'details' && !info

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: `linear-gradient(135deg, #1B5E8C 0%, #2E8BC9 60%, #5BB3E4 100%)` }}
    >
      <div className={`w-full ${wide ? 'max-w-4xl' : 'max-w-md'} bg-white rounded-2xl shadow-2xl p-7 sm:p-9 transition-all`}>
        <div className="text-center mb-6">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">Start your free trial</h1>
          <p className="text-sm sm:text-base text-gray-500 mt-2">14 days free, unlimited users. Set up your company in under a minute.</p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 mb-6 text-xs font-medium">
          <span style={step === 'details' ? { color: FG } : undefined} className={step === 'details' ? '' : 'text-gray-400'}>1. Your details</span>
          <span className="text-gray-300">—</span>
          <span style={step === 'payment' ? { color: FG } : undefined} className={step === 'payment' ? '' : 'text-gray-400'}>2. Payment</span>
        </div>

        {err && <div className="mb-4 text-sm bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2">{err}</div>}

        {info ? (
          <div className="text-sm bg-green-50 border border-green-200 text-green-800 rounded-lg px-4 py-3">
            {info}
            <div className="mt-3">
              <Link to="/login" className="text-sm px-4 py-2 inline-block rounded-xl font-bold text-white" style={{ backgroundColor: FG }}>Go to login</Link>
            </div>
          </div>
        ) : step === 'details' ? (
          /* ── Step 1: details + plan ─────────────────────────────────────── */
          <form onSubmit={continueToPayment} className="space-y-5">
            <div className="grid sm:grid-cols-2 gap-3">
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
            </div>

            {/* Plans across — same detail as the pricing page */}
            <div>
              <label className="label">Choose your plan</label>
              <div className="grid sm:grid-cols-3 gap-3 mt-1">
                {PLANS.map(p => {
                  const sel = plan === p.id
                  return (
                    <button
                      type="button"
                      key={p.id}
                      onClick={() => setPlan(p.id)}
                      className={`text-left rounded-xl border-2 p-4 flex flex-col transition-all ${sel ? 'bg-blue-50 shadow-sm' : 'border-gray-200 hover:border-blue-300'}`}
                      style={sel ? { borderColor: FG } : undefined}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-gray-900">{p.name}</span>
                        {p.featured && (
                          <span className="text-[10px] font-bold uppercase tracking-wide text-white rounded-full px-2 py-0.5" style={{ backgroundColor: FG }}>
                            Popular
                          </span>
                        )}
                      </div>
                      <div className="mt-1">
                        <span className="text-2xl font-extrabold text-gray-900">${p.price}</span>
                        <span className="text-xs text-gray-400">/mo</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1 min-h-[2.5rem]">{p.tagline}</p>
                      <ul className="mt-2 space-y-1.5 flex-1">
                        {p.includes.map(i => (
                          <li key={i} className="flex gap-1.5 text-xs text-gray-600">
                            <span className="font-bold" style={{ color: FG }}>✓</span>
                            <span>{i}</span>
                          </li>
                        ))}
                      </ul>
                      <span
                        className={`mt-4 text-center text-xs font-bold rounded-lg py-2 ${sel ? 'text-white' : 'text-gray-600 border border-gray-200'}`}
                        style={sel ? { backgroundColor: FG } : undefined}
                      >
                        {sel ? '✓ Selected' : 'Choose'}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Contractor add-on (requires Tier 2+) */}
            <label
              className={`flex items-start gap-3 border-2 rounded-xl px-4 py-3 ${
                contractorAllowed ? 'cursor-pointer ' : 'opacity-50 '
              }${wantsContractor ? 'bg-blue-50' : 'border-gray-200'}`}
              style={wantsContractor ? { borderColor: FG } : undefined}
            >
              <input
                type="checkbox"
                checked={wantsContractor}
                disabled={!contractorAllowed}
                onChange={e => setAddContractor(e.target.checked)}
                className="mt-1 accent-blue-600"
              />
              <span className="flex-1">
                <span className="flex items-baseline justify-between">
                  <span className="text-sm font-semibold text-gray-900">Contractor Package</span>
                  <span className="text-sm font-bold text-gray-900">+$199<span className="text-xs font-normal text-gray-400">/mo</span></span>
                </span>
                <span className="block text-xs text-gray-500">
                  Jobs, Estimating &amp; Bids, Design{!contractorAllowed && ' — requires Tier 2 or higher'}
                </span>
              </span>
            </label>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-1">
              <p className="text-sm text-gray-500">
                <span className="font-extrabold text-gray-900 text-xl">${total}</span>/mo after your 14-day trial
              </p>
              <button
                type="submit"
                className="w-full sm:w-auto text-base font-bold rounded-xl px-8 py-3.5 text-white shadow-sm hover:opacity-90 transition-opacity"
                style={{ backgroundColor: FG }}
              >
                Continue to payment
              </button>
            </div>
            <p className="text-center text-xs text-gray-500">
              Already have an account?{' '}
              <Link to="/login" className="font-medium hover:underline" style={{ color: FG }}>Log in</Link>
            </p>
          </form>
        ) : (
          /* ── Step 2: payment (beta — not charged) ───────────────────────── */
          <form onSubmit={submitPayment} className="space-y-3">
            {/* Order summary */}
            <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">{PLANS.find(p => p.id === plan)?.name}</span>
                <span className="font-medium text-gray-800">${PLANS.find(p => p.id === plan)?.price}/mo</span>
              </div>
              {wantsContractor && (
                <div className="flex justify-between mt-1">
                  <span className="text-gray-600">Contractor Package</span>
                  <span className="font-medium text-gray-800">+$199/mo</span>
                </div>
              )}
              <div className="flex justify-between mt-2 pt-2 border-t border-gray-200">
                <span className="font-semibold text-gray-900">Due after 14-day trial</span>
                <span className="font-bold text-gray-900">${total}/mo</span>
              </div>
              <p className="text-xs text-blue-700 mt-1.5">$0 due today — your trial starts free.</p>
            </div>

            <div>
              <label className="label">Name on card</label>
              <input value={cardName} onChange={e => setCardName(e.target.value)} className="input" placeholder="Jane Smith" />
            </div>
            <div>
              <label className="label">Card number</label>
              <input
                inputMode="numeric"
                value={cardNumber}
                onChange={e => setCardNumber(fmtCard(e.target.value))}
                className="input tracking-widest"
                placeholder="1234 5678 9012 3456"
              />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="label">Expiry</label>
                <input value={cardExp} onChange={e => setCardExp(fmtExp(e.target.value))} className="input" placeholder="MM/YY" />
              </div>
              <div>
                <label className="label">CVC</label>
                <input inputMode="numeric" value={cardCvc} onChange={e => setCardCvc(e.target.value.replace(/\D/g, '').slice(0, 4))} className="input" placeholder="123" />
              </div>
              <div>
                <label className="label">ZIP</label>
                <input value={cardZip} onChange={e => setCardZip(e.target.value.slice(0, 10))} className="input" placeholder="90210" />
              </div>
            </div>

            <button
              type="submit"
              disabled={busy}
              className="w-full text-base font-bold rounded-xl py-3.5 text-white shadow-sm hover:opacity-90 transition-opacity disabled:opacity-50"
              style={{ backgroundColor: FG }}
            >
              {busy ? 'Creating your workspace…' : 'Start free trial'}
            </button>
            <button type="button" onClick={() => { setErr(''); setStep('details') }} disabled={busy} className="w-full text-center text-xs text-gray-500 hover:text-gray-700 pt-1 disabled:opacity-50">
              ← Back to details
            </button>
            <p className="text-center text-[11px] text-gray-400 pt-0.5">
              You won’t be charged during your 14-day trial. Cancel anytime.
            </p>
          </form>
        )}
      </div>
    </div>
  )
}
