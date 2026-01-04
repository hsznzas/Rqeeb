-- Migration: Transaction Attachments
-- Description: Create table for storing multiple file attachments per transaction

-- Create transaction_attachments table
CREATE TABLE IF NOT EXISTS transaction_attachments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable RLS
ALTER TABLE transaction_attachments ENABLE ROW LEVEL SECURITY;

-- Policies for user access control
CREATE POLICY "Users can view own attachments" ON transaction_attachments 
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own attachments" ON transaction_attachments 
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own attachments" ON transaction_attachments 
  FOR DELETE USING (auth.uid() = user_id);

-- Index for faster lookups by transaction
CREATE INDEX IF NOT EXISTS idx_attachments_transaction ON transaction_attachments(transaction_id);

-- Index for user's attachments
CREATE INDEX IF NOT EXISTS idx_attachments_user ON transaction_attachments(user_id);

-- Comments for documentation
COMMENT ON TABLE transaction_attachments IS 'Stores file attachments (invoices, receipts) for transactions';
COMMENT ON COLUMN transaction_attachments.file_url IS 'URL to file in Supabase Storage';
COMMENT ON COLUMN transaction_attachments.file_type IS 'MIME type of the file (e.g., image/jpeg, application/pdf)';
COMMENT ON COLUMN transaction_attachments.file_size IS 'File size in bytes';

