// Pure, React-free Fire Pit cap/finish math — extracted from FirePitModule so it can
// be unit-tested with `node --test` (no React / supabase / vite imports). The React
// module resolves `meta` (CAP_META/WF_META/masterWallMeta) and `vendorUnit`
// (wfVendorPrice) and injects them here; this file holds the material + labor
// arithmetic and the NO-FALLBACK labor rule:
//   labor = numeric laborCoeff  →  else the calc_meta.labor_rate pointer  →  else 0
//           (0 surfaces the unpriced fix-it modal; NEVER a type-inheritance fallback)

export const num = v => parseFloat(v) || 0

// ── Canonical wall-finish set ────────────────────────────────────────────────
// The 7 finishes Fire Pit prices. `key`/`labKey` point at FP_RATES entries (which
// resolve the shared '<Type> - Finishes' material + labor records). This is the
// SINGLE source for the finish TYPE dropdown: every option MUST be a key here so it
// resolves through WF_META → FP_RATES and prices. The dropdown used to be built from
// raw 'Finish Material' catalog names (junk like Concrete Truck / *Flatwork + the
// full '<Type> - Finishes' names), none of which round-trip to a WF_META key — so
// every selectable finish dropped to masterWallMeta and zeroed material + labor.
export const WF_META = {
  'Sand Stucco': { key: 'sandStucco', labKey: 'sandStuccoLab', unit: 'SF', labMode: 'perDay' },
  'Smooth Stucco': {
    key: 'smoothStucco',
    labKey: 'smoothStuccoLab',
    unit: 'SF',
    labMode: 'perDay',
  },
  'Ledgerstone Veneer': {
    key: 'ledgerstone',
    labKey: 'ledgerstoneLab',
    unit: 'SF',
    labMode: 'perDay',
    waste: 1.1,
    screwPer5: 2,
  },
  'Stacked Stone Veneer': {
    key: 'stackedStone',
    labKey: 'stackedStoneLab',
    unit: 'SF',
    labMode: 'perDay',
    waste: 1.1,
    screwPer5: 2,
  },
  Tile: { key: 'tile', labKey: 'tileLab', unit: 'SF', labMode: 'perSF', adhesivePerSF: 1 },
  'Real Flagstone': {
    key: 'realFlagstone',
    labKey: 'flagstoneLab',
    unit: 'stone',
    labMode: 'perSF',
    delivPerSF: 1,
    misc: 268.75,
  },
  'Real Stone': {
    key: 'realStone',
    labKey: 'realStoneLab',
    unit: 'stone',
    labMode: 'perSF',
    delivPerSF: 2.5714,
    addPerSF: 1,
  },
}
export const WF_LIST = Object.keys(WF_META)

// The finish TYPE dropdown option list — ALWAYS the canonical finishes, so every
// option prices. Kept as a function so the module (and tests) share one source.
export function fpFinishTypeOptions() {
  return WF_LIST.slice()
}

// Cap/finish labor coefficient (hours per unit).
//   master item: numeric laborCoeff, else the default-labor pointer (labor_rate) via mp
//   built-in item: mp[labName]
// Returns 0 for "unset" — the caller flags it; it is never guessed.
export function resolveLabor(meta, labName, mp) {
  const p = name => num(mp[name])
  if (meta.master) {
    if (num(meta.laborCoeff) > 0) return num(meta.laborCoeff)
    return meta.labor_rate ? p(meta.labor_rate) : 0
  }
  return labName ? p(labName) : 0
}

const unpriced = (labName, label) =>
  labName || label
    ? { kind: 'labor', name: labName || null, label, category: 'Fire Pit', unit: null }
    : null

// $/LF material for a cap: vendor/catalog price if present (vendorUnit != null),
// else the house unit (catalog matUnit for a master item, else the FP_RATES price).
export function computeCapRow(row, { meta, vendorUnit, mp, fpRates }) {
  const lf = num(row.lf)
  if (!meta || lf <= 0) return { mat: 0, hrs: 0, unit: 0, laborUnset: null }
  const houseUnit = meta.master
    ? num(meta.matUnit)
    : num(mp[fpRates[meta.matKey].ref] ?? mp[fpRates[meta.matKey].dbName]) // ref_key first (M7)
  const unit = vendorUnit != null ? vendorUnit : houseUnit
  const labName = meta.master ? meta.labor_rate : fpRates[meta.labKey].dbName
  const labCoef = resolveLabor(meta, labName, mp)
  return {
    mat: lf * unit,
    hrs: lf * labCoef,
    unit,
    laborUnset: labCoef <= 0 ? unpriced(labName, row.type) : null,
  }
}

// Wall finish per row: $/SF material (stone mode adds delivery/misc/add) + hrs/SF labor.
export function computeFinishRow(row, { meta, vendorUnit, mp, fpRates }) {
  const sf = num(row.sf)
  if (!meta || sf <= 0) return { mat: 0, hrs: 0, unit: 0, laborUnset: null }
  const houseUnit = meta.master
    ? num(meta.matUnit)
    : num(mp[fpRates[meta.key].ref] ?? mp[fpRates[meta.key].dbName]) // ref_key first (M7)
  const unit = vendorUnit != null ? vendorUnit : houseUnit
  let mat
  if (meta.unit === 'stone') {
    mat =
      sf * unit +
      sf * (meta.delivPerSF || 0) +
      (meta.misc || 0) +
      (meta.addPerSF ? sf * meta.addPerSF : 0)
  } else {
    mat =
      sf * unit * (meta.waste || 1) +
      (meta.screwPer5 ? (sf / 5) * meta.screwPer5 : 0) +
      (meta.adhesivePerSF ? sf * meta.adhesivePerSF : 0)
  }
  const labName = meta.master ? meta.labor_rate : fpRates[meta.labKey].dbName
  const labRate = resolveLabor(meta, labName, mp)
  return {
    mat,
    hrs: sf * labRate, // all finish labor is hours per Sq Ft
    unit,
    laborUnset: labRate <= 0 ? unpriced(labName, row.type) : null,
  }
}

// ── Fire pit fill (lava rock / fire glass) ───────────────────────────────────
// Fill is sold by the bag, so the rate table keeps the shelf price and the bag's
// coverage lives on the product as calc_meta.cu_ft_per_unit. That conversion is
// what lets the row show a $ per Cu Ft figure without a coefficient in code. A
// product with no coverage recorded is read as already priced per Cu Ft.
export function fillUnitPrice(item) {
  if (!item) return 0
  const per = num(item.calc_meta && item.calc_meta.cu_ft_per_unit)
  const price = num(item.unit_cost)
  return per > 0 ? price / per : price
}

// Fill row: Cu Ft × $ per Cu Ft material, Cu Ft × hours-per-Cu-Ft labor.
// An unset labor rate returns 0 hours AND the unpriced flag — never a guess.
export function computeFillRow(row, { item, mp, labName }) {
  const cuft = num(row.cuft)
  if (!item || cuft <= 0) return { mat: 0, hrs: 0, unit: 0, laborUnset: null }
  const unit = fillUnitPrice(item)
  const labRate = num(mp[labName])
  return {
    mat: cuft * unit,
    hrs: cuft * labRate,
    unit,
    laborUnset: labRate <= 0 ? unpriced(labName, row.type || item.name) : null,
  }
}
