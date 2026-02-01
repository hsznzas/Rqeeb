/**
 * Beneficiaries Management Page
 * 
 * Manage beneficiaries (people/companies who reimburse you)
 * View transaction details and reimbursement summaries per beneficiary
 */

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Users,
  Plus,
  Pencil,
  Trash2,
  ChevronRight,
  Loader2,
  X,
  Check,
  TrendingUp,
  TrendingDown,
  Clock,
  ArrowLeft,
  RefreshCw
} from 'lucide-react'
import { PageContainer } from '@/components/layout'
import { GlassCard } from '@/components/ui'
import { useAuth } from '@/context'
import { cn } from '@/lib/utils'
import { formatCurrency } from '@/lib/utils'
import { formatFeedDate } from '@/lib/dateUtils'
import { supabase } from '@/services/supabase'
import { calculateBeneficiarySummary, type BeneficiarySummary } from '@/lib/analytics'
import type { Beneficiary, Transaction } from '@/types/database'

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

// Relationship options
const RELATIONSHIPS = [
  { value: 'employer', label: 'Employer' },
  { value: 'client', label: 'Client' },
  { value: 'business_partner', label: 'Business Partner' },
  { value: 'family', label: 'Family' },
  { value: 'friend', label: 'Friend' },
  { value: 'organization', label: 'Organization' },
  { value: 'other', label: 'Other' },
]

export function BeneficiariesPage() {
  const { user, defaultCurrency } = useAuth()
  
  // State
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [summaries, setSummaries] = useState<BeneficiarySummary[]>([])
  const [isLoading, setIsLoading] = useState(true)
  
  // Modal states
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingBeneficiary, setEditingBeneficiary] = useState<Beneficiary | null>(null)
  const [selectedBeneficiary, setSelectedBeneficiary] = useState<Beneficiary | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    relationship: '',
    color: BENEFICIARY_COLORS[0],
    default_currency: 'SAR'
  })

  // Fetch data
  const fetchData = useCallback(async () => {
    if (!user) return
    setIsLoading(true)

    try {
      const [benRes, txRes] = await Promise.all([
        supabase
          .from('beneficiaries')
          .select('*')
          .eq('user_id', user.id)
          .order('name'),
        supabase
          .from('transactions')
          .select('*')
          .eq('user_id', user.id)
          .not('beneficiary_id', 'is', null)
      ])

      if (benRes.data) {
        setBeneficiaries(benRes.data as Beneficiary[])
      }
      if (txRes.data) {
        setTransactions(txRes.data as Transaction[])
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setIsLoading(false)
    }
  }, [user])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Calculate summaries when data changes
  useEffect(() => {
    if (beneficiaries.length > 0) {
      const calculated = calculateBeneficiarySummary(transactions, beneficiaries)
      setSummaries(calculated)
    }
  }, [beneficiaries, transactions])

  // Handlers
  const handleAdd = () => {
    setEditingBeneficiary(null)
    setFormData({
      name: '',
      relationship: '',
      color: BENEFICIARY_COLORS[Math.floor(Math.random() * BENEFICIARY_COLORS.length)],
      default_currency: defaultCurrency
    })
    setShowAddModal(true)
  }

  const handleEdit = (beneficiary: Beneficiary) => {
    setEditingBeneficiary(beneficiary)
    setFormData({
      name: beneficiary.name,
      relationship: beneficiary.relationship || '',
      color: beneficiary.color,
      default_currency: beneficiary.default_currency || 'SAR'
    })
    setShowAddModal(true)
  }

  const handleSave = async () => {
    if (!user || !formData.name.trim()) return
    setIsSaving(true)

    try {
      if (editingBeneficiary) {
        // Update
        await supabase
          .from('beneficiaries')
          .update({
            name: formData.name.trim(),
            relationship: formData.relationship || null,
            color: formData.color,
            default_currency: formData.default_currency,
            updated_at: new Date().toISOString()
          } as never)
          .eq('id', editingBeneficiary.id)
      } else {
        // Create
        await supabase
          .from('beneficiaries')
          .insert({
            user_id: user.id,
            name: formData.name.trim(),
            relationship: formData.relationship || null,
            color: formData.color,
            default_currency: formData.default_currency
          } as never)
      }
      
      await fetchData()
      setShowAddModal(false)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    setDeletingId(id)
    try {
      await supabase.from('beneficiaries').delete().eq('id', id)
      setBeneficiaries(prev => prev.filter(b => b.id !== id))
      if (selectedBeneficiary?.id === id) {
        setSelectedBeneficiary(null)
      }
    } finally {
      setDeletingId(null)
    }
  }

  // Get transactions for selected beneficiary
  const beneficiaryTransactions = selectedBeneficiary
    ? transactions.filter(tx => tx.beneficiary_id === selectedBeneficiary.id)
    : []

  const selectedSummary = selectedBeneficiary
    ? summaries.find(s => s.beneficiary.id === selectedBeneficiary.id)
    : null

  // Render detail view
  if (selectedBeneficiary) {
    return (
      <PageContainer bottomPadding={false}>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          {/* Back Button & Header */}
          <div className="mb-6">
            <button
              onClick={() => setSelectedBeneficiary(null)}
              className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-4"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Beneficiaries
            </button>
            
            <div className="flex items-center gap-4">
              <div
                className="p-3 rounded-xl"
                style={{ backgroundColor: `${selectedBeneficiary.color}20` }}
              >
                <Users className="h-6 w-6" style={{ color: selectedBeneficiary.color }} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">{selectedBeneficiary.name}</h1>
                <p className="text-slate-400">
                  {selectedBeneficiary.relationship 
                    ? RELATIONSHIPS.find(r => r.value === selectedBeneficiary.relationship)?.label 
                    : 'Beneficiary'}
                </p>
              </div>
            </div>
          </div>

          {/* Summary Cards */}
          {selectedSummary && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              <GlassCard size="sm" className="p-4">
                <div className="flex items-center gap-2 text-amber-400 mb-2">
                  <Clock className="h-4 w-4" />
                  <span className="text-xs uppercase tracking-wider">Pending</span>
                </div>
                <div className="text-xl font-bold text-white font-mono">
                  {formatCurrency(selectedSummary.pendingAmount, defaultCurrency)}
                </div>
              </GlassCard>
              
              <GlassCard size="sm" className="p-4">
                <div className="flex items-center gap-2 text-rose-400 mb-2">
                  <TrendingUp className="h-4 w-4" />
                  <span className="text-xs uppercase tracking-wider">Total Owed</span>
                </div>
                <div className="text-xl font-bold text-white font-mono">
                  {formatCurrency(selectedSummary.totalOwed, defaultCurrency)}
                </div>
              </GlassCard>
              
              <GlassCard size="sm" className="p-4">
                <div className="flex items-center gap-2 text-emerald-400 mb-2">
                  <TrendingDown className="h-4 w-4" />
                  <span className="text-xs uppercase tracking-wider">Received</span>
                </div>
                <div className="text-xl font-bold text-white font-mono">
                  {formatCurrency(selectedSummary.totalReceived, defaultCurrency)}
                </div>
              </GlassCard>
              
              <GlassCard size="sm" className="p-4">
                <div className="flex items-center gap-2 text-blue-400 mb-2">
                  <RefreshCw className="h-4 w-4" />
                  <span className="text-xs uppercase tracking-wider">Transactions</span>
                </div>
                <div className="text-xl font-bold text-white">
                  {selectedSummary.transactionCount}
                </div>
              </GlassCard>
            </div>
          )}

          {/* Transactions List */}
          <GlassCard size="lg">
            <h2 className="text-lg font-semibold text-white mb-4">Transaction History</h2>
            
            {beneficiaryTransactions.length === 0 ? (
              <div className="text-center py-8">
                <RefreshCw className="h-8 w-8 text-slate-600 mx-auto mb-2" />
                <p className="text-slate-500">No transactions with this beneficiary yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {beneficiaryTransactions
                  .sort((a, b) => new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime())
                  .map(tx => (
                    <div
                      key={tx.id}
                      className="flex items-center gap-4 p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]"
                    >
                      <div className={cn(
                        'p-2 rounded-lg',
                        tx.direction === 'in' ? 'bg-emerald-500/20' : 'bg-rose-500/20'
                      )}>
                        {tx.direction === 'in' ? (
                          <TrendingDown className="h-4 w-4 text-emerald-400" />
                        ) : (
                          <TrendingUp className="h-4 w-4 text-rose-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-white truncate">
                          {tx.merchant || tx.category}
                        </p>
                        <p className="text-sm text-slate-500">
                          {tx.direction === 'in' ? 'Reimbursement received' : 'Expense to reimburse'}
                          {' • '}
                          {formatFeedDate(tx.transaction_date)}
                        </p>
                      </div>
                      <div className={cn(
                        'font-mono font-medium',
                        tx.direction === 'in' ? 'text-emerald-400' : 'text-rose-400'
                      )}>
                        {tx.direction === 'in' ? '+' : '-'}
                        {formatCurrency(tx.amount, tx.currency)}
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </GlassCard>
        </motion.div>
      </PageContainer>
    )
  }

  // Render main list
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
            <h1 className="text-2xl font-bold text-white mb-1">Beneficiaries</h1>
            <p className="text-slate-400">Manage people & companies who reimburse you</p>
          </div>
          <button
            onClick={handleAdd}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 text-white font-medium hover:bg-amber-600 transition-colors"
          >
            <Plus className="h-5 w-5" />
            Add
          </button>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <GlassCard size="sm" className="p-4">
            <div className="flex items-center gap-2 text-amber-400 mb-2">
              <Clock className="h-4 w-4" />
              <span className="text-xs uppercase tracking-wider">Total Pending</span>
            </div>
            <div className="text-2xl font-bold text-white font-mono">
              {formatCurrency(
                summaries.reduce((sum, s) => sum + s.pendingAmount, 0),
                defaultCurrency
              )}
            </div>
          </GlassCard>
          
          <GlassCard size="sm" className="p-4">
            <div className="flex items-center gap-2 text-slate-400 mb-2">
              <Users className="h-4 w-4" />
              <span className="text-xs uppercase tracking-wider">Active</span>
            </div>
            <div className="text-2xl font-bold text-white">
              {beneficiaries.length}
            </div>
          </GlassCard>
        </div>

        {/* Beneficiaries List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 text-amber-400 animate-spin" />
          </div>
        ) : beneficiaries.length === 0 ? (
          <GlassCard size="lg" className="text-center py-12">
            <Users className="h-12 w-12 text-slate-600 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-white mb-1">No beneficiaries yet</h3>
            <p className="text-sm text-slate-500 mb-4">
              Add people or companies who reimburse your expenses
            </p>
            <button
              onClick={handleAdd}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Add Beneficiary
            </button>
          </GlassCard>
        ) : (
          <div className="space-y-3">
            {summaries.map(({ beneficiary, pendingAmount, transactionCount, lastTransactionDate }) => (
              <GlassCard
                key={beneficiary.id}
                size="sm"
                className="cursor-pointer hover:bg-white/[0.04] transition-colors"
                onClick={() => setSelectedBeneficiary(beneficiary)}
              >
                <div className="flex items-center gap-4 p-4">
                  <div
                    className="p-3 rounded-xl shrink-0"
                    style={{ backgroundColor: `${beneficiary.color}20` }}
                  >
                    <Users className="h-5 w-5" style={{ color: beneficiary.color }} />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-white truncate">{beneficiary.name}</h3>
                      {beneficiary.relationship && (
                        <span className="px-2 py-0.5 rounded-full bg-white/[0.05] text-slate-500 text-xs">
                          {RELATIONSHIPS.find(r => r.value === beneficiary.relationship)?.label}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-sm text-slate-500 mt-1">
                      <span>{transactionCount} transactions</span>
                      {lastTransactionDate && (
                        <>
                          <span>•</span>
                          <span>Last: {formatFeedDate(lastTransactionDate)}</span>
                        </>
                      )}
                    </div>
                  </div>
                  
                  <div className="text-right shrink-0">
                    {pendingAmount > 0 ? (
                      <div className="text-amber-400 font-mono font-medium">
                        {formatCurrency(pendingAmount, defaultCurrency)}
                        <p className="text-xs text-slate-500 font-normal">pending</p>
                      </div>
                    ) : (
                      <div className="text-emerald-400 text-sm">Settled</div>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleEdit(beneficiary) }}
                      className="p-2 rounded-lg hover:bg-white/[0.05] text-slate-400 hover:text-white transition-colors"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(beneficiary.id) }}
                      disabled={deletingId === beneficiary.id}
                      className="p-2 rounded-lg hover:bg-rose-500/10 text-slate-400 hover:text-rose-400 transition-colors disabled:opacity-50"
                    >
                      {deletingId === beneficiary.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </button>
                    <ChevronRight className="h-5 w-5 text-slate-600" />
                  </div>
                </div>
              </GlassCard>
            ))}
          </div>
        )}
      </motion.div>

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowAddModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md"
              onClick={e => e.stopPropagation()}
            >
              <GlassCard size="lg">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-amber-500/20">
                      <Users className="h-5 w-5 text-amber-400" />
                    </div>
                    <h2 className="text-xl font-bold text-white">
                      {editingBeneficiary ? 'Edit Beneficiary' : 'Add Beneficiary'}
                    </h2>
                  </div>
                  <button
                    onClick={() => setShowAddModal(false)}
                    className="p-2 rounded-lg hover:bg-white/10 text-slate-400 transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Form */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-2">Name</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="e.g., Company ABC, John Smith"
                      className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl px-4 py-3 text-white placeholder:text-slate-600 outline-none focus:border-amber-500/50 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-2">Relationship</label>
                    <select
                      value={formData.relationship}
                      onChange={(e) => setFormData(prev => ({ ...prev, relationship: e.target.value }))}
                      className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl px-4 py-3 text-white outline-none focus:border-amber-500/50 transition-colors"
                    >
                      <option value="">Select relationship...</option>
                      {RELATIONSHIPS.map(rel => (
                        <option key={rel.value} value={rel.value}>{rel.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-2">Color</label>
                    <div className="flex gap-2 flex-wrap">
                      {BENEFICIARY_COLORS.map((c) => (
                        <button
                          key={c}
                          onClick={() => setFormData(prev => ({ ...prev, color: c }))}
                          className={cn(
                            'w-8 h-8 rounded-full border-2 transition-all',
                            formData.color === c ? 'border-white scale-110' : 'border-transparent'
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
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 px-4 py-3 rounded-xl bg-white/[0.05] text-slate-400 hover:bg-white/[0.08] transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={!formData.name.trim() || isSaving}
                    className="flex-1 px-4 py-3 rounded-xl bg-amber-500 text-white font-medium hover:bg-amber-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isSaving ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <>
                        <Check className="h-5 w-5" />
                        {editingBeneficiary ? 'Save' : 'Add'}
                      </>
                    )}
                  </button>
                </div>
              </GlassCard>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </PageContainer>
  )
}
