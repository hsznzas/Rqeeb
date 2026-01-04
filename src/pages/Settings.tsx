import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  User, 
  Bell, 
  Shield, 
  Download, 
  LogOut, 
  ChevronRight, 
  Moon,
  Coins,
  X,
  Check,
  Loader2
} from 'lucide-react'
import { PageContainer } from '@/components/layout'
import { GlassCard } from '@/components/ui'
import { useAuth } from '@/context'
import { CURRENCIES, getCurrencyOptions, type Currency } from '@/lib/currency'
import { cn } from '@/lib/utils'

interface SettingItemProps {
  icon: React.ElementType
  label: string
  description?: string
  onClick?: () => void
  rightElement?: React.ReactNode
  danger?: boolean
}

function SettingItem({ icon: Icon, label, description, onClick, rightElement, danger }: SettingItemProps) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-4 p-4 rounded-xl hover:bg-white/[0.03] transition-colors ${
        danger ? 'hover:bg-rose-500/10' : ''
      }`}
    >
      <div className={`p-2.5 rounded-xl ${danger ? 'bg-rose-500/10' : 'bg-white/[0.05]'}`}>
        <Icon className={`h-5 w-5 ${danger ? 'text-rose-400' : 'text-slate-300'}`} />
      </div>
      <div className="flex-1 text-left">
        <div className={`font-medium ${danger ? 'text-rose-400' : 'text-white'}`}>{label}</div>
        {description && (
          <div className="text-sm text-slate-500">{description}</div>
        )}
      </div>
      {rightElement !== undefined ? rightElement : <ChevronRight className={`h-5 w-5 ${danger ? 'text-rose-400' : 'text-slate-500'}`} />}
    </button>
  )
}

// Currency Selection Modal
function CurrencyModal({
  isOpen,
  currentCurrency,
  onSelect,
  onClose,
  isLoading
}: {
  isOpen: boolean
  currentCurrency: Currency
  onSelect: (currency: Currency) => void
  onClose: () => void
  isLoading: boolean
}) {
  if (!isOpen) return null

  const currencyOptions = getCurrencyOptions()

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="w-full max-w-md"
        onClick={e => e.stopPropagation()}
      >
        <GlassCard size="lg" className="relative">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-emerald-500/20">
                <Coins className="h-5 w-5 text-emerald-400" />
              </div>
              <h2 className="text-xl font-bold text-white">Default Currency</h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-white/10 text-slate-400 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <p className="text-sm text-slate-400 mb-4">
            Choose the currency used for displaying totals and summaries.
          </p>

          {/* Currency List */}
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {currencyOptions.map(({ value }) => {
              const currency = CURRENCIES[value]
              const isSelected = value === currentCurrency
              
              return (
                <button
                  key={value}
                  onClick={() => onSelect(value)}
                  disabled={isLoading}
                  className={cn(
                    'w-full flex items-center gap-3 p-3 rounded-xl border transition-all',
                    isSelected
                      ? 'bg-emerald-500/20 border-emerald-500/50'
                      : 'bg-white/[0.03] border-white/[0.06] hover:bg-white/[0.06]',
                    isLoading && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  <span className="text-2xl">{currency.flag}</span>
                  <div className="flex-1 text-left">
                    <div className={cn(
                      'font-medium',
                      isSelected ? 'text-emerald-400' : 'text-white'
                    )}>
                      {value}
                    </div>
                    <div className="text-sm text-slate-500">{currency.name}</div>
                  </div>
                  <div className="text-right">
                    <div className={cn(
                      'text-sm font-mono',
                      isSelected ? 'text-emerald-400' : 'text-slate-400'
                    )}>
                      {currency.symbol}
                    </div>
                  </div>
                  {isSelected && (
                    <Check className="h-5 w-5 text-emerald-400" />
                  )}
                </button>
              )
            })}
          </div>

          {/* Loading indicator */}
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-900/50 rounded-2xl">
              <Loader2 className="h-8 w-8 text-emerald-400 animate-spin" />
            </div>
          )}
        </GlassCard>
      </motion.div>
    </motion.div>
  )
}

export function SettingsPage() {
  const { user, profile, signOut, updateProfile, defaultCurrency } = useAuth()
  const [showCurrencyModal, setShowCurrencyModal] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)

  const handleSignOut = async () => {
    await signOut()
  }

  const handleCurrencyChange = async (currency: Currency) => {
    setIsUpdating(true)
    const { error } = await updateProfile({ default_currency: currency })
    setIsUpdating(false)
    
    if (!error) {
      setShowCurrencyModal(false)
    }
  }

  // Get current currency info
  const currentCurrencyInfo = CURRENCIES[defaultCurrency]

  return (
    <PageContainer bottomPadding={false}>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white mb-1">Settings</h1>
          <p className="text-slate-400">Manage your account and preferences</p>
        </div>

        {/* Profile Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-6"
        >
          <GlassCard size="lg" className="flex items-center gap-4">
            <div className="p-1 rounded-full bg-gradient-to-br from-emerald-500 to-amber-500">
              <div className="p-4 rounded-full bg-slate-900">
                <User className="h-8 w-8 text-white" />
              </div>
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-white">
                {profile?.full_name || user?.email?.split('@')[0] || 'User'}
              </h2>
              <p className="text-sm text-slate-400">{user?.email || 'Not signed in'}</p>
            </div>
            <div className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-medium border border-emerald-500/30">
              Free Plan
            </div>
          </GlassCard>
        </motion.div>

        {/* Settings Sections */}
        <div className="space-y-4">
          {/* Account */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-2 px-1">
              Account
            </h3>
            <GlassCard size="sm" className="divide-y divide-white/[0.06]">
              <SettingItem
                icon={User}
                label="Edit Profile"
                description="Update your personal information"
              />
              <SettingItem
                icon={Shield}
                label="Security"
                description="Password and authentication"
              />
              <SettingItem
                icon={Bell}
                label="Notifications"
                description="Email and push notifications"
              />
            </GlassCard>
          </motion.div>

          {/* Preferences */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-2 px-1">
              Preferences
            </h3>
            <GlassCard size="sm" className="divide-y divide-white/[0.06]">
              <SettingItem
                icon={Moon}
                label="Dark Mode"
                description="Always on"
                rightElement={
                  <div className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-medium">
                    On
                  </div>
                }
              />
              <SettingItem
                icon={Coins}
                label="Default Currency"
                description={`${currentCurrencyInfo.flag} ${defaultCurrency} - ${currentCurrencyInfo.name}`}
                onClick={() => setShowCurrencyModal(true)}
                rightElement={
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{currentCurrencyInfo.flag}</span>
                    <span className="font-mono text-sm text-slate-400">{currentCurrencyInfo.symbol}</span>
                    <ChevronRight className="h-5 w-5 text-slate-500" />
                  </div>
                }
              />
            </GlassCard>
          </motion.div>

          {/* Data */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-2 px-1">
              Data
            </h3>
            <GlassCard size="sm" className="divide-y divide-white/[0.06]">
              <SettingItem
                icon={Download}
                label="Export Data"
                description="Download your transactions as CSV"
              />
            </GlassCard>
          </motion.div>

          {/* Sign Out */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <GlassCard size="sm">
              <SettingItem
                icon={LogOut}
                label="Sign Out"
                onClick={handleSignOut}
                rightElement={null}
                danger
              />
            </GlassCard>
          </motion.div>
        </div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-8 mb-8 text-center"
        >
          <p className="text-xs text-slate-600">
            Rqeeb v0.2.1 • Made with ❤️ in Saudi Arabia
          </p>
        </motion.div>
      </motion.div>

      {/* Currency Selection Modal */}
      <AnimatePresence>
        {showCurrencyModal && (
          <CurrencyModal
            isOpen={showCurrencyModal}
            currentCurrency={defaultCurrency}
            onSelect={handleCurrencyChange}
            onClose={() => setShowCurrencyModal(false)}
            isLoading={isUpdating}
          />
        )}
      </AnimatePresence>
    </PageContainer>
  )
}
