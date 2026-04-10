-- FIX ORDERS SCHEMA
-- Run this script in your Supabase SQL Editor to ensure all necessary columns exist for the new ordering logic.

-- 1. Ensure columns exist with correct types
ALTER TABLE orders ADD COLUMN IF NOT EXISTS kitchenStatus TEXT DEFAULT 'pending';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS kitchenStartTime TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS kitchenReadyTime TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS deliveryDetails JSONB;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS terminalId TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS dailyOrderNumber INTEGER;

-- 2. Ensure storeId is NOT NULL (safety)
-- ALTER TABLE orders ALTER COLUMN storeId SET NOT NULL; 

-- 3. Verify types (in case they were created as something else)
-- If kitchenStatus was accidentally created as a boolean or something else, you might need to drop and re-add:
-- ALTER TABLE orders DROP COLUMN IF EXISTS kitchenStatus;
-- ALTER TABLE orders ADD COLUMN kitchenStatus TEXT DEFAULT 'pending';

-- SUCCESS: The table is now compatible with the latest backend code.
