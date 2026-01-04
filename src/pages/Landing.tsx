import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mail, Lock, ArrowRight, User, AlertCircle, Sparkles, CheckCircle } from 'lucide-react'
import { useAuth } from '@/context'
import { cn } from '@/lib/utils'

type AuthTab = 'login' | 'signup'

interface FormState {
  email: string
  password: string
  confirmPassword: string
}

export function LandingPage() {
  const { signIn, signUp, signInWithDemo, isLoading } = useAuth()
  const [activeTab, setActiveTab] = useState<AuthTab>('login')
  const [form, setForm] = useState<FormState>({
    email: '',
    password: '',
    confirmPassword: '',
  })
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
    setError(null)
    setSuccess(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    if (!form.email || !form.password) {
      setError('Please fill in all fields')
      return
    }

    if (activeTab === 'signup') {
      if (form.password !== form.confirmPassword) {
        setError('Passwords do not match')
        return
      }
      if (form.password.length < 6) {
        setError('Password must be at least 6 characters')
        return
      }

      const { error } = await signUp(form.email, form.password)
      if (error) {
        setError(error.message)
      } else {
        setSuccess('Account created! Check your email to confirm.')
      }
    } else {
      const { error } = await signIn(form.email, form.password)
      if (error) {
        setError(error.message)
      }
    }
  }

  const handleDemoClick = async () => {
    setError(null)
    const { error } = await signInWithDemo()
    if (error) {
      setError('Demo account not available. Please sign up first.')
    }
  }

  return (
    <div className="min-h-[100dvh] bg-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Animated Background Orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{
            x: [0, 100, 0],
            y: [0, -50, 0],
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="absolute top-1/4 -left-20 w-96 h-96 bg-emerald-500/20 rounded-full blur-3xl"
        />
        <motion.div
          animate={{
            x: [0, -80, 0],
            y: [0, 60, 0],
            scale: [1, 1.3, 1],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="absolute bottom-1/4 -right-20 w-96 h-96 bg-amber-500/15 rounded-full blur-3xl"
        />
        <motion.div
          animate={{
            x: [0, 50, 0],
            y: [0, 80, 0],
          }}
          transition={{
            duration: 18,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-rose-500/10 rounded-full blur-3xl"
        />
      </div>

      {/* Content */}
      <div className="relative z-10 w-full max-w-md">
        {/* Logo & Hero */}
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="text-center mb-8"
        >
          {/* Logo */}
          <motion.div
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            className="inline-block mb-6"
          >
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500 to-amber-500 rounded-2xl blur-xl opacity-50" />
              <div className="relative p-4 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-amber-500/20 border border-white/10 backdrop-blur-sm">
                <svg width="48" height="48" viewBox="0 0 595.28 841.89" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path fill="#fff" d="M565.48,620.39c-26-20.11-32.27-22.21-55.82-43.22-76.91-68.63-87.31-179.51-140.55-195.91-2.89-.89-2.92-4.98-.03-5.89,55.14-17.44,97.6-58.94,104.74-114.9,7.27-56.98-17.78-106.56-71.78-127.13-33.6-12.8-70.29-21.66-109.85-21.81l-237.18-.9c-7.74-.03-16.02,15.78-12.71,19.78,14.37,17.39,65.54,11.42,65.42,70.47l-.72,351.36c-.1,50.37-47.39,60.89-60.75,62.86-1.82.27-2.97,2.1-2.45,3.86l5.04,16.84c.38,1.28,1.57,2.16,2.91,2.16l208.51-.51c1.3,0,2.45-.83,2.86-2.07l5.24-15.64c.52-1.54-.27-3.2-1.78-3.79-10.86-4.21-50.97-22.33-59.41-63.35l-.36-396.16c0-3.11,2.35-5.71,5.44-6.02,41.82-4.16,90.49-3.48,127.48,21.42,36.1,24.3,42.11,70.2,31.03,111.09-16.01,59.09-71.14,79.36-128.35,81.13-1.69.05-3.04,1.43-3.04,3.12v32.97c0,1.73,1.4,3.12,3.13,3.12l55.53-.1c3.04,0,5.87,1.56,7.49,4.14l144.59,230.57h106.14l9.24-17.5Z"/>
                </svg>
              </div>
            </div>
          </motion.div>

          {/* Title */}
          <h1 className="text-4xl font-bold text-white mb-3 tracking-tight">
            Rqeeb
          </h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.8 }}
            className="text-xl text-slate-400 font-light"
          >
            Financial Clarity, <span className="text-emerald-400">Simplified</span>.
          </motion.p>
        </motion.div>

        {/* Auth Card */}
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.2, ease: 'easeOut' }}
          className="backdrop-blur-xl bg-white/[0.05] border border-white/10 rounded-3xl p-6 shadow-2xl"
        >
          {/* Tabs */}
          <div className="flex mb-6 p-1 bg-white/[0.05] rounded-xl">
            {(['login', 'signup'] as AuthTab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => {
                  setActiveTab(tab)
                  setError(null)
                  setSuccess(null)
                }}
                className={cn(
                  'flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all duration-300',
                  activeTab === tab
                    ? 'bg-white/10 text-white shadow-lg'
                    : 'text-slate-400 hover:text-white'
                )}
              >
                {tab === 'login' ? 'Sign In' : 'Create Account'}
              </button>
            ))}
          </div>

          {/* Error Alert */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10, height: 0 }}
                animate={{ opacity: 1, y: 0, height: 'auto' }}
                exit={{ opacity: 0, y: -10, height: 0 }}
                className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center gap-2 text-rose-400 text-sm"
              >
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Success Alert */}
          <AnimatePresence>
            {success && (
              <motion.div
                initial={{ opacity: 0, y: -10, height: 0 }}
                animate={{ opacity: 1, y: 0, height: 'auto' }}
                exit={{ opacity: 0, y: -10, height: 0 }}
                className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-2 text-emerald-400 text-sm"
              >
                <CheckCircle className="h-4 w-4 shrink-0" />
                <span>{success}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email Input */}
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleInputChange}
                placeholder="Email address"
                className={cn(
                  'w-full pl-12 pr-4 py-3.5 rounded-xl',
                  'bg-white/[0.05] border border-white/10',
                  'text-white placeholder:text-slate-500',
                  'focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50',
                  'transition-all duration-200'
                )}
              />
            </div>

            {/* Password Input */}
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
              <input
                type="password"
                name="password"
                value={form.password}
                onChange={handleInputChange}
                placeholder="Password"
                className={cn(
                  'w-full pl-12 pr-4 py-3.5 rounded-xl',
                  'bg-white/[0.05] border border-white/10',
                  'text-white placeholder:text-slate-500',
                  'focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50',
                  'transition-all duration-200'
                )}
              />
            </div>

            {/* Confirm Password (Sign Up only) */}
            <AnimatePresence>
              {activeTab === 'signup' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="relative"
                >
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
                  <input
                    type="password"
                    name="confirmPassword"
                    value={form.confirmPassword}
                    onChange={handleInputChange}
                    placeholder="Confirm password"
                    className={cn(
                      'w-full pl-12 pr-4 py-3.5 rounded-xl',
                      'bg-white/[0.05] border border-white/10',
                      'text-white placeholder:text-slate-500',
                      'focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50',
                      'transition-all duration-200'
                    )}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Submit Button */}
            <motion.button
              type="submit"
              disabled={isLoading}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={cn(
                'w-full py-3.5 rounded-xl font-medium',
                'bg-gradient-to-r from-emerald-500 to-emerald-600',
                'text-white shadow-lg shadow-emerald-500/25',
                'hover:shadow-xl hover:shadow-emerald-500/30',
                'focus:outline-none focus:ring-2 focus:ring-emerald-500/50',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                'transition-all duration-300',
                'flex items-center justify-center gap-2'
              )}
            >
              {isLoading ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full"
                />
              ) : (
                <>
                  {activeTab === 'login' ? 'Sign In' : 'Create Account'}
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </motion.button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-slate-950/50 text-slate-500">or</span>
            </div>
          </div>

          {/* Demo Button */}
          <motion.button
            onClick={handleDemoClick}
            disabled={isLoading}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={cn(
              'w-full py-3.5 rounded-xl font-medium',
              'bg-white/[0.05] border border-white/20',
              'text-slate-300 hover:text-white',
              'hover:bg-white/[0.08] hover:border-white/30',
              'focus:outline-none focus:ring-2 focus:ring-white/20',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              'transition-all duration-300',
              'flex items-center justify-center gap-2'
            )}
          >
            <Sparkles className="h-4 w-4 text-amber-400" />
            Try Demo Account
          </motion.button>
        </motion.div>

        {/* Footer */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.5 }}
          className="text-center text-sm text-slate-600 mt-6"
        >
          Your financial companion • رقيب
        </motion.p>
      </div>
    </div>
  )
}

