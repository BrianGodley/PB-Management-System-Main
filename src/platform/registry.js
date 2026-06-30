// src/platform/registry.js
//
// Collects all extension manifests and exposes helpers to resolve what's active
// for the current tenant. Core builds nav/routes/slots from these helpers.
//
// Inert by default: with no tenant entitlements, getActiveExtensions([]) returns
// [] and every helper returns nothing — so the app behaves exactly as today.

import pictureBuild from '../extensions/picture-build/manifest'
import formulas from '../extensions/formulas/manifest'

// Bump when the slot/hook/manifest contract changes in a breaking way.
export const PLATFORM_API_VERSION = 1

// Every known extension manifest (whether or not any tenant has it enabled).
const ALL_EXTENSIONS = [pictureBuild, formulas]

export function allExtensions() {
  return ALL_EXTENSIONS
}

// Extensions enabled for the current company AND compatible with this platform.
export function getActiveExtensions(enabledIds = []) {
  return ALL_EXTENSIONS.filter(
    e => enabledIds.includes(e.id) && (e.apiVersion ?? 1) === PLATFORM_API_VERSION
  )
}

// Top-level modules contributed by active extensions (nav + routes).
export function getExtensionModules(active = []) {
  return active.flatMap(e => (e.modules || []).map(m => ({ ...m, extId: e.id })))
}

// UI contributions for a named slot, across active extensions.
export function getSlotContributions(active = [], slotName) {
  return active.flatMap(e => (e.slots?.[slotName] || []).map(s => ({ ...s, extId: e.id })))
}

// Hook loaders for an event, across active extensions.
export function getHookLoaders(active = [], event) {
  return active.flatMap(e => {
    const h = e.hooks?.[event]
    return h ? [{ extId: e.id, load: h }] : []
  })
}
