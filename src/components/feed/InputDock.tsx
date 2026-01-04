import { useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, Clipboard, AlertCircle, CheckCircle, X, Sparkles, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useData } from '@/context'

export function InputDock() {
  const [input, setInput] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error'
    message: string
  } | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const { addTransactionFromText } = useData()

  // Auto-resize textarea
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
    setFeedback(null)
    
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`
    }
  }, [])

  // Handle paste from clipboard
  const handlePaste = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText()
      setInput(text)
      setFeedback(null)
      
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.style.height = 'auto'
          textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`
        }
      }, 0)
    } catch {
      setFeedback({ type: 'error', message: 'Could not access clipboard' })
    }
  }, [])

  // Handle submit
  const handleSubmit = useCallback(async () => {
    if (!input.trim() || isSubmitting) return

    setIsSubmitting(true)
    setFeedback(null)

    try {
      const result = await addTransactionFromText(input)
      
      if (result.success) {
        setInput('')
        setFeedback({ type: 'success', message: 'Transaction added!' })
        
        if (textareaRef.current) {
          textareaRef.current.style.height = 'auto'
        }
        
        setTimeout(() => setFeedback(null), 2000)
      } else {
        setFeedback({ type: 'error', message: result.error || 'Failed to add transaction' })
      }
    } catch {
      setFeedback({ type: 'error', message: 'Something went wrong' })
    } finally {
      setIsSubmitting(false)
    }
  }, [input, isSubmitting, addTransactionFromText])

  // Handle keyboard submit
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }, [handleSubmit])

  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: 'easeOut', delay: 0.3 }}
      className="fixed bottom-0 left-0 right-0 z-50"
    >
      {/* Gradient fade overlay */}
      <div className="absolute inset-x-0 -top-20 h-20 bg-gradient-to-t from-slate-950 to-transparent pointer-events-none" />
      
      <div className="relative bg-slate-950/80 backdrop-blur-xl border-t border-white/[0.06]">
        <div className="max-w-2xl mx-auto px-4 py-4">
          {/* Feedback Message */}
          <AnimatePresence>
            {feedback && (
              <motion.div
                initial={{ opacity: 0, y: 10, height: 0 }}
                animate={{ opacity: 1, y: 0, height: 'auto' }}
                exit={{ opacity: 0, y: 10, height: 0 }}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-xl mb-3 text-sm',
                  feedback.type === 'success' 
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                    : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                )}
              >
                {feedback.type === 'success' ? (
                  <CheckCircle className="h-4 w-4 shrink-0" />
                ) : (
                  <AlertCircle className="h-4 w-4 shrink-0" />
                )}
                <span className="flex-1">{feedback.message}</span>
                <button 
                  onClick={() => setFeedback(null)}
                  className="p-1 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Input Area */}
          <div className={cn(
            'relative flex items-end gap-2 p-2 rounded-2xl',
            'bg-white/[0.05] border border-white/[0.08]',
            'focus-within:border-emerald-500/30 focus-within:bg-white/[0.07]',
            'transition-all duration-200'
          )}>
            {/* Paste Button */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handlePaste}
              className={cn(
                'shrink-0 p-3 rounded-xl',
                'bg-white/[0.05] hover:bg-white/[0.10]',
                'text-slate-400 hover:text-white',
                'transition-all duration-200'
              )}
              title="Paste from clipboard"
            >
              <Clipboard className="h-5 w-5" />
            </motion.button>

            {/* AI Indicator */}
            <div className="shrink-0 p-3 rounded-xl bg-gradient-to-br from-emerald-500/20 to-amber-500/20">
              <Sparkles className="h-5 w-5 text-emerald-400" />
            </div>

            {/* Text Input */}
            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Type or paste: 'Coffee 25 SAR', bank SMS..."
              rows={1}
              className={cn(
                'flex-1 bg-transparent border-none resize-none',
                'text-base text-white placeholder:text-slate-500',
                'py-3 px-2 max-h-[150px]',
                'focus:outline-none'
              )}
            />

            {/* Send Button */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleSubmit}
              disabled={!input.trim() || isSubmitting}
              className={cn(
                'shrink-0 p-3 rounded-xl',
                'transition-all duration-200',
                input.trim() 
                  ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-glow-income' 
                  : 'bg-white/[0.05] text-slate-500 cursor-not-allowed'
              )}
            >
              {isSubmitting ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}
            </motion.button>
          </div>

          {/* Hint Text */}
          <p className="text-center text-xs text-slate-600 mt-2">
            Press <kbd className="px-1.5 py-0.5 rounded bg-white/[0.05] text-slate-500">Enter</kbd> to send
          </p>
        </div>
      </div>
    </motion.div>
  )
}
