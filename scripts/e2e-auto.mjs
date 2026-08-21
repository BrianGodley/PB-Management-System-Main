// The one command for the hands-off E2E loop. Start it once and walk away:
//   npm run e2e:auto
// It runs BOTH halves that need your machine's network:
//   • e2e-watch    — pulls CI results into the repo so the autopilot can read them
//   • e2e-autopush — commits+pushes the autopilot's e2e/ test fixes so CI reruns
// The scheduled "e2e-autopilot" task does the reading + fixing on its own cadence.
// Loop: push → CI runs → watch pulls result → autopilot reads → fixes e2e/ →
//        autopush ships it → CI reruns → … until green, or the autopilot flags a
//        REAL bug / decision (which needs you — it never changes src/ or pricing alone).
import { spawn } from 'node:child_process'

const start = (name, file) => {
  const p = spawn('node', [file], { stdio: 'inherit' })
  p.on('exit', code => console.log(`[e2e-auto] ${name} exited (${code}) — restart with npm run e2e:auto`))
  return p
}
console.log('[e2e-auto] GO — hands-off loop running (watch + autopush). Ctrl+C stops both.')
start('watch', 'scripts/e2e-watch.mjs')
start('autopush', 'scripts/e2e-autopush.mjs')
