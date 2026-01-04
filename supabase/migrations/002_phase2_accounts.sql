-- Rqeeb Phase 2 Migration: Accounts, Subscriptions, Transaction Updates
-- Run this in your Supabase SQL Editor

-- ============================================
-- ACCOUNTS TABLE
-- ============================================
-- Stores user's financial accounts (bank, cash, wallet)
CREATE TABLE IF NOT EXISTS accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('bank', 'cash', 'wallet', 'credit_card')),
  balance NUMERIC(14, 2) DEFAULT 0 NOT NULL,
  currency TEXT DEFAULT 'SAR' NOT NULL,
  last_4_digits TEXT,
  is_default BOOLEAN DEFAULT false,
  color TEXT DEFAULT '#10b981',
  icon TEXT DEFAULT 'wallet',
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable RLS
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;

-- Accounts policies
CREATE POLICY "Users can view own accounts"
  ON accounts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own accounts"
  ON accounts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own accounts"
  ON accounts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own accounts"
  ON accounts FOR DELETE
  USING (auth.uid() = user_id);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_accounts_is_default ON accounts(user_id, is_default);

-- Function to ensure only one default account per user
CREATE OR REPLACE FUNCTION ensure_single_default_account()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_default = true THEN
    UPDATE accounts 
    SET is_default = false 
    WHERE user_id = NEW.user_id AND id != NEW.id AND is_default = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_single_default_account ON accounts;
CREATE TRIGGER trigger_single_default_account
  BEFORE INSERT OR UPDATE ON accounts
  FOR EACH ROW EXECUTE FUNCTION ensure_single_default_account();

-- ============================================
-- SUBSCRIPTIONS TABLE
-- ============================================
-- Stores recurring subscriptions
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
  currency TEXT DEFAULT 'SAR' NOT NULL,
  account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  category TEXT DEFAULT 'Bills & Utilities',
  deduction_day INT NOT NULL CHECK (deduction_day >= 1 AND deduction_day <= 31),
  is_active BOOLEAN DEFAULT true,
  icon TEXT DEFAULT 'credit-card',
  color TEXT DEFAULT '#8b5cf6',
  notes TEXT,
  next_deduction_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable RLS
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Subscriptions policies
CREATE POLICY "Users can view own subscriptions"
  ON subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own subscriptions"
  ON subscriptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own subscriptions"
  ON subscriptions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own subscriptions"
  ON subscriptions FOR DELETE
  USING (auth.uid() = user_id);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_active ON subscriptions(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_subscriptions_next_date ON subscriptions(next_deduction_date);

-- Function to calculate next deduction date
CREATE OR REPLACE FUNCTION calculate_next_deduction_date()
RETURNS TRIGGER AS $$
DECLARE
  current_day INT;
  target_day INT;
  next_date DATE;
BEGIN
  current_day := EXTRACT(DAY FROM CURRENT_DATE);
  target_day := NEW.deduction_day;
  
  -- If deduction day has passed this month, schedule for next month
  IF current_day >= target_day THEN
    next_date := DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month' + (target_day - 1) * INTERVAL '1 day';
  ELSE
    next_date := DATE_TRUNC('month', CURRENT_DATE) + (target_day - 1) * INTERVAL '1 day';
  END IF;
  
  -- Handle months with fewer days
  IF EXTRACT(DAY FROM next_date) != target_day THEN
    next_date := (DATE_TRUNC('month', next_date) + INTERVAL '1 month' - INTERVAL '1 day')::DATE;
  END IF;
  
  NEW.next_deduction_date := next_date;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_calc_next_deduction ON subscriptions;
CREATE TRIGGER trigger_calc_next_deduction
  BEFORE INSERT OR UPDATE OF deduction_day ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION calculate_next_deduction_date();

-- ============================================
-- UPDATE TRANSACTIONS TABLE
-- ============================================
-- Add new columns for multi-currency and account support

-- Add account_id (nullable for backwards compatibility)
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES accounts(id) ON DELETE SET NULL;

-- Add original amount and currency for foreign transactions
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS original_amount NUMERIC(12, 2);

ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS original_currency TEXT;

-- Add conversion rate
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS conversion_rate NUMERIC(10, 6);

-- Add notes field
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Index for account queries
CREATE INDEX IF NOT EXISTS idx_transactions_account_id ON transactions(account_id);

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to update account balance after transaction
CREATE OR REPLACE FUNCTION update_account_balance()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.account_id IS NOT NULL THEN
    -- Deduct for 'out', add for 'in'
    IF NEW.direction = 'out' THEN
      UPDATE accounts SET balance = balance - NEW.amount WHERE id = NEW.account_id;
    ELSE
      UPDATE accounts SET balance = balance + NEW.amount WHERE id = NEW.account_id;
    END IF;
  ELSIF TG_OP = 'DELETE' AND OLD.account_id IS NOT NULL THEN
    -- Reverse the transaction
    IF OLD.direction = 'out' THEN
      UPDATE accounts SET balance = balance + OLD.amount WHERE id = OLD.account_id;
    ELSE
      UPDATE accounts SET balance = balance - OLD.amount WHERE id = OLD.account_id;
    END IF;
  ELSIF TG_OP = 'UPDATE' AND OLD.account_id IS NOT NULL THEN
    -- Reverse old transaction
    IF OLD.direction = 'out' THEN
      UPDATE accounts SET balance = balance + OLD.amount WHERE id = OLD.account_id;
    ELSE
      UPDATE accounts SET balance = balance - OLD.amount WHERE id = OLD.account_id;
    END IF;
    -- Apply new transaction
    IF NEW.account_id IS NOT NULL THEN
      IF NEW.direction = 'out' THEN
        UPDATE accounts SET balance = balance - NEW.amount WHERE id = NEW.account_id;
      ELSE
        UPDATE accounts SET balance = balance + NEW.amount WHERE id = NEW.account_id;
      END IF;
    END IF;
  END IF;
  
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_account_balance ON transactions;
CREATE TRIGGER trigger_update_account_balance
  AFTER INSERT OR UPDATE OR DELETE ON transactions
  FOR EACH ROW EXECUTE FUNCTION update_account_balance();

-- ============================================
-- VIEWS
-- ============================================

-- Account summary view
CREATE OR REPLACE VIEW account_summary AS
SELECT 
  a.id,
  a.user_id,
  a.name,
  a.type,
  a.balance,
  a.currency,
  a.is_default,
  a.color,
  COUNT(t.id) AS transaction_count,
  COALESCE(SUM(CASE WHEN t.direction = 'out' THEN t.amount ELSE 0 END), 0) AS total_spent,
  COALESCE(SUM(CASE WHEN t.direction = 'in' THEN t.amount ELSE 0 END), 0) AS total_received
FROM accounts a
LEFT JOIN transactions t ON t.account_id = a.id
GROUP BY a.id;

-- Upcoming subscriptions view
CREATE OR REPLACE VIEW upcoming_subscriptions AS
SELECT 
  s.*,
  a.name AS account_name,
  a.last_4_digits AS account_last_4,
  s.next_deduction_date - CURRENT_DATE AS days_until_deduction
FROM subscriptions s
LEFT JOIN accounts a ON s.account_id = a.id
WHERE s.is_active = true
ORDER BY s.next_deduction_date ASC;

