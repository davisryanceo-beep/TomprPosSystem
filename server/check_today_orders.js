import { db } from './db.js';

async function checkTodayOrders() {
    const now = new Date();
    // Today in Asia/Bangkok (UTC+7)
    const todayUTC7 = new Date(now.getTime() + 7 * 60 * 60 * 1000);
    const today = todayUTC7.toISOString().split('T')[0];

    console.log(`Checking orders for: ${today} (UTC+7)\n`);

    const { data, error } = await db
        .from('orders')
        .select('id, timestamp, finalAmount, status, storeId, paymentMethod')
        .gte('timestamp', today + 'T00:00:00')
        .order('timestamp', { ascending: false });

    if (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }

    if (!data || data.length === 0) {
        console.log('No orders found for today.');
    } else {
        console.log(`Found ${data.length} order(s) today:\n`);
        data.forEach(o => {
            console.log(`  ID: ${o.id}`);
            console.log(`  Time: ${o.timestamp}`);
            console.log(`  Amount: ${o.finalAmount}`);
            console.log(`  Status: ${o.status}`);
            console.log(`  Payment: ${o.paymentMethod}`);
            console.log(`  Store: ${o.storeId}`);
            console.log('  ---');
        });
        const total = data.reduce((sum, o) => sum + (o.finalAmount || 0), 0);
        console.log(`\nTotal revenue today: ${total.toFixed(2)}`);
    }

    process.exit(0);
}

checkTodayOrders();
