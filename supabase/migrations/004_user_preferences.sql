-- Rqeeb Migration 004: User Preferences
-- Adds default currency preference to user profiles
-- Run this in your Supabase SQL Editor

-- ============================================
-- ADD DEFAULT CURRENCY TO PROFILES
-- ============================================
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS default_currency TEXT DEFAULT 'SAR' NOT NULL;

-- Add timezone preference for future use
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'Asia/Riyadh';

-- Add locale preference for future use
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS locale TEXT DEFAULT 'en-SA';

-- Update existing profiles to have SAR as default (in case NULL)
UPDATE profiles SET default_currency = 'SAR' WHERE default_currency IS NULL;

-- ============================================
-- COMMENT: SUPPORTED CURRENCIES
-- ============================================
-- The app supports these currencies:
-- SAR (Saudi Riyal) - Default
-- USD (US Dollar)
-- EUR (Euro)
-- GBP (British Pound)
-- AED (UAE Dirham)
-- KWD (Kuwaiti Dinar)
-- BHD (Bahraini Dinar)
-- QAR (Qatari Riyal)
-- OMR (Omani Rial)
-- EGP (Egyptian Pound)

