/**
 * CSV Question Modal
 * 
 * Displays AI's clarifying questions during CSV import
 * and allows user to respond with options or custom text.
 */

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  HelpCircle,
  X,
  Send,
  ChevronRight,
  Loader2
} from 'lucide-react'
import { cn } from '@/lib/utils'

export interface CSVQuestion {
  question: string
  context: string
  options: string[]
  allowCustom: boolean
}

interface CSVQuestionModalProps {
  isOpen: boolean
  question: CSVQuestion
  onAnswer: (answer: string) => void
  onSkip: () => void
  onCancel: () => void
  isLoading?: boolean
}

export function CSVQuestionModal({
  isOpen,
  question,
  onAnswer,
  onSkip,
  onCancel,
  isLoading = false
}: CSVQuestionModalProps) {
  const [customAnswer, setCustomAnswer] = useState('')

  const handleOptionClick = (option: string) => {
    if (!isLoading) {
      onAnswer(option)
    }
  }

  const handleCustomSubmit = () => {
    if (customAnswer.trim() && !isLoading) {
      onAnswer(customAnswer.trim())
      setCustomAnswer('')
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleCustomSubmit()
    }
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
        onClick={onCancel}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="w-full max-w-lg bg-slate-900 rounded-2xl border border-white/10 overflow-hidden shadow-2xl"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-white/[0.06]">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-amber-500/20">
                <HelpCircle className="h-5 w-5 text-amber-400" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Quick Question</h2>
                <p className="text-xs text-slate-500">Help me understand your data</p>
              </div>
            </div>
            <button
              onClick={onCancel}
              disabled={isLoading}
              className="p-2 rounded-lg hover:bg-white/10 text-slate-400 transition-colors disabled:opacity-50"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-4">
            {/* Question */}
            <div className="mb-4">
              <p className="text-white text-base leading-relaxed">
                {question.question}
              </p>
              {question.context && (
                <p className="mt-2 text-sm text-slate-400">
                  {question.context}
                </p>
              )}
            </div>

            {/* Options */}
            {question.options.length > 0 && (
              <div className="space-y-2 mb-4">
                {question.options.map((option, index) => (
                  <button
                    key={index}
                    onClick={() => handleOptionClick(option)}
                    disabled={isLoading}
                    className={cn(
                      'w-full flex items-center justify-between px-4 py-3 rounded-xl',
                      'bg-white/[0.05] border border-white/[0.08]',
                      'hover:bg-white/[0.08] hover:border-white/[0.15]',
                      'text-left text-white transition-all',
                      'disabled:opacity-50 disabled:cursor-not-allowed'
                    )}
                  >
                    <span>{option}</span>
                    <ChevronRight className="h-4 w-4 text-slate-500" />
                  </button>
                ))}
              </div>
            )}

            {/* Custom Answer */}
            {question.allowCustom && (
              <div className="mt-4">
                <p className="text-xs text-slate-500 mb-2">Or type your answer:</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customAnswer}
                    onChange={(e) => setCustomAnswer(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type your response..."
                    disabled={isLoading}
                    className={cn(
                      'flex-1 px-4 py-3 rounded-xl',
                      'bg-white/[0.05] border border-white/[0.08]',
                      'text-white placeholder:text-slate-600',
                      'focus:outline-none focus:border-amber-500/50',
                      'disabled:opacity-50'
                    )}
                  />
                  <button
                    onClick={handleCustomSubmit}
                    disabled={!customAnswer.trim() || isLoading}
                    className={cn(
                      'px-4 py-3 rounded-xl transition-all',
                      customAnswer.trim() && !isLoading
                        ? 'bg-amber-500 text-white hover:bg-amber-600'
                        : 'bg-white/[0.05] text-slate-500 cursor-not-allowed'
                    )}
                  >
                    {isLoading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <Send className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-4 border-t border-white/[0.06] bg-white/[0.02]">
            <button
              onClick={onSkip}
              disabled={isLoading}
              className="px-4 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/[0.05] transition-all disabled:opacity-50"
            >
              Skip (use defaults)
            </button>
            <button
              onClick={onCancel}
              disabled={isLoading}
              className="px-4 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/[0.05] transition-all disabled:opacity-50"
            >
              Cancel Import
            </button>
          </div>

          {/* Loading Overlay */}
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-900/80">
              <div className="flex items-center gap-3">
                <Loader2 className="h-6 w-6 text-amber-400 animate-spin" />
                <span className="text-white">Processing...</span>
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
