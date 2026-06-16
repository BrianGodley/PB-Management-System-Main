// src/lib/dashboardBackgrounds.js
// Shared config + helpers for per-module page backgrounds. The user picks a
// background image per module on the Customize page; the Layout applies the
// matching one to the app shell (#app-shell) based on the current route,
// replacing the default grey.

export const BACKGROUNDS = [
  { id: 'none', label: 'Default (grey)', swatch: '#eceef1', url: null },
  { id: 'waves-blue', label: 'Blue Waves', swatch: '#9cc0ec', url: '/backgrounds/waves-blue.svg' },
  { id: 'green', label: 'Forest', swatch: '#8fbf8c', url: '/backgrounds/green.svg' },
  { id: 'sunset', label: 'Sunset', swatch: '#f3a07e', url: '/backgrounds/sunset.svg' },
  { id: 'aurora', label: 'Aurora', swatch: '#23406a', url: '/backgrounds/aurora.svg' },
  { id: 'mesh', label: 'Mesh', swatch: '#e7ebf2', url: '/backgrounds/mesh.svg' },
]

// The customizable modules (main app sections). `key` is the route prefix used
// to match the current pathname.
export const CUSTOMIZE_MODULES = [
  { key: '/', label: 'Dashboard' },
  { key: '/org-chart', label: 'Org Chart' },
  { key: '/hr', label: 'HR / Employees' },
  { key: '/training', label: 'Training' },
  { key: '/contacts', label: 'Contacts' },
  { key: '/clients', label: 'Opportunities' },
  { key: '/edocuments', label: 'Documents' },
  { key: '/accounting', label: 'Accounting' },
  { key: '/collections', label: 'Weekly FP' },
  { key: '/design', label: 'Design' },
  { key: '/bids', label: 'Bids' },
  { key: '/jobs', label: 'Jobs' },
  { key: '/equipment-tracking', label: 'Equipment' },
  { key: '/statistics', label: 'Statistics' },
]

// The localStorage cache key for the route→background map.
export const MODULE_BG_LS_KEY = 'pbs:moduleBackgrounds'

export function readModuleBackgrounds() {
  try {
    const v = JSON.parse(localStorage.getItem(MODULE_BG_LS_KEY) || '{}')
    return v && typeof v === 'object' ? v : {}
  } catch {
    return {}
  }
}

// Which module key owns a given pathname (longest matching prefix; '/' exact).
export function matchModuleKey(pathname) {
  let best = null
  for (const m of CUSTOMIZE_MODULES) {
    if (m.key === '/') {
      if (pathname === '/') return '/'
      continue
    }
    if (pathname === m.key || pathname.startsWith(m.key + '/') || pathname === m.key) {
      if (!best || m.key.length > best.length) best = m.key
    } else if (pathname.startsWith(m.key)) {
      if (!best || m.key.length > best.length) best = m.key
    }
  }
  return best
}

// Paint (or clear) the app-shell background for a given background id.
export function applyAppBackground(id) {
  const opt = BACKGROUNDS.find(b => b.id === id)
  const el = document.getElementById('app-shell') || document.body
  if (!el) return
  const s = el.style
  if (opt?.url) {
    s.backgroundImage = `url('${opt.url}')`
    s.backgroundSize = 'cover'
    s.backgroundPosition = 'center'
    s.backgroundRepeat = 'no-repeat'
  } else {
    s.backgroundImage = ''
    s.backgroundSize = ''
    s.backgroundPosition = ''
    s.backgroundRepeat = ''
  }
}

// Convenience: apply whatever background the current route's module maps to.
export function applyBackgroundForPath(pathname, map) {
  const key = matchModuleKey(pathname)
  applyAppBackground((key && map?.[key]) || 'none')
}
