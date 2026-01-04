import { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  variant?: 'default' | 'filled'
  error?: string
  label?: string
  hint?: string
}

const inputVariants = {
  default: [
    'bg-white/[0.05] border-white/10',
    'hover:bg-white/[0.06] hover:border-white/15',
    'focus:bg-white/[0.08] focus:border-emerald-500/50',
  ].join(' '),
  filled: [
    'bg-white/[0.08] border-transparent',
    'hover:bg-white/[0.10]',
    'focus:bg-white/[0.10] focus:border-emerald-500/50',
  ].join(' '),
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, variant = 'default', error, label, hint, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-')
    
    return (
      <div className="w-full">
        {label && (
          <label 
            htmlFor={inputId}
            className="block text-sm font-medium text-slate-300 mb-1.5"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            'w-full px-4 py-3 backdrop-blur-sm border rounded-xl',
            'text-white placeholder:text-slate-500',
            'transition-all duration-200',
            'focus:outline-none focus:ring-2 focus:ring-emerald-500/20',
            inputVariants[variant],
            error && 'border-rose-500/50 focus:border-rose-500/50 focus:ring-rose-500/20',
            className
          )}
          {...props}
        />
        {hint && !error && (
          <p className="mt-1.5 text-xs text-slate-500">{hint}</p>
        )}
        {error && (
          <p className="mt-1.5 text-xs text-rose-400">{error}</p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'

// Textarea component
interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  variant?: 'default' | 'filled'
  error?: string
  label?: string
  hint?: string
  autoResize?: boolean
}

export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(
  ({ className, variant = 'default', error, label, hint, id, autoResize, onChange, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-')
    
    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      if (autoResize) {
        e.target.style.height = 'auto'
        e.target.style.height = `${e.target.scrollHeight}px`
      }
      onChange?.(e)
    }
    
    return (
      <div className="w-full">
        {label && (
          <label 
            htmlFor={inputId}
            className="block text-sm font-medium text-slate-300 mb-1.5"
          >
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={inputId}
          onChange={handleChange}
          className={cn(
            'w-full px-4 py-3 backdrop-blur-sm border rounded-xl',
            'text-white placeholder:text-slate-500',
            'transition-all duration-200 resize-none',
            'focus:outline-none focus:ring-2 focus:ring-emerald-500/20',
            inputVariants[variant],
            error && 'border-rose-500/50 focus:border-rose-500/50 focus:ring-rose-500/20',
            autoResize && 'overflow-hidden',
            className
          )}
          {...props}
        />
        {hint && !error && (
          <p className="mt-1.5 text-xs text-slate-500">{hint}</p>
        )}
        {error && (
          <p className="mt-1.5 text-xs text-rose-400">{error}</p>
        )}
      </div>
    )
  }
)

TextArea.displayName = 'TextArea'

