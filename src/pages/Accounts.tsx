import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Plus, 
  Building2, 
  Banknote, 
  Smartphone, 
  CreditCard,
  Star,
  Pencil,
  Trash2,
  X,
  Check,
  Loader2,
  ChevronDown,
  ChevronUp
} from 'lucide-react'
import { PageContainer } from '@/components/layout'
import { GlassCard, Button } from '@/components/ui'
import { cn } from '@/lib/utils'
import { formatCurrency } from '@/lib/utils'
import { useAuth, useData } from '@/context'
import { 
  ACCOUNT_TYPES, 
  ACCOUNT_COLORS, 
  CARD_TYPES,
  CARD_COLORS,
  type Account, 
  type AccountCard,
  type NewAccount,
  type NewAccountCard,
  type AccountWithCards 
} from '@/types/database'
import { getCurrencyOptions, type Currency } from '@/lib/currency'

// Icon mapping
const iconMap: Record<string, React.ElementType> = {
  'building-2': Building2,
  'banknote': Banknote,
  'smartphone': Smartphone,
  'credit-card': CreditCard,
}

// ===========================
// CARD ITEM COMPONENT
// ===========================
function CardItem({ 
  card, 
  onEdit, 
  onDelete 
}: { 
  card: AccountCard
  onEdit: (card: AccountCard) => void
  onDelete: (id: string) => void
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -10 }}
      className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10 group"
    >
      <div className="flex items-center gap-3">
        <div 
          className="w-8 h-5 rounded-md flex items-center justify-center text-[10px] font-bold"
          style={{ backgroundColor: card.color }}
        >
          {card.type === 'credit' ? 'CR' : 'DB'}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-white">{card.name}</span>
            {card.is_default && (
              <Star className="h-3 w-3 text-amber-400 fill-amber-400" />
            )}
          </div>
          <span className="text-xs text-slate-500">****{card.last_4_digits}</span>
        </div>
      </div>
      
      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => onEdit(card)}
          className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
        >
          <Pencil className="h-3 w-3" />
        </button>
        <button
          onClick={() => onDelete(card.id)}
          className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-colors"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>
    </motion.div>
  )
}

// ===========================
// ACCOUNT CARD COMPONENT (Parent with Children)
// ===========================
function AccountCard({ 
  account, 
  onEdit, 
  onDelete,
  onAddCard,
  onEditCard,
  onDeleteCard
}: { 
  account: AccountWithCards
  onEdit: (account: Account) => void
  onDelete: (id: string) => void
  onAddCard: (accountId: string) => void
  onEditCard: (card: AccountCard) => void
  onDeleteCard: (id: string) => void
}) {
  const [isExpanded, setIsExpanded] = useState(account.cards.length > 0)
  const Icon = iconMap[account.icon] || Building2
  const hasCards = account.cards.length > 0
  const isBankAccount = account.type === 'bank'
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      layout
    >
      <GlassCard 
        size="md" 
        className="relative overflow-hidden"
        style={{ borderColor: `${account.color}30` }}
      >
        {/* Color accent */}
        <div 
          className="absolute top-0 left-0 w-1 h-full"
          style={{ backgroundColor: account.color }}
        />
        
        {/* Main Account Row */}
        <div className="flex items-center gap-4 pl-3">
          {/* Icon */}
          <div 
            className="p-3 rounded-xl"
            style={{ backgroundColor: `${account.color}20` }}
          >
            <Icon className="h-6 w-6" style={{ color: account.color }} />
          </div>

          {/* Details */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-white truncate">{account.name}</h3>
              {account.is_default && (
                <Star className="h-4 w-4 text-amber-400 fill-amber-400 flex-shrink-0" />
              )}
            </div>
            <p className="text-sm text-slate-500">
              {ACCOUNT_TYPES.find(t => t.value === account.type)?.label}
              {hasCards && ` • ${account.cards.length} card${account.cards.length !== 1 ? 's' : ''}`}
            </p>
          </div>

          {/* Balance */}
          <div className="text-right">
            <div className={cn(
              'text-xl font-bold font-mono',
              account.balance >= 0 ? 'text-emerald-400' : 'text-rose-400'
            )}>
              {formatCurrency(account.balance, account.currency)}
            </div>
            <p className="text-xs text-slate-500">{account.currency}</p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1">
            {/* Expand/Collapse for bank accounts */}
            {isBankAccount && (
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className={cn(
                  'p-2 rounded-lg transition-colors',
                  hasCards 
                    ? 'bg-white/5 hover:bg-white/10 text-slate-400' 
                    : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400'
                )}
                title={hasCards ? (isExpanded ? 'Hide cards' : 'Show cards') : 'Add card'}
              >
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </button>
            )}
            
            <button
              onClick={() => onEdit(account)}
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
            >
              <Pencil className="h-4 w-4" />
            </button>
            <button
              onClick={() => onDelete(account.id)}
              className="p-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-colors"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Cards Section (Only for bank accounts) */}
        {isBankAccount && (
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="mt-4 pt-4 pl-3 border-t border-white/10 space-y-2">
                  {/* Cards List */}
                  <AnimatePresence>
                    {account.cards.map(card => (
                      <CardItem
                        key={card.id}
                        card={card}
                        onEdit={onEditCard}
                        onDelete={onDeleteCard}
                      />
                    ))}
                  </AnimatePresence>

                  {/* Add Card Button */}
                  <button
                    onClick={() => onAddCard(account.id)}
                    className="w-full flex items-center justify-center gap-2 p-3 rounded-xl border-2 border-dashed border-white/10 hover:border-emerald-500/30 hover:bg-emerald-500/5 text-slate-500 hover:text-emerald-400 transition-all"
                  >
                    <Plus className="h-4 w-4" />
                    <span className="text-sm font-medium">Add Card</span>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </GlassCard>
    </motion.div>
  )
}

// ===========================
// ADD/EDIT ACCOUNT MODAL
// ===========================
function AccountModal({
  account,
  isOpen,
  onClose,
  onSave
}: {
  account: Account | null
  isOpen: boolean
  onClose: () => void
  onSave: (data: NewAccount) => Promise<void>
}) {
  const { user } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [form, setForm] = useState({
    name: '',
    type: 'bank' as 'bank' | 'cash' | 'wallet',
    balance: 0,
    currency: 'SAR' as Currency,
    is_default: false,
    color: ACCOUNT_COLORS[0],
  })

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      if (account) {
        setForm({
          name: account.name,
          type: account.type,
          balance: account.balance,
          currency: account.currency as Currency,
          is_default: account.is_default,
          color: account.color,
        })
      } else {
        setForm({
          name: '',
          type: 'bank',
          balance: 0,
          currency: 'SAR',
          is_default: false,
          color: ACCOUNT_COLORS[Math.floor(Math.random() * ACCOUNT_COLORS.length)],
        })
      }
    }
  }, [isOpen, account])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setIsLoading(true)
    try {
      await onSave({
        ...form,
        user_id: user.id,
        icon: ACCOUNT_TYPES.find(t => t.value === form.type)?.icon || 'building-2',
      })
      onClose()
    } catch (error) {
      console.error('Error saving account:', error)
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
        className="w-full max-w-md"
        onClick={e => e.stopPropagation()}
      >
        <GlassCard size="lg" className="relative">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white">
              {account ? 'Edit Account' : 'Add Account'}
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
                Account Name
              </label>
              <input
                type="text"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g., AlRajhi Main"
                required
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              />
            </div>

            {/* Type - No more credit_card option */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                Account Type
              </label>
              <div className="grid grid-cols-3 gap-2">
                {ACCOUNT_TYPES.map(type => {
                  const Icon = iconMap[type.icon] || Building2
                  return (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, type: type.value }))}
                      className={cn(
                        'flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all',
                        form.type === type.value
                          ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400'
                          : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'
                      )}
                    >
                      <Icon className="h-5 w-5" />
                      <span className="text-xs">{type.label}</span>
                    </button>
                  )
                })}
              </div>
              {form.type === 'bank' && (
                <p className="mt-2 text-xs text-slate-500">
                  💡 Bank accounts can have multiple cards linked to them
                </p>
              )}
            </div>

            {/* Balance & Currency */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  Current Balance
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={form.balance}
                  onChange={e => setForm(f => ({ ...f, balance: parseFloat(e.target.value) || 0 }))}
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

            {/* Color Picker */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                Color
              </label>
              <div className="flex gap-2 flex-wrap">
                {ACCOUNT_COLORS.map(color => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, color }))}
                    className={cn(
                      'w-8 h-8 rounded-full transition-transform',
                      form.color === color && 'ring-2 ring-white ring-offset-2 ring-offset-slate-900 scale-110'
                    )}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>

            {/* Default Toggle */}
            <label className="flex items-center gap-3 p-3 rounded-xl bg-white/5 cursor-pointer">
              <div className={cn(
                'w-10 h-6 rounded-full transition-colors relative',
                form.is_default ? 'bg-emerald-500' : 'bg-slate-600'
              )}>
                <div className={cn(
                  'absolute top-1 w-4 h-4 rounded-full bg-white transition-transform',
                  form.is_default ? 'translate-x-5' : 'translate-x-1'
                )} />
              </div>
              <input
                type="checkbox"
                checked={form.is_default}
                onChange={e => setForm(f => ({ ...f, is_default: e.target.checked }))}
                className="sr-only"
              />
              <div>
                <p className="text-white font-medium">Set as Default</p>
                <p className="text-xs text-slate-500">Use this account for quick transactions</p>
              </div>
            </label>

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
                disabled={!form.name || isLoading}
                className="flex-1"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    {account ? 'Save Changes' : 'Add Account'}
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

// ===========================
// ADD/EDIT CARD MODAL
// ===========================
function CardModal({
  card,
  accountId,
  isOpen,
  onClose,
  onSave
}: {
  card: AccountCard | null
  accountId: string | null
  isOpen: boolean
  onClose: () => void
  onSave: (data: NewAccountCard) => Promise<void>
}) {
  const { user } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [form, setForm] = useState({
    name: '',
    last_4_digits: '',
    type: 'credit' as 'credit' | 'debit',
    is_default: false,
    color: CARD_COLORS[0],
  })

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      if (card) {
        setForm({
          name: card.name,
          last_4_digits: card.last_4_digits,
          type: card.type,
          is_default: card.is_default,
          color: card.color,
        })
      } else {
        setForm({
          name: '',
          last_4_digits: '',
          type: 'credit',
          is_default: false,
          color: CARD_COLORS[Math.floor(Math.random() * CARD_COLORS.length)],
        })
      }
    }
  }, [isOpen, card])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !accountId) return

    setIsLoading(true)
    try {
      await onSave({
        ...form,
        user_id: user.id,
        account_id: accountId,
      })
      onClose()
    } catch (error) {
      console.error('Error saving card:', error)
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
        className="w-full max-w-md"
        onClick={e => e.stopPropagation()}
      >
        <GlassCard size="lg" className="relative">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white">
              {card ? 'Edit Card' : 'Add Card'}
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
            {/* Card Name */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                Card Name
              </label>
              <input
                type="text"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g., Platinum Visa"
                required
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              />
            </div>

            {/* Last 4 Digits */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                Last 4 Digits
              </label>
              <input
                type="text"
                maxLength={4}
                value={form.last_4_digits}
                onChange={e => setForm(f => ({ ...f, last_4_digits: e.target.value.replace(/\D/g, '') }))}
                placeholder="e.g., 8844"
                required
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 font-mono tracking-widest"
              />
              <p className="mt-1 text-xs text-slate-500">
                Used to automatically match transactions
              </p>
            </div>

            {/* Card Type */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                Card Type
              </label>
              <div className="grid grid-cols-2 gap-2">
                {CARD_TYPES.map(type => (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, type: type.value }))}
                    className={cn(
                      'flex items-center justify-center gap-2 p-3 rounded-xl border transition-all',
                      form.type === type.value
                        ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400'
                        : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'
                    )}
                  >
                    <CreditCard className="h-4 w-4" />
                    <span className="text-sm">{type.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Color Picker */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                Card Color
              </label>
              <div className="flex gap-2 flex-wrap">
                {CARD_COLORS.map(color => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, color }))}
                    className={cn(
                      'w-8 h-8 rounded-full transition-transform',
                      form.color === color && 'ring-2 ring-white ring-offset-2 ring-offset-slate-900 scale-110'
                    )}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>

            {/* Default Toggle */}
            <label className="flex items-center gap-3 p-3 rounded-xl bg-white/5 cursor-pointer">
              <div className={cn(
                'w-10 h-6 rounded-full transition-colors relative',
                form.is_default ? 'bg-emerald-500' : 'bg-slate-600'
              )}>
                <div className={cn(
                  'absolute top-1 w-4 h-4 rounded-full bg-white transition-transform',
                  form.is_default ? 'translate-x-5' : 'translate-x-1'
                )} />
              </div>
              <input
                type="checkbox"
                checked={form.is_default}
                onChange={e => setForm(f => ({ ...f, is_default: e.target.checked }))}
                className="sr-only"
              />
              <div>
                <p className="text-white font-medium">Set as Default</p>
                <p className="text-xs text-slate-500">Default card for this bank account</p>
              </div>
            </label>

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
                disabled={!form.name || form.last_4_digits.length !== 4 || isLoading}
                className="flex-1"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    {card ? 'Save Changes' : 'Add Card'}
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

// ===========================
// MAIN ACCOUNTS PAGE
// ===========================
export function AccountsPage() {
  const { 
    accountsWithCards, 
    refreshAccounts,
    addAccount,
    updateAccount,
    deleteAccount,
    addCard,
    updateCard,
    deleteCard
  } = useData()
  
  const [isLoading, setIsLoading] = useState(true)
  
  // Account Modal State
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false)
  const [editingAccount, setEditingAccount] = useState<Account | null>(null)
  
  // Card Modal State
  const [isCardModalOpen, setIsCardModalOpen] = useState(false)
  const [editingCard, setEditingCard] = useState<AccountCard | null>(null)
  const [cardParentAccountId, setCardParentAccountId] = useState<string | null>(null)

  // Initial fetch
  useEffect(() => {
    const load = async () => {
      await refreshAccounts()
      setIsLoading(false)
    }
    load()
  }, [refreshAccounts])

  // Account handlers
  const handleSaveAccount = async (data: NewAccount) => {
    if (editingAccount) {
      await updateAccount(editingAccount.id, data)
    } else {
      await addAccount(data)
    }
  }

  const handleDeleteAccount = async (id: string) => {
    const account = accountsWithCards.find(a => a.id === id)
    const cardCount = account?.cards.length || 0
    
    const message = cardCount > 0 
      ? `Delete "${account?.name}" and ${cardCount} linked card${cardCount !== 1 ? 's' : ''}? Transactions will keep their history.`
      : `Delete "${account?.name}"? Transactions will keep their history.`
    
    if (!confirm(message)) return
    await deleteAccount(id)
  }

  // Card handlers
  const handleAddCard = (accountId: string) => {
    setEditingCard(null)
    setCardParentAccountId(accountId)
    setIsCardModalOpen(true)
  }

  const handleEditCard = (card: AccountCard) => {
    setEditingCard(card)
    setCardParentAccountId(card.account_id)
    setIsCardModalOpen(true)
  }

  const handleSaveCard = async (data: NewAccountCard) => {
    if (editingCard) {
      await updateCard(editingCard.id, data)
    } else {
      await addCard(data)
    }
  }

  const handleDeleteCard = async (id: string) => {
    if (!confirm('Delete this card? Transactions will keep their history.')) return
    await deleteCard(id)
  }

  // Calculate total balance
  const totalBalance = accountsWithCards.reduce((sum, a) => sum + a.balance, 0)
  const totalCards = accountsWithCards.reduce((sum, a) => sum + a.cards.length, 0)

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
            <h1 className="text-2xl font-bold text-white mb-1">Accounts</h1>
            <p className="text-slate-400">Manage your financial accounts & cards</p>
          </div>
          <Button
            variant="primary"
            onClick={() => {
              setEditingAccount(null)
              setIsAccountModalOpen(true)
            }}
            leftIcon={<Plus className="h-4 w-4" />}
          >
            Add Account
          </Button>
        </div>

        {/* Total Balance Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <GlassCard size="lg" className="bg-gradient-to-br from-emerald-500/10 to-blue-500/10">
            <div className="text-center">
              <p className="text-sm text-slate-400 mb-1">Total Balance</p>
              <p className={cn(
                'text-4xl font-bold font-mono',
                totalBalance >= 0 ? 'text-emerald-400' : 'text-rose-400'
              )}>
                {formatCurrency(totalBalance, 'SAR')}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {accountsWithCards.length} account{accountsWithCards.length !== 1 ? 's' : ''} • {totalCards} card{totalCards !== 1 ? 's' : ''}
              </p>
            </div>
          </GlassCard>
        </motion.div>

        {/* Accounts List */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 text-emerald-400 animate-spin" />
          </div>
        ) : accountsWithCards.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <div className="p-4 rounded-2xl bg-white/5 inline-block mb-4">
              <Building2 className="h-10 w-10 text-slate-500" />
            </div>
            <h3 className="text-lg font-medium text-slate-300 mb-2">No accounts yet</h3>
            <p className="text-slate-500 mb-4">Add your first bank account to start tracking</p>
            <Button
              variant="primary"
              onClick={() => setIsAccountModalOpen(true)}
              leftIcon={<Plus className="h-4 w-4" />}
            >
              Add Account
            </Button>
          </motion.div>
        ) : (
          <div className="space-y-4">
            <AnimatePresence>
              {accountsWithCards.map(account => (
                <AccountCard
                  key={account.id}
                  account={account}
                  onEdit={(a) => {
                    setEditingAccount(a)
                    setIsAccountModalOpen(true)
                  }}
                  onDelete={handleDeleteAccount}
                  onAddCard={handleAddCard}
                  onEditCard={handleEditCard}
                  onDeleteCard={handleDeleteCard}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </motion.div>

      {/* Account Modal */}
      <AnimatePresence>
        {isAccountModalOpen && (
          <AccountModal
            account={editingAccount}
            isOpen={isAccountModalOpen}
            onClose={() => {
              setIsAccountModalOpen(false)
              setEditingAccount(null)
            }}
            onSave={handleSaveAccount}
          />
        )}
      </AnimatePresence>

      {/* Card Modal */}
      <AnimatePresence>
        {isCardModalOpen && (
          <CardModal
            card={editingCard}
            accountId={cardParentAccountId}
            isOpen={isCardModalOpen}
            onClose={() => {
              setIsCardModalOpen(false)
              setEditingCard(null)
              setCardParentAccountId(null)
            }}
            onSave={handleSaveCard}
          />
        )}
      </AnimatePresence>
    </PageContainer>
  )
}

export default AccountsPage
