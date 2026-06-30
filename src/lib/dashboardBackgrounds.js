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
  // Light gradients
  { id: 'lavender', label: 'Lavender', swatch: '#d8c8f3', url: '/backgrounds/lavender.svg' },
  { id: 'peach', label: 'Peach', swatch: '#f7c9a6', url: '/backgrounds/peach.svg' },
  { id: 'sky', label: 'Sky', swatch: '#bfe0f5', url: '/backgrounds/sky.svg' },
  { id: 'mint', label: 'Mint', swatch: '#bfe8d2', url: '/backgrounds/mint.svg' },
  { id: 'sunrise', label: 'Sunrise', swatch: '#ffb98a', url: '/backgrounds/sunrise.svg' },
  { id: 'rose-gold', label: 'Rose Gold', swatch: '#f0c5b9', url: '/backgrounds/rose-gold.svg' },
  // Light patterns
  { id: 'graphite-grid', label: 'Graphite Grid', swatch: '#e6ebf2', url: '/backgrounds/graphite-grid.svg' },
  { id: 'dots', label: 'Dots', swatch: '#dde6f0', url: '/backgrounds/dots.svg' },
  { id: 'crosshatch', label: 'Crosshatch', swatch: '#e7eaef', url: '/backgrounds/crosshatch.svg' },
  { id: 'sand-topo', label: 'Sand Topo', swatch: '#ecdcbb', url: '/backgrounds/sand-topo.svg' },
  { id: 'honeycomb', label: 'Honeycomb', swatch: '#d4e6f7', url: '/backgrounds/honeycomb.svg' },
  // Dark gradients / scenes
  { id: 'slate', label: 'Slate', swatch: '#2c3542', url: '/backgrounds/slate.svg', dark: true },
  { id: 'ocean', label: 'Ocean', swatch: '#0b556f', url: '/backgrounds/ocean.svg', dark: true },
  { id: 'midnight', label: 'Midnight', swatch: '#101a3c', url: '/backgrounds/midnight.svg', dark: true },
  { id: 'carbon', label: 'Carbon', swatch: '#1d2128', url: '/backgrounds/carbon.svg', dark: true },
  { id: 'plum', label: 'Plum', swatch: '#3a1c46', url: '/backgrounds/plum.svg', dark: true },
  { id: 'emerald-night', label: 'Emerald Night', swatch: '#103f30', url: '/backgrounds/emerald-night.svg', dark: true },
  // More light patterns
  { id: 'chevron', label: 'Chevron', swatch: '#cfe2f3', url: '/backgrounds/chevron.svg' },
  { id: 'triangles', label: 'Triangles', swatch: '#cfe0f2', url: '/backgrounds/triangles.svg' },
  { id: 'diagonal-stripes', label: 'Diagonal Stripes', swatch: '#d8e6f3', url: '/backgrounds/diagonal-stripes.svg' },
  { id: 'plus-grid', label: 'Plus Grid', swatch: '#dfe4ee', url: '/backgrounds/plus-grid.svg' },
  { id: 'waves-soft', label: 'Soft Waves', swatch: '#cfe6f5', url: '/backgrounds/waves-soft.svg' },
  // Multi-colored
  { id: 'rainbow-pastel', label: 'Rainbow Pastel', swatch: '#ffe7b8', url: '/backgrounds/rainbow-pastel.svg' },
  { id: 'holographic', label: 'Holographic', swatch: '#e0d3ff', url: '/backgrounds/holographic.svg' },
  { id: 'cotton-candy', label: 'Cotton Candy', swatch: '#ffc2e2', url: '/backgrounds/cotton-candy.svg' },
  { id: 'citrus', label: 'Citrus', swatch: '#cdeeb0', url: '/backgrounds/citrus.svg' },
  { id: 'prism', label: 'Prism', swatch: '#d6f3c8', url: '/backgrounds/prism.svg' },
  // Scenic
  { id: 'mountains', label: 'Mountains', swatch: '#9fb4d6', url: '/backgrounds/mountains.svg' },
  { id: 'beach', label: 'Beach', swatch: '#6fd3df', url: '/backgrounds/beach.svg' },
  { id: 'desert', label: 'Desert', swatch: '#e2a567', url: '/backgrounds/desert.svg' },
  { id: 'tropical-sea', label: 'Tropical Sea', swatch: '#28b6c9', url: '/backgrounds/tropical-sea.svg' },
  { id: 'balloons', label: 'Hot Air Balloons', swatch: '#9ed8ff', url: '/backgrounds/balloons.svg' },
  { id: 'cityscape', label: 'Cityscape', swatch: '#cdbbe0', url: '/backgrounds/cityscape.svg' },
  { id: 'townscape', label: 'Townscape', swatch: '#bcd99b', url: '/backgrounds/townscape.svg' },
  { id: 'meadow', label: 'Meadow', swatch: '#8fcf72', url: '/backgrounds/meadow.svg' },
]

// The customizable modules (main app sections). `key` is the route prefix used
// to match the current pathname.
export const CUSTOMIZE_MODULES = [
  { key: '/', label: 'Dashboard' },
  { key: '/org-chart', label: 'Org Chart' },
  { key: '/hr', label: 'HR / Employees' },
  { key: '/training', label: 'Training' },
  { key: '/contacts', label: 'Marketing' },
  { key: '/clients', label: 'Sales' },
  { key: '/edocuments', label: 'Documents' },
  { key: '/workflows', label: 'Workflows' },
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
export const MODULE_BG_LS_KEY = 'softcake:moduleBackgrounds'

// Reserved (non-route) key in the same map that stores the left menu bar color.
export const SIDEBAR_KEY = '__sidebar'

// Reserved key: whether to show icons in the left menu (default true). When
// false, the nav shows text labels only and they shift left.
export const SIDEBAR_ICONS_KEY = '__sidebarIcons'

// Reserved key: left menu font settings { family, size, bold, italic }.
export const SIDEBAR_FONT_KEY = '__sidebarFont'

// Reserved key: desktop menu position — 'left' | 'top' | 'right' | 'bottom'.
// Default 'left' (the classic sidebar). Mobile always uses its bottom dock.
export const MENU_POS_KEY = '__menuPos'
export const MENU_POSITIONS = [
  { id: 'left', label: 'Left', icon: '⬅️' },
  { id: 'top', label: 'Top', icon: '⬆️' },
  { id: 'right', label: 'Right', icon: '➡️' },
  { id: 'bottom', label: 'Bottom', icon: '⬇️' },
]

// Reserved key: user-defined menu groups. An array of
//   { id, name, items: [<path>, ...] }
// Items not listed in any group render on their own (flat). Empty default =
// no custom grouping (the menu uses its built-in layout per position).
export const MENU_GROUPS_KEY = '__menuGroups'

// Canonical menu items (path + label) for the grouping editor. The paths match
// Layout's navItems so a group's saved paths resolve to the real nav entries.
export const MENU_ITEMS = [
  { path: '/', label: 'Dashboard' },
  { path: '/org-chart', label: 'Org Chart' },
  { path: '/hr', label: 'HR' },
  { path: '/training', label: 'Training' },
  { path: '/contacts', label: 'Marketing' },
  { path: '/clients', label: 'Sales' },
  { path: '/edocuments', label: 'Documents' },
  { path: '/workflows', label: 'Workflows' },
  { path: '/accounting', label: 'Accounting' },
  { path: '/collections', label: 'Weekly FP' },
  { path: '/design', label: 'Design' },
  { path: '/bids', label: 'Bids' },
  { path: '/jobs', label: 'Jobs' },
  { path: '/equipment-tracking', label: 'Equipment' },
  { path: '/portal/subs', label: 'Subs & Vendors' },
  { path: '/statistics', label: 'Statistics' },
]

// Build a render structure from nav items + user groups. Returns an ordered
// list of entries: ungrouped items first (each as { type:'single', item }),
// then each non-empty group (as { type:'group', id, label, items:[...] }) in
// the order the user created them. `items` are the caller's nav objects
// (keyed by `.path`), so icons/labels come straight from the live nav.
export function buildMenuStructure(items, groups) {
  const byPath = Object.fromEntries((items || []).map(i => [i.path, i]))
  const grouped = new Set()
  const groupEntries = []
  for (const g of groups || []) {
    const resolved = (g.items || [])
      .map(p => { grouped.add(p); return byPath[p] })
      .filter(Boolean)
    if (resolved.length) groupEntries.push({ type: 'group', id: g.id, label: g.name, items: resolved })
  }
  const singles = (items || [])
    .filter(i => !grouped.has(i.path))
    .map(i => ({ type: 'single', item: i }))
  return [...singles, ...groupEntries]
}

// A broad set of the fonts that ship with Microsoft Office / Windows, in the
// same spirit as Word's font menu. NOTE: a font only renders if it's actually
// installed on the viewer's device (web apps can't bundle proprietary Office
// fonts) — each entry includes a generic fallback so text stays readable.
// Pure symbol fonts (Wingdings, Webdings, Marlett, Symbol) are intentionally
// omitted since they'd turn menu labels into glyphs.
export const SIDEBAR_FONTS = [
  { id: 'default', label: 'Default', value: '' },
  { id: 'system', label: 'System Sans', value: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif' },
  { id: 'agency', label: 'Agency FB', value: '"Agency FB", sans-serif' },
  { id: 'algerian', label: 'Algerian', value: 'Algerian, serif' },
  { id: 'arial', label: 'Arial', value: 'Arial, Helvetica, sans-serif' },
  { id: 'arial-black', label: 'Arial Black', value: '"Arial Black", Gadget, sans-serif' },
  { id: 'arial-narrow', label: 'Arial Narrow', value: '"Arial Narrow", Arial, sans-serif' },
  { id: 'bahnschrift', label: 'Bahnschrift', value: 'Bahnschrift, "DIN", sans-serif' },
  { id: 'baskerville', label: 'Baskerville Old Face', value: '"Baskerville Old Face", Baskerville, serif' },
  { id: 'bauhaus', label: 'Bauhaus 93', value: '"Bauhaus 93", sans-serif' },
  { id: 'bell', label: 'Bell MT', value: '"Bell MT", serif' },
  { id: 'berlin', label: 'Berlin Sans FB', value: '"Berlin Sans FB", sans-serif' },
  { id: 'bernard', label: 'Bernard MT Condensed', value: '"Bernard MT Condensed", serif' },
  { id: 'bodoni', label: 'Bodoni MT', value: '"Bodoni MT", "Bodoni 72", serif' },
  { id: 'book-antiqua', label: 'Book Antiqua', value: '"Book Antiqua", Palatino, serif' },
  { id: 'bookman', label: 'Bookman Old Style', value: '"Bookman Old Style", serif' },
  { id: 'bradley', label: 'Bradley Hand ITC', value: '"Bradley Hand ITC", "Bradley Hand", cursive' },
  { id: 'britannic', label: 'Britannic Bold', value: '"Britannic Bold", sans-serif' },
  { id: 'broadway', label: 'Broadway', value: 'Broadway, serif' },
  { id: 'brush-script', label: 'Brush Script MT', value: '"Brush Script MT", cursive' },
  { id: 'calibri', label: 'Calibri', value: 'Calibri, Candara, Segoe, sans-serif' },
  { id: 'californian', label: 'Californian FB', value: '"Californian FB", serif' },
  { id: 'calisto', label: 'Calisto MT', value: '"Calisto MT", serif' },
  { id: 'cambria', label: 'Cambria', value: 'Cambria, Georgia, serif' },
  { id: 'candara', label: 'Candara', value: 'Candara, Calibri, sans-serif' },
  { id: 'castellar', label: 'Castellar', value: 'Castellar, serif' },
  { id: 'centaur', label: 'Centaur', value: 'Centaur, serif' },
  { id: 'century', label: 'Century', value: 'Century, serif' },
  { id: 'century-gothic', label: 'Century Gothic', value: '"Century Gothic", sans-serif' },
  { id: 'century-school', label: 'Century Schoolbook', value: '"Century Schoolbook", serif' },
  { id: 'chiller', label: 'Chiller', value: 'Chiller, cursive' },
  { id: 'colonna', label: 'Colonna MT', value: '"Colonna MT", serif' },
  { id: 'comic', label: 'Comic Sans MS', value: '"Comic Sans MS", "Comic Sans", cursive' },
  { id: 'consolas', label: 'Consolas', value: 'Consolas, "Lucida Console", monospace' },
  { id: 'constantia', label: 'Constantia', value: 'Constantia, Georgia, serif' },
  { id: 'cooper', label: 'Cooper Black', value: '"Cooper Black", serif' },
  { id: 'copperplate', label: 'Copperplate Gothic', value: '"Copperplate Gothic", "Copperplate", serif' },
  { id: 'corbel', label: 'Corbel', value: 'Corbel, sans-serif' },
  { id: 'courier', label: 'Courier New', value: '"Courier New", Courier, monospace' },
  { id: 'curlz', label: 'Curlz MT', value: '"Curlz MT", cursive' },
  { id: 'ebrima', label: 'Ebrima', value: 'Ebrima, sans-serif' },
  { id: 'edwardian', label: 'Edwardian Script ITC', value: '"Edwardian Script ITC", cursive' },
  { id: 'elephant', label: 'Elephant', value: 'Elephant, serif' },
  { id: 'engravers', label: 'Engravers MT', value: '"Engravers MT", serif' },
  { id: 'eras', label: 'Eras ITC', value: '"Eras Medium ITC", "Eras ITC", sans-serif' },
  { id: 'felix', label: 'Felix Titling', value: '"Felix Titling", serif' },
  { id: 'footlight', label: 'Footlight MT', value: '"Footlight MT Light", serif' },
  { id: 'forte', label: 'Forte', value: 'Forte, cursive' },
  { id: 'franklin', label: 'Franklin Gothic', value: '"Franklin Gothic Medium", "Franklin Gothic", sans-serif' },
  { id: 'freestyle', label: 'Freestyle Script', value: '"Freestyle Script", cursive' },
  { id: 'french', label: 'French Script MT', value: '"French Script MT", cursive' },
  { id: 'gabriola', label: 'Gabriola', value: 'Gabriola, cursive' },
  { id: 'gadugi', label: 'Gadugi', value: 'Gadugi, sans-serif' },
  { id: 'garamond', label: 'Garamond', value: 'Garamond, "Times New Roman", serif' },
  { id: 'georgia', label: 'Georgia', value: 'Georgia, "Times New Roman", serif' },
  { id: 'gigi', label: 'Gigi', value: 'Gigi, cursive' },
  { id: 'gill-sans', label: 'Gill Sans MT', value: '"Gill Sans MT", "Gill Sans", sans-serif' },
  { id: 'gloucester', label: 'Gloucester MT', value: '"Gloucester MT Extra Condensed", serif' },
  { id: 'goudy', label: 'Goudy Old Style', value: '"Goudy Old Style", serif' },
  { id: 'goudy-stout', label: 'Goudy Stout', value: '"Goudy Stout", serif' },
  { id: 'haettenschweiler', label: 'Haettenschweiler', value: 'Haettenschweiler, sans-serif' },
  { id: 'harlow', label: 'Harlow Solid Italic', value: '"Harlow Solid Italic", cursive' },
  { id: 'harrington', label: 'Harrington', value: 'Harrington, cursive' },
  { id: 'helvetica', label: 'Helvetica', value: '"Helvetica Neue", Helvetica, Arial, sans-serif' },
  { id: 'high-tower', label: 'High Tower Text', value: '"High Tower Text", serif' },
  { id: 'impact', label: 'Impact', value: 'Impact, Haettenschweiler, sans-serif' },
  { id: 'imprint', label: 'Imprint MT Shadow', value: '"Imprint MT Shadow", serif' },
  { id: 'informal', label: 'Informal Roman', value: '"Informal Roman", cursive' },
  { id: 'ink-free', label: 'Ink Free', value: '"Ink Free", cursive' },
  { id: 'jokerman', label: 'Jokerman', value: 'Jokerman, cursive' },
  { id: 'juice', label: 'Juice ITC', value: '"Juice ITC", cursive' },
  { id: 'kristen', label: 'Kristen ITC', value: '"Kristen ITC", cursive' },
  { id: 'kunstler', label: 'Kunstler Script', value: '"Kunstler Script", cursive' },
  { id: 'leelawadee', label: 'Leelawadee', value: 'Leelawadee, sans-serif' },
  { id: 'lucida-bright', label: 'Lucida Bright', value: '"Lucida Bright", serif' },
  { id: 'lucida-calligraphy', label: 'Lucida Calligraphy', value: '"Lucida Calligraphy", cursive' },
  { id: 'lucida-console', label: 'Lucida Console', value: '"Lucida Console", monospace' },
  { id: 'lucida-fax', label: 'Lucida Fax', value: '"Lucida Fax", serif' },
  { id: 'lucida-hand', label: 'Lucida Handwriting', value: '"Lucida Handwriting", cursive' },
  { id: 'lucida-sans', label: 'Lucida Sans', value: '"Lucida Sans", "Lucida Sans Unicode", sans-serif' },
  { id: 'magneto', label: 'Magneto', value: 'Magneto, cursive' },
  { id: 'maiandra', label: 'Maiandra GD', value: '"Maiandra GD", sans-serif' },
  { id: 'malgun', label: 'Malgun Gothic', value: '"Malgun Gothic", sans-serif' },
  { id: 'matura', label: 'Matura MT Script Capitals', value: '"Matura MT Script Capitals", cursive' },
  { id: 'ms-sans-serif', label: 'Microsoft Sans Serif', value: '"Microsoft Sans Serif", sans-serif' },
  { id: 'mistral', label: 'Mistral', value: 'Mistral, cursive' },
  { id: 'modern20', label: 'Modern No. 20', value: '"Modern No. 20", serif' },
  { id: 'monotype-corsiva', label: 'Monotype Corsiva', value: '"Monotype Corsiva", cursive' },
  { id: 'mono', label: 'Monospace', value: 'ui-monospace, "SF Mono", Menlo, monospace' },
  { id: 'mv-boli', label: 'MV Boli', value: '"MV Boli", cursive' },
  { id: 'niagara', label: 'Niagara', value: '"Niagara Solid", serif' },
  { id: 'nirmala', label: 'Nirmala UI', value: '"Nirmala UI", sans-serif' },
  { id: 'ocr-a', label: 'OCR A Extended', value: '"OCR A Extended", monospace' },
  { id: 'old-english', label: 'Old English Text MT', value: '"Old English Text MT", serif' },
  { id: 'onyx', label: 'Onyx', value: 'Onyx, serif' },
  { id: 'palatino', label: 'Palatino Linotype', value: '"Palatino Linotype", "Book Antiqua", Palatino, serif' },
  { id: 'papyrus', label: 'Papyrus', value: 'Papyrus, fantasy' },
  { id: 'parchment', label: 'Parchment', value: 'Parchment, cursive' },
  { id: 'perpetua', label: 'Perpetua', value: 'Perpetua, serif' },
  { id: 'playbill', label: 'Playbill', value: 'Playbill, serif' },
  { id: 'poor-richard', label: 'Poor Richard', value: '"Poor Richard", serif' },
  { id: 'pristina', label: 'Pristina', value: 'Pristina, cursive' },
  { id: 'rage', label: 'Rage Italic', value: '"Rage Italic", cursive' },
  { id: 'ravie', label: 'Ravie', value: 'Ravie, cursive' },
  { id: 'rockwell', label: 'Rockwell', value: 'Rockwell, serif' },
  { id: 'script-mt', label: 'Script MT Bold', value: '"Script MT Bold", cursive' },
  { id: 'segoe-print', label: 'Segoe Print', value: '"Segoe Print", cursive' },
  { id: 'segoe-script', label: 'Segoe Script', value: '"Segoe Script", cursive' },
  { id: 'segoe', label: 'Segoe UI', value: '"Segoe UI", Tahoma, sans-serif' },
  { id: 'showcard', label: 'Showcard Gothic', value: '"Showcard Gothic", sans-serif' },
  { id: 'sitka', label: 'Sitka', value: '"Sitka Text", Sitka, serif' },
  { id: 'snap', label: 'Snap ITC', value: '"Snap ITC", cursive' },
  { id: 'stencil', label: 'Stencil', value: 'Stencil, serif' },
  { id: 'sylfaen', label: 'Sylfaen', value: 'Sylfaen, serif' },
  { id: 'tahoma', label: 'Tahoma', value: 'Tahoma, Geneva, sans-serif' },
  { id: 'tempus', label: 'Tempus Sans ITC', value: '"Tempus Sans ITC", sans-serif' },
  { id: 'times', label: 'Times New Roman', value: '"Times New Roman", Times, serif' },
  { id: 'trebuchet', label: 'Trebuchet MS', value: '"Trebuchet MS", Tahoma, sans-serif' },
  { id: 'tw-cen', label: 'Tw Cen MT', value: '"Tw Cen MT", sans-serif' },
  { id: 'verdana', label: 'Verdana', value: 'Verdana, Geneva, sans-serif' },
  { id: 'viner', label: 'Viner Hand ITC', value: '"Viner Hand ITC", cursive' },
  { id: 'vivaldi', label: 'Vivaldi', value: 'Vivaldi, cursive' },
  { id: 'vladimir', label: 'Vladimir Script', value: '"Vladimir Script", cursive' },
  { id: 'wide-latin', label: 'Wide Latin', value: '"Wide Latin", serif' },
]

// Exact pixel sizes 10–20; the label is the number and the value is that many
// pixels, so the menu text matches the chosen number precisely.
export const SIDEBAR_FONT_SIZES = Array.from({ length: 11 }, (_, i) => {
  const px = 10 + i
  return { id: `px${px}`, label: String(px), value: `${px}px` }
})

// Build an inline style object for the menu text from saved font settings.
// fontWeight and fontStyle are emitted explicitly (normal when off) so they
// override the nav links' base `font-semibold` class — otherwise toggling
// bold off would leave the text stuck at semibold and italic wouldn't apply.
export function sidebarFontStyle(font) {
  if (!font || typeof font !== 'object') return undefined
  const s = {}
  if (font.family) s.fontFamily = font.family
  if (font.size) s.fontSize = font.size
  s.fontWeight = font.bold ? 700 : 400
  s.fontStyle = font.italic ? 'italic' : 'normal'
  return s
}

// Reserved (non-route) key that stores the top header bar color. Undefined in
// the map means "never set" → fall back to the default green (HEADER_DEFAULT).
export const HEADER_KEY = '__header'
export const HEADER_DEFAULT = '#4E7B4C'

// Reserved key: which header-bar items show, and which render icon-only.
//   logo / brand / help  → show or hide
//   adminIconOnly / profileIconOnly → drop the text label, keep the icon
// Reserved key: user-uploaded photo backgrounds. Array of { id, label, url }.
// Declared here (before DEFAULT_PREFS) so the defaults IIFE can reference it.
export const CUSTOM_BG_KEY = '__customBackgrounds'

export const HEADER_ITEMS_KEY = '__headerItems'
export const HEADER_ITEMS_DEFAULT = {
  logo: true,
  brand: true,
  sam: true,
  help: true,
  adminIconOnly: false,
  profileIconOnly: false,
}
// Merge a stored value over the defaults so missing sub-keys stay sensible.
export function readHeaderItems(map) {
  return { ...HEADER_ITEMS_DEFAULT, ...(map?.[HEADER_ITEMS_KEY] || {}) }
}

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

// ── App-wide DEFAULT appearance ────────────────────────────────────────────
// These apply to every user *before* they make their own choices on the
// Customize page. Anything a user explicitly saves overrides the matching
// default (see withDefaults below); modules they never touch fall back here.
//   • Blue Waves background on all modules
//   • Left menu bar: Clear        • Header bar: Clear
//   • Menu font: Arial, size 14px, no bold/italic, icons shown
export const DEFAULT_PREFS = (() => {
  const m = {}
  CUSTOMIZE_MODULES.forEach(mod => {
    m[mod.key] = 'waves-blue' // Blue Waves
  })
  m[SIDEBAR_KEY] = null // Clear left menu bar
  m[HEADER_KEY] = null // Clear header bar
  m[SIDEBAR_ICONS_KEY] = true // Show icons
  m[SIDEBAR_FONT_KEY] = { family: 'Arial, Helvetica, sans-serif', size: '14px', bold: false, italic: false }
  m[MENU_POS_KEY] = 'left' // Classic left sidebar
  m[MENU_GROUPS_KEY] = [] // No custom menu groups by default
  m[HEADER_ITEMS_KEY] = { ...HEADER_ITEMS_DEFAULT } // All header items shown
  m[CUSTOM_BG_KEY] = [] // No uploaded photo backgrounds by default
  return m
})()

// Layer a user's saved preferences on top of the app-wide defaults so unset
// values fall back to DEFAULT_PREFS. Saved keys (including an explicit null,
// e.g. a deliberately Clear bar) win over the default.
export function withDefaults(stored) {
  const s = stored && typeof stored === 'object' ? stored : {}
  return { ...DEFAULT_PREFS, ...s }
}

export function readModuleBackgrounds() {
  try {
    const v = JSON.parse(localStorage.getItem(MODULE_BG_LS_KEY) || '{}')
    return withDefaults(v && typeof v === 'object' ? v : {})
  } catch {
    return withDefaults({})
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

export function readCustomBackgrounds(map) {
  const v = map?.[CUSTOM_BG_KEY]
  return Array.isArray(v) ? v : []
}
// Resolve a background id to its option — from presets or the user's uploads.
export function resolveBackground(id, map) {
  return (
    BACKGROUNDS.find(b => b.id === id) ||
    readCustomBackgrounds(map).find(b => b.id === id) ||
    null
  )
}

// Paint (or clear) the app-shell background for a given background id.
export function applyAppBackground(id, map) {
  const opt = resolveBackground(id, map)
  const el = document.getElementById('app-shell') || document.body
  if (!el) return
  const url = opt?.url || ''
  // Skip re-applying the same image on every route change. Re-setting
  // background-image forces the browser to re-decode the (potentially large)
  // photo, which is the main source of navigation lag. No-op when unchanged.
  if (el.dataset.bgUrl === url) return
  el.dataset.bgUrl = url
  const s = el.style
  if (url) {
    s.backgroundImage = `url('${url}')`
    s.backgroundSize = 'cover'
    s.backgroundPosition = 'center'
    s.backgroundRepeat = 'no-repeat'
    s.backgroundAttachment = 'fixed' // paint once; avoids re-rasterizing on scroll
  } else {
    s.backgroundImage = ''
    s.backgroundSize = ''
    s.backgroundPosition = ''
    s.backgroundRepeat = ''
    s.backgroundAttachment = ''
  }
}

// Convenience: apply whatever background the current route's module maps to.
export function applyBackgroundForPath(pathname, map) {
  const key = matchModuleKey(pathname)
  applyAppBackground((key && map?.[key]) || 'none', map)
}
