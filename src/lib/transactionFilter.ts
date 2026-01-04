/**
 * Transaction Filter - The "Brain" Logic
 * 
 * Validates and filters input text to determine if it's a valid financial transaction.
 * This is the core logic that powers the chat-first interface.
 */

export interface ValidationResult {
  isValid: boolean
  reason?: string
  confidence: 'high' | 'medium' | 'low'
  suggestedCategory?: string
}

// Keywords that indicate this is NOT a transaction (spam/promotional/security)
const EXCLUDE_KEYWORDS = [
  // Security/OTP
  'otp',
  'verification code',
  'security code',
  'one-time password',
  'one time password',
  '2fa',
  'two-factor',
  // Promotional
  'offer',
  'discount',
  'promo',
  'promotion',
  'sale',
  'cashback offer',
  'reward points',
  'loyalty',
  'free',
  'win',
  'winner',
  'congratulations',
  // Balance/Info only (no transaction)
  'available balance',
  'current balance',
  'account balance',
  'balance is',
  'card expiry',
  'expiry date',
  'expires on',
  'valid till',
  'valid until',
  // Alerts/Notifications
  'password changed',
  'login detected',
  'logged in',
  'signed in',
  'profile updated',
  'settings changed',
]

// Keywords that strongly indicate a financial transaction
const INCLUDE_KEYWORDS = [
  // Transaction verbs
  'purchase',
  'purchased',
  'spent',
  'paid',
  'payment',
  'transferred',
  'transfer',
  'sent',
  'received',
  'deposit',
  'deposited',
  'withdrawal',
  'withdrew',
  'debited',
  'credited',
  'charged',
  'refund',
  'refunded',
  // Transaction nouns
  'transaction',
  'txn',
  'trx',
  'amount',
  'bill',
  'invoice',
  'receipt',
]

// Currency patterns to detect monetary values
const CURRENCY_PATTERNS = [
  /\bSAR\s*[\d,.]+/i,
  /[\d,.]+\s*SAR\b/i,
  /\bUSD\s*[\d,.]+/i,
  /[\d,.]+\s*USD\b/i,
  /\bAED\s*[\d,.]+/i,
  /[\d,.]+\s*AED\b/i,
  /\bEUR\s*[\d,.]+/i,
  /[\d,.]+\s*EUR\b/i,
  /\bGBP\s*[\d,.]+/i,
  /[\d,.]+\s*GBP\b/i,
  /\$[\d,.]+/,
  /[\d,.]+\s*ريال/,
  /ر\.س\.?\s*[\d,.]+/,
  /[\d,.]+\s*ر\.س\.?/,
]

// Pattern to extract monetary amounts
const AMOUNT_PATTERN = /[\d,]+\.?\d*/g

// Category inference patterns
const CATEGORY_PATTERNS: Record<string, RegExp[]> = {
  'Food & Dining': [
    /restaurant/i,
    /cafe/i,
    /coffee/i,
    /starbucks/i,
    /mcdonald/i,
    /burger/i,
    /pizza/i,
    /food/i,
    /meal/i,
    /lunch/i,
    /dinner/i,
    /breakfast/i,
    /delivery/i,
    /hungerstation/i,
    /jahez/i,
    /careem.*food/i,
  ],
  'Transportation': [
    /uber/i,
    /careem/i,
    /taxi/i,
    /fuel/i,
    /petrol/i,
    /gas station/i,
    /parking/i,
    /metro/i,
    /bus/i,
    /flight/i,
    /airline/i,
  ],
  'Shopping': [
    /amazon/i,
    /noon/i,
    /jarir/i,
    /extra/i,
    /ikea/i,
    /mall/i,
    /store/i,
    /shop/i,
    /purchase/i,
  ],
  'Bills & Utilities': [
    /electricity/i,
    /water/i,
    /internet/i,
    /stc/i,
    /mobily/i,
    /zain/i,
    /bill/i,
    /subscription/i,
    /netflix/i,
    /spotify/i,
  ],
  'Groceries': [
    /panda/i,
    /danube/i,
    /tamimi/i,
    /carrefour/i,
    /lulu/i,
    /grocery/i,
    /supermarket/i,
  ],
  'Health': [
    /pharmacy/i,
    /hospital/i,
    /clinic/i,
    /doctor/i,
    /medical/i,
    /medicine/i,
  ],
  'Transfer': [
    /transfer/i,
    /sent to/i,
    /received from/i,
    /p2p/i,
  ],
}

/**
 * Check if text contains any exclude keywords
 */
function containsExcludeKeyword(text: string): string | null {
  const lowerText = text.toLowerCase()
  for (const keyword of EXCLUDE_KEYWORDS) {
    if (lowerText.includes(keyword.toLowerCase())) {
      return keyword
    }
  }
  return null
}

/**
 * Check if text contains any include keywords
 */
function containsIncludeKeyword(text: string): boolean {
  const lowerText = text.toLowerCase()
  return INCLUDE_KEYWORDS.some(keyword => lowerText.includes(keyword.toLowerCase()))
}

/**
 * Check if text contains currency or monetary values
 */
function containsCurrency(text: string): boolean {
  return CURRENCY_PATTERNS.some(pattern => pattern.test(text))
}

/**
 * Extract potential amount from text
 */
export function extractAmount(text: string): number | null {
  // First try to find currency-prefixed amounts
  for (const pattern of CURRENCY_PATTERNS) {
    const match = text.match(pattern)
    if (match) {
      const numMatch = match[0].match(AMOUNT_PATTERN)
      if (numMatch) {
        const amount = parseFloat(numMatch[0].replace(/,/g, ''))
        if (!isNaN(amount) && amount > 0) {
          return amount
        }
      }
    }
  }
  
  // Fallback: find any reasonable number (between 1 and 1,000,000)
  const numbers = text.match(AMOUNT_PATTERN)
  if (numbers) {
    for (const num of numbers) {
      const amount = parseFloat(num.replace(/,/g, ''))
      if (!isNaN(amount) && amount >= 1 && amount <= 1000000) {
        return amount
      }
    }
  }
  
  return null
}

/**
 * Infer category from text
 */
export function inferCategory(text: string): string {
  for (const [category, patterns] of Object.entries(CATEGORY_PATTERNS)) {
    if (patterns.some(pattern => pattern.test(text))) {
      return category
    }
  }
  return 'Other'
}

/**
 * Infer transaction direction (in/out)
 */
export function inferDirection(text: string): 'in' | 'out' {
  const lowerText = text.toLowerCase()
  
  // Income indicators
  const incomeKeywords = [
    'received',
    'credited',
    'deposit',
    'salary',
    'refund',
    'cashback',
    'earned',
    'income',
    'bonus',
  ]
  
  if (incomeKeywords.some(keyword => lowerText.includes(keyword))) {
    return 'in'
  }
  
  return 'out' // Default to expense
}

/**
 * Main validation function - The "Brain"
 * 
 * Validates if input text represents a valid financial transaction
 */
export function validateInput(text: string): ValidationResult {
  // Empty or too short
  if (!text || text.trim().length < 5) {
    return {
      isValid: false,
      reason: 'Input is too short. Please provide more details.',
      confidence: 'high',
    }
  }

  // Too long (likely a full document, not a transaction)
  if (text.length > 2000) {
    return {
      isValid: false,
      reason: 'Input is too long. Please paste only the transaction message.',
      confidence: 'medium',
    }
  }

  // Check for exclude keywords (spam, OTP, promotional)
  const excludeMatch = containsExcludeKeyword(text)
  if (excludeMatch) {
    return {
      isValid: false,
      reason: `This appears to be a ${excludeMatch.includes('otp') || excludeMatch.includes('code') ? 'security message' : 'promotional/informational message'}, not a transaction.`,
      confidence: 'high',
    }
  }

  // Check for monetary values
  const hasCurrency = containsCurrency(text)
  const hasIncludeKeyword = containsIncludeKeyword(text)
  const extractedAmount = extractAmount(text)

  // Strong signal: has currency pattern
  if (hasCurrency && extractedAmount) {
    return {
      isValid: true,
      confidence: 'high',
      suggestedCategory: inferCategory(text),
    }
  }

  // Medium signal: has transaction keywords and a number
  if (hasIncludeKeyword && extractedAmount) {
    return {
      isValid: true,
      confidence: 'medium',
      suggestedCategory: inferCategory(text),
    }
  }

  // Weak signal: just has a reasonable number
  if (extractedAmount && extractedAmount >= 1) {
    return {
      isValid: true,
      confidence: 'low',
      reason: 'No currency or transaction keywords detected. Please confirm this is a transaction.',
      suggestedCategory: inferCategory(text),
    }
  }

  // No valid signals
  return {
    isValid: false,
    reason: 'No monetary amount detected. Please include the transaction amount.',
    confidence: 'high',
  }
}

/**
 * Parse a raw text input into structured transaction data
 */
export interface ParsedTransaction {
  amount: number
  currency: string
  direction: 'in' | 'out'
  category: string
  merchant: string | null
  rawText: string
}

export function parseTransaction(text: string): ParsedTransaction | null {
  const validation = validateInput(text)
  if (!validation.isValid) {
    return null
  }

  const amount = extractAmount(text)
  if (!amount) {
    return null
  }

  // Detect currency
  let currency = 'SAR' // Default
  if (/USD|\$/i.test(text)) currency = 'USD'
  else if (/AED/i.test(text)) currency = 'AED'
  else if (/EUR|€/i.test(text)) currency = 'EUR'
  else if (/GBP|£/i.test(text)) currency = 'GBP'

  return {
    amount,
    currency,
    direction: inferDirection(text),
    category: inferCategory(text),
    merchant: null, // Could be enhanced with NLP
    rawText: text,
  }
}

