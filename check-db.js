
import pg from 'pg';
const { Client } = pg;
import 'dotenv/config';

const DATABASE_URL = "postgresql://postgres.pthpxqzisshrcnjwwzlu:TRYTohackme26%28%29@aws-1-ap-northeast-1.pooler.supabase.com:5432/postgres";

async function check() {
  const client = new Client({ connectionString: DATABASE_URL });
  try {
    await client.connect();
    console.log('--- Database Row Counts Post-Migration ---');
    const tables = [
      'stores', 'users', 'customers', 'categories', 'modifiergroups', 
      'products', 'promotions', 'orders', 'shifts', 'time_logs', 
      'stamp_claims', 'supply_items', 'recipes'
    ];
    
    for (const table of tables) {
      try {
        const res = await client.query(`SELECT COUNT(*) FROM "${table}"`);
        console.log(`${table}: ${res.rows[0].count}`);
      } catch (err) {
        console.log(`${table}: Table not found or error: ${err.message}`);
      }
    }
  } catch (err) {
    console.error('Check failed:', err);
  } finally {
    await client.end();
  }
}

check();
