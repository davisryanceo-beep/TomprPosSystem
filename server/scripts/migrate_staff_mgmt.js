import pg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../../.env') });

const { Client } = pg;

async function migrate() {
  const client = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  try {
    await client.connect();
    console.log('Connected to database.');

    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS salary REAL DEFAULT 0;`);
    console.log('✅ Added salary column to users.');

    await client.query(`
      CREATE TABLE IF NOT EXISTS overtime_requests (
        id TEXT PRIMARY KEY,
        "userId" TEXT NOT NULL,
        "userName" TEXT,
        "storeId" TEXT NOT NULL,
        date DATE NOT NULL,
        reason TEXT,
        "requestedHours" REAL NOT NULL,
        "approvedHours" REAL,
        status TEXT DEFAULT 'Pending',
        "requestedAt" TIMESTAMPTZ DEFAULT NOW(),
        "respondedAt" TIMESTAMPTZ,
        "responseNote" TEXT,
        FOREIGN KEY ("storeId") REFERENCES stores(id) ON DELETE CASCADE,
        FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE
      );
    `);
    console.log('✅ Created overtime_requests table.');
  } catch (err) {
    console.error('Migration error:', err);
  } finally {
    await client.end();
  }
}

migrate();
