// src/marketing/MarketingLanding.jsx
//
// Public marketing site — the logged-out face of the app. Served at "/" when
// there's no authenticated user (see App.jsx). CTAs route into the app's
// /signup and /login. Single-page scroll with anchor nav.
//
// Branding: SoftCake, blue palette (matches the cloud logo), /logo.png with a
// ☁️ fallback.

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { PLATFORM_BRAND } from '../lib/brand'
import SamWidget from './SamWidget'
import MarketingHeader from './MarketingHeader'

const FG = '#2E8BC9'       // SoftCake blue (primary)
const FG_DARK = '#1B5E8C'  // deep blue (gradients)
const FG_LIGHT = '#5BB3E4' // light sky blue

// ── Content ──────────────────────────────────────────────────────────────────
// Exported so the dedicated /features page can render the same groups.
export const FEATURE_GROUPS = [
  {
    icon: '🏢',
    title: 'Organize the Business',
    blurb: 'The back office every growing company needs.',
    items: [
      ['Dashboard', 'A live pulse on your people, work and money the moment you log in.'],
      ['Org Chart', 'Map every position, area and reporting line — then drill into each.'],
      ['HR', 'Employees, applicants, time clock, document files and onboarding templates.'],
      ['Workflows', 'Repeatable document and approval flows that run themselves.'],
      ['Statistics', 'Track the numbers that matter by position and by person.'],
    ],
  },
  {
    icon: '📈',
    title: 'Win & manage work',
    blurb: 'From first call to signed contract.',
    items: [
      ['Sales & Marketing', 'A CRM with funnels, a booking calendar and campaigns.'],
      ['Training (LMS)', 'Assign courses, track completion, build a competent team.'],
      ['Documents & E-Docs', 'Files, photos, videos, a doc creator, and e-signature.'],
    ],
  },
  {
    icon: '💵',
    title: 'Control the money',
    blurb: 'Real finance, not just bookkeeping.',
    items: [
      ['Accounting', 'Invoices, bills and journals — tagged to the work they belong to.'],
      ['Weekly Financial Planning', 'Plan the week around real cash and statistics.'],
      ['Equipment & Assets', 'Know where your assets are and what they cost you.'],
    ],
  },
]

// The optional Contractor Extension Package — surfaced on the landing page and
// detailed module-by-module on the /contractor-extensions page.
export const CONTRACTOR_MODULES = [
  {
    name: 'Jobs',
    blurb: 'Run every project from schedule to invoice.',
    items: [
      ['Scheduling', 'Master crew schedule, schedule by work order, and an AI schedule assistant.'],
      ['Daily Logs', 'Track notes and job photos, and send important notifications from the field.'],
      ['Tasks', 'Track tasks by job, see per-job or total tasks, and set reminders.'],
      ['Work Orders', 'Organize work by crew type, with hours and assignments.'],
      ['On-site Time Tracking', 'Time Clock integrated by job for job-specific time tracking.'],
      ['Tracking', 'Estimated material and hours vs. actual — with auto payroll calculations and per-job material tracking.'],
      ['Invoicing', 'Invoice clients and receive payments.'],
      ['Job Documents', 'Track job documentation on every project.'],
    ],
  },
  {
    name: 'Design',
    blurb: 'Design and spec the work.',
    items: [
      ['CAD-assisted drawing', 'Draw plans with CAD-assisted tools.'],
      ['Take-off calculations', 'Calculate quantities directly from the drawing.'],
      ['Material Choices Library', 'A shared library of material choices for clients and internal staff.'],
    ],
  },
  {
    name: 'Estimating & Bids',
    blurb: 'Price the work and win it.',
    items: [
      ['GP & Man-Day estimating', 'Gross-profit and man-day based estimating.'],
      ['Branded bids', 'Turn estimates into bids on company letterhead with full descriptions and disclaimers.'],
      ['Bid tracking', 'Create bids from estimates and track the bid process.'],
      ['Contracts & e-signature', 'Create company-specific, customized contracts and send them for electronic signature.'],
    ],
  },
  {
    name: 'Subs & Vendors',
    blurb: 'Manage everyone you work with.',
    items: [
      ['Directory', 'Track subs and vendors in one place.'],
      ['Sub contracts', 'Create contracts for subs in the office or on the jobsite.'],
      ['Vendor pricing + AI', 'Update vendor pricing and use an AI assistant for vendor price negotiations.'],
    ],
  },
  {
    name: 'Client Portal',
    blurb: 'Give clients a window into their project.',
    items: [
      ['Web login', 'Clients access their data through a secure web login.'],
      ['Change-order approvals', 'Clients view and approve change orders.'],
      ['Schedule & logs', 'Optionally give clients access to the schedule and daily logs.'],
      ['Job documentation', 'Client-viewable job documentation.'],
    ],
  },
  {
    name: 'Change Orders',
    blurb: 'Capture scope changes anywhere.',
    items: [
      ['Profit & man-day estimators', 'Use the profit and man-day estimators for change orders in the office or onsite.'],
      ['Sign onsite', 'Clients can sign and approve onsite.'],
      ['Auto flow', 'Change orders flow automatically into accounting and job-tracking measurables.'],
    ],
  },
]

export const TIERS = [
  {
    id: 'tier1',
    name: 'Tier 1 — Base',
    price: 79,
    tagline: 'The essentials to organize your company.',
    includes: ['Dashboard', 'Org Chart', 'HR', 'Statistics', 'Documents & E-Docs'],
  },
  {
    id: 'tier2',
    name: 'Tier 2',
    price: 229,
    featured: true,
    tagline: 'Win and manage work, end to end.',
    includes: ['Everything in Tier 1', 'Training (LMS)', 'Sales', 'Marketing', 'Workflows'],
  },
  {
    id: 'tier3',
    name: 'Tier 3',
    price: 389,
    tagline: 'Full financial and operational control.',
    includes: ['Everything in Tier 2', 'Accounting', 'Weekly Financial Planning', 'Subs & Vendors', 'Equipment Tracking'],
  },
]

const FAQS = [
  ['Is it really unlimited users?', 'Yes. Every plan includes unlimited users at no extra cost — add your whole team, office and field, without per-seat fees.'],
  ['How does the free trial work?', 'You get 14 days free. Pick a plan, set up your company in under a minute, and explore everything. You can change or cancel before the trial ends.'],
  ['What is the Contractor Extension Package?', 'An optional add-on for companies that run projects, job sites or field crews. It turns on Jobs, Estimating & Bids, Design, change orders and more on top of any Tier 2 or Tier 3 plan for an extra $199/mo. Most businesses never need it — see the contractor extensions page for the full list.'],
  ['Can I change plans later?', 'Anytime. Move up or down a tier, or add the Contractor Package, and your modules update immediately. You only ever see the features your plan includes.'],
  ['Is my data secure and private?', 'Each company is fully isolated — your records are only ever visible to your team. We use row-level security so one company can never see another’s data.'],
  ['Do you charge setup or cancellation fees?', 'No setup fees and no cancellation fees. It’s month-to-month.'],
]

// Front-page photos live in public/marketing/. A missing image degrades
// gracefully. The contractor shot anchors its own band; these three fill the
// "one system" showcase grid.
const SHOWCASE = [
  ['/marketing/marketing.jpg', 'Sales & Marketing', 'Funnels, a booking calendar, contact workflows and campaigns — built around how contractors actually sell.'],
  ['/marketing/team.jpg', 'People & operations', 'Org chart, employees, time clock and onboarding — keep the office and the field aligned.'],
  ['/marketing/hr.jpg', 'Hire & train', 'Recruiting, skill training and a full LMS so every new hire ramps up the same way.'],
]

// Sam — the built-in AI assistant. `true` marks an ability that's on the roadmap.
const SAM_FEATURES = [
  ['Ask anything about your business in plain English', false],
  ['Draft documents, checksheets and templates', false],
  ['Summaries and synopses across every module', false],
  ['AI schedule assistant for jobs', true],
  ['Vendor price-negotiation assistant', true],
]

// ── Small pieces ───────────────────────────────────────────────────────────
function Logo({ size = 36 }) {
  return (
    <span
      className="inline-flex items-center justify-center rounded-xl overflow-hidden shadow"
      style={{ width: size, height: size, backgroundColor: FG_DARK }}
    >
      <img
        src={PLATFORM_BRAND.logo}
        alt={PLATFORM_BRAND.name}
        className="w-full h-full object-contain p-1"
        onError={e => {
          e.target.style.display = 'none'
          e.target.nextSibling.style.display = 'block'
        }}
      />
      <span style={{ display: 'none', fontSize: size * 0.55, lineHeight: 1 }}>🌿</span>
    </span>
  )
}

function Check() {
  return (
    <svg className="w-4 h-4 flex-shrink-0 mt-0.5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M5 10.5l3.5 3.5L15 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function MarketingLanding() {
  const { user } = useAuth()
  const [openFaq, setOpenFaq] = useState(0)

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <MarketingHeader />

      {/* ── Hero ───────────────────────────────────────────────────────────── */}
      <section id="top" className="relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${FG_DARK} 0%, ${FG} 55%, ${FG_LIGHT} 100%)` }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-20 sm:py-28 text-center">
          <span className="inline-block text-xs font-semibold tracking-wide uppercase text-blue-100/90 bg-white/10 rounded-full px-3 py-1 mb-5">
            All-in-one platform to run your business
          </span>
          <h1 className="text-4xl sm:text-6xl font-extrabold text-white tracking-tight leading-[1.05] max-w-3xl mx-auto">
            Organize your whole company from one place
          </h1>
          <p className="mt-5 text-lg sm:text-xl text-blue-50/90 max-w-2xl mx-auto">
            {PLATFORM_BRAND.name} brings your people, sales, documents and money into one connected system — the modern way to run a company, whatever you do.
          </p>
          <div className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              to="/signup"
              className="w-full sm:w-auto text-base font-bold rounded-xl px-7 py-3.5 shadow-lg hover:opacity-90 transition-opacity"
              style={{ backgroundColor: 'white', color: FG_DARK }}
            >
              Start your 14-day free trial
            </Link>
            <Link to="/features" className="w-full sm:w-auto text-base font-semibold text-white border border-white/30 rounded-xl px-7 py-3.5 hover:bg-white/10 transition-colors">
              See what’s inside
            </Link>
          </div>
          <p className="mt-5 text-sm text-blue-100/80">
            Unlimited users · No setup fees · Cancel anytime
          </p>
        </div>
      </section>

      {/* ── Stat band ──────────────────────────────────────────────────────── */}
      <section className="border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {[
            ['Unlimited', 'users on every plan'],
            ['15+', 'connected modules'],
            ['1 system', 'across every team'],
            ['14 days', 'free to try'],
          ].map(([big, small]) => (
            <div key={small}>
              <div className="text-2xl sm:text-3xl font-extrabold" style={{ color: FG }}>{big}</div>
              <div className="text-xs sm:text-sm text-gray-500 mt-1">{small}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── One-system showcase (photos) ───────────────────────────────────── */}
      <section className="bg-gray-50 border-y border-gray-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">One system for every part of your business</h2>
            <p className="mt-4 text-gray-600">Sell it, staff it, build it — all connected, all in one place.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {SHOWCASE.map(([src, title, body]) => (
              <div key={src} className="rounded-2xl overflow-hidden bg-white border border-gray-200 shadow-sm flex flex-col">
                <div className="aspect-[16/10] bg-blue-50">
                  <img
                    src={src}
                    alt={title}
                    loading="lazy"
                    className="w-full h-full object-cover"
                    onError={e => { e.currentTarget.style.display = 'none' }}
                  />
                </div>
                <div className="p-5">
                  <h3 className="font-bold text-gray-900">{title}</h3>
                  <p className="text-sm text-gray-600 mt-1.5">{body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Meet Sam (AI) ──────────────────────────────────────────────────── */}
      <section id="sam" className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
        <div className="rounded-3xl overflow-hidden grid md:grid-cols-2" style={{ background: `linear-gradient(135deg, ${FG_DARK} 0%, ${FG} 100%)` }}>
          <div className="p-8 sm:p-12 text-white">
            <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide bg-white/15 rounded-full px-3 py-1">
              ✨ AI built in
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight mt-4">Meet Sam, your AI assistant</h2>
            <p className="mt-4 text-blue-50/90">
              Sam works across {PLATFORM_BRAND.name} — ask questions in plain English, draft documents,
              and let AI handle the busywork. We’re adding new abilities all the time.
            </p>
            <ul className="mt-6 space-y-3 text-sm text-blue-50/95">
              {SAM_FEATURES.map(([f, soon]) => (
                <li key={f} className="flex items-start gap-2.5">
                  <span className="text-white/90"><Check /></span>
                  <span>
                    {f}
                    {soon && (
                      <span className="ml-2 text-[10px] uppercase font-bold bg-white/20 rounded px-1.5 py-0.5 align-middle">
                        Coming soon
                      </span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <div className="relative flex items-center justify-center p-8 sm:p-10 bg-white/5">
            <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl p-5">
              <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-lg" style={{ backgroundColor: FG }}>✨</div>
                <div>
                  <p className="font-bold text-gray-900 leading-tight">Sam</p>
                  <p className="text-xs text-gray-400">AI assistant</p>
                </div>
              </div>
              <div className="space-y-3 pt-4 text-sm">
                <p className="bg-gray-100 text-gray-700 rounded-2xl rounded-tl-sm px-3 py-2 max-w-[80%]">
                  Which jobs are over budget this week?
                </p>
                <p className="text-white rounded-2xl rounded-tr-sm px-3 py-2 max-w-[88%] ml-auto" style={{ backgroundColor: FG }}>
                  Three are tracking over on labor. Want me to flag them and draft a note to each PM?
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ ────────────────────────────────────────────────────────────── */}
      <section id="faq" className="max-w-3xl mx-auto px-4 sm:px-6 py-20">
        <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-center mb-12">Questions, answered</h2>
        <div className="space-y-3">
          {FAQS.map(([q, a], i) => {
            const open = openFaq === i
            return (
              <div key={q} className="border border-gray-200 rounded-xl overflow-hidden">
                <button
                  onClick={() => setOpenFaq(open ? -1 : i)}
                  className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left"
                >
                  <span className="font-semibold text-sm sm:text-base text-gray-900">{q}</span>
                  <span className={`text-gray-400 transition-transform flex-shrink-0 ${open ? 'rotate-45' : ''}`}>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" d="M12 5v14M5 12h14" /></svg>
                  </span>
                </button>
                {open && <p className="px-5 pb-5 -mt-1 text-sm text-gray-600 leading-relaxed">{a}</p>}
              </div>
            )
          })}
        </div>
      </section>

      {/* ── Final CTA ──────────────────────────────────────────────────────── */}
      <section className="px-4 sm:px-6 pb-20">
        <div className="max-w-5xl mx-auto rounded-3xl px-6 py-14 sm:py-16 text-center" style={{ background: `linear-gradient(135deg, ${FG_DARK} 0%, ${FG} 60%, ${FG_LIGHT} 100%)` }}>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">Ready to get organized?</h2>
          <p className="mt-3 text-blue-50/90 max-w-xl mx-auto">Set up your company in under a minute. 14 days free, unlimited users, cancel anytime.</p>
          {/* (blue theme) */}
          <Link to="/signup" className="inline-block mt-7 text-base font-bold rounded-xl px-8 py-3.5 shadow-lg hover:opacity-90 transition-opacity" style={{ backgroundColor: 'white', color: FG_DARK }}>
            Start your free trial
          </Link>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <footer className="border-t border-gray-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <Logo size={28} />
            <span className="font-semibold text-gray-800">{PLATFORM_BRAND.name}</span>
          </div>
          <nav className="flex items-center gap-6 text-sm text-gray-500">
            <Link to="/features" className="hover:text-gray-800">Features</Link>
            <Link to="/pricing" className="hover:text-gray-800">Pricing</Link>
            <a href="#faq" className="hover:text-gray-800">FAQ</a>
            {user
              ? <Link to="/" className="hover:text-gray-800">Go to app →</Link>
              : <Link to="/login" className="hover:text-gray-800">Log in</Link>}
          </nav>
          <p className="text-xs text-gray-400">© {new Date().getFullYear()} {PLATFORM_BRAND.name}</p>
        </div>
      </footer>

      <SamWidget />
    </div>
  )
}
