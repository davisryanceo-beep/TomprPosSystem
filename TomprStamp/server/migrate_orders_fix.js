// migrate_orders_fix.js
// Targeted re-migration of only the failed orders from migration_v2_error_orders.json
import admin from 'firebase-admin';
import { readFileSync, writeFileSync } from 'fs';
import { db as supabase } from './db.js';

const sa = JSON.parse(readFileSync('../firebase-key.json', 'utf8'));
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa) });
const firestore = admin.firestore();

// Load the IDs of failed orders
const failedErrors = JSON.parse(readFileSync('./migration_v2_error_orders.json', 'utf8'));
const failedIds = failedErrors.map(e => e.id).filter(Boolean);
console.log(`Found ${failedIds.length} failed order IDs to retry.`);

// Helper to convert Firestore Timestamps to ISO strings
function convertTimestamps(obj) {
    if (!obj || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map(convertTimestamps);
    if (obj && typeof obj.toDate === 'function') return obj.toDate().toISOString();
    const newObj = {};
    for (const [key, value] of Object.entries(obj)) {
        newObj[key] = convertTimestamps(value);
    }
    return newObj;
}

// Coerce a value to integer safely (returns null if not possible)
function toIntOrNull(val) {
    if (val === null || val === undefined) return null;
    if (typeof val === 'boolean') return val ? 1 : 0;
    if (val === 'true' || val === 'True') return 1;
    if (val === 'false' || val === 'False') return 0;
    const parsed = parseInt(val, 10);
    return isNaN(parsed) ? null : parsed;
}

// Coerce a value to float safely (returns null if not possible)
function toFloatOrNull(val) {
    if (val === null || val === undefined) return null;
    const parsed = parseFloat(val);
    return isNaN(parsed) ? null : parsed;
}

const ORDERS_ALLOWED_KEYS = [
    "id", "items", "tableNumber", "totalAmount", "taxAmount", "discountAmount",
    "finalAmount", "status", "timestamp", "cashierId", "baristaId", "isRushOrder",
    "paymentMethod", "paymentCurrency", "cashTendered", "changeGiven",
    "appliedPromotionId", "storeId"
];

function prepareOrder(data) {
    let d = { ...convertTimestamps(data) };

    // Remove problematic fields
    delete d.qrPaymentState;
    delete d.dailyOrderNumber;
    delete d.lastUpdated;

    // Strict type coercions — INTEGER columns
    d.isRushOrder = toIntOrNull(d.isRushOrder);
    d.tableNumber = toIntOrNull(d.tableNumber);

    // FLOAT columns
    d.totalAmount = toFloatOrNull(d.totalAmount);
    d.taxAmount = toFloatOrNull(d.taxAmount);
    d.discountAmount = toFloatOrNull(d.discountAmount);
    d.finalAmount = toFloatOrNull(d.finalAmount);
    d.cashTendered = toFloatOrNull(d.cashTendered);
    d.changeGiven = toFloatOrNull(d.changeGiven);

    // JSONB coercion for items
    if (d.items && typeof d.items === 'string') {
        try { d.items = JSON.parse(d.items); } catch (e) { d.items = []; }
    }

    // Filter to only allowed keys
    const clean = {};
    for (const key of ORDERS_ALLOWED_KEYS) {
        if (d[key] !== undefined) clean[key] = d[key];
    }
    return clean;
}

async function run() {
    console.log('\n================================================');
    console.log('ORDERS REPAIR MIGRATION');
    console.log('================================================\n');

    let success = 0;
    const remainingErrors = [];

    // Process in batches of 100
    const batchSize = 100;
    for (let i = 0; i < failedIds.length; i += batchSize) {
        const batch = failedIds.slice(i, i + batchSize);
        console.log(`Fetching batch ${i + 1} - ${i + batch.length}...`);

        // Fetch each doc from Firestore
        const rows = [];
        for (const docId of batch) {
            const doc = await firestore.collection('orders').doc(docId).get();
            if (!doc.exists) {
                console.log(`  ⚠️  Order ${docId} not found in Firebase. Skipping.`);
                continue;
            }
            const raw = doc.data();
            if (!raw.id) raw.id = doc.id;
            rows.push(prepareOrder(raw));
        }

        if (rows.length === 0) continue;

        // Try batch upsert first
        const { error } = await supabase.from('orders').upsert(rows, { onConflict: 'id', ignoreDuplicates: false });
        if (error) {
            console.log(`  Batch failed: ${error.message}. Falling back to individual inserts...`);
            for (const row of rows) {
                const { error: singleErr } = await supabase.from('orders').upsert(row, { onConflict: 'id', ignoreDuplicates: false });
                if (singleErr) {
                    console.error(`  ❌ ${row.id}: ${singleErr.message}`);
                    remainingErrors.push({ id: row.id, error: singleErr.message, data: row });
                } else {
                    success++;
                }
            }
        } else {
            success += rows.length;
            console.log(`  ✅ Batch upserted ${rows.length} orders.`);
        }
    }

    console.log('\n================================================');
    console.log(`ORDERS REPAIR SUMMARY`);
    console.log(`  ✅ Fixed: ${success}`);
    console.log(`  ❌ Still failing: ${remainingErrors.length}`);
    console.log('================================================');

    if (remainingErrors.length > 0) {
        writeFileSync('migration_v3_error_orders.json', JSON.stringify(remainingErrors, null, 2));
        console.log('Still-failing orders saved to migration_v3_error_orders.json');
        // Show first remaining error with data so we can debug
        const sample = remainingErrors[0];
        console.log('\nSample still-failing order:');
        console.log(JSON.stringify(sample, null, 2));
    } else {
        console.log('\n✅ ALL ORDERS MIGRATED SUCCESSFULLY!');
    }

    process.exit(0);
}

run().catch(err => {
    console.error('Fatal:', err);
    process.exit(1);
});
