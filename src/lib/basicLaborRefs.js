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

  // Import Base prep (hrs per Cu Ft), shared by Pavers + the Hand/Mini/Skid demos.
  IMPORT_BASE_HAND: 'BAS-002-import-base-hand',
  IMPORT_BASE_MINI: 'BAS-003-import-base-mini-skid-steer',
  IMPORT_BASE_SKID_GOOD: 'BAS-004-import-base-skid-steer-good',
  IMPORT_BASE_SKID_OK: 'BAS-005-import-base-skid-steer-ok',
}
