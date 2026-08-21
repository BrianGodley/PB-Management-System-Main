// Pure, React-free Outdoor Kitchen wall-finish math — extracted from
// OutdoorKitchenModule so it can be unit-tested with `node --test` (no React /
// supabase / vite imports). The module resolves `meta` (WF_META / masterWallMeta),
// the vendor/standard `unit` ($/SF), and the `laborRate` (hrs/SF), then injects
// them here. Finishes are shared with the Finishes module (one $/SF record); the
// per-type add-ons (stone delivery/misc, veneer waste/screws, tile adhesive) stay
// as meta so the row still reflects real install costs.
export const num = v => parseFloat(v) || 0

// One wall-finish row → { mat, hrs }.
//   stone mode: sf×$/SF + sf×delivery + flat misc + sf×add
//   else:       sf×$/SF×waste + (sf/5)×screwPer5 + sf×adhesivePerSF
//   labor:      sf × hrs/SF (injected; 0 if unpriced — caller surfaces the prompt)
export function computeOkFinishRow(sf0, meta, unit, laborRate) {
  const sf = num(sf0)
  if (!meta || sf <= 0) return { mat: 0, hrs: 0 }
  const u = num(unit)
  let mat
  if (meta.unit === 'stone') {
    mat = sf * u + sf * num(meta.delivPerSF) + num(meta.misc) + (meta.addPerSF ? sf * num(meta.addPerSF) : 0)
  } else {
    mat =
      sf * u * (num(meta.waste) || 1) +
      (meta.screwPer5 ? (sf / 5) * num(meta.screwPer5) : 0) +
      (meta.adhesivePerSF ? sf * num(meta.adhesivePerSF) : 0)
  }
  return { mat, hrs: sf * num(laborRate) }
}
