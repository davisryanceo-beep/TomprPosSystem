import 'dotenv/config';
import { db } from './server/db.js';

async function update() {
  const columns = [
    { name: 'onlineMenuEnabled', type: 'integer', default: 0 },
    { name: 'taxRate', type: 'numeric', default: 0 },
    { name: 'khqrEnabled', type: 'integer', default: 0 },
    { name: 'rewardPolicy', type: 'text', default: "'standard'" },
    { name: 'khqrMerchantName', type: 'text', default: "''" },
    { name: 'khqrMerchantId', type: 'text', default: "''" },
    { name: 'khqrBakongId', type: 'text', default: "''" }
  ];

  console.log('------------------------------------------------');
  console.log('Starting migration to add missing columns...');
  console.log('------------------------------------------------');

  for (const col of columns) {
    console.log(`Processing column: ${col.name}`);
    
    // Check if column exists by trying to select it
    const { error: checkError } = await db.from('stores').select(col.name).limit(1);
    
    if (checkError) {
      console.log(`Column ${col.name} is missing. Attempting to add via RPC...`);
      
      const sql = `ALTER TABLE stores ADD COLUMN IF NOT EXISTS "${col.name}" ${col.type} DEFAULT ${col.default};`;
      
      const { error: rpcError } = await db.rpc('exec_sql', { sql_query: sql });
      
      if (rpcError) {
        console.error(`FAILED to add column ${col.name}. RPC Error: ${rpcError.message}`);
        if (rpcError.message.includes('exec_sql')) {
          console.error(`CRITICAL: 'exec_sql' RPC function is missing in Supabase. Please add it in the SQL Editor:
          
CREATE OR REPLACE FUNCTION exec_sql(sql_query text)
RETURNS void AS $$
BEGIN
  EXECUTE sql_query;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;`);
        }
      } else {
        console.log(`SUCCESS: Added column ${col.name}`);
      }
    } else {
      console.log(`SKIP: Column ${col.name} already exists.`);
    }
  }
  
  console.log('------------------------------------------------');
  console.log('Migration completed.');
  console.log('------------------------------------------------');
}

update().catch(err => {
  console.error('Migration failed with unexpected error:', err);
  process.exit(1);
});
