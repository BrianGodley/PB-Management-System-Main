// Stable ref_key constants for MATERIALS (format: MAT-NNN-slug, frozen in the DB),
// mirroring laborRefs.js (LAB) / basicLaborRefs.js (BAS). Modules read a built-in
// material's Standard price by its ref_key instead of its editable description, so a
// rename in Master Material Rates never zeroes the price. Grown per module as each
// calc's Standard-path material reads are migrated off name lookups (M7, 2026-08-24).
// The Standard rate map is dual-keyed by name AND ref_key during the transition, so
// reading by ref_key is value-identical to reading by name today — a partial rollout
// is always safe. Once every material read is on ref_key, fetchStandardRateMap stops
// name-keying materials and the "material wins" collision band-aid is removed.
//
// NOTE: a few names exist as duplicate materials in different categories (e.g.
// 'BBQ Block' = MAT-035 in the block category AND MAT-414 under Outdoor Kitchen;
// 'Bedding Sand' = MAT-017 Basic Materials AND MAT-426). Each module reads the
// ref_key present in ITS OWN loaded categories — the module-scoped groups below pick
// the right one.
export const MAT = {
  // ── Shared: Basic Materials (rebar / roadbase / weed fabric) ────────────────
  // Rebar is one canonical size-based set (Basic Materials); read by Concrete,
  // Columns, Walls, Fire Pit, Outdoor Kitchen.
  REBAR: 'MAT-028-rebar',
  REBAR_3: 'MAT-029-rebar-3',
  REBAR_4: 'MAT-030-rebar-4',
  REBAR_5: 'MAT-031-rebar-5',
  REBAR_6: 'MAT-032-rebar-6',
  REBAR_8: 'MAT-033-rebar-8',
  CLASS_II_ROADBASE: 'MAT-021-class-ii-roadbase',
  WEED_FABRIC: 'MAT-020-weed-fabric',
  // Bedding Sand: canonical shared Basic Materials record (MAT-017). A duplicate
  // exists under the Paver category (MAT-426); Pavers reads the Basic Materials one.
  BEDDING_SAND: 'MAT-017-bedding-sand',

  // ── Concrete (Concrete Mix category) ────────────────────────────────────────
  CONC_HAND_MIX: 'MAT-052-concrete-hand-mix',
  CONC_READY_MIX: 'MAT-053-concrete-ready-mix-truck',

  // ── Shared finishes (category Finishes) — mirror FINISH_CAT_ITEM ─────────────
  SAND_STUCCO: 'MAT-103-sand-stucco-finishes',
  SMOOTH_STUCCO: 'MAT-104-smooth-stucco-finishes',
  LEDGERSTONE: 'MAT-099-ledgerstone-finishes',
  STACKED_STONE: 'MAT-105-stacked-stone-finishes',
  TILE_FINISH: 'MAT-106-tile-finishes',
  REAL_FLAGSTONE: 'MAT-101-real-flagstone-finishes',
  REAL_STONE: 'MAT-102-real-stone-finishes',

  // ── Columns / Walls block category ──────────────────────────────────────────
  CMU_BLOCK: 'MAT-036-cmu-block',
  FACE_BLOCK: 'MAT-037-face-block',

  // ── Outdoor Kitchen (category Outdoor Kitchen) ──────────────────────────────
  BBQ_BLOCK: 'MAT-414-bbq-block',
  BBQ_CONCRETE: 'MAT-415-bbq-concrete',
  BBQ_APPLIANCE_HARDWARE: 'MAT-413-bbq-appliance-hardware',
  GFIC_OUTLET_BBQ: 'MAT-410-gfic-outlet-bbq',

  // ── Fire Pit (category Fire Pit) ────────────────────────────────────────────
  FP_BLOCK: 'MAT-110-fp-block',
  FP_CONCRETE: 'MAT-111-fp-concrete',
  FP_GROUT_PUMP_SETUP: 'MAT-112-fp-grout-pump-setup',

  // ── Planting add-ons (category Planting) ────────────────────────────────────
  TREE_STAKE: 'MAT-649-tree-stake',
  ROOT_BARRIER_12: 'MAT-647-root-barrier-12in',
  ROOT_BARRIER_24: 'MAT-648-root-barrier-24in',
  GOPHER_BASKET_1: 'MAT-642-gopher-basket-1-gal',
  GOPHER_BASKET_5: 'MAT-644-gopher-basket-5-gal',
  GOPHER_BASKET_15: 'MAT-643-gopher-basket-15-gal',
  MESH_FLAT: 'MAT-646-mesh-flat',
  JUTE_FABRIC: 'MAT-645-jute-fabric',

  // ── Irrigation timers (category Irrigation) ─────────────────────────────────
  TIMER_4: 'MAT-209-timer-4-station',
  TIMER_6: 'MAT-210-timer-6-station',
  TIMER_9: 'MAT-211-timer-9-station',
  TIMER_12: 'MAT-206-timer-12-station',
  TIMER_15: 'MAT-207-timer-15-station',
  TIMER_18: 'MAT-208-timer-18-station',
  TIMER_HUNTER_ICC_8: 'MAT-213-timer-hunter-icc-8-station',
  TIMER_ADDITIONAL_8: 'MAT-212-timer-additional-8-station-module',

  // ── Drainage ────────────────────────────────────────────────────────────────
  SUMP_PUMP: 'MAT-069-sump-pump',

  // ── Ground Treatments ───────────────────────────────────────────────────────
  DG_CEMENT_MIX: 'MAT-121-dg-cement-mix',
}
