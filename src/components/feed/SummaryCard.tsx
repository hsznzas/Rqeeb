import { motion } from 'framer-motion'
import { TrendingUp, TrendingDown, Wallet, ArrowUpRight, ArrowDownRight } from 'lucide-react'
import { GlassCard } from '@/components/ui'
import { formatCurrency } from '@/lib/utils'
import { useData } from '@/context'

export function SummaryCard() {
  const { summary } = useData()

  const isPositive = summary.netAmount >= 0

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
    >
      <GlassCard size="lg" className="relative overflow-hidden">
        {/* Background gradient accent */}
        <div 
          className={`absolute inset-0 opacity-20 ${
            isPositive 
              ? 'bg-gradient-to-br from-emerald-500/20 via-transparent to-transparent' 
              : 'bg-gradient-to-br from-rose-500/20 via-transparent to-transparent'
          }`}
        />
        
        <div className="relative z-10">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-white/[0.08]">
                <Wallet className="h-5 w-5 text-slate-300" />
              </div>
              <span className="text-sm text-slate-400 font-medium">Monthly Balance</span>
            </div>
            <span className="text-xs text-slate-500 uppercase tracking-wider">
              This Month
            </span>
          </div>

          {/* Main Amount */}
          <div className="mb-6">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, duration: 0.4 }}
              className={`text-4xl font-bold tracking-tight ${
                isPositive ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {isPositive ? '+' : ''}{formatCurrency(summary.netAmount, 'SAR')}
            </motion.div>
            <div className="flex items-center gap-1.5 mt-1">
              {isPositive ? (
                <ArrowUpRight className="h-4 w-4 text-emerald-500" />
              ) : (
                <ArrowDownRight className="h-4 w-4 text-rose-500" />
              )}
              <span className="text-xs text-slate-500">
                {summary.transactionCount} transactions
              </span>
            </div>
          </div>

          {/* Income & Expenses Row */}
          <div className="grid grid-cols-2 gap-4">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3, duration: 0.4 }}
              className="p-3 rounded-xl bg-emerald-500/[0.08] border border-emerald-500/20"
            >
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="h-4 w-4 text-emerald-400" />
                <span className="text-xs text-emerald-400/80 font-medium">Income</span>
              </div>
              <div className="text-lg font-semibold text-emerald-400">
                +{formatCurrency(summary.totalIncome, 'SAR')}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4, duration: 0.4 }}
              className="p-3 rounded-xl bg-rose-500/[0.08] border border-rose-500/20"
            >
              <div className="flex items-center gap-2 mb-1">
                <TrendingDown className="h-4 w-4 text-rose-400" />
                <span className="text-xs text-rose-400/80 font-medium">Expenses</span>
              </div>
              <div className="text-lg font-semibold text-rose-400">
                -{formatCurrency(summary.totalExpenses, 'SAR')}
              </div>
            </motion.div>
          </div>
        </div>
      </GlassCard>
    </motion.div>
  )
}

