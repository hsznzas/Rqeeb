import { useState, useRef, useEffect, useCallback, forwardRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Send, 
  Loader2, 
  TrendingUp, 
  TrendingDown,
  Wallet,
  RefreshCw,
  AlertCircle,
  Sparkles,
  Coffee,
  Car,
  ShoppingBag,
  Zap,
  ShoppingCart,
  Heart,
  ArrowLeftRight,
  HelpCircle,
  Trash2,
  Music,
  DollarSign,
  Building2,
  CreditCard,
  Smartphone,
  Banknote,
  Star,
  Settings,
  BarChart3,
  LogOut,
  X,
  ChevronRight
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatCurrency } from '@/lib/utils'
import { formatFeedDate } from '@/lib/dateUtils'
import { useAuth } from '@/context'
import { supabase } from '@/services/supabase'
import { parseTransactions, isBulkParseError, matchPaymentHint, type ParsedTransaction, type BulkParseResult } from '@/lib/ai'
import { convertAmount, type Currency, formatCurrencyWithSymbol } from '@/lib/currency'
import { generateId } from '@/lib/utils'
import { toISODateString } from '@/lib/dateUtils'
import type { Account, AccountCard, Transaction, Beneficiary, NewSubscription, TransactionAttachment } from '@/types/database'
import { 
  TransactionDetailModal, 
  TransactionInputToolbar, 
  getDefaultToolbarState, 
  type ToolbarState,
  ConflictModal,
  type ConflictData
} from '@/components/feed'

// Extended transaction type for UI
interface UITransaction {
  id: string
  user_id: string
  amount: number
  currency: string
  direction: 'in' | 'out'
  category: string
  merchant: string | null
  transaction_date: string
  transaction_time: string | null
  raw_log_id: string | null
  account_id: string | null
  card_id: string | null
  original_amount: number | null
  original_currency: string | null
  conversion_rate: number | null
  notes: string | null
  description: string | null
  logo_url: string | null
  beneficiary_id: string | null
  is_reimbursable: boolean
  created_at: string
  // UI state
  isOptimistic?: boolean
  isFailed?: boolean
  isProcessing?: boolean
}

// Category icons mapping
const categoryIcons: Record<string, React.ElementType> = {
  'Food & Dining': Coffee,
  'Transportation': Car,
  'Shopping': ShoppingBag,
  'Bills & Utilities': Zap,
  'Groceries': ShoppingCart,
  'Health': Heart,
  'Transfer': ArrowLeftRight,
  'Entertainment': Music,
  'Income': DollarSign,
  'Other': HelpCircle,
  'Processing...': Loader2,
  'Failed': AlertCircle,
}

// Category colors
const categoryColors: Record<string, string> = {
  'Food & Dining': 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  'Transportation': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  'Shopping': 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  'Bills & Utilities': 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  'Groceries': 'bg-green-500/20 text-green-400 border-green-500/30',
  'Health': 'bg-pink-500/20 text-pink-400 border-pink-500/30',
  'Transfer': 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  'Entertainment': 'bg-violet-500/20 text-violet-400 border-violet-500/30',
  'Income': 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  'Other': 'bg-slate-500/20 text-slate-400 border-slate-500/30',
  'Processing...': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  'Failed': 'bg-rose-500/20 text-rose-400 border-rose-500/30',
}

// Account icon mapping
const accountIcons: Record<string, React.ElementType> = {
  'building-2': Building2,
  'banknote': Banknote,
  'smartphone': Smartphone,
  'credit-card': CreditCard,
}

// Transaction Card Component
interface TransactionCardProps {
  transaction: UITransaction
  account?: Account
  card?: AccountCard
  index: number
  onDelete: (id: string) => void
  onClick: () => void
}

const TransactionCard = forwardRef<HTMLDivElement, TransactionCardProps>(
  function TransactionCard({ transaction, account, card, index, onDelete, onClick }, ref) {
    const isIncome = transaction.direction === 'in'
    const isProcessing = transaction.isProcessing
    const hasConversion = transaction.original_amount && transaction.original_currency
    
    // Use custom logo/emoji if available, otherwise category icon
    const hasCustomLogo = transaction.logo_url && transaction.logo_url.length > 0
    const isEmoji = hasCustomLogo && transaction.logo_url!.length <= 2
    const Icon = categoryIcons[transaction.category] || HelpCircle
    const colorClass = categoryColors[transaction.category] || categoryColors['Other']

    return (
      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, x: -100, scale: 0.95 }}
        transition={{ duration: 0.3, delay: index * 0.03, ease: 'easeOut' }}
        layout
        onClick={isProcessing ? undefined : onClick}
        className={cn(
          'group relative p-4 rounded-2xl cursor-pointer',
          'bg-white/[0.03] hover:bg-white/[0.06]',
          'border border-white/[0.06] hover:border-white/10',
          'transition-all duration-200',
          isProcessing && 'animate-pulse cursor-default',
          transaction.isFailed && 'border-rose-500/30 bg-rose-500/[0.05]'
        )}
      >
        <div className="flex items-center gap-4">
          {/* Category Icon or Custom Logo */}
          <div className={cn('shrink-0 p-3 rounded-xl border flex items-center justify-center', colorClass)}>
            {hasCustomLogo ? (
              isEmoji ? (
                <span className="text-xl">{transaction.logo_url}</span>
              ) : (
                <img 
                  src={transaction.logo_url!} 
                  alt="" 
                  className="h-5 w-5 rounded object-cover"
                />
              )
            ) : (
              <Icon className={cn('h-5 w-5', isProcessing && 'animate-spin')} />
            )}
          </div>

          {/* Details */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-medium text-white truncate">
                {transaction.merchant || transaction.category}
              </h3>
              {isProcessing && (
                <span className="text-xs text-blue-400 flex items-center gap-1">
                  <Sparkles className="h-3 w-3" />
                  Thinking...
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <span>{transaction.category}</span>
              {/* Show account/card info */}
              {account && (
                <>
                  <span>•</span>
                  <span className="truncate flex items-center gap-1">
                    {account.name}
                    {card && (
                      <span className="text-slate-600">
                        ****{card.last_4_digits}
                      </span>
                    )}
                  </span>
                </>
              )}
              <span>•</span>
              <span>{formatFeedDate(transaction.transaction_time || transaction.created_at)}</span>
            </div>
            {/* Description preview */}
            {transaction.description && (
              <p className="text-xs text-slate-600 mt-1 truncate">{transaction.description}</p>
            )}
          </div>

          {/* Amount */}
          {!isProcessing && (
            <div className="shrink-0 text-right">
              <div className={cn(
                'font-semibold font-mono text-lg',
                isIncome ? 'text-emerald-400' : 'text-rose-400'
              )}>
                {isIncome ? '+' : '-'}{formatCurrency(transaction.amount, transaction.currency)}
              </div>
              {hasConversion && (
                <div className="text-xs text-slate-500">
                  ({formatCurrencyWithSymbol(transaction.original_amount!, transaction.original_currency as Currency)})
                </div>
              )}
            </div>
          )}

          {/* Delete button */}
          {!isProcessing && (
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(transaction.id) }}
              className={cn(
                'absolute right-2 top-2',
                'p-2 rounded-lg',
                'bg-rose-500/10 text-rose-400',
                'opacity-0 group-hover:opacity-100',
                'transition-opacity duration-200',
                'hover:bg-rose-500/20'
              )}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </motion.div>
    )
  }
)

// Account Selection Modal (Clarification Flow) with Card Support
function AccountSelectionModal({
  isOpen,
  parsedData,
  accounts,
  cards,
  onSelect,
  onCancel
}: {
  isOpen: boolean
  parsedData: ParsedTransaction | null
  accounts: Account[]
  cards: AccountCard[]
  onSelect: (accountId: string, cardId: string | null) => void
  onCancel: () => void
}) {
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null)
  const [showCards, setShowCards] = useState(false)

  // Get cards for selected account
  const accountCards = selectedAccount 
    ? cards.filter(c => c.account_id === selectedAccount)
    : []

  // Reset when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedAccount(null)
      setShowCards(false)
    }
  }, [isOpen])

  const handleAccountClick = (accountId: string) => {
    const account = accounts.find(a => a.id === accountId)
    const cardsForAccount = cards.filter(c => c.account_id === accountId)
    
    if (account?.type === 'bank' && cardsForAccount.length > 0) {
      // Bank with cards - show card selection
      setSelectedAccount(accountId)
      setShowCards(true)
    } else {
      // No cards - select directly
      onSelect(accountId, null)
    }
  }

  const handleCardClick = (cardId: string | null) => {
    if (selectedAccount) {
      onSelect(selectedAccount, cardId)
    }
  }

  if (!isOpen || !parsedData) return null

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onCancel}
    >
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        className="w-full max-w-md"
        onClick={e => e.stopPropagation()}
      >
        <div className="backdrop-blur-xl bg-white/[0.08] border border-white/10 rounded-3xl p-6 shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-emerald-400" />
              <span className="text-sm text-slate-400">
                {showCards ? 'Select card' : 'We recognized'}
              </span>
            </div>
            <button
              onClick={showCards ? () => setShowCards(false) : onCancel}
              className="p-2 rounded-lg hover:bg-white/10 text-slate-400"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Transaction Preview */}
          {!showCards && (
            <div className="p-4 rounded-2xl bg-white/[0.05] border border-white/[0.08] mb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-white">
                    {parsedData.merchant || parsedData.category}
                  </p>
                  <p className="text-sm text-slate-500">{parsedData.category}</p>
                </div>
                <div className={cn(
                  'text-xl font-bold font-mono',
                  parsedData.direction === 'in' ? 'text-emerald-400' : 'text-rose-400'
                )}>
                  {parsedData.direction === 'in' ? '+' : '-'}
                  {formatCurrency(parsedData.amount, parsedData.currency)}
                </div>
              </div>
            </div>
          )}

          {/* Question */}
          <p className="text-white font-medium mb-3">
            {showCards ? 'Which card did you use?' : 'Which account?'}
          </p>

          {/* Account/Card Options */}
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {showCards ? (
              // Card Selection
              <>
                {accountCards.map(card => (
                  <button
                    key={card.id}
                    onClick={() => handleCardClick(card.id)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.08] hover:border-white/10 transition-all"
                  >
                    <div 
                      className="w-10 h-6 rounded-md flex items-center justify-center text-[10px] font-bold"
                      style={{ backgroundColor: card.color }}
                    >
                      {card.type === 'credit' ? 'CR' : 'DB'}
                    </div>
                    <div className="flex-1 text-left">
                      <div className="flex items-center gap-2">
                        <span className="text-white font-medium">{card.name}</span>
                        {card.is_default && (
                          <Star className="h-3 w-3 text-amber-400 fill-amber-400" />
                        )}
                      </div>
                      <span className="text-xs text-slate-500">****{card.last_4_digits}</span>
                    </div>
                  </button>
                ))}
                {/* Skip card selection */}
                <button
                  onClick={() => handleCardClick(null)}
                  className="w-full p-3 rounded-xl text-slate-500 hover:text-slate-400 hover:bg-white/[0.03] transition-colors text-sm"
                >
                  Skip card selection
                </button>
              </>
            ) : (
              // Account Selection
              accounts.map(account => {
                const Icon = accountIcons[account.icon] || CreditCard
                const accountCardsCount = cards.filter(c => c.account_id === account.id).length
                const isBankWithCards = account.type === 'bank' && accountCardsCount > 0
                
                return (
                  <button
                    key={account.id}
                    onClick={() => handleAccountClick(account.id)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.08] hover:border-white/10 transition-all"
                  >
                    <div 
                      className="p-2 rounded-lg"
                      style={{ backgroundColor: `${account.color}20` }}
                    >
                      <Icon className="h-4 w-4" style={{ color: account.color }} />
                    </div>
                    <div className="flex-1 text-left">
                      <div className="flex items-center gap-2">
                        <span className="text-white font-medium">{account.name}</span>
                        {account.is_default && (
                          <Star className="h-3 w-3 text-amber-400 fill-amber-400" />
                        )}
                      </div>
                      {isBankWithCards && (
                        <span className="text-xs text-slate-500">
                          {accountCardsCount} card{accountCardsCount !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                    <span className="text-sm text-slate-400">{account.currency}</span>
                    {isBankWithCards && (
                      <ChevronRight className="h-4 w-4 text-slate-500" />
                    )}
                  </button>
                )
              })
            )}
          </div>

          {/* Skip Option */}
          {!showCards && (
            <button
              onClick={() => onSelect('', null)}
              className="w-full mt-3 p-3 rounded-xl text-slate-500 hover:text-slate-400 hover:bg-white/[0.03] transition-colors text-sm"
            >
              Skip (save without account)
            </button>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}

// Summary Header Component
function SummaryHeader({ 
  accounts, 
  summary,
  displayCurrency
}: { 
  accounts: Account[]
  summary: { income: number; expenses: number; net: number; count: number }
  displayCurrency: Currency
}) {
  const { signOut } = useAuth()
  const defaultAccount = accounts.find(a => a.is_default)

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="backdrop-blur-xl bg-white/[0.03] border-b border-white/[0.06] sticky top-0 z-20"
    >
      <div className="max-w-2xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Net Worth Section */}
          <div className="flex items-center gap-4">
            <div className="p-2.5 rounded-xl bg-white/[0.05]">
              <Wallet className="h-5 w-5 text-slate-300" />
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider">Net Balance</p>
              <div className={cn(
                'text-2xl font-bold font-mono',
                summary.net >= 0 ? 'text-emerald-400' : 'text-rose-400'
              )}>
                {summary.net >= 0 ? '+' : ''}{formatCurrency(summary.net, displayCurrency)}
              </div>
            </div>
          </div>

          {/* Quick Stats & Nav */}
          <div className="flex items-center gap-3">
            <div className="text-right mr-2">
              <div className="flex items-center gap-1 text-emerald-400">
                <TrendingUp className="h-3 w-3" />
                <span className="text-xs font-medium">{formatCurrency(summary.income, displayCurrency)}</span>
              </div>
              <div className="flex items-center gap-1 text-rose-400">
                <TrendingDown className="h-3 w-3" />
                <span className="text-xs font-medium">{formatCurrency(summary.expenses, displayCurrency)}</span>
              </div>
            </div>

            {/* Navigation */}
            <a
              href="/accounts"
              className="p-2.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.08] transition-colors"
              title="Accounts"
            >
              <CreditCard className="h-4 w-4 text-slate-400" />
            </a>
            <a
              href="/subscriptions"
              className="p-2.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.08] transition-colors"
              title="Subscriptions"
            >
              <RefreshCw className="h-4 w-4 text-slate-400" />
            </a>
            <a
              href="/analytics"
              className="p-2.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.08] transition-colors"
              title="Analytics"
            >
              <BarChart3 className="h-4 w-4 text-slate-400" />
            </a>
            <a
              href="/settings"
              className="p-2.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.08] transition-colors"
              title="Settings"
            >
              <Settings className="h-4 w-4 text-slate-400" />
            </a>
            <button
              onClick={() => signOut()}
              className="p-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 transition-colors"
              title="Sign Out"
            >
              <LogOut className="h-4 w-4 text-rose-400" />
            </button>
          </div>
        </div>

        {/* Default Account Indicator */}
        {defaultAccount && (
          <div className="mt-3 pt-3 border-t border-white/[0.06]">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span>Default:</span>
              <div 
                className="flex items-center gap-1.5 px-2 py-1 rounded-lg"
                style={{ backgroundColor: `${defaultAccount.color}15` }}
              >
                <div 
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: defaultAccount.color }}
                />
                <span style={{ color: defaultAccount.color }}>{defaultAccount.name}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  )
}

// Input Dock Component
function InputDock({
  accounts,
  cards,
  beneficiaries,
  toolbarState,
  onToolbarChange,
  onAddBeneficiary,
  onSubmit,
  isSubmitting
}: {
  accounts: Account[]
  cards: AccountCard[]
  beneficiaries: Beneficiary[]
  toolbarState: ToolbarState
  onToolbarChange: (state: ToolbarState) => void
  onAddBeneficiary: (name: string) => Promise<Beneficiary | null>
  onSubmit: (text: string) => void
  isSubmitting: boolean
}) {
  const [input, setInput] = useState('')
  const [feedback, setFeedback] = useState<{ type: 'error' | 'success'; message: string } | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Get selected account for display
  const selectedAccount = accounts.find(a => a.id === toolbarState.accountId)
  const selectedCard = cards.find(c => c.id === toolbarState.cardId)

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
    setFeedback(null)
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`
    }
  }, [])

  const handleSubmit = useCallback(() => {
    if (!input.trim() || isSubmitting) return
    onSubmit(input.trim())
    setInput('')
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }, [input, isSubmitting, onSubmit])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }, [handleSubmit])

  // Get placeholder text based on toolbar state
  const getPlaceholder = () => {
    if (selectedCard) {
      return `Type transaction... (${selectedCard.name} ****${selectedCard.last_4_digits})`
    }
    if (selectedAccount) {
      return `Type transaction... (${selectedAccount.name})`
    }
    return "Type or paste transaction..."
  }

  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: 'easeOut', delay: 0.3 }}
      className="fixed bottom-0 left-0 right-0 z-50"
    >
      <div className="absolute inset-x-0 -top-20 h-20 bg-gradient-to-t from-slate-950 to-transparent pointer-events-none" />
      
      <div className="relative bg-slate-950/90 backdrop-blur-xl border-t border-white/[0.06]">
        <div className="max-w-2xl mx-auto px-4 py-4">
          {/* Feedback */}
          <AnimatePresence>
            {feedback && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-xl mb-3 text-sm',
                  feedback.type === 'success' 
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                    : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                )}
              >
                {feedback.type === 'success' ? <Sparkles className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                <span>{feedback.message}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Smart Toolbar */}
          <TransactionInputToolbar
            accounts={accounts}
            cards={cards}
            beneficiaries={beneficiaries}
            value={toolbarState}
            onChange={onToolbarChange}
            onAddBeneficiary={onAddBeneficiary}
            disabled={isSubmitting}
          />

          {/* Input Area */}
          <div className={cn(
            'relative flex items-end gap-2 p-2 rounded-2xl',
            'bg-white/[0.05] border border-white/[0.08]',
            'focus-within:border-emerald-500/30 focus-within:bg-white/[0.07]',
            'transition-all duration-200'
          )}>
            {/* Text Input */}
            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder={getPlaceholder()}
              rows={1}
              disabled={isSubmitting}
              className={cn(
                'flex-1 bg-transparent border-none resize-none',
                'text-white placeholder:text-slate-500',
                'py-3 px-2 max-h-[120px]',
                'focus:outline-none',
                'disabled:opacity-50'
              )}
            />

            {/* Send Button */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleSubmit}
              disabled={!input.trim() || isSubmitting}
              className={cn(
                'shrink-0 p-3 rounded-xl',
                'transition-all duration-200',
                input.trim() && !isSubmitting
                  ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/25' 
                  : 'bg-white/[0.05] text-slate-500 cursor-not-allowed'
              )}
            >
              {isSubmitting ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}
            </motion.button>
          </div>

          <p className="text-center text-xs text-slate-600 mt-2">
            Press <kbd className="px-1.5 py-0.5 rounded bg-white/[0.05] text-slate-500">Enter</kbd> to send
          </p>
        </div>
      </div>
    </motion.div>
  )
}

// Empty State Component
function EmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-20 px-4"
    >
      <div className="p-6 rounded-3xl bg-gradient-to-br from-emerald-500/10 to-amber-500/10 border border-white/[0.06] mb-6">
        <Sparkles className="h-12 w-12 text-emerald-400" />
      </div>
      <h3 className="text-xl font-semibold text-white mb-2">Your Financial Feed</h3>
      <p className="text-slate-400 text-center max-w-sm mb-4">
        Start by typing a transaction, pasting a bank SMS, or describing your spending.
      </p>
      <div className="flex flex-wrap gap-2 justify-center">
        {['Coffee 25 SAR', 'Uber 45 on Visa 8844', 'Salary 8000'].map((example) => (
          <span 
            key={example}
            className="px-3 py-1.5 rounded-full bg-white/[0.05] text-slate-400 text-sm border border-white/[0.06]"
          >
            "{example}"
          </span>
        ))}
      </div>
    </motion.div>
  )
}

// Main Home Page Component
export function HomePage() {
  const { user, defaultCurrency } = useAuth()
  const feedRef = useRef<HTMLDivElement>(null)
  
  // State
  const [transactions, setTransactions] = useState<UITransaction[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [cards, setCards] = useState<AccountCard[]>([])
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Toolbar state
  const [toolbarState, setToolbarState] = useState<ToolbarState>(() => 
    getDefaultToolbarState([], defaultCurrency)
  )
  
  // Clarification modal state
  const [showClarification, setShowClarification] = useState(false)
  const [pendingParsedData, setPendingParsedData] = useState<ParsedTransaction | null>(null)
  const [pendingTempId, setPendingTempId] = useState<string | null>(null)
  // For bulk transactions that need clarification
  const [pendingBulkTransactions, setPendingBulkTransactions] = useState<{ parsed: ParsedTransaction; tempId: string }[]>([])
  
  // Conflict modal state
  const [showConflictModal, setShowConflictModal] = useState(false)
  const [conflictData, setConflictData] = useState<ConflictData | null>(null)
  const [pendingConflictTx, setPendingConflictTx] = useState<{ parsed: ParsedTransaction; tempId: string } | null>(null)
  
  // Transaction detail modal state
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [selectedTransaction, setSelectedTransaction] = useState<UITransaction | null>(null)
  const [transactionAttachments, setTransactionAttachments] = useState<TransactionAttachment[]>([])

  // Get default account
  const defaultAccount = accounts.find(a => a.is_default)

  // Calculate summary
  const summary = {
    income: transactions.filter(t => t.direction === 'in' && !t.isOptimistic).reduce((s, t) => s + t.amount, 0),
    expenses: transactions.filter(t => t.direction === 'out' && !t.isOptimistic).reduce((s, t) => s + t.amount, 0),
    net: 0,
    count: transactions.filter(t => !t.isOptimistic).length
  }
  summary.net = summary.income - summary.expenses

  // Fetch data
  const fetchData = useCallback(async () => {
    if (!user) return

    try {
      const [txRes, accRes, cardRes, benRes] = await Promise.all([
        supabase
          .from('transactions')
          .select('*')
          .eq('user_id', user.id)
          .limit(100),
        supabase
          .from('accounts')
          .select('*')
          .eq('user_id', user.id),
        supabase
          .from('account_cards')
          .select('*')
          .eq('user_id', user.id),
        supabase
          .from('beneficiaries')
          .select('*')
          .eq('user_id', user.id)
      ])

      if (txRes.error) throw txRes.error
      if (accRes.error) throw accRes.error
      if (cardRes.error) throw cardRes.error
      // Beneficiaries table might not exist yet, so don't throw on error
      
      // Sort transactions by date/time (most recent first)
      const sortedTransactions = (txRes.data as UITransaction[] || []).sort((a, b) => {
        // Use transaction_time if available, otherwise transaction_date, otherwise created_at
        const dateA = new Date(a.transaction_time || a.transaction_date || a.created_at)
        const dateB = new Date(b.transaction_time || b.transaction_date || b.created_at)
        return dateB.getTime() - dateA.getTime()
      })

      setTransactions(sortedTransactions)
      setAccounts((accRes.data as Account[]) || [])
      setCards((cardRes.data as AccountCard[]) || [])
      setBeneficiaries((benRes.data as Beneficiary[]) || [])
      
      // Initialize toolbar with default account AND default card
      const loadedAccounts = (accRes.data as Account[]) || []
      const loadedCards = (cardRes.data as AccountCard[]) || []
      const defaultAccount = loadedAccounts.find(a => a.is_default)
      const defaultCard = loadedCards.find(c => c.is_default)
      
      // If we have a default card, use its parent account; otherwise use default account
      const toolbarAccountId = defaultCard 
        ? defaultCard.account_id 
        : defaultAccount?.id || null
      
      setToolbarState(prev => ({
        ...prev,
        accountId: prev.accountId || toolbarAccountId,
        cardId: prev.cardId || defaultCard?.id || null
      }))
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setIsLoading(false)
    }
  }, [user])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Save transaction with account and card
  const saveTransaction = useCallback(async (
    parsed: ParsedTransaction,
    accountId: string | null,
    cardId: string | null,
    tempId: string,
    extraFields?: {
      isReimbursable?: boolean
      beneficiaryId?: string | null
      currency?: Currency
    }
  ) => {
    if (!user) return

    try {
      const account = accountId ? accounts.find(a => a.id === accountId) : null
      const currencyToUse = extraFields?.currency || parsed.currency
      
      // Handle currency conversion
      let finalAmount = parsed.amount
      let originalAmount: number | null = null
      let originalCurrency: string | null = null
      let conversionRate: number | null = null

      if (account && currencyToUse !== account.currency) {
        const conversion = convertAmount(
          parsed.amount,
          currencyToUse as Currency,
          account.currency as Currency
        )
        finalAmount = conversion.convertedAmount
        originalAmount = parsed.amount
        originalCurrency = currencyToUse
        conversionRate = conversion.rate
      }

      // Extract date from datetime
      const transactionDate = parsed.transaction_datetime.split('T')[0]
      const transactionTime = parsed.transaction_datetime

      // Insert to database
      const { data, error } = await supabase
        .from('transactions')
        .insert({
          user_id: user.id,
          amount: finalAmount,
          currency: account?.currency || currencyToUse,
          direction: parsed.direction,
          category: parsed.category,
          merchant: parsed.merchant,
          transaction_date: transactionDate,
          transaction_time: transactionTime,
          account_id: accountId || null,
          card_id: cardId || null,
          original_amount: originalAmount,
          original_currency: originalCurrency,
          conversion_rate: conversionRate,
          notes: parsed.notes,
          is_reimbursable: extraFields?.isReimbursable || false,
          beneficiary_id: extraFields?.beneficiaryId || null,
        } as never)
        .select()
        .single()

      if (error) throw error

      // Update UI - sort to maintain date order
      setTransactions(prev => {
        const updated = prev.map(t => t.id === tempId ? { ...(data as UITransaction), isOptimistic: false } : t)
        return updated.sort((a, b) => {
          const dateA = new Date(a.transaction_time || a.transaction_date || a.created_at)
          const dateB = new Date(b.transaction_time || b.transaction_date || b.created_at)
          return dateB.getTime() - dateA.getTime()
        })
      })
    } catch (error) {
      console.error('Error saving transaction:', error)
      setTransactions(prev => 
        prev.map(t => t.id === tempId ? { ...t, isFailed: true, isProcessing: false, category: 'Failed' } : t)
      )
    }
  }, [user, accounts])

  // Get extra fields from toolbar state
  const getExtraFields = useCallback(() => ({
    isReimbursable: toolbarState.isReimbursable,
    beneficiaryId: toolbarState.beneficiaryId,
    currency: toolbarState.currency
  }), [toolbarState])

  // Process a single parsed transaction with toolbar-first logic and conflict detection
  const processParsedTransaction = useCallback(async (
    parsed: ParsedTransaction,
    tempId: string
  ): Promise<'saved' | 'conflict' | 'needs_clarification'> => {
    // Check if AI detected a payment hint
    const aiMatch = matchPaymentHint(parsed.payment_hint, accounts, cards)
    
    // Check if toolbar has a selection
    const hasToolbarSelection = toolbarState.accountId || toolbarState.cardId
    
    // Get the effective toolbar account (from card's parent if card selected)
    const toolbarAccountId = toolbarState.cardId 
      ? cards.find(c => c.id === toolbarState.cardId)?.account_id 
      : toolbarState.accountId
    
    // SMART CONFLICT DETECTION
    // Only show conflict modal if ALL conditions are met:
    // 1. AI found a payment hint AND matched it to an account/card
    // 2. Toolbar HAS an explicit selection
    // 3. The AI match is DIFFERENT from toolbar selection
    // 4. User has MORE than one account (otherwise, no choice to make)
    const shouldShowConflict = 
      parsed.payment_hint && 
      aiMatch.accountId && 
      hasToolbarSelection &&
      accounts.length > 1 && // Skip conflict if only one account
      (
        aiMatch.accountId !== toolbarAccountId || 
        (aiMatch.cardId && toolbarState.cardId && aiMatch.cardId !== toolbarState.cardId)
      )
    
    if (shouldShowConflict) {
      // Conflict detected! Store data for modal
      // payment_hint is guaranteed to be non-null here due to shouldShowConflict check
      setConflictData({
        paymentHint: parsed.payment_hint!,
        aiMatch,
        toolbarAccountId: toolbarState.accountId,
        toolbarCardId: toolbarState.cardId
      })
      setPendingConflictTx({ parsed, tempId })
      return 'conflict'
    }
    
    // No conflict - determine which account/card to use
    let finalAccountId: string | null = null
    let finalCardId: string | null = null
    
    if (hasToolbarSelection) {
      // Toolbar has a selection - use it (toolbar takes priority)
      finalAccountId = toolbarState.accountId
      finalCardId = toolbarState.cardId
    } else if (aiMatch.accountId) {
      // AI found a match - use it
      finalAccountId = aiMatch.accountId
      finalCardId = aiMatch.cardId
    } else if (defaultAccount) {
      // Use default account
      finalAccountId = defaultAccount.id
    } else if (accounts.length > 0) {
      // Need clarification
      return 'needs_clarification'
    }
    
    // Save with extra fields from toolbar
    await saveTransaction(parsed, finalAccountId, finalCardId, tempId, getExtraFields())
    return 'saved'
  }, [accounts, cards, defaultAccount, toolbarState, saveTransaction, getExtraFields])

  // Handle text submission - supports bulk transactions with conflict detection
  const handleSubmit = useCallback(async (text: string) => {
    if (!user || isSubmitting) return

    setIsSubmitting(true)

    // Create single processing entry while AI parses
    const processingTempId = generateId()
    const processingTx: UITransaction = {
      id: processingTempId,
      user_id: user.id,
      amount: 0,
      currency: toolbarState.currency,
      direction: 'out',
      category: 'Processing...',
      merchant: text.slice(0, 50),
      transaction_date: toISODateString(new Date()),
      transaction_time: null,
      raw_log_id: null,
      account_id: toolbarState.accountId,
      card_id: toolbarState.cardId,
      original_amount: null,
      original_currency: null,
      conversion_rate: null,
      notes: null,
      description: null,
      logo_url: null,
      beneficiary_id: toolbarState.beneficiaryId,
      is_reimbursable: toolbarState.isReimbursable,
      created_at: new Date().toISOString(),
      isOptimistic: true,
      isProcessing: true,
    }

    setTransactions(prev => [processingTx, ...prev])

    try {
      // Parse with AI (now returns array)
      const result: BulkParseResult = await parseTransactions(text)

      // Remove the initial processing entry
      setTransactions(prev => prev.filter(t => t.id !== processingTempId))

      if (isBulkParseError(result)) {
        console.error('Parse error:', result.error, result.reason)
        setIsSubmitting(false)
        return
      }

      const { transactions: parsedTransactions } = result
      console.log(`Parsed ${parsedTransactions.length} transaction(s)`)

      // Track transactions that need clarification
      const needsClarification: { parsed: ParsedTransaction; tempId: string }[] = []

      // Process each transaction
      for (let i = 0; i < parsedTransactions.length; i++) {
        const parsed = parsedTransactions[i]
        const tempId = generateId()

        // Create optimistic entry for this transaction
        const optimisticTx: UITransaction = {
          id: tempId,
          user_id: user.id,
          amount: parsed.amount,
          currency: toolbarState.currency,
          direction: parsed.direction,
          category: parsed.category,
          merchant: parsed.merchant,
          transaction_date: parsed.transaction_datetime.split('T')[0],
          transaction_time: parsed.transaction_datetime,
          raw_log_id: null,
          account_id: toolbarState.accountId,
          card_id: toolbarState.cardId,
          original_amount: null,
          original_currency: null,
          conversion_rate: null,
          notes: parsed.notes,
          description: null,
          logo_url: null,
          beneficiary_id: toolbarState.beneficiaryId,
          is_reimbursable: toolbarState.isReimbursable,
          created_at: new Date().toISOString(),
          isOptimistic: true,
          isProcessing: true,
        }

        setTransactions(prev => [optimisticTx, ...prev])

        // Try to process with account matching and conflict detection
        const processResult = await processParsedTransaction(parsed, tempId)

        if (processResult === 'conflict') {
          // Show conflict modal - stop processing further transactions
          setShowConflictModal(true)
          setIsSubmitting(false)
          return
        } else if (processResult === 'needs_clarification') {
          // Needs manual account selection
          needsClarification.push({ parsed, tempId })
          
          // Update the UI to show it's waiting for clarification
          setTransactions(prev =>
            prev.map(t => t.id === tempId ? {
              ...t,
              isProcessing: false,
            } : t)
          )
        }
      }

      // If any transactions need clarification, show modal for the first one
      if (needsClarification.length > 0) {
        const first = needsClarification[0]
        setPendingParsedData(first.parsed)
        setPendingTempId(first.tempId)
        setPendingBulkTransactions(needsClarification.slice(1))
        setShowClarification(true)
      }

    } catch (error) {
      console.error('Error processing transactions:', error)
      setTransactions(prev => prev.filter(t => t.id !== processingTempId))
    } finally {
      setIsSubmitting(false)
    }
  }, [user, isSubmitting, toolbarState, processParsedTransaction])

  // Handle account/card selection from modal
  const handleAccountSelect = useCallback(async (accountId: string, cardId: string | null) => {
    if (!pendingParsedData || !pendingTempId) return

    setShowClarification(false)
    
    // Mark as processing again
    setTransactions(prev =>
      prev.map(t => t.id === pendingTempId ? { ...t, isProcessing: true, category: 'Processing...' } : t)
    )

    await saveTransaction(pendingParsedData, accountId || null, cardId, pendingTempId, getExtraFields())
    
    // Clear current pending data
    setPendingParsedData(null)
    setPendingTempId(null)
    
    // Check if there are more bulk transactions waiting
    if (pendingBulkTransactions.length > 0) {
      const [next, ...remaining] = pendingBulkTransactions
      setPendingBulkTransactions(remaining)
      
      // Show modal for next transaction after a brief delay
      setTimeout(() => {
        setPendingParsedData(next.parsed)
        setPendingTempId(next.tempId)
        setShowClarification(true)
      }, 300)
    }
  }, [pendingParsedData, pendingTempId, pendingBulkTransactions, saveTransaction, getExtraFields])

  // Handle clarification cancel
  const handleClarificationCancel = useCallback(() => {
    setShowClarification(false)
    
    // Remove current pending transaction
    if (pendingTempId) {
      setTransactions(prev => prev.filter(t => t.id !== pendingTempId))
    }
    
    // Also remove all remaining bulk transactions that need clarification
    if (pendingBulkTransactions.length > 0) {
      const idsToRemove = pendingBulkTransactions.map(t => t.tempId)
      setTransactions(prev => prev.filter(t => !idsToRemove.includes(t.id)))
      setPendingBulkTransactions([])
    }
    
    setPendingParsedData(null)
    setPendingTempId(null)
  }, [pendingTempId, pendingBulkTransactions])

  // Handle conflict resolution - use text (AI detected account/card)
  const handleConflictUseText = useCallback(async () => {
    if (!pendingConflictTx || !conflictData) return
    
    setShowConflictModal(false)
    
    // Mark as processing
    setTransactions(prev =>
      prev.map(t => t.id === pendingConflictTx.tempId ? { ...t, isProcessing: true } : t)
    )
    
    // Save with AI-detected account/card
    await saveTransaction(
      pendingConflictTx.parsed,
      conflictData.aiMatch.accountId,
      conflictData.aiMatch.cardId,
      pendingConflictTx.tempId,
      getExtraFields()
    )
    
    // Clear conflict state
    setPendingConflictTx(null)
    setConflictData(null)
  }, [pendingConflictTx, conflictData, saveTransaction, getExtraFields])

  // Handle conflict resolution - keep toolbar selection
  const handleConflictKeepToolbar = useCallback(async () => {
    if (!pendingConflictTx || !conflictData) return
    
    setShowConflictModal(false)
    
    // Mark as processing
    setTransactions(prev =>
      prev.map(t => t.id === pendingConflictTx.tempId ? { ...t, isProcessing: true } : t)
    )
    
    // Save with toolbar account/card
    await saveTransaction(
      pendingConflictTx.parsed,
      conflictData.toolbarAccountId,
      conflictData.toolbarCardId,
      pendingConflictTx.tempId,
      getExtraFields()
    )
    
    // Clear conflict state
    setPendingConflictTx(null)
    setConflictData(null)
  }, [pendingConflictTx, conflictData, saveTransaction, getExtraFields])

  // Handle conflict modal cancel
  const handleConflictCancel = useCallback(() => {
    setShowConflictModal(false)
    
    // Remove pending transaction
    if (pendingConflictTx) {
      setTransactions(prev => prev.filter(t => t.id !== pendingConflictTx.tempId))
    }
    
    setPendingConflictTx(null)
    setConflictData(null)
  }, [pendingConflictTx])

  // Add new beneficiary
  const handleAddBeneficiary = useCallback(async (name: string): Promise<Beneficiary | null> => {
    if (!user) return null
    
    try {
      const { data, error } = await supabase
        .from('beneficiaries')
        .insert({
          user_id: user.id,
          name,
          color: '#6366f1'
        } as never)
        .select()
        .single()
      
      if (error) throw error
      
      setBeneficiaries(prev => [...prev, data as Beneficiary])
      return data as Beneficiary
    } catch (error) {
      console.error('Error adding beneficiary:', error)
      return null
    }
  }, [user])

  // Delete transaction
  const handleDelete = useCallback(async (id: string) => {
    setTransactions(prev => prev.filter(t => t.id !== id))
    
    if (id.startsWith('temp_')) return

    try {
      await supabase.from('transactions').delete().eq('id', id)
    } catch (error) {
      console.error('Error deleting transaction:', error)
      fetchData()
    }
  }, [fetchData])

  // Fetch attachments for selected transaction
  const fetchAttachments = useCallback(async (transactionId: string) => {
    try {
      const { data, error } = await supabase
        .from('transaction_attachments')
        .select('*')
        .eq('transaction_id', transactionId)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      setTransactionAttachments((data as TransactionAttachment[]) || [])
    } catch (error) {
      console.error('Error fetching attachments:', error)
      setTransactionAttachments([])
    }
  }, [])

  // Open transaction detail modal
  const handleTransactionClick = useCallback((transaction: UITransaction) => {
    if (transaction.isOptimistic || transaction.isProcessing) return
    setSelectedTransaction(transaction)
    setShowDetailModal(true)
    fetchAttachments(transaction.id)
  }, [fetchAttachments])

  // Update transaction from detail modal
  const handleTransactionUpdate = useCallback(async (updates: Partial<Transaction>) => {
    if (!selectedTransaction) return

    try {
      const { error } = await supabase
        .from('transactions')
        .update(updates as never)
        .eq('id', selectedTransaction.id)

      if (error) throw error

      // Update local state
      setTransactions(prev =>
        prev.map(t => t.id === selectedTransaction.id 
          ? { ...t, ...updates } as UITransaction
          : t
        )
      )

      // Update selected transaction for modal
      setSelectedTransaction(prev => prev ? { ...prev, ...updates } as UITransaction : null)
    } catch (error) {
      console.error('Error updating transaction:', error)
      throw error
    }
  }, [selectedTransaction])

  // Delete transaction from detail modal
  const handleTransactionDeleteFromModal = useCallback(async (id: string) => {
    await handleDelete(id)
    setShowDetailModal(false)
    setSelectedTransaction(null)
  }, [handleDelete])

  // Bulk update transactions by merchant
  const handleBulkTransactionUpdate = useCallback(async (
    merchantName: string,
    updates: Partial<Transaction>
  ) => {
    if (!user) return
    
    try {
      // Update all transactions with this merchant (except the one being edited)
      const { error } = await supabase
        .from('transactions')
        .update(updates as never)
        .eq('user_id', user.id)
        .eq('merchant', merchantName)
        .neq('id', selectedTransaction?.id || '')
      
      if (error) throw error
      
      // Update local state
      setTransactions(prev =>
        prev.map(t => 
          t.merchant === merchantName && t.id !== selectedTransaction?.id
            ? { ...t, ...updates } as UITransaction
            : t
        )
      )
    } catch (error) {
      console.error('Error bulk updating transactions:', error)
    }
  }, [user, selectedTransaction])

  // Convert transaction to subscription
  const handleConvertToSubscription = useCallback(async (
    subscription: Omit<NewSubscription, 'user_id'>
  ) => {
    if (!user) return
    
    try {
      const { error } = await supabase
        .from('subscriptions')
        .insert({
          ...subscription,
          user_id: user.id,
        } as never)
      
      if (error) throw error
      
      // Close modal and show success
      setShowDetailModal(false)
      setSelectedTransaction(null)
    } catch (error) {
      console.error('Error converting to subscription:', error)
      throw error
    }
  }, [user])

  // Upload attachment
  const handleUploadAttachment = useCallback(async (file: File) => {
    if (!user || !selectedTransaction) return

    try {
      // Generate unique file path
      const fileExt = file.name.split('.').pop()
      const fileName = `${user.id}/${selectedTransaction.id}/${Date.now()}.${fileExt}`
      
      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('transaction-attachments')
        .upload(fileName, file)
      
      if (uploadError) throw uploadError

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('transaction-attachments')
        .getPublicUrl(fileName)
      
      // Insert record in database
      const { data: attachmentData, error: dbError } = await supabase
        .from('transaction_attachments')
        .insert({
          user_id: user.id,
          transaction_id: selectedTransaction.id,
          file_url: urlData.publicUrl,
          file_name: file.name,
          file_type: file.type,
          file_size: file.size,
        } as never)
        .select()
        .single()
      
      if (dbError) throw dbError
      
      // Update local state
      setTransactionAttachments(prev => [attachmentData as TransactionAttachment, ...prev])
    } catch (error) {
      console.error('Error uploading attachment:', error)
      throw error
    }
  }, [user, selectedTransaction])

  // Delete attachment
  const handleDeleteAttachment = useCallback(async (attachmentId: string) => {
    try {
      // Find the attachment to get the file URL
      const attachment = transactionAttachments.find(a => a.id === attachmentId)
      
      if (attachment) {
        // Extract file path from URL
        const urlParts = attachment.file_url.split('/transaction-attachments/')
        if (urlParts[1]) {
          // Delete from storage
          await supabase.storage
            .from('transaction-attachments')
            .remove([urlParts[1]])
        }
      }
      
      // Delete from database
      const { error } = await supabase
        .from('transaction_attachments')
        .delete()
        .eq('id', attachmentId)
      
      if (error) throw error
      
      // Update local state
      setTransactionAttachments(prev => prev.filter(a => a.id !== attachmentId))
    } catch (error) {
      console.error('Error deleting attachment:', error)
      throw error
    }
  }, [transactionAttachments])

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      {/* Summary Header */}
      <SummaryHeader accounts={accounts} summary={summary} displayCurrency={defaultCurrency} />

      {/* Feed Area */}
      <div ref={feedRef} className="flex-1 overflow-y-auto pb-40">
        <div className="max-w-2xl mx-auto px-4 py-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 text-emerald-400 animate-spin" />
            </div>
          ) : transactions.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="space-y-3">
              <AnimatePresence mode="popLayout">
                {transactions.map((transaction, index) => (
                  <TransactionCard
                    key={transaction.id}
                    transaction={transaction}
                    account={accounts.find(a => a.id === transaction.account_id)}
                    card={cards.find(c => c.id === transaction.card_id)}
                    index={index}
                    onDelete={handleDelete}
                    onClick={() => handleTransactionClick(transaction)}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>

      {/* Input Dock with Smart Toolbar */}
      <InputDock
        accounts={accounts}
        cards={cards}
        beneficiaries={beneficiaries}
        toolbarState={toolbarState}
        onToolbarChange={setToolbarState}
        onAddBeneficiary={handleAddBeneficiary}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
      />

      {/* Account/Card Selection Modal */}
      <AnimatePresence>
        {showClarification && (
          <AccountSelectionModal
            isOpen={showClarification}
            parsedData={pendingParsedData}
            accounts={accounts}
            cards={cards}
            onSelect={handleAccountSelect}
            onCancel={handleClarificationCancel}
          />
        )}
      </AnimatePresence>

      {/* Conflict Modal */}
      <AnimatePresence>
        {showConflictModal && (
          <ConflictModal
            isOpen={showConflictModal}
            conflictData={conflictData}
            accounts={accounts}
            cards={cards}
            onUseText={handleConflictUseText}
            onKeepToolbar={handleConflictKeepToolbar}
            onCancel={handleConflictCancel}
          />
        )}
      </AnimatePresence>

      {/* Transaction Detail Modal */}
      <TransactionDetailModal
        isOpen={showDetailModal}
        transaction={selectedTransaction as Transaction | null}
        accounts={accounts}
        cards={cards}
        allTransactions={transactions as Transaction[]}
        attachments={transactionAttachments}
        onClose={() => { 
          setShowDetailModal(false)
          setSelectedTransaction(null)
          setTransactionAttachments([])
        }}
        onSave={handleTransactionUpdate}
        onBulkSave={handleBulkTransactionUpdate}
        onDelete={handleTransactionDeleteFromModal}
        onConvertToSubscription={handleConvertToSubscription}
        onUploadAttachment={handleUploadAttachment}
        onDeleteAttachment={handleDeleteAttachment}
      />
    </div>
  )
}
