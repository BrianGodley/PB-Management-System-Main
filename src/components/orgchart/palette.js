// Re-exports of the app-wide color library for the org chart.
// Kept as a thin shim so the rest of the orgchart code doesn't have to
// know about the lib path, and so other modules can override what
// "container colors" mean (e.g. if a tenant wants a curated subset).

import {
  COLOR_LIBRARY,
  getColor,
  getFamily,
  pickTextColor as libPickTextColor,
} from '../../lib/colorLibrary.js'

// Backward-compat: older code expected a flat array of { name, bg, text }.
// Keep that shape using the 500-level swatch of each family.
export const CONTAINER_COLORS = COLOR_LIBRARY.map(fam => {
  const s = getColor(fam.family, 500)
  return {
    name: fam.family[0].toUpperCase() + fam.family.slice(1),
    bg: s.hex,
    text: s.textColor,
  }
})

export const FULL_LIBRARY = COLOR_LIBRARY
export { getColor, getFamily }

export function pickTextColor(bg) {
  return libPickTextColor(bg)
}
