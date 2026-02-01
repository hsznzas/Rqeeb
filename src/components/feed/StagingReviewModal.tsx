/**
 * Staging Review Modal
 * 
 * Allows users to review, edit, and approve/reject staged transactions
 * from CSV imports before they enter the real ledger.
 */

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  Check,
  Trash2,
  AlertTriangle,
  Loader2,
  Merge,
  Plus,
  Edit3,
  CheckCircle2,
  FileSpreadsheet,
  ChevronDown,
  ChevronUp
} from 'lucide-react'
import { GlassCard } from '@/components/ui'
import { cn } from '@/lib/utils'
import { formatCurrency } from '@/lib/utils'
import { getAllCategories } from '@/lib/constants'
import type { StagingTransaction, Transaction, Account, AccountCard, UserCategory } from '@/types/database'
import {
  getPendingStagingTransactions,
  approveStaging,
  mergeWithExisting,
  rejectStaging,
  bulkApproveNonDuplicates,
  learnCategoryRule
} from '@/lib/reconciliation'
import { supabase } from '@/services/supabase'

// ============================================
// TYPES
// ============================================

interface StagingReviewModalProps {
  isOpen: boolean
  onClose: () => void
  userId: string
  accounts: Account[]
  cards: AccountCard[]
  customCategories?: UserCategory[]
  onTransactionsUpdated: () => void
}

interface ExtractedData {
  date?: string
  description?: string
  amount?: number
  currency?: string
  category?: string
  direction?: 'in' | 'out'
  original_row_index?: number
}

interface EditingState {
  category: string
  merchant: string
  amount: number
  direction: 'in' | 'out'
  date: string
}

// ============================================
// COMPONENT
// ============================================

export function StagingReviewModal({
  isOpen,
  onClose,
  userId,
  accounts,
  cards,
  customCategories = [],
  onTransactionsUpdated
}: StagingReviewModalProps) {
  // Get all categories (custom + default)
  const allCategories = getAllCategories(customCategories)
  const [stagingTxs, setStagingTxs] = useState<StagingTransaction[]>([])
  const [potentialMatches, setPotentialMatches] = useState<Record<string, Transaction | null>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set())
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingState, setEditingState] = useState<EditingState | null>(null)
  const [isBulkProcessing, setIsBulkProcessing] = useState(false)

  // Default account/card for new transactions
  const defaultAccount = accounts.find(a => a.is_default)
  const defaultCard = cards.find(c => c.is_default)

  // ============================================
  // DATA FETCHING
  // ============================================

  const fetchStagingData = useCallback(async () => {
    if (!userId) return
    setIsLoading(true)

    try {
      const txs = await getPendingStagingTransactions(userId)
      setStagingTxs(txs)

      // Fetch potential matches for duplicates
      const matchPromises = txs
        .filter(tx => tx.potential_match_id)
        .map(async (tx) => {
          const { data } = await supabase
            .from('transactions')
            .select('*')
            .eq('id', tx.potential_match_id!)
            .single()
          return { stagingId: tx.id, match: data as Transaction | null }
        })

      const matches = await Promise.all(matchPromises)
      const matchMap: Record<string, Transaction | null> = {}
      matches.forEach(m => {
        matchMap[m.stagingId] = m.match
      })
      setPotentialMatches(matchMap)
    } catch (error) {
      console.error('Error fetching staging data:', error)
    } finally {
      setIsLoading(false)
    }
  }, [userId])

  useEffect(() => {
    if (isOpen) {
      fetchStagingData()
    }
  }, [isOpen, fetchStagingData])

  // ============================================
  // ACTIONS
  // ============================================

  const handleApprove = async (staging: StagingTransaction) => {
    const extracted = staging.extracted_data as ExtractedData
    const editing = editingId === staging.id ? editingState : null

    setProcessingIds(prev => new Set(prev).add(staging.id))

    try {
      // Learn category if user edited it
      if (editing && editing.category !== extracted.category && editing.merchant) {
        await learnCategoryRule(userId, editing.merchant, editing.category)
      }

      const result = await approveStaging(staging.id, userId, {
        amount: editing?.amount ?? extracted.amount ?? 0,
        currency: extracted.currency || 'SAR',
        direction: editing?.direction ?? extracted.direction ?? 'out',
        category: editing?.category ?? extracted.category ?? 'Other',
        merchant: editing?.merchant ?? extracted.description ?? null,
        transaction_date: editing?.date ?? extracted.date ?? new Date().toISOString().split('T')[0],
        account_id: defaultAccount?.id || null,
        card_id: defaultCard?.id || null
      })

      if (result.success) {
        setStagingTxs(prev => prev.filter(tx => tx.id !== staging.id))
        onTransactionsUpdated()
      }
    } finally {
      setProcessingIds(prev => {
        const next = new Set(prev)
        next.delete(staging.id)
        return next
      })
      setEditingId(null)
      setEditingState(null)
    }
  }

  const handleMerge = async (staging: StagingTransaction) => {
    if (!staging.potential_match_id) return

    const extracted = staging.extracted_data as ExtractedData
    const editing = editingId === staging.id ? editingState : null

    setProcessingIds(prev => new Set(prev).add(staging.id))

    try {
      // Learn category if user edited it
      if (editing && editing.category !== extracted.category && editing.merchant) {
        await learnCategoryRule(userId, editing.merchant, editing.category)
      }

      const result = await mergeWithExisting(staging.id, staging.potential_match_id, {
        merchant: editing?.merchant ?? extracted.description ?? undefined,
        category: editing?.category ?? extracted.category ?? undefined
      })

      if (result.success) {
        setStagingTxs(prev => prev.filter(tx => tx.id !== staging.id))
        onTransactionsUpdated()
      }
    } finally {
      setProcessingIds(prev => {
        const next = new Set(prev)
        next.delete(staging.id)
        return next
      })
    }
  }

  const handleReject = async (stagingId: string) => {
    setProcessingIds(prev => new Set(prev).add(stagingId))

    try {
      const result = await rejectStaging(stagingId)
      if (result.success) {
        setStagingTxs(prev => prev.filter(tx => tx.id !== stagingId))
      }
    } finally {
      setProcessingIds(prev => {
        const next = new Set(prev)
        next.delete(stagingId)
        return next
      })
    }
  }

  const handleBulkApprove = async () => {
    const nonDuplicateIds = stagingTxs
      .filter(tx => !tx.potential_match_id)
      .map(tx => tx.id)

    if (nonDuplicateIds.length === 0) return

    setIsBulkProcessing(true)

    try {
      const result = await bulkApproveNonDuplicates(
        userId,
        nonDuplicateIds,
        defaultAccount?.id,
        defaultCard?.id
      )

      if (result.approved > 0) {
        await fetchStagingData()
        onTransactionsUpdated()
      }
    } finally {
      setIsBulkProcessing(false)
    }
  }

  const toggleExpanded = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const startEditing = (staging: StagingTransaction) => {
    const extracted = staging.extracted_data as ExtractedData
    setEditingId(staging.id)
    setEditingState({
      category: extracted.category || 'Other',
      merchant: extracted.description || '',
      amount: extracted.amount || 0,
      direction: extracted.direction || 'out',
      date: extracted.date || new Date().toISOString().split('T')[0]
    })
    setExpandedIds(prev => new Set(prev).add(staging.id))
  }

  // ============================================
  // RENDER
  // ============================================

  if (!isOpen) return null

  const nonDuplicateCount = stagingTxs.filter(tx => !tx.potential_match_id).length
  const duplicateCount = stagingTxs.filter(tx => tx.potential_match_id).length

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
        className="w-full max-w-4xl max-h-[85vh] overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <GlassCard size="lg" className="flex flex-col h-full max-h-[85vh]">
          {/* Header */}
          <div className="flex items-center justify-between mb-4 shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-amber-500/20">
                <FileSpreadsheet className="h-5 w-5 text-amber-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Review Staged Transactions</h2>
                <p className="text-sm text-slate-400">
                  {stagingTxs.length} pending • {duplicateCount} potential duplicates
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-white/10 text-slate-400 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto min-h-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 text-amber-400 animate-spin" />
              </div>
            ) : stagingTxs.length === 0 ? (
              <div className="text-center py-12">
                <CheckCircle2 className="h-12 w-12 text-emerald-400 mx-auto mb-3" />
                <p className="text-white font-medium">All caught up!</p>
                <p className="text-sm text-slate-400">No pending transactions to review</p>
              </div>
            ) : (
              <div className="space-y-3">
                {stagingTxs.map(staging => {
                  const extracted = staging.extracted_data as ExtractedData
                  const match = potentialMatches[staging.id]
                  const isProcessing = processingIds.has(staging.id)
                  const isExpanded = expandedIds.has(staging.id)
                  const isEditing = editingId === staging.id

                  return (
                    <div
                      key={staging.id}
                      className={cn(
                        'rounded-xl border transition-all',
                        match
                          ? 'bg-amber-500/10 border-amber-500/30'
                          : 'bg-white/[0.03] border-white/[0.06]'
                      )}
                    >
                      {/* Main Row */}
                      <div className="p-4">
                        <div className="flex items-center gap-4">
                          {/* Duplicate Warning */}
                          {match && (
                            <div className="shrink-0">
                              <AlertTriangle className="h-5 w-5 text-amber-400" />
                            </div>
                          )}

                          {/* Transaction Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-white truncate">
                                {extracted.description || 'Unknown'}
                              </span>
                              {match && (
                                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-xs">
                                  Potential Duplicate
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-3 text-sm text-slate-400 mt-1">
                              <span>{extracted.date}</span>
                              <span>•</span>
                              <span>{extracted.category || 'Uncategorized'}</span>
                              {staging.csv_source && (
                                <>
                                  <span>•</span>
                                  <span className="truncate">{staging.csv_source}</span>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Amount */}
                          <div className={cn(
                            'text-lg font-mono font-medium shrink-0',
                            extracted.direction === 'in' ? 'text-emerald-400' : 'text-rose-400'
                          )}>
                            {extracted.direction === 'in' ? '+' : '-'}
                            {formatCurrency(extracted.amount || 0, (extracted.currency || 'SAR') as 'SAR' | 'AED' | 'USD' | 'EUR' | 'GBP')}
                          </div>

                          {/* Expand Button */}
                          <button
                            onClick={() => toggleExpanded(staging.id)}
                            className="p-2 rounded-lg hover:bg-white/10 text-slate-400 transition-colors"
                          >
                            {isExpanded ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Expanded Content */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="border-t border-white/[0.06] overflow-hidden"
                          >
                            <div className="p-4 space-y-4">
                              {/* Match Info with Comparison */}
                              {match && (
                                <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                                  <div className="flex items-center justify-between mb-3">
                                    <p className="text-sm text-amber-400 font-medium">
                                      Potential Duplicate Found
                                    </p>
                                    <span className="px-2 py-0.5 rounded-full bg-amber-500/30 text-amber-300 text-xs font-medium">
                                      High Match
                                    </span>
                                  </div>
                                  
                                  {/* Side by Side Comparison */}
                                  <div className="grid grid-cols-2 gap-3 text-sm">
                                    <div className="p-2 rounded-lg bg-white/[0.05]">
                                      <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">CSV Import</p>
                                      <p className="text-white font-medium truncate">{extracted.description}</p>
                                      <p className="text-slate-400">{extracted.date}</p>
                                      <p className={cn(
                                        'font-mono',
                                        extracted.direction === 'in' ? 'text-emerald-400' : 'text-rose-400'
                                      )}>
                                        {formatCurrency(extracted.amount || 0, (extracted.currency || 'SAR') as 'SAR' | 'AED' | 'USD' | 'EUR' | 'GBP')}
                                      </p>
                                    </div>
                                    <div className="p-2 rounded-lg bg-white/[0.05]">
                                      <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Existing</p>
                                      <p className="text-white font-medium truncate">{match.merchant || match.category}</p>
                                      <p className="text-slate-400">{match.transaction_date}</p>
                                      <p className={cn(
                                        'font-mono',
                                        match.direction === 'in' ? 'text-emerald-400' : 'text-rose-400'
                                      )}>
                                        {formatCurrency(match.amount, match.currency as 'SAR' | 'AED' | 'USD' | 'EUR' | 'GBP')}
                                      </p>
                                    </div>
                                  </div>
                                  
                                  <p className="text-xs text-slate-500 mt-2">
                                    Choose "Merge" to update existing, or "Create New" if this is different.
                                  </p>
                                </div>
                              )}

                              {/* Edit Form */}
                              {isEditing && editingState ? (
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <label className="block text-xs text-slate-500 mb-1">Merchant</label>
                                    <input
                                      type="text"
                                      value={editingState.merchant}
                                      onChange={e => setEditingState(prev => prev ? { ...prev, merchant: e.target.value } : null)}
                                      className="w-full bg-white/[0.05] border border-white/[0.08] rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-amber-500/50"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-xs text-slate-500 mb-1">Category</label>
                                    <select
                                      value={editingState.category}
                                      onChange={e => setEditingState(prev => prev ? { ...prev, category: e.target.value } : null)}
                                      className="w-full bg-white/[0.05] border border-white/[0.08] rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-amber-500/50"
                                    >
                                      {allCategories.map(cat => (
                                        <option key={cat} value={cat}>{cat}</option>
                                      ))}
                                    </select>
                                  </div>
                                  <div>
                                    <label className="block text-xs text-slate-500 mb-1">Amount</label>
                                    <input
                                      type="number"
                                      value={editingState.amount}
                                      onChange={e => setEditingState(prev => prev ? { ...prev, amount: parseFloat(e.target.value) || 0 } : null)}
                                      className="w-full bg-white/[0.05] border border-white/[0.08] rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-amber-500/50"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-xs text-slate-500 mb-1">Direction</label>
                                    <select
                                      value={editingState.direction}
                                      onChange={e => setEditingState(prev => prev ? { ...prev, direction: e.target.value as 'in' | 'out' } : null)}
                                      className="w-full bg-white/[0.05] border border-white/[0.08] rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-amber-500/50"
                                    >
                                      <option value="out">Expense (Out)</option>
                                      <option value="in">Income (In)</option>
                                    </select>
                                  </div>
                                </div>
                              ) : (
                                <div className="text-sm text-slate-400">
                                  <p className="font-mono text-xs break-all">{staging.raw_text}</p>
                                </div>
                              )}

                              {/* Actions */}
                              <div className="flex items-center gap-2 pt-2">
                                {!isEditing && (
                                  <button
                                    onClick={() => startEditing(staging)}
                                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/[0.05] text-slate-300 text-sm hover:bg-white/[0.08] transition-colors"
                                  >
                                    <Edit3 className="h-4 w-4" />
                                    Edit
                                  </button>
                                )}

                                {match ? (
                                  <>
                                    <button
                                      onClick={() => handleMerge(staging)}
                                      disabled={isProcessing}
                                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-amber-500/20 text-amber-400 text-sm hover:bg-amber-500/30 transition-colors disabled:opacity-50"
                                    >
                                      {isProcessing ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                      ) : (
                                        <Merge className="h-4 w-4" />
                                      )}
                                      Merge with Existing
                                    </button>
                                    <button
                                      onClick={() => handleApprove(staging)}
                                      disabled={isProcessing}
                                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-500/20 text-emerald-400 text-sm hover:bg-emerald-500/30 transition-colors disabled:opacity-50"
                                    >
                                      {isProcessing ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                      ) : (
                                        <Plus className="h-4 w-4" />
                                      )}
                                      Create New
                                    </button>
                                  </>
                                ) : (
                                  <button
                                    onClick={() => handleApprove(staging)}
                                    disabled={isProcessing}
                                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-500/20 text-emerald-400 text-sm hover:bg-emerald-500/30 transition-colors disabled:opacity-50"
                                  >
                                    {isProcessing ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <Check className="h-4 w-4" />
                                    )}
                                    Approve
                                  </button>
                                )}

                                <button
                                  onClick={() => handleReject(staging.id)}
                                  disabled={isProcessing}
                                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-rose-500/10 text-rose-400 text-sm hover:bg-rose-500/20 transition-colors disabled:opacity-50 ml-auto"
                                >
                                  {isProcessing ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Trash2 className="h-4 w-4" />
                                  )}
                                  Reject
                                </button>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          {stagingTxs.length > 0 && (
            <div className="mt-4 pt-4 border-t border-white/[0.06] shrink-0">
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-400">
                  {nonDuplicateCount} verified transactions ready to approve
                </p>
                <button
                  onClick={handleBulkApprove}
                  disabled={isBulkProcessing || nonDuplicateCount === 0}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 text-white font-medium hover:bg-emerald-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isBulkProcessing ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-5 w-5" />
                  )}
                  Confirm All Verified ({nonDuplicateCount})
                </button>
              </div>
            </div>
          )}
        </GlassCard>
      </motion.div>
    </motion.div>
  )
}
