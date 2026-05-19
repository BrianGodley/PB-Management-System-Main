// ─────────────────────────────────────────────────────────────────────────────
// RateIconsContext — global toggle for the inline rate-edit calculator icons.
//
// Every <RateEditPopover/> reads this context and renders nothing when the
// toggle is OFF, so by default the estimating UI is uncluttered. A user with
// permission can click the "Access/Edit Rates" button in the GpmdBar to flip
// the toggle on and reveal the icons, then click again to hide them.
//
// The choice is persisted to localStorage per browser so it survives reloads
// and route navigation, but it intentionally defaults to FALSE for fresh
// sessions / new browsers.
//
// Permission gating: this context only tracks visibility. Limiting WHO can
// flip the toggle (e.g. admin role) is a follow-up — wrap the toggle button
// itself in a permission check at that point.
// ─────────────────────────────────────────────────────────────────────────────
import { createContext, useCallback, useContext, useEffect, useState } from 'react'

const STORAGE_KEY = 'pbs.showRateIcons'

const RateIconsContext = createContext({
  showRateIcons: false,
  toggleRateIcons: () => {},
  setShowRateIcons: () => {},
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

  // Persist on every change so a refresh keeps the user's choice.
  useEffect(() => {
    try { window.localStorage.setItem(STORAGE_KEY, String(showRateIcons)) } catch { /* ignore quota errors */ }
  }, [showRateIcons])

  const toggleRateIcons = useCallback(() => setShowRateIcons(v => !v), [])

  return (
    <RateIconsContext.Provider value={{ showRateIcons, toggleRateIcons, setShowRateIcons }}>
      {children}
    </RateIconsContext.Provider>
  )
}

export function useRateIcons() {
  return useContext(RateIconsContext)
}
