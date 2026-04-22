// ─────────────────────────────────────────────────────────────────────────────
// MiniSkidSteerDemoModule — Mini Skid Steer Demo estimator
//
// All labor rates pulled from labor_rates table (lr[]) with constant fallbacks.
// Rate keys for mini-specific rates differ from full SS:
//   'Demo - Mini Skid Steer Concrete/Dirt'   0.75 t/hr
//   'Demo - Mini Skid Steer Grass'           0.75 t/hr
//   'Demo - Mini Skid Steer Import Base'     5.0 t/hr
//   'Demo - Mini SS Compaction'          1.23 t/hr
// Shared with full SS:
//   'Demo - JJ Compaction', 'Demo - Shrub', 'Demo - Stump 1st/Additional',
//   'Demo - Tree Small/Medium/Large', 'Demo - Rebar'
//
// Mini-specific dump fee differences vs full SS:
//   • Import Base carries $7.50/ton dump fee
//   • Misc Flat/Vert/Footing carry $36.21/ton concrete dump fee
//   • Trees use $125.33/ton 'Dump Fee - Tree/Stump'
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import GpmdBar from './GpmdBar'

// ── Fallback constants ────────────────────────────────────────────────────────

// Excel uses two separate access tables:
//   NonBobLevels — for hand/mini demo items (concrete, dirt, base, misc)
//   BobcatLevels — for bobcat-assisted operations (grading, footing, grass, vegetation)
const NON_BOB_LEVELS = { Poor: 0.5, OK: 0.667, Full: 1.0 }
const BOB_LEVELS     = { Poor: 0.5, OK: 0.75,  Full: 1.0 }
const DUMP_TYPES     = ['In-House', 'Subcontractor']

const RATE_DEFAULTS = {
  concrete:    0.75,  // 'Demo - Mini Skid Steer Concrete/Dirt' (NonBob)
  grass:       0.75,  // 'Demo - Mini Skid Steer Grass' (Bobcat)
  importBase:  5.0,   // 'Demo - Mini Skid Steer Import Base' (NonBob)
  bobcatConc:  2.0,   // Full Bobcat haul rate — used for Grade Cut & Footing
  bobcatBase:  10.0,  // Full Bobcat base spread — used for Grade Fill
  jj:          1.75,  // 'Demo - JJ Compaction'
  ssCompact:   1.23,  // 'Demo - Mini SS Compaction'
  rebarMin:    0.05,  // 'Demo - Rebar'
  shrub:       0.75,  // 'Demo - Shrub'
  stumpFst:    2.5,   // 'Demo - Stump 1st'
  stumpAdd:    0.75,  // 'Demo - Stump Additional'
  treeSmall:   0.1,   // 'Demo - Tree Small'
  treeMed:     0.15,  // 'Demo - Tree Medium'
  treeLarge:   0.2,   // 'Demo - Tree Large'
}

// Sub Haul rates — billed per 1.5 tons removed (sub cost, not materials)
// Labor is unchanged in Sub Haul mode; dump fees are replaced by these charges
const SUB_HAUL_DEFAULTS = {
  concrete: 85,   // $/1.5T — concrete, misc flat/vert, footing
  dirt:     95,   // $/1.5T — dirt/rock, grade cut
  grass:    120,  // $/1.5T — grass/sod
}

const DUMP_FEE_DEFAULTS = {
  'Dump Fee - Concrete':    36.21,
  'Dump Fee - Dirt':        36.21,
  'Dump Fee - Green Waste': 72.19,
  'Dump Fee - Tree/Stump':  125.33,
  'Dump Fee - Import Base': 7.50,
}

// ── Calculation engine ────────────────────────────────────────────────────────

const n = v => parseFloat(v) || 0
const sfToTons = (sf, depthIn) => (n(sf) / 200) * n(depthIn)

function calcDemo(state, laborRatePerHour, materialPrices, laborRates, subMarkupRate = 0.35, subRates = {}, gpmd = 425) {
  const mp  = materialPrices || {}
  const lr  = laborRates    || {}
  const sr  = subRates      || {}
  // Excel uses two separate access-level tables:
  //   NonBobLevels — hand/mini demo items (concrete, dirt, base, misc flat/vert)
  //   BobcatLevels — bobcat-assisted ops (grass, grading, footing, vegetation)
  const accessNonBob = NON_BOB_LEVELS[state.access] ?? 0.667
  const accessBobcat = BOB_LEVELS[state.access]     ?? 0.75
  const isSub   = state.dumpType === 'Subcontractor'
  const lrph    = n(laborRatePerHour) || 35
  const diff    = 1 + n(state.difficulty) / 100
  const hrsAdj  = n(state.hoursAdj)

  // ── Pull rates from DB (lr) with fallbacks ────────────────────────────────
  // Mini Skid Steer rates — used for all operations
  const rateConc      = lr['Demo - Mini Skid Steer Concrete/Dirt'] ?? RATE_DEFAULTS.concrete
  const rateGrass     = lr['Demo - Mini Skid Steer Grass']         ?? RATE_DEFAULTS.grass
  const rateBase      = lr['Demo - Mini Skid Steer Import Base']   ?? RATE_DEFAULTS.importBase
  const rateJJ        = lr['Demo - JJ Compaction']             ?? RATE_DEFAULTS.jj
  const rateSSCmp     = lr['Demo - Mini SS Compaction']        ?? RATE_DEFAULTS.ssCompact
  const rebarMinPerSF = lr['Demo - Rebar']                     ?? RATE_DEFAULTS.rebarMin
  const shrubRate     = lr['Demo - Shrub']                     ?? RATE_DEFAULTS.shrub
  const stumpFstRate  = lr['Demo - Stump 1st']                 ?? RATE_DEFAULTS.stumpFst
  const stumpAddRate  = lr['Demo - Stump Additional']          ?? RATE_DEFAULTS.stumpAdd
  const treeSmall     = lr['Demo - Tree Small']                ?? RATE_DEFAULTS.treeSmall
  const treeMed       = lr['Demo - Tree Medium']               ?? RATE_DEFAULTS.treeMed
  const treeLarge     = lr['Demo - Tree Large']                ?? RATE_DEFAULTS.treeLarge

  const dumpConc      = mp['Dump Fee - Concrete']    ?? DUMP_FEE_DEFAULTS['Dump Fee - Concrete']
  const dumpDirt      = mp['Dump Fee - Dirt']         ?? DUMP_FEE_DEFAULTS['Dump Fee - Dirt']
  const dumpGreen     = mp['Dump Fee - Green Waste']  ?? DUMP_FEE_DEFAULTS['Dump Fee - Green Waste']
  const dumpTreeStump = mp['Dump Fee - Tree/Stump']   ?? DUMP_FEE_DEFAULTS['Dump Fee - Tree/Stump']
  const dumpBase      = mp['Dump Fee - Import Base']  ?? DUMP_FEE_DEFAULTS['Dump Fee - Import Base']

  // ── Helpers ───────────────────────────────────────────────────────────────
  // accessLevel param lets each call site use the correct NonBob or Bobcat multiplier
  // Sub Haul: labor hours are UNCHANGED — sub replaces disposal cost only
  // dump fees zero out (replaced by per-1.5T sub haul charges in subCost)
  function flat(sf, depthIn, baseRate, dumpFeePerTon = 0, accessLevel = accessNonBob) {
    const tons    = sfToTons(sf, depthIn)
    if (!tons) return { tons: 0, hours: 0, dumpFee: 0 }
    return {
      tons,
      hours:   tons / (baseRate * accessLevel),
      dumpFee: isSub ? 0 : tons * dumpFeePerTon,
    }
  }

  function vert(lf, heightIn, widthIn, baseRate, dumpFeePerTon = 0, accessLevel = accessNonBob) {
    const cf   = n(lf) * (n(heightIn) / 12) * (n(widthIn) / 12)
    const tons = (cf * 150) / 2000
    if (!tons) return { tons: 0, cf: 0, hours: 0, dumpFee: 0 }
    return {
      tons, cf,
      hours:   tons / (baseRate * accessLevel),
      dumpFee: isSub ? 0 : tons * dumpFeePerTon,
    }
  }

  // ── Demo rows — NonBob access (OK=0.667) ──────────────────────────────────
  const conc  = flat(state.concSF,  state.concDepth  || 4, rateConc,  dumpConc,  accessNonBob)
  const dirt  = flat(state.dirtSF,  state.dirtDepth  || 6, rateConc,  dumpDirt,  accessNonBob)
  const base  = flat(state.baseSF,  state.baseDepth  || 4, rateBase,  dumpBase,  accessNonBob)  // Mini: has dump fee
  const grass = flat(state.grassSF, state.grassDepth || 2, rateGrass, dumpGreen, accessBobcat)

  // Mini SS: misc flat/vert carry $36.21 concrete dump fee — NonBob access
  const miscFlatCalc = (state.miscFlatRows || []).map(r =>
    flat(r.sf, r.depth || 4, rateConc, dumpConc, accessNonBob)
  )
  const miscVertCalc = (state.miscVertRows || []).map(r =>
    vert(r.lf, r.heightIn || 0, r.widthIn || 8, rateConc, dumpConc, accessNonBob)
  )
  // Footing — Mini Skid Steer rate + Bobcat access
  const footingCalc = (state.footingRows || []).map(r =>
    flat(r.sf, r.depth || 12, rateConc, dumpConc, accessBobcat)
  )

  // ── Grading — Mini Skid Steer rates + Bobcat access ──────────────────────
  const gradeCut  = flat(state.gradeCutSF,  state.gradeCutDepth  || 3, rateConc, dumpDirt, accessBobcat)
  const gradeFill = flat(state.gradeFillSF, state.gradeFillDepth || 3, rateBase,  0,        accessBobcat)

  const jjTons    = sfToTons(state.jjSF,    state.jjDepth    || 3)
  const ssCmpTons = sfToTons(state.ssCmpSF, state.ssCmpDepth || 3)
  const jjHrs     = jjTons    > 0 ? jjTons    / rateJJ    : 0
  const ssCmpHrs  = ssCmpTons > 0 ? ssCmpTons / rateSSCmp : 0

  // ── Rebar add-on ─────────────────────────────────────────────────────────
  const rebarHrs = n(state.rebarSF) * (rebarMinPerSF / 60)

  // ── Vegetation — Bobcat access ────────────────────────────────────────────
  const shrubHrs    = n(state.shrubQty)      * accessBobcat * shrubRate
  const stumpFstHrs = n(state.stumpFirstQty) * accessBobcat * stumpFstRate
  const stumpAddHrs = n(state.stumpAddQty)   * accessBobcat * stumpAddRate

  const treeCalc = (state.treeRows || []).map(r => {
    const qty  = n(r.qty), ht = n(r.height) || 10
    const mult = r.size === 'Large' ? treeLarge : r.size === 'Medium' ? treeMed : treeSmall
    const hrs     = qty * ht * accessBobcat * mult
    const tons    = qty * (ht / 10) * 0.25
    const dumpFee = isSub ? 0 : tons * dumpTreeStump   // Mini: $125.33/ton
    return { hrs, tons, dumpFee }
  })

  // ── Manual ────────────────────────────────────────────────────────────────
  const manualRows = (state.manualRows || []).filter(r =>
    n(r.hours) > 0 || n(r.materials) > 0 || n(r.subCost) > 0
  )
  const manualHrs = manualRows.reduce((s, r) => s + n(r.hours), 0)
  const manualMat = manualRows.reduce((s, r) => s + n(r.materials), 0)
  const manualSub = manualRows.reduce((s, r) => s + n(r.subCost), 0)

  // ── Sub Haul cost — per 1.5 tons, goes into subCost (not materials) ──────────
  // DB values (subcontractor_rates category='Sub Haul') take precedence over defaults
  const shConc  = sr['Sub Haul - Concrete'] ?? SUB_HAUL_DEFAULTS.concrete
  const shDirt  = sr['Sub Haul - Dirt']     ?? SUB_HAUL_DEFAULTS.dirt
  const shGrass = sr['Sub Haul - Grass']    ?? SUB_HAUL_DEFAULTS.grass

  const tonsPerCharge = 1.5   // billing increment

  const subHaulCost = isSub ? (
    (conc.tons  / tonsPerCharge) * shConc  +
    (dirt.tons  / tonsPerCharge) * shDirt  +
    (grass.tons / tonsPerCharge) * shGrass +
    miscFlatCalc.reduce((s,r) => s + (r.tons / tonsPerCharge) * shConc,  0) +
    miscVertCalc.reduce((s,r) => s + (r.tons / tonsPerCharge) * shConc,  0) +
    footingCalc.reduce((s,r)  => s + (r.tons / tonsPerCharge) * shConc,  0) +
    (gradeCut.tons / tonsPerCharge) * shDirt
  ) : 0

  // ── Hour aggregation — labor is the same in both modes ────────────────────
  const crewDemoHrs = (
    conc.hours + dirt.hours + base.hours + grass.hours +
    miscFlatCalc.reduce((s,r) => s + r.hours, 0) +
    miscVertCalc.reduce((s,r) => s + r.hours, 0) +
    footingCalc.reduce((s,r)  => s + r.hours, 0) +
    gradeCut.hours
  )
  const gradingHrs = gradeFill.hours + jjHrs + ssCmpHrs
  const vegHrs     = shrubHrs + stumpFstHrs + stumpAddHrs +
    treeCalc.reduce((s,r) => s + r.hrs, 0)

  const rawHrs   = crewDemoHrs + gradingHrs + vegHrs + rebarHrs + manualHrs
  const totalHrs = rawHrs * diff + hrsAdj

  // ── Materials ─────────────────────────────────────────────────────────────
  const dumpMatCost = isSub ? 0 : (
    conc.dumpFee + dirt.dumpFee + base.dumpFee + grass.dumpFee +
    miscFlatCalc.reduce((s,r) => s + r.dumpFee, 0) +
    miscVertCalc.reduce((s,r) => s + r.dumpFee, 0) +
    footingCalc.reduce((s,r)  => s + r.dumpFee, 0) +
    gradeCut.dumpFee +
    treeCalc.reduce((s,r)     => s + r.dumpFee, 0)
  )
  const totalMat = dumpMatCost + manualMat

  // ── Financials ────────────────────────────────────────────────────────────
  const manDays    = totalHrs / 8
  const laborCost  = totalHrs * lrph
  const burden     = laborCost * 0.29
  // GP = labor component + Universal Sub Markup % on sub haul cost
  const gp         = (manDays * gpmd) + (subHaulCost * subMarkupRate)
  const commission = gp * 0.12
  const subCost    = subHaulCost + manualSub
  const price      = laborCost + burden + totalMat + gp + commission + subCost

  return {
    totalHrs, manDays, laborCost, burden, totalMat, subCost, gp, commission, price,
    conc, dirt, base, grass,
    miscFlatCalc, miscVertCalc, footingCalc,
    gradeCut, gradeFill,
    jjTons, ssCmpTons, jjHrs, ssCmpHrs,
    rebarHrs,
    shrubHrs, stumpFstHrs, stumpAddHrs, shrubRate,
    stumpFstRate, stumpAddRate,
    treeCalc,
    crewDemoHrs, gradingHrs, vegHrs, manualHrs,
    dumpMatCost, isSub, subHaulCost,
    dumpConc, dumpDirt, dumpGreen, dumpTreeStump, dumpBase,
    rateConc, rateGrass, rateBase, rateJJ, rateSSCmp, rebarMinPerSF,
    treeSmall, treeMed, treeLarge,
    accessNonBob, accessBobcat,
    shConc, shDirt, shGrass, tonsPerCharge,
  }
}

// ── Default state ─────────────────────────────────────────────────────────────

const DEFAULT_STATE = {
  access:    'OK',
  dumpType:  'In-House',
  difficulty: 0,
  hoursAdj:  0,
  concSF: '', concDepth: 4,
  dirtSF: '', dirtDepth: 6,
  baseSF: '', baseDepth: 4,
  grassSF:'', grassDepth: 2,
  rebarSF: '',
  miscFlatRows: Array(4).fill(null).map(() => ({ label: '', sf: '', depth: 4 })),
  miscVertRows: Array(4).fill(null).map(() => ({ label: '', lf: '', heightIn: '', widthIn: 8 })),
  footingRows:  Array(4).fill(null).map(() => ({ label: '', sf: '', depth: 12 })),
  gradeCutSF:  '', gradeCutDepth:  3,
  gradeFillSF: '', gradeFillDepth: 3,
  jjSF:        '', jjDepth:        3,
  ssCmpSF:     '', ssCmpDepth:     3,
  shrubQty:      '',
  stumpFirstQty: '',
  stumpAddQty:   '',
  treeRows: [
    { qty: '', height: 10, size: 'Small'  },
    { qty: '', height: 10, size: 'Small'  },
    { qty: '', height: 10, size: 'Small'  },
    { qty: '', height: 15, size: 'Medium' },
    { qty: '', height: 20, size: 'Large'  },
  ],
  manualRows: [
    { label: '', hours: '', materials: '', subCost: '' },
    { label: '', hours: '', materials: '', subCost: '' },
  ],
}

// ── UI helpers ────────────────────────────────────────────────────────────────

function SecHdr({ title }) {
  return (
    <p className="col-span-full text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200 pb-1 mt-4 mb-1">
      {title}
    </p>
  )
}

function Inp({ value, onChange, placeholder = '0', type = 'number', step, className = '' }) {
  return (
    <input type={type} value={value} onChange={onChange} placeholder={placeholder} step={step}
      className={`w-full border border-gray-200 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400 ${className}`} />
  )
}

function Sel({ value, onChange, options }) {
  return (
    <select value={value} onChange={onChange}
      className="w-full border border-gray-200 rounded-md px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-400">
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  )
}

function TH({ cols }) {
  return (
    <thead>
      <tr className="text-left text-gray-400 border-b border-gray-100 text-xs">
        {cols.map((c, i) => <th key={i} className={`py-1 pr-2 font-medium ${c.w||''}`}>{c.label}</th>)}
      </tr>
    </thead>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function MiniSkidSteerDemoModule({ initialData, onSave, onCancel }) {
  const [state,            setState]            = useState(() => ({ ...DEFAULT_STATE, ...(initialData||{}) }))
  const [materialPrices,   setMaterialPrices]   = useState(initialData?.materialPrices || {})
  const [laborRates,       setLaborRates]       = useState(initialData?.laborRates     || {})
  const [laborRatePerHour, setLaborRatePerHour] = useState(initialData?.laborRatePerHour ?? 35)
  const [subMarkupRate,    setSubMarkupRate]    = useState(initialData?.subMarkupRate   ?? 0.35)
  const [subRates,         setSubRates]         = useState(initialData?.subRates        || {})
  const [pricesLoading,    setPricesLoading]    = useState(!initialData?.materialPrices)

  useEffect(() => {
    let gone = false
    ;(async () => {
      await Promise.all([
        // Company settings — skip if already loaded via initialData
        !initialData?.laborRatePerHour &&
          supabase.from('company_settings').select('labor_rate_per_hour, sub_markup_rate').single()
            .then(({data}) => {
              if (!gone && data) {
                if (data.labor_rate_per_hour != null) setLaborRatePerHour(parseFloat(data.labor_rate_per_hour)||35)
                if (data.sub_markup_rate    != null) setSubMarkupRate(parseFloat(data.sub_markup_rate)||0.35)
              }
            }),
        // Material rates — always fetch fresh so Master Rates changes are reflected
        supabase.from('material_rates').select('name,unit_cost').eq('category','Demo')
          .then(({data}) => { if (!gone && data) { const m={}; data.forEach(r=>{m[r.name]=parseFloat(r.unit_cost)}); setMaterialPrices(m) } }),
        // Labor rates — skip if already loaded via initialData
        !initialData?.laborRates &&
          supabase.from('labor_rates').select('name,rate,rate_per_day')
            .then(({data}) => { if (!gone && data) { const m={}; data.forEach(r=>{m[r.name]=parseFloat(r.rate??r.rate_per_day)}); setLaborRates(m) } }),
        // Sub haul rates — always fetch fresh so Master Rates changes are reflected
        supabase.from('subcontractor_rates').select('company_name,rate').eq('category','Sub Haul')
          .then(({data}) => { if (!gone && data) { const m={}; data.forEach(r=>{m[r.company_name]=parseFloat(r.rate)}); setSubRates(m) } }),
      ])
      if (!gone) setPricesLoading(false)
    })()
    return () => { gone = true }
  }, [])

  const set    = useCallback((f,v) => setState(p => ({...p,[f]:v})), [])
  const setRow = useCallback((sec,i,f,v) => setState(p => {
    const rows=[...p[sec]]; rows[i]={...rows[i],[f]:v}; return {...p,[sec]:rows}
  }), [])

  const gpmd = initialData?.gpmd ?? 425
  const calc = calcDemo(state, laborRatePerHour, materialPrices, laborRates, subMarkupRate, subRates, gpmd)

  const fmt2 = v => `$${n(v).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}`
  const fmt  = v => `$${Math.round(v).toLocaleString()}`
  const fh   = v => v > 0 ? v.toFixed(2) : '—'
  const isSelf = state.dumpType === 'In-House'

  const { dumpConc, dumpDirt, dumpGreen, dumpTreeStump, dumpBase } = calc

  const td  = 'py-1 pr-2 align-top'
  const num = 'py-1 pr-2 text-gray-600 tabular-nums text-xs'

  function handleSave() {
    onSave({
      man_days:     parseFloat(calc.manDays.toFixed(2)),
      material_cost:parseFloat(calc.totalMat.toFixed(2)),
      labor_cost:   parseFloat(calc.laborCost.toFixed(2)),
      labor_burden: parseFloat(calc.burden.toFixed(2)),
      gross_profit: parseFloat(calc.gp.toFixed(2)),
      sub_cost:     parseFloat(calc.subCost.toFixed(2)),
      total_price:  parseFloat(calc.price.toFixed(2)),
      data: { ...state, laborRatePerHour, gpmd, materialPrices, laborRates,
        calc: { totalHrs:calc.totalHrs, manDays:calc.manDays, laborCost:calc.laborCost,
                burden:calc.burden, totalMat:calc.totalMat, subCost:calc.subCost,
                gp:calc.gp, price:calc.price } },
    })
  }

  return (
    <div className="space-y-4">
      {pricesLoading && <div className="text-xs text-amber-700 bg-amber-50 rounded px-3 py-2">Loading current rates…</div>}

      {/* Settings */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SecHdr title="Settings" />
        <div>
          <p className="text-xs text-gray-500 mb-0.5">Access Level</p>
          <Sel value={state.access} onChange={e=>set('access',e.target.value)} options={Object.keys(NON_BOB_LEVELS)} />
          <p className="text-xs text-gray-400 mt-0.5">Demo: {calc.accessNonBob}× · Bobcat: {calc.accessBobcat}×</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-0.5">Dump Type</p>
          <Sel value={state.dumpType} onChange={e=>set('dumpType',e.target.value)} options={DUMP_TYPES} />
          {!isSelf && <p className="text-xs text-amber-600 mt-0.5">Subcontractor — ${calc.shConc}/1.5T conc · ${calc.shDirt}/1.5T dirt · ${calc.shGrass}/1.5T grass</p>}
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-0.5">Difficulty (%)</p>
          <Inp value={state.difficulty} onChange={e=>set('difficulty',e.target.value)} step="5" />
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-0.5">Hours Adj (±hrs)</p>
          <Inp value={state.hoursAdj} onChange={e=>set('hoursAdj',e.target.value)} step="0.5" />
        </div>
      </div>

      {/* Demolition */}
      <div>
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200 pb-1 mt-4 mb-2">
          Demolition — {calc.rateConc} t/hr{isSelf ? ` · Conc $${dumpConc}/ton · Dirt $${dumpDirt}/ton` : ' · Subcontractor (see sub cost)'}
        </p>
        <table className="w-full text-xs">
          <TH cols={[{label:'Material',w:'w-32'},{label:'SF',w:'w-24'},{label:'Depth (in)',w:'w-20'},{label:'Tons',w:'w-16'},...(isSelf?[{label:'Dump Fee',w:'w-24'}]:[]),{label:'Labor Hrs',w:'w-20'}]} />
          <tbody className="divide-y divide-gray-50">
            {[
              {label:'Concrete',    sfK:'concSF',  dK:'concDepth',  dep:4, row:calc.conc,  fee:dumpConc},
              {label:'Dirt/Rock',   sfK:'dirtSF',  dK:'dirtDepth',  dep:6, row:calc.dirt,  fee:dumpDirt},
              {label:'Import Base', sfK:'baseSF',  dK:'baseDepth',  dep:4, row:calc.base,  fee:dumpBase},
              {label:'Grass/Sod',   sfK:'grassSF', dK:'grassDepth', dep:2, row:calc.grass, fee:dumpGreen},
            ].map(({label,sfK,dK,dep,row,fee})=>(
              <tr key={label}>
                <td className={`${td} font-medium text-gray-700`}>{label}</td>
                <td className={td}><Inp value={state[sfK]} onChange={e=>set(sfK,e.target.value)} /></td>
                <td className={td}><Inp value={state[dK]}  onChange={e=>set(dK, e.target.value)} placeholder={String(dep)} /></td>
                <td className={num}>{row.tons>0?row.tons.toFixed(1):'—'}</td>
                {isSelf && <td className={num}>{row.dumpFee>0?fmt2(row.dumpFee):'—'}</td>}
                <td className={num}>{fh(row.hours)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Rebar add-on */}
        <div className="mt-3 flex items-center gap-3">
          <div className="flex-1 max-w-xs">
            <p className="text-xs text-gray-500 mb-0.5">
              Rebar SF <span className="text-gray-400 font-normal">({calc.rebarMinPerSF} min/SF)</span>
            </p>
            <Inp value={state.rebarSF} onChange={e=>set('rebarSF',e.target.value)} placeholder="0" />
          </div>
          {calc.rebarHrs > 0 && (
            <p className="text-xs text-gray-500 mt-4">+{calc.rebarHrs.toFixed(2)} hrs rebar</p>
          )}
        </div>
      </div>

      {/* Misc Flat */}
      <div>
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200 pb-1 mt-4 mb-2">
          Misc Flat Demo{isSelf ? ` — $${dumpConc}/ton dump fee` : ''}
        </p>
        <table className="w-full text-xs">
          <TH cols={[{label:'Description'},{label:'SF',w:'w-24'},{label:'Depth (in)',w:'w-20'},{label:'Tons',w:'w-16'},...(isSelf?[{label:'Dump Fee',w:'w-24'}]:[]),{label:'Labor Hrs',w:'w-20'}]} />
          <tbody className="divide-y divide-gray-50">
            {state.miscFlatRows.map((r,i)=>{
              const cr=calc.miscFlatCalc[i]||{tons:0,hours:0,dumpFee:0}
              return (<tr key={i}>
                <td className={td}><Inp type="text" value={r.label} onChange={e=>setRow('miscFlatRows',i,'label',e.target.value)} placeholder={`Item ${i+1}`} /></td>
                <td className={td}><Inp value={r.sf}    onChange={e=>setRow('miscFlatRows',i,'sf',   e.target.value)} /></td>
                <td className={td}><Inp value={r.depth} onChange={e=>setRow('miscFlatRows',i,'depth',e.target.value)} placeholder="4" /></td>
                <td className={num}>{cr.tons>0?cr.tons.toFixed(1):'—'}</td>
                {isSelf && <td className={num}>{cr.dumpFee>0?fmt2(cr.dumpFee):'—'}</td>}
                <td className={num}>{fh(cr.hours)}</td>
              </tr>)
            })}
          </tbody>
        </table>
      </div>

      {/* Misc Vertical */}
      <div>
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200 pb-1 mt-4 mb-2">
          Misc Vertical / Structural Demo — LF × Height × Width{isSelf ? ` — $${dumpConc}/ton dump fee` : ''}
        </p>
        <table className="w-full text-xs">
          <TH cols={[{label:'Description'},{label:'LF',w:'w-20'},{label:'H (in)',w:'w-18'},{label:'W (in)',w:'w-18'},{label:'Tons',w:'w-16'},...(isSelf?[{label:'Dump Fee',w:'w-24'}]:[]),{label:'Labor Hrs',w:'w-20'}]} />
          <tbody className="divide-y divide-gray-50">
            {state.miscVertRows.map((r,i)=>{
              const cr=calc.miscVertCalc[i]||{tons:0,hours:0,cf:0,dumpFee:0}
              return (<tr key={i}>
                <td className={td}><Inp type="text" value={r.label} onChange={e=>setRow('miscVertRows',i,'label',  e.target.value)} placeholder={`Item ${i+1}`} /></td>
                <td className={td}><Inp value={r.lf}       onChange={e=>setRow('miscVertRows',i,'lf',      e.target.value)} /></td>
                <td className={td}><Inp value={r.heightIn} onChange={e=>setRow('miscVertRows',i,'heightIn',e.target.value)} placeholder="0" /></td>
                <td className={td}><Inp value={r.widthIn}  onChange={e=>setRow('miscVertRows',i,'widthIn', e.target.value)} placeholder="8" /></td>
                <td className={num}>{cr.tons>0?cr.tons.toFixed(2):'—'}</td>
                {isSelf && <td className={num}>{cr.dumpFee>0?fmt2(cr.dumpFee):'—'}</td>}
                <td className={num}>{fh(cr.hours)}</td>
              </tr>)
            })}
          </tbody>
        </table>
      </div>

      {/* Footing */}
      <div>
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200 pb-1 mt-4 mb-2">
          Footing Demo — SF × Depth{isSelf ? ` — $${dumpConc}/ton dump fee` : ''}
        </p>
        <table className="w-full text-xs">
          <TH cols={[{label:'Description'},{label:'SF',w:'w-24'},{label:'Depth (in)',w:'w-20'},{label:'Tons',w:'w-16'},...(isSelf?[{label:'Dump Fee',w:'w-24'}]:[]),{label:'Labor Hrs',w:'w-20'}]} />
          <tbody className="divide-y divide-gray-50">
            {state.footingRows.map((r,i)=>{
              const cr=calc.footingCalc[i]||{tons:0,hours:0,dumpFee:0}
              return (<tr key={i}>
                <td className={td}><Inp type="text" value={r.label} onChange={e=>setRow('footingRows',i,'label',e.target.value)} placeholder={`Footing ${i+1}`} /></td>
                <td className={td}><Inp value={r.sf}    onChange={e=>setRow('footingRows',i,'sf',   e.target.value)} /></td>
                <td className={td}><Inp value={r.depth} onChange={e=>setRow('footingRows',i,'depth',e.target.value)} placeholder="12" /></td>
                <td className={num}>{cr.tons>0?cr.tons.toFixed(2):'—'}</td>
                {isSelf && <td className={num}>{cr.dumpFee>0?fmt2(cr.dumpFee):'—'}</td>}
                <td className={num}>{fh(cr.hours)}</td>
              </tr>)
            })}
          </tbody>
        </table>
      </div>

      {/* Grading */}
      <div>
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200 pb-1 mt-4 mb-2">Grading</p>
        <table className="w-full text-xs">
          <TH cols={[{label:'Operation',w:'w-44'},{label:'SF',w:'w-24'},{label:'Depth (in)',w:'w-20'},{label:'Tons',w:'w-16'},{label:'Labor Hrs',w:'w-20'}]} />
          <tbody className="divide-y divide-gray-50">
            {[
              {label:'Grade Cut',                sfK:'gradeCutSF',  dK:'gradeCutDepth',  dep:3, tons:calc.gradeCut.tons,  hrs:calc.gradeCut.hours,  note:`${calc.rateConc} t/hr`},
              {label:'Grade Fill',               sfK:'gradeFillSF', dK:'gradeFillDepth', dep:3, tons:calc.gradeFill.tons, hrs:calc.gradeFill.hours, note:`${calc.rateBase} t/hr`},
              {label:'Jumping Jack',             sfK:'jjSF',        dK:'jjDepth',        dep:3, tons:calc.jjTons,         hrs:calc.jjHrs,           note:`${calc.rateJJ} t/hr`},
              {label:'Mini SS Compact (4" Max)', sfK:'ssCmpSF',     dK:'ssCmpDepth',     dep:3, tons:calc.ssCmpTons,      hrs:calc.ssCmpHrs,        note:`${calc.rateSSCmp} t/hr`},
            ].map(({label,sfK,dK,dep,tons,hrs,note})=>(
              <tr key={label}>
                <td className={`${td} font-medium text-gray-700`}>
                  {label} <span className="text-gray-400 font-normal">({note})</span>
                </td>
                <td className={td}><Inp value={state[sfK]} onChange={e=>set(sfK,e.target.value)} /></td>
                <td className={td}><Inp value={state[dK]}  onChange={e=>set(dK, e.target.value)} placeholder={String(dep)} /></td>
                <td className={num}>{tons>0?tons.toFixed(1):'—'}</td>
                <td className={num}>{fh(hrs)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Shrub & Stump */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <SecHdr title="Shrub & Stump Demo" />
        {[
          {label:'Shrubs (qty)',       key:'shrubQty',      hrs:calc.shrubHrs,    sub:`${calc.accessBobcat}× × ${calc.shrubRate} hrs/ea`},
          {label:'Stump Grind 1st',    key:'stumpFirstQty', hrs:calc.stumpFstHrs, sub:`${calc.accessBobcat}× × ${calc.stumpFstRate} hrs`},
          {label:"Stump Grind Add'l",  key:'stumpAddQty',   hrs:calc.stumpAddHrs, sub:`${calc.accessBobcat}× × ${calc.stumpAddRate} hrs`},
        ].map(({label,key,hrs,sub})=>(
          <div key={key}>
            <p className="text-xs text-gray-500 mb-0.5">{label}</p>
            <Inp value={state[key]} onChange={e=>set(key,e.target.value)} />
            <p className="text-xs text-gray-400 mt-0.5">{hrs>0?`${hrs.toFixed(2)} hrs — ${sub}`:sub}</p>
          </div>
        ))}
      </div>

      {/* Trees */}
      <div>
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200 pb-1 mt-4 mb-2">
          Tree Demo — qty × height × {calc.accessBobcat}× access × size multiplier
          <span className="ml-2 font-normal normal-case text-gray-400">
            (S:{calc.treeSmall} · M:{calc.treeMed} · L:{calc.treeLarge} hrs/ft)
          </span>
          {isSelf && <span className="ml-2 font-normal normal-case text-gray-400">· ${dumpTreeStump}/ton tree/stump dump</span>}
        </p>
        <table className="w-full text-xs">
          <TH cols={[{label:'Qty',w:'w-16'},{label:'Height (ft)',w:'w-24'},{label:'Size',w:'w-28'},{label:'Labor Hrs',w:'w-20'},...(isSelf?[{label:'Dump Fee',w:'w-24'}]:[])]} />
          <tbody className="divide-y divide-gray-50">
            {state.treeRows.map((r,i)=>{
              const cr=calc.treeCalc[i]||{hrs:0,dumpFee:0}
              return (<tr key={i}>
                <td className={td}><Inp value={r.qty}    onChange={e=>setRow('treeRows',i,'qty',   e.target.value)} /></td>
                <td className={td}><Inp value={r.height} onChange={e=>setRow('treeRows',i,'height',e.target.value)} placeholder="10" /></td>
                <td className={td}><Sel value={r.size}   onChange={e=>setRow('treeRows',i,'size',  e.target.value)} options={['Small','Medium','Large']} /></td>
                <td className={num}>{fh(cr.hrs)}</td>
                {isSelf && <td className={num}>{cr.dumpFee>0?fmt2(cr.dumpFee):'—'}</td>}
              </tr>)
            })}
          </tbody>
        </table>
      </div>

      {/* Manual */}
      <div>
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200 pb-1 mt-4 mb-2">Manual Entry</p>
        <table className="w-full text-xs">
          <TH cols={[{label:'Description'},{label:'Hours',w:'w-20'},{label:'Materials ($)',w:'w-28'},{label:'Sub Cost ($)',w:'w-28'}]} />
          <tbody className="divide-y divide-gray-50">
            {state.manualRows.map((r,i)=>(
              <tr key={i}>
                <td className={td}><Inp type="text" value={r.label}     onChange={e=>setRow('manualRows',i,'label',    e.target.value)} placeholder="Description" /></td>
                <td className={td}><Inp value={r.hours}     onChange={e=>setRow('manualRows',i,'hours',    e.target.value)} step="0.5" /></td>
                <td className={td}><Inp value={r.materials} onChange={e=>setRow('manualRows',i,'materials',e.target.value)} step="1" /></td>
                <td className={td}><Inp value={r.subCost}   onChange={e=>setRow('manualRows',i,'subCost',  e.target.value)} step="1" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* GPMD summary bar */}
      <GpmdBar
        totalMat={calc.totalMat}
        totalHrs={calc.totalHrs}
        manDays={calc.manDays}
        laborCost={calc.laborCost}
        laborRatePerHour={laborRatePerHour}
        burden={calc.burden}
        gp={calc.gp}
        commission={calc.commission}
        subCost={calc.subCost}
        gpmd={gpmd}
        price={calc.price}
      />

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <button onClick={handleSave} className="flex-1 bg-gray-900 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-gray-700 transition-colors">Save Module</button>
        <button onClick={onCancel}   className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">Cancel</button>
      </div>
    </div>
  )
}
