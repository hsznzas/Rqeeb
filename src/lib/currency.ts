/**
 * Currency Conversion Utility
 * 
 * Handles currency conversion with hardcoded rates for MVP.
 * In production, integrate with a real-time forex API.
 */

// Supported currencies
export type Currency = 'SAR' | 'USD' | 'EUR' | 'GBP' | 'AED' | 'KWD' | 'BHD' | 'QAR' | 'OMR' | 'EGP'

// Currency metadata
export const CURRENCIES: Record<Currency, { name: string; symbol: string; flag: string }> = {
  SAR: { name: 'Saudi Riyal', symbol: 'ر.س', flag: '🇸🇦' },
  USD: { name: 'US Dollar', symbol: '$', flag: '🇺🇸' },
  EUR: { name: 'Euro', symbol: '€', flag: '🇪🇺' },
  GBP: { name: 'British Pound', symbol: '£', flag: '🇬🇧' },
  AED: { name: 'UAE Dirham', symbol: 'د.إ', flag: '🇦🇪' },
  KWD: { name: 'Kuwaiti Dinar', symbol: 'د.ك', flag: '🇰🇼' },
  BHD: { name: 'Bahraini Dinar', symbol: 'د.ب', flag: '🇧🇭' },
  QAR: { name: 'Qatari Riyal', symbol: 'ر.ق', flag: '🇶🇦' },
  OMR: { name: 'Omani Rial', symbol: 'ر.ع', flag: '🇴🇲' },
  EGP: { name: 'Egyptian Pound', symbol: 'ج.م', flag: '🇪🇬' },
}

// Exchange rates to SAR (base currency)
// These are approximate rates - in production, use a real-time API
const RATES_TO_SAR: Record<Currency, number> = {
  SAR: 1,
  USD: 3.75,
  EUR: 4.08,
  GBP: 4.75,
  AED: 1.02,
  KWD: 12.22,
  BHD: 9.95,
  QAR: 1.03,
  OMR: 9.74,
  EGP: 0.077,
}

/**
 * Convert amount from one currency to another
 */
export function convertAmount(
  amount: number,
  from: Currency,
  to: Currency
): { convertedAmount: number; rate: number } {
  if (from === to) {
    return { convertedAmount: amount, rate: 1 }
  }

  // Convert to SAR first, then to target currency
  const amountInSAR = amount * RATES_TO_SAR[from]
  const convertedAmount = amountInSAR / RATES_TO_SAR[to]
  const rate = RATES_TO_SAR[from] / RATES_TO_SAR[to]

  return {
    convertedAmount: Math.round(convertedAmount * 100) / 100,
    rate: Math.round(rate * 1000000) / 1000000,
  }
}

/**
 * Get exchange rate between two currencies
 */
export function getExchangeRate(from: Currency, to: Currency): number {
  if (from === to) return 1
  return RATES_TO_SAR[from] / RATES_TO_SAR[to]
}

/**
 * Format currency amount with symbol
 */
export function formatCurrencyWithSymbol(amount: number, currency: Currency): string {
  const { symbol } = CURRENCIES[currency] || { symbol: currency }
  const formattedAmount = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(amount))
  
  return `${amount < 0 ? '-' : ''}${symbol}${formattedAmount}`
}

/**
 * Parse currency from text (e.g., "$50", "50 USD", "٥٠ ريال")
 */
export function parseCurrencyFromText(text: string): Currency {
  const upperText = text.toUpperCase()
  
  // Check for currency codes
  for (const code of Object.keys(CURRENCIES) as Currency[]) {
    if (upperText.includes(code)) {
      return code
    }
  }
  
  // Check for symbols
  if (text.includes('$')) return 'USD'
  if (text.includes('€')) return 'EUR'
  if (text.includes('£')) return 'GBP'
  if (text.includes('ر.س') || text.includes('ريال')) return 'SAR'
  if (text.includes('د.إ') || text.includes('درهم')) return 'AED'
  
  // Default to SAR
  return 'SAR'
}

/**
 * Check if currency conversion is needed
 */
export function needsConversion(transactionCurrency: Currency, accountCurrency: Currency): boolean {
  return transactionCurrency !== accountCurrency
}

/**
 * Get all supported currencies as options
 */
export function getCurrencyOptions(): { value: Currency; label: string }[] {
  return Object.entries(CURRENCIES).map(([code, { name, flag }]) => ({
    value: code as Currency,
    label: `${flag} ${code} - ${name}`,
  }))
}

