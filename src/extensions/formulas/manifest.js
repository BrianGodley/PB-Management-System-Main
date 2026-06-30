// src/extensions/formulas/manifest.js
//
// Formulas extension — statistic condition/trend analysis. Registered in
// src/platform/registry.js. Only active for tenants with the 'formulas' row in
// public.tenant_extensions (resolved by get_my_extensions()).
//
// Manifest contract (apiVersion 1):
//   id          'formulas'  — also the DB table prefix: ext_formulas_*
//   modules[]   nav + route entries (path under the platform /x/ namespace)
//   slots{}     UI contributed into core <Slot> injection points
//   hooks{}     event loaders
export default {
  id: 'formulas',
  name: 'Formulas',
  version: '0.1.0',
  apiVersion: 1,
  modules: [
    {
      key: 'formulas',
      label: 'Formulas',
      icon: '🧮',
      path: '/x/formulas',
      load: () => import('./FormulasApp.jsx'),
    },
  ],
  slots: {},
  hooks: {},
}
