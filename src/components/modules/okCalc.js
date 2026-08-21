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

// ── Canonical wall-finish set ────────────────────────────────────────────────
// The 7 finishes Outdoor Kitchen prices. `key`/`labKey` point at OK_RATES entries
// (which resolve the shared '<Type> - Finishes' material + labor records). This is
// the SINGLE source for the finish TYPE dropdown: every option MUST be a key here so
// it resolves through WF_META → OK_RATES and prices. The dropdown used to be built
// from raw 'Finish Material' catalog names (incl. junk like Concrete Truck /
// *Flatwork and the full '<Type> - Finishes' names), none of which round-trip to a
// WF_META key — so switching off the default zeroed material + labor.
export const WF_META = {
  'Sand Stucco': { key: 'sandStucco', labKey: 'sandStuccoLab', unit: 'SF', labMode: 'perDay' },
  'Smooth Stucco': { key: 'smoothStucco', labKey: 'smoothStuccoLab', unit: 'SF', labMode: 'perDay' },
  'Ledgerstone Veneer': { key: 'ledgerstone', labKey: 'ledgerstoneLab', unit: 'SF', labMode: 'perDay', waste: 1.1, screwPer5: 2 },
  'Stacked Stone Veneer': { key: 'stackedStone', labKey: 'stackedStoneLab', unit: 'SF', labMode: 'perDay', waste: 1.1, screwPer5: 2 },
  Tile: { key: 'tile', labKey: 'tileLab', unit: 'SF', labMode: 'perSF', adhesivePerSF: 1 },
  'Real Flagstone': { key: 'realFlagstone', labKey: 'flagstoneLab', unit: 'stone', labMode: 'perSF', delivPerSF: 1, misc: 268.75 },
  'Real Stone': { key: 'realStone', labKey: 'realStoneLab', unit: 'stone', labMode: 'perSF', delivPerSF: 2.5714, addPerSF: 1 },
}
export const WF_LIST = Object.keys(WF_META)

// The finish TYPE dropdown option list — ALWAYS the canonical finishes, so every
// option prices. Kept as a function so the module (and tests) share one source.
export function okFinishTypeOptions() {
  return WF_LIST.slice()
}
