/**
 * CSV Reconciliation & Staging Utility
 * 
 * Handles CSV import, duplicate detection, and staging workflow
 */

import Papa from 'papaparse'
import { supabase } from '@/services/supabase'
import type { Transaction, StagingTransaction, NewStagingTransaction } from '@/types/database'

// ============================================
// TYPES
// ============================================

export interface CSVRow {
  date: string
  description: string
  amount: number
  currency?: string
  category?: string
  [key: string]: unknown
}

export interface ParsedCSVResult {
  success: boolean
  rows: CSVRow[]
  errors: string[]
  totalRows: number
}

export interface StagingResult {
  success: boolean
  staged: number
  duplicates: number
  errors: string[]
}

export interface PotentialMatch {
  transaction: Transaction
  matchScore: number
  reasons: string[]
}

// Common CSV column name mappings
const COLUMN_MAPPINGS: Record<string, string[]> = {
  date: ['date', 'transaction date', 'trans date', 'posting date', 'value date', 'تاريخ'],
  description: ['description', 'merchant', 'details', 'narrative', 'memo', 'reference', 'particulars', 'الوصف'],
  amount: ['amount', 'value', 'sum', 'debit', 'credit', 'المبلغ'],
  currency: ['currency', 'ccy', 'العملة'],
  category: ['category', 'type', 'التصنيف']
}

// ============================================
// CSV PARSING
// ============================================

/**
 * Parse a CSV file and map columns to our schema
 */
export async function parseCSVFile(file: File): Promise<ParsedCSVResult> {
  return new Promise((resolve) => {
    const errors: string[] = []
    
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.toLowerCase().trim(),
      complete: (results) => {
        const rows: CSVRow[] = []
        
        if (results.errors.length > 0) {
          results.errors.forEach(err => {
            errors.push(`Row ${err.row}: ${err.message}`)
          })
        }
        
        // Find column mappings
        const headers = results.meta.fields || []
        const columnMap = findColumnMappings(headers)
        
        if (!columnMap.date) {
          errors.push('Could not find a date column')
        }
        if (!columnMap.description) {
          errors.push('Could not find a description column')
        }
        if (!columnMap.amount) {
          errors.push('Could not find an amount column')
        }
        
        if (errors.length > 0) {
          resolve({ success: false, rows: [], errors, totalRows: 0 })
          return
        }
        
        // Map rows
        for (let i = 0; i < results.data.length; i++) {
          const row = results.data[i] as Record<string, string>
          
          try {
            const parsedRow = mapCSVRow(row, columnMap)
            if (parsedRow) {
              rows.push(parsedRow)
            }
          } catch (err) {
            errors.push(`Row ${i + 2}: ${err instanceof Error ? err.message : 'Parse error'}`)
          }
        }
        
        resolve({
          success: true,
          rows,
          errors,
          totalRows: results.data.length
        })
      },
      error: (error) => {
        resolve({
          success: false,
          rows: [],
          errors: [error.message],
          totalRows: 0
        })
      }
    })
  })
}

/**
 * Find which CSV columns map to our required fields
 */
function findColumnMappings(headers: string[]): Record<string, string | null> {
  const result: Record<string, string | null> = {
    date: null,
    description: null,
    amount: null,
    currency: null,
    category: null
  }
  
  for (const header of headers) {
    const lowerHeader = header.toLowerCase().trim()
    
    for (const [field, aliases] of Object.entries(COLUMN_MAPPINGS)) {
      if (aliases.some(alias => lowerHeader.includes(alias))) {
        if (!result[field]) {
          result[field] = header
        }
      }
    }
  }
  
  return result
}

/**
 * Map a single CSV row to our schema
 */
function mapCSVRow(row: Record<string, string>, columnMap: Record<string, string | null>): CSVRow | null {
  const dateStr = columnMap.date ? row[columnMap.date] : null
  const description = columnMap.description ? row[columnMap.description] : null
  const amountStr = columnMap.amount ? row[columnMap.amount] : null
  
  if (!dateStr || !description || !amountStr) {
    return null
  }
  
  // Parse date (handle multiple formats)
  const parsedDate = parseDate(dateStr)
  if (!parsedDate) {
    throw new Error(`Invalid date format: ${dateStr}`)
  }
  
  // Parse amount (handle currency symbols, commas, etc.)
  const amount = parseAmount(amountStr)
  if (isNaN(amount) || amount === 0) {
    throw new Error(`Invalid amount: ${amountStr}`)
  }
  
  return {
    date: parsedDate,
    description: description.trim(),
    amount: Math.abs(amount),
    currency: columnMap.currency ? row[columnMap.currency]?.toUpperCase() || 'SAR' : 'SAR',
    category: columnMap.category ? row[columnMap.category] : undefined
  }
}

/**
 * Parse date string to ISO format
 */
function parseDate(dateStr: string): string | null {
  const cleaned = dateStr.trim()
  
  // Try native Date parsing first
  const date = new Date(cleaned)
  if (!isNaN(date.getTime())) {
    return date.toISOString().split('T')[0]
  }
  
  // Try DD/MM/YYYY format (common in Middle East)
  const ddmmyyyy = cleaned.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/)
  if (ddmmyyyy) {
    const [, day, month, year] = ddmmyyyy
    const d = new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
    if (!isNaN(d.getTime())) {
      return d.toISOString().split('T')[0]
    }
  }
  
  return null
}

/**
 * Parse amount string to number
 */
function parseAmount(amountStr: string): number {
  // Remove currency symbols, spaces, and convert commas
  const cleaned = amountStr
    .replace(/[^\d.,\-]/g, '')
    .replace(/,/g, '')
    .trim()
  
  return parseFloat(cleaned)
}

// ============================================
// DUPLICATE DETECTION
// ============================================

// Configurable tolerance settings
export interface DuplicateDetectionConfig {
  dateTolerance: number     // Days ± for date matching (default: 2)
  amountTolerance: number   // Amount ± for amount matching (default: 1.0)
  minMatchScore: number     // Minimum score to consider a match (default: 60)
}

const DEFAULT_CONFIG: DuplicateDetectionConfig = {
  dateTolerance: 2,
  amountTolerance: 1.0,
  minMatchScore: 60
}

// Common business suffixes and prefixes to strip
const BUSINESS_SUFFIXES = [
  'llc', 'inc', 'corp', 'corporation', 'ltd', 'limited',
  'co', 'company', 'fz', 'fze', 'fzc', 'fzco', 'dmcc',
  'plc', 'gmbh', 'ag', 'sa', 'sarl', 'bv', 'nv',
  'llp', 'lp', 'pllc', 'pc', 'pa',
  'dba', 'trading', 'enterprises', 'solutions',
  'international', 'intl', 'global', 'group',
  'services', 'service', 'store', 'shop',
  'الشركة', 'شركة', 'مؤسسة', 'للتجارة'
]

// Common prefixes in bank statements
const BANK_PREFIXES = [
  'pos', 'pos purchase', 'point of sale', 'card purchase',
  'debit card', 'visa', 'mastercard', 'amex', 'mada',
  'payment to', 'payment', 'purchase', 'buy',
  'transfer to', 'transfer', 'wire', 'ach',
  'atm', 'withdrawal', 'cash', 'online'
]

/**
 * Normalize merchant name for comparison
 * Strips business suffixes, common prefixes, and standardizes format
 */
export function normalizeMerchantName(name: string): string {
  if (!name) return ''
  
  let normalized = name.toLowerCase().trim()
  
  // Remove common bank statement prefixes
  for (const prefix of BANK_PREFIXES) {
    if (normalized.startsWith(prefix + ' ')) {
      normalized = normalized.slice(prefix.length + 1).trim()
    }
  }
  
  // Remove business suffixes
  for (const suffix of BUSINESS_SUFFIXES) {
    const suffixPattern = new RegExp(`\\s+${suffix}\\s*$|\\s+${suffix}[.,]?\\s*$`, 'i')
    normalized = normalized.replace(suffixPattern, '')
  }
  
  // Remove special characters except spaces and alphanumeric
  normalized = normalized.replace(/[^\w\s\u0600-\u06FF]/g, ' ')
  
  // Collapse multiple spaces
  normalized = normalized.replace(/\s+/g, ' ').trim()
  
  // Remove trailing numbers (often reference numbers)
  normalized = normalized.replace(/\s+\d+$/, '')
  
  return normalized
}

/**
 * Find potential matching transactions for a CSV row
 * Matches within configurable tolerance windows
 */
export async function findPotentialMatches(
  userId: string,
  csvRow: CSVRow,
  config: DuplicateDetectionConfig = DEFAULT_CONFIG
): Promise<PotentialMatch[]> {
  const rowDate = new Date(csvRow.date)
  const minDate = new Date(rowDate)
  minDate.setDate(minDate.getDate() - config.dateTolerance)
  const maxDate = new Date(rowDate)
  maxDate.setDate(maxDate.getDate() + config.dateTolerance)
  
  const minAmount = csvRow.amount - config.amountTolerance
  const maxAmount = csvRow.amount + config.amountTolerance
  
  // Query for potential matches
  const { data: matches, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .gte('transaction_date', minDate.toISOString().split('T')[0])
    .lte('transaction_date', maxDate.toISOString().split('T')[0])
    .gte('amount', minAmount)
    .lte('amount', maxAmount)
  
  if (error || !matches) {
    return []
  }
  
  // Normalize CSV description for comparison
  const normalizedCSVDesc = normalizeMerchantName(csvRow.description)
  
  // Score and filter matches
  const potentialMatches: PotentialMatch[] = []
  const typedMatches = matches as Transaction[]
  
  for (const tx of typedMatches) {
    const reasons: string[] = []
    let score = 0
    
    // Date proximity score (max 40 points)
    const txDate = new Date(tx.transaction_date)
    const daysDiff = Math.abs(Math.floor((rowDate.getTime() - txDate.getTime()) / (1000 * 60 * 60 * 24)))
    if (daysDiff === 0) {
      score += 40
      reasons.push('Same date')
    } else if (daysDiff === 1) {
      score += 30
      reasons.push('±1 day')
    } else {
      score += 20
      reasons.push(`±${daysDiff} days`)
    }
    
    // Amount proximity score (max 40 points)
    const amountDiff = Math.abs(tx.amount - csvRow.amount)
    if (amountDiff === 0) {
      score += 40
      reasons.push('Exact amount')
    } else if (amountDiff < 0.5) {
      score += 35
      reasons.push('Amount within ±0.50')
    } else if (amountDiff < 1.0) {
      score += 25
      reasons.push('Amount within ±1.00')
    } else {
      score += 15
      reasons.push(`Amount within ±${amountDiff.toFixed(2)}`)
    }
    
    // Merchant/description similarity score (max 30 points)
    const normalizedTxMerchant = normalizeMerchantName(tx.merchant || tx.category || '')
    const descSimilarity = calculateSimilarity(normalizedCSVDesc, normalizedTxMerchant)
    
    if (descSimilarity > 0.8) {
      score += 30
      reasons.push('Very similar merchant')
    } else if (descSimilarity > 0.5) {
      score += 20
      reasons.push('Similar merchant')
    } else if (descSimilarity > 0.3) {
      score += 10
      reasons.push('Partial merchant match')
    }
    
    // Bonus: Check if normalized names contain each other
    if (normalizedCSVDesc.includes(normalizedTxMerchant) || 
        normalizedTxMerchant.includes(normalizedCSVDesc)) {
      if (!reasons.includes('Very similar merchant')) {
        score += 15
        reasons.push('Merchant name contained')
      }
    }
    
    // Only include if score is above threshold
    if (score >= config.minMatchScore) {
      potentialMatches.push({
        transaction: tx as Transaction,
        matchScore: Math.min(score, 100), // Cap at 100
        reasons
      })
    }
  }
  
  // Sort by score descending
  return potentialMatches.sort((a, b) => b.matchScore - a.matchScore)
}

/**
 * Calculate string similarity using multiple methods
 * Returns a score between 0 and 1
 */
function calculateSimilarity(str1: string, str2: string): number {
  if (!str1 || !str2) return 0
  if (str1 === str2) return 1
  
  // Method 1: Jaccard similarity on words
  const words1 = new Set(str1.split(/\s+/).filter(w => w.length > 1))
  const words2 = new Set(str2.split(/\s+/).filter(w => w.length > 1))
  
  let jaccardScore = 0
  if (words1.size > 0 && words2.size > 0) {
    const intersection = [...words1].filter(w => words2.has(w)).length
    const union = new Set([...words1, ...words2]).size
    jaccardScore = intersection / union
  }
  
  // Method 2: Levenshtein-based similarity (normalized)
  const levenshteinScore = 1 - (levenshteinDistance(str1, str2) / Math.max(str1.length, str2.length))
  
  // Method 3: Common prefix/suffix bonus
  let prefixScore = 0
  const minLen = Math.min(str1.length, str2.length)
  let commonPrefix = 0
  for (let i = 0; i < minLen && str1[i] === str2[i]; i++) {
    commonPrefix++
  }
  if (commonPrefix > 3) {
    prefixScore = commonPrefix / minLen * 0.5
  }
  
  // Return weighted average
  return Math.min(1, jaccardScore * 0.4 + levenshteinScore * 0.4 + prefixScore * 0.2)
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(str1: string, str2: string): number {
  const m = str1.length
  const n = str2.length
  
  // Quick checks
  if (m === 0) return n
  if (n === 0) return m
  if (str1 === str2) return 0
  
  // Create distance matrix
  const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0))
  
  // Initialize first row and column
  for (let i = 0; i <= m; i++) dp[i][0] = i
  for (let j = 0; j <= n; j++) dp[0][j] = j
  
  // Fill in the rest
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,      // deletion
        dp[i][j - 1] + 1,      // insertion
        dp[i - 1][j - 1] + cost // substitution
      )
    }
  }
  
  return dp[m][n]
}

// ============================================
// STAGING OPERATIONS
// ============================================

/**
 * Process a CSV file upload and stage all rows
 */
export async function processCSVUpload(
  userId: string,
  file: File
): Promise<StagingResult> {
  const errors: string[] = []
  let staged = 0
  let duplicates = 0
  
  // Parse CSV
  const parseResult = await parseCSVFile(file)
  
  if (!parseResult.success) {
    return {
      success: false,
      staged: 0,
      duplicates: 0,
      errors: parseResult.errors
    }
  }
  
  // Process each row
  for (let i = 0; i < parseResult.rows.length; i++) {
    const row = parseResult.rows[i]
    
    try {
      // Find potential matches
      const matches = await findPotentialMatches(userId, row)
      const bestMatch = matches.length > 0 ? matches[0] : null
      
      // Determine direction from amount sign or description
      const direction = determineDirection(row)
      
      // Create staging record
      const stagingRecord: NewStagingTransaction = {
        user_id: userId,
        raw_text: `${row.date} | ${row.description} | ${row.amount} ${row.currency}`,
        extracted_data: {
          date: row.date,
          description: row.description,
          amount: row.amount,
          currency: row.currency || 'SAR',
          category: row.category || 'Other',
          direction,
          original_row_index: i
        },
        status: 'pending',
        csv_source: file.name,
        potential_match_id: bestMatch?.transaction.id || null
      }
      
      const { error } = await supabase
        .from('staging_transactions')
        .insert(stagingRecord as never)
      
      if (error) {
        errors.push(`Row ${i + 1}: ${error.message}`)
      } else {
        staged++
        if (bestMatch) {
          duplicates++
        }
      }
    } catch (err) {
      errors.push(`Row ${i + 1}: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }
  
  return {
    success: errors.length === 0,
    staged,
    duplicates,
    errors
  }
}

/**
 * Determine transaction direction from description/amount
 */
function determineDirection(row: CSVRow): 'in' | 'out' {
  const desc = row.description.toLowerCase()
  
  // Income indicators
  const incomeKeywords = ['salary', 'deposit', 'transfer in', 'credit', 'received', 'refund', 'cashback']
  if (incomeKeywords.some(kw => desc.includes(kw))) {
    return 'in'
  }
  
  // Default to expense
  return 'out'
}

// ============================================
// STAGING REVIEW ACTIONS
// ============================================

/**
 * Get all pending staging transactions for a user
 */
export async function getPendingStagingTransactions(userId: string): Promise<StagingTransaction[]> {
  const { data, error } = await supabase
    .from('staging_transactions')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
  
  if (error) {
    console.error('Error fetching staging transactions:', error)
    return []
  }
  
  return (data as StagingTransaction[]) || []
}

/**
 * Approve a staging transaction and create a real transaction
 */
export async function approveStaging(
  stagingId: string,
  userId: string,
  transactionData: {
    amount: number
    currency: string
    direction: 'in' | 'out'
    category: string
    merchant: string | null
    transaction_date: string
    account_id?: string | null
    card_id?: string | null
  }
): Promise<{ success: boolean; transactionId?: string; error?: string }> {
  // Create the real transaction
  const { data: newTx, error: txError } = await supabase
    .from('transactions')
    .insert({
      user_id: userId,
      ...transactionData
    } as never)
    .select()
    .single()
  
  if (txError) {
    return { success: false, error: txError.message }
  }
  
  // Update staging status to approved
  const { error: updateError } = await supabase
    .from('staging_transactions')
    .update({ status: 'approved', updated_at: new Date().toISOString() } as never)
    .eq('id', stagingId)
  
  if (updateError) {
    console.error('Failed to update staging status:', updateError)
  }
  
  return { success: true, transactionId: (newTx as { id: string }).id }
}

/**
 * Merge staging data with an existing transaction
 */
export async function mergeWithExisting(
  stagingId: string,
  existingTransactionId: string,
  updates: Partial<Transaction>
): Promise<{ success: boolean; error?: string }> {
  // Update the existing transaction with better data
  const { error: updateError } = await supabase
    .from('transactions')
    .update({
      ...updates,
      // Keep these fields that shouldn't be overwritten
      id: undefined,
      user_id: undefined,
      created_at: undefined
    } as never)
    .eq('id', existingTransactionId)
  
  if (updateError) {
    return { success: false, error: updateError.message }
  }
  
  // Delete the staging row
  const { error: deleteError } = await supabase
    .from('staging_transactions')
    .delete()
    .eq('id', stagingId)
  
  if (deleteError) {
    console.error('Failed to delete staging row:', deleteError)
  }
  
  return { success: true }
}

/**
 * Reject a staging transaction
 */
export async function rejectStaging(stagingId: string): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('staging_transactions')
    .update({ status: 'rejected', updated_at: new Date().toISOString() } as never)
    .eq('id', stagingId)
  
  if (error) {
    return { success: false, error: error.message }
  }
  
  return { success: true }
}

/**
 * Bulk approve all non-duplicate staging transactions
 */
export async function bulkApproveNonDuplicates(
  userId: string,
  stagingIds: string[],
  defaultAccountId?: string | null,
  defaultCardId?: string | null
): Promise<{ success: boolean; approved: number; errors: string[] }> {
  const errors: string[] = []
  let approved = 0
  
  // Get all staging transactions
  const { data: stagingTxs, error } = await supabase
    .from('staging_transactions')
    .select('*')
    .in('id', stagingIds)
    .eq('status', 'pending')
    .is('potential_match_id', null) // Only non-duplicates
  
  if (error || !stagingTxs) {
    return { success: false, approved: 0, errors: [error?.message || 'Failed to fetch staging transactions'] }
  }
  
  for (const staging of stagingTxs as StagingTransaction[]) {
    const extracted = staging.extracted_data as {
      date?: string
      amount?: number
      currency?: string
      direction?: 'in' | 'out'
      category?: string
      description?: string
    }
    
    const result = await approveStaging(staging.id, userId, {
      amount: extracted.amount || 0,
      currency: extracted.currency || 'SAR',
      direction: extracted.direction || 'out',
      category: extracted.category || 'Other',
      merchant: extracted.description || null,
      transaction_date: extracted.date || new Date().toISOString().split('T')[0],
      account_id: defaultAccountId,
      card_id: defaultCardId
    })
    
    if (result.success) {
      approved++
    } else {
      errors.push(`${staging.id}: ${result.error}`)
    }
  }
  
  return { success: errors.length === 0, approved, errors }
}

// ============================================
// CATEGORY LEARNING
// ============================================

/**
 * Save a category rule for AI learning
 */
export async function learnCategoryRule(
  userId: string,
  merchantKeyword: string,
  category: string
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('category_rules')
    .upsert({
      user_id: userId,
      merchant_keyword: merchantKeyword.toLowerCase().trim(),
      category,
      updated_at: new Date().toISOString()
    } as never, {
      onConflict: 'user_id,merchant_keyword'
    })
  
  if (error) {
    // Try using the database function instead
    const { error: fnError } = await supabase.rpc('upsert_category_rule' as never, {
      p_user_id: userId,
      p_merchant_keyword: merchantKeyword,
      p_category: category
    } as never)
    
    if (fnError) {
      return { success: false, error: fnError.message }
    }
  }
  
  return { success: true }
}

/**
 * Get learned category for a merchant
 */
export async function getLearnedCategory(
  userId: string,
  merchant: string
): Promise<string | null> {
  const { data, error } = await supabase
    .from('category_rules')
    .select('category')
    .eq('user_id', userId)
    .ilike('merchant_keyword', `%${merchant.toLowerCase()}%`)
    .order('times_applied', { ascending: false })
    .limit(1)
    .single()
  
  if (error || !data) {
    return null
  }
  
  return (data as { category: string }).category
}
