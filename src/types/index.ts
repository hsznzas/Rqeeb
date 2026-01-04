/**
 * Application Types
 */

export * from './database'

// UI State types
export interface LoadingState {
  isLoading: boolean
  error: string | null
}

// Transaction with optimistic update support
export interface OptimisticTransaction {
  id: string
  user_id: string
  amount: number
  currency: string
  direction: 'in' | 'out'
  category: string
  merchant: string | null
  transaction_date: string
  raw_log_id: string | null
  created_at: string
  // Optimistic UI fields
  isOptimistic?: boolean
  isFailed?: boolean
}

// Feed item (can be transaction or raw log)
export interface FeedItem {
  id: string
  type: 'transaction' | 'raw_log'
  content: string
  amount?: number
  currency?: string
  direction?: 'in' | 'out'
  category?: string
  merchant?: string | null
  timestamp: string
  isOptimistic?: boolean
  isFailed?: boolean
}

// Summary stats
export interface FinancialSummary {
  totalIncome: number
  totalExpenses: number
  netAmount: number
  transactionCount: number
  period: 'day' | 'week' | 'month' | 'year' | 'all'
}

// Category breakdown
export interface CategoryBreakdown {
  category: string
  amount: number
  count: number
  percentage: number
  color: string
}

// Auth types
export interface AuthUser {
  id: string
  email: string
}

export interface AuthState {
  user: AuthUser | null
  isLoading: boolean
  isAuthenticated: boolean
}

