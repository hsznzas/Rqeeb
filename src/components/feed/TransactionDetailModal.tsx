/**
 * Transaction Detail Modal
 * 
 * Modal for viewing and editing transaction details.
 * Supports: amount, date/time, currency, account/card, description, logo/emoji
 */

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  Save,
  Trash2,
  Edit3,
  Calendar,
  Clock,
  DollarSign,
  CreditCard,
  Building2,
  Banknote,
  Smartphone,
  FileText,
  Image as ImageIcon,
  Smile,
  ChevronDown,
  TrendingUp,
  TrendingDown,
  Star,
  Check,
  Upload,
  RefreshCw,
  Paperclip,
  Plus,
  Loader2
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatCurrency } from '@/lib/utils'
import { CURRENCIES, type Currency } from '@/lib/currency'
import type { Account, AccountCard, Transaction, BillingCycle, NewSubscription, TransactionAttachment } from '@/types/database'
import { BILLING_CYCLES } from '@/types/database'
import { AttachmentListItem } from './AttachmentItem'

// Common emoji options for transactions
const EMOJI_OPTIONS = [
  '☕', '🍕', '🍔', '🍿', '🎬', '🚗', '⛽', '✈️', '🏨', '🛒',
  '💊', '🏥', '📱', '💻', '🎮', '👕', '👠', '💄', '🎁', '🏋️',
  '📚', '🎵', '💳', '💰', '🏦', '📦', '🍽️', '🎉', '🏠', '⚡'
]

// Category options
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
  'Other'
]

// Account icon mapping
const accountIcons: Record<string, React.ElementType> = {
  'building-2': Building2,
  'banknote': Banknote,
  'smartphone': Smartphone,
  'credit-card': CreditCard,
}

interface TransactionDetailModalProps {
  isOpen: boolean
  transaction: Transaction | null
  accounts: Account[]
  cards: AccountCard[]
  allTransactions?: Transaction[] // For bulk edit detection
  attachments?: TransactionAttachment[]
  onClose: () => void
  onSave: (updates: Partial<Transaction>) => Promise<void>
  onBulkSave?: (merchantName: string, updates: Partial<Transaction>) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onConvertToSubscription?: (subscription: Omit<NewSubscription, 'user_id'>) => Promise<void>
  onUploadAttachment?: (file: File) => Promise<void>
  onDeleteAttachment?: (attachmentId: string) => Promise<void>
}

export function TransactionDetailModal({
  isOpen,
  transaction,
  accounts,
  cards,
  allTransactions = [],
  attachments = [],
  onClose,
  onSave,
  onBulkSave,
  onDelete,
  onConvertToSubscription,
  onUploadAttachment,
  onDeleteAttachment
}: TransactionDetailModalProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [showAccountPicker, setShowAccountPicker] = useState(false)
  const [showConversionForm, setShowConversionForm] = useState(false)
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false)
  const [showCategoryPicker, setShowCategoryPicker] = useState(false)
  const [showBulkEditPrompt, setShowBulkEditPrompt] = useState(false)
  const [pendingUpdates, setPendingUpdates] = useState<Partial<Transaction> | null>(null)
  
  // Attachment state
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false)
  const [deletingAttachmentId, setDeletingAttachmentId] = useState<string | null>(null)
  
  // Form state
  const [amount, setAmount] = useState(0)
  const [direction, setDirection] = useState<'in' | 'out'>('out')
  const [currency, setCurrency] = useState<Currency>('SAR')
  const [category, setCategory] = useState('Other')
  const [merchant, setMerchant] = useState('')
  const [description, setDescription] = useState('')
  const [logoUrl, setLogoUrl] = useState('')
  const [accountId, setAccountId] = useState<string | null>(null)
  const [cardId, setCardId] = useState<string | null>(null)
  const [transactionDate, setTransactionDate] = useState('')
  const [transactionTime, setTransactionTime] = useState('')

  // Subscription conversion form state
  const [subName, setSubName] = useState('')
  const [subBillingCycle, setSubBillingCycle] = useState<BillingCycle>('monthly')
  const [subStartDate, setSubStartDate] = useState('')
  const [isConverting, setIsConverting] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const attachmentInputRef = useRef<HTMLInputElement>(null)

  // Initialize form when transaction changes
  useEffect(() => {
    if (transaction) {
      setAmount(transaction.amount)
      setDirection(transaction.direction)
      setCurrency(transaction.currency as Currency)
      setCategory(transaction.category)
      setMerchant(transaction.merchant || '')
      setDescription(transaction.description || '')
      setLogoUrl(transaction.logo_url || '')
      setAccountId(transaction.account_id)
      setCardId(transaction.card_id)
      
      // Parse date and time from transaction_time or transaction_date
      if (transaction.transaction_time) {
        const dt = new Date(transaction.transaction_time)
        setTransactionDate(dt.toISOString().split('T')[0])
        setTransactionTime(dt.toTimeString().slice(0, 5))
      } else if (transaction.transaction_date) {
        setTransactionDate(transaction.transaction_date.split('T')[0])
        setTransactionTime('')
      }
      
      setIsEditing(false)
    }
  }, [transaction])

  // Reset when closed
  useEffect(() => {
    if (!isOpen) {
      setIsEditing(false)
      setShowEmojiPicker(false)
      setShowAccountPicker(false)
      setShowCurrencyPicker(false)
      setShowCategoryPicker(false)
    }
  }, [isOpen])

  // Count similar transactions (same merchant)
  const getSimilarTransactionsCount = (): number => {
    if (!transaction?.merchant) return 0
    return allTransactions.filter(t => 
      t.merchant === transaction.merchant && t.id !== transaction.id
    ).length
  }

  // Check if bulk-editable fields changed
  const hasBulkEditableChanges = (): boolean => {
    if (!transaction) return false
    return (
      merchant !== (transaction.merchant || '') ||
      category !== transaction.category ||
      logoUrl !== (transaction.logo_url || '')
    )
  }

  const handleSave = async () => {
    if (!transaction) return
    
    // Combine date and time into ISO string
    let transactionTimeISO: string | null = null
    if (transactionDate) {
      const dateObj = new Date(transactionDate)
      if (transactionTime) {
        const [hours, minutes] = transactionTime.split(':').map(Number)
        dateObj.setHours(hours, minutes, 0, 0)
      }
      transactionTimeISO = dateObj.toISOString()
    }

    const updates: Partial<Transaction> = {
      amount,
      direction,
      currency,
      category,
      merchant: merchant || null,
      description: description || null,
      logo_url: logoUrl || null,
      account_id: accountId,
      card_id: cardId,
      transaction_date: transactionDate,
      transaction_time: transactionTimeISO,
    }

    // Check if we should offer bulk edit
    const similarCount = getSimilarTransactionsCount()
    if (hasBulkEditableChanges() && similarCount > 0 && onBulkSave && transaction.merchant) {
      setPendingUpdates(updates)
      setShowBulkEditPrompt(true)
      return
    }

    // Save single transaction
    await doSave(updates)
  }

  const doSave = async (updates: Partial<Transaction>) => {
    setIsSaving(true)
    try {
      await onSave(updates)
      setIsEditing(false)
    } catch (error) {
      console.error('Error saving transaction:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleBulkSave = async () => {
    if (!pendingUpdates || !transaction?.merchant || !onBulkSave) return
    
    setIsSaving(true)
    try {
      // First save the current transaction
      await onSave(pendingUpdates)
      
      // Then bulk update similar transactions (only category, logo_url)
      const bulkUpdates: Partial<Transaction> = {}
      if (category !== transaction.category) bulkUpdates.category = category
      if (logoUrl !== (transaction.logo_url || '')) bulkUpdates.logo_url = logoUrl || null
      
      if (Object.keys(bulkUpdates).length > 0) {
        await onBulkSave(transaction.merchant, bulkUpdates)
      }
      
      setIsEditing(false)
      setShowBulkEditPrompt(false)
      setPendingUpdates(null)
    } catch (error) {
      console.error('Error bulk saving transactions:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleSingleSave = async () => {
    if (!pendingUpdates) return
    await doSave(pendingUpdates)
    setShowBulkEditPrompt(false)
    setPendingUpdates(null)
  }

  const handleDelete = async () => {
    if (!transaction) return
    
    setIsDeleting(true)
    try {
      await onDelete(transaction.id)
      onClose()
    } catch (error) {
      console.error('Error deleting transaction:', error)
    } finally {
      setIsDeleting(false)
    }
  }

  // Open conversion form with pre-filled values
  const openConversionForm = () => {
    if (!transaction) return
    setSubName(transaction.merchant || '')
    setSubBillingCycle('monthly')
    // Use transaction date as default start date
    const txDate = transaction.transaction_time || transaction.transaction_date
    if (txDate) {
      setSubStartDate(new Date(txDate).toISOString().split('T')[0])
    } else {
      setSubStartDate(new Date().toISOString().split('T')[0])
    }
    setShowConversionForm(true)
  }

  // Handle converting transaction to subscription
  const handleConvertToSubscription = async () => {
    if (!transaction || !onConvertToSubscription) return
    
    setIsConverting(true)
    try {
      // Calculate deduction day from start date
      const startDateObj = new Date(subStartDate)
      const deductionDay = startDateObj.getDate()
      
      await onConvertToSubscription({
        name: subName,
        amount: transaction.amount,
        currency: transaction.currency,
        account_id: transaction.account_id,
        card_id: transaction.card_id,
        category: transaction.category,
        deduction_day: deductionDay,
        billing_cycle: subBillingCycle,
        is_active: true,
        icon: transaction.logo_url || '💳',
        color: '#8b5cf6',
        notes: transaction.description,
        next_deduction_date: subStartDate,
      })
      
      setShowConversionForm(false)
      onClose()
    } catch (error) {
      console.error('Error converting to subscription:', error)
    } finally {
      setIsConverting(false)
    }
  }

  const handleEmojiSelect = (emoji: string) => {
    setLogoUrl(emoji)
    setShowEmojiPicker(false)
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // For now, just create a local URL
      // In production, upload to Supabase Storage
      const url = URL.createObjectURL(file)
      setLogoUrl(url)
    }
  }

  const handleAccountSelect = (accId: string, cId: string | null) => {
    setAccountId(accId)
    setCardId(cId)
    setShowAccountPicker(false)
  }

  // Handle attachment file selection
  const handleAttachmentSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0 || !onUploadAttachment) return

    setIsUploadingAttachment(true)
    try {
      // Upload each selected file
      for (const file of Array.from(files)) {
        await onUploadAttachment(file)
      }
    } catch (error) {
      console.error('Error uploading attachment:', error)
    } finally {
      setIsUploadingAttachment(false)
      // Reset file input
      if (attachmentInputRef.current) {
        attachmentInputRef.current.value = ''
      }
    }
  }

  // Handle attachment deletion
  const handleDeleteAttachment = async (attachmentId: string) => {
    if (!onDeleteAttachment) return

    setDeletingAttachmentId(attachmentId)
    try {
      await onDeleteAttachment(attachmentId)
    } catch (error) {
      console.error('Error deleting attachment:', error)
    } finally {
      setDeletingAttachmentId(null)
    }
  }

  const selectedAccount = accounts.find(a => a.id === accountId)
  const selectedCard = cards.find(c => c.id === cardId)
  const AccountIcon = selectedAccount ? (accountIcons[selectedAccount.icon] || CreditCard) : CreditCard

  if (!isOpen || !transaction) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="w-full max-w-lg max-h-[90vh] overflow-y-auto"
          onClick={e => e.stopPropagation()}
        >
          <div className="backdrop-blur-xl bg-white/[0.08] border border-white/10 rounded-3xl shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/[0.06]">
              <div className="flex items-center gap-3">
                {/* Logo/Emoji */}
                <div 
                  className={cn(
                    'w-12 h-12 rounded-2xl flex items-center justify-center text-2xl',
                    'bg-white/[0.05] border border-white/[0.08]',
                    isEditing && 'cursor-pointer hover:bg-white/[0.08]'
                  )}
                  onClick={() => isEditing && setShowEmojiPicker(true)}
                >
                  {logoUrl ? (
                    logoUrl.length <= 2 ? (
                      <span>{logoUrl}</span>
                    ) : (
                      <img src={logoUrl} alt="" className="w-8 h-8 rounded-lg object-cover" />
                    )
                  ) : (
                    <DollarSign className="h-6 w-6 text-slate-400" />
                  )}
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white">
                    {isEditing ? 'Edit Transaction' : 'Transaction Details'}
                  </h2>
                  <p className="text-sm text-slate-500">
                    {new Date(transaction.created_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                {!isEditing ? (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="p-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.08] text-slate-400 hover:text-white transition-colors"
                  >
                    <Edit3 className="h-5 w-5" />
                  </button>
                ) : (
                  <button
                    onClick={() => setIsEditing(false)}
                    className="px-3 py-1.5 rounded-lg text-sm text-slate-400 hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="p-2 rounded-xl hover:bg-white/[0.08] text-slate-400 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-4 space-y-4">
              {/* Amount Section */}
              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
                <label className="text-xs text-slate-500 uppercase tracking-wider mb-2 block">Amount</label>
                
                <div className="flex items-center gap-3">
                  {/* Direction Toggle */}
                  {isEditing ? (
                    <button
                      onClick={() => setDirection(d => d === 'in' ? 'out' : 'in')}
                      className={cn(
                        'p-2 rounded-xl transition-colors',
                        direction === 'in' 
                          ? 'bg-emerald-500/20 text-emerald-400' 
                          : 'bg-rose-500/20 text-rose-400'
                      )}
                    >
                      {direction === 'in' ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
                    </button>
                  ) : (
                    <div className={cn(
                      'p-2 rounded-xl',
                      direction === 'in' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                    )}>
                      {direction === 'in' ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
                    </div>
                  )}

                  {/* Amount */}
                  {isEditing ? (
                    <input
                      type="number"
                      value={amount}
                      onChange={e => setAmount(parseFloat(e.target.value) || 0)}
                      className="flex-1 bg-transparent text-3xl font-bold font-mono text-white outline-none"
                      placeholder="0.00"
                      step="0.01"
                    />
                  ) : (
                    <span className={cn(
                      'text-3xl font-bold font-mono',
                      direction === 'in' ? 'text-emerald-400' : 'text-rose-400'
                    )}>
                      {direction === 'in' ? '+' : '-'}{formatCurrency(amount, currency)}
                    </span>
                  )}

                  {/* Currency */}
                  <div className="relative">
                    <button
                      onClick={() => isEditing && setShowCurrencyPicker(!showCurrencyPicker)}
                      disabled={!isEditing}
                      className={cn(
                        'px-3 py-1.5 rounded-lg text-sm font-medium',
                        'bg-white/[0.05] border border-white/[0.08]',
                        isEditing && 'hover:bg-white/[0.08] cursor-pointer',
                        'text-slate-400 flex items-center gap-1'
                      )}
                    >
                      {CURRENCIES[currency]?.flag} {currency}
                      {isEditing && <ChevronDown className="h-3 w-3" />}
                    </button>

                    {/* Currency Picker */}
                    {showCurrencyPicker && (
                      <div className="absolute right-0 top-full mt-2 w-48 p-2 rounded-xl bg-slate-900 border border-white/10 shadow-xl z-10 max-h-60 overflow-y-auto">
                        {Object.entries(CURRENCIES).map(([code, { flag }]) => (
                          <button
                            key={code}
                            onClick={() => { setCurrency(code as Currency); setShowCurrencyPicker(false) }}
                            className={cn(
                              'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-sm',
                              'hover:bg-white/[0.05] transition-colors',
                              currency === code ? 'text-emerald-400' : 'text-slate-400'
                            )}
                          >
                            <span>{flag}</span>
                            <span>{code}</span>
                            {currency === code && <Check className="h-4 w-4 ml-auto" />}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Date & Time */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                  <label className="text-xs text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Date
                  </label>
                  {isEditing ? (
                    <input
                      type="date"
                      value={transactionDate}
                      onChange={e => setTransactionDate(e.target.value)}
                      className="w-full bg-transparent text-white outline-none text-sm"
                    />
                  ) : (
                    <p className="text-white text-sm">{transactionDate || 'Not set'}</p>
                  )}
                </div>

                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                  <label className="text-xs text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Time
                  </label>
                  {isEditing ? (
                    <input
                      type="time"
                      value={transactionTime}
                      onChange={e => setTransactionTime(e.target.value)}
                      className="w-full bg-transparent text-white outline-none text-sm"
                    />
                  ) : (
                    <p className="text-white text-sm">{transactionTime || 'Not set'}</p>
                  )}
                </div>
              </div>

              {/* Merchant & Category */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                  <label className="text-xs text-slate-500 uppercase tracking-wider mb-2 block">Merchant</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={merchant}
                      onChange={e => setMerchant(e.target.value)}
                      className="w-full bg-transparent text-white outline-none text-sm"
                      placeholder="e.g., Starbucks"
                    />
                  ) : (
                    <p className="text-white text-sm truncate">{merchant || 'Not set'}</p>
                  )}
                </div>

                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] relative">
                  <label className="text-xs text-slate-500 uppercase tracking-wider mb-2 block">Category</label>
                  {isEditing ? (
                    <button
                      onClick={() => setShowCategoryPicker(!showCategoryPicker)}
                      className="w-full flex items-center justify-between text-white text-sm"
                    >
                      <span>{category}</span>
                      <ChevronDown className="h-4 w-4 text-slate-500" />
                    </button>
                  ) : (
                    <p className="text-white text-sm">{category}</p>
                  )}

                  {/* Category Picker */}
                  {showCategoryPicker && (
                    <div className="absolute left-0 right-0 top-full mt-2 p-2 rounded-xl bg-slate-900 border border-white/10 shadow-xl z-10 max-h-48 overflow-y-auto">
                      {CATEGORIES.map((cat) => (
                        <button
                          key={cat}
                          onClick={() => { setCategory(cat); setShowCategoryPicker(false) }}
                          className={cn(
                            'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-sm',
                            'hover:bg-white/[0.05] transition-colors',
                            category === cat ? 'text-emerald-400' : 'text-slate-400'
                          )}
                        >
                          <span>{cat}</span>
                          {category === cat && <Check className="h-4 w-4 ml-auto" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Account/Card Selection */}
              <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] relative">
                <label className="text-xs text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                  <CreditCard className="h-3 w-3" />
                  Account / Card
                </label>
                
                <button
                  onClick={() => isEditing && setShowAccountPicker(!showAccountPicker)}
                  disabled={!isEditing}
                  className={cn(
                    'w-full flex items-center gap-3 text-left',
                    isEditing && 'cursor-pointer'
                  )}
                >
                  {selectedAccount ? (
                    <>
                      <div 
                        className="p-2 rounded-lg"
                        style={{ backgroundColor: `${selectedAccount.color}20` }}
                      >
                        <AccountIcon className="h-4 w-4" style={{ color: selectedAccount.color }} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-white text-sm">{selectedAccount.name}</span>
                          {selectedAccount.is_default && (
                            <Star className="h-3 w-3 text-amber-400 fill-amber-400" />
                          )}
                        </div>
                        {selectedCard && (
                          <span className="text-xs text-slate-500">
                            {selectedCard.name} ****{selectedCard.last_4_digits}
                          </span>
                        )}
                      </div>
                      {isEditing && <ChevronDown className="h-4 w-4 text-slate-500" />}
                    </>
                  ) : (
                    <>
                      <div className="p-2 rounded-lg bg-white/[0.05]">
                        <CreditCard className="h-4 w-4 text-slate-500" />
                      </div>
                      <span className="text-slate-500 text-sm">No account assigned</span>
                      {isEditing && <ChevronDown className="h-4 w-4 text-slate-500 ml-auto" />}
                    </>
                  )}
                </button>

                {/* Account Picker */}
                {showAccountPicker && (
                  <div className="absolute left-0 right-0 top-full mt-2 p-2 rounded-xl bg-slate-900 border border-white/10 shadow-xl z-10 max-h-60 overflow-y-auto">
                    {/* None option */}
                    <button
                      onClick={() => handleAccountSelect('', null)}
                      className={cn(
                        'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left',
                        'hover:bg-white/[0.05] transition-colors text-slate-400'
                      )}
                    >
                      <div className="p-2 rounded-lg bg-white/[0.05]">
                        <X className="h-4 w-4" />
                      </div>
                      <span className="text-sm">No account</span>
                    </button>

                    {accounts.map(account => {
                      const Icon = accountIcons[account.icon] || CreditCard
                      const accountCards = cards.filter(c => c.account_id === account.id)
                      
                      return (
                        <div key={account.id}>
                          <button
                            onClick={() => handleAccountSelect(account.id, null)}
                            className={cn(
                              'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left',
                              'hover:bg-white/[0.05] transition-colors',
                              accountId === account.id && !cardId ? 'text-emerald-400' : 'text-slate-400'
                            )}
                          >
                            <div 
                              className="p-2 rounded-lg"
                              style={{ backgroundColor: `${account.color}20` }}
                            >
                              <Icon className="h-4 w-4" style={{ color: account.color }} />
                            </div>
                            <span className="text-sm flex-1">{account.name}</span>
                            {accountId === account.id && !cardId && <Check className="h-4 w-4" />}
                          </button>
                          
                          {/* Cards under this account */}
                          {accountCards.map(card => (
                            <button
                              key={card.id}
                              onClick={() => handleAccountSelect(account.id, card.id)}
                              className={cn(
                                'w-full flex items-center gap-3 px-3 py-2 pl-8 rounded-lg text-left',
                                'hover:bg-white/[0.05] transition-colors',
                                cardId === card.id ? 'text-emerald-400' : 'text-slate-500'
                              )}
                            >
                              <div 
                                className="w-8 h-5 rounded flex items-center justify-center text-[8px] font-bold"
                                style={{ backgroundColor: card.color }}
                              >
                                {card.type === 'credit' ? 'CR' : 'DB'}
                              </div>
                              <span className="text-sm flex-1">
                                {card.name} ****{card.last_4_digits}
                              </span>
                              {cardId === card.id && <Check className="h-4 w-4" />}
                            </button>
                          ))}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Description */}
              <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                <label className="text-xs text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                  <FileText className="h-3 w-3" />
                  Description / Notes
                </label>
                {isEditing ? (
                  <textarea
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    className="w-full bg-transparent text-white outline-none text-sm resize-none min-h-[80px]"
                    placeholder="Add a note about this transaction..."
                  />
                ) : (
                  <p className="text-white text-sm whitespace-pre-wrap">
                    {description || <span className="text-slate-500">No description</span>}
                  </p>
                )}
              </div>

              {/* Logo/Icon Section (Edit Mode Only) */}
              {isEditing && (
                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                  <label className="text-xs text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                    <ImageIcon className="h-3 w-3" />
                    Logo / Icon
                  </label>
                  
                  <div className="flex flex-wrap gap-2">
                    {/* Current Logo Preview */}
                    {logoUrl && (
                      <div className="relative">
                        <div className="w-12 h-12 rounded-xl bg-white/[0.05] border border-white/[0.08] flex items-center justify-center">
                          {logoUrl.length <= 2 ? (
                            <span className="text-2xl">{logoUrl}</span>
                          ) : (
                            <img src={logoUrl} alt="" className="w-8 h-8 rounded-lg object-cover" />
                          )}
                        </div>
                        <button
                          onClick={() => setLogoUrl('')}
                          className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-rose-500 flex items-center justify-center"
                        >
                          <X className="h-3 w-3 text-white" />
                        </button>
                      </div>
                    )}

                    {/* Emoji Picker Button */}
                    <button
                      onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                      className="w-12 h-12 rounded-xl bg-white/[0.05] border border-white/[0.08] flex items-center justify-center hover:bg-white/[0.08] transition-colors"
                    >
                      <Smile className="h-5 w-5 text-slate-400" />
                    </button>

                    {/* Upload Button */}
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="w-12 h-12 rounded-xl bg-white/[0.05] border border-white/[0.08] flex items-center justify-center hover:bg-white/[0.08] transition-colors"
                    >
                      <Upload className="h-5 w-5 text-slate-400" />
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </div>

                  {/* Emoji Grid */}
                  {showEmojiPicker && (
                    <div className="mt-3 p-3 rounded-xl bg-slate-900 border border-white/10">
                      <div className="grid grid-cols-10 gap-2">
                        {EMOJI_OPTIONS.map((emoji) => (
                          <button
                            key={emoji}
                            onClick={() => handleEmojiSelect(emoji)}
                            className="w-8 h-8 rounded-lg hover:bg-white/[0.1] flex items-center justify-center text-lg transition-colors"
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Attachments Section */}
              <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                <label className="text-xs text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                  <Paperclip className="h-3 w-3" />
                  Attachments
                  {attachments.length > 0 && (
                    <span className="ml-1 text-emerald-400">({attachments.length})</span>
                  )}
                </label>
                
                {/* Attachments List */}
                {attachments.length > 0 ? (
                  <div className="space-y-2 mb-3">
                    <AnimatePresence mode="popLayout">
                      {attachments.map((attachment) => (
                        <AttachmentListItem
                          key={attachment.id}
                          attachment={attachment}
                          onDelete={onDeleteAttachment ? handleDeleteAttachment : undefined}
                          isDeleting={deletingAttachmentId === attachment.id}
                          canDelete={isEditing}
                        />
                      ))}
                    </AnimatePresence>
                  </div>
                ) : (
                  <p className="text-slate-500 text-sm mb-3">
                    No attachments yet
                  </p>
                )}

                {/* Upload Button (Edit Mode or Always) */}
                {onUploadAttachment && (
                  <div>
                    <input
                      ref={attachmentInputRef}
                      type="file"
                      accept="image/*,application/pdf"
                      multiple
                      onChange={handleAttachmentSelect}
                      className="hidden"
                    />
                    <button
                      onClick={() => attachmentInputRef.current?.click()}
                      disabled={isUploadingAttachment}
                      className={cn(
                        'flex items-center gap-2 px-3 py-2 rounded-xl text-sm w-full',
                        'bg-white/[0.05] border border-white/[0.08]',
                        'hover:bg-white/[0.08] transition-colors',
                        'text-slate-300 justify-center',
                        isUploadingAttachment && 'opacity-50 cursor-not-allowed'
                      )}
                    >
                      {isUploadingAttachment ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Plus className="h-4 w-4" />
                          Add Attachment
                        </>
                      )}
                    </button>
                    <p className="text-[10px] text-slate-600 mt-1 text-center">
                      Images and PDFs up to 10MB
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Footer Actions */}
            <div className="p-4 border-t border-white/[0.06] flex items-center justify-between">
              {isEditing ? (
                <>
                  <button
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className={cn(
                      'flex items-center gap-2 px-4 py-2 rounded-xl',
                      'bg-rose-500/10 text-rose-400 hover:bg-rose-500/20',
                      'transition-colors disabled:opacity-50'
                    )}
                  >
                    <Trash2 className="h-4 w-4" />
                    {isDeleting ? 'Deleting...' : 'Delete'}
                  </button>
                  
                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className={cn(
                      'flex items-center gap-2 px-4 py-2 rounded-xl',
                      'bg-emerald-500 text-white hover:bg-emerald-600',
                      'transition-colors disabled:opacity-50'
                    )}
                  >
                    <Save className="h-4 w-4" />
                    {isSaving ? 'Saving...' : 'Save Changes'}
                  </button>
                </>
              ) : (
                <div className="flex items-center justify-between w-full">
                  {/* Convert to Subscription button */}
                  {onConvertToSubscription && transaction.direction === 'out' && (
                    <button
                      onClick={openConversionForm}
                      className={cn(
                        'flex items-center gap-2 px-3 py-2 rounded-xl text-sm',
                        'bg-purple-500/10 text-purple-400 border border-purple-500/20',
                        'hover:bg-purple-500/20 transition-colors'
                      )}
                    >
                      <RefreshCw className="h-4 w-4" />
                      <span className="hidden sm:inline">Make Recurring</span>
                    </button>
                  )}
                  
                  <div className="flex items-center gap-2 text-sm text-slate-500 flex-1 justify-center">
                    <span>Tap</span>
                    <Edit3 className="h-4 w-4" />
                    <span>to edit</span>
                  </div>
                </div>
              )}
            </div>

            {/* Convert to Subscription Form */}
            <AnimatePresence>
              {showConversionForm && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm rounded-3xl"
                >
                  <div className="p-6 max-w-sm mx-4 rounded-2xl bg-slate-900 border border-white/10 shadow-xl w-full">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                        <RefreshCw className="h-5 w-5 text-purple-400" />
                        Convert to Subscription
                      </h3>
                      <button
                        onClick={() => setShowConversionForm(false)}
                        className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    
                    <div className="space-y-4">
                      {/* Subscription Name */}
                      <div>
                        <label className="block text-xs text-slate-500 mb-1.5">
                          Subscription Name
                        </label>
                        <input
                          type="text"
                          value={subName}
                          onChange={e => setSubName(e.target.value)}
                          placeholder="e.g., Netflix, Spotify"
                          className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                        />
                      </div>
                      
                      {/* Amount (read-only) */}
                      <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                        <DollarSign className="h-4 w-4 text-slate-500" />
                        <span className="text-white font-medium">
                          {formatCurrency(transaction?.amount || 0, transaction?.currency || 'SAR')}
                        </span>
                        <span className="text-xs text-slate-500">per cycle</span>
                      </div>
                      
                      {/* Billing Cycle */}
                      <div>
                        <label className="block text-xs text-slate-500 mb-1.5">
                          Billing Cycle
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          {BILLING_CYCLES.map(cycle => (
                            <button
                              key={cycle.value}
                              type="button"
                              onClick={() => setSubBillingCycle(cycle.value)}
                              className={cn(
                                'px-3 py-2 rounded-xl text-sm transition-colors',
                                subBillingCycle === cycle.value
                                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                                  : 'bg-white/[0.03] text-slate-400 border border-white/[0.06] hover:bg-white/[0.06]'
                              )}
                            >
                              {cycle.label}
                            </button>
                          ))}
                        </div>
                      </div>
                      
                      {/* Start Date */}
                      <div>
                        <label className="block text-xs text-slate-500 mb-1.5">
                          First Deduction Date
                        </label>
                        <p className="text-xs text-slate-600 mb-2">
                          Adjust if there's a free trial period
                        </p>
                        <input
                          type="date"
                          value={subStartDate}
                          onChange={e => setSubStartDate(e.target.value)}
                          className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                        />
                      </div>
                    </div>
                    
                    {/* Actions */}
                    <div className="flex gap-3 mt-6">
                      <button
                        onClick={() => setShowConversionForm(false)}
                        className={cn(
                          'flex-1 px-4 py-2 rounded-xl text-sm',
                          'bg-white/[0.05] border border-white/[0.08] text-slate-300',
                          'hover:bg-white/[0.08] transition-colors'
                        )}
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleConvertToSubscription}
                        disabled={isConverting || !subName.trim()}
                        className={cn(
                          'flex-1 px-4 py-2 rounded-xl text-sm font-medium',
                          'bg-purple-500 text-white',
                          'hover:bg-purple-600 transition-colors disabled:opacity-50'
                        )}
                      >
                        {isConverting ? 'Creating...' : 'Create Subscription'}
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Bulk Edit Prompt */}
            <AnimatePresence>
              {showBulkEditPrompt && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm rounded-3xl"
                >
                  <div className="p-6 max-w-sm mx-4 rounded-2xl bg-slate-900 border border-white/10 shadow-xl">
                    <h3 className="text-lg font-semibold text-white mb-2">
                      Apply to Similar Transactions?
                    </h3>
                    <p className="text-sm text-slate-400 mb-4">
                      Found <span className="text-amber-400 font-medium">{getSimilarTransactionsCount()}</span> other transactions 
                      from "{transaction?.merchant}". Apply the same category/icon changes?
                    </p>
                    <div className="flex gap-3">
                      <button
                        onClick={handleSingleSave}
                        disabled={isSaving}
                        className={cn(
                          'flex-1 px-4 py-2 rounded-xl text-sm',
                          'bg-white/[0.05] border border-white/[0.08] text-slate-300',
                          'hover:bg-white/[0.08] transition-colors disabled:opacity-50'
                        )}
                      >
                        Just This One
                      </button>
                      <button
                        onClick={handleBulkSave}
                        disabled={isSaving}
                        className={cn(
                          'flex-1 px-4 py-2 rounded-xl text-sm font-medium',
                          'bg-amber-500 text-white',
                          'hover:bg-amber-600 transition-colors disabled:opacity-50'
                        )}
                      >
                        {isSaving ? 'Applying...' : 'Apply to All'}
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

