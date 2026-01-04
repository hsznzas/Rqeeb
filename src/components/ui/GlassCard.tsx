import { forwardRef, type HTMLAttributes } from 'react'
import { motion, type HTMLMotionProps } from 'framer-motion'
import { cn } from '@/lib/utils'

interface GlassCardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'hover' | 'income' | 'expense' | 'accent'
  size?: 'sm' | 'md' | 'lg'
  animated?: boolean
}

const variantStyles = {
  default: 'bg-white/[0.05] border-white/10',
  hover: 'bg-white/[0.05] border-white/10 hover:bg-white/[0.08] hover:border-white/15 transition-all duration-300',
  income: 'bg-emerald-500/[0.08] border-emerald-500/20 hover:border-emerald-500/30',
  expense: 'bg-rose-500/[0.08] border-rose-500/20 hover:border-rose-500/30',
  accent: 'bg-amber-500/[0.08] border-amber-500/20 hover:border-amber-500/30',
}

const sizeStyles = {
  sm: 'p-3 rounded-xl',
  md: 'p-4 rounded-2xl',
  lg: 'p-6 rounded-2xl',
}

export const GlassCard = forwardRef<HTMLDivElement, GlassCardProps>(
  ({ className, variant = 'default', size = 'md', children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'backdrop-blur-md border shadow-glass',
          variantStyles[variant],
          sizeStyles[size],
          className
        )}
        {...props}
      >
        {children}
      </div>
    )
  }
)

GlassCard.displayName = 'GlassCard'

// Animated version using Framer Motion
interface AnimatedGlassCardProps extends Omit<HTMLMotionProps<'div'>, 'children'> {
  variant?: 'default' | 'hover' | 'income' | 'expense' | 'accent'
  size?: 'sm' | 'md' | 'lg'
  children?: React.ReactNode
}

export const AnimatedGlassCard = forwardRef<HTMLDivElement, AnimatedGlassCardProps>(
  ({ className, variant = 'default', size = 'md', children, ...props }, ref) => {
    return (
      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className={cn(
          'backdrop-blur-md border shadow-glass',
          variantStyles[variant],
          sizeStyles[size],
          className
        )}
        {...props}
      >
        {children}
      </motion.div>
    )
  }
)

AnimatedGlassCard.displayName = 'AnimatedGlassCard'

