import admin from 'firebase-admin';
import pg from 'pg';
import { readFileSync } from 'fs';

// Load service account securely
const serviceAccount = JSON.parse(readFileSync('../TomprStamp/firebase-key.json', 'utf8'));

// Initialize Firebase App
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}
const firestore = admin.firestore();

const connectionString = "postgresql://postgres.pthpxqzisshrcnjwwzlu:TRYTohackme26%28%29@aws-1-ap-northeast-1.pooler.supabase.com:5432/postgres";
const client = new pg.Client({ connectionString });

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

const ALLOWED_KEYS = {
    time_logs: ["id", "userId", "userName", "role", "clockInTime", "clockOutTime", "notes", "storeId"],
    daily_sales_reports: ["id", "storeId", "date", "dailyRevenue", "totalCash", "totalQR", "itemSales", "inventorySnapshot", "pastryCount", "cashierId", "cashierName", "timestamp"],
    leave_requests: ["id", "userId", "userName", "storeId", "startDate", "endDate", "reason", "requestedAt", "respondedAt", "status"],
    staff_rewards: ["id", "userId", "userName", "storeId", "date", "shiftId", "timestamp", "claimedAt", "claimedProductId", "claimedOrderId", "status"]
};

async function migrateRemaining() {
    await client.connect();
    console.log("Connected to Supabase Postgres.");

    const collections = [
        { firestore: 'timeLogs', pg: 'time_logs' },
        { firestore: 'daily_sales_reports', pg: 'daily_sales_reports' },
        { firestore: 'leave_requests', pg: 'leave_requests' },
        { firestore: 'staff_rewards', pg: 'staff_rewards' }
    ];

    for (const coll of collections) {
        console.log(`\n--- Migrating ${coll.firestore} to ${coll.pg} ---`);
        const snapshot = await firestore.collection(coll.firestore).get();
        if (snapshot.empty) {
            console.log(`No documents in ${coll.firestore}`);
            continue;
        }

        console.log(`Read ${snapshot.size} documents.`);
        for (const doc of snapshot.docs) {
            const data = doc.data();
            if (!data.id) data.id = doc.id;
            const converted = convertTimestamps(data);
            
            const allowed = ALLOWED_KEYS[coll.pg];
            const clean = {};
            allowed.forEach(k => {
                if (converted[k] !== undefined) {
                    // Handle JSON fields
                    if (['itemSales', 'inventorySnapshot'].includes(k) && typeof converted[k] !== 'string') {
                        clean[k] = JSON.stringify(converted[k]);
                    } else {
                        clean[k] = converted[k];
                    }
                }
            });

            const keys = Object.keys(clean);
            const values = Object.values(clean);
            const quotedKeys = keys.map(k => `"${k}"`).join(', ');
            const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
            const query = `INSERT INTO ${coll.pg} (${quotedKeys}) VALUES (${placeholders}) ON CONFLICT (id) DO NOTHING`;

            try {
                await client.query(query, values);
            } catch (err) {
                console.error(`Error migrating record ${data.id}:`, err.message);
            }
        }
        console.log(`Finished ${coll.firestore}`);
    }

    await client.end();
    process.exit(0);
}

migrateRemaining().catch(err => {
    console.error(err);
    process.exit(1);
});
