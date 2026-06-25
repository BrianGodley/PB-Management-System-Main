// src/components/settings/SubscriptionTab.jsx
// Shows the tenant's subscription level + included apps + active add-ons, and a
// button to browse the catalog of available apps for the system.

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { moduleName } from './appsCatalog'
import AppsCatalogModal from './AppsCatalogModal'

function statusBadge(sub) {
  const s = sub?.status
  if (s === 'trialing') {
    const ends = sub?.trial_ends_at ? new Date(sub.trial_ends_at) : null
    const days = ends ? Math.max(0, Math.ceil((ends - Date.now()) / 86400000)) : null
    return {
      text: days != null ? `Free trial — ${days} day${days === 1 ? '' : 's'} left` : 'Free trial',
      cls: 'bg-blue-100 text-blue-700',
    }
  }
  if (s === 'active') return { text: 'Active', cls: 'bg-green-100 text-green-700' }
  if (s === 'past_due') return { text: 'Past due', cls: 'bg-red-100 text-red-700' }
  if (s === 'canceled') return { text: 'Canceled', cls: 'bg-gray-200 text-gray-600' }
  return { text: s || 'Active', cls: 'bg-gray-100 text-gray-600' }
}

export default function SubscriptionTab() {
  const [sub, setSub] = useState(null)
  const [plans, setPlans] = useState([])
  const [packages, setPackages] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCatalog, setShowCatalog] = useState(false)
  const [justRequested, setJustRequested] = useState(false)

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    const [{ data: s }, { data: pl }, { data: pk }] = await Promise.all([
      supabase.rpc('get_my_subscription'),
      supabase.from('plans').select('*'),
      supabase.from('packages').select('*'),
    ])
    setSub(s || null)
    setPlans(pl || [])
    setPackages(pk || [])
    setLoading(false)
  }

  if (loading)
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-700"></div>
      </div>
    )

  if (!sub)
    return (
      <div className="card">
        <p className="text-sm text-gray-600">
          No subscription is attached to this workspace yet. If you just signed up, refresh in a moment, or contact
          SoftCake for help.
        </p>
      </div>
    )

  const badge = statusBadge(sub)
  const includedKeys = sub.plan_module_keys || []
  const activePkgs = packages.filter(p => (sub.package_ids || []).includes(p.id))
  const monthly =
    (sub.price_monthly || 0) + activePkgs.reduce((s, p) => s + (Number(p.price_monthly) || 0), 0)

  return (
    <div className="space-y-6">
      {/* Current plan */}
      <div className="card">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-400 font-medium">Your subscription</p>
            <h2 className="text-xl font-bold text-gray-900 mt-0.5">{sub.plan_name || 'No plan'}</h2>
            <span className={`inline-block mt-2 text-xs font-medium px-2 py-0.5 rounded-full ${badge.cls}`}>
              {badge.text}
            </span>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-gray-900">
              ${monthly.toFixed(0)}
              <span className="text-sm font-normal text-gray-400">/mo</span>
            </div>
            {activePkgs.length > 0 && (
              <p className="text-xs text-gray-400">
                base ${Number(sub.price_monthly || 0).toFixed(0)} + add-ons
              </p>
            )}
          </div>
        </div>

        <button onClick={() => setShowCatalog(true)} className="btn-primary w-full mt-5">
          Browse Available Apps
        </button>
      </div>

      {/* Active add-ons */}
      {activePkgs.length > 0 && (
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-3">Active Add-ons</h3>
          <div className="space-y-2">
            {activePkgs.map(p => (
              <div key={p.id} className="flex items-center justify-between text-sm">
                <span className="text-gray-800">{p.name}</span>
                <span className="text-gray-500">+${Number(p.price_monthly || 0).toFixed(0)}/mo</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Included apps */}
      <div className="card">
        <h3 className="font-semibold text-gray-900 mb-3">Included Apps</h3>
        {includedKeys.length === 0 ? (
          <p className="text-sm text-gray-400">Your plan unlocks all modules.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {includedKeys.map(k => (
              <span key={k} className="text-xs bg-green-50 border border-green-200 text-green-800 px-2.5 py-1 rounded-full">
                {moduleName(k)}
              </span>
            ))}
            {activePkgs.flatMap(p => p.module_keys || []).map(k => (
              <span key={`pk-${k}`} className="text-xs bg-green-50 border border-green-200 text-green-800 px-2.5 py-1 rounded-full">
                {moduleName(k)}
              </span>
            ))}
          </div>
        )}
      </div>

      {justRequested && (
        <div className="bg-blue-50 border border-blue-200 text-blue-800 text-sm px-3 py-2 rounded-lg">
          ✓ Request received. We'll reach out to get your add-on enabled.
        </div>
      )}

      {showCatalog && (
        <AppsCatalogModal
          sub={sub}
          plans={plans}
          packages={packages}
          onClose={() => setShowCatalog(false)}
          onRequested={() => setJustRequested(true)}
        />
      )}
    </div>
  )
}
