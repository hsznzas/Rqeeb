-- Rqeeb Database Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- PROFILES TABLE
-- ============================================
-- Stores user profile information
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if any and recreate
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Backfill: Create profiles for any existing users who don't have one
INSERT INTO public.profiles (id, email, full_name)
SELECT id, email, raw_user_meta_data->>'full_name'
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.profiles)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- RAW_LOGS TABLE
-- ============================================
-- Stores raw input data (SMS, notes, etc.) for failed parses
CREATE TABLE IF NOT EXISTS raw_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  image_url TEXT,
  source TEXT DEFAULT 'web_manual' NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable RLS
ALTER TABLE raw_logs ENABLE ROW LEVEL SECURITY;

-- Raw logs policies
CREATE POLICY "Users can view own raw logs"
  ON raw_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own raw logs"
  ON raw_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own raw logs"
  ON raw_logs FOR DELETE
  USING (auth.uid() = user_id);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_raw_logs_user_id ON raw_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_raw_logs_created_at ON raw_logs(created_at DESC);

-- ============================================
-- TRANSACTIONS TABLE
-- ============================================
-- Stores parsed financial transactions
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  currency TEXT DEFAULT 'SAR' NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('in', 'out')),
  category TEXT NOT NULL,
  merchant TEXT,
  transaction_date DATE NOT NULL,
  raw_log_id UUID REFERENCES raw_logs(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable RLS
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Transactions policies
CREATE POLICY "Users can view own transactions"
  ON transactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own transactions"
  ON transactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own transactions"
  ON transactions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own transactions"
  ON transactions FOR DELETE
  USING (auth.uid() = user_id);

-- Indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_direction ON transactions(direction);
CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at DESC);

-- ============================================
-- USEFUL VIEWS
-- ============================================

-- Monthly summary view
CREATE OR REPLACE VIEW monthly_summary AS
SELECT 
  user_id,
  DATE_TRUNC('month', transaction_date) AS month,
  SUM(CASE WHEN direction = 'in' THEN amount ELSE 0 END) AS total_income,
  SUM(CASE WHEN direction = 'out' THEN amount ELSE 0 END) AS total_expenses,
  SUM(CASE WHEN direction = 'in' THEN amount ELSE -amount END) AS net_amount,
  COUNT(*) AS transaction_count
FROM transactions
GROUP BY user_id, DATE_TRUNC('month', transaction_date);

-- Category breakdown view
CREATE OR REPLACE VIEW category_breakdown AS
SELECT 
  user_id,
  DATE_TRUNC('month', transaction_date) AS month,
  category,
  direction,
  SUM(amount) AS total_amount,
  COUNT(*) AS transaction_count
FROM transactions
GROUP BY user_id, DATE_TRUNC('month', transaction_date), category, direction;

-- ============================================
-- FUNCTIONS
-- ============================================

-- Get user's monthly summary
CREATE OR REPLACE FUNCTION get_monthly_summary(
  p_user_id UUID,
  p_year INT DEFAULT EXTRACT(YEAR FROM CURRENT_DATE),
  p_month INT DEFAULT EXTRACT(MONTH FROM CURRENT_DATE)
)
RETURNS TABLE (
  total_income NUMERIC,
  total_expenses NUMERIC,
  net_amount NUMERIC,
  transaction_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(SUM(CASE WHEN direction = 'in' THEN amount ELSE 0 END), 0) AS total_income,
    COALESCE(SUM(CASE WHEN direction = 'out' THEN amount ELSE 0 END), 0) AS total_expenses,
    COALESCE(SUM(CASE WHEN direction = 'in' THEN amount ELSE -amount END), 0) AS net_amount,
    COUNT(*) AS transaction_count
  FROM transactions
  WHERE user_id = p_user_id
    AND EXTRACT(YEAR FROM transaction_date) = p_year
    AND EXTRACT(MONTH FROM transaction_date) = p_month;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
