import { db } from './db.js';
import fs from 'fs';

async function checkOrders() {
    const report = {};

    const { data: data2025 } = await db
        .from('orders')
        .select('id, timestamp, storeId, finalAmount')
        .gte('timestamp', '2025-12-01T00:00:00.000Z')
        .lt('timestamp', '2026-01-01T00:00:00.000Z');

    report.dec2025_count = data2025 ? data2025.length : 0;

    const { data: data2024 } = await db
        .from('orders')
        .select('id, timestamp, storeId, finalAmount')
        .gte('timestamp', '2024-12-01T00:00:00.000Z')
        .lt('timestamp', '2025-01-01T00:00:00.000Z');

    report.dec2024_count = data2024 ? data2024.length : 0;

    const { data: oldestOrder } = await db.from('orders').select('timestamp').order('timestamp', { ascending: true }).limit(1);
    report.oldest_order = oldestOrder && oldestOrder.length > 0 ? oldestOrder[0].timestamp : null;

    const { data: newestOrder } = await db.from('orders').select('timestamp').order('timestamp', { ascending: false }).limit(1);
    report.newest_order = newestOrder && newestOrder.length > 0 ? newestOrder[0].timestamp : null;

    fs.writeFileSync('C:\\tmp\\dec_orders_report.json', JSON.stringify(report, null, 2));
    process.exit(0);
}

checkOrders();
