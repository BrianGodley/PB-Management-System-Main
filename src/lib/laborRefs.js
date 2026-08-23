// Stable ref_key constants for labor rates (format: LAB-NNN-slug, frozen in the
// DB). Modules reference these instead of display names, so a labor rate's name
// can be edited freely without breaking pricing. Grown per module as each calc is
// migrated off name lookups (labor ID refactor, 2026-08-23). The rate map is
// dual-keyed by name AND ref_key during the transition, so a partial rollout is
// always safe.
export const LAB = {
  // ── Artificial Turf ────────────────────────────────────────────────────────
  TURF_DEMO_SKID_GOOD: 'LAB-445-turf-demo-skid-steer-good',
  TURF_DEMO_SKID_OK: 'LAB-446-turf-demo-skid-steer-ok',
  TURF_DEMO_MINI_SKID: 'LAB-444-turf-demo-mini-skid-steer',
  TURF_DEMO_WHEELBARROW: 'LAB-447-turf-demo-wheelbarrow',
  TURF_DEMO_HAND: 'LAB-443-turf-demo-hand',
  TURF_TURF_INSTALL: 'LAB-451-turf-turf-install',
  TURF_STRIP_INSTALL: 'LAB-450-turf-strip-install',

  // ── Planting (Till coefficients) ────────────────────────────────────────────
  TILL_SOIL_MOVE: 'LAB-435-till-soil-move-rate',
  TILL_TILLING: 'LAB-436-till-tilling-rate',
  TILL_AMEND: 'LAB-434-till-amend-rate',

  // ── Irrigation (per-zone labor + timer) ─────────────────────────────────────
  IRR_PLANTER_SPRAY_TRENCH: 'LAB-259-irrigation-planter-spray-trench',
  IRR_PLANTER_SPRAY_HAND: 'LAB-258-irrigation-planter-spray-hand',
  IRR_LAWN_TRENCH: 'LAB-253-irrigation-lawn-trench',
  IRR_LAWN_HAND: 'LAB-252-irrigation-lawn-hand',
  IRR_HILLSIDE_HAND: 'LAB-251-irrigation-hillside-hand',
  IRR_PLANT_DRIP_TRENCH: 'LAB-257-irrigation-plant-drip-trench',
  IRR_PLANT_DRIP_HAND: 'LAB-256-irrigation-plant-drip-hand',
  IRR_NETAFIM_TRENCH: 'LAB-255-irrigation-netafim-drip-trench',
  IRR_NETAFIM_HAND: 'LAB-254-irrigation-netafim-drip-hand',
  IRR_SUBTERRANEAN_TRENCH: 'LAB-261-irrigation-subterranean-drip-trench',
  IRR_SUBTERRANEAN_HAND: 'LAB-260-irrigation-subterranean-drip-hand',
  IRR_TIMER_INSTALL: 'LAB-262-irrigation-timer-install',
}
