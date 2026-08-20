// Pure, React-free per-wall SECTION calcs — Drainage, Backfill/Compaction, Demo —
// extracted from WallsModule so they can be unit-tested with `node --test`. Each
// takes the wall row + the rate resolver `r` (key → number) the module already
// builds; no React / supabase. Same math as the originals (single source — the
// module imports these).
export const n = v => parseFloat(v) || 0

// Drainage hours + material for ONE wall's French-drain section — one perforated
// pipe run (+ optional fabric + gravel bed) per wall. In-House only. { hrs, mat }.
export function wallDrain(wall = {}, r) {
  const dLf = n(wall.drainLf)
  if (dLf <= 0) return { hrs: 0, mat: 0 }
  const pipeCost = wall.drainType === '3" Perforated' ? r('drainPerf3Mat') : r('drainPerf4Mat')
  const pipeLab = wall.drainType === '3" Perforated' ? r('drainPerf3Lab') : r('drainPerf4Lab')
  const fabMat =
    wall.drainFabric === 'Drain Sock' ? r('drainSockMat') : wall.drainFabric === 'Burrito Wrap' ? r('drainBurritoMat') : 0
  const fabLab =
    wall.drainFabric === 'Drain Sock' ? r('drainSockLab') : wall.drainFabric === 'Burrito Wrap' ? r('drainBurritoLab') : 0
  const grvMat = wall.drainGravel === '12"' ? r('drainGravel12Mat') : wall.drainGravel === '24"' ? r('drainGravel24Mat') : 0
  const grvLab = wall.drainGravel === '12"' ? r('drainGravel12Lab') : wall.drainGravel === '24"' ? r('drainGravel24Lab') : 0
  const mat = dLf * pipeCost + dLf * (fabMat + grvMat)
  const hrs = dLf * pipeLab + (fabLab + grvLab) * dLf // fabric/gravel labor is hrs per Ln Ft
  return { hrs, mat }
}

// Backfilling & Compaction — SF-based like the Demo module: hours = (sf/100) ×
// depthIn × rate, sf = Length × (Width/12). Hand compaction = mult × Jumping Jack.
const BACKFILL_GF_KEY = {
  Hand: 'backfillHandGF',
  'Mini Skid': 'backfillMiniGF',
  'Skid Steer': 'backfillSkidGF',
  Excavator: 'backfillMiniGF', // Excavator shares the Mini Skid Grade Fill rate
}
export function wallBackfill(wall = {}, r) {
  const sf = n(wall.bkLen) * (n(wall.bkWidth) / 12)
  const depthIn = n(wall.bkDepth)
  if (sf <= 0 || depthIn <= 0) return { hrs: 0 }
  const gfRate = r(BACKFILL_GF_KEY[wall.bkMethod] || 'backfillHandGF')
  const jjRate = r('compJJ')
  const compRate = (wall.bkCompMethod || 'Jumping Jack') === 'Hand' ? r('handCompactionMult') * jjRate : jjRate
  const backfillHrs = (sf / 100) * depthIn * gfRate
  const compHrs = (sf / 100) * depthIn * compRate
  return { hrs: backfillHrs + compHrs }
}

// Demo hours + tons + dump for ONE wall (Slope Removal + Dig&Haul Footing Soil).
// Reuses the Demo modules' DIRT math via r; Excavator shares Mini Skid's rates.
const DEMO_METHOD_KEYS = {
  Hand: { dirt: 'demoHandDirt', cont: 'demoHandContainer', cy: 'demoHandContainerCy', swell: 'demoHandSwell' },
  'Mini Skid': { dirt: 'demoMiniDirt', cont: 'demoMiniContainer', cy: 'demoMiniContainerCy', swell: 'demoMiniSwell' },
  'Skid Steer': { dirt: 'demoSkidDirt', cont: 'demoSkidContainer', cy: 'demoSkidContainerCy', swell: 'demoSkidSwell' },
  Excavator: { dirt: 'demoMiniDirt', cont: 'demoMiniContainer', cy: 'demoMiniContainerCy', swell: 'demoMiniSwell' },
}
export function wallDemo(wall = {}, r) {
  const denom = r('demoSfToTonsDenom') || 200
  const part = (sf, thickIn, method) => {
    const s = n(sf)
    const t = n(thickIn)
    if (s <= 0 || t <= 0) return { hrs: 0, tons: 0, dump: 0 }
    const keys = DEMO_METHOD_KEYS[method] || DEMO_METHOD_KEYS.Hand
    const hrs = (s / 100) * t * r(keys.dirt)
    const tons = (s / denom) * t
    const containerCy = r(keys.cy) || 1
    const removalYards = ((s * (t / 12)) / 27) * r(keys.swell)
    const containers = Math.ceil(removalYards / containerCy)
    const dump = containers * r(keys.cont)
    return { hrs, tons, dump }
  }
  const slopeSf = n(wall.demoSlopeLf) * (n(wall.demoSlopeH) / 12)
  const slope = part(slopeSf, wall.demoSlopeD, wall.demoSlopeMethod || 'Hand')
  const footCF = n(wall.demoFootLen) * (n(wall.demoFootW) / 12) * (n(wall.demoFootD) / 12)
  const footYards = (footCF / 27) * (r('footingSoilSwell') || 1.2)
  const footContCy = r('footingSoilContainerCy') || 1
  const footDigRate =
    (wall.demoFootMethod || 'Hand') === 'Excavator' ? r('footingDigHaulExcavLab') : r('footingDigHaulLab')
  const foot =
    footCF > 0
      ? {
          hrs: footCF * footDigRate, // rate is hours per Cu Ft
          tons: (footCF / 27) * r('footingSoilTonsPerCy'),
          dump: Math.ceil(footYards / footContCy) * r('footingSoilContainerPrice'),
        }
      : { hrs: 0, tons: 0, dump: 0 }
  return {
    hrs: slope.hrs + foot.hrs,
    tons: slope.tons + foot.tons,
    dump: slope.dump + foot.dump,
  }
}
