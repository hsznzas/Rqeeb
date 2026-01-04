import { motion, AnimatePresence } from 'framer-motion'
import { Inbox } from 'lucide-react'
import { TransactionItem } from './TransactionItem'
import { useData } from '@/context'

export function TransactionList() {
  const { transactions, removeTransaction } = useData()

  if (transactions.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col items-center justify-center py-16 px-4"
      >
        <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] mb-4">
          <Inbox className="h-10 w-10 text-slate-500" />
        </div>
        <h3 className="text-lg font-medium text-slate-300 mb-1">No transactions yet</h3>
        <p className="text-sm text-slate-500 text-center max-w-xs">
          Paste an SMS, type a note like "Coffee 25 SAR", or describe your transaction below
        </p>
      </motion.div>
    )
  }

  return (
    <div className="space-y-3">
      <AnimatePresence mode="popLayout">
        {transactions.map((transaction, index) => (
          <TransactionItem
            key={transaction.id}
            transaction={transaction}
            index={index}
            onDelete={removeTransaction}
          />
        ))}
      </AnimatePresence>
    </div>
  )
}

