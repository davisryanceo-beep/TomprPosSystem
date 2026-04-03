import admin from 'firebase-admin';
import { readFileSync, writeFileSync } from 'fs';
import { db as supabase } from './db.js';

// Load service account securely
const serviceAccount = JSON.parse(readFileSync('../TomprStamp/firebase-key.json', 'utf8'));

// Initialize Firebase App
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}
const firestore = admin.firestore();

// Make sure we only READ from firebase
const COLLECTIONS_TO_MIGRATE = [
    'stores',
    'users',
    'categories',
    'modifierGroups',
    'addons',
    'combos',
    'products',
    'orders',
    'supply_items',
    'recipes',
    'shifts',
    'promotions',
    'wastage_logs',
    'time_logs',
    'timeLogs', // Also migrate this one
    'cash_drawer_logs',
    'announcements',
    'feedback',
    'app_settings',
    'daily_sales_reports',
    'leave_requests',
    'staff_rewards',
    'current_orders'
];

// Helper to convert Firestore Timestamps to ISO strings
function convertTimestamps(obj) {
    if (!obj || typeof obj !== 'object') return obj;

    // Handle Arrays
    if (Array.isArray(obj)) {
        return obj.map(convertTimestamps);
    }

    // Handle Firestore Timestamp
    if (obj && typeof obj.toDate === 'function') {
        return obj.toDate().toISOString();
    }

    // Process Object Keys
    const newObj = {};
    for (const [key, value] of Object.entries(obj)) {
        newObj[key] = convertTimestamps(value);
    }
    return newObj;
}

const ALLOWED_KEYS = {
    stores: ["id", "name", "address", "contactInfo", "currencyCode", "timezone", "createdAt", "licenseExpiryDate", "logoUrl", "backgroundImageUrl", "welcomeMessage", "qrCodeUrl", "displayTheme", "backgroundColor", "overlayOpacity", "accentColor", "fontFamily", "headerColor", "bodyTextColor", "logoSize", "telegramBotToken", "telegramChatId", "loyaltyEnabled", "stampsPerItem", "stampsToRedeem", "loyaltyRewardDescription"],
    users: ["id", "username", "role", "password", "pin", "firstName", "lastName", "profilePictureUrl", "storeId", "email", "phoneNumber"],
    categories: ["id", "name", "storeId"],
    modifierGroups: ["id", "name", "description", "selectionType", "minSelections", "maxSelections", "options", "storeId"],
    addons: ["id", "name", "price", "storeId"],
    combos: ["id", "name", "price", "description", "imageUrl", "items", "storeId"],
    products: ["id", "name", "price", "category", "stock", "imageUrl", "description", "storeId"],
    orders: ["id", "items", "tableNumber", "totalAmount", "taxAmount", "discountAmount", "finalAmount", "status", "timestamp", "cashierId", "baristaId", "isRushOrder", "paymentMethod", "paymentCurrency", "cashTendered", "changeGiven", "appliedPromotionId", "storeId", "qrPaymentState"],
    supply_items: ["id", "name", "category", "currentStock", "unit", "lowStockThreshold", "notes", "purchaseDate", "expiryDate", "storeId"],
    recipes: ["id", "productId", "productName", "ingredients", "instructions", "notes", "storeId"],
    shifts: ["id", "userId", "userName", "role", "date", "startTime", "endTime", "notes", "storeId"],
    promotions: ["id", "name", "description", "type", "value", "startDate", "endDate", "minOrderAmount", "isActive", "applicableProductIds", "storeId"],
    wastage_logs: ["id", "itemId", "itemName", "quantity", "reason", "date", "reportedBy", "storeId"],
    time_logs: ["id", "userId", "userName", "role", "clockInTime", "clockOutTime", "notes", "storeId"],
    cash_drawer_logs: ["id", "shiftDate", "declaredAmount", "expectedAmount", "discrepancy", "notes", "adminNotes", "reportedBy", "logTimestamp", "storeId"],
    announcements: ["id", "title", "message", "priority", "authorId", "authorName", "timestamp", "isArchived", "targetRoles", "storeId"],
    feedback: ["id", "type", "message", "timestamp", "userId", "userName", "storeId"],
    app_settings: ["id", "registrationEnabled", "updatedAt"],
    daily_sales_reports: ["id", "storeId", "date", "dailyRevenue", "totalCash", "totalQR", "itemSales", "inventorySnapshot", "pastryCount", "cashierId", "cashierName", "timestamp"],
    leave_requests: ["id", "userId", "userName", "storeId", "startDate", "endDate", "reason", "requestedAt", "respondedAt", "status"],
    staff_rewards: ["id", "userId", "userName", "storeId", "date", "shiftId", "timestamp", "claimedAt", "claimedProductId", "claimedOrderId", "status"],
    current_orders: ["id", "storeId", "terminalId", "items", "tableNumber", "totalAmount", "taxAmount", "discountAmount", "finalAmount", "cashierId", "isRushOrder", "appliedPromotionId", "qrPaymentState", "lastUpdated"]
};

// Ensure array or object fields expected as JSONB are correct and filter out redundant fields
function prepareDataForSupabase(collectionName, firestoreData) {
    let data = { ...firestoreData };

    if (collectionName === 'modifierGroups' && data.options) {
        if (typeof data.options === 'string') {
            try { data.options = JSON.parse(data.options); } catch (e) { }
        }
    }

    if (collectionName === 'combos' && data.items) {
        if (typeof data.items === 'string') {
            try { data.items = JSON.parse(data.items); } catch (e) { }
        }
    }

    if (collectionName === 'products' && data.modifierGroups) {
        if (typeof data.modifierGroups === 'string') {
            try { data.modifierGroups = JSON.parse(data.modifierGroups); } catch (e) { }
        }
    }

    if (collectionName === 'orders' && data.items) {
        if (typeof data.items === 'string') {
            try { data.items = JSON.parse(data.items); } catch (e) { }
        }
    }

    // Booleans must be stored as 0/1 integers for Supabase INTEGER columns
    const boolToInt = (v) => (v === true || v === 'true' || v === 1) ? 1 : 0;

    if (collectionName === 'orders' && data.isRushOrder !== undefined) {
        data.isRushOrder = boolToInt(data.isRushOrder);
    }
    if (collectionName === 'promotions' && data.isActive !== undefined) {
        data.isActive = boolToInt(data.isActive);
    }
    if (collectionName === 'announcements' && data.isArchived !== undefined) {
        data.isArchived = boolToInt(data.isArchived);
    }
    if (collectionName === 'products' && data.allowAddOns !== undefined) {
        data.allowAddOns = boolToInt(data.allowAddOns);
    }
    if (collectionName === 'products' && data.isSeasonal !== undefined) {
        data.isSeasonal = boolToInt(data.isSeasonal);
    }
    // Numeric fields: ensure they are numbers or null, not booleans
    const numericFields = {
        orders: ['totalAmount', 'taxAmount', 'discountAmount', 'finalAmount', 'cashTendered', 'changeGiven'],
        supply_items: ['currentStock', 'lowStockThreshold'],
        promotions: ['value', 'minOrderAmount'],
        cash_drawer_logs: ['declaredAmount', 'expectedAmount', 'discrepancy'],
        wastage_logs: ['quantity'],
    };
    if (numericFields[collectionName]) {
        for (const field of numericFields[collectionName]) {
            if (data[field] !== undefined) {
                const parsed = parseFloat(data[field]);
                data[field] = isNaN(parsed) ? null : parsed;
            }
        }
    }

    const converted = convertTimestamps(data);

    // Filter against ALLOWED_KEYS
    const cleanData = {};
    const allowed = ALLOWED_KEYS[collectionName] || [];
    for (const key of allowed) {
        if (converted[key] !== undefined) {
            cleanData[key] = converted[key];
        }
    }

    return cleanData;
}

async function migrateCollection(collectionName) {
    console.log(`\n--- Migrating collection: ${collectionName} ---`);
    try {
        // READ ONLY from Firestore
        const snapshot = await firestore.collection(collectionName).get();
        if (snapshot.empty) {
            console.log(`No documents found in ${collectionName}. Skipping.`);
            return {
                collection: collectionName,
                totalRead: 0,
                successCount: 0,
                errors: []
            };
        }

        console.log(`Read ${snapshot.size} documents from Firebase for ${collectionName}.`);

        // Prepare bulk data for Supabase
        const rowsToInsert = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            // Ensure ID is added since Firestore uses document keys
            if (!data.id) {
                data.id = doc.id;
            }
            const cleanData = prepareDataForSupabase(collectionName, data);
            rowsToInsert.push(cleanData);
        });

        // Split into batches to avoid too large payloads (max 1000 items per request)
        const batchSize = 1000;
        let successCount = 0;
        const errors = [];

        // Check if data already exists to prevent duplicate key errors, or just use upsert
        let targetTable = collectionName === 'modifierGroups' ? 'modifiergroups' : collectionName;
        
        // Alias timeLogs to time_logs table
        if (collectionName === 'timeLogs') {
            targetTable = 'time_logs';
        }

        for (let i = 0; i < rowsToInsert.length; i += batchSize) {
            const batch = rowsToInsert.slice(i, i + batchSize);

            console.log(`Upserting batch ${i} to ${i + batch.length} into Supabase ${targetTable}...`);
            const { error, count } = await supabase
                .from(targetTable)
                .upsert(batch, { onConflict: 'id', ignoreDuplicates: true });

            if (error) {
                console.error(`Batch insert error for ${targetTable}:`, error.message);
                console.log(`Falling back to individual row inserts for batch...`);
                // Fallback to one-by-one to save the valid ones and skip the bad ones (like missing FKs)
                for (const row of batch) {
                    const { error: singleError } = await supabase.from(targetTable).upsert(row, { onConflict: 'id', ignoreDuplicates: true });
                    if (singleError) {
                        errors.push({ id: row.id, error: singleError.message });
                    } else {
                        successCount++;
                    }
                }
            } else {
                successCount += batch.length;
            }
        }

        console.log(`Successfully migrated ${successCount} records for ${collectionName}.`);
        return {
            collection: collectionName,
            totalRead: snapshot.size,
            successCount,
            errors
        };

    } catch (err) {
        console.error(`Failed to migrate collection ${collectionName}:`, err.message);
        return {
            collection: collectionName,
            totalRead: 0,
            successCount: 0,
            errors: [err]
        };
    }
}

async function runMigration() {
    console.log('================================================');
    console.log('STARTING FIREBASE TO SUPABASE MIGRATION');
    console.log('NOTE: This script performs READ-ONLY operations on Firebase.');
    console.log('================================================\n');

    const results = [];
    // We process sequentially to avoid overwhelming the database connections
    // Important: We must ensure stores are inserted before users, categories, products to satisfy Foreign Key constraints

    // Order of execution for FK integrity
    const orderedCollections = [
        'stores',          // Must be first
        'users',           // Depends on stores
        'categories',      // Depends on stores
        'modifierGroups',  // Depends on stores
        'addons',          // Depends on stores
        'products',        // Depends on stores
        'combos',          // Depends on stores
        'supply_items',    // Depends on stores
        'recipes',         // Depends on products, stores
        'orders',          // Depends on stores
        'shifts',          // Depends on users, stores
        'promotions',      // Depends on stores
        'wastage_logs',    // Depends on stores
        'time_logs',       // Depends on users, stores
        'timeLogs',        // Mapped to time_logs table
        'cash_drawer_logs',// Depends on stores
        'announcements',   // Depends on stores
        'feedback',         // Depends on stores
        'app_settings',
        'daily_sales_reports',
        'leave_requests',
        'staff_rewards',
        'current_orders'
    ];

    for (const collectionName of orderedCollections) {
        if (COLLECTIONS_TO_MIGRATE.includes(collectionName)) {
            const result = await migrateCollection(collectionName);
            results.push(result);
        }
    }

    console.log('\n================================================');
    console.log('MIGRATION SUMMARY');
    console.log('================================================');
    let totalFailed = 0;

    for (const res of results) {
        console.log(`${res.collection.padEnd(20)} | Read: ${res.totalRead} | Migrated: ${res.successCount} | Errors: ${res.errors.length}`);
        if (res.errors.length > 0) {
            totalFailed += res.errors.length;
            writeFileSync(`migration_error_${res.collection}.json`, JSON.stringify(res.errors, null, 2));
            console.log(`  -> Errors saved to migration_error_${res.collection}.json`);
        }
    }

    if (totalFailed === 0) {
        console.log('\n✅ MIGRATION COMPLETED SUCCESSFULLY!');
    } else {
        console.log(`\n⚠️ MIGRATION COMPLETED WITH ${totalFailed} ERRORS. Check log files.`);
    }

    process.exit(0);
}

runMigration().catch(err => {
    console.error('Fatal error during migration:', err);
    process.exit(1);
});
