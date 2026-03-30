import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const client = new pg.Client({ 
    connectionString: process.env.DATABASE_URL, 
    ssl: { rejectUnauthorized: false } 
});

async function run() {
    try {
        await client.connect();
        console.log('Connecting to:', process.env.DATABASE_URL?.split('@')[1]);
        await client.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS "monthlyDayOffAllowance" REAL DEFAULT 0');
        console.log('✅ Added monthlyDayOffAllowance column to PRODUCTION DB');
        
        // Also check if columns exists
        const res = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'users'");
        console.log('Current columns:', res.rows.map(r => r.column_name));
        
    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        await client.end();
    }
}

run();
