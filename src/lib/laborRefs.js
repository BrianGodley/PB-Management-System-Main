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

  // ── Demo modules (Hand / Mini / Skid) ───────────────────────────────────────
  // Each machine type has its own independent labor rows; keys are frozen ref_keys
  // (dual-keyed map, so reading by ref == reading by name — no pricing change).
  // Hand ──────────────────────────────────────────────────────────────────────
  HAND_CONCRETE: 'LAB-214-hand-concrete',
  HAND_SOIL: 'LAB-234-hand-soil',
  HAND_GRASS: 'LAB-221-hand-grass',
  HAND_FOOTING: 'LAB-218-hand-footing',
  HAND_GRADE_CUT: 'LAB-219-hand-grade-cut',
  HAND_GRADE_FILL: 'LAB-220-hand-grade-fill',
  HAND_MISC_FLAT: 'LAB-225-hand-misc-flat',
  HAND_MISC_VERTICAL: 'LAB-226-hand-misc-vertical',
  HAND_BUCKET_LABOR_MULT: 'LAB-213-hand-bucket-labor-mult',
  HAND_HAUL_SEC_FT: 'LAB-222-hand-haul-sec-ft',
  HAND_LOAD_CY: 'LAB-224-hand-load-cy',
  HAND_SHRUB_0_1: 'LAB-229-hand-shrubs-0-1-ft',
  HAND_SHRUB_1_2: 'LAB-230-hand-shrubs-1-2-ft',
  HAND_SHRUB_2_3: 'LAB-231-hand-shrubs-2-3-ft',
  HAND_SHRUB_3_4: 'LAB-232-hand-shrubs-3-4-ft',
  HAND_SHRUB_4_5: 'LAB-233-hand-shrubs-4-5-ft',
  HAND_STUMP_SMALL: 'LAB-239-hand-stump-small',
  HAND_STUMP_MEDIUM: 'LAB-238-hand-stump-medium',
  HAND_STUMP_LARGE: 'LAB-237-hand-stump-large',
  HAND_STUMP_XL: 'LAB-240-hand-stump-xl',
  HAND_TREE_SMALL: 'LAB-244-hand-tree-small',
  HAND_TREE_MEDIUM: 'LAB-243-hand-tree-medium',
  HAND_TREE_LARGE: 'LAB-242-hand-tree-large',
  // Mini Skid Steer ────────────────────────────────────────────────────────────
  MINI_CONCRETE: 'LAB-114-demo-mini-concrete-sf',
  MINI_SOIL: 'LAB-303-mini-soil',
  MINI_GRASS_SF: 'LAB-289-mini-grass-sf',
  MINI_FOOTING: 'LAB-286-mini-footing',
  MINI_GRADE_CUT: 'LAB-287-mini-grade-cut',
  MINI_GRADE_FILL: 'LAB-288-mini-grade-fill',
  MINI_MISC_FLAT: 'LAB-293-mini-misc-flat',
  MINI_MISC_VERTICAL: 'LAB-294-mini-misc-vertical',
  MINI_COMPACTION: 'LAB-284-mini-compaction',
  MINI_HAUL_SEC_FT: 'LAB-290-mini-haul-sec-ft',
  MINI_LOAD_CY: 'LAB-292-mini-load-cy',
  MINI_SHRUB_0_1: 'LAB-295-mini-shrubs-0-1-ft',
  MINI_SHRUB_1_2: 'LAB-296-mini-shrubs-1-2-ft',
  MINI_SHRUB_2_3: 'LAB-297-mini-shrubs-2-3-ft',
  MINI_SHRUB_3_4: 'LAB-298-mini-shrubs-3-4-ft',
  MINI_SHRUB_4_5: 'LAB-299-mini-shrubs-4-5-ft',
  MINI_STUMP_SMALL: 'LAB-309-mini-stump-small',
  MINI_STUMP_MEDIUM: 'LAB-308-mini-stump-medium',
  MINI_STUMP_LARGE: 'LAB-307-mini-stump-large',
  MINI_STUMP_XL: 'LAB-310-mini-stump-xl',
  MINI_TREE_SMALL: 'LAB-315-mini-tree-small',
  MINI_TREE_MEDIUM: 'LAB-314-mini-tree-medium',
  MINI_TREE_LARGE: 'LAB-313-mini-tree-large',
  // Skid Steer ──────────────────────────────────────────────────────────────────
  SKID_CONCRETE: 'LAB-376-skid-concrete',
  SKID_SOIL: 'LAB-392-skid-soil', // same row as POOL_EXCAV_SOIL (shared value)
  SKID_GRASS_SF: 'LAB-381-skid-grass',
  SKID_FOOTING: 'LAB-378-skid-footing',
  SKID_GRADE_CUT: 'LAB-379-skid-grade-cut',
  SKID_GRADE_FILL: 'LAB-380-skid-grade-fill',
  SKID_MISC_FLAT: 'LAB-385-skid-misc-flat',
  SKID_MISC_VERTICAL: 'LAB-386-skid-misc-vertical',
  SKID_COMPACTION: 'LAB-375-skid-compaction',
  SKID_HAUL_SEC_FT: 'LAB-382-skid-haul-sec-ft',
  SKID_LOAD_CY: 'LAB-384-skid-load-cy',
  SKID_SHRUB_0_1: 'LAB-387-skid-shrubs-0-1-ft',
  SKID_SHRUB_1_2: 'LAB-388-skid-shrubs-1-2-ft',
  SKID_SHRUB_2_3: 'LAB-389-skid-shrubs-2-3-ft',
  SKID_SHRUB_3_4: 'LAB-390-skid-shrubs-3-4-ft',
  SKID_SHRUB_4_5: 'LAB-391-skid-shrubs-4-5-ft',
  SKID_STUMP_SMALL: 'LAB-395-skid-stump-small',
  SKID_STUMP_MEDIUM: 'LAB-394-skid-stump-medium',
  SKID_STUMP_LARGE: 'LAB-393-skid-stump-large',
  SKID_STUMP_XL: 'LAB-396-skid-stump-xl',
  SKID_TREE_SMALL: 'LAB-400-skid-tree-small',
  SKID_TREE_MEDIUM: 'LAB-399-skid-tree-medium',
  SKID_TREE_LARGE: 'LAB-398-skid-tree-large',
}
