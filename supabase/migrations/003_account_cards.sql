-- Rqeeb Phase 2.1 Migration: Account Cards (Parent-Child Relationship)
-- This migration adds a cards table linked to accounts (banks)
-- Run this in your Supabase SQL Editor

-- ============================================
-- ACCOUNT CARDS TABLE
-- ============================================
-- Stores cards (credit/debit) linked to bank accounts
CREATE TABLE IF NOT EXISTS account_cards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  last_4_digits TEXT NOT NULL CHECK (LENGTH(last_4_digits) = 4),
  type TEXT NOT NULL CHECK (type IN ('credit', 'debit')),
  is_default BOOLEAN DEFAULT false,
  color TEXT DEFAULT '#3b82f6',
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable RLS
ALTER TABLE account_cards ENABLE ROW LEVEL SECURITY;

-- Account cards policies
CREATE POLICY "Users can view own cards"
  ON account_cards FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own cards"
  ON account_cards FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own cards"
  ON account_cards FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own cards"
  ON account_cards FOR DELETE
  USING (auth.uid() = user_id);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_account_cards_user_id ON account_cards(user_id);
CREATE INDEX IF NOT EXISTS idx_account_cards_account_id ON account_cards(account_id);
CREATE INDEX IF NOT EXISTS idx_account_cards_last_4 ON account_cards(last_4_digits);

-- Function to ensure only one default card per account
CREATE OR REPLACE FUNCTION ensure_single_default_card()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_default = true THEN
    UPDATE account_cards 
    SET is_default = false 
    WHERE account_id = NEW.account_id AND id != NEW.id AND is_default = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_single_default_card ON account_cards;
CREATE TRIGGER trigger_single_default_card
  BEFORE INSERT OR UPDATE ON account_cards
  FOR EACH ROW EXECUTE FUNCTION ensure_single_default_card();

-- ============================================
-- UPDATE TRANSACTIONS TABLE
-- ============================================
-- Add card_id for transactions made with specific cards
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS card_id UUID REFERENCES account_cards(id) ON DELETE SET NULL;

-- Index for card queries
CREATE INDEX IF NOT EXISTS idx_transactions_card_id ON transactions(card_id);

-- ============================================
-- UPDATE ACCOUNTS TABLE
-- ============================================
-- Remove 'credit_card' from account types constraint
-- Note: If there's an existing CHECK constraint, we need to drop and recreate it

-- First, let's check if the constraint exists and update it
DO $$ 
BEGIN
  -- Drop the old constraint if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'accounts_type_check' 
    AND table_name = 'accounts'
  ) THEN
    ALTER TABLE accounts DROP CONSTRAINT accounts_type_check;
  END IF;
  
  -- Add the new constraint without 'credit_card'
  ALTER TABLE accounts ADD CONSTRAINT accounts_type_check 
    CHECK (type IN ('bank', 'cash', 'wallet'));
    
EXCEPTION
  WHEN others THEN
    -- If constraint doesn't exist by that name, try to add anyway
    -- This will fail silently if there's a conflict
    RAISE NOTICE 'Could not update type constraint: %', SQLERRM;
END $$;

-- Migrate existing credit_card accounts to 'wallet' type
-- (You can manually adjust these after migration if needed)
UPDATE accounts SET type = 'wallet' WHERE type = 'credit_card';

-- We'll keep last_4_digits on accounts for backwards compatibility
-- but new cards should use the account_cards table

-- ============================================
-- HELPER VIEWS
-- ============================================

-- Cards with parent account info
CREATE OR REPLACE VIEW cards_with_account AS
SELECT 
  c.id,
  c.user_id,
  c.account_id,
  c.name AS card_name,
  c.last_4_digits,
  c.type AS card_type,
  c.is_default AS card_is_default,
  c.color AS card_color,
  a.name AS account_name,
  a.type AS account_type,
  a.balance AS account_balance,
  a.currency AS account_currency,
  a.color AS account_color
FROM account_cards c
JOIN accounts a ON c.account_id = a.id;

-- Account summary with cards count
CREATE OR REPLACE VIEW account_with_cards_summary AS
SELECT 
  a.*,
  COALESCE(COUNT(c.id), 0) AS cards_count,
  ARRAY_AGG(
    CASE WHEN c.id IS NOT NULL THEN
      jsonb_build_object(
        'id', c.id,
        'name', c.name,
        'last_4_digits', c.last_4_digits,
        'type', c.type,
        'is_default', c.is_default,
        'color', c.color
      )
    ELSE NULL END
  ) FILTER (WHERE c.id IS NOT NULL) AS cards
FROM accounts a
LEFT JOIN account_cards c ON a.id = c.account_id
GROUP BY a.id;

