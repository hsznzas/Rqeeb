import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  User, 
  Users,
  Bell, 
  Shield, 
  Download, 
  LogOut, 
  ChevronRight, 
  Moon,
  Coins,
  X,
  Check,
  Loader2,
  Plus,
  Pencil,
  Trash2
} from 'lucide-react'
import { PageContainer } from '@/components/layout'
import { GlassCard } from '@/components/ui'
import { useAuth } from '@/context'
import { CURRENCIES, getCurrencyOptions, type Currency } from '@/lib/currency'
import { cn } from '@/lib/utils'
import { supabase } from '@/services/supabase'
import type { Beneficiary, UserCategory } from '@/types/database'

// Default categories that come with the app
const DEFAULT_CATEGORIES = [
  'Food & Dining',
  'Transportation', 
  'Shopping',
  'Bills & Utilities',
  'Groceries',
  'Health',
  'Transfer',
  'Entertainment',
  'Income',
  'Travel',
  'Education',
  'Advertising',
  'Subscription',
  'Other'
]

// Predefined colors for categories and beneficiaries
const CATEGORY_COLORS = [
  '#10b981', // emerald
  '#3b82f6', // blue
  '#8b5cf6', // purple
  '#f59e0b', // amber
  '#ef4444', // red
  '#06b6d4', // cyan
  '#ec4899', // pink
  '#84cc16', // lime
]

// Predefined colors for beneficiaries
const BENEFICIARY_COLORS = [
  '#6366f1', // indigo
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#ef4444', // red
  '#f59e0b', // amber
  '#10b981', // emerald
  '#06b6d4', // cyan
  '#3b82f6', // blue
]

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

// Beneficiary Modal
function BeneficiaryModal({
  isOpen,
  beneficiary,
  onSave,
  onClose,
  isLoading
}: {
  isOpen: boolean
  beneficiary: Beneficiary | null // null = adding new
  onSave: (name: string, color: string) => void
  onClose: () => void
  isLoading: boolean
}) {
  const [name, setName] = useState(beneficiary?.name || '')
  const [color, setColor] = useState(beneficiary?.color || BENEFICIARY_COLORS[0])

  useEffect(() => {
    if (isOpen) {
      setName(beneficiary?.name || '')
      setColor(beneficiary?.color || BENEFICIARY_COLORS[0])
    }
  }, [isOpen, beneficiary])

  if (!isOpen) return null

  const isEditing = !!beneficiary

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
              <div className="p-2 rounded-xl bg-amber-500/20">
                <Users className="h-5 w-5 text-amber-400" />
              </div>
              <h2 className="text-xl font-bold text-white">
                {isEditing ? 'Edit Beneficiary' : 'Add Beneficiary'}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-white/10 text-slate-400 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <p className="text-sm text-slate-400 mb-4">
            Add people or companies you pay on behalf of for reimbursement tracking.
          </p>

          {/* Form */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., John Smith, Company ABC"
                className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl px-4 py-3 text-white placeholder:text-slate-600 outline-none focus:border-amber-500/50 transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">Color</label>
              <div className="flex gap-2 flex-wrap">
                {BENEFICIARY_COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setColor(c)}
                    className={cn(
                      'w-8 h-8 rounded-full border-2 transition-all',
                      color === c ? 'border-white scale-110' : 'border-transparent'
                    )}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 mt-6">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 rounded-xl bg-white/[0.05] text-slate-400 hover:bg-white/[0.08] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => onSave(name, color)}
              disabled={!name.trim() || isLoading}
              className="flex-1 px-4 py-3 rounded-xl bg-amber-500 text-white font-medium hover:bg-amber-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  <Check className="h-5 w-5" />
                  {isEditing ? 'Save' : 'Add'}
                </>
              )}
            </button>
          </div>

          {/* Loading overlay */}
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-900/50 rounded-2xl">
              <Loader2 className="h-8 w-8 text-amber-400 animate-spin" />
            </div>
          )}
        </GlassCard>
      </motion.div>
    </motion.div>
  )
}

// Category Modal
function CategoryModal({
  isOpen,
  category,
  onSave,
  onClose,
  isLoading
}: {
  isOpen: boolean
  category: UserCategory | null // null = adding new
  onSave: (name: string, description: string, color: string) => void
  onClose: () => void
  isLoading: boolean
}) {
  const [name, setName] = useState(category?.name || '')
  const [description, setDescription] = useState(category?.description || '')
  const [color, setColor] = useState(category?.color || CATEGORY_COLORS[0])

  useEffect(() => {
    if (isOpen) {
      setName(category?.name || '')
      setDescription(category?.description || '')
      setColor(category?.color || CATEGORY_COLORS[0])
    }
  }, [isOpen, category])

  if (!isOpen) return null

  const isEditing = !!category

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
                <Plus className="h-5 w-5 text-emerald-400" />
              </div>
              <h2 className="text-xl font-bold text-white">
                {isEditing ? 'Edit Category' : 'Add Category'}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-white/10 text-slate-400 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <p className="text-sm text-slate-400 mb-4">
            Create custom categories with descriptions to help the AI categorize your transactions.
          </p>

          {/* Form */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">Category Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Client Lunch, Office Supplies"
                className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl px-4 py-3 text-white placeholder:text-slate-600 outline-none focus:border-emerald-500/50 transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">
                Description for AI
                <span className="text-slate-600 font-normal ml-1">(helps AI categorize)</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g., Meals and dining expenses with clients for business purposes"
                rows={3}
                className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl px-4 py-3 text-white placeholder:text-slate-600 outline-none focus:border-emerald-500/50 transition-colors resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">Color</label>
              <div className="flex gap-2 flex-wrap">
                {CATEGORY_COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setColor(c)}
                    className={cn(
                      'w-8 h-8 rounded-full border-2 transition-all',
                      color === c ? 'border-white scale-110' : 'border-transparent'
                    )}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 mt-6">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 rounded-xl bg-white/[0.05] text-slate-400 hover:bg-white/[0.08] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => onSave(name, description, color)}
              disabled={!name.trim() || isLoading}
              className="flex-1 px-4 py-3 rounded-xl bg-emerald-500 text-white font-medium hover:bg-emerald-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  <Check className="h-5 w-5" />
                  {isEditing ? 'Save' : 'Add'}
                </>
              )}
            </button>
          </div>

          {/* Loading overlay */}
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
  
  // Beneficiaries state
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([])
  const [showBeneficiaryModal, setShowBeneficiaryModal] = useState(false)
  const [editingBeneficiary, setEditingBeneficiary] = useState<Beneficiary | null>(null)
  const [isBeneficiaryLoading, setIsBeneficiaryLoading] = useState(false)
  const [deletingBeneficiaryId, setDeletingBeneficiaryId] = useState<string | null>(null)
  
  // Categories state
  const [customCategories, setCustomCategories] = useState<UserCategory[]>([])
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [editingCategory, setEditingCategory] = useState<UserCategory | null>(null)
  const [isCategoryLoading, setIsCategoryLoading] = useState(false)
  const [deletingCategoryId, setDeletingCategoryId] = useState<string | null>(null)

  // Fetch beneficiaries
  const fetchBeneficiaries = useCallback(async () => {
    if (!user) return
    const { data } = await supabase
      .from('beneficiaries')
      .select('*')
      .eq('user_id', user.id)
      .order('name')
    if (data) setBeneficiaries(data)
  }, [user])

  useEffect(() => {
    fetchBeneficiaries()
  }, [fetchBeneficiaries])

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

  // Beneficiary handlers
  const handleAddBeneficiary = () => {
    setEditingBeneficiary(null)
    setShowBeneficiaryModal(true)
  }

  const handleEditBeneficiary = (beneficiary: Beneficiary) => {
    setEditingBeneficiary(beneficiary)
    setShowBeneficiaryModal(true)
  }

  const handleSaveBeneficiary = async (name: string, color: string) => {
    if (!user) return
    setIsBeneficiaryLoading(true)

    try {
      if (editingBeneficiary) {
        // Update existing
        await supabase
          .from('beneficiaries')
          .update({ name, color, updated_at: new Date().toISOString() } as never)
          .eq('id', editingBeneficiary.id)
      } else {
        // Create new
        await supabase
          .from('beneficiaries')
          .insert({ user_id: user.id, name, color } as never)
      }
      await fetchBeneficiaries()
      setShowBeneficiaryModal(false)
    } finally {
      setIsBeneficiaryLoading(false)
    }
  }

  const handleDeleteBeneficiary = async (id: string) => {
    setDeletingBeneficiaryId(id)
    try {
      await supabase.from('beneficiaries').delete().eq('id', id)
      setBeneficiaries(prev => prev.filter(b => b.id !== id))
    } finally {
      setDeletingBeneficiaryId(null)
    }
  }

  // Fetch categories
  const fetchCategories = useCallback(async () => {
    if (!user) return
    const { data, error } = await supabase
      .from('user_categories')
      .select('*')
      .eq('user_id', user.id)
      .order('name')
    // Table might not exist yet (404), so only set data if no error
    if (data && !error) setCustomCategories(data)
  }, [user])

  useEffect(() => {
    fetchCategories()
  }, [fetchCategories])

  // Category handlers
  const handleAddCategory = () => {
    setEditingCategory(null)
    setShowCategoryModal(true)
  }

  const handleEditCategory = (category: UserCategory) => {
    setEditingCategory(category)
    setShowCategoryModal(true)
  }

  const handleSaveCategory = async (name: string, description: string, color: string) => {
    if (!user) return
    setIsCategoryLoading(true)

    try {
      let result;
      if (editingCategory) {
        // Update existing
        result = await supabase
          .from('user_categories')
          .update({ name, description, color, updated_at: new Date().toISOString() } as never)
          .eq('id', editingCategory.id)
      } else {
        // Create new
        result = await supabase
          .from('user_categories')
          .insert({ user_id: user.id, name, description, color } as never)
      }
      if (result.error) {
        console.error('Failed to save category:', result.error)
        // Table might not exist - show user-friendly message
        return
      }
      await fetchCategories()
      setShowCategoryModal(false)
    } finally {
      setIsCategoryLoading(false)
    }
  }

  const handleDeleteCategory = async (id: string) => {
    setDeletingCategoryId(id)
    try {
      await supabase.from('user_categories').delete().eq('id', id)
      setCustomCategories(prev => prev.filter(c => c.id !== id))
    } finally {
      setDeletingCategoryId(null)
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

          {/* Categories */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.32 }}
          >
            <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-2 px-1">
              Categories
            </h3>
            <GlassCard size="sm" className="p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm text-slate-400">
                  Custom categories for AI transaction parsing
                </p>
                <button
                  onClick={handleAddCategory}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 text-sm font-medium hover:bg-emerald-500/30 transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  Add
                </button>
              </div>

              {/* Default categories info */}
              <div className="mb-4 p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                <p className="text-xs text-slate-500 mb-2">Default categories:</p>
                <div className="flex flex-wrap gap-1.5">
                  {DEFAULT_CATEGORIES.map((cat) => (
                    <span
                      key={cat}
                      className="px-2 py-0.5 rounded-full bg-white/[0.05] text-slate-500 text-xs"
                    >
                      {cat}
                    </span>
                  ))}
                </div>
              </div>

              {/* Custom categories */}
              {customCategories.length === 0 ? (
                <div className="py-4 text-center">
                  <p className="text-sm text-slate-500">No custom categories yet</p>
                  <p className="text-xs text-slate-600 mt-1">
                    Add categories with descriptions to help AI categorize better
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs text-slate-500 mb-2">Your custom categories:</p>
                  {customCategories.map((category) => (
                    <div
                      key={category.id}
                      className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]"
                    >
                      <div
                        className="w-3 h-3 rounded-full shrink-0 mt-1"
                        style={{ backgroundColor: category.color }}
                      />
                      <div className="flex-1 min-w-0">
                        <span className="text-white font-medium">{category.name}</span>
                        {category.description && (
                          <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">
                            {category.description}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => handleEditCategory(category)}
                        className="p-2 rounded-lg hover:bg-white/[0.05] text-slate-400 hover:text-white transition-colors"
                        title="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteCategory(category.id)}
                        disabled={deletingCategoryId === category.id}
                        className="p-2 rounded-lg hover:bg-rose-500/10 text-slate-400 hover:text-rose-400 transition-colors disabled:opacity-50"
                        title="Delete"
                      >
                        {deletingCategoryId === category.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </GlassCard>
          </motion.div>

          {/* Beneficiaries */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
          >
            <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-2 px-1">
              Beneficiaries
            </h3>
            <GlassCard size="sm" className="p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm text-slate-400">
                  People or companies you pay on behalf of
                </p>
                <button
                  onClick={handleAddBeneficiary}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-400 text-sm font-medium hover:bg-amber-500/30 transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  Add
                </button>
              </div>

              {beneficiaries.length === 0 ? (
                <div className="py-6 text-center">
                  <Users className="h-8 w-8 text-slate-600 mx-auto mb-2" />
                  <p className="text-sm text-slate-500">No beneficiaries yet</p>
                  <p className="text-xs text-slate-600 mt-1">
                    Add people you pay on behalf of for reimbursement tracking
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {beneficiaries.map((beneficiary) => (
                    <div
                      key={beneficiary.id}
                      className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]"
                    >
                      <div
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: beneficiary.color }}
                      />
                      <span className="flex-1 text-white font-medium truncate">
                        {beneficiary.name}
                      </span>
                      <button
                        onClick={() => handleEditBeneficiary(beneficiary)}
                        className="p-2 rounded-lg hover:bg-white/[0.05] text-slate-400 hover:text-white transition-colors"
                        title="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteBeneficiary(beneficiary.id)}
                        disabled={deletingBeneficiaryId === beneficiary.id}
                        className="p-2 rounded-lg hover:bg-rose-500/10 text-slate-400 hover:text-rose-400 transition-colors disabled:opacity-50"
                        title="Delete"
                      >
                        {deletingBeneficiaryId === beneficiary.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              )}
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

      {/* Beneficiary Modal */}
      <AnimatePresence>
        {showBeneficiaryModal && (
          <BeneficiaryModal
            isOpen={showBeneficiaryModal}
            beneficiary={editingBeneficiary}
            onSave={handleSaveBeneficiary}
            onClose={() => setShowBeneficiaryModal(false)}
            isLoading={isBeneficiaryLoading}
          />
        )}
      </AnimatePresence>

      {/* Category Modal */}
      <AnimatePresence>
        {showCategoryModal && (
          <CategoryModal
            isOpen={showCategoryModal}
            category={editingCategory}
            onSave={handleSaveCategory}
            onClose={() => setShowCategoryModal(false)}
            isLoading={isCategoryLoading}
          />
        )}
      </AnimatePresence>
    </PageContainer>
  )
}
