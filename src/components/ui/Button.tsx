import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { motion, type HTMLMotionProps } from 'framer-motion'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'primary' | 'income' | 'expense' | 'ghost' | 'outline'
  size?: 'sm' | 'md' | 'lg' | 'icon'
  isLoading?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}

const variantStyles = {
  default: [
    'bg-white/[0.08] border-white/10 text-white',
    'hover:bg-white/[0.12] hover:border-white/20',
  ].join(' '),
  primary: [
    'bg-emerald-500/20 border-emerald-500/30 text-emerald-400',
    'hover:bg-emerald-500/30 hover:border-emerald-500/40',
  ].join(' '),
  income: [
    'bg-emerald-500 border-emerald-400 text-white',
    'hover:bg-emerald-600 shadow-glow-income',
  ].join(' '),
  expense: [
    'bg-rose-500 border-rose-400 text-white',
    'hover:bg-rose-600 shadow-glow-expense',
  ].join(' '),
  ghost: [
    'bg-transparent border-transparent text-slate-300',
    'hover:bg-white/[0.05] hover:text-white',
  ].join(' '),
  outline: [
    'bg-transparent border-white/20 text-white',
    'hover:bg-white/[0.05] hover:border-white/30',
  ].join(' '),
}

const sizeStyles = {
  sm: 'h-8 px-3 text-sm rounded-lg gap-1.5',
  md: 'h-10 px-4 text-sm rounded-xl gap-2',
  lg: 'h-12 px-6 text-base rounded-xl gap-2',
  icon: 'h-10 w-10 rounded-xl',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'default',
      size = 'md',
      isLoading = false,
      disabled,
      leftIcon,
      rightIcon,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(
          'inline-flex items-center justify-center font-medium',
          'backdrop-blur-sm border transition-all duration-200',
          'focus-visible:ring-2 focus-visible:ring-emerald-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950',
          'disabled:opacity-50 disabled:pointer-events-none',
          'active:scale-[0.98]',
          variantStyles[variant],
          sizeStyles[size],
          className
        )}
        {...props}
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <>
            {leftIcon && <span className="shrink-0">{leftIcon}</span>}
            {children}
            {rightIcon && <span className="shrink-0">{rightIcon}</span>}
          </>
        )}
      </button>
    )
  }
)

Button.displayName = 'Button'

// Animated button with Framer Motion
interface AnimatedButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
  variant?: 'default' | 'primary' | 'income' | 'expense' | 'ghost' | 'outline'
  size?: 'sm' | 'md' | 'lg' | 'icon'
  isLoading?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  children?: React.ReactNode
}

export const AnimatedButton = forwardRef<HTMLButtonElement, AnimatedButtonProps>(
  (
    {
      className,
      variant = 'default',
      size = 'md',
      isLoading = false,
      disabled,
      leftIcon,
      rightIcon,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <motion.button
        ref={ref}
        disabled={disabled || isLoading}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className={cn(
          'inline-flex items-center justify-center font-medium',
          'backdrop-blur-sm border transition-colors duration-200',
          'focus-visible:ring-2 focus-visible:ring-emerald-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950',
          'disabled:opacity-50 disabled:pointer-events-none',
          variantStyles[variant],
          sizeStyles[size],
          className
        )}
        {...props}
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <>
            {leftIcon && <span className="shrink-0">{leftIcon}</span>}
            {children}
            {rightIcon && <span className="shrink-0">{rightIcon}</span>}
          </>
        )}
      </motion.button>
    )
  }
)

AnimatedButton.displayName = 'AnimatedButton'

