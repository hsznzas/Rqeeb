-- ============================================
-- Recurring Income Table
-- ============================================
-- Stores recurring income sources like salary, freelance payments, etc.
-- A cron job will automatically create transactions on credit days.

CREATE TABLE IF NOT EXISTS recurring_income (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Income details
  name TEXT NOT NULL,                                    -- "Salary", "Freelance", etc.
  amount NUMERIC(12,2) NOT NULL,                         -- Fixed amount
  currency TEXT NOT NULL DEFAULT 'SAR',                  -- Currency code
  
  -- Account assignment
  account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  card_id UUID REFERENCES account_cards(id) ON DELETE SET NULL,
  
  -- Categorization
  category TEXT NOT NULL DEFAULT 'Income',
  description TEXT,                                       -- Optional notes
  
  -- Schedule
  credit_day INTEGER NOT NULL CHECK (credit_day BETWEEN 1 AND 31),
  is_active BOOLEAN NOT NULL DEFAULT true,
  
  -- Next credit date (updated by cron)
  next_credit_date DATE,
  last_credit_date DATE,
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_recurring_income_user_id ON recurring_income(user_id);
CREATE INDEX IF NOT EXISTS idx_recurring_income_active ON recurring_income(is_active, next_credit_date);

-- Row Level Security
ALTER TABLE recurring_income ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own recurring income
DROP POLICY IF EXISTS "Users can view own recurring income" ON recurring_income;
CREATE POLICY "Users can view own recurring income" ON recurring_income
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can create their own recurring income
DROP POLICY IF EXISTS "Users can create own recurring income" ON recurring_income;
CREATE POLICY "Users can create own recurring income" ON recurring_income
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own recurring income
DROP POLICY IF EXISTS "Users can update own recurring income" ON recurring_income;
CREATE POLICY "Users can update own recurring income" ON recurring_income
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Policy: Users can delete their own recurring income
DROP POLICY IF EXISTS "Users can delete own recurring income" ON recurring_income;
CREATE POLICY "Users can delete own recurring income" ON recurring_income
  FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- Function to calculate next credit date
-- ============================================
CREATE OR REPLACE FUNCTION calculate_next_credit_date(
  p_credit_day INTEGER,
  p_from_date DATE DEFAULT CURRENT_DATE
) RETURNS DATE AS $$
DECLARE
  v_year INTEGER;
  v_month INTEGER;
  v_day INTEGER;
  v_result DATE;
BEGIN
  v_year := EXTRACT(YEAR FROM p_from_date);
  v_month := EXTRACT(MONTH FROM p_from_date);
  v_day := EXTRACT(DAY FROM p_from_date);
  
  -- If we're past the credit day this month, move to next month
  IF v_day >= p_credit_day THEN
    v_month := v_month + 1;
    IF v_month > 12 THEN
      v_month := 1;
      v_year := v_year + 1;
    END IF;
  END IF;
  
  -- Handle months with fewer days (e.g., Feb 30 -> Feb 28)
  v_result := make_date(
    v_year,
    v_month,
    LEAST(p_credit_day, (DATE_TRUNC('month', make_date(v_year, v_month, 1)) + INTERVAL '1 month - 1 day')::DATE - DATE_TRUNC('month', make_date(v_year, v_month, 1))::DATE + 1)::INTEGER
  );
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================
-- Trigger to update next_credit_date on insert/update
-- ============================================
CREATE OR REPLACE FUNCTION update_next_credit_date()
RETURNS TRIGGER AS $$
BEGIN
  NEW.next_credit_date := calculate_next_credit_date(NEW.credit_day);
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_next_credit_date ON recurring_income;
CREATE TRIGGER trigger_update_next_credit_date
  BEFORE INSERT OR UPDATE OF credit_day ON recurring_income
  FOR EACH ROW
  EXECUTE FUNCTION update_next_credit_date();

-- ============================================
-- Function to process recurring income (called by cron)
-- ============================================
CREATE OR REPLACE FUNCTION process_recurring_income()
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER := 0;
  v_record RECORD;
BEGIN
  -- Find all active recurring income due today or earlier
  FOR v_record IN 
    SELECT * FROM recurring_income
    WHERE is_active = true
    AND next_credit_date <= CURRENT_DATE
  LOOP
    -- Create the transaction
    INSERT INTO transactions (
      user_id,
      amount,
      currency,
      direction,
      category,
      merchant,
      description,
      transaction_date,
      account_id,
      card_id
    ) VALUES (
      v_record.user_id,
      v_record.amount,
      v_record.currency,
      'in',
      v_record.category,
      v_record.name,
      v_record.description,
      v_record.next_credit_date,
      v_record.account_id,
      v_record.card_id
    );
    
    -- Update the recurring income record
    UPDATE recurring_income
    SET 
      last_credit_date = next_credit_date,
      next_credit_date = calculate_next_credit_date(credit_day, next_credit_date + INTERVAL '1 day')
    WHERE id = v_record.id;
    
    v_count := v_count + 1;
  END LOOP;
  
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
