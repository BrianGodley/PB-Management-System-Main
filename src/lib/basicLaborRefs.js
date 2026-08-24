// Stable ref_key constants for the Basic Labor rate table (format: BAS-NNN-slug,
// frozen in the DB). Basic Labor is its own table (next to labor_rates) holding
// the shared cross-module labor coefficients — one row is the single source of
// truth every consumer reads. Modules reference these constants instead of display
// names, so a rate's name can be edited freely without breaking pricing. The rate
// map (fetchStandardRateMap) is dual-keyed by name AND ref_key during the
// transition, so a partial rollout is always safe.
export const BAS = {
  // Shared with Drainage + Utilities (was labor_rates 'Basic Labor - Curb Core').
  CURB_CORE: 'BAS-001-curb-core',

  // Base Prep (hrs per Cu Ft) — ONE shared set of three methods every base-prep
  // consumer reads: Concrete, Pavers, and the Hand/Mini/Skid demos. Skid Good/OK
  // were collapsed into a single Skid Steer rate (job difficulty % covers the
  // variance). The concrete-specific rows (BAS-009..012) and the OK skid row
  // (BAS-005) were archived. All three live under sub 'Base Prep'.
  BASE_PREP_SKID: 'BAS-004-import-base-skid-steer-good', // canonical Skid Steer
  BASE_PREP_MINI: 'BAS-003-import-base-mini-skid-steer',
  BASE_PREP_HAND: 'BAS-002-import-base-hand',

  // Back-compat aliases (same rows) — demos still import these names.
  IMPORT_BASE_HAND: 'BAS-002-import-base-hand',
  IMPORT_BASE_MINI: 'BAS-003-import-base-mini-skid-steer',
  IMPORT_BASE_SKID_GOOD: 'BAS-004-import-base-skid-steer-good',

  // Shared demo/Walls coefficients (moved out of labor_rates 'Basic Labor').
  JUMPING_JACK: 'BAS-006-jumping-jack', // compaction, hrs / Cu Ft (Walls reads by name)
  DIFFICULTY_RATIO: 'BAS-007-difficulty-ratio',
  // (CONCRETE_WEIGHT / BAS-008 retired — tons removed, no consumer; row archived.)
}
