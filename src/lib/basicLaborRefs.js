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

  // Base Prep (hrs per Cu Ft). Import-base methods shared by Pavers + Hand/Mini/Skid
  // demos; concrete-base methods used by Concrete. All live under sub 'Base Prep'.
  IMPORT_BASE_HAND: 'BAS-002-import-base-hand',
  IMPORT_BASE_MINI: 'BAS-003-import-base-mini-skid-steer',
  IMPORT_BASE_SKID_GOOD: 'BAS-004-import-base-skid-steer-good',
  IMPORT_BASE_SKID_OK: 'BAS-005-import-base-skid-steer-ok',
  CONC_BASE_HAND: 'BAS-009-concrete-base-hand',
  CONC_BASE_MINI: 'BAS-010-concrete-base-mini-skid-steer',
  CONC_BASE_SKID: 'BAS-011-concrete-base-skid-steer',
  CONC_BASE_WHEELBARROW: 'BAS-012-concrete-base-wheelbarrow',

  // Shared demo/Walls coefficients (moved out of labor_rates 'Basic Labor').
  JUMPING_JACK: 'BAS-006-jumping-jack', // compaction, hrs / Cu Ft (Walls reads by name)
  DIFFICULTY_RATIO: 'BAS-007-difficulty-ratio',
  CONCRETE_WEIGHT: 'BAS-008-concrete-weight-lb-cf',
}
