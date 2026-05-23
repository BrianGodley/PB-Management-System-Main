// ─────────────────────────────────────────────────────────────────────────────
// useCachedData — stale-while-revalidate data hook.
//
//   const { data, loading, refreshing, error, refresh } =
//     useCachedData('hr:all', fetchHrData)
//
// • First visit (cache empty): loading = true until the fetch resolves.
// • Return visit (cache warm): data is returned immediately and loading = false.
//   If the cached copy is older than STALE_MS a background refresh runs
//   (refreshing = true) to quietly pick up any changes.
// • refresh(): force a fresh refetch — call it after a mutation/save.
//
// `fetcher` is an async function returning the data to cache. Its identity may
// change every render; it is held in a ref so the effect only re-runs when the
// `key` changes.
// ─────────────────────────────────────────────────────────────────────────────
import { useCallback, useEffect, useRef, useState } from 'react'
import { getEntry, setEntry, getInflight, setInflight, clearInflight } from './dataCache'

// How stale a cached entry may be before a background refresh fires on mount.
// Revisiting within 30s skips the refetch entirely; after that we refresh
// quietly without ever showing a spinner.
const STALE_MS = 30000

export function useCachedData(key, fetcher) {
  const cached = getEntry(key)
  const [data, setData] = useState(cached ? cached.data : null)
  const [loading, setLoading] = useState(!cached)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState(null)

  // Hold the latest fetcher without making it an effect dependency.
  const fetcherRef = useRef(fetcher)
  fetcherRef.current = fetcher

  // Track mount status so a fetch that resolves after unmount never calls
  // setState on a dead component (the result still populates the cache).
  const mountedRef = useRef(true)
  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  const run = useCallback(
    async ({ background = false, force = false } = {}) => {
      if (background) setRefreshing(true)
      else setLoading(true)

      // Dedupe: reuse an in-flight fetch for this key unless we're forcing a
      // fresh one (e.g. immediately after a save, where stale data won't do).
      let promise = force ? null : getInflight(key)
      if (!promise) {
        promise = Promise.resolve().then(() => fetcherRef.current())
        setInflight(key, promise)
      }

      try {
        const result = await promise
        setEntry(key, result)
        if (mountedRef.current) {
          setData(result)
          setError(null)
        }
        return result
      } catch (e) {
        if (mountedRef.current) setError(e)
        return null
      } finally {
        clearInflight(key)
        if (mountedRef.current) {
          setLoading(false)
          setRefreshing(false)
        }
      }
    },
    [key]
  )

  useEffect(() => {
    const entry = getEntry(key)
    if (!entry) {
      run({ background: false }) // cold: foreground load with spinner
    } else {
      setData(entry.data)
      setLoading(false)
      if (Date.now() - entry.fetchedAt > STALE_MS) {
        run({ background: true }) // warm but stale: silent background refresh
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  const refresh = useCallback(() => run({ background: true, force: true }), [run])

  return { data, loading, refreshing, error, refresh }
}
