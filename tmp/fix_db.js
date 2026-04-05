import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://pthpxqzisshrcnjwwzlu.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'sb_publishable_Re3CVb4I1OZhhyX7QmIv8g_Aqjyc-PY';

const s = createClient(supabaseUrl, supabaseServiceKey);

async function fix() {
  const sql = [
    'ALTER TABLE stores ADD COLUMN IF NOT EXISTS "onlineMenuEnabled" integer DEFAULT 1;',
    'ALTER TABLE stores ADD COLUMN IF NOT EXISTS "taxRate" double precision DEFAULT 0;',
    'ALTER TABLE stores ADD COLUMN IF NOT EXISTS "khqrEnabled" integer DEFAULT 0;',
    'ALTER TABLE stores ADD COLUMN IF NOT EXISTS "khqrMerchantID" text;',
    'ALTER TABLE stores ADD COLUMN IF NOT EXISTS "khqrMerchantName" text;',
    'ALTER TABLE stores ADD COLUMN IF NOT EXISTS "khqrCity" text;',
    'ALTER TABLE stores ADD COLUMN IF NOT EXISTS "rewardPolicy" jsonb DEFAULT \'{}\'::jsonb;'
  ];

  console.log('Starting DB migration...');
  
  for (const q of sql) {
    console.log('Running:', q);
    try {
      // NOTE: This requires 'exec_sql' RPC function to exist on Supabase.
      // If it doesn't, we will fall back to using 'pg' if we have direct access.
      const { error } = await s.rpc('exec_sql', { sql_query: q });
      if (error) {
        console.error('RPC Error:', error.message);
      } else {
        console.log('Success.');
      }
    } catch (e) {
      console.error('Catch Error:', e.message);
    }
  }
}

fix();
