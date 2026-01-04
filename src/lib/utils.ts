import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Combines clsx and tailwind-merge for optimal class name handling
 * Use this for all dynamic class combinations
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format a number as currency with proper locale
 */
export function formatCurrency(
  amount: number,
  currency: string = 'SAR',
  locale: string = 'en-SA'
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

/**
 * Format a number with K, M, B suffixes for large amounts
 */
export function formatCompactCurrency(amount: number, currency: string = 'SAR'): string {
  const absAmount = Math.abs(amount)
  const sign = amount < 0 ? '-' : ''
  
  if (absAmount >= 1_000_000_000) {
    return `${sign}${(absAmount / 1_000_000_000).toFixed(1)}B ${currency}`
  }
  if (absAmount >= 1_000_000) {
    return `${sign}${(absAmount / 1_000_000).toFixed(1)}M ${currency}`
  }
  if (absAmount >= 1_000) {
    return `${sign}${(absAmount / 1_000).toFixed(1)}K ${currency}`
  }
  return `${sign}${absAmount.toFixed(2)} ${currency}`
}

/**
 * Truncate text with ellipsis
 */
export function truncate(text: string, length: number): string {
  if (text.length <= length) return text
  return text.slice(0, length).trim() + '...'
}

/**
 * Generate a unique ID (for optimistic updates)
 */
export function generateId(): string {
  return `temp_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

/**
 * Check if an ID is temporary (from optimistic update)
 */
export function isTempId(id: string): boolean {
  return id.startsWith('temp_')
}

/**
 * Delay utility for animations/testing
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

