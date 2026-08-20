// Local CI-results watcher — the ONE thing Brian starts to "initiate" the loop.
// Claude's sandbox can't reach GitHub, so it can't fetch CI results itself. This
// tiny loop runs on Brian's machine (which has network) and keeps the repo's
// `origin/ci-results` ref fresh, so the scheduled "E2E autopilot" task can read the
// latest run straight from disk. Run once in a terminal and leave it:  npm run e2e:watch
import { execSync } from 'node:child_process'

const EVERY_MS = 60_000
let last = ''

const sh = c => {
  try {
    return execSync(c, { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim()
  } catch {
    return ''
  }
}

console.log('[e2e-watch] polling origin/ci-results every 60s — leave this running. Ctrl+C to stop.')
const tick = () => {
  sh('git fetch origin ci-results')
  const commit = sh('git show origin/ci-results:commit.txt')
  const when = sh('git show origin/ci-results:updated_at.txt')
  if (commit && commit !== last) {
    last = commit
    console.log(`[e2e-watch] new results: ${commit.slice(0, 7)} @ ${when}`)
  }
}
tick()
setInterval(tick, EVERY_MS)
