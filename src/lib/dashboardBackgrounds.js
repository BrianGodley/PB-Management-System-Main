// src/lib/dashboardBackgrounds.js
// Shared config + helpers for per-module page backgrounds. The user picks a
// background image per module on the Customize page; the Layout applies the
// matching one to the app shell (#app-shell) based on the current route,
// replacing the default grey.

// `dark: true` marks a predominantly dark background (used to pick light nav
// text when the sidebar is Clear and showing the page background).
export const BACKGROUNDS = [
  { id: 'none', label: 'Default (grey)', swatch: '#eceef1', url: null },
  { id: 'waves-blue', label: 'Blue Waves', swatch: '#9cc0ec', url: '/backgrounds/waves-blue.svg' },
  { id: 'green', label: 'Forest', swatch: '#8fbf8c', url: '/backgrounds/green.svg' },
  { id: 'sunset', label: 'Sunset', swatch: '#f3a07e', url: '/backgrounds/sunset.svg' },
  { id: 'aurora', label: 'Aurora', swatch: '#23406a', url: '/backgrounds/aurora.svg', dark: true },
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
  { key: '/portal/subs', label: 'Subs & Vendors' },
  { key: '/customize', label: 'Customize' },
  { key: '/admin', label: 'Admin' },
  { key: '/help', label: 'Help Desk' },
]

// The localStorage cache key for the route→background map.
export const MODULE_BG_LS_KEY = 'pbs:moduleBackgrounds'

// Reserved (non-route) key in the same map that stores the left menu bar color.
export const SIDEBAR_KEY = '__sidebar'

// Reserved key: whether to show icons in the left menu (default true). When
// false, the nav shows text labels only and they shift left.
export const SIDEBAR_ICONS_KEY = '__sidebarIcons'

// Reserved key: left menu font settings { family, size, bold, italic }.
export const SIDEBAR_FONT_KEY = '__sidebarFont'

export const SIDEBAR_FONTS = [
  { id: 'default', label: 'Default', value: '' },
  { id: 'sans', label: 'Sans', value: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif' },
  { id: 'serif', label: 'Serif', value: 'Georgia, "Times New Roman", serif' },
  { id: 'mono', label: 'Mono', value: 'ui-monospace, "SF Mono", Menlo, monospace' },
  { id: 'rounded', label: 'Rounded', value: '"Trebuchet MS", "Segoe UI", Verdana, sans-serif' },
  { id: 'condensed', label: 'Condensed', value: '"Arial Narrow", "Helvetica Neue", sans-serif' },
]

// Sizes are kept modest (≤14px) so the menu never gets oversized.
export const SIDEBAR_FONT_SIZES = [
  { id: 'sm', label: 'S', value: '11px' },
  { id: 'default', label: 'M', value: '' },
  { id: 'md', label: 'L', value: '13px' },
  { id: 'lg', label: 'XL', value: '14px' },
]

// Build an inline style object for the menu text from saved font settings.
export function sidebarFontStyle(font) {
  if (!font || typeof font !== 'object') return undefined
  const s = {}
  if (font.family) s.fontFamily = font.family
  if (font.size) s.fontSize = font.size
  if (font.bold) s.fontWeight = 700
  if (font.italic) s.fontStyle = 'italic'
  return Object.keys(s).length ? s : undefined
}

// Reserved (non-route) key that stores the top header bar color. Undefined in
// the map means "never set" → fall back to the default green (HEADER_DEFAULT).
export const HEADER_KEY = '__header'
export const HEADER_DEFAULT = '#4E7B4C'

// Top header bar color options. The current default green is first; 'Clear'
// makes the bar transparent (page background shows through). Header text
// auto-contrasts to the chosen color (see headerNavColor).
export const HEADER_COLORS = [
  { id: 'default', label: 'Default (green)', value: HEADER_DEFAULT },
  { id: 'clear', label: 'Clear', value: null },
  { id: 'white', label: 'White', value: '#ffffff' },
  { id: 'sand', label: 'Sand', value: '#f7f1e6' },
  { id: 'blue', label: 'Blue', value: '#2563eb' },
  { id: 'slate', label: 'Slate', value: '#334155' },
  { id: 'graphite', label: 'Graphite', value: '#475569' },
  { id: 'forest', label: 'Forest', value: '#3a5038' },
  { id: 'navy', label: 'Navy', value: '#1e3a5f' },
  { id: 'charcoal', label: 'Charcoal', value: '#1f2937' },
]

// Left menu bar color options. 'Clear' keeps the transparent look; the rest
// span light → dark. Nav text auto-contrasts to the chosen color (see
// sidebarNavColor below), so dark options stay readable.
export const SIDEBAR_COLORS = [
  { id: 'clear', label: 'Clear', value: null },
  { id: 'white', label: 'White', value: '#ffffff' },
  { id: 'slate', label: 'Slate', value: '#eef1f5' },
  { id: 'blue', label: 'Blue', value: '#e6effb' },
  { id: 'green', label: 'Green', value: '#e9f3e8' },
  { id: 'sand', label: 'Sand', value: '#f7f1e6' },
  { id: 'graphite', label: 'Graphite', value: '#475569' },
  { id: 'charcoal', label: 'Charcoal', value: '#1f2937' },
  { id: 'forest', label: 'Forest', value: '#3a5038' },
  { id: 'navy', label: 'Navy', value: '#1e3a5f' },
]

// Relative luminance (0 = black, 1 = white) of a #rrggbb color.
export function luminance(hex) {
  if (!hex || typeof hex !== 'string' || hex[0] !== '#' || hex.length < 7) return 1
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

// Auto nav text color for a sidebar background: white on dark, grey on mid,
// near-black on light. Returns { text, dark }. dark drives hover/active tints.
export function sidebarNavColor(hex) {
  if (!hex) return { text: undefined, dark: false }
  const L = luminance(hex)
  const text = L < 0.4 ? '#ffffff' : L < 0.72 ? '#374151' : '#111827'
  return { text, dark: L < 0.5 }
}

// Auto header text color for a header background: white on dark/medium, near
// black on light. Threshold is higher than the sidebar's so the default green
// (#4E7B4C) keeps white text. Returns { text, dark }.
export function headerNavColor(hex) {
  if (!hex) return { text: undefined, dark: false }
  const L = luminance(hex)
  const text = L < 0.6 ? '#ffffff' : '#1f2937'
  return { text, dark: L < 0.6 }
}

// The background id that the current route's module maps to.
export function bgIdForPath(pathname, map) {
  const key = matchModuleKey(pathname)
  return (key && map?.[key]) || 'none'
}

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
