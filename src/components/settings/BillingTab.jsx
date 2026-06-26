// src/components/settings/BillingTab.jsx
// Billing: Overview (plan, status, payment method, Activate Billing) + History
// (a ledger of payments — including the $0 trial-start row, even on the beta
// card). Live card management via Helcim is still coming; beta tenants can edit
// their test card here.

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'

const FG = '#2E8BC9'

function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}
function statusLabel(s) {
  switch (s) {
    case 'trialing': return 'Free trial'
    case 'active': return 'Active'
    case 'past_due': return 'Past due'
    case 'canceled': return 'Canceled'
    default: return s || 'Active'
  }
}
function cardBrandOf(digits) {
  if (/^4/.test(digits)) return 'Visa'
  if (/^(5[1-5]|2[2-7])/.test(digits)) return 'Mastercard'
  if (/^3[47]/.test(digits)) return 'Amex'
  if (/^(6011|65|64[4-9])/.test(digits)) return 'Discover'
  return 'Card'
}

function CardBrand({ brand }) {
  const b = (brand || '').toLowerCase()
  const map = {
    visa: { label: 'VISA', cls: 'bg-blue-700' },
    mastercard: { label: 'MC', cls: 'bg-orange-600' },
    amex: { label: 'AMEX', cls: 'bg-sky-600' },
    'american express': { label: 'AMEX', cls: 'bg-sky-600' },
    discover: { label: 'DISC', cls: 'bg-amber-500' },
  }
  const m = map[b] || { label: (brand || 'CARD').toUpperCase().slice(0, 4), cls: 'bg-gray-500' }
  return <span className={`inline-block text-[10px] font-bold text-white rounded px-1.5 py-0.5 ${m.cls}`}>{m.label}</span>
}

function loadHelcimPay() {
  return new Promise((resolve, reject) => {
    if (window.appendHelcimPayIframe) return resolve()
    let s = document.getElementById('helcim-pay-js')
    if (!s) {
      s = document.createElement('script')
      s.id = 'helcim-pay-js'
      s.src = 'https://secure.helcim.app/helcim-pay/services/start.js'
      s.onload = () => resolve()
      s.onerror = () => reject(new Error('Could not load the secure payment window.'))
      document.body.appendChild(s)
    } else resolve()
  })
}

export default function BillingTab({ currentUserIsAdmin = false }) {
  const { user } = useAuth()
  const [sub, setSub] = useState(null)
  const [packages, setPackages] = useState([])
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState('overview') // 'overview' | 'history'

  const [activating, setActivating] = useState(false)
  const [activateErr, setActivateErr] = useState('')
  const [activateMsg, setActivateMsg] = useState('')

  // change-payment-method (beta) modal
  const [showCard, setShowCard] = useState(false)
  const [cardNum, setCardNum] = useState('')
  const [cardExp, setCardExp] = useState('')
  const [savingCard, setSavingCard] = useState(false)
  const [cardErr, setCardErr] = useState('')

  async function load() {
    const [{ data: s }, { data: pk }, { data: pay }] = await Promise.all([
      supabase.rpc('get_my_subscription'),
      supabase.from('packages').select('*'),
      supabase.from('billing_payments').select('*').order('occurred_at', { ascending: false }),
    ])
    setSub(s || null)
    setPackages(pk || [])
    setPayments(pay || [])
  }

  useEffect(() => {
    ;(async () => {
      setLoading(true)
      await load()
      setLoading(false)
    })()
  }, [])

  if (loading)
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-700"></div>
      </div>
    )
  if (!sub)
    return (
      <div className="card">
        <p className="text-sm text-gray-600">No billing information is available for this workspace yet.</p>
      </div>
    )

  const activePkgs = packages.filter(p => (sub.package_ids || []).includes(p.id))
  const monthly = (Number(sub.price_monthly) || 0) + activePkgs.reduce((s, p) => s + (Number(p.price_monthly) || 0), 0)
  const effStatus = sub.billing_status || sub.status
  const trialing = effStatus === 'trialing'
  const renewal = sub.current_period_end || sub.trial_ends_at
  const hasCard = !!sub.card_last4
  const live = !!sub.has_live_billing
  const isTestCard = hasCard && !live
  const planLabel = [sub.plan_name, activePkgs.map(p => p.name).join(' + ')].filter(Boolean).join(' + ')

  async function activateBilling() {
    setActivateErr(''); setActivateMsg(''); setActivating(true)
    try {
      const { data: init, error: initErr } = await supabase.functions.invoke('helcim-subscribe', { body: { action: 'init' } })
      if (initErr || !init?.checkoutToken) throw new Error(init?.error || initErr?.message || 'Could not start activation.')
      const { checkoutToken, customerCode } = init
      await loadHelcimPay()
      const card = await new Promise((resolve, reject) => {
        const handler = event => {
          if (!event.data || event.data.eventName !== `helcim-pay-js-${checkoutToken}`) return
          if (event.data.eventStatus === 'ABORTED') { window.removeEventListener('message', handler); window.removeHelcimPayIframe?.(); reject(new Error('Card entry was cancelled.')); return }
          if (event.data.eventStatus === 'SUCCESS') {
            window.removeEventListener('message', handler); window.removeHelcimPayIframe?.()
            let d = null
            try { const p = JSON.parse(event.data.eventMessage); d = p?.data?.data || p?.data || p } catch { d = null }
            const last4 = String(d?.cardNumber || d?.cardLast4 || '').replace(/\D/g, '').slice(-4)
            resolve({ brand: d?.cardType || d?.cardBrand || '', last4, exp: d?.cardExpiry || '' })
          }
        }
        window.addEventListener('message', handler)
        window.appendHelcimPayIframe(checkoutToken)
      })
      const { data: sres, error: sErr } = await supabase.functions.invoke('helcim-subscribe', { body: { action: 'subscribe', customerCode, card } })
      if (sErr || !sres?.ok) throw new Error(sres?.error || sErr?.message || 'Could not create the subscription.')
      await load(); setActivateMsg('Billing activated — your subscription is now live.')
    } catch (e) {
      setActivateErr(String(e?.message || e))
    } finally { setActivating(false) }
  }

  async function saveBetaCard(e) {
    e?.preventDefault()
    setCardErr('')
    const digits = cardNum.replace(/\D/g, '')
    if (digits.length < 13) return setCardErr('Enter a valid card number.')
    if (!/^\d{2}\/\d{2}$/.test(cardExp)) return setCardErr('Enter expiry as MM/YY.')
    setSavingCard(true)
    const [mm, yy] = cardExp.split('/')
    const { error } = await supabase.rpc('set_beta_card', {
      p_brand: cardBrandOf(digits), p_last4: digits.slice(-4), p_exp: `${mm}/20${yy}`,
    })
    setSavingCard(false)
    if (error) return setCardErr(error.message)
    setShowCard(false); setCardNum(''); setCardExp('')
    await load()
  }

  return (
    <div className="space-y-6">
      {/* Sub-tabs */}
      <div className="flex justify-center">
        <div className="inline-flex bg-gray-100 rounded-full p-1">
          {[['overview', 'Overview'], ['history', 'History']].map(([k, label]) => (
            <button
              key={k}
              onClick={() => setView(k)}
              className={`px-4 py-1.5 text-sm font-medium rounded-full transition-colors ${view === k ? 'bg-white text-green-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {view === 'history' ? (
        <div className="card">
          <h2 className="font-semibold text-gray-900 mb-4">Payment History</h2>
          {payments.length === 0 ? (
            <p className="text-sm text-gray-400">No billing activity yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-gray-400 border-b border-gray-100">
                    <th className="py-2 pr-3 font-medium">Date</th>
                    <th className="py-2 pr-3 font-medium">Subscription</th>
                    <th className="py-2 pr-3 font-medium">Amount</th>
                    <th className="py-2 pr-3 font-medium">Method</th>
                    <th className="py-2 pr-3 font-medium">Card</th>
                    <th className="py-2 font-medium">Last 4</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map(p => (
                    <tr key={p.id} className="border-b border-gray-50">
                      <td className="py-2.5 pr-3 text-gray-700 whitespace-nowrap">{fmtDate(p.occurred_at)}</td>
                      <td className="py-2.5 pr-3 text-gray-700">{p.description || '—'}</td>
                      <td className="py-2.5 pr-3 text-gray-900 font-medium whitespace-nowrap">
                        {p.status === 'trial' || Number(p.amount) === 0 ? 'Free' : `$${Number(p.amount).toFixed(2)}`}
                      </td>
                      <td className="py-2.5 pr-3 text-gray-600 whitespace-nowrap">
                        {p.method === 'ach' ? 'Bank (ACH)' : p.method === 'card' ? 'Credit card' : '—'}
                      </td>
                      <td className="py-2.5 pr-3">{p.card_brand ? <CardBrand brand={p.card_brand} /> : '—'}</td>
                      <td className="py-2.5 text-gray-600 whitespace-nowrap">{p.card_last4 ? `•••• ${p.card_last4}` : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="text-xs text-gray-400 mt-3">
            Your trial start is recorded here from day one. Charges appear automatically once live billing begins.
          </p>
        </div>
      ) : (
        <>
          {/* Activate billing */}
          {currentUserIsAdmin && !live && (
            <div className="card bg-green-50 border-green-200">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <h2 className="font-semibold text-green-900">Activate Billing</h2>
                  <p className="text-sm text-green-800 mt-0.5">
                    Convert this {isTestCard ? 'beta' : 'trial'} workspace to a paying subscription at <b>${monthly.toFixed(0)}/mo</b>.
                  </p>
                </div>
                <button onClick={activateBilling} disabled={activating} className="btn-primary px-5 disabled:opacity-50">
                  {activating ? 'Activating…' : 'Activate Billing'}
                </button>
              </div>
              {activateErr && <div className="mt-3 bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg">{activateErr}</div>}
            </div>
          )}
          {activateMsg && <div className="bg-green-50 border border-green-200 text-green-800 text-sm px-3 py-2 rounded-lg">✓ {activateMsg}</div>}

          {/* Summary */}
          <div className="card">
            <h2 className="font-semibold text-gray-900 mb-4">Billing Summary</h2>
            <dl className="text-sm divide-y divide-gray-100">
              <div className="flex justify-between py-2"><dt className="text-gray-500">Plan</dt><dd className="text-gray-900 font-medium">{sub.plan_name || '—'}</dd></div>
              {activePkgs.map(p => (
                <div key={p.id} className="flex justify-between py-2"><dt className="text-gray-500">{p.name}</dt><dd className="text-gray-900">+${Number(p.price_monthly || 0).toFixed(0)}/mo</dd></div>
              ))}
              <div className="flex justify-between py-2"><dt className="text-gray-500">Total</dt><dd className="text-gray-900 font-semibold">${monthly.toFixed(0)}/mo</dd></div>
              <div className="flex justify-between py-2"><dt className="text-gray-500">Status</dt><dd className="text-gray-900">{statusLabel(effStatus)}</dd></div>
              <div className="flex justify-between py-2"><dt className="text-gray-500">{trialing ? 'Trial ends' : 'Next renewal'}</dt><dd className="text-gray-900">{fmtDate(renewal)}</dd></div>
              <div className="flex justify-between py-2"><dt className="text-gray-500">Billing contact</dt><dd className="text-gray-900">{user?.email || '—'}</dd></div>
            </dl>
          </div>

          {/* Payment method */}
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-gray-900">Payment Method</h2>
              {isTestCard && <span className="text-[11px] font-medium bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Test card (beta)</span>}
              {live && <span className="text-[11px] font-medium bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Live</span>}
            </div>
            {hasCard ? (
              <div className="flex items-center gap-3 rounded-xl border border-gray-200 p-3">
                <CardBrand brand={sub.card_brand} />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{sub.card_brand || 'Card'} •••• {sub.card_last4}</p>
                  <p className="text-xs text-gray-500">{sub.card_exp ? `Expires ${sub.card_exp}` : 'On file'}</p>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-gray-300 p-4 text-sm text-gray-500">No payment method on file yet.</div>
            )}
            {currentUserIsAdmin && (
              <button
                onClick={() => (live ? setActivateMsg('To update a live card, contact billing@softcake.com.') : setShowCard(true))}
                className="mt-3 text-sm font-medium hover:underline"
                style={{ color: FG }}
              >
                Change payment method
              </button>
            )}
          </div>

          {trialing && (
            <div className="card bg-blue-50 border-blue-200">
              <p className="text-sm text-blue-800">
                You're on a free trial until <b>{fmtDate(renewal)}</b>. You won't be charged until your trial ends — we'll email you before that happens.
              </p>
            </div>
          )}
        </>
      )}

      {/* Change payment method (beta) modal */}
      {showCard && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <form onSubmit={saveBetaCard} className="bg-white w-full max-w-sm rounded-2xl shadow-2xl p-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold text-gray-900">Update payment method</h2>
              <button type="button" onClick={() => setShowCard(false)} className="text-gray-400 hover:text-gray-700 text-2xl leading-none">×</button>
            </div>
            <p className="text-xs text-gray-500 mb-4">Beta — no charge is made. Enter the card you'd like on file.</p>
            <label className="label">Card number</label>
            <input
              inputMode="numeric"
              value={cardNum}
              onChange={e => setCardNum(e.target.value.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim())}
              className="input tracking-widest"
              placeholder="1234 5678 9012 3456"
            />
            <label className="label mt-3">Expiry (MM/YY)</label>
            <input
              value={cardExp}
              onChange={e => { const d = e.target.value.replace(/\D/g, '').slice(0, 4); setCardExp(d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d) }}
              className="input"
              placeholder="MM/YY"
            />
            {cardErr && <p className="text-sm text-red-600 mt-2">{cardErr}</p>}
            <div className="mt-5 flex gap-3">
              <button type="button" onClick={() => setShowCard(false)} className="btn-secondary flex-1 text-sm">Cancel</button>
              <button type="submit" disabled={savingCard} className="btn-primary flex-1 text-sm disabled:opacity-50">{savingCard ? 'Saving…' : 'Save card'}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
