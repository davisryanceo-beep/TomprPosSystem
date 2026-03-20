const pg = require('pg');

const DATABASE_URL = "postgresql://postgres.pthpxqzisshrcnjwwzlu:TRYTohackme26%28%29@aws-1-ap-northeast-1.pooler.supabase.com:5432/postgres";

async function main() {
  const client = new pg.Client({
    connectionString: DATABASE_URL,
  });

  try {
    console.log('Running migration: Adding type column to cash_drawer_logs using pg...');
    await client.connect();
    await client.query(`ALTER TABLE cash_drawer_logs ADD COLUMN IF NOT EXISTS type text DEFAULT 'CLOSE'`);
    console.log('Migration successful!');
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
