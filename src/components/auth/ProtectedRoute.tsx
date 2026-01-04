import { Navigate, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '@/context'

interface ProtectedRouteProps {
  children: React.ReactNode
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useAuth()
  const location = useLocation()

  // Show loading spinner while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-4"
        >
          {/* Animated Logo */}
          <motion.div
            animate={{ 
              rotate: [0, 360],
              scale: [1, 1.1, 1],
            }}
            transition={{ 
              rotate: { duration: 2, repeat: Infinity, ease: 'linear' },
              scale: { duration: 1, repeat: Infinity, ease: 'easeInOut' },
            }}
            className="p-4 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-amber-500/20 border border-white/10"
          >
            <svg width="40" height="40" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M16 8L20 12L16 16L20 20L16 24" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M12 12L8 16L12 20" stroke="#f43f5e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </motion.div>
          <p className="text-slate-400 text-sm">Loading...</p>
        </motion.div>
      </div>
    )
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return <>{children}</>
}

// Public route - redirects to dashboard if already authenticated
interface PublicRouteProps {
  children: React.ReactNode
}

export function PublicRoute({ children }: PublicRouteProps) {
  const { isAuthenticated, isLoading } = useAuth()
  const location = useLocation()

  // Show loading spinner while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            className="p-4 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-amber-500/20 border border-white/10"
          >
            <svg width="40" height="40" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M16 8L20 12L16 16L20 20L16 24" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M12 12L8 16L12 20" stroke="#f43f5e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </motion.div>
          <p className="text-slate-400 text-sm">Loading...</p>
        </motion.div>
      </div>
    )
  }

  // Redirect to dashboard if already authenticated
  if (isAuthenticated) {
    const from = (location.state as { from?: Location })?.from?.pathname || '/'
    return <Navigate to={from === '/login' ? '/' : from} replace />
  }

  return <>{children}</>
}

