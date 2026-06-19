// src/lib/storageMigration.js
//
// One-time rename of legacy `pbs:` / `pb:` localStorage keys to the `softcake:`
// namespace. Runs once at app start (main.jsx). Each persistent key is copied to
// its new name only if the new name doesn't already exist, then the old key is
// removed — so no user data (saved appearance, bids sort, in-flight signup
// intent) is lost across the rebrand. Transient session-only guards aren't
// migrated; losing them is harmless.

const LEGACY_LOCAL_KEYS = [
  ['pbs:moduleBackgrounds', 'softcake:moduleBackgrounds'],
  ['pbs:bids:sortCol', 'softcake:bids:sortCol'],
  ['pbs:bids:sortDir', 'softcake:bids:sortDir'],
  ['pbs:pendingSignup', 'softcake:pendingSignup'],
]

export function migrateLegacyStorage() {
  try {
    for (const [oldKey, newKey] of LEGACY_LOCAL_KEYS) {
      const oldVal = localStorage.getItem(oldKey)
      if (oldVal === null) continue
      if (localStorage.getItem(newKey) === null) localStorage.setItem(newKey, oldVal)
      localStorage.removeItem(oldKey)
    }
  } catch {
    // localStorage unavailable (private mode / SSR) — nothing to migrate.
  }
}
