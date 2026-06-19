// src/platform/entitlements.jsx
//
// Resolves what the current company can use:
//   • moduleKeys  — the core module keys unlocked by their plan (null = all, the
//                   current behavior, so nothing changes until plans are wired)
//   • activeExtensions — extension manifests enabled for this company
//
// Provide real values later from `companies.plan` + `tenant_extensions`. Until a
// provider supplies them, the default context unlocks everything and enables no
// extensions — i.e. the app behaves exactly as it does today.

import { createContext, useContext } from 'react'
import { getActiveExtensions } from './registry'

const DEFAULT = {
  moduleKeys: null, // null => every module enabled (today's behavior)
  enabledExtensionIds: [],
  activeExtensions: [],
  plan: null,
  billingStatus: 'active',
}

const EntitlementsContext = createContext(DEFAULT)

export function EntitlementsProvider({ value, children }) {
  const enabledExtensionIds = value?.enabledExtensionIds || []
  const resolved = {
    moduleKeys: value?.moduleKeys ?? null,
    enabledExtensionIds,
    activeExtensions: getActiveExtensions(enabledExtensionIds),
    plan: value?.plan ?? null,
    billingStatus: value?.billingStatus ?? 'active',
  }
  return <EntitlementsContext.Provider value={resolved}>{children}</EntitlementsContext.Provider>
}

export function useEntitlements() {
  return useContext(EntitlementsContext)
}

// True if a core module key is unlocked. null moduleKeys => all unlocked.
export function isModuleEnabled(moduleKeys, key) {
  if (!moduleKeys) return true
  return moduleKeys.includes(key)
}
