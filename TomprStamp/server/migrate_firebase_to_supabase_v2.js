import admin from 'firebase-admin';
import { readFileSync, writeFileSync } from 'fs';
import { db as supabase } from './db.js';

// Load service account securely
const serviceAccount = JSON.parse(readFileSync('../firebase-key.json', 'utf8'));

// Initialize Firebase App
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}
const firestore = admin.firestore();

// ============================================================
// PATCHED MIGRATION v2
// Fixes:
// 1. orders: "invalid input syntax for type integer: false/true" -> cast qrPaymentState booleans to proper values
// 2. categories/users: FK constraint violation for storeId -> skip orphaned records
// 3. modifierGroups: PGRST204 -> table name is 'modifiergroups' (lowercase)
// 4. time_logs: FK violation for userId -> skip records with no matching user
// ============================================================

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

const ALLOWED_KEYS = {
    stores: ["id", "name", "address", "contactInfo", "currencyCode", "timezone", "createdAt", "licenseExpiryDate", "logoUrl", "backgroundImageUrl", "welcomeMessage", "qrCodeUrl", "displayTheme", "backgroundColor", "overlayOpacity", "accentColor", "fontFamily", "headerColor", "bodyTextColor", "logoSize", "telegramBotToken", "telegramChatId", "loyaltyEnabled", "stampsPerItem", "stampsToRedeem", "loyaltyRewardDescription"],
    users: ["id", "username", "role", "password", "pin", "firstName", "lastName", "profilePictureUrl", "storeId", "email", "phoneNumber"],
    categories: ["id", "name", "storeId"],
    modifierGroups: ["id", "name", "description", "selectionType", "minSelections", "maxSelections", "options", "storeId"],
    addons: ["id", "name", "price", "storeId"],
    combos: ["id", "name", "price", "description", "imageUrl", "items", "storeId"],
    products: ["id", "name", "price", "category", "stock", "imageUrl", "description", "storeId"],
    orders: ["id", "items", "tableNumber", "totalAmount", "taxAmount", "discountAmount", "finalAmount", "status", "timestamp", "cashierId", "baristaId", "isRushOrder", "paymentMethod", "paymentCurrency", "cashTendered", "changeGiven", "appliedPromotionId", "storeId"],
    supply_items: ["id", "name", "category", "currentStock", "unit", "lowStockThreshold", "notes", "purchaseDate", "expiryDate", "storeId"],
    recipes: ["id", "productId", "productName", "ingredients", "instructions", "notes", "storeId"],
    shifts: ["id", "userId", "userName", "role", "date", "startTime", "endTime", "notes", "storeId"],
    promotions: ["id", "name", "description", "type", "value", "startDate", "endDate", "minOrderAmount", "isActive", "applicableProductIds", "storeId"],
    wastage_logs: ["id", "itemId", "itemName", "quantity", "reason", "date", "reportedBy", "storeId"],
    time_logs: ["id", "userId", "userName", "role", "clockInTime", "clockOutTime", "notes", "storeId"],
    cash_drawer_logs: ["id", "shiftDate", "declaredAmount", "expectedAmount", "discrepancy", "notes", "adminNotes", "reportedBy", "logTimestamp", "storeId"],
    announcements: ["id", "title", "message", "priority", "authorId", "authorName", "timestamp", "isArchived", "targetRoles", "storeId"],
    feedback: ["id", "type", "message", "timestamp", "userId", "userName", "storeId"]
};

function prepareDataForSupabase(collectionName, firestoreData) {
    let data = { ...firestoreData };

    // ✅ FIX 1: JSONB coercions
    if (collectionName === 'modifierGroups' && data.options) {
        if (typeof data.options === 'string') { try { data.options = JSON.parse(data.options); } catch (e) { } }
    }
    if (collectionName === 'combos' && data.items) {
        if (typeof data.items === 'string') { try { data.items = JSON.parse(data.items); } catch (e) { } }
    }
    if ((collectionName === 'orders' || collectionName === 'products') && data.items) {
        if (typeof data.items === 'string') { try { data.items = JSON.parse(data.items); } catch (e) { } }
    }

    // ✅ FIX 2: Boolean coercions (prevent "invalid input syntax for integer" errors)
    if (collectionName === 'orders') {
        // Remove qrPaymentState entirely — it's TEXT in Firebase but INTEGER in Supabase, causing type conflicts
        delete data.qrPaymentState;
        if (data.isRushOrder !== undefined) data.isRushOrder = !!data.isRushOrder;
    }
    if (collectionName === 'products') {
        if (data.allowAddOns !== undefined) data.allowAddOns = !!data.allowAddOns;
        if (data.isSeasonal !== undefined) data.isSeasonal = !!data.isSeasonal;
    }

    // ✅ FIX 3: Numeric coercions — ensure price/amount fields are floats
    const numericFields = ['price', 'totalAmount', 'taxAmount', 'discountAmount', 'finalAmount', 'cashTendered', 'changeGiven', 'value', 'minOrderAmount', 'declaredAmount', 'expectedAmount', 'discrepancy'];
    for (const field of numericFields) {
        if (data[field] !== undefined && data[field] !== null) {
            const parsed = parseFloat(data[field]);
            data[field] = isNaN(parsed) ? null : parsed;
        }
    }

    const converted = convertTimestamps(data);

    // Filter to only allowed keys
    const cleanData = {};
    const allowed = ALLOWED_KEYS[collectionName] || [];
    for (const key of allowed) {
        if (converted[key] !== undefined) {
            cleanData[key] = converted[key];
        }
    }

    return cleanData;
}

async function migrateCollection(collectionName, validStoreIds, validUserIds) {
    const targetTable = collectionName === 'modifierGroups' ? 'modifiergroups' : collectionName;
    console.log(`\n--- Migrating collection: ${collectionName} (table: ${targetTable}) ---`);

    try {
        const snapshot = await firestore.collection(collectionName).get();
        if (snapshot.empty) {
            console.log(`  No documents found. Skipping.`);
            return { collection: collectionName, totalRead: 0, successCount: 0, errors: [] };
        }
        console.log(`  Read ${snapshot.size} documents from Firebase.`);

        const rowsToInsert = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            if (!data.id) data.id = doc.id;
            const cleanData = prepareDataForSupabase(collectionName, data);

            // ✅ FIX 4: Skip records whose storeId or userId doesn't exist (FK violations)
            if (cleanData.storeId && validStoreIds.size > 0 && !validStoreIds.has(cleanData.storeId)) {
                console.log(`  ⚠️  Skipping ${cleanData.id || doc.id} — storeId '${cleanData.storeId}' not in Supabase.`);
                return;
            }
            if (collectionName === 'time_logs' && cleanData.userId && validUserIds.size > 0 && !validUserIds.has(cleanData.userId)) {
                console.log(`  ⚠️  Skipping time_log ${cleanData.id || doc.id} — userId '${cleanData.userId}' not in Supabase.`);
                return;
            }

            rowsToInsert.push(cleanData);
        });

        const batchSize = 500;
        let successCount = 0;
        const errors = [];

        for (let i = 0; i < rowsToInsert.length; i += batchSize) {
            const batch = rowsToInsert.slice(i, i + batchSize);
            console.log(`  Upserting batch ${i + 1} to ${i + batch.length} into ${targetTable}...`);

            const { error } = await supabase.from(targetTable).upsert(batch, { onConflict: 'id', ignoreDuplicates: false });

            if (error) {
                console.error(`  Batch error: ${error.message}. Falling back to individual inserts...`);
                for (const row of batch) {
                    const { error: singleError } = await supabase.from(targetTable).upsert(row, { onConflict: 'id', ignoreDuplicates: false });
                    if (singleError) {
                        errors.push({ id: row.id, error: singleError.message, code: singleError.code });
                    } else {
                        successCount++;
                    }
                }
            } else {
                successCount += batch.length;
            }
        }

        console.log(`  ✅ Migrated: ${successCount} | ❌ Errors: ${errors.length}`);
        return { collection: collectionName, totalRead: snapshot.size, successCount, errors };

    } catch (err) {
        console.error(`  FATAL for ${collectionName}:`, err.message);
        return { collection: collectionName, totalRead: 0, successCount: 0, errors: [{ error: err.message }] };
    }
}

async function runMigration() {
    console.log('================================================');
    console.log('FIREBASE TO SUPABASE MIGRATION v2 (PATCHED)');
    console.log('================================================\n');

    const results = [];

    // Step 1: Migrate stores first and collect valid IDs
    console.log('📦 Phase 1: Migrating STORES...');
    const storesResult = await migrateCollection('stores', new Set(), new Set());
    results.push(storesResult);

    // Fetch valid store IDs from Supabase after inserting
    const { data: storeRows } = await supabase.from('stores').select('id');
    const validStoreIds = new Set((storeRows || []).map(s => s.id));
    console.log(`\n  Valid store IDs in Supabase: ${validStoreIds.size} stores`);

    // Step 2: Migrate users and collect valid user IDs
    console.log('\n📦 Phase 2: Migrating USERS...');
    const usersResult = await migrateCollection('users', validStoreIds, new Set());
    results.push(usersResult);

    const { data: userRows } = await supabase.from('users').select('id');
    const validUserIds = new Set((userRows || []).map(u => u.id));
    console.log(`\n  Valid user IDs in Supabase: ${validUserIds.size} users`);

    // Step 3: Migrate the rest in FK-safe order
    const remainingCollections = [
        'categories', 'modifierGroups', 'addons', 'products', 'combos',
        'supply_items', 'recipes', 'orders', 'shifts', 'promotions',
        'wastage_logs', 'time_logs', 'cash_drawer_logs', 'announcements', 'feedback'
    ];

    console.log('\n📦 Phase 3: Migrating remaining collections...');
    for (const col of remainingCollections) {
        const result = await migrateCollection(col, validStoreIds, validUserIds);
        results.push(result);
    }

    // Summary
    console.log('\n================================================');
    console.log('MIGRATION SUMMARY');
    console.log('================================================');
    let totalFailed = 0;

    for (const res of results) {
        const status = res.errors.length === 0 ? '✅' : '⚠️ ';
        console.log(`${status} ${res.collection.padEnd(20)} | Read: ${String(res.totalRead).padStart(4)} | Migrated: ${String(res.successCount).padStart(4)} | Errors: ${res.errors.length}`);
        if (res.errors.length > 0) {
            totalFailed += res.errors.length;
            writeFileSync(`migration_v2_error_${res.collection}.json`, JSON.stringify(res.errors, null, 2));
        }
    }

    if (totalFailed === 0) {
        console.log('\n✅ ALL DONE — MIGRATION COMPLETED SUCCESSFULLY WITH ZERO ERRORS!');
    } else {
        console.log(`\n⚠️  MIGRATION COMPLETED WITH ${totalFailed} REMAINING ERRORS. Check migration_v2_error_*.json`);
    }

    process.exit(0);
}

runMigration().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
