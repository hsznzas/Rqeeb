import { 
  createContext, 
  useContext, 
  useState, 
  useCallback, 
  useEffect,
  type ReactNode 
} from 'react'
import { supabase } from '@/services/supabase'
import { useAuth } from './AuthContext'
import { parseTransaction, isParseError, matchPaymentHint, getDefaultAccount } from '@/lib/ai'
import { generateId } from '@/lib/utils'
import { toISODateString } from '@/lib/dateUtils'
import type { 
  Account, 
  AccountCard, 
  NewAccount, 
  NewAccountCard,
  AccountWithCards 
} from '@/types/database'

// Transaction type matching Supabase schema
export interface Transaction {
  id: string
  user_id: string
  amount: number
  currency: string
  direction: 'in' | 'out'
  category: string
  merchant: string | null
  transaction_date: string
  raw_log_id: string | null
  account_id: string | null
  card_id: string | null
  original_amount: number | null
  original_currency: string | null
  conversion_rate: number | null
  notes: string | null
  created_at: string
  // UI state
  isOptimistic?: boolean
  isFailed?: boolean
  isProcessing?: boolean
}

// Raw log for failed parses
export interface RawLog {
  id: string
  user_id: string
  content: string
  source: string
  created_at: string
}

// Financial summary
export interface FinancialSummary {
  totalIncome: number
  totalExpenses: number
  netAmount: number
  transactionCount: number
}

// Result from AI parsing that may need clarification
export interface ParsedTransactionResult {
  amount: number
  currency: string
  category: string
  merchant: string | null
  transaction_datetime: string // ISO 8601 format
  direction: 'in' | 'out'
  payment_hint: string | null
  notes: string | null
  // Matched references
  matchedAccountId: string | null
  matchedCardId: string | null
  needsClarification: boolean
}

interface DataContextType {
  // Transactions
  transactions: Transaction[]
  summary: FinancialSummary
  isLoading: boolean
  error: string | null
  processingMessage: string | null
  addTransactionFromText: (text: string) => Promise<{ 
    success: boolean
    error?: string
    needsClarification?: boolean
    parsedData?: ParsedTransactionResult
    tempId?: string
  }>
  addTransactionWithAccount: (
    parsedData: ParsedTransactionResult,
    accountId: string,
    cardId: string | null,
    tempId: string
  ) => Promise<{ success: boolean; error?: string }>
  removeTransaction: (id: string) => Promise<void>
  refreshTransactions: () => Promise<void>
  
  // Accounts
  accounts: Account[]
  accountsWithCards: AccountWithCards[]
  refreshAccounts: () => Promise<void>
  addAccount: (data: NewAccount) => Promise<{ success: boolean; error?: string; account?: Account }>
  updateAccount: (id: string, data: Partial<NewAccount>) => Promise<{ success: boolean; error?: string }>
  deleteAccount: (id: string) => Promise<{ success: boolean; error?: string }>
  
  // Cards
  cards: AccountCard[]
  refreshCards: () => Promise<void>
  addCard: (data: NewAccountCard) => Promise<{ success: boolean; error?: string; card?: AccountCard }>
  updateCard: (id: string, data: Partial<NewAccountCard>) => Promise<{ success: boolean; error?: string }>
  deleteCard: (id: string) => Promise<{ success: boolean; error?: string }>
  getCardsForAccount: (accountId: string) => AccountCard[]
  
  // Utilities
  getDefaultAccount: () => Account | null
}

const DataContext = createContext<DataContextType | undefined>(undefined)

function calculateSummary(transactions: Transaction[]): FinancialSummary {
  const totalIncome = transactions
    .filter(t => t.direction === 'in' && !t.isOptimistic)
    .reduce((sum, t) => sum + t.amount, 0)
  
  const totalExpenses = transactions
    .filter(t => t.direction === 'out' && !t.isOptimistic)
    .reduce((sum, t) => sum + t.amount, 0)
  
  return {
    totalIncome,
    totalExpenses,
    netAmount: totalIncome - totalExpenses,
    transactionCount: transactions.filter(t => !t.isOptimistic).length,
  }
}

export function DataProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated } = useAuth()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [cards, setCards] = useState<AccountCard[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [processingMessage, setProcessingMessage] = useState<string | null>(null)

  const summary = calculateSummary(transactions)

  // Build accounts with cards
  const accountsWithCards: AccountWithCards[] = accounts.map(account => ({
    ...account,
    cards: cards.filter(c => c.account_id === account.id),
  }))

  // Fetch all data on mount and auth change
  useEffect(() => {
    if (isAuthenticated && user) {
      refreshTransactions()
      refreshAccounts()
      refreshCards()
    } else {
      setTransactions([])
      setAccounts([])
      setCards([])
    }
  }, [isAuthenticated, user?.id])

  // ===========================
  // TRANSACTIONS
  // ===========================

  const refreshTransactions = useCallback(async () => {
    if (!user) return

    setIsLoading(true)
    setError(null)

    try {
      const { data, error: dbError } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(100)

      if (dbError) throw dbError

      setTransactions((data as Transaction[]) || [])
    } catch (err) {
      console.error('Error fetching transactions:', err)
      setError('Failed to load transactions')
    } finally {
      setIsLoading(false)
    }
  }, [user])

  // Parse text and check if clarification is needed
  const addTransactionFromText = useCallback(async (text: string): Promise<{ 
    success: boolean
    error?: string
    needsClarification?: boolean
    parsedData?: ParsedTransactionResult
    tempId?: string
  }> => {
    if (!user) {
      return { success: false, error: 'Not authenticated' }
    }

    if (!text.trim()) {
      return { success: false, error: 'Please enter some text' }
    }

    // Create optimistic "processing" entry
    const tempId = generateId()
    const processingTx: Transaction = {
      id: tempId,
      user_id: user.id,
      amount: 0,
      currency: 'SAR',
      direction: 'out',
      category: 'Processing...',
      merchant: text.slice(0, 50),
      transaction_date: toISODateString(new Date()),
      raw_log_id: null,
      account_id: null,
      card_id: null,
      original_amount: null,
      original_currency: null,
      conversion_rate: null,
      notes: null,
      created_at: new Date().toISOString(),
      isOptimistic: true,
      isProcessing: true,
    }

    setTransactions(prev => [processingTx, ...prev])
    setProcessingMessage('Understanding your transaction...')

    try {
      // Parse with AI
      const result = await parseTransaction(text)

      if (isParseError(result)) {
        // Try to save to raw_logs for manual review (ignore errors)
        try {
          await supabase.from('raw_logs').insert({
            user_id: user.id,
            content: text,
            source: 'web_manual',
          } as never)
        } catch {
          // Ignore raw_logs errors
        }

        // Remove processing entry
        setTransactions(prev => prev.filter(t => t.id !== tempId))
        setProcessingMessage(null)

        return { 
          success: false, 
          error: `Could not understand: ${result.reason}` 
        }
      }

      // Match payment hint to accounts/cards
      const match = matchPaymentHint(result.payment_hint, accounts, cards)
      
      // Check if we have an account match or a default account
      const defaultAccount = getDefaultAccount(accounts)
      const hasAccount = match.accountId || defaultAccount

      const parsedData: ParsedTransactionResult = {
        ...result,
        matchedAccountId: match.accountId || (defaultAccount?.id ?? null),
        matchedCardId: match.cardId,
        needsClarification: !hasAccount && accounts.length > 0,
      }

      // If no accounts exist or we have a match, save immediately
      if (accounts.length === 0 || hasAccount) {
        // Save transaction
        const { data, error: dbError } = await supabase
          .from('transactions')
          .insert({
            user_id: user.id,
            amount: result.amount,
            currency: result.currency,
            direction: result.direction,
            category: result.category,
            merchant: result.merchant,
            transaction_date: result.transaction_datetime.split('T')[0],
            transaction_time: result.transaction_datetime,
            account_id: parsedData.matchedAccountId,
            card_id: parsedData.matchedCardId,
            notes: result.notes,
          } as never)
          .select()
          .single()

        if (dbError) throw dbError

        // Replace optimistic with real data
        setTransactions(prev =>
          prev.map(t =>
            t.id === tempId
              ? { ...(data as Transaction), isOptimistic: false }
              : t
          )
        )

        setProcessingMessage(null)
        return { success: true }
      }

      // Need clarification - keep the processing entry but update it
      setTransactions(prev =>
        prev.map(t =>
          t.id === tempId
            ? { 
                ...t, 
                amount: result.amount,
                category: result.category,
                merchant: result.merchant,
                isProcessing: false,
              }
            : t
        )
      )

      setProcessingMessage(null)
      return { 
        success: false, 
        needsClarification: true,
        parsedData,
        tempId,
      }

    } catch (err) {
      console.error('Error adding transaction:', err)
      
      // Mark as failed
      setTransactions(prev =>
        prev.map(t =>
          t.id === tempId
            ? { ...t, isFailed: true, isProcessing: false, category: 'Failed' }
            : t
        )
      )
      
      setProcessingMessage(null)
      return { success: false, error: 'Failed to save transaction' }
    }
  }, [user, accounts, cards])

  // Complete transaction with selected account after clarification
  const addTransactionWithAccount = useCallback(async (
    parsedData: ParsedTransactionResult,
    accountId: string,
    cardId: string | null,
    tempId: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!user) {
      return { success: false, error: 'Not authenticated' }
    }

    try {
      const { data, error: dbError } = await supabase
        .from('transactions')
        .insert({
          user_id: user.id,
          amount: parsedData.amount,
          currency: parsedData.currency,
          direction: parsedData.direction,
          category: parsedData.category,
          merchant: parsedData.merchant,
          transaction_date: parsedData.transaction_datetime.split('T')[0],
          transaction_time: parsedData.transaction_datetime,
          account_id: accountId,
          card_id: cardId,
          notes: parsedData.notes,
        } as never)
        .select()
        .single()

      if (dbError) throw dbError

      // Replace optimistic with real data
      setTransactions(prev =>
        prev.map(t =>
          t.id === tempId
            ? { ...(data as Transaction), isOptimistic: false }
            : t
        )
      )

      return { success: true }
    } catch (err) {
      console.error('Error saving transaction:', err)
      
      // Remove the failed entry
      setTransactions(prev => prev.filter(t => t.id !== tempId))
      
      return { success: false, error: 'Failed to save transaction' }
    }
  }, [user])

  // Remove transaction
  const removeTransaction = useCallback(async (id: string) => {
    if (!user) return

    // Optimistically remove from UI
    setTransactions(prev => prev.filter(t => t.id !== id))

    // Skip DB delete for temp IDs
    if (id.startsWith('temp_')) return

    try {
      const { error: dbError } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id)

      if (dbError) throw dbError
    } catch (err) {
      console.error('Error deleting transaction:', err)
      setError('Failed to delete transaction')
      // Refresh to restore if delete failed
      refreshTransactions()
    }
  }, [user, refreshTransactions])

  // ===========================
  // ACCOUNTS
  // ===========================

  const refreshAccounts = useCallback(async () => {
    if (!user) return

    try {
      const { data, error: dbError } = await supabase
        .from('accounts')
        .select('*')
        .eq('user_id', user.id)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: true })

      if (dbError) throw dbError
      setAccounts((data as Account[]) || [])
    } catch (err) {
      console.error('Error fetching accounts:', err)
    }
  }, [user])

  const addAccount = useCallback(async (data: NewAccount): Promise<{ success: boolean; error?: string; account?: Account }> => {
    if (!user) return { success: false, error: 'Not authenticated' }

    try {
      const { data: newAccount, error: dbError } = await supabase
        .from('accounts')
        .insert(data as never)
        .select()
        .single()

      if (dbError) throw dbError

      setAccounts(prev => [...prev, newAccount as Account])
      return { success: true, account: newAccount as Account }
    } catch (err) {
      console.error('Error adding account:', err)
      return { success: false, error: 'Failed to add account' }
    }
  }, [user])

  const updateAccount = useCallback(async (id: string, data: Partial<NewAccount>): Promise<{ success: boolean; error?: string }> => {
    if (!user) return { success: false, error: 'Not authenticated' }

    try {
      const { error: dbError } = await supabase
        .from('accounts')
        .update(data as never)
        .eq('id', id)
        .eq('user_id', user.id)

      if (dbError) throw dbError

      // Refresh to get updated data (including any trigger changes for is_default)
      await refreshAccounts()
      return { success: true }
    } catch (err) {
      console.error('Error updating account:', err)
      return { success: false, error: 'Failed to update account' }
    }
  }, [user, refreshAccounts])

  const deleteAccount = useCallback(async (id: string): Promise<{ success: boolean; error?: string }> => {
    if (!user) return { success: false, error: 'Not authenticated' }

    try {
      const { error: dbError } = await supabase
        .from('accounts')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id)

      if (dbError) throw dbError

      setAccounts(prev => prev.filter(a => a.id !== id))
      // Also remove cards that were linked to this account
      setCards(prev => prev.filter(c => c.account_id !== id))
      return { success: true }
    } catch (err) {
      console.error('Error deleting account:', err)
      return { success: false, error: 'Failed to delete account' }
    }
  }, [user])

  // ===========================
  // CARDS
  // ===========================

  const refreshCards = useCallback(async () => {
    if (!user) return

    try {
      const { data, error: dbError } = await supabase
        .from('account_cards')
        .select('*')
        .eq('user_id', user.id)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: true })

      if (dbError) throw dbError
      setCards((data as AccountCard[]) || [])
    } catch (err) {
      console.error('Error fetching cards:', err)
    }
  }, [user])

  const addCard = useCallback(async (data: NewAccountCard): Promise<{ success: boolean; error?: string; card?: AccountCard }> => {
    if (!user) return { success: false, error: 'Not authenticated' }

    try {
      const { data: newCard, error: dbError } = await supabase
        .from('account_cards')
        .insert(data as never)
        .select()
        .single()

      if (dbError) throw dbError

      setCards(prev => [...prev, newCard as AccountCard])
      return { success: true, card: newCard as AccountCard }
    } catch (err) {
      console.error('Error adding card:', err)
      return { success: false, error: 'Failed to add card' }
    }
  }, [user])

  const updateCard = useCallback(async (id: string, data: Partial<NewAccountCard>): Promise<{ success: boolean; error?: string }> => {
    if (!user) return { success: false, error: 'Not authenticated' }

    try {
      const { error: dbError } = await supabase
        .from('account_cards')
        .update(data as never)
        .eq('id', id)
        .eq('user_id', user.id)

      if (dbError) throw dbError

      // Refresh to get updated data
      await refreshCards()
      return { success: true }
    } catch (err) {
      console.error('Error updating card:', err)
      return { success: false, error: 'Failed to update card' }
    }
  }, [user, refreshCards])

  const deleteCard = useCallback(async (id: string): Promise<{ success: boolean; error?: string }> => {
    if (!user) return { success: false, error: 'Not authenticated' }

    try {
      const { error: dbError } = await supabase
        .from('account_cards')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id)

      if (dbError) throw dbError

      setCards(prev => prev.filter(c => c.id !== id))
      return { success: true }
    } catch (err) {
      console.error('Error deleting card:', err)
      return { success: false, error: 'Failed to delete card' }
    }
  }, [user])

  const getCardsForAccount = useCallback((accountId: string): AccountCard[] => {
    return cards.filter(c => c.account_id === accountId)
  }, [cards])

  // ===========================
  // UTILITIES
  // ===========================

  const getDefaultAccountFn = useCallback((): Account | null => {
    return getDefaultAccount(accounts)
  }, [accounts])

  return (
    <DataContext.Provider
      value={{
        // Transactions
        transactions,
        summary,
        isLoading,
        error,
        processingMessage,
        addTransactionFromText,
        addTransactionWithAccount,
        removeTransaction,
        refreshTransactions,
        
        // Accounts
        accounts,
        accountsWithCards,
        refreshAccounts,
        addAccount,
        updateAccount,
        deleteAccount,
        
        // Cards
        cards,
        refreshCards,
        addCard,
        updateCard,
        deleteCard,
        getCardsForAccount,
        
        // Utilities
        getDefaultAccount: getDefaultAccountFn,
      }}
    >
      {children}
    </DataContext.Provider>
  )
}

export function useData() {
  const context = useContext(DataContext)
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider')
  }
  return context
}
