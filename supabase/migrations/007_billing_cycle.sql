-- Migration: Add billing cycle and card support to subscriptions
-- Description: Adds billing_cycle options and card_id for subscription tracking

-- Add billing_cycle column with validation
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS billing_cycle TEXT DEFAULT 'monthly';

-- Add check constraint for valid billing cycle values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'subscriptions_billing_cycle_check'
  ) THEN
    ALTER TABLE subscriptions ADD CONSTRAINT subscriptions_billing_cycle_check 
      CHECK (billing_cycle IN ('weekly', 'biweekly', 'monthly', 'quarterly', 'semiannual', 'annual'));
  END IF;
END $$;

-- Add card_id to link subscription to specific card
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS card_id UUID REFERENCES account_cards(id) ON DELETE SET NULL;

-- Create index for faster card lookups
CREATE INDEX IF NOT EXISTS idx_subscriptions_card_id ON subscriptions(card_id);

-- Comments for documentation
COMMENT ON COLUMN subscriptions.billing_cycle IS 'Billing frequency: weekly, biweekly, monthly, quarterly, semiannual, annual';
COMMENT ON COLUMN subscriptions.card_id IS 'Reference to specific card used for this subscription';

