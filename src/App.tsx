import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { LoaderCircle } from 'lucide-react'
import { useAuth } from './lib/auth'
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

function ProtectedRoute() {
  const { user, initializing } = useAuth()
  const location = useLocation()
  if (initializing) return <div className="grid min-h-screen place-items-center bg-paper"><div className="text-center"><LoaderCircle className="mx-auto size-8 animate-spin text-forest" /><p className="mt-3 text-sm text-black/45">Opening your workspace...</p></div></div>
  if (!user || !['MD', 'HR'].includes(user.role)) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  return <AppShell />
}

export default function App() {
  return <Routes>
    <Route path="/login" element={<LoginPage />} />
    <Route element={<ProtectedRoute />}>
      <Route index element={<DashboardPage />} />
      <Route path="employees" element={<EmployeesPage />} />
      <Route path="leave" element={<LeavePage />} />
      <Route path="wfh" element={<WfhPage />} />
      <Route path="calendar" element={<CalendarPage />} />
      <Route path="onboarding" element={<OnboardingPage />} />
      <Route path="reports" element={<ReportsPage />} />
      <Route path="notifications" element={<NotificationsPage />} />
      <Route path="audit-logs" element={<AuditLogsPage />} />
      <Route path="settings" element={<SettingsPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Route>
  </Routes>
}
