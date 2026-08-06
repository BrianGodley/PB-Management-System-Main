// ─────────────────────────────────────────────────────────────────────────────
// Shared CMU grout-fill model.
//
// Grout is priced at the CONCRETE rate ($/CY); this module standardizes the
// grout VOLUME per block across every CMU-using estimator (Walls, Columns,
// Fire Pit, Outdoor Kitchen, Steps) so they all compute grout the same way:
//
//     grout CY = (# blocks) × cuFtPerBlock ÷ 27 × (% grouted)
//     grout $  = grout CY × concrete $/CY
//
// Anchor values (from Brian): a standard 8"-wide block (8x8x16) holds
// 0.5 cu ft of grout; a 6"-wide block (6x8x16) holds 0.4 cu ft. Fill scales
// linearly with block WIDTH and proportionally with HEIGHT (slump blocks are
// 6" tall instead of 8"):
//
//     cuFt(w, h) = (0.05·w + 0.1) × (h / 8)
//
// which reproduces the two anchors exactly (8"→0.5, 6"→0.4) and derives the
// rest (e.g. 12x8x16 → 0.7, 8x6x16 slump → 0.375). Adjust here if a specific
// block size needs a hand-set value.
// ─────────────────────────────────────────────────────────────────────────────
export const CU_FT_PER_YARD = 27

// Explicit overrides by "WxHxL" (or "WxH") key take precedence over the formula.
export const GROUT_CF_OVERRIDES = {
  '8x8': 0.5,
  '6x8': 0.4,
  '12x8': 0.8,
}

export function groutCuFtPerBlock(widthIn = 8, heightIn = 8) {
  const w = parseFloat(widthIn) || 8
  const h = parseFloat(heightIn) || 8
  const key = `${w}x${h}`
  if (GROUT_CF_OVERRIDES[key] != null) return GROUT_CF_OVERRIDES[key]
  return (0.05 * w + 0.1) * (h / 8)
}

// Grout cubic yards per single block of the given size.
export function groutCyPerBlock(widthIn = 8, heightIn = 8) {
  return groutCuFtPerBlock(widthIn, heightIn) / CU_FT_PER_YARD
}
