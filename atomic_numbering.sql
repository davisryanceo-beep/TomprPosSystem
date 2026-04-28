-- ATOMIC DAILY ORDER NUMBERING FIX
-- Run this script in your Supabase SQL Editor (https://app.supabase.com/)

-- 1. Create a table to track sequences per store per day
-- This ensures that even if the server restarts or multiple terminals are used,
-- the numbering remains consistent and sequential.
CREATE TABLE IF NOT EXISTS daily_sequences (
    store_id TEXT,
    day DATE,
    last_value INTEGER,
    PRIMARY KEY (store_id, day)
);

-- 2. Create the RPC function
-- This function handles the increment logic atomically within the database.
-- It prevents the "race condition" where two orders get the same number.
CREATE OR REPLACE FUNCTION get_next_daily_order_number(p_store_id TEXT)
RETURNS INTEGER AS $$
DECLARE
    next_val INTEGER;
    today_date DATE := CURRENT_DATE;
BEGIN
    -- This single statement handles both initialization and incrementing
    INSERT INTO daily_sequences (store_id, day, last_value)
    VALUES (p_store_id, today_date, 1)
    ON CONFLICT (store_id, day)
    DO UPDATE SET last_value = daily_sequences.last_value + 1
    RETURNING last_value INTO next_val;
    
    RETURN next_val;
END;
$$ LANGUAGE plpgsql;

-- 3. (Optional) Initialize existing data
-- If you want to sync existing orders from today:
-- INSERT INTO daily_sequences (store_id, day, last_value)
-- SELECT storeId, timestamp::DATE, MAX(dailyOrderNumber)
-- FROM orders
-- WHERE timestamp::DATE = CURRENT_DATE
-- GROUP BY storeId, timestamp::DATE
-- ON CONFLICT (store_id, day) DO UPDATE SET last_value = EXCLUDED.last_value;

-- SUCCESS: You can now use 'rpc("get_next_daily_order_number", { p_store_id: "your-store-id" })' in Supabase calls.
