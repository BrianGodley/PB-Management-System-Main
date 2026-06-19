import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { migrateLegacyStorage } from './lib/storageMigration'

// Rebrand: migrate any legacy pbs:/pb: localStorage keys to softcake: (once).
migrateLegacyStorage()

// ── Stale-chunk auto-recovery ────────────────────────────────────────────────
// After a new deploy, the build's JS chunks get fresh content-hashed names. A
// browser tab still running the OLD build will try to lazy-load a chunk name
// that no longer exists on the server (404) → "Failed to fetch dynamically
// imported module". Vite fires `vite:preloadError` for exactly this. We do a
// one-time reload to pull the current build. The timestamp guard prevents a
// reload loop if the failure is a genuine network/asset problem rather than a
// stale chunk.
window.addEventListener('vite:preloadError', event => {
  event.preventDefault()
  const last = Number(sessionStorage.getItem('softcake:preloadReloadAt') || 0)
  if (Date.now() - last > 10000) {
    sessionStorage.setItem('softcake:preloadReloadAt', String(Date.now()))
    window.location.reload()
  }
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
