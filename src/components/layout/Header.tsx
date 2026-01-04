import { motion } from 'framer-motion'
import { Home, CreditCard, RefreshCw, BarChart3, Settings, User } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/', icon: Home, label: 'Home' },
  { href: '/accounts', icon: CreditCard, label: 'Accounts' },
  { href: '/subscriptions', icon: RefreshCw, label: 'Subscriptions' },
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
                  <svg width="24" height="24" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M16 8L20 12L16 16L20 20L16 24" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M12 12L8 16L12 20" stroke="#f43f5e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              </div>
              <div className="hidden sm:block">
                <h1 className="text-lg font-bold text-white tracking-tight">Rqeeb</h1>
                <p className="text-xs text-slate-500 -mt-0.5">Smart Tracker</p>
              </div>
            </Link>

            {/* Navigation */}
            <nav className="flex items-center gap-0.5">
              {navItems.map((item) => {
                const isActive = location.pathname === item.href
                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    className={cn(
                      'flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl transition-all duration-200 min-w-[3rem]',
                      isActive
                        ? 'bg-white/[0.08] text-white'
                        : 'text-slate-400 hover:text-white hover:bg-white/[0.05]'
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    <span className={cn(
                      'text-[10px] font-medium leading-none',
                      isActive ? 'text-white' : 'text-slate-500'
                    )}>
                      {item.label}
                    </span>
                  </Link>
                )
              })}
              
              {/* User Avatar */}
              <div className="ml-2 p-0.5 rounded-full bg-gradient-to-br from-emerald-500 to-amber-500">
                <div className="p-2 rounded-full bg-slate-900">
                  <User className="h-4 w-4 text-white" />
                </div>
              </div>
            </nav>
          </div>
        </div>
      </div>
    </motion.header>
  )
}
