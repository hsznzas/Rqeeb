import { format, formatDistanceToNow, isToday, isYesterday, parseISO } from 'date-fns'

/**
 * Format date to YYYY-MM-DD (standard format for DB storage)
 */
export function toISODateString(date: Date): string {
  return format(date, 'yyyy-MM-dd')
}

/**
 * Parse YYYY-MM-DD string to Date
 */
export function parseISODate(dateString: string): Date {
  return parseISO(dateString)
}

/**
 * Format date for display in the feed
 * - Within 7 days: "Sun 18 Jan at 2:30 PM" (short day name + date)
 * - Older than 7 days: "18 Jan at 2:30 PM" (no day name)
 */
export function formatFeedDate(date: Date | string): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24))
  
  if (diffDays < 7) {
    // Within a week: "Sun 18 Jan at 12:00 AM"
    return format(d, "EEE d MMM 'at' h:mm a")
  }
  
  // Older: "18 Jan at 12:00 AM"
  return format(d, "d MMM 'at' h:mm a")
}

/**
 * Format relative time (e.g., "2 hours ago", "3 days ago")
 */
export function formatRelativeTime(date: Date | string): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  return formatDistanceToNow(d, { addSuffix: true })
}

/**
 * Format date for transaction grouping headers
 * - Today: "Today"
 * - Yesterday: "Yesterday"  
 * - This week: "Monday, January 15"
 * - Older: "January 15, 2024"
 */
export function formatGroupDate(date: Date | string): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  
  if (isToday(d)) {
    return 'Today'
  }
  
  if (isYesterday(d)) {
    return 'Yesterday'
  }
  
  const now = new Date()
  const isCurrentYear = d.getFullYear() === now.getFullYear()
  
  if (isCurrentYear) {
    return format(d, 'EEEE, MMMM d')
  }
  
  return format(d, 'MMMM d, yyyy')
}

/**
 * Get start of current month
 */
export function getMonthStart(): Date {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), 1)
}

/**
 * Get today's date at midnight
 */
export function getTodayStart(): Date {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), now.getDate())
}

