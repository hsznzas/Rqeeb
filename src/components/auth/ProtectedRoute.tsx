import { Navigate, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '@/context'

interface ProtectedRouteProps {
  children: React.ReactNode
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, loadingPhaseText } = useAuth()
  const location = useLocation()

  // Show loading spinner while checking auth
  if (isLoading) {
    return (
      <div className="min-h-[100dvh] bg-slate-950 flex items-center justify-center">
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
            <svg width="40" height="40" viewBox="0 0 595.28 841.89" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path fill="#fff" d="M565.48,620.39c-26-20.11-32.27-22.21-55.82-43.22-76.91-68.63-87.31-179.51-140.55-195.91-2.89-.89-2.92-4.98-.03-5.89,55.14-17.44,97.6-58.94,104.74-114.9,7.27-56.98-17.78-106.56-71.78-127.13-33.6-12.8-70.29-21.66-109.85-21.81l-237.18-.9c-7.74-.03-16.02,15.78-12.71,19.78,14.37,17.39,65.54,11.42,65.42,70.47l-.72,351.36c-.1,50.37-47.39,60.89-60.75,62.86-1.82.27-2.97,2.1-2.45,3.86l5.04,16.84c.38,1.28,1.57,2.16,2.91,2.16l208.51-.51c1.3,0,2.45-.83,2.86-2.07l5.24-15.64c.52-1.54-.27-3.2-1.78-3.79-10.86-4.21-50.97-22.33-59.41-63.35l-.36-396.16c0-3.11,2.35-5.71,5.44-6.02,41.82-4.16,90.49-3.48,127.48,21.42,36.1,24.3,42.11,70.2,31.03,111.09-16.01,59.09-71.14,79.36-128.35,81.13-1.69.05-3.04,1.43-3.04,3.12v32.97c0,1.73,1.4,3.12,3.13,3.12l55.53-.1c3.04,0,5.87,1.56,7.49,4.14l144.59,230.57h106.14l9.24-17.5Z"/>
            </svg>
          </motion.div>
          <p className="text-slate-400 text-sm">{loadingPhaseText}</p>
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
  const { isAuthenticated, isLoading, loadingPhaseText } = useAuth()
  const location = useLocation()

  // Show loading spinner while checking auth
  if (isLoading) {
    return (
      <div className="min-h-[100dvh] bg-slate-950 flex items-center justify-center">
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
            <svg width="40" height="40" viewBox="0 0 595.28 841.89" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path fill="#fff" d="M565.48,620.39c-26-20.11-32.27-22.21-55.82-43.22-76.91-68.63-87.31-179.51-140.55-195.91-2.89-.89-2.92-4.98-.03-5.89,55.14-17.44,97.6-58.94,104.74-114.9,7.27-56.98-17.78-106.56-71.78-127.13-33.6-12.8-70.29-21.66-109.85-21.81l-237.18-.9c-7.74-.03-16.02,15.78-12.71,19.78,14.37,17.39,65.54,11.42,65.42,70.47l-.72,351.36c-.1,50.37-47.39,60.89-60.75,62.86-1.82.27-2.97,2.1-2.45,3.86l5.04,16.84c.38,1.28,1.57,2.16,2.91,2.16l208.51-.51c1.3,0,2.45-.83,2.86-2.07l5.24-15.64c.52-1.54-.27-3.2-1.78-3.79-10.86-4.21-50.97-22.33-59.41-63.35l-.36-396.16c0-3.11,2.35-5.71,5.44-6.02,41.82-4.16,90.49-3.48,127.48,21.42,36.1,24.3,42.11,70.2,31.03,111.09-16.01,59.09-71.14,79.36-128.35,81.13-1.69.05-3.04,1.43-3.04,3.12v32.97c0,1.73,1.4,3.12,3.13,3.12l55.53-.1c3.04,0,5.87,1.56,7.49,4.14l144.59,230.57h106.14l9.24-17.5Z"/>
            </svg>
          </motion.div>
          <p className="text-slate-400 text-sm">{loadingPhaseText}</p>
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

