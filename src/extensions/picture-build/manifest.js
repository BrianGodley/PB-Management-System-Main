// src/extensions/picture-build/manifest.js
//
// Picture Build = extension #1. This is the stub that proves the framework wiring.
// It stays EMPTY (no modules/slots/hooks) until we run the PB feature inventory
// and move PB-only features in here. Because it's empty — and not enabled for any
// tenant yet — including it changes nothing in the running app.
//
// Manifest contract (apiVersion 1):
//   id          unique string, also the table prefix: ext_pb_*
//   modules[]   { key, label, icon, path: '/x/pb/...', load: () => import(...) }
//   slots{}     { '<slot.name>': [ { id, label, load: () => import(...) } ] }
//   hooks{}     { '<event.name>': () => import('./hooks/...')  }  // default export = handler

export default {
  id: 'picture-build',
  name: 'Picture Build',
  version: '0.1.0',
  apiVersion: 1,
  modules: [],
  slots: {},
  hooks: {},
}
