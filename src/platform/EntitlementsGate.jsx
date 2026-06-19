// src/platform/EntitlementsGate.jsx
//
// Loads the current tenant's unlocked module keys (via the get_my_modules RPC)
// and provides them through EntitlementsProvider so the nav/routes can gate by
// plan. Fail-open: if the RPC is missing or errors (e.g. before the plans SQL
// is applied), moduleKeys stays null = everything enabled (today's behavior).

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { EntitlementsProvider } from './entitlements'

export default function EntitlementsGate({ children }) {
  const { user } = useAuth()
  const [moduleKeys, setModuleKeys] = useState(null) // null = all modules enabled

  useEffect(() => {
    let cancelled = false
    if (!user) {
      setModuleKeys(null)
      return
    }
    ;(async () => {
      // Finish self-serve provisioning if a signup is pending and this user has
      // no tenant yet (covers the email-confirmation flow, where provisioning
      // couldn't run at signup time).
      try {
        const pending = localStorage.getItem('pbs:pendingSignup')
        if (pending) {
          const { data: tid } = await supabase.rpc('my_tenant_id')
          if (!tid) {
            const { company, plan, packages } = JSON.parse(pending)
            await supabase.rpc('provision_my_tenant', {
              p_company: company,
              p_plan: plan || 'tier1',
              p_packages: Array.isArray(packages) ? packages : [],
            })
          }
          localStorage.removeItem('pbs:pendingSignup')
        }
      } catch {
        /* non-fatal */
      }
      const { data, error } = await supabase.rpc('get_my_modules')
      if (cancelled) return
      setModuleKeys(error ? null : Array.isArray(data) ? data : null)
    })()
    return () => {
      cancelled = true
    }
  }, [user?.id])

  return <EntitlementsProvider value={{ moduleKeys }}>{children}</EntitlementsProvider>
}
