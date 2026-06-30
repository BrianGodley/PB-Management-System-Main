// src/platform/ExtensionHost.jsx
//
// Generic mount point for extension modules. A single route `/x/:extId/*` in
// App.jsx renders this; it resolves the active extension by id and lazy-loads
// its module component. If the tenant isn't entitled (extension not active),
// it shows a locked notice instead. New extensions need NO App.jsx change.
import { useMemo, Suspense, lazy } from 'react'
import { useParams } from 'react-router-dom'
import { useEntitlements } from './entitlements'
import { getExtensionModules } from './registry'

export default function ExtensionHost() {
  const { extId } = useParams()
  const { activeExtensions } = useEntitlements()
  const mod = useMemo(
    () => getExtensionModules(activeExtensions).find(m => m.extId === extId),
    [activeExtensions, extId]
  )
  // Always call hooks in the same order — compute the lazy component (or null).
  const Comp = useMemo(() => (mod ? lazy(mod.load) : null), [mod])

  if (!Comp) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-8">
        <div className="text-center max-w-md">
          <div className="text-4xl mb-3">🔒</div>
          <h2 className="text-lg font-bold text-gray-900 mb-1">This add-on isn’t enabled</h2>
          <p className="text-sm text-gray-500">
            Enable it from Settings → Apps to start using it.
          </p>
        </div>
      </div>
    )
  }
  return (
    <Suspense fallback={<div className="p-8 text-sm text-gray-400">Loading…</div>}>
      <Comp />
    </Suspense>
  )
}
