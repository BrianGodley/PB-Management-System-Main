// App-wide color library — 10 hue families × 11 shades each.
//
// Shade levels follow Tailwind's convention:
//   50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950
// Lower = lighter, higher = darker. Level 500 is roughly the "true" hue.
//
// Each entry exposes:
//   - id        : 'coral-500'
//   - family    : 'coral'
//   - level     : 500
//   - rgb       : [245, 73, 39]
//   - hex       : '#F54927'
//   - textColor : '#FFFFFF' or '#1E293B'  (legible on this bg)
//
// Use:
//   import { COLOR_LIBRARY, getColor, getFamily } from '@/lib/colorLibrary'
//   <div style={{ background: getColor('blue', 500).hex }} />
//
// To use only one family in a picker, call `getFamily('coral')`.
// To iterate every color, walk `COLOR_LIBRARY.flatMap(f => f.shades)`.

export const LEVELS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950]

function rgb(r, g, b) {
  return [r, g, b]
}

// Luminance threshold for picking white vs near-black text on top.
// Standard sRGB relative-luminance formula.
function textColorFor([r, g, b]) {
  const srgb = [r, g, b].map(v => {
    const n = v / 255
    return n <= 0.03928 ? n / 12.92 : Math.pow((n + 0.055) / 1.055, 2.4)
  })
  const L = 0.2126 * srgb[0] + 0.7152 * srgb[1] + 0.0722 * srgb[2]
  return L > 0.5 ? '#1E293B' : '#FFFFFF'
}

function toHex([r, g, b]) {
  const h = n => n.toString(16).padStart(2, '0').toUpperCase()
  return `#${h(r)}${h(g)}${h(b)}`
}

// Each family is an array of 11 [r,g,b] triplets, ordered lightest → darkest.
const RAW = {
  coral: [
    rgb(254, 235, 231),
    rgb(252, 198, 187),
    rgb(250, 161, 143),
    rgb(248, 124, 99),
    rgb(245, 73, 39),
    rgb(244, 50, 11),
    rgb(200, 41, 9),
    rgb(156, 32, 7),
    rgb(112, 23, 5),
    rgb(68, 14, 3),
    rgb(24, 5, 1),
  ],
  blue: [
    rgb(230, 230, 255),
    rgb(184, 184, 255),
    rgb(138, 138, 255),
    rgb(92, 92, 255),
    rgb(46, 46, 255),
    rgb(0, 0, 255),
    rgb(0, 0, 209),
    rgb(0, 0, 163),
    rgb(0, 0, 117),
    rgb(0, 0, 71),
    rgb(0, 0, 26),
  ],
  brown: [
    rgb(250, 235, 235),
    rgb(240, 198, 198),
    rgb(231, 162, 162),
    rgb(222, 125, 125),
    rgb(212, 89, 89),
    rgb(203, 52, 52),
    rgb(165, 42, 42),
    rgb(130, 33, 33),
    rgb(93, 24, 24),
    rgb(57, 15, 15),
    rgb(20, 5, 5),
  ],
  gray: [
    rgb(242, 242, 242),
    rgb(219, 219, 219),
    rgb(196, 196, 196),
    rgb(173, 173, 173),
    rgb(150, 150, 150),
    rgb(128, 128, 128),
    rgb(105, 105, 105),
    rgb(82, 82, 82),
    rgb(59, 59, 59),
    rgb(36, 36, 36),
    rgb(13, 13, 13),
  ],
  green: [
    rgb(230, 255, 230),
    rgb(184, 255, 184),
    rgb(138, 255, 138),
    rgb(92, 255, 92),
    rgb(46, 255, 46),
    rgb(0, 255, 0),
    rgb(0, 209, 0),
    rgb(0, 163, 0),
    rgb(0, 128, 0),
    rgb(0, 71, 0),
    rgb(0, 26, 0),
  ],
  orange: [
    rgb(255, 234, 230),
    rgb(255, 195, 184),
    rgb(255, 157, 138),
    rgb(255, 119, 92),
    rgb(255, 85, 51),
    rgb(255, 42, 0),
    rgb(209, 35, 0),
    rgb(163, 27, 0),
    rgb(117, 20, 0),
    rgb(71, 12, 0),
    rgb(26, 4, 0),
  ],
  yellow: [
    rgb(255, 255, 230),
    rgb(255, 255, 184),
    rgb(255, 255, 138),
    rgb(255, 255, 92),
    rgb(255, 255, 46),
    rgb(255, 255, 0),
    rgb(209, 209, 0),
    rgb(163, 163, 0),
    rgb(117, 117, 0),
    rgb(71, 71, 0),
    rgb(26, 26, 0),
  ],
  pink: [
    rgb(255, 230, 234),
    rgb(255, 192, 203),
    rgb(255, 138, 157),
    rgb(255, 92, 119),
    rgb(255, 46, 81),
    rgb(255, 0, 43),
    rgb(209, 0, 35),
    rgb(163, 0, 27),
    rgb(117, 0, 20),
    rgb(71, 0, 12),
    rgb(26, 0, 4),
  ],
  mono: [
    rgb(255, 255, 255),
    rgb(231, 231, 231),
    rgb(207, 207, 207),
    rgb(182, 182, 182),
    rgb(158, 158, 158),
    rgb(134, 134, 134),
    rgb(110, 110, 110),
    rgb(85, 85, 85),
    rgb(61, 61, 61),
    rgb(37, 37, 37),
    rgb(13, 13, 13),
  ],
  magenta: [
    rgb(255, 230, 255),
    rgb(255, 184, 255),
    rgb(255, 138, 255),
    rgb(255, 92, 255),
    rgb(255, 46, 255),
    rgb(255, 0, 255),
    rgb(209, 0, 209),
    rgb(163, 0, 163),
    rgb(128, 0, 128),
    rgb(71, 0, 71),
    rgb(26, 0, 26),
  ],
}

// Build the structured library: an ordered list of families, each with its
// shades pre-flattened with id/hex/textColor metadata.
export const COLOR_LIBRARY = Object.entries(RAW).map(([family, triplets]) => ({
  family,
  shades: triplets.map((triplet, i) => ({
    id: `${family}-${LEVELS[i]}`,
    family,
    level: LEVELS[i],
    rgb: triplet,
    hex: toHex(triplet),
    textColor: textColorFor(triplet),
  })),
}))

// Flat index keyed by id ('coral-500') AND by hex ('#F54927').
const INDEX = new Map()
for (const fam of COLOR_LIBRARY) {
  for (const s of fam.shades) {
    INDEX.set(s.id, s)
    INDEX.set(s.hex.toLowerCase(), s)
  }
}

/** Look up a color by family + level. */
export function getColor(family, level) {
  return INDEX.get(`${family}-${level}`) || null
}

/** Look up a color by its `coral-500` id or its hex. */
export function findColor(idOrHex) {
  if (!idOrHex) return null
  return INDEX.get(String(idOrHex).toLowerCase()) || null
}

/** Get all shades of one family. */
export function getFamily(family) {
  const fam = COLOR_LIBRARY.find(f => f.family === family)
  return fam ? fam.shades : []
}

/** Pick the right text color for a given background hex. */
export function pickTextColor(hex) {
  const c = findColor(hex)
  if (c) return c.textColor
  // Unknown hex — compute on the fly
  if (typeof hex === 'string' && /^#?[0-9a-fA-F]{6}$/.test(hex)) {
    const h = hex.replace('#', '')
    const r = parseInt(h.slice(0, 2), 16)
    const g = parseInt(h.slice(2, 4), 16)
    const b = parseInt(h.slice(4, 6), 16)
    return textColorFor([r, g, b])
  }
  return '#FFFFFF'
}
