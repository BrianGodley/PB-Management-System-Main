// src/lib/websiteBlocks.jsx
// Puck (@measured/puck) configuration for the Website Builder. Defines the
// section blocks a tenant can drag onto their marketing pages, styled with
// Tailwind in the SoftCake/brand look. The SAME config renders both the editor
// (<Puck>) and the public site (<Render>), so what you build is what ships.
//
// Brand color: pages set a CSS var --site-primary on a wrapper; blocks read it
// so each tenant's accent flows through. Falls back to the platform green.
//
// ContactForm is interactive: on the public site it submits leads via the
// runtime context; in the editor it renders a non-submitting preview.
import { createContext, useContext, useState } from 'react'

export const WebsiteRuntimeContext = createContext({
  mode: 'edit',        // 'edit' (in builder) | 'live' (public site)
  onLead: null,        // async ({name,email,phone,message}) => void
})

const PRIMARY = 'var(--site-primary, #3A5038)'
const Section = ({ children, className = '', style }) => (
  <section className={`w-full px-6 py-14 sm:py-20 ${className}`} style={style}>
    <div className="max-w-5xl mx-auto">{children}</div>
  </section>
)
const btn = 'inline-block px-6 py-3 rounded-xl font-semibold text-white shadow-sm transition-transform hover:-translate-y-0.5'

// ── Hero ─────────────────────────────────────────────────────────────────────
const Hero = {
  label: 'Hero',
  fields: {
    title: { type: 'text' },
    subtitle: { type: 'textarea' },
    buttonText: { type: 'text' },
    buttonLink: { type: 'text' },
    bgImage: { type: 'text' },
    align: { type: 'select', options: [{ label: 'Center', value: 'center' }, { label: 'Left', value: 'left' }] },
  },
  defaultProps: {
    title: 'Beautiful landscapes, built to last',
    subtitle: 'Design, installation, and maintenance for homeowners who want the best.',
    buttonText: 'Get a free quote',
    buttonLink: '#contact',
    bgImage: '',
    align: 'center',
  },
  render: ({ title, subtitle, buttonText, buttonLink, bgImage, align }) => (
    <section
      className="w-full px-6 py-24 sm:py-32 bg-cover bg-center relative"
      style={{ backgroundImage: bgImage ? `linear-gradient(rgba(0,0,0,.45),rgba(0,0,0,.45)), url(${bgImage})` : 'linear-gradient(135deg,#1f2937,#374151)' }}
    >
      <div className={`max-w-4xl mx-auto ${align === 'left' ? 'text-left' : 'text-center mx-auto'}`}>
        <h1 className="text-4xl sm:text-6xl font-extrabold text-white leading-tight">{title}</h1>
        {subtitle && <p className="mt-5 text-lg sm:text-xl text-gray-100/90 max-w-2xl mx-auto">{subtitle}</p>}
        {buttonText && (
          <div className="mt-8">
            <a href={buttonLink || '#'} className={btn} style={{ backgroundColor: PRIMARY }}>{buttonText}</a>
          </div>
        )}
      </div>
    </section>
  ),
}

// ── Services / Features ──────────────────────────────────────────────────────
const Services = {
  label: 'Services',
  fields: {
    heading: { type: 'text' },
    items: {
      type: 'array',
      getItemSummary: i => i.title || 'Service',
      arrayFields: { icon: { type: 'text' }, title: { type: 'text' }, description: { type: 'textarea' } },
      defaultItemProps: { icon: '🌿', title: 'Service', description: 'Describe it briefly.' },
    },
  },
  defaultProps: {
    heading: 'What we do',
    items: [
      { icon: '🌳', title: 'Landscape Design', description: 'Custom plans tailored to your property.' },
      { icon: '🧱', title: 'Hardscaping', description: 'Patios, walls, walkways, and outdoor living.' },
      { icon: '💧', title: 'Irrigation', description: 'Efficient systems that keep everything thriving.' },
    ],
  },
  render: ({ heading, items = [] }) => (
    <Section className="bg-white">
      {heading && <h2 className="text-3xl font-bold text-gray-900 text-center mb-10">{heading}</h2>}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((s, i) => (
          <div key={i} className="rounded-2xl border border-gray-100 p-6 shadow-sm bg-white">
            <div className="text-3xl mb-3">{s.icon}</div>
            <h3 className="font-bold text-gray-900 text-lg">{s.title}</h3>
            <p className="text-gray-500 mt-1.5 text-sm leading-relaxed">{s.description}</p>
          </div>
        ))}
      </div>
    </Section>
  ),
}

// ── Gallery ──────────────────────────────────────────────────────────────────
const Gallery = {
  label: 'Gallery',
  fields: {
    heading: { type: 'text' },
    images: {
      type: 'array',
      getItemSummary: i => i.caption || 'Image',
      arrayFields: { url: { type: 'text' }, caption: { type: 'text' } },
      defaultItemProps: { url: '', caption: '' },
    },
  },
  defaultProps: { heading: 'Our work', images: [{ url: '', caption: '' }, { url: '', caption: '' }, { url: '', caption: '' }] },
  render: ({ heading, images = [] }) => (
    <Section className="bg-gray-50">
      {heading && <h2 className="text-3xl font-bold text-gray-900 text-center mb-10">{heading}</h2>}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {images.map((img, i) => (
          <figure key={i} className="rounded-2xl overflow-hidden bg-gray-200 aspect-[4/3] flex items-center justify-center">
            {img.url ? (
              <img src={img.url} alt={img.caption || ''} className="w-full h-full object-cover" />
            ) : (
              <span className="text-gray-400 text-sm">Add an image URL</span>
            )}
          </figure>
        ))}
      </div>
    </Section>
  ),
}

// ── About ────────────────────────────────────────────────────────────────────
const About = {
  label: 'About',
  fields: {
    heading: { type: 'text' },
    body: { type: 'textarea' },
    image: { type: 'text' },
    imageSide: { type: 'select', options: [{ label: 'Right', value: 'right' }, { label: 'Left', value: 'left' }] },
  },
  defaultProps: {
    heading: 'About us',
    body: 'Tell your story — who you are, how long you’ve been in business, and why customers trust you.',
    image: '',
    imageSide: 'right',
  },
  render: ({ heading, body, image, imageSide }) => (
    <Section className="bg-white">
      <div className={`flex flex-col gap-8 items-center ${imageSide === 'left' ? 'md:flex-row-reverse' : 'md:flex-row'}`}>
        <div className="flex-1">
          <h2 className="text-3xl font-bold text-gray-900 mb-3">{heading}</h2>
          <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">{body}</p>
        </div>
        <div className="flex-1 w-full">
          <div className="rounded-2xl overflow-hidden bg-gray-200 aspect-[4/3] flex items-center justify-center">
            {image ? <img src={image} alt="" className="w-full h-full object-cover" /> : <span className="text-gray-400 text-sm">Add an image URL</span>}
          </div>
        </div>
      </div>
    </Section>
  ),
}

// ── Testimonials ─────────────────────────────────────────────────────────────
const Testimonials = {
  label: 'Testimonials',
  fields: {
    heading: { type: 'text' },
    items: {
      type: 'array',
      getItemSummary: i => i.name || 'Quote',
      arrayFields: { quote: { type: 'textarea' }, name: { type: 'text' }, role: { type: 'text' } },
      defaultItemProps: { quote: 'They did an amazing job!', name: 'Happy Customer', role: '' },
    },
  },
  defaultProps: {
    heading: 'What clients say',
    items: [{ quote: 'Best decision we made for our yard.', name: 'Jamie R.', role: 'Homeowner' }],
  },
  render: ({ heading, items = [] }) => (
    <Section className="bg-gray-50">
      {heading && <h2 className="text-3xl font-bold text-gray-900 text-center mb-10">{heading}</h2>}
      <div className="grid gap-6 sm:grid-cols-2">
        {items.map((t, i) => (
          <blockquote key={i} className="rounded-2xl bg-white border border-gray-100 p-6 shadow-sm">
            <p className="text-gray-700 italic">“{t.quote}”</p>
            <footer className="mt-3 text-sm font-semibold text-gray-900">{t.name}{t.role ? <span className="font-normal text-gray-400"> · {t.role}</span> : null}</footer>
          </blockquote>
        ))}
      </div>
    </Section>
  ),
}

// ── Call to action ───────────────────────────────────────────────────────────
const CTA = {
  label: 'Call to Action',
  fields: {
    heading: { type: 'text' },
    text: { type: 'textarea' },
    buttonText: { type: 'text' },
    buttonLink: { type: 'text' },
  },
  defaultProps: { heading: 'Ready to get started?', text: 'Request your free, no-obligation quote today.', buttonText: 'Contact us', buttonLink: '#contact' },
  render: ({ heading, text, buttonText, buttonLink }) => (
    <section className="w-full px-6 py-16" style={{ backgroundColor: PRIMARY }}>
      <div className="max-w-3xl mx-auto text-center">
        <h2 className="text-3xl font-bold text-white">{heading}</h2>
        {text && <p className="mt-3 text-white/85">{text}</p>}
        {buttonText && (
          <a href={buttonLink || '#'} className="inline-block mt-6 px-6 py-3 rounded-xl font-semibold bg-white text-gray-900 shadow hover:-translate-y-0.5 transition-transform">{buttonText}</a>
        )}
      </div>
    </section>
  ),
}

// ── Text block ───────────────────────────────────────────────────────────────
const TextBlock = {
  label: 'Text',
  fields: { heading: { type: 'text' }, body: { type: 'textarea' } },
  defaultProps: { heading: 'Heading', body: 'Write something here.' },
  render: ({ heading, body }) => (
    <Section className="bg-white">
      {heading && <h2 className="text-2xl font-bold text-gray-900 mb-3">{heading}</h2>}
      <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">{body}</p>
    </Section>
  ),
}

// ── Contact form (interactive) ───────────────────────────────────────────────
function ContactFormRender({ heading, subtext, buttonText }) {
  const { mode, onLead } = useContext(WebsiteRuntimeContext)
  const [form, setForm] = useState({ name: '', email: '', phone: '', message: '' })
  const [sending, setSending] = useState(false)
  const [done, setDone] = useState(false)
  const [err, setErr] = useState('')
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const submit = async e => {
    e.preventDefault()
    if (mode !== 'live' || !onLead) return // editor preview: no-op
    if (!form.name.trim() || !(form.email.trim() || form.phone.trim())) {
      setErr('Please add your name and an email or phone.'); return
    }
    setErr(''); setSending(true)
    try { await onLead(form); setDone(true) }
    catch (e2) { setErr(e2.message || 'Could not send. Please try again.') }
    finally { setSending(false) }
  }

  const field = 'w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2'
  return (
    <section id="contact" className="w-full px-6 py-16 bg-gray-50">
      <div className="max-w-xl mx-auto">
        <h2 className="text-3xl font-bold text-gray-900 text-center">{heading}</h2>
        {subtext && <p className="text-center text-gray-500 mt-2">{subtext}</p>}
        {done ? (
          <div className="mt-8 text-center bg-white border border-green-200 rounded-2xl p-8">
            <div className="text-4xl mb-2">✅</div>
            <p className="font-semibold text-gray-900">Thanks — we’ll be in touch shortly!</p>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-8 space-y-3 bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
            <input className={field} style={{ '--tw-ring-color': PRIMARY }} placeholder="Your name" value={form.name} onChange={e => set('name', e.target.value)} />
            <div className="grid sm:grid-cols-2 gap-3">
              <input className={field} style={{ '--tw-ring-color': PRIMARY }} placeholder="Email" value={form.email} onChange={e => set('email', e.target.value)} />
              <input className={field} style={{ '--tw-ring-color': PRIMARY }} placeholder="Phone" value={form.phone} onChange={e => set('phone', e.target.value)} />
            </div>
            <textarea className={field} style={{ '--tw-ring-color': PRIMARY }} rows={4} placeholder="How can we help?" value={form.message} onChange={e => set('message', e.target.value)} />
            {err && <p className="text-sm text-red-600">{err}</p>}
            <button type="submit" disabled={sending} className={`${btn} w-full justify-center disabled:opacity-60`} style={{ backgroundColor: PRIMARY }}>
              {sending ? 'Sending…' : (buttonText || 'Send')}
            </button>
            {mode === 'edit' && <p className="text-[11px] text-center text-gray-400">Preview — the form works on your published site.</p>}
          </form>
        )}
      </div>
    </section>
  )
}
const ContactForm = {
  label: 'Contact Form',
  fields: { heading: { type: 'text' }, subtext: { type: 'text' }, buttonText: { type: 'text' } },
  defaultProps: { heading: 'Get in touch', subtext: 'Tell us about your project and we’ll get right back to you.', buttonText: 'Send' },
  render: props => <ContactFormRender {...props} />,
}

// ── Footer ───────────────────────────────────────────────────────────────────
const Footer = {
  label: 'Footer',
  fields: {
    businessName: { type: 'text' },
    phone: { type: 'text' },
    email: { type: 'text' },
    address: { type: 'text' },
    note: { type: 'text' },
  },
  defaultProps: { businessName: 'Your Company', phone: '', email: '', address: '', note: '' },
  render: ({ businessName, phone, email, address, note }) => (
    <footer className="w-full px-6 py-10 bg-gray-900 text-gray-300">
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <p className="font-bold text-white">{businessName}</p>
          {address && <p className="text-sm text-gray-400">{address}</p>}
        </div>
        <div className="text-sm text-gray-400 space-y-0.5">
          {phone && <p>📞 {phone}</p>}
          {email && <p>✉️ {email}</p>}
        </div>
      </div>
      <p className="max-w-5xl mx-auto mt-6 text-xs text-gray-500">{note || `© ${new Date().getFullYear()} ${businessName}. All rights reserved.`}</p>
    </footer>
  ),
}

export const puckConfig = {
  components: { Hero, Services, Gallery, About, Testimonials, CTA, TextBlock, ContactForm, Footer },
  categories: {
    layout: { title: 'Sections', components: ['Hero', 'Services', 'Gallery', 'About', 'Testimonials', 'CTA', 'TextBlock'] },
    actions: { title: 'Lead capture', components: ['ContactForm'] },
    footer: { title: 'Footer', components: ['Footer'] },
  },
}

// A sensible starter page so a new site isn't blank.
export const STARTER_PAGE_DATA = {
  root: {},
  zones: {},
  content: [
    { type: 'Hero', props: { ...Hero.defaultProps, id: 'hero-1' } },
    { type: 'Services', props: { ...Services.defaultProps, id: 'services-1' } },
    { type: 'ContactForm', props: { ...ContactForm.defaultProps, id: 'contact-1' } },
    { type: 'Footer', props: { ...Footer.defaultProps, id: 'footer-1' } },
  ],
}

export const EMPTY_PAGE_DATA = { root: {}, zones: {}, content: [] }
