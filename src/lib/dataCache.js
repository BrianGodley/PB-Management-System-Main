// ─────────────────────────────────────────────────────────────────────────────
// dataCache — a tiny in-memory, session-lived cache for page data.
//
// React Router unmounts a page when you navigate away and remounts it when you
// return, so every page normally refetches all of its data on every visit.
// This module, together with the useCachedData hook, implements
// stale-while-revalidate: a revisit renders instantly from cache, then refreshes
// quietly in the background.
//
// The cache lives only in memory — a full page reload clears it, which is the
// desired behaviour (a reload should always pull fresh data). Stored values are
// plain JS objects, so things like Map/Set survive (no JSON round-trip).
// ─────────────────────────────────────────────────────────────────────────────

const store = new Map() // key -> { data, fetchedAt }
const inflight = new Map() // key -> Promise (dedupes concurrent fetches)

export function getEntry(key) {
  return store.get(key) || null
}

export function setEntry(key, data) {
  store.set(key, { data, fetchedAt: Date.now() })
}

export function getInflight(key) {
  return inflight.get(key) || null
}

export function setInflight(key, promise) {
  inflight.set(key, promise)
}

export function clearInflight(key) {
  inflight.delete(key)
}

// Drop cached data so the next read refetches. Pass an exact key, or a key
// ending in ':' to clear everything under that prefix (e.g. invalidate('hr:')).
export function invalidate(key) {
  if (key.endsWith(':')) {
    for (const k of [...store.keys()]) {
      if (k.startsWith(key)) store.delete(k)
    }
  } else {
    store.delete(key)
  }
}

// Wipe everything — useful on sign-out so the next user never sees stale data.
export function clearAllCache() {
  store.clear()
  inflight.clear()
}
