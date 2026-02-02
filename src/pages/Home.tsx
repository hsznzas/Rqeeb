import { useState, useRef, useEffect, useCallback, forwardRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Send, 
  Loader2, 
  TrendingUp, 
  TrendingDown,
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
  ChevronRight,
  CheckCircle2,
  XCircle,
  FileText,
  Maximize2,
  Minimize2,
  Eye,
  EyeOff,
  User,
  Upload,
  FileSpreadsheet
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatCurrency } from '@/lib/utils'
import { formatFeedDate } from '@/lib/dateUtils'
import { useAuth } from '@/context'
import { supabase } from '@/services/supabase'
import { parseTransactions, isBulkParseError, type ParsedTransaction, type BulkParseResult, type CustomCategory } from '@/lib/ai'
import { convertAmount, type Currency, formatCurrencyWithSymbol } from '@/lib/currency'
// processCSVUpload moved to use AI-powered API instead
import { generateId } from '@/lib/utils'
import { toISODateString } from '@/lib/dateUtils'
import type { Account, AccountCard, Transaction, Beneficiary, NewSubscription, TransactionAttachment, UserCategory } from '@/types/database'
import { 
  TransactionDetailModal, 
  TransactionInputToolbar, 
  getDefaultToolbarState, 
  type ToolbarState,
  ConflictModal,
  type ConflictData,
  CSVUpload,
  StagingReviewModal,
  ParseReviewModal,
  type ReviewedTransaction,
  ChatResponse,
  type ChatResponseData,
  CSVQuestionModal
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
  beneficiary?: Beneficiary
  index: number
  onDelete: (id: string) => void
  onClick: () => void
}

const TransactionCard = forwardRef<HTMLDivElement, TransactionCardProps>(
  function TransactionCard({ transaction, account, card, beneficiary, index, onDelete, onClick }, ref) {
    const isIncome = transaction.direction === 'in'
    const isProcessing = transaction.isProcessing
    const hasConversion = transaction.original_amount && transaction.original_currency
    const isReimbursable = transaction.is_reimbursable
    
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
              {/* Account/card info on same line as title */}
              {account && !isProcessing && (
                <span className="text-sm text-slate-500 truncate flex items-center gap-1">
                  <span>•</span>
                  {account.name}
                  {card && (
                    <span className="text-slate-600">
                      ****{card.last_4_digits}
                    </span>
                  )}
                </span>
              )}
              {isProcessing && (
                <span className="text-xs text-blue-400 flex items-center gap-1">
                  <Sparkles className="h-3 w-3" />
                  Thinking...
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <span>{transaction.category}</span>
              <span>•</span>
              <span>{formatFeedDate(transaction.transaction_time || transaction.created_at)}</span>
              {/* Reimbursable Badge */}
              {isReimbursable && (
                <>
                  <span>•</span>
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-xs">
                    <User className="h-3 w-3" />
                    {beneficiary?.name || 'Reimburse'}
                  </span>
                </>
              )}
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

// Category list for filtering
const CATEGORIES = [
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

// Summary Header Component
function SummaryHeader({ 
  accounts, 
  summary,
  displayCurrency,
  categoryFilter,
  onCategoryFilterChange,
  customCategories,
  beneficiaries,
  beneficiaryFilter,
  onBeneficiaryFilterChange,
  onImportClick
}: { 
  accounts: Account[]
  summary: { income: number; expenses: number; net: number; count: number }
  displayCurrency: Currency
  categoryFilter: string | null
  onCategoryFilterChange: (category: string | null) => void
  customCategories: UserCategory[]
  beneficiaries: Beneficiary[]
  beneficiaryFilter: string | null
  onBeneficiaryFilterChange: (beneficiaryId: string | null) => void
  onImportClick: () => void
}) {
  const { signOut } = useAuth()
  const defaultAccount = accounts.find(a => a.is_default)
  
  // Balance visibility state with localStorage persistence (default: hidden)
  const [isBalanceHidden, setIsBalanceHidden] = useState(() => {
    return localStorage.getItem('rqeeb_hide_balance') !== 'false'
  })
  
  const toggleBalanceVisibility = () => {
    const newValue = !isBalanceHidden
    setIsBalanceHidden(newValue)
    localStorage.setItem('rqeeb_hide_balance', String(newValue))
  }

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
            <button
              onClick={toggleBalanceVisibility}
              className="p-2.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.08] transition-colors"
              title={isBalanceHidden ? 'Show balance' : 'Hide balance'}
            >
              {isBalanceHidden ? (
                <EyeOff className="h-5 w-5 text-slate-400" />
              ) : (
                <Eye className="h-5 w-5 text-slate-300" />
              )}
            </button>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider">Net Balance</p>
              <div className={cn(
                'text-2xl font-bold font-mono',
                summary.net >= 0 ? 'text-emerald-400' : 'text-rose-400'
              )}>
                {isBalanceHidden ? '•••••' : `${summary.net >= 0 ? '+' : ''}${formatCurrency(summary.net, displayCurrency)}`}
              </div>
            </div>
          </div>

          {/* Quick Stats & Nav */}
          <div className="flex items-center gap-3">
            <div className="text-right mr-2">
              <div className="flex items-center gap-1 text-emerald-400">
                <TrendingUp className="h-3 w-3" />
                <span className="text-xs font-medium">{isBalanceHidden ? '•••••' : formatCurrency(summary.income, displayCurrency)}</span>
              </div>
              <div className="flex items-center gap-1 text-rose-400">
                <TrendingDown className="h-3 w-3" />
                <span className="text-xs font-medium">{isBalanceHidden ? '•••••' : formatCurrency(summary.expenses, displayCurrency)}</span>
              </div>
            </div>

            {/* Import Statement Button */}
            <button
              onClick={onImportClick}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 transition-colors"
              title="Import Bank Statement"
            >
              <FileSpreadsheet className="h-4 w-4 text-amber-400" />
              <span className="text-xs font-medium text-amber-400 hidden sm:inline">Import</span>
            </button>
            
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

        {/* Category Filter */}
        <div className="mt-3 pt-3 border-t border-white/[0.06]">
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            <button
              onClick={() => onCategoryFilterChange(null)}
              className={cn(
                'shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all',
                categoryFilter === null
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-white/[0.05] text-slate-400 border border-white/[0.06] hover:bg-white/[0.08]'
              )}
            >
              All
            </button>
            {/* Default categories */}
            {CATEGORIES.map((category) => (
              <button
                key={category}
                onClick={() => onCategoryFilterChange(categoryFilter === category ? null : category)}
                className={cn(
                  'shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap',
                  categoryFilter === category
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-white/[0.05] text-slate-400 border border-white/[0.06] hover:bg-white/[0.08]'
                )}
              >
                {category}
              </button>
            ))}
            {/* Custom categories */}
            {customCategories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => onCategoryFilterChange(categoryFilter === cat.name ? null : cat.name)}
                className={cn(
                  'shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap flex items-center gap-1.5',
                  categoryFilter === cat.name
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-white/[0.05] text-slate-400 border border-white/[0.06] hover:bg-white/[0.08]'
                )}
              >
                <div 
                  className="w-2 h-2 rounded-full" 
                  style={{ backgroundColor: cat.color }}
                />
                {cat.name}
              </button>
            ))}
          </div>
          
          {/* Beneficiary Filter (only show if there are beneficiaries) */}
          {beneficiaries.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide mt-2">
              <span className="shrink-0 px-2 py-1.5 text-xs text-slate-500">Reimburse:</span>
              <button
                onClick={() => onBeneficiaryFilterChange(null)}
                className={cn(
                  'shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all',
                  beneficiaryFilter === null
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    : 'bg-white/[0.05] text-slate-400 border border-white/[0.06] hover:bg-white/[0.08]'
                )}
              >
                All
              </button>
              <button
                onClick={() => onBeneficiaryFilterChange('pending')}
                className={cn(
                  'shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all',
                  beneficiaryFilter === 'pending'
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    : 'bg-white/[0.05] text-slate-400 border border-white/[0.06] hover:bg-white/[0.08]'
                )}
              >
                Pending
              </button>
              {beneficiaries.map((ben) => (
                <button
                  key={ben.id}
                  onClick={() => onBeneficiaryFilterChange(beneficiaryFilter === ben.id ? null : ben.id)}
                  className={cn(
                    'shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap flex items-center gap-1.5',
                    beneficiaryFilter === ben.id
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      : 'bg-white/[0.05] text-slate-400 border border-white/[0.06] hover:bg-white/[0.08]'
                  )}
                >
                  <div 
                    className="w-2 h-2 rounded-full" 
                    style={{ backgroundColor: ben.color }}
                  />
                  {ben.name}
                </button>
              ))}
            </div>
          )}
        </div>
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
  isSubmitting,
  onCSVDrop,
  pendingCSVFile,
  onClearCSV
}: {
  accounts: Account[]
  cards: AccountCard[]
  beneficiaries: Beneficiary[]
  toolbarState: ToolbarState
  onToolbarChange: (state: ToolbarState) => void
  onAddBeneficiary: (name: string) => Promise<Beneficiary | null>
  onSubmit: (text: string, csvFile?: File) => Promise<{ success: boolean; error?: string }>
  isSubmitting: boolean
  onCSVDrop?: (file: File) => void
  pendingCSVFile?: File | null
  onClearCSV?: () => void
}) {
  const [input, setInput] = useState('')
  const [feedback, setFeedback] = useState<{ type: 'error' | 'success'; message: string } | null>(null)
  const [isExpanded, setIsExpanded] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Get selected account for display
  const selectedAccount = accounts.find(a => a.id === toolbarState.accountId)
  const selectedCard = cards.find(c => c.id === toolbarState.cardId)

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
    setFeedback(null)
    if (textareaRef.current && !isExpanded) {
      textareaRef.current.style.height = 'auto'
      // Increased max height for bulk paste (up to 50 transactions)
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 300)}px`
    }
  }, [isExpanded])

  const handleSubmit = useCallback(async () => {
    // Allow submit with CSV even if input is empty (will use default context)
    if ((!input.trim() && !pendingCSVFile) || isSubmitting) return
    
    const result = await onSubmit(input.trim(), pendingCSVFile || undefined)
    
    if (result.success) {
      setInput('')
      setFeedback({ type: 'success', message: pendingCSVFile ? 'CSV processed!' : 'Transaction(s) added!' })
      setIsExpanded(false)
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto'
      }
      // Auto-hide success message after 2 seconds
      setTimeout(() => setFeedback(null), 2000)
    } else {
      // Keep the input text on failure so user can retry
      setFeedback({ type: 'error', message: result.error || 'Failed to process' })
    }
  }, [input, isSubmitting, onSubmit, pendingCSVFile])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }, [handleSubmit])

  // Get placeholder text based on toolbar state and pending CSV
  const getPlaceholder = () => {
    if (pendingCSVFile) {
      return `Add context for ${pendingCSVFile.name} (e.g., "AED from ADIB, only Jan 2026")...`
    }
    if (selectedCard) {
      return `Type or paste transactions... (${selectedCard.name} ****${selectedCard.last_4_digits})`
    }
    if (selectedAccount) {
      return `Type or paste transactions... (${selectedAccount.name})`
    }
    return "Type, paste, or drop CSV file..."
  }

  // Drag and drop handlers for CSV files
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.dataTransfer.types.includes('Files')) {
      setIsDragging(true)
    }
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    
    const files = Array.from(e.dataTransfer.files)
    const csvFile = files.find(f => f.name.toLowerCase().endsWith('.csv'))
    
    if (csvFile && onCSVDrop) {
      onCSVDrop(csvFile)
    } else if (files.length > 0 && !csvFile) {
      setFeedback({ type: 'error', message: 'Please drop a CSV file (.csv)' })
    }
  }, [onCSVDrop])

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
          {/* Pending CSV Indicator */}
          <AnimatePresence>
            {pendingCSVFile && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl mb-3 text-sm bg-amber-500/10 text-amber-400 border border-amber-500/20"
              >
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="h-4 w-4" />
                  <span className="truncate max-w-[200px]">{pendingCSVFile.name}</span>
                  <span className="text-amber-500/70">ready to import</span>
                </div>
                <button 
                  onClick={onClearCSV}
                  className="p-1 rounded hover:bg-amber-500/20 transition-colors"
                  title="Remove CSV"
                >
                  <X className="h-4 w-4" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

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

          {/* Input Area - supports drag-and-drop CSV */}
          <div 
            className={cn(
              'relative flex items-end gap-2 p-2 rounded-2xl',
              'bg-white/[0.05] border border-white/[0.08]',
              'focus-within:border-emerald-500/30 focus-within:bg-white/[0.07]',
              'transition-all duration-200',
              isDragging && 'border-amber-500/50 bg-amber-500/10'
            )}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            {/* Drag overlay */}
            {isDragging && (
              <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-amber-500/10 border-2 border-dashed border-amber-500/50 z-10">
                <div className="flex items-center gap-2 text-amber-400">
                  <FileSpreadsheet className="h-5 w-5" />
                  <span className="font-medium">Drop CSV to import</span>
                </div>
              </div>
            )}
            {/* Text Input - Supports bulk paste (up to 50 transactions) */}
            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder={getPlaceholder()}
              rows={isExpanded ? 8 : 1}
              disabled={isSubmitting}
              className={cn(
                'flex-1 bg-transparent border-none resize-none',
                'text-base text-white placeholder:text-slate-500', // text-base prevents iOS zoom
                'py-3 px-2',
                isExpanded ? 'min-h-[200px] max-h-[400px]' : 'max-h-[300px]', // Expanded or compact mode
                'focus:outline-none',
                'disabled:opacity-50'
              )}
            />

            {/* Expand/Collapse Button */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsExpanded(!isExpanded)}
              className={cn(
                'shrink-0 p-3 rounded-xl',
                'bg-white/[0.05] hover:bg-white/[0.10]',
                'text-slate-400 hover:text-white',
                'transition-all duration-200'
              )}
              title={isExpanded ? 'Collapse input' : 'Expand input for bulk paste'}
            >
              {isExpanded ? (
                <Minimize2 className="h-5 w-5" />
              ) : (
                <Maximize2 className="h-5 w-5" />
              )}
            </motion.button>

            {/* Send Button */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleSubmit}
              disabled={(!input.trim() && !pendingCSVFile) || isSubmitting}
              className={cn(
                'shrink-0 p-3 rounded-xl',
                'transition-all duration-200',
                (input.trim() || pendingCSVFile) && !isSubmitting
                  ? pendingCSVFile 
                    ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-lg shadow-amber-500/25'
                    : 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/25' 
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
            Press <kbd className="px-1.5 py-0.5 rounded bg-white/[0.05] text-slate-500">Enter</kbd> to send • Drop CSV file to import • Ask questions about spending
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
        Start by typing a transaction, pasting bank SMS messages, or describing your spending.
      </p>
      <div className="flex flex-wrap gap-2 justify-center mb-4">
        {['Coffee 25 SAR', 'Uber 45 on Visa 8844', 'Salary 8000'].map((example) => (
          <span 
            key={example}
            className="px-3 py-1.5 rounded-full bg-white/[0.05] text-slate-400 text-sm border border-white/[0.06]"
          >
            "{example}"
          </span>
        ))}
      </div>
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <FileText className="h-3.5 w-3.5" />
        <span>Supports bulk paste – up to 50 transactions at once</span>
      </div>
    </motion.div>
  )
}

// Batch Processing Progress Modal
interface BatchProgress {
  total: number
  processed: number
  succeeded: number
  failed: number
  isComplete: boolean
}

function BatchProgressModal({
  isOpen,
  progress,
  onClose
}: {
  isOpen: boolean
  progress: BatchProgress
  onClose: () => void
}) {
  if (!isOpen) return null

  const percentage = progress.total > 0 ? Math.round((progress.processed / progress.total) * 100) : 0

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="w-full max-w-sm"
      >
        <div className="backdrop-blur-xl bg-white/[0.08] border border-white/10 rounded-3xl p-6 shadow-2xl">
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            {progress.isComplete ? (
              <div className="p-3 rounded-xl bg-emerald-500/20">
                <CheckCircle2 className="h-6 w-6 text-emerald-400" />
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-blue-500/20">
                <Loader2 className="h-6 w-6 text-blue-400 animate-spin" />
              </div>
            )}
            <div>
              <h3 className="text-lg font-semibold text-white">
                {progress.isComplete ? 'Batch Complete!' : 'Processing Batch...'}
              </h3>
              <p className="text-sm text-slate-400">
                {progress.isComplete 
                  ? `${progress.succeeded} transaction${progress.succeeded !== 1 ? 's' : ''} added`
                  : `${progress.processed} of ${progress.total}`}
              </p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mb-6">
            <div className="h-2 bg-white/[0.05] rounded-full overflow-hidden">
              <motion.div 
                className="h-full bg-emerald-500 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${percentage}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
            <div className="flex justify-between mt-2 text-xs text-slate-500">
              <span>{percentage}% complete</span>
              <span>{progress.total} total</span>
            </div>
          </div>

          {/* Results Summary */}
          {progress.isComplete && (
            <div className="space-y-2 mb-6">
              {progress.succeeded > 0 && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  <span className="text-emerald-400 text-sm font-medium">
                    {progress.succeeded} Processed Successfully
                  </span>
                </div>
              )}
              {progress.failed > 0 && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20">
                  <XCircle className="h-4 w-4 text-rose-400" />
                  <span className="text-rose-400 text-sm font-medium">
                    {progress.failed} Failed / Needs Review
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Close Button */}
          {progress.isComplete && (
            <button
              onClick={onClose}
              className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-medium transition-colors"
            >
              Done
            </button>
          )}
        </div>
      </motion.div>
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
  const [customCategories, setCustomCategories] = useState<UserCategory[]>([])
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
  
  // Batch processing state
  const [showBatchProgress, setShowBatchProgress] = useState(false)
  const [batchProgress, setBatchProgress] = useState<BatchProgress>({
    total: 0,
    processed: 0,
    succeeded: 0,
    failed: 0,
    isComplete: false
  })
  
  // Category filter state
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null)
  
  // Beneficiary filter state
  const [beneficiaryFilter, setBeneficiaryFilter] = useState<string | null>(null)
  
  // CSV Upload and Staging modal states
  const [showCSVUpload, setShowCSVUpload] = useState(false)
  const [showStagingReview, setShowStagingReview] = useState(false)
  
  // Parse Review modal state (for text input review before save)
  const [showParseReview, setShowParseReview] = useState(false)
  const [pendingParsedTransactions, setPendingParsedTransactions] = useState<ParsedTransaction[]>([])
  const [pendingExtraFields, setPendingExtraFields] = useState<{
    accountId: string | null
    cardId: string | null
    isReimbursable: boolean
    beneficiaryId: string | null
  } | null>(null)
  
  // Chat/Question response state
  const [chatResponse, setChatResponse] = useState<ChatResponseData | null>(null)
  const [isChatLoading, setIsChatLoading] = useState(false)
  
  // CSV conversation flow state
  const [pendingCSVFile, setPendingCSVFile] = useState<File | null>(null)
  const [csvQuestion, setCsvQuestion] = useState<{ question: string; context: string; options: string[]; allowCustom: boolean } | null>(null)
  const [csvConversationContext, setCsvConversationContext] = useState<string>('')

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
      const [txRes, accRes, cardRes, benRes, catRes] = await Promise.all([
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
          .eq('user_id', user.id),
        supabase
          .from('user_categories')
          .select('*')
          .eq('user_id', user.id)
          .eq('is_active', true)
      ])


      if (txRes.error) throw txRes.error
      if (accRes.error) throw accRes.error
      if (cardRes.error) throw cardRes.error
      // Beneficiaries table might not exist yet, so don't throw on error
      // user_categories table might not exist yet, so don't throw on error (H1 check)
      
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
      // Only set custom categories if the table exists (no error)
      if (!catRes.error) {
        setCustomCategories((catRes.data as UserCategory[]) || [])
      } else {
        // Table doesn't exist yet (404) - use empty array
        setCustomCategories([])
      }
      
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
          description: parsed.description, // Rich data: balance, refs, campaign info
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

  // Detect if text is a question (conversational query)
  const isQuestion = useCallback((text: string): boolean => {
    const trimmed = text.trim().toLowerCase()
    const questionStarters = [
      'how much', 'how many', 'what', 'when', 'where', 'which', 'why', 'who',
      'show me', 'tell me', 'can you', 'do i', 'did i', 'have i', 'am i',
      'total', 'average', 'summary', 'breakdown', 'compare', 'trend',
      'كم', 'متى', 'اين', 'لماذا', 'ماذا' // Arabic question words
    ]
    return questionStarters.some(starter => trimmed.startsWith(starter)) || trimmed.endsWith('?')
  }, [])
  
  // Handle chat/question queries
  const handleChatQuery = useCallback(async (text: string): Promise<{ success: boolean; error?: string }> => {
    setIsChatLoading(true)
    setChatResponse(null)
    
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          transactions: transactions.filter(t => !t.isOptimistic).map(t => ({
            amount: t.amount,
            currency: t.currency,
            category: t.category,
            merchant: t.merchant,
            transaction_date: t.transaction_date,
            direction: t.direction,
            description: t.description
          })),
          currency: defaultCurrency
        })
      })
      
      if (!response.ok) {
        throw new Error('Chat API error')
      }
      
      const data = await response.json() as ChatResponseData
      setChatResponse(data)
      return { success: true }
    } catch (error) {
      console.error('Chat error:', error)
      return { success: false, error: 'Could not process your question. Please try again.' }
    } finally {
      setIsChatLoading(false)
    }
  }, [transactions, defaultCurrency])

  // Handle text submission - parses with AI and shows review modal
  const handleSubmit = useCallback(async (text: string): Promise<{ success: boolean; error?: string }> => {
    if (!user || isSubmitting) return { success: false, error: 'Not ready' }
    
    // Check if this is a question/query
    if (isQuestion(text)) {
      return handleChatQuery(text)
    }

    setIsSubmitting(true)

    // Create single processing entry while AI parses
    // When locked: show toolbar account/card
    // When unlocked: show null (AI will determine account)
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
      account_id: toolbarState.lockAccountCard ? toolbarState.accountId : null,
      card_id: toolbarState.lockAccountCard ? toolbarState.cardId : null,
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
      // Pass custom categories to help AI categorize better
      const customCats: CustomCategory[] = customCategories.map(c => ({
        name: c.name,
        description: c.description
      }))
      const result: BulkParseResult = await parseTransactions(text, customCats)

      // Remove the initial processing entry
      setTransactions(prev => prev.filter(t => t.id !== processingTempId))

      if (isBulkParseError(result)) {
        console.error('Parse error:', result.error, result.reason)
        setIsSubmitting(false)
        return { success: false, error: result.reason || result.error || 'Could not parse transaction' }
      }

      const { transactions: parsedTransactions } = result
      console.log(`Parsed ${parsedTransactions.length} transaction(s)`)
      
      // Show review modal instead of saving immediately
      setPendingParsedTransactions(parsedTransactions)
      setPendingExtraFields({
        accountId: toolbarState.accountId,
        cardId: toolbarState.cardId,
        isReimbursable: toolbarState.isReimbursable,
        beneficiaryId: toolbarState.beneficiaryId
      })
      setShowParseReview(true)
      setIsSubmitting(false)
      return { success: true }
    } catch (error) {
      console.error('Error parsing transactions:', error)
      setTransactions(prev => prev.filter(t => t.id !== processingTempId))
      return { success: false, error: 'Something went wrong. Please try again.' }
    } finally {
      setIsSubmitting(false)
    }
  }, [user, isSubmitting, toolbarState, customCategories])
  
  // Handle submission with optional CSV file
  const handleSubmitWithCSV = useCallback(async (
    text: string, 
    csvFile?: File
  ): Promise<{ success: boolean; error?: string }> => {
    // If no CSV file, use regular submit
    if (!csvFile) {
      return handleSubmit(text)
    }
    
    // Process CSV with AI
    if (!user) return { success: false, error: 'Not logged in' }
    
    setIsSubmitting(true)
    
    try {
      // Read CSV file content
      const csvContent = await csvFile.text()
      
      // Call the AI-powered CSV analysis endpoint
      const response = await fetch('/api/analyze-csv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          csvContent,
          instructions: text || '',
          previousAnswer: csvConversationContext ? undefined : undefined,
          conversationContext: csvConversationContext || undefined
        })
      })
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Unknown error' }))
        return { success: false, error: error.error || 'CSV analysis failed' }
      }
      
      const result = await response.json()
      
      if (result.type === 'question') {
        // AI needs clarification - show question modal
        setCsvQuestion({
          question: result.question,
          context: result.context || '',
          options: result.options || [],
          allowCustom: result.allowCustom !== false
        })
        // Keep the CSV file pending
        setIsSubmitting(false)
        return { success: true } // Don't clear the input - user needs to answer
      }
      
      if (result.type === 'transactions' && result.transactions?.length > 0) {
        // Got parsed transactions - show in review modal
        const parsedTransactions: ParsedTransaction[] = result.transactions.map((tx: {
          amount: number
          currency: string
          category: string
          merchant: string | null
          transaction_datetime: string
          direction: 'in' | 'out'
          description: string | null
        }) => ({
          amount: tx.amount,
          currency: tx.currency,
          category: tx.category,
          merchant: tx.merchant,
          transaction_datetime: tx.transaction_datetime,
          direction: tx.direction,
          payment_hint: null,
          notes: tx.description,
          description: tx.description
        }))
        
        // Clear CSV state
        setPendingCSVFile(null)
        setCsvQuestion(null)
        setCsvConversationContext('')
        
        // Show in review modal
        setPendingParsedTransactions(parsedTransactions)
        setPendingExtraFields({
          accountId: toolbarState.accountId,
          cardId: toolbarState.cardId,
          isReimbursable: false,
          beneficiaryId: null
        })
        setShowParseReview(true)
        
        return { success: true }
      }
      
      return { success: false, error: result.summary || 'No transactions found in CSV' }
      
    } catch (error) {
      console.error('CSV processing error:', error)
      return { success: false, error: 'Failed to process CSV' }
    } finally {
      setIsSubmitting(false)
    }
  }, [user, handleSubmit, csvConversationContext, toolbarState])
  
  // Handle answer to CSV question
  const handleCSVQuestionAnswer = useCallback(async (answer: string) => {
    if (!pendingCSVFile || !user) return
    
    setIsSubmitting(true)
    
    // Add the answer to conversation context
    const newContext = csvConversationContext 
      ? `${csvConversationContext}\nQ: ${csvQuestion?.question}\nA: ${answer}`
      : `Q: ${csvQuestion?.question}\nA: ${answer}`
    setCsvConversationContext(newContext)
    
    try {
      const csvContent = await pendingCSVFile.text()
      
      const response = await fetch('/api/analyze-csv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          csvContent,
          instructions: '',
          previousAnswer: answer,
          conversationContext: newContext
        })
      })
      
      if (!response.ok) {
        console.error('CSV answer processing failed')
        setCsvQuestion(null)
        return
      }
      
      const result = await response.json()
      
      if (result.type === 'question') {
        // Another question
        setCsvQuestion({
          question: result.question,
          context: result.context || '',
          options: result.options || [],
          allowCustom: result.allowCustom !== false
        })
      } else if (result.type === 'transactions' && result.transactions?.length > 0) {
        // Got transactions
        const parsedTransactions: ParsedTransaction[] = result.transactions.map((tx: {
          amount: number
          currency: string
          category: string
          merchant: string | null
          transaction_datetime: string
          direction: 'in' | 'out'
          description: string | null
        }) => ({
          amount: tx.amount,
          currency: tx.currency,
          category: tx.category,
          merchant: tx.merchant,
          transaction_datetime: tx.transaction_datetime,
          direction: tx.direction,
          payment_hint: null,
          notes: tx.description,
          description: tx.description
        }))
        
        // Clear CSV state
        setPendingCSVFile(null)
        setCsvQuestion(null)
        setCsvConversationContext('')
        
        // Show in review modal
        setPendingParsedTransactions(parsedTransactions)
        setPendingExtraFields({
          accountId: toolbarState.accountId,
          cardId: toolbarState.cardId,
          isReimbursable: false,
          beneficiaryId: null
        })
        setShowParseReview(true)
      } else {
        setCsvQuestion(null)
      }
    } catch (error) {
      console.error('Error processing CSV answer:', error)
      setCsvQuestion(null)
    } finally {
      setIsSubmitting(false)
    }
  }, [pendingCSVFile, user, csvConversationContext, csvQuestion, toolbarState])
  
  // Handle confirmed transactions from ParseReviewModal
  const handleConfirmParsedTransactions = useCallback(async (reviewed: ReviewedTransaction[]) => {
    if (!user || !pendingExtraFields) return
    
    setIsSubmitting(true)
    
    // Initialize batch progress for bulk operations
    const isBulkOperation = reviewed.length >= 3
    if (isBulkOperation) {
      setBatchProgress({
        total: reviewed.length,
        processed: 0,
        succeeded: 0,
        failed: 0,
        isComplete: false
      })
      setShowBatchProgress(true)
    }
    
    let successCount = 0
    let failCount = 0
    
    for (let i = 0; i < reviewed.length; i++) {
      const tx = reviewed[i]
      const tempId = generateId()
      
      // Create optimistic entry
      const optimisticTx: UITransaction = {
        id: tempId,
        user_id: user.id,
        amount: tx.amount,
        currency: tx.currency,
        direction: tx.direction,
        category: tx.category,
        merchant: tx.merchant,
        transaction_date: tx.editedDate || tx.transaction_datetime.split('T')[0],
        transaction_time: tx.transaction_datetime,
        raw_log_id: null,
        account_id: pendingExtraFields.accountId,
        card_id: pendingExtraFields.cardId,
        original_amount: null,
        original_currency: null,
        conversion_rate: null,
        notes: tx.notes,
        description: tx.description,
        logo_url: null,
        beneficiary_id: pendingExtraFields.beneficiaryId,
        is_reimbursable: pendingExtraFields.isReimbursable,
        created_at: new Date().toISOString(),
        isOptimistic: true,
        isProcessing: true,
      }
      
      setTransactions(prev => [optimisticTx, ...prev])
      
      try {
        // Save directly to database (skip account matching since user reviewed)
        const txData = {
          user_id: user.id,
          amount: tx.amount,
          currency: tx.currency,
          direction: tx.direction,
          category: tx.category,
          merchant: tx.merchant,
          transaction_date: tx.editedDate || tx.transaction_datetime.split('T')[0],
          transaction_time: tx.transaction_datetime,
          account_id: pendingExtraFields.accountId,
          card_id: pendingExtraFields.cardId,
          notes: tx.notes,
          description: tx.description,
          beneficiary_id: pendingExtraFields.beneficiaryId,
          is_reimbursable: pendingExtraFields.isReimbursable,
        }
        
        const { data: savedTx, error } = await supabase
          .from('transactions')
          .insert(txData as never)
          .select()
          .single()
        
        if (error) throw error
        
        const saved = savedTx as Transaction
        
        // Update optimistic entry with real data
        setTransactions(prev =>
          prev.map(t => t.id === tempId ? {
            ...t,
            id: saved.id,
            isOptimistic: false,
            isProcessing: false,
          } : t)
        )
        successCount++
      } catch (error) {
        console.error('Error saving transaction:', error)
        // Mark as failed
        setTransactions(prev =>
          prev.map(t => t.id === tempId ? {
            ...t,
            isProcessing: false,
            isFailed: true,
          } : t)
        )
        failCount++
      }
      
      // Update batch progress
      if (isBulkOperation) {
        setBatchProgress(prev => ({
          ...prev,
          processed: i + 1,
          succeeded: successCount,
          failed: failCount
        }))
      }
    }
    
    // Complete batch progress
    if (isBulkOperation) {
      setBatchProgress(prev => ({ ...prev, isComplete: true }))
      setTimeout(() => setShowBatchProgress(false), 2000)
    }
    
    // Clean up
    setPendingParsedTransactions([])
    setPendingExtraFields(null)
    setShowParseReview(false)
    setIsSubmitting(false)
  }, [user, pendingExtraFields])
  
  // Handle cancel from ParseReviewModal  
  const handleCancelParseReview = useCallback(() => {
    setPendingParsedTransactions([])
    setPendingExtraFields(null)
    setShowParseReview(false)
  }, [])

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
    <div className="min-h-[100dvh] bg-slate-950 flex flex-col">
      {/* Summary Header */}
      <SummaryHeader 
        accounts={accounts} 
        summary={summary} 
        displayCurrency={defaultCurrency}
        categoryFilter={categoryFilter}
        onCategoryFilterChange={setCategoryFilter}
        customCategories={customCategories}
        beneficiaries={beneficiaries}
        beneficiaryFilter={beneficiaryFilter}
        onBeneficiaryFilterChange={setBeneficiaryFilter}
        onImportClick={() => setShowCSVUpload(true)}
      />

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
                {transactions
                  .filter(t => !categoryFilter || t.category === categoryFilter)
                  .filter(t => {
                    if (!beneficiaryFilter) return true
                    if (beneficiaryFilter === 'pending') return t.is_reimbursable && !t.beneficiary_id
                    return t.beneficiary_id === beneficiaryFilter
                  })
                  .map((transaction, index) => (
                  <TransactionCard
                    key={transaction.id}
                    transaction={transaction}
                    account={accounts.find(a => a.id === transaction.account_id)}
                    card={cards.find(c => c.id === transaction.card_id)}
                    beneficiary={beneficiaries.find(b => b.id === transaction.beneficiary_id)}
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

      {/* Chat Response (for questions) */}
      <AnimatePresence>
        {chatResponse && (
          <ChatResponse
            response={chatResponse}
            currency={defaultCurrency}
            onDismiss={() => setChatResponse(null)}
          />
        )}
      </AnimatePresence>

      {/* Input Dock with Smart Toolbar */}
      <InputDock
        accounts={accounts}
        cards={cards}
        beneficiaries={beneficiaries}
        toolbarState={toolbarState}
        onToolbarChange={setToolbarState}
        onAddBeneficiary={handleAddBeneficiary}
        onSubmit={handleSubmitWithCSV}
        isSubmitting={isSubmitting || isChatLoading}
        onCSVDrop={(file) => {
          // Store the CSV file and wait for user context
          setPendingCSVFile(file)
        }}
        pendingCSVFile={pendingCSVFile}
        onClearCSV={() => {
          setPendingCSVFile(null)
          setCsvQuestion(null)
          setCsvConversationContext('')
        }}
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

      {/* Batch Progress Modal */}
      <AnimatePresence>
        {showBatchProgress && (
          <BatchProgressModal
            isOpen={showBatchProgress}
            progress={batchProgress}
            onClose={() => setShowBatchProgress(false)}
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
        customCategories={customCategories}
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

      {/* CSV Upload Modal */}
      <AnimatePresence>
        {showCSVUpload && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowCSVUpload(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md bg-slate-900 rounded-2xl border border-white/10 p-6"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-amber-500/20">
                    <Upload className="h-5 w-5 text-amber-400" />
                  </div>
                  <h2 className="text-xl font-bold text-white">Import Bank Statement</h2>
                </div>
                <button
                  onClick={() => setShowCSVUpload(false)}
                  className="p-2 rounded-lg hover:bg-white/10 text-slate-400 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <p className="text-sm text-slate-400 mb-4">
                Upload a CSV file exported from your bank. Transactions will be staged for review before being added.
              </p>
              <CSVUpload
                userId={user?.id || ''}
                onUploadComplete={(result) => {
                  if (result.success && result.staged > 0) {
                    setShowCSVUpload(false)
                    setShowStagingReview(true)
                  }
                }}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Staging Review Modal */}
      <StagingReviewModal
        isOpen={showStagingReview}
        onClose={() => setShowStagingReview(false)}
        userId={user?.id || ''}
        accounts={accounts}
        cards={cards}
        customCategories={customCategories}
        onTransactionsUpdated={fetchData}
      />

      {/* CSV Question Modal */}
      {csvQuestion && (
        <CSVQuestionModal
          isOpen={!!csvQuestion}
          question={csvQuestion}
          onAnswer={handleCSVQuestionAnswer}
          onSkip={() => {
            // Process with defaults
            handleCSVQuestionAnswer('Use defaults')
          }}
          onCancel={() => {
            setPendingCSVFile(null)
            setCsvQuestion(null)
            setCsvConversationContext('')
          }}
          isLoading={isSubmitting}
        />
      )}

      {/* Parse Review Modal (for text input) */}
      <ParseReviewModal
        isOpen={showParseReview}
        onClose={() => setShowParseReview(false)}
        parsedTransactions={pendingParsedTransactions}
        customCategories={customCategories}
        userId={user?.id || ''}
        onConfirm={handleConfirmParsedTransactions}
        onCancel={handleCancelParseReview}
      />
    </div>
  )
}
