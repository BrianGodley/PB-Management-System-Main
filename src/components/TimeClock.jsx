import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useLang } from '../contexts/LanguageContext'

// ── Time helpers ─────────────────────────────────────────────
function fmt12h(t) {
  if (!t) return '—'
  const [h, m] = t.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ampm}`
}

function fmt24h(t) {
  if (!t) return ''
  return t.slice(0, 5)
}

function diffMins(timeIn, timeOut) {
  if (!timeIn || !timeOut) return null
  const [h1, m1] = timeIn.split(':').map(Number)
  const [h2, m2] = timeOut.split(':').map(Number)
  const diff = h2 * 60 + m2 - (h1 * 60 + m1)
  return diff > 0 ? diff : null
}

function fmtMins(mins) {
  if (mins == null) return '—'
  return `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`
}

function calcTimes(timeIn, timeOut) {
  const total = diffMins(timeIn, timeOut)
  if (total == null) return { total: null, regular: null, ot: null }
  const regular = Math.min(total, 480) // 8 hours = 480 minutes
  const ot = Math.max(0, total - 480)
  return { total, regular, ot }
}

function todayDate() {
  // Local calendar date — not UTC. Using toISOString() here would roll an
  // evening clock-in (past midnight UTC) onto the next day while the stored
  // time stays local, making entries show up as "tomorrow".
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function fmtDateLabel(d) {
  return new Date(d + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

const EMPTY_FORM = {
  employee_name: '',
  job_id: '',
  date: todayDate(),
  time_in: '',
  time_out: '',
  notes: '',
}

// Desktop time-clock table is paginated client-side.
const ENTRIES_PER_PAGE = 50

// Returns "Xh Ym" elapsed from a time_in string to a Date object
function calcElapsed(timeIn, now) {
  if (!timeIn) return ''
  const [h, m] = timeIn.split(':').map(Number)
  const start = new Date(now)
  start.setHours(h, m, 0, 0)
  const mins = Math.max(0, Math.floor((now - start) / 60000))
  const hh = Math.floor(mins / 60)
  const mm = mins % 60
  return hh > 0 ? `${hh}h ${mm}m` : `${mm}m`
}

// Compute week start/end dates given a start-day (0=Sun … 6=Sat)
function getWeekRange(startDay) {
  const today = new Date()
  const diff = (today.getDay() - startDay + 7) % 7
  const start = new Date(today)
  start.setDate(today.getDate() - diff)
  start.setHours(0, 0, 0, 0)
  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  return { weekStart: start, weekEnd: end }
}

function fmtWeekRange(start, end) {
  const fmt = d =>
    d.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: '2-digit' })
  return `${fmt(start)} – ${fmt(end)}`
}

function fmtHours(mins) {
  if (!mins) return '0h 0m'
  return `${Math.floor(mins / 60)}h ${mins % 60}m`
}

// ── GPS helpers ──────────────────────────────────────────────
// Clock events capture the employee's GPS at the moment of clock-in / out,
// compare it to the job's geocoded lat/lon (populated by the geocode-jobs
// edge function), and flag the entry as off-site when the distance exceeds
// ON_SITE_RADIUS_M. Off-site clock-ins are warned-but-allowed so a foreman
// with a flaky signal isn't blocked from working.
const ON_SITE_RADIUS_M = 402 // ~1/4 mile

// Haversine distance between two lat/lon pairs, in meters.
function distanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000
  const toRad = d => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(a))
}

// Format meters as a human-readable distance for confirm dialogs and badges.
function fmtDistance(m) {
  if (m == null) return ''
  const ft = m * 3.28084
  if (ft < 1000) return `${Math.round(ft)} ft`
  return `${(ft / 5280).toFixed(2)} mi`
}

// Of the known locations (jobsite + company addresses), which was the clock
// point closest to? Returns { name, meters } or null when we can't tell.
function closestLocation(lat, lon, candidates) {
  if (lat == null || lon == null) return null
  let best = null
  for (const c of candidates) {
    if (c.lat == null || c.lon == null) continue
    const m = distanceMeters(Number(lat), Number(lon), Number(c.lat), Number(c.lon))
    if (best == null || m < best.meters) best = { name: c.name, meters: m }
  }
  return best
}

// Lazy-load Leaflet from CDN once for the location map popup (no build dep).
let leafletPromise = null
function loadLeaflet() {
  if (typeof window !== 'undefined' && window.L) return Promise.resolve(window.L)
  if (leafletPromise) return leafletPromise
  leafletPromise = new Promise((resolve, reject) => {
    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link')
      link.id = 'leaflet-css'
      link.rel = 'stylesheet'
      link.href = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css'
      document.head.appendChild(link)
    }
    if (!document.getElementById('cl-pin-style')) {
      const st = document.createElement('style')
      st.id = 'cl-pin-style'
      st.textContent = '.leaflet-div-icon.cl-pin{background:transparent;border:none;}'
      document.head.appendChild(st)
    }
    const s = document.createElement('script')
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js'
    s.async = true
    s.onload = () => resolve(window.L)
    s.onerror = reject
    document.body.appendChild(s)
  })
  return leafletPromise
}

// Promise-wrapped navigator.geolocation with an 8s timeout. Resolves with
// { ok: true, lat, lon, accuracy } on success or { ok: false, reason } on
// denial / timeout / unsupported. Never rejects, so callers don't need
// try/catch.
function getCurrentPosition(timeoutMs = 8000) {
  return new Promise(resolve => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      resolve({ ok: false, reason: 'unsupported' })
      return
    }
    navigator.geolocation.getCurrentPosition(
      pos =>
        resolve({
          ok: true,
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        }),
      err => resolve({ ok: false, reason: err?.message || 'denied' }),
      { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 30000 }
    )
  })
}

// Fetch a job's cached lat/lon for distance comparison. Returns nulls if
// the job hasn't been geocoded yet (in which case we record GPS but skip
// the on-site comparison).
async function fetchJobLocation(jobId) {
  if (!jobId) return { lat: null, lon: null, address: null }
  const { data } = await supabase
    .from('jobs')
    .select('lat, lon, job_address')
    .eq('id', jobId)
    .maybeSingle()
  return {
    lat: data?.lat != null ? Number(data.lat) : null,
    lon: data?.lon != null ? Number(data.lon) : null,
    address: data?.job_address ?? null,
  }
}

/**
 * Capture GPS for a clock event and decide whether to proceed.
 *
 * Returns { proceed, gps }:
 *   proceed=false only when the user explicitly cancels the off-site
 *                 or no-GPS confirm dialog.
 *   gps        is the column payload to merge into the time_entries row.
 *
 * @param {string} jobId   the job being clocked in/out of
 * @param {'in'|'out'} label  used in the confirm dialog text
 */
async function captureGpsForClock(jobId, label) {
  const [pos, job] = await Promise.all([getCurrentPosition(), fetchJobLocation(jobId)])

  // No GPS — flag and ask whether to proceed.
  if (!pos.ok) {
    const ok = window.confirm(
      `Couldn't get your location. Clock ${label} anyway?\n\n` +
        `Entry will be flagged "no GPS" for supervisor review.`
    )
    if (!ok) return { proceed: false }
    return {
      proceed: true,
      gps: {
        lat: null,
        lon: null,
        accuracy_m: null,
        distance_m: null,
        on_site: null,
        no_gps: true,
        override: false,
      },
    }
  }

  // Got GPS but job has no coordinates yet (not geocoded) — record GPS,
  // skip the comparison.
  if (job.lat == null || job.lon == null) {
    return {
      proceed: true,
      gps: {
        lat: pos.lat,
        lon: pos.lon,
        accuracy_m: pos.accuracy,
        distance_m: null,
        on_site: null,
        no_gps: false,
        override: false,
      },
    }
  }

  // Both sides have coords — compute distance and decide.
  const dist = distanceMeters(pos.lat, pos.lon, job.lat, job.lon)
  const onSite = dist <= ON_SITE_RADIUS_M

  if (!onSite) {
    const ok = window.confirm(
      `You're ${fmtDistance(dist)} from the job site` +
        (job.address ? ` (${job.address})` : '') +
        `.\n\nClock ${label} anyway? The entry will be flagged "off-site".`
    )
    if (!ok) return { proceed: false }
    return {
      proceed: true,
      gps: {
        lat: pos.lat,
        lon: pos.lon,
        accuracy_m: pos.accuracy,
        distance_m: dist,
        on_site: false,
        no_gps: false,
        override: true,
      },
    }
  }

  return {
    proceed: true,
    gps: {
      lat: pos.lat,
      lon: pos.lon,
      accuracy_m: pos.accuracy,
      distance_m: dist,
      on_site: true,
      no_gps: false,
      override: false,
    },
  }
}

// Tiny inline badge for time_entries rows. Visually flags off-site
// clock-ins/outs and entries captured without GPS so supervisors can
// spot them at a glance.
function GpsBadge({ onSite, noGps, distanceM, override }) {
  if (noGps) {
    return (
      <span
        title="No GPS when clocking"
        className="ml-1.5 inline-flex items-center text-[9px] font-semibold uppercase tracking-wide text-gray-600 bg-gray-100 rounded px-1 py-0.5 align-middle"
      >
        no GPS
      </span>
    )
  }
  if (onSite === false) {
    const dist = fmtDistance(distanceM)
    return (
      <span
        title={`Off-site${override ? ' (override)' : ''}${dist ? ` · ${dist} from job` : ''}`}
        className="ml-1.5 inline-flex items-center text-[9px] font-semibold uppercase tracking-wide text-red-700 bg-red-100 rounded px-1 py-0.5 align-middle"
      >
        off-site{dist ? ` · ${dist}` : ''}
      </span>
    )
  }
  if (onSite === true) {
    return (
      <span
        title={`On site${distanceM != null ? ` · ${fmtDistance(distanceM)} from job` : ''}`}
        className="ml-1.5 inline-block w-1.5 h-1.5 rounded-full bg-green-500 align-middle"
      />
    )
  }
  // on_site === null and !no_gps → job not geocoded or pre-GPS entry; render nothing.
  return null
}

// Build a Google Maps URL for a captured clock event. When both the
// captured GPS and the job's geocoded location are present, we link to
// Maps' directions view so it's obvious how far apart the two are.
// When only the captured GPS is known, we drop a pin there. Returns null
// when there's nothing to show.
function buildMapHref({ lat, lon, jobLat, jobLon }) {
  if (lat == null || lon == null) return null
  if (jobLat != null && jobLon != null) {
    return `https://www.google.com/maps/dir/?api=1&origin=${lat},${lon}&destination=${jobLat},${jobLon}`
  }
  return `https://www.google.com/maps/?q=${lat},${lon}`
}

// One row of the dedicated GPS column — a labeled status pill plus a tiny
// pin icon that opens the captured location in Google Maps.
function GpsLine({ label, onSite, noGps, distanceM, lat, lon, jobLat, jobLon, onMap }) {
  let cls = 'text-gray-400 bg-gray-50'
  let text = ''
  if (noGps) {
    cls = 'text-gray-600 bg-gray-100'
    text = 'No GPS'
  } else if (onSite === false) {
    cls = 'text-red-700 bg-red-100'
    text = `Off-site${distanceM != null ? ' · ' + fmtDistance(distanceM) : ''}`
  } else if (onSite === true) {
    cls = 'text-green-700 bg-green-100'
    text = 'On site'
  } else if (lat != null && lon != null) {
    cls = 'text-gray-600 bg-gray-100'
    text = 'No job loc'
  }

  const hasLoc = lat != null && lon != null

  // No status and no location for this side → render nothing (leave it blank).
  if (!text && !hasLoc) return null

  return (
    <div className="flex items-center gap-1 text-[10px] whitespace-nowrap leading-tight">
      <span className="text-gray-400 font-semibold uppercase tracking-wide w-5 flex-shrink-0">
        {label}
      </span>
      {text && <span className={`px-1.5 py-0.5 rounded font-semibold ${cls}`}>{text}</span>}
      {hasLoc && (
        <button
          type="button"
          onClick={() => onMap && onMap({ lat, lon, label, jobLat, jobLon })}
          title="View location on map"
          className="text-gray-400 hover:text-blue-600 flex-shrink-0"
        >
          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 110-5 2.5 2.5 0 010 5z" />
          </svg>
        </button>
      )}
    </div>
  )
}

// Dedicated GPS cell — stacks the clock-in and (if present) clock-out
// GpsLines so supervisors can see at a glance whether each side was on/off
// site and jump to a map of where the employee was.
function GpsCell({ entry, jobLoc, onMap }) {
  const jobLat = jobLoc?.lat ?? null
  const jobLon = jobLoc?.lon ?? null
  return (
    <div className="flex flex-col gap-0.5">
      <GpsLine
        label="In"
        onSite={entry.clock_in_on_site}
        noGps={entry.clock_in_no_gps}
        distanceM={entry.clock_in_distance_m}
        lat={entry.clock_in_lat}
        lon={entry.clock_in_lon}
        jobLat={jobLat}
        jobLon={jobLon}
        onMap={onMap}
      />
      {entry.time_out && (
        <GpsLine
          label="Out"
          onSite={entry.clock_out_on_site}
          noGps={entry.clock_out_no_gps}
          distanceM={entry.clock_out_distance_m}
          lat={entry.clock_out_lat}
          lon={entry.clock_out_lon}
          jobLat={jobLat}
          jobLon={jobLon}
          onMap={onMap}
        />
      )}
    </div>
  )
}

// Proximity cell — for clock-in (and clock-out), which known location was the
// employee closest to: the Jobsite, Main Office, or Truck Yard, and how far.
function ProximityCell({ entry, jobLoc, companyLocs }) {
  const candidates = [
    { name: 'Jobsite', lat: jobLoc?.lat ?? null, lon: jobLoc?.lon ?? null },
    { name: 'Main Office', lat: companyLocs?.office?.lat ?? null, lon: companyLocs?.office?.lon ?? null },
    { name: 'Truck Yard', lat: companyLocs?.yard?.lat ?? null, lon: companyLocs?.yard?.lon ?? null },
  ]
  const inC = closestLocation(entry.clock_in_lat, entry.clock_in_lon, candidates)
  const outC = entry.time_out
    ? closestLocation(entry.clock_out_lat, entry.clock_out_lon, candidates)
    : null

  const Line = ({ label, c }) =>
    c ? (
      <div className="flex items-center gap-1 text-[10px] whitespace-nowrap leading-tight">
        <span className="text-gray-400 font-semibold uppercase tracking-wide w-5 flex-shrink-0">
          {label}
        </span>
        <span className="text-gray-700">
          <span className="font-semibold">{c.name}</span> · {fmtDistance(c.meters)}
        </span>
      </div>
    ) : null

  return (
    <div className="flex flex-col gap-0.5">
      <Line label="In" c={inC} />
      {entry.time_out && <Line label="Out" c={outC} />}
    </div>
  )
}

// Large popup: a Leaflet map with a pin at the captured clock location, the
// reverse-geocoded address, and whether it was the clock-in or clock-out.
function LocationMapModal({ lat, lon, label, jobLat, jobLon, onClose }) {
  const mapEl = useRef(null)
  const mapObj = useRef(null)
  const [addr, setAddr] = useState('')

  useEffect(() => {
    if (lat == null || lon == null) return
    let alive = true
    ;(async () => {
      try {
        const L = await loadLeaflet()
        if (!alive || !mapEl.current || mapObj.current) return
        const map = L.map(mapEl.current, { attributionControl: false }).setView([lat, lon], 16)
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map)
        const pin = L.divIcon({
          className: 'cl-pin',
          html: '<div style="font-size:46px;line-height:1;filter:drop-shadow(0 1px 2px rgba(0,0,0,.4))">📍</div>',
          iconSize: [46, 46],
          iconAnchor: [23, 44],
        })
        L.marker([lat, lon], { icon: pin }).addTo(map)
        if (jobLat != null && jobLon != null) {
          L.circleMarker([jobLat, jobLon], {
            radius: 7,
            color: '#2563eb',
            weight: 2,
            fillColor: '#3b82f6',
            fillOpacity: 0.6,
          })
            .addTo(map)
            .bindTooltip('Job site')
        }
        mapObj.current = map
        setTimeout(() => mapObj.current && mapObj.current.invalidateSize(), 250)
      } catch {
        /* map optional */
      }
      try {
        const r = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}`,
          { headers: { Accept: 'application/json' } }
        ).then(res => res.json())
        if (alive) setAddr(r.display_name || '')
      } catch {
        /* address optional */
      }
    })()
    return () => {
      alive = false
      if (mapObj.current) {
        mapObj.current.remove()
        mapObj.current = null
      }
    }
  }, [lat, lon, jobLat, jobLon])

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4"
      onClick={e => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92dvh] flex flex-col overflow-hidden">
        <div className="flex items-start justify-between px-5 py-3 border-b border-gray-100 gap-3">
          <div className="min-w-0">
            <h3 className="font-bold text-gray-900">
              Clock {label === 'Out' ? 'Out' : 'In'} Location
            </h3>
            <p className="text-xs text-gray-500 truncate">{addr || 'Looking up address…'}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 text-2xl leading-none flex-shrink-0"
          >
            ×
          </button>
        </div>
        <div className="relative" style={{ height: '62vh' }}>
          <div ref={mapEl} className="absolute inset-0 bg-gray-100" />
        </div>
      </div>
    </div>
  )
}

// ── Main Component ───────────────────────────────────────────

export default function TimeClock({ jobs = [], selectedJob, statusFilter = 'open' }) {
  const { user } = useAuth()
  const [entries, setEntries] = useState([])
  const [breakMins, setBreakMins] = useState({}) // entryId -> total break minutes
  const [myWeekBreakMins, setMyWeekBreakMins] = useState({}) // entryId -> break minutes (personal week)
  const [companyLocs, setCompanyLocs] = useState({ office: null, yard: null }) // office/yard coords
  const [mapModal, setMapModal] = useState(null) // { lat, lon, label, jobLat, jobLon } | null
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [editEntry, setEditEntry] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [profileName, setProfileName] = useState('')
  const [employeeId, setEmployeeId] = useState(null)
  const [nowTime, setNowTime] = useState(new Date())
  const [payrollWeekStart, setPayrollWeekStart] = useState(0) // 0=Sunday
  const [myWeekEntries, setMyWeekEntries] = useState([])
  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const reqId = useRef(0)

  const jobMap = Object.fromEntries(jobs.map(j => [j.id, j.name || j.client_name]))

  // Geocoded lat/lon for each job, used by the GPS column to draw Maps
  // directions from the employee's clock location to the job site.
  const jobLocMap = Object.fromEntries(
    jobs
      .filter(j => j.lat != null && j.lon != null)
      .map(j => [j.id, { lat: Number(j.lat), lon: Number(j.lon) }])
  )

  // Fetch current user's display name for clock-in. The employees table is the
  // most reliable source of a real name (first/last); the profiles row often
  // has those blank, which is why some entries used to record the email.
  useEffect(() => {
    if (!user?.id) return
    ;(async () => {
      const [{ data: prof }, { data: emp }] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
        supabase
          .from('employees')
          .select('id, first_name, last_name')
          .eq('user_id', user.id)
          .maybeSingle(),
      ])
      const empName = emp ? [emp.first_name, emp.last_name].filter(Boolean).join(' ').trim() : ''
      const profName =
        (prof &&
          ([prof.first_name, prof.last_name].filter(Boolean).join(' ') ||
            prof.full_name ||
            prof.display_name ||
            prof.name)) ||
        ''
      setProfileName(empName || profName || user.email || 'Unknown')
      setEmployeeId(emp?.id || null)
    })()
  }, [user?.id])

  // Company office + truck-yard coordinates for the Proximity column.
  useEffect(() => {
    supabase
      .from('company_settings')
      .select('main_office_lat, main_office_lon, truck_yard_lat, truck_yard_lon')
      .maybeSingle()
      .then(({ data }) => {
        if (!data) return
        setCompanyLocs({
          office:
            data.main_office_lat != null
              ? { lat: Number(data.main_office_lat), lon: Number(data.main_office_lon) }
              : null,
          yard:
            data.truck_yard_lat != null
              ? { lat: Number(data.truck_yard_lat), lon: Number(data.truck_yard_lon) }
              : null,
        })
      })
  }, [])

  // Load payroll week start from company_settings
  useEffect(() => {
    supabase
      .from('company_settings')
      .select('payroll_week_start')
      .maybeSingle()
      .then(({ data }) => {
        if (data?.payroll_week_start != null) setPayrollWeekStart(data.payroll_week_start)
      })
  }, [])

  // Fetch this user's time entries for the current payroll week (all jobs)
  useEffect(() => {
    if (!user?.id) return
    const { weekStart, weekEnd } = getWeekRange(payrollWeekStart)
    const start = weekStart.toISOString().split('T')[0]
    const end = weekEnd.toISOString().split('T')[0]
    supabase
      .from('time_entries')
      .select('*')
      .eq('created_by', user.id)
      .gte('date', start)
      .lte('date', end)
      .then(({ data }) => {
        if (data) setMyWeekEntries(data)
      })
  }, [user?.id, payrollWeekStart])

  // Live elapsed timer — updates every 30 s while clocked in
  useEffect(() => {
    const t = setInterval(() => setNowTime(new Date()), 30000)
    return () => clearInterval(t)
  }, [])

  // Fetch the current page from the server when the view or page changes.
  useEffect(() => {
    fetchEntries()
  }, [selectedJob, statusFilter, page])

  // Reset to the first page when the job selection or Open/Closed filter changes.
  useEffect(() => {
    setPage(1)
  }, [selectedJob, statusFilter])

  // Derive the current user's open (not yet clocked-out) entry for today.
  // Read from myWeekEntries (the user's full week) rather than the paged
  // `entries` list, so it's still found when the open shift isn't on the
  // current page.
  const myOpenEntry = myWeekEntries.find(e => !e.time_out && e.date === todayDate())
  const isClockedIn = !!myOpenEntry

  // Personal time stats for mobile UI
  const { weekStart, weekEnd } = getWeekRange(payrollWeekStart)
  const weekRangeLabel = fmtWeekRange(weekStart, weekEnd)

  const myTodayMins = myWeekEntries
    .filter(e => e.date === todayDate() && e.time_out)
    .reduce(
      (sum, e) =>
        sum + Math.max(0, (diffMins(e.time_in, e.time_out) || 0) - (myWeekBreakMins[e.id] || 0)),
      0
    )

  const myWeekMins = myWeekEntries
    .filter(e => e.time_out)
    .reduce(
      (sum, e) =>
        sum + Math.max(0, (diffMins(e.time_in, e.time_out) || 0) - (myWeekBreakMins[e.id] || 0)),
      0
    )

  async function fetchEntries() {
    const myReq = ++reqId.current
    setLoading(true)

    // Server-side pagination — fetch only the current 50-row page plus an
    // exact total count, so the view loads fast no matter how many entries
    // exist. The Open/Closed filter runs server-side via a jobs!inner embed.
    const from = (page - 1) * ENTRIES_PER_PAGE
    const to = from + ENTRIES_PER_PAGE - 1

    let q
    if (selectedJob === 'all') {
      q = supabase
        .from('time_entries')
        .select('*, jobs!inner(status)', { count: 'exact' })
      q =
        statusFilter === 'closed'
          ? q.not('jobs.status', 'in', '(active,on_hold)')
          : q.or('status.in.(active,on_hold),status.is.null', { foreignTable: 'jobs' })
    } else {
      q = supabase
        .from('time_entries')
        .select('*', { count: 'exact' })
        .eq('job_id', selectedJob)
    }

    const { data, count, error } = await q
      .order('date', { ascending: false })
      .order('time_in', { ascending: true })
      .order('id', { ascending: true })
      .range(from, to)

    // Drop results from a superseded fetch (filter or page changed mid-flight).
    if (myReq !== reqId.current) return
    if (error) console.error('fetchEntries:', error)
    if (!error) {
      setEntries(data || [])
      setTotalCount(count || 0)
      // Pull break minutes for the visible rows so worked time excludes breaks.
      const ids = (data || []).map(e => e.id)
      if (ids.length) {
        const { data: brk } = await supabase
          .from('time_clock_breaks')
          .select('time_entry_id, minutes')
          .in('time_entry_id', ids)
        const m = {}
        for (const b of brk || []) {
          m[b.time_entry_id] = (m[b.time_entry_id] || 0) + (b.minutes || 0)
        }
        setBreakMins(m)
      } else {
        setBreakMins({})
      }
    }
    setLoading(false)

    // Also refresh personal week totals
    if (user?.id) {
      const { weekStart: ws, weekEnd: we } = getWeekRange(payrollWeekStart)
      const { data: wd } = await supabase
        .from('time_entries')
        .select('*')
        .eq('created_by', user.id)
        .gte('date', ws.toISOString().split('T')[0])
        .lte('date', we.toISOString().split('T')[0])
      if (wd) {
        setMyWeekEntries(wd)
        const wids = wd.map(e => e.id)
        const m = {}
        if (wids.length) {
          const { data: brk } = await supabase
            .from('time_clock_breaks')
            .select('time_entry_id, minutes')
            .in('time_entry_id', wids)
          for (const b of brk || []) {
            m[b.time_entry_id] = (m[b.time_entry_id] || 0) + (b.minutes || 0)
          }
        }
        setMyWeekBreakMins(m)
      }
    }
  }

  function openNew() {
    setEditEntry(null)
    setForm({
      ...EMPTY_FORM,
      job_id: selectedJob !== 'all' ? selectedJob : '',
      date: todayDate(),
    })
    setError('')
    setShowModal(true)
  }

  function openEdit(entry) {
    setEditEntry(entry)
    setForm({
      employee_name: entry.employee_name || '',
      job_id: entry.job_id || '',
      date: entry.date || todayDate(),
      time_in: fmt24h(entry.time_in),
      time_out: fmt24h(entry.time_out || ''),
      notes: entry.notes || '',
    })
    setError('')
    setShowModal(true)
  }

  function closeModal() {
    setShowModal(false)
    setEditEntry(null)
  }

  async function saveEntry() {
    if (!form.employee_name.trim()) {
      setError('Employee name is required.')
      return
    }
    if (!form.time_in) {
      setError('Time In is required.')
      return
    }
    setSaving(true)
    setError('')

    const payload = {
      employee_name: form.employee_name.trim(),
      job_id: form.job_id || null,
      date: form.date,
      time_in: form.time_in,
      time_out: form.time_out || null,
      notes: form.notes.trim() || null,
      created_by: user?.id,
      updated_at: new Date().toISOString(),
    }

    const { error } = editEntry
      ? await supabase.from('time_entries').update(payload).eq('id', editEntry.id)
      : await supabase.from('time_entries').insert(payload)

    if (error) {
      console.error(error)
      setError('Failed to save. Please try again.')
      setSaving(false)
      return
    }
    setSaving(false)
    closeModal()
    fetchEntries()
  }

  async function deleteEntry(entry) {
    if (!confirm(`Delete time entry for ${entry.employee_name}?`)) return
    await supabase.from('time_entries').delete().eq('id', entry.id)
    fetchEntries()
  }

  async function clockOut(entry) {
    // Desktop-table inline Clock Out — captures GPS for the clock-out side.
    const { proceed, gps } = await captureGpsForClock(entry.job_id, 'out')
    if (!proceed) return
    const now = new Date()
    const timeOut = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
    await supabase
      .from('time_entries')
      .update({
        time_out: timeOut,
        updated_at: now.toISOString(),
        clock_out_lat:        gps.lat,
        clock_out_lon:        gps.lon,
        clock_out_accuracy_m: gps.accuracy_m,
        clock_out_distance_m: gps.distance_m,
        clock_out_on_site:    gps.on_site,
        clock_out_no_gps:     gps.no_gps,
        clock_out_override:   gps.override,
      })
      .eq('id', entry.id)
    fetchEntries()
  }

  // ── Personal clock-in / clock-out button handlers ─────────
  // jobId is required — mobile hero enforces selection before calling this
  async function handleClockIn(jobId) {
    const resolvedJobId = jobId || (selectedJob !== 'all' ? selectedJob : null)
    if (!resolvedJobId) return // safety guard — should never reach this on mobile
    const { proceed, gps } = await captureGpsForClock(resolvedJobId, 'in')
    if (!proceed) return
    const now = new Date()
    const timeIn = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
    await supabase.from('time_entries').insert({
      employee_name: profileName,
      employee_id: employeeId,
      job_id: resolvedJobId,
      date: todayDate(),
      time_in: timeIn,
      time_out: null,
      created_by: user?.id,
      updated_at: now.toISOString(),
      clock_in_lat:        gps.lat,
      clock_in_lon:        gps.lon,
      clock_in_accuracy_m: gps.accuracy_m,
      clock_in_distance_m: gps.distance_m,
      clock_in_on_site:    gps.on_site,
      clock_in_no_gps:     gps.no_gps,
      clock_in_override:   gps.override,
    })
    fetchEntries()
  }

  async function handleClockOut() {
    if (!myOpenEntry) return
    const { proceed, gps } = await captureGpsForClock(myOpenEntry.job_id, 'out')
    if (!proceed) return
    const now = new Date()
    const timeOut = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
    await supabase
      .from('time_entries')
      .update({
        time_out: timeOut,
        updated_at: now.toISOString(),
        clock_out_lat:        gps.lat,
        clock_out_lon:        gps.lon,
        clock_out_accuracy_m: gps.accuracy_m,
        clock_out_distance_m: gps.distance_m,
        clock_out_on_site:    gps.on_site,
        clock_out_no_gps:     gps.no_gps,
        clock_out_override:   gps.override,
      })
      .eq('id', myOpenEntry.id)
    fetchEntries()
  }

  // Server-side pagination — `entries` already holds just the current page.
  const totalPages = Math.max(1, Math.ceil(totalCount / ENTRIES_PER_PAGE))
  const safePage = Math.min(page, totalPages)
  const pageStart = (safePage - 1) * ENTRIES_PER_PAGE

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-shrink-0 gap-4 flex-wrap">
        {/* Left: title + entry count */}
        <h2 className="text-sm font-semibold text-gray-700 flex-shrink-0">
          Time Clock{' '}
          {totalCount > 0 && (
            <span className="text-gray-400 font-normal">({totalCount} entries)</span>
          )}
        </h2>

        {/* Right: clock-in/out button + manual add — desktop only (mobile uses the hero button) */}
        <div className="hidden lg:flex items-center gap-3 ml-auto mr-6">
          {/* Live status when clocked in */}
          {isClockedIn && myOpenEntry && (
            <div className="text-xs text-gray-500">
              In at{' '}
              <span className="font-semibold text-green-700">{fmt12h(myOpenEntry.time_in)}</span>
              <span className="mx-1.5 text-gray-300">·</span>
              <span className="font-mono text-gray-600">
                {calcElapsed(myOpenEntry.time_in, nowTime)}
              </span>
            </div>
          )}

          {/* The dynamic Clock In / Clock Out button. Clock-in needs a job:
              when "All Jobs" is selected the button is disabled (previously it
              silently no-opped). */}
          <button
            onClick={isClockedIn ? handleClockOut : () => handleClockIn(selectedJob)}
            disabled={!isClockedIn && selectedJob === 'all'}
            title={
              !isClockedIn && selectedJob === 'all' ? 'Pick a job before clocking in' : undefined
            }
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm transition-all bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <span
              className={`w-2 h-2 rounded-full bg-white ${isClockedIn ? 'animate-pulse' : ''}`}
            />
            {isClockedIn ? 'Clock Out' : 'Clock In'}
          </button>

          {/* Manual Shift button */}
          <button
            onClick={openNew}
            className="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1.5"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            Manual Shift
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-green-700" />
        </div>
      ) : totalCount === 0 ? (
        <>
          {/* Mobile hero shown even with no entries */}
          <MobileHero
            isClockedIn={isClockedIn}
            myOpenEntry={myOpenEntry}
            nowTime={nowTime}
            myTodayMins={myTodayMins}
            myWeekMins={myWeekMins}
            weekRangeLabel={weekRangeLabel}
            myWeekEntries={myWeekEntries}
            myWeekBreakMins={myWeekBreakMins}
            jobMap={jobMap}
            jobs={jobs}
            selectedJob={selectedJob}
            onClockIn={handleClockIn}
            onClockOut={handleClockOut}
            onManualShift={openNew}
            onEditEntry={openEdit}
          />
          <div className="hidden lg:flex flex-col items-center justify-center flex-1 text-gray-400 py-20">
            <p className="text-5xl mb-3">⏱️</p>
            <p className="text-sm font-medium text-gray-500">No time entries yet</p>
            <p className="text-xs mt-1 mb-4">Track employee hours by job</p>
            <button onClick={openNew} className="btn-primary text-sm px-4 py-2">
              Add First Entry
            </button>
          </div>
        </>
      ) : (
        <>
          {/* ── Desktop table — header frozen, body scrolls ───── */}
          <div className="hidden lg:block lg:flex-1 lg:min-h-0 overflow-auto rounded-xl border border-gray-200 shadow-sm">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10">
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide text-left">
                    Date
                  </th>
                  <th className="pl-4 pr-2 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide text-left">
                    Employee
                  </th>
                  <th className="pl-1 pr-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide text-left">
                    Job
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide text-left">
                    Time In
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide text-left">
                    Break
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide text-left">
                    Time Out
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide text-left">
                    OT
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide text-left">
                    Total
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide text-left w-44">
                    GPS
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide text-left w-40">
                    Proximity
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {entries.map(entry => {
                  const raw = calcTimes(entry.time_in, entry.time_out)
                  // Worked time excludes break minutes recorded for this entry.
                  const brk = breakMins[entry.id] || 0
                  const total = raw.total == null ? null : Math.max(0, raw.total - brk)
                  const ot = total == null ? null : Math.max(0, total - 480)
                  const isClockedIn = !entry.time_out
                  return (
                    <tr
                      key={entry.id}
                      className={`transition-colors group ${isClockedIn ? 'bg-green-50/40' : 'hover:bg-gray-50'}`}
                    >
                      {/* Date — always shown, clickable link to edit modal */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <button
                          onClick={() => openEdit(entry)}
                          className="text-blue-600 hover:text-blue-800 hover:underline font-medium text-xs text-left"
                        >
                          {fmtDateLabel(entry.date)}
                        </button>
                      </td>

                      {/* Employee */}
                      <td className="pl-4 pr-2 py-3 font-medium text-gray-800">
                        {entry.employee_name}
                        {isClockedIn && (
                          <span className="ml-2 text-[10px] font-semibold text-green-700 bg-green-100 px-1.5 py-0.5 rounded-full">
                            Active
                          </span>
                        )}
                      </td>

                      {/* Job */}
                      <td className="pl-1 pr-4 py-3 text-gray-500 max-w-[180px] truncate">
                        {jobMap[entry.job_id] || (
                          <span className="text-gray-300 italic text-xs">No job</span>
                        )}
                      </td>

                      {/* Time In */}
                      <td className="px-4 py-3 text-gray-700 font-mono text-sm">
                        {fmt12h(entry.time_in)}
                      </td>

                      {/* Break — total lunch + short-break minutes for this shift */}
                      <td className="px-4 py-3 text-left font-mono text-sm">
                        {brk > 0 ? <span className="text-gray-600">{fmtMins(brk)}</span> : ''}
                      </td>

                      {/* Time Out — or Clock Out link */}
                      <td className="px-4 py-3">
                        {isClockedIn ? (
                          <button
                            onClick={() => clockOut(entry)}
                            className="text-xs font-semibold text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100 border border-red-200 rounded-md px-2.5 py-1 transition-colors"
                          >
                            Clock Out
                          </button>
                        ) : (
                          <span className="text-gray-700 font-mono text-sm">
                            {fmt12h(entry.time_out)}
                          </span>
                        )}
                      </td>

                      {/* Overtime */}
                      <td className="px-4 py-3 text-left font-mono text-sm">
                        {!isClockedIn && ot > 0 ? (
                          <span className="text-orange-600 font-semibold">{fmtMins(ot)}</span>
                        ) : (
                          ''
                        )}
                      </td>

                      {/* Total */}
                      <td className="px-4 py-3 text-left font-mono font-semibold text-gray-800 text-sm">
                        {isClockedIn ? '' : fmtMins(total)}
                      </td>

                      {/* GPS — clock-in/out location status + map popup */}
                      <td className="px-4 py-3 align-middle">
                        <GpsCell
                          entry={entry}
                          jobLoc={jobLocMap[entry.job_id]}
                          onMap={setMapModal}
                        />
                      </td>

                      {/* Proximity — closest known location to the clock point */}
                      <td className="px-4 py-3 align-middle">
                        <ProximityCell
                          entry={entry}
                          jobLoc={jobLocMap[entry.job_id]}
                          companyLocs={companyLocs}
                        />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination — desktop table only; controls below the table,
              clear of the floating Ask Sam button at the bottom-right. */}
          {totalCount > ENTRIES_PER_PAGE && (
            <div className="hidden lg:flex items-center gap-3 mt-2 flex-shrink-0">
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage(Math.max(1, safePage - 1))}
                  disabled={safePage === 1}
                  className="px-2.5 py-1 text-xs rounded-md border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  ‹ Prev
                </button>
                <span className="text-xs text-gray-500 px-2">
                  Page {safePage} of {totalPages}
                </span>
                <button
                  onClick={() => setPage(Math.min(totalPages, safePage + 1))}
                  disabled={safePage === totalPages}
                  className="px-2.5 py-1 text-xs rounded-md border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Next ›
                </button>
              </div>
              <span className="text-xs text-gray-500">
                {pageStart + 1}–{pageStart + entries.length} of {totalCount}
              </span>
            </div>
          )}

          {/* ── Mobile UI ─────────────────────────────────────── */}
          <MobileHero
            isClockedIn={isClockedIn}
            myOpenEntry={myOpenEntry}
            nowTime={nowTime}
            myTodayMins={myTodayMins}
            myWeekMins={myWeekMins}
            weekRangeLabel={weekRangeLabel}
            myWeekEntries={myWeekEntries}
            myWeekBreakMins={myWeekBreakMins}
            jobMap={jobMap}
            jobs={jobs}
            selectedJob={selectedJob}
            onClockIn={handleClockIn}
            onClockOut={handleClockOut}
            onManualShift={openNew}
            onEditEntry={openEdit}
          />
        </>
      )}

      {/* Add / Edit Modal */}
      {showModal && (
        <TimeEntryModal
          form={form}
          setForm={setForm}
          isEdit={!!editEntry}
          jobs={jobs}
          onSave={saveEntry}
          onClose={closeModal}
          saving={saving}
          error={error}
          onDelete={
            editEntry
              ? () => {
                  deleteEntry(editEntry)
                  closeModal()
                }
              : null
          }
        />
      )}

      {mapModal && (
        <LocationMapModal
          lat={mapModal.lat}
          lon={mapModal.lon}
          label={mapModal.label}
          jobLat={mapModal.jobLat}
          jobLon={mapModal.jobLon}
          onClose={() => setMapModal(null)}
        />
      )}
    </div>
  )
}

// ── Mobile Hero — big clock button + stats ───────────────────
function MobileHero({
  isClockedIn,
  myOpenEntry,
  nowTime,
  myTodayMins,
  myWeekMins,
  weekRangeLabel,
  myWeekEntries,
  myWeekBreakMins = {},
  jobMap,
  selectedJob,
  onClockIn,
  onClockOut,
  onManualShift,
  onEditEntry,
}) {
  const { t } = useLang()
  const noJobPicked = !selectedJob || selectedJob === 'all'
  const clockedInJobName = myOpenEntry?.job_id ? jobMap[myOpenEntry.job_id] : null

  return (
    <div className="lg:hidden flex flex-col gap-4">
      {/* Big clock button */}
      <button
        onClick={
          isClockedIn
            ? onClockOut
            : () => {
                if (!noJobPicked) onClockIn(selectedJob)
              }
        }
        disabled={!isClockedIn && noJobPicked}
        className={`w-full py-10 rounded-2xl text-2xl font-black shadow-lg flex flex-col items-center gap-2 transition-all select-none ${
          isClockedIn
            ? 'bg-red-600 text-white active:scale-95'
            : noJobPicked
              ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
              : 'bg-green-700 text-white active:scale-95'
        }`}
      >
        <span
          className={`w-4 h-4 rounded-full ${isClockedIn ? 'bg-white/70 animate-pulse' : noJobPicked ? 'bg-gray-300' : 'bg-white/70'}`}
        />
        {isClockedIn ? t('clockOut') : t('clockIn')}
        {isClockedIn && myOpenEntry && (
          <span className="text-sm font-normal text-white/80 mt-1 text-center px-4">
            {clockedInJobName && (
              <span className="block font-semibold text-white">{clockedInJobName}</span>
            )}
            {t('inAt')} {fmt12h(myOpenEntry.time_in)} · {calcElapsed(myOpenEntry.time_in, nowTime)}{' '}
            {t('elapsed')}
          </span>
        )}
      </button>

      {/* Stats: Today + This Week */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white border border-gray-200 rounded-2xl p-4 text-center shadow-sm">
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1">
            {t('today')}
          </p>
          <p className="text-3xl font-black text-gray-900">{fmtHours(myTodayMins)}</p>
          <p className="text-[10px] text-gray-400 mt-1">
            {new Date().toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'short',
              day: 'numeric',
            })}
          </p>
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl p-4 text-center shadow-sm">
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1">
            {t('thisWeek')}
          </p>
          <p
            className={`text-3xl font-black ${myWeekMins >= 2400 ? 'text-orange-600' : 'text-gray-900'}`}
          >
            {fmtHours(myWeekMins)}
          </p>
          <p className="text-[10px] text-gray-400 mt-1">{weekRangeLabel}</p>
        </div>
      </div>

      {/* Recent shifts this week */}
      {myWeekEntries.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 px-1">
            {t('myShiftsThisWeek')}
          </p>
          <div className="space-y-2">
            {[...myWeekEntries]
              .sort(
                (a, b) =>
                  b.date.localeCompare(a.date) || (b.time_in || '').localeCompare(a.time_in || '')
              )
              .slice(0, 7)
              .map(entry => {
                const raw = calcTimes(entry.time_in, entry.time_out)
                const brk = myWeekBreakMins[entry.id] || 0
                const total = raw.total == null ? null : Math.max(0, raw.total - brk)
                const ot = total == null ? null : Math.max(0, total - 480)
                return (
                  <button
                    key={entry.id}
                    onClick={() => onEditEntry(entry)}
                    className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 shadow-sm flex items-center gap-3 text-left active:bg-gray-50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      {/* Date — styled as hyperlink, whole card is tappable */}
                      <p className="text-xs font-semibold text-blue-600 underline underline-offset-2">
                        {fmtDateLabel(entry.date)}
                      </p>
                      {entry.job_id && (
                        <p className="text-xs text-green-700 truncate mt-0.5">
                          {jobMap[entry.job_id]}
                        </p>
                      )}
                      <p className="text-sm text-gray-600 mt-0.5">
                        {fmt12h(entry.time_in)}
                        <GpsBadge
                          onSite={entry.clock_in_on_site}
                          noGps={entry.clock_in_no_gps}
                          distanceM={entry.clock_in_distance_m}
                          override={entry.clock_in_override}
                        />
                        {' – '}
                        {entry.time_out ? (
                          <>
                            {fmt12h(entry.time_out)}
                            <GpsBadge
                              onSite={entry.clock_out_on_site}
                              noGps={entry.clock_out_no_gps}
                              distanceM={entry.clock_out_distance_m}
                              override={entry.clock_out_override}
                            />
                          </>
                        ) : (
                          <span className="text-green-700 font-semibold">Active</span>
                        )}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      {total != null ? (
                        <>
                          <p className="text-base font-bold text-gray-900">{fmtMins(total)}</p>
                          {ot > 0 && (
                            <p className="text-[10px] text-orange-600 font-semibold">
                              OT {fmtMins(ot)}
                            </p>
                          )}
                        </>
                      ) : (
                        <span className="text-xs text-green-700 font-semibold">
                          {t('inProgress')}
                        </span>
                      )}
                      {/* Chevron hint */}
                      <p className="text-gray-300 text-xs mt-1">›</p>
                    </div>
                  </button>
                )
              })}
          </div>
        </div>
      )}

      {/* Manual Shift shortcut */}
      <button
        onClick={onManualShift}
        className="w-full py-3 rounded-xl border-2 border-dashed border-gray-300 text-sm font-medium text-gray-500 hover:border-green-400 hover:text-green-700 transition-colors"
      >
        {t('manualShift')}
      </button>
    </div>
  )
}

// ── Add / Edit Modal ─────────────────────────────────────────
function TimeEntryModal({ form, setForm, isEdit, jobs, onSave, onClose, saving, error, onDelete }) {
  const { total, regular, ot } = calcTimes(form.time_in, form.time_out)

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50"
      onMouseDown={e => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-[440px] flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
          <h2 className="text-base font-bold text-gray-900">
            {isEdit ? 'Shift Details' : 'Add Time Entry'}
          </h2>
          <button onClick={onClose} className="text-gray-300 hover:text-gray-500 p-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
          {/* Employee name */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Employee Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={form.employee_name}
              onChange={e => setForm(f => ({ ...f, employee_name: e.target.value }))}
              placeholder="e.g. Hugo Guzman"
              className="input text-sm w-full"
              autoFocus
            />
          </div>

          {/* Job */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Job</label>
            <select
              value={form.job_id}
              onChange={e => setForm(f => ({ ...f, job_id: e.target.value }))}
              className="input text-sm w-full"
            >
              <option value="">— No job assigned —</option>
              {jobs.map(j => (
                <option key={j.id} value={j.id}>
                  {j.name || j.client_name}
                </option>
              ))}
            </select>
          </div>

          {/* Date */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Date <span className="text-red-400">*</span>
            </label>
            <input
              type="date"
              value={form.date}
              onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
              className="input text-sm w-full"
            />
          </div>

          {/* Time In / Time Out */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Time In <span className="text-red-400">*</span>
              </label>
              <input
                type="time"
                value={form.time_in}
                onChange={e => setForm(f => ({ ...f, time_in: e.target.value }))}
                className="input text-sm w-full"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Time Out</label>
              <input
                type="time"
                value={form.time_out}
                onChange={e => setForm(f => ({ ...f, time_out: e.target.value }))}
                className="input text-sm w-full"
              />
            </div>
          </div>

          {/* Live preview of computed times */}
          {total != null && (
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-0.5">Regular</p>
                <p className="text-sm font-mono font-bold text-gray-800">{fmtMins(regular)}</p>
              </div>
              <div>
                <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-0.5">OT</p>
                <p
                  className={`text-sm font-mono font-bold ${ot > 0 ? 'text-orange-600' : 'text-gray-300'}`}
                >
                  {fmtMins(ot)}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-0.5">Total</p>
                <p className="text-sm font-mono font-bold text-gray-800">{fmtMins(total)}</p>
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
            <textarea
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="Optional…"
              rows={2}
              className="input text-sm w-full resize-none"
            />
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>

        {/* Footer — always visible */}
        <div className="px-5 py-4 flex gap-2 flex-shrink-0 border-t border-gray-100">
          <button
            onClick={onSave}
            disabled={saving}
            className="flex-1 btn-primary text-sm py-3 disabled:opacity-50"
          >
            {saving ? 'Saving…' : isEdit ? 'Update Entry' : 'Save Entry'}
          </button>
          <button
            onClick={onClose}
            className="px-5 py-3 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
          >
            Cancel
          </button>
          {onDelete && (
            <button
              onClick={onDelete}
              className="px-3 py-3 text-sm rounded-lg border border-red-100 text-red-400 hover:bg-red-50 hover:text-red-600"
            >
              Delete
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
