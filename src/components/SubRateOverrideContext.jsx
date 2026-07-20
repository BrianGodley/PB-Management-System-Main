// One-off subcontractor rate adjustments, scoped to a single estimate.
//
// "Edit Rates" (RateEditPopover) writes the MASTER rate and changes pricing
// everywhere it's used. Subcontractor pricing often needs a different number
// for just this job — a quote that came in high, a favour on one project —
// without touching the global rate.
//
// A module provides this context with its own saved override map (kept in the
// module's state, so it travels with the estimate). RateEditPopover reads it
// and, for subcontractor_rates only, offers "Use for this estimate only".
//
// Shape: overrides = { [rateName]: number }
import { createContext, useContext } from 'react'

export const SubRateOverrideContext = createContext(null)

export function SubRateOverrideProvider({ overrides, setOverride, children }) {
  return (
    <SubRateOverrideContext.Provider value={{ overrides: overrides || {}, setOverride }}>
      {children}
    </SubRateOverrideContext.Provider>
  )
}

export function useSubRateOverrides() {
  return useContext(SubRateOverrideContext)
}

// Resolve a subcontractor rate: this estimate's override wins over the master
// rate, which wins over the code default. Used by module calc engines.
export function resolveSubRate(overrides, subRates, name, fallback) {
  const o = overrides ? overrides[name] : undefined
  if (o !== undefined && o !== null && o !== '' && Number.isFinite(Number(o))) return Number(o)
  const g = subRates ? subRates[name] : undefined
  return g === undefined || g === null ? fallback : g
}
