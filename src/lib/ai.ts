/**
 * AI-powered Transaction Parser
 * 
 * Uses OpenAI to extract structured financial data from natural language text.
 * Phase 2.3: Fixed date/time extraction with ISO 8601 format.
 */

import type { Account, AccountCard } from '@/types/database'

const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY || ''
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions'

/**
 * Get current date/time in ISO format for the system prompt
 */
function getCurrentISODateTime(): string {
  return new Date().toISOString()
}

// System prompt for bulk financial parsing with proper date/time extraction
const SYSTEM_PROMPT = `You are a financial transaction parser for a Saudi Arabian personal finance app. Your job is to extract structured data from text messages (like bank SMS, receipts, or manual notes).

CRITICAL RULES:
1. Return ONLY valid JSON - an array of transaction objects
2. You MUST ALWAYS return a JSON array of transactions, even if there's only one transaction
3. The input may contain multiple transactions separated by newlines, commas, or listed together

DATE & TIME EXTRACTION (CRITICAL):
- Extract the EXACT date and time from the input if provided
- Return dates in ISO 8601 format: "YYYY-MM-DDTHH:MM:SS" (e.g., "2026-01-04T13:52:00")
- If only date is provided (no time), use "T00:00:00" (e.g., "2026-01-04T00:00:00")
- If only time is provided, use today's date
- If no date/time is provided, use the current timestamp provided below
- PRESERVE the original date from the input - do NOT default to today's date if a specific date is given
- Accept future dates without modification (user may be planning entries)

AMOUNT RULES:
- Extract each transaction amount as a positive number
- Determine if money is coming IN (income/received/deposit/salary) or going OUT (expense/payment/purchase/spent)

CATEGORIZATION:
- Identify the merchant/source if mentioned
- Look for payment method hints - any mention of card name, bank name, last 4 digits, or wallet type
- Categorize into: Food & Dining, Transportation, Shopping, Bills & Utilities, Groceries, Health, Transfer, Entertainment, Income, Travel, Education, Other
- Default currency to SAR if not specified. Recognize: SAR, USD, EUR, GBP, AED, ريال, $, €, £

PAYMENT METHOD HINT EXAMPLES:
- "on my Visa" → payment_hint: "Visa"
- "from AlRajhi" → payment_hint: "AlRajhi"
- "card ending 8844" → payment_hint: "8844"
- "using Apple Pay" → payment_hint: "Apple Pay"
- "paid cash" → payment_hint: "cash"
- "from wallet" → payment_hint: "wallet"

ALWAYS return this exact JSON structure (an array):
{
  "transactions": [
    {
      "amount": <number>,
      "currency": "<string, default SAR>",
      "category": "<string>",
      "merchant": "<string or null>",
      "transaction_datetime": "<ISO 8601 string, e.g. 2026-01-04T13:52:00>",
      "direction": "<in or out>",
      "payment_hint": "<string or null>",
      "notes": "<any additional context or null>"
    }
  ]
}

EXAMPLES:

Input: "Coffee 25 SAR on 2026-01-04 at 2:30pm"
Output: {"transactions": [{"amount": 25, "currency": "SAR", "category": "Food & Dining", "merchant": "Coffee", "transaction_datetime": "2026-01-04T14:30:00", "direction": "out", "payment_hint": null, "notes": null}]}

Input: "Uber 45 on Jan 3rd, Starbucks 30 yesterday"
(If today is 2026-01-04)
Output: {"transactions": [
  {"amount": 45, "currency": "SAR", "category": "Transportation", "merchant": "Uber", "transaction_datetime": "2026-01-03T00:00:00", "direction": "out", "payment_hint": null, "notes": null},
  {"amount": 30, "currency": "SAR", "category": "Food & Dining", "merchant": "Starbucks", "transaction_datetime": "2026-01-03T00:00:00", "direction": "out", "payment_hint": null, "notes": null}
]}

Input: "[{\"date\": \"2026-01-02T10:15:00\", \"amount\": 150, \"merchant\": \"Amazon\"}]"
Output: {"transactions": [{"amount": 150, "currency": "SAR", "category": "Shopping", "merchant": "Amazon", "transaction_datetime": "2026-01-02T10:15:00", "direction": "out", "payment_hint": null, "notes": null}]}

If you cannot parse ANY valid financial data, return:
{"transactions": [], "error": "Could not parse transactions", "reason": "<brief explanation>"}`

export interface ParsedTransaction {
  amount: number
  currency: string
  category: string
  merchant: string | null
  transaction_datetime: string // ISO 8601 format
  direction: 'in' | 'out'
  payment_hint: string | null
  notes: string | null
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
 * Parse transactions from text using OpenAI (supports bulk)
 * Always returns an array of transactions with proper ISO 8601 dates
 */
export async function parseTransactions(text: string): Promise<BulkParseResult> {
  if (!OPENAI_API_KEY || !OPENAI_API_KEY.startsWith('sk-')) {
    console.warn('OpenAI API key not configured')
    return {
      transactions: [],
      error: 'AI not configured',
      reason: 'OpenAI API key is missing or invalid',
    }
  }

  const currentDateTime = getCurrentISODateTime()

  try {
    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { 
            role: 'user', 
            content: `Current date/time: ${currentDateTime}\n\nParse these financial transactions:\n\n${text}` 
          },
        ],
        temperature: 0.1,
        max_tokens: 2000, // Increased for bulk transactions with full datetime
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('OpenAI API error:', response.status)
      return {
        transactions: [],
        error: 'AI service error',
        reason: errorData.error?.message || `HTTP ${response.status}`,
      }
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content

    if (!content) {
      return {
        transactions: [],
        error: 'Empty response',
        reason: 'AI returned no content',
      }
    }

    // Try to extract JSON from the response
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return {
        transactions: [],
        error: 'Invalid response format',
        reason: 'Could not find JSON in AI response',
      }
    }

    const parsed = JSON.parse(jsonMatch[0])

    // Check if it's an error response from AI
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
    const fallbackDateTime = currentDateTime.slice(0, 19) // Remove milliseconds

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
        reason: 'AI response was not valid JSON',
      }
    }

    return {
      transactions: [],
      error: 'Network error',
      reason: 'Could not connect to AI service',
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
 * Check if OpenAI is configured
 */
export function isAIConfigured(): boolean {
  return !!OPENAI_API_KEY && OPENAI_API_KEY.startsWith('sk-')
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
