// ─────────────────────────────────────────────────────────────────────────────
// makeModuleRates — ONE rate reader for every estimator module.
//
// Today each module reads rates its own way (some from `laborRates`, some from
// `materialPrices`, plus per-module resolvers). This is the single shared reader:
// a module creates one per calc pass and reads every rate through it. Two payoffs:
//   • `.touched`  — the exact set of rates this calc read (name, value, category,
//                   unit). This is what drives View Rates FROM USAGE, so View Rates
//                   can't show a rate the module doesn't use or miss one it does.
//   • `.unpriced` — rates that resolved to unset/0, in the shape UnpricedItemModal
//                   expects (material vs labor), so the inline "set it" prompt is
//                   automatic. (Supersedes makePriceLookup / makeLaborLookup.)
//
// It does NOT change how a rate resolves — it's a thin recording layer over the
// same name→value maps the modules already load.
//
//   const R = makeModuleRates({ material: mp, labor: lr, sub: sr, misc: mp, materialRows })
//   const price = R.mat('Concrete - Form Lumber LF', { category:'Concrete', unit:'Ln Ft' })
//   const hrs   = R.labor('Tile - 1" Squares',       { category:'Pool', unit:'Hrs per Ln Ft' })
//   ...R.touchedList   → [{ table, name, label, category, unit, value }]
//   ...R.unpricedList  → [{ kind?, name, label, materialId?, category, unit }]
// ─────────────────────────────────────────────────────────────────────────────
const toNum = v => {
  const x = typeof v === 'number' ? v : parseFloat(v)
  return Number.isFinite(x) ? x : 0
}

export function makeModuleRates(maps = {}) {
  const { material = {}, labor = {}, sub = {}, misc = {}, materialRows = [] } = maps
  const touched = new Map() // key `${table}|${name}`
  const unpriced = new Map() // key `${kind}|${name}`
  const idByName = {}
  for (const r of materialRows || []) {
    const nm = r.name || r.description
    if (nm && r.id && idByName[nm] == null) idByName[nm] = r.id
  }

  // priceable = material/labor (an unset value is a "set it" prompt). sub/coeff are
  // recorded as touched but never surfaced as unpriced.
  const read = (table, map, name, meta, priceable) => {
    if (!name) return 0
    const raw = map?.[name]
    const val = toNum(raw)
    const key = `${table}|${name}`
    if (!touched.has(key))
      touched.set(key, {
        table,
        name,
        label: meta.label || name,
        category: meta.category ?? null,
        unit: meta.unit ?? null,
        value: val,
      })
    // Unpriced flagging matches the prior helpers exactly:
    //   material → flag ONLY when the value is missing (a present 0 is a real $0,
    //              shown without a prompt — same as makePriceLookup).
    //   labor    → flag when missing OR <= 0 (a 0 labor rate needs setting — same
    //              as makeLaborLookup, drives the inline labor modal).
    const missing = raw == null || raw === ''
    const flagUnpriced = priceable && (missing || (table === 'labor' && !(val > 0)))
    if (flagUnpriced) {
      const kind = table === 'labor' ? 'labor' : 'material'
      const uk = `${kind}|${name}`
      if (!unpriced.has(uk))
        unpriced.set(uk, {
          ...(kind === 'labor' ? { kind: 'labor' } : {}),
          name,
          label: meta.label || name,
          ...(kind === 'material'
            ? { materialId: meta.materialId ?? idByName[name] ?? null }
            : {}),
          category: meta.category ?? null,
          unit: meta.unit ?? null,
        })
    }
    return val
  }

  return {
    touched,
    unpriced,
    get touchedList() {
      return [...touched.values()]
    },
    get unpricedList() {
      return [...unpriced.values()]
    },
    mat(name, meta = {}) {
      return read('material', material, name, meta, true)
    },
    labor(name, meta = {}) {
      return read('labor', labor, name, meta, true)
    },
    sub(name, meta = {}) {
      return read('sub', sub, name, meta, false)
    },
    coeff(name, meta = {}) {
      return read('misc', misc, name, meta, false)
    },
  }
}
