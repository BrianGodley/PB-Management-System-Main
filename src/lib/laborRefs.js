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

  // ── Steps (enum-driven; form / conc base type / finish → hrs) ───────────────
  // Paver-step install labor (hrs per Ln Ft), keyed by form.
  STEPS_FORM_STRAIGHT: 'LAB-425-steps-straight',
  STEPS_FORM_CURVED: 'LAB-419-steps-curved',
  // Concrete step type labor (hrs per Sq Ft), keyed by BASE type (color→material only).
  STEPS_CONC_STANDARD_HRS: 'LAB-416-steps-conc-standard-hrs-per-sq-ft',
  STEPS_CONC_CANTILEVERED_HRS: 'LAB-412-steps-conc-cantilevered-hrs-per-sq-ft',
  // Concrete finish labor adder (hrs per Sq Ft), keyed by finish.
  STEPS_FINISH_SMOOTH_HRS: 'LAB-424-steps-finish-smooth-hrs-per-sq-ft',
  STEPS_FINISH_BROOM_HRS: 'LAB-420-steps-finish-broom-hrs-per-sq-ft',
  STEPS_FINISH_SANDED_HRS: 'LAB-423-steps-finish-sanded-hrs-per-sq-ft',
  STEPS_FINISH_SALTED_HRS: 'LAB-422-steps-finish-salted-hrs-per-sq-ft',
  STEPS_FINISH_EXPOSED_HRS: 'LAB-421-steps-finish-exposed-aggregate-hrs-per-sq-ft',
  // Concrete form labor multiplier, keyed by form.
  STEPS_CONC_FORM_STRAIGHT: 'LAB-414-steps-conc-form-straight',
  STEPS_CONC_FORM_CURVED: 'LAB-413-steps-conc-form-curved',

  // ── Pavers (fixed labor rows; import-base reads NOT yet converted — see note) ─
  PAVER_WALK_ACCESS_PACE: 'LAB-336-paver-walk-access-pace',
  PAVER_INSTALL: 'LAB-325-paver-install',
  PAVER_STRAIGHT_CUT: 'LAB-334-paver-straight-cut',
  PAVER_CURVED_CUT: 'LAB-324-paver-curved-cut',
  PAVER_RESTRAINTS: 'LAB-328-paver-restraints',
  PAVER_SLEEVES: 'LAB-330-paver-sleeves',
  PAVER_VERTICAL_SOLDIER: 'LAB-335-paver-vertical-soldier',
  PAVER_SEALER: 'LAB-329-paver-sealer',
  PAVER_80MM_ADD: 'LAB-318-paver-80mm-add',
  PAVER_STONE_ADD: 'LAB-333-paver-stone-add',
  PAVER_COLOR_ADD: 'LAB-323-paver-color-add',
  PAVER_POLY_SAND_NEW: 'LAB-327-paver-poly-sand-new',
  PAVER_POLY_SAND_EXISTING: 'LAB-326-paver-poly-sand-existing',
  // (Paver import-base prep now reads the Basic Labor table — see basicLaborRefs.js.)

  // ── Concrete ────────────────────────────────────────────────────────────────
  CONC_POUR_FINISH: 'LAB-080-concrete-pour-finish',
  CONC_REBAR_24: 'LAB-085-concrete-rebar-24-oc',
  CONC_REBAR_18: 'LAB-084-concrete-rebar-18-oc',
  CONC_REBAR_12: 'LAB-083-concrete-rebar-12-oc',
  CONC_FORM_SETTING: 'LAB-070-concrete-form-setting',
  CONC_SLEEVES: 'LAB-096-concrete-sleeves',
  CONC_SEALER_NATURAL: 'LAB-090-concrete-sealer-natural',
  CONC_SEALER_WET: 'LAB-093-concrete-sealer-wet-look',
  CONC_VAPOR_BARRIER: 'LAB-100-concrete-vapor-barrier',
  CONC_FORMING_COMPLEXITY: 'LAB-071-concrete-forming-complexity-per-unit',
  CONC_SAND_FINISH: 'LAB-088-concrete-sand-finish',
  CONC_SALT_FINISH: 'LAB-087-concrete-salt-finish',
  CONC_EXPOSED_AGG: 'LAB-068-concrete-exposed-aggregate',
  CONC_SEEDED_AGG: 'LAB-094-concrete-seeded-aggregate',
  CONC_STAMPED_FINISH: 'LAB-099-concrete-stamped-finish',
  CONC_HAND_MIX_UPLIFT: 'LAB-072-concrete-hand-mix-labor-uplift',
  CONC_BASE_SKID_STEER: 'LAB-066-concrete-base-skid-steer',
  CONC_BASE_MINI_SKID_STEER: 'LAB-065-concrete-base-mini-skid-steer',
  CONC_BASE_WHEELBARROW: 'LAB-067-concrete-base-wheelbarrow',
  CONC_INSTALL_100_300: 'LAB-073-concrete-install-100-300',
  CONC_INSTALL_300_600: 'LAB-076-concrete-install-300-600',
  CONC_INSTALL_600_1000: 'LAB-077-concrete-install-600-1000',
  CONC_INSTALL_1000_2000: 'LAB-074-concrete-install-1000-2000',
  CONC_INSTALL_2000_PLUS: 'LAB-075-concrete-install-2000',

  // ── Pool (name-keyed reads; most Pool labor is calc_meta-driven) ────────────
  POOL_EXCAV_SOIL: 'LAB-392-skid-soil', // shared Skid Steer soil rate (hrs per Cu Yd)
  POOL_SHOTCRETE_LABOR: 'LAB-349-pool-shotcrete-labor',
  POOL_STEEL_INSTALL: 'LAB-410-steel-install',
  POOL_PLUMBING_BASE_HOURS: 'LAB-350-pool-plumbing-base-hours',
}
