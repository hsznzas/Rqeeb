-- Migration: Smart Toolbar Features
-- Description: Adds beneficiaries lookup table and reimbursement tracking

-- Create beneficiaries lookup table
CREATE TABLE IF NOT EXISTS beneficiaries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#6366f1',
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable RLS on beneficiaries
ALTER TABLE beneficiaries ENABLE ROW LEVEL SECURITY;

-- RLS Policies for beneficiaries
CREATE POLICY "Users can view own beneficiaries" ON beneficiaries 
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own beneficiaries" ON beneficiaries 
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own beneficiaries" ON beneficiaries 
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own beneficiaries" ON beneficiaries 
  FOR DELETE USING (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_beneficiaries_user_id ON beneficiaries(user_id);

-- Add reimbursement columns to transactions
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS beneficiary_id UUID REFERENCES beneficiaries(id) ON DELETE SET NULL;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS is_reimbursable BOOLEAN DEFAULT false;

-- Create index on beneficiary_id for faster joins
CREATE INDEX IF NOT EXISTS idx_transactions_beneficiary_id ON transactions(beneficiary_id);

-- Comments for documentation
COMMENT ON TABLE beneficiaries IS 'Lookup table for reimbursement beneficiaries (companies, people who reimburse expenses)';
COMMENT ON COLUMN transactions.beneficiary_id IS 'Reference to the beneficiary who will reimburse this expense';
COMMENT ON COLUMN transactions.is_reimbursable IS 'Whether this transaction is marked for reimbursement';

