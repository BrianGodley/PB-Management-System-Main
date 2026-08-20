import WorkTypeChooser from './WorkTypeChooser'
import CrewTypeBar from './CrewTypeBar'
import ModuleHeaderSlot from './ModuleHeaderSlot'
import { useState, useEffect, useCallback, useContext } from 'react'
import { SubTabContext, subSectionTitle } from './subTabContext'
import { supabase } from '../../lib/supabase'
import GpmdBar from './GpmdBar'
import DropdownSelect from '../DropdownSelect'
import MissingPriceModal from '../MissingPriceModal'
import { fetchSalesTaxRate } from '../../lib/companyDefaults'
import { calcWalkAccessLabor } from '../../lib/walkAccess'
import { groutCyPerBlock as cmuGroutCyPerBlock } from '../../lib/cmuGrout'
import { cmuStructQuantities, cmuStructTotals, pipFormSf, brickCore, timberCore } from './wallsStruct'
import {
  computeWallFinishRow as _finishRow,
  computeCapRow as _capRow,
  computeWpRow as _wpRow,
} from './wallsCalc'
import { wallDrain, wallBackfill, wallDemo } from './wallsSections'
import {
  useNewMaterialCatalog,
  resolveMaterialPrice,
} from '../../lib/materialCatalog'

const WALLS_CATEGORY = 'Walls'
// Shared cross-module basics (rebar, concrete, grout pump) live here so vendor
// price changes propagate into Walls too.
const BASIC_CATEGORY = 'Basic Materials'
// Loaded so the per-wall Demo calc reads the SAME Demo labor_rates + misc_rates
// (Dirt SF labor, container price/capacity, swell) as the standalone Demo
// modules — single source of truth. Only affects the merged rate map `mp`; the
// wall vendor/type pickers filter by wall sub-categories, so Demo materials
// never appear in them.
const DEMO_CATEGORY = 'Demo'
// Loaded so the per-wall Drainage (French Drain) calc reads the SAME Drainage
// rate rows (perforated pipe material/labor, fabric, gravel bed) as the standalone
// Drainage module — one shared source of truth. Only affects the merged rate map
// `mp`; the wall vendor/type pickers filter by wall sub-categories, so Drainage
// materials never appear in them.
const DRAINAGE_CATEGORY = 'Drainage'

// Explicit View Rates scope (mirrors Fire Pit) so Walls surfaces every rate it uses
// — not just what module_category_map happens to list. `{ category: 'Walls' }` is the
// full own category (caps, finishes, waterproofing, install + footing + grout labor);
// the rest are the exact BORROWED (category, sub-category) pairs the calc reads from
// other modules, so their material AND labor are editable right here. Passed to
// CrewTypeBar as rateScope. (Grout-pump SETUP/PER-CY are Basic Materials misc with no
// sub-category, so they stay editable in Master Rates / Basic Materials.)
const WALLS_RATE_SCOPE = [
  { category: 'Walls' },
  { category: 'Basic Materials', sub: 'Aggregate & Concrete' }, // footing / wall concrete
  { category: 'Basic Materials', sub: 'Grout' }, // grout material
  { category: 'Basic Materials', sub: 'Reinforcement' }, // rebar #3–#8
  { category: 'Concrete', sub: 'Concrete Mix' }, // Poured-in-Place mix
  { category: 'Drainage', sub: 'French Drain Pipe' }, // drain pipe / sock / gravel / fabric material
  { category: 'Drainage', sub: 'French Drain' }, // drain install labor
  // Walls borrows only a handful of rates from each fat Demo method sub (Slope
  // Removal = Dirt SF, Backfill = Grade Fill SF, Hand compaction = JJ SF). `only`
  // surfaces JUST those in View Rates so the tree/stump/haul/grade-cut/etc. rows
  // the module never touches don't clutter the table (walls-orphan-rates guard).
  { category: 'Demo', sub: 'Hand Demo', only: ['Demo - Hand - Dirt SF', 'Demo - Hand - Grade Fill SF', 'Demo - Hand - JJ SF'] },
  { category: 'Demo', sub: 'Mini Skid Steer Demo', only: ['Demo - Mini - Dirt SF', 'Demo - Mini - Grade Fill SF'] },
  { category: 'Demo', sub: 'Skid Steer Demo', only: ['Demo - Skid - Dirt SF', 'Demo - Skid - Grade Fill SF'] },
]

// ─────────────────────────────────────────────────────────────────────────────
// Walls Module — CMU Block | Poured In Place | Timber/Lumber
// CMU and PIP support multiple wall entries that sum into module totals.
// ─────────────────────────────────────────────────────────────────────────────

// ── CMU Block Type catalog ──────────────────────────────────────────────────
// Mirrors the "CmuBlockPrices" table on the Master Rates & Calcs sheet of the
// legacy Estimator Master workbook. The Excel wall sheet uses a single
// dropdown (cell E8) keyed by NAME, then VLOOKUPs the W/H/L (in inches),
// SPEC (blocks per spec-mix bag — not used by the PBS calc yet, kept for
// future parity) and unit price. We keep the same column shape here so any
// future migration to a DB-backed master rate table is mechanical.
//
// Grout cubic-yards per block is derived per block type from W/H/L exactly
// like the Excel formula: cells (L-2) × H × (W-2) inches³ → cubic yards.
const CMU_BLOCK_TYPES = [
  { name: '8x8x16 (GREY)', w: 8, h: 8, l: 16, spec: 24 },
  { name: '8x8x16 SPLITFACE', w: 8, h: 8, l: 16, spec: 24 },
  { name: '8x8x16 (COLOR)', w: 8, h: 8, l: 16, spec: 24 },
  { name: '8x6x16 SLUMP (GREY)', w: 8, h: 6, l: 16, spec: 20 },
  { name: '8x6x16 SLUMP (COLOR)', w: 8, h: 6, l: 16, spec: 20 },
  { name: '12x8x16 (GREY)', w: 12, h: 8, l: 16, spec: 16 },
  { name: '12x8x16 SPLITFACE', w: 12, h: 8, l: 16, spec: 16 },
  { name: '12x8x16 (COLOR)', w: 12, h: 8, l: 16, spec: 16 },
  { name: '12x6x16 SLUMP (COLOR)', w: 12, h: 6, l: 16, spec: 14 },
  { name: '12x6x16 SLUMP (GREY)', w: 12, h: 6, l: 16, spec: 14 },
  { name: '6x8x16 (GREY)', w: 6, h: 8, l: 16, spec: 28 },
  { name: '6x8x16 SPLITFACE', w: 6, h: 8, l: 16, spec: 28 },
  { name: '6x8x16 (COLOR)', w: 6, h: 8, l: 16, spec: 28 },
  { name: '6x6x16 SLUMP (COLOR)', w: 6, h: 6, l: 16, spec: 26 },
  { name: '6x6x16 SLUMP (GREY)', w: 6, h: 6, l: 16, spec: 26 },
]
const DEFAULT_BLOCK_NAME = '8x8x16 (GREY)'
function blockByName(name) {
  return CMU_BLOCK_TYPES.find(b => b.name === name) || CMU_BLOCK_TYPES[0]
}
// Master-rates row name for a given block type. If an admin overrides the
// price via RateEditPopover the row is stored under this name in the
// material_rates table (category='Walls'). When no override exists, the
// calc falls back to the catalog's default price.
function wallBlockRateName(name) {
  return `Wall Block ${name}`
}
function groutCyPerBlock(b) {
  // Standardized grout fill: fixed cu-ft per block by size (0.5 for 8" wide,
  // 0.4 for 6" wide), ÷ 27 → CY. Shared across all CMU modules via cmuGrout.js.
  return cmuGroutCyPerBlock(b.w, b.h)
}

const WALL_RATES = {
  // Basics resolve from the shared "Basic Materials" catalog so vendor price
  // changes propagate. Fallbacks equal the seeded values → price-preserving.
  rebar: { db: 'Rebar' }, // $/LF (Basic Materials) — Brick/Timber only
  // Sized rebar material prices (per LF, Standard). CMU + PIP pick a size per
  // wall/footing; labor for ALL rebar stays the shared rebarLab ('Set Rebar').
  rebar3Mat: { db: 'Rebar #3' },
  rebar4Mat: { db: 'Rebar #4' },
  rebar5Mat: { db: 'Rebar #5' },
  rebar6Mat: { db: 'Rebar #6' },
  rebar8Mat: { db: 'Rebar #8' },
  concreteHand: { db: 'Concrete - Hand Mix' }, // $/CY (Basic Materials)
  concreteTruck: { db: 'Concrete - Ready Mix (Truck)' }, // $/CY (Basic Materials)
  groutPumpSetup: { db: 'Grout Pump - Setup' }, // Basic Materials
  groutPumpPerYd: { db: 'Grout Pump - Per CY' }, // Basic Materials
  digLab: { db: 'Wall Dig Footing Labor Rate' },
  rebarLab: { db: 'Wall Set Rebar Labor Rate' },
  blockLab: { db: 'Wall Set Block Labor Rate' },
  handGroutLab: { db: 'Wall Hand Grout Labor Rate' },
  pumpGroutLab: { db: 'Wall Pump Grout Labor Rate' },
  setupCleanLab: { db: 'Wall Setup Clean Labor Rate' },
  sandStucco: { db: 'Sand Stucco' },
  smoothStucco: { db: 'Smooth Stucco' },
  ledgerstone: { db: 'Ledgerstone' },
  stackedStone: { db: 'Stacked Stone' },
  tile: { db: 'Tile' },
  flagstone: { db: 'Real Flagstone' },
  realStone: { db: 'Real Stone' },
  sandStuccoLab: { db: 'Sand Stucco - Wall Labor Rate' },
  smoothStuccoLab: { db: 'Smooth Stucco - Wall Labor Rate' },
  ledgerstoneLab: { db: 'Ledgerstone - Wall Labor Rate' },
  stackedStoneLab: { db: 'Stacked Stone - Wall Labor Rate' },
  tileLab: { db: 'Tile - Wall Labor Rate' },
  flagstoneLab: { db: 'Real Flagstone - Wall Labor Rate' },
  realStoneLab: { db: 'Real Stone - Wall Labor Rate' },
  capFlagstone: { db: 'Wall Cap Flagstone' },
  capPrecast: { db: 'Wall Cap Precast' },
  capBullnose: { db: 'Wall Cap Bullnose Brick' },
  wpPrimerMembrane: { db: 'Wall WP Primer Membrane' },
  wp3CoatRollOn: { db: 'Wall WP 3 Coat Roll On' },
  wpThoroseal: { db: 'Wall WP Thoroseal Roll On' },
  wpDimpleMembrane: { db: 'Wall WP Dimple Membrane' },
  // Cap + waterproofing install labor (editable; fallbacks = the original
  // hard-coded coefficients so totals don't move until a rate is changed).
  capFlagstoneLab: { db: 'Wall Cap Flagstone Labor' }, // hr/LF
  capPrecastLab: { db: 'Wall Cap Precast Labor' }, // hr/ea
  capPipLab: { db: 'Wall Cap PIP Concrete Labor' }, // hr/LF
  capBullnoseLab: { db: 'Wall Cap Bullnose Labor' }, // hr/LF
  wpLabor: { db: 'Wall WP Install Labor' }, // SF/hr
  wpLabPrimerMembrane: { db: 'Wall WP Primer + Membrane Labor' }, // SF/hr
  wpLab2Coat: { db: 'Wall WP 2 Coats Roll On Labor' }, // SF/hr
  wpLabThoroseal: { db: 'Wall WP Thoroseal Labor' }, // SF/hr
  wpLabDimple: { db: 'Wall WP Dimple Labor' }, // SF/hr
  brickLayLab: { db: 'Wall Brick Lay Labor' }, // hr/SF of brick wall face
  // Timber / Lumber wall — every coefficient is table-driven (fb = legacy value).
  timberBdftBase: { db: 'Wall Timber Qty per LF' }, // wood units / LF (base)
  timberBdftCourse: { db: 'Wall Timber Qty per Added Course' }, // wood units / LF / course
  timberLfLab: { db: 'Wall Timber LF Labor' }, // hr / LF (base)
  timberCourseLab: { db: 'Wall Timber Added Course Labor' }, // hr / LF / course
  timberPostMat: { db: 'Wall Timber Steel Post' }, // $ / post
  timberPostLab: { db: 'Wall Timber Steel Post Labor' }, // hr / post
  // ── Structural coefficients (were hard-coded in the calc functions; fb =
  // legacy value so totals are unchanged until a rate is seeded/edited). ──────
  blockOrderWaste: { db: 'Wall Block Order Waste' }, // order multiplier (grey + BB)
  // Footing horizontal-rebar wrap/waste factor (+10% for wraps). Applied to the
  // footing horizontal rebar LF in the CMU + PIP calcs. Table-driven so the waste
  // % is tunable; fb = the legacy 1.1 so totals are unchanged until edited.
  footingRebarWaste: { db: 'Wall Footing Rebar Waste' }, // × (order/wrap multiplier)
  footingPourLab: { db: 'Wall Footing Pour Labor Rate' }, // CY / hr (pour productivity) — legacy, kept for back-compat
  // Footing pour labor split by method. The wall's Footing Pump toggle selects
  // which one drives the calc. Both seeded to the legacy footingPourLab value so
  // existing estimates don't move until a rate is edited.
  footingPourHandLab: { db: 'Wall Hand Pour Footing Labor Rate' }, // CY / hr (hand pour)
  footingPourPumpLab: { db: 'Wall Pump Footing Labor Rate' }, // CY / hr (pump pour)
  // Modular wall install labor — split OUT of CMU's blockLab so the two are
  // independent. fb equals blockLab's so totals are unchanged until edited.
  modularInstallLab: { db: 'Wall Modular Install Labor Rate' }, // blk / hr
  // Footing EXCAVATION is no longer part of the wall build (footing input fields
  // only drive install + material). All footing digging is priced in the per-wall
  // "Dig and Haul Footing Soil" section: a flat CF/hr dig rate + a soil-haul
  // (container) material cost. Every value is table-driven.
  footingDigHaulLab: { db: 'Wall Footing Dig+Haul Labor Rate' }, // CF / hr (dig + load — Hand)
  footingDigHaulExcavLab: { db: 'Wall Footing Dig+Haul Excavator Labor Rate' }, // CF / hr (Excavator)
  footingSoilSwell: { db: 'Wall Footing Soil Swell' }, // loose/broken swell factor
  footingSoilContainerCy: { db: 'Wall Footing Soil Container CY' }, // CY per haul container
  footingSoilContainerPrice: { db: 'Wall Footing Soil Container Price' }, // $ per container
  footingSoilTonsPerCy: { db: 'Wall Footing Soil Tons per CY' }, // tons per loose CY (display)
  curveLab: { db: 'Wall Curve Labor Factor' }, // factor on struct hrs per % curved
  // Poured-In-Place stem coefficients.
  pipFormLab: { db: 'Wall PIP Install Labor' }, // hr / SF of form — canonical PIP labor (shared w/ Columns + Fire Pit)
  pipStemCyPerLf: { db: 'Wall PIP Stem CY per LF' }, // CY / LF (base course)
  pipStemCyPerLfCourse: { db: 'Wall PIP Stem CY per LF per Course' }, // CY / LF / added course
  // Wall-finish material coefficients (waste / setting-bed / coverage / extras).
  ledgerWaste: { db: 'Wall Ledgerstone Waste' }, // material order multiplier
  ledgerSetSfPerUnit: { db: 'Wall Ledgerstone Setting SF per Unit' }, // SF per setting unit
  ledgerSetUnitCost: { db: 'Wall Ledgerstone Setting Unit Cost' }, // $ per setting unit
  ledgerSubExtraPerSf: { db: 'Wall Ledgerstone Sub Extra per SF' }, // $ / SF (sub flat)
  stackedWaste: { db: 'Wall Stacked Stone Waste' }, // material order multiplier
  stackedSetSfPerUnit: { db: 'Wall Stacked Stone Setting SF per Unit' }, // SF per setting unit
  stackedSetUnitCost: { db: 'Wall Stacked Stone Setting Unit Cost' }, // $ per setting unit
  stackedSubExtraPerSf: { db: 'Wall Stacked Stone Sub Extra per SF' }, // $ / SF (sub flat)
  tileExtraPerSf: { db: 'Wall Tile Extra per SF' }, // $ / SF (thinset/grout)
  flagstoneSfPerTon: { db: 'Wall Real Flagstone SF per Ton' }, // SF coverage per ton
  flagstoneExtraPerSf: { db: 'Wall Real Flagstone Extra per SF' }, // $ / SF (setting)
  realStoneSfPerTon: { db: 'Wall Real Stone SF per Ton' }, // SF coverage per ton
  realStoneExtraPerSf: { db: 'Wall Real Stone Extra per SF' }, // $ / SF (setting)
  // ── Per-wall Demo (Slope Removal + Footing Demo). Hours, tons and dump fees
  // reuse the referenced Demo modules' DIRT calc EXACTLY. Every coefficient is
  // table-driven (fb = the value copied from the referenced Demo module) and is
  // read through the merged rate map — category 'Demo' is loaded into `mp` so a
  // Demo rate edited in Master Rates flows straight here. NO hard-coded numbers.
  //   hours = (sf/100) × thickIn × <dirt SF labor rate for method>  (ALL methods)
  //   tons  = (sf / denom) × thickIn
  //   dump  = ceil(removalYards / containerCy) × containerPrice, where
  //           removalYards = (sf × (thickIn/12) / 27) × swell
  // Excavator shares Mini Skid's rates; Footing Demo offers Hand + Excavator.
  demoHandDirt: { db: 'Demo - Hand - Dirt SF' }, // hr per 100 SF·in (HandDemoModule sfLaborHrs)
  demoMiniDirt: { db: 'Demo - Mini - Dirt SF' }, // hr per 100 SF·in (MiniSkidSteerDemoModule; Excavator shares)
  demoSkidDirt: { db: 'Demo - Skid - Dirt SF' }, // hr per 100 SF·in (SkidSteerDemoModule)
  // Backfilling & Compaction — SHARED with the Demo module's Grade Fill rates
  // (per equipment; Excavator uses Mini) and Jumping Jack rate. hr per 100 SF·in.
  backfillHandGF: { db: 'Demo - Hand - Grade Fill SF' },
  backfillMiniGF: { db: 'Demo - Mini - Grade Fill SF' },
  backfillSkidGF: { db: 'Demo - Skid - Grade Fill SF' },
  compJJ: { db: 'Demo - Hand - JJ SF' }, // Jumping Jack; Hand compaction = handCompactionMult× this
  // Hand compaction productivity relative to Jumping Jack (Hand = 3× the JJ hrs).
  // Table-driven multiplier; fb = the legacy 3 so totals are unchanged until edited.
  handCompactionMult: { db: 'Wall Hand Compaction Multiplier' }, // × (on JJ rate)
  demoSfToTonsDenom: { db: 'Demo SF to Tons Denom' }, // sfToTons: (sf / 200) × depthIn (all Demo modules)
  // Container removal (dump) — per method (misc_rates, category Demo).
  demoHandContainer: { db: 'Demo - Hand Container (Low-Boy)' }, // $ per container
  demoHandContainerCy: { db: 'Demo - Hand Container Capacity (CY)' }, // CY per container
  demoHandSwell: { db: 'Demo - Hand Removal Swell' }, // broken-material swell factor
  demoMiniContainer: { db: 'Demo - Mini Container (Low-Boy)' }, // $ per container (Excavator shares)
  demoMiniContainerCy: { db: 'Demo - Mini Container Capacity (CY)' }, // CY per container
  demoMiniSwell: { db: 'Demo - Mini Removal Swell' }, // swell factor
  demoSkidContainer: { db: 'Demo - Skid Container (Low-Boy)' }, // $ per container
  demoSkidContainerCy: { db: 'Demo - Skid Container Capacity (CY)' }, // CY per container
  demoSkidSwell: { db: 'Demo - Skid Removal Swell' }, // swell factor
  // ── Per-wall Drainage (French Drain). Shares the Drainage module's rate rows
  // (category 'Drainage') so a rate edited in either place changes the one shared
  // row. fb = the Drainage module's Standard values. Read through the merged rate
  // map (category 'Drainage' is loaded into `mp`). NO hard-coded numbers.
  drainPerf4Mat: { db: '4" Perforated Pipe' }, // $/LF material
  drainPerf3Mat: { db: '3" Perforated Pipe' }, // $/LF material
  drainPerf4Lab: { db: 'Drainage 4" Perforated Pipe Labor' }, // hr/LF
  drainPerf3Lab: { db: 'Drainage 3" Perforated Pipe Labor' }, // hr/LF
  drainSockMat: { db: 'Drainage Drain Sock Material' }, // $/LF
  drainSockLab: { db: 'Drainage Drain Sock Labor' }, // $/LF (converted to hrs)
  drainBurritoMat: { db: 'Drainage Burrito Wrap Material' }, // $/LF
  drainBurritoLab: { db: 'Drainage Burrito Wrap Labor' }, // $/LF
  drainGravel12Mat: { db: 'Drainage Gravel Bed 12in Material' }, // $/LF
  drainGravel12Lab: { db: 'Drainage Gravel Bed 12in Labor' }, // $/LF
  drainGravel24Mat: { db: 'Drainage Gravel Bed 24in Material' }, // $/LF
  drainGravel24Lab: { db: 'Drainage Gravel Bed 24in Labor' }, // $/LF
}

// Rebar sizes offered per wall/footing (CMU + PIP). Each maps to its own material
// price key in WALL_RATES; labor stays the shared rebarLab. rebarPrice resolves the
// $/LF for a size through `r` (defaulting to #4 if a legacy value is missing).
const REBAR_SIZES = ['#3', '#4', '#5', '#6', '#8']
const REBAR_SIZE_KEY = { '#3': 'rebar3Mat', '#4': 'rebar4Mat', '#5': 'rebar5Mat', '#6': 'rebar6Mat', '#8': 'rebar8Mat' }
const rebarPrice = (size, r) => r(REBAR_SIZE_KEY[size] || 'rebar4Mat')

// Per-wall Drainage (French Drain) option lists + blank fields. Spread into every
// wall's DEFAULT_* and hydrated onto loaded walls so old estimates open with an
// empty (0-cost) Drainage section.
const DRAIN_PIPE_TYPES = ['4" Perforated', '3" Perforated']
const DRAIN_FABRIC_OPTS = ['None', 'Drain Sock', 'Burrito Wrap']
const DRAIN_GRAVEL_OPTS = ['None', '12"', '24"']
const DRAIN_DEFAULTS = () => ({
  drainType: '4" Perforated',
  drainLf: '',
  drainFabric: 'None',
  drainGravel: 'None',
})

// Per-wall Drainage / Backfill / Demo section math lives in the pure, unit-tested
// wallsSections.js (imported above). UI arrays + defaults stay here.

// ── Backfilling & Compaction ── shares the Hand Demo module's Grade Fill rate
// (per equipment; Excavator = Mini Skid) and its Jumping Jack rate. All SF-based
// like the Demo module: hours = (sf/100) × depthIn × rate, where sf = Length ×
// (Width/12). Hand compaction = 3× the Jumping Jack rate. In-House only.
const BACKFILL_METHODS = ['Hand', 'Mini Skid', 'Skid Steer', 'Excavator']
const COMPACTION_METHODS = ['Hand', 'Jumping Jack']
const BACKFILL_DEFAULTS = () => ({
  bkLen: '',
  bkWidth: '',
  bkDepth: '',
  bkMethod: 'Hand',
  bkCompMethod: 'Jumping Jack',
})
// Method pickers for the per-wall Demo section (Slope Removal has 4 options,
// Footing Demo has 2). Kept module-level so the entry components share them.
const DEMO_SLOPE_METHODS = ['Hand', 'Mini Skid', 'Skid Steer', 'Excavator']
const DEMO_FOOT_METHODS = ['Hand', 'Excavator']

// Blank per-wall Demo fields. Added to every wall's DEFAULT_* and hydrated onto
// loaded walls so old estimates open with an empty (0-hour) Demo section.
const DEMO_DEFAULTS = () => ({
  demoSlopeMethod: 'Hand',
  demoSlopeLf: '',
  demoSlopeH: '',
  demoSlopeD: '',
  demoFootMethod: 'Hand',
  demoFootLen: '',
  demoFootW: '',
  demoFootD: '',
})

// Demo hours + tons + dump fee for ONE wall's Demo section — reuses the Demo
// modules' DIRT math EXACTLY, table-driven via `r`. Each part converts to (area
// SF, thickness in) then applies, for EVERY method:
//   • hours = (sf/100) × thickIn × <dirt SF labor rate for method>  (sfLaborHrs)
//   • tons  = (sf / denom) × thickIn                                 (sfToTons)
//   • dump  = ceil(removalYards / containerCy) × containerPrice, where
//             removalYards = (sf × (thickIn/12) / 27) × swell
// Method → the Demo module rate keys it reuses (Excavator shares Mini Skid's).
// wallDemo now lives in wallsSections.js (imported above).

// Rate catalog for the "View Rates" popup, BROKEN DOWN BY WALL TYPE. Each item:
// [WALL_RATES key, label, category, unit, mode]. mode 'coefficient' → labor_rates;
// else material_rates. `blocks:true` prepends the CMU block-type price list.
// Finishes / Caps / Waterproofing are shown once (they apply to every wall type).
const WALL_RATE_SPECS = [
  {
    group: 'CMU Block',
    catalogSubcat: 'Wall Block',
    manualOrder: true, // keep the Labor order below as-is (don't auto-alphabetize)
    items: [
      ['concreteHand', 'Concrete — Hand Mix', 'Basic Materials', 'CY', 'currency'],
      ['concreteTruck', 'Concrete — Ready Mix (Truck)', 'Basic Materials', 'CY', 'currency'],
      ['groutPumpSetup', 'Grout Pump — Setup', 'Basic Materials', 'flat', 'currency'],
      ['groutPumpPerYd', 'Grout Pump — Per CY', 'Basic Materials', 'CY', 'currency'],
      ['footingPourPumpLab', 'Pump Pour Footing', 'Walls', 'CY/hr', 'coefficient'],
      ['footingPourHandLab', 'Hand Pour Footing', 'Walls', 'CY/hr', 'coefficient'],
      ['pumpGroutLab', 'Pump Fill Grout', 'Walls', 'CF/hr', 'coefficient'],
      ['handGroutLab', 'Hand Fill Grout', 'Walls', 'CF/hr', 'coefficient'],
      ['rebarLab', 'Set Rebar', 'Walls', 'LF/hr', 'coefficient'],
      ['footingRebarWaste', 'Footing Rebar Waste/Wrap', 'Walls', '×', 'coefficient'],
      ['blockLab', 'CMU Block Install', 'Walls', 'blk/hr', 'coefficient'],
      ['setupCleanLab', 'Setup / Clean', 'Walls', 'LF/hr', 'coefficient'],
    ],
  },
  {
    group: 'Poured In Place',
    items: [
      ['concreteTruck', 'Concrete — Ready Mix (Truck)', 'Basic Materials', 'CY', 'currency'],
      ['concreteHand', 'Concrete — Hand Mix', 'Basic Materials', 'CY', 'currency'],
      ['pipFormLab', 'Pour in Place Install (per SF of form)', 'Walls', 'hr/Sq Ft', 'coefficient'],
      ['rebarLab', 'Set Rebar', 'Walls', 'LF/hr', 'coefficient'],
      ['footingRebarWaste', 'Footing Rebar Waste/Wrap', 'Walls', '×', 'coefficient'],
      ['footingPourHandLab', 'Hand Pour Footing', 'Walls', 'CY/hr', 'coefficient'],
      ['footingPourPumpLab', 'Pump Pour Footing', 'Walls', 'CY/hr', 'coefficient'],
    ],
  },
  {
    group: 'Modular',
    catalogSubcat: 'Modular Wall',
    items: [
      ['concreteHand', 'Footing Concrete — Hand Mix', 'Basic Materials', 'CY', 'currency'],
      ['concreteTruck', 'Footing Concrete — Ready Mix', 'Basic Materials', 'CY', 'currency'],
      ['groutPumpSetup', 'Footing Pump — Setup', 'Basic Materials', 'flat', 'currency'],
      ['footingPourHandLab', 'Hand Pour Footing', 'Walls', 'CY/hr', 'coefficient'],
      ['footingPourPumpLab', 'Pump Pour Footing', 'Walls', 'CY/hr', 'coefficient'],
      ['modularInstallLab', 'Modular Wall Installation', 'Walls', 'blk/hr', 'coefficient'],
      ['setupCleanLab', 'Setup / Clean', 'Walls', 'LF/hr', 'coefficient'],
    ],
  },
  {
    group: 'Brick',
    catalogSubcat: 'Brick',
    items: [
      ['concreteHand', 'Footing Concrete — Hand Mix', 'Basic Materials', 'CY', 'currency'],
      ['concreteTruck', 'Footing Concrete — Ready Mix', 'Basic Materials', 'CY', 'currency'],
      ['brickLayLab', 'Brick Installation', 'Walls', 'hr/SF', 'coefficient'],
      ['rebarLab', 'Set Rebar', 'Walls', 'LF/hr', 'coefficient'],
      ['footingPourHandLab', 'Hand Pour Footing', 'Walls', 'CY/hr', 'coefficient'],
      ['footingPourPumpLab', 'Pump Pour Footing', 'Walls', 'CY/hr', 'coefficient'],
    ],
  },
  {
    group: 'Timber / Lumber',
    catalogSubcat: 'Wood',
    items: [
      ['concreteHand', 'Concrete — Hand Mix', 'Basic Materials', 'CY', 'currency'],
      ['concreteTruck', 'Concrete — Ready Mix (Truck)', 'Basic Materials', 'CY', 'currency'],
      ['timberPostMat', 'Steel Post', 'Walls', 'ea', 'currency'],
      ['rebarLab', 'Set Rebar', 'Walls', 'LF/hr', 'coefficient'],
      ['footingPourHandLab', 'Hand Pour Footing', 'Walls', 'CY/hr', 'coefficient'],
      ['footingPourPumpLab', 'Pump Pour Footing', 'Walls', 'CY/hr', 'coefficient'],
      ['timberLfLab', 'Timber Wall Installation', 'Walls', 'hr/LF', 'coefficient'],
      ['timberCourseLab', 'Timber Added Course', 'Walls', 'hr/LF', 'coefficient'],
      ['timberPostLab', 'Steel Post Installation', 'Walls', 'hr/ea', 'coefficient'],
    ],
  },
  {
    // These are the SAME rows the Demo module uses — editing here or in Demo
    // changes the one shared rate. Excavator shares the Mini Skid rate.
    group: 'Slope Removal (Shared Demo Module Rate)',
    items: [
      ['demoHandDirt', 'Hand — Dirt Removal', 'Demo', 'hr/100 Sq Ft·in', 'coefficient'],
      ['demoMiniDirt', 'Mini Skid / Excavator — Dirt Removal', 'Demo', 'hr/100 Sq Ft·in', 'coefficient'],
      ['demoSkidDirt', 'Skid Steer — Dirt Removal', 'Demo', 'hr/100 Sq Ft·in', 'coefficient'],
    ],
  },
  {
    // Shared with the Demo module's Grade Fill + Jumping Jack rates. Excavator
    // uses the Mini Skid rate; Hand compaction = 3× the Jumping Jack rate.
    group: 'Backfilling & Compaction (Shared Demo Module Rate)',
    items: [
      ['backfillHandGF', 'Hand — Grade Fill', 'Demo', 'hr/100 Sq Ft·in', 'coefficient'],
      ['backfillMiniGF', 'Mini Skid / Excavator — Grade Fill', 'Demo', 'hr/100 Sq Ft·in', 'coefficient'],
      ['backfillSkidGF', 'Skid Steer — Grade Fill', 'Demo', 'hr/100 Sq Ft·in', 'coefficient'],
      ['compJJ', 'Jumping Jack Compaction (Hand = mult×)', 'Demo', 'hr/100 Sq Ft·in', 'coefficient'],
      ['handCompactionMult', 'Hand Compaction Multiplier (on Jumping Jack)', 'Walls', '×', 'coefficient'],
    ],
  },
  {
    group: 'Rebar — Standard (per LF, by size)',
    items: [
      ['rebar3Mat', 'Rebar #3', 'Basic Materials', 'LF', 'currency'],
      ['rebar4Mat', 'Rebar #4', 'Basic Materials', 'LF', 'currency'],
      ['rebar5Mat', 'Rebar #5', 'Basic Materials', 'LF', 'currency'],
      ['rebar6Mat', 'Rebar #6', 'Basic Materials', 'LF', 'currency'],
      ['rebar8Mat', 'Rebar #8', 'Basic Materials', 'LF', 'currency'],
    ],
  },
  {
    // Shares the Drainage module's French-drain rates — editing here or in
    // Drainage changes the one shared rate. Category 'Drainage' + explicit table
    // so the RateEditPopover writes the SHARED Drainage rows.
    group: 'Drainage — French Drain (Shared with Drainage Module)',
    items: [
      ['drainPerf4Lab', '4" Perforated Pipe Labor', 'Drainage', 'hr/LF', 'coefficient', 'labor_rates'],
      ['drainPerf3Lab', '3" Perforated Pipe Labor', 'Drainage', 'hr/LF', 'coefficient', 'labor_rates'],
      ['drainSockMat', 'Drain Sock Material', 'Drainage', 'LF', 'currency', 'misc_rates'],
      ['drainSockLab', 'Drain Sock Labor', 'Drainage', 'LF', 'currency', 'misc_rates', 'labor'],
      ['drainBurritoMat', 'Burrito Wrap Geotextile', 'Drainage', 'LF', 'currency', 'misc_rates'],
      ['drainBurritoLab', 'Burrito Wrap Labor', 'Drainage', 'LF', 'currency', 'misc_rates', 'labor'],
      ['drainGravel12Mat', 'Gravel Bed 12" Material', 'Drainage', 'LF', 'currency', 'misc_rates'],
      ['drainGravel12Lab', 'Gravel Bed 12" Labor', 'Drainage', 'LF', 'currency', 'misc_rates', 'labor'],
      ['drainGravel24Mat', 'Gravel Bed 24" Material', 'Drainage', 'LF', 'currency', 'misc_rates'],
      ['drainGravel24Lab', 'Gravel Bed 24" Labor', 'Drainage', 'LF', 'currency', 'misc_rates', 'labor'],
    ],
  },
  {
    group: 'Dig & Haul Footing Soil (all wall types)',
    items: [
      ['footingDigHaulLab', 'Hand — Dig & Haul Footing Soil', 'Walls', 'CF/hr', 'coefficient'],
      ['footingDigHaulExcavLab', 'Excavator — Dig & Haul Footing Soil', 'Walls', 'CF/hr', 'coefficient'],
      ['footingSoilContainerPrice', 'Soil Haul — Container', 'Walls', 'ea', 'currency'],
      ['footingSoilContainerCy', 'Soil Haul — Container CY', 'Walls', 'CY', 'coefficient'],
      ['footingSoilSwell', 'Soil Swell Factor', 'Walls', '×', 'coefficient'],
      ['footingSoilTonsPerCy', 'Soil Tons per CY', 'Walls', 'ton/CY', 'coefficient'],
    ],
  },
  {
    group: 'Finishes (all wall types)',
    catalogSubcat: 'Wall Finish', // append per-vendor Wall Finish catalog products
    items: [
      ['sandStucco', 'Sand Stucco', 'Walls', 'SF', 'currency'],
      ['smoothStucco', 'Smooth Stucco', 'Walls', 'SF', 'currency'],
      ['ledgerstone', 'Ledgerstone', 'Walls', 'SF', 'currency'],
      ['stackedStone', 'Stacked Stone', 'Walls', 'SF', 'currency'],
      ['tile', 'Tile', 'Walls', 'SF', 'currency'],
      ['flagstone', 'Real Flagstone', 'Walls', 'ton', 'currency'],
      ['realStone', 'Real Stone', 'Walls', 'ton', 'currency'],
      ['sandStuccoLab', 'Sand Stucco Labor', 'Walls', 'SF/day', 'coefficient'],
      ['smoothStuccoLab', 'Smooth Stucco Labor', 'Walls', 'SF/day', 'coefficient'],
      ['ledgerstoneLab', 'Ledgerstone Labor', 'Walls', 'SF/day', 'coefficient'],
      ['stackedStoneLab', 'Stacked Stone Labor', 'Walls', 'SF/day', 'coefficient'],
      ['tileLab', 'Tile Labor', 'Walls', 'hrs/SF', 'coefficient'],
      ['flagstoneLab', 'Real Flagstone Labor', 'Walls', 'hrs/SF', 'coefficient'],
      ['realStoneLab', 'Real Stone Labor', 'Walls', 'hrs/SF', 'coefficient'],
    ],
  },
  {
    group: 'Caps (all wall types)',
    catalogSubcat: 'Wall Cap', // append per-vendor Wall Cap catalog products
    items: [
      ['capFlagstone', 'Cap — Flagstone', 'Walls', 'ton', 'currency'],
      ['capPrecast', 'Cap — Precast', 'Walls', 'ea', 'currency'],
      ['capBullnose', 'Cap — Bullnose Brick', 'Walls', 'LF', 'currency'],
      ['concreteTruck', 'PIP Concrete Cap — Ready Mix', 'Basic Materials', 'CY', 'currency'],
      ['capFlagstoneLab', 'Flagstone Labor', 'Walls', 'hr/LF', 'coefficient'],
      ['capPrecastLab', 'Precast Labor', 'Walls', 'hr/ea', 'coefficient'],
      ['capPipLab', 'PIP Concrete Labor', 'Walls', 'hr/LF', 'coefficient'],
      ['capBullnoseLab', 'Bullnose Labor', 'Walls', 'hr/LF', 'coefficient'],
    ],
  },
  {
    group: 'Waterproofing (all wall types)',
    catalogSubcat: 'Waterproofing', // append per-vendor Waterproofing catalog products
    items: [
      ['wpPrimerMembrane', 'Primer + Membrane', 'Walls', 'SF', 'currency'],
      ['wp3CoatRollOn', '2 Coats Roll On', 'Walls', 'SF', 'currency'],
      ['wpThoroseal', 'Thoroseal 2 Coats', 'Walls', 'SF', 'currency'],
      ['wpDimpleMembrane', 'Primer, Membrane + Dimple', 'Walls', 'SF', 'currency'],
      ['wpLabPrimerMembrane', 'Primer + Membrane Labor', 'Walls', 'SF/hr', 'coefficient'],
      ['wpLab2Coat', '2 Coats Roll On Labor', 'Walls', 'SF/hr', 'coefficient'],
      ['wpLabThoroseal', 'Thoroseal Labor', 'Walls', 'SF/hr', 'coefficient'],
      ['wpLabDimple', 'Primer, Membrane + Dimple Labor', 'Walls', 'SF/hr', 'coefficient'],
    ],
  },
]

const DEFAULTS = { laborRatePerHour: 35, laborBurdenPct: 0.29, gpmd: 425 }
const n = v => parseFloat(v) || 0
const r2 = x => Math.round(((x || 0) + Number.EPSILON) * 100) / 100

// Default entries. Each structural wall entry carries its OWN waterproofing
// rows (wpRows) — waterproofing is now specified per wall, not once per tab.
const DEFAULT_CMU = () => ({
  blockType: DEFAULT_BLOCK_NAME,
  vendor: 'Standard',
  lf: '',
  heightIn: '',
  footingWIn: '12',
  footingDIn: '12',
  rebarSpIn: '16',
  wallRebarSize: '#4',
  wallHorizBars: '',
  wallHorizRebarSize: '#4',
  footingRebarSize: '#4',
  horizBars: '2',
  pctGrouted: '100',
  pctCurved: '0',
  footingPump: 'No',
  groutPump: 'No',
  subEach: '',
  wpRows: [blankWpRow()],
  ...DEMO_DEFAULTS(),
  ...DRAIN_DEFAULTS(),
  ...BACKFILL_DEFAULTS(),
  finishRows: [blankWallFinishRow()],
  capRows: [blankCapRow()],
})
const DEFAULT_PIP = () => ({
  vendor: 'Standard',
  lf: '',
  heightIn: '',
  footingWIn: '12',
  footingDIn: '12',
  horizBars: '2',
  pipFootingRebarSize: '#4',
  pipWallHorizBars: '',
  pipWallHorizSize: '#4',
  pipWallVertBars: '',
  pipVertSize: '#4',
  footingPump: 'Yes',
  subEach: '',
  wpRows: [blankWpRow()],
  ...DEMO_DEFAULTS(),
  ...DRAIN_DEFAULTS(),
  ...BACKFILL_DEFAULTS(),
  finishRows: [blankWallFinishRow()],
  capRows: [blankCapRow()],
})
// Modular block wall — duplicates the CMU fields EXCEPT rebar spacing, horiz
// bars, bond-beam courses and % grouted solid (modular block isn't grouted or
// reinforced the same way). Prices out via calcOneModular, which reuses the
// CMU block+footing math with those inputs forced to zero.
const DEFAULT_MODULAR = () => ({
  blockType: DEFAULT_BLOCK_NAME,
  vendor: 'Standard',
  lf: '',
  heightIn: '',
  footingWIn: '12',
  footingDIn: '12',
  pctCurved: '0',
  footingPump: 'No',
  subEach: '',
  wpRows: [blankWpRow()],
  ...DEMO_DEFAULTS(),
  ...DRAIN_DEFAULTS(),
  ...BACKFILL_DEFAULTS(),
  finishRows: [blankWallFinishRow()],
  capRows: [blankCapRow()],
})
// Brick wall — same structure/pricing model as Modular (block + footing, no
// grout/rebar), just a different wall category.
const DEFAULT_BRICK = () => ({
  blockType: DEFAULT_BLOCK_NAME,
  vendor: 'Standard',
  lf: '',
  heightIn: '',
  footingWIn: '12',
  footingDIn: '12',
  horizBars: '2',
  brickFootingRebarSize: '#4',
  pctCurved: '0',
  footingPump: 'No',
  subEach: '',
  wpRows: [blankWpRow()],
  ...DEMO_DEFAULTS(),
  ...DRAIN_DEFAULTS(),
  ...BACKFILL_DEFAULTS(),
  finishRows: [blankWallFinishRow()],
  capRows: [blankCapRow()],
})
// Timber / Lumber wall — now a multi-wall array entry (mirrors CMU/PIP/etc.).
// Each entry carries its OWN install inputs (wood type/vendor, LF, height, posts,
// footing) PLUS its own Demo / Drainage / Backfilling sub-sections (flattened
// fields, same as every other wall type). All pricing/labor is table-driven.
const DEFAULT_TIMBER = () => ({
  vendor: 'Standard',
  timberType: 'Railroad Treated',
  lf: '',
  heightIn: '',
  posts: '',
  subEach: '',
  footingWIn: '',
  footingDIn: '',
  horizBars: '2',
  footingRebarSize: '#4',
  footingPump: 'No',
  ...DEMO_DEFAULTS(),
  ...DRAIN_DEFAULTS(),
  ...BACKFILL_DEFAULTS(),
})

// ── Fixed per-section type lists (the Item dropdown; NOT from the DB) ─────────
// Only the Vendor changes the material price; the Item (type) drives the
// pricing/labor FORMULA, which stays byte-for-byte identical to the original.
const WALL_FINISH_META = {
  'Sand Stucco': { matKey: 'sandStucco', labKey: 'sandStuccoLab', matUnit: 'Sq Ft', labUnit: 'Sq Ft per day' },
  'Smooth Stucco': {
    matKey: 'smoothStucco',
    labKey: 'smoothStuccoLab',
    matUnit: 'Sq Ft',
    labUnit: 'Sq Ft per day',
  },
  Ledgerstone: { matKey: 'ledgerstone', labKey: 'ledgerstoneLab', matUnit: 'Sq Ft', labUnit: 'Sq Ft per day' },
  'Stacked Stone': {
    matKey: 'stackedStone',
    labKey: 'stackedStoneLab',
    matUnit: 'Sq Ft',
    labUnit: 'Sq Ft per day',
  },
  Tile: { matKey: 'tile', labKey: 'tileLab', matUnit: 'Sq Ft', labUnit: 'hrs per Sq Ft' },
  'Real Flagstone': { matKey: 'flagstone', labKey: 'flagstoneLab', matUnit: 'Tons', labUnit: 'hrs per Sq Ft' },
  'Real Stone': { matKey: 'realStone', labKey: 'realStoneLab', matUnit: 'Tons', labUnit: 'hrs per Sq Ft' },
}

// Both current names AND legacy names map to the same rate key, so walls saved
// under the old labels keep pricing after the rename.
const WP_KEY = {
  'Primer + Membrane': 'wpPrimerMembrane',
  '2 Coats Roll On': 'wp3CoatRollOn',
  'Thoroseal 2 Coats': 'wpThoroseal',
  'Primer, Membrane + Dimple': 'wpDimpleMembrane',
  // legacy aliases
  'Primer & Membrane': 'wpPrimerMembrane',
  '3 Coats Roll On': 'wp3CoatRollOn',
  'Thoroseal & Roll On': 'wpThoroseal',
  'Dimple Membrane': 'wpDimpleMembrane',
}
// Per-type install-labor rate keys — current + legacy names, same as WP_KEY.
const WP_LABOR_KEY = {
  'Primer + Membrane': 'wpLabPrimerMembrane',
  '2 Coats Roll On': 'wpLab2Coat',
  'Thoroseal 2 Coats': 'wpLabThoroseal',
  'Primer, Membrane + Dimple': 'wpLabDimple',
  // legacy aliases
  'Primer & Membrane': 'wpLabPrimerMembrane',
  '3 Coats Roll On': 'wpLab2Coat',
  'Thoroseal & Roll On': 'wpLabThoroseal',
  'Dimple Membrane': 'wpLabDimple',
}

const blankWallFinishRow = () => ({ vendor: 'Standard', type: '', sf: '', rateIn: '', subEach: '' })
const blankCapRow = () => ({ vendor: 'Standard', type: '', widthIn: '', lf: '', qty: '', subEach: '' })
const blankWpRow = () => ({ vendor: 'Standard', type: 'None', sf: '', subEach: '' })

// ── Vendor-catalog material price ─────────────────────────────────────────────
// The ONLY thing the Vendor selection changes: the material $ source. When a
// real vendor is selected AND a material_rates row exists (name===dbName &&
// vendor_id===vendorId) use that row's unit_cost; otherwise fall back to the
// Standard price (name-keyed mp[dbName]) then the hard fallback. Vendor 'Standard'
// resolves to exactly the original math, so In-House numbers never move.
// Shared resolver (src/lib/materialCatalog.js) — same vendor→Standard→fallback order.
const wallMatPrice = resolveMaterialPrice

// ── Per-row Wall Finish calculator — identical formulas to the original
//    calcWalls finish math; only the material price source is vendor-resolved.
//    Returns { mat, hrs } for In-House and { subUnit, subEach, subMat } for Sub.
function computeWallFinishRow(row, mp, materialRows) {
  // Math lives in the pure, unit-tested wallsCalc.js; here we resolve the labor
  // coefficients (WALL_RATES keys) and the vendor/catalog material $/unit.
  const lab = k => n(mp?.[WALL_RATES[k].db])
  const catP = catalogItemPrice(materialRows, WALL_FINISH_SUBCAT, row.type, row.vendor, 0)
  return _finishRow(row, { lab, catP })
}

// ── Per-row Wall Cap calculator — identical to the original cap math (incl. the
//    Precast width factor); material price is vendor-resolved.
function computeCapRow(row, mp, materialRows) {
  // Math lives in the pure, unit-tested wallsCalc.js; here we resolve labor keys,
  // the named-cap catalog price, the PIP ready-mix $/CY, and — for any catalog cap
  // (default branch) — its calc_meta per_lf count + labor_rate pointer.
  const v = row.vendor
  const lab = k => n(mp?.[WALL_RATES[k].db])
  const capP = name => catalogItemPrice(materialRows, WALL_CAP_SUBCAT, name, v, 0)
  const concreteTruckP = wallMatPrice(WALL_RATES.concreteTruck.db, v, materialRows, mp)
  const capRow =
    (materialRows || []).find(
      rr =>
        rr.sub_category === WALL_CAP_SUBCAT &&
        rr.name === row.type &&
        (v && v !== 'Standard' ? rr.vendor_id === v : rr.vendor_id == null)
    ) || (materialRows || []).find(rr => rr.sub_category === WALL_CAP_SUBCAT && rr.name === row.type)
  const cm = capRow?.calc_meta || {}
  const defaultCap = { perLf: n(cm.per_lf) || 1, labRate: n(mp?.[cm.labor_rate]) }
  return _capRow(row, { lab, capP, concreteTruckP, defaultCap })
}

// ── Per-row Waterproofing calculator — identical to the original wp math;
//    material price is vendor-resolved.
function computeWpRow(row, mp, materialRows) {
  // Math lives in the pure, unit-tested wallsCalc.js; here we resolve validity
  // (type maps to a real WP key), the catalog $/SF, and the per-type install labor.
  const valid = !!WP_KEY[row?.type]
  const catP = catalogItemPrice(materialRows, WALL_WP_SUBCAT, row?.type, row?.vendor)
  const labKey = WP_LABOR_KEY[row?.type]
  const wpRate = labKey ? n(mp?.[WALL_RATES[labKey].db]) : n(mp?.[WALL_RATES.wpLabor.db])
  return _wpRow(row, { valid, catP, wpRate })
}

// Sum a wall entry's own waterproofing rows into { wpHrs, wpMat, wpSubMat }.
function computeWallWpTotals(wall, mp, materialRows) {
  const rows = Array.isArray(wall?.wpRows) ? wall.wpRows : []
  return rows.reduce(
    (a, row) => {
      const c = computeWpRow(row, mp, materialRows)
      return { wpHrs: a.wpHrs + c.hrs, wpMat: a.wpMat + c.mat, wpSubMat: a.wpSubMat + c.subMat }
    },
    { wpHrs: 0, wpMat: 0, wpSubMat: 0 }
  )
}

// ── Modular master-list wall products ──────────────────────────────────────
// Each module's material selector is driven by a sub_category "marker": rows in
// material_rates (category='Walls') tagged sub_category='Modular Wall' show up in
// the Modular tab's Wall Type picker automatically — populate the master list and
// they appear here, no code change. Dimensions (block_w/h/l_in, inches) drive the
// block-count math; unit_cost is the per-unit price.
const MODULAR_SUBCAT = 'Modular Wall'
// Display-only label for the "no Modular product selected" sentinel (zero dims →
// surfaced at $0). NOT a dimension fallback — block dims come only from the product.
const MODULAR_UNSET_LABEL = 'Modular block (no product selected)'
// Resolve the selected master-list wall product → { name, w, h, l, price }.
// vendorSel picks the vendor's row (or the Unspecified/null-vendor row); a
// missing/legacy key falls back to the first product under that marker.
function resolveMasterBlock(wall, materialRows, subcat) {
  // Show every product assigned to this sub-category regardless of vendor
  // (Modular Wall items are vendor-priced, so a Standard-only filter is empty).
  const inSub = (materialRows || []).filter(r => r.sub_category === subcat)
  const row = inSub.find(r => r.id === wall.blockType) || inSub[0]
  // No Modular product selected/available → zero-dim sentinel (never a fabricated
  // 8x8x16). calcOneCMU sees the missing dims and surfaces the wall at $0 instead
  // of inventing a block size.
  if (!row) return { name: MODULAR_UNSET_LABEL, w: 0, h: 0, l: 0, price: 0 }
  // Block dims come from the product's calc_meta (new model), else the legacy
  // column for saved estimates. NO hardcoded default — a product with no dims
  // resolves to 0 and is surfaced by calcOneCMU (unset → surface, no fallback).
  const cm = row.calc_meta || {}
  return {
    name: row.name,
    w: n(cm.block_w_in) || n(row.block_w_in),
    h: n(cm.block_h_in) || n(row.block_h_in),
    l: n(cm.block_l_in) || n(row.block_l_in),
    price: n(row.unit_cost),
  }
}

// CMU & Brick blocks are now catalog-driven from the Walls › "Wall Block"
// sub-category (products carry dims in calc_meta + a per-vendor price). This
// resolver returns the selected product's { name, w, h, l, price } ONLY when
// blockType is a catalog product id; for legacy estimates (blockType = a built-in
// size name) it returns null so the calc falls back to the built-in CMU catalog —
// keeping old estimates byte-for-byte identical.
const WALL_BLOCK_SUBCAT = 'Wall Block'
function blockHasDims(r) {
  const cm = r?.calc_meta || {}
  return n(cm.block_w_in) || n(r?.block_w_in)
}
function resolveCatalogBlock(wall, materialRows) {
  const row = (materialRows || []).find(
    r => r.sub_category === WALL_BLOCK_SUBCAT && r.id === wall.blockType
  )
  if (!row) return null
  // Dims from the product's calc_meta (new model), else the legacy column for saved
  // estimates. NO hardcoded default — a catalog product with no dims resolves to 0
  // and is surfaced by calcOneCMU at $0 (unset → surface, no fallback).
  const cm = row.calc_meta || {}
  return {
    name: row.name,
    w: n(cm.block_w_in) || n(row.block_w_in),
    h: n(cm.block_h_in) || n(row.block_h_in),
    l: n(cm.block_l_in) || n(row.block_l_in),
    price: n(row.unit_cost),
  }
}
// The "Wall Block" products a vendor offers for the Block Type picker (only the
// dimensioned ones — Grey/Bondbeam base blocks have no dims and aren't types).
function wallBlockOptions(materialRows, vendorSel) {
  return (materialRows || []).filter(
    r =>
      r.sub_category === WALL_BLOCK_SUBCAT &&
      blockHasDims(r) &&
      (!vendorSel || vendorSel === 'Standard' ? r.vendor_id == null : r.vendor_id === vendorSel)
  )
}

// Caps & Finishes are also vendor-catalog-driven: the Item dropdown lists the
// selected vendor's products in the 'Wall Cap' / 'Wall Finish' sub-category. The
// product NAMES match the built-in type keys (Flagstone, Sand Stucco, …) so the
// existing cap/finish calc is untouched — the vendor only controls availability.
const WALL_CAP_SUBCAT = 'Wall Cap'
const WALL_FINISH_SUBCAT = 'Wall Finish'
const WALL_WP_SUBCAT = 'Waterproofing'
// Brick walls: products live in the 'Brick' sub-category, priced per brick, with
// a bricks-per-sqft coefficient in calc_meta (per_sqft, default 7).
const BRICK_SUBCAT = 'Brick'

// Resolve the selected brick product for a wall: matches by product id + the
// chosen vendor's price row, returns { name, price ($/brick), perSqft }.
function resolveBrick(wall, materialRows) {
  const inSub = (materialRows || []).filter(r => r.sub_category === BRICK_SUBCAT)
  const vsel = wall.vendor
  const forVendor = r =>
    !vsel || vsel === 'Standard' ? r.vendor_id == null : r.vendor_id === vsel
  const row =
    inSub.find(r => r.id === wall.blockType && forVendor(r)) ||
    inSub.find(r => r.id === wall.blockType) ||
    inSub.find(forVendor) ||
    inSub[0]
  // per_sqft (bricks per Sq Ft) is a per-product coefficient in calc_meta. NO
  // hardcoded default — a brick product with no per_sqft resolves to 0, so its
  // material surfaces at $0 (unset → surface, no fallback) rather than silently
  // assuming 7 bricks/Sq Ft. Labor is per face Sq Ft (a DB rate), unaffected.
  const cm = row?.calc_meta || {}
  return { name: row?.name || 'Brick', price: n(row?.unit_cost) || 0, perSqft: n(cm.per_sqft) }
}
// PIP walls pour concrete — the "Concrete Vendor" picker is scoped to the
// Concrete category's 'Concrete Mix' sub-category (loaded into the Walls catalog).
const CONCRETE_CATEGORY = 'Concrete'
const CONC_MIX_SUBCAT = 'Concrete Mix'
// Timber / Lumber walls: wood types live in the 'Wood' sub-category, Standard-
// priced. Price drives the timber material calc (was a flat $50).
const WOOD_SUBCAT = 'Wood'
const TIMBER_TYPES = ['Railroad Treated', 'Douglas Fir 6×6', 'Cedar 6×6', 'Redwood 6×6']
// Bond-beam block: catalog products in the 'Bond Beam Block' sub-category, priced
// per block. Selected per CMU wall via its own vendor + type picker (NO flat rate).
const BOND_BEAM_SUBCAT = 'Bond Beam Block'
function bondBeamOptions(materialRows, vendorSel) {
  return (materialRows || []).filter(
    r =>
      r.sub_category === BOND_BEAM_SUBCAT &&
      (!vendorSel || vendorSel === 'Standard' ? r.vendor_id == null : r.vendor_id === vendorSel)
  )
}
function resolveBondBeam(wall, materialRows) {
  const inSub = (materialRows || []).filter(r => r.sub_category === BOND_BEAM_SUBCAT)
  const vsel = wall.bbVendor
  const forV = r => (!vsel || vsel === 'Standard' ? r.vendor_id == null : r.vendor_id === vsel)
  const row =
    inSub.find(r => r.id === wall.bbBlockType && forV(r)) ||
    inSub.find(r => r.id === wall.bbBlockType) ||
    inSub.find(forV) ||
    inSub[0]
  return { name: row?.name || null, price: n(row?.unit_cost) || 0 }
}
function wallCatalogTypes(materialRows, subcat, vendorSel) {
  const seen = new Set()
  const out = []
  ;(materialRows || []).forEach(r => {
    if (r.sub_category !== subcat || !r.name) return
    const ok = !vendorSel || vendorSel === 'Standard' ? r.vendor_id == null : r.vendor_id === vendorSel
    if (ok && !seen.has(r.name)) {
      seen.add(r.name)
      out.push(r.name)
    }
  })
  return out
}
// Price of a catalog product by (sub-category, name) for the selected vendor —
// vendor row → Standard row → fallback. This is how finish/cap/waterproofing
// prices resolve now: from the DB product, not a hard-coded constant.
function catalogItemPrice(materialRows, subcat, name, vendorSel, fallback = 0) {
  const rows = (materialRows || []).filter(r => r.sub_category === subcat && r.name === name)
  if (!rows.length) return fallback
  const vsel = vendorSel && vendorSel !== 'Standard' ? vendorSel : null
  const row = rows.find(r => r.vendor_id === vsel) || rows.find(r => r.vendor_id == null) || rows[0]
  return row && row.unit_cost != null && row.unit_cost !== '' ? n(row.unit_cost) : fallback
}

// Return the catalog product row for (sub-category, name, vendor) — used to
// detect a selected material that has NO price so we can prompt the user.
function wallCatalogRow(materialRows, subcat, name, vendorSel) {
  const rows = (materialRows || []).filter(r => r.sub_category === subcat && r.name === name)
  if (!rows.length) return null
  const vsel = vendorSel && vendorSel !== 'Standard' ? vendorSel : null
  return rows.find(r => r.vendor_id === vsel) || rows.find(r => r.vendor_id == null) || rows[0]
}
// True when a catalog row exists but carries no usable price.
function isPricelessRow(row) {
  return !!(row && row.id && (row.unit_cost == null || row.unit_cost === '' || n(row.unit_cost) === 0))
}
// Shared "missing price" prompt: when a selected catalog item has no price, open
// a modal so the user can enter one (written to the catalog). Used by every
// Walls picker (caps/finishes/waterproofing/blocks).
function usePricePrompt() {
  const [prompt, setPrompt] = useState(null)
  // name-keyed catalog items (caps/finishes/waterproofing)
  const check = (materialRows, subcat, name, vendor) => {
    const row = wallCatalogRow(materialRows, subcat, name, vendor)
    if (isPricelessRow(row)) {
      setPrompt({ materialId: row.id, vendorId: vendor && vendor !== 'Standard' ? vendor : null, name })
      return true
    }
    return false
  }
  // id-keyed catalog items (block pickers select the material id directly)
  const checkById = (materialRows, id, vendor, name) => {
    const row = (materialRows || []).find(r => r.id === id)
    if (isPricelessRow(row)) {
      setPrompt({
        materialId: row.id,
        vendorId: vendor && vendor !== 'Standard' ? vendor : null,
        name: name || row.name,
      })
      return true
    }
    return false
  }
  return { prompt, check, checkById, close: () => setPrompt(null) }
}

// ── Per-wall calculators ──────────────────────────────────────────────────────
function calcOneCMU(wall, footingPump, groutPump, r, mp = {}, materialRows = [], blockOverride = null, installKey = 'blockLab') {
  const {
    blockType,
    lf,
    heightIn,
    footingWIn,
    footingDIn,
    rebarSpIn,
    horizBars,
    pctGrouted,
    pctCurved,
  } = wall
  if (!n(lf) || !n(heightIn)) {
    // Structural inputs blank — still bill any waterproofing entered on the wall.
    const wp0 = computeWallWpTotals(wall, mp, materialRows)
    return { hrs: 0, mat: 0, subUnit: 0, subEach: 0, subMat: 0, ...wp0, detail: null }
  }

  // Vendor only swaps where each MATERIAL unit price comes from; labor rates
  // (r) and all geometry stay exactly as before. Vendor 'Standard' resolves to
  // the original master-rate / catalog prices, so In-House math is unchanged.
  const v = wall.vendor
  const pm = key => wallMatPrice(WALL_RATES[key].db, v, materialRows, mp)

  // Selected block type drives both DIMENSIONS (how many blocks per course /
  // per wall height) and PRICE (grey block unit cost). Price prefers a
  // vendor row, then a master_rates override (set via the Edit Rates popover),
  // and falls back to the catalog default. Falls back to the default 8x8x16
  // grey block if blockType is missing (legacy walls).
  const b = blockOverride || blockByName(blockType)
  // A SELECTED catalog / Modular product with no dimensions is a data error. Do NOT
  // fabricate an 8x8x16 default (silent fallback that would misprice material AND
  // labor, or divide-by-zero the block count). Contribute a visible $0 and flag the
  // product so the user fixes its dimensions. Legacy built-in blocks come from
  // blockByName and always carry real dims, so this only guards catalog products.
  if (blockOverride && (!n(b.w) || !n(b.h) || !n(b.l))) {
    const wp0 = computeWallWpTotals(wall, mp, materialRows)
    return { hrs: 0, mat: 0, subUnit: 0, subEach: 0, subMat: 0, ...wp0, detail: null, blockNeedsDims: b.name || 'Selected block' }
  }
  const blockPrice = blockOverride
    ? n(blockOverride.price)
    : wallMatPrice(wallBlockRateName(b.name), v, materialRows, mp)
  // Structure QUANTITIES (block count, footing, grout, rebar LF) — pure geometry,
  // extracted to ./wallsStruct (unit-tested in wallsStruct.test.mjs). Rate-driven
  // waste coefficients are injected so the helper stays free of the price map. Rebar
  // is split by size below (wall verticals / wall horizontals / footing horizontals),
  // each priced by its own size; labor for ALL rebar stays the shared rebarLab.
  const _q = cmuStructQuantities(wall, b, {
    blockOrderWaste: r('blockOrderWaste'),
    footingRebarWaste: r('footingRebarWaste'),
  })
  const {
    blocksPerCourse,
    totalCourses,
    rawBlocks,
    orderGreyBlock,
    footingCF,
    footingCY,
    groutCY,
    groutCF,
    bars,
    wallVertLF,
    wallHorizLF,
    footingRebarLF,
  } = _q
  const regCourses = totalCourses // every course is regular grey block (bond beam removed)
  const rebarMat =
    wallVertLF * rebarPrice(wall.wallRebarSize, r) +
    wallHorizLF * rebarPrice(wall.wallHorizRebarSize, r) +
    footingRebarLF * rebarPrice(wall.footingRebarSize, r)

  // Structure dollar totals (labor hrs + material $) — same math, in the pure
  // ./wallsStruct (unit-tested). Footing EXCAVATION is priced separately in the
  // "Dig and Haul Footing Soil" section; the footing fields here only drive install
  // (rebar + pour) + material.
  const { hrs, mat, curveAdd } = cmuStructTotals(_q, wall, {
    r,
    pm,
    blockPrice,
    rebarMat,
    footingPump,
    groutPump,
    installKey,
  })

  // Sub-tab flat pricing: default $/LF = In-House material ÷ LF; the estimator
  // can override per-wall. No labor is billed on the Sub tab.
  const subUnit = n(lf) > 0 ? mat / n(lf) : 0
  const subEach = wall.subEach !== '' && wall.subEach != null ? n(wall.subEach) : subUnit
  const subMat = n(lf) * subEach

  const wp = computeWallWpTotals(wall, mp, materialRows)

  return {
    hrs,
    mat,
    subUnit,
    subEach,
    subMat,
    ...wp,
    detail: {
      orderGreyBlock,
      footingCY,
      groutCY,
      totalRebarLF: wallVertLF + wallHorizLF + footingRebarLF,
      curveAdd,
      subUnit,
    },
  }
}

// ── Modular block wall — reuses the CMU block + footing math with rebar,
//    horizontal bars, bond beams and grouting all forced to zero (modular
//    block isn't grouted/reinforced). Only the footing pump applies. ──────────
// subcat present → resolve the wall product from the master list (Modular tab);
// omitted → legacy CMU block catalog (Brick tab, unchanged).
function calcOneModular(wall, footingPump, r, mp = {}, materialRows = [], blockOverride = null) {
  const modWall = { ...wall, rebarSpIn: '0', horizBars: '0', bondBeams: '0', pctGrouted: '0' }
  return calcOneCMU(modWall, footingPump, 'No', r, mp, materialRows, blockOverride, 'modularInstallLab')
}

// ── Brick wall — priced per brick, NOT by block dimensions. Material =
//    face sqft × bricks/sqft (calc_meta.per_sqft, default 7) × $/brick.
//    Labor = face sqft × brickLayLab (hr/SF, default 1.75). ────────────────────
function calcOneBrick(wall, r, mp = {}, materialRows = []) {
  const lf = n(wall.lf)
  const heightIn = n(wall.heightIn)
  if (!lf || !heightIn) {
    const wp0 = computeWallWpTotals(wall, mp, materialRows)
    return { hrs: 0, mat: 0, subUnit: 0, subEach: 0, subMat: 0, ...wp0, detail: null }
  }
  const v = wall.vendor
  const pm = key => wallMatPrice(WALL_RATES[key].db, v, materialRows, mp)

  // Brick material + laying labor (pure brickCore in wallsStruct.js).
  const brick = resolveBrick(wall, materialRows)
  const { sqft, bricks, mat: brickMat, hrs: brickHrs } = brickCore(lf, heightIn, {
    perSqft: brick.perSqft,
    price: brick.price,
    brickLayLab: r('brickLayLab'),
  })

  // Footing — identical dig + horizontal footing rebar + pour math to CMU / PIP.
  const fW = n(wall.footingWIn)
  const fD = n(wall.footingDIn)
  const hb = n(wall.horizBars)
  const footingCF = fW > 0 && fD > 0 ? lf * (fW / 12) * (fD / 12) : 0
  const footingCY = footingCF / 27
  const horizRebarLF = hb * lf
  // Footing excavation moved to the Dig and Haul Footing Soil section — install
  // (rebar + pour) + material only here.
  const footingHrs =
    (horizRebarLF > 0 ? horizRebarLF * r('rebarLab') : 0) +
    (footingCY > 0
      ? footingCY * r((wall.footingPump ?? 'No') === 'Yes' ? 'footingPourPumpLab' : 'footingPourHandLab')
      : 0)
  const footPrc = (wall.footingPump ?? 'No') === 'Yes' ? pm('concreteTruck') : pm('concreteHand')
  const footingMat = footingCY * footPrc + horizRebarLF * rebarPrice(wall.brickFootingRebarSize, r)

  const mat = brickMat + footingMat
  const hrs = brickHrs + footingHrs

  const subUnit = lf > 0 ? mat / lf : 0
  const subEach = wall.subEach !== '' && wall.subEach != null ? n(wall.subEach) : subUnit
  const subMat = lf * subEach

  const wp = computeWallWpTotals(wall, mp, materialRows)
  return {
    hrs,
    mat,
    subUnit,
    subEach,
    subMat,
    ...wp,
    detail: { sqft, bricks, brick: brick.name, footingCY, horizRebarLF, subUnit },
  }
}

function calcOnePIP(wall, r, mp = {}, materialRows = []) {
  const { lf, heightIn, footingWIn, footingDIn, horizBars } = wall
  if (!n(lf) || !n(heightIn)) {
    const wp0 = computeWallWpTotals(wall, mp, materialRows)
    return { hrs: 0, mat: 0, concCY: 0, subUnit: 0, subEach: 0, subMat: 0, ...wp0 }
  }
  const v = wall.vendor
  const pm = key => wallMatPrice(WALL_RATES[key].db, v, materialRows, mp)
  // Wall stem labor — priced per SF of form (both faces = 2 × LF × height), the
  // canonical PIP install basis shared with Columns + Fire Pit. Concrete VOLUME is
  // still per-LF base + added-6"-course coefficients.
  const addlCourses = Math.max(0, Math.ceil((n(heightIn) - 6) / 6)) // concrete volume still base + added
  const wallHrs = pipFormSf(wall) * r('pipFormLab')
  const wallConcCY = n(lf) * (r('pipStemCyPerLf') + addlCourses * r('pipStemCyPerLfCourse'))

  // Footing — same dig + rebar + pour coefficients as the CMU calc so PIP
  // footings price out consistently. Optional: if the user leaves footing
  // fields blank, the footing contribution is just 0 and the wall behaves
  // exactly like the previous (footing-less) version.
  const fW = n(footingWIn),
    fD = n(footingDIn),
    hb = n(horizBars)
  const footingCF = fW > 0 && fD > 0 ? n(lf) * (fW / 12) * (fD / 12) : 0
  const footingCY = footingCF / 27
  // Rebar split by size: footing horizontals (+10% wraps ONLY on the footing),
  // wall horizontals (# × wall length) and wall verticals (# × wall height) —
  // both wall counts as plain counts, no +10%. Labor for ALL rebar stays the
  // shared rebarLab ('Set Rebar').
  const footingRebarLF = n(lf) * n(horizBars) * r('footingRebarWaste') // +10% ONLY on footing (table-driven)
  const wallHorizLF = n(wall.pipWallHorizBars) * n(lf) // # horizontals × wall length, NO +10%
  const wallVertLF = n(wall.pipWallVertBars) * (n(heightIn) / 12) // # verticals × wall height, NO +10%
  const rebarHrs = (footingRebarLF + wallHorizLF + wallVertLF) * r('rebarLab')
  const rebarMat =
    footingRebarLF * rebarPrice(wall.pipFootingRebarSize, r) +
    wallHorizLF * rebarPrice(wall.pipWallHorizSize, r) +
    wallVertLF * rebarPrice(wall.pipVertSize, r)
  // Footing POUR only (concrete). Excavation is priced in the Dig and Haul
  // Footing Soil section; rebar is billed separately above.
  const footingHrs =
    footingCY > 0
      ? footingCY * r((wall.footingPump ?? 'Yes') === 'Yes' ? 'footingPourPumpLab' : 'footingPourHandLab')
      : 0
  // Per-wall footing pump: 'Yes' = ready-mix truck (default, unchanged), 'No' =
  // hand mix. No separate pump-setup fee on PIP footings.
  const footPrc = (wall.footingPump ?? 'Yes') === 'Yes' ? pm('concreteTruck') : pm('concreteHand')
  const footingMat = footingCY * footPrc

  const hrs = wallHrs + footingHrs + rebarHrs
  const concCY = wallConcCY + footingCY
  const mat = wallConcCY * pm('concreteTruck') + footingMat + rebarMat
  // Sub-tab flat pricing: default $/LF = In-House material ÷ LF; overridable.
  const subUnit = n(lf) > 0 ? mat / n(lf) : 0
  const subEach = wall.subEach !== '' && wall.subEach != null ? n(wall.subEach) : subUnit
  const subMat = n(lf) * subEach
  const wp = computeWallWpTotals(wall, mp, materialRows)
  return {
    hrs,
    mat,
    concCY,
    footingCY,
    horizRebarLF: footingRebarLF + wallHorizLF + wallVertLF,
    subUnit,
    subEach,
    subMat,
    ...wp,
  }
}

// ── Main calc ─────────────────────────────────────────────────────────────────
function calcWalls(
  state,
  lrph = DEFAULTS.laborRatePerHour,
  mp = {},
  gpmd = DEFAULTS.gpmd,
  walkAccess = null,
  laborBurdenPct = DEFAULTS.laborBurdenPct,
  materialRows = []
) {
  const r = key => n(mp[WALL_RATES[key].db])
  const _pace = n(walkAccess?.paceLfPerMin)

  let structuralHrs = 0,
    structuralMat = 0,
    structuralSubMat = 0
  // Timber labor is split OUT of the main structural bucket so it can be shown
  // (and crewed) separately. Its material/sub still flow into structuralMat.
  let timberHrs = 0
  let cmuDetails = [],
    pipDetails = [],
    modularDetails = [],
    brickDetails = []
  // Waterproofing now lives per-wall; accumulate each wall's wp into the wp
  // bucket (kept separate so the summary's Waterproofing line still works).
  let wallWpHrs = 0,
    wallWpMat = 0,
    wallWpSubMat = 0
  const addWp = res => {
    wallWpHrs += res.wpHrs || 0
    wallWpMat += res.wpMat || 0
    wallWpSubMat += res.wpSubMat || 0
  }

  // ALL wall types contribute simultaneously — switching the visible tab
  // no longer drops the other types from the calc. Each section is its
  // own array and gets summed below. Vendor only changes the material $;
  // In-House labor / geometry is unchanged.
  ;(state.cmuWalls || []).forEach(wall => {
    const res = calcOneCMU(
      wall,
      wall.footingPump ?? 'No',
      wall.groutPump ?? 'No',
      r,
      mp,
      materialRows,
      resolveCatalogBlock(wall, materialRows)
    )
    structuralHrs += res.hrs
    structuralMat += res.mat
    structuralSubMat += res.subMat
    addWp(res)
    cmuDetails.push(res.detail)
  })
  ;(state.pipWalls || []).forEach(wall => {
    const res = calcOnePIP(wall, r, mp, materialRows)
    structuralHrs += res.hrs
    structuralMat += res.mat
    structuralSubMat += res.subMat
    addWp(res)
    pipDetails.push({ ...res, lf: wall.lf, heightIn: wall.heightIn })
  })
  ;(state.modularWalls || []).forEach(wall => {
    const res = calcOneModular(
      wall,
      wall.footingPump ?? 'No',
      r,
      mp,
      materialRows,
      resolveMasterBlock(wall, materialRows, MODULAR_SUBCAT)
    )
    structuralHrs += res.hrs
    structuralMat += res.mat
    structuralSubMat += res.subMat
    addWp(res)
    modularDetails.push(res.detail)
  })
  ;(state.brickWalls || []).forEach(wall => {
    const res = calcOneBrick(wall, r, mp, materialRows)
    structuralHrs += res.hrs
    structuralMat += res.mat
    structuralSubMat += res.subMat
    addWp(res)
    brickDetails.push(res.detail)
  })

  // Timber / Lumber — now a multi-wall array. Each wall runs the SAME install math
  // (wood + course + steel posts + footing rebar/pour) and accumulates into the
  // timberHrs (Timber crew) bucket; material/sub flow into structuralMat/Sub. The
  // per-wall Demo (slope + dig-haul) is added below via addDemo → demoHrs (Demo
  // crew), NOT here — install stays in the Timber bucket.
  ;(state.timberWalls || []).forEach(wall => {
    if (!(n(wall.lf) > 0 || n(wall.posts) > 0)) return
    const postQty = n(wall.posts)
    // Timber material + labor via pure timberCore (wallsStruct.js). Wood price from
    // the selected type's Walls › Wood catalog entry for the chosen vendor. Timber
    // labor lands in its OWN bucket so the summary can crew it independently.
    const woodPrice = catalogItemPrice(materialRows, WOOD_SUBCAT, wall.timberType, wall.vendor)
    const _tc = timberCore(wall.lf, wall.heightIn, postQty, {
      lfLab: r('timberLfLab'),
      courseLab: r('timberCourseLab'),
      postLab: r('timberPostLab'),
      bdftBase: r('timberBdftBase'),
      bdftCourse: r('timberBdftCourse'),
      woodPrice,
      postMat: r('timberPostMat'),
    })
    timberHrs += _tc.hrs
    const woodMat = _tc.mat

    // Timber footing — dig + horizontal rebar + pour + concrete, identical math
    // to brick / PIP. Footing concrete + rebar resolve at Standard (Standard) prices
    // (timber's vendor picker is wood-only). Footing POUR labor lands in the timber
    // bucket so it's crewed with the timber wall. Blank width/depth ⇒ 0 footing.
    const tLF = n(wall.lf)
    const tfW = n(wall.footingWIn)
    const tfD = n(wall.footingDIn)
    const tHb = n(wall.horizBars)
    const tFootingCF = tfW > 0 && tfD > 0 ? tLF * (tfW / 12) * (tfD / 12) : 0
    const tFootingCY = tFootingCF / 27
    const tHorizRebarLF = tHb * tLF
    const tFootPump = (wall.footingPump ?? 'No') === 'Yes'
    const tpm = key => wallMatPrice(WALL_RATES[key].db, 'Standard', materialRows, mp)
    // Footing excavation is priced in the Dig and Haul Footing Soil section —
    // install (rebar + pour) + material only here.
    const tFootingHrs =
      (tHorizRebarLF > 0 ? tHorizRebarLF * r('rebarLab') : 0) +
      (tFootingCY > 0 ? tFootingCY / r(tFootPump ? 'footingPourPumpLab' : 'footingPourHandLab') : 0)
    const tFootConcPrc = tFootPump ? tpm('concreteTruck') : tpm('concreteHand')
    const tFootingMat = tFootingCY * tFootConcPrc + tHorizRebarLF * rebarPrice(wall.footingRebarSize, r)
    timberHrs += tFootingHrs

    const timberMat = woodMat + tFootingMat
    structuralMat += timberMat
    // Sub flat: default $/LF = In-House timber material ÷ LF (wood + footing +
    // posts folded in); overridable via the wall's subEach. Posts-only bills flat.
    const tSubUnit = tLF > 0 ? timberMat / tLF : 0
    const tSubEach = wall.subEach !== '' && wall.subEach != null ? n(wall.subEach) : tSubUnit
    structuralSubMat += tLF > 0 ? tLF * tSubEach : timberMat
  })

  // ── Wall Finishes & Caps — now specified PER WALL. Gather each wall's own
  //    finishRows / capRows across every wall type; per-row math is identical
  //    to the original global sections, so totals are unchanged. ────────────
  const allWalls = [
    ...(state.cmuWalls || []),
    ...(state.pipWalls || []),
    ...(state.modularWalls || []),
    ...(state.brickWalls || []),
  ]
  const finishRows = allWalls
    .flatMap(w => w.finishRows || [])
    .map(row => computeWallFinishRow(row, mp, materialRows))
  const finishHrs = finishRows.reduce((a, x) => a + (x.hrs || 0), 0)
  const finishMat = finishRows.reduce((a, x) => a + (x.mat || 0), 0)
  const finishSubMat = finishRows.reduce((a, x) => a + (x.subMat || 0), 0)

  const capResults = allWalls
    .flatMap(w => w.capRows || [])
    .map(row => computeCapRow(row, mp, materialRows))
  const capHrs = capResults.reduce((a, x) => a + (x.hrs || 0), 0)
  const capMat = capResults.reduce((a, x) => a + (x.mat || 0), 0)
  const capSubMat = capResults.reduce((a, x) => a + (x.subMat || 0), 0)

  // ── Waterproofing — now specified PER WALL. Each wall entry's wpRows were
  //    summed above into wallWp*. (Legacy tab-level wpRows are migrated onto
  //    the first CMU wall by makeTab, so totals stay consistent.) ────────────
  const wpHrs = wallWpHrs
  const wpMat = wallWpMat
  const wpSubMat = wallWpSubMat

  // Manual
  let manHrs = 0,
    manMat = 0,
    manSub = 0
  ;(state.manualRows || []).forEach(row => {
    manHrs += n(row.hours)
    manMat += n(row.materials)
    manSub += n(row.subCost)
  })

  // ── Per-wall Demo — sum every wall's Demo section (all 5 wall types),
  //    reusing the Demo modules' DIRT math via wallDemo (table-driven). Yields
  //    labor hours, removal tons and container dump fees. With no demo inputs
  //    entered all three are 0, so the aggregate totals are unchanged. ──
  let demoHrs = 0,
    demoTons = 0,
    demoDump = 0
  const addDemo = w => {
    const d = wallDemo(w, r)
    demoHrs += d.hrs
    demoTons += d.tons
    demoDump += d.dump
  }
  ;(state.cmuWalls || []).forEach(addDemo)
  ;(state.pipWalls || []).forEach(addDemo)
  ;(state.modularWalls || []).forEach(addDemo)
  ;(state.brickWalls || []).forEach(addDemo)
  // Each timber wall's Demo (slope + dig-haul footing soil) → demoHrs (Demo crew).
  ;(state.timberWalls || []).forEach(addDemo)

  // ── Per-wall Drainage (French Drain) — one perforated pipe run (+ optional
  //    fabric + gravel bed) per wall, table-driven via the shared Drainage rows.
  //    Feeds the In-House structural hours/material buckets (In-House only — Sub
  //    totals untouched). Empty (0 LF) sections contribute 0, so totals are
  //    unchanged without drainage inputs. ──
  const addDrain = w => {
    const d = wallDrain(w, r, lrph)
    structuralHrs += d.hrs
    structuralMat += d.mat
  }
  ;(state.cmuWalls || []).forEach(addDrain)
  ;(state.pipWalls || []).forEach(addDrain)
  ;(state.modularWalls || []).forEach(addDrain)
  ;(state.brickWalls || []).forEach(addDrain)
  ;(state.timberWalls || []).forEach(addDrain)

  // ── Per-wall Backfilling & Compaction — grade-fill (per equipment) + compaction
  //    hours, sharing the Demo module's rates. In-House structural hours only.
  const addBackfill = w => {
    structuralHrs += wallBackfill(w, r).hrs
  }
  ;(state.cmuWalls || []).forEach(addBackfill)
  ;(state.pipWalls || []).forEach(addBackfill)
  ;(state.modularWalls || []).forEach(addBackfill)
  ;(state.brickWalls || []).forEach(addBackfill)
  ;(state.timberWalls || []).forEach(addBackfill)

  // ── Three labor buckets for the summary (raw hours, pre-difficulty/walk):
  //   • mainInstallHrs = structural(minus timber) + finish + cap + wp + man
  //   • demoHrs        = the per-wall Demo total (above)
  //   • timberHrs      = the Timber tab's labor only
  const mainInstallHrs = structuralHrs + finishHrs + capHrs + wpHrs + manHrs

  // ── In-House totals ──────────────────────────────────────────────────────
  // baseHrs still carries timber (it was folded into structuralHrs before) and
  // now ALSO the demo hours; with demo = 0 this equals the pre-change baseHrs
  // exactly, so totals / manDays / laborCost are byte-identical without demo.
  const baseHrs = mainInstallHrs + timberHrs + demoHrs
  const diffMod = 1 + n(state.difficulty) / 100
  const _adjHrs = baseHrs * diffMod + n(state.hoursAdj)
  const walkHrsIH = calcWalkAccessLabor(_adjHrs, state.distanceLF, { paceLfPerMin: _pace })
  const totalHrsIH = _adjHrs + walkHrsIH
  // Demo dump fees are a removal (material) cost, matching how the Demo modules
  // treat container disposal — added to the in-house material total (0 with no
  // demo, so the totals stay byte-identical without demo inputs).
  const totalMatIH = structuralMat + finishMat + capMat + wpMat + manMat + demoDump
  const totalSubMat = structuralSubMat + finishSubMat + capSubMat + wpSubMat

  const isSubTab = state.subType === 'Subcontractor'
  const subMarkup = n(state.subGpMarkupRate)
  let gp,
    subCost,
    subGp,
    commission,
    price,
    totalHrs,
    manDays,
    totalMat,
    laborCost,
    burden,
    walkHrs
  if (isSubTab) {
    // Sub tab: flat per-unit material only, NO labor hours. The itemized flat
    // cost IS the subcontractor cost; profit is the markup (Sub GP).
    walkHrs = 0
    totalHrs = 0
    manDays = 0
    laborCost = 0
    burden = 0
    // In-house materials are 0 on the Sub tab — sub materials live in subCost.
    totalMat = 0
    gp = 0
    subCost = totalSubMat + manSub
    subGp = subCost * subMarkup
    commission = subGp * n(state.commissionRate)
    price = subCost + subGp + commission
  } else {
    walkHrs = walkHrsIH
    totalHrs = totalHrsIH
    manDays = totalHrs / 8
    totalMat = totalMatIH
    laborCost = totalHrs * lrph
    burden = laborCost * n(laborBurdenPct)
    gp = manDays * gpmd
    subCost = manSub
    subGp = 0
    commission = gp * n(state.commissionRate)
    price = totalMat + laborCost + burden + gp + commission + subCost
  }

  return {
    totalHrs,
    manDays,
    totalMat,
    laborCost,
    burden,
    gp,
    subGp,
    commission,
    subCost,
    price,
    walkHrs,
    structuralHrs,
    finishHrs,
    capHrs,
    wpHrs,
    // Three labor buckets for the summary's split lines (raw hours).
    mainInstallHrs,
    demoHrs,
    demoTons,
    demoDump,
    timberHrs,
    structuralMat,
    finishMat,
    capMat,
    wpMat,
    cmuDetails,
    pipDetails,
    modularDetails,
    brickDetails,
    finishRows,
    capResults,
  }
}

// ── Sub-components ────────────────────────────────────────────────────────────
function SectionHeader({ title }) {
  const isSub = useContext(SubTabContext)
  return (
    <div className="bg-gray-100 rounded-lg px-4 py-2.5 border border-gray-200 mb-2">
      <h3 className="text-xs font-bold text-gray-600 uppercase tracking-wider">{subSectionTitle(title, isSub)}</h3>
    </div>
  )
}

function NumInput({ value, onChange, placeholder = '0', className = '' }) {
  return (
    <input
      type="number"
      step="any"
      className={`input text-sm py-1.5 ${className}`}
      placeholder={placeholder}
      value={value}
      onChange={e => onChange(e.target.value)}
    />
  )
}

function LabeledRow({ label, children }) {
  return (
    <div className="flex items-center gap-3 py-1.5 border-b border-gray-100">
      <span className="text-xs text-gray-700 w-52 shrink-0">{label}</span>
      {children}
    </div>
  )
}

const DEFAULT_MANUAL_ROWS = [{ label: '', hours: '', materials: '', subCost: '' }]
const DEFAULT_CAP_ROWS = [blankCapRow(), blankCapRow()]
const CAP_TYPES = ['None', 'Flagstone', 'Precast', 'PIP Concrete', 'Bullnose Brick']

// ── Per-tab input record ──────────────────────────────────────────────────────
// In-House and Sub each hold their own independent copy so the two tabs are
// separate calculators. Backward-compat: legacy single-entry / flat fields are
// migrated into the array forms below.
// Waterproofing is now a SINGLE field per wall — collapse any legacy multi-row
// wp to the first meaningful line (prefer the first non-None).
function initWallWp(w = {}) {
  const rows = Array.isArray(w.wpRows) ? w.wpRows.map(r => ({ vendor: 'Standard', subEach: '', ...r })) : []
  if (!rows.length) return [blankWpRow()]
  const firstReal = rows.find(r => r.type && r.type !== 'None')
  return [firstReal || rows[0]]
}
// Per-wall Finishes / Caps — normalized copies. Default to ONE neutral row so
// every wall opens with an empty Finishes + Caps line the user can fill or leave.
function initWallExtras(w = {}) {
  const fin = Array.isArray(w.finishRows) && w.finishRows.length
    ? w.finishRows.map(r => ({ ...r }))
    : [blankWallFinishRow()]
  const cap = Array.isArray(w.capRows) && w.capRows.length
    ? w.capRows.map(r => ({ vendor: 'Standard', subEach: '', ...r }))
    : [blankCapRow()]
  return { finishRows: fin, capRows: cap }
}
function initCmuWalls(src = {}) {
  // Footing + grout pumps are now per-wall; legacy estimates carried module-level
  // values (cmuFootingPump / cmuGroutPump) — inherit them onto each wall so
  // totals don't move.
  const legacyPump = src.cmuFootingPump ?? 'No'
  const legacyGrout = src.cmuGroutPump ?? 'No'
  if (src.cmuWalls)
    return src.cmuWalls.map(w => ({
      blockType: DEFAULT_BLOCK_NAME,
      vendor: 'Standard',
      subEach: '',
      wallRebarSize: '#4',
      wallHorizBars: '',
      wallHorizRebarSize: '#4',
      footingRebarSize: '#4',
      ...DEMO_DEFAULTS(),
      ...DRAIN_DEFAULTS(),
  ...BACKFILL_DEFAULTS(),
      ...w,
      footingPump: w.footingPump ?? legacyPump,
      groutPump: w.groutPump ?? legacyGrout,
      wpRows: initWallWp(w),
      ...initWallExtras(w),
    }))
  if (src.cmuLF !== undefined)
    return [
      {
        blockType: DEFAULT_BLOCK_NAME,
        vendor: 'Standard',
        lf: src.cmuLF,
        heightIn: src.cmuHeightIn,
        footingWIn: src.cmuFootingWIn ?? '12',
        footingDIn: src.cmuFootingDIn ?? '12',
        rebarSpIn: src.cmuRebarSpIn ?? '16',
        horizBars: src.cmuHorizBars ?? '2',
        bondBeams: src.cmuBondBeams ?? '1',
        bbVendor: src.cmuBbVendor ?? 'Standard',
        bbBlockType: src.cmuBbBlockType ?? '',
        pctGrouted: src.cmuPctGrouted ?? '100',
        pctCurved: src.cmuPctCurved ?? '0',
        footingPump: legacyPump,
        groutPump: legacyGrout,
        subEach: '',
        wpRows: [blankWpRow()],
        finishRows: [blankWallFinishRow()],
        capRows: [blankCapRow()],
      },
    ]
  return [DEFAULT_CMU()]
}
function initPipWalls(src = {}) {
  // PIP footing pumped by default ('Yes' = ready-mix truck, matching the prior
  // always-truck behavior); the per-wall toggle can switch to hand mix.
  if (src.pipWalls)
    return src.pipWalls.map(w => ({
      vendor: 'Standard',
      subEach: '',
      pipFootingRebarSize: '#4',
      pipWallHorizBars: '',
      pipWallHorizSize: '#4',
      pipWallVertBars: '',
      pipVertSize: '#4',
      ...DEMO_DEFAULTS(),
      ...DRAIN_DEFAULTS(),
  ...BACKFILL_DEFAULTS(),
      ...w,
      footingPump: w.footingPump ?? 'Yes',
      wpRows: initWallWp(w),
      ...initWallExtras(w),
    }))
  if (src.pipLF !== undefined)
    return [
      {
        vendor: 'Standard',
        lf: src.pipLF,
        heightIn: src.pipHeightIn,
        footingPump: 'Yes',
        subEach: '',
        wpRows: [blankWpRow()],
        finishRows: [blankWallFinishRow()],
        capRows: [blankCapRow()],
      },
    ]
  return [DEFAULT_PIP()]
}
function initModularWalls(src = {}) {
  const legacyPump = src.modularFootingPump ?? 'No'
  if (src.modularWalls)
    return src.modularWalls.map(w => ({
      blockType: DEFAULT_BLOCK_NAME,
      vendor: 'Standard',
      subEach: '',
      ...DEMO_DEFAULTS(),
      ...DRAIN_DEFAULTS(),
  ...BACKFILL_DEFAULTS(),
      ...w,
      footingPump: w.footingPump ?? legacyPump,
      wpRows: initWallWp(w),
      ...initWallExtras(w),
    }))
  return [DEFAULT_MODULAR()]
}
function initBrickWalls(src = {}) {
  const legacyPump = src.brickFootingPump ?? 'No'
  if (src.brickWalls)
    return src.brickWalls.map(w => ({
      blockType: DEFAULT_BLOCK_NAME,
      vendor: 'Standard',
      subEach: '',
      ...DEMO_DEFAULTS(),
      ...DRAIN_DEFAULTS(),
  ...BACKFILL_DEFAULTS(),
      ...w,
      footingPump: w.footingPump ?? legacyPump,
      brickFootingRebarSize: w.brickFootingRebarSize ?? '#4',
      wpRows: initWallWp(w),
      ...initWallExtras(w),
    }))
  return [DEFAULT_BRICK()]
}
// Timber walls hydrate exactly like the other wall arrays: map each saved entry,
// folding in its OWN Demo / Drainage / Backfill defaults + install defaults, then
// overlaying the saved fields. LEGACY: a pre-array estimate stored ONE flat timber
// wall (timberLF/timberType/… + nested timberDemo/timberDrain/timberBackfill) —
// migrate it into a single array entry so old bids open byte-for-byte unchanged.
function initTimberWalls(src = {}) {
  if (src.timberWalls)
    return src.timberWalls.map(w => ({
      vendor: 'Standard',
      timberType: 'Railroad Treated',
      subEach: '',
      horizBars: '2',
      footingRebarSize: '#4',
      footingPump: 'No',
      ...DEMO_DEFAULTS(),
      ...DRAIN_DEFAULTS(),
      ...BACKFILL_DEFAULTS(),
      ...w,
    }))
  const hasLegacyTimber =
    src.timberLF !== undefined ||
    src.timberType !== undefined ||
    src.timberPosts !== undefined ||
    src.timberDemo != null ||
    src.timberDrain != null ||
    src.timberBackfill != null
  if (hasLegacyTimber)
    return [
      {
        vendor: src.timberVendor ?? 'Standard',
        timberType: src.timberType ?? 'Railroad Treated',
        lf: src.timberLF ?? '',
        heightIn: src.timberHeightIn ?? '',
        posts: src.timberPosts ?? '',
        subEach: src.timberSubEach ?? '',
        footingWIn: src.timberFootingWIn ?? '',
        footingDIn: src.timberFootingDIn ?? '',
        horizBars: src.timberHorizBars ?? '2',
        footingRebarSize: src.timberFootingRebarSize ?? '#4',
        footingPump: src.timberFootingPump ?? 'No',
        ...DEMO_DEFAULTS(),
        ...DRAIN_DEFAULTS(),
        ...BACKFILL_DEFAULTS(),
        ...(src.timberDemo || {}),
        ...(src.timberDrain || {}),
        ...(src.timberBackfill || {}),
      },
    ]
  return [DEFAULT_TIMBER()]
}
function initWpRows(src = {}) {
  if (Array.isArray(src.wpRows) && src.wpRows.length)
    return src.wpRows.map(w => ({ vendor: 'Standard', subEach: '', ...w }))
  if (src.wpType || src.wpSF)
    return [{ vendor: 'Standard', type: src.wpType || 'None', sf: src.wpSF || '', subEach: '' }]
  return [blankWpRow()]
}
// Migrate the legacy fixed finish fields (sandStuccoSF / …RateIn) into the new
// row model. Each legacy finish that has SF or an override rate becomes a
// Standard-vendor row so its In-House numbers stay byte-for-byte identical.
function initWallFinishRows(src = {}) {
  if (Array.isArray(src.wallFinishRows) && src.wallFinishRows.length)
    return src.wallFinishRows.map(r => ({ ...r }))
  const rows = []
  const push = (type, sfKey, rateKey) => {
    if (n(src[sfKey]) > 0 || (src[rateKey] != null && src[rateKey] !== ''))
      rows.push({
        vendor: 'Standard',
        type,
        sf: src[sfKey] ?? '',
        rateIn: src[rateKey] ?? '',
        subEach: '',
      })
  }
  push('Sand Stucco', 'sandStuccoSF', 'sandStuccoRateIn')
  push('Smooth Stucco', 'smoothStuccoSF', 'smoothStuccoRateIn')
  push('Ledgerstone', 'ledgerstoneSF', 'ledgerstoneRateIn')
  push('Stacked Stone', 'stackedStoneSF', 'stackedStoneRateIn')
  push('Tile', 'tileSF', 'tileRateIn')
  push('Real Flagstone', 'flagstoneSF', 'flagstoneRateIn')
  push('Real Stone', 'realStoneSF', 'realStoneRateIn')
  return rows.length ? rows : [blankWallFinishRow(), blankWallFinishRow()]
}
function makeTab(src = {}) {
  const cmuWalls = initCmuWalls(src)
  // Legacy estimates stored a single tab-level waterproofing set (wpRows /
  // wpType / wpSF) that rendered inside the CMU section. Waterproofing is now
  // per wall, so fold any legacy tab-level entries onto the first CMU wall —
  // this keeps old estimates' totals byte-for-byte identical.
  if (!src.cmuWalls) {
    const legacyWp = initWpRows(src).filter(w => w.type && w.type !== 'None')
    if (legacyWp.length && cmuWalls[0]) {
      // Single wp per wall now — keep the first legacy line if the wall has none.
      const existing = (cmuWalls[0].wpRows || []).find(w => w.type && w.type !== 'None')
      cmuWalls[0].wpRows = [existing || legacyWp[0]]
    }
  }
  // Finishes & Caps are per-wall now. Old estimates stored one global list
  // (wallFinishRows / capRows) — fold the REAL (non-empty) rows onto the first
  // CMU wall so totals stay byte-for-byte identical. New estimates already carry
  // per-wall finishRows/capRows (detected below) and skip this.
  const anyWall = [
    ...(src.cmuWalls || []),
    ...(src.pipWalls || []),
    ...(src.modularWalls || []),
    ...(src.brickWalls || []),
  ]
  const isNewFormat = anyWall.some(w => Array.isArray(w.finishRows) || Array.isArray(w.capRows))
  if (!isNewFormat && cmuWalls[0]) {
    const legacyFinish = initWallFinishRows(src).filter(
      row => n(row.sf) > 0 || (row.rateIn != null && row.rateIn !== '')
    )
    const legacyCaps = (Array.isArray(src.capRows) ? src.capRows : [])
      .map(row => ({ vendor: 'Standard', subEach: '', ...row }))
      .filter(row => row.type && row.type !== 'None')
    if (legacyFinish.length)
      cmuWalls[0].finishRows = [...(cmuWalls[0].finishRows || []), ...legacyFinish]
    if (legacyCaps.length) cmuWalls[0].capRows = [...(cmuWalls[0].capRows || []), ...legacyCaps]
  }
  return {
    difficulty: src.difficulty ?? '',
    hoursAdj: src.hoursAdj ?? '',
    wallType: src.wallType ?? 'CMU',
    distanceLF: src.distanceLF ?? '',
    cmuWalls,
    cmuFootingPump: src.cmuFootingPump ?? 'No',
    cmuGroutPump: src.cmuGroutPump ?? 'No',
    pipWalls: initPipWalls(src),
    modularWalls: initModularWalls(src),
    modularFootingPump: src.modularFootingPump ?? 'No',
    brickWalls: initBrickWalls(src),
    brickFootingPump: src.brickFootingPump ?? 'No',
    // Timber / Lumber is now a multi-wall array (mirrors CMU/PIP/etc.). Each entry
    // carries its own install inputs + Demo/Drainage/Backfill. Legacy flat timber
    // estimates migrate into a single array entry inside initTimberWalls.
    timberWalls: initTimberWalls(src),
    manualRows: src.manualRows ?? DEFAULT_MANUAL_ROWS.map(r => ({ ...r })),
  }
}

// Vendors from `vendorOptions` that actually have a priced product in `subcat`
// (the Standard/Standard option is always kept). Prevents a vendor that only supplies
// one wall sub-type (e.g. Modular Wall) from appearing in another sub-type's picker
// (e.g. CMU Wall Block) just because both share the 'Walls' category.
function vendorOptsForSub(vendorOptions, materialRows, subcat) {
  if (!subcat) return vendorOptions || [{ value: 'Standard', label: 'Standard' }]
  const allowed = new Set(
    (materialRows || []).filter(r => r.sub_category === subcat && r.vendor_id).map(r => r.vendor_id)
  )
  return (vendorOptions || [{ value: 'Standard', label: 'Standard' }]).filter(
    o => o.value === 'Standard' || allowed.has(o.value)
  )
}

// ── Per-wall Waterproofing field ──────────────────────────────────────────────
// A SINGLE waterproofing line that is a standard field on every wall entry (it
// carries over with each wall the user adds). No add/remove — edits the wall's
// own wpRows[0] via onWpUpdate. "None" contributes nothing.
function WallWaterproofing({
  wpRows,
  vendorOptions,
  materialPrices,
  materialRows,
  isSub,
  refreshAllRates,
  onWpUpdate,
}) {
  const pp = usePricePrompt()
  const row = (Array.isArray(wpRows) && wpRows[0]) || blankWpRow()
  const rr = key => n(materialPrices?.[WALL_RATES[key].db])
  const wpKey = WP_KEY[row.type]
  const wpc = computeWpRow(row, materialPrices, materialRows)
  // Live $/SF for the selected product (per vendor) — shown next to the SF field.
  const wpUnit =
    row.type && row.type !== 'None'
      ? catalogItemPrice(materialRows, WALL_WP_SUBCAT, row.type, row.vendor)
      : 0
  // Options come ONLY from the catalog (single source of truth): the selected
  // vendor's Waterproofing products, or the Standard catalog for Standard. No
  // built-in WP_TYPES seed. ("None" is added separately below.)
  const wpShown = wallCatalogTypes(materialRows, WALL_WP_SUBCAT, row.vendor)
  return (
    <div className="mt-3 border-t border-gray-100 pt-2">
      <label className="block text-xs text-gray-800 mb-1 font-medium">Waterproofing</label>
      <div className="flex items-center gap-1.5 flex-wrap">
        <DropdownSelect
          className="input text-sm py-1.5 flex-1 min-w-0"
          value={row.vendor || 'Standard'}
          onChange={v => {
            onWpUpdate(0, 'vendor', v)
            pp.check(materialRows, WALL_WP_SUBCAT, row.type, v)
          }}
          options={vendorOptsForSub(vendorOptions, materialRows, WALL_WP_SUBCAT)}
        />
        <DropdownSelect
          className="input text-sm py-1.5 flex-[1.5] min-w-0"
          value={row.type || 'None'}
          onChange={v => {
            onWpUpdate(0, 'type', v)
            pp.check(materialRows, WALL_WP_SUBCAT, v, row.vendor)
          }}
          options={[
            { value: 'None', label: 'None' },
            ...wpShown.map(t => ({ value: t, label: t })),
            // Backward-compat: keep a previously-saved value selectable even if the
            // catalog no longer lists it for this vendor.
            ...(row.type && row.type !== 'None' && !wpShown.includes(row.type)
              ? [{ value: row.type, label: row.type }]
              : []),
          ]}
        />
        {/* SF is a PERMANENT field on the row — always shown, regardless of the
            selected type (a "None" row simply doesn't bill it). */}
        <NumInput
          value={row.sf}
          onChange={v => onWpUpdate(0, 'sf', v)}
          placeholder="0"
          className="w-20 shrink-0"
        />
        <span className="text-xs text-gray-400 shrink-0">Sq Ft</span>
        {row.type !== 'None' && (
          <span className="inline-flex items-center gap-1 text-xs text-gray-400 shrink-0">
            ${r2(wpUnit).toFixed(2)}/SF
          </span>
        )}
        {row.type !== 'None' && n(row.sf) > 0 && (
          <span className="text-xs text-gray-500 shrink-0">
            = <strong>{r2(wpc.mat).toFixed(2)}</strong> mat · {r2(wpc.hrs).toFixed(2)} hrs
          </span>
        )}
        {isSub && row.type !== 'None' && (
          <div className="relative w-24">
            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">$</span>
            <input
              type="number"
              step="any"
              className="input text-sm py-1.5 pl-5 w-full"
              placeholder={r2(wpc.subUnit).toString()}
              value={row.subEach ?? ''}
              onChange={e => onWpUpdate(0, 'subEach', e.target.value)}
            />
          </div>
        )}
      </div>
      {pp.prompt && (
        <MissingPriceModal {...pp.prompt} onClose={pp.close} onSaved={refreshAllRates} />
      )}
    </div>
  )
}

// ── Per-wall Finishes editor ──────────────────────────────────────────────────
// Add / edit / remove finish rows scoped to one wall. Math is identical to the
// original global section — only the row source is per-wall. Handlers:
//   onPatch(i, patch, recompute) · onAdd() · onRemove(i)
function WallFinishesEditor({
  rows = [],
  onPatch,
  onAdd,
  onRemove,
  vendorOptions,
  materialRows,
  refreshAllRates,
}) {
  const pp = usePricePrompt()
  return (
    <div className="mt-3 border-t border-gray-100 pt-2">
      <label className="block text-xs text-gray-800 mb-1 font-medium">Finishes</label>
      <div className="space-y-1.5">
        {rows.map((row, i) => {
          // Item list comes ONLY from the catalog (single source of truth): the
          // selected vendor's Wall Finish products, or the Standard catalog for
          // Standard. No built-in WALL_FINISH_TYPES seed. Stale saved values not
          // in the catalog are dropped (except the currently-saved one, kept below
          // for backward-compat).
          const shown = wallCatalogTypes(materialRows, WALL_FINISH_SUBCAT, row.vendor)
          return (
            <div key={i} className="flex items-center gap-1.5">
              <DropdownSelect
                className="input text-sm py-1 flex-1 min-w-0"
                value={row.vendor || 'Standard'}
                onChange={v => {
                  onPatch(i, { vendor: v }, true)
                  pp.check(materialRows, WALL_FINISH_SUBCAT, row.type, v)
                }}
                options={vendorOptsForSub(vendorOptions, materialRows, WALL_FINISH_SUBCAT)}
              />
              <DropdownSelect
                className="input text-sm py-1 flex-[1.5] min-w-0"
                value={row.type || ''}
                placeholder="Select finish"
                onChange={v => {
                  onPatch(i, { type: v }, true)
                  pp.check(materialRows, WALL_FINISH_SUBCAT, v, row.vendor)
                }}
                options={[
                  { value: 'None', label: 'None' },
                  ...shown.map(t => ({ value: t, label: t })),
                  ...(row.type && row.type !== 'None' && !shown.includes(row.type)
                    ? [{ value: row.type, label: row.type }]
                    : []),
                ]}
              />
              <NumInput
                value={row.sf}
                onChange={v => onPatch(i, { sf: v }, false)}
                placeholder="0"
                className="w-20 shrink-0"
              />
              <span className="text-xs text-gray-400 shrink-0">Sq Ft</span>
              <button
                type="button"
                onClick={() => onRemove(i)}
                className="text-gray-300 hover:text-red-500 text-sm px-1 shrink-0"
                title="Remove row"
              >
                ✕
              </button>
            </div>
          )
        })}
        <button
          type="button"
          onClick={onAdd}
          className="mt-1 text-xs px-2 py-1 rounded bg-slate-100 text-slate-700 hover:bg-slate-200"
        >
          + Add finish
        </button>
      </div>
      {pp.prompt && (
        <MissingPriceModal {...pp.prompt} onClose={pp.close} onSaved={refreshAllRates} />
      )}
    </div>
  )
}

// ── Per-wall Caps editor ──────────────────────────────────────────────────────
// Add / edit / remove cap rows scoped to one wall. Identical cap math.
function WallCapsEditor({ rows = [], onPatch, onAdd, onRemove, vendorOptions, materialRows, refreshAllRates }) {
  const pp = usePricePrompt()
  return (
    <div className="mt-3 border-t border-gray-100 pt-2">
      <label className="block text-xs text-gray-800 mb-1 font-medium">Caps</label>
      <div className="space-y-1.5">
        {rows.map((row, i) => {
          // Item list comes ONLY from the catalog (single source of truth): the
          // selected vendor's Wall Cap products, or the Standard catalog for
          // Standard. No built-in CAP_TYPES seed. Stale saved values not in the
          // catalog are dropped (except the currently-saved one, kept below for
          // backward-compat).
          const shown = wallCatalogTypes(materialRows, WALL_CAP_SUBCAT, row.vendor)
          const qtyLabel = row.type === 'Precast' ? 'Qty' : 'LF'
          return (
            <div key={i} className="flex items-center gap-1.5">
              <DropdownSelect
                className="input text-sm py-1 flex-1 min-w-0"
                value={row.vendor || 'Standard'}
                onChange={v => {
                  onPatch(i, { vendor: v }, true)
                  pp.check(materialRows, WALL_CAP_SUBCAT, row.type, v)
                }}
                options={vendorOptsForSub(vendorOptions, materialRows, WALL_CAP_SUBCAT)}
              />
              <DropdownSelect
                className="input text-sm py-1 flex-[1.5] min-w-0"
                value={row.type || ''}
                placeholder="Select cap"
                onChange={v => {
                  onPatch(i, { type: v }, true)
                  pp.check(materialRows, WALL_CAP_SUBCAT, v, row.vendor)
                }}
                options={[
                  { value: 'None', label: 'None' },
                  ...shown.map(t => ({ value: t, label: t })),
                  ...(row.type && row.type !== 'None' && !shown.includes(row.type)
                    ? [{ value: row.type, label: row.type }]
                    : []),
                ]}
              />
              <NumInput
                value={row.widthIn}
                onChange={v => onPatch(i, { widthIn: v }, true)}
                placeholder={row.type === 'Precast' ? '8' : '4'}
                className="w-16 shrink-0"
              />
              <span className="text-xs text-gray-400 shrink-0">W&quot;</span>
              <NumInput
                value={row.type === 'Precast' ? row.qty : row.lf}
                onChange={v =>
                  onPatch(i, row.type === 'Precast' ? { qty: v } : { lf: v }, false)
                }
                placeholder="0"
                className="w-20 shrink-0"
              />
              <span className="text-xs text-gray-400 shrink-0">{qtyLabel}</span>
              <button
                type="button"
                onClick={() => onRemove(i)}
                className="text-gray-300 hover:text-red-500 text-sm px-1 shrink-0"
                title="Remove row"
              >
                ✕
              </button>
            </div>
          )
        })}
        <button
          type="button"
          onClick={onAdd}
          className="mt-1 text-xs px-2 py-1 rounded bg-slate-100 text-slate-700 hover:bg-slate-200"
        >
          + Add cap
        </button>
      </div>
      {pp.prompt && (
        <MissingPriceModal {...pp.prompt} onClose={pp.close} onSaved={refreshAllRates} />
      )}
    </div>
  )
}

// ── Per-wall Demo section ─────────────────────────────────────────────────────
// Shared across every wall entry (CMU / PIP / Modular / Brick) and the inline
// Timber block. `onChange` is the entry's `set` curry: onChange('field')(val).
// The header + "Installation" label match the Caps/Finishes sub-header style.
function WallDemoSection({ wall = {}, onChange }) {
  const set = onChange
  const methodOpts = list => list.map(m => ({ value: m, label: m }))
  return (
    <div className="mb-3">
      <label className="block text-xs text-gray-800 mb-1 font-medium">Demo</label>
      {/* Slope Removal */}
      <div className="mb-2">
        <p className="text-[11px] text-gray-700 uppercase tracking-wide mb-1">Slope Removal</p>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Method</label>
            <DropdownSelect
              className="input text-sm py-1.5 w-full"
              value={wall.demoSlopeMethod || 'Hand'}
              onChange={set('demoSlopeMethod')}
              options={methodOpts(DEMO_SLOPE_METHODS)}
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Linear Feet</label>
            <NumInput value={wall.demoSlopeLf} onChange={set('demoSlopeLf')} />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Ave Height (in)</label>
            <NumInput value={wall.demoSlopeH} onChange={set('demoSlopeH')} />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Ave Depth (in)</label>
            <NumInput value={wall.demoSlopeD} onChange={set('demoSlopeD')} />
          </div>
        </div>
      </div>
      {/* Dig and Haul Footing Soil — flat CF/hr dig + soil-haul material. */}
      <div>
        <p className="text-[11px] text-gray-700 uppercase tracking-wide mb-1">Dig and Haul Footing Soil</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Method</label>
            <DropdownSelect
              className="input text-sm py-1.5 w-full"
              value={wall.demoFootMethod || 'Hand'}
              onChange={set('demoFootMethod')}
              options={methodOpts(DEMO_FOOT_METHODS)}
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Length (LF)</label>
            <NumInput value={wall.demoFootLen} onChange={set('demoFootLen')} />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Width (in)</label>
            <NumInput value={wall.demoFootW} onChange={set('demoFootW')} />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Depth (in)</label>
            <NumInput value={wall.demoFootD} onChange={set('demoFootD')} />
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Per-wall Drainage (French Drain) section ─────────────────────────────────
// Shared across every wall entry (CMU / PIP / Modular / Brick) and the inline
// Timber block. One perforated pipe run (+ optional fabric + gravel bed) per
// wall. Rates come from the Drainage module's shared rows. `onChange` is the
// entry's `set` curry: onChange('field')(val).
function WallDrainageSection({ wall = {}, onChange }) {
  const set = onChange
  const methodOpts = list => list.map(m => ({ value: m, label: m }))
  return (
    <div className="mt-3 mb-3">
      <label className="block text-xs text-gray-800 mb-1 font-medium">Drainage — French Drain</label>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Pipe Type</label>
          <DropdownSelect
            className="input text-sm py-1.5 w-full"
            value={wall.drainType || '4" Perforated'}
            onChange={set('drainType')}
            options={methodOpts(DRAIN_PIPE_TYPES)}
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Linear Feet</label>
          <NumInput value={wall.drainLf} onChange={set('drainLf')} />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Fabric</label>
          <DropdownSelect
            className="input text-sm py-1.5 w-full"
            value={wall.drainFabric || 'None'}
            onChange={set('drainFabric')}
            options={methodOpts(DRAIN_FABRIC_OPTS)}
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Gravel Bed</label>
          <DropdownSelect
            className="input text-sm py-1.5 w-full"
            value={wall.drainGravel || 'None'}
            onChange={set('drainGravel')}
            options={methodOpts(DRAIN_GRAVEL_OPTS)}
          />
        </div>
      </div>
    </div>
  )
}

function WallBackfillSection({ wall = {}, onChange }) {
  const set = onChange
  const methodOpts = list => list.map(m => ({ value: m, label: m }))
  return (
    <div className="mb-3">
      <label className="block text-xs text-gray-800 mb-1 font-medium">Backfilling and Compaction</label>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Length (LF)</label>
          <NumInput value={wall.bkLen} onChange={set('bkLen')} />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Width (in)</label>
          <NumInput value={wall.bkWidth} onChange={set('bkWidth')} />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Depth (in)</label>
          <NumInput value={wall.bkDepth} onChange={set('bkDepth')} />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Backfill Method</label>
          <DropdownSelect
            className="input text-sm py-1.5 w-full"
            value={wall.bkMethod || 'Hand'}
            onChange={set('bkMethod')}
            options={methodOpts(BACKFILL_METHODS)}
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Compaction</label>
          <DropdownSelect
            className="input text-sm py-1.5 w-full"
            value={wall.bkCompMethod || 'Jumping Jack'}
            onChange={set('bkCompMethod')}
            options={methodOpts(COMPACTION_METHODS)}
          />
        </div>
      </div>
    </div>
  )
}

// ── CMU Wall Entry ────────────────────────────────────────────────────────────
function CmuWallEntry({
  wall,
  idx,
  total,
  onChange,
  onRemove,
  detail,
  materialPrices,
  materialRows,
  vendorOptions,
  isSub,
  refreshAllRates,
  onWpUpdate,
  finishHandlers,
  capHandlers,
}) {
  const pp = usePricePrompt()
  const set = field => val => onChange(idx, field, val)
  const hasData = n(wall.lf) > 0 && n(wall.heightIn) > 0
  // Catalog-driven Block Type: the selected vendor's "Wall Block" products.
  const blockOpts = wallBlockOptions(materialRows, wall.vendor)
  // Legacy estimate: blockType is a built-in size name, not a catalog id — keep
  // it selectable + priced off the built-in catalog so old bids don't move.
  const legacyBlock =
    wall.blockType && !blockOpts.some(o => o.id === wall.blockType)
      ? CMU_BLOCK_TYPES.find(b => b.name === wall.blockType)
      : null
  return (
    <div className="border border-gray-200 rounded-xl p-3 mb-3 bg-white">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-black uppercase tracking-wide">
          Wall {idx + 1}
        </span>
        {total > 1 && (
          <button
            onClick={() => onRemove(idx)}
            className="text-xs text-red-400 hover:text-red-600 px-2 py-0.5 rounded border border-red-100 hover:border-red-300 transition-colors"
          >
            Remove
          </button>
        )}
      </div>
      <WallDemoSection wall={wall} onChange={set} />
      <WallBackfillSection wall={wall} onChange={set} />
      <label className="block text-xs text-gray-800 mb-1 font-medium">Installation</label>
      <div className="grid grid-cols-2 gap-2">
        {/* Vendor — the ONLY thing that changes where the material $ comes
            from. "Standard" = the original master-rate / catalog pricing. */}
        <div className="col-span-2">
          <label className="block text-xs text-gray-500 mb-1">Vendor</label>
          <DropdownSelect
            className="input text-sm py-1.5 w-full"
            value={wall.vendor || 'Standard'}
            onChange={nv => {
              set('vendor')(nv)
              // Point Block Type at a block this vendor actually offers.
              const opts = wallBlockOptions(materialRows, nv)
              if (opts.length && !opts.some(o => o.id === wall.blockType))
                set('blockType')(opts[0].id)
            }}
            options={vendorOptsForSub(vendorOptions, materialRows, WALL_BLOCK_SUBCAT)}
          />
        </div>
        {/* Block Type — the selected vendor's "Wall Block" catalog products
            (dims from calc_meta drive the block-count math). */}
        <div className="col-span-2">
          <label className="block text-xs text-gray-500 mb-1">Block Type</label>
          <DropdownSelect
            className="input text-sm py-1.5 w-full"
            value={wall.blockType || ''}
            onChange={v => {
              set('blockType')(v)
              pp.checkById(materialRows, v, wall.vendor)
            }}
            placeholder={blockOpts.length === 0 && !legacyBlock ? 'No block types for this vendor' : 'Select…'}
            options={[
              ...(legacyBlock
                ? [
                    {
                      value: legacyBlock.name,
                      label: `${legacyBlock.name} — ${legacyBlock.w}×${legacyBlock.h}×${legacyBlock.l}`,
                    },
                  ]
                : []),
              ...blockOpts.map(o => {
                const cm = o.calc_meta || {}
                const w = n(cm.block_w_in) || n(o.block_w_in) || 8
                const h = n(cm.block_h_in) || n(o.block_h_in) || 8
                const l = n(cm.block_l_in) || n(o.block_l_in) || 16
                return { value: o.id, label: `${o.name} — ${w}×${h}×${l}` }
              }),
            ]}
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Linear Feet</label>
          <NumInput value={wall.lf} onChange={set('lf')} placeholder="0" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Wall Height (in)</label>
          <NumInput value={wall.heightIn} onChange={set('heightIn')} placeholder="48" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Footing Width (in)</label>
          <NumInput value={wall.footingWIn} onChange={set('footingWIn')} placeholder="12" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Footing Depth (in)</label>
          <NumInput value={wall.footingDIn} onChange={set('footingDIn')} placeholder="12" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Rebar Spacing (in)</label>
          <NumInput value={wall.rebarSpIn} onChange={set('rebarSpIn')} placeholder="16" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Horiz. Bars in Footing</label>
          <NumInput value={wall.horizBars} onChange={set('horizBars')} placeholder="2" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Wall Rebar Size</label>
          <DropdownSelect
            className="input text-sm py-1.5 w-full"
            value={wall.wallRebarSize || '#4'}
            onChange={v => set('wallRebarSize')(v)}
            options={REBAR_SIZES.map(s => ({ value: s, label: s }))}
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Footing Rebar Size</label>
          <DropdownSelect
            className="input text-sm py-1.5 w-full"
            value={wall.footingRebarSize || '#4'}
            onChange={v => set('footingRebarSize')(v)}
            options={REBAR_SIZES.map(s => ({ value: s, label: s }))}
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Wall Horizontal Bars</label>
          <NumInput value={wall.wallHorizBars} onChange={set('wallHorizBars')} placeholder="0" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Wall Horiz Rebar Size</label>
          <DropdownSelect
            className="input text-sm py-1.5 w-full"
            value={wall.wallHorizRebarSize || '#4'}
            onChange={v => set('wallHorizRebarSize')(v)}
            options={REBAR_SIZES.map(s => ({ value: s, label: s }))}
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">% Grouted Solid</label>
          <div className="relative">
            <NumInput value={wall.pctGrouted} onChange={set('pctGrouted')} placeholder="100" />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
              %
            </span>
          </div>
        </div>
        <div className="col-span-2 sm:col-span-1">
          <label className="block text-xs text-gray-500 mb-1">% of Wall Curved</label>
          <div className="relative">
            <NumInput value={wall.pctCurved} onChange={set('pctCurved')} placeholder="0" />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
              %
            </span>
          </div>
        </div>
        <div className="col-span-2 sm:col-span-1">
          <label className="block text-xs text-gray-500 mb-1">Pump for Footing?</label>
          <DropdownSelect
            className="input text-sm py-1.5 w-full"
            value={wall.footingPump || 'No'}
            onChange={v => set('footingPump')(v)}
            options={[{ value: 'No', label: 'No' }, { value: 'Yes', label: 'Yes' }]}
          />
        </div>
        <div className="col-span-2 sm:col-span-1">
          <label className="block text-xs text-gray-500 mb-1">Pump for Grouting?</label>
          <DropdownSelect
            className="input text-sm py-1.5 w-full"
            value={wall.groutPump || 'No'}
            onChange={v => set('groutPump')(v)}
            options={[{ value: 'No', label: 'No' }, { value: 'Yes', label: 'Yes' }]}
          />
        </div>
      </div>
      {isSub && (
        <div className="mt-2 flex items-center gap-2 flex-wrap">
          <span className="text-xs text-gray-500">Sub flat $ per Ln Ft</span>
          <div className="relative w-28">
            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">$</span>
            <input
              type="number"
              step="any"
              className="input text-sm py-1.5 pl-5 w-full"
              placeholder={detail ? (detail.subUnit || 0).toFixed(2) : '0.00'}
              value={wall.subEach ?? ''}
              onChange={e => set('subEach')(e.target.value)}
            />
          </div>
          <span className="text-[11px] text-gray-400">
            default = material ÷ LF · no labor billed on Sub
          </span>
        </div>
      )}
      <WallDrainageSection wall={wall} onChange={set} />
      <WallCapsEditor
        rows={wall.capRows || []}
        vendorOptions={vendorOptions}
        materialPrices={materialPrices}
        materialRows={materialRows}
        isSub={isSub}
        refreshAllRates={refreshAllRates}
        {...(capHandlers || {})}
      />
      <WallFinishesEditor
        rows={wall.finishRows || []}
        vendorOptions={vendorOptions}
        materialPrices={materialPrices}
        materialRows={materialRows}
        isSub={isSub}
        refreshAllRates={refreshAllRates}
        {...(finishHandlers || {})}
      />
      <WallWaterproofing
        wpRows={wall.wpRows}
        vendorOptions={vendorOptions}
        materialPrices={materialPrices}
        materialRows={materialRows}
        isSub={isSub}
        refreshAllRates={refreshAllRates}
        onWpUpdate={onWpUpdate}
      />
      {pp.prompt && (
        <MissingPriceModal {...pp.prompt} onClose={pp.close} onSaved={refreshAllRates} />
      )}
    </div>
  )
}

// ── PIP Wall Entry ────────────────────────────────────────────────────────────
function PipWallEntry({
  wall,
  idx,
  total,
  onChange,
  onRemove,
  detail,
  vendorOptions,
  concreteVendorOptions,
  isSub,
  materialPrices,
  materialRows,
  refreshAllRates,
  onWpUpdate,
  finishHandlers,
  capHandlers,
}) {
  const set = field => val => onChange(idx, field, val)
  const hasData = n(wall.lf) > 0 && n(wall.heightIn) > 0
  return (
    <div className="border border-gray-200 rounded-xl p-3 mb-3 bg-white">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-black uppercase tracking-wide">
          Wall {idx + 1}
        </span>
        {total > 1 && (
          <button
            onClick={() => onRemove(idx)}
            className="text-xs text-red-400 hover:text-red-600 px-2 py-0.5 rounded border border-red-100 hover:border-red-300 transition-colors"
          >
            Remove
          </button>
        )}
      </div>
      <WallDemoSection wall={wall} onChange={set} />
      <WallBackfillSection wall={wall} onChange={set} />
      <label className="block text-xs text-gray-800 mb-1 font-medium">Installation</label>
      <div className="grid grid-cols-2 gap-2">
        <div className="col-span-2">
          <label className="block text-xs text-gray-500 mb-1">Concrete Vendor</label>
          <DropdownSelect
            className="input text-sm py-1.5 w-full"
            value={wall.vendor || 'Standard'}
            onChange={v => set('vendor')(v)}
            options={concreteVendorOptions || [{ value: 'Standard', label: 'Standard' }]}
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Linear Feet</label>
          <NumInput value={wall.lf} onChange={set('lf')} placeholder="0" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Wall Height (in)</label>
          <NumInput value={wall.heightIn} onChange={set('heightIn')} placeholder="48" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Footing Width (in)</label>
          <NumInput value={wall.footingWIn} onChange={set('footingWIn')} placeholder="12" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Footing Depth (in)</label>
          <NumInput value={wall.footingDIn} onChange={set('footingDIn')} placeholder="12" />
        </div>
        <div className="col-span-2 sm:col-span-1">
          <label className="block text-xs text-gray-500 mb-1">Horiz. Bars in Footing</label>
          <NumInput value={wall.horizBars} onChange={set('horizBars')} placeholder="2" />
        </div>
        <div className="col-span-2 sm:col-span-1">
          <label className="block text-xs text-gray-500 mb-1">Footing Rebar Size</label>
          <DropdownSelect
            className="input text-sm py-1.5 w-full"
            value={wall.pipFootingRebarSize || '#4'}
            onChange={v => set('pipFootingRebarSize')(v)}
            options={REBAR_SIZES.map(s => ({ value: s, label: s }))}
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Wall Horizontal Bars</label>
          <NumInput value={wall.pipWallHorizBars} onChange={set('pipWallHorizBars')} placeholder="0" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Wall Horiz Rebar Size</label>
          <DropdownSelect
            className="input text-sm py-1.5 w-full"
            value={wall.pipWallHorizSize || '#4'}
            onChange={v => set('pipWallHorizSize')(v)}
            options={REBAR_SIZES.map(s => ({ value: s, label: s }))}
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Wall Vertical Bars</label>
          <NumInput value={wall.pipWallVertBars} onChange={set('pipWallVertBars')} placeholder="0" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Wall Vertical Rebar Size</label>
          <DropdownSelect
            className="input text-sm py-1.5 w-full"
            value={wall.pipVertSize || '#4'}
            onChange={v => set('pipVertSize')(v)}
            options={REBAR_SIZES.map(s => ({ value: s, label: s }))}
          />
        </div>
        <div className="col-span-2 sm:col-span-1">
          <label className="block text-xs text-gray-500 mb-1">Pump for Footing?</label>
          <DropdownSelect
            className="input text-sm py-1.5 w-full"
            value={wall.footingPump || 'Yes'}
            onChange={v => set('footingPump')(v)}
            options={[{ value: 'No', label: 'No' }, { value: 'Yes', label: 'Yes' }]}
          />
        </div>
      </div>
      {hasData && detail && (
        <div className="mt-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-1.5 text-xs text-gray-600 flex flex-wrap gap-4">
          <span>
            Concrete: <strong>{detail.concCY.toFixed(2)} Cu Yd</strong>
          </span>
          {detail.footingCY > 0 && (
            <span>
              Footing: <strong>{detail.footingCY.toFixed(3)} Cu Yd</strong>
            </span>
          )}
          {detail.horizRebarLF > 0 && (
            <span>
              Footing rebar: <strong>{Math.round(detail.horizRebarLF)} Ln Ft</strong>
            </span>
          )}
          <span>
            Labor: <strong>{detail.hrs.toFixed(2)} hrs</strong>
          </span>
        </div>
      )}
      {isSub && (
        <div className="mt-2 flex items-center gap-2 flex-wrap">
          <span className="text-xs text-gray-500">Sub flat $ per Ln Ft</span>
          <div className="relative w-28">
            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">$</span>
            <input
              type="number"
              step="any"
              className="input text-sm py-1.5 pl-5 w-full"
              placeholder={detail ? (detail.subUnit || 0).toFixed(2) : '0.00'}
              value={wall.subEach ?? ''}
              onChange={e => set('subEach')(e.target.value)}
            />
          </div>
          <span className="text-[11px] text-gray-400">
            default = material ÷ LF · no labor billed on Sub
          </span>
        </div>
      )}
      <WallDrainageSection wall={wall} onChange={set} />
      <WallCapsEditor
        rows={wall.capRows || []}
        vendorOptions={vendorOptions}
        materialPrices={materialPrices}
        materialRows={materialRows}
        isSub={isSub}
        refreshAllRates={refreshAllRates}
        {...(capHandlers || {})}
      />
      <WallFinishesEditor
        rows={wall.finishRows || []}
        vendorOptions={vendorOptions}
        materialPrices={materialPrices}
        materialRows={materialRows}
        isSub={isSub}
        refreshAllRates={refreshAllRates}
        {...(finishHandlers || {})}
      />
      <WallWaterproofing
        wpRows={wall.wpRows}
        vendorOptions={vendorOptions}
        materialPrices={materialPrices}
        materialRows={materialRows}
        isSub={isSub}
        refreshAllRates={refreshAllRates}
        onWpUpdate={onWpUpdate}
      />
    </div>
  )
}

// ── Modular Wall Entry ────────────────────────────────────────────────────────
// Same fields as a CMU wall MINUS rebar spacing, horiz bars, bond-beam courses
// and % grouted solid. Titled "Wall Installation N".
function ModularWallEntry({
  wall,
  idx,
  total,
  onChange,
  onRemove,
  detail,
  materialPrices,
  materialRows,
  vendorOptions,
  isSub,
  refreshAllRates,
  onWpUpdate,
  finishHandlers,
  capHandlers,
  // Modular tab passes { label:'Wall Type', subcat:'Modular Wall', master:true }
  // to source options from the master list. Brick omits it → legacy CMU catalog.
  typeSource = { label: 'Block Type', master: false },
}) {
  const set = field => val => onChange(idx, field, val)
  const pp = usePricePrompt()
  return (
    <div className="border border-gray-200 rounded-xl p-3 mb-3 bg-white">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-black uppercase tracking-wide">
          Wall {idx + 1}
        </span>
        {total > 1 && (
          <button
            onClick={() => onRemove(idx)}
            className="text-xs text-red-400 hover:text-red-600 px-2 py-0.5 rounded border border-red-100 hover:border-red-300 transition-colors"
          >
            Remove
          </button>
        )}
      </div>
      <WallDemoSection wall={wall} onChange={set} />
      <WallBackfillSection wall={wall} onChange={set} />
      <label className="block text-xs text-gray-800 mb-1 font-medium">Installation</label>
      <div className="grid grid-cols-2 gap-2">
        <div className="col-span-2">
          <label className="block text-xs text-gray-500 mb-1">Vendor</label>
          <DropdownSelect
            className="input text-sm py-1.5 w-full"
            value={wall.vendor || (typeSource.master ? vendorOptions?.[0]?.value : undefined) || 'Standard'}
            onChange={v => {
              set('vendor')(v)
              if (typeSource.master) {
                const first = (materialRows || []).find(
                  r => r.sub_category === typeSource.subcat && (v === 'Standard' ? r.vendor_id == null : r.vendor_id === v)
                )
                set('blockType')(first ? first.id : '')
              }
            }}
            options={vendorOptsForSub(vendorOptions, materialRows, typeSource?.subcat || WALL_BLOCK_SUBCAT)}
          />
        </div>
        <div className="col-span-2">
          <label className="block text-xs text-gray-500 mb-1">{typeSource.label}</label>
          {typeSource.master
            ? (() => {
                // Options + price come live from the master list (marker =
                // sub_category). Add a product in Master Rates and it appears here.
                // Vendor-first: the selected vendor's Modular Wall products.
                const _vsel = wall.vendor && wall.vendor !== 'Standard' ? wall.vendor : vendorOptions?.[0]?.value
                const opts = (materialRows || [])
                  .filter(
                    r =>
                      r.sub_category === typeSource.subcat &&
                      (_vsel === 'Standard' ? r.vendor_id == null : r.vendor_id === _vsel)
                  )
                  .map(r => ({ id: r.id, label: r.name, row: r }))
                const selRow = opts.find(o => o.row.id === wall.blockType)?.row || opts[0]?.row
                const price = n(selRow?.unit_cost)
                return (
                  <>
                    <DropdownSelect
                      className="input text-sm py-1.5 w-full"
                      value={selRow?.id ?? ''}
                      onChange={v => {
                        set('blockType')(v)
                        pp.checkById(materialRows, v, wall.vendor)
                      }}
                      placeholder={opts.length === 0 ? 'No products — add one in Master Rates' : 'Select…'}
                      options={opts.map(o => ({
                        value: o.id,
                        label: `${o.label}${
                          n(o.row?.calc_meta?.block_w_in) || n(o.row?.block_w_in)
                            ? ` — ${n(o.row.calc_meta?.block_w_in) || n(o.row.block_w_in)}×${n(o.row.calc_meta?.block_h_in) || n(o.row.block_h_in)}×${n(o.row.calc_meta?.block_l_in) || n(o.row.block_l_in)}`
                            : ''
                        }`,
                      }))}
                    />
                  </>
                )
              })()
            : (
                <DropdownSelect
                  className="input text-sm py-1.5 w-full"
                  value={wall.blockType || ''}
                  onChange={v => set('blockType')(v)}
                  placeholder="Select…"
                  options={(materialRows || [])
                    .filter(
                      r =>
                        r.sub_category === (typeSource?.subcat || WALL_BLOCK_SUBCAT) &&
                        (!wall.vendor || wall.vendor === 'Standard'
                          ? r.vendor_id == null
                          : r.vendor_id === wall.vendor)
                    )
                    .map(r => ({ value: r.id, label: r.name }))}
                />
              )}
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Linear Feet</label>
          <NumInput value={wall.lf} onChange={set('lf')} placeholder="0" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Wall Height (in)</label>
          <NumInput value={wall.heightIn} onChange={set('heightIn')} placeholder="48" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Footing Width (in)</label>
          <NumInput value={wall.footingWIn} onChange={set('footingWIn')} placeholder="12" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Footing Depth (in)</label>
          <NumInput value={wall.footingDIn} onChange={set('footingDIn')} placeholder="12" />
        </div>
        {typeSource?.subcat === BRICK_SUBCAT && (
          <div>
            <label className="block text-xs text-gray-500 mb-1">Horiz. Bars in Footing</label>
            <NumInput value={wall.horizBars} onChange={set('horizBars')} placeholder="2" />
          </div>
        )}
        {typeSource?.subcat === BRICK_SUBCAT && (
          <div>
            <label className="block text-xs text-gray-500 mb-1">Footing Rebar Size</label>
            <DropdownSelect
              className="input text-sm py-1.5 w-full"
              value={wall.brickFootingRebarSize || '#4'}
              onChange={v => set('brickFootingRebarSize')(v)}
              options={REBAR_SIZES.map(s => ({ value: s, label: s }))}
            />
          </div>
        )}
        <div className="col-span-2 sm:col-span-1">
          <label className="block text-xs text-gray-500 mb-1">% of Wall Curved</label>
          <div className="relative">
            <NumInput value={wall.pctCurved} onChange={set('pctCurved')} placeholder="0" />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">%</span>
          </div>
        </div>
        <div className="col-span-2 sm:col-span-1">
          <label className="block text-xs text-gray-500 mb-1">Pump for Footing?</label>
          <DropdownSelect
            className="input text-sm py-1.5 w-full"
            value={wall.footingPump || 'No'}
            onChange={v => set('footingPump')(v)}
            options={[{ value: 'No', label: 'No' }, { value: 'Yes', label: 'Yes' }]}
          />
        </div>
      </div>
      {detail && (n(wall.lf) > 0 && n(wall.heightIn) > 0) && (
        <div className="mt-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-1.5 text-xs text-gray-600 flex flex-wrap gap-3">
          {typeSource?.subcat === BRICK_SUBCAT ? (
            <span>
              Bricks: <strong>{Math.ceil(detail.bricks || 0)}</strong>
            </span>
          ) : (
            <span>
              Block: <strong>{detail.orderGreyBlock ?? 0}</strong>
            </span>
          )}
          {detail.footingCY != null && (
            <span>
              Footing: <strong>{detail.footingCY.toFixed(3)} Cu Yd</strong>
            </span>
          )}
          {detail.curveAdd > 0 && (
            <span>
              Curve: <strong>+{detail.curveAdd.toFixed(2)} hrs</strong>
            </span>
          )}
        </div>
      )}
      {isSub && (
        <div className="mt-2 flex items-center gap-2 flex-wrap">
          <span className="text-xs text-gray-500">Sub flat $ per Ln Ft</span>
          <div className="relative w-28">
            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">$</span>
            <input
              type="number"
              step="any"
              className="input text-sm py-1.5 pl-5 w-full"
              placeholder={detail ? (detail.subUnit || 0).toFixed(2) : '0.00'}
              value={wall.subEach ?? ''}
              onChange={e => set('subEach')(e.target.value)}
            />
          </div>
          <span className="text-[11px] text-gray-400">
            default = material ÷ LF · no labor billed on Sub
          </span>
        </div>
      )}
      <WallDrainageSection wall={wall} onChange={set} />
      <WallCapsEditor
        rows={wall.capRows || []}
        vendorOptions={vendorOptions}
        materialPrices={materialPrices}
        materialRows={materialRows}
        isSub={isSub}
        refreshAllRates={refreshAllRates}
        {...(capHandlers || {})}
      />
      <WallFinishesEditor
        rows={wall.finishRows || []}
        vendorOptions={vendorOptions}
        materialPrices={materialPrices}
        materialRows={materialRows}
        isSub={isSub}
        refreshAllRates={refreshAllRates}
        {...(finishHandlers || {})}
      />
      <WallWaterproofing
        wpRows={wall.wpRows}
        vendorOptions={vendorOptions}
        materialPrices={materialPrices}
        materialRows={materialRows}
        isSub={isSub}
        refreshAllRates={refreshAllRates}
        onWpUpdate={onWpUpdate}
      />
      {pp.prompt && (
        <MissingPriceModal {...pp.prompt} onClose={pp.close} onSaved={refreshAllRates} />
      )}
    </div>
  )
}

// ── Timber / Lumber Wall Entry ────────────────────────────────────────────────
// One timber wall in the timberWalls array. Mirrors CmuWallEntry: a header with
// "Timber Wall N" + Remove, the shared Demo / Backfilling / Drainage sub-sections
// (flattened fields), then the timber-specific Installation + Footing inputs and
// the Sub flat $/LF field. All pricing/labor is table-driven in the calc.
function TimberWallEntry({
  wall,
  idx,
  total,
  onChange,
  onRemove,
  materialRows,
  vendorOptions,
  isSub,
}) {
  const set = field => val => onChange(idx, field, val)
  return (
    <div className="border border-gray-200 rounded-xl p-3 mb-3 bg-white">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-black uppercase tracking-wide">
          Timber Wall {idx + 1}
        </span>
        {total > 1 && (
          <button
            onClick={() => onRemove(idx)}
            className="text-xs text-red-400 hover:text-red-600 px-2 py-0.5 rounded border border-red-100 hover:border-red-300 transition-colors"
          >
            Remove
          </button>
        )}
      </div>
      {/* Per-wall Demo (slope + dig-haul → Demo crew) and Backfilling. */}
      <WallDemoSection wall={wall} onChange={set} />
      <WallBackfillSection wall={wall} onChange={set} />
      <WallDrainageSection wall={wall} onChange={set} />
      <label className="block text-xs text-gray-800 mb-1 font-medium">Installation</label>
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Vendor</label>
          <DropdownSelect
            className="input text-sm py-1.5 w-full"
            value={wall.vendor || 'Standard'}
            onChange={v => set('vendor')(v)}
            options={vendorOptsForSub(vendorOptions, materialRows, WOOD_SUBCAT)}
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Timber Type</label>
          <DropdownSelect
            className="input text-sm py-1.5 w-full"
            value={wall.timberType || 'Railroad Treated'}
            onChange={v => set('timberType')(v)}
            options={(() => {
              // Options come ONLY from the catalog (single source of truth): the
              // selected vendor's Wood products, or the Standard catalog. No
              // built-in TIMBER_TYPES seed. The currently-saved value is kept for
              // backward-compat even if the catalog no longer lists it.
              const shown = wallCatalogTypes(materialRows, WOOD_SUBCAT, wall.vendor)
              return [
                ...shown.map(t => ({ value: t, label: t })),
                ...(wall.timberType && !shown.includes(wall.timberType)
                  ? [{ value: wall.timberType, label: wall.timberType }]
                  : []),
              ]
            })()}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Linear Feet of Wall</label>
          <NumInput value={wall.lf} onChange={set('lf')} placeholder="0" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Wall Finish Height (in)</label>
          <NumInput value={wall.heightIn} onChange={set('heightIn')} placeholder="24" />
        </div>
      </div>
      <div className="mt-2">
        <label className="block text-xs text-gray-500 mb-1">Pile-Driven Steel Posts (qty)</label>
        <div className="flex items-center gap-2">
          <NumInput value={wall.posts} onChange={set('posts')} placeholder="0" className="w-28" />
          <span className="text-xs text-gray-400">material + labor per post (from rates)</span>
        </div>
      </div>
      <label className="block text-xs text-gray-800 mt-3 mb-1 font-medium">Footing</label>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Footing Width (in)</label>
          <NumInput value={wall.footingWIn} onChange={set('footingWIn')} placeholder="0" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Footing Depth (in)</label>
          <NumInput value={wall.footingDIn} onChange={set('footingDIn')} placeholder="0" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Horizontal Rebar (qty)</label>
          <NumInput value={wall.horizBars} onChange={set('horizBars')} placeholder="0" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Footing Rebar Size</label>
          <DropdownSelect
            className="input text-sm py-1.5 w-full"
            value={wall.footingRebarSize || '#4'}
            onChange={v => set('footingRebarSize')(v)}
            options={REBAR_SIZES.map(s => ({ value: s, label: s }))}
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Footing Pump</label>
          <DropdownSelect
            className="input text-sm py-1.5 w-full"
            value={wall.footingPump || 'No'}
            onChange={v => set('footingPump')(v)}
            options={[
              { value: 'No', label: 'No (hand)' },
              { value: 'Yes', label: 'Yes (pump)' },
            ]}
          />
        </div>
      </div>
      <p className="text-[11px] text-gray-400 mt-1">Leave width/depth blank for no footing.</p>
      {isSub && (
        <div className="mt-3 flex items-center gap-2 flex-wrap">
          <span className="text-xs text-gray-500">Sub flat $ per Ln Ft</span>
          <div className="relative w-28">
            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">$</span>
            <input
              type="number"
              step="any"
              className="input text-sm py-1.5 pl-5 w-full"
              placeholder="0.00"
              value={wall.subEach ?? ''}
              onChange={e => set('subEach')(e.target.value)}
            />
          </div>
          <span className="text-[11px] text-gray-400">
            default = material ÷ LF · no labor billed on Sub
          </span>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────
export default function WallsModule({ onSave, onBack, saving, initialData }) {
  const [laborRatePerHour, setLaborRatePerHour] = useState(
    initialData?.laborRatePerHour ?? null
  )
  const [laborBurdenPct, setLaborBurdenPct] = useState(
    initialData?.laborBurdenPct ?? null
  )
  const [gpmd, setGpmd] = useState(initialData?.gpmd ?? null)
  const [subGpMarkupRate, setSubGpMarkupRate] = useState(initialData?.subGpMarkupRate ?? null)
  const [commissionRate, setCommissionRate] = useState(initialData?.commissionRate ?? null)

  // Free-text notes for this module — Sam writes auto-generated
  // takeoffs here via create_estimate_from_takeoff, and the user can
  // overwrite / append their own.
  const [notes, setNotes] = useState(initialData?.notes ?? '')
  const [walkAccess, setWalkAccess] = useState(
    initialData?.walkAccess ?? {
      paceLfPerMin: null,
    }
  )
  // Shared material catalog — Walls + Basic Materials rates, rows, vendors, and
  // the canonical resolver. (Replaces the old per-module fetch + wallMatPrice.)
  const {
    priceMap: materialPrices,
    materialRows,
    vendors,
    vendorNames,
    loading: pricesLoading,
    refresh: refreshAllRates,
    vendorOptionsForCategory,
  } = useNewMaterialCatalog([WALLS_CATEGORY, BASIC_CATEGORY, CONCRETE_CATEGORY, DEMO_CATEGORY, DRAINAGE_CATEGORY], {
    materialPrices: initialData?.materialPrices,
    materialRows: initialData?.materialRows,
  })

  useEffect(() => {
    if (!initialData?.laborRatePerHour) {
      supabase
        .from('company_settings')
        .select(
          'labor_rate_per_hour, labor_burden_pct, walk_access_pace_lf_per_min, estimate_gpmd_default, sub_gp_markup_rate, commission_rate'
        )
        .maybeSingle()
        .then(({ data }) => {
          if (!data) return
          if (data.labor_rate_per_hour != null)
            setLaborRatePerHour(parseFloat(data.labor_rate_per_hour))
          if (data.labor_burden_pct != null) setLaborBurdenPct(parseFloat(data.labor_burden_pct))
          if (data.estimate_gpmd_default != null) setGpmd(parseFloat(data.estimate_gpmd_default))
          if (data.sub_gp_markup_rate != null)
            setSubGpMarkupRate(parseFloat(data.sub_gp_markup_rate))
          if (data.commission_rate != null) setCommissionRate(parseFloat(data.commission_rate))
          if (data.walk_access_pace_lf_per_min != null) {
            const _wpace = parseFloat(data.walk_access_pace_lf_per_min)
            setWalkAccess({
              paceLfPerMin: Number.isFinite(_wpace) && _wpace > 0 ? _wpace : null,
            })
          }
        })
    }
  }, [initialData?.laborRatePerHour])


  // ── Shared (not per-tab) selections ─────────────────────────────────────────
  const [crewType, setCrewType] = useState(initialData?.crewType ?? 'Masonry')
  const [demoCrewType, setDemoCrewType] = useState(initialData?.demoCrewType ?? 'Demo')
  const [timberCrewType, setTimberCrewType] = useState(initialData?.timberCrewType ?? 'Masonry')
  const [subType, setSubType] = useState(initialData?.subType ?? 'In-House')

  // Independent In-House vs Sub input records — each tab is its own calculator.
  const [ihTab, setIhTab] = useState(() => makeTab(initialData?.ihData || initialData))
  const [subTab, setSubTab] = useState(() => makeTab(initialData?.subData || {}))
  const isSub = subType === 'Subcontractor'
  const cur = isSub ? subTab : ihTab
  const setCur = isSub ? setSubTab : setIhTab
  // A single setter factory: accepts a value (scalar fields) or an updater fn (row arrays).
  const setField = k => v => setCur(p => ({ ...p, [k]: typeof v === 'function' ? v(p[k]) : v }))

  // Derived active-tab field accessors — render bindings below stay unchanged.
  const difficulty = cur.difficulty
  const setDifficulty = setField('difficulty')
  const hoursAdj = cur.hoursAdj
  const setHoursAdj = setField('hoursAdj')
  const wallType = cur.wallType
  const setWallType = setField('wallType')
  const distanceLF = cur.distanceLF
  const setDistanceLF = setField('distanceLF')
  const cmuWalls = cur.cmuWalls
  const setCmuWalls = setField('cmuWalls')
  const cmuFootingPump = cur.cmuFootingPump
  const setCmuFootingPump = setField('cmuFootingPump')
  const cmuGroutPump = cur.cmuGroutPump
  const setCmuGroutPump = setField('cmuGroutPump')
  const pipWalls = cur.pipWalls
  const setPipWalls = setField('pipWalls')
  const modularWalls = cur.modularWalls
  const setModularWalls = setField('modularWalls')
  const modularFootingPump = cur.modularFootingPump
  const setModularFootingPump = setField('modularFootingPump')
  const brickWalls = cur.brickWalls
  const setBrickWalls = setField('brickWalls')
  const brickFootingPump = cur.brickFootingPump
  const setBrickFootingPump = setField('brickFootingPump')
  const timberWalls = cur.timberWalls
  const setTimberWalls = setField('timberWalls')
  const manualRows = cur.manualRows
  const setManualRows = setField('manualRows')

  // Per-wall waterproofing: single line, edits the wall's own wpRows[0].
  const makeWpHandlers = (setWalls, wallIdx) => ({
    onWpUpdate: (wpIdx, field, val) =>
      setWalls(ws =>
        ws.map((w, i) =>
          i === wallIdx
            ? {
                ...w,
                wpRows: (w.wpRows && w.wpRows.length ? w.wpRows : [blankWpRow()]).map((r, j) =>
                  j === wpIdx ? { ...r, [field]: val } : r
                ),
              }
            : w
        )
      ),
  })

  // Per-wall Finishes / Caps handlers. `field` is 'finishRows' | 'capRows';
  // `compute` recomputes the Sub flat default when a driving input changes.
  const makeRowHandlers = (setWalls, wallIdx, field, blank, compute) => ({
    onPatch: (rowIdx, patch, recompute) =>
      setWalls(ws =>
        ws.map((w, i) =>
          i === wallIdx
            ? {
                ...w,
                [field]: (w[field] || []).map((row, j) => {
                  if (j !== rowIdx) return row
                  const next = { ...row, ...patch }
                  if (recompute && isSub)
                    next.subEach = String(r2(compute(next, materialPrices, materialRows).subUnit))
                  return next
                }),
              }
            : w
        )
      ),
    onAdd: () =>
      setWalls(ws =>
        ws.map((w, i) => (i === wallIdx ? { ...w, [field]: [...(w[field] || []), blank()] } : w))
      ),
    onRemove: rowIdx =>
      setWalls(ws =>
        ws.map((w, i) =>
          i === wallIdx ? { ...w, [field]: (w[field] || []).filter((_, j) => j !== rowIdx) } : w
        )
      ),
  })
  const makeFinishHandlers = (setWalls, wallIdx) =>
    makeRowHandlers(setWalls, wallIdx, 'finishRows', blankWallFinishRow, computeWallFinishRow)
  const makeCapHandlers = (setWalls, wallIdx) =>
    makeRowHandlers(setWalls, wallIdx, 'capRows', blankCapRow, computeCapRow)

  // ── Sales tax — applied to totalMat across every module so the bid
  //    reflects supplier-invoiced material cost. Sourced from
  //    company_settings.sales_tax_rate via fetchSalesTaxRate(). Default
  //    0 (no tax) until the admin sets it in Opportunities → Settings.
  const [salesTaxRate, setSalesTaxRate] = useState(0)
  useEffect(() => {
    let alive = true
    fetchSalesTaxRate().then(r => {
      if (alive) setSalesTaxRate(r)
    })
    return () => {
      alive = false
    }
  }, [])

  // ── Array helpers ─────────────────────────────────────────────────────────
  function updateCmuWall(idx, field, val) {
    setCmuWalls(ws => ws.map((w, i) => (i === idx ? { ...w, [field]: val } : w)))
  }
  function addCmuWall() {
    setCmuWalls(ws => [...ws, DEFAULT_CMU()])
  }
  function removeCmuWall(idx) {
    setCmuWalls(ws => ws.filter((_, i) => i !== idx))
  }

  function updatePipWall(idx, field, val) {
    setPipWalls(ws => ws.map((w, i) => (i === idx ? { ...w, [field]: val } : w)))
  }
  function addPipWall() {
    setPipWalls(ws => [...ws, DEFAULT_PIP()])
  }
  function removePipWall(idx) {
    setPipWalls(ws => ws.filter((_, i) => i !== idx))
  }

  function updateModularWall(idx, field, val) {
    setModularWalls(ws => ws.map((w, i) => (i === idx ? { ...w, [field]: val } : w)))
  }
  function addModularWall() {
    setModularWalls(ws => [...ws, DEFAULT_MODULAR()])
  }
  function removeModularWall(idx) {
    setModularWalls(ws => ws.filter((_, i) => i !== idx))
  }

  function updateBrickWall(idx, field, val) {
    setBrickWalls(ws => ws.map((w, i) => (i === idx ? { ...w, [field]: val } : w)))
  }
  function addBrickWall() {
    setBrickWalls(ws => [...ws, DEFAULT_BRICK()])
  }
  function removeBrickWall(idx) {
    setBrickWalls(ws => ws.filter((_, i) => i !== idx))
  }

  function updateTimberWall(idx, field, val) {
    setTimberWalls(ws => ws.map((w, i) => (i === idx ? { ...w, [field]: val } : w)))
  }
  function addTimberWall() {
    setTimberWalls(ws => [...ws, DEFAULT_TIMBER()])
  }
  function removeTimberWall(idx) {
    setTimberWalls(ws => ws.filter((_, i) => i !== idx))
  }

  function updateManual(i, field, val) {
    setManualRows(rows => rows.map((row, idx) => (idx === i ? { ...row, [field]: val } : row)))
  }

  // Generic row add / remove / patch (mirrors the Finishes conversion). On the
  // Sub tab, when inputs that drive the flat default change we refresh subEach.
  const addRow = (setRows, blank) => setRows(rows => [...rows, blank()])
  const removeRow = (setRows, i) =>
    setRows(rows => (rows.length > 1 ? rows.filter((_, idx) => idx !== i) : rows))
  function patchRow(setRows, i, patch, compute, recompute) {
    setRows(rows =>
      rows.map((row, idx) => {
        if (idx !== i) return row
        const next = { ...row, ...patch }
        if (recompute && isSub)
          next.subEach = String(r2(compute(next, materialPrices, materialRows).subUnit))
        return next
      })
    )
  }

  const r = key => n(materialPrices[WALL_RATES[key].db])

  // Full rate list for the "View Rates" popup, broken down by wall type. Groups
  // flagged with `catalogSubcat` prepend that sub-category's actual catalog block
  // products (per vendor), editable via material_price — so the vendor and its
  // real price show, not the retired built-in list.
  const catalogBlockItems = subcat =>
    (materialRows || [])
      .filter(r0 => r0.sub_category === subcat)
      // Only rows attributable to Standard (null vendor) or a KNOWN vendor —
      // drop orphaned rows whose vendor can't be resolved.
      .filter(r0 => r0.vendor_id == null || vendorNames[r0.vendor_id])
      // Vendor FIRST, then product name. Standard (null vendor) sorts to the top.
      .sort((a, b) => {
        const va = a.vendor_id == null ? '' : vendorNames[a.vendor_id] || '~'
        const vb = b.vendor_id == null ? '' : vendorNames[b.vendor_id] || '~'
        return va.localeCompare(vb) || (a.name || '').localeCompare(b.name || '')
      })
      .map(r0 => ({
        label: `${r0.vendor_id ? vendorNames[r0.vendor_id] || 'Vendor' : 'Standard'} — ${r0.name}`,
        table: 'material_price',
        materialId: r0.id,
        vendorId: r0.vendor_id || undefined,
        category: 'Walls',
        unitLabel: r0.unit || 'ea',
        mode: 'currency',
        value: n(r0.unit_cost),
      }))
  // A currency WALL_RATES item → catalog rows (Standard + each vendor price) when
  // a matching `material` exists (Rebar, Concrete…), vendor-first; otherwise a
  // single 'Standard — name' row at the current rate (e.g. Grout Pump misc fees).
  const materialRateRows = (dbName, unit, value, label) => {
    const rows = (materialRows || []).filter(r0 => r0.name === dbName)
    if (rows.length) {
      return rows
        .filter(r0 => r0.vendor_id == null || vendorNames[r0.vendor_id])
        .sort((a, b) => {
          const va = a.vendor_id == null ? '' : vendorNames[a.vendor_id] || '~'
          const vb = b.vendor_id == null ? '' : vendorNames[b.vendor_id] || '~'
          return va.localeCompare(vb)
        })
        .map(r0 => ({
          label: `${r0.vendor_id ? vendorNames[r0.vendor_id] || 'Vendor' : 'Standard'} — ${r0.name}`,
          table: 'material_price',
          materialId: r0.id,
          vendorId: r0.vendor_id || undefined,
          category: 'Walls',
          unitLabel: r0.unit || unit,
          mode: 'currency',
          value: n(r0.unit_cost),
        }))
    }
    return [
      { label: `Standard — ${label || dbName}`, table: 'material_price', name: dbName, category: 'Walls', unitLabel: unit, mode: 'currency', value },
    ]
  }

  // ── Vendor helpers ──────────────────────────────────────────────────────────
  const vendorOptions = vendorOptionsForCategory(WALLS_CATEGORY)
  // PIP "Concrete Vendor" list — only vendors that supply the Concrete Mix
  // sub-category (Standard always first).
  const concreteVendorOptions = vendorOptionsForCategory(CONC_MIX_SUBCAT)
  // Modular Wall vendors — derived from the products themselves (reclassified
  // items may not be tagged 'Walls' at the vendor level). Enables vendor-first
  // picking: choose a vendor, then that vendor's Modular Wall types.
  const modularVendorOptions = (() => {
    const rows = (materialRows || []).filter(r => r.sub_category === MODULAR_SUBCAT)
    const ids = [...new Set(rows.filter(r => r.vendor_id).map(r => r.vendor_id))]
    const out = ids.map(id => ({ value: id, label: vendorNames[id] || 'Vendor' }))
    if (rows.some(r => r.vendor_id == null)) out.unshift({ value: 'Standard', label: 'Standard' })
    return out
  })()

  // The calc runs against the ACTIVE tab only — entering data on one tab never
  // affects the other. Shared selections (crew/sub type) are merged on top.
  const state = { crewType, demoCrewType, timberCrewType, subType, subGpMarkupRate, commissionRate, ...cur }
  const calcRaw = calcWalls(
    state,
    laborRatePerHour,
    materialPrices,
    gpmd,
    walkAccess,
    laborBurdenPct,
    materialRows
  )
  // Apply company sales tax to the module's total material cost so the
  // estimate price matches what suppliers actually invoice. Stored
  // material_cost (saved with the module) ends up tax-inclusive too,
  // so bid totals add up to GpmdBar's displayed price.
  const _salesTaxAmt = (calcRaw.totalMat || 0) * (salesTaxRate || 0)
  const calc =
    _salesTaxAmt > 0
      ? {
          ...calcRaw,
          totalMat: (calcRaw.totalMat || 0) + _salesTaxAmt,
          price: (calcRaw.price || 0) + _salesTaxAmt,
          salesTax: _salesTaxAmt,
        }
      : calcRaw

  function handleSave() {
    onSave({
      notes,
      man_days: parseFloat(calc.manDays.toFixed(2)),
      // In-house materials only; on the Sub tab the materials live in subCost,
      // so keep this 0 to avoid double-counting them as In-House Materials.
      material_cost: isSub ? 0 : parseFloat(calc.totalMat.toFixed(2)),
      data: {
        ...state,
        ihData: ihTab,
        subData: subTab,
        subType,
        subGpMarkupRate,
        commissionRate,
        laborRatePerHour,
        laborBurdenPct,
        gpmd,
        materialPrices,
        materialRows,
        vendorNames,
        walkAccess,
        calc,
      },
    })
  }

  const fmt2 = v =>
    `$${n(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  const p = db => materialPrices[db] ?? undefined


  return (
    <SubTabContext.Provider value={isSub}>
    <div className="space-y-5">
      {/* ── Frozen header: GPMD bar + Crew Type / View Rates bar ── */}
      <div className="sticky top-0 z-20 -mx-6 bg-white shadow-md">
        <div className="px-6 pt-1 pb-1 bg-gray-900">
          <GpmdBar
            variant={subType === 'Subcontractor' ? 'sub' : 'inhouse'}
            sticky
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
            subMarkupRate={subGpMarkupRate}
          />
        </div>
        <div className="px-6 py-2">
          <CrewTypeBar
            crewType={crewType}
            onCrewTypeChange={setCrewType}
            crewLabel="Main Wall Crew Type"
            extraCrews={[
              { label: 'Demo Crew Type', value: demoCrewType, onChange: setDemoCrewType },
              { label: 'Timber Wall Crew Type', value: timberCrewType, onChange: setTimberCrewType },
            ]}
            title="Walls"
            moduleType="Walls"
            rateScope={WALLS_RATE_SCOPE}
            refreshAllRates={refreshAllRates}
            showInlineToggle={false}
          />
        </div>
        <div className="px-6 pb-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Wall Type</p>
          <div className="flex gap-2">
            {[
              { key: 'CMU', label: 'CMU Block', count: cmuWalls.filter(w => n(w.lf) > 0 || n(w.heightIn) > 0).length },
              { key: 'PIP', label: 'Poured In Place', count: pipWalls.filter(w => n(w.lf) > 0 || n(w.heightIn) > 0).length },
              { key: 'Modular', label: 'Modular', count: modularWalls.filter(w => n(w.lf) > 0 || n(w.heightIn) > 0).length },
              { key: 'Brick', label: 'Brick', count: brickWalls.filter(w => n(w.lf) > 0 || n(w.heightIn) > 0).length },
              { key: 'Timber', label: 'Timber / Lumber', count: timberWalls.filter(w => n(w.lf) > 0 || n(w.posts) > 0).length },
            ].map(t => (
              <button
                key={t.key}
                onClick={() => setWallType(t.key)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                  wallType === t.key
                    ? 'bg-green-700 text-white border-green-700'
                    : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {t.label}
                {t.count > 0 ? ` (${t.count})` : ''}
              </button>
            ))}
          </div>
        </div>
      </div>

      <ModuleHeaderSlot>
        <WorkTypeChooser value={subType || 'In-House'} onChange={setSubType} compact />
      </ModuleHeaderSlot>

      {pricesLoading && (
        <div className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2">
          Loading material prices from Master Rates…
        </div>
      )}

      {/* Settings — In-House tab only */}
      {subType !== 'Subcontractor' && (
        <>
      <SectionHeader title="Job Site Conditions" />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <p className="text-xs text-gray-500 mb-0.5">Difficulty (%)</p>
          <NumInput value={difficulty} onChange={setDifficulty} placeholder="0" />
        </div>
        <div>
          <p
            className="text-xs text-gray-500 mb-0.5"
            title="Average Distance from Truck to Work Area"
          >
            Truck → Work Area (Avg LF)
          </p>
          <NumInput value={distanceLF} onChange={setDistanceLF} placeholder="0" />
          {calc.walkHrs > 0 && (
            <p className="text-[10px] text-gray-500 italic lowercase mt-0.5">
              +{calc.walkHrs.toFixed(2)} hrs walk-access
            </p>
          )}
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-0.5">Hours Adj (±hrs)</p>
          <NumInput value={hoursAdj} onChange={setHoursAdj} placeholder="0" />
        </div>
      </div>
        </>
      )}

      {/* ── CMU Block Walls ── */}
      {wallType === 'CMU' && (
        <div>
          <SectionHeader title="CMU Block Walls" />

          {cmuWalls.map((wall, idx) => (
            <CmuWallEntry
              key={idx}
              wall={wall}
              idx={idx}
              total={cmuWalls.length}
              onChange={updateCmuWall}
              onRemove={removeCmuWall}
              detail={calc.cmuDetails[idx] || null}
              materialPrices={materialPrices}
              materialRows={materialRows}
              vendorOptions={vendorOptions}
              isSub={isSub}
              refreshAllRates={refreshAllRates}
              {...makeWpHandlers(setCmuWalls, idx)}
              finishHandlers={makeFinishHandlers(setCmuWalls, idx)}
              capHandlers={makeCapHandlers(setCmuWalls, idx)}
            />
          ))}

          <button
            onClick={addCmuWall}
            className="w-full py-2 rounded-lg border border-dashed border-green-400 text-green-700 text-sm font-medium hover:bg-green-50 transition-colors mb-3"
          >
            + Add Another CMU Wall
          </button>

          {/* Footing + grout pumps are now set per wall in each Wall entry above. */}
        </div>
      )}

      {/* ── PIP Walls ── */}
      {wallType === 'PIP' && (
        <div>
          <SectionHeader title="Poured In Place Walls" />

          {pipWalls.map((wall, idx) => (
            <PipWallEntry
              key={idx}
              wall={wall}
              idx={idx}
              total={pipWalls.length}
              onChange={updatePipWall}
              onRemove={removePipWall}
              detail={calc.pipDetails[idx] || null}
              vendorOptions={vendorOptions}
              concreteVendorOptions={concreteVendorOptions}
              isSub={isSub}
              materialPrices={materialPrices}
              materialRows={materialRows}
              refreshAllRates={refreshAllRates}
              {...makeWpHandlers(setPipWalls, idx)}
              finishHandlers={makeFinishHandlers(setPipWalls, idx)}
              capHandlers={makeCapHandlers(setPipWalls, idx)}
            />
          ))}

          <button
            onClick={addPipWall}
            className="w-full py-2 rounded-lg border border-dashed border-green-400 text-green-700 text-sm font-medium hover:bg-green-50 transition-colors"
          >
            + Add Another PIP Wall
          </button>
        </div>
      )}

      {/* ── Modular Block Walls ── */}
      {wallType === 'Modular' && (
        <div>
          <SectionHeader title="Modular Walls" />

          {modularWalls.map((wall, idx) => (
            <ModularWallEntry
              key={idx}
              wall={wall}
              idx={idx}
              total={modularWalls.length}
              onChange={updateModularWall}
              onRemove={removeModularWall}
              detail={calc.modularDetails[idx] || null}
              materialPrices={materialPrices}
              materialRows={materialRows}
              vendorOptions={modularVendorOptions}
              isSub={isSub}
              refreshAllRates={refreshAllRates}
              typeSource={{ label: 'Wall Type', subcat: MODULAR_SUBCAT, master: true }}
              {...makeWpHandlers(setModularWalls, idx)}
              finishHandlers={makeFinishHandlers(setModularWalls, idx)}
              capHandlers={makeCapHandlers(setModularWalls, idx)}
            />
          ))}

          <button
            onClick={addModularWall}
            className="w-full py-2 rounded-lg border border-dashed border-green-400 text-green-700 text-sm font-medium hover:bg-green-50 transition-colors mb-3"
          >
            + Add Another Modular Wall
          </button>

          {/* Footing pump is now set per wall in each Wall entry above. */}
        </div>
      )}

      {/* ── Brick Walls ── */}
      {wallType === 'Brick' && (
        <div>
          <SectionHeader title="Brick Walls" />

          {brickWalls.map((wall, idx) => (
            <ModularWallEntry
              key={idx}
              wall={wall}
              idx={idx}
              total={brickWalls.length}
              onChange={updateBrickWall}
              onRemove={removeBrickWall}
              detail={calc.brickDetails[idx] || null}
              materialPrices={materialPrices}
              materialRows={materialRows}
              vendorOptions={vendorOptions}
              isSub={isSub}
              refreshAllRates={refreshAllRates}
              typeSource={{ label: 'Brick Type', subcat: BRICK_SUBCAT, master: true }}
              {...makeWpHandlers(setBrickWalls, idx)}
              finishHandlers={makeFinishHandlers(setBrickWalls, idx)}
              capHandlers={makeCapHandlers(setBrickWalls, idx)}
            />
          ))}

          <button
            onClick={addBrickWall}
            className="w-full py-2 rounded-lg border border-dashed border-green-400 text-green-700 text-sm font-medium hover:bg-green-50 transition-colors mb-3"
          >
            + Add Another Brick Wall
          </button>

          {/* Footing pump is now set per wall in each Wall entry above. */}
        </div>
      )}

      {/* ── Timber / Lumber Walls (multi-wall array) ── */}
      {wallType === 'Timber' && (
        <div>
          <SectionHeader title="Timber / Lumber Walls" />

          {timberWalls.map((wall, idx) => (
            <TimberWallEntry
              key={idx}
              wall={wall}
              idx={idx}
              total={timberWalls.length}
              onChange={updateTimberWall}
              onRemove={removeTimberWall}
              materialRows={materialRows}
              vendorOptions={vendorOptions}
              isSub={isSub}
            />
          ))}

          <button
            onClick={addTimberWall}
            className="w-full py-2 rounded-lg border border-dashed border-green-400 text-green-700 text-sm font-medium hover:bg-green-50 transition-colors mb-3"
          >
            + Add Another Timber Wall
          </button>
        </div>
      )}

      {/* Finishes, Caps & Waterproofing are now specified inside each wall entry
          above (per wall) — no separate global sections. */}

      {/* ── Manual Entry ── */}
      <div>
        <SectionHeader title="Manual Entry" />
        <table className="w-full text-sm table-fixed">
          <colgroup>
            {isSub ? (
              <>
                <col className="w-1/2" />
                <col className="w-1/2" />
              </>
            ) : (
              <>
                <col className="w-1/3" />
                <col className="w-1/3" />
                <col className="w-1/3" />
              </>
            )}
          </colgroup>
          <thead>
            <tr className="text-xs text-gray-500 border-b border-gray-200">
              <th className="text-center pb-1 pr-2 font-medium">Description</th>
              {isSub ? (
                <th className="text-center pb-1 font-medium">Cost $</th>
              ) : (
                <>
                  <th className="text-center pb-1 pr-2 font-medium">Hours</th>
                  <th className="text-center pb-1 font-medium">Materials $</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {manualRows.map((row, i) => (
              <tr key={i} className="border-b border-gray-100">
                <td className="py-1 pr-2">
                  <input
                    className="input text-sm py-1 w-full"
                    value={row.label}
                    onChange={e => updateManual(i, 'label', e.target.value)}
                  />
                </td>
                {isSub ? (
                  <td className="py-1">
                    <div className="flex items-center gap-1">
                      <NumInput value={row.subCost} onChange={v => updateManual(i, 'subCost', v)} className="text-center flex-1" />
                      {manualRows.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setManualRows(rows => rows.filter((_, idx) => idx !== i))}
                          className="text-gray-300 hover:text-red-500 text-sm px-1"
                          title="Remove line"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  </td>
                ) : (
                  <>
                    <td className="py-1 pr-2">
                      <NumInput value={row.hours} onChange={v => updateManual(i, 'hours', v)} className="text-center" />
                    </td>
                    <td className="py-1">
                      <div className="flex items-center gap-1">
                        <NumInput value={row.materials} onChange={v => updateManual(i, 'materials', v)} className="text-center flex-1" />
                        {manualRows.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setManualRows(rows => rows.filter((_, idx) => idx !== i))}
                            className="text-gray-300 hover:text-red-500 text-sm px-1"
                            title="Remove line"
                          >
                            ×
                          </button>
                        )}
                      </div>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        <button
          type="button"
          onClick={() => setManualRows(rows => [...rows, { label: '', hours: '', materials: '', subCost: '' }])}
          className="mt-2 text-xs px-2 py-1 rounded bg-slate-100 text-slate-700 hover:bg-slate-200"
        >
          + Add manual entry
        </button>
      </div>

      <div className="flex gap-3 pt-2">
        <button onClick={onBack} className="btn-secondary flex-1">
          ← Back
        </button>
        <button onClick={handleSave} disabled={saving} className="btn-primary flex-1">
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>
    </div>
    </SubTabContext.Provider>
  )
}
