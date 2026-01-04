-- Migration: Add transaction details columns
-- Description: Adds description, logo_url, and transaction_time for detailed transaction tracking

-- Add description column for user notes
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS description TEXT;

-- Add logo_url column for custom icons/logos (can be URL or emoji)
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- Add transaction_time column for full timestamp with time
-- This stores the exact time of the transaction (ISO 8601)
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS transaction_time TIMESTAMPTZ;

-- Create index on transaction_time for efficient queries
CREATE INDEX IF NOT EXISTS idx_transactions_transaction_time ON transactions(transaction_time);

-- Comment for documentation
COMMENT ON COLUMN transactions.description IS 'User-provided description or notes about the transaction';
COMMENT ON COLUMN transactions.logo_url IS 'Custom logo URL or emoji for the transaction';
COMMENT ON COLUMN transactions.transaction_time IS 'Full timestamp of the transaction (ISO 8601 format)';

