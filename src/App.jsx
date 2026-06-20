import { lazy as reactLazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { LanguageProvider } from './contexts/LanguageContext'
import { RateIconsProvider } from './contexts/RateIconsContext'
import Layout from './components/Layout'
import ErrorBoundary from './components/ErrorBoundary'
import EntitlementsGate from './platform/EntitlementsGate'
import Login from './pages/Login'

// Wrap React.lazy so a failed/stale chunk import does a single auto-reload
// instead of crashing the route. After a new deploy the old hashed chunk file
// no longer exists; on Vercel the request falls back to index.html, so the
// dynamic import resolves to a module with no `default` export → the classic
// "Cannot read properties of undefined (reading 'default')" crash. Reloading
// once pulls the fresh build. A 10s guard prevents an infinite reload loop if
// the failure is a genuine error rather than a stale chunk.
function lazy(factory) {
  return reactLazy(async () => {
    const KEY = 'softcake:chunkReloadAt'
    try {
      const mod = await factory()
      if (!mod || !mod.default) throw new Error('stale-chunk: missing default export')
      sessionStorage.removeItem(KEY)
      return mod
    } catch (err) {
      const last = Number(sessionStorage.getItem(KEY) || 0)
      if (Date.now() - last > 10000) {
        sessionStorage.setItem(KEY, String(Date.now()))
        window.location.reload()
        return { default: () => null }
      }
      throw err
    }
  })
}

const Dashboard = lazy(() => import('./pages/Dashboard'))
const Clients = lazy(() => import('./pages/Clients'))
const ClientDetail = lazy(() => import('./pages/ClientDetail'))
const Contacts = lazy(() => import('./pages/Contacts'))
const ContactDetail = lazy(() => import('./pages/ContactDetail'))
const CompanyDetail = lazy(() => import('./pages/CompanyDetail'))
const NewJob = lazy(() => import('./pages/NewJob'))
const JobDetail = lazy(() => import('./pages/JobDetail'))
const JobsList = lazy(() => import('./pages/JobsList'))
const Info = lazy(() => import('./pages/Info'))
const Design = lazy(() => import('./pages/Design'))
const DesignDetail = lazy(() => import('./pages/DesignDetail'))
const Bids = lazy(() => import('./pages/Bids'))
const JobTracker = lazy(() => import('./pages/JobTracker'))
const Collections = lazy(() => import('./pages/Collections'))
const Settings = lazy(() => import('./pages/Settings'))
const Admin = lazy(() => import('./pages/Admin'))
const EstimateDetail = lazy(() => import('./pages/EstimateDetail'))
const EDocuments = lazy(() => import('./pages/EDocuments'))
const Workflows = lazy(() => import('./pages/Workflows'))
const Customize = lazy(() => import('./pages/Customize'))
const SignDocument = lazy(() => import('./pages/SignDocument'))
const Signup = lazy(() => import('./pages/Signup'))
const MasterRates = lazy(() => import('./pages/MasterRates'))
const MasterCrews = lazy(() => import('./pages/MasterCrews'))
const Statistics = lazy(() => import('./pages/Statistics'))
const Profile = lazy(() => import('./pages/Profile'))
const SubsVendors = lazy(() => import('./pages/SubsVendors'))
const LMS = lazy(() => import('./pages/LMS'))
const HR = lazy(() => import('./pages/HR'))
const EmployeeDetail = lazy(() => import('./pages/EmployeeDetail'))
const ApplicantDetail = lazy(() => import('./pages/ApplicantDetail'))
const ApplyForm = lazy(() => import('./pages/ApplyForm'))
const ResetPassword = lazy(() => import('./pages/ResetPassword'))
const Accounting = lazy(() => import('./pages/Accounting'))
const TimeClockPage = lazy(() => import('./pages/TimeClockPage'))
const DailyLogsPage = lazy(() => import('./pages/DailyLogsPage'))
const MasterEquipment = lazy(() => import('./pages/MasterEquipment'))
const EquipmentTracking = lazy(() => import('./pages/EquipmentTracking'))
const OrgChart   = lazy(() => import('./pages/OrgChart'))    // legacy free-drag
const OrgChartV2 = lazy(() => import('./pages/OrgChartV2'))   // tier-snap layout
const Help = lazy(() => import('./pages/Help'))
const Documentation = lazy(() => import('./pages/Documentation'))
const VideoGuides = lazy(() => import('./pages/VideoGuides'))
const PortalLogin = lazy(() => import('./portal/PortalLogin'))
const PortalActivate = lazy(() => import('./portal/PortalActivate'))
const PortalShell = lazy(() => import('./portal/PortalShell'))
const MarketingLanding = lazy(() => import('./marketing/MarketingLanding'))
const PublicSite = lazy(() => import('./pages/PublicSite'))

function PortalPlaceholder({ label, icon }) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-gray-400 py-20">
      <p className="text-5xl mb-3">{icon}</p>
      <p className="text-lg font-semibold text-gray-600">{label} Portal</p>
      <p className="text-sm mt-1 text-gray-400">Coming soon</p>
    </div>
  )
}

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-700 mx-auto mb-4"></div>
          <p className="text-gray-500">Loading...</p>
        </div>
      </div>
    )
  if (!user) return <Navigate to="/login" replace />

  // On mobile, a fresh app launch should land on Dashboard. iOS standalone
  // PWAs / browser tabs otherwise restore whatever page the user was last on.
  // Decide this synchronously — before the restored page renders — so the
  // previous page never flashes on screen. Runs once per session
  // (sessionStorage survives in-session reloads, so manual reloads stay put,
  // but clears on a real cold start / app kill).
  if (!sessionStorage.getItem('softcake:launchHandled')) {
    sessionStorage.setItem('softcake:launchHandled', '1')
    const isMobile = window.matchMedia('(max-width: 1023px)').matches
    if (isMobile && window.location.pathname !== '/') {
      return <Navigate to="/" replace />
    }
  }

  return children
}

// Root "/" gate: logged-out visitors see the public marketing site; logged-in
// users get the protected app shell (with its mobile-launch redirect). The
// marketing site is the public face of the apex domain (picturebuild.com); the
// app lives at the same build under pbs.picturebuild.com.
function RootGate() {
  const { user, loading } = useAuth()
  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-700 mx-auto mb-4"></div>
          <p className="text-gray-500">Loading…</p>
        </div>
      </div>
    )
  if (!user) return <MarketingLanding />
  return (
    <ProtectedRoute>
      <EntitlementsGate>
        <Layout />
      </EntitlementsGate>
    </ProtectedRoute>
  )
}

function AppRoutes() {
  const { user } = useAuth()
  return (
    <ErrorBoundary>
      <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-700 mx-auto mb-4"></div>
            <p className="text-gray-500">Loading…</p>
          </div>
        </div>
      }
    >
      <Routes>
        {/* Public routes — no auth required */}
        <Route path="/apply" element={<ApplyForm />} />
        <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
        <Route path="/signup" element={user ? <Navigate to="/" replace /> : <Signup />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        {/* Marketing landing, reachable by anyone (logged-in users get a "Go to app" link) */}
        <Route path="/welcome" element={<MarketingLanding />} />
        <Route path="/sign/:token" element={<SignDocument />} />
        {/* Public tenant marketing sites built in the Website Builder */}
        <Route path="/s/:slug" element={<PublicSite />} />
        <Route path="/s/:slug/:pageSlug" element={<PublicSite />} />
        <Route path="/client-portal/login" element={<PortalLogin />} />
        <Route path="/client-portal/activate" element={<PortalActivate />} />
        <Route path="/client-portal" element={<PortalShell />} />
        {/* Aliases so older invite emails (sent before the path change) still resolve */}
        <Route path="/portal/activate" element={<PortalActivate />} />
        <Route path="/portal/login" element={<PortalLogin />} />
        <Route path="/" element={<RootGate />}>
          <Route index element={<Dashboard />} />
          <Route path="contacts" element={<Contacts />} />
          <Route path="contacts/:id" element={<ContactDetail />} />
          <Route path="companies/:id" element={<CompanyDetail />} />
          <Route path="clients" element={<Clients />} />
          <Route path="clients/:id" element={<ClientDetail />} />
          <Route path="design" element={<Design />} />
          <Route path="design/:id" element={<DesignDetail />} />
          <Route path="jobs" element={<JobsList />} />
          <Route path="info" element={<Info />} />
          <Route path="jobs/new" element={<NewJob />} />
          <Route path="jobs/:id" element={<JobDetail />} />
          <Route path="jobs/:id/tracker" element={<JobTracker />} />
          <Route path="estimates/:id" element={<EstimateDetail />} />
          <Route path="bids" element={<Bids />} />
          <Route path="edocuments" element={<EDocuments />} />
          <Route path="workflows" element={<Workflows />} />
          <Route path="customize" element={<Customize />} />
          <Route path="tracker" element={<JobTracker />} />
          <Route path="collections" element={<Collections />} />
          <Route path="settings" element={<Settings />} />
          <Route path="admin" element={<Admin />} />
          <Route path="master-rates" element={<MasterRates />} />
          <Route path="master-crews" element={<MasterCrews />} />
          <Route path="statistics" element={<Statistics />} />
          <Route path="profile" element={<Profile />} />
          <Route
            path="portal/internal"
            element={<PortalPlaceholder label="Internal Users" icon="👥" />}
          />
          <Route path="portal/subs" element={<SubsVendors />} />
          <Route path="training" element={<LMS />} />
          <Route path="hr" element={<HR />} />
          <Route path="hr/employee/:id" element={<EmployeeDetail />} />
          <Route path="hr/applicant/:id" element={<ApplicantDetail />} />
          <Route path="accounting" element={<Accounting />} />
          <Route path="timeclock" element={<TimeClockPage />} />
          <Route path="daily-logs" element={<DailyLogsPage />} />
          <Route path="master-equipment" element={<MasterEquipment />} />
          <Route path="equipment-tracking" element={<EquipmentTracking />} />
          <Route path="org-chart" element={<OrgChartV2 />} />
          <Route path="org-chart-legacy" element={<OrgChart />} />
          <Route path="help" element={<Help />} />
          <Route path="documentation" element={<Documentation />} />
          <Route path="video-guides" element={<VideoGuides />} />
        </Route>
      </Routes>
      </Suspense>
    </ErrorBoundary>
  )
}

export default function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <LanguageProvider>
          <RateIconsProvider>
            <AppRoutes />
          </RateIconsProvider>
        </LanguageProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
