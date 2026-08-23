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
}
