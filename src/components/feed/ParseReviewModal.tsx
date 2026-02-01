/**
 * Parse Review Modal
 * 
 * Allows users to review, edit, and confirm parsed transactions
 * before they are saved to the database.
 */

import { useState, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  Check,
  AlertTriangle,
  Loader2,
  Edit3,
  ChevronDown,
  Sparkles,
  Trash2,
  CheckCircle2
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatCurrency } from '@/lib/utils'
import type { ParsedTransaction } from '@/lib/ai'
import type { UserCategory, Transaction } from '@/types/database'
import { supabase } from '@/services/supabase'
import { normalizeMerchantName } from '@/lib/reconciliation'

// ============================================
// TYPES
// ============================================

interface ParseReviewModalProps {
  isOpen: boolean
  onClose: () => void
  parsedTransactions: ParsedTransaction[]
  customCategories: UserCategory[]
  userId: string
  onConfirm: (transactions: ReviewedTransaction[]) => Promise<void>
  onCancel: () => void
}

export interface ReviewedTransaction extends ParsedTransaction {
  approved: boolean
  edited: boolean
  editedDate?: string  // Override for transaction_datetime
  duplicateWarning?: {
    existingTransaction: Transaction
    matchScore: number
    reasons: string[]
  }
}

interface EditingState {
  index: number
  merchant: string
  category: string
  amount: number
  direction: 'in' | 'out'
  date: string  // Local editing state for date
}

// Default categories
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

// ============================================
// COMPONENT
// ============================================

export function ParseReviewModal({
  isOpen,
  onClose,
  parsedTransactions,
  customCategories,
  userId,
  onConfirm,
  onCancel
}: ParseReviewModalProps) {
  const [reviewedTxs, setReviewedTxs] = useState<ReviewedTransaction[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isConfirming, setIsConfirming] = useState(false)
  const [editingState, setEditingState] = useState<EditingState | null>(null)
  const [showCategoryDropdown, setShowCategoryDropdown] = useState<number | null>(null)

  // Combine default and custom categories
  const allCategories = [
    ...DEFAULT_CATEGORIES,
    ...customCategories.filter(c => c.is_active).map(c => c.name)
  ]

  // ============================================
  // DUPLICATE DETECTION
  // ============================================

  const checkForDuplicates = useCallback(async (transactions: ParsedTransaction[]) => {
    const reviewed: ReviewedTransaction[] = []
    
    for (const tx of transactions) {
      const reviewedTx: ReviewedTransaction = {
        ...tx,
        approved: true,
        edited: false
      }
      
      // Check for potential duplicates
      if (tx.transaction_datetime && tx.amount) {
        const txDate = new Date(tx.transaction_datetime)
        const minDate = new Date(txDate)
        minDate.setDate(minDate.getDate() - 2)
        const maxDate = new Date(txDate)
        maxDate.setDate(maxDate.getDate() + 2)
        
        const minAmount = tx.amount - 1.0
        const maxAmount = tx.amount + 1.0
        
        const { data: matches } = await supabase
          .from('transactions')
          .select('*')
          .eq('user_id', userId)
          .gte('transaction_date', minDate.toISOString().split('T')[0])
          .lte('transaction_date', maxDate.toISOString().split('T')[0])
          .gte('amount', minAmount)
          .lte('amount', maxAmount)
          .limit(5)
        
        if (matches && matches.length > 0) {
          // Find best match
          const normalizedMerchant = normalizeMerchantName(tx.merchant || '')
          let bestMatch: Transaction | null = null
          let bestScore = 0
          const reasons: string[] = []
          
          for (const match of matches as Transaction[]) {
            let score = 50 // Base score for date+amount match
            const matchReasons: string[] = ['Date and amount match']
            
            // Check amount precision
            if (Math.abs(match.amount - tx.amount) < 0.01) {
              score += 20
              matchReasons.push('Exact amount')
            }
            
            // Check merchant similarity
            const normalizedMatch = normalizeMerchantName(match.merchant || match.category || '')
            if (normalizedMerchant && normalizedMatch) {
              if (normalizedMerchant === normalizedMatch) {
                score += 30
                matchReasons.push('Same merchant')
              } else if (normalizedMerchant.includes(normalizedMatch) || normalizedMatch.includes(normalizedMerchant)) {
                score += 15
                matchReasons.push('Similar merchant')
              }
            }
            
            if (score > bestScore) {
              bestScore = score
              bestMatch = match
              reasons.length = 0
              reasons.push(...matchReasons)
            }
          }
          
          if (bestMatch && bestScore >= 60) {
            reviewedTx.duplicateWarning = {
              existingTransaction: bestMatch,
              matchScore: bestScore,
              reasons
            }
          }
        }
      }
      
      reviewed.push(reviewedTx)
    }
    
    return reviewed
  }, [userId])

  // Initialize reviewed transactions
  useEffect(() => {
    if (isOpen && parsedTransactions.length > 0) {
      setIsLoading(true)
      checkForDuplicates(parsedTransactions)
        .then(reviewed => {
          setReviewedTxs(reviewed)
          setIsLoading(false)
        })
        .catch(err => {
          console.error('Error checking duplicates:', err)
          // Fall back to no duplicate checking
          setReviewedTxs(parsedTransactions.map(tx => ({
            ...tx,
            approved: true,
            edited: false
          })))
          setIsLoading(false)
        })
    }
  }, [isOpen, parsedTransactions, checkForDuplicates])

  // ============================================
  // HANDLERS
  // ============================================

  const handleToggleApproval = (index: number) => {
    setReviewedTxs(prev => prev.map((tx, i) => 
      i === index ? { ...tx, approved: !tx.approved } : tx
    ))
  }

  const handleStartEdit = (index: number) => {
    const tx = reviewedTxs[index]
    // Get the display date (editedDate if edited, otherwise parse from transaction_datetime)
    const displayDate = tx.editedDate || tx.transaction_datetime.split('T')[0]
    setEditingState({
      index,
      merchant: tx.merchant || '',
      category: tx.category,
      amount: tx.amount,
      direction: tx.direction,
      date: displayDate
    })
  }

  const handleSaveEdit = () => {
    if (!editingState) return
    
    setReviewedTxs(prev => prev.map((tx, i) => 
      i === editingState.index ? {
        ...tx,
        merchant: editingState.merchant,
        category: editingState.category,
        amount: editingState.amount,
        direction: editingState.direction,
        editedDate: editingState.date,
        edited: true
      } : tx
    ))
    setEditingState(null)
  }

  const handleCancelEdit = () => {
    setEditingState(null)
  }

  const handleCategorySelect = (index: number, category: string) => {
    setReviewedTxs(prev => prev.map((tx, i) => 
      i === index ? { ...tx, category, edited: true } : tx
    ))
    setShowCategoryDropdown(null)
  }

  const handleRemove = (index: number) => {
    setReviewedTxs(prev => prev.filter((_, i) => i !== index))
  }

  const handleConfirmAll = async () => {
    const approved = reviewedTxs.filter(tx => tx.approved)
    if (approved.length === 0) {
      onCancel()
      return
    }
    
    setIsConfirming(true)
    try {
      await onConfirm(approved)
      onClose()
    } finally {
      setIsConfirming(false)
    }
  }

  const approvedCount = reviewedTxs.filter(tx => tx.approved).length
  const duplicateCount = reviewedTxs.filter(tx => tx.duplicateWarning).length

  if (!isOpen) return null

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={onCancel}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="w-full max-w-2xl max-h-[85vh] flex flex-col bg-slate-900 rounded-2xl border border-white/10 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/20">
              <Sparkles className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">
                Review Transactions ({reviewedTxs.length})
              </h2>
              {duplicateCount > 0 && (
                <p className="text-xs text-amber-400">
                  {duplicateCount} potential duplicate{duplicateCount !== 1 ? 's' : ''} found
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onCancel}
            className="p-2 rounded-lg hover:bg-white/10 text-slate-400 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 text-emerald-400 animate-spin" />
              <span className="ml-3 text-slate-400">Checking for duplicates...</span>
            </div>
          ) : reviewedTxs.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-slate-400">No transactions to review</p>
            </div>
          ) : (
            <div className="space-y-3">
              {reviewedTxs.map((tx, index) => {
                const isEditing = editingState?.index === index
                const isDuplicate = !!tx.duplicateWarning
                
                return (
                  <div
                    key={index}
                    className={cn(
                      'rounded-xl border transition-all',
                      !tx.approved && 'opacity-50',
                      isDuplicate
                        ? 'bg-amber-500/10 border-amber-500/30'
                        : 'bg-white/[0.03] border-white/[0.06]'
                    )}
                  >
                    {/* Transaction Row */}
                    <div className="p-4">
                      <div className="flex items-center gap-3">
                        {/* Approval Checkbox */}
                        <button
                          onClick={() => handleToggleApproval(index)}
                          className={cn(
                            'shrink-0 w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all',
                            tx.approved
                              ? 'bg-emerald-500 border-emerald-500'
                              : 'border-slate-600 hover:border-slate-500'
                          )}
                        >
                          {tx.approved && <Check className="h-4 w-4 text-white" />}
                        </button>

                        {/* Duplicate Warning */}
                        {isDuplicate && (
                          <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0" />
                        )}

                        {/* Transaction Info */}
                        <div className="flex-1 min-w-0">
                          {isEditing ? (
                            // Edit Mode
                            <div className="space-y-2">
                              <input
                                type="text"
                                value={editingState.merchant}
                                onChange={e => setEditingState(prev => prev ? {...prev, merchant: e.target.value} : null)}
                                placeholder="Merchant name"
                                className="w-full bg-white/[0.05] border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
                              />
                              <div className="flex gap-2">
                                <input
                                  type="number"
                                  value={editingState.amount}
                                  onChange={e => setEditingState(prev => prev ? {...prev, amount: parseFloat(e.target.value) || 0} : null)}
                                  className="w-24 bg-white/[0.05] border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
                                />
                                <input
                                  type="date"
                                  value={editingState.date}
                                  onChange={e => setEditingState(prev => prev ? {...prev, date: e.target.value} : null)}
                                  className="flex-1 bg-white/[0.05] border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
                                />
                                <select
                                  value={editingState.direction}
                                  onChange={e => setEditingState(prev => prev ? {...prev, direction: e.target.value as 'in' | 'out'} : null)}
                                  className="bg-white/[0.05] border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
                                >
                                  <option value="out">Expense</option>
                                  <option value="in">Income</option>
                                </select>
                              </div>
                              <div className="flex gap-2">
                                <button
                                  onClick={handleSaveEdit}
                                  className="px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 text-sm hover:bg-emerald-500/30"
                                >
                                  Save
                                </button>
                                <button
                                  onClick={handleCancelEdit}
                                  className="px-3 py-1.5 rounded-lg bg-white/[0.05] text-slate-400 text-sm hover:bg-white/[0.08]"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            // View Mode
                            <>
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-white truncate">
                                  {tx.merchant || tx.category}
                                </span>
                                {tx.edited && (
                                  <span className="px-1.5 py-0.5 rounded text-[10px] bg-blue-500/20 text-blue-400">
                                    Edited
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 text-sm text-slate-400 mt-0.5">
                                <span>{tx.editedDate || tx.transaction_datetime.split('T')[0]}</span>
                                <span>•</span>
                                {/* Category Dropdown */}
                                <div className="relative">
                                  <button
                                    onClick={() => setShowCategoryDropdown(showCategoryDropdown === index ? null : index)}
                                    className="flex items-center gap-1 hover:text-white transition-colors"
                                  >
                                    <span>{tx.category}</span>
                                    <ChevronDown className="h-3 w-3" />
                                  </button>
                                  
                                  <AnimatePresence>
                                    {showCategoryDropdown === index && (
                                      <motion.div
                                        initial={{ opacity: 0, y: 5 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: 5 }}
                                        className="absolute left-0 top-full mt-1 w-48 max-h-60 overflow-y-auto bg-slate-800 border border-white/10 rounded-xl shadow-xl z-50"
                                      >
                                        {allCategories.map(cat => (
                                          <button
                                            key={cat}
                                            onClick={() => handleCategorySelect(index, cat)}
                                            className={cn(
                                              'w-full px-3 py-2 text-left text-sm hover:bg-white/[0.05] transition-colors',
                                              cat === tx.category ? 'text-emerald-400' : 'text-slate-300'
                                            )}
                                          >
                                            {cat}
                                            {cat === tx.category && <Check className="h-3 w-3 inline ml-2" />}
                                          </button>
                                        ))}
                                      </motion.div>
                                    )}
                                  </AnimatePresence>
                                </div>
                              </div>
                            </>
                          )}
                        </div>

                        {/* Amount */}
                        {!isEditing && (
                          <div className={cn(
                            'text-lg font-mono font-medium shrink-0',
                            tx.direction === 'in' ? 'text-emerald-400' : 'text-rose-400'
                          )}>
                            {tx.direction === 'in' ? '+' : '-'}
                            {formatCurrency(tx.amount, tx.currency as 'SAR' | 'AED' | 'USD' | 'EUR' | 'GBP')}
                          </div>
                        )}

                        {/* Actions */}
                        {!isEditing && (
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() => handleStartEdit(index)}
                              className="p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                              title="Edit"
                            >
                              <Edit3 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleRemove(index)}
                              className="p-2 rounded-lg hover:bg-rose-500/10 text-slate-400 hover:text-rose-400 transition-colors"
                              title="Remove"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Duplicate Warning Details */}
                    {isDuplicate && tx.duplicateWarning && (
                      <div className="px-4 pb-4">
                        <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-xs text-amber-400 font-medium">Similar transaction exists</p>
                            <span className="px-2 py-0.5 rounded-full bg-amber-500/30 text-amber-300 text-[10px]">
                              {tx.duplicateWarning.matchScore}% match
                            </span>
                          </div>
                          <div className="text-sm text-slate-300">
                            <p>{tx.duplicateWarning.existingTransaction.merchant || tx.duplicateWarning.existingTransaction.category}</p>
                            <p className="text-slate-400">
                              {tx.duplicateWarning.existingTransaction.transaction_date} • {formatCurrency(
                                tx.duplicateWarning.existingTransaction.amount,
                                tx.duplicateWarning.existingTransaction.currency as 'SAR' | 'AED' | 'USD' | 'EUR' | 'GBP'
                              )}
                            </p>
                          </div>
                          <p className="text-[10px] text-slate-500 mt-1">
                            {tx.duplicateWarning.reasons.join(' • ')}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/[0.06]">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-400">
              {approvedCount} of {reviewedTxs.length} selected
            </p>
            <div className="flex gap-3">
              <button
                onClick={onCancel}
                className="px-4 py-2 rounded-xl bg-white/[0.05] text-slate-400 hover:bg-white/[0.08] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmAll}
                disabled={isConfirming || approvedCount === 0}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 text-white font-medium hover:bg-emerald-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isConfirming ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" />
                )}
                Confirm ({approvedCount})
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}
