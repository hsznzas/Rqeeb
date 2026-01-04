import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Plus, 
  CreditCard,
  Pencil,
  Trash2,
  X,
  Check,
  Loader2,
  Pause,
  Play,
  AlertTriangle,
  Building2
} from 'lucide-react'
import { PageContainer } from '@/components/layout'
import { GlassCard, Button } from '@/components/ui'
import { cn } from '@/lib/utils'
import { formatCurrency } from '@/lib/utils'
import { supabase } from '@/services/supabase'
import { useAuth } from '@/context'
import { type Subscription, type NewSubscription, type Account, type AccountCard, type BillingCycle, BILLING_CYCLES } from '@/types/database'
import { getCurrencyOptions, type Currency } from '@/lib/currency'

// Popular subscription icons/colors
const SUBSCRIPTION_PRESETS: Record<string, { color: string; icon: string }> = {
  'Netflix': { color: '#e50914', icon: '📺' },
  'Spotify': { color: '#1db954', icon: '🎵' },
  'Apple': { color: '#555555', icon: '🍎' },
  'YouTube': { color: '#ff0000', icon: '▶️' },
  'Amazon': { color: '#ff9900', icon: '📦' },
  'Disney+': { color: '#113ccf', icon: '🏰' },
  'iCloud': { color: '#3693f3', icon: '☁️' },
  'Gym': { color: '#10b981', icon: '💪' },
  'Internet': { color: '#06b6d4', icon: '🌐' },
  'Phone': { color: '#8b5cf6', icon: '📱' },
}

// Get billing cycle label
function getBillingCycleLabel(cycle: BillingCycle | undefined): string {
  const found = BILLING_CYCLES.find(c => c.value === cycle)
  return found?.label || 'Monthly'
}

// Subscription Card Component
function SubscriptionCard({ 
  subscription,
  accounts,
  cards,
  onEdit, 
  onDelete,
  onToggle
}: { 
  subscription: Subscription
  accounts: Account[]
  cards: AccountCard[]
  onEdit: (sub: Subscription) => void
  onDelete: (id: string) => void
  onToggle: (id: string, active: boolean) => void
}) {
  const account = accounts.find(a => a.id === subscription.account_id)
  const card = cards.find(c => c.id === subscription.card_id)
  const daysUntil = subscription.next_deduction_date 
    ? Math.ceil((new Date(subscription.next_deduction_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null
  
  const preset = Object.entries(SUBSCRIPTION_PRESETS).find(([name]) => 
    subscription.name.toLowerCase().includes(name.toLowerCase())
  )
  const color = preset?.[1]?.color || subscription.color
  const emoji = preset?.[1]?.icon || '💳'
  const billingLabel = getBillingCycleLabel(subscription.billing_cycle)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      layout
      className={cn(!subscription.is_active && 'opacity-50')}
    >
      <GlassCard 
        size="md" 
        className="relative group overflow-hidden"
        style={{ borderColor: `${color}30` }}
      >
        {/* Color accent */}
        <div 
          className="absolute top-0 left-0 w-1 h-full"
          style={{ backgroundColor: color }}
        />
        
        <div className="flex items-center gap-4 pl-3">
          {/* Icon */}
          <div 
            className="p-3 rounded-xl text-2xl"
            style={{ backgroundColor: `${color}20` }}
          >
            {emoji}
          </div>

          {/* Details */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-white truncate">{subscription.name}</h3>
              {!subscription.is_active && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-500/20 text-slate-400 shrink-0">
                  Paused
                </span>
              )}
            </div>
            
            {/* Billing cycle badge */}
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400">
                {billingLabel}
              </span>
              <span className="text-xs text-slate-500">Day {subscription.deduction_day}</span>
            </div>
            
            {/* Card/Account info */}
            <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
              {card ? (
                <>
                  <CreditCard className="h-3 w-3" />
                  <span>{card.name} ****{card.last_4_digits}</span>
                </>
              ) : account ? (
                <>
                  <Building2 className="h-3 w-3" />
                  <span>{account.name}</span>
                </>
              ) : (
                <span className="text-slate-600">No card linked</span>
              )}
            </div>
          </div>

          {/* Amount & Next */}
          <div className="text-right shrink-0">
            <div className="text-lg font-bold font-mono text-rose-400">
              -{formatCurrency(subscription.amount, subscription.currency)}
            </div>
            {daysUntil !== null && subscription.is_active && (
              <p className={cn(
                'text-xs',
                daysUntil <= 3 ? 'text-amber-400' : 'text-slate-500'
              )}>
                {daysUntil === 0 ? 'Today' : daysUntil === 1 ? 'Tomorrow' : `In ${daysUntil} days`}
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => onToggle(subscription.id, !subscription.is_active)}
              className={cn(
                'p-2 rounded-lg transition-colors',
                subscription.is_active 
                  ? 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-400'
                  : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400'
              )}
              title={subscription.is_active ? 'Pause' : 'Resume'}
            >
              {subscription.is_active ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </button>
            <button
              onClick={() => onEdit(subscription)}
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
            >
              <Pencil className="h-4 w-4" />
            </button>
            <button
              onClick={() => onDelete(subscription.id)}
              className="p-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-colors"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      </GlassCard>
    </motion.div>
  )
}

// Add/Edit Modal Component
function SubscriptionModal({
  subscription,
  accounts,
  cards,
  isOpen,
  onClose,
  onSave
}: {
  subscription: Subscription | null
  accounts: Account[]
  cards: AccountCard[]
  isOpen: boolean
  onClose: () => void
  onSave: (data: NewSubscription) => Promise<void>
}) {
  const { user } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [form, setForm] = useState({
    name: '',
    amount: 0,
    currency: 'SAR' as Currency,
    account_id: '' as string,
    card_id: '' as string,
    billing_cycle: 'monthly' as BillingCycle,
    category: 'Bills & Utilities',
    deduction_day: 1,
    color: '#8b5cf6',
    notes: '',
  })

  // Filter cards by selected account
  const filteredCards = form.account_id 
    ? cards.filter(c => c.account_id === form.account_id)
    : cards

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      if (subscription) {
        setForm({
          name: subscription.name,
          amount: subscription.amount,
          currency: subscription.currency as Currency,
          account_id: subscription.account_id || '',
          card_id: subscription.card_id || '',
          billing_cycle: subscription.billing_cycle || 'monthly',
          category: subscription.category,
          deduction_day: subscription.deduction_day,
          color: subscription.color,
          notes: subscription.notes || '',
        })
      } else {
        const defaultAccount = accounts.find(a => a.is_default)
        const defaultCard = cards.find(c => c.is_default)
        setForm({
          name: '',
          amount: 0,
          currency: 'SAR',
          account_id: defaultCard?.account_id || defaultAccount?.id || '',
          card_id: defaultCard?.id || '',
          billing_cycle: 'monthly',
          category: 'Bills & Utilities',
          deduction_day: 1,
          color: '#8b5cf6',
          notes: '',
        })
      }
    }
  }, [isOpen, subscription, accounts, cards])

  // When account changes, clear card if it's not from that account
  const handleAccountChange = (accountId: string) => {
    setForm(f => ({
      ...f,
      account_id: accountId,
      card_id: cards.find(c => c.id === f.card_id)?.account_id === accountId ? f.card_id : ''
    }))
  }

  // When card changes, auto-set account
  const handleCardChange = (cardId: string) => {
    const card = cards.find(c => c.id === cardId)
    setForm(f => ({
      ...f,
      card_id: cardId,
      account_id: card?.account_id || f.account_id
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setIsLoading(true)
    try {
      await onSave({
        ...form,
        user_id: user.id,
        account_id: form.account_id || null,
        card_id: form.card_id || null,
        billing_cycle: form.billing_cycle,
      })
      onClose()
    } catch (error) {
      console.error('Error saving subscription:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (!isOpen) return null

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
        className="w-full max-w-md max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <GlassCard size="lg" className="relative">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white">
              {subscription ? 'Edit Subscription' : 'Add Subscription'}
            </h2>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-white/10 text-slate-400 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                Subscription Name
              </label>
              <input
                type="text"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g., Netflix, Spotify, Gym"
                required
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              />
            </div>

            {/* Amount & Currency */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  Amount
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.amount}
                  onChange={e => setForm(f => ({ ...f, amount: parseFloat(e.target.value) || 0 }))}
                  required
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  Currency
                </label>
                <select
                  value={form.currency}
                  onChange={e => setForm(f => ({ ...f, currency: e.target.value as Currency }))}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                >
                  {getCurrencyOptions().map(opt => (
                    <option key={opt.value} value={opt.value} className="bg-slate-900">
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Billing Cycle */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                Billing Cycle
              </label>
              <div className="grid grid-cols-3 gap-2">
                {BILLING_CYCLES.map(cycle => (
                  <button
                    key={cycle.value}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, billing_cycle: cycle.value }))}
                    className={cn(
                      'px-3 py-2 rounded-xl text-sm transition-colors',
                      form.billing_cycle === cycle.value
                        ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                        : 'bg-white/[0.03] text-slate-400 border border-white/[0.06] hover:bg-white/[0.06]'
                    )}
                  >
                    {cycle.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Deduction Day */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                Deduction Day of Month
              </label>
              <input
                type="number"
                min="1"
                max="31"
                value={form.deduction_day}
                onChange={e => setForm(f => ({ ...f, deduction_day: parseInt(e.target.value) || 1 }))}
                required
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              />
            </div>

            {/* Account */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                Bank Account
              </label>
              <select
                value={form.account_id}
                onChange={e => handleAccountChange(e.target.value)}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              >
                <option value="" className="bg-slate-900">No linked account</option>
                {accounts.map(account => (
                  <option key={account.id} value={account.id} className="bg-slate-900">
                    {account.name} ({account.currency})
                  </option>
                ))}
              </select>
            </div>

            {/* Card (filtered by account) */}
            {(form.account_id || filteredCards.length > 0) && (
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  Card (optional)
                </label>
                <select
                  value={form.card_id}
                  onChange={e => handleCardChange(e.target.value)}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                >
                  <option value="" className="bg-slate-900">No specific card</option>
                  {filteredCards.map(card => (
                    <option key={card.id} value={card.id} className="bg-slate-900">
                      {card.name} ****{card.last_4_digits}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                Notes (optional)
              </label>
              <input
                type="text"
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="e.g., Annual plan, shared with family"
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={onClose}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={!form.name || form.amount <= 0 || isLoading}
                className="flex-1"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    {subscription ? 'Save Changes' : 'Add Subscription'}
                  </>
                )}
              </Button>
            </div>
          </form>
        </GlassCard>
      </motion.div>
    </motion.div>
  )
}

// Main Subscriptions Page
export function SubscriptionsPage() {
  const { user } = useAuth()
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [cards, setCards] = useState<AccountCard[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingSubscription, setEditingSubscription] = useState<Subscription | null>(null)

  // Fetch data
  const fetchData = useCallback(async () => {
    if (!user) return

    try {
      const [subsRes, accountsRes, cardsRes] = await Promise.all([
        supabase
          .from('subscriptions')
          .select('*')
          .eq('user_id', user.id)
          .order('next_deduction_date', { ascending: true }),
        supabase
          .from('accounts')
          .select('*')
          .eq('user_id', user.id),
        supabase
          .from('account_cards')
          .select('*')
          .eq('user_id', user.id)
      ])

      if (subsRes.error) throw subsRes.error
      if (accountsRes.error) throw accountsRes.error
      if (cardsRes.error) throw cardsRes.error

      setSubscriptions((subsRes.data as Subscription[]) || [])
      setAccounts((accountsRes.data as Account[]) || [])
      setCards((cardsRes.data as AccountCard[]) || [])
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setIsLoading(false)
    }
  }, [user])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Save subscription
  const handleSave = async (data: NewSubscription) => {
    if (editingSubscription) {
      const { error } = await supabase
        .from('subscriptions')
        .update(data as never)
        .eq('id', editingSubscription.id)
      if (error) throw error
    } else {
      const { error } = await supabase
        .from('subscriptions')
        .insert(data as never)
      if (error) throw error
    }
    fetchData()
  }

  // Delete subscription
  const handleDelete = async (id: string) => {
    if (!confirm('Delete this subscription?')) return

    try {
      const { error } = await supabase
        .from('subscriptions')
        .delete()
        .eq('id', id)
      if (error) throw error
      setSubscriptions(prev => prev.filter(s => s.id !== id))
    } catch (error) {
      console.error('Error deleting subscription:', error)
    }
  }

  // Toggle active status
  const handleToggle = async (id: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('subscriptions')
        .update({ is_active: isActive } as never)
        .eq('id', id)
      if (error) throw error
      setSubscriptions(prev => 
        prev.map(s => s.id === id ? { ...s, is_active: isActive } : s)
      )
    } catch (error) {
      console.error('Error toggling subscription:', error)
    }
  }

  // Calculate monthly total
  const monthlyTotal = subscriptions
    .filter(s => s.is_active)
    .reduce((sum, s) => sum + s.amount, 0)

  // Upcoming this week
  const upcomingThisWeek = subscriptions.filter(s => {
    if (!s.is_active || !s.next_deduction_date) return false
    const days = Math.ceil((new Date(s.next_deduction_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    return days >= 0 && days <= 7
  })

  return (
    <PageContainer bottomPadding={false}>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white mb-1">Subscriptions</h1>
            <p className="text-slate-400">Track your recurring payments</p>
          </div>
          <Button
            variant="primary"
            onClick={() => {
              setEditingSubscription(null)
              setIsModalOpen(true)
            }}
            leftIcon={<Plus className="h-4 w-4" />}
          >
            Add Subscription
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <GlassCard size="md">
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Monthly Total</p>
              <p className="text-2xl font-bold font-mono text-rose-400">
                -{formatCurrency(monthlyTotal, 'SAR')}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {subscriptions.filter(s => s.is_active).length} active
              </p>
            </GlassCard>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <GlassCard size="md" className={upcomingThisWeek.length > 0 ? 'border-amber-500/30' : ''}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">This Week</p>
                  <p className="text-2xl font-bold font-mono text-amber-400">
                    {upcomingThisWeek.length}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">upcoming</p>
                </div>
                {upcomingThisWeek.length > 0 && (
                  <AlertTriangle className="h-5 w-5 text-amber-400" />
                )}
              </div>
            </GlassCard>
          </motion.div>
        </div>

        {/* Subscriptions List */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 text-emerald-400 animate-spin" />
          </div>
        ) : subscriptions.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <div className="p-4 rounded-2xl bg-white/5 inline-block mb-4">
              <CreditCard className="h-10 w-10 text-slate-500" />
            </div>
            <h3 className="text-lg font-medium text-slate-300 mb-2">No subscriptions yet</h3>
            <p className="text-slate-500 mb-4">Track Netflix, Spotify, gym, and more</p>
            <Button
              variant="primary"
              onClick={() => setIsModalOpen(true)}
              leftIcon={<Plus className="h-4 w-4" />}
            >
              Add Subscription
            </Button>
          </motion.div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence>
              {subscriptions.map(subscription => (
                <SubscriptionCard
                  key={subscription.id}
                  subscription={subscription}
                  accounts={accounts}
                  cards={cards}
                  onEdit={(s) => {
                    setEditingSubscription(s)
                    setIsModalOpen(true)
                  }}
                  onDelete={handleDelete}
                  onToggle={handleToggle}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </motion.div>

      {/* Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <SubscriptionModal
            subscription={editingSubscription}
            accounts={accounts}
            cards={cards}
            isOpen={isModalOpen}
            onClose={() => {
              setIsModalOpen(false)
              setEditingSubscription(null)
            }}
            onSave={handleSave}
          />
        )}
      </AnimatePresence>
    </PageContainer>
  )
}

