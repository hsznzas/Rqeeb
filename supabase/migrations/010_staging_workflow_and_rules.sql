-- Migration: Staging Workflow, Beneficiary Enhancements, and Category Rules
-- Description: Adds staging transactions for review workflow, enhances beneficiaries,
--              and adds category rules for AI memory/learning

-- ============================================
-- STAGING TRANSACTIONS TABLE
-- ============================================
-- Stores transactions pending review before being finalized
CREATE TABLE IF NOT EXISTS staging_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  raw_text TEXT NOT NULL,
  extracted_data JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  csv_source TEXT,
  potential_match_id UUID REFERENCES transactions(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable RLS on staging_transactions
ALTER TABLE staging_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for staging_transactions
CREATE POLICY "Users can view own staging transactions"
  ON staging_transactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own staging transactions"
  ON staging_transactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own staging transactions"
  ON staging_transactions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own staging transactions"
  ON staging_transactions FOR DELETE
  USING (auth.uid() = user_id);

-- Indexes for staging_transactions
CREATE INDEX IF NOT EXISTS idx_staging_transactions_user_id ON staging_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_staging_transactions_status ON staging_transactions(status);
CREATE INDEX IF NOT EXISTS idx_staging_transactions_created_at ON staging_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_staging_transactions_potential_match ON staging_transactions(potential_match_id);

-- Comments for documentation
COMMENT ON TABLE staging_transactions IS 'Staging area for transactions pending user review/approval';
COMMENT ON COLUMN staging_transactions.raw_text IS 'Original input text (SMS, CSV row, manual entry)';
COMMENT ON COLUMN staging_transactions.extracted_data IS 'AI-extracted transaction data as JSONB';
COMMENT ON COLUMN staging_transactions.status IS 'Review status: pending, approved, rejected';
COMMENT ON COLUMN staging_transactions.csv_source IS 'Source filename if imported from CSV';
COMMENT ON COLUMN staging_transactions.potential_match_id IS 'Reference to existing transaction if duplicate detected';

-- ============================================
-- BENEFICIARIES TABLE ENHANCEMENTS
-- ============================================
-- Add new columns to existing beneficiaries table
ALTER TABLE beneficiaries ADD COLUMN IF NOT EXISTS relationship TEXT;
ALTER TABLE beneficiaries ADD COLUMN IF NOT EXISTS default_currency TEXT DEFAULT 'SAR';

-- Comments for new columns
COMMENT ON COLUMN beneficiaries.relationship IS 'Relationship type: employer, client, family, friend, etc.';
COMMENT ON COLUMN beneficiaries.default_currency IS 'Default currency for reimbursements from this beneficiary';

-- ============================================
-- CATEGORY RULES TABLE (AI Memory)
-- ============================================
-- Stores learned merchant-to-category mappings for AI
CREATE TABLE IF NOT EXISTS category_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  merchant_keyword TEXT NOT NULL,
  category TEXT NOT NULL,
  confidence NUMERIC(3, 2) DEFAULT 1.0,
  times_applied INT DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, merchant_keyword)
);

-- Enable RLS on category_rules
ALTER TABLE category_rules ENABLE ROW LEVEL SECURITY;

-- RLS Policies for category_rules
CREATE POLICY "Users can view own category rules"
  ON category_rules FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own category rules"
  ON category_rules FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own category rules"
  ON category_rules FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own category rules"
  ON category_rules FOR DELETE
  USING (auth.uid() = user_id);

-- Indexes for category_rules
CREATE INDEX IF NOT EXISTS idx_category_rules_user_id ON category_rules(user_id);
CREATE INDEX IF NOT EXISTS idx_category_rules_merchant ON category_rules(merchant_keyword);
CREATE INDEX IF NOT EXISTS idx_category_rules_category ON category_rules(category);

-- Comments for documentation
COMMENT ON TABLE category_rules IS 'AI memory: learned merchant-to-category mappings per user';
COMMENT ON COLUMN category_rules.merchant_keyword IS 'Merchant name or keyword pattern to match';
COMMENT ON COLUMN category_rules.category IS 'Category to assign when merchant matches';
COMMENT ON COLUMN category_rules.confidence IS 'Confidence score (0.00-1.00) for this rule';
COMMENT ON COLUMN category_rules.times_applied IS 'Number of times this rule has been applied';

-- ============================================
-- HELPER FUNCTION: Upsert Category Rule
-- ============================================
-- Function to update or insert a category rule (for AI learning)
CREATE OR REPLACE FUNCTION upsert_category_rule(
  p_user_id UUID,
  p_merchant_keyword TEXT,
  p_category TEXT
)
RETURNS UUID AS $$
DECLARE
  v_rule_id UUID;
BEGIN
  INSERT INTO category_rules (user_id, merchant_keyword, category)
  VALUES (p_user_id, LOWER(TRIM(p_merchant_keyword)), p_category)
  ON CONFLICT (user_id, merchant_keyword)
  DO UPDATE SET
    category = p_category,
    times_applied = category_rules.times_applied + 1,
    updated_at = NOW()
  RETURNING id INTO v_rule_id;
  
  RETURN v_rule_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- HELPER FUNCTION: Find Category for Merchant
-- ============================================
-- Function to look up category rule for a merchant
CREATE OR REPLACE FUNCTION find_category_for_merchant(
  p_user_id UUID,
  p_merchant TEXT
)
RETURNS TEXT AS $$
DECLARE
  v_category TEXT;
BEGIN
  SELECT category INTO v_category
  FROM category_rules
  WHERE user_id = p_user_id
    AND LOWER(p_merchant) LIKE '%' || merchant_keyword || '%'
  ORDER BY times_applied DESC, confidence DESC
  LIMIT 1;
  
  RETURN v_category;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
