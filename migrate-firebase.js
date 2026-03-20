
import pg from 'pg';
const { Client } = pg;
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import 'dotenv/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATABASE_URL = "postgresql://postgres.pthpxqzisshrcnjwwzlu:TRYTohackme26%28%29@aws-1-ap-northeast-1.pooler.supabase.com:5432/postgres";

if (!DATABASE_URL) {
  console.error('DATABASE_URL is not defined in .env');
  process.exit(1);
}

const client = new Client({
  connectionString: DATABASE_URL,
});

async function migrate() {
  try {
    await client.connect();
    console.log('Connected to Supabase PostgreSQL');

    // 0. Diagnostic: Check table structure
    const tableInfo = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'customers'
    `);
    console.log('Customers Table Columns:', tableInfo.rows.map(r => r.column_name).join(', '));

    const constraintInfo = await client.query(`
      SELECT conname, pg_get_constraintdef(c.oid)
      FROM pg_constraint c
      JOIN pg_namespace n ON n.oid = c.connamespace
      WHERE conrelid = 'customers'::regclass
    `);
    console.log('Customers Constraints:', JSON.stringify(constraintInfo.rows, null, 2));

    const dumpPath = path.join(__dirname, 'TomprStamp', 'db_dump.json');
    const customersPath = path.join(__dirname, 'TomprStamp', 'tmp_customers.json');

    const dumpData = JSON.parse(fs.readFileSync(dumpPath, 'utf8'));
    const customerListData = JSON.parse(fs.readFileSync(customersPath, 'utf8'));

    // 0.1 Ensure Unique Constraint exists on customers
    console.log('Ensuring unique constraint on customers(phoneNumber, storeId)...');
    try {
      await client.query('ALTER TABLE customers ADD CONSTRAINT unique_customer_phone_store UNIQUE ("phoneNumber", "storeId")');
    } catch (err) {
      if (err.message.includes('already exists')) {
        console.log('Unique constraint already exists.');
      } else {
        console.error('Failed to add unique constraint:', err.message);
      }
    }
    const defaultStoreId = 'store-1769421861055';
    const storeCheck = await client.query('SELECT id FROM stores WHERE id = $1', [defaultStoreId]);
    
    if (storeCheck.rows.length === 0) {
      console.log(`Store ${defaultStoreId} not found. Creating default store...`);
      await client.query(
        'INSERT INTO stores (id, name, address) VALUES ($1, $2, $3)',
        [defaultStoreId, 'Migrated Solace Store', 'Phnom Penh, Cambodia']
      );
    }

    // 3. Migrate Users
    console.log(`Migrating ${dumpData.users.length} users...`);
    for (const user of dumpData.users) {
      try {
        const id = crypto.randomUUID();
        const role = user.username.includes('admin') ? 'admin' : 'staff';
        
        await client.query(
          'INSERT INTO users (id, username, password, role, "storeId") VALUES ($1, $2, $3, $4, $5) ON CONFLICT (username) DO NOTHING',
          [id, user.username, user.password, role, defaultStoreId]
        );
      } catch (err) {
        console.error(`Failed to migrate user ${user.username}:`, err.message);
      }
    }

    // 4. Migrate Customers
    console.log(`Migrating ${customerListData.length} customers...`);
    for (const customer of customerListData) {
      try {
        const id = crypto.randomUUID();
        const storeId = customer.storeId || defaultStoreId;
        
        await client.query(
          'INSERT INTO customers (id, "phoneNumber", password, name, "storeId") VALUES ($1, $2, $3, $4, $5) ON CONFLICT ("phoneNumber", "storeId") DO NOTHING',
          [id, customer.phoneNumber, customer.password, 'Migrated Customer', storeId]
        );
      } catch (err) {
        console.error(`Failed to migrate customer ${customer.phoneNumber}:`, err.message);
      }
    }

    console.log('Migration completed successfully!');

  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await client.end();
  }
}

migrate();
