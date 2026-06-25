// src/components/settings/AppsCatalogModal.jsx
// Catalog of available apps for the system. Shows add-on packages (with their
// included modules, price, and an enable/request action) plus the full list of
// core modules grouped by the tier that unlocks them.

import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { MODULE_INFO, moduleName, PACKAGE_INFO } from './appsCatalog'

export default function AppsCatalogModal({ sub, plans = [], packages = [], onClose, onRequested }) {
  const [busyId, setBusyId] = useState(null)
  const [requested, setRequested] = useState({}) // package_id -> true
  const [err, setErr] = useState('')

  const myRank = sub?.plan_rank || 0
  const myPackages = sub?.package_ids || []
  const sortedPlans = [...plans].sort((a, b) => (a.rank || 0) - (b.rank || 0))

  async function request(pkg) {
    setErr('')
    setBusyId(pkg.id)
    const { error } = await supabase.rpc('request_package', { p_package_id: pkg.id })
    setBusyId(null)
    if (error) return setErr(error.message)
    setRequested(p => ({ ...p, [pkg.id]: true }))
    onRequested?.(pkg.id)
  }

  function pkgState(pkg) {
    if (myPackages.includes(pkg.id)) return 'active'
    if (requested[pkg.id]) return 'requested'
    if ((pkg.requires_tier_rank || 1) > myRank) return 'needs_tier'
    return 'available'
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-start sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-3xl sm:rounded-2xl shadow-2xl max-h-screen sm:max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div
          className="sticky top-0 bg-white border-b px-5 py-4 flex items-center justify-between z-10"
          style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))' }}
        >
          <div>
            <h2 className="text-lg font-bold text-gray-900">Available Apps</h2>
            <p className="text-xs text-gray-500">Add-ons and modules you can enable for your workspace.</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-2xl leading-none px-2">
            ×
          </button>
        </div>

        <div className="p-5 space-y-6">
          {err && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg">{err}</div>
          )}

          {/* Add-on packages */}
          <section>
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Add-on Apps</h3>
            <div className="space-y-3">
              {packages.length === 0 && (
                <p className="text-sm text-gray-400">No add-on apps are available right now.</p>
              )}
              {packages.map(pkg => {
                const state = pkgState(pkg)
                const info = PACKAGE_INFO[pkg.id]
                return (
                  <div key={pkg.id} className="border rounded-xl p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-semibold text-gray-900">{pkg.name}</h4>
                          {state === 'active' && (
                            <span className="text-[11px] font-medium bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                              Active
                            </span>
                          )}
                        </div>
                        {info?.tagline && <p className="text-xs text-green-700 mt-0.5">{info.tagline}</p>}
                        <p className="text-sm text-gray-600 mt-1">{info?.blurb}</p>
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {(pkg.module_keys || []).map(k => (
                            <span key={k} className="text-[11px] bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full">
                              {moduleName(k)}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        {pkg.price_monthly != null && (
                          <div className="text-sm font-semibold text-gray-900">
                            +${Number(pkg.price_monthly).toFixed(0)}
                            <span className="text-xs font-normal text-gray-400">/mo</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="mt-3">
                      {state === 'active' && (
                        <span className="text-sm text-green-700 font-medium">✓ Included in your subscription</span>
                      )}
                      {state === 'requested' && (
                        <span className="text-sm text-blue-700 font-medium">
                          ✓ Requested — we'll reach out to enable it
                        </span>
                      )}
                      {state === 'needs_tier' && (
                        <span className="text-sm text-gray-500">
                          Requires Tier {pkg.requires_tier_rank} or higher
                        </span>
                      )}
                      {state === 'available' && (
                        <button
                          onClick={() => request(pkg)}
                          disabled={busyId === pkg.id}
                          className="btn-primary text-sm px-4 py-1.5"
                        >
                          {busyId === pkg.id ? 'Requesting…' : 'Request to enable'}
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </section>

          {/* Core modules by tier */}
          <section>
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Plans &amp; Included Modules</h3>
            <div className="space-y-3">
              {sortedPlans.map(plan => {
                const isCurrent = plan.id === sub?.plan_id
                // show only the modules this tier ADDS over the prior tier
                const prior = sortedPlans.filter(p => (p.rank || 0) < (plan.rank || 0))
                const priorKeys = new Set(prior.flatMap(p => p.module_keys || []))
                const added = (plan.module_keys || []).filter(k => !priorKeys.has(k))
                return (
                  <div
                    key={plan.id}
                    className={`border rounded-xl p-4 ${isCurrent ? 'border-green-400 bg-green-50' : ''}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-gray-900">{plan.name}</h4>
                        {isCurrent && (
                          <span className="text-[11px] font-medium bg-green-600 text-white px-2 py-0.5 rounded-full">
                            Current plan
                          </span>
                        )}
                      </div>
                      {plan.price_monthly != null && (
                        <div className="text-sm font-semibold text-gray-900">
                          ${Number(plan.price_monthly).toFixed(0)}
                          <span className="text-xs font-normal text-gray-400">/mo</span>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {(plan.rank > 1 ? added : plan.module_keys || []).map(k => (
                        <span
                          key={k}
                          className="text-[11px] bg-white border border-gray-200 text-gray-700 px-2 py-0.5 rounded-full"
                          title={MODULE_INFO[k]?.blurb || ''}
                        >
                          {moduleName(k)}
                        </span>
                      ))}
                      {plan.rank > 1 && <span className="text-[11px] text-gray-400 self-center">+ everything below</span>}
                    </div>
                  </div>
                )
              })}
            </div>
            <p className="text-xs text-gray-400 mt-3">
              To change your plan tier, contact SoftCake — plan changes and add-ons are billed on your next cycle.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
