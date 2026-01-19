/**
 * AI-powered Transaction Parser
 * 
 * Calls the secure backend API to parse transactions.
 * The OpenAI API key is now safely stored server-side.
 */

import type { Account, AccountCard } from '@/types/database'

/**
 * Get current date/time in ISO format for the system prompt
 */
function getCurrentISODateTime(): string {
  return new Date().toISOString()
}

export interface ParsedTransaction {
  amount: number
  currency: string
  category: string
  merchant: string | null
  transaction_datetime: string // ISO 8601 format
  direction: 'in' | 'out'
  payment_hint: string | null
  notes: string | null
  description: string | null // Rich data: Available Balance, Ref Numbers, Campaign info, etc.
}

export interface BulkParseResult {
  transactions: ParsedTransaction[]
  error?: string
  reason?: string
}

export interface ParseError {
  error: string
  reason: string
}

// Legacy single result type for backwards compatibility
export type ParseResult = ParsedTransaction | ParseError

/**
 * Check if the result is an error (legacy)
 */
export function isParseError(result: ParseResult): result is ParseError {
  return 'error' in result
}

/**
 * Check if bulk result has an error
 */
export function isBulkParseError(result: BulkParseResult): boolean {
  return result.transactions.length === 0 && !!result.error
}

/**
 * Normalize date/time to ISO 8601 format
 * Handles various input formats and ensures valid output
 */
function normalizeDateTime(dateInput: string | null | undefined, fallback: string): string {
  if (!dateInput) return fallback
  
  try {
    // Try parsing the date
    const parsed = new Date(dateInput)
    
    // Check if valid date
    if (isNaN(parsed.getTime())) {
      return fallback
    }
    
    // Return ISO string (removes milliseconds for cleaner format)
    return parsed.toISOString().slice(0, 19)
  } catch {
    return fallback
  }
}

/**
 * Custom category with description for AI parsing
 */
export interface CustomCategory {
  name: string
  description: string | null
}

/**
 * Parse transactions from text using secure backend API
 * Always returns an array of transactions with proper ISO 8601 dates
 */
export async function parseTransactions(
  text: string,
  customCategories?: CustomCategory[]
): Promise<BulkParseResult> {
  const currentDateTime = getCurrentISODateTime()
  const fallbackDateTime = currentDateTime.slice(0, 19)

  try {
    // Call our secure serverless function instead of OpenAI directly
    const response = await fetch('/api/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        currentDateTime,
        customCategories: customCategories || [],
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('API error:', response.status)
      return {
        transactions: [],
        error: errorData.error || 'API error',
        reason: errorData.reason || `HTTP ${response.status}`,
      }
    }

    const parsed = await response.json()

    // Check if it's an error response
    if (parsed.error && (!parsed.transactions || parsed.transactions.length === 0)) {
      return {
        transactions: [],
        error: parsed.error,
        reason: parsed.reason || 'Unknown error',
      }
    }

    // Validate and normalize transactions array
    const transactions: ParsedTransaction[] = []
    const rawTransactions = parsed.transactions || (Array.isArray(parsed) ? parsed : [parsed])

    for (const tx of rawTransactions) {
      // Validate required fields
      if (typeof tx.amount !== 'number' || tx.amount <= 0) {
        console.warn('Skipping transaction with invalid amount:', tx)
        continue
      }

      // Extract datetime - check multiple possible field names
      const rawDateTime = tx.transaction_datetime || tx.transaction_date || tx.date || tx.datetime

      // Normalize and add to array
      transactions.push({
        amount: Math.abs(tx.amount),
        currency: (tx.currency || 'SAR').toUpperCase(),
        category: tx.category || 'Other',
        merchant: tx.merchant || null,
        transaction_datetime: normalizeDateTime(rawDateTime, fallbackDateTime),
        direction: tx.direction === 'in' ? 'in' : 'out',
        payment_hint: tx.payment_hint || tx.account_hint || null,
        notes: tx.notes || null,
        description: tx.description || null, // Rich data: balance, refs, campaign info
      })
    }

    if (transactions.length === 0) {
      return {
        transactions: [],
        error: 'No valid transactions',
        reason: 'Could not extract any valid transactions from the text',
      }
    }

    return { transactions }

  } catch (error) {
    console.error('Parse transactions error:', error)
    
    if (error instanceof SyntaxError) {
      return {
        transactions: [],
        error: 'Parse error',
        reason: 'API response was not valid JSON',
      }
    }

    return {
      transactions: [],
      error: 'Network error',
      reason: 'Could not connect to API',
    }
  }
}

/**
 * Legacy single transaction parser (for backwards compatibility)
 * @deprecated Use parseTransactions() instead
 */
export async function parseTransaction(text: string): Promise<ParseResult> {
  const result = await parseTransactions(text)
  
  if (result.transactions.length === 0) {
    return {
      error: result.error || 'No transactions found',
      reason: result.reason || 'Could not parse any transactions',
    }
  }
  
  return result.transactions[0]
}

/**
 * Check if API is available (always true now since we use backend)
 */
export function isAIConfigured(): boolean {
  // Backend handles the API key - we can't check from frontend
  // Return true optimistically; errors will be handled in parseTransactions
  return true
}

/**
 * Result of matching payment hint to user's accounts/cards
 */
export interface PaymentMatch {
  accountId: string | null
  cardId: string | null
  matchedBy: 'card_digits' | 'card_name' | 'account_name' | 'account_type' | null
}

/**
 * Match payment hint to user's accounts and cards
 * Priority: Card digits > Card name > Account name > Account type
 */
export function matchPaymentHint(
  hint: string | null,
  accounts: Account[],
  cards: AccountCard[]
): PaymentMatch {
  const result: PaymentMatch = {
    accountId: null,
    cardId: null,
    matchedBy: null,
  }

  if (!hint || (accounts.length === 0 && cards.length === 0)) {
    return result
  }
  
  const lowerHint = hint.toLowerCase().trim()
  
  // 1. Try exact match on card's last 4 digits
  const digitMatch = cards.find(c => lowerHint.includes(c.last_4_digits))
  if (digitMatch) {
    return {
      accountId: digitMatch.account_id,
      cardId: digitMatch.id,
      matchedBy: 'card_digits',
    }
  }
  
  // 2. Try card name match (e.g., "my Platinum Visa")
  const cardNameMatch = cards.find(c => {
    const cardName = c.name.toLowerCase()
    return lowerHint.includes(cardName) || cardName.includes(lowerHint)
  })
  if (cardNameMatch) {
    return {
      accountId: cardNameMatch.account_id,
      cardId: cardNameMatch.id,
      matchedBy: 'card_name',
    }
  }

  // 3. Try account name match (e.g., "from AlRajhi")
  const accountNameMatch = accounts.find(a => {
    const accountName = a.name.toLowerCase()
    return lowerHint.includes(accountName) || accountName.includes(lowerHint)
  })
  if (accountNameMatch) {
    return {
      accountId: accountNameMatch.id,
      cardId: null,
      matchedBy: 'account_name',
    }
  }
  
  // 4. Try account type match
  if (lowerHint.includes('cash')) {
    const cashAccount = accounts.find(a => a.type === 'cash')
    if (cashAccount) {
      return {
        accountId: cashAccount.id,
        cardId: null,
        matchedBy: 'account_type',
      }
    }
  }
  
  if (lowerHint.includes('wallet') || lowerHint.includes('apple') || lowerHint.includes('stc') || lowerHint.includes('pay')) {
    const walletAccount = accounts.find(a => a.type === 'wallet')
    if (walletAccount) {
      return {
        accountId: walletAccount.id,
        cardId: null,
        matchedBy: 'account_type',
      }
    }
  }

  // 5. If hint mentions "visa", "master", "credit", "debit" - try to find any card of that type
  if (lowerHint.includes('credit')) {
    const creditCard = cards.find(c => c.type === 'credit')
    if (creditCard) {
      return {
        accountId: creditCard.account_id,
        cardId: creditCard.id,
        matchedBy: 'card_name',
      }
    }
  }

  if (lowerHint.includes('debit')) {
    const debitCard = cards.find(c => c.type === 'debit')
    if (debitCard) {
      return {
        accountId: debitCard.account_id,
        cardId: debitCard.id,
        matchedBy: 'card_name',
      }
    }
  }

  // Generic card hints (visa, mastercard) - find first credit card
  if (lowerHint.includes('visa') || lowerHint.includes('master') || lowerHint.includes('card')) {
    const anyCard = cards.find(c => c.type === 'credit') || cards[0]
    if (anyCard) {
      return {
        accountId: anyCard.account_id,
        cardId: anyCard.id,
        matchedBy: 'card_name',
      }
    }
  }
  
  return result
}

/**
 * Get default account (first with is_default=true, or first account)
 */
export function getDefaultAccount(accounts: Account[]): Account | null {
  if (accounts.length === 0) return null
  return accounts.find(a => a.is_default) || accounts[0]
}

/**
 * Get default card for an account (first with is_default=true, or first card)
 */
export function getDefaultCard(cards: AccountCard[], accountId: string): AccountCard | null {
  const accountCards = cards.filter(c => c.account_id === accountId)
  if (accountCards.length === 0) return null
  return accountCards.find(c => c.is_default) || accountCards[0]
}
