// ─────────────────────────────────────────────────────────────────────────────
// Shared Irrigation zone assemblies. Used by both the estimator (IrrigationModule)
// and the read-only summary so per-zone labor hours + bill-of-materials never
// drift. Each zone = Trench/Hand labor hours (labor_rates, hrs per zone) + a BOM
// priced live from the catalog. BOM product names are matched to catalog
// descriptions by a normalized (case/spacing/punctuation-insensitive) key.
// ─────────────────────────────────────────────────────────────────────────────

import { LAB } from './laborRefs.js'
const n = v => parseFloat(v) || 0

// Catalog product descriptions.
export const IRR_PRODUCTS = {
  PIPE: '3/4" SCH-40 PVC PIPE 8000',
  VALVE: '3/4" SUPERIOR AUTO VALVE 950',
  ELBOW: '406-007 3/4" 90 ELL SS',
  COUPLING: '429-007 3/4" NESTING COUPLING S S',
  WIRE: "1805 UF WIRE 5 STRAND ( 250') 39lb/1000ft",
  NOZZLE: '12H RB NOZZLES',
  SWING: '1/2" M x F Swing Joint Elbow',
  RISER10: '1/2" x 10" PVC Riser',
  RISER18: '1/2" x 18" PVC Riser',
  POPUP: 'Rain Bird 1800 Series 4" Pop-Up',
  ROTATOR: 'Hunter MP Rotator',
  MAINDRIP: "TLCV0025 250'COIL BLANK TUBING",
  EMITTER: 'XB-10-PC (BLACK) 1.0GPH (166)',
  DRIP18: '1/8" Drip Tubing',
  NETAFIM: `TLCV9-12025 250' ROLL .9 GPH 12" SPACING NETAF`,
  COPPER: 'XFSCV-09-12-500 SUB SURF CE DRIP LINE W/COPPER SH',
}
const P = IRR_PRODUCTS

export const ZONE_TYPES = [
  {
    key: 'planterSpray',
    label: 'Planter Spray Zone',
    defaultMode: 'Hand',
    laborTrench: LAB.IRR_PLANTER_SPRAY_TRENCH,
    laborHand: LAB.IRR_PLANTER_SPRAY_HAND,
    bom: [
      { name: P.PIPE, qty: 200 }, { name: P.VALVE, qty: 1 }, { name: P.NOZZLE, qty: 16 },
      { name: P.ELBOW, qty: 20 }, { name: P.COUPLING, qty: 10 }, { name: P.SWING, qty: 14 },
      { name: P.RISER10, qty: 15 }, { name: P.WIRE, qty: 75 },
    ],
  },
  {
    key: 'lawn',
    label: 'Lawn Zone (≤ 1,000 Sq Ft)',
    defaultMode: 'Trench',
    laborTrench: LAB.IRR_LAWN_TRENCH,
    laborHand: LAB.IRR_LAWN_HAND,
    bom: [
      { name: P.PIPE, qty: 225 }, { name: P.VALVE, qty: 1 }, { name: P.NOZZLE, qty: 14 },
      { name: P.ELBOW, qty: 20 }, { name: P.COUPLING, qty: 10 }, { name: P.SWING, qty: 14 },
      { name: P.RISER10, qty: 1 }, { name: P.POPUP, qty: 14 }, { name: P.WIRE, qty: 75 },
    ],
  },
  {
    key: 'hillside',
    label: 'Hillside Spray Zone',
    defaultMode: 'Hand',
    laborTrench: null,
    laborHand: LAB.IRR_HILLSIDE_HAND,
    bom: [
      { name: P.PIPE, qty: 350 }, { name: P.VALVE, qty: 1 }, { name: P.ELBOW, qty: 20 },
      { name: P.COUPLING, qty: 10 }, { name: P.RISER18, qty: 6 }, { name: P.ROTATOR, qty: 8 },
      { name: P.WIRE, qty: 75 },
    ],
  },
  {
    key: 'dripPlant',
    label: '1/8" Plant Drip Zone',
    defaultMode: 'Trench',
    laborTrench: LAB.IRR_PLANT_DRIP_TRENCH,
    laborHand: LAB.IRR_PLANT_DRIP_HAND,
    bom: [
      { name: P.PIPE, qty: 100 }, { name: P.VALVE, qty: 1 }, { name: P.ELBOW, qty: 10 },
      { name: P.COUPLING, qty: 6 }, { name: P.MAINDRIP, qty: 200 }, { name: P.EMITTER, qty: 40 },
      { name: P.DRIP18, qty: 200 }, { name: P.WIRE, qty: 75 },
    ],
  },
  {
    key: 'dripline',
    label: 'Netafim Drip Hose Zone',
    defaultMode: 'Trench',
    laborTrench: LAB.IRR_NETAFIM_TRENCH,
    laborHand: LAB.IRR_NETAFIM_HAND,
    bom: [
      { name: P.PIPE, qty: 100 }, { name: P.VALVE, qty: 1 }, { name: P.ELBOW, qty: 10 },
      { name: P.COUPLING, qty: 6 }, { name: P.NETAFIM, qty: 275 }, { name: P.WIRE, qty: 75 },
    ],
  },
  {
    key: 'subterranean',
    label: 'Subterranean Drip (≤ 1,000 Sq Ft)',
    defaultMode: 'Trench',
    laborTrench: LAB.IRR_SUBTERRANEAN_TRENCH,
    laborHand: LAB.IRR_SUBTERRANEAN_HAND,
    bom: [
      { name: P.PIPE, qty: 100 }, { name: P.VALVE, qty: 1 }, { name: P.ELBOW, qty: 10 },
      { name: P.COUPLING, qty: 6 }, { name: P.COPPER, qty: 1050 }, { name: P.WIRE, qty: 75 },
    ],
  },
]

export const ZONE_BY_KEY = Object.fromEntries(ZONE_TYPES.map(z => [z.key, z]))
export const zoneMeta = key => ZONE_BY_KEY[key] || ZONE_TYPES[0]
export const ZONE_OPTIONS = ZONE_TYPES.map(z => ({ value: z.key, label: z.label }))

export const norm = s => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '')

// name → best open price. Standard (vendor_id null) preferred; else any vendor line
// (covers Home-Depot-only new items); else the name-keyed Standard map; else 0.
export function makeBomPrice(materialRows, materialPrices) {
  const byNorm = {}
  ;(materialRows || []).forEach(r => {
    const k = norm(r.name)
    if (k && (byNorm[k] == null || r.vendor_id == null)) byNorm[k] = n(r.unit_cost)
  })
  return name => {
    const k = norm(name)
    return byNorm[k] != null ? byNorm[k] : n((materialPrices || {})[name]) || 0
  }
}

// Material cost for ONE zone = Σ(bom qty × live price).
export const zoneMatUnit = (z, bomPrice) => (z?.bom || []).reduce((s, b) => s + n(b.qty) * bomPrice(b.name), 0)

// Zone row calc — shared by estimator + summary.
//   hrs = qty(zones) × per-zone labor hours (Trench/Hand); Trench→Hand when no trench.
//   unitPrice = per-zone material; mat = qty × unitPrice.
export function computeZoneRow(row, laborRates, bomPrice) {
  if (!row || !row.type)
    return { z: zoneMeta(row?.type), qty: n(row?.qty), mode: row?.mode, rate: 0, hrs: 0, unitPrice: 0, mat: 0, subEach: 0, subMat: 0, missing: [] }
  const z = zoneMeta(row.type)
  const qty = n(row.qty)
  const mode = row.mode === 'Trench' && !z.laborTrench ? 'Hand' : row.mode || z.defaultMode
  const laborKey = mode === 'Trench' ? z.laborTrench : z.laborHand
  const rate = n((laborRates || {})[laborKey])
  const hrs = qty > 0 ? qty * rate : 0
  let unitPrice = 0
  const missing = []
  ;(z.bom || []).forEach(b => {
    const p = bomPrice(b.name)
    if (!p) missing.push(b.name)
    unitPrice += n(b.qty) * p
  })
  const mat = qty * unitPrice
  const subEach = row.subEach !== '' && row.subEach != null ? n(row.subEach) : unitPrice
  const subMat = qty > 0 ? qty * subEach : 0
  return { z, qty, mode, rate, hrs, unitPrice, mat, subEach, subMat, missing }
}
