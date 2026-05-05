import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { LanguageProvider } from './contexts/LanguageContext'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Clients from './pages/Clients'
import ClientDetail from './pages/ClientDetail'
import Contacts from './pages/Contacts'
import ContactDetail from './pages/ContactDetail'
import NewJob from './pages/NewJob'
import JobDetail from './pages/JobDetail'
import JobsList from './pages/JobsList'
import Info from './pages/Info'
import Design from './pages/Design'
import DesignDetail from './pages/DesignDetail'
import Bids from './pages/Bids'
import JobTracker from './pages/JobTracker'
import Collections from './pages/Collections'
import Settings from './pages/Settings'
import Admin from './pages/Admin'
import EstimateDetail from './pages/EstimateDetail'
import MasterRates from './pages/MasterRates'
import MasterCrews from './pages/MasterCrews'
import Statistics from './pages/Statistics'
import Profile from './pages/Profile'
import SubsVendors from './pages/SubsVendors'
import LMS from './pages/LMS'
import HR from './pages/HR'
import EmployeeDetail from './pages/EmployeeDetail'
import ApplicantDetail from './pages/ApplicantDetail'
import ApplyForm from './pages/ApplyForm'
import Accounting from './pages/Accounting'
import TimeClockPage from './pages/TimeClockPage'
import DailyLogsPage from './pages/DailyLogsPage'
import MasterEquipment from './pages/MasterEquipment'
import EquipmentTracking from './pages/EquipmentTracking'
import OrgChart from './pages/OrgChart'

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
  if (loading) return (
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
    <Routes>
      {/* Public routes — no auth required */}
      <Route path="/apply" element={<ApplyForm />} />
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/" element={
        <ProtectedRoute>
          <Layout />
        </ProtectedRoute>
      }>
        <Route index element={<Contacts />} />
        <Route path="contacts" element={<Contacts />} />
        <Route path="contacts/:id" element={<ContactDetail />} />
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
        <Route path="portal/internal" element={<PortalPlaceholder label="Internal Users" icon="👥" />} />
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
      </Route>
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <LanguageProvider>
          <AppRoutes />
        </LanguageProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
