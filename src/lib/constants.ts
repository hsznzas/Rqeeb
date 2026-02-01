/**
 * Shared Constants
 * 
 * Centralized constants used across the application
 */

// Default categories that come with the app
export const DEFAULT_CATEGORIES = [
  'Food & Dining',
  'Transportation',
  'Shopping',
  'Bills & Utilities',
  'Groceries',
  'Health',
  'Transfer',
  'Entertainment',
  'Income',
  'Travel',
  'Education',
  'Advertising',
  'Subscription',
  'Other'
] as const

export type DefaultCategory = typeof DEFAULT_CATEGORIES[number]

// Category colors for UI
export const CATEGORY_COLORS: Record<string, string> = {
  'Food & Dining': 'bg-orange-500/20 border-orange-500/30 text-orange-400',
  'Transportation': 'bg-blue-500/20 border-blue-500/30 text-blue-400',
  'Shopping': 'bg-pink-500/20 border-pink-500/30 text-pink-400',
  'Bills & Utilities': 'bg-yellow-500/20 border-yellow-500/30 text-yellow-400',
  'Groceries': 'bg-green-500/20 border-green-500/30 text-green-400',
  'Health': 'bg-red-500/20 border-red-500/30 text-red-400',
  'Transfer': 'bg-purple-500/20 border-purple-500/30 text-purple-400',
  'Entertainment': 'bg-indigo-500/20 border-indigo-500/30 text-indigo-400',
  'Income': 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400',
  'Travel': 'bg-cyan-500/20 border-cyan-500/30 text-cyan-400',
  'Education': 'bg-violet-500/20 border-violet-500/30 text-violet-400',
  'Advertising': 'bg-rose-500/20 border-rose-500/30 text-rose-400',
  'Subscription': 'bg-amber-500/20 border-amber-500/30 text-amber-400',
  'Other': 'bg-slate-500/20 border-slate-500/30 text-slate-400',
}

// Default category when none is detected
export const DEFAULT_CATEGORY = 'Other'

// Helper function to get all categories (default + custom)
export function getAllCategories(customCategories: { name: string; is_active?: boolean }[] = []): string[] {
  const custom = customCategories
    .filter(c => c.is_active !== false)
    .map(c => c.name)
  
  // Combine, with custom categories first, then defaults (excluding duplicates)
  const combined = [...custom]
  for (const cat of DEFAULT_CATEGORIES) {
    if (!combined.includes(cat)) {
      combined.push(cat)
    }
  }
  
  return combined
}
