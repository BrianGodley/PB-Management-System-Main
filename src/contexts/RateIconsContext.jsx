// ─────────────────────────────────────────────────────────────────────────────
// RateIconsContext — global toggle for the inline rate-edit calculator icons.
//
// Every <RateEditPopover/> reads this context and renders nothing when the
// toggle is OFF, so by default the estimating UI is uncluttered. A user with
// the `clients_access_edit_rates` permission can click the "Access/Edit Rates"
// button in the GpmdBar to flip the toggle on and reveal the icons, then click
// again to hide them.
//
// The choice is persisted to localStorage per browser so it survives reloads
// and route navigation, but it intentionally defaults to FALSE for fresh
// sessions / new browsers.
//
// Permission gating:
//   - We fetch the current user's `user_permissions.clients_access_edit_rates`
//     once on mount. If true (or the user is an admin/super_admin) the toggle
//     button shows; otherwise it's hidden and the icons stay locked off.
//   - GpmdBar reads `canAccessRates` to decide whether to render the button.
// ─────────────────────────────────────────────────────────────────────────────
import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const STORAGE_KEY = 'pbs.showRateIcons'

const RateIconsContext = createContext({
  showRateIcons: false,
  toggleRateIcons: () => {},
  setShowRateIcons: () => {},
  canAccessRates: false,
})

export function RateIconsProvider({ children }) {
  // Lazy-init from localStorage. Falls back to false (icons hidden) if absent
  // or if running where window is not defined (SSR safety, harmless in CSR).
  const [showRateIcons, setShowRateIcons] = useState(() => {
    if (typeof window === 'undefined') return false
    try {
      return window.localStorage.getItem(STORAGE_KEY) === 'true'
    } catch {
      return false
    }
  })

  // Permission flag — fetched once after auth, then cached for the session.
  // Defaults to false so unauthorized users never see the toggle.
  const [canAccessRates, setCanAccessRates] = useState(false)

  // Persist visibility choice on every change so a refresh keeps it.
  useEffect(() => {
    try { window.localStorage.setItem(STORAGE_KEY, String(showRateIcons)) } catch { /* ignore quota errors */ }
  }, [showRateIcons])

  // Fetch the current user's permission row on mount + whenever auth changes.
  // Admins/super_admins always get access regardless of the explicit flag.
  useEffect(() => {
    let alive = true
    async function loadPerm() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!alive || !user) { setCanAccessRates(false); return }

      // Role check first — admins always have access
      const { data: profile } = await supabase
        .from('profiles').select('role').eq('id', user.id).single()
      if (!alive) return
      if (profile && (profile.role === 'admin' || profile.role === 'super_admin')) {
        setCanAccessRates(true)
        return
      }

      // Otherwise check the explicit permission flag
      const { data: perms } = await supabase
        .from('user_permissions').select('clients_access_edit_rates').eq('user_id', user.id).single()
      if (alive) setCanAccessRates(perms?.clients_access_edit_rates === true)
    }
    loadPerm()
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => loadPerm())
    return () => { alive = false; subscription.unsubscribe() }
  }, [])

  // If the user loses permission mid-session, force the icons off so nothing
  // they shouldn't see lingers on screen.
  useEffect(() => {
    if (!canAccessRates && showRateIcons) setShowRateIcons(false)
  }, [canAccessRates, showRateIcons])

  const toggleRateIcons = useCallback(() => {
    if (!canAccessRates) return  // no-op when not permitted (defence in depth)
    setShowRateIcons(v => !v)
  }, [canAccessRates])

  return (
    <RateIconsContext.Provider value={{ showRateIcons, toggleRateIcons, setShowRateIcons, canAccessRates }}>
      {children}
    </RateIconsContext.Provider>
  )
}

export function useRateIcons() {
  return useContext(RateIconsContext)
}
