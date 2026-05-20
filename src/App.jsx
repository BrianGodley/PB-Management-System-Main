import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { LanguageProvider } from './contexts/LanguageContext'
import { RateIconsProvider } from './contexts/RateIconsContext'
import Layout from './components/Layout'
import Login from './pages/Login'
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
const OrgChart = lazy(() => import('./pages/OrgChart'))
const Help = lazy(() => import('./pages/Help'))
const PortalLogin = lazy(() => import('./portal/PortalLogin'))
const PortalActivate = lazy(() => import('./portal/PortalActivate'))
const PortalShell = lazy(() => import('./portal/PortalShell'))

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
  return children
}

function AppRoutes() {
  const { user } = useAuth()
  return (
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
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/client-portal/login" element={<PortalLogin />} />
        <Route path="/client-portal/activate" element={<PortalActivate />} />
        <Route path="/client-portal" element={<PortalShell />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Contacts />} />
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
          <Route path="org-chart" element={<OrgChart />} />
          <Route path="help" element={<Help />} />
        </Route>
      </Routes>
    </Suspense>
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
