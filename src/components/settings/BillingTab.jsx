// src/components/settings/BillingTab.jsx
// Billing overview: current plan + price, billing status, renewal date, and the
// payment method on file. Beta/trial tenants show their test card and an
// "Activate Billing" action that vaults a real card (HelcimPay) and creates the
// live subscription via the helcim-subscribe edge function.

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'

function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
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

// Load Helcim's hosted HelcimPay.js once (same approach as the client portal).
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
    } else {
      resolve()
    }
  })
}

export default function BillingTab({ currentUserIsAdmin = false }) {
  const { user } = useAuth()
  const [sub, setSub] = useState(null)
  const [packages, setPackages] = useState([])
  const [loading, setLoading] = useState(true)
  const [activating, setActivating] = useState(false)
  const [activateErr, setActivateErr] = useState('')
  const [activateMsg, setActivateMsg] = useState('')

  async function load() {
    const [{ data: s }, { data: pk }] = await Promise.all([
      supabase.rpc('get_my_subscription'),
      supabase.from('packages').select('*'),
    ])
    setSub(s || null)
    setPackages(pk || [])
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
  const canActivate = currentUserIsAdmin && !live

  async function activateBilling() {
    setActivateErr('')
    setActivateMsg('')
    setActivating(true)
    try {
      const { data: init, error: initErr } = await supabase.functions.invoke('helcim-subscribe', {
        body: { action: 'init' },
      })
      if (initErr || !init?.checkoutToken)
        throw new Error(init?.error || initErr?.message || 'Could not start activation.')
      const { checkoutToken, customerCode } = init
      await loadHelcimPay()

      const card = await new Promise((resolve, reject) => {
        const handler = event => {
          if (!event.data || event.data.eventName !== `helcim-pay-js-${checkoutToken}`) return
          if (event.data.eventStatus === 'ABORTED') {
            window.removeEventListener('message', handler)
            window.removeHelcimPayIframe?.()
            reject(new Error('Card entry was cancelled.'))
            return
          }
          if (event.data.eventStatus === 'SUCCESS') {
            window.removeEventListener('message', handler)
            window.removeHelcimPayIframe?.()
            let d = null
            try {
              const parsed = JSON.parse(event.data.eventMessage)
              d = parsed?.data?.data || parsed?.data || parsed
            } catch {
              d = null
            }
            const last4 = String(d?.cardNumber || d?.cardLast4 || '').replace(/\D/g, '').slice(-4)
            resolve({ brand: d?.cardType || d?.cardBrand || '', last4, exp: d?.cardExpiry || '' })
          }
        }
        window.addEventListener('message', handler)
        window.appendHelcimPayIframe(checkoutToken)
      })

      const { data: sres, error: sErr } = await supabase.functions.invoke('helcim-subscribe', {
        body: { action: 'subscribe', customerCode, card },
      })
      if (sErr || !sres?.ok) throw new Error(sres?.error || sErr?.message || 'Could not create the subscription.')

      await load()
      setActivateMsg('Billing activated — your subscription is now live.')
    } catch (e) {
      setActivateErr(String(e?.message || e))
    } finally {
      setActivating(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Activate billing (beta/trial → paying) */}
      {canActivate && (
        <div className="card bg-green-50 border-green-200">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h2 className="font-semibold text-green-900">Activate Billing</h2>
              <p className="text-sm text-green-800 mt-0.5">
                Convert this {isTestCard ? 'beta' : 'trial'} workspace to a paying subscription at{' '}
                <b>${monthly.toFixed(0)}/mo</b>. You'll enter a real card in Helcim's secure window.
              </p>
            </div>
            <button onClick={activateBilling} disabled={activating} className="btn-primary px-5 disabled:opacity-50">
              {activating ? 'Activating…' : 'Activate Billing'}
            </button>
          </div>
          {activateErr && (
            <div className="mt-3 bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg">
              {activateErr}
            </div>
          )}
        </div>
      )}

      {activateMsg && (
        <div className="bg-green-50 border border-green-200 text-green-800 text-sm px-3 py-2 rounded-lg">
          ✓ {activateMsg}
        </div>
      )}

      {/* Summary */}
      <div className="card">
        <h2 className="font-semibold text-gray-900 mb-4">Billing Summary</h2>
        <dl className="text-sm divide-y divide-gray-100">
          <div className="flex justify-between py-2">
            <dt className="text-gray-500">Plan</dt>
            <dd className="text-gray-900 font-medium">{sub.plan_name || '—'}</dd>
          </div>
          {activePkgs.map(p => (
            <div key={p.id} className="flex justify-between py-2">
              <dt className="text-gray-500">{p.name}</dt>
              <dd className="text-gray-900">+${Number(p.price_monthly || 0).toFixed(0)}/mo</dd>
            </div>
          ))}
          <div className="flex justify-between py-2">
            <dt className="text-gray-500">Total</dt>
            <dd className="text-gray-900 font-semibold">${monthly.toFixed(0)}/mo</dd>
          </div>
          <div className="flex justify-between py-2">
            <dt className="text-gray-500">Status</dt>
            <dd className="text-gray-900">{statusLabel(effStatus)}</dd>
          </div>
          <div className="flex justify-between py-2">
            <dt className="text-gray-500">{trialing ? 'Trial ends' : 'Next renewal'}</dt>
            <dd className="text-gray-900">{fmtDate(renewal)}</dd>
          </div>
          <div className="flex justify-between py-2">
            <dt className="text-gray-500">Billing contact</dt>
            <dd className="text-gray-900">{user?.email || '—'}</dd>
          </div>
        </dl>
      </div>

      {/* Payment method */}
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-gray-900">Payment Method</h2>
          {isTestCard && (
            <span className="text-[11px] font-medium bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
              Test card (beta)
            </span>
          )}
          {live && (
            <span className="text-[11px] font-medium bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
              Live
            </span>
          )}
        </div>

        {hasCard ? (
          <div className="flex items-center gap-3 rounded-xl border border-gray-200 p-3">
            <div className="h-9 w-12 rounded-md bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center text-white text-[10px] font-bold tracking-wide">
              {(sub.card_brand || 'CARD').toUpperCase().slice(0, 6)}
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">
                {sub.card_brand || 'Card'} •••• {sub.card_last4}
              </p>
              <p className="text-xs text-gray-500">{sub.card_exp ? `Expires ${sub.card_exp}` : 'On file'}</p>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-gray-300 p-4 text-sm text-gray-500">
            No payment method on file yet.
          </div>
        )}

        <p className="text-xs text-gray-400 mt-3">
          {isTestCard
            ? "Beta account — a test card is on file and you won't be charged. Use Activate Billing above to add a real card."
            : 'To update your card or get an invoice, email '}
          {!isTestCard && (
            <a href="mailto:billing@softcake.com" className="text-green-700 font-medium hover:underline">
              billing@softcake.com
            </a>
          )}
          {!isTestCard && '.'}
        </p>
      </div>

      {trialing && (
        <div className="card bg-blue-50 border-blue-200">
          <p className="text-sm text-blue-800">
            You're on a free trial until <b>{fmtDate(renewal)}</b>. You won't be charged until your trial ends — we'll
            email you before that happens.
          </p>
        </div>
      )}
    </div>
  )
}
