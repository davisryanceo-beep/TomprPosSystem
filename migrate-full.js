
import pg from 'pg';
const { Client } = pg;
import fs from 'fs';
import path from 'path';
import 'dotenv/config';

const DATABASE_URL = "postgresql://postgres.pthpxqzisshrcnjwwzlu:TRYTohackme26%28%29@aws-1-ap-northeast-1.pooler.supabase.com:5432/postgres";
const BACKUP_DIR = "c:/Users/sench/OneDrive/Desktop/source/TomprStamp/backups/2026-03-15T14-39-51-679Z";

const client = new Client({ connectionString: DATABASE_URL });

async function migrate() {
  try {
    await client.connect();
    console.log('Connected to Supabase PostgreSQL');

    const files = [
      { name: 'stores', file: 'stores.json' },
      { name: 'users', file: 'users.json' },
      { name: 'categories', file: 'categories.json' },
      { name: 'modifiergroups', file: 'modifiergroups.json' }, // Handled specially if file missing
      { name: 'products', file: 'products.json' },
      { name: 'promotions', file: 'promotions.json' },
      { name: 'orders', file: 'orders.json' },
      { name: 'shifts', file: 'shifts.json' },
      { name: 'time_logs', file: 'time_logs.json' },
      { name: 'stamp_claims', file: 'stamp_claims.json' },
      { name: 'supply_items', file: 'supply_items.json' },
      { name: 'recipes', file: 'recipes.json' }
    ];

    for (const entry of files) {
      const filePath = path.join(BACKUP_DIR, entry.file);
      if (!fs.existsSync(filePath)) {
        console.log(`File ${entry.file} not found, skipping...`);
        continue;
      }

      console.log(`Migrating ${entry.name}...`);
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      
      for (const item of data) {
        try {
          const keys = Object.keys(item);
          // Filter out keys not in Prisma schema or handle mapping
          const columns = keys.map(k => `"${k}"`).join(', ');
          const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
          const values = keys.map(k => {
            if (typeof item[k] === 'object' && item[k] !== null) {
              return JSON.stringify(item[k]);
            }
            return item[k];
          });

          const query = `
            INSERT INTO "${entry.name}" (${columns})
            VALUES (${placeholders})
            ON CONFLICT (id) DO NOTHING
          `;
          
          await client.query(query, values);
        } catch (err) {
          console.error(`Error inserting into ${entry.name} (ID: ${item.id}):`, err.message);
        }
      }
      console.log(`Completed ${entry.name}`);
    }

    console.log('Migration completed successfully!');

  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await client.end();
  }
}

migrate();
