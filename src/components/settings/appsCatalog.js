// src/components/settings/appsCatalog.js
// Friendly metadata for the Subscription tab + Apps catalog. Maps the raw
// module keys used by plans/packages (nav paths) to display names + blurbs so
// the user sees "Job Tracking" rather than "/jobs".

export const MODULE_INFO = {
  '/':                   { name: 'Dashboard',            blurb: 'Company home with live stage cards and customizable widgets.' },
  '/org-chart':          { name: 'Org Chart',            blurb: 'Build your org structure with positions, areas, and hats.' },
  '/statistics':         { name: 'Statistics',           blurb: 'Track key metrics and performance across the company.' },
  '/edocuments':         { name: 'E-Documents',          blurb: 'Send, sign, and store contracts and forms electronically.' },
  '/hr':                 { name: 'HR',                   blurb: 'Employees, time clock, labor rates, and personnel files.' },
  '/training':           { name: 'Training (LMS)',       blurb: 'Curriculum, checksheets, and employee training tracking.' },
  '/contacts':           { name: 'Marketing',            blurb: 'Contacts, workflows, website builder, and social media.' },
  '/clients':            { name: 'Sales',                blurb: 'Funnels, appointments, estimates, and the client pipeline.' },
  '/workflows':          { name: 'Workflows',            blurb: 'Design document and process workflows for your team.' },
  '/accounting':         { name: 'Accounting',           blurb: 'Financial tracking and reporting.' },
  '/collections':        { name: 'Collections',          blurb: 'Manage receivables and follow up on outstanding balances.' },
  '/portal/subs':        { name: 'Subcontractor Portal', blurb: 'Give subs a portal for quotes, contracts, and change orders.' },
  '/equipment-tracking': { name: 'Equipment Tracking',   blurb: 'Track equipment, assignments, and maintenance.' },
  '/jobs':               { name: 'Job Tracking',         blurb: 'Run active jobs: scheduling, daily logs, tasks, and files.' },
  '/bids':               { name: 'Estimating & Bids',    blurb: 'Module-based estimator, GP analysis, and bid documents.' },
  '/design':             { name: 'Design',               blurb: 'Design tools for proposals and presentations.' },
}

export function moduleName(key) {
  return MODULE_INFO[key]?.name || key
}

// Optional richer copy for add-on packages, keyed by package id.
export const PACKAGE_INFO = {
  contractor: {
    tagline: 'Everything to estimate, win, and run jobs',
    blurb:
      'Adds the full contractor workflow — the module-based estimator, bids and proposals, design tools, and live job tracking.',
  },
}
