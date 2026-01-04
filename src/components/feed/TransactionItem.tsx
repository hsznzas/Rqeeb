import { forwardRef } from 'react'
import { motion } from 'framer-motion'
import { 
  Coffee, 
  Car, 
  ShoppingBag, 
  Zap, 
  ShoppingCart,
  Heart,
  ArrowLeftRight,
  HelpCircle,
  Trash2,
  Loader2
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatCurrency } from '@/lib/utils'
import { formatFeedDate } from '@/lib/dateUtils'
import type { OptimisticTransaction } from '@/types'

// Category icons mapping
const categoryIcons: Record<string, React.ElementType> = {
  'Food & Dining': Coffee,
  'Transportation': Car,
  'Shopping': ShoppingBag,
  'Bills & Utilities': Zap,
  'Groceries': ShoppingCart,
  'Health': Heart,
  'Transfer': ArrowLeftRight,
  'Other': HelpCircle,
}

// Category colors
const categoryColors: Record<string, string> = {
  'Food & Dining': 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  'Transportation': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  'Shopping': 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  'Bills & Utilities': 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  'Groceries': 'bg-green-500/20 text-green-400 border-green-500/30',
  'Health': 'bg-pink-500/20 text-pink-400 border-pink-500/30',
  'Transfer': 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  'Other': 'bg-slate-500/20 text-slate-400 border-slate-500/30',
}

interface TransactionItemProps {
  transaction: OptimisticTransaction
  index: number
  onDelete?: (id: string) => void
}

export const TransactionItem = forwardRef<HTMLDivElement, TransactionItemProps>(
  function TransactionItem({ transaction, index, onDelete }, ref) {
    const Icon = categoryIcons[transaction.category] || HelpCircle
    const colorClass = categoryColors[transaction.category] || categoryColors['Other']
    const isIncome = transaction.direction === 'in'

    return (
      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, x: -100 }}
        transition={{ 
          duration: 0.3, 
          delay: index * 0.05,
          ease: 'easeOut' 
        }}
        layout
        className={cn(
          'group relative p-4 rounded-2xl',
          'bg-white/[0.03] hover:bg-white/[0.06]',
          'border border-white/[0.06] hover:border-white/10',
          'transition-all duration-200',
          transaction.isOptimistic && 'opacity-70',
          transaction.isFailed && 'border-rose-500/30 bg-rose-500/[0.05]'
        )}
      >
        <div className="flex items-center gap-4">
          {/* Category Icon */}
          <div className={cn(
            'shrink-0 p-3 rounded-xl border',
            colorClass
          )}>
            {transaction.isOptimistic ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Icon className="h-5 w-5" />
            )}
          </div>

          {/* Details */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-medium text-white truncate">
                {transaction.merchant || transaction.category}
              </h3>
              {transaction.isOptimistic && (
                <span className="text-xs text-slate-500">Saving...</span>
              )}
              {transaction.isFailed && (
                <span className="text-xs text-rose-400">Failed</span>
              )}
            </div>
            <p className="text-sm text-slate-500 truncate">
              {transaction.category} • {formatFeedDate(transaction.created_at)}
            </p>
          </div>

          {/* Amount */}
          <div className="shrink-0 text-right">
            <div className={cn(
              'font-semibold font-mono text-lg',
              isIncome ? 'text-emerald-400' : 'text-rose-400'
            )}>
              {isIncome ? '+' : '-'}{formatCurrency(transaction.amount, transaction.currency)}
            </div>
          </div>

          {/* Delete button (shown on hover) */}
          {onDelete && !transaction.isOptimistic && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              whileHover={{ scale: 1.1 }}
              onClick={() => onDelete(transaction.id)}
              className={cn(
                'absolute right-2 top-2',
                'p-2 rounded-lg',
                'bg-rose-500/10 text-rose-400',
                'opacity-0 group-hover:opacity-100',
                'transition-opacity duration-200',
                'hover:bg-rose-500/20'
              )}
            >
              <Trash2 className="h-4 w-4" />
            </motion.button>
          )}
        </div>
      </motion.div>
    )
  }
)
