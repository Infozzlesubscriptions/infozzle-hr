import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { LoaderCircle } from 'lucide-react'
import { useAuth } from './lib/auth'
import { isAdminRole, type Role } from './lib/types'
import { AppShell } from './components/AppShell'
import { LoginPage } from './pages/LoginPage'
import { DashboardPage } from './pages/DashboardPage'
import { EmployeesPage } from './pages/EmployeesPage'
import { LeavePage, WfhPage } from './pages/RequestsPages'
import { CalendarPage } from './pages/CalendarPage'
import { OnboardingPage } from './pages/OnboardingPage'
import { ReportsPage } from './pages/ReportsPage'
import { NotificationsPage } from './pages/NotificationsPage'
import { AuditLogsPage } from './pages/AuditLogsPage'
import { SettingsPage } from './pages/SettingsPage'
import { CompoffPage } from './pages/CompoffPage'

function ProtectedRoute() {
  const { user, initializing } = useAuth()
  const location = useLocation()
  if (initializing) return <div className="grid min-h-screen place-items-center bg-paper"><div className="text-center"><LoaderCircle className="mx-auto size-8 animate-spin text-forest" /><p className="mt-3 text-sm text-black/45">Opening your workspace...</p></div></div>
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  return <AppShell />
}

function RoleRoute({ roles, children }: { roles: Role[]; children: React.ReactNode }) {
  const { user } = useAuth()
  return user && roles.includes(user.role) ? children : <Navigate to="/leave" replace />
}

function HomeRoute() {
  const { user } = useAuth()
  return isAdminRole(user?.role) ? <DashboardPage /> : <Navigate to="/leave" replace />
}

export default function App() {
  return <Routes>
    <Route path="/login" element={<LoginPage />} />
    <Route element={<ProtectedRoute />}>
      <Route index element={<HomeRoute />} />
      <Route path="employees" element={<RoleRoute roles={['ADMIN', 'HR', 'MD']}><EmployeesPage /></RoleRoute>} />
      <Route path="leave" element={<LeavePage />} />
      <Route path="wfh" element={<WfhPage />} />
      <Route path="compoff" element={<CompoffPage />} />
      <Route path="calendar" element={<RoleRoute roles={['ADMIN', 'HR', 'MD']}><CalendarPage /></RoleRoute>} />
      <Route path="onboarding" element={<RoleRoute roles={['ADMIN', 'HR', 'MD']}><OnboardingPage /></RoleRoute>} />
      <Route path="reports" element={<RoleRoute roles={['ADMIN', 'HR', 'MD']}><ReportsPage /></RoleRoute>} />
      <Route path="notifications" element={<RoleRoute roles={['ADMIN', 'HR', 'MD']}><NotificationsPage /></RoleRoute>} />
      <Route path="audit-logs" element={<RoleRoute roles={['ADMIN', 'HR', 'MD']}><AuditLogsPage /></RoleRoute>} />
      <Route path="settings" element={<RoleRoute roles={['ADMIN', 'HR', 'MD']}><SettingsPage /></RoleRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Route>
  </Routes>
}
