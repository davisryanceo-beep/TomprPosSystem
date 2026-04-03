import pg from 'pg';

const connectionString = "postgresql://postgres.pthpxqzisshrcnjwwzlu:TRYTohackme26%28%29@aws-1-ap-northeast-1.pooler.supabase.com:5432/postgres";

async function verify() {
    const client = new pg.Client({ connectionString });
    try {
        await client.connect();
        const tables = ['orders', 'users', 'products', 'daily_sales_reports', 'leave_requests', 'staff_rewards', 'time_logs', 'app_settings', 'current_orders'];
        console.log('Final Migration Counts:\n');
        for (const tab of tables) {
            const res = await client.query(`SELECT count(*) FROM "${tab}"`);
            console.log(`${tab.padEnd(20)}: ${res.rows[0].count}`);
        }
    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
    process.exit(0);
}

verify();
