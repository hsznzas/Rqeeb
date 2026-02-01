import { motion } from 'framer-motion'
import { Home, BarChart3, Settings, User } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'

// Main navigation tabs (simplified - other pages accessible from Settings)
const navItems = [
  { href: '/', icon: Home, label: 'Home' },
  { href: '/analytics', icon: BarChart3, label: 'Analytics' },
  { href: '/settings', icon: Settings, label: 'Settings' },
]

export function Header() {
  const location = useLocation()

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="sticky top-0 z-40 w-full"
    >
      <div className="bg-slate-950/80 backdrop-blur-xl border-b border-white/[0.06]">
        <div className="max-w-2xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-3">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500 to-amber-500 rounded-xl blur-lg opacity-50" />
                <div className="relative p-2 rounded-xl bg-gradient-to-br from-emerald-500/20 to-amber-500/20 border border-white/10">
                  <svg width="24" height="24" viewBox="0 0 595.28 841.89" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path fill="#fff" d="M565.48,620.39c-26-20.11-32.27-22.21-55.82-43.22-76.91-68.63-87.31-179.51-140.55-195.91-2.89-.89-2.92-4.98-.03-5.89,55.14-17.44,97.6-58.94,104.74-114.9,7.27-56.98-17.78-106.56-71.78-127.13-33.6-12.8-70.29-21.66-109.85-21.81l-237.18-.9c-7.74-.03-16.02,15.78-12.71,19.78,14.37,17.39,65.54,11.42,65.42,70.47l-.72,351.36c-.1,50.37-47.39,60.89-60.75,62.86-1.82.27-2.97,2.1-2.45,3.86l5.04,16.84c.38,1.28,1.57,2.16,2.91,2.16l208.51-.51c1.3,0,2.45-.83,2.86-2.07l5.24-15.64c.52-1.54-.27-3.2-1.78-3.79-10.86-4.21-50.97-22.33-59.41-63.35l-.36-396.16c0-3.11,2.35-5.71,5.44-6.02,41.82-4.16,90.49-3.48,127.48,21.42,36.1,24.3,42.11,70.2,31.03,111.09-16.01,59.09-71.14,79.36-128.35,81.13-1.69.05-3.04,1.43-3.04,3.12v32.97c0,1.73,1.4,3.12,3.13,3.12l55.53-.1c3.04,0,5.87,1.56,7.49,4.14l144.59,230.57h106.14l9.24-17.5Z"/>
                  </svg>
                </div>
              </div>
              <div className="hidden sm:block">
                <h1 className="text-lg font-bold text-white tracking-tight">Rqeeb</h1>
                <p className="text-xs text-slate-500 -mt-0.5">Smart Tracker</p>
              </div>
            </Link>

            {/* Tab Navigation */}
            <nav className="flex items-center">
              <div className="flex bg-white/[0.03] rounded-xl p-1 border border-white/[0.06]">
                {navItems.map((item) => {
                  const isActive = location.pathname === item.href || 
                    (item.href === '/settings' && ['/accounts', '/beneficiaries', '/subscriptions'].includes(location.pathname))
                  
                  return (
                    <Link
                      key={item.href}
                      to={item.href}
                      className={cn(
                        'relative flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all duration-200',
                        isActive
                          ? 'bg-white/[0.08] text-white shadow-lg'
                          : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
                      )}
                    >
                      <item.icon className="h-4 w-4" />
                      <span className="text-sm font-medium hidden sm:inline">
                        {item.label}
                      </span>
                      
                      {/* Active indicator */}
                      {isActive && (
                        <motion.div
                          layoutId="activeTab"
                          className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-emerald-400 rounded-full"
                          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                        />
                      )}
                    </Link>
                  )
                })}
              </div>
              
              {/* User Avatar */}
              <Link 
                to="/settings"
                className="ml-3 p-0.5 rounded-full bg-gradient-to-br from-emerald-500 to-amber-500 hover:opacity-80 transition-opacity"
              >
                <div className="p-2 rounded-full bg-slate-900">
                  <User className="h-4 w-4 text-white" />
                </div>
              </Link>
            </nav>
          </div>
        </div>
      </div>
    </motion.header>
  )
}
