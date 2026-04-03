import pg from 'pg';
import { schemaSql } from './schema.js';

const connectionString = "postgresql://postgres.pthpxqzisshrcnjwwzlu:TRYTohackme26%28%29@aws-1-ap-northeast-1.pooler.supabase.com:5432/postgres";

async function applySchema() {
    const client = new pg.Client({ connectionString });

    try {
        await client.connect();
        console.log("Connected to Supabase Postgres.");

        // Force recreation of the 3 problematic tables to ensure they match our schema.js
        const tablesToReset = ['daily_sales_reports', 'leave_requests', 'staff_rewards'];
        for (const table of tablesToReset) {
            console.log(`Dropping ${table} if it exists...`);
            await client.query(`DROP TABLE IF EXISTS ${table} CASCADE`);
        }

        // Apply all statements from schemaSql
        const statements = schemaSql
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0);

        for (const statement of statements) {
            try {
                await client.query(statement);
            } catch (err) {
                if (err.message.includes('already exists')) continue;
                console.error(`Error in: ${statement.substring(0,60)}...`);
                console.error(`Reason: ${err.message}`);
            }
        }

        console.log("Schema synchronized successfully.");

    } catch (err) {
        console.error("Fatal error applying schema:", err);
    } finally {
        await client.end();
    }
    process.exit(0);
}

applySchema();
