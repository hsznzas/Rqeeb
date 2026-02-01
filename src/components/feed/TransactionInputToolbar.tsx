/**
 * Transaction Input Toolbar
 * 
 * Smart toolbar for transaction input with parent-child Bank/Card logic,
 * currency selection, and reimbursement tracking.
 */

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Building2,
  CreditCard,
  Banknote,
  Smartphone,
  ChevronDown,
  Check,
  RefreshCw,
  User,
  Plus,
  X,
  Star,
  Lock,
  Unlock
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { CURRENCIES, type Currency } from '@/lib/currency'
import type { Account, AccountCard, Beneficiary } from '@/types/database'

// Account icon mapping
const accountIcons: Record<string, React.ElementType> = {
  'building-2': Building2,
  'banknote': Banknote,
  'smartphone': Smartphone,
  'credit-card': CreditCard,
}

export interface ToolbarState {
  accountId: string | null
  cardId: string | null
  currency: Currency
  isReimbursable: boolean
  beneficiaryId: string | null
  lockAccountCard: boolean  // When true, force toolbar account/card for all transactions in bulk paste
}

interface TransactionInputToolbarProps {
  accounts: Account[]
  cards: AccountCard[]
  beneficiaries: Beneficiary[]
  value: ToolbarState
  onChange: (state: ToolbarState) => void
  onAddBeneficiary?: (name: string) => Promise<Beneficiary | null>
  disabled?: boolean
}

export function TransactionInputToolbar({
  accounts,
  cards,
  beneficiaries,
  value,
  onChange,
  onAddBeneficiary,
  disabled = false
}: TransactionInputToolbarProps) {
  const [showAccountPicker, setShowAccountPicker] = useState(false)
  const [showCardPicker, setShowCardPicker] = useState(false)
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false)
  const [showBeneficiaryPicker, setShowBeneficiaryPicker] = useState(false)
  const [newBeneficiaryName, setNewBeneficiaryName] = useState('')
  const [isAddingBeneficiary, setIsAddingBeneficiary] = useState(false)
  const [showMoreOptions, setShowMoreOptions] = useState(false)

  // Get selected items
  const selectedAccount = accounts.find(a => a.id === value.accountId)
  const selectedCard = cards.find(c => c.id === value.cardId)
  const selectedBeneficiary = beneficiaries.find(b => b.id === value.beneficiaryId)

  // Filter cards by selected account
  const filteredCards = value.accountId 
    ? cards.filter(c => c.account_id === value.accountId)
    : cards

  // Close all dropdowns
  const closeAll = useCallback(() => {
    setShowAccountPicker(false)
    setShowCardPicker(false)
    setShowCurrencyPicker(false)
    setShowBeneficiaryPicker(false)
  }, [])

  // Handle account selection - Auto-select single card and currency
  const handleAccountSelect = useCallback((accountId: string | null) => {
    if (accountId) {
      const account = accounts.find(a => a.id === accountId)
      const accountCards = cards.filter(c => c.account_id === accountId)
      
      // Auto-select card if only one exists for this account
      const autoCardId = accountCards.length === 1 ? accountCards[0].id : null
      
      // Check if current card belongs to new account
      const currentCardValid = value.cardId && 
        cards.find(c => c.id === value.cardId)?.account_id === accountId
      
      onChange({
        ...value,
        accountId,
        cardId: currentCardValid ? value.cardId : autoCardId,
        currency: (account?.currency as Currency) || value.currency
      })
    } else {
      onChange({ ...value, accountId: null, cardId: null })
    }
    setShowAccountPicker(false)
  }, [value, accounts, cards, onChange])

  // Handle card selection - CRITICAL: Auto-update parent account
  const handleCardSelect = useCallback((cardId: string | null) => {
    if (cardId) {
      const card = cards.find(c => c.id === cardId)
      if (card) {
        // Auto-switch bank to card's parent
        onChange({
          ...value,
          accountId: card.account_id,
          cardId: card.id
        })
      }
    } else {
      onChange({ ...value, cardId: null })
    }
    setShowCardPicker(false)
  }, [value, cards, onChange])

  // Handle currency selection
  const handleCurrencySelect = useCallback((currency: Currency) => {
    onChange({ ...value, currency })
    setShowCurrencyPicker(false)
  }, [value, onChange])

  // Handle reimbursement toggle
  const handleReimbursableToggle = useCallback(() => {
    const newIsReimbursable = !value.isReimbursable
    onChange({
      ...value,
      isReimbursable: newIsReimbursable,
      beneficiaryId: newIsReimbursable ? value.beneficiaryId : null
    })
  }, [value, onChange])

  // Handle lock account/card toggle
  const handleLockToggle = useCallback(() => {
    onChange({
      ...value,
      lockAccountCard: !value.lockAccountCard
    })
  }, [value, onChange])

  // Handle beneficiary selection
  const handleBeneficiarySelect = useCallback((beneficiaryId: string | null) => {
    onChange({ ...value, beneficiaryId })
    setShowBeneficiaryPicker(false)
  }, [value, onChange])

  // Handle adding new beneficiary
  const handleAddBeneficiary = useCallback(async () => {
    if (!newBeneficiaryName.trim() || !onAddBeneficiary) return
    
    setIsAddingBeneficiary(true)
    try {
      const newBeneficiary = await onAddBeneficiary(newBeneficiaryName.trim())
      if (newBeneficiary) {
        onChange({ ...value, beneficiaryId: newBeneficiary.id })
        setNewBeneficiaryName('')
        setShowBeneficiaryPicker(false)
      }
    } finally {
      setIsAddingBeneficiary(false)
    }
  }, [newBeneficiaryName, onAddBeneficiary, value, onChange])

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = () => closeAll()
    if (showAccountPicker || showCardPicker || showCurrencyPicker || showBeneficiaryPicker) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [showAccountPicker, showCardPicker, showCurrencyPicker, showBeneficiaryPicker, closeAll])

  const AccountIcon = selectedAccount ? (accountIcons[selectedAccount.icon] || CreditCard) : Building2

  return (
    <div className={cn(
      'flex flex-wrap items-center gap-2 py-2',
      disabled && 'opacity-50 pointer-events-none'
    )}>
      {/* Bank/Account Selector */}
      <div className="relative">
        <button
          onClick={(e) => { e.stopPropagation(); closeAll(); setShowAccountPicker(!showAccountPicker) }}
          className={cn(
            'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm',
            'bg-white/[0.05] border border-white/[0.08]',
            'hover:bg-white/[0.08] transition-colors',
            selectedAccount ? 'text-white' : 'text-slate-500'
          )}
        >
          <AccountIcon className="h-4 w-4" style={{ color: selectedAccount?.color }} />
          <span className="max-w-[100px] truncate">
            {selectedAccount?.name || 'Account'}
          </span>
          <ChevronDown className="h-3 w-3 text-slate-500" />
        </button>

        <AnimatePresence>
          {showAccountPicker && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              onClick={(e) => e.stopPropagation()}
              className="absolute left-0 bottom-full mb-1 w-52 p-2 rounded-xl bg-slate-900 border border-white/10 shadow-xl z-50 max-h-60 overflow-y-auto"
            >
              {/* None option */}
              <button
                onClick={() => handleAccountSelect(null)}
                className={cn(
                  'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-sm',
                  'hover:bg-white/[0.05] transition-colors',
                  !value.accountId ? 'text-emerald-400' : 'text-slate-400'
                )}
              >
                <X className="h-4 w-4" />
                <span>No account</span>
                {!value.accountId && <Check className="h-4 w-4 ml-auto" />}
              </button>

              {accounts.map(account => {
                const Icon = accountIcons[account.icon] || CreditCard
                return (
                  <button
                    key={account.id}
                    onClick={() => handleAccountSelect(account.id)}
                    className={cn(
                      'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-sm',
                      'hover:bg-white/[0.05] transition-colors',
                      value.accountId === account.id ? 'text-emerald-400' : 'text-slate-400'
                    )}
                  >
                    <Icon className="h-4 w-4" style={{ color: account.color }} />
                    <span className="flex-1 truncate">{account.name}</span>
                    {account.is_default && <Star className="h-3 w-3 text-amber-400 fill-amber-400" />}
                    {value.accountId === account.id && <Check className="h-4 w-4" />}
                  </button>
                )
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Card Selector */}
      <div className="relative">
        <button
          onClick={(e) => { e.stopPropagation(); closeAll(); setShowCardPicker(!showCardPicker) }}
          className={cn(
            'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm',
            'bg-white/[0.05] border border-white/[0.08]',
            'hover:bg-white/[0.08] transition-colors',
            selectedCard ? 'text-white' : 'text-slate-500'
          )}
        >
          <CreditCard className="h-4 w-4" style={{ color: selectedCard?.color }} />
          <span className="max-w-[100px] truncate">
            {selectedCard ? `****${selectedCard.last_4_digits}` : 'Card'}
          </span>
          <ChevronDown className="h-3 w-3 text-slate-500" />
        </button>

        <AnimatePresence>
          {showCardPicker && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              onClick={(e) => e.stopPropagation()}
              className="absolute left-0 bottom-full mb-1 w-56 p-2 rounded-xl bg-slate-900 border border-white/10 shadow-xl z-50 max-h-60 overflow-y-auto"
            >
              {/* None option */}
              <button
                onClick={() => handleCardSelect(null)}
                className={cn(
                  'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-sm',
                  'hover:bg-white/[0.05] transition-colors',
                  !value.cardId ? 'text-emerald-400' : 'text-slate-400'
                )}
              >
                <Banknote className="h-4 w-4" />
                <span>No card (Cash/Direct)</span>
                {!value.cardId && <Check className="h-4 w-4 ml-auto" />}
              </button>

              {filteredCards.length === 0 && value.accountId && (
                <p className="px-3 py-2 text-xs text-slate-500">No cards for this account</p>
              )}

              {(value.accountId ? filteredCards : cards).map(card => {
                const parentAccount = accounts.find(a => a.id === card.account_id)
                return (
                  <button
                    key={card.id}
                    onClick={() => handleCardSelect(card.id)}
                    className={cn(
                      'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-sm',
                      'hover:bg-white/[0.05] transition-colors',
                      value.cardId === card.id ? 'text-emerald-400' : 'text-slate-400'
                    )}
                  >
                    <div 
                      className="w-8 h-5 rounded flex items-center justify-center text-[8px] font-bold text-white"
                      style={{ backgroundColor: card.color }}
                    >
                      {card.type === 'credit' ? 'CR' : 'DB'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="truncate">{card.name}</div>
                      {!value.accountId && parentAccount && (
                        <div className="text-xs text-slate-600 truncate">{parentAccount.name}</div>
                      )}
                    </div>
                    <span className="text-slate-600">****{card.last_4_digits}</span>
                    {value.cardId === card.id && <Check className="h-4 w-4" />}
                  </button>
                )
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Currency Badge (always visible, compact) */}
      <button
        onClick={(e) => { e.stopPropagation(); closeAll(); setShowCurrencyPicker(!showCurrencyPicker) }}
        className={cn(
          'flex items-center gap-1 px-2 py-1.5 rounded-lg text-sm',
          'bg-white/[0.05] border border-white/[0.08]',
          'hover:bg-white/[0.08] transition-colors text-white'
        )}
      >
        <span>{CURRENCIES[value.currency]?.flag}</span>
        <span className="text-xs">{value.currency}</span>
      </button>

      <AnimatePresence>
        {showCurrencyPicker && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            onClick={(e) => e.stopPropagation()}
            className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1 w-44 p-2 rounded-xl bg-slate-900 border border-white/10 shadow-xl z-50 max-h-60 overflow-y-auto"
          >
            {Object.entries(CURRENCIES).map(([code, { flag }]) => (
              <button
                key={code}
                onClick={() => handleCurrencySelect(code as Currency)}
                className={cn(
                  'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-sm',
                  'hover:bg-white/[0.05] transition-colors',
                  value.currency === code ? 'text-emerald-400' : 'text-slate-400'
                )}
              >
                <span>{flag}</span>
                <span className="flex-1">{code}</span>
                {value.currency === code && <Check className="h-4 w-4" />}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* More Options Toggle */}
      <button
        onClick={() => setShowMoreOptions(!showMoreOptions)}
        className={cn(
          'flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs',
          'border transition-colors',
          showMoreOptions || value.isReimbursable || value.lockAccountCard
            ? 'bg-white/[0.08] border-white/[0.15] text-white'
            : 'bg-white/[0.03] border-white/[0.06] text-slate-500 hover:bg-white/[0.05]'
        )}
      >
        <ChevronDown className={cn("h-3 w-3 transition-transform", showMoreOptions && "rotate-180")} />
        <span>More</span>
      </button>

      {/* Expanded Options */}
      <AnimatePresence>
        {showMoreOptions && (
          <motion.div
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: 'auto' }}
            exit={{ opacity: 0, width: 0 }}
            className="flex items-center gap-1.5 overflow-hidden"
          >
            {/* Lock Toggle */}
            <button
              onClick={handleLockToggle}
              title={value.lockAccountCard 
                ? "Lock ON: All transactions use selected account/card" 
                : "Lock OFF: AI will detect accounts from text"}
              className={cn(
                'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm',
                'border transition-colors',
                value.lockAccountCard
                  ? 'bg-blue-500/20 border-blue-500/30 text-blue-400'
                  : 'bg-white/[0.05] border-white/[0.08] text-slate-500 hover:bg-white/[0.08]'
              )}
            >
              {value.lockAccountCard ? (
                <Lock className="h-3.5 w-3.5" />
              ) : (
                <Unlock className="h-3.5 w-3.5" />
              )}
            </button>

            {/* Reimbursement Toggle */}
            <button
              onClick={handleReimbursableToggle}
              className={cn(
                'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm',
                'border transition-colors',
                value.isReimbursable
                  ? 'bg-amber-500/20 border-amber-500/30 text-amber-400'
                  : 'bg-white/[0.05] border-white/[0.08] text-slate-500 hover:bg-white/[0.08]'
              )}
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Beneficiary Selector (Conditional) */}
      <AnimatePresence>
        {value.isReimbursable && (
          <motion.div
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: 'auto' }}
            exit={{ opacity: 0, width: 0 }}
            className="relative overflow-hidden"
          >
            <button
              onClick={(e) => { e.stopPropagation(); closeAll(); setShowBeneficiaryPicker(!showBeneficiaryPicker) }}
              className={cn(
                'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm whitespace-nowrap',
                'bg-amber-500/10 border border-amber-500/20',
                'hover:bg-amber-500/20 transition-colors',
                selectedBeneficiary ? 'text-amber-300' : 'text-amber-500/70'
              )}
            >
              <User className="h-4 w-4" />
              <span className="max-w-[100px] truncate">
                {selectedBeneficiary?.name || 'Who?'}
              </span>
              <ChevronDown className="h-3 w-3" />
            </button>

            <AnimatePresence>
              {showBeneficiaryPicker && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  onClick={(e) => e.stopPropagation()}
                  className="absolute left-0 bottom-full mb-1 w-56 p-2 rounded-xl bg-slate-900 border border-white/10 shadow-xl z-50"
                >
                  {/* Add new beneficiary */}
                  <div className="flex items-center gap-2 px-2 py-1 mb-2">
                    <input
                      type="text"
                      value={newBeneficiaryName}
                      onChange={(e) => setNewBeneficiaryName(e.target.value)}
                      placeholder="Add new..."
                      className="flex-1 bg-white/[0.05] border border-white/[0.08] rounded-lg px-2 py-1.5 text-sm text-white placeholder:text-slate-600 outline-none focus:border-amber-500/50"
                      onKeyDown={(e) => e.key === 'Enter' && handleAddBeneficiary()}
                    />
                    <button
                      onClick={handleAddBeneficiary}
                      disabled={!newBeneficiaryName.trim() || isAddingBeneficiary}
                      className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 disabled:opacity-50"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="max-h-40 overflow-y-auto">
                    {/* None option */}
                    <button
                      onClick={() => handleBeneficiarySelect(null)}
                      className={cn(
                        'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-sm',
                        'hover:bg-white/[0.05] transition-colors',
                        !value.beneficiaryId ? 'text-emerald-400' : 'text-slate-400'
                      )}
                    >
                      <X className="h-4 w-4" />
                      <span>None</span>
                      {!value.beneficiaryId && <Check className="h-4 w-4 ml-auto" />}
                    </button>

                    {beneficiaries.map(beneficiary => (
                      <button
                        key={beneficiary.id}
                        onClick={() => handleBeneficiarySelect(beneficiary.id)}
                        className={cn(
                          'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-sm',
                          'hover:bg-white/[0.05] transition-colors',
                          value.beneficiaryId === beneficiary.id ? 'text-emerald-400' : 'text-slate-400'
                        )}
                      >
                        <div 
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: beneficiary.color }}
                        />
                        <span className="flex-1 truncate">{beneficiary.name}</span>
                        {value.beneficiaryId === beneficiary.id && <Check className="h-4 w-4" />}
                      </button>
                    ))}

                    {beneficiaries.length === 0 && (
                      <p className="px-3 py-2 text-xs text-slate-500">
                        No beneficiaries yet. Add one above.
                      </p>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// Default toolbar state
export function getDefaultToolbarState(
  accounts: Account[],
  defaultCurrency: Currency
): ToolbarState {
  const defaultAccount = accounts.find(a => a.is_default)
  return {
    accountId: defaultAccount?.id || null,
    cardId: null,
    currency: defaultCurrency,
    isReimbursable: false,
    beneficiaryId: null,
    lockAccountCard: false,  // Default OFF - let AI match accounts from text
  }
}

