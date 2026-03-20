import pg from 'pg';
const { Client } = pg;

const connectionString = "postgresql://postgres.pthpxqzisshrcnjwwzlu:TRYTohackme26%28%29@aws-1-ap-northeast-1.pooler.supabase.com:5432/postgres";

async function test() {
    const client = new Client({ connectionString });
    try {
        await client.connect();
        console.log("SUCCESS: Connected to Supabase via pg");
        const res = await client.query('SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname = \'public\'');
        console.log("Tables found:", res.rows.map(r => r.tablename).join(', '));
    } catch (err) {
        console.error("FAILURE:", err.message);
    } finally {
        await client.end();
    }
}
test();
