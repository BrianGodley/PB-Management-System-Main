// src/components/settings/BillingTab.jsx
// Billing overview: current plan + price, billing status, renewal date, and the
// payment method on file. Live self-serve card management (Helcim) is still on
// the way; until then we display the card on file (test card for beta tenants).

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

export default function BillingTab() {
  const { user } = useAuth()
  const [sub, setSub] = useState(null)
  const [packages, setPackages] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ;(async () => {
      setLoading(true)
      const [{ data: s }, { data: pk }] = await Promise.all([
        supabase.rpc('get_my_subscription'),
        supabase.from('packages').select('*'),
      ])
      setSub(s || null)
      setPackages(pk || [])
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
  const isTestCard = hasCard && !sub.has_live_billing

  return (
    <div className="space-y-6">
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
              <p className="text-xs text-gray-500">
                {sub.card_exp ? `Expires ${sub.card_exp}` : 'On file'}
              </p>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-gray-300 p-4 text-sm text-gray-500">
            No payment method on file yet.
          </div>
        )}

        <p className="text-xs text-gray-400 mt-3">
          {isTestCard
            ? "Beta account — a test card is on file and you won't be charged. Self-serve card management is coming soon."
            : 'Self-serve card updates and invoice history are coming soon.'}{' '}
          To change a card, update your plan, or get an invoice, email{' '}
          <a href="mailto:billing@softcake.com" className="text-green-700 font-medium hover:underline">
            billing@softcake.com
          </a>
          .
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
