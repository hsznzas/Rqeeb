/**
 * Analytics Utilities
 * 
 * Financial calculations and analytics for the Rqeeb app.
 * Includes options to handle reimbursable transactions properly.
 */

import type { Transaction, Beneficiary } from '@/types/database'

// ============================================
// TYPES
// ============================================

export interface AnalyticsOptions {
  /** Exclude is_reimbursable transactions from expense calculations */
  excludeReimbursable?: boolean
  /** Treat reimbursement receipts as Asset Recovery instead of Income */
  separateReimbursementReceipts?: boolean
  /** Filter by date range */
  startDate?: Date
  endDate?: Date
  /** Filter by category */
  category?: string
  /** Filter by beneficiary */
  beneficiaryId?: string
}

export interface FinancialSummary {
  totalIncome: number
  totalExpenses: number
  netAmount: number
  transactionCount: number
  
  // Breakdown when reimbursements are tracked separately
  reimbursableExpenses: number    // Expenses marked for reimbursement
  reimbursementReceipts: number   // Income from reimbursements
  trueExpenses: number            // Expenses NOT expecting reimbursement
  trueIncome: number              // Income that's NOT reimbursement
  
  // Net calculations
  netSpend: number                // True expenses minus reimbursement receipts
  pendingReimbursements: number   // Reimbursable expenses not yet received
}

export interface CategoryBreakdown {
  category: string
  income: number
  expenses: number
  count: number
  reimbursableAmount: number
}

export interface BeneficiarySummary {
  beneficiary: Beneficiary
  totalOwed: number              // Total reimbursable expenses
  totalReceived: number          // Total reimbursement receipts
  pendingAmount: number          // Owed minus received
  transactionCount: number
  lastTransactionDate: string | null
}

export interface MonthlyTrend {
  month: string                   // YYYY-MM
  income: number
  expenses: number
  net: number
  reimbursableExpenses: number
  reimbursementReceipts: number
}

// ============================================
// CORE CALCULATIONS
// ============================================

/**
 * Calculate comprehensive financial summary with reimbursement handling
 */
export function calculateFinancialSummary(
  transactions: Transaction[],
  options: AnalyticsOptions = {}
): FinancialSummary {
  const filtered = filterTransactions(transactions, options)
  
  let totalIncome = 0
  let totalExpenses = 0
  let reimbursableExpenses = 0
  let reimbursementReceipts = 0
  
  for (const tx of filtered) {
    if (tx.direction === 'in') {
      totalIncome += tx.amount
      
      // Check if this is a reimbursement receipt (income from beneficiary)
      // For now, we'll mark income with a beneficiary_id as reimbursement receipt
      if (tx.beneficiary_id) {
        reimbursementReceipts += tx.amount
      }
    } else {
      // For expenses, check if reimbursable
      if (tx.is_reimbursable) {
        reimbursableExpenses += tx.amount
        
        // If excluding reimbursable, don't add to total expenses
        if (!options.excludeReimbursable) {
          totalExpenses += tx.amount
        }
      } else {
        totalExpenses += tx.amount
      }
    }
  }
  
  // Calculate derived values
  const trueIncome = totalIncome - reimbursementReceipts
  const trueExpenses = totalExpenses - (options.excludeReimbursable ? 0 : reimbursableExpenses)
  const netAmount = totalIncome - totalExpenses
  const netSpend = trueExpenses - reimbursementReceipts
  const pendingReimbursements = reimbursableExpenses - reimbursementReceipts
  
  return {
    totalIncome,
    totalExpenses,
    netAmount,
    transactionCount: filtered.length,
    reimbursableExpenses,
    reimbursementReceipts,
    trueExpenses,
    trueIncome,
    netSpend,
    pendingReimbursements: Math.max(0, pendingReimbursements)
  }
}

/**
 * Calculate category breakdown
 */
export function calculateCategoryBreakdown(
  transactions: Transaction[],
  options: AnalyticsOptions = {}
): CategoryBreakdown[] {
  const filtered = filterTransactions(transactions, options)
  const categoryMap = new Map<string, CategoryBreakdown>()
  
  for (const tx of filtered) {
    const category = tx.category || 'Other'
    
    if (!categoryMap.has(category)) {
      categoryMap.set(category, {
        category,
        income: 0,
        expenses: 0,
        count: 0,
        reimbursableAmount: 0
      })
    }
    
    const breakdown = categoryMap.get(category)!
    breakdown.count++
    
    if (tx.direction === 'in') {
      breakdown.income += tx.amount
    } else {
      // Skip reimbursable if option is set
      if (options.excludeReimbursable && tx.is_reimbursable) {
        breakdown.reimbursableAmount += tx.amount
      } else {
        breakdown.expenses += tx.amount
        if (tx.is_reimbursable) {
          breakdown.reimbursableAmount += tx.amount
        }
      }
    }
  }
  
  return Array.from(categoryMap.values())
    .sort((a, b) => (b.expenses + b.income) - (a.expenses + a.income))
}

/**
 * Calculate per-beneficiary summary
 */
export function calculateBeneficiarySummary(
  transactions: Transaction[],
  beneficiaries: Beneficiary[]
): BeneficiarySummary[] {
  const summaryMap = new Map<string, BeneficiarySummary>()
  
  // Initialize all beneficiaries
  for (const beneficiary of beneficiaries) {
    summaryMap.set(beneficiary.id, {
      beneficiary,
      totalOwed: 0,
      totalReceived: 0,
      pendingAmount: 0,
      transactionCount: 0,
      lastTransactionDate: null
    })
  }
  
  // Process transactions
  for (const tx of transactions) {
    if (!tx.beneficiary_id) continue
    
    const summary = summaryMap.get(tx.beneficiary_id)
    if (!summary) continue
    
    summary.transactionCount++
    
    // Track latest transaction date
    const txDate = tx.transaction_date || tx.created_at
    if (!summary.lastTransactionDate || txDate > summary.lastTransactionDate) {
      summary.lastTransactionDate = txDate
    }
    
    if (tx.direction === 'out' && tx.is_reimbursable) {
      // Expense to be reimbursed
      summary.totalOwed += tx.amount
    } else if (tx.direction === 'in') {
      // Reimbursement receipt
      summary.totalReceived += tx.amount
    }
  }
  
  // Calculate pending amounts
  const results = Array.from(summaryMap.values())
  for (const summary of results) {
    summary.pendingAmount = Math.max(0, summary.totalOwed - summary.totalReceived)
  }
  
  return results.sort((a, b) => b.pendingAmount - a.pendingAmount)
}

/**
 * Calculate monthly trends
 */
export function calculateMonthlyTrends(
  transactions: Transaction[],
  options: AnalyticsOptions = {}
): MonthlyTrend[] {
  const filtered = filterTransactions(transactions, options)
  const monthMap = new Map<string, MonthlyTrend>()
  
  for (const tx of filtered) {
    const date = new Date(tx.transaction_date || tx.created_at)
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    
    if (!monthMap.has(monthKey)) {
      monthMap.set(monthKey, {
        month: monthKey,
        income: 0,
        expenses: 0,
        net: 0,
        reimbursableExpenses: 0,
        reimbursementReceipts: 0
      })
    }
    
    const trend = monthMap.get(monthKey)!
    
    if (tx.direction === 'in') {
      trend.income += tx.amount
      if (tx.beneficiary_id) {
        trend.reimbursementReceipts += tx.amount
      }
    } else {
      if (options.excludeReimbursable && tx.is_reimbursable) {
        trend.reimbursableExpenses += tx.amount
      } else {
        trend.expenses += tx.amount
        if (tx.is_reimbursable) {
          trend.reimbursableExpenses += tx.amount
        }
      }
    }
    
    trend.net = trend.income - trend.expenses
  }
  
  return Array.from(monthMap.values())
    .sort((a, b) => a.month.localeCompare(b.month))
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Filter transactions based on options
 */
function filterTransactions(
  transactions: Transaction[],
  options: AnalyticsOptions
): Transaction[] {
  let result = [...transactions]
  
  if (options.startDate) {
    const start = options.startDate.toISOString().split('T')[0]
    result = result.filter(tx => (tx.transaction_date || tx.created_at) >= start)
  }
  
  if (options.endDate) {
    const end = options.endDate.toISOString().split('T')[0]
    result = result.filter(tx => (tx.transaction_date || tx.created_at) <= end)
  }
  
  if (options.category) {
    result = result.filter(tx => tx.category === options.category)
  }
  
  if (options.beneficiaryId) {
    result = result.filter(tx => tx.beneficiary_id === options.beneficiaryId)
  }
  
  return result
}

/**
 * Format currency amount
 */
export function formatAmount(amount: number, currency = 'SAR'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount)
}

/**
 * Get percentage of total
 */
export function getPercentage(value: number, total: number): number {
  if (total === 0) return 0
  return Math.round((value / total) * 100)
}
