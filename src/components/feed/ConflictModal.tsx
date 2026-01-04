/**
 * Conflict Modal
 * 
 * Shown when AI-parsed payment hint conflicts with toolbar selection.
 * Lets user choose between text-detected account/card vs toolbar preset.
 */

import { motion } from 'framer-motion'
import {
  AlertTriangle,
  FileText,
  Settings,
  Building2,
  CreditCard,
  Banknote,
  Smartphone,
  ArrowRight
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Account, AccountCard } from '@/types/database'
import type { PaymentMatch } from '@/lib/ai'

// Account icon mapping
const accountIcons: Record<string, React.ElementType> = {
  'building-2': Building2,
  'banknote': Banknote,
  'smartphone': Smartphone,
  'credit-card': CreditCard,
}

export interface ConflictData {
  paymentHint: string
  aiMatch: PaymentMatch
  toolbarAccountId: string | null
  toolbarCardId: string | null
}

interface ConflictModalProps {
  isOpen: boolean
  conflictData: ConflictData | null
  accounts: Account[]
  cards: AccountCard[]
  onUseText: () => void
  onKeepToolbar: () => void
  onCancel: () => void
}

export function ConflictModal({
  isOpen,
  conflictData,
  accounts,
  cards,
  onUseText,
  onKeepToolbar,
  onCancel
}: ConflictModalProps) {
  if (!isOpen || !conflictData) return null

  // Get display info for AI match
  const aiAccount = conflictData.aiMatch.accountId 
    ? accounts.find(a => a.id === conflictData.aiMatch.accountId)
    : null
  const aiCard = conflictData.aiMatch.cardId
    ? cards.find(c => c.id === conflictData.aiMatch.cardId)
    : null

  // Get display info for toolbar selection
  const toolbarAccount = conflictData.toolbarAccountId
    ? accounts.find(a => a.id === conflictData.toolbarAccountId)
    : null
  const toolbarCard = conflictData.toolbarCardId
    ? cards.find(c => c.id === conflictData.toolbarCardId)
    : null

  const AIAccountIcon = aiAccount ? (accountIcons[aiAccount.icon] || CreditCard) : CreditCard
  const ToolbarAccountIcon = toolbarAccount ? (accountIcons[toolbarAccount.icon] || CreditCard) : CreditCard

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={onCancel}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="w-full max-w-md"
        onClick={e => e.stopPropagation()}
      >
        <div className="backdrop-blur-xl bg-white/[0.08] border border-white/10 rounded-3xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="p-4 border-b border-white/[0.06]">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-500/20">
                <AlertTriangle className="h-5 w-5 text-amber-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">
                  Different Payment Method Detected
                </h2>
                <p className="text-sm text-slate-500">
                  Your text mentions a different account/card
                </p>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-4 space-y-4">
            {/* What was detected */}
            <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
              <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
                <FileText className="h-3 w-3" />
                <span>Detected in text:</span>
              </div>
              <p className="text-amber-400 font-medium">
                "{conflictData.paymentHint}"
              </p>
            </div>

            {/* Comparison */}
            <div className="flex items-center gap-3">
              {/* Text Option */}
              <div className="flex-1 p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
                <p className="text-xs text-emerald-400 mb-2">From Text</p>
                <div className="flex items-center gap-2">
                  {aiCard ? (
                    <>
                      <div 
                        className="w-8 h-5 rounded flex items-center justify-center text-[8px] font-bold text-white"
                        style={{ backgroundColor: aiCard.color }}
                      >
                        {aiCard.type === 'credit' ? 'CR' : 'DB'}
                      </div>
                      <div>
                        <p className="text-white text-sm font-medium">{aiCard.name}</p>
                        <p className="text-xs text-slate-500">
                          {aiAccount?.name} • ****{aiCard.last_4_digits}
                        </p>
                      </div>
                    </>
                  ) : aiAccount ? (
                    <>
                      <AIAccountIcon className="h-5 w-5" style={{ color: aiAccount.color }} />
                      <p className="text-white text-sm font-medium">{aiAccount.name}</p>
                    </>
                  ) : (
                    <p className="text-slate-500 text-sm">Unknown</p>
                  )}
                </div>
              </div>

              <ArrowRight className="h-4 w-4 text-slate-600 shrink-0" />

              {/* Toolbar Option */}
              <div className="flex-1 p-3 rounded-xl bg-blue-500/5 border border-blue-500/20">
                <p className="text-xs text-blue-400 mb-2">From Toolbar</p>
                <div className="flex items-center gap-2">
                  {toolbarCard ? (
                    <>
                      <div 
                        className="w-8 h-5 rounded flex items-center justify-center text-[8px] font-bold text-white"
                        style={{ backgroundColor: toolbarCard.color }}
                      >
                        {toolbarCard.type === 'credit' ? 'CR' : 'DB'}
                      </div>
                      <div>
                        <p className="text-white text-sm font-medium">{toolbarCard.name}</p>
                        <p className="text-xs text-slate-500">
                          {toolbarAccount?.name} • ****{toolbarCard.last_4_digits}
                        </p>
                      </div>
                    </>
                  ) : toolbarAccount ? (
                    <>
                      <ToolbarAccountIcon className="h-5 w-5" style={{ color: toolbarAccount.color }} />
                      <p className="text-white text-sm font-medium">{toolbarAccount.name}</p>
                    </>
                  ) : (
                    <p className="text-slate-500 text-sm">No selection</p>
                  )}
                </div>
              </div>
            </div>

            {/* Question */}
            <p className="text-center text-slate-400 text-sm">
              Which payment method should we use?
            </p>
          </div>

          {/* Actions */}
          <div className="p-4 border-t border-white/[0.06] flex gap-3">
            <button
              onClick={onUseText}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl',
                'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
                'hover:bg-emerald-500/30 transition-colors font-medium'
              )}
            >
              <FileText className="h-4 w-4" />
              Use Text
            </button>
            
            <button
              onClick={onKeepToolbar}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl',
                'bg-blue-500/20 text-blue-400 border border-blue-500/30',
                'hover:bg-blue-500/30 transition-colors font-medium'
              )}
            >
              <Settings className="h-4 w-4" />
              Keep Toolbar
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

