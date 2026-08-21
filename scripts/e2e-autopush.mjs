// Auto-push half of the hands-off E2E loop. When the autopilot (scheduled task) edits
// TEST files under e2e/, this commits + pushes them so CI reruns — no manual touch.
//
// SAFETY: scoped to `e2e/` ONLY. It never stages or pushes src/, SQL, config, or any
// app/pricing code — so it can only ship test changes, never a product change. A one-tick
// debounce lets a multi-file edit settle before pushing.
//
// Run via `npm run e2e:auto` (which also starts the results watcher).
import { execSync } from 'node:child_process'

const EVERY_MS = 45_000
const sh = c => {
  try { return execSync(c, { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim() } catch { return '' }
}

let prev = ''
console.log('[e2e-autopush] watching e2e/ for autopilot fixes → auto commit+push. e2e/ ONLY. Ctrl+C to stop.')
const tick = () => {
  const changed = sh('git status --porcelain -- e2e/')
  if (!changed) { prev = ''; return }
  if (changed !== prev) { prev = changed; return } // wait one tick for the edit to settle
  sh('git add -- e2e/') // stage ONLY e2e/ — never src/, sql, config
  const staged = sh('git diff --cached --name-only')
  if (!staged) { prev = ''; return }
  sh(`git commit -m "auto(e2e): autopilot test fix [${new Date().toISOString()}]"`)
  const pushErr = (() => { try { execSync('git push', { stdio: ['ignore', 'pipe', 'pipe'] }); return '' } catch (e) { return String(e.message || e) } })()
  console.log(pushErr ? `[e2e-autopush] push FAILED: ${pushErr.split('\n')[0]}` : `[e2e-autopush] pushed: ${staged.split('\n').join(', ')}`)
  prev = ''
}
tick()
setInterval(tick, EVERY_MS)
