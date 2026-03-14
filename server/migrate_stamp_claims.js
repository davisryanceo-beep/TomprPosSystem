import pg from 'pg';
const { Client } = pg;

const connectionString = "postgresql://postgres.pthpxqzisshrcnjwwzlu:TRYTohackme26%28%29@aws-1-ap-northeast-1.pooler.supabase.com:5432/postgres";

async function createTable() {
    const client = new Client({
        connectionString: connectionString,
    });

    try {
        await client.connect();
        console.log("Connected to database.");

        const sql = `
        CREATE TABLE IF NOT EXISTS stamp_claims (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            store_id TEXT NOT NULL,
            order_id TEXT NOT NULL,
            stamps INTEGER NOT NULL,
            claimed BOOLEAN DEFAULT FALSE,
            claimed_at TIMESTAMP WITH TIME ZONE,
            customer_id TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            expires_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '1 hour'
        );
        `;

        await client.query(sql);
        console.log("stamp_claims table created or already exists.");

    } catch (err) {
        console.error("Error creating table:", err);
    } finally {
        await client.end();
    }
}

createTable();
