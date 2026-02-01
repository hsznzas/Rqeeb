/**
 * Chat Response Component
 * 
 * Displays AI responses to user questions about spending
 */

import { motion } from 'framer-motion'
import { Bot, X, TrendingUp, TrendingDown, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatCurrency } from '@/lib/utils'
import type { Currency } from '@/lib/currency'

export interface ChatResponseData {
  type: 'answer'
  text: string
  bullets: string[]
  data: {
    totalAmount?: number
    transactionCount?: number
    topCategory?: string
    period?: string
    averageAmount?: number
    trend?: 'up' | 'down' | 'stable'
    [key: string]: unknown
  }
}

interface ChatResponseProps {
  response: ChatResponseData
  currency: Currency
  onDismiss: () => void
}

export function ChatResponse({ response, currency, onDismiss }: ChatResponseProps) {
  const { text, bullets, data } = response

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.95 }}
      className="mx-4 mb-4"
    >
      <div className="max-w-2xl mx-auto">
        <div className="relative bg-slate-900/95 backdrop-blur-xl rounded-2xl border border-emerald-500/30 shadow-xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06] bg-emerald-500/10">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-emerald-500/20">
                <Bot className="h-4 w-4 text-emerald-400" />
              </div>
              <span className="text-sm font-medium text-emerald-400">AI Insight</span>
            </div>
            <button
              onClick={onDismiss}
              className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Content */}
          <div className="p-4">
            {/* Main Text */}
            <p className="text-white leading-relaxed">{text}</p>

            {/* Bullet Points */}
            {bullets && bullets.length > 0 && (
              <ul className="mt-4 space-y-2">
                {bullets.map((bullet, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm text-slate-300">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>{bullet}</span>
                  </li>
                ))}
              </ul>
            )}

            {/* Data Summary */}
            {data && (data.totalAmount !== undefined || data.transactionCount !== undefined) && (
              <div className="mt-4 pt-4 border-t border-white/[0.06]">
                <div className="flex flex-wrap gap-3">
                  {data.totalAmount !== undefined && (
                    <div className="px-3 py-2 rounded-xl bg-white/[0.05] border border-white/[0.06]">
                      <p className="text-xs text-slate-500 uppercase tracking-wider">Total</p>
                      <p className="text-lg font-mono font-semibold text-white">
                        {formatCurrency(data.totalAmount, currency)}
                      </p>
                    </div>
                  )}
                  
                  {data.transactionCount !== undefined && (
                    <div className="px-3 py-2 rounded-xl bg-white/[0.05] border border-white/[0.06]">
                      <p className="text-xs text-slate-500 uppercase tracking-wider">Transactions</p>
                      <p className="text-lg font-semibold text-white">
                        {data.transactionCount}
                      </p>
                    </div>
                  )}
                  
                  {data.averageAmount !== undefined && (
                    <div className="px-3 py-2 rounded-xl bg-white/[0.05] border border-white/[0.06]">
                      <p className="text-xs text-slate-500 uppercase tracking-wider">Average</p>
                      <p className="text-lg font-mono font-semibold text-white">
                        {formatCurrency(data.averageAmount, currency)}
                      </p>
                    </div>
                  )}
                  
                  {data.topCategory && (
                    <div className="px-3 py-2 rounded-xl bg-white/[0.05] border border-white/[0.06]">
                      <p className="text-xs text-slate-500 uppercase tracking-wider">Top Category</p>
                      <p className="text-sm font-semibold text-white">
                        {data.topCategory}
                      </p>
                    </div>
                  )}
                  
                  {data.trend && (
                    <div className={cn(
                      'px-3 py-2 rounded-xl border',
                      data.trend === 'up' && 'bg-rose-500/10 border-rose-500/30',
                      data.trend === 'down' && 'bg-emerald-500/10 border-emerald-500/30',
                      data.trend === 'stable' && 'bg-slate-500/10 border-slate-500/30'
                    )}>
                      <p className="text-xs text-slate-500 uppercase tracking-wider">Trend</p>
                      <div className="flex items-center gap-1">
                        {data.trend === 'up' ? (
                          <>
                            <TrendingUp className="h-4 w-4 text-rose-400" />
                            <span className="text-sm font-semibold text-rose-400">Increasing</span>
                          </>
                        ) : data.trend === 'down' ? (
                          <>
                            <TrendingDown className="h-4 w-4 text-emerald-400" />
                            <span className="text-sm font-semibold text-emerald-400">Decreasing</span>
                          </>
                        ) : (
                          <span className="text-sm font-semibold text-slate-400">Stable</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Period */}
            {data?.period && (
              <p className="mt-3 text-xs text-slate-500">
                Based on data from: {data.period}
              </p>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  )
}
