import { motion } from 'framer-motion'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatCurrency, formatCompactCurrency } from '@/lib/utils'

interface AmountDisplayProps {
  amount: number
  currency?: string
  direction?: 'in' | 'out' | 'neutral'
  size?: 'sm' | 'md' | 'lg' | 'xl'
  showSign?: boolean
  showIcon?: boolean
  compact?: boolean
  animate?: boolean
  className?: string
}

const sizeStyles = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-xl',
  xl: 'text-3xl font-bold',
}

const iconSizes = {
  sm: 'h-3 w-3',
  md: 'h-4 w-4',
  lg: 'h-5 w-5',
  xl: 'h-6 w-6',
}

export function AmountDisplay({
  amount,
  currency = 'SAR',
  direction,
  size = 'md',
  showSign = false,
  showIcon = false,
  compact = false,
  animate = false,
  className,
}: AmountDisplayProps) {
  // Auto-detect direction if not provided
  const effectiveDirection = direction ?? (amount > 0 ? 'in' : amount < 0 ? 'out' : 'neutral')
  
  const colorClass = {
    in: 'text-emerald-400',
    out: 'text-rose-400',
    neutral: 'text-slate-300',
  }[effectiveDirection]
  
  const Icon = {
    in: TrendingUp,
    out: TrendingDown,
    neutral: Minus,
  }[effectiveDirection]
  
  const formattedAmount = compact 
    ? formatCompactCurrency(Math.abs(amount), currency)
    : formatCurrency(Math.abs(amount), currency)
  
  const sign = showSign 
    ? effectiveDirection === 'in' ? '+' : effectiveDirection === 'out' ? '-' : ''
    : ''
  
  const content = (
    <span className={cn('inline-flex items-center gap-1.5 font-mono', colorClass, sizeStyles[size], className)}>
      {showIcon && <Icon className={iconSizes[size]} />}
      <span>
        {sign}{formattedAmount}
      </span>
    </span>
  )
  
  if (animate) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
      >
        {content}
      </motion.div>
    )
  }
  
  return content
}

// Animated counter for summary cards
interface AnimatedCounterProps {
  value: number
  currency?: string
  direction?: 'in' | 'out' | 'neutral'
  duration?: number
  className?: string
}

export function AnimatedCounter({
  value,
  currency = 'SAR',
  direction,
  duration = 1,
  className,
}: AnimatedCounterProps) {
  const effectiveDirection = direction ?? (value > 0 ? 'in' : value < 0 ? 'out' : 'neutral')
  
  const colorClass = {
    in: 'text-emerald-400',
    out: 'text-rose-400',
    neutral: 'text-white',
  }[effectiveDirection]
  
  return (
    <motion.span
      className={cn('font-mono text-3xl font-bold', colorClass, className)}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration }}
      >
        {formatCurrency(value, currency)}
      </motion.span>
    </motion.span>
  )
}

