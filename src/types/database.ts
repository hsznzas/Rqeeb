/**
 * Supabase Database Types
 * 
 * These types mirror the database schema for type-safe queries.
 * Phase 2.1: Added account_cards for parent-child relationship.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// Billing cycle options for subscriptions
export type BillingCycle = 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'semiannual' | 'annual'

export const BILLING_CYCLES = [
  { value: 'weekly' as const, label: 'Weekly', days: 7 },
  { value: 'biweekly' as const, label: 'Every 2 Weeks', days: 14 },
  { value: 'monthly' as const, label: 'Monthly', days: 30 },
  { value: 'quarterly' as const, label: 'Quarterly', days: 90 },
  { value: 'semiannual' as const, label: 'Every 6 Months', days: 180 },
  { value: 'annual' as const, label: 'Yearly', days: 365 },
] as const

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          default_currency: string
          timezone: string | null
          locale: string | null
          created_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          default_currency?: string
          timezone?: string | null
          locale?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          default_currency?: string
          timezone?: string | null
          locale?: string | null
          created_at?: string
        }
      }
      accounts: {
        Row: {
          id: string
          user_id: string
          name: string
          type: 'bank' | 'cash' | 'wallet'
          balance: number
          currency: string
          last_4_digits: string | null // Legacy - new cards use account_cards table
          is_default: boolean
          color: string
          icon: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          type: 'bank' | 'cash' | 'wallet'
          balance?: number
          currency?: string
          last_4_digits?: string | null
          is_default?: boolean
          color?: string
          icon?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          type?: 'bank' | 'cash' | 'wallet'
          balance?: number
          currency?: string
          last_4_digits?: string | null
          is_default?: boolean
          color?: string
          icon?: string
          created_at?: string
          updated_at?: string
        }
      }
      account_cards: {
        Row: {
          id: string
          user_id: string
          account_id: string
          name: string
          last_4_digits: string
          type: 'credit' | 'debit'
          is_default: boolean
          color: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          account_id: string
          name: string
          last_4_digits: string
          type: 'credit' | 'debit'
          is_default?: boolean
          color?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          account_id?: string
          name?: string
          last_4_digits?: string
          type?: 'credit' | 'debit'
          is_default?: boolean
          color?: string
          created_at?: string
          updated_at?: string
        }
      }
      subscriptions: {
        Row: {
          id: string
          user_id: string
          name: string
          amount: number
          currency: string
          account_id: string | null
          card_id: string | null
          category: string
          deduction_day: number
          billing_cycle: BillingCycle
          is_active: boolean
          icon: string
          color: string
          notes: string | null
          next_deduction_date: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          amount: number
          currency?: string
          account_id?: string | null
          card_id?: string | null
          category?: string
          deduction_day: number
          billing_cycle?: BillingCycle
          is_active?: boolean
          icon?: string
          color?: string
          notes?: string | null
          next_deduction_date?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          amount?: number
          currency?: string
          account_id?: string | null
          card_id?: string | null
          category?: string
          deduction_day?: number
          billing_cycle?: BillingCycle
          is_active?: boolean
          icon?: string
          color?: string
          notes?: string | null
          next_deduction_date?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      raw_logs: {
        Row: {
          id: string
          user_id: string
          content: string
          image_url: string | null
          source: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          content: string
          image_url?: string | null
          source?: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          content?: string
          image_url?: string | null
          source?: string
          created_at?: string
        }
      }
      beneficiaries: {
        Row: {
          id: string
          user_id: string
          name: string
          color: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          color?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          color?: string
          created_at?: string
          updated_at?: string
        }
      }
      transactions: {
        Row: {
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
        }
        Insert: {
          id?: string
          user_id: string
          amount: number
          currency?: string
          direction: 'in' | 'out'
          category: string
          merchant?: string | null
          transaction_date: string
          transaction_time?: string | null
          raw_log_id?: string | null
          account_id?: string | null
          card_id?: string | null
          original_amount?: number | null
          original_currency?: string | null
          conversion_rate?: number | null
          notes?: string | null
          description?: string | null
          logo_url?: string | null
          beneficiary_id?: string | null
          is_reimbursable?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          amount?: number
          currency?: string
          direction?: 'in' | 'out'
          category?: string
          merchant?: string | null
          transaction_date?: string
          transaction_time?: string | null
          raw_log_id?: string | null
          account_id?: string | null
          card_id?: string | null
          original_amount?: number | null
          original_currency?: string | null
          conversion_rate?: number | null
          notes?: string | null
          description?: string | null
          logo_url?: string | null
          beneficiary_id?: string | null
          is_reimbursable?: boolean
          created_at?: string
        }
      }
      user_categories: {
        Row: {
          id: string
          user_id: string
          name: string
          description: string | null
          icon: string
          color: string
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          description?: string | null
          icon?: string
          color?: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          description?: string | null
          icon?: string
          color?: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}

// Convenience type aliases
export type Profile = Database['public']['Tables']['profiles']['Row']
export type Account = Database['public']['Tables']['accounts']['Row']
export type AccountCard = Database['public']['Tables']['account_cards']['Row']
export type Subscription = Database['public']['Tables']['subscriptions']['Row']
export type RawLog = Database['public']['Tables']['raw_logs']['Row']
export type Transaction = Database['public']['Tables']['transactions']['Row']
export type Beneficiary = Database['public']['Tables']['beneficiaries']['Row']
export type UserCategory = Database['public']['Tables']['user_categories']['Row']

export type NewAccount = Database['public']['Tables']['accounts']['Insert']
export type NewAccountCard = Database['public']['Tables']['account_cards']['Insert']
export type NewSubscription = Database['public']['Tables']['subscriptions']['Insert']

// Transaction attachments (invoices, receipts)
export interface TransactionAttachment {
  id: string
  user_id: string
  transaction_id: string
  file_url: string
  file_name: string
  file_type: string
  file_size: number
  created_at: string
}
export type NewRawLog = Database['public']['Tables']['raw_logs']['Insert']
export type NewTransaction = Database['public']['Tables']['transactions']['Insert']
export type NewBeneficiary = Database['public']['Tables']['beneficiaries']['Insert']
export type NewUserCategory = Database['public']['Tables']['user_categories']['Insert']

// Account with linked cards (for UI display)
export interface AccountWithCards extends Account {
  cards: AccountCard[]
}

// Account type options (no more credit_card at account level)
export const ACCOUNT_TYPES = [
  { value: 'bank', label: 'Bank Account', icon: 'building-2' },
  { value: 'cash', label: 'Cash', icon: 'banknote' },
  { value: 'wallet', label: 'Digital Wallet', icon: 'smartphone' },
] as const

// Card type options
export const CARD_TYPES = [
  { value: 'credit', label: 'Credit Card', icon: 'credit-card' },
  { value: 'debit', label: 'Debit Card', icon: 'credit-card' },
] as const

// Account colors
export const ACCOUNT_COLORS: string[] = [
  '#10b981', // emerald
  '#3b82f6', // blue
  '#8b5cf6', // purple
  '#f59e0b', // amber
  '#ef4444', // red
  '#06b6d4', // cyan
  '#ec4899', // pink
  '#84cc16', // lime
]

// Card colors (slightly different palette)
export const CARD_COLORS: string[] = [
  '#3b82f6', // blue
  '#8b5cf6', // purple
  '#f59e0b', // amber
  '#ef4444', // red
  '#06b6d4', // cyan
  '#ec4899', // pink
  '#14b8a6', // teal
  '#6366f1', // indigo
]
