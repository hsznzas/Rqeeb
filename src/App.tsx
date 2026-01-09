import { BrowserRouter, Routes, Route } from 'react-router-dom'

// React Router v7 future flags to silence deprecation warnings
const routerFutureConfig = {
  v7_startTransition: true,
  v7_relativeSplatPath: true,
}
import { AnimatePresence } from 'framer-motion'
import { AuthProvider, DataProvider } from '@/context'
import { ProtectedRoute, PublicRoute } from '@/components/auth'
import { Header } from '@/components/layout'
import { 
  HomePage, 
  AnalyticsPage, 
  SettingsPage, 
  LandingPage,
  AccountsPage,
  SubscriptionsPage 
} from '@/pages'

// Dashboard layout with header (for pages that need navigation)
function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-[100dvh] bg-slate-950">
      <Header />
      {children}
    </div>
  )
}

function AppRoutes() {
  return (
    <AnimatePresence mode="wait">
      <Routes>
        {/* Public Routes */}
        <Route
          path="/login"
          element={
            <PublicRoute>
              <LandingPage />
            </PublicRoute>
          }
        />

        {/* Protected Routes */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <HomePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/accounts"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <AccountsPage />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/subscriptions"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <SubscriptionsPage />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/analytics"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <AnalyticsPage />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <SettingsPage />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        {/* Fallback */}
        <Route path="*" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
      </Routes>
    </AnimatePresence>
  )
}

function App() {
  return (
    <BrowserRouter future={routerFutureConfig}>
      <AuthProvider>
        <DataProvider>
          <AppRoutes />
        </DataProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
