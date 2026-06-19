// src/platform/hooks.js
//
// Tiny event bus for the extension framework. Core emits namespaced events at
// key moments (e.g. 'estimate.saved'); extensions subscribe via their manifest.
// Core never imports extension code — it only emits.
//
// This file is inert until core starts calling emit(...). Importing it has no
// side effects and does not change app behavior.

const listeners = new Map() // event -> Set<fn>

export function on(event, fn) {
  if (!listeners.has(event)) listeners.set(event, new Set())
  listeners.get(event).add(fn)
  return () => off(event, fn)
}

export function off(event, fn) {
  listeners.get(event)?.delete(fn)
}

// Fire an event. Handlers run sequentially; one failing handler never breaks
// the emitter or the other handlers.
export async function emit(event, context) {
  const set = listeners.get(event)
  if (!set || !set.size) return
  for (const fn of Array.from(set)) {
    try {
      await fn(context)
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(`[platform] hook "${event}" failed:`, e)
    }
  }
}

export function clearAll() {
  listeners.clear()
}
