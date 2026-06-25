// src/components/settings/BillingTab.jsx
// Billing overview. Live payment processing (Helcim) is not yet enabled, so the
// payment-method / invoices area is shown as "Coming soon". This tab surfaces
// the current plan, price, status, and renewal/trial date.

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'

function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
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
  const trialing = sub.status === 'trialing'

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
            <dd className="text-gray-900">{trialing ? 'Free trial' : sub.status || 'Active'}</dd>
          </div>
          <div className="flex justify-between py-2">
            <dt className="text-gray-500">{trialing ? 'Trial ends' : 'Next renewal'}</dt>
            <dd className="text-gray-900">{fmtDate(sub.trial_ends_at)}</dd>
          </div>
          <div className="flex justify-between py-2">
            <dt className="text-gray-500">Billing contact</dt>
            <dd className="text-gray-900">{user?.email || '—'}</dd>
          </div>
        </dl>
      </div>

      {/* Payment method — coming soon */}
      <div className="card">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-semibold text-gray-900">Payment Method &amp; Invoices</h2>
          <span className="text-[11px] font-medium bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
            Coming soon
          </span>
        </div>
        <p className="text-sm text-gray-600">
          Self-serve card management and invoice history are on the way. While we finish setting up secure payments,
          your billing is handled directly by SoftCake.
        </p>
        <p className="text-sm text-gray-600 mt-2">
          Need to update a card, change your plan, or get a copy of an invoice? Email{' '}
          <a href="mailto:billing@softcake.com" className="text-green-700 font-medium hover:underline">
            billing@softcake.com
          </a>{' '}
          and we'll take care of it.
        </p>
      </div>

      {trialing && (
        <div className="card bg-blue-50 border-blue-200">
          <p className="text-sm text-blue-800">
            You're on a free trial until <b>{fmtDate(sub.trial_ends_at)}</b>. You won't be charged until your trial
            ends — we'll email you before that happens.
          </p>
        </div>
      )}
    </div>
  )
}
