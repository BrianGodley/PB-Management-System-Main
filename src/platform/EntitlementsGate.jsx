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
    supabase
      .rpc('get_my_modules')
      .then(({ data, error }) => {
        if (cancelled) return
        // Fail open: any error (incl. RPC not deployed) => all modules enabled.
        setModuleKeys(error ? null : Array.isArray(data) ? data : null)
      })
      .catch(() => {
        if (!cancelled) setModuleKeys(null)
      })
    return () => {
      cancelled = true
    }
  }, [user?.id])

  return <EntitlementsProvider value={{ moduleKeys }}>{children}</EntitlementsProvider>
}
