-- Migration: Add missing loyalty and order metadata columns to orders table
-- Run this script in your Supabase SQL Editor (https://app.supabase.com/)

-- 1. Add missing columns to the orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customerId TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customerPhone TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS orderType TEXT DEFAULT 'POS';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS dailyOrderNumber INTEGER;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS kitchenStatus TEXT DEFAULT 'pending';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS kitchenStartTime TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS kitchenReadyTime TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS terminalId TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS deliveryDetails JSONB;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS pendingStampClaimId TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS pendingStampCount INTEGER DEFAULT 0;

-- 2. Verify all columns are present (Success message)
DO $$ 
BEGIN
    RAISE NOTICE 'Orders table migration completed successfully.';
END $$;
